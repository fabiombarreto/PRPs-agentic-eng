# Feature: Impossible catalogue and counting convention (Phase 1 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the `qa-run.mjs` reason-code catalogue and its exports, the `results.json` shape, the `qa-run-contract` validation check); an existing command doc (`relay-qa-run.md`) amended around a script-validated vocabulary; knowledge-base edit under `docs/` with `docs_sync: true`; site-page edits under `documentation/` that existing tests bind to the catalogue (`documentation/AGENTS.md` applies); no new network- or store-touching site (the `auth-local-guard-sites` call sites are untouched); frozen-surface constraint (five files byte-identical); no new validate check (the count stays 28)
- Decisions found:
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` Decisions Log "What `needs-human` may mean": only an impossible-class reason may leave a step with a person (a real external channel with no local source, production or a physical device, a step the report reserves for a person), per the operator's directive of 2026-10-20
  - Same PRD, Decisions Log "Report/product mismatch": a divergence from the report is executed and reported `fail` with evidence; it is not declined with `PRODUCT_DEFECT` or `VOCABULARY_GAP`
  - Same PRD, Decisions Log "Uncertain judgment": `JUDGEMENT_UNCERTAIN` is `needs-human`, class `gap`, and never a pass
  - Same PRD, Decisions Log "Reports": the reference reports stay byte-identical and the pre-run table is re-frozen under the new convention before a counted run
  - `docs/decisions.md` [2026-09-25] (line 2435) "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the outcome vocabulary is a closed set, a runner pass is evidence and not approval, the local-only guard is permanent
  - `docs/decisions.md` [2026-10-06] (line 2490) "Provisioning the visual tooling's `node_modules` in every new plugin cache is a registered backlog item (F10)": folded into this PRD, owned by Phase 7, not this phase
  - `docs/decisions.md` [2026-04-19] (line 137) "Secret redaction policy for Test Runner reports": unchanged; this phase adds only structural counters and fixed sentences
  - `docs/decisions.md` [2026-08-05] (line 1764) "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`": no new resource file is added
  - `docs/decisions.md` [2026-09-25] (line 2473) "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen; `hybrid_code_review` is `false`
  - `docs/decisions.md` [2026-04-19] (line 261) "PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`"
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log (read in this worktree; `docs/decisions.md` holds no entry for it): "Classification home" (a `class` field per case, validated by the runner against a closed catalogue, the 14-case table frozen in that PRD; the runner validates and echoes and never infers), "Classification reading" (the automatable class is 3 cases), "Validation checks" (extend `qa-run-contract` and `auth-secrecy`, the count stays 28) and "Frozen surfaces" (the review-loop files, `capture.mjs` and `/relay-qa-report` stay byte-identical); the rule that a partially executed case stays `needs-human` with `PARTIAL_REMAINDER` and never counts toward the driver-executed rate is cited by that PRD's Decision Gate from `PRPs/prds/qa-runner-case-vocabulary.prd.md`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the new fields are integer counters and fixed catalogue sentences; no planner-supplied or session-derived text is added to `results.json`
  - "Weakening or deleting tests to make the auto-correction loop turn green": one existing assertion pins the catalogue's exact key set and goes stale by design; it is updated by the test pair through its lifecycle ledger, never edited by the Implementer, and the corpus gate allowlists exactly that one test and nothing else
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic", applied by analogy: the reason class is declared in the catalogue and the pre-run class is declared by the plan, never inferred by the runner
- Applicable architectural rules:
  - Interactivity boundary: no new extension; `/relay-qa-run` stays non-interactive and standalone
  - Command versus script separation: the command owns the plan, the script validates, executes and writes every result through its single write helper
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`); this phase adds no such site
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, never `<base>..HEAD`
  - `documentation/AGENTS.md`: a change under `documentation/` carries a changelog entry under `Unreleased` (§6.3, §7.3, §9); NAV and the search index change only when a page is added or a searchable title changes, and no page is added here; the version bump and the release heading belong to the release cut (Phase 8)
  - `npm run validate` keeps its 28 checks: `qa-run-contract` is extended and none is added
  - `qa-run-contract` source-text invariants stay true: the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`, no outcome literal outside the four values, one definition each of the catalogue and the case classes
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 1: "Impossible catalogue and counting convention" — Goal: make "human" a narrow, declared category and every other decline a measured gap — Success signal: a fixture plan with one entry per code produces the expected class split, and a product-defect case ends `fail`.

## Summary

This phase makes `needs-human` a narrow, declared category in `/relay-qa-run`. `qa-run.mjs` gives every code of its closed reason-code catalogue a class, `impossible` or `gap`; adds the codes `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`, `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED`; redefines `EXTERNAL_CHANNEL` as a real external channel with no declared local source; and narrows `PRODUCT_DEFECT` to a case that cannot start. `results.json` gains two top-level step counters, `needs_human_impossible` and `needs_human_gap`, beside the unchanged four-key `counts`, computed by a new pure function that sits beside `summarizeEntries`. The command doc `relay-qa-run.md` defines the objective-step counting convention (judgment and channel steps are objective steps, the metric denominator is every objective step not of impossible class, and a pre-run table is frozen under the convention before any counted run), documents the classed catalogue and the new counters, and tells the planner to execute a reachable product defect and report `fail`. `qa-run-contract` is extended (not duplicated) to pin the classes, the counters and the convention, and the `docs/` knowledge base and the three `documentation/` places that the existing site tests bind to the catalogue (the `/relay-qa-run` entry of `commands.html`, the `qa-run-contract` section of `validation-checks.html` and the `Unreleased` block of `changelog.html`) are brought in line, so that the corpus stays green except for one assertion that only the test pair may update. Nothing else in the vocabulary changes in this phase.

## User Story

As the operator of relay's human validation gate
I want every step the runner leaves to me to carry a class that says whether no AI agent could have executed it or the runner simply did not
So that the share of work still on me is measured, and only what truly needs a person stays there

## Problem Statement

