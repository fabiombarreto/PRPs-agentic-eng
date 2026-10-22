# Feature: Local channel sources (Phase 6 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the plan vocabulary of `qa-run.mjs`: one new browser step `read_message`; a new top-level `channel_sources` declaration in `PRPs/auth/qa-seed.json`; two new runtime halt codes outside the reason-code catalogue, `CHANNEL_SOURCE_INVALID` and `CHANNEL_UNREACHABLE`; `OUTCOMES`, `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, the four-key `counts` partition, `plan.json` and the `results.json` shape are unchanged); secret handling in run evidence (an extracted verification code is registered for redaction before anything is written, a field filled with it is masked in the captures, and no message body is ever stored); a new network-touching site under the local-only guard (the Mailpit search call) and a new store-touching site (the SMS file); an existing command doc, a knowledge-base page set and site pages amended around a script-validated vocabulary; knowledge-base edit under `docs/` with `docs_sync: true`; site-page edits under `documentation/` that existing tests bind to the script and the command doc (`documentation/AGENTS.md` applies); frozen-surface constraint (five files byte-identical); no new validate check (the count stays 28)
- Decisions found:
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` AC-15, AC-16, AC-21, AC-22 and Phase 6 scope: `channel_sources` validation and guard; `read_message` against Mailpit's search API (mocked locally in tests); the SMS file source; secrecy of extracted values; literal doc examples. Architecture Notes "Channel sources are declarations": `channel_sources` lives beside `query_sources` in `PRPs/auth/qa-seed.json`, every URL passes the local-only guard, extracted values join the redaction table before anything is written. Decisions Log "What `needs-human` may mean": a channel with no declared local source stays `EXTERNAL_CHANNEL`, class `impossible`
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the plan-side-only boundary, the single write helper, `/relay-qa-report` unchanged
  - `docs/decisions.md` [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the outcome vocabulary is a closed set, a runner pass is evidence and not approval, secrets never reach reports, the local-only guard is permanent, outward-effect cases run only against local stand-ins the project declares
  - `docs/decisions.md` [2026-04-19] "Secret redaction policy for Test Runner reports": unchanged; the extracted value joins the existing redaction table through the existing registration function, no second mechanism
  - `docs/decisions.md` [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen; `hybrid_code_review` is `false`
  - `docs/decisions.md` [2026-04-19] "PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`"
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the extracted code is the leak surface; results.json, reasons and the terminal carry fixed sentences, step positions and paths only, and the message metadata file holds the channel, the step position and the message time, never the message
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing test is predicted to go stale (see `## Notes`), and none is edited by the Implementer; any unpredicted failure is routed to the test pair as `EXISTING_TEST_UPDATED`
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic": channel sources are declared by the operator, never inferred from the product or the report
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays non-interactive and standalone
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive and standalone
  - Command versus script separation: the command plans the step; the script owns every deterministic read and mutation
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`): the Mailpit origin goes through the existing `ctx.target.guard.checkTarget` before any request, the SMS path is resolved inside the target root before any read, and no network call to a non-local host is ever made; tests use a loopback fake Mailpit, never a real mail service
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`, and `evidence/` is ignored there
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, never `<base>..HEAD` or a HEAD-relative form; this phase's base is the phase-5 end-state tree object
  - `documentation/AGENTS.md`: a change under `documentation/` carries a changelog entry under `Unreleased`; NAV and the search index change only when a page is added, renamed or removed, and no page is added here; the version bump belongs to the release cut (Phase 8)
  - `npm run validate` keeps its 28 checks and no check module is edited by this phase
  - `qa-run-contract` source-text invariants stay true: `writeFileSync(` and `renameSync(` exactly once each, `// GUARD-SITE` and `// WRITE-SITE` exactly once each, `spawnSync(process.execPath` exactly once, no quoted outcome literal outside the four values, the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` and `export function mintExpiryDue(` each exactly once, no new static sibling import and no new `import()`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 6: "Local channel sources" — Goal: read verification codes from local catchers the project declares — Success signal: a local fixture server emulating the Mailpit API yields a code that a later `fill` uses, and the secrecy scan finds it nowhere.

## Summary

This phase lets a plan read a verification code from a local mail catcher or a local file. All runner changes are in `plugins/relay/scripts/qa-run.mjs`; no check module and no test file is edited. (1) **The `read_message` step (AC-15, AC-16).** A browser plan step `{ "action": "read_message", "channel": "mail" | "sms", "to": "<address or number>", "extract": { "regex": "<one capturing group>", "as": "<variable name>" } }` joins the closed vocabulary. It takes no other key, asserts nothing (it is not an expectation), needs an earlier `goto`, `click` or `fill` step, and is refused in `http` entries by the existing unknown-action rule. The variable it binds is usable as `{{name}}` only in the steps after it: `validateSteps` learns the names bound by earlier `read_message` steps (a name that repeats a declared capture or an earlier binding is `PLAN_ENTRY_INVALID`) while its signature and every existing refusal stay. (2) **`channel_sources` (AC-15, AC-16).** A new pure `classifyChannelSource` reads the new top-level `channel_sources` map of `PRPs/auth/qa-seed.json` (`mail`: `{ "kind": "mailpit", "url": "<local origin>" }`, `sms`: `{ "kind": "file", "path": "<relative path>" }`): a channel with no entry is `EXTERNAL_CHANNEL` (needs-human, class impossible, an existing catalogued code, reason text unchanged), a malformed entry, an unknown key, a wrong `kind`, a URL with credentials, an absolute path or a path that resolves outside the target root is `CHANNEL_SOURCE_INVALID`, and a Mailpit origin that the existing guard refuses blocks the case `FAILED_NON_LOCAL_TARGET`, all in `executeCase` right after the query-source loop, before any seed, session, browser or request. (3) **The read (AC-15, AC-16, AC-21).** The browser driver notes the case start time and, for an `sms` source, the byte size of the declared file at that moment. A `read_message` step re-checks the guard, then polls (every 500 ms, for at most 10 seconds): Mailpit's search API (`GET <origin>/api/v1/search?query=to:<to>`) through the existing `fetchAnonymously`, the newest listed message whose `Created` is not before the case start, its text through `GET /api/v1/message/<ID>`; or the bytes appended to the file since the baseline, the last line that holds `to`. The first group of the regex becomes the value, which is registered with the existing `addSecretValues` BEFORE anything is written, then bound to the variable; the later steps are rewritten with the value substituted by the existing `substituteVariables`, and a later `fill` that used it is masked in every capture. Only a metadata file (`case-<k>.message-<n>.json`: channel, step position, message time) is written; the message body and the value never are. No message in time is `fail` with a fixed reason; an unreachable source is `blocked` `CHANNEL_UNREACHABLE`; a value shorter than the redaction floor is `blocked` `CAPTURE_UNREDACTABLE`. (4) **Docs.** `relay-qa-run.md` gains a "Channel sources." paragraph with a declaration example, one marked literal `read_message` example with its rules, and one honesty bullet; the knowledge base, the two site pages and the changelog state the same. The runner gains eleven exports (`READ_MESSAGE_CHANNELS`, `CHANNEL_SOURCE_KINDS`, `READ_MESSAGE_WAIT_MS`, `READ_MESSAGE_POLL_MS`, `MESSAGE_REGEX_MAX`, `MESSAGE_TEXT_MAX`, `MESSAGE_VALUE_MAX`, `classifyChannelSource`, `newestMailAfter`, `smsEntryAfter`, `extractMessageValue`), all listed in the `qa-run.mjs` row of the API reference. No existing test is predicted to go stale; the Implementer touches no test file.

## User Story

As the operator of relay's human validation gate
I want a QA step that reads the verification code from the local mail catcher or SMS file my project declares
So that the cases behind an e-mail or SMS code are executed by the runner instead of landing on me, with the code never written to any file the run produces

## Problem Statement

`/relay-qa-run` 0.46.0 declines every step that needs a verification code (T-3 and S-3 of the reference reports) as `EXTERNAL_CHANNEL`, even when the project routes its mail to a local catcher that a script could read. Phase 1 of this PRD narrowed `EXTERNAL_CHANNEL` to "a real external channel with no declared local source", but the runner has no way to declare a local source, read from it or bind what it finds into a later step, so the narrowing has no executable side yet.

## Solution Statement

Runner, one command doc, knowledge base, site pages; the outcome vocabulary, the reason-code catalogue, the kit login template, the seed generator and the validate check count are untouched. (1) Parsing: `stepRules` gains a total `read_message` case with a closed key set and fixed sentences that never echo a value; `validateSteps` tracks the names bound by earlier read steps. (2) Declaration: `classifyChannelSource` is pure and total; the guard call reuses the existing `checkTarget`, so no new guard marker is added. (3) Execution: three helpers placed after `fetchAnonymously` (outside every pinned section) read the source, extract and register the value; one new `else if` branch in the browser driver calls them and rewrites the remaining steps. (4) Docs: additive blocks placed after the query-source declaration example and after the judge bullet, at points no existing test pins; `relay-qa-seed.md` and `qa-seed.mjs` are left alone because the seed generator keeps unknown top-level keys of the seed file, exactly as it already keeps `query_sources`.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `docs/domain/flows.md`; `documentation/reference/commands.html`; `documentation/reference/scripts.html`; `documentation/changelog.html` |
| Dependencies | none new (row 6 of 9; `Depends` is `4, 5`, both `complete`; shares `lane:qa-run` with phases 1 to 7, so it runs serially after phase 5); Node built-ins only (`realpathSync` is added to the existing `node:fs` import), no new package, no sibling import, no new `import()` |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 99-100 (AC-15, AC-16), 105 (AC-21), 106 (AC-22), 108 (AC-24), 210 (row 6), 242-245 (Phase 6 details), 184 (Channel sources are declarations) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 99-100, 105-106, 108, 184, 210, 242-245 | AC-15, AC-16, AC-21, AC-22, AC-24, the "Channel sources are declarations" note, the row and the Phase 6 scope this plan implements |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 68-69, 1098-1124, 1305-1440 | the imports, `BROWSER_ACTIONS` and the `JUDGE_*` constants (insertion point of the new constants) and `stepRules`, whose browser `switch` gets the `read_message` case before `default:` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1447-1461, 1584-1667 | `stepVariables`, `validateJudgeCriteria` (the helper insertion point and register) and `validateSteps` (the bound-name check Task 1 extends) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 603-664, 783-871 | `buildRedactionTable`, `addSecretValues` (the only run-time registration function), `redactText`, `containsSecret` and `writeRunFile`: reused as they are |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2278-2345 | `REASON_CATALOGUE` (READ-ONLY: `EXTERNAL_CHANNEL` already says "no declared local source"; its literal is mutated by tests) and `RUNNER_OWNED_REASON_CODES` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2587-2605, 2673 | `CAPTURE_NAME_PATTERN`, `declaredCaptureNames` and `substituteVariables` (reused for the variable name rule and the in-driver substitution) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2840-2870, 2982-3007 | `queryArgvIsLocal` and `resolveApiOrigin` (the `checkTarget` call shape) and `fetchAnonymously` (the session-less GET the Mailpit read reuses; the insertion point of the new helpers is directly after it) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3215-3452 | `DRIVERS.browser`: the locals, the `fill` mask line, the `else if` chain whose last branch is `judge`, the final `else` and the result assembly |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4238-4384 | `executeCase`: the validation order and the query-source loop after which the channel check goes |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 790-814, 854-934 | the judge block, the declaration schema, the Query sources paragraph with its JSON example (the insertion point of the channel block), the honesty rules and the judge bullet |
| P0 | `docs/api-reference.md` | 129, 219 | the `/relay-qa-run` row and the `qa-run.mjs` row (read the full single physical lines before editing) |
| P0 | `docs/domain/glossary.md` | 422-433 | the third plan-side declaration paragraph (the judge step), after which Task 5 inserts |
| P0 | `docs/domain/flows.md` | 230-236 | the numbered item whose passage Task 5 extends |
| P0 | `documentation/reference/commands.html` | the `Step vocabulary` row (line 355) | the row Task 6 extends |
| P0 | `documentation/reference/scripts.html` | the `Assertions and request count` row (line 222) | the row Task 6 extends |
| P0 | `documentation/changelog.html` | 31-98 | the `Unreleased` block whose `Added` list Task 6 extends |
| P0 | `documentation/AGENTS.md` | the sections on the `Unreleased` entry rule and "modify an existing page" | the rules that bind Task 6 |
| P1 | `PRPs/plans/completed/qa-runner-ai-executable-steps-phase-5-model-judgment.plan.md` | Tasks 1, 3, 5 to 7 and the Level 1 to 3 blocks | READ-ONLY: the edit register, the changed-file checks, the end-to-end harness shape and the TAP corpus-gate parser this plan adapts |
| P1 | `scripts/validate/checks/qa-run-model-judgment.test.mjs` | 693-722 | READ-ONLY (R-X): the judge example count and the slice `A literal browser step that hands a capture to a judge:` to `The paragraphs that follow (the declaration schema`; Task 4 inserts outside that slice |
| P1 | `scripts/validate/checks/qa-run-scoped-locators.test.mjs` | 512-532 | READ-ONLY (R-X): exactly one marked example per scoped key, every marked browser example validates alone; the new example carries none of the scoped keys |
| P1 | `scripts/validate/checks/qa-run-chosen-inputs.test.mjs` | 504-545 | READ-ONLY (R-X): one marked `effect` write example, one `equals {{username}}` example |
| P1 | `scripts/validate/checks/qa-run-seed-declaration.test.mjs` | 563-596 | READ-ONLY (R-X): the first json block of the command doc that parses with a `states` key must stay the declaration example; the generator source scans |
| P1 | `scripts/validate/checks/qa-run-impossible-catalogue.test.mjs` | 118-160, 565-610, 784-806 | READ-ONLY (R-X): the catalogue pins, the doc sentences about the impossible class and the API-row and glossary rules |
| P1 | `scripts/validate/checks/qa-run-release-pages.test.mjs` | 220-238, 526-541 | READ-ONLY (R-X): the usage block of `scripts.html` and the rule that every camelCase or UPPER_SNAKE token between `REASON_CATALOGUE` and `USAGE` in the API row is a real export |
| P1 | `scripts/validate/checks/qa-run-input-value.test.mjs` | 286-337 | READ-ONLY (R-X): the real-runner spawn shape, the report and plan shapes and the `results.json` location the gates copy |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2996-3007
async function fetchAnonymously(playwright, baseURL, url, fetchOptions) {
  const anonymousCtx = await playwright.request.newContext(httpContextOptions(baseURL, null, true));
  try {
    const resp = await anonymousCtx.fetch(url, fetchOptions);
    const status = resp.status();
    const headers = resp.headers();
    const text = await resp.text().catch(() => '');
    return { status: () => status, headers: () => headers, text: async () => text };
  } finally {
    await anonymousCtx.dispose().catch(() => {});
  }
}
```
Read by Task 2 and NOT edited: `readMailValue` calls it for the search and the message detail (a fresh context with no storage state and no header; the options object `{ method: 'GET', maxRedirects: 0, timeout: 10000, failOnStatusCode: false }` follows the http driver's convention). The new helpers are inserted directly after this function and before `DRIVERS.http = async (`.

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2848-2854
async function queryArgvIsLocal(ctx, argv) {
  for (const a of argv.filter((x) => x.includes('://'))) {
    const g = await ctx.target.guard.checkTarget(a, { root: ctx.root });
    if (!g.ok) return false;
  }
  return true;
}
```
Copied by Task 2 (the guard call shape: `ctx.target.guard.checkTarget(url, { root })`; no new guard marker, no second import of the guard module).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1419-1434
      case 'judge': {
        // A judged step asserts nothing itself: it hands a capture to a recorded verdict, and that verdict is the expectation.
        if (Object.keys(s).some((k) => !['action', 'kind', 'criterion', 'within'].includes(k))) {
          return bad('judge takes only kind, criterion and within');
        }
        ...
        expectations++;
        break;
      }
      default:
        return bad(`unknown browser action ${JSON.stringify(s.action)}`);
```
Copied by Task 1 (the `read_message` case is inserted between the closing brace of `judge` and `default:`, in the same closed-key-set register: a reason names keys, never a value; unlike `judge` it does NOT increment `expectations`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1636-1640
    for (const name of stepVariables(s)) {
      if (!boundNames.includes(name)) {
        return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: variable ${name} is not bound by a capture declared for this case` };
      }
    }
```
Edited by Task 1 (the condition also accepts a name bound by an earlier `read_message` step; the message sentence stays byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:655-664
export function addSecretValues(table, secretValues) {
  const known = new Set(table.entries.map((e) => e[0]));
  for (const v of secretValues) {
    if (typeof v === 'string' && v.length >= 4 && !known.has(v)) {
      table.entries.push([v, REDACTED]);
      known.add(v);
    }
  }
  table.entries.sort((a, b) => b[0].length - a[0].length);
}
```
Read by Tasks 2 and 3 and NOT edited: the extracted value is registered here, before any write (values shorter than 4 characters are ignored, which is why a shorter value blocks the case `CAPTURE_UNREDACTABLE` first).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4326-4332
  const querySources = seedConfig && isObj(seedConfig) ? seedConfig.query_sources : undefined;
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'query') continue;
    const src = /** @type {any} */ (Q).classifyQuerySource(querySources, s.source);
    if (!src.ok) return out(blocked(src.code, `step ${i + 1}: ${src.reason}`));
    if (!(await queryArgvIsLocal(ctx, src.argv))) return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: a query source argument names a non-local URL; nothing was executed`));
  }
```
Copied by Task 2 (the channel-source loop is inserted directly after this loop's closing brace and before `/** @type {any[]} */ let steps = p.steps;`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3415-3422
        judgeKinds.set(i, step.kind);
        pendingAt.push(i);
      } else {
        // Every action the validator accepts has a branch above (the locator forms left through continue), so an
        // accepted action with no handler can never be recorded as passed.
        verdict = blocked('STEP_NOT_PERFORMABLE', `step ${n}: this step has no runtime handler; nothing was asserted`);
        break;
      }
```
Copied by Task 3 (the `read_message` branch is inserted between `pendingAt.push(i);` and the closing `} else {`; the final `else` stays).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3258
        if (step.action === 'expect_value' && isControlLocator(lstep)) valueMasks.push(buildLocator(page, lstep).target);
```
Copied by Task 3 (a sibling line masks the located field of a `fill` whose value came from a message, so the final and judge captures never show the code in an input).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:790-795 (the marked judge example added by phase 5)
A literal `browser` step that hands a capture to a judge:

<!-- qa-step-example driver=browser -->
```json
{ "action": "judge", "kind": "visual", "criterion": "<copied exactly from the case's manual steps>" }
```
```
Copied by Task 4 (the register of a marked step example: one introducing line ending in a colon, the marker with no trailing space, a `json` fence and a flat one-line object, then the explanatory paragraph; the new example carries none of `within`, `name_prefix`, `label_text`, `index`, `effect` or `selector`, and is not an `expect_value`).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:854-856 (Query sources paragraph)
Query sources. `query_sources` is a top-level map in `PRPs/auth/qa-seed.json`; each
entry has `kind` (`wrangler-d1` or `sqlite3`), `command` (the argv PREFIX; the
statement is appended as the final argument, so a `wrangler-d1` command ends with
```
Copied by Task 4 (the register of a declaration paragraph that opens with its name and a period).

```
# SOURCE: docs/domain/flows.md:235-236
   the case `needs-human` with `JUDGEMENT_UNCERTAIN`.
   An element that exists only after a click or a fill is grounded in a second
```
Copied by Task 5 (the numbered-list item keeps its 3-space indent on every line; the new passage goes between these two lines).

```
# SOURCE: documentation/changelog.html:65-71
          <li><strong>Model judgment</strong> &mdash; a browser plan may carry a <code>judge</code> step for a visual,
          ...
          <code>needs-human</code> with <code>JUDGEMENT_UNCERTAIN</code>, and the script never calls a model.</li>
        </ul>
```
Copied by Task 6 (the shape of an `Added` entry and of the closing list tag; no id is added; the exact leading whitespace is copied from the file, read lines 60 to 72 first).

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
Copied by the Level 3 harness (it spawns the REAL runner by absolute path with a temp root as `cwd`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the vocabulary (`read_message` case, constants, bound-name rule), the pure helpers, the source readers, the `executeCase` channel check, the driver branch with its start time, substitution and masks |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the "Channel sources." paragraph with a declaration example, the marked `read_message` example with its rules, one honesty bullet |
| `docs/api-reference.md` | UPDATE | the `/relay-qa-run` row (the step and the declaration) and the `qa-run.mjs` row (the eleven exports) |
| `docs/domain/glossary.md` | UPDATE | one new paragraph before "QA grounding snapshot" |
| `docs/domain/flows.md` | UPDATE | one added passage in the numbered item that states the grounding rule |
| `documentation/reference/commands.html` | UPDATE | one sentence in the `Step vocabulary` row |
| `documentation/reference/scripts.html` | UPDATE | one sentence in the `Assertions and request count` row |
| `documentation/changelog.html` | UPDATE | one `Added` entry under `Unreleased`, as `documentation/AGENTS.md` requires for any change under `documentation/` |

## NOT Building (Scope Limits)

- `preflight`, kit staleness, the record flag and fresh-cache dependencies (Phase 7), the release cut (Phase 8) and the dogfood (Phase 9).
- Any real mail service, real SMS provider, non-local origin or non-local file. The Mailpit origin must pass the existing guard and the SMS path must resolve inside the target root; tests use a loopback fake Mailpit only.
- Sending, deleting or marking a message through the catcher beyond what Mailpit's own message-detail read does; the runner only reads. No call to Mailpit's delete or release endpoints.
- A message body, an address or the extracted value in any file: the metadata file holds the channel, the step position and the message time only.
- Binding a message value to a variable usable before the `read_message` step, or to a name that repeats a declared capture or an earlier binding.
- A new reason-code catalogue entry, a change to `OUTCOMES`, `REASON_CATALOGUE` (its entries and reason text; `EXTERNAL_CHANNEL` already reads "no declared local source"), `RUNNER_OWNED_REASON_CODES`, `POSITIVE_ASSERTION_ACTIONS`, `LOCATOR_ACTIONS`, `groundLocators`, `parseArgs`, `USAGE`, `writeRunFile`, `writeEvidence`, `captureFinalPng`, `addSecretValues`, `substituteVariables`, `fetchAnonymously` and `plan.json`.
- `plugins/relay/scripts/qa-seed.mjs` and `plugins/relay/commands/relay-qa-seed.md`: the generator keeps unknown top-level keys of the seed file and documents `states` only (as for `query_sources`); `channel_sources` is operator-declared and documented in `relay-qa-run.md`.
- The line of `relay-qa-run.md` that lists the runner modes, the "Result fields" paragraph, the reason-code table, the `The paragraphs that follow` bridge sentence, and the `Classification` rows of the site pages.
- A new validate check or an edit of `scripts/validate/checks/qa-run-contract.mjs` (the contract already validates every marked example against `validateStep`; the count stays 28).
- `docs/decisions.md`, NAV (`assets/js/app.js`), the search index and the plugin version.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`, and any change to a reference report.
- Any test file. R-X strict: the Implementer authors zero test files; the new tests are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the `read_message` step, the bound-name rule and the pure helpers

- **ACTION**: Delivers AC-A1 (PRD AC-15 vocabulary half) and the pure halves of AC-A2 to AC-A4 that Tasks 2 and 3 call. Five edits in `plugins/relay/scripts/qa-run.mjs`; nothing is read or executed yet.
  1. In the `node:fs` import (line 68) add `realpathSync` at the end of the braces: `... statSync, readdirSync, realpathSync } from 'node:fs';`. No other import line changes.
  2. Directly after the line `export const PENDING_JUDGMENT = 'pending-judgment';` insert:
     ```js

     /** The channels a `read_message` step may read, the source kind each channel accepts, and the limits of a read (chosen, not measured). */
     export const READ_MESSAGE_CHANNELS = Object.freeze(['mail', 'sms']);
     export const CHANNEL_SOURCE_KINDS = Object.freeze({ mail: 'mailpit', sms: 'file' });
     export const READ_MESSAGE_WAIT_MS = 10000;
     export const READ_MESSAGE_POLL_MS = 500;
     export const MESSAGE_REGEX_MAX = 200;
     export const MESSAGE_TEXT_MAX = 65536;
     export const MESSAGE_VALUE_MAX = 200;
     /** A recipient is one plain token: it is placed in a search query and in a line filter, never trusted as free text. */
     const MESSAGE_TO_PATTERN = /^[^\s"'<>\\]{3,254}$/;
     ```
  3. In the `stepRules` browser `switch`, directly before `default:` (the pair `default:` / ``return bad(`unknown browser action ${JSON.stringify(s.action)}`);``), insert:
     ```js
           case 'read_message': {
             // A read step asserts nothing: it binds a value read from a declared local source to a variable of the case.
             if (Object.keys(s).some((k) => !['action', 'channel', 'to', 'extract'].includes(k))) {
               return bad('read_message takes only channel, to and extract');
             }
             if (!isStr(s.channel) || !READ_MESSAGE_CHANNELS.includes(s.channel)) return bad('read_message channel must be mail or sms');
             if (!isStr(s.to) || !MESSAGE_TO_PATTERN.test(s.to)) {
               return bad('read_message to must be 3 to 254 characters with no whitespace, quote, angle bracket or backslash');
             }
             if (!isObj(s.extract) || Object.keys(s.extract).some((k) => !['regex', 'as'].includes(k))) {
               return bad('read_message extract takes only regex and as');
             }
             if (!isStr(s.extract.regex) || s.extract.regex === '' || s.extract.regex.length > MESSAGE_REGEX_MAX) {
               return bad(`read_message extract.regex must be a non-empty string of at most ${MESSAGE_REGEX_MAX} characters`);
             }
             if (!isStr(s.extract.as) || !CAPTURE_NAME_PATTERN.test(s.extract.as)) return bad('read_message extract.as must be a variable name');
             let groups = 0;
             try {
               groups = (new RegExp(`${s.extract.regex}|`).exec('') ?? []).length - 1;
             } catch {
               return bad('read_message extract.regex is not a valid regular expression');
             }
             if (groups < 1) return bad('read_message extract.regex needs a capturing group');
             break;
           }
     ```
     (`expectations` is not incremented. `CAPTURE_NAME_PATTERN` is a module constant defined further down; it is only read when the function runs, after the module has loaded.)
  4. In `validateSteps`: (a) directly after the line `let interacted = false;` insert `/** @type {Set<string>} */ const messageBound = new Set();`. (b) Change the condition `if (!boundNames.includes(name)) {` to `if (!boundNames.includes(name) && !messageBound.has(name)) {` (the returned object and its sentence stay byte-identical). (c) Inside the `if (driver === 'browser' && isObj(s)) {` block, directly before the line `if (s.action === 'goto' || s.action === 'click' || s.action === 'fill') interacted = true;`, insert:
     ```js
           if (s.action === 'read_message') {
             if (!interacted) {
               return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: read_message needs an earlier goto, click or fill step in the same case` };
             }
             if (boundNames.includes(s.extract.as) || messageBound.has(s.extract.as)) {
               return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: read_message extract.as names a variable that is already bound in this case` };
             }
             messageBound.add(s.extract.as);
           }
     ```
  5. Directly after the closing brace of `validateJudgeCriteria` and before the `/**` line that begins "Validates one plan step against the closed vocabulary", insert four pure, total exported functions (JSDoc on each; a reason is a fixed sentence and never echoes a declared value, a message or a recipient):
     - `classifyChannelSource(sources, channel, root)` returns `{ ok: true, channel, kind: 'mailpit', url }` or `{ ok: true, channel, kind: 'file', abs }` or `{ ok: false, code, reason }`. Rules, in order: a `channel` outside `READ_MESSAGE_CHANNELS` is `CHANNEL_SOURCE_INVALID`; `sources` not an object, or `Object.hasOwn(sources, channel)` false, is `{ ok: false, code: 'EXTERNAL_CHANNEL', reason: REASON_CATALOGUE.EXTERNAL_CHANNEL.reason }`; an entry that is not an object, carries a key outside `kind`, `url`, `path`, or has a `kind` other than `CHANNEL_SOURCE_KINDS[channel]` is `CHANNEL_SOURCE_INVALID`; for `mail`, `url` must be a string that `new URL` parses with protocol `http:` or `https:` and no username or password, and the result `url` is `u.origin` plus the pathname with trailing slashes removed (so `http://localhost:8025/` becomes `http://localhost:8025`), anything else `CHANNEL_SOURCE_INVALID`; for `sms`, `path` must be a non-empty string that is not absolute, and `abs = resolve(root, path)` must satisfy `rel = relative(resolve(root), abs)` with `rel !== ''`, not starting with `..` and not absolute, else `CHANNEL_SOURCE_INVALID` ("the sms path resolves outside the target root"). No file or network access.
     - `newestMailAfter(listing, startedMs)` returns `{ id, createdMs }` or `null`: `listing.messages` (an array, else `null`), keeping the messages whose `ID` is a string matching `/^[A-Za-z0-9_-]{1,64}$/` and whose `Created` is a string that `Date.parse` turns into a finite number not below `startedMs` (equal counts), and returning the one with the greatest time. A non-object, a missing array and hostile entries give `null` and never throw.
     - `smsEntryAfter(text, to)` returns the last non-blank line of `text` (split on `\r?\n`) that contains `to`, or `null`; non-string input gives `null`.
     - `extractMessageValue(text, regex)` returns `{ ok: true, value }` or `{ ok: false, reason }` with a fixed reason: it runs `new RegExp(regex)` on `text.slice(0, MESSAGE_TEXT_MAX)` inside a `try`, and requires a match whose first group is a non-empty string of at most `MESSAGE_VALUE_MAX` characters. A non-string input, an invalid regex, no match, an empty or an over-long group are `{ ok: false }`; the reason never contains the text, the regex or the group.
  Constraints: keep every other line of `stepRules` and `validateSteps` byte-identical; do not change the signature of `validateSteps`, `validateStep` or `stepVariables`; do not add a second `// GUARD-SITE` or `// WRITE-SITE`; no comment or string may contain `writeFileSync(`, `renameSync(`, `locator.within(`, `spawnSync(process.execPath` or `outcome` followed by `:` or `=` and a quoted literal; do not add `read_message` to `LOCATOR_ACTIONS` or `POSITIVE_ASSERTION_ACTIONS`; the constants are plain data.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1419-1434` (the closed-key-set `case` and the `bad(...)` register) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1636-1640` (the bound-name check being extended).
- **VALIDATE**: delivers AC-A1 and the pure halves of AC-A2 to AC-A4. Fails on the unmodified tree (the constants and helpers do not exist, and a `read_message` step is refused as an unknown browser action) and passes after the task. It feeds hostile values to every helper and pins the order rule, the collision rules, the closed key set, totality and that no reason echoes a value.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { resolve } from "node:path";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  for (const f of ["classifyChannelSource", "newestMailAfter", "smsEntryAfter", "extractMessageValue"]) assert.equal(typeof m[f], "function", f + " is not exported");
  assert.deepEqual([...m.READ_MESSAGE_CHANNELS], ["mail", "sms"]);
  assert.deepEqual({ ...m.CHANNEL_SOURCE_KINDS }, { mail: "mailpit", sms: "file" });
  assert.equal(m.READ_MESSAGE_WAIT_MS, 10000);
  assert.equal(m.READ_MESSAGE_POLL_MS, 500);
  assert.equal(m.MESSAGE_REGEX_MAX, 200);
  assert.equal(m.MESSAGE_TEXT_MAX, 65536);
  assert.equal(m.MESSAGE_VALUE_MAX, 200);
  assert.equal(m.OUTCOMES.join(","), "pass,fail,blocked,needs-human");
  assert.equal(Object.keys(m.REASON_CATALOGUE).length, 12, "the reason-code catalogue changed");
  assert.deepEqual([...m.POSITIVE_ASSERTION_ACTIONS], ["expect_visible", "expect_text", "expect_value", "expect_state"]);
  assert.equal(m.groundLocators.length, 4);
  const RM = { action: "read_message", channel: "mail", to: "{{email}}", extract: { regex: "code is (\\d{6})", as: "code" } };
  const ok = (d, s) => assert.equal(m.validateStep(d, s), null, JSON.stringify(s));
  const no = (d, s) => assert.equal(m.validateStep(d, s)?.code, "PLAN_ENTRY_INVALID", JSON.stringify(s));
  ok("browser", RM);
  ok("browser", { ...RM, channel: "sms", to: "+5511999990000" });
  no("http", RM);
  no("browser", { ...RM, channel: "fax" });
  no("browser", { ...RM, to: "two words" });
  no("browser", { ...RM, to: "a@b\"c" });
  no("browser", { ...RM, to: "ab" });
  no("browser", { ...RM, extra: 1 });
  no("browser", { ...RM, selector: "#x" });
  no("browser", { ...RM, extract: { regex: "code is (\\d{6})" } });
  no("browser", { ...RM, extract: { regex: "code is (\\d{6})", as: "9x" } });
  no("browser", { ...RM, extract: { regex: "code is (\\d{6})", as: "code", extra: 1 } });
  no("browser", { ...RM, extract: { regex: "code is \\d{6}", as: "code" } });
  no("browser", { ...RM, extract: { regex: "(", as: "code" } });
  no("browser", { ...RM, extract: { regex: "", as: "code" } });
  no("browser", { ...RM, extract: { regex: "(" + "a".repeat(199) + ")", as: "code" } });
  ok("browser", { ...RM, extract: { regex: "(" + "a".repeat(198) + ")", as: "code" } });
  no("browser", { ...RM, extract: "code" });
  assert.ok(!JSON.stringify(m.validateStep("browser", { ...RM, to: "secret user@example.test" })).includes("secret"), "a reason must not echo the recipient");
  const G = { action: "goto", path: "/" };
  const SEE = { action: "expect_visible", text: "Done" };
  const FILL = { action: "fill", role: "textbox", name: "Code", value: "{{code}}" };
  assert.equal(m.validateSteps("browser", [G, RM, FILL, SEE], ["email"]), null);
  assert.equal(m.validateSteps("browser", [G, FILL, SEE], ["email"])?.code, "PLAN_ENTRY_INVALID", "a name no step has bound yet");
  assert.equal(m.validateSteps("browser", [G, FILL, RM, SEE], ["email"])?.code, "PLAN_ENTRY_INVALID", "a name used before the step that binds it");
  assert.equal(m.validateSteps("browser", [RM, G, SEE], ["email"])?.code, "PLAN_ENTRY_INVALID", "a read with no earlier interaction");
  assert.equal(m.validateSteps("browser", [G, RM, SEE], [])?.code, "PLAN_ENTRY_INVALID", "the recipient capture is unbound");
  assert.equal(m.validateSteps("browser", [G, RM, RM, SEE], ["email"])?.code, "PLAN_ENTRY_INVALID", "a repeated binding");
  assert.equal(m.validateSteps("browser", [G, { ...RM, extract: { regex: "code is (\\d{6})", as: "email" } }, SEE], ["email"])?.code, "PLAN_ENTRY_INVALID", "a name that repeats a declared capture");
  assert.equal(m.validateSteps("browser", [G, RM, SEE], ["email"]), null);
  assert.equal(m.validateSteps("browser", [G, RM], ["email"])?.code, "NO_EXPECTATION", "a read is not an expectation");
  const root = process.cwd();
  const cls = (src, ch) => m.classifyChannelSource(src, ch, root);
  assert.deepEqual([cls(undefined, "mail").ok, cls(undefined, "mail").code], [false, "EXTERNAL_CHANNEL"]);
  assert.deepEqual([cls({}, "sms").ok, cls({}, "sms").code], [false, "EXTERNAL_CHANNEL"]);
  assert.equal(cls({}, "sms").reason, m.REASON_CATALOGUE.EXTERNAL_CHANNEL.reason);
  assert.equal(cls({ sms: { kind: "file", path: "a.txt" } }, "mail").code, "EXTERNAL_CHANNEL");
  assert.equal(cls({}, "fax").code, "CHANNEL_SOURCE_INVALID");
  const mail = cls({ mail: { kind: "mailpit", url: "http://localhost:8025/" } }, "mail");
  assert.deepEqual([mail.ok, mail.kind, mail.url], [true, "mailpit", "http://localhost:8025"]);
  assert.equal(cls({ mail: { kind: "mailpit", url: "https://mail.test:8025/box/" } }, "mail").url, "https://mail.test:8025/box");
  for (const bad of [{ kind: "file", url: "http://localhost:8025" }, { kind: "mailpit" }, { kind: "mailpit", url: "ftp://localhost" }, { kind: "mailpit", url: "not a url" }, { kind: "mailpit", url: "http://user:pw@localhost:8025" }, { kind: "mailpit", url: "http://localhost:8025", extra: 1 }, "x", 5, null]) {
    const r = cls({ mail: bad }, "mail");
    assert.deepEqual([r.ok, r.code], [false, "CHANNEL_SOURCE_INVALID"], JSON.stringify(bad));
    assert.ok(!JSON.stringify(r).includes("pw"), "a reason must not echo the declared url");
  }
  const sms = cls({ sms: { kind: "file", path: "PRPs/auth/.sms/inbox.txt" } }, "sms");
  assert.deepEqual([sms.ok, sms.kind, sms.abs], [true, "file", resolve(root, "PRPs/auth/.sms/inbox.txt")]);
  for (const bad of ["../outside.txt", "a/../../outside.txt", resolve(root, "x.txt"), "", ".", 5]) assert.equal(cls({ sms: { kind: "file", path: bad } }, "sms").code, "CHANNEL_SOURCE_INVALID", JSON.stringify(bad));
  assert.equal(cls({ sms: { kind: "mailpit", url: "http://localhost:8025" } }, "sms").code, "CHANNEL_SOURCE_INVALID");
  const t = (iso) => Date.parse(iso);
  const listing = { messages: [{ ID: "a", Created: "2026-10-21T10:00:00.000Z" }, { ID: "b", Created: "2026-10-21T10:00:05.000Z" }, { ID: "c", Created: "2026-10-21T09:59:00.000Z" }, { ID: 7, Created: "x" }, null, { ID: "bad id", Created: "2026-10-21T10:00:09.000Z" }, { ID: "d", Created: "not a date" }] };
  assert.deepEqual(m.newestMailAfter(listing, t("2026-10-21T10:00:01.000Z")), { id: "b", createdMs: t("2026-10-21T10:00:05.000Z") });
  assert.deepEqual(m.newestMailAfter(listing, t("2026-10-21T10:00:05.000Z")), { id: "b", createdMs: t("2026-10-21T10:00:05.000Z") });
  assert.equal(m.newestMailAfter(listing, t("2026-10-21T10:00:06.000Z")), null);
  assert.equal(m.newestMailAfter(null, 0), null);
  assert.equal(m.newestMailAfter({ messages: "x" }, 0), null);
  assert.equal(m.newestMailAfter(undefined, 0), null);
  assert.equal(m.smsEntryAfter("old 111\r\nto +55 code 222\nto +55 code 333\n\n", "+55"), "to +55 code 333");
  assert.equal(m.smsEntryAfter("a\nb", "zz"), null);
  assert.equal(m.smsEntryAfter(5, "x"), null);
  assert.equal(m.smsEntryAfter("a", 5), null);
  assert.deepEqual(m.extractMessageValue("Your code is 123456.", "code is (\\d{6})"), { ok: true, value: "123456" });
  for (const [text, rx] of [["no digits here", "code is (\\d{6})"], ["code is ", "code is ()"], ["secret999", "(zzz)"], ["x".repeat(201), "(x+)"], ["abc", "("], [5, "(a)"], ["abc", 6]]) {
    const r = m.extractMessageValue(text, rx);
    assert.equal(r.ok, false, JSON.stringify([text, rx]));
    assert.ok(!JSON.stringify(r).includes("secret999"), "a reason must not echo the text");
  }
  console.log("PASS: the read_message vocabulary, the bound-name rule and the four helpers hold");
  '
  ```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the source readers and the `executeCase` channel check

- **ACTION**: Delivers AC-A2 (PRD AC-15 guard and decline half, AC-16 refusal half) and the reading halves of AC-A3 and AC-A4. Two edits in `plugins/relay/scripts/qa-run.mjs`; the browser driver does not call the readers yet.
  1. Directly after the closing brace of `fetchAnonymously` and before the line `DRIVERS.http = async (ctx, kase, plan, session) => {` insert one block of non-exported helpers (all outside the three pinned sections; none may contain `spawnSync(`, a second `// GUARD-SITE` or `// WRITE-SITE`; no comment may contain `writeFileSync(` or `renameSync(`). First check the file for an existing pause or sleep helper and reuse it; otherwise add `const pauseMs = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));`. The helpers, in order:
     - `smsBaselineSize(abs)`: `statSync(abs).size` in a `try`, `0` when the file does not exist.
     - `readMailValue(ctx, base, to, startedMs, regex)`: first `const g = await ctx.target.guard.checkTarget(base, { root: ctx.root });` and return `{ ok: false, kind: 'non-local' }` when `!g.ok` (a second guard check, right before the first request, in addition to the one in `executeCase`). Then, until `Date.now() >= deadline` (`deadline = Date.now() + READ_MESSAGE_WAIT_MS`, in a `for (;;)` loop with `await pauseMs(READ_MESSAGE_POLL_MS)` between attempts): `fetchAnonymously(ctx.playwright, new URL(base).origin, `${base}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}&limit=50`, { method: 'GET', maxRedirects: 0, timeout: 10000, failOnStatusCode: false })`; a status other than 200, a thrown error or a body that is not JSON returns `{ ok: false, kind: 'unreachable' }`; `newestMailAfter(listing, startedMs)`; when it finds a message, fetch `${base}/api/v1/message/${encodeURIComponent(hit.id)}` the same way, take its `Text` (a string, else treat the attempt as no match), run `extractMessageValue(text, regex)`, and on success return `{ ok: true, value, receivedAt: new Date(hit.createdMs).toISOString() }`; a message whose text does not match is NOT a final answer (a newer one may still arrive), so the loop keeps polling until the deadline and then returns `{ ok: false, kind: 'absent' }`.
     - `readSmsValue(root, abs, baseline, to, regex)`: the same loop and deadline; each attempt, when `existsSync(abs)`, resolves `realpathSync(abs)` and requires `relative(realpathSync(root), real)` to be non-empty, not start with `..` and not be absolute (else return `{ ok: false, kind: 'outside' }`, which covers a link that leaves the root), reads the bytes with `readFileSync(real)`, takes `bytes.subarray(bytes.length >= baseline ? baseline : 0).toString('utf8')` (only what was appended since the case started; a truncated file restarts at 0), picks `smsEntryAfter(thatText, to)` and runs `extractMessageValue` on it; success returns `{ ok: true, value, receivedAt: null }`; an unreadable file returns `{ ok: false, kind: 'unreachable' }`; the deadline returns `{ ok: false, kind: 'absent' }`.
     - `runReadMessage(ctx, kase, step, n, startedMs, smsBaseline)` returns `{ ok: true, value, evidence }` or `{ ok: false, result }` where `result` is a `CaseResult`. In order: (i) `classifyChannelSource(isObj(ctx.seedConfig) ? ctx.seedConfig.channel_sources : undefined, step.channel, ctx.root)`; a refusal is `needsHuman(code, `step ${n}: ${reason}`)` when the code is `EXTERNAL_CHANNEL` and `blocked(code, `step ${n}: ${reason}`)` otherwise; (ii) the recipient, which has been substituted by now, must still match `MESSAGE_TO_PATTERN`, else `blocked('STEP_NOT_PERFORMABLE', `step ${n}: the recipient is not a plain address or number; nothing was requested`)`; (iii) the read, `readMailValue` for a `mailpit` source and `readSmsValue` for a `file` source; `non-local` gives `blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: the declared mail source is not local; nothing was requested`)`, `outside` gives `blocked('CHANNEL_SOURCE_INVALID', `step ${n}: the declared sms file resolves outside the target root; nothing was read`)`, `unreachable` gives `blocked('CHANNEL_UNREACHABLE', `step ${n}: the declared ${step.channel} source could not be read`)`, and `absent` gives `{ outcome: 'fail', reason_code: null, reason: `step ${n}: no message from the declared ${step.channel} source matched within ${READ_MESSAGE_WAIT_MS / 1000} seconds`, evidence: [] }`; (iv) a value shorter than 4 characters gives `blocked('CAPTURE_UNREDACTABLE', `step ${n}: the extracted value is too short to redact; nothing was kept`)`; (v) `addSecretValues(ctx.table, [value])` BEFORE any write; (vi) `writeEvidence(ctx, `case-${kase.index}.message-${n}.json`, { kind: 'json', value: { action: 'read_message', step: n, channel: step.channel, received_at: receivedAt, result: 'passed' } })` inside a `try`, a failure giving `blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the message evidence could not be written`)`. No reason, evidence value or terminal line may contain the message, the recipient, the value or the regex.
  2. In `executeCase`, directly after the closing brace of the query-source loop (the loop that ends with the `a query source argument names a non-local URL; nothing was executed` return) and before the line `/** @type {any[]} */ let steps = p.steps;`, insert:
     ```js
       const channelSources = seedConfig && isObj(seedConfig) ? seedConfig.channel_sources : undefined;
       for (const [i, s] of p.steps.entries()) {
         if (!isObj(s) || s.action !== 'read_message') continue;
         const src = classifyChannelSource(channelSources, s.channel, root);
         if (!src.ok) return out(src.code === 'EXTERNAL_CHANNEL' ? needsHuman(src.code, `step ${i + 1}: ${src.reason}`) : blocked(src.code, `step ${i + 1}: ${src.reason}`));
         if (src.kind === 'mailpit') {
           const g = await ctx.target.guard.checkTarget(src.url, { root });
           if (!g.ok) return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the declared mail source is not local; nothing was requested`));
         }
       }
     ```
  Constraints: keep the line `const abs = join(ctx.runDirAbs, 'evidence', name);` exactly once; do not reorder any existing check of `executeCase`; do not touch `queryArgvIsLocal`, `fetchAnonymously`, `writeEvidence`, `addSecretValues` or the `// GUARD-SITE` line; the helpers must not be placed between `export function precheckGroundedSteps(` and `export function summarizeEntries(`, between `async function runLocatorStep(` and `DRIVERS.browser = async (`, or between `function obtainSession(` and `async function prepareState(`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2996-3007` (the session-less GET), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2848-2854` (the `checkTarget` call shape) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:4326-4332` (the loop the channel check follows).
