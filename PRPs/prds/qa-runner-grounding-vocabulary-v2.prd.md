# QA Runner Grounding and Case Vocabulary v2

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a PRD downstream stages consume); impact on shared contracts (`qa-run.mjs` plan vocabulary, reason codes and `results.json`, `plan.json`, `redaction-policy.md`); secret and personal-data handling in run evidence; extension of the closed step vocabulary of a standalone command; new network-touching request sites under the local-only guard
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the local-only guard is permanent, the outcome vocabulary is a closed set, secrets never reach reports, and the human gate stays open
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log, "Phase 8 result and metric amendment (2026-10-09, operator-approved)" and "Plan side only": the binding origin of this PRD's metrics and of its plan-side-only boundary
  - Same PRD, "Partial plans and the outcome vocabulary": a partially executed case stays `needs-human` with `PARTIAL_REMAINDER` and never counts toward the driver-executed rate
  - [2026-04-19] "Secret redaction policy for Test Runner reports": layered policy, per-project extensions, whole-URL redaction for connection strings
  - [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`"
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen
  - [2026-10-06] "Provisioning the visual tooling's `node_modules`" (F10): a registered backlog item, deliberately not folded in
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": accessibility snapshots, screenshots, input values and registered session values are the leak surfaces
  - "Writing pipeline artifacts under `.claude/`"
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic": the pre-run classification is declared and frozen, never inferred
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`)
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form
- Result: PROCEED
```

## Problem Statement

`/relay-qa-run` can now obtain an authenticated session for every role without a human, yet it still drives only 1 of the 14 reachable cases of the two reference projects to a `pass` or `fail`, on 0.44.0 and 0.45.0 alike. Authentication is no longer the cause. The residue comes from a grounding step that reads a single-page application before it renders, a snapshot parser that discards paragraph, list-item and cell text, a step vocabulary with no absence, state, input-value or session-less assertions, a redaction table that registers harmless session values such as `localhost` as secrets and corrupts the evidence the operator reads, and a generic `NO_PLAN_ENTRY` that hides why a case was not executed. Grounding snapshots and screenshots also persist the owner's personal data in a directory that git does not ignore. Until these are fixed the operator keeps executing by hand the cases the runner exists to take, and cannot tell a runner limitation from a case that is human by nature.

## Evidence

- `super-ensino` re-run on 0.45.0 (`C:\repos\super-ensino\portal\PRPs\reports\qa-runner-dogfood\dogfood-report-0.45.0.md`, counted run `20261009T145351915Z`): `pass=0 fail=0 blocked=0 needs-human=12`, with `partially_executed=4` and zero human authentication actions across 3 of 3 roles. Findings F1 to F7 name the causes.
- `praesto-sum` re-run on 0.44.0 (`C:\repos\assistente-pessoal\PRPs\reports\missed-sweep\dogfood-report-0.44.0.md`, counted run `20261006T215313435Z`): case 23 `pass`, case 20 `PARTIAL_REMAINDER`. Findings PS14 (personal data persisted in an unignored path) and PS16 (missing browser assertions) apply.
- Phase 8 of `PRPs/prds/qa-runner-case-vocabulary.prd.md` ended at 1 of 14 driver-executed against a target of 9, and its ceiling analysis of the 14 cases shows that the target was reachable only if every fix and extension landed. The operator amended the metrics on 2026-10-09 (PR #43).
- F1, `plugins/relay/scripts/qa-run.mjs:2853-2949` (`runGround`): after `page.goto(url, {waitUntil: 'load'})` it calls `waitForLoadState('networkidle', {timeout: 5000}).catch(() => {})` (line 2918) and takes exactly one `ariaSnapshot()`. On the teacher tree the snapshot held 2 entries where the settled page has 66. `BROWSER_PROBE_DWELL_MS = 5000` exists only in `plugins/relay/resources/auth-login.template.mjs:145`, and `qa-run.mjs` never uses it. Playwright marks `networkidle` as discouraged for readiness (https://playwright.dev/docs/api/class-page).
- F2, `qa-run.mjs:1085-1107` (`parseAriaSnapshot`) and `:805` (`LOCATOR_ROLES`): a candidate is produced only from a `role "name"` line whose role is in `LOCATOR_ROLES`, or from a `- text:` line. `- paragraph: …`, `- listitem: …` and `- cell: …` match neither form, and `paragraph` is not in the role list. 61 paragraph lines of the teacher `/perfil` were lost, including a section title the report asks for.
- F3, `qa-run.mjs:594-603` (`addSecretValues`): every session value of 4 or more characters is registered, and redaction is by substring. `localhost`, `false` and `MIDDLE` became `[REDACTED]` and corrupted 23 URLs in `results.json`. `collectIndexedDbSecrets` (`:1742-1766`) registers every nested record key and value.
- F4 and PS16, `qa-run.mjs:800-970`: the browser actions are `goto`, `click`, `fill`, `expect_visible`, `expect_text`, `expect_url` and `query`; there is no absence, state or input-value assertion. The HTTP driver attaches the role's storage state and headers to the whole case context (`:1474-1486`), so only a plan entry with no `role` can send an anonymous request.
- `qa-run.mjs:2449-2450`: `NO_PLAN_ENTRY` is produced only when `plan.json` has no entry for a case index. Cases that are human by nature fall into it because the planner omits them, so the code carries no cause.
- PS14, `qa-run.mjs:2567-2579` and `:1698`: `runInit` creates only `evidence/`; no ignore rule or `.gitignore` is written for `qa-run/`. The screenshot is a viewport capture, once per case. In `praesto-sum` a grounding snapshot held 54 locator names including the owner's task titles with `withheld=0`, and `PRPs/reports/<feature>/qa-run/` is untracked but not ignored. `plugins/relay/resources/redaction-policy.md` says nothing about snapshots, screenshots or personal data.
- F5, `auth-login.template.mjs:1521-1590`: the mint command runs once and a post-mint proof failure halts `FAILED_PROBE_MARKER_ABSENT` with no retry. The runner caches the failed result for the whole run. Changing the template requires bumping `KIT_TEMPLATE_ID` (`auth-login.template.mjs:122`, currently `auth-login/2`), which makes every generated script halt `FAILED_KIT_SCRIPT_STALE` until `/relay-auth-scripts --refresh`.
- F7, `plugins/relay/commands/relay-auth-scripts.md:149-151`: `--refresh` iterates the roles of the approved model's matrix, not the roles the kit holds.

## Proposed Solution

Fix the defects that stop the runner from reaching its cases, extend the step vocabulary by exactly the steps the unreached cases need, make every non-executed case say why, and measure the result on the same two byte-identical reports against the amended metrics. `ground` waits until two successive snapshots are equal within a bounded time and ends with a named outcome instead of swallowing the wait; the parser keeps the text of paragraph, list-item and cell lines. Redaction registers the declared session sources always and other session values only above a length and entropy floor, so evidence stays readable. Each run directory ignores its grounding snapshots and screenshots and proves it. The plan carries, per case, a declared class (automatable, needs a new driver, human by nature, blocked by the product) and a code from a closed catalogue, which the runner validates and reports; the initial classification of the 14 cases is frozen in this PRD so the planner cannot grade itself. The vocabulary gains a session-less request, an input-value assertion, absence and state assertions, and a `ground` mode that replays a grounded prefix of steps before it snapshots. Everything stays on the plan side, the runner side and tracked declarations. Two alternatives were rejected: regenerating the reports with structured steps would make the before and after incomparable and reopen `/relay-qa-report`, and deriving the classification inside the runner cannot work, because "needs a new driver" and "blocked by the product" are judgments about the case.

## Key Hypothesis

We believe stable grounding, complete text candidates, precise redaction, specific reason codes and a small set of vocabulary extensions will convert the automatable cases of the two reference reports into driver-executed outcomes, and will make the objective steps of the cases that need a new driver run, for the operator of the human validation gate, with no false `pass`.
We'll know we're right when the same two byte-identical reports, re-run on the release that ships this work, show at least 80% of the pre-classified automatable cases driver-executed, at least 70% of the objective steps of the automatable and needs-a-new-driver cases executed by a driver, a specific catalogued reason code on every non-executed case, zero false `pass` and zero secret values.

## What We're NOT Building

- **A fifth outcome.** The vocabulary stays `pass`, `fail`, `blocked`, `needs-human`; new causes are reason codes and counters, and a partially executed case never counts toward the driver-executed rate.
- **Any change to `/relay-qa-report` or to the reports.** The metric depends on re-running byte-identical reports; every improvement lives on the plan side, the runner side and in tracked declarations.
- **E-mail and SMS channels.** They stay human by nature unless a project provides a local catcher such as mailpit; a catcher driver is a separate capability.
- **Visual judgment.** A step that asks for a judgment of appearance stays `needs-human`.
- **A fix for the `super-ensino` X-1 product defect.** It is project work; X-1 stays classified as blocked by the product.
- **Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs`.** The review loop's measurement is outstanding and `capture.mjs` is frozen.
- **A free CLI step or an unconfirmed seed.** The planner never writes argv that the runner executes.
- **Any non-local target, store or origin.** The local-only guard is permanent.
- **Findings deferred to follow-up work:** PS10 (worktree `target_root`), PS12 (typed captures), PS13 (file-backed `store`), PS15 (live-data accessible names), PS17 (viewport-only screenshots), PS18 (seed proposals for record-resolved cases), PS19 (seed teardown) and PS20 (`--refresh` and `maxAgeMinutes`). PS15 does not block case 20: the plan can use `region "Não concluídas"` without the count.
- **Invocation from `/relay-execute`.** The command stays standalone.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Driver-executed rate over the automatable class | ≥ 80%, which is 3 of 3 under the frozen classification | `results.json` of one counted run per project, on the same byte-identical reports; `pass` or `fail` from a driver over the cases classified automatable. Partially executed cases never count |
| Objective-step coverage | ≥ 70% | Objective steps executed by a driver over all objective steps of the automatable and needs-a-new-driver classes, read from `results.json` per-step results. Steps of partially executed cases count here |
| Non-executed cases carrying a specific catalogued reason code | 100%, with 0 occurrences of `NO_PLAN_ENTRY` | The `reason_code` of every `needs-human` and `blocked` case in the counted runs. `PARTIAL_REMAINDER` counts only when the remainder names its gap |
| Classification fidelity | 14 of 14 cases classified, matching the frozen table, every divergence recorded | The `class` of each case in `plan.json` and `results.json` read against the frozen table |
| Driver-executed cases over all reachable cases | reported, no target | The raw count out of 14, kept for continuity with the earlier readings |
| Driver-executed rate over the automatable and needs-a-new-driver cases whose extension shipped | reported, no target | `results.json`, as a secondary reading beside the 3-case primary rate |
| False `pass` | 0 | Each `pass` read against its evidence in the dogfood report |
| Secret values in any tracked file, report or log | 0 | The scan of the parent PRD, over registered session values, captured values and input values |
| Evidence strings corrupted by redaction | 0 | Scan of `results.json` for `[REDACTED]` inside a URL host or port of the verbatim manual steps |
| Personal data in a path git does not ignore | 0 | `git check-ignore -q` on the run's `grounding/` files, screenshots and redacted-text files, plus `git status --porcelain` showing none of them |

