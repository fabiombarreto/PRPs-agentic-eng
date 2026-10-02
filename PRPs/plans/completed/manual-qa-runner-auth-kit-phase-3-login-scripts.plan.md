# Feature: Login scripts (Phase 3 of manual-qa-runner-auth-kit)

```
**Decision Gate**
- Active context: none
- Activated criteria: creation of a new standalone command, a new guard script and a new script template; secret handling (credential store, session and storage-state artifacts written to disk); impact on shared contracts (`auth_mode` consumed by `capture.mjs`, `redaction-policy.md`, the `design-spec-template.md` auth-mode wording); correction of a hard-constraint defect inherited from Phase 2 (the `--local-host` flag); new `npm run validate` check
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the binding scope; Phase 3 delivers only the login scripts and the real local-only guard
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-04-19] Methodology declaration — opt-in gating keys are read from `docs/context/methodology.md`, never inferred; the local-host declaration follows the same explicit-declaration contract (a human-authored file, never a per-run flag and never a heuristic)
  - [2026-05-06] / [2026-07-12] R-X strict — the Implementer authors zero test files; every test comes from the test pair
  - [2026-09-25] The hybrid `/code-review` pass is measured by `hybrid-code-review` Phase 5 — no task may touch `code-reviewer`, `code-reviewer-semantic` or `relay-implement` (PRD AC-16)
  - [2026-07-23] Design Spec pair and [2026-07-27] `/relay-visual-approve` — the interactivity-boundary extension is confined to `/relay-auth-setup`; the new command here is non-interactive and extends nothing
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — every script prints statuses and paths only, never a cookie, token or password value
  - "Writing pipeline artifacts under `.claude/`" — every artifact goes under `PRPs/`
  - "Relying on interactive permission prompts in the autonomous loop" — the new command is standalone and never invoked by `/relay-execute`
  - "Activating the test pair by heuristic" — no gating key is inferred; the declared-host list is an explicit human-authored file
  - "Treating `plugins/prp-core/` as active relay code" — nothing is imported from that tree
- Applicable architectural rules:
  - Command versus agent separation — the new command owns the file writes and preconditions; no new agent is introduced
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; the script template ships there and is cited with the full prefix
  - PRP artifact paths — the kit lives at `PRPs/auth/`; sessions at `PRPs/auth/.sessions/<role>.json`
  - Graceful degradation is mandatory when a precondition is absent — except the local-only guard, which is a hard failure by design
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/manual-qa-runner-auth-kit.prd.md` — Implementation Phases row 3: "Login scripts" — Goal: a reusable authenticated session per role — Success signal: `capture.mjs` renders an authenticated screen from a kit-produced storage-state file, with `capture.mjs` unchanged.

## Summary

This phase delivers the producer side of the test-auth kit's sessions. It adds (1) `plugins/relay/scripts/auth-local-guard.mjs`, the first real local-only guard in the repository: a WHATWG URL parse, exact-equality host membership, and an allowed-host list sourced from a project declaration file (`PRPs/auth/local-hosts.txt`) whose every entry must resolve to loopback before it is honoured; (2) `plugins/relay/resources/auth-login.template.mjs`, a self-contained per-role login script template that runs the guard, then the Phase 1 secrecy `ensure`, then reuses a valid session or logs in (form, API or headed-browser mode), writing a Playwright storage-state file plus an optional token artifact atomically; (3) `/relay-auth-scripts`, a new non-interactive standalone command that — only once `PRPs/auth/auth-model.md` is `APPROVED` — generates `PRPs/auth/login.config.json`, one `PRPs/auth/login-<role>.mjs` per role and `PRPs/auth/credentials.example.json`; and (4) the fix for the Phase 2 defect: `/relay-auth-setup`'s `--local-host` per-run flag is removed and its prose-only guard is replaced by a call to the real guard script. Generation lives in the separate command, not in `/relay-auth-setup`, so Phase 2's pinned AC-9 statements (the command stops at `APPROVED` and writes no script or credential) stay true. The phase also adds a `npm run validate` check that enumerates the guard sites, repoints the auth-mode wording in `design-spec-template.md`, and registers the new command on the documentation site.

## User Story

As an operator running relay's human validation gate
I want one command to generate per-role login scripts from my approved auth model, and scripts that log in once, reuse the session and re-login only on expiry
So that the visual track and the later runner get an authenticated session per role without me typing credentials into a conversation or ever risking a non-local target

## Problem Statement

`/relay-qa-report` writes, for every case, a risk level, the required state and a numbered manual step-by-step, and leaves each Manual status at `pending`. Nothing in relay executes those steps. The blocker is authentication: most cases need a logged-in user in a specific role, and relay cannot produce one. `capture.mjs` accepts a Playwright storage-state file through `auth_mode` but nothing in relay creates that file. Phase 3 narrows this to the producer of that file — and, because it is the first phase that touches the network and writes secrets, to the real local-only guard the PRD calls a permanent hard constraint. Phase 2 left that guard as prose plus a per-run `--local-host` flag that accepts any hostname.

## Solution Statement

A self-contained script template, copied per role and run by the operator at a terminal, with three guarantees enforced in code rather than prose: the guard runs first (real URL parse, exact host equality, userinfo refused, declared hosts must resolve to loopback), the Phase 1 secrecy `ensure` runs second (no secret is written before the ignore proof), and every write is an atomic tmp-then-rename. Credential values never pass through a conversation: they come from environment variables named in config, from the git-ignored `PRPs/auth/credentials.json`, or from a muted terminal prompt the script itself runs. The script locates the guard and the secrecy script through a mandatory `--plugin-root` argument (or `CLAUDE_PLUGIN_ROOT`), so there is one guard implementation and no copy to drift.

## Metadata

| Field | Value |
|-------|-------|
| Type | New feature (two scripts, one command, prompt edits, one validation check, documentation-site registration) |
| Complexity | High |
| Systems Affected | `plugins/relay/scripts/`, `plugins/relay/resources/`, `plugins/relay/commands/`, `plugins/relay/agents/auth-model-writer.md`, `plugins/relay/agents/auth-model-reviewer.md`, `scripts/validate/`, `documentation/assets/data/search-index.json`, `documentation/changelog.html` |
| Dependencies | Phase 1 (complete): `auth-kit-secrecy.mjs`, `auth-kit.gitignore`, the `auth-secrecy` check. Phase 2 (complete): `/relay-auth-setup`, the `auth-model-*` pair, `auth-model-template.md`. `playwright` resolvable at run time (declared by `plugins/relay/scripts/visual/package.json`) |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` lines 209 (row 3), 227-230 (Phase 3 details), 83, 88, 92-94 (AC-1, AC-6, AC-10, AC-11, AC-12), 98 (AC-16) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | 83-98, 183-187, 227-230 | AC-1, AC-5, AC-6, AC-9..AC-12, AC-16; the `capture.mjs`-unchanged and script-language decisions; Phase 3 scope and success signal |
| P0 | `plugins/relay/scripts/auth-kit-secrecy.mjs` | 11-35, 49-53, 137-193 | The exact modes, exit codes and `ensure` gate the login script must call rather than reimplement; the parseArgs and entry-guard shape to mirror |
| P0 | `plugins/relay/scripts/visual/capture.mjs` | 9-11, 47-54, 117-119 | The consumer contract: `storage-state:<path>` stripped by `parseAuthMode` and handed unvalidated to Playwright — the artifact must be a Playwright storage-state file at a repo-relative path; this file must stay byte-identical |
| P0 | `plugins/relay/commands/relay-auth-setup.md` | 1-36, 64-104, 122-147, 207-243 | The Phase 2 command this phase corrects: P1 prose guard and `--local-host` flag to replace, the pinned no-script statement, written-files bullet, secrecy P3 line to reuse |
| P0 | `scripts/validate/checks/auth-model-pair.test.mjs` | 116-160, 272-304, 332-348, 485-510 | The pins an edited `/relay-auth-setup` must keep (order, no-script statement, written-file set, no `design-spec` token, inert-command rule) and the two assertions the guard fix legitimately changes |
| P0 | `plugins/relay/agents/auth-model-writer.md` | 25-63 | The `local_hosts` input and hard constraint 3 that encode the old flag semantics |
| P0 | `plugins/relay/agents/auth-model-reviewer.md` | 88-104 | R-AM6, the rubric row that judges recorded hosts |
| P0 | `plugins/relay/resources/auth-model-template.md` | 55-88 | `## Login Flow`, `## Session and Token Model`, `## Local User Creation`, `## Non-Automatable Items`, `## Local Targets` — the sections the new command derives config from |
| P0 | `plugins/relay/resources/auth-kit.gitignore` | 21-31 | The exact ignore rules (`credentials.*`, `!credentials.example.*`, `.sessions/`) that decide where secrets may live; `local-hosts.txt` and `login.config.json` are deliberately on the tracked side |
| P1 | `plugins/relay/scripts/usage-metrics.mjs` | 15-25 | Script CLI shape: JSDoc Usage header, mandatory mode, `--help`, exit 2 on unknown argument |
| P1 | `plugins/relay/resources/design-spec-template.md` | 110-118, 157-175 | The `Auth mode` column and the `## Visual Acceptance Criteria` reference bullet where the additive auth-mode sentence goes; the phase-1 test pins six substrings in that bullet |
| P1 | `scripts/validate/checks/auth-secrecy.mjs` | 11-34, 82-100 | Shape of a pure-checker-plus-thin-runner validation module |
| P1 | `scripts/validate/index.mjs` | 44, 54-81 | Import and CHECKS registration forms the new check must follow exactly |
| P1 | `plugins/relay/resources/redaction-policy.md` | 70-89 | Credential-store and storage-state rules every script and command must not contradict |
| P1 | `documentation/AGENTS.md` | 239-241, 288-331 | Binding contract for any `documentation/` edit: registration rule and changelog format (read in full before Task 8) |
| P1 | `documentation/changelog.html` | 31-42 | The existing Unreleased `Added` block the new entry joins |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/usage-metrics.mjs:15-25
 * Usage:
 *   node <plugin-root>/scripts/usage-metrics.mjs materialize [--root <dir>] [--out <dir>] [--project <id>]
 *   node <plugin-root>/scripts/usage-metrics.mjs --dry-run   [--root <dir>] [--out <dir>] [--project <id>]
 *   node <plugin-root>/scripts/usage-metrics.mjs query       [--root <dir>] [--out <dir>]
 *   node <plugin-root>/scripts/usage-metrics.mjs --help
 *
 * The mode is mandatory. Unknown arguments, flags missing a value, or no mode
 * exit 2 without writing (see USAGE / parseArgs).
 *
 * No npm dependencies. Node >=18, ESM, synchronous node: builtins only.
 */
```
Copied by Tasks 1 and 2 (JSDoc Usage header, mandatory arguments, `--help`, exit 2 on bad arguments). The "No npm dependencies" sentence is NOT copied verbatim into the template: the template needs `playwright`, so its header says "No npm dependencies of its own; `playwright` is resolved lazily at run time".

```
# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:142-165
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help') {
      help = true;
    } else if (a === '--root' || a === '--path') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      i++;
      ...
    } else if (!a.startsWith('--') && mode === null && ['scaffold', 'prove', 'ensure'].includes(a)) {
      mode = a;
    } else {
      return null;
    }
  }
  if (!help && mode === null) return null;
  return { help, mode, root, paths };
