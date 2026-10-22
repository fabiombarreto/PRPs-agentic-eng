# Feature: Model judgment (Phase 5 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the plan vocabulary of `qa-run.mjs`: one new browser step `judge`; the `results.json` shape gains an optional top-level `judgment` block, a case entry that has no final outcome yet, and the per-step results `pending-judgment`, `uncertain` and `not-judged`; a new mode `judge` and its usage line; `OUTCOMES`, `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, the four-key `counts` partition and `plan.json` are unchanged); a false-pass hazard (a judged pass is a model's reading of a capture: it needs recorded evidence text, an `uncertain` option that is a gap and never a pass, a criterion that cannot be invented, and one verdict per step that can never be flipped); secret handling (the capture of a page that holds a secret is withheld as redacted text, the verdict text is written only under the ignored `evidence/` directory, and results.json carries no model-authored text); a command-script interaction (the command session reads captures and records verdicts through a script mode, the script never calls a model); an existing command doc, a knowledge-base page set and site pages amended around a script-validated vocabulary; knowledge-base edit under `docs/` with `docs_sync: true`; site-page edits under `documentation/` that existing tests bind to the script and the command doc (`documentation/AGENTS.md` applies); no new network- or store-touching site (the `auth-local-guard-sites` call sites are untouched); frozen-surface constraint (five files byte-identical); no new validate check (the count stays 28)
- Decisions found:
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` Decisions Log "Who judges": the command session's model, recorded through `qa-run.mjs judge`; "Uncertain judgment": `needs-human` `JUDGEMENT_UNCERTAIN`, class `gap`, never a pass without evidence; Architecture Notes "Judgment stays in the command": `run` leaves judged steps `pending-judgment` and writes no final outcome for those cases, `judge` records one verdict per call through the single write helper and recomputes the case and the summary when the last pending verdict arrives
  - Same PRD, Phase 5 scope: the `judge` step, the pending state, the `judge` mode, recomputation, the criterion rule, the judging protocol in the command doc (read the capture, cite evidence, prefer `uncertain` to a guess); AC-5's clause "a `judge` step with a locator scope also writes an element screenshot of that scope", deferred to this phase by the phase 2 plan and made possible by the `within` scope of phase 3
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the plan-side-only boundary, the single write helper, partial plans stay `needs-human` with `PARTIAL_REMAINDER`, `/relay-qa-report` unchanged
  - `docs/decisions.md` [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the outcome vocabulary is a closed set, a runner pass is evidence and not approval, secrets never reach reports, the local-only guard is permanent
  - `docs/decisions.md` [2026-04-19] "Secret redaction policy for Test Runner reports": unchanged; a verdict text passes through the same redaction layers before it is written and a capture of a page that holds a registered secret is replaced by redacted text
  - `docs/decisions.md` [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen; `hybrid_code_review` is `false`
  - `docs/decisions.md` [2026-04-19] "PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`"
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": results.json and the terminal carry fixed sentences, step positions and paths only; the model's evidence text is written under the ignored `evidence/` directory after redaction and is never printed
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing test is predicted to go stale (see `## Notes`), and none is edited by the Implementer; any unpredicted failure is routed to the test pair as `EXISTING_TEST_UPDATED`
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays non-interactive and standalone; a judgment is made by the command session's model and never asked of the user
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive and standalone
  - Command versus script separation: the command owns the judgment, the script owns every deterministic mutation, including writing each recorded verdict; `writeRunFile` stays the only writer (no second writer of results.json), and the verdict file goes through `writeEvidence`
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`); this phase adds none (the judge mode reads and writes files of one run directory only, and spawns nothing)
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`, and `evidence/` is ignored there
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, never `<base>..HEAD` or a HEAD-relative form; this phase's base is the phase-4 end-state tree object
  - `documentation/AGENTS.md`: a change under `documentation/` carries a changelog entry under `Unreleased`; NAV and the search index change only when a page is added, renamed or removed, and no page is added here; the version bump and the release heading belong to the release cut (Phase 8)
  - `npm run validate` keeps its 28 checks: `qa-run-contract` is extended (its results rules accept the pending state) and none is added
  - `qa-run-contract` source-text invariants stay true: `writeFileSync(` and `renameSync(` exactly once each, `// GUARD-SITE` and `// WRITE-SITE` exactly once each, no `outcome` followed by `:` or `=` and a quoted literal outside the four values, `spawnSync(process.execPath` exactly once, the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` and `export function mintExpiryDue(` each exactly once, and `interactionHistory(` and `isPostInteractionSnapshot(` inside the section that runs from `export function precheckGroundedSteps(` to `export function summarizeEntries(`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 5: "Model judgment" — Goal: move visual, language and checklist judgments to the AI without weakening "no false pass" — Success signal: a fixture run with two judged steps reaches a final `results.json` only after both verdicts; a verdict without evidence is refused; `uncertain` yields `JUDGEMENT_UNCERTAIN`.

## Summary

This phase makes a judgment a step. All runner changes are in `plugins/relay/scripts/qa-run.mjs`, plus a narrow extension of the results rules in `scripts/validate/checks/qa-run-contract.mjs`. (1) **The `judge` step (AC-13, AC-14, AC-5 clause).** A browser plan step `{ "action": "judge", "kind": "visual" | "language" | "checklist", "criterion": "<text>" }` with an optional `within` scope is added to the closed vocabulary (it counts as the case's expectation, takes no other key, and is refused in `http` entries). A new pure `validateJudgeCriteria` requires the `criterion` to appear verbatim in the case's manual steps once whitespace is collapsed (case preserved), else the entry is `PLAN_ENTRY_INVALID`; it runs in `executeCase` right after the chosen-input check and before anything is read, seeded or requested. A `within` scope is grounded by the same provenance rule as every other scoped locator (a word of the report, or a snapshot entry with `matches` 1). (2) **Capture and the pending state.** When `run` reaches a judge step the browser driver writes the step's own full-page capture (`case-<k>.judge-<n>.png`, or redacted text `.txt` when the page text holds a registered secret) and, when the step has a scope, resolves it through the existing `resolveScopeElement` (no second implementation) and writes an element capture with `captureElementPng` (`case-<k>.judge-<n>.scope.png`, or `.scope.txt`); a scope that does not match exactly one element ends the case `needs-human` `STEP_UNGROUNDED`. The step is recorded `pending-judgment`. A case whose steps all passed and that holds a pending judge step finishes with NO outcome: its `results.json` entry has `outcome: null`, a `pending_judgment` list of step positions and its manual steps kept; the top level gains a `judgment` block (`pending_steps`, `judged_steps`) only when a judge step exists; `summarizeEntries` skips an entry without one of the four outcomes, so the four-key `counts` partition and every judge-free run stay byte-identical. A case that ends `fail`, `blocked` or `needs-human` through another step is final at once and its judge steps are recorded `not-judged`. (3) **The `judge` mode (AC-13).** `qa-run.mjs judge --run-dir <dir> --case <n> --step <k> --verdict pass|fail|uncertain --evidence "<what the capture shows>" [--root <dir>]` is dispatched in `main` before `parseArgs`, like `ground`. A missing or malformed flag, a verdict outside the three and an evidence text outside 10 to 2000 characters exit 2 with the usage and write nothing. Otherwise a new pure `applyJudgeVerdict` marks the pending step `passed`, `failed` or `uncertain` with `judged_by: "model"`, settles the case through `settleJudgedCase` once its last pending step has a verdict (any `fail` gives `fail`, else any `uncertain` gives `needs-human` `JUDGEMENT_UNCERTAIN`, else `pass`, and a `pass` of a plan entry with `human_remainder` becomes `needs-human` `PARTIAL_REMAINDER` through the existing `applyPartialRemainder`), and recomputes counts, the two needs-human counters, the classification block and `judgment` from the entries. The verdict text is written to `evidence/case-<n>.judge-<k>.verdict.json` through `writeEvidence`, and `results.json` is rewritten through `writeRunFile`, the only writer; a verdict for a step that is not pending is refused and never overwrites. The script calls no model. (4) **Contract.** `qa-run-contract.mjs` accepts a case with `outcome: null` plus a `pending_judgment` list and the three new step results, so a tracked results.json that is mid-judgment is not flagged. (5) **Docs.** `relay-qa-run.md` gains one block before "The paragraphs that follow" (the `judge` step with its marked literal example, and the `criterion` and `within` rules), a "Judge the pending captures" subsection after the re-mint paragraph of Phase B (the mode line and the judging protocol: read the capture, cite what is visible, prefer `uncertain` to a guess), one honesty bullet and a corrected `VISUAL_JUDGEMENT` row; the knowledge base, the two site pages and the changelog state the same. The runner gains twelve exports (`PENDING_JUDGMENT`, `JUDGE_KINDS`, `JUDGE_VERDICTS`, `JUDGE_CRITERION_MAX`, `JUDGE_EVIDENCE_MIN`, `JUDGE_EVIDENCE_MAX`, `validateJudgeCriteria`, `isPendingResult`, `parseJudgeArgs`, `summarizeJudgment`, `settleJudgedCase`, `applyJudgeVerdict`), all listed in the `qa-run.mjs` row of the API reference. No existing test is predicted to go stale; the Implementer touches no test file.

## User Story

As the operator of relay's human validation gate
I want the runner to capture the evidence of a visual, language or checklist step and let the command session record a verdict that cites what it saw
So that these judgments stop landing on me, without a pass that nobody looked at and without the script ever calling a model

## Problem Statement

`/relay-qa-run` 0.46.0 reserves every judgment for a person: S-5's preview, case 20's pt-BR reading and its UI/UX checklist ended `needs-human` although an AI agent can read a screenshot and a short text. The runner's vocabulary has no way to hand a capture to a judge, no state for a step that waits for one, and no way to record a verdict that is auditable and that can never turn into a pass by default. Doing it ad hoc would put a model call, or an unrecorded opinion, inside a deterministic local script.

## Solution Statement

Runner, one contract check, one command doc, knowledge base, site pages; the outcome vocabulary, the reason-code catalogue, the kit login template and the validate check count are untouched. (1) Parsing: `stepRules` gains a total `judge` case with a closed key set; `validateJudgeCriteria` is a pure, total check against the manual steps with a fixed sentence that never echoes the criterion; `groundLocators` grounds a judge scope like any scoped word. (2) Execution: one new branch in the browser driver captures and records `pending-judgment`; the run assembly in `runRun` writes a case without a final outcome only for a pending judgment, behind an explicit narrow guard. (3) Recording: `parseJudgeArgs`, `applyJudgeVerdict` and `settleJudgedCase` are pure and total; `runJudge` is the only impure part and only reads the run directory, writes the verdict file through `writeEvidence` and rewrites results.json through `writeRunFile`. (4) Docs: additive blocks placed after every existing marked example and at points no existing test pins; the line of the command doc that lists the runner modes is left byte-identical (a test pins it), so the `judge` mode is introduced in its own paragraph.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `scripts/validate/checks/qa-run-contract.mjs`; `plugins/relay/commands/relay-qa-run.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `docs/domain/flows.md`; `documentation/reference/commands.html`; `documentation/reference/scripts.html`; `documentation/changelog.html` |
| Dependencies | none new (row 5 of 9; `Depends` is `1, 2`, both `complete`; shares `lane:qa-run` with phases 1 to 7, so it runs serially after phase 4); Node built-ins only, no new package, no sibling import, no new `import()` |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 89 (AC-5), 97-98 (AC-13, AC-14), 106 (AC-22), 108 (AC-24), 209 (row 5), 237-240 (Phase 5 details), 271-272 (Who judges, Uncertain judgment) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 89, 97-98, 106, 108, 209, 237-240, 271-272, 180 | AC-5 clause, AC-13, AC-14, AC-22, AC-24, the row, the Phase 5 scope, the two decisions and the "Judgment stays in the command" note this plan implements |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1094, 1110-1111, 1362-1408 | `BROWSER_ACTIONS`, `SCOPED_LOCATOR_KEYS` and the end of the `stepRules` browser `switch` where the `judge` case is inserted |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1552-1613 | `validateStep`, `validateSteps`: the helper insertion point (directly above the JSDoc of `validateStep`) and the expectation counting the `judge` case must feed |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1624-1652 | `recordSteps` and `applyPartialRemainder`: the step-record shape and the reuse of the partial-remainder conversion when a judged case settles |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2043-2166 | `precheckGroundedSteps`, `groundLocators` (the judge scope block goes before the `LOCATOR_ACTIONS` skip) and `summarizeEntries`; this span sits inside the `precheckGroundedSteps` to `summarizeEntries` section pin |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2180-2278 | `REASON_CATALOGUE` (`JUDGEMENT_UNCERTAIN`, READ-ONLY: its literal is mutated by tests), `RUNNER_OWNED_REASON_CODES`, `summarizeNeedsHuman` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2382-2417 | `summarizeClassification`: counts steps `passed` or `failed` as executed, which is how a judged step counts |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2607-2646 | `writeEvidence`, `captureFinalPng`, `captureElementPng` (no step uses the last one yet) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2684-2697 | `resolveScopeElement`: exported for this step's element capture; do not re-implement scope resolution |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3117-3310 | `DRIVERS.browser`: the step loop, the `else if` chain where the `judge` branch goes, the final capture and the result assembly |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4096-4240 | `executeCase`: the validation order, the two insertion points (criterion check after the chosen-input check, gate widening of the `groundLocators` call) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4270-4479 | `runRun`: the outcome guard, `keepSteps`, the entry object, the `results` object and the printed lines |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4924-4972 | `runGroundGuarded` and `main`: the dispatch and the guarded wrapper the judge mode copies |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 145-154, 12-17, 4674-4710 | `GROUND_USAGE_LINE`, `USAGE`, the header usage block, `GROUND_USAGE` and `parseGroundArgs`: the shapes `JUDGE_USAGE_LINE` and `parseJudgeArgs` follow |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 128-134, 207-318 | `OUTCOME_VALUES`, `STEP_RESULTS` (line 131) and `validateResults`: the three rules Task 4 relaxes for the pending state |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 729-791, 862-907, 944-980, 649-650 | the phase-4 block after which Task 5 inserts, the honesty rules, the Phase B tail before `## Final output surface`, and the two reason-code rows |
| P0 | `docs/api-reference.md` | 129, 219 | the `/relay-qa-run` row and the `qa-run.mjs` row (read the full single physical lines before editing) |
| P0 | `docs/domain/glossary.md` | 409-422 | the phase-4 paragraph after which Task 6 inserts a paragraph (READ-ONLY: the paragraph that holds `REASON_CATALOGUE`) |
| P0 | `docs/domain/flows.md` | 216-230 | the numbered item whose passage Task 6 extends |
| P0 | `documentation/reference/commands.html` | the `Step vocabulary` row (line 355) | the row Task 7 extends |
| P0 | `documentation/reference/scripts.html` | the `Assertions and request count` row (line 222) and the usage block (lines 230-237) | the row and the block Task 7 extends |
| P0 | `documentation/changelog.html` | 31-67 | the `Unreleased` block that Task 7 extends |
| P0 | `documentation/AGENTS.md` | the sections on the `Unreleased` entry rule and "modify an existing page" | the rules that bind Task 7 |
| P1 | `PRPs/plans/completed/qa-runner-ai-executable-steps-phase-4-chosen-inputs-dedicated-writes-and-capture-guidance.plan.md` | Tasks 4, 6, 7 and the Level 1 to 3 blocks | READ-ONLY: the edit register, the changed-file checks and the TAP corpus-gate parser this plan adapts |
| P1 | `PRPs/plans/completed/qa-runner-ai-executable-steps-phase-2-visibility-and-evidence.plan.md` | the `## Notes` hand-off paragraph | READ-ONLY: why the AC-5 element-capture clause lands here |
| P1 | `scripts/validate/checks/qa-run-vocabulary-pins.test.mjs` | 66-72, 182-196, 297-336 | READ-ONLY (R-X): `MODE_LIST` pins command-doc line 29 byte for byte (this plan leaves that line untouched); one paragraph per opener |
| P1 | `scripts/validate/checks/qa-run-scoped-locators.test.mjs` | 183-196, 505-547 | READ-ONLY (R-X): `groundLocators.length` stays 4; exactly one marked example per scoped key (the `judge` example carries none); every marked browser example validates alone |
| P1 | `scripts/validate/checks/qa-run-impossible-catalogue.test.mjs` | 118-160, 598-610, 695-703, 784-806 | READ-ONLY (R-X): the catalogue pins, the "Result fields" paragraph must keep its ending, the API row and glossary paragraph rules |
| P1 | `scripts/validate/checks/qa-run-record-resolution.test.mjs` | 546-565 | READ-ONLY (R-X): the outcome-literal source scan and the `counts` key set |
| P1 | `scripts/validate/checks/qa-run-release-pages.test.mjs` | 220-238, 526-541 | READ-ONLY (R-X): the usage block of `scripts.html` and the rule that every camelCase or UPPER_SNAKE token between `REASON_CATALOGUE` and `USAGE` in the API row is a real export |
| P1 | `scripts/validate/checks/qa-run-input-value.test.mjs` | 286-337, 439-475 | READ-ONLY (R-X): the real-runner spawn shape, the report and plan shapes and the `results.json` location the gates copy |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4945-4947
async function main(argv) {
  if (argv[0] === 'ground') return await runGroundGuarded(argv.slice(1));
  const args = parseArgs(argv);
```
Copied by Task 3 (the judge dispatch is one more early line of the same shape, placed directly after the `ground` line, so `parseArgs` and the closed list `['parse', 'init', 'run']` are untouched).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4928-4939
async function runGroundGuarded(argv) {
  try {
    return await runGround(argv);
  } catch (err) {
    if (err instanceof Halt) {
      process.stderr.write(`${err.message}\n`);
      return 1;
    }
    process.stderr.write('FAILED_RUNNER_ERROR: the runner stopped on an unexpected error\n');
    return 1;
  }
}
```
Copied by Task 3 (`runJudgeGuarded` is this wrapper around `runJudge`; the new functions go after it and before `main`, outside every pinned section).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4684-4710
function parseGroundArgs(argv) {
  let root = process.cwd();
  /** @type {string | null} */ let feature = null;
  ...
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!['--root', '--feature', '--run-dir', '--route', '--role', '--env-handle', '--prefix'].includes(a)) return null;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) return null;
    i++;
```
Copied by Task 3 (the strict whitelist-and-value loop; `parseJudgeArgs` returns a discriminated result instead of null so the refusal can name its reason).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2607-2611
function writeEvidence(ctx, name, payload) {
  const abs = join(ctx.runDirAbs, 'evidence', name);
  writeRunFile(ctx, abs, payload);
  return `${ctx.runDirRel}/evidence/${name}`;
}
```
Read by Tasks 2 and 3 and NOT edited: every capture and the verdict file go through it. The line `const abs = join(ctx.runDirAbs, 'evidence', name);` must stay exactly once.

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1640-1652
export function applyPartialRemainder(result, entry) {
  if (!isObj(entry) || !isObj(entry.human_remainder) || result.outcome !== 'pass') return result;
  const prior = Array.isArray(result.steps) ? result.steps : [];
  const last = prior.length > 0 ? prior[prior.length - 1].index : 0;
  return {
    ...result,
    outcome: 'needs-human',
    reason_code: 'PARTIAL_REMAINDER',
```
Read by Task 3 and NOT edited: `settleJudgedCase` builds a `pass` result and hands it to this function, so a judged pass of a partial plan becomes `PARTIAL_REMAINDER` exactly as a driver pass does.

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2692-2697
export async function resolveScopeElement(page, scope) {
  const locator = scopeLocator(page, scope);
  await locator.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await locator.count().catch(() => 0);
  return count === 1 ? { ok: true, locator } : { ok: false, count };
}
```
Called by Task 2 (the judge branch resolves a `within` scope with this function, passing the scope object `scopeOf` returns, and hands `locator` to `captureElementPng`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3301-3305
    // The final capture reflects the state after the last step that ran, so it is attributed to that step.
    const stepsOut = recordSteps(plan.steps, ranTo + 1, verdict !== null ? ranTo : -1, (j) => queryEvidence.get(j) ?? (j === ranTo ? evidence[0] ?? null : null));
    const allEvidence = [...queryEvidence.values(), ...evidence];
    if (verdict !== null) return { ...verdict, evidence: allEvidence, steps: stepsOut };
    return { outcome: 'pass', reason_code: null, reason: null, evidence: allEvidence, steps: stepsOut };
```
Copied by Task 2 (the step records of judge steps are rewritten from `stepsOut`; the scope captures join `allEvidence`; a pending result is returned between the two existing returns).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1389-1404
      case 'expect_requests': {
        if (Object.keys(s).some((k) => !['action', 'method', 'url_contains', 'count'].includes(k))) {
          return bad('expect_requests takes only method, url_contains and count');
        }
        ...
        expectations++;
        break;
      }
      default:
        return bad(`unknown browser action ${JSON.stringify(s.action)}`);
```
Copied by Task 1 (the `judge` case is inserted between the closing brace of `expect_requests` and `default:`, in the same closed-key-set register: a reason names keys, never a value).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2158-2166
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
Copied by Task 2 (only the loop line changes, to skip an entry whose outcome is not one of the four keys; the return shape of exactly three keys stays, because a test pins it).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4375-4393
      if (!OUTCOMES.includes(result.outcome)) result = blocked('RUNNER_ERROR', 'an internal path produced a value outside the closed vocabulary');
      const finishedAt = now();
      const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';
      entries.push({
        index: c.index,
        title: c.title,
        risk: c.risk,
        outcome: result.outcome,
```
Copied by Task 2 (the guard gains one narrow exception, the `keepSteps` line stays byte-identical because a test mutates it by anchor, and the entry gains the null outcome and the `pending_judgment` list only for a pending result).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:755-760 (the marked write example added by phase 4)
A literal `browser` step that changes data, marked as a write:

<!-- qa-step-example driver=browser -->
```json
{ "action": "click", "role": "button", "name": "Save", "effect": "write" }
```
```
Copied by Task 5 (the register of a marked step example: one introducing line ending in a colon, the marker with no trailing space, a `json` fence and a flat one-line object, then the explanatory paragraph; the new example carries none of `within`, `name_prefix`, `label_text`, `index`, `effect` or `selector`).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:975-980
the proof fails again. A role whose mechanism is not `minted`, and every other halt, is
never retried, and the login template and its stamp are unchanged.

---

## Final output surface
```
Copied by Task 5 (the new `### Judge the pending captures` subsection goes after the second line and before the rule; the re-mint paragraph must stay directly after the minted paragraph).

```
# SOURCE: docs/domain/flows.md:223-230
   A value the report leaves open may be chosen by the planner and declared in the
   entry's `chosen_inputs` (a `fill` value that is a declared capture or a literal found
   in a grounding snapshot of the run directory; a literal found nowhere is
   `PLAN_ENTRY_INVALID`), and a click, fill or request marked with the `effect` key set
   to `write` runs only for a role that `login.config.json` declares `"dedicated": true`;
   otherwise the case is `blocked` with `ROLE_NOT_DEDICATED` before any seed, session or
   request.
   An element that exists only after a click or a fill is grounded in a second
```
Copied by Task 6 (the numbered-list item keeps its 3-space indent on every line; the new passage goes between the last two lines).

```
# SOURCE: documentation/changelog.html:56-65
        <li><strong>Chosen inputs and dedicated-role writes</strong> &mdash; a plan entry may declare
          ...
          titles of seeded entities.</li>
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
Copied by Tasks 3 and the Level 3 gate (the gates spawn the REAL runner by absolute path with a temp root as `cwd`).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:224-228
  if (!obj.human_gate || obj.human_gate.status !== 'open') msgs.push('human_gate.status must be "open"');
  if (cases !== null) {
    const counts = obj.counts && typeof obj.counts === 'object' ? obj.counts : {};
    const sum = OUTCOME_VALUES.reduce((n, k) => n + (Number.isInteger(counts[k]) ? counts[k] : 0), 0);
    if (sum !== cases.length) msgs.push(`cases.length (${cases.length}) does not equal the sum of counts (${sum})`);
```
Copied by Task 4 (the partition rule counts a pending case beside the four counts; the message text stays byte-identical).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the vocabulary (`judge` case, constants, `validateJudgeCriteria`), the provenance block in `groundLocators`, the `executeCase` wiring, the driver branch, the pending result and `runRun` assembly, `summarizeEntries`, `summarizeJudgment`, the pure judge-mode functions, `runJudge`, the `main` dispatch, `USAGE` and the header |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | three results rules accept the pending state (`STEP_RESULTS`, the partition sum, the outcome vocabulary check); no new rule set and no new check |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the `judge` step block with its marked example, the "Judge the pending captures" subsection, one honesty bullet, the corrected `VISUAL_JUDGEMENT` row |
| `docs/api-reference.md` | UPDATE | the `/relay-qa-run` row (the judge step and mode) and the `qa-run.mjs` row (the mode, the eleven exports, the `USAGE` sentence) |
| `docs/domain/glossary.md` | UPDATE | one new paragraph before "QA grounding snapshot" |
| `docs/domain/flows.md` | UPDATE | one added passage in the numbered item that states the grounding rule |
| `documentation/reference/commands.html` | UPDATE | one sentence in the `Step vocabulary` row |
| `documentation/reference/scripts.html` | UPDATE | one sentence in the `Assertions and request count` row and one usage line in the usage block |
| `documentation/changelog.html` | UPDATE | one `Added` entry under `Unreleased`, as `documentation/AGENTS.md` requires for any change under `documentation/` |

## NOT Building (Scope Limits)

- Channel sources and `read_message` (Phase 6), `preflight`, kit staleness, the record flag and fresh-cache dependencies (Phase 7), the release cut (Phase 8) and the dogfood (Phase 9).
- A model call, a model API credential or any network call in `qa-run.mjs`. The script records what the command session decides; it never judges.
- A fifth outcome. `OUTCOMES` keeps its four values; a pending judgment is a case entry with no outcome plus a step result, never an outcome literal.
- A judge step for the `http` driver, a verdict that can be changed after it is recorded, a re-run of a judged step, or a deadline after which a pending step is judged by default. A step that is never judged keeps its case without an outcome and the run summary says so.
- Any change to `OUTCOMES`, `REASON_CATALOGUE` (its entries, its reason text, its key set; `JUDGEMENT_UNCERTAIN` is already catalogued and runner-owned), `RUNNER_OWNED_REASON_CODES`, `POSITIVE_ASSERTION_ACTIONS` (a pinned list; `judge` is not an absence anchor), `summarizeClassification`'s keys, `plan.json` shape, `parseArgs` and its mode list, `writeRunFile`, `settleAssertion`, `isVisibleToPerson`, `captureFinalPng`, `captureElementPng`, `resolveScopeElement`, and any new static or dynamic `import`.
- The line of `relay-qa-run.md` that lists the runner modes (`the runner script (`parse`, `init`, `run`, `ground`)`), the "Result fields" paragraph (a test pins its ending), the reason-code table other than the one `VISUAL_JUDGEMENT` row, and the `Classification` rows of the site pages.
- A new validate check or a new rule set in `qa-run-contract.mjs` (`documentation/reference/validation-checks.html` stays untouched; the count stays 28).
- `docs/decisions.md`, NAV (`assets/js/app.js`), the search index, the plugin version, and `documentation/reference/commands.html` rows other than the one named.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`, and any change to a reference report.
- Any test file. R-X strict: the Implementer authors zero test files; the new tests are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the `judge` step, `validateJudgeCriteria`, the scope provenance and the `executeCase` wiring

- **ACTION**: Delivers AC-A1 and AC-A2 (PRD AC-13 vocabulary half, AC-14) and the grounding half of AC-A4. Six edits in `plugins/relay/scripts/qa-run.mjs`; nothing is captured or recorded yet.
  1. Add `'judge'` to the end of the `BROWSER_ACTIONS` array (line 1094: `..., 'expect_state', 'expect_requests'];` becomes `..., 'expect_state', 'expect_requests', 'judge'];`). `LOCATOR_ACTIONS` and `POSITIVE_ASSERTION_ACTIONS` are NOT edited.
  2. Directly after the line `export const SCOPED_LOCATOR_KEYS = Object.freeze(['within', 'name_prefix', 'label_text', 'index']);` insert:
     ```js

     /** The kinds of judgment a `judge` step may ask for, the verdicts a judgment may record, and the limits of the texts (chosen, not measured). */
     export const JUDGE_KINDS = Object.freeze(['visual', 'language', 'checklist']);
     export const JUDGE_VERDICTS = Object.freeze(['pass', 'fail', 'uncertain']);
     export const JUDGE_CRITERION_MAX = 500;
     export const JUDGE_EVIDENCE_MIN = 10;
     export const JUDGE_EVIDENCE_MAX = 2000;

     /** The step result of a judged step that waits for a verdict, and the internal result of a case that holds one. Never an outcome. */
     export const PENDING_JUDGMENT = 'pending-judgment';
     ```
  3. In the `stepRules` browser `switch`, directly before `default:` (the line pair `default:` / ``return bad(`unknown browser action ${JSON.stringify(s.action)}`);``), insert:
     ```js
           case 'judge': {
             // A judged step asserts nothing itself: it hands a capture to a recorded verdict, and that verdict is the expectation.
             if (Object.keys(s).some((k) => !['action', 'kind', 'criterion', 'within'].includes(k))) {
               return bad('judge takes only kind, criterion and within');
             }
             if (!isStr(s.kind) || !JUDGE_KINDS.includes(s.kind)) return bad('judge kind must be visual, language or checklist');
             if (!isStr(s.criterion) || s.criterion.trim() === '' || s.criterion.length > JUDGE_CRITERION_MAX) {
               return bad(`judge criterion must be a non-empty string of at most ${JUDGE_CRITERION_MAX} characters`);
             }
             if (s.within !== undefined) {
               const scope = scopeOf(s.within);
               if (!scope.ok) return bad(`judge: ${scope.why}`);
             }
             expectations++;
             break;
           }
     ```
  4. Directly above the JSDoc of `validateStep` (the `/**` line that begins "Validates one plan step against the closed vocabulary"; after the closing brace of `chosenSnapshotRefusal`, outside every pinned section) insert:
     ```js
     /**
      * Requires the `criterion` of every `judge` step to appear in the case's manual steps once whitespace is collapsed
      * (case is kept: the words are the report's own, verbatim). A criterion the report does not state is refused, so a
      * planner can never invent what is judged. Pure and total; the reason names a step position and never the criterion.
      * @param {any} steps
      * @param {any} manualText the case's manual steps as the report states them
      * @returns {{ code: string, reason: string } | null}
      */
     export function validateJudgeCriteria(steps, manualText) {
       if (!Array.isArray(steps)) return null;
       const flat = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim();
       const report = isStr(manualText) ? flat(manualText) : null;
       for (const [i, s] of steps.entries()) {
         if (!isObj(s) || s.action !== 'judge') continue;
         const criterion = isStr(s.criterion) ? flat(s.criterion) : '';
         if (report === null || criterion === '' || !report.includes(criterion)) {
           return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: the judge criterion must appear verbatim in the case's manual steps` };
         }
       }
       return null;
     }
     ```
  5. In `groundLocators` (inside the `precheckGroundedSteps` to `summarizeEntries` section; keep `interactionHistory(` and `isPostInteractionSnapshot(` in it), directly before the line `if (!LOCATOR_ACTIONS.includes(step.action)) continue;` insert a block that grounds the scope of a judge step with the same provenance rule as every scoped word (a word of the report, or a snapshot entry of the step's role and route with `matches` 1):
     ```js
         if (step.action === 'judge' && step.within !== undefined) {
           const scoped = scopeOf(step.within);
           if (scoped.ok) {
             const sc = scoped.scope;
             const word = sc.name !== undefined ? sc.name : /** @type {string} */ (sc.namePrefix);
             const plain = route === null ? undefined : snapshots.find((s) => isObj(s) && s.role === wantRole && s.route === route && !isPostInteractionSnapshot(s));
             const listed = plain !== undefined && Array.isArray(plain.entries) && plain.entries.some((/** @type {any} */ e) => isObj(e) && e.matches === 1 && e.kind === 'role' && e.role === sc.role
               && (sc.name !== undefined ? e.name === sc.name : isStr(e.name) && e.name.startsWith(word)));
             if (!inReport(word) && !listed) {
               return refuse(`step ${n}: the judge scope is neither a snapshot entry that matches exactly one element nor a word of the report's own steps`);
             }
           }
         }
     ```
     `groundLocators` keeps its arity of 4 plus the default fifth parameter, its return shape and its refusal sentences; the block pushes nothing into `runtime`.
  6. In `executeCase`: (a) directly after the `if (invalidChosen) return out(needsHuman(invalidChosen.code, invalidChosen.reason));` line insert
     ```js
       const invalidJudge = validateJudgeCriteria(p.steps, kase.manual_steps_verbatim);
       if (invalidJudge) return out(needsHuman(invalidJudge.code, invalidJudge.reason));
     ```
     and (b) widen the gate of the grounding call: in the line that begins `if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null)) {` change the predicate so it also accepts a judge step that carries a scope: `... && (LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null || s.action === 'judge' && s.within !== undefined))) {`. The call inside the block (`groundLocators(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role, p.chosen_inputs)`) is unchanged.
  Constraints: keep every other line of `stepRules`, `groundLocators` and `executeCase` byte-identical; do not edit `const invalid = validateSteps(...)`; do not reorder any existing check; do not write the substring `locator.within(` anywhere; do not add a second `// GUARD-SITE` or `// WRITE-SITE`; no comment or string may contain `writeFileSync(`, `renameSync(` or `outcome` followed by `:` or `=` and a quoted literal; the five constants are plain data (no behaviour).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1389-1404` (the closed-key-set `case` and the `bad(...)` register) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2158-2166` is not touched here; the helper register follows `validateChosenInputs` (the pure, total, position-only-reason style).
- **VALIDATE**: delivers AC-A1, AC-A2 and the grounding half of AC-A4. Fails on the unmodified tree (the constants and the helper do not exist, and a `judge` step is refused as an unknown browser action) and passes after the task. It feeds hostile values to the validator and pins the order rule, the case-sensitivity, the totality, the arity and that no reason echoes the criterion.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  assert.equal(typeof m.validateJudgeCriteria, "function", "validateJudgeCriteria is not exported");
  assert.deepEqual([...m.JUDGE_KINDS], ["visual", "language", "checklist"]);
  assert.deepEqual([...m.JUDGE_VERDICTS], ["pass", "fail", "uncertain"]);
  assert.equal(m.JUDGE_CRITERION_MAX, 500);
  assert.equal(m.JUDGE_EVIDENCE_MIN, 10);
  assert.equal(m.JUDGE_EVIDENCE_MAX, 2000);
  assert.equal(m.PENDING_JUDGMENT, "pending-judgment");
  assert.ok(!m.OUTCOMES.includes(m.PENDING_JUDGMENT), "a pending judgment must never be an outcome");
  assert.equal(m.groundLocators.length, 4);
  assert.equal(m.precheckGroundedSteps.length, 4);
  const J = { action: "judge", kind: "visual", criterion: "the preview looks right" };
  const ok = (d, s) => assert.equal(m.validateStep(d, s), null, JSON.stringify(s));
  const no = (d, s) => assert.equal(m.validateStep(d, s)?.code, "PLAN_ENTRY_INVALID", JSON.stringify(s));
  ok("browser", J);
  ok("browser", { ...J, kind: "language" });
  ok("browser", { ...J, kind: "checklist", within: { role: "region", name: "Resumo" } });
  ok("browser", { ...J, within: { role: "region", name_prefix: "Resu" } });
  for (const bad of [{ ...J, kind: "audio" }, { ...J, kind: undefined }, { ...J, kind: 5 }, { ...J, criterion: "" }, { ...J, criterion: "   " }, { ...J, criterion: 7 }, { ...J, criterion: undefined }, { ...J, criterion: "x".repeat(501) }, { ...J, extra: 1 }, { ...J, selector: "#a" }, { ...J, effect: "write" }, { ...J, session: "none" }, { ...J, within: { role: "nope", name: "x" } }, { ...J, within: { role: "region" } }, { ...J, within: { role: "region", name: "a", name_prefix: "b" } }, { ...J, within: "x" }, { judge: { kind: "visual", criterion: "x" } }]) no("browser", bad);
  no("http", J);
  assert.equal(m.validateSteps("browser", [{ action: "goto", path: "/" }, J], []), null, "a judge step is the expectation of its case");
  assert.equal(m.validateSteps("browser", [{ action: "goto", path: "/" }], [])?.code, "NO_EXPECTATION");
  assert.equal(m.validateSteps("browser", [{ action: "goto", path: "/" }, J, { action: "expect_not_visible", role: "button", name: "Ok" }], [])?.code, "PLAN_ENTRY_INVALID", "a judge step is not an absence anchor");
  assert.equal(m.validateSteps("browser", [{ action: "goto", path: "/" }, { ...J, criterion: "uses {{missing}}" }], [])?.code, "PLAN_ENTRY_INVALID");
  const manual = "1. Open the page.\n2. Check that   the preview\n   looks right in the Resumo panel.";
  const steps = (c) => [{ action: "goto", path: "/" }, { ...J, criterion: c }];
  assert.equal(m.validateJudgeCriteria(steps("the preview looks right"), manual), null, "whitespace is collapsed");
  assert.equal(m.validateJudgeCriteria([{ action: "goto", path: "/" }], manual), null);
  for (const c of ["The preview looks right", "the preview looks wrong", "", "  "]) {
    const r = m.validateJudgeCriteria(steps(c), manual);
    assert.equal(r?.code, "PLAN_ENTRY_INVALID", JSON.stringify(c));
    assert.ok(r.reason.startsWith("step 2: "), r.reason);
    assert.ok(!r.reason.includes("preview"), "a refusal echoed the criterion");
  }
  for (const manualText of [null, undefined, 7, {}]) assert.equal(m.validateJudgeCriteria(steps("the preview looks right"), manualText)?.code, "PLAN_ENTRY_INVALID");
  for (const hostile of [null, undefined, "x", 7, {}, [null], [7], [{ action: "judge" }]]) assert.doesNotThrow(() => m.validateJudgeCriteria(hostile, manual));
  const withScope = [{ action: "goto", path: "/" }, { ...J, within: { role: "region", name: "Resumo" } }];
  assert.equal(m.groundLocators(withScope, [], "Open. Check the Resumo panel.", null).refusal, null, "a scope word of the report is grounded");
  assert.equal(m.groundLocators(withScope, [], "Open. Check the panel.", null).refusal?.code, "PLAN_ENTRY_INVALID", "a scope word nobody states is refused");
  assert.deepEqual(m.groundLocators(withScope, [], "Open. Check the Resumo panel.", null).runtime, []);
  const snap = { schema_version: 1, role: "anonymous", route: "/", entries: [{ kind: "role", role: "region", name: "Resumo", matches: 1 }], withheld: 0 };
  assert.equal(m.groundLocators(withScope, [snap], "Open. Check the panel.", null).refusal, null, "a snapshot entry with matches 1 grounds the scope");
  const twice = { ...snap, entries: [{ kind: "role", role: "region", name: "Resumo", matches: 2 }] };
  assert.equal(m.groundLocators(withScope, [twice], "Open. Check the panel.", null).refusal?.code, "PLAN_ENTRY_INVALID", "a snapshot entry with two matches does not ground it");
  assert.equal(m.groundLocators([{ action: "goto", path: "/" }, J], [], "Open.", null).refusal, null, "a judge step with no scope needs no grounding");
  '
  ```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the driver branch, the pending result and the `runRun` assembly

- **ACTION**: Delivers AC-A3 (the pending half of PRD AC-13) and AC-A4 (the element capture of PRD AC-5). Six edits in `plugins/relay/scripts/qa-run.mjs`; no mode is added yet.
  1. Typedefs (line 1074-1075): add optional fields. `StepRecord` gains `kind?: string, scope_evidence?: string | null, judged_by?: string, judgment_evidence?: string`; `CaseResult` gains `pending_judgment?: number[]`. Do not write a quoted outcome literal in these comments.
  2. `summarizeEntries`: change only the loop line to `for (const e of entries) if (Object.hasOwn(counts, e.outcome)) counts[e.outcome]++;` (an entry without a final outcome adds to no count). The return of exactly `counts`, `record_resolved` and `partially_executed` is unchanged.
  3. Directly after `summarizeEntries` (still outside any pinned marker, before the `// The reason classes:` comment) insert the pure helpers:
     ```js

     /**
      * Whether a driver result is a case that holds judge steps awaiting a verdict: the internal pending value, a
      * non-empty list of step positions and nothing else. The one exception to the closed outcome vocabulary. Pure.
      * @param {any} result
      * @returns {boolean}
      */
     export function isPendingResult(result) {
       return isObj(result) && result.outcome === PENDING_JUDGMENT && Array.isArray(result.pending_judgment) && result.pending_judgment.length > 0;
     }

     /**
      * The judgment block of `results.json`: how many judge steps wait for a verdict and how many have one. `null`
      * when no entry holds a judge step, so a run without one keeps the file it always had. Pure and total.
      * @param {any[]} entries
      * @returns {{ pending_steps: number, judged_steps: number } | null}
      */
     export function summarizeJudgment(entries) {
       let seen = 0;
       let pending = 0;
       let judged = 0;
       for (const e of Array.isArray(entries) ? entries : []) {
         for (const s of isObj(e) && Array.isArray(e.steps) ? e.steps : []) {
           if (!isObj(s) || s.action !== 'judge') continue;
           seen++;
           if (s.result === PENDING_JUDGMENT) pending++;
           else if (s.judged_by === 'model' && (s.result === 'passed' || s.result === 'failed' || s.result === 'uncertain')) judged++;
         }
       }
       return seen === 0 ? null : { pending_steps: pending, judged_steps: judged };
     }
     ```
     (`isPendingResult` sits before `summarizeEntries`' neighbours only; if the Implementer prefers, it may sit with the driver helpers, but never between `export function precheckGroundedSteps(` and `export function summarizeEntries(`.)
  4. In `DRIVERS.browser`: (a) before the `try {` that opens the browser block, next to `valueMasks`, add `/** @type {Map<number, string>} */ const judgeKinds = new Map();`, `/** @type {Map<number, string>} */ const judgeScope = new Map();` and `/** @type {number[]} */ const pendingAt = [];`. (b) In the `else if` chain, directly before the final `else {` whose comment begins "Every action the validator accepts has a branch above", insert:
     ```js
           } else if (step.action === 'judge') {
             // The capture is what a person would look at; the verdict is recorded later by the command session.
             const masks = [page.locator('input[type=password]'), ...valueMasks];
             /** @type {any} */ let scopeElement = null;
             if (step.within !== undefined) {
               const scoped = scopeOf(step.within);
               const found = scoped.ok ? await resolveScopeElement(page, scoped.scope) : { ok: false, count: 0 };
               if (!found.ok) {
                 verdict = needsHuman('STEP_UNGROUNDED', `step ${n}: the judge scope matched ${found.count} elements at run time; a scope must match exactly one, so nothing was captured or judged`);
                 break;
               }
               scopeElement = found.locator;
             }
             try {
               const pageText = await page.innerText('body').catch(() => '');
               queryEvidence.set(
                 i,
                 containsSecret(pageText, ctx.table)
                   ? writeEvidence(ctx, `case-${kase.index}.judge-${n}.txt`, { kind: 'text', value: pageText })
                   : writeEvidence(ctx, `case-${kase.index}.judge-${n}.png`, { kind: 'binary', value: await captureFinalPng(page, masks) }),
               );
               if (scopeElement !== null) {
                 const scopeText = await scopeElement.innerText({ timeout: 5000 }).catch(() => '');
                 judgeScope.set(
                   i,
                   containsSecret(scopeText, ctx.table)
                     ? writeEvidence(ctx, `case-${kase.index}.judge-${n}.scope.txt`, { kind: 'text', value: scopeText })
                     : writeEvidence(ctx, `case-${kase.index}.judge-${n}.scope.png`, { kind: 'binary', value: await captureElementPng(scopeElement, masks) }),
                 );
               }
             } catch {
               verdict = blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the judge capture could not be taken or written`);
               break;
             }
             judgeKinds.set(i, step.kind);
             pendingAt.push(i);
     ```
     The inserted text begins with the `} else if (...) {` that closes the preceding branch; keep the surrounding braces balanced (`node --check` is the gate).
     (c) Replace the three lines that build `stepsOut`, `allEvidence` and the two returns (the block quoted in `## Patterns to Mirror`) with:
     ```js
         const recorded = recordSteps(plan.steps, ranTo + 1, verdict !== null ? ranTo : -1, (j) => queryEvidence.get(j) ?? (j === ranTo ? evidence[0] ?? null : null));
         // A captured judge step waits for a verdict only when no other step ended the case; otherwise it is moot.
         const stepsOut = recorded.map((rec, j) => (judgeKinds.has(j)
           ? { ...rec, result: verdict === null ? PENDING_JUDGMENT : 'not-judged', kind: judgeKinds.get(j), scope_evidence: judgeScope.get(j) ?? null }
           : rec));
         const allEvidence = [...queryEvidence.values(), ...judgeScope.values(), ...evidence];
         if (verdict !== null) return { ...verdict, evidence: allEvidence, steps: stepsOut };
         if (pendingAt.length > 0) return { outcome: PENDING_JUDGMENT, reason_code: null, reason: null, evidence: allEvidence, steps: stepsOut, pending_judgment: pendingAt.map((j) => j + 1) };
         return { outcome: 'pass', reason_code: null, reason: null, evidence: allEvidence, steps: stepsOut };
     ```
     and keep the comment line above it ("The final capture reflects the state after the last step that ran...").
  5. In `runRun`: (a) replace the guard line with `if (!OUTCOMES.includes(result.outcome) && !isPendingResult(result)) result = blocked('RUNNER_ERROR', 'an internal path produced a value outside the closed vocabulary');` (the message text is unchanged: a test pins it). (b) Leave the line `const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';` byte-identical; directly after it add `const pending = isPendingResult(result);`. (c) In the `entries.push({ ... })` object replace `outcome: result.outcome,` with `outcome: pending ? null : result.outcome,`, replace `manual_steps_verbatim: keepSteps ? c.manual_steps_verbatim : null,` with `manual_steps_verbatim: keepSteps || pending ? c.manual_steps_verbatim : null,` and add, as the last property, `...(pending ? { pending_judgment: result.pending_judgment } : {}),`. (d) After `const needsHuman = summarizeNeedsHuman(entries);` add `const judgment = summarizeJudgment(entries);` and in the `results` object, directly after `needs_human_gap: needsHuman.needs_human_gap,`, add `...(judgment === null ? {} : { judgment }),`. (e) In the printed lines, change the per-case line to `` `  case ${e.index}: ${e.outcome === null ? 'pending-judgment' : e.outcome}${e.reason_code ? ` (${e.reason_code})` : ''}` `` and, keeping the order of the existing lines (the first line, `Partially executed`, `Needs-human steps`, then the per-case lines), add directly before the `Results:` line a conditional spread for a pending run: `...(judgment !== null && judgment.pending_steps > 0 ? [`Pending judgment: ${judgment.pending_steps} step(s); record each verdict with qa-run.mjs judge`, ...entries.flatMap((e) => (Array.isArray(e.steps) ? e.steps : []).filter((s) => s.result === PENDING_JUDGMENT).map((s) => `  judge case ${e.index} step ${s.index} (${s.kind}): ${s.evidence}${s.scope_evidence ? ` and ${s.scope_evidence}` : ''}`))] : []),`.
  6. The JSDoc of `captureElementPng` says "no step uses it yet": replace that clause with "the `judge` step uses it for a scoped capture" (comment only; keep the function body and signature).
  Constraints: the first printed line and the order `Partially executed` then `Needs-human steps` then the per-case lines stay as they are; no new `writeFileSync(` or `renameSync(`; no static or dynamic import; the evidence file names are fixed patterns (`case-<index>.judge-<step>.png|txt` and `.scope.png|txt`); nothing prints a criterion, a locator word or page text.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3301-3305` (the result assembly), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2692-2697` (the scope resolution reused as is), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2158-2166` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:4375-4393` (the two edited places).
- **VALIDATE**: delivers AC-A3 (pending state) and AC-A4 (the capture) at unit level; the real browser behaviour is gated by the Level 3 end-to-end script, which is run again here once Task 3 exists. Fails on the unmodified tree (the helpers are not exported; `summarizeEntries` counts a null outcome into a bogus key) and passes after. It also pins that a judge-free summary is unchanged and that the pending value cannot masquerade as an outcome.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  for (const n of ["isPendingResult", "summarizeJudgment"]) assert.equal(typeof m[n], "function", n + " is not exported");
  const s = m.summarizeEntries([{ outcome: "pass" }, { outcome: null }, { outcome: "fail" }, { outcome: "needs-human", reason_code: "PARTIAL_REMAINDER" }, { outcome: undefined }, { outcome: "pending" }]);
  assert.deepEqual(s.counts, { pass: 1, fail: 1, blocked: 0, "needs-human": 1 });
  assert.deepEqual(Object.keys(s.counts), ["pass", "fail", "blocked", "needs-human"]);
  assert.deepEqual(Object.keys(s), ["counts", "record_resolved", "partially_executed"]);
  assert.equal(s.partially_executed, 1);
  assert.deepEqual(m.summarizeEntries([]), { counts: { pass: 0, fail: 0, blocked: 0, "needs-human": 0 }, record_resolved: 0, partially_executed: 0 });
  const P = m.PENDING_JUDGMENT;
  assert.equal(m.isPendingResult({ outcome: P, pending_judgment: [2] }), true);
  for (const bad of [{ outcome: P }, { outcome: P, pending_judgment: [] }, { outcome: P, pending_judgment: "2" }, { outcome: "pass", pending_judgment: [2] }, { outcome: "passed" }, null, undefined, 7, "x", []]) assert.equal(m.isPendingResult(bad), false, JSON.stringify(bad));
  assert.equal(m.summarizeJudgment([]), null);
  assert.equal(m.summarizeJudgment([{ steps: [{ action: "goto", result: "passed" }] }, null, 7]), null);
  assert.equal(m.summarizeJudgment("x"), null);
  const entries = [
    { outcome: null, steps: [{ action: "judge", result: P }, { action: "judge", result: P }, { action: "goto", result: "passed" }] },
    { outcome: "pass", steps: [{ action: "judge", result: "passed", judged_by: "model" }, { action: "judge", result: "failed", judged_by: "model" }, { action: "judge", result: "uncertain", judged_by: "model" }, { action: "judge", result: "passed" }] },
    { outcome: "fail", steps: [{ action: "judge", result: "not-judged" }] },
  ];
  assert.deepEqual(m.summarizeJudgment(entries), { pending_steps: 2, judged_steps: 3 });
  const source = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const literals = [...source.matchAll(/outcome\s*[:=]\s*[\x27"]([^\x27"]+)[\x27"]/g)].map((x) => x[1]);
  for (const v of literals) assert.ok(["pass", "fail", "blocked", "needs-human"].includes(v), "an outcome literal outside the closed vocabulary: " + v);
  assert.ok(source.includes("export const OUTCOMES = [\x27pass\x27, \x27fail\x27, \x27blocked\x27, \x27needs-human\x27];"));
  assert.ok(source.includes("const keepSteps = result.outcome === \x27blocked\x27 || result.outcome === \x27needs-human\x27;"), "the keepSteps anchor line changed");
  assert.equal(source.split("const abs = join(ctx.runDirAbs, \x27evidence\x27, name);").length - 1, 1, "the evidence-writer anchor line must occur exactly once");
  assert.ok(source.includes("an internal path produced a value outside the closed vocabulary"));
  for (const token of ["case-${kase.index}.judge-${n}.png", "case-${kase.index}.judge-${n}.scope.png", "resolveScopeElement(page, scoped.scope)", "captureElementPng(scopeElement, masks)"]) assert.ok(source.includes(token), "missing: " + token);
  '
  ```

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the `judge` mode: `parseJudgeArgs`, `settleJudgedCase`, `applyJudgeVerdict`, `runJudge`, the dispatch and the usage text

- **ACTION**: Delivers AC-A3 (PRD AC-13, the mode, the recomputation, the refusals, `uncertain`) and the usage half of AC-A5 (PRD AC-22). Four edits in `plugins/relay/scripts/qa-run.mjs`.
  1. Usage. (a) Directly after the `GROUND_USAGE_LINE` declaration add
     ```js
     /** The one `judge` usage line, shared by USAGE and JUDGE_USAGE so the two cannot drift. */
     const JUDGE_USAGE_LINE = '  qa-run.mjs judge --run-dir <rel-dir> --case <n> --step <k> --verdict <pass|fail|uncertain> --evidence "<what the capture shows>" [--root <dir>]';
     ```
     (b) in `USAGE`, add `${JUDGE_USAGE_LINE}` on its own line directly after the `${GROUND_USAGE_LINE}` line and before `  qa-run.mjs --help` (the ground line must stay the first line that contains `qa-run.mjs ground`; the judge line must not contain `qa-run.mjs run` or `qa-run.mjs init`). (c) In the header docblock "Usage:" list (lines 12-17) add the line `` *   node <plugin-root>/scripts/qa-run.mjs judge --run-dir <rel-dir> --case <n> --step <k> --verdict pass|fail|uncertain --evidence "<text>" [--root <dir>] `` after the `ground` line, and in the "Modes:" list add a paragraph `judge  records one verdict of one pending judge step and recomputes results.json; it never calls a model.` after the `ground` paragraph (keep the existing header text before the first `\nimport ` intact, and keep `qa-run.mjs ground --root` in it).
  2. Pure functions. Insert after `runGroundGuarded` and before `main` (outside every pinned section):
     ```js
     /**
      * Parses the arguments of the judge mode. Pure and total. Every flag takes a value that does not start with `--`;
      * `--case` and `--step` are positive integers, `--verdict` is one of JUDGE_VERDICTS and `--evidence` is a text of
      * JUDGE_EVIDENCE_MIN to JUDGE_EVIDENCE_MAX characters once trimmed. A refusal carries a fixed sentence that names a
      * flag and never a value.
      * @param {any} argv
      * @returns {{ ok: true, root: string, runDir: string, caseIndex: number, stepIndex: number, verdict: string, evidence: string } | { ok: false, why: string }}
      */
     export function parseJudgeArgs(argv) {
       /** @param {string} why @returns {{ ok: false, why: string }} */
       const refuse = (why) => ({ ok: false, why });
       if (!Array.isArray(argv)) return refuse('JUDGE_ARGUMENTS_INVALID: the arguments must be a list');
       /** @type {Record<string, string>} */ const given = {};
       for (let i = 0; i < argv.length; i++) {
         const a = argv[i];
         if (!isStr(a) || !['--root', '--run-dir', '--case', '--step', '--verdict', '--evidence'].includes(a)) return refuse('JUDGE_ARGUMENTS_INVALID: an unknown argument');
         const v = argv[i + 1];
         if (!isStr(v) || v.startsWith('--')) return refuse(`JUDGE_ARGUMENTS_INVALID: ${a} needs a value`);
         if (Object.hasOwn(given, a)) return refuse(`JUDGE_ARGUMENTS_INVALID: ${a} is given twice`);
         given[a] = v;
         i++;
       }
       if (!Object.hasOwn(given, '--run-dir')) return refuse('JUDGE_ARGUMENTS_INVALID: --run-dir is required');
       if (!Object.hasOwn(given, '--case') || !/^[1-9]\d*$/.test(given['--case'])) return refuse('JUDGE_ARGUMENTS_INVALID: --case must be a positive integer');
       if (!Object.hasOwn(given, '--step') || !/^[1-9]\d*$/.test(given['--step'])) return refuse('JUDGE_ARGUMENTS_INVALID: --step must be a positive integer');
       if (!Object.hasOwn(given, '--verdict') || !JUDGE_VERDICTS.includes(given['--verdict'])) return refuse('JUDGE_ARGUMENTS_INVALID: --verdict must be pass, fail or uncertain');
       const evidence = Object.hasOwn(given, '--evidence') ? given['--evidence'].trim() : '';
       if (evidence === '') return refuse('JUDGE_EVIDENCE_REQUIRED: a verdict is recorded only with --evidence, the text of what the capture shows');
       if (evidence.length < JUDGE_EVIDENCE_MIN || evidence.length > JUDGE_EVIDENCE_MAX) {
         return refuse(`JUDGE_EVIDENCE_REQUIRED: --evidence must be ${JUDGE_EVIDENCE_MIN} to ${JUDGE_EVIDENCE_MAX} characters`);
       }
       return { ok: true, root: resolve(Object.hasOwn(given, '--root') ? given['--root'] : process.cwd()), runDir: given['--run-dir'], caseIndex: Number(given['--case']), stepIndex: Number(given['--step']), verdict: given['--verdict'], evidence };
     }

     /**
      * The final outcome of a case whose judge steps all have a verdict: any `failed` judge step gives `fail`, else any
      * `uncertain` one gives `needs-human` with `JUDGEMENT_UNCERTAIN`, else `pass`; a `pass` of a plan entry with
      * `human_remainder` becomes `PARTIAL_REMAINDER` through `applyPartialRemainder`. A reason is a fixed sentence with a
      * step position; it never carries the verdict text. Pure and total.
      * @param {any} entry the results.json case entry
      * @param {any} planEntry its plan entry, or undefined
      * @returns {CaseResult}
      */
     export function settleJudgedCase(entry, planEntry) {
       const steps = isObj(entry) && Array.isArray(entry.steps) ? entry.steps : [];
       const evidence = isObj(entry) && Array.isArray(entry.evidence) ? entry.evidence : [];
       const judged = steps.filter((/** @type {any} */ s) => isObj(s) && s.action === 'judge');
       const failed = judged.find((/** @type {any} */ s) => s.result === 'failed');
       if (failed !== undefined) return { outcome: 'fail', reason_code: null, reason: `step ${failed.index}: the judged criterion was not met`, evidence, steps };
       const unsure = judged.find((/** @type {any} */ s) => s.result === 'uncertain');
       if (unsure !== undefined) {
         return { outcome: 'needs-human', reason_code: 'JUDGEMENT_UNCERTAIN', reason: `step ${unsure.index}: ${REASON_CATALOGUE.JUDGEMENT_UNCERTAIN.reason}`, evidence, steps };
       }
       return applyPartialRemainder({ outcome: 'pass', reason_code: null, reason: null, evidence, steps }, planEntry);
     }

     /**
      * Records one verdict in a parsed results.json and returns the recomputed document, or a refusal. The step must be a
      * `judge` step of a case that has no outcome yet and is still `pending-judgment`: a recorded verdict is never
      * replaced. When the case has no pending step left it is settled; the counts, the two needs-human counters, the
      * classification block and the judgment block are recomputed from the entries. Pure and total; the input is not
      * mutated and no reason carries the verdict text.
      * @param {any} results
      * @param {any} planEntry
      * @param {{ caseIndex: number, stepIndex: number, verdict: string, evidencePath: string }} req
      * @returns {{ ok: true, results: any, settled: boolean, pendingSteps: number } | { ok: false, code: string, reason: string }}
      */
     export function applyJudgeVerdict(results, planEntry, req) {
       /** @param {string} code @param {string} reason @returns {{ ok: false, code: string, reason: string }} */
       const refuse = (code, reason) => ({ ok: false, code, reason });
       if (!isObj(results) || !Array.isArray(results.cases) || !isObj(req) || !JUDGE_VERDICTS.includes(req.verdict)) {
         return refuse('JUDGE_RESULTS_UNREADABLE', 'results.json is not a results document the judge mode can update');
       }
       const next = JSON.parse(JSON.stringify(results));
       const entry = next.cases.find((/** @type {any} */ c) => isObj(c) && c.index === req.caseIndex);
       const rec = isObj(entry) && Array.isArray(entry.steps) ? entry.steps.find((/** @type {any} */ s) => isObj(s) && s.index === req.stepIndex) : undefined;
       if (!isObj(entry) || entry.outcome !== null || !isObj(rec) || rec.action !== 'judge' || rec.result !== PENDING_JUDGMENT) {
         return refuse('JUDGE_STEP_NOT_PENDING', `step ${req.stepIndex} of case ${req.caseIndex} is not a judge step that awaits a verdict`);
       }
       rec.result = req.verdict === 'pass' ? 'passed' : req.verdict === 'fail' ? 'failed' : 'uncertain';
       rec.judged_by = 'model';
       rec.judgment_evidence = req.evidencePath;
       const waiting = entry.steps.filter((/** @type {any} */ s) => isObj(s) && s.action === 'judge' && s.result === PENDING_JUDGMENT);
       if (waiting.length === 0) {
         const settled = settleJudgedCase(entry, planEntry);
         entry.outcome = settled.outcome;
         entry.reason_code = settled.reason_code;
         entry.reason = settled.reason;
         entry.steps = settled.steps;
         delete entry.pending_judgment;
         if (settled.outcome !== 'needs-human' && settled.outcome !== 'blocked') entry.manual_steps_verbatim = null;
       } else {
         entry.pending_judgment = waiting.map((/** @type {any} */ s) => s.index);
       }
       const sums = summarizeEntries(next.cases);
       next.counts = sums.counts;
       next.record_resolved = sums.record_resolved;
       next.partially_executed = sums.partially_executed;
       const needs = summarizeNeedsHuman(next.cases);
       next.needs_human_impossible = needs.needs_human_impossible;
       next.needs_human_gap = needs.needs_human_gap;
       next.classification = summarizeClassification(next.cases);
       const judgment = summarizeJudgment(next.cases);
       if (judgment !== null) next.judgment = judgment;
       const pendingSteps = judgment === null ? 0 : judgment.pending_steps;
       return { ok: true, results: next, settled: waiting.length === 0, pendingSteps };
     }
     ```
  3. The impure part, directly after the three functions:
     ```js
     const JUDGE_USAGE = `Usage:
     ${JUDGE_USAGE_LINE}
       The verdict is recorded for one judge step that run left pending-judgment; --evidence is the text of what the capture visibly shows, never a secret or a personal value. A recorded verdict is never replaced.
     `;

     /**
      * Records one verdict of one pending judge step and rewrites results.json. It reads and writes only inside one run
      * directory, spawns nothing and calls no model. The verdict text goes to an evidence file under the ignored
      * `evidence/` directory through `writeEvidence`; results.json carries only fixed sentences and paths and is
      * rewritten through `writeRunFile`, the one writer.
      * @param {string[]} argv
      * @returns {Promise<number>}
      */
     async function runJudge(argv) {
       const a = parseJudgeArgs(argv);
       if (!a.ok) {
         process.stderr.write(`${a.why}\n${JUDGE_USAGE}`);
         return 2;
       }
       const root = a.root;
       const runDirAbs = resolve(root, a.runDir);
       const runDirRel = fwd(relative(root, runDirAbs));
       if (!/^PRPs\/reports\/[a-z0-9][a-z0-9-]*\/qa-run\/[^/]+$/.test(runDirRel) || !existsSync(runDirAbs) || !statSync(runDirAbs).isDirectory()) {
         process.stderr.write(`--run-dir must be an existing run directory inside PRPs/reports/<feature>/qa-run/\n${JUDGE_USAGE}`);
         return 2;
       }
       requireRunIgnore(runDirAbs);
       const results = readJsonOrNull(join(runDirAbs, 'results.json'));
       if (!isObj(results) || results.schema_version !== 1 || !Array.isArray(results.cases)) {
         throw new Halt('JUDGE_RESULTS_UNREADABLE', 'results.json is missing or is not a results document; run the plan first');
       }
       const plan = readJsonOrNull(join(runDirAbs, 'plan.json'));
       const planEntry = isObj(plan) && Array.isArray(plan.cases) ? plan.cases.find((/** @type {any} */ e) => isObj(e) && e.index === a.caseIndex) : undefined;
       const table = buildRedactionTable({ root, env: process.env, secretValues: [] });
       const name = `case-${a.caseIndex}.judge-${a.stepIndex}.verdict.json`;
       const evidencePath = `${runDirRel}/evidence/${name}`;
       const applied = applyJudgeVerdict(results, planEntry, { caseIndex: a.caseIndex, stepIndex: a.stepIndex, verdict: a.verdict, evidencePath });
       if (!applied.ok) throw new Halt(applied.code, applied.reason);
       try {
         writeEvidence({ runDirAbs, runDirRel, table }, name, { kind: 'json', value: { case: a.caseIndex, step: a.stepIndex, verdict: a.verdict, evidence: a.evidence, recorded_at: now() } });
       } catch {
         throw new Halt('EVIDENCE_WRITE_FAILED', 'the verdict could not be written; results.json was not changed');
       }
       try {
         writeRunFile({ runDirAbs, table }, join(runDirAbs, 'results.json'), { kind: 'json', value: applied.results });
       } catch {
         throw new Halt('FAILED_RESULTS_WRITE_FAILED', 'results.json could not be written');
       }
       const settledEntry = applied.results.cases.find((/** @type {any} */ c) => isObj(c) && c.index === a.caseIndex);
       process.stdout.write(`JUDGED: case ${a.caseIndex} step ${a.stepIndex} verdict=${a.verdict}\n`);
       process.stdout.write(applied.settled ? `CASE_SETTLED: case ${a.caseIndex} outcome=${settledEntry.outcome}${settledEntry.reason_code ? ` (${settledEntry.reason_code})` : ''}\n` : `CASE_PENDING: case ${a.caseIndex} has ${settledEntry.pending_judgment.length} step(s) left\n`);
       process.stdout.write(applied.pendingSteps === 0 ? 'RESULTS: final\n' : `RESULTS: pending ${applied.pendingSteps} step(s)\n`);
       process.stdout.write(`${HUMAN_GATE_SENTENCE}\n`);
       return 0;
     }

     /**
      * @param {string[]} argv
      * @returns {Promise<number>}
      */
     async function runJudgeGuarded(argv) {
       try {
         return await runJudge(argv);
       } catch (err) {
         if (err instanceof Halt) {
           process.stderr.write(`${err.message}\n`);
           return 1;
         }
         process.stderr.write('FAILED_RUNNER_ERROR: the runner stopped on an unexpected error\n');
         return 1;
       }
     }
     ```
  4. In `main`, directly after the `if (argv[0] === 'ground') return await runGroundGuarded(argv.slice(1));` line add `if (argv[0] === 'judge') return await runJudgeGuarded(argv.slice(1));`.
  Constraints: `parseArgs` and its mode list are not edited; the Halt codes are the two new `JUDGE_RESULTS_UNREADABLE` and `JUDGE_STEP_NOT_PENDING` plus the existing `EVIDENCE_WRITE_FAILED` and the printed `FAILED_RESULTS_WRITE_FAILED`; no `spawnSync` is added; nothing prints the verdict text; `now()` is the script's own clock; the verdict is validated and the new document computed BEFORE anything is written, so a refused verdict writes nothing; do not write `waitForLoadState(` or `buildRedactionTable(` before `requireRunIgnore(` inside a function placed in a pinned section (these functions are in none).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:4945-4947`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:4928-4939`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:4684-4710`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:2607-2611` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1640-1652`.
- **VALIDATE**: delivers AC-A3 end to end through the REAL runner binary, with no browser: it hand-builds a pending `results.json` and `plan.json` in a temp run directory and drives the mode. Fails on the unmodified tree (`judge` is an unknown mode, exit 2 for every call) and passes after. It checks the refusals first (nothing written, results byte-identical), then the lifecycle: a case with two pending steps stays without an outcome after the first verdict and settles after the second; `fail` wins over `uncertain`; `uncertain` ends `needs-human` `JUDGEMENT_UNCERTAIN`; a pass of a partial plan becomes `PARTIAL_REMAINDER`; the counters and the classification block recompute; a second verdict for a step is refused; the verdict text appears only in the evidence file.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { spawnSync } from "node:child_process";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  assert.ok(m.USAGE.split("\n").some((l) => l.includes("qa-run.mjs judge") && l.includes("--evidence")), "the usage text lacks the judge line");
  assert.ok(m.USAGE.split("\n").find((l) => l.includes("qa-run.mjs ground")).includes("--prefix"), "the ground line must stay the first line that names ground");
  for (const n of ["parseJudgeArgs", "settleJudgedCase", "applyJudgeVerdict"]) assert.equal(typeof m[n], "function", n + " is not exported");
  const RUNNER = join(process.cwd(), "plugins", "relay", "scripts", "qa-run.mjs");
  const RUN_REL = "PRPs/reports/judge-demo/qa-run/20261021T000000000Z";
  const MARK = "ZZ-VERDICT-TEXT-MARKER";
  const root = mkdtempSync(join(tmpdir(), "relay-phase5-"));
  try {
    const runDir = join(root, ...RUN_REL.split("/"));
    mkdirSync(join(runDir, "evidence"), { recursive: true });
    const stamp = "2026-10-21T10:00:00.123Z";
    const J = (index, result = "pending-judgment") => ({ index, action: "judge", result, evidence: RUN_REL + "/evidence/c.judge-" + index + ".png", kind: "visual", scope_evidence: null });
    const base = (index, extra) => ({ index, title: "Case " + index, risk: "low", outcome: null, reason_code: null, reason: null, driver: "browser", role: null, started_at: stamp, finished_at: stamp, duration_ms: 1, evidence: [RUN_REL + "/evidence/c.png"], class: "automatable", objective_steps: 4, manual_steps_verbatim: "1. Open.\n2. Check.", ...extra });
    const steps = (...js) => [{ index: 1, action: "goto", result: "passed", evidence: null }, { index: 2, action: "expect_visible", result: "passed", evidence: null }, ...js];
    const doc = { schema_version: 1, feature: "judge-demo", run_id: "20261021T000000000Z", started_at: stamp, finished_at: stamp, counts: { pass: 0, fail: 0, blocked: 0, "needs-human": 1 }, record_resolved: 0, partially_executed: 0, needs_human_impossible: 0, needs_human_gap: 0, human_gate: { status: "open", review_file: "PRPs/reports/judge-demo/qa-report.md" }, cases: [
      base(1, { steps: steps(J(3), J(4)), pending_judgment: [3, 4] }),
      base(2, { steps: steps(J(3), J(4)), pending_judgment: [3, 4] }),
      base(3, { steps: steps(J(3)), pending_judgment: [3] }),
      base(4, { steps: steps(J(3)), pending_judgment: [3] }),
      base(5, { outcome: "needs-human", reason_code: "STEP_UNGROUNDED", reason: "r", steps: steps() }),
    ] };
    const resultsPath = join(runDir, "results.json");
    writeFileSync(resultsPath, JSON.stringify(doc, null, 2) + "\n");
    writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: [{ index: 4, title: "Case 4", driver: "browser", human_remainder: { reason: "the rest is human" } }] }));
    const judge = (...args) => spawnSync(process.execPath, [RUNNER, "judge", "--root", root, "--run-dir", RUN_REL, ...args], { cwd: root, encoding: "utf8", timeout: 60000 });
    const read = () => JSON.parse(readFileSync(resultsPath, "utf8"));
    const before = readFileSync(resultsPath, "utf8");
    const ev = "The panel shows the ZZ-VERDICT-TEXT-MARKER heading and the summary text.";
    for (const bad of [["--case", "1", "--step", "3", "--verdict", "pass"], ["--case", "1", "--step", "3", "--verdict", "pass", "--evidence", ""], ["--case", "1", "--step", "3", "--verdict", "pass", "--evidence", "short"], ["--case", "1", "--step", "3", "--verdict", "pass", "--evidence", "x".repeat(2001)], ["--case", "1", "--step", "3", "--verdict", "maybe", "--evidence", ev], ["--case", "0", "--step", "3", "--verdict", "pass", "--evidence", ev], ["--case", "1", "--step", "x", "--verdict", "pass", "--evidence", ev], ["--case", "1", "--verdict", "pass", "--evidence", ev], ["--case", "1", "--step", "3", "--verdict", "pass", "--evidence", ev, "--extra", "x"]]) {
      const r = judge(...bad);
      assert.equal(r.status, 2, JSON.stringify(bad) + " -> " + r.stdout + r.stderr);
      assert.ok(r.stderr.includes("Usage:"), r.stderr);
    }
    const missing = judge("--case", "1", "--step", "3", "--verdict", "pass");
    assert.ok(missing.stderr.includes("JUDGE_EVIDENCE_REQUIRED"), missing.stderr);
    assert.equal(readFileSync(resultsPath, "utf8"), before, "a refused verdict changed results.json");
    assert.deepEqual(existsSync(join(runDir, "evidence")) ? readdirSync(join(runDir, "evidence")) : [], [], "a refused verdict wrote evidence");
    for (const notPending of [["--case", "1", "--step", "1"], ["--case", "1", "--step", "9"], ["--case", "9", "--step", "3"], ["--case", "5", "--step", "3"]]) {
      const r = judge(...notPending, "--verdict", "pass", "--evidence", ev);
      assert.equal(r.status, 1, JSON.stringify(notPending) + r.stdout + r.stderr);
      assert.ok(r.stderr.includes("JUDGE_STEP_NOT_PENDING"), r.stderr);
    }
    assert.equal(readFileSync(resultsPath, "utf8"), before, "a refused step changed results.json");
    const first = judge("--case", "1", "--step", "3", "--verdict", "pass", "--evidence", ev);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.ok(first.stdout.includes("CASE_PENDING"), first.stdout);
    assert.ok(first.stdout.includes("RESULTS: pending 5 step(s)"), first.stdout);
    assert.ok(!first.stdout.includes(MARK) && !first.stderr.includes(MARK), "the verdict text was printed");
    let r1 = read();
    assert.equal(r1.cases[0].outcome, null);
    assert.deepEqual(r1.cases[0].pending_judgment, [4]);
    assert.deepEqual(r1.counts, { pass: 0, fail: 0, blocked: 0, "needs-human": 1 });
    assert.deepEqual(r1.judgment, { pending_steps: 5, judged_steps: 1 });
    assert.equal(r1.cases[0].steps[2].result, "passed");
    assert.equal(r1.cases[0].steps[2].judged_by, "model");
    assert.equal(r1.cases[0].steps[2].judgment_evidence, RUN_REL + "/evidence/case-1.judge-3.verdict.json");
    const again = judge("--case", "1", "--step", "3", "--verdict", "fail", "--evidence", ev);
    assert.equal(again.status, 1, "a recorded verdict was replaced");
    assert.ok(again.stderr.includes("JUDGE_STEP_NOT_PENDING"), again.stderr);
    assert.equal(read().cases[0].steps[2].result, "passed");
    assert.equal(judge("--case", "1", "--step", "4", "--verdict", "pass", "--evidence", ev).status, 0);
    let r2 = read();
    assert.equal(r2.cases[0].outcome, "pass");
    assert.equal(r2.cases[0].reason_code, null);
    assert.equal(r2.cases[0].manual_steps_verbatim, null);
    assert.equal("pending_judgment" in r2.cases[0], false);
    assert.equal(r2.counts.pass, 1);
    assert.equal(judge("--case", "2", "--step", "3", "--verdict", "uncertain", "--evidence", ev).status, 0);
    assert.equal(read().cases[1].outcome, null, "an uncertain verdict must wait for the other step");
    assert.equal(judge("--case", "2", "--step", "4", "--verdict", "fail", "--evidence", ev).status, 0);
    const r3 = read();
    assert.equal(r3.cases[1].outcome, "fail", "a failed step wins over an uncertain one");
    assert.ok(r3.cases[1].reason.startsWith("step 4: "), r3.cases[1].reason);
    assert.equal(judge("--case", "3", "--step", "3", "--verdict", "uncertain", "--evidence", ev).status, 0);
    const r4 = read();
    assert.equal(r4.cases[2].outcome, "needs-human");
    assert.equal(r4.cases[2].reason_code, "JUDGEMENT_UNCERTAIN");
    assert.ok(r4.cases[2].manual_steps_verbatim !== null, "a needs-human case keeps its manual steps");
    assert.equal(judge("--case", "4", "--step", "3", "--verdict", "pass", "--evidence", ev).status, 0);
    const done = read();
    assert.equal(done.cases[3].outcome, "needs-human");
    assert.equal(done.cases[3].reason_code, "PARTIAL_REMAINDER", "a judged pass of a partial plan is not a pass");
    assert.equal(done.cases[3].steps[done.cases[3].steps.length - 1].action, "human_remainder");
    assert.deepEqual(done.counts, { pass: 1, fail: 1, blocked: 0, "needs-human": 3 });
    assert.equal(done.partially_executed, 1);
    assert.deepEqual(done.judgment, { pending_steps: 0, judged_steps: 6 });
    assert.deepEqual(done, JSON.parse(JSON.stringify({ ...done, classification: m.summarizeClassification(done.cases) })), "the classification block was not recomputed");
    assert.ok(readFileSync(resultsPath, "utf8").includes("RESULTS: final") === false);
    const lastRun = judge("--case", "9", "--step", "3", "--verdict", "pass", "--evidence", ev);
    assert.equal(lastRun.status, 1);
    const raw = readFileSync(resultsPath, "utf8");
    assert.ok(!raw.includes(MARK), "results.json carries the verdict text");
    const verdictFile = readFileSync(join(runDir, "evidence", "case-1.judge-3.verdict.json"), "utf8");
    assert.ok(verdictFile.includes(MARK), "the verdict text is missing from its evidence file");
    assert.equal(JSON.parse(verdictFile).verdict, "pass");
    assert.ok(!existsSync(join(runDir, "evidence", "case-5.judge-3.verdict.json")));
    console.log("PASS: the judge mode refuses, records, settles and recomputes through the real runner");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  '
  ```
  (`assert.ok(... === false)` on the results file text is a deliberate no-op guard against printing into the file; the `RESULTS: final` string is stdout only. The Implementer may drop that line; the gate does not depend on it.)

### Task 4: UPDATE scripts/validate/checks/qa-run-contract.mjs — accept the pending state in the results rules

- **ACTION**: Delivers AC-A3 (the contract half: a tracked results.json that is mid-judgment is valid) and keeps AC-A6 true. Read lines 128-134 and 207-318 first. Three narrow edits, no new rule set, no new constant export and no new check:
  1. Line 131: `const STEP_RESULTS = ['passed', 'failed', 'not-run', 'human'];` becomes `const STEP_RESULTS = ['passed', 'failed', 'not-run', 'human', 'pending-judgment', 'uncertain', 'not-judged'];`. The message at line 270 (`is outside passed, failed, not-run, human`) is left byte-identical, because a test matches it.
  2. In `validateResults`, directly before the line `const sum = OUTCOME_VALUES.reduce(...)` add `const pendingCases = cases.filter((c) => isPlainObject(c) && c.outcome === null && Array.isArray(c.pending_judgment) && c.pending_judgment.length > 0).length;` and change the comparison to `if (sum + pendingCases !== cases.length) msgs.push(\`cases.length (${cases.length}) does not equal the sum of counts (${sum})\`);` (message text unchanged).
  3. Replace the line `if (!OUTCOME_VALUES.includes(c.outcome)) msgs.push(...)` with `if (!OUTCOME_VALUES.includes(c.outcome) && !(c.outcome === null && Array.isArray(c.pending_judgment) && c.pending_judgment.length > 0)) msgs.push(...)` (message text unchanged).
  Constraints: `OUTCOMES_LITERAL`, `OUTCOME_VALUES`, every source-text rule over `qa-run.mjs` and every doc rule stay as they are; the check still flags an outcome outside the vocabulary, a null outcome without a pending list, and a step result outside the seven; `isPlainObject` already exists in the file.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:224-228` (the partition rule and its message).
- **VALIDATE**: delivers the contract half of AC-A3. It builds a results document that the real runner would write mid-judgment and checks that the contract accepts it, that a null outcome with no pending list is still flagged, and that an unknown step result is still flagged; the first assertion fails on the unmodified tree. Then the real-tree contract and the tests that mutate it.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check scripts/validate/checks/qa-run-contract.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { validateResults, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const stamp = "2026-10-21T10:00:00.123Z";
  const kase = (index, extra) => ({ index, title: "c", risk: "low", outcome: "pass", reason_code: null, reason: null, driver: "browser", role: null, started_at: stamp, finished_at: stamp, duration_ms: 1, evidence: ["e.png"], steps: [{ index: 1, action: "goto", result: "passed", evidence: null }], manual_steps_verbatim: null, ...extra });
  const doc = (cases, counts) => ({ schema_version: 1, started_at: stamp, finished_at: stamp, counts, human_gate: { status: "open" }, cases });
  const pending = kase(2, { outcome: null, pending_judgment: [2], steps: [{ index: 1, action: "goto", result: "passed", evidence: null }, { index: 2, action: "judge", result: "pending-judgment", evidence: "e.png" }] });
  const good = doc([kase(1), pending], { pass: 1, fail: 0, blocked: 0, "needs-human": 0 });
  assert.deepEqual(validateResults(good), [], "a results document that is mid-judgment must be valid");
  const noList = doc([kase(1), { ...pending, pending_judgment: undefined }], { pass: 1, fail: 0, blocked: 0, "needs-human": 0 });
  assert.ok(validateResults(noList).some((x) => x.includes("outcome")), "a null outcome without a pending list must still be flagged");
  const emptyList = doc([kase(1), { ...pending, pending_judgment: [] }], { pass: 1, fail: 0, blocked: 0, "needs-human": 0 });
  assert.ok(validateResults(emptyList).length > 0);
  const unknown = doc([kase(1, { steps: [{ index: 1, action: "goto", result: "maybe", evidence: null }] })], { pass: 1, fail: 0, blocked: 0, "needs-human": 0 });
  assert.ok(validateResults(unknown).some((x) => x.includes("outside passed, failed, not-run, human")), "an unknown step result must still be flagged with the same message");
  const settled = doc([kase(1, { steps: [{ index: 1, action: "judge", result: "uncertain", evidence: "e.png", judged_by: "model" }, { index: 2, action: "judge", result: "not-judged", evidence: null }] })], { pass: 1, fail: 0, blocked: 0, "needs-human": 0 });
  assert.deepEqual(validateResults(settled), []);
  const short = doc([kase(1), pending], { pass: 0, fail: 0, blocked: 0, "needs-human": 0 });
  assert.ok(validateResults(short).some((x) => x.includes("does not equal the sum of counts")), "the partition rule must still catch a missing count");
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-record-resolution.test.mjs scripts/validate/checks/qa-run-classification.test.mjs
  ```
  (This gate needs Tasks 1 to 3 done, because `runQaRunContractCheck` also reads the runner and the command doc.)

### Task 5: UPDATE plugins/relay/commands/relay-qa-run.md — the `judge` step, the judging protocol, one honesty bullet and the `VISUAL_JUDGEMENT` row

- **ACTION**: Delivers AC-A5 (PRD AC-22 for `judge`: a marked literal example that validates, the `judge` mode in the doc, the judging protocol). Five `Edit` calls. Do not touch line 29 (the mode list), the "Result fields" paragraph, the "Per-step results" paragraph, the minted and re-mint paragraphs or any marked example that exists today.
  1. Insert the block below directly before the paragraph that starts `The paragraphs that follow (the declaration schema, origins, query sources, the` (the old text is that one physical line; the new text is the block, a blank line, then that line). The block follows the phase-4 block, so every existing marked example stays first in the file; it contains no marked `expect_requests` example, no example carrying `within`, `name_prefix`, `label_text`, `index`, `effect`, `selector`, `role` or `text`, and none of the strings `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type` or `--local-host`; every code fence is a `json` fence; no paragraph starts with an opener a test pins.
     ````
     A literal `browser` step that hands a capture to a judge:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "judge", "kind": "visual", "criterion": "<copied exactly from the case's manual steps>" }
     ```

     A `judge` step is for a visual, language or checklist judgment that the report's own
     steps ask for and no other step can decide. `kind` is `visual`, `language` or
     `checklist`. `criterion` is the sentence to judge, copied from the case's manual
     steps: once whitespace is collapsed it must appear in them verbatim, with the same
     letters and punctuation, otherwise the entry is `PLAN_ENTRY_INVALID`, so a criterion
     is never invented. The step takes no other key than an optional `within` scope, written
     like the scope of any other step and grounded the same way: with it the runner also
     writes an element screenshot of that scope, and it ends the case `needs-human` with
     `STEP_UNGROUNDED` when the scope does not match exactly one element. A `judge` step
     asserts nothing itself and counts as the expectation of its case. When `run` reaches
     it, the script writes the capture under `<RUN_DIR>/evidence/` (a full-page screenshot,
     or redacted text when the page text holds a secret), records the step as
     `pending-judgment` and leaves the case with no outcome until every verdict of the case
     is recorded (see "Judge the pending captures" in Phase B). It is valid in `browser`
     entries only.
     ````
  2. Insert directly after the second line of this text (the last line of the re-mint paragraph) and before the horizontal rule that precedes `## Final output surface`: `old_string` = `never retried, and the login template and its stamp are unchanged.` followed by a blank line, `---`, a blank line and `## Final output surface` (copy the five lines from the file); `new_string` = the first line, a blank line, the subsection below, a blank line, then the rule and the heading as they were:
     ````
     ### Judge the pending captures

     A case with a `judge` step does not end when `run` finishes. The summary names every
     pending step and its capture, and `results.json` holds that case with `"outcome": null`,
     a `pending_judgment` list of step positions and a top-level `judgment` block. For each
     pending step, in this same session, read its capture with the Read tool (the element
     capture first when the step names a scope; a `.txt` capture is redacted text) and judge
     the step's `criterion` and nothing else, then record the verdict from a fenced bash block,
     one call per step:

     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" judge --run-dir "<RUN_DIR>" --case <n> --step <k> --verdict pass --evidence "<what the capture shows>"
     ```

     The protocol is part of the contract. Answer `pass` only when the capture visibly shows
     what the criterion asks for, and `fail` only when it visibly shows the opposite or shows
     that the criterion is not met. Answer `uncertain`, never a guess, when the capture is
     cropped, still loading, unreadable or does not show enough to decide, and never pass a
     step because the other steps of the case passed. `--evidence` is required, of 10 to 2000
     characters, and states what is visible in the capture in relation to the criterion; it
     never quotes a secret, a token or a personal value. The script refuses a verdict without
     it, writes the text under `<RUN_DIR>/evidence/` and nowhere else, and never replaces a
     recorded verdict. Do not edit `results.json` or any other file yourself and do not call a
     model from the script: the script records, you judge. A case is settled when its last
     pending step has a verdict: any `fail` gives `fail`, else any `uncertain` gives
     `needs-human` with `JUDGEMENT_UNCERTAIN` (a gap that counts against the executed share),
     else `pass`, except that a plan entry with `human_remainder` still ends `needs-human`
     with `PARTIAL_REMAINDER`. Judged steps carry `judged_by` with the value `model`, and
     a judged `pass` is evidence for the human gate, not approval. The last call prints
     `RESULTS: final`; relay the summary of the finished results only after it.
     ````
  3. In the honesty rules, directly after the phase-4 bullet (the three lines `- A value the report leaves open may be chosen only through `chosen_inputs`, from a` / `  declared capture or from the snapshot, and every step that changes data carries` / `  `"effect": "write"`; never type a value you invented.`), add:
     ```
     - Plan a `judge` step only for a visual, language or checklist judgment that the
       report's own steps ask for, with the criterion copied from them; never use it to
       skip a step you can plan with an expectation, and decline with `VISUAL_JUDGEMENT`
       only a judgment that no `judge` step can capture.
     ```
  4. In the reason-code table, the `VISUAL_JUDGEMENT` row (the one physical line that starts `` | `VISUAL_JUDGEMENT` | `needs-human` | `gap` | ``): replace the tail `a judgment of appearance that no step of the vocabulary captures for a judgment yet |` with `a judgment of appearance that no `judge` step can capture, because the report does not state the criterion |`. The row keeps its leading three cells and stays one line.
  5. In Phase B, the exit-code statement is now incomplete (a case with a pending judgment has no outcome): `old_string` = the two physical lines `Exit 0 means every case has` / `an outcome; exit 1 is an aborted run or a named halt (results are still written` and `new_string` = `Exit 0 means every case has` / `an outcome or, for a case with a `judge` step, waits for a verdict; exit 1 is an aborted run or a named halt (results are still written`. Read the lines first; if a pin test (`qa-run-network-docs.test.mjs`, `qa-run-privacy-pins.test.mjs`, `qa-run-contract.test.mjs`) matches the original wording, keep every pinned phrase and add the clause as a separate sentence after the sentence instead.
  Pins to keep (do not disturb): the opening words of the paragraphs the tests locate (`Run-time and scoped locators.`, `Grounding rules.`, `Personal data.`, `Grounding after an interaction.`, `Result fields. Each case in `results.json``, `Variables:`, `Partial plans:`, `Per-step results:`, `Chosen inputs.`, `Seed captures worth using.`) each stay unique and in order; the bullet `Plan `expect_requests` only when` stays directly after `Plan a `ground` prefix only from`; the minted paragraph stays directly followed by the re-mint paragraph; the reason-code table keeps one row per catalogue code; exactly one marked example per scoped key and exactly one marked `effect` write example and one `equals {{username}}` example.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:755-760` (the marked step register) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:975-980` (the Phase B insertion point).
- **VALIDATE**: gate on authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line), then a behavioural check that parses every marked example out of the real document, validates them with the runner's own validators and checks that the judge example is the only one and carries no scoped key, then the contract check and the tests that pin this document. The greps fail on the unmodified tree; the behavioural check fails if the example does not validate; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'A literal `browser` step that hands a capture to a judge:' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '{ "action": "judge", "kind": "visual", "criterion": "<copied exactly from the case'"'"'s manual steps>" }' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '### Judge the pending captures' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" judge --run-dir "<RUN_DIR>" --case <n> --step <k> --verdict pass --evidence "<what the capture shows>"' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'A case with a `judge` step does not end when `run` finishes. The summary names every' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'The protocol is part of the contract. Answer `pass` only when the capture visibly shows' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '- Plan a `judge` step only for a visual, language or checklist judgment that the' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'a judgment of appearance that no `judge` step can capture, because the report does not state the criterion |' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'the runner script (`parse`, `init`, `run`, `ground`) this command calls.' plugins/relay/commands/relay-qa-run.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
  const steps = [...doc.matchAll(/<!-- qa-step-example driver=(\w+) -->\n```json\n([\s\S]*?)\n```/g)].map((x) => ({ driver: x[1], step: JSON.parse(x[2]) }));
  const judge = steps.filter((e) => e.step.action === "judge");
  assert.equal(judge.length, 1, "exactly one marked judge example");
  assert.equal(judge[0].driver, "browser");
  assert.equal(m.validateStep(judge[0].driver, judge[0].step), null);
  assert.deepEqual(Object.keys(judge[0].step).sort(), ["action", "criterion", "kind"], "the judge example must carry no scope and no other key");
  assert.equal(m.validateSteps("browser", [{ action: "goto", path: "/" }, judge[0].step], []), null);
  assert.equal(m.validateJudgeCriteria([judge[0].step], judge[0].step.criterion), null);
  const browser = steps.filter((e) => e.driver === "browser").map((e) => e.step);
  assert.equal(browser.filter((s) => s.within !== undefined && s.index === undefined).length, 1, "within: the one-example rule broke");
  assert.equal(browser.filter((s) => s.name_prefix !== undefined).length, 1, "name_prefix: the one-example rule broke");
  assert.equal(browser.filter((s) => s.label_text !== undefined).length, 1, "label_text: the one-example rule broke");
  assert.equal(browser.filter((s) => s.index !== undefined).length, 1, "index: the one-example rule broke");
  for (const e of steps) assert.equal(m.validateStep(e.driver, e.step), null, JSON.stringify(e.step));
  const opener = (text) => doc.split(/\n\s*\n/).filter((p) => p.replace(/\s+/g, " ").startsWith(text)).length;
  assert.equal(opener("Chosen inputs."), 1);
  assert.equal(opener("Seed captures worth using."), 1);
  assert.equal(opener("Result fields. Each case in `results.json`"), 1);
  assert.ok(doc.indexOf("A literal `browser` step that hands a capture to a judge:") > doc.indexOf("Seed captures worth using."), "the judge block must follow the phase-4 block");
  assert.ok(doc.indexOf("A literal `browser` step that hands a capture to a judge:") < doc.indexOf("The paragraphs that follow (the declaration schema"));
  assert.ok(doc.indexOf("### Judge the pending captures") < doc.indexOf("## Final output surface") && doc.indexOf("### Judge the pending captures") > doc.indexOf("A minted role whose login script halts"));
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-query.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
  ```
  (This task's gate needs Tasks 1 to 4 done.)

### Task 6: UPDATE docs/api-reference.md, docs/domain/glossary.md and docs/domain/flows.md — state the judge step and mode and list the new exports

- **ACTION**: Delivers AC-A5 (the knowledge base) and AC-A6. Narrow `Edit` calls, each `old_string` copied from the file; read the two single-line API rows in full first (lines 129 and 219 are one physical line each). Do not edit `docs/decisions.md`; do not backtick a camelCase or UPPER_SNAKE name in the `/relay-qa-run` row except the catalogue code `JUDGEMENT_UNCERTAIN` that it already names; do not place any backticked UPPER_SNAKE or camelCase name that is not a real export between the tokens `REASON_CATALOGUE` and `USAGE` of the `qa-run.mjs` row.
  1. `docs/api-reference.md`, the `/relay-qa-run` row (line 129), one edit: `old_string` = `otherwise the case is `blocked` `ROLE_NOT_DEDICATED` before any seed, session or request. Reusing a session needs no login and no visible browser.` and `new_string` = `otherwise the case is `blocked` `ROLE_NOT_DEDICATED` before any seed, session or request. A `judge` step (a `kind` of `visual`, `language` or `checklist`, a `criterion` copied verbatim from the case's manual steps and an optional `within` scope) captures its evidence and leaves the case without an outcome until the command session records a verdict with the `judge` mode of `qa-run.mjs`, which needs an evidence text and recomputes `results.json`; an uncertain verdict ends the case `needs-human` with `JUDGEMENT_UNCERTAIN`, and the script never calls a model. Reusing a session needs no login and no visible browser.`
  2. `docs/api-reference.md`, the `qa-run.mjs` row (line 219), two edits. (a) `old_string` = `and `run` (executes a plan, gives every case one outcome, writes `results.json`).` and `new_string` = ``run` (executes a plan, gives every case one outcome except a case that holds a pending judgment, writes `results.json`) and `judge` (records one verdict of one pending judge step, then recomputes `results.json` through the one write helper).` — read the text before `and `run`` in the file: the sentence is a list ending in `... ) and `run` (...)`; keep the list grammatical (`parse`, `init`, `ground`, `run` and `judge`). (b) `old_string` = `and the `USAGE` text, which lists the four modes and the `ground` flags.` and `new_string` = `and the `USAGE` text, which lists the modes `parse`, `init`, `run`, `ground` and `judge` and the flags of `ground` and `judge`. The judge mode is built from `validateJudgeCriteria`, `parseJudgeArgs`, `settleJudgedCase`, `applyJudgeVerdict`, `isPendingResult` and `summarizeJudgment`, with the constants `PENDING_JUDGMENT`, `JUDGE_KINDS`, `JUDGE_VERDICTS`, `JUDGE_CRITERION_MAX`, `JUDGE_EVIDENCE_MIN` and `JUDGE_EVIDENCE_MAX`. The step results `pending-judgment`, `uncertain` and `not-judged` and the `judgment` block exist only for a run that holds a judge step.` Keep every phrase the release tests pin (`chosen, not measured`, the wait and interval phrases, the exit codes).
  3. `docs/domain/glossary.md`: `old_string` = `and `/relay-auth-scripts` never writes. See `plugins/relay/commands/relay-qa-run.md`.` followed by a blank line and `## QA grounding snapshot` (copy the three lines from the file), and `new_string` = the first line, a blank line, the paragraph below, a blank line, then the heading as it was. The paragraph contains neither the token `REASON_CATALOGUE` nor the sentence `Visibility is judged as a person would`, and no UPPER_SNAKE name other than `JUDGEMENT_UNCERTAIN`:
     ```
     A third plan-side declaration of `/relay-qa-run` is the `judge` step, for a visual,
     language or checklist judgment that the report's own steps ask for. Its `criterion`
     must appear verbatim in the case's manual steps, so it is never invented. When `run`
     reaches it the script writes a capture, and an element capture when the step names a
     `within` scope, and records the step as `pending-judgment`; the case has no outcome
     until the command session reads each capture and records a verdict through the `judge`
     mode of `qa-run.mjs` (`pass`, `fail` or `uncertain`, always with a text that says what
     the capture shows). The script never calls a model and never replaces a recorded
     verdict. A judged step is flagged `judged_by` `model`; an `uncertain` verdict ends the
     case `needs-human` with `JUDGEMENT_UNCERTAIN`. See `plugins/relay/commands/relay-qa-run.md`.
     ```
  4. `docs/domain/flows.md`, in the numbered item (keep the 3-space indent on every line): `old_string` = the two lines `   request.` / `   An element that exists only after a click or a fill is grounded in a second` and `new_string` = the first line, then this passage, then the second line:
     ```
        A `judge` step captures a visual, language or checklist criterion that the report
        states, and the case then waits with no outcome: the command session reads each
        capture and records a verdict (`pass`, `fail` or `uncertain`) with the text of what
        it saw through the `judge` mode of `qa-run.mjs`, and the script recomputes
        `results.json` once the last verdict of the case is in. An `uncertain` verdict ends
        the case `needs-human` with `JUDGEMENT_UNCERTAIN`.
     ```
- **MIRROR**: `# SOURCE: docs/domain/flows.md:223-230` (the register and the insertion point); the glossary paragraph follows the register of the phase-4 paragraph before `## QA grounding snapshot`; the API rows are one physical line each and stay one.
- **VALIDATE**: gate on the authored literal in each file (copied byte-for-byte from the ACTION; each sits inside one physical line), assert every name added to the API reference is a real export and that nothing was added to the checked span that is not, then run the tests that read these documents. The greps and the export check fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'A `judge` step (a `kind` of `visual`, `language` or `checklist`, a `criterion` copied verbatim from the case' docs/api-reference.md
  grep -qF -- 'The judge mode is built from `validateJudgeCriteria`, `parseJudgeArgs`, `settleJudgedCase`, `applyJudgeVerdict`, `isPendingResult` and `summarizeJudgment`' docs/api-reference.md
  grep -qF -- 'A third plan-side declaration of `/relay-qa-run` is the `judge` step, for a visual,' docs/domain/glossary.md
  grep -qF -- 'A `judge` step captures a visual, language or checklist criterion that the report' docs/domain/flows.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const names = ["PENDING_JUDGMENT", "JUDGE_KINDS", "JUDGE_VERDICTS", "JUDGE_CRITERION_MAX", "JUDGE_EVIDENCE_MIN", "JUDGE_EVIDENCE_MAX", "validateJudgeCriteria", "isPendingResult", "parseJudgeArgs", "summarizeJudgment", "settleJudgedCase", "applyJudgeVerdict"];
  for (const name of names) assert.ok(Object.hasOwn(m, name), name + " is named in the API reference but is not an export");
  const lines = readFileSync("docs/api-reference.md", "utf8").split("\n");
  const row = lines.filter((l) => l.startsWith("| `qa-run.mjs` "));
  assert.equal(row.length, 1, "exactly one qa-run.mjs row");
  for (const name of names) assert.ok(row[0].includes("`" + name + "`"), name + " is missing from the qa-run.mjs row");
  const from = row[0].indexOf("`REASON_CATALOGUE`");
  const span = row[0].slice(from, row[0].indexOf("`USAGE`", from) + 7);
  for (const tok of span.match(/`[^`]+`/g).map((t) => t.slice(1, -1)).filter((t) => /^(?:[A-Z][A-Z0-9_]+|[a-z]+(?:[A-Z][A-Za-z0-9]*)+)$/.test(t))) assert.ok(Object.hasOwn(m, tok), "a token between REASON_CATALOGUE and USAGE is not an export: " + tok);
  assert.ok(!lines.find((l) => l.startsWith("| `/relay-qa-run ")).match(/`(?:validateJudgeCriteria|isPendingResult|parseJudgeArgs|settleJudgedCase|applyJudgeVerdict|summarizeJudgment|PENDING_JUDGMENT)`/), "the /relay-qa-run row must not backtick the new export names");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

### Task 7: UPDATE documentation/reference/commands.html, documentation/reference/scripts.html and documentation/changelog.html — the site pages and the changelog

- **ACTION**: Delivers AC-A5 (the site pages) and AC-A6 (the changelog entry that `documentation/AGENTS.md` requires). Read `documentation/AGENTS.md` sections 2, 6, 9 and 12 first (no emojis, no inline style, American English, keep structure and ids). Five narrow `Edit` calls, no page added, no heading added inside an entry, no sentence containing `e.g.` or `i.e.` (the release tests split sentences at `. `), no new number, and none of the words `impossible`, `closed catalogue` or `derived by the runner` in the new text.
  1. `documentation/reference/commands.html`, the `Step vocabulary` row: `old_string` = `with <code>ROLE_NOT_DEDICATED</code>. <code>expect_requests</code> counts the requests the page issues` and `new_string` = `with <code>ROLE_NOT_DEDICATED</code>. A <code>judge</code> step captures the evidence of a visual, language or checklist criterion copied from the report and leaves the case without an outcome until the command session records a verdict with <code>qa-run.mjs judge</code>; an uncertain verdict ends the case <code>needs-human</code> with <code>JUDGEMENT_UNCERTAIN</code>. <code>expect_requests</code> counts the requests the page issues`.
  2. `documentation/reference/scripts.html`, the `Assertions and request count` row: `old_string` = `set to <code>true</code>. <code>expect_requests</code> waits` and `new_string` = `set to <code>true</code>. A judge step is checked against the report by <code>validateJudgeCriteria</code>, a verdict is parsed by <code>parseJudgeArgs</code> and applied by <code>applyJudgeVerdict</code>, which settles the case through <code>settleJudgedCase</code> and recomputes the counts, and <code>summarizeJudgment</code> reports the pending and the judged steps. <code>expect_requests</code> waits`. Read the row first: if the exact text before `<code>expect_requests</code> waits` differs, keep the anchor to the shortest unique text that ends at that code element. In the same row (and in the `captureElementPng` mention of `docs/api-reference.md` and of `documentation/reference/commands.html` if any), any clause saying that `captureElementPng` is used by no step yet is now false: reword it to say the `judge` step uses it for a scoped capture, keeping `captureElementPng`, `captureFinalPng` and `CAPTURE_TIMEOUT_MS (30000)` and every phrase `qa-run-visibility-evidence.test.mjs` pins.
  3. `documentation/reference/scripts.html`, the usage block: `old_string` = `[--max-cases &lt;n&gt;]</code></pre>` and `new_string` = `[--max-cases &lt;n&gt;]` + a newline + `node ${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs judge --run-dir &lt;rel-dir&gt; --case &lt;n&gt; --step &lt;k&gt; --verdict &lt;pass|fail|uncertain&gt; --evidence "&lt;what the capture shows&gt;" [--root &lt;dir&gt;]</code></pre>` (the line sits inside the same `<pre>`; the existing `run` line is the last one before the closing tags).
  4. `documentation/changelog.html`, `Added` list: `old_string` = `          titles of seeded entities.</li>` followed by a newline and `      </ul>` (the last two lines of that list, copied from the file) and `new_string` = the first line, then
     ```
             <li><strong>Model judgment</strong> &mdash; a browser plan may carry a <code>judge</code> step for a visual,
               language or checklist criterion that the report&rsquo;s own steps state. The runner captures the evidence
               (plus an element capture when the step names a scope) and leaves the case without an outcome until the
               command session records a verdict with <code>qa-run.mjs judge</code>, which needs an evidence text, never
               replaces a recorded verdict and recomputes <code>results.json</code>. An uncertain verdict ends the case
               <code>needs-human</code> with <code>JUDGEMENT_UNCERTAIN</code>, and the script never calls a model.</li>
     ```
     then the closing `      </ul>` line as it was. Indent the inserted `<li>` lines to match the neighbouring entries (8 spaces before `<li>`, 10 before the continuation lines).
  Constraints: every constant the scripts row names keeps its stated value; add no `id` attribute (every id inside the block must start with `unreleased`), no `<h2`, and no `<li>` whose visible text equals an entry of the 0.46.0 release; the changelog phrases the release tests pin (`ROLE_NOT_DEDICATED`, `counting convention`, `Needs-human steps`, `PRODUCT_DEFECT is only for a case that cannot start`, `JUDGEMENT_UNCERTAIN`) stay in their existing entries; do not touch NAV, the search index, the page subtitle, any heading id, the released sections, the `Classification` rows or `plugins/relay/.claude-plugin/plugin.json`.
- **MIRROR**: `# SOURCE: documentation/changelog.html:56-65` (the shape of an entry and of the closing list tag); the two single-line `<dd>` rows keep their one physical line.
- **VALIDATE**: gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line of its row), then the site tests. The greps fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'A <code>judge</code> step captures the evidence of a visual, language or checklist criterion copied from the report' documentation/reference/commands.html
  grep -qF -- 'A judge step is checked against the report by <code>validateJudgeCriteria</code>' documentation/reference/scripts.html
  grep -qF -- 'qa-run.mjs judge --run-dir &lt;rel-dir&gt; --case &lt;n&gt; --step &lt;k&gt;' documentation/reference/scripts.html
  grep -qF -- '<strong>Model judgment</strong>' documentation/changelog.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

## Validation Commands

Diff base: the tree object `4ae7b88030a8f014c1cf1125f393590272cb620a` (the phase-4 end state; HEAD `c658a0c` is untouched and phases 1 to 4 are uncommitted, so never use a HEAD-relative or `<tree>..HEAD` form). Every "files changed" derivation below uses the single-argument form `git diff <tree> --name-only` plus `git ls-files --others --exclude-standard` for new files, and ignores `PRPs/` (pipeline artifacts: this plan, its review logs, the PRD row). Every git and node command carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. The plan writer has no shell, so none of these was executed: the Implementer runs each against the pre-change tree first and expects the stated result.

### Level 1 STATIC_ANALYSIS

Gate on syntax, the frozen surfaces, the untouched kit template and the changed-file allowlist. `node --check` fails on a syntax error. The frozen-surface, template and changed-file checks pass on the unmodified tree (nothing changed yet) by design, as regression guards: they fail as soon as a frozen file, the template, a test file, the validate registry or any file outside the nine planned ones changes.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check scripts/validate/checks/qa-run-contract.mjs
# The five frozen surfaces and the kit login template are byte-identical to the phase-4 end state.
frozen="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff 4ae7b88030a8f014c1cf1125f393590272cb620a --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs plugins/relay/resources/auth-login.template.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface or the kit template changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces and the kit template unchanged"
fi
# Only the nine planned files changed: no test file, no new file, no version bump, no NAV or search-index edit (PRPs/ artifacts are ignored).
# The diff base is the phase-4 end state, so the files phases 1 to 4 changed are not in this diff.
changed="$( { GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff 4ae7b88030a8f014c1cf1125f393590272cb620a --name-only; GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git ls-files --others --exclude-standard; } | grep -v '^PRPs/' | sort -u || true )"
unexpected="$(printf '%s\n' "$changed" | grep -v '^$' | grep -vxF -e plugins/relay/scripts/qa-run.mjs -e scripts/validate/checks/qa-run-contract.mjs -e plugins/relay/commands/relay-qa-run.md -e docs/api-reference.md -e docs/domain/glossary.md -e docs/domain/flows.md -e documentation/reference/commands.html -e documentation/reference/scripts.html -e documentation/changelog.html || true)"
if [ -n "$unexpected" ]; then
  echo "FAIL: a file outside the nine planned files changed (a test file would be an R-X violation):"; printf '%s\n' "$unexpected"; exit 1
else
  echo "PASS: only the planned files changed"
fi
```

### Level 2 CONTENT_INVARIANTS

Gate on the exported surface and the real-tree contract. The first command fails on the unmodified tree (the new names are not exported) and passes once Tasks 1 to 4 are done; it also pins the constants and vocabularies this phase must not change, the arity of the two grounding functions, the runner-owned list and the evidence-writer anchor. The remaining checks are regression guards that pass before and after: no static or dynamic sibling import added, no introduced forbidden path reference, and the non-browser tests that pin the documents and the runner this phase edits.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as m from "./plugins/relay/scripts/qa-run.mjs";
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
for (const name of ["validateJudgeCriteria", "parseJudgeArgs", "summarizeJudgment", "settleJudgedCase", "applyJudgeVerdict", "isPendingResult", "groundLocators", "precheckGroundedSteps", "resolveScopeElement", "captureElementPng", "applyPartialRemainder"]) assert.equal(typeof m[name], "function", name + " is not exported");
for (const name of ["PENDING_JUDGMENT", "JUDGE_KINDS", "JUDGE_VERDICTS", "JUDGE_CRITERION_MAX", "JUDGE_EVIDENCE_MIN", "JUDGE_EVIDENCE_MAX"]) assert.ok(Object.hasOwn(m, name), name + " is not exported");
assert.equal(m.groundLocators.length, 4);
assert.equal(m.precheckGroundedSteps.length, 4);
assert.equal(m.OUTCOMES.join(","), "pass,fail,blocked,needs-human", "the outcome vocabulary changed");
assert.equal(Object.keys(m.REASON_CATALOGUE).length, 12, "the reason-code catalogue changed");
assert.deepEqual([...m.RUNNER_OWNED_REASON_CODES].sort(), ["JUDGEMENT_UNCERTAIN", "PARTIAL_REMAINDER", "ROLE_NOT_DEDICATED"]);
assert.equal(m.REASON_CATALOGUE.JUDGEMENT_UNCERTAIN.disposition, "needs-human");
assert.equal(m.REASON_CATALOGUE.JUDGEMENT_UNCERTAIN.class, "gap");
assert.deepEqual([...m.POSITIVE_ASSERTION_ACTIONS], ["expect_visible", "expect_text", "expect_value", "expect_state"], "judge must not become an absence anchor");
assert.deepEqual([...m.SCOPED_LOCATOR_KEYS], ["within", "name_prefix", "label_text", "index"]);
assert.equal(m.ASSERT_SETTLE_MS, 5000);
assert.equal(m.CAPTURE_TIMEOUT_MS, 30000);
const usage = m.USAGE.split("\n");
assert.equal(usage[0], "Usage:");
assert.ok(usage.find((l) => l.includes("qa-run.mjs ground")).includes("--prefix"));
assert.ok(usage.some((l) => l.includes("qa-run.mjs judge") && ["--run-dir", "--case", "--step", "--verdict", "--evidence"].every((f) => l.includes(f))));
assert.ok(!usage.find((l) => l.includes("qa-run.mjs judge")).includes("qa-run.mjs run"), "the judge line must not look like a run line");
assert.ok(usage.includes("  qa-run.mjs --help"));
const source = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const anchor = "const abs = join(ctx.runDirAbs, \x27evidence\x27, name);";
assert.equal(source.split(anchor).length - 1, 1, "the evidence-writer anchor line must occur exactly once");
assert.equal(source.split("locator.within(").length - 1, 0, "locator.within() needs Playwright 1.64");
assert.equal(source.split("writeFileSync(").length - 1, 1);
assert.equal(source.split("renameSync(").length - 1, 1);
assert.equal(source.split("spawnSync(process.execPath").length - 1, 1);
assert.equal(source.split("// WRITE-SITE").length - 1, 1);
assert.equal(source.split("// GUARD-SITE").length - 1, 1);
assert.equal(source.split("if (argv[0] === \x27judge\x27)").length - 1, 1, "the judge dispatch must occur exactly once");
assert.ok(source.indexOf("if (argv[0] === \x27ground\x27)") < source.indexOf("if (argv[0] === \x27judge\x27)") && source.indexOf("if (argv[0] === \x27judge\x27)") < source.indexOf("const args = parseArgs(argv);"), "judge is dispatched after ground and before parseArgs");
assert.ok(source.includes("resolveScopeElement(page, scoped.scope)"), "the judge branch must reuse resolveScopeElement");
assert.equal(source.split("export async function resolveScopeElement(").length - 1, 1, "resolveScopeElement must stay defined exactly once and exported, not re-implemented");
for (const v of [...source.matchAll(/outcome\s*[:=]\s*[\x27"]([^\x27"]+)[\x27"]/g)].map((x) => x[1])) assert.ok(["pass", "fail", "blocked", "needs-human"].includes(v), "an outcome literal outside the closed vocabulary: " + v);
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
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 4ae7b88030a8f014c1cf1125f393590272cb620a -- plugins/relay/scripts/qa-run.mjs | grep -E "^\+[^+]" | grep -qE "import\("; then
  echo "FAIL: an import() call was introduced"; exit 1
else
  echo "PASS: no import() call introduced"
fi
# No forbidden .claude/PRPs reference introduced by this phase's files outside the quoted-prohibition idiom.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 4ae7b88030a8f014c1cf1125f393590272cb620a -- plugins/relay/scripts/qa-run.mjs scripts/validate/checks/qa-run-contract.mjs plugins/relay/commands/relay-qa-run.md docs/api-reference.md docs/domain/glossary.md docs/domain/flows.md documentation/reference/commands.html documentation/reference/scripts.html documentation/changelog.html | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
# The non-browser tests that pin the runner and the documents this phase edits (they run no Chromium).
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-record-resolution.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
```

### Level 3 DRY-RUN END-TO-END

This is the gate that proves the judged path really executes in a browser. It starts a local HTTP server on an ephemeral port, runs the REAL runner (`run`) against it with Chromium (Playwright 1.61.1 / Chromium 149 resolve through the `node_modules` junction; never modify it), and then drives the REAL `judge` mode. It fails on the unmodified tree (every case ends `PLAN_ENTRY_INVALID` because `judge` is an unknown action) and passes after Tasks 1 to 3. It fails, instead of skipping, when Chromium cannot launch: the first assertion prints the case reason. The base URL is `http://127.0.0.1:<port>`, a local target the guard approves; no session is needed (the role is `null`). The temporary root lives outside any git work tree.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
const RUNNER = join(process.cwd(), "plugins", "relay", "scripts", "qa-run.mjs");
const FEATURE = "judge-e2e";
const RUN_REL = "PRPs/reports/judge-e2e/qa-run/20261021T000000000Z";
const MARK = "ZZ-E2E-VERDICT-MARKER";
const page = "<!doctype html><html><body><h1>Preview ready</h1><section aria-label=\"Resumo\"><p>Texto em portugues do painel</p></section></body></html>";
const server = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(page); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const root = mkdtempSync(join(tmpdir(), "relay-phase5-e2e-"));
const runAsync = (args) => new Promise((resolveP) => {
  const child = spawn(process.execPath, [RUNNER, ...args], { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let out = ""; let err = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  child.on("close", (status) => resolveP({ status, stdout: out, stderr: err }));
});
try {
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(join(root, "PRPs", "reports", FEATURE), { recursive: true });
  mkdirSync(join(root, ...RUN_REL.split("/")), { recursive: true });
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:" + port, roles: {} }));
  const GOTO = { action: "goto", path: "/" };
  const SEE = { action: "expect_visible", text: "Preview ready" };
  const defs = [
    { title: "Two judged steps", manual: ["1. Open the page and see Preview ready.", "2. Check that the preview looks right.", "3. Check that the Resumo panel reads in Portuguese."], steps: [GOTO, SEE, { action: "judge", kind: "visual", criterion: "the preview looks right" }, { action: "judge", kind: "language", criterion: "the Resumo panel reads in Portuguese", within: { role: "region", name: "Resumo" } }] },
    { title: "Criterion not in the report", manual: ["1. Open the page and see Preview ready."], steps: [GOTO, SEE, { action: "judge", kind: "visual", criterion: "the colors are pleasant" }] },
    { title: "One uncertain step", manual: ["1. Open the page and see Preview ready.", "2. Check that the layout is balanced."], steps: [GOTO, SEE, { action: "judge", kind: "checklist", criterion: "the layout is balanced" }] },
    { title: "One failed step", manual: ["1. Open the page and see Preview ready.", "2. Check that a chart is shown."], steps: [GOTO, SEE, { action: "judge", kind: "visual", criterion: "a chart is shown" }] },
  ];
  const block = (n, d) => ["### Case " + n, "**Title:** " + d.title, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", ...d.manual, ""].join("\n");
  writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + defs.map((d, i) => block(i + 1, d)).join("\n") + "\n## Notes\n\nnone\n");
  writeFileSync(join(root, ...RUN_REL.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: "browser", role: null, state: "none", steps: d.steps })) }));
  const run = await runAsync(["run", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL]);
  const resultsPath = join(root, ...RUN_REL.split("/"), "results.json");
  assert.ok(existsSync(resultsPath), "no results.json: " + run.stdout + run.stderr);
  const raw0 = readFileSync(resultsPath, "utf8");
  const doc = JSON.parse(raw0);
  const c = doc.cases;
  assert.equal(c.length, defs.length);
  assert.equal(c[0].outcome, null, "case 1 must have no outcome yet: " + JSON.stringify(c[0]));
  assert.deepEqual(c[0].pending_judgment, [3, 4]);
  assert.deepEqual(c[0].steps.map((s) => s.result), ["passed", "passed", "pending-judgment", "pending-judgment"]);
  assert.ok(c[0].manual_steps_verbatim !== null);
  assert.deepEqual([c[1].outcome, c[1].reason_code], ["needs-human", "PLAN_ENTRY_INVALID"], "a criterion the report does not state must be refused: " + JSON.stringify(c[1]));
  for (const i of [2, 3]) assert.deepEqual([c[i].outcome, c[i].pending_judgment], [null, [3]], JSON.stringify(c[i]));
  assert.deepEqual(doc.counts, { pass: 0, fail: 0, blocked: 0, "needs-human": 1 });
  assert.deepEqual(doc.judgment, { pending_steps: 4, judged_steps: 0 });
  const png = (name) => { const p = join(root, ...RUN_REL.split("/"), "evidence", name); assert.ok(existsSync(p), "missing evidence file " + name); return readFileSync(p).subarray(0, 8); };
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const name of ["case-1.judge-3.png", "case-1.judge-4.png", "case-1.judge-4.scope.png", "case-3.judge-3.png", "case-4.judge-3.png"]) assert.ok(png(name).equals(PNG_MAGIC), name + " is not a PNG");
  assert.ok(!existsSync(join(root, ...RUN_REL.split("/"), "evidence", "case-1.judge-3.scope.png")), "a step with no scope must write no element capture");
  assert.equal(c[0].steps[3].scope_evidence, RUN_REL + "/evidence/case-1.judge-4.scope.png");
  assert.equal(c[0].steps[2].scope_evidence, null);
  assert.ok(run.stdout.includes("Pending judgment: 4 step(s)"), run.stdout);
  assert.ok(run.stdout.includes("QA run finished: pass=0 fail=0 blocked=0 needs-human=1"), run.stdout);
  const judge = (...args) => runAsync(["judge", "--root", root, "--run-dir", RUN_REL, ...args]);
  const ev = "The capture shows the " + MARK + " heading and the panel text as described.";
  const refused = await judge("--case", "1", "--step", "3", "--verdict", "pass");
  assert.equal(refused.status, 2);
  assert.equal(readFileSync(resultsPath, "utf8"), raw0, "a refused verdict changed results.json");
  assert.equal((await judge("--case", "1", "--step", "3", "--verdict", "pass", "--evidence", ev)).status, 0);
  assert.equal(JSON.parse(readFileSync(resultsPath, "utf8")).cases[0].outcome, null, "the case must wait for its second verdict");
  const second = await judge("--case", "1", "--step", "4", "--verdict", "pass", "--evidence", ev);
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.ok(second.stdout.includes("CASE_SETTLED: case 1 outcome=pass"), second.stdout);
  assert.equal((await judge("--case", "3", "--step", "3", "--verdict", "uncertain", "--evidence", ev)).status, 0);
  const last = await judge("--case", "4", "--step", "3", "--verdict", "fail", "--evidence", ev);
  assert.equal(last.status, 0, last.stdout + last.stderr);
  assert.ok(last.stdout.includes("RESULTS: final"), last.stdout);
  const raw = readFileSync(resultsPath, "utf8");
  const done = JSON.parse(raw);
  assert.deepEqual(done.cases.map((x) => x.outcome), ["pass", "needs-human", "needs-human", "fail"]);
  assert.deepEqual(done.cases.map((x) => x.reason_code), [null, "PLAN_ENTRY_INVALID", "JUDGEMENT_UNCERTAIN", null]);
  assert.deepEqual(done.counts, { pass: 1, fail: 1, blocked: 0, "needs-human": 2 });
  assert.deepEqual(done.judgment, { pending_steps: 0, judged_steps: 4 });
  assert.ok(done.cases[0].steps.filter((s) => s.action === "judge").every((s) => s.result === "passed" && s.judged_by === "model"));
  assert.ok(!raw.includes(MARK), "results.json carries the verdict text");
  assert.ok(readFileSync(join(root, ...RUN_REL.split("/"), "evidence", "case-1.judge-3.verdict.json"), "utf8").includes(MARK), "the verdict text must be kept in its evidence file");
  const check = spawnSync(process.execPath, ["--input-type=module", "-e", "import { validateResults } from " + JSON.stringify(new URL("file:///" + join(process.cwd(), "scripts", "validate", "checks", "qa-run-contract.mjs").replace(/\\/g, "/")).href) + "; const r = validateResults(JSON.parse(process.argv[1])); if (r.length) { console.error(r.join(\"\\n\")); process.exit(1); }", raw], { encoding: "utf8" });
  assert.equal(check.status, 0, "the contract rejects the finished results: " + check.stderr);
  console.log("PASS: a judged run reaches a final results.json only after every verdict, through the real browser and the real judge mode");
} finally {
  server.close();
  rmSync(root, { recursive: true, force: true });
}
'
```

Then the static suite and the corpus gate. `npm run validate` prints `28 passed, 0 failed (28 checks run)`; the grep fails if the count changes. The corpus gate runs last and alone (about five minutes) and runs the corpus exactly as `node --test "scripts/validate/**/*.test.mjs"` (the glob is passed to `node` unexpanded, never narrowed) with the TAP reporter.

```bash
set -euo pipefail
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF -- "28 passed, 0 failed (28 checks run)"
```

Corpus gate. The baseline is green (phase 4 closed with an empty allowlist). This phase is additive: research examined the existing tests that could observe it (USAGE pins, the closed step vocabulary, `summarizeEntries`, the outcome-literal scans, the step-result vocabulary, the results key sets, the export list, `groundLocators` arity and return shape, the `executeCase` order, the marked-example counts and picks, the doc paragraph pins and the site-page pins) and predicts NO stale test, so the allowlist is EMPTY and the gate does not claim a bare zero outside it: it tolerates at most two further failing tests in the concurrent run (`FLAKE_BUDGET`), and each failing test file must then pass when run alone, which separates load sensitivity from a regression. More than two failures fails the gate; a file that also fails alone fails the gate and is a candidate for the test pair (`EXISTING_TEST_UPDATED`, with the allowlist then extended by title in a recorded decision), never an Implementer edit. The gate exits 1 on a runner crash, on a cancelled test, on output it cannot parse or whose counters disagree with its result lines, and when `node_modules/playwright` is missing from the worktree (it is a directory junction; never modify it). The TAP shape was observed on this host (Node v24.15.0): flat output, a failing test names its file only in the `location:` line of its YAML block, and an import-time crash is one `not ok` whose title is the file path.

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

- **AC-A1 (PRD AC-13, vocabulary):** Given a browser plan step `{ "action": "judge", "kind", "criterion" }` with an optional `within`, when it is validated, then `kind` must be `visual`, `language` or `checklist`, `criterion` a non-empty string of at most 500 characters, no other key is accepted (a `selector`, an `effect`, a `session` or a nested form is refused), the step counts as the case's expectation, it is not an absence anchor and it is refused in `http` entries; a `within` scope is validated like every scope and grounded like every scoped word (a word of the report or a snapshot entry with `matches` 1); every reason names keys and positions and never a value.
- **AC-A2 (PRD AC-14):** Given a `judge` step whose `criterion` does not appear verbatim (whitespace collapsed, letters and punctuation exactly as stated) in the case's manual steps, when the entry is validated, then it is `PLAN_ENTRY_INVALID` before the target is read and before any seed, session or request, with a fixed sentence that names the step position and never the criterion; a case with no manual steps never validates a judge step.
- **AC-A3 (PRD AC-13, lifecycle):** Given a case with judge steps whose other steps passed, when `run` finishes, then each judge step has its capture written under `evidence/`, is recorded `pending-judgment`, and the case has `"outcome": null` with a `pending_judgment` list and its manual steps kept, while the four-key `counts` partition, every judge-free run and the `OUTCOMES` vocabulary are unchanged and `results.json` gains a `judgment` block only for a run that holds a judge step; and given `qa-run.mjs judge --run-dir <dir> --case <n> --step <k> --verdict pass|fail|uncertain --evidence "<text>"`, when it records the last pending verdict of a case, then the case is settled (`fail` over `needs-human` `JUDGEMENT_UNCERTAIN` over `pass`; a pass of an entry with `human_remainder` is `PARTIAL_REMAINDER`), the judged steps carry `judged_by: "model"`, and `results.json` is recomputed (counts, both needs-human counters, classification block, `judgment`) and rewritten through `writeRunFile`, the only writer; a verdict without `--evidence`, outside the three verdicts or with an evidence text outside 10 to 2000 characters exits 2 with the usage and writes nothing; a verdict for a step that is not pending (including one already judged) exits 1 with `JUDGE_STEP_NOT_PENDING` and changes nothing; the verdict text appears only in `evidence/case-<n>.judge-<k>.verdict.json`, never in `results.json` or on the terminal; the script calls no model and spawns nothing; the contract check accepts a results document that is mid-judgment.
- **AC-A4 (PRD AC-5, clause deferred from phase 2):** Given a `judge` step with a `within` scope, when it runs, then the scope is resolved through the existing `resolveScopeElement` (no second implementation), an element screenshot of it is written with `captureElementPng` in addition to the step's own full-page capture, both with the password and `expect_value` masks, and each is replaced by redacted text when its text holds a registered secret; a scope that does not match exactly one element ends the case `needs-human` `STEP_UNGROUNDED`.
- **AC-A5 (PRD AC-22 for `judge`):** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, then it carries a literal marked example of the `judge` step that validates against the script and carries no scoped key, the `judge` mode with its fenced command and the judging protocol (read the capture, judge the criterion only, cite what is visible in the evidence text, answer `uncertain` rather than guess, never edit results.json), one honesty bullet and a corrected `VISUAL_JUDGEMENT` row; the `USAGE` text of the script lists the `judge` mode with its five flags; `docs/api-reference.md`, `docs/domain/glossary.md`, `docs/domain/flows.md`, `documentation/reference/commands.html`, `documentation/reference/scripts.html` (the usage block included) and `documentation/changelog.html` state the same; the API reference lists the twelve new exports and every name in the checked span is a real export; the line of the command doc that lists the runner modes is byte-identical.
- **AC-A6 (PRD AC-24):** `npm run validate` passes with exactly 28 checks (none added), the corpus `node --test "scripts/validate/**/*.test.mjs"`, run in a worktree that has `node_modules`, passes the corpus gate of `## Validation Commands` (an empty allowlist and the load-sensitivity rule), and the five frozen surfaces, the kit login template and every test file are byte-identical to the phase-4 end state. This criterion is verified by Levels 1 to 3 and delivered by every task keeping its constraints; it has no dedicated task.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A model judgment passes what a person would fail, because the session that planned also judges (PRD risk) | M | H | The criterion must be the report's own words (AC-A2); `--evidence` is mandatory and bounded; `uncertain` is a gap and never a pass; the protocol tells the session to prefer it to a guess and to judge the criterion only; a recorded verdict is never replaced; every judged step is flagged `judged_by`; the Phase 9 dogfood runs one negative control per judgment kind and reads every judged pass against its capture. The residual (a session that writes plausible evidence text for a capture it did not read) cannot be closed by the script and is recorded here |
| A judged `pass` is counted as driver-executed in the automatable rate although a model, not a driver, decided it | M | L | The step and the case carry `judged_by`; `summarizeClassification` is deliberately not edited (its key set is pinned); the dogfood reads judged cases separately. If the operator wants them excluded from the rate, that is a Phase 9 reading decision |
| A capture of a page shows personal data or a secret that is not registered for redaction | M | M | The full-page and element captures follow the existing final-capture rule (redacted text when the page text holds a registered secret; password inputs and `expect_value` fields masked); both live in the ignored `evidence/` directory; the verdict text is written there too and never to `results.json` or the terminal; the judge mode proves the ignore rule before it writes |
| A case that holds a pending step is mistaken for a pass or a miss by a reader of `counts` | M | M | `outcome` is `null` (not a fifth outcome), `counts` omits it, `judgment.pending_steps` and the per-case `pending_judgment` list make it visible, the run summary prints `Pending judgment: N step(s)` and every pending step, and `RESULTS: final` marks the end; the contract check requires the list for a null outcome |
| The new `results.json` shape (null outcome, new step results) breaks a consumer or a source-text pin | M | M | Judge-free runs are byte-identical (the block and the null outcome exist only with a judge step); the outcome-literal scans are respected (no quoted literal after `outcome` and `:` or `=`); `qa-run-contract.mjs` accepts the pending state; `summarizeEntries` keeps its three-key return; the `keepSteps` anchor line is untouched; Level 2 asserts all of it |
| The Level 3 gate needs Chromium, a local port and about two minutes | M | L | It fails loudly (the case reason is printed) rather than skipping; the browser stack is the one the earlier phases already use; the temp root and the server are cleaned in `finally` |
| A doc edit breaks a pinned sentence, paragraph start, ordering rule, sentence-splitting rule or example-count rule | M | M | The mode-list line is left alone; the block sits after the phase-4 block and the subsection after the re-mint paragraph; the example carries none of the scoped keys; the "Result fields" paragraph is not appended to; Tasks 5 to 7 run the tests that pin the page they edit |
| New runner code or comments disturb a source-text pin or a mutation anchor | M | H | Every new function sits above `validateStep`, after `summarizeEntries` (outside the marker pair) or between `runGroundGuarded` and `main`; the edited `runRun` lines are replaced whole while `keepSteps` and the guard message stay; Level 2 runs the real-tree contract and counts the anchors |
| The validation commands were derived by reading the tree, not executed (the plan writer has no shell) | M | L | They reuse the fixture shapes of shipped tests and of the earlier plans; the Implementer runs each against the pre-change tree first and expects the stated failure |
| Scope size across nine phases (PRD risk) | H | M | This phase is one lane on `qa-run.mjs`, independently testable, adds no reason code and keeps every phase-1 to phase-4 contract |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework. (Levels 2 and 3 and the doc tasks run the existing test files only as regression guards; running a test is not touching it. `scripts/validate/checks/qa-run-contract.mjs` is a check module, not a test file, and the earlier phases of this PRD edited it the same way.)
- **Predicted stale tests: none.** Research read every test that could observe the change and found that the design keeps each one true: the USAGE pins compare against the exported `USAGE` or use `includes` on the old lines (`qa-run-stable-grounding.test.mjs:347-365`, `qa-run-grounding-prefix-grammar.test.mjs:306`, `qa-run.test.mjs:1171`), and `qa-run-release-pages.test.mjs:220-238` reads only the lines of `parse|init|run|ground`, so the new `judge` line is ignored by it (the ground line stays the first line that names ground, and the judge line contains neither `qa-run.mjs run` nor `qa-run.mjs init`); `BROWSER_ACTIONS` is not exported and no test uses a fictional action (the `POSITIVE_ASSERTION_ACTIONS` pin at `qa-run-absence-state.test.mjs:99` is untouched); `summarizeEntries` tests use valid outcomes only and its three-key return is kept (`qa-run-case-vocabulary.test.mjs:222-256`); the outcome-literal scans (`qa-run-record-resolution.test.mjs:560`, `qa-run-contract.mjs:335-338`) accept `outcome: null` and an identifier; the runtime guard test (`qa-run.test.mjs:452`) still sees a `'passed'` outcome downgraded because the exception is the narrow `isPendingResult`; the step-record key-set pins (`qa-run-network-evidence.test.mjs:293`, `qa-run-case-vocabulary.test.mjs:179-191`) read records of other actions, which are not touched; `groundLocators.length` stays 4 and its return shape is unchanged (`qa-run-scoped-locators.test.mjs:78-183`, `qa-run-chosen-inputs.test.mjs:259`); the `keepSteps` mutation anchor (`qa-run.test.mjs:534`) is byte-identical; the command-doc mode-list pin (`qa-run-vocabulary-pins.test.mjs:68, 182-196`) is respected by leaving line 29 alone; the "Result fields" ending pin (`qa-run-impossible-catalogue.test.mjs:598-606`) is respected by adding a separate subsection; the marked-example counts (`qa-run-scoped-locators.test.mjs:512-531`, `qa-run-chosen-inputs.test.mjs:504-542`, `qa-run-network-docs.test.mjs:84-108`) are respected because the one new example carries no scoped key, no `effect` and no `username` binding; the API-row rule (`qa-run-release-pages.test.mjs:526-541`) is respected because every new name inside the checked span is a real export (the new names sit after the `USAGE` token and Task 6 asserts it); no test already covers `judge`, `outcome: null` or the new step results. **At-risk list if an unpredicted failure appears** (each would be an `EXISTING_TEST_UPDATED` item for the test pair, never an Implementer edit, with the allowlist extended by title in a recorded decision): (1) `qa-run-case-vocabulary.test.mjs:302` "AC-6 a step result outside passed, failed, not-run, human is flagged" passes unchanged (the message and the unknown value are unchanged) but its title now under-describes the seven accepted results; (2) `qa-run-release-pages.test.mjs:220` "AC-A3 the usage block of scripts.html lists, for each of the four modes" is weakened, not broken (it ignores `judge`); (3) any test that takes the first line of `USAGE` after `Usage:` to be a fixed four-line list; (4) any test that deep-equals the full key set of a real `run` result entry for a case that holds a `judge` step (none exists today); (5) `qa-run-vocabulary-pins.test.mjs:182` if the Implementer edits command-doc line 29 against this plan. The corpus gate therefore allowlists nothing.
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A5).** `stepRules`/`validateStep`/`validateSteps` for `judge` (the three kinds, the closed key set, the criterion limits, the scope validation, the http refusal, the expectation count, no absence anchor, hostile values); `validateJudgeCriteria` (whitespace collapse, case sensitivity, a null manual text, no echo, totality); `groundLocators` for a judge scope (report word, snapshot entry with one and two matches, no scope, arity 4, unchanged return shape); `isPendingResult`, `summarizeEntries` with a null outcome and `summarizeJudgment`; `parseJudgeArgs` (every flag, duplicates, a value starting with `--`, the verdict set, the evidence bounds, the two refusal families, totality on a non-array); `settleJudgedCase` (fail over uncertain over pass, `PARTIAL_REMAINDER`, a fixed reason, no verdict text); `applyJudgeVerdict` (a step that is not a judge step, a case with an outcome, a step already judged, the recomputed counters and classification block, the input not mutated, the `judgment` block); the judge mode through the real binary on a hand-built results document (the Task 3 gate cases) and the browser lifecycle (the Level 3 gate: two judged steps in one case, a scope capture, a text capture when the page holds a registered secret, an unresolvable scope ending `STEP_UNGROUNDED`, a case that fails on another step recording `not-judged`, an unjudged run summary); the contract check on a pending and on a finished results document; the new marked example (validates alone, exactly one, no scoped key), the new subsection and the honesty bullet; the API-reference export list (every name real); the usage text; that `results.json` of a judge-free run is byte-identical to the phase-4 runner (a regression fixture).
- **Design decisions made here.** (1) A case with a pending judgment is written with `outcome: null` plus a `pending_judgment` list, not with an outcome literal: the PRD forbids a fifth outcome and the source scans forbid a quoted literal after `outcome`, and `null` keeps `counts` the unchanged four-key partition. (2) The `judgment` block and the null outcome exist only for a run that holds a judge step, so a judge-free `results.json` is byte-identical to the phase-4 one. (3) A judge step captures its own full-page screenshot at its position instead of reusing the final capture, because the page state at the judged step may differ from the state at the end of the case; the element capture is written only when the step names a scope (AC-5). (4) Precedence when a case has several verdicts: `fail` over `uncertain` over `pass`, evaluated only when every verdict is in (the PRD: "the case outcome is computed only when every verdict is in"); an `uncertain` verdict therefore ends the case `needs-human` once the other steps are judged. (5) A case that ends through another step (`fail`, `blocked`, `needs-human`) is final at once and its captured judge steps are recorded `not-judged`, so no verdict is asked for a case whose result no verdict could change. (6) The criterion check is case-sensitive and whitespace-collapsed ("verbatim"), unlike the lowercased report-word rule of locators, because a criterion is a sentence to judge, not a locator word. (7) `--evidence` is bounded to 10 to 2000 characters (chosen, not measured; the dogfood recalibrates) and is written only under `evidence/`, never to `results.json`, because a description of a capture can carry personal data and `results.json` is tracked. (8) The mode takes `--root` as an optional flag defaulting to the working directory, as the other modes do, so the PRD's flag list works unchanged from the target root. (9) `parseArgs` and its mode list are untouched and `judge` is dispatched like `ground`, which keeps the unknown-mode behaviour of the existing CLI tests. (10) The command doc's mode-list line is left alone because a test pins it byte for byte; the mode is introduced by its own subsection. (11) `qa-run-contract.mjs` accepts the pending state with three narrow edits and no new rule set, so a tracked mid-judgment results.json is not flagged; `documentation/reference/validation-checks.html` stays untouched because no rule set or count it states changes.
- **Hand-off consumed.** The phase 2 plan deferred the clause of PRD AC-5 "a `judge` step with a locator scope also writes an element screenshot of that scope" to this phase, and phase 3 supplied the `within` scope and `resolveScopeElement`; AC-A4 and Task 2 deliver it with no second implementation of scope resolution.
- **Research.** `research-codebase` located the dispatch, guarded-wrapper, argument-parser, write-helper, results-assembly, partial-remainder and driver-loop patterns the judge mode mirrors, and noted that no mode rewrites an existing results.json (this plan adds the load-validate-recompute path as a pure function). Two read-only research passes read the test corpus and the documents: the first found no test that fails from the runner-side additions provided the hard source-text constraints hold, and the contract rules (`validateResults` rejects a null outcome and the new step results) that Task 4 relaxes; the second returned the verbatim anchors used by Tasks 5 to 7 and the paragraph, bullet and sentence pins they respect. `research-web` found corroborating practice only from search snippets, not a primary source for this exact flow: an explicit insufficient-information option keeps forced guesses out of a judge's metric (https://www.datadoghq.com/knowledge-center/llm-as-a-judge/), binary pass or fail with a rationale and evidence is the most auditable judge output (https://mlflow.org/articles/tags/llm-as-a-judge/), judges lean toward definitive verdicts even when a non-directional one is allowed (https://arxiv.org/pdf/2606.07834), visual-testing tools keep a result unresolved until a reviewer accepts or rejects it (https://help.applitools.com/hc/en-us/articles/360007188251, https://www.browserstack.com/docs/percy/visual-testing-workflows/baseline-management/understand-baseline), and a GUI-judge pass rate says nothing about accuracy without human labels (https://dotzlaw.com/insights/ai-62-your-judge-needs-a-judge/). Gaps recorded by the research: no source on verifying that the evidence a judge cites exists in the screenshot, and none on a delegated-judge flow where the caller records the verdict through a CLI; both are the PRD's own design. All line anchors in this plan were checked against the worktree files, except the exact old text of the two single-line API rows and the `scripts.html` row, which the Implementer reads in full before editing (the anchors given are verbatim fragments reported by research).
- **Anchor lines and pins to keep (collected for the Implementer).** The line `const abs = join(ctx.runDirAbs, 'evidence', name);` must occur exactly once. The line `const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';` stays byte-identical. The guard message `an internal path produced a value outside the closed vocabulary` stays. Do not add a second occurrence of any of: `if (isObj(record)) {`, `const ANONYMOUS_CHECK_MS = 20000;`, `maxRedirects: 0`, `if (!a.includes('://')) continue;`, `if (u.origin !== target.origin) return null;`, `return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();`, `loadPlaywright(root, PLUGIN_ROOT);`, `const table = buildRedactionTable({ root, env: process.env, secretValues: [] });` inside the run section. The text between `export function precheckGroundedSteps(` and `export function summarizeEntries(` must contain `interactionHistory(` and `isPostInteractionSnapshot(`; the text between `async function runLocatorStep(` and `DRIVERS.browser = async (` must contain `'expect_value'`, `'expect_not_visible'` and `'expect_state'`; the text between the `// REQUEST-OBSERVATION-BEGIN` and `// REQUEST-OBSERVATION-END` markers must read no header, body, cookie or response accessor. The copy-helper tests copy only `qa-run.mjs` and `auth-local-guard.mjs`, so no new sibling import, static or dynamic. The banned strings in the command doc are `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type` and `--local-host`. In the API reference, a backticked camelCase or UPPER_SNAKE token between `REASON_CATALOGUE` and `USAGE` of the `qa-run.mjs` row must be a real export.
- **Docs sync and scope.** `docs/decisions.md` is not edited (so no `documentation/governance/decisions.html` mirror is involved). Under `documentation/` only `reference/commands.html`, `reference/scripts.html` and `changelog.html` change, following `documentation/AGENTS.md`: no page is added, so NAV and the search index are untouched, and `plugin.json` keeps its version. The `docs_sync` pass at implement time finds Task 6 already done. Pages that mention the runner in prose only (`documentation/roadmap/status.html`, `docs/context/architecture.md`, `README.md`) are not edited: they state no mode list or step list that this phase makes false.
- **Environment.** The host is Windows with Git Bash. Every command that runs git, node or npm carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. Keep LF line endings in every edited file (the `line-endings` check). `node_modules` in the worktree is a directory junction to the main checkout's: do not modify it; Playwright 1.61.1 and Chromium 149 are what the Level 3 gate uses. Use `grep -qF --` for any pattern that can start with `-`. Node paths in the gates are built from `process.cwd()` or `file:///C:/...` URLs, never from a bare backslash path.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Tasks 1 to 4 are gates that fail before the work (the new names are not exported, `judge` is an unknown action and an unknown mode, the contract rejects a pending document). Tasks 5 to 7 are gates that fail before the work (the authored literals are absent) and then run the existing tests that pin the page they edit, which pass before and after. The Level 1 frozen-surface, template and changed-file checks pass on the unmodified tree by design; the Level 2 export check and the Level 3 end-to-end gate fail on it.

*Generated: 2026-10-21*
*Approved: 2026-10-22*
*Implemented: 2026-10-22*
*Status: IMPLEMENTED*
