# Feature: Redaction precision and run-evidence privacy (Phase 3 of qa-runner-grounding-vocabulary-v2)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the redaction table of `qa-run.mjs`, the run-directory layout and the `init`, `ground` and `run` halts, `plugins/relay/resources/redaction-policy.md`, the `qa-run-contract` and `auth-secrecy` validation checks, the `relay-qa-run.md` doc); secret and personal-data handling in run evidence (session values, accessibility snapshots, screenshots, response and row bodies); cross-cutting artifact (a per-run `.gitignore` that every later phase writes behind)
- Decisions found:
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log "Redaction policy": register the token, the declared session cookie and the `api_origins` cookie always; register other values only above a length and entropy floor; apply the same floor to IndexedDB keys; never register origin parts or short literals; "no scanner documents a length floor, so the floor is calibrated on the recorded values"
  - Same PRD, Decisions Log "Run-evidence privacy": a per-run `.gitignore` proven with `git check-ignore`, halting `FAILED_IGNORE_UNPROVEN` when unproven; "matches the auth kit's prove-before-write rule"; Architecture Notes "Redaction registers by source first" and "Privacy is enforced by an ignore the runner proves"
  - Same PRD, Open Questions 1 and 2 (the numeric floor; whether the ignore also covers the `http.json` and `query-K.json` bodies): both are resolved in this plan (see `## Notes`)
  - Same PRD, Decisions Log "Validation checks": extend `qa-run-contract` and `auth-secrecy`; the count stays 28; "Frozen surfaces": the review-loop files, `capture.mjs` and `/relay-qa-report` stay byte-identical (AC-14)
  - `docs/decisions.md` [2026-09-25] (line 2435) registering the manual-QA runner and its test-auth kit: item 8 "Secrecy on disk" (add the ignore rules and prove them with `git check-ignore` before writing a secret; halt without writing when the check fails), item 5 (the local-only guard is permanent), item 2 (secrets redacted per `redaction-policy.md`)
  - [2026-04-19] "Secret redaction policy for Test Runner reports": layered policy, per-project extensions, whole-URL redaction for connection strings
  - [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`": the policy file is cited with its `${CLAUDE_PLUGIN_ROOT}/resources/` prefix only
  - `docs/decisions.md` [2026-07-09] (line 680): every Validation command and per-task `VALIDATE:` must carry real exit-code semantics
  - `docs/decisions.md` [2026-07-10] (line 692): R-X strict, the Implementer authors zero test files; tests are routed through the test pair's lifecycle ledger
  - `docs/decisions.md` [2026-08-04] (line 1501) and [2026-08-20] (line 2155): a validation pattern must be grounded in text the plan can demonstrate; a `VALIDATE` exercises the effect rather than the declaration; the test-pair deferral paragraph is emitted by default
  - `docs/decisions.md` [2026-10-06] (line 2490): provisioning the visual tooling's `node_modules` is a registered backlog item and is deliberately not folded in
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": accessibility snapshots, screenshots, input values and registered session values are the leak surfaces; every new message and every new stdout line carries counts, fixed probe paths and status words only, never a value
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing assertion is made stale by this design (see `## Notes`); any that a later change makes stale goes to the test pair as `EXISTING_TEST_UPDATED`, never edited by the Implementer
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - Command versus script separation: the planning agent proposes plan entries; the script redacts, proves, writes and reports
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/` and is written only through `writeRunFile`
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, here with the tree object recorded after Phase 2
  - `qa-run-contract` invariants stay true: the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`, one `export const REASON_CATALOGUE`, no static sibling import
  - The local-only guard is a hard failure at every network- or store-touching site: the ignore proof is a local `git` call that runs AFTER the guard in `init`, `ground` and `run` and adds no request site and no second `// GUARD-SITE`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` — Implementation Phases row 3: "Redaction precision and run-evidence privacy" — Goal: evidence stays readable and personal data stays out of git — Success signal: a fixture session with `localhost`, `MIDDLE`, `false` and a JWT leaves URLs intact and masks the JWT; `git check-ignore` exits 0 for the run's grounding and screenshot paths; a repository where the proof fails halts `FAILED_IGNORE_UNPROVEN`.

## Summary

This phase makes the runner's redaction precise and its run evidence private. Session values are registered by source: the token artifact, the role's declared `sessionCookie` and every `api_origins` cookie are registered always, while every other cookie, localStorage and IndexedDB string (record keys included) is registered only when it is at least 12 characters long, has a Shannon entropy of at least 3.0 bits per character and is not a part of the target origin, so `localhost`, `false` and `MIDDLE` stop corrupting the URLs the operator reads. Each run directory gets its own `.gitignore` for `grounding/` and `evidence/`, written through the single write helper and proven with `git check-ignore -q` per evidence kind; `init`, `ground` and `run` halt `FAILED_IGNORE_UNPROVEN` and write nothing when git is present and the proof does not hold, and record the proof as `not-applicable` outside a git work tree. `redaction-policy.md` gains a section for session values, snapshots, screenshots and personal data, the command doc states the new behavior, and the `auth-secrecy` and `qa-run-contract` checks are extended behind opt-in flags (no 29th check) so the floor, the ignore rules and the documented numbers cannot drift.

## User Story

As the operator of relay's human validation gate
I want the runner to keep the evidence I read intact and to keep the personal data of my local test account out of git
So that a verbatim URL is still a URL, and a snapshot, screenshot or response body never reaches a commit by accident

## Problem Statement

`addSecretValues` registers every session value of 4 or more characters, and redaction is by substring, so on the `super-ensino` re-run `localhost`, `false` and `MIDDLE` became `[REDACTED]` inside 23 URLs of `results.json`; `collectIndexedDbSecrets` registers every nested record key and value too. Separately, `runInit` creates only `evidence/` and writes no ignore rule: in `praesto-sum` a grounding snapshot held 54 locator names including the owner's task titles with `withheld=0`, and `PRPs/reports/<feature>/qa-run/` is untracked but not ignored. `redaction-policy.md` says nothing about snapshots, screenshots, e-mail addresses, personal data or short values.

## Solution Statement

Runner side, policy side and tracked declarations only. Add a pure, exported registration policy (`shannonEntropy`, `isRegistrableSessionValue`, `declaredCookieNamesOf`, `splitSessionValues`) and apply it in `obtainSession`, the one site that registers undeclared session values; every declared-source and `redact: true` path stays exactly as strict as today. Add an exported ignore rule set, an injectable `git check-ignore` proof and an `ensureRunIgnore` helper that writes the run directory's `.gitignore` through `writeRunFile`, then wire them into `init` (always writes, always proves), `ground` and `run` (repair and prove, only when the run directory is inside a work tree). Add the policy section and the doc text. Pin the floor constants, the ignore rules, the halt, the proof call and the doc numbers in `auth-secrecy` and `qa-run-contract` behind opt-in flags.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/resources/redaction-policy.md`; `plugins/relay/commands/relay-qa-run.md`; `scripts/validate/checks/auth-secrecy.mjs`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | `Depends` is `-`; shares `lane:qa-run` with phases 1 to 6, so it runs serially after phases 1 and 2 (both `complete`); Phase 7 (release cut) depends on it |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` lines 229 (row 3), 250-253 (Phase Details), 103-105 (AC-3, AC-4, AC-5), 114-115 and 117 (AC-14, AC-15, AC-17), 123-124 (Open Questions 1 and 2), 199-200 (Architecture Notes), 292-293 (Decisions Log) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` | 103-105, 114-115, 117, 123-124, 199-200, 250-253, 292-293 | AC-3, AC-4, AC-5, the frozen-surface and local-guard criteria, the two Open Questions this plan resolves, the Architecture Notes and the Decisions Log rows |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 614-647 | `addSecretValues` (the declared-source registration that stays byte-identical) and `redactText` (a registered value is a raw substring replacement, which is why short values corrupt URLs) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 665-731 | `redactJson` (the structural masks that back-stop an unregistered value) and `writeRunFile` (the single write helper the ignore file goes through) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 865-909 | `classifyApiOrigin` and `deriveApiHeader`: where an `api_origins` entry declares its `cookie` name |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2036-2066 and 2139-2190 | `collectIndexedDbSecrets` (stays unchanged) and `obtainSession` (the one registration site of undeclared session values) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2870-2912 and 3165-3185 | `runInit`, the start of `runRun` and the guard section of `runGround`: the three wiring sites |
| P0 | `plugins/relay/scripts/auth-kit-secrecy.mjs` | 79-114 | the existing `git check-ignore -q` proof (`proveIgnored`, `isWorkTree`, `ensureSecrecy`): the call shape this plan inlines |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 22-43 | the `login.config.json` schema: `roles.<role>.sessionCookie` is the declared session cookie |
| P0 | `plugins/relay/resources/redaction-policy.md` | 70-89 and 163-189 | the credential-store subsection whose heading `auth-secrecy` pins, and the sections the new section sits between |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 113-132, 246-269, 543-561 and 593-611 | P3 (init), the grounding and personal-data paragraphs, Phase B and the constraints being extended |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 34-44, 190-194, 224-254, 329-336 and 439-451 | the import list, the opt-in flag pattern, the script and command blocks and the real-tree entry point being extended |
| P0 | `scripts/validate/checks/auth-secrecy.mjs` | 14-80 and 94-100 | the three-input check, its pinned heading and tokens and its real-tree entry point |
| P1 | `scripts/validate/checks/qa-run-stable-grounding.test.mjs` | 387-439 and 504-519 | read-only: the doc slices (first-occurrence anchors `Grounding rules.` and `Personal data.`, the `ground` command and the `MSYS_NO_PATHCONV=1` note within 1500 characters) and the "exactly 4 findings from `requireGround`" count that a new opt-in flag must not disturb |
| P1 | `scripts/validate/checks/qa-run-classification.test.mjs` | 506-583 | read-only: the doc pins the edit must keep (one entry per case, no `omit the case`, the catalogue table rows of the shape `` | `CODE` | `needs-human` | ``, every `json` block that carries `class` or `reason_code`) |
| P1 | `scripts/validate/checks/qa-run-minted-session.test.mjs` | 336-358 and 416-434 | read-only: the IndexedDB collector assertions (the collector stays unchanged) and the end-to-end values (15 and 19 characters) that the floor must still register |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 577-592 and 867-889 | read-only: the only `init` success test and the cookie-redaction end-to-end test (a 26-character cookie value) |
| P1 | `scripts/validate/checks/auth-secrecy.test.mjs` | 40-117 | read-only: the baseline, mutation and null-input tests that an opt-in flag with a `false` default leaves valid |
| P1 | `scripts/validate/checks/plugin-root-resolvable.mjs` | 81-152 | read-only: a backticked token ending in the policy file's basename must be exactly `${CLAUDE_PLUGIN_ROOT}/resources/` plus that basename |
| P1 | `docs/decisions.md` | 680-688, 692, 2435-2469 | the exit-code-semantics rule, R-X strict and the registered manual-QA runner decision |
| P1 | `PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-2-stable-grounding-and-text-candidates.plan.md` | 631-697 | read-only: the Level 1 to 3 shape and the corpus-gating note this phase mirrors |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:614-629
/**
 * Adds run-time secret values (session cookies, storage values, tokens) to an
 * existing table. Values shorter than 4 characters are ignored.
 * @param {RedactionTable} table
 * @param {string[]} secretValues
 */
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
Copied by Task 1 (this function and its absolute 4-character minimum stay byte-identical; the new helpers sit directly after it, and `obtainSession` still hands it one flat list, so every declared-source caller keeps exactly today's strictness).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2042-2066
export function collectIndexedDbSecrets(state) {
  /** @type {string[]} */ const found = [];
  /** @param {any} v */
  const walk = (v) => {
    if (typeof v === 'string') found.push(v);
    else if (Array.isArray(v)) for (const x of v) walk(x);
    else if (isObj(v)) for (const x of Object.values(v)) walk(x);
  };
  const origins = state && Array.isArray(state.origins) ? state.origins : [];
  for (const o of origins) {
    for (const db of Array.isArray(o && o.indexedDB) ? o.indexedDB : []) {
      const stores = Array.isArray(db && db.stores) ? db.stores : Array.isArray(db && db.objectStores) ? db.objectStores : [];
      for (const store of stores) {
        for (const rec of Array.isArray(store && store.records) ? store.records : []) {
          if (!isObj(rec)) continue;
          for (const field of ['key', 'value', 'keyEncoded', 'valueEncoded']) {
            walk(rec[field]);
            if (field === 'value' && (Array.isArray(rec[field]) || isObj(rec[field]))) found.push(JSON.stringify(rec[field]));
          }
        }
      }
    }
  }
  return found;
}
```
Copied by Task 1 (the collector keeps returning every string of every record key and value, so its existing unit assertions stay valid; the floor is applied to what it returns inside `splitSessionValues`, which is where a record KEY and a record VALUE meet the same gate).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2169-2178
        /** @type {string[]} */ const secrets = [];
        for (const c of Array.isArray(state.cookies) ? state.cookies : []) if (c && isStr(c.value)) secrets.push(c.value);
        for (const o of Array.isArray(state.origins) ? state.origins : []) {
          for (const e of Array.isArray(o && o.localStorage) ? o.localStorage : []) if (e && isStr(e.value)) secrets.push(e.value);
        }
        const tok = readJsonOrNull(join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.token.json`));
        const token = tok && isStr(tok.token) && tok.token !== '' ? tok.token : null;
        if (token !== null) secrets.push(token);
        secrets.push(...collectIndexedDbSecrets(state));
        addSecretValues(ctx.table, secrets);
