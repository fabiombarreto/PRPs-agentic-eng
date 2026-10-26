# QA Runner: Step-Level Resilience (vocabulary v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a PRD downstream stages consume); impact on shared contracts (`qa-run.mjs` plan vocabulary and validation, the reason-code catalogue, `plan.json`, `results.json`, `PRPs/auth/qa-seed.json` declarations); new interactions with the local application (validation submits, declared overlay dismissals) under the local-only guard and the dedicated-role rule; the dogfood metric kit
- Decisions found:
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3): item 2 (a known product defect is executed and ends `fail`), item 6 (report-word locators resolve at run time), item 7 (writes only for roles declared `dedicated`), item 11 (environment signals stay outside the reason-code catalogue)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` Decisions Log: report/product mismatch is executed and reported `fail`; writes only for dedicated roles; `uncertain` judgments never count as executed; reports unchanged and byte-identical
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons are fixed sentences, never page text
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a richer failure cause must be a closed classification, never the raw Playwright error or page text
  - "Writing pipeline artifacts under `.claude/`"
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic": overlay handlers and seeds are declared by the project, never inferred
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and non-interactive
  - "Mutating a target project's working tree from a review agent"
- Applicable architectural rules:
  - Interactivity boundary: no new extension
  - Command versus script separation: the command plans and judges, the script validates, executes and records
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`)
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`
- Result: PROCEED
```

## Problem Statement

`/relay-qa-run` 0.47.0 executed 31 of the 87 non-impossible objective steps of the two reference reports (35.6%) in the phase-9 dogfood, against a target of 90%, with zero false passes and every negative control correct. The 56 lost steps are not lost to impossibility: one mis-grounded step refused case 20's whole entry (21 steps), an error message reachable only after a validation submit kept S-4 out (15), unnamed elements, overlays and post-interaction elements kept T-2, S-6 and S-5 out (18), and a product defect stopped X-1 at its first failing assertion (2). Every such step lands on the operator at the human gate, the cost the runner exists to remove, and the 0.47.0 vocabulary did not move the metric from 0.46.0 (36.5%).

## Evidence

- The phase-9 dogfood of the earlier PRD `qa-runner-ai-executable-steps` (`PRPs/reports/qa-runner-ai-executable-steps/phase-9/dogfood-report.md`, `metrics-final.txt`; counted runs `20261023T150701048Z` and `20261023T175308972Z`): M3a super-ensino 28/63 = 44.4%, praesto-sum 3/24 = 12.5%; M3b 31/87 = 35.6%; M4 not met (`STEP_NOT_PERFORMABLE`, `PLAN_ENTRY_INVALID`); M1, M2 (3/3), M5 (27 true, 0 false, 13 controls), M6, M7 met.
- Lost steps by named cause (dogfood report section 8): case 20 plan-authoring error under the all-or-nothing prefix rule 21 (KD-22); S-4 submit-gated error message 15; T-2 select options and success text absent from the report 8; S-6 unnamed avatar items 7; S-5 devtools panel and onboarding overlay 3 (KD-19, KD-20); X-1 error page 2 (KD-23).
- KD-21: NC-6 needed three attempts because `STEP_NOT_PERFORMABLE` reads the same for a covered, a disabled and a missing target; `plugins/relay/scripts/qa-run.mjs:3519-3526` swallows the Playwright error in a bare `catch {}`.
- KD-22: `plugins/relay/scripts/qa-run.mjs:2299-2348` returns the first grounding refusal as `PLAN_ENTRY_INVALID` for the whole entry.
- KD-23: `plugins/relay/scripts/qa-run.mjs:3475-3518` turns a report-word locator that matches nothing into `needs-human` `STEP_UNGROUNDED`, so X-1's product defect (an error page where the report expects the login page) read as a planning gap.
- OBS-1 and OBS-2: `PRPs/reports/qa-runner-ai-executable-steps/phase-9/pass-worksheet.mjs:58-60` prints `label_text`, `name_prefix` and `index` locators as `undefined`; `compute-metrics.mjs:142-148` reports run-time and validation codes as uncatalogued declines.

## Proposed Solution

