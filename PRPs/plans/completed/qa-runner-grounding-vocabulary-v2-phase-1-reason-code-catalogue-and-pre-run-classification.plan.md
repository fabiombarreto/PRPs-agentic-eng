# Feature: Reason-code catalogue and pre-run classification (Phase 1 of qa-runner-grounding-vocabulary-v2)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the `qa-run.mjs` exports, the `plan.json` entry contract, the `results.json` shape, the `qa-run-contract` validation check); an existing command doc (`relay-qa-run.md`) rewritten around a script-validated vocabulary; cross-cutting artifact (a plan downstream stages consume)
- Decisions found:
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log "Classification home": a `class` field per case in `plan.json`, validated by the runner against a closed catalogue, with the initial 14-case table frozen in the PRD; the runner validates and echoes, it does not infer
  - Same PRD, Decisions Log "Classification reading": classify against the runner as of 0.45.0, so the automatable class is 3 cases; the needs-a-new-driver cases count only in objective-step coverage
  - Same PRD, Decisions Log "Validation checks": extend `qa-run-contract` and `auth-secrecy`, the count stays 28
  - Same PRD, Decisions Log "Frozen surfaces": the review-loop files, `capture.mjs` and `/relay-qa-report` stay byte-identical (AC-14)
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "Partial plans and the outcome vocabulary" (cited by this PRD's Decision Gate): a partially executed case stays `needs-human` with `PARTIAL_REMAINDER` and never counts toward the driver-executed rate; no fifth outcome
  - `docs/decisions.md` [2026-09-25] (line 2435) registering the manual-QA runner: the outcome vocabulary is a closed set; a case no driver can perform is `needs-human` with its steps shown, never skipped and never reported as passed; the local-only guard is permanent
  - `docs/decisions.md` [2026-07-09] (line 680): every Validation command and per-task `VALIDATE:` must carry real exit-code semantics
  - `docs/decisions.md` [2026-07-10] (line 692) and [2026-08-03] (line 1445): R-X strict, the Implementer authors zero test files; the test-pair-deferral branch of `R-COH-VALIDATE-FRAMEWORK-MISMATCH`
  - `docs/decisions.md` [2026-08-04] (line 1501) and [2026-08-20] (line 2155): a validation pattern must be grounded in text the plan can demonstrate; a `VALIDATE` exercises the effect rather than the declaration
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": class names, catalogued codes and step counts are structural; every runner-composed reason is a fixed sentence and any echoed planner value is bounded
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing test is edited; the design leaves every pinned assertion true by construction
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic", applied by analogy: the class is declared and frozen, never inferred by the runner
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - Command versus script separation: the planning agent proposes plan entries; the script validates, executes and reports
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/` and is written only through `writeRunFile`
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form
  - `qa-run-contract` invariants stay true: the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` — Implementation Phases row 1: "Reason-code catalogue and pre-run classification" — Goal: every non-executed case names its cause, and the metric's classification is a validated field instead of prose — Success signal: a fixture plan with one case per class yields the declared codes and a correct per-class summary; a code outside the catalogue is `PLAN_ENTRY_INVALID`; the four-key `counts` partition is unchanged.

## Summary

This phase gives `/relay-qa-run` a closed catalogue of reason codes and a pre-run classification of every case, both validated and reported by the runner. `qa-run.mjs` gains one frozen catalogue (the PRD's seven codes plus one gap code), the four case classes, and a small set of pure, exported functions that validate the new `class`, `reason_code` and `objective_steps` plan-entry fields, build a declined case, and summarize the classification. A plan entry that declines a case (a `class` and a catalogued `reason_code`, no steps) now yields `needs-human` or `blocked` with that code and the manual steps verbatim; a code or class outside the closed sets is `PLAN_ENTRY_INVALID` naming it. `results.json` gains a `class` and an `objective_steps` value per case and one top-level `classification` block (per-class counts, the driver-executed count and rate over the automatable class, objective steps executed and total over the first two classes). The four-key `counts` partition, `summarizeEntries` and every pinned stdout line stay untouched. `qa-run-contract` is extended, not duplicated, to pin the catalogue, the classes, the new results rules and a marked plan-entry example in the command doc, and the command doc is rewritten so the planner declines and classifies every case instead of omitting it and records the frozen 14-case table.

## User Story

As the operator of relay's human validation gate
I want every case the runner does not execute to carry its pre-declared class and a specific catalogued reason
So that I can tell a runner limitation from a case that is human by nature, and execute by hand only what the runner could not

## Problem Statement

`/relay-qa-run` returns about 13 of 14 reachable cases as `needs-human`, and most of them fall into the generic `NO_PLAN_ENTRY` because the planner omits the cases it cannot map (`relay-qa-run.md` tells it to omit them). The code therefore carries no cause: a case that is human by nature, a case that needs a step the vocabulary lacks and a product defect all look identical. There is also no classification of the cases before the run, so the amended metrics (driver-executed rate over the automatable class, objective-step coverage, classification fidelity) have no validated field to be read from.

## Solution Statement

Plan side and runner side only. Define the closed catalogue and the four classes once in `qa-run.mjs`; add pure validators and summarizers; let a plan entry decline a case with a catalogued code before any side effect; stamp every results entry with its class and objective-step total; add one `classification` block to `results.json`; extend `qa-run-contract` (an opt-in `requireCatalogue` flag, tolerant `validateResults` rules, a marked plan-entry example validated by the script's own validator) rather than adding a 29th check; rewrite the command doc's planning instructions around "write one entry per case" and record the frozen classification table. How objective steps are counted (the PRD's Open Question 5) is decided here: declared in the plan entry as `objective_steps`, floored at the number of executable steps, audited by Phase 8 against its frozen pre-run table.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | none (row 1 of 8; `Depends` is `-`; shares `lane:qa-run` with phases 2-6, so it runs first and serially) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` lines 227 (row 1), 240-243 (Phase Details), 106-107 (AC-6, AC-7), 114 (AC-14), 117 (AC-17), 127 (Open Question 5) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` | 86-95, 106-107, 127, 198, 240-243 | the frozen classification table, AC-6, AC-7, the objective-step Open Question, the "Classification lives in `plan.json`" architecture note and the Phase 1 scope |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 791-798 and 999-1002 | the `blocked`/`needsHuman` helpers and the `{ code, reason } \| null` validator shape the new functions reuse |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1167-1180 | `summarizeEntries`, the function this phase deliberately does not change |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2437-2460 | `executeCase`: plan lookup, `NO_PLAN_ENTRY`, title and driver checks; the insertion site of the decline branch |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2607-2611 and 2664-2755 | plan loading, the per-case loop (not edited) and the `finally` block that assembles `results` |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 12-21, 135-153, 216-226, 272-284, 355-372, 425-446 | the planning instructions, grounding rules, partial-plan and honesty rules and the final output surface being rewritten |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 14-31, 51-115, 121-182, 283-294 | `validateResults`, `checkQaRunContract`, the example validation and `runQaRunContractCheck` being extended |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 452-459 and 534-538 | read-only: mutation anchors in `qa-run.mjs` (`return { outcome: 'pass', ...` and `const keepSteps = ...`) that must stay unique and unedited |
| P1 | `scripts/validate/checks/qa-run-captured-seeds.test.mjs` | 540-547 | read-only: the first fenced `json` block of the command doc with a top-level `states` key is parsed; no new block may precede the declaration example with that key |
| P1 | `scripts/validate/checks/qa-run-query.test.mjs` | 1143-1149 | read-only: the command doc must not contain the phrase `a CLI, a database query` |
| P1 | `scripts/validate/checks/qa-run-contract.test.mjs` | 64-73 and 143-153 | read-only: `check()` callers pass no new flag; one message must keep the exact text `is outside the closed vocabulary` and be produced once |
| P1 | `docs/anti-patterns.md` | 34-39 | the secret-leak rule governing everything the runner writes into `results.json` |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:791-798
/** @param {string} code @param {string} reason @param {string[]} [evidence] @returns {CaseResult} */
const blocked = (code, reason, evidence = []) => ({ outcome: 'blocked', reason_code: code, reason, evidence });
/** @param {string} code @param {string} reason @returns {CaseResult} */
const needsHuman = (code, reason) => ({ outcome: 'needs-human', reason_code: code, reason, evidence: [] });

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
const isStr = (/** @type {any} */ v) => typeof v === 'string';
const isObj = (/** @type {any} */ v) => v !== null && typeof v === 'object' && !Array.isArray(v);
```
Copied by Task 1 (a declined case is built through `blocked(...)` / `needsHuman(...)`, so no new `outcome:` literal appears in the script and the contract's outcome scan stays quiet).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:999-1002
export function validateStep(driver, step) {
  const r = stepRules(driver, step);
  return 'why' in r ? { code: 'PLAN_ENTRY_INVALID', reason: r.why } : null;
}
```
Copied by Task 1 (`validatePlanClassification` returns the same `{ code: 'PLAN_ENTRY_INVALID', reason } | null` shape so `executeCase` and the contract can treat it exactly like a step refusal).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1167-1180
/**
 * The four-key partition plus the two beside-the-rate counters.
 * @param {{ outcome: string, reason_code?: string | null }[]} entries
 * @returns {{ counts: Record<string, number>, record_resolved: number, partially_executed: number }}
 */
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
Copied by Task 1 (`summarizeClassification` is a new sibling pure function over the same entries; `summarizeEntries` itself is NOT edited because `qa-run-case-vocabulary.test.mjs:235` deep-equals its exact return shape).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:56-62
/** @type {Promise<any> | null} */
let queryModulePromise = null;
/** @returns {Promise<any>} */
async function loadQueryModule() {
  queryModulePromise ??= import('./qa-query.mjs').catch(() => null);
  return queryModulePromise;
}
```
Copied by Task 1 (the no-static-sibling-import rule: every new helper stays inside `qa-run.mjs`; any sibling module would have to be loaded lazily like this one, because the copy-helper tests copy only `qa-run.mjs` and `auth-local-guard.mjs`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2449-2460
  const p = planByIndex.get(kase.index);
  if (!p) return { result: needsHuman('NO_PLAN_ENTRY', 'no plan entry covers this case; the manual steps are reproduced verbatim'), driver: null, role: null };
  const driver = isStr(p.driver) ? p.driver : null;
  const role = isStr(p.role) ? p.role : null;
  /** @param {CaseResult} result */
  const out = (result) => ({ result, driver, role });
  if (p.title !== kase.title) return out(needsHuman('PLAN_ENTRY_INVALID', "the plan entry's title does not match the report's title"));
  if (driver === null) return out(needsHuman('PLAN_ENTRY_INVALID', 'the plan entry names no driver'));
  if (driver !== 'http' && driver !== 'browser') {
    return out(needsHuman('NO_ACTIVE_DRIVER', `no active driver handles ${JSON.stringify(driver)}; the manual steps are reproduced verbatim`));
  }
  if (!Array.isArray(p.steps) || p.steps.length === 0) return out(needsHuman('PLAN_ENTRY_INVALID', 'the plan entry carries no steps'));
```
Copied by Task 2 (the decline branch goes between the title check and the `driver === null` check, so it runs before every side effect and before the target is required; the `NO_PLAN_ENTRY` line is left byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2721-2722
    const finished = now();
    const { counts, record_resolved: recordResolved, partially_executed: partiallyExecuted } = summarizeEntries(entries);
```
Copied by Task 2 (the per-entry class stamp and the `classification` summary are computed around this destructure, inside the `finally`, so padded `RUN_ABORTED` entries are stamped too).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2737-2755
    const results = {
      schema_version: 1,
      feature,
      run_id: basename(runDirAbs),
      report_path: reportRel,
      report_sha256_before: shaBefore,
      report_sha256_after: shaAfter,
      started_at: runStart,
      finished_at: finished,
      duration_ms: Math.max(0, Date.parse(finished) - Date.parse(runStart)),
      base_url_origin: target ? target.origin : null,
      counts,
      record_resolved: recordResolved,
      partially_executed: partiallyExecuted,
      aborted,
      warnings,
      human_gate: { status: 'open', review_file: reportRel },
      cases: entries,
    };
```
Copied by Task 2 (`classification` is added as a new key right after `partially_executed`; the object is still written once through the existing `writeRunFile` call, so no new write site exists).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:80-85
    const partialCases = cases.filter((c) => c !== null && typeof c === 'object' && c.reason_code === 'PARTIAL_REMAINDER');
    if (obj.partially_executed !== undefined) {
      if (!Number.isInteger(obj.partially_executed) || obj.partially_executed < 0 || obj.partially_executed !== partialCases.length) {
        msgs.push(`partially_executed (${JSON.stringify(obj.partially_executed)}) does not equal the number of PARTIAL_REMAINDER cases (${partialCases.length})`);
      }
    }
```
Copied by Task 3 (the optional-key rule shape: a key that older tracked `results.json` files lack is validated only when present, in the same message style).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:162-181
    // Each literal step example in the doc must validate against the runner's own per-step validator.
    /** @type {Set<string>} */ const seen = new Set();
    for (const m of commandText.matchAll(STEP_EXAMPLE_PATTERN)) {
      const driver = m[1];
      seen.add(driver);
      /** @type {any} */ let step;
      try {
        step = JSON.parse(m[2]);
      } catch {
        add(`the ${driver} step example in the runner command is not valid JSON`, COMMAND_FILE);
        continue;
      }
      const bad = validateStep(driver, step);
      if (bad) add(`the ${driver} step example in the runner command does not validate: ${bad.reason}`, COMMAND_FILE);
    }
    if (requireStepExamples) {
      for (const driver of STEP_EXAMPLE_DRIVERS) {
        if (!seen.has(driver)) add(`the runner command must carry a literal ${driver} step example marked <!-- qa-step-example driver=${driver} -->`, COMMAND_FILE);
      }
    }
```
Copied by Task 3 (the marked plan-entry examples are extracted and validated the same way, with a second pattern constant, and the `requireCatalogue` opt-in flag mirrors `requireStepExamples` exactly so fixture-based callers are unaffected).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:283-294
/** @returns {{ name: string, ok: boolean, findings: Finding[] }} */
export function runQaRunContractCheck() {
  return checkQaRunContract({
    scriptText: readOrNull(SCRIPT_FILE),
    commandText: readOrNull(COMMAND_FILE),
    seedScriptText: readOrNull(SEED_SCRIPT_FILE),
    seedCommandText: readOrNull(SEED_COMMAND_FILE),
    queryModuleText: readOrNull(QUERY_MODULE_FILE),
    results: walkResults(),
    requireStepExamples: true,
  });
}
```
Copied by Task 3 (the real-tree entry point is the only caller that passes `requireCatalogue: true`).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:147-149
For each returned case, decide from the case's manual steps alone whether they map
onto the closed vocabulary below. Write ONLY the cases that do, with the `Write`
tool, into `<RUN_DIR>/plan.json`:
```
Copied by Task 4 (this "write ONLY the cases that do" instruction is the cause of `NO_PLAN_ENTRY` on human-by-nature cases and is replaced by "one entry per case").

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:152
{ "schema_version": 1, "cases": [ { "index": 1, "title": "<copied exactly>", "driver": "http", "role": null, "state": "none", "steps": [] } ] }
```
Copied by Task 4 (the unmarked plan-shape illustration gains `class`; it is not a `qa-step-example` block and carries no top-level `states` key).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:272-279
Partial plans: when a report's objective steps are separable from its subjective or
outward-effect ones, the plan entry may carry
`"human_remainder": { "reason": "<why the rest is human>" }`. The objective steps
still need at least one expectation. When every planned step passes, the case is
`needs-human` with `PARTIAL_REMAINDER`, keeps its objective evidence and reproduces
the manual steps verbatim; when an objective step fails, the case is `fail`.
Partially executed cases are counted in `partially_executed`, reported beside
`record_resolved`, and never in the driver-executed rate.
```
Copied by Task 4 (the prose register for the new classification and catalogue subsection, which sits directly after the "Per-step results" paragraph that follows this one).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:355-363
Honesty rules:

- Omit any case that needs an email inbox, SMS, a physical device, a third-party
  payment, a subjective visual judgment, a CLI or any action outside the
  vocabulary. The script records it `needs-human` with the steps verbatim.
- Plan a case that needs a database read only when its verification maps onto a
  `SELECT` against a source already named in `PRPs/auth/qa-seed.json`
  `query_sources`; read the source names from that file, never invent one, never
  write a connection string or argv, and omit the case when no source is declared.
```
Copied by Task 4 (both "omit" instructions become "decline with a catalogued code").

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the single definition of the catalogue and the classes; the pure validate/decline/summarize functions; the decline branch in `executeCase`; the per-entry class stamp and the `classification` block in `results.json` |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | pin the catalogue, the class set, the new results rules and the doc's marked plan-entry examples under an opt-in `requireCatalogue` flag; widen the import from the runner; no new check is registered (the count stays 28) |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | one entry per case; declining entries; the four classes, the frozen 14-case table, the catalogue table, the objective-step rule and the new results fields; both "omit" instructions rewritten |

## NOT Building (Scope Limits)

- Grounding stability, `GROUND_UNSTABLE`, inline-text candidates and the `ground` usage text (Phase 2); redaction precision, run-evidence privacy and `auth-secrecy` (Phase 3); the session-less request, `expect_value`, `expect_not_visible` and `expect_state` (Phase 4); the grounding prefix (Phase 5); `expect_requests`, the bounded re-mint and the `--refresh` statement (Phase 6); the release cut and the `documentation/` pages (Phase 7); the dogfood (Phase 8).
- A fifth outcome. The vocabulary stays `pass`, `fail`, `blocked`, `needs-human`; causes are reason codes and counters, and a partially executed case never counts toward the driver-executed rate.
- Any inference of `class` or of the objective-step count by the runner. The runner validates and echoes what the plan declares; it does not read the report to classify.
- Any cross-validation between a case's `class` and its `reason_code`, and any change to the executed outcome of a case because of its class: the class is the pre-run classification and is independent of the result.
- A catalogue of every runtime halt code (`SESSION_UNAVAILABLE`, `FAILED_PROBE_*`, `QUERY_*`, `API_*`, `TARGET_UNDECLARED` and so on). They remain specific runner codes outside the catalogue; the catalogue is the plan-facing closed list.
- Any change to `summarizeEntries`, `applyPartialRemainder`, the `OUTCOMES` literal, the per-case loop, the `keepSteps` line, the `NO_PLAN_ENTRY` line or its text, or the `run` summary lines on stdout.
- A new validation check, a new sibling module, or any static import in `qa-run.mjs`.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-14), and any change to a report.
- Any edit under `documentation/` and any hand edit of `docs/api-reference.md` (the `docs_sync` pass owns `docs/`; the site pages are Phase 7).
- Any test file. R-X strict: the Implementer authors zero test files; the new tests and any contingent test update are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the closed catalogue, the class set and the pure classification functions

- **ACTION**: Delivers AC-A1 (the catalogue and the refusal of a code outside it), AC-A2 (the class and objective-step rules and the classification summary) and, by construction, AC-A4 (no pinned anchor is disturbed). In `plugins/relay/scripts/qa-run.mjs`, add one new block immediately after `summarizeEntries` (after line 1180, before the doc comment of `resolveStepUrl`). Every name below is exported and every function is pure (no I/O):
  1. `export const REASON_CATALOGUE` — a frozen object mapping each catalogued code to `{ disposition, reason }`. `disposition` is `'needs-human'` or `'blocked'`; the key MUST be named `disposition` (never `outcome`) so the contract's outcome-literal scan never sees it. `reason` is a fixed sentence that contains no planner-supplied text and ends with the clause `the manual steps are reproduced verbatim`. Exactly these eight codes: `UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `VISUAL_JUDGEMENT`, `VOCABULARY_GAP`, `STEP_UNGROUNDED` and `PARTIAL_REMAINDER` with disposition `needs-human`; `PRODUCT_DEFECT` and `STATE_UNCONFIRMED` with disposition `blocked`. `NO_PLAN_ENTRY` is NOT a member: it marks a case the plan omitted entirely.
  2. `export const RUNNER_OWNED_REASON_CODES = ['PARTIAL_REMAINDER']` — codes the runner derives itself (here from `human_remainder`) and a plan may not declare.
  3. `export const CASE_CLASSES = ['automatable', 'needs-a-new-driver', 'human-by-nature', 'blocked-by-product']` in that order, and `export const CLASS_UNCLASSIFIED = 'unclassified'` (reported, never declarable).
  4. `export function validatePlanClassification(entry)` returning `{ code: 'PLAN_ENTRY_INVALID', reason }` or `null`, checking in this order: (a) `class`, when present, is a string equal to a member of `CASE_CLASSES`, else the reason names the value (bounded with `JSON.stringify(String(v).slice(0, 64))`) and says it is not one of the four classes; (b) `reason_code`, when present, is a string and an own key of `REASON_CATALOGUE` (use `Object.hasOwn`), else the reason names the value and says it is not in the closed reason-code catalogue; a member of `RUNNER_OWNED_REASON_CODES` is refused naming the code and saying the runner derives it from `human_remainder`; (c) when `reason_code` is present, `steps` is absent or an empty array and `human_remainder` is absent, else the reason says a declining entry carries no steps or `human_remainder`; (d) `objective_steps`, when present, is an integer from 0 to 500, and when `steps` is a non-empty array it is at least `steps.length`, else the reason states the floor (every executable step is an objective step). No message may contain the phrases `is outside the closed vocabulary` or `step example`.
  5. `export function declinedCase(entry)` returning a `CaseResult` built through `blocked(...)` or `needsHuman(...)` from the catalogue's `disposition` and `reason`, or `null` when the entry carries no `reason_code` or `validatePlanClassification(entry)` is not `null`.
  6. `export function classOf(entry)` returning the declared class when the entry is an object, passes `validatePlanClassification` and carries a string `class`; otherwise `CLASS_UNCLASSIFIED`. `export function objectiveStepsOf(entry)` returning `null` for a non-object or an invalid entry, the declared integer `objective_steps` when present, `steps.length` when `steps` is a non-empty array, else `null`.
  7. `export function summarizeClassification(entries)` returning, from entries that carry `class`, `outcome`, `reason_code`, `steps` and `objective_steps` (a missing or unknown `class` counts as `unclassified`), an object with exactly these keys: `per_class` (the four class names plus `unclassified`, a partition of the entries), `driver_executed` (entries with `outcome` `pass` or `fail` whose `reason_code` is not `AUTOMATED_EVIDENCE`, over all classes), `automatable_total`, `automatable_driver_executed`, `automatable_rate` (executed over total rounded with `Math.round(x * 10000) / 10000`, or `null` when `automatable_total` is 0), `objective_steps_executed` (over `automatable` and `needs-a-new-driver` entries only: the count of `steps` items whose `result` is `passed` or `failed`), `objective_steps_total` (over the same two classes: the sum of integer `objective_steps`) and `objective_steps_undeclared` (the number of entries of those two classes whose `objective_steps` is not an integer).
  8. `export function applyClassification(entries, planByIndex)` mutating and returning `entries`: for each entry whose plan entry (looked up by `index` in the `Map`) is an object with the same `title`, set `class` to `classOf(plan)` and `objective_steps` to `objectiveStepsOf(plan)`; otherwise set `class` to `unclassified` and `objective_steps` to `null`.
  Do NOT add an `import`, a `// GUARD-SITE` or `// WRITE-SITE` comment, or the text `writeFileSync(` / `renameSync(` anywhere (comments included); do not write an `outcome:` literal other than the four values; do not change `OUTCOMES`, `summarizeEntries`, `applyPartialRemainder`, `validateStep` or `validateSteps`; and keep the phrase `export const REASON_CATALOGUE` out of every comment (Task 3 pins exactly one occurrence).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:791-798` (results built through `blocked`/`needsHuman`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:999-1002` (the `{ code, reason } | null` validator shape), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1167-1180` (a pure summarizer over entries) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:56-62` (no static sibling import).
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { REASON_CATALOGUE, CASE_CLASSES, RUNNER_OWNED_REASON_CODES, validatePlanClassification, declinedCase, summarizeClassification, OUTCOMES } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") fail("OUTCOMES changed");
  const required = ["UNGROUNDABLE_AFTER_INTERACTION", "EXTERNAL_CHANNEL", "VISUAL_JUDGEMENT", "PRODUCT_DEFECT", "STATE_UNCONFIRMED", "STEP_UNGROUNDED", "PARTIAL_REMAINDER"];
  for (const c of required) if (!Object.hasOwn(REASON_CATALOGUE, c)) fail("the catalogue lacks " + c);
  if (Object.hasOwn(REASON_CATALOGUE, "NO_PLAN_ENTRY")) fail("NO_PLAN_ENTRY must stay outside the catalogue");
  for (const [c, v] of Object.entries(REASON_CATALOGUE)) {
    if (v.disposition !== "needs-human" && v.disposition !== "blocked") fail("catalogue code " + c + " has a disposition outside needs-human, blocked");
  }
  if (CASE_CLASSES.join(",") !== "automatable,needs-a-new-driver,human-by-nature,blocked-by-product") fail("the class set changed: " + CASE_CLASSES.join(","));
  if (!RUNNER_OWNED_REASON_CODES.includes("PARTIAL_REMAINDER")) fail("PARTIAL_REMAINDER must be runner-owned");
  const ok = validatePlanClassification({ index: 1, title: "t", class: "human-by-nature", reason_code: "EXTERNAL_CHANNEL" });
  if (ok !== null) fail("a valid declining entry was refused: " + JSON.stringify(ok));
  const named = (entry, token, what) => {
    const r = validatePlanClassification(entry);
    if (!r || r.code !== "PLAN_ENTRY_INVALID" || !r.reason.includes(token)) fail(what + " was not refused naming " + token + ": " + JSON.stringify(r));
  };
  named({ index: 1, title: "t", class: "human-by-nature", reason_code: "NOT_A_REAL_CODE" }, "NOT_A_REAL_CODE", "a code outside the catalogue");
  named({ index: 1, title: "t", class: "sort-of-automatable", reason_code: "EXTERNAL_CHANNEL" }, "sort-of-automatable", "an invalid class");
  named({ index: 1, title: "t", reason_code: "NO_PLAN_ENTRY" }, "NO_PLAN_ENTRY", "the planner-defect marker");
  named({ index: 1, title: "t", reason_code: "PARTIAL_REMAINDER" }, "PARTIAL_REMAINDER", "a runner-owned code");
  const withSteps = validatePlanClassification({ index: 1, title: "t", reason_code: "EXTERNAL_CHANNEL", steps: [{ action: "request", method: "GET", path: "/x" }] });
  if (!withSteps || withSteps.code !== "PLAN_ENTRY_INVALID") fail("a declining entry that carries steps was accepted");
  const belowFloor = validatePlanClassification({ index: 1, title: "t", class: "automatable", driver: "http", steps: [{ action: "request" }, { action: "request" }], objective_steps: 1 });
  if (!belowFloor || belowFloor.code !== "PLAN_ENTRY_INVALID") fail("objective_steps below the number of executable steps was accepted");
  const noClass = validatePlanClassification({ index: 1, title: "t", driver: "http", steps: [{ action: "request" }] });
  if (noClass !== null) fail("an entry with no class must stay valid: " + JSON.stringify(noClass));
  const blockedCase = declinedCase({ index: 1, title: "t", class: "blocked-by-product", reason_code: "PRODUCT_DEFECT" });
  if (!blockedCase || blockedCase.outcome !== "blocked" || blockedCase.reason_code !== "PRODUCT_DEFECT") fail("PRODUCT_DEFECT did not decline as blocked: " + JSON.stringify(blockedCase));
  const humanCase = declinedCase({ index: 1, title: "t", class: "human-by-nature", reason_code: "EXTERNAL_CHANNEL" });
  if (!humanCase || humanCase.outcome !== "needs-human" || humanCase.reason_code !== "EXTERNAL_CHANNEL") fail("EXTERNAL_CHANNEL did not decline as needs-human: " + JSON.stringify(humanCase));
  if (declinedCase({ index: 1, title: "t", driver: "http", steps: [{ action: "request" }] }) !== null) fail("an executable entry was treated as a decline");
  const st = (...r) => r.map((result) => ({ result }));
  const entries = [
    { class: "automatable", outcome: "pass", reason_code: null, objective_steps: 2, steps: st("passed", "passed") },
    { class: "automatable", outcome: "needs-human", reason_code: "PARTIAL_REMAINDER", objective_steps: 4, steps: st("passed", "passed", "human") },
    { class: "automatable", outcome: "pass", reason_code: "AUTOMATED_EVIDENCE", objective_steps: 1, steps: [] },
    { class: "needs-a-new-driver", outcome: "fail", reason_code: null, objective_steps: 3, steps: st("passed", "failed", "not-run") },
    { class: "needs-a-new-driver", outcome: "needs-human", reason_code: "VOCABULARY_GAP", objective_steps: null, steps: [] },
    { class: "human-by-nature", outcome: "needs-human", reason_code: "EXTERNAL_CHANNEL", objective_steps: 5, steps: [] },
    { class: "blocked-by-product", outcome: "blocked", reason_code: "PRODUCT_DEFECT", objective_steps: null, steps: [] },
    { outcome: "needs-human", reason_code: "NO_PLAN_ENTRY", steps: [] },
  ];
  const s = summarizeClassification(entries);
  const want = { automatable_total: 3, automatable_driver_executed: 1, automatable_rate: 0.3333, driver_executed: 2, objective_steps_executed: 6, objective_steps_total: 10, objective_steps_undeclared: 1 };
  for (const [k, v] of Object.entries(want)) if (s[k] !== v) fail(k + " is " + JSON.stringify(s[k]) + ", expected " + v);
  const perClass = { automatable: 3, "needs-a-new-driver": 2, "human-by-nature": 1, "blocked-by-product": 1, unclassified: 1 };
  for (const [k, v] of Object.entries(perClass)) if (s.per_class[k] !== v) fail("per_class." + k + " is " + s.per_class[k] + ", expected " + v);
  if (Object.values(s.per_class).reduce((a, b) => a + b, 0) !== entries.length) fail("per_class is not a partition of the cases");
  if (summarizeClassification([]).automatable_rate !== null) fail("an empty automatable class must report a null rate, never 0 or 1");
  '
  ```
  Before this task the import fails (`REASON_CATALOGUE` is not exported), so the command exits non-zero.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the decline branch, the per-case class stamp and the `classification` block

- **ACTION**: Delivers AC-A1 (a declined case is `needs-human` or `blocked` with its catalogued code and its manual steps verbatim, before any side effect), AC-A2 (every results entry carries `class` and `objective_steps`; `results.json` carries `classification`; the four-key `counts` is unchanged) and AC-A4 (no frozen anchor is rewritten). In `plugins/relay/scripts/qa-run.mjs`:
  1. In `executeCase`, insert exactly these statements between the title-mismatch line (2455) and the `driver === null` line (2456): `const invalidClass = validatePlanClassification(p);` then `if (invalidClass) return out(needsHuman(invalidClass.code, invalidClass.reason));` then `const declined = declinedCase(p);` then `if (declined !== null) return { result: declined, driver: null, role: null };`. A declining entry therefore returns before the seed declaration is read, before any session, guard call, request or Playwright load, and it never needs a declared target. An entry with neither `class`, `reason_code` nor `objective_steps` is unaffected (`validatePlanClassification` returns `null` and `declinedCase` returns `null`), so every existing plan behaves exactly as before.
  2. In the `finally` block of `runRun`, call `applyClassification(entries, planByIndex);` on the line before the `summarizeEntries` destructure (line 2722), so the padded `RUN_ABORTED` entries and every normal entry are stamped. Immediately after that destructure add `const classification = summarizeClassification(entries);`, and add `classification,` to the `results` object right after `partially_executed: partiallyExecuted,`.
  3. Leave untouched: the record-resolution branch (2438-2448), the `NO_PLAN_ENTRY` line (2450) and its text, the per-case loop (2664-2708) including the `const keepSteps = ...` line and the `abortedEntry` helper, the `summarizeEntries` call itself, the `results.json` write (it stays the one `writeRunFile` call), and the stdout summary lines (2766-2781; the pinned `QA run finished:` line must keep its exact form). Do not add any import, write call or `outcome:` literal.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2449-2460` (the validation order in `executeCase`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2721-2722` (where the stamp and the summary go) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2737-2755` (the `results` object the new key joins).
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawnSync } from "node:child_process";
  import { validateResults } from "./scripts/validate/checks/qa-run-contract.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const feature = "feat";
  const runRel = "PRPs/reports/feat/qa-run/20260101T101010101Z";
  const root = mkdtempSync(join(tmpdir(), "relay-qa-classify-"));
  mkdirSync(join(root, ...runRel.split("/")), { recursive: true });
  const titles = ["Inbox check", "Broken page", "Needs a new step", "Static example", "Invalid code", "Invalid class", "Omitted case"];
  const block = (t, i) => ["### Case " + (i + 1), "**Title:** " + t, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", "2. Check the result.", ""].join("\n");
  writeFileSync(join(root, "PRPs", "reports", feature, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + titles.map(block).join("\n") + "\n## Notes\n\nnone\n");
  const plan = [
    { index: 1, title: titles[0], class: "human-by-nature", reason_code: "EXTERNAL_CHANNEL" },
    { index: 2, title: titles[1], class: "blocked-by-product", reason_code: "PRODUCT_DEFECT" },
    { index: 3, title: titles[2], class: "needs-a-new-driver", reason_code: "VOCABULARY_GAP", objective_steps: 3 },
    { index: 4, title: titles[3], class: "automatable", driver: "http", role: null, state: "none", steps: [{ action: "request", method: "GET", path: "/x" }] },
    { index: 5, title: titles[4], class: "human-by-nature", reason_code: "NOT_A_REAL_CODE" },
    { index: 6, title: titles[5], class: "sort-of-automatable", reason_code: "EXTERNAL_CHANNEL" },
  ];
  writeFileSync(join(root, ...runRel.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: plan }));
  const r = spawnSync(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", feature, "--run-dir", runRel], { encoding: "utf8", cwd: root });
  if (r.status !== 0) fail("the run exited " + r.status + ": " + r.stderr);
  const res = JSON.parse(readFileSync(join(root, ...runRel.split("/"), "results.json"), "utf8"));
  const by = (i) => res.cases.find((c) => c.index === i);
  const expectCase = (i, want) => {
    const c = by(i);
    if (!c) fail("case " + i + " has no entry");
    for (const [k, v] of Object.entries(want)) if (c[k] !== v) fail("case " + i + " " + k + " is " + JSON.stringify(c[k]) + ", expected " + JSON.stringify(v));
  };
  expectCase(1, { outcome: "needs-human", reason_code: "EXTERNAL_CHANNEL", class: "human-by-nature", driver: null });
  expectCase(2, { outcome: "blocked", reason_code: "PRODUCT_DEFECT", class: "blocked-by-product" });
  expectCase(3, { outcome: "needs-human", reason_code: "VOCABULARY_GAP", class: "needs-a-new-driver", objective_steps: 3 });
  expectCase(4, { outcome: "needs-human", reason_code: "NO_EXPECTATION", class: "automatable", objective_steps: 1 });
  expectCase(5, { outcome: "needs-human", reason_code: "PLAN_ENTRY_INVALID", class: "unclassified" });
  expectCase(6, { outcome: "needs-human", reason_code: "PLAN_ENTRY_INVALID", class: "unclassified" });
  expectCase(7, { outcome: "needs-human", reason_code: "NO_PLAN_ENTRY", class: "unclassified" });
  if (!String(by(5).reason).includes("NOT_A_REAL_CODE")) fail("the out-of-catalogue code is not named: " + by(5).reason);
  if (!String(by(6).reason).includes("sort-of-automatable")) fail("the invalid class is not named: " + by(6).reason);
  for (const i of [1, 2, 3]) if (!String(by(i).manual_steps_verbatim).includes("Open the page.")) fail("declined case " + i + " lost its manual steps");
  const wantCounts = { pass: 0, fail: 0, blocked: 1, "needs-human": 6 };
  for (const [k, v] of Object.entries(wantCounts)) if (res.counts[k] !== v) fail("counts." + k + " is " + res.counts[k] + ", expected " + v);
  if (Object.keys(res.counts).length !== 4) fail("the counts partition is no longer four keys");
  const c = res.classification;
  if (!c) fail("results.classification is missing");
  const perClass = { automatable: 1, "needs-a-new-driver": 1, "human-by-nature": 1, "blocked-by-product": 1, unclassified: 3 };
  for (const [k, v] of Object.entries(perClass)) if (c.per_class[k] !== v) fail("classification.per_class." + k + " is " + c.per_class[k] + ", expected " + v);
  const scalars = { driver_executed: 0, automatable_total: 1, automatable_driver_executed: 0, automatable_rate: 0, objective_steps_executed: 0, objective_steps_total: 4, objective_steps_undeclared: 0 };
  for (const [k, v] of Object.entries(scalars)) if (c[k] !== v) fail("classification." + k + " is " + JSON.stringify(c[k]) + ", expected " + v);
  const problems = validateResults(res);
  if (problems.length > 0) fail("the run results do not satisfy the contract: " + problems.join("; "));
  rmSync(root, { recursive: true, force: true });
  '
  ```
  Before this task a declining entry is refused `PLAN_ENTRY_INVALID` ("names no driver"), so case 1 fails the first assertion and the command exits non-zero. The fixture needs no target and no Playwright: every case ends before a context is built.

### Task 3: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the catalogue, the classes, the new results rules and the plan-entry examples

- **ACTION**: Delivers AC-A3 (the catalogue, the classes and the classification are pinned by `qa-run-contract`) and AC-A5 (the check is extended, not duplicated; the registered count stays 28). In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Widen the import on line 16 to also import `REASON_CATALOGUE`, `CASE_CLASSES`, `CLASS_UNCLASSIFIED`, `validatePlanClassification` and `summarizeClassification` from `../../../plugins/relay/scripts/qa-run.mjs` (the same module already imported for `validateStep`; it is import-safe).
  2. `validateResults`: tolerant, optional rules that older tracked `results.json` files (no new keys) still satisfy. A case that carries `class` must carry a member of `CASE_CLASSES` or `unclassified`; a case that carries `objective_steps` must carry `null` or a non-negative integer. When `obj.classification` is present it must be an object, and every key of `summarizeClassification(cases)` (recomputed from the cases, with `per_class` compared key by key) must equal the stored value, one message per mismatch naming the key, in the style of the `partially_executed` rule. No new message may contain the phrase `is outside the closed vocabulary` (a test pins that phrase to exactly one message for a fifth outcome) or the phrase `step example`.
  3. `checkQaRunContract`: add an input `requireCatalogue` (default `false`, exactly like `requireStepExamples`). When it is true: (a) the script text contains `export const REASON_CATALOGUE` exactly once and `export const CASE_CLASSES` exactly once; (b) the imported `REASON_CATALOGUE` contains each of the seven codes AC-6 names (`UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `VISUAL_JUDGEMENT`, `PRODUCT_DEFECT`, `STATE_UNCONFIRMED`, `STEP_UNGROUNDED`, `PARTIAL_REMAINDER`), does not contain `NO_PLAN_ENTRY`, and every `disposition` is `needs-human` or `blocked`; (c) `CASE_CLASSES` equals the four class names in order; (d) the command text contains every catalogue code and every class name, one finding per missing token, each message naming the token (`the runner command must document the reason code <code>` and `the runner command must document the case class <class>`); (e) every block in the command text marked with the new comment line `<!-- qa-plan-entry-example -->` immediately followed by a fenced `json` block is parsed (a parse failure is a finding) and passed to `validatePlanClassification`, a refusal being a finding of the form `the plan-entry example in the runner command does not validate: <reason>`, and at least one such block must exist. Add a pattern constant next to `STEP_EXAMPLE_PATTERN` for (e), tolerant of `\r\n` exactly as that one is.
  4. `runQaRunContractCheck` passes `requireCatalogue: true` beside `requireStepExamples: true`. No other caller changes. Update the file's header comment to list the new rules. Add no write call and no new registered check.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:80-85` (an optional key validated only when present), `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:162-181` (marked example extraction, validation and the opt-in flag) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:283-294` (the real-tree entry point is the only opt-in caller).
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { validateResults, checkQaRunContract } from "./scripts/validate/checks/qa-run-contract.mjs";
  import { summarizeClassification, REASON_CATALOGUE, CASE_CLASSES } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const t = "2026-10-05T10:00:00.000Z";
  const mkCase = (extra) => ({ index: 1, title: "t", outcome: "needs-human", reason_code: "EXTERNAL_CHANNEL", started_at: t, finished_at: t, evidence: [], steps: [], ...extra });
  const mk = (cases, extra) => ({ started_at: t, finished_at: t, human_gate: { status: "open" }, counts: { pass: 0, fail: 0, blocked: 0, "needs-human": cases.length }, cases, ...extra });
  if (validateResults(mk([mkCase({})], {})).length !== 0) fail("results without the new keys were rejected: " + JSON.stringify(validateResults(mk([mkCase({})], {}))));
  const classified = [mkCase({ class: "human-by-nature", objective_steps: null })];
  const good = mk(classified, { classification: summarizeClassification(classified) });
  if (validateResults(good).length !== 0) fail("a consistent classified result was rejected: " + JSON.stringify(validateResults(good)));
  const tampered = mk(classified, { classification: { ...summarizeClassification(classified), automatable_total: 9 } });
  if (validateResults(tampered).length === 0) fail("a classification block that disagrees with the cases was accepted");
  if (validateResults(mk([mkCase({ class: "bogus" })], {})).length === 0) fail("an unknown class was accepted");
  if (validateResults(mk([mkCase({ objective_steps: -1 })], {})).length === 0) fail("a negative objective_steps was accepted");
  const base = "HUMAN GATE STILL OPEN FAILED_NON_LOCAL_TARGET qa-run.mjs";
  const bare = checkQaRunContract({ scriptText: null, commandText: base, results: [], requireCatalogue: true });
  const docFindings = bare.findings.filter((f) => f.file.endsWith("relay-qa-run.md"));
  for (const code of Object.keys(REASON_CATALOGUE)) if (!docFindings.some((f) => f.message.includes(code))) fail("an undocumented catalogue code was not flagged: " + code);
  for (const cls of CASE_CLASSES) if (!docFindings.some((f) => f.message.includes(cls))) fail("an undocumented class was not flagged: " + cls);
  const drift = checkQaRunContract({ scriptText: null, commandText: base + "\n<!-- qa-plan-entry-example -->\n```json\n{ \"index\": 1, \"title\": \"t\", \"reason_code\": \"NOT_A_REAL_CODE\" }\n```\n", results: [], requireCatalogue: true });
  if (!drift.findings.some((f) => f.file.endsWith("relay-qa-run.md") && f.message.includes("NOT_A_REAL_CODE"))) fail("a plan-entry example that does not validate was not flagged: " + JSON.stringify(drift.findings));
  const quiet = checkQaRunContract({ scriptText: null, commandText: base, results: [] });
  if (quiet.findings.some((f) => /catalogue|reason code|plan-entry example/.test(f.message))) fail("the catalogue rules leaked into a caller that did not opt in: " + JSON.stringify(quiet.findings));
  '
  ```
  Before this task `validateResults` accepts the bogus class and the tampered block, so the corresponding assertions exit non-zero.

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — one entry per case, the classes, the catalogue, the frozen table and the objective-step rule

- **ACTION**: Delivers AC-A3 (the catalogue, the frozen table and the objective-step rule are documented and the marked examples validate against the script) and AC-A5 (the doc keeps every existing token pin, so the whole suite stays green). In `plugins/relay/commands/relay-qa-run.md`:
  1. Mission paragraph (lines 14-17): the planning judgment becomes "write exactly one plan entry per case: an executable entry where the manual steps map onto the closed vocabulary, a declining entry otherwise".
  2. Replace lines 147-153: write exactly one entry for every returned case, never omit one (an omitted case is recorded `needs-human` with `NO_PLAN_ENTRY`, a planner defect reported as `unclassified` and counted against the classification metric). Keep the `Write` tool instruction and the `<RUN_DIR>/plan.json` target. The unmarked plan-shape example gains `"class": "automatable"`. Add one unmarked declining-entry illustration `{ "index": 7, "title": "<copied exactly>", "class": "human-by-nature", "reason_code": "EXTERNAL_CHANNEL" }`. Neither block may be preceded by the `qa-step-example` marker, and neither may carry a top-level `states` key.
  3. Grounding rules (lines 216-226): where the text says "omit the case, or the case is `needs-human` `STEP_UNGROUNDED`", write "decline the case with `STEP_UNGROUNDED`"; where it says elements that only appear after an interaction cannot be grounded, add that such a case is declined with `UNGROUNDABLE_AFTER_INTERACTION`. Keep the tokens `STEP_UNGROUNDED` and the sentence containing "`matches` is exactly `1`" byte-intact.
  4. Insert a new subsection `### Classify every case and name every decline` after the "Per-step results" paragraph (which ends at line 284) and before "Declaration schema." (line 286). It must state, each as plain prose or a table (no block with a top-level `states` key): (a) the four class names with the PRD's meaning of each (automatable: every step maps to an existing driver step once grounding works; needs-a-new-driver: a named missing step or driver; human-by-nature: an external channel or a visual judgment; blocked-by-product: a known product defect blocks the case); (b) that `class` is the pre-run classification, declared per entry, independent of the outcome, never changed to improve a result, absent means the case is reported `unclassified`, an invalid value is `PLAN_ENTRY_INVALID`, and `unclassified` is never written; (c) the frozen classification of the 14 reachable cases of the two reference reports, copied from the PRD table at lines 88-93 (automatable: `praesto-sum` 23, `super-ensino` T-1 and A-1; needs-a-new-driver: A-2 and S-2, S-1, S-4 and T-2, `praesto-sum` 20, S-6; human-by-nature: T-3, S-3, S-5; blocked-by-product: X-1), with the instruction to copy the class and not re-derive it, and that cases 21 and 22 of `praesto-sum` stay outside the 14; (d) a table of the eight catalogued codes with the resulting outcome and when to use each (`VOCABULARY_GAP`: a needed step, or a declared source or origin for it, is missing from the closed vocabulary and the tracked declarations), the statements that `PARTIAL_REMAINDER` is derived by the runner from `human_remainder` and must name its gap and is never declared, that a code outside the catalogue (and `NO_PLAN_ENTRY` itself) makes the entry `PLAN_ENTRY_INVALID`, and that runtime halt codes (session, probe, query and origin codes) stay as they are; (e) the declining-entry shape: `class` and `reason_code`, no `steps`, no `human_remainder`, outcome taken from the catalogue, manual steps reproduced verbatim; (f) the objective-step rule: an executable entry may carry `objective_steps`, an integer that counts the case's objective steps including those no driver step can express yet; it defaults to the number of executable steps and may not be lower; a declining entry of class automatable or needs-a-new-driver should declare it, and a missing value is counted in `objective_steps_undeclared`; the Phase 8 pre-run table is the audited reference; (g) the results fields: per-case `class` and `objective_steps`, and the top-level `classification` block with its eight keys, where "driver-executed" means `pass` or `fail` from a driver (record-resolved and partially executed cases never count) and "objective steps executed" counts per-step results `passed` or `failed` over the first two classes; (h) two marked examples, each written as the exact comment line `<!-- qa-plan-entry-example -->` followed immediately by a fenced `json` block holding one plan entry that already passes `validatePlanClassification`: a declining entry, and an executable partial entry with `class`, `objective_steps` and `human_remainder`.
  5. Honesty rules (lines 355-363): both bullets become "decline" instructions (write a declining entry with a `class` and a catalogued `reason_code`: `EXTERNAL_CHANNEL` for an inbox, SMS, a physical device or a third-party payment, `VISUAL_JUDGEMENT` for a subjective visual judgment, `VOCABULARY_GAP` for a CLI, any other action outside the vocabulary or a database read with no declared source). The rewritten bullets must not contain the phrase `a CLI, a database query`.
  6. "Final output surface": add one sentence telling the operator to read the rate and the objective-step counters from the `classification` block of `results.json` and to treat a non-zero `objective_steps_undeclared` or any `unclassified` or `NO_PLAN_ENTRY` case as a planner defect.
  Keep intact: the required tokens `HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET` and `qa-run.mjs`; every `<!-- qa-step-example driver=... -->` block; the declaration example block; the bullets that begin `- A cited test title narrows the decision` and `- When the field cites only a file`. Never write, anywhere in the file, `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`, `--local-host`, `Until seeds`, `not yet read by the runner`, a bare `redaction-policy.md` basename or any `..HEAD` diff form.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:147-149`, `# SOURCE: plugins/relay/commands/relay-qa-run.md:152`, `# SOURCE: plugins/relay/commands/relay-qa-run.md:272-279` (prose register for the new subsection) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:355-363`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  grep -qF "<!-- qa-plan-entry-example -->" plugins/relay/commands/relay-qa-run.md
  if grep -nF "a CLI, a database query" plugins/relay/commands/relay-qa-run.md; then
    echo "FAIL: the omit-list names a database query again (pinned absent by qa-run-query.test.mjs)"; exit 1
  else
    echo "PASS: the rewritten bullets do not reintroduce the pinned phrase"
  fi
  if grep -nF -e "--local-host" plugins/relay/commands/relay-qa-run.md plugins/relay/scripts/qa-run.mjs; then
    echo "FAIL: --local-host appeared (forbidden by the auth-local-guard-sites check)"; exit 1
  else
    echo "PASS: no --local-host"
  fi
  node --test scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs
  ```
  `runQaRunContractCheck` runs with `requireCatalogue: true` and `requireStepExamples: true`, so it fails before this task (the doc names no catalogue code and carries no plan-entry example) and fails afterwards if any example stops validating against the script. The `grep -qF` literal is the marker copied byte-for-byte from the ACTION above, acceptable because the deliverable here is the doc text. The four named test files read the command doc (state-block parsing, token pins, example regexes) and pass on the unmodified tree.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The contract (catalogue, classes, results rules, doc examples) holds on the real tree and the outcome vocabulary is intact.
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { OUTCOMES } from "./plugins/relay/scripts/qa-run.mjs";
if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") { console.error("OUTCOMES changed"); process.exit(1); }
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# No static import of a sibling file was added to the runner (the copy-helper tests copy only qa-run.mjs and the guard).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# AC-14: the five frozen surfaces are byte-identical to HEAD (single-argument diff, working tree against HEAD, path-scoped).
if [ -n "$(git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen surface changed"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# No forbidden .claude/PRPs reference introduced by this phase's three files outside the quoted-prohibition idiom.
if git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite must still register and pass 28 checks. The summary line is printed to stdout by
# scripts/validate/index.mjs:130 as `${passCount} passed, ${failCount} failed (${results.length} checks run)`.
out="$(npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
# The whole corpus, glob quoted: every existing qa-run test still passes against the extended script, doc and check.
# The known-stale allowlist for this phase is empty: no existing assertion is changed by this design.
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** `qa-run.mjs` defines one closed catalogue of reason codes containing at least `UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `VISUAL_JUDGEMENT` and `PRODUCT_DEFECT` beside `STATE_UNCONFIRMED`, `STEP_UNGROUNDED` and `PARTIAL_REMAINDER`; a plan entry that declines a case with a `class` and a catalogued `reason_code` and no steps yields `needs-human` or `blocked` with that code and the manual steps verbatim, before any side effect; a `reason_code` outside the catalogue makes the entry `PLAN_ENTRY_INVALID` naming it; `NO_PLAN_ENTRY` is produced only for a case the plan omitted entirely.
- **AC-A2 (PRD AC-7):** `results.json` reports each case's `class` (`automatable`, `needs-a-new-driver`, `human-by-nature`, `blocked-by-product` or `unclassified`) and a top-level `classification` block with the per-class counts, the driver-executed count and rate over the automatable class, and the objective steps executed and total over the first two classes; the four-key `counts` partition is unchanged; a partially executed case is never counted in the rate; a case with no `class` is `unclassified`; an invalid `class` value makes the entry `PLAN_ENTRY_INVALID`.
- **AC-A3 (PRD AC-6, AC-7):** `qa-run-contract` pins the catalogue (the seven required codes present, `NO_PLAN_ENTRY` absent, dispositions limited to `needs-human` and `blocked`), the four classes, the consistency of the `classification` block with the cases, and the command doc's naming of every code and class and its marked plan-entry examples validating against the script; the doc records the frozen 14-case table and the objective-step counting rule, and instructs the planner to write one entry per case.
- **AC-A4 (PRD AC-14):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, and `OUTCOMES` is still exactly the four values, with one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(` and one `renameSync(` in `qa-run.mjs`.
- **AC-A5 (PRD AC-17):** `npm run validate` passes all 28 checks (`qa-run-contract` extended, no check added) and the corpus `node --test "scripts/validate/**/*.test.mjs"` is green.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| New code disturbs a source-text pin of `qa-run.mjs` (a second `// GUARD-SITE` or `// WRITE-SITE`, a second `writeFileSync(` or `renameSync(`, a stray `outcome:` literal, an edited mutation anchor such as the `keepSteps` line) | M | H | Task 1 and Task 2 list the forbidden strings, the catalogue uses a `disposition` key, a declined case is built through `blocked`/`needsHuman`, and Level 2 runs the real-tree contract; the corpus mutation tests run in Level 3 |
| A static sibling import breaks the copy-helper tests (they copy only `qa-run.mjs` and the guard) | L | H | Every helper lives in `qa-run.mjs`; Level 2 greps for a static relative import and fails on any |
| A doc edit breaks a doc-reading test (the first `json` block with a `states` key, the phrase `a CLI, a database query`, the one-line record-resolution bullets, the grounding tokens) | M | M | Task 4 names each pin and the safe shapes; its VALIDATE runs the four doc-reading test files and the real-tree contract |
| The declared `objective_steps` varies between planner runs or is under-declared to flatter the coverage | M | M | A floor at the number of executable steps, a reported `objective_steps_undeclared`, no runner inference, and the Phase 8 frozen pre-run table as the audited reference with every divergence recorded |
| A planner declines an executable case to dodge a failure | M | H | The class is independent of the outcome and fixed by the frozen table; a declined automatable case lowers `automatable_rate`, so declining cannot raise the metric |
| A runtime halt code (session, probe, query, origin) is specific but not in the catalogue, so the Phase 8 reading of "catalogued code on every non-executed case" is ambiguous | M | L | Recorded in `## Notes`; the catalogue is deliberately the plan-facing closed list, and Phase 8 decides how runtime halts are counted before the run |
| The catalogue is an own design: no surveyed result format (Playwright, Allure, JUnit XML, pytest) defines a closed catalogue of skip reasons | L | L | The shape matches the established pattern of a small closed status set with the cause carried in a side channel, which is exactly pass/fail/blocked/needs-human plus a reason code |
| An existing test assertion goes stale in a way this analysis missed | L | M | The contingent assertions are named in `## Notes`; any stale one is routed through the test pair as `EXISTING_TEST_UPDATED`, never edited by the Implementer |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Test-pair follow-up.** New tests required (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A5): the catalogue and class membership; `validatePlanClassification` refusals naming the value (class, code outside the catalogue, `NO_PLAN_ENTRY`, `PARTIAL_REMAINDER`, steps on a declining entry, the `objective_steps` floor); `declinedCase` dispositions; an end-to-end `run` fixture with one case per class including an omitted case; `summarizeClassification` arithmetic and the null rate; `validateResults` tolerance of older files and rejection of a tampered block; `requireCatalogue` findings and their invisibility to callers that do not opt in. Existing assertions expected to need NO edit: `qa-run.test.mjs:446-448` (counts, `validateResults(...)` equals `[]`, the `NO_PLAN_ENTRY` stdout line), `qa-run-case-vocabulary.test.mjs:235` (`summarizeEntries([])` deep-equals its three keys), `qa-run-record-resolution.test.mjs:285` (the `QA run finished:` line), `qa-run-contract.test.mjs:72` and `149-152`, `qa-run-query.test.mjs:1148`, and every `NO_PLAN_ENTRY` constant (`qa-run-per-test-resolution.test.mjs:47`, `qa-run-record-resolution.test.mjs:50`). Contingent only: if the Implementer's diff changes `summarizeEntries` the three assertions at `qa-run-case-vocabulary.test.mjs:229-231, 235, 247-250` go stale; if it changes the `QA run finished:` line then `qa-run-record-resolution.test.mjs:285` does. Either would be an `EXISTING_TEST_UPDATED` ledger entry from the test pair, never an Implementer edit, and the plan's design avoids both.
- **Corpus gating.** The known-stale allowlist for this phase is empty, so Level 3 runs the whole corpus with the quoted glob. If a stale file is ever named, exclude exactly that file with `--test-skip-pattern`, never `--test-name-pattern` with a negative lookahead (which excludes nothing on Node).
- **Open Question 5, resolved here: how objective steps are counted.** Declared in the plan entry as `objective_steps` (an integer), not derived from the report. Reasons: the report's steps reach the runner as one newline-joined string (`parseBlock` joins them at `qa-run.mjs:266`; table reports take a single cell at `:418`), no code splits them, and any splitter would still count subjective steps as objective, so a derived count would be a heuristic with its own unfrozen judgment; the planner already declares `class`, and the Phase 8 pre-run table freezes the per-case counts from the two byte-identical reports before the run, so the declared count is audited against a frozen reference exactly as `class` is audited against the frozen classification table. Rules enforced by the runner: the value is an integer from 0 to 500; for an entry with steps it defaults to the number of executable steps and may not be lower (an executable step is objective by definition); a declining entry of the first two classes with no value is counted in `objective_steps_undeclared`. Consequence for Phase 8: read the coverage only when `objective_steps_undeclared` is 0, and compare each case's `objective_steps` with the frozen table.
- **Catalogue decisions.** The PRD names seven codes; this plan adds `VOCABULARY_GAP`, because the class "needs a new driver" is defined as a named missing step or driver and the four new codes do not cover A-2, S-2, S-1 and S-6 before Phase 4 (or S-6 at all if Phase 6 is descoped). `PARTIAL_REMAINDER` is in the catalogue but runner-owned: a declining entry has no executed steps, so declaring it would inflate `partially_executed` with a case that ran nothing. `NO_PLAN_ENTRY` is outside the catalogue so a planner cannot declare the defect marker. `PRODUCT_DEFECT` and `STATE_UNCONFIRMED` decline as `blocked` (matching how `STATE_UNCONFIRMED` is already produced); the rest decline as `needs-human`. Runtime halt codes are intentionally outside the catalogue; Phase 8 decides before the run how they count toward "a specific catalogued code".
- **Why the runner stamps class from the plan entry only when the title matches.** A title-mismatched entry is a different case's entry; echoing its class would misclassify. An invalid entry is also reported `unclassified`, so a malformed classification is visible rather than half-trusted.
- **Research.** `research-codebase` located every anchor above and the pin inventory of all 13 `qa-run*.test.mjs` files; its gaps were closed by direct reads of `qa-run.mjs`, `qa-run-contract.mjs`, `relay-qa-run.md` and the cited test lines. `research-web` found no surveyed format with a closed skip-reason catalogue: Playwright keeps a closed status set with the cause in free-form annotations, Allure keeps five closed statuses with causes in `statusDetails` and labels, JUnit XML `skipped` carries only a free-text message, and pytest uses a free-text reason. The closed catalogue is therefore an own design; the TestRail, Xray and Zephyr automation-coverage definitions could not be verified (fetch failures) and are not relied on.
- **Scope of docs.** `docs/api-reference.md` (the `/relay-qa-run` row) and the `documentation/` pages are not edited here: the `docs_sync` pass owns `docs/` at implement time and the site pages and `changelog.html` belong to Phase 7 per `documentation/AGENTS.md`.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Task 1 and Task 2 fail before the work (`REASON_CATALOGUE` is not exported; a declining entry is `PLAN_ENTRY_INVALID`), Task 3 fails before the work (`validateResults` accepts a bogus class), and Task 4 fails before the work (the doc names no catalogue code). The Level 2 invariants and Level 3 pass on the unmodified tree by design, as regression guards.

*Generated: 2026-10-10*
*Approved: 2026-10-10*
*Implemented: 2026-10-10*
*Status: IMPLEMENTED*
