# Feature: Grounding after an interaction (Phase 5 of qa-runner-grounding-vocabulary-v2)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the `ground` mode command line and the grounding snapshot files of `qa-run.mjs`, the `relay-qa-run.md` planning doc, the `qa-run-contract` validation check, `redaction-policy.md`); secret and personal-data handling in run evidence (a typed value and the page state after an interaction are written to a snapshot); a new browser-interaction site under the local-only guard (the replayed prefix); extension of the closed flag set of a standalone command
- Decisions found:
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log "Grounding prefix scope": only grounded `goto`, `click` and `fill` steps from the case's own steps, through the guard, because the replay executes real interactions at plan time on the local target and is kept to the smallest set that serves T-2, S-4 and case 20
  - Same PRD, Architecture Notes "The grounding prefix is restricted" (grounded with exactly one match, taken from the case's own steps, run against the local target with the role's session through the guard) and "New request sites reuse the loaded guard" (no second `// GUARD-SITE`, because `qa-run-contract` requires exactly one)
  - Same PRD, Technical Risks: "The replayed grounding prefix has a side effect on the local target, or runs on state that differs from the case's seeded state": mitigated by the local-only guard, the three actions, one match per step, and the effect being limited to the operator's local environment
  - Same PRD, Decisions Log "Stable grounding contract" (two successive equal snapshots within a bound, `GROUND_UNSTABLE`, nothing written) and "Run-evidence privacy" (a per-run `.gitignore` proven with `git check-ignore`, `FAILED_IGNORE_UNPROVEN`): both bind the post-interaction snapshot exactly as the plain one
  - Same PRD, Decisions Log "Validation checks" (extend `qa-run-contract`, the count stays 28) and "Frozen surfaces" (the review-loop files, `capture.mjs` and `/relay-qa-report` byte-identical, AC-14)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the local-only guard is permanent, the outcome vocabulary is a closed set, secrets never reach reports, the human gate stays open
  - [2026-04-19] "Secret redaction policy for Test Runner reports" and [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`"
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen
  - [2026-07-09] every `## Validation Commands` entry and per-task `VALIDATE` must carry real exit-code semantics; [2026-07-10] R-X strict: the Implementer authors zero test files and test edits go through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a snapshot taken after an interaction, a typed `fill` value and the page text the application renders in response are leak surfaces; every new stdout line, stderr line and file field carries fixed words, counts, step positions and digests only, never a value or a locator name
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing assertion is made stale by this design (see `## Notes`); if the test pair finds one this analysis missed it is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - Command versus script separation: the planning doc proposes the prefix; the script validates, guards, replays, redacts and writes
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/` and is written only through `writeRunFile`
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`): the replay runs after the one existing guard call and adds no site
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, here with the tree object recorded after Phase 4
  - `qa-run-contract` invariants stay true: the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`, one `export const REASON_CATALOGUE`, no static sibling import
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` — Implementation Phases row 5: "Grounding after an interaction" — Goal: elements that exist only after a click or a fill become groundable — Success signal: against a fixture with a collapsible group, the snapshot taken after one replayed click lists the expanded rows; a failing prefix step writes nothing.

## Summary

`ground` gains one optional flag, `--prefix <json>`: a JSON array of at most 5 flat `goto`, `click` and `fill` steps, each named by role and name or by text, none carrying a `{{name}}` binding. After it loads the route exactly as today (guard first, the run directory's ignore proven, the role's session, the same host-abort route), `ground` replays the steps in order, each one only when its locator matches exactly one element at that moment, then waits for two equal successive snapshots as before and writes a snapshot. A step that matches zero or several elements, cannot be performed, or leaves the guard-approved origin halts `GROUND_PREFIX_FAILED`: exit non-zero, no snapshot, no `GROUNDED:` line. The post-interaction snapshot is a different file (`<role>--<route>--after-<8 hex of a digest of the prefix>.snapshot.json`) and a different schema (`schema_version: 2` with a `prefix` field that holds locators and a SHA-256 digest of each typed value, never the value), so it can neither overwrite nor be mistaken for the plain snapshot of the same route and role. `precheckGroundedSteps` grounds a locator step against a post-interaction snapshot only when the case's own `goto`, `click` and `fill` steps before that step are exactly the snapshot's prefix; every other step keeps today's plain-snapshot behavior, so the existing corpus is the regression proof. The doc teaches the mode, states the side-effect risk plainly and carries the three PRD carry-over fixes (DQ18 to DQ20); `qa-run-contract` is extended behind a new opt-in flag (no 29th check). No test file is touched by the Implementer.

## User Story

As the operator of relay's human validation gate
I want `ground` to open a collapsed group or fill a filter before it reads the page, using only steps the case itself performs
So that the rows and results that exist only after an interaction can be planned and run to a verdict instead of coming back as `UNGROUNDABLE_AFTER_INTERACTION`

## Problem Statement

`ground` takes exactly one snapshot of a freshly loaded route. An element that exists only after a click or a fill (the rows of the collapsed "Não concluídas" group of `praesto-sum` case 20, the results of S-4 and T-2) is never in that snapshot, so `precheckGroundedSteps` refuses any step that names it with `STEP_UNGROUNDED` and the planner can only decline the case with `UNGROUNDABLE_AFTER_INTERACTION`. Three of the seven needs-a-new-driver cases of the frozen classification stay `needs-human` for exactly this reason, although every earlier step they need exists.

## Solution Statement

Runner side, planning-doc side, one policy bullet and the contract check only. A pure parser (`parseGroundPrefix`) enforces the closed shape before any I/O; a replay helper (`replayGroundingPrefix`, injectable page) mirrors the run driver's strict exactly-one-match rule; `runGround` calls it between the page load and the existing stable-snapshot wait and writes the result through the one write helper under a name and schema that cannot collide with the plain snapshot; the consumer picks a snapshot by key equality of the case's own interaction history. `relay-qa-run.md` documents the mode and carries the DQ18, DQ19 and DQ20 fixes; `redaction-policy.md` gains one bullet; `qa-run-contract` gains `requirePrefix`.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/resources/redaction-policy.md`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | `Depends` is `2, 4` (both `complete`); shares `lane:qa-run` with phases 1 to 6, so it runs serially after phases 1 to 4 (all `complete`); Phase 6 (`Depends` 4) and Phase 7 (`Depends` 3, 5, 6) follow |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` lines 110-111, 115 and 117-118 (AC-10, AC-11, AC-15, AC-17, AC-18), 201 and 204 (Architecture Notes), 217 (Technical Risks), 231 (row 5), 260-263 (Phase Details), 294, 297, 299 and 302 (Decisions Log) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` | 110-111, 115, 117-118, 201, 204, 217, 231, 260-263, 294, 297, 299, 302 | AC-10 and AC-18 (the carry-over doc fixes), AC-11 (the prefix), AC-15 (new sites stay local), AC-17 (suite green, count 28), the two Architecture Notes, the replay risk, row 5, the Phase Details and the four Decisions Log rows (stable grounding contract, grounding prefix scope, validation checks, frozen surfaces) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 115-133 | the exported ground constants and the one `ground` usage line shared by `USAGE` and `GROUND_USAGE` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1095-1112 and 1280-1294 | `locatorOf` (the role-and-name or text form every prefix step reuses) and `stepVariables` (the `{{name}}` walker the prefix parser reuses) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1617-1653 | `precheckGroundedSteps`: the plain-snapshot lookup, the exactly-one rule and the report-sourced literal rules the consumer change extends |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2307-2340 | `runLocatorStep`'s resolver, attach wait, count rule and act: the replay mirrors them |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3234-3247 | `loadGroundingSnapshots`: the file filter and the schema gate that must accept the new kind |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3647-3680 | `GROUND_USAGE` and `parseGroundArgs` (the closed flag set) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3682-3790 | `runGround` end to end: the guard-first order, the ignore proof, the session, the host-abort route, the stable wait, the partition and the single write |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 179-209, 262-306, 308-333 and 582-592 | the ground section, the three assertion paragraphs being fixed, the grounding rules and personal-data paragraph and the honesty bullets |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 242-246, 283-305, 464-471, 480-504 and 606-621 | the opt-in flag signature, the ground script rules, the ground doc rules, the vocabulary doc rules and the real-tree entry point |
| P0 | `plugins/relay/resources/redaction-policy.md` | 218-243 | the snapshots, screenshots and personal-data subsection that gains one bullet |
| P1 | `scripts/validate/checks/qa-run-privacy-pins.test.mjs` | 233-263 | read-only: the ground slice must contain `loadPlaywright(root, PLUGIN_ROOT);` exactly once and the proof must precede it |
| P1 | `scripts/validate/checks/qa-run-stable-grounding.test.mjs` | 344-428 and 456-519 | read-only: the usage-line, Git Bash note, ground-section regexes and the four-finding pin of `requireGround` |
| P1 | `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | 548-602 and 724-738 | read-only: the bad-argument variants, the exact five-key plain snapshot, the `GROUNDED:` line and the first role-and-name and text examples |
| P1 | `scripts/validate/checks/qa-run-vocabulary-pins.test.mjs` | 331-366 | read-only: the paragraph-start and honesty-bullet pins the doc edit must keep unique |
| P1 | `scripts/validate/checks/qa-run-absence-state.test.mjs` | 588-650 | read-only: click-then-assert plans grounded on the plain snapshot, which must keep passing |
| P1 | `scripts/validate/checks/qa-run-classification.test.mjs` | 506-584 | read-only: the catalogue and frozen-class tables, the forbidden omit phrases and the every-`json`-fence rule of the doc |
| P1 | `scripts/validate/checks/plugin-root-resolvable.mjs` | 78-119 | read-only: R1 (resource basenames) and R2 (`--prefix plugins/relay/`), because the new flag is literally named `--prefix` |
| P1 | `PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-4-request-without-a-session-input-value-absence-and-state.plan.md` | 1036-1126 | read-only: the Level 1 to 3 shape, the diff-base idiom and the corpus gating this phase mirrors |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:124-133
/** The one `ground` usage line, shared by USAGE and GROUND_USAGE so the two cannot drift. */
const GROUND_USAGE_LINE = '  qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>]';

export const USAGE = `Usage:
  qa-run.mjs parse --report <path>
  qa-run.mjs init  --root <dir> --feature <slug> [--env-handle <path>]
  qa-run.mjs run   --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]
${GROUND_USAGE_LINE}
  qa-run.mjs --help
`;
```
Copied by Task 1 (the flag is appended to the one line, so `USAGE` and `GROUND_USAGE` cannot drift; the six existing flag substrings stay, because the tests and the contract match them with `includes`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1095-1112
export function locatorOf(step) {
  if (!isObj(step)) return null;
  const hasRole = step.role !== undefined;
  const hasName = step.name !== undefined;
  const hasText = step.text !== undefined;
  if (!hasRole && !hasName && !hasText) return null;
  if (step.selector !== undefined || (hasText && (hasRole || hasName))) {
    return { ok: false, why: 'a step names one locator form: selector, role and name, or text' };
  }
  if (hasText) {
    if (!isStr(step.text) || step.text.trim() === '') return { ok: false, why: 'text must be a non-empty string' };
    return { ok: true, form: 'text', text: step.text };
  }
  if (hasRole !== hasName) return { ok: false, why: 'role and name go together' };
  if (!isStr(step.role) || !LOCATOR_ROLES.includes(step.role)) return { ok: false, why: 'role must be one of the supported roles' };
  if (!isStr(step.name) || step.name.trim() === '') return { ok: false, why: 'name must be a non-empty string' };
  return { ok: true, form: 'role', role: step.role, name: step.name };
}
```
Copied by Task 1 (the prefix parser and the history key call `locatorOf` and accept only an `ok: true` result, so the closed role list and the non-blank rules are the run driver's own; a `selector` makes it return `ok: false`, which is how the selector form is refused).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3656-3680
function parseGroundArgs(argv) {
  let root = process.cwd();
  /** @type {string | null} */ let feature = null;
  /** @type {string | null} */ let runDir = null;
  /** @type {string | null} */ let route = null;
  /** @type {string | null} */ let role = null;
  /** @type {string | null} */ let envHandle = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!['--root', '--feature', '--run-dir', '--route', '--role', '--env-handle'].includes(a)) return null;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) return null;
    i++;
    if (a === '--root') root = resolve(v);
    else if (a === '--feature') feature = v;
    else if (a === '--run-dir') runDir = v;
    else if (a === '--route') route = v;
    else if (a === '--role') role = v;
    else envHandle = v;
  }
  if (feature === null || !FEATURE_PATTERN.test(feature)) return null;
  if (runDir === null || route === null || !/^\/(?!\/)/.test(route)) return null;
  if (role !== null && !ROLE_PATTERN.test(role)) return null;
  return { root, feature, runDir, route, role, envHandle };
}
```
Copied by Task 1 (the flag set stays closed: `--prefix` is one more entry, every flag still needs a value that does not start with `--`, and the raw text is returned unvalidated so the pure `parseGroundPrefix` owns the refusal and its message).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3705-3711
  const target = await guardTarget(resolveTarget(root, envHandle), root);
  if (target === null) throw new Halt('TARGET_UNDECLARED', 'no target is declared: set baseUrl in PRPs/auth/login.config.json or pass --env-handle <path>');
  const url = resolveStepUrl(route, target);
  if (url === null) throw new Halt('FAILED_NON_LOCAL_TARGET', 'the route leaves the guard-approved origin; nothing was requested');
  requireRunIgnore(runDirAbs);
  const playwright = loadPlaywright(root, PLUGIN_ROOT);
  if (playwright === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', 'playwright could not be resolved from the target or the plugin');
```
Copied by Task 2 (the one guard call stays first; the check that each prefix `goto` stays on the approved origin sits directly after the route check and before the ignore proof, so a refused prefix path costs no file and no request; this literal `loadPlaywright(root, PLUGIN_ROOT);` line stays the only one in the slice).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3726-3747
  /** @type {string | null} */ let storagePath = null;
  if (role !== null) {
    const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
    if (!Object.hasOwn(roles, role)) throw new Halt('ROLE_UNDECLARED', `role ${role} is not declared in PRPs/auth/login.config.json`);
    const s = obtainSession(ctx, role);
    if (!s.ok) throw new Halt('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`);
    storagePath = s.info.path;
  }
  /** @type {any} */ let browser = null;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch {
    throw new Halt('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/');
  }
  try {
    const context = await browser.newContext(storagePath !== null ? { storageState: storagePath } : {});
    await context.route('**/*', (/** @type {any} */ r) => {
      const u = new URL(r.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return r.continue();
      if (!target.guard.isAllowedHost(u.hostname, target.allowedHosts)) return r.abort();
      return r.continue();
    });
```
Copied by Task 2 (this is the existing session, browser and host-abort context the replay runs inside, so a click that navigates to a non-local host is aborted before any request leaves; the withheld-locator refusal goes after the session block and before the browser launch, so the session registers its secrets in the table first and a refused prefix launches no browser).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2321-2340
  // The wait only gives the page time to render; the decision is the count.
  await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await target.count().catch(() => 0);
  if (count > 1) {
    return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${count} elements at run time; a locator must match exactly one, so nothing was acted on`);
  }
  const expects = POSITIVE_ASSERTION_ACTIONS.includes(step.action);
  if (count === 0) {
    if (expects) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not found`, evidence: [] };
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
  }
  if (step.action === 'click' || step.action === 'fill') {
    try {
      if (step.action === 'click') await target.click();
      else await target.fill(step.value);
    } catch {
      return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
    }
    return null;
  }
```
Copied by Task 2 (`replayGroundingPrefix` uses the same resolver, the same 10-second attach wait and the same fixed sentences; the difference is that the decision is `count !== 1` for a prefix step, because zero is also a halt there, and that the result is a plain `{ ok, reason }` object, not a `CaseResult`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3748-3786
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      if (resp !== null && resp.status() >= 500) throw new Error('server error');
    } catch {
      throw new Halt('TARGET_UNREACHABLE', 'the route could not be loaded');
    }
    const settled = await waitForStableSnapshot(() => page.locator('body').ariaSnapshot());
    if (settled.status === 'unavailable') throw new Halt('GROUND_SNAPSHOT_UNAVAILABLE', 'the installed Playwright cannot produce an accessibility snapshot');
    if (settled.status === 'unstable') {
      throw new Halt('GROUND_UNSTABLE', `no two successive accessibility snapshots were equal within ${GROUND_STABLE_BOUND_MS} ms (${settled.reads} reads); nothing was written`);
    }
    const yaml = settled.yaml;
    /** @type {any[]} */ const entries = [];
    for (const c of parseAriaSnapshot(yaml)) {
      try {
        if (c.kind === 'role') {
          const matches = await page.getByRole(c.role, { name: c.name, exact: true }).count();
          entries.push({ kind: 'role', role: c.role, name: c.name, matches });
        } else {
          const matches = await page.getByText(c.text, { exact: true }).count();
          entries.push({ kind: 'text', text: c.text, matches });
        }
      } catch {
        // a candidate whose count fails is dropped
      }
    }
    const { kept, withheld } = partitionSnapshotEntries(entries, table);
    const key = routeKey(route) ?? '/';
    const slug = key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'root';
    const dest = join(runDirAbs, 'grounding', `${role ?? 'anonymous'}--${slug}.snapshot.json`);
    try {
      writeRunFile({ runDirAbs, table }, dest, { kind: 'json', value: { schema_version: 1, role: role ?? 'anonymous', route: key, entries: kept, withheld } });
    } catch {
      throw new Halt('EVIDENCE_WRITE_FAILED', 'the snapshot could not be written');
    }
    process.stdout.write(`GROUNDED: ${fwd(relative(runDirAbs, dest))} entries=${kept.length} withheld=${withheld}\n`);
    return 0;
```
Copied by Task 2 (the replay is inserted between the load `try`/`catch` and the stable wait; everything from the wait to the `GROUNDED:` line is reused unchanged for a post-interaction snapshot, so it gets the same stability, partition, structural redaction and single write; only the file name and the written value differ when a prefix ran, and the plain branch is byte-for-byte the code above).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3234-3247
function loadGroundingSnapshots(runDirAbs) {
  /** @type {string[]} */ let names = [];
  try {
    names = readdirSync(join(runDirAbs, 'grounding'));
  } catch {
    return [];
  }
  /** @type {any[]} */ const docs = [];
  for (const name of names.filter((n) => n.endsWith('.snapshot.json')).sort()) {
    const d = readJsonOrNull(join(runDirAbs, 'grounding', name));
    if (isObj(d) && d.schema_version === 1 && isStr(d.role) && isStr(d.route) && Array.isArray(d.entries)) docs.push(d);
  }
  return docs;
}
```
Copied by Task 3 (the `.snapshot.json` filter and the sort stay; the schema gate widens from `schema_version === 1` to "a version-1 document, or a post-interaction document with a `prefix` array"; the file name is never used for matching).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1617-1653
export function precheckGroundedSteps(steps, snapshots, manualText, role) {
  const wantRole = role === null ? 'anonymous' : role;
  const collapse = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  /** @type {string | null} */ let route = null;
  for (const [i, step] of steps.entries()) {
    const n = i + 1;
    if (!isObj(step)) continue;
    if (step.action === 'goto' || step.action === 'expect_url') route = routeKey(step.path);
    if (!LOCATOR_ACTIONS.includes(step.action)) continue;
    const loc = locatorOf(step);
    if (loc === null || !loc.ok) continue;
    const snap = route === null ? undefined : snapshots.find((s) => isObj(s) && s.role === wantRole && s.route === route);
    if (snap === undefined) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step` };
    }
    const entry = (Array.isArray(snap.entries) ? snap.entries : []).find((/** @type {any} */ e) =>
      isObj(e) && (loc.form === 'role' ? e.kind === 'role' && e.role === loc.role && e.name === loc.name : e.kind === 'text' && e.text === loc.text));
    if (entry === undefined) return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator is not a snapshot entry` };
    if (entry.matches !== 1) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator matched ${entry.matches} elements in the snapshot; a locator must match exactly one` };
    }
    if (step.action === 'expect_text') {
      const ok = isStr(manualText) && isStr(step.contains) && collapse(manualText).includes(collapse(step.contains));
      if (!ok) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${n}: expect_text contains must come from the report's own steps, not from the snapshot` };
    }
    if (step.action === 'expect_value') {
      // A literal expectation comes from the report's own steps; a {{name}} binding is validated against the declared captures.
      for (const key of ['equals', 'contains']) {
        const literal = step[key];
        if (!isStr(literal) || [...literal.matchAll(VARIABLE_PATTERN)].length > 0) continue;
        const ok = isStr(manualText) && collapse(manualText).includes(collapse(literal));
        if (!ok) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${n}: expect_value ${key} must come from the report's own steps or be bound by a declared capture` };
      }
    }
  }
  return null;
}
```
Copied by Task 3 (the signature, the route tracking, the entry search, the exactly-one rule and the two literal rules stay byte-identical; the single `snapshots.find(...)` becomes "the post-interaction snapshot whose prefix key equals the case's interaction history, else the first plain snapshot of the role and route", and the report-sourced rule for a replayed `fill` value is a sibling of the `expect_text` rule).

````
# SOURCE: plugins/relay/commands/relay-qa-run.md:179-191
Grounding browser steps. For a case whose browser steps name no selector (or whose labels
you cannot trust), run, once per role and route and BEFORE writing the plan entry:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" ground --root "<target_root>" --feature "<feature>" --run-dir "<RUN_DIR>" --route "<route>"
```

