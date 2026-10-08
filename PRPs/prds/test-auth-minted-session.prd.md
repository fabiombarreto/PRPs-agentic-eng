# Test-Auth Minted Session

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a PRD downstream stages consume); secret handling; shared contract change (the test-auth kit's login template, `login.config.json`, `auth-model.md` and `/relay-qa-run`'s session handling); execution of a project command from a relay script
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the parent registration: local-only guard (hard failure), secrecy (`git check-ignore` proof before any secret write), credentials never in the conversation, the human validation gate stays open
  - `PRPs/prds/manual-qa-runner-auth-kit.prd.md` (APPROVED, phases 1-8 complete) — the kit this PRD extends: four login mechanisms, the two-direction browser probe (AC-20..AC-23), stale-script detection and `--refresh` (AC-24), the `static-token` placement in localStorage/IndexedDB (AC-18, AC-19)
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` (APPROVED, phases 1-7 shipped in 0.44.0) — its phase 8 dogfood is blocked in `super-ensino` by manual logins; its seed trust gate (`status` exactly `confirmed`, written only by the operator) is the precedent this PRD reuses
  - [2026-10-06] entry 104, "Provisioning the visual tooling's `node_modules` in every new plugin cache is a registered backlog item (F10)" — unrelated in scope, not folded in
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" — `hybrid-code-review` Phase 5's measurement is outstanding, so the review loop stays byte-identical
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — minted tokens and cookie values are the dominant risk of this feature
  - "Writing pipeline artifacts under `.claude/`"
  - "Relying on interactive permission prompts in the autonomous loop" — minting is non-interactive by design; the one human act is confirming the command once in a tracked file
  - "Activating the test pair by heuristic" / "Flipping any opt-in gating key by heuristic" — a mint command runs only after an explicit operator `confirmed`, never by inference
- Applicable architectural rules:
  - Interactivity boundary — no new extension: confirmation is an operator edit of a tracked file, as for seed declarations
  - Command versus agent separation — the kit's script runs the declared command; no agent composes or runs a command
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard is a hard failure at every new network- or store-touching site
- Result: PROCEED
```

## Problem Statement

In projects whose login cannot be scripted, the test-auth kit falls back to the `headed` mechanism, so the operator logs in by hand in a visible browser, typing a password, once per role and again whenever a saved session dies. In `super-ensino` that is every run: the login has two steps and two origins (F2, F3), no command creates a QA user (F13), the refresh token lasts one day, and every new login invalidates the account's earlier sessions. The runner that exists to remove human work from the validation gate therefore cannot start without a human, and phase 8 of the case-vocabulary PRD — the measurement 0.44.0 was cut for — cannot run there.

## Evidence

- `super-ensino` 0.44.0 dogfood (2026-10-06/07): the operator reported that the QA run did not work because each role needed a manual login, and required that sessions be created automatically by script, with no credential typed by anyone.
- `C:\repos\super-ensino\portal\PRPs\auth\login.config.json`: all three roles (`admin`, `teacher`, `student`) are `mechanism: headed`, `maxAgeMinutes: 1440`, `userCreation: null`.
- `C:\repos\super-ensino\portal\PRPs\auth\auth-model.md`, Session and Token Model: SimpleJWT access 5 minutes and refresh 1 day by default; a JavaScript-set cookie session (`access-token`, `refresh-token`, `user-cookie`, `tenant`, `has_term_accepted`, …); a single active session per user, rotated by a per-login `authentication_token` claim.
- `super-ensino` 0.42.0 dogfood report: F2 (two origins), F3 (two-step form) and F13 (no user creation) stand; `headed` is the only mechanism that yields a session there.
- `plugins/relay/resources/auth-login.template.mjs:25, 202-245, 1201-1281` — the mechanism set is closed at `form`, `api`, `headed`, `static-token`; `static-token` places only into localStorage or IndexedDB, never cookies (`:961-1063`).
- `plugins/relay/resources/auth-login.template.mjs:1251-1255` — the one existing project-command spawn (`userCreation.command`) runs with no confirmation status, no timeout, no URL guard and no output capture.
- `C:\repos\assistente-pessoal\PRPs\reports\missed-sweep\dogfood-report-0.44.0.md` — the praesto-sum half of phase 8 completed (1 of 2 driver-executed) only after the operator re-ran a login at their own terminal because a 24-hour session had expired (PS20).