**Frozen classification of the 14 reachable cases.** The classes follow the ceiling analysis recorded in the parent PRD and the findings of the two dogfood reports, against the runner as of 0.45.0. The denominator for the first metric is the first class; the denominator for the second is the first two classes.

| Class | Cases | What the class means here |
|-------|-------|---------------------------|
| Automatable (3) | `praesto-sum` 23; `super-ensino` T-1, A-1 | Every step maps to an existing driver step once grounding is fixed (F1, F2) |
| Needs a new driver (7) | A-2 and S-2 (request without a session); S-1 (input value); S-4 and T-2 (grounding after an interaction); `praesto-sum` 20 (absence, state, grounding after an interaction); S-6 (network request) | A named missing step or driver |
| Human by nature (3) | T-3 (e-mail inbox); S-3 (SMS or e-mail); S-5 (visual preview) | An external channel or a visual judgment |
| Blocked by the product (1) | X-1 | `/perfil` without a session renders an error page, not the login form |

Cases 21 and 22 of `praesto-sum` stay outside the 14, as in the parent PRD. The per-case count of objective steps is recorded in the Phase 8 pre-run table, before the run, from the two reports.

## Acceptance Criteria (test scenarios)

Mandatory. `tdd: false` in `docs/context/methodology.md` and `test_frameworks: ["node:test"]` is declared, so these are the contract the test pair authors test-after.

