# Feature: Network assertion, bounded re-mint and refresh role set (Phase 6 of qa-runner-grounding-vocabulary-v2)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the step vocabulary and per-step results of `qa-run.mjs`, the `relay-qa-run.md` planning doc, the `relay-auth-scripts.md` command doc, the `qa-run-contract` validation check, `redaction-policy.md`); secret and personal-data handling in run evidence (the URL, headers, cookie and body of an observed request are leak surfaces); a request-observing site in the browser driver and a second invocation of the kit login script, both under the local-only guard; extension of the closed step vocabulary of a standalone command
- Decisions found:
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log "Re-mint placement (F5)": a single runner-side retry after `FAILED_PROBE_MARKER_ABSENT` on a fresh mint, never a retry in the login template, because a template change bumps `KIT_TEMPLATE_ID` and makes every project's scripts stale until `--refresh`
  - Same PRD, Architecture Notes "New request sites reuse the loaded guard" (no second `// GUARD-SITE`, because `qa-run-contract` requires exactly one) and "F5 is a runner-side retry"
  - Same PRD, Decisions Log "Phase 6 optional": the Should and Could items may be descoped only by a recorded operator decision; none is recorded, so all three items are planned, and the Could item is kept to the smallest statement AC-19 allows
  - Same PRD, Decisions Log "Absence assertion anchor" and Technical Risks row 1 (an absence or state assertion passes vacuously): the reasoning the zero-count rule of `expect_requests` reuses
  - Same PRD, Decisions Log "Validation checks" (extend `qa-run-contract`, the count stays 28), "Frozen surfaces" (the review-loop files, `capture.mjs` and `/relay-qa-report` byte-identical, AC-14) and "Deferred findings" (PS20, `--refresh` and `maxAgeMinutes`, stays a follow-up: only the F7 role-set statement is in scope here)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the local-only guard is permanent, the outcome vocabulary is a closed set, secrets never reach reports, the human gate stays open
  - [2026-04-19] "Secret redaction policy for Test Runner reports" and [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`"
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen
  - [2026-07-09] every `## Validation Commands` entry and per-task `VALIDATE` must carry real exit-code semantics; [2026-07-10] R-X strict: the Implementer authors zero test files and test edits go through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a network assertion observes headers, a body, cookies and a query string, and none of them may reach a file, a reason or a terminal stream; the stderr and stdout of a login script are never relayed
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing assertion is made stale by this design (see `## Notes`); one the test pair finds that this analysis missed is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - "Sleeping, retrying, or backing off against a Figma MCP quota error" does not apply and is named so the reader does not conflate it: the re-mint is one bounded re-run of a local login script after a named probe halt, never a back-off loop and never against a quota
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - Command versus script separation: the planning doc teaches the step and the retry; the script validates, guards, observes, redacts and writes
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/` and is written only through `writeRunFile`
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`): the observed requests run inside the existing host-abort context route, the second login run is the same spawn behind the guard at the head of `run` and `ground` and the script's own guard, and no entry is added
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, here with the tree object recorded after Phase 5
  - `qa-run-contract` invariants stay true: the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`, one `export const REASON_CATALOGUE`, no static sibling import
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` — Implementation Phases row 6: "Network assertion, bounded re-mint and refresh role set" — Goal: the Should and Could items, if the operator keeps them — Success signal: a fixture that issues one `POST` passes `count: 1`; a first mint failure followed by a success yields a session; a second failure stays blocked with the same code.

## Summary

Three independent additions to the QA runner. (1) `expect_requests`, a flat browser step `{ "action": "expect_requests", "method", "url_contains", "count" }`: a request listener, attached to the case's page only when the plan carries the step, logs for every request nothing but its method, host and path and whether the guard approves its host; the step waits 2 seconds, counts the requests of its window (from the start of the case's last `goto`, `click` or `fill` step) whose method and path match, passes only on an exact count, and blocks `FAILED_NON_LOCAL_TARGET` when a matching request targeted a host the guard does not approve. It is valid only after an interaction in the same case, and a count of 0 needs the positive anchor an absence step needs, so it cannot pass on a page that never rendered. Its evidence file records method, host, path and counts, never a query string, a header, a cookie, a token or a body. (2) A bounded re-mint: when a `minted` role's kit login script halts `FAILED_PROBE_MARKER_ABSENT` (a halt the template emits only right after a fresh mint), `obtainSession` runs the same script once more with `--force`, at most once per role per run; a proven second attempt yields the session and a second halt leaves the role blocked with the code of that halt (the same code when the proof fails again). The login template and `KIT_TEMPLATE_ID` are byte-identical. (3) One paragraph in `relay-auth-scripts.md` stating, without changing any behavior, which roles a run selects (the roles of the model's matrix, narrowed by `--role`) and which scripts `--refresh` regenerates (only those that already exist), so that a kit narrower than the matrix is refreshed for its own roles only. The doc, one policy bullet and an opt-in `requireNetwork` rule set of `qa-run-contract` follow. No test file is touched by the Implementer.

## User Story

As the operator of relay's human validation gate
I want the runner to count the requests an action issues and to re-mint a session once when a cold application defeats the first proof
So that the S-6 case reaches a verdict instead of `needs-human`, and a cold dev server no longer costs a whole run of blocked cases

## Problem Statement

`/relay-qa-run` has no way to assert how many requests an action issues, so a case such as S-6 ("click Salvar, exactly one POST to /avatar") can only be declined `VOCABULARY_GAP`, and it is the only reachable case that counts requests. Separately, the kit login script runs its mint command once and a post-mint proof failure halts `FAILED_PROBE_MARKER_ABSENT` with no retry; `obtainSession` then caches the failed result for the whole run, so one cold dev server blocks every case of that role. Finally, `/relay-auth-scripts --refresh` iterates the roles of the approved model's matrix, and nothing states which roles a refresh covers, so a kit narrower than the matrix is refreshed ambiguously.

## Solution Statement

