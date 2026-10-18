# Feature: Stable grounding and text candidates (Phase 2 of qa-runner-grounding-vocabulary-v2)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the `qa-run.mjs` `ground` mode with its exit codes and usage text, the `parseAriaSnapshot` candidate set, the `qa-run-contract` validation check, the `relay-qa-run.md` planning doc); a new bounded wait inside a network-touching mode that sits behind the local-only guard; two carry-overs from the Phase 1 review (a plan-value coercion that can throw, and two sentences in the command doc that contradict the one-entry-per-case rule)
- Decisions found:
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log "Stable grounding contract": two successive equal snapshots within a bound, ending in `GROUND_UNSTABLE` with nothing written; a fixed dwell and a best-effort flag were rejected; "no primary source documents the strategy, so the numbers are measured"
  - Same PRD, Technical Risks "The page never stabilizes": a bounded wait ending in `GROUND_UNSTABLE`, so the case falls to `STEP_UNGROUNDED` instead of being planned from an unstable snapshot
  - Same PRD, Decisions Log "Validation checks": extend `qa-run-contract`, the count stays 28; Architecture Notes "No static sibling import" and "New request sites reuse the loaded guard"
  - Same PRD, Decisions Log "Frozen surfaces": the review-loop files, `capture.mjs` and `/relay-qa-report` stay byte-identical (AC-14)
  - `docs/decisions.md` [2026-09-25] (line 2435) registering the manual-QA runner: the outcome vocabulary is a closed set, a case no driver can perform is `needs-human` with its steps shown, the local-only guard is permanent
  - `docs/decisions.md` [2026-07-09] (line 680): every Validation command and per-task `VALIDATE:` must carry real exit-code semantics
  - `docs/decisions.md` [2026-07-10] (line 692): R-X strict, the Implementer authors zero test files; tests are routed through the test pair's lifecycle ledger
  - `docs/decisions.md` [2026-08-04] (line 1501) and [2026-08-20] (line 2155): a validation pattern must be grounded in text the plan can demonstrate; a `VALIDATE` exercises the effect rather than the declaration; the test-pair deferral paragraph is emitted by default
  - `docs/decisions.md` [2026-10-06] (line 2490): provisioning the visual tooling's `node_modules` is a registered backlog item and is deliberately not folded in
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the `GROUND_UNSTABLE` message carries counts only, never page text, and every echoed planner value stays bounded
  - "Weakening or deleting tests to make the auto-correction loop turn green": the one assertion this design makes stale is named for the test pair (`EXISTING_TEST_UPDATED`), never edited by the Implementer and never silently skipped
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - Command versus script separation: the planning agent proposes plan entries; the script grounds, validates, executes and reports
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/` and is written only through `writeRunFile`
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, here with the tree object recorded after Phase 1
  - `qa-run-contract` invariants stay true: the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`, one `export const REASON_CATALOGUE`
  - The local-only guard is a hard failure at every network- or store-touching site: `ground` keeps passing the target through the already-loaded guard before any request, and the stable wait adds no request site
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` — Implementation Phases row 2: "Stable grounding and text candidates" — Goal: `ground` plans from the page the operator actually sees — Success signal: against a fixture page that renders after `load`, the snapshot is taken only once settled; a fixture that never settles yields `GROUND_UNSTABLE` and no file; paragraph, list-item and cell lines yield candidates.
- Two carry-overs from Phase 1 are slotted in as clearly labelled, minimal tasks (Task 4 and the second half of Task 5). They are not new PRD scope: both are justified by the Phase 1 criteria they complete (PRD AC-7: "an invalid `class` value makes the entry `PLAN_ENTRY_INVALID`", and the totality invariant of N cases in, N entries out; PRD AC-6: every non-executed case carries a catalogued code).

## Summary

This phase makes `ground` plan from the page the operator actually sees. The single `ariaSnapshot()` that follows a swallowed `networkidle` wait is replaced by a bounded loop that reads the page only once two successive accessibility snapshots are equal, and that ends with the named halt `GROUND_UNSTABLE` (exit 1, no snapshot file) when no equal pair appears in time. `parseAriaSnapshot` gains text candidates for `- paragraph:`, `- listitem:` and `- cell:` lines without changing any candidate it produced before. The `ground` mode and its flags join the script's header usage block, `USAGE` and `--help`, the command doc gains the `MSYS_NO_PATHCONV=1` note for a leading-slash `--route` under Windows Git Bash, and `qa-run-contract` is extended (an opt-in flag, no 29th check) so that the usage text, the named halt, the absence of a swallowed readiness wait and the doc note cannot drift. Two Phase 1 carry-overs ride along: the bounded echo of a plan value no longer throws on a value such as `{"toString":1}` (so `results.json` is still written and the entry is `PLAN_ENTRY_INVALID`), and the two doc sentences that told the planner to leave a case to the script or to write no entry are rewritten to match the one-entry-per-case rule without changing runner behavior.

## User Story

As the operator of relay's human validation gate
I want `/relay-qa-run` to plan its browser steps from the settled page, with the text a section title or a table cell really shows
So that a single-page application is no longer read before it renders and the cases it was hiding can be driven to a verdict

## Problem Statement

`ground` reads a single-page application before it renders. After `page.goto(url, {waitUntil: 'load'})` it calls `waitForLoadState('networkidle', {timeout: 5000}).catch(() => {})` and takes exactly one `ariaSnapshot()`: on the teacher tree of the `super-ensino` re-run the snapshot held 2 entries where the settled page has 66, which alone made T-1, T-2 and A-1 unplannable. `parseAriaSnapshot` then discards paragraph, list-item and cell text (61 paragraph lines of the teacher `/perfil` were lost, including a section title the report asks for). Neither fix is visible to the operator: the `ground` subcommand is dispatched in `main()` but absent from the header usage block, from `USAGE` and from `--help`, and the documented `ground --route "/perfil"` line exits 2 under Windows Git Bash with no hint of why.

## Solution Statement

Runner side and command-doc side only. Add a pure, injectable wait (`waitForStableSnapshot`) with two exported constants (the polling interval and the bound), call it from `runGround` in place of the swallowed wait and the single read, and end `GROUND_UNSTABLE` with nothing written. Extend `parseAriaSnapshot` with a third, inline-text line form that has its own cap so it can never displace an existing candidate. Surface `ground` in every usage surface and document the Git Bash note and the new halt. Pin the usage text, the named halt, the absence of `waitForLoadState(` in the ground mode and the doc tokens in `qa-run-contract` behind an opt-in `requireGround` flag, mirroring Phase 1's `requireCatalogue`. Make the bounded echo of a plan value total (a `try`/`catch` around the coercion) and rewrite the two coherence sentences in the `ground` and record-resolution sections of the doc.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | row 1 of the PRD is `complete` (`Depends` is `1`); shares `lane:qa-run` with phases 1 to 6, so it runs serially; independent of phase 3 |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` lines 228 (row 2), 245-248 (Phase Details), 101-102 (AC-1, AC-2), 118 (AC-18), 106-107 (AC-6, AC-7, for the carry-overs), 126 (Open Question on the bound and interval), 197 and 294 (the stable-grounding contract) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` | 101-102, 118, 126, 197, 216, 245-248, 294 | AC-1, AC-2 and AC-18, the open question on the bound and interval, the "stable grounding is a contract, not a number" note, the never-stabilizes risk, the Phase 2 scope and the Decisions Log row |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 82-99 | the timing constants block (`ANONYMOUS_CHECK_MS`) and `USAGE`, the insertion sites of the new constants and the ground usage line |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1085-1127 | `parseAriaSnapshot`, `SNAPSHOT_EMAIL_PATTERN` and `partitionSnapshotEntries`: the parser being extended and the partition that stays untouched |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1241-1273 | `validatePlanClassification` and its `bounded` helper (KD-1) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3017-3049 and 3059-3172 | `GROUND_USAGE`, `parseGroundArgs`, `runGround` and `runGroundGuarded`: the usage text, the exit semantics and the swallowed wait being replaced |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 148-179 | the one-entry-per-case rule and the `ground` section being rewritten |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 228-248 and 489-495 | the grounding rules (pinned phrase `` `matches` is exactly `1` ``, which must stay on one physical line) and the record-resolution paragraph being reconciled |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 25-34, 181-221, 241-249, 398-409 | the import list, the `checkQaRunContract` signature, the script and command blocks and the real-tree entry point being extended |
| P1 | `node_modules/playwright-core/lib/coreBundle.js` | 6444-6498 | read-only: the YAML scalar serializer of the installed Playwright 1.61.1 (values are double-quoted with `\\`, `\"` and control-character escapes; keys are single-quoted), which the inline form unquotes |
| P1 | `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | 179-225 | read-only: the aria fixture with `- paragraph: ignored prose` and the assertion at line 212 that this design makes stale (named for the test pair) |
| P1 | `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | 543-561, 612-625, 714-735 | read-only: bad-argument exit 2 with `Usage:`, the unloadable-route halt pattern, and the doc pins (`qa-run.mjs" ground --root`, `STEP_UNGROUNDED`, the exactly-one regex, the retired stop-gap phrases) |
| P1 | `scripts/validate/checks/qa-run-classification.test.mjs` | 246-256, 506-514, 545-552, 554-578 | read-only: the bounded-echo length pins the KD-1 fix must keep, and the doc pins the rewrite must keep (one entry per case, never omit a case, no `omit the case`, the catalogue table rows, every `json` illustration validating) |
| P1 | `scripts/validate/checks/qa-run-per-test-resolution.test.mjs` | 342-369 | read-only: the two record-resolution bullets that must stay one physical line each, at column 0, in order after `never added to them.` |
| P1 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 65-74 | read-only: the tokens `qa-run.mjs` and the command doc must keep (`checkTarget`, `FAILED_NON_LOCAL_TARGET`, `// GUARD-SITE`; `--local-host` forbidden) |
| P1 | `PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-1-reason-code-catalogue-and-pre-run-classification.plan.md` | 515-603 | read-only: the Level 2 and Level 3 shape, the test-pair follow-up list and the corpus-gating note this phase mirrors |
| P1 | `docs/decisions.md` | 680-688, 1501, 2155-2163 | the exit-code-semantics rule, the pattern-grounding rule and the "VALIDATE exercises the effect" rule every command below follows |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:89-99
/** How long the anonymous check waits for the authenticated-only marker to (not) appear. */
const ANONYMOUS_CHECK_MS = 20000;
const HUMAN_GATE_SENTENCE =
  'HUMAN GATE STILL OPEN: a runner pass is evidence, not approval. No Manual status was changed and no phase status advanced.';

const USAGE = `Usage:
  qa-run.mjs parse --report <path>
  qa-run.mjs init  --root <dir> --feature <slug> [--env-handle <path>]
  qa-run.mjs run   --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]
  qa-run.mjs --help
`;
```
Copied by Task 1 (the ground usage line joins `USAGE` as one more indented line) and by Task 2 (the two new timing constants sit directly after `ANONYMOUS_CHECK_MS`, each with a doc comment stating what it bounds).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3017-3019
const GROUND_USAGE = `Usage:
  qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>]