```
Copied by Task 1 (the push sites collapse into one `splitSessionValues` call; the variable name `secrets`, the `tok` and `token` lines and the closing line `addSecretValues(ctx.table, secrets);` stay byte-identical so no source-text anchor of an existing test moves).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:707-731
// WRITE-SITE
/**
 * The only place the runner writes a file: tmp-then-rename, refusing any
 * destination outside the run directory. Text is redacted here; structured
 * values are redacted structurally before serialization; binary is written
 * as given (callers withhold any image whose page text holds a secret).
 * @param {WriteCtx} ctx
 * @param {string} destAbs
 * @param {{ kind: 'json', value: any } | { kind: 'text', value: string } | { kind: 'binary', value: Buffer }} payload
 */
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
Copied by Task 2 (the run directory's `.gitignore` is written by calling this helper with a `text` payload and a destination directly under the run directory, which passes its containment check; no second write site, no second `// WRITE-SITE` and no second `writeFileSync(` or `renameSync(`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2874-2886
async function runInit(args) {
  const feature = /** @type {string} */ (args.feature);
  const target = await guardTarget(resolveTarget(args.root, args.envHandle), args.root);
  const report = join(args.root, 'PRPs', 'reports', feature, 'qa-report.md');
  if (!existsSync(report)) throw new Halt('FAILED_QA_REPORT_MISSING', `PRPs/reports/${feature}/qa-report.md does not exist`);
  const runId = now().replace(/[-:]/g, '').replace('.', '');
  const runDirRel = `PRPs/reports/${feature}/qa-run/${runId}`;
  const runDirAbs = join(args.root, ...runDirRel.split('/'));
  if (existsSync(runDirAbs)) throw new Halt('FAILED_RUN_DIR_EXISTS', `${runDirRel} already exists`);
  mkdirSync(join(runDirAbs, 'evidence'), { recursive: true });
  process.stdout.write(`RUN_ID: ${runId}\nRUN_DIR: ${runDirRel}\nBASE_URL_ORIGIN: ${target ? target.origin : 'none'}\n`);
  return 0;
}
```
Copied by Task 2 (the `mkdirSync` line and the three-line stdout write stay byte-identical; the proof call sits between them and one more stdout line follows the write, so a refused target still creates nothing and the existing stdout lines are untouched).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3180-3185
  const target = await guardTarget(resolveTarget(root, envHandle), root);
  if (target === null) throw new Halt('TARGET_UNDECLARED', 'no target is declared: set baseUrl in PRPs/auth/login.config.json or pass --env-handle <path>');
  const url = resolveStepUrl(route, target);
  if (url === null) throw new Halt('FAILED_NON_LOCAL_TARGET', 'the route leaves the guard-approved origin; nothing was requested');
  const playwright = loadPlaywright(root, PLUGIN_ROOT);
  if (playwright === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', 'playwright could not be resolved from the target or the plugin');
```
Copied by Task 2 (the proof call is inserted between the route check and `loadPlaywright`, so it runs after the local-only guard and before any session, browser or snapshot; a refused target leaves the run directory exactly as it was).

```
# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:79-100
export function proveIgnored(root, paths) {
  /** @type {{ path: string, status: 'ignored' | 'not-ignored' | 'git-error' }[]} */
  const results = [];
  for (const path of paths) {
    const r = spawnSync('git', ['-C', root, 'check-ignore', '-q', '--', path], { encoding: 'utf8' });
    /** @type {'ignored' | 'not-ignored' | 'git-error'} */
    let status = 'git-error';
    if (!r.error && r.status === 0) status = 'ignored';
    else if (!r.error && r.status === 1) status = 'not-ignored';
    results.push({ path, status });
  }
  return { ok: results.every((x) => x.status === 'ignored'), results };
}

/**
 * @param {string} root
 * @returns {boolean}
 */
function isWorkTree(root) {
  const r = spawnSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
  return !r.error && r.status === 0 && String(r.stdout).trim() === 'true';
}
```
Copied by Task 2 (the `-C <dir> check-ignore -q -- <path>` call shape, one call per path because `-q` is valid only with a single pathname, and the `rev-parse --is-inside-work-tree` test; inlined into `qa-run.mjs` with `spawnSync` already imported there, because the copy-helper tests copy only `qa-run.mjs` and `auth-local-guard.mjs`, so a sibling import, static or lazy, would be absent in a copy).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:224-230
    if (requireCatalogue) {
      // The catalogue and the class set are defined once, in the runner, and nowhere else.
      for (const definition of ['export const REASON_CATALOGUE', 'export const CASE_CLASSES']) {
        const n = occurrences(scriptText, definition);
        if (n !== 1) add(`the runner script must define the catalogue with ${definition} exactly once, found ${n}`, SCRIPT_FILE);
      }
    }