```
Copied by Tasks 1 and 2 (hand-rolled parseArgs returning `null` on any bad argument, a flag whose value starts with `--`, or a missing mode; the caller prints USAGE and returns 2).

```
# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:191-193
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
```
Copied by Tasks 1 and 2 (import-safe entry guard: the module exports its functions for the test pair and only runs `main` when executed directly).

```
# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:49-53
function writeAtomic(path, content) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}
```
Copied by Task 2 (tmp-then-rename write; the template adds a `mode: 0o600` option for secret artifacts).

```
# SOURCE: plugins/relay/scripts/visual/capture.mjs:47-54
function parseAuthMode(authMode) {
  if (!authMode || authMode === 'none') return null;
  const prefix = 'storage-state:';
  if (authMode.startsWith(prefix)) {
    return authMode.slice(prefix.length);
  }
  return null;
}
```
Copied by Tasks 2 and 6 (the consumer contract: any path after `storage-state:`, handed unvalidated to `contextOptions.storageState` at `capture.mjs:117-119`; the template prints exactly `auth_mode: storage-state:<repo-relative path>` and the design-spec-template sentence states the same form).

```
# SOURCE: plugins/relay/commands/relay-auth-setup.md:92-104
### P1 — Local-only guard

When `--base-url` is given, its host must be `localhost`, `127.0.0.1`, `::1`, or
exactly a `--local-host` name. Otherwise HALT:

> FAILED_NON_LOCAL_TARGET: the host of `--base-url` (`<host>`) is not
> `localhost`, `127.0.0.1`, `::1` or a hostname declared with `--local-host`.
> `/relay-auth-setup` only ever works against a local application. Nothing has
> been read, written or requested.

This guard is a hard failure, never a warning. It performs no read of the project,
no write and no network request. This command makes no network request at all.
```
Copied by Tasks 3 and 4 (the `### P<n> — Local-only guard` heading shape and the `> FAILED_NON_LOCAL_TARGET:` blockquote HALT; Task 4 replaces the prose rule with the guard-script call and deletes the `--local-host` wording, Task 3 reuses the shape).

```
# SOURCE: plugins/relay/commands/relay-auth-setup.md:122-134
### P3 — Secrecy proven before anything is written

Run, from a fenced bash block, exactly this line:

node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs" ensure --root "<target_root>"

On any non-zero exit, HALT:

> FAILED_IGNORE_UNPROVEN: the secrecy script could not prove the
```
Copied by Task 3 (the single secrecy call, byte-identical, before any write).

```
# SOURCE: plugins/relay/commands/relay-auth-setup.md:140-146
- If it ends with `*Status: APPROVED*`, HALT:

  > FAILED_AUTH_MODEL_ALREADY_APPROVED: `PRPs/auth/auth-model.md` is already
  > APPROVED. ...
- If it is a DRAFT, skip Phase A and go straight to Phase B.
```
Copied by Task 3 (detecting approval by the trailing `*Status: APPROVED*` line; the new command inverts it: anything other than APPROVED halts with `FAILED_AUTH_MODEL_NOT_APPROVED`).

