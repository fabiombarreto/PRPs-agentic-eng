# QA Runner: AI-Executable Steps (vocabulary v3)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a PRD downstream stages consume); impact on shared contracts (`qa-run.mjs` plan vocabulary, reason-code catalogue, `plan.json`, `results.json`, `qa-seed.json` declarations, `login.config.json`); secret handling in run evidence (extracted verification codes, judged captures); new network- and store-touching sites under the local-only guard (local mail and SMS sources); a new command-script interaction (verdicts recorded by the command session through a script mode); plugin packaging (provisioning the visual tooling's dependencies)
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent, outward-effect cases run only against local stand-ins the project declares, secrets never reach reports
  - [2026-10-06] "Provisioning the visual tooling's `node_modules` in every new plugin cache is a registered backlog item (F10)": folded into this PRD at the operator's request (2026-10-20); its three required decisions (where the install happens, what the halt names, how it is verified) are answered by AC-20 and Phase 7
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the frozen pre-run classification, partial plans stay `needs-human` with `PARTIAL_REMAINDER`, the plan-side-only boundary, `/relay-qa-report` unchanged
  - [2026-04-19] "Secret redaction policy for Test Runner reports": layered policy, per-project extensions
  - [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`"
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": extracted verification codes, session values and judged captures are the leak surfaces
  - "Writing pipeline artifacts under `.claude/`"
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic": the pre-run classification, the dedicated-role flag and the channel sources are declared, never inferred
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and never asks the user a question; judgments are made by the command session's model, not asked of the user
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - Command versus script separation: the command owns judgment (the plan and the verdicts), the script owns every deterministic mutation, including writing each recorded verdict
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`), including the new channel sources
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
- Result: PROCEED
```

## Problem Statement

`/relay-qa-run` 0.46.0 executed 27 of the 74 objective steps of the two reference reports (36.5%), drove 2 of the 3 automatable cases, and left 9 of the 14 reference cases ending `needs-human`, while every pass it produced was true. Most of what it did not execute is not impossible for an AI agent: a field whose label is not associated with its input, a post-save message, a search that needs a query the report does not spell out, a preview that needs a visual judgment, a pt-BR reading, a verification code that a local mail catcher could hold. The runner declines them because its vocabulary is closed around what a script can ground before the run, and because judgments are reserved for a person. Every such step lands on the operator at the human gate, which is the cost the runner exists to remove. The operator's directive (2026-10-20) is that `needs-human` must mean only what no AI agent can execute alone.

## Evidence

- Phase 8 dogfood of `qa-runner-grounding-vocabulary-v2` (`PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/dogfood-report.md`, counted runs `20261019T151016088Z` and `20261019T181712742Z`): T1 classification 14/14, T2 driver-executed automatable 2/3, coverage 27/74 = 36.5% (super-ensino 18/52, praesto-sum 9/22), 27 passes read TRUE, 0 false, secrecy and privacy scans clean.
- Lost steps by cause in that run: inputs with no accessible name (`InputIcon`, KD-8) 6 steps and T-1's driver-executed status; S-4's error shown only after a submit the report does not describe (KD-10) 15; case 20's search half needs a query text the report does not give (KD-17) 10; a post-save state that cannot be grounded without saving at plan time (KD-12) 8; unnamed avatar buttons and an unstated HTTP method (KD-11) 5; a group-scoped absence and a collapse state behind a live-count name (KD-17) 3.
- Steps classed human by nature in the same reports that an AI agent can execute: S-5's preview judgment, case 20's pt-BR reading and UI/UX checklist (visual and language judgments); T-3's and S-3's verification codes, when the project routes mail or SMS to a local catcher.
- KD-9: closed modals stay in the DOM with `opacity: 0` and Playwright reports them visible, so a positive assertion on modal content would pass with the modal closed. Playwright documents this ("Elements with opacity:0 are considered visible", https://playwright.dev/docs/actionability); `qa-run.mjs` has no opacity or `aria-hidden` handling, and `expect_text` reads `textContent` with no visibility check (`plugins/relay/scripts/qa-run.mjs:2569-2575`).
- OBS-4/PS17: the final evidence is one viewport screenshot (`qa-run.mjs:2743`, `page.screenshot` with masks only); in case 20 it cut off the expanded rows, and the grounding snapshots had to serve as the independent evidence.
- KD-18: record resolution checks only the JUnit artifact's mtime against the record's `generated_at` (`qa-run.mjs:3371`); 11 of praesto-sum's 19 record-resolved passes cited tests importing code changed after the record, which only a manual re-run settled (75/75).
- KD-15: praesto-sum's `login-owner.mjs` carried `auth-login/1` and halted `FAILED_KIT_SCRIPT_STALE` only at the first `ground`, which reports it as `SESSION_UNAVAILABLE (FAILED_KIT_SCRIPT_STALE)` (`qa-run.mjs:4266-4267`); the fix needed the operator.
- F10: the 0.46.0 plugin cache had no Playwright `node_modules`; the dogfood copied it by hand from 0.45.0, as every dogfood since 0.40.0 needed a manual step. The halt text names the repository path (`qa-run.mjs:3606-3608`), and ground mode gives no remediation (`:4246-4247`).
- KD-14/KD-16: the T-1 and A-1 seed states capture no `username`, so profile fields could only be checked `not_empty`; case 20's seeded occurrence title is not a capture, so the plan asserted an older row.

## Proposed Solution

Make `needs-human` a narrow, declared category and give the runner the means to execute everything else. A closed "impossible" sub-catalogue names the only reasons a step may stay human (a physical device or production, a real external channel with no declared local stand-in, a step the report reserves for a person); every other non-executed step is a named gap that counts against the metric. The vocabulary grows where the dogfood lost steps: visibility that honours `opacity` and `visibility`; locators resolved at run time from the report's own words, scoped to a group and tolerant of a live count; a label-text locator for inputs whose label is not associated; an indexed item inside a grounded container; an `expect_requests` method set; inputs the planner chooses from captures or the page when the report leaves them open, recorded and validated. Judgments become steps: a `judge` step captures the evidence, the run leaves it pending, the command session judges it from the capture and records a verdict that must cite what it saw through a new script mode, and the case outcome is computed only when every verdict is in. A declared local mail or SMS source lets a step read a verification code into a redacted variable. Writes are allowed only for roles the kit declares dedicated. A preflight makes the environment self-checking (Playwright resolvable from the installed cache, kit scripts current) and record-resolved passes flag stale evidence. Known product defects are executed and reported `fail` with evidence instead of being declined. The reports stay byte-identical so the result is comparable; the frozen pre-run table is re-counted under the new convention before the dogfood. Rejected: having the script call a model API (it would add a credential and a network dependency to a deterministic, local-only script); deprecated Playwright layout selectors for unlabeled inputs (fragile by the vendor's own warning); fixing the target products' accessibility (project work, and the runner must cope with real products).

## Key Hypothesis

We believe an impossible-only `needs-human`, run-time grounding with scoped and structural locators, planner-chosen inputs, model judgment steps, local channel sources and a self-checking environment will let the runner execute nearly every step of a QA report that an AI agent can perform, for the operator of the human validation gate, without a false `pass`.
We'll know we're right when the same two byte-identical reports, re-run on the release that ships this work, show at least 90% of the non-impossible objective steps executed (`pass` or `fail`), every `needs-human` step carrying a catalogued code, zero false `pass` with every negative control failing as it should, zero manual preparation steps on a freshly installed plugin version, at least 80% of the automatable cases driver-executed, and zero secret values or unignored personal-data paths in the run evidence.

## What We're NOT Building

- **A fifth outcome.** The vocabulary stays `pass`, `fail`, `blocked`, `needs-human`. A pending judgment is an internal state of the run, never written as a final outcome.
- **A model call from the script.** `qa-run.mjs` stays deterministic and local; judgments are made by the command session's model and recorded through a script mode.
- **Real external channels, production or devices.** Mail and SMS are read only from local sources the project declares; a step that needs a real channel, a production deploy or a physical device stays `needs-human` with an impossible-class code.
- **Any change to `/relay-qa-report` or to the reference reports.** The metric depends on re-running byte-identical reports.
- **Product fixes in the target projects.** `InputIcon` label association (KD-8), S-4's flow (KD-10) and unnamed controls (KD-11) are project work; the runner must cope with the products as they are.
- **Deprecated layout selectors** (`:right-of`, `:near`, …) or free CSS/XPath written by the planner.
- **Writes for non-dedicated roles.** A write step for a role the kit does not declare dedicated is refused.
- **Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`.** These surfaces stay byte-identical.
- **A 29th validate check.** `qa-run-contract`, `auth-secrecy` and `auth-local-guard-sites` are extended instead.
- **Invocation from `/relay-execute`.** The command stays standalone.
- **Any non-local target, store, origin or channel source.** The local-only guard is permanent.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Executed share of non-impossible objective steps | ≥ 90%, per project and combined | Per-step results (`passed`, `failed`, judged `passed`/`failed`) over the objective steps of the re-frozen pre-run table that are not impossible-class, on one counted run per project of the same byte-identical reports |
| Catalogued `needs-human` | 100% of `needs-human` steps carry a catalogued code; every impossible-class claim matches the re-frozen table | `results.json` per-step and per-case codes, split into the new `needs_human_impossible` and `needs_human_gap` counters, read against the table |
| False passes | 0, and 100% of negative controls fail | Every `pass` and passed step (judged steps included) read against its evidence with the phase-8 worksheet; one negative control per new step kind and per judgment kind, each expected `fail` |
| Driver-executed rate over the automatable class | ≥ 80% | Unchanged definition from v2, over the re-frozen automatable cases |
| Manual preparation on a fresh plugin version | 0 steps | A fresh install runs `/relay-qa-run`'s preflight and the counted runs with no hand-copied `node_modules` and no stale kit discovered mid-run |
| Secrecy and privacy | 0 values, 0 unignored personal-data paths | The phase-8 `post-run-checks.mjs` scans, extended to extracted verification codes |