- **AC-1 Stable snapshot or a named failure:** Given an SPA route whose snapshot holds 2 entries at `load` and 66 once settled, when `ground` runs for that route and role, then it writes the snapshot only after two successive snapshots are equal within a bounded wait, and the entry count equals the settled count. Given no equal pair appears within the bound, when `ground` ends, then it exits non-zero with `GROUND_UNSTABLE`, writes no snapshot file, and no timeout is swallowed silently.
- **AC-2 Inline text becomes a candidate:** Given snapshot lines `- paragraph: Informações cadastrais`, `- listitem: Nome completo` and `- cell: 2026-10-01`, when `parseAriaSnapshot` runs, then each line yields one text candidate with that content and the candidates the parser produced before this change are unchanged. A step is planned from a candidate only when it matches exactly one element at plan time and at run time.
- **AC-3 Low-entropy values are not secrets:** Given a saved session whose cookies include `tenant=localhost`, `level=MIDDLE` and `has_term_accepted=false` plus a 200-character JWT, when the runner writes `results.json`, then every `http://localhost:3000/…` URL in the verbatim manual steps is byte-intact and the JWT value is replaced by `[REDACTED]`. The token artifact, the declared session cookie and the `api_origins` cookie are redacted regardless of their length or entropy.
- **AC-4 IndexedDB keys follow the same floor:** Given a storage state whose IndexedDB records have the key `token` and a 40-character random value, and a second record keyed by a 40-character random string, when secrets are collected, then both random strings are registered and the short key `token` is not.
- **AC-5 Run evidence is ignored and the ignore is proven:** Given a fresh run directory, when `init` completes, then a `.gitignore` written through the single write helper covers `grounding/` and the screenshots and redacted-text files under `evidence/`, and `git check-ignore -q` exits 0 for each such path. When that proof does not hold, then `init` and `ground` halt `FAILED_IGNORE_UNPROVEN` and write no snapshot and no screenshot.
- **AC-6 Every non-executed case carries a catalogued code:** Given a plan whose entries decline cases with a `class` and a `reason_code` from the closed catalogue, when the runner executes it, then each declined case is `needs-human` or `blocked` with that code and its manual steps verbatim, and a code outside the catalogue makes the entry `PLAN_ENTRY_INVALID` naming it. The catalogue contains at least `UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `VISUAL_JUDGEMENT` and `PRODUCT_DEFECT` beside the existing `STATE_UNCONFIRMED`, `STEP_UNGROUNDED` and `PARTIAL_REMAINDER`.
- **AC-7 The classification is validated and reported:** Given a plan in which each case carries a `class` of automatable, needs-a-new-driver, human-by-nature or blocked-by-product, when the run ends, then `results.json` reports each case's class, the per-class counts, the driver-executed count and rate over the automatable class, the objective steps executed and the objective steps total over the first two classes, and `partially_executed`. The four-key `counts` partition is unchanged, a partially executed case is never counted in the rate, a case with no `class` is reported `unclassified`, and an invalid `class` value makes the entry `PLAN_ENTRY_INVALID`.
- **AC-8 A request without the session:** Given a role case and an HTTP step `{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "session": "none", "expect_status": 401 }`, when the step runs, then the request carries no cookie, no storage state and no derived header, it passes the local-only guard first, and the step passes when the status is 401. Given a plan without the `session` key, when the same case runs, then its behavior is unchanged.
- **AC-9 An input value is asserted and never written:** Given a step `{ "action": "expect_value", "role": "textbox", "name": "Telefone", "not_empty": true }` on a grounded locator, when the step runs, then it passes or fails on the comparison, accepts `equals`, `contains` and `not_empty` with `{{name}}` bindings, and records the comparison result in the evidence without the input's value.
- **AC-10 Absence and state assertions cannot pass vacuously:** Given a case whose `expect_not_visible` step has no earlier passed positive step on the same route in the same case, when the runner validates the entry, then the entry is `PLAN_ENTRY_INVALID` before any side effect. Given an earlier positive step on that route, when `expect_not_visible` runs, then it passes only when the grounded locator is hidden or absent. Given `expect_state` with `expanded`, `disabled` or `checked` on a grounded locator, when the step runs, then it passes only when the element's state equals the declared value.
- **AC-11 Grounding after an interaction:** Given case 20 and a prefix of one grounded `click` on `button "Não concluídas"`, when `ground` runs with that prefix, then it replays the click with the role's session through the local-only guard, takes the stable snapshot afterwards, and the expanded rows appear among its entries. Given a prefix step that does not match exactly one element or fails, when `ground` runs, then it exits non-zero and writes no snapshot. The prefix accepts only `goto`, `click` and `fill` steps.
- **AC-12 A network-request assertion (Should):** Given a browser case that clicks "Salvar" and a step `{ "action": "expect_requests", "method": "POST", "url_contains": "/avatar", "count": 1 }`, when the case runs, then the step passes only when the page issued exactly that many matching requests during the step window, every observed URL is guard-checked, and the evidence records method, host, path and count without query strings or bodies.
- **AC-13 One bounded re-mint (Should):** Given a minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT` right after the mint, when the runner obtains the session, then it re-runs the login script exactly once with `--force`; a proven second attempt yields the session and a second failure leaves the role blocked with the same code. The login template and its `KIT_TEMPLATE_ID` are byte-identical to before.
- **AC-14 Untouched surfaces:** Given this feature's full diff, when the following files are compared against their pre-feature content, then all are byte-identical: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs`. Every dogfood `qa-report.md` is byte-identical before and after each run, and `OUTCOMES` is still exactly the four values.
- **AC-15 New request sites stay local:** Given the session-less request, the grounding prefix and the network assertion, when any of them targets an origin that is not loopback or a declared local origin, then it halts `FAILED_NON_LOCAL_TARGET` before any request is sent, and `auth-local-guard-sites` lists each new site or the existing guard call that covers it.
- **AC-16 The metrics hold on the dogfood:** Given the same two byte-identical reports re-run on the release cut for this work, when the counted run of each project is read, then the 14 cases are classified as in the frozen table, the driver-executed rate over the automatable class is at least 80%, the objective-step coverage is at least 70%, every non-executed case carries a catalogued code other than `NO_PLAN_ENTRY`, no `pass` is false, and the secrecy and privacy scans find zero values and zero unignored personal-data paths.
- **AC-17 The suite stays green:** Given the finished work, when `npm run validate` and the corpus `node --test "scripts/validate/**/*.test.mjs"` (glob quoted) run, then `npm run validate` passes all 28 checks and the corpus is green. The 28-check count is unchanged because `qa-run-contract` and `auth-secrecy` are extended instead of a new check being added.
- **AC-18 The command doc and the usage text match the script:** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, then every new step has a literal flat example preceded by the `<!-- qa-step-example driver=… -->` marker and validating against the script, the `ground` mode and its flags appear in the script's usage text, and a note documents `MSYS_NO_PATHCONV=1` for leading-slash arguments under Windows Git Bash.
- **AC-19 `--refresh` states its role set (Could):** Given `plugins/relay/commands/relay-auth-scripts.md`, when its `--refresh` behavior is read, then it states whether a refresh covers the roles of the approved model's matrix or the roles the kit holds, and a kit narrower than the matrix is refreshed for its own roles only.