Make a plan entry degrade by step instead of failing whole, and make every lost step either executed or named precisely. The validator keeps the valid steps of an entry and turns each ungrounded step into a named gap; a failed action reports a closed cause (covered, disabled, not editable, absent, detached); an element the report names that the product does not show is a `fail`; a failed assertion no longer consumes the rest of the case's assertions. Four vocabulary additions reach the steps the reports describe without literal text: a role-only presence assertion inside a scope, a closed `number` pattern for a value the report says is shown but does not state, a scope anchored on a visible text for unnamed controls, and a validation submit that uses the report's own invalid literal on a dedicated role. Overlays the project knows about (a dev tools panel, an onboarding tour) are dismissed by handlers the project declares in its kit, built on Playwright's `page.addLocatorHandler`, with every dismissal recorded. This keeps the boundaries of vocabulary v3 (no planner-written selectors, no forced clicks, writes only on dedicated roles, local-only guard) rather than loosening them.

## Key Hypothesis

We believe step-level validation, closed failure causes, non-consuming assertions, the four vocabulary additions and declared overlay handlers will let the runner execute the objective steps the 0.47.0 dogfood lost for the AI agent driving `/relay-qa-run`.
We'll know we're right when the counted runs of the same two byte-identical reports execute at least 90% of the non-impossible objective steps in each project and over both, with zero false passes and every negative control ending as expected.

## What We're NOT Building

- Planner-written CSS or XPath selectors — the v3 rule stands: locators come from the report's words or a snapshot entry.
- Forced actions (`force: true`) to click through an overlay — a forced click hides the very obstruction a person would hit.
- A change to the `uncertain` policy — an uncertain judgment still does not count as executed.
- Real external channels, production targets or physical devices — the impossible class and the local-only guard are unchanged.
- Rewriting or regenerating the reference reports — they stay byte-identical.
- Prefixing a submit in `ground --prefix` — the plan-time replay still never submits, saves, deletes or sends.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| M3a executed share per project | super-ensino ≥ 57/63; praesto-sum ≥ 22/24 (≥ 90%) | `compute-metrics.mjs` over the counted `results.json`, against the frozen denominators |
| M3b executed share over both | ≥ 79/87 (≥ 90%) | same |
| M5 false passes and controls | 0 false passes; every negative control, one per new step kind and failure cause, ends as expected | the two worksheets and `controls.json` |
| M4 catalogued codes | every non-executed case carries a catalogue code; plan defects reported in their own bucket | `compute-metrics.mjs` |
| M7 zero plugin or kit preparation | 0 `plugin` or `kit` entries in `prep-log.json` | `prep-log.json` |

## Acceptance Criteria (test scenarios)

Mandatory. `tdd: false` in `docs/context/methodology.md` and `test_frameworks: ["node:test"]` is declared, so these are the contract the test pair authors test-after.