Append ` --role "<role>"` when the plan entry names a role and ` --env-handle "<path>"` when
the argument was given. The route starts with a single `/`. Under Windows Git Bash, MSYS
rewrites a leading-slash argument such as `--route "/perfil"` into a Windows path before the
script sees it, and the script then exits 2 with its usage text; run the same `node` line with
`MSYS_NO_PATHCONV=1` set as a prefix, whereas PowerShell and POSIX shells do not rewrite the
argument.
````
Copied by Task 4 (this first `ground` command line and the first backticked `MSYS_NO_PATHCONV=1` stay the earliest occurrences in the doc; the "Append" sentence gains one clause; the new bash example is a later sibling).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:284-291
`expect_not_visible` takes `role` and `name`, or `text`. It passes only when the grounded
locator is hidden or absent, re-checked for up to 5 seconds. It is valid only after a
positive step on the same route in the same case: an `expect_visible`, `expect_text`,
`expect_value` or `expect_state` step since the last `goto`. Otherwise the entry is
`PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, because an
absence step alone would pass on a page that never rendered. The element must be one the
snapshot already lists (an element that only appears after an interaction is still
`UNGROUNDABLE_AFTER_INTERACTION`).
```
Copied by Task 4 (the opening words, the `for up to 5 seconds` line and the two pinned phrases stay; the parenthetical becomes the prefix rule and the DQ18 sentence is added).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:300-306
`expect_state` takes `role` and `name`, a `state` of `expanded`, `disabled` or `checked`
and a boolean `equals` that is always written. It passes only when the element's state
equals `equals`, re-read for up to 5 seconds. `expanded` reads `aria-expanded`,
`disabled` follows Playwright's definition of a disabled element and `checked` reads the
checked state of a checkbox or radio. An element that exposes no such state (a button with
no `aria-expanded`, a `details` disclosure, a non-checkbox, a checkbox whose state is
mixed) blocks the case `STEP_NOT_PERFORMABLE` and never passes as collapsed or unchecked.
```
Copied by Task 4 (the last two lines are the DQ19 narrowing; the opening words and `never passes as collapsed or unchecked` stay).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:269-275
`expect_value` takes `role` and `name` and exactly one of `equals` (a string), `contains`
(a non-empty string) or `not_empty` (always `true`). `{{name}}` bindings are allowed in
`equals` and `contains`, and a literal `equals` or `contains` must come from the report's
own steps. The comparison is exact, and `not_empty` ignores surrounding whitespace. The
evidence records which comparison ran and whether it passed, never the value, and the final
screenshot masks the field. An element that holds no value (it is not an input, a textarea
or a select) blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted.
```
Copied by Task 4 (the DQ20 sentence is inserted after the comparison sentence; every pinned phrase of this paragraph stays).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:308-333
Grounding rules. Write a locator step only for an entry of the snapshot of the step's own
route and role whose `matches` is exactly `1`, copying its `role` and `name` or its `text`
verbatim; the route of a step is the last `goto` or `expect_url` path before it. A step whose
element is not in the snapshot, matches 0 or matches more than one element is not planned:
decline the case with `STEP_UNGROUNDED` before anything is seeded, authenticated or
requested. The declining entry names no step and carries no free text: the runner writes
the fixed catalogue sentence for the code and reproduces the manual steps verbatim, so
which step could not be grounded belongs in your own working notes or in the run summary
you relay to the operator, never in the plan entry. At run time a locator that matches more than
one element is never acted on and also ends the case `needs-human` `STEP_UNGROUNDED`.
Elements that only appear after an interaction are not in the snapshot and cannot be
grounded, so a case that needs one is declined with `UNGROUNDABLE_AFTER_INTERACTION`.
A text entry may come from a paragraph, list-item or cell line of the snapshot; it is matched
exactly against visible text like any other `text` locator and must still match exactly one
element.
The expectations always come from the report's own steps: an `expect_text`
`contains` must appear in the case's manual steps (otherwise `PLAN_ENTRY_INVALID`), and the
snapshot only supplies how to find an element, never what to expect.