```
# SOURCE: plugins/relay/agents/auth-model-writer.md:54-57
3. **No network and no running app.** Only `Read`, `Glob` and `Grep` over the
   repository. If any input host in `base_urls` is not loopback (`localhost`,
   `127.0.0.1`, `::1`) and not in `local_hosts`, halt with
   `FAILED_NON_LOCAL_TARGET` without reading further.
```
Copied by Task 5 (the writer's hard constraint 3 is narrowed so `local_hosts` means "declared in the project declaration and verified by the guard", never a per-run value).

```
# SOURCE: plugins/relay/agents/auth-model-reviewer.md:100-102
- **R-AM6** — No credential-shaped value (password literal, JWT, private-key
  header, cookie value) appears anywhere in the file, and every host in
  `## Local Targets` is loopback or explicitly declared local.
```
Copied by Task 5 (R-AM6's host clause is made exact: loopback literal or a line of the declaration file; suffix and userinfo forms never qualify).

```
# SOURCE: plugins/relay/resources/design-spec-template.md:168-175
  entry behave byte-identically to today." This phase registers only
  the column's shape and bounded vocabulary syntax — it does NOT wire
  `design-spec-writer`, `design-spec-reviewer`, or `capture.mjs` to
  author, validate, or execute the column; that wiring is deferred to
  a future phase of `PRPs/prds/figma-visual-first-track.prd.md`. This
  is the objective, machine-checkable fidelity contract a future
  Phase 6 visual-verification loop will consume — `design-spec-reviewer`'s
  R-DS7 enforces completeness now, before that loop exists.
```
Copied by Task 6 (the additive auth-mode sentence is appended after this last sentence and before `The spec ends with`; no asserted sentence is altered).

```
# SOURCE: scripts/validate/checks/auth-secrecy.mjs:30-34
export function checkAuthSecrecy({ ignoreText, scriptText, policyText }) {
  /** @type {Finding[]} */
  const findings = [];
  /** @param {string} message @param {string} file */
  const add = (message, file) => findings.push({ message, file, line: 1 });
```
Copied by Task 7 (pure checker over file texts plus a thin zero-arg `run*Check()` that reads files with a `readOrNull` helper, returning `{ name, ok, findings }`).

```
# SOURCE: scripts/validate/index.mjs:44
import { runAuthSecrecyCheck } from './checks/auth-secrecy.mjs';
```
Copied by Task 7 (the exact import form `validate-registry.test.mjs` enforces; the registration is appended after `runAuthSecrecyCheck,` at line 80).

```
# SOURCE: documentation/changelog.html:33-42
      <h3 id="unreleased-added">Added</h3>

      <ul>
        <li><strong><code>/relay-auth-setup</code> &mdash; the auth model pair</strong> &mdash; a standalone command that
          ...
          file is written in this phase.</li>
      </ul>
```
Copied by Task 8 (a second `<li>` joins this existing `Added` list, same markup: `<strong>` title, `&mdash;` separators, `<code>` for identifiers).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/auth-local-guard.mjs` | CREATE | The real local-only guard: URL parse, exact host membership, declared-host file, loopback resolution; shared by both commands and every generated script |
| `plugins/relay/resources/auth-login.template.mjs` | CREATE | The per-role login script template: guard, secrecy ensure, reuse-or-login, form/api/headed modes, atomic secret writes |
| `plugins/relay/commands/relay-auth-scripts.md` | CREATE | Standalone, non-interactive generator of `login.config.json`, `login-<role>.mjs` and `credentials.example.json`, gated on an `APPROVED` auth model |
| `plugins/relay/commands/relay-auth-setup.md` | UPDATE | Fix the inherited defect: drop `--local-host`, call the guard script in P1, point to the generator in the final output |
| `plugins/relay/agents/auth-model-writer.md` | UPDATE | `local_hosts` and hard constraint 3 re-stated against the project declaration |
| `plugins/relay/agents/auth-model-reviewer.md` | UPDATE | R-AM6 host clause made exact (suffix and userinfo forms never qualify) |
| `plugins/relay/resources/design-spec-template.md` | UPDATE | Additive sentence: a login-gated frame's auth mode is `storage-state:PRPs/auth/.sessions/<role>.json` |
| `scripts/validate/checks/auth-local-guard-sites.mjs` | CREATE | The PRD's Should-item: a check enumerating the guard sites so none is silently missed |
| `scripts/validate/index.mjs` | UPDATE | Import and register the new check |
| `documentation/assets/data/search-index.json` | UPDATE | `registration-parity` requires `/relay-auth-scripts` in the search index |
| `documentation/changelog.html` | UPDATE | `registration-parity` requires it in the changelog text; `documentation/AGENTS.md` requires an entry for every `documentation/` change |

## NOT Building (Scope Limits)

- `/relay-qa-run`, the runner, `results.json`, evidence capture — Phase 4. Its local-only guard site is added to the new check's registry then.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md` or `plugins/relay/commands/relay-implement.md` (PRD AC-16).
- Any change to `plugins/relay/scripts/visual/capture.mjs` — its `auth_mode` contract is frozen; its header comment example (line 25, `PRPs/designs/<feature>/auth/session.json`) therefore stays as it is. The PRD's "repoint the example in `design-spec-template.md`" resolves to an additive sentence in the template, because the template holds only an `{auth mode}` placeholder, not a literal example.
- Any change to `auth-kit-secrecy.mjs`, `auth-kit.gitignore` or the `auth-secrecy` check — Phase 1 is complete; the login script and both commands call the script, they do not reimplement it.
- Any test file — the test pair owns them (R-X strict); no task or Files-to-Change row targets one.
- A new agent or any further extension of the interactivity boundary — `/relay-auth-scripts` asks the user nothing; unresolved config fields are written as `TBD - needs validation` and the script halts on them.
- Generation inside `/relay-auth-setup` — that command keeps its Phase 2 contract (stops at `APPROVED`, writes no script and no credential file).
- A non-local target of any kind, or pinning DNS for API-mode requests (residual risk recorded under Risks).
- `docs/` knowledge-base edits, a `docs/decisions.md` entry for the declaration mechanism, `documentation/reference/*.html` sections, the `docs/context/architecture.md` command counts, and a plugin version bump — docs-sync and the release step own those.
- Driving `capture.mjs` itself from the login script, or any browser-launched end-to-end in the Implementer's validation — the real authenticated capture is the Phase 5 dogfood's job; here the produced file is proven loadable by Playwright's own loader.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/scripts/auth-local-guard.mjs

**ACTION**: Delivers AC-A1 and AC-A2. Create the guard as an ESM module plus CLI. Header: `// @ts-check`, a JSDoc block with a `Usage:` section (`node <plugin-root>/scripts/auth-local-guard.mjs check --url <url> [--root <dir>]`, `... list-declared [--root <dir>]`, `... --help`), the sentence "The mode is mandatory. Unknown arguments, flags missing a value, or no mode exit 2 without writing", the exit codes (0 allowed, 1 `FAILED_NON_LOCAL_TARGET`, 2 bad arguments), and "No npm dependencies. Node >=18, ESM, `node:` builtins only." The script never writes any file. Exports: `BUILTIN_LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']`; `DECLARATION_PATH = 'PRPs/auth/local-hosts.txt'`; `parseDeclaration(text)` returning `{ hosts, ignored }` (one hostname per line, `#` comments and blank lines skipped, lowercased, de-duplicated; a line that is not a bare DNS hostname — it contains a scheme, `@`, `:`, `/` or whitespace, or fails the label pattern — goes to `ignored` and is never honoured); `isLoopbackAddress(address)` (IPv4 `127.0.0.0/8`, IPv6 `::1`, and IPv4-mapped `::ffff:127.x.x.x`); `async resolveDeclared(hosts, lookup = dns.promises.lookup)` returning only the hosts whose lookup (`{ all: true }`) yields at least one address and whose every address is loopback (a lookup error means not honoured); `isAllowedHost(hostname, allowedHosts)` (a synchronous exact `Set` membership test, exported so a browser route handler can reuse it); and `async checkTarget(input, { root, lookup })` returning `{ ok: true, origin, host, allowedHosts }` or `{ ok: false, reason, host }`. `checkTarget` algorithm, in order: (1) `new URL(input)` inside try/catch — a throw is `unparseable`; (2) `url.protocol` must be `http:` or `https:`, else `scheme`; (3) a non-empty `url.username` or `url.password` is `userinfo` — refused even when the host is local, which covers the `http://localhost@evil.com` userinfo-at trick by name (the parsed hostname there is `evil.com`, and the `user@host` form is refused regardless); (4) `host = url.hostname.toLowerCase()` — the WHATWG parser's own host component, never a substring, prefix, suffix or regex over the raw input; (5) `host` exactly equal to a `BUILTIN_LOCAL_HOSTS` member is allowed; (6) otherwise the declaration is read from `<root>/PRPs/auth/local-hosts.txt` (absent file means no declared hosts), `host` must be exactly a declared entry AND pass `resolveDeclared`, else `not-declared` or `declared-not-loopback`. The suffix case `localhost.evil.com` and the prefix case `127.0.0.1.evil.com` are refused because step 5 and step 6 are exact equality on the parsed hostname — no `startsWith`, `endsWith`, `includes`, `indexOf` or regex is ever applied to a host. `allowedHosts` in a success result is a `Set` of the builtin names plus the verified declared hosts. CLI: `check` prints `LOCAL_TARGET_OK: <origin>` to stdout and exits 0, or prints `FAILED_NON_LOCAL_TARGET: <reason> (host: <host>)` to stderr and exits 1; `list-declared` prints each verified declared hostname on its own line and exits 0; `--help` prints USAGE and exits 0; anything else exits 2 with USAGE on stderr. A declared-host declaration is read only from the project file — there is no `--local-host` flag and no environment-variable source. Keep the import-safe entry guard.
**MIRROR**: `# SOURCE: plugins/relay/scripts/usage-metrics.mjs:15-25`, `# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:142-165`, `# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:191-193`.
**VALIDATE**:
```bash
set -euo pipefail
node --check plugins/relay/scripts/auth-local-guard.mjs
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path");
const g=path.resolve("plugins/relay/scripts/auth-local-guard.mjs");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"guard-"));
const done=(code,msg)=>{fs.rmSync(tmp,{recursive:true,force:true});(code?console.error:console.log)(msg);process.exit(code)};
fs.mkdirSync(path.join(tmp,"PRPs","auth"),{recursive:true});
fs.writeFileSync(path.join(tmp,"PRPs","auth","local-hosts.txt"),"# declared hosts\nnonexistent-host.invalid\nevil.example\n");
const run=(args)=>cp.spawnSync(process.execPath,[g,...args],{encoding:"utf8"});
const bad=[];
for(const u of ["http://localhost:3000","http://127.0.0.1:3000","http://[::1]:3000"]){const r=run(["check","--root",tmp,"--url",u]);if(r.status!==0||!String(r.stdout).includes("LOCAL_TARGET_OK"))bad.push("expected LOCAL_TARGET_OK for "+u+", got exit "+r.status)}
for(const u of ["http://localhost@evil.example","http://user:pw@localhost:3000","http://localhost.evil.example","http://127.0.0.1.evil.example","http://evil.example","http://nonexistent-host.invalid","ftp://localhost/","not a url"]){const r=run(["check","--root",tmp,"--url",u]);if(r.status!==1||!String(r.stderr).includes("FAILED_NON_LOCAL_TARGET"))bad.push("expected a named refusal for "+u+", got exit "+r.status)}
for(const [args,code] of [[["check","--root",tmp],2],[["check","--root",tmp,"--url","http://localhost","--local-host","evil.example"],2],[["bogus"],2],[[],2],[["--help"],0]]){const r=run(args);if(r.status!==code)bad.push("args "+JSON.stringify(args)+" expected exit "+code+", got "+r.status)}
const listed=run(["list-declared","--root",tmp]);if(listed.status!==0||/evil\.example|nonexistent-host/.test(String(listed.stdout)))bad.push("list-declared honoured an unverified host");
const files=fs.readdirSync(path.join(tmp,"PRPs","auth"));if(files.join()!=="local-hosts.txt")bad.push("the guard wrote a file: "+files.join());
const src=fs.readFileSync(g,"utf8");
if(/(startsWith|endsWith|includes|indexOf)\(\s*[\x22\x27`](localhost|127\.)/.test(src))bad.push("substring host test in the guard source");
for(const t of ["new URL(","hostname","FAILED_NON_LOCAL_TARGET","PRPs/auth/local-hosts.txt","userinfo"])if(!src.includes(t))bad.push("guard source lacks "+t);
bad.length?done(1,"FAIL: "+bad.join(" | ")):done(0,"PASS: guard contract");
'
```

### Task 2: CREATE plugins/relay/resources/auth-login.template.mjs

**ACTION**: Delivers AC-A3, AC-A5, AC-A6, AC-A7 and AC-A8 (and the script-side slice of AC-A1). Create the self-contained template. It is copied verbatim per role by `/relay-auth-scripts`, with exactly one substitution: every occurrence of the literal `__RELAY_ROLE__` is replaced by the role slug; the template declares `const ROLE = "__RELAY_ROLE__";` once. Header: `// @ts-check`, JSDoc `Usage:` (`node PRPs/auth/login-<role>.mjs --plugin-root <dir> [--root <dir>] [--force]` and `--help`), exit codes (0 `SESSION_REUSED` or `SESSION_CREATED`, 1 a named `FAILED_*` halt, 2 bad arguments), and "No npm dependencies of its own; `playwright` is resolved lazily at run time". `--plugin-root` is mandatory (the `CLAUDE_PLUGIN_ROOT` environment variable is the only alternative source); missing both exits 2 without writing. `--root` defaults to the current directory. An invalid role (not `^[a-z0-9][a-z0-9-]{0,39}$`, including the unsubstituted placeholder when run directly for anything but `--help`) exits 2. Config is read from `<root>/PRPs/auth/login.config.json`: `{ "baseUrl": string, "roles": { "<role>": { "mechanism": "form" | "api" | "headed", "loginPath": string | null, "form": { "usernameSelector", "passwordSelector", "submitSelector" } | null, "api": { "path", "method", "usernameField", "passwordField", "tokenPath": string | null } | null, "probe": { "path", "method" }, "sessionCookie": string | null, "maxAgeMinutes": number, "credentials": { "usernameEnv": string | null, "passwordEnv": string | null }, "userCreation": { "command": string[] | null } } } }`. A missing required field for the role's mechanism, or any value equal to the literal `TBD - needs validation`, halts with `FAILED_LOGIN_CONFIG_INCOMPLETE` naming the field (never a guess). Run order, each step before the next: (1) `// GUARD-SITE` — dynamically import `<pluginRoot>/scripts/auth-local-guard.mjs` (a missing or unimportable module halts `FAILED_GUARD_UNAVAILABLE`, fail closed) and `await checkTarget(baseUrl, { root })`; a refusal prints the guard's `FAILED_NON_LOCAL_TARGET` line and exits 1 having made no request and no write; (2) `// SECRECY-SITE` — `spawnSync(process.execPath, [<pluginRoot>/scripts/auth-kit-secrecy.mjs, "ensure", "--root", root, "--path", "PRPs/auth/credentials.json", "--path", "PRPs/auth/.sessions/<role>.json", "--path", "PRPs/auth/.sessions/<role>.token.json"])`; any non-zero exit relays the script's stderr (`FAILED_IGNORE_UNPROVEN`) and exits 1 having written nothing; (3) reuse check, unless `--force`: an existing `PRPs/auth/.sessions/<role>.json` is reusable only when it parses as a Playwright storage-state object (`cookies` and `origins` arrays), the configured `sessionCookie` (when set) is present and unexpired with a 60-second margin, the file is younger than `maxAgeMinutes`, AND a probe request to `baseUrl + probe.path` issued through a Playwright `request` context loaded with that storage state and `maxRedirects: 0` returns a 2xx status — a 3xx, 401 or 403 means expired; when reusable, print `SESSION_REUSED: PRPs/auth/.sessions/<role>.json` and the line `auth_mode: storage-state:PRPs/auth/.sessions/<role>.json`, touch nothing, exit 0; (4) otherwise obtain credentials in this order: the environment variables NAMED in `credentials` (config holds names only), then the `<role>` entry of `PRPs/auth/credentials.json`, then the project's own `userCreation.command` (run once with `spawnSync` and an argv array, `shell: false`, stdout and stderr NOT captured, exit status only, then re-resolve from the two sources above), then — only when `process.stdin.isTTY` — a terminal prompt written to stderr with the password read without echo, persisted to `credentials.json` (mode `0o600`, through the write helper) only when typed; with none available halt `FAILED_CREDENTIALS_UNAVAILABLE`; (5) log in by mechanism — `api`: `request.newContext({ baseURL })`, POST the username and password fields, require a 2xx, read the token at `tokenPath` when set, then `context.storageState()` (cookies become the session); `form`: launch headless Chromium, install `context.route("**/*", ...)` that calls `isAllowedHost` from the guard on every request URL (allowing only `data:`, `about:` and `blob:` without a check) and aborts any other host, fill the three selectors, submit, wait up to 15 seconds for the path to leave `loginPath`; `headed`: require `process.stdin.isTTY` (else halt `FAILED_INTERACTIVE_LOGIN_REQUIRED` BEFORE resolving or importing Playwright), launch Chromium with `headless: false`, open `baseUrl + loginPath`, print "Complete the login in the browser, then press Enter here", wait for Enter, and save the state only when the final `page.url()` passes `checkTarget` — otherwise halt `FAILED_NON_LOCAL_TARGET` and save nothing (the operator's own navigation to an identity provider is theirs; the script's own traffic stays local); a login that yields no session halts `FAILED_LOGIN_REJECTED`; (6) `// WRITE-SITE` — write `<role>.json` (and `<role>.token.json` as `{ "token", "expires_at", "obtained_at" }` when a token was read; `expires_at` from a JWT `exp` claim when the token is a JWT, else `maxAgeMinutes`) through ONE helper that does a tmp-then-rename write with `mode: 0o600`, creates `.sessions/` first, and is the only place a secret file is written; then print `SESSION_CREATED: PRPs/auth/.sessions/<role>.json` and the `auth_mode: storage-state:...` line, exit 0. Playwright resolution (lazy, after the guard and secrecy steps and after the headed TTY check): try `createRequire(<root>/package.json)("playwright")`, then `createRequire(<pluginRoot>/scripts/visual/package.json)("playwright")`, else halt `FAILED_PLAYWRIGHT_UNAVAILABLE` naming `npm install` in `plugins/relay/scripts/visual/`; never a static top-level `import ... from "playwright"`. Secrecy of output: stdout and stderr carry statuses and repo-relative paths only — never a cookie value, token, password, username or response body. The three marker comments `// GUARD-SITE`, `// SECRECY-SITE` and `// WRITE-SITE` each appear exactly once, in that order. Cite no packaged resource by bare basename. Keep the import-safe entry guard and the parseArgs shape.
**MIRROR**: `# SOURCE: plugins/relay/scripts/usage-metrics.mjs:15-25`, `# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:142-165`, `# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:191-193`, `# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:49-53`, `# SOURCE: plugins/relay/scripts/visual/capture.mjs:47-54`.
**VALIDATE**:
```bash
set -euo pipefail
node --check plugins/relay/resources/auth-login.template.mjs
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path");
const repo=process.cwd();
const plugin=path.join(repo,"plugins","relay");
const tpl=fs.readFileSync(path.join(plugin,"resources","auth-login.template.mjs"),"utf8");
const bad=[];
for(const t of ["__RELAY_ROLE__","// GUARD-SITE","// SECRECY-SITE","// WRITE-SITE","auth-local-guard.mjs","auth-kit-secrecy.mjs","FAILED_NON_LOCAL_TARGET","FAILED_IGNORE_UNPROVEN","FAILED_CREDENTIALS_UNAVAILABLE","FAILED_INTERACTIVE_LOGIN_REQUIRED","FAILED_LOGIN_CONFIG_INCOMPLETE","FAILED_PLAYWRIGHT_UNAVAILABLE","SESSION_REUSED","SESSION_CREATED","renameSync","0o600"])if(!tpl.includes(t))bad.push("template lacks "+t);
const at=(s)=>tpl.indexOf(s);
if(!(at("// GUARD-SITE")<at("// SECRECY-SITE")&&at("// SECRECY-SITE")<at("// WRITE-SITE")))bad.push("guard, secrecy, write ordering violated");
for(const m of ["// GUARD-SITE","// SECRECY-SITE","// WRITE-SITE"])if(tpl.split(m).length!==2)bad.push(m+" must appear exactly once");
if(/^import[^\n]*from\s*[\x22\x27]playwright[\x22\x27]/m.test(tpl))bad.push("static playwright import");
const base=fs.mkdtempSync(path.join(os.tmpdir(),"auth-tpl-"));
const mk=(git)=>{const root=fs.mkdtempSync(path.join(base,"p-"));if(git)cp.execFileSync("git",["init","-q"],{cwd:root});const a=path.join(root,"PRPs","auth");fs.mkdirSync(a,{recursive:true});return{root,a}};
const cfg=(baseUrl)=>JSON.stringify({baseUrl,roles:{qa:{mechanism:"api",api:{path:"/api/login",method:"POST",usernameField:"email",passwordField:"password",tokenPath:null},probe:{path:"/api/me",method:"GET"},sessionCookie:null,maxAgeMinutes:60,credentials:{usernameEnv:"RELAY_UNSET_USER",passwordEnv:"RELAY_UNSET_PASS"},userCreation:{command:null}}}});
const script=(a)=>{const p=path.join(a,"login-qa.mjs");fs.writeFileSync(p,tpl.split("__RELAY_ROLE__").join("qa"));return p};
const env=Object.assign({},process.env);delete env.CLAUDE_PLUGIN_ROOT;delete env.RELAY_UNSET_USER;delete env.RELAY_UNSET_PASS;
const run=(p,args,cwd)=>cp.spawnSync(process.execPath,[p,...args],{encoding:"utf8",env,cwd});
const leaked=(a)=>fs.existsSync(path.join(a,".sessions"))||fs.existsSync(path.join(a,"credentials.json"));
{const {root,a}=mk(true);fs.writeFileSync(path.join(a,"login.config.json"),cfg("http://localhost.evil.example:3000"));const p=script(a);
 let r=run(p,["--root",root,"--plugin-root",plugin],root);if(r.status!==1||!String(r.stderr).includes("FAILED_NON_LOCAL_TARGET"))bad.push("a non-local baseUrl was not refused by name (exit "+r.status+")");if(leaked(a))bad.push("a non-local refusal wrote a secret path");
 r=run(p,["--root",root],root);if(r.status!==2)bad.push("a missing --plugin-root must exit 2, got "+r.status);
 r=run(p,["--bogus"],root);if(r.status!==2)bad.push("an unknown argument must exit 2, got "+r.status);
 r=run(p,["--help"],root);if(r.status!==0||!String(r.stdout).includes("Usage"))bad.push("--help must exit 0 with a Usage block");}
{const {root,a}=mk(false);fs.writeFileSync(path.join(a,"login.config.json"),cfg("http://127.0.0.1:1"));const p=script(a);
 const r=run(p,["--root",root,"--plugin-root",plugin],root);if(r.status!==1||!String(r.stderr).includes("FAILED_IGNORE_UNPROVEN"))bad.push("an unprovable ignore did not halt by name (exit "+r.status+")");if(leaked(a))bad.push("an unproven-ignore halt wrote a secret path");}
fs.rmSync(base,{recursive:true,force:true});
if(bad.length){console.error("FAIL: "+bad.join(" | "));process.exit(1)}
console.log("PASS: login template contract")
'
```