- **AC-1 An ungrounded assertion is a step gap, not an entry refusal:** Given a plan entry whose third step is an `expect_*` step whose locator is neither a snapshot entry with `matches` 1 nor a word of the case's manual steps, when the entry is validated and run, then steps 1, 2 and 4 onward run, step 3 is recorded `human` with `STEP_UNGROUNDED` and the fixed reason, and the case ends `needs-human` `STEP_UNGROUNDED` only if no executed step failed (a failed step makes it `fail`).
- **AC-2 An ungrounded interaction truncates the rest:** Given an entry whose step 3 is an ungrounded `click`, `fill` or `goto`, when it runs, then steps 1-2 run and count, step 3 and every later step are recorded `human` (step 3 with `STEP_UNGROUNDED`, later steps with a fixed "not run after an ungrounded interaction" reason), and nothing after step 2 acts on the page.
- **AC-3 Malformed entries still refuse whole:** Given an entry with a schema error (an unknown action, a missing required key, an invalid `effect`, an unbound `{{name}}`), when it is validated, then it is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, exactly as in 0.47.0.
- **AC-4 Closed failure cause:** Given fixture pages where a click target is (a) covered by another element, (b) disabled, (c) a non-editable target of a `fill`, (d) absent, (e) detached during the action, when a `click` or `fill` step runs, then the case is `blocked` `STEP_NOT_PERFORMABLE` with a `cause` of `covered`, `disabled`, `not_editable`, `absent` or `detached` respectively (`other` for anything else), the reason sentence names the cause from a fixed list, and no Playwright error text or page text appears in `results.json`.
- **AC-5 A report-named element the product lacks is a `fail`:** Given an `expect_*` step whose locator is grounded only by the case's manual steps and matches no element after the wait, when it runs, then the step is `failed` with cause `absent` and the case ends `fail` with evidence; a locator that matches more than one element still ends `needs-human` `STEP_UNGROUNDED`.
- **AC-6 Assertions do not consume the case:** Given an entry `goto, expect_visible A (fails), expect_visible B, expect_value C`, when it runs, then B and C still run and are recorded, and the case ends `fail`.
- **AC-7 An interaction after a failed assertion stops the case:** Given an entry `goto, expect_visible A (fails), click D, expect_visible E`, when it runs, then `click D` and E are recorded `not-run` with a fixed reason and the page is not touched after the failure.
- **AC-8 Role-only presence inside a scope:** Given `{ "action": "expect_visible", "within": { "role": "dialog", "name": "Validar e-mail" }, "role": "alert" }` with no `name`, when the dialog holds one visible alert, then the step passes; when the only alert is at `opacity: 0`, outside the scope or absent, then it fails; a role-only step without `within` is `PLAN_ENTRY_INVALID`.
- **AC-9 Closed pattern for an unstated value:** Given `{ "action": "expect_text", "role": "button", "name_prefix": "Não concluídas", "pattern": "number" }`, when the element's visible text contains a run of digits, then the step passes, and when it contains none it fails; any `pattern` value outside the closed list is `PLAN_ENTRY_INVALID`, and `pattern` cannot be combined with `contains`.
- **AC-10 Scope anchored on visible text:** Given unnamed buttons under a container that has no accessible name but holds the visible text "Escolha seu avatar", when a step names `{ "within": { "anchor_text": "Escolha seu avatar" }, "role": "button", "index": 0 }`, then the runner resolves the nearest ancestor of that text holding at least one element of the role and acts on the first; zero or several anchors end `needs-human` `STEP_UNGROUNDED`; `anchor_text` follows the same grounding rule as any other word.
- **AC-11 Validation submit:** Given a `click` with `"effect": "validation"` preceded in the same case by a `fill` whose value appears verbatim in the case's manual steps, when the role is declared `dedicated`, then the click runs and the requests it issues are recorded in its evidence; when the role is not dedicated the case is `blocked` `ROLE_NOT_DEDICATED` before any session; when no preceding `fill` uses a report literal the entry is `PLAN_ENTRY_INVALID`; and `ground --prefix` still refuses any step carrying an `effect`.
- **AC-12 Declared overlay handlers:** Given `overlay_handlers` in `PRPs/auth/qa-seed.json` declaring a `trigger` locator and a `dismiss` locator, when a browser case or a `ground` run meets the trigger before an action, then the runner clicks `dismiss` through `page.addLocatorHandler`, the action proceeds, and the case evidence lists each dismissal by handler id and step; an overlay with no declared handler is never dismissed, and a click blocked by it reports cause `covered`.
- **AC-13 Overlay handlers respect writes and the guard:** Given a handler declared `"effect": "write"` (its dismissal persists state), when the case's role is not declared `dedicated`, then the handler is not registered and the run records why; a handler whose dismissal navigates off the guard-approved origin blocks the case `FAILED_NON_LOCAL_TARGET`; handlers never use forced clicks.
- **AC-14 Catalogue covers run-time codes:** Given the reason-code catalogue, when it is read, then `STEP_NOT_PERFORMABLE` carries a class (`gap`) and the closed cause list, and `PLAN_ENTRY_INVALID` is documented as a plan defect (not a decline).
- **AC-15 The command doc and the usage text match the script:** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, then every new key (`pattern`, `anchor_text`, role-only presence, `effect: "validation"`, `overlay_handlers`) has a literal flat example preceded by its `<!-- qa-step-example driver=… -->` marker that validates against the script, and the per-step validation and assertion-continuation rules are stated.
- **AC-16 Dogfood kit fixes:** Given the phase dogfood kit, when `pass-worksheet.mjs` renders a step with `label_text`, `name_prefix`, `within`, `anchor_text` or `index`, then the locator prints in full (no `undefined`), each overlay dismissal is listed, and `compute-metrics.mjs` reports plan defects (`PLAN_ENTRY_INVALID`) in a bucket of their own distinct from uncatalogued declines.
- **AC-17 The suite stays green:** Given the finished work, when `npm run validate` and the corpus `node --test "scripts/validate/**/*.test.mjs"` run, then all 28 checks pass and the corpus is green.
- **AC-18 Release cut:** Given the release phase, when it completes, then `plugin.json` carries a minor bump with its changelog entry, the `documentation/` pages follow `documentation/AGENTS.md`, and the new version is installed.
- **AC-19 The metrics hold on the dogfood:** Given the same two byte-identical reports and the frozen pre-run table, when the counted run of each project is read, then M3a (super-ensino ≥ 57/63, praesto-sum ≥ 22/24) and M3b (≥ 79/87) hold, every pass and judged pass reads TRUE, a negative control exists and ends as expected for each of: per-step validation, interaction truncation, each failure cause, absent-element `fail`, assertion continuation, role-only presence, `pattern`, `anchor_text`, validation submit, overlay handler (fires and records), undeclared overlay (not dismissed), and a write-effect handler on a non-dedicated role; M4, M6 and M7 hold.