## Open Questions

- [ ] The numeric floor for registering undeclared session values (length and entropy). To calibrate in the Phase 3 plan against the 19 session values recorded in the `super-ensino` scan, where the 6 non-secrets were all under 12 characters and the 13 secrets were long.
- [ ] Whether the Phase 3 ignore rule also covers the `http.json` and `query-K.json` evidence bodies, which may hold personal data from responses and rows. To resolve in the Phase 3 plan.
- [ ] The exact YAML tokens for `[expanded]` and `[disabled]` in the installed Playwright version, and whether `expect_state` reads `aria-expanded` or the snapshot token. Playwright documents `expanded`, `disabled` and `checked` as aria-snapshot attributes but has no `toBeExpanded` assertion. To verify live in the Phase 4 plan.
- [ ] The bound and the polling interval of the stable-snapshot wait. No primary source documents a two-equal-snapshots strategy, so the numbers are measured in the Phase 2 plan on a real SPA.
- [ ] How objective steps are counted per case (declared in the plan entry, or derived from the report's manual steps), so that the coverage denominator is reproducible. To resolve in the Phase 1 plan, with the counts frozen in the Phase 8 pre-run table.
- [ ] Whether the dedicated `super-ensino` QA accounts reuse the existing mint script with new usernames or need their own seed. To resolve at the start of Phase 8.

---

## Users & Context

**Primary User**
- **Who:** the operator of relay's human validation gate between `/relay-execute` and Pillar 3, the same operator the parent PRDs serve.
- **Current behavior:** runs `/relay-qa-run`, receives about 13 of 14 reachable cases back as `needs-human`, and executes them by hand.
- **Trigger:** `/relay-execute` has finished, `/relay-qa-report` has written the report, and the work must be validated before `/relay-commit`.
- **Success state:** only the cases that need human judgment or a real outward effect come back, each with a specific reason code and with its objective part already executed and evidenced.

**Job to Be Done**
When `/relay-qa-run` hands a case back because of a grounding defect, a vocabulary gap or corrupted evidence, I want the runner to read the settled page, express the step and keep the evidence readable and free of personal data, so I only execute by hand what is human by nature.

**Non-Users**
CI and every remote environment, because the local-only guard is permanent. `/relay-execute`, which invokes no QA command. The health-family projects (`vizi-saude`, `faz-bem-saude-back`, `apphealth-back`), which are not active and are never dogfood targets. Anyone expecting e-mail, SMS or visual judgment to be automated.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Stable grounding: `ground` reads the page only once two successive snapshots are equal, bounded, with the named outcome `GROUND_UNSTABLE` (F1) | The snapshot of an SPA at `load` held 2 entries against 66 settled, which alone made T-1, T-2 and A-1 unplannable |
| Must | Text candidates from `paragraph`, `listitem` and `cell` bodies (F2) | Section titles rendered as paragraphs can never be grounded today |
| Must | Redaction precision: declared sources always registered, other values above a length and entropy floor, IndexedDB keys on the same floor, target-origin parts never registered (F3) | Redaction corrupted 23 URLs the operator reads |
| Must | Privacy of run evidence: a per-run `.gitignore` for grounding snapshots and screenshots, proven with `git check-ignore`, plus a policy section in `redaction-policy.md` (PS14) | A grounding snapshot held the owner's task titles in a directory git does not ignore |
| Must | Specific catalogued reason codes and a pre-run `class` per case in `plan.json`, validated and reported by the runner, with the 14-case classification frozen in this PRD | The amended metrics need a classification made before the run and a cause on every non-executed case |
| Must | A request sent without the role's session to an origin that declares a header (F4: A-2, S-2) | Today only a case with no role is anonymous, so a role case cannot check "rejected without a token" |
| Must | `expect_value` for an input's value, never writing the value (F4: S-1, S-4) | Each gap turns an objective case into `PARTIAL_REMAINDER` |
| Must | `expect_not_visible` and `expect_state` (expanded, disabled, checked) with the positive-anchor rule (PS16: case 20) | "Lists only completed Tasks" and "collapsed by default" cannot be expressed |
| Must | A `ground` mode that replays a grounded prefix of steps before it snapshots (T-2, S-4, case 20) | Elements that exist only after an interaction cannot be grounded today |
| Should | A network-request assertion (S-6) | The only reachable case that counts requests |
| Should | F5, one bounded re-mint on the runner side after a proof failure right after minting | A cold dev server cost a mint; a runner-side retry avoids bumping `KIT_TEMPLATE_ID` |
| Could | F6, the `MSYS_NO_PATHCONV=1` note, delivered inside Phase 2 because it is one documentation sentence | The documented `ground --route "/perfil"` line exits 2 under Git Bash |
| Could | F7, `/relay-auth-scripts --refresh` states its role set | A kit narrower than the model's matrix is refreshed ambiguously |
| Won't | E-mail and SMS channels, visual judgment, the `super-ensino` X-1 fix | No local driver reaches them, or the work is project work |

### MVP Scope

Phases 1 to 5, the release cut and the dogfood. Together they cover the grounding defects, the redaction and privacy fixes, the reason codes and classification, and the vocabulary the six smaller needs-a-new-driver cases require. Phase 6 holds the Should and Could items and may be descoped by a recorded operator decision without invalidating the dogfood; the objective-step coverage then reflects what did not ship.

### User Flow

1. The operator runs `/relay-qa-report`, then `/relay-qa-run <feature>`. The planning stage runs `ground` per route and role; each snapshot is taken only once the page is stable, and `grounding/` is ignored by git.
2. The planner writes `plan.json`: executable entries with grounded steps, and for each case it cannot execute an entry with a `class` and a catalogued `reason_code`.
3. The runner executes, including session-less requests and absence and state assertions, and writes `results.json` with the classification counters.
4. The operator receives only the cases that need judgment or an outward effect, each naming its gap, and signs off on the gate themselves.

---

## Technical Approach

**Feasibility:** MEDIUM

The runner already has every seam this work extends: the `ground` subcommand, the candidate parser, the single write helper, the redaction table, the step validators and the `qa-run-contract` check. The reliability of the stable-snapshot wait on real single-page applications and the vacuity of absence and state assertions are the parts that only the dogfood can settle.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

`test_frameworks: ["node:test"]` is declared in this repository, so the pair is active in test-after mode and R-X strict applies: the Implementer authors zero test files. The corpus holds 13 `qa-run*.test.mjs` files. Every update to an existing test is routed through the test pair as `EXISTING_TEST_UPDATED`, and the phase plans exclude exactly those tests from Level 3 with `--test-skip-pattern`, never `--test-name-pattern`. The corpus runs via `node --test "scripts/validate/**/*.test.mjs"`, with the glob quoted.

### Architecture Notes

- **Plan side only.** Every change lives in `/relay-qa-run`'s planning instructions, in `qa-run.mjs`, in `plugins/relay/resources/redaction-policy.md` and in tracked declarations. `qa-report.md` stays read-only input and `/relay-qa-report` is not edited.
- **Stable grounding is a contract, not a number.** Stability means two successive `ariaSnapshot()` results are equal. The wait is bounded; when it ends without an equal pair, `ground` exits non-zero with `GROUND_UNSTABLE` and writes nothing. The bound and the interval are measured in the Phase 2 plan.
- **Classification lives in `plan.json`.** Each case entry carries `class` and, when the case is not executed, `reason_code` from a closed catalogue defined once in `qa-run.mjs`, documented in `relay-qa-run.md` and pinned by `qa-run-contract`. An entry without steps is valid when it declines a case with a catalogued code. `NO_PLAN_ENTRY` remains only for a case the plan omitted entirely, which is a planner defect and fails the metric. The runner validates and echoes; it does not infer.
- **Redaction registers by source first.** The token artifact, the declared session cookie and the `api_origins` cookie are registered regardless of length or entropy. Other cookie, localStorage and IndexedDB values are registered only above the floor fixed in the Phase 3 plan. Parts of the target origin and short literals are never registered. The floor is a judgment: `detect-secrets` documents entropy limits of 4.5 (base64) and 3.0 (hex) and `gitleaks` an example of 3.5, and neither documents a length floor.
- **Privacy is enforced by an ignore the runner proves.** `init` writes a `.gitignore` inside the run directory through `writeRunFile`, the single write helper that `qa-run-contract` pins, and proves it with `git check-ignore`, reusing the `prove` mode of `auth-kit-secrecy.mjs`. The `redaction-policy.md` gains a section on snapshots, screenshots and personal data.
- **New request sites reuse the loaded guard.** The session-less request, the grounding prefix and the network assertion call the `checkTarget` guard that `qa-run.mjs` already loads, as `runSeed` does. No second `// GUARD-SITE` marker is added, because `qa-run-contract` requires exactly one.
- **No static sibling import.** `qa-run.mjs` gains no static import of a sibling file, because the copy-helper tests would fail at module load. Any new sibling module is loaded with a lazy `import()` as `qa-query.mjs` is.
- **Absence and state assertions need an anchor.** `expect_not_visible` is valid only after a passed positive step on the same route in the same case, so a mistyped name cannot pass vacuously. Expectations still come from the report's own steps, never from the snapshot.
- **The grounding prefix is restricted.** It accepts only `goto`, `click` and `fill` steps that are themselves grounded with exactly one match, taken from the case's own steps, and runs against the local target with the role's session through the guard.
- **F5 is a runner-side retry.** `obtainSession` re-runs the login script once with `--force` after `FAILED_PROBE_MARKER_ABSENT` on a freshly minted session, so the template and `KIT_TEMPLATE_ID` stay unchanged and no project needs a `--refresh`.
- **Validation suite.** `qa-run-contract` and `auth-secrecy` are extended (catalogue, classification fields, the ignore rules, the doc examples validating against the script) rather than adding a 29th check. `npm run validate` must keep passing its 28 checks. Any `documentation/` edit follows `documentation/AGENTS.md`, which is read first, and carries a `documentation/changelog.html` entry.
- **Repo workflow.** Branch off `development`. PRs use `--repo fabiombarreto/PRPs-agentic-eng` with base `development`. Merge, never rebase or force-push. The release cut is a minor bump of `plugins/relay/.claude-plugin/plugin.json` with its changelog entry.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| An absence or state assertion passes vacuously and yields a false `pass` | M | The positive-anchor rule validated before any side effect; the locator must be grounded; every dogfood `pass` read against its evidence |
| A short or low-entropy secret falls under the redaction floor and leaks | M | Declared sources always registered; the floor calibrated on the 19 recorded session values; the dogfood scan over all tracked and report files; evidence ignored by git |
| The 3-case primary denominator is brittle, or the classification is gamed | M | The classification is frozen in this PRD and a divergence must be recorded; the secondary rate over the cases whose extension shipped is reported beside it |
| The page never stabilizes (live counts, animations) | M | A bounded wait ending in `GROUND_UNSTABLE`; the case then falls to `STEP_UNGROUNDED` instead of being planned from an unstable snapshot |
| The replayed grounding prefix has a side effect on the local target, or runs on state that differs from the case's seeded state | L | Local-only guard; only `goto`, `click` and `fill`; each prefix step grounded with one match; the effect is limited to the operator's local environment |
| Minting for dedicated `super-ensino` QA accounts rotates the session of the shared `spe-simulados-v2` accounts | M | Phase 8 plans dedicated per-project QA accounts before the run |
| Scope creep into the frozen review loop, `capture.mjs` or `/relay-qa-report` | L | AC-14 asserts byte-identity across the full feature diff |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Reason-code catalogue and pre-run classification | Closed catalogue of reason codes; `class` and `reason_code` per case in `plan.json` with entries that decline a case; classification counters and objective-step coverage in `results.json`; the frozen table recorded in the command doc; `qa-run-contract` extended (AC-6, AC-7) | complete | - | lane:qa-run | - | PRPs/plans/qa-runner-grounding-vocabulary-v2-phase-1-reason-code-catalogue-and-pre-run-classification.plan.md |
| 2 | Stable grounding and text candidates | `ground` waits for two equal successive snapshots within a bound and ends `GROUND_UNSTABLE`; candidates from `paragraph`, `listitem` and `cell` bodies; `ground` in the usage text; the `MSYS_NO_PATHCONV=1` note (AC-1, AC-2, AC-18) | complete | - | lane:qa-run | 1 | PRPs/plans/qa-runner-grounding-vocabulary-v2-phase-2-stable-grounding-and-text-candidates.plan.md |
| 3 | Redaction precision and run-evidence privacy | Source-first secret registration with a length and entropy floor; IndexedDB keys on the same floor; per-run `.gitignore` proven with `git check-ignore`; the policy section for snapshots and screenshots; `auth-secrecy` extended (AC-3, AC-4, AC-5) | complete | - | lane:qa-run | - | PRPs/plans/qa-runner-grounding-vocabulary-v2-phase-3-redaction-precision-and-run-evidence-privacy.plan.md |
| 4 | Request without a session, input value, absence and state | `session: "none"` on an HTTP step; `expect_value`; `expect_not_visible` with the positive-anchor rule; `expect_state`; guard coverage; literal doc examples (AC-8, AC-9, AC-10, AC-15) | complete | - | lane:qa-run | 1 | PRPs/plans/qa-runner-grounding-vocabulary-v2-phase-4-request-without-a-session-input-value-absence-and-state.plan.md |
| 5 | Grounding after an interaction | `ground` replays a grounded prefix of `goto`, `click` and `fill` steps before it snapshots, through the guard (AC-11) | complete | - | lane:qa-run | 2, 4 | PRPs/plans/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md |
| 6 | Network assertion, bounded re-mint and refresh role set | `expect_requests` (Should); the runner-side bounded re-mint (Should); the `--refresh` role-set statement (Could); may be descoped by a recorded operator decision (AC-12, AC-13, AC-19) | complete | - | lane:qa-run | 4 | PRPs/plans/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md |
| 7 | Release cut | Minor version bump of `plugin.json` with its changelog entry, `documentation/` pages updated per `documentation/AGENTS.md`, `npm run validate` and the corpus green, install of the new version (AC-14, AC-17) | complete | - | - | 3, 5, 6 | PRPs/plans/qa-runner-grounding-vocabulary-v2-phase-7-release-cut.plan.md |
| 8 | Dogfood | Re-run the same two byte-identical reports on the release: freeze the per-case objective-step counts, plan dedicated `super-ensino` QA accounts, run `/relay-qa-run`, read every `pass` against its evidence, run the secrecy and privacy scans, and compare against the amended metrics (AC-16) | pending | - | - | 7 | - |

Phases 1 to 6 all edit `plugins/relay/scripts/qa-run.mjs` and `plugins/relay/commands/relay-qa-run.md`, so they share `lane:qa-run` and run serially even where `Depends` would allow parallel lanes.

### Phase Details

**Phase 1: Reason-code catalogue and pre-run classification**
- **Goal:** every non-executed case names its cause, and the metric's classification is a validated field instead of prose.
- **Scope:** the catalogue and where it lives; the `class` and `reason_code` fields; declining entries without steps; the counters and the objective-step coverage in `results.json`; how objective steps are counted (Open Question); `NO_PLAN_ENTRY` narrowed to a planner defect.
- **Success signal:** a fixture plan with one case per class yields the declared codes and a correct per-class summary; a code outside the catalogue is `PLAN_ENTRY_INVALID`; the four-key `counts` partition is unchanged.

**Phase 2: Stable grounding and text candidates**
- **Goal:** `ground` plans from the page the operator actually sees.
- **Scope:** the stability loop and its bound; `GROUND_UNSTABLE`; the candidate extraction for inline text lines; the usage text; the Git Bash note.
- **Success signal:** against a fixture page that renders after `load`, the snapshot is taken only once settled; a fixture that never settles yields `GROUND_UNSTABLE` and no file; paragraph, list-item and cell lines yield candidates.

**Phase 3: Redaction precision and run-evidence privacy**
- **Goal:** evidence stays readable and personal data stays out of git.
- **Scope:** the registration policy and its floor; the IndexedDB key handling; the run-directory `.gitignore` and its proof; the policy section; the extension of `auth-secrecy`.
- **Success signal:** a fixture session with `localhost`, `MIDDLE`, `false` and a JWT leaves URLs intact and masks the JWT; `git check-ignore` exits 0 for the run's grounding and screenshot paths; a repository where the proof fails halts `FAILED_IGNORE_UNPROVEN`.

**Phase 4: Request without a session, input value, absence and state**
- **Goal:** the six smaller needs-a-new-driver cases can run to a verdict.
- **Scope:** the four step additions, their validators and runtime, their guard coverage, and their literal examples in the command doc.
- **Success signal:** fixtures shaped like A-2 (401 without a session), S-1 (non-empty input), and case 20's absence and expanded-state checks pass and fail correctly; an absence step with no positive anchor is refused before any side effect.

**Phase 5: Grounding after an interaction**
- **Goal:** elements that exist only after a click or a fill become groundable.
- **Scope:** the `ground` prefix option, its restriction to grounded `goto`, `click` and `fill` steps, and the guard.
- **Success signal:** against a fixture with a collapsible group, the snapshot taken after one replayed click lists the expanded rows; a failing prefix step writes nothing.

**Phase 6: Network assertion, bounded re-mint and refresh role set**
- **Goal:** the Should and Could items, if the operator keeps them.
- **Scope:** `expect_requests` with guard-checked URLs; the runner-side single re-mint; the `--refresh` role-set statement.
- **Success signal:** a fixture that issues one `POST` passes `count: 1`; a first mint failure followed by a success yields a session; a second failure stays blocked with the same code.

**Phase 7: Release cut**
- **Goal:** a released, installed version that the dogfood can use.
- **Scope:** the version bump and changelog, the documentation pages that name the QA runner (`reference/commands`, `reference/scripts`, `reference/validation-checks`, `reference/redaction-policy`, `roadmap/status`), the full validation run, and the local install.
- **Success signal:** `npm run validate` passes 28 checks, the corpus is green, and the installed version is the new minor.

**Phase 8: Dogfood**
- **Goal:** proof on the same two reports that produced the earlier baselines.
- **Scope:**
  - **`super-ensino`** (`C:\repos\super-ensino\portal`, report SHA-256 `45f549d9…c071`): create dedicated per-project QA accounts first, because `qa.aluno` and `qa.professor.scan` are shared with `spe-simulados-v2` and each mint rotates their session; then run `/relay-qa-run`.
  - **`praesto-sum`** (`C:\repos\assistente-pessoal`, `missed-sweep`, report SHA-256 `c1808dd54c67df1704c1c4224edff8bbe5e7cb6663ca9a24c2e99120a1a92b6e`): run `/relay-qa-run` with the case 23 seed and the `d1-local` query source already declared.
  - **Both projects:** the pre-run table with each case's class and objective-step count, a per-case comparison against the earlier tables, every `pass` read against its evidence, the secrecy and privacy scans, and the byte-identity checks. The health-family projects are never targets.
- **Success signal:** the amended metrics hold as stated under Success Metrics, with zero false `pass`, zero secret values and zero unignored personal-data paths.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Origin and metrics basis (2026-10-09, operator-approved) | A separate PRD for the grounding, vocabulary and redaction work, measured against the amended metrics of the parent PRD | New phases in the parent PRD; keep the "9 of 14" target | The parent PRD closed its Phase 8 on 1 of 14 and moved this work out; the original denominator mixed cases no local runner reaches with a product defect |
| Classification reading (2026-10-09, operator-approved) | Classify against the runner as of 0.45.0, so the automatable class is 3 cases and "at least 80%" means all 3; the needs-a-new-driver cases count only in objective-step coverage | Classify against the vocabulary this PRD ships (roughly 9 to 10 automatable cases) | The literal reading of the amendment keeps the classification fixable before any implementation; the brittle 3-case denominator is recorded as a risk and offset by a secondary rate |
| Classification home (2026-10-09, operator-approved) | A `class` field per case in `plan.json`, validated by the runner against a closed catalogue, with the initial 14-case table frozen in this PRD | A separate tracked declaration file; classification derived by the runner | The planner already owns the plan side. The frozen table stops the planner from grading itself, and the runner cannot infer "needs a new driver" or "blocked by the product" |
| Redaction policy (2026-10-09, operator-approved) | Register the token, the declared session cookie and the `api_origins` cookie always; register other values only above a length and entropy floor; apply the same floor to IndexedDB keys; never register origin parts or short literals | Only the declared sources, never IndexedDB keys; keep the 4-character floor plus an exception list | Declared-only could leak a secret held in an undeclared cookie, and the exception list is brittle. No scanner documents a length floor, so the floor is calibrated on the recorded values |
| Run-evidence privacy (2026-10-09, operator-approved) | A per-run `.gitignore` for grounding snapshots and screenshots, proven with `git check-ignore`, halting `FAILED_IGNORE_UNPROVEN` when unproven | Persist only the locator names the plan uses and no screenshots; both | Matches the auth kit's prove-before-write rule and keeps the screenshots the operator reads. Free-text titles cannot be listed as `regex:` lines, so withholding by pattern does not solve it |
| Stable grounding contract | Two successive equal snapshots within a bound, ending in `GROUND_UNSTABLE` with nothing written | A fixed dwell like the login probe's 5 seconds; best-effort with a flag | A fixed dwell is a guess that can still catch a loading page, and a flag would let an unstable snapshot be planned from. No primary source documents the strategy, so the numbers are measured |
| Absence assertion anchor | `expect_not_visible` is valid only after a passed positive step on the same route and case | Allow it standalone | A mistyped name would pass vacuously, which is exactly the false `pass` the metrics forbid |
| Input values in evidence | `expect_value` records the comparison result and never the value | Record the value after redaction | Input values are personal data, and PS14 is a high-severity privacy finding |
| Grounding prefix scope | Only grounded `goto`, `click` and `fill` steps from the case's own steps, through the guard | Any grounded step; operator-authored free steps | The replay executes real interactions at plan time on the local target, so it is kept to the smallest set that serves T-2, S-4 and case 20 |
| Re-mint placement (F5) | A single runner-side retry after `FAILED_PROBE_MARKER_ABSENT` on a fresh mint | A retry in the login template | A template change bumps `KIT_TEMPLATE_ID` and makes every project's scripts stale until `--refresh` |
| Validation checks | Extend `qa-run-contract` and `auth-secrecy`; the count stays 28 | A new dedicated check | The contract and secrecy checks already pin the vocabulary, the write helper and the ignore rules |
| Deferred findings | PS10, PS12, PS13, PS15, PS17, PS18, PS19 and PS20 stay follow-ups | Fold some in | They do not move the amended metrics, and PS15 is avoided by using a count-free region name |
| Phase 6 optional | The Should and Could items may be descoped by a recorded operator decision | Make them part of the MVP | The Must items already cover every needs-a-new-driver case except S-6, and the coverage metric reflects what does not ship |
| Frozen surfaces | The review loop files, `capture.mjs` and `/relay-qa-report` byte-identical (AC-14) | Folding in the registered reviewer ideas | The review loop's measurement is outstanding and `capture.mjs` is frozen |

---

## Research Summary

**Market Context**

- **Readiness.** Playwright marks the `networkidle` state as discouraged and tells users to rely on web assertions for readiness (https://playwright.dev/docs/api/class-page). Web-first assertions retry until the assertion timeout, 5 seconds by default, and `expect.poll` and `toPass` are the primitives for complex conditions (https://playwright.dev/docs/test-assertions). No primary source documents a polling-until-two-equal-snapshots strategy; that is this PRD's design, inferred from `expect.poll`, and the page itself warns that snapshot testing is not ideal for highly dynamic content (https://playwright.dev/docs/aria-snapshots).
- **State and absence.** The locator assertions include `toBeHidden`, `toBeDisabled`, `toBeChecked`, `toHaveValue` and `toHaveAttribute`, and there is no `toBeExpanded` (https://playwright.dev/docs/api/class-locatorassertions). The aria-snapshot attributes are `checked`, `disabled`, `expanded`, `invalid`, `level`, `pressed` and `selected`. The exact YAML for a given version was not verified and is a live check in Phase 4.
- **Network.** Requests are observed with `page.on('request')` and `page.on('response')`, `waitForResponse` must be started before the triggering action, and the network page gives no counting guidance (https://playwright.dev/docs/network).
- **Redaction precision.** `detect-secrets` documents separate entropy limits of 4.5 for base64 and 3.0 for hex and handles false positives with filters and allowlists (https://github.com/Yelp/detect-secrets). `gitleaks` applies a per-rule minimum entropy to the extracted secret, with an example of 3.5, plus stopwords and allowlists (https://github.com/gitleaks/gitleaks). Neither README documents a minimum length, so the floor in this PRD is a judgment calibrated on recorded data.
- **Personal data in artifacts.** Playwright's CI guidance, read only as a search description, says trace files can contain credentials and tokens and should be treated as sensitive (https://playwright.dev/docs/ci-intro). Web research was bounded and found no recent discussion beyond these sources.

**Technical Context**

- **Grounding.** `runGround` (`qa-run.mjs:2853-2949`) requires a run directory inside `PRPs/reports/<feature>/qa-run/`, guards the target, obtains the role's session, loads the page, takes one snapshot, counts each candidate live and withholds entries that contain a registered secret or an e-mail address. The consumer `precheckGroundedSteps` (`:1138-1165`) requires an exact entry with `matches === 1`, else `STEP_UNGROUNDED`.
- **Redaction.** `writeRunFile` (`:691-705`) is the only write site and applies the table; `obtainSession` registers cookie, localStorage, token and IndexedDB values. `redaction-policy.md` has no section on snapshots, screenshots, e-mail addresses or short values.
- **Vocabulary.** `HTTP_ACTIONS` are `request` and `query`; `BROWSER_ACTIONS` add `goto`, `click`, `fill`, `expect_visible`, `expect_text` and `expect_url`. Declared API origins attach a session-derived header per step, but the case-level context carries the storage state and headers.
- **Contract.** `qa-run-contract` pins the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, and validates every `qa-step-example` block of the command doc through the script's own validator. `auth-local-guard-sites` lists the guard sites, and 13 `qa-run*.test.mjs` files hold about 374 tests. `npm run validate` registers 28 checks.
- **Gaps.** The driver bodies, `partitionSnapshotEntries` and the `qa-run-case-vocabulary` and `qa-run-layout` tests were not read in this pass, and the documentation pages that name the QA runner were located only through the site's search index. They belong to the phase plans.

---

*Generated: 2026-10-09*
*Approved: 2026-10-09*
*Status: APPROVED*