### Task 3: CREATE plugins/relay/commands/relay-auth-scripts.md

**ACTION**: Delivers AC-A4, and the generation-side slices of AC-A3 and AC-A8. Create the non-interactive standalone generator in the standalone body order. Frontmatter: a single-line single-quoted `description` (generates per-role login scripts, `login.config.json` and `credentials.example.json` from an APPROVED `PRPs/auth/auth-model.md`; writes no credential and creates no session; non-interactive; never invoked by `/relay-execute`) and `argument-hint: [--role <role>]...`, and NO `name:` key. Then `# /relay-auth-scripts`, `**Arguments:** $ARGUMENTS`, `## Your mission` (generate one login script per role from the approved model; state that this command creates no session, stores no credential value, never asks the user a question, and that generation is gated on the auth model being APPROVED — the Phase 2 command that produces the model stops at APPROVED and is referred to only as "the command that produces `PRPs/auth/auth-model.md`", never by name), `See:` bullets using only `${CLAUDE_PLUGIN_ROOT}/...` paths (`resources/auth-login.template.mjs`, `scripts/auth-local-guard.mjs`, `scripts/auth-kit-secrecy.mjs`, `resources/auth-model-template.md`, `resources/redaction-policy.md`), `## Decision Gate (before any action)` with the six-line block, and `## Parse arguments`: optional repeatable `--role <role>` restricting generation to named roles; any other argument HALTs with a usage blockquote. `## Preconditions`, in this order: **P1 Decision Gate sources readable** — the byte-exact shared pattern (see `relay-auth-setup.md:114-120` shape) adapted with `/relay-auth-scripts` and "No script has been written."; **P2 The auth model is APPROVED** — `PRPs/auth/auth-model.md` must exist and end with `*Status: APPROVED*`, else HALT `FAILED_AUTH_MODEL_NOT_APPROVED` ("no login script and no credential file is generated before the auth model is approved"), nothing written; **P3 Local-only guard** — read every URL under the model's `## Local Targets`; none found HALTs `FAILED_LOCAL_TARGET_MISSING`; for each, run from a fenced bash block exactly this line: `node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" check --root "<target_root>" --url "<base-url>"`; any non-zero exit HALTs with a blockquote beginning `FAILED_NON_LOCAL_TARGET` naming the guard's stderr, stating the guard is a hard failure never a warning, and that nothing was written or requested; state that the declared local hostnames come only from `PRPs/auth/local-hosts.txt` and that there is no flag for them; **P4 Secrecy proven before anything is written** — run exactly `node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs" ensure --root "<target_root>"` and on non-zero HALT `FAILED_IGNORE_UNPROVEN` (nothing further written). `## Phase A — Generate`: derive, for each role in the model's `## Role and Permission Matrix` (slug: lowercase kebab, de-duplicated, matching `^[a-z0-9][a-z0-9-]{0,39}$`; `--role` filters), a config entry using the exact schema documented in the template's header: `mechanism` is `headed` when the role is named under `## Non-Automatable Items` for SSO or MFA, `api` when `## Login Flow` names a scriptable API login endpoint, otherwise `form`; every other field is filled only from evidence in the model and is otherwise the literal `TBD - needs validation` (never a guessed selector or path); `credentials` holds environment-variable NAMES only, taken from the model's `## Session and Token Model` when it names them, else null; `userCreation.command` is set only when `## Local User Creation` names a declared command for the role, else null. Merge into `PRPs/auth/login.config.json` additively — an existing role entry is never overwritten and an existing `baseUrl` is kept; write `baseUrl` from the first `## Local Targets` URL when absent. For each role write `PRPs/auth/login-<role>.mjs` by `Read`-ing `${CLAUDE_PLUGIN_ROOT}/resources/auth-login.template.mjs` and replacing every occurrence of `__RELAY_ROLE__` with the slug — no other substitution and no edit; an existing script is skipped and reported, never overwritten. Write `PRPs/auth/credentials.example.json` with placeholder values only (`{ "<role>": { "username": "<placeholder>", "password": "<placeholder>" } }`) when absent. Use the `Write` tool (heredocs through Bash do not work in this environment). `## Final output surface`: per role, the exact run line `node PRPs/auth/login-<role>.mjs --plugin-root "${CLAUDE_PLUGIN_ROOT}"` (to be run by the operator at their own terminal, where any credential prompt happens), the list of config fields still `TBD - needs validation` per role, the `auth_mode: storage-state:PRPs/auth/.sessions/<role>.json` value the visual track consumes, and an explicit statement that no session and no credential value was created and that the human validation gate is unchanged. Close with `## Constraints (hard rules)` (nothing under `.claude/`; "Never invoked by `/relay-execute`."; the only files written are `PRPs/auth/login.config.json`, `PRPs/auth/login-<role>.mjs` and `PRPs/auth/credentials.example.json`; never write `PRPs/auth/credentials.json`, anything under `PRPs/auth/.sessions/` or any `*.storage-state.json` or `*.session.json`; no network request; no credential value enters the conversation — secret files are referenced by path only; never `Task`-dispatch anything; never ask the user a question) and `## What you do NOT do`. The file must not contain the token `design-spec`, must not name the command that produces the auth model, and must not mention the not-yet-existing runner command.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-auth-setup.md:92-104`, `# SOURCE: plugins/relay/commands/relay-auth-setup.md:122-134`, `# SOURCE: plugins/relay/commands/relay-auth-setup.md:140-146`.
**VALIDATE**:
```bash
set -euo pipefail
node -e '
const t=require("fs").readFileSync("plugins/relay/commands/relay-auth-scripts.md","utf8");
const GUARD="node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs\" check --root \"<target_root>\" --url \"<base-url>\"";
const SECRECY="node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs\" ensure --root \"<target_root>\"";
const need=["# /relay-auth-scripts","argument-hint:","I cannot emit the Decision Gate evidence block without reading","FAILED_AUTH_MODEL_NOT_APPROVED","FAILED_LOCAL_TARGET_MISSING","FAILED_NON_LOCAL_TARGET","FAILED_IGNORE_UNPROVEN",GUARD,SECRECY,"${CLAUDE_PLUGIN_ROOT}/resources/auth-login.template.mjs","__RELAY_ROLE__","TBD - needs validation","credentials.example.json","login.config.json","--plugin-root","PRPs/auth/local-hosts.txt","Never invoked by `/relay-execute`","## Phase A","## Final output surface"];
const miss=need.filter(s=>!t.includes(s));if(miss.length){console.error("FAIL: command missing: "+miss.join(" | "));process.exit(1)}
const forbidden=[["design-spec","design-spec token (banned in command files)"],["relay-auth-setup","reference to the auth-model command by name (inert-command pin)"],["/relay-qa-run","mention of the not-yet-existing runner"],[".claude/PRPs","a .claude/PRPs path"],["subagent_type","a Task dispatch"]];
for(const [s,why] of forbidden)if(t.includes(s)){console.error("FAIL: command contains "+why);process.exit(1)}
if(/^name:/m.test(t.split("---")[1]||"")){console.error("FAIL: frontmatter must not carry a name key");process.exit(1)}
const i=(s)=>t.indexOf(s);
if(!(i("I cannot emit the Decision Gate evidence block")<i("FAILED_AUTH_MODEL_NOT_APPROVED")&&i("FAILED_AUTH_MODEL_NOT_APPROVED")<i(GUARD)&&i(GUARD)<i(SECRECY)&&i(SECRECY)<i("## Phase A"))){console.error("FAIL: sources, approval, guard, secrecy, then generation ordering violated");process.exit(1)}
console.log("PASS: generator command contract and ordering")
'
```