## Open Questions

- [ ] S-4's phone half: the report gives an invalid literal only for the e-mail modal ("not-an-email"). Without a report literal for the phone modal, that half stays a named gap under AC-11, costing up to 7 steps of super-ensino's 6-step margin. Does the operator accept the gap, or is the report's wording the place to fix it (out of scope here)?
- [ ] Is the 0.47.0 frozen pre-run table reused as is (same denominators 63/24/87), or re-frozen with a dated addendum?
- [ ] Do the super-ensino overlays (React Query devtools `initialIsOpen={true}`, the student onboarding tour) get overlay handlers in the kit, or does the project change its dev entry? Handlers are the plugin-side answer; the project-side change is the operator's.

---

## Users & Context

**Primary User**
- **Who:** the AI session that runs `/relay-qa-run` in a target project: it writes the plan, executes it through `qa-run.mjs` and judges pending captures. The operator who reads the results at the human gate is the secondary user.
- **Current behavior:** one mis-grounded step forfeits a whole case; a blocked click says nothing about why; an overlay or an unnamed control sends the step to a person; a product defect reads as a planning gap.
- **Trigger:** a finished `qa-report.md` and a running local stack.
- **Success state:** every objective step ends executed (`pass` or `fail`), and what reaches the human gate is only what no AI agent can do alone.

**Job to Be Done**
When the session plans and runs a QA report's cases, it wants one bad step, an overlay or a validation submit not to sink the rest of the case, so most steps run on their own and the human gate receives only what truly needs a person.

**Non-Users**
Operators who want runs against production (the local-only guard stays), cases that need a real external channel or a physical device (impossible class), and anyone wanting the reports regenerated (they stay byte-identical).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Step-level plan validation (AC-1..AC-3) | Case 20 lost 21 steps to one step |
| Must | Closed failure cause and absent-element `fail` (AC-4, AC-5, AC-14) | KD-21, KD-23; makes M4 and the human gate read true |
| Must | Assertions do not consume the case (AC-6, AC-7) | A product defect must not erase the rest of the evidence |
| Must | Role-only presence, `number` pattern, `anchor_text` scope (AC-8..AC-10) | S-4, T-2, S-6 and case 20's counts |
| Must | Validation submit with the report's literal on a dedicated role (AC-11) | S-4 holds 15 of 63 steps; without it 90% is unreachable in super-ensino |
| Must | Declared overlay handlers (AC-12, AC-13) | S-5, S-6 and every student page |
| Must | Counted dogfood against the frozen table (AC-19) | The hypothesis is only proven on the real reports |
| Should | Dogfood kit fixes (AC-16) | OBS-1, OBS-2 |
| Could | Per-case overlay dismissal counts in the final report summary | Visibility of how often handlers fire |
| Won't | Planner-written selectors; forced clicks; a new `uncertain` policy; real channels; regenerated reports | Boundaries of vocabulary v3 |

