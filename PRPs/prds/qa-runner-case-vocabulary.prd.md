# Manual-QA Runner Case Vocabulary and Drivers

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a PRD downstream stages consume); creation of a new standalone command; impact on shared contracts (`qa-run.mjs` plan vocabulary, `results.json`, `qa-seed.json`, `login.config.json`, `redaction-policy.md`); execution of project commands and database reads from a relay script; secret handling
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the parent registration; this PRD extends its runner and keeps every rule it fixed (local-only, secrecy, the human gate, the report untouched)
  - `PRPs/prds/manual-qa-runner-auth-kit.prd.md` Decisions Log row "Phase 5 closed on an amended success signal; case vocabulary to a separate PRD" (2026-10-05, operator-approved) — the binding origin of this PRD's scope: captured seed values, a `qa-seed.json` generator, partial plans, the read-only DB driver and cross-origin API cases
  - Same PRD, Decisions Log row "Outcome vocabulary" — exactly `pass`, `fail`, `blocked`, `needs-human`; this PRD adds reason codes and counters, never a fifth outcome
  - Same PRD, Decisions Log row "Dogfood corrections and a revised hypothesis" — record-resolved cases are reported apart from the driver-executed rate; this PRD applies the same rule to partially executed cases
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" — `hybrid-code-review` Phase 5's measurement is outstanding, so the review loop stays byte-identical
  - [2026-09-17] deterministic reviewer checks and pre-review simplification registrations — deliberately not folded in
  - [2026-09-21] "Parallel test environments extend the runnable-worktree-environments registration" — the environment handle is read when it exists and never approximated
  - [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`"
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — captured seed outputs, session-derived headers, query results and accessibility snapshots are all new leak surfaces
  - "Writing pipeline artifacts under `.claude/`"
  - "Relying on interactive permission prompts in the autonomous loop" — the new command and `/relay-qa-run` stay standalone and are never invoked by `/relay-execute`
  - "Activating the test pair by heuristic" / "Flipping any opt-in gating key by heuristic" — a seed declaration becomes runnable only through an explicit operator edit, never by inference
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary — no new extension: the seed generator is non-interactive and its confirmation is an operator edit of a tracked file
  - Command versus agent separation — the command owns writes and preconditions; judgment (grounding, seed proposals) never executes anything on its own
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard (parent PRD AC-1) is a hard failure at every new network- or store-touching site
- Result: PROCEED
```

## Problem Statement

`/relay-qa-run` now obtains an authenticated session per role, yet it executes almost nothing: re-run on relay 0.42.0, it drove 1 of 12 cases in `super-ensino` and 0 of the 2 reachable cases in `praesto-sum`, and handed the rest back to the operator as `needs-human` or `blocked`. Authentication caused none of that residue. The runner refuses — correctly, under its honesty rules — because the case vocabulary cannot express what those cases need: a required state that no declaration produces, an id created by a seed and reused in a later step, a database read to verify, an API on a second local origin, a step that names no selector, or a case that mixes objective and subjective steps. Until the vocabulary can express them, the operator executes by hand exactly the cases the runner exists to take.

## Evidence

- `super-ensino` re-run on 0.42.0 (`C:\repos\super-ensino\portal\PRPs\reports\qa-runner-dogfood\dogfood-report-0.42.0.md`, counted run `20261004T232845981Z`): pass 1, fail 0, blocked 3, needs-human 8. The residue has the same causes as on 0.40.0: F8, state vocabulary with no `qa-seed.json` (3 × `STATE_UNDECLARED`); F2, cross-origin API cases that need a Bearer header read from a cookie; F9, steps grounded in code labels that are wrong on screen; and e-mail effects with no local stand-in.
- `praesto-sum` re-run on 0.42.0 (`C:\repos\assistente-pessoal\PRPs\reports\missed-sweep\dogfood-report-0.42.0.md`, counted run `20261005T030413214Z`): 19 cases resolved from the Test Runner's record, 4 `needs-human`, 0 driver-executed. Finding PS5: case 23 needs a CLI-created row whose id is reused in a request path and a DB read to verify; case 20 mixes objective steps (3–6) with subjective ones (7–8). Cases 21 (physical device and production) and 22 (fault injection) are out of reach for any local driver.
- `plugins/relay/scripts/qa-run.mjs:1183-1193` — `runSeed` spawns the seed argv with `stdio: 'ignore'`, so a seed can never hand a generated value back to the plan.
- `qa-run.mjs:1153-1176` — a declared state is looked up by the **exact** required-state text as a key of `qa-seed.json` `states`; `relay-qa-report.md:95` writes that text as free prose, so any paraphrase in a hand-written seed file yields `STATE_UNDECLARED`. No command generates the file.
- `qa-run.mjs:1509-1522` and `785-836` — one plan entry per whole case; a single out-of-vocabulary step rejects the whole entry; outcomes are per case only, and the first failing step ends the case.
- `qa-run.mjs:844-916` — only the `http` and `browser` drivers exist; each HTTP step path is rejected unless its origin equals the single target origin. `relay-qa-run.md:147-176` instructs the planning agent to omit any case needing a CLI or a database query.
- `relay-qa-run.md:152-158` writes the HTTP step as `request {method, path, …}` and shows no literal step object; the script requires the flat `{ "action": "request", … }`. A real plan written in the nested form was rejected `PLAN_ENTRY_INVALID: unknown http action` (PS9).
- `qa-run.mjs:1341-1393` — automated-coverage resolution matches the cited test **file**; cases 10–18 of `praesto-sum` cite nine different `describe` blocks and all resolve from the same 13 testcases (PS4).

## Proposed Solution

Extend the runner's vocabulary on the plan side only, so that the same two reports — byte-identical — can be re-run and compared. A plan step can reference named variables (`{{name}}`). Those variables are filled from a seed's captured JSON output, never invented. A new non-interactive command, `/relay-qa-seed`, proposes seed declarations keyed by the report's literal required-state text and pointing only at commands that already exist in the project. Each declaration stays `proposed` until the operator flips it to `confirmed` in the tracked file. A plan entry can run its objective steps and hand an explicit remainder to the human. Two new capabilities widen what a step can reach: a read-only database driver over declared local query sources, and declared local API origins with a header derived from the role's session. Browser steps can be grounded at plan time in the rendered accessibility tree, using strict role-and-name locators. Throughout, the closed four-outcome vocabulary, the local-only guard and the secrecy rules stay exactly as the parent PRD fixed them, and the report is never edited.

Two alternatives were rejected. Regenerating the reports with richer, structured steps would make the before/after comparison meaningless and would reopen `/relay-qa-report`'s contract. Letting the planning agent write argv for a free CLI step would let model judgment choose commands that the runner then executes.

## Key Hypothesis

We believe the following, together, will convert most of the runner's residue into driver-executed outcomes for the operator of the human validation gate, with no false `pass`:
- a seed declaration path whose outputs are captured into named variables;
- a read-only DB driver;
- declared local API origins;
- browser steps grounded in the rendered UI.

Partial plans let the objective half of mixed cases run and leave evidence.

We'll know we're right when re-running the same two reports drives at least 9 of their 14 reachable cases to `pass` or `fail`, against 1 of 14 on 0.42.0. Every remaining case must carry a named reason other than an inexpressible state, value or driver, and every `pass` must check out against its evidence.

## What We're NOT Building

- **Any change to `/relay-qa-report` or to the reports themselves** — the metric depends on re-running byte-identical reports; every improvement lives on the plan and runner side.
- **A fifth outcome** — the vocabulary stays `pass`, `fail`, `blocked`, `needs-human`; new behavior is expressed through reason codes and counters.
- **A free CLI step in the plan** — the planning agent never writes an argv that the runner executes. Commands run only through confirmed seed declarations and declared query sources.
- **An e-mail, SMS or SMTP stand-in driver** — cases with an outward e-mail effect are handled as partial plans; their e-mail remainder stays `needs-human`.
- **Changes to the auth kit's login mechanisms** — a cross-origin `api` login and a two-step `form` (F3) are out of scope; `headed` already yields usable sessions for both dogfood projects.
- **Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md` or `plugins/relay/commands/relay-implement.md`** — `hybrid-code-review` Phase 5's measurement is outstanding; the 2026-09-17 registrations are not folded in either.
- **Any change to `plugins/relay/scripts/visual/capture.mjs`** — frozen.
- **Any non-local target, store or origin** — permanently out of scope.
- **Automating subjective judgment** — a step that asks for a judgment stays `needs-human`.
- **Creating seed scripts inside target projects** — when a project has no command producing a state, `/relay-qa-seed` names the gap; writing that script is project work done during the dogfood, not relay code.
- **Invocation from `/relay-execute`** — both commands stay standalone.

## Success Metrics

The denominator is 14 reachable cases: the 12 cases of `super-ensino`'s `portal` report and `praesto-sum`'s `missed-sweep` cases 20 and 23. Cases 21 and 22 are excluded because no local driver can reach a physical device in production or a fault injection. Cases resolved from the Test Runner's record are not in the denominator.

| Metric | Target | How Measured |
|--------|--------|--------------|
| Driver-executed outcomes (`pass`/`fail` from a driver) across the 14 reachable cases | ≥ 9 of 14 (≥ 60%), against 1 of 14 on 0.42.0 | `results.json` of one counted run per project, on the same byte-identical reports (`report_sha256_before` equal to the 0.42.0 runs' values) |
| `praesto-sum` case 23 | driver-executed | its `results.json` entry |
| Each named `super-ensino` cause (F8 state, F2 cross-origin, F9 ungrounded steps) | at least one case converted per cause | per-case table in the dogfood report, keyed to the 0.42.0 table |
| Partially executed cases | reported, no target; not counted in the primary rate | `partially_executed` counter in `results.json` |
| False `pass` | 0 | each `pass` read against its evidence in the dogfood report |
| Remaining cases with a vocabulary reason (`NO_PLAN_ENTRY` for an inexpressible state, value or driver; `STATE_UNDECLARED`) | 0 | reason codes of the non-executed cases; every one names a concrete gap (`STATE_UNCONFIRMED`, `STATE_COMMAND_MISSING`, `STEP_UNGROUNDED`, `PARTIAL_REMAINDER`, an e-mail effect, …) |
| Credential values in any tracked file or report | 0 | the parent PRD's scan, extended to captured values and accessibility snapshots |

## Acceptance Criteria (test scenarios)

- **AC-1 One literal step object in the command doc:** Given `plugins/relay/commands/relay-qa-run.md`, when its plan vocabulary section is read, then it contains at least one literal JSON step object for each driver, in the exact flat shape the script validates (for example `{ "action": "request", "method": "GET", "path": "/api/x" }`). The nested form `{ "request": { … } }` is rejected with a `PLAN_ENTRY_INVALID` reason that names the flat shape, and a validation check fails if the doc's example objects stop validating against the script.
- **AC-2 Variables resolve or the case never starts:** Given a plan step that references `{{name}}` in a path, body, fill value or expectation, when the runner validates the entry, then every reference must be bound by a capture declared earlier in that case — by the case's seed, or by an earlier step when that Should-item ships. An unbound reference makes the entry `needs-human` with `PLAN_ENTRY_INVALID`, naming the variable, before any state is seeded, any session is obtained or any request is sent.
- **AC-3 Seed outputs are captured, never invented:** Given a confirmed seed declaration with a `captures` map (variable name → JSON path into the seed command's stdout), when the seed runs, then its stdout is parsed as JSON with a bounded size and each capture is bound to its variable. When the output is not JSON or a path resolves to nothing, the case is `blocked` with `CAPTURE_MISSING`, naming the variable, and no step runs. A captured value is written to evidence only after `redaction-policy.md` is applied, and a capture marked `redact: true` is never written in clear.
- **AC-4 A partial plan never passes:** Given a plan entry that marks a remainder of steps as human, when its objective steps all pass, then the case outcome is `needs-human` with reason code `PARTIAL_REMAINDER`. The objective steps' per-step results are recorded as evidence, the remainder steps are reproduced verbatim, and the case is counted in `partially_executed`, never in the driver-executed rate.
- **AC-5 A failed objective step is a real failure:** Given a partial plan, when one of its objective steps fails its expectation, then the case outcome is `fail` with that step's evidence, and the remainder is not presented as pending human work for a case that already failed.
- **AC-6 Per-step results:** Given any executed case, when its `results.json` entry is read, then it lists each executed step with its index, action, result (`passed`, `failed`, `not-run`, `human`) and evidence path. The four-outcome partition of `counts` and the `qa-run-contract` check still hold, and `partially_executed` is reported beside `record_resolved`.
- **AC-7 Seed keys are the report's literal text:** Given a `qa-report.md`, when `/relay-qa-seed <feature>` runs, then every distinct non-`none` *Required state* text in the report appears as a `states` key that is byte-equal to the report's text. Existing entries and their values are left unchanged, and the report is byte-identical afterwards.
- **AC-8 The generator never invents a command:** Given a required state, when `/relay-qa-seed` proposes its declaration, then the proposed command is one the project already declares, such as a package script, a management command, a Makefile target or a seed script, cited with `file:line` evidence. When none exists, the entry is written with `command: null` and a named gap, and the generator executes nothing.
- **AC-9 Only a confirmed declaration runs:** Given a seed entry whose `status` is `proposed`, or whose `command` is `null`, when the runner prepares that state, then the case is `blocked` with `STATE_UNCONFIRMED` (or `STATE_COMMAND_MISSING` for `null`, naming the gap) and no command runs. `STATE_UNDECLARED` keeps its current meaning: no declaration exists for the state text at all. Only an entry whose `status` the operator set to `confirmed` runs, and no relay command or agent writes `confirmed`.
- **AC-10 Seeds stay local:** Given a confirmed seed declaration, when the runner is about to execute it, then every argv element that names a URL, host or connection string passes the local-only guard, and the declaration's declared target store is local. Otherwise it halts `FAILED_NON_LOCAL_TARGET` and executes nothing. Declarations name their store explicitly, so a store the guard cannot see is refused rather than assumed local.
- **AC-11 The DB driver only reads, only locally:** Given a declared query source, when a plan step `{ "action": "query", "source": "<name>", "sql": "…" }` runs, then:
  - a statement that is not a single `SELECT` or `WITH … SELECT` is refused `QUERY_NOT_READ_ONLY` before execution;
  - the source's engine-level read-only control is applied whenever the source declares one;
  - a source whose invocation is not provably local (for example a `wrangler d1` invocation without `--local`, or with `--remote`) is refused `FAILED_NON_LOCAL_TARGET`;
  - the result rows are asserted with `expect_rows` / `expect_json`, and the redacted rows are written as evidence.
- **AC-12 Declared API origins:** Given a project that declares an additional local API origin and a session-derived header, for example the role's `access-token` cookie presented as `Authorization: Bearer <value>`, when an HTTP step names that origin, then:
  - the origin passes the local-only guard;
  - the header is built from the role's saved session at run time;
  - no part of the header value appears in evidence, logs or terminal output;
  - an undeclared origin is still refused `FAILED_NON_LOCAL_TARGET`, exactly as today.
- **AC-13 Grounding finds exactly one target or abstains:** Given a browser case whose steps name no selector, when the planning stage grounds it, then it reads a redacted accessibility snapshot of the named route with the role's session and writes each step as a role-and-name (or visible-text) locator. Every locator must match exactly one element both at plan time and at run time. A step that matches zero or several elements is not planned: the case is `needs-human` with `STEP_UNGROUNDED`, naming the step. The expectations always come from the report's own steps, never from the snapshot.
- **AC-14 Per-test record resolution:** Given an automated-coverage case whose cited test names a `describe` block or test title, when the runner resolves it from the Test Runner's record, then only the JUnit testcases whose classname or name match that title decide the outcome. A cited title with no match is not resolved from the record. When the report cites only a file, resolution stays per file and the evidence records `granularity: file`.
- **AC-15 Untouched surfaces:** Given this feature's full diff, when the following files are compared against their pre-feature content, then all are byte-identical:
  - `plugins/relay/agents/code-reviewer.md`;
  - `plugins/relay/agents/code-reviewer-semantic.md`;
  - `plugins/relay/commands/relay-implement.md`;
  - `plugins/relay/scripts/visual/capture.mjs`.

  Every dogfood `qa-report.md` is byte-identical before and after each run, and `OUTCOMES` is still exactly the four values.
- **AC-16 Secrets stay out:** Given a dogfood run that uses captured seed values, a session-derived header and accessibility snapshots, when every tracked file, every file under `PRPs/reports/` and every run log is scanned for the session tokens, credential values and values marked `redact`, then zero hits are found. `qa-seed.json` holds declarations only, never captured values.

## Open Questions

- [ ] Whether `wrangler d1 execute --local` accepts an engine-level read-only control (`PRAGMA query_only`), or whether `praesto-sum`'s query source must rely on the lexical guard plus the `--local` requirement alone. Research found only a vendor blog arguing that the read-only open flag alone is insufficient for SQLite (https://libredb.org/blog/sqlite-agent-read-only-two-controls/). To resolve in the phase 4 plan.
- [ ] Whether the parent PRD's `redaction-policy.md` patterns are enough to strip personal data from accessibility snapshots (account names and e-mails appear in rendered headers; see `super-ensino` NF7), or whether a declared `redact` list is needed. To resolve in the phase 6 plan.
- [ ] Where the declared API origins and query sources live: in `login.config.json` (role-adjacent), in `qa-seed.json` (state-adjacent), or in a separate tracked declaration file under `PRPs/auth/`. Deferred to the phase 1 plan, which fixes the declaration schema for every later phase.
- [ ] Whether the capture-from-an-earlier-step Should-item is needed by either dogfood report, or only by future ones.

---

## Users & Context

**Primary User**
- **Who:** the operator of relay's human validation gate between `/relay-execute` and Pillar 3 — the same operator the parent PRD serves, now with a working auth kit.
- **Current behavior:** runs `/relay-qa-run`, receives 13 of 14 reachable cases back as `needs-human` or `blocked`, and executes them by hand.
- **Trigger:** `/relay-execute` has finished, `/relay-qa-report` has written the report, and the work must be validated before `/relay-commit`.
- **Success state:** only the cases that need human judgment or a real outward effect (e-mail, device) come back, each with its objective part already executed and evidenced.

**Job to Be Done**
When `/relay-qa-run` hands a case back because its state, a value or a driver cannot be expressed, I want to declare once how that state is produced and verified, so that the runner executes the case with evidence instead of returning it.

**Non-Users**
CI and every remote environment, because the local-only guard is permanent. `/relay-execute`, which invokes neither command. Cases that need a physical device, production or fault injection: no local driver can reach them, and they are excluded from the metric. The health-family projects (`vizi-saude`, `faz-bem-saude-back`, `apphealth-back`) are not active and are not dogfood targets.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Plan vocabulary contract: a literal step object per driver in the command doc (PS9); `{{name}}` variables validated before any side effect; per-step results in `results.json` | Every other capability writes steps in this vocabulary; PS9 already misled a real plan |
| Must | Partial plans: objective steps run, an explicit remainder is `needs-human`/`PARTIAL_REMAINDER`, a failed objective step is `fail`, `partially_executed` is reported apart from the rate | Mixed cases (`praesto-sum` 20, `super-ensino` T-3/S-3) cannot run at all today; keeping them out of the rate stops partial work from inflating it |
| Must | Seeds with captured outputs: JSON stdout captured into named variables, redacted in evidence, `CAPTURE_MISSING` when absent | `praesto-sum` case 23 needs a seed-created id in a request path (PS5) |
| Must | Seed declaration path: `/relay-qa-seed <feature>` proposes declarations keyed by the report's literal state text, pointing only at existing project commands; `proposed` until the operator writes `confirmed` | F8: no command produces `qa-seed.json`, and hand-written keys drift from the report's text |
| Must | Read-only DB driver over declared local query sources | `praesto-sum` case 23 verifies its effect in the database; it was the parent PRD's Should-item |
| Must | Declared local API origins with a session-derived header | F2: `super-ensino`'s API cases (A-2, S-2) live on a second local origin and need a Bearer read from a cookie |
| Must | Plan-time grounding in the rendered accessibility tree, with strict role-and-name locators and `STEP_UNGROUNDED` | F9: report steps grounded in code labels were wrong on screen (X-1, T-2, S-4, S-6) |
| Should | Per-test record resolution with a recorded file-level fallback (PS4) | Removes a coarse edge of the parent PRD's AC-17 without changing the rate's denominator |
| Should | Capture from an earlier HTTP step (create, then read) | Common pattern (Hurl `[Captures]`); not required by either dogfood case yet |
| Could | Browser upload of a fixture file | `super-ensino` S-6 (save a new avatar) |
| Could | Cache a proven session per role for one runner process | NF6: ~33 s probe per case that needs a session |
| Won't | E-mail/SMS stand-in driver | Handled honestly by partial plans; a mail driver is a separate feature |
| Won't | Changes to `/relay-qa-report` or the reports | The metric requires the same byte-identical reports |
| Won't | Free CLI step written by the planning agent | Model judgment must never choose a command the runner executes |
| Won't | Kit login mechanisms (cross-origin `api`, two-step `form`) | `headed` already works; the residue is not authentication |
| Won't | Review loop, `capture.mjs`, non-local targets, a fifth outcome | Frozen or permanently out of scope |

### MVP Scope

Phases 1 through 6 plus the dogfood (phase 8). Together they address every named cause behind the 14 reachable cases: the plan contract and partial plans, captured seeds, the seed declaration path, the read-only DB driver, declared API origins and UI grounding. Per-test resolution (phase 7) is a Should and does not move the primary rate.

### User Flow

1. After `/relay-qa-report`, the operator runs `/relay-qa-seed <feature>`. It writes `proposed` entries keyed by the report's literal state texts, each citing an existing project command or naming the gap.
2. The operator reviews `git diff` on the tracked declaration file, writes any missing project seed script, and sets the entries they accept to `confirmed`.
3. The operator runs `/relay-qa-run <feature>`. The planning stage grounds browser steps in the rendered UI and binds variables to seed captures. The runner then executes, including DB reads and API calls on declared local origins.
4. The operator receives only the cases that need judgment or an outward effect, each with its objective part executed, and signs off on the gate themselves.

---

## Technical Approach

**Feasibility:** MEDIUM

The command and script shapes are established: `/relay-qa-run`, `qa-run.mjs`'s driver table, the seed hook and the `qa-run-contract` check all exist to be extended. Two pieces are genuinely new and their reliability is unknown until the dogfood: grounding free-text steps in a rendered accessibility tree, and guaranteeing that a database read cannot write.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

`test_frameworks: ["node:test"]` is declared in this repository, so the pair is active in test-after mode. R-X strict applies: the Implementer authors zero test files. The corpus runs via `node --test "scripts/validate/**/*.test.mjs"`, with the glob quoted.

### Architecture Notes

- **Plan side only.** Every change lives in `/relay-qa-run`'s planning instructions, in `qa-run.mjs`, in the new `/relay-qa-seed` command, and in tracked declaration files under `PRPs/auth/`. `qa-report.md` stays read-only input, and `/relay-qa-report` is not edited.
- **Variables are bound, never inferred.** A variable has exactly two sources: a confirmed seed's capture, and (Should) an earlier step's capture. Validation of every reference happens before any side effect, mirroring the existing pre-check of step paths in `executeCase` (`qa-run.mjs:1530-1534`).
- **The seed hook stops discarding stdout.** `runSeed` (`qa-run.mjs:1183-1193`) keeps `shell: false` and its timeout, but captures stdout with a size cap. Stderr stays out of evidence unless redacted.
- **No new interactivity extension.** `/relay-qa-seed` is non-interactive. Confirmation is the operator's own edit of a tracked file, reviewed in `git diff`, and the runner refuses anything not `confirmed`. That keeps the trust decision with the human without a fifth interactive command.
- **Commands run only from declarations.** The planning agent never authors an argv. Seeds and query sources are declared by the operator (seeds proposed by `/relay-qa-seed`, then confirmed), so model judgment selects among declared names and never composes a command.
- **The local-only guard extends to every new site.** These are: seed argv and declared stores, query-source invocations, and declared API origins. The existing `auth-local-guard-sites` check enumerates them, so a new site that skips the guard fails `npm run validate`.
- **Grounding uses the session the case will run with.** The snapshot is taken with the role's saved storage-state, through the kit and never through `capture.mjs`. It is redacted before being written, and it is evidence, not an input to expectations.
- **Validation suite.** `qa-run-contract` is extended (new reason codes, per-step results, `partially_executed`, the doc's literal step objects validating against the script) rather than adding a parallel check. `npm run validate` must keep passing; it has 28 checks today.
- **Repo workflow.** Branch off `development`. PRs use `--repo fabiombarreto/PRPs-agentic-eng` with base `development`. Merge, never rebase or force-push. Read `documentation/AGENTS.md` before any `documentation/` edit.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Grounding matches loosely and produces a false `pass` | H | Strict locators that must match exactly one element at plan time and at run time; expectations taken only from the report; `STEP_UNGROUNDED` whenever in doubt; every dogfood `pass` read against its evidence |
| A "read-only" query writes | M | Single-statement lexical guard (`SELECT`/`WITH … SELECT` only), the engine's own read-only control where the source declares one, and a provably local invocation (`--local` required, `--remote` refused); open question on D1's `query_only` |
| A captured value, a session-derived header or a snapshot leaks a secret or personal data | M | `redaction-policy.md` applied before every write; `redact: true` captures never written in clear; the header value is never printed; the dogfood scan covers all three surfaces |
| A seed touches a non-local store the argv guard cannot see | M | Declarations name their store explicitly, and an unprovable store is refused (AC-10); seeds run only after an operator `confirmed` |
| Scope creep into the review loop or `capture.mjs` | L | AC-15 asserts byte-identity across the full feature diff |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Plan contract and partial plans | Literal step objects in `relay-qa-run.md` (PS9); `{{name}}` variable references validated before any side effect; per-step results; partial plans with `PARTIAL_REMAINDER`, `fail` on a failed objective step, and `partially_executed`; the declaration schema for later phases; `qa-run-contract` extended (AC-1, AC-2, AC-4, AC-5, AC-6) | pending | - | lane:qa-run | - | - |
| 2 | Captured seeds | `runSeed` captures bounded JSON stdout into named variables; `CAPTURE_MISSING`; redaction of captured values; seeds name their store and pass the guard (AC-3, AC-10) | pending | - | lane:qa-run | 1 | - |
| 3 | Seed declaration path | `/relay-qa-seed <feature>`: literal state keys, proposals citing existing project commands with `file:line`, `command: null` gaps, `proposed`/`confirmed` status; runner refuses unconfirmed entries with `STATE_UNCONFIRMED` and `command: null` entries with `STATE_COMMAND_MISSING` (AC-7, AC-8, AC-9) | pending | - | lane:qa-run | 2 | - |
| 4 | Read-only DB driver | Declared local query sources; `query` step with `expect_rows`/`expect_json`; `QUERY_NOT_READ_ONLY`; engine-level read-only control where declarable; guard on the invocation (AC-11) | pending | - | lane:qa-run | 1 | - |
| 5 | Declared API origins | Additional local API origins and a session-derived header for the HTTP driver; guard on each origin; header value never printed (AC-12) | pending | - | lane:qa-run | 1 | - |
| 6 | UI grounding | Plan-time redacted accessibility snapshot per route and role; strict role-and-name locators in the browser vocabulary; `STEP_UNGROUNDED` (AC-13) | pending | - | lane:qa-run | 1 | - |
| 7 | Per-test record resolution | Match a cited `describe`/test title against JUnit classname/name; file-level fallback recorded as `granularity: file` (AC-14) | pending | - | lane:qa-run | 1 | - |
| 8 | Dogfood | Re-run the same byte-identical reports in `super-ensino` (`portal`) and `praesto-sum` (`missed-sweep`) on the release that ships phases 1–6; per-case comparison against the 0.42.0 tables; secrecy scan (AC-15, AC-16) | pending | - | - | 3, 4, 5, 6 | - |

Every phase from 1 to 7 edits `plugins/relay/scripts/qa-run.mjs` and `plugins/relay/commands/relay-qa-run.md`, so they share `lane:qa-run` and run serially even where `Depends` would allow parallel lanes.

### Phase Details

**Phase 1: Plan contract and partial plans**
- **Goal:** a plan vocabulary that later phases can extend without ambiguity, and in which a mixed case can run its objective half.
- **Scope:**
  - one literal step object per driver in the command doc;
  - the nested form rejected with a reason that names the flat shape;
  - `{{name}}` references and their pre-side-effect validation;
  - per-step results;
  - partial plans and `partially_executed`;
  - the schema of the declarations later phases add (seed captures and store, query sources, API origins), including where they live (Open Question 3);
  - `qa-run-contract` extended, with a check that the doc's examples validate against the script.
- **Success signal:** a fixture plan with a partial case yields `needs-human`/`PARTIAL_REMAINDER` when its objective steps pass and `fail` when one fails. An unbound variable is refused before any seed runs. The doc's literal objects validate.

**Phase 2: Captured seeds**
- **Goal:** a seed can hand a generated value to later steps.
- **Scope:** bounded stdout capture in `runSeed`, JSON parsing, `captures` binding, `CAPTURE_MISSING`, redaction of captured values in evidence, and declared stores checked by the local-only guard.
- **Success signal:** a fixture shaped like `praesto-sum` case 23 seeds a row, captures its id and uses it in a request path. A seed whose output lacks the path is `blocked` with `CAPTURE_MISSING`, and no step runs.

**Phase 3: Seed declaration path**
- **Goal:** `qa-seed.json` stops being a hand-written file whose keys drift from the report.
- **Scope:** the `/relay-qa-seed` command (standalone, non-interactive, never invoked by `/relay-execute`); literal state keys; static discovery of existing project commands with `file:line` evidence; `command: null` gaps; the `proposed`/`confirmed` status, which no relay component writes as `confirmed`; the runner's `STATE_UNCONFIRMED` and `STATE_COMMAND_MISSING`.
- **Success signal:** against a `super-ensino`-shaped report, every state text becomes a byte-equal key. A state with no project command is written as a named gap. A `proposed` entry is refused by the runner and runs once the operator confirms it.

**Phase 4: Read-only DB driver**
- **Goal:** a case can verify its effect in the database without any risk of writing.
- **Scope:** declared query sources; the `query` step with `expect_rows`/`expect_json`; the statement guard; the engine-level control where declarable (Open Question 1); the provably-local invocation; redacted row evidence; guard-site registration.
- **Success signal:** a `SELECT` against a local fixture database asserts its row. An `UPDATE`, a multi-statement string and a `--remote` invocation are each refused by name before execution.

**Phase 5: Declared API origins**
- **Goal:** API cases on a second local origin run with the role's session.
- **Scope:** declared additional origins; a session-derived header (cookie → named header, with an optional prefix); the guard on each origin; the header never printed; guard-site registration.
- **Success signal:** against a fixture shaped like `super-ensino` (SPA on one port, API on another, JWT in a cookie), an HTTP step on the declared API origin returns 2xx with the derived Bearer. An undeclared origin is still refused, and the token value appears nowhere in the run's output.

**Phase 6: UI grounding**
- **Goal:** browser steps that name no selector become runnable, or honestly unrunnable.
- **Scope:** a plan-time redacted accessibility snapshot taken with the role's session; role-and-name and visible-text locators in the browser vocabulary; the exactly-one-match rule at plan and run time; `STEP_UNGROUNDED`; planning instructions that keep expectations tied to the report.
- **Success signal:** against a fixture page, a step naming a visible button by text is planned and executed through a role locator. A step whose text matches two elements, or none, is `STEP_UNGROUNDED`.

**Phase 7: Per-test record resolution**
- **Goal:** an automated-coverage case is decided by the tests it cites, not by their whole file.
- **Scope:** title matching against JUnit classname/name; a file-level fallback recorded as `granularity: file`; a cited title with no match left unresolved.
- **Success signal:** a `praesto-sum`-shaped record where one `describe` fails fails only the cases citing that block.

**Phase 8: Dogfood**
- **Goal:** proof on the same two reports that produced the 0.42.0 baseline.
- **Scope:**
  - **`super-ensino`** (`C:\repos\super-ensino\portal`, report SHA-256 `45f549d9…c071`):
    - run `/relay-qa-seed` and confirm the entries;
    - write any missing project seed script as project work (for example a teacher with `TeacherDetails`, per F13);
    - declare the `:8000` API origin;
    - run `/relay-qa-run`.
  - **`praesto-sum`** (`C:\repos\assistente-pessoal`, `missed-sweep`, report SHA-256 `c1808dd5…a92b6e`): declare the D1 query source and the seed for case 23, then run `/relay-qa-run`.
  - **Both projects:**
    - a per-case table against the 0.42.0 tables;
    - every `pass` read against its evidence;
    - the secrecy scan of AC-16;
    - AC-15's byte-identity checks.
  - The health-family projects are never targets.
- **Success signal:**
  - ≥ 9 of the 14 reachable cases are driver-executed;
  - `praesto-sum` case 23 is driver-executed;
  - at least one case is converted per named `super-ensino` cause (F8, F2, F9);
  - zero false `pass`, and zero credential values found;
  - both reports are byte-identical;
  - every remaining case carries a named reason other than an inexpressible state, value or driver.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Origin of this PRD (2026-10-05) | A separate PRD for the case vocabulary and drivers, as the parent PRD's operator-approved row "Phase 5 closed on an amended success signal; case vocabulary to a separate PRD" directs | New phases in the parent PRD | The parent PRD's scope is the session; both 0.42.0 re-runs showed the residue lies outside authentication |
| Metric basis | The same two byte-identical reports; denominator of 14 reachable cases (`super-ensino` 12; `praesto-sum` cases 20 and 23); target ≥ 9 of 14 | Per-project ≥ 60%; regenerated reports; new reports | Before and after are only comparable on the same input. `praesto-sum` has 2 reachable cases, so a per-project 60% is a coin flip. Cases 21 (device and production) and 22 (fault injection) are excluded by the operator as out of reach for any local driver |
| Partial plans and the outcome vocabulary | A mixed case stays `needs-human` with `PARTIAL_REMAINDER` and per-step evidence; a failed objective step makes it `fail`; `partially_executed` is reported apart from the rate | A fifth outcome (`partial`); counting partial cases toward the rate | The four-outcome vocabulary is pinned by the parent PRD and `qa-run-contract`. Counting partial work toward the rate would inflate it exactly as record-resolved cases would have, and the parent PRD already reports those apart |
| Plan side only | Every improvement lives in the planning stage, the runner and tracked declarations; `/relay-qa-report` and the reports are untouched | Make `/relay-qa-report` emit structured states and grounded steps | The success metric depends on re-running byte-identical reports; changing the producer would also reopen a contract the parent PRD protected |
| Seed declaration approval (D1) | `/relay-qa-seed` is non-interactive and writes `proposed` entries; the operator sets `confirmed` by editing the tracked file; the runner refuses anything else | A writer/reviewer pair with a human-confirmed flip, as `auth-model.md` | A seed executes a command, so the trust decision must be the human's. A tracked-file edit reviewed in `git diff` keeps it there without adding another interactivity-boundary extension. The declaration is a small list of existing commands, not a judgment document the size of an auth model |
| CLI scope (D2) | Commands run only through confirmed seed declarations and declared query sources; no free `run` step in the plan | A CLI step whose argv the planning agent writes | Model judgment must never choose a command that the runner then executes. The only reachable case that needs a CLI (`praesto-sum` 23) needs it to create state, which a seed covers |
| Missing project seed scripts (D3) | When a project has no command for a state, `/relay-qa-seed` names the gap; writing the script is the operator's dogfood work in that project | Relay generating seed scripts | Generating project-specific data-creation code is a different, riskier feature. `super-ensino`'s teacher needs a `TeacherDetails` row that only that project's model knows (F13) |
| E-mail effects | Handled by partial plans; no mail driver | A local SMTP stand-in driver | Two cases (T-3, S-3) have the effect. Partial plans make their objective part run honestly, and a mail driver is a separate capability with its own local-only and secrecy questions |
| Phase serialization | Phases 1–7 share `lane:qa-run` | Parallel lanes from `Depends` alone | All seven edit `qa-run.mjs` and `relay-qa-run.md`; parallel lanes would collide on the same files |
| Frozen surfaces | The review loop files and `capture.mjs` byte-identical (AC-15) | Folding in the 2026-09-17 registrations | `hybrid-code-review` Phase 5's measurement is outstanding, and `capture.mjs` is frozen |

---

## Research Summary

**Market Context**

- **Capturing named values.** Hurl's `[Captures]` extract values from a response's status, headers, cookies or body (JSONPath, XPath, regex) into named variables referenced later as `{{name}}`, and a capture can be marked secret with `redact` (https://hurl.dev/docs/capturing-response.html, https://hurl.dev/docs/templates.html). Bruno's post-response vars are request-scoped expressions (https://docs.usebruno.com/testing/script/vars). Postman resolves five variable scopes, narrowest first, and stores values as strings (https://learning.postman.com/docs/sending-requests/variables/variables/). None of the fetched official pages states what happens to an unresolved variable. This PRD's AC-2 makes that case explicit: refused before any side effect.
- **Node-side seeding.** Cypress's `cy.task` is the established escape hatch for DB seeding and CLI calls from tests, and it fails when the handler returns `undefined`, forcing an explicit value (https://docs.cypress.io/api/commands/task). Cypress aliases reset before every test (https://docs.cypress.io/app/core-concepts/variables-and-aliases), the same per-case scoping this PRD gives variables.
- **Partial automation.** Cucumber distinguishes `pending` and `undefined` from `failed`, and steps after a pending step are skipped, not run (https://cucumber.io/docs/cucumber/api/). That is the closest precedent for a human remainder. No primary source was found for per-step hybrid outcomes in TestRail, Xray or Zephyr.
- **Grounding.** Playwright recommends user-facing locators (`getByRole`, `getByText`) over CSS/XPath. Its locators are strict and throw on more than one match, and ARIA snapshots serialize the accessibility tree as role plus accessible name (https://playwright.dev/docs/locators). This is the basis for AC-13.
- **Read-only SQLite.** A vendor blog argues that the read-only open flag alone does not stop writes such as `VACUUM INTO`. It applies `PRAGMA query_only` and re-checks it per statement, using `prepare()` so that a multi-statement string cannot smuggle a pragma change (https://libredb.org/blog/sqlite-agent-read-only-two-controls/). It is a single non-primary source, so Open Question 1 stays open.

**Technical Context**

- **Plan vocabulary.** Steps are flat objects validated per step. The HTTP driver has one action, `request`, with `expect_status`/`expect_body_contains`/`expect_json`. The browser driver has `goto`, `click`, `fill`, `expect_visible`, `expect_text` and `expect_url`. Any other action rejects the whole entry with `PLAN_ENTRY_INVALID`, and an entry with no expectation is `NO_EXPECTATION` (`plugins/relay/scripts/qa-run.mjs:785-836`). The command doc shows only `steps: []` and abbreviates the HTTP step in a form that reads as nested (`plugins/relay/commands/relay-qa-run.md:152-158`). Its honesty rules tell the agent to omit any case needing a CLI or a database query (`relay-qa-run.md:147-176`).
- **Required state.** `none`/`n/a` seeds nothing; `role-only` needs a declared role; `declared` looks up the exact required-state text in `qa-seed.json` `states[<text>] = {command: [argv]}`; anything else is `STATE_UNDECLARED`. Seeds are cached per state text per run (`qa-run.mjs:1153-1176`). `runSeed` guards only argv elements containing `://`, and then spawns with `shell: false`, `stdio: 'ignore'` and a 120 s timeout, so stdout is discarded and a seed reaching a non-local store through env or config is not caught (`qa-run.mjs:1183-1193`). No command generates `qa-seed.json`. `/relay-qa-report` writes the required state as free text (`relay-qa-report.md:95`).
- **Planning and drivers.** One plan entry per case: a missing entry is `NO_PLAN_ENTRY`, a driver other than `http`/`browser` is `NO_ACTIVE_DRIVER`, and the first failing step ends the case with no per-step record (`qa-run.mjs:1509-1522`). The HTTP driver uses Playwright's request context on the single target origin. It attaches the session's storage-state and, when a token exists, the token artifact's header or `Authorization: Bearer`. Every step path is pre-checked by `resolveStepUrl` and refused `FAILED_NON_LOCAL_TARGET` on any other origin (`qa-run.mjs:844-916`, `1530-1534`).
- **Record resolution.** A cited path is matched against the JUnit testcase `file`/`classname` with `loc === p || loc.endsWith('/'+p)`, and test names are used only to list failures (`qa-run.mjs:1341-1393`).
- **Contract.** `OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human']` (`qa-run.mjs:53`). `results.json` schema 1 carries `counts` as a four-key partition, `record_resolved`, `human_gate`, and per-case `outcome`/`reason_code`/`evidence` (`qa-run.mjs:1748-1765`). The `qa-run-contract` check pins the vocabulary, the guard marker, the single write helper, the human-gate statement, and the shape of any tracked `results.json` (`scripts/validate/checks/qa-run-contract.mjs:6-24`). `auth-local-guard-sites` enumerates guard sites. `scripts/validate/index.mjs` registers 28 checks, the last being `runQaRunContractCheck`.
- **Gaps.** The detailed rules of `redaction-policy.md`, the report-parsing code (~`qa-run.mjs:321-470`) and the `qa-run*.test.mjs` corpus were not read in this pass. They belong to the phase plans.

---

*Generated: 2026-10-05*
*Approved: 2026-10-05*
*Status: APPROVED*