```
Copied by Task 6 (the new script-text rules sit in a sibling `if (requirePrivacy)` block with the same `add(...)` message style, so a caller that does not opt in sees nothing).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:329-336
    if (requireGround) {
      // The halt, the Git Bash note and the wait's numbers follow the exported constants.
      const interval = `${GROUND_POLL_INTERVAL_MS / 1000} second apart`;
      const bound = `${GROUND_STABLE_BOUND_MS / 1000} seconds`;
      for (const token of ['GROUND_UNSTABLE', 'MSYS_NO_PATHCONV=1', interval, bound]) {
        if (!commandText.includes(token)) add(`the runner command must document the ground wait: it must contain ${token}`, COMMAND_FILE);
      }
    }
```
Copied by Task 6 (the doc tokens and the two numbers follow the exported floor constants exactly as the ground wait's numbers follow theirs; `requireGround` itself is not edited, because a test pins exactly four findings from it on a bare doc).

```
# SOURCE: scripts/validate/checks/auth-secrecy.mjs:63-77
  if (scriptText == null) {
    add(`missing or unreadable file: ${SCRIPT_FILE}`, SCRIPT_FILE);
  } else {
    for (const token of ['FAILED_IGNORE_UNPROVEN', 'check-ignore']) {
      if (!scriptText.includes(token)) add(`secrecy script does not contain: ${token}`, SCRIPT_FILE);
    }
  }

  if (policyText == null) {
    add(`missing or unreadable file: ${POLICY_FILE}`, POLICY_FILE);
  } else {
    for (const token of [POLICY_HEADING, 'Set-Cookie', 'PRPs/auth/.sessions/']) {
      if (!policyText.includes(token)) add(`redaction policy does not contain: ${token}`, POLICY_FILE);
    }
  }
```
Copied by Task 5 (the new rules follow the same null-input, token-loop and message shape, behind a `requireRunEvidence` flag whose `false` default leaves the three-input baseline test valid).

```
# SOURCE: plugins/relay/resources/redaction-policy.md:70-74
### Credential stores, session files and storage-state paths

The test-auth kit holds credentials and logged-in sessions that can impersonate
a test account. A transcript, a prompt and a log are all leak surfaces, so these
artifacts follow a stricter rule than the value regexes above.
```
Copied by Task 3 (this subsection and its heading stay verbatim; the new section is a sibling placed before the closing "What this policy is NOT" section and uses the same heading depth and prose register).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:556-561
For a role whose mechanism is `minted`, the runner reads the expiry the login script recorded in the
value-free `PRPs/auth/.sessions/<role>.mint.json` (else the token artifact's `expires_at`). When that
expiry is within 240 seconds of the run start, the runner passes the login script `--force`, so the
script mints and proves a new session before the first case uses it. The runner never runs the mint
command itself: the kit script does, behind its own `confirmed` gate and local-only guard. Cookie,
localStorage, token and IndexedDB session values are all registered for redaction.
```
Copied by Task 4 (the last sentence is the one that stops being true under the floor and is rewritten; the rest of the paragraph, including the `240`, `--force` and `IndexedDB` tokens a minted-session test pins, stays).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the registration policy and its helpers, the `obtainSession` wiring, the ignore rules, the `git check-ignore` proof, the `.gitignore` write through `writeRunFile`, the `init`, `ground` and `run` wiring, the `FAILED_IGNORE_UNPROVEN` halt, the header comment |
| `plugins/relay/resources/redaction-policy.md` | UPDATE | a section for source-first registration and for snapshots, screenshots and personal data; the heading `auth-secrecy` pins is untouched |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the init paragraph (the ignore file, the proof, `IGNORE_PROOF`, the halt), the personal-data paragraph, the registration sentence of Phase B, a constraint bullet and the final-output sentence |
| `scripts/validate/checks/auth-secrecy.mjs` | UPDATE | an opt-in `requireRunEvidence` rule set pinning the policy section, the ignore rules and the floor numbers; no new check is registered (the count stays 28) |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | an opt-in `requirePrivacy` rule set pinning the proof wiring in `init`, `ground` and `run`, the halt, the `IGNORE_PROOF` line and the doc tokens and numbers |

## NOT Building (Scope Limits)

- Any change to how DECLARED sources are registered: `addSecretValues` and its 4-character minimum, `buildRedactionTable`'s own `length < 4` gate and env-name rules, `prepareApiStep`'s derived header, `runQueryStep`'s `redact_columns`, `prepareState`'s `redact: true` captures and the `CAPTURE_UNREDACTABLE` 4-character floor of `runSeed`. They stay exactly as strict as today.
- Any change to `redactJson`'s structural masks, to `collectIndexedDbSecrets` (the floor is applied where its result is registered, not inside it), to `partitionSnapshotEntries`, to the withholding of e-mail addresses or `regex:` matches, or to the `GROUNDED:` stdout line.
- Withholding or redacting free-text personal data (task titles, names) by pattern: the PRD's Decisions Log records that such text cannot be listed as `regex:` lines, so this phase protects it with the proven ignore rule, not with a recognizer.
- A new reason code, a new outcome, a change to `OUTCOMES`, `REASON_CATALOGUE`, `summarizeEntries` or the `run` stdout summary lines. `FAILED_IGNORE_UNPROVEN` is a runner halt of `init`, `ground` and `run` (like `FAILED_NON_LOCAL_TARGET`), never an outcome and never a catalogue member; no field is added to `results.json`.
- Importing `auth-kit-secrecy.mjs` (statically or lazily) or touching its `scaffold`, `prove` and `ensure` modes or the packaged `auth-kit.gitignore`: the runner inlines its own `git check-ignore` call.
- A new CLI flag, an environment variable or a per-call override of the floor or of the ignore rules: they are exported constants, so a planner cannot widen them and the usage text stays the PRD's flags.
- Scrubbing run directories that were already written or committed by an earlier version, and any change to the target project's own root `.gitignore`.
- The session-less request, `expect_value`, `expect_not_visible`, `expect_state` (Phase 4), the grounding prefix (Phase 5), `expect_requests`, the bounded re-mint and the `--refresh` statement (Phase 6), the release cut and every `documentation/` page (Phase 7), and the dogfood and its scans (Phase 8).
- Any edit under `documentation/`, any edit of `docs/decisions.md` or `docs/anti-patterns.md` (mirror checks), and any hand edit of `docs/api-reference.md` (the `docs_sync` pass owns `docs/`).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-14), and any change to a report.
- Any test file. R-X strict: the Implementer authors zero test files; new tests are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — source-first registration of session values (floor, origin parts, declared sources)

- **ACTION**: Delivers AC-A1 (low-entropy and short undeclared session values are not registered, so a verbatim `http://localhost:3000/...` URL stays byte-intact and a long high-entropy value is still masked; the token artifact, the declared session cookie and the `api_origins` cookie are registered regardless of length or entropy) and AC-A2 (IndexedDB record keys follow the same floor as values). In `plugins/relay/scripts/qa-run.mjs`:
  1. Directly after `addSecretValues` (ends at line 629, before the doc comment of `redactText`) add, each with a doc comment:
     - `export const SESSION_VALUE_MIN_LENGTH = 12;` and `export const SESSION_VALUE_MIN_ENTROPY = 3.0;` (write the entropy literal exactly as `3.0`). The comment (at most eight lines) states: the floor applies only to session values no declaration names; no scanner documents a minimum length (detect-secrets documents entropy limits of 4.5 for base64 and 3.0 for hex, gitleaks an example of 3.5 with a secret length of 10 to 150 in its generic rule); the six non-secrets of the recorded `super-ensino` scan are all under 12 characters and at most 2.73 bits per character; the numbers are a judgment, not a measurement; and a short secret held by an undeclared cookie is NOT registered by value (the structural masks, the Layer 1 regexes, the proven ignore rule and the dogfood scan back-stop it).
     - `export function shannonEntropy(text)`: bits per character, the Shannon entropy of the character histogram of `text` (iterate with `for (const ch of text)`); `0` for an empty string and for anything that is not a string.
     - `export function isRegistrableSessionValue(value, originTexts = [])`: pure. True only when `value` is a string, `value.length >= SESSION_VALUE_MIN_LENGTH`, the value is not a part of any origin text, and `shannonEntropy(value) >= SESSION_VALUE_MIN_ENTROPY`. "A part of an origin text" means, for each non-empty string `o` in `originTexts`: `o.includes(value)` refuses the value, and when `o` contains `://` also `value.startsWith(o)` refuses it (a URL on the target); a host-only text refuses only a value that is contained in it, so a secret that merely begins with the host name is still registrable. The comment says that short literals (`true`, `false`, `null`, small integers) are never registered because the length gate refuses them before the entropy is computed.
     - `export function declaredCookieNamesOf(loginConfig, role)`: the cookie names the configuration declares as session carriers: `roles[role].sessionCookie` when it is a non-empty string, plus `cookie` of every `api_origins` entry that is an object with a non-empty string `cookie`; an empty array for any other shape of `loginConfig`, `roles` or `api_origins`.
     - `export function splitSessionValues(state, token, declaredCookieNames, originTexts = [])`: pure. Returns `{ declared, undeclared }`. `declared` holds `token` when it is a non-empty string, and the `value` of every cookie of `state.cookies` whose `name` is in `declaredCookieNames`. `undeclared` holds every other cookie value, every localStorage `value` of every origin of `state.origins` and every string `collectIndexedDbSecrets(state)` returns (record keys and record values alike), filtered through `isRegistrableSessionValue(v, originTexts)`. It never throws on a malformed `state`.
  2. Add the module-private function `originTextsOf(ctx)` (next to `obtainSession`): the non-empty strings among `ctx.target.origin`, every entry of `ctx.target.allowedHosts`, `ctx.loginConfig.baseUrl` and the `url` of every `ctx.loginConfig.api_origins` entry, so a declared local origin or host can never be registered as a value.
  3. In `obtainSession` replace the registration block (lines 2169-2178) so that the cookie, localStorage, token and IndexedDB pushes become: keep the `tok` and `token` lines (2174-2175) unchanged; then `const split = splitSessionValues(state, token, declaredCookieNamesOf(ctx.loginConfig, role), originTextsOf(ctx));` and `const secrets = [...split.declared, ...split.undeclared];` immediately followed by the unchanged line `addSecretValues(ctx.table, secrets);`. Everything after it (`header`, `valuePrefix`, `result`) stays byte-identical.
  4. Header comment: extend the redaction paragraph (currently lines 48-49) with one sentence saying that session values are registered source-first (the token artifact, the declared session cookie and the `api_origins` cookies always; every other cookie, localStorage and IndexedDB string only above the floor and never a part of the target origin).
  Do NOT touch `addSecretValues`, `buildRedactionTable`, `collectIndexedDbSecrets`, `redactText`, `redactJson`, `prepareApiStep`, `runQueryStep`, `prepareState` or `runSeed`. Do NOT add the text `writeFileSync(`, `renameSync(`, `// GUARD-SITE` or `// WRITE-SITE` anywhere (comments included), any `import` statement, or a quoted `outcome:` literal, and keep clear of the single-occurrence mutation anchors listed in Task 2's last paragraph (several tests replace those exact strings in the runner text and assert each occurs exactly once).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:614-629` (the helpers sit after it and it stays byte-identical), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2042-2066` (the collector the split consumes) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2169-2178` (the exact block being replaced).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { createServer } from "node:http";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawnSync } from "node:child_process";
  import { shannonEntropy, isRegistrableSessionValue, declaredCookieNamesOf, splitSessionValues, collectIndexedDbSecrets, buildRedactionTable, addSecretValues, redactText, SESSION_VALUE_MIN_LENGTH, SESSION_VALUE_MIN_ENTROPY } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };

  // Deterministic stand-ins for random secrets (Park-Miller: the products stay exact in a double).
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let seed = 20261010;
  const rand = (n) => { let s = ""; for (let i = 0; i < n; i++) { seed = (seed * 48271) % 2147483647; s += ALPHA[seed % ALPHA.length]; } return s; };
  const jwt = "eyJ" + rand(25) + "." + rand(100) + "." + rand(70);
  const key40 = rand(40);
  const val40 = rand(40);
  const idbKey = rand(40);
  const conf30 = rand(30);

  // 1. The constants, the entropy and the gates.
  if (SESSION_VALUE_MIN_LENGTH !== 12 || SESSION_VALUE_MIN_ENTROPY !== 3) fail("the floor is not 12 characters and 3.0 bits per character: " + SESSION_VALUE_MIN_LENGTH + " " + SESSION_VALUE_MIN_ENTROPY);
  if (jwt.length !== 200) fail("the JWT stand-in must be 200 characters, got " + jwt.length);
  if (shannonEntropy("") !== 0 || shannonEntropy("aaaaaaaa") !== 0) fail("a constant string must have entropy 0");
  if (Math.abs(shannonEntropy("abcd") - 2) > 1e-9 || Math.abs(shannonEntropy("aabb") - 1) > 1e-9) fail("entropy of abcd must be 2 bits and of aabb 1 bit");
  for (const v of ["localhost", "MIDDLE", "false", "0", "10", "5", "true", "null", "undefined", "1234567"]) {
    if (isRegistrableSessionValue(v)) fail("a short harmless value was registrable: " + v);
  }
  if (isRegistrableSessionValue("aB3dE5gH7jK")) fail("11 distinct characters must be under the length gate");
  if (!isRegistrableSessionValue("aB3dE5gH7jKm")) fail("12 distinct characters must clear both gates");
  if (isRegistrableSessionValue("abcdefghabcd")) fail("12 characters at 2.92 bits must be under the entropy gate");
  if (!isRegistrableSessionValue("abcdefghiabc")) fail("12 characters at 3.08 bits must clear the entropy gate");
  if (isRegistrableSessionValue("0".repeat(40)) || isRegistrableSessionValue("1760000000000")) fail("a long low-entropy value must not be registrable");
  for (const v of [jwt, key40, val40, idbKey, conf30]) if (!isRegistrableSessionValue(v)) fail("a long high-entropy value was refused, length " + v.length);

  // 2. Parts of the target origin are never registered; a secret that merely starts with the host is.
  const origin = "http://localhost:3000";
  if (!isRegistrableSessionValue(origin)) fail("the origin alone clears the floor, so only the origin rule can refuse it");
  if (isRegistrableSessionValue(origin, [origin, "localhost", "127.0.0.1"])) fail("the origin itself was registrable");
  if (isRegistrableSessionValue(origin + "/perfil/aluno", [origin])) fail("a URL on the target origin was registrable");
  if (!isRegistrableSessionValue("localhost-session-" + key40.slice(0, 8), ["localhost"])) fail("a secret that begins with the host name was refused");

  // 3. The declared names.
  const cfg = { baseUrl: origin, roles: { student: { sessionCookie: "sessionid" }, teacher: { sessionCookie: null } }, api_origins: { api: { url: "http://localhost:4000", header: "X-Auth", cookie: "access-token" }, files: { url: "http://localhost:4100" } } };
  const names = (r) => declaredCookieNamesOf(cfg, r).slice().sort().join(",");
  if (names("student") !== "access-token,sessionid") fail("student declared names: " + names("student"));
  if (names("teacher") !== "access-token") fail("teacher declared names: " + names("teacher"));
  if (declaredCookieNamesOf(null, "student").length !== 0 || declaredCookieNamesOf({ roles: "x", api_origins: [] }, "student").length !== 0) fail("a malformed configuration must declare nothing");

  // 4. The split: declared sources always, everything else through the floor, keys and values alike.
  const state = {
    cookies: [
      { name: "sid", value: key40 }, { name: "tenant", value: "localhost" }, { name: "level", value: "MIDDLE" }, { name: "has_term_accepted", value: "false" },
      { name: "sessionid", value: "abcd" }, { name: "access-token", value: jwt },
    ],
    origins: [{ origin, localStorage: [{ name: "grade", value: "10" }, { name: "cfg", value: conf30 }], indexedDB: [{ name: "app", stores: [{ name: "kv", records: [{ key: "token", value: val40 }, { key: idbKey, value: "x" }] }] }] }],
  };
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const split = splitSessionValues(state, "tok1", declaredCookieNamesOf(cfg, "student"), [origin]);
  if (!same(split.declared, ["abcd", jwt, "tok1"])) fail("declared values: " + JSON.stringify(split.declared.map((v) => v.length)));
  if (!same(split.undeclared, [key40, conf30, val40, idbKey])) fail("undeclared values: " + JSON.stringify(split.undeclared.map((v) => v.length)));
  const collected = collectIndexedDbSecrets(state);
  for (const v of ["token", val40, idbKey, "x"]) if (!collected.includes(v)) fail("the collector must still return every IndexedDB string, missing " + v.length + " characters");
  if (splitSessionValues(null, null, [], []).declared.length !== 0 || splitSessionValues({ cookies: "x", origins: 5 }, 7, [], []).undeclared.length !== 0) fail("a malformed state must register nothing");

  // 5. The effect on the redaction table.
  const root = mkdtempSync(join(tmpdir(), "relay-qa-floor-"));
  try {
    const table = buildRedactionTable({ root, env: {}, secretValues: [] });
    addSecretValues(table, split.declared);
    addSecretValues(table, split.undeclared);
    const prose = "Open http://localhost:3000/perfil as level MIDDLE where has_term_accepted=false and tenant=localhost.";
    if (redactText(prose, table) !== prose) fail("harmless values corrupted the prose: " + redactText(prose, table));
    if (redactText("k=" + key40 + ";", table) !== "k=[REDACTED];") fail("an undeclared high-entropy cookie was not redacted");
    if (redactText("v=" + val40 + ";", table) !== "v=[REDACTED];") fail("a high-entropy IndexedDB value was not redacted");
    if (redactText("i=" + idbKey + ";", table) !== "i=[REDACTED];") fail("a high-entropy IndexedDB key was not redacted");
    if (redactText("x abcd y tok1", table) !== "x [REDACTED] y [REDACTED]") fail("declared values must be redacted regardless of the floor");
    if (redactText("a token record", table) !== "a token record") fail("the short IndexedDB key was registered");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  // 6. The real runner: a session with the three harmless cookies, a 200-character JWT and a declared 8-character cookie.
  const runner = resolve("plugins/relay/scripts/qa-run.mjs");
  const server = createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ seen: String(req.headers.cookie ?? "") }));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const home = mkdtempSync(join(tmpdir(), "relay-qa-floor-run-"));
  let failure = null;
  try {
    const feature = "feat";
    mkdirSync(join(home, "PRPs", "reports", feature), { recursive: true });
    mkdirSync(join(home, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(home, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:" + server.address().port, roles: { student: { mechanism: "form", sessionCookie: "sessionid" } } }));
    const cookie = (name, value) => ({ name, value, domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" });
    const e2eState = { cookies: [cookie("sid", key40), cookie("access-token", jwt), cookie("sessionid", "abcd1234"), cookie("theme", "dark-mode-9"), cookie("tenant", "localhost"), cookie("level", "MIDDLE"), cookie("has_term_accepted", "false")], origins: [] };
    const stub = `import { mkdirSync, writeFileSync } from "node:fs";
  import { join } from "node:path";
  const root = process.argv[process.argv.indexOf("--root") + 1];
  const dir = join(root, "PRPs", "auth", ".sessions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "student.json"), ${JSON.stringify(JSON.stringify(e2eState))});
  `;
    writeFileSync(join(home, "PRPs", "auth", "login-student.mjs"), stub);
    // The runner registers the value of every environment variable whose NAME looks secret, so the child gets an environment without them.
    const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|SIGNING|AUTH|DATABASE_URL|DB_URL|REDIS_URL|MONGODB_URI|KAFKA_BROKERS|AMQP_URL)/i.test(k)));
    const sh = (args) => spawnSync(process.execPath, [runner, ...args], { encoding: "utf8", cwd: home, env: cleanEnv });
    const block = (t, i, steps) => ["### Case " + (i + 1), "**Title:** " + t, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", steps, ""].join("\n");
    const titles = ["Echo the session cookies", "Check the profile level"];
    writeFileSync(join(home, "PRPs", "reports", feature, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + block(titles[0], 0, "1. Request the echo endpoint.") + "\n" + block(titles[1], 1, "1. Open http://localhost:3000/perfil and check level MIDDLE with has_term_accepted=false.") + "\n## Notes\n\nnone\n");
    const init = sh(["init", "--root", home, "--feature", feature]);
    if (init.status !== 0) throw new Error("init exited " + init.status + ": " + init.stderr);
    const runRel = /^RUN_DIR: (.+)$/m.exec(init.stdout)[1].trim();
    writeFileSync(join(home, ...runRel.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: [
      { index: 1, title: titles[0], class: "automatable", driver: "http", role: "student", state: "none", steps: [{ action: "request", method: "GET", path: "/echo", expect_status: 200 }] },
      { index: 2, title: titles[1], class: "human-by-nature", reason_code: "VISUAL_JUDGEMENT" },
    ] }));
    const ran = sh(["run", "--root", home, "--feature", feature, "--run-dir", runRel]);
    if (ran.status !== 0) throw new Error("run exited " + ran.status + ": " + ran.stderr + ran.stdout);
    const text = readFileSync(join(home, ...runRel.split("/"), "results.json"), "utf8");
    const res = JSON.parse(text);
    const c1 = res.cases[0];
    if (c1.outcome !== "pass") throw new Error("the echo case is " + c1.outcome + " " + c1.reason_code + " " + c1.reason);
    const seen = JSON.parse(readFileSync(join(home, ...c1.evidence[0].split("/")), "utf8")).response.body.seen;
    for (const keep of ["tenant=localhost", "level=MIDDLE", "has_term_accepted=false", "theme=dark-mode-9"]) {
      if (!seen.includes(keep)) throw new Error("a harmless cookie was corrupted in the evidence: " + keep + " in " + seen);
    }
    for (const masked of ["sid=[REDACTED]", "access-token=[REDACTED]", "sessionid=[REDACTED]"]) {
      if (!seen.includes(masked)) throw new Error("expected " + masked + " in the evidence: " + seen);
    }
    for (const secret of [key40, jwt, "abcd1234"]) if (seen.includes(secret) || text.includes(secret)) throw new Error("a secret value reached the evidence or results.json");
    const verbatim = res.cases[1].manual_steps_verbatim;
    if (typeof verbatim !== "string" || !verbatim.includes("http://localhost:3000/perfil") || !verbatim.includes("level MIDDLE") || !verbatim.includes("has_term_accepted=false")) {
      throw new Error("the verbatim manual steps were corrupted: " + verbatim);
    }
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(home, { recursive: true, force: true });
  }
  if (failure !== null) fail(failure);
  '
  ```
  Before this task none of the new exports exists, so the import fails and the command exits non-zero; with the 4-character gate alone the real-runner part would turn `http://localhost:3000/perfil` into `http://[REDACTED]:3000/perfil`. The command exercises the effect (a real login stub, a real session, a real `run`, the evidence and results files), not the presence of a constant. The `seen` key is deliberately not named `cookie`, because `redactJson` masks any property of that name wholesale.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the run directory's `.gitignore`, its `git check-ignore` proof and the `init`, `ground` and `run` wiring

- **ACTION**: Delivers AC-A3 (`init` writes a `.gitignore` through `writeRunFile` that covers `grounding/` and `evidence/`, and `git check-ignore -q` exits 0 for a path of each kind), AC-A4 (when git is present and the proof does not hold, `init`, `ground` and `run` halt `FAILED_IGNORE_UNPROVEN` and write no snapshot and no screenshot; outside a git work tree the proof is recorded `not-applicable` and nothing halts) and AC-A7 (no second write site, no sibling import, the proof runs after the local-only guard). In `plugins/relay/scripts/qa-run.mjs`:
  1. Directly after `writeRunFile` (ends at line 731, before `readJsonOrNull`) add a section with a comment banner in the style of the surrounding ones, containing, each with a doc comment:
     - `export const RUN_IGNORE_RULES = Object.freeze(['grounding/', 'evidence/']);` (this exact line). The comment states: relative to the run directory; `grounding/` holds accessibility snapshots, `evidence/` holds screenshots, redacted text and the response and row bodies, all of which can hold personal data; `results.json` and `plan.json` are deliberately not listed, so they stay tracked; the set covers the whole `evidence/` directory, not only the screenshots and redacted-text files, because the `query-K.json` rows and `http.json` bodies come from the operator's own local data (the PRD's Open Question 2).
     - `export const RUN_IGNORE_PROBES = Object.freeze(['grounding/probe.snapshot.json', 'evidence/probe.png', 'evidence/probe.txt', 'evidence/probe.json']);` one path per kind of file the runner writes under those directories; the paths need not exist, `git check-ignore` evaluates the pathname.
     - the module-private text constant of the file content: a two-line `#` comment that names the file as written by `qa-run.mjs` and says that run evidence can hold personal data and is never committed, followed by one line per entry of `RUN_IGNORE_RULES` (so the content cannot drift from the rules), LF line endings, ending with a newline.
     - `export function proveRunIgnored(runDirAbs, run = spawnSync)`: `run` is the process-spawning function (injectable so a test drives it without git). It copies `process.env` without `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_PREFIX` and `GIT_COMMON_DIR` (so a git hook or a dotfiles setup cannot redirect the proof), and runs every git call as `run('git', ['-C', runDirAbs, ...], { encoding: 'utf8', env, timeout: 15000, windowsHide: true })`. First `rev-parse --is-inside-work-tree`: when the call errors (git absent), exits non-zero or does not print `true`, return `{ status: 'not-applicable', unproven: [] }` and make no further call. Otherwise one `check-ignore -q -- <probe>` call per entry of `RUN_IGNORE_PROBES` (relative paths, never absolute: `-q` is valid only with a single pathname, and a relative path avoids any 8.3 short-name mismatch on Windows); a probe whose call errors or exits with anything other than 0 (1 is not ignored, 128 is a git error) is unproven. Return `{ status: 'proven' | 'unproven', unproven: string[] }`.
     - `export function ensureRunIgnore(runDirAbs, opts = {})`: `opts.run` defaults to `spawnSync`, `opts.alwaysWrite` defaults to `false`. Decide `inside` once with the same `rev-parse` call; when (`opts.alwaysWrite === true` or `inside`) and no `.gitignore` exists in `runDirAbs`, write it by calling `writeRunFile({ runDirAbs, table: { entries: [], regexes: [] } }, join(runDirAbs, '.gitignore'), { kind: 'text', value: <the file content> })`; an existing file is NEVER overwritten (an operator's edit is respected and the proof judges it). When not `inside` return `{ status: 'not-applicable', unproven: [] }`; otherwise run the probes as `proveRunIgnored` does and return its result. The git detection is keyed on the RUN DIRECTORY (`-C <runDirAbs>`), never on the process working directory.
     - `function requireRunIgnore(runDirAbs, opts = {})`: calls `ensureRunIgnore`; any exception it throws (a failed write) counts as `{ status: 'unproven', unproven: ['.gitignore'] }`; on `unproven` throws `new Halt('FAILED_IGNORE_UNPROVEN', ...)` whose detail is built only from the count and the fixed probe paths (for example `2 run-evidence path(s) are not proven ignored by git: evidence/probe.png, evidence/probe.txt; no snapshot, screenshot or result was written`); otherwise returns the status string.
  2. `runInit`: keep the `mkdirSync(join(runDirAbs, 'evidence'), { recursive: true });` line byte-identical; immediately after it add `const proof = requireRunIgnore(runDirAbs, { alwaysWrite: true });`; keep the three-line `RUN_ID`/`RUN_DIR`/`BASE_URL_ORIGIN` stdout write byte-identical; immediately after it add one more write `process.stdout.write(`IGNORE_PROOF: ${proof}\n`);` (the status is `proven` or `not-applicable`). `init` always writes the file, because it is the run directory's creator.
  3. `runGround`: insert `requireRunIgnore(runDirAbs);` between the route check (`if (url === null) throw new Halt('FAILED_NON_LOCAL_TARGET', ...)`) and `const playwright = loadPlaywright(root, PLUGIN_ROOT);`, so it runs after the guard and before any Playwright load, session, browser or snapshot. `ground` writes the file only when the run directory is inside a work tree and has none.
  4. `runRun`: insert `requireRunIgnore(runDirAbs);` immediately after the line `if (cases.length === 0) throw new Halt('FAILED_REPORT_UNPARSEABLE', ...)` and before the plan is read, so a halt happens before any case, any evidence and any `results.json`. A pre-run halt is already the shape of `FAILED_QA_REPORT_MISSING` and `FAILED_REPORT_UNPARSEABLE`.
  5. Header comment: in the `Modes:` entry of `init` add that it writes the run directory's own `.gitignore` for `grounding/` and `evidence/`, proves it with `git check-ignore` and prints `IGNORE_PROOF`, and that an unproven ignore is the halt `FAILED_IGNORE_UNPROVEN`; in the `ground` and `run` entries add that they prove the same rules before writing.
  Do NOT add `writeFileSync(`, `renameSync(`, `// GUARD-SITE` or `// WRITE-SITE` anywhere (comments included), the phrase `export const REASON_CATALOGUE`, any `import` statement, a quoted `outcome:` literal, or `--local-host`. Do NOT add a new catalogue code, a CLI flag, an environment variable or a field of `results.json`. Tests mutate the runner text through anchors that must stay unique, so the new code must not contain any of these substrings (each already occurs exactly once): `if (isObj(record)) {`, `if (!a.includes('://')) continue;`, `const abs = join(ctx.runDirAbs, 'evidence', name);`, `if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {`, `import('./qa-query.mjs')`, `writeFileSync(tmp, data);`, `const ANONYMOUS_CHECK_MS = 20000;`, `.filter((p) => p.fieldCount >= 1)`, `maxRedirects: 0`, and a comment inside `runGround` must not mention `waitForLoadState(`. The new proof call in `runGround` must come before the first occurrence of `loadPlaywright(` inside that function, and the new call in `runRun` before the first occurrence of `buildRedactionTable(` inside that function.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:707-731` (the helper the file is written through), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2874-2886` (`runInit`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:3180-3185` (`runGround`) and `# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:79-100` (the `git check-ignore -q` call shape and the work-tree test).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve, dirname, isAbsolute } from "node:path";
  import { spawnSync } from "node:child_process";
  import { proveRunIgnored, ensureRunIgnore, RUN_IGNORE_RULES, RUN_IGNORE_PROBES } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  // A git discovery that climbs out of the temp directory would turn a not-a-work-tree case into a work tree.
  process.env.GIT_CEILING_DIRECTORIES = dirname(tmpdir());
  process.env.GIT_CONFIG_NOSYSTEM = "1";

  // 1. The rules and the probes.
  if (RUN_IGNORE_RULES.join(",") !== "grounding/,evidence/") fail("the ignore rules are " + RUN_IGNORE_RULES.join(","));
  if (RUN_IGNORE_PROBES.length !== 4 || !RUN_IGNORE_PROBES.every((p) => RUN_IGNORE_RULES.some((r) => p.startsWith(r)))) fail("every probe must sit under an ignored directory");
  for (const kind of [".png", ".txt", ".snapshot.json"]) if (!RUN_IGNORE_PROBES.some((p) => p.endsWith(kind))) fail("no probe of the kind " + kind);

  // 2. The proof with a fake process runner: call shape, one call per probe, exit-code meaning.
  const calls = [];
  const fake = (inside, ignored) => (cmd, args) => {
    calls.push({ cmd, args });
    if (args[2] === "rev-parse") return inside === "error" ? { error: new Error("ENOENT"), status: null } : { status: inside, stdout: inside === 0 ? "true\n" : "" };
    const probe = args[args.length - 1];
    return { status: Object.hasOwn(ignored, probe) ? ignored[probe] : 0, stdout: "" };
  };
  const D = join(tmpdir(), "relay-qa-fake-run");
  let p = proveRunIgnored(D, fake(0, {}));
  if (p.status !== "proven" || p.unproven.length !== 0) fail("an all-ignored run directory must be proven: " + JSON.stringify(p));
  if (calls.length !== 1 + RUN_IGNORE_PROBES.length) fail("one rev-parse and one check-ignore per probe, got " + calls.length);
  for (const c of calls) if (c.cmd !== "git" || c.args[0] !== "-C" || c.args[1] !== D) fail("every git call must run with -C <run directory>: " + JSON.stringify(c));
  for (const c of calls.slice(1)) {
    if (c.args[2] !== "check-ignore" || !c.args.includes("-q") || c.args[c.args.length - 2] !== "--") fail("check-ignore must be -q with a -- separator: " + JSON.stringify(c.args));
    if (isAbsolute(c.args[c.args.length - 1])) fail("a probe must be relative to the run directory");
  }
  p = proveRunIgnored(D, fake(0, { [RUN_IGNORE_PROBES[1]]: 1 }));
  if (p.status !== "unproven" || p.unproven.join() !== RUN_IGNORE_PROBES[1]) fail("exit 1 on one probe must leave exactly that probe unproven: " + JSON.stringify(p));
  p = proveRunIgnored(D, fake(0, Object.fromEntries(RUN_IGNORE_PROBES.map((x) => [x, 128]))));
  if (p.status !== "unproven" || p.unproven.length !== RUN_IGNORE_PROBES.length) fail("a git error on a probe is unproven, never ignored: " + JSON.stringify(p));
  calls.length = 0;
  p = proveRunIgnored(D, fake(128, {}));
  if (p.status !== "not-applicable" || calls.length !== 1) fail("outside a work tree the proof is not-applicable and makes no check-ignore call: " + JSON.stringify(p) + " " + calls.length);
  p = proveRunIgnored(D, fake("error", {}));
  if (p.status !== "not-applicable") fail("git absent must be not-applicable: " + JSON.stringify(p));

  // 3. Real git: repair, never overwrite, not-applicable outside a work tree.
  const sandbox = mkdtempSync(join(tmpdir(), "relay-qa-ignore-"));
  writeFileSync(join(sandbox, "empty.gitconfig"), "");
  process.env.GIT_CONFIG_GLOBAL = join(sandbox, "empty.gitconfig");
  const runner = resolve("plugins/relay/scripts/qa-run.mjs");
  let failure = null;
  try {
    const gitRoot = join(sandbox, "repo");
    mkdirSync(gitRoot);
    const g = spawnSync("git", ["init", "-q"], { cwd: gitRoot, encoding: "utf8" });
    if (g.error || g.status !== 0) throw new Error("git init failed: " + (g.error ? g.error.message : g.stderr));
    const mk = (rel) => { const d = join(gitRoot, ...rel.split("/")); mkdirSync(d, { recursive: true }); return d; };
    const repair = mk("PRPs/reports/f/qa-run/r1");
    p = ensureRunIgnore(repair);
    if (p.status !== "proven") throw new Error("a work-tree run directory without a .gitignore must be repaired and proven: " + JSON.stringify(p));
    const lines = readFileSync(join(repair, ".gitignore"), "utf8").split("\n");
    for (const rule of RUN_IGNORE_RULES) if (!lines.includes(rule)) throw new Error("the written .gitignore lacks the rule " + rule);
    const bad = mk("PRPs/reports/f/qa-run/r2");
    writeFileSync(join(bad, ".gitignore"), "# nothing is ignored here\n");
    p = ensureRunIgnore(bad, { alwaysWrite: true });
    if (p.status !== "unproven" || p.unproven.length !== RUN_IGNORE_PROBES.length) throw new Error("a .gitignore without the rules must be unproven: " + JSON.stringify(p));
    if (readFileSync(join(bad, ".gitignore"), "utf8") !== "# nothing is ignored here\n") throw new Error("an existing .gitignore was overwritten");
    const plain = join(sandbox, "plain", "r");
    mkdirSync(plain, { recursive: true });
    p = ensureRunIgnore(plain);
    if (p.status !== "not-applicable" || readdirSync(plain).length !== 0) throw new Error("outside a work tree ground and run must write nothing: " + JSON.stringify(p) + " " + readdirSync(plain).join());
    p = ensureRunIgnore(plain, { alwaysWrite: true });
    if (p.status !== "not-applicable" || readdirSync(plain).join() !== ".gitignore") throw new Error("init must write the file even outside a work tree: " + readdirSync(plain).join());

    // 4. The real runner: init proves, git status shows the tracked side only, ground and run halt on a tampered file.
    writeFileSync(join(gitRoot, "PRPs", "reports", "f", "qa-report.md"), "# QA Report\n\n## Test Cases\n\n### Case 1\n**Title:** Echo\n**Risk level:** low\n**Required state:** None\n**Coverage:** none\n**Automated test path:** n/a\n**Manual status:** pending\n**Manual step-by-step:**\n1. Open the page.\n\n## Notes\n\nnone\n");
    mkdirSync(join(gitRoot, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(gitRoot, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:1", roles: {} }));
    const sh = (cwd, args) => spawnSync(process.execPath, [runner, ...args], { encoding: "utf8", cwd });
    const init = sh(gitRoot, ["init", "--root", gitRoot, "--feature", "f"]);
    if (init.status !== 0 || !/^IGNORE_PROOF: proven$/m.test(init.stdout) || !/^RUN_ID: /m.test(init.stdout)) throw new Error("init in a work tree must exit 0 and print IGNORE_PROOF: proven: " + init.status + " " + init.stdout + init.stderr);
    const runRel = /^RUN_DIR: (.+)$/m.exec(init.stdout)[1].trim();
    const runAbs = join(gitRoot, ...runRel.split("/"));
    mkdirSync(join(runAbs, "grounding"), { recursive: true });
    for (const [rel, body] of [["grounding/anonymous--perfil.snapshot.json", "{}"], ["evidence/case-1.png", "x"], ["evidence/case-1.txt", "x"], ["evidence/case-1.http.json", "{}"], ["evidence/case-1.query-2.json", "{}"], ["results.json", "{}"]]) {
      writeFileSync(join(runAbs, ...rel.split("/")), body);
    }
    const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: gitRoot, encoding: "utf8" }).stdout;
    if (/grounding\/|evidence\//.test(status)) throw new Error("git status lists run evidence: " + status);
    if (!status.includes(runRel + "/results.json") || !status.includes(runRel + "/.gitignore")) throw new Error("the tracked side must stay visible: " + status);
    const tamperedRel = "PRPs/reports/f/qa-run/tampered";
    const tampered = mk(tamperedRel);
    writeFileSync(join(tampered, ".gitignore"), "# none\n");
    const gr = sh(gitRoot, ["ground", "--root", gitRoot, "--feature", "f", "--run-dir", tamperedRel, "--route", "/x"]);
    if (gr.status !== 1 || !gr.stderr.includes("FAILED_IGNORE_UNPROVEN") || gr.stdout.includes("GROUNDED:") || existsSync(join(tampered, "grounding"))) throw new Error("ground must halt FAILED_IGNORE_UNPROVEN and write nothing: " + gr.status + " " + gr.stderr);
    const rn = sh(gitRoot, ["run", "--root", gitRoot, "--feature", "f", "--run-dir", tamperedRel]);
    if (rn.status !== 1 || !rn.stderr.includes("FAILED_IGNORE_UNPROVEN") || existsSync(join(tampered, "results.json"))) throw new Error("run must halt FAILED_IGNORE_UNPROVEN before any result: " + rn.status + " " + rn.stderr);

    // 5. Outside a work tree: init is not-applicable and writes the file; run, started from a work-tree cwd, writes nothing into its run directory.
    const plainRoot = join(sandbox, "plain-root");
    mkdirSync(join(plainRoot, "PRPs", "reports", "f"), { recursive: true });
    mkdirSync(join(plainRoot, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(plainRoot, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:1", roles: {} }));
    writeFileSync(join(plainRoot, "PRPs", "reports", "f", "qa-report.md"), readFileSync(join(gitRoot, "PRPs", "reports", "f", "qa-report.md"), "utf8"));
    const pi = sh(plainRoot, ["init", "--root", plainRoot, "--feature", "f"]);
    if (pi.status !== 0 || !/^IGNORE_PROOF: not-applicable$/m.test(pi.stdout)) throw new Error("init outside a work tree must exit 0 and print IGNORE_PROOF: not-applicable: " + pi.status + " " + pi.stdout + pi.stderr);
    const piRel = /^RUN_DIR: (.+)$/m.exec(pi.stdout)[1].trim();
    if (!existsSync(join(plainRoot, ...piRel.split("/"), ".gitignore"))) throw new Error("init must write the .gitignore even outside a work tree");
    const manualRel = "PRPs/reports/f/qa-run/manual";
    const manual = join(plainRoot, ...manualRel.split("/"));
    mkdirSync(manual, { recursive: true });
    writeFileSync(join(manual, "plan.json"), JSON.stringify({ schema_version: 1, cases: [{ index: 1, title: "Echo", class: "human-by-nature", reason_code: "VISUAL_JUDGEMENT" }] }));
    const pr = sh(process.cwd(), ["run", "--root", plainRoot, "--feature", "f", "--run-dir", manualRel]);
    if (pr.status !== 0 || !existsSync(join(manual, "results.json"))) throw new Error("run outside a work tree must still write results.json: " + pr.status + " " + pr.stderr);
    if (existsSync(join(manual, ".gitignore"))) throw new Error("run wrote a .gitignore outside a work tree (the detection followed the working directory)");
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  } finally {
    try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* a read-only git object left behind is not a failure of the check */ }
  }
  if (failure !== null) fail(failure);
  '
  ```
  Before this task `proveRunIgnored` is not exported, so the import fails and the command exits non-zero. Parts 1 and 2 pin the call shape and the exit-code meaning without git; parts 3 to 5 run the real `git` and the real runner: the file written through the single helper, the tracked side visible in `git status --porcelain`, the halt on a tampered file for `ground` and `run`, and the not-applicable path started from a working directory that is itself a work tree.

### Task 3: UPDATE plugins/relay/resources/redaction-policy.md — source-first registration and snapshots, screenshots and personal data

- **ACTION**: Delivers AC-A5 (the policy documents the source-first registration rule and covers accessibility snapshots, screenshots and personal data). In `plugins/relay/resources/redaction-policy.md`, insert one new section immediately before the closing `## What this policy is NOT` section (line 177), after the `## URL handling (special case)` section and its trailing `---`, followed by its own `---`. Use LF line endings and ASCII only. The section is:
  1. The second-level heading, exactly: `## QA runner evidence: session values, snapshots, screenshots and personal data`. One short opening paragraph: the QA runner keeps its own redaction table in memory and writes evidence under `PRPs/reports/<feature>/qa-run/<run-id>/`; substring redaction is only as precise as the values registered, and a snapshot or a screenshot can show data no table knows.
  2. The subsection heading, exactly: `### Session values are registered source-first`. Content: (a) why: registering every string of a session corrupts the evidence the operator reads (`localhost`, `false` and `MIDDLE` became `[REDACTED]` inside 23 URLs); (b) three bullets: **Always registered** (any entropy; the 4-character absolute minimum of the table still applies): the token artifact, the cookie the role declares as its `sessionCookie`, the cookie named by each `api_origins` entry, env values selected by Layer 1 or Layer 2 names, `redact: true` captures and `redact_columns` values; **Registered above a floor**: every other cookie, `localStorage` and IndexedDB string, record keys included, only when it is at least 12 characters long and has a Shannon entropy of at least 3.0 bits per character; **Never registered**: a part of the target origin (scheme, host, port, host and port, the origin or a URL on it) and short literals such as `true`, `false`, `null` and small integers (the length gate refuses them); (c) the floor is a judgment: no scanner documents a minimum length (detect-secrets documents entropy limits of 4.5 for base64 and 3.0 for hex, gitleaks an example of 3.5), calibrated on the recorded values of a real scan whose six non-secrets were all under 12 characters; (d) the failure mode stated plainly: a short or low-entropy secret held by a cookie nobody declared is not masked by value, and what backs it (Layer 1 regexes, the structural masking of cookie and `localStorage` `value` fields and secret-named properties in every JSON evidence file, the ignore rule below, and the secrecy scan of the dogfood); the remedy is to declare such a cookie as `sessionCookie` or in `api_origins`, or to add a `regex:` line to `PRPs/redaction-extensions.txt`.
  3. The subsection heading, exactly: `### Snapshots, screenshots and personal data`. Content: (a) an accessibility snapshot lists locator names and visible text, a screenshot is pixels, and a response or row body is whatever the application returned for the test account: any of them can hold personal data (a task title, a person's name, an e-mail address) that no secret table recognizes; (b) the runner withholds a snapshot entry that carries a registered secret, an e-mail address or a `regex:` match, and withholds a screenshot (writing redacted text instead) when the page text carries a registered secret, but it cannot recognize free-text personal data; (c) therefore every grounding snapshot, screenshot, redacted-text file and evidence body lives under the run directory's `grounding/` and `evidence/`, which the run's own `.gitignore` ignores, written through the runner's single write helper and proven with `git check-ignore -q` for a path of each kind before anything is written; `results.json` and `plan.json` stay tracked and hold no page text and no input value; (d) when git is present and the proof does not hold the runner halts `FAILED_IGNORE_UNPROVEN` and writes no snapshot and no screenshot; when the run directory is not inside a git work tree nothing there can be committed and the proof is recorded as `not-applicable`; (e) an input value asserted by the runner is never written, only the result of the comparison.
  Do not edit any existing line of the file (the heading `### Credential stores, session files and storage-state paths`, `Set-Cookie` and `PRPs/auth/.sessions/` are pinned). Never write the policy file's own basename as a backticked token other than `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md`, and never write a backticked bare `scripts/...` path.
- **MIRROR**: `# SOURCE: plugins/relay/resources/redaction-policy.md:70-74` (heading depth, prose register and the "leak surface" wording the new section extends).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const policy = readFileSync("plugins/relay/resources/redaction-policy.md", "utf8").replace(/\r\n/g, "\n");
  const script = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const len = /export const SESSION_VALUE_MIN_LENGTH = (\d+);/.exec(script);
  const ent = /export const SESSION_VALUE_MIN_ENTROPY = (\d+(?:\.\d+)?);/.exec(script);
  if (len === null || ent === null) fail("the runner does not define the two floor constants");
  const present = [
    "## QA runner evidence: session values, snapshots, screenshots and personal data",
    "### Session values are registered source-first",
    "### Snapshots, screenshots and personal data",
    "### Credential stores, session files and storage-state paths",
    "Set-Cookie", "PRPs/auth/.sessions/", "PRPs/redaction-extensions.txt",
    "grounding/", "evidence/", ".gitignore", "git check-ignore", "FAILED_IGNORE_UNPROVEN", "not-applicable",
    `${len[1]} characters`, `${Number(ent[1]).toFixed(1)} bits per character`,
  ];
  for (const p of present) if (!policy.includes(p)) fail("the policy lacks: " + p);
  if (policy.includes("\r")) fail("the policy must use LF line endings");
  const heading = policy.split("\n").findIndex((l) => l === "## QA runner evidence: session values, snapshots, screenshots and personal data");
  const closing = policy.split("\n").findIndex((l) => l === "## What this policy is NOT");
  if (heading === -1 || closing === -1 || heading > closing) fail("the new section must sit before the closing section");
  '
  node scripts/validate/index.mjs
  ```
  The `present` literals are copied byte-for-byte from the ACTION above (the deliverable is the policy text, so a text match is the legitimate check for the content); the two numbers are read from the runner's own constants, so the doc cannot disagree with them. The second command runs the whole static suite (line endings, plugin-root resolvability, path existence, the unchanged `auth-secrecy` pins) over the edited file and exits non-zero if any of the 28 checks fails.

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — the ignore file and proof, the personal-data sentence, the registration sentence and the constraint

- **ACTION**: Delivers AC-A5 (the command doc states what `init`, `ground` and `run` now do and the registration rule the operator can rely on). In `plugins/relay/commands/relay-qa-run.md`, make exactly these edits and no other:
  1. P3 (after the sentence that ends with "On success, record `RUN_DIR` from stdout.", line 132), add one paragraph that states, with these literal phrases each on ONE physical line of the doc: the script also writes a `` `.gitignore` `` inside the new run directory through its single write helper that ignores `` `grounding/` and `evidence/` ``; it proves the rules with git check-ignore -q for a path of each kind before it prints anything; the grounding snapshots, screenshots, redacted-text files and the response and row bodies can hold personal data, so none of them may be tracked while `results.json` and `plan.json` stay tracked; the output ends with `` `IGNORE_PROOF: proven` `` or with `` `IGNORE_PROOF: not-applicable` `` when the run directory is not inside a git work tree; when git is present and the paths are not proven ignored the script halts `` `FAILED_IGNORE_UNPROVEN` `` and writes no snapshot and no screenshot, and the operator relays that code and its message, fixes the ignore rule and runs `init` again; `ground` and `run` prove the same rules before they write anything and, inside a work tree, restore a missing `.gitignore` first. Do not write the capitalized phrase that ends a sentence with the words "Personal data" and a period anywhere before the existing paragraph that opens with it (a test slices the doc from the grounding rules to the FIRST occurrence of that phrase).
  2. The existing personal-data paragraph (lines 265-269, which opens with the words "Personal data." and names `PRPs/redaction-extensions.txt`): keep it verbatim and append one sentence containing the literal phrase `stays out of git even when it is not withheld`, saying that the snapshot file is written under `<RUN_DIR>/grounding/`, which the run directory's `.gitignore` ignores, so free-text personal data the withholding rules cannot recognize (a task title, a person's name) stays out of git even when it is not withheld.
  3. Phase B (lines 556-561): replace ONLY the last sentence of the paragraph, "Cookie, localStorage, token and IndexedDB session values are all registered for redaction.", by prose containing these literal phrases: `registered for redaction source-first`, the token artifact, the role's declared `` `sessionCookie` `` and the cookie named by every `api_origins` entry always, every other cookie, localStorage and IndexedDB string (record keys included) only when it is `at least 12 characters long`, has an entropy of at least `3.0 bits per character` and is not a part of the target origin, and that a short or low-entropy value in an undeclared cookie is therefore not masked by value, so a cookie that carries a secret is declared as `sessionCookie` or in `api_origins`. Keep every other sentence of the paragraph (the `240`, `--force` and `IndexedDB` tokens are pinned by a minted-session test).
  4. "Final output surface": after the sentence "Every other session failure keeps `SESSION_UNAVAILABLE`.", add one sentence containing the literal phrase `wrote neither results nor evidence`: a run that halts `` `FAILED_IGNORE_UNPROVEN` `` before its first case wrote neither results nor evidence, so the operator fixes the run directory's ignore rule and runs it again.
  5. "Constraints (hard rules)": after the bullet "- **No credential value enters the conversation or any file this command writes.**" add one bullet that starts with the literal `- **Run evidence never reaches git.**` and states that the run directory carries its own `.gitignore` for `grounding/` and `evidence/`, proven with git check-ignore -q, and that an unproven ignore halts `FAILED_IGNORE_UNPROVEN` before any evidence is written.
  Do not add a table row of the form `` | `CODE` | `needs-human` | `` or `` | `CODE` | `blocked` | ``, a fenced `json` block, a `<!-- qa-step-example -->` or `<!-- qa-plan-entry-example -->` marker, or a heading. Never write, anywhere in the file, `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`, `--local-host`, `Until seeds`, `not yet read by the runner`, `a CLI, a database query`, `leave the case to the script`, `You write no plan entry for this`, `omit the case` in any casing, or any `..HEAD` diff form. Keep the physical line that holds `` `matches` is exactly `1` `` and the ground command line with its `MSYS_NO_PATHCONV=1` note untouched.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:556-561` (the paragraph whose last sentence is rewritten; the others are pure insertions beside it).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const flat = doc.replace(/\s+/g, " ");
  const present = [
    "`IGNORE_PROOF: proven`", "`IGNORE_PROOF: not-applicable`", "`FAILED_IGNORE_UNPROVEN`", "git check-ignore -q", "`.gitignore`",
    "stays out of git even when it is not withheld", "registered for redaction source-first", "at least 12 characters long", "3.0 bits per character", "`sessionCookie`",
    "wrote neither results nor evidence", "- **Run evidence never reaches git.**",
    "HUMAN GATE STILL OPEN", "qa-run.mjs\" ground --root", "`MSYS_NO_PATHCONV=1`", "PRPs/redaction-extensions.txt", "IndexedDB", "--force", "240",
  ];
  for (const p of present) if (!flat.includes(p)) fail("the command doc lacks: " + p);
  if (!/`matches` is exactly `1`/.test(doc)) fail("the exactly-one grounding phrase is no longer on one physical line");
  const absent = ["leave the case to the script", "You write no plan entry for this", "Until seeds", "not yet read by the runner", "a CLI, a database query", "--local-host", ".claude/PRPs", "design-spec", "relay-auth-setup", "subagent_type", "are all registered for redaction"];
  for (const a of absent) if (flat.includes(a)) fail("the command doc still carries: " + a);
  if (/omit the case/i.test(flat)) fail("the doc says omit the case (pinned absent by the classification test)");
  // RELAY-FIRST-MATCH-INTENDED: indexOf takes the FIRST occurrence on purpose; the stable-grounding test slices the doc from the first "Grounding rules." to the first "Personal data.", so both anchors must keep that order and the slice must stay longer than 100 characters.
  const rulesAt = doc.indexOf("Grounding rules.");
  const personalAt = doc.indexOf("Personal data.");
  if (rulesAt === -1 || personalAt === -1 || personalAt < rulesAt || personalAt - rulesAt < 100) fail("the Grounding rules to Personal data slice is broken");
  if (!/exactly one element/.test(doc.slice(rulesAt, personalAt))) fail("the grounding rules slice lost its exactly-one sentence");
  // RELAY-FIRST-MATCH-INTENDED: the ground command line occurs once and the stable-grounding test measures the distance from its first occurrence to the first Git Bash note.
  const groundAt = doc.indexOf("qa-run.mjs\" ground --root");
  if (groundAt === -1 || doc.indexOf("`MSYS_NO_PATHCONV=1`", groundAt) - groundAt > 1500) fail("the Git Bash note drifted from the ground command");
  const r = runQaRunContractCheck();
  if (!r.ok) fail(JSON.stringify(r.findings, null, 2));
  '
  node --test scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-query.test.mjs scripts/validate/checks/qa-run-per-test-resolution.test.mjs
  node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs
  ```
  The `present` literals are copied byte-for-byte from the ACTION above (the deliverable here is the doc text, so a text match is the legitimate check; the whitespace-collapsed form tolerates a wrap, the physical-line pins are asserted separately). The `absent` list is the pinned-forbidden set plus the sentence this task retires. The seven named test files are the ones that read the command doc and pass on the unmodified tree; the stable-grounding and minted-session doc assertions are covered by the explicit slice checks above and by Level 3.

### Task 5: UPDATE scripts/validate/checks/auth-secrecy.mjs — pin the policy section, the ignore rules and the floor numbers behind an opt-in flag

- **ACTION**: Delivers AC-A6 (the secrecy check is extended, not duplicated; the registered count stays 28; every existing caller and test is unaffected). In `scripts/validate/checks/auth-secrecy.mjs`:
  1. Add the constant `RUNNER_FILE = 'plugins/relay/scripts/qa-run.mjs'` beside the three file constants, and three heading constants: the run-evidence section heading `## QA runner evidence: session values, snapshots, screenshots and personal data`, `### Session values are registered source-first` and `### Snapshots, screenshots and personal data` (the exact strings Task 3 wrote).
  2. Extend the input of `checkAuthSecrecy` with `runnerScriptText` and `requireRunEvidence` (default `false`, exactly like the opt-in flags of `qa-run-contract`), and extend its JSDoc type and the header comment to list the new rules. The existing three-input behavior and every existing finding stay byte-identical when the flag is `false`.
  3. When `requireRunEvidence` is true: (a) `runnerScriptText == null` adds the `missing or unreadable file: plugins/relay/scripts/qa-run.mjs` finding; otherwise the runner text must contain `FAILED_IGNORE_UNPROVEN` and `check-ignore` (one finding per missing token, each naming the token), must define `export const RUN_IGNORE_RULES = Object.freeze([...]);` whose quoted entries (parse the single-quoted strings of that one statement) include `grounding/` and `evidence/` and contain no entry that starts with `!`, no blanket entry `*` or `/*` and no entry that names `results.json`, `plan.json` or `.gitignore` (the tracked side is never hidden: one finding per violation, naming the rule; the wording mirrors the existing ignore-resource findings, for example `runner ignore rules have an unexpected re-include: <rule>`, `runner ignore rules have a blanket rule that hides the tracked side: <rule>` and `runner ignore rules hide the tracked side: <rule>`, and a missing entry reads `runner ignore rules are missing required rule: <rule>`), and must define `export const SESSION_VALUE_MIN_LENGTH = <integer>;` and `export const SESSION_VALUE_MIN_ENTROPY = <number>;` (a missing definition is a finding); (b) the policy text must additionally contain the three headings, and each of `grounding/`, `evidence/`, `.gitignore`, `git check-ignore`, `FAILED_IGNORE_UNPROVEN`, `not-applicable` and `PRPs/redaction-extensions.txt` (one finding per missing token, naming it, in the existing message style `redaction policy does not contain: <token>`), and the two numbers parsed from the runner text as `<length> characters` and `<entropy to one decimal> bits per character`, so the policy cannot disagree with the constants. A null `policyText` keeps its existing single finding.
  4. `runAuthSecrecyCheck` passes `runnerScriptText: readOrNull(RUNNER_FILE)` and `requireRunEvidence: true`. Do not register a new check, do not touch `scripts/validate/index.mjs`, and add no write call.
- **MIRROR**: `# SOURCE: scripts/validate/checks/auth-secrecy.mjs:63-77` (the null-input branch, token loop and message shape the new rules follow) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:224-230` (an opt-in rule block over a script text with an `add(...)` finding per violation).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { checkAuthSecrecy, runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const read = (rel) => readFileSync(rel, "utf8");
  const ignore = read("plugins/relay/resources/auth-kit.gitignore");
  const kit = read("plugins/relay/scripts/auth-kit-secrecy.mjs");
  const policy = read("plugins/relay/resources/redaction-policy.md");
  const runner = read("plugins/relay/scripts/qa-run.mjs");
  const input = (o = {}) => ({ ignoreText: ignore, scriptText: kit, policyText: policy, runnerScriptText: runner, requireRunEvidence: true, ...o });
  // Every mutation anchor must occur exactly once, so a mutation can never silently miss.
  const once = (src, anchor) => { const n = src.split(anchor).length - 1; if (n !== 1) fail("mutation anchor must occur exactly once, found " + n + ": " + anchor.slice(0, 70)); return anchor; };
  const clean = checkAuthSecrecy(input());
  if (!clean.ok) fail("the real files must satisfy the run-evidence rules: " + JSON.stringify(clean.findings));
  const flagged = (label, r, token) => { if (r.ok || !r.findings.some((f) => f.message.includes(token))) fail(label + " was not flagged naming " + token + ": " + JSON.stringify(r.findings)); };
  // The command lives in a single-quoted shell string, so the single quotes of the array literal in the runner are built with a character code.
  const q = (...xs) => xs.map((x) => String.fromCharCode(39) + x + String.fromCharCode(39)).join(", ");
  const rules = once(runner, "export const RUN_IGNORE_RULES = Object.freeze([" + q("grounding/", "evidence/") + "]);");
  const withRules = (inner) => runner.replace(rules, () => "export const RUN_IGNORE_RULES = Object.freeze([" + inner + "]);");
  flagged("a policy without the run-evidence heading", checkAuthSecrecy(input({ policyText: policy.split("## QA runner evidence: session values, snapshots, screenshots and personal data").join("## X") })), "QA runner evidence");
  flagged("a policy without the proof token", checkAuthSecrecy(input({ policyText: policy.split("git check-ignore").join("git X") })), "git check-ignore");
  flagged("a policy whose length disagrees", checkAuthSecrecy(input({ policyText: policy.split("12 characters").join("99 characters") })), "characters");
  flagged("a policy whose entropy disagrees", checkAuthSecrecy(input({ policyText: policy.split("3.0 bits per character").join("9.0 bits per character") })), "bits per character");
  flagged("a runner without the rules constant", checkAuthSecrecy(input({ runnerScriptText: runner.split(once(runner, "export const RUN_IGNORE_RULES")).join("export const RULES_GONE") })), "RUN_IGNORE_RULES");
  flagged("a runner whose rules lost evidence/", checkAuthSecrecy(input({ runnerScriptText: withRules(q("grounding/")) })), "evidence/");
  flagged("a runner whose rules gained a re-include", checkAuthSecrecy(input({ runnerScriptText: withRules(q("grounding/", "evidence/", "!evidence/keep.png")) })), "!evidence/keep.png");
  flagged("a runner whose rules gained a blanket rule", checkAuthSecrecy(input({ runnerScriptText: withRules(q("grounding/", "evidence/", "*")) })), "blanket");
  flagged("a runner whose rules hide results.json", checkAuthSecrecy(input({ runnerScriptText: withRules(q("grounding/", "evidence/", "results.json")) })), "results.json");
  flagged("a runner that lost the halt", checkAuthSecrecy(input({ runnerScriptText: runner.split("FAILED_IGNORE_UNPROVEN").join("FAILED_X") })), "FAILED_IGNORE_UNPROVEN");
  flagged("a null runner text", checkAuthSecrecy(input({ runnerScriptText: null })), "missing or unreadable file");
  const quiet = checkAuthSecrecy({ ignoreText: ignore, scriptText: kit, policyText: policy.split("git check-ignore").join("git X"), runnerScriptText: runner.split("FAILED_IGNORE_UNPROVEN").join("FAILED_X") });
  if (!quiet.ok) fail("the run-evidence rules leaked into a caller that did not opt in: " + JSON.stringify(quiet.findings));
  const real = runAuthSecrecyCheck();
  if (!real.ok) fail("the real-tree secrecy check failed: " + JSON.stringify(real.findings, null, 2));
  '
  node --test scripts/validate/checks/auth-secrecy.test.mjs
  ```
  Before this task the new inputs are ignored, so every `flagged(...)` assertion exits non-zero. Every mutation is built from the real file text and anchored on a literal that occurs exactly once (the single quotes of the runner's array literal are built with `String.fromCharCode(39)` because the command lives in a single-quoted shell string; the resulting text is the single-quoted JavaScript the runner contains, so the Implementer must write `RUN_IGNORE_RULES` with single quotes and `Object.freeze([...])` on one line, as the ACTION states). The existing test file runs unchanged and proves the `false` default.

### Task 6: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the proof wiring, the halt, the `IGNORE_PROOF` line and the doc numbers behind an opt-in flag

- **ACTION**: Delivers AC-A6 (the contract check is extended, not duplicated; the registered count stays 28) and AC-A7 (the wiring that keeps the proof behind the local-only guard and before any write cannot silently move). In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Widen the import from `../../../plugins/relay/scripts/qa-run.mjs` to also import `SESSION_VALUE_MIN_LENGTH` and `SESSION_VALUE_MIN_ENTROPY`.
  2. Add the input `requirePrivacy` (default `false`, exactly like `requireGround`) to `checkQaRunContract` and to its JSDoc type; update the file's header comment to list the new rules. Do NOT edit the `requireGround` or `requireCatalogue` blocks: a test pins exactly four findings from `requireGround` on a bare doc.
  3. When `requirePrivacy` is true: (a) in the script text: `FAILED_IGNORE_UNPROVEN`, `IGNORE_PROOF` and `check-ignore` must appear; `export const RUN_IGNORE_RULES` must be defined exactly once; the text between `async function runInit(` and `async function runRun(` must contain `requireRunIgnore(` and `alwaysWrite: true`; the text between `async function runGround(` and `async function runGroundGuarded(` must contain `requireRunIgnore(` BEFORE `loadPlaywright(` (the proof precedes the browser, the session and the snapshot); the text between `async function runRun(` and `function runParse(` must contain `requireRunIgnore(` BEFORE `buildRedactionTable(` (the proof precedes every case); a section that cannot be located is itself a finding. (b) in the command text: `FAILED_IGNORE_UNPROVEN`, `IGNORE_PROOF`, `.gitignore`, `git check-ignore`, `${SESSION_VALUE_MIN_LENGTH} characters` and `${SESSION_VALUE_MIN_ENTROPY.toFixed(1)} bits per character` must appear, so the numbers in the doc follow the exported constants. One finding per missing token or misplaced call, each message naming it. No message may contain the phrases `is outside the closed vocabulary` or `step example`, and none may name a catalogue code (the existing tests count findings per code).
  4. `runQaRunContractCheck` passes `requirePrivacy: true` beside `requireStepExamples`, `requireCatalogue` and `requireGround`. No other caller changes. Add no write call and no new registered check.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:224-230` (an opt-in rule block over the script text) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:329-336` (the doc tokens and the numbers that follow exported constants); the new flag is added beside `requireGround` in the same signature and JSDoc type.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { checkQaRunContract, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const script = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
  const input = (o = {}) => ({ scriptText: script, commandText: doc, results: [], requirePrivacy: true, ...o });
  const once = (src, anchor) => { const n = src.split(anchor).length - 1; if (n !== 1) fail("mutation anchor must occur exactly once, found " + n + ": " + anchor.slice(0, 70)); return anchor; };
  const clean = checkQaRunContract(input());
  if (!clean.ok) fail("the real runner and doc must satisfy the privacy rules: " + JSON.stringify(clean.findings));
  const flagged = (label, r, token) => { if (r.ok || !r.findings.some((f) => f.message.includes(token))) fail(label + " was not flagged naming " + token + ": " + JSON.stringify(r.findings)); };
  for (const section of ["async function runInit(", "async function runRun(", "async function runGround(", "async function runGroundGuarded(", "function runParse("]) once(script, section);
  flagged("a script that lost the halt", checkQaRunContract(input({ scriptText: script.split("FAILED_IGNORE_UNPROVEN").join("FAILED_X") })), "FAILED_IGNORE_UNPROVEN");
  flagged("a script that lost the proof line", checkQaRunContract(input({ scriptText: script.split("IGNORE_PROOF").join("PROOF_X") })), "IGNORE_PROOF");
  flagged("an init that no longer always writes", checkQaRunContract(input({ scriptText: script.split("alwaysWrite: true").join("alwaysWrite: false") })), "alwaysWrite");
  // RELAY-FIRST-MATCH-INTENDED: each section marker occurs exactly once in the real runner (asserted by once() above), so indexOf and the slices below are unambiguous.
  const gs = script.indexOf("async function runGround(");
  const ge = script.indexOf("async function runGroundGuarded(");
  const rs = script.indexOf("async function runRun(");
  const re = script.indexOf("function runParse(");
  if (gs === -1 || ge < gs || rs === -1 || re < rs) fail("cannot locate the ground and run sections");
  const groundBody = script.slice(gs, ge);
  const runBody = script.slice(rs, re);
  const lateGround = groundBody.split("requireRunIgnore(").join("noopProof(").replace(once(groundBody, "loadPlaywright(root, PLUGIN_ROOT);"), () => "loadPlaywright(root, PLUGIN_ROOT); requireRunIgnore(runDirAbs);");
  flagged("a ground that proves after the Playwright load", checkQaRunContract(input({ scriptText: script.slice(0, gs) + lateGround + script.slice(ge) })), "requireRunIgnore(");
  const tableLine = "const table = buildRedactionTable({ root, env: process.env, secretValues: [] });";
  const lateRun = runBody.split("requireRunIgnore(").join("noopProof(").replace(once(runBody, tableLine), () => tableLine + " requireRunIgnore(runDirAbs);");
  flagged("a run that proves after the redaction table is built", checkQaRunContract(input({ scriptText: script.slice(0, rs) + lateRun + script.slice(re) })), "requireRunIgnore(");
  flagged("a doc without the proof line", checkQaRunContract(input({ commandText: doc.split("IGNORE_PROOF").join("PROOF_X") })), "IGNORE_PROOF");
  flagged("a doc without the halt", checkQaRunContract(input({ commandText: doc.split("FAILED_IGNORE_UNPROVEN").join("FAILED_X") })), "FAILED_IGNORE_UNPROVEN");
  flagged("a doc whose length disagrees", checkQaRunContract(input({ commandText: doc.split("12 characters").join("99 characters") })), "characters");
  flagged("a doc whose entropy disagrees", checkQaRunContract(input({ commandText: doc.split("3.0 bits per character").join("9.0 bits per character") })), "bits per character");
  const quiet = checkQaRunContract(input({ requirePrivacy: false, scriptText: script.split("FAILED_IGNORE_UNPROVEN").join("FAILED_X"), commandText: doc.split("IGNORE_PROOF").join("PROOF_X") }));
  if (quiet.findings.some((f) => /IGNORE|privacy|check-ignore|alwaysWrite/i.test(f.message))) fail("the privacy rules leaked into a caller that did not opt in: " + JSON.stringify(quiet.findings));
  const real = runQaRunContractCheck();
  if (!real.ok) fail("the real-tree contract failed: " + JSON.stringify(real.findings, null, 2));
  '
  node --test scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
  ```
  Before this task the new flag is ignored, so every `flagged(...)` assertion exits non-zero. Every mutation is built from the real script or doc text. The last command runs the contract test file and the stable-grounding file (which holds the "exactly four findings from `requireGround`" pin and the ground browser tests, about three minutes) to prove that the extension disturbed neither.

## Validation Commands

The plan writer has no shell tool: every command below, and every per-task `VALIDATE` above, was derived by reading the current tree, not executed.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/auth-secrecy.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The diff base for this phase is the tree recorded after Phase 2 (single-argument form: working tree against the tree object).
BASE=c4acb43119fe382f56e73fa555d082bc3c6a5aee
git cat-file -e "${BASE}^{tree}"
# The runner keeps the exact outcome vocabulary, a runner halt stays out of the plan-facing catalogue, and both extended checks hold on the real tree.
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
import { OUTCOMES, REASON_CATALOGUE } from "./plugins/relay/scripts/qa-run.mjs";
const fail = (m) => { console.error(m); process.exit(1); };
if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") fail("OUTCOMES changed");
if (Object.hasOwn(REASON_CATALOGUE, "FAILED_IGNORE_UNPROVEN")) fail("a runner halt must not be a plan-facing catalogue code");
for (const r of [runQaRunContractCheck(), runAuthSecrecyCheck()]) if (!r.ok) fail(r.name + ": " + JSON.stringify(r.findings, null, 2));
'
# No static import of a sibling file was added to the runner (the copy-helper tests copy only the runner and the guard).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# AC-14: the five frozen surfaces are byte-identical to the base tree.
frozen="$(git diff --name-only "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# Out of scope for this phase: the documentation site and the two mirrored governance files.
scope="$(git diff --name-only "$BASE" -- documentation docs/decisions.md docs/anti-patterns.md)"
if [ -n "$scope" ]; then
  echo "FAIL: a file outside this phase's scope changed:"; printf '%s\n' "$scope"; exit 1
else
  echo "PASS: documentation and mirrored governance files untouched"
fi
# The retired per-run host flag must not reappear in the two files the guard-site check lists.
if grep -nF -e "--local-host" plugins/relay/commands/relay-qa-run.md plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: --local-host appeared (forbidden by the auth-local-guard-sites check)"; exit 1
else
  echo "PASS: no --local-host"
fi
# No forbidden .claude/PRPs reference introduced by this phase's five files outside the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- plugins/relay/scripts/qa-run.mjs plugins/relay/resources/redaction-policy.md plugins/relay/commands/relay-qa-run.md scripts/validate/checks/auth-secrecy.mjs scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite must still register and pass 28 checks (the summary line is printed by scripts/validate/index.mjs).
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out"; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
# The whole corpus, glob quoted. This design makes no existing assertion stale (see Notes), so nothing is excluded.
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** for a saved session whose cookies include `tenant=localhost`, `level=MIDDLE` and `has_term_accepted=false` plus a 200-character JWT, every `http://localhost:3000/...` URL in the verbatim manual steps of `results.json` is byte-intact and the JWT value is replaced by `[REDACTED]`; the token artifact, the role's declared `sessionCookie` and every `api_origins` cookie are registered for redaction regardless of their length or entropy (above the table's 4-character minimum), and a part of the target origin is never registered.
- **AC-A2 (PRD AC-4):** for a storage state whose IndexedDB records hold the key `token` with a 40-character random value and a second record keyed by a 40-character random string, both random strings are registered and the short key `token` is not: record keys follow the same length and entropy floor as values.
- **AC-A3 (PRD AC-5):** `init` writes a `.gitignore` inside the fresh run directory through the single write helper that covers `grounding/` and `evidence/` (the screenshots, the redacted-text files and the response and row bodies), and `git check-ignore -q` exits 0 for a path of each kind; `results.json` and `plan.json` are not ignored.
- **AC-A4 (PRD AC-5):** when git is present and a probe path is not proven ignored, `init`, `ground` and `run` halt `FAILED_IGNORE_UNPROVEN` and write no snapshot, no screenshot and no `results.json`; when the run directory is not inside a git work tree the proof is recorded `not-applicable` and nothing halts, so every run directory outside a work tree behaves as before.
- **AC-A5 (PRD AC-3, AC-5):** `redaction-policy.md` documents the source-first registration rule, its floor and its failure mode, and covers accessibility snapshots, screenshots and personal data; `relay-qa-run.md` states the ignore file, the proof, the `IGNORE_PROOF` line, the halt and the registration rule with the same numbers as the exported constants.
- **AC-A6 (PRD AC-17):** `qa-run-contract` and `auth-secrecy` are extended behind opt-in flags that default to `false`, `npm run validate` passes all 28 checks, and the corpus is green with no existing assertion edited by the Implementer.
- **AC-A7 (PRD AC-14, AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-phase content; `qa-run.mjs` keeps one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(` and no static sibling import; the proof runs after the local-only guard and adds no request site.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A short or low-entropy secret held by an UNDECLARED cookie, localStorage entry or IndexedDB string falls under the floor and appears in evidence text | M | H | Declared sources are registered always; the Layer 1 regexes (JWT and others) and the structural masks of `redactJson` (cookie and `localStorage` `value` fields, secret-named properties) still apply; the evidence is ignored and proven; the policy and the doc state the remedy (declare the cookie, or add a `regex:` line); the dogfood secrecy scan (Phase 8) reads every tracked file and report |
| A long, harmless, high-entropy-looking value (a 20-character enum, a 12-character hex id) is registered and masks that text wherever it appears | L | L | Recorded as the second failure mode; it costs readability, never secrecy; the origin rule keeps URLs of the target intact whatever a cookie holds |
| A random hex secret of 12 to 15 characters falls under 3.0 bits per character (the expected entropy of a 12-character random hex string is about 3.1, with variance) | M | M | Same back-stops as the first row; the numbers are exported constants pinned against the policy and the doc, so recalibrating after the dogfood is one line in the runner and one in each doc |
| `git check-ignore` behaves differently on the operator's machine (global excludes, `GIT_*` variables, 8.3 short paths, a read-only repository) and the proof reports unproven for a directory that is in fact ignored | L | M | The proof runs with `-C <run directory>` and relative probe paths; `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_PREFIX` and `GIT_COMMON_DIR` are scrubbed; a nested `.gitignore` outranks parent and global patterns; an unproven result halts with a message that names the probe paths so the operator can fix the rule |
| An existing test runs inside a temp directory that happens to sit in a git work tree and sees a `.gitignore` appear in a run directory | L | L | The detection follows the run directory, not the working directory; every existing test that lists a run directory runs under `os.tmpdir()`; the minted-session fixtures that `git init` assert on evidence and results, not on listings; the one new file is `.gitignore` |
| New code disturbs a source-text pin of `qa-run.mjs` (a second `// GUARD-SITE` or `// WRITE-SITE`, a second `writeFileSync(` or `renameSync(`, a quoted `outcome:` literal, the `addSecretValues(ctx.table, secrets);` line, the `mkdirSync` and stdout lines of `runInit`) | M | H | Tasks 1 and 2 list the forbidden strings and the lines that stay byte-identical; the `.gitignore` goes through the existing helper; Level 2 runs the real-tree contract and Level 3 the whole corpus, including the mutation tests |
| A doc edit breaks a doc-reading test (the first-occurrence `Personal data.` slice, the `ground` command and its Git Bash note within 1500 characters, the catalogue table rows, every `json` block carrying `class` or `reason_code`, the record-resolution bullets) | M | M | Task 4 names each pin and the safe shapes (pure prose insertions, no table row, no `json` block, no heading); its `VALIDATE` re-derives the slice checks and runs the seven doc-reading test files and the planning-doc tests |
| Widening the ignore to the whole `evidence/` directory hides response and row bodies that an operator wanted to commit as an audit trail | L | M | Recorded as a decision in `## Notes`: those bodies come from the operator's own local data (the `d1-local` query source of case 23), `results.json` stays tracked and cites the paths, and `git add -f` remains available; the rules are one exported constant, pinned by `auth-secrecy` |
| Phase 2 widened what a grounding snapshot can hold (paragraph and cell text) and Phase 3 must land before the release cut | L | M | Phase 7 depends on this phase; the withholding rules are untouched and the snapshots are now under an ignored, proven directory |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so no new test file is authored here and this plan's `**VALIDATE**` commands exercise the change directly (several additionally run `node --test` over existing test files that this plan does not edit).
- **Derived by reading.** The plan writer has no shell tool: every `VALIDATE` command was derived by reading the current tree, not executed. Tasks 1 and 2 fail before the work (the new exports do not exist, so the import fails), Tasks 3 and 4 fail before the work (the policy and the doc lack the new sections and literals), and Tasks 5 and 6 fail before the work (the new flags are ignored, so every mutation goes unflagged). The Level 2 invariants pass on the unmodified tree by design, as regression guards.
- **The floor, calibrated (Open Question 1).** `SESSION_VALUE_MIN_LENGTH = 12` and `SESSION_VALUE_MIN_ENTROPY = 3.0` (Shannon entropy in bits per character over the characters of the value, the value registrable when it is at least 12 characters long AND its entropy is at least 3.0). This is a judgment, not a measurement: no scanner documents a length floor, the raw scan values live outside this repository (the `super-ensino` dogfood report) and the PRD records only their split (6 non-secrets, all under 12 characters; 13 long secrets). The calibration data: the six non-secrets are `localhost` (9 characters, 2.73 bits per character), `MIDDLE` (6, 2.25), `false` (5, 2.32), `0` (1, 0), `5` (1, 0) and `10` (2, 1.0), the first three named in the PRD and the last three as recorded in the scan summary this plan was briefed with; each is refused by BOTH gates independently, so neither gate alone carries the decision. The 13 secrets (JWTs, the `user-cookie` JSON, the notification configuration and slug) are recorded only as "long": a base64url string of 40 or more characters has an expected entropy near 4.9 bits per character and a JSON text near 4.0 to 4.5, so they clear 3.0 with at least 1 bit of margin. Why these numbers: 12 leaves a margin of 3 characters above the longest recorded non-secret and sits above the 10-character class of words such as `production`; 10 to 150 is the secret length of gitleaks' own generic rule (found by `research-web`, together with an entropy of 3.5), and detect-secrets has no length floor but its 3.0 hex limit can only be exceeded by a string of 9 or more characters; 3.0 is detect-secrets' hex limit and sits 0.27 above the highest recorded non-secret, while 4.5 (its base64 limit) would refuse hex session identifiers (at most 4.0 bits for a 16-symbol alphabet) and JSON blobs. Entropy of short strings is capped at log2(length), so the length gate is what protects short values and the entropy gate is what protects long low-variety ones (`aaaaaaaaaaaa`, an epoch in milliseconds). **Failure mode:** a secret shorter than 12 characters, a hex secret of 12 to 15 characters that happens to fall under 3.0, or a long low-variety secret, held by an UNDECLARED cookie, localStorage entry or IndexedDB string, is not registered by value and can appear in evidence text. Back-stops, in order: the Layer 1 value regexes, the structural masks of `redactJson` (every cookie and `localStorage` `value` field and every secret-named property of any JSON evidence file is replaced whatever the table holds), the `sessionCookie` and `api_origins` declarations (always registered), the proven ignore rule, and the dogfood secrecy scan. The opposite failure (a long harmless value registered and masking its own text) costs readability only.
- **What "declared" means in this tree.** There is no `declared session cookie` identifier in the runner today; the declaration lives in `PRPs/auth/login.config.json`: `roles.<role>.sessionCookie` (documented in the login template's header, line 30) and the `cookie` of each `api_origins` entry (read by `classifyApiOrigin`). The token artifact is `PRPs/auth/.sessions/<role>.token.json`. `declaredCookieNamesOf` reads exactly those, and `api_origins` cookies apply to every role because the map is top-level. The 4-character absolute minimum of `addSecretValues` is deliberately kept for declared sources ("regardless of length" means regardless of the floor; a 1 to 3 character value cannot be substring-redacted without corrupting every text, and the structural masks already cover cookie `value` fields).
- **Where the floor is applied, and why not in the collector.** `obtainSession` is the only site that registers undeclared session values; `buildRedactionTable` receives `secretValues: []` from both callers, `prepareApiStep`, `runQueryStep` and `prepareState` register declared values only. The floor is applied inside `splitSessionValues`, on what `collectIndexedDbSecrets` returns, rather than inside the collector, because the collector's existing unit assertions (`qa-run-minted-session.test.mjs` 336-358: 11-character and 13-character needles at about 2.8 to 3.4 bits per character) would otherwise be made stale, and because the same pure policy function then serves cookies, localStorage entries and IndexedDB keys and values alike.
- **The ignore proof, decided (the planning brief asked for a documented decision on non-git directories).** (1) Inside a git work tree and git present: the nested `.gitignore` is written (if absent) and each probe is proven with `git check-ignore -q`; anything other than exit 0 is unproven and halts `FAILED_IGNORE_UNPROVEN`. This is the prove-before-write rule of the auth kit (decisions [2026-09-25] item 8), with the same call shape. (2) Not inside a work tree, or git absent: the proof is `not-applicable` and nothing halts. The reasoning: PS14 is about data reaching a COMMIT; a directory outside a work tree cannot be committed through that tree, and many existing tests and real users run `init`, `ground` and `run` in exactly such directories, so halting there would break them for no privacy gain. The auth kit's own `ensure` treats a non-work-tree as unproven because it must never write a CREDENTIAL before it is certain that an ignore rule protects it; a run directory is created, and the proof asked of it, inside a project's own tree. The distinction is stated here so a reader does not "harmonize" the two. (3) Once git says it IS a work tree, an inability to confirm (exit 128 or an error) is unproven, fail closed, as in the kit's `proveIgnored`. (4) `init` always writes the file, because it is the run directory's creator and the file is harmless anywhere; `ground` and `run` write it only when the run directory is inside a work tree and has none (a repair of a run directory created by an earlier version), so a directory outside a work tree is left byte-for-byte as before and no existing listing assertion changes. (5) An existing `.gitignore` is never overwritten: the proof judges whatever the operator left. (6) `run` participates (the PRD names `init` and `ground`; "no screenshot" can only be honored by the mode that takes screenshots), halting before the first case so there is no half-written run.
- **Inline `git`, not an import (the planning brief's second decision: an inlined `spawnSync` call or a lazy sibling load).** The proof is inlined in `qa-run.mjs` with the already-imported `spawnSync`, mirroring `auth-kit-secrecy.mjs`'s call shape. A static import would fail at module load in every copy-helper test, and a lazy `import('./auth-kit-secrecy.mjs')` with a graceful absence path would make the proof silently absent in exactly the places (a copied runner) where it cannot be verified, while buying ~25 lines of reuse. The injectable `run` parameter lets a test drive both functions without git.
- **Open Question 2 resolved: the ignore covers the whole `evidence/` directory.** The default was to stay within AC-5's paths (screenshots and redacted-text files). Widened because the bodies are the most likely carriers of personal data, not the least: `case-N.query-K.json` holds up to 100 rows from the operator's own local database (the dogfood's case 23 reads the `d1-local` source of the owner's real tasks), and `case-N.http.json` holds up to 64 KB of whatever the application returned for the account. `results.json` and `plan.json` stay tracked and cite the evidence paths, so the report remains reviewable; `git add -f` remains available for an operator who wants a body in a commit. The doc, the policy and the pins say `grounding/` and `evidence/`; the AC-5 paths are a subset.
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A7).** AC-A1: `shannonEntropy` known values; `isRegistrableSessionValue` table (the six recorded non-secrets and the other short literals refused; the 11/12-character boundary and the 2.92/3.08-bit boundary; a 200-character JWT and 40-character random strings accepted; the origin, a URL on it and a host-only text); `declaredCookieNamesOf`; `splitSessionValues` (declared always, including a short low-entropy cookie and a 4-character token; undeclared through the floor); an end-to-end `run` whose echoed `Cookie` header and verbatim manual steps keep `localhost`, `MIDDLE` and `false` and mask the JWT (template: `qa-run.test.mjs` 867-889). AC-A2: IndexedDB records with the key `token` and a 40-character value, and a 40-character key, through `splitSessionValues`. AC-A3: `init` in a `git init` temp root writes the file through the single helper (the source counts of `writeFileSync(` and `renameSync(` stay 1), `git check-ignore -q` exits 0 for a grounding snapshot path, a screenshot path, a redacted-text path and a body path, `git status --porcelain --untracked-files=all` lists none of them, and `results.json` is not ignored. AC-A4: `proveRunIgnored` with an injected runner (exit 0, 1 and 128; git absent; outside a work tree makes exactly one call); `ground` and `run` against a tampered `.gitignore` halt with no `grounding/` directory and no `results.json`; `init` outside a work tree prints `IGNORE_PROOF: not-applicable` and still writes the file; `run` and `ground` outside a work tree leave the run directory listing unchanged even when the process working directory is a work tree. AC-A5/A6/A7: the `requireRunEvidence` rules (one finding per missing token or violating rule, silent without the flag, null inputs) and the `requirePrivacy` rules (one finding per missing token, the three ordering rules, silent without the flag), the real runner, policy and doc clean; the frozen-surface byte-identity.
- **Test-pair follow-up, existing assertions: none stale.** The design was chosen so that no existing assertion goes stale: the `addSecretValues`, `buildRedactionTable` and `collectIndexedDbSecrets` units are untouched; `init` outside a work tree still exits 0 with the same three stdout lines (`qa-run.test.mjs` 577-592 asserts exit 0, `RUN_ID`, `BASE_URL_ORIGIN` and the `evidence/` directory only, and a refused target still creates nothing because the proof follows the guard); `ground` and `run` outside a work tree write nothing new (`qa-run-stable-grounding.test.mjs` 647-670 assert an empty run directory after `GROUND_UNSTABLE` and after a refused target); the end-to-end session values are 14 to 26 characters at about 3.6 to 3.9 bits (`qa-run.test.mjs` 867-889, `qa-run-ui-grounding.test.mjs` 572-602, `qa-run-minted-session.test.mjs` 416-434) and still register; `qa-run-ui-grounding.test.mjs` 236-247 feeds `buildRedactionTable` directly and is unaffected; the doc pins (`qa-run-stable-grounding.test.mjs` 387-439, `qa-run-classification.test.mjs` 506-583, the minted-session `240`, `--force` and `IndexedDB` regexes) are kept by Task 4's constraints; `qa-run-stable-grounding.test.mjs` 504-519 (exactly four findings from `requireGround`) is kept by adding a new flag instead of editing that block; `auth-secrecy.test.mjs` passes only the three original inputs and keeps its baseline because the new flag defaults to `false`. The research that established this read every `qa-run*.test.mjs` file and `auth-secrecy.test.mjs`; if the Implementer or the test pair finds an assertion this analysis missed, it is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer.
- **Ordering.** Task 1 and Task 2 edit disjoint regions of `qa-run.mjs` (the redaction section and `obtainSession`; the write-helper neighborhood, `runInit`, `runGround`, `runRun` and the header comment) and can land in either order; Tasks 3 and 4 are prose and depend on the numbers and names of Tasks 1 and 2; Task 5 reads the runner and the policy (Tasks 1 to 3); Task 6 reads the runner and the doc (Tasks 1, 2 and 4).
- **Research.** `research-codebase` ran five rounds: every registration site and the write helper in `qa-run.mjs`; the test corpus (assertions on short secrets, run-directory listings, `init` and `ground`, the copy-helper tests and the source-text pins); a second pass over the six test files the first one did not open (none spawns `init`, one asserts an exact `evidence/` listing through a direct `runQueryStep` call that never reaches the new code, and many `run` tests inherit the repository work tree as working directory, which is why the git detection follows the run directory); every doc-text pin of the two edited documents with the generic validate rules that bind new prose (LF only, the resource-basename rule, path existence); and the single-occurrence mutation anchors of the runner text (`if (isObj(record)) {`, `if (!a.includes('://')) continue;`, `const abs = join(ctx.runDirAbs, 'evidence', name);`, the `writeRunFile` containment line, `import('./qa-query.mjs')`, `writeFileSync(tmp, data);` and others), which Task 2 lists so the new code does not duplicate them. `research-web` found the `git check-ignore` exit statuses (0 ignored, 1 not ignored, 128 fatal), that `-q` is valid only with a single pathname, that the command needs a work tree, that a non-existent path under an excluded directory is reported ignored (so the probes need not exist) while a bare non-existent directory is not matched by a trailing-slash pattern (so the probes are file paths), the detect-secrets limits (hex 3.0, base64 4.5, strict greater-than, no minimum length) and gitleaks' entropy 3.5 with a secret length hint of 10 to 150. Not read by the research rounds: the unread ranges of `qa-run.mjs` between the report parser and the grounding code, and the five generic checks whose scope lists name neither edited file.
- **Scope of docs.** `docs/api-reference.md` and the `documentation/` pages (`reference/commands.html`, `reference/scripts.html`, `reference/redaction-policy.html`, `changelog.html`) are not edited here: the `docs_sync` pass owns `docs/` at implement time and the site pages belong to Phase 7 per `documentation/AGENTS.md`.

*Generated: 2026-10-10*
*Approved: 2026-10-11*
*Implemented: 2026-10-11*
*Status: IMPLEMENTED*