## Acceptance Criteria (test scenarios)

Mandatory. `tdd: false` in `docs/context/methodology.md` and `test_frameworks: ["node:test"]` is declared, so these are the contract the test pair authors test-after.

- **AC-1 Impossible-only `needs-human`:** Given the reason-code catalogue, when it is read, then every code carries a class `impossible` (`EXTERNAL_CHANNEL`, redefined as "a real external channel with no declared local source", a new `OUTSIDE_LOCAL_ENVIRONMENT` for production or a physical device, and a new `HUMAN_SIGNOFF` for a step the report reserves for a person) or `gap` (every other code, including `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `UNGROUNDABLE_AFTER_INTERACTION`, `VISUAL_JUDGEMENT`, `JUDGEMENT_UNCERTAIN`); and given a run, when it finishes, then `results.json` reports `needs_human_impossible` and `needs_human_gap` step counts beside the unchanged four-key `counts`.
- **AC-2 Counting convention:** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, then it defines an objective step to include judgment and channel steps, defines the metric denominator as every objective step not of impossible class, and states that a pre-run table is frozen under this convention before any counted run.
- **AC-3 A known product defect is executed:** Given a plan entry for a case whose expected behaviour the product does not show, when the case runs, then it ends `fail` with evidence naming the failing step; `PRODUCT_DEFECT` is accepted only for a case that cannot start, and it is class `gap`.
- **AC-4 Opacity-aware visibility:** Given a fixture page with an element at `opacity: 0` (or `visibility: hidden`) matching a step's locator, when an `expect_visible` or `expect_text` step targets it, then the step fails, and when an `expect_not_visible` step targets it, then the step passes; the decision uses Playwright visibility AND `Element.checkVisibility({ opacityProperty: true, visibilityProperty: true })`.
- **AC-5 Fuller evidence:** Given any browser case, when its final capture is taken, then it is a full-page screenshot with the password and `expect_value` masks applied; and a `judge` step with a locator scope also writes an element screenshot of that scope.
- **AC-6 Run-time grounding from the report's words:** Given a locator step whose `role`+`name` or `text` appears verbatim in the case's manual steps, when no grounding snapshot lists it, then the plan is valid and the step resolves at run time, passing on exactly one match and ending the case `needs-human` `STEP_UNGROUNDED` (class `gap`) on zero or several; and given a locator taken neither from the report's words nor from a snapshot entry with `matches` 1, then the entry is `PLAN_ENTRY_INVALID`.
- **AC-7 Group scope and live counts:** Given a step with `within: { role, name }`, when it runs, then its locator matches only inside the single element the scope resolves to (chained locators, not `locator.within`), so an `expect_not_visible` inside a group passes when the element exists only elsewhere; and given `name_prefix` in place of `name`, then the accessible name matches by prefix, so a header whose name embeds a live count resolves without copying the count.
- **AC-8 Label-text locator:** Given a fixture where a text "E-mail*" and one input share their nearest common container and the label has no `for` or `aria-label`, when an `expect_value` or `fill` step names `{ "label_text": "E-mail*" }`, then the step acts on that input; and given two inputs in that container, then the case ends `needs-human` `STEP_UNGROUNDED`.
- **AC-9 Indexed item in a container:** Given unnamed buttons inside a grounded container, when a `click` step names `{ "within": {…}, "role": "button", "index": 0 }`, then it clicks the first one, and an index past the last element ends the case `needs-human` `STEP_UNGROUNDED`.
- **AC-10 Method set for requests:** Given `expect_requests` with `"method": ["POST", "PATCH", "PUT"]`, when the page issues one PATCH to the matching path, then the step counts 1 and passes; a single-string `method` behaves as in 0.46.0.
- **AC-11 Planner-chosen inputs:** Given a plan entry with `chosen_inputs` (each with the step index, `source` of `capture` or `snapshot`, and a reason), when it is validated, then a chosen literal that appears in no grounding snapshot of the run directory and is not a declared `{{capture}}` makes the entry `PLAN_ENTRY_INVALID`, and an expectation may reference a chosen input (for example `expect_value equals` the value a `fill` set).
- **AC-12 Writes only for dedicated roles:** Given a step marked `"effect": "write"`, when the entry's role is not declared `"dedicated": true` in `PRPs/auth/login.config.json`, then the case is `blocked` `ROLE_NOT_DEDICATED` before any session, seed or request; for a dedicated role the step runs.
- **AC-13 Judge step lifecycle:** Given a `judge` step (`kind` of `visual`, `language` or `checklist`, a `criterion`), when `run` reaches it, then the runner writes its capture and records the step `pending-judgment`, and the case has no final outcome; when `qa-run.mjs judge --run-dir <dir> --case <n> --step <k> --verdict pass|fail|uncertain --evidence "<what the capture shows>"` records every pending step, then `results.json` is recomputed through the single write helper with judged steps flagged `judged_by: "model"`; a verdict without `--evidence` is refused, and `uncertain` ends the case `needs-human` `JUDGEMENT_UNCERTAIN`.
- **AC-14 Judgment criteria come from the report:** Given a `judge` step whose `criterion` does not appear verbatim (whitespace-collapsed) in the case's manual steps, when the entry is validated, then it is `PLAN_ENTRY_INVALID`.
- **AC-15 Local mail source:** Given `channel_sources.mail` declared in `PRPs/auth/qa-seed.json` as `{ "kind": "mailpit", "url": "http://localhost:8025" }`, when a `read_message` step with `channel: "mail"`, a `to` bound to a capture, and `extract: { "regex": …, "as": "code" }` runs after the action that sends the message, then the newest matching message received after the case started is read through the Mailpit search API, the first regex group is bound to `{{code}}` for later steps of the case and registered as a secret, and no evidence, reason or terminal line carries it; a non-local `url` blocks the case `FAILED_NON_LOCAL_TARGET` before any request, and a case needing mail with no declared source declines `EXTERNAL_CHANNEL` (impossible).
- **AC-16 Local SMS source (Could):** Given `channel_sources.sms` declared as `{ "kind": "file", "path": "<relative path>" }`, when a `read_message` step with `channel: "sms"` runs, then the newest entry written after the case started is read with the same extraction and secrecy rules; a path outside `target_root` is refused.
- **AC-17 Kit staleness before planning:** Given a `PRPs/auth/login-<role>.mjs` whose `KIT_TEMPLATE_ID` differs from the installed template, when `/relay-qa-run` runs its preconditions, then it halts `FAILED_KIT_SCRIPT_STALE` naming the stale roles and the `/relay-auth-scripts --role <role> --refresh` line before any `init` or `ground`, and `ground` reports the same code by name instead of `SESSION_UNAVAILABLE`.
- **AC-18 Preflight:** Given `qa-run.mjs preflight --root <dir>`, when it runs, then it reports, with no network, whether Playwright resolves and from which path, whether the Chromium build that version needs is installed, whether every kit script is current, and whether `PRPs/auth/.sessions/` is ignored, exiting non-zero on any failure.
- **AC-19 Record staleness flag:** Given a record-resolved case whose cited test files statically import a source file changed in git after the record's `generated_at`, when the case resolves, then its evidence lists those files and `results.json` carries a `RECORD_STALE` warning for the case; the outcome is unchanged.
- **AC-20 Fresh-cache dependencies (F10):** Given a fresh plugin cache copy of the release, when `/relay-qa-run` first needs Playwright, then either it resolves with no manual step, or the run halts `FAILED_PLAYWRIGHT_UNAVAILABLE` naming the resolved cache path (`${CLAUDE_PLUGIN_ROOT}/scripts/visual/` or the data directory chosen in Phase 7) and the one command that provisions it, in every mode (`run`, `ground`, `preflight`); a test proves it against a cache-shaped directory, not the repository root.
- **AC-21 Secrecy unchanged:** Given a run with a judged step and a `read_message` step, when the phase-8 secrecy scan runs, then no session value, token or extracted code appears in any run file, and every capture and message-derived file sits in the ignored `evidence/` directory.
- **AC-22 The command doc and the usage text match the script:** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, then every new step and key has a literal flat example preceded by its `<!-- qa-step-example driver=… -->` marker that validates against the script, the `judge` and `preflight` modes appear in the usage text, and the counting convention of AC-2 is present.
- **AC-23 Seed-capture guidance:** Given `plugins/relay/commands/relay-qa-seed.md` and `relay-qa-run.md`, when they are read, then they recommend capturing the identity of the seeded account (`username`) and the names or titles of seeded entities, and show `equals {{username}}` on a profile field.
- **AC-24 The suite stays green:** Given the finished work, when `npm run validate` and the corpus `node --test "scripts/validate/**/*.test.mjs"` run, then all 28 checks pass and the corpus is green.
- **AC-25 Release cut:** Given the release phase, when it completes, then `plugin.json` carries a minor bump with its changelog entry, the `documentation/` pages follow `documentation/AGENTS.md`, and the new version is installed.
- **AC-26 The metrics hold on the dogfood:** Given the same two byte-identical reports and a pre-run table re-frozen under AC-2 before the run, when the counted run of each project is read, then at least 90% of the non-impossible objective steps are executed per project and combined, every `needs-human` step carries a catalogued code with every impossible-class claim matching the table, the driver-executed rate over the automatable class is at least 80%, no `pass` is false and every negative control fails, the secrecy and privacy scans find zero values and zero unignored personal-data paths, and the preparation needed no manual step.

## Open Questions

- [ ] F10's mechanism: a lockfile so Claude Code's own cache-time install provides the npm packages (it runs with `--ignore-scripts`, so Chromium stays separate), a consent-gated provisioning into `${CLAUDE_PLUGIN_DATA}`, or both. A short verification at the start of Phase 7 decides it for this repository's marketplace type.
- [ ] Whether `super-ensino` adopts a local mail catcher (an operator change to that project's `EMAIL_HOST`), which decides whether T-3 is executable or impossible in the re-frozen table.
- [ ] `super-ensino`'s SMS backend and whether it has a local file or log sink; until known, S-3 stays impossible.
- [ ] Whether the record-staleness flag should also offer to re-run the cited test files through the project's declared test command (a Could beyond AC-19).
- [ ] Whether the parent PRD's Phase 8 closes on an amended signal before this work starts (operator decision recorded in `qa-runner-grounding-vocabulary-v2.prd.md`).

---

## Users & Context

**Primary User**
- **Who:** the operator who runs `/relay-qa-run` on a feature's QA report before the human validation gate, today on `super-ensino` and `praesto-sum`.
- **Current behavior:** runs the command, gets most cases back `needs-human`, reads the evidence case by case and executes the remainder by hand.
- **Trigger:** a `qa-report.md` ready for the human gate.
- **Success state:** almost every step executed with evidence they trust, the human remainder limited to what truly needs a person, and no manual preparation of the plugin or the kit.

**Job to Be Done**
When a QA report is ready for the human gate, I want the runner to execute every step that the product and the report make reachable, with evidence I can trust, so I spend my manual time only on what truly needs a person.

**Non-Users**
Projects without a local environment (the local-only guard is permanent); the health-family projects, which are never targets; end users of the tested applications; the autonomous pipeline, since the runner stays standalone and out of `/relay-execute`.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Impossible-class sub-catalogue, `needs_human_impossible`/`needs_human_gap` counters, counting convention (AC-1, AC-2) | Makes "only what an AI cannot do" measurable and stops a gap from hiding as human by nature |
| Must | Known product defects executed and reported `fail` (AC-3) | A defect is a QA result, not a reason to stop |
| Must | Opacity-aware visibility; full-page and element captures (AC-4, AC-5) | KD-9 is a false-pass hazard; PS17 hid the evidence of executed steps |
| Must | Run-time grounding from report words; group scope; name prefix; label-text locator; indexed item; method set (AC-6 to AC-10) | Recovers the steps lost to KD-8, KD-11, KD-12 and KD-17 without product changes |
| Must | Planner-chosen inputs and dedicated-role writes (AC-11, AC-12) | Lets the runner fill what the report leaves open (T-2's new value, case 20's query) and perform writes safely |
| Must | `judge` steps with recorded, evidence-citing verdicts (AC-13, AC-14) | Moves visual, language and checklist judgments from the human to the AI |
| Must | Kit staleness before planning, preflight, fresh-cache dependencies (AC-17, AC-18, AC-20) | Zero manual preparation; F10 folded in |
| Must | Dogfood on the same two reports (AC-26) | The hypothesis is measured, not assumed |
| Should | Local mail source and `read_message` (AC-15) | Turns verification-code flows into executable steps where a local catcher exists |
| Should | Record staleness flag (AC-19) | KD-18: a record-resolved pass can describe old code |
| Should | Seed-capture guidance (AC-23) | KD-14/KD-16: stronger assertions and the seeded row, not an older one |
| Could | Local SMS file source (AC-16) | No local SMS catcher with an HTTP API exists; a file sink is the realistic form |
| Won't | A model call from `qa-run.mjs` | Keeps the script deterministic, local and credential-free |
| Won't | Real channels, production, devices | Impossible class by definition |
| Won't | Product fixes, report regeneration, frozen-surface edits | Out of this repository's scope or frozen |

### MVP Scope

Every Must row, proven by the dogfood (AC-26). The Should rows are planned in their own phases and may be descoped by a recorded operator decision without blocking the release; the Could row is attempted only after the Should rows land.

### User Flow

`/relay-qa-run <feature>` → preconditions (kit current, preflight) → `init` → `parse`, `ground`, plan with run-time and scoped locators, chosen inputs and `judge` steps → `run` (driver steps execute; judged steps capture and wait) → the same session reads each pending capture and records a verdict citing what it shows through `qa-run.mjs judge` → `results.json` final → summary with impossible and gap counters → HUMAN GATE STILL OPEN.

---

## Technical Approach

**Feasibility:** MEDIUM. Most of the work extends patterns the runner already has (locator forms, grounding checks, catalogue validation, guard sites, single write helper). The new pieces are the run-then-judge cycle between the command session and the script, and the channel sources.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

### Architecture Notes

- **Judgment stays in the command.** `run` leaves judged steps `pending-judgment` and writes no final `results.json` outcome for those cases; `judge` records one verdict per call through the single write helper and recomputes the case and the summary when the last pending verdict arrives. The command doc instructs the session to read each capture (and only the capture) before recording, to cite visible evidence, and to answer `uncertain` rather than guess.
- **Run-time grounding keeps the provenance rule.** A locator is valid when its words come from the report or from a snapshot entry with `matches` 1; run-time resolution still demands exactly one match. Scope is a chained locator (`page.getByRole(scope).getByRole(target)` and filters), not `locator.within()`, which needs Playwright 1.64.
- **Label-text locator is a deterministic algorithm.** From the single element whose visible text equals the label, walk up to the nearest ancestor that contains exactly one `input`, `textarea` or `select`; that control is the target, else `STEP_UNGROUNDED`. No layout pseudo-classes.
- **Visibility is a conjunction.** Playwright's visibility check AND `checkVisibility({ opacityProperty: true, visibilityProperty: true })` evaluated on the resolved element; absence is its negation, re-read for the existing 5-second settle.
- **Channel sources are declarations.** `channel_sources` lives beside `query_sources` in `PRPs/auth/qa-seed.json`; every URL passes the local-only guard; extracted values join the redaction table before anything is written.
- **Writes are declared, not detected.** The planner marks write steps; the kit declares dedicated roles; the dogfood reading checks that every request-issuing click was marked.
- **Every existing contract survives.** The four outcomes, `PARTIAL_REMAINDER`, the frozen-table discipline, the single write helper, the per-run `.gitignore`, the guard sites and the 28 validate checks.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A model judgment passes what a person would fail (the session that planned also judges) | M | Verdicts must cite visible evidence; `uncertain` is a gap, never a pass; one negative control per judgment kind in the dogfood; every judged pass read against its capture |
| Run-time writes change shared state or a real account | M | Writes only for roles declared dedicated; the local-only guard; restore steps from the report; dedicated accounts already exist for `super-ensino` |
| Scope size across nine phases | H | One lane on `qa-run.mjs`, phases independently testable; Should and Could rows descopable by a recorded operator decision |
| Structural locators match the wrong control on a re-layout | M | Exactly-one-match rule at run time; the algorithm is text-anchored, not pixel-based; failures surface as named gaps |
| F10's automatic install does not apply to this marketplace type | M | Phase 7 starts with a verification and falls back to consent-gated provisioning with an actionable halt (AC-20) |
| Mail catcher misconfiguration relays real mail | L | The runner only reads from the declared local source; the command doc tells the operator to keep the catcher's relay off; outward-effect cases without a declared source stay impossible |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Impossible catalogue and counting convention | Impossible/gap classes on every reason code; `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`, `JUDGEMENT_UNCERTAIN`, `ROLE_NOT_DEDICATED`; `needs_human_impossible`/`needs_human_gap` counters; product defects executed; the counting convention in the command doc; `qa-run-contract` extended (AC-1, AC-2, AC-3) | complete | - | lane:qa-run | - | PRPs/plans/qa-runner-ai-executable-steps-phase-1-impossible-catalogue-and-counting-convention.plan.md |
| 2 | Visibility and evidence | Opacity-aware visibility for positive, text and absence steps; full-page final capture; element captures for scoped steps (AC-4, AC-5) | complete | - | lane:qa-run | - | PRPs/plans/qa-runner-ai-executable-steps-phase-2-visibility-and-evidence.plan.md |
| 3 | Run-time and scoped locators | Report-word locators resolved at run time; `within`; `name_prefix`; `label_text`; indexed item; `expect_requests` method sets; literal doc examples (AC-6 to AC-10, AC-22 for these steps) | complete | - | lane:qa-run | 1, 2 | PRPs/plans/qa-runner-ai-executable-steps-phase-3-run-time-and-scoped-locators.plan.md |
| 4 | Chosen inputs, dedicated writes and capture guidance | `chosen_inputs` validation; `effect: write` and `dedicated` roles; seed-capture guidance in `relay-qa-seed.md` and `relay-qa-run.md` (AC-11, AC-12, AC-23) | complete | - | lane:qa-run | 3 | PRPs/plans/qa-runner-ai-executable-steps-phase-4-chosen-inputs-dedicated-writes-and-capture-guidance.plan.md |
| 5 | Model judgment | `judge` step and `pending-judgment` state; `qa-run.mjs judge` mode; recomputation through the single write helper; criteria from report words; command-doc judging protocol (AC-13, AC-14, AC-22 for `judge`) | complete | - | lane:qa-run | 1, 2 | PRPs/plans/qa-runner-ai-executable-steps-phase-5-model-judgment.plan.md |
| 6 | Local channel sources | `channel_sources` declarations under the guard; `read_message` with extraction into a redacted variable; mail via Mailpit (Should); SMS file source (Could); literal doc examples (AC-15, AC-16, AC-21, AC-22 for `read_message`) | complete | - | lane:qa-run | 4, 5 | PRPs/plans/qa-runner-ai-executable-steps-phase-6-local-channel-sources.plan.md |
| 7 | Self-checking environment | Verification of F10's mechanism, then fresh-cache dependency resolution or an actionable halt in every mode; `preflight` mode; kit staleness before planning and by name in `ground`; record staleness flag (AC-17, AC-18, AC-19, AC-20) | complete | - | lane:qa-run | - | PRPs/plans/qa-runner-ai-executable-steps-phase-7-self-checking-environment.plan.md |
| 8 | Release cut | Minor bump with changelog, `documentation/` per `documentation/AGENTS.md`, `npm run validate` and the corpus green, install of the new version (AC-24, AC-25) | complete | - | - | 3, 4, 5, 6, 7 | PRPs/plans/qa-runner-ai-executable-steps-phase-8-release-cut.plan.md |
| 9 | Dogfood | Re-freeze the pre-run table under the new convention, run both byte-identical reports with the dedicated accounts, negative controls, read every pass and judged step, run the scans, compare against the metrics (AC-26) | complete | - | - | 8 | PRPs/plans/qa-runner-ai-executable-steps-phase-9-dogfood.plan.md |

### Phase Details

**Phase 1: Impossible catalogue and counting convention**
- **Goal:** make "human" a narrow, declared category and every other decline a measured gap.
- **Scope:** catalogue classes and the four new codes; the two counters in `results.json` (the four-key `counts` unchanged); the `PRODUCT_DEFECT` narrowing; the counting convention and the re-freeze rule in `relay-qa-run.md`; `qa-run-contract` and its tests.
- **Success signal:** a fixture plan with one entry per code produces the expected class split, and a product-defect case ends `fail`.

**Phase 2: Visibility and evidence**
- **Goal:** no step passes on content a person cannot see, and the evidence shows every executed step.
- **Scope:** the visibility conjunction in `expect_visible`, `expect_text` and `expect_not_visible`; `fullPage: true` for the final capture with the existing masks; element captures for scoped steps.
- **Success signal:** the opacity and visibility fixtures of AC-4 pass both ways; a tall fixture page's final capture includes content below the fold.

**Phase 3: Run-time and scoped locators**
- **Goal:** recover the steps lost to unnamed inputs, unnamed repeated controls, post-save states, group scope and live counts.
- **Scope:** the provenance rule extended to report words; run-time resolution; `within`, `name_prefix`, `label_text`, `index`; method sets; literal examples.
- **Success signal:** fixtures for each form pass and their ambiguous variants end `STEP_UNGROUNDED`.

**Phase 4: Chosen inputs, dedicated writes and capture guidance**
- **Goal:** let the planner fill what the report leaves open and write safely.
- **Scope:** `chosen_inputs` with source validation; `effect: write` refusal for non-dedicated roles; the `dedicated` key in `login.config.json` (documented in `relay-auth-scripts.md` without changing generated defaults); the capture guidance.
- **Success signal:** AC-11 and AC-12 fixtures pass; an unmarked chosen literal is refused.

**Phase 5: Model judgment**
- **Goal:** move visual, language and checklist judgments to the AI without weakening "no false pass".
- **Scope:** the `judge` step, the pending state, the `judge` mode, recomputation, the criterion rule, the judging protocol in the command doc (read the capture, cite evidence, prefer `uncertain` to a guess).
- **Success signal:** a fixture run with two judged steps reaches a final `results.json` only after both verdicts; a verdict without evidence is refused; `uncertain` yields `JUDGEMENT_UNCERTAIN`.

**Phase 6: Local channel sources**
- **Goal:** read verification codes from local catchers the project declares.
- **Scope:** `channel_sources` validation and guard; `read_message` against Mailpit's search API (mocked locally in tests); the SMS file source if the Should row landed; secrecy of extracted values.
- **Success signal:** a local fixture server emulating the Mailpit API yields a code that a later `fill` uses, and the secrecy scan finds it nowhere.

**Phase 7: Self-checking environment**
- **Goal:** zero manual preparation on a fresh plugin version.
- **Scope:** verify whether this repository's marketplace install runs Claude Code's dependency install (lockfile present); implement the chosen mechanism or the consent-gated fallback; halts naming the cache path in `run`, `ground` and `preflight`; the `preflight` mode; kit staleness in the preconditions and in `ground`; the record staleness flag.
- **Success signal:** a cache-shaped fixture directory either resolves Playwright or halts with the path; a stale kit halts before `init`.

**Phase 8: Release cut**
- **Goal:** ship the work as one minor version.
- **Scope:** version, changelog, documentation, validate and corpus, install.
- **Success signal:** the installed version runs `preflight` clean on both target projects.

**Phase 9: Dogfood**
- **Goal:** measure the hypothesis on the same two reports.
- **Scope:** re-freeze the pre-run table (classes, impossible-class steps, objective-step counts) before the run; counted runs on `super-ensino` and `praesto-sum` with the dedicated accounts; one negative control per new step kind and judgment kind; the phase-8 worksheet and post-run checks extended to judged and channel steps; the comparison with 0.46.0.
- **Success signal:** AC-26 read and reported, met or not, with every miss attributed to a named cause.
- **Results (relay 0.47.0, read 2026-10-23; evidence in `PRPs/reports/qa-runner-ai-executable-steps/phase-9/`: `dogfood-report.md`, `metrics-final.txt`, `controls.json`, `close-decision.md`):**
  - **Counted runs:** `super-ensino` `20261023T150701048Z` (pass 5, fail 0, blocked 1, needs-human 6) and `praesto-sum` `20261023T175308972Z` (pass 1 driver-executed plus 19 record-resolved, needs-human 3), both reports byte-identical to the frozen hashes.
  - **Met:** M1 (16/16 frozen classes), M2 (3/3 automatable), M5 (27 passes read, 0 false; 13 negative controls as expected, NC-6 run on a GET with a recorded deviation, NC-12 N/A), M6 (scans clean), M7 (zero plugin or kit preparation).
  - **Not met:** M3a (28/63 = 44.4% and 3/24 = 12.5%), M3b (31/87 = 35.6%) and M4 (`STEP_NOT_PERFORMABLE` and `PLAN_ENTRY_INVALID` are not decline codes). The 56 lost steps are attributed: case 20 plan-authoring error under the all-or-nothing prefix rule (21), S-4 submit-gated error message (15), T-2 select options and success text absent from the report (8), S-6 unnamed avatar items (7), S-5 devtools panel and onboarding overlay (3), X-1 error page (2). Findings KD-19..KD-23 and OBS-1..OBS-4.
  - Against 0.46.0: 27 of 74 (36.5%, earlier convention) and 31 of 87 (35.6%, vocabulary v3), not mixed.
- **Phase 9 is complete under the amended signal (operator, 2026-10-23).** AC-26 was read and reported with every miss attributed; the ≥ 90% executed-step target was **not met**, and its causes are input to a follow-up PRD.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| What `needs-human` may mean | Only an impossible-class reason: real external channel with no local source, production or a physical device, a step the report reserves for a person (operator, 2026-10-20) | Keep the v2 classes, where visual judgment and channels were human by nature | The operator's directive: only steps no AI agent can execute alone stay human |
| Primary metric | ≥ 90% of non-impossible objective steps executed (`pass` or `fail`), per project and combined (operator, 2026-10-20) | v2's 70% over automatable and needs-a-new-driver steps; a runner-reachable denominator excluding product-blocked steps | Counts the steps that moved from human to AI and keeps product-blocked steps in, because the runner is now expected to cope with them |
| F10 | Folded into this PRD (operator, 2026-10-20) | Keep it as a separate backlog item | It cost a manual step in every dogfood since 0.40.0 and blocks "zero preparation" |
| Who judges | The command session's model, recorded through `qa-run.mjs judge` | The script calls a model API; the operator judges | Keeps the script deterministic, local and credential-free, and the command/script split intact |
| Uncertain judgment | `needs-human` `JUDGEMENT_UNCERTAIN`, class `gap` (operator, approved with this PRD on 2026-10-21) | Count it as `fail`; allow a pass with a low-confidence flag | Never a pass without evidence, and measured as a miss so it drives improvement |
| Report/product mismatch | Execute and report `fail` with evidence | Decline with `PRODUCT_DEFECT` or `VOCABULARY_GAP` | A divergence from the report is a QA result the human gate needs to see |
| Unlabeled inputs | Text-anchored nearest-container algorithm with exactly one control | Playwright layout pseudo-classes; planner-written CSS or XPath | Layout selectors are deprecated by the vendor; free selectors break the provenance rule |
| Group scope | Chained locators | `locator.within()` | `within()` needs Playwright ≥ 1.64; the dogfood resolved 1.61.1 from the repository |
| Writes | Only for roles declared `dedicated` | Allow every role; detect writes after the fact | A write cannot be undone after detection; dedicated accounts already exist |
| Reports | Unchanged and byte-identical; the pre-run table re-frozen under the new convention | Regenerate the reports with structured steps | Keeps the before and after comparable |

---

## Research Summary

**Market Context**
- Playwright treats `opacity: 0` elements as visible; zero-size and `visibility: hidden` are not (https://playwright.dev/docs/actionability). `Element.checkVisibility()` has opt-in `opacityProperty` and `visibilityProperty` flags, baseline since 2024 (https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility).
- Locator chaining and `filter({ has, hasNot })` scope a locator relative to a parent; `toHaveCount`/`toHaveText([...])` assert exact lists (https://playwright.dev/docs/locators). `locator.within()` exists from v1.64 (https://playwright.dev/docs/api/class-locator). `locator.screenshot` scrolls into view and supports masks (https://playwright.dev/docs/api/class-locator#locator-screenshot).
- Layout selectors (`:right-of`, `:below`, `:near`) are deprecated and fragile (https://playwright.dev/docs/other-locators).
- Claude Code installs a plugin's Node dependencies into each new cache copy when `package.json` and a supported lockfile are present, with `--ignore-scripts` and a 60 s timeout, and not for plugins loaded in place from a local-path marketplace; `${CLAUDE_PLUGIN_DATA}` persists across updates and is documented for `node_modules` (https://code.claude.com/docs/en/plugins/loading, https://code.claude.com/docs/en/plugins-reference). Browser binaries are a separate, version-coupled download (https://playwright.dev/docs/browsers).
- Mailpit's API lists, searches (`to:`, `subject:`, `after:`, `is:unread`) and deletes messages; `latest` returns the newest message (https://raw.githubusercontent.com/axllent/mailpit/master/server/ui/api/v1/swagger.json, https://mailpit.axllent.org/docs/usage/search-filters/). Django's SMTP backend can feed a local catcher; console, file and locmem backends exist for development (https://docs.djangoproject.com/en/stable/topics/email/). No SMS catcher with an HTTP API was found; `django-sms` offers console, file and locmem backends (https://django-sms.readthedocs.io/).
- Multimodal judges agree with humans on pair comparison but diverge on scoring; bias and hallucination persist (https://arxiv.org/abs/2402.04788). A GUI-trajectory judge reported kappa ≈ 0.83 against human annotators, with false positives when the state was hidden (https://arxiv.org/pdf/2604.27776; figure seen in a search excerpt, not confirmed on the page). No controlled study of mitigations for UI-screenshot judges or of judging on-screen language was found.

**Technical Context**
- Locator steps resolve through `getByRole(role, { name, exact: true })` or `getByText(text, { exact: true })`; `expect_visible` waits for `state: 'visible'`; `expect_not_visible` polls `isHidden()` for 5 s; `expect_text` reads `textContent` with no visibility check; no opacity or `aria-hidden` handling exists (`plugins/relay/scripts/qa-run.mjs:2492-2575`).
- The final capture is `page.screenshot({ mask })` at the default viewport, or redacted text when the page holds a secret (`qa-run.mjs:2736-2749`).
- `ground --prefix` accepts only `goto`, `click`, `fill`, at most 5 steps, refuses `{{name}}`, and has no code-level refusal of a save or submit; `precheckGroundedSteps` matches post-interaction snapshots by prefix hash (`qa-run.mjs:3944-3994`, `:1789-1821`).
- Record resolution records run id, attempt, `generated_at` and per-file testcases, and checks only the JUnit mtime against `generated_at` (`qa-run.mjs:3352-3421`).
- `staleKitScript` compares `KIT_TEMPLATE_ID` with the installed template inside `obtainSession`; `ground` reports it as `SESSION_UNAVAILABLE (FAILED_KIT_SCRIPT_STALE)` (`qa-run.mjs:2866-2881`, `:4266-4267`).
- `loadPlaywright` tries the target's `package.json`, then `plugins/relay/scripts/visual/package.json`; halt texts name the repository path; `provision.mjs` installs only Chromium (`qa-run.mjs:2082-2091`, `:3606-3608`, `:4246-4247`).
- Declared captures are substituted into every string leaf of every step, `fill` values included, after the seed runs (`qa-run.mjs:3636-3644`).
- `qa-run-contract` runs with seven requirement flags and pins code sections by markers; about 30 glob-discovered `*.test.mjs` files exercise the runner; `auth-secrecy` pins the run ignore rules (`scripts/validate/checks/qa-run-contract.mjs:908-924`).

---

*Generated: 2026-10-20*
*Approved: 2026-10-21*
*Status: APPROVED*