## Proposed Solution

Add a fifth login mechanism to the test-auth kit, `minted`, in which no login happens at all. A role declares a `mint` block in `PRPs/auth/login.config.json`: a project command (argv), the local store it touches, and a `status` that only the operator sets to `confirmed`. The login script runs that confirmed command under the same protections the seed runner already enforces (`shell:false`, a timeout, bounded output, the local-only guard). The command prints one JSON object under a fixed contract — cookies, localStorage entries, an optional token for HTTP headers and an expiry — and the kit places those values on the application's origin and in the token artifact, proves the result with the existing two-direction probes, and saves it to the ignored `.sessions/` paths without printing any value. When a saved session expires, or its proof fails, the kit mints again by itself; `/relay-qa-run` also re-mints before a token's expiry so short-lived access tokens never die mid-run.

The project-side command — for `super-ensino`, a script under `portal/PRPs/auth/seeds/` that runs `python manage.py shell` in the local container, ensures a fixed QA account per role exists, and issues its tokens with SimpleJWT — belongs to the project and changes no backend code. Relay ships the mechanism, its safeguards and its authoring support; the project supplies the command, and the operator confirms it once.

The alternatives considered and rejected:
- **Extend `form` and `api`** to two steps, two origins and automatic user creation. That would still require a password to exist, be stored and be typed or generated, which the operator's requirement excludes. It would also leave the one-day refresh and the single-session rule unsolved.
- **Widen `static-token`** with cookie placement. That only covers a long-lived shared secret, which `super-ensino` does not have.

## Key Hypothesis

We believe a `minted` login mechanism will remove every human authentication step from QA runs in projects whose login cannot be scripted. The mechanism is a confirmed local project command that issues tokens for a fixed QA account, with the kit placing them in cookies, storage and headers.

We'll know we're right when `super-ensino`'s three roles each get a session proven by the browser probe with zero operator actions, and the 0.44.0 `portal` QA report runs from start to finish without any authentication step by a human.

## What We're NOT Building