### Task 4: UPDATE plugins/relay/commands/relay-auth-setup.md

**ACTION**: Delivers AC-A1, AC-A2 and AC-A4 (command side). Fix the inherited defect with narrow edits, preserving every other Phase 2 pin. (a) `argument-hint` becomes `[--base-url <local-url>]`. (b) `## Parse arguments`: delete the `--local-host <hostname>` bullet; the usage HALT becomes `/relay-auth-setup [--base-url <local-url>]` (so `--local-host` is now an unrecognized argument); add one sentence that a project declares a local development hostname, beyond the built-in loopback names, by listing it in the tracked file `PRPs/auth/local-hosts.txt` (one bare hostname per line), and that a per-run flag can never add a host. (c) Decision Gate paragraph (line 64-65): the guard is "evaluated first, on the argument text alone, before any file of the project is read, except the hostname declaration `PRPs/auth/local-hosts.txt`". (d) Rewrite P1 under the same `### P1 — Local-only guard` heading: when `--base-url` is given, run from a fenced bash block exactly `node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" check --root "<target_root>" --url "<base-url>"`; any non-zero exit HALTs with the same `> FAILED_NON_LOCAL_TARGET:` blockquote shape (the message now says the host, as parsed from the URL, is not `localhost`, `127.0.0.1`, `::1` or a hostname declared in `PRPs/auth/local-hosts.txt` that resolves to loopback; it names the userinfo form `http://localhost@evil.com` and the suffix form `localhost.evil.com` as refused by name); keep the sentences "This guard is a hard failure, never a warning." and a replacement for the old read/write/request sentence: "It performs no write, no network request and no read of the project other than the hostname declaration `PRPs/auth/local-hosts.txt`." On success the command records the guard's `LOCAL_TARGET_OK: <origin>` origin as the normalized base URL and, from `node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" list-declared --root "<target_root>"`, the verified declared hosts. (e) Phase A execution context: `base_urls` is the normalized origin the guard printed (empty when absent); `local_hosts` is the `list-declared` output. (f) `See:` gains a bullet for `${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs` — the guard script this command calls, never reimplements. (g) `## Final output surface`: after the existing statement that no login script and no credential file has been written, add one sentence that `/relay-auth-scripts` generates the per-role login scripts from the approved model. Do NOT touch: the mission sentence "This command writes no login script and no credential file.", the written-files constraint bullet (still exactly `PRPs/auth/.gitignore`, `PRPs/auth/auth-model.md`, `PRPs/auth/auth-model-review.jsonl`), P2 to P4 and Phases A and B structure, the `date -u` capture, and never introduce the token `design-spec` or any `PRPs/auth/credentials` or `PRPs/auth/.sessions` path text.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-auth-setup.md:92-104`.
**VALIDATE**:
```bash
set -euo pipefail
node -e '
const t=require("fs").readFileSync("plugins/relay/commands/relay-auth-setup.md","utf8").replace(/\r\n/g,"\n");
const flat=t.replace(/\s+/g," ");
const GUARD="node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs\" check --root \"<target_root>\" --url \"<base-url>\"";
const LIST="node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs\" list-declared --root \"<target_root>\"";
const SECRECY="node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs\" ensure --root \"<target_root>\"";
const bad=[];
for(const s of [GUARD,LIST,"PRPs/auth/local-hosts.txt","localhost.evil.com","http://localhost@evil.com","/relay-auth-scripts","This guard is a hard failure, never a warning.","This command writes no login script and no credential file.","Never flip without the user\x27s own explicit affirmative reply.","Never `Task`-dispatch either role.","date -u +%Y-%m-%dT%H:%M:%SZ"])if(!flat.includes(s))bad.push("missing: "+s);
if(t.includes("--local-host"))bad.push("the per-run --local-host flag is still present");
if(t.includes("design-spec"))bad.push("design-spec token");
if(t.includes("/relay-qa-run"))bad.push("runner mention");
if(/PRPs\/auth\/(credentials|\.sessions)/.test(t))bad.push("a secret path text");
const order=["> FAILED_NON_LOCAL_TARGET:","> I cannot emit the Decision Gate evidence block without reading",SECRECY,"> FAILED_IGNORE_UNPROVEN:","> FAILED_AUTH_MODEL_ALREADY_APPROVED:","## Phase A","## Phase B"].map(n=>t.indexOf(n));
if(order.some(v=>v===-1)||order.some((v,i)=>i>0&&v<=order[i-1]))bad.push("precondition ordering violated");
if(t.indexOf(GUARD)===-1||t.indexOf(GUARD)>t.indexOf("> I cannot emit the Decision Gate evidence block without reading"))bad.push("the guard call must precede the Decision Gate source read");
const bullet=(flat.match(/\*\*The only files written\*\*.*?- \*\*Never flip/)||[""])[0];
const written=[...new Set(bullet.match(/PRPs\/auth\/[\w.\-]+/g)||[])].sort().join(",");
if(written!=="PRPs/auth/.gitignore,PRPs/auth/auth-model-review.jsonl,PRPs/auth/auth-model.md")bad.push("written-file set changed: "+written);
if(bad.length){console.error("FAIL: "+bad.join(" | "));process.exit(1)}
console.log("PASS: /relay-auth-setup guard fix with every Phase 2 pin preserved")
'
```

### Task 5: UPDATE plugins/relay/agents/auth-model-writer.md and plugins/relay/agents/auth-model-reviewer.md

**ACTION**: Delivers AC-A2 (agent side). Two narrow prose edits, nothing else. Writer: (a) the `local_hosts` input bullet (lines 33-34) now reads that it is the list of hostnames declared in the project's `PRPs/auth/local-hosts.txt` that the command's guard verified resolve to loopback — possibly empty; never a per-run value. (b) Hard constraint 3 (lines 54-57): keep "No network and no running app. Only `Read`, `Glob` and `Grep` over the repository." and re-state the halt: a host that appears in `base_urls` or that you are about to record under `## Local Targets` counts as local only when it is exactly `localhost`, `127.0.0.1`, `::1`, or exactly an entry of `local_hosts`; a host that merely contains or begins with a local name (`localhost.evil.com`) or carries userinfo (`http://localhost@evil.com`) is not local; on any other host halt with `FAILED_NON_LOCAL_TARGET` without reading further. Keep `tools: Read, Write, Edit, Glob, Grep` (no Bash) and every other constraint byte-identical. Reviewer: R-AM6 (lines 100-102) keeps its credential-shaped-value clause verbatim and its host clause becomes: every host in `## Local Targets` is exactly `localhost`, `127.0.0.1`, `::1`, or exactly a line of `PRPs/auth/local-hosts.txt`; a suffix form such as `localhost.evil.com` or a userinfo form such as `http://localhost@evil.com` fails the row. Keep `tools: Read, Edit, Write`, every R-AM id, and do not introduce any `date -u` text.
**MIRROR**: `# SOURCE: plugins/relay/agents/auth-model-writer.md:54-57`, `# SOURCE: plugins/relay/agents/auth-model-reviewer.md:100-102`.
**VALIDATE**:
```bash
set -euo pipefail
node -e '
const fs=require("fs");
const w=fs.readFileSync("plugins/relay/agents/auth-model-writer.md","utf8").replace(/\r\n/g,"\n");
const r=fs.readFileSync("plugins/relay/agents/auth-model-reviewer.md","utf8").replace(/\r\n/g,"\n");
const fw=w.replace(/\s+/g," "),fr=r.replace(/\s+/g," ");
const bad=[];
for(const s of ["PRPs/auth/local-hosts.txt","localhost.evil.com","http://localhost@evil.com","FAILED_NON_LOCAL_TARGET","Record an environment variable by NAME only","Write only `auth_model_path`.","Never `Read`","Never write the `*Approved:` line"])if(!fw.includes(s))bad.push("writer missing: "+s);
for(const s of ["PRPs/auth/local-hosts.txt","localhost.evil.com","http://localhost@evil.com","Never read a secret path.","**Default context is `subagent`**","BOTH the rubric passing AND the user\x27s own explicit affirmative reply"])if(!fr.includes(s))bad.push("reviewer missing: "+s);
const tools=(t)=>((t.match(/^tools:\s*(.*)$/m)||[,""])[1]).trim();
if(tools(w)!=="Read, Write, Edit, Glob, Grep")bad.push("writer tools changed: "+tools(w));
if(tools(r)!=="Read, Edit, Write")bad.push("reviewer tools changed: "+tools(r));
if(r.includes("date -u"))bad.push("reviewer must stay clockless");
const ids=[...r.matchAll(/^- \*\*(R-AM\d+)\*\*/gm)].map(m=>m[1]).join(",");
if(ids!=="R-AM1,R-AM2,R-AM3,R-AM4,R-AM5,R-AM6,R-AM7")bad.push("reviewer rubric ids changed: "+ids);
if(/--local-host/.test(w)||/--local-host/.test(r))bad.push("the retired --local-host flag is still mentioned");
if(bad.length){console.error("FAIL: "+bad.join(" | "));process.exit(1)}
console.log("PASS: writer and reviewer host rules")
'
```

### Task 6: UPDATE plugins/relay/resources/design-spec-template.md