- **VALIDATE**: delivers AC-A2. Fails on the unmodified tree (a `read_message` step is `PLAN_ENTRY_INVALID`, so no case ends with the expected codes) and passes after Tasks 1 and 2. It drives the REAL runner for the four declaration cases that end before any browser is launched. The scratch end-to-end script is the one given under `## Validation Commands` (Level 3); create it with the Write tool first and export its absolute path as `RELAY_P6_E2E`; the `guard` scenarios read nothing and request nothing from a mail service.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  E2E="${RELAY_P6_E2E:?set RELAY_P6_E2E to the absolute path of the scratch end-to-end script}"
  test -f "$E2E"
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false SCENARIOS=guard node "$E2E"
  ```

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the driver branch, the start time, the substitution and the masks

- **ACTION**: Delivers AC-A3 (PRD AC-15 read and binding), AC-A4 (PRD AC-16 read) and AC-A5 (PRD AC-21 secrecy). Four edits in the `DRIVERS.browser` function of `plugins/relay/scripts/qa-run.mjs`; every other line of the function stays byte-identical, and the `for (const [i, step] of plan.steps.entries()) {` line is NOT changed.
  1. Directly after the line `DRIVERS.browser = async (ctx, kase, plan, session) => {` and before `const target = ctx.target;`, insert:
     ```js
       // The plan is copied so that rewriting the steps after a read never touches the caller's array.
       plan = { ...plan, steps: plan.steps.slice() };
       // "After the case started" means after the browser steps began; an sms source also records how long its file was then.
       const startedMs = Date.now();
       /** @type {Record<string, { value: string, redact: boolean }>} */ const messageValues = {};
       /** @type {Set<number>} */ const secretFillAt = new Set();
       const smsSource = classifyChannelSource(isObj(ctx.seedConfig) ? ctx.seedConfig.channel_sources : undefined, 'sms', ctx.root);
       const smsBaseline = smsSource.ok && plan.steps.some((/** @type {any} */ s) => isObj(s) && s.action === 'read_message' && s.channel === 'sms') ? smsBaselineSize(smsSource.abs) : 0;
     ```
  2. Directly after the line `if (step.action === 'expect_value' && isControlLocator(lstep)) valueMasks.push(buildLocator(page, lstep).target);` insert `if (step.action === 'fill' && secretFillAt.has(i) && isControlLocator(lstep)) valueMasks.push(buildLocator(page, lstep).target);`.
  3. In the `else if (step.action === 'click' || step.action === 'fill') {` branch, directly before its `try {`, insert `if (step.action === 'fill' && secretFillAt.has(i)) valueMasks.push(page.locator(step.selector));`.
  4. Between `pendingAt.push(i);` and the closing `} else {` that precedes the comment "Every action the validator accepts has a branch above", insert:
     ```js
       } else if (step.action === 'read_message') {
         const read = await runReadMessage(ctx, kase, step, n, startedMs, smsBaseline);
         if (!read.ok) {
           verdict = read.result;
           break;
         }
         queryEvidence.set(i, read.evidence);
         messageValues[step.extract.as] = { value: read.value, redact: true };
         // The value reaches only the steps after this one; a fill that uses it is masked in every later capture.
         for (let j = i + 1; j < plan.steps.length; j++) {
           const before = plan.steps[j];
           if (isObj(before) && before.action === 'fill' && stepVariables(before).includes(step.extract.as)) secretFillAt.add(j);
           plan.steps[j] = substituteVariables(before, messageValues);
         }
     ```
  Constraints: `plan` is the function's own parameter, reassigned once at the top; do not rename `step` or `i`; do not edit the `judge` branch, the final `else`, the final capture or the result assembly; the new branch reads no page content; no comment may contain `writeFileSync(` or `renameSync(`; the text between `DRIVERS.browser = async (` and `export function mintExpiryDue(` keeps `'expect_requests'`, `observeRequests(`, `settleRequestWindow(`, `evaluateRequestWindow(` and `serviceWorkers: 'block'`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3415-3422` (the branch chain the new branch joins) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3258` (the mask line the sibling lines follow).
- **VALIDATE**: delivers AC-A3, AC-A4 and AC-A5. Fails on the unmodified tree (the steps are refused as unknown, so the mail case does not pass) and passes after Tasks 1 to 3. It runs the REAL runner in a real browser against a loopback page and a loopback fake Mailpit (the `mail` scenario: a click makes the page post a message, the code is read, a later `fill` types it, the page verifies it; a case with no declared sms source is declined; a stale message is never used) and scans every file of the run for the code. Then the same for the file source.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  E2E="${RELAY_P6_E2E:?set RELAY_P6_E2E to the absolute path of the scratch end-to-end script}"
  test -f "$E2E"
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false SCENARIOS=mail,sms node "$E2E"
  ```

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — the channel-sources paragraph, the marked `read_message` example and one honesty bullet

- **ACTION**: Delivers AC-A6 (PRD AC-22 for `read_message`, AC-15 and AC-16 documentation). Read lines 784 to 935 first. Two `Edit` calls; do not touch line 29 (the mode list), the `The paragraphs that follow` bridge sentence, the judge block, the reason-code table, the "Result fields" paragraph or any other paragraph. Avoid the banned strings `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type` and `--local-host`, the sentence `the case needs an inbox, SMS, a physical device or a third-party payment`, and the word `impossible` in the new text.
  1. After the JSON example that closes the declaration schema (the fenced block that starts `{ "states": { "A teacher exists":`) and before the paragraph that starts `` `role` is a role slug ``, insert exactly the following (the lines are copied verbatim, including the line breaks; the two fences with a `json` tag are written out in full in the file):
     ```
     Channel sources. `channel_sources` is a top-level map in `PRPs/auth/qa-seed.json`, next
     to `states` and `query_sources`; it declares where a verification message can be read
     in the local environment. `mail` is `{ "kind": "mailpit", "url": "<local Mailpit origin>" }`
     and `sms` is `{ "kind": "file", "path": "<path relative to the target root>" }`. The runner
     only reads from a declared source and never sends a message, so keep the catcher's relay
     off. The Mailpit `url` is checked by the local-only guard before any request, and a
     non-local `url` blocks the case `FAILED_NON_LOCAL_TARGET` with nothing requested; an `sms`
     path that is absolute or resolves outside the target root, a `kind` other than the one
     the channel accepts and an unknown key block the case `CHANNEL_SOURCE_INVALID`. A case
     whose steps need a message from a channel with no declared source is declined with
     `EXTERNAL_CHANNEL`, exactly as before. Read the declared channels from that file, never
     invent one and never write a URL or a path in `plan.json`.

     ```json
     { "channel_sources": { "mail": { "kind": "mailpit", "url": "http://localhost:8025" } } }
     ```

     A literal `browser` step that reads a verification code from a declared source:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "read_message", "channel": "mail", "to": "{{email}}", "extract": { "regex": "code is (\\d{6})", "as": "code" } }
     ```

     A `read_message` step reads a verification code from a source declared in
     `channel_sources`. `channel` is `mail` or `sms`; `to` is the address or number the
     message is sent to (a literal, or a `{{name}}` capture of the case's state) and has no
     whitespace; `extract.regex` is a regular expression of at most 200 characters with at
     least one capturing group, and `extract.as` is the name of the variable that receives the
     first group. The step takes no other key, asserts nothing and needs an earlier `goto`,
     `click` or `fill` step in the same case; a name it binds is usable as `{{name}}` in the
     steps after it and nowhere else, and cannot repeat a declared capture or an earlier
     binding. The runner reads only the newest message to that recipient received after the
     case's browser steps began (the Mailpit search API for `mail`; for `sms` the bytes
     appended to the declared file since then, one message per line), polls for up to ten
     seconds and ends the case `fail` when no such message matches the regex. A source that
     cannot be reached blocks the case `CHANNEL_UNREACHABLE`. The extracted value is
     registered for redaction before anything is written, so no evidence file, reason,
     terminal line or `results.json` carries it, a field filled with it is masked in the
     captures, and a value shorter than 4 characters blocks the case `CAPTURE_UNREDACTABLE`.
     The step records only the channel, the step position and the time of the message in
     `<RUN_DIR>/evidence/case-<n>.message-<k>.json`, never the message. It is valid in
     `browser` entries only.
     ```
     (The inserted text is plain markdown, not wrapped in the outer fence shown above, which is only this plan's quoting. The first `json` fence is unmarked and has no `states` key, so the first declaration example of the document stays the `states` one. The marked example is one flat line.)
  2. In the `Honesty rules:` list, directly after the judge bullet (the bullet that begins `- Plan a ` followed by a backticked `judge` and ends `only a judgment that no ` ... `step can capture.`), insert as a new bullet:
     ```
     - Plan a `read_message` step only for a channel that `channel_sources` in
       `PRPs/auth/qa-seed.json` declares, after the step that makes the product send the
       message, with the regex taken from the wording the report gives the message; never
       write a code, an address you were not given or a source of your own, and decline with
       `EXTERNAL_CHANNEL` a case whose channel has no declared source.
     ```
  Constraints: the new example validates alone against `validateStep` (Task 1) and carries none of `within`, `name_prefix`, `label_text`, `index`, `effect`, `selector`, and is not an `expect_value`, a `judge` or an `expect_requests`; no new paragraph begins with `Grounding browser steps.`, `Grounding rules.`, `Personal data.`, `The closed vocabulary.`, `Grounding after an interaction.`, `Run-time and scoped locators.` or `Chosen inputs.`; the marker line is `<!-- qa-step-example driver=browser -->` with no trailing space.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:790-795 (the marked judge example added by phase 5)` and `# SOURCE: plugins/relay/commands/relay-qa-run.md:854-856 (Query sources paragraph)`.
- **VALIDATE**: delivers AC-A6. Gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line), validate every marked browser example of the real document against the real validator, then run the tests that read this document. The greps and the example check fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'Channel sources. `channel_sources` is a top-level map in `PRPs/auth/qa-seed.json`, next' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '{ "action": "read_message", "channel": "mail", "to": "{{email}}", "extract": { "regex": "code is (\\d{6})", "as": "code" } }' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'A `read_message` step reads a verification code from a source declared in' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '- Plan a `read_message` step only for a channel that `channel_sources` in' plugins/relay/commands/relay-qa-run.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const found = [...doc.matchAll(/<!-- qa-step-example driver=(\w+) -->\n```json\n([^\n]*)\n```/g)].map((x) => ({ driver: x[1], step: JSON.parse(x[2]) }));
  const reads = found.filter((e) => e.step.action === "read_message");
  assert.equal(reads.length, 1, "exactly one marked read_message example, found " + reads.length);
  assert.equal(reads[0].driver, "browser");
  for (const e of found) assert.equal(m.validateStep(e.driver, e.step), null, "a marked example does not validate: " + JSON.stringify(e.step));
  for (const k of ["within", "name_prefix", "label_text", "index", "effect", "selector"]) assert.ok(!(k in reads[0].step), "the example carries " + k);
  assert.equal(doc.split("the runner script (`parse`, `init`, `run`, `ground`").length - 1, 1, "the mode-list line changed");
  for (const banned of ["design-spec", "relay-auth-setup", ".claude/PRPs", "subagent_type", "--local-host"]) assert.ok(!doc.includes(banned), "banned string " + banned);
  assert.ok(!doc.includes("the case needs an inbox, SMS, a physical device or a third-party payment"));
  const added = doc.slice(doc.indexOf("Channel sources. `channel_sources`"), doc.indexOf("`role` is a role slug"));
  assert.ok(added.length > 0 && !/impossible/i.test(added), "the new block must not use the word impossible");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

### Task 5: UPDATE docs/api-reference.md, docs/domain/glossary.md and docs/domain/flows.md — the knowledge base

- **ACTION**: Delivers AC-A6 (the knowledge-base half). Read the full physical lines 129 and 219 of `docs/api-reference.md` first (each row is one very long line and stays one line). In the new text of the glossary, the flows and the API reference do not write the token `EXTERNAL_CHANNEL` and do not use the word `impossible` (tests read the sentences that carry those words). Four `Edit` calls:
  1. `docs/api-reference.md`, the `/relay-qa-run` row: `old_string` = the text `and the script never calls a model.` taken from the end of the judge-step sentence in that row (read the row; keep the anchor to the shortest unique text that ends there) and `new_string` = that text followed by a space and: ``A `read_message` step (a `channel` of `mail` or `sms`, a `to`, an `extract` with a `regex` and an `as` name) reads a verification code from the local source that `channel_sources` in `PRPs/auth/qa-seed.json` declares, binds it to a variable of the case, registers it for redaction and writes only a metadata evidence file; a source that is not local blocks the case `FAILED_NON_LOCAL_TARGET`, a malformed one blocks it with `CHANNEL_SOURCE_INVALID`, and a channel with no declared source is declined as before.`` Do not backtick any of the eleven new export names in this row.
  2. `docs/api-reference.md`, the `qa-run.mjs` row: `old_string` = `exist only for a run that holds a judge step. Every number is chosen, not measured` and `new_string` = ``exist only for a run that holds a judge step. The message step is built from `classifyChannelSource`, `newestMailAfter`, `smsEntryAfter` and `extractMessageValue`, with the constants `READ_MESSAGE_CHANNELS`, `CHANNEL_SOURCE_KINDS`, `READ_MESSAGE_WAIT_MS`, `READ_MESSAGE_POLL_MS`, `MESSAGE_REGEX_MAX`, `MESSAGE_TEXT_MAX` and `MESSAGE_VALUE_MAX`; a run that holds no `read_message` step is unchanged. Every number is chosen, not measured`` (the new names sit after the `USAGE` token, outside the checked span, and all are real exports).
  3. `docs/domain/glossary.md`: insert directly before the line `## QA grounding snapshot` (leave one blank line before the heading) a paragraph, written with the line breaks below:
     ```
     A fourth plan-side declaration of `/relay-qa-run` is the `read_message` step, for a verification
     code that a local mail catcher or a local file holds. The project declares the source under
     `channel_sources` in `PRPs/auth/qa-seed.json` (a Mailpit origin that the local-only guard
     approves, or a file inside the target root); the step reads the newest message received
     after the case began, binds the first group of its regular expression to a variable of the
     case and registers the value for redaction, so it reaches no evidence file, reason or
     terminal line. A case that needs a message from a channel with no declared source is
     declined as before. See `plugins/relay/commands/relay-qa-run.md`.
     ```
  4. `docs/domain/flows.md`, in the numbered item (keep the 3-space indent on every line): `old_string` = the two lines `   the case `needs-human` with `JUDGEMENT_UNCERTAIN`.` / `   An element that exists only after a click or a fill is grounded in a second` and `new_string` = the first line, then this passage, then the second line:
     ```
        A `read_message` step reads a verification code from a local source that
        `channel_sources` declares (a Mailpit origin the guard approves, or a file inside the
        target root): the newest message received after the case began yields the first group
        of the step's expression as a variable of the case, registered for redaction, which
        the steps after it may use as `{{name}}`. A channel with no declared source is
        declined as before.
     ```
- **MIRROR**: `# SOURCE: docs/domain/flows.md:235-236` (the register and the insertion point); the glossary paragraph follows the register of the judge paragraph before `## QA grounding snapshot`; the API rows are one physical line each and stay one.
- **VALIDATE**: gate on the authored literal in each file (copied byte-for-byte from the ACTION; each sits inside one physical line), assert every name added to the API reference is a real export and that nothing was added to the checked span that is not, then run the tests that read these documents. The greps and the export check fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'A `read_message` step (a `channel` of `mail` or `sms`, a `to`, an `extract` with a `regex` and an `as` name) reads a verification code' docs/api-reference.md
  grep -qF -- 'The message step is built from `classifyChannelSource`, `newestMailAfter`, `smsEntryAfter` and `extractMessageValue`' docs/api-reference.md
  grep -qF -- 'A fourth plan-side declaration of `/relay-qa-run` is the `read_message` step, for a verification' docs/domain/glossary.md
  grep -qF -- 'A `read_message` step reads a verification code from a local source that' docs/domain/flows.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const names = ["READ_MESSAGE_CHANNELS", "CHANNEL_SOURCE_KINDS", "READ_MESSAGE_WAIT_MS", "READ_MESSAGE_POLL_MS", "MESSAGE_REGEX_MAX", "MESSAGE_TEXT_MAX", "MESSAGE_VALUE_MAX", "classifyChannelSource", "newestMailAfter", "smsEntryAfter", "extractMessageValue"];
  for (const name of names) assert.ok(Object.hasOwn(m, name), name + " is named in the API reference but is not an export");
  const lines = readFileSync("docs/api-reference.md", "utf8").split("\n");
  const row = lines.filter((l) => l.startsWith("| `qa-run.mjs` "));
  assert.equal(row.length, 1, "exactly one qa-run.mjs row");
  for (const name of names) assert.ok(row[0].includes("`" + name + "`"), name + " is missing from the qa-run.mjs row");
  const from = row[0].indexOf("`REASON_CATALOGUE`");
  const span = row[0].slice(from, row[0].indexOf("`USAGE`", from) + 7);
  for (const tok of span.match(/`[^`]+`/g).map((t) => t.slice(1, -1)).filter((t) => /^(?:[A-Z][A-Z0-9_]+|[a-z]+(?:[A-Z][A-Za-z0-9]*)+)$/.test(t))) assert.ok(Object.hasOwn(m, tok), "a token between REASON_CATALOGUE and USAGE is not an export: " + tok);
  const qaRun = lines.find((l) => l.startsWith("| `/relay-qa-run "));
  for (const name of names) assert.ok(!qaRun.includes("`" + name + "`"), "the /relay-qa-run row must not backtick " + name);
  const flows = readFileSync("docs/domain/flows.md", "utf8");
  const fromAt = flows.indexOf("A `read_message` step reads");
  assert.ok(fromAt >= 0, "the flows passage is missing");
  assert.ok(!flows.slice(fromAt, flows.indexOf("An element that exists only after a click", fromAt)).includes("EXTERNAL_CHANNEL"), "the new flows passage names EXTERNAL_CHANNEL");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

### Task 6: UPDATE documentation/reference/commands.html, documentation/reference/scripts.html and documentation/changelog.html — the site pages and the changelog

- **ACTION**: Delivers AC-A6 (the site pages and the changelog entry that `documentation/AGENTS.md` requires). Read `documentation/AGENTS.md` sections on the `Unreleased` rule and on modifying an existing page first (no emojis, no inline style, American English, keep structure and ids). Three narrow `Edit` calls, no page added, no heading added inside an entry, no sentence containing `e.g.` or `i.e.` (the release tests split sentences at `. `), no new number, none of the words `impossible`, `closed catalogue` or `derived by the runner` in the new text, and no `EXTERNAL_CHANNEL` token (tests look up entries by the codes they name).
  1. `documentation/reference/commands.html`, the `Step vocabulary` row: `old_string` = `with <code>JUDGEMENT_UNCERTAIN</code>. <code>expect_requests</code> counts the requests the page issues` and `new_string` = `with <code>JUDGEMENT_UNCERTAIN</code>. A <code>read_message</code> step reads a verification code from a local mail or SMS source that the project declares in <code>channel_sources</code>, binds it to a variable of the case and keeps it out of every file the run writes; a source that is not local blocks the case. <code>expect_requests</code> counts the requests the page issues`. Read the row first; if the text before `<code>expect_requests</code> counts` differs, keep the anchor to the shortest unique text that ends at that code element. The row stays one physical line.
  2. `documentation/reference/scripts.html`, the `Assertions and request count` row: `old_string` = `reports the pending and the judged steps. <code>expect_requests</code> waits` and `new_string` = `reports the pending and the judged steps. A message step is checked by <code>classifyChannelSource</code> against the declared source, and its value is found by <code>extractMessageValue</code> in the message that <code>newestMailAfter</code> or <code>smsEntryAfter</code> chose. <code>expect_requests</code> waits`. Read the row first; keep the anchor to the shortest unique text that ends at that code element if the exact text differs. The row stays one physical line.
  3. `documentation/changelog.html`, `Added` list of `Unreleased`: `old_string` = `and the script never calls a model.</li>` followed by a newline and the `</ul>` line with the exact leading whitespace of the file (read lines 60 to 72 first; the first line is the end of the Model judgment entry) and `new_string` = the first line, then
     ```
             <li><strong>Local channel sources</strong> &mdash; a project may declare a local Mailpit origin or a local file
               under <code>channel_sources</code> in <code>qa-seed.json</code>, and a browser plan may carry a
               <code>read_message</code> step that reads a verification code from it after the step that sends the message.
               The newest message received after the case began yields the code, which is registered for redaction and
               reaches no evidence file, reason or terminal line. A source that is not local blocks the case, and a channel
               with no declared source is still declined as before.</li>
     ```
     then the closing `</ul>` line as it was. Indent the inserted `<li>` lines to match the neighbouring entries (8 spaces before `<li>`, 10 before the continuation lines).
  Constraints: add no `id` attribute (every id inside the block must start with `unreleased`), no `<h2`, and no `<li>` whose visible text equals an entry of the 0.46.0 release; the phrases the release tests pin stay in their existing entries; do not touch NAV, the search index, the page subtitle, any heading id, the released sections, the `Classification` rows or `plugins/relay/.claude-plugin/plugin.json`.
- **MIRROR**: `# SOURCE: documentation/changelog.html:65-71` (the shape of an entry and of the closing list tag); the two single-line `<dd>` rows keep their one physical line.
- **VALIDATE**: gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line of its row), check that no edited row or entry names the forbidden words, then the site tests. The greps fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'A <code>read_message</code> step reads a verification code from a local mail or SMS source that the project declares in <code>channel_sources</code>' documentation/reference/commands.html
  grep -qF -- 'A message step is checked by <code>classifyChannelSource</code> against the declared source' documentation/reference/scripts.html
  grep -qF -- '<strong>Local channel sources</strong>' documentation/changelog.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const cmd = readFileSync("documentation/reference/commands.html", "utf8").split("\n").filter((l) => l.includes("<code>read_message</code> step reads a verification code"));
  assert.equal(cmd.length, 1, "the commands row must be one physical line");
  const scr = readFileSync("documentation/reference/scripts.html", "utf8").split("\n").filter((l) => l.includes("A message step is checked by"));
  assert.equal(scr.length, 1, "the scripts row must be one physical line");
  for (const name of ["classifyChannelSource", "extractMessageValue", "newestMailAfter", "smsEntryAfter"]) assert.ok(Object.hasOwn(m, name) && scr[0].includes("<code>" + name + "</code>"), name);
  const log = readFileSync("documentation/changelog.html", "utf8");
  const at = log.indexOf("<strong>Local channel sources</strong>");
  const entry = log.slice(at, log.indexOf("</li>", at));
  assert.ok(at > 0, "the changelog entry is missing");
  for (const word of ["impossible", "closed catalogue", "derived by the runner", "EXTERNAL_CHANNEL", "e.g.", "i.e."]) assert.ok(!entry.includes(word) && !cmd[0].includes(word) && !scr[0].includes(word), "forbidden word " + word);
  const rel = log.indexOf("id=\"v0-46-0\"");
  assert.ok(rel > at, "the entry must sit in Unreleased, above the 0.46.0 release");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

## Validation Commands

Diff base: the tree object `c89da062cba15a0f349ae629f3f30b3d8eedb963` (the phase-5 end state; HEAD `c658a0c` is untouched and phases 1 to 5 are uncommitted, so never use a HEAD-relative or `<tree>..HEAD` form). Every "files changed" derivation below uses the single-argument form `git diff <tree> --name-only` plus `git ls-files --others --exclude-standard` for new files, and ignores `PRPs/` (pipeline artifacts: this plan, its review logs, the PRD row). Every git and node command carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. The plan writer has no shell, so none of these was executed: the Implementer runs each against the pre-change tree first and expects the stated result.

### Level 1 STATIC_ANALYSIS

Gate on syntax, the frozen surfaces, the untouched kit template, the untouched seed generator and the changed-file allowlist. `node --check` fails on a syntax error. The frozen-surface, template and changed-file checks pass on the unmodified tree (nothing changed yet) by design, as regression guards: they fail as soon as a frozen file, the template, the seed generator, a test file, the validate registry or any file outside the eight planned ones changes.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
# The five frozen surfaces, the kit login template and the seed generator are byte-identical to the phase-5 end state.
frozen="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff c89da062cba15a0f349ae629f3f30b3d8eedb963 --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs plugins/relay/resources/auth-login.template.mjs plugins/relay/scripts/qa-seed.mjs plugins/relay/commands/relay-qa-seed.md)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface, the kit template or the seed generator changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces, the kit template and the seed generator unchanged"
fi
# Only the eight planned files changed: no test file, no new file, no version bump, no NAV or search-index edit (PRPs/ artifacts are ignored).
# The diff base is the phase-5 end state, so the files phases 1 to 5 changed are not in this diff.
changed="$( { GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff c89da062cba15a0f349ae629f3f30b3d8eedb963 --name-only; GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git ls-files --others --exclude-standard; } | grep -v '^PRPs/' | sort -u || true )"
unexpected="$(printf '%s\n' "$changed" | grep -v '^$' | grep -vxF -e plugins/relay/scripts/qa-run.mjs -e plugins/relay/commands/relay-qa-run.md -e docs/api-reference.md -e docs/domain/glossary.md -e docs/domain/flows.md -e documentation/reference/commands.html -e documentation/reference/scripts.html -e documentation/changelog.html || true)"
if [ -n "$unexpected" ]; then
  echo "FAIL: a file outside the eight planned files changed (a test file would be an R-X violation):"; printf '%s\n' "$unexpected"; exit 1
else
  echo "PASS: only the planned files changed"
fi
```

### Level 2 CONTENT_INVARIANTS

Gate on the exported surface and the real-tree contract. The first command fails on the unmodified tree (the new names are not exported) and passes once Tasks 1 to 3 are done; it also pins the constants and vocabularies this phase must not change, the evidence-writer anchor, the single guard and write markers, the order of registration before write inside the reader, and the guard call before the first request. The remaining checks are regression guards that pass before and after: no static or dynamic sibling import added, no introduced forbidden path reference, and the non-browser tests that pin the documents and the runner this phase edits.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as m from "./plugins/relay/scripts/qa-run.mjs";
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
for (const name of ["classifyChannelSource", "newestMailAfter", "smsEntryAfter", "extractMessageValue", "groundLocators", "precheckGroundedSteps", "addSecretValues", "substituteVariables", "validateSteps"]) assert.equal(typeof m[name], "function", name + " is not exported");
for (const name of ["READ_MESSAGE_CHANNELS", "CHANNEL_SOURCE_KINDS", "READ_MESSAGE_WAIT_MS", "READ_MESSAGE_POLL_MS", "MESSAGE_REGEX_MAX", "MESSAGE_TEXT_MAX", "MESSAGE_VALUE_MAX"]) assert.ok(Object.hasOwn(m, name), name + " is not exported");
assert.equal(m.groundLocators.length, 4);
assert.equal(m.precheckGroundedSteps.length, 4);
assert.equal(m.validateSteps.length, 2, "validateSteps keeps its signature (the third parameter has a default)");
assert.equal(m.OUTCOMES.join(","), "pass,fail,blocked,needs-human", "the outcome vocabulary changed");
assert.equal(Object.keys(m.REASON_CATALOGUE).length, 12, "the reason-code catalogue changed");
assert.deepEqual([...m.RUNNER_OWNED_REASON_CODES].sort(), ["JUDGEMENT_UNCERTAIN", "PARTIAL_REMAINDER", "ROLE_NOT_DEDICATED"]);
assert.equal(m.REASON_CATALOGUE.EXTERNAL_CHANNEL.class, "impossible");
assert.ok(m.REASON_CATALOGUE.EXTERNAL_CHANNEL.reason.includes("a real external channel with no declared local source"));
assert.deepEqual([...m.POSITIVE_ASSERTION_ACTIONS], ["expect_visible", "expect_text", "expect_value", "expect_state"]);
assert.deepEqual([...m.SCOPED_LOCATOR_KEYS], ["within", "name_prefix", "label_text", "index"]);
const usage = m.USAGE.split("\n");
assert.equal(usage[0], "Usage:");
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
assert.ok(/import \{[^}]*realpathSync[^}]*\} from \x27node:fs\x27;/.test(source), "realpathSync must join the existing node:fs import");
assert.equal(source.split("secretFillAt.has(i)").length - 1, 2, "a secret fill must be masked on both fill paths");
const mailAt = source.indexOf("async function readMailValue(");
assert.ok(mailAt > 0, "readMailValue is missing");
const mailBody = source.slice(mailAt, source.indexOf("\n}\n", mailAt));
assert.ok(mailBody.includes("checkTarget(") && mailBody.indexOf("checkTarget(") < mailBody.indexOf("fetchAnonymously("), "the guard must be checked before the first request");
const runAt = source.indexOf("async function runReadMessage(");
assert.ok(runAt > 0, "runReadMessage is missing");
const runBody = source.slice(runAt, source.indexOf("\n}\n", runAt));
assert.ok(runBody.includes("addSecretValues(") && runBody.indexOf("addSecretValues(") < runBody.indexOf("writeEvidence("), "the value must be registered before anything is written");
const driverAt = source.indexOf("DRIVERS.browser = async (");
const driverEnd = source.indexOf("export function mintExpiryDue(");
const driver = source.slice(driverAt, driverEnd);
for (const needle of ["\x27expect_requests\x27", "observeRequests(", "settleRequestWindow(", "evaluateRequestWindow(", "serviceWorkers: \x27block\x27", "runReadMessage("]) assert.ok(driver.includes(needle), "the browser driver lost " + needle);
for (const v of [...source.matchAll(/outcome\s*[:=]\s*[\x27"]([^\x27"]+)[\x27"]/g)].map((x) => x[1])) assert.ok(["pass", "fail", "blocked", "needs-human"].includes(v), "an outcome literal outside the closed vocabulary: " + v);
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# No static sibling import was added to the runner (the copy-helper tests copy only qa-run.mjs and auth-local-guard.mjs).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# This phase added no import() call of any kind.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 c89da062cba15a0f349ae629f3f30b3d8eedb963 -- plugins/relay/scripts/qa-run.mjs | grep -E "^\+[^+]" | grep -qE "import\("; then
  echo "FAIL: an import() call was introduced"; exit 1
else
  echo "PASS: no import() call introduced"
fi
# No forbidden .claude/PRPs reference introduced by this phase's files outside the quoted-prohibition idiom.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 c89da062cba15a0f349ae629f3f30b3d8eedb963 -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md docs/api-reference.md docs/domain/glossary.md docs/domain/flows.md documentation/reference/commands.html documentation/reference/scripts.html documentation/changelog.html | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
# The non-browser tests that pin the runner and the documents this phase edits (they run no Chromium).
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-record-resolution.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs scripts/validate/checks/qa-run-query.test.mjs scripts/validate/checks/qa-run-plan-value-totality.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
```

### Level 3 DRY-RUN END-TO-END

This is the gate that proves a code is really read, bound, used and kept out of every file. It runs the REAL runner (`run`) in a real browser (Playwright 1.61.1 / Chromium 149 resolve through the `node_modules` junction; never modify it) against a loopback HTTP server that serves one page and emulates the three Mailpit endpoints the runner calls (`/api/v1/search`, `/api/v1/message/<id>`), plus, for the file source, a file inside the temp root. Every base URL is `http://127.0.0.1:<port>`, a local target the guard approves; no session is needed (the role is `null`); the temporary roots live outside any git work tree and no real mail service is contacted. The Implementer creates the scratch script ONCE, with the Write tool (never through a shell heredoc), at an absolute path outside the repository (for example under the session scratchpad), and exports `RELAY_P6_E2E=<that path>`; each task gate and the Level 3 gate then run it from the worktree root with a `SCENARIOS` list. Scenarios: `guard` (no source declared gives `needs-human` with the catalogued code; a non-local Mailpit origin and an sms path outside the root block the case), `mail` (the happy path through a click, a read, a fill and a verification; a channel with no declared source in the same run; a message older than the case start is never used and the case fails), `sms` (the same through a file, with an old line that the baseline excludes). The script fails, instead of skipping, when Chromium cannot launch: the assertion prints the case reason.

Contents of the scratch script:

```js
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REPO = process.cwd();
const RUNNER = join(REPO, 'plugins', 'relay', 'scripts', 'qa-run.mjs');
const CONTRACT = pathToFileURL(join(REPO, 'scripts', 'validate', 'checks', 'qa-run-contract.mjs')).href;
const FEATURE = 'msg-e2e';
const RUN_REL = 'PRPs/reports/msg-e2e/qa-run/20261021T000000000Z';
const CODE = '483920';
const PHONE = '+5511999990000';
const WANT = (process.env.SCENARIOS ?? 'guard,mail,sms').split(',');
for (const w of WANT) assert.ok(['guard', 'mail', 'sms'].includes(w), 'unknown scenario ' + w);

const PAGE = `<!doctype html><html><body>
<button onclick="send()">Send code</button>
<label>Code <input aria-label="Code" id="c"></label>
<button onclick="verify()">Verify</button>
<p id="out"></p><p id="echo"></p>
<script>
function send() { fetch("/send", { method: "POST" }); }
async function verify() {
  const v = document.getElementById("c").value;
  const t = await (await fetch("/check?v=" + encodeURIComponent(v))).text();
  document.getElementById("out").textContent = t === "ok" ? "Verified" : "Wrong";
  document.getElementById("echo").textContent = t === "ok" ? "Received " + v : "";
}
</script></body></html>`;

function startServer() {
  const state = { mails: [], hits: 0, smsFile: null };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (u.pathname === '/api/v1/search') {
      state.hits++;
      const q = u.searchParams.get('query') ?? '';
      const messages = state.mails.filter((m) => q === 'to:' + m.To[0].Address).map((m) => ({ ID: m.ID, Created: m.Created, To: m.To, Snippet: '' }));
      return json(200, { messages, total: state.mails.length, messages_count: messages.length });
    }
    if (u.pathname.startsWith('/api/v1/message/')) {
      state.hits++;
      const found = state.mails.find((m) => m.ID === decodeURIComponent(u.pathname.split('/').pop()));
      return json(found ? 200 : 404, found ?? {});
    }
    if (u.pathname === '/send') {
      state.mails.push({ ID: 'm' + state.mails.length, Created: new Date().toISOString(), To: [{ Address: 'user@example.test' }], Text: 'Your code is ' + CODE });
      if (state.smsFile) appendFileSync(state.smsFile, 'to:' + PHONE + ' code is ' + CODE + '\n');
      res.writeHead(204);
      return res.end();
    }
    if (u.pathname === '/check') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end(u.searchParams.get('v') === CODE ? 'ok' : 'no');
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, state, port: server.address().port })));
}

const runRunner = (root) => new Promise((resolveP) => {
  const child = spawn(process.execPath, [RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let out = ''; let err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  child.on('close', (status) => resolveP({ status, stdout: out, stderr: err }));
});

const MANUAL = ['1. Click Send code.', '2. Type the Code you received.', '3. Click Verify and see Verified.'];
const GOTO = { action: 'goto', path: '/' };
const SEND = { action: 'click', role: 'button', name: 'Send code' };
const SEE = { action: 'expect_visible', text: 'Verified' };
const FILL = { action: 'fill', role: 'textbox', name: 'Code', value: '{{code}}' };
const VERIFY = { action: 'click', role: 'button', name: 'Verify' };
const READ = (channel, to) => ({ action: 'read_message', channel, to, extract: { regex: 'code is (\\d{6})', as: 'code' } });
const FULL = (channel, to) => [GOTO, SEND, READ(channel, to), FILL, VERIFY, SEE];
const SHORT = (channel, to) => [GOTO, READ(channel, to), SEE];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const outcomes = (doc) => doc.cases.map((c) => [c.outcome, c.reason_code]);

async function scenario(name, { seed, defs, pre, check }) {
  const h = await startServer();
  const root = mkdtempSync(join(tmpdir(), 'relay-p6-' + name + '-'));
  try {
    const runDir = join(root, ...RUN_REL.split('/'));
    mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
    mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: 'http://127.0.0.1:' + h.port, roles: {} }));
    if (pre) pre(h, root);
    writeFileSync(join(root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify(seed(h.port)));
    const block = (n, d) => ['### Case ' + n, '**Title:** ' + d.title, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...MANUAL, ''].join('\n');
    writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), '# QA Report\n\n## Test Cases\n\n' + defs.map((d, i) => block(i + 1, d)).join('\n') + '\n## Notes\n\nnone\n');
    writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: null, state: 'none', steps: d.steps })) }));
    const run = await runRunner(root);
    const resultsPath = join(runDir, 'results.json');
    assert.ok(existsSync(resultsPath), name + ': no results.json: ' + run.stdout + run.stderr);
    const raw = readFileSync(resultsPath, 'utf8');
    check({ doc: JSON.parse(raw), raw, run, runDir, h, root });
    console.log('PASS: ' + name);
  } finally {
    h.server.close();
    rmSync(root, { recursive: true, force: true });
  }
}

const secrecy = ({ run, runDir }) => {
  for (const f of walk(runDir)) assert.ok(!readFileSync(f).toString('latin1').includes(CODE), 'the code is in ' + f);
  assert.ok(!run.stdout.includes(CODE) && !run.stderr.includes(CODE), 'the code reached the terminal');
};

if (WANT.includes('guard')) {
  await scenario('guard-undeclared', {
    seed: () => ({ states: {} }),
    defs: [{ title: 'Mail with no source', steps: FULL('mail', 'user@example.test') }, { title: 'Sms with no source', steps: FULL('sms', PHONE) }],
    check: ({ doc }) => {
      assert.deepEqual(outcomes(doc), [['needs-human', 'EXTERNAL_CHANNEL'], ['needs-human', 'EXTERNAL_CHANNEL']], JSON.stringify(doc.cases));
      assert.deepEqual(doc.counts, { pass: 0, fail: 0, blocked: 0, 'needs-human': 2 });
    },
  });
  await scenario('guard-refused', {
    seed: () => ({ states: {}, channel_sources: { mail: { kind: 'mailpit', url: 'http://mail.example.com:8025' }, sms: { kind: 'file', path: '../outside.txt' } } }),
    defs: [{ title: 'Mail from a non-local origin', steps: FULL('mail', 'user@example.test') }, { title: 'Sms from outside the root', steps: FULL('sms', PHONE) }],
    check: ({ doc, h }) => {
      assert.deepEqual(outcomes(doc), [['blocked', 'FAILED_NON_LOCAL_TARGET'], ['blocked', 'CHANNEL_SOURCE_INVALID']], JSON.stringify(doc.cases));
      assert.deepEqual(doc.counts, { pass: 0, fail: 0, blocked: 2, 'needs-human': 0 });
      assert.equal(h.state.hits, 0, 'no request may reach a mail endpoint');
    },
  });
}

if (WANT.includes('mail')) {
  await scenario('mail', {
    seed: (port) => ({ states: {}, channel_sources: { mail: { kind: 'mailpit', url: 'http://127.0.0.1:' + port } } }),
    pre: (h) => { h.state.mails.push({ ID: 'old', Created: new Date(Date.now() - 3600000).toISOString(), To: [{ Address: 'stale@example.test' }], Text: 'Your code is 111111' }); },
    defs: [
      { title: 'Mail code', steps: FULL('mail', 'user@example.test') },
      { title: 'Sms with no source in a mail run', steps: FULL('sms', PHONE) },
      { title: 'Stale mail', steps: SHORT('mail', 'stale@example.test') },
    ],
    check: (ctx) => {
      const { doc, runDir, h, raw } = ctx;
      assert.deepEqual(outcomes(doc), [['pass', null], ['needs-human', 'EXTERNAL_CHANNEL'], ['fail', null]], JSON.stringify(doc.cases));
      assert.deepEqual(doc.counts, { pass: 1, fail: 1, blocked: 0, 'needs-human': 1 });
      assert.deepEqual(doc.cases[0].steps.map((s) => s.result), ['passed', 'passed', 'passed', 'passed', 'passed', 'passed']);
      assert.equal(doc.cases[0].steps[2].action, 'read_message');
      assert.ok(h.state.hits > 0, 'the fake Mailpit was never called');
      const meta = join(runDir, 'evidence', 'case-1.message-3.json');
      assert.ok(existsSync(meta), 'no message metadata file');
      const metaText = readFileSync(meta, 'utf8');
      assert.equal(JSON.parse(metaText).channel, 'mail');
      assert.ok(!metaText.includes('user@example.test') && !metaText.includes('Your code'), 'the metadata file holds the message or the recipient');
      const txt = join(runDir, 'evidence', 'case-1.txt');
      assert.ok(existsSync(txt), 'the page text holds the code, so the final capture must be redacted text');
      assert.ok(/redacted/i.test(readFileSync(txt, 'utf8')), 'the text capture is not redacted');
      assert.ok(!raw.includes(CODE), 'results.json carries the code');
      secrecy(ctx);
      const check = spawnSync(process.execPath, ['--input-type=module', '-e', 'import { validateResults } from ' + JSON.stringify(CONTRACT) + '; const r = validateResults(JSON.parse(process.argv[1])); if (r.length) { console.error(r.join("\\n")); process.exit(1); }', raw], { encoding: 'utf8' });
      assert.equal(check.status, 0, 'the contract rejects the results: ' + check.stderr);
    },
  });
}

if (WANT.includes('sms')) {
  await scenario('sms', {
    seed: () => ({ states: {}, channel_sources: { sms: { kind: 'file', path: 'PRPs/auth/.sms/inbox.txt' } } }),
    pre: (h, root) => {
      mkdirSync(join(root, 'PRPs', 'auth', '.sms'), { recursive: true });
      h.state.smsFile = join(root, 'PRPs', 'auth', '.sms', 'inbox.txt');
      writeFileSync(h.state.smsFile, 'to:' + PHONE + ' code is 111111\n');
    },
    defs: [
      { title: 'Sms code', steps: FULL('sms', PHONE) },
      { title: 'Stale sms', steps: SHORT('sms', PHONE) },
    ],
    check: (ctx) => {
      const { doc, raw } = ctx;
      assert.deepEqual(outcomes(doc), [['pass', null], ['fail', null]], JSON.stringify(doc.cases));
      assert.deepEqual(doc.counts, { pass: 1, fail: 1, blocked: 0, 'needs-human': 0 });
      assert.ok(!raw.includes(CODE), 'results.json carries the code');
      secrecy(ctx);
    },
  });
}
console.log('ALL PASS: ' + WANT.join(','));
```

Run it from the worktree root, after Tasks 1 to 3 (it fails on the unmodified tree: every `read_message` step is `PLAN_ENTRY_INVALID`):

```bash
set -euo pipefail
E2E="${RELAY_P6_E2E:?set RELAY_P6_E2E to the absolute path of the scratch end-to-end script}"
test -f "$E2E"
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false SCENARIOS=guard,mail,sms node "$E2E"
```

Then the static suite and the corpus gate. `npm run validate` prints `28 passed, 0 failed (28 checks run)`; the grep fails if the count changes. The corpus gate runs last and alone (about five minutes) and runs the corpus exactly as `node --test "scripts/validate/**/*.test.mjs"` (the glob is passed to `node` unexpanded, never narrowed) with the TAP reporter.

```bash
set -euo pipefail
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF -- "28 passed, 0 failed (28 checks run)"
```

Corpus gate. The baseline is green (phase 5 closed with an empty allowlist). This phase is additive: research examined the existing tests that could observe it (the closed step vocabulary, the `EXTERNAL_CHANNEL` catalogue and decline tests, the `qa-seed.json` declaration and merge tests, the marked-example counts and mutations, the doc paragraph and bullet pins, the API-row and site-page pins, the copy-only-two-files helpers and the source-text pins) and predicts NO stale test, so the allowlist is EMPTY and the gate does not claim a bare zero outside it: it tolerates at most two further failing tests in the concurrent run (`FLAKE_BUDGET`), and each failing test file must then pass when run alone, which separates load sensitivity from a regression. More than two failures fails the gate; a file that also fails alone fails the gate and is a candidate for the test pair (`EXISTING_TEST_UPDATED`, with the allowlist then extended by title in a recorded decision), never an Implementer edit. The gate exits 1 on a runner crash, on a cancelled test, on output it cannot parse or whose counters disagree with its result lines, and when `node_modules/playwright` is missing from the worktree (it is a directory junction; never modify it). The TAP shape was observed on this host (Node v24.15.0): flat output, a failing test names its file only in the `location:` line of its YAML block, and an import-time crash is one `not ok` whose title is the file path.

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

- **AC-A1 (PRD AC-15, vocabulary):** Given a browser plan step `{ "action": "read_message", "channel", "to", "extract": { "regex", "as" } }`, when it is validated, then `channel` must be `mail` or `sms`, `to` a string of 3 to 254 characters with no whitespace, quote, angle bracket or backslash (a `{{name}}` capture is allowed), `extract.regex` a valid regular expression of at most 200 characters with at least one capturing group, `extract.as` a variable name, no other key is accepted (a `selector`, an `effect`, a `within` or a nested form is refused), the step is not an expectation, it is not a locator action or an absence anchor and it is refused in `http` entries; it needs an earlier `goto`, `click` or `fill` step, the name it binds is usable only in the steps after it and cannot repeat a declared capture or an earlier binding; every reason names keys and positions and never a value.
- **AC-A2 (PRD AC-15, AC-16, declaration and guard):** Given `channel_sources` in `PRPs/auth/qa-seed.json`, when a case holds a `read_message` step, then a channel with no declared entry ends the case `needs-human` `EXTERNAL_CHANNEL` (the existing catalogued code, class `impossible`); a malformed entry, an unknown key, a `kind` other than `mailpit` for mail and `file` for sms, a URL that is not http or https or carries credentials, an absolute sms path or one that resolves outside `target_root` ends it `blocked` `CHANNEL_SOURCE_INVALID`; and a Mailpit `url` that the local-only guard refuses ends it `blocked` `FAILED_NON_LOCAL_TARGET`; all of these before any seed, session, browser launch or request, with fixed sentences that never echo a declared value.
- **AC-A3 (PRD AC-15, mail read and binding):** Given `channel_sources.mail` `{ "kind": "mailpit", "url": "http://localhost:8025" }` and a `read_message` step with `channel: "mail"`, a `to` and `extract: { "regex", "as": "code" }` after the action that sends the message, when the case runs, then the newest message to that recipient received after the case's browser steps began is read through Mailpit's search API and its detail endpoint, the first regex group is bound to `{{code}}` for the later steps (which receive the value before they run), a message older than the case start is never used, and no matching message within 10 seconds ends the case `fail` with a fixed reason; an unreachable source ends it `blocked` `CHANNEL_UNREACHABLE`.
- **AC-A4 (PRD AC-16, sms file source):** Given `channel_sources.sms` `{ "kind": "file", "path": "<relative path>" }` and a `read_message` step with `channel: "sms"`, when the case runs, then only the bytes appended to the file since the case's browser steps began are searched, the last line that holds `to` is used with the same extraction and binding rules, a link that leaves the root is refused, and no matching entry within 10 seconds ends the case `fail`.
- **AC-A5 (PRD AC-21, secrecy):** Given a run with a `read_message` step, when it finishes, then the extracted value is registered with the existing redaction table before anything is written, no evidence file, reason, terminal line or `results.json` carries it, a field filled with it is masked in the final and judge captures, a final capture of a page that shows it is redacted text, the only message-derived file is `evidence/case-<n>.message-<k>.json` (channel, step position, message time), which holds neither the message, the recipient nor the value, and a value shorter than 4 characters ends the case `blocked` `CAPTURE_UNREDACTABLE`.
- **AC-A6 (PRD AC-22 for `read_message`):** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, then it carries a "Channel sources." paragraph, a literal marked example of the `read_message` step that validates against the script and carries no scoped key, the rules of the step and one honesty bullet; the line that lists the runner modes is byte-identical; `docs/api-reference.md` lists the eleven new exports in its single `qa-run.mjs` row and every name in the checked span is a real export; `docs/domain/glossary.md`, `docs/domain/flows.md`, `documentation/reference/commands.html`, `documentation/reference/scripts.html` and `documentation/changelog.html` state the same.
- **AC-A7 (PRD AC-24):** `npm run validate` passes with exactly 28 checks (none added), the corpus `node --test "scripts/validate/**/*.test.mjs"`, run in a worktree that has `node_modules`, passes the corpus gate of `## Validation Commands` (an empty allowlist and the load-sensitivity rule), and the five frozen surfaces, the kit login template, the seed generator and every test file are byte-identical to the phase-5 end state. This criterion is verified by Levels 1 to 3 and delivered by every task keeping its constraints; it has no dedicated task.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An extracted code leaks through a path the redaction table does not cover (an input value in a screenshot, a message file, a reason) | M | H | The value is registered with `addSecretValues` before any write (Level 2 asserts the order inside `runReadMessage`); a page whose text holds it is captured as redacted text; a `fill` that used it is masked on both fill paths (Level 2 counts the two mask lines); the only message file holds metadata; Level 3 scans every file of the run and the terminal for the code. The residual (a PNG mask that fails to cover a differently rendered echo of the code) cannot be asserted without decoding images and is left to the Phase 9 dogfood reading of the captures |
| A stale message is used (an earlier mail to the same recipient, or an old sms line) | M | H | Only a message whose `Created` is not before the case's browser start counts (equal counts), and only bytes appended to the file after the baseline are searched; Level 3 has a stale-mail case and a stale-sms case that must `fail`. A clock skew between a containerized catcher and the host can only make a fresh message look old, which fails the case and never passes it |
| A regular expression written by the planner runs long (catastrophic backtracking) | L | M | The expression is at most 200 characters, the searched text at most 65536 characters, the value at most 200 characters, and it is run once per poll; the planner is the command session, not an outside party. Recorded as a residual: JavaScript has no regex timeout, so a pathological pattern could stall one case until the process is stopped |
| A non-local mail origin or a path outside the root is read | L | H | The origin goes through the existing `checkTarget` twice (in `executeCase` and again right before the first request); the sms path is checked lexically at declaration time and by `realpathSync` at read time; Level 3 declares both and expects `blocked` with zero requests |
| A mail catcher with its relay on forwards real mail | L | M | The runner never sends; the command doc tells the operator to keep the catcher's relay off; a case needing a message from a channel with no declared source stays declined |
| A doc edit breaks a pinned sentence, paragraph start, ordering rule, sentence-splitting rule or example-count rule | M | M | The block sits after the declaration example, outside the judge slice and the chosen-inputs slice; the example carries no scoped key, no `effect` and no `username`; the new text avoids the word `impossible` and the token `EXTERNAL_CHANNEL` outside the command doc; Tasks 4 to 6 run the tests that pin the page they edit |
| New runner code or comments disturb a source-text pin or a mutation anchor | M | H | The helpers sit between `fetchAnonymously` and `DRIVERS.http`, outside every pinned section; the driver edits are four insertions that leave the loop header and every existing branch byte-identical; Level 2 runs the real-tree contract and counts the anchors and markers |
| A test counts the occurrences of `fetchAnonymously(` or `request.newContext(` across the whole script | L | M | Research found only section-scoped pins (the http section must keep `fetchAnonymously(`); if the corpus gate reports such a test, it goes to the test pair as `EXISTING_TEST_UPDATED`, never to the Implementer |
| The validation commands were derived by reading the tree, not executed (the plan writer has no shell) | M | L | They reuse the fixture shapes of shipped tests and of the phase-5 plan; the Implementer runs each against the pre-change tree first and expects the stated failure |
| Scope size across nine phases (PRD risk) | H | M | This phase is one lane on `qa-run.mjs`, independently testable, adds no reason-code catalogue entry and keeps every phase-1 to phase-5 contract |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework. (The task gates and the Levels run the existing test files only as regression guards, and the end-to-end script lives outside the repository in a scratch location; running a test is not touching it.)
- **Predicted stale tests: none.** Research read the tests that could observe the change and found that the design keeps each one true. `EXTERNAL_CHANNEL`: the catalogue entry already reads "a real external channel with no declared local source" (pinned at `qa-run-impossible-catalogue.test.mjs:118`), its class and the 12-key catalogue are untouched, `declinedCase` is untouched (the many tests that decline with `{ class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL' }` and no declaration stay valid), and the run-time decline is a new, separate path; the command-doc reason-table row and the impossible-class sentence are not edited. The closed vocabulary: no test counts or deep-equals the browser action list (the contract pins only `expect_value`, `expect_not_visible` and `expect_state`, and the runner mode list); `read_message` is not a locator action, so the locator iterations stay as they are. `qa-seed.json`: no test enumerates or rejects top-level keys, `qa-seed.mjs` is not edited and keeps unknown keys on merge, and `relay-qa-seed.md` is not edited. Marked examples: the one new example carries none of the keys the per-key, write, `{{username}}`, judge and `expect_requests` counters look for, the marker driver is `browser` (the driver-set test accepts exactly `http` and `browser`), and it is validated alone by the contract. Doc pins: the insertion points are outside the judge slice, the chosen-inputs slices and the first `states` JSON example; the mode-list line, the bridge sentence and the "Result fields" paragraph are untouched. API row and pages: the eleven new names sit after the `USAGE` token in the single `qa-run.mjs` row and are real exports. **At-risk list if an unpredicted failure appears** (each would be an `EXISTING_TEST_UPDATED` item for the test pair, never an Implementer edit, with the allowlist extended by title in a recorded decision): (1) `qa-run-scoped-locators.test.mjs` "AC-22 the command doc carries exactly one marked literal example per new key" and `qa-run-chosen-inputs.test.mjs` "AC-22 the run command carries one marked write example" / "AC-23 the run command carries one marked equals {{username}} example", only if the example were edited to carry one of their keys; (2) `qa-run-model-judgment.test.mjs` "AC-22 the judge block states the kinds" (its slice ends at the bridge sentence, which the block is placed after); (3) `qa-run-network-docs.test.mjs` "AC-12 the honesty rules tell the planner" (bullet order; the new bullet sits directly after the judge bullet); (4) `qa-run-seed-declaration.test.mjs` "AC-9/AC-10 the runner command doc states the refusal codes and /relay-qa-seed" (first `json` block with a `states` key; the new unmarked block has none); (5) `qa-run-case-vocabulary.test.mjs` "AC-1 the literal examples in the real command doc are marked for both drivers" (marker driver set); (6) any test that counts `fetchAnonymously(` or `request.newContext(` across the whole script, or that lists the exact set of evidence file kinds of a run (the new `case-<n>.message-<k>.json` kind); (7) `qa-run-privacy-pins.test.mjs` "AC-5 the proof precedes the browser in ground and the redaction table in run" (source-order pins; the new code sits in the driver and `executeCase`, after both). The corpus gate therefore allowlists nothing.
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A6).** `stepRules`/`validateStep`/`validateSteps` for `read_message` (the closed key set, the channel, recipient, regex and `as` rules, the group requirement, the length limits, the http refusal, the not-an-expectation rule, the earlier-interaction rule, the bound-name rules and collisions, hostile values and no echo); `classifyChannelSource` (undeclared, malformed, wrong kind, credentials, protocol, trailing slash, absolute and escaping sms paths, unknown keys, prototype-key names, no echo); `newestMailAfter`, `smsEntryAfter` and `extractMessageValue` (the boundaries, hostile input, totality, fixed reasons); the readers against a loopback fake Mailpit (the newest message after the start, a newer non-matching message, polling until a message arrives, a non-200 status, a malformed listing, the guard refusing before the first request) and against a temp file (the baseline, truncation, a link leaving the root); `runReadMessage` (each result and code, the registration before the write, the metadata-only evidence); the browser lifecycle (the Level 3 scenarios: a value bound and used by a later `fill`, the masks, the redacted text capture, the stale cases, the undeclared and refused sources); the new marked example (validates alone, exactly one, no scoped key), the new paragraph, the honesty bullet and the unchanged mode-list line; the API-reference export list (every name real); that a plan with no `read_message` step behaves byte-identically to the phase-5 runner.
- **Design decisions made here.** (1) `read_message` is not an expectation: a case that only reads still needs an assertion (`NO_EXPECTATION` otherwise), so a read can never earn a pass alone. (2) "After the case started" is the start of the browser driver, not of the seed: a message produced by a state seed is deliberately not used, because the step must read what the exercised flow sent. (3) The sms baseline is the file size at that moment, not a modification time, so an unrelated old line can never match and file-system timestamp granularity does not matter. (4) A newest message whose text does not match the regex is not final: the loop keeps polling until the deadline (a later message may be the right one) and the case then `fail`s with one fixed sentence; only the newest message after the start is ever read in an attempt. (5) A source that cannot be read is `blocked`, a message that never arrives is `fail`: the first is an environment problem, the second is an observation about the product. (6) The runtime halt codes `CHANNEL_SOURCE_INVALID` and `CHANNEL_UNREACHABLE` stay outside the reason-code catalogue, like `QUERY_SOURCE_INVALID` and `QUERY_FAILED` today, so the catalogue, its pins and the 12-code documentation counts do not move; the only catalogued code used is `EXTERNAL_CHANNEL`, which keeps its class. (7) The mail read reuses `fetchAnonymously` (no storage state, no header, no redirects) instead of a new network helper, and the guard call reuses `checkTarget`, so no new guard marker and no new import is needed. (8) Rewriting the remaining steps inside the driver (on a private copy of the plan) is preferred to a second substitution pass in `executeCase`, because the value only exists after the page has produced the message. (9) The Mailpit search is filtered on the recipient and the time is compared in the runner (`Created` against the start), not with the catcher's `after:` filter, whose time-of-day syntax the documentation does not state. (10) `relay-qa-seed.md`, `qa-seed.mjs` and `qa-run-contract.mjs` are left alone: channel sources are operator declarations like `query_sources`, the generator already keeps unknown top-level keys, and the contract already validates every marked example against the validator.
- **Research.** `research-codebase` located the seed-reading, guard, redaction, variable-substitution, step-vocabulary, driver-loop and `executeCase` anchors cited above (none of `channel_sources`, `read_message` or Mailpit exists anywhere in the tree), and found that the driver has no case clock, that `validateSteps` would otherwise reject any later `{{var}}` not bound by a seed capture, and that the seed file has no top-level key whitelist. Two read-only research passes read the test corpus and the documents: the first found no test that fails from the additions provided the hard source-text constraints hold and listed the at-risk tests above; the second returned the verbatim insertion anchors for Tasks 4 to 6. `research-web` (Mailpit documentation and source) confirmed `GET /api/v1/search?query=to:<address>` with newest-first `messages[]` (`ID`, `Created`, `To`, `Snippet`), `GET /api/v1/message/<ID>` returning the full message with `Text`, the default port 8025, and the `after:` filter taking `yyyy/mm/dd` with an optional time; it recorded gaps that this plan accounts for rather than assumes: the exact time-of-day syntax and timezone of `after:`, and the JSON key casing, which was inferred from untagged Go struct fields and not confirmed on a live response (decision 9 and the fixture follow the inferred names; the Phase 9 dogfood against a real Mailpit is where the casing is confirmed). All line anchors in this plan were read in the worktree files, except the exact old text of the two single-line API rows, the two single-line site rows and the last lines of the changelog `Added` list, which the Implementer reads in full before editing.
- **Anchor lines and pins to keep (collected for the Implementer).** The line `const abs = join(ctx.runDirAbs, 'evidence', name);` must occur exactly once. The line `const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';` stays byte-identical. The text between `export function precheckGroundedSteps(` and `export function summarizeEntries(` must contain `interactionHistory(` and `isPostInteractionSnapshot(`; the text between `async function runLocatorStep(` and `DRIVERS.browser = async (` must contain `'expect_value'`, `'expect_not_visible'` and `'expect_state'`; the session section from `function obtainSession(` to `async function prepareState(` must not contain `while (`; the text between the `// REQUEST-OBSERVATION-BEGIN` and `// REQUEST-OBSERVATION-END` markers must read no header, body, cookie or response accessor, so the new helpers stay outside it. The copy-helper tests copy only `qa-run.mjs` and `auth-local-guard.mjs`, so no new sibling import, static or dynamic. The banned strings in the command doc are `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type` and `--local-host`. In the API reference, a backticked camelCase or UPPER_SNAKE token between `REASON_CATALOGUE` and `USAGE` of the `qa-run.mjs` row must be a real export.
- **Docs sync and scope.** `docs/decisions.md` is not edited (so no `documentation/governance/decisions.html` mirror is involved). Under `documentation/` only `reference/commands.html`, `reference/scripts.html` and `changelog.html` change, following `documentation/AGENTS.md`: no page is added, so NAV and the search index are untouched, and `plugin.json` keeps its version. The `docs_sync` pass at implement time finds Task 5 already done.
- **Environment.** The host is Windows with Git Bash. Every command that runs git, node or npm carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. Keep LF line endings in every edited file (the `line-endings` check). `node_modules` in the worktree is a directory junction to the main checkout's: do not modify it; Playwright 1.61.1 and Chromium 149 are what the Level 3 gate uses. Use `grep -qF --` for any pattern that can start with `-`. Node paths in the gates are built from `process.cwd()` or `file:///C:/...` URLs, never from a bare backslash path.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Tasks 1 to 3 are gates that fail before the work (the new names are not exported, `read_message` is an unknown action). Tasks 4 to 6 are gates that fail before the work (the authored literals are absent) and then run the existing tests that pin the page they edit, which pass before and after. The Level 1 frozen-surface and changed-file checks pass on the unmodified tree by design; the Level 2 export check and the Level 3 end-to-end gate fail on it.

*Generated: 2026-10-21*
*Approved: 2026-10-22*
*Implemented: 2026-10-22*
*Status: IMPLEMENTED*
