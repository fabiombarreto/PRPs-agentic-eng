# Feature: Self-checking environment (Phase 7 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (`qa-run.mjs` gains a fifth mode, `preflight`, and a new usage line; the halt texts of `FAILED_PLAYWRIGHT_UNAVAILABLE` and `FAILED_BROWSER_UNAVAILABLE` change in `run` and `ground`; `ground` reports `FAILED_KIT_SCRIPT_STALE` by name; `results.json` gains an optional `RECORD_STALE` entry in its existing `warnings` array; `OUTCOMES`, `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, the four-key `counts` partition, `plan.json` and every other `results.json` key are unchanged); plugin packaging (the visual tooling's dependencies in a fresh plugin cache, decision F10); secret and personal-data handling in run evidence (a halt text names an absolute plugin-cache path, so it is printed to the terminal only and never written to `results.json`); a git-reading site (the record flag) and a store-reading site (the kit scripts) that touch no network; an existing command doc, a knowledge-base page set and site pages amended around a script-validated vocabulary; knowledge-base edit under `docs/` with `docs_sync: true`; site-page edits under `documentation/` that existing tests bind to the script and the command doc (`documentation/AGENTS.md` applies); frozen-surface constraint (five files byte-identical); no new validate check (the count stays 28)
- Decisions found:
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` AC-17, AC-18, AC-19, AC-20 and Phase 7 scope: kit staleness before planning and by name in `ground`; the `preflight` mode; the record staleness flag; fresh-cache dependency resolution or an actionable halt in every mode, proven against a cache-shaped directory; Open Question 1 (F10's mechanism) is decided here with its evidence (see `## Notes`)
  - `docs/decisions.md` [2026-10-06] "Provisioning the visual tooling's `node_modules` in every new plugin cache is a registered backlog item (F10)": folded into the PRD at the operator's request (2026-10-20); its three required decisions (where the install happens, what the halt names, how it is verified) are answered here
  - `docs/decisions.md` [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the outcome vocabulary is closed, a runner pass is evidence and not approval, the local-only guard is permanent, secrets never reach reports
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the plan-side-only boundary, the single write helper, `/relay-qa-report` unchanged
  - `docs/decisions.md` [2026-04-19] "Secret redaction policy for Test Runner reports": unchanged; the persisted halt reason carries no path
  - `docs/decisions.md` [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen; `hybrid_code_review` is `false`
  - `docs/decisions.md` [2026-04-19] "PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`"
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the absolute plugin-cache path contains the operator's home directory, so it appears in the terminal output only; the `results.json` reason is a fixed sentence without a path; no session value is read by the new code
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing test is verified stale (see `## Notes`), and none is edited by the Implementer; any unpredicted failure is routed to the test pair as `EXISTING_TEST_UPDATED`
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic": nothing here is inferred; the stale roles come from the scripts on disk, the provisioning command is fixed text
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays non-interactive and standalone; the provisioning command is relayed to the operator and never run by the command or the script
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive and standalone
  - Command versus script separation: the command runs the preconditions and relays halts; the script owns every deterministic check and read
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`): `preflight` makes no network request and launches no browser, so it adds no guard site and no `// GUARD-SITE` marker
  - Never download anything without the operator's consent: the runner and the command never install a package or a browser; the halt names the one command the operator runs
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; shipped text that tells the operator how to install uses `${CLAUDE_PLUGIN_ROOT}/scripts/visual`, never a repository-relative path (the `plugin-root-resolvable` check)
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, never `<base>..HEAD` or a HEAD-relative form; this phase's base is the phase-6 end-state tree object
  - `documentation/AGENTS.md`: a change under `documentation/` carries a changelog entry under `Unreleased`; NAV and the search index change only when a page is added, renamed or removed, and no page is added here; the version bump belongs to the release cut (Phase 8)
  - `npm run validate` keeps its 28 checks and no check module is edited by this phase
  - `qa-run-contract` source-text invariants stay true: `writeFileSync(` and `renameSync(` exactly once each, `// GUARD-SITE` and `// WRITE-SITE` exactly once each, `spawnSync(process.execPath` exactly once, no quoted outcome literal outside the four values, the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` and `export function mintExpiryDue(` each exactly once, no new static sibling import and no new `import()`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 7: "Self-checking environment" — Goal: zero manual preparation on a fresh plugin version — Success signal: a cache-shaped fixture directory either resolves Playwright or halts with the path; a stale kit halts before `init`.

## Summary

This phase makes the environment check itself. All runner changes are in `plugins/relay/scripts/qa-run.mjs`; no check module and no test file is edited. (1) **Fresh-cache dependencies (AC-20, F10).** A new `describePlaywright(root, pluginRoot)` reports whether Playwright resolves, from which package directory and at which version, and a new `playwrightUnavailableText(pluginRoot)` builds the halt text from the plugin's own `scripts/visual` directory: `playwright is not resolvable from the target or from <dir>; provision it once, with your consent, by running: npm --prefix "<dir>" install`. The `run` case reason, the `ground` halt and the `preflight` line all use it; the `results.json` reason is a fixed path-free sentence and the run prints the full text on standard error and exits 1, because the absolute path carries the operator's home directory. The Chromium-missing halt of `ground` gets the same command. The mechanism decision (no lockfile, no `${CLAUDE_PLUGIN_DATA}`; an actionable halt) is recorded with its evidence in `## Notes`. (2) **Kit staleness (AC-17).** `staleKitRoles(root)` lists every kit login script whose stamp differs from the installed template; `ground` throws `FAILED_KIT_SCRIPT_STALE` by name (the `SESSION_UNAVAILABLE` line is untouched); the command doc gains a precondition `P2b` that runs `preflight` before `init`. (3) **The `preflight` mode (AC-18).** `qa-run.mjs preflight --root <dir>` reads files and asks git, makes no network request and writes nothing: it reports Playwright and its path, the Chromium build, the kit scripts and the ignore rule of `PRPs/auth/.sessions/`, and exits 1 on any failure; it joins `USAGE` and is dispatched before `parseArgs`. (4) **The record flag (AC-19).** `recordStaleSources` reads the relative static imports of a record-resolved case's cited test files and asks git whether each imported source changed after the record's `generated_at`; the evidence file lists them under `stale_sources` and `results.json` carries a `RECORD_STALE` warning; the outcome is unchanged. (5) **Docs.** The command doc, the knowledge base, the two site pages and the changelog state the same. The runner gains six exports (`describePlaywright`, `playwrightUnavailableText`, `staleKitRoles`, `recordStaleSources`, `runPreflight`, `PREFLIGHT_SESSION_PROBES`), all listed in the `qa-run.mjs` row of the API reference after the `USAGE` token. No existing test is verified stale; the Implementer touches no test file.

## User Story

As the operator of relay's human validation gate
I want `/relay-qa-run` to check its own environment before it plans and to tell me exactly what is missing and the one command that fixes it
So that a freshly installed plugin version never costs a hand-copied `node_modules` or a stale kit discovered in the middle of a run

## Problem Statement

The 0.46.0 plugin cache had no Playwright `node_modules`; the dogfood copied it by hand from 0.45.0, as every dogfood since 0.40.0 needed a manual step. The `run` halt names the repository path (`plugins/relay/scripts/visual/`), which does not exist in a cache, and `ground` gives no remediation. A kit login script generated from an older template (`praesto-sum`'s `login-owner.mjs` carried `auth-login/1`) halted `FAILED_KIT_SCRIPT_STALE` only at the first `ground`, which reported it as `SESSION_UNAVAILABLE (FAILED_KIT_SCRIPT_STALE)`; the fix needed the operator. And a record-resolved pass checks only the JUnit artifact's modification time against the record's `generated_at`: 11 of `praesto-sum`'s 19 record-resolved passes cited tests importing code changed after the record, which only a manual re-run settled.

## Solution Statement

Runner, one command doc, one auth-scripts sentence, knowledge base, site pages; the outcome vocabulary, the reason-code catalogue, the kit login template, the seed generator, the visual tooling package and the validate check count are untouched. (1) The Playwright description and halt texts are small pure helpers placed directly after `loadPlaywright`, which itself is not edited (its call sites are pinned). (2) The stale-role list reuses `staleKitScript` unchanged and fails open exactly as it does. (3) `preflight` is composed from those helpers plus the existing `gitCall` and `insideWorkTree`; it spawns nothing but git, so `spawnSync(process.execPath` stays at one occurrence. (4) The record flag runs after record resolution in `executeCase`, never changes the outcome, fails open outside a git work tree and adds keys only when it finds something, so every existing fixture is byte-identical. (5) The command doc's new precondition `P2b` runs `preflight` before `init` and tells the session to relay a provisioning command, never to run it.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/commands/relay-auth-scripts.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `docs/domain/flows.md`; `docs/context/integrations.md`; `documentation/reference/commands.html`; `documentation/reference/scripts.html`; `documentation/changelog.html` |
| Dependencies | none new (row 7 of 9; `Depends` is `-`; shares `lane:qa-run` with phases 1 to 6, all `complete`, so it runs serially after phase 6); Node built-ins only, no new package, no sibling import, no new `import()` |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 101-104 (AC-17 to AC-20), 106 (AC-22), 108 (AC-24), 114 (Open Question 1), 196 (F10 risk), 211 (row 7), 247-251 (Phase 7 details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 101-104, 106, 108, 114, 196, 211, 247-251 | AC-17 to AC-20, AC-22, AC-24, F10's open question and risk, the row and the Phase 7 scope this plan implements |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 68-160 | the imports, the shared usage-line constants (`GROUND_USAGE_LINE`, `JUDGE_USAGE_LINE`) and `USAGE`, where Task 3 adds the preflight line |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2697-2711 | `loadPlaywright`, READ-ONLY (its callers' literals are pinned); the insertion point of Task 1's helpers is directly after it |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 880-1003 | `RUN_IGNORE_RULES`, `gitCall`, `insideWorkTree`, `probeIgnored` and `requireRunIgnore`: reused as they are by `preflight` and the record flag |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3850-3873, 3950-3990 | `staleKitScript` (reused unchanged) and `obtainSession` (READ-ONLY: the section from `function obtainSession(` to `async function prepareState(` must stay free of `while (` and of new code) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4344-4413 | `resolveFromRecord`: the value whose `files[].cited` and `record_generated_at` Task 4 reads |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4537-4548, 4617-4619, 4672-4682 | `executeCase`: the record-resolved branch (Task 4), the Playwright check (Task 1) and the run-mode stale text (READ-ONLY: a test asserts `/relay-auth-scripts --refresh`) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4723-4770, 4826-4848, 4916-4939 | `runRun`: the context builder, the warnings array, the entry assembly and the summary lines where Tasks 1 and 4 add their lines (the line `const keepSteps = ...` and the text after `requireRunIgnore(runDirAbs);` stay byte-identical) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 5246-5315, 5383-5400 | `runGround` (the Playwright, stale and browser lines) and `runGroundGuarded` (the insertion point of Task 3's functions follows it) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 5583-5615 | `main`: the dispatch Task 3 extends |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 85-146, 985-1014, 1087-1118 | the preconditions (P2 and P3, between which Task 5 inserts P2b), the record-resolution bullet list and the final output surface |
| P0 | `plugins/relay/commands/relay-auth-scripts.md` | 246-251 | the "Which roles `--refresh` covers." paragraph after which Task 5 adds one sentence |
| P0 | `docs/api-reference.md` | 129, 219 | the `/relay-qa-run` row and the `qa-run.mjs` row (each is one very long physical line; read it in full before editing) |
| P0 | `docs/domain/glossary.md` | 433-442 | the read_message paragraph, after which Task 6 inserts |
| P0 | `docs/domain/flows.md` | 172-175 | the passage of numbered item 4 where Task 6 inserts |
| P0 | `docs/context/integrations.md` | 85-114 | the Playwright / Chromium section Task 6 extends |
| P0 | `documentation/reference/commands.html` | 339-360 | the `/relay-qa-run` entry: its definition-list rows and the Re-mint row after which Task 7 adds a row |
| P0 | `documentation/reference/scripts.html` | 207-236 | the `qa-run.mjs` entry: its rows (Re-mint at line 223) and the usage block (lines 232-236) |
| P0 | `documentation/changelog.html` | 31-104 | the `Unreleased` block whose `Added` list Task 7 extends |
| P0 | `documentation/AGENTS.md` | the sections on the `Unreleased` rule (7.3) and "modify an existing page" | the rules that bind Task 7 |
| P1 | `PRPs/plans/completed/qa-runner-ai-executable-steps-phase-6-local-channel-sources.plan.md` | the Level 1 to 3 blocks, the corpus gate and the `## Notes` register | READ-ONLY: the changed-file checks, the real-runner harness shape and the TAP corpus-gate parser this plan adapts |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 340-531 | READ-ONLY (R-X): the source-text invariants and section markers the new code must not disturb |
| P1 | `scripts/validate/checks/qa-run-release-pages.test.mjs` | 220-238, 486-541 | READ-ONLY (R-X): the usage-block comparison, the row-label and sentence rules of the two site pages and the rule that every identifier between `REASON_CATALOGUE` and `USAGE` in the API row is a real export |
| P1 | `scripts/validate/checks/qa-run-kit-hardening.test.mjs` | 246-427 | READ-ONLY (R-X): the copy-the-runner helper and the run-mode stale tests (the run text must keep `/relay-auth-scripts --refresh`) |
| P1 | `scripts/validate/checks/qa-run-record-resolution.test.mjs` | 28-170, 241-290 | READ-ONLY (R-X): the record fixtures and the evidence-shape assertions Task 4 must keep true |
| P1 | `scripts/validate/checks/plugin-root-resolvable.test.mjs` | 201, 232 | READ-ONLY (R-X): the repository-relative install forms that shipped text must never contain |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2702-2711
function loadPlaywright(root, pluginRoot) {
  for (const base of [join(root, 'package.json'), join(pluginRoot, 'scripts', 'visual', 'package.json')]) {
    try {
      return createRequire(base)('playwright');
    } catch {
      // try the next resolution root
    }
  }
  return null;
}
```
Read by Task 1 and NOT edited: `describePlaywright` calls it for the module and repeats the same two resolution bases with `require.resolve` to learn the package directory. A package installed anywhere above `<plugin>/scripts/visual/` (including the plugin root) resolves through Node's walk-up, so no third base is needed.

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3858-3873
function staleKitScript(script) {
  /** @type {string} */ let text;
  /** @type {string} */ let installed;
  try {
    text = readFileSync(script, 'utf8');
    installed = readFileSync(join(PLUGIN_ROOT, 'resources', 'auth-login.template.mjs'), 'utf8');
  } catch {
    return null;
  }
  if (!text.includes(KIT_SCRIPT_MARKER)) return null;
  const want = KIT_STAMP_PATTERN.exec(installed);
  if (!want) return null;
  const have = KIT_STAMP_PATTERN.exec(text);
  if (have && have[1] === want[1]) return null;
  return `${have ? have[1] : 'unstamped'} vs ${want[1]}`;
}
```
Read by Task 2 and NOT edited: `staleKitRoles` calls it for each `login-<role>.mjs` file, so it inherits the fail-open rules (unreadable script or template, no marker sentence, unstamped template) that `qa-run-kit-hardening.test.mjs` pins.

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:917-931
function gitCall(run, runDirAbs, gitArgs) {
  const env = { ...process.env };
  for (const name of GIT_REDIRECT_VARS) delete env[name];
  return run('git', ['-C', runDirAbs, ...gitArgs], { encoding: 'utf8', env, timeout: 15000, windowsHide: true });
}

function insideWorkTree(run, runDirAbs) {
  const r = gitCall(run, runDirAbs, ['rev-parse', '--is-inside-work-tree']);
  return !r.error && r.status === 0 && String(r.stdout).trim() === 'true';
}
```
Read by Tasks 3 and 4 and NOT edited: `runPreflight` (the ignore probe) and `recordStaleSources` (the log and status queries) call them with an injectable `run` that defaults to `spawnSync`, passed as a value (the pinned `spawnSync(process.execPath` literal is not repeated).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:5299-5302
    if (!Object.hasOwn(roles, role)) throw new Halt('ROLE_UNDECLARED', `role ${role} is not declared in PRPs/auth/login.config.json`);
    const s = obtainSession(ctx, role);
    if (!s.ok) throw new Halt('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`);
    storagePath = s.info.path;
```
Copied by Task 2 (a stale-script branch is inserted between the `obtainSession` line and the `SESSION_UNAVAILABLE` line; the `SESSION_UNAVAILABLE` line stays byte-identical, because that sentence is pinned).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4672-4675
    const s = obtainSession(ctx, role);
    if (!s.ok && s.code === 'FAILED_KIT_SCRIPT_STALE') {
      return out(blocked(s.code, `the kit login script for role ${role} was generated from a different template than the installed one (${s.detail ?? 'identities unknown'}); nothing was saved or reused; run /relay-auth-scripts --refresh`));
    }
```
Copied by Task 2 (the wording of the ground halt mirrors this sentence; this run-mode sentence is READ-ONLY because `qa-run-kit-hardening.test.mjs:373-379` matches `/relay-auth-scripts --refresh` and the two identities).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4537-4547
async function executeCase(ctxOrNull, kase, planByIndex, target, makeCtx, root, feature) {
  const resolved = resolveFromRecord(root, feature, kase);
  if (resolved !== null) {
    // No driver runs for a resolved case, and a plan entry for it is ignored. Never a pass without evidence.
    try {
      const evCtx = ctxOrNull ?? makeCtx();
      const evidence = writeEvidence(evCtx, `case-${kase.index}.record.json`, { kind: 'json', value: resolved.value });
      return { result: { outcome: resolved.outcome, reason_code: 'AUTOMATED_EVIDENCE', reason: resolved.reason, evidence: [evidence] }, driver: null, role: null };
    } catch {
```
Copied by Task 4 (the staleness list is computed from `resolved.value` inside the same `try`, the evidence value and the returned result gain a key only when the list is non-empty).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4929-4935
    for (const w of warnings) lines.push(`WARNING ${w.code}: ${w.message}`);
    if (aborted) lines.push(`RUN ABORTED: ${aborted.reason_code}`);
    if (shaAfter !== shaBefore) {
      process.stderr.write(`FAILED_REPORT_MODIFIED: ${reportRel} changed during the run\n`);
      exitCode = 1;
    }
```
Copied by Task 1 (the `FAILED_PLAYWRIGHT_UNAVAILABLE` stderr line and exit code 1 follow the register of the report-modified halt, directly after this `if` block).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:150-160
/** The one `judge` usage line, shared by USAGE and JUDGE_USAGE so the two cannot drift. */
const JUDGE_USAGE_LINE = '  qa-run.mjs judge --run-dir <rel-dir> --case <n> --step <k> --verdict <pass|fail|uncertain> --evidence "<what the capture shows>" [--root <dir>]';

export const USAGE = `Usage:
  qa-run.mjs parse --report <path>
  qa-run.mjs init  --root <dir> --feature <slug> [--env-handle <path>]
  qa-run.mjs run   --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]
${GROUND_USAGE_LINE}
${JUDGE_USAGE_LINE}
  qa-run.mjs --help
`;
```
Copied by Task 3 (a `PREFLIGHT_USAGE_LINE` constant defined before `USAGE`, one `${PREFLIGHT_USAGE_LINE}` line between the judge line and `  qa-run.mjs --help`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:5587-5593
async function main(argv) {
  if (argv[0] === 'ground') return await runGroundGuarded(argv.slice(1));
  if (argv[0] === 'judge') return await runJudgeGuarded(argv.slice(1));
  const args = parseArgs(argv);
  if (args === null) {
    process.stderr.write(USAGE);
    return 2;
  }
```
Copied by Task 3 (`preflight` is dispatched on the next line, before `parseArgs`, which stays unchanged).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:106-111 (the P2 precondition)
### P2 — The report exists

`PRPs/reports/<feature>/qa-report.md` must exist. Otherwise HALT:

> FAILED_QA_REPORT_MISSING: `PRPs/reports/<feature>/qa-report.md` does not exist.
> Produce it with `/relay-qa-report` first. Nothing has been written.
```
Copied by Task 5 (the register of a precondition: a `###` heading, one fenced bash line, a HALT quotation).

```
# SOURCE: docs/domain/flows.md:172-175
   exists only after an interaction). An automated case that the test record
   resolves still gets its entry: it decides nothing about the outcome, but its
   class and objective-step count are still read.
   The run's evidence is kept readable and out of git. Session values are
```
Copied by Task 6 (numbered item 4 of the manual-QA flow keeps its 3-space indent on every line; the new passage goes between the last two lines).

```
# SOURCE: documentation/changelog.html:71-77
        <li><strong>Local channel sources</strong> &mdash; a project may declare a local Mailpit origin or a local file
          under <code>channel_sources</code> in <code>qa-seed.json</code>, and a browser plan may carry a
          <code>read_message</code> step that reads a verification code from it after the step that sends the message.
          The newest message received after the case began yields the code, which is registered for redaction and
          reaches no evidence file, reason or terminal line. A source that is not local blocks the case, and a channel
          with no declared source is still declined as before.</li>
        </ul>
```
Copied by Task 7 (the shape of an `Added` entry and of the closing list tag: 8 spaces before `<li>`, 10 before the continuation lines; the Implementer reads lines 60 to 80 first for the exact whitespace).

```
# SOURCE: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-6-local-channel-sources.plan.md:883-889
const runRunner = (root) => new Promise((resolveP) => {
  const child = spawn(process.execPath, [RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let out = ''; let err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  child.on('close', (status) => resolveP({ status, stdout: out, stderr: err }));
});
```
Copied by the Level 3 harness (it spawns a COPY of the real runner placed in a cache-shaped temp tree, with a temp target root as `cwd`, and with `NODE_PATH` removed from the environment).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the Playwright helpers and halt texts, the stale-role list and the by-name `ground` halt, the `preflight` mode, the record staleness list and its warning |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | precondition `P2b` (preflight before `init`), one record-resolution bullet, one sentence in the final output surface |
| `plugins/relay/commands/relay-auth-scripts.md` | UPDATE | one sentence after the "Which roles `--refresh` covers." paragraph: the runner's preflight lists the stale scripts |
| `docs/api-reference.md` | UPDATE | the `/relay-qa-run` row (the preflight, the halts, the flag) and the `qa-run.mjs` row (the six exports, after `USAGE`) |
| `docs/domain/glossary.md` | UPDATE | one new paragraph before "QA grounding snapshot" |
| `docs/domain/flows.md` | UPDATE | one added passage in numbered item 4 |
| `docs/context/integrations.md` | UPDATE | one bullet in the Playwright / Chromium section: the runner also uses the package and how a fresh plugin directory is provisioned |
| `documentation/reference/commands.html` | UPDATE | one new row, `Environment preflight`, in the `/relay-qa-run` entry |
| `documentation/reference/scripts.html` | UPDATE | one new row, `Environment preflight`, in the `qa-run.mjs` entry and one line in its usage block |
| `documentation/changelog.html` | UPDATE | one `Added` entry under `Unreleased`, as `documentation/AGENTS.md` requires for any change under `documentation/` |

## NOT Building (Scope Limits)

- The release cut (Phase 8) and the dogfood (Phase 9). The version bump, the install of the new version and the verification that the new cache needs the provisioning command stay in Phase 8.
- Any automatic install or download. The runner and the command never run `npm`, `npx` or a browser download; the halt names the command and the operator runs it.
- A lockfile, a `package.json` at the plugin root, or a use of `${CLAUDE_PLUGIN_DATA}` (decided against with evidence; see `## Notes`). `plugins/relay/scripts/visual/package.json` and `provision.mjs` stay byte-identical (`figma-track-phase6.test.mjs` pins the package, and the root `package.json` must not declare `playwright`, `pixelmatch` or `pngjs`).
- Launching a browser, making a network request or calling the local-only guard from `preflight`: it asks the installed package where the Chromium build should be and checks the file exists.
- Offering to re-run the cited test files from the record flag (PRD Open Question 4, a Could beyond AC-19).
- A change to `loadPlaywright`, `staleKitScript`, `obtainSession`, `resolveFromRecord`, `parseArgs`, `proveRunIgnored`, `ensureRunIgnore`, `requireRunIgnore`, `writeRunFile`, `writeEvidence`, the run-mode stale sentence, the `SESSION_UNAVAILABLE` sentence, `OUTCOMES`, `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, `plan.json` or any `results.json` key other than the optional `warnings` entry.
- A new reason-code catalogue entry: `FAILED_PLAYWRIGHT_UNAVAILABLE`, `FAILED_BROWSER_UNAVAILABLE`, `FAILED_KIT_SCRIPT_STALE`, `FAILED_IGNORE_UNPROVEN` and `RECORD_STALE` stay outside the catalogue (the first four are existing runtime halt codes, `RECORD_STALE` is a warning code like `SUMMARY_TABLE_MISMATCH`).
- The line of `relay-qa-run.md` that lists the runner modes (`the runner script (`parse`, `init`, `run`, `ground`)`: `qa-run-vocabulary-pins.test.mjs:68,183` pins it byte for byte and phase 5 did not extend it for `judge`; `preflight` is documented in `P2b` and in `USAGE` instead), the reason-code table, the "Result fields" paragraph, the ground-halt sentence that `qa-run-stable-grounding.test.mjs:409` matches, and the `Classification` rows of the site pages.
- A new validate check or an edit of `scripts/validate/checks/qa-run-contract.mjs` (the count stays 28).
- `docs/decisions.md`, NAV (`assets/js/app.js`), the search index and the plugin version.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`, and any change to a reference report.
- Any test file. R-X strict: the Implementer authors zero test files; the new tests are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the Playwright description, the halt texts in every mode and the run exit code

- **ACTION**: Delivers AC-A4 (PRD AC-20). Five edits in `plugins/relay/scripts/qa-run.mjs`; `loadPlaywright` and its call-site literals stay as they are.
  1. Directly after the closing brace of `loadPlaywright` and before the `/**` of `getPath`, insert (the comments must not contain `writeFileSync(`, `renameSync(`, `spawnSync(process.execPath`, `locator.within(` or the text `import(`):
     ```js

     /** The plugin's visual-tooling directory, with forward slashes: where the runner looks for Playwright when the target has none. */
     function visualDirOf(/** @type {string} */ pluginRoot) {
       return fwd(join(pluginRoot, 'scripts', 'visual'));
     }

     /** The one command that provisions the visual tooling's packages; the package's own postinstall also installs the Chromium build. */
     function provisionCommand(/** @type {string} */ dir) {
       return `npm --prefix "${dir}" install`;
     }

     /** The reason a persisted case carries: a fixed sentence with no path, because the plugin cache path holds the operator's home directory. */
     const PLAYWRIGHT_UNAVAILABLE_REASON = "playwright is not resolvable from the target or from the plugin's visual tooling directory; the run printed the resolved path and the one command that provisions it";

     /**
      * The terminal text of an unresolvable Playwright, in every mode: the resolved plugin directory and the one
      * provisioning command. It names an absolute path, so it is printed and never written to a run file.
      * @param {string} pluginRoot
      * @returns {string}
      */
     export function playwrightUnavailableText(pluginRoot) {
       const dir = visualDirOf(pluginRoot);
       return `playwright is not resolvable from the target or from ${dir}; provision it once, with your consent, by running: ${provisionCommand(dir)}`;
     }

     /**
      * The terminal text of a Chromium build that is missing or cannot start, with the same one command.
      * @param {string} pluginRoot
      * @returns {string}
      */
     function browserUnavailableText(pluginRoot) {
       const dir = visualDirOf(pluginRoot);
       return `the Chromium build of the resolved playwright is not installed or could not be launched; install it once, with your consent, by running: ${provisionCommand(dir)}`;
     }

     /**
      * Whether Playwright resolves for a target and plugin root, from which package directory and at which version.
      * It loads the package the way the runner does and reports where it came from; it makes no request and starts no browser.
      * @param {string} root the target root
      * @param {string} pluginRoot
      * @returns {{ playwright: any | null, path: string | null, version: string | null, visualDir: string }}
      */
     export function describePlaywright(root, pluginRoot) {
       const visualDir = visualDirOf(pluginRoot);
       const playwright = loadPlaywright(root, pluginRoot);
       if (playwright === null) return { playwright: null, path: null, version: null, visualDir };
       for (const base of [join(root, 'package.json'), join(pluginRoot, 'scripts', 'visual', 'package.json')]) {
         try {
           const dir = dirname(createRequire(base).resolve('playwright'));
           const pkg = readJsonOrNull(join(dir, 'package.json'));
           return { playwright, path: fwd(dir), version: isObj(pkg) && isStr(pkg.version) ? pkg.version : null, visualDir };
         } catch {
           // this base does not resolve the package; the next one may
         }
       }
       return { playwright, path: null, version: null, visualDir };
     }
     ```
  2. In `executeCase`, replace the line `return out(blocked('FAILED_PLAYWRIGHT_UNAVAILABLE', 'playwright is not resolvable; run `npm install` in plugins/relay/scripts/visual/'));` with `return out(blocked('FAILED_PLAYWRIGHT_UNAVAILABLE', PLAYWRIGHT_UNAVAILABLE_REASON));` (the `if (ctx.playwright === null) {` line and its position are unchanged).
  3. In `runGround`, replace the line `if (playwright === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', 'playwright could not be resolved from the target or the plugin');` with `if (playwright === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', playwrightUnavailableText(PLUGIN_ROOT));`. The line before it, `const playwright = loadPlaywright(root, PLUGIN_ROOT);`, is NOT touched (it must occur exactly once in the ground section, after `requireRunIgnore(`).
  4. In `runGround`, replace the Halt of the browser launch: `throw new Halt('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/');` with `throw new Halt('FAILED_BROWSER_UNAVAILABLE', browserUnavailableText(PLUGIN_ROOT));`.
  5. In `runRun`, in the `finally` block, directly after the `if (shaAfter !== shaBefore) { ... }` block (the block that writes `FAILED_REPORT_MODIFIED`) and before the line `lines.push(HUMAN_GATE_SENTENCE, `Review file: ${reportRel}`);`, insert:
     ```js
         if (entries.some((e) => e.reason_code === 'FAILED_PLAYWRIGHT_UNAVAILABLE')) {
           process.stderr.write(`FAILED_PLAYWRIGHT_UNAVAILABLE: ${playwrightUnavailableText(PLUGIN_ROOT)}\n`);
           exitCode = 1;
         }
     ```
  Constraints: no new import line (`dirname` and `createRequire` are already imported); no line may combine a path with a home-directory collapse (the persisted reason is a fixed sentence); keep the line `const abs = join(ctx.runDirAbs, 'evidence', name);` exactly once; do not move `requireRunIgnore(runDirAbs);` or the text after it in `runRun`; do not touch the line `const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2702-2711` (the resolution bases the description repeats) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:4929-4935` (the register of a stderr halt line and exit code in the `finally` block).
- **VALIDATE**: delivers AC-A4. Fails on the unmodified tree (`playwrightUnavailableText` and `describePlaywright` are not exported, and the halt texts name the repository path) and passes after the task. It checks the exports on stub cache directories, then runs a COPY of the real runner placed in a cache-shaped temp tree with no Playwright, in `ground` and in `run` mode. The scratch script is the one under `## Validation Commands` (Level 3): create it with the Write tool first and export its absolute path as `RELAY_P7_E2E`.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  assert.equal(typeof m.describePlaywright, "function", "describePlaywright is not exported");
  assert.equal(typeof m.playwrightUnavailableText, "function", "playwrightUnavailableText is not exported");
  const tmp = mkdtempSync(join(tmpdir(), "relay-p7-unit-"));
  try {
    const fw = (p) => p.split("\\").join("/");
    const cache = join(tmp, "cache");
    const visual = join(cache, "scripts", "visual");
    mkdirSync(visual, { recursive: true });
    const target = join(tmp, "target");
    mkdirSync(target, { recursive: true });
    const none = m.describePlaywright(target, cache);
    assert.equal(none.playwright, null);
    assert.equal(none.path, null);
    assert.equal(none.visualDir, fw(visual));
    const text = m.playwrightUnavailableText(cache);
    assert.ok(text.includes(fw(visual)), "the text must name the resolved plugin directory");
    assert.ok(text.includes("npm --prefix \"" + fw(visual) + "\" install"), "the text must name the one command");
    assert.ok(!text.includes("plugins/relay/scripts/visual"), "the text must not name the repository path");
    const pkg = join(visual, "node_modules", "playwright");
    mkdirSync(pkg, { recursive: true });
    writeFileSync(join(pkg, "package.json"), JSON.stringify({ name: "playwright", version: "9.9.9", main: "index.js" }));
    writeFileSync(join(pkg, "index.js"), "module.exports = { chromium: {} };\n");
    const found = m.describePlaywright(target, cache);
    assert.ok(found.playwright !== null && typeof found.playwright === "object");
    assert.equal(found.version, "9.9.9");
    assert.ok(/node_modules\/playwright$/.test(found.path), "the path must be the package directory: " + found.path);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log("PASS: describePlaywright and playwrightUnavailableText hold on cache-shaped directories");
  '
  E2E="${RELAY_P7_E2E:?set RELAY_P7_E2E to the absolute path of the scratch end-to-end script}"
  test -f "$E2E"
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false SCENARIOS=ground-run node "$E2E"
  ```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the stale-role list and the by-name halt in `ground`

- **ACTION**: Delivers AC-A1 (PRD AC-17, script half: `ground` names the code; the precondition half is Task 5). Two edits in `plugins/relay/scripts/qa-run.mjs`.
  1. Directly after the closing brace of `playwrightUnavailableText`/`describePlaywright` block inserted by Task 1 (that is, directly after `describePlaywright`) insert (the function sits outside every pinned section; it must not be placed between `function obtainSession(` and `async function prepareState(`):
     ```js

     /**
      * The kit login scripts under `PRPs/auth/` whose template stamp differs from the installed template's, by role.
      * It reuses `staleKitScript`, so it fails open exactly as the run does: a script without the template sentence, an
      * unreadable script or template and an unstamped installed template are never reported. Reads files only.
      * @param {string} root the target root
      * @returns {{ role: string, detail: string }[]}
      */
     export function staleKitRoles(root) {
       const dir = join(root, 'PRPs', 'auth');
       /** @type {string[]} */ let names = [];
       try {
         names = readdirSync(dir);
       } catch {
         return [];
       }
       /** @type {{ role: string, detail: string }[]} */ const stale = [];
       for (const name of names.sort()) {
         const m = /^login-(.+)\.mjs$/.exec(name);
         if (!m || !ROLE_PATTERN.test(m[1])) continue;
         const detail = staleKitScript(join(dir, name));
         if (detail !== null) stale.push({ role: m[1], detail });
       }
       return stale;
     }
     ```
  2. In `runGround`, directly after the line `const s = obtainSession(ctx, role);` and before the line `if (!s.ok) throw new Halt('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`);`, insert:
     ```js
         if (!s.ok && s.code === 'FAILED_KIT_SCRIPT_STALE') {
           throw new Halt('FAILED_KIT_SCRIPT_STALE', `the kit login script for role ${role} was generated from a different template than the installed one (${s.detail ?? 'identities unknown'}); run /relay-auth-scripts --role ${role} --refresh`);
         }
     ```
  Constraints: the `SESSION_UNAVAILABLE` line stays byte-identical (that sentence is pinned); the run-mode stale sentence in `executeCase` is not touched; `staleKitScript`, `obtainSession` and `ROLE_PATTERN` are not edited; no new import.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3858-3873` (the function reused) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:5299-5302` (the lines the new branch sits between), with the sentence taken from `# SOURCE: plugins/relay/scripts/qa-run.mjs:4672-4675`.
- **VALIDATE**: delivers AC-A1. Fails on the unmodified tree (`staleKitRoles` is not exported, and `ground` reports `SESSION_UNAVAILABLE` for a stale script) and passes after the task. It lists the stale roles of a temp kit, then runs a COPY of the real runner with a stub Playwright in a cache-shaped tree: a stale script ends `ground` with the code by name, a current script keeps the old path.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  assert.equal(typeof m.staleKitRoles, "function", "staleKitRoles is not exported");
  const stamp = /^const KIT_TEMPLATE_ID = \x27([^\x27]+)\x27;$/m.exec(readFileSync("plugins/relay/resources/auth-login.template.mjs", "utf8"))[1];
  const script = (id) => "// Login script for one role of the test-auth kit\nconst KIT_TEMPLATE_ID = \x27" + id + "\x27;\n";
  const tmp = mkdtempSync(join(tmpdir(), "relay-p7-stale-"));
  try {
    assert.deepEqual(m.staleKitRoles(tmp), [], "a root with no kit has no stale role");
    const dir = join(tmp, "PRPs", "auth");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "login-zeta.mjs"), script("auth-login/0"));
    writeFileSync(join(dir, "login-alpha.mjs"), script(stamp));
    writeFileSync(join(dir, "login-beta.mjs"), "// Login script for one role of the test-auth kit\nconsole.log(1);\n");
    writeFileSync(join(dir, "login-hand-written.mjs"), "console.log(\"no marker sentence\");\n");
    writeFileSync(join(dir, "login.config.json"), "{}");
    writeFileSync(join(dir, "login-Bad_Role.mjs"), script("auth-login/0"));
    const got = m.staleKitRoles(tmp);
    assert.deepEqual(got.map((x) => x.role), ["beta", "zeta"], JSON.stringify(got));
    assert.equal(got[1].detail, "auth-login/0 vs " + stamp);
    assert.equal(got[0].detail, "unstamped vs " + stamp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log("PASS: staleKitRoles lists exactly the stale template-generated scripts");
  '
  E2E="${RELAY_P7_E2E:?set RELAY_P7_E2E to the absolute path of the scratch end-to-end script}"
  test -f "$E2E"
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false SCENARIOS=ground-stale node "$E2E"
  ```

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the `preflight` mode, its usage line and its dispatch

- **ACTION**: Delivers AC-A2 (PRD AC-18) and, with Tasks 1 and 2, the halt half of AC-A4 in `preflight`. Five edits in `plugins/relay/scripts/qa-run.mjs`.
  1. Directly after the line that defines `JUDGE_USAGE_LINE` and before `export const USAGE = ...`, insert `/** The one `preflight` usage line, shared by USAGE and PREFLIGHT_USAGE so the two cannot drift. */` and `const PREFLIGHT_USAGE_LINE = '  qa-run.mjs preflight --root <dir>';`. In `USAGE`, insert the line `${PREFLIGHT_USAGE_LINE}` directly after `${JUDGE_USAGE_LINE}` and before `  qa-run.mjs --help`. No other `USAGE` line changes.
  2. In the header comment: add the usage line `node <plugin-root>/scripts/qa-run.mjs preflight --root <dir>` after the `judge` usage line, and one mode paragraph after the `judge` one: `preflight  reads files and asks git, with no network request and no write, and reports whether Playwright resolves and from where, whether the Chromium build is installed, whether every kit login script is current and whether PRPs/auth/.sessions/ is ignored; exit 1 on any failure.` Keep the existing line `node <plugin-root>/scripts/qa-run.mjs ground --root <dir> ...` and the sentence that `ground` is dispatched before `parseArgs` (change its subject to "The `ground`, `judge` and `preflight` modes are dispatched before parseArgs" only if the sentence names `ground` alone; otherwise leave it).
  3. Directly after the closing brace of `runGroundGuarded` and before the `/**` of `parseJudgeArgs`, insert:
     ```js

     /** The probe path of the session directory; `git check-ignore` evaluates the pathname, so it need not exist. */
     export const PREFLIGHT_SESSION_PROBES = Object.freeze(['PRPs/auth/.sessions/probe.json']);

     /**
      * The environment check behind `qa-run.mjs preflight`: one line per check and a final line. It reads files and
      * asks git; it makes no network request, starts no browser and writes nothing.
      * @param {string} root the target root
      * @param {{ pluginRoot?: string, run?: ProcessRunner }} [opts] injectable so a test drives it without the real plugin directory or git
      * @returns {{ ok: boolean, lines: string[], failures: number }}
      */
     export function runPreflight(root, opts = {}) {
       const pluginRoot = opts.pluginRoot ?? PLUGIN_ROOT;
       const run = opts.run ?? spawnSync;
       /** @type {string[]} */ const lines = [];
       let failures = 0;
       /** @param {string} code @param {string} detail */
       const fail = (code, detail) => {
         failures++;
         lines.push(`PREFLIGHT ${code}: ${detail}`);
       };
       const pw = describePlaywright(root, pluginRoot);
       if (pw.playwright === null) {
         fail('FAILED_PLAYWRIGHT_UNAVAILABLE', playwrightUnavailableText(pluginRoot));
         lines.push('PREFLIGHT chromium: skipped (playwright is not resolvable)');
       } else {
         lines.push(`PREFLIGHT playwright: ok ${pw.path ?? 'path unknown'}${pw.version !== null ? ` (version ${pw.version})` : ''}`);
         /** @type {any} */ let exe = null;
         try {
           exe = pw.playwright.chromium.executablePath();
         } catch {
           exe = null;
         }
         if (isStr(exe) && exe !== '' && existsSync(exe)) lines.push('PREFLIGHT chromium: ok');
         else fail('FAILED_BROWSER_UNAVAILABLE', browserUnavailableText(pluginRoot));
       }
       const stale = staleKitRoles(root);
       if (stale.length === 0) lines.push('PREFLIGHT kit: ok (every kit login script is current)');
       for (const s of stale) fail('FAILED_KIT_SCRIPT_STALE', `role ${s.role} (${s.detail}); run /relay-auth-scripts --role ${s.role} --refresh`);
       if (!insideWorkTree(run, root)) {
         lines.push('PREFLIGHT sessions: ok (not inside a git work tree; nothing there can be committed)');
       } else {
         const unproven = PREFLIGHT_SESSION_PROBES.filter((probe) => {
           const r = gitCall(run, root, ['check-ignore', '-q', '--', probe]);
           return Boolean(r.error) || r.status !== 0;
         });
         if (unproven.length === 0) lines.push('PREFLIGHT sessions: ok (PRPs/auth/.sessions/ is ignored)');
         else fail('FAILED_IGNORE_UNPROVEN', 'PRPs/auth/.sessions/ is not proven ignored by git; add PRPs/auth/.sessions/ to the project .gitignore');
       }
       lines.push(failures === 0 ? 'PREFLIGHT: ok' : `PREFLIGHT: FAILED (${failures} check(s))`);
       return { ok: failures === 0, lines, failures };
     }

     const PREFLIGHT_USAGE = `Usage:
     ${PREFLIGHT_USAGE_LINE}
       Reads files and asks git; it makes no network request and writes nothing. Exit 1 when any check fails.
     `;

     /**
      * @param {string[]} argv
      * @returns {Promise<number>}
      */
     async function runPreflightGuarded(argv) {
       if (argv.length !== 2 || argv[0] !== '--root' || argv[1].startsWith('--')) {
         process.stderr.write(PREFLIGHT_USAGE);
         return 2;
       }
       const root = resolve(argv[1]);
       if (!existsSync(root) || !statSync(root).isDirectory()) {
         process.stderr.write(`--root must be an existing directory\n${PREFLIGHT_USAGE}`);
         return 2;
       }
       try {
         const result = runPreflight(root);
         process.stdout.write(`${result.lines.join('\n')}\n`);
         return result.ok ? 0 : 1;
       } catch {
         process.stderr.write('FAILED_RUNNER_ERROR: the runner stopped on an unexpected error\n');
         return 1;
       }
     }
     ```
     (In the file, the template literal `PREFLIGHT_USAGE` has no indentation; the indentation above is this plan's quoting. The two-space indent of its second line is part of the string.)
  4. In `main`, directly after the line `if (argv[0] === 'judge') return await runJudgeGuarded(argv.slice(1));` insert `if (argv[0] === 'preflight') return await runPreflightGuarded(argv.slice(1));`. `parseArgs` is NOT edited.
  5. Nothing else: `runPreflight` must not contain a network call (`fetch`, `fetchAnonymously(`, `checkTarget(`, `newContext(`, `launch(`), a write, a second `spawnSync(` or a `// GUARD-SITE` marker.
  Constraints: `writeFileSync(`, `renameSync(`, `spawnSync(process.execPath`, `// GUARD-SITE` and `// WRITE-SITE` keep their single occurrences; the functions sit after `runGroundGuarded` and before `parseJudgeArgs`, outside the sections `async function runGround(` to `async function runGroundGuarded(`, `async function runRun(` to `function runParse(` and `function obtainSession(` to `async function prepareState(`; `runGroundGuarded` appears exactly once; no quoted outcome literal outside the four values; the header keeps the text `qa-run.mjs ground --root`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:150-160` (the shared usage-line constant and `USAGE`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:5587-5593` (the dispatch before `parseArgs`) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:917-931` (the git helpers reused).
- **VALIDATE**: delivers AC-A2. Fails on the unmodified tree (`preflight` is refused as an unknown mode with exit 2 and `runPreflight` is not exported) and passes after Tasks 1 to 3. It runs a COPY of the real runner in cache-shaped trees: no Playwright, Playwright with the Chromium file missing, a fully provisioned cache, a stale kit script, and a git work tree with and without the ignore rule.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  E2E="${RELAY_P7_E2E:?set RELAY_P7_E2E to the absolute path of the scratch end-to-end script}"
  test -f "$E2E"
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false SCENARIOS=preflight node "$E2E"
  ```

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs — the record staleness list and its warning

- **ACTION**: Delivers AC-A3 (PRD AC-19). Three edits in `plugins/relay/scripts/qa-run.mjs`; `resolveFromRecord` is not edited.
  1. Directly after the closing brace of `resolveFromRecord` and before the divider comment that precedes "Case classification", insert (the comments must not contain the text `import(`; the module-level patterns are plain regular expressions):
     ```js

     /** Extensions tried, in order, when a relative specifier names no file as written. */
     const SOURCE_EXTENSIONS = ['', '.mjs', '.js', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '.cts'];

     /** The relative specifiers a test file imports statically: `from` forms, a bare side-effect form and a literal `require`. */
     const STATIC_IMPORT_PATTERNS = [
       /(?:^|[^\w$.])(?:import|export)\s[^'";]*?\sfrom\s*['"](\.{1,2}\/[^'"\r\n]+)['"]/g,
       /(?:^|[^\w$.])import\s*['"](\.{1,2}\/[^'"\r\n]+)['"]/g,
       /(?:^|[^\w$.])require\(\s*['"](\.{1,2}\/[^'"\r\n]+)['"]\s*\)/g,
     ];

     /**
      * The repository-relative path of the file a relative specifier names, or null when none exists or it leaves the root.
      * @param {string} fromFile absolute path of the importing file
      * @param {string} spec
      * @param {string} rootAbs
      * @returns {string | null}
      */
     function resolveRelativeImport(fromFile, spec, rootAbs) {
       const base = resolve(dirname(fromFile), spec);
       const stem = base.replace(/\.[mc]?js$/, '');
       const candidates = SOURCE_EXTENSIONS.map((ext) => base + ext);
       if (stem !== base) for (const ext of ['.ts', '.tsx', '.mts', '.cts']) candidates.push(stem + ext);
       for (const ext of SOURCE_EXTENSIONS.slice(1)) candidates.push(join(base, `index${ext}`));
       for (const candidate of candidates) {
         try {
           if (!statSync(candidate).isFile()) continue;
         } catch {
           continue;
         }
         const rel = relative(rootAbs, candidate);
         return rel === '' || rel.startsWith('..') || isAbsolute(rel) ? null : fwd(rel);
       }
       return null;
     }

     /**
      * Whether git reports a file changed after an instant: its last commit is later, or it has uncommitted changes and
      * its modification time is later. A git failure is never "changed".
      * @param {ProcessRunner} run
      * @param {string} root
      * @param {string} rel
      * @param {number} generatedMs
      * @returns {boolean}
      */
     function changedAfter(run, root, rel, generatedMs) {
       const log = gitCall(run, root, ['log', '-1', '--format=%ct', '--', rel]);
       const committedMs = !log.error && log.status === 0 ? Number(String(log.stdout).trim()) * 1000 : Number.NaN;
       if (Number.isFinite(committedMs) && committedMs > generatedMs) return true;
       const status = gitCall(run, root, ['status', '--porcelain', '--', rel]);
       if (status.error || status.status !== 0 || String(status.stdout).trim() === '') return false;
       try {
         return statSync(join(root, rel)).mtimeMs > generatedMs;
       } catch {
         return false;
       }
     }

     /**
      * The source files that cited test files import statically (one level) and that git reports changed after the
      * record's `generated_at`. Pure of the outcome: it only reads. Total: anything it cannot read or ask is an empty list,
      * and outside a git work tree it is always empty.
      * @param {string} root the target root
      * @param {string[]} citedPaths repository-relative paths of the cited test files
      * @param {string} generatedAt the record's `generated_at`
      * @param {ProcessRunner} [run] injectable so a test drives it without git
      * @returns {string[]} sorted repository-relative paths
      */
     export function recordStaleSources(root, citedPaths, generatedAt, run = spawnSync) {
       try {
         const generated = isStr(generatedAt) ? Date.parse(generatedAt) : Number.NaN;
         if (!isStr(root) || !Array.isArray(citedPaths) || Number.isNaN(generated)) return [];
         if (!insideWorkTree(run, root)) return [];
         const rootAbs = resolve(root);
         /** @type {Set<string>} */ const sources = new Set();
         for (const cited of citedPaths) {
           if (!isStr(cited)) continue;
           const abs = resolve(rootAbs, cited);
           const own = relative(rootAbs, abs);
           if (own === '' || own.startsWith('..') || isAbsolute(own)) continue;
           /** @type {string} */ let text;
           try {
             const st = statSync(abs);
             if (!st.isFile() || st.size > 524288) continue;
             text = readFileSync(abs, 'utf8');
           } catch {
             continue;
           }
           for (const pattern of STATIC_IMPORT_PATTERNS) {
             for (const hit of text.matchAll(pattern)) {
               const rel = resolveRelativeImport(abs, hit[1], rootAbs);
               if (rel !== null && rel !== fwd(own)) sources.add(rel);
             }
           }
         }
         return [...sources].filter((rel) => changedAfter(run, rootAbs, rel, generated)).sort();
       } catch {
         return [];
       }
     }
     ```
  2. In `executeCase`, in the record-resolved branch, inside the existing `try`, replace the two lines `const evidence = writeEvidence(evCtx, `case-${kase.index}.record.json`, { kind: 'json', value: resolved.value });` and `return { result: { outcome: resolved.outcome, reason_code: 'AUTOMATED_EVIDENCE', reason: resolved.reason, evidence: [evidence] }, driver: null, role: null };` with:
     ```js
         const stale = recordStaleSources(root, resolved.value.files.map((/** @type {{ cited: string }} */ f) => f.cited), resolved.value.record_generated_at);
         const value = stale.length > 0 ? { ...resolved.value, stale_sources: stale } : resolved.value;
         const evidence = writeEvidence(evCtx, `case-${kase.index}.record.json`, { kind: 'json', value });
         return { result: { outcome: resolved.outcome, reason_code: 'AUTOMATED_EVIDENCE', reason: resolved.reason, evidence: [evidence], ...(stale.length > 0 ? { record_stale: stale } : {}) }, driver: null, role: null };
     ```
     Add `record_stale?: string[]` to the JSDoc typedef of `CaseResult` (find it with a search for `@typedef` and `CaseResult`; the new field is optional and is read only by `runRun`).
  3. In `runRun`, directly after the line `if (!OUTCOMES.includes(result.outcome) && !isPendingResult(result)) result = blocked('RUNNER_ERROR', 'an internal path produced a value outside the closed vocabulary');` and before the line `const finishedAt = now();`, insert:
     ```js
           if (Array.isArray(result.record_stale) && result.record_stale.length > 0) {
             warnings.push({
               code: 'RECORD_STALE',
               message: `case ${c.index}: ${result.record_stale.length} source file(s) imported by the cited tests changed in git after the record was generated; the outcome is unchanged, re-run the cited tests before trusting it (the files are listed in the case evidence)`,
               case: c.index,
               files: result.record_stale,
             });
           }
     ```
  Constraints: the entry assembly (`entries.push({ ... })`) and the line `const keepSteps = ...` stay byte-identical, so `record_stale` never reaches a `results.json` case entry; keep `failed: /<(failure|error)\b/.test(body),`, `best = Math.max(best, Number(ent.name));` and `if (isObj(record)) {` each exactly once; do not add a key to a `files` entry; `git` is reached only through `gitCall`; no `spawnSync(` call is added.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:4537-4547` (the branch edited) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:917-931` (the git helpers reused).
- **VALIDATE**: delivers AC-A3. Fails on the unmodified tree (`recordStaleSources` is not exported) and passes after the task. It builds a real temp git repository whose commit date is fixed in 2001, with a test file that imports a source in the three static forms and a dynamic form, and checks the committed path, the uncommitted path, the future record, a non-git directory, the paths that leave the root and hostile arguments; then it asserts statically that the warning and the evidence key are wired exactly once.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { spawnSync } from "node:child_process";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  assert.equal(typeof m.recordStaleSources, "function", "recordStaleSources is not exported");
  const tmp = mkdtempSync(join(tmpdir(), "relay-p7-record-"));
  const git = (cwd, args, extra = {}) => {
    const r = spawnSync("git", ["-C", cwd, "-c", "user.name=t", "-c", "user.email=t@example.test", ...args], { encoding: "utf8", env: { ...process.env, ...extra } });
    assert.equal(r.status, 0, "git " + args.join(" ") + ": " + r.stderr);
    return r;
  };
  try {
    const repo = join(tmp, "repo");
    mkdirSync(join(repo, "src"), { recursive: true });
    mkdirSync(join(repo, "test"), { recursive: true });
    git(tmp, ["init", "-q", repo]);
    writeFileSync(join(repo, "src", "a.mjs"), "export const a = 1;\n");
    writeFileSync(join(repo, "src", "b.cjs"), "module.exports = 2;\n");
    writeFileSync(join(repo, "src", "c.mjs"), "export const c = 3;\n");
    writeFileSync(join(repo, "src", "d.mjs"), "export const d = 4;\n");
    writeFileSync(join(repo, "test", "a.test.mjs"), "import { a } from \"../src/a.mjs\";\nimport \"../src/c.mjs\";\nimport fs from \"node:fs\";\nimport x from \"./missing.mjs\";\nconst later = () => import(\"../src/d.mjs\");\n");
    writeFileSync(join(repo, "test", "b.test.cjs"), "const b = require(\"../src/b.cjs\");\n");
    git(repo, ["add", "-A"]);
    const old = "2001-01-01T00:00:00Z";
    git(repo, ["commit", "-q", "-m", "init"], { GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old });
    const tests = ["test/a.test.mjs", "test/b.test.cjs"];
    assert.deepEqual(m.recordStaleSources(repo, tests, "2000-01-01T00:00:00.000Z"), ["src/a.mjs", "src/b.cjs", "src/c.mjs"], "committed after the record: the static forms, not the dynamic one");
    assert.deepEqual(m.recordStaleSources(repo, tests, "2010-01-01T00:00:00.000Z"), [], "a record generated after the last commit is not stale");
    appendFileSync(join(repo, "src", "a.mjs"), "export const a2 = 2;\n");
    assert.deepEqual(m.recordStaleSources(repo, tests, "2010-01-01T00:00:00.000Z"), ["src/a.mjs"], "an uncommitted change newer than the record is stale");
    assert.deepEqual(m.recordStaleSources(repo, tests, "2999-01-01T00:00:00.000Z"), [], "a record from the future is never stale");
    assert.deepEqual(m.recordStaleSources(repo, ["../outside.test.mjs", "/etc/passwd", 5, null, "test/none.test.mjs"], "2000-01-01T00:00:00.000Z"), []);
    assert.deepEqual(m.recordStaleSources(repo, tests, "not a date"), []);
    assert.deepEqual(m.recordStaleSources(repo, "x", "2000-01-01T00:00:00.000Z"), []);
    assert.deepEqual(m.recordStaleSources(repo, tests, "2000-01-01T00:00:00.000Z", () => ({ error: new Error("no git") })), [], "git failing is never stale");
    const plain = join(tmp, "plain");
    mkdirSync(join(plain, "src"), { recursive: true });
    mkdirSync(join(plain, "test"), { recursive: true });
    writeFileSync(join(plain, "src", "a.mjs"), "export const a = 1;\n");
    writeFileSync(join(plain, "test", "a.test.mjs"), "import { a } from \"../src/a.mjs\";\n");
    assert.deepEqual(m.recordStaleSources(plain, ["test/a.test.mjs"], "2000-01-01T00:00:00.000Z"), [], "outside a git work tree the flag stays silent");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  const source = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  assert.equal(source.split("code: \x27RECORD_STALE\x27").length - 1, 1, "the warning must be pushed in exactly one place");
  assert.equal(source.split("stale_sources: stale").length - 1, 1, "the evidence key must be added in exactly one place");
  assert.equal(source.split("record_stale: stale").length - 1, 1, "the result field must be set in exactly one place");
  console.log("PASS: recordStaleSources lists the changed static imports and is silent otherwise");
  '
  ```

### Task 5: UPDATE plugins/relay/commands/relay-qa-run.md and plugins/relay/commands/relay-auth-scripts.md — the preflight precondition, the record flag and the stale remedy

- **ACTION**: Delivers AC-A1 (PRD AC-17, precondition half), AC-A2 (the command that runs the preflight) and AC-A3 (the record flag documented), with the usage-text half of PRD AC-22. Read lines 85 to 146, 985 to 1014 and 1087 to 1118 of `relay-qa-run.md` first. Four `Edit` calls; do not touch line 29 (the runner-mode list), the ground-halt sentence at lines 204-206, the reason-code table, the "Result fields" paragraph or any marked example, and add no `<!-- qa-step-example` or `<!-- qa-plan-entry-example` comment. Avoid the banned strings `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`, `--local-host`, the text `the runner script (` and the word `impossible` in the new text.
  1. `relay-qa-run.md`: directly before the line `### P3 — Local-only guard and run directory` insert exactly (plain markdown; the fence is the file's own):
     ```
     ### P2b — Environment preflight

     Run, from a fenced bash block, exactly this line:

     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" preflight --root "<target_root>"
     ```

     The mode reads files and asks git. It makes no network request, starts no browser and
     writes nothing, so it comes before `init`. It prints one `PREFLIGHT` line per check and
     exits 1 when any check fails: Playwright must resolve (from the target or from the
     plugin's `scripts/visual` directory), the Chromium build that version needs must be
     installed, every kit login script must carry the installed template's stamp, and
     `PRPs/auth/.sessions/` must be ignored by git. On a non-zero exit, HALT and relay the
     `PREFLIGHT` failure lines verbatim; nothing has been written. A
     `FAILED_PLAYWRIGHT_UNAVAILABLE` or `FAILED_BROWSER_UNAVAILABLE` line names the resolved
     directory and the one command that provisions it, which has the form
     `npm --prefix "${CLAUDE_PLUGIN_ROOT}/scripts/visual" install`. The operator runs that
     command once per plugin version: it downloads packages and a browser, so you relay it and
     never run it yourself. A `FAILED_KIT_SCRIPT_STALE` line names each stale role and its
     `/relay-auth-scripts --role <role> --refresh` line; a stale kit script is caught here,
     before `init`, instead of mid-run. A `FAILED_IGNORE_UNPROVEN` line means session files
     could be committed: the operator adds `PRPs/auth/.sessions/` to the project's
     `.gitignore`.

     ```
  2. `relay-qa-run.md`: directly after the bullet that starts `- When the field cites only a file, resolution stays per file and the evidence records` (the last bullet of the record-resolution list, before the `---` line) insert as a new bullet:
     ```
     - A resolved case whose cited test files statically import (a `from` form, a bare `import` or a literal `require` of a relative path) a source file that git reports changed after the record's `generated_at` keeps its outcome, but its evidence file lists those files under `stale_sources` and `results.json` carries a `RECORD_STALE` warning for the case, printed in the summary as `WARNING RECORD_STALE`. Re-run the cited tests before trusting such a pass. Outside a git work tree the flag stays silent.
     ```
  3. `relay-qa-run.md`: in "Final output surface", change the text `Every other session failure keeps `SESSION_UNAVAILABLE`.` to `In `ground`, a stale kit login script is reported by that same code, `FAILED_KIT_SCRIPT_STALE`, with the `/relay-auth-scripts --role <role> --refresh` line, and the preflight of P2b catches it before `init`; a run whose Playwright is not resolvable ends with exit 1 and prints the one provisioning command on standard error. Every other session failure keeps `SESSION_UNAVAILABLE`.` (the physical line holds more text before and after; keep the anchor to the shortest unique text that contains the original sentence, and keep `SESSION_UNAVAILABLE` in the file).
  4. `relay-auth-scripts.md`: directly after the paragraph that ends `list is not selected, and its script is left as it is.` add a blank line and: `The runner's preflight mode lists every script of the kit whose stamp line differs from the installed template's, with the role and the identities, so the roles to pass to `--role` are known before a run starts.` Do not write the string `/relay-qa-run` anywhere in this file, and do not reword the pinned `--refresh` sentences.
  Constraints: the command doc keeps its `---` separators, its heading order and every pinned paragraph; the new heading is `### P2b`, not a renumbering of P3; the text "Nothing is written before P3 passes." is unchanged and stays true.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:106-111 (the P2 precondition)`.
- **VALIDATE**: delivers AC-A1, AC-A2 and AC-A3 (documentation half). Gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line of its file), check the banned strings and the unchanged mode-list line, validate every marked example of the real document, then run the tests that read these documents. The greps fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- '### P2b — Environment preflight' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" preflight --root "<target_root>"' plugins/relay/commands/relay-qa-run.md
  grep -qF -- '`npm --prefix "${CLAUDE_PLUGIN_ROOT}/scripts/visual" install`' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'keeps its outcome, but its evidence file lists those files under `stale_sources`' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'Every other session failure keeps `SESSION_UNAVAILABLE`.' plugins/relay/commands/relay-qa-run.md
  grep -qF -- 'The runner'"'"'s preflight mode lists every script of the kit whose stamp line differs' plugins/relay/commands/relay-auth-scripts.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const found = [...doc.matchAll(/<!-- qa-step-example driver=(\w+) -->\n```json\n([^\n]*)\n```/g)].map((x) => ({ driver: x[1], step: JSON.parse(x[2]) }));
  assert.ok(found.length > 0);
  for (const e of found) assert.equal(m.validateStep(e.driver, e.step), null, "a marked example does not validate: " + JSON.stringify(e.step));
  assert.equal(doc.split("the runner script (`parse`, `init`, `run`, `ground`").length - 1, 1, "the mode-list line changed");
  assert.equal(doc.split("the runner script (").length - 1, 1, "the new text must not repeat the mode-list opener");
  for (const banned of ["design-spec", "relay-auth-setup", ".claude/PRPs", "subagent_type", "--local-host"]) assert.ok(!doc.includes(banned), "banned string " + banned);
  const p2b = doc.slice(doc.indexOf("### P2b"), doc.indexOf("### P3 "));
  assert.ok(doc.indexOf("### P2 ") < doc.indexOf("### P2b") && p2b.length > 0, "P2b must sit between P2 and P3");
  assert.ok(!/impossible/i.test(p2b), "the new block must not use the word impossible");
  assert.ok(!p2b.includes("plugins/relay/scripts/visual"), "the new block must not name a repository path");
  assert.ok(doc.includes("Nothing is written before P3 passes."));
  assert.ok(doc.includes("SESSION_UNAVAILABLE"));
  const auth = readFileSync("plugins/relay/commands/relay-auth-scripts.md", "utf8");
  assert.ok(!auth.includes("/relay-qa-run"), "relay-auth-scripts.md must not name /relay-qa-run");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs scripts/validate/checks/qa-run-per-test-resolution.test.mjs scripts/validate/checks/qa-run-minted-session.test.mjs scripts/validate/checks/auth-scripts-command.test.mjs scripts/validate/checks/auth-kit-commands-hardening.test.mjs scripts/validate/checks/plugin-root-resolvable.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
  ```

### Task 6: UPDATE docs/api-reference.md, docs/domain/glossary.md, docs/domain/flows.md and docs/context/integrations.md — the knowledge base

- **ACTION**: Delivers AC-A5 (PRD AC-22, the knowledge-base half). Read the full physical lines 129 and 219 of `docs/api-reference.md` first (each row is one very long line and stays one line) and lines 85 to 114 of `docs/context/integrations.md`. In the new text do not use the word `impossible` and do not backtick the six new export names in the `/relay-qa-run` row. Five `Edit` calls:
  1. `docs/api-reference.md`, the `/relay-qa-run` row: `old_string` = `Calls `auth-local-guard.mjs` and the kit login scripts rather than reimplementing them.` (read the row; keep the anchor to the shortest unique text that contains it) and `new_string` = ``Before `init` it runs `qa-run.mjs preflight`, which checks with no network request that Playwright resolves from the target or from the installed plugin directory, that the Chromium build it needs is installed, that every kit login script carries the installed template's stamp and that `PRPs/auth/.sessions/` is ignored, and exits non-zero on any failure; an unresolvable Playwright is `FAILED_PLAYWRIGHT_UNAVAILABLE` in `run`, `ground` and `preflight`, naming the resolved plugin directory and the one command that provisions it, and `ground` reports a stale kit script as `FAILED_KIT_SCRIPT_STALE` instead of `SESSION_UNAVAILABLE`. A record-resolved case whose cited test files import a source changed in git after the record's `generated_at` keeps its outcome and adds a `RECORD_STALE` warning to `results.json`. Calls `auth-local-guard.mjs` and the kit login scripts rather than reimplementing them.``
  2. `docs/api-reference.md`, the `qa-run.mjs` row: (a) `old_string` = ``lists the modes `parse`, `init`, `run`, `ground` and `judge` and the flags of `ground` and `judge`.`` and `new_string` = ``lists the modes `parse`, `init`, `run`, `ground`, `judge` and `preflight` and the flags of `ground` and `judge`.`` (the span between `REASON_CATALOGUE` and `USAGE` stays free of any new identifier-shaped token); (b) `old_string` = ``a run that holds no `read_message` step is unchanged. Every number is chosen, not measured`` and `new_string` = ``a run that holds no `read_message` step is unchanged. The environment check is built from `describePlaywright`, `playwrightUnavailableText`, `staleKitRoles`, `recordStaleSources` and `runPreflight`, with the constant `PREFLIGHT_SESSION_PROBES`; the first two name the plugin's `scripts/visual` directory in every mode, and `runPreflight` makes no network request and writes nothing. Every number is chosen, not measured`` (the new names sit after the `USAGE` token, outside the checked span, and all are real exports).
  3. `docs/domain/glossary.md`: insert directly before the line `## QA grounding snapshot` (leave one blank line before the heading) a paragraph, written with the line breaks below:
     ```
     The preflight of `/relay-qa-run` is a read-only mode of `qa-run.mjs` that checks the
     environment before a run starts, with no network request: that Playwright resolves from
     the target or from the installed plugin directory, that the Chromium build it needs is
     installed, that every kit login script carries the installed template's stamp and that
     `PRPs/auth/.sessions/` is ignored by git. It exits non-zero on any failure and names the
     one command that provisions a missing dependency, which the operator runs once per
     plugin version; the runner never downloads anything itself. The same unresolvable
     Playwright halts `run` and `ground`, and a stale kit script halts `ground` by name. See
     `plugins/relay/commands/relay-qa-run.md`.
     ```
  4. `docs/domain/flows.md`, in numbered item 4 (keep the 3-space indent on every line): `old_string` = the two lines `   class and objective-step count are still read.` / `   The run's evidence is kept readable and out of git. Session values are` and `new_string` = the first line, then this passage, then the second line:
     ```
        Before `init`, the `preflight` mode checks the environment without a network request:
        Playwright resolving from the target or the installed plugin directory, the Chromium
        build it needs, the stamp of every kit login script and the ignore rule of
        `PRPs/auth/.sessions/`; a failure names its fix and stops the command. A
        record-resolved case whose cited test files import a source changed in git after the
        record was generated keeps its outcome and adds a `RECORD_STALE` warning to the results.
     ```
  5. `docs/context/integrations.md`, in the Playwright / Chromium section (read it first): after the `Used by` bullet and before the `Known endpoint/tool` bullet add the bullet: `- **Also used by:** `qa-run.mjs` (the `run`, `ground` and `preflight` modes) resolves the same package from the target or from the installed plugin's `scripts/visual` directory. A plugin installed from a directory marketplace gets no automatic dependency install, so the first use after each plugin version halts `FAILED_PLAYWRIGHT_UNAVAILABLE` and names the one command the operator runs: `npm --prefix "${CLAUDE_PLUGIN_ROOT}/scripts/visual" install`. The runner never downloads anything itself.` (match the file's bullet indentation and wrapping style).
- **MIRROR**: `# SOURCE: docs/domain/flows.md:172-175` is the register and the insertion point of item 4; the glossary paragraph follows the register of the read_message paragraph before `## QA grounding snapshot`; the API rows are one physical line each and stay one.
- **VALIDATE**: delivers AC-A5. Gate on the authored literal in each file (copied byte-for-byte from the ACTION; each sits inside one physical line), assert every name added to the API reference is a real export and that nothing was added to the checked span that is not, then run the tests that read these documents. The greps and the export check fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- 'Before `init` it runs `qa-run.mjs preflight`, which checks with no network request that Playwright resolves' docs/api-reference.md
  grep -qF -- 'The environment check is built from `describePlaywright`, `playwrightUnavailableText`, `staleKitRoles`, `recordStaleSources` and `runPreflight`' docs/api-reference.md
  grep -qF -- 'The preflight of `/relay-qa-run` is a read-only mode of `qa-run.mjs` that checks the' docs/domain/glossary.md
  grep -qF -- 'Before `init`, the `preflight` mode checks the environment without a network request:' docs/domain/flows.md
  grep -qF -- '**Also used by:** `qa-run.mjs`' docs/context/integrations.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const names = ["describePlaywright", "playwrightUnavailableText", "staleKitRoles", "recordStaleSources", "runPreflight", "PREFLIGHT_SESSION_PROBES"];
  for (const name of names) assert.ok(Object.hasOwn(m, name), name + " is named in the API reference but is not an export");
  const lines = readFileSync("docs/api-reference.md", "utf8").split("\n");
  const row = lines.filter((l) => l.startsWith("| `qa-run.mjs` "));
  assert.equal(row.length, 1, "exactly one qa-run.mjs row");
  for (const name of names) assert.ok(row[0].includes("`" + name + "`"), name + " is missing from the qa-run.mjs row");
  const from = row[0].indexOf("`REASON_CATALOGUE`");
  const usageAt = row[0].indexOf("`USAGE`", from);
  const span = row[0].slice(from, usageAt + 7);
  for (const tok of span.match(/`[^`]+`/g).map((t) => t.slice(1, -1)).filter((t) => /^(?:[A-Z][A-Z0-9_]+|[a-z]+(?:[A-Z][A-Za-z0-9]*)+)$/.test(t))) assert.ok(Object.hasOwn(m, tok), "a token between REASON_CATALOGUE and USAGE is not an export: " + tok);
  for (const name of names) assert.ok(row[0].indexOf("`" + name + "`") > usageAt, name + " must sit after USAGE");
  const qaRun = lines.find((l) => l.startsWith("| `/relay-qa-run "));
  for (const name of names) assert.ok(!qaRun.includes("`" + name + "`"), "the /relay-qa-run row must not backtick " + name);
  for (const k of ["EXTERNAL_CHANNEL", "HUMAN_SIGNOFF", "OUTSIDE_LOCAL_ENVIRONMENT"]) assert.ok(qaRun.includes("`" + k + "`"), "the /relay-qa-run row lost " + k);
  const added = readFileSync("docs/domain/glossary.md", "utf8");
  const g = added.slice(added.indexOf("The preflight of `/relay-qa-run`"), added.indexOf("## QA grounding snapshot"));
  assert.ok(g.length > 0 && !/impossible/i.test(g), "the glossary paragraph must exist and not use the word impossible");
  const flows = readFileSync("docs/domain/flows.md", "utf8");
  const f = flows.slice(flows.indexOf("Before `init`, the `preflight` mode"), flows.indexOf("The run\x27s evidence is kept readable"));
  assert.ok(f.length > 0 && !/impossible/i.test(f), "the flows passage must exist and not use the word impossible");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

### Task 7: UPDATE documentation/reference/commands.html, documentation/reference/scripts.html and documentation/changelog.html — the site pages and the changelog

- **ACTION**: Delivers AC-A5 (the site pages and the changelog entry that `documentation/AGENTS.md` requires). Read `documentation/AGENTS.md` sections 7.3 and "modify an existing page" first (no emojis, no inline style, American English, keep structure and ids). Four narrow `Edit` calls, no page added, no heading added inside an entry (a new `<h3>` or `<h2>` would end the region the release tests read), no sentence containing `e.g.` or `i.e.`, none of the phrases `closed catalogue` or `derived by the runner`, the word `impossible` or a catalogue code in the new text, and no new number (the release tests split sentences at `. `).
  1. `documentation/reference/commands.html`, the `/relay-qa-run` entry: directly after the Re-mint `<dd>` line (the line that ends `every extra run mints again and rotates the account&rsquo;s session.</dd>`, line 359) and before the entry's closing `</div>` (line 360), add two lines with the 8-space indentation of the neighbouring rows: `<dt>Environment preflight</dt>` and a single-line `<dd>` holding: `Before <code>init</code> the command runs <code>qa-run.mjs preflight</code>, which reads files and asks git, makes no network request and writes nothing, and checks that Playwright resolves from the target or from the installed plugin directory, that the Chromium build it needs is installed, that every kit login script carries the installed template&rsquo;s stamp and that <code>PRPs/auth/.sessions/</code> is ignored. It exits non-zero on any failure. <code>FAILED_PLAYWRIGHT_UNAVAILABLE</code> and <code>FAILED_BROWSER_UNAVAILABLE</code> name the resolved plugin directory and the one command that provisions the dependency, which the operator runs once per plugin version because the runner never downloads anything itself. <code>FAILED_KIT_SCRIPT_STALE</code> names each stale role and its <code>/relay-auth-scripts --role &lt;role&gt; --refresh</code> line, and <code>ground</code> reports the same code by name. A record-resolved case whose cited tests import a source changed in git after the record was generated keeps its outcome and adds a <code>RECORD_STALE</code> warning to the results.`
  2. `documentation/reference/scripts.html`, the `qa-run.mjs` entry: directly after the Re-mint `<dd>` line (line 223) and before the next row (read lines 223 to 231 first; keep the new row inside the entry, before the `Chosen numbers` row if that row follows), add `<dt>Environment preflight</dt>` and a single-line `<dd>` holding: `The <code>preflight</code> mode takes the package and its resolved path from <code>describePlaywright</code>, asks the installed package where the Chromium build should be and checks that the file exists, reads every kit login script with the same stale pre-flight that <code>run</code> uses, and probes the ignore rule of <code>PRPs/auth/.sessions/</code> with <code>git check-ignore</code>; it starts no browser, makes no network request and writes nothing. <code>playwrightUnavailableText</code> builds the halt text of every mode from the plugin directory, and <code>recordStaleSources</code> reads the relative static imports of a record-resolved case&rsquo;s cited test files and asks git whether each changed after the record&rsquo;s <code>generated_at</code>.`
  3. `documentation/reference/scripts.html`, the usage block: `old_string` = `[--root &lt;dir&gt;]</code></pre>` (the end of the `judge` line; read lines 232 to 236 and keep the anchor to the shortest unique text) and `new_string` = `[--root &lt;dir&gt;]` followed by a newline and `node ${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs preflight --root &lt;dir&gt;</code></pre>`. The four existing mode lines stay byte-identical (the release test compares them with `USAGE`).
  4. `documentation/changelog.html`, `Added` list of `Unreleased`: `old_string` = `with no declared source is still declined as before.</li>` followed by a newline and the closing `</ul>` line with the exact leading whitespace of the file (read lines 60 to 80 first) and `new_string` = the first line, then
     ```
             <li><strong>Self-checking environment</strong> &mdash; <code>qa-run.mjs preflight</code> checks, before a run
               starts and with no network request, that Playwright resolves from the target or the installed plugin
               directory, that the Chromium build it needs is installed, that every kit login script is current and that
               the session directory is ignored by git, and exits non-zero on any failure. An unresolvable Playwright now
               halts <code>run</code> and <code>ground</code> with the resolved plugin directory and the one command that
               provisions it, a stale kit script halts <code>ground</code> by name, and a record-resolved case whose cited
               tests import a source changed after the record was generated adds a <code>RECORD_STALE</code> warning.</li>
     ```
     then the closing `</ul>` line as it was (8 spaces before `<li>`, 10 before the continuation lines).
  Constraints: each new row label is unique within its entry (`Environment preflight`); add no `id` attribute (every id inside the block must start with `unreleased`), no `<h2`, and no `<li>` whose visible text equals an entry of the 0.46.0 release; the phrases the release tests pin stay in their existing rows; do not touch NAV, the search index, the page subtitle, any heading id, the released sections, the `Classification`, `Re-mint`, `Grounding` and `Step vocabulary` rows or `plugins/relay/.claude-plugin/plugin.json`.
- **MIRROR**: `# SOURCE: documentation/changelog.html:71-77` (the shape of an `Added` entry and of the closing list tag); the two new `<dd>` rows keep one physical line each, like the neighbouring rows of their entries.
- **VALIDATE**: delivers AC-A5. Gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside one physical line), check that no edited row or entry names a forbidden word, that the row labels are unique and that every export named on the scripts page is real, then the site tests. The greps fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF -- '<dt>Environment preflight</dt>' documentation/reference/commands.html
  grep -qF -- '<dt>Environment preflight</dt>' documentation/reference/scripts.html
  grep -qF -- 'qa-run.mjs preflight --root &lt;dir&gt;</code></pre>' documentation/reference/scripts.html
  grep -qF -- '<strong>Self-checking environment</strong>' documentation/changelog.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  const count = (text, needle) => text.split(needle).length - 1;
  const cmdText = readFileSync("documentation/reference/commands.html", "utf8");
  const scrText = readFileSync("documentation/reference/scripts.html", "utf8");
  assert.equal(count(cmdText, "<dt>Environment preflight</dt>"), 1, "one preflight row on the commands page");
  assert.equal(count(scrText, "<dt>Environment preflight</dt>"), 1, "one preflight row on the scripts page");
  const cmd = cmdText.split("\n");
  const scr = scrText.split("\n");
  const cmdAt = cmd.findIndex((l) => l.includes("<dt>Environment preflight</dt>"));
  const scrAt = scr.findIndex((l) => l.includes("<dt>Environment preflight</dt>"));
  assert.ok(cmd[cmdAt + 1].trimStart().startsWith("<dd>") && cmd[cmdAt + 1].trimEnd().endsWith("</dd>"), "the commands row must be one physical dd line");
  assert.ok(scr[scrAt + 1].trimStart().startsWith("<dd>") && scr[scrAt + 1].trimEnd().endsWith("</dd>"), "the scripts row must be one physical dd line");
  for (const name of ["describePlaywright", "playwrightUnavailableText", "recordStaleSources"]) assert.ok(Object.hasOwn(m, name) && scr[scrAt + 1].includes("<code>" + name + "</code>"), name);
  const log = readFileSync("documentation/changelog.html", "utf8");
  const at = log.indexOf("<strong>Self-checking environment</strong>");
  assert.ok(at > 0, "the changelog entry is missing");
  const entry = log.slice(at, log.indexOf("</li>", at));
  for (const word of ["impossible", "closed catalogue", "derived by the runner", "EXTERNAL_CHANNEL", "e.g.", "i.e."]) assert.ok(!entry.includes(word) && !cmd[cmdAt + 1].includes(word) && !scr[scrAt + 1].includes(word), "forbidden word " + word);
  assert.ok(log.indexOf("id=\"v0-46-0\"") > at, "the entry must sit in Unreleased, above the 0.46.0 release");
  assert.ok(log.indexOf("<strong>Local channel sources</strong>") > 0 && log.indexOf("<strong>Local channel sources</strong>") < at, "the previous entry stays above the new one");
  const usage = scr.slice(scr.findIndex((l) => l.includes("language-bash") && l.includes("qa-run.mjs parse")));
  const block = usage.slice(0, usage.findIndex((l) => l.includes("</pre>")) + 1).join("\n");
  assert.ok(block.includes("qa-run.mjs judge") && block.indexOf("qa-run.mjs judge") < block.indexOf("qa-run.mjs preflight"), "the preflight line must follow the judge line in the usage block");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
  ```

## Validation Commands

Diff base: the tree object `5aa83ee3db7989ebaef66041b331d60d709242e2` (the phase-6 end state; HEAD `c658a0c` is untouched and phases 1 to 6 are uncommitted, so never use a HEAD-relative or `<tree>..HEAD` form). Every "files changed" derivation below uses the single-argument form `git diff <tree> --name-only` plus `git ls-files --others --exclude-standard` for new files, and ignores `PRPs/` (pipeline artifacts: this plan, its review logs, the PRD row). Every git and node command carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. The plan writer has no shell, so none of these was executed: the Implementer runs each against the pre-change tree first and expects the stated result.

### Level 1 STATIC_ANALYSIS

Gate on syntax, the frozen surfaces, the untouched kit template, seed generator and visual tooling package, and the changed-file allowlist. `node --check` fails on a syntax error. The frozen-surface and changed-file checks pass on the unmodified tree (nothing changed yet) by design, as regression guards: they fail as soon as a frozen file, the template, the seed generator, the visual package, a test file, the validate registry or any file outside the ten planned ones changes.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
# The five frozen surfaces, the kit login template, the seed generator and the visual tooling package are byte-identical to the phase-6 end state.
frozen="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff 5aa83ee3db7989ebaef66041b331d60d709242e2 --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs plugins/relay/scripts/visual/provision.mjs plugins/relay/scripts/visual/package.json plugins/relay/resources/auth-login.template.mjs plugins/relay/scripts/qa-seed.mjs plugins/relay/commands/relay-qa-seed.md package.json)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface, the kit template, the seed generator or the visual package changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces, the kit template, the seed generator and the visual package unchanged"
fi
# No lockfile and no package manifest was added at the plugin root or beside the runner.
added="$( { GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff 5aa83ee3db7989ebaef66041b331d60d709242e2 --name-only; GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git ls-files --others --exclude-standard; } | grep -E '(^|/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|bun\.lock)$' || true )"
if [ -n "$added" ]; then
  echo "FAIL: a package manifest or lockfile changed:"; printf '%s\n' "$added"; exit 1
else
  echo "PASS: no package manifest or lockfile added"
fi
# Only the ten planned files changed: no test file, no new file, no version bump, no NAV or search-index edit (PRPs/ artifacts are ignored).
# The diff base is the phase-6 end state, so the files phases 1 to 6 changed are not in this diff.
changed="$( { GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff 5aa83ee3db7989ebaef66041b331d60d709242e2 --name-only; GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git ls-files --others --exclude-standard; } | grep -v '^PRPs/' | sort -u || true )"
unexpected="$(printf '%s\n' "$changed" | grep -v '^$' | grep -vxF -e plugins/relay/scripts/qa-run.mjs -e plugins/relay/commands/relay-qa-run.md -e plugins/relay/commands/relay-auth-scripts.md -e docs/api-reference.md -e docs/domain/glossary.md -e docs/domain/flows.md -e docs/context/integrations.md -e documentation/reference/commands.html -e documentation/reference/scripts.html -e documentation/changelog.html || true)"
if [ -n "$unexpected" ]; then
  echo "FAIL: a file outside the ten planned files changed (a test file would be an R-X violation):"; printf '%s\n' "$unexpected"; exit 1
else
  echo "PASS: only the planned files changed"
fi
```

### Level 2 CONTENT_INVARIANTS

Gate on the exported surface and the real-tree contract. The first command fails on the unmodified tree (the new names are not exported and the usage text has no preflight line) and passes once Tasks 1 to 4 are done; it also pins the constants and vocabularies this phase must not change, every single-occurrence anchor the corpus mutates, the section order of `runGround`, the ordering rule that the stale branch sits before the `SESSION_UNAVAILABLE` line, and that `runPreflight` contains no network, browser or write call. The remaining checks are regression guards that pass before and after: no static or dynamic sibling import added, no introduced forbidden path reference, and the non-browser tests that pin the documents and the runner this phase edits.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as m from "./plugins/relay/scripts/qa-run.mjs";
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
for (const name of ["describePlaywright", "playwrightUnavailableText", "staleKitRoles", "recordStaleSources", "runPreflight", "validateSteps", "groundLocators", "addSecretValues"]) assert.equal(typeof m[name], "function", name + " is not exported");
assert.deepEqual([...m.PREFLIGHT_SESSION_PROBES], ["PRPs/auth/.sessions/probe.json"]);
assert.ok(Object.isFrozen(m.PREFLIGHT_SESSION_PROBES));
assert.equal(m.OUTCOMES.join(","), "pass,fail,blocked,needs-human", "the outcome vocabulary changed");
assert.equal(Object.keys(m.REASON_CATALOGUE).length, 12, "the reason-code catalogue changed");
for (const code of ["FAILED_PLAYWRIGHT_UNAVAILABLE", "FAILED_BROWSER_UNAVAILABLE", "FAILED_KIT_SCRIPT_STALE", "FAILED_IGNORE_UNPROVEN", "RECORD_STALE"]) assert.ok(!Object.hasOwn(m.REASON_CATALOGUE, code), code + " must stay outside the catalogue");
assert.deepEqual([...m.RUNNER_OWNED_REASON_CODES].sort(), ["JUDGEMENT_UNCERTAIN", "PARTIAL_REMAINDER", "ROLE_NOT_DEDICATED"]);
const usage = m.USAGE.split("\n");
const judgeAt = usage.findIndex((l) => l.startsWith("  qa-run.mjs judge "));
const preAt = usage.indexOf("  qa-run.mjs preflight --root <dir>");
const helpAt = usage.indexOf("  qa-run.mjs --help");
assert.ok(judgeAt > 0 && preAt === judgeAt + 1 && helpAt === preAt + 1, "the preflight line must sit between the judge line and --help");
assert.ok(usage.some((l) => l.startsWith("  qa-run.mjs ground ")), "the ground line is kept");
const source = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const once = (needle, why) => assert.equal(source.split(needle).length - 1, 1, why + " (" + needle + ")");
once("const abs = join(ctx.runDirAbs, \x27evidence\x27, name);", "the evidence-writer anchor line must occur exactly once");
once("writeFileSync(", "writeFileSync");
once("renameSync(", "renameSync");
once("spawnSync(process.execPath", "spawnSync(process.execPath");
once("// WRITE-SITE", "write marker");
once("// GUARD-SITE", "guard marker");
once("loadPlaywright(root, PLUGIN_ROOT);", "the ground-section literal");
once("if (isObj(record)) {", "the anonymous-gate anchor");
once("failed: /<(failure|error)\\b/.test(body),", "the junit failure anchor");
once("best = Math.max(best, Number(ent.name));", "the record-attempt anchor");
once("const keepSteps = result.outcome === \x27blocked\x27 || result.outcome === \x27needs-human\x27;", "the keepSteps line");
once("async function runGroundGuarded(", "runGroundGuarded");
once("requireRunIgnore(runDirAbs);\n\n  /** @type {Map<number, any>} */ const planByIndex = new Map();", "the evidence-privacy anchor after the run-mode proof");
assert.equal(source.split("locator.within(").length - 1, 0, "locator.within() needs Playwright 1.64");
const ground = source.slice(source.indexOf("async function runGround("), source.indexOf("async function runGroundGuarded("));
assert.ok(ground.indexOf("requireRunIgnore(") > 0 && ground.indexOf("requireRunIgnore(") < ground.indexOf("loadPlaywright("), "the proof precedes the Playwright load in ground");
const staleAt = ground.indexOf("s.code === \x27FAILED_KIT_SCRIPT_STALE\x27");
const sessionAt = ground.indexOf("Halt(\x27SESSION_UNAVAILABLE\x27, `the kit login script for role ${role} did not produce a session (${s.code})`)");
assert.ok(staleAt > 0 && sessionAt > staleAt, "the stale branch must precede the untouched SESSION_UNAVAILABLE line in ground");
assert.ok(ground.includes("playwrightUnavailableText(PLUGIN_ROOT)") && ground.includes("browserUnavailableText(PLUGIN_ROOT)"), "ground must use the shared halt texts");
assert.ok(!source.includes("run `npm install` in plugins/relay/scripts/visual/") && !source.includes("in plugins/relay/scripts/visual/\x27"), "a halt text still names the repository path");
assert.ok(source.includes("PLAYWRIGHT_UNAVAILABLE_REASON") && !/PLAYWRIGHT_UNAVAILABLE_REASON\s*=\s*`/.test(source), "the persisted reason must be a fixed sentence, not a template");
const preAtSrc = source.indexOf("export function runPreflight(");
assert.ok(preAtSrc > 0, "runPreflight is missing");
const preBody = source.slice(preAtSrc, source.indexOf("\n}\n", preAtSrc));
for (const forbidden of ["fetch(", "fetchAnonymously(", "checkTarget(", "newContext(", ".launch(", "writeRunFile(", "writeEvidence(", "spawnSync("]) assert.ok(!preBody.includes(forbidden), "runPreflight must not contain " + forbidden);
const mainAt = source.indexOf("async function main(argv)");
const mainBody = source.slice(mainAt);
assert.ok(mainBody.indexOf("argv[0] === \x27preflight\x27") > 0 && mainBody.indexOf("argv[0] === \x27preflight\x27") < mainBody.indexOf("parseArgs(argv)"), "preflight must be dispatched before parseArgs");
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
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 5aa83ee3db7989ebaef66041b331d60d709242e2 -- plugins/relay/scripts/qa-run.mjs | grep -E "^\+[^+]" | grep -qE "import\("; then
  echo "FAIL: an import() call was introduced"; exit 1
else
  echo "PASS: no import() call introduced"
fi
# No repository-relative install form in any shipped or documented text this phase touched (the plugin-root-resolvable check).
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 5aa83ee3db7989ebaef66041b331d60d709242e2 -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md plugins/relay/commands/relay-auth-scripts.md | grep -E "^\+[^+]" | grep -E "(npm install --prefix|npx --prefix|in plugins/relay/scripts/visual)" | grep -q .; then
  echo "FAIL: a repository-relative install form was introduced"; exit 1
else
  echo "PASS: no repository-relative install form introduced"
fi
# No forbidden .claude/PRPs reference introduced by this phase's files outside the quoted-prohibition idiom.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 5aa83ee3db7989ebaef66041b331d60d709242e2 -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md plugins/relay/commands/relay-auth-scripts.md docs/api-reference.md docs/domain/glossary.md docs/domain/flows.md docs/context/integrations.md documentation/reference/commands.html documentation/reference/scripts.html documentation/changelog.html | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
# The non-browser tests that pin the runner and the documents this phase edits (they run no Chromium).
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-evidence-privacy.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-record-resolution.test.mjs scripts/validate/checks/qa-run-per-test-resolution.test.mjs scripts/validate/checks/qa-run-layout.test.mjs scripts/validate/checks/qa-run-kit-hardening.test.mjs scripts/validate/checks/qa-run-remint-decision.test.mjs scripts/validate/checks/qa-run-minted-session.test.mjs scripts/validate/checks/qa-run-chosen-inputs.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-captured-seeds.test.mjs scripts/validate/checks/qa-run-model-judgment.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs scripts/validate/checks/qa-run-query.test.mjs scripts/validate/checks/qa-run-plan-value-totality.test.mjs scripts/validate/checks/plugin-root-resolvable.test.mjs scripts/validate/checks/figma-track-phase6.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="AC-22" scripts/validate/checks/qa-run-scoped-locators.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
```

### Level 3 DRY-RUN END-TO-END

This is the gate that proves the fresh-cache behaviour AC-20 asks for: it builds cache-shaped directories OUTSIDE the repository (`<tmp>/<name>/relay/9.9.9/{scripts,resources}`, holding a COPY of the real `qa-run.mjs`, `auth-local-guard.mjs` and the installed kit template, so the copy's plugin root is the cache), runs the copy in `ground`, `run` and `preflight` mode with `NODE_PATH` removed from the environment, and reads what it prints and writes. A cache without `scripts/visual/node_modules` must halt `FAILED_PLAYWRIGHT_UNAVAILABLE` naming that cache path and the one command in every mode; a cache with a stub `playwright` package resolves with no manual step. It never touches the worktree's `node_modules` junction, launches no browser, and contacts no network (the target's `baseUrl` is `http://127.0.0.1:9`, a local origin the guard approves and nothing listens on). The Implementer creates the scratch script ONCE, with the Write tool (never through a shell heredoc), at an absolute path outside the repository (for example under the session scratchpad), and exports `RELAY_P7_E2E=<that path>`; each task gate and the Level 3 gate then run it from the worktree root with a `SCENARIOS` list. Scenarios: `ground-run` (Task 1), `ground-stale` (Task 2), `preflight` (Task 3). The script fails, instead of skipping, when a scenario cannot run.

Contents of the scratch script:

```js
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = process.cwd();
const SCRIPTS = join(REPO, 'plugins', 'relay', 'scripts');
const TEMPLATE = join(REPO, 'plugins', 'relay', 'resources', 'auth-login.template.mjs');
const WANT = (process.env.SCENARIOS ?? 'ground-run,ground-stale,preflight').split(',');
for (const w of WANT) assert.ok(['ground-run', 'ground-stale', 'preflight'].includes(w), 'unknown scenario ' + w);
const fw = (p) => p.split('\\').join('/');
const low = (s) => s.toLowerCase();
const env = { ...process.env };
delete env.NODE_PATH;
const STAMP = /^const KIT_TEMPLATE_ID = '([^']+)';$/m.exec(readFileSync(TEMPLATE, 'utf8'))[1];
const RUN_REL = 'PRPs/reports/f/qa-run/r1';
const tmp = mkdtempSync(join(tmpdir(), 'relay-p7-'));

// A cache-shaped plugin directory: stub === null has no Playwright; 'chromium' has a stub whose Chromium file exists; 'missing' has one whose file does not.
function makeCache(name, stub) {
  const cache = join(tmp, name, 'relay', '9.9.9');
  mkdirSync(join(cache, 'scripts', 'visual'), { recursive: true });
  mkdirSync(join(cache, 'resources'), { recursive: true });
  copyFileSync(join(SCRIPTS, 'qa-run.mjs'), join(cache, 'scripts', 'qa-run.mjs'));
  copyFileSync(join(SCRIPTS, 'auth-local-guard.mjs'), join(cache, 'scripts', 'auth-local-guard.mjs'));
  copyFileSync(TEMPLATE, join(cache, 'resources', 'auth-login.template.mjs'));
  writeFileSync(join(cache, 'scripts', 'visual', 'package.json'), JSON.stringify({ name: 'cache-visual', private: true }));
  if (stub !== null) {
    const dir = join(cache, 'scripts', 'visual', 'node_modules', 'playwright');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'playwright', version: '9.9.9', main: 'index.js' }));
    const exe = stub === 'chromium' ? join(dir, 'index.js') : join(dir, 'missing-chrome.exe');
    writeFileSync(join(dir, 'index.js'), 'module.exports = { chromium: { executablePath: () => ' + JSON.stringify(exe) + ' } };\n');
  }
  return cache;
}

const kitScript = (id) => '// Login script for one role of the test-auth kit\nconst KIT_TEMPLATE_ID = \'' + id + '\';\n';

// A target project: kit config for a local origin, an optional kit script ('stale' | 'current'), an optional git work tree and ignore rule.
function makeTarget(name, opts = {}) {
  const root = join(tmp, name, 'target');
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  mkdirSync(join(root, ...RUN_REL.split('/')), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: 'http://127.0.0.1:9', roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify({ states: {} }));
  if (opts.kit === 'stale') writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), kitScript('auth-login/0'));
  if (opts.kit === 'current') writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), kitScript(STAMP));
  if (opts.git === true) {
    const init = spawnSync('git', ['init', '-q', root], { env, encoding: 'utf8' });
    assert.equal(init.status, 0, 'git init: ' + init.stderr);
  }
  if (opts.ignore === true) writeFileSync(join(root, '.gitignore'), 'PRPs/auth/.sessions/\n');
  return root;
}

function writeReport(root) {
  const block = ['### Case 1', '**Title:** Opens the page', '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', '2. See Welcome.', ''].join('\n');
  mkdirSync(join(root, 'PRPs', 'reports', 'f'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', 'f', 'qa-report.md'), '# QA Report\n\n## Test Cases\n\n' + block + '\n## Notes\n\nnone\n');
  writeFileSync(join(root, ...RUN_REL.split('/'), 'plan.json'), JSON.stringify({ schema_version: 1, cases: [{ index: 1, title: 'Opens the page', driver: 'browser', role: null, state: 'none', steps: [{ action: 'goto', path: '/' }, { action: 'expect_visible', text: 'Welcome' }] }] }));
}

// Runs the COPY of the runner that sits in the cache, so its plugin root is the cache.
const qa = (cache, args, cwd) => spawnSync(process.execPath, [join(cache, 'scripts', 'qa-run.mjs'), ...args], { cwd, env, encoding: 'utf8', windowsHide: true, timeout: 120000 });
const groundArgs = (root, role) => ['ground', '--root', root, '--feature', 'f', '--run-dir', RUN_REL, '--route', '/', ...(role ? ['--role', role] : [])];
const visualOf = (cache) => low(fw(join(cache, 'scripts', 'visual')));
const hasCommand = (text, cache) => low(text).includes('npm --prefix "' + visualOf(cache) + '" install');
const describe = (r) => 'status ' + r.status + '\nstdout: ' + r.stdout + '\nstderr: ' + r.stderr;

try {
  if (WANT.includes('ground-run')) {
    const cache = makeCache('gr', null);
    const root = makeTarget('gr');
    const g = qa(cache, groundArgs(root), root);
    assert.equal(g.status, 1, describe(g));
    assert.ok(g.stderr.startsWith('FAILED_PLAYWRIGHT_UNAVAILABLE:'), describe(g));
    assert.ok(low(g.stderr).includes(visualOf(cache)), 'ground must name the resolved cache path\n' + describe(g));
    assert.ok(hasCommand(g.stderr, cache), 'ground must name the one command\n' + describe(g));
    writeReport(root);
    const r = qa(cache, ['run', '--root', root, '--feature', 'f', '--run-dir', RUN_REL], root);
    assert.equal(r.status, 1, 'run must exit 1 when Playwright is unavailable\n' + describe(r));
    assert.ok(r.stderr.includes('FAILED_PLAYWRIGHT_UNAVAILABLE'), describe(r));
    assert.ok(low(r.stderr).includes(visualOf(cache)) && hasCommand(r.stderr, cache), 'run must print the path and the command\n' + describe(r));
    const raw = readFileSync(join(root, ...RUN_REL.split('/'), 'results.json'), 'utf8');
    const doc = JSON.parse(raw);
    assert.deepEqual([doc.cases[0].outcome, doc.cases[0].reason_code], ['blocked', 'FAILED_PLAYWRIGHT_UNAVAILABLE'], raw);
    assert.ok(!low(raw).includes(visualOf(cache)) && !raw.includes('npm --prefix'), 'results.json must not carry the cache path or the command');
    assert.ok(!/plugins\/relay\/scripts\/visual/.test(r.stderr + g.stderr + raw), 'no text may name the repository path');
    console.log('PASS: ground-run');
  }

  if (WANT.includes('ground-stale')) {
    const cache = makeCache('gs', 'chromium');
    const stale = makeTarget('gs-stale', { kit: 'stale' });
    const s = qa(cache, groundArgs(stale, 'admin'), stale);
    assert.equal(s.status, 1, describe(s));
    assert.ok(s.stderr.startsWith('FAILED_KIT_SCRIPT_STALE:'), describe(s));
    assert.ok(s.stderr.includes('/relay-auth-scripts --role admin --refresh') && s.stderr.includes('auth-login/0 vs ' + STAMP), describe(s));
    assert.ok(!s.stderr.includes('SESSION_UNAVAILABLE'), 'the stale code must replace SESSION_UNAVAILABLE\n' + describe(s));
    const current = makeTarget('gs-current', { kit: 'current' });
    const c = qa(cache, groundArgs(current, 'admin'), current);
    assert.equal(c.status, 1, describe(c));
    assert.ok(c.stderr.startsWith('SESSION_UNAVAILABLE:') && !c.stderr.includes('FAILED_KIT_SCRIPT_STALE:'), 'a current script keeps the old halt\n' + describe(c));
    console.log('PASS: ground-stale');
  }

  if (WANT.includes('preflight')) {
    const bare = makeCache('pf-none', null);
    const plain = makeTarget('pf-none');
    const none = qa(bare, ['preflight'], plain);
    assert.equal(none.status, 2, describe(none));
    assert.ok(none.stderr.includes('qa-run.mjs preflight --root <dir>'), describe(none));
    const help = qa(bare, ['--help'], plain);
    assert.equal(help.status, 0);
    assert.ok(help.stdout.includes('  qa-run.mjs preflight --root <dir>'), describe(help));
    const p1 = qa(bare, ['preflight', '--root', plain], plain);
    assert.equal(p1.status, 1, describe(p1));
    assert.ok(p1.stdout.includes('PREFLIGHT FAILED_PLAYWRIGHT_UNAVAILABLE:') && low(p1.stdout).includes(visualOf(bare)) && hasCommand(p1.stdout, bare), describe(p1));
    assert.ok(p1.stdout.includes('PREFLIGHT chromium: skipped'), describe(p1));

    const missing = makeCache('pf-missing', 'missing');
    const p2 = qa(missing, ['preflight', '--root', makeTarget('pf-missing')], plain);
    assert.equal(p2.status, 1, describe(p2));
    assert.ok(/PREFLIGHT playwright: ok .*node_modules\/playwright \(version 9\.9\.9\)/i.test(p2.stdout), describe(p2));
    assert.ok(p2.stdout.includes('PREFLIGHT FAILED_BROWSER_UNAVAILABLE:') && hasCommand(p2.stdout, missing), describe(p2));

    const ready = makeCache('pf-ready', 'chromium');
    const okRoot = makeTarget('pf-ok', { kit: 'current' });
    const p3 = qa(ready, ['preflight', '--root', okRoot], okRoot);
    assert.equal(p3.status, 0, describe(p3));
    assert.ok(p3.stdout.includes('PREFLIGHT chromium: ok') && p3.stdout.includes('PREFLIGHT kit: ok') && p3.stdout.trimEnd().endsWith('PREFLIGHT: ok'), describe(p3));

    const staleRoot = makeTarget('pf-stale', { kit: 'stale' });
    const p4 = qa(ready, ['preflight', '--root', staleRoot], staleRoot);
    assert.equal(p4.status, 1, describe(p4));
    assert.ok(p4.stdout.includes('PREFLIGHT FAILED_KIT_SCRIPT_STALE: role admin (auth-login/0 vs ' + STAMP + '); run /relay-auth-scripts --role admin --refresh'), describe(p4));

    const exposed = makeTarget('pf-git-open', { kit: 'current', git: true });
    const p5 = qa(ready, ['preflight', '--root', exposed], exposed);
    assert.equal(p5.status, 1, describe(p5));
    assert.ok(p5.stdout.includes('PREFLIGHT FAILED_IGNORE_UNPROVEN:'), describe(p5));
    const covered = makeTarget('pf-git-ignored', { kit: 'current', git: true, ignore: true });
    const p6 = qa(ready, ['preflight', '--root', covered], covered);
    assert.equal(p6.status, 0, describe(p6));
    assert.ok(p6.stdout.includes('PREFLIGHT sessions: ok (PRPs/auth/.sessions/ is ignored)'), describe(p6));
    console.log('PASS: preflight');
  }
  console.log('ALL PASS: ' + WANT.join(','));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
```

Run it from the worktree root, after Tasks 1 to 3 (it fails on the unmodified tree: `preflight` is an unknown mode, the halt texts name the repository path and `ground` reports `SESSION_UNAVAILABLE`):

```bash
set -euo pipefail
E2E="${RELAY_P7_E2E:?set RELAY_P7_E2E to the absolute path of the scratch end-to-end script}"
test -f "$E2E"
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false SCENARIOS=ground-run,ground-stale,preflight node "$E2E"
```

Then the static suite and the corpus gate. `npm run validate` prints `28 passed, 0 failed (28 checks run)`; the grep fails if the count changes. The corpus gate runs last and alone (about five minutes) and runs the corpus exactly as `node --test "scripts/validate/**/*.test.mjs"` (the glob is passed to `node` unexpanded, never narrowed) with the TAP reporter.

```bash
set -euo pipefail
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF -- "28 passed, 0 failed (28 checks run)"
```

Corpus gate. The baseline is green (phase 6 closed with an empty allowlist). Research examined the existing tests that could observe this phase (the usage-text pins, the mode-list pins, the halt-text and `SESSION_UNAVAILABLE` tests, the `results.json` shape and `warnings` tests, the record-resolution fixtures, the source-text anchors and the doc and site-page pins) and VERIFIED no stale test, so the allowlist is EMPTY and the gate does not claim a bare zero outside it: it tolerates at most two further failing tests in the concurrent run (`FLAKE_BUDGET`), and each failing test file must then pass when run alone, which separates load sensitivity from a regression. More than two failures fails the gate; a file that also fails alone fails the gate and is a candidate for the test pair (`EXISTING_TEST_UPDATED`, with the allowlist then extended by file and title in a recorded decision), never an Implementer edit. The gate exits 1 on a runner crash, on a cancelled test, on output it cannot parse or whose counters disagree with its result lines, and when `node_modules/playwright` is missing from the worktree (it is a directory junction; never modify it). The TAP shape was observed on this host (Node v24.15.0): flat output, a failing test names its file only in the `location:` line of its YAML block, and an import-time crash is one `not ok` whose title is the file path.

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

- **AC-A1 (PRD AC-17):** Given a `PRPs/auth/login-<role>.mjs` whose `KIT_TEMPLATE_ID` differs from the installed template, when `/relay-qa-run` runs its preconditions, then `P2b` (`qa-run.mjs preflight`) halts naming `FAILED_KIT_SCRIPT_STALE`, each stale role and its `/relay-auth-scripts --role <role> --refresh` line before any `init` or `ground`, and `ground` reports the same code by name (a `FAILED_KIT_SCRIPT_STALE` halt carrying both identities and the refresh line) instead of `SESSION_UNAVAILABLE`, whose sentence is unchanged; a script that carries no template sentence, an unreadable script and an unstamped installed template are never reported.
- **AC-A2 (PRD AC-18):** Given `qa-run.mjs preflight --root <dir>`, when it runs, then it reports, with no network request, no browser and no write, whether Playwright resolves and from which package directory and version, whether the Chromium build that version needs is installed, whether every kit script is current and whether `PRPs/auth/.sessions/` is ignored (a directory outside a git work tree counts as ignored because nothing there can be committed), prints one `PREFLIGHT` line per check and a final line, and exits 1 on any failure; a missing or malformed `--root` exits 2 with the usage text, and the mode appears in `USAGE` between the `judge` line and `--help`.
- **AC-A3 (PRD AC-19):** Given a record-resolved case whose cited test files statically import (a `from` form, a bare `import`, a literal `require`) a relative source file that git reports changed after the record's `generated_at` (its last commit is later, or it has uncommitted changes with a later modification time), when the case resolves, then its evidence file lists those files under `stale_sources`, `results.json` carries one `RECORD_STALE` warning for the case in its existing `warnings` array (printed as `WARNING RECORD_STALE`), the outcome and every other key are unchanged, and outside a git work tree, with git failing or with nothing stale, no key and no warning is added.
- **AC-A4 (PRD AC-20):** Given a fresh plugin cache copy of the release, when `/relay-qa-run` first needs Playwright, then either it resolves with no manual step (a package at `<plugin>/scripts/visual/node_modules`, or anywhere above it, is found by the same two resolution bases as before), or `run`, `ground` and `preflight` halt `FAILED_PLAYWRIGHT_UNAVAILABLE` naming the resolved `<plugin>/scripts/visual` directory and the one command `npm --prefix "<that directory>" install`, `run` exiting 1 after writing a `results.json` whose case reason is a fixed sentence without a path; the Chromium-missing halt of `ground` and `preflight` names the same command; and the three modes are proven against cache-shaped directories outside the repository, not the repository root.
- **AC-A5 (PRD AC-22 for `preflight`):** Given the command doc, the knowledge base and the site pages, when they are read, then `relay-qa-run.md` carries `P2b` with the preflight line and the relay-never-run rule, a record-resolution bullet for `RECORD_STALE` and the stale-by-name sentence; the `preflight` mode appears in `USAGE` and in the usage block of `scripts.html`; `docs/api-reference.md` lists the six new exports in its single `qa-run.mjs` row after `USAGE` and every name in the checked span is a real export; `docs/domain/glossary.md`, `docs/domain/flows.md`, `docs/context/integrations.md`, `relay-auth-scripts.md`, the two site pages and the changelog state the same; the line that lists the runner modes is byte-identical.
- **AC-A6 (PRD AC-24):** `npm run validate` passes with exactly 28 checks (none added), the corpus `node --test "scripts/validate/**/*.test.mjs"`, run in a worktree that has `node_modules`, passes the corpus gate of `## Validation Commands` (an empty allowlist and the load-sensitivity rule), and the five frozen surfaces, the kit login template, the seed generator, the visual tooling package, every package manifest and every test file are byte-identical to the phase-6 end state. This criterion is verified by Levels 1 to 3 and delivered by every task keeping its constraints; it has no dedicated task (infrastructure annotation).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| F10's decision is wrong: Claude Code's cache-time install may or may not apply to this directory marketplace (the documentation says a local-path plugin loads in place and gets no install; every observed cache of this repository was a versioned copy without `node_modules`) | M | M | Whatever the mechanism, AC-20 holds: either Playwright resolves, or every mode halts with the path and the one command (Level 3 proves both against cache-shaped directories). No lockfile and no `${CLAUDE_PLUGIN_DATA}` is committed to, so nothing has to be undone; Phase 8 verifies on the installed 0.47.0 cache whether `node_modules` appeared by itself |
| `npm --prefix <dir> install` does not install the Chromium build (the postinstall hook may not run on a re-install, or `--with-deps` may need privileges on Linux) | M | M | The command is the existing documented install (`package.json` `postinstall`); `preflight` independently verifies the Chromium file exists and reports `FAILED_BROWSER_UNAVAILABLE` with the same command; Phase 8's install step runs `preflight` on both target projects, which is where this is confirmed on a real cache |
| The absolute cache path leaks the operator's home directory into a tracked file | L | M | The path is printed to the terminal only; the `results.json` reason is a fixed sentence (Level 3 asserts the path and the command are absent from `results.json`, and Level 2 asserts the persisted reason is not a template) |
| A new line, import or comment disturbs a source-text pin or a mutation anchor of the runner | M | H | The helpers sit after `loadPlaywright`, after `resolveFromRecord` and after `runGroundGuarded`, outside every pinned section; the edits to pinned neighbourhoods are single-line replacements that keep the pinned literals; Level 2 counts every anchor the corpus mutates and checks the section order |
| The record flag misreads a test file (a regular expression misses an import form, or a dynamic import is mistaken for a static one) | M | L | The flag only adds a warning and never changes an outcome; the forms are the three static ones the PRD names, one level deep; Task 4's gate pins each form and the dynamic exclusion; a missed import is a missed warning, never a false failure |
| `preflight` reports a stale kit script that the run would not have judged, or the reverse | L | M | It calls `staleKitScript` itself, so it inherits the fail-open rules the run uses; Task 2's gate pins the marker, unstamped and hand-written cases |
| A doc edit breaks a pinned sentence, row label, sentence-splitting rule or export-span rule | M | M | The new text avoids the pinned words (`impossible`, `closed catalogue`, `derived by the runner`, catalogue codes in the Classification rows) and sits after `USAGE` in the API row; Tasks 5 to 7 run the tests that pin the page they edit |
| The validation commands were derived by reading the tree, not executed (the plan writer has no shell) | M | L | They reuse the fixture shapes of shipped tests and of the phase-6 plan; the Implementer runs each against the pre-change tree first and expects the stated failure; the Level 3 stub package is the one place a Node resolution detail could differ (CommonJS stub, `main: index.js`) |
| Scope size across nine phases (PRD risk) | H | M | This phase is one lane on `qa-run.mjs`, independently testable, adds no reason-code catalogue entry and keeps every phase-1 to phase-6 contract |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework. (The task gates and the Levels run the existing test files only as regression guards, and the end-to-end script lives outside the repository in a scratch location; running a test is not touching it.)
- **F10 decision (PRD Open Question 1), with evidence and confidence.** Decision: do NOT commit to a lockfile and do NOT use `${CLAUDE_PLUGIN_DATA}`; ship an actionable halt in every mode (Tasks 1 and 3) and let Phase 8 observe the real cache. Evidence, from `research-web` of the Claude Code documentation (https://code.claude.com/docs/en/plugins/loading, https://code.claude.com/docs/en/plugins/components, https://code.claude.com/docs/en/plugins-reference, https://playwright.dev/docs/browsers): (1) "Relative-path plugins in a marketplace you added from a local path: the plugin loads in place from its path inside the marketplace folder ... Claude Code doesn't install the dependencies into the source directory. Install them there yourself, or from a hook into `${CLAUDE_PLUGIN_DATA}`." (2) The automatic install runs "when Claude Code copies a plugin into the cache", "only when the plugin's root directory contains both a `package.json` and a supported lockfile" (`bun.lock`, `npm-shrinkwrap.json` or `package-lock.json`, lockfile version 2 or 3), with `--ignore-scripts`, a 60-second timeout and no way to turn it off; the documentation never mentions a subdirectory such as `scripts/visual/`. (3) `${CLAUDE_PLUGIN_DATA}` is documented for `node_modules` and persists across updates, but "the variables aren't present in the environment of commands Claude runs through the Bash tool", so a runner script cannot read it. (4) Playwright's browser is a separate CLI download. Reading: this repository's marketplace is a directory marketplace, so by the documentation no automatic install applies; a lockfile would also have to sit at the plugin root (`plugins/relay/`, which has no `package.json`, while `scripts/visual/package.json` is pinned by `figma-track-phase6.test.mjs` and must stay separate from the repository root), could not be generated by the plan writer (no shell, hashes cannot be written by hand), and would not install Chromium anyway (`--ignore-scripts`). Confidence: HIGH that a lockfile would not install the browser; MEDIUM that a directory-marketplace install runs no automatic install (the documentation says so, but every cache of this repository observed since 0.40.0 was a versioned copy without `node_modules`, which suggests the install here is a copy and not "in place", and the documentation could not be exercised without a shell); LOW on what a lockfile would do for a copy. That uncertainty is why the implementation is robust to either answer: if a future Claude Code or marketplace type does install the packages into the cache, `describePlaywright` finds them through the unchanged resolution bases (a package at `<plugin>/node_modules` resolves by walk-up) and no halt fires. Follow-up for Phase 8: after installing the new version, run `preflight` on both target projects and record whether the cache needed the command; if `node_modules` appeared unprompted, record that and keep the halt as the fallback.
- **Predicted stale tests: none verified stale.** Research read the assertions (not only greps) of every test that could observe the change. Verified unaffected: the usage tests (`qa-run-stable-grounding.test.mjs:347` and `:356` compare against the live `USAGE`; `qa-run-grounding-prefix-grammar.test.mjs:306` and `qa-run-model-judgment.test.mjs:746` use `find`/`includes`; `qa-run-release-pages.test.mjs:220` ignores a `preflight` line because its regex lists four modes; no test indexes `USAGE` lines from the end); the mode-list pin (`qa-run-vocabulary-pins.test.mjs:68,183` matches line 29 of the command doc, which this phase leaves byte-identical); the halt texts (no test asserts the old `FAILED_PLAYWRIGHT_UNAVAILABLE` or `FAILED_BROWSER_UNAVAILABLE` sentences; `qa-run-stable-grounding.test.mjs:409` matches the command doc's ground-halt sentence, which is untouched; `:664` is a comment about the guard coming first, which still holds); the stale tests (`qa-run-kit-hardening.test.mjs:358` and `:406` are run-mode and the run sentence is untouched; no test combines `ground` with a stale script); the record and warnings tests (`qa-run-record-resolution.test.mjs:241` asserts fields one by one and its fixtures are not git work trees, so the flag stays silent; `qa-run-layout.test.mjs:150,391,399,461` assert an empty `warnings` array for reports without a mismatch and no `RECORD_STALE` fires there); the command-doc pins (`qa-run-per-test-resolution.test.mjs:346-368` finds bullets by `startsWith` and requires the new bullet after `never added to them.`; no test counts `### P` headings or fenced bash blocks). **At-risk list, unverified** (each would be an `EXISTING_TEST_UPDATED` item for the test pair, never an Implementer edit, with the allowlist extended by file and title in a recorded decision): (1) `runRun` helpers in `qa-run-classification.test.mjs` (near line 719) and `qa-run-impossible-catalogue.test.mjs` (near line 371), and the `pluginCopy`/`COPY_ENV` helpers of `qa-run.test.mjs` (near line 285), if any of them runs a COPIED runner without `NODE_PATH` through a case that reaches the Playwright check and asserts exit 0 (the run now exits 1 and its reason text changed); (2) a ground-mode test in `qa-run-kit-hardening.test.mjs` that asserts `SESSION_UNAVAILABLE` for a stale-stamped script; (3) `qa-run-record-resolution.test.mjs` past line 355, if a fixture is a git work tree with real imported sources and deep-equals the whole evidence value; (4) `qa-run-contract.test.mjs`/`qa-run-network-contract.test.mjs` mutation tests whose anchor sits in the lines this phase replaces in `executeCase` (the Playwright reason) or `runGround` (the two Halt texts); (5) `qa-run-release-pages.test.mjs` row-label and sentence rules if a new site row lands in the wrong entry. The corpus gate therefore allowlists nothing.
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A4).** `describePlaywright` and `playwrightUnavailableText` against cache-shaped directories (no package; a package at `scripts/visual/node_modules`; a package above it at the plugin root; a package in the target; the text names the directory and the one command and never the repository path); `run`, `ground` and `preflight` against a copy of the runner in a cache-shaped tree with `NODE_PATH` removed (the Level 3 scenarios as tests: the halt, the exit codes, the path-free `results.json` reason, the stderr line); `staleKitRoles` (stale, unstamped, current, hand-written, bad role slug, no kit, unreadable template fails open); the by-name `ground` halt and the unchanged `SESSION_UNAVAILABLE` control; `runPreflight` with an injected `run` and `pluginRoot` (each check's pass and fail lines, the final line, the failure count, git absent, not a work tree, the ignore probe, no network or write call in the function body); the `preflight` argument handling (no args, a missing `--root`, a non-directory, `--help`) and the `USAGE` line position; `recordStaleSources` (each static form, the dynamic exclusion, extension and `index` resolution, a `.js` specifier resolving to a `.ts` file, a path leaving the root, hostile arguments, an injected failing `run`, committed versus uncommitted changes) and its wiring (the evidence key and the result field only when non-empty, one `RECORD_STALE` warning per case, no change to the entry or the counts); the command doc (`P2b` position and content, the new bullet, the unchanged mode-list line, no repository-relative install form) and the API-reference export list (every name real, all after `USAGE`).
- **Design decisions made here.** (1) The persisted reason carries no path and the terminal carries it: the absolute cache path contains the home directory, and `results.json` is tracked; a collapsed `~` form was rejected because it cannot be pasted as a command. (2) `run` exits 1 on an unavailable Playwright (a named halt), where it used to exit 0 with every browser case blocked: the operator must not mistake a missing dependency for a finished run; a run that never needs the package (every case declined or record-resolved) is unchanged because the package is only loaded when a case needs it. (3) `preflight` is a separate mode dispatched before `parseArgs`, like `ground` and `judge`, so `parseArgs` and its refusal tests are untouched. (4) The mode is documented in `P2b` and in `USAGE`, not in the line-29 mode list that a test pins byte for byte (phase 5 did the same for `judge`). (5) `staleKitRoles` scans `login-*.mjs` files instead of reading the roles from `login.config.json`, so a script whose role was removed from the matrix is still reported (the same files `--refresh` would regenerate). (6) A directory outside a git work tree passes the ignore check, mirroring `proveRunIgnored`'s `not-applicable`. (7) The record flag looks one import level deep and at static forms only, as the PRD says; a changed transitive dependency is a known miss. (8) The one provisioning command is `npm --prefix "<dir>" install`, which needs no `cd` and works in every shell; it relies on the package's own `postinstall` for the Chromium build, and `preflight` verifies the result instead of assuming it. (9) No new catalogue code and no new `results.json` key: `RECORD_STALE` joins the existing `warnings` array, so `validateResults` (which tolerates unknown keys and does not validate `warnings`) and every count are unchanged.
- **Research.** `research-codebase` located the Playwright, kit-staleness, usage, dispatch, record-resolution, warnings and ignore-helper anchors cited above (all read in the worktree files) and the staleness inventory of the tests; two further read-only passes verified the usage, halt-text, stale-ground, record and command-doc pins by reading assertions and returned the docs-sync anchors for the knowledge base, the two site pages, the changelog and `relay-auth-scripts.md`. `research-web` returned the Claude Code dependency-install findings quoted in the F10 decision, with these gaps recorded: a subdirectory install is not documented, the Claude Code version that introduced the install is unknown, and the Playwright page does not say whether `npm install` triggers the browser download. All line anchors in this plan were read in the worktree files, except the exact old text of the two single-line API rows, the long `<dd>` lines of the two site pages and the last lines of the changelog `Added` list, which the Implementer reads in full before editing.
- **Anchor lines and pins to keep (collected for the Implementer).** The line `const abs = join(ctx.runDirAbs, 'evidence', name);` must occur exactly once. The line `const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';` stays byte-identical. The text right after `requireRunIgnore(runDirAbs);` in `runRun` (a blank line and `/** @type {Map<number, any>} */ const planByIndex = new Map();`) stays as it is. The literal `loadPlaywright(root, PLUGIN_ROOT);` occurs exactly once, in the ground section, after `requireRunIgnore(`. `if (isObj(record)) {`, `failed: /<(failure|error)\b/.test(body),` and `best = Math.max(best, Number(ent.name));` occur exactly once. The session section from `function obtainSession(` to `async function prepareState(` must not contain `while (` and must keep `shouldRemintLogin(`, `runLoginScript(` and `isMintedRole(`. The text between `export function precheckGroundedSteps(` and `export function summarizeEntries(`, and between `function loadGroundingSnapshots(` and `async function executeCase(`, takes no new code. `async function runGroundGuarded(` occurs exactly once. The copy-helper tests copy only `qa-run.mjs`, `auth-local-guard.mjs` (and, in one helper, the kit template), so no new sibling import, static or dynamic. The banned strings in the command doc are `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type` and `--local-host`, and the first `the runner script (` match of the whole document is the mode-list line. `relay-auth-scripts.md` must never contain `/relay-qa-run`. In the API reference, a backticked camelCase or UPPER_SNAKE token between `REASON_CATALOGUE` and `USAGE` of the `qa-run.mjs` row must be a real export. The commands page Classification row allows exactly one `closed catalogue` sentence and one `derived by the runner` sentence and no new code token. Shipped text must never contain `npm install --prefix plugins/relay/...` or `npx --prefix plugins/relay/...` (`plugin-root-resolvable`).
- **Docs sync and scope.** `docs/decisions.md` is not edited (so no `documentation/governance/decisions.html` mirror is involved). Under `documentation/` only `reference/commands.html`, `reference/scripts.html` and `changelog.html` change, following `documentation/AGENTS.md`: no page is added, so NAV and the search index are untouched, and `plugin.json` keeps its version. Task 6 finishes the knowledge-base sync, so the `docs_sync` pass at implement time finds it done.
- **Environment.** The host is Windows with Git Bash. Every command that runs git, node or npm carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. Keep LF line endings in every edited file (the `line-endings` check). `node_modules` in the worktree is a directory junction to the main checkout's: do not modify it; Playwright 1.61.1 and Chromium 149 are what the regression tests use. The Level 3 harness builds its own cache-shaped temp tree and never uses the junction. Use `grep -qF --` for any pattern that can start with `-`. Node paths in the gates are built from `process.cwd()` and `join`, never from a bare backslash path.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Tasks 1 to 4 are gates that fail before the work (the new names are not exported, `preflight` is an unknown mode, the halt texts name the repository path). Tasks 5 to 7 are gates that fail before the work (the authored literals are absent) and then run the existing tests that pin the page they edit, which pass before and after. The Level 1 frozen-surface and changed-file checks pass on the unmodified tree by design; the Level 2 export check and the Level 3 end-to-end gate fail on it.

*Generated: 2026-10-22*
*Approved: 2026-10-22*
*Implemented: 2026-10-22*
*Status: IMPLEMENTED*