**ACTION**: Delivers AC-A11. Append one sentence to the `## Visual Acceptance Criteria` bullet of the `### Section reference` section, after its final sentence ("...R-DS7 enforces completeness now, before that loop exists.") and before the paragraph beginning "The spec ends with": for a frame behind a login, the `Auth mode` value is `storage-state:PRPs/auth/.sessions/<role>.json`, the file the test-auth kit's login script for that role writes (the path is handed to `capture.mjs` unchanged, and it is the kit's producer that makes the value meaningful); a frame needing no login uses `none`. Do not touch the table header row, the `{auth mode}` placeholder row, any sentence the phase-1 test pins (the eight-field completeness scope, the `Interaction` optionality and the byte-identity guarantee, the "does NOT wire" sentence), or any other section. Do not edit `plugins/relay/scripts/visual/capture.mjs` — its header comment example stays as it is.
**MIRROR**: `# SOURCE: plugins/relay/resources/design-spec-template.md:168-175`, `# SOURCE: plugins/relay/scripts/visual/capture.mjs:47-54`.
**VALIDATE**:
```bash
set -euo pipefail
node -e '
const t=require("fs").readFileSync("plugins/relay/resources/design-spec-template.md","utf8").replace(/\r\n/g,"\n");
const flat=t.replace(/\s+/g," ");
const need=["storage-state:PRPs/auth/.sessions/<role>.json","all eight original fields present and non-empty","this completeness scope is UNCHANGED by the 9th,","frames without an `Interaction` entry behave byte-identically to today.","R-DS7 enforces completeness now, before that loop exists.","| {node-id} | {route} | {preconditions} | {auth mode} |"];
const miss=need.filter(s=>!flat.includes(s));if(miss.length){console.error("FAIL: template missing: "+miss.join(" | "));process.exit(1)}
if(!(t.indexOf("storage-state:PRPs/auth/.sessions/<role>.json")<t.indexOf("The spec ends with")&&t.indexOf("storage-state:PRPs/auth/.sessions/<role>.json")>t.indexOf("R-DS7 enforces completeness now")))
{console.error("FAIL: the sentence must sit after the Visual Acceptance Criteria bullet and before The spec ends with");process.exit(1)}
console.log("PASS: design-spec-template auth-mode wording")
'
git diff --quiet d867142fa5fb80cb02d874ffbf05a8ac0a74f421 -- plugins/relay/scripts/visual/capture.mjs
```

### Task 7: CREATE scripts/validate/checks/auth-local-guard-sites.mjs and UPDATE scripts/validate/index.mjs

**ACTION**: Delivers AC-A10. This is the PRD's Should-item and it lands in this phase: this is the first phase with more than one guard site (the guard script, the script template, two commands), and the PRD's own risk row is that the guard gets implemented at one site and missed at another — cheapest to pin while the sites are few, and Phase 4 extends the registry with the runner as one more entry. Create the check module: `// @ts-check`, a header comment, `const CHECK_NAME = 'auth-local-guard-sites'`, an exported `GUARD_SITES` registry (array of `{ file, required: string[], forbidden: string[] }`), an exported pure `checkAuthLocalGuardSites({ files })` taking a `Record<string, string | null>` of file texts and returning `{ name, ok, findings }` where each finding is `{ message, file, line }`, and an exported zero-arg `runAuthLocalGuardSitesCheck()` that reads the files with a `readOrNull` helper. Registry entries: `plugins/relay/scripts/auth-local-guard.mjs` requires `new URL(`, `hostname`, `FAILED_NON_LOCAL_TARGET`, `PRPs/auth/local-hosts.txt`, `userinfo`; `plugins/relay/resources/auth-login.template.mjs` requires `auth-local-guard.mjs`, `auth-kit-secrecy.mjs`, `FAILED_NON_LOCAL_TARGET` and the three markers `// GUARD-SITE`, `// SECRECY-SITE`, `// WRITE-SITE` in that order, each exactly once (an ordering or multiplicity breach is a finding); `plugins/relay/commands/relay-auth-setup.md` and `plugins/relay/commands/relay-auth-scripts.md` each require `auth-local-guard.mjs` and `FAILED_NON_LOCAL_TARGET`; `relay-auth-setup.md` and both agents `auth-model-writer.md` and `auth-model-reviewer.md` forbid `--local-host`; `plugins/relay/resources/auth-kit.gitignore` forbids `local-hosts` and `login.config.json` (the declaration and the config belong to the tracked side). A missing file is a finding. Keep every literal `FAILED_NON_LOCAL_TARGET`-style string anchored to the files this phase authors so Phase 4 can append its own entry. In `scripts/validate/index.mjs`, add `import { runAuthLocalGuardSitesCheck } from './checks/auth-local-guard-sites.mjs';` immediately after the existing `runAuthSecrecyCheck` import (line 44) and append `runAuthLocalGuardSitesCheck,` as the last CHECKS entry, after `runAuthSecrecyCheck,`. Never replace an existing entry. Do not author any `*.test.mjs` — the corpus test for this module comes from the test pair, and `validate-registry.test.mjs` already enforces the import and registration forms.
**MIRROR**: `# SOURCE: scripts/validate/checks/auth-secrecy.mjs:30-34`, `# SOURCE: scripts/validate/index.mjs:44`.
**VALIDATE**:
```bash
set -euo pipefail
node --check scripts/validate/checks/auth-local-guard-sites.mjs
grep -q "import { runAuthLocalGuardSitesCheck } from './checks/auth-local-guard-sites.mjs';" scripts/validate/index.mjs
grep -q "^  runAuthLocalGuardSitesCheck,$" scripts/validate/index.mjs
node --input-type=module -e '
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(process.cwd() + "/scripts/validate/checks/auth-local-guard-sites.mjs").href);
const real = m.runAuthLocalGuardSitesCheck();
if (!real.ok) { console.error("FAIL: the real tree violates the guard-site registry: " + JSON.stringify(real.findings)); process.exit(1); }
const files = Object.fromEntries(m.GUARD_SITES.map((s) => [s.file, fs.readFileSync(s.file, "utf8")]));
const tpl = "plugins/relay/resources/auth-login.template.mjs";
const setup = "plugins/relay/commands/relay-auth-setup.md";
const cases = [
  ["a removed GUARD-SITE marker", { ...files, [tpl]: files[tpl].replace("// GUARD-SITE", "") }],
  ["swapped SECRECY and WRITE markers", { ...files, [tpl]: files[tpl].replace("// SECRECY-SITE", "// @@").replace("// WRITE-SITE", "// SECRECY-SITE").replace("// @@", "// WRITE-SITE") }],
  ["a revived --local-host flag", { ...files, [setup]: files[setup] + "\n--local-host\n" }],
  ["a missing guard script", { ...files, ["plugins/relay/scripts/auth-local-guard.mjs"]: null }],
];
for (const [label, input] of cases) {
  const r = m.checkAuthLocalGuardSites({ files: input });
  if (r.ok) { console.error("FAIL: the check did not detect " + label); process.exit(1); }
}
console.log("PASS: guard-site registry holds on the real tree and detects four seeded violations");
'
```

### Task 8: UPDATE documentation/assets/data/search-index.json and documentation/changelog.html

