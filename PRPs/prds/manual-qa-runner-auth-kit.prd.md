# Manual-QA Runner and Local Test-Auth Kit

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a PRD downstream stages consume); creation of new commands and a new agent pair; impact on shared contracts (`auth_mode`, `qa-report.md`, `redaction-policy.md`); secret handling; extension of the interactivity boundary
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the binding scope of this PRD; its eleven mandatory questions are each answered below
  - [2026-09-21] "Parallel test environments extend the runnable-worktree-environments registration" — the environment handle is the runner's source for URLs and connection strings *when it exists*; it does not exist yet, so the runner falls back to the project's own declarations
  - [2026-05-15] "Runnable worktree environments" — registered, not implemented; the runner must not approximate any of its six strategies
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" — `hybrid-code-review` Phase 5 is `pending`; its measurement forbids a second variable in the review loop
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-04-19] Methodology declaration — opt-in gating keys are read from `docs/context/methodology.md`, never inferred
  - [2026-07-23] Design Spec pair and [2026-07-27] `/relay-visual-approve` — the two precedents for extending the interactivity boundary inside a standalone command
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — the kit handles credentials; this is the dominant risk of the feature
  - "Writing pipeline artifacts under `.claude/`" — every artifact goes under `PRPs/`
  - "Relying on interactive permission prompts in the autonomous loop" — both commands are standalone and never invoked by `/relay-execute`
  - "Activating the test pair by heuristic" — the non-heuristic contract is mirrored: no gating key is inferred
  - "Mutating a target project's working tree from a review agent" — `auth-model-reviewer` owns only its own flip
  - "Treating `plugins/prp-core/` as active relay code" — nothing is imported from that tree
- Applicable architectural rules:
  - Interactivity boundary — extensions are permitted only inside standalone commands, never inside the autonomous loop
  - PRP artifact paths — `PRPs/reports/<feature>/` for run output; `PRPs/auth/` for the kit
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; templates therefore ship there, and target-scoped paths are cited bare
  - Command versus agent separation — a command owns mutations and preconditions; an agent owns judgment
  - Graceful degradation is mandatory when a precondition is absent — with the explicit exception of the local-only guard, which is a hard failure by design