`/relay-qa-run` 0.46.0 left 9 of the 14 reference cases `needs-human`, and nothing in its output separates a step that is human by nature (a real inbox, production, a person's sign-off) from a step the runner merely could not ground, judge or read. The Phase 8 dogfood of the previous work shows the mix: T-3 and S-3 are declined `EXTERNAL_CHANNEL` (0 of 4 and 0 of 5 steps) next to S-4, T-2 and S-6, declined for grounding limits (`UNGROUNDABLE_AFTER_INTERACTION`, `STEP_UNGROUNDED`), and X-1 was declined `PRODUCT_DEFECT` at 0 of 4 steps even though a divergence from the report is exactly the result a QA run exists to produce. The operator's directive (2026-10-20) is that `needs-human` must mean only what no AI agent can execute alone, so the catalogue needs a class per code, the results need a counter per class, and the counting convention behind the metric needs to be written down before it is measured.

## Solution Statement

Runner, doc and contract only; the vocabulary and the drivers are untouched. (1) In `qa-run.mjs`: a frozen `REASON_CLASSES`, a `class` key on every catalogue entry (`impossible` for `EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT` and `HUMAN_SIGNOFF`, `gap` for every other code), the four new entries, the narrowed `PRODUCT_DEFECT` and redefined `EXTERNAL_CHANNEL` sentences, `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED` added to `RUNNER_OWNED_REASON_CODES` beside `PARTIAL_REMAINDER`, and a pure `reasonClassOf(code)`. (2) A pure `summarizeNeedsHuman(entries)` returning the two counters, wired into the `results` object and one new summary line. (3) The doc gains a Class column in the catalogue table, the counting convention, the counters in "Result fields", and the product-defect rule. (4) The contract check pins all of it. (5) `docs/api-reference.md` and `docs/domain/glossary.md` name the twelve codes, the classes and the counters. (6) The documentation that existing site tests bind to the live catalogue moves with it in the same phase, so each phase can close with a green corpus: the `Classification` row of the `/relay-qa-run` entry in `documentation/reference/commands.html`, the `qa-run-contract` section of `documentation/reference/validation-checks.html`, and an `Unreleased` entry in `documentation/changelog.html` (no page is added, so NAV and the search index are untouched; the version bump and the release heading stay in Phase 8). The step-count rule is fixed here: a `needs-human` case contributes its declared `objective_steps` less the steps a driver ran (`passed` or `failed`), or, when it declared none, its steps still `not-run` or `human`; a code outside the catalogue and a `blocked` case contribute to neither counter.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `scripts/validate/checks/qa-run-contract.mjs`; `docs/api-reference.md`; `docs/domain/glossary.md`; `documentation/reference/commands.html`; `documentation/reference/validation-checks.html`; `documentation/changelog.html` |
| Dependencies | none (row 1 of 9; `Depends` is `-`; shares `lane:qa-run` with phases 2 to 7, so it runs first and serially); Node built-ins only, no new package |
| Estimated Tasks | 9 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 85-87 (AC-1 to AC-3), 108 (AC-24), 205 (row 1), 217-220 (Phase 1 details), 268-277 (Decisions Log) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 85-87, 108, 205, 217-220, 268-277 | AC-1 to AC-3, the validate half of AC-24, the row and the Phase 1 scope, and the Decisions Log rows this phase implements |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1840-2057 | `summarizeEntries`, the frozen catalogue, the runner-owned list, `validatePlanClassification`, `declinedCase`, `classOf`, `summarizeClassification`: everything Tasks 1 and 2 change or mirror |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3839-3892 | the `finally` block that builds `results` and the summary lines, where the counters are wired in |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 498-586 | the classification section: classes, frozen 14-case table, catalogue table, objective steps, result fields |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 660-697, 770-777 | the honesty rules and the final output surface that name the codes |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 127-136, 186-284, 645-661, 720-745 | the required codes, `validateResults`, the catalogue pins and the doc pins Task 4 extends |
| P1 | `scripts/validate/checks/qa-run-classification.test.mjs` | 61-83, 95-99, 457-465, 545-552, 654-704 | READ-ONLY (R-X): the tests that pin the current catalogue (lines 97 and 549 bind exact sets) and the fixture builders (654-704) the end-to-end validation commands mirror |
| P1 | `scripts/validate/checks/qa-run-release-pages.test.mjs` | 164-171, 355-360, 378, 526-535 | READ-ONLY (R-X): which page and API-reference assertions bind to the live catalogue; line 378 requires every code in the `docs/api-reference.md` `/relay-qa-run` row |
| P1 | `docs/api-reference.md` | 129, 219 | the `/relay-qa-run` row and the `qa-run.mjs` row Task 5 amends |
| P1 | `docs/domain/glossary.md` | 359-375 | the plan-entry glossary paragraph that lists the catalogue, amended by Task 6 |
| P0 | `documentation/AGENTS.md` | 239-284, 318-330, 400-406 | the registration rule (§6: NAV and the search index change only when a page is added or renamed), the `Unreleased` block and its entry rule (§7.3, §7.4), and the modify-an-existing-page checklist (§9) that Tasks 7 to 9 follow |
| P0 | `documentation/reference/commands.html` | 350-351 | the `Classification` row of the `/relay-qa-run` entry that Task 7 amends |
| P0 | `documentation/reference/validation-checks.html` | 369-373 | the `qa-run-contract` section that Task 8 amends |
| P0 | `documentation/changelog.html` | 31-33, 48-59 | the `Unreleased` block that Task 9 fills and the shape of an `Added` list |
| P1 | `scripts/validate/checks/qa-run-release-cut.test.mjs` | 112-134 | READ-ONLY (R-X): the well-formedness rules of the `Unreleased` block (every id starts with `unreleased`, no `<h2` inside, nothing copied from the first release, the heading stays literal) |
| P1 | `scripts/validate/checks/qa-run-release-site.test.mjs` | 129-172, 226-255 | READ-ONLY (R-X): the contract-section count words ("the N codes the check names", "the catalogue itself holds N codes", "since X is not one of the N"), the unit-test count rule, and the id and link rules |
| P1 | `scripts/validate/checks/qa-run-network-docs.test.mjs` | 170-216 | READ-ONLY (R-X): the honesty bullet that must directly follow the `Plan a ground prefix only from` bullet, and the paragraph adjacency Task 3 must not disturb |
| P2 | `C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/dogfood-report.md` (outside `target_root`, git-ignored, evidence only) | 38-60, 93-107 | the 14-case table with steps run against frozen steps per case (the step-count rule reproduces its numerators) and the lost steps by cause |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1861-1867
 * @type {Readonly<Record<string, Readonly<{ disposition: 'needs-human' | 'blocked', reason: string }>>>}
 */
export const REASON_CATALOGUE = Object.freeze({
  UNGROUNDABLE_AFTER_INTERACTION: Object.freeze({
    disposition: 'needs-human',
    reason: 'the case needs an element that exists only after an interaction and cannot be grounded before it; the manual steps are reproduced verbatim',
  }),
```
Copied by Task 1 (the entry shape: a frozen object with a `disposition` key, never an `outcome` key, and a fixed `reason` ending in the verbatim clause; each entry gains a `class` key and the typedef gains `class: 'impossible' | 'gap'`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1888-1891
  PRODUCT_DEFECT: Object.freeze({
    disposition: 'blocked',
    reason: 'a known product defect blocks the case; the manual steps are reproduced verbatim',
  }),
```
Copied by Task 1 (the `blocked` entry shape; this is the entry whose sentence is narrowed, and `ROLE_NOT_DEDICATED` is added in the same shape).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1898-1899
/** Codes the runner derives itself (here from `human_remainder`); a plan entry may not declare them. */
export const RUNNER_OWNED_REASON_CODES = Object.freeze(['PARTIAL_REMAINDER']);
```
Copied by Task 1 (the runner-owned list gains `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED`; the doc comment is widened to "derives or records itself").

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1932-1939
  const code = entry.reason_code;
  if (code !== undefined) {
    if (!isStr(code) || !Object.hasOwn(REASON_CATALOGUE, code)) {
      return refuse(`the plan entry's reason_code ${bounded(code)} is not in the closed reason-code catalogue`);
    }
    if (RUNNER_OWNED_REASON_CODES.includes(code)) {
      return refuse(`the reason_code ${code} is derived by the runner from human_remainder; a plan entry may not declare it`);
    }
```
Copied by Task 1 (the runner-owned refusal: its sentence stays byte-identical for `PARTIAL_REMAINDER`, and the other runner-owned codes get their own sentence in the same `refuse(...)` shape).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1975-1978
export function classOf(entry) {
  if (!isObj(entry) || validatePlanClassification(entry) !== null || !isStr(entry.class)) return CLASS_UNCLASSIFIED;
  return entry.class;
}
```
Copied by Task 1 (`reasonClassOf(code)` is a sibling pure reader in the same shape: `null` for anything that is not a catalogue code).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1845-1853
export function summarizeEntries(entries) {
  /** @type {Record<string, number>} */ const counts = { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 };
  for (const e of entries) counts[e.outcome]++;
  return {
    counts,
    record_resolved: entries.filter((e) => e.reason_code === 'AUTOMATED_EVIDENCE').length,
    partially_executed: entries.filter((e) => e.reason_code === 'PARTIAL_REMAINDER').length,
  };
}
```
Copied by Task 2 (`summarizeNeedsHuman` is a new sibling pure function over the same entries; `summarizeEntries` itself is NOT edited because existing tests deep-equal its exact return shape).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2018-2020
    if (cls === 'automatable' || cls === 'needs-a-new-driver') {
      const steps = isObj(e) && Array.isArray(e.steps) ? e.steps : [];
      stepsExecuted += steps.filter((/** @type {any} */ s) => isObj(s) && (s.result === 'passed' || s.result === 'failed')).length;
```
Copied by Task 2 (the definition of an executed step, `passed` or `failed`, which `summarizeNeedsHuman` subtracts from the declared `objective_steps`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3842-3843
    const { counts, record_resolved: recordResolved, partially_executed: partiallyExecuted } = summarizeEntries(entries);
    const classification = summarizeClassification(entries);
```
Copied by Task 2 (the counters are computed on the next line, after `applyClassification` has stamped `objective_steps` on every entry).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3869-3872
      counts,
      record_resolved: recordResolved,
      partially_executed: partiallyExecuted,
      classification,
```
Copied by Task 2 (the two counters join the `results` object right after `partially_executed`; the object is still written once through the existing write helper).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3888-3891
    const lines = [
      `QA run finished: pass=${counts.pass - recordPass} fail=${counts.fail - recordFail} blocked=${counts.blocked} needs-human=${counts['needs-human']}`,
      `Record-resolved (not driver-executed): record-resolved=${recordResolved} (pass=${recordPass} fail=${recordFail})`,
      `Partially executed (not in the driver-executed rate): partially-executed=${partiallyExecuted}`,
```
Copied by Task 2 (the new `Needs-human steps:` line is inserted after the `Partially executed` line and before the per-case lines; the pinned `QA run finished:` line keeps its exact form).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:534-543
| Code | Outcome | Use it when |
|------|---------|-------------|
| `UNGROUNDABLE_AFTER_INTERACTION` | `needs-human` | the case needs an element that exists only after an interaction and no snapshot can ground it |
| `EXTERNAL_CHANNEL` | `needs-human` | the case needs an inbox, SMS, a physical device or a third-party payment |
| `VISUAL_JUDGEMENT` | `needs-human` | the case asks for a subjective judgment of appearance |
| `VOCABULARY_GAP` | `needs-human` | a needed step, or a declared source or origin for it, is missing from the closed vocabulary and the tracked declarations |
| `STEP_UNGROUNDED` | `needs-human` | a step's element is not in the snapshot or does not match exactly one element |
| `PRODUCT_DEFECT` | `blocked` | a known product defect blocks the case |
| `STATE_UNCONFIRMED` | `blocked` | the declaration for the required state is not confirmed |
| `PARTIAL_REMAINDER` | `needs-human` | never declared: the runner derives it from `human_remainder`, which must name its gap |
```
Copied by Task 3 (the first two columns, code then outcome, stay exactly as they are because existing tests parse the table with a pattern that reads only those two; the Class column is inserted third).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:560-567
Objective steps. An executable entry may carry `objective_steps`, an integer from 0
to 500 that counts the case's objective steps, including those no driver step can
express yet. It defaults to the number of executable steps and may not be lower,
because an executable step is an objective step by definition. A declining entry of
class `automatable` or `needs-a-new-driver` should declare it, and a missing value
is counted in `objective_steps_undeclared`. The per-case counts the dogfood audits
are frozen in its pre-run table before the run, so the declared value is read
against that reference.
```
Copied by Task 3 (the prose register for the counting-convention paragraph that follows it; the paragraph itself is kept intact).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:577-586
Result fields. Each case in `results.json` carries `class` and `objective_steps`
beside its outcome, and the top level carries a `classification` block with
`per_class`, `driver_executed`, `automatable_total`, `automatable_driver_executed`,
`automatable_rate`, `objective_steps_executed`, `objective_steps_total` and
`objective_steps_undeclared`. "Driver-executed" means `pass` or `fail` produced by a
driver: record-resolved and partially executed cases never count. The rate is over
the `automatable` class only and is `null` when that class is empty. "Objective
steps executed" counts the per-step results `passed` or `failed` over the
`automatable` and `needs-a-new-driver` classes. The four-key `counts` partition is
unchanged.
```
Copied by Task 3 (the two counters are described in a sentence inserted before the closing sentence "The four-key `counts` partition is unchanged.", which stays last).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:662-668
- Decline any case that needs an email inbox, SMS, a physical device, a third-party
  payment, a subjective visual judgment, a CLI or any action outside the
  vocabulary: write a declining entry with a `class` and a catalogued
  `reason_code`, `EXTERNAL_CHANNEL` for an inbox, SMS, a physical device or a
  third-party payment, `VISUAL_JUDGEMENT` for a subjective visual judgment and
  `VOCABULARY_GAP` for a CLI or any other action outside the vocabulary. The script
  records it with the steps verbatim.
```
Copied by Task 3 (the first honesty bullet is rewritten around the three impossible codes, and a new bullet states the product-defect rule).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:215-220
    const partialCases = cases.filter((c) => c !== null && typeof c === 'object' && c.reason_code === 'PARTIAL_REMAINDER');
    if (obj.partially_executed !== undefined) {
      if (!Number.isInteger(obj.partially_executed) || obj.partially_executed < 0 || obj.partially_executed !== partialCases.length) {
        msgs.push(`partially_executed (${JSON.stringify(obj.partially_executed)}) does not equal the number of PARTIAL_REMAINDER cases (${partialCases.length})`);
      }
    }
```
Copied by Task 4 (the optional-key rule: a key that results written before it existed lack is validated only when present, in the same message style).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:645-657
  if (requireCatalogue) {
    // The imported module is the definition the runner executes; pin its content, not its spelling.
    for (const code of REQUIRED_CATALOGUE_CODES) {
      if (!Object.hasOwn(REASON_CATALOGUE, code)) add(`the reason-code catalogue must contain ${code}`, SCRIPT_FILE);
    }
    if (Object.hasOwn(REASON_CATALOGUE, 'NO_PLAN_ENTRY')) {
      add('the reason-code catalogue must not contain NO_PLAN_ENTRY: it marks a case the plan omitted entirely', SCRIPT_FILE);
    }
    for (const [code, spec] of Object.entries(REASON_CATALOGUE)) {
      if (spec.disposition !== 'needs-human' && spec.disposition !== 'blocked') {
        add(`the reason-code catalogue entry ${code} has a disposition outside needs-human, blocked`, SCRIPT_FILE);
      }
    }
```
Copied by Task 4 (the behavior pins on the imported catalogue: the class, impossible-set and runner-owned pins are added inside this same block).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:720-727
    if (requireCatalogue) {
      // Every catalogued code and every class is named in the doc the planner reads.
      for (const code of Object.keys(REASON_CATALOGUE)) {
        if (!commandText.includes(code)) add(`the runner command must document the reason code ${code}`, COMMAND_FILE);
      }
      for (const cls of CASE_CLASSES) {
        if (!commandText.includes(cls)) add(`the runner command must document the case class ${cls}`, COMMAND_FILE);
      }
```
Copied by Task 4 (the doc pins: the counting convention, the counters, the product-defect rule and the table-agrees-with-the-script rule are added in this same block, with messages that never name a catalogue code or a case class when the doc lacks the table, so the existing once-per-token expectation stays true).

```
# SOURCE: docs/api-reference.md:129
an entry that declines its case carries a `reason_code` from a closed catalogue (`UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `VISUAL_JUDGEMENT`, `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `PRODUCT_DEFECT`, `STATE_UNCONFIRMED`; `PARTIAL_REMAINDER` is derived by the runner) and no steps; a code or class outside the sets is `PLAN_ENTRY_INVALID`, a case the plan omits is `NO_PLAN_ENTRY` (a planner defect, reported `unclassified`), an executable entry may declare `objective_steps` (0 to 500), and `results.json` carries a `classification` block beside the unchanged four-key `counts`.
```
Copied by Task 5 (one sentence of the very long `/relay-qa-run` row; only the catalogue parenthesis and the closing results clause change, and the clause "a `classification` block beside the unchanged four-key `counts`" stays verbatim).

```
# SOURCE: docs/api-reference.md:219
The closed sets and the numbers are exported and pinned by the contract check: `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, `CASE_CLASSES` and `CLASS_UNCLASSIFIED` (with `validatePlanClassification`, `summarizeClassification`, `applyClassification`, `declinedCase`, `classOf` and `objectiveStepsOf`);
```
Copied by Task 5 (the exports list in the `qa-run.mjs` row gains `REASON_CLASSES`, `reasonClassOf` and `summarizeNeedsHuman`).

```
# SOURCE: docs/domain/glossary.md:364-369
`unclassified`. `reason_code` names why a declining entry (a class and a code,
no steps) does not execute its case, drawn from a closed catalogue defined once
in `plugins/relay/scripts/qa-run.mjs` (`REASON_CATALOGUE`) and pinned by the
`qa-run-contract` check: `UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`,
`VISUAL_JUDGEMENT`, `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `PRODUCT_DEFECT`,
`STATE_UNCONFIRMED` and the runner-derived `PARTIAL_REMAINDER`. A declined case
```
Copied by Task 6 (the catalogue list in the glossary paragraph).

```
# SOURCE: documentation/reference/commands.html:351
        <dd>Every plan entry carries a <code>class</code> that the planner declares before the run: <code>automatable</code>, <code>needs-a-new-driver</code>, <code>human-by-nature</code> or <code>blocked-by-product</code>. An entry that does not execute its case declines it with a <code>reason_code</code> from a closed catalogue and no steps: <code>UNGROUNDABLE_AFTER_INTERACTION</code>, <code>EXTERNAL_CHANNEL</code>, <code>VISUAL_JUDGEMENT</code>, <code>VOCABULARY_GAP</code>, <code>STEP_UNGROUNDED</code>, <code>PRODUCT_DEFECT</code> or <code>STATE_UNCONFIRMED</code>. The eighth member, <code>PARTIAL_REMAINDER</code>, is derived by the runner and never declared. A code outside the catalogue makes the entry <code>PLAN_ENTRY_INVALID</code>, and a case the plan omits is <code>NO_PLAN_ENTRY</code>, a planner defect reported as <code>unclassified</code>. The runner validates and echoes the class and never infers it. <code>results.json</code> carries a <code>classification</code> block with the per-class counts, the driver-executed rate over the automatable class and the objective steps executed and total; a partially executed case is never counted in the rate, and the four-key <code>counts</code> partition is unchanged.</dd>
```
Copied by Task 7 (one `<dd>` that an existing test reads with a pattern that stops at the first `</dd>`: it holds exactly one sentence that contains "closed catalogue", whose upper-snake tokens must be the declarable codes, and exactly one that contains "derived by the runner", whose tokens must be the runner-owned codes and that must contain "The twelfth member"; the sentences are split at a period, exclamation or question mark followed by whitespace, so those two sentences hold no such stop inside them).

```
# SOURCE: documentation/reference/validation-checks.html:372
<strong>Catalogue:</strong> the closed reason-code catalogue and the four case classes are defined once, the catalogue must hold the seven codes the check names (<code>UNGROUNDABLE_AFTER_INTERACTION</code>, <code>EXTERNAL_CHANNEL</code>, <code>VISUAL_JUDGEMENT</code>, <code>PRODUCT_DEFECT</code>, <code>STATE_UNCONFIRMED</code>, <code>STEP_UNGROUNDED</code> and <code>PARTIAL_REMAINDER</code>) and never the omitted-case marker <code>NO_PLAN_ENTRY</code>, and the catalogue itself holds eight codes, since <code>VOCABULARY_GAP</code> is not one of the seven; every code carries the disposition <code>needs-human</code> or <code>blocked</code>, every code of the catalogue and every class is documented in the command, and every marked plan-entry example validates against the validator of the runner itself.
```
Copied by Task 8 (the three count phrases `the N codes the check names (...)`, `the catalogue itself holds N codes` and `since X is not one of the N` keep their exact form: an existing test reads each with a pattern and compares the words with the runner's live catalogue).

```
# SOURCE: documentation/changelog.html:31-33
      <h2 id="unreleased">Unreleased</h2>

      <p>Nothing yet.</p>
```
Copied by Task 9 (the heading stays literal; the placeholder goes once the block lists an entry).

```
# SOURCE: documentation/changelog.html:48-52
      <h3 id="v0-46-0-added">Added</h3>

      <ul>
        <li><strong>Reason-code catalogue and pre-run classification</strong> &mdash; every plan entry of
          <code>/relay-qa-run</code> carries a <code>class</code> (<code>automatable</code>,
```
Copied by Task 9 (the shape of a subsection and of an entry; the new subsection ids start with `unreleased-` instead of `v0-46-0-`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the single definition of the catalogue: a class on every code, four new codes, two reworded sentences, a wider runner-owned list, `REASON_CLASSES`, `reasonClassOf`, `summarizeNeedsHuman`, and the two counters and one summary line in the run's `finally` block |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the Class column and twelve-row catalogue table, the reason-class paragraph, the counting convention, the counters in "Result fields", the product-defect rule, the rewritten honesty bullet, the class bullets and the final output surface |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | pin the classes, the impossible set, the runner-owned codes, the counters (tolerant of older results) and the convention in the doc; no check is added, the count stays 28 |
| `docs/api-reference.md` | UPDATE | the `/relay-qa-run` row and the `qa-run.mjs` row name the twelve codes, the classes, the counters and the new exports (an existing test requires every catalogue code in that row) |
| `docs/domain/glossary.md` | UPDATE | the plan-entry glossary paragraph lists the twelve codes, their classes and the counters |
| `documentation/reference/commands.html` | UPDATE | the `Classification` row of the `/relay-qa-run` entry lists the nine declarable codes, the three runner-owned ones, the reason classes and the counters (existing site tests compare it with the live catalogue) |
| `documentation/reference/validation-checks.html` | UPDATE | the `qa-run-contract` section states the eleven required codes, the twelve-code catalogue, the class and counter pins (an existing site test compares its count words with the live catalogue) |
| `documentation/changelog.html` | UPDATE | an `Unreleased` entry that lists the change, as `documentation/AGENTS.md` requires for any change under `documentation/` |

## NOT Building (Scope Limits)

- Any new step, locator, `judge` mode, `preflight` mode, channel source, `chosen_inputs` or `effect: write` handling (Phases 2 to 7). `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED` exist in the catalogue as runner-owned codes only; nothing in this phase produces them.
- Any change to `CASE_CLASSES`, `summarizeClassification`, `applyClassification`, `classOf`, `objectiveStepsOf`, `declinedCase`, `summarizeEntries`, `applyPartialRemainder` or the `OUTCOMES` literal. The counting convention is a definition in the doc, applied by the pre-run table the dogfood re-freezes; `objective_steps_total` keeps its class-gated meaning.
- A fifth outcome. The vocabulary stays `pass`, `fail`, `blocked`, `needs-human`; the reason class is a property of a code, never of an outcome.
- Any inference by the runner. It does not read the report to classify, and it does not detect whether a product defect "can start": the `PRODUCT_DEFECT` narrowing is a planner rule written in the doc and pinned there.
- A per-case stamp of the reason class on `results.json` entries (the existing per-case `class` is the case class). The two counters are the only new results fields.
- The release cut. The version bump (`plugins/relay/.claude-plugin/plugin.json`), turning `Unreleased` into a release heading, the release pages' version strings, `scripts.html`, `redaction-policy.html`, `roadmap/status.html`, NAV (`assets/js/app.js`) and the search index (`assets/data/search-index.json`) are Phase 8: no page is added and no searchable title changes. Only the documentation that an existing site test binds to the live catalogue moves in this phase (`commands.html`, `validation-checks.html`, and the `Unreleased` entry in `changelog.html`).
- Any edit to `docs/decisions.md` (so the `documentation/governance/decisions.html` mirror is not triggered).
- A 29th validate check, a new sibling module or a static import in `qa-run.mjs`.
- Any new network- or store-touching site, so `auth-local-guard-sites` and `auth-secrecy` are not touched.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`, and any change to a reference report.
- Any test file. R-X strict: the Implementer authors zero test files; new tests and every update to a stale existing test are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the classed catalogue, the four new codes and the pure class reader

- **ACTION**: Delivers AC-A1 (every code carries a class; `EXTERNAL_CHANNEL` redefined; the four new codes) and AC-A4 (`PRODUCT_DEFECT` narrowed). In `plugins/relay/scripts/qa-run.mjs`, edit the catalogue block that starts at the `REASON_CATALOGUE` jsdoc (line 1855) and ends at `RUNNER_OWNED_REASON_CODES` (line 1899):
  1. Directly above the catalogue's jsdoc add `export const REASON_CLASSES = Object.freeze(['impossible', 'gap']);` with a one-line comment: `impossible` is what no AI agent can execute alone, `gap` is every other limit, and the reason class is not the `class` of a case (`CASE_CLASSES`).
  2. Widen the catalogue typedef to `{ disposition: 'needs-human' | 'blocked', class: 'impossible' | 'gap', reason: string }` and give every entry a `class` key, placed between `disposition` and `reason`. Class `impossible`: `EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`. Class `gap`: every other code (`UNGROUNDABLE_AFTER_INTERACTION`, `VISUAL_JUDGEMENT`, `JUDGEMENT_UNCERTAIN`, `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `PARTIAL_REMAINDER`, `PRODUCT_DEFECT`, `STATE_UNCONFIRMED`, `ROLE_NOT_DEDICATED`).
  3. Reword two existing sentences, each still ending with `; the manual steps are reproduced verbatim`: `EXTERNAL_CHANNEL` becomes `the case needs a real external channel with no declared local source; the manual steps are reproduced verbatim`, and `PRODUCT_DEFECT` becomes `a known product defect stops the case from starting; the manual steps are reproduced verbatim`. Every other existing entry keeps its disposition and its sentence byte-for-byte.
  4. Add four entries, in this order and shape (`Object.freeze({ disposition, class, reason })`, each reason ending with the verbatim clause): `OUTSIDE_LOCAL_ENVIRONMENT` right after `EXTERNAL_CHANNEL` (`needs-human`, `impossible`, `the case needs production or a physical device that no local environment provides; the manual steps are reproduced verbatim`); `HUMAN_SIGNOFF` right after it (`needs-human`, `impossible`, `the report reserves this step for a person; the manual steps are reproduced verbatim`); `JUDGEMENT_UNCERTAIN` right after `VISUAL_JUDGEMENT` (`needs-human`, `gap`, `a judgment of the captured evidence was recorded as uncertain; the manual steps are reproduced verbatim`); `ROLE_NOT_DEDICATED` right after `STATE_UNCONFIRMED` (`blocked`, `gap`, `a write step names a role the kit does not declare dedicated; nothing was executed; the manual steps are reproduced verbatim`). The catalogue then holds exactly 12 codes.
  5. `RUNNER_OWNED_REASON_CODES` becomes `Object.freeze(['PARTIAL_REMAINDER', 'JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED'])`; widen its comment to "derives or records itself". In `validatePlanClassification` keep the refusal sentence for `PARTIAL_REMAINDER` byte-identical (`the reason_code ${code} is derived by the runner from human_remainder; a plan entry may not declare it`); for the other runner-owned codes refuse with `the reason_code ${code} is produced by the runner itself; a plan entry may not declare it`, in the same `refuse(...)` shape.
  6. Add `export function reasonClassOf(code)` after `RUNNER_OWNED_REASON_CODES` (pure, no I/O): it returns the catalogue entry's `class` when `code` is a string and an own key of `REASON_CATALOGUE` (use `Object.hasOwn`), else `null`.
  Do NOT change `CASE_CLASSES`, `CLASS_UNCLASSIFIED`, `OUTCOMES`, `declinedCase`, `classOf`, `objectiveStepsOf`, `summarizeEntries`, `summarizeClassification` or `applyClassification`. Do NOT add an `import`, a `// GUARD-SITE` or `// WRITE-SITE` comment, or the text `writeFileSync(`, `renameSync(` or `spawnSync(process.execPath` anywhere (comments included). Do NOT write an `outcome: '...'` or `outcome = '...'` literal other than the four vocabulary values (use the `disposition` key, never `outcome`), and keep the phrases `export const REASON_CATALOGUE` and `export const CASE_CLASSES` out of every comment: the contract pins exactly one occurrence of each.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1861-1867` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1888-1891` (the entry shapes), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1898-1899` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1932-1939` (the runner-owned list and its refusal), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1975-1978` (a pure reader beside `classOf`).
- **VALIDATE**: gate; it fails on the unmodified tree (`REASON_CLASSES` is not exported, so the first assertion throws) and passes once the task is done.
  ```bash
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const c = m.REASON_CATALOGUE;
  const impossible = ["EXTERNAL_CHANNEL", "OUTSIDE_LOCAL_ENVIRONMENT", "HUMAN_SIGNOFF"];
  assert.deepEqual(m.REASON_CLASSES, ["impossible", "gap"]);
  assert.equal(Object.keys(c).length, 12, "the catalogue must hold exactly 12 codes");
  for (const k of ["OUTSIDE_LOCAL_ENVIRONMENT", "HUMAN_SIGNOFF", "JUDGEMENT_UNCERTAIN", "ROLE_NOT_DEDICATED"]) assert.ok(Object.hasOwn(c, k), "missing " + k);
  for (const [k, v] of Object.entries(c)) {
    const want = impossible.includes(k) ? "impossible" : "gap";
    assert.equal(v.class, want, k + " class");
    assert.equal(m.reasonClassOf(k), want, k + " reasonClassOf");
    assert.ok(v.reason.endsWith("the manual steps are reproduced verbatim"), k + " keeps the verbatim clause");
  }
  assert.equal(m.reasonClassOf("NO_PLAN_ENTRY"), null);
  assert.equal(c.ROLE_NOT_DEDICATED.disposition, "blocked");
  assert.equal(c.JUDGEMENT_UNCERTAIN.disposition, "needs-human");
  assert.ok(c.EXTERNAL_CHANNEL.reason.includes("no declared local source"));
  assert.ok(c.PRODUCT_DEFECT.reason.includes("stops the case from starting"));
  assert.ok(!c.PRODUCT_DEFECT.reason.includes("blocks the case"));
  for (const k of ["PARTIAL_REMAINDER", "JUDGEMENT_UNCERTAIN", "ROLE_NOT_DEDICATED"]) assert.ok(m.RUNNER_OWNED_REASON_CODES.includes(k), k + " must be runner-owned");
  const entry = (code) => ({ index: 1, title: "t", class: "human-by-nature", reason_code: code });
  for (const k of ["JUDGEMENT_UNCERTAIN", "ROLE_NOT_DEDICATED"]) assert.notEqual(m.validatePlanClassification(entry(k)), null, k + " must be refused");
  assert.ok(m.validatePlanClassification(entry("PARTIAL_REMAINDER")).reason.includes("is derived by the runner from human_remainder"));
  for (const k of impossible) {
    assert.equal(m.validatePlanClassification(entry(k)), null, k + " must be declarable");
    assert.equal(m.declinedCase(entry(k)).outcome, "needs-human", k + " declines as needs-human");
  }
  '
  ```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the needs-human step counters in results.json and the summary

- **ACTION**: Delivers AC-A2 (`results.json` reports `needs_human_impossible` and `needs_human_gap` beside the unchanged four-key `counts`). Depends on Task 1 (`reasonClassOf`). In `plugins/relay/scripts/qa-run.mjs`:
  1. Add `export function summarizeNeedsHuman(entries)` next to `reasonClassOf` (pure, no I/O, no import). It returns exactly `{ needs_human_impossible, needs_human_gap }`, two non-negative integers. For each entry that is an object with `outcome === 'needs-human'` and a `reason_code` for which `reasonClassOf` is not `null`, it adds `owed` to the counter of that class, where: when `objective_steps` is an integer, `owed = max(0, objective_steps - executed)` and `executed` is the number of the entry's `steps` whose `result` is `passed` or `failed` (the definition used for objective steps executed in `summarizeClassification`); otherwise `owed` is the number of `steps` whose `result` is `not-run` or `human`. Everything else adds nothing: a `blocked` case, a `needs-human` case whose code is outside the catalogue (`NO_PLAN_ENTRY`, `PLAN_ENTRY_INVALID`, `NO_ACTIVE_DRIVER`), and any entry that is not an object. A declining entry ran no step, so it contributes all its declared `objective_steps`; a partial remainder contributes the declared steps its driver did not run. Never throw on a malformed `steps`.
  2. In the `finally` block of `runRun`, directly after the line `const classification = summarizeClassification(entries);` (3843), add `const needsHuman = summarizeNeedsHuman(entries);` (it must come after `applyClassification(entries, planByIndex)`, which stamps `objective_steps` on every entry, padded `RUN_ABORTED` entries included). In the `results` object add `needs_human_impossible: needsHuman.needs_human_impossible,` and `needs_human_gap: needsHuman.needs_human_gap,` right after `partially_executed: partiallyExecuted,` and before `classification,`.
  3. In the `lines` array add, between the `Partially executed (not in the driver-executed rate): ...` line and the per-case `entries.filter(...)` line, exactly this template string: `` `Needs-human steps: impossible=${needsHuman.needs_human_impossible} gap=${needsHuman.needs_human_gap}` ``.
  Leave untouched: the record-resolution branch, the `NO_PLAN_ENTRY` line and its text, the per-case loop including the `const keepSteps = ...` line, `abortedEntry`, the `QA run finished:` line (its exact form is pinned), the `results.json` write (it stays the one `writeRunFile` call) and every `outcome:` literal. Same prohibitions as Task 1: no `import`, no `// GUARD-SITE` or `// WRITE-SITE`, no `writeFileSync(` or `renameSync(` text.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1845-1853` (a pure summarizer beside `summarizeEntries`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2018-2020` (an executed step is `passed` or `failed`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:3842-3843` (where the call goes), `# SOURCE: plugins/relay/scripts/qa-run.mjs:3869-3872` (the `results` keys) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3888-3891` (the summary lines).
- **VALIDATE**: gate; it fails on the unmodified tree (`summarizeNeedsHuman` is not a function, and a run has no `needs_human_impossible`) and passes once the task is done. The first half checks the counting rule on a fixture of entries; the second half runs the real `run` mode on a declining-only plan (no target, session or browser is needed) and reads the written `results.json` and stdout. Fixture arithmetic: impossible 3 + 1 + 2 = 6; gap 4 + 2 (declared 3, one step passed) + 2 (declared 3, one step passed) + 1 (no declared count, one `human` step) + 0 (declared 1, two steps passed) = 9.
  ```bash
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawnSync } from "node:child_process";
  import { summarizeNeedsHuman } from "./plugins/relay/scripts/qa-run.mjs";
  const e = (outcome, code, steps, n) => ({ outcome, reason_code: code, steps, objective_steps: n });
  const ok = { result: "passed" }, human = { result: "human" }, notRun = { result: "not-run" };
  assert.deepEqual(summarizeNeedsHuman([
    e("needs-human", "EXTERNAL_CHANNEL", [], 3), e("needs-human", "HUMAN_SIGNOFF", [], 1), e("needs-human", "VOCABULARY_GAP", [], 4),
    e("needs-human", "PARTIAL_REMAINDER", [ok, human], 3), e("needs-human", "NO_PLAN_ENTRY", [], null), e("blocked", "PRODUCT_DEFECT", [], 5),
    e("needs-human", "STEP_UNGROUNDED", [ok, notRun, notRun], 3), e("needs-human", "OUTSIDE_LOCAL_ENVIRONMENT", [], null),
    e("needs-human", "EXTERNAL_CHANNEL", [], 2), e("needs-human", "PARTIAL_REMAINDER", [ok, human], null), e("needs-human", "STEP_UNGROUNDED", [ok, ok], 1), null, 7,
  ]), { needs_human_impossible: 6, needs_human_gap: 9 });
  assert.deepEqual(summarizeNeedsHuman([]), { needs_human_impossible: 0, needs_human_gap: 0 });
  const root = mkdtempSync(join(tmpdir(), "relay-p1t2-"));
  try {
    const runRel = "PRPs/reports/feat/qa-run/20261010T101010101Z";
    const runDir = join(root, ...runRel.split("/"));
    mkdirSync(runDir, { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    const titles = ["Inbox", "Signoff", "Gap"];
    const block = (t, i) => ["### Case " + (i + 1), "**Title:** " + t, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", "2. Check the result.", ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", "feat", "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + titles.map(block).join("\n") + "\n## Notes\n\nnone\n");
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ roles: {} }));
    writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: [
      { index: 1, title: "Inbox", class: "human-by-nature", reason_code: "EXTERNAL_CHANNEL", objective_steps: 3 },
      { index: 2, title: "Signoff", class: "human-by-nature", reason_code: "HUMAN_SIGNOFF", objective_steps: 1 },
      { index: 3, title: "Gap", class: "needs-a-new-driver", reason_code: "VOCABULARY_GAP", objective_steps: 4 },
    ] }));
    const p = spawnSync(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", "feat", "--run-dir", runRel], { cwd: root, encoding: "utf8" });
    assert.equal(p.status, 0, p.stderr);
    const res = JSON.parse(readFileSync(join(runDir, "results.json"), "utf8"));
    assert.deepEqual(res.counts, { pass: 0, fail: 0, blocked: 0, "needs-human": 3 });
    assert.equal(res.needs_human_impossible, 4);
    assert.equal(res.needs_human_gap, 4);
    assert.ok(p.stdout.includes("Needs-human steps: impossible=4 gap=4"), p.stdout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  '
  ```

### Task 3: UPDATE plugins/relay/commands/relay-qa-run.md — the Class column, the counting convention, the counters and the product-defect rule

- **ACTION**: Delivers AC-A3 (the counting convention), AC-A4 (the product-defect rule), AC-A1 (the classed, twelve-code catalogue table) and AC-A2 (the counters in "Result fields"). Depends on Tasks 1 and 2. In `plugins/relay/commands/relay-qa-run.md`, in the section "Classify every case and name every decline":
  1. Class bullets (lines 509-510). Replace the `human-by-nature` bullet with: `` - `human-by-nature`: the case needs only what no AI agent can execute alone: a real external channel with no declared local source, production or a physical device, or a step the report reserves for a person. `` and the `blocked-by-product` bullet with: `` - `blocked-by-product`: a known product defect stops the case from starting. `` (This removes the text "a known product defect blocks the case" from the class bullets.) Leave the `automatable` and `needs-a-new-driver` bullets and the frozen 14-case table (lines 522-527) byte-identical: existing tests parse its rows.
  2. After the frozen table add one paragraph: "This table is the 0.46.0 reference classification, frozen under the earlier convention. The counting convention below applies from the next counted run: a new pre-run table is frozen under it before that run, and until then a case keeps the class this table gives it."
  3. Replace the catalogue table (lines 534-543) with a four-column table. The header line is exactly `| Code | Outcome | Class | Use it when |`, the separator is `|------|---------|-------|-------------|`, and the twelve rows are, in this order (the first two cells of each row keep the existing form `` | `CODE` | `outcome` | ``):
  ```
  | `UNGROUNDABLE_AFTER_INTERACTION` | `needs-human` | `gap` | the case needs an element that exists only after an interaction and no snapshot can ground it |
  | `EXTERNAL_CHANNEL` | `needs-human` | `impossible` | the case needs a real external channel (an inbox, SMS or a third-party payment) and the project declares no local source for it |
  | `OUTSIDE_LOCAL_ENVIRONMENT` | `needs-human` | `impossible` | the case needs production or a physical device |
  | `HUMAN_SIGNOFF` | `needs-human` | `impossible` | the report itself reserves the step for a person |
  | `VISUAL_JUDGEMENT` | `needs-human` | `gap` | the case asks for a judgment of appearance that no step of the vocabulary captures for a judgment yet |
  | `JUDGEMENT_UNCERTAIN` | `needs-human` | `gap` | never declared: the runner reports it when a recorded judgment of a capture is uncertain |
  | `VOCABULARY_GAP` | `needs-human` | `gap` | a needed step, or a declared source or origin for it, is missing from the closed vocabulary and the tracked declarations |
  | `STEP_UNGROUNDED` | `needs-human` | `gap` | a step's element is not in the snapshot or does not match exactly one element |
  | `PRODUCT_DEFECT` | `blocked` | `gap` | a known product defect stops the case from starting; a defect the case can reach is executed and ends `fail` |
  | `STATE_UNCONFIRMED` | `blocked` | `gap` | the declaration for the required state is not confirmed |
  | `ROLE_NOT_DEDICATED` | `blocked` | `gap` | never declared: the runner refuses a write step for a role the kit does not declare dedicated |
  | `PARTIAL_REMAINDER` | `needs-human` | `gap` | never declared: the runner derives it from `human_remainder`, which must name its gap |
  ```
  Keep the sentence before the table (a code outside the catalogue, and `NO_PLAN_ENTRY` itself, makes the entry `PLAN_ENTRY_INVALID`) and the "Runtime halt codes" paragraph after it. Between the table and that paragraph add the reason-class paragraph: "Every code carries a reason class, shown in the third column. `impossible` marks what no AI agent can execute alone: a real external channel with no declared local source, production or a physical device, or a step the report reserves for a person; `EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT` and `HUMAN_SIGNOFF` are the only impossible codes. `gap` marks every other code: a limit of the runner or of the plan that counts against the executed share and is worked off, never accepted as human by nature. The reason class is not the `class` of a case, which is the pre-run classification above."
  4. After the "Objective steps." paragraph (lines 560-567, kept intact) add one sentence: "A declining entry of any other class should declare it too, because the step counters below read it; a declining entry that omits it contributes no step to either counter." Then add the counting-convention paragraph, written exactly as: "Counting convention. Under this convention, judgment and channel steps are objective steps, beside the driver steps: an objective step is any step of a case that an AI agent can execute and judge alone, so a step that needs a recorded judgment of a capture, or a message read from a declared local source, is one. The metric denominator is every objective step not of impossible class: a step leaves it only when its sole reason to stay with a person is an impossible code, and every other step that no driver executed is a gap that stays in it. A pre-run table is frozen under this convention before any counted run: its case classes, its impossible-class steps and its objective-step counts are written down before the run and never re-derived afterwards."
  5. "Result fields." (lines 577-586): insert before the closing sentence "The four-key `counts` partition is unchanged." (which stays last): "The top level also carries `needs_human_impossible` and `needs_human_gap`, the number of steps left to a person by a `needs-human` case whose reason code is of the impossible class or of the gap class: a case contributes its declared `objective_steps` less the steps a driver ran (`passed` or `failed`), a case that declared none contributes its steps still `not-run` or `human`, and a `blocked` case or a case whose code is outside the catalogue contributes to neither."
  6. Honesty rules. Replace the first bullet (lines 662-668) with: "- Decline a case only for what no vocabulary step reaches: write a declining entry with a `class` and a catalogued `reason_code`, `EXTERNAL_CHANNEL` for an inbox, SMS or a third-party payment with no declared local source, `OUTSIDE_LOCAL_ENVIRONMENT` for production or a physical device, `HUMAN_SIGNOFF` for a step the report reserves for a person, `VISUAL_JUDGEMENT` for a judgment of appearance and `VOCABULARY_GAP` for a CLI or any other action outside the vocabulary. The script records it with the steps verbatim. Only the first three codes are of the impossible class; every other code is a gap that counts against the executed share." Keep the wrapped two-space continuation style of the neighbouring bullets. Directly after it add a new bullet: "- Never decline a case for a product defect it can reach. Plan its steps: a divergence from the behaviour the report expects is a result, so the case is executed and reported `fail` with evidence naming the failing step. Use `PRODUCT_DEFECT` only for a case that cannot start."
  7. "Final output surface" (line 770 onward): after the sentence ending "as a planner defect." add: "Read `needs_human_impossible` and `needs_human_gap` from `results.json` (the `Needs-human steps` summary line repeats them): a gap step is a miss against the executed share, an impossible step is not."
  Keep intact: the required tokens `HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET` and `qa-run.mjs`; every `<!-- qa-step-example driver=... -->` and `<!-- qa-plan-entry-example -->` block (add no new JSON block, and none with a top-level `states` key); the bullets that begin `- A cited test title narrows the decision` and `- When the field cites only a file`. Never write, anywhere in the file, `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`, `--local-host`, `Until seeds`, `not yet read by the runner`, the phrase `a CLI, a database query`, or any `..HEAD` diff form. Keep LF line endings. Placement rules pinned by existing tests: put the new product-defect bullet directly after the rewritten first honesty bullet, never between the bullet that begins "Plan a `ground` prefix only from" and the one that begins "Plan `expect_requests` only when" (those two must stay adjacent), and begin no bullet with an opener another "Plan" bullet already uses; add no second occurrence of the text "the runner script (" (the mode list is pinned to exactly one); insert no paragraph between the two Phase B paragraphs that begin "For a role whose mechanism is `minted`" and "A minted role whose login script halts"; leave every existing sentence of "Result fields." and "Final output surface" in place (the additions are new sentences); and let the rows of the catalogue table be the only lines of the document of the form `` | `CODE` | `needs-human` | `` or `` | `CODE` | `blocked` | ``.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:534-543` (the table being extended), `# SOURCE: plugins/relay/commands/relay-qa-run.md:560-567` (the prose register for the convention), `# SOURCE: plugins/relay/commands/relay-qa-run.md:577-586` (the results description) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:662-668` (the bullet being rewritten).
- **VALIDATE**: gate; it fails on the unmodified tree (the doc table has no Class column, so no row is parsed) and passes once the task is done. The deliverable is doc text, so literal phrases are matched, but the table is bound to the runner: every code must appear with the outcome and class the catalogue gives it. The phrases are copied byte-for-byte from the ACTION above, whitespace-collapsed because the doc is hard-wrapped.
  ```bash
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import { REASON_CATALOGUE } from "./plugins/relay/scripts/qa-run.mjs";
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const flat = doc.replace(/\s+/g, " ");
  const rows = {};
  for (const x of doc.matchAll(/^\| `([A-Z_]+)` \| `(needs-human|blocked)` \| `(impossible|gap)` \|/gm)) rows[x[1]] = x[2] + "/" + x[3];
  const want = Object.fromEntries(Object.entries(REASON_CATALOGUE).map(([k, v]) => [k, v.disposition + "/" + v.class]));
  assert.deepEqual(rows, want, "the catalogue table must list every code with the outcome and class the runner gives it");
  for (const phrase of ["judgment and channel steps are objective steps", "every objective step not of impossible class", "frozen under this convention before any counted run", "`needs_human_impossible`", "`needs_human_gap`", "stops the case from starting", "executed and reported `fail`"]) assert.ok(flat.includes(phrase), "missing: " + phrase);
  for (const gone of ["a known product defect blocks the case", "the case needs an inbox, SMS, a physical device or a third-party payment"]) assert.ok(!flat.includes(gone), "stale text still present: " + gone);
  '
  ```

### Task 4: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the classes, the counters and the convention

- **ACTION**: Delivers AC-A5 (the classes, the impossible set, the runner-owned codes, the counters and the convention are pinned) and AC-A6 (the check is extended, not duplicated; `npm run validate` stays at 28 checks). Depends on Tasks 1 to 3. In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Widen the import from `../../../plugins/relay/scripts/qa-run.mjs` with `REASON_CLASSES`, `RUNNER_OWNED_REASON_CODES` and `summarizeNeedsHuman`. Update the file's header comment (lines 13-22): the catalogue now holds eleven required codes, each with a class; the impossible set is closed; the command table must agree with the runner; the counters are recomputed (tolerant of older results); the command states the counting convention.
  2. Constants: append `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`, `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED` to `REQUIRED_CATALOGUE_CODES` (`VOCABULARY_GAP` stays outside it, as today); add `REQUIRED_IMPOSSIBLE_CODES = ['EXTERNAL_CHANNEL', 'OUTSIDE_LOCAL_ENVIRONMENT', 'HUMAN_SIGNOFF']`, `REQUIRED_RUNNER_OWNED_CODES = ['PARTIAL_REMAINDER', 'JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED']`, `NEEDS_HUMAN_COUNTERS = ['needs_human_impossible', 'needs_human_gap']`, `COUNTING_CONVENTION_PHRASES = ['judgment and channel steps are objective steps', 'every objective step not of impossible class', 'frozen under this convention before any counted run']` and `PRODUCT_DEFECT_RULE_PHRASES = ['stops the case from starting', 'executed and reported `fail`']`.
  3. `validateResults`: directly after the `partially_executed` rule add the two counters. For each name in `NEEDS_HUMAN_COUNTERS`, when `obj[name] !== undefined`, it must be a non-negative integer equal to `summarizeNeedsHuman(cases.filter(isPlainObject))[name]`, else push `${name} (${JSON.stringify(obj[name])}) does not equal the steps the cases recompute to (${expected})`. Absent keys stay valid (results written before the counters existed). No new message may contain the phrase `is outside the closed vocabulary` or the phrase `step example`.
  4. `requireCatalogue`, script side (inside the block that already iterates `REASON_CATALOGUE`): each entry's `class` must be a member of `REASON_CLASSES` (message names the code); a code in `REQUIRED_IMPOSSIBLE_CODES` must carry `impossible` and every other code must carry `gap`; each code in `REQUIRED_RUNNER_OWNED_CODES` must be in `RUNNER_OWNED_REASON_CODES`; `RUNNER_OWNED_REASON_CODES` must hold no other code. These messages may name codes (they carry `SCRIPT_FILE`).
  5. `requireCatalogue`, command side (inside the block at lines 720-745): (a) whitespace-collapse the command text and require each phrase of `COUNTING_CONVENTION_PHRASES` (message `the runner command must state the counting convention: it must contain "<phrase>"`) and each phrase of `PRODUCT_DEFECT_RULE_PHRASES` (message `the runner command must state the product-defect rule: it must contain "<phrase>"`); (b) require each name of `NEEDS_HUMAN_COUNTERS` in backticks (message `the runner command must document the step counter <name>`); (c) if the text has no line starting `| Code | Outcome | Class |`, add the single finding `the runner command reason-code table must carry a Class column: | Code | Outcome | Class | Use it when |`; otherwise parse the rows with the pattern `` /^\| `([A-Z_]+)` \| `(needs-human|blocked)` \| `(impossible|gap)` \|/gm `` and, for every code of `REASON_CATALOGUE`, add a finding when the row is missing or its outcome or class differs from the runner's `disposition` or `class`. The messages of (a) to (c) when the table is absent must contain no catalogue code and no case class name (the existing expectation that a doc naming nothing is flagged exactly once per code and per class must stay true), and must not contain `step example` or `is outside the closed vocabulary`. Keep the patterns tolerant of CRLF.
  No new registered check, no write call, no new flag: `runQaRunContractCheck` already passes `requireCatalogue: true`.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:215-220` (an optional key validated only when present), `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:645-657` (behavior pins on the imported catalogue) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:720-727` (the doc pins).
- **VALIDATE**: gate; it fails on the unmodified tree (the mutation anchors are absent from the doc and the counters are not validated) and passes once the task is done. Part one mutates the real doc five ways and requires a finding for each, and exercises the tolerant counter rule on a hand-built result; part two is the full static suite, run after part one (never in parallel).
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import { checkQaRunContract, validateResults } from "./scripts/validate/checks/qa-run-contract.mjs";
  const scriptText = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
  const run = (commandText) => checkQaRunContract({ scriptText, commandText, results: [], requireStepExamples: true, requireCatalogue: true }).findings;
  assert.deepEqual(run(doc), [], "the real script and doc must satisfy the contract");
  for (const [from, to] of [
    ["frozen under this convention before any counted run", "frozen before any counted run"],
    ["every objective step not of impossible class", "every objective step"],
    ["judgment and channel steps are objective steps", "judgment steps are objective steps"],
    ["| `EXTERNAL_CHANNEL` | `needs-human` | `impossible` |", "| `EXTERNAL_CHANNEL` | `needs-human` | `gap` |"],
    ["`needs_human_gap`", "`needs_human_other`"],
  ]) {
    assert.ok(doc.includes(from), "mutation anchor absent from the doc: " + from);
    assert.ok(run(doc.split(from).join(to)).length > 0, "no finding for the mutation: " + from);
  }
  const t = "2026-10-10T10:10:10.101Z";
  const good = { started_at: t, finished_at: "2026-10-10T10:10:10.202Z", human_gate: { status: "open" }, counts: { pass: 0, fail: 0, blocked: 0, "needs-human": 1 },
    cases: [{ index: 1, title: "t", outcome: "needs-human", reason_code: "EXTERNAL_CHANNEL", class: "human-by-nature", objective_steps: 3, steps: [], started_at: t, finished_at: "2026-10-10T10:10:10.202Z" }] };
  assert.deepEqual(validateResults(good), [], "results written before the counters existed stay valid");
  assert.deepEqual(validateResults({ ...good, needs_human_impossible: 3, needs_human_gap: 0 }), []);
  assert.ok(validateResults({ ...good, needs_human_impossible: 2, needs_human_gap: 0 }).some((m) => m.includes("needs_human_impossible")));
  assert.ok(validateResults({ ...good, needs_human_impossible: 3, needs_human_gap: -1 }).some((m) => m.includes("needs_human_gap")));
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate
  ```

### Task 5: UPDATE docs/api-reference.md — the /relay-qa-run row and the qa-run.mjs row

- **ACTION**: Delivers AC-A7 (the knowledge base names the twelve codes, their classes and the counters). Depends on Tasks 1 and 2. In `docs/api-reference.md` make two narrow `Edit` calls (the rows are very long single lines, so each `old_string` is one sentence fragment, never the whole row):
  1. In the `/relay-qa-run` row (line 129), replace the parenthesis `(`UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `VISUAL_JUDGEMENT`, `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `PRODUCT_DEFECT`, `STATE_UNCONFIRMED`; `PARTIAL_REMAINDER` is derived by the runner)` with a parenthesis that names all twelve codes in backticks and says which are declarable and which the runner owns, then add the class sentence: each code carries a class, `impossible` (`EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`) or `gap` (every other code); `EXTERNAL_CHANNEL` means a real external channel with no declared local source; `PRODUCT_DEFECT` is only for a case that cannot start, because a defect the case can reach is executed and ends `fail`. The runner-owned codes are `PARTIAL_REMAINDER`, `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED`. Then extend the closing clause so it reads "... and `results.json` carries a `classification` block beside the unchanged four-key `counts`, plus the step counters `needs_human_impossible` and `needs_human_gap`". The clause "a `classification` block beside the unchanged four-key `counts`" must stay verbatim (an existing test matches it).
  2. In the `qa-run.mjs` row (line 219), in the exports list that starts at `REASON_CATALOGUE` and ends at `USAGE`, name `REASON_CLASSES` beside `REASON_CATALOGUE` and add `reasonClassOf` and `summarizeNeedsHuman` to the parenthesised helper list (each in backticks). Every name must be a real export. In the `qa-run.mjs` row an existing test reads the span from the first backticked `REASON_CATALOGUE` to the first `USAGE` and requires every backticked upper-snake or camel-case token in it to be a real export, so put no catalogue code in backticks inside that span and introduce no earlier backticked `REASON_CATALOGUE` in that row. In the `/relay-qa-run` row put all twelve codes and the four case classes in backticks. Change nothing else in either row.
- **MIRROR**: `# SOURCE: docs/api-reference.md:129` and `# SOURCE: docs/api-reference.md:219`.
- **VALIDATE**: gate; it fails on the unmodified tree (the row names none of the new codes) and passes once the task is done. Names are checked against the runner's live exports, so a misspelt or invented export fails.
  ```bash
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as runner from "./plugins/relay/scripts/qa-run.mjs";
  const lines = readFileSync("docs/api-reference.md", "utf8").split(/\r?\n/);
  const qa = lines.find((l) => l.startsWith("| `/relay-qa-run "));
  const rn = lines.find((l) => l.startsWith("| `qa-run.mjs` "));
  assert.ok(qa && rn, "the /relay-qa-run row or the qa-run.mjs row was not found");
  for (const k of Object.keys(runner.REASON_CATALOGUE)) assert.ok(qa.includes("`" + k + "`"), "the /relay-qa-run row does not name " + k);
  for (const n of ["impossible", "gap", "needs_human_impossible", "needs_human_gap"]) assert.ok(qa.includes("`" + n + "`"), "the /relay-qa-run row does not name " + n);
  assert.ok(qa.includes("a `classification` block beside the unchanged four-key `counts`"), "the existing classification clause must stay verbatim");
  for (const n of ["REASON_CLASSES", "reasonClassOf", "summarizeNeedsHuman"]) {
    assert.ok(rn.includes("`" + n + "`"), "the qa-run.mjs row does not name " + n);
    assert.ok(n in runner, n + " is not an export of the runner");
  }
  '
  ```

### Task 6: UPDATE docs/domain/glossary.md — the plan-entry paragraph

- **ACTION**: Delivers AC-A7 (the knowledge base names the twelve codes, their classes and the counters). Depends on Tasks 1 and 2. In `docs/domain/glossary.md`, in the paragraph at lines 359-375 that defines the `class` and `reason_code` fields of a `/relay-qa-run` plan entry, replace the catalogue list (lines 367-369, from `` `UNGROUNDABLE_AFTER_INTERACTION` `` through `` the runner-derived `PARTIAL_REMAINDER` ``) with the twelve codes in backticks, naming the three runner-owned ones (`PARTIAL_REMAINDER`, `JUDGEMENT_UNCERTAIN`, `ROLE_NOT_DEDICATED`) as runner-produced. Add two sentences to the same paragraph: every code carries a reason class, `impossible` (`EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`) or `gap` (every other code), distinct from the `class` of a case; and `results.json` also carries the step counters `needs_human_impossible` and `needs_human_gap` beside the unchanged four-key `counts` partition. Keep the paragraph a single paragraph (no blank line inside it), keep the existing sentences about `PLAN_ENTRY_INVALID`, `NO_PLAN_ENTRY` and the `classification` block, and do not touch any other term.
- **MIRROR**: `# SOURCE: docs/domain/glossary.md:364-369`.
- **VALIDATE**: gate; it fails on the unmodified tree (the paragraph lists eight codes) and passes once the task is done.
  ```bash
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import { REASON_CATALOGUE } from "./plugins/relay/scripts/qa-run.mjs";
  const para = readFileSync("docs/domain/glossary.md", "utf8").split(/\r?\n\r?\n/).find((p) => p.includes("`REASON_CATALOGUE`"));
  assert.ok(para, "the glossary paragraph that names REASON_CATALOGUE was not found");
  for (const k of Object.keys(REASON_CATALOGUE)) assert.ok(para.includes("`" + k + "`"), "the glossary paragraph does not name " + k);
  for (const n of ["impossible", "gap", "needs_human_impossible", "needs_human_gap"]) assert.ok(para.includes("`" + n + "`"), "the glossary paragraph does not name " + n);
  '
  ```

### Task 7: UPDATE documentation/reference/commands.html — the Classification row of the /relay-qa-run entry

- **ACTION**: Delivers AC-A8 (the commands reference states the classed, twelve-code catalogue). Depends on Tasks 1, 2 and 5. Read `documentation/AGENTS.md` first (§6, §7, §9); this task edits one row of an existing page and adds none, so NAV and the search index are untouched. In `documentation/reference/commands.html`, in the `<dt>Classification</dt>` row of the `/relay-qa-run` entry (line 351; keep it ONE `<dd>`), make these four edits and nothing else:
  1. In the sentence "An entry that does not execute its case declines it with a `reason_code` from a closed catalogue and no steps: ...", replace the list with the nine declarable codes, each in `<code>`, in this order: `UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`, `VISUAL_JUDGEMENT`, `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `PRODUCT_DEFECT` or `STATE_UNCONFIRMED`. This stays the only sentence of the row that contains "closed catalogue", and it contains no other upper-snake token.
  2. Replace the sentence "The eighth member, `PARTIAL_REMAINDER`, is derived by the runner and never declared." with: "The twelfth member, `ROLE_NOT_DEDICATED`, and the codes `PARTIAL_REMAINDER` and `JUDGEMENT_UNCERTAIN` are derived by the runner and never declared." (each code in `<code>`). This is the only sentence of the row that contains "derived by the runner", it holds exactly these three upper-snake tokens and no full stop inside it. `ROLE_NOT_DEDICATED` is the twelfth key of the catalogue in the order Task 1 gives.
  3. Insert, right after that sentence and before "A code outside the catalogue makes the entry ...": "Each code carries a reason class: `EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT` and `HUMAN_SIGNOFF` are `impossible`, what no AI agent can execute alone, and every other code is a `gap` that counts against the executed share. `PRODUCT_DEFECT` is only for a case that cannot start, because a product defect the case can reach is executed and ends `fail`." (code names and the words `impossible`, `gap` and `fail` in `<code>`; neither sentence may contain "closed catalogue" or "derived by the runner", and neither may use "e.g." or "i.e.").
  4. At the end of the row, after "the four-key `counts` partition is unchanged.", add: "`results.json` also carries `needs_human_impossible` and `needs_human_gap`, the steps left to a person by a `needs-human` case, split by the reason class of its code." (both names in `<code>`).
  Keep every other sentence of the row, including the ones that name `PLAN_ENTRY_INVALID`, "NO_PLAN_ENTRY, a planner defect reported as unclassified", "a classification block", "a partially executed case is never counted in the rate" and "the four-key counts partition is unchanged". Add no emoji, use American English, keep LF line endings, and add no link whose target is not an existing anchor.
- **MIRROR**: `# SOURCE: documentation/reference/commands.html:351`.
- **VALIDATE**: gate; it fails on the unmodified tree (the row names none of the new codes) and passes once the task is done. The first command checks the row against the runner's live catalogue; the second runs the existing site test that reads this row, filtered to its one test, and requires at least one pass so that a filter matching nothing cannot pass vacuously. The summary lines `# pass N` and `# fail N` are the TAP reporter's, observed in this repository's corpus output.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import { REASON_CATALOGUE } from "./plugins/relay/scripts/qa-run.mjs";
  const page = readFileSync("documentation/reference/commands.html", "utf8").replace(/\r\n/g, "\n");
  const entry = page.slice(page.indexOf("<h3 id=\"relay-qa-run\""));
  const m = /<dt>Classification<\/dt>\s*<dd>([\s\S]*?)<\/dd>/.exec(entry);
  assert.ok(m, "the Classification row of the /relay-qa-run entry was not found");
  for (const k of Object.keys(REASON_CATALOGUE)) assert.ok(m[1].includes("<code>" + k + "</code>"), "the Classification row does not name " + k);
  for (const n of ["impossible", "gap", "needs_human_impossible", "needs_human_gap"]) assert.ok(m[1].includes("<code>" + n + "</code>"), "the Classification row does not name " + n);
  '
  out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-reporter=tap --test-name-pattern="AC-A5 the pages name the four classes" scripts/validate/checks/qa-run-release-pages.test.mjs)"
  printf '%s\n' "$out" | grep -qx "# fail 0"
  printf '%s\n' "$out" | grep -qE "^# pass [1-9][0-9]*$"
  ```

### Task 8: UPDATE documentation/reference/validation-checks.html — the qa-run-contract section

- **ACTION**: Delivers AC-A8 (the validation-checks reference states the eleven required codes, the twelve-code catalogue and the new pins). Depends on Tasks 1 and 4. In `documentation/reference/validation-checks.html`, in the `<h2 id="qa-run-contract">` section, in the second paragraph (line 372, "Opt-in rule sets"), replace the **Catalogue:** sentence (from "`<strong>Catalogue:</strong>`" up to, and not including, "`<strong>Ground:</strong>`") with exactly this HTML:
  `<strong>Catalogue:</strong> the closed reason-code catalogue and the four case classes are defined once, the catalogue must hold the eleven codes the check names (<code>UNGROUNDABLE_AFTER_INTERACTION</code>, <code>EXTERNAL_CHANNEL</code>, <code>OUTSIDE_LOCAL_ENVIRONMENT</code>, <code>HUMAN_SIGNOFF</code>, <code>VISUAL_JUDGEMENT</code>, <code>JUDGEMENT_UNCERTAIN</code>, <code>PRODUCT_DEFECT</code>, <code>STATE_UNCONFIRMED</code>, <code>ROLE_NOT_DEDICATED</code>, <code>STEP_UNGROUNDED</code> and <code>PARTIAL_REMAINDER</code>) and never the omitted-case marker <code>NO_PLAN_ENTRY</code>, and the catalogue itself holds twelve codes, since <code>VOCABULARY_GAP</code> is not one of the eleven; every code carries the disposition <code>needs-human</code> or <code>blocked</code> and a class, <code>impossible</code> for <code>EXTERNAL_CHANNEL</code>, <code>OUTSIDE_LOCAL_ENVIRONMENT</code> and <code>HUMAN_SIGNOFF</code> and <code>gap</code> for every other code, <code>PARTIAL_REMAINDER</code>, <code>JUDGEMENT_UNCERTAIN</code> and <code>ROLE_NOT_DEDICATED</code> are runner-owned, every code of the catalogue and every class is documented in the command, the reason-code table of the command gives every code the outcome and class the runner gives it, the command states the counting convention and names the step counters <code>needs_human_impossible</code> and <code>needs_human_gap</code>, a stored counter must equal what the cases recompute to, and every marked plan-entry example validates against the validator of the runner itself.`
  The parenthesis after "the eleven codes the check names" holds exactly the eleven codes and no closing parenthesis inside it. Do not write the text "Unit tests (" or "none yet" anywhere in the section's added text, change nothing else in the page, and keep LF line endings.
- **MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:372`.
- **VALIDATE**: gate; it fails on the unmodified tree (the section says "seven" and "eight") and passes once the task is done. The first command applies the same three phrase patterns as the existing site test to the live catalogue; the second runs two of that file's tests, filtered, and requires at least one pass.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import { REASON_CATALOGUE } from "./plugins/relay/scripts/qa-run.mjs";
  const page = readFileSync("documentation/reference/validation-checks.html", "utf8").replace(/\r\n/g, "\n");
  const start = page.indexOf("<h2 id=\"qa-run-contract\"");
  assert.ok(start !== -1, "the qa-run-contract section was not found");
  const end = page.indexOf("<h2 ", start + 10);
  const text = page.slice(start, end === -1 ? page.length : end).replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
  const keys = Object.keys(REASON_CATALOGUE);
  const required = /\bthe eleven codes the check names \(([^)]*)\)/.exec(text);
  assert.ok(required, "the section must say: the eleven codes the check names (...)");
  const listed = [...new Set(required[1].match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? [])];
  assert.equal(listed.length, 11, "the parenthesis must list eleven distinct codes");
  for (const c of listed) assert.ok(keys.includes(c), c + " is not a key of the catalogue");
  assert.equal(keys.length - listed.length, 1);
  assert.ok(text.includes("the catalogue itself holds twelve codes"));
  assert.ok(text.includes("since VOCABULARY_GAP is not one of the eleven"));
  assert.ok(!keys.includes("VOCABULARY_GAP") || !listed.includes("VOCABULARY_GAP"));
  '
  out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-reporter=tap --test-name-pattern="AC-A8 the qa-run-contract section states the size of the catalogue" --test-name-pattern="AC-A8 the two sections that gained rule sets" scripts/validate/checks/qa-run-release-site.test.mjs)"
  printf '%s\n' "$out" | grep -qx "# fail 0"
  printf '%s\n' "$out" | grep -qE "^# pass [1-9][0-9]*$"
  ```

### Task 9: UPDATE documentation/changelog.html — the Unreleased entry

- **ACTION**: Delivers AC-A8 (`documentation/AGENTS.md` §7.4: every change under `documentation/` is logged). Depends on Tasks 7 and 8. In `documentation/changelog.html`, replace `<p>Nothing yet.</p>` (line 33) with the two subsections below, keeping the heading `<h2 id="unreleased">Unreleased</h2>` literal and the first release heading `<h2 id="v0-46-0">` as the next `<h2` on the page. Every id inside the block starts with `unreleased`, the block holds no `<h2`, and no list item may repeat the text of an item of the 0.46.0 section. Use only `/relay-qa-run` as a command name. Write (6-space indentation as in the page):
  ```
        <h3 id="unreleased-added">Added</h3>

        <ul>
          <li><strong>Impossible and gap classes for the QA runner&rsquo;s reason codes</strong> &mdash; every code of the
            <code>/relay-qa-run</code> reason-code catalogue now carries a class. <code>EXTERNAL_CHANNEL</code> (redefined
            as a real external channel with no declared local source), <code>OUTSIDE_LOCAL_ENVIRONMENT</code> (production
            or a physical device) and <code>HUMAN_SIGNOFF</code> (a step the report reserves for a person) are
            <code>impossible</code>: no AI agent can execute them alone. Every other code is a <code>gap</code> that
            counts against the executed share. The catalogue holds twelve codes; <code>JUDGEMENT_UNCERTAIN</code> and
            <code>ROLE_NOT_DEDICATED</code> are recorded by the runner and a plan cannot declare them.</li>
          <li><strong>Step counters for what is left to a person</strong> &mdash; <code>results.json</code> gains
            <code>needs_human_impossible</code> and <code>needs_human_gap</code>, the steps left to a person by a
            <code>needs-human</code> case, split by the class of its reason code, beside the unchanged four-key
            <code>counts</code>; the run prints a <code>Needs-human steps</code> summary line.</li>
          <li><strong>Counting convention</strong> &mdash; the command document defines an objective step to include
            judgment and channel steps, defines the metric denominator as every objective step not of impossible class,
            and requires a pre-run table to be frozen under this convention before any counted run.</li>
        </ul>

        <h3 id="unreleased-changed">Changed</h3>

        <ul>
          <li><strong><code>PRODUCT_DEFECT</code> is only for a case that cannot start</strong> &mdash; a product defect
            the case can reach is executed and reported <code>fail</code> with evidence naming the failing step instead
            of being declined.</li>
          <li><strong><code>qa-run-contract</code></strong> &mdash; the check pins the class of every catalogue code, the
            closed set of impossible codes, the runner-owned codes, the two counters and the counting convention in the
            command document. It is extended, not duplicated: <code>npm run validate</code> still runs 28 checks.</li>
          <li><strong>Reference pages</strong> &mdash; the <code>/relay-qa-run</code> entry of the commands reference and
            the <code>qa-run-contract</code> section of the validation checks reference state the twelve codes, the two
            classes and the counters.</li>
        </ul>
  ```
  Use no emoji and no first person, and keep LF line endings. Do not touch `assets/js/app.js`, `assets/data/search-index.json` or `plugins/relay/.claude-plugin/plugin.json`: no page is added, no searchable title changes, and the version bump is the release cut.
- **MIRROR**: `# SOURCE: documentation/changelog.html:31-33` and `# SOURCE: documentation/changelog.html:48-52`.
- **VALIDATE**: gate; it fails on the unmodified tree (the block is the placeholder) and passes once the task is done. The first command checks the block's shape; the second runs the three existing site test files that read the changelog, the contract section and the catalogue-bound pages (every test of each, at least one pass, no failure).
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  const page = readFileSync("documentation/changelog.html", "utf8").replace(/\r\n/g, "\n");
  const start = page.indexOf("<h2 id=\"unreleased\">Unreleased</h2>");
  assert.ok(start !== -1, "the Unreleased heading was not found");
  const next = page.indexOf("<h2", start + 10);
  assert.ok(next !== -1);
  const block = page.slice(start, next);
  assert.ok(block.includes("<li>"), "the Unreleased block lists no entry");
  assert.ok(!block.includes("Nothing yet."), "the placeholder must go once the block lists an entry");
  for (const id of block.matchAll(/\bid="([^"]+)"/g)) assert.ok(id[1].startsWith("unreleased"), "an id inside the block must start with unreleased: " + id[1]);
  for (const token of ["OUTSIDE_LOCAL_ENVIRONMENT", "HUMAN_SIGNOFF", "needs_human_impossible", "needs_human_gap", "PRODUCT_DEFECT"]) assert.ok(block.includes(token), "the Unreleased block does not mention " + token);
  '
  out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-reporter=tap scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-pages.test.mjs)"
  printf '%s\n' "$out" | grep -qx "# fail 0"
  printf '%s\n' "$out" | grep -qE "^# pass [1-9][0-9]*$"
  ```

## Validation Commands

Every command runs from `<target_root>` (the worktree), prefixed with the host's required git-config environment. Run Level 1, then Level 2, then Level 3, strictly in sequence: `npm run validate` and the node commands never overlap. `node_modules` is not installed in the worktree; Node resolves `ajv` and `node-html-parser` from the main checkout's `node_modules` by walking up the directory tree, so `npm run validate` needs no install. The corpus gate in Level 3 is different: the `qa-run` test files spawn a copy of the runner with `NODE_PATH` set to `<target_root>/node_modules`, so the gate requires `node_modules/playwright` inside the worktree and fails fast, naming the cause, when it is absent.

### Level 1 STATIC_ANALYSIS

Regression guards: each passes on the unmodified tree by design and fails only if the change breaks syntax, touches a frozen file or adds a check.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check scripts/validate/checks/qa-run-contract.mjs
# The five frozen surfaces are byte-identical to HEAD (single-argument diff, working tree against HEAD, path-scoped).
if [ -n "$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen surface changed"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# No validate check module was added (the registered count stays 28): no new or untracked non-test .mjs under scripts/validate.
status="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git status --porcelain --untracked-files=all -- scripts/validate)"
if printf '%s\n' "$status" | grep -E '^(\?\?|A )' | grep -v '\.test\.mjs$' | grep -q '\.mjs'; then
  echo "FAIL: a validate check module was added"; exit 1
else
  echo "PASS: no validate check added"
fi
# Documentation moved only where the plan says: three files changed, none added, and the plugin manifest (the version bump), NAV and the search index untouched.
changed="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --name-only HEAD -- documentation plugins/relay/.claude-plugin/plugin.json)"
extra="$(printf '%s\n' "$changed" | grep -v -e '^documentation/reference/commands\.html$' -e '^documentation/reference/validation-checks\.html$' -e '^documentation/changelog\.html$' | grep -v '^$' || true)"
if [ -n "$extra" ]; then
  echo "FAIL: a file outside the three planned documentation files changed:"; printf '%s\n' "$extra"; exit 1
else
  echo "PASS: only the three planned documentation files changed"
fi
docstatus="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git status --porcelain --untracked-files=all -- documentation)"
if printf '%s\n' "$docstatus" | grep -qE '^(\?\?|A )'; then
  echo "FAIL: a documentation file was added"; exit 1
else
  echo "PASS: no documentation page added"
fi
```

### Level 2 CONTENT_INVARIANTS

Gate on the class split and the real-tree contract; it fails on the unmodified tree (no entry has a class, so the impossible set is empty) and passes once all tasks are done. The two greps are regression guards.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import { REASON_CATALOGUE, OUTCOMES } from "./plugins/relay/scripts/qa-run.mjs";
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
assert.equal(OUTCOMES.join(","), "pass,fail,blocked,needs-human", "the outcome vocabulary changed");
const impossible = Object.entries(REASON_CATALOGUE).filter(([, v]) => v.class === "impossible").map(([k]) => k).sort();
assert.deepEqual(impossible, ["EXTERNAL_CHANNEL", "HUMAN_SIGNOFF", "OUTSIDE_LOCAL_ENVIRONMENT"]);
assert.ok(Object.values(REASON_CATALOGUE).every((v) => v.class === "impossible" || v.class === "gap"));
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# No static sibling import was added to the runner (the copy-helper tests copy only qa-run.mjs and the guard).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# No forbidden .claude/PRPs reference introduced by this phase's files outside the quoted-prohibition idiom.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs docs/api-reference.md docs/domain/glossary.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 DRY-RUN END-TO-END

Gate on the real `run` mode; it fails on the unmodified tree (`OUTSIDE_LOCAL_ENVIRONMENT` is refused `PLAN_ENTRY_INVALID`, so the counts differ and the counters are absent) and passes once all tasks are done. The fixture mirrors `makeFixture` and `reportText` in `scripts/validate/checks/qa-run-classification.test.mjs` (lines 654-704), with a loopback server answering every request `500`. Expected arithmetic: needs-human steps impossible 3 + 2 + 1 = 6, gap 4; case 5 is `blocked` and case 6 is `fail`, so neither counts. The static suite then runs, after the node command, never overlapped with it; the `28 passed, 0 failed (28 checks run)` line is printed by `scripts/validate/index.mjs` at line 130 as `${passCount} passed, ${failCount} failed (${results.length} checks run)`.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { validateResults } from "./scripts/validate/checks/qa-run-contract.mjs";
const server = createServer((req, res) => { res.writeHead(500, { "content-type": "text/plain" }); res.end("boom"); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const root = mkdtempSync(join(tmpdir(), "relay-p1l3-"));
try {
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const runRel = "PRPs/reports/feat/qa-run/20261010T101010101Z";
  const runDir = join(root, ...runRel.split("/"));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  const titles = ["Real inbox", "Device", "Signoff", "Gap", "Known defect", "Product differs"];
  const block = (t, i) => ["### Case " + (i + 1), "**Title:** " + t, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", "2. Check the result.", ""].join("\n");
  writeFileSync(join(root, "PRPs", "reports", "feat", "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + titles.map(block).join("\n") + "\n## Notes\n\nnone\n");
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl, roles: {} }));
  writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: [
    { index: 1, title: titles[0], class: "human-by-nature", reason_code: "EXTERNAL_CHANNEL", objective_steps: 3 },
    { index: 2, title: titles[1], class: "human-by-nature", reason_code: "OUTSIDE_LOCAL_ENVIRONMENT", objective_steps: 2 },
    { index: 3, title: titles[2], class: "human-by-nature", reason_code: "HUMAN_SIGNOFF", objective_steps: 1 },
    { index: 4, title: titles[3], class: "needs-a-new-driver", reason_code: "VOCABULARY_GAP", objective_steps: 4 },
    { index: 5, title: titles[4], class: "blocked-by-product", reason_code: "PRODUCT_DEFECT", objective_steps: 5 },
    { index: 6, title: titles[5], class: "automatable", driver: "http", role: null, state: "none", steps: [{ action: "request", method: "GET", path: "/boom", expect_status: 200 }] },
  ] }));
  const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", "feat", "--run-dir", runRel], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  const code = await new Promise((r) => child.on("close", r));
  assert.equal(code, 0, err);
  const res = JSON.parse(readFileSync(join(runDir, "results.json"), "utf8"));
  assert.deepEqual(res.counts, { pass: 0, fail: 1, blocked: 1, "needs-human": 4 });
  assert.equal(res.needs_human_impossible, 6);
  assert.equal(res.needs_human_gap, 4);
  const by = Object.fromEntries(res.cases.map((c) => [c.index, c]));
  assert.equal(by[2].reason_code, "OUTSIDE_LOCAL_ENVIRONMENT");
  assert.equal(by[3].reason_code, "HUMAN_SIGNOFF");
  assert.equal(by[5].outcome, "blocked");
  assert.equal(by[5].reason_code, "PRODUCT_DEFECT");
  assert.equal(by[6].outcome, "fail", "a product that diverges from the report ends fail, not declined");
  assert.ok(Array.isArray(by[6].evidence) && by[6].evidence.length > 0, "the failed case carries evidence");
  assert.equal(by[6].steps[0].result, "failed");
  assert.equal(res.classification.driver_executed, 1);
  assert.ok(out.includes("Needs-human steps: impossible=6 gap=4"), out);
  assert.deepEqual(validateResults(res), [], "the run satisfies the results contract");
} finally {
  server.close();
  rmSync(root, { recursive: true, force: true });
}
'
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
```

The corpus gate runs last and alone (about five minutes). It runs the corpus exactly as `node --test "scripts/validate/**/*.test.mjs"` (the glob is passed to `node` unexpanded, never narrowed) with the TAP reporter, and exits 0 only when every failing test belongs to the allowlist below. It exits 1 on any other failing test, on a runner crash, on a cancelled test, on output it cannot parse or whose counters disagree with its result lines, and when `node_modules/playwright` is missing from the worktree. The reporter shape was observed on this host (Node v24.15.0): the output is flat, a passing file produces no file-level line, a failing test names its file only in the `location:` line of its YAML block (an absolute path with doubled backslashes, then `:line:col`), and an import-time crash is one `not ok` whose title is the file path. The gate therefore attributes each failure to its file from `location:`, and takes the title as the path only for the import-crash form. It is a regression gate: on a provisioned tree before the phase it passes (the baseline is green), and after the phase it passes with exactly one allowlisted failure until the test pair updates that assertion, after which it passes with none. On a worktree without `node_modules` it fails by design, naming 12 environment-failing files (58 failing tests) in the baseline.

Allowlist (the only failing test the gate accepts; it is stricter than a file-level allowlist because it names the test as well as the file):

| File | Test (title prefix) | Exact assertion | Why this phase makes it stale |
|------|---------------------|-----------------|-------------------------------|
| `scripts/validate/checks/qa-run-classification.test.mjs` | `AC-6 the catalogue holds the seven codes the PRD names plus the vocabulary-gap code, and not the omitted-case marker` | line 97: `assert.deepEqual(Object.keys(REASON_CATALOGUE).sort(), [...AC6_CODES, 'VOCABULARY_GAP'].sort())` | it pins the exact key set of the eight-code catalogue; PRD AC-1 adds four codes, so the catalogue now holds twelve. The test pair updates it (`EXISTING_TEST_UPDATED`) |

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, relative, sep } from "node:path";
const ALLOWED = [
  { file: "scripts/validate/checks/qa-run-classification.test.mjs", title: "AC-6 the catalogue holds the seven codes the PRD names plus the vocabulary-gap code, and not the omitted-case marker" },
];
const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };
if (!existsSync("node_modules/playwright/package.json")) fail("node_modules/playwright is not resolvable from the worktree root; the qa-run test files spawn a runner copy with NODE_PATH set to <root>/node_modules, so provision it first (npm install, or a directory junction to the main checkout node_modules)");
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
if (other.length > 0) fail(other.length + " failing test(s) outside the allowlist, in " + [...new Set(other.map((f) => f.file))].join(", ") + ": " + other.slice(0, 5).map((f) => f.title).join(" | "));
console.log("PASS: " + counters.pass + " passed, " + failures.length + " allowlisted failure(s), none outside the allowlist");
'
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given the reason-code catalogue, when it is read, every code carries a class: `impossible` for `EXTERNAL_CHANNEL` (redefined as a real external channel with no declared local source), `OUTSIDE_LOCAL_ENVIRONMENT` (production or a physical device) and `HUMAN_SIGNOFF` (a step the report reserves for a person), and `gap` for every other code, including `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `UNGROUNDABLE_AFTER_INTERACTION`, `VISUAL_JUDGEMENT` and `JUDGEMENT_UNCERTAIN`; `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED` (outcome `blocked`) exist, and a plan entry may not declare them.
- **AC-A2 (PRD AC-1):** Given a run that finishes, `results.json` reports `needs_human_impossible` and `needs_human_gap` step counts beside the unchanged four-key `counts`, and the run prints a `Needs-human steps` summary line with the same two numbers.
- **AC-A3 (PRD AC-2):** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, it defines an objective step to include judgment and channel steps, defines the metric denominator as every objective step not of impossible class, and states that a pre-run table is frozen under this convention before any counted run.
- **AC-A4 (PRD AC-3):** Given a plan entry for a case whose expected behaviour the product does not show, when the case runs, it ends `fail` with evidence naming the failing step; `PRODUCT_DEFECT` is accepted only for a case that cannot start, and it is class `gap`.
- **AC-A5 (PRD AC-1, AC-2):** Given `scripts/validate/checks/qa-run-contract.mjs`, when it runs on the real tree, it passes, and it reports a finding when a catalogue entry carries the wrong class, when the command's catalogue table disagrees with the runner on a code's outcome or class, when the counting convention or the counters are missing from the doc, or when a stored counter disagrees with what the cases recompute to; results written before the counters existed stay valid.
- **AC-A6 (PRD AC-24):** `npm run validate` passes with exactly 28 checks (`qa-run-contract` is extended, no check is added), and the corpus `node --test "scripts/validate/**/*.test.mjs"`, run in a worktree that has `node_modules`, fails in no test outside the allowlist named in `## Validation Commands` and `## Notes`. That allowlist holds one test, the exact-key-set assertion of `qa-run-classification.test.mjs`, which the test pair updates; the corpus is fully green once it has.
- **AC-A7 (PRD AC-1):** Given `docs/api-reference.md` and `docs/domain/glossary.md`, when they are read, they name the twelve catalogue codes, the two classes and the two counters, and the API reference lists the new exports.
- **AC-A8 (PRD AC-1, AC-24):** Given the `documentation/` places that existing site tests bind to the catalogue, when they are read, the `/relay-qa-run` entry of `reference/commands.html` lists the nine declarable codes, the three runner-owned codes, the two reason classes and the two counters; the `qa-run-contract` section of `reference/validation-checks.html` states the eleven required codes, the twelve-code catalogue and the new pins; `changelog.html` carries an `Unreleased` entry that lists the change; and `qa-run-release-pages.test.mjs`, `qa-run-release-site.test.mjs` and `qa-run-release-cut.test.mjs` pass unedited. No page is added, and NAV, the search index and the plugin version are unchanged.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| One existing assertion pins the catalogue's exact key set and goes stale by design (`qa-run-classification.test.mjs:97`) | H | L | The Implementer cannot edit tests (R-X). The test pair updates it as `EXISTING_TEST_UPDATED`; the corpus gate allowlists exactly that test (file and title) and nothing else. A reference analysis of every test file the corpus runs found no other assertion the change breaks, provided the wording constraints written into Tasks 3, 5, 7, 8 and 9 are respected |
| Existing site tests bind `documentation/` to the live catalogue (`qa-run-release-pages.test.mjs:355-360`, `qa-run-release-site.test.mjs:157-168`, `qa-run-release-cut.test.mjs:112-134`) | H | M | Tasks 7 to 9 move exactly those places with the catalogue in the same phase; each task's VALIDATE runs the existing test that reads its page, filtered, and requires a pass. The catalogue has no headroom for a thirteenth code (the tests' word lists stop at "twelve" and "twelfth"), which a later phase must remember |
| The corpus is not green in a worktree without `node_modules` (baseline observed: 58 failing tests in 12 `qa-run-*` test files, because they spawn a runner copy with `NODE_PATH` set to `<root>/node_modules`) | H | M | The gate fails fast with the cause when `node_modules/playwright` is absent. The orchestrator provisions it (`npm install`, or a junction to the main checkout's `node_modules`; the directory is git-ignored). The alternative, allowlisting those 12 files, would blind the gate to exactly the runner's own tests and is not taken |
| A new documentation sentence breaks a pinned sentence or id rule (the single "closed catalogue" sentence, the single "derived by the runner" sentence, the `Unreleased` ids, a stray `<h2`) | M | M | Tasks 7 and 9 state each rule; their VALIDATE commands run the tests that pin them |
| The reason class and the case class are both called `class`, so a reader or a later phase confuses them | M | M | The catalogue key follows the PRD wording (`class`); `reasonClassOf` is the only reader; the doc states that the reason class is not the `class` of a case; the counters derive from `reason_code` and no second `class` is stamped on results entries |
| The step-count rule is ambiguous for a partial remainder (the runner appends one synthetic `human` step whatever the remainder holds) | M | L | The rule is `objective_steps` less steps run, falling back to `not-run`/`human` steps when none is declared; it reproduces the dogfood's numerators (T-1: 8 declared, 6 run, 2 owed); the frozen pre-run table, not the counters, remains the authority for the metric |
| The `PRODUCT_DEFECT` narrowing is not mechanically enforceable (the runner never infers whether a case can start) | M | M | It is a planner rule in the doc, pinned by phrase in `qa-run-contract`; the Phase 9 dogfood reads every declined case against the re-frozen table |
| New runner code disturbs a source-text pin (a second `// WRITE-SITE`, `writeFileSync(` or `renameSync(`, a stray `outcome:` literal, an edited mutation anchor such as the `keepSteps` line, a second `export const REASON_CATALOGUE`) | M | H | Tasks 1 and 2 list the forbidden strings; the catalogue uses `disposition`; Level 2 runs the real-tree contract; Level 1 pins the frozen files |
| A doc edit breaks a doc-reading test (the first JSON block with a `states` key, the phrase `a CLI, a database query`, the table pattern that reads the first two columns) | M | M | Task 3 names each pin, adds no JSON block and keeps the first two columns; its VALIDATE binds the table to the runner |
| The validation commands were derived by reading the tree, not executed | M | L | They reuse the fixture shape of a shipped, approved plan and of `qa-run-classification.test.mjs`; the Implementer runs each against the pre-change tree first and expects the stated failure |
| Scope size across nine phases (PRD risk) | H | M | This phase is one lane on `qa-run.mjs`, independently testable, and adds no new step or mode |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Test-pair follow-up.** New tests required (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A5): catalogue membership, classes and the closed impossible set; `reasonClassOf`; the runner-owned refusals (the `PARTIAL_REMAINDER` sentence unchanged, the new sentence for the other two); `summarizeNeedsHuman` arithmetic for a declining entry, a partial remainder, a run-time `not-run` remainder, a `blocked` case and an uncatalogued code; an end-to-end `run` fixture with declining entries of every impossible code plus a product-defect `fail`; `validateResults` tolerance of older results and rejection of a wrong counter; the new `qa-run-contract` pins and their invisibility to a caller that does not opt in. The one existing assertion that goes stale, and the only entry of the corpus gate's allowlist, is required `EXISTING_TEST_UPDATED` follow-up for the test pair (never an Implementer edit): `scripts/validate/checks/qa-run-classification.test.mjs`, the test titled "AC-6 the catalogue holds the seven codes the PRD names plus the vocabulary-gap code, and not the omitted-case marker", line 97, `assert.deepEqual(Object.keys(REASON_CATALOGUE).sort(), [...AC6_CODES, 'VOCABULARY_GAP'].sort())`, because it pins the eight-code key set and the catalogue now holds twelve. The same file's `AC6_CODES` and `DECLINES_TO` constants should also gain the four new codes so that they are exercised (new coverage, not a stale assertion). No other allowlisted file exists. Existing assertions the design keeps true: `qa-run-classification.test.mjs:457-465` (a doc naming no code is flagged once per code and class), `:545-552` (the table's first two columns equal the catalogue keys and outcomes), `qa-run-case-vocabulary.test.mjs:235` (`summarizeEntries([])` shape), the `QA run finished:` stdout line, and the `PARTIAL_REMAINDER` refusal sentence. The test pair reads the Implementer's diff for anything this analysis missed.
- **Corpus gate, allowlist and documentation sync (orchestrator decision).** `qa-run-release-pages.test.mjs` (lines 355, 359, 360, 378) and `qa-run-release-site.test.mjs` (lines 157, 162, 168) compare `reference/commands.html`, `reference/validation-checks.html` and `docs/api-reference.md` with `Object.keys(REASON_CATALOGUE)`, and `qa-run-release-cut.test.mjs` (lines 112-134) reads the `Unreleased` block. Whatever an existing test binds to the live catalogue therefore moves with the catalogue in this phase (Tasks 5, 7, 8 and 9), so each phase can close with a green corpus; only the version bump, the release heading, NAV, the search index and the other release pages stay in Phase 8. Level 3 ends with a corpus gate on a named allowlist, run last and alone after `npm run validate`: it runs `node --test "scripts/validate/**/*.test.mjs"` with the glob never narrowed and exits 0 only when every failing test is on the allowlist. The allowlist is exactly one test, `qa-run-classification.test.mjs` line 97 (see the test-pair follow-up above for the assertion and the reason); it names the test as well as the file, which is stricter than a file-level allowlist and implies it. The gate exits 1 on any other failing test or file, on a runner crash, on a cancelled test, on output it cannot parse and on a missing `node_modules/playwright`. Baseline caveat: the corpus is green only where `node_modules` exists (see Environment); the baseline run in this unprovisioned worktree failed 58 tests in 12 `qa-run-*` test files for that reason alone, so the orchestrator must provision `node_modules` in the worktree or the gate will stop the phase by design. `npm run validate` and the corpus run one after the other, never overlapped.
- **Design decisions made here.** (1) The catalogue key is `class`, following the PRD's AC-1 wording, and `REASON_CLASSES` plus `reasonClassOf` keep it distinct from the case `class`; the counters derive from `reason_code` and add no per-entry key. (2) `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED` are runner-owned like `PARTIAL_REMAINDER`: a plan can no more declare them than it can declare a verdict or a refusal that only the runner produces; Phases 4 and 5 will produce them. (3) The step-count rule (declared `objective_steps` less executed steps) reproduces the dogfood's per-case numerators: T-3 owes 4 and S-3 owes 5 under `EXTERNAL_CHANNEL`, T-1 owes 2 (8 declared, 6 run) and S-1 owes 4 (7 declared, 3 run) under `PARTIAL_REMAINDER`. (4) `summarizeClassification` and its class-gated `objective_steps_total` are left alone: the new denominator is a definition applied by the Phase 9 re-freeze, not a change to what the runner sums. (5) The new summary line follows the `Partially executed` line; the pinned `QA run finished:` line is unchanged.
- **Scope of docs.** `docs/decisions.md` is not edited (so no `documentation/governance/decisions.html` mirror is involved). Under `documentation/` only `reference/commands.html`, `reference/validation-checks.html` and `changelog.html` change (Tasks 7 to 9), following `documentation/AGENTS.md`: no page is added, so NAV (`assets/js/app.js`) and the search index are untouched, and `plugin.json` keeps its version. `reference/scripts.html` still says that only `PARTIAL_REMAINDER` is runner-owned; no test reads that claim and the Phase 8 release cut refreshes the page. The `docs_sync` pass at implement time finds Tasks 5 and 6 already done.
- **Environment.** The host is Windows with Git Bash. Every command that runs git, node or npm carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. Keep LF line endings in every edited file (the `line-endings` check). A worktree has no `node_modules`: `npm run validate` resolves its packages from the main checkout by directory walk, but the `qa-run` test files set `NODE_PATH` to `<worktree>/node_modules`, so the corpus gate needs `node_modules/playwright` inside the worktree (provision it with `npm install` or a directory junction to the main checkout's `node_modules`; `node_modules/` is git-ignored, so this dirties nothing).
- **Research.** `research-codebase` located the catalogue, validators, summarizers, results construction, the command-doc section and the contract check's structure, and hit its search cap (it did not examine the helper definitions or the other test files); the gaps were closed by direct reads of `qa-run.mjs`, `relay-qa-run.md`, `qa-run-contract.mjs`, the cited test lines and a separate reference sweep of every file that names a catalogue code. `research-web` found vendor conventions only (Katalon's "Manual Only" status, Zephyr Twister's filtered versus skipped split, Allure's fixed status set) and no source for an impossible-versus-gap split of non-executed steps or for whether not-automatable cases enter an automation-coverage denominator; the split and the denominator rule are therefore the PRD's own design (operator directive of 2026-10-20), not an industry convention. The Phase 8 dogfood report of the previous work was read as evidence. A later agent ran the corpus once on the unmodified tree (Node v24.15.0, 2154 tests, 281 s) and analysed every test file the corpus runs against the described change; its findings are the allowlist, the TAP shape recorded in Level 3 and the placement constraints written into Tasks 3, 5, 7, 8 and 9. The v2 PRD (`qa-runner-grounding-vocabulary-v2.prd.md`) was read in this worktree for the Decision Gate.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Tasks 1 to 9 are gates that fail before the work (no `REASON_CLASSES`; no `summarizeNeedsHuman`; no Class column; the mutation anchors absent from the doc; the API row and glossary naming none of the new codes; the commands, validation-checks and changelog pages still describing eight codes and a placeholder). The Level 3 end-to-end command fails before the work (`OUTSIDE_LOCAL_ENVIRONMENT` is refused). The Level 1 guards, the Level 2 greps, the `npm run validate` line and the corpus gate pass on the unmodified, provisioned tree by design, as regression guards; the corpus gate fails by design when `node_modules/playwright` is absent. The inline corpus-gate parser is adapted from one that an agent validated against the real baseline TAP output and against a deliberate failing-test experiment; the inline version itself has not been run.

*Generated: 2026-10-21*
*Approved: 2026-10-21*
*Implemented: 2026-10-21*
*Status: IMPLEMENTED*