`;
```
Copied by Task 1 (the line becomes one shared constant used by both `USAGE` and `GROUND_USAGE`, so the two cannot drift).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3116-3126
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      if (resp !== null && resp.status() >= 500) throw new Error('server error');
    } catch {
      throw new Halt('TARGET_UNREACHABLE', 'the route could not be loaded');
    }
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const yaml = await page.locator('body').ariaSnapshot().catch(() => null);
    if (!isStr(yaml)) throw new Halt('GROUND_SNAPSHOT_UNAVAILABLE', 'the installed Playwright cannot produce an accessibility snapshot');
```
Copied by Task 2 (the last three lines are replaced by the stable wait and two named halts; the `goto` block above them, the guard call before the browser and the page-level 10 s default timeout stay byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3161-3172
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
Copied by Task 2 (a `Halt` thrown inside `runGround` is already printed as `<code>: <detail>` on stderr with exit 1, so `GROUND_UNSTABLE` needs no new plumbing and the `finally` of `runGround` still closes the browser).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1085-1107
export function parseAriaSnapshot(yaml) {
  if (!isStr(yaml)) return [];
  /** @type {({ kind: 'role', role: string, name: string } | { kind: 'text', text: string })[]} */ const out = [];
  const seen = new Set();
  for (const line of yaml.split(/\r?\n/)) {
    if (out.length >= 300) break;
    /** @type {any} */ let cand = null;
    const m = /^\s*-\s+([a-z]+)\s+"((?:[^"\\]|\\.)*)"/.exec(line);
    if (m !== null) {
      const name = m[2].replace(/\\(["\\])/g, '$1');
      if (LOCATOR_ROLES.includes(m[1]) && name.trim() !== '') cand = { kind: 'role', role: m[1], name };
    } else {
      const t = /^\s*-\s+text:\s*(.+?)\s*$/.exec(line);
      if (t !== null && t[1].trim() !== '' && t[1].length <= 200) cand = { kind: 'text', text: t[1] };
    }
    if (cand === null) continue;
    const key = JSON.stringify(cand);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cand);
  }
  return out;
}
```
Copied by Task 3 (the two existing branches, the 300 cap, the 200-character limit and the de-duplication stay exactly as they are; a third branch and a second, independent counter are added around them).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1241-1246
export function validatePlanClassification(entry) {
  /** @param {string} reason */
  const refuse = (reason) => ({ code: 'PLAN_ENTRY_INVALID', reason });
  /** @param {any} v */
  const bounded = (v) => JSON.stringify(String(v).slice(0, 64));
  if (!isObj(entry)) return refuse('the plan entry is not an object');
```
Copied by Task 4 (only the body of `bounded` changes; every call site, every refusal sentence and every non-throwing output stay byte-identical).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:214-220
    if (requireCatalogue) {
      // The catalogue and the class set are defined once, in the runner, and nowhere else.
      for (const definition of ['export const REASON_CATALOGUE', 'export const CASE_CLASSES']) {
        const n = occurrences(scriptText, definition);
        if (n !== 1) add(`the runner script must define the catalogue with ${definition} exactly once, found ${n}`, SCRIPT_FILE);
      }
    }
```
Copied by Task 6 (the new script-text rules sit in a sibling `if (requireGround)` block with the same `add(...)` message style, so a caller that does not opt in sees nothing).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:181-184
 * @param {{ scriptText?: string | null, commandText?: string | null, seedScriptText?: string | null, seedCommandText?: string | null, queryModuleText?: string | null, results?: { file: string, value: any }[], requireStepExamples?: boolean, requireCatalogue?: boolean }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkQaRunContract({ scriptText, commandText, seedScriptText, seedCommandText, queryModuleText, results, requireStepExamples = false, requireCatalogue = false }) {
```
Copied by Task 6 (`requireGround` is a new defaulted-false flag beside `requireCatalogue`, so every existing caller, including the unit tests that pass no flag, is unaffected).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:398-409
export function runQaRunContractCheck() {
  return checkQaRunContract({
    scriptText: readOrNull(SCRIPT_FILE),
    commandText: readOrNull(COMMAND_FILE),
    seedScriptText: readOrNull(SEED_SCRIPT_FILE),
    seedCommandText: readOrNull(SEED_COMMAND_FILE),
    queryModuleText: readOrNull(QUERY_MODULE_FILE),
    results: walkResults(),
    requireStepExamples: true,
    requireCatalogue: true,
  });
}
```
Copied by Task 6 (the real-tree entry point is the only caller that passes `requireGround: true`).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:167-179
Grounding browser steps. For a case whose browser steps name no selector (or whose labels
you cannot trust), run, once per role and route and BEFORE writing the plan entry:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" ground --root "<target_root>" --feature "<feature>" --run-dir "<RUN_DIR>" --route "<route>"
```

Append ` --role "<role>"` when the plan entry names a role and ` --env-handle "<path>"` when
the argument was given. It prints `GROUNDED: <path> entries=<n> withheld=<m>`; `Read` the
written snapshot file under `<RUN_DIR>/grounding/`. It lists role-and-name and visible-text
entries, each with the number of elements it `matches`. A non-zero exit is a named halt (for
example `FAILED_PLAYWRIGHT_UNAVAILABLE`, `SESSION_UNAVAILABLE`, `TARGET_UNREACHABLE`): relay
it, plan no locator step for that route, and leave the case to the script.
```
Copied by Task 5 (the fenced `bash` command line stays byte-identical because `qa-run-ui-grounding.test.mjs:730` pins `qa-run.mjs" ground --root`; the prose around it is rewritten, and the closing clause that contradicts the one-entry-per-case rule is replaced).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:489-495
### Record resolution (done by the script, not by you)

Before it routes a case, the script checks every case whose coverage is
`automated` against the Test Runner's schema-v1 record, found by the discovery
rule of `/relay-qa-report` (the top-level `PRPs/reports/<feature>/record.json`,
else the latest `attempts/<N>/record.json`). You write no plan entry for this and
a plan entry for such a case is ignored once it resolves.
```
Copied by Task 5 (the heading and the first sentence stay; the second sentence is reconciled with the one-entry-per-case rule, and the bullets that follow are not touched).

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
Copied by Task 2 (the no-static-sibling-import rule: every helper added here lives in `qa-run.mjs`, because the copy-helper tests copy only `qa-run.mjs` and `auth-local-guard.mjs` into a temp `scripts/` directory; the default `sleep` uses only `setTimeout`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the stable-snapshot wait and its two constants, `GROUND_UNSTABLE` in `runGround`, the inline-text candidates in `parseAriaSnapshot`, the `ground` line in the header usage block, `USAGE` and `GROUND_USAGE`, and the total bounded echo of a plan value (KD-1) |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the `ground` section (stability, `GROUND_UNSTABLE`, text entries, the `MSYS_NO_PATHCONV=1` note, a declining entry instead of "leave the case to the script") and the record-resolution paragraph |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | an opt-in `requireGround` rule set pinning the usage text, the named halt, the absence of a swallowed readiness wait in the ground mode and the doc tokens; no new check is registered (the count stays 28) |

## NOT Building (Scope Limits)

- Redaction precision, the per-run `.gitignore` and its `git check-ignore` proof, the policy section for snapshots and screenshots, and the `auth-secrecy` extension (Phase 3). Phase 2 widens what a grounding snapshot can hold (paragraph and cell text), so Phase 3 must land before the release cut (Phase 7 depends on it); it is not folded in here.
- The session-less request, `expect_value`, `expect_not_visible` and `expect_state` (Phase 4); the grounding prefix (Phase 5); `expect_requests`, the bounded re-mint and the `--refresh` statement (Phase 6); the release cut and every `documentation/` page, including the site's mirror of the `ground` usage line (Phase 7); the dogfood and the settle-time reading on the real teacher tree (Phase 8).
- A new CLI flag, an environment variable or any per-call override for the bound or the interval: they are two exported constants, so a planner cannot widen them and the usage text stays the PRD's six flags.
- Any change to the `GROUNDED:` stdout line (a test pins its exact end-of-line shape), to the snapshot file's schema, to `partitionSnapshotEntries`, to `precheckGroundedSteps`, to `LOCATOR_ROLES`, or to the match-count loop in `runGround`.
- Any fix to the pre-existing verbatim handling of a quoted `- text:` value: AC-2 requires every candidate produced before this change to stay unchanged, so only the three new line forms unquote.
- A fifth outcome, a new reason code in the catalogue, or any change to `OUTCOMES`, `REASON_CATALOGUE`, `summarizeEntries` or the `run` stdout summary lines. `GROUND_UNSTABLE` is a halt of the `ground` mode, never an outcome and never a catalogue member.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-14), and any change to a report.
- The other swallowed `networkidle` waits (the anonymous check at `qa-run.mjs:2550` and the login template's own settle aid): they are not part of `ground`, and the template change would bump `KIT_TEMPLATE_ID`.
- Any test file. R-X strict: the Implementer authors zero test files; new tests and the one stale assertion are routed through the test pair (see `## Notes`).
- Any edit under `documentation/` and any hand edit of `docs/api-reference.md` (the `docs_sync` pass owns `docs/`; the site pages and `changelog.html` belong to Phase 7 per `documentation/AGENTS.md`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the `ground` mode in the header usage block, `USAGE`, `--help` and `GROUND_USAGE`

- **ACTION**: Delivers AC-A3 (the usage-text half: the `ground` mode and its flags appear in the script's usage text). In `plugins/relay/scripts/qa-run.mjs`:
  1. Header comment. Add, between the `run` usage line (currently line 15) and the `--help` usage line (line 16), the line ` *   node <plugin-root>/scripts/qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>]`. Add a `ground` entry to the `Modes:` list after the `run` entry (currently lines 21-26), stating that it takes one redacted accessibility snapshot of one route with one role's saved session behind the same local-only guard, only once two successive snapshots are equal within a bounded wait, writes the role-and-name and text candidates with their real match counts under `<run-dir>/grounding/`, and ends `GROUND_UNSTABLE` (exit 1, nothing written) when no equal pair appears in time. In the `Exit codes:` sentence replace "a named FAILED_* halt or an aborted run" by "a named halt (a FAILED_* code or one of the ground halts such as GROUND_UNSTABLE) or an aborted run". After the sentence "The mode is mandatory. Unknown arguments, flags missing a value, or no mode exit 2 without writing (see USAGE / parseArgs)." add that `ground` is dispatched before `parseArgs` and validated by `parseGroundArgs`.
  2. Immediately before `const USAGE` (line 94) add `const GROUND_USAGE_LINE = '  qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>]';`. Change `const USAGE` to `export const USAGE` and insert `${GROUND_USAGE_LINE}` as its fourth usage line, between the `run` line and the `--help` line. The four existing lines stay byte-identical (`qa-run.test.mjs:1179` needs `--help` stdout to include `qa-run.mjs run`).
  3. Replace the template body of `const GROUND_USAGE` (currently lines 3017-3019) so that it is `Usage:` followed by `${GROUND_USAGE_LINE}` and then one note line, `  A leading-slash --route reaches the script intact only when the shell does not rewrite it; under Windows Git Bash set MSYS_NO_PATHCONV=1 for the command.`, so that the bad-argument exit 2 names the cause the dogfood hit. Keep the constant's name and its two existing uses (the bad-argument branch and the `--run-dir` refusal branch of `runGround`).
  Do NOT edit `parseArgs`, `parseGroundArgs`, the `main()` dispatch or the body of `runGround` in this task. Do NOT add the text `writeFileSync(`, `renameSync(`, `// GUARD-SITE` or `// WRITE-SITE` anywhere (comments included), the phrase `export const REASON_CATALOGUE`, any `import` statement, or a quoted `outcome:` literal.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:89-99` (the `USAGE` template and its indentation) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3017-3019` (the ground usage line being shared).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { spawnSync } from "node:child_process";
  import { readFileSync } from "node:fs";
  import { USAGE } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const script = "plugins/relay/scripts/qa-run.mjs";
  const flags = ["--root <dir>", "--feature <slug>", "--run-dir <rel-dir>", "--route </path>", "[--role <slug>]", "[--env-handle <path>]"];
  for (const f of flags) if (!USAGE.includes(f)) fail("USAGE does not list the ground flag " + f);
  const help = spawnSync(process.execPath, [script, "--help"], { encoding: "utf8" });
  if (help.status !== 0 || !help.stdout.includes("qa-run.mjs ground")) fail("--help must exit 0 and list the ground mode: " + help.status + " " + help.stdout);
  for (const mode of ["qa-run.mjs parse", "qa-run.mjs init", "qa-run.mjs run"]) if (!help.stdout.includes(mode)) fail("--help lost the line of " + mode);
  const bare = spawnSync(process.execPath, [script, "ground"], { encoding: "utf8" });
  if (bare.status !== 2 || !bare.stderr.includes("Usage:") || !bare.stderr.includes("qa-run.mjs ground") || !bare.stderr.includes("MSYS_NO_PATHCONV=1")) {
    fail("a bare ground must exit 2 with the ground usage line and the Git Bash note: " + bare.status + " " + bare.stderr);
  }
  const text = readFileSync(script, "utf8");
  const head = text.slice(0, text.indexOf("\nimport "));
  if (!/qa-run\.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route <\/path>/.test(head)) fail("the header usage block does not list the ground mode");
  '
  ```
  Before this task `USAGE` is not exported, so the import fails and the command exits non-zero. The command exercises the effect (the real `--help` and the real bad-argument exit), not only the presence of the line.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the bounded stable-snapshot wait and `GROUND_UNSTABLE` in `runGround`

- **ACTION**: Delivers AC-A1 (a snapshot is written only after two successive equal snapshots within a bounded wait; otherwise `GROUND_UNSTABLE`, exit 1, no file, no swallowed timeout) and, by construction, AC-A6 (no pinned anchor of `qa-run.mjs` is disturbed) and AC-A7 (the wait re-reads the page `ground` already loaded behind the guard; it adds no request site and no second `// GUARD-SITE`). In `plugins/relay/scripts/qa-run.mjs`:
  1. Constants. Directly after `const ANONYMOUS_CHECK_MS = 20000;` (line 90) add two exported constants, each with a doc comment: `export const GROUND_POLL_INTERVAL_MS = 1000;` (the time between two successive reads, so an equal pair certifies at least one full second without change) and `export const GROUND_STABLE_BOUND_MS = 20000;` (the most the loop waits for an equal pair, counted from the first read). The comment states the rationale in at most eight lines: no primary source documents a two-equal-snapshots strategy; Playwright's own polling schedule tops out at 1000 ms and its `stable` check is two consecutive animation frames, so a pair one second apart is the stricter reading; the bound reuses the repository's own 20-second precedent for a page-state wait; the values were chosen, not measured on a real single-page application, and the Phase 8 dogfood recalibrates them.
  2. The wait. After `partitionSnapshotEntries` (ends at line 1127) and before the doc comment of `precheckGroundedSteps`, add `export async function waitForStableSnapshot(read, opts = {})`, with JSDoc types. `read` is `() => Promise<string | null>`; `opts` may carry `boundMs` (default `GROUND_STABLE_BOUND_MS`), `intervalMs` (default `GROUND_POLL_INTERVAL_MS`), `sleep` (default a `setTimeout` promise) and `now` (default `() => performance.now()`), so a test drives the loop with a fake clock and no browser. Behavior, in this order: (a) take a first read through a wrapper that returns `null` for a rejection or a non-string; a `null` first read returns `{ status: 'unavailable' }` at once, with no sleep; (b) set `deadline = now() + boundMs`, `previous` to the first read and `reads` to 1; (c) `while (now() + intervalMs <= deadline)`: `await sleep(intervalMs)`, take a read, increment `reads`, return `{ status: 'stable', yaml: current, reads }` when `current` is a string equal to `previous`, otherwise set `previous = current` (so an unreadable read, `null`, resets the pair and never counts as equal); (d) after the loop return `{ status: 'unstable', reads }`, carrying no `yaml`. Use the key `status`, never `outcome`, and do not write a quoted `outcome:` literal anywhere.
  3. `runGround`. Replace the three lines that follow the `goto` block (currently lines 3124-3126: the swallowed `networkidle` wait, the single `ariaSnapshot()` and the `GROUND_SNAPSHOT_UNAVAILABLE` check) by: `const settled = await waitForStableSnapshot(() => page.locator('body').ariaSnapshot());`, then `if (settled.status === 'unavailable') throw new Halt('GROUND_SNAPSHOT_UNAVAILABLE', 'the installed Playwright cannot produce an accessibility snapshot');`, then a `GROUND_UNSTABLE` halt when `settled.status === 'unstable'` whose detail is built only from `GROUND_STABLE_BOUND_MS` and `settled.reads` (for example `no two successive accessibility snapshots were equal within ${GROUND_STABLE_BOUND_MS} ms (${settled.reads} reads); nothing was written`), then `const yaml = settled.yaml;`. The rest of `runGround` (the candidate loop, `partitionSnapshotEntries`, the single `writeRunFile` call, the `GROUNDED:` stdout line, the `finally` that closes the browser) stays byte-identical. After this edit the text of `runGround` contains no `waitForLoadState(`.
  4. Leave untouched: the `goto` block and its 15 s timeout, `page.setDefaultTimeout(10000)` (it also bounds each single read: `locator.ariaSnapshot()` documents `timeout` as defaulting to 0 unless the page default is set), the guard call, the `// GUARD-SITE` and `// WRITE-SITE` markers, `OUTCOMES`, and the `run` mode's anonymous check (which keeps its own settle aid). Add no `import`, no write call and no CLI flag.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:89-99` (constants with a doc comment), `# SOURCE: plugins/relay/scripts/qa-run.mjs:3116-3126` (the exact lines being replaced), `# SOURCE: plugins/relay/scripts/qa-run.mjs:3161-3172` (a `Halt` is printed and exits 1) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:56-62` (no static sibling import).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { createServer } from "node:http";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, unlinkSync, rmdirSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawn } from "node:child_process";
  import { waitForStableSnapshot, GROUND_POLL_INTERVAL_MS, GROUND_STABLE_BOUND_MS } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };

  // 1. The pure loop, driven by a fake clock: an equal pair ends it, a changing page is bounded, an unreadable first read is unavailable.
  const reader = (...xs) => { let i = 0; return async () => (i < xs.length ? xs[i++] : xs[xs.length - 1]); };
  const settle = async (read) => { let t = 0; const r = await waitForStableSnapshot(read, { now: () => t, sleep: async (ms) => { t += ms; } }); return { r, elapsed: t }; };
  let o = await settle(reader("a", "a"));
  if (o.r.status !== "stable" || o.r.yaml !== "a" || o.r.reads !== 2 || o.elapsed !== GROUND_POLL_INTERVAL_MS) fail("an equal first pair must end the wait after one interval: " + JSON.stringify(o));
  o = await settle(reader("a", "b", "b"));
  if (o.r.status !== "stable" || o.r.yaml !== "b" || o.r.reads !== 3) fail("the settled value must be the one that repeated: " + JSON.stringify(o));
  o = await settle(reader("a", null, "a", "a"));
  if (o.r.status !== "stable" || o.r.reads !== 4) fail("an unreadable read must reset the pair: " + JSON.stringify(o));
  let n = 0;
  o = await settle(async () => "v" + n++);
  if (o.r.status !== "unstable" || "yaml" in o.r) fail("a page that never repeats must be unstable and carry no snapshot: " + JSON.stringify(o));
  if (o.elapsed > GROUND_STABLE_BOUND_MS) fail("the wait exceeded its bound: " + o.elapsed);
  if (o.r.reads < 2 || o.r.reads > Math.floor(GROUND_STABLE_BOUND_MS / GROUND_POLL_INTERVAL_MS) + 1) fail("the number of reads is outside the bound: " + o.r.reads);
  o = await settle(reader(null, "a", "a"));
  if (o.r.status !== "unavailable" || o.elapsed !== 0) fail("an unreadable first snapshot must end at once as unavailable: " + JSON.stringify(o));
  o = await settle(async () => { throw new Error("boom"); });
  if (o.r.status !== "unavailable") fail("a rejecting read must not throw out of the wait: " + JSON.stringify(o));

  // 2. The real runner against a loopback page that renders after load, and one that never settles.
  const SETTLES = `<!doctype html><html><body><h1>Panel</h1><div id="app"></div><script>setTimeout(() => { let h = ""; for (let i = 0; i < 60; i++) h += "<button>B" + i + "</button>"; document.getElementById("app").innerHTML = h; }, 400);</script></body></html>`;
  const NEVER = `<!doctype html><html><body><h1>Panel</h1><script>setInterval(() => { const b = document.createElement("button"); b.textContent = "T" + Math.random(); document.body.appendChild(b); }, 100);</script></body></html>`;
  const server = createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(String(req.url).split("?")[0] === "/never" ? NEVER : SETTLES);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const root = mkdtempSync(join(tmpdir(), "relay-ground-stable-"));
  const nm = join(root, "node_modules");
  let failure = null;
  try {
    symlinkSync(resolve("node_modules"), nm, "junction");
    for (const run of ["r1", "r2"]) mkdirSync(join(root, "PRPs", "reports", "f", "qa-run", run), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:" + server.address().port, roles: {} }));
    const ground = (run, route) => new Promise((res, rej) => {
      const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "ground", "--root", root, "--feature", "f", "--run-dir", "PRPs/reports/f/qa-run/" + run, "--route", route], { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let stdout = ""; let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      const timer = setTimeout(() => child.kill(), GROUND_STABLE_BOUND_MS + 90000);
      child.on("error", rej);
      child.on("close", (code) => { clearTimeout(timer); res({ code, stdout, stderr }); });
    });
    const settled = await ground("r1", "/settles");
    if (settled.code !== 0) throw new Error("ground on a page that settles exited " + settled.code + ": " + settled.stderr);
    const file = join(root, "PRPs", "reports", "f", "qa-run", "r1", "grounding", "anonymous--settles.snapshot.json");
    if (!existsSync(file)) throw new Error("no snapshot was written for the settled page: " + settled.stdout);
    const doc = JSON.parse(readFileSync(file, "utf8"));
    const has = (name) => doc.entries.some((e) => e.kind === "role" && e.role === "button" && e.name === name && e.matches === 1);
    if (doc.entries.length < 61 || !has("B0") || !has("B59")) throw new Error("the snapshot was taken before the page settled: " + doc.entries.length + " entries");
    const never = await ground("r2", "/never");
    if (never.code !== 1 || !never.stderr.includes("GROUND_UNSTABLE")) throw new Error("a page that never settles must exit 1 with GROUND_UNSTABLE: " + never.code + " " + never.stderr);
    if (never.stdout.includes("GROUNDED:")) throw new Error("an unstable page printed a GROUNDED line");
    if (existsSync(join(root, "PRPs", "reports", "f", "qa-run", "r2", "grounding"))) throw new Error("an unstable page left a grounding directory behind");
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(() => r(null)));
    try { unlinkSync(nm); } catch { try { rmdirSync(nm); } catch { /* not a link, or already gone */ } }
    if (!existsSync(nm)) rmSync(root, { recursive: true, force: true });
  }
  if (failure !== null) fail(failure);
  '
  ```
  Before this task `waitForStableSnapshot` is not exported, so the import fails and the command exits non-zero. Part 2 exercises the effect through the real runner and a real browser: it takes about 25 s because the never-settling page waits out the whole bound.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — inline-text candidates in `parseAriaSnapshot`

- **ACTION**: Delivers AC-A2 (each `- paragraph:`, `- listitem:` and `- cell:` line yields one text candidate with that content, and every candidate the parser produced before this change is unchanged). In `plugins/relay/scripts/qa-run.mjs`, immediately above `parseAriaSnapshot` (currently line 1080) and inside the function:
  1. Add a module-level `const INLINE_TEXT_LINE = /^\s*-\s+(?:paragraph|listitem|cell):\s*(.+?)\s*$/;` and `const INLINE_TEXT_CAP = 300;`, each with a one-line comment (the inline form has its own cap so a long table can never displace a button or a heading that follows it, which keeps the legacy candidate set identical for every input).
  2. Add a pure module-level helper `inlineScalar(raw)` returning the content of the value, or `null` when the content cannot be reproduced exactly. Playwright 1.61.1 emits a text value that needs quoting (one containing `: `, one that is numeric such as `42`, one starting with `-` or a quote, and so on) as a DOUBLE-quoted scalar and escapes only `\`, `"` and control characters (`node_modules/playwright-core/lib/coreBundle.js:6444-6498`), and it never leaves a value that starts with `"` unquoted. So: a value that starts with `"` must match `^"((?:[^"\\]|\\["\\])*)"$` and returns the body with `\"` and `\\` unescaped (any other backslash escape, such as `\n`, `\t` or `\x1f`, or an unterminated quote, returns `null`: the text cannot be matched exactly, so no candidate is better than a wrong one); any other value is returned as is, which is what Playwright emitted verbatim (a plain value may legitimately contain `"` or `\` after its first character). The unquoting applies to the three new line forms only; the existing `- text:` branch keeps returning its value verbatim.
  3. In the loop of `parseAriaSnapshot` replace the single `out.length >= 300` early exit by two counters: `plain` (role-and-name and `- text:` candidates, still capped at 300 exactly as before) and `inline` (capped at `INLINE_TEXT_CAP`); break only when both are exhausted. Keep the two existing branches byte-identical, and add a third branch after the `- text:` one: when the line matches `INLINE_TEXT_LINE`, take `inlineScalar(match[1])`, and when it is non-null, not blank after `trim()` and at most 200 characters, set `cand = { kind: 'text', text }` and mark it inline. A candidate whose counter is exhausted is skipped; the shared `seen` de-duplication, the 200-character limit and the `{ kind: 'text', text }` shape are unchanged, so `runGround` counts it with `getByText(text, { exact: true })` and `precheckGroundedSteps` finds it with its existing `kind === 'text'` rule.
  4. Do not change `LOCATOR_ROLES` (`paragraph` stays refused as a step role by the validator), the `- text:` regex, `partitionSnapshotEntries`, or any caller.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1085-1107` (the function being extended; its branches, cap, limit and de-duplication are preserved).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { createServer } from "node:http";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, unlinkSync, rmdirSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawn } from "node:child_process";
  import { parseAriaSnapshot } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };

  // 1. The pure parser: new line forms, unchanged legacy candidates, independent caps.
  const legacy = [`- banner:`, `  - link "home":`, `    - /url: /x`, `- heading "Panel" [level=1]`, `- button "Save"`, `- textbox "Nick"`, `- text: Hello there`, `- banana "Not a role"`, `- button ""`, `- cell "Named cell"`];
  const added = [`- paragraph: Registration details`, `- listitem: Full name`, `- cell: 2026-10-01`, `- paragraph: "Name: Ana"`, `- cell: "42"`, `- paragraph: "Say: \\"hi\\""`, `- cell: C:\\dir "x"`, `- cell: "a\\nb"`, `- paragraph:`, `- cell: "unterminated`];
  const wanted = ["Registration details", "Full name", "2026-10-01", "Name: Ana", "42", "Say: \"hi\"", "C:\\dir \"x\""];
  const base = parseAriaSnapshot(legacy.join("\n"));
  const mixed = parseAriaSnapshot([...legacy.slice(0, 4), ...added, ...legacy.slice(4)].join("\n"));
  let at = -1;
  for (const c of base) {
    const i = mixed.findIndex((m) => JSON.stringify(m) === JSON.stringify(c));
    if (i === -1 || i <= at) fail("a candidate produced before this change was lost or reordered: " + JSON.stringify(c));
    at = i;
  }
  for (const t of wanted) if (!mixed.some((m) => m.kind === "text" && m.text === t)) fail("no text candidate for " + JSON.stringify(t));
  if (mixed.length !== base.length + wanted.length) fail("unexpected candidates: " + JSON.stringify(mixed.slice(base.length)));
  if (parseAriaSnapshot(`- paragraph: ${"x".repeat(201)}`).length !== 0) fail("a 201-character inline value must be dropped");
  if (parseAriaSnapshot(`- paragraph: ${"x".repeat(200)}`).length !== 1) fail("a 200-character inline value must be kept");
  const buttons = Array.from({ length: 400 }, (_, i) => `- button "B${i}"`);
  const cells = Array.from({ length: 400 }, (_, i) => `- cell: c${i}`);
  if (parseAriaSnapshot(buttons.join("\n")).length !== 300) fail("the legacy cap of 300 changed");
  if (parseAriaSnapshot(cells.join("\n")).length !== 300) fail("the inline cap is not 300");
  const both = parseAriaSnapshot([...cells, ...buttons].join("\n"));
  if (both.length !== 600 || both.filter((c) => c.kind === "role").length !== 300) fail("inline candidates displaced a role-and-name candidate: " + both.length);

  // 2. The real runner: the page below reaches the snapshot file with real match counts.
  const PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Panel</h1><p>Registration details</p><ul><li>Full name</li></ul><table><tbody><tr><td>2026-10-01</td></tr></tbody></table></body></html>`;
  const server = createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE); });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const root = mkdtempSync(join(tmpdir(), "relay-ground-inline-"));
  const nm = join(root, "node_modules");
  let failure = null;
  try {
    symlinkSync(resolve("node_modules"), nm, "junction");
    mkdirSync(join(root, "PRPs", "reports", "f", "qa-run", "r1"), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:" + server.address().port, roles: {} }));
    const run = await new Promise((res, rej) => {
      const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "ground", "--root", root, "--feature", "f", "--run-dir", "PRPs/reports/f/qa-run/r1", "--route", "/"], { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d));
      const timer = setTimeout(() => child.kill(), 120000);
      child.on("error", rej);
      child.on("close", (code) => { clearTimeout(timer); res({ code, stderr }); });
    });
    if (run.code !== 0) throw new Error("ground exited " + run.code + ": " + run.stderr);
    const file = join(root, "PRPs", "reports", "f", "qa-run", "r1", "grounding", "anonymous--root.snapshot.json");
    const doc = JSON.parse(readFileSync(file, "utf8"));
    // Playwright serializes a named table cell as a cell role entry, which the existing role branch grounds; either entry kind proves the value reaches the file with a real match count.
    for (const t of ["Registration details", "Full name", "2026-10-01"]) {
      if (!doc.entries.some((e) => e.matches === 1 && (e.kind === "text" ? e.text === t : e.role === "cell" && e.name === t))) throw new Error("no entry with one match for " + t + ": " + JSON.stringify(doc.entries));
    }
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(() => r(null)));
    try { unlinkSync(nm); } catch { try { rmdirSync(nm); } catch { /* not a link, or already gone */ } }
    if (!existsSync(nm)) rmSync(root, { recursive: true, force: true });
  }
  if (failure !== null) fail(failure);
  '
  ```
  Before this task the parser yields nothing for the three new forms, so the first presence assertion exits non-zero. The `added` lines are the real serializer's forms: a plain value, a double-quoted value with a colon, a double-quoted number, a double-quoted value with escaped quotes, a plain value that carries a backslash and quotes after its first character, then the three that must yield nothing (an unsupported escape, no value, an unterminated quote). The fixtures are ASCII so the script survives a Windows shell. The end-to-end part accepts the table-cell value as either a `text` entry (the inline form) or a `cell` role entry (what Playwright emits for a named cell, which the existing role branch already grounds); the inline cell form itself is proven by the pure part, so a `<td>` cannot make the end-to-end assertion unpassable after a correct implementation.

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs — carry-over from Phase 1 (KD-1): the bounded echo of a plan value never throws

- **ACTION**: Carry-over from Phase 1, not PRD Phase 2 scope. Delivers AC-A4 (a plan value such as `{"toString":1}` in `class`, `reason_code` or `objective_steps` yields `PLAN_ENTRY_INVALID`, the case is reported `unclassified`, and `results.json` is still written: N cases in, N entries out). In `validatePlanClassification` (currently lines 1241-1273) replace the one-line body of the local helper `bounded` so that the coercion cannot throw: take `String(v)` inside a `try`, fall back inside the `catch` to `Object.prototype.toString.call(v)` (which names the type and never calls a planner-supplied method), then return `JSON.stringify(text.slice(0, 64))`. The cause is that `String(v)` throws a `TypeError` for an object whose own `toString` is not callable, and `classOf`, `objectiveStepsOf` and `applyClassification` all inherit `validatePlanClassification`, while `applyClassification` runs unguarded in `runRun`'s `finally` (currently line 2925), so one such entry used to end the run `FAILED_RUNNER_ERROR` with no `results.json`. Every call site of `bounded`, every refusal sentence and every output for a value that does not throw stay byte-identical (`JSON.stringify("bogus")` still renders `"bogus"`, and a 500-character value is still echoed as 64 characters at most). Do not touch `applyClassification`, `runRun` or any other helper, and add no new export.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1241-1246` (the helper and its two siblings in the same function).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawnSync } from "node:child_process";
  import { validateResults } from "./scripts/validate/checks/qa-run-contract.mjs";
  import { validatePlanClassification, classOf, objectiveStepsOf, declinedCase, applyClassification } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };

  // 1. The pure functions never throw on a hostile value and refuse it as PLAN_ENTRY_INVALID.
  const hostile = [{ toString: 1 }, { toString: 1, valueOf: 1 }, [{ toString: 1 }]];
  for (const field of ["class", "reason_code", "objective_steps"]) {
    for (const h of hostile) {
      const entry = { index: 1, title: "t", [field]: h };
      let r;
      try { r = validatePlanClassification(entry); } catch (e) { fail(field + " threw " + (e instanceof Error ? e.name : typeof e)); }
      if (!r || r.code !== "PLAN_ENTRY_INVALID" || typeof r.reason !== "string" || r.reason.length > 400) fail(field + " was not refused as PLAN_ENTRY_INVALID: " + JSON.stringify(r));
      if (classOf(entry) !== "unclassified" || objectiveStepsOf(entry) !== null || declinedCase(entry) !== null) fail(field + " leaked through a reader");
      const stamped = applyClassification([{ index: 1, title: "t" }], new Map([[1, entry]]));
      if (stamped[0].class !== "unclassified" || stamped[0].objective_steps !== null) fail(field + " was not stamped unclassified");
    }
  }
  const named = validatePlanClassification({ index: 1, title: "t", class: "bogus", reason_code: "EXTERNAL_CHANNEL" });
  if (!named || !named.reason.includes("\"bogus\"")) fail("a value that never threw must still be echoed as before: " + JSON.stringify(named));

  // 2. The real runner still writes results.json for a plan that carries such values.
  const FEATURE = "feat";
  const runRel = "PRPs/reports/feat/qa-run/20261010T101010101Z";
  const root = mkdtempSync(join(tmpdir(), "relay-qa-kd1-"));
  try {
    mkdirSync(join(root, ...runRel.split("/")), { recursive: true });
    const titles = ["Hostile class", "Hostile code", "Hostile steps", "Control"];
    const block = (t, i) => ["### Case " + (i + 1), "**Title:** " + t, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + titles.map(block).join("\n") + "\n## Notes\n\nnone\n");
    const plan = JSON.parse(JSON.stringify([
      { index: 1, title: titles[0], class: { toString: 1 }, reason_code: "EXTERNAL_CHANNEL" },
      { index: 2, title: titles[1], class: "human-by-nature", reason_code: { toString: 1 } },
      { index: 3, title: titles[2], class: "automatable", driver: "http", role: null, state: "none", steps: [{ action: "request", method: "GET", path: "/x" }], objective_steps: { toString: 1 } },
      { index: 4, title: titles[3], class: "human-by-nature", reason_code: "EXTERNAL_CHANNEL" },
    ]));
    writeFileSync(join(root, ...runRel.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: plan }));
    const r = spawnSync(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", FEATURE, "--run-dir", runRel], { encoding: "utf8", cwd: root });
    if (r.status !== 0) fail("the run exited " + r.status + ": " + r.stderr);
    const res = JSON.parse(readFileSync(join(root, ...runRel.split("/"), "results.json"), "utf8"));
    if (res.cases.length !== 4) fail("N cases in, N entries out was broken: " + res.cases.length);
    for (const i of [0, 1, 2]) {
      const c = res.cases[i];
      if (c.outcome !== "needs-human" || c.reason_code !== "PLAN_ENTRY_INVALID" || c.class !== "unclassified" || c.objective_steps !== null) fail("case " + (i + 1) + " is " + JSON.stringify([c.outcome, c.reason_code, c.class, c.objective_steps]));
    }
    const control = res.cases[3];
    if (control.reason_code !== "EXTERNAL_CHANNEL" || control.class !== "human-by-nature") fail("the control case changed: " + JSON.stringify(control));
    const problems = validateResults(res);
    if (problems.length > 0) fail("the results do not satisfy the contract: " + problems.join("; "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  '
  ```
  Before this task the first pure check throws a `TypeError`, and the real run ends `FAILED_RUNNER_ERROR` with no `results.json`, so the command exits non-zero either way.

### Task 5: UPDATE plugins/relay/commands/relay-qa-run.md — the `ground` section (stability, `GROUND_UNSTABLE`, the Git Bash note) and the carry-over doc coherence

- **ACTION**: Delivers AC-A3 (the doc half: the `MSYS_NO_PATHCONV=1` note for a leading-slash `--route` under Windows Git Bash, and the new halt documented) and AC-A5 (carry-over from Phase 1: the two sentences that contradict the one-entry-per-case rule are reconciled; no runner behavior changes). In `plugins/relay/commands/relay-qa-run.md`:
  1. The `ground` section (currently lines 167-179). Keep the lead sentence and the fenced `bash` command line byte-identical. After the sentence that appends `--role` and `--env-handle`, add, in this order: (a) one sentence that the route starts with a single `/`; (b) the Git Bash note: under Windows Git Bash, MSYS rewrites a leading-slash argument such as `--route "/perfil"` into a Windows path before the script sees it and the script then exits 2 with its usage text, so run the same `node` line with `MSYS_NO_PATHCONV=1` set as a prefix, while PowerShell and POSIX shells do not rewrite the argument; write it as prose with the token `` `MSYS_NO_PATHCONV=1` `` and no new fenced block; (c) the stability paragraph, containing these literal phrases: "two successive accessibility snapshots", "taken 1 second apart", "at most 20 seconds", and the sentence that a page that never settles (a live counter, an animation, a request that never ends) ends the command with `` `GROUND_UNSTABLE` ``, a non-zero exit and no snapshot file, because a locator planned from a page that was still changing is a guess. Each of the phrases `taken 1 second apart` and `at most 20 seconds`, and the token `MSYS_NO_PATHCONV=1`, must stay on ONE physical line of the doc: Task 6's contract rule and its mutation read the raw text, whereas the whitespace-collapsing check in this task's `VALIDATE` would tolerate a wrap. `20 seconds` must appear nowhere else in the file (today the only near-miss is `240 seconds` in the minted-session paragraph, which does not contain it), because Task 6's mutation replaces only the phrase `at most 20 seconds`. Then keep the sentence about `GROUNDED: <path> entries=<n> withheld=<m>` and reading the snapshot file, change "role-and-name and visible-text entries" to say that visible-text entries include the text of paragraph, list-item and cell lines, and extend the list of example halts with `GROUND_UNSTABLE`.
  2. Carry-over (b), the halt sentence. Replace "relay it, plan no locator step for that route, and leave the case to the script." by: relay the halt and plan no locator step for that route; a halted `ground` never leaves a case without an entry, so every case whose steps need a locator on that route gets a declining entry with its class from the frozen table below and the code `STEP_UNGROUNDED`, or `UNGROUNDABLE_AFTER_INTERACTION` when the element exists only after an interaction, and the script reports it with the manual steps verbatim. The phrase "leave the case to the script" must not remain anywhere in the file.
  3. Grounding rules (currently lines 228-248). Add one sentence that a text entry may come from a paragraph, list-item or cell line of the snapshot and is matched exactly against visible text like any other `text` locator, and must still match exactly one element. The physical line that holds `` `matches` is exactly `1` `` (currently line 229) stays unedited and unwrapped: `qa-run-ui-grounding.test.mjs:733` matches it with a regex that has no whitespace class, so it must remain on one physical line. Keep the `STEP_UNGROUNDED` decline rule and the `PRPs/redaction-extensions.txt` paragraph as they are.
  4. Carry-over (b), record resolution (currently lines 489-495). Keep the heading and the first sentence. Replace "You write no plan entry for this and a plan entry for such a case is ignored once it resolves." by prose stating that the planner does not resolve the record itself and still writes the one entry per case, because the script cannot tell before it runs whether a record resolves; when the record resolves, the entry decides nothing about the outcome (only its `class` and `objective_steps` are still read, so the case is still classified), and when it does not resolve the case routes on the entry like any other. Leave every bullet of that section untouched (`qa-run-per-test-resolution.test.mjs:342-369` pins two of them as single physical lines and requires `- When the field cites only a file` to come after the first `never added to them.`), and do not repeat that phrase in the new prose. Do not use the phrase "omit the case" (case-insensitive) anywhere.
  5. Do not touch the frozen classification table, the catalogue table (no new table row of the form `` | `CODE` | `needs-human` | ``), any `qa-step-example` or `qa-plan-entry-example` block, or any other fenced `json` block, and add no new `json` block and no new `<!-- qa-step-example -->` marker. Never write, anywhere in the file, `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`, `--local-host`, `Until seeds`, `not yet read by the runner`, a bare `redaction-policy.md` basename, `a CLI, a database query` or any `..HEAD` diff form.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:167-179` and `# SOURCE: plugins/relay/commands/relay-qa-run.md:489-495`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const flat = doc.replace(/\s+/g, " ");
  const present = ["`GROUND_UNSTABLE`", "`MSYS_NO_PATHCONV=1`", "two successive accessibility snapshots", "taken 1 second apart", "at most 20 seconds", "qa-run.mjs\" ground --root", "STEP_UNGROUNDED", "UNGROUNDABLE_AFTER_INTERACTION", "PRPs/redaction-extensions.txt", "never omit a case"];
  for (const p of present) if (!flat.includes(p)) fail("the command doc lacks: " + p);
  if (!/`matches` is exactly `1`/.test(doc)) fail("the exactly-one grounding phrase is not on one physical line");
  const absent = ["leave the case to the script", "You write no plan entry for this", "Until seeds", "not yet read by the runner", "a CLI, a database query", "--local-host", ".claude/PRPs", "design-spec", "relay-auth-setup", "subagent_type"];
  for (const a of absent) if (flat.includes(a)) fail("the command doc still carries: " + a);
  if (/omit the case/i.test(flat)) fail("the doc says omit the case again (pinned absent by qa-run-classification.test.mjs)");
  // RELAY-FIRST-MATCH-INTENDED: indexOf takes the FIRST occurrence on purpose; the target phrase closes the record_resolved bullet that opens the record-resolution bullets, and the granularity bullet is pinned to come after that first occurrence.
  if (doc.indexOf("never added to them.") === -1 || doc.indexOf("- When the field cites only a file") < doc.indexOf("never added to them.")) fail("the record-resolution bullet order pin is broken");
  const r = runQaRunContractCheck();
  if (!r.ok) fail(JSON.stringify(r.findings, null, 2));
  '
  node --test scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-query.test.mjs scripts/validate/checks/qa-run-per-test-resolution.test.mjs scripts/validate/checks/qa-run-minted-session.test.mjs
  node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs
  ```
  The `present` literals are copied byte-for-byte from the ACTION above (the deliverable here is the doc text, so a text match is the legitimate check); the `absent` list is the pinned-forbidden set. The eight named test files are the ones that read the command doc (the grounding and catalogue pins, the state-block parsing, the record-resolution bullets, the minted-session tokens) and pass on the unmodified tree; the last command selects only the two doc-reading tests of the ui-grounding file, so the assertion Task 3 makes stale (see `## Notes`) is not selected.

### Task 6: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the usage text, the named halt, the absence of a swallowed wait and the doc tokens

- **ACTION**: Delivers AC-A3 (the usage text and the doc note cannot drift) and AC-A8 (the check is extended, not duplicated; the registered count stays 28). In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Widen the import from `../../../plugins/relay/scripts/qa-run.mjs` to also import `USAGE`, `GROUND_STABLE_BOUND_MS` and `GROUND_POLL_INTERVAL_MS`.
  2. Add the input `requireGround` (default `false`, exactly like `requireCatalogue`) to `checkQaRunContract` and to its JSDoc type. When it is true: (a) in the script text, the header block (the text before the first `\nimport `) must contain `qa-run.mjs ground --root`; the imported `USAGE` must contain `qa-run.mjs ground` and each of the six flags `--root`, `--feature`, `--run-dir`, `--route`, `--role` and `--env-handle`; the script must contain `GROUND_UNSTABLE`; and the text between `async function runGround(` and `async function runGroundGuarded(` must exist and must not contain `waitForLoadState(` (a swallowed readiness wait is replaced by the stable-snapshot wait; the anonymous check elsewhere in the file keeps its own); (b) in the command text, each of `GROUND_UNSTABLE`, `MSYS_NO_PATHCONV=1`, `${GROUND_POLL_INTERVAL_MS / 1000} second apart` and `${GROUND_STABLE_BOUND_MS / 1000} seconds` must appear, so the numbers in the doc follow the constants. One finding per missing token, each message naming the token. No message may contain the phrases `is outside the closed vocabulary` or `step example`, and none may name a catalogue code (the existing catalogue tests count findings per code).
  3. `runQaRunContractCheck` passes `requireGround: true` beside `requireStepExamples: true` and `requireCatalogue: true`. No other caller changes. Update the file's header comment to list the new rules. Add no write call and no new registered check.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:214-220` (an opt-in rule block over the script text), `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:181-184` (the flag beside `requireCatalogue`) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:398-409` (the real-tree entry point is the only opt-in caller).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { checkQaRunContract, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const script = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
  const input = (o = {}) => ({ scriptText: script, commandText: doc, results: [], requireGround: true, ...o });
  const clean = checkQaRunContract(input());
  if (!clean.ok) fail("the real runner and doc must satisfy the ground rules: " + JSON.stringify(clean.findings));
  const flagged = (label, r, token) => { if (r.ok || !r.findings.some((f) => f.message.includes(token))) fail(label + " was not flagged naming " + token + ": " + JSON.stringify(r.findings)); };
  flagged("a header without the ground usage line", checkQaRunContract(input({ scriptText: script.split("qa-run.mjs ground --root").join("qa-run.mjs gone --root") })), "ground");
  flagged("a script that lost GROUND_UNSTABLE", checkQaRunContract(input({ scriptText: script.split("GROUND_UNSTABLE").join("GROUND_STABLE_X") })), "GROUND_UNSTABLE");
  flagged("a ground mode that waits on a load state again", checkQaRunContract(input({ scriptText: script.replace("async function runGroundGuarded(", "// await page.waitForLoadState(\"networkidle\")\nasync function runGroundGuarded(") })), "waitForLoadState");
  flagged("a doc without the Git Bash note", checkQaRunContract(input({ commandText: doc.split("MSYS_NO_PATHCONV=1").join("MSYS_GONE") })), "MSYS_NO_PATHCONV=1");
  flagged("a doc that stopped naming the halt", checkQaRunContract(input({ commandText: doc.split("GROUND_UNSTABLE").join("GROUND_GONE") })), "GROUND_UNSTABLE");
  flagged("a doc whose bound disagrees with the constant", checkQaRunContract(input({ commandText: doc.split("at most 20 seconds").join("at most 5 minutes") })), "seconds");
  const quiet = checkQaRunContract(input({ requireGround: false, scriptText: script.split("GROUND_UNSTABLE").join("GROUND_STABLE_X"), commandText: doc.split("MSYS_NO_PATHCONV=1").join("MSYS_GONE") }));
  if (quiet.findings.some((f) => /ground|MSYS_NO_PATHCONV/i.test(f.message))) fail("the ground rules leaked into a caller that did not opt in: " + JSON.stringify(quiet.findings));
  const real = runQaRunContractCheck();
  if (!real.ok) fail("the real-tree contract failed: " + JSON.stringify(real.findings, null, 2));
  '
  ```
  Before this task the new flag is ignored, so every `flagged(...)` assertion exits non-zero. Every mutation above is built from the real script or doc text, so none can pass because a fixture never contained the token.

## Validation Commands

The plan writer has no shell tool: every command below, and every per-task `VALIDATE` above, was derived by reading the current tree, not executed.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The diff base for this phase is the tree recorded after Phase 1 (single-argument form: working tree against the tree object).
BASE=03d30458da38f019fbadc088fbb107451cd10076
git cat-file -e "${BASE}^{tree}"
# The contract (usage text, named halt, no swallowed wait, doc tokens, catalogue, classes, results rules, examples) holds on the real tree, and the outcome vocabulary is intact.
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { OUTCOMES } from "./plugins/relay/scripts/qa-run.mjs";
if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") { console.error("OUTCOMES changed"); process.exit(1); }
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# No static import of a sibling file was added to the runner (the copy-helper tests copy only the runner and the guard).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# AC-14: the five frozen surfaces are byte-identical to the base tree.
frozen="$(git diff --name-only "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# The retired per-run host flag must not reappear in the two files the guard-site check lists.
if grep -nF -e "--local-host" plugins/relay/commands/relay-qa-run.md plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: --local-host appeared (forbidden by the auth-local-guard-sites check)"; exit 1
else
  echo "PASS: no --local-host"
fi
# No forbidden .claude/PRPs reference introduced by this phase's three files outside the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite must still register and pass 28 checks (the summary line is printed by scripts/validate/index.mjs).
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out"; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
# The whole corpus, glob quoted. The skip pattern excludes exactly the one assertion this phase makes stale (a test-pair
# EXISTING_TEST_UPDATED follow-up, see Notes); --test-skip-pattern, never --test-name-pattern with a negative lookahead.
node --test --test-skip-pattern="parseAriaSnapshot unescapes quotes" "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** `ground` writes a snapshot only after two successive accessibility snapshots are equal within a bounded wait, so for a route that holds fewer entries at `load` than once settled the entry count equals the settled count; when no equal pair appears within the bound it exits non-zero with `GROUND_UNSTABLE`, writes no snapshot file and prints no `GROUNDED:` line, and no timeout is swallowed (the ground mode contains no `waitForLoadState(`).
- **AC-A2 (PRD AC-2):** the lines `- paragraph: <text>`, `- listitem: <text>` and `- cell: <text>` each yield one `{ kind: 'text', text }` candidate with that content, every candidate `parseAriaSnapshot` produced before this change is unchanged and in the same relative order, and a step is still planned from a candidate only when it matches exactly one element at plan time and at run time.
- **AC-A3 (PRD AC-18):** the `ground` mode and its six flags appear in the header usage block, in `USAGE` (and therefore `--help`) and in the bad-argument usage text, and `relay-qa-run.md` documents `MSYS_NO_PATHCONV=1` for a leading-slash `--route` under Windows Git Bash and documents `GROUND_UNSTABLE`; `qa-run-contract` pins these, extended and not duplicated. This phase adds no step to the closed vocabulary, so no new `qa-step-example` block is required.
- **AC-A4 (PRD AC-7):** a plan value such as `{"toString":1}` in `class`, `reason_code` or `objective_steps` makes the entry `PLAN_ENTRY_INVALID`, the case is reported `unclassified` with a `null` objective-step count, `results.json` is still written, and N cases in still yield N entries out.
- **AC-A5 (PRD AC-6):** the command doc tells the planner to decline a case whose route could not be grounded with a catalogued code (`STEP_UNGROUNDED`, or `UNGROUNDABLE_AFTER_INTERACTION` for an element that exists only after an interaction) and never to leave it without an entry, and its record-resolution paragraph states the one-entry-per-case rule consistently with the runner, which ignores the entry's outcome once a record resolves.
- **AC-A6 (PRD AC-14):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-phase content, `OUTCOMES` is still exactly the four values, and `qa-run.mjs` keeps one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(` and no static sibling import.
- **AC-A7 (PRD AC-15):** `ground` still passes the target through the already-loaded local-only guard (`FAILED_NON_LOCAL_TARGET`) before any request, and the stable wait re-reads the page it already loaded, adding no request site and no second `// GUARD-SITE`.
- **AC-A8 (PRD AC-17):** `npm run validate` passes all 28 checks (`qa-run-contract` extended, no check added) and the corpus `node --test "scripts/validate/**/*.test.mjs"` is green once the one stale assertion named in `## Notes` is updated by the test pair.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False stability: a loading skeleton that persists longer than one polling interval is read as settled, so the planner plans from an incomplete page | M | M | A fixed 1 s sampling interval (the longest step of Playwright's own polling schedule, a stricter reading than its two-frame `stable` check); plan-time `matches === 1` and the run-time exact-count check still refuse an element the skeleton lacks; both numbers are exported and doc-pinned so Phase 8 recalibrates against the teacher `/perfil` count |
| False instability: a page with a live counter or an animation never produces an equal pair, so a groundable route ends `GROUND_UNSTABLE` and its case declines `STEP_UNGROUNDED`, lowering the metric | M | M | A 20 s bound (a longer wait costs only wall time on a rare route, a falsely unstable page costs a case); the halt is named and relayed; the PRD records this risk and the secondary rate reports it |
| New code disturbs a source-text pin of `qa-run.mjs` (a second `// GUARD-SITE` or `// WRITE-SITE`, a second `writeFileSync(` or `renameSync(`, a quoted `outcome:` literal, a mutation anchor such as the `keepSteps` line or the `return { outcome: 'pass', ...` line) | M | H | Tasks 1 to 4 list the forbidden strings, the wait reports through a `status` key, and Level 2 runs the real-tree contract; the corpus mutation tests run in Level 3 |
| A static sibling import breaks the copy-helper tests (they copy only `qa-run.mjs` and `auth-local-guard.mjs`) | L | H | Every helper lives in `qa-run.mjs`; the default `sleep` uses `setTimeout` only; Level 2 greps for a static relative import and fails on any |
| A doc edit breaks a doc-reading test (the `qa-run.mjs" ground --root` pin, the one-physical-line exactly-one regex, `omit the case`, the catalogue table rows, every `json` illustration validating, the record-resolution bullets) | M | M | Task 5 names each pin and the safe shapes; its `VALIDATE` runs the eight doc-reading test files, the two doc tests of the ui-grounding file and the real-tree contract |
| Inline text candidates widen the personal data a grounding snapshot can hold (names, task titles) before Phase 3's ignore rule and proof exist | M | M | The partition that withholds secrets, e-mail addresses and `regex:` lines is untouched and covers the new entries; Phase 3 has no dependency on this phase and Phase 7 depends on it, so it lands before any release |
| The inline YAML quoting form was read from the installed Playwright (1.61.1); another version may serialize differently | L | L | The unquoting handles exactly the double-quoted form with two escapes and yields nothing for anything else, so an unknown form degrades to "not plannable", never to a wrong locator; the dogfood reads real output |
| The slower `ground` (at least one interval per call, about 20 s on a never-settling page) pushes an end-to-end test past a timeout | L | L | Every browser test in the corpus runs under a 170 s test timeout and a 150 s child kill timer; the six existing ground calls gain 1 to 2 s each; the new never-settling case is one test of about 25 s |
| An existing test assertion goes stale in a way this analysis missed | L | M | The one known stale assertion is named in `## Notes` for the test pair; any other is routed the same way, never edited by the Implementer |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so no new test file is authored here and this plan's `**VALIDATE**` commands exercise the change directly (the Task 5 command and Level 3 additionally run `node --test` over existing test files that this plan does not edit).
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A5 and AC-A8).** AC-A1: `waitForStableSnapshot` with a fake clock (equal first pair, changed-then-equal, an unreadable read that resets the pair, a never-repeating reader that stays within the exported bound and read count, an unreadable first read, a rejecting read); an end-to-end fixture that renders after `load` (render delay below `GROUND_POLL_INTERVAL_MS`) whose written entry count equals the settled count; a never-settling fixture that exits 1 with `GROUND_UNSTABLE`, leaves no `grounding/` directory and prints no `GROUNDED:` line (about 20 s; template: the unloadable-route test at `qa-run-ui-grounding.test.mjs:612-625`, which needs a new mutating route in its server handler at lines 397-408). AC-A2: the three line forms, a differential proof that the legacy candidates are unchanged and in order, double-quoted scalars (a colon, a number, escaped quotes, an unsupported escape, an unterminated quote), a plain value carrying a backslash after its first character, a blank value, the 200-character limit, and the independent caps (400 buttons give 300, 400 cells give 300, 400 cells followed by 400 buttons give 600 with all 300 buttons kept); a quoted `- text:` value staying verbatim; an end-to-end page with a `<p>`, a `<li>` and a `<td>` whose text reaches the snapshot file with `matches: 1` (the cell value may arrive as a `cell` role entry, the form Playwright emits for a named cell; either kind passes). AC-A3: `--help` stdout lists `qa-run.mjs ground` and the six flags, a bare `ground` exits 2 with the ground usage line and the `MSYS_NO_PATHCONV=1` note, the extended `requireGround` rules (one finding per missing token, silent for a caller that does not opt in, the real runner and doc clean). AC-A4: each of `class`, `reason_code` and `objective_steps` holding `{"toString":1}` through `validatePlanClassification`, `classOf`, `objectiveStepsOf`, `declinedCase` and `applyClassification`, and an end-to-end run whose `results.json` is written (the fixture of Phase 1's `qa-run-classification.test.mjs` is the template). AC-A5: the doc no longer contains "leave the case to the script" or "You write no plan entry for this" and states the one-entry-per-case rule in the record-resolution section.
- **Test-pair follow-up, existing assertions.** One stale assertion (`EXISTING_TEST_UPDATED`): `scripts/validate/checks/qa-run-ui-grounding.test.mjs:207-215`, the test "AC-13 parseAriaSnapshot unescapes quotes, drops unsupported roles, prose, blank names and duplicates". Its fixture line 189 is `- paragraph: ignored prose` and line 212 asserts `!got.some((e) => e.text === 'ignored prose')`; under AC-2 that line is now a text candidate, so the update turns the assertion into a presence assertion (and the test title no longer says it drops prose). Level 3 excludes exactly this test with `--test-skip-pattern="parseAriaSnapshot unescapes quotes"` until the pair lands the update. Expected to need NO edit: `qa-run-ui-grounding.test.mjs:149` (`paragraph` is still refused as a step role: `LOCATOR_ROLES` is unchanged), `:217-225` (the 300 cap and the 200-character limit), `:543-561` (bad-argument exit 2 with `Usage:`), `:567-625` (the real-browser ground tests use a static page that is stable at once, and pin the `GROUNDED:` line end-of-line shape and the snapshot's five keys, both unchanged; they only run at least one polling interval longer), `:714-735` (the doc pins, all kept), `qa-run.test.mjs:1171-1180` (`--help` exits 0 and includes `qa-run.mjs run`; a bare mode and bad flags still exit 2 with `Usage:`), the `qa-run-classification.test.mjs` pins (`:246-256` bounded-echo lengths, `:506-514`, `:545-552`, `:554-578` doc pins), `qa-run-per-test-resolution.test.mjs:342-369` (the record-resolution bullets are untouched) and the mutation anchors of `qa-run-contract.test.mjs` and `qa-run.test.mjs`, which this design does not touch. No test names `USAGE`, `GROUND_USAGE` or the header comment, and no test enumerates the exports of `qa-run.mjs`, so the new exports (`USAGE`, the two constants, `waitForStableSnapshot`) are additive.
- **Open Question resolved here (bound and polling interval of the stable wait).** Interval `GROUND_POLL_INTERVAL_MS = 1000`, bound `GROUND_STABLE_BOUND_MS = 20000`. These are chosen, not measured on a real single-page application: the plan writer has no shell, and no primary source documents a two-equal-snapshots strategy. The grounding they rest on: (1) Playwright's `expect.poll` and `toPass` share the polling schedule `[100, 250, 500, 1000]` ms, so 1000 ms is the longest step it ever uses, and a fixed 1 s sampling period means an equal pair certifies at least one full second without a change; (2) the only documented "two successive equal readings" precedent is Playwright's own `stable` actionability check (the same bounding box for two consecutive animation frames, about 33 ms), so a pair one second apart is the deliberately stricter reading that a client-rendered page needs, because it fetches data after first paint (the 2-versus-66 case); (3) `networkidle` is marked DISCOURAGED by Playwright ("rely on web assertions to assess readiness instead"), which is why the readiness wait it was used for is replaced rather than lengthened; (4) the bound reuses the repository's own 20-second precedent for waiting on a page state (`ANONYMOUS_CHECK_MS`) and is longer than the 5 s `networkidle` timeout that was being swallowed; the asymmetry decides it, because a falsely unstable page costs a case while a longer wait costs only wall time on a rare route; (5) `locator.ariaSnapshot()` documents `timeout` as defaulting to 0 (no timeout) unless the page default is set (`node_modules/playwright-core/types/types.d.ts:13066-13093`), and `runGround` already sets `page.setDefaultTimeout(10000)`, so each single read is itself bounded and the whole wait is bounded by the loop deadline plus at most one read. The residual risk (a skeleton that holds for more than one second reads as settled) is recorded under Risks and is the first thing the Phase 8 dogfood reads, against the 66-entry teacher tree; both numbers are exported constants pinned against the doc by `qa-run-contract`, so recalibrating is one line in the script and one in the doc.
- **Why the inline form has its own cap.** The existing parser stops at 300 candidates in document order. A table of cells placed before a toolbar would, under one shared cap, push the toolbar's buttons out and silently change the set of candidates the parser produced before. Two independent counters make "no candidate the parser produced before is lost, and the legacy candidates keep their relative order" hold for every input but one, at a worst case of 600 candidates (about 600 `count()` calls, a few seconds). The one exception is the shared `seen` de-duplication: an inline line whose text equals the text of a legacy `- text:` line that comes LATER in the snapshot yields one candidate, at the inline position, and the later legacy line collapses into it (the same de-duplication the parser always applied, so nothing is lost, but that single candidate sits earlier than before). A separate `seen` set for the inline form would restore the position and would emit that value twice into the snapshot file, which is the worse trade, so it is not folded in.
- **Why the inline form unquotes, and only as far as the serializer goes.** In Playwright 1.61.1 (`node_modules/playwright-core/lib/coreBundle.js:6444-6498`) a text value is quoted when it is empty, has leading or trailing whitespace, starts with `-` or one of ``& * ] , ? ! > | @ " ' # %``, contains `: ` (or ends with a colon), ` #`, `{`, `}` or a backtick, or is numeric or one of `y n yes no true false on off null`; a quoted value is double-quoted with `\\`, `\"`, `\b`, `\f`, `\n`, `\r`, `\t` and `\xNN` escapes, whereas a key (a role plus its name) is single-quoted, which is why the existing role-and-name branch is untouched. A verbatim candidate would therefore carry the quotes and `getByText(..., { exact: true })` would count 0. The new forms decode only the two escapes that can occur in ordinary visible text and yield nothing for the control-character escapes, whose text `getByText` could not match exactly anyway. The existing `- text:` branch is left verbatim on purpose: AC-2 requires its candidates to stay unchanged, so a quoted `- text:` value remains unplannable (a conservative miss, never a false match). Registered as a possible follow-up, not folded in.
- **KD-1 scope.** The defect is the `String(v)` inside the local `bounded` helper of `validatePlanClassification`. `executeCase` already runs it inside the per-case `try`, so a hostile value degrades to a runner-error case there; the loss of `results.json` came from `applyClassification` in the `finally` of `runRun`, which has no `try`. Making the coercion total removes the throw at its source for all four callers at once. The `String(name)` in `classifyApiOrigin` is left alone: `stepRules` already forces `origin` to a string matching `API_ORIGIN_NAME` before execution, and the call is inside the per-case `try`.
- **Ordering.** Tasks 1 to 4 touch four disjoint regions of `qa-run.mjs` (header and usage, the wait and `runGround`, `parseAriaSnapshot`, `validatePlanClassification`); Task 5 (doc) reads the constants from Task 2 in its `VALIDATE`, and Task 6 (contract) must follow Tasks 1, 2 and 5 because its real-tree check reads the usage text, the halt and the doc tokens.
- **Scope of docs.** `docs/api-reference.md` (the `/relay-qa-run` rows that mirror the `ground` usage line) and the `documentation/` pages (`reference/scripts.html`, `reference/commands.html`, `changelog.html`) are not edited here: the `docs_sync` pass owns `docs/` at implement time and the site pages belong to Phase 7 per `documentation/AGENTS.md`.
- **Research.** `research-codebase` ran two rounds. The first located every anchor above (the `runGround` body and its exit codes, the parser and its consumers, the three usage surfaces, the unguarded `applyClassification`, the absence of any sleep helper, the 31 ui-grounding tests). The second enumerated every existing assertion that constrains the edited files (the doc pins in five test files, the source-text pins and mutation anchors, the usage assertions, the ground call count and wall-clock limits) and read the installed Playwright's serializer and `ariaSnapshot` options. `research-web` found the Playwright polling defaults, the `networkidle` DISCOURAGED wording, the `ariaSnapshot` `timeout` option and the Git for Windows `MSYS_NO_PATHCONV` note; it found no primary source for a two-equal-snapshots strategy, which is why the numbers above are a recorded judgment. Not read by the research rounds: the 25 generic checks of `scripts/validate/index.mjs` (none names `qa-run` in its source) and the remaining mutation anchors of `qa-run-layout.test.mjs` and `qa-run-kit-hardening.test.mjs`; none of them touches the regions edited here, and Level 3 runs the whole corpus.
- **Git Bash note, source.** The Git for Windows release notes document that command-line options starting with a slash trigger POSIX-to-Windows path conversion and that `MSYS_NO_PATHCONV=1` set for one command avoids it; the MSYS2 pages document `MSYS2_ARG_CONV_EXCL` instead and never mention `MSYS_NO_PATHCONV`, so the doc names only the variable the dogfood used.
- The plan writer has no shell tool: every `VALIDATE` command was derived by reading the current tree, not executed. Tasks 1 to 4 and Task 6 fail before the work (`USAGE` and `waitForStableSnapshot` are not exported, the parser yields nothing for the new forms, the coercion throws, the `requireGround` flag is ignored), and Task 5 fails before the work (the doc names neither `GROUND_UNSTABLE` nor `MSYS_NO_PATHCONV=1`). The Level 2 invariants pass on the unmodified tree by design, as regression guards.

*Generated: 2026-10-10*
*Approved: 2026-10-10*
*Implemented: 2026-10-10*
*Status: IMPLEMENTED*