### MVP Scope

Every Must row: the 90% target leaves super-ensino a 6-step margin and praesto-sum a 2-step margin, one of which the criterion-less UI/UX checklist step already takes, so no Must can be dropped without making the target unreachable.

### User Flow

1. The operator declares in the project kit the seeds the reports need (praesto-sum: a completed Task matching the search; super-ensino: an occupation reset) and the overlay handlers.
2. The session runs `/relay-qa-run <feature>` and plans with the v4 vocabulary.
3. `qa-run.mjs` validates each step, runs the valid ones, dismisses declared overlays and records closed causes.
4. The session judges pending captures.
5. The operator reads the results at the human gate.

---

## Technical Approach

**Feasibility:** MEDIUM — every change lives in `plugins/relay/scripts/qa-run.mjs` and `plugins/relay/commands/relay-qa-run.md`, on Playwright primitives that exist in the resolved 1.64.1 (`page.addLocatorHandler` since 1.44, actionability checks, `elementFromPoint` hit-testing); the risk is semantic (no new false pass), not technical.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

### Architecture Notes

- The failure cause is derived by pre-checks on the located element (count, `isEnabled`, `isEditable`, a hit-test at the action point) when the action throws, and mapped to a closed list; the thrown error is never written (redaction policy).
- Step-level validation reuses the existing per-step grounding loop (`qa-run.mjs:2299-2348`): instead of returning the first refusal, it marks the step and continues; schema validation (`qa-run.mjs:1771-1804`) keeps refusing the whole entry.
- Assertion continuation is a runner rule over action kinds: `expect_*`, `query` and `judge` continue after a failure; `goto`, `click`, `fill`, `request` and any step with an `effect` stop.
- Overlay handlers are read from `PRPs/auth/qa-seed.json` beside `channel_sources`, registered once per page in `run` and `ground`, and each firing is appended to the case evidence; the dedicated-role rule of `effect: "write"` applies to a handler as to a step.
- `anchor_text` reuses the `label_text` nearest-container walk, with "holds at least one element of the step's role" as the stop condition.
- The validation submit is a `click` variant gated like a write: dedicated role, plus a report literal in a preceding `fill`; its requests are recorded with the existing `expect_requests` evidence shape.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| An overlay handler hides a real defect (a modal that should not appear is silently closed) | M | Only project-declared triggers; every dismissal recorded in evidence and listed in the worksheet; a negative control shows an undeclared overlay is not dismissed |
| A validation submit causes a real outward effect from the local backend | L | Dedicated role only; only a literal the report itself gives; requests recorded; outward effects from the backend stay the project's local stand-ins (decision 2026-09-25) |
| Continued assertions after a failure cascade into noise | M | Only assertions continue; the first interaction after a failure stops the case; the case outcome stays `fail` |
| An absent-element `fail` is a timing flake, not a defect | L | Same 10-second attach wait as today before counting; a flaky absence reads `fail` (never a false pass) and is visible in evidence |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Step-level validation | An ungrounded assertion becomes a step gap and an ungrounded interaction truncates; schema errors still refuse the entry (AC-1..AC-3) | complete | - | - | - | PRPs/plans/qa-runner-vocabulary-v4-phase-1-step-level-validation.plan.md |
| 2 | Failure causes | Closed `STEP_NOT_PERFORMABLE` causes, absent report-named element is `fail`, catalogue entries (AC-4, AC-5, AC-14) | complete | - | - | - | PRPs/plans/qa-runner-vocabulary-v4-phase-2-failure-causes.plan.md |
| 3 | Assertion continuation | Assertions continue after a failed assertion; interactions stop (AC-6, AC-7) | complete | - | - | 2 | PRPs/plans/qa-runner-vocabulary-v4-phase-3-assertion-continuation.plan.md |
| 4 | Assertion vocabulary | Role-only presence within a scope, closed `number` pattern, `anchor_text` scope (AC-8..AC-10) | complete | - | - | 1 | PRPs/plans/qa-runner-vocabulary-v4-phase-4-assertion-vocabulary.plan.md |
| 5 | Validation submit | `effect: "validation"` with a report literal on a dedicated role, requests recorded (AC-11) | complete | - | - | 1, 4 | PRPs/plans/qa-runner-vocabulary-v4-phase-5-validation-submit.plan.md |
| 6 | Overlay handlers | `overlay_handlers` in `qa-seed.json` on `page.addLocatorHandler`, dismissals recorded, write and guard rules (AC-12, AC-13) | complete | - | - | 2 | PRPs/plans/qa-runner-vocabulary-v4-phase-6-overlay-handlers.plan.md |
| 7 | Release | Command doc examples and rules, version bump, changelog, documentation, install (AC-15, AC-17, AC-18) | complete | - | - | 1, 2, 3, 4, 5, 6 | PRPs/plans/qa-runner-vocabulary-v4-phase-7-release.plan.md |
| 8 | Dogfood | Project seeds and overlay handlers declared, kit fixes, counted runs on both reports, negative controls, reading against the metrics (AC-16, AC-19) | pending | - | - | 7 | - |