- Result: PROCEED
```

## Problem Statement

`/relay-qa-report` writes, for every case, a risk level, the required state and a numbered manual step-by-step, and leaves each Manual status at `pending`. Nothing in relay executes those steps — the human validator runs each case by hand, and that gate is where the human spends most of their time. The blocker is not the steps but authentication: most cases need a logged-in user in a specific role, and relay cannot produce one. `plugins/relay/scripts/visual/capture.mjs` accepts a Playwright storage-state file through `auth_mode` but never logs in, and nothing in relay creates that file.

## Evidence

- `plugins/relay/commands/relay-qa-report.md` field 6: Manual status is `pending` "on first generation for every entry that has (or needs) a manual test. Never any other value on a first-time generation — status updates only happen conversationally in a later session, never by this command re-running."
- `plugins/relay/scripts/visual/capture.mjs:9-10` states the script reuses a storage-state file "when the frame's `auth_mode` names one — this script never performs its own login."
- `plugins/relay/agents/visual-verifier.md:233` lists auth seeding beyond a single Playwright storage-state session as out of scope, degrading such screens to manual QA.
- Codebase research (2026-09-30) found **no loopback or local-host guard anywhere** in `plugins/relay/` or `scripts/`; the nearest code is `capture.mjs:40-44` defaulting the dev server to `127.0.0.1:3000` with no check that any target URL is local.
- Codebase research found **no use of `git check-ignore` anywhere** in the repository; the only `.gitignore`-write precedents are prose in `context-builder` SKILL.md Phase 1.8 and `usage-metrics.mjs:438-444`, which copies `resources/usage-metrics.gitignore` into `PRPs/metrics/`.
- Playwright's official authentication guide prescribes exactly the shape item 9 of the registration asks for — a setup routine per role, one `storageState` file per role, the directory gitignored — and states: "The browser state file may contain sensitive cookies and headers that could be used to impersonate you or your test account. We strongly discourage checking them into private or public repositories." (https://playwright.dev/docs/auth)
- The prevailing market pattern for agentic QA runners is the opposite of what this PRD requires: TestCollab's guidance is "Provide credentials in the prompt. Don't make the agent guess. Tell it the login URL, email, and password upfront." (https://testcollab.com/blog/ai-in-software-testing-qa-agents)

## Proposed Solution

Three standalone commands. `/relay-auth-setup` builds the project-local test-auth kit under `PRPs/auth/`: an `auth-model.md` describing how the project authenticates and authorizes, produced by a new `auth-model-writer`/`auth-model-reviewer` pair and confirmed by the human before any script is generated. `/relay-auth-scripts` then — and only once that model is `APPROVED` — generates the idempotent per-role login scripts that emit a Playwright storage-state file and an HTTP token, and captures test-only credentials that never pass through the conversation. `/relay-qa-run` finally reads an existing `qa-report.md`, routes each case to a driver (browser, HTTP, CLI, read-only DB check), and gives **every** case one of four outcomes — `pass`, `fail`, `blocked`, `needs-human` — backed by redacted evidence. The runner writes a separate results tree and never edits the report, so `/relay-qa-report`'s "statuses change only conversationally" rule survives untouched and a runner `pass` stays evidence the human signs off on rather than the gate itself.

The alternative considered and rejected was having the runner edit the report's Manual status field directly: it would put two writers on one file, collide with that command's anti-overwrite HALT, and quietly convert a human gate into a machine gate.

## Key Hypothesis

We believe that **producing an authenticated session per role** — not interpreting the steps — is what unlocks automatic execution of a QA report's cases.

We'll know we're right when, in each dogfood project (`praesto-sum` and `super-ensino`), at least 60% of a real `qa-report.md`'s cases return an automated outcome without intervention, every remaining case returns `needs-human` or `blocked` **for a named reason other than "could not log in"**, and no credential value appears in any tracked file or report.

## What We're NOT Building

- **Any change to `code-reviewer`, its rubric, or `/relay-implement`'s loop** — `PRPs/prds/hybrid-code-review.prd.md` Phase 5 is `pending`, and its before/after reading (first-attempt `CHANGES_REQUESTED` rate, attempts per phase) would be confounded by a second variable.
- **The deterministic reviewer checks and the pre-review simplification pass** (both registered 2026-09-17) — blocked on the same measurement, deliberately not folded in.
- **Running against any non-local host** — permanently out of scope, not an MVP limit.
- **Changing `/relay-qa-report`'s status rule, its seven-field schema, or `capture.mjs`'s `auth_mode` contract** — forbidden by the registration; this PRD conforms to all three rather than amending them.
- **Invocation from `/relay-execute`** — both commands are standalone; the autonomous orchestrator never calls them.
- **Storing or accepting any real-user or production credential** — the kit holds test accounts on the local environment only.
- **Implementing the environment handle** — registered under [2026-09-21] and not yet built; the runner reads it when it exists and falls back to the project's own declarations when it does not.
- **A general natural-language-to-browser agent** — cases are routed to drivers by what their steps need, not interpreted open-endedly.
- **Writing to any store the project did not declare** — the runner creates required state only through declared seed/fixture commands and the kit's user creation.
- **A verified SSO or MFA trigger for the headed fallback** — `auth-model-writer` may classify a role as non-scriptable because the project's code shows SSO or MFA, and route it to `headed`, but no project currently in active work uses either (checked 2026-10-02: `praesto-sum`, `super-ensino`, `sisalfa`, `inplay`, `phoenix`). That classification path is therefore not an acceptance criterion and is not claimed as proven. AC-12 covers the headed mechanism, which is verifiable now; the trigger becomes a criterion when an active project adopts SSO or MFA.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Cases returning an automated outcome (`pass`/`fail`) | ≥ 60% of the dogfood report's cases | count in `results.json` versus total cases in `qa-report.md` |
| Cases with no outcome (silently skipped) | 0 | every case in `qa-report.md` has a matching entry in `results.json` |
| Unresolved residue — cases the runner could not decide (`needs-human` + `blocked`) | ≤ 40% | `results.json`; the exact complement of the row above, so the two targets are one partition rather than two independent claims. A `fail` is a resolved outcome — the runner found a real defect — and is counted as automated, not as residue, even though the operator reads it | 
| Runner wall time | recorded, no target in v1 | `duration_ms` per case and per run, derived from real UTC `started_at`/`finished_at` instants |
| Credential values in any tracked file or report | 0 | `git check-ignore` over the kit's secret paths plus a scan of the dogfood's `PRPs/reports/` artifacts |

A baseline for manual execution time is deliberately **not** claimed. Nothing in relay timestamps a human QA pass today, so a "reduction versus manual" figure could not be derived from any recorded data; recording the runner's own wall time from v1 establishes the baseline going forward instead of fabricating the "before" retroactively.

## Acceptance Criteria (test scenarios)

- **AC-1 Local-only guard is a hard failure:** Given a target URL, connection string or command target whose host is not `localhost`, `127.0.0.1`, `::1`, or a local development hostname the project explicitly declares, when the runner or any kit script resolves that target, then it refuses by name (`FAILED_NON_LOCAL_TARGET`) and performs no request, no login and no write — never a warning, never a downgraded outcome.
- **AC-2 Every case gets an outcome:** Given a `qa-report.md` with N cases, when `/relay-qa-run` completes, then `results.json` contains exactly N entries, one per case, each keyed to the report's case title, and the entry count equals N even when the run aborted partway (unreached cases are recorded as `blocked` with the abort reason).
- **AC-3 No driver, no silent pass:** Given a case whose steps require an action no active driver can perform (email inbox, SMS, a physical device, a third-party payment, a subjective visual judgment), when the runner routes it, then its outcome is `needs-human`, its entry reproduces the case's manual step-by-step verbatim, and it is never recorded as `pass` or omitted.
- **AC-4 Closed outcome vocabulary:** Given any case entry in `results.json`, when its `outcome` field is read, then the value is one of exactly `pass`, `fail`, `blocked`, `needs-human` — a fifth value is a schema violation the validation suite fails on.
- **AC-5 Ignore rules are proven before any secret is written:** Given `/relay-auth-setup` is about to write a credential store, a session file or a storage-state file, when it prepares the write, then it has already added the ignore rules and confirmed each secret path with `git check-ignore`; if that check fails for any path, it HALTs (`FAILED_IGNORE_UNPROVEN`) without writing that file or any other secret.
- **AC-6 Credential values never reach context, report or git:** Given a kit with at least one stored credential, when any agent or command references it, then it references the file by path only; and a scan of every tracked file, every file under `PRPs/reports/`, and every run log for the dogfood run finds zero credential values.
- **AC-7 The QA report is untouched:** Given a `qa-report.md` and a completed `/relay-qa-run` against it, when the file is compared byte-for-byte against its pre-run content, then it is identical — the runner writes only under `PRPs/reports/<feature>/qa-run/<run-id>/`.
- **AC-8 A runner pass is evidence, not the gate:** Given every case returned `pass`, when the run finishes, then the output states that the human validation gate is still open and names the file the human reviews; no command flips any Manual status, and no phase status advances as a result of the run.
- **AC-9 The human confirms the auth model before any script exists:** Given `/relay-auth-setup` has produced a DRAFT `PRPs/auth/auth-model.md` and `auth-model-reviewer`'s rubric passes, when the user has not yet given an explicit affirmative reply, then the status stays `DRAFT` and **no login script and no credential file has been written**; the `DRAFT → APPROVED` flip happens only after both the rubric passing and the user's own explicit approval, and a relayed or secondhand approval is never sufficient.
- **AC-10 The storage-state the visual track already consumes:** Given a kit login script has run for role R, when `capture.mjs` is invoked with a frame whose `auth_mode` is `storage-state:<the path that script wrote>`, then Playwright loads the context authenticated as R and the capture succeeds — with no change to `capture.mjs`.
- **AC-11 Login scripts are idempotent and re-login on expiry:** Given a valid unexpired session artifact for role R exists, when its login script runs again, then it reuses the artifact and performs no login; and given the artifact exists but the session is expired, when the script runs, then it detects the expiry, logs in again, and overwrites the artifact.
- **AC-12 A headed login falls back to a human once, then reuses:** Given a role whose login mechanism is `headed` in the kit's login configuration, when its login script runs at the operator's own terminal, then it opens a visible browser at the application's login page, waits for the operator to complete the login once, saves the resulting state to the kit's session path only if the final page passes the local-only guard, and subsequent runs reuse that state per AC-11 without opening a browser; and when no terminal is attached, it halts `FAILED_INTERACTIVE_LOGIN_REQUIRED` and writes nothing.
- **AC-13 Real UTC instants, no degenerate stamps:** Given a completed run, when `results.json` is read, then the run and every case entry carry `started_at` and `finished_at` as real UTC instants observed by the script's own clock, and no entry carries a `T00:00:00Z` stamp.
- **AC-14 Required state comes only from declared sources:** Given a case whose required state needs seeding, when the runner prepares it, then it uses only the project's declared seed or fixture commands and the kit's user-creation path; if neither declares how to produce that state, the case returns `blocked` with the missing declaration named, and the runner writes to no undeclared store.
- **AC-15 Evidence is written and redacted:** Given a case with outcome `pass` or `fail`, when its entry is written, then an evidence artifact (screenshot, response body, or command output) exists under that run's directory, is referenced by path from the entry, and has had `redaction-policy.md` applied before being written.
- **AC-16 The review loop is untouched:** Given this feature's full diff, when `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md` and `plugins/relay/commands/relay-implement.md` are compared against their pre-feature content, then all three are byte-identical.

## Open Questions

- [ ] Whether `results.json` should also be emitted as a human-readable markdown sibling, or whether the terminal summary plus the JSON is enough. Deferred to the Phase 4 plan.
- [ ] Whether a later, separate PRD should add a status-preserving update mode to `/relay-qa-report` that consumes a `results.json` — explicitly **not** part of this feature, which leaves the report untouched.
- [ ] Whether the CLI and read-only-DB drivers earn their place in v1 at all, or whether the dogfood shows the browser and HTTP drivers cover the real case mix. Resolved by the Phase 5 dogfood, not before.
- [ ] Whether `auth-model.md` should eventually carry a machine-readable role matrix. Market research found no established convention for a test-tooling-oriented auth document (OpenFGA and Cedar are policy formats, not fixture role matrices), so v1 keeps it human-readable prose plus a plain markdown table.

---

## Users & Context

**Primary User**

- **Who:** the operator running relay's human validation gate between `/relay-execute` and Pillar 3 — the same person who today opens `qa-report.md` and works through it by hand.
- **Current behavior:** brings the app up locally, logs in by hand once per role, walks each case's numbered steps, records what they saw, and repeats the login whenever a session lapses or a different role is needed.
- **Trigger:** `/relay-execute` has finished and the work must be validated before `/relay-commit`.
- **Success state:** they run two commands, get a per-case outcome with evidence, and spend their attention only on what came back `needs-human`, `fail` or `blocked`.

**Secondary consumer**

The Figma visual track. `capture.mjs` already reads a storage-state file through `auth_mode` but nothing produces one, so authenticated screens degrade to manual QA. The kit is that missing producer, with no change to the consuming contract.

**Job to Be Done**

When `/relay-execute` finishes and I have a `qa-report.md` with N cases at `pending`, I want the machine to execute what is locally executable and hand me evidence, so I can spend my time only on what genuinely needs human judgment.

**Non-Users**

CI and every remote environment — the local-only guard is permanent, not a configuration. Projects with no locally runnable application. `/relay-execute` itself, which never invokes either command.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Local-only guard as a hard failure across both commands and every generated script | A permanent constraint of the feature; a warning-level guard would make every other safety property conditional |
| Must | Secrecy foundation: `PRPs/auth/` tracked/ignored split, ignore rules proven with `git check-ignore` before any secret write, halt on failure | The registration fixes this before any script handles a credential; `.gitignore` alone is insufficient and history is permanent |
| Must | `auth-model.md` produced by a writer/reviewer pair and confirmed by the human before any script is generated | It is a judgment artifact the rest of the kit consumes blindly — the same shape as the Design Spec |
| Must | Per-role login scripts producing a Playwright storage-state file and an HTTP token; idempotent; re-login on expiry | The exact artifact the visual track already consumes, and the precondition for most runner cases |
| Must | Runner with browser and HTTP drivers, the four-outcome vocabulary, and one entry per report case | The MVP that validates the hypothesis |
| Must | Redacted evidence per case under the run directory | Reports travel with PRs; a leak is an incident |
| Must | Real UTC instants in `results.json` | Establishes the wall-time baseline from the first run, and avoids the degenerate-stamp defect |
| Should | CLI driver and read-only DB verification driver | Widens coverage; not needed to validate the hypothesis |
| Should | Headed-browser fallback for logins that cannot be scripted — designed for SSO and MFA, usable for any login hard to script | Without it those roles are permanently `blocked`; with it they cost one interactive login. AC-12 verifies the mechanism; the SSO/MFA trigger is unverified until an active project uses one |
| Should | A `npm run validate` check pinning the outcome vocabulary, the local-only guard sites and the secrecy split | Converts prose contracts into deterministic gates, as `timestamp-contract` and `diff-base-form` did |
| Could | Markdown sibling to `results.json` | Readability convenience; the terminal summary may suffice |
| Could | Re-run of only the cases that did not pass | Useful after a fix; adds run-composition semantics the MVP does not need |
| Won't | Editing `qa-report.md`'s Manual status | Two writers on one file, and it converts a human gate into a machine gate |
| Won't | Any non-local target | Permanently out of scope |
| Won't | Any change to the code-review loop | Would confound `hybrid-code-review` Phase 5's measurement |

### MVP Scope

Phases 1 through 4 plus the dogfood: the secrecy foundation, the human-confirmed `auth-model.md`, per-role login scripts producing storage-state and token artifacts, and a runner with the browser and HTTP drivers that gives every case one of four outcomes with redacted evidence. CLI and read-only-DB drivers are Should-items; a case no active driver can perform returns `needs-human` with its steps, which keeps the MVP honest rather than narrow.

### User Flow

1. The operator runs `/relay-auth-setup` once per project. The pair reads the project's auth and authorization code and writes a DRAFT `PRPs/auth/auth-model.md`. The operator reads it, corrects it if needed, and approves explicitly; the reviewer flips it to `APPROVED`.
2. With the model `APPROVED`, the operator runs `/relay-auth-scripts`. It refuses unless that approval is on disk, proves the ignore rules with `git check-ignore`, then generates one login script per role and captures credentials — each either created through the project's own user-creation path or typed by the operator at a local terminal prompt the script runs.
3. Later, after `/relay-execute` and `/relay-qa-report`, the operator runs `/relay-qa-run <feature>`. It resolves the local target, obtains a session per required role from the kit, routes each case to a driver, and writes `results.json` plus evidence.
4. The operator reads the summary, reviews the `needs-human` and `fail` entries, and signs off on the gate themselves.

---

## Technical Approach

**Feasibility:** MEDIUM

The command and agent-pair shapes are established precedents. The two genuinely new things are the secrecy machinery (no `git check-ignore` usage and no local-only guard exist anywhere in the repo today) and driver routing over prose steps, whose reliability is unknown until the dogfood.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

`test_frameworks: ["node:test"]` is declared in this repository, so the pair is active in test-after mode. R-X strict applies: the Implementer authors zero test files, and every unit test for the new scripts and validation check comes from the test pair.

### Architecture Notes

- **Three standalone commands, never invoked by `/relay-execute`:** `/relay-auth-setup`, `/relay-auth-scripts` and `/relay-qa-run`. Setup and script generation are separate commands because the `APPROVED` `auth-model.md` is the gate between them (AC-9): keeping generation out of `/relay-auth-setup` is what lets that command state, and be tested to state, that it writes no login script and no credential. All three follow the established standalone shape — frontmatter, mission, See, Decision Gate, argument parsing, numbered preconditions, phases — with `FAILED_<REASON>` blockquote HALTs.
- **Fourth interactivity-boundary extension, confined to `/relay-auth-setup`.** `auth-model-reviewer` takes `invocation_context: main | subagent` with `subagent` as the fail-safe default, mirroring `prd-reviewer` and `design-spec-reviewer`: in `main` mode the command inlines the protocol, the user's messages reach the reviewer, and it owns the human-confirmed flip. `/relay-qa-run` extends nothing — it is non-interactive past its own preconditions.
- **The runner writes a separate results tree.** `PRPs/reports/<feature>/qa-run/<run-id>/results.json` plus per-case evidence. `qa-report.md` is read-only input. Re-runs create a new `<run-id>` rather than overwriting, so runs are history.
- **No change to `capture.mjs`.** Its `auth_mode` contract is "any path after the `storage-state:` prefix"; the path in its header comment is an example. The kit writes sessions to `PRPs/auth/.sessions/<role>.json` (ignored) and the example in `plugins/relay/resources/design-spec-template.md` is repointed at the kit's path, so the visual track gains the producer it lacked without a contract change.
- **Scripts are relay's own Node, shipped as templates under `plugins/relay/resources/`** — the only location `${CLAUDE_PLUGIN_ROOT}` resolves, and `capture.mjs` already imports `playwright`. Escape hatch: when the project declares its own user-creation or login command, the generated script invokes that command rather than reimplementing it. Script CLI conventions follow `usage-metrics.mjs`: JSDoc Usage header, `--help`, exit 2 on an unknown argument, ESM, no npm dependencies beyond what the visual track already requires.
- **`PRPs/auth/` splits tracked from ignored.** Tracked: `auth-model.md`, the generated scripts, `credentials.example.*` with placeholder values, and the directory's own ignore file. Ignored: the credential store, session files, storage-state files. The `usage-metrics.mjs` pattern of copying a packaged `.gitignore` resource into the artifact directory is the working precedent.
- **Environment handle when it exists.** The runner reads the handle registered under [2026-09-21] for URLs and connection strings when present; absent, it falls back to the project's own declarations and, failing those, returns `blocked` with the missing declaration named. It never approximates any part of the unimplemented runnable-environment work.
- **Validation suite extension.** One new zero-arg check module under `scripts/validate/checks/`, imported and appended to the `CHECKS` array in `scripts/validate/index.mjs` (25 entries today), pinning the closed outcome vocabulary, the presence of the local-only guard at each network-touching site, and the tracked/ignored split of `PRPs/auth/`.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A credential value reaches an agent's context, a report or git despite the rules | M | Ignore rules proven with `git check-ignore` before any write, halting on failure; agents reference files by path with no read permission on secret paths; the dogfood's exit criterion includes a zero-credential scan; `redaction-policy.md` applied to every evidence write |
| Driver routing over prose steps is unreliable, and cases get wrong outcomes rather than honest `needs-human` | H | The honesty rule is an acceptance criterion, not a preference: a case no driver can perform returns `needs-human` with its verbatim steps. The dogfood measures the real mix; the 60% target is a marker to revise, not a number to reach by loosening classification |
| The local-only guard is implemented at one site and missed at another | M | A validation check enumerates the guard sites; the guard is a precondition in every phase that touches the network rather than a single shared helper nobody re-checks |
| Scope creep into the code-review loop | L | AC-16 asserts the three review-loop files are byte-identical across the whole feature diff; the plan stage halts rather than proceeding if any task would touch them |
| SSO/MFA projects get no usable roles | L | Headed-browser fallback (AC-12): the operator logs in once and the script saves the state; `auth-model.md` records which roles are non-scriptable so this is known before scripts are generated. Likelihood is low because no active project uses SSO or MFA — which also means the classification path that would route such a role to `headed` is unverified (see What We're NOT Building) |
| `auth-model.md` is wrong and the whole kit is built on it | M | It is a writer/reviewer pair with a human confirmation gate, and no script or credential is written until it is `APPROVED` (AC-9) |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Secrecy foundation | `PRPs/auth/` layout, tracked/ignored split, `git check-ignore` proof-then-halt procedure, `redaction-policy.md` extension for credential and session artifacts, new `npm run validate` check | complete | - | - | - | PRPs/plans/manual-qa-runner-auth-kit-phase-1-secrecy-foundation.plan.md |
| 2 | Auth model pair | `/relay-auth-setup` command plus the `auth-model-writer`/`auth-model-reviewer` pair; human-confirmed `DRAFT → APPROVED` flip on `PRPs/auth/auth-model.md` | complete | - | - | 1 | PRPs/plans/manual-qa-runner-auth-kit-phase-2-auth-model-pair.plan.md |
| 3 | Login scripts | Per-role login script templates under `plugins/relay/resources/`; storage-state and token artifacts; idempotency and expiry re-login; headed fallback for SSO/MFA; `design-spec-template.md` example repointed | complete | - | - | 2 | PRPs/plans/manual-qa-runner-auth-kit-phase-3-login-scripts.plan.md |
| 4 | The runner | `/relay-qa-run` command; driver routing (browser, HTTP; CLI and read-only DB as Should); the four-outcome vocabulary; redacted evidence; `results.json` with real UTC instants | complete | - | - | 3 | PRPs/plans/manual-qa-runner-auth-kit-phase-4-the-runner.plan.md |
| 5 | Dogfood | Two projects. `praesto-sum`: one real `qa-report.md` end to end, single role. `super-ensino`: at least two roles, an authenticated `capture.mjs` render (AC-10), and the headed fallback against a real app (AC-12). Both: every case with an outcome, zero credential values in any tracked file or report | pending | - | - | 4 | - |

The local-only guard is not a phase. It is a precondition in every phase that touches the network, and a hard failure at each one.

### Phase Details

**Phase 1: Secrecy foundation**
- **Goal:** make it impossible to write a secret before the ignore rules are proven.
- **Scope:** the `PRPs/auth/` directory contract; a packaged ignore resource copied into it, following the `usage-metrics.mjs` precedent; the `git check-ignore`-then-halt procedure; `redaction-policy.md` extended to cover credential stores, session files and storage-state paths; one new validation check registered in `scripts/validate/index.mjs`.
- **Success signal:** a deliberately unignorable path makes the procedure halt without writing, and `npm run validate` fails on a broken secrecy split.

**Phase 2: Auth model pair**
- **Goal:** a human-confirmed, tracked description of how the project authenticates and authorizes.
- **Scope:** `/relay-auth-setup` with its preconditions and HALT codes; `auth-model-writer` reading login endpoints, middleware and guards, session or token configuration, role and permission models and tenant scoping; `auth-model-reviewer` with a rubric and `invocation_context` scoping; the `auth-model.md` template under `plugins/relay/resources/`.
- **Success signal:** an `APPROVED` `auth-model.md` naming the mechanisms, the login flow, the role/permission matrix, how a user with a given role is created locally, and what cannot be automated — with no script and no credential written before the human's explicit approval.

**Phase 3: Login scripts**
- **Goal:** a reusable authenticated session per role.
- **Scope:** script templates; credential capture through the project's own user-creation path or a local terminal prompt; storage-state and token/cookie-jar artifacts; idempotency and expiry detection; the headed fallback; repointing the `design-spec-template.md` auth-mode example.
- **Success signal:** `capture.mjs` renders an authenticated screen from a kit-produced storage-state file, with `capture.mjs` unchanged.

**Phase 4: The runner**
- **Goal:** every case of a real report gets an outcome.
- **Scope:** `/relay-qa-run`; case parsing from `qa-report.md`; driver routing; required-state setup from declared sources only; the four outcomes; evidence capture with redaction; `results.json` with real UTC instants; the terminal summary that states the human gate is still open.
- **Success signal:** entry count equals case count on a report exercising all four outcomes, and the report is byte-identical after the run.

**Phase 5: Dogfood**
- **Goal:** proof in a real project.
- **Scope:** two projects, because neither alone covers every criterion.
  - `praesto-sum` (repository `C:\repos\assistente-pessoal`): one real `qa-report.md` end to end, with the metric readings above. It is a single-user application, so it cannot satisfy the two-role requirement, and it renders nothing worth an authenticated `capture.mjs` check.
  - `super-ensino` (workspace `C:\repos\super-ensino`; the `portal` SPA against the `spe-services` API): at least two of its three roles (teacher, admin, student); one real `qa-report.md` end to end; an authenticated screen rendered by `capture.mjs` from a kit-produced storage-state file, discharging AC-10; and one role declared `headed` in the kit's login configuration, discharging AC-12 against a real application.
- **Why the headed role is declared by hand:** `super-ensino` authenticates through a single custom model backend (`core.backends.RegistrationModelBackend`) issuing JWTs, with no SSO and no MFA in any of its repositories, so no role is non-scriptable by nature. One role is set to `headed` deliberately. That is exactly what AC-12 requires — the mechanism: a headed launch, a human login, the state saved, the next run reusing it. It does not show that a genuine SSO or MFA flow completes through it, and that is out of scope per What We're NOT Building.
- **Success signal:** in both projects, ≥60% automated outcomes, zero cases without an outcome, zero credential values found, and no case blocked for lack of a login; in `super-ensino`, an authenticated `capture.mjs` render and a reused headed session.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Write-back | The runner never touches `qa-report.md`; it writes `PRPs/reports/<feature>/qa-run/<run-id>/results.json` plus evidence | Runner edits only the Manual status field | Keeps `/relay-qa-report`'s "statuses change only conversationally" rule intact without an exception, avoids two writers on one file, and makes re-runs history instead of overwrites |
| The human gate | A runner `pass` is evidence; the human still signs off | A runner `pass` closes the gate | Converting a human gate into a machine gate is a larger change than this feature earns, and the runner's classification reliability is unmeasured until the dogfood |
| Outcome vocabulary | Exactly `pass`, `fail`, `blocked`, `needs-human` | Adding `error`, or the market's Passed/Failed/Skipped/Unexecuted | `blocked` (could not start) and `needs-human` (no driver can perform it) are the two honest failure-to-run modes; a `skipped` value invites silent omission, which is the anti-pattern the QA report exists to counter |
| `auth-model.md` authorship | Writer/reviewer pair, `invocation_context: main`, human-confirmed flip | A single LLM-judgment command like `/relay-qa-report` | It is consumed blindly by every downstream script; the Design Spec precedent covers exactly this shape |
| Interactivity boundary | Fourth registered extension, confined to `/relay-auth-setup` | Making the setup non-interactive | Confirming the auth model and typing credentials both require the user; the two earlier extensions establish the pattern of confining it to a standalone command |
| Script language | Relay's own Node, templates under `plugins/relay/resources/`, with delegation to a project-declared command when one exists | The project's own stack | `${CLAUDE_PLUGIN_ROOT}` resolves only under `plugins/relay/`, and `capture.mjs` already imports `playwright`; the escape hatch avoids reimplementing project-specific user creation |
| Session path versus `capture.mjs` | Kit writes `PRPs/auth/.sessions/<role>.json`; `capture.mjs` unchanged; the `design-spec-template.md` example repointed | Adopting `capture.mjs`'s header path `PRPs/designs/<feature>/auth/session.json`, or amending the `auth_mode` contract | The contract is "any path after the prefix" — the header path is an example, not a constraint; the registration forbids amending that contract, and sessions are per-role, not per-feature |
| MVP drivers | Browser and HTTP as Must; CLI and read-only DB as Should | All four as Must | The hypothesis is about producing sessions, not driver breadth; anything outside the active drivers returns `needs-human` with its steps, so a narrower MVP stays honest |
| Local-only guard placement | A precondition in every network-touching phase, enumerated by a validation check | A single shared helper | No loopback guard exists in the repo today, so there is nothing to extend; enumerating the sites mechanically is what keeps the guard from being implemented at one site and missed at another |
| Credentials in context | Never — files are referenced by path; typed credentials go through a local terminal prompt the script runs | The market default of passing credentials in the prompt | A transcript, a prompt and a log are all leak surfaces; this is the explicit inversion of the prevailing pattern |
| Time metric | Record real UTC instants from v1; no "reduction versus manual" claim | Ask the operator to stopwatch a manual pass | Nothing timestamps manual QA today, so the "before" cannot be derived from recorded data; recording from v1 establishes the baseline going forward |
| Relationship to the review loop | Untouched, asserted by AC-16 | Folding in the 2026-09-17 registrations | `hybrid-code-review` Phase 5's measurement would be confounded by a second variable |
| Dogfood targets: two projects, not one (changed 2026-10-02, before phase 5) | `praesto-sum` for the end-to-end run; `super-ensino` for the two-role requirement, AC-10 and AC-12's mechanism | `assistente-pessoal` alone, as originally specified | `assistente-pessoal` is the repository of `praesto-sum`, a single-user application — the original phase 5 asked it for "at least two roles", which it cannot satisfy, and it renders nothing that makes an authenticated `capture.mjs` check meaningful. `super-ensino` has three roles and a React SPA. It has no SSO and no MFA, so its headed role is a scriptable role declared `headed` deliberately — which is what AC-12 requires after its rewrite (next row) |
| `/relay-qa-report` gains a canonical per-entry layout (2026-10-02, operator-approved) | The command now specifies how a report is laid out — `### <id> — <title>` cases under optional `## <group>` headings, the seven fields as top-level `- **<Label>:**` bullets, a step list ending at the next column-0 labeled bullet, `---` only before a heading — with a canonical example between markers that the test suite extracts as its fixture. The seven-field schema and the status rule are unchanged, so What We're NOT Building's protection of both still holds | Leave the layout unspecified and keep hardening the parser against observed outputs | The praesto-sum dogfood halted FAILED_REPORT_UNPARSEABLE: `/relay-qa-run` could not read what `/relay-qa-report` produces, because the command only ever said "a markdown table (or per-entry sections…)". Every consumer was guessing, and the first two guesses both broke — the original fixture was parser-friendly, and the hotfix transcribed one real output and introduced two silent-loss defects (a step list cut at any `---`, and a two-field case threshold). Specifying the layout in the producer and extracting the test fixture from that spec makes a divergence fail a test instead of a dogfood. The parser now never drops a case silently: a `###` block with any field is counted, an incomplete one is `blocked` with `CASE_INCOMPLETE`, and a `## Summary table` is cross-checked against the parsed cases |
| AC-12 rewritten to the verifiable mechanism (2026-10-02, before phase 5, operator-approved) | AC-12 now states the headed fallback itself: a `headed` role opens a visible browser, the operator logs in once, the state is saved only if the final page passes the guard, later runs reuse it, and with no terminal it halts `FAILED_INTERACTIVE_LOGIN_REQUIRED` writing nothing. The SSO/MFA classification that would route a role to `headed` moves to What We're NOT Building | Keep AC-12 as written and leave it unproven; build a synthetic local Keycloak only to prove it; delete the headed mode | The original *Given* required a role non-scriptable *because of* SSO or MFA, and no project in active work has either, so it could never be verified — it would have stayed a permanent "unproven", or invited proving it with a hand-declared role and calling that proof. A synthetic IdP would be new infrastructure for a scenario no active project has. Deleting the headed mode would discard reviewed, tested code that the registered decision's item 9 requires and that also covers logins hard to script for reasons other than SSO. The code is unchanged; only the claim now matches what can be verified |
| Command count: three, not two (reconciled 2026-10-02, post-implementation) | `/relay-auth-setup`, `/relay-auth-scripts`, `/relay-qa-run` | Keep script generation inside `/relay-auth-setup`, as this PRD originally specified | Phase 2 shipped `/relay-auth-setup` with tests pinning that it writes no login script and lists exactly three written paths — pins that exist to protect AC-9's human gate. Adding generation there would have required rewriting those very assertions. Phase 3 therefore introduced a third command gated on `*Status: APPROVED*` in `auth-model.md`. This row records the divergence rather than leaving the PRD contradicting the shipped surface |