Personal data. The snapshot never stores raw page text; an entry whose text carries a secret
known to the redaction table, an e-mail address or a match of a `regex:` line of
`PRPs/redaction-extensions.txt` is withheld (counted in `withheld`) and cannot be used as a
locator, so an operator whose pages show account names adds a `regex:` line for them to that
file before grounding. The snapshot file is written under `<RUN_DIR>/grounding/`, which the
run directory's `.gitignore` ignores, so free-text personal data the withholding rules cannot
recognize (a task title, a person's name) stays out of git even when it is not withheld.
```
Copied by Task 4 (the two sentences that name `UNGROUNDABLE_AFTER_INTERACTION` and the elements that only appear after an interaction are the only ones changed; the new "Grounding after an interaction." block is placed after the "Personal data." paragraph, outside both ranges the tests slice).

```
# SOURCE: plugins/relay/resources/redaction-policy.md:240-243
- **Input values.** An input value asserted by the runner is never written,
  only the result of the comparison: the evidence names which comparison ran
  and whether it passed, and the final screenshot masks the located field, so
  the value reaches no evidence file, no result, no reason and no terminal line.
```
Copied by Task 5 (the new bullet sits directly after this one, at column zero, so this bullet's continuation lines still end where the tests expect; the section and subsection headings that `auth-secrecy` pins are not touched).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:242-246
/**
 * @param {{ scriptText?: string | null, commandText?: string | null, seedScriptText?: string | null, seedCommandText?: string | null, queryModuleText?: string | null, results?: { file: string, value: any }[], requireStepExamples?: boolean, requireCatalogue?: boolean, requireGround?: boolean, requirePrivacy?: boolean, requireVocabulary?: boolean }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkQaRunContract({ scriptText, commandText, seedScriptText, seedCommandText, queryModuleText, results, requireStepExamples = false, requireCatalogue = false, requireGround = false, requirePrivacy = false, requireVocabulary = false }) {
```
Copied by Task 6 (`requirePrefix` is added beside `requireVocabulary` in the same destructured signature and JSDoc type, default `false`, exactly like the four earlier flags).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:283-305
    if (requireGround) {
      // The ground mode is listed in the header usage block and in the exported usage text.
      const importAt = scriptText.indexOf('\nimport ');
      const header = importAt === -1 ? '' : scriptText.slice(0, importAt);
      if (!header.includes('qa-run.mjs ground --root')) add('the runner script header must list the ground mode usage line (qa-run.mjs ground --root)', SCRIPT_FILE);
      const groundUsage = USAGE.split('\n').find((l) => l.includes('qa-run.mjs ground')) ?? '';
      if (groundUsage === '') {
        add('the runner usage text must list the ground mode (qa-run.mjs ground)', SCRIPT_FILE);
      } else {
        for (const flag of ['--root', '--feature', '--run-dir', '--route', '--role', '--env-handle']) {
          if (!groundUsage.includes(flag)) add(`the runner usage text must list the ground flag ${flag}`, SCRIPT_FILE);
        }
      }
      if (!scriptText.includes('GROUND_UNSTABLE')) add('the runner script must contain the named halt GROUND_UNSTABLE', SCRIPT_FILE);
      // The stable-snapshot wait replaces a swallowed readiness wait; the anonymous check elsewhere keeps its own.
      const groundStart = scriptText.indexOf('async function runGround(');
      const groundEnd = scriptText.indexOf('async function runGroundGuarded(');
      if (groundStart === -1 || groundEnd === -1 || groundEnd < groundStart) {
        add('the runner script must define the ground mode between async function runGround( and async function runGroundGuarded(', SCRIPT_FILE);
      } else if (scriptText.slice(groundStart, groundEnd).includes('waitForLoadState(')) {
        add('the ground mode must not call waitForLoadState(: a swallowed readiness wait is replaced by the stable-snapshot wait', SCRIPT_FILE);
      }
    }
```
Copied by Task 6 (this block is not edited, because a test pins exactly four findings from it on a bare doc; the new `requirePrefix` rules are a sibling block that reuses `sectionBetween` and the same `async function runGround(` markers, and carries its own message prefix).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:464-471
    if (requireGround) {
      // The halt, the Git Bash note and the wait's numbers follow the exported constants.
      const interval = `${GROUND_POLL_INTERVAL_MS / 1000} second apart`;
      const bound = `${GROUND_STABLE_BOUND_MS / 1000} seconds`;
      for (const token of ['GROUND_UNSTABLE', 'MSYS_NO_PATHCONV=1', interval, bound]) {
        if (!commandText.includes(token)) add(`the runner command must document the ground wait: it must contain ${token}`, COMMAND_FILE);
      }
    }
```
Copied by Task 6 (the doc tokens and the cap in the doc follow the exported `GROUND_PREFIX_MAX_STEPS` exactly as the wait's numbers follow theirs; `commandText.includes` works on the raw text, so every pinned token must sit on one physical line of the hard-wrapped doc).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the prefix constants and pure helpers, the `--prefix` flag and usage, the replay, the `runGround` wiring and the post-interaction snapshot name and schema, the loader gate and the history-keyed lookup in the plan-time check |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the "Grounding after an interaction." block (mode, restrictions, halts, file, consumption rule, risk, decline rule), one honesty bullet, two sentences made consistent, and the DQ18, DQ19 and DQ20 carry-over fixes |
| `plugins/relay/resources/redaction-policy.md` | UPDATE | one bullet stating how a post-interaction snapshot is withheld and that a typed value is recorded only as a digest |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | an opt-in `requirePrefix` rule set pinning the replay wiring and order, the consumer wiring, the parser and lookup behavior, the usage flag and the doc tokens; no new check is registered (the count stays 28) |

## NOT Building (Scope Limits)

- `expect_requests`, the bounded re-mint and the `--refresh` role-set statement (Phase 6), the release cut and every `documentation/` page (Phase 7), and the dogfood and its scans (Phase 8).
- A seed, a login proof or any `{{name}}` capture inside `ground`: it runs no seed (`seedConfig` is `null` in its context), a capture is unbound at plan time and is refused, and the operator grounds on the state the local application holds.
- A prefix supplied from a file, from a plan entry or from the report (`--prefix-file`, `--plan-case`): the inline JSON argument is the one surface (see `## Notes`).
- Any prefix action beyond `goto`, `click` and `fill`: no `expect_*`, no `query`, no `request`, no `selector` form, no key beyond the closed set, no more than 5 steps, no `fill` value over 200 characters.
- Any change to the run driver (`DRIVERS.browser`, `runLocatorStep`, `expect_*`), `waitForStableSnapshot`, `parseAriaSnapshot`, `partitionSnapshotEntries`, `writeRunFile`, the redaction table, the ignore rules and their proof, `RUN_IGNORE_RULES`, or the plain snapshot's file name and five-key schema.
- A new reason code, a new outcome, a change to `OUTCOMES`, `REASON_CATALOGUE` or `RUNNER_OWNED_REASON_CODES`; the new halts (`GROUND_PREFIX_INVALID`, `GROUND_PREFIX_FAILED`) are `ground` halts like `GROUND_UNSTABLE`, never plan-facing codes.
- A second guard site, a new `checkTarget` call, a second write site, a static sibling import, or an entry in `auth-local-guard-sites` (the replay is covered by the existing guard call, the host-abort route and `resolveStepUrl`).
- A change to the frozen classification table, the reason-code catalogue table or any `json` block of the command doc; any edit under `documentation/`, `docs/decisions.md` or `docs/anti-patterns.md`, and any hand edit of `docs/` (the `docs_sync` pass owns `docs/` at implement time).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-14), and any change to a report.
- Any test file. R-X strict: the Implementer authors zero test files; new tests and any edit of an existing test are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the closed prefix vocabulary, its pure helpers and the command-line surface

- **ACTION**: Delivers AC-A3 (the prefix is a closed shape refused before any I/O: only `goto`, `click` and `fill`, at most 5 steps, locators by role and name or text, no `{{name}}`, no `selector`, exit 2 with a fixed message and nothing written) and the helpers AC-A5 needs (the key and the file name that keep the two snapshot kinds apart). Pure code, no I/O, in `plugins/relay/scripts/qa-run.mjs`:
  1. Constants, directly after `GROUND_STABLE_BOUND_MS` (they must precede `GROUND_USAGE`, which interpolates the cap), each with a doc comment: `export const GROUND_PREFIX_MAX_STEPS = 5;` (the most steps a prefix may replay; it bounds both the side effect a replay can have on the local target and the command line; chosen, not measured: case 20 needs one step and the other cases of the frozen table at most a fill and a click), `export const GROUND_PREFIX_VALUE_MAX = 200;` (the longest typed value) and `export const GROUND_PREFIX_ACTIONS = Object.freeze(['goto', 'click', 'fill']);`.
  2. Usage. Append ` [--prefix <json>]` to the end of the single string `GROUND_USAGE_LINE` (so `USAGE` and `GROUND_USAGE` follow it). Add the flag to the header comment line that repeats the `ground` usage and one sentence to the `ground` bullet of the header comment (the prefix is replayed after the route loads; a failing step is the halt `GROUND_PREFIX_FAILED`). `GROUND_USAGE` gains a third line after the Git Bash line: two leading spaces, then `--prefix takes a JSON array of at most ${GROUND_PREFIX_MAX_STEPS} goto, click and fill steps, each flat and named by role and name or by text, replayed with the role's session after the route loads and before the snapshot is taken; quote it in single quotes.`
  3. `parseGroundArgs`: add `'--prefix'` to the closed list, declare `/** @type {string | null} */ let prefix = null;`, set it in the branch chain, return it as a `prefix` key, and widen the JSDoc return type. Nothing else about the function changes: the raw text is returned unvalidated.
  4. Directly before `const GROUND_USAGE =` (outside the text between `async function runGround(` and `async function runGroundGuarded(`), add the exported pure helpers, each with a doc comment:
     - `parseGroundPrefix(text)` returns `{ ok: true, steps }` or `{ ok: false, why }`. It is total: it refuses a non-string or blank text, text that is not JSON, anything but a non-empty array, an array longer than `GROUND_PREFIX_MAX_STEPS`, and, per step (position `n`, reasons prefixed `step ${n}: `), a non-object, an `action` outside `GROUND_PREFIX_ACTIONS`, a key outside the closed set (`goto`: `action`, `path`; `click`: `action` and the locator keys `role`, `name`, `text`; `fill`: those plus `value`), a `goto` whose `path` is not a string starting with a single `/` or is longer than 500 characters, a `click` or `fill` for which `locatorOf(step)` is `null` or not `ok` (this also refuses `selector`), a `fill` whose `value` is not a string or exceeds `GROUND_PREFIX_VALUE_MAX`, and any string leaf for which `stepVariables(step)` returns a name (`{{name}}` is unbound at plan time because `ground` runs before any seed). It also refuses a prefix with no `click` and no `fill` (a `goto` alone is the plain route). No `why` carries a locator, a value, a key name or a binding name: fixed sentences, step positions and the numeric caps only. Use `isObj`, `isStr` and `Array.isArray`, and never place a planner-supplied non-string inside a template literal.
     - `groundingStepKey(step)` returns the normalized form of one step or `null` when it is not a keyable prefix step: `{ action: 'goto', path }`, `{ action: 'click', role, name }` or `{ action: 'click', text }`, and for `fill` the same locator keys plus `value_sha256` (the lowercase hex SHA-256 of the value through the already imported `createHash`) and NO `value` key. Build each object with the key order `action`, the locator keys, then `value_sha256`. A `selector` step, any other action, a non-object or a `fill` with a non-string value is `null`.
     - `groundingPrefixKey(list)` returns one canonical string for a list of normalized steps (`JSON.stringify` of an array of fixed-order tuples built from `action`, `path`, `role`, `name`, `text` and `value_sha256`, absent keys as `null`), and `null` when `list` is not an array or any element is `null` or not an object.
     - `interactionHistory(steps, upTo)` returns, for the steps at zero-based index below `upTo`, one `{ at, step, norm }` per step whose `action` is `goto`, `click` or `fill` (`at` is the one-based position, `norm` is `groundingStepKey(step)`, possibly `null`); it returns `[]` when `steps` is not an array.
     - `isPostInteractionSnapshot(doc)` is true only for an object with `schema_version === 2` and an array `prefix`.
     - `groundSnapshotFileName(role, slug, key)` returns `${role}--${slug}.snapshot.json` when `key` is `null` (byte-identical to today's name), else `${role}--${slug}--after-${digest}.snapshot.json` where `digest` is the first 8 lowercase hex characters of the SHA-256 of `key`.
     - `finalPageRoute(url, origin)` returns the URL pathname when `url` parses and its origin equals `origin`, else `null` (a non-string, an unparsable string, another origin and `about:blank` are `null`).
  Do NOT add any `import`, the text `writeFileSync(` or `renameSync(` (comments included), `// GUARD-SITE` or `// WRITE-SITE`, or a quoted `outcome:` literal. Do not edit `parseAriaSnapshot`, `waitForStableSnapshot`, `locatorOf`, `routeKey` or any driver in this task.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:124-133` (the one usage line), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1095-1112` (the locator form the parser and the key reuse) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3656-3680` (the closed flag set that gains one flag).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { spawnSync } from "node:child_process";
  import { createHash } from "node:crypto";
  import { mkdtempSync, readdirSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import {
    USAGE, GROUND_PREFIX_MAX_STEPS, GROUND_PREFIX_VALUE_MAX, GROUND_PREFIX_ACTIONS,
    parseGroundPrefix, groundingStepKey, groundingPrefixKey, interactionHistory, groundSnapshotFileName, finalPageRoute, isPostInteractionSnapshot,
  } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
  const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
  const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
  const parse = (v) => parseGroundPrefix(typeof v === "string" ? v : JSON.stringify(v));
  const click = { action: "click", role: "button", name: "Nao concluidas" };
  const fill = { action: "fill", role: "textbox", name: "Filtro", value: "abc" };

  // 1. The closed constants.
  check(GROUND_PREFIX_MAX_STEPS === 5 && GROUND_PREFIX_VALUE_MAX === 200, "the prefix caps changed");
  check(GROUND_PREFIX_ACTIONS.join(",") === "goto,click,fill" && Object.isFrozen(GROUND_PREFIX_ACTIONS), "the prefix actions: " + GROUND_PREFIX_ACTIONS.join(","));

  // 2. What a prefix accepts.
  for (const [label, v] of [
    ["one click", [click]],
    ["fill then click", [fill, { action: "click", text: "Aplicar" }]],
    ["goto then click", [{ action: "goto", path: "/other" }, click]],
    ["five steps", [click, click, click, click, click]],
    ["a 200 character value", [{ ...fill, value: "x".repeat(200) }, click]],
  ]) {
    const r = parse(v);
    check(r.ok === true && r.steps.length === v.length, label + " was refused: " + JSON.stringify(r));
  }

  // 3. What a prefix refuses: every case ends with ok false, a reason and no throw.
  const refused = [
    ["not JSON", "not json"], ["an empty string", ""], ["an object", "{}"], ["an empty array", "[]"],
    ["a selector click", [{ action: "click", selector: "#a" }]],
    ["a selector fill", [{ action: "fill", selector: "#a", value: "x" }, click]],
    ["an assertion", [click, { action: "expect_visible", role: "heading", name: "X" }]],
    ["a query", [click, { action: "query", source: "d", sql: "SELECT 1", expect_rows: 1 }]],
    ["an unsupported key", [{ ...click, extra: 1 }]],
    ["a value on a click", [{ ...click, value: "x" }]],
    ["a session key", [{ ...click, session: "none" }]],
    ["a binding in a value", [{ ...fill, value: "{{who}}" }, click]],
    ["a binding in a name", [{ action: "click", role: "button", name: "{{x}}" }]],
    ["a goto alone", [{ action: "goto", path: "/a" }]],
    ["an absolute goto", [{ action: "goto", path: "http://example.com/x" }, click]],
    ["a protocol-relative goto", [{ action: "goto", path: "//example.com/x" }, click]],
    ["six steps", [click, click, click, click, click, click]],
    ["a 201 character value", [{ ...fill, value: "x".repeat(201) }, click]],
    ["a fill with no value", [{ action: "fill", role: "textbox", name: "Filtro" }, click]],
    ["a non-string value", [{ ...fill, value: 5 }, click]],
    ["a role outside the list", [{ action: "click", role: "banana", name: "X" }]],
    ["a blank name", [{ action: "click", role: "button", name: "  " }]],
    ["a role without a name", [{ action: "click", role: "button" }]],
    ["a hostile name", "[{\"action\":\"click\",\"role\":\"button\",\"name\":{\"toString\":1}}]"],
    ["a non-object step", [5]],
  ];
  for (const [label, v] of refused) {
    let r;
    try { r = parse(v); } catch (e) { check(false, label + " threw: " + e.message); continue; }
    check(r.ok === false && typeof r.why === "string" && r.why !== "", label + " was accepted or carried no reason: " + JSON.stringify(r));
  }
  const valueCase = parse([{ ...fill, value: "secret-typed-value-9911" }, { action: "click", role: "banana", name: "X" }]);
  check(valueCase.ok === false && !valueCase.why.includes("secret-typed-value-9911"), "a reason echoed a value: " + JSON.stringify(valueCase));
  const bindCase = parse([{ ...fill, value: "{{whoami}}" }, click]);
  check(bindCase.ok === false && !bindCase.why.includes("whoami"), "a binding reason echoed the name: " + JSON.stringify(bindCase));

  // 4. The normalized step and the canonical key.
  check(same(groundingStepKey(click), { action: "click", role: "button", name: "Nao concluidas" }), "click key");
  const fk = groundingStepKey(fill);
  check(fk !== null && fk.value_sha256 === sha("abc") && !("value" in fk), "the fill key holds the digest and never the value: " + JSON.stringify(fk));
  check(same(groundingStepKey({ action: "click", text: "Aplicar" }), { action: "click", text: "Aplicar" }), "text click key");
  check(same(groundingStepKey({ action: "goto", path: "/a" }), { action: "goto", path: "/a" }), "goto key");
  for (const s of [{ action: "click", selector: "#a" }, { action: "expect_visible", role: "heading", name: "X" }, { action: "fill", role: "textbox", name: "N" }, null, 5]) {
    check(groundingStepKey(s) === null, "a step that is not a keyable prefix step got a key: " + JSON.stringify(s));
  }
  const g = { action: "goto", path: "/tasks" };
  const keyOf = (list) => groundingPrefixKey(list.map(groundingStepKey));
  const k1 = keyOf([g, click]);
  check(typeof k1 === "string" && k1 === keyOf([g, click]), "a key is deterministic");
  check(k1 !== keyOf([g, { ...click, name: "Outro" }]), "a different locator must change the key");
  check(keyOf([g, fill]) !== keyOf([g, { ...fill, value: "abd" }]), "a different typed value must change the key");
  check(keyOf([g, click, fill]) !== keyOf([g, fill, click]), "the order must change the key");
  check(groundingPrefixKey([groundingStepKey(g), null]) === null && groundingPrefixKey("nope") === null, "an unkeyable step makes the whole key null");

  // 5. The history of a case.
  const steps = [g, { action: "expect_visible", role: "heading", name: "X" }, click, fill, { action: "expect_url", path: "/x" }, { action: "click", selector: "#legacy" }];
  const h = interactionHistory(steps, 6);
  check(h.map((x) => x.at).join(",") === "1,3,4,6", "history positions: " + JSON.stringify(h.map((x) => x.at)));
  check(h[3].norm === null && h[2].norm !== null && h[2].norm.value_sha256 === sha("abc"), "history norms: " + JSON.stringify(h));
  check(interactionHistory(steps, 2).length === 1 && interactionHistory(steps, 0).length === 0 && interactionHistory("nope", 3).length === 0, "history bounds");

  // 6. The file name keeps the two kinds apart.
  const plainName = groundSnapshotFileName("admin", "tasks", null);
  const afterName = groundSnapshotFileName("admin", "tasks", k1);
  check(plainName === "admin--tasks.snapshot.json", "the plain name changed: " + plainName);
  check(/^admin--tasks--after-[0-9a-f]{8}\.snapshot\.json$/.test(afterName) && afterName !== plainName, "the after name: " + afterName);
  check(groundSnapshotFileName("admin", "tasks", k1) === afterName && groundSnapshotFileName("admin", "tasks", keyOf([g, fill])) !== afterName, "the name follows the key");
  check(isPostInteractionSnapshot({ schema_version: 2, role: "a", route: "/", entries: [], prefix: [] }) === true, "a post-interaction document was not recognized");
  check(isPostInteractionSnapshot({ schema_version: 1, role: "a", route: "/", entries: [] }) === false && isPostInteractionSnapshot({ schema_version: 2 }) === false && isPostInteractionSnapshot(null) === false, "a plain document was taken for a post-interaction one");

  // 7. The final route.
  check(finalPageRoute("http://127.0.0.1:3000/tasks/5?x=1#h", "http://127.0.0.1:3000") === "/tasks/5", "final route");
  for (const u of ["http://example.com/tasks", "about:blank", "not a url", undefined]) check(finalPageRoute(u, "http://127.0.0.1:3000") === null, "final route outside the origin: " + u);

  // 8. The usage text and the command line.
  const groundLine = USAGE.split("\n").find((l) => l.includes("qa-run.mjs ground")) || "";
  for (const flag of ["--root <dir>", "--feature <slug>", "--run-dir <rel-dir>", "--route </path>", "[--role <slug>]", "[--env-handle <path>]", "[--prefix <json>]"]) {
    check(groundLine.includes(flag), "the ground usage line lacks " + flag);
  }
  const NODE = process.execPath;
  const RUNNER = resolve("plugins/relay/scripts/qa-run.mjs");
  const tmp = mkdtempSync(join(tmpdir(), "relay-qa-v2p5-args-"));
  try {
    const run = (args) => spawnSync(NODE, [RUNNER, "ground", "--root", tmp, "--feature", "feat", "--run-dir", "PRPs/reports/feat/qa-run/r1", "--route", "/tasks", ...args], { cwd: tmp, encoding: "utf8", windowsHide: true });
    for (const [label, arg] of [["not JSON", "not json"], ["a selector", JSON.stringify([{ action: "click", selector: "#a" }])], ["six steps", JSON.stringify(Array(6).fill(click))]]) {
      const r = run(["--prefix", arg]);
      check(r.status === 2, label + " exited " + r.status + ": " + r.stderr);
      check(r.stderr.includes("GROUND_PREFIX_INVALID") && r.stderr.includes("Usage:") && r.stderr.includes("--prefix"), label + " stderr: " + r.stderr);
      check(r.stdout === "", label + " wrote to stdout");
    }
    // A well-formed prefix passes the argument stage: the missing run directory ends it, still exit 2 and still no write.
    const ok = run(["--prefix", JSON.stringify([click])]);
    check(ok.status === 2 && !ok.stderr.includes("GROUND_PREFIX_INVALID") && ok.stderr.includes("--run-dir must be an existing directory"), "a valid prefix was refused at the argument stage: " + ok.stderr);
    check(readdirSync(tmp).length === 0, "a refused ground wrote something: " + readdirSync(tmp).join(","));
    const help = spawnSync(NODE, [RUNNER, "--help"], { encoding: "utf8", windowsHide: true });
    check(help.status === 0 && help.stdout === USAGE, "--help no longer prints the usage text");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-stable-grounding.test.mjs scripts/validate/checks/qa-run-contract.test.mjs
  ```
  Before this task none of the new exports exist, so the import fails and the command exits non-zero. The first script drives the real parser, the key helpers and the real command line (an async child process is not needed: no in-process server runs here); the two existing test files run unchanged with the browser-driven tests skipped by name, and cover the usage-line, `--help`, bare-`ground` and contract pins this task must not disturb.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — replay the prefix in `ground` and write the post-interaction snapshot

- **ACTION**: Delivers AC-A1 (the replay runs with the role's session through the local-only guard and the stable snapshot is taken afterwards, so the expanded rows are among its entries), AC-A2 (a step that does not match exactly one element, or fails, halts `GROUND_PREFIX_FAILED`: non-zero exit, no snapshot, no `GROUNDED:` line), AC-A4 (a prefix path that leaves the guard-approved origin halts `FAILED_NON_LOCAL_TARGET` before any request, with no second guard site), AC-A5 (a post-interaction snapshot is a different file and schema from the plain one) and AC-A9 (a typed value is recorded only as a digest and a withheld locator is refused). First run the live probe of `## Notes` ("Live probe") against the installed Playwright and record its output in the implementation report. Then, in `plugins/relay/scripts/qa-run.mjs`:
  1. Directly after `parseGroundArgs` and before the leading comment of `runGround`, add `export async function replayGroundingPrefix(page, steps, target)` returning `{ ok: true }` or `{ ok: false, reason }`. For each step, with `n` its one-based position: a `goto` resolves its path with `resolveStepUrl(step.path, target)` (a `null` is `prefix step ${n}: the path leaves the guard-approved origin; nothing was requested`, and `page.goto` is not called) then calls `page.goto(url, { waitUntil: 'load', timeout: 15000 })`, treating a rejection or a response status of 500 or more as `prefix step ${n}: the page could not be loaded`; a `click` or `fill` resolves its locator exactly as `runLocatorStep` does (`getByRole(role, { name, exact: true })` or `getByText(text, { exact: true })`), awaits `target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {})`, reads `count()` with the same `.catch(() => 0)`, and returns `prefix step ${n}: the locator matched ${count} elements; a prefix step must match exactly one, so nothing was acted on` unless `count === 1`; it then calls `click()` or `fill(step.value)` inside a `try` whose `catch` returns `prefix step ${n}: the ${step.action} target could not be found or acted on`. It stops at the first failure and never acts on a step after it. Every reason is a fixed sentence with a position, an action word or a count: never a locator name, a value or page text.
  2. Directly after it, add `export function withheldPrefixStep(steps, table)` returning the one-based position of the first `click` or `fill` step whose locator text (the `name`, or the `text`) is withheld by `partitionSnapshotEntries` (a known secret, an e-mail address or a `regex:` match), else `0`.
  3. `runGround`, in this order: (a) right after the existing `null` check of `parseGroundArgs`, when `a.prefix !== null` call `parseGroundPrefix(a.prefix)`; on `ok: false` write `GROUND_PREFIX_INVALID: ${why}` and a newline followed by `GROUND_USAGE` to stderr and `return 2`, before any file or network access; otherwise keep the parsed steps in a `prefix` constant (`null` when no flag). (b) Directly after the existing route-guard `throw` and before the ignore proof, for every `goto` step of the prefix whose `resolveStepUrl(step.path, target)` is `null`, `throw new Halt('FAILED_NON_LOCAL_TARGET', 'a prefix path leaves the guard-approved origin; nothing was requested')`. (c) After the role and session block and before the browser launch, `const withheldAt = prefix === null ? 0 : withheldPrefixStep(prefix, table);` and, when positive, `throw new Halt('GROUND_PREFIX_FAILED', `prefix step ${withheldAt}: its locator names a value the redaction rules withhold; nothing was replayed`)`. (d) After the existing load `try`/`catch` and before the stable wait, when `prefix !== null`, `const replayed = await replayGroundingPrefix(page, prefix, target);` and `throw new Halt('GROUND_PREFIX_FAILED', replayed.reason)` when it is not `ok`. (e) After the existing partition: when `prefix === null` everything below is the existing code, unchanged (`key`, `slug`, the file name through `groundSnapshotFileName(role ?? 'anonymous', slug, null)` and the `schema_version: 1` value). When a prefix ran, `const live = finalPageRoute(page.url(), target.origin)`; a `null` is `throw new Halt('GROUND_PREFIX_FAILED', 'the page ended outside the guard-approved origin; nothing was written')`; the snapshot `route` is `live`, the slug is derived from it, the recorded prefix is `[{ action: 'goto', path: route }, ...prefix.map(groundingStepKey)]` (the raw `--route` string first, so a case that begins with the same `goto` can be matched), the file name is `groundSnapshotFileName(role ?? 'anonymous', slug, groundingPrefixKey(recorded))`, and the written value is `{ schema_version: 2, role: role ?? 'anonymous', route: live, entries: kept, withheld, prefix: recorded }` through the same `writeRunFile` call. The `GROUNDED:` line keeps its exact shape.
  4. Update the leading comment of `runGround` so it names both file patterns. Do not write, inside the text between `async function runGround(` and `async function runGroundGuarded(`, a second `loadPlaywright(root, PLUGIN_ROOT);`, the text `waitForLoadState(`, or a comment that mentions `requireRunIgnore(`, `loadPlaywright(`, `replayGroundingPrefix(` or `waitForStableSnapshot(` ahead of the real calls (the contract and a test locate those calls by their first occurrence). Do not add `writeFileSync(`, `renameSync(`, `// GUARD-SITE`, `// WRITE-SITE`, an `import` or a new `outcome:` literal.
  The replay never seeds, never reads `plan.json` or the report and never authenticates beyond the role session `ground` already obtains.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3705-3711` (the guard-first order and the proof before the browser), `# SOURCE: plugins/relay/scripts/qa-run.mjs:3726-3747` (the session, the launch and the host-abort route the replay runs inside), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2321-2340` (the resolver, the attach wait, the count rule and the act) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3748-3786` (the load, the stable wait, the partition and the single write that the replay is inserted into).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { createServer } from "node:http";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, statSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve, dirname } from "node:path";
  import { spawn } from "node:child_process";
  import { createHash } from "node:crypto";
  import { replayGroundingPrefix, withheldPrefixStep, buildRedactionTable } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
  const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
  const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

  // A. The replay against a fake page: order, the exactly-one rule, the guard and the fixed reasons.
  const calls = [];
  const fakeLocator = (count, label) => ({
    first: () => ({ waitFor: async () => {} }),
    count: async () => count,
    click: async () => { calls.push("click:" + label); },
    fill: async () => { calls.push("fill:" + label); },
  });
  const fakePage = (counts, fail = {}) => ({
    getByRole: (role, o) => ({ ...fakeLocator(counts[o.name] === undefined ? 1 : counts[o.name], o.name), click: async () => { if (fail[o.name]) throw new Error("x"); calls.push("click:" + o.name); } }),
    getByText: (t) => fakeLocator(counts[t] === undefined ? 1 : counts[t], t),
    goto: async (u) => { calls.push("goto:" + u); return { status: () => 200 }; },
  });
  const target = { origin: "http://127.0.0.1:3000", allowedHosts: new Set(["127.0.0.1", "localhost"]), guard: { isAllowedHost: (h, s) => s.has(h) } };
  const ok = await replayGroundingPrefix(fakePage({}), [{ action: "click", role: "button", name: "A" }, { action: "fill", text: "B", value: "v" }, { action: "goto", path: "/x" }], target);
  check(ok.ok === true && calls.join(",") === "click:A,fill:B,goto:http://127.0.0.1:3000/x", "replay order: " + JSON.stringify([ok, calls]));
  calls.length = 0;
  for (const [label, counts, why] of [["zero matches", { SecretLocatorName: 0 }, /matched 0 elements/], ["two matches", { SecretLocatorName: 2 }, /matched 2 elements/]]) {
    calls.length = 0;
    const r = await replayGroundingPrefix(fakePage(counts), [{ action: "click", role: "button", name: "SecretLocatorName" }, { action: "click", role: "button", name: "After" }], target);
    check(r.ok === false && why.test(r.reason) && /^prefix step 1:/.test(r.reason) && !r.reason.includes("SecretLocatorName"), label + ": " + JSON.stringify(r));
    check(calls.length === 0, label + " acted on a step: " + calls.join(","));
  }
  calls.length = 0;
  const off = await replayGroundingPrefix(fakePage({}), [{ action: "click", role: "button", name: "A" }, { action: "goto", path: "http://example.com/x" }], target);
  check(off.ok === false && /guard-approved origin/.test(off.reason) && !calls.some((c) => c.startsWith("goto:")), "a path off the origin was loaded: " + JSON.stringify([off, calls]));
  const thrown = await replayGroundingPrefix(fakePage({}, { Boom: true }), [{ action: "click", role: "button", name: "Boom" }], target);
  check(thrown.ok === false && /could not be found or acted on/.test(thrown.reason) && !thrown.reason.includes("Boom"), "a failing click: " + JSON.stringify(thrown));

  // B. A locator that names a withheld value is refused before anything is replayed.
  const tmp = mkdtempSync(join(tmpdir(), "relay-qa-v2p5-tbl-"));
  try {
    const table = buildRedactionTable({ root: tmp, env: {}, secretValues: ["tok-secret-value-1"] });
    check(withheldPrefixStep([{ action: "click", role: "button", name: "Save" }, { action: "click", role: "link", name: "ana.souza@example.com" }], table) === 2, "an e-mail locator was not withheld");
    check(withheldPrefixStep([{ action: "fill", role: "textbox", name: "Code tok-secret-value-1", value: "x" }], table) === 1, "a secret locator was not withheld");
    check(withheldPrefixStep([{ action: "click", role: "button", name: "Save" }, { action: "goto", path: "/a" }], table) === 0, "a clean prefix was withheld");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  // C. End to end through the real runner against a loopback application and a real Chromium.
  const SID = "sidvalue-Zq83kd01-Hh2k9X7";
  const TYPED = "abc-typed-4417";
  const GROUP = "Nao concluidas";
  const FEATURE = "feat";
  const RUN_REL = "PRPs/reports/feat/qa-run/20260101T101010101Z";
  const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body>
  <h1>Tarefas</h1>
  <button id="g" type="button" aria-expanded="false">${GROUP}</button>
  <ul id="rows" hidden><li>Comprar leite</li><li>Pagar conta</li></ul>
  <label for="f">Filtro</label><input id="f" type="text">
  <button id="a" type="button">Aplicar</button>
  <p id="o"></p>
  <button type="button">Gemeo</button><button type="button">Gemeo</button>
  <script>
  document.getElementById("g").onclick = function () { var open = this.getAttribute("aria-expanded") === "true"; this.setAttribute("aria-expanded", String(!open)); document.getElementById("rows").hidden = open; };
  document.getElementById("a").onclick = function () { document.getElementById("o").textContent = "Filtro com " + document.getElementById("f").value.length + " caracteres"; };
  </script></body></html>`;
  const LOGIN = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Entrar</h1></body></html>`;
  const server = createServer((req, res) => {
    const cookie = String(req.headers.cookie || "");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(cookie.includes("sid=" + SID) ? PAGE : LOGIN);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const base = "http://127.0.0.1:" + server.address().port;
  const root = mkdtempSync(join(tmpdir(), "relay-qa-v2p5-"));
  try {
    const runAbs = join(root, ...RUN_REL.split("/"));
    const groundingDir = join(runAbs, "grounding");
    mkdirSync(runAbs, { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { admin: {} } }));
    const state = { cookies: [{ name: "sid", value: SID, domain: "127.0.0.1", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] };
    writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), `import {writeFileSync,mkdirSync} from "node:fs";import {join} from "node:path";
  const root=process.argv[process.argv.indexOf("--root")+1];
  mkdirSync(join(root,"PRPs","auth",".sessions"),{recursive:true});
  writeFileSync(join(root,"PRPs","auth",".sessions","admin.json"),${JSON.stringify(JSON.stringify(state))});
  `);
    const ground = (extra) => new Promise((resolveP, rejectP) => {
      const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "ground", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL, ...extra], { cwd: root, env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(root) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let so = "";
      let se = "";
      child.stdout.on("data", (d) => (so += d));
      child.stderr.on("data", (d) => (se += d));
      const timer = setTimeout(() => child.kill(), 150000);
      child.on("error", (e) => { clearTimeout(timer); rejectP(e); });
      child.on("close", (code) => { clearTimeout(timer); resolveP({ code, so, se }); });
    });
    const list = () => (existsSync(groundingDir) ? readdirSync(groundingDir).sort() : []);
    const read = (n) => JSON.parse(readFileSync(join(groundingDir, n), "utf8"));
    const has = (doc, name) => doc.entries.some((e) => (e.name === name || e.text === name) && e.matches === 1);
    const withPrefix = (steps, extra = ["--role", "admin"]) => ["--route", "/tasks", ...extra, "--prefix", JSON.stringify(steps)];

    // The plain snapshot first: the rows are not there, and its shape is the one it always had.
    const plain = await ground(["--route", "/tasks", "--role", "admin"]);
    check(plain.code === 0, "the plain ground exited " + plain.code + ": " + plain.se);
    check(/^GROUNDED: grounding\/admin--tasks\.snapshot\.json entries=\d+ withheld=\d+$/m.test(plain.so), "the plain GROUNDED line: " + plain.so);
    const plainName = "admin--tasks.snapshot.json";
    const plainBytes = readFileSync(join(groundingDir, plainName));
    const plainDoc = read(plainName);
    check(Object.keys(plainDoc).sort().join(",") === "entries,role,route,schema_version,withheld" && plainDoc.schema_version === 1, "the plain schema changed: " + Object.keys(plainDoc));
    check(has(plainDoc, GROUP) && !has(plainDoc, "Comprar leite"), "the plain snapshot must list the group and not its rows");

    // One replayed click: the expanded rows appear, in a different file, and the plain one is untouched.
    const one = await ground(withPrefix([{ action: "click", role: "button", name: GROUP }]));
    check(one.code === 0, "the prefix ground exited " + one.code + ": " + one.se);
    const m = /^GROUNDED: grounding\/(admin--tasks--after-[0-9a-f]{8}\.snapshot\.json) entries=\d+ withheld=\d+$/m.exec(one.so);
    check(m !== null, "the prefix GROUNDED line: " + one.so);
    if (m !== null) {
      const doc = read(m[1]);
      check(doc.schema_version === 2 && doc.role === "admin" && doc.route === "/tasks", "the post-interaction header: " + JSON.stringify([doc.schema_version, doc.role, doc.route]));
      check(Object.keys(doc).sort().join(",") === "entries,prefix,role,route,schema_version,withheld", "the post-interaction keys: " + Object.keys(doc));
      check(same(doc.prefix, [{ action: "goto", path: "/tasks" }, { action: "click", role: "button", name: GROUP }]), "the recorded prefix: " + JSON.stringify(doc.prefix));
      check(has(doc, "Comprar leite") && has(doc, "Pagar conta"), "the expanded rows are missing from the snapshot taken after the click");
    }
    check(Buffer.compare(readFileSync(join(groundingDir, plainName)), plainBytes) === 0, "the plain snapshot was overwritten");
    check(list().length === 2, "expected the plain and one post-interaction file: " + list().join(","));

    // A fill and a click: the typed value is digested, never written, and the page reacts to it.
    const two = await ground(withPrefix([{ action: "fill", role: "textbox", name: "Filtro", value: TYPED }, { action: "click", role: "button", name: "Aplicar" }]));
    check(two.code === 0, "the fill prefix ground exited " + two.code + ": " + two.se);
    const m2 = /^GROUNDED: grounding\/(admin--tasks--after-[0-9a-f]{8}\.snapshot\.json) /m.exec(two.so);
    check(m2 !== null && (m === null || m2[1] !== m[1]), "a different prefix must give a different file: " + two.so);
    if (m2 !== null) {
      const doc2 = read(m2[1]);
      check(has(doc2, "Filtro com " + TYPED.length + " caracteres"), "the fill did not reach the page");
      const fillEntry = doc2.prefix.find((s) => s.action === "fill");
      check(fillEntry && fillEntry.value_sha256 === sha(TYPED) && !("value" in fillEntry), "the typed value must be recorded as a digest only: " + JSON.stringify(fillEntry));
    }
    check(list().length === 3, "expected three snapshot files: " + list().join(","));

    // A failing prefix writes nothing, prints no GROUNDED line and names no locator.
    const before = list();
    for (const [label, steps, extra, why] of [
      ["a missing element", [{ action: "click", role: "button", name: "Inexistente" }], ["--role", "admin"], /matched 0 elements/],
      ["an ambiguous element", [{ action: "click", role: "button", name: "Gemeo" }], ["--role", "admin"], /matched 2 elements/],
      ["the same click with no session", [{ action: "click", role: "button", name: GROUP }], [], /matched 0 elements/],
    ]) {
      const r = await ground(withPrefix(steps, extra));
      check(r.code === 1 && r.se.includes("GROUND_PREFIX_FAILED") && why.test(r.se) && !r.so.includes("GROUNDED:"), label + ": " + JSON.stringify([r.code, r.se, r.so]));
      check(!r.se.includes("Inexistente") && !r.se.includes("Gemeo"), label + " echoed a locator name: " + r.se);
      check(same(list(), before), label + " wrote a snapshot: " + list().join(","));
    }

    // No run file and no terminal stream holds the typed value or the session value.
    const walk = (d, acc) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; };
    for (const f of walk(runAbs, [])) {
      const txt = readFileSync(f).toString("latin1");
      for (const v of [TYPED, SID]) if (txt.includes(v)) check(false, "a value reached " + f);
    }
    for (const out of [plain, one, two]) for (const v of [TYPED, SID]) check(!(out.so + out.se).includes(v), "a value reached the terminal");
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(root, { recursive: true, force: true });
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-evidence-privacy.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs
  ```
  Before this task `replayGroundingPrefix` does not exist, so the import fails. Section A drives the real replay with a fake page (the guard, the exactly-one rule, the order and the fixed reasons need no browser); section B drives the real withheld-locator rule against a real redaction table; section C drives the real runner with an async `spawn` (an in-process server must answer) against a loopback page that shows the group only to a request carrying the role cookie, so the no-session control proves the replay used the role's session. It asserts that the plain snapshot keeps its five keys and bytes, that the post-interaction file has its own name, schema and recorded prefix, that the expanded rows are listed, that a typed value appears nowhere but as a digest, and that a failing prefix leaves the directory exactly as it was. The three existing test files run unchanged (the exact plain schema, the argument refusals, the ignore-proof order and the single `loadPlaywright(root, PLUGIN_ROOT);` literal).

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the plan-time check picks the post-interaction snapshot that matches the case's own steps

- **ACTION**: Delivers AC-A5 (a locator step that follows the case's own interactions is grounded against the snapshot taken after exactly those interactions, a step before them or with no matching snapshot keeps today's behavior byte for byte, and the two kinds cannot be confused) and AC-A9 (a `fill` value that a consumed prefix replays comes from the report's own steps). In `plugins/relay/scripts/qa-run.mjs`:
  1. `loadGroundingSnapshots`: replace the schema gate `d.schema_version === 1` with "`d.schema_version === 1`, or `isPostInteractionSnapshot(d)`", keeping the `role`, `route` and `entries` checks, the `.snapshot.json` filter and the sort. A schema-2 file with no `prefix` array is ignored, exactly as an unknown schema was.
  2. `precheckGroundedSteps` (signature, JSDoc parameters, route tracking, entry search, the exactly-one rule and both literal rules unchanged): for each grounded locator step, compute `const candidates = route === null ? [] : snapshots.filter((s) => isObj(s) && s.role === wantRole && s.route === route);`, `const hist = interactionHistory(steps, i);`, and `const key = hist.some((h) => h.step.action !== 'goto') ? groundingPrefixKey(hist.map((h) => h.norm)) : null;`. The snapshot to ground against is `after`, the first candidate for which `isPostInteractionSnapshot(s)` and `groundingPrefixKey(s.prefix) === key` (only when `key !== null`), else the first candidate that is not a post-interaction snapshot. A plain lookup therefore never returns a post-interaction file, whatever the file order. An undefined snapshot keeps today's `no plan-time snapshot covers this role and route` refusal.
  3. When `after` was used and the step is otherwise grounded (the entry exists with `matches === 1`), for each `fill` entry of `hist` whose raw `value` is not a string present in `collapse(manualText)` (the existing `collapse`, whitespace and case insensitive) return `{ code: 'PLAN_ENTRY_INVALID', reason: `step ${h.at}: a fill value that a grounded prefix replays must come from the report's own steps` }` with `h.at` the position of that `fill`. Place it beside the `expect_text` rule. No value appears in the reason.
  4. When the entry is not found and `after` is undefined but at least one candidate is a post-interaction snapshot, append a fixed hint to the existing `the locator is not a snapshot entry` reason: `; a post-interaction snapshot exists for this role and route, but the steps of this case before this one are not exactly its prefix`. Without such a candidate the reason is byte-identical to today's.
  A plan whose snapshots are all schema 1 must behave exactly as before (the existing corpus proves it). Do not touch `routeKey`, `locatorOf` or the case-level refusal text, and do not add the text `writeFileSync(`, `renameSync(`, `// GUARD-SITE` or `// WRITE-SITE`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3234-3247` (the loader whose gate widens) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1617-1653` (the check whose single lookup becomes keyed, with the report-sourced rule as a sibling of the `expect_text` rule).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { createServer } from "node:http";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve, dirname } from "node:path";
  import { spawn } from "node:child_process";
  import { precheckGroundedSteps, groundingStepKey } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const code = (r) => (r === null ? null : r.code);

  // A. The pure lookup.
  const GROUP = "Nao concluidas";
  const goto = { action: "goto", path: "/tasks" };
  const head = { action: "expect_visible", role: "heading", name: "Tarefas" };
  const click = { action: "click", role: "button", name: GROUP };
  const fill = { action: "fill", role: "textbox", name: "Filtro", value: "abc" };
  const apply = { action: "click", role: "button", name: "Aplicar" };
  const row = { action: "expect_visible", text: "Comprar leite" };
  const plain = { schema_version: 1, role: "admin", route: "/tasks", withheld: 0, entries: [
    { kind: "role", role: "heading", name: "Tarefas", matches: 1 }, { kind: "role", role: "button", name: GROUP, matches: 1 },
    { kind: "role", role: "button", name: "Outro", matches: 1 }, { kind: "role", role: "textbox", name: "Filtro", matches: 1 },
    { kind: "role", role: "button", name: "Aplicar", matches: 1 }, { kind: "role", role: "link", name: "Detalhes", matches: 1 }] };
  const after = (prefix, entries, route = "/tasks", role = "admin") => ({ schema_version: 2, role, route, withheld: 0, entries, prefix: prefix.map(groundingStepKey) });
  const rows = [{ kind: "text", text: "Comprar leite", matches: 1 }, { kind: "text", text: "Gemeo", matches: 2 }];
  const post = after([goto, click], rows);
  const pre = (steps, snaps, manual = "Open the tasks and expand the group.", role = "admin") => precheckGroundedSteps(steps, snaps, manual, role);

  const bare = pre([goto, head, click, row], [plain]);
  check(code(bare) === "STEP_UNGROUNDED" && /not a snapshot entry/.test(bare.reason) && !/post-interaction/.test(bare.reason) && !bare.reason.includes("Comprar"), "no post-interaction file: " + JSON.stringify(bare));
  check(pre([goto, head, click, row], [plain, post]) === null, "the post-interaction snapshot was not used for a step after the click");
  check(pre([goto, head, click, row], [post, plain]) === null, "the lookup depends on the order of the files");
  check(pre([goto, head, click], [post, plain]) === null && pre([goto, head], [post, plain]) === null, "steps before the interaction must keep the plain snapshot");
  const early = pre([goto, row], [post]);
  check(code(early) === "STEP_UNGROUNDED" && /no plan-time snapshot covers/.test(early.reason), "a post-interaction file was taken for a plain lookup: " + JSON.stringify(early));
  const gemeo = pre([goto, head, click, { action: "expect_visible", text: "Gemeo" }], [plain, post]);
  check(code(gemeo) === "STEP_UNGROUNDED" && /2 elements/.test(gemeo.reason), "the exactly-one rule must hold on the post-interaction entries: " + JSON.stringify(gemeo));

  // A different history is not the prefix: today plain behavior plus the fixed hint.
  const other = pre([goto, head, { action: "click", role: "button", name: "Outro" }, row], [plain, post]);
  check(code(other) === "STEP_UNGROUNDED" && /not a snapshot entry/.test(other.reason) && /post-interaction snapshot exists/.test(other.reason) && !other.reason.includes("Outro"), "a different interaction: " + JSON.stringify(other));
  const legacy = pre([goto, head, { action: "click", selector: "#legacy" }, row], [plain, post]);
  check(code(legacy) === "STEP_UNGROUNDED", "a selector click makes the history unkeyable: " + JSON.stringify(legacy));
  check(code(pre([goto, head, click, row], [after([goto, click], rows, "/tasks", "viewer"), plain])) === "STEP_UNGROUNDED", "another role snapshot was used");
  check(pre([goto, head, click, row], [after([goto, { ...click, name: "Outro" }], rows), plain]) !== null, "another prefix was used");

  // The route the page is on after a navigating click (expect_url) selects the snapshot of that route.
  const details = { action: "click", role: "link", name: "Detalhes" };
  const nav = after([goto, details], [{ kind: "text", text: "Comprar leite", matches: 1 }], "/tasks/5");
  check(pre([goto, details, { action: "expect_url", path: "/tasks/5" }, row], [plain, nav]) === null, "the route after expect_url did not select the snapshot");
  check(code(pre([goto, details, row], [plain, nav])) === "STEP_UNGROUNDED", "without expect_url the case is still on the first route");

  // A replayed fill value must come from the report.
  const fillPost = after([goto, fill, apply], [{ kind: "text", text: "Filtro com 3 caracteres", matches: 1 }]);
  const filled = [goto, head, fill, apply, { action: "expect_visible", text: "Filtro com 3 caracteres" }];
  check(pre(filled, [plain, fillPost], "Type abc in the filter and apply.") === null, "a fill value from the report must pass");
  const invented = pre(filled, [plain, fillPost], "Open the tasks and apply the filter.");
  check(code(invented) === "PLAN_ENTRY_INVALID" && /^step 3:/.test(invented.reason) && !invented.reason.includes("abc"), "an invented fill value: " + JSON.stringify(invented));
  check(code(pre([goto, head, fill, apply], [plain], "Open the tasks.")) === null, "a plain plan with a fill and no post-interaction file must be unchanged");

  // B. The real runner: the check runs before any login, and a post-interaction snapshot lets the case pass.
  const SID = "sidvalue-Zq83kd01-Hh2k9X7";
  const FEATURE = "feat";
  const RUN_REL = "PRPs/reports/feat/qa-run/20260101T101010101Z";
  const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body>
  <h1>Tarefas</h1>
  <button id="g" type="button" aria-expanded="false">${GROUP}</button>
  <ul id="rows" hidden><li>Comprar leite</li></ul>
  <label for="f">Filtro</label><input id="f" type="text">
  <button id="a" type="button">Aplicar</button>
  <p id="o"></p>
  <script>
  document.getElementById("g").onclick = function () { var open = this.getAttribute("aria-expanded") === "true"; this.setAttribute("aria-expanded", String(!open)); document.getElementById("rows").hidden = open; };
  document.getElementById("a").onclick = function () { document.getElementById("o").textContent = "Filtro com " + document.getElementById("f").value.length + " caracteres"; };
  </script></body></html>`;
  const server = createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE); });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const base = "http://127.0.0.1:" + server.address().port;
  const roots = [];
  const makeRoot = (withPost) => {
    const root = mkdtempSync(join(tmpdir(), "relay-qa-v2p5-run-"));
    roots.push(root);
    const runAbs = join(root, ...RUN_REL.split("/"));
    mkdirSync(join(runAbs, "grounding"), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { admin: {} } }));
    const state = { cookies: [{ name: "sid", value: SID, domain: "127.0.0.1", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] };
    writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), `import {writeFileSync,mkdirSync} from "node:fs";import {join} from "node:path";
  const root=process.argv[process.argv.indexOf("--root")+1];
  mkdirSync(join(root,"PRPs","auth",".sessions"),{recursive:true});
  writeFileSync(join(root,"PRPs","auth",".sessions","admin.json"),${JSON.stringify(JSON.stringify(state))});
  `);
    const titles = ["Group rows", "Filter results", "Invented filter value"];
    const manual = [["Open the tasks.", "Expand the group and see the rows."], ["Open the tasks.", "Type abc in the filter and apply it."], ["Open the tasks.", "Fill the filter and apply it."]];
    const block = (n) => ["### Case " + n, "**Title:** " + titles[n - 1], "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", ...manual[n - 1].map((t, i) => (i + 1) + ". " + t), ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + [1, 2, 3].map(block).join("\n") + "\n## Notes\n\nnone\n");
    const heading = { action: "expect_visible", role: "heading", name: "Tarefas" };
    const resultText = { action: "expect_visible", text: "Filtro com 3 caracteres" };
    const entry = (i, steps) => ({ index: i, title: titles[i - 1], driver: "browser", role: "admin", state: "none", steps });
    writeFileSync(join(runAbs, "plan.json"), JSON.stringify({ schema_version: 1, cases: [
      entry(1, [goto, heading, click, row]), entry(2, [goto, heading, fill, apply, resultText]), entry(3, [goto, heading, { ...fill, value: "zzz" }, apply, resultText]) ] }));
    const put = (name, doc) => writeFileSync(join(runAbs, "grounding", name), JSON.stringify(doc));
    put("admin--tasks.snapshot.json", plain);
    if (withPost) {
      put("admin--tasks--after-aaaaaaaa.snapshot.json", after([goto, click], [{ kind: "text", text: "Comprar leite", matches: 1 }]));
      put("admin--tasks--after-bbbbbbbb.snapshot.json", after([goto, fill, apply], [{ kind: "text", text: "Filtro com 3 caracteres", matches: 1 }]));
      put("admin--tasks--after-cccccccc.snapshot.json", after([goto, { ...fill, value: "zzz" }, apply], [{ kind: "text", text: "Filtro com 3 caracteres", matches: 1 }]));
    }
    return { root, runAbs };
  };
  const runRunner = (root) => new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL], { cwd: root, env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(root) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let se = "";
    child.stderr.on("data", (d) => (se += d));
    const timer = setTimeout(() => child.kill(), 200000);
    child.on("error", (e) => { clearTimeout(timer); rejectP(e); });
    child.on("close", (c) => { clearTimeout(timer); resolveP({ code: c, se }); });
  });
  try {
    const withPost = makeRoot(true);
    const a = await runRunner(withPost.root);
    check(a.code === 0, "the run exited " + a.code + ": " + a.se);
    const res = JSON.parse(readFileSync(join(withPost.runAbs, "results.json"), "utf8"));
    const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
    check(res.cases[0].outcome === "pass", "the group case: " + brief(res.cases[0]));
    check(res.cases[1].outcome === "pass", "the filter case: " + brief(res.cases[1]));
    check(res.cases[2].outcome === "needs-human" && res.cases[2].reason_code === "PLAN_ENTRY_INVALID" && /^step 3:/.test(res.cases[2].reason), "the invented value: " + brief(res.cases[2]));
    const control = makeRoot(false);
    const b = await runRunner(control.root);
    check(b.code === 0, "the control run exited " + b.code + ": " + b.se);
    const res2 = JSON.parse(readFileSync(join(control.runAbs, "results.json"), "utf8"));
    check(res2.cases[0].outcome === "needs-human" && res2.cases[0].reason_code === "STEP_UNGROUNDED", "without the post-interaction file the rows are ungrounded: " + brief(res2.cases[0]));
    check(!existsSync(join(control.root, "PRPs", "auth", ".sessions")), "a login ran although the case was refused at plan time");
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await new Promise((r) => server.close(() => r(null)));
    for (const r of roots) rmSync(r, { recursive: true, force: true });
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-absence-state.test.mjs scripts/validate/checks/qa-run-input-value.test.mjs
  ```
  Before this task the loader rejects schema 2 and the check never reads a prefix, so the section A assertion that a step after the click is grounded fails and the command exits non-zero. Section A calls the real check with hand-built snapshots keyed through the real normalizer; section B drives the real runner with an async `spawn`: three cases ground against hand-written post-interaction files (two pass, the third is refused for a fill value the report does not state) and a control root with only the plain snapshot is refused `STEP_UNGROUNDED` before any login. The three existing test files run unchanged: they hold the 4-argument call shape, the refusal wording and the click-then-assert plans that must keep grounding on the plain snapshot.

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — the "Grounding after an interaction." block, one honesty bullet and the three carry-over fixes

- **ACTION**: Delivers AC-A6 (the doc, the usage text and the script match: the mode, its flag, its restrictions, its halts, its file, the plain statement of the side-effect risk and the Git Bash note) and AC-A7 (the three carry-over fixes, docs only, no runner behavior change). In `plugins/relay/commands/relay-qa-run.md`, with LF line endings, hard-wrapped prose, and each pinned token below on ONE physical line (the contract and the VALIDATE use raw `includes` on lines):
  1. In the paragraph that starts `Append ` --role`, extend the sentence so it also covers the new flag: after `` ` --env-handle "<path>"` when the argument was given`` add the clause `` , and ` --prefix '<json>'` to ground an element that exists only after an interaction (see Grounding after an interaction below)``, leaving the rest of the paragraph and the Git Bash note unchanged. This first `ground` command line and the first backticked `MSYS_NO_PATHCONV=1` must remain the earliest occurrences in the doc.
  2. Directly after the paragraph that ends `stays out of git even when it is not withheld.` (the "Personal data." paragraph) and before the paragraph that starts `One literal `query` step`, insert the block below, as paragraphs separated by blank lines, with a fenced `bash` (not `json`) block for the example, and no sentence that begins `Grounding rules.`, `Personal data.` or `The closed vocabulary.`:
     - A paragraph that starts exactly `Grounding after an interaction.` (keep that token and `--prefix` unbroken): an element that exists only after a click or a fill is not in the plain snapshot of its route, so ground the plain route first and plan the interaction itself from that snapshot, then run the same `ground` line again with a `--prefix` that is a JSON array of the steps of the case that come before the element, in order.
     - A fenced `bash` block holding exactly one line: `MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" ground --root "<target_root>" --feature "<feature>" --run-dir "<RUN_DIR>" --route "/tarefas" --role "<role>" --prefix '[{"action":"click","role":"button","name":"Não concluídas"}]'` (see "Live probe" in the plan Notes: if the shell alters the non-ASCII name, write it with `ã` and `í` JSON escapes and add one sentence saying so).
     - A paragraph with these sentences, each pinned fragment on one line: `The prefix accepts only `goto`, `click` and `fill` steps, at most 5 steps, and at least one `click` or `fill`.` (the cap follows `GROUND_PREFIX_MAX_STEPS`, so `at most 5 steps` is one unbroken line); each step is flat and names its element by `role` and `name`, or by `text`, never by `selector`; a `fill` carries a string `value` of at most 200 characters; `A `{{name}}` binding is refused, because `ground` runs before any seed.`; the page is loaded at `--route` as before and each step is replayed in order with the role's saved session behind the same local-only guard; every step must match exactly one element at the moment it is replayed, and a `goto` must stay on the guard-approved origin; the snapshot is taken afterwards, only once two successive snapshots are equal, exactly as for a plain route.
     - A paragraph: `A prefix step that matches zero or more than one element, or that cannot be performed, halts `GROUND_PREFIX_FAILED`:` the exit is non-zero and no snapshot and no `GROUNDED:` line are written; `A malformed prefix exits 2 with `GROUND_PREFIX_INVALID` and the usage text and writes nothing.`
     - A paragraph: the snapshot of a prefix `is a different file from the plain snapshot of the route and never overwrites it`, named `grounding/<role>--<route>--after-<digest>.snapshot.json`; it records the prefix with a digest in place of every typed value; `The runner grounds a locator step against it only when the steps of the case before that step are exactly the prefix`, in the same order and with the same values, on the route the page is on (after an `expect_url`, the route that step names); every other step is grounded against the plain snapshot exactly as before; `Write a `fill` value of a prefix only when the steps of the report state it.`
     - A paragraph: `A replayed `click` or `fill` is a real interaction with the local application, made at plan time and never undone.` (keep `is a real interaction with the local application` on one line) followed by the plain risk statement: a click that submits a form, deletes a row or toggles a setting changes the state of the local environment the guard approved, and the runner cannot tell a harmless click from a destructive one; prefix only the interactions the case itself performs before the element it needs, keep the prefix short and never prefix a step whose manual wording submits, saves, deletes or sends; `` `ground` runs no seed`` (keep that fragment on one line), so the page shows the state the local application holds now, not the state the declaration of the case would seed; if the element is still not listed, matches more than one element or the prefix halts, decline the case with `UNGROUNDABLE_AFTER_INTERACTION`; and a response that arrives later than the one-second pair may be missed, in which case the `ground` line can be run once more before declining.
  3. In the `Grounding rules.` paragraph, replace the two lines that read `Elements that only appear after an interaction are not in the snapshot and cannot be` / `grounded, so a case that needs one is declined with `UNGROUNDABLE_AFTER_INTERACTION`.` with exactly this sentence: `Elements that only appear after an interaction are not in the plain snapshot: ground them with a prefix (see Grounding after an interaction below), and decline a case that still needs one with `UNGROUNDABLE_AFTER_INTERACTION`.` Leave the other sentences of that paragraph (they carry regexes of the tests) untouched.
  4. Carry-over fix DQ18 (PRD AC-10), in the `expect_not_visible` paragraph: replace the parenthetical `(an element that only appears after an interaction is still `UNGROUNDABLE_AFTER_INTERACTION`)` with the sentence `The element must be one the snapshot of that page state already lists: the plain snapshot, or the one a `--prefix` ground wrote after the interactions of the case.` and add, before it, `A `click` that navigates to another page does not reset that anchor, so follow a navigating `click` with an `expect_url` of the new path and a positive step on the page it lands on before any `expect_not_visible`.` Keep the opening words, the `re-checked for up to 5 seconds` line and the two phrases `positive step on the same route in the same case` and `before anything is seeded, authenticated or requested` as they are.
  5. Carry-over fix DQ19 (PRD AC-10), in the `expect_state` paragraph: remove `, a checkbox whose state is mixed` from the parenthetical and end the paragraph with: the case is blocked `STEP_NOT_PERFORMABLE` and never passes as collapsed or unchecked, `and so does a `checked` step on an element whose `aria-checked` is `mixed`.` followed by `The runner reads only that attribute: a native checkbox whose DOM `indeterminate` property is set exposes no `aria-checked`, is not detected, and is read as Playwright reports its checked state.` Keep `never passes as collapsed or unchecked` and the paragraph's opening words.
  6. Carry-over fix DQ20 (PRD AC-18), in the `expect_value` paragraph: after the sentence `The comparison is exact, and `not_empty` ignores surrounding whitespace.` add `The value is re-read for up to 5 seconds before the comparison fails.` with `for up to 5 seconds` unbroken on one physical line. Every pinned phrase of that paragraph stays.
  7. In the honesty rules, directly after the bullet that starts `- Plan `expect_not_visible` only after a positive step of the same route`, add one bullet that starts `- Plan a `ground` prefix only from the `goto`, `click` and `fill` steps of the case itself` and says to write a prefix `fill` value only when the steps of the report state it and to `never prefix a step whose manual wording submits, saves, deletes or sends`.
  Do not write any of these anywhere (tests ban them): `Until seeds`, `not yet read by the runner`, `a CLI, a database query`, `leave the case to the script`, `You write no plan entry for this`, `are all registered for redaction`, `Write ONLY the cases`, a bullet that starts `- Omit any case`, the phrase `omit the case` in any case or form, `never added to them.`, `design-spec`, `relay-auth-setup`, `subagent_type`, `.claude/PRPs`, `PRPs/metrics`, any line that quotes the two-dot `git diff` range form, a backticked bare resource basename, or the substring `--local-host`. Add no `json` fence and no marked example: the classification table, the catalogue table, the `json` blocks, the `### Record resolution` section and the first role-and-name and first text examples stay byte-identical.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:179-191` (the ground command and flags paragraph the new block follows in spirit), `# SOURCE: plugins/relay/commands/relay-qa-run.md:284-291` (the paragraph that gets DQ18), `# SOURCE: plugins/relay/commands/relay-qa-run.md:300-306` (DQ19), `# SOURCE: plugins/relay/commands/relay-qa-run.md:269-275` (DQ20) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:308-333` (the rules and personal-data paragraphs the block is placed after).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  BASE=7ab2bc865e8bfe1be5652e89a265d9df91bb9f09
  git cat-file -e "${BASE}^{tree}"
  BASE_TREE="$BASE" node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { execFileSync } from "node:child_process";
  import { GROUND_PREFIX_MAX_STEPS, ASSERT_SETTLE_MS } from "./plugins/relay/scripts/qa-run.mjs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  import { runPluginRootResolvableCheck } from "./scripts/validate/checks/plugin-root-resolvable.mjs";
  import { runPathExistenceCheck } from "./scripts/validate/checks/path-existence.mjs";
  import { runDiffBaseFormCheck } from "./scripts/validate/checks/diff-base-form.mjs";
  import { runMetricsIsolationCheck } from "./scripts/validate/checks/metrics-isolation.mjs";
  import { runLineEndingsCheck } from "./scripts/validate/checks/line-endings.mjs";
  import { runAuthLocalGuardSitesCheck } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const base = execFileSync("git", ["show", process.env.BASE_TREE + ":plugins/relay/commands/relay-qa-run.md"], { encoding: "utf8", maxBuffer: 16777216 }).replace(/\r\n/g, "\n");
  const lines = doc.split("\n");
  const flat = doc.replace(/\s+/g, " ");
  const onOneLine = (token) => lines.some((l) => l.includes(token));
  const paragraphLines = (start) => {
    const at = lines.findIndex((l) => l.startsWith(start));
    const out = [];
    if (at === -1) return out;
    for (let i = at; i < lines.length && lines[i].trim() !== ""; i++) out.push(lines[i]);
    return out;
  };

  // The new block: every pinned token sits on one physical line, and the cap follows the exported constant.
  const window = "for up to " + (ASSERT_SETTLE_MS / 1000) + " seconds";
  for (const token of ["Grounding after an interaction.", "--prefix", "GROUND_PREFIX_FAILED", "GROUND_PREFIX_INVALID", "at most " + GROUND_PREFIX_MAX_STEPS + " steps", "is a real interaction with the local application", "runs no seed"]) {
    check(onOneLine(token), "no physical line carries " + token);
  }
  check(lines.some((l) => l.startsWith("Grounding after an interaction.")), "the block must open with a paragraph that starts Grounding after an interaction.");
  check(lines.some((l) => l.startsWith("MSYS_NO_PATHCONV=1 node ") && l.includes("ground --root") && l.includes("--prefix")), "the bash example line is missing");
  // RELAY-FIRST-MATCH-INTENDED: the first ground command of the doc is the one the Git Bash test anchors on, and the example line is a later sibling that must not precede it.
  check(doc.indexOf("qa-run.mjs\" ground --root") < doc.indexOf("MSYS_NO_PATHCONV=1 node "), "the first ground command must stay the earliest one");
  for (const fragment of [
    "The prefix accepts only `goto`, `click` and `fill` steps",
    "A `{{name}}` binding is refused, because `ground` runs before any seed.",
    "halts `GROUND_PREFIX_FAILED`",
    "exits 2 with `GROUND_PREFIX_INVALID`",
    "is a different file from the plain snapshot of the route and never overwrites it",
    "only when the steps of the case before that step are exactly the prefix",
    "Write a `fill` value of a prefix only when the steps of the report state it.",
    "never prefix a step whose manual wording submits, saves, deletes or sends",
    "to ground an element that exists only after an interaction (see Grounding after an interaction below)",
  ]) check(flat.includes(fragment), "the doc lacks: " + fragment);

  // The three carry-over fixes.
  for (const fragment of [
    "A `click` that navigates to another page does not reset that anchor, so follow a navigating `click` with an `expect_url` of the new path and a positive step on the page it lands on before any `expect_not_visible`.",
    "the plain snapshot, or the one a `--prefix` ground wrote after the interactions of the case.",
    "and so does a `checked` step on an element whose `aria-checked` is `mixed`.",
    "a native checkbox whose DOM `indeterminate` property is set exposes no `aria-checked`, is not detected, and is read as Playwright reports its checked state.",
    "The value is re-read for up to 5 seconds before the comparison fails.",
  ]) check(flat.includes(fragment), "a carry-over fix is missing: " + fragment);
  check(paragraphLines("`expect_value` takes `role` and `name`").some((l) => l.includes(window)), "the expect_value paragraph does not state the re-read window on one physical line");
  check(!flat.includes("a checkbox whose state is mixed") && !flat.includes("is still `UNGROUNDABLE_AFTER_INTERACTION`") && !flat.includes("cannot be grounded, so a case that needs one is declined"), "a sentence the prefix makes false is still there");
  check(flat.includes("Elements that only appear after an interaction are not in the plain snapshot: ground them with a prefix (see Grounding after an interaction below), and decline a case that still needs one with `UNGROUNDABLE_AFTER_INTERACTION`."), "the grounding rules sentence was not updated");

  // Pins kept: the paragraph openings, the honesty bullets, the marked examples and the byte-identical regions.
  for (const start of ["`expect_value` takes `role` and `name`", "`expect_not_visible` takes `role` and `name`", "`expect_state` takes `role` and `name`", "The optional `session` key"]) {
    check(lines.filter((l) => l.startsWith(start)).length === 1, "exactly one paragraph must start with " + start);
  }
  for (const phrase of ["positive step on the same route in the same case", "before anything is seeded, authenticated or requested", "never passes as collapsed or unchecked", "never the value, and the final screenshot masks the field", "blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted"]) {
    check(flat.includes(phrase), "a pinned phrase was lost: " + phrase);
  }
  const bullets = lines.filter((l) => l.startsWith("- Plan "));
  check(bullets.filter((l) => l.startsWith("- Plan a `ground` prefix")).length === 1, "exactly one honesty bullet must start with - Plan a `ground` prefix");
  check(bullets.filter((l) => l.startsWith("- Plan `expect_not_visible`")).length === 1 && bullets.filter((l) => l.startsWith("- Plan `\"session\": \"none\"`")).length === 1, "the earlier honesty bullets were disturbed");
  const fences = (t) => [...t.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  check(JSON.stringify(fences(doc)) === JSON.stringify(fences(base)), "a json block of the doc changed");
  // RELAY-FIRST-MATCH-INTENDED: both anchors are the first and only occurrence in the doc and in the base text, which is exactly what the doc-reading tests slice on.
  const slice = (t, a, b) => t.slice(t.indexOf(a), t.indexOf(b));
  for (const [a, b] of [["### Classify every case and name every decline", "The paragraphs that follow (the declaration schema"], ["### Record resolution", "- The outcome comes from the JUnit testcases"]]) {
    const was = slice(base, a, b);
    check(was.length > 100 && was === slice(doc, a, b), "the region from " + a + " to " + b + " changed");
  }
  for (const phrase of ["Until seeds", "not yet read by the runner", "a CLI, a database query", "leave the case to the script", "You write no plan entry for this", "are all registered for redaction", "Write ONLY the cases", "design-spec", "relay-auth-setup", "subagent_type", "--local-host", ".claude/PRPs", "PRPs/metrics", "never added to them."]) {
    check(!doc.includes(phrase), "a banned phrase is present: " + phrase);
  }
  check(!/omit the case/i.test(doc) && !lines.some((l) => l.startsWith("- Omit any case")), "an omit phrase is present");

  // The registered checks that read this file.
  for (const run of [runQaRunContractCheck, runPluginRootResolvableCheck, runPathExistenceCheck, runDiffBaseFormCheck, runMetricsIsolationCheck, runLineEndingsCheck, runAuthLocalGuardSitesCheck]) {
    const r = run();
    if (!r.ok) check(false, r.name + " failed: " + JSON.stringify(r.findings.slice(0, 5)));
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-per-test-resolution.test.mjs scripts/validate/checks/qa-run-query.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-minted-session.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-ui-grounding.test.mjs
  ```
  Before this task the doc lacks the block and the fixes, so the first script exits non-zero (and its import of `GROUND_PREFIX_MAX_STEPS` needs Task 1). Every fragment it matches is copied byte for byte from this task's `ACTION` (whitespace-collapsed on the doc side, because the doc hard-wraps; the one-line tokens are checked on physical lines); the two byte-identity checks compare the classification and catalogue region and the record-resolution section with the base tree (`git show <tree>:<path>` works for a tree object); the `json` fences are compared as a list. The eleven test files are the existing doc-reading and example-validating tests with their browser-driven cases skipped by name (Level 3 runs them).

### Task 5: UPDATE plugins/relay/resources/redaction-policy.md — one bullet for post-interaction snapshots

- **ACTION**: Delivers AC-A9 (the policy the runner is documented against states that a snapshot taken after a replayed prefix is withheld by the same rules, that a locator naming a withheld value is refused before the browser starts, and that a typed value is recorded only as a digest). Insert, directly after the `Input values` bullet at the end of the `### Snapshots, screenshots and personal data` subsection and before the `---` line, this bullet (column zero, continuation lines indented two spaces, no blank line inside it):
  ```
  - **Post-interaction snapshots.** A snapshot written after the `ground` mode replayed
    a prefix of `goto`, `click` and `fill` steps lives under `grounding/` beside the plain
    snapshot of its route and is withheld by the same rules, entry by entry. A prefix
    locator that names a withheld value is refused before the browser starts, and a typed
    value is recorded as a SHA-256 digest, never in clear, so the snapshot file holds no
    typed value.
  ```
  Keep the bullet label of every other bullet, the section and subsection headings (`auth-secrecy` pins `## QA runner evidence: session values, snapshots, screenshots and personal data`, `### Session values are registered source-first` and `### Snapshots, screenshots and personal data`), the `git check-ignore`, `FAILED_IGNORE_UNPROVEN`, `not-applicable`, `grounding/`, `evidence/`, `.gitignore`, `PRPs/redaction-extensions.txt` tokens and the two floor numbers untouched. Do not name any resource file by basename (the resource-basename rule of `plugin-root-resolvable`).
- **MIRROR**: `# SOURCE: plugins/relay/resources/redaction-policy.md:240-243` (the bullet the new one follows; same label shape and continuation indentation).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
  import { runPluginRootResolvableCheck } from "./scripts/validate/checks/plugin-root-resolvable.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const policy = readFileSync("plugins/relay/resources/redaction-policy.md", "utf8").replace(/\r\n/g, "\n");
  const bullet = /- \*\*Post-interaction snapshots\.\*\*[\s\S]*?\n(?:\n|$)/.exec(policy);
  if (bullet === null) fail("the Post-interaction snapshots bullet is missing");
  const flat = bullet[0].replace(/\s+/g, " ");
  for (const needle of ["withheld by the same rules, entry by entry", "refused before the browser starts", "SHA-256 digest, never in clear", "holds no typed value"]) {
    if (!flat.includes(needle)) fail("the bullet lacks: " + needle + " | " + flat);
  }
  const input = /- \*\*Input values\.\*\*[\s\S]*?\n  the value reaches no evidence file, no result, no reason and no terminal line\.\n/.exec(policy);
  if (input === null) fail("the Input values bullet changed");
  // RELAY-FIRST-MATCH-INTENDED: each bullet label occurs exactly once in the policy, so the two indexOf results are unambiguous.
  if (policy.indexOf("- **Post-interaction snapshots.**") < policy.indexOf("- **Input values.**")) fail("the new bullet must follow the Input values bullet");
  for (const run of [runAuthSecrecyCheck, runPluginRootResolvableCheck]) {
    const r = run();
    if (!r.ok) fail(r.name + " failed: " + JSON.stringify(r.findings, null, 2));
  }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/auth-secrecy.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs
  ```
  The prose is the whole deliverable of this task, so a text match on the four phrases is the effect check; the two registered checks and the three existing test files prove that no pinned heading, token or bullet moved.

### Task 6: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the replay wiring and order, the consumer wiring, the parser and lookup behavior, the usage flag and the doc tokens behind an opt-in flag

- **ACTION**: Delivers AC-A8 (the contract check is extended, not duplicated; the registered count stays 28) and AC-A4 (the order that keeps the replay behind the guard and the proof, and ahead of the snapshot, cannot silently drift). In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Widen the import from `../../../plugins/relay/scripts/qa-run.mjs` to also import `parseGroundPrefix`, `GROUND_PREFIX_MAX_STEPS`, `groundSnapshotFileName`, `groundingStepKey`, `groundingPrefixKey` and `precheckGroundedSteps`.
  2. Add the input `requirePrefix` (default `false`, exactly like `requireVocabulary`) to the destructured signature of `checkQaRunContract` and to its JSDoc type, add `const PREFIX_PREFIX = 'prefix: ';`, and extend the file's header comment to list the new rules. Do NOT edit the `requireGround`, `requireCatalogue`, `requirePrivacy` or `requireVocabulary` blocks (tests pin exactly four findings from `requireGround` on a bare doc, and the other counts).
  3. When `requirePrefix` is true, every finding message starts with the word `prefix:` and contains neither `step example` nor `is outside the closed vocabulary` nor a reason-code name. In the script text: `export const GROUND_PREFIX_MAX_STEPS` must occur exactly once; the script must contain `GROUND_PREFIX_INVALID` and `GROUND_PREFIX_FAILED`; the text between `async function runGround(` and `async function runGroundGuarded(` must contain `replayGroundingPrefix(` and `groundSnapshotFileName(`, and the first `requireRunIgnore(` must precede the first `replayGroundingPrefix(`, which must precede the first `waitForStableSnapshot(` (a section that cannot be located is itself a finding); the text between `export function precheckGroundedSteps(` and `export function summarizeEntries(` must contain `interactionHistory(` and `isPostInteractionSnapshot(`; the text between `function loadGroundingSnapshots(` and `async function executeCase(` must contain `isPostInteractionSnapshot(`; the exported usage line of the `ground` mode must contain `--prefix`. Behavior pins through the imported helpers: `parseGroundPrefix` accepts a one-click prefix and refuses a selector step, a step with a `{{x}}` binding, an `expect_visible` step, a prefix of `GROUND_PREFIX_MAX_STEPS + 1` steps and a `goto` alone; `groundSnapshotFileName('r', 's', null)` is `r--s.snapshot.json` and differs from `groundSnapshotFileName('r', 's', <a key>)`; and, with a plain snapshot and a schema-2 snapshot built through `groundingStepKey` and `groundingPrefixKey`, `precheckGroundedSteps` grounds a step after the interaction only when the post-interaction snapshot is present, still grounds the interaction itself and a step before it from the plain snapshot, and never grounds an element that only the post-interaction snapshot lists for a step before the interaction. In the command text: it must contain `--prefix`, `GROUND_PREFIX_FAILED`, `GROUND_PREFIX_INVALID`, `Grounding after an interaction.` and `at most ${GROUND_PREFIX_MAX_STEPS} steps`.
  4. Every finding of these rules names the token, helper or marker it checks (the order finding names `replayGroundingPrefix(`), and a null `scriptText` or `commandText` stays the single missing-file finding it is today: the new rules never throw on a null input.
  5. `runQaRunContractCheck` passes `requirePrefix: true` beside the four existing flags. No other caller changes. Add no write call and no new registered check, and no new `// GUARD-SITE`-style marker text.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:242-246` (the flag beside `requireVocabulary` in the signature and the JSDoc type), `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:283-305` (the script-text rules and the section markers the new block reuses) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:464-471` (the doc tokens and numbers that follow exported constants).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { checkQaRunContract, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  import { GROUND_PREFIX_MAX_STEPS } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const script = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8").replace(/\r\n/g, "\n");
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const input = (o = {}) => ({ scriptText: script, commandText: doc, results: [], requirePrefix: true, ...o });
  const clean = checkQaRunContract(input());
  if (!clean.ok) fail("the real runner and doc must satisfy the prefix rules: " + JSON.stringify(clean.findings));
  const flagged = (label, r, token) => { if (r.ok || !r.findings.some((f) => f.message.startsWith("prefix:") && f.message.includes(token))) fail(label + " was not flagged naming " + token + ": " + JSON.stringify(r.findings)); };
  const without = (src, token) => { if (!src.includes(token)) fail("the mutation token is absent from the real text: " + token); return src.split(token).join("ZZ_REMOVED"); };
  const once = (src, anchor) => { const n = src.split(anchor).length - 1; if (n !== 1) fail("a section marker must occur exactly once, found " + n + ": " + anchor); return anchor; };

  // Doc tokens, one finding each, naming the token; the cap follows the exported constant.
  for (const token of ["--prefix", "GROUND_PREFIX_FAILED", "GROUND_PREFIX_INVALID", "Grounding after an interaction."]) {
    flagged("a doc without " + token, checkQaRunContract(input({ commandText: without(doc, token) })), token);
  }
  const steps = "at most " + GROUND_PREFIX_MAX_STEPS + " steps";
  flagged("a doc whose cap disagrees", checkQaRunContract(input({ commandText: without(doc, steps) })), steps);

  // Script tokens.
  flagged("a script without the cap constant", checkQaRunContract(input({ scriptText: without(script, once(script, "export const GROUND_PREFIX_MAX_STEPS")) })), "GROUND_PREFIX_MAX_STEPS");
  for (const token of ["GROUND_PREFIX_INVALID", "GROUND_PREFIX_FAILED"]) {
    flagged("a script without " + token, checkQaRunContract(input({ scriptText: without(script, token) })), token);
  }

  // Section-limited mutations, built from the real text (each marker is asserted to occur exactly once).
  // RELAY-FIRST-MATCH-INTENDED: every marker below is asserted unique by once(), so indexOf and the slices are unambiguous.
  const gStart = script.indexOf(once(script, "async function runGround("));
  const gEnd = script.indexOf(once(script, "async function runGroundGuarded("));
  if (!(gStart < gEnd)) fail("the ground section markers are not in the expected order");
  const ground = script.slice(gStart, gEnd);
  const late = ground.split("replayGroundingPrefix(").join("renamedReplay(") + "\n// replayGroundingPrefix(\n";
  flagged("a replay that moved behind the snapshot wait", checkQaRunContract(input({ scriptText: script.slice(0, gStart) + late + script.slice(gEnd) })), "replayGroundingPrefix(");
  const unnamed = ground.split("groundSnapshotFileName(").join("renamedName(");
  flagged("a ground mode that no longer names the file through the helper", checkQaRunContract(input({ scriptText: script.slice(0, gStart) + unnamed + script.slice(gEnd) })), "groundSnapshotFileName(");
  const pStart = script.indexOf(once(script, "export function precheckGroundedSteps("));
  const pEnd = script.indexOf(once(script, "export function summarizeEntries("));
  if (!(pStart < pEnd)) fail("the precheck section markers are not in the expected order");
  const pre = script.slice(pStart, pEnd).split("interactionHistory(").join("renamedHistory(");
  flagged("a check that no longer reads the interaction history", checkQaRunContract(input({ scriptText: script.slice(0, pStart) + pre + script.slice(pEnd) })), "interactionHistory(");
  const lStart = script.indexOf(once(script, "function loadGroundingSnapshots("));
  const lEnd = script.indexOf(once(script, "async function executeCase("));
  if (!(lStart < lEnd)) fail("the loader section markers are not in the expected order");
  const loader = script.slice(lStart, lEnd).split("isPostInteractionSnapshot(").join("renamedGate(");
  flagged("a loader that no longer accepts the post-interaction kind", checkQaRunContract(input({ scriptText: script.slice(0, lStart) + loader + script.slice(lEnd) })), "isPostInteractionSnapshot(");

  // A caller that does not opt in sees none of the new rules.
  const quiet = checkQaRunContract(input({ requirePrefix: false, commandText: without(doc, "--prefix"), scriptText: without(script, "GROUND_PREFIX_FAILED") }));
  if (quiet.findings.some((f) => f.message.startsWith("prefix:"))) fail("the prefix rules leaked into a caller that did not opt in: " + JSON.stringify(quiet.findings));
  // A null input is a missing-file finding, never a throw.
  let nulls;
  try { nulls = checkQaRunContract({ scriptText: null, commandText: null, results: [], requirePrefix: true }); } catch (e) { fail("a null input threw: " + e.message); }
  if (nulls.ok) fail("null inputs must be findings");
  const real = runQaRunContractCheck();
  if (!real.ok) fail("the real-tree contract failed: " + JSON.stringify(real.findings, null, 2));
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
  ```
  Before this task the new flag is ignored, so every `flagged(...)` assertion exits non-zero. Every mutation is built from the real script or doc text with a token asserted to be present, and the section markers are asserted unique. The behavior pins go through the imported helpers, so they cannot be mutated through text; the same behaviors are asserted directly by Tasks 1 to 3. The four existing test files run unchanged and prove the `false` default and that no other flag's block moved.

## Validation Commands

The plan writer has no shell tool: every command below, and every per-task `VALIDATE` above, was derived by reading the current tree, not executed.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
node --check scripts/validate/checks/auth-secrecy.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
# The diff base for this phase is the tree recorded after Phase 4 (single-argument form: working tree against the tree object).
BASE=7ab2bc865e8bfe1be5652e89a265d9df91bb9f09
git cat-file -e "${BASE}^{tree}"
# The runner keeps the exact outcome vocabulary and the same eight plan-facing codes, the usage line names the new flag,
# and the extended checks hold on the real tree.
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
import { runAuthLocalGuardSitesCheck } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
import { OUTCOMES, REASON_CATALOGUE, USAGE, GROUND_PREFIX_MAX_STEPS } from "./plugins/relay/scripts/qa-run.mjs";
const fail = (m) => { console.error(m); process.exit(1); };
if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") fail("OUTCOMES changed");
const want = ["EXTERNAL_CHANNEL", "PARTIAL_REMAINDER", "PRODUCT_DEFECT", "STATE_UNCONFIRMED", "STEP_UNGROUNDED", "UNGROUNDABLE_AFTER_INTERACTION", "VISUAL_JUDGEMENT", "VOCABULARY_GAP"];
if (Object.keys(REASON_CATALOGUE).sort().join(",") !== want.join(",")) fail("the plan-facing catalogue changed: " + Object.keys(REASON_CATALOGUE).sort().join(","));
if (!USAGE.includes("[--prefix <json>]")) fail("the usage text does not name the --prefix flag");
if (GROUND_PREFIX_MAX_STEPS !== 5) fail("the prefix cap changed: " + GROUND_PREFIX_MAX_STEPS);
for (const r of [runQaRunContractCheck(), runAuthSecrecyCheck(), runAuthLocalGuardSitesCheck()]) if (!r.ok) fail(r.name + ": " + JSON.stringify(r.findings, null, 2));
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
# Scope: apart from the PRPs/ pipeline artifacts, docs/ (the implement-time docs-sync pass owns docs/) and test files
# (authored by the test pair, never by the Implementer), only this phase's four files may differ from the base tree.
allowed="plugins/relay/commands/relay-qa-run.md
plugins/relay/resources/redaction-policy.md
plugins/relay/scripts/qa-run.mjs
scripts/validate/checks/qa-run-contract.mjs"
changed="$(git diff --name-only "$BASE" -- . ':(exclude)PRPs' ':(exclude)docs' ':(exclude)*.test.mjs' | sort)"
extra="$(comm -13 <(printf '%s\n' "$allowed" | sort) <(printf '%s\n' "$changed") | sed '/^$/d')"
if [ -n "$extra" ]; then
  echo "FAIL: a file outside this phase's scope changed:"; printf '%s\n' "$extra"; exit 1
else
  echo "PASS: only the four planned files changed"
fi
# The documentation site and the two mirrored governance files are out of scope for this phase.
mirrored="$(git diff --name-only "$BASE" -- documentation docs/decisions.md docs/anti-patterns.md)"
if [ -n "$mirrored" ]; then
  echo "FAIL: documentation or a mirrored governance file changed:"; printf '%s\n' "$mirrored"; exit 1
else
  echo "PASS: documentation and mirrored governance files untouched"
fi
# The retired per-run host flag must not reappear in the two files the guard-site check lists.
if grep -nF -e "--local-host" plugins/relay/commands/relay-qa-run.md plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: --local-host appeared (forbidden by the auth-local-guard-sites check)"; exit 1
else
  echo "PASS: no --local-host"
fi
# No forbidden .claude/PRPs reference introduced by this phase's four files outside the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- plugins/relay/scripts/qa-run.mjs plugins/relay/resources/redaction-policy.md plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# This host has orphaned git fsmonitor daemons that stall git-backed tests; keep the environment below on every corpus run.
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
# The full static suite must still register and pass 28 checks (the summary line is printed by scripts/validate/index.mjs).
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)" || { printf '%s\n' "$out"; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
# The whole corpus, glob quoted (about 280 s on the baseline of 1997 tests). This design makes no existing assertion stale
# (see Notes), so nothing is excluded. If the test pair finds one this analysis missed, exclude exactly those tests with
# --test-skip-pattern (never --test-name-pattern with a negative lookahead).
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-11):** given case 20 and a prefix of one grounded `click` on `button "Não concluídas"`, `ground` run with `--prefix` replays the click with the role's session through the local-only guard and takes the stable snapshot afterwards, and the expanded rows appear among its entries; the file is written through the single write helper under `grounding/`.
- **AC-A2 (PRD AC-11):** given a prefix step that does not match exactly one element (zero or several at the moment it is replayed) or that cannot be performed, `ground` halts `GROUND_PREFIX_FAILED`, exits non-zero, writes no snapshot and prints no `GROUNDED:` line, and the stderr line names the step position and a count, never a locator or a value.
- **AC-A3 (PRD AC-11):** the prefix accepts only `goto`, `click` and `fill` steps (at most 5, each by role and name or by text, never a `selector`, no `{{name}}` binding, a `fill` value of at most 200 characters, at least one `click` or `fill`); anything else exits 2 with `GROUND_PREFIX_INVALID` and the usage text, and writes nothing.
- **AC-A4 (PRD AC-15):** a route or a prefix `goto` path that leaves the guard-approved origin halts `FAILED_NON_LOCAL_TARGET` before any request, and a navigation a click starts toward a non-local host is aborted by the context route; `qa-run.mjs` keeps exactly one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(` and no static sibling import, and `auth-local-guard-sites` still passes with no new entry (the existing guard call covers the replay).
- **AC-A5 (PRD AC-11):** a post-interaction snapshot has its own file name and schema, so it cannot overwrite or be taken for the plain snapshot of the same route and role; a locator step that follows the case's own `goto`, `click` and `fill` steps is grounded against the snapshot whose prefix equals them, and a step before them, a step with no matching snapshot and every plan with only plain snapshots behave exactly as before.
- **AC-A6 (PRD AC-18):** `relay-qa-run.md` documents the mode (the `--prefix` flag, its restrictions, both halts, the file, the consumption rule, the plain statement of the side-effect risk, the Git Bash note retained), the exported usage line names `[--prefix <json>]`, and every pinned token follows the exported constants.
- **AC-A7 (PRD AC-10, AC-18):** the carry-over fixes are in the same doc edit and change no runner behavior: a navigating `click` does not reset the absence anchor (DQ18), `aria-checked="mixed"` blocks while a native `indeterminate` checkbox is not detected (DQ19), and the `expect_value` paragraph states its 5-second re-read window (DQ20).
- **AC-A8 (PRD AC-17, AC-14):** `qa-run-contract` is extended behind the opt-in `requirePrefix` flag (the registered count stays 28), `npm run validate` passes all 28 checks and the corpus is green with no existing assertion edited by the Implementer; `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-phase content, and `OUTCOMES` and the plan-facing reason-code catalogue are unchanged.
- **AC-A9 (PRD AC-5, AC-11):** the post-interaction snapshot is ignored by git and proven before anything is written (the proof precedes the browser, as for a plain snapshot), passes the same withholding as any snapshot, a prefix locator that names a withheld value is refused before the browser starts, and a typed `fill` value is recorded only as a SHA-256 digest: it reaches no run file and no terminal stream, and `redaction-policy.md` states the same.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A replayed `click` or `fill` changes the state of the local application at plan time (a submit, a delete, a toggle) and `ground` has no undo | M | H | Only `goto`, `click` and `fill`, at most 5 steps, each matching exactly one element, behind the guard and the host-abort route; the doc states the risk in plain words and tells the planner to prefix only what the case itself performs before the element it needs and never a step whose manual wording submits, saves, deletes or sends; the effect is limited to the local environment the guard approved; the residual risk is accepted and recorded |
| The stable wait (two equal snapshots one second apart) certifies a page that is still loading the response to the click (a spinner), so the rows are missing from the snapshot | M | M | The planner reads the file and plans only from entries with `matches` exactly 1; a missing element ends in `UNGROUNDABLE_AFTER_INTERACTION`, never in a guess; the doc says the line can be run once more; the live probe records the real behavior with a 400 ms and a 1500 ms reveal; the Phase 8 dogfood recalibrates the interval |
| A post-interaction snapshot is mistaken for the plain one (or overwrites it), so a step before the interaction is grounded against a state it never sees | L | H | A different file name, `schema_version: 2` and a `prefix` field; a plain lookup excludes post-interaction files regardless of file order; a post-interaction file is used only on key equality of the case's own history; the plain snapshot keeps its exact five keys and name (pinned by existing tests) |
| A typed value or personal data is persisted in a snapshot or a stream | M | H | The recorded prefix holds locators and a SHA-256 digest, never the value; a prefix locator that names a withheld value is refused before the browser starts; entries pass the same partition and structural redaction; the file lives under the ignored, proven `grounding/`; the VALIDATE scans every run file and both streams for the typed value and the session value; the page text the application renders in response is page text like any other (stated in the policy) |
| `ground` runs on the state the local application holds now, not on the case's declared seed, so the expanded group is empty or differs from the run | M | M | Stated in the doc (`ground` runs no seed); the run-time exactly-one check still protects every acted-on locator; a case whose state differs fails or is refused at run time, never passed on a wrong grounding |
| An existing source-text anchor or doc pin is disturbed (the single `loadPlaywright(root, PLUGIN_ROOT);` literal, the first `ground` command and Git Bash note positions, a paragraph opening, an honesty bullet start, the four-finding pin of `requireGround`, the five-key plain schema) | M | H | The tasks list every pin; the new doc block sits after the "Personal data." paragraph outside both sliced ranges; the contract gets a new flag instead of an edited block; Task 4 and Level 2 compare the unchanged regions with the base tree and Level 3 runs the whole corpus |
| The prefix JSON is altered by the shell on the way in (Git Bash path conversion, a non-ASCII name under a code page, PowerShell quoting) | M | M | The documented line sets `MSYS_NO_PATHCONV=1`, and the doc example is checked live; a mangled argument exits 2 with `GROUND_PREFIX_INVALID` and writes nothing; the fallback is the `\uXXXX` JSON escape or declining the case, never a wrong snapshot |
| A key mismatch (a different `goto` path string, a different typed value) makes a valid post-interaction snapshot silently unused, and the planner sees only the plain refusal | M | L | The refusal carries a fixed hint when a post-interaction snapshot exists for the role and route; the doc says the prefix must be the case's own steps in the same order with the same values |
| `research-web` found no primary source that states whether the ARIA tree reflects the expanded state immediately after `click()` returns, and the `ariaSnapshot` single-evaluation finding comes from the main branch | M | L | Nothing here depends on that timing: the stable wait decides, and the live probe measures it on the installed version before the replay relies on it |
| The `VALIDATE` scripts were derived by reading, not executed | M | M | Each fails before the work for a stated reason, each drives the real code, and Level 3 runs the whole corpus; a defect found at implement time is a plan defect to record, not a reason to weaken the check |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework (several additionally run `node --test` over existing test files that this plan does not edit).
- **Derived by reading.** The plan writer has no shell tool: every `VALIDATE` command and every Level command was derived by reading the current tree, not executed. Tasks 1 to 3 fail before the work (the new exports do not exist, so the import fails), Task 4 fails before the work (the doc lacks the block and the fixes), Task 5 fails before the work (the bullet is absent) and Task 6 fails before the work (the flag is ignored, so every mutation goes unflagged). The Level 2 invariants pass on the unmodified tree by design, except the usage and cap lines, which are the new work.
- **What is verified by reading and what must be verified live.** Verified by reading the tree: `runGround` order (guard, route check, ignore proof, Playwright, table, session, launch, host-abort context, load, stable wait, partition, single write; `qa-run.mjs:3690-3790`); `ground` builds its context with `seedConfig: null` and never calls `prepareState`, so it runs no seed; `loadGroundingSnapshots` never uses the file name for matching and `precheckGroundedSteps` picks the first match by role and route, which sorted file order would let a `--after-` file win (`-` sorts before `.`); the run driver's resolver, attach wait and count rule; the exact test pins listed in the tasks. Verified by the `research-web` findings (Playwright reference, not pinned to the installed version): `click()` waits for actionability and for initiated navigations and nothing else, `ariaSnapshot()` evaluates once after the element is connected, and locator actions are strict (`https://playwright.dev/docs/api/class-locator`, `https://playwright.dev/docs/actionability`, `https://playwright.dev/docs/locators`). NOT verifiable by reading and verified live by the Implementer before Task 2 relies on them: the timing of the post-click snapshot, the argument encoding under Git Bash, `page.url()` after an SPA route change and after a full navigation, strictness on a two-match locator and `fill` on a role-and-name textbox.
- **Live probe (run before Task 2; record the output in the implementation report).** From the worktree root, the first command prints the Playwright version and probes the post-click snapshot timing, the final URL, strictness and `fill`; the second checks the argument encoding. They write nothing and need no run directory.

  ```bash
  node --input-type=module -e '
  import { createRequire } from "node:module";
  import { createServer } from "node:http";
  import { resolve } from "node:path";
  const req = createRequire(resolve("plugins/relay/scripts/visual/package.json"));
  const pw = req("playwright");
  console.log("playwright", req("playwright/package.json").version);
  const html = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
  const reveal = (ms) => html(`<button id="g" aria-expanded="false">Grupo</button><ul id="r" hidden><li>Item um</li></ul><script>document.getElementById("g").onclick=function(){var b=this;setTimeout(function(){document.getElementById("r").hidden=false;b.setAttribute("aria-expanded","true");},${ms});};</script>`);
  const pages = {
    "/sync": reveal(0),
    "/p400": reveal(400),
    "/p1500": reveal(1500),
    "/spa": html(`<button id="s">Rota</button><script>document.getElementById("s").onclick=function(){history.pushState({}, "", "/spa-route");document.body.insertAdjacentHTML("beforeend","<p>Rota nova</p>");};</script>`),
    "/link": html(`<a id="l" href="/dest">Ir</a>`),
    "/dest": html(`<h1>Destino</h1>`),
    "/twin": html(`<button>Gemeo</button><button>Gemeo</button>`),
    "/field": html(`<label for="f">Filtro</label><input id="f"><button id="a">Aplicar</button><p id="o"></p><script>document.getElementById("a").onclick=function(){document.getElementById("o").textContent="len "+document.getElementById("f").value.length;};</script>`),
  };
  const server = createServer((q, s) => { const p = String(q.url).split("?")[0]; s.writeHead(pages[p] ? 200 : 404, { "content-type": "text/html; charset=utf-8" }); s.end(pages[p] || "nf"); });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await pw.chromium.launch({ headless: true });
  const out = (label, v) => console.log(label, "=>", JSON.stringify(v));
  try {
    const page = await (await browser.newContext()).newPage();
    const body = () => page.locator("body").ariaSnapshot();
    for (const path of ["/sync", "/p400", "/p1500"]) {
      await page.goto(base + path, { waitUntil: "load" });
      await page.getByRole("button", { name: "Grupo", exact: true }).click();
      const first = await body();
      await page.waitForTimeout(1000);
      const second = await body();
      await page.waitForTimeout(1200);
      const third = await body();
      out(path + " rows listed at click-return, +1s, +2.2s", [first.includes("Item um"), second.includes("Item um"), third.includes("Item um")]);
      out(path + " first and second snapshot equal", first === second);
    }
    await page.goto(base + "/spa", { waitUntil: "load" });
    await page.getByRole("button", { name: "Rota", exact: true }).click();
    out("url after pushState", new URL(page.url()).pathname);
    await page.goto(base + "/link", { waitUntil: "load" });
    await page.getByRole("link", { name: "Ir", exact: true }).click();
    await page.waitForLoadState("load");
    out("url after a full navigation", new URL(page.url()).pathname);
    await page.goto(base + "/twin", { waitUntil: "load" });
    const twin = page.getByRole("button", { name: "Gemeo", exact: true });
    out("twin count", await twin.count());
    try { await twin.click({ timeout: 2000 }); out("twin click", "DID NOT THROW"); } catch (e) { out("twin click throws", String(e.message).split("\n")[0]); }
    await page.goto(base + "/field", { waitUntil: "load" });
    await page.getByRole("textbox", { name: "Filtro", exact: true }).fill("abc-1234");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    out("fill reached the page", await page.locator("#o").textContent());
  } finally {
    await browser.close();
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
  }
  '
  MSYS_NO_PATHCONV=1 node -e 'console.log(JSON.stringify(process.argv[1]))' '[{"action":"goto","path":"/tarefas"},{"action":"click","role":"button","name":"Não concluídas"}]'
  ```

  Expected: `/sync` lists the row by `+1s` and `+2.2s` (`[true,true,true]`, or `[false,true,true]` when the zero-delay timer had not fired yet at click-return; both are fine); `/p400` does not list it at click-return and lists it by `+1s` (`[false,true,true]`, not equal); `/p1500` does not list it at click-return and at `+1s` (`[false,false,true]`, and the first and second snapshots ARE equal, which is the stable wait's known blind spot: a response slower than one interval is missed, and this is the documented limitation, not a defect to hide). The URL after `pushState` is `/spa-route` and after the link click `/dest`. The twin count is `2` and its `click` throws a strict-mode error. The field shows `len 8`. The last command prints the JSON string of the argument exactly as typed, with `ã` and `í` intact. If the argument arrives altered, write the example name with `ã` and `í` JSON escapes in the doc and say so in one sentence; if `page.url()` after a navigation does not give the pathname above, `finalPageRoute` must be adjusted before Task 2 is finished; if a result differs in any other way, keep the fail-safe behavior (a halt, never a snapshot) and record the difference.
- **Design decisions, recorded with their rationale.**
  - **(a) The command-line surface is one inline JSON argument, `--prefix '<json array>'`.** Rejected: a file inside the run directory (the command doc says the command itself writes only `plan.json`, so a second planner-written file would amend a constraint that tests pin, and a prefix file would sit outside the ignored directories); a reference to a plan entry (`ground` runs BEFORE the plan entry is written, so it would force a plan-then-ground-then-rewrite loop and give `ground` a new read of `plan.json`). The inline form is stateless, visible in the planner transcript, mirrors the steps of the plan (the planner copies flat step objects) and fits the closed flag set (`parseGroundArgs`, the one usage line, the contract pins on the six flags). The doc runs the command through the Bash tool (Git Bash on Windows): single quotes keep the JSON intact and `MSYS_NO_PATHCONV=1` is already the documented prefix for a leading-slash argument; the live probe checks the non-ASCII name, and a mangled argument exits 2 and writes nothing. The usage text is one line (`GROUND_USAGE_LINE`) plus a third explanatory line, and none of the six existing flag substrings moves, so the `requireGround` rules and the usage tests keep passing.
  - **(b) File name, schema and lookup.** The plain snapshot keeps its name `<role>--<route slug>.snapshot.json` and its exact five keys (a test pins them). A post-interaction snapshot is `<role>--<route slug>--after-<8 hex of the SHA-256 of the canonical prefix key>.snapshot.json`, with `schema_version: 2` and a `prefix` array whose first element is the raw `--route` as a `goto` and whose other elements are the normalized replayed steps (locators, and `value_sha256` for a `fill`). Different prefixes on one route and role get different files, the same prefix re-grounds into the same file, and an older runner ignores a schema-2 file instead of mistaking it for the plain one. The route field is the path the page is on after the replay (`page.url()` after the stable wait), so a click that navigates is matched when the case declares the same navigation with `expect_url`, exactly as plain steps already follow `expect_url`; a navigating click with no `expect_url` simply finds no matching file and falls back to today's behavior. `precheckGroundedSteps` computes, for each locator step, the case's own `goto`, `click` and `fill` steps before it (the history, normalized the same way) and uses a post-interaction snapshot only on key equality of role, route and history; otherwise it takes the first plain snapshot of the role and route, so a step before or without a prefix, and every plan written before this phase, behave byte for byte as before. The click-then-assert plans of `qa-run-absence-state.test.mjs` (a click, then an assertion on the same route grounded on the plain snapshot) are the regression proof that the fallback is unchanged.
  - **(c) What a prefix may carry, and what it can do.** A `{{name}}` binding is refused: `ground` runs before any seed, so a capture is unbound and would be typed as literal braces. A `fill` value is a string of at most 200 characters; it must come from the report's own steps. That rule can be enforced only when the case is run (`ground` runs before the plan entry exists), so it is enforced there, as a refusal before any side effect, whenever a post-interaction snapshot is consumed; at plan time the control is the honesty rule in the doc and the cap. This is the honest limit: an invented value would already have been typed into the local page once. The cap is 5 steps (`GROUND_PREFIX_MAX_STEPS`, exported and pinned in the doc by the contract). What the replay can do: a click may submit a form, delete a row or flip a setting, a fill may populate a draft, and `ground` has no undo and cannot tell harmless from destructive. The doc says so plainly, tells the planner to prefix only what the case performs before the element it needs and never a submitting step, and says what the operator must know: the effect is limited to the local environment the guard approved, `ground` runs no seed, and a later `ground` replays from a fresh page load with whatever server-side state the earlier one left.
  - **(d) Interactions.** The ignore proof is unchanged and still precedes the browser: the post-interaction file is written under `grounding/`, which the proven rule `grounding/` already covers, and the contract pins that the replay comes after the proof and before the stable wait. The stability wait is reused as is, after the last replayed step (no extra wait between steps, mirroring the run driver, whose own step waits are the attach wait and the count). Redaction: the entries pass `partitionSnapshotEntries` and `writeRunFile` like any snapshot; a prefix locator that names a withheld value is refused before the browser starts (the same rule that makes a withheld entry unusable as a locator); the recorded prefix holds locators already in the tracked plan and a digest instead of any typed value. The page text the application renders in response, including an echo of the typed value, is page text like any other and is under the same withholding, which the policy bullet says.
  - **Reasons and codes.** `GROUND_PREFIX_INVALID` (exit 2, with the usage text) and `GROUND_PREFIX_FAILED` (a `Halt`, exit 1) are `ground` halts like `GROUND_UNSTABLE`: no new reason code, no new outcome, nothing added to `REASON_CATALOGUE`. A failed prefix needs no plan code, because the case is declined with the existing `UNGROUNDABLE_AFTER_INTERACTION`.
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A9).** AC-A1: a real browser run of `ground --prefix` against a loopback page whose group shows its rows only after a click and only to the role cookie (the shape of this plan's Task 2 VALIDATE), asserting the rows among the entries, the role session used (an anonymous control halts), and the file shape; the `GROUNDED:` line shape. AC-A2: a missing element, an ambiguous element, a click that throws and a goto that fails each halt `GROUND_PREFIX_FAILED` with exit 1, no file, no `GROUNDED:` line, and a directory listing equal to the one before; the stderr line carries no locator name. AC-A3: `parseGroundPrefix` as a table (every accepted and refused shape of this plan's Task 1 VALIDATE, hostile JSON totality, no value or binding name in a reason) and the exit-2 command line with nothing written. AC-A4: `replayGroundingPrefix` with a fake page (an absolute path is never loaded, an order of calls), a prefix path that leaves the origin halts `FAILED_NON_LOCAL_TARGET` before any request, the one-marker and one-write counts. AC-A5: the file name and schema (plain bytes and keys untouched after a prefix run, two prefixes two files, the same prefix one file), the lookup table of this plan's Task 3 VALIDATE (before the interaction, after, another prefix, another role, a selector click, `expect_url` route, file order independence), and the fixed hint. AC-A6: the doc block, the usage line with `--prefix`, the cap in the doc following the constant, the Git Bash note and first command position unchanged. AC-A7: the three carry-over sentences, and the `for up to 5 seconds` token on a physical line of the `expect_value` paragraph. AC-A8: the `requirePrefix` rules (one finding per missing token, the order mutation, the three section mutations, silent without the flag, null inputs, the real tree clean) and the frozen-surface byte-identity. AC-A9: no typed value and no session value in any run file or stream, the digest equals the SHA-256 of the value, a withheld locator is refused before the browser, the file is covered by the proven ignore (a real git work tree fixture, `git check-ignore -q` exit 0 for the new name), and the policy bullet.
- **Test-pair follow-up, existing assertions: none stale.** The design was chosen so that no existing assertion goes stale, after reading the corpus (`research-codebase` surveyed every `qa-run*` test, every check that reads the doc or the runner and the documentation pages; the plan writer read the pinned tests directly). `qa-run-stable-grounding.test.mjs` 344-364 (the usage line keeps all six flag substrings, `--help` prints the exported `USAGE`, a bare `ground` and a rewritten route print the ground usage with `MSYS_NO_PATHCONV=1` and write nothing), 386-398 (the first `qa-run.mjs" ground --root` and the first backticked `MSYS_NO_PATHCONV=1` stay the earliest occurrences, less than 1500 characters apart, and the `Git Bash`, `leading-slash`, `PowerShell` and `POSIX` words stay near), 400-428 (the ground-section regexes: the stability sentences, the halts sentence and the declining-entry sentences are untouched), 456-519 (`requireGround` is not edited, so the four-finding pin holds) and 478-484 (no `waitForLoadState(` in the ground slice); `qa-run-ui-grounding.test.mjs` 548-566 (the argument refusals, none of which carries a `--prefix`), 572-602 (the plain snapshot keeps its five keys, its name and its `GROUNDED:` line) and 724-738 (the first role-and-name and text examples and the exactly-one sentence); `qa-run-privacy-pins.test.mjs` 233-263 (the single `loadPlaywright(root, PLUGIN_ROOT);` literal and the proof before it) and 289-311 (the personal-data and constraint sentences); `qa-run-evidence-privacy.test.mjs` 466-555 (the proof before the session, `ROLE_UNDECLARED` right after it, nothing written on a halt: every new refusal comes after the proof and the session); `qa-run-vocabulary-pins.test.mjs` 331-366 (the four paragraph openings and the honesty bullets stay unique); `qa-run-absence-state.test.mjs`, `qa-run-input-value.test.mjs` and `qa-run-ui-grounding.test.mjs` (hand-written schema-1 snapshots and the 4-argument `precheckGroundedSteps` call keep working, including click-then-assert plans that ground on the plain snapshot); `qa-run-classification.test.mjs` 506-584 (the tables, the omit phrases and every `json` fence: the doc gains none and loses none); `qa-run-contract.test.mjs` (every anchor and count; the new rules are behind a flag); `auth-local-guard-sites` (no site is added). If the Implementer or the test pair finds an assertion this analysis missed, it is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer, and the Level 3 command then excludes exactly those tests with `--test-skip-pattern`.
- **Ordering.** Task 1 is pure and independent (it needs no browser). Task 2 and Task 3 edit disjoint regions of `qa-run.mjs` (the ground mode and the two helpers after `parseGroundArgs`; the loader and the plan-time check) and need only the helpers of Task 1. Task 4 (doc) depends on the names and semantics of Tasks 1 to 3, and its pinned numbers follow Task 1's constants. Task 5 is independent prose. Task 6 reads the runner and the doc (Tasks 1 to 4).
- **Research.** `research-codebase` ran twice: the ground mode, the usage text, the snapshot file name and schema, the consumers and the run-driver locator code with the full test-impact survey; and a whole-validate-directory survey of every check and test that reads the command doc (presence rules, the first-match mode-list rule, the classification tables, the single-line bullets of the per-test-resolution test, the `--prefix` rule of `plugin-root-resolvable`). `research-web` ran one round on Playwright click and snapshot timing, strictness and route abort (its scope cap was reached, so the post-click timing is verified live). The plan writer read the runner end to end, the contract check, the doc and the tests quoted above. Not read by any round: the `documentation/` pages (Phase 7 owns them) and `docs/api-reference.md` (the `docs_sync` pass owns `docs/`); `auth-kit-minted-authoring.test.mjs` and `docs-sync-phase4.test.mjs` were not opened by the survey, so a ground-related site assertion there is not ruled out and Level 3 is what proves it.
- **Scope of docs.** `docs/api-reference.md`, `docs/domain/flows.md`, `docs/domain/glossary.md` and the `documentation/` pages (`reference/commands.html`, `reference/scripts.html`, `reference/redaction-policy.html`, `changelog.html`) are not edited here: the `docs_sync` pass owns `docs/` at implement time and the site pages belong to Phase 7 per `documentation/AGENTS.md`.

*Generated: 2026-10-11*
*Approved: 2026-10-11*
*Implemented: 2026-10-12*
*Status: IMPLEMENTED*