- **The project-side issuing command.** Writing a project's minting script is project work, agreed with the operator, exactly as seed scripts are. Relay never generates Django, Rails or any framework code, and no backend file changes.
- **Hardening of the existing `userCreation.command` spawn.** It is a separate defect, recorded and left for its own fix.
- **Any non-local target, store or account.** The local-only guard is permanent. Minting for a real person's account is out of scope: it would also kill that person's sessions under single-session rules.
- **A new interactivity-boundary extension.** Confirmation is an operator edit of a tracked file, and nothing prompts.
- **Changes to the code-review loop or to `capture.mjs`.** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` stay byte-identical.
- **F10** (decision entry 104). Out of scope.
- **Measuring the case-vocabulary target (≥ 9 of 14).** That remains the vocabulary PRD's metric. This PRD only makes it runnable in `super-ensino`.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Human actions on authentication per QA run in `super-ensino` | 0 (today: 3 manual headed logins, plus a re-login whenever a session dies) | The dogfood run log: no headed browser, no terminal prompt, no typed value from session acquisition to the end of `/relay-qa-run` |
| `super-ensino` roles holding a minted session proven by the browser probe | 3 of 3 (admin, teacher, student) | Each role's login script output, `SESSION_MINTED` or `SESSION_REUSED`, after the two-direction browser probe and the role marker pass |
| Automatic recovery after expiry or invalidation | 100% of forced cases | Dogfood controls: an expired saved session, an invalidated token and a removed session file each end in a new minted session with no human action |
| Credential and token values in tracked files or reports | 0 | Byte scan of tracked files, `PRPs/reports/` and run logs for every minted value |
| Vocabulary PRD phase 8 runnable in `super-ensino` | yes | The same report (`portal/PRPs/reports/qa-runner-dogfood/qa-report.md`, SHA-256 `45f549d9…c071`) runs end to end under 0.45.0. Its own ≥ 9 of 14 result is recorded in that PRD |

## Acceptance Criteria (test scenarios)

- **AC-1 A minted session needs no human input:** Given a role whose `mechanism` is `minted` and whose `mint` block is confirmed and well formed, when its login script runs with no terminal attached and no credential in the environment, then it runs the declared command, places the returned values, proves the session and saves it, printing `SESSION_MINTED` and the session path. It opens no visible browser, reads no terminal input and sends no login request.
- **AC-2 Only a confirmed command runs:** Given a `mint` block whose `status` is anything but exactly `confirmed`, when the login script runs, then it halts `FAILED_MINT_UNCONFIRMED`, naming the role and the file, and runs nothing. Given `command: null`, it halts `FAILED_MINT_COMMAND_MISSING`, naming the gap. No relay command or agent ever writes `confirmed`.
- **AC-3 Minting stays local:** Given a confirmed `mint` block, when the script is about to run the command, then the application `baseUrl`, every argv element that names a URL or host, and the declared `store` all pass the local-only guard. Otherwise it halts `FAILED_NON_LOCAL_TARGET` and runs nothing. A `store` the guard cannot evaluate is refused, never assumed local.
- **AC-4 The command runs bounded and silent:** Given a confirmed command, when it runs, then it is spawned with `shell: false`, a fixed timeout and a bounded stdout. Its stderr is never echoed. A timeout, a non-zero exit or output over the bound halts `FAILED_MINT_COMMAND`, naming only the exit status or the condition.
- **AC-5 The output contract is enforced without leaking:** Given the command's stdout, when it is parsed, then it must be one JSON object with these optional keys, at least one of `cookies`, `localStorage` or `token` present and non-empty, and nothing else:
  - `cookies`: name to string value;
  - `localStorage`: key to string value;
  - `token`: string;
  - `expires_at`: ISO-8601 instant.

  Any other shape halts `FAILED_MINT_OUTPUT`, naming the offending key or type and never a value.
- **AC-6 Values land where the application expects them:** Given a valid output, when the kit places it, then:
  - every cookie is set on the `baseUrl` origin, path `/`;
  - every localStorage entry is written on that origin;
  - a `token` is written to the token artifact with the role's declared header and prefix, defaulting to `Authorization: Bearer`.

  The saved storage-state, loaded into a fresh browser context, is authenticated, including through the unchanged `capture.mjs`.
- **AC-7 A minted session is proven before it is saved or reused:** Given a placed minted session, when the script decides to save or reuse it, then the role's declared probes apply exactly as for other mechanisms:
  - the browser probe needs the authenticated-only marker stably present with the session and absent without it, plus the role marker;
  - the HTTP probe answers 2xx with the session and non-2xx without it.

  A failed proof right after minting halts with the existing probe codes and saves nothing.
- **AC-8 Expiry and invalidation re-mint automatically:** Given a saved minted session, when the script runs, then:
  - if the session is unexpired and its proof passes, it reuses it with no command run (`SESSION_REUSED`);
  - if the session is expired by `expires_at`, by the token's `exp` claim or by `maxAgeMinutes`, or its proof fails, it mints a new session and saves it with no human action.

  It never falls back to a headed login or a terminal prompt.
- **AC-9 A run never starts on a token about to expire:** Given `/relay-qa-run` with a minted role, when it obtains that role's session for the run, then a session whose expiry falls within a fixed margin of the run start is re-minted before any case uses it. A token minted during the run is registered for redaction like any other session value.
- **AC-10 Minted values never reach a tracked file, a report or the terminal:** Given a dogfood run with minted sessions, when every tracked file, every file under `PRPs/reports/` and every run log is scanned for every cookie, localStorage, IndexedDB and token value, then zero hits are found. `login.config.json` holds the declaration only, never a value.
- **AC-11 Kit authoring knows the mechanism:** Given a project whose `auth-model.md` records a minted mechanism, when `/relay-auth-scripts` generates or refreshes its configuration, then the role's `mint` block is written as follows:
  - `status: "proposed"`;
  - the `command` the model declares, or `null` with the evidence of the project's token-issuing code;
  - the `store`.

  `auth-model.md` keeps its nine sections, and its reviewer accepts a minted mechanism with `file:line` evidence of where tokens are issued.
- **AC-12 Existing kits upgrade explicitly:** Given a login script generated from template `auth-login/1`, when it runs against the 0.45.0 plugin, then it halts `FAILED_KIT_SCRIPT_STALE` naming both template identities. `/relay-auth-scripts --refresh` regenerates it from `auth-login/2` and adds the `mint` fields without changing any set value. Roles using the other four mechanisms behave exactly as before once refreshed.
- **AC-13 Untouched surfaces:** Given this feature's full diff, when these four files are compared against their pre-feature content, then all four are byte-identical:
  - `plugins/relay/agents/code-reviewer.md`
  - `plugins/relay/agents/code-reviewer-semantic.md`
  - `plugins/relay/commands/relay-implement.md`
  - `plugins/relay/scripts/visual/capture.mjs`
- **AC-14 The `super-ensino` dogfood holds:** Given the project's confirmed mint commands for admin, teacher and student, when the three login scripts and then `/relay-qa-run` on the `portal` report run, then:
  - every role holds a session proven by the browser probe and the role marker;
  - no human action happens on authentication;
  - forced expiry, token invalidation and a removed session file each recover automatically;
  - the report stays byte-identical;
  - the secrecy scan finds zero values.

## Open Questions

- [ ] What the `super-ensino` mint script must put in `user-cookie` (the profile JSON) and the other session cookies (`tenant`, `has_term_accepted`, `level`) for the SPA to render the authenticated shell. It must match what `useLogin.ts` writes; to settle in the phase 4 dogfood.
- [ ] The re-mint margin before expiry for AC-9, given a 5-minute access token and runs that take tens of seconds per case. Set in the phase 3 plan.
- [ ] Whether a minted role may also declare IndexedDB placement (the Could-item), reusing the `static-token` code. Decided by phase 1's plan scope.

---

## Users & Context

**Primary User**
- **Who:** The operator of relay's human validation gate, in projects whose login cannot be scripted by `form`, `api` or `static-token`.
- **Current behavior:** They log in by hand in a visible browser, typing a password, once per role per run, and again whenever a saved session expires or is invalidated.
- **Trigger:** `/relay-execute` has finished, and `/relay-qa-run` needs a session for each role the report uses.
- **Success state:** They run `/relay-qa-run` and nothing about authentication asks them for anything.

**Job to Be Done**
When I need to validate a delivery with the QA runner in a project whose login cannot be scripted, I want each role's session to be issued automatically by a command I trust once, so that I can run QA from start to finish without typing a credential or opening a login screen.

**Non-Users**
- CI and every remote environment: the local-only guard is permanent.
- Real people's accounts.
- Projects where `form`, `api` or `static-token` already produce sessions. Nothing changes for them beyond a template refresh.
- The health-family projects (`vizi-saude`, `faz-bem-saude-back`, `apphealth-back`), which are not active.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `minted` mechanism in the login template. It validates the `mint` block, runs the command with the seed runner's protections, places cookies, localStorage and the token, proves the session with the existing probes, and re-mints on expiry or a failed proof. `KIT_TEMPLATE_ID` becomes `auth-login/2` | It is the mechanism. The stamp bump is what makes existing kits upgrade explicitly (AC-24 of the auth-kit PRD) |
| Must | Trust gate: a command runs only when `status` is exactly `confirmed`. No relay component writes `confirmed` | Running a project command is the operator's trust decision, as for seed declarations |
| Must | Safeguards: the local-only guard on the `baseUrl`, URL-bearing argv and the `store`; `shell:false`; a timeout; bounded output; values never echoed and registered as secrets | Minting is a sanctioned authentication bypass; it must be impossible to aim it anywhere but local |
| Must | Per-run freshness: `/relay-qa-run` re-mints before an imminent expiry | `super-ensino`'s access token lives 5 minutes; API steps use it directly |
| Must | Kit authoring: the auth-model recognises `minted` (same nine sections, reviewer evidence rule), and `/relay-auth-scripts` generates the `mint` block as `proposed`, with `command: null` and token-issuing evidence | Without it, a minted role can be configured only by hand-editing |
| Should | Register IndexedDB session values as secrets in `/relay-qa-run` | A gap found in grounding: cookies, localStorage and tokens are registered, IndexedDB is not |
| Could | IndexedDB placement for minted roles, reusing `static-token`'s code | Not needed by `super-ensino` |
| Won't | Generating project minting scripts | Project work, agreed with the operator |
| Won't | Hardening `userCreation.command` | A separate defect |
| Won't | Non-local targets, real accounts, an interactivity extension, review-loop or `capture.mjs` changes | Permanently out of scope, or frozen |

### MVP Scope

Phases 1 to 3 plus the dogfood (phase 4): the mechanism with its trust gate and safeguards, kit authoring support, runner freshness and secret registration. The `super-ensino` dogfood then proves 3 of 3 roles with zero human authentication steps and makes the vocabulary PRD's phase 8 runnable.

### User Flow

1. The operator runs `/relay-auth-setup --fresh` or keeps the approved model, recording the minted mechanism with `file:line` evidence of where the project issues tokens.
2. `/relay-auth-scripts --refresh` regenerates the scripts at `auth-login/2` and writes each minted role's `mint` block as `proposed`.
3. With the operator, the project's mint script is written under `PRPs/auth/seeds/` and wired into each `mint.command`. The operator sets `status` to `confirmed` once.
4. `/relay-qa-run <feature>` obtains every role's session by minting or reusing it, and runs the report. No human step concerns authentication.

---

## Technical Approach

**Feasibility:** HIGH

Every part has a working precedent in the kit or the runner:
- the probes, atomic secret writes and the stale-script stamp in `auth-login.template.mjs`;
- the `confirmed` gate and the bounded, guarded spawn in `qa-run.mjs`'s seed path (`classifySeedDeclaration`, `runSeed`);
- localStorage placement in `static-token`;
- cookie handling in Playwright's `addCookies`.

What is new is the output contract and cookie placement.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

`test_frameworks: ["node:test"]` is declared, so the pair is active in test-after mode. R-X strict applies. Existing kit tests that pin the four-mechanism set, the `auth-login/1` stamp, the auth-model's sections or rubric ids are updated only through the test pair's lifecycle ledger: the candidates found in grounding are `auth-model-pair.test.mjs`, `auth-login-template.test.mjs`, `auth-reuse-proof.test.mjs`, `auth-probe-hardening.test.mjs`, `auth-static-token-indexeddb.test.mjs`, `auth-kit-commands-hardening.test.mjs`, `qa-run-kit-hardening.test.mjs` and `qa-run-api-origins.test.mjs`. Each phase plan must grep them for literals its tasks would rewrite, and exclude exactly the affected tests from Level 3 with `--test-skip-pattern`, never `--test-name-pattern`.

### Architecture Notes

- **Mechanism, not mode.** `minted` joins the closed mechanism set in the template header, `incompleteField` and the `main()` branch chain. Its reuse path is the existing `sessionReusable`/`proveSession`, and its "fresh login" path is a mint. The fallback to `headed` or to a prompt never exists for it.
- **The command contract is data, not code.** The kit never interprets framework output. The command prints one JSON object (`cookies`, `localStorage`, `token`, `expires_at`), and the kit validates the shape before placing anything. Values never enter a reason, a log line or the conversation.
- **The trust gate mirrors seeds.** `mint.status` follows the `qa-seed.json` rule: only exactly `confirmed` runs, the generator writes `proposed`, and the operator flips it. The guard and spawn options mirror `runSeed`.
- **Placement.** Cookies are set on the `baseUrl` origin through the browser context before the storage-state is saved, so a fresh context created from the file carries them. localStorage uses the existing placement path. The token goes to `<role>.token.json` with header and prefix, which `/relay-qa-run`'s `api_origins` and `sessionAuthHeaders` already consume.
- **Freshness in the runner.** `/relay-qa-run` already runs each role's login script once per run. For a minted role the script re-mints when the remaining lifetime is under the margin, so a run never starts on a token about to die.
- **Single active session per account.** Minting rotates the QA account's session, as a login would. Dedicated QA accounts per role keep this from touching anyone else.
- **No backend change.** For `super-ensino` the issuing script runs `python manage.py shell` in the local container with a script on stdin, as `portal/PRPs/auth/seeds/qa-state.mjs` already does.
- **Validation suite.** If the mint spawn adds a site that touches a target or store, it registers in `auth-local-guard-sites` (`GUARD_SITES`), and that check's test count update goes to the test pair. `npm run validate` must keep passing; it has 28 checks today.
- **Repo workflow.**
  - Branch off `development`.
  - PRs use `--repo fabiombarreto/PRPs-agentic-eng` with base `development`.
  - Merge, never rebase or force-push.
  - Read `documentation/AGENTS.md` before any `documentation/` edit.
  - The 0.45.0 cut follows phase 3, before the dogfood.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A mint command becomes an authentication backdoor outside the local environment | M | The local-only guard is mandatory on target, argv and store. It runs only after the operator's `confirmed`. QA-only accounts. The project script lives in the project's `PRPs/auth/`, never in backend code |
| A minted value leaks into a log, evidence or the terminal | M | Output is never echoed. Values are registered as secrets, including IndexedDB. The dogfood scans for every value |
| The single-session rule invalidates a session in use | L | One QA account per role. Mint only on expiry or a failed proof |
| The application needs cookie attributes or extra cookies the contract cannot express | M | The contract carries any cookie name/value. Path and origin follow `baseUrl`. If an attribute proves necessary in the dogfood, it becomes an additive optional field |
| Existing kit tests pin the four-mechanism set or the stamp | H | Each plan lists them as EXISTING_TEST_UPDATED for the test pair and skips exactly those tests from Level 3 with `--test-skip-pattern` |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Minted mechanism | `minted` in `auth-login.template.mjs`: the `mint` block schema, the `confirmed` gate, the guarded and bounded spawn, the output contract, cookie, localStorage and token placement, proof before save, re-mint on expiry or failed proof, `KIT_TEMPLATE_ID` → `auth-login/2` (AC-1..AC-8, AC-13) | pending | - | lane:auth-kit | - | - |
| 2 | Kit authoring | Auth-model template, writer and reviewer recognise `minted` (nine sections kept). `/relay-auth-scripts` generates the `mint` block as `proposed`, and `--refresh` adds it. Command docs and `documentation/` registration (AC-11, AC-12) | pending | - | lane:auth-kit | 1 | - |
| 3 | Runner integration | `/relay-qa-run` re-mints before an imminent expiry, registers minted, localStorage and IndexedDB values as secrets, and surfaces the new halt codes as named `blocked` reasons (AC-9, AC-10) | pending | - | lane:auth-kit | 1 | - |
| 4 | Dogfood | `super-ensino`: the project mint script under `portal/PRPs/auth/seeds/` (operator-agreed), confirmed `mint` blocks for admin, teacher and student, forced-expiry controls, then `/relay-qa-run` on the `portal` report under 0.45.0 (AC-14) | pending | - | - | 2, 3 | - |

Phases 1–3 edit the same template and runner files, so they share `lane:auth-kit` and run serially.

### Phase Details

**Phase 1: Minted mechanism**
- **Goal:** a role can hold a session no human ever logged into.
- **Scope:**
  - the `mint` schema and its validation in `incompleteField`;
  - the gate codes `FAILED_MINT_UNCONFIRMED` and `FAILED_MINT_COMMAND_MISSING`;
  - the guarded spawn, with `FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND` and `FAILED_MINT_OUTPUT`;
  - placement of cookies, localStorage and the token artifact;
  - proof before save; reuse and re-mint;
  - the stamp bump. `capture.mjs` and the review loop stay untouched.
- **Success signal:** against a fixture app that authenticates from cookies set by a fake mint command, a role mints, proves, saves and reuses with no terminal attached. An unconfirmed block, a non-local store, a bad output shape and a failing command each halt by name and print no value. An expired session re-mints by itself.

**Phase 2: Kit authoring**
- **Goal:** a minted role is configured through the commands, not by hand.
- **Scope:**
  - the auth-model template note and reviewer evidence rule for `minted` (still nine sections);
  - writer guidance to cite where the project issues tokens;
  - `/relay-auth-scripts` writing `mint` as `proposed`, with `command: null` and evidence;
  - `--refresh` adding the block without touching set values;
  - command docs, plus `documentation/` registration following `documentation/AGENTS.md`.
- **Success signal:** against a fixture project whose model records a minted mechanism, the generated configuration carries a `proposed` `mint` block, and a refreshed `auth-login/1` kit becomes `auth-login/2` with all set values intact.

**Phase 3: Runner integration**
- **Goal:** QA runs never meet a dead minted token, and never leak a minted value.
- **Scope:**
  - re-mint within the margin of expiry when `/relay-qa-run` obtains a minted role's session;
  - secret registration for minted cookie, localStorage, token and IndexedDB values;
  - the new halt codes reported as named `blocked` reasons.
- **Success signal:** a fixture run whose minted token expires inside the margin is re-minted before the first case. A scan of the run directory and terminal finds no minted value.

**Phase 4: Dogfood**
- **Goal:** proof in `super-ensino`, where every login has been manual.
- **Scope:**
  - Write the project mint script under `portal/PRPs/auth/seeds/`, agreed with the operator. It runs `python manage.py shell` in the local container, ensures one fixed QA account per role, issues SimpleJWT tokens with the session cookies `useLogin.ts` writes, and prints the contract JSON.
  - The operator confirms the three `mint` blocks.
  - Run three forced-expiry controls: an expired session, an invalidated token and a removed session file.
  - Run `/relay-qa-run qa-runner-dogfood` on the byte-identical report under 0.45.0.
  - Do the secrecy scan.
  - The health-family projects are never targets.
- **Success signal:**
  - 3 of 3 roles are proven with zero human authentication actions, and every forced-expiry control recovers automatically;
  - the report is byte-identical and the secrecy scan finds 0 values;
  - the vocabulary PRD's phase 8 run completes in `super-ensino` (its ≥ 9 of 14 result is recorded there).

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Session source when login cannot be scripted (2026-10-08, operator requirement) | A fifth mechanism, `minted`: a confirmed local project command issues tokens for a fixed QA account, and the kit places them | Extend `form`/`api` to two steps, two origins and user creation; widen `static-token` with cookies; keep `headed` | The operator requires that no credential is typed and no login happens by hand. `form`/`api` still need a password to exist and be stored. `static-token` assumes a long-lived shared secret. `headed` is manual by design |
| Where the issuing code lives | In the project's `PRPs/auth/seeds/`, running the framework's own shell (`python manage.py shell` for `super-ensino`); no backend change | A management command committed to the backend | The operator asked whether `manage.py` would change. Keeping the script in the kit avoids touching the backend, and mirrors `qa-state.mjs`, which already reaches Django this way |
| QA accounts (2026-10-08, operator-confirmed) | One fixed QA account per role, ensured idempotently (created only when missing; existing QA accounts may be reused); only its tokens are re-issued, and only on expiry or a failed proof | Create a new user per run | The operator asked whether a user would be created on every run. Idempotent accounts keep the database stable, and only the QA account's `authentication_token` rotates, as a normal login would |
| Trust gate | `mint.status` exactly `confirmed`, written only by the operator; generator writes `proposed` | Run any declared command; a writer/reviewer pair | Same rule as seed declarations (vocabulary PRD D1): running a project command is the operator's decision, reviewed in `git diff`, with no new interactivity extension |
| Output contract | One JSON object: `cookies`, `localStorage`, `token`, `expires_at`; nothing else | Framework-specific parsing in the kit; a token-only contract | The kit stays framework-agnostic. Cookies are required by `super-ensino`'s SPA, and a token alone would not render it |
| Freshness | Reuse while proven and unexpired; re-mint on expiry or a failed proof; the runner re-mints within a margin of expiry | Mint on every script run; reuse until the proof fails | A 5-minute access token would die mid-run under reuse-until-fail. Minting every time rotates the session needlessly |
| Phase serialization | Phases 1–3 share `lane:auth-kit` | Parallel lanes from `Depends` | They edit the same template and runner files |
| Frozen surfaces | Review-loop files and `capture.mjs` byte-identical (AC-13) | — | `hybrid-code-review` Phase 5's measurement is outstanding; `capture.mjs` is frozen |

---

## Research Summary

**Market Context**

- **Playwright** recommends creating authenticated state without the UI, by calling an API and saving `storageState`, and loading it per test. It warns that the state file can impersonate the test account and belongs in a gitignored directory. It does not refresh expired state: the file must be regenerated (https://playwright.dev/docs/auth). `BrowserContext.addCookies` seeds cookies directly, given name, value and either a URL or a domain plus path (https://playwright.dev/docs/api/class-browsercontext#browser-context-add-cookies). For tests that change server-side state, Playwright recommends one account per parallel worker.
- **Cypress `cy.session`** caches a session behind `setup` and `validate`. When validation fails after a restore, `setup` runs again, which is the reuse-then-re-mint pattern this PRD adopts. Session ids appear in the reporter and must carry no secret (https://docs.cypress.io/api/commands/session). `cy.task` runs Node code for backend work such as seeding (https://docs.cypress.io/api/commands/task).
- **Django** `Client.force_login` logs a test client in without credentials, but it is a test-client helper, not something a browser can use (https://docs.djangoproject.com/en/stable/topics/testing/tools/).
- **djangorestframework-simplejwt** `RefreshToken.for_user(user)` issues tokens with no password. It does not check `is_active`, so the caller must. Default lifetimes are 5 minutes for access and 1 day for refresh (https://django-rest-framework-simplejwt.readthedocs.io/en/latest/creating_tokens_manually.html).
- No authoritative guide on test-only session minting was found. The local-only, dedicated-account and no-logging safeguards rest on the Playwright and Cypress warnings and on inference.

**Technical Context**

- **Mechanism set.** The login template closes it at four values, in the header schema, in `incompleteField` (`FAILED_LOGIN_CONFIG_INCOMPLETE` on any other value) and in the `main()` branch chain (`plugins/relay/resources/auth-login.template.mjs:25, 202-245, 1201-1281`).
- **`static-token`.** It reads its value from a named env var, the ignored credential store, or a non-echoed prompt. It places the token only into localStorage or IndexedDB, never cookies (`:868-884, 961-1063`).
- **Session handling.** Sessions save atomically with mode 0600 (`:1314-1355`). Reuse runs `sessionReusable` and the two-direction proof, and on `expired` falls through to a fresh login (`:704-753, 1182-1195`). The stale-script stamp is `KIT_TEMPLATE_ID = 'auth-login/1'` (`:105, 1109-1124`).
- **The only project-command spawn today** is `userCreation.command`: `shell:false`, `stdio:'ignore'`, with no timeout, URL guard, confirmation status or output capture (`:1251-1255`).
- **`/relay-auth-scripts`** infers the mechanism from model prose. It writes only env-var names, never values, and its `--refresh` adds newer fields as `null` without changing set values (`plugins/relay/commands/relay-auth-scripts.md:154-262`).
- **The auth-model** has nine required sections, which `auth-model-pair.test.mjs` pins together with rubric R-AM1..R-AM7 (`plugins/relay/resources/auth-model-template.md:49-59, 94-98, 118-120`; `plugins/relay/agents/auth-model-reviewer.md:85-117`).
- **`/relay-qa-run`** runs each role's login script once per run (`obtainSession`, a 120 s timeout). It maps the stale stamp to `FAILED_KIT_SCRIPT_STALE` and other failures to `SESSION_UNAVAILABLE`. It registers cookie, localStorage and token values as secrets, but not IndexedDB. `api_origins` already derives a Bearer header from a cookie (`plugins/relay/scripts/qa-run.mjs:1742-1786, 2432-2440, 830-874`).
- **The trust-gate precedent** is `classifySeedDeclaration`, which runs a declaration only when `status` is exactly `confirmed`. Its spawn, `runSeed`, guards URL argv and the store and runs with `shell:false`, a 120 s timeout and a 64 KiB stdout bound (`qa-run.mjs:1248-1264, 1829-1864`).
- **Validation checks.** `auth-local-guard-sites` enumerates 10 guard sites. `auth-secrecy` pins the `.sessions/` ignore rules that minted sessions reuse unchanged (`scripts/validate/checks/auth-local-guard-sites.mjs:29-80`, `auth-secrecy.mjs:16-76`).
- **Gaps.** The research did not open `/relay-auth-setup` or `auth-model-writer.md`. It only count-matched the mechanism-enumerating test files. Phase plans must read both.

---

*Generated: 2026-10-08*
*Approved: 2026-10-08*
*Status: APPROVED*