---

## Research Summary

**Market Context**

Agentic QA runners that execute human-written test cases exist — TestCollab drives a browser through a human-authored plan and checks expected results against the accessibility tree, explicitly keeping "what to test" with the human and giving the agent only "how to click through it" (https://testcollab.com/blog/ai-in-software-testing-qa-agents). Its outcome vocabulary is Passed / Failed / Skipped / Unexecuted, and no fetched source showed how any such product handles steps no driver can perform — the skip-versus-blocked distinction is unverified across the category, which is precisely the gap the `needs-human` outcome closes here. The same guidance recommends passing the login URL, email and password directly in the prompt, the exact pattern this PRD forbids. Other products in the space (Momentic, Autosana, KaneAI, Autify) were named in a comparison overview but their vocabularies and credential handling were not verified (https://www.minitap.ai/magazine/ai-qa-testing-tools-compared).

Playwright's official authentication guide independently prescribes this PRD's kit design: a setup routine per role, one `storageState` file per role stored in a gitignored directory, selected per test rather than globally, with API-based login as a faster alternative to UI login, and an explicit warning against committing state files to any repository (https://playwright.dev/docs/auth). On secrets written to disk by agentic tooling, `.gitignore` alone is documented as insufficient — it does not cover already-tracked files, and committed secrets persist in history permanently unless it is rewritten — with layered pre-commit scanning recommended (https://dev.to/ticktockbent/secrets-agents-and-env-files-40l2). No established convention was found for a test-tooling-oriented auth/permission document; OpenFGA's DSL-plus-JSON model and Cedar are policy formats, not fixture role matrices (https://openfga.dev/docs/modeling/roles-and-permissions), so `auth-model.md`'s shape is relay's own.

**Technical Context**

`/relay-qa-report` is the producer of the file this runner consumes: a single LLM-judgment command with no writer/reviewer pair, seven fields per case including a Manual status that defaults to `pending`, four-way argument routing, an anti-overwrite HALT, and never invoked by `/relay-execute` (`plugins/relay/commands/relay-qa-report.md:2`). `capture.mjs` reads `auth_mode` as `storage-state:<path>` or `none`; `parseAuthMode` strips the prefix and anything else returns `null`, and the resulting path is passed to Playwright's `contextOptions.storageState` **unvalidated** — no existence check, no path-shape check (`plugins/relay/scripts/visual/capture.mjs:25,47-54,118`). It is the only script in the repository that imports `playwright`, and it never performs its own login (`capture.mjs:9-10`).

Two capabilities this feature needs **do not exist anywhere in the repository today**. There is no loopback or local-host guard in `plugins/relay/` or `scripts/` — the only related code is `capture.mjs:40-44` defaulting the dev server to `127.0.0.1:3000` to avoid IPv6 resolution issues, with no validation of any target URL. And there is no use of `git check-ignore`; the only `.gitignore`-write precedents are prose in `context-builder` SKILL.md Phase 1.8 (read, skip if present, append, never touch in `*update`) and `usage-metrics.mjs:438-444`, which copies a packaged `resources/usage-metrics.gitignore` into `PRPs/metrics/` — the closest working model for the kit's own ignore file.

The shapes to mirror are established. Standalone infra commands share one body order with `FAILED_<REASON>` blockquote HALTs, and `/relay-visual-approve` is the exact precedent for explicit human confirmation followed by a single `Edit` plus an appended audit `jsonl` line, without resuming the pipeline itself (`plugins/relay/commands/relay-visual-approve.md:14-22,76-135`). Reviewer flip ownership is scoped by `invocation_context`, defaulting to `subagent` as a fail-safe so a reviewer never auto-flips unless an invoker with genuine user contact declares `main` (`plugins/relay/agents/design-spec-reviewer.md:28-46`). Script CLI conventions follow `usage-metrics.mjs:15-25`: JSDoc Usage header, a mandatory mode, `--help`, exit 2 on unknown arguments, ESM, no npm dependencies. A new validation check is a zero-arg `runXCheck()` module returning `{ name, ok, findings }`, imported and appended to the `CHECKS` array in `scripts/validate/index.mjs:53-79` (25 entries today, ending in `runHybridDriftGateCheck`), with its `node:test` corpus as a sibling `<name>.test.mjs`. `settings-allowlist.md` is a packaged plugin resource cited as `${CLAUDE_PLUGIN_ROOT}/resources/settings-allowlist.md` — the registration's "Areas affected" line citing `docs/context/settings-allowlist.md` names a path that does not exist, and this PRD uses the packaged path.

*Generated: 2026-09-30*
*Approved: 2026-09-30*
*Status: APPROVED*
