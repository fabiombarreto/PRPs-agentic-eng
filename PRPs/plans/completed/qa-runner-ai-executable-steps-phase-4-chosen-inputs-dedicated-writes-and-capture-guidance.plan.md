# Feature: Chosen inputs, dedicated writes and capture guidance (Phase 4 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the plan vocabulary of `qa-run.mjs`: one new optional plan-entry key `chosen_inputs`, one new optional step key `effect`, a second reading of `login.config.json` (the per-role `dedicated` flag) and the first emission of the catalogued code `ROLE_NOT_DEDICATED`; `OUTCOMES`, `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, `USAGE`, `results.json` and `plan.json` shapes are unchanged); a false-pass hazard (a value the planner chose must be traceable to something the run actually observed or to a declared capture, and a write must never run for a role the kit does not declare dedicated); secret handling (a chosen literal and a role flag are never echoed into a reason, and no credential value is added anywhere); an existing command doc, two command docs, a knowledge-base page set and site pages amended around a script-validated vocabulary; knowledge-base edit under `docs/` with `docs_sync: true`; site-page edits under `documentation/` that existing tests bind to the script and the command doc (`documentation/AGENTS.md` applies); a kit-config key documented in `relay-auth-scripts.md` without any change to generated defaults or to the kit login template; no new network- or store-touching site (the `auth-local-guard-sites` call sites are untouched); frozen-surface constraint (five files byte-identical); no new validate check (the count stays 28)
- Decisions found:
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` Decisions Log "Writes": only for roles declared `dedicated`, because a write cannot be undone after detection; "Writes are declared, not detected" (Architecture Notes): the planner marks write steps, the kit declares dedicated roles, the dogfood reading checks that every request-issuing click was marked
  - Same PRD, Phase 4 scope: `chosen_inputs` with source validation; `effect: write` refusal for non-dedicated roles; the `dedicated` key in `login.config.json` documented in `relay-auth-scripts.md` without changing generated defaults; the capture guidance
  - Same PRD, Anti-patterns: "Flipping `figma_track` (or any future opt-in gating key) by heuristic" applies by analogy: the dedicated-role flag is declared by the operator, never inferred from a role name or a mechanism
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the plan-side-only boundary, the single write helper, `/relay-qa-report` unchanged
  - `docs/decisions.md` [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the outcome vocabulary is a closed set, a runner pass is evidence and not approval, secrets never reach reports, the local-only guard is permanent
  - `docs/decisions.md` [2026-04-19] "Secret redaction policy for Test Runner reports": unchanged; every new reason is a fixed sentence that carries no chosen literal, no locator word and no role slug
  - `docs/decisions.md` [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`": no resource file is edited, and in particular `auth-login.template.mjs` (and its `KIT_TEMPLATE_ID` stamp) stays byte-identical
  - `docs/decisions.md` [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen; `hybrid_code_review` is `false`
  - `docs/decisions.md` [2026-04-19] "PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`"
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a chosen literal is typed into a local page and never written to a reason, to `results.json` or to a comparison evidence file; the refusal sentences name an item position only
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing test is predicted to go stale (see `## Notes`), and none is edited by the Implementer; any unpredicted failure is routed to the test pair as `EXISTING_TEST_UPDATED`
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays non-interactive and standalone; a refused write is a `blocked` outcome, never a question
- Applicable architectural rules:
  - Interactivity boundary: no new extension; `/relay-qa-run` stays non-interactive and standalone
  - Command versus script separation: the command doc teaches the planner the two new keys and the script validates and enforces them; `writeEvidence` and `writeRunFile` are not edited and no second writer is added
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`); this phase adds none: the new `login.config.json` read is a local file read in the same shape as the existing ones, and `ROLE_NOT_DEDICATED` fires before any guard-protected site is reached
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`, and `evidence/` is ignored there
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, never `<base>..HEAD` or a HEAD-relative form; this phase's base is the phase-3 end-state tree object
  - `documentation/AGENTS.md`: a change under `documentation/` carries a changelog entry under `Unreleased`; NAV and the search index change only when a page is added, renamed or removed, and no page is added here; the version bump and the release heading belong to the release cut (Phase 8)
  - `npm run validate` keeps its 28 checks: `qa-run-contract` is not extended in this phase (its generic marked-example rule validates every new example against the script), and none is added
  - `qa-run-contract` source-text invariants stay true: `writeFileSync(` and `renameSync(` exactly once each, `// GUARD-SITE` and `// WRITE-SITE` exactly once each, no outcome literal outside the four values, `spawnSync(process.execPath` exactly once, the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` and `export function mintExpiryDue(` each exactly once, and `interactionHistory(` and `isPostInteractionSnapshot(` inside the section that runs from `export function precheckGroundedSteps(` to `export function summarizeEntries(`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 4: "Chosen inputs, dedicated writes and capture guidance" — Goal: let the planner fill what the report leaves open and write safely — Success signal: AC-11 and AC-12 fixtures pass; an unmarked chosen literal is refused.

## Summary

This phase gives the planner two declarations and the runner the checks that make them safe, and teaches both command docs to recommend stronger seed captures. All runner changes are in `plugins/relay/scripts/qa-run.mjs`. (1) **Chosen inputs (AC-11).** A browser plan entry may carry `chosen_inputs`, an array of at most 20 items `{ step, source, reason }`, each naming a `fill` step whose `value` the report leaves open. `source: "capture"` requires the value to be a `{{name}}` binding (already validated against the case's declared captures by `validateSteps`); `source: "snapshot"` requires a literal of at least 3 characters that appears, whitespace collapsed and case ignored, inside the `name` or `text` of an entry of some grounding snapshot of the run directory. A new pure validator `validateChosenInputs` checks the shape before anything else, and `chosenSnapshotRefusal` checks the snapshot membership as soon as the run context exists (still before any origin resolution, seed, session or request); a refusal is `PLAN_ENTRY_INVALID` with a fixed sentence that names an item position and never the literal. An expectation may then reference a chosen input: `groundLocators` gains an optional fifth parameter `chosen` (a default parameter, so `groundLocators.length` stays 4) and accepts an `expect_value` `equals`/`contains` or an `expect_text` `contains` that equals (or, for `contains`, is contained in) the value of an EARLIER chosen `fill`, with the refusal sentences byte-identical. A fill value is not otherwise restricted: the existing rule that every literal expectation comes from the report, a capture or now a chosen input is what refuses an unmarked chosen literal. (2) **Dedicated writes (AC-12).** A step may carry `effect: "write"` (the only legal value; valid on `click`, `fill` and `request`); `stepRules` validates it. In `executeCase`, right after the plan entry's steps and chosen inputs are validated and before the query module, the target, the context, any seed, session or request, the runner reads `PRPs/auth/login.config.json` and, when any step is marked, requires `roles[<role>].dedicated === true` (strict boolean; a missing role, a null role, a string `"true"` or any other value is not dedicated); otherwise the case is `blocked` `ROLE_NOT_DEDICATED` with the catalogued sentence prefixed by the marked step's position. `ROLE_NOT_DEDICATED` is already in `REASON_CATALOGUE` (class `gap`) and in `RUNNER_OWNED_REASON_CODES`; this phase is its first emitter, and a plan entry still cannot declare it. (3) **Docs.** `relay-qa-run.md` gains, after the "Result fields" paragraph, a block with a chosen-inputs paragraph and one marked plan-entry example, a write-steps paragraph and one marked step example, and a seed-capture paragraph with the marked `equals {{username}}` example (AC-23), plus one honesty bullet; `relay-qa-seed.md` gains the capture recommendation (AC-23) and `relay-auth-scripts.md` documents the `dedicated` key (operator-set, never generated, never changed by the merge or `--refresh`). The kit login template (`auth-login.template.mjs`, `KIT_TEMPLATE_ID` `auth-login/2`) is not edited. The knowledge base, the two site pages and the changelog state the same. The runner gains five exports (`validateChosenInputs`, `chosenSnapshotRefusal`, `chosenFillValues`, `firstWriteStep`, `isDedicatedRole`) plus two constants, all listed in the `qa-run.mjs` row of the API reference. No test is predicted to go stale; the Implementer touches no test file.

## User Story

As the operator of relay's human validation gate
I want the runner to type a value the report leaves open only when that value is traceable to a declared capture or to something the run observed, and to perform a state-changing step only for an account the kit declares dedicated
So that more steps are executed without a made-up input earning a pass and without a write reaching a real or shared account

## Problem Statement

`/relay-qa-run` 0.46.0 lost steps that need a value the report does not spell out: case 20's search half needs a query text (KD-17, 10 steps) and T-2 needs a new value, because every literal expectation has to come from the report's own steps and the planner has no declared, auditable way to choose one. It also has no notion of a write: a click that saves, deletes or sends runs against whichever account the case names, and the runner cannot tell a harmless click from a destructive one. Finally the seed declarations of the two reference projects capture no `username` and no seeded entity name (KD-14, KD-16), so profile fields could only be checked `not_empty` and a case asserted an older row instead of the seeded one.

## Solution Statement

Runner, two command docs, one auth-kit command doc, knowledge base, site pages; the outcome vocabulary, the reason-code catalogue, `results.json`, the kit login template and the validate checks are untouched. (1) Parsing: `stepRules` accepts `effect` (one legal value, three legal actions) as an early, total rule; `validateChosenInputs` is a pure, total validator for the entry key, with fixed sentences that name positions and never values. (2) Provenance: `chosenSnapshotRefusal` reads the same snapshot objects `groundLocators` already receives and requires a chosen `snapshot` literal to appear in one entry's name or text (minimum 3 characters); `groundLocators` lets an expectation match an earlier chosen fill. (3) Enforcement: `firstWriteStep` and `isDedicatedRole` are pure helpers, and one block in `executeCase` turns a marked step plus a non-dedicated role into a `blocked` `ROLE_NOT_DEDICATED` before any side effect. (4) Docs: additive blocks only, placed after every existing marked example and at points no existing test pins, so every existing pin keeps holding.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/commands/relay-qa-seed.md`; `plugins/relay/commands/relay-auth-scripts.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `docs/domain/flows.md`; `documentation/reference/commands.html`; `documentation/reference/scripts.html`; `documentation/changelog.html` |
| Dependencies | none new (row 4 of 9; `Depends` is `3`, `complete`; shares `lane:qa-run` with phases 1 to 7, so it runs serially after phase 3); Node built-ins only, no new package, no sibling import, no new `import()` |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 95-96 (AC-11, AC-12), 106-108 (AC-22, AC-23, AC-24), 208 (row 4), 232-235 (Phase 4 details), 276 (Writes decision) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 95-96, 106-108, 208, 232-235, 276 | AC-11, AC-12, AC-22 to AC-24, the row, the Phase 4 scope and the Writes decision this plan implements |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1289-1299 | `stepRules` head: the nested-form refusal after which Task 1 inserts the `effect` rule |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1404-1460 | `stepVariables`, `validateStep`, `validateSteps`: where the new helpers are inserted (directly above the JSDoc of `validateStep`) and the `{{name}}` binding rule the `capture` source relies on |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1907-2019 | `precheckGroundedSteps` and `groundLocators`: the signature Task 2 widens (default parameter) and the `expect_text` / `expect_value` literal rules it extends; this span sits inside the `precheckGroundedSteps` to `summarizeEntries` section pin |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2104-2112 | `ROLE_NOT_DEDICATED` in `REASON_CATALOGUE` (`blocked`, `gap`) and `RUNNER_OWNED_REASON_CODES` (READ-ONLY: its literal is mutated by a test) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3237-3240 | `isMintedRole`: the shape of a per-role flag read from `login.config.json` that `isDedicatedRole` follows |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3939-3952 | `loadGroundingSnapshots`: the snapshot objects `chosenSnapshotRefusal` receives |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3964-4026, 4085-4092 | `executeCase`: the validation order, the two insertion points of Task 3 and the `groundLocators` call that gains its fifth argument |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 576-584, 677-727, 801-825 | the Variables paragraph (the capture rule the guidance builds on), the plan-entry examples and the "Result fields" paragraph after which Task 4 inserts, and the honesty bullets |
| P0 | `plugins/relay/commands/relay-qa-seed.md` | 134-148, 152-159 | step 5 and the constraints Task 5 must keep (the command never writes `captures`) |
| P0 | `plugins/relay/commands/relay-auth-scripts.md` | 209-244 | the additive-merge and `--refresh` paragraphs next to which Task 5 documents `dedicated` (the "only files written" sentence is pinned and untouched) |
| P0 | `docs/api-reference.md` | 129 and the `qa-run.mjs` row (read the neighbourhood of line 219 to locate it) | the `/relay-qa-run` row and the export list that Task 6 extends |
| P0 | `docs/domain/glossary.md` | 385-409 | the catalogue paragraph (READ-ONLY) before which Task 6 inserts a paragraph |
| P0 | `docs/domain/flows.md` | 216-223 | the numbered item whose passage Task 6 extends |
| P0 | `documentation/reference/commands.html` | the `Step vocabulary` row (find the sentence `a locator that is neither is <code>PLAN_ENTRY_INVALID</code>`) | the row Task 7 extends |
| P0 | `documentation/reference/scripts.html` | the `Assertions and request count` row (find `the entry a later element capture uses.`) | the row Task 7 extends |
| P0 | `documentation/changelog.html` | 31-83 | the `Unreleased` block that Task 7 extends |
| P0 | `documentation/AGENTS.md` | 239-284, 318-330, 400-406 | the registration rule, the `Unreleased` entry rule and the modify-an-existing-page checklist that Task 7 follows |
| P1 | `scripts/validate/checks/qa-run-scoped-locators.test.mjs` | 183-196, 505-547 | READ-ONLY (R-X): `groundLocators.length` and `precheckGroundedSteps.length` must stay 4; exactly one marked example per scoped key (a new example must carry none of `within`, `name_prefix`, `label_text`, `index`); the `Run-time and scoped locators.` paragraph rules |
| P1 | `scripts/validate/checks/qa-run-network-docs.test.mjs` | 84-108 | READ-ONLY (R-X): exactly one marked `expect_requests` example and the paragraph order that the new block must not break |
| P1 | `scripts/validate/checks/qa-run-impossible-catalogue.test.mjs` | 118-160, 598-610, 655-656, 695-703 | READ-ONLY (R-X): the `ROLE_NOT_DEDICATED` reason must keep the word `dedicated`, a plan entry may not declare it, the "Result fields" paragraph must stay intact, the table row and the `Object.freeze([...])` literal are mutated by tests |
| P1 | `scripts/validate/checks/qa-run-vocabulary-pins.test.mjs` | 301-329 | READ-ONLY (R-X): the first-match example picks and `paragraphStarting` (one paragraph per prefix) |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 132-160, 746-823 | READ-ONLY: the marked-example rules (`validateStep` per step example, `validatePlanClassification` per plan-entry example), the banned strings and the phrase pins |
| P1 | `scripts/validate/checks/qa-run-input-value.test.mjs` | 286-337, 439-475 | READ-ONLY (R-X): the real-runner spawn shape, the report and plan shapes and the `results.json` location that the Task 3 gate copies |
| P1 | `plugins/relay/resources/auth-login.template.mjs` | 22-43, 122 | READ-ONLY: the role-key documentation and `KIT_TEMPLATE_ID = 'auth-login/2'`; this file must stay byte-identical |
| P2 | `PRPs/plans/completed/qa-runner-ai-executable-steps-phase-3-run-time-and-scoped-locators.plan.md` | 1289-1470 | READ-ONLY: the Level 1 to 3 structure, the frozen-surface and changed-file checks and the TAP corpus-gate parser this plan adapts |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1292-1299
  if (!isObj(s) || !isStr(s.action)) {
    const keys = isObj(s) ? Object.keys(s) : [];
    const known = driver === 'http' ? HTTP_ACTIONS : BROWSER_ACTIONS;
    if (keys.length === 1 && known.includes(keys[0]) && isObj(s[keys[0]])) {
      return bad('nested step form is not accepted; use the flat shape {"action": "<name>", ...}');
    }
    return bad('not an object with a string action');
  }
```
Copied by Task 1 (the `effect` rule is inserted directly after this block, so it runs on a step known to be an object with a string `action`, before the `query`, http and browser branches; the rule uses the same `bad(...)` fixed-sentence register).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3237-3240
  return roles !== null && Object.hasOwn(roles, role) && isObj(roles[role]) && roles[role].mechanism === 'minted';
```
Copied by Task 1 (the shape of a per-role flag test over `login.config.json`: own-property check, object check, strict comparison; `isDedicatedRole` is the pure, total version that takes the parsed config and the role).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1443-1459
export function validateSteps(driver, steps, boundNames = []) {
  let expectations = 0;
  ...
  for (const [i, s] of steps.entries()) {
    const r = stepRules(driver, s);
    if ('why' in r) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${r.why}` };
    expectations += r.expectations;
    for (const name of stepVariables(s)) {
      if (!boundNames.includes(name)) {
        return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: variable ${name} is not bound by a capture declared for this case` };
      }
    }
```
Copied by Task 2 (the `{ code: 'PLAN_ENTRY_INVALID', reason }` result shape, the fixed-sentence register that names a position, and the binding check that already guarantees a `capture`-sourced value is bound; `validateChosenInputs` returns the same shape and runs after `validateSteps`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2004-2016
    if (step.action === 'expect_text') {
      const ok = isStr(manualText) && isStr(step.contains) && collapse(manualText).includes(collapse(step.contains));
      if (!ok) return refuse(`step ${n}: expect_text contains must come from the report's own steps, not from the snapshot`);
    }
    if (step.action === 'expect_value') {
      // A literal expectation comes from the report's own steps; a {{name}} binding is validated against the declared captures.
      for (const key of ['equals', 'contains']) {
        const literal = step[key];
        if (!isStr(literal) || [...literal.matchAll(VARIABLE_PATTERN)].length > 0) continue;
        const ok = isStr(manualText) && collapse(manualText).includes(collapse(literal));
        if (!ok) return refuse(`step ${n}: expect_value ${key} must come from the report's own steps or be bound by a declared capture`);
      }
    }
```
Copied by Task 2 (the two `ok` expressions gain `|| chosenHas(...)`; the two refusal sentences stay byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1934-1944
export function groundLocators(steps, snapshots, manualText, role) {
  const wantRole = role === null ? 'anonymous' : role;
  const collapse = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  const report = isStr(manualText) ? collapse(manualText) : null;
  // A word is the report's own only when it is a non-blank string that the case's manual steps contain.
  const inReport = (/** @type {any} */ word) => report !== null && isStr(word) && word.trim() !== '' && report.includes(collapse(word));
  /** @type {number[]} */ const runtime = [];
```
Copied by Task 2 (the signature gains `chosen = []` as a DEFAULT parameter, which JavaScript excludes from `Function.length`, so the existing test that pins `groundLocators.length === 4` keeps passing; `chosenHas` is defined next to `inReport` and reuses `collapse`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3994-4003
  if (!Array.isArray(p.steps) || p.steps.length === 0) return out(needsHuman('PLAN_ENTRY_INVALID', 'the plan entry carries no steps'));
  // A seed declaration binds names; the values only arrive after the seed ran. A reference no declaration
  // binds is refused here, before any state is seeded, session obtained or request sent.
  const seedConfig = ctxOrNull ? ctxOrNull.seedConfig : readJsonOrNull(join(root, 'PRPs', 'auth', 'qa-seed.json'));
  const stateText = (kase.required_state ?? '').trim();
  const invalid = validateSteps(driver, p.steps, declaredCaptureNames(seedConfig, stateText, p.state));
  if (invalid) return out(needsHuman(invalid.code, invalid.reason));
  if (p.human_remainder !== undefined && !(isObj(p.human_remainder) && isStr(p.human_remainder.reason) && p.human_remainder.reason.trim() !== '')) {
    return out(needsHuman('PLAN_ENTRY_INVALID', 'human_remainder must be an object with a non-empty string reason'));
  }
```
Copied by Task 3 (the chosen-inputs shape check and the dedicated-role refusal go directly after the `human_remainder` check; the config read reuses the `ctxOrNull ? ctxOrNull.<field> : readJsonOrNull(join(root, 'PRPs', 'auth', ...))` idiom of line 3997).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4012-4026
  const ctx = ctxOrNull ?? makeCtx();
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'request' || s.origin === undefined) continue;
    ...
  }
  /** @type {number[]} */ let runtimeSteps = [];
  if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null)) {
    const grounded = groundLocators(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role);
    if (grounded.refusal !== null) return out(needsHuman(grounded.refusal.code, grounded.refusal.reason));
    runtimeSteps = grounded.runtime;
  }
```
Copied by Task 3 (the snapshot check goes directly after the `ctx` line and before the origin loop; the `groundLocators` call gains `p.chosen_inputs` as its fifth argument).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2104-2112 (the catalogue entry; the second line is the runner-owned list)
ROLE_NOT_DEDICATED: Object.freeze({ disposition: 'blocked', class: 'gap', reason: 'a write step names a role the kit does not declare dedicated; nothing was executed; the manual steps are reproduced verbatim', })
```
Read by Task 3 and NOT edited: the refusal sentence is `` `step ${n}: ${REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason}` ``, so the catalogue stays the single source of the wording (the line above is the entry as the research read it; the entry may be wrapped over several lines in the file).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:677-680
<!-- qa-plan-entry-example -->
```json
{ "index": 4, "title": "<copied exactly>", "class": "needs-a-new-driver", "reason_code": "VOCABULARY_GAP", "objective_steps": 3 }
```
```
Copied by Task 4 (the register of a marked plan-entry example: the marker line with no trailing space, a `json` fence and a flat one-line object; the new example follows the existing two, so any test that picks the first one keeps picking an old one).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:433-443
A literal `browser` step that picks one of several controls inside a group by position:

<!-- qa-step-example driver=browser -->
```json
{ "action": "click", "within": { "role": "navigation", "name": "Principal" }, "role": "button", "index": 0 }
```

`index` is the zero-based position, in document order, among the elements of `role` inside the
`within` scope, named or not, and needs both `role` and `within`. An `index` past the last
```
Copied by Task 4 (the register of a marked step example: one introducing line ending in a colon, the marker, a `json` fence and a flat one-line object, then the explanatory paragraph; the two new step examples carry none of `within`, `name_prefix`, `label_text` or `index`, because a test counts exactly one example per scoped key).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:576-584
Variables: `{{name}}` may appear in a path, body, fill value or expectation, and every
reference must be bound by a capture declared for the case's seed. An unbound
reference makes the case `needs-human` with `PLAN_ENTRY_INVALID`, naming the
variable, before anything is seeded, authenticated or requested. A variable is
bound only when the case's `declared` required state has a `captures` entry of that
name in `PRPs/auth/qa-seed.json`: write `{{name}}` only for names read there, never
invent one and never write a value.
```
Read by Task 4 and NOT edited: the seed-capture paragraph builds on this rule and points back to it; the paragraph keeps its opening word `Variables:`.

```
# SOURCE: plugins/relay/commands/relay-qa-seed.md:142-148
5. Final output: list the added entries (each `proposed`), the kept entries and every
   gap. Then state that no entry is runnable until the operator reviews `git diff` on
   `PRPs/auth/qa-seed.json`, writes any missing project seed script, adds `captures`
   and the declaration's `store`, and edits `status` to the confirmed value by hand.
   `/relay-qa-run` refuses `proposed` entries with `STATE_UNCONFIRMED` and
   `command: null` entries with `STATE_COMMAND_MISSING`. Name `/relay-qa-run` as the
   next step in prose.
```
Copied by Task 5 (step 5 stays byte-identical; a new indented paragraph follows it, in the 3-space register of the numbered item, so the capture recommendation belongs to the final output without the command ever writing `captures`).

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:216-218
Merge into `PRPs/auth/login.config.json` additively: an existing role entry is
never overwritten and an existing `baseUrl` is kept; write `baseUrl` from the
first `## Local Targets` URL when absent.
```
Copied by Task 5 (the additive-merge register: a short paragraph that states a key the command never writes and never changes; the `dedicated` paragraph is inserted before "Which roles `--refresh` covers.").

```
# SOURCE: docs/domain/glossary.md:385-391
Two fields of a `/relay-qa-run` plan entry (`plan.json`), both declared by the
planner and only validated and echoed by the runner, never inferred from the
report. `class` is the pre-run classification of a case: `automatable`,
`needs-a-new-driver`, `human-by-nature` or `blocked-by-product`; it is
independent of the outcome, and an entry with no class is reported
`unclassified`. `reason_code` names why a declining entry (a class and a code,
no steps) does not execute its case, drawn from a closed catalogue defined once
```
Copied by Task 6 (the glossary register: backticked identifiers, wrapped near 85 columns; the new paragraph is inserted directly before the `## QA grounding snapshot` heading and contains neither the token `REASON_CATALOGUE` nor the sentence `Visibility is judged as a person would`).

```
# SOURCE: docs/domain/flows.md:219-223
   that is neither is `PLAN_ENTRY_INVALID`. The optional keys `within`, `name_prefix`,
   `label_text` and `index` scope or reshape a locator (a group scope, a name matched
   by its start, an input found from its label text, the Nth element of a role in a
   scope) and are always resolved when the case runs.
   An element that exists only after a click or a fill is grounded in a second
```
Copied by Task 6 (the numbered-list item keeps its 3-space indent on every line; the new passage goes between the last two lines).

```
# SOURCE: documentation/changelog.html:50-56
        <li><strong>Run-time and scoped locators</strong> &mdash; a locator step whose name or text the report&rsquo;s own
          steps state no longer needs a snapshot entry: the runner resolves it when the case runs, passing on exactly one
          match and ending the case <code>needs-human</code> <code>STEP_UNGROUNDED</code> on none or several. Locator
          steps also take <code>within</code> (a group scope), <code>name_prefix</code> (a name that embeds a live count),
          <code>label_text</code> (an input whose label is not associated with it) and <code>index</code> (the Nth
          element of a role inside a scope), and <code>expect_requests</code> accepts an array of methods.</li>
      </ul>
```
Copied by Task 7 (the shape of an `Added` entry and of the closing list tag; no id is added; 8 spaces before `<li>`, 10 before continuation lines).

```
# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:313-320
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
```
Copied by Task 3 (the end-to-end gate spawns the REAL runner by absolute path with a temp root as `cwd`; the cases of the gate stop before any browser launch, so no Chromium is needed).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the vocabulary and helpers (`effect` rule in `stepRules`, `CHOSEN_INPUT_SOURCES`, `CHOSEN_INPUTS_MAX`, `validateChosenInputs`, `chosenSnapshotRefusal`, `chosenFillValues`, `firstWriteStep`, `isDedicatedRole`), the `groundLocators` fifth parameter, and the `executeCase` wiring |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | one block after the "Result fields" paragraph (chosen inputs with a marked plan-entry example, write steps with a marked step example, seed captures with the marked `equals {{username}}` example) and one honesty bullet |
| `plugins/relay/commands/relay-qa-seed.md` | UPDATE | the capture recommendation after step 5 (AC-23) |
| `plugins/relay/commands/relay-auth-scripts.md` | UPDATE | the `dedicated` key documented, never generated, never changed |
| `docs/api-reference.md` | UPDATE | the `/relay-qa-run` row (the two new declarations) and the `qa-run.mjs` row (the five new function exports) |
| `docs/domain/glossary.md` | UPDATE | one new paragraph before "QA grounding snapshot" |
| `docs/domain/flows.md` | UPDATE | one added passage in the numbered item that states the grounding rule |
| `documentation/reference/commands.html` | UPDATE | one sentence in the `Step vocabulary` row |
| `documentation/reference/scripts.html` | UPDATE | one sentence in the `Assertions and request count` row naming the new exports |
| `documentation/changelog.html` | UPDATE | one `Added` entry under `Unreleased`, as `documentation/AGENTS.md` requires for any change under `documentation/` |

## NOT Building (Scope Limits)

- The `judge` step and mode (Phase 5), channel sources and `read_message` (Phase 6), `preflight`, kit staleness, the record flag and fresh-cache dependencies (Phase 7), the release cut (Phase 8) and the dogfood (Phase 9).
- Detection of writes. Writes are declared by the planner and enforced for the declared steps only; an unmarked state-changing step is a planner defect that the Phase 9 reading checks. No rule refuses an unmarked `POST`, `PUT`, `PATCH` or `DELETE` request, because that would change the meaning of every existing http plan.
- A global provenance rule for `fill` values. A `fill` value stays unrestricted exactly as in 0.46.0 (the replayed-prefix rule is unchanged); the rule that refuses an unmarked chosen literal is the existing one: a literal expectation must come from the report's own steps, a declared capture or, now, an earlier chosen input.
- Chosen inputs for `http` `request` bodies, `query` steps, `goto` paths or `ground --prefix` steps: `chosen_inputs` is a browser-entry key naming `fill` steps only, and `parseGroundPrefix` still refuses unknown keys, so a prefix step never carries `effect`.
- Any edit of `plugins/relay/resources/auth-login.template.mjs`, the kit login scripts, the generated defaults of `/relay-auth-scripts` or `KIT_TEMPLATE_ID` (an edit would force `FAILED_KIT_SCRIPT_STALE` on every existing kit). The `dedicated` key is operator-authored; the merge and `--refresh` leave it untouched because they never change an existing key and never add this one.
- Any change to `OUTCOMES`, `REASON_CATALOGUE` (its entries, its reason text, its key set), `RUNNER_OWNED_REASON_CODES`, `USAGE`, `results.json` or `plan.json` shapes, the reason-code table of the command doc (the `ROLE_NOT_DEDICATED` row already reads correctly and a test mutates it), `writeEvidence`, `writeRunFile`, `settleAssertion`, `isVisibleToPerson`, `captureFinalPng`, `captureElementPng`, and any new static or dynamic `import`.
- A new source-text pin or any edit of `scripts/validate/checks/qa-run-contract.mjs` or of `documentation/reference/validation-checks.html`: the generic marked-example rule validates the three new examples, and the existence of each is covered by tests the test pair authors. No validate check is added or extended; the count stays 28.
- `docs/decisions.md`, NAV (`assets/js/app.js`), the search index, the plugin version, `documentation/reference/commands.html` rows other than the one named, and the `Grounding browser steps.` section of the command doc.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`, and any change to a reference report.
- Any test file. R-X strict: the Implementer authors zero test files; the new tests are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the `effect` step key, `firstWriteStep` and `isDedicatedRole`

- **ACTION**: Delivers the validation half of AC-A3 and the helper half of AC-A4. Two edits in `plugins/relay/scripts/qa-run.mjs`; nothing is enforced at run time yet.
  1. In `stepRules`, directly after the block that ends with `return bad('not an object with a string action');` and its closing brace (line 1299), insert:
     ```js
       // `effect` declares a step that changes state. Its one legal value is "write", and only a click, a fill or an
       // http request can carry it; a reason names the key, never a value.
       if (s.effect !== undefined) {
         if (s.effect !== 'write') return bad('effect must be "write" when present');
         if (s.action !== 'click' && s.action !== 'fill' && s.action !== 'request') return bad('effect applies only to click, fill and request steps');
       }
     ```
  2. Directly above the JSDoc of `validateStep` (the `/**` line that begins "Validates one plan step against the closed vocabulary", line 1425; this is outside the `precheckGroundedSteps` to `summarizeEntries` section and outside every other pinned section) insert the two helpers. Task 2 inserts its own block directly after these, in the same place.
     ```js
     /**
      * The zero-based index of the first step marked `"effect": "write"`, or -1. Pure and total.
      * @param {any} steps
      * @returns {number}
      */
     export function firstWriteStep(steps) {
       return Array.isArray(steps) ? steps.findIndex((s) => isObj(s) && s.effect === 'write') : -1;
     }

     /**
      * Whether the kit declares the role dedicated: its entry in the parsed `login.config.json` carries `dedicated`
      * set to the boolean `true`. Any other value, a missing role, a null role and a missing or malformed config are
      * not dedicated. Pure and total; it reads a parsed object and touches no file.
      * @param {any} loginConfig
      * @param {any} role
      * @returns {boolean}
      */
     export function isDedicatedRole(loginConfig, role) {
       if (!isObj(loginConfig) || !isObj(loginConfig.roles) || !isStr(role) || !Object.hasOwn(loginConfig.roles, role)) return false;
       const entry = loginConfig.roles[role];
       return isObj(entry) && entry.dedicated === true;
     }
     ```
  Constraints: keep every other line of `stepRules` byte-identical; do not write the substring `locator.within(` anywhere; do not add a second `// GUARD-SITE` or `// WRITE-SITE` comment; do not name a role, a mechanism or any heuristic in `isDedicatedRole` (the flag is declared, never inferred).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1292-1299` (the block after which the rule goes, and the `bad(...)` register) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3237-3240` (the per-role flag test).
- **VALIDATE**: delivers AC-A3 and AC-A4 (helpers). This gate fails on the unmodified tree (the two functions are not exported, and an `effect` of `"read"` is still accepted) and passes after the task. It also feeds hostile values to both helpers.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  for (const n of ["firstWriteStep", "isDedicatedRole"]) assert.equal(typeof m[n], "function", n + " is not exported");
  const ok = (d, s) => assert.equal(m.validateStep(d, s), null, JSON.stringify(s));
  const no = (d, s) => assert.equal(m.validateStep(d, s)?.code, "PLAN_ENTRY_INVALID", JSON.stringify(s));
  ok("browser", { action: "click", role: "button", name: "Save", effect: "write" });
  ok("browser", { action: "fill", selector: "#q", value: "x", effect: "write" });
  ok("http", { action: "request", method: "POST", path: "/x", expect_status: 200, effect: "write" });
  for (const bad of ["read", "WRITE", true, 1, null, {}, ["write"]]) no("browser", { action: "click", role: "button", name: "Save", effect: bad });
  no("browser", { action: "expect_visible", role: "button", name: "Save", effect: "write" });
  no("browser", { action: "goto", path: "/", effect: "write" });
  no("http", { action: "query", source: "d1", sql: "SELECT 1", expect_rows: 1, effect: "write" });
  assert.equal(m.firstWriteStep([{ action: "goto", path: "/" }, { action: "click", selector: "#a", effect: "write" }]), 1);
  assert.equal(m.firstWriteStep([{ action: "goto", path: "/" }]), -1);
  for (const s of [null, undefined, {}, "x", [null, 3]]) assert.equal(m.firstWriteStep(s), -1);
  const cfg = { roles: { a: { dedicated: true }, b: { dedicated: "true" }, c: {}, d: null, e: { dedicated: 1 } } };
  assert.equal(m.isDedicatedRole(cfg, "a"), true);
  for (const r of ["b", "c", "d", "e", "zz", "__proto__", "toString", null, undefined, 7]) assert.equal(m.isDedicatedRole(cfg, r), false, String(r));
  for (const c of [null, undefined, {}, { roles: [] }, { roles: "a" }, "x", 7]) assert.equal(m.isDedicatedRole(c, "a"), false);
  '
  ```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — `chosen_inputs`: the validator, the snapshot check and the `groundLocators` fifth parameter

- **ACTION**: Delivers AC-A1 and AC-A2 (PRD AC-11). Two edits in `plugins/relay/scripts/qa-run.mjs`.
  1. Directly after the `isDedicatedRole` function added by Task 1 (still above the JSDoc of `validateStep`), insert the constants and the three helpers:
     ```js
     /** The sources a chosen input may name, and the limits of the `chosen_inputs` array (chosen, not measured). */
     export const CHOSEN_INPUT_SOURCES = Object.freeze(['capture', 'snapshot']);
     export const CHOSEN_INPUTS_MAX = 20;
     const CHOSEN_REASON_MAX = 200;
     const CHOSEN_LITERAL_MIN = 3;

     /**
      * Validates the optional `chosen_inputs` key of a plan entry: an array of items `{ step, source, reason }`, each
      * naming a distinct `fill` step with a string value. A `capture` item needs a value that is a `{{name}}` binding
      * (validateSteps already refuses an unbound name); a `snapshot` item needs a literal value. Pure and total; a
      * reason names the key and an item position, never a value.
      * @param {string} driver
      * @param {any[]} steps
      * @param {any} chosen the entry's `chosen_inputs`, undefined when absent
      * @returns {{ code: string, reason: string } | null}
      */
     export function validateChosenInputs(driver, steps, chosen) {
       if (chosen === undefined) return null;
       const bad = (/** @type {string} */ why) => ({ code: 'PLAN_ENTRY_INVALID', reason: `chosen_inputs: ${why}` });
       if (driver !== 'browser') return bad('applies to browser entries only');
       if (!Array.isArray(chosen) || chosen.length === 0 || chosen.length > CHOSEN_INPUTS_MAX) {
         return bad(`must be a non-empty array of at most ${CHOSEN_INPUTS_MAX} items`);
       }
       if (!Array.isArray(steps)) return bad('needs the steps of the entry');
       /** @type {Set<number>} */ const seen = new Set();
       for (const [k, item] of chosen.entries()) {
         const at = `item ${k + 1}`;
         if (!isObj(item) || Object.keys(item).some((key) => !['step', 'source', 'reason'].includes(key))) return bad(`${at} takes only step, source and reason`);
         if (!Number.isInteger(item.step) || item.step < 1 || item.step > steps.length) return bad(`${at} step must be the 1-based position of a step of this entry`);
         if (seen.has(item.step)) return bad(`${at} repeats the step of an earlier item`);
         seen.add(item.step);
         const target = steps[item.step - 1];
         if (!isObj(target) || target.action !== 'fill' || !isStr(target.value)) return bad(`${at} must name a fill step with a string value`);
         if (!isStr(item.source) || !CHOSEN_INPUT_SOURCES.includes(item.source)) return bad(`${at} source must be capture or snapshot`);
         if (!isStr(item.reason) || item.reason.trim() === '' || item.reason.length > CHOSEN_REASON_MAX) {
           return bad(`${at} reason must be a non-empty string of at most ${CHOSEN_REASON_MAX} characters`);
         }
         const bound = [...target.value.matchAll(VARIABLE_PATTERN)].length > 0;
         if (item.source === 'capture' && !bound) return bad(`${at} source capture needs a value that is a {{name}} binding`);
         if (item.source === 'snapshot' && bound) return bad(`${at} source snapshot needs a literal value, not a {{name}} binding`);
       }
       return null;
     }

     /**
      * The literal values of the chosen `fill` steps, with the zero-based index of each step. A step that is not a
      * fill, or whose value is a `{{name}}` binding, is skipped. Pure and total.
      * @param {any} steps
      * @param {any} chosen
      * @returns {{ at: number, value: string }[]}
      */
     export function chosenFillValues(steps, chosen) {
       /** @type {{ at: number, value: string }[]} */ const out = [];
       if (!Array.isArray(steps) || !Array.isArray(chosen)) return out;
       for (const item of chosen) {
         if (!isObj(item) || !Number.isInteger(item.step)) continue;
         const s = steps[item.step - 1];
         if (!isObj(s) || s.action !== 'fill' || !isStr(s.value) || [...s.value.matchAll(VARIABLE_PATTERN)].length > 0) continue;
         out.push({ at: item.step - 1, value: s.value });
       }
       return out;
     }

     /**
      * Requires every `snapshot`-sourced chosen value to appear (whitespace collapsed, case ignored, at least 3
      * characters) inside the `name` or `text` of an entry of some grounding snapshot of the run directory. Returns
      * the first refusal or null. The reason names an item position and never the value. Pure and total.
      * @param {any} steps
      * @param {any} chosen
      * @param {any} snapshots the objects `loadGroundingSnapshots` returns
      * @returns {{ code: string, reason: string } | null}
      */
     export function chosenSnapshotRefusal(steps, chosen, snapshots) {
       if (!Array.isArray(chosen) || !Array.isArray(steps)) return null;
       const flat = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
       /** @type {string[]} */ const words = [];
       for (const snap of Array.isArray(snapshots) ? snapshots : []) {
         if (!isObj(snap) || !Array.isArray(snap.entries)) continue;
         for (const e of snap.entries) {
           if (!isObj(e)) continue;
           const w = e.kind === 'role' ? e.name : e.kind === 'text' ? e.text : null;
           if (isStr(w)) words.push(flat(w));
         }
       }
       for (const [k, item] of chosen.entries()) {
         if (!isObj(item) || item.source !== 'snapshot') continue;
         const s = Number.isInteger(item.step) ? steps[item.step - 1] : undefined;
         const literal = isObj(s) && isStr(s.value) ? flat(s.value) : '';
         if (literal.length < CHOSEN_LITERAL_MIN || !words.some((w) => w.includes(literal))) {
           return {
             code: 'PLAN_ENTRY_INVALID',
             reason: `chosen_inputs: item ${k + 1} chose a value that appears in no grounding snapshot of the run directory; ground the page that shows it first, or bind the input to a declared capture`,
           };
         }
       }
       return null;
     }
     ```
  2. In `groundLocators` (inside the `precheckGroundedSteps` to `summarizeEntries` section; keep `interactionHistory(` and `isPostInteractionSnapshot(` in it):
     (a) Add a JSDoc line `@param {any} [chosen] the entry's chosen_inputs; an expectation may match the value of an EARLIER chosen fill` and change the signature line to `export function groundLocators(steps, snapshots, manualText, role, chosen = []) {`. The default parameter is required: `groundLocators.length` must stay 4.
     (b) Directly after the `inReport` line, add:
     ```js
       // A chosen fill is a second source for an expectation, but only for a step AFTER it. An empty literal matches nothing.
       const chosenFills = chosenFillValues(steps, chosen);
       const chosenHas = (/** @type {any} */ literal, /** @type {number} */ before, /** @type {boolean} */ whole) =>
         isStr(literal) && collapse(literal) !== '' && chosenFills.some((c) => c.at < before && (whole ? collapse(c.value) === collapse(literal) : collapse(c.value).includes(collapse(literal))));
     ```
     (c) In the `expect_text` rule replace the `ok` line with `const ok = (isStr(manualText) && isStr(step.contains) && collapse(manualText).includes(collapse(step.contains))) || chosenHas(step.contains, i, false);` and in the `expect_value` rule replace the `ok` line with `const ok = (isStr(manualText) && collapse(manualText).includes(collapse(literal))) || chosenHas(literal, i, key === 'equals');`. Both refusal sentences stay byte-identical.
  Constraints: `precheckGroundedSteps` is not edited (it stays the 4-argument wrapper); `groundLocators` returns the same shape; the helpers go above `validateStep`, never between `export function precheckGroundedSteps(` and `export function summarizeEntries(`; no helper writes anything or reads a file; no comment in this task may contain the text `locator.within(`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1443-1459` (the result shape, the register of the fixed sentences and the binding rule the `capture` source relies on), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1934-1944` (the signature and `collapse`/`inReport`) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2004-2016` (the two rules that gain the second source).
- **VALIDATE**: delivers AC-A1 and AC-A2. Fails on the unmodified tree (the functions are not exported; an expectation on a chosen value is refused) and passes after the task; it also pins the arity, the order rule (a chosen fill counts only for a later step), the minimum length, the whitespace and case folding, the absence of the literal in every refusal, and totality on hostile values.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  for (const n of ["validateChosenInputs", "chosenSnapshotRefusal", "chosenFillValues"]) assert.equal(typeof m[n], "function", n + " is not exported");
  assert.deepEqual([...m.CHOSEN_INPUT_SOURCES], ["capture", "snapshot"]);
  assert.equal(m.CHOSEN_INPUTS_MAX, 20);
  assert.equal(m.groundLocators.length, 4, "the fifth parameter must be a default parameter");
  assert.equal(m.precheckGroundedSteps.length, 4);
  const FILL = { action: "fill", role: "textbox", name: "Busca", value: "Maria" };
  const BOUND = { action: "fill", role: "textbox", name: "Busca", value: "{{username}}" };
  const steps = [{ action: "goto", path: "/" }, FILL, BOUND, { action: "click", role: "button", name: "Ok" }];
  const item = (o) => ({ step: 2, source: "snapshot", reason: "the page lists it", ...o });
  assert.equal(m.validateChosenInputs("browser", steps, undefined), null);
  assert.equal(m.validateChosenInputs("browser", steps, [item({})]), null);
  assert.equal(m.validateChosenInputs("browser", steps, [item({}), item({ step: 3, source: "capture" })]), null);
  const refuse = (driver, chosen) => {
    const r = m.validateChosenInputs(driver, steps, chosen);
    assert.equal(r?.code, "PLAN_ENTRY_INVALID", JSON.stringify(chosen));
    assert.ok(r.reason.startsWith("chosen_inputs: "), r.reason);
    assert.ok(!r.reason.includes("Maria"), "a refusal echoed the value");
  };
  refuse("http", [item({})]);
  for (const chosen of [null, "x", {}, [], 7, [null], ["x"], [[]], [item({ step: 1 })], [item({ step: 4 })], [item({ step: 9 })], [item({ step: 0 })], [item({ step: "2" })], [item({ step: 2.5 })], [item({ source: "other" })], [item({ source: 5 })], [item({ reason: "" })], [item({ reason: "  " })], [item({ reason: "x".repeat(201) })], [item({ reason: 5 })], [item({ extra: 1 })], [item({}), item({})], [item({ source: "capture" })], [item({ step: 3 })], Array.from({ length: 21 }, () => item({}))]) refuse("browser", chosen);
  assert.equal(m.validateChosenInputs("browser", "x", [item({})])?.code, "PLAN_ENTRY_INVALID");
  const snaps = [{ schema_version: 1, role: "anonymous", route: "/", entries: [{ kind: "role", role: "link", name: "Maria  Silva", matches: 1 }, { kind: "text", text: "Resultado", matches: 1 }] }, null, 5, { entries: "x" }];
  assert.equal(m.chosenSnapshotRefusal(steps, [item({})], snaps), null);
  assert.equal(m.chosenSnapshotRefusal(steps, undefined, snaps), null);
  assert.equal(m.chosenSnapshotRefusal(steps, [item({ source: "capture", step: 3 })], []), null);
  const withValue = (value) => [{ action: "goto", path: "/" }, { ...FILL, value }];
  assert.equal(m.chosenSnapshotRefusal(withValue("maria silva"), [item({})], snaps), null, "whitespace and case fold");
  assert.equal(m.chosenSnapshotRefusal(withValue("Resultado"), [item({})], snaps), null);
  for (const value of ["Joao Pereira", "Ma", "", "  "]) assert.equal(m.chosenSnapshotRefusal(withValue(value), [item({})], snaps)?.code, "PLAN_ENTRY_INVALID", JSON.stringify(value));
  assert.ok(!m.chosenSnapshotRefusal(withValue("Joao Pereira"), [item({})], snaps).reason.includes("Joao"), "a refusal echoed the value");
  assert.equal(m.chosenSnapshotRefusal(steps, [item({}), null, "x", { source: "snapshot" }], snaps)?.code, "PLAN_ENTRY_INVALID", "an item with no step chose nothing that a snapshot lists");
  assert.deepEqual(m.chosenFillValues(steps, [item({}), item({ step: 3, source: "capture" }), item({ step: 4 }), null, "x"]), [{ at: 1, value: "Maria" }]);
  assert.deepEqual(m.chosenFillValues(null, null), []);
  const SNAP = { schema_version: 1, role: "anonymous", route: "/", entries: [{ kind: "role", role: "textbox", name: "Busca", matches: 1 }], withheld: 0 };
  const manual = "Open the page and use the search.";
  const exp = (o) => ({ action: "expect_value", role: "textbox", name: "Busca", ...o });
  const flow = [{ action: "goto", path: "/" }, FILL, exp({ equals: "Maria" })];
  assert.equal(m.groundLocators(flow, [SNAP], manual, null).refusal?.code, "PLAN_ENTRY_INVALID", "an unmarked chosen literal must be refused");
  assert.equal(m.groundLocators(flow, [SNAP], manual, null, [item({})]).refusal, null);
  assert.equal(m.groundLocators(flow, [SNAP], manual, null, [item({ step: 1 })]).refusal?.code, "PLAN_ENTRY_INVALID", "a non-fill item chooses nothing");
  const early = [{ action: "goto", path: "/" }, exp({ equals: "Maria" }), FILL];
  assert.equal(m.groundLocators(early, [SNAP], manual, null, [item({ step: 3 })]).refusal?.code, "PLAN_ENTRY_INVALID", "a chosen fill counts only for a later step");
  const part = [{ action: "goto", path: "/" }, FILL, exp({ equals: "Mar" })];
  assert.equal(m.groundLocators(part, [SNAP], manual, null, [item({})]).refusal?.code, "PLAN_ENTRY_INVALID", "equals needs the whole chosen value");
  assert.equal(m.groundLocators([{ action: "goto", path: "/" }, FILL, exp({ contains: "Mar" })], [SNAP], manual, null, [item({})]).refusal, null);
  const textFlow = [{ action: "goto", path: "/" }, FILL, { action: "expect_text", text: "Resultado", contains: "Maria" }];
  assert.equal(m.groundLocators(textFlow, [SNAP], manual + " See Resultado.", null).refusal?.code, "PLAN_ENTRY_INVALID");
  assert.equal(m.groundLocators(textFlow, [SNAP], manual + " See Resultado.", null, [item({})]).refusal, null);
  for (const hostile of ["x", null, {}, 7, [null], [{ step: "a" }]]) assert.doesNotThrow(() => m.groundLocators(flow, [SNAP], manual, null, hostile));
  '
  ```

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — wire the checks into `executeCase`

- **ACTION**: Delivers AC-A1 and AC-A3 at run time and AC-A4 (a dedicated role proceeds). Four small edits inside `executeCase`; no other function changes.
  1. Directly after the `human_remainder` check (the `if (p.human_remainder !== undefined && ...) { ... }` block that ends at line 4003) insert:
     ```js
       // The chosen inputs are checked for shape before anything else is read, and a write is allowed only for a role the
       // kit declares dedicated. Both refusals come before the query module, the target, any seed, session or request.
       const invalidChosen = validateChosenInputs(driver, p.steps, p.chosen_inputs);
       if (invalidChosen) return out(needsHuman(invalidChosen.code, invalidChosen.reason));
       const writeAt = firstWriteStep(p.steps);
       if (writeAt !== -1) {
         const kitConfig = ctxOrNull ? ctxOrNull.loginConfig : readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json'));
         if (!isDedicatedRole(kitConfig, role)) {
           return out(blocked('ROLE_NOT_DEDICATED', `step ${writeAt + 1}: ${REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason}`));
         }
       }
     ```
  2. Directly after the line `const ctx = ctxOrNull ?? makeCtx();` (line 4012) and before the `for (const [i, s] of p.steps.entries())` origin loop, insert:
     ```js
       if (p.chosen_inputs !== undefined) {
         const chosenRefusal = chosenSnapshotRefusal(p.steps, p.chosen_inputs, loadGroundingSnapshots(ctx.runDirAbs));
         if (chosenRefusal) return out(needsHuman(chosenRefusal.code, chosenRefusal.reason));
       }
     ```
  3. In the `groundLocators(...)` call (line 4023) append the fifth argument: `groundLocators(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role, p.chosen_inputs)`.
  Constraints: do not edit the line `const invalid = validateSteps(...)`; do not reorder any existing check; do not add a second `readJsonOrNull(` of `qa-seed.json`; do not touch the `ROLE_UNDECLARED` checks (a marked write for a role that is not even declared is refused `ROLE_NOT_DEDICATED` first, which is correct: an undeclared role is not dedicated); do not write the `abs` anchor line `const abs = join(ctx.runDirAbs, 'evidence', name);` or any of the single-occurrence lines listed in `## Notes`; no new `import`. `ROLE_NOT_DEDICATED` is already catalogued and the plan-side refusal of a declared `ROLE_NOT_DEDICATED` reason code (`RUNNER_OWNED_REASON_CODES`) is untouched.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3994-4003` (the placement and the `ctxOrNull ? ... : readJsonOrNull(...)` idiom), `# SOURCE: plugins/relay/scripts/qa-run.mjs:4012-4026` (the context line, the origin loop and the `groundLocators` call), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2104-2112` (the catalogue sentence reused as the reason) and `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:313-320` (the real-runner spawn shape of the gate).
- **VALIDATE**: delivers AC-A1, AC-A3 and AC-A4 end to end through the REAL runner. Fails on the unmodified tree (the first three cases end `SESSION_UNAVAILABLE` or another code, not `ROLE_NOT_DEDICATED`) and passes after. No case reaches a browser: the write refusals come before the target, the chosen refusals before any origin or Chromium work, and the two dedicated/read cases stop at the missing kit login script (`SESSION_UNAVAILABLE`) or at an unresolvable Playwright (`FAILED_PLAYWRIGHT_UNAVAILABLE`); the base URL is a local port nothing listens on and no request is made. The temporary root lives outside any git work tree.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { spawnSync } from "node:child_process";
  const RUNNER = join(process.cwd(), "plugins", "relay", "scripts", "qa-run.mjs");
  const FEATURE = "chosen-demo";
  const RUN_REL = "PRPs/reports/chosen-demo/qa-run/20261021T000000000Z";
  const LITERAL = "zz-chosen-literal";
  const root = mkdtempSync(join(tmpdir(), "relay-phase4-"));
  try {
    const runDir = join(root, ...RUN_REL.split("/"));
    mkdirSync(join(runDir, "grounding"), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:9", roles: { editor: {}, viewer: { dedicated: true }, loose: { dedicated: "true" } } }));
    writeFileSync(join(runDir, "grounding", "anonymous--search.snapshot.json"), JSON.stringify({ schema_version: 1, role: "anonymous", route: "/search", entries: [{ kind: "role", role: "link", name: "Maria Silva", matches: 1 }], withheld: 0 }));
    const GOTO = { action: "goto", path: "/" };
    const URLOK = { action: "expect_url", path: "/" };
    const SAVE = { action: "click", selector: "#save", effect: "write" };
    const defs = [
      { title: "Write by a plain role", role: "editor", steps: [GOTO, SAVE, URLOK] },
      { title: "Write by an anonymous visitor", role: null, steps: [GOTO, SAVE, URLOK] },
      { title: "Write by a role flagged with a string", role: "loose", steps: [GOTO, SAVE, URLOK] },
      { title: "Write by a dedicated role", role: "viewer", steps: [GOTO, SAVE, URLOK] },
      { title: "Read by a plain role", role: "editor", steps: [GOTO, URLOK] },
      { title: "Chosen literal in no snapshot", role: null, steps: [{ action: "goto", path: "/search" }, { action: "fill", selector: "#q", value: LITERAL }, { action: "expect_url", path: "/search" }], chosen_inputs: [{ step: 2, source: "snapshot", reason: "picked from the page" }] },
      { title: "Chosen input on a step that is not a fill", role: null, steps: [GOTO, URLOK], chosen_inputs: [{ step: 1, source: "snapshot", reason: "wrong step" }] },
    ];
    const block = (n, d) => ["### Case " + n, "**Title:** " + d.title, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", "2. Check the result.", ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + defs.map((d, i) => block(i + 1, d)).join("\n") + "\n## Notes\n\nnone\n");
    writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: "browser", role: d.role, state: "none", steps: d.steps, ...(d.chosen_inputs ? { chosen_inputs: d.chosen_inputs } : {}) })) }));
    const run = spawnSync(process.execPath, [RUNNER, "run", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL], { cwd: root, encoding: "utf8", timeout: 120000, env: process.env });
    const resultsPath = join(root, ...RUN_REL.split("/"), "results.json");
    assert.ok(existsSync(resultsPath), "no results.json: " + run.stdout + run.stderr);
    const raw = readFileSync(resultsPath, "utf8");
    const c = JSON.parse(raw).cases;
    assert.equal(c.length, defs.length);
    const at = (i) => [c[i].outcome, c[i].reason_code];
    for (const i of [0, 1, 2]) assert.deepEqual(at(i), ["blocked", "ROLE_NOT_DEDICATED"], defs[i].title + ": " + JSON.stringify(c[i]));
    assert.ok(c[0].reason.startsWith("step 2: "), c[0].reason);
    assert.ok(c[0].reason.includes("dedicated"), c[0].reason);
    for (const i of [3, 4]) assert.notEqual(c[i].reason_code, "ROLE_NOT_DEDICATED", defs[i].title + ": " + JSON.stringify(c[i]));
    assert.deepEqual(at(5), ["needs-human", "PLAN_ENTRY_INVALID"], JSON.stringify(c[5]));
    assert.deepEqual(at(6), ["needs-human", "PLAN_ENTRY_INVALID"], JSON.stringify(c[6]));
    assert.ok(!raw.includes(LITERAL), "results.json carries a chosen literal");
    for (const x of c) for (const slug of ["editor", "viewer", "loose"]) assert.ok(!String(x.reason ?? "").includes(slug), "a reason names a role slug: " + x.reason);
    console.log("PASS: write refusals, chosen refusals and the dedicated pass-through behave end to end");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  '
  ```

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — chosen inputs, write steps and seed captures

- **ACTION**: Delivers AC-A6 (PRD AC-22 for the new keys) and the `relay-qa-run.md` half of AC-A5 (PRD AC-23). Two `Edit` calls; do not touch the reason-code table, the "Result fields" paragraph or any marked example that exists today.
  1. Insert the block below directly before the paragraph that starts `The paragraphs that follow (the declaration schema, origins, query sources, the` (the old text is that one physical line; the new text is the block, a blank line, then that line). The block is placed after every existing marked example, so tests that pick the first matching example keep picking the old ones; it contains no marked `expect_requests` example and no example carrying `within`, `name_prefix`, `label_text` or `index`; every code fence is a `json` fence; none of the strings `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type` appears.
     ````
     Chosen inputs. When the report leaves a value open (the text of a search, the new value
     of a field), the entry may choose it and declare the choice in a top-level
     `chosen_inputs` array of the entry, one item per chosen `fill`:

     <!-- qa-plan-entry-example -->
     ```json
     { "index": 5, "title": "<copied exactly>", "class": "automatable", "driver": "browser", "role": null, "state": "none", "objective_steps": 4, "steps": [ { "action": "goto", "path": "/search" }, { "action": "fill", "role": "textbox", "name": "Buscar", "value": "Maria" }, { "action": "expect_value", "role": "textbox", "name": "Buscar", "equals": "Maria" } ], "chosen_inputs": [ { "step": 2, "source": "snapshot", "reason": "the report asks for a search and names no text; the value is a name the snapshot lists" } ] }
     ```

     Each item is `{ "step": <position>, "source": "capture" | "snapshot", "reason": "<why>" }`:
     `step` is the 1-based position of a `fill` step with a string `value`, `source` says
     where the value comes from and `reason` (at most 200 characters) says why the report
     leaves it open. With `"source": "capture"` the `value` is a `{{name}}` binding of a
     declared capture. With `"source": "snapshot"` the `value` is a literal of at least 3
     characters that appears, whitespace collapsed and case ignored, inside the `name` or
     `text` of an entry of some snapshot in `<RUN_DIR>/grounding/`; a literal found in no
     snapshot makes the entry `PLAN_ENTRY_INVALID` before anything is seeded,
     authenticated or requested, and so does an item that names a step that is not a
     `fill`, repeats a step, or sits in an `http` entry. A value the snapshot withheld
     cannot be chosen. A later `expect_value` (`equals` or `contains`) or `expect_text`
     (`contains`) may use the chosen value of an earlier `fill` as its expected value; an
     expected value that is neither in the report's own steps, nor a `{{name}}` binding,
     nor a chosen value is still `PLAN_ENTRY_INVALID`. Choose only what the report leaves
     open: write a value the report states as it states it, and never choose a value to
     make an assertion pass.

     A literal `browser` step that changes data, marked as a write:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "click", "role": "button", "name": "Save", "effect": "write" }
     ```

     `effect` has one legal value, `"write"`, and only a `click`, `fill` or `request` step
     may carry it; any other value, and the key on any other step, is `PLAN_ENTRY_INVALID`.
     Mark every step that creates, changes or deletes data. The runner refuses a case with
     a marked step unless the case's role has `"dedicated": true` in
     `PRPs/auth/login.config.json`: the case ends `blocked` with `ROLE_NOT_DEDICATED`,
     naming the marked step, before anything is seeded, authenticated or requested, and an
     entry with no role is not dedicated. The flag is set by the operator, never by you:
     read which roles carry it, never write it and never decide that a role is dedicated.
     The runner does not detect writes, so an unmarked step that saves, deletes or sends is
     your defect; plan the marked steps anyway and let the runner report the block.

     Seed captures worth using. A declaration may capture the identity of the account it
     seeds (`username`) and the names or titles of the entities it seeds. When the
     declaration of the case's state binds them (see Variables above), assert with the
     binding instead of a weaker check: a profile field equals the seeded username, and the
     row the case acts on is found by its seeded title, never by an older row with a similar
     name. A literal `browser` step that asserts a profile field against the seeded username:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "expect_value", "role": "textbox", "name": "Nome de usuário", "equals": "{{username}}" }
     ```

     Write `{{username}}` only when `PRPs/auth/qa-seed.json` captures `username` for the
     case's state. When the declaration lacks it, fall back to `not_empty` and tell the
     operator in the run summary that capturing `username` would allow a stronger check.
     `/relay-qa-seed` recommends these captures; the planner never edits the declaration.
     ````
  2. In the honesty rules, directly after the bullet that ends `state.` (the two lines `- Never invent a selector, path, credential or expected value the steps do not` / `  state.`), add the bullet:
     ```
     - A value the report leaves open may be chosen only through `chosen_inputs`, from a
       declared capture or from the snapshot, and every step that changes data carries
       `"effect": "write"`; never type a value you invented.
     ```
  Pins to keep (do not disturb): the opening words of the paragraphs the tests locate (`Run-time and scoped locators.`, `Grounding rules.`, `Personal data.`, `Grounding after an interaction.`, `Result fields. Each case in `results.json``, `Variables:`, `Partial plans:`, `Per-step results:`) each stay unique and in order; the "Result fields" paragraph keeps its collapsed ending `The four-key `counts` partition is unchanged.`; the reason-code table rows (one line each, `ROLE_NOT_DEDICATED` included) stay byte-identical; the honesty bullet `Plan `expect_requests` only when` stays directly after `Plan a `ground` prefix only from`; the existing marked examples stay first in the file; there must be exactly one marked example per scoped key and one marked `expect_requests` example.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:677-680` (the marked plan-entry register), `# SOURCE: plugins/relay/commands/relay-qa-run.md:433-443` (the marked step register and the explanatory paragraph after it) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:576-584` (the Variables rule the capture paragraph points back to).
- **VALIDATE**: gate on authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line), then a behavioural check that parses the three new marked examples out of the real document and validates them with the runner's own validators, then the contract check and the tests that pin this document. The greps fail on the unmodified tree; the behavioural check fails if an example does not validate; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'Chosen inputs. When the report leaves a value open' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '`chosen_inputs` array of the entry, one item per chosen `fill`:' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'A literal `browser` step that changes data, marked as a write:' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '{ "action": "click", "role": "button", "name": "Save", "effect": "write" }' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'Seed captures worth using. A declaration may capture the identity of the account it' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '{ "action": "expect_value", "role": "textbox", "name": "Nome de usuário", "equals": "{{username}}" }' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '- A value the report leaves open may be chosen only through `chosen_inputs`, from a' plugins/relay/commands/relay-qa-run.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
  const steps = [...doc.matchAll(/<!-- qa-step-example driver=(\w+) -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g)].map((x) => ({ driver: x[1], step: JSON.parse(x[2]) }));
  const write = steps.filter((e) => e.step.effect === "write");
  assert.equal(write.length, 1, "exactly one marked write example");
  assert.equal(m.validateStep(write[0].driver, write[0].step), null);
  const user = steps.filter((e) => e.step.action === "expect_value" && e.step.equals === "{{username}}");
  assert.equal(user.length, 1, "exactly one marked equals {{username}} example");
  assert.equal(m.validateStep(user[0].driver, user[0].step), null);
  assert.equal(m.validateSteps("browser", [{ action: "goto", path: "/" }, user[0].step], ["username"]), null, "the example validates when username is a declared capture");
  const entries = [...doc.matchAll(/<!-- qa-plan-entry-example -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g)].map((x) => JSON.parse(x[1])).filter((e) => e.chosen_inputs !== undefined);
  assert.equal(entries.length, 1, "exactly one marked plan-entry example with chosen_inputs");
  const e = entries[0];
  assert.equal(m.validatePlanClassification(e), null);
  assert.equal(m.validateSteps(e.driver, e.steps, []), null);
  assert.equal(m.validateChosenInputs(e.driver, e.steps, e.chosen_inputs), null);
  const withKeys = steps.filter((x) => ["within", "name_prefix", "label_text", "index"].some((k) => x.step[k] !== undefined && (x.step.effect !== undefined || x.step.equals === "{{username}}")));
  assert.equal(withKeys.length, 0, "a new example carries a scoped key, which would break the one-example-per-key test");
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-query.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
  ```
  (`validatePlanClassification` is an existing export. The `withKeys` assertion reads the new examples only. This task's gate needs Tasks 1 and 2 done, because the example is validated with their functions.)

### Task 5: UPDATE plugins/relay/commands/relay-qa-seed.md and plugins/relay/commands/relay-auth-scripts.md — the capture recommendation and the `dedicated` key

- **ACTION**: Delivers AC-A5 (PRD AC-23, the seed half) and AC-A4 (PRD AC-12, the kit half). Two narrow `Edit` calls, one per file.
  1. `plugins/relay/commands/relay-qa-seed.md`: step 5 and the constraints stay byte-identical. Insert a new paragraph after step 5, before the horizontal rule that precedes `## Constraints (hard rules)`: `old_string` = `   next step in prose.` followed by a blank line, `---`, a blank line and `## Constraints (hard rules)` (copy the five lines from the file), `new_string` = the same lines with this paragraph (3-space indent, a blank line before and after) between `   next step in prose.` and the `---`:
     ```
        Also recommend, in prose only, that the operator declare `captures` for the identity
        of each seeded account (`username`) and for the names or titles of the entities a
        state seeds (a seeded occurrence title, a seeded task name): `/relay-qa-run` can then
        assert a profile field with `equals {{username}}` and act on the seeded row instead
        of an older one. This command only recommends: it never writes `captures`, and a
        proposal still carries none.
     ```
  2. `plugins/relay/commands/relay-auth-scripts.md`: insert a paragraph directly before the paragraph that starts `Which roles `--refresh` covers.` (`old_string` = that first line of the paragraph, `A run selects the roles` follows on the same physical line in the file, so copy only the leading `Which roles `--refresh` covers.` and keep the rest of the line in the `new_string`):
     ```
     Dedicated roles. A role entry may carry `"dedicated": true`, set by the operator by
     hand, to declare that the role's account belongs to the local test environment alone,
     so that `/relay-qa-run` may run the steps it marks as writes for that role. This command
     never writes the key: a generated role entry has no `dedicated` key, the additive merge
     and `--refresh` never add or change it, and any value other than the boolean `true`
     means the role is not dedicated. The key holds no credential and no session.
     ```
  Constraints: in `relay-auth-scripts.md` the sentence `**The only files written** are ...` and every other pinned sentence stay byte-identical; do not edit the template, the generated-defaults list or the `--refresh` field list; do not write a credential-shaped example value.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-seed.md:142-148` (the numbered-item register) and `# SOURCE: plugins/relay/commands/relay-auth-scripts.md:216-218` (the additive-merge register).
- **VALIDATE**: gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line), assert the template and the generated-defaults text are untouched, then run the contract check and the tests that read these two documents. The greps fail on the unmodified tree; the rest pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'Also recommend, in prose only, that the operator declare `captures` for the identity' plugins/relay/commands/relay-qa-seed.md
  grep -qF -- 'assert a profile field with `equals {{username}}` and act on the seeded row instead' plugins/relay/commands/relay-qa-seed.md
  grep -qF -- 'Dedicated roles. A role entry may carry `"dedicated": true`, set by the operator by' plugins/relay/commands/relay-auth-scripts.md
  grep -qF -- 'and `--refresh` never add or change it, and any value other than the boolean `true`' plugins/relay/commands/relay-auth-scripts.md
  grep -qF -- '**The only files written**' plugins/relay/commands/relay-auth-scripts.md
  changed_template="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff bfb7f1bcde32f1bab44f39a205307f785164b8c4 --name-only -- plugins/relay/resources/auth-login.template.mjs)"
  if [ -n "$changed_template" ]; then
    echo "FAIL: the kit login template changed (it would stale every kit script)"; exit 1
  else
    echo "PASS: the kit login template is unchanged"
  fi
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/auth-kit-commands-hardening.test.mjs scripts/validate/checks/auth-scripts-command.test.mjs scripts/validate/checks/qa-run-refresh-roleset.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs scripts/validate/checks/auth-kit-minted-authoring.test.mjs
  ```

### Task 6: UPDATE docs/api-reference.md, docs/domain/glossary.md and docs/domain/flows.md — state the two declarations and list the new exports

- **ACTION**: Delivers AC-A6 (the knowledge base). Narrow `Edit` calls, each `old_string` copied from the file. Do not edit `docs/decisions.md`; do not backtick a camelCase or UPPER_SNAKE name in the `/relay-qa-run` row (a release test reads such names only in the `qa-run.mjs` row).
  1. `docs/api-reference.md`, the single-line `/relay-qa-run` row (line 129), one edit: `old_string` = `), all resolved at run time. Reusing a session needs no login and no visible browser.` and `new_string` = `), all resolved at run time. A plan entry may declare `chosen_inputs` for a `fill` whose value the report leaves open (each item names the step and a `source` of `capture` or `snapshot`; a literal found in no grounding snapshot of the run directory and not bound to a declared capture is `PLAN_ENTRY_INVALID`, and a later expectation may expect a chosen value), and a step marked with the `effect` key set to `write` runs only for a role that `login.config.json` declares `"dedicated": true`, otherwise the case is `blocked` `ROLE_NOT_DEDICATED` before any seed, session or request. Reusing a session needs no login and no visible browser.`
  2. `docs/api-reference.md`, the `qa-run.mjs` row (locate it by reading the neighbourhood of line 219; it is the row whose Description lists the exports from `REASON_CATALOGUE` to `USAGE`): add the five names `validateChosenInputs`, `chosenSnapshotRefusal`, `chosenFillValues`, `firstWriteStep` and `isDedicatedRole`, backticked and comma-separated like their neighbours, immediately after the backticked token `groundLocators` (where that token already appears in the row; if it does not appear there, after the last existing backticked camelCase export name before `USAGE`). Keep the backticked tokens `REASON_CATALOGUE` and `USAGE` and every phrase the release tests pin (`chosen, not measured`). Every name added must be a real export.
  3. `docs/domain/glossary.md`: `old_string` = `## QA grounding snapshot` + a blank line + `The file `qa-run.mjs ground` writes under` (the three-token start of the next section) and `new_string` = the paragraph below, a blank line, then that same text:
     ```
     Two more plan-side declarations of `/relay-qa-run`, both validated by the runner and
     never inferred. `chosen_inputs` is an optional entry key that lists the `fill` steps
     whose value the planner chose because the report leaves it open, each with a `source`:
     `capture` (a `{{name}}` binding of a declared capture) or `snapshot` (a literal of at
     least 3 characters found, whitespace collapsed and case ignored, in the name or text of
     an entry of a grounding snapshot of the run directory); a literal found nowhere is
     `PLAN_ENTRY_INVALID`, and a later `expect_value` or `expect_text` may expect a chosen
     value. `effect` is an optional step key with the single value `write`, valid on a
     `click`, `fill` or `request` step: a case that carries a marked step is blocked with
     `ROLE_NOT_DEDICATED`, before any seed, session or request, unless the case's role has
     `"dedicated": true` in `PRPs/auth/login.config.json`, a flag the operator sets by hand
     and `/relay-auth-scripts` never writes. See `plugins/relay/commands/relay-qa-run.md`.
     ```
  4. `docs/domain/flows.md`, in the numbered item (keep the 3-space indent on every line): `old_string` = the two lines `   scope) and are always resolved when the case runs.` / `   An element that exists only after a click or a fill is grounded in a second` and `new_string` = the first line, then this passage, then the second line:
     ```
        A value the report leaves open may be chosen by the planner and declared in the
        entry's `chosen_inputs` (a `fill` value that is a declared capture or a literal found
        in a grounding snapshot of the run directory; a literal found nowhere is
        `PLAN_ENTRY_INVALID`), and a click, fill or request marked with the `effect` key set
        to `write` runs only for a role that `login.config.json` declares `"dedicated": true`;
        otherwise the case is `blocked` with `ROLE_NOT_DEDICATED` before any seed, session or
        request.
     ```
- **MIRROR**: `# SOURCE: docs/domain/glossary.md:385-391` and `# SOURCE: docs/domain/flows.md:219-223` (the registers and the insertion points); the `docs/api-reference.md` row is one physical line and stays one.
- **VALIDATE**: gate on the authored literal in each file (copied byte-for-byte from the ACTION; each sits inside one physical line), assert every name added to the API reference is a real export, then run the tests that read these documents. The greps and the export check fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'A plan entry may declare `chosen_inputs` for a `fill` whose value the report leaves open' docs/api-reference.md
  grep -qF -- '`validateChosenInputs`' docs/api-reference.md
  grep -qF -- '`isDedicatedRole`' docs/api-reference.md
  grep -qF -- 'Two more plan-side declarations of `/relay-qa-run`, both validated by the runner and' docs/domain/glossary.md
  grep -qF -- 'A value the report leaves open may be chosen by the planner and declared in the' docs/domain/flows.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  for (const name of ["validateChosenInputs", "chosenSnapshotRefusal", "chosenFillValues", "firstWriteStep", "isDedicatedRole"]) assert.equal(typeof m[name], "function", name + " is named in the API reference but is not an export");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

### Task 7: UPDATE documentation/reference/commands.html, documentation/reference/scripts.html and documentation/changelog.html — the site pages and the changelog

- **ACTION**: Delivers AC-A6 (the site pages and the changelog entry that `documentation/AGENTS.md` sections 7.3, 7.4 and 9 require). Read `documentation/AGENTS.md` sections 2, 9 and 12 first (no emojis, no inline style, American English, keep structure and ids). Four narrow `Edit` calls, no page added, no heading added inside an entry, no sentence containing `e.g.` or `i.e.` (the release tests split sentences at `. `), no new number.
  1. `documentation/reference/commands.html`, the `Step vocabulary` row: `old_string` = `and a locator that is neither is <code>PLAN_ENTRY_INVALID</code>. <code>expect_requests</code> counts the requests the page issues` and `new_string` = `and a locator that is neither is <code>PLAN_ENTRY_INVALID</code>. A <code>fill</code> value that the report leaves open is declared in <code>chosen_inputs</code> and must be a declared capture or a literal found in a grounding snapshot, and a step marked with the <code>effect</code> key set to <code>write</code> runs only for a role that <code>login.config.json</code> declares <code>dedicated</code>, otherwise the case is <code>blocked</code> with <code>ROLE_NOT_DEDICATED</code>. <code>expect_requests</code> counts the requests the page issues`.
  2. `documentation/reference/scripts.html`, the `Assertions and request count` row: `old_string` = `the entry a later element capture uses. <code>expect_requests</code> waits` and `new_string` = `the entry a later element capture uses. Chosen inputs are checked by <code>validateChosenInputs</code> and <code>chosenSnapshotRefusal</code>, <code>chosenFillValues</code> lets a later expectation name a chosen value, and a marked write step is found by <code>firstWriteStep</code> and allowed by <code>isDedicatedRole</code>, which accepts a role only when its <code>login.config.json</code> entry has <code>dedicated</code> set to <code>true</code>. <code>expect_requests</code> waits`.
  3. `documentation/changelog.html`, `Added` list: `old_string` = `          element of a role inside a scope), and <code>expect_requests</code> accepts an array of methods.</li>` and `new_string` = that line followed by:
     ```
             <li><strong>Chosen inputs and dedicated-role writes</strong> &mdash; a plan entry may declare
               <code>chosen_inputs</code> for a <code>fill</code> whose value the report leaves open: the value is a declared
               capture or a literal found in a grounding snapshot of the run directory, a literal found nowhere is
               <code>PLAN_ENTRY_INVALID</code>, and a later expectation may expect it. A click, fill or request marked
               with the <code>effect</code> key set to <code>write</code> runs only for a role that
               <code>login.config.json</code> declares <code>dedicated</code>; otherwise the case is <code>blocked</code>
               with <code>ROLE_NOT_DEDICATED</code> before any seed, session or request. <code>/relay-qa-seed</code> and
               <code>/relay-qa-run</code> now recommend capturing the seeded account&rsquo;s <code>username</code> and the
               titles of seeded entities.</li>
     ```
     Indent the inserted `<li>` lines to match the neighbouring entries (8 spaces before `<li>`, 10 before the continuation lines).
  Constraints: the sentence about the path, the identifier and the e-mail address in the `scripts.html` row stays one untouched sentence; every constant the row names keeps its stated value; the phrases the release tests pin in the changelog (`ROLE_NOT_DEDICATED`, `counting convention`, `Needs-human steps`, `PRODUCT_DEFECT is only for a case that cannot start`) stay in their existing entries; add no `id` attribute (every id inside the block must start with `unreleased`), no `<h2`, and no `<li>` whose visible text equals an entry of the 0.46.0 release; do not touch NAV, the search index, the page subtitle, any heading id, the released sections or `plugins/relay/.claude-plugin/plugin.json`.
- **MIRROR**: `# SOURCE: documentation/changelog.html:50-56` (the shape of an entry and of the closing list tag); the two single-line `<dd>` rows keep their one physical line.
- **VALIDATE**: gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line of its row), then the site tests. The greps fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'A <code>fill</code> value that the report leaves open is declared in <code>chosen_inputs</code>' documentation/reference/commands.html
  grep -qF -- 'Chosen inputs are checked by <code>validateChosenInputs</code> and <code>chosenSnapshotRefusal</code>' documentation/reference/scripts.html
  grep -qF -- '<strong>Chosen inputs and dedicated-role writes</strong>' documentation/changelog.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

## Validation Commands

Diff base: the tree object `bfb7f1bcde32f1bab44f39a205307f785164b8c4` (the phase-3 end state; HEAD `c658a0c` is untouched and phases 1 to 3 are uncommitted, so never use a HEAD-relative or `<tree>..HEAD` form). Every "files changed" derivation below uses the single-argument form `git diff <tree> --name-only` plus `git ls-files --others --exclude-standard` for new files, and ignores `PRPs/` (pipeline artifacts: this plan, its review logs, the PRD row). Every git and node command carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. The plan writer has no shell, so none of these was executed: the Implementer runs each against the pre-change tree first and expects the stated result.

### Level 1 STATIC_ANALYSIS

Gate on syntax, the frozen surfaces, the untouched kit template and the changed-file allowlist. `node --check` fails on a syntax error. The frozen-surface, template and changed-file checks pass on the unmodified tree (nothing changed yet) by design, as regression guards: they fail as soon as a frozen file, the template, a test file, the contract check or any file outside the ten planned ones changes.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
# The five frozen surfaces and the kit login template are byte-identical to the phase-3 end state.
frozen="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff bfb7f1bcde32f1bab44f39a205307f785164b8c4 --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs plugins/relay/resources/auth-login.template.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface or the kit template changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces and the kit template unchanged"
fi
# Only the ten planned files changed: no test file, no new file, no contract edit, no version bump, no NAV or search-index edit (PRPs/ artifacts are ignored).
# The diff base is the phase-3 end state, so the files phases 1 to 3 changed are not in this diff.
changed="$( { GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff bfb7f1bcde32f1bab44f39a205307f785164b8c4 --name-only; GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git ls-files --others --exclude-standard; } | grep -v '^PRPs/' | sort -u || true )"
unexpected="$(printf '%s\n' "$changed" | grep -v '^$' | grep -vxF -e plugins/relay/scripts/qa-run.mjs -e plugins/relay/commands/relay-qa-run.md -e plugins/relay/commands/relay-qa-seed.md -e plugins/relay/commands/relay-auth-scripts.md -e docs/api-reference.md -e docs/domain/glossary.md -e docs/domain/flows.md -e documentation/reference/commands.html -e documentation/reference/scripts.html -e documentation/changelog.html || true)"
if [ -n "$unexpected" ]; then
  echo "FAIL: a file outside the ten planned files changed (a test file would be an R-X violation):"; printf '%s\n' "$unexpected"; exit 1
else
  echo "PASS: only the planned files changed"
fi
```

### Level 2 CONTENT_INVARIANTS

Gate on the exported surface and the real-tree contract. The first command fails on the unmodified tree (the new names are not exported) and passes once Tasks 1 to 3 are done; it also pins the constants and vocabularies this phase must not change, the arity of the two grounding functions, the runner-owned list and the evidence-writer anchor. The remaining checks are regression guards that pass before and after: no static or dynamic sibling import added, no introduced forbidden path reference, no introduced credential-shaped example value, and the non-browser tests that pin the documents this phase edits.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as m from "./plugins/relay/scripts/qa-run.mjs";
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
for (const name of ["validateChosenInputs", "chosenSnapshotRefusal", "chosenFillValues", "firstWriteStep", "isDedicatedRole", "groundLocators", "precheckGroundedSteps"]) assert.equal(typeof m[name], "function", name + " is not exported");
assert.deepEqual([...m.CHOSEN_INPUT_SOURCES], ["capture", "snapshot"]);
assert.equal(m.CHOSEN_INPUTS_MAX, 20);
assert.equal(m.groundLocators.length, 4);
assert.equal(m.precheckGroundedSteps.length, 4);
assert.equal(m.OUTCOMES.join(","), "pass,fail,blocked,needs-human", "the outcome vocabulary changed");
assert.equal(Object.keys(m.REASON_CATALOGUE).length, 12, "the reason-code catalogue changed");
assert.deepEqual([...m.RUNNER_OWNED_REASON_CODES].sort(), ["JUDGEMENT_UNCERTAIN", "PARTIAL_REMAINDER", "ROLE_NOT_DEDICATED"]);
assert.equal(m.REASON_CATALOGUE.ROLE_NOT_DEDICATED.disposition, "blocked");
assert.equal(m.REASON_CATALOGUE.ROLE_NOT_DEDICATED.class, "gap");
assert.ok(m.REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason.includes("dedicated"));
assert.deepEqual([...m.SCOPED_LOCATOR_KEYS], ["within", "name_prefix", "label_text", "index"]);
assert.equal(m.ASSERT_SETTLE_MS, 5000);
assert.equal(m.CAPTURE_TIMEOUT_MS, 30000);
const source = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const anchor = "const abs = join(ctx.runDirAbs, \x27evidence\x27, name);";
assert.equal(source.split(anchor).length - 1, 1, "the evidence-writer anchor line must occur exactly once");
assert.equal(source.split("locator.within(").length - 1, 0, "locator.within() needs Playwright 1.64");
assert.equal(source.split("firstWriteStep(p.steps)").length - 1, 1, "the dedicated-role refusal must occur exactly once in executeCase");
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# No static sibling import was added to the runner (the copy-helper tests copy only qa-run.mjs).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# This phase added no import() call of any kind.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 bfb7f1bcde32f1bab44f39a205307f785164b8c4 -- plugins/relay/scripts/qa-run.mjs | grep -E "^\+[^+]" | grep -qE "import\("; then
  echo "FAIL: an import() call was introduced"; exit 1
else
  echo "PASS: no import() call introduced"
fi
# No forbidden .claude/PRPs reference introduced by this phase's files outside the quoted-prohibition idiom.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 bfb7f1bcde32f1bab44f39a205307f785164b8c4 -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md plugins/relay/commands/relay-qa-seed.md plugins/relay/commands/relay-auth-scripts.md docs/api-reference.md docs/domain/glossary.md docs/domain/flows.md documentation/reference/commands.html documentation/reference/scripts.html documentation/changelog.html | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
# The non-browser tests that pin the documents this phase edits (they run no Chromium).
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
```

### Level 3 DRY-RUN END-TO-END

The end-to-end behaviour (the real `run` mode, through the refusals of this phase) is gated by the Task 3 command above, which fails before the work and passes after; run it again here as the integration gate, alone. Then the static suite and the corpus gate. `npm run validate` prints `28 passed, 0 failed (28 checks run)`; the grep fails if the count changes. The corpus gate runs last and alone (about five minutes) and runs the corpus exactly as `node --test "scripts/validate/**/*.test.mjs"` (the glob is passed to `node` unexpanded, never narrowed) with the TAP reporter.

```bash
set -euo pipefail
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF -- "28 passed, 0 failed (28 checks run)"
```

Corpus gate. The baseline is green (phase 3 closed with its eighteen stale tests updated by the test pair). This phase is additive: research examined the existing tests that could observe it (the key sets of `validateStep`, the arity of `groundLocators`, the order of the blocked reasons, the marked-example counts, the `ROLE_NOT_DEDICATED` pins and the doc and site pins) and predicts NO stale test, so the allowlist is EMPTY and the gate does not claim a bare zero outside it: it tolerates at most two further failing tests in the concurrent run (`FLAKE_BUDGET`, the count phase 3 observed for load sensitivity), and each failing test file must then pass when run alone, which separates load sensitivity from a regression. More than two failures fails the gate; a file that also fails alone fails the gate and is a candidate for the test pair (`EXISTING_TEST_UPDATED`, with the allowlist then extended by title in a recorded decision), never an Implementer edit. The gate exits 1 on a runner crash, on a cancelled test, on output it cannot parse or whose counters disagree with its result lines, and when `node_modules/playwright` is missing from the worktree (it is a directory junction; never modify it). The TAP shape was observed on this host (Node v24.15.0): flat output, a failing test names its file only in the `location:` line of its YAML block, and an import-time crash is one `not ok` whose title is the file path.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, relative, sep } from "node:path";
const ALLOWED = [];
const FLAKE_BUDGET = 2;
const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };
if (!existsSync("node_modules/playwright/package.json")) fail("node_modules/playwright is not resolvable from the worktree root; the qa-run test files resolve it from here, so provision it first (npm install, or a directory junction to the main checkout node_modules)");
const run = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "scripts/validate/**/*.test.mjs"], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, timeout: 20 * 60 * 1000 });
if (run.error) fail("the corpus run did not complete: " + run.error.message);
const lines = run.stdout.replace(/\r\n/g, "\n").split("\n");
const problems = [];
const counters = {};
for (const l of lines) { const m = /^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(l); if (m) counters[m[1]] = Number(m[2]); }
for (const k of ["tests", "pass", "fail", "cancelled", "skipped", "todo"]) if (!Number.isInteger(counters[k])) problems.push("missing summary counter: " + k);
const plan = lines.find((l) => /^1\.\.\d+$/.test(l));
if (!plan) problems.push("missing plan line");
if (!/^TAP version \d+$/.test(lines[0] ?? "")) problems.push("missing TAP version header");
const okCount = lines.filter((l) => /^ok \d+ - /.test(l)).length;
const failures = [];
for (let i = 0; i < lines.length; i++) {
  const m = /^not ok (\d+) - (.*)$/.exec(lines[i]);
  if (!m) continue;
  const block = [];
  for (let j = i + 1; j < lines.length && lines[j].startsWith("  "); j++) { block.push(lines[j]); if (lines[j] === "  ...") break; }
  const loc = /^ {2}location: \x27(.*?)(?::(\d+):(\d+))?\x27$/m.exec(block.join("\n"));
  let file = loc ? loc[1] : null;
  if (file === null && /\.test\.mjs$/.test(m[2])) file = m[2];
  failures.push({ title: m[2], file: file === null ? null : relative(process.cwd(), resolve(file.replace(/\\+/g, "/"))).split(sep).join("/") });
}
if (counters.fail !== failures.length) problems.push("# fail " + counters.fail + " but " + failures.length + " not ok lines");
if (counters.pass !== okCount) problems.push("# pass " + counters.pass + " but " + okCount + " ok lines");
if (counters.tests !== okCount + failures.length) problems.push("# tests " + counters.tests + " but " + (okCount + failures.length) + " result lines");
if (plan && Number(plan.slice(3)) !== counters.tests) problems.push("plan " + plan + " disagrees with # tests " + counters.tests);
if ((counters.cancelled ?? 0) > 0) problems.push(counters.cancelled + " cancelled test(s)");
if (run.status === 0 && failures.length > 0) problems.push("exit 0 with failures in the report");
if (run.status !== 0 && failures.length === 0) problems.push("exit " + run.status + " with no failing test in the report (runner crash or kill)");
const unattributed = failures.filter((f) => f.file === null);
if (unattributed.length > 0) problems.push(unattributed.length + " failing test(s) carry no location");
if (problems.length > 0) fail("unparseable or inconsistent corpus output: " + problems.join("; "));
const allowed = (f) => ALLOWED.some((a) => a.file === f.file && f.title.startsWith(a.title));
const other = failures.filter((f) => !allowed(f));
if (other.length > FLAKE_BUDGET) fail(other.length + " failing test(s) outside the allowlist exceed the load-sensitivity budget of " + FLAKE_BUDGET + ", in " + [...new Set(other.map((f) => f.file))].join(", ") + ": " + other.slice(0, 5).map((f) => f.title).join(" | "));
const real = [];
for (const file of [...new Set(other.map((f) => f.file))]) {
  const again = spawnSync(process.execPath, ["--test", file], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  if (again.error || again.status !== 0) real.push(file);
}
if (real.length > 0) fail("test file(s) that also fail when run alone, so not load-sensitive: " + real.join(", "));
console.log("PASS: " + counters.pass + " passed, " + (failures.length - other.length) + " allowlisted stale failure(s), " + other.length + " load-sensitive failure(s) that pass alone" + (other.length > 0 ? " (" + [...new Set(other.map((f) => f.file))].join(", ") + ")" : ""));
'
```

## Acceptance Criteria

- **AC-A1 (PRD AC-11):** Given a browser plan entry with `chosen_inputs` (items `{ step, source, reason }`, each naming a distinct `fill` step with a string value, at most 20 items, a reason of at most 200 characters), when it is validated, then a `source: "capture"` item needs a value that is a declared `{{name}}` binding, and a `source: "snapshot"` item needs a literal of at least 3 characters that appears, whitespace collapsed and case ignored, in the `name` or `text` of an entry of some grounding snapshot of the run directory; a literal that appears in no snapshot and is not a declared capture makes the entry `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, and so does a malformed key, an item that names a non-fill step or repeats a step, a source outside the two, and the key on an `http` entry. Every refusal sentence names the key and an item position and never the chosen value, and every validator is total on hostile values.
- **AC-A2 (PRD AC-11):** Given a chosen `fill`, when a LATER `expect_value` (`equals` equal to the whole chosen value, or `contains` contained in it) or `expect_text` (`contains` contained in it) is planned, then it is accepted without the value being in the report's own steps; an expectation before the fill, an `equals` that is only a part of the chosen value, a non-fill item and an unchosen literal keep the 0.46.0 refusal with the same sentence. `groundLocators.length` and `precheckGroundedSteps.length` stay 4.
- **AC-A3 (PRD AC-12):** Given a step marked `"effect": "write"` (the key's only legal value; valid on `click`, `fill` and `request` steps, otherwise `PLAN_ENTRY_INVALID`), when the entry's role is not declared `"dedicated": true` in `PRPs/auth/login.config.json` (a missing role, a null role, a missing or malformed config, and any value other than the boolean `true` are not dedicated), then the case is `blocked` `ROLE_NOT_DEDICATED` with the catalogue sentence prefixed by the marked step's position, before the query module, the target, any seed, any session and any request, and the reason names no role slug.
- **AC-A4 (PRD AC-12):** Given a marked step and a role declared `"dedicated": true`, when the case runs, then the refusal does not fire and the case proceeds exactly as an unmarked case does; `ROLE_NOT_DEDICATED` stays catalogued (`blocked`, class `gap`, runner-owned), a plan entry still cannot declare it, `REASON_CATALOGUE` keeps its twelve keys, and `login.config.json`, the kit login template, its `KIT_TEMPLATE_ID` and the generated defaults of `/relay-auth-scripts` are not changed: the `dedicated` key is documented in `relay-auth-scripts.md` as operator-set, never written, added or changed by the merge or by `--refresh`, and holding no credential. The local-only guard and the secrecy rules are untouched and no credential value appears anywhere.
- **AC-A5 (PRD AC-23):** Given `plugins/relay/commands/relay-qa-seed.md` and `plugins/relay/commands/relay-qa-run.md`, when they are read, then both recommend capturing the identity of the seeded account (`username`) and the names or titles of seeded entities, `relay-qa-run.md` shows `equals {{username}}` on a profile field in a marked step example that validates against the script, and `relay-qa-seed.md` keeps writing no `captures` (its step 5 and its constraints are byte-identical).
- **AC-A6 (PRD AC-22 for the new keys):** Given the documents, when they are read, then `relay-qa-run.md` carries a literal marked example for `effect` (a step example) and for `chosen_inputs` (a plan-entry example that validates with `validatePlanClassification`, `validateSteps` and `validateChosenInputs`), the honesty rules carry one bullet for both, and `docs/api-reference.md`, `docs/domain/glossary.md`, `docs/domain/flows.md`, `documentation/reference/commands.html`, `documentation/reference/scripts.html` and `documentation/changelog.html` state the same; the API reference lists the five new function exports and every listed name is a real export; the changelog carries one `Added` entry under `Unreleased`; every phrase and paragraph start an existing doc-pin test reads is intact; no page is added and NAV, the search index and the plugin version are unchanged. The `judge`, `read_message` and `preflight` clauses of PRD AC-22 belong to Phases 5 to 7.
- **AC-A7 (PRD AC-24):** `npm run validate` passes with exactly 28 checks (none added or extended), the corpus `node --test "scripts/validate/**/*.test.mjs"`, run in a worktree that has `node_modules`, passes the corpus gate of `## Validation Commands` (an empty allowlist and the load-sensitivity rule), and the five frozen surfaces, the kit login template and every test file are byte-identical to the phase-3 end state. This criterion is verified by Levels 1 to 3 and delivered by every task keeping its constraints; it has no dedicated task.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A chosen literal is a made-up value that happens to be a 3-character substring of unrelated page text, so a "snapshot" source is satisfied trivially | M | M | The minimum length of 3, the case and whitespace folding and the requirement of a reason limit the noise; the value still has to be typed into a real local page and the expectation that reads it back is an `equals`/`contains` of that same value, so it cannot turn a failing page into a pass by itself; the Phase 9 dogfood reads every pass that used a chosen input against its evidence. The residual (a trivially satisfied snapshot source) is recorded here rather than closed |
| A chosen value typed into a page appears in the final full-page capture and in a grounding snapshot of the run, which can hold personal data | L | M | A snapshot never stores raw withheld text (an entry the redaction rules withhold is not in the file and therefore cannot be chosen); the run directory's `evidence/` and `grounding/` are ignored; no reason, result or comparison evidence carries the literal (the Task 3 gate asserts it) |
| A write that the planner forgets to mark runs against a non-dedicated account (writes are declared, not detected) | M | H | Stated in the command doc as the planner's defect; the Phase 9 reading checks that every request-issuing click was marked (PRD Architecture Notes); an unmarked http `POST` is deliberately not refused here because that would change every existing http plan |
| `ROLE_NOT_DEDICATED` fires for an anonymous (null-role) write that is harmless, such as a public sign-up | M | L | By design the entry's role must be declared dedicated; the case is `blocked`, not failed, and counts as a named gap; a project that wants anonymous writes can declare a dedicated role for the purpose |
| A doc edit breaks a pinned sentence, paragraph start, ordering rule, sentence-splitting rule or example-count rule | M | M | The block is inserted after the last marked example and after the "Result fields" paragraph; the new step examples carry none of the four scoped keys and no `expect_requests`; the table row is untouched; Tasks 4 to 7 run the tests that pin the page they edit |
| New runner code or comments disturb a source-text pin or a test mutation anchor (a second `writeFileSync(`, `// WRITE-SITE`, an outcome literal, a repeat of the `const abs = ...` line, helpers placed inside the `precheckGroundedSteps` section) | M | H | Tasks 1 to 3 place every helper above `validateStep`, outside every pinned section, and edit `groundLocators` only in place; Level 2 runs the real-tree contract, asserts the anchor line occurs once and forbids an added `import(` |
| A hostile plan value (an object with a `toString` key, a nested array, `null`) makes a new validator throw or coerce | M | M | Every new helper is total by construction (`Array.isArray`, `isObj`, `isStr`, `Number.isInteger` and strict comparisons, no interpolation of a plan value); the Task 1 and Task 2 gates feed them hostile values |
| The Task 3 gate depends on details of the `run` mode that were derived by reading, not executed (the run-id format, the report shape, `results.json` location) | M | L | It copies the report and plan shapes and the `results.json` location of the shipped `qa-run-input-value` end-to-end test; the Implementer runs it against the pre-change tree first and expects the stated failure; if a case ends in an unexpected setup halt, the gate prints the runner's stdout and stderr |
| The validation commands were derived by reading the tree, not executed (the plan writer has no shell) | M | L | They reuse the fixture shapes of shipped tests and of the phase-3 plan; the Implementer runs each against the pre-change tree first |
| Scope size across nine phases (PRD risk) | H | M | This phase is one lane on `qa-run.mjs`, independently testable, adds no step, mode or reason code, and keeps every phase-1 to phase-3 contract |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework. (Levels 2 and 3 and the doc tasks run the existing test files only as regression guards; running a test is not touching it.)
- **Predicted stale tests: none.** Research looked for every test that could observe this phase (the step and entry key sets, the arity of `groundLocators`, the order of `ROLE_UNDECLARED`, `TARGET_UNDECLARED` and `FAILED_PLAYWRIGHT_UNAVAILABLE`, the marked-example counts and picks, the `ROLE_NOT_DEDICATED` pins and the prose and site pins) and found that the design keeps each one true: `validateStep` has no closed key set for `click`, `fill` or `request` (only `expect_requests` is closed, and `effect` is refused there as before); no fixture sets `effect`, `chosen_inputs` or a `dedicated` role, so the new enforcement fires for none of them (a fixture is affected only if it marks a step `"effect": "write"`, and none does); `groundLocators` keeps `.length` 4 through a default parameter (`qa-run-scoped-locators.test.mjs:184-185`); the catalogue, its keys, its `reason` text (which must keep the word `dedicated`) and the `Object.freeze([...])` literal of the runner-owned list are not edited (`qa-run-impossible-catalogue.test.mjs:118-160, 695-703`; `qa-run-classification.test.mjs:61-92`); the doc table row (`:655-656`) and the "Result fields" paragraph (`:598-610`) are untouched; the three new marked examples sit after every existing one and carry none of the keys the count tests read (`qa-run-scoped-locators.test.mjs:505-532`, `qa-run-network-docs.test.mjs:84-108`, `qa-run-vocabulary-pins.test.mjs:307-329`, `qa-run-ui-grounding.test.mjs:728-736`); the literal-expectation refusals of `qa-run-input-value.test.mjs` (a literal the report never states) still fire because no chosen input is declared; no test asserts `ROLE_NOT_DEDICATED` is unreachable. The corpus gate therefore allowlists nothing. Watch list if a failure nevertheless appears (each would be an `EXISTING_TEST_UPDATED` item for the test pair, never an Implementer edit, and the allowlist extended by title with a recorded decision): any test that picks the first or the only marked plan-entry example; any test that asserts the exact set of exports or the exact `qa-run.mjs` row text of the API reference beyond the `REASON_CATALOGUE`-to-`USAGE` span rule; any `login.config.json` fixture test that runs a case with a step marked `effect` (none exists today).
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A6).** `stepRules`/`validateStep`/`validateSteps` for `effect` (the three legal actions, the refusals on every other action and on every value but the string `write`, hostile values); `validateChosenInputs` (every accepted and refused shape, both sources, the length limits, the driver rule, no value echoed, never throws); `chosenSnapshotRefusal` (a literal in a role entry name and in a text entry, whitespace and case folding, the 3-character minimum, snapshots of other roles and routes, malformed snapshot objects, no value echoed); `chosenFillValues`; `groundLocators` with a chosen fill (`equals` whole, `contains` partial, `expect_text`, a chosen fill after the expectation, a `{{name}}` chosen value skipped, the unchanged refusal sentences, arity 4); `firstWriteStep` and `isDedicatedRole` (strict boolean, own-property lookup, null role, malformed config); the end-to-end `run` cases of the Task 3 gate (the three write refusals, the dedicated and the read pass-through, the two chosen refusals, no literal in `results.json`, no role slug in a reason, and the refusal order against `TARGET_UNDECLARED`); that `login.config.json` is not modified by a run; the three new marked examples (each validates alone, exactly one `effect` example, exactly one `equals {{username}}` example, exactly one plan-entry example with `chosen_inputs`) and the new paragraph openers, each unique; the capture recommendation in `relay-qa-seed.md` and the `dedicated` paragraph in `relay-auth-scripts.md`; the API-reference export list (every name real).
- **Design decisions made here.** (1) `chosen_inputs` is validated in two stages because the snapshot directory is only reachable once the run context exists: the shape check runs with the other pure plan checks, and the snapshot check runs right after the context is built, still before the origin loop, any seed, session or request. (2) A chosen literal must appear in a snapshot as a case- and whitespace-folded substring of an entry's name or text, with a 3-character floor; the PRD says "appears in a grounding snapshot", and equality would forbid choosing a search word out of a longer listed name. (3) A `fill` value is not otherwise restricted (0.46.0 behaviour), because the PRD's refusal is about an expectation resting on an unmarked literal, which the existing rule already refuses; adding a global fill-provenance rule would invalidate existing plans and tests for no AC. (4) `effect` is a step key with one legal value on three actions so that the dedicated check is a pure scan of the validated steps; an `http` `request` can be marked too, because a POST to a local endpoint is as much a write as a click. (5) The dedicated check reads `login.config.json` with the same idiom as the seed declaration (`ctxOrNull ? ... : readJsonOrNull(...)`) and is placed after the pure validators and before the query module, so no module load, target check, seed, session or request precedes it. (6) The reason is the catalogue sentence prefixed by the marked step's position: the catalogue stays the single wording, the position is the only plan-derived text, and the role slug is deliberately not echoed. (7) `dedicated` lives in `login.config.json` (operator-authored, like `api_origins`), not in `qa-seed.json`, because it describes the account and not the state; it is documented in `relay-auth-scripts.md` and never generated, so no template change and no `FAILED_KIT_SCRIPT_STALE` for any existing kit. (8) The new doc block sits after the "Result fields" paragraph rather than after "Variables:" so that every existing marked example stays first in the file and no adjacency of the Variables, Partial plans and Per-step results paragraphs is disturbed.
- **Research.** `research-codebase` located `stepRules` (there is no global closed set of step keys; each action checks only its own, and `expect_requests` is the one closed form), the absence of a plan-entry validator (entry fields are checked piecemeal in `executeCase`), `groundLocators`, `loadGroundingSnapshots`, the capture binding rules (`declaredCaptureNames`, `substituteVariables`: a capture value only arrives after the seed ran), the `executeCase` validation order, the three ad hoc `login.config.json` role lookups (`isMintedRole` as the model), the catalogue and runner-owned entries of `ROLE_NOT_DEDICATED` (no emitter existed), the secrecy handling of fill values (no step record carries a value), the command-doc marked-example conventions and the tests that observe each of those. `research-web` found no source describing a declared write-allowed account in an automated QA agent or value-provenance tagging of generated test input (the closest analogues are dedicated test accounts as a failure boundary, https://oneuptime.com/blog/post/2026-08-14-dedicated-cloud-account-infrastructure-integration-tests/view, and environment markers required before destructive setup, https://www.skillsdirectory.com/skills/sujith011-test-data-isolation); the design here is the PRD's own. Gaps recorded by the research: the `ground --prefix` replay and the browser-driver body were not re-read for `effect` (a prefix step still refuses unknown keys, so it never carries one); the exact text of the `qa-run.mjs` row of the API reference and of the two site rows was located by anchor, not read in full, so the Implementer reads each row before editing and keeps the anchors verbatim. All line anchors in this plan were checked against the worktree files.
- **Anchor lines and pins to keep (collected for the Implementer).** The line `const abs = join(ctx.runDirAbs, 'evidence', name);` must occur exactly once. Do not add a second occurrence of any of: `if (isObj(record)) {`, `const ANONYMOUS_CHECK_MS = 20000;`, `maxRedirects: 0`, `if (!a.includes('://')) continue;`, `if (u.origin !== target.origin) return null;`, `return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();`, `const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';`, `loadPlaywright(root, PLUGIN_ROOT);`. The text between `export function precheckGroundedSteps(` and `export function summarizeEntries(` must contain `interactionHistory(` and `isPostInteractionSnapshot(`; the text between `async function runLocatorStep(` and `DRIVERS.browser = async (` must contain `'expect_value'`, `'expect_not_visible'` and `'expect_state'`. The copy-helper tests copy only `qa-run.mjs` and `auth-local-guard.mjs`, so no new sibling import, static or dynamic. The banned strings in the command doc are `design-spec`, `relay-auth-setup`, `.claude/PRPs` and `subagent_type`.
- **Docs sync and scope.** `docs/decisions.md` is not edited (so no `documentation/governance/decisions.html` mirror is involved). Under `documentation/` only `reference/commands.html`, `reference/scripts.html` and `changelog.html` change, following `documentation/AGENTS.md`: no page is added, so NAV and the search index are untouched, and `plugin.json` keeps its version. `documentation/reference/validation-checks.html` is untouched because `qa-run-contract` is untouched. The `docs_sync` pass at implement time finds Task 6 already done.
- **Environment.** The host is Windows with Git Bash. Every command that runs git, node or npm carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. Keep LF line endings in every edited file (the `line-endings` check). `node_modules` in the worktree is a directory junction to the main checkout's: do not modify it. Use `grep -qF --` for any pattern that can start with `-`.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Tasks 1 to 3 are gates that fail before the work (the new names are not exported; the write and chosen refusals do not exist). Tasks 4 to 7 are gates that fail before the work (the authored literals are absent) and then run the existing tests that pin the page they edit, which pass before and after. The Level 1 frozen-surface, template and changed-file checks pass on the unmodified tree by design; the Level 2 export check fails on it.

*Generated: 2026-10-21*
*Approved: 2026-10-21*
*Implemented: 2026-10-21*
*Status: IMPLEMENTED*