Runner side, planning-doc side, one policy bullet, one command-doc statement and the contract check only. A closed validator branch and two pure helpers (`classifyObservedRequest`, `evaluateRequestWindow`) define what is observed and decided before any browser exists; a listener (`observeRequests`) that reads only `method()` and `url()` feeds them; a new explicit branch in the browser driver runs the step, writes the evidence through the one write helper and ends the case on the first non-pass, and that branch is followed by a terminal `else` that makes a validated step with no branch block instead of passing silently. The re-mint extracts the one login spawn into `runLoginScript` and decides the retry in the pure `shouldRemintLogin`, capped by an exported constant. `relay-qa-run.md` documents the step with a marked literal example and the retry; `redaction-policy.md` gains one bullet; `relay-auth-scripts.md` gains one paragraph; `qa-run-contract` gains `requireNetwork`.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/resources/redaction-policy.md`; `plugins/relay/commands/relay-auth-scripts.md`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | `Depends` is `4` (`complete`); shares `lane:qa-run` with phases 1 to 5, so it runs serially after them (all `complete`); Phase 7 (`Depends` 3, 5, 6) follows and owns every `documentation/` page |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` lines 112-113, 115 and 117-119 (AC-12, AC-13, AC-15, AC-17, AC-18, AC-19), 163-166 and 171 (Core Capabilities, MVP Scope), 201 and 205-206 (Architecture Notes), 211-219 (Technical Risks), 232 (row 6), 265-268 (Phase Details), 298-302 (Decisions Log) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` | 112-113, 115, 117-119, 163-166, 171, 201, 205-206, 211-219, 232, 265-268, 298-302 | AC-12 (the step, its window, the guard-checked URLs and what is recorded), AC-13 (the single `--force` re-run and the byte-identical template), AC-15 (new sites stay local), AC-17 and AC-18 (suite green, count 28, literal doc examples), AC-19 (the role-set statement), the Should and Could rows, the two Architecture Notes, the Technical Risks, row 6, the Phase Details and the Decisions Log rows that bind this phase |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1085-1101 and 1189-1287 | the closed action lists and `stepRules`, whose browser `switch` ends in `default: unknown browser action` (so `expect_requests` is refused today) and whose `case` returns the expectation count |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1328-1357 | `validateSteps`: the per-entry sequence rules (the absence anchor) that the interaction and zero-count rules of `expect_requests` extend |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1531-1576 and 1616-1631 | `ASSERT_SETTLE_MS` and `settleAssertion` (the injectable `sleep` and `now` convention the new wait follows) and the end of `ariaExpandedOf` right before `precheckGroundedSteps`, where the new helper cluster is inserted |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2074-2078 and 2428-2549 | `writeEvidence` and `DRIVERS.browser`: the context, the host-abort route, the page, the per-step loop, the legacy `else if` chain with no terminal `else`, and the per-step evidence map |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2608-2611, 2705-2746 and 3393-3411 | `isMintedRole`, `obtainSession` (the one login spawn, the stderr code regex and the per-run cache) and the mapping of a session failure to a blocked case |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 1444-1459, 1514-1534 and 1579-1598 | read-only: `--force` skips the reuse check, the minted branch runs the guard then the mint command, and `FAILED_PROBE_MARKER_ABSENT` is emitted only by the post-login proof, so for a minted role it only ever follows a fresh mint (the reuse path maps an `expired` proof to a re-mint and never halts with it) |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 297-333, 628-661, 709-720 and 724-743 | the `expect_state` example and paragraph the new block follows, the honesty bullets the new bullet joins, the Phase B minted paragraph and the final output surface |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 263-267, 358-427, 633-640 and 742-757 | the opt-in flag signature, the vocabulary and prefix script rules whose shape `requireNetwork` copies, the doc-token rules and the real-tree entry point |
| P0 | `plugins/relay/resources/redaction-policy.md` | 244-257 | the `Post-interaction snapshots` bullet that the new bullet follows, and the section end |
| P0 | `plugins/relay/commands/relay-auth-scripts.md` | 61-66 and 220-240 | the `--refresh` argument bullet and the `--refresh` sentences the new paragraph follows |
| P1 | `scripts/validate/checks/qa-run-vocabulary-pins.test.mjs` | 79-108 and 284-382 | read-only: the `once`/`without` helpers, the section slices, the paragraph-start uniqueness rule, the honesty-bullet parser and the Input values bullet parser the doc and policy edits must keep unique |
| P1 | `scripts/validate/checks/qa-run-absence-state.test.mjs` | 58-106 | read-only: the real-runner conventions (absolute runner path, sandbox, hermetic git environment) and the pin that `POSITIVE_ASSERTION_ACTIONS` is exactly four members |
| P1 | `scripts/validate/checks/qa-run-minted-session.test.mjs` | 161-285 and 386-400 | read-only: the fixture project shape, the stub login script, the count helper and the "a role that is not minted is never called with `--force`" control the retry must keep passing |
| P1 | `scripts/validate/checks/qa-run-kit-hardening.test.mjs` | 184-238 and 406-427 | read-only: the only test that runs the real runner against a stub that halts `FAILED_PROBE_MARKER_ABSENT`; its role is `mechanism: 'api'`, so it must see exactly one spawn |
| P1 | `scripts/validate/checks/auth-kit-commands-hardening.test.mjs` | 148-171 | read-only: the contiguous substrings of the `--refresh` bullet and sentences the new paragraph must not split |
| P1 | `scripts/validate/checks/auth-scripts-command.test.mjs` | 90-117 and 195-205 | read-only: the whole-file bans (`design-spec`, `/relay-qa-run`, `relay-auth-setup`, `.claude/PRPs`, `--local-host`) and the written-file bullet |
| P1 | `PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md` | 1167-1455 | read-only: the Level 1 to 3 shape, the doc-task validation idiom and the contract-flag task this phase mirrors |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1085-1089
const HTTP_ACTIONS = ['request', 'query'];
const API_ORIGIN_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const BROWSER_ACTIONS = ['goto', 'click', 'fill', 'expect_visible', 'expect_text', 'expect_url', 'query', 'expect_value', 'expect_not_visible', 'expect_state'];
const API_HEADER_FORBIDDEN = ['host', 'content-length', 'cookie', 'transfer-encoding'];
const LOCATOR_ACTIONS = ['click', 'fill', 'expect_visible', 'expect_text', 'expect_value', 'expect_not_visible', 'expect_state'];
```
Copied by Task 1 (`'expect_requests'` is appended to `BROWSER_ACTIONS` only, which feeds the nested-form hint; it is NOT added to `LOCATOR_ACTIONS`, because the step names no element, and NOT added to `POSITIVE_ASSERTION_ACTIONS`, because a request count proves nothing rendered and `qa-run-absence-state.test.mjs:98-106` pins that set to exactly four members).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1255-1287
    switch (s.action) {
      case 'goto':
        if (!isStr(s.path)) return bad('goto needs a string path');
        break;
      case 'click':
        if (!isStr(s.selector)) return bad('click needs a string selector');
        break;
      case 'fill':
        if (!isStr(s.selector) || !isStr(s.value)) return bad('fill needs a string selector and value');
        break;
      case 'expect_visible':
        if (!isStr(s.selector)) return bad('expect_visible needs a string selector');
        expectations++;
        break;
      case 'expect_text':
        if (!isStr(s.selector) || !isStr(s.contains)) return bad('expect_text needs a string selector and contains');
        expectations++;
        break;
      case 'expect_url':
        if (!isStr(s.path)) return bad('expect_url needs a string path');
        expectations++;
        break;
      case 'expect_value':
      case 'expect_state':
        return bad(`${s.action} needs a role and a name`);
      case 'expect_not_visible':
        return bad('expect_not_visible needs a role and a name, or a text');
      default:
        return bad(`unknown browser action ${JSON.stringify(s.action)}`);
    }
  }
  return { expectations };
}
```
Copied by Task 1 (the new `case 'expect_requests':` sits before `default`, returns a fixed sentence through `bad(...)` and counts one expectation exactly like `expect_url`; a session key is already refused earlier in the same function at line 1234, and every locator key reaches this `case` because the action is not in `LOCATOR_ACTIONS`, so the closed key set is what refuses it).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1328-1357
export function validateSteps(driver, steps, boundNames = []) {
  let expectations = 0;
  // The absence anchor: the route of the latest positive assertion since the last goto. An absence
  // step on a page that never rendered would pass vacuously (a locator that matches nothing is hidden).
  /** @type {string | null} */ let route = null;
  /** @type {string | null | undefined} */ let anchored;
  for (const [i, s] of steps.entries()) {
    const r = stepRules(driver, s);
    if ('why' in r) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${r.why}` };
    expectations += r.expectations;
    for (const name of stepVariables(s)) {
      if (!boundNames.includes(name)) {
        return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: variable ${name} is not bound by a capture declared for this case` };
      }
    }
    if (driver === 'browser' && isObj(s)) {
      if (s.action === 'goto' || s.action === 'expect_url') route = routeKey(s.path);
      if (s.action === 'goto') anchored = undefined;
      if (POSITIVE_ASSERTION_ACTIONS.includes(s.action)) anchored = route;
      if (s.action === 'expect_not_visible' && (anchored === undefined || anchored !== route)) {
        return {
          code: 'PLAN_ENTRY_INVALID',
          reason: `step ${i + 1}: expect_not_visible needs an earlier expect_visible, expect_text, expect_value or expect_state step on the same route since the last goto`,
        };
      }
    }
  }
  if (expectations === 0) return { code: 'NO_EXPECTATION', reason: 'the plan entry carries no expectation step, so no pass could be earned' };
  return null;
}
```
Copied by Task 1 (the zero-count rule reuses `anchored` and `route` unchanged, and the new interaction flag is one more local beside them; the signature, the `step N:` prefix, the unbound-variable rule and the `NO_EXPECTATION` tail stay byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1531-1538
/**
 * The window a value or a state is re-read before the step is decided. It mirrors the 5-second default
 * timeout of Playwright's web-first assertions; chosen, not measured, and the dogfood recalibrates it.
 */
export const ASSERT_SETTLE_MS = 5000;

/** The pause between two re-reads of a value or a state: the first step of Playwright's own retry schedule. Chosen. */
export const ASSERT_POLL_INTERVAL_MS = 100;
```
Copied by Task 1 (the three new constants carry the same "chosen, not measured, the dogfood recalibrates it" sentence; no number of this phase is a measurement).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1551-1558
export async function settleAssertion(read, accept, opts = {}) {
  const boundMs = opts.boundMs ?? ASSERT_SETTLE_MS;
  const intervalMs = opts.intervalMs ?? ASSERT_POLL_INTERVAL_MS;
  const sleep = opts.sleep ?? ((/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms)));
  const now = opts.now ?? (() => performance.now());
  let reads = 0;
  let readable = 0;
  /** @returns {Promise<boolean>} */
```
Copied by Task 1 (`settleRequestWindow` takes `{ sleep, settleMs }` in the same `opts` shape with the same default `sleep` expression, so a test drives it with a fake clock and no browser; the slice of the log is taken AFTER the wait).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2074-2078
function writeEvidence(ctx, name, payload) {
  const abs = join(ctx.runDirAbs, 'evidence', name);
  writeRunFile(ctx, abs, payload);
  return `${ctx.runDirRel}/evidence/${name}`;
}
```
Copied by Task 2 (the request evidence goes through this helper and so through `writeRunFile` and the redaction table; no second write site, and the file lands in `evidence/`, which the run's `.gitignore` already covers).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2428-2454
DRIVERS.browser = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  /** @type {any} */ let browser = null;
  try {
    browser = await ctx.playwright.chromium.launch({ headless: true });
  } catch {
    return blocked('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/');
  }
  /** @type {any} */ let context = null;
  /** @type {string[]} */ const evidence = [];
  /** @type {Map<number, string>} */ const queryEvidence = new Map();
  // The located field of every expect_value step that ran: masked in the final capture, so a value the runner read is not left in clear.
  /** @type {any[]} */ const valueMasks = [];
  try {
    context = await browser.newContext(session && session.path ? { storageState: session.path } : {});
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    /** @type {CaseResult | null} */ let verdict = null;
    let ranTo = -1;
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
      ranTo = i;
```
Copied by Task 2 (the host-abort `context.route` stays exactly as it is and is what keeps a request to a non-local host from leaving the machine; the listener is attached to `page` right after `context.newPage()`, the window start is recorded right after `ranTo = i;`, and the context options gain `serviceWorkers: 'block'` only when the plan carries an `expect_requests` step).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2496-2525
      } else if (step.action === 'query') {
        const q = await runQueryStep(ctx, kase, step, n);
        if (!q.ok) {
          if (q.result.evidence.length > 0) queryEvidence.set(i, q.result.evidence[0]);
          verdict = q.result;
          break;
        }
        queryEvidence.set(i, q.evidence);
      } else if (step.action === 'expect_visible') {
        const ok = await page.locator(step.selector).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
        if (!ok) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
          break;
        }
      } else if (step.action === 'expect_text') {
        const text = await page.locator(step.selector).first().textContent({ timeout: 10000 }).catch(() => null);
        if (text === null || !text.includes(step.contains)) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
          break;
        }
      } else if (step.action === 'expect_url') {
        const want = new URL(step.path, target.origin);
        const have = new URL(page.url());
        const same = want.search === '' ? have.pathname === want.pathname : have.pathname + have.search === want.pathname + want.search;
        if (!same) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the page URL did not match the expected path`, evidence: [] };
          break;
        }
      }
    }
```
Copied by Task 2 (the new `else if (step.action === 'expect_requests')` branch sits after `expect_url` with the same `verdict = ...; break;` shape and the same `queryEvidence.set(i, path)` per-step evidence the query step uses; the chain has no terminal `else` today, so a validated action with no branch is silently recorded `passed`, and the branch ends in an `else` that blocks).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2705-2746
function obtainSession(ctx, role) {
  const cached = ctx.sessions.get(role);
  if (cached) return cached;
  /** @type {{ ok: true, info: SessionInfo } | { ok: false, code: string, detail?: string }} */ let result;
  const script = join(ctx.root, 'PRPs', 'auth', `login-${role}.mjs`);
  const stale = existsSync(script) ? staleKitScript(script) : null;
  if (!existsSync(script)) {
    result = { ok: false, code: 'FAILED_LOGIN_SCRIPT_MISSING' };
  } else if (stale !== null) {
    result = { ok: false, code: 'FAILED_KIT_SCRIPT_STALE', detail: stale };
  } else {
    const force = isMintedRole(ctx, role) && mintExpiryDue(readMintExpiry(ctx.root, role), Date.now());
    const r = spawnSync(process.execPath, [script, '--root', ctx.root, '--plugin-root', PLUGIN_ROOT, ...(force ? ['--force'] : [])], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      encoding: 'utf8',
      timeout: 120000,
    });
    if (r.status === 0) {
      const sessionPath = join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.json`);
      const state = readJsonOrNull(sessionPath);
      if (state === null) {
        result = { ok: false, code: 'FAILED_SESSION_UNREADABLE' };
      } else {
        const tok = readJsonOrNull(join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.token.json`));
        const token = tok && isStr(tok.token) && tok.token !== '' ? tok.token : null;
        const split = splitSessionValues(state, token, declaredCookieNamesOf(ctx.loginConfig, role), originTextsOf(ctx));
        const secrets = [...split.declared, ...split.undeclared];
        addSecretValues(ctx.table, secrets);
        const header = tok && isStr(tok.header) && /^[A-Za-z0-9-]+$/.test(tok.header) ? tok.header : null;
        const valuePrefix = header !== null && tok && isStr(tok.value_prefix) ? tok.value_prefix : null;
        result = { ok: true, info: { path: sessionPath, token, header, valuePrefix } };
      }
    } else {
      const m = /FAILED_[A-Z_]+/.exec(String(r.stderr ?? ''));
      result = { ok: false, code: m ? m[0] : 'FAILED_LOGIN_UNKNOWN' };
    }
  }
  ctx.sessions.set(role, result);
  return result;
}
```
Copied by Task 3 (the cache, the missing and stale branches and the success branch with its secret registration stay byte-identical; the `spawnSync` call moves into `runLoginScript(root, script, force)`, the `/FAILED_[A-Z_]+/` stderr extraction moves unchanged into `loginHaltCode`, and the single `r` becomes a `let` that a bounded `for` may replace once, so the second attempt's session values are registered by the very same success branch).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3399-3410
    const s = obtainSession(ctx, role);
    if (!s.ok && s.code === 'FAILED_KIT_SCRIPT_STALE') {
      return out(blocked(s.code, `the kit login script for role ${role} was generated from a different template than the installed one (${s.detail ?? 'identities unknown'}); nothing was saved or reused; run /relay-auth-scripts --refresh`));
    }
    if (!s.ok && PROBE_BLOCK_CODES.includes(s.code)) {
      return out(blocked(s.code, `the kit's session probe for role ${role} halted; nothing was saved or reused`));
    }
    if (!s.ok && MINT_BLOCK_CODES.includes(s.code) && isMintedRole(ctx, role)) {
      return out(blocked(s.code, mintBlockReason(s.code, role)));
    }
    if (!s.ok) return out(blocked('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`));
    session = s.info;
```
Copied by Task 3 (read-only: `FAILED_PROBE_MARKER_ABSENT` is already in `PROBE_BLOCK_CODES`, so a second halt surfaces through this mapping with the code of that halt, which is the same code and the same fixed sentence when it is `FAILED_PROBE_MARKER_ABSENT` again; nothing here is edited).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:1582-1590
  const saveProof = await proveSession(cfg, role, state, role.mechanism === 'minted' && token !== null ? mintTokenArt(role, token) : (token !== null ? { token } : null), pw, guard, target.allowedHosts, probeDetail);
  if (saveProof === 'expired' && hasBrowserProbe(role)) {
    // The login completed; the declared browser probe is what failed, so name it.
    const what = probeDetail.existed ? 'an element matching it existed but was not visible' : 'no element matched it';
    err(
      `FAILED_PROBE_MARKER_ABSENT: roles.${ROLE}.browserProbe.${probeDetail.field || 'marker'} never became stably visible after the login (${what}); nothing was saved`,
    );
    return 1;
  }
```
Copied by nothing (read-only evidence for the design): this is the only emission of the halt, after the mint command ran and before anything was saved, so `FAILED_PROBE_MARKER_ABSENT` from a `minted` role is exactly "a proof failure right after a fresh mint" and the runner needs no other signal to know the mint just ran; `--force` (line 1444) then skips the reuse check and goes straight to the mint branch.

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:263-267
/**
 * @param {{ scriptText?: string | null, commandText?: string | null, seedScriptText?: string | null, seedCommandText?: string | null, queryModuleText?: string | null, results?: { file: string, value: any }[], requireStepExamples?: boolean, requireCatalogue?: boolean, requireGround?: boolean, requirePrivacy?: boolean, requireVocabulary?: boolean, requirePrefix?: boolean }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkQaRunContract({ scriptText, commandText, seedScriptText, seedCommandText, queryModuleText, results, requireStepExamples = false, requireCatalogue = false, requireGround = false, requirePrivacy = false, requireVocabulary = false, requirePrefix = false }) {
```
Copied by Task 7 (`requireNetwork` is added beside `requirePrefix` in the same destructured signature and JSDoc type, default `false`, exactly like the six earlier flags).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:382-398
    if (requirePrefix) {
      // The cap is defined once, in the runner, and both ground halts are named.
      const capDefinitions = occurrences(scriptText, 'export const GROUND_PREFIX_MAX_STEPS');
      if (capDefinitions !== 1) {
        add(`${PREFIX_PREFIX}the runner script must define the prefix cap with export const GROUND_PREFIX_MAX_STEPS exactly once, found ${capDefinitions}`, SCRIPT_FILE);
      }
      for (const halt of ['GROUND_PREFIX_INVALID', 'GROUND_PREFIX_FAILED']) {
        if (!scriptText.includes(halt)) add(`${PREFIX_PREFIX}the runner script must contain the named halt ${halt}`, SCRIPT_FILE);
      }
      // The exported ground usage line lists the flag.
      const prefixUsage = USAGE.split('\n').find((l) => l.includes('qa-run.mjs ground')) ?? '';
      if (!prefixUsage.includes('--prefix')) add(`${PREFIX_PREFIX}the runner usage text must list the ground flag --prefix`, SCRIPT_FILE);
      // The replay runs after the ignore proof and before the stable-snapshot wait, and the file is named through its helper.
      const prefixGround = sectionBetween(scriptText, 'async function runGround(', 'async function runGroundGuarded(');
      if (prefixGround === null) {
        add(`${PREFIX_PREFIX}the runner script must define the ground mode between async function runGround( and async function runGroundGuarded(, so the replay can be located`, SCRIPT_FILE);
      } else {
```
Copied by Task 7 (the flag is checked inside the same `scriptText` branch, every message starts with a prefix word of its own, a section that cannot be located is itself a finding, and the helpers `sectionBetween` and `occurrences` are reused).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:633-640
    if (requirePrefix) {
      // The flag, both halts, the block that teaches the mode and the cap follow the exported constant.
      const cap = `at most ${GROUND_PREFIX_MAX_STEPS} steps`;
      for (const token of ['--prefix', 'GROUND_PREFIX_FAILED', 'GROUND_PREFIX_INVALID', 'Grounding after an interaction.', cap]) {
        if (!commandText.includes(token)) add(`${PREFIX_PREFIX}the runner command must document the ground prefix: it must contain ${token}`, COMMAND_FILE);
      }
    }
  }
```
Copied by Task 7 (the doc tokens follow the exported constants and are matched with a raw `commandText.includes`, so every pinned token must sit on one physical line of the hard-wrapped doc).

````
# SOURCE: plugins/relay/commands/relay-qa-run.md:297-315
A literal `browser` step that asserts a state:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_state", "role": "button", "name": "Não concluídas", "state": "expanded", "equals": false }
```

`expect_state` takes `role` and `name`, a `state` of `expanded`, `disabled` or `checked`
and a boolean `equals` that is always written. It passes only when the element's state
equals `equals`, re-read for up to 5 seconds. `expanded` reads `aria-expanded`,
`disabled` follows Playwright's definition of a disabled element and `checked` reads the
checked state of a checkbox or radio. An element that exposes no such state (a button with
no `aria-expanded`, a `details` disclosure, a non-checkbox) blocks the case
`STEP_NOT_PERFORMABLE` and never passes as collapsed or unchecked, and so does a `checked`
step on an element whose `aria-checked` is `mixed`. The runner reads only that attribute: a
native checkbox whose DOM `indeterminate` property is set exposes no `aria-checked`, is not
detected, and is read as Playwright reports its checked state.

Grounding rules. Write a locator step only for an entry of the snapshot of the step's own
````
Copied by Task 4 (the new example and its two paragraphs are inserted between the `expect_state` paragraph, which ends `...as Playwright reports its checked state.`, and the paragraph that starts `Grounding rules.`, so the first-match slices that start at `Grounding rules.` and the paragraph-start uniqueness rule are untouched).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:709-720
For a role whose mechanism is `minted`, the runner reads the expiry the login script recorded in the
value-free `PRPs/auth/.sessions/<role>.mint.json` (else the token artifact's `expires_at`). When that
expiry is within 240 seconds of the run start, the runner passes the login script `--force`, so the
script mints and proves a new session before the first case uses it. The runner never runs the mint
command itself: the kit script does, behind its own `confirmed` gate and local-only guard. Session
values are registered for redaction source-first: the token artifact, the role's declared
`sessionCookie` and the cookie named by every `api_origins` entry are always registered, and every
other cookie, localStorage and IndexedDB string (record keys included) only when it is
at least 12 characters long, has an entropy of at least
3.0 bits per character and is not a part of the target origin. A short or low-entropy value in
an undeclared cookie is therefore not masked by value, so a cookie that carries a secret is
declared as `sessionCookie` or in `api_origins`.
```
Copied by Task 4 (a NEW paragraph follows this one after a blank line; the paragraph itself is not edited, because `240 seconds`, `--force`, `IndexedDB`, `registered for redaction source-first` and `not masked by value` are pinned as position-free tokens by `qa-run-privacy-pins.test.mjs:313-328` and `qa-run-minted-session.test.mjs:500-507`).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:651-661
- Plan `expect_not_visible` only after a positive step of the same route, and
  `expect_value` and `expect_state` only on an entry whose `matches` is exactly `1`,
  with the expected value or state taken from the report's own steps, never from the
  snapshot.
- Plan a `ground` prefix only from the `goto`, `click` and `fill` steps of the case itself,
  write a prefix `fill` value only when the steps of the report state it, and
  never prefix a step whose manual wording submits, saves, deletes or sends.
- Every executable entry must carry at least one expectation; a declining entry has
  no steps and so carries none.
- Never put a credential or token value in `plan.json`.
- Never infer a driver the steps do not need.
```
Copied by Task 4 (the new bullet goes directly after the `ground` prefix bullet, starts with `- Plan `expect_requests`` so the parser that keys bullets by their opening words finds each opening once, and keeps the two-space continuation indent the parser joins on).

```
# SOURCE: plugins/relay/resources/redaction-policy.md:244-257
- **Post-interaction snapshots.** A snapshot written after the `ground` mode replayed
  a prefix of `goto`, `click` and `fill` steps lives under `grounding/` beside the plain
  snapshot of its route and is withheld by the same rules, entry by entry. A prefix
  locator that names a withheld value is refused before the browser starts. The recorded
  `prefix` holds no typed value, only a SHA-256 digest, never in clear, and `ground`
  prints the value on no terminal line and writes it to no other file. The `entries`
  are page text read after the interaction, so they can echo a typed value the page
  renders back: an entry is withheld only for a registered secret, an e-mail address or
  a `regex:` match, and a typed value is not registered. That value comes from the
  report's own steps, which the report file already holds, and the snapshot sits under
  the run directory's ignored `grounding/`, whose ignore rule is proven before it is
  written.

---
```
Copied by Task 5 (the new bullet sits directly after this one at column zero with two-space continuation lines and no blank line inside it, so the Input values bullet parser and the section bounds that the privacy and vocabulary pins slice on are unchanged).

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:224-229
Without `--refresh`, an existing script is skipped and reported, never
overwritten, and the report says, per skipped script, whether its stamp line
differs from the installed template's or is absent (stale). With `--refresh`,
every selected role's script is regenerated from the installed template by the
same single substitution and overwrites the existing file, each replaced script
being reported. `--refresh` adds to the configuration only the fields a newer
```
Copied by Task 6 (read-only: these are the sentences that define which scripts a refresh regenerates; they are contiguous substrings that `auth-kit-commands-hardening.test.mjs:161-169` and `auth-kit-minted-authoring.test.mjs:247-251` match after whitespace collapse, so none is edited; the new paragraph describes the role set that "every selected role" means).

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:237-239
touches a session, a token, `credentials.json` or `credentials.example.json`.

Write `PRPs/auth/credentials.example.json` with placeholder values only when
```
Copied by Task 6 (a NEW paragraph is inserted between the paragraph that ends `...or `credentials.example.json`.` and the line that starts `Write `PRPs/auth/credentials.example.json``, after one blank line on each side).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the `expect_requests` constants, validator branch and sequence rules, the pure observation helpers and the listener, the browser-driver branch and its evidence, the terminal `else`, the re-mint cap, the pure retry decision, the extracted login spawn and the bounded second attempt in `obtainSession` |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the marked literal `expect_requests` example and its two paragraphs, the Phase B re-mint paragraph and one honesty bullet |
| `plugins/relay/resources/redaction-policy.md` | UPDATE | one bullet stating what an observed request records and what it never reads |
| `plugins/relay/commands/relay-auth-scripts.md` | UPDATE | one paragraph stating which roles `--refresh` covers (the smallest statement AC-19 allows) |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | an opt-in `requireNetwork` rule set pinning the observation helper's reads, the driver wiring, the single login spawn and its cap, the behavior of the new validators and the doc tokens; no new check is registered (the count stays 28) |

## NOT Building (Scope Limits)

- The release cut, every `documentation/` page and its changelog entry (Phase 7), and the dogfood and its scans (Phase 8).
- Any change to `plugins/relay/resources/auth-login.template.mjs` or to `KIT_TEMPLATE_ID` (`auth-login/2`): the retry lives in the runner so no project's scripts become stale (AC-13).
- A runner flag for the retry, a retry for any halt other than `FAILED_PROBE_MARKER_ABSENT`, a retry for a role whose mechanism is not `minted`, more than one retry, a back-off or a sleep between the attempts, and any new reason code, outcome or catalogue entry (`OUTCOMES` and `REASON_CATALOGUE` stay exactly as they are).
- An assertion on the status, headers, timing or body of an observed request, `expect_requests` on the `http` driver, observation of a popup, a worker, a WebSocket or a Server-Sent Events stream, and a request count recorded in `results.json` (the count lives in the evidence file and in a failing reason).
- Any change to how `--refresh` behaves in a script or in the template, any change to the `--refresh` argument bullet or to its other sentences, and PS20 (`--refresh` and `maxAgeMinutes`), which the PRD defers.
- Any change to the run driver's other steps, `settleAssertion`, `waitForStableSnapshot`, `writeRunFile`, the redaction table, the ignore rules and their proof, the `ground` mode, `parseGroundPrefix` or the snapshot schemas.
- A second guard site, a new `checkTarget` call, a second write site, a static sibling import, or an entry in `auth-local-guard-sites` (the observed requests run inside the existing host-abort context route and the existing guard call; the second login run is the existing spawn).
- A change to the frozen classification table, the reason-code catalogue table or any existing `json` block of the command doc; any edit under `documentation/`, `docs/decisions.md` or `docs/anti-patterns.md`, and any hand edit of `docs/` (the `docs_sync` pass owns `docs/` at implement time).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-14), and any change to a report.
- Any test file. R-X strict: the Implementer authors zero test files; new tests and any edit of an existing test are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the `expect_requests` vocabulary, its sequence rules and the pure observation helpers

- **ACTION**: Delivers AC-A2 (the step is a closed flat shape, valid only after an interaction in the same case, and a count of 0 needs the positive anchor) and the pure halves of AC-A1 (the window decision), AC-A3 (a matching non-local request is refused, never counted) and AC-A4 (a classified request carries no query string and no fragment). Pure code, no I/O beyond an injectable sleep, in `plugins/relay/scripts/qa-run.mjs`:
  1. **The helper cluster.** Directly after the closing brace of `ariaExpandedOf` and before the doc comment of `precheckGroundedSteps`, insert the cluster below between two comment lines `// REQUEST-OBSERVATION-BEGIN` and `// REQUEST-OBSERVATION-END` (each occurs exactly once in the file; Task 2 adds `observeRequests` immediately before the END line). In this order, each with a doc comment:
     - three exported constants, each comment ending "Chosen, not measured; the Phase 8 dogfood recalibrates it.": `EXPECT_REQUESTS_SETTLE_MS = 2000` (how long an `expect_requests` step keeps watching after it starts, so a request that a handler issues after its click returned is inside the window and a duplicate submit is counted), `EXPECT_REQUESTS_COUNT_MAX = 100` (the largest `count` a step may declare) and `EXPECT_REQUESTS_EVIDENCE_MAX = 50` (the most matching requests the evidence file lists; the observed count is always exact);
     - `export function classifyObservedRequest(rawUrl, rawMethod, target)` returning `null` or an object whose keys are, in this order, `method`, `host`, `path`, `local`. `method` is `String(rawMethod).toUpperCase()`. The URL is parsed with `new URL(String(rawUrl))`; text that does not parse returns `{ method, host: '', path: '', local: false }`; a `data:`, `about:` or `blob:` URL returns `null` (it is not a network request). Otherwise `host` is `u.host` (the hostname plus an explicit port), `path` is `u.pathname` whole, never cut (matching and counting run on this value, so a cut here would hide a `url_contains` that sits only in the tail of a long path and let a count of 0 pass on a request that was issued; the 200-character cap belongs to the evidence listing, which applies it after redaction in Task 2), and `local` is `true` only when `u.protocol` is `http:` or `https:` and `target.guard.isAllowedHost(u.hostname, target.allowedHosts) === true` (a missing guard, a missing function or a throw is `false`). The function reads only `protocol`, `host`, `hostname` and `pathname` of the parsed URL: never `search`, `hash`, `href` or the original string beyond the parse, so a query value or a fragment cannot reach the result;
     - `export function evaluateRequestWindow(window, step)`, which first computes `needle`, the pathname of `new URL(step.url_contains, 'http://needle.invalid')` (the text itself when it does not parse), so a character that the URL parser percent-encodes in a recorded path is encoded the same way in the needle and a non-ASCII or special character cannot make a count of 0 pass for the wrong reason. It returns `{ status: 'non-local' }` when any element of `window` whose `method` equals `step.method` and whose `path` includes `needle` has `local !== true`, else `{ status: 'passed' | 'failed', observed, matching }` where `observed` is the number of matching elements (same method, path includes `needle`), `status` is `'passed'` exactly when `observed === step.count`, and `matching` is the matching elements mapped to `{ method, host, path }` (no `local` key, and the path exactly as recorded: this function never cuts it either). An element that does not match is never inspected beyond its `method` and `path`, so a non-matching request to a non-local host is ignored. The function is total over a non-array `window` (treated as empty);
     - `export async function settleRequestWindow(log, windowStart, opts = {})` which awaits `opts.sleep ?? ((ms) => new Promise((done) => setTimeout(done, ms)))` called with `opts.settleMs ?? EXPECT_REQUESTS_SETTLE_MS`, and only then returns `log.slice(Math.max(0, Number.isInteger(windowStart) ? windowStart : 0))` (the slice is taken after the wait, so a request that arrives during it is inside the window).
     The cluster must not contain, even in a comment, any of these tokens (Task 7 pins their absence): `.headers(`, `.allHeaders(`, `.headerValue(`, `.headersArray(`, `.postData(`, `.postDataBuffer(`, `.postDataJSON(`, `.response(`, `.cookies(`, `.storageState(`, `.body(`, `.text(`, `.json(`.
  2. `BROWSER_ACTIONS`: append `'expect_requests'` to the list. Do not touch `LOCATOR_ACTIONS` or `POSITIVE_ASSERTION_ACTIONS`.
  3. `stepRules`: add this case before `default:` of the browser `switch`, so the keys of the step are the closed set and every refusal is a fixed sentence that echoes no value:
     ```js
           case 'expect_requests': {
             if (Object.keys(s).some((k) => !['action', 'method', 'url_contains', 'count'].includes(k))) {
               return bad('expect_requests takes only method, url_contains and count');
             }
             if (!HTTP_METHODS.includes(s.method)) return bad('expect_requests method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
             if (!isStr(s.url_contains) || s.url_contains.length > 200 || !/^\/(?!\/)[^\s?#]*$/.test(s.url_contains)) {
               return bad('expect_requests url_contains must be a path that starts with a single / and carries no query string, fragment or whitespace, of at most 200 characters');
             }
             if (!Number.isInteger(s.count) || s.count < 0 || s.count > EXPECT_REQUESTS_COUNT_MAX) {
               return bad(`expect_requests count must be an integer from 0 to ${EXPECT_REQUESTS_COUNT_MAX}`);
             }
             expectations++;
             break;
           }
     ```
     (A `session` key is already refused earlier in the same function; a locator key or a `selector` reaches this case because the action is not a locator action, and the closed key set refuses it. On the `http` driver the action is already refused as an unknown http action.)
  4. `validateSteps`: declare `let interacted = false;` beside `route` and `anchored`; inside `if (driver === 'browser' && isObj(s)) {`, after the existing `expect_not_visible` block and before the closing brace, add:
     ```js
           if (s.action === 'expect_requests') {
             if (!interacted) {
               return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: expect_requests needs an earlier goto, click or fill step in the same case` };
             }
             if (s.count === 0 && (anchored === undefined || anchored !== route)) {
               return {
                 code: 'PLAN_ENTRY_INVALID',
                 reason: `step ${i + 1}: expect_requests with count 0 needs an earlier expect_visible, expect_text, expect_value or expect_state step on the same route since the last goto`,
               };
             }
           }
           if (s.action === 'goto' || s.action === 'click' || s.action === 'fill') interacted = true;
     ```
  Do NOT add any `import`, the text `writeFileSync(` or `renameSync(` (comments included), `// GUARD-SITE` or `// WRITE-SITE`, a second copy of any existing line (the corpus anchors source mutations on exact lines, for example `const ANONYMOUS_CHECK_MS = 20000;` and `if (isObj(record)) {`), or any edit of `routeKey`, `locatorOf`, `settleAssertion` or a driver in this task.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1085-1089` (the action lists), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1255-1287` (the `switch` that gains the case), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1328-1357` (the sequence rules that gain two) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1531-1538` plus `# SOURCE: plugins/relay/scripts/qa-run.mjs:1551-1558` (the constants and the injectable-sleep convention).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import {
    validateStep, validateSteps, POSITIVE_ASSERTION_ACTIONS,
    EXPECT_REQUESTS_SETTLE_MS, EXPECT_REQUESTS_COUNT_MAX, EXPECT_REQUESTS_EVIDENCE_MAX,
    classifyObservedRequest, evaluateRequestWindow, settleRequestWindow,
  } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const ok = { action: "expect_requests", method: "POST", url_contains: "/avatar", count: 1 };
  const goto = { action: "goto", path: "/p" };
  const positive = { action: "expect_visible", selector: "h1" };
  const click = { action: "click", selector: "#save" };

  // 1. The closed constants, and the step is not an element assertion.
  check(EXPECT_REQUESTS_SETTLE_MS === 2000, "the settle window changed: " + EXPECT_REQUESTS_SETTLE_MS);
  check(EXPECT_REQUESTS_COUNT_MAX === 100 && EXPECT_REQUESTS_EVIDENCE_MAX === 50, "a cap changed");
  check(!POSITIVE_ASSERTION_ACTIONS.includes("expect_requests"), "a request count must not anchor an absence step");

  // 2. What a step accepts.
  for (const [label, step] of [["a POST count 1", ok], ["count 0", { ...ok, count: 0 }], ["a GET", { ...ok, method: "GET" }], ["the cap", { ...ok, count: 100 }], ["a binding in the path", { ...ok, url_contains: "/tasks/{{task_id}}" }]]) {
    const r = validateStep("browser", step);
    check(r === null, label + " was refused: " + JSON.stringify(r));
  }

  // 3. What a step refuses: PLAN_ENTRY_INVALID with a reason, never a throw, never an echoed value.
  const refused = [
    ["browser", "an unknown method", { ...ok, method: "TRACE" }],
    ["browser", "a lowercase method", { ...ok, method: "post" }],
    ["browser", "a missing method", { action: "expect_requests", url_contains: "/a", count: 1 }],
    ["browser", "a query string", { ...ok, url_contains: "/avatar?x=1" }],
    ["browser", "a fragment", { ...ok, url_contains: "/avatar#x" }],
    ["browser", "no leading slash", { ...ok, url_contains: "avatar" }],
    ["browser", "a leading double slash", { ...ok, url_contains: "//cdn.example.com/avatar" }],
    ["browser", "a host in the path", { ...ok, url_contains: "localhost:3000/avatar" }],
    ["browser", "whitespace", { ...ok, url_contains: "/ava tar" }],
    ["browser", "a 201 character path", { ...ok, url_contains: "/" + "a".repeat(200) }],
    ["browser", "a non-string path", { ...ok, url_contains: 7 }],
    ["browser", "a negative count", { ...ok, count: -1 }],
    ["browser", "a fractional count", { ...ok, count: 1.5 }],
    ["browser", "a string count", { ...ok, count: "1" }],
    ["browser", "a count over the cap", { ...ok, count: 101 }],
    ["browser", "a missing count", { action: "expect_requests", method: "POST", url_contains: "/a" }],
    ["browser", "a selector", { ...ok, selector: "#a" }],
    ["browser", "a locator", { ...ok, role: "button", name: "Salvar" }],
    ["browser", "a text locator", { ...ok, text: "Salvar" }],
    ["browser", "a session key", { ...ok, session: "none" }],
    ["browser", "a key of another step", { ...ok, expect_status: 200 }],
    ["http", "the http driver", ok],
  ];
  for (const [driver, label, step] of refused) {
    let r;
    try { r = validateStep(driver, step); } catch (e) { check(false, label + " threw: " + e.message); continue; }
    check(r !== null && r.code === "PLAN_ENTRY_INVALID" && typeof r.reason === "string" && r.reason !== "", label + " was accepted or carried no reason: " + JSON.stringify(r));
  }
  const echo = validateStep("browser", { ...ok, url_contains: "/avatar?token=SECRETVALUE-4417" });
  check(echo !== null && !echo.reason.includes("SECRETVALUE-4417"), "a refusal echoed the value: " + JSON.stringify(echo));
  for (const hostile of [JSON.parse("{\"toString\":1}"), [JSON.parse("{\"toString\":1}")], null, 5]) {
    let r;
    try { r = validateStep("browser", { action: "expect_requests", method: hostile, url_contains: hostile, count: hostile }); } catch (e) { check(false, "a hostile value threw: " + e.message); continue; }
    check(r !== null && r.code === "PLAN_ENTRY_INVALID", "a hostile value was accepted");
  }

  // 4. The sequence rules.
  const entry = (steps) => validateSteps("browser", steps, []);
  const bare = entry([ok]);
  check(bare !== null && bare.code === "PLAN_ENTRY_INVALID" && /^step 1:/.test(bare.reason), "no earlier interaction: " + JSON.stringify(bare));
  check(entry([positive, ok]) !== null, "an assertion is not an interaction");
  check(entry([goto, ok]) === null, "goto then expect_requests must validate");
  check(entry([goto, click, ok]) === null, "goto, click, expect_requests must validate");
  const zero = { ...ok, count: 0 };
  const anchorless = entry([goto, click, zero]);
  check(anchorless !== null && /^step 3:/.test(anchorless.reason) && /count 0/.test(anchorless.reason), "a zero count with no anchor: " + JSON.stringify(anchorless));
  check(entry([goto, positive, click, zero]) === null, "a zero count after a positive step on the same route must validate");
  check(entry([goto, positive, { action: "goto", path: "/q" }, click, zero]) !== null, "a later goto must reset the anchor");
  check(entry([goto, click]) !== null && entry([goto, click]).code === "NO_EXPECTATION", "the NO_EXPECTATION rule changed");
  check(entry([goto, positive]) === null, "a plain plan changed");

  // 5. Classification keeps method, host and path and never the query string or the fragment.
  const target = { origin: "http://127.0.0.1:3000", allowedHosts: new Set(["127.0.0.1", "localhost"]), guard: { isAllowedHost: (h, s) => s.has(h) } };
  const seen = classifyObservedRequest("http://127.0.0.1:3000/avatar?token=QRYCANARY-7731#FRAGCANARY-7732", "post", target);
  check(seen !== null && seen.method === "POST" && seen.host === "127.0.0.1:3000" && seen.path === "/avatar" && seen.local === true && Object.keys(seen).join(",") === "method,host,path,local", "a local request: " + JSON.stringify(seen));
  check(!JSON.stringify(seen).includes("QRYCANARY") && !JSON.stringify(seen).includes("FRAGCANARY"), "the query string or the fragment reached the result");
  const away = classifyObservedRequest("https://cdn.example.com/avatar", "POST", target);
  check(away !== null && away.local === false && away.host === "cdn.example.com", "a non-local request: " + JSON.stringify(away));
  for (const u of ["data:text/plain,hi", "about:blank", "blob:http://127.0.0.1:3000/x"]) check(classifyObservedRequest(u, "GET", target) === null, u + " must not be a network request");
  const odd = classifyObservedRequest("not a url", "GET", target);
  check(odd !== null && odd.local === false && odd.path === "" && odd.host === "", "an unparsable URL: " + JSON.stringify(odd));
  const ws = classifyObservedRequest("ws://127.0.0.1:3000/s", "GET", target);
  check(ws !== null && ws.local === false, "a non-http scheme must not be approved");
  const noGuard = classifyObservedRequest("http://127.0.0.1:3000/a", "GET", {});
  check(noGuard !== null && noGuard.local === false, "a missing guard must fail closed");
  // The classifier never cuts the path: matching and counting run on it, and a cut here would hide a url_contains that sits only in the tail.
  const longPath = classifyObservedRequest("http://127.0.0.1:3000/" + "a".repeat(299), "GET", target);
  check(longPath !== null && longPath.path.length === 300, "the classified path must keep all 300 characters: " + (longPath === null ? "null" : longPath.path.length));
  const tailPath = "/" + "a".repeat(292) + "/avatar";
  const tailEntry = classifyObservedRequest("http://127.0.0.1:3000" + tailPath + "?q=1", "POST", target);
  check(tailEntry !== null && tailPath.length === 300 && tailEntry.path === tailPath, "the tail path must be recorded whole, query dropped: " + (tailEntry === null ? "null" : tailEntry.path.length));

  // 6. The window decision.
  const win = [
    { method: "POST", host: "127.0.0.1:3000", path: "/avatar", local: true },
    { method: "GET", host: "127.0.0.1:3000", path: "/avatar", local: true },
    { method: "POST", host: "127.0.0.1:3000", path: "/avatar/9", local: true },
    { method: "POST", host: "cdn.example.com", path: "/other", local: false },
  ];
  const ev = (step) => evaluateRequestWindow(win, step);
  const two = ev({ method: "POST", url_contains: "/avatar", count: 2 });
  check(two.status === "passed" && two.observed === 2 && two.matching.length === 2, "two matching requests: " + JSON.stringify(two));
  check(two.matching.every((m) => Object.keys(m).sort().join(",") === "host,method,path"), "a matching entry carries method, host and path only");
  const one = ev({ method: "POST", url_contains: "/avatar", count: 1 });
  check(one.status === "failed" && one.observed === 2, "a duplicate must fail: " + JSON.stringify(one));
  check(ev({ method: "GET", url_contains: "/avatar", count: 1 }).status === "passed", "the method filter");
  const none = ev({ method: "POST", url_contains: "/none", count: 0 });
  check(none.status === "passed" && none.observed === 0, "an empty window with count 0: " + JSON.stringify(none));
  check(ev({ method: "POST", url_contains: "/other", count: 1 }).status === "non-local", "a matching non-local request must block");
  check(ev({ method: "POST", url_contains: "/avatar", count: 2 }).status === "passed", "a non-matching non-local request must be ignored");
  check(evaluateRequestWindow("nope", { method: "POST", url_contains: "/a", count: 0 }).status === "passed", "a non-array window is empty");
  // A character the URL parser percent-encodes is matched against the encoded path: a count of 0 must not pass on a request that was issued.
  const accented = "/avat" + String.fromCharCode(225) + "r";
  const encodedWin = [{ method: "POST", host: "127.0.0.1:3000", path: "/avat%C3%A1r", local: true }];
  const hit = evaluateRequestWindow(encodedWin, { method: "POST", url_contains: accented, count: 1 });
  check(hit.status === "passed" && hit.observed === 1, "a non-ASCII url_contains must match the encoded path: " + JSON.stringify(hit));
  const miss = evaluateRequestWindow(encodedWin, { method: "POST", url_contains: accented, count: 0 });
  check(miss.status === "failed" && miss.observed === 1, "a count of 0 passed on a request that was issued: " + JSON.stringify(miss));
  const quoted = evaluateRequestWindow([{ method: "POST", host: "h", path: "/a%22b", local: true }], { method: "POST", url_contains: "/a" + String.fromCharCode(34) + "b", count: 1 });
  check(quoted.status === "passed", "a double quote in url_contains must match its encoded form: " + JSON.stringify(quoted));
  // A url_contains that matches only beyond character 200 is counted, and a count of 0 fails on the request that was issued.
  const tailWin = tailEntry === null ? [] : [tailEntry];
  const tailHit = evaluateRequestWindow(tailWin, { method: "POST", url_contains: "/avatar", count: 1 });
  check(tailHit.status === "passed" && tailHit.observed === 1 && tailHit.matching.length === 1 && tailHit.matching[0].path === tailPath, "a tail-only url_contains must count the request, path whole: " + JSON.stringify(tailHit));
  const tailZero = evaluateRequestWindow(tailWin, { method: "POST", url_contains: "/avatar", count: 0 });
  check(tailZero.status === "failed" && tailZero.observed === 1, "a count of 0 passed on a request that was issued past character 200: " + JSON.stringify(tailZero));
  // A non-ASCII needle whose encoded form is longer than 200 characters still matches the whole path.
  const wideNeedle = "/" + String.fromCharCode(225).repeat(40);
  const wideEntry = classifyObservedRequest("http://127.0.0.1:3000/" + "%C3%A1".repeat(40), "POST", target);
  const wideHit = evaluateRequestWindow(wideEntry === null ? [] : [wideEntry], { method: "POST", url_contains: wideNeedle, count: 1 });
  check(validateStep("browser", { ...ok, url_contains: wideNeedle }) === null && wideEntry !== null && wideEntry.path.length === 241 && wideHit.status === "passed", "a 41-character non-ASCII url_contains (241 characters encoded) must match the whole path: " + JSON.stringify(wideHit));

  // 7. The wait precedes the slice, and a request that arrives during it is inside the window.
  const waits = [];
  const log = [1, 2, 3, 4].map((i) => ({ method: "GET", host: "h", path: "/" + i, local: true }));
  const sliced = await settleRequestWindow(log, 2, { sleep: async (ms) => { waits.push(ms); } });
  check(waits.length === 1 && waits[0] === EXPECT_REQUESTS_SETTLE_MS, "the wait: " + JSON.stringify(waits));
  check(sliced.length === 2 && sliced[0].path === "/3", "the window start: " + JSON.stringify(sliced));
  const late = [];
  const withLate = await settleRequestWindow(late, 0, { sleep: async () => { late.push({ method: "POST", host: "h", path: "/late", local: true }); } });
  check(withLate.length === 1, "a request issued during the wait was left out of the window");
  check((await settleRequestWindow(log, -5, { sleep: async () => {} })).length === 4, "a negative start is clamped to the whole log");

  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-classification.test.mjs
  ```
  Before this task the new exports do not exist, so the import fails and the command exits non-zero. The script drives the real validators and helpers with no browser; the three existing test files run unchanged and prove the closed lists, the doc and contract pins and the `validateSteps` behavior this task extends. The long-path cases (a 300-character path recorded whole, a `url_contains` that matches only past character 200 that is counted with a `count` of 1 and fails with a `count` of 0, and a 41-character non-ASCII `url_contains` whose encoded form is 241 characters) fail an implementation that cuts the recorded path before it matches.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the listener, the browser-driver branch, its evidence and the terminal `else`

- **ACTION**: Delivers AC-A1 (the step passes only on an exact count of the window's matching requests, decided after the settle wait), AC-A3 (a matching request to a host the guard does not approve blocks the case `FAILED_NON_LOCAL_TARGET`, and the existing host-abort route still stops every non-local request before it leaves) and AC-A4 (the evidence file holds method, host, path and counts only, written through the one write helper). In `plugins/relay/scripts/qa-run.mjs`:
  1. **The listener.** Directly before the `// REQUEST-OBSERVATION-END` line of Task 1, add `export function observeRequests(page, target)`: it creates `const log = []`, registers `page.on('request', (request) => { const seen = classifyObservedRequest(request.url(), request.method(), target); if (seen !== null) log.push(seen); })` and returns `log`. It reads `request.url()` and `request.method()` and nothing else from the request object (the cluster ban list of Task 1 still applies).
  2. **`DRIVERS.browser`.** Right after `const target = ctx.target;`, the first line of the handler that opens `DRIVERS.browser = async (ctx, kase, plan, session) => {` (the `DRIVERS.http` handler has the same line and is not touched), add `const watchesRequests = plan.steps.some((s) => isObj(s) && s.action === 'expect_requests');`, `/** @type {{ method: string, host: string, path: string, local: boolean }[] | null} */ let requestLog = null;` and `let windowStart = 0;`. Replace the single argument of `browser.newContext(...)` by `{ ...(session && session.path ? { storageState: session.path } : {}), ...(watchesRequests ? { serviceWorkers: 'block' } : {}) }` (a case without the step gets exactly the options it has today; a case with it runs with service workers blocked, so a worker cannot answer a request out of sight of the listener and cannot issue a second, counted request of its own). Leave the `context.route('**/*', ...)` block untouched. Right after the `page.setDefaultTimeout(10000);` that follows `const page = await context.newPage();` in `DRIVERS.browser` (the `ground` mode has the same two lines and is not touched) add `if (watchesRequests) requestLog = observeRequests(page, target);`. Right after `ranTo = i;` add `if (requestLog !== null && (step.action === 'goto' || step.action === 'click' || step.action === 'fill')) windowStart = requestLog.length;` (the window opens when the interaction starts, before its own requests, and the locator-form click and fill take this path too because the line sits before the locator branch).
  3. **The branch.** In the legacy `else if` chain, after the `expect_url` branch and before the closing of the chain, add `else if (step.action === 'expect_requests') { ... }` that: when `requestLog === null` sets `verdict = blocked('STEP_NOT_PERFORMABLE', `step ${n}: the request log is not available; nothing was asserted`)` and `break`s; else `const seen = await settleRequestWindow(requestLog, windowStart);` and `const decided = evaluateRequestWindow(seen, step);`; when `decided.status === 'non-local'` sets `verdict = blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: a matching request targeted a host the local-only guard does not approve; it was aborted and nothing was asserted`)` and `break`s (no evidence is written); otherwise writes, inside a `try`, `queryEvidence.set(i, writeEvidence(ctx, `case-${kase.index}.requests-${n}.json`, { kind: 'json', value: { action: 'expect_requests', step: n, method: step.method, expected: step.count, observed: decided.observed, truncated: decided.observed > EXPECT_REQUESTS_EVIDENCE_MAX, requests: decided.matching.slice(0, EXPECT_REQUESTS_EVIDENCE_MAX).map((m) => ({ method: m.method, host: m.host, path: redactText(m.path, ctx.table).slice(0, 200) })), result: decided.status } }))`, with a `catch` that sets `verdict = blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the request evidence could not be written`)` and `break`s; and when `decided.status === 'failed'` sets `verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the page issued ${decided.observed} matching request(s); ${step.count} were expected`, evidence: [] }` and `break`s. The reasons carry a step position and counts, never a path, a host or a value. The 200 in the listing is an evidence-size cap on the written listing only (chosen, not measured; the Phase 8 dogfood recalibrates it): the window was decided above on the whole path, and a listed `path` is the recorded path redacted with `redactText(path, ctx.table)` and only then cut to its first 200 characters. The order is load-bearing: the write helper redacts each string it is handed, so a path cut before it reaches the helper would leave the first characters of a registered secret that straddles character 200 as a prefix nothing recognizes, whereas a path redacted first has the whole secret replaced by its marker before the cut (the cut may then fall inside the marker, which discloses nothing).
  4. **The terminal `else`.** After that branch add `else { verdict = blocked('STEP_NOT_PERFORMABLE', `step ${n}: this step has no runtime handler; nothing was asserted`); break; }`. Every action the validator accepts already has a branch (the locator forms leave the loop through `continue` earlier), so this `else` never fires today; it exists so that an accepted action with no branch can never be recorded `passed`.
  Do not add `page.waitForTimeout(`, `waitForLoadState(`, `response` handling, a second `context.route`, `writeFileSync(`, `renameSync(`, `// GUARD-SITE`, `// WRITE-SITE` or an import. Do not read a header, a cookie or a body from a request anywhere in the driver.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2428-2454` (the context, the host-abort route, the page and the loop head the listener and the window start attach to), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2496-2525` (the chain, its `verdict = ...; break;` shape and the per-step evidence map) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2074-2078` (the one evidence helper).
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
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const CAN = { query: "QRYCANARY-7731", fragment: "FRAGCANARY-7732", header: "HDRCANARY-7733", body: "BODYCANARY-7734", cookie: "COOKCANARY-7735", token: "TOKCANARY-7736" };
  const ENV_SECRET = "envsecretvalue-Zq83kd01";
  // A path whose distinguishing text lies only past character 200 (the listing cap), and a path whose registered secret starts at character 190 and so straddles that cap.
  const TAIL = "/avatar/" + "a".repeat(250) + "/zzz-tail";
  const STRADDLE = "/avatar/" + "a".repeat(182) + ENV_SECRET;
  const FEATURE = "feat";
  const RUN_REL = "PRPs/reports/feat/qa-run/20260101T101010101Z";
  const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body>
  <h1>Painel</h1>
  <button id="save" type="button">Salvar</button>
  <button id="twice" type="button">Duas vezes</button>
  <button id="nothing" type="button">Nada</button>
  <button id="outside" type="button">Fora</button>
  <button id="secret" type="button">Caminho</button>
  <button id="late" type="button">Tarde</button>
  <button id="many" type="button">Muitas</button>
  <button id="tail" type="button">Cauda</button>
  <button id="straddle" type="button">Limite</button>
  <p id="done" hidden>Enviado</p>
  <script>
  document.cookie = "cc=${CAN.cookie}; path=/";
  var send = function (path) { return fetch(path, { method: "POST", headers: { "x-canary": "${CAN.header}", "authorization": "Bearer ${CAN.token}", "content-type": "application/json" }, body: JSON.stringify({ v: "${CAN.body}" }) }).catch(function () {}); };
  document.getElementById("save").onclick = function () { send("/avatar?token=${CAN.query}#${CAN.fragment}").then(function () { document.getElementById("done").hidden = false; }); };
  document.getElementById("twice").onclick = function () { send("/avatar"); send("/avatar"); };
  document.getElementById("outside").onclick = function () { fetch("http://qa-nonlocal.invalid/avatar", { method: "POST", mode: "no-cors", body: "x" }).catch(function () {}); };
  document.getElementById("secret").onclick = function () { send("/avatar/${ENV_SECRET}"); };
  document.getElementById("late").onclick = function () { setTimeout(function () { send("/avatar"); }, 600); };
  document.getElementById("many").onclick = function () { for (var i = 0; i < 60; i++) { send("/avatar"); } };
  document.getElementById("tail").onclick = function () { send("${TAIL}"); };
  document.getElementById("straddle").onclick = function () { send("${STRADDLE}"); };
  </script></body></html>`;
  // A page that registers a service worker, and the hits each worker script gets.
  const SWPAGE = (script) => `<!doctype html><html><head><meta charset="utf-8"><title>sw</title></head><body>
  <h1>Painel</h1>
  <p id="swdone" hidden>registered</p>
  <script>
  if (navigator.serviceWorker) { navigator.serviceWorker.register("${script}").then(function () { document.getElementById("swdone").hidden = false; }, function () {}); }
  </script></body></html>`;
  const posts = [];
  const swHits = {};
  const server = createServer((req, res) => {
    const p = String(req.url).split("?")[0];
    if (req.method === "POST") { req.resume(); req.on("end", () => { posts.push(p); res.writeHead(204); res.end(); }); return; }
    if (p === "/sw-a.js" || p === "/sw-b.js") {
      swHits[p] = (swHits[p] || 0) + 1;
      res.writeHead(200, { "content-type": "application/javascript" });
      res.end("self.addEventListener(\"fetch\", function () {});");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(p === "/app-sw" ? SWPAGE("/sw-a.js") : p === "/app-sw-control" ? SWPAGE("/sw-b.js") : PAGE);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const base = "http://127.0.0.1:" + server.address().port;
  const root = mkdtempSync(join(tmpdir(), "relay-qa-v2p6-net-"));
  const runAbs = join(root, ...RUN_REL.split("/"));
  try {
    mkdirSync(runAbs, { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: {} }));
    const titles = ["Save once", "Save twice", "Nothing sent", "Wrong method", "Outside host", "Secret in the path", "Zero without an anchor", "Control without the step", "A request after the click returned", "The window opens at the last interaction", "More requests than the evidence lists", "Workers are blocked for a case that carries the step", "Workers are allowed for a case that does not", "A tail past character 200 is counted", "A zero count fails on a request issued past character 200", "A secret that straddles the listing cap"];
    const block = (i) => ["### Case " + (i + 1), "**Title:** " + titles[i], "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", "2. Act and count.", ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + titles.map((_, i) => block(i)).join("\n") + "\n## Notes\n\nnone\n");
    const goto = { action: "goto", path: "/app" };
    const head = { action: "expect_visible", selector: "h1" };
    const click = (id) => ({ action: "click", selector: "#" + id });
    const req = (method, count) => ({ action: "expect_requests", method, url_contains: "/avatar", count });
    const steps = [
      [goto, head, click("save"), req("POST", 1)],
      [goto, click("twice"), req("POST", 1)],
      [goto, head, click("nothing"), req("POST", 0)],
      [goto, click("save"), req("GET", 1)],
      [goto, click("outside"), req("POST", 1)],
      [goto, click("secret"), req("POST", 1)],
      [goto, click("nothing"), req("POST", 0)],
      [goto, head],
      [goto, head, click("late"), req("POST", 1)],
      [goto, head, click("save"), { action: "expect_visible", selector: "#done" }, click("nothing"), req("POST", 0)],
      [goto, head, click("many"), req("POST", 60)],
      [{ action: "goto", path: "/app-sw" }, head, req("POST", 0)],
      [{ action: "goto", path: "/app-sw-control" }, head, { action: "expect_visible", selector: "#swdone" }],
      [goto, head, click("tail"), { action: "expect_requests", method: "POST", url_contains: "/zzz-tail", count: 1 }],
      [goto, head, click("tail"), { action: "expect_requests", method: "POST", url_contains: "/zzz-tail", count: 0 }],
      [goto, click("straddle"), req("POST", 1)],
    ];
    writeFileSync(join(runAbs, "plan.json"), JSON.stringify({ schema_version: 1, cases: steps.map((s, i) => ({ index: i + 1, title: titles[i], driver: "browser", role: null, state: "none", steps: s })) }));
    const out = await new Promise((resolveP, rejectP) => {
      const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL], { cwd: root, env: { ...process.env, RELAY_QA_FIXTURE_SECRET: ENV_SECRET, GIT_CEILING_DIRECTORIES: dirname(root) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let so = ""; let se = "";
      child.stdout.on("data", (d) => (so += d));
      child.stderr.on("data", (d) => (se += d));
      const timer = setTimeout(() => child.kill(), 280000);
      child.on("error", (e) => { clearTimeout(timer); rejectP(e); });
      child.on("close", (code) => { clearTimeout(timer); resolveP({ code, so, se }); });
    });
    check(out.code === 0, "the run exited " + out.code + ": " + out.se);
    const res = JSON.parse(readFileSync(join(runAbs, "results.json"), "utf8"));
    const c = res.cases;
    const brief = (x) => JSON.stringify([x.outcome, x.reason_code, x.reason]);
    check(c.length === 16, "expected sixteen cases: " + c.length);
    check(c[0].outcome === "pass", "save once: " + brief(c[0]));
    check(c[1].outcome === "fail" && c[1].reason === "step 3: the page issued 2 matching request(s); 1 were expected", "save twice: " + brief(c[1]));
    check(c[2].outcome === "pass", "nothing sent with a zero count: " + brief(c[2]));
    check(c[3].outcome === "fail" && c[3].reason === "step 3: the page issued 0 matching request(s); 1 were expected", "wrong method: " + brief(c[3]));
    check(c[4].outcome === "blocked" && c[4].reason_code === "FAILED_NON_LOCAL_TARGET", "outside host: " + brief(c[4]));
    check(c[5].outcome === "pass", "secret in the path: " + brief(c[5]));
    check(c[6].outcome === "needs-human" && c[6].reason_code === "PLAN_ENTRY_INVALID" && /^step 3:/.test(c[6].reason) && c[6].evidence.length === 0, "an anchorless zero count: " + brief(c[6]));
    check(c[7].outcome === "pass", "the control: " + brief(c[7]));
    // A request that a handler issues 600 ms after click() returned is inside the settle window (it fails if the wait is removed).
    check(c[8].outcome === "pass", "a request after the click returned: " + brief(c[8]));
    // The POST of the first click is before the window of the last interaction (it fails if the window starts at the first interaction).
    check(c[9].outcome === "pass", "the window opens at the last interaction: " + brief(c[9]));
    check(c[10].outcome === "pass", "sixty requests: " + brief(c[10]));
    // A case that carries the step blocks service workers (no hit on its worker script); the control case registers its worker.
    check(c[11].outcome === "pass", "the page that registers a worker, workers blocked: " + brief(c[11]));
    check(c[12].outcome === "pass", "the control page registers its worker when the case carries no expect_requests step: " + brief(c[12]));
    check((swHits["/sw-a.js"] || 0) === 0, "a worker script was fetched although workers are blocked for a case that carries the step: " + swHits["/sw-a.js"]);
    check((swHits["/sw-b.js"] || 0) >= 1, "the control page never fetched its worker script, so the blocked case proves nothing: " + swHits["/sw-b.js"]);
    check(posts.length >= 7 && posts.every((p) => p.startsWith("/avatar")), "the page was expected to send POSTs to the loopback server and nothing else, got " + posts.length + ": " + posts.slice(0, 5).join(","));
    // The whole path is matched and counted: the distinguishing text of this request lies only past character 200 (both cases fail if the recorded path is cut before it is matched).
    check(c[13].outcome === "pass", "a tail past character 200: " + brief(c[13]));
    check(c[14].outcome === "fail" && c[14].reason === "step 4: the page issued 1 matching request(s); 0 were expected", "a zero count on a request issued past character 200: " + brief(c[14]));
    check(c[15].outcome === "pass", "the straddling secret case: " + brief(c[15]));

    // The evidence of a passing case: method, host, path and the counts, and nothing else.
    const rel = c[0].steps[3] && c[0].steps[3].evidence;
    check(typeof rel === "string" && /\/evidence\/case-1\.requests-4\.json$/.test(rel), "the step evidence path: " + rel);
    if (typeof rel === "string") {
      const doc = JSON.parse(readFileSync(join(root, ...rel.split("/")), "utf8"));
      check(Object.keys(doc).sort().join(",") === "action,expected,method,observed,requests,result,step,truncated", "the evidence keys: " + Object.keys(doc));
      check(doc.action === "expect_requests" && doc.step === 4 && doc.method === "POST" && doc.expected === 1 && doc.observed === 1 && doc.result === "passed" && doc.truncated === false, "the evidence header: " + JSON.stringify(doc));
      check(doc.requests.length === 1 && Object.keys(doc.requests[0]).sort().join(",") === "host,method,path" && doc.requests[0].path === "/avatar" && doc.requests[0].method === "POST" && doc.requests[0].host === base.replace("http://", ""), "the recorded request: " + JSON.stringify(doc.requests));
    }
    const secretRel = c[5].steps[2] && c[5].steps[2].evidence;
    if (typeof secretRel === "string") {
      const doc = JSON.parse(readFileSync(join(root, ...secretRel.split("/")), "utf8"));
      check(doc.requests.length === 1 && doc.requests[0].path === "/avatar/[REDACTED]", "a registered secret in a path must be masked: " + JSON.stringify(doc.requests));
    } else {
      check(false, "the secret-path case has no step evidence");
    }
    // More matching requests than the list holds: the count stays exact, the list is cut and says so.
    const manyRel = c[10].steps[3] && c[10].steps[3].evidence;
    if (typeof manyRel === "string") {
      const doc = JSON.parse(readFileSync(join(root, ...manyRel.split("/")), "utf8"));
      check(doc.expected === 60 && doc.observed === 60 && doc.truncated === true && doc.requests.length === 50 && doc.result === "passed", "the truncated evidence: " + JSON.stringify([doc.expected, doc.observed, doc.truncated, doc.requests.length, doc.result]));
    } else {
      check(false, "the sixty-request case has no step evidence");
    }
    // The 200 characters are a cap on the written listing only: the count above was decided on the whole path, the listed path is its first 200 characters.
    const tailRel = c[13].steps[3] && c[13].steps[3].evidence;
    if (typeof tailRel === "string") {
      const doc = JSON.parse(readFileSync(join(root, ...tailRel.split("/")), "utf8"));
      check(doc.observed === 1 && doc.requests.length === 1 && doc.requests[0].path.length === 200 && doc.requests[0].path === TAIL.slice(0, 200), "the listed path must be the first 200 characters of the whole path: " + JSON.stringify(doc.requests.map((r) => r.path.length)));
    } else {
      check(false, "the tail case has no step evidence");
    }
    // A registered secret that crosses character 200 is replaced whole before the cut: the listing holds the marker and no prefix of the secret.
    const straddleRel = c[15].steps[2] && c[15].steps[2].evidence;
    if (typeof straddleRel === "string") {
      const doc = JSON.parse(readFileSync(join(root, ...straddleRel.split("/")), "utf8"));
      check(doc.requests.length === 1 && doc.requests[0].path === "/avatar/" + "a".repeat(182) + "[REDACTED]", "the straddling secret must be replaced whole before the cut: " + JSON.stringify(doc.requests.map((r) => r.path.slice(180))));
    } else {
      check(false, "the straddling-secret case has no step evidence");
    }
    const evidenceDir = join(runAbs, "evidence");
    const names = existsSync(evidenceDir) ? readdirSync(evidenceDir) : [];
    check(!names.some((n) => n.startsWith("case-8.requests-")), "the control case wrote a request file: " + names.join(","));
    check(!names.some((n) => n.startsWith("case-5.requests-")) && !names.some((n) => n.startsWith("case-7.requests-")), "a blocked or refused case wrote a request file");

    // No canary of any channel, and no registered secret, reaches a file of the run or a terminal stream.
    const walk = (d, acc) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; };
    const files = walk(runAbs, []).filter((p) => !p.endsWith("plan.json"));
    // The registered secret is watched whole and by its first 6 characters, so a prefix left by a cut that ran before the redaction is caught too.
    const WATCHED = [...Object.entries(CAN), ["registered secret", ENV_SECRET], ["6-character prefix of the registered secret", ENV_SECRET.slice(0, 6)]];
    for (const f of files) {
      const txt = readFileSync(f).toString("latin1");
      for (const [channel, v] of WATCHED) if (txt.includes(v)) check(false, channel + " canary reached " + f);
    }
    for (const [channel, v] of WATCHED) check(!(out.so + out.se).includes(v), channel + " canary reached the terminal");
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(root, { recursive: true, force: true });
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-absence-state.test.mjs scripts/validate/checks/qa-run-input-value.test.mjs scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs
  ```
  Before this task the action has no runtime branch and no listener, so the case that counts requests is recorded `passed` without observing anything (and the evidence assertions fail); with only Task 1 the validator accepts the step but nothing observes it. The script drives the real runner as an async child against a loopback page and a real Chromium (an in-process server must answer, so no `spawnSync`): an exact count passes, a duplicate fails with counts only, a zero count with an anchor passes, a method mismatch fails, a matching request to a non-local host blocks and never reaches the loopback server, a registered secret in a path is masked, an anchorless zero count is refused before a browser launches, a request that a handler issues 600 ms after `click()` returned is counted (it fails if the settle wait is removed), the window opens at the last interaction (a zero count after a second click passes although the first click sent a request, and fails if the window starts earlier), sixty requests give an exact count with a cut list and `truncated`, a page that registers a service worker gets no hit on its worker script in a case that carries the step while the control page registers its worker in a case that does not (so removing the context option is caught), and a case with no such step writes no request file. Three further cases pin the 200-character cap as an evidence-size cap on the written listing only: a request whose distinguishing text lies only past character 200 is counted (a `count` of 1 passes, and a `count` of 0 fails with the exact reason; both fail if the recorded path is cut before it is matched), the listed path is the first 200 characters of the whole path, and a registered secret that starts at character 190 is replaced whole in the listing (the file holds the marker and no 6-character prefix of the secret; it fails if the cut runs before the redaction). The canaries sit in the query string, the fragment, a header, the body, a cookie and an authorization token; none may reach a run file or a terminal stream. The four existing test files run unchanged (the closed lists, the absence and state steps, the input value and the grounding consumers).

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the bounded runner-side re-mint

- **ACTION**: Delivers AC-A5 (a `minted` role whose login script halts `FAILED_PROBE_MARKER_ABSENT` is run exactly once more with `--force`; a proven second attempt yields the session and a second halt leaves the role blocked with the code of that halt, which is the same code and the same fixed sentence as today when the proof fails again) and AC-A6 (no other role or halt is retried, the retry is capped by an exported number, no secret reaches a command line or a stream, and nothing new is written). In `plugins/relay/scripts/qa-run.mjs`:
  1. **The cap.** Directly after the doc comment and declaration of `RUN_REMINT_MARGIN_MS` (near the top of the file), add `export const LOGIN_REMINT_MAX_RETRIES = 1;` with a doc comment: the most times the runner runs a minted role's kit login script again, with `--force`, after it halted `FAILED_PROBE_MARKER_ABSENT`; one, because a second halt after two fresh mints is a configuration problem the operator must see and every extra run mints again and rotates the account's session; chosen, not measured, and the Phase 8 dogfood recalibrates it.
  2. **The pure decision.** Directly before the doc comment of `obtainSession` add `export function shouldRemintLogin(minted, status, code, retries)` returning `minted === true && status !== 0 && code === 'FAILED_PROBE_MARKER_ABSENT' && Number.isInteger(retries) && retries < LOGIN_REMINT_MAX_RETRIES`, with a doc comment saying the halt is emitted by the kit script only after a fresh mint, so for a minted role it is exactly "a proof failure right after a mint".
  3. **The extracted spawn.** Directly before the doc comment of `shouldRemintLogin`, add `function loginHaltCode(result)` returning the first match of `/FAILED_[A-Z_]+/` in `String(result.stderr ?? '')` or `null`, and `function runLoginScript(root, script, force)` that returns `spawnSync(process.execPath, [script, '--root', root, '--plugin-root', PLUGIN_ROOT, ...(force ? ['--force'] : [])], { shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: process.env, encoding: 'utf8', timeout: 120000 })`: the call and its options are today's, moved. It is the only `spawnSync(process.execPath` in the file.
  4. **`obtainSession`.** In the branch that today computes `force` and spawns, compute `const minted = isMintedRole(ctx, role);`, `const force = minted && mintExpiryDue(readMintExpiry(ctx.root, role), Date.now());`, `let r = runLoginScript(ctx.root, script, force);` and then
     ```js
         for (let retries = 0; shouldRemintLogin(minted, r.status, loginHaltCode(r), retries); retries++) {
           r = runLoginScript(ctx.root, script, true);
         }
     ```
     Everything after (`if (r.status === 0) { ... }`, with its secret registration) is unchanged, so a proven second attempt registers its session values exactly as a first attempt does; the failure branch becomes `const code = loginHaltCode(r); result = { ok: false, code: code ?? 'FAILED_LOGIN_UNKNOWN' };`, which is the same value as today. The `ctx.sessions` cache, the missing-script and stale-script branches and the mapping in `executeCase` are not edited. The function gains no `while`, no sleep and no new output: the retry leaves no trace in `results.json` (a second halt of the same kind carries the same code and the same fixed sentence as today, and a second run that halts otherwise carries that halt's own code through the unchanged mapping), and the stdout and stderr of a login script are never printed, logged or stored (only the `FAILED_*` code is extracted).
  Do not edit `plugins/relay/resources/auth-login.template.mjs`, add a CLI flag, add a reason code, add the text `writeFileSync(` or `renameSync(`, or add an import.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2705-2746` (the function whose spawn moves into a helper and whose result is reassigned at most once), `# SOURCE: plugins/relay/scripts/qa-run.mjs:3399-3410` (the unchanged mapping that makes a second halt a blocked case with the code of that halt) and `# SOURCE: plugins/relay/resources/auth-login.template.mjs:1582-1590` (why the halt identifies a fresh mint).
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
  import { shouldRemintLogin, LOGIN_REMINT_MAX_RETRIES } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };

  // A. The pure decision.
  const HALT = "FAILED_PROBE_MARKER_ABSENT";
  check(LOGIN_REMINT_MAX_RETRIES === 1, "the cap changed: " + LOGIN_REMINT_MAX_RETRIES);
  check(shouldRemintLogin(true, 1, HALT, 0) === true, "a minted role that halted the marker code must re-mint");
  for (const [label, args] of [
    ["the cap is reached", [true, 1, HALT, 1]],
    ["a role that is not minted", [false, 1, HALT, 0]],
    ["another halt", [true, 1, "FAILED_MINT_COMMAND", 0]],
    ["no code", [true, 1, null, 0]],
    ["a success", [true, 0, HALT, 0]],
    ["a spawn error", [true, null, null, 0]],
    ["a fractional retry count", [true, 1, HALT, 0.5]],
    ["a missing retry count", [true, 1, HALT, undefined]],
  ]) check(shouldRemintLogin(...args) === false, label + " must not re-mint");

  // B. The real runner against stub login scripts: how many times each is run and with what flag.
  const SID = "sidvalue-Zq83kd01-Hh2k9X7";
  const STUB_CANARY = "STUBCANARY-5521";
  const FEATURE = "feat";
  const RUN_REL = "PRPs/reports/feat/qa-run/20260101T101010101Z";
  const HALT_LINE = "FAILED_PROBE_MARKER_ABSENT: roles.admin.browserProbe.marker never became stably visible after the login (no element matched it); nothing was saved";
  // The server echoes the cookie it received, so a session value that was never registered would reach the evidence.
  const server = createServer((req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, c: String(req.headers.cookie || "") })); });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const base = "http://127.0.0.1:" + server.address().port;
  const state = { cookies: [{ name: "sid", value: SID, domain: "127.0.0.1", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] };
  const stub = (haltsFirst, haltLine) => `import { appendFileSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
  import { join } from "node:path";
  const root = process.argv[process.argv.indexOf("--root") + 1];
  const log = join(root, "calls.log");
  const extras = process.argv.slice(2).filter((a, i, all) => a !== "--root" && a !== "--plugin-root" && all[i - 1] !== "--root" && all[i - 1] !== "--plugin-root");
  appendFileSync(log, "args:" + extras.join(" ") + "\\n");
  const calls = readFileSync(log, "utf8").split("\\n").filter(Boolean).length;
  process.stdout.write("${STUB_CANARY} stdout\\n");
  if (calls <= ${haltsFirst}) { process.stderr.write(${JSON.stringify(haltLine)} + " ${STUB_CANARY}\\n"); process.exit(1); }
  mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });
  writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), ${JSON.stringify(JSON.stringify(state))});
  `;
  const roots = [];
  const makeRoot = (mechanism, haltsFirst, haltLine, cases = 1, sidecar = null) => {
    const root = mkdtempSync(join(tmpdir(), "relay-qa-v2p6-remint-"));
    roots.push(root);
    const runAbs = join(root, ...RUN_REL.split("/"));
    mkdirSync(runAbs, { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    const block = (i) => ["### Case " + i, "**Title:** Case " + i, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + Array.from({ length: cases }, (_, i) => block(i + 1)).join("\n") + "\n## Notes\n\nnone\n");
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { admin: { mechanism, sessionCookie: "sid" } } }));
    writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), stub(haltsFirst, haltLine));
    if (sidecar !== null) {
      mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });
      writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.mint.json"), JSON.stringify({ minted_at: new Date().toISOString(), expires_at: sidecar }));
    }
    const plan = Array.from({ length: cases }, (_, i) => ({ index: i + 1, title: "Case " + (i + 1), driver: "http", role: "admin", state: "role-only", steps: [{ action: "request", method: "GET", path: "/ok", expect_status: 200 }] }));
    writeFileSync(join(runAbs, "plan.json"), JSON.stringify({ schema_version: 1, cases: plan }));
    return { root, runAbs };
  };
  const runIt = (root) => new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL], { cwd: root, env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(root) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let so = ""; let se = "";
    child.stdout.on("data", (d) => (so += d));
    child.stderr.on("data", (d) => (se += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on("error", (e) => { clearTimeout(timer); rejectP(e); });
    child.on("close", (code) => { clearTimeout(timer); resolveP({ code, so, se }); });
  });
  // One entry per run of the stub: "plain" when it got only --root and --plugin-root, else the extra arguments it got.
  const calls = (root) => (existsSync(join(root, "calls.log")) ? readFileSync(join(root, "calls.log"), "utf8").split("\n").filter(Boolean).map((l) => l.replace(/^args:/, "") || "plain") : []);
  const results = (runAbs) => JSON.parse(readFileSync(join(runAbs, "results.json"), "utf8"));
  const brief = (x) => JSON.stringify([x.outcome, x.reason_code, x.reason]);
  const walk = (d, acc) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; };
  const PROBE_REASON = "the kit" + String.fromCharCode(39) + "s session probe for role admin halted; nothing was saved or reused";
  try {
    // One halt, then a proven session: the second run carries --force, the case passes, the session is cached for the second case.
    const a = makeRoot("minted", 1, HALT_LINE, 2);
    const ra = await runIt(a.root);
    check(ra.code === 0, "scenario 1 exited " + ra.code + ": " + ra.se);
    const resA = results(a.runAbs);
    check(resA.cases[0].outcome === "pass" && resA.cases[1].outcome === "pass", "scenario 1 outcomes: " + resA.cases.map(brief).join(" | "));
    check(calls(a.root).join(",") === "plain,--force", "scenario 1 calls: " + calls(a.root).join(","));
    // The session of the SECOND attempt was registered: the server echoed its cookie into the evidence and it is masked.
    const evA = resA.cases[0].evidence[0];
    check(typeof evA === "string" && existsSync(join(a.root, ...evA.split("/"))), "scenario 1 left no evidence file: " + evA);
    if (typeof evA === "string" && existsSync(join(a.root, ...evA.split("/")))) {
      const evText = readFileSync(join(a.root, ...evA.split("/")), "utf8");
      check(evText.includes("[REDACTED]") && !evText.includes(SID), "the second attempt session value was not masked in the evidence");
    }

    // Two halts: blocked with the same code and the same fixed sentence, exactly one more run.
    const b = makeRoot("minted", 99, HALT_LINE, 1);
    const rb = await runIt(b.root);
    check(rb.code === 0, "scenario 2 exited " + rb.code + ": " + rb.se);
    const cb = results(b.runAbs).cases[0];
    check(cb.outcome === "blocked" && cb.reason_code === "FAILED_PROBE_MARKER_ABSENT" && cb.reason === PROBE_REASON, "scenario 2: " + brief(cb));
    check(calls(b.root).join(",") === "plain,--force", "scenario 2 calls: " + calls(b.root).join(","));

    // Another halt is never retried.
    const c = makeRoot("minted", 99, "FAILED_MINT_COMMAND: the declared mint command failed", 1);
    const rc = await runIt(c.root);
    check(rc.code === 0, "scenario 3 exited " + rc.code);
    const cc = results(c.runAbs).cases[0];
    check(cc.outcome === "blocked" && cc.reason_code === "FAILED_MINT_COMMAND", "scenario 3: " + brief(cc));
    check(calls(c.root).join(",") === "plain", "scenario 3 calls: " + calls(c.root).join(","));

    // A role that is not minted is never retried: the code and the sentence are today.
    const d = makeRoot("form", 99, HALT_LINE, 1);
    const rd = await runIt(d.root);
    check(rd.code === 0, "scenario 4 exited " + rd.code);
    const cd = results(d.runAbs).cases[0];
    check(cd.outcome === "blocked" && cd.reason_code === "FAILED_PROBE_MARKER_ABSENT" && cd.reason === PROBE_REASON, "scenario 4: " + brief(cd));
    check(calls(d.root).join(",") === "plain", "scenario 4 calls: " + calls(d.root).join(","));

    // A session already inside the pre-run margin starts forced; the retry is forced again, once.
    const e = makeRoot("minted", 99, HALT_LINE, 1, new Date(Date.now() + 1000).toISOString());
    const re = await runIt(e.root);
    check(re.code === 0, "scenario 5 exited " + re.code);
    check(calls(e.root).join(",") === "--force,--force", "scenario 5 calls: " + calls(e.root).join(","));

    // The streams of a login script are never relayed: no canary, no session value, in any run file or terminal stream.
    for (const f of [a, b, c, d, e]) {
      for (const p of walk(f.runAbs, []).filter((x) => !x.endsWith("plan.json"))) {
        const txt = readFileSync(p).toString("latin1");
        for (const v of [STUB_CANARY, SID]) if (txt.includes(v)) check(false, "a login-script value reached " + p);
      }
    }
    for (const r of [ra, rb, rc, rd, re]) for (const v of [STUB_CANARY, SID]) check(!(r.so + r.se).includes(v), "a login-script value reached the terminal");
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await new Promise((r) => server.close(() => r(null)));
    for (const r of roots) rmSync(r, { recursive: true, force: true });
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-minted-session.test.mjs scripts/validate/checks/qa-run-kit-hardening.test.mjs scripts/validate/checks/qa-run-contract.test.mjs
  ```
  Before this task the export does not exist, so the import fails and the command exits non-zero (and scenario 1 would be blocked after one run). Section A calls the real pure decision; section B drives the real runner with an async `spawn` against hand-written stub login scripts that count their own runs and record every argument they get beyond `--root` and `--plugin-root`: one halt then a session passes both cases with two runs, the second carrying exactly `--force`, and the second attempt's session value (echoed by the server into the evidence) is masked, which fails if its secrets are not registered; two halts block with the unchanged code and sentence after exactly two runs, another halt and a role that is not minted are run once, a pre-run forced run is forced again once, and no canary of a login script's streams reaches a file or a terminal stream. The three existing test files run unchanged: the minted-session control that a role that is not minted never gets `--force`, the kit-hardening test whose `mechanism: 'api'` role must see one run, and the contract test.

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — the `expect_requests` example and paragraphs, the re-mint paragraph and one honesty bullet

- **ACTION**: Delivers AC-A7 (the doc, the runner and the contract match: a marked literal flat example that validates against the script, the window in seconds that the exported constant carries, what is recorded and what is never read, the re-mint stated with its cap). In `plugins/relay/commands/relay-qa-run.md`, with LF line endings, hard-wrapped prose of about 92 columns, and each pinned token below on ONE physical line (the contract uses a raw `includes` on the text). The edit is purely additive: no existing line is changed or removed.
  1. Directly after the `expect_state` paragraph (it ends `is read as Playwright reports its checked state.`) and before the paragraph that starts `Grounding rules.`, insert, as blocks separated by one blank line each:
     - the line `A literal `browser` step that counts the requests the page issues:`
     - the marker line `<!-- qa-step-example driver=browser -->` immediately followed by a fenced `json` block holding exactly one line: `{ "action": "expect_requests", "method": "POST", "url_contains": "/avatar", "count": 1 }`
     - this paragraph (keep these three tokens each unbroken on a line: `` `expect_requests` ``, `` `url_contains` `` and `2 seconds after the step starts`; the window in seconds follows `EXPECT_REQUESTS_SETTLE_MS`):
       ```
       `expect_requests` takes a `method` (`GET`, `HEAD`, `POST`, `PUT`, `PATCH` or `DELETE`), a
       `url_contains` and an integer `count` from 0 to 100, and takes no locator, no `selector`
       and no `session`. `url_contains` starts with a single `/` and carries no query string,
       fragment or whitespace; a character the URL parser encodes is matched in its encoded
       form. The step counts the requests of the page whose method equals `method` and
       whose path contains `url_contains`, from the start of the case's last `goto`, `click` or
       `fill` step until 2 seconds after the step starts, and it passes only when that number
       equals `count`. Each redirect hop is a request of its own, a popup, a worker and a
       WebSocket are not observed, and a case that carries this step runs with service workers
       blocked, so none can answer a request out of sight. The step is valid only after a `goto`,
       `click` or `fill` step of the same case, and a `count` of 0 also needs a positive step on
       the same route since the last `goto`, as `expect_not_visible` does; otherwise the entry is
       `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested.
       ```
     - this paragraph:
       ```
       A matching request to a host the local-only guard does not approve was aborted before it
       left the machine and blocks the case `FAILED_NON_LOCAL_TARGET` with nothing asserted, and
       a request to such a host that does not match the step is ignored. The evidence file
       `evidence/case-<index>.requests-<step>.json` records the method, the expected count, the
       observed count and, for each matching request, only its method, host and path (at most
       50 are listed, with `truncated` set past that, and the observed count stays exact): the
       query string and the fragment are dropped, and no header, cookie, token or body is ever
       read. A path can still carry an identifier the redaction table does not recognize, so
       the file sits in the ignored `evidence/` directory, and for the step `results.json`
       carries only the result, the counts of a failing reason and the path of that file.
       ```
  2. Directly after the paragraph that ends `declared as `sessionCookie` or in `api_origins`.` (the Phase B minted paragraph, which is not edited) add, after one blank line, this paragraph. It must start exactly with `A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT`` on one line, and the token `at most once per role per run` must be unbroken (the number follows `LOGIN_REMINT_MAX_RETRIES`):
     ```
     A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT` right after it minted
     (the application may have been too cold for the declared marker to appear) is run once more
     by the runner with `--force`, at most once per role per run (each `ground` command is a run
     of its own): the runner runs only the kit login script again, with the same arguments plus
     that flag and never the mint command, and the script runs its own local-only guard before
     its mint command. A proven second attempt yields the session, and a second halt leaves the
     role blocked with the code of that halt, which is `FAILED_PROBE_MARKER_ABSENT` again when
     the proof fails again. A role whose mechanism is not `minted`, and every other halt, is
     never retried, and the login template and its stamp are unchanged.
     ```
  3. In the honesty rules, directly after the bullet that starts `- Plan a `ground` prefix only from the `goto`, `click` and `fill` steps of the case itself` (its three lines included), add this bullet, with the two-space continuation indent the other bullets use:
     ```
     - Plan `expect_requests` only when the report's own step asks how many requests an action
       issues, with `method`, `url_contains` and `count` taken from the report's own steps and
       after the `goto`, `click` or `fill` step that triggers them; never to confirm that a page
       rendered.
     ```
  Do not edit the `expect_value`, `expect_not_visible`, `expect_state` or `optional session` paragraphs (each paragraph start must stay unique and four pinned phrases live in them), the classification and catalogue tables, the `json` blocks that exist, the `### Record resolution` section, the Phase B minted paragraph or the final output surface. Do not write any of these anywhere (tests ban them): `design-spec`, `relay-auth-setup`, `subagent_type`, `.claude/PRPs`, `--local-host`, `PRPs/metrics`, `Until seeds`, `not yet read by the runner`, `a CLI, a database query`, `leave the case to the script`, `You write no plan entry for this`, `are all registered for redaction`, `Write ONLY the cases`, a bullet that starts `- Omit any case`, the phrase `omit the case` in any case, any line that quotes the two-dot `git diff` range form, or a backticked bare resource basename.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:297-315` (the example-and-paragraph shape and the insertion point), `# SOURCE: plugins/relay/commands/relay-qa-run.md:709-720` (the Phase B paragraph the new one follows) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:651-661` (the honesty bullets).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  BASE=91b47953efdac30a2f1b89e1f100c1874cdfa880
  git cat-file -e "${BASE}^{tree}"
  BASE_TREE="$BASE" node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { execFileSync } from "node:child_process";
  import { EXPECT_REQUESTS_SETTLE_MS, LOGIN_REMINT_MAX_RETRIES } from "./plugins/relay/scripts/qa-run.mjs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  import { runPluginRootResolvableCheck } from "./scripts/validate/checks/plugin-root-resolvable.mjs";
  import { runPathExistenceCheck } from "./scripts/validate/checks/path-existence.mjs";
  import { runDiffBaseFormCheck } from "./scripts/validate/checks/diff-base-form.mjs";
  import { runMetricsIsolationCheck } from "./scripts/validate/checks/metrics-isolation.mjs";
  import { runLineEndingsCheck } from "./scripts/validate/checks/line-endings.mjs";
  import { runAuthLocalGuardSitesCheck } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const Q = String.fromCharCode(39);
  const FILE = "plugins/relay/commands/relay-qa-run.md";
  const doc = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  const base = execFileSync("git", ["show", process.env.BASE_TREE + ":" + FILE], { encoding: "utf8", maxBuffer: 16777216 }).replace(/\r\n/g, "\n");
  const lines = doc.split("\n");
  const flat = doc.replace(/\s+/g, " ");
  const onOneLine = (token) => lines.some((l) => l.includes(token));

  // The edit adds lines and deletes none. `git diff --numstat` prints one line per file: added, TAB, deleted, TAB, path
  // (for example 12 TAB 0 TAB plugins/relay/commands/relay-qa-run.md), and nothing for an unchanged file.
  const stat = execFileSync("git", ["diff", "--numstat", process.env.BASE_TREE, "--", FILE], { encoding: "utf8" }).trim().split("\t");
  check(stat.length >= 3 && Number(stat[0]) > 0 && Number(stat[1]) === 0, "the doc edit must be purely additive (added, deleted): " + stat.join(" "));

  // Pinned tokens: one physical line each, and the numbers follow the exported constants.
  check(LOGIN_REMINT_MAX_RETRIES === 1, "the doc says once and the cap is no longer 1");
  const windowPhrase = (EXPECT_REQUESTS_SETTLE_MS / 1000) + " seconds after the step starts";
  for (const token of ["`expect_requests` takes a `method`", "`url_contains`", windowPhrase, "at most once per role per run", "A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT`", "`--force`"]) {
    check(onOneLine(token), "no physical line carries " + token);
  }

  // Fragments of the ACTION text, whitespace-collapsed on the doc side because the doc hard-wraps.
  for (const fragment of [
    "A literal `browser` step that counts the requests the page issues:",
    "takes no locator, no `selector` and no `session`.",
    "starts with a single `/` and carries no query string, fragment or whitespace; a character the URL parser encodes is matched in its encoded form.",
    "and it passes only when that number equals `count`.",
    "Each redirect hop is a request of its own",
    "a case that carries this step runs with service workers blocked",
    "a `count` of 0 also needs a positive step on the same route since the last `goto`",
    "blocks the case `FAILED_NON_LOCAL_TARGET` with nothing asserted",
    "a request to such a host that does not match the step is ignored",
    "only its method, host and path (at most 50 are listed, with `truncated` set past that, and the observed count stays exact)",
    "no header, cookie, token or body is ever read",
    "for the step `results.json` carries only the result, the counts of a failing reason and the path of that file",
    "A proven second attempt yields the session, and a second halt leaves the role blocked with the code of that halt, which is `FAILED_PROBE_MARKER_ABSENT` again when the proof fails again.",
    "A role whose mechanism is not `minted`, and every other halt, is never retried",
    "with the same arguments plus that flag and never the mint command",
    "- Plan `expect_requests` only when the report" + Q + "s own step asks how many requests an action issues",
  ]) check(flat.includes(fragment), "the doc lacks: " + fragment);

  // The example: marked, flat, a new fence right after the expect_state one, every other fence untouched.
  const fences = (t) => [...t.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const baseFences = fences(base);
  const stateAt = baseFences.findIndex((f) => f.includes("\"action\": \"expect_state\""));
  check(stateAt !== -1, "the base doc lost its expect_state example");
  const example = "{ \"action\": \"expect_requests\", \"method\": \"POST\", \"url_contains\": \"/avatar\", \"count\": 1 }";
  check(JSON.stringify(fences(doc)) === JSON.stringify([...baseFences.slice(0, stateAt + 1), example, ...baseFences.slice(stateAt + 1)]), "the json fences are not the base fences plus the new example right after the expect_state one");
  check(doc.includes("<!-- qa-step-example driver=browser -->\n```json\n" + example + "\n```"), "the example lacks its marker or is not flat");

  // Placement. RELAY-FIRST-MATCH-INTENDED: each anchor is asserted to occur exactly once, so indexOf is unambiguous.
  const at = (s) => { const n = doc.split(s).length - 1; check(n === 1, "an anchor must occur once, found " + n + ": " + s.slice(0, 60)); return doc.indexOf(s); };
  const afterState = at("is read as Playwright reports its checked state.");
  const exampleAt = at(example);
  const rulesAt = at("Grounding rules. Write a locator step only for an entry");
  check(afterState < exampleAt && exampleAt < rulesAt, "the example block must sit between the expect_state paragraph and the grounding rules");
  const mintedEnd = at("declared as `sessionCookie` or in `api_origins`.");
  const remintAt = at("A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT`");
  check(mintedEnd < remintAt, "the re-mint paragraph must follow the minted paragraph");
  const startsAt = (prefix) => lines.map((l, i) => (l.startsWith(prefix) ? i : -1)).filter((i) => i !== -1);
  const groundBullets = startsAt("- Plan a `ground` prefix");
  const requestBullets = startsAt("- Plan `expect_requests`");
  check(requestBullets.length === 1 && groundBullets.length === 1 && requestBullets[0] > groundBullets[0], "exactly one expect_requests honesty bullet, after the one ground prefix bullet");
  if (requestBullets.length === 1) check(lines[requestBullets[0] + 1].startsWith("  ") && lines[requestBullets[0] + 2].startsWith("  "), "the bullet continuation lines must be indented by two spaces");

  // Pins kept: paragraph openings are unique, and every ban holds on the doc and was absent from the base.
  const paragraphs = doc.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim());
  for (const start of ["`expect_requests` takes", "`expect_value` takes `role` and `name`", "`expect_not_visible` takes `role` and `name`", "`expect_state` takes `role` and `name`", "The optional `session` key"]) {
    check(paragraphs.filter((p) => p.startsWith(start)).length === 1, "exactly one paragraph must start with " + start);
  }
  for (const phrase of ["design-spec", "relay-auth-setup", "subagent_type", "--local-host", ".claude/PRPs", "PRPs/metrics", "Until seeds", "not yet read by the runner", "a CLI, a database query", "leave the case to the script", "You write no plan entry for this", "are all registered for redaction", "Write ONLY the cases"]) {
    check(!base.includes(phrase), "the banned phrase is already in the base doc, so the ban cannot hold: " + phrase);
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
  Before this task the doc lacks the example and the paragraphs, so the first script exits non-zero (and its imports need Tasks 1 and 3). Every fragment is copied from this task's `ACTION` and matched whitespace-collapsed on the doc side (the doc hard-wraps; the short pinned tokens are matched on physical lines); the additive rule is a numstat of the doc against the tree recorded after Phase 5, so no existing sentence or pin can have moved; the fences are compared as a list against the base text; every banned phrase is first asserted absent from the base doc, so a ban can never be a phrase the base already carries. The eleven test files are the existing doc-reading and example-validating tests with their browser-driven cases skipped by name (Level 3 runs them).

### Task 5: UPDATE plugins/relay/resources/redaction-policy.md — one bullet for observed requests

- **ACTION**: Delivers AC-A4 (the policy the runner is documented against states exactly what an observed request records and that nothing else is read). Insert, directly after the `Post-interaction snapshots` bullet (it ends `written.`) at the end of the `### Snapshots, screenshots and personal data` subsection and before the blank line and the `---` line, this bullet (column zero, continuation lines indented two spaces, no blank line inside it). Every claim in it is true of every file the new code writes: the evidence file holds method, host and path of matching requests and counts, and the path is not claimed to be free of identifiers:
  ```
  - **Observed requests.** An `expect_requests` step watches the requests the page issues,
    and the runner reads nothing from a request but its method and its URL: never a header,
    a cookie, a token or a body. For each request that matches the step the evidence file
    records the method, the host and the path (at most 50 are listed, the observed count
    staying exact), with the query string and the fragment dropped in memory, and the
    expected and observed counts. A registered secret that
    appears in a path is masked like any evidence string, but a path can still carry an
    identifier or a name the table does not recognize, so the file lives under the run
    directory's ignored `evidence/`, whose ignore rule is proven before anything is
    written, and for the step `results.json` carries only the result, the counts of a
    failing reason and the path of that file.
  ```
  Keep the bullet label of every other bullet, the section and subsection headings (`auth-secrecy` pins `## QA runner evidence: session values, snapshots, screenshots and personal data`, `### Session values are registered source-first` and `### Snapshots, screenshots and personal data`), the tokens `git check-ignore`, `FAILED_IGNORE_UNPROVEN`, `not-applicable`, `grounding/`, `evidence/`, `.gitignore`, `PRPs/redaction-extensions.txt` and the two floor numbers untouched, and the edit purely additive. Do not name any resource file by basename (the resource-basename rule of `plugin-root-resolvable`) and do not add a heading line inside the section.
- **MIRROR**: `# SOURCE: plugins/relay/resources/redaction-policy.md:244-257` (the bullet the new one follows; same label shape and continuation indentation).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  BASE=91b47953efdac30a2f1b89e1f100c1874cdfa880
  git cat-file -e "${BASE}^{tree}"
  BASE_TREE="$BASE" node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { execFileSync } from "node:child_process";
  import { runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
  import { runPluginRootResolvableCheck } from "./scripts/validate/checks/plugin-root-resolvable.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const FILE = "plugins/relay/resources/redaction-policy.md";
  const policy = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  // `git diff --numstat` prints added, TAB, deleted, TAB, path per changed file (for example 10 TAB 0 TAB plugins/relay/resources/redaction-policy.md).
  const stat = execFileSync("git", ["diff", "--numstat", process.env.BASE_TREE, "--", FILE], { encoding: "utf8" }).trim().split("\t");
  if (!(stat.length >= 3 && Number(stat[0]) > 0 && Number(stat[1]) === 0)) fail("the policy edit must be purely additive (added, deleted): " + stat.join(" "));
  const bullet = /- \*\*Observed requests\.\*\*[\s\S]*?\n(?:\n|$)/.exec(policy);
  if (bullet === null) fail("the Observed requests bullet is missing");
  const flat = bullet[0].replace(/\s+/g, " ");
  for (const needle of [
    "the runner reads nothing from a request but its method and its URL",
    "never a header, a cookie, a token or a body",
    "at most 50 are listed, the observed count staying exact",
    "with the query string and the fragment dropped in memory",
    "masked like any evidence string",
    "a path can still carry an identifier or a name the table does not recognize",
    "ignored `evidence/`",
    "for the step `results.json` carries only the result, the counts of a failing reason and the path of that file",
  ]) if (!flat.includes(needle)) fail("the bullet lacks: " + needle + " | " + flat);
  // RELAY-FIRST-MATCH-INTENDED: each bullet label occurs exactly once in the policy, so the two indexOf results are unambiguous.
  const post = policy.indexOf("- **Post-interaction snapshots.**");
  const mine = policy.indexOf("- **Observed requests.**");
  if (!(post !== -1 && mine > post)) fail("the new bullet must follow the Post-interaction snapshots bullet");
  if (policy.split("- **Observed requests.**").length !== 2) fail("the bullet label must occur once");
  if (/^#{1,6} /m.test(bullet[0])) fail("a heading line sits inside the bullet");
  const next = policy.slice(mine + bullet[0].length - 1).split("\n")[1];
  if (next !== "---") fail("the bullet must be the last item before the rule: " + JSON.stringify(next));
  for (const run of [runAuthSecrecyCheck, runPluginRootResolvableCheck]) {
    const r = run();
    if (!r.ok) fail(r.name + " failed: " + JSON.stringify(r.findings, null, 2));
  }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/auth-secrecy.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs
  ```
  The prose is the whole deliverable of this task, so a text match on the eight phrases is the effect check; the additive numstat, the two registered checks and the three existing test files prove that no pinned heading, token, bullet or section bound moved.

### Task 6: UPDATE plugins/relay/commands/relay-auth-scripts.md — one paragraph stating which roles `--refresh` covers

- **ACTION**: Delivers AC-A8 (AC-19, the Could item, kept to the smallest statement the criterion allows: it states which roles a run selects and which scripts `--refresh` regenerates, so that a kit narrower than the matrix is refreshed for its own roles only; it documents the behavior the command already has and changes no script, no template, no behavior and no other sentence). In `plugins/relay/commands/relay-auth-scripts.md`, insert after one blank line, directly after the paragraph that ends `It never touches a session, a token, `credentials.json` or `credentials.example.json`.` and before the line that starts `Write `PRPs/auth/credentials.example.json``, this paragraph (hard-wrapped; keep `Which roles `--refresh` covers.` on its first line; the edit is purely additive):
  ```
  Which roles `--refresh` covers. A run selects the roles of the model's matrix, narrowed by
  `--role`, and `--refresh` regenerates only the scripts of those roles that already exist: a
  selected role with no `PRPs/auth/login-<role>.mjs` script is generated exactly as without
  `--refresh` and is not reported as refreshed, so a kit narrower than the matrix is
  refreshed for its own roles only. A role the kit holds that the model's matrix does not
  list is not selected, and its script is left as it is.
  ```
  Do not edit the `--refresh` argument bullet, the usage line, the `argument-hint`, any sentence of the two paragraphs that describe `--refresh`, the written-file bullet or any other line. The text must not contain `design-spec`, `/relay-qa-run`, `relay-auth-setup`, `.claude/PRPs` or `--local-host` (whole-file bans of `auth-scripts-command.test.mjs`), and `auth-local-guard.mjs` and `FAILED_NON_LOCAL_TARGET` must stay in the file (the guard-site check requires both).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-auth-scripts.md:224-229` (the sentences that define which scripts a refresh regenerates) and `# SOURCE: plugins/relay/commands/relay-auth-scripts.md:237-239` (the paragraph end the new one follows).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  BASE=91b47953efdac30a2f1b89e1f100c1874cdfa880
  git cat-file -e "${BASE}^{tree}"
  BASE_TREE="$BASE" node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { execFileSync } from "node:child_process";
  import { runPluginRootResolvableCheck } from "./scripts/validate/checks/plugin-root-resolvable.mjs";
  import { runAuthLocalGuardSitesCheck } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
  import { runLineEndingsCheck } from "./scripts/validate/checks/line-endings.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const Q = String.fromCharCode(39);
  const FILE = "plugins/relay/commands/relay-auth-scripts.md";
  const doc = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  const base = execFileSync("git", ["show", process.env.BASE_TREE + ":" + FILE], { encoding: "utf8", maxBuffer: 16777216 }).replace(/\r\n/g, "\n");
  // `git diff --numstat` prints added, TAB, deleted, TAB, path per changed file (for example 6 TAB 0 TAB plugins/relay/commands/relay-auth-scripts.md).
  const stat = execFileSync("git", ["diff", "--numstat", process.env.BASE_TREE, "--", FILE], { encoding: "utf8" }).trim().split("\t");
  if (!(stat.length >= 3 && Number(stat[0]) > 0 && Number(stat[1]) === 0)) fail("the edit must be purely additive (added, deleted): " + stat.join(" "));
  const flat = doc.replace(/\s+/g, " ");
  for (const needle of [
    "Which roles `--refresh` covers. A run selects the roles of the model" + Q + "s matrix, narrowed by `--role`, and `--refresh` regenerates only the scripts of those roles that already exist:",
    "a selected role with no `PRPs/auth/login-<role>.mjs` script is generated exactly as without `--refresh` and is not reported as refreshed",
    "so a kit narrower than the matrix is refreshed for its own roles only",
    "A role the kit holds that the model" + Q + "s matrix does not list is not selected, and its script is left as it is.",
  ]) if (!flat.includes(needle)) fail("the doc lacks: " + needle);
  if (!doc.split("\n").some((l) => l.startsWith("Which roles `--refresh` covers."))) fail("the paragraph must start on its own line");
  // RELAY-FIRST-MATCH-INTENDED: both anchors occur once in the doc, so indexOf is unambiguous.
  const after = doc.indexOf("touches a session, a token, `credentials.json` or `credentials.example.json`.");
  const mine = doc.indexOf("Which roles `--refresh` covers.");
  const next = doc.indexOf("Write `PRPs/auth/credentials.example.json` with placeholder values only when");
  if (!(after !== -1 && after < mine && mine < next)) fail("the paragraph is not between the --refresh sentences and the example-file paragraph: " + [after, mine, next]);
  // The substrings other tests match after whitespace collapse are still present, byte for byte.
  for (const kept of [
    "`--refresh` — optional; regenerates the selected roles" + Q + " existing scripts from the installed template",
    "With `--refresh`, every selected role" + Q + "s script is regenerated from the installed template by the same single substitution and overwrites the existing file, each replaced script being reported.",
    "It never touches a session, a token, `credentials.json` or `credentials.example.json`.",
  ]) if (!flat.includes(kept)) fail("a pinned substring was lost: " + kept);
  for (const phrase of ["design-spec", "/relay-qa-run", "relay-auth-setup", ".claude/PRPs", "--local-host"]) {
    if (base.includes(phrase)) fail("the ban is already violated by the base doc: " + phrase);
    if (doc.includes(phrase)) fail("a banned phrase is present: " + phrase);
  }
  if (!doc.includes("auth-local-guard.mjs") || !doc.includes("FAILED_NON_LOCAL_TARGET")) fail("a guard-site token was lost");
  for (const run of [runPluginRootResolvableCheck, runAuthLocalGuardSitesCheck, runLineEndingsCheck]) {
    const r = run();
    if (!r.ok) fail(r.name + " failed: " + JSON.stringify(r.findings, null, 2));
  }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/auth-scripts-command.test.mjs scripts/validate/checks/auth-kit-commands-hardening.test.mjs scripts/validate/checks/auth-kit-minted-authoring.test.mjs
  ```
  The statement is the whole deliverable, so a whitespace-collapsed text match of its sentences is the effect check; the additive numstat, the retained pinned substrings (copied from the three existing tests that match this file) and the three test files prove that no pin moved. Before this task the paragraph is absent and the script exits non-zero.

### Task 7: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the observation helper's reads, the driver wiring, the single login spawn and its cap, the new validators' behavior and the doc tokens behind an opt-in flag

- **ACTION**: Delivers AC-A9 (the contract check is extended, not duplicated; the registered count stays 28) and the structural halves of AC-A3, AC-A4 and AC-A6 (the helper never reads a header, a cookie or a body; the login script is spawned from one site; the cap is defined once). In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Widen the import from `../../../plugins/relay/scripts/qa-run.mjs` to also import `EXPECT_REQUESTS_SETTLE_MS`, `LOGIN_REMINT_MAX_RETRIES`, `classifyObservedRequest`, `evaluateRequestWindow` and `shouldRemintLogin`.
  2. Add the input `requireNetwork` (default `false`, exactly like `requirePrefix`) to the destructured signature of `checkQaRunContract` and to its JSDoc type; add `const NETWORK_PREFIX = 'network: ';`, `const NETWORK_ACTION = 'expect_requests';` and `const NETWORK_FORBIDDEN_READS = ['.headers(', '.allHeaders(', '.headerValue(', '.headersArray(', '.postData(', '.postDataBuffer(', '.postDataJSON(', '.response(', '.cookies(', '.storageState(', '.body(', '.text(', '.json('];`; extend the file header comment with a paragraph listing the new rules. Do NOT edit the `requireVocabulary`, `requirePrefix`, `requireGround`, `requireCatalogue` or `requirePrivacy` blocks (tests pin exact finding counts from them).
  3. When `requireNetwork` is true every finding of these rules starts with the word `network:` and contains neither `step example` nor `is outside the closed vocabulary` nor the name of a catalogued reason code (a key of `REASON_CATALOGUE`; the runner halts `FAILED_PROBE_MARKER_ABSENT` and `FAILED_NON_LOCAL_TARGET` are not catalogued and may be named). In the script text: `export const EXPECT_REQUESTS_SETTLE_MS` and `export const LOGIN_REMINT_MAX_RETRIES` must each occur exactly once; `// REQUEST-OBSERVATION-BEGIN` and `// REQUEST-OBSERVATION-END` must each occur exactly once with BEGIN first (a section that cannot be located is itself a finding); the text between them must contain `.method()` and `.url()` and none of `NETWORK_FORBIDDEN_READS` (one finding per forbidden token present, naming it); the text between `DRIVERS.browser = async (` and `export function mintExpiryDue(` must contain `'expect_requests'`, `observeRequests(`, `settleRequestWindow(`, `evaluateRequestWindow(` and `serviceWorkers: 'block'`; the text between `function obtainSession(` and `async function prepareState(` must contain `shouldRemintLogin(`, `runLoginScript(` and `isMintedRole(` and must not contain `while (`; and `spawnSync(process.execPath` must occur exactly once in the whole script. Behavior pins through the imported helpers and validators (they run whether or not the script text is readable): `validateStep('browser', { action: 'expect_requests', method: 'POST', url_contains: '/avatar', count: 1 })` is `null`; it refuses `method: 'TRACE'`, `count: -1`, `count: 1.5`, `url_contains: '/a?x=1'`, `url_contains: 'avatar'`, `url_contains: '//x.example/a'`, a `selector` key and a `session` key, and refuses the step on the `http` driver; `validateSteps('browser', [step], [])` refuses a lone step, accepts `[goto, step]`, refuses `[goto, { ...step, count: 0 }]` and accepts `[goto, expect_visible, { ...step, count: 0 }]`; `classifyObservedRequest` of a local URL carrying a query string and a fragment returns exactly the keys `method`, `host`, `path` and `local`, with the path alone and neither the query value nor the fragment anywhere in its JSON, and of a non-local host returns `local: false`; `evaluateRequestWindow` passes an exact count, fails a duplicate, returns `non-local` for a matching non-local request while ignoring a non-matching one, and matches a window entry whose path is `/avat%C3%A1r` against the unencoded `url_contains` `/avatár` (so a count of 0 fails on it); and `shouldRemintLogin` is true only for a minted role, a non-zero status, the code `FAILED_PROBE_MARKER_ABSENT` and fewer than `LOGIN_REMINT_MAX_RETRIES` retries. In the command text: it must contain `expect_requests`, `url_contains`, `${EXPECT_REQUESTS_SETTLE_MS / 1000} seconds after the step starts`, `FAILED_PROBE_MARKER_ABSENT`, `--force` and `at most once per role per run` (the last follows `LOGIN_REMINT_MAX_RETRIES`: `at most ${n} times per role per run` when it is not 1), and a marked `browser` example whose action is `expect_requests` (its validity is already checked by the generic example rule).
  4. Every finding of these rules names the token, helper or marker it checks, and a null `scriptText` or `commandText` stays the single missing-file finding it is today: the new rules never throw on a null input.
  5. `runQaRunContractCheck` passes `requireNetwork: true` beside the six existing flags. No other caller changes. Add no write call, no new registered check and no new `// GUARD-SITE`-style marker text.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:263-267` (the flag beside `requirePrefix` in the signature and the JSDoc type), `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:382-398` (the script-text rules and the section markers the new block reuses) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:633-640` (the doc tokens and numbers that follow exported constants).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { checkQaRunContract, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  import { EXPECT_REQUESTS_SETTLE_MS } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const Q = String.fromCharCode(39);
  const script = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8").replace(/\r\n/g, "\n");
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const input = (o = {}) => ({ scriptText: script, commandText: doc, results: [], requireNetwork: true, ...o });
  const clean = checkQaRunContract(input());
  if (!clean.ok) fail("the real runner and doc must satisfy the network rules: " + JSON.stringify(clean.findings));
  const flagged = (label, r, token) => { if (r.ok || !r.findings.some((f) => f.message.startsWith("network:") && f.message.includes(token))) fail(label + " was not flagged naming " + token + ": " + JSON.stringify(r.findings)); };
  const without = (src, token) => { if (!src.includes(token)) fail("the mutation token is absent from the real text: " + token); return src.split(token).join("ZZ_REMOVED"); };
  const once = (src, anchor) => { const n = src.split(anchor).length - 1; if (n !== 1) fail("a marker must occur exactly once, found " + n + ": " + anchor); return anchor; };

  // Doc tokens, one finding each, naming the token; the window follows the exported constant.
  const windowPhrase = (EXPECT_REQUESTS_SETTLE_MS / 1000) + " seconds after the step starts";
  for (const token of ["expect_requests", "url_contains", windowPhrase, "at most once per role per run"]) {
    flagged("a doc without " + token, checkQaRunContract(input({ commandText: without(doc, token) })), token);
  }
  const exampleLine = "{ \"action\": \"expect_requests\", \"method\": \"POST\", \"url_contains\": \"/avatar\", \"count\": 1 }";
  // The generic example rule (not a network rule) is what refuses an example the script would refuse.
  const drifted = checkQaRunContract(input({ commandText: doc.split(exampleLine).join(exampleLine.replace("\"count\": 1", "\"count\": -1")) }));
  if (drifted.ok || !drifted.findings.some((f) => f.message.includes("does not validate"))) fail("a doc whose example no longer validates was not flagged: " + JSON.stringify(drifted.findings));
  // The network rule asks for a marked example whose action is expect_requests: a doc whose only such example became another action is flagged.
  flagged("a doc with no marked expect_requests example", checkQaRunContract(input({ commandText: doc.split("\"action\": \"expect_requests\"").join("\"action\": \"expect_visible\"") })), "expect_requests");
  for (const token of ["FAILED_PROBE_MARKER_ABSENT", "--force"]) {
    const gone = checkQaRunContract(input({ commandText: without(doc, token) }));
    if (gone.ok || !gone.findings.some((f) => f.message.startsWith("network:") && f.message.includes(token))) fail("a doc without " + token + " was not flagged by a network rule: " + JSON.stringify(gone.findings));
  }

  // Script constants, each defined once.
  for (const def of ["export const EXPECT_REQUESTS_SETTLE_MS", "export const LOGIN_REMINT_MAX_RETRIES"]) {
    flagged("a script without " + def, checkQaRunContract(input({ scriptText: without(script, once(script, def)) })), def);
    flagged("a script defining " + def + " twice", checkQaRunContract(input({ scriptText: script + "\n" + def + " = 1;\n" })), def);
  }

  // The observation cluster: markers once, in order, and nothing but the method and the URL is read.
  // RELAY-FIRST-MATCH-INTENDED: both markers are asserted to occur exactly once by once(), so replace and indexOf hit the only occurrence.
  const BEGIN = once(script, "// REQUEST-OBSERVATION-BEGIN");
  const END = once(script, "// REQUEST-OBSERVATION-END");
  if (!(script.indexOf(BEGIN) < script.indexOf(END))) fail("the observation markers are not in the expected order");
  for (const read of [".headers(", ".postData(", ".response(", ".cookies(", ".body("]) {
    flagged("a request read of " + read, checkQaRunContract(input({ scriptText: script.replace(END, "const leaked = request" + read + ");\n" + END) })), read);
  }
  flagged("a cluster whose end marker is gone", checkQaRunContract(input({ scriptText: script.replace(END, "") })), "REQUEST-OBSERVATION-END");
  flagged("a cluster whose begin marker is gone", checkQaRunContract(input({ scriptText: script.replace(BEGIN, "") })), "REQUEST-OBSERVATION-BEGIN");
  // The cluster must still read the method and the URL of a request: renaming either inside the markers is flagged.
  const clusterAt = script.indexOf(BEGIN);
  const clusterEnd = script.indexOf(END);
  const cluster = script.slice(clusterAt, clusterEnd);
  for (const token of [".method()", ".url()"]) {
    if (!cluster.includes(token)) fail("the real cluster does not contain " + token);
    flagged("a cluster without " + token, checkQaRunContract(input({ scriptText: script.slice(0, clusterAt) + cluster.split(token).join(".renamed") + script.slice(clusterEnd) })), token);
  }

  // Section-limited mutations, built from the real text (each marker is asserted to occur exactly once).
  // RELAY-FIRST-MATCH-INTENDED: every marker below is asserted unique by once(), so indexOf and the slices are unambiguous.
  const dStart = script.indexOf(once(script, "DRIVERS.browser = async ("));
  const dEnd = script.indexOf(once(script, "export function mintExpiryDue("));
  if (!(dStart < dEnd)) fail("the driver section markers are not in the expected order");
  const driver = script.slice(dStart, dEnd);
  for (const token of ["observeRequests(", "settleRequestWindow(", "evaluateRequestWindow(", Q + "expect_requests" + Q, "serviceWorkers: " + Q + "block" + Q]) {
    if (!driver.includes(token)) fail("the real driver does not contain " + token);
    const mutated = script.slice(0, dStart) + driver.split(token).join("renamedElsewhere(") + script.slice(dEnd);
    flagged("a driver without " + token, checkQaRunContract(input({ scriptText: mutated })), token);
  }
  const oStart = script.indexOf(once(script, "function obtainSession("));
  const oEnd = script.indexOf(once(script, "async function prepareState("));
  if (!(oStart < oEnd)) fail("the login section markers are not in the expected order");
  const login = script.slice(oStart, oEnd);
  for (const token of ["shouldRemintLogin(", "runLoginScript(", "isMintedRole("]) {
    if (!login.includes(token)) fail("the real login section does not contain " + token);
    const mutated = script.slice(0, oStart) + login.split(token).join("renamedElsewhere(") + script.slice(oEnd);
    flagged("a login section without " + token, checkQaRunContract(input({ scriptText: mutated })), token);
  }
  flagged("an unbounded retry loop", checkQaRunContract(input({ scriptText: script.slice(0, oStart) + login + "\n// while (true) {}\n" + script.slice(oEnd) })), "while (");
  flagged("a second login spawn site", checkQaRunContract(input({ scriptText: script + "\nconst again = spawnSync(process.execPath, [], {});\n" })), "spawnSync(process.execPath");

  // A caller that does not opt in sees none of the new rules; a null input is a missing-file finding, never a throw.
  const quiet = checkQaRunContract(input({ requireNetwork: false, commandText: without(doc, "url_contains"), scriptText: without(script, once(script, "// REQUEST-OBSERVATION-BEGIN")) }));
  if (quiet.findings.some((f) => f.message.startsWith("network:"))) fail("the network rules leaked into a caller that did not opt in: " + JSON.stringify(quiet.findings));
  let nulls;
  try { nulls = checkQaRunContract({ scriptText: null, commandText: null, results: [], requireNetwork: true }); } catch (e) { fail("a null input threw: " + e.message); }
  if (nulls.ok) fail("null inputs must be findings");
  const real = runQaRunContractCheck();
  if (!real.ok) fail("the real-tree contract failed: " + JSON.stringify(real.findings, null, 2));
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs
  ```
  Before this task the new flag is ignored, so every `flagged(...)` assertion exits non-zero. Every mutation is built from the real script or doc text with a token asserted to be present, and every section marker is asserted unique. The behavior pins go through the imported helpers, so they cannot be mutated through text; the same behaviors are asserted directly by Tasks 1 to 3. The five existing test files run unchanged and prove the `false` default and that no other flag's block moved.

## Validation Commands

Every command below, and every per-task `VALIDATE` above, was derived by reading the current tree, then run by a delegated shell (see the verification record in `## Notes`).

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
# The diff base for this phase is the tree recorded after Phase 5 (single-argument form: working tree against the tree object).
BASE=91b47953efdac30a2f1b89e1f100c1874cdfa880
git cat-file -e "${BASE}^{tree}"
# The runner keeps the exact outcome vocabulary and the same eight plan-facing codes, the two new numbers are the chosen ones,
# and the extended checks hold on the real tree.
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
import { runAuthLocalGuardSitesCheck } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
import { OUTCOMES, REASON_CATALOGUE, EXPECT_REQUESTS_SETTLE_MS, LOGIN_REMINT_MAX_RETRIES } from "./plugins/relay/scripts/qa-run.mjs";
const fail = (m) => { console.error(m); process.exit(1); };
if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") fail("OUTCOMES changed");
const want = ["EXTERNAL_CHANNEL", "PARTIAL_REMAINDER", "PRODUCT_DEFECT", "STATE_UNCONFIRMED", "STEP_UNGROUNDED", "UNGROUNDABLE_AFTER_INTERACTION", "VISUAL_JUDGEMENT", "VOCABULARY_GAP"];
if (Object.keys(REASON_CATALOGUE).sort().join(",") !== want.join(",")) fail("the plan-facing catalogue changed: " + Object.keys(REASON_CATALOGUE).sort().join(","));
if (EXPECT_REQUESTS_SETTLE_MS !== 2000) fail("the settle window changed: " + EXPECT_REQUESTS_SETTLE_MS);
if (LOGIN_REMINT_MAX_RETRIES !== 1) fail("the re-mint cap changed: " + LOGIN_REMINT_MAX_RETRIES);
for (const r of [runQaRunContractCheck(), runAuthSecrecyCheck(), runAuthLocalGuardSitesCheck()]) if (!r.ok) fail(r.name + ": " + JSON.stringify(r.findings, null, 2));
'
# No static import of a sibling file was added to the runner (the copy-helper tests copy only the runner and the guard).
if grep -nE "^(import[^'\"]*|\} from )['\"]\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# The login template and its stamp are byte-identical to the base tree (AC-13).
template="$(git diff --name-only "$BASE" -- plugins/relay/resources/auth-login.template.mjs)"
if [ -n "$template" ]; then
  echo "FAIL: the login template changed:"; printf '%s\n' "$template"; exit 1
else
  echo "PASS: login template untouched"
fi
grep -qF "const KIT_TEMPLATE_ID = 'auth-login/2';" plugins/relay/resources/auth-login.template.mjs
# AC-14: the five frozen surfaces are byte-identical to the base tree.
frozen="$(git diff --name-only "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# Scope: apart from the PRPs/ pipeline artifacts, docs/ (the implement-time docs-sync pass owns docs/) and test files
# (authored by the test pair, never by the Implementer), only this phase's five files may differ from the base tree.
allowed="plugins/relay/commands/relay-auth-scripts.md
plugins/relay/commands/relay-qa-run.md
plugins/relay/resources/redaction-policy.md
plugins/relay/scripts/qa-run.mjs
scripts/validate/checks/qa-run-contract.mjs"
changed="$(git diff --name-only "$BASE" -- . ':(exclude)PRPs' ':(exclude)docs' ':(exclude)*.test.mjs' | sort)"
extra="$(comm -13 <(printf '%s\n' "$allowed" | sort) <(printf '%s\n' "$changed") | sed '/^$/d')"
if [ -n "$extra" ]; then
  echo "FAIL: a file outside this phase's scope changed:"; printf '%s\n' "$extra"; exit 1
else
  echo "PASS: only the five planned files changed"
fi
# No new file under plugins/ or scripts/ either: `git diff <tree>` lists tracked files only, so untracked ones are checked here.
created="$(git ls-files --others --exclude-standard -- plugins scripts ':(exclude)*.test.mjs')"
if [ -n "$created" ]; then
  echo "FAIL: a new file appeared under plugins/ or scripts/:"; printf '%s\n' "$created"; exit 1
else
  echo "PASS: no new file under plugins/ or scripts/"
fi
# The three prose edits are additive: each deletes no line of the base text. `git diff --numstat` prints one line per changed
# file as added, TAB, deleted, TAB, path (for example 43 TAB 0 TAB plugins/relay/commands/relay-qa-run.md); cut -f2 is the deleted count.
for f in plugins/relay/commands/relay-qa-run.md plugins/relay/commands/relay-auth-scripts.md plugins/relay/resources/redaction-policy.md; do
  deleted="$(git diff --numstat "$BASE" -- "$f" | cut -f2)"
  if [ "$deleted" != "0" ]; then
    echo "FAIL: $f is unchanged or deletes a line (deleted lines: ${deleted:-none})"; exit 1
  fi
done
echo "PASS: the three prose edits are additive"
# The documentation site and the two mirrored governance files are out of scope for this phase.
mirrored="$(git diff --name-only "$BASE" -- documentation docs/decisions.md docs/anti-patterns.md)"
if [ -n "$mirrored" ]; then
  echo "FAIL: documentation or a mirrored governance file changed:"; printf '%s\n' "$mirrored"; exit 1
else
  echo "PASS: documentation and mirrored governance files untouched"
fi
# The retired per-run host flag must not reappear in the files the guard-site check lists.
if grep -nF -e "--local-host" plugins/relay/commands/relay-qa-run.md plugins/relay/commands/relay-auth-scripts.md plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: --local-host appeared (forbidden by the auth-local-guard-sites check)"; exit 1
else
  echo "PASS: no --local-host"
fi
# No forbidden .claude/PRPs reference introduced by this phase's five files outside the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- plugins/relay/scripts/qa-run.mjs plugins/relay/resources/redaction-policy.md plugins/relay/commands/relay-qa-run.md plugins/relay/commands/relay-auth-scripts.md scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
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
# The whole corpus, glob quoted (about 290 s on the baseline of 2047 tests). This design makes no existing assertion stale
# (see Notes), so nothing is excluded. If the test pair finds one this analysis missed, exclude exactly those tests with
# --test-skip-pattern (never --test-name-pattern with a negative lookahead).
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** given a browser case that clicks "Salvar" and a step `{ "action": "expect_requests", "method": "POST", "url_contains": "/avatar", "count": 1 }`, the step passes only when the page issued exactly `count` requests whose method equals `method` and whose path contains `url_contains` (the whole path is compared, however long: the 200-character cap applies only to the path listed in the evidence file and never to matching or counting), counted from the start of the case's last `goto`, `click` or `fill` step until `EXPECT_REQUESTS_SETTLE_MS` after the step starts; a duplicate submit fails with the observed and expected counts and no value; a case that carries the step runs with service workers blocked, so no worker can answer a request out of sight of the listener.
- **AC-A2 (PRD AC-12, AC-10):** the step is a closed flat shape (`method`, `url_contains` as a path with no query string or fragment, an integer `count` from 0 to 100, no locator, no `selector`, no `session`, browser driver only); it is `PLAN_ENTRY_INVALID` before any side effect when no `goto`, `click` or `fill` step of the same case precedes it, and a `count` of 0 additionally needs an earlier positive step on the same route since the last `goto`, so it cannot pass on a page that never rendered; and a validated step that has no runtime branch in the browser driver blocks the case `STEP_NOT_PERFORMABLE` and is never recorded `pass`.
- **AC-A3 (PRD AC-12, AC-15):** every observed URL is guard-checked with the guard's own host predicate; a matching request to a host the guard does not approve blocks the case `FAILED_NON_LOCAL_TARGET` with nothing asserted (it was already aborted by the host-abort route before it left the machine), a non-matching one is ignored, and `qa-run.mjs` keeps exactly one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(` and no static sibling import, with `auth-local-guard-sites` passing and no new entry.
- **AC-A4 (PRD AC-12, AC-5):** the evidence file `evidence/case-<index>.requests-<step>.json`, written through the single write helper into the ignored `evidence/`, records the method, the expected and observed counts and, for each matching request, only method, host and path; a canary placed in the query string, the fragment, a header, the body, a cookie and an authorization token reaches no run file and no terminal stream, and a registered secret in a path is masked, also when it straddles the 200-character cap on a listed path (an evidence-size cap on the written listing only, applied after the redaction); `results.json` carries for the step only its result, the counts of a failing reason and the path of that file.
- **AC-A5 (PRD AC-13):** given a `minted` role whose login script halts `FAILED_PROBE_MARKER_ABSENT`, the runner runs the same script once more with `--force`, at most `LOGIN_REMINT_MAX_RETRIES` (1) times per role per run; a proven second attempt yields the session (registered for redaction like a first one) and a second halt leaves the role blocked with the code of that halt, which is the same `FAILED_PROBE_MARKER_ABSENT` and the same fixed sentence as today when the proof fails again; a `ground` command obtains the session the same way and counts as a run of its own.
- **AC-A6 (PRD AC-13, AC-15):** no role whose mechanism is not `minted`, and no halt other than `FAILED_PROBE_MARKER_ABSENT`, is retried; the second run is the one existing spawn (no new site), passes the same arguments as the first run plus `--force` and no secret on any command line, the script's streams are never printed, logged or stored, nothing new is written, and `plugins/relay/resources/auth-login.template.mjs` and `KIT_TEMPLATE_ID` are byte-identical to before.
- **AC-A7 (PRD AC-18):** `relay-qa-run.md` carries a marked literal flat `expect_requests` example that validates against the script, states the window in seconds from the exported constant, what is recorded and what is never read, the service-worker rule and the two sequence rules, documents the single re-mint with its cap, and adds one honesty bullet; the edit is additive and keeps every pinned paragraph, token and example.
- **AC-A8 (PRD AC-19):** `relay-auth-scripts.md` states which roles a run selects (the roles of the model's matrix, narrowed by `--role`) and that `--refresh` regenerates only the scripts of those roles that already exist, so that a kit narrower than the matrix is refreshed for its own roles only, and that a role the kit holds but the matrix does not list is left as it is; the statement documents the behavior the command already has, and no other sentence, script, template or behavior changes.
- **AC-A9 (PRD AC-17, AC-14):** `qa-run-contract` is extended behind the opt-in `requireNetwork` flag (the registered count stays 28), `npm run validate` passes all 28 checks and the corpus is green with no existing assertion edited by the Implementer; `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-phase content, and `OUTCOMES` and the plan-facing reason-code catalogue are unchanged.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A zero count passes vacuously (the page never rendered, the window missed the click, a service worker answered out of sight) and yields a false `pass` | M | H | The step needs an earlier `goto`, `click` or `fill` in the same case; a `count` of 0 also needs the positive anchor an absence step needs; the window opens at the interaction and closes after a fixed settle; service workers are blocked for a case that carries the step; the matching rule is a path substring that must start with `/`, so a host or a query string typed into `url_contains` is refused instead of never matching; the substring is looked up in the whole recorded path (the 200-character cap applies only to the listing in the evidence file), so a distinguishing tail past any length cannot hide a request and a count of 0 cannot pass on one that was issued |
| The fixed 2-second settle is too short for a slow handler (a false fail on a count of 1, a false pass on a count of 0) or wastes time | M | M | The number is a chosen constant, not a measurement, stated as such in the code and the doc; it is exported and pinned so a change is deliberate; a false fail is visible and the Phase 8 dogfood recalibrates it; a false pass on 0 still needs the anchor and an interaction inside the window, and the window is a stated number of seconds in the doc, so the planner knows exactly what a zero count covers (a request a handler issues later than that, measured at 3.5 seconds in the rehearsal, is outside it) |
| An observed request leaks a header, a body, a cookie, a token or a query value into evidence, a reason or a stream | L | H | The helper reads only `method()` and `url()` and keeps only method, host, path; the contract bans the readers of every other channel inside the marked cluster; the VALIDATE places a canary in six channels and scans every run file and both streams; a registered secret in a path is masked by the write helper, and the listing redacts a path before it cuts it to 200 characters, so a secret that straddles the cut is replaced whole and leaves no prefix; the doc and the policy say that a path can carry an unregistered identifier and that the file sits in the proven-ignored `evidence/` |
| A page that loads third-party assets (fonts, analytics) is blocked by every `expect_requests` case | L | M | Only a request that matches the step's method and path and targets a non-approved host blocks the case; the host-abort route already aborts the rest in every browser case today and they are ignored here |
| A second mint rotates the session of a shared account (the Phase 8 risk), or masks a real configuration problem (a wrong marker selector) at the cost of a second mint and a second probe | M | M | Exactly one retry, by an exported and pinned cap, only after the one halt that follows a fresh mint, only for a `minted` role; a second halt blocks with the code of that halt so the operator sees it; no loop, no sleep; the doc states the cost and Phase 8 plans dedicated accounts |
| The retry is invisible in `results.json`, so an operator cannot tell a first-try pass from a re-minted one | L | L | Accepted and recorded: adding a field would widen the report shape that must stay byte-identical; the kit's value-free `<role>.mint.json` sidecar records `minted_at` for anyone who needs it |
| The `--refresh` statement documents today's selection (the matrix roles) and so states plainly that a role the kit holds but the matrix does not list is not refreshed, which is the limitation F7 reported and not a fix for it | M | L | The statement is the smallest one AC-19 allows and changes no behavior; making `--refresh` cover roles outside the matrix would change the command (a new decision for the operator, with its own evidence for the fields to add), so it is recorded here and not made; a role left out stays visible because the runner halts `FAILED_KIT_SCRIPT_STALE` naming `/relay-auth-scripts --refresh` for it |
| An existing source-text anchor, doc pin or mutation anchor is disturbed (`browser.newContext(...)`, the `BROWSER_ACTIONS` list and the `spawnSync` block are edited; the corpus anchors some source mutations on exact lines) | M | M | The tasks list the pins read by the survey and the edits that touch existing lines are limited to those three; every other addition is new text; Task 4, 5 and 6 compare the unchanged regions with the base tree by an additive numstat and Level 3 runs the whole corpus, with `EXISTING_TEST_UPDATED` as the sanctioned route |
| `page.on('request')` may not fire for a request that the context route aborts, or `serviceWorkers: 'block'` may be refused by the installed Playwright | L | M | Both are exercised live by the Task 2 VALIDATE (the outside-host case and the whole run). If the event does not fire for an aborted request, the outside-host case observes nothing and fails a count of 1 instead of blocking, which the VALIDATE reports as a plan defect; the fallback is then to log from the existing route handler, which sees every request. If the context option is refused, the Implementer records it as a plan defect; taking either fallback changes what Task 4 documents (the sentence about workers) and what Task 7 pins (`serviceWorkers: 'block'`, `observeRequests(`), so those tasks are updated together with it, never one alone |
| The `VALIDATE` scripts were derived by reading | M | M | Each fails before the work for a stated reason, each drives the real code, and Level 3 runs the whole corpus; a defect found at implement time is a plan defect to record, not a reason to weaken the check |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework (several additionally run `node --test` over existing test files that this plan does not edit).
- **Verification record.** Two passes, against two trees: the real feature worktree (unmodified apart from this plan and the back-fill of PRD row 6) and a throwaway copy of it in the session scratchpad, into which a rehearsal implementation was written from the task text alone. The rehearsal is evidence about the commands, not about the eventual implementation, and it was written by the same hand as the plan, so it shares the plan's blind spots; Level 3 and the implement-time code review are what cover that. The first pass extracted the seven per-task `VALIDATE` blocks and the three Levels from the plan and ran them with a delegated shell, exit codes recorded, over five rounds, on the version the plan-reviewer judged. The second pass is the targeted revision for `R-COH-AC-TASK-DECOUPLED`: under Node v24.15.0 it re-ran only the blocks that revision touched (Tasks 1 and 2, with Task 7 as a control) and Levels 1 and 2, and the sub-bullets below say which numbers it observed and what it did not run. The host of the first pass had Playwright 1.61.1 with Chromium 149; Tasks 2 and 3 drive a real browser and fail on a host without one.
  - **Unmodified tree (each block must fail before the work).** Observed in the second pass, from the worktree root: Level 1 exits 0, because it only checks syntax, which already holds. Level 2 exits 1 on its first script, `qa-run.mjs does not provide an export named 'EXPECT_REQUESTS_SETTLE_MS'`; its `git cat-file -e` line for the base tree passed first, so the failure is the missing export and not a pruned base object, and none of Level 2's later checks was exercised on this tree in this pass. Task 1 exits 1 on the missing export `EXPECT_REQUESTS_COUNT_MAX`. Task 2 exits 1: its script ran to completion (the run itself exited normally) and printed 19 failed assertions, thirteen of them cases refused `PLAN_ENTRY_INVALID` with `unknown browser action "expect_requests"` (the real-browser scenarios report nothing sent and no step evidence, the three cases added by this revision included). `set -e` stops Tasks 1 and 2 at the failing script, so their trailing `node --test` commands did not run on this tree in this pass. `git status --porcelain` of the worktree was byte-identical before and after these runs. Observed in the first pass only and not re-run in the second: Tasks 3, 4 and 7 exit non-zero on the exports the plan imports and the tree does not have yet (`LOGIN_REMINT_MAX_RETRIES`, `EXPECT_REQUESTS_SETTLE_MS`), Tasks 5 and 6 exit non-zero because the additive check finds no added line in the policy and in `relay-auth-scripts.md`, and the trailing `node --test` command of each of Tasks 1 to 7 exited 0 on the unmodified tree, which is the claim that those test files need no edit.
  - **Rehearsal implementation (every touched block must pass after the work).** The rehearsal runner had implemented the cut-before-match behavior that this revision removes, so it was first run as it stood: the node script of Task 1 exited 1 on five assertions (the 300-character path kept whole, the tail path recorded whole, a tail-only `url_contains` counted, the zero count on a request issued past character 200, the 41-character non-ASCII `url_contains`) and the node script of Task 2 exited 1 on five (the tail case, the zero count past character 200, the length of the listed path, the straddling secret and the 6-character prefix watch). The runner was then changed in exactly two lines to follow this plan's text: the classifier keeps `u.pathname` whole, and the evidence listing maps each listed request's path through `redactText(path, ctx.table).slice(0, 200)` (`redactText` is the exported module-level function at line 770 of the worktree runner, and `writeRunFile` passes every string leaf of a json payload through it again). Observed after that, from the root of the copy: Task 1 exits 0 in 2.3 s, its trailing `node --test` of three files reporting 77 tests, 77 passed, 0 failed; Task 2 exits 0 in 81 s (about 32 s of it the script), its trailing `node --test` of four files reporting 84 tests, 84 passed, 0 failed; Task 7 exits 0 in 1.6 s, its trailing `node --test` of five files reporting 153 tests, 153 passed, 0 failed, which shows that the corrected classifier still satisfies the pins on the marked cluster. The results of the first pass for Tasks 3 to 6 and for Level 3 (`npm run validate` and the whole corpus) are not repeated here: they belong to the version the plan-reviewer judged and are not claimed for this one.
  - **Defects found by running the commands, fixed before this record.** A step index that did not exist in the Task 2 scenario; a Task 7 expectation of a `network:` prefix on a finding that the generic rule does not prefix; an apostrophe inside a single-quoted script (replaced by `String.fromCharCode(39)`); a pinned literal that the plan itself had split; a `--refresh` paragraph that claimed a behavior change contradicting Phase A; a `url_contains` that never matched once percent-encoded and one that admitted a leading `//host`; and several stale line citations and a stale count in the prose. The second pass found no defect in the commands it re-ran; the defect it corrected was found by the plan-reviewer, not by a command: a recorded path cut to 200 characters inside the classifier, before it was matched (a `url_contains` that sits only in the tail was hidden, so a count of 0 passed on a request that was issued, and a non-ASCII `url_contains` of about 34 characters or more could never match) and before the write helper redacted it (a registered secret that straddles character 200 was left as an unrecognized prefix).
  - **Mutation probes (a check that cannot fail is not a gate).** In the first pass, earlier rounds found that the blocks missed five regressions (the window start, the settle wait, the registration of a secret that appears in a path, an extra argument on the second login run, the service-worker option); the cases that were added in answer are a late request, a window that opens at the last interaction, sixty requests, a worker-registering page with a control, a cookie-echoing server and an argv log. The final batch below re-runs four of the five (window start, settle wait, extra argument, service-worker option); the secret-registration case drives the real write helper and its own mutation is not part of that batch. Each mutation was applied to the runner copy by an exact-string replacement asserted to match once, the named block run, and the file restored and compared byte-for-byte by its hash. Results of that batch, from the first pass and not re-run in the second: (g) the path needle compared without normalization makes Task 1 and Task 7 fail; (m) the needle assigned the raw `url_contains` makes Task 1 fail; (i) the `(?!\/)` guard removed from the `url_contains` pattern makes Task 1 fail ("a leading double slash was accepted"); (h) `serviceWorkers: 'block'` removed makes Task 2 fail ("a worker script was fetched although workers are blocked") and Task 7 fail; (j) the line that records the window start deleted makes Task 2 fail ("the window opens at the last interaction"); (b) `EXPECT_REQUESTS_SETTLE_MS` set to 0 makes Task 2 fail ("a request after the click returned"); (k) an extra argument on the second login run makes Task 3 fail. All seven were caught for the stated reason and all seven restores matched.
  - **Mutation probes of the second pass (the new behavior).** Each was applied to the corrected rehearsal runner by an exact-string replacement asserted to match once, the node script of the named block run, and the file restored and compared byte-for-byte by its hash. (p1) The cut re-introduced in the classifier, before the match (`path: u.pathname.slice(0, 200)`): the Task 1 script exits 1 on the five assertions named above and the Task 2 script exits 1 on its five, so both blocks catch it (the straddling secret fails as well, because that cut also runs before the redaction). (p2) The listing cut moved before the redaction (`redactText(m.path.slice(0, 200), ctx.table)`): the Task 2 script exits 1 on exactly two assertions, the straddling secret (the listed path ended `aaaaaaaaaaenvsecretv`, ten characters of the secret left as a prefix) and the 6-character prefix watch of the file scan. (p3) No cap on the listing (`redactText(m.path, ctx.table)`): the Task 2 script exits 1 on exactly one assertion, that the listed path is the first 200 characters of the whole path (it was 267). After the three restores the Task 2 script exits 0 again on the corrected runner, and every restore matched by hash.
  - **Not run.** No block was run against a real implementation (none exists yet). In the second pass Tasks 3 to 6 and Level 3 were not re-run (the revision edited none of their text), Level 2 was run only on the unmodified tree, where it stops at its first script, and the whole corpus was not re-run: no corpus count is claimed for this version of the plan (the only count it cites is the baseline of 2047 tests that the previous phase recorded on the real worktree). Each configuration of Tasks 1, 2 and 7 was run once in the second pass, and no block was run on a second host or shell.
- **What is verified by reading and what must be verified live.** Verified by reading the tree: the browser driver builds one page per case after the host-abort `context.route`, has no `page.on` listener anywhere, and its `else if` chain has no terminal `else` (a validated action with no branch is silently recorded `passed`); `obtainSession` is synchronous, has the only login spawn of the runner and caches a failure for the run; `FAILED_PROBE_MARKER_ABSENT` is emitted in exactly one place of the template, after the mint command ran and before anything is saved (the reuse path turns an `expired` proof into a re-mint and never halts with it), so for a `minted` role it is exactly a post-mint proof failure; `PROBE_BLOCK_CODES` already names the code, so a second halt is mapped to a blocked case with the code of that halt (the same code and sentence when it is `FAILED_PROBE_MARKER_ABSENT` again); the contract, the doc and the policy pins listed in the tasks. Verified by the `research-web` findings (Playwright reference, not pinned to the installed version): each redirect hop is its own `Request`; `request.url()` keeps the query string and drops the fragment (read from the main-branch source); a Service Worker can make requests invisible to network events and route handlers, and `serviceWorkers: 'block'` is the documented remedy. NOT verifiable by reading, and confirmed live by the Task 2 and Task 3 VALIDATE blocks and by the rehearsal on Playwright 1.61.1 with Chromium 149: `page.on('request')` fires for a request that the context route then aborts (the outside-host case depends on it); the installed Playwright accepts `serviceWorkers: 'block'`, and a page that registers a worker then gets no hit on the worker script while the count stays exact; two `fetch` calls issued by one click, and a request issued 600 ms after `click()` returned, are inside the 2-second window; a redirect hop is a request of its own; the requests of a popup and of a dedicated worker are not observed (the doc says so); and the second login run carries exactly `--force`. The limit that remains is the fixed window itself: a request issued 3.5 seconds after the click is outside it, so a count of 0 passes on it (the chosen limit named in Risks row 2).
- **Design decisions, recorded with their rationale.**
  - **(a) The window.** `expect_requests` is placed after the action that triggers the requests, so a listener started at the step would miss them. The listener is therefore attached when the page is created (only when the plan has the step) and logs every request of the case; the window of a step starts where the case's last `goto`, `click` or `fill` step started and ends after a fixed settle once the step starts. Rejected: a window that starts at the previous step of any kind (a `click` followed by an `expect_visible` would put the click outside it, a false fail for a count of 1 and a false pass for 0); a window that starts at the previous `expect_requests` step (it would count the page-load requests of the `goto`); and an early accept as soon as the count equals `count` (a duplicate submit, the very defect S-6 probes, arrives after the first request). The settle is a fixed wait, not a readiness heuristic: `networkidle` is documented as discouraged and no source documents a closing rule for a request window, so the number is chosen, exported, pinned and recalibrated by the dogfood.
  - **(b) What keeps a count from passing vacuously.** The step is valid only after an interaction in the same case, and a count of 0 additionally needs the positive anchor of `expect_not_visible` on the same route since the last `goto` (a page that never rendered issues no request, so an absence of requests alone proves nothing). `url_contains` must start with `/` and carry no query string, fragment or whitespace: a host or a query typed into it could never match the path the runner compares, which would make a count of 0 pass for the wrong reason, so it is refused at plan time. The path the runner compares is the whole path of the request, never cut: a cut before the match would hide a `url_contains` that sits only in the tail (a count of 0 would then pass on a request that was issued, and a non-ASCII needle whose encoded form is longer than the cut could never match), so the 200-character cap applies only to the path listed in the evidence file. The step is not a member of `POSITIVE_ASSERTION_ACTIONS`, because a request count does not show that anything rendered.
  - **(c) The guard.** Every observed URL is classified with the guard's own `isAllowedHost(hostname, allowedHosts)`, the predicate the existing context route uses, so no second predicate exists. The context route is what keeps a request from leaving the machine and it is not edited. A matching request to a non-approved host blocks the case `FAILED_NON_LOCAL_TARGET` (the runner cannot judge a count that includes a request the guard aborted, and passing would hide an outward effect); a non-matching one is ignored, because the route already aborts such requests in every browser case today and blocking on them would make a page with a font CDN unassertable. No new site or marker is added: the listener sits inside the context the one guard call approved.
  - **(d) What is recorded.** Per matching request: method, host (with an explicit port) and path (the whole path is classified, matched and counted, and the evidence listing redacts it and then cuts it to its first 200 characters, an evidence-size cap on the written listing only); per step: the expected and observed counts, a `truncated` flag past 50 listed requests and the result word. The listener reads `method()` and `url()` only; the query string and the fragment are dropped in memory before anything is stored; no header, cookie, token or body is read anywhere, and the contract bans their readers inside the marked cluster, comments included. The path is recorded because AC-12 asks for it, and a path can carry an identifier that no table registers (a user id, an e-mail address in a route): that is stated in the doc and the policy rather than claimed away, the file sits in the proven-ignored `evidence/`, and for the step `results.json` carries only its result, the counts of a failing reason and the path of that file. The cut runs after the redaction, in the driver, with the module's own `redactText`: the write helper redacts each string it is handed, so a path cut before it was handed over would leave the first characters of a registered secret that straddles character 200 as a prefix nothing recognizes, whereas a path redacted first has the whole secret replaced by its marker before the cut (the cut may fall inside the marker, which discloses nothing). The cap is a size limit for the listing, never part of the decision.
  - **(e) Service workers.** A worker can answer a page request without a network event and can issue a request of its own, so a case that carries the step creates its context with `serviceWorkers: 'block'`. A case without the step gets exactly the options it has today. The cost, stated in the doc, is that an application that needs its worker to function is not assertable this way.
  - **(f) The re-mint.** The trigger needs no new signal: the halt is emitted only by the post-login proof, so for a `minted` role it means "the mint just ran and the proof failed". The decision is a pure function of four values so a test drives it without a spawn; the loop is a `for` bounded by the exported cap, not an open-ended loop, and exhaustion is the existing blocked mapping, not a new halt. The role stays blocked with the code of the last run: the same `FAILED_PROBE_MARKER_ABSENT` and the same fixed sentence when the proof fails again (the case AC-13 states), and that halt's own code in the unlikely case that the second run halts otherwise (an interpretation the PRD leaves open, chosen because the last attempt is the more informative one). `ground` obtains the session through the same function, so a `ground` command is a run of its own and can mint once more. What happens when the kit has no mint mechanism: a role whose mechanism is not `minted` is never retried and its single attempt is cached and mapped exactly as today; a `minted` role without a confirmed mint block halts `FAILED_MINT_UNCONFIRMED` or `FAILED_MINT_COMMAND_MISSING`, which are not the retried halt. The retry runs only the kit login script (never the mint command) with today's arguments plus `--force`, so no secret is on a command line; the script's own guard runs again before its mint command; the streams are never relayed. Nothing is written by the runner for the retry, and a second mint rotates the account's session, which is why the cap is 1 and the dogfood plans dedicated accounts.
  - **(g) The Could item.** AC-19 asks that the doc state whether a refresh covers the matrix roles or the kit's roles, and that a narrower kit is refreshed for its own roles only. Phase A of `relay-auth-scripts.md` iterates the roles of the model's matrix (narrowed by `--role`) and writes a script for each, skipping an existing one without `--refresh` and overwriting it with it, so today a matrix role with no script is generated with or without the flag. The smallest statement that satisfies the criterion without changing that behavior is one paragraph: a run selects the matrix roles, `--refresh` regenerates only the scripts that already exist (so a narrower kit is refreshed for its own roles only, and a missing one is generated as without the flag), and a role the kit holds that the matrix does not list is not selected. A statement that `--refresh` covers only "the roles the kit holds" and never generates a missing role would be a behavior change by prose that contradicts Phase A, so the paragraph does not say it. The paragraph deliberately says nothing about `maxAgeMinutes` (PS20) and adds no behavior. The Phase 6 row allows a recorded operator decision to descope the three items; none is recorded, so all three are planned and the item is isolated in its own task so that dropping it removes one task and one acceptance criterion.
  - **Terminal `else`.** The browser driver's chain gets a final branch that blocks `STEP_NOT_PERFORMABLE`. It never fires for a validated step today (the locator forms leave through `continue`, the legacy forms each have a branch), and it makes the false `pass` that a missing branch would produce impossible, which is the failure the PRD's Technical Risks row 1 names. It is not a behavior change for any plan that validates.
  - **Reasons and codes.** No new reason code and no new outcome: `FAILED_NON_LOCAL_TARGET`, `STEP_NOT_PERFORMABLE`, `EVIDENCE_WRITE_FAILED` and `PLAN_ENTRY_INVALID` are existing runner-owned codes, `REASON_CATALOGUE` and `OUTCOMES` are untouched and asserted so by Level 2.
- **Diff base.** The base `91b47953efdac30a2f1b89e1f100c1874cdfa880` is the tree object recorded after Phase 5 (`git write-tree` of the index; it equals the working tree except for the PRD row this phase back-fills). It is a loose object that no ref points at, so a `git gc` that prunes could drop it; every command that uses it starts with `git cat-file -e`, so a pruned base fails loudly instead of comparing against nothing, and the operator can keep it alive with a tag on the tree before the implement run. Consumers use the single-argument `git diff <tree>`, never `<tree>..HEAD`, and per-phase code diffs exclude `PRPs/`.
- **Numbers chosen without measurement.** `EXPECT_REQUESTS_SETTLE_MS` (2000), `EXPECT_REQUESTS_COUNT_MAX` (100), `EXPECT_REQUESTS_EVIDENCE_MAX` (50), the 200-character cap on a path listed in the evidence file (an evidence-size cap, not a matching rule) and `LOGIN_REMINT_MAX_RETRIES` (1) are judgments, labeled "chosen, not measured" where they are defined, in the doc where the reader meets them, and recalibrated by the Phase 8 dogfood. The retry cap of 1 is also the number AC-13 states.
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A9).** AC-A1 and AC-A2: the accepted and refused shapes, the totality over hostile JSON and the sequence rules of this plan's Task 1 VALIDATE, in the style of `qa-run-absence-state.test.mjs:98-157` (validator tables) and `qa-run-vocabulary-pins.test.mjs:323-329` (a doc example valid as a step and refused as an entry on its own where its anchor is missing). AC-A1, AC-A3 and AC-A4 against a real browser: the shape of this plan's Task 2 VALIDATE with the conventions of `qa-run-absence-state.test.mjs:58-85` (absolute runner path, sandbox, hermetic git environment, `SLOW` timeout) and an async child (an in-process server must answer): exact, duplicate, zero with anchor, method mismatch, a matching non-local request, a non-matching non-local request ignored, a redirect hop counted on its own, a worker registered by the page (the count stays exact because workers are blocked), a request whose distinguishing text lies only past character 200 (counted on the whole path, listed cut to 200 characters), a registered secret that straddles that listing cap (replaced whole, no prefix in any file) and a canary in the query string, the fragment, a header, the body, a cookie and an authorization token with a scan of every run file and both streams. AC-A5 and AC-A6: the five scenarios of this plan's Task 3 VALIDATE with `qa-run-minted-session.test.mjs:219-233` (`makeProject`), `:240` (a login-script run counter beside the mint-command counter) and `:273-285` (`assertNoLeak`), the pure `shouldRemintLogin` table, and a role with a confirmed mint block whose script halts `FAILED_MINT_COMMAND_MISSING` (never retried). AC-A7: the example, the paragraphs and the honesty bullet in the shape of `qa-run-vocabulary-pins.test.mjs:284-366` (a marked flat example that validates, the paragraph found by its opening words, the bullet parsed like `:345-366`), and the seconds following the constant (the `WINDOW_PHRASE` pattern at `:66`). AC-A8: the paragraph in the shape of `auth-kit-commands-hardening.test.mjs:148-171` (`assertPins` over the collapsed text) with the whole-file bans of `auth-scripts-command.test.mjs:90-94`. AC-A9: the `requireNetwork` rules in the shape of `qa-run-vocabulary-pins.test.mjs:114-278` and `qa-run-privacy-pins.test.mjs:265-283` (one finding per missing token naming it, every mutation built from the real text with `once`, the prefix word on every message, silent without the flag, null inputs never throw) and the frozen-surface byte identity. The policy bullet: `qa-run-vocabulary-pins.test.mjs:368-382` style (the bullet found by `startsWith` and ended at the first non-indented line).
- **Test-pair follow-up, existing assertions: none stale.** The design was chosen so that no existing assertion goes stale, after the surveys read the pinned tests directly: `qa-run-absence-state.test.mjs:98-106` pins `POSITIVE_ASSERTION_ACTIONS` to exactly four members (`expect_requests` is not added) and `:138`, `:156` pin the http refusals (unchanged); `qa-run-contract.mjs:121` (`NEW_BROWSER_ACTIONS`, used at `:377`, `:620` and `:627-631`) is not touched; `qa-run-kit-hardening.test.mjs:406-427` runs the real runner against a stub that halts `FAILED_PROBE_MARKER_ABSENT` for a role of `mechanism: 'api'`, asserts only the outcome and the code, and sees one run because the role is not minted; its mutation anchors `const ANONYMOUS_CHECK_MS = 20000;` and `if (isObj(record)) {` (used at `:330` and `:347`, each asserted to occur exactly once at `:251`) are not duplicated; `qa-run-minted-session.test.mjs:386-400` pins that a role that is not minted never gets `--force` and its counters (`:297`, `:371`, `:382`, `:411`) count mint-command runs by the fake mint, which a retry that never fires on those fixtures does not change; `qa-run-classification.test.mjs:520` pins the S-6 row of the frozen table, which this phase does not move; `qa-run-vocabulary-pins.test.mjs:301-305`, `:345-366` and `:368-382` (paragraph openings, honesty-bullet openings, the Input values bullet) stay unique and unbroken; `qa-run-privacy-pins.test.mjs:306-328` (`240 seconds`, `--force`, `IndexedDB`, the minted halts) and `qa-run-minted-session.test.mjs:500-507` match tokens of the Phase B paragraph, which is not edited; `auth-kit-commands-hardening.test.mjs:150-169` and `auth-minted-session`-family pins on `relay-auth-scripts.md` match contiguous substrings that the new paragraph does not split; `auth-scripts-command.test.mjs:90-117` bans five whole-file strings that the paragraph does not contain; `auth-local-guard-sites.mjs:65-74` requires tokens of the two docs and the runner that stay. Not opened by any survey: the whole body of `qa-run.test.mjs`, `qa-run-session-less-request.test.mjs`, `qa-run-input-value.test.mjs` and the `qa-run-grounding-prefix-*` files; Level 3 is what proves them. If the Implementer or the test pair finds an assertion this analysis missed, it is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer, and the Level 3 command then excludes exactly those tests with `--test-skip-pattern`.
- **Ordering.** Task 1 is pure and independent (it needs no browser). Task 2 needs the helpers of Task 1. Task 3 edits a separate region of `qa-run.mjs` (the cap near the top and the session section) and is independent of Tasks 1 and 2. Task 4 (doc) imports the constants of Tasks 1 and 3 in its VALIDATE and its numbers follow them. Tasks 5 and 6 are independent prose. Task 7 reads the runner and the doc (Tasks 1 to 4).
- **Research.** `research-codebase` ran twice: the step vocabulary, the browser driver, the session code, the contract and the surrounding tests with file and line anchors; and a test-impact survey of every check and test that reads the runner, the command doc, the policy or `relay-auth-scripts.md` (its scope cap was reached, which is why the unopened files are named above). `research-web` ran one round on Playwright request events, URL handling, service workers and bounded retries (its scope cap was reached; it found no authoritative source on closing a request window or on retrying a login after a post-mint probe failure, so those two numbers are judgments). The plan writer read the runner sections, the login template's reuse, mint and proof branches, the contract, the three docs and the tests quoted above. Not read: the `documentation/` pages (Phase 7 owns them) and `docs/api-reference.md` (the `docs_sync` pass owns `docs/`).
- **Scope of docs.** `docs/api-reference.md`, `docs/domain/flows.md`, `docs/domain/glossary.md` and the `documentation/` pages (`reference/commands.html`, `reference/scripts.html`, `reference/redaction-policy.html`, `changelog.html`) are not edited here: the `docs_sync` pass owns `docs/` at implement time and the site pages belong to Phase 7 per `documentation/AGENTS.md`.

*Generated: 2026-10-12*
*Approved: 2026-10-12*
*Implemented: 2026-10-12*
*Status: IMPLEMENTED*