**ACTION**: Infrastructure/scaffolding annotation for registration; also delivers AC-A9 (review loop untouched — this task's VALIDATE is where the byte-identity guard runs). First `Read` `documentation/AGENTS.md` in full — it is the binding contract for every `documentation/` change. In `search-index.json`, append to the `Commands` entry's `excerpt` (append at the END only — the excerpt must keep starting with `Twenty commands`, which `figma-visual-first-track-phase7.test.mjs` pins) one sentence introducing `/relay-auth-scripts` as the standalone, non-interactive command that generates per-role login scripts, `login.config.json` and `credentials.example.json` from an approved `PRPs/auth/auth-model.md`. Keep the JSON valid, LF-only and ASCII-safe. Do not mention `/relay-qa-run` (a command mention with no file is a stale `registration-parity` finding) and do not change `documentation/reference/commands.html` (its "Nineteen commands" subtitle is pinned). In `changelog.html`, add a second `<li>` inside the existing `<h3 id="unreleased-added">Added</h3>` list, same markup as the neighbouring entry (`<strong>` title, `&mdash;` separators, `<code>` for identifiers), describing `/relay-auth-scripts`, the `auth-login.template.mjs` resource, the `auth-local-guard.mjs` script, the `PRPs/auth/local-hosts.txt` declaration, the removal of the `--local-host` flag from `/relay-auth-setup`, and the new `auth-local-guard-sites` validation check. No emojis, no inline styles, per `documentation/AGENTS.md`. Do not add any other `/relay-` command literal.
**MIRROR**: `# SOURCE: documentation/changelog.html:33-42`.
**VALIDATE**:
```bash
set -euo pipefail
node --input-type=module -e '
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const idx = JSON.parse(fs.readFileSync("documentation/assets/data/search-index.json", "utf8"));
const txt = JSON.stringify(idx);
const cl = fs.readFileSync("documentation/changelog.html", "utf8");
const miss = ["/relay-auth-scripts"].filter((s) => !txt.includes(s) || !cl.includes(s));
if (miss.length) { console.error("FAIL: not registered on the doc site: " + miss.join(", ")); process.exit(1); }
const commands = idx.find((e) => e.title === "Commands");
if (!commands || !commands.excerpt.startsWith("Twenty commands")) { console.error("FAIL: the Commands excerpt must keep its Twenty commands prefix"); process.exit(1); }
if (txt.includes("/relay-qa-run") || cl.includes("/relay-qa-run")) { console.error("FAIL: the not-yet-existing runner must not be mentioned"); process.exit(1); }
const m = await import(pathToFileURL(process.cwd() + "/scripts/validate/checks/registration-parity.mjs").href);
const r = m.runRegistrationParityCheck();
if (!r.ok) { console.error("FAIL: " + JSON.stringify(r.findings)); process.exit(1); }
console.log("PASS: registration-parity green");
'
git diff --quiet d867142fa5fb80cb02d874ffbf05a8ac0a74f421 -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/auth-local-guard.mjs
node --check plugins/relay/resources/auth-login.template.mjs
node --check scripts/validate/checks/auth-local-guard-sites.mjs
grep -q "runAuthLocalGuardSitesCheck" scripts/validate/index.mjs
npm run validate
```

The three `node --check` lines and the `grep` fail before this phase's tasks (the files and the registration do not exist), which is the real pre-ACTION signal — `npm run validate` alone would pass on the dirty Phase 1-2 tree. The runner sets a non-zero exit code when any registered check reports a finding. Baseline is 26 passed / 0 failed; after Task 7 it is 27.

### Level 2 — CONTENT_INVARIANTS and UNIT_TESTS

```bash
set -euo pipefail
BASE=d867142fa5fb80cb02d874ffbf05a8ac0a74f421
# AC-16 and the frozen-consumer guarantee: single-argument tree form, never two-dot.
git diff --quiet "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs plugins/relay/scripts/auth-kit-secrecy.mjs plugins/relay/resources/auth-kit.gitignore scripts/validate/checks/auth-secrecy.mjs
# New files are untracked, so their whole content is the added text: scan them directly.
for f in plugins/relay/scripts/auth-local-guard.mjs plugins/relay/resources/auth-login.template.mjs plugins/relay/commands/relay-auth-scripts.md scripts/validate/checks/auth-local-guard-sites.mjs; do
  test -f "$f"
  if grep -n '\.claude/PRPs' "$f" | grep -qv 'MUST NOT appear'; then
    echo "FAIL: forbidden .claude/PRPs reference in $f outside a quoted prohibition"; exit 1
  fi
done
# Modified files: scan only the added diff lines, excluding the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- plugins/relay/commands/relay-auth-setup.md plugins/relay/agents/auth-model-writer.md plugins/relay/agents/auth-model-reviewer.md plugins/relay/resources/design-spec-template.md scripts/validate/index.mjs documentation/assets/data/search-index.json documentation/changelog.html | grep -E '^\+[^+]' | grep '\.claude/PRPs' | grep -qv 'MUST NOT appear'; then
  echo "FAIL: forbidden .claude/PRPs reference introduced in a modified file"; exit 1
fi
# The corpus: every test file except the phase-2 pin file must be green; the phase-2 pin file may fail ONLY
# on the two assertions the guard fix legitimately changes (test-pair EXISTING_TEST_UPDATED items).
node -e '
const cp=require("child_process"),fs=require("fs"),path=require("path");
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const all=walk("scripts/validate").filter((p)=>p.endsWith(".test.mjs")).map((p)=>p.split(path.sep).join("/"));
const PINNED="scripts/validate/checks/auth-model-pair.test.mjs";
let r=cp.spawnSync(process.execPath,["--test",...all.filter((p)=>p!==PINNED)],{stdio:"inherit"});
if(r.status!==0){console.error("FAIL: the corpus (excluding the phase-2 pin file) is not green");process.exit(1)}
r=cp.spawnSync(process.execPath,["--test","--test-reporter=tap",PINNED],{encoding:"utf8"});
const failed=[...String(r.stdout).matchAll(/^\s*not ok \d+ - (.*)$/gm)].map((m)=>m[1].trim());
const allowed=["command: the local-only guard HALT precedes the Decision Gate source read","command: the local-only guard covers loopback names and explicit declarations and is never a warning"];
if(r.status!==0&&failed.length===0){console.error("FAIL: the phase-2 pin file failed and no failing assertion could be attributed");process.exit(1)}
const unexpected=failed.filter((n)=>!allowed.includes(n));
if(unexpected.length){console.error("FAIL: unexpected failures in the phase-2 pins: "+unexpected.join(" | "));process.exit(1)}
console.log("PASS: corpus green; phase-2 pin file fails at most on the two assertions the guard fix changes ("+failed.length+" failing)");
'
```

The corpus baseline is 1092 tests / 0 fail and must be HELD. The node-runner exit code carries the signal for the main corpus; the TAP reporter is pinned only to attribute failures inside the one file whose two assertions the guard fix legitimately changes — those become test-pair `EXISTING_TEST_UPDATED` items after the Implementer finishes, never Implementer edits.

### Level 3 — INTEGRATION (the commands' guard lines as written, then a real local-fixture login lifecycle)

```bash
set -euo pipefail
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path");
const plugin=path.resolve("plugins/relay");
const bad=[];
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"auth-guard-line-"));
const PREFIX="node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs\" check";
for(const file of ["plugins/relay/commands/relay-auth-setup.md","plugins/relay/commands/relay-auth-scripts.md"]){
  const line=fs.readFileSync(file,"utf8").split("\n").find((x)=>x.startsWith(PREFIX));
  if(!line){bad.push("guard invocation line not found in "+file);continue}
  const cmd=(u)=>line.split("${CLAUDE_PLUGIN_ROOT}").join(plugin).replace("<target_root>",tmp).replace("<base-url>",u);
  try{cp.execSync(cmd("http://localhost:3000"),{stdio:"pipe"})}catch(e){bad.push(file+": a local URL was refused: "+String(e.stderr))}
  for(const u of ["http://localhost@evil.example","http://localhost.evil.example:3000","http://evil.example"]){
    let refused=false;try{cp.execSync(cmd(u),{stdio:"pipe"})}catch(e){refused=String(e.stderr).includes("FAILED_NON_LOCAL_TARGET")}
    if(!refused)bad.push(file+": "+u+" was not refused by name");
  }
}
fs.rmSync(tmp,{recursive:true,force:true});
if(bad.length){console.error("FAIL: "+bad.join(" | "));process.exit(1)}
console.log("PASS: both commands guard lines run as written")
'
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path"),http=require("http"),{promisify}=require("util");
const exec=promisify(cp.execFile);
const repo=process.cwd();
const plugin=path.join(repo,"plugins","relay");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"auth-e2e-"));
let logins=0,revoked=false;
const server=http.createServer((req,res)=>{let body="";req.on("data",(c)=>{body+=c});req.on("end",()=>{
  if(req.method==="POST"&&req.url==="/api/login"){let j={};try{j=JSON.parse(body)}catch{}
    if(j.email==="qa@example.test"&&j.password==="not-a-real-password"){logins++;revoked=false;res.writeHead(200,{"Content-Type":"application/json","Set-Cookie":"sid=abc123; Path=/; HttpOnly; Max-Age=3600"});return res.end(JSON.stringify({data:{token:"tok-xyz"}}))}
    res.writeHead(401);return res.end("{}")}
  if(req.method==="GET"&&req.url==="/api/me"){const ok=!revoked&&(String(req.headers.cookie||"").includes("sid=abc123")||req.headers.authorization==="Bearer tok-xyz");res.writeHead(ok?200:401);return res.end("{}")}
  res.writeHead(404);res.end()})});
const finish=(code,msg)=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});(code?console.error:console.log)(msg);process.exit(code)};
(async()=>{
  try{
    await new Promise((r)=>server.listen(0,"127.0.0.1",r));
    const base="http://127.0.0.1:"+server.address().port;
    cp.execFileSync("git",["init","-q"],{cwd:tmp});
    const a=path.join(tmp,"PRPs","auth");fs.mkdirSync(a,{recursive:true});
    const role=(extra)=>Object.assign({mechanism:"api",api:{path:"/api/login",method:"POST",usernameField:"email",passwordField:"password",tokenPath:"data.token"},probe:{path:"/api/me",method:"GET"},sessionCookie:"sid",maxAgeMinutes:60,credentials:{usernameEnv:"RELAY_TEST_USER",passwordEnv:"RELAY_TEST_PASS"},userCreation:{command:null}},extra);
    fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify({baseUrl:base,roles:{qa:role({}),nocred:role({credentials:{usernameEnv:"RELAY_UNSET_USER",passwordEnv:"RELAY_UNSET_PASS"}}),sso:role({mechanism:"headed",loginPath:"/login"})}}));
    const tpl=fs.readFileSync(path.join(plugin,"resources","auth-login.template.mjs"),"utf8");
    for(const r of ["qa","nocred","sso"])fs.writeFileSync(path.join(a,"login-"+r+".mjs"),tpl.split("__RELAY_ROLE__").join(r));
    const env=Object.assign({},process.env,{RELAY_TEST_USER:"qa@example.test",RELAY_TEST_PASS:"not-a-real-password"});
    delete env.CLAUDE_PLUGIN_ROOT;delete env.RELAY_UNSET_USER;delete env.RELAY_UNSET_PASS;
    const run=async(r)=>{try{const o=await exec(process.execPath,[path.join(a,"login-"+r+".mjs"),"--root",tmp,"--plugin-root",plugin],{env,cwd:tmp});return{code:0,text:o.stdout+o.stderr,out:o.stdout}}catch(e){return{code:e.code,text:String(e.stdout||"")+String(e.stderr||""),out:String(e.stdout||"")}}};
    const file=path.join(a,".sessions","qa.json");const tokFile=path.join(a,".sessions","qa.token.json");
    const need=(c,m)=>{if(!c)throw new Error(m)};
    const secrets=["abc123","tok-xyz","not-a-real-password"];
    const clean=(r,l)=>need(!secrets.some((s)=>r.text.includes(s)),l+": output leaked a secret value");
    let r=await run("qa");need(r.code===0&&r.out.includes("SESSION_CREATED"),"first run must create a session: "+r.text);clean(r,"run 1");
    need(r.out.includes("auth_mode: storage-state:PRPs/auth/.sessions/qa.json"),"the run must print the auth_mode value the visual track consumes");
    const st=JSON.parse(fs.readFileSync(file,"utf8"));need(Array.isArray(st.cookies)&&Array.isArray(st.origins),"storage-state must have cookies and origins arrays");
    need(st.cookies.some((c)=>c.name==="sid"&&(c.expires===-1||c.expires>Date.now()/1000)),"the sid cookie must be present and unexpired");
    need(JSON.parse(fs.readFileSync(tokFile,"utf8")).token==="tok-xyz","the token artifact must hold the token");
    need(logins===1,"exactly one login expected, saw "+logins);
    const {request}=require("playwright");
    const ctx=await request.newContext({baseURL:base,storageState:file});const me=await ctx.get("/api/me");await ctx.dispose();
    need(me.status()===200,"Playwright must load the kit storage-state as an authenticated session");
    const m1=fs.statSync(file).mtimeMs;
    r=await run("qa");need(r.code===0&&r.out.includes("SESSION_REUSED"),"the second run must reuse: "+r.text);clean(r,"run 2");
    need(logins===1,"reuse must not log in again");need(fs.statSync(file).mtimeMs===m1,"reuse must not rewrite the artifact");
    const exp=JSON.parse(fs.readFileSync(file,"utf8"));exp.cookies.forEach((c)=>{if(c.name==="sid")c.expires=1});fs.writeFileSync(file,JSON.stringify(exp));
    r=await run("qa");need(r.code===0&&r.out.includes("SESSION_CREATED"),"an expired cookie must trigger a re-login: "+r.text);clean(r,"run 3");
    need(logins===2,"expected 2 logins after cookie expiry, saw "+logins);
    need(JSON.parse(fs.readFileSync(file,"utf8")).cookies.some((c)=>c.name==="sid"&&c.expires!==1),"the overwritten artifact must replace the expired cookie");
    revoked=true;r=await run("qa");need(r.code===0&&r.out.includes("SESSION_CREATED"),"a server-side revoked session must trigger a re-login: "+r.text);need(logins===3,"expected 3 logins after revocation, saw "+logins);
    r=await run("nocred");need(r.code===1&&r.text.includes("FAILED_CREDENTIALS_UNAVAILABLE"),"no credential source and no terminal must halt by name: "+r.text);
    need(!fs.existsSync(path.join(a,".sessions","nocred.json")),"a credential-less run must not write a session");
    r=await run("sso");need(r.code===1&&r.text.includes("FAILED_INTERACTIVE_LOGIN_REQUIRED"),"a headed role with no session and no terminal must halt by name: "+r.text);
    need(!fs.existsSync(path.join(a,".sessions","sso.json")),"a halted headed run must not write a session");
    need(!fs.existsSync(path.join(a,"credentials.json")),"credentials supplied by environment variables must never be persisted");
    finish(0,"PASS: create, reuse, expiry and revocation re-login, named halts, and no secret in any output");
  }catch(e){finish(1,"FAIL: "+e.message)}
})();
'
```

The first block executes the exact guard lines each command tells the operator to run. The second is a real lifecycle against a loopback fixture server in API mode (which needs `playwright` resolvable but no browser binary): create, reuse without a login or a rewrite, re-login on an expired cookie, re-login on a server-side revocation, a named halt when no credential source exists, a named halt for a headed role with no terminal, and a scan that no secret value appears in any output. It proves the produced file is a Playwright storage-state file that Playwright's own loader accepts — the same loader `capture.mjs` hands the path to. The browser-driven `form` and `headed` modes and the real authenticated `capture.mjs` render (the phase's stated success signal) cannot run without a browser and a real application; the test pair covers them with fixtures where a browser is available, and the Phase 5 dogfood owns the real-application proof.

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** The guard extracts the host with a real URL parse and decides by exact equality on the parsed hostname — never a substring, prefix, suffix or regex over the raw input. `http://localhost@evil.com` (userinfo-at), `http://user:pw@localhost:3000` (any userinfo), `http://localhost.evil.com` (suffix), `http://127.0.0.1.evil.com`, a non-`http(s)` scheme and an unparseable string are each refused by name (`FAILED_NON_LOCAL_TARGET`), performing no request, no login and no write — at `/relay-auth-setup`, at `/relay-auth-scripts` and in every generated login script.
- **AC-A2 (PRD AC-1):** The allowed-host list beyond the built-in `localhost`, `127.0.0.1` and `::1` comes only from the tracked project declaration `PRPs/auth/local-hosts.txt`; every declared hostname must resolve, with every address loopback, before it is honoured, and an unresolvable or non-loopback declared host is refused. `/relay-auth-setup` no longer accepts `--local-host`, and its writer, reviewer and command text state the exact-match rule.
- **AC-A3 (PRD AC-5):** Every generated login script runs the guard, then `auth-kit-secrecy.mjs ensure` for its credential, session and token paths, before any secret write; if the ignore proof fails it halts `FAILED_IGNORE_UNPROVEN` having written nothing. Every secret write is a single atomic, mode-`0o600` helper.
- **AC-A4 (PRD AC-9):** `/relay-auth-scripts` refuses (`FAILED_AUTH_MODEL_NOT_APPROVED`) unless `PRPs/auth/auth-model.md` ends with `*Status: APPROVED*`, and writes no script or config before that check; `/relay-auth-setup` keeps stopping at `APPROVED` and writing no login script and no credential file.
- **AC-A5 (PRD AC-10):** A login script run for role R writes `PRPs/auth/.sessions/<R>.json` as a Playwright storage-state file (`cookies` and `origins` arrays) and prints `auth_mode: storage-state:PRPs/auth/.sessions/<R>.json`; Playwright's own loader accepts it as an authenticated session, and `capture.mjs` is byte-identical to its pre-phase content.
- **AC-A6 (PRD AC-11):** Given a valid unexpired session artifact, re-running the script reuses it, performs no login and does not rewrite the file; given an expired cookie, a stale file, or a server-side revoked session (probe non-2xx), it logs in again and overwrites the artifact.
- **AC-A7 (PRD AC-12):** For a role whose mechanism is `headed` (SSO or MFA recorded as non-scriptable), the script opens a headed browser, waits for the operator to finish the login and press Enter, saves the state only when the final page is a guard-approved local origin, and later runs reuse it per AC-A6; with no terminal it halts `FAILED_INTERACTIVE_LOGIN_REQUIRED` rather than hanging.
- **AC-A8 (PRD AC-6):** Credential values reach the script only from environment variables named in config, the git-ignored `credentials.json`, a project-declared user-creation command (output never captured) or a muted terminal prompt — never through a conversation, a prompt argument or a report; no script or command output contains a cookie, token, password or username value, and `/relay-auth-scripts` writes only placeholder values.
- **AC-A9 (PRD AC-16):** After the phase, `code-reviewer.md`, `code-reviewer-semantic.md` and `relay-implement.md` are byte-identical to their pre-phase content, as are `capture.mjs`, `auth-kit-secrecy.mjs` and `auth-kit.gitignore`.
- **AC-A10 (PRD AC-1):** A validation check, registered in `npm run validate`, fails when any enumerated local-only guard site loses its guard reference, when the template's guard, secrecy and write markers are missing or reordered, or when the retired `--local-host` flag reappears.
- **AC-A11 (PRD AC-10):** `design-spec-template.md` states that a login-gated frame's auth mode is `storage-state:PRPs/auth/.sessions/<role>.json`, without altering the eight-field completeness scope or any pinned sentence.