### Phase Details

**Phase 1: Step-level validation**
- **Goal:** one bad step never forfeits the valid part of an entry.
- **Scope:** the grounding loop marks each refused step instead of returning; assertion steps become `human` gaps; an ungrounded interaction truncates the rest; schema validation unchanged.
- **Success signal:** AC-1..AC-3 hold on fixtures; a case-20-shaped entry with one mis-grounded search step runs its *Hoje* half.

**Phase 2: Failure causes**
- **Goal:** every blocked action says why, and a missing report-named element is a QA result.
- **Scope:** pre-check-based cause classification at the click/fill site and the other `STEP_NOT_PERFORMABLE` sites; absent-element `fail` for report-word locators; catalogue class for `STEP_NOT_PERFORMABLE` and documentation of `PLAN_ENTRY_INVALID` as a plan defect.
- **Success signal:** AC-4, AC-5, AC-14 hold on fixtures for each cause.

**Phase 3: Assertion continuation**
- **Goal:** a failed assertion keeps the rest of the case's evidence.
- **Scope:** the runner's step loop continues across failed assertions and stops at the next interaction.
- **Success signal:** AC-6, AC-7 hold; an X-1-shaped case records all its assertions.

**Phase 4: Assertion vocabulary**
- **Goal:** reach the steps the reports describe without literal text or names.
- **Scope:** role-only presence (`within` required), `pattern: "number"`, `within.anchor_text`; schema, validation, run-time resolution and evidence.
- **Success signal:** AC-8..AC-10 hold on fixtures, including the opacity case for role-only presence.

**Phase 5: Validation submit**
- **Goal:** execute a report's "type an invalid value and submit" steps safely.
- **Scope:** `effect: "validation"` on `click`, the report-literal and dedicated-role gates, request recording, `ground --prefix` refusal unchanged.
- **Success signal:** AC-11 holds on fixtures.

**Phase 6: Overlay handlers**
- **Goal:** known overlays never cost a step.
- **Scope:** `overlay_handlers` declaration and validation, registration in `run` and `ground`, dismissal evidence, write-effect and guard rules.
- **Success signal:** AC-12, AC-13 hold on fixtures with a tour-like and a panel-like overlay.

**Phase 7: Release**
- **Goal:** ship v4 as an installable release.
- **Scope:** `relay-qa-run.md` examples and rules, `qa-run-contract` check extended, `plugin.json` minor bump, changelog, `documentation/` per `documentation/AGENTS.md`, install.
- **Success signal:** AC-15, AC-17, AC-18 hold.

