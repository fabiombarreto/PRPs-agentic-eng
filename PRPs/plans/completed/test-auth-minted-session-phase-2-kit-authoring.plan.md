# Feature: Kit authoring (Phase 2 of test-auth-minted-session)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (`auth-model.md` is consumed blindly by `/relay-auth-scripts`, which generates the kit); shared contract change (the auth-model template, its writer and reviewer rubric, and the `login.config.json` the generator derives); secret-adjacent handling (the generator must never write `confirmed` and never write a token value); documentation/ edit (documentation/AGENTS.md applies)
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" - local-only guard, secrecy, credentials never in the conversation, the human validation gate stays open
  - `PRPs/prds/manual-qa-runner-auth-kit.prd.md` (APPROVED, phases 1-8 complete) - the auth-model pair (nine sections, R-AM1..R-AM7), `/relay-auth-scripts` and its `--refresh` contract (AC-24)
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` (APPROVED, shipped in 0.44.0) - the seed trust gate (`status` exactly `confirmed`, written only by the operator), which `mint.status` mirrors
  - `PRPs/prds/test-auth-minted-session.prd.md` Decisions Log - "Trust gate": the generator writes `proposed`, the operator flips it, no new interactivity extension
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" - `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `capture.mjs` stay byte-identical (AC-13)
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - `docs/context/methodology.md`: `tdd: false`, `test_frameworks: ["node:test"]` - test-after, R-X strict: the Implementer authors zero test files
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" - no authored sentence, example or fixture may carry a token, cookie or localStorage value
  - "Writing pipeline artifacts under `.claude/`"
  - "Flipping any opt-in gating key by heuristic" / "Activating the test pair by heuristic" - the generator never writes `confirmed`; a mint command runs only after an explicit operator edit
  - "Weakening or deleting tests to make the loop turn green" and R-X strict - no existing test may be edited by the Implementer; the one pinned sentence this phase rewrites goes to the test pair