R8b (PRD AC-N token check) is satisfied: every bullet above carries a PRD AC token.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The guard is implemented with a substring or prefix test and `localhost.evil.com` or `localhost@evil.com` slips through | M | H | Exact equality on `new URL(...).hostname` only; userinfo of any kind refused; Task 1's VALIDATE drives both cases plus a source scan for substring host tests; the new check pins the marker structure |
| A declared hostname resolves to loopback at check time and elsewhere at request time (DNS rebinding) | L | M | The declaration is operator-authored and every address must be loopback at check time; form and headed modes additionally abort non-local requests and refuse to save from a non-local final page. API and probe requests are not pinned — residual risk, recorded rather than hidden |
| The headed SSO flow legitimately navigates to an external identity provider, which a strict guard would forbid | M | M | The script's own traffic is always local and guarded; only the operator's own browser navigation reaches the provider, and state is saved only when the final page is a guard-approved local origin. Flagged for the Phase 5 dogfood to confirm against a real SSO project |
| Removing `--local-host` breaks two Phase 2 pin assertions (`auth-model-pair.test.mjs` around lines 272-276 and 299-304, which pin the old prose) | H | M | Expected and legitimate: the requirement was corrected, so the test pair must update those two assertions (EXISTING_TEST_UPDATED); Level 2 tolerates exactly those two and nothing else, and all other Phase 2 pins (order, no-script statement, written-file set, no `design-spec` token) are preserved by Task 4's VALIDATE |
| A credential or session value leaks through script output, a captured child process, or a report | M | H | Scripts print statuses and repo-relative paths only; the user-creation command's stdout and stderr are never captured; Level 3 scans every run's output for the fixture secrets; all secret paths are proven ignored before any write |
| The installed plugin path changes with a version update and generated scripts point nowhere | M | L | Scripts take `--plugin-root` at each run rather than baking a path in; a missing guard halts `FAILED_GUARD_UNAVAILABLE` (fail closed) instead of skipping the check |
| `playwright` is not resolvable from the target project | M | M | Lazy resolution tries the project, then the plugin's `scripts/visual/` directory, then halts `FAILED_PLAYWRIGHT_UNAVAILABLE` naming the install step; the guard and secrecy steps run before it, so the failure never weakens either |
| New files trip a hand-registered or pattern-based check (registration-parity, path-existence, plugin-root-resolvable, line-endings, figma-track-phase4 `design-spec` ban) | M | M | Every citation uses the full `${CLAUDE_PLUGIN_ROOT}/...` prefix; the new command avoids the `design-spec` token and the `relay-auth-setup` name; LF-only files; Level 1 runs all checks and Level 2 the whole corpus |
| A corpus test pins the validation-check count or the doc-site catalog and breaks when a 27th check is added | L | M | Level 2 runs the whole corpus; any such pin is resolved by the test pair (EXISTING_TEST_UPDATED), never by an Implementer test edit |
| The test-pair-authored fixtures for the `form` and `headed` modes cannot run without a browser binary | M | L | API mode is exercised end to end in Level 3 without a browser; browser modes are covered by the test pair where a browser exists and by the Phase 5 dogfood |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Where generation lives (decided, not deferred):** a separate command, `/relay-auth-scripts`, not a new phase of `/relay-auth-setup`. Reason: Phase 2 pinned in tests that `/relay-auth-setup` states "writes no login script and no credential file", lists exactly three written paths and halts on an already-APPROVED model; folding generation into it would rewrite the very assertions that guard PRD AC-9. The new command's own precondition (`FAILED_AUTH_MODEL_NOT_APPROVED`) enforces AC-9 structurally, and `/relay-auth-setup` only gains one sentence pointing at it.
- **How a project declares a local hostname (decided):** a tracked, human-authored file `PRPs/auth/local-hosts.txt`, one bare hostname per line, `#` comments allowed. It is deliberately on the tracked side of the kit (`auth-kit.gitignore` does not list it, and Task 7's check forbids it from ever being listed). Loopback names need no declaration. A declared name is honoured only if a DNS lookup yields at least one address and every address is loopback; otherwise it is refused (`declared-not-loopback` / `not-declared`). There is no flag and no environment variable for this — a per-run allowlist contradicts a permanent hard constraint.
- **Inherited Phase 2 defect — coverage by name:** userinfo-at (`http://localhost@evil.com`; the WHATWG parser puts `evil.com` in `hostname`, and any `user@host` is refused anyway), suffix (`localhost.evil.com`), prefix (`127.0.0.1.evil.com`), and declared-but-not-loopback are each driven in Task 1's and Level 3's VALIDATE. IPv4-mapped IPv6, trailing-dot and shorthand-IP forms are refused by the exact-equality rule except where the WHATWG parser normalizes them to exactly `127.0.0.1`; the test pair should pin these.
- **The Should-item check lands in this phase.** It registers the four guard sites that exist after this phase (guard script, script template, the two commands) and forbids the retired flag; Phase 4 appends the runner's site to `GUARD_SITES` rather than writing a new check.
- **Plan decision on the design-spec-template "example":** `design-spec-template.md` contains only an `{auth mode}` placeholder, no literal `storage-state:` example. The only literal example is `capture.mjs:25`, which is frozen by the PRD. The repoint is therefore the additive sentence in Task 6; `capture.mjs:25`'s comment stays stale by design and is not a defect to fix here.
- **Hard boundary:** no task edits `code-reviewer.md`, `code-reviewer-semantic.md` or `relay-implement.md`; Levels 2 and Task 8 assert byte-identity with the single-argument tree form `git diff --quiet <base>`.
- **timestamp-contract:** this phase adds no reviewer agent and no command that dispatches one, so `timestamp-contract.mjs` is not edited; `relay-auth-scripts.md` dispatches nothing.
- **Environment:** heredocs through Bash do not work here — every file is created with the `Write` or `Edit` tool. Every file written must be LF-only (`line-endings` check).
- **Diff base:** the tree object `d867142fa5fb80cb02d874ffbf05a8ac0a74f421` is this phase's base; only single-argument `git diff <base>` forms are used. The working tree is dirty with Phases 1-2, so a bare "counts still hold" command would pass before this phase does anything — Level 1 and each task's VALIDATE therefore fail first on the absence of the new files and tokens.
- **Baselines to hold:** `npm run validate` 26 passed / 0 failed before this phase (27 after Task 7); the corpus 1092 tests / 0 fail.

*Generated: 2026-09-30*
*Approved: 2026-09-30*
*Status: IMPLEMENTED*