**Phase 8: Dogfood**
- **Goal:** measure the hypothesis on the same two reports.
- **Scope:** the operator declares the seeds (praesto-sum completed Task matching the search; super-ensino occupation reset) and the overlay handlers in each project kit (category `project-declaration`); the kit fixes of AC-16; counted runs on both reports with the dedicated accounts; one negative control per new step kind and failure cause; the worksheet reading, scans and metrics; comparison with 0.46.0 and 0.47.0.
- **Success signal:** AC-19 read and reported, met or not, with every miss attributed to a named cause.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Target | ≥ 90% executed per project and combined, same denominators (operator, 2026-10-23) | An intermediate target (≥ 60%) | The operator kept the v3 target; the cause analysis shows it needs every Must |
| Granularity of plan refusal | Per step for grounding; per entry for schema errors | Keep all-or-nothing; per step for everything | A grounding miss is local to one step, a schema error means the planner misread the vocabulary |
| Ungrounded interaction | Truncates the rest of the case | Skip it and continue | Later steps would act on a page in an unknown state |
| Failure cause | Closed list derived by pre-checks; no error text | Write Playwright's message | Redaction policy: reasons are fixed sentences |
| Absent report-named element | `fail` | `needs-human` `STEP_UNGROUNDED` (0.47.0) | Consistent with v3 item 2: a product that lacks what the report names is a QA result |
| Assertion continuation | Narrow: assertions continue, interactions stop (operator, 2026-10-23) | Stop at first failure; continue everything | Keeps evidence without acting on an unknown page |
| Validation submit | Kept, with dedicated role and report literal (operator, 2026-10-23) | Cut it | Without it S-4's 15 steps cap super-ensino at 48/63 |
| Overlay handling | Project-declared handlers on `page.addLocatorHandler` | A per-plan dismiss step; project-only environment changes; forced clicks | Playwright's documented mechanism; declared, never inferred; dismissals recorded |
| Where handlers are declared | `PRPs/auth/qa-seed.json` beside `channel_sources` | `login.config.json` per role | Run-environment declarations already live there; write-effect handlers reuse the role's `dedicated` flag |

---

## Research Summary

**Market Context**
- Playwright gates every action on visibility, stability, enabled state and "receives events" (the element is the hit target at the action point), and on timeout throws a generic `TimeoutError` rather than a per-reason error (https://playwright.dev/docs/actionability; https://playwright.dev/docs/api/class-locator#locator-click). A closed cause therefore has to be derived by the runner.
- `page.addLocatorHandler` (v1.44+) registers a handler for an overlay that blocks actions and runs before each action or retry; its runtime counts against the action's timeout, and predictable overlays are better dismissed explicitly (https://playwright.dev/docs/api/class-page#page-add-locator-handler).
- Mature executors make continue-versus-stop a step-level setting (SoapUI/ReadyAPI test-case property, https://community.smartbear.com/t5/ReadyAPI-Questions/Behavior-when-a-test-step-fails/m-p/236122); no source was found for running only the valid prefix of a scripted case, nor a documented convention on whether a zero-match locator is a test failure or an authoring error.
- Gaps: Playwright's exact "intercepts pointer events" log text and Playwright MCP's own error taxonomy were not found in primary docs.

**Technical Context**
- `plugins/relay/scripts/qa-run.mjs:3519-3526`: click/fill errors swallowed into one fixed `STEP_NOT_PERFORMABLE` sentence; other sites at 3578, 3670, 3810.
- `plugins/relay/scripts/qa-run.mjs:3475-3518`: zero matches end `STEP_UNGROUNDED` only for run-time-grounded locators; a snapshot-grounded click with zero matches is `STEP_NOT_PERFORMABLE`.
- `plugins/relay/scripts/qa-run.mjs:2299-2348`: first grounding refusal returns `PLAN_ENTRY_INVALID` for the entry; prefix snapshots apply only when the case's prior goto/click/fill equal the prefix.
- `plugins/relay/scripts/qa-run.mjs:4765-4782`: the dedicated-role gate is entry-level on the first `effect: "write"` step.
- `plugins/relay/scripts/qa-run.mjs:5390-5421`: the prefix replay accepts only role+name or text locators and has no overlay dismissal.
- `plugins/relay/scripts/qa-run.mjs:3049-3057`: `index` resolves as `all.nth(index)` inside a `within` scope that must match one element.
- `PRPs/reports/qa-runner-ai-executable-steps/phase-9/pass-worksheet.mjs:58-60` and `compute-metrics.mjs:142-148` (with `dogfood-lib.mjs:127-132`): the OBS-1 and OBS-2 defects.

---

*Generated: 2026-10-23*
*Approved: 2026-10-23*
*Status: APPROVED*