- Applicable architectural rules:
  - Interactivity boundary - no new extension: `/relay-auth-scripts` stays non-interactive and `/relay-auth-setup` keeps its single human approval
  - Command versus agent separation - the command owns file writes and preconditions; the agents own judgment
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - Template conformance: any change to `auth-model.md`'s shape lands in `auth-model-template.md` first and propagates to the writer and reviewer as one coordinated edit
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-auth-minted-session.prd.md` - Implementation Phases row 2: "Kit authoring" - Goal: a minted role is configured through the commands, not by hand - Success signal: against a fixture project whose model records a minted mechanism, the generated configuration carries a `proposed` `mint` block, and a refreshed `auth-login/1` kit becomes `auth-login/2` with all set values intact.

## Summary

Phase 1 shipped the `minted` mechanism inside `plugins/relay/resources/auth-login.template.mjs` (stamp `auth-login/2`). This phase teaches the authoring side about it, by prose edits to five tracked files and the documentation that mirrors them. The auth-model template, `auth-model-writer` and `auth-model-reviewer` learn to record, discover and accept a `minted` mechanism with `file:line` evidence of where the project issues sessions or tokens, keeping the nine required sections and the seven rubric ids R-AM1..R-AM7 unchanged. `/relay-auth-scripts` learns to derive `mechanism: "minted"` and write the role's `mint` block with `status` always `"proposed"`, `command` the argv the model declares or `null`, and `store`; it never writes `confirmed`. `--refresh` adds the `mint` field to roles lacking it without changing any set value and regenerates scripts from the `auth-login/2` template. No relay code changes; the one behavioral claim that code can verify (a refreshed kit runs against its old configuration, a generated `proposed` block is accepted and halts at the trust gate) is exercised by a plain fixture harness kept in the ignored `PRPs/reports/` scratch area. Because `tdd: false` with `node:test` declared and R-X strict, the Implementer writes no test file; one existing test pins a sentence this phase must rewrite and is routed to the test pair.

## User Story

As the operator of relay's human validation gate in a project whose login cannot be scripted
I want the auth model and `/relay-auth-scripts` to recognize a minted mechanism and write its `mint` block as `proposed`
So that a minted role is configured through the commands, and the only human act left is confirming the command once in a tracked file

## Problem Statement

Without kit-authoring support a minted role can be configured only by hand-editing `login.config.json`. The auth-model template, writer and reviewer know four mechanisms, the reviewer's R-AM1 has no rule for accepting evidence of where tokens are issued, and `/relay-auth-scripts` infers only `headed`, `static-token`, `api` or `form` and, on `--refresh`, adds only `browserProbe` and `authenticatesAnonymous`.

## Solution Statement

Add additive prose to the template, writer, reviewer and `/relay-auth-scripts`; rewrite the single `--refresh` sentence that enumerates newly introduced fields so it includes `mint`; extend the three documentation surfaces that describe these components (`docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/reference/agents.html`) and the changelog. `/relay-auth-setup` itself is read and left unchanged: it adopts the writer and reviewer by path and enumerates no mechanism. No documentation page is added, so the NAV and search-index registrations of `documentation/AGENTS.md` section 6 do not apply; the changelog entry does.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (authoring support for an existing shared kit) |
| Complexity | Medium (prose contracts with many pinning tests; no code) |
| Systems Affected | `plugins/relay/resources/auth-model-template.md`; `plugins/relay/agents/auth-model-writer.md`; `plugins/relay/agents/auth-model-reviewer.md`; `plugins/relay/commands/relay-auth-scripts.md`; `docs/api-reference.md`; `documentation/reference/commands.html`; `documentation/reference/agents.html`; `documentation/changelog.html`; validation fixtures under `PRPs/reports/test-auth-minted-session/phase-2-fixtures/` |
| Dependencies | Phase 1 (complete): the `mint` schema and `auth-login/2` stamp in `auth-login.template.mjs`. Node >= 18 for the fixtures |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/test-auth-minted-session.prd.md` lines 108-114 (AC-11, AC-12), 236, 255-263 (row 2 and Phase 2 details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/test-auth-minted-session.prd.md` | 108-114, 255-263 | AC-11 and AC-12 and this phase's scope |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 22-45, 80-94, 264-273 | The exact `mint` schema, the halts and the `mint` field validation the generated block must satisfy |
| P0 | `plugins/relay/commands/relay-auth-scripts.md` | 147-227, 231-242, 246-273 | Phase A derivation rules, the `--refresh` sentence, the final output surface and the constraints this phase extends |
| P0 | `plugins/relay/resources/auth-model-template.md` | 44-120 | The skeleton whose nine headings must stay, and the parenthetical notes after Authentication Mechanisms and Login Flow |
| P0 | `plugins/relay/agents/auth-model-reviewer.md` | 85-117 | R-AM1..R-AM7, the rubric the minted evidence rule extends |
| P0 | `plugins/relay/agents/auth-model-writer.md` | 79-114 | The discovery protocol bullets |
| P0 | `scripts/validate/checks/auth-kit-commands-hardening.test.mjs` | 158-171 | The one pinned sentence this phase rewrites (the EXISTING_TEST_UPDATED candidate) |
| P0 | `scripts/validate/checks/auth-scripts-command.test.mjs` | 73-117, 195-205 | `check()` invariants every edit to `relay-auth-scripts.md` must keep: the written-file set, no `relay-auth-setup`, no `/relay-qa-run`, no `design-spec` |
| P0 | `scripts/validate/checks/auth-model-pair.test.mjs` | 166-255, 547-550 | Reviewer, writer and template invariants: seven rubric ids, no `date -u` in the reviewer, exactly nine skeleton headings |
| P0 | `documentation/AGENTS.md` | 239-330, 332-380 | Registration rule, changelog format, plugin-version sync (no release is cut here) |
| P1 | `documentation/reference/commands.html` | 326-336 | The `/relay-auth-scripts` entry to extend |
| P1 | `documentation/reference/agents.html` | 609-631 | The writer and reviewer entries to extend |
| P1 | `documentation/changelog.html` | 31-71 | The Unreleased block |
| P1 | `docs/api-reference.md` | 128 | The `/relay-auth-scripts` row whose `--refresh` clause is rewritten |
| P1 | `plugins/relay/commands/relay-auth-setup.md` | 1-301 | Read and left unchanged (it enumerates no mechanism); confirms the writer and reviewer are adopted by path |
| P2 | `PRPs/plans/completed/test-auth-minted-session-phase-1-minted-mechanism.plan.md` | 213-221, 236-254 | Fixture conventions and the phase-1 end-state the harness mirrors |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:154-158
- `mechanism` is `headed` when the role is named under `## Non-Automatable Items`
  for SSO or MFA, `static-token` when `## Login Flow` or
  `## Authentication Mechanisms` names a shared static token presented with no
  login request, `api` when `## Login Flow` names a scriptable API login
  endpoint, otherwise `form`.
```
Copied by Task 5 (the mechanism bullet gains the `minted` rule; the sentence shape "X when <section> names ..." is kept).

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:159-163
- For a `static-token` role the `staticToken` block is filled only from the
  model's evidence: `tokenEnv` is an environment-variable NAME taken from
  `## Session and Token Model` (else null), `header` and `valuePrefix` come from
  where the API expects the token, and `browser` comes from the declared storage
  location (`localStorage`, or `indexedDB` with the declared database, object
```
Copied by Task 5 (the new `mint` bullet follows this per-mechanism block shape: every field filled only from model evidence, otherwise the literal `TBD - needs validation`).

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:214-218
  exists, including a `TBD - needs validation` value, is ever changed. It never
  touches a session, a token, `credentials.json` or `credentials.example.json`.
```
Copied by Task 5 (the sentence immediately before it, which names the newly introduced fields, is rewritten to include `mint`; these two lines stay byte-identical).

```
# SOURCE: plugins/relay/resources/auth-model-template.md:55-59
(a login-less shared secret presented by the client with no login request is
the `static-token` mechanism: record where the client presents it - an HTTP
header, and for browser use `localStorage` or IndexedDB with the declared
database, object store and key - and the token's source as an environment
variable NAME, never its value)
```
Copied by Task 2 (a sibling parenthetical for `minted` is added in the same style, as plain prose inside the skeleton fence, never a `##` heading).

```
# SOURCE: plugins/relay/agents/auth-model-reviewer.md:89-94
- **R-AM1** — Every authentication mechanism is named with spot-verifiable
  `file:line` evidence (verify by `Read`). A `static-token` mechanism satisfies
  this row when it names the header or browser location that presents the token
  (`localStorage`, or IndexedDB with database, object store and key) with
  `file:line` evidence. A recorded pre-authenticated target with no `file:line`
  naming the injecting code fails this row.
```
Copied by Task 3 (the minted rule is appended to the same bullet as further sentences; the `- **R-AM1**` line start stays so the rubric id scan still finds seven ids).

```
# SOURCE: plugins/relay/agents/auth-model-writer.md:92-96
- A `static-token` mechanism: a middleware or guard that compares a request
  header against a single configured secret with no login endpoint, and client
  code that reads that token from `localStorage` or IndexedDB — record both with
  `file:line` evidence, the header name, the browser location and the token's
  environment-variable NAME only (never a secret file, never a value).
```
Copied by Task 4 (a sibling discovery bullet for `minted`, same evidence-and-name-only discipline).

```
# SOURCE: documentation/changelog.html:57-60
        <li><strong><code>governance/decisions.html</code></strong> &mdash; entry 104 registers F10 as a backlog item:
          a new plugin cache never has <code>scripts/visual/node_modules</code>, so <code>playwright</code> fails to
          resolve until someone runs <code>npm install</code> by hand. Not implemented; the entry fixes what the
          eventual fix must decide.</li>
```
Copied by Task 6 (entry shape for the Unreleased `Changed` list: bold file reference, `&mdash;`, a sentence of what changed).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:264-273
  } else if (role.mechanism === 'minted') {
    const mint = role.mint;
    if (!mint || typeof mint !== 'object' || Array.isArray(mint)) return `roles.${ROLE}.mint`;
    const cmd = mint.command;
    if (cmd === undefined) return `roles.${ROLE}.mint.command`;
    if (cmd !== null && (!Array.isArray(cmd) || cmd.length === 0 || cmd.some((/** @type {any} */ a) => typeof a !== 'string' || a === ''))) {
      return `roles.${ROLE}.mint.command`;
    }
    if (mint.header !== undefined && typeof mint.header !== 'string') return `roles.${ROLE}.mint.header`;
    if (mint.valuePrefix !== undefined && typeof mint.valuePrefix !== 'string') return `roles.${ROLE}.mint.valuePrefix`;
  } else {
```
Copied by Task 1 (the generated `mint` shape the fixture config uses must satisfy this validation: `command` is an argv array or the JSON value `null`, never absent, and `header`/`valuePrefix` are strings when present).

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
| `PRPs/reports/test-auth-minted-session/phase-2-fixtures/kit-authoring-check.mjs` | CREATE | Plain node harness (not a test file): exercises the AC-12 refresh behavior and that a generated `proposed` `mint` block validates and halts at the trust gate |
| `PRPs/reports/test-auth-minted-session/phase-2-fixtures/count-touch.mjs` | CREATE | Tiny stand-in mint command that appends a line to a count file, proving nothing ran when the gate halts |
| `plugins/relay/resources/auth-model-template.md` | UPDATE | The canonical shape gains the `minted` mechanism and flow notes (nine sections kept) |
| `plugins/relay/agents/auth-model-reviewer.md` | UPDATE | R-AM1, R-AM2 and R-AM6 accept a minted mechanism with `file:line` evidence of where tokens are issued |
| `plugins/relay/agents/auth-model-writer.md` | UPDATE | Discovery guidance to cite where the project issues sessions or tokens |
| `plugins/relay/commands/relay-auth-scripts.md` | UPDATE | Derive `mechanism: minted`, write the `mint` block as `proposed`, extend `--refresh`, final output surface and constraints |
| `docs/api-reference.md` | UPDATE | The `/relay-auth-scripts` row's `--refresh` clause and the minted authoring rule |
| `documentation/reference/commands.html` | UPDATE | The `/relay-auth-scripts` entry describes minted authoring and the extended refresh |
| `documentation/reference/agents.html` | UPDATE | The auth-model-writer and auth-model-reviewer entries describe the minted rule |
| `documentation/changelog.html` | UPDATE | An Unreleased entry for the change (documentation/AGENTS.md section 7.4) |

## NOT Building (Scope Limits)

- **Any change to `plugins/relay/resources/auth-login.template.mjs`.** Phase 1 owns it; the generated shape is derived from its existing schema.
- **Any change to `plugins/relay/commands/relay-auth-setup.md`.** It was read in full (Phase A and B adopt the writer and reviewer by path) and enumerates no mechanism, so it needs no edit.
- **The project-side issuing command** for any project, including `super-ensino`: project work agreed with the operator in Phase 4.
- **Writing `confirmed`, running a mint command, or creating a session** from `/relay-auth-scripts`. The generator writes `proposed` only.
- **Runner integration** (re-mint margin, secret registration, blocked reasons in `/relay-qa-run`): Phase 3.
- **A new `documentation/` page, NAV entry or search-index entry.** No page is added, so documentation/AGENTS.md section 6's three-file registration is not triggered; only the changelog is updated.
- **A release cut or plugin version bump** (the 0.45.0 cut follows Phase 3).
- **A new `auth-model.md` section or a new rubric id.** The nine sections and R-AM1..R-AM7 are kept; the minted rule extends existing rows.
- **Hardening of `userCreation.command`, non-local targets, review-loop or `capture.mjs` changes.** Out of scope or frozen; `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` stay byte-identical (AC-13).
- **Any edit to an existing `*.test.mjs` file, or any new `*.test.mjs` file.** R-X strict; the test pair owns them.

## Step-by-Step Tasks

### Task 1: CREATE the fixture harness (kit-authoring-check.mjs, count-touch.mjs)

- **ACTION**: Infrastructure/scaffolding task: it delivers no acceptance criterion by itself; it creates the harness that Task 5's VALIDATE runs and that exercises AC-A3 and AC-A4. Create `PRPs/reports/test-auth-minted-session/phase-2-fixtures/` with two plain node ESM files, neither named `*.test.mjs`, neither created anywhere else.
  1. `count-touch.mjs` takes `--count-file <path>` and appends one line to it, prints nothing, exits 0.
  2. `kit-authoring-check.mjs` is run as `node kit-authoring-check.mjs <scenario>` where `<scenario>` is one of `stale-then-refresh`, `minted-proposed`, `minted-null-command` or `all` (runs every scenario in order, exits non-zero at the first failure); `--list` prints the scenario names and exits 0. It resolves the plugin root and template from `import.meta.url`, never from the cwd. It starts an in-process HTTP server on `127.0.0.1` port 0 whose `GET /api/me` answers 200 only when the `authorization` header equals `Bearer FIXTURE-TOKEN-91c3` and 401 otherwise. Per scenario it builds a throwaway git project (`git init -q` with the clean-environment pattern: `GIT_CONFIG_GLOBAL` an empty file, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CEILING_DIRECTORIES`), writes `PRPs/auth/login.config.json` with `baseUrl` the fixture origin, and copies `plugins/relay/resources/auth-login.template.mjs` into the project as `PRPs/auth/login-<role>.mjs` with every `__RELAY_ROLE__` replaced by the role slug (the single substitution `/relay-auth-scripts` performs). It runs the copy as an ASYNC child (`spawn`, `stdio: ['ignore','pipe','pipe']`) with `--plugin-root <absolute plugins/relay> --root <project>`. Assertions:
     - `stale-then-refresh`: role `ops` with the `auth-login/1`-era shape and no `mint` key at all: `mechanism: 'static-token'`, `loginPath: null`, `form: null`, `api: null`, `probe: {path: '/api/me', method: 'GET'}`, `sessionCookie: null`, `maxAgeMinutes: null`, `credentials: {usernameEnv: null, passwordEnv: null}`, `userCreation: {command: null}`, `staticToken: {tokenEnv: 'FIXTURE_TOKEN_ENV', header: 'Authorization', valuePrefix: 'Bearer ', browser: null}`, `browserProbe: null`, `authenticatesAnonymous: null`. First, a copy whose `const KIT_TEMPLATE_ID = 'auth-login/2';` line is rewritten to `auth-login/1` (asserted to occur exactly once before rewriting) exits 1 printing `FAILED_KIT_SCRIPT_STALE` and both `auth-login/1` and `auth-login/2`, with no `PRPs/auth/.sessions` directory created. Then the SHA-256 of `login.config.json` is recorded, the script is regenerated from the installed template by the single substitution (what `--refresh` does) and run with `FIXTURE_TOKEN_ENV=FIXTURE-TOKEN-91c3` in the child environment: it exits 0 and prints `SESSION_CREATED`. The SHA-256 of `login.config.json` afterwards equals the recorded value, and neither the child's stdout nor stderr contains the token value.
     - `minted-proposed`: role `ops` with `mechanism: 'minted'`, `probe: {path: '/api/me', method: 'GET'}`, `sessionCookie: null`, `maxAgeMinutes: 60`, `credentials` and `userCreation` as above, `browserProbe: null`, `authenticatesAnonymous: null`, and `mint: {command: [process.execPath, <absolute count-touch.mjs>, '--count-file', <count path>], store: '127.0.0.1:<port>', status: 'proposed'}` (the shape `/relay-auth-scripts` documents): the regenerated script exits 1 printing `FAILED_MINT_UNCONFIRMED` naming the role and `PRPs/auth/login.config.json`, the count file does not exist (nothing ran) and `PRPs/auth/.sessions/ops.json` does not exist.
     - `minted-null-command`: the same role with `command: null` and `status: 'proposed'` (the shape written when the model declares no command): the script exits 1, its output contains `FAILED_MINT_` and does not contain `FAILED_LOGIN_CONFIG_INCOMPLETE`, proving the generated shape passes the template's field validation and halts only at a mint gate.
     Any failed assertion prints `FAIL: <scenario>: <reason>` to stderr and exits 1; success prints `PASS: <scenario>` and exits 0. Do not assert a specific token or cookie value anywhere except as a needle that must be absent from output.
- **MIRROR**: `scripts/validate/checks/auth-login-template.test.mjs:209-223` (the async-child `run()` shape) and `plugins/relay/resources/auth-login.template.mjs:264-273` (the `mint` field validation the fixture config must satisfy), both in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; D=PRPs/reports/test-auth-minted-session/phase-2-fixtures; node --check $D/count-touch.mjs; node --check $D/kit-authoring-check.mjs; node $D/kit-authoring-check.mjs --list` (each command's own non-zero status fails the block; `--list` exits 0 only when the harness loads and enumerates its scenarios, and the files do not exist on the unmodified tree).

### Task 2: UPDATE `auth-model-template.md` with the minted mechanism and flow notes

- **ACTION**: Delivers AC-A1 (PRD AC-11, template half). In `plugins/relay/resources/auth-model-template.md`, inside the skeleton's fenced block, add two parenthetical notes in the style of the existing `static-token` parenthetical, as plain prose (never a `##` heading; the nine second-level headings and their order stay):
  1. Immediately after the existing `static-token` parenthetical under `## Authentication Mechanisms`, add: `(a session issued by a local project command with no login request at all is the `minted` mechanism: record the file:line of the code that issues the session or its tokens, the command the project declares for it as an argv list or "none declared", and the local store it touches; never a token, cookie or credential value)`. The phrase `is the `minted` mechanism` must stay on one line.
  2. Immediately after the existing Login Flow parenthetical (the one ending with the pre-authenticated target line), add a sentence-style note: `(a `minted` flow has no login step: state that the session is issued by the declared command, mark it scriptable, and cite the issuing code's file:line)`. The phrase `a `minted` flow has no login step` must stay on one line.
  Leave every other line, the closing nine-heading sentence and the status lines byte-identical. The added text must not contain `.claude/PRPs`, `design-spec`, `/relay-qa-run` or `date -u`.
- **MIRROR**: `plugins/relay/resources/auth-model-template.md:55-59` (the `static-token` parenthetical's register and "never its value" discipline), in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; T=plugins/relay/resources/auth-model-template.md; grep -qF 'is the `minted` mechanism' $T; grep -qF 'a `minted` flow has no login step' $T; node -e "const t=require('fs').readFileSync('$T','utf8').replace(/\r\n/g,'\n');const s=t.slice(t.indexOf('## Skeleton'));const h=[...s.matchAll(/^## (.+)$/gm)].map(m=>m[1]).filter(x=>x!=='Skeleton');const n=['Authentication Mechanisms','Login Flow','Session and Token Model','Role and Permission Matrix','Tenant Scoping','Local User Creation','Non-Automatable Items','Local Targets','Open Questions and Assumptions'];if(h.join('|')!==n.join('|')){console.error('FAIL: nine sections changed: '+h.join('|'));process.exit(1)}"` (the two greps fail on the unmodified tree; the node check fails if a heading is added, renamed or reordered).

### Task 3: UPDATE `auth-model-reviewer.md` so R-AM1, R-AM2 and R-AM6 accept a minted mechanism

- **ACTION**: Delivers AC-A1 (PRD AC-11, reviewer half: "its reviewer accepts a minted mechanism with `file:line` evidence of where tokens are issued"). In `plugins/relay/agents/auth-model-reviewer.md`, extend three existing rubric bullets by appending sentences inside each bullet; do not add a rubric id, do not change any `- **R-AM<n>**` line start, and do not touch Step 4, the timestamp section or the tools line:
  1. R-AM1: append `A `minted` mechanism satisfies this row when it names the code that issues the session or its tokens with `file:line` evidence (verify by `Read`), the declared command or an explicit "none declared", and the local store it touches.`
  2. R-AM2: append `A `minted` flow states that no login request exists and marks the flow scriptable.`
  3. R-AM6: append `A model that names a `minted` token, cookie or localStorage VALUE (rather than the issuing code and store) fails this row.`
  The three marker phrases `A `minted` mechanism satisfies this row`, `A `minted` flow states that no login request exists` and `names a `minted` token, cookie or localStorage VALUE` must each stay on one line. The file must still contain no `date -u`.
- **MIRROR**: `plugins/relay/agents/auth-model-reviewer.md:89-94` (R-AM1's `static-token` sentence), in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; R=plugins/relay/agents/auth-model-reviewer.md; grep -qF 'A `minted` mechanism satisfies this row' $R; grep -qF 'A `minted` flow states that no login request exists' $R; grep -qF 'names a `minted` token, cookie or localStorage VALUE' $R; test "$(grep -cE '^- \*\*R-AM[0-9]+\*\*' $R)" = "7"; if grep -q 'date -u' $R; then echo "FAIL: date -u present in reviewer"; exit 1; fi` (the three greps fail on the unmodified tree; the count and `date -u` lines guard the invariants `auth-model-pair.test.mjs` pins).

### Task 4: UPDATE `auth-model-writer.md` discovery guidance for the minted mechanism

- **ACTION**: Delivers AC-A1 (PRD AC-11, writer half: "writer guidance to cite where the project issues tokens"). In `plugins/relay/agents/auth-model-writer.md`, add one bullet to the `## Discovery protocol` list, after the `static-token` bullet: `- A `minted` mechanism: code that issues a session or its tokens for an existing user without a login request (a management or seed script, a test-only token helper, or a framework shell script) — record it with `file:line` evidence, the command the project declares for it as an argv list when one is documented (else "none declared" with a matching row under `## Open Questions and Assumptions`), and the local store it touches; never a token, cookie or credential value, and never a secret file.` The phrase `A `minted` mechanism: code that issues` must stay on one line. Do not change the tools line, the hard constraints or any other bullet.
- **MIRROR**: `plugins/relay/agents/auth-model-writer.md:92-96` (the `static-token` discovery bullet), in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; W=plugins/relay/agents/auth-model-writer.md; grep -qF 'A `minted` mechanism: code that issues' $W; grep -q '^tools: Read, Write, Edit, Glob, Grep$' $W; if grep -qE '^tools:.*Bash' $W; then echo "FAIL: writer gained Bash"; exit 1; fi` (the first grep fails on the unmodified tree; the tools lines guard the invariant the pair test pins).

### Task 5: UPDATE `relay-auth-scripts.md` to derive `minted`, write the `proposed` mint block and extend `--refresh`

- **ACTION**: Delivers AC-A2 (PRD AC-11, generator half) and AC-A3 (PRD AC-12, refresh half). Edit `plugins/relay/commands/relay-auth-scripts.md` additively except for one rewritten sentence:
  1. In the Phase A `mechanism` bullet, add a leading clause so the bullet reads `mechanism` is `minted` when `## Authentication Mechanisms` records a `minted` mechanism for the role, then the existing `headed`, `static-token`, `api` and `form` rules unchanged. The phrase `records a `minted` mechanism for the role` must stay on one line.
  2. After the `static-token` bullet, add a bullet for the `mint` block: for a `minted` role the `mint` block is `{ "command", "store", "status" }` filled only from the model's evidence; ``` `status` is the literal `"proposed"` ``` and is never `"confirmed"`; `command` is the argv array the model's `## Authentication Mechanisms` or `## Local User Creation` records for issuing the session, else the JSON value `null`; `store` is the local store the model records (a local host:port or URL), else `TBD - needs validation`; `header` and `valuePrefix` are written only when the model states where the API expects the token. The model's `file:line` evidence of where sessions or tokens are issued is reported in the final output surface beside any role whose `command` is `null`, and is never written into the configuration. Name the script's own halts for this mechanism: `FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`, `FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND` and `FAILED_MINT_OUTPUT`. The marker `` `status` is the literal `"proposed"` `` must stay on one line.
  3. REWRITE (the one non-additive edit) the `--refresh` sentence that currently reads `` `--refresh` adds to the configuration only the fields a newer template introduces (`browserProbe` and `authenticatesAnonymous`, as `null` unless the model states them) on roles that lack them; `` so that it names `mint` as well: `` (`browserProbe` and `authenticatesAnonymous`, as `null` unless the model states them, and `mint`, written as the proposed block described above for a role whose `mechanism` is already `minted` and as `null` for every other role) ``. The marker `` and `mint`, written as the proposed block `` must stay on one line. State that `--refresh` never changes a set `mechanism`, so moving a role to `minted` on an existing kit is an operator edit of that tracked value followed by `--refresh`. Leave the following lines (`no key that already exists, including a `TBD - needs validation` value, is ever changed. It never touches a session, a token, `credentials.json` or `credentials.example.json`.`) byte-identical.
  4. In `## Final output surface`, add: for each `minted` role, report that `mint.status` is `proposed`, that the operator must write or review `mint.command` and set `mint.status` to `confirmed` in the tracked file before the script runs anything, and the issuing code's `file:line` evidence when `command` is `null`.
  5. In `## Constraints (hard rules)`, add the bullet `**Never write `confirmed`.** The generator writes `mint.status` as `proposed` only; confirming a mint command is the operator's edit of a tracked file.` (the marker `Never write `confirmed`` on one line), placed after the `No credential value enters the conversation` bullet and NOT inside or between the `**The only files written**` bullet and the `- **Never write**` bullet. In `## What you do NOT do`, add `- **Run, confirm or compose a mint command.**`.
  Do not add the strings `relay-auth-setup`, `/relay-qa-run`, `design-spec`, `--local-host` or `.claude/PRPs` anywhere in the file, and do not add a `PRPs/auth/...` path inside the `**The only files written**` bullet.
- **MIRROR**: `plugins/relay/commands/relay-auth-scripts.md:154-158` (the mechanism bullet), `plugins/relay/commands/relay-auth-scripts.md:159-163` (the per-mechanism block shape) and `plugins/relay/commands/relay-auth-scripts.md:214-218` (the refresh sentence's tail that stays byte-identical), in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; C=plugins/relay/commands/relay-auth-scripts.md; grep -qF 'records a `minted` mechanism for the role' $C; grep -qF '`status` is the literal `"proposed"`' $C; grep -qF 'and `mint`, written as the proposed block' $C; grep -qF 'Never write `confirmed`' $C; for c in FAILED_MINT_UNCONFIRMED FAILED_MINT_COMMAND_MISSING FAILED_MINT_COMMAND FAILED_MINT_OUTPUT; do grep -qF "$c" $C; done; if grep -qE 'relay-auth-setup|/relay-qa-run|design-spec|--local-host|\.claude/PRPs' $C; then echo "FAIL: forbidden token in command"; exit 1; fi; node PRPs/reports/test-auth-minted-session/phase-2-fixtures/kit-authoring-check.mjs all` (the greps fail on the unmodified tree; the harness exercises the refreshed-kit and generated-shape behavior the prose describes against the real template).

### Task 6: UPDATE the documentation surfaces and the changelog

- **ACTION**: Delivers AC-A5 (PRD AC-11 and AC-12, documentation half). Read `documentation/AGENTS.md` first (done at planning time; re-read sections 6, 7 and 9). No page is added, so only existing pages are modified (section 9) and the changelog is updated (section 7.4); do not rename any `id`, add any NAV or search-index entry, add inline styles or emojis, or bump `plugins/relay/.claude-plugin/plugin.json` (no release is cut here).
  1. `docs/api-reference.md`, the `/relay-auth-scripts` row (one long line): rewrite its `--refresh` clause `only the fields a newer template introduces (`browserProbe`, `authenticatesAnonymous`, as `null` unless the model states them) are added to roles lacking them` to include `` and `mint`, written as the proposed block for a `minted` role and as `null` otherwise ``, and add one sentence that the generator derives `mechanism: minted` from a model that records one and writes `mint.status` as `proposed` only, never `confirmed`. Marker `` and `mint`, written as the proposed block `` on one line. Edit with `Edit` and a narrow `old_string`; never rewrite the file.
  2. `documentation/reference/commands.html`, the `/relay-auth-scripts` Notes `<dd>` (line 336): add, in the same sentence register, that a model recording a `minted` mechanism makes the generator write the role's `<code>mint</code> block` with `<code>status</code>` `<code>proposed</code>`, the declared command or `null`, and the store, that the generator never writes `confirmed`, and that `--refresh` adds `<code>mint</code>` to roles lacking it without changing a set value. Marker `writes its <code>mint</code> block with <code>status</code> <code>proposed</code>` on one line.
  3. `documentation/reference/agents.html`: extend the `auth-model-writer` Responsibility `<dd>` (line 617) with a sentence classifying a session issued by a local project command as the `<code>minted</code>` mechanism recorded with `<code>file:line</code>` evidence (marker `as the <code>minted</code> mechanism`), and the `auth-model-reviewer` Responsibility `<dd>` (line 629) with a sentence that a `<code>minted</code>` mechanism with the issuing code's `<code>file:line</code>` evidence satisfies `<code>R-AM1</code>` and `<code>R-AM2</code>` and that naming a minted value fails `<code>R-AM6</code>` (marker `A <code>minted</code> mechanism with the issuing code`).
  4. `documentation/changelog.html`: under `<h2 id="unreleased">`, add one `<li>` to the `Changed` list (`<h3 id="unreleased-changed">`) in the shape of the pinned pattern, referencing `<code>reference/commands.html</code>`, `<code>reference/agents.html</code>`, the auth-model template and `/relay-auth-scripts`, with the marker `Kit authoring for the <code>minted</code> mechanism` on one line. Do not touch the 0.44.0 or any released section.
- **MIRROR**: `documentation/changelog.html:57-60` (the Unreleased `Changed` entry shape), in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; grep -qF 'and `mint`, written as the proposed block' docs/api-reference.md; grep -qF 'writes its <code>mint</code> block with <code>status</code> <code>proposed</code>' documentation/reference/commands.html; grep -qF 'as the <code>minted</code> mechanism' documentation/reference/agents.html; grep -qF 'A <code>minted</code> mechanism with the issuing code' documentation/reference/agents.html; node -e "const t=require('fs').readFileSync('documentation/changelog.html','utf8');const a=t.indexOf('id=\"unreleased\"');const b=t.indexOf('id=\"v0-44-0\"');if(a<0||b<a||!t.slice(a,b).includes('Kit authoring for the <code>minted</code> mechanism')){console.error('FAIL: no minted entry inside the Unreleased block');process.exit(1)}"; npm run validate` (the greps and the Unreleased-scoped node check fail on the unmodified tree; `npm run validate` runs all 28 static checks, including registration parity and the decisions mirror).

## Validation Commands

Every block starts with `set -euo pipefail` so any single failure fails the block. `BASE` is the phase-1 end-state tree; it is used in the single-argument form `git diff <tree> -- <paths>` and only over paths this phase edits, never over files phase 1 already modified.

### Level 1: STATIC_ANALYSIS

```bash
set -euo pipefail
BASE=87b63b8b67f9498aaa506c6b1648dd2dbeee8bb0
D=PRPs/reports/test-auth-minted-session/phase-2-fixtures
node --check $D/count-touch.mjs
node --check $D/kit-authoring-check.mjs
npm run validate
# diff-scoped forbidden-reference scan, excluding the standard quoted-prohibition idiom
if git diff --unified=0 $BASE -- plugins/relay/resources/auth-model-template.md plugins/relay/agents/auth-model-reviewer.md plugins/relay/agents/auth-model-writer.md plugins/relay/commands/relay-auth-scripts.md documentation/reference/commands.html documentation/reference/agents.html documentation/changelog.html \
     | grep -E '^\+[^+]' | grep '\.claude/PRPs' | grep -qv 'MUST NOT appear'; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced outside quoted prohibitions"
fi
```

### Level 2: CONTENT_INVARIANTS

```bash
set -euo pipefail
BASE=87b63b8b67f9498aaa506c6b1648dd2dbeee8bb0
# authored literals present (each is absent on the unmodified tree)
grep -qF 'is the `minted` mechanism' plugins/relay/resources/auth-model-template.md
grep -qF 'a `minted` flow has no login step' plugins/relay/resources/auth-model-template.md
grep -qF 'A `minted` mechanism satisfies this row' plugins/relay/agents/auth-model-reviewer.md
grep -qF 'A `minted` flow states that no login request exists' plugins/relay/agents/auth-model-reviewer.md
grep -qF 'names a `minted` token, cookie or localStorage VALUE' plugins/relay/agents/auth-model-reviewer.md
grep -qF 'A `minted` mechanism: code that issues' plugins/relay/agents/auth-model-writer.md
grep -qF 'records a `minted` mechanism for the role' plugins/relay/commands/relay-auth-scripts.md
grep -qF '`status` is the literal `"proposed"`' plugins/relay/commands/relay-auth-scripts.md
grep -qF 'and `mint`, written as the proposed block' plugins/relay/commands/relay-auth-scripts.md
grep -qF 'Never write `confirmed`' plugins/relay/commands/relay-auth-scripts.md
# the generator never writes confirmed anywhere except in a prohibition or operator instruction: no line of the command assigns it
if grep -nE '"status": *"confirmed"' plugins/relay/commands/relay-auth-scripts.md; then
  echo "FAIL: the generator documents writing status confirmed"; exit 1
else
  echo "PASS: no confirmed-writing instruction"
fi
# regression guards: nine sections, seven rubric ids
test "$(grep -cE '^- \*\*R-AM[0-9]+\*\*' plugins/relay/agents/auth-model-reviewer.md)" = "7"
# AC-13: the four frozen files are byte-identical to the phase-1 end state (which equals the pre-feature content for them)
git diff --exit-code $BASE -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs
# phase scope: no test file, no template, no auth-setup command touched by this phase
git diff --quiet $BASE -- plugins/relay/resources/auth-login.template.mjs plugins/relay/commands/relay-auth-setup.md
if git diff --name-only $BASE | grep -E '\.test\.mjs$'; then
  echo "FAIL: a test file differs from the phase-1 end state"; exit 1
else
  echo "PASS: no test file touched"
fi
```

### Level 3: INTEGRATION

Existing test selection: exactly one existing test pins text this phase rewrites. `scripts/validate/checks/auth-kit-commands-hardening.test.mjs:158-171` (the test named `AC-24: --refresh regenerates every selected script ...`) pins the verbatim sentence `adds to the configuration only the fields a newer template introduces (`browserProbe` and `authenticatesAnonymous`, as `null` unless the model states them) on roles that lack them` that Task 5 rewrites; it is an EXISTING_TEST_UPDATED candidate for the test pair and is the only test excluded.

```bash
set -euo pipefail
D=PRPs/reports/test-auth-minted-session/phase-2-fixtures
node $D/kit-authoring-check.mjs all
node --test --test-skip-pattern "AC-24: --refresh regenerates every selected script" "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-11):** The auth-model template, `auth-model-writer` and `auth-model-reviewer` recognize a minted mechanism: the template records the issuing code's `file:line`, the declared command (or "none declared") and the store; the writer discovers and cites them; the reviewer's R-AM1, R-AM2 and R-AM6 accept a minted mechanism with `file:line` evidence of where tokens are issued and reject a recorded value. `auth-model.md` keeps its nine sections and the rubric keeps R-AM1..R-AM7.
- **AC-A2 (PRD AC-11):** `/relay-auth-scripts`, given a model that records a minted mechanism, writes the role's `mint` block with `status: "proposed"`, the `command` the model declares or `null` (with the issuing code's `file:line` reported in the output), and the `store`; no relay command or agent writes `confirmed`.
- **AC-A3 (PRD AC-12):** `/relay-auth-scripts --refresh` adds the `mint` field to roles lacking it without changing any value already set (including `mechanism` and any `TBD - needs validation`), and regenerates the selected scripts from the `auth-login/2` template.
- **AC-A4 (PRD AC-12):** A login script from template `auth-login/1` halts `FAILED_KIT_SCRIPT_STALE` naming both identities; the script regenerated from `auth-login/2` runs a non-minted role against its unchanged `auth-login/1`-era configuration exactly as before, and a generated `proposed` `mint` block validates and halts at `FAILED_MINT_UNCONFIRMED` with nothing run.
- **AC-A5 (PRD AC-11, AC-12):** The command and agent documentation (`docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/reference/agents.html`) describes the minted authoring behavior and the changelog records it under Unreleased; no page is added, so no NAV or search-index entry is required.
- **AC-A6 (PRD AC-13):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, and `npm run validate` keeps passing its 28 checks.

(Task-to-criterion map: Task 2, 3 and 4 deliver AC-A1; Task 5 delivers AC-A2 and AC-A3; Task 1 exercises AC-A3 and AC-A4 and Task 5's VALIDATE runs it; Task 6 delivers AC-A5; AC-A6 is delivered by the absence of edits and guarded by Level 2.)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A pinned sentence in `relay-auth-scripts.md` is rewritten and the existing test fails | H | M | Exactly one pinned sentence is rewritten (the `--refresh` fields sentence); it is listed as an EXISTING_TEST_UPDATED candidate and excluded from Level 3 with `--test-skip-pattern`; every other edit is additive and was checked against the `check()` invariants of `auth-scripts-command.test.mjs` |
| An added `##` line inside the template skeleton breaks the nine-section pin | L | H | The added notes are parentheticals; Task 2's VALIDATE recomputes the skeleton headings |
| The generator is read as authorizing `confirmed` | L | H | The Constraints bullet and the "What you do NOT do" bullet forbid it, and Level 2 fails on any `"status": "confirmed"` instruction in the command |
| The evidence for a `null` command has no field in `login.config.json` | M | L | The evidence is reported in the output surface, not persisted; the template's schema is Phase 1's and is not changed here. The reviewer's R-AM1 rule keeps the evidence in the tracked `auth-model.md` |
| An existing kit's role cannot move to `minted` through `--refresh` alone | M | L | `--refresh` never changes a set `mechanism` (AC-12), so the documented path is an operator edit of the tracked value followed by `--refresh`; stated in Task 5 |
| Docs-site checks drift when the changelog or reference pages change | M | M | `npm run validate` (registration parity, decisions mirror) is in Level 1 and Task 6's VALIDATE; no page, decision entry or command is added |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
by the Implementer — R-X is a blanket straight-fail on any test glob in
the Implementer's diff. No task below and no `## Files to Change` row
targets a test file, so this plan's `**VALIDATE**` commands exercise the
change directly rather than invoking the test framework.

**EXISTING_TEST_UPDATED candidate (for the test pair, not an Implementer task):**
- `scripts/validate/checks/auth-kit-commands-hardening.test.mjs`, the test `AC-24: --refresh regenerates every selected script from the installed template by the single substitution, adds only new fields as null, never changes a set key, and never touches a session, token or credential file; without it a script is skipped and reported stale or not` (lines 158-171). Its pin at line 165 is the literal `adds to the configuration only the fields a newer template introduces (`browserProbe` and `authenticatesAnonymous`, as `null` unless the model states them) on roles that lack them`, which Task 5 rewrites to also name `mint`. The test pair should update that one literal to the new wording (all other pins in the test, lines 161-164 and 166-169, remain true).

**Tests read and found unaffected** (additive edits only; evidence is the literal each one pins): `auth-scripts-command.test.mjs` pins the precondition order, `*Status: APPROVED*`, the one-substitution sentence, the written-file bullet (`**The only files written**` to `- **Never write**`, so Task 5 adds nothing inside it), and the absence of `relay-auth-setup`, `/relay-qa-run`, `design-spec`, `--local-host` and `.claude/PRPs`. `auth-model-pair.test.mjs` pins exactly nine skeleton headings, exactly seven `- **R-AM<n>**` lines in order, the reviewer's tools line and the absence of `date -u`, the writer's tools line and its secret-path literals, and the unchanged `relay-auth-setup.md`. The remaining auth tests (`auth-login-template`, `auth-reuse-proof`, `auth-probe-hardening`, `auth-static-token-indexeddb`, `qa-run-kit-hardening`, `qa-run-api-origins`) read the template `.mjs` or the runner, neither of which this phase edits; Level 2 asserts the template is unchanged against the phase-1 end state. Documentation-surface checks (registration parity, decisions mirror) run inside `npm run validate` in Level 1.

**Decision (evidence placement):** AC-11 asks for `null` "with the evidence of the project's token-issuing code". The template's `mint` schema (Phase 1) has no evidence field, and adding one would change the template. The evidence therefore lives in the tracked `auth-model.md` (enforced by R-AM1) and is repeated in the generator's final output beside each `command: null`; it is not persisted in `login.config.json`.

**Decision (refresh of an existing role):** `--refresh` never changes a set value, including `mechanism`. A role on an existing kit moves to `minted` by an operator edit of its `mechanism`, after which `--refresh` writes its `proposed` block. A role lacking `mint` whose mechanism is not `minted` gets `"mint": null`, which the template ignores for non-minted mechanisms.

**Research grounding:** `research-codebase` and `research-web` were not dispatched as separate subagents in this run; the grounding is the direct reads cited in `## Mandatory Reading` and `## Patterns to Mirror` (each snippet read at the stated lines in this run), plus a read-only search of the test corpus for pinned literals. `research-web` has no value for a prose-only, internal-contract phase.

*Generated: 2026-10-08*
*Approved: 2026-10-08*
*Implemented: 2026-10-08*
*Status: IMPLEMENTED*
