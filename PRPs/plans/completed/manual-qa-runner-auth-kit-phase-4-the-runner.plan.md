# Feature: The runner (Phase 4 of manual-qa-runner-auth-kit)

```
**Decision Gate**
- Active context: none
- Activated criteria: creation of a new standalone command, a new runner script and a new `npm run validate` check; secret handling (sessions and tokens read, evidence written); impact on shared contracts (`qa-report.md` consumed read-only, `redaction-policy.md` applied in code, the `GUARD_SITES` registry extended); a new tracked declaration surface (`PRPs/auth/qa-seed.json`); documentation-site registration and a command-count change (21 to 22)
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the binding scope; Phase 4 delivers the runner, its four outcomes and its evidence
  - [2026-09-21] "Parallel test environments extend the runnable-worktree-environments registration" and [2026-05-15] "Runnable worktree environments" — the environment handle has no registered path or format, so the runner may not approximate any of the six strategies; it reads a handle only from an explicit `--env-handle <path>` and otherwise falls back to the project's own `PRPs/auth/login.config.json`
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-05-06] / [2026-07-12] R-X strict — the Implementer authors zero test files; every test comes from the test pair
  - [2026-09-25] The hybrid `/code-review` pass is measured by `hybrid-code-review` Phase 5 — no task may touch `code-reviewer`, `code-reviewer-semantic` or `relay-implement` (PRD AC-16)
  - [2026-04-19] Methodology declaration — nothing is inferred; the seed declaration is an explicit, tracked, human-authored file
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — evidence is redacted in memory before any write; output carries statuses and paths only
  - "Writing pipeline artifacts under `.claude/`" — every artifact goes under `PRPs/`
  - "Relying on interactive permission prompts in the autonomous loop" — the command is standalone, non-interactive and never invoked by `/relay-execute`
  - "Weakening or deleting tests to make the loop turn green" — no task edits a test file; the pin updates are routed to the test pair
  - "Treating `plugins/prp-core/` as active relay code" — nothing is imported from that tree
- Applicable architectural rules:
  - Command versus agent separation — the command owns judgment (translating prose steps into a closed plan) and the preconditions; the script owns every deterministic mutation, outcome and timestamp
  - Interactivity boundary — `/relay-qa-run` extends nothing; it is non-interactive past its own preconditions
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; packaged resources and scripts are cited with the full prefix
  - Graceful degradation is mandatory when a precondition is absent — except the local-only guard, which is a hard failure by design
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/manual-qa-runner-auth-kit.prd.md` — Implementation Phases row 4: "The runner" — Goal: every case of a real report gets an outcome — Success signal: entry count equals case count on a report exercising all four outcomes, and the report is byte-identical after the run.

## Summary

This phase delivers the consumer side of the test-auth kit. It adds (1) `plugins/relay/scripts/qa-run.mjs`, a deterministic runner script with three modes: `parse` (reads `qa-report.md` and prints its cases, read-only), `init` (resolves the local target, runs the guard, creates a fresh `PRPs/reports/<feature>/qa-run/<run-id>/` directory) and `run` (executes a plan, gives every case exactly one of `pass`, `fail`, `blocked`, `needs-human`, captures redacted evidence, and writes `results.json` with real UTC instants); (2) `/relay-qa-run`, a standalone non-interactive command that parses the report, translates each case's prose steps into a closed-vocabulary `plan.json` where it can (and omits the case where it cannot), and hands execution to the script; (3) the runner's local-only guard sites appended to the `GUARD_SITES` registry; (4) a `qa-run-contract` validation check pinning the closed outcome vocabulary, the single-write-helper rule and the human-gate statement; and (5) the documentation-site and `docs/api-reference.md` registration of a 22nd command. The browser (Playwright) and HTTP drivers are ACTIVE in this phase; the CLI and read-only-DB drivers are NOT built — any case that needs them, or that the command cannot translate into the closed plan vocabulary, returns `needs-human` with its manual steps verbatim. The runner never edits `qa-report.md`, never flips a Manual status and ends every run by stating that the human validation gate is still open.

## User Story

As an operator running relay's human validation gate
I want one command that executes what is locally executable in a QA report and hands me redacted evidence per case
So that I spend my attention only on the `needs-human`, `fail` and `blocked` entries, and still sign off on the gate myself

## Problem Statement

`/relay-qa-report` writes, for every case, a risk level, the required state and a numbered manual step-by-step, and leaves each Manual status at `pending`. Nothing in relay executes those steps; the human validator runs each case by hand, and that gate is where the human spends most of their time. Phases 1-3 shipped the secrecy foundation, the human-confirmed auth model and the per-role login scripts that produce an authenticated session per role. Phase 4 narrows the problem to the consumer of those sessions: a runner that gives every case of a real report an outcome, backed by evidence, without ever becoming the gate itself.

## Solution Statement

A split by what is judgment and what is mechanism. The command (`/relay-qa-run`) does the one judgment: reading each case's prose steps and, only where they map onto a small closed action vocabulary (HTTP request with expected status/body; browser goto/click/fill/expect), emitting a `plan.json` entry for that case. The script does everything that must be deterministic and auditable: it parses the report itself (so the case list is never LLM-authored), validates the plan against the report (title and index must match; an unknown action invalidates the entry), runs the guard before any request/login/write, obtains sessions by calling the kit's own login script, runs declared seed commands only, applies `redaction-policy.md` in code before any evidence byte reaches disk, stamps real UTC instants from its own clock, enforces `entries.length === cases.length` even on abort, and prints the human-gate statement. A case with no plan entry, an invalid entry, an unsupported driver, or no expectation is `needs-human` with the steps verbatim; a `pass` requires at least one evaluated expectation. A `fail` is reserved for an expectation that was evaluated and not met; anything that stops a case from being attempted is `blocked` with a stable `reason_code`.

## Metadata

| Field | Value |
|-------|-------|
| Type | New feature (one script, one command, one validation check, GUARD_SITES extension, documentation registration) |
| Complexity | High |
| Systems Affected | `plugins/relay/scripts/`, `plugins/relay/commands/`, `scripts/validate/`, `docs/api-reference.md`, `documentation/reference/`, `documentation/guide/validation-suite.html`, `documentation/assets/data/search-index.json`, `documentation/changelog.html` |
| Dependencies | Phase 1 (complete): `auth-kit-secrecy.mjs`, `auth-kit.gitignore`. Phase 2 (complete): the approved auth model. Phase 3 (complete): `auth-local-guard.mjs` (`checkTarget`, `isAllowedHost`), `auth-login.template.mjs` and the generated `PRPs/auth/login-<role>.mjs`, `PRPs/auth/login.config.json`. `playwright` resolvable at run time (project root, else `plugins/relay/scripts/visual/`) |
| Estimated Tasks | 10 |
| Source PRD line ref | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` lines 210 (row 4), 232-235 (Phase 4 details), 83-98 (AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-13, AC-14, AC-15, AC-16), 155-157 (MVP scope and drivers), 183 (separate results tree), 187 (environment handle) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | 83-98, 102-104, 155-157, 183-187, 232-235 | The ACs this phase satisfies, the three Open Questions this phase resolves or defers, the MVP driver decision, the results-tree and environment-handle architecture notes |
| P0 | `plugins/relay/scripts/auth-local-guard.mjs` | 102-156, 162-186, 216-218 | `isAllowedHost` and `checkTarget` signatures and result shapes the runner imports (never reimplements); the parseArgs and import-safe entry-guard shape to mirror |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 13-35, 53-58, 252-261, 380-384, 608-622 | The login config schema the runner reads (`baseUrl`, `roles`), the session and token artifact paths and shapes, the lazy Playwright resolution, the browser route guard and the single secret-write helper to mirror |
| P0 | `plugins/relay/commands/relay-qa-report.md` | 89-124, 206-208 | The seven-field per-case schema the parser must read, in table form or per-entry sections |
| P0 | `PRPs/reports/relay-qa-report-command/qa-report.md` | 32-48, 160-174 | The only real sample of the report layout (per-entry sections, numbered field labels, nested numbered steps, the uncovered variant with inline step prose) the parser is tested against |
| P0 | `plugins/relay/resources/redaction-policy.md` | 14-89, 135-166 | The Layer 1 env-name patterns, the value-regex table and the credential-store subsection the runner applies in code, plus Layer 2 and the replacement markers |
| P0 | `plugins/relay/commands/relay-auth-scripts.md` | 1-30, 106-127, 195-223 | The closest standalone command shape: frontmatter without `name:`, `See:` bullets, the guard-precondition HALT blockquote, the constraints and what-you-do-not-do sections |
| P0 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 28-65, 101-118 | The `GUARD_SITES` registry shape the runner's sites are appended to |
| P0 | `scripts/validate/index.mjs` | 44-45, 81-83 | The exact import and `CHECKS` registration forms the new check follows |
| P0 | `plugins/relay/scripts/usage-metrics.mjs` | 15-25 | Script CLI shape: JSDoc Usage header, mandatory mode, `--help`, exit 2 on an unknown argument |
| P0 | `docs/decisions.md` | 2370-2381, 2439-2461 | The environment-handle wording (no path or format registered) and the runner's registered items 1-5 |
| P0 | `scripts/validate/checks/auth-model-pair.test.mjs` | 535-560 | The inert-command pin the new command text must satisfy: no `relay-auth-setup` substring in any other command file |
| P0 | `scripts/validate/checks/figma-track-phase4.test.mjs` | 238-264 | The case-insensitive ban on the design-spec token in every non-allowlisted command file, binding on the new command |
| P0 | `scripts/validate/checks/figma-visual-first-track-phase7.test.mjs` | 564-581, 607-613, 641-663 | The three count pins (read-only context): the Implementer must not reword the pinned `/relay-visual-approve` sentence in `docs/api-reference.md`; the literal updates are test-pair work |
| P1 | `documentation/AGENTS.md` | 239-241, 265, 393 | Binding contract for every `documentation/` edit: three-file registration rule, changelog format (read in full before Task 10) |
| P1 | `documentation/changelog.html` | 31-45 | The existing Unreleased `Added` list the new entry joins |
| P1 | `documentation/reference/commands.html` | 24, 309, 326-339 | The page subtitle count and the `.kv` block shape for a command in the test-auth kit section |
| P1 | `documentation/reference/scripts.html` | 190-207 | The script section shape and the insertion point before `extension-pattern` |
| P1 | `docs/api-reference.md` | 17, 23-36, 118-128, 206-216 | The two `21 commands` occurrences, the pinned sentence between them, the test-auth kit table and the shared-scripts table |
| P1 | `scripts/validate/checks/auth-secrecy.mjs` | 11-34 | Shape of a pure-checker-plus-thin-runner validation module |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/usage-metrics.mjs:15-25
 * Usage:
 *   node <plugin-root>/scripts/usage-metrics.mjs materialize [--root <dir>] [--out <dir>] [--project <id>]
 *   node <plugin-root>/scripts/usage-metrics.mjs --dry-run   [--root <dir>] [--out <dir>] [--project <id>]
 *   node <plugin-root>/scripts/usage-metrics.mjs query       [--root <dir>] [--out <dir>]
 *   node <plugin-root>/scripts/usage-metrics.mjs --help
 *
 * The mode is mandatory. Unknown arguments, flags missing a value, or no mode
 * exit 2 without writing (see USAGE / parseArgs).
 *
 * No npm dependencies. Node >=18, ESM, synchronous node: builtins only.
 */
```
Copied by Task 1 (JSDoc Usage header, mandatory mode, `--help`, exit 2 on bad arguments). The "No npm dependencies" sentence becomes "No npm dependencies of its own; `playwright` is resolved lazily at run time", because the drivers need it.

```
# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:162-186
function parseArgs(argv) {
  let help = false;
  /** @type {string | null} */ let mode = null;
  let root = process.cwd();
  /** @type {string | null} */ let url = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help') {
      help = true;
    } else if (a === '--root' || a === '--url') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      i++;
      if (a === '--root') root = resolve(v);
      else url = v;
    } else if (!a.startsWith('--') && mode === null && ['check', 'list-declared'].includes(a)) {
      mode = a;
    } else {
      return null;
    }
  }
  if (!help && mode === null) return null;
  if (!help && mode === 'check' && url === null) return null;
  return { help, mode, root, url };
}
```
Copied by Tasks 1 and 3 (hand-rolled parseArgs returning `null` on any unknown token, a flag whose value starts with `--` or is missing, or no mode; the caller prints USAGE to stderr and returns 2).

```
# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:216-218
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
```
Copied by Task 1 (import-safe entry guard: the module exports its functions for the test pair and only runs `main` when executed directly).

```
# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:125-137
/**
 * @param {string} input
 * @param {{ root?: string, lookup?: any }} [opts]
 * @returns {Promise<{ ok: true, origin: string, host: string, allowedHosts: Set<string> } | { ok: false, reason: string, host: string }>}
 */
export async function checkTarget(input, opts = {}) {
  const root = opts.root ?? process.cwd();
  /** @type {URL} */ let url;
  try {
    url = new URL(String(input));
  } catch {
    return { ok: false, reason: 'unparseable', host: '' };
  }
```
Copied by Tasks 3 and 4 (the runner dynamically imports this module by file URL from `<plugin-root>/scripts/`, calls `checkTarget(baseUrl, { root })` before any request, login or write, and keeps the returned `allowedHosts` Set for every later `isAllowedHost` test; a missing or unimportable guard module fails closed).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:252-261
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
Copied by Task 4 (lazy Playwright resolution, project root first, then the plugin's `scripts/visual/`; never a static top-level import, so a missing Playwright degrades cases to `blocked` instead of crashing the runner).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:380-384
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return guard.isAllowedHost(u.hostname, allowedHosts) ? route.continue() : route.abort();
    });
```
Copied by Task 4 (the browser driver's route handler: every request URL is tested with the guard's `isAllowedHost`; anything non-local is aborted).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:608-622
// WRITE-SITE
/**
 * The only place a secret file is written: tmp-then-rename, mode 0o600,
 * parent directory created first.
 */
function writeSecret(root, rel, content) {
  const dest = join(root, rel);
  mkdirSync(join(dest, '..'), { recursive: true });
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, content, { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, dest);
}
```
Copied by Tasks 2 and 3 (one marked write helper is the only place the runner writes; it refuses any destination outside the run directory, writes tmp-then-rename and is where redaction is enforced for text; the runner's helper does not need `mode: 0o600` because evidence is redacted before the call).

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:113-123
For each URL, run, from a fenced bash block, exactly this line:

node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" check --root "<target_root>" --url "<base-url>"

On any non-zero exit, HALT:

> FAILED_NON_LOCAL_TARGET: the guard refused `<base-url>`. Guard stderr:
> `<stderr>`. The guard is a hard failure, never a warning. Nothing has been
> written and nothing has been requested.
```
Copied by Task 6 (the `> FAILED_NON_LOCAL_TARGET:` blockquote HALT shape; the new command's guard runs inside `qa-run.mjs init`, whose stderr the HALT relays, and the command names the guard script in its `See:` list).

```
# SOURCE: scripts/validate/checks/auth-local-guard-sites.mjs:45-49
  {
    file: 'plugins/relay/commands/relay-auth-scripts.md',
    required: ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET'],
    forbidden: [],
  },
```
Copied by Task 7 (the `GUARD_SITES` entry shape the runner's two sites are appended in; the registry header already says "A later phase appends its own site to GUARD_SITES").

```
# SOURCE: scripts/validate/checks/auth-secrecy.mjs:30-34
export function checkAuthSecrecy({ ignoreText, scriptText, policyText }) {
  /** @type {Finding[]} */
  const findings = [];
  /** @param {string} message @param {string} file */
  const add = (message, file) => findings.push({ message, file, line: 1 });
```
Copied by Task 8 (pure checker over file texts plus a thin zero-arg `run*Check()` that reads files with a `readOrNull` helper, returning `{ name, ok, findings }`).

```
# SOURCE: scripts/validate/index.mjs:44-45
import { runAuthSecrecyCheck } from './checks/auth-secrecy.mjs';
import { runAuthLocalGuardSitesCheck } from './checks/auth-local-guard-sites.mjs';
```
Copied by Task 8 (the exact import form `validate-registry.test.mjs` enforces; the new import is added immediately after line 45 and `runQaRunContractCheck,` is appended after `runAuthLocalGuardSitesCheck,` at line 82).

```
# SOURCE: PRPs/reports/relay-qa-report-command/qa-report.md:34-48
### Case 1 — AC-1: PRD-mode generation

1. **Title:** PRD-mode generation writes the report keyed on the PRD basename
2. **Risk level:** Critical
3. **Required state:** none (no DB entities — markdown/prompt-only feature)
4. **Coverage:** manual
5. **Automated test path:** N/A (no automated tests; test_frameworks: [])
6. **Manual status:** pending
7. **Manual step-by-step:**
   1. From the repo root, invoke `/relay-qa-report PRPs/prds/<feature>.prd.md` for a PRD that has an
      `## Acceptance Criteria` section (this run used `PRPs/prds/relay-qa-report-command.prd.md`).
   2. Confirm `<feature>` is derived as the PRD basename with the `.prd.md` suffix stripped, and that
      the report is written to `PRPs/reports/<feature>/qa-report.md`.
```
Copied by Task 1 (the per-entry-section layout the parser reads: a `###` heading per case under `## Test Cases`, numbered bold field labels, continuation lines indented, the step-by-step nested list kept verbatim; the table form is parsed too, but only the section form has a real sample).

```
# SOURCE: documentation/changelog.html:35-41
      <ul>
        <li><strong><code>/relay-auth-setup</code> &mdash; the auth model pair</strong> &mdash; a standalone command that
          adopts <code>auth-model-writer</code> and then <code>auth-model-reviewer</code> inline, and produces a
          human-approved <code>PRPs/auth/auth-model.md</code> (mechanisms, login flow, role and permission matrix, local
          user creation, non-automatable items) shaped by the new <code>auth-model-template.md</code> resource. A hard
          local-only guard and the secrecy ignore proof run before anything is written. No login script and no credential
          file is written in this phase.</li>
```
Copied by Task 10 (a further `<li>` joins this `Added` list, same markup: `<strong>` title, `&mdash;` separators, `<code>` for identifiers).

```
# SOURCE: documentation/reference/commands.html:326-337
      <h3 id="relay-auth-scripts"><code>/relay-auth-scripts [--role &lt;role&gt;]...</code> <span class="badge badge--done">implemented</span></h3>

      <div class="kv">
        <dt>Input</dt>
        <dd>An <code>APPROVED</code> <code>PRPs/auth/auth-model.md</code>; optional repeatable <code>--role</code>. Non-interactive &mdash; never asks the user a question.</dd>
        <dt>Output</dt>
        <dd><code>PRPs/auth/login.config.json</code>, one login script per role copied from <code>auth-login.template.mjs</code>, and a placeholder-only <code>PRPs/auth/credentials.example.json</code>.</dd>
        <dt>Mode</dt>
        <dd>Deterministic generator with no writer/reviewer pair. Calls the guard and secrecy scripts rather than reimplementing them; the template is copied, never rewritten.</dd>
        <dt>Notes</dt>
        <dd>Writes no credential value and creates no session; the operator runs each generated script at their own terminal.</dd>
      </div>
```
Copied by Task 10 (a `relay-qa-run` `<h3>` and `.kv` block join this section, before the `pillar3` heading).

```
# SOURCE: documentation/reference/scripts.html:190-198
      <h2 id="auth-local-guard">auth-local-guard.mjs <span class="badge badge--done">shipped</span></h2>

      <div class="kv">
        <dt>Path</dt><dd><code>plugins/relay/scripts/auth-local-guard.mjs</code></dd>
        <dt>Purpose</dt><dd>The local-only guard of the test-auth kit: ...</dd>
        <dt>Invoked by</dt><dd><code>/relay-auth-setup</code> and <code>/relay-auth-scripts</code>; the generated per-role login scripts call it too. Also invocable directly.</dd>
        <dt>Runtime</dt><dd>Node.js ≥ 18.</dd>
        <dt>Dependencies</dt><dd>None. <code>node:</code> built-ins only.</dd>
      </div>
```
Copied by Task 10 (a `qa-run.mjs` `<h2 id="qa-run">` block with the same `.kv` shape is inserted before `extension-pattern`; the Dependencies row states that `playwright` is resolved lazily).

```
# SOURCE: docs/api-reference.md:215
| `auth-local-guard.mjs` ✅ | `/relay-auth-setup`, `/relay-auth-scripts` | `check --url <url>` decides whether a target is a local application, ...  Call sites enforced by the `auth-local-guard-sites` check. |
```
Copied by Task 9 (the `| Script | Invoked by | Purpose |` row shape for the new `qa-run.mjs` row; the test-auth-kit command table at lines 125-128 supplies the `| Command | Input | Output |` row shape for `/relay-qa-run`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | CREATE | The runner: `parse`, `init` and `run` modes, report parser, in-code redaction, guard, session and seed handling, HTTP and browser drivers, evidence, `results.json`, human-gate statement |
| `plugins/relay/commands/relay-qa-run.md` | CREATE | Standalone, non-interactive command: translates prose steps into the closed `plan.json` vocabulary and calls the script |
| `scripts/validate/checks/auth-local-guard-sites.mjs` | UPDATE | Append the runner script's and the command's guard sites to `GUARD_SITES` (the phase-3 plan anticipated exactly this) |
| `scripts/validate/checks/qa-run-contract.mjs` | CREATE | The PRD's Should-item: pins the closed outcome vocabulary, the single write helper, the guard marker, the human-gate statement and any tracked `results.json` |
| `scripts/validate/index.mjs` | UPDATE | Import and register the new check |
| `docs/api-reference.md` | UPDATE | Command count 21 to 22 (two occurrences), the standalone-commands paragraph, a `/relay-qa-run` row and a `qa-run.mjs` shared-scripts row |
| `documentation/reference/commands.html` | UPDATE | Subtitle "Twenty-two commands" and a `relay-qa-run` section |
| `documentation/reference/scripts.html` | UPDATE | A `qa-run.mjs` section |
| `documentation/reference/validation-checks.html` | UPDATE | Summary row, totals count and a `qa-run-contract` section |
| `documentation/guide/validation-suite.html` | UPDATE | A row for the new check |
| `documentation/assets/data/search-index.json` | UPDATE | `Commands` excerpt prefix "Twenty-two commands" and a `/relay-qa-run` sentence; `registration-parity` requires the command in the index |
| `documentation/changelog.html` | UPDATE | `registration-parity` requires it; `documentation/AGENTS.md` requires an entry for every `documentation/` change |

## NOT Building (Scope Limits)

- The CLI driver and the read-only DB verification driver (PRD Should-items; Open Question 3 is resolved by the Phase 5 dogfood). A case that needs either returns `needs-human` with its steps verbatim.
- A markdown sibling to `results.json` (PRD Could-item; Open Question 1). The terminal summary plus the JSON is what this phase ships; revisit after the dogfood.
- Re-running only the cases that did not pass (PRD Could-item).
- Any edit to `qa-report.md`, its Manual status field or its seven-field schema, and any status-preserving update mode for `/relay-qa-report` (Open Question 2) — forbidden by the PRD.
- Any discovery of, or fixed path or format for, the runnable-environment handle. The handle is consumed only from an explicit `--env-handle <path>` (one `baseUrl` key); no search, no default path, no approximation of any of the six registered strategies.
- Any non-local target of any kind, and pinning DNS for HTTP requests (residual risk recorded under Risks).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` (PRD AC-16), `plugins/relay/scripts/visual/capture.mjs`, `auth-local-guard.mjs`, `auth-login.template.mjs`, `auth-kit-secrecy.mjs`, `relay-auth-scripts.md`, `relay-auth-setup.md` or `relay-execute.md`. The two auth commands carry pinned negative assertions about the runner and about each other and must stay byte-identical.
- Any test file — the test pair owns them (R-X strict). No task and no Files-to-Change row targets one; the pin updates are routed through the test pair (see Notes).
- A new agent, a writer/reviewer pair or any extension of the interactivity boundary — `/relay-qa-run` asks the user nothing.
- Invocation from `/relay-execute`, and any change to a phase status or Manual status as a result of a run.
- `docs/context/architecture.md` command counts, `CLAUDE.md` check counts, `docs/decisions.md` entries, a `settings-allowlist.md` entry and a plugin version bump — docs-sync and the release step own those.
- A real authenticated `capture.mjs` render (PRD AC-10) and an exercised headed/form browser login (PRD AC-12). They stay unproven and belong to the Phase 5 dogfood; nothing in this plan claims them.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/scripts/qa-run.mjs (CLI skeleton and the report parser)

**ACTION**: Delivers AC-A1 and AC-A2 (parser side: the case list is derived by code, never by the LLM, and each case carries its steps verbatim). Create the module with `// @ts-check`, a JSDoc header with a `Usage:` section (`node <plugin-root>/scripts/qa-run.mjs parse --report <path>`, `... init --root <dir> --feature <slug> [--env-handle <path>]`, `... run --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]`, `... --help`), the sentence "The mode is mandatory. Unknown arguments, flags missing a value, or no mode exit 2 without writing", exit codes (0 completed, 1 a named `FAILED_*` halt or an aborted run, 2 bad arguments), and "No npm dependencies of its own; `playwright` is resolved lazily at run time. Node >=18, ESM." Export `OUTCOMES` on one line exactly as `export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];` (the validation check pins this literal). Implement a hand-rolled `parseArgs` that returns `null` on any unknown token, a flag whose value starts with `--` or is missing, no mode, `parse` without `--report`, `init`/`run` without `--feature`, `run` without `--run-dir`, a `--max-cases` that is not a positive integer, or a `--feature` not matching `^[a-z0-9][a-z0-9-]*$`; the caller prints USAGE to stderr and returns 2. Keep the import-safe entry guard. Export `parseReport(text)` returning `{ cases }`, each case `{ index, heading, title, risk, required_state, coverage, automated_test_path, manual_status, manual_steps_verbatim }` (`index` 1-based in document order). Parsing rules, in order: normalize CRLF to LF; if a `## Test Cases` heading exists, the cases are the `###`/`####` headings between it and the next `##` heading, EVERY such heading counting as a case even when a field is missing (the title falls back to the heading text, absent fields are `null`, so a malformed entry is counted and never silently dropped); otherwise the cases are the `###`/`####` blocks that contain a `**Title:**` label. Fields are read from lines matching `^\s*(?:\d+\.\s*)?\*\*(Title|Risk level|Required state|Coverage|Automated test path|Manual status|Manual step-by-step):\*\*\s*(.*)$`; a value continues over following lines until the next field label or heading; `manual_steps_verbatim` is the inline remainder of the step-by-step label line (when non-empty) followed by the raw following lines exactly as written (indentation and inline code preserved), trailing blank lines trimmed, never re-wrapped or re-numbered. The table form is also read: a header row containing `Title` and a `Manual step` column, a separator row, then one case per `|` row, cells split on unescaped `|`, `<br>` inside the steps cell preserved verbatim. When neither form yields a single case, `parse` prints `FAILED_REPORT_UNPARSEABLE: no cases found in <path>` to stderr and exits 1. `parse` prints one JSON document `{ "report_path": ..., "cases": [...] }` to stdout and writes nothing. Every path the script prints is repo-relative with forward slashes.
**MIRROR**: `# SOURCE: plugins/relay/scripts/usage-metrics.mjs:15-25`, `# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:162-186`, `# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:216-218`, `# SOURCE: PRPs/reports/relay-qa-report-command/qa-report.md:34-48`.
**VALIDATE**:
```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path");
const S=path.resolve("plugins/relay/scripts/qa-run.mjs");
const run=(a)=>cp.spawnSync(process.execPath,[S,...a],{encoding:"utf8"});
const bad=[];const need=(c,m)=>{if(!c)bad.push(m)};
const src=fs.readFileSync(S,"utf8");
need(src.includes("export const OUTCOMES = [\x27pass\x27, \x27fail\x27, \x27blocked\x27, \x27needs-human\x27];"),"OUTCOMES literal missing or reworded");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"qa-parse-"));
const sec=["# QA Report","","## Test Cases","","### Case 1 - AC-1: a","","1. **Title:** First case","2. **Risk level:** High","3. **Required state:** none","4. **Coverage:** manual","5. **Automated test path:** unverified","6. **Manual status:** pending","7. **Manual step-by-step:**","   1. Open the page.","   2. Confirm the heading.","","### Case 2 - AC-2: b","","1. **Title:** Second case","2. **Risk level:** Low","3. **Required state:** User with role=admin","4. **Coverage:** none","5. **Automated test path:** N/A","6. **Manual status:** N/A - intentionally uncovered","7. **Manual step-by-step:** None scheduled.","","### Case 3 - heading only","","## Summary","","done",""].join("\n");
const tbl=["# QA Report","","| Title | Risk level | Required state | Coverage | Automated test path | Manual status | Manual step-by-step |","|---|---|---|---|---|---|---|","| T one | High | none | manual | unverified | pending | 1. Open /a<br>2. See b |","| T two | Low | User with role=admin | none | N/A | N/A | None scheduled |",""].join("\n");
const f1=path.join(tmp,"sec.md"),f2=path.join(tmp,"tbl.md"),f3=path.join(tmp,"empty.md");
fs.writeFileSync(f1,sec);fs.writeFileSync(f2,tbl);fs.writeFileSync(f3,"# nothing here\n");
const before=fs.readdirSync(tmp).sort().join();
let r=run(["parse","--report",f1]);need(r.status===0,"parse section form must exit 0, got "+r.status);
let j={cases:[]};try{j=JSON.parse(r.stdout)}catch{bad.push("parse stdout is not JSON")}
need(j.cases.length===3,"section form: expected 3 cases (heading-only counts), got "+j.cases.length);
need(j.cases[0]&&j.cases[0].title==="First case"&&j.cases[0].risk==="High"&&j.cases[0].required_state==="none","case 1 fields wrong");
need(j.cases[0]&&j.cases[0].manual_steps_verbatim.includes("   1. Open the page.")&&j.cases[0].manual_steps_verbatim.includes("   2. Confirm the heading."),"case 1 steps are not verbatim");
need(j.cases[1]&&j.cases[1].manual_steps_verbatim.trim()==="None scheduled.","case 2 inline steps wrong");
need(j.cases[2]&&j.cases[2].title.includes("heading only"),"a heading-only case must be counted with the heading as title");
need(j.cases.map((c)=>c.index).join()==="1,2,3","indexes must be 1-based document order");
r=run(["parse","--report",f2]);j={cases:[]};try{j=JSON.parse(r.stdout)}catch{bad.push("table parse stdout is not JSON")}
need(j.cases.length===2&&j.cases[0].manual_steps_verbatim.includes("<br>"),"table form: 2 cases with <br> kept verbatim");
r=run(["parse","--report",f3]);need(r.status===1&&String(r.stderr).includes("FAILED_REPORT_UNPARSEABLE"),"an empty report must exit 1 by name, got "+r.status);
const real="PRPs/reports/relay-qa-report-command/qa-report.md";
const heads=(fs.readFileSync(real,"utf8").split(/\r?\n/).filter((l)=>/^###\s+Case\s+\d+/.test(l))).length;
r=run(["parse","--report",real]);j={cases:[]};try{j=JSON.parse(r.stdout)}catch{bad.push("real report parse stdout is not JSON")}
need(heads>0&&j.cases.length===heads,"real report: parser found "+j.cases.length+" cases, the file has "+heads+" Case headings");
for(const [a,c] of [[[],2],[["parse"],2],[["parse","--bogus"],2],[["bogus"],2],[["init","--root",tmp],2],[["run","--root",tmp,"--feature","f"],2],[["run","--root",tmp,"--feature","f","--run-dir","x","--max-cases","0"],2],[["init","--root",tmp,"--feature","Bad Slug"],2],[["--help"],0]]){const x=run(a);need(x.status===c,"args "+JSON.stringify(a)+" expected exit "+c+", got "+x.status)}
need(fs.readdirSync(tmp).sort().join()===before,"parse wrote a file");
fs.rmSync(tmp,{recursive:true,force:true});
if(bad.length){console.error("FAIL: "+bad.join(" | "));process.exit(1)}
console.log("PASS: qa-run CLI and report parser contract");
'
```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs (in-code redaction)

**ACTION**: Delivers AC-A8 and AC-A10 (redaction half: a function that makes a leak structurally hard, tested before any driver exists). Add and export the redaction layer that applies `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` in code — cite the policy only by that full prefix, never by bare basename. Exports: `buildRedactionTable({ root, env, secretValues })` returning an object holding (a) the set of redacted VALUES: every `process.env`-style value whose variable name matches the Layer 1 wildcards (`*KEY*`, `*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*PASSWD*`, `*CREDENTIAL*`, `*PRIVATE*`, `*SIGNING*`, `*AUTH*`, case-insensitive) or the exact names (`DATABASE_URL`, `DB_URL`, `REDIS_URL`, `MONGODB_URI`, `KAFKA_BROKERS`, `AMQP_URL`, `GOOGLE_APPLICATION_CREDENTIALS`), plus every entry of `secretValues` (the runner passes the cookie values, localStorage values and token values it reads from session artifacts — held in memory only, never printed); values shorter than 4 characters are ignored so the table cannot mangle ordinary text; URL-valued exact names are replaced with `[REDACTED_URL]`, everything else with `[REDACTED]`; (b) the Layer 1 value-regex set copied exactly from the policy table (AWS access key, Stripe live and test, GitHub classic and fine-grained PAT, JWT `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`, PEM private key header, OpenAI, Anthropic, Google API key, Google OAuth2 access token and client secret); (c) Layer 2 from `<root>/PRPs/redaction-extensions.txt` when present (a bare line is an env-var name exact-or-glob, a `regex:<pattern>` line is a value regex, `#` comments and blank lines skipped; an invalid regex is skipped, never fatal). Also export `redactText(text, table)` (longest-value-first replacement of table values, then the regex set; returns the redacted string), `redactJson(value, table)` (a structural walk that replaces every `value` of an object inside a `cookies` array, every value inside an `origins[].localStorage` array, every property named `password`, `passwd`, `token`, `access_token`, `refresh_token`, `secret`, `api_key` or `authorization` (case-insensitive), and every value of a property named `cookie` or `set-cookie`, with `[REDACTED]`, then applies `redactText` to every remaining string) and `containsSecret(text, table)` (true when `redactText` would change the text). Redaction is applied to the in-memory value BEFORE any write; never redact an already-serialized file after the fact. No function in this layer logs or returns the table's values.
**MIRROR**: `# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:162-186` (export-for-the-test-pair style: pure functions exported, the entry guard keeps `main` import-safe).
**VALIDATE**:
```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --input-type=module -e '
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const bad = [];
const need = (c, msg) => { if (!c) bad.push(msg); };
for (const f of ["buildRedactionTable", "redactText", "redactJson", "containsSecret"]) need(typeof m[f] === "function", "missing export " + f);
if (bad.length) { console.error("FAIL: " + bad.join(" | ")); process.exit(1); }
const root = fs.mkdtempSync(path.join(os.tmpdir(), "qa-redact-"));
fs.mkdirSync(path.join(root, "PRPs"), { recursive: true });
fs.writeFileSync(path.join(root, "PRPs", "redaction-extensions.txt"), "# ext\nCORP_ID\nregex:corp-[0-9]{4}\nregex:([unclosed\n");
const jwt = ["eyJhbGciOi", "eyJzdWIiOiIxIn0", "c2lnbmF0dXJl"].join(".");
const env = { MY_SECRET_TOKEN: "s3cr3t-value-xyz", DATABASE_URL: "postgres://u:p@h:5432/d", CORP_ID: "acme-77", HARMLESS: "plain-visible-text", SHORT_KEY: "ab" };
const table = m.buildRedactionTable({ root, env, secretValues: ["cookie-val-123"] });
const t1 = m.redactText("a " + jwt + " b s3cr3t-value-xyz c postgres://u:p@h:5432/d d acme-77 e corp-4242 f cookie-val-123 g plain-visible-text ab", table);
for (const leaked of [jwt, "s3cr3t-value-xyz", "postgres://u:p@h:5432/d", "acme-77", "corp-4242", "cookie-val-123"]) need(!t1.includes(leaked), "leaked: " + leaked);
need(t1.includes("[REDACTED_URL]"), "a URL-valued exact name must become [REDACTED_URL]");
need(t1.includes("[REDACTED]"), "no [REDACTED] marker present");
need(t1.includes("plain-visible-text") && t1.includes(" ab"), "ordinary text and sub-4-character values must survive");
const state = { cookies: [{ name: "sid", value: "abc123", domain: "127.0.0.1", path: "/" }], origins: [{ origin: "http://127.0.0.1", localStorage: [{ name: "k", value: "ls-secret-9" }] }] };
const j = JSON.stringify(m.redactJson({ state, password: "pw-1", Token: "tk-1", headers: { "Set-Cookie": "sid=abc123", Authorization: "Bearer zzz", "content-type": "application/json" }, note: "visible " + jwt, items: ["widget"] }, table));
for (const leaked of ["abc123", "ls-secret-9", "pw-1", "tk-1", "Bearer zzz", jwt]) need(!j.includes(leaked), "redactJson leaked: " + leaked);
need(j.includes("widget") && j.includes("application/json") && j.includes("sid"), "redactJson must keep non-secret structure (names, content-type, items)");
need(m.containsSecret("x " + jwt, table) === true && m.containsSecret("nothing to see", table) === false, "containsSecret polarity wrong");
fs.rmSync(root, { recursive: true, force: true });
if (bad.length) { console.error("FAIL: " + bad.join(" | ")); process.exit(1); }
console.log("PASS: in-code redaction layer");
'
```

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs (`init` and `run` core: guard, plan, outcomes, results, abort, human gate)

**ACTION**: Delivers AC-A1, AC-A3, AC-A4, AC-A5, AC-A6 and AC-A9 (core). Add `init` and `run` with NO active driver yet: a `const DRIVERS = Object.create(null);` table that Task 4 populates; a plan entry whose driver has no table entry is `needs-human` (`NO_ACTIVE_DRIVER`). **Target resolution** (shared by both modes): with `--env-handle <path>` the file must be a JSON object and the single key `baseUrl` is read from it (no other key, no search, no default path — the handle has no registered path or format, see Notes); without the flag, `<root>/PRPs/auth/login.config.json` `baseUrl` is read; with neither, the target is undeclared (not an error at this point). **`// GUARD-SITE`** (marker comment appearing exactly once in the file): when a target is declared, dynamically import `<pluginRoot>/scripts/auth-local-guard.mjs` (`pluginRoot` is derived from `import.meta.url`, two directories up; a missing or unimportable module halts `FAILED_GUARD_UNAVAILABLE`, exit 1, fail closed) and `await checkTarget(baseUrl, { root })`; a refusal prints `FAILED_NON_LOCAL_TARGET: <reason> (host: <host>)` to stderr and exits 1 having made no request, no login and no write — in `init` BEFORE the run directory is created, in `run` before any case is read. Keep the returned `{ origin, allowedHosts }`. **`init`**: verify `<root>/PRPs/reports/<feature>/qa-report.md` exists, else `FAILED_QA_REPORT_MISSING` (exit 1, no write); after the guard, create `PRPs/reports/<feature>/qa-run/<run-id>/evidence/` where `<run-id>` is the script's own clock as `YYYYMMDDTHHMMSSmmmZ` (a pre-existing directory is `FAILED_RUN_DIR_EXISTS`, never reused, never overwritten); print `RUN_ID: <id>`, `RUN_DIR: PRPs/reports/<feature>/qa-run/<id>` and `BASE_URL_ORIGIN: <origin or none>`. **`run`**: `--run-dir` must resolve (after `path.resolve`) strictly inside `<root>/PRPs/reports/<feature>/qa-run/` and already exist, else exit 2; read `plan.json` from the run directory when present (`{ "schema_version": 1, "cases": [ { "index", "title", "driver": "http" | "browser" | any other string, "role": slug | null, "state": "none" | "role-only" | "declared", "steps": [ ... ] } ] }`; an unreadable or invalid `plan.json` leaves every case without a plan entry, never a crash); call `parseReport`; compute the SHA-256 of `qa-report.md` before the first case. For each case in order, an entry `{ index, title, risk, outcome, reason_code, reason, driver, role, started_at, finished_at, duration_ms, evidence: [], manual_steps_verbatim }`: (1) no plan entry for the case index, or an entry whose `title` differs from the report's title → `needs-human`, `NO_PLAN_ENTRY` (a title mismatch is `PLAN_ENTRY_INVALID`); (2) a plan entry with an `http` or `browser` driver whose `steps` is empty or not an array → `needs-human`, `PLAN_ENTRY_INVALID`; (3) any other driver string → `needs-human`, `NO_ACTIVE_DRIVER`; (4) `http`/`browser` entry with no declared target → `blocked`, `TARGET_UNDECLARED`, the reason naming `PRPs/auth/login.config.json` `baseUrl` and the `--env-handle` flag as the missing declarations; (5) a driver found in `DRIVERS` is awaited (Task 4); a driver absent from the table is case (3). `manual_steps_verbatim` is reproduced, redacted, for every `needs-human` and `blocked` entry and is never altered. **Closed vocabulary**: the entry's `outcome` is always a member of `OUTCOMES`; any internal path that would produce another value is a bug and is coerced to `blocked` with `RUNNER_ERROR`. **Abort and the count invariant**: `--max-cases <n>` executes at most `n` cases; every later case is recorded `blocked` with `reason_code: "RUN_ABORTED"` and a reason stating the cap; an unexpected exception inside a case makes that case `blocked` (`RUNNER_ERROR`, message redacted) and the loop continues; SIGINT/SIGTERM sets an abort flag that stops the loop the same way; `results.json` is written in a `finally` block and `entries.length === cases.length` is asserted before the write (a violation is a `FAILED_ENTRY_COUNT` exit 1 that still writes what exists). **Time**: every `started_at`/`finished_at` is `new Date().toISOString()` observed by the script's own clock at the moment it happens (a value ending in `T00:00:00Z` or `T00:00:00.000Z` is re-observed once, never fabricated); `duration_ms` is the difference of two observed instants. **`results.json`** (written tmp-then-rename through the single **`// WRITE-SITE`** helper, which is the ONLY function in the file that calls `writeFileSync(` or `renameSync(`, refuses any destination not inside the run directory, and applies `redactText` to text before writing): `{ schema_version: 1, feature, run_id, report_path, report_sha256_before, report_sha256_after, started_at, finished_at, duration_ms, base_url_origin, counts: { pass, fail, blocked, 'needs-human' }, aborted: null | { reason_code, reason }, human_gate: { status: 'open', review_file: 'PRPs/reports/<feature>/qa-report.md' }, cases: [...] }`. **Terminal summary** (stdout, statuses and repo-relative paths only): the four counts, the results path, and exactly the sentences `HUMAN GATE STILL OPEN: a runner pass is evidence, not approval. No Manual status was changed and no phase status advanced.` and `Review file: PRPs/reports/<feature>/qa-report.md`. Exit 0 when `results.json` holds every case and the run was not aborted; exit 1 for an aborted run (results still written) or a named halt. The script never writes `qa-report.md`, never runs git and never writes outside the run directory.
**MIRROR**: `# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:125-137`, `# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:162-186`, `# SOURCE: plugins/relay/resources/auth-login.template.mjs:608-622`, `# SOURCE: PRPs/reports/relay-qa-report-command/qa-report.md:34-48`.
**VALIDATE**:
```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path"),crypto=require("crypto");
const S=path.resolve("plugins/relay/scripts/qa-run.mjs");
const run=(a)=>cp.spawnSync(process.execPath,[S,...a],{encoding:"utf8"});
const bad=[];const need=(c,m)=>{if(!c)bad.push(m)};
const src=fs.readFileSync(S,"utf8");
for(const t of ["// GUARD-SITE","// WRITE-SITE","auth-local-guard.mjs","checkTarget","FAILED_NON_LOCAL_TARGET","HUMAN GATE STILL OPEN","toISOString","DRIVERS"])need(src.includes(t),"script lacks "+t);
for(const m of ["// GUARD-SITE","// WRITE-SITE"])need(src.split(m).length===2,m+" must appear exactly once");
need(src.split("writeFileSync(").length===2,"exactly one writeFileSync( call allowed (inside the write helper), found "+(src.split("writeFileSync(").length-1));
need(src.split("renameSync(").length===2,"exactly one renameSync( call allowed, found "+(src.split("renameSync(").length-1));
const report=["# QA Report","","## Test Cases",
...[["Alpha","Open alpha."],["Beta","Open the beta page."],["Gamma","Run the gamma CLI."],["Delta","Open delta."]].flatMap(([t,s],i)=>["","### Case "+(i+1)+" - AC-"+(i+1),"","1. **Title:** "+t,"2. **Risk level:** Low","3. **Required state:** none","4. **Coverage:** manual","5. **Automated test path:** unverified","6. **Manual status:** pending","7. **Manual step-by-step:**","   1. "+s]),"","## Summary","","done",""].join("\n");
const mk=(baseUrl)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),"qa-core-"));fs.mkdirSync(path.join(root,"PRPs","reports","feat"),{recursive:true});fs.writeFileSync(path.join(root,"PRPs","reports","feat","qa-report.md"),report);if(baseUrl){fs.mkdirSync(path.join(root,"PRPs","auth"),{recursive:true});fs.writeFileSync(path.join(root,"PRPs","auth","login.config.json"),JSON.stringify({baseUrl,roles:{}}))}return root};
const listing=(root)=>{const out=[];const w=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?w(p):out.push(path.relative(root,p).split(path.sep).join("/"))}};w(root);return out.sort()};
const sha=(p)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const entry=(i,t,d)=>({index:i,title:t,driver:d,role:null,state:"none",steps:[{action:"request",method:"GET",path:"/x",expect_status:200}]});
const plan={schema_version:1,cases:[entry(1,"Alpha","http"),entry(3,"Gamma","cli"),entry(4,"Delta","http")]};
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const initRun=(root)=>{const r=run(["init","--root",root,"--feature","feat"]);const m=/RUN_DIR: (\S+)/.exec(String(r.stdout));return{r,dir:m&&m[1]}};
{ // A: no target declared; no driver yet
 const root=mk(null);const rp=path.join(root,"PRPs","reports","feat","qa-report.md");const h0=sha(rp);
 const {r:ri,dir}=initRun(root);need(ri.status===0&&dir,"init must succeed with no target declared: "+ri.stderr);
 if(dir){fs.writeFileSync(path.join(root,dir,"plan.json"),JSON.stringify(plan));
  const r=run(["run","--root",root,"--feature","feat","--run-dir",dir]);need(r.status===0,"run exit 0 expected, got "+r.status+" "+r.stderr);
  const j=JSON.parse(fs.readFileSync(path.join(root,dir,"results.json"),"utf8"));
  need(j.cases.length===4,"entry count must equal the case count (4), got "+j.cases.length);
  const by=Object.fromEntries(j.cases.map((c)=>[c.title,c]));
  need(by.Alpha.outcome==="blocked"&&by.Alpha.reason_code==="TARGET_UNDECLARED"&&/login\.config\.json/.test(by.Alpha.reason),"Alpha: blocked TARGET_UNDECLARED naming login.config.json");
  need(by.Beta.outcome==="needs-human"&&by.Beta.reason_code==="NO_PLAN_ENTRY"&&by.Beta.manual_steps_verbatim.includes("   1. Open the beta page."),"Beta: needs-human with verbatim steps");
  need(by.Gamma.outcome==="needs-human"&&by.Gamma.reason_code==="NO_ACTIVE_DRIVER","Gamma: needs-human NO_ACTIVE_DRIVER");
  need(by.Delta.outcome==="blocked"&&by.Delta.reason_code==="TARGET_UNDECLARED","Delta: blocked TARGET_UNDECLARED");
  need(j.cases.every((c)=>["pass","fail","blocked","needs-human"].includes(c.outcome)),"an outcome outside the closed vocabulary");
  const c=j.counts;need(c.pass+c.fail+c.blocked+c["needs-human"]===4&&c.blocked===2&&c["needs-human"]===2,"counts do not partition the cases: "+JSON.stringify(c));
  need(ISO.test(j.started_at)&&ISO.test(j.finished_at)&&j.cases.every((x)=>ISO.test(x.started_at)&&ISO.test(x.finished_at)),"a timestamp is not a real UTC instant with milliseconds");
  need(!JSON.stringify(j).includes("T00:00:00Z")&&Date.parse(j.started_at)>Date.parse("2025-01-01")&&Date.parse(j.finished_at)>=Date.parse(j.started_at),"timestamps degenerate or out of order");
  need(j.human_gate&&j.human_gate.status==="open"&&j.human_gate.review_file==="PRPs/reports/feat/qa-report.md","human_gate block wrong");
  need(String(r.stdout).includes("HUMAN GATE STILL OPEN")&&String(r.stdout).includes("PRPs/reports/feat/qa-report.md"),"summary must state the gate is open and name the review file");
  need(sha(rp)===h0&&j.report_sha256_before===h0&&j.report_sha256_after===h0,"qa-report.md changed or the recorded hashes are wrong");
  const extra=listing(root).filter((p)=>p!=="PRPs/reports/feat/qa-report.md"&&!p.startsWith(dir+"/"));need(extra.length===0,"files written outside the run directory: "+extra.join(","));
 }
 fs.rmSync(root,{recursive:true,force:true});}
{ // B: abort cap
 const root=mk(null);const {dir}=initRun(root);
 if(dir){fs.writeFileSync(path.join(root,dir,"plan.json"),JSON.stringify(plan));
  const r=run(["run","--root",root,"--feature","feat","--run-dir",dir,"--max-cases","1"]);need(r.status===1,"an aborted run must exit 1, got "+r.status);
  const j=JSON.parse(fs.readFileSync(path.join(root,dir,"results.json"),"utf8"));
  need(j.cases.length===4,"an aborted run must still hold one entry per case, got "+j.cases.length);
  need(j.cases.slice(1).every((c)=>c.outcome==="blocked"&&c.reason_code==="RUN_ABORTED"),"unreached cases must be blocked RUN_ABORTED");
  need(j.aborted&&j.aborted.reason_code==="RUN_ABORTED","aborted block missing");}
 fs.rmSync(root,{recursive:true,force:true});}
{ // C: non-local target refused before any write
 const root=mk("http://localhost.evil.example:3000");
 let r=run(["init","--root",root,"--feature","feat"]);need(r.status===1&&String(r.stderr).includes("FAILED_NON_LOCAL_TARGET"),"init must refuse a non-local target by name, got "+r.status);
 need(!fs.existsSync(path.join(root,"PRPs","reports","feat","qa-run")),"a refused init created the run directory");
 const rd=path.join(root,"PRPs","reports","feat","qa-run","manual");fs.mkdirSync(rd,{recursive:true});
 r=run(["run","--root",root,"--feature","feat","--run-dir","PRPs/reports/feat/qa-run/manual"]);need(r.status===1&&String(r.stderr).includes("FAILED_NON_LOCAL_TARGET"),"run must refuse a non-local target by name");
 need(!fs.existsSync(path.join(rd,"results.json")),"a refused run wrote results.json");
 fs.rmSync(root,{recursive:true,force:true});}
{ // D: containment and missing report
 const root=mk(null);
 let r=run(["run","--root",root,"--feature","feat","--run-dir","PRPs/reports/feat"]);need(r.status===2,"a run-dir outside qa-run must exit 2, got "+r.status);
 r=run(["run","--root",root,"--feature","feat","--run-dir","PRPs/reports/feat/qa-run/../../x"]);need(r.status===2,"a run-dir with .. must exit 2, got "+r.status);
 fs.rmSync(path.join(root,"PRPs","reports","feat","qa-report.md"));
 r=run(["init","--root",root,"--feature","feat"]);need(r.status===1&&String(r.stderr).includes("FAILED_QA_REPORT_MISSING"),"a missing report must halt by name");
 fs.rmSync(root,{recursive:true,force:true});}
if(bad.length){console.error("FAIL: "+bad.join(" | "));process.exit(1)}
console.log("PASS: init/run core, closed vocabulary, count invariant on abort, guard before write, report untouched");
'
```

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs (HTTP and browser drivers, sessions, evidence)

**ACTION**: Delivers AC-A6 (per-case instants around real driver work), AC-A8, AC-A9 and AC-A10 (driver side). Populate `DRIVERS.http` and `DRIVERS.browser`. **Playwright**: resolve lazily with a `loadPlaywright(root, pluginRoot)` identical in behaviour to the login template's (project `package.json` first, then `<pluginRoot>/scripts/visual/package.json`, else `null`); never a static top-level `import ... from 'playwright'`; a `null` result makes every http/browser case `blocked` with `FAILED_PLAYWRIGHT_UNAVAILABLE` naming `npm install` in `plugins/relay/scripts/visual/`; a browser launch failure makes the case `blocked` with `FAILED_BROWSER_UNAVAILABLE`. **Plan step vocabulary (closed)**: `http` steps are `{ action: "request", method: GET|HEAD|POST|PUT|PATCH|DELETE, path, body?, expect_status?, expect_body_contains?, expect_json?: { path, equals } }`; `browser` steps are `goto{path}`, `click{selector}`, `fill{selector,value}`, `expect_visible{selector}`, `expect_text{selector,contains}`, `expect_url{path}`. An unknown action, a missing required key or a non-string path makes the entry `needs-human` `PLAN_ENTRY_INVALID`; an entry with no expectation step at all (`expect_*` or `expect_status`) is `needs-human` `NO_EXPECTATION` — a `pass` requires at least one evaluated expectation. **Paths are same-origin only**: a step path is resolved against the guard-approved origin and, if the resolved origin differs (e.g. `//evil.example/x`), the case is `blocked` with `FAILED_NON_LOCAL_TARGET` and nothing is requested; every resolved URL is additionally tested with `isAllowedHost` from the guard. **Sessions come from the kit, the runner never logs in itself**: a case with `role: <slug>` requires that slug in `PRPs/auth/login.config.json` `roles` (else `blocked`, `ROLE_UNDECLARED`); once per distinct role per run, spawn `node <root>/PRPs/auth/login-<role>.mjs --root <root> --plugin-root <pluginRoot>` with `spawnSync`, argv array, `shell: false`, inherited environment, stdin ignored (so a credential prompt can never block — the script halts `FAILED_CREDENTIALS_UNAVAILABLE`), stdout and stderr NOT echoed; exit 0 means `PRPs/auth/.sessions/<role>.json` is ready, anything else makes every case needing that role `blocked` with `SESSION_UNAVAILABLE` and the `FAILED_*` code found in the script's stderr (a code only, never other text). The session file and the optional `<role>.token.json` are read in memory to build the `secretValues` for the redaction table (cookie values, localStorage values, the token) and are never printed, copied or written. The kit script writes only under `PRPs/auth/.sessions/`; the runner process itself writes only inside the run directory. **HTTP driver**: `playwright.request.newContext({ baseURL: origin, storageState: <session file when a role is set>, extraHTTPHeaders: { Authorization: 'Bearer <token>' } when the token artifact exists })`, each request with `maxRedirects: 0` and a 10-second timeout; `expect_status`, `expect_body_contains` and `expect_json` are evaluated on the UNREDACTED response in memory; a connection error or timeout is `blocked` `TARGET_UNREACHABLE`; an unmet expectation is `fail`, all met is `pass`. Evidence: `evidence/case-<index>.http.json` holding `{ request: { method, path }, response: { status, headers (only content-type, content-length, location and cache-control), body (JSON parsed when the content type is JSON, else text, truncated to 65536 characters) } }`, passed through `redactJson`/`redactText` BEFORE the write helper is called; `Set-Cookie` is never recorded. **Browser driver**: launch headless Chromium, `context = browser.newContext({ storageState })` when a role is set, install the route handler from the mirrored pattern (allow only `data:`, `about:`, `blob:` without a check, abort every other host not in `allowedHosts`), default timeout 10 seconds; run the steps in order; an unmet `expect_*` is `fail`; a `click`/`fill` target that cannot be found is `blocked` `STEP_NOT_PERFORMABLE` (the runner did not observe a defect, it could not attempt the action). Evidence after the last step: read `page.innerText('body')`; when `containsSecret` is true for it, the screenshot is WITHHELD and a redacted text snapshot is written to `evidence/case-<index>.txt` instead; otherwise `page.screenshot` to `evidence/case-<index>.png` with `mask` set to the `input[type=password]` locators. **Evidence is mandatory for `pass` and `fail`**: each entry's `evidence` array lists the repo-relative paths written; if the evidence cannot be written the outcome is `blocked` `EVIDENCE_WRITE_FAILED` — a `pass` with no evidence is never emitted. Browser contexts and the Playwright request context are always closed in `finally`. Printed output stays statuses and repo-relative paths only.
**MIRROR**: `# SOURCE: plugins/relay/resources/auth-login.template.mjs:252-261`, `# SOURCE: plugins/relay/resources/auth-login.template.mjs:380-384`, `# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:125-137`, `# SOURCE: plugins/relay/resources/auth-login.template.mjs:608-622`.
**VALIDATE**:
```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path"),http=require("http");
const repo=process.cwd();const plugin=path.join(repo,"plugins","relay");
const S=path.join(plugin,"scripts","qa-run.mjs");
const pw=require("playwright");
let browserPresent=false;try{browserPresent=fs.existsSync(pw.chromium.executablePath())}catch{}
if(process.env.RELAY_REQUIRE_BROWSER==="1"&&!browserPresent){console.error("FAIL: RELAY_REQUIRE_BROWSER=1 but no Chromium binary is installed");process.exit(1)}
const src=fs.readFileSync(S,"utf8");
const pre=[];
if(/^import[^\n]*from\s*[\x22\x27]playwright[\x22\x27]/m.test(src))pre.push("static playwright import");
for(const t of ["DRIVERS.http","DRIVERS.browser","FAILED_PLAYWRIGHT_UNAVAILABLE","FAILED_BROWSER_UNAVAILABLE","ROLE_UNDECLARED","SESSION_UNAVAILABLE","TARGET_UNREACHABLE","EVIDENCE_WRITE_FAILED","STEP_NOT_PERFORMABLE","NO_EXPECTATION","maxRedirects","isAllowedHost"])if(!src.includes(t))pre.push("script lacks "+t);
if(src.split("writeFileSync(").length!==2||src.split("renameSync(").length!==2)pre.push("the single write helper rule broke (writeFileSync/renameSync count)");
if(pre.length){console.error("FAIL: "+pre.join(" | "));process.exit(1)}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"qa-e2e-"));
let logins=0;
const server=http.createServer((req,res)=>{let body="";req.on("data",(c)=>{body+=c});req.on("end",()=>{
 if(req.method==="POST"&&req.url==="/api/login"){let j={};try{j=JSON.parse(body)}catch{}
  if(j.email==="qa@example.test"&&j.password==="not-a-real-password"){logins++;res.writeHead(200,{"Content-Type":"application/json","Set-Cookie":"sid=abc123; Path=/; HttpOnly; Max-Age=3600"});return res.end(JSON.stringify({data:{token:"tok-xyz"}}))}
  res.writeHead(401);return res.end("{}")}
 const authed=String(req.headers.cookie||"").includes("sid=abc123")||req.headers.authorization==="Bearer tok-xyz";
 if(req.url==="/api/me"){res.writeHead(authed?200:401);return res.end("{}")}
 if(req.url==="/api/items"){res.writeHead(200,{"Content-Type":"application/json"});return res.end(JSON.stringify({items:["widget"],token:"tok-xyz",note:"session sid=abc123"}))}
 if(req.url==="/page"){res.writeHead(200,{"Content-Type":"text/html"});return res.end("<html><body><h1 id=\"h\">Hello QA</h1></body></html>")}
 res.writeHead(404);res.end()})});
const finish=(code,msg)=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});(code?console.error:console.log)(msg);process.exit(code)};
(async()=>{try{
 await new Promise((r)=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 cp.execFileSync("git",["init","-q"],{cwd:tmp});
 const a=path.join(tmp,"PRPs","auth");fs.mkdirSync(a,{recursive:true});
 fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify({baseUrl:base,roles:{qa:{mechanism:"api",api:{path:"/api/login",method:"POST",usernameField:"email",passwordField:"password",tokenPath:"data.token"},probe:{path:"/api/me",method:"GET"},sessionCookie:"sid",maxAgeMinutes:60,credentials:{usernameEnv:"RELAY_TEST_USER",passwordEnv:"RELAY_TEST_PASS"},userCreation:{command:null}}}}));
 fs.writeFileSync(path.join(a,"login-qa.mjs"),fs.readFileSync(path.join(plugin,"resources","auth-login.template.mjs"),"utf8").split("__RELAY_ROLE__").join("qa"));
 const titles=["Me ok","Me wrong status","Ghost role","Manual only","Items redacted","Page heading","Cross origin"];
 const rep=["# QA Report","","## Test Cases",...titles.flatMap((t,i)=>["","### Case "+(i+1),"","1. **Title:** "+t,"2. **Risk level:** Low","3. **Required state:** none","4. **Coverage:** manual","5. **Automated test path:** unverified","6. **Manual status:** pending","7. **Manual step-by-step:**","   1. do it "+t]),""].join("\n");
 const rdir=path.join(tmp,"PRPs","reports","feat");fs.mkdirSync(rdir,{recursive:true});fs.writeFileSync(path.join(rdir,"qa-report.md"),rep);
 const env=Object.assign({},process.env,{RELAY_TEST_USER:"qa@example.test",RELAY_TEST_PASS:"not-a-real-password"});delete env.CLAUDE_PLUGIN_ROOT;
 const run=(a2)=>cp.spawnSync(process.execPath,[S,...a2],{encoding:"utf8",env});
 const ini=run(["init","--root",tmp,"--feature","feat"]);const dir=/RUN_DIR: (\S+)/.exec(String(ini.stdout));if(!dir)throw new Error("init failed: "+ini.stderr);
 const req=(m,p,x)=>Object.assign({action:"request",method:m,path:p},x||{});
 const e=(i,driver,role,steps)=>({index:i,title:titles[i-1],driver,role,state:"none",steps});
 fs.writeFileSync(path.join(tmp,dir[1],"plan.json"),JSON.stringify({schema_version:1,cases:[
  e(1,"http","qa",[req("GET","/api/me",{expect_status:200})]),
  e(2,"http","qa",[req("GET","/api/me",{expect_status:418})]),
  e(3,"http","ghost",[req("GET","/api/me",{expect_status:200})]),
  e(5,"http","qa",[req("GET","/api/items",{expect_status:200,expect_body_contains:"widget"})]),
  e(6,"browser",null,[{action:"goto",path:"/page"},{action:"expect_text",selector:"#h",contains:"Hello QA"}]),
  e(7,"http","qa",[req("GET","//evil.example/api/me",{expect_status:200})])]}));
 const r=run(["run","--root",tmp,"--feature","feat","--run-dir",dir[1]]);
 const j=JSON.parse(fs.readFileSync(path.join(tmp,dir[1],"results.json"),"utf8"));
 const need=(c,m)=>{if(!c)throw new Error(m)};
 need(j.cases.length===7,"entry count must be 7, got "+j.cases.length);
 const out=j.cases.map((c)=>c.outcome);
 need(out[0]==="pass","case 1 must pass: "+JSON.stringify(j.cases[0]));
 need(out[1]==="fail","case 2 must fail: "+JSON.stringify(j.cases[1]));
 need(out[2]==="blocked"&&j.cases[2].reason_code==="ROLE_UNDECLARED","case 3 must be blocked ROLE_UNDECLARED");
 need(out[3]==="needs-human"&&j.cases[3].manual_steps_verbatim.includes("do it Manual only"),"case 4 must be needs-human with verbatim steps");
 need(out[4]==="pass","case 5 must pass: "+JSON.stringify(j.cases[4]));
 need(j.cases[6].outcome==="blocked"&&j.cases[6].reason_code==="FAILED_NON_LOCAL_TARGET","case 7 (cross-origin path) must be blocked FAILED_NON_LOCAL_TARGET");
 if(browserPresent){need(out[5]==="pass"&&j.cases[5].evidence.length>0,"browser case must pass with evidence when Chromium exists: "+JSON.stringify(j.cases[5]))}
 else{need(out[5]==="blocked"&&j.cases[5].reason_code==="FAILED_BROWSER_UNAVAILABLE","without Chromium the browser case must degrade to blocked FAILED_BROWSER_UNAVAILABLE, never pass: "+JSON.stringify(j.cases[5]));console.error("NOTE: browser driver degraded path asserted; the real browser path was NOT exercised (no Chromium binary). Set RELAY_REQUIRE_BROWSER=1 to demand it.")}
 for(const i of [0,1,4]){const c=j.cases[i];need(c.evidence.length>=1&&c.evidence.every((p)=>p.startsWith(dir[1]+"/evidence/")&&fs.existsSync(path.join(tmp,p))),"case "+(i+1)+" evidence missing or outside the run dir")}
 for(const i of [2,3,6])need(j.cases[i].evidence.length===0,"case "+(i+1)+" must carry no evidence");
 const items=fs.readFileSync(path.join(tmp,j.cases[4].evidence[0]),"utf8");
 need(items.includes("widget")&&items.includes("[REDACTED]"),"items evidence must keep widget and show [REDACTED]");
 const secrets=["abc123","tok-xyz","not-a-real-password"];
 const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap((x)=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]);
 for(const f of walk(path.join(tmp,dir[1]))){const t=fs.readFileSync(f).toString("latin1");for(const s of secrets)need(!t.includes(s),"secret value leaked into "+path.relative(tmp,f))}
 for(const s of secrets)need(!(String(r.stdout)+String(r.stderr)).includes(s),"secret value leaked into the runner output");
 need(fs.existsSync(path.join(a,".sessions","qa.json")),"the kit login script must have produced the session");
 need(logins===1,"the runner must call the kit login script once per role, saw "+logins+" logins");
 need(/HUMAN GATE STILL OPEN/.test(String(r.stdout)),"summary must state the gate is open");
 finish(0,"PASS: http and browser drivers, kit sessions, redacted evidence, no leak, closed outcomes");
}catch(err){finish(1,"FAIL: "+err.message)}})();
'
```

### Task 5: UPDATE plugins/relay/scripts/qa-run.mjs (required state from declared sources only)

**ACTION**: Delivers AC-A7. Before a case's driver runs, evaluate the report's `required_state`: it needs no setup when its trimmed text matches `^(none|n/a)\b` case-insensitively; otherwise it needs a declared source. The plan entry's `state` field selects the source and the script verifies it: `"declared"` — look up the report's `required_state` text, EXACT string equality after trimming, in the `states` map of the tracked file `<root>/PRPs/auth/qa-seed.json` (`{ "states": { "<exact required-state text>": { "command": [argv...] } } }`; the file is tracked, holds commands and never values, and is a new declaration surface this plan introduces because the registered declaration locations do not exist yet — see Notes); `"role-only"` — the required state is nothing but a logged-in user of the plan entry's `role`, satisfied by the kit's session for that role (the existing Task 4 path, which includes the kit's own user creation through the login script); `"none"` while the report requires state — never accepted. When no source resolves, the case is `blocked` with `STATE_UNDECLARED` and a reason naming the missing declaration exactly (`PRPs/auth/qa-seed.json states["<text>"]`, or the role); a `role-only` entry with no `role`, or an undeclared role, is `ROLE_UNDECLARED`. A seed command runs through `spawnSync` with an argv array, `shell: false`, `cwd: <root>`, stdin ignored, stdout and stderr not captured, a 120-second timeout, and at most ONCE per distinct state per run (the outcome is remembered); a non-zero exit or timeout makes every case that needs it `blocked` with `SEED_FAILED` naming the exit status only. **Local-only for commands**: before spawning, every argv element containing `://` is parsed and tested with the guard's `checkTarget`; a refusal makes the case `blocked` with `FAILED_NON_LOCAL_TARGET`, and the command is NOT executed. The runner executes ONLY commands read from `qa-seed.json` or the kit's login scripts; it never runs a command taken from the report, the plan, a step or any heuristic, and it never writes to a store itself — only the declared command does.
**MIRROR**: `# SOURCE: plugins/relay/scripts/auth-local-guard.mjs:125-137`, `# SOURCE: plugins/relay/resources/auth-login.template.mjs:608-622`.
**VALIDATE**:
```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path"),http=require("http");
const S=path.resolve("plugins/relay/scripts/qa-run.mjs");
const src=fs.readFileSync(S,"utf8");
const pre=[];for(const t of ["qa-seed.json","STATE_UNDECLARED","SEED_FAILED","shell: false"])if(!src.includes(t))pre.push("script lacks "+t);
if(pre.length){console.error("FAIL: "+pre.join(" | "));process.exit(1)}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"qa-seed-"));
const server=http.createServer((q,s)=>{s.writeHead(200);s.end("ok")});
const finish=(code,msg)=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});(code?console.error:console.log)(msg);process.exit(code)};
(async()=>{try{
 await new Promise((r)=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const a=path.join(tmp,"PRPs","auth");fs.mkdirSync(a,{recursive:true});
 fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify({baseUrl:base,roles:{}}));
 fs.writeFileSync(path.join(tmp,"seed-ok.js"),"require(\"fs\").appendFileSync(require(\"path\").join(__dirname,\"seeded.marker\"),\"x\");");
 fs.writeFileSync(path.join(tmp,"seed-evil.js"),"require(\"fs\").writeFileSync(require(\"path\").join(__dirname,\"evil.marker\"),\"x\");");
 fs.writeFileSync(path.join(a,"qa-seed.json"),JSON.stringify({states:{"Widget exists":{command:[process.execPath,"seed-ok.js"]},"Evil state":{command:[process.execPath,"seed-evil.js","http://evil.example/x"]}}}));
 const defs=[["Declared state","Widget exists"],["Declared again","Widget exists"],["Undeclared state","Gadget exists"],["Evil seed","Evil state"],["Role only ghost","A user with role ghost"],["State dropped","Widget exists"],["No state needed","none"]];
 const rep=["# QA Report","","## Test Cases",...defs.flatMap(([t,s],i)=>["","### Case "+(i+1),"","1. **Title:** "+t,"2. **Risk level:** Low","3. **Required state:** "+s,"4. **Coverage:** manual","5. **Automated test path:** unverified","6. **Manual status:** pending","7. **Manual step-by-step:**","   1. do "+t]),""].join("\n");
 const rdir=path.join(tmp,"PRPs","reports","feat");fs.mkdirSync(rdir,{recursive:true});fs.writeFileSync(path.join(rdir,"qa-report.md"),rep);
 const run=(x)=>cp.spawnSync(process.execPath,[S,...x],{encoding:"utf8",cwd:tmp});
 const ini=run(["init","--root",tmp,"--feature","feat"]);const dir=/RUN_DIR: (\S+)/.exec(String(ini.stdout));if(!dir)throw new Error("init failed: "+ini.stderr);
 const health=(i,state,role)=>({index:i,title:defs[i-1][0],driver:"http",role:role||null,state,steps:[{action:"request",method:"GET",path:"/health",expect_status:200}]});
 fs.writeFileSync(path.join(tmp,dir[1],"plan.json"),JSON.stringify({schema_version:1,cases:[health(1,"declared"),health(2,"declared"),health(3,"declared"),health(4,"declared"),health(5,"role-only","ghost"),health(6,"none"),health(7,"none")]}));
 const r=run(["run","--root",tmp,"--feature","feat","--run-dir",dir[1]]);
 const j=JSON.parse(fs.readFileSync(path.join(tmp,dir[1],"results.json"),"utf8"));
 const need=(c,m)=>{if(!c)throw new Error(m)};
 need(j.cases.length===7,"entry count must be 7, got "+j.cases.length);
 const c=j.cases;
 need(c[0].outcome==="pass"&&c[1].outcome==="pass","declared-state cases must run and pass: "+JSON.stringify([c[0],c[1]]));
 need(fs.readFileSync(path.join(tmp,"seeded.marker"),"utf8")==="x","a declared state must be seeded exactly once per run");
 need(c[2].outcome==="blocked"&&c[2].reason_code==="STATE_UNDECLARED"&&c[2].reason.includes("PRPs/auth/qa-seed.json"),"an undeclared state must be blocked STATE_UNDECLARED naming qa-seed.json: "+JSON.stringify(c[2]));
 need(c[3].outcome==="blocked"&&c[3].reason_code==="FAILED_NON_LOCAL_TARGET"&&!fs.existsSync(path.join(tmp,"evil.marker")),"a seed command naming a non-local URL must be blocked and never executed");
 need(c[4].outcome==="blocked"&&c[4].reason_code==="ROLE_UNDECLARED","a role-only state with an undeclared role must be blocked ROLE_UNDECLARED");
 need(c[5].outcome==="blocked"&&c[5].reason_code==="STATE_UNDECLARED","a plan that drops a required state must be blocked STATE_UNDECLARED");
 need(c[6].outcome==="pass","a case with no required state must run: "+JSON.stringify(c[6]));
 finish(0,"PASS: declared-only state, once-per-run seeding, local-only seed commands, undeclared state blocked");
}catch(err){finish(1,"FAIL: "+err.message)}})();
'
```

### Task 6: CREATE plugins/relay/commands/relay-qa-run.md

**ACTION**: Delivers AC-A5 and AC-A4 (command side) and the command slice of AC-A9. Create the standalone, non-interactive command in the standalone body order. Frontmatter: a single-line single-quoted `description` (executes an existing QA report's cases through the runner script, translating manual steps into a closed plan only where they map onto the HTTP and browser drivers; gives every case one of pass, fail, blocked, needs-human; writes only under `PRPs/reports/<feature>/qa-run/<run-id>/`; never edits the report; a pass is evidence and the human gate stays open; non-interactive; never invoked by `/relay-execute`) and `argument-hint: '<feature | path-to-qa-report.md> [--env-handle <path>]'`, and NO `name:` key. Then `# /relay-qa-run`, `**Arguments:** $ARGUMENTS`, `## Your mission`, `See:` bullets using only `${CLAUDE_PLUGIN_ROOT}/...` paths (`scripts/qa-run.mjs`, `scripts/auth-local-guard.mjs`, `resources/redaction-policy.md`) plus the producing command named as `/relay-qa-report`, `## Decision Gate (before any action)` with the six-line block, `## Parse arguments` (a bare `<feature>` slug matching `^[a-z0-9][a-z0-9-]*$`, or a path ending `/qa-report.md` whose parent directory name is the feature; optional `--env-handle <path>`; blank or anything else HALTs with a usage blockquote; no feature is ever inferred from the branch). `## Preconditions` in this order: **P1 Decision Gate sources readable** (the byte-exact shared HALT pattern adapted with `/relay-qa-run` and "No run has been started."); **P2 The report exists** — `PRPs/reports/<feature>/qa-report.md`, else HALT `FAILED_QA_REPORT_MISSING` naming `/relay-qa-report`; **P3 Local-only guard and run directory** — run, from a fenced bash block, exactly `node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" init --root "<target_root>" --feature "<feature>"` (add `--env-handle "<path>"` verbatim when the argument was given); the script's first action is the guard, so a refusal prints `FAILED_NON_LOCAL_TARGET`; on any non-zero exit HALT with a blockquote beginning `> FAILED_NON_LOCAL_TARGET:` (when stderr names it; otherwise relay the named `FAILED_*` code) stating the guard is a hard failure never a warning and that nothing was written or requested; record `RUN_DIR` from stdout. `## Phase A — Parse and plan`: run exactly `node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" parse --report "<report>"`; for each returned case decide, from the case's manual steps alone, whether they map onto the closed vocabulary below; write ONLY the cases that do into `<RUN_DIR>/plan.json` with the `Write` tool (`{ "schema_version": 1, "cases": [ { "index", "title" (copied exactly), "driver", "role", "state", "steps" } ] }`); the vocabulary is `http` steps `request {method, path, body?, expect_status?, expect_body_contains?, expect_json?}` and `browser` steps `goto`, `click`, `fill`, `expect_visible`, `expect_text`, `expect_url`; `role` is a slug from `PRPs/auth/login.config.json` or null; `state` is `none` only when the report's required state is none, `role-only` only when the required state is nothing but a logged-in user of that role, else `declared`. State the honesty rules in the command body: omit any case needing an email inbox, SMS, a physical device, a third-party payment, a subjective visual judgment, a CLI, a database query, or any action outside the vocabulary — the script records it `needs-human` with the steps verbatim; never invent a selector, path, credential or expected value the steps do not state; every planned case must carry at least one expectation; never put a credential or token value in `plan.json`; never infer a driver the steps do not need. `## Phase B — Run`: exactly `node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" run --root "<target_root>" --feature "<feature>" --run-dir "<run-dir>"` (plus `--env-handle` when given). `## Final output surface`: relay the script's summary (the four counts, `results.json` path, evidence directory), list the `blocked` and `needs-human` reasons by `reason_code`, and state explicitly `HUMAN GATE STILL OPEN: a runner pass is evidence, not approval.` naming the file the human reviews, `PRPs/reports/<feature>/qa-report.md`, and that no Manual status and no phase status was changed. `## Constraints (hard rules)`: nothing under `.claude/`; "Never invoked by `/relay-execute`."; the command itself writes only `<RUN_DIR>/plan.json` (the script writes everything else, only inside the run directory); never edit `qa-report.md` or any Manual status; never run a command taken from the report or its steps (seed commands come only from `PRPs/auth/qa-seed.json`, sessions only from the kit's login scripts); no credential value enters the conversation or any file this command writes; never `Task`-dispatch anything; never ask the user a question; use the `Write` tool (heredocs through Bash do not work in this environment); nothing is written before P3 passes. `## What you do NOT do`: log in itself, create users, seed data itself, interpret steps outside the closed vocabulary, mark a case passed that was not executed, or advance any status. The file must not contain the token `design-spec` in any case, the token `design-map`, the substring `relay-auth-setup`, the string `.claude/PRPs`, or `subagent_type`, and must not use a `Next:` pointer line. Cite no packaged resource by bare basename.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-auth-scripts.md:113-123`.
**VALIDATE**:
```bash
set -euo pipefail
node -e '
const t=require("fs").readFileSync("plugins/relay/commands/relay-qa-run.md","utf8").replace(/\r\n/g,"\n");
const P="node \"${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs\" ";
const INIT=P+"init --root \"<target_root>\" --feature \"<feature>\"";
const PARSE=P+"parse --report \"<report>\"";
const RUN=P+"run --root \"<target_root>\" --feature \"<feature>\" --run-dir \"<run-dir>\"";
const need=["# /relay-qa-run","argument-hint:","I cannot emit the Decision Gate evidence block without reading","FAILED_QA_REPORT_MISSING","FAILED_NON_LOCAL_TARGET",INIT,PARSE,RUN,"${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs","${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md","plan.json","needs-human","HUMAN GATE STILL OPEN","PRPs/reports/<feature>/qa-report.md","Never invoked by `/relay-execute`","## Phase A","## Phase B","## Final output surface","--env-handle"];
const miss=need.filter((s)=>!t.includes(s));if(miss.length){console.error("FAIL: command missing: "+miss.join(" | "));process.exit(1)}
const forbidden=[["design-spec","design-spec token (banned in command files)"],["design-map","design-map token (banned in command files)"],["relay-auth-setup","reference to the auth-model command by name (inert-command pin)"],[".claude/PRPs","a .claude/PRPs path"],["subagent_type","a Task dispatch"],["Next:","a Next: pointer line"]];
for(const [s,why] of forbidden)if(t.toLowerCase().includes(s.toLowerCase())){console.error("FAIL: command contains "+why);process.exit(1)}
if(/^name:/m.test(t.split("---")[1]||"")){console.error("FAIL: frontmatter must not carry a name key");process.exit(1)}
const i=(s)=>t.indexOf(s);
if(!(i("I cannot emit the Decision Gate evidence block")<i("FAILED_QA_REPORT_MISSING")&&i("FAILED_QA_REPORT_MISSING")<i(INIT)&&i(INIT)<i(PARSE)&&i(PARSE)<i(RUN))){console.error("FAIL: sources, report, init, parse, run ordering violated");process.exit(1)}
console.log("PASS: /relay-qa-run command contract and ordering")
'
```

### Task 7: UPDATE scripts/validate/checks/auth-local-guard-sites.mjs (append the runner's guard sites)

**ACTION**: Delivers AC-A12. Append exactly two entries to the exported `GUARD_SITES` array, after the existing `auth-kit.gitignore` entry and in this order: `{ file: 'plugins/relay/scripts/qa-run.mjs', required: ['auth-local-guard.mjs', 'checkTarget', 'FAILED_NON_LOCAL_TARGET', '// GUARD-SITE'], forbidden: ['--local-host'] }` and `{ file: 'plugins/relay/commands/relay-qa-run.md', required: ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET'], forbidden: ['--local-host'] }`. Do not change `checkAuthLocalGuardSites`, `TEMPLATE_MARKERS`, any existing entry or the header comment. Do not edit `auth-local-guard-sites.test.mjs`: its `baseline()` map has exactly seven keys, so after this task `checkAuthLocalGuardSites({ files: baseline() })` reports the two new files as missing until the test pair extends the baseline — an expected, test-pair-owned consequence recorded in Notes and tolerated by Level 2 for that one file.
**MIRROR**: `# SOURCE: scripts/validate/checks/auth-local-guard-sites.mjs:45-49`.
**VALIDATE**:
```bash
set -euo pipefail
node --check scripts/validate/checks/auth-local-guard-sites.mjs
node --input-type=module -e '
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(process.cwd() + "/scripts/validate/checks/auth-local-guard-sites.mjs").href);
const SCRIPT = "plugins/relay/scripts/qa-run.mjs";
const CMD = "plugins/relay/commands/relay-qa-run.md";
const sites = m.GUARD_SITES.map((s) => s.file);
for (const f of [SCRIPT, CMD]) if (!sites.includes(f)) { console.error("FAIL: GUARD_SITES lacks " + f); process.exit(1); }
if (m.GUARD_SITES.length !== 9) { console.error("FAIL: expected 9 guard sites (7 existing + 2 runner), got " + m.GUARD_SITES.length); process.exit(1); }
const real = m.runAuthLocalGuardSitesCheck();
if (!real.ok) { console.error("FAIL: the real tree violates the guard-site registry: " + JSON.stringify(real.findings)); process.exit(1); }
const files = Object.fromEntries(m.GUARD_SITES.map((s) => [s.file, fs.readFileSync(s.file, "utf8")]));
const cases = [
  ["a runner script that lost its GUARD-SITE marker", { ...files, [SCRIPT]: files[SCRIPT].replace("// GUARD-SITE", "") }],
  ["a runner script that lost its guard import", { ...files, [SCRIPT]: files[SCRIPT].split("auth-local-guard.mjs").join("x.mjs") }],
  ["a runner command that lost its guard reference", { ...files, [CMD]: files[CMD].split("FAILED_NON_LOCAL_TARGET").join("X") }],
  ["a missing runner script", { ...files, [SCRIPT]: null }],
];
for (const [label, input] of cases) {
  const r = m.checkAuthLocalGuardSites({ files: input });
  if (r.ok) { console.error("FAIL: the check did not detect " + label); process.exit(1); }
}
console.log("PASS: both runner guard sites registered, hold on the real tree and detect four seeded violations");
'
```

### Task 8: CREATE scripts/validate/checks/qa-run-contract.mjs and UPDATE scripts/validate/index.mjs

**ACTION**: Delivers AC-A3 and AC-A12 (the PRD's Should-item: a deterministic gate for the outcome vocabulary, the guard sites and the write boundary). Create the check module: `#!/usr/bin/env node`, `// @ts-check`, a header comment, `const CHECK_NAME = 'qa-run-contract'`, an exported pure `validateResults(obj)` returning an array of finding messages, an exported pure `checkQaRunContract({ scriptText, commandText, results })` (`results` is an array of `{ file, value }` parsed `results.json` objects) returning `{ name, ok, findings }` with findings `{ message, file, line }`, and an exported zero-arg `runQaRunContractCheck()` that reads `plugins/relay/scripts/qa-run.mjs` and `plugins/relay/commands/relay-qa-run.md` with a `readOrNull` helper and walks `PRPs/reports/*/qa-run/*/results.json` (none exist today; an unparseable file is a finding). Rules: the script text must contain exactly `export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];`; every `outcome` literal assigned in the script (`outcome\s*[:=]\s*['"]([^'"]+)['"]`) must be one of the four, so a fifth value such as `skipped` or `error` is a finding; the script must contain `// GUARD-SITE` exactly once, `// WRITE-SITE` exactly once, exactly one `writeFileSync(` and exactly one `renameSync(` (the single-write-helper rule that keeps the runner inside its run directory), `toISOString`, `FAILED_NON_LOCAL_TARGET`, `auth-local-guard.mjs` and `HUMAN GATE STILL OPEN`; the script must not contain `qa-report.md` as an argument of any write call (a finding when a line holds both a write call and `qa-report.md`); the command text must contain `HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs` and must not contain `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`; `validateResults(obj)` flags an `outcome` outside the four, `cases.length` not equal to the sum of `counts`, a missing or non-ISO `started_at`/`finished_at` at run or case level, any stamp ending `T00:00:00Z`, a `human_gate.status` other than `open`, and a `pass`/`fail` entry with an empty `evidence` array. A missing script or command file is a finding. In `scripts/validate/index.mjs`, add `import { runQaRunContractCheck } from './checks/qa-run-contract.mjs';` immediately after the existing `runAuthLocalGuardSitesCheck` import (line 45) and append `runQaRunContractCheck,` as the last `CHECKS` entry, after `runAuthLocalGuardSitesCheck,`. Never replace an existing entry. Do not author any `*.test.mjs`: `validate-registry.test.mjs` already enforces the import and registration forms, and the corpus test for this module comes from the test pair.
**MIRROR**: `# SOURCE: scripts/validate/checks/auth-secrecy.mjs:30-34`, `# SOURCE: scripts/validate/index.mjs:44-45`.
**VALIDATE**:
```bash
set -euo pipefail
node --check scripts/validate/checks/qa-run-contract.mjs
grep -q "import { runQaRunContractCheck } from './checks/qa-run-contract.mjs';" scripts/validate/index.mjs
grep -q "^  runQaRunContractCheck,$" scripts/validate/index.mjs
node --input-type=module -e '
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(process.cwd() + "/scripts/validate/checks/qa-run-contract.mjs").href);
const real = m.runQaRunContractCheck();
if (!real.ok) { console.error("FAIL: the real tree violates the qa-run contract: " + JSON.stringify(real.findings)); process.exit(1); }
const scriptText = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const commandText = fs.readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
const good = { schema_version: 1, human_gate: { status: "open" }, started_at: "2026-10-02T10:00:00.123Z", finished_at: "2026-10-02T10:00:01.456Z", counts: { pass: 1, fail: 0, blocked: 0, "needs-human": 0 }, cases: [{ index: 1, title: "t", outcome: "pass", started_at: "2026-10-02T10:00:00.200Z", finished_at: "2026-10-02T10:00:00.900Z", evidence: ["a/b.json"] }] };
if (m.validateResults(good).length !== 0) { console.error("FAIL: a well-formed results object was flagged: " + JSON.stringify(m.validateResults(good))); process.exit(1); }
const clone = (f) => { const o = JSON.parse(JSON.stringify(good)); f(o); return o; };
const seeded = [
  ["a fifth outcome value", clone((o) => { o.cases[0].outcome = "skipped"; })],
  ["a count that does not partition the cases", clone((o) => { o.counts.pass = 2; })],
  ["a degenerate midnight stamp", clone((o) => { o.started_at = "2026-10-02T00:00:00Z"; })],
  ["a pass with no evidence", clone((o) => { o.cases[0].evidence = []; })],
  ["a closed human gate", clone((o) => { o.human_gate.status = "closed"; })],
];
for (const [label, obj] of seeded) if (m.validateResults(obj).length === 0) { console.error("FAIL: validateResults did not detect " + label); process.exit(1); }
const textCases = [
  ["a fifth outcome literal in the script", { scriptText: scriptText + "\nconst x = { outcome: \x27skipped\x27 };\n", commandText, results: [] }],
  ["a second write call in the script", { scriptText: scriptText + "\nwriteFileSync(a, b);\n", commandText, results: [] }],
  ["a command that lost the human-gate statement", { scriptText, commandText: commandText.split("HUMAN GATE STILL OPEN").join("x"), results: [] }],
  ["a command that names the auth-model command", { scriptText, commandText: commandText + "\nrelay-auth-setup\n", results: [] }],
  ["a tracked results file with a fifth value", { scriptText, commandText, results: [{ file: "r.json", value: seeded[0][1] }] }],
];
for (const [label, input] of textCases) if (m.checkQaRunContract(input).ok) { console.error("FAIL: checkQaRunContract did not detect " + label); process.exit(1); }
console.log("PASS: qa-run-contract holds on the real tree and detects every seeded violation");
'
```

### Task 9: UPDATE docs/api-reference.md

**ACTION**: Infrastructure/scaffolding annotation for registration (delivers no AC; it moves one of the three count surfaces the test pair's pins read). Change `21 commands` to `22 commands` in BOTH occurrences (lines 17 and 28) and leave the sentence pinned by `figma-visual-first-track-phase7.test.mjs` ("plus a fourth standalone command, `/relay-visual-approve`, ...") byte-identical. Update the paragraph at lines 34-36 so it names three further standalone commands (`/relay-auth-setup`, `/relay-auth-scripts` and `/relay-qa-run`), brings the surface to 22 in all, and still says none is ever invoked by `/relay-execute`. Add one row to the test-auth-kit command table (after the `/relay-auth-scripts` row, line 128): ``| `/relay-qa-run <feature> [--env-handle <path>]` ✅ **implemented** | ... | ... |`` — Input: an existing `PRPs/reports/<feature>/qa-report.md` and an optional explicit environment-handle file; non-interactive, never invoked by `/relay-execute`. Output: `PRPs/reports/<feature>/qa-run/<run-id>/results.json` with exactly one entry per report case, each `pass`, `fail`, `blocked` or `needs-human`, plus redacted evidence and a `plan.json`; browser and HTTP drivers active, CLI and DB drivers not built (those cases return `needs-human` with their steps verbatim); the report is never edited; a pass is evidence and the human gate stays open. Add one row to the Shared scripts table (after the `auth-local-guard.mjs` row): `qa-run.mjs` ✅, invoked by `/relay-qa-run`, listing the `parse`, `init` and `run` modes, the guard-before-write rule, the single write helper, the exit codes (`0` completed, `1` named halt or aborted run, `2` bad arguments) and the `qa-run-contract` check that enforces it. Do not change any other row, the pinned sentence or any heading. Do not touch `docs/context/architecture.md` or `CLAUDE.md` (docs-sync owns them).
**MIRROR**: `# SOURCE: docs/api-reference.md:215`.
**VALIDATE**:
```bash
set -euo pipefail
node -e '
const t=require("fs").readFileSync("docs/api-reference.md","utf8").replace(/\r\n/g,"\n");
const flat=t.replace(/\s+/g," ");
const bad=[];
const n22=(t.match(/22 commands/g)||[]).length;if(n22!==2)bad.push("expected exactly 2 occurrences of 22 commands, found "+n22);
if(/21 commands/.test(t))bad.push("a stale 21 commands remains");
if(!flat.includes("plus a fourth standalone command, `/relay-visual-approve`, belonging to the sibling Figma Visual-First Track"))bad.push("the pinned /relay-visual-approve sentence was altered or removed");
if(!/\| `\/relay-qa-run [^|]*` ✅ \*\*implemented\*\* \|/.test(t))bad.push("the /relay-qa-run table row is missing");
if(!/\| `qa-run\.mjs` ✅ \|/.test(t))bad.push("the qa-run.mjs shared-scripts row is missing");
for(const s of ["results.json","needs-human","human gate","qa-run-contract"])if(!flat.toLowerCase().includes(s.toLowerCase()))bad.push("missing token: "+s);
if(bad.length){console.error("FAIL: "+bad.join(" | "));process.exit(1)}
console.log("PASS: docs/api-reference.md registers the 22nd command and the runner script")
'
```

### Task 10: UPDATE documentation/ (commands, scripts, validation pages, search index, changelog)

**ACTION**: Infrastructure/scaffolding annotation for registration; also delivers AC-A11 (the review loop untouched — this task's VALIDATE is where the byte-identity guard runs). First `Read` `documentation/AGENTS.md` in full — it is the binding contract for every `documentation/` change (invariants, page template, CSS vocabulary, the three-file registration rule, no emojis, no inline styles). Then: (a) `documentation/reference/commands.html` — the page subtitle at line 24 becomes "Twenty-two commands" (keep the rest of its sentence), and a `relay-qa-run` `<h3 id="relay-qa-run">` with the same `.kv` block shape (Input, Output, Mode, Notes) is added after the `relay-auth-scripts` block and before `<h2 id="pillar3">`, with the `implemented` badge; (b) `documentation/reference/scripts.html` — a `<h2 id="qa-run">qa-run.mjs <span class="badge badge--done">shipped</span></h2>` section with a `.kv` block (Path, Purpose, Invoked by, Runtime, Dependencies — stating `playwright` is resolved lazily and `node:` built-ins otherwise) and a Usage `<h3>` with a `<pre><code class="language-bash">` block for the three modes, inserted immediately before `<h2 id="extension-pattern">`; (c) `documentation/reference/validation-checks.html` — a summary-table row and a `<h2 id="qa-run-contract">` section for the new check in the same shape as the `auth-local-guard-sites` section, and the totals sentence's count raised from 27 to 28; (d) `documentation/guide/validation-suite.html` — a row for `qa-run-contract` beside the `auth-local-guard-sites` row; (e) `documentation/assets/data/search-index.json` — the `Commands` entry's `excerpt` now starts `Twenty-two commands` (the existing text after the prefix is kept) and gains, at the END only, one sentence introducing `/relay-qa-run` as the standalone, non-interactive runner that executes a QA report's cases through browser and HTTP drivers and writes `results.json` under `PRPs/reports/<feature>/qa-run/`; keep the JSON valid, LF-only and ASCII-safe; (f) `documentation/changelog.html` — a further `<li>` inside the existing `<h3 id="unreleased-added">Added</h3>` list, same markup as its neighbours, describing `/relay-qa-run`, the `qa-run.mjs` script, the four-outcome vocabulary, the redacted evidence and the `qa-run-contract` check, and stating that a runner pass is evidence while the human validation gate stays open. Do not add any `/relay-` command literal other than `/relay-qa-run` that does not already appear, and do not mention any command that has no file.
**MIRROR**: `# SOURCE: documentation/changelog.html:35-41`, `# SOURCE: documentation/reference/commands.html:326-337`, `# SOURCE: documentation/reference/scripts.html:190-198`.
**VALIDATE**:
```bash
set -euo pipefail
node --input-type=module -e '
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const rd = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const bad = [];
const idx = JSON.parse(fs.readFileSync("documentation/assets/data/search-index.json", "utf8"));
const commands = idx.find((e) => e.title === "Commands");
if (!commands || !commands.excerpt.startsWith("Twenty-two commands")) bad.push("the Commands excerpt must start with Twenty-two commands");
if (commands && !commands.excerpt.includes("/relay-qa-run")) bad.push("the Commands excerpt must mention /relay-qa-run");
if (/^Twenty-one commands/.test((commands && commands.excerpt) || "")) bad.push("a stale Twenty-one commands prefix remains");
const cl = rd("documentation/changelog.html");
if (!cl.includes("/relay-qa-run") || !cl.includes("qa-run-contract") || !/human validation gate/i.test(cl)) bad.push("changelog entry missing /relay-qa-run, qa-run-contract or the human-gate statement");
const cmds = rd("documentation/reference/commands.html");
if (!cmds.includes("Twenty-two commands") || /Twenty-one commands/.test(cmds)) bad.push("commands.html subtitle must say Twenty-two commands");
if (!cmds.includes("id=\"relay-qa-run\"")) bad.push("commands.html lacks the relay-qa-run section");
if (!(cmds.indexOf("id=\"relay-qa-run\"") > cmds.indexOf("id=\"relay-auth-scripts\"") && cmds.indexOf("id=\"relay-qa-run\"") < cmds.indexOf("id=\"pillar3\""))) bad.push("relay-qa-run must sit after relay-auth-scripts and before pillar3");
const scr = rd("documentation/reference/scripts.html");
if (!scr.includes("id=\"qa-run\"") || !(scr.indexOf("id=\"qa-run\"") < scr.indexOf("id=\"extension-pattern\""))) bad.push("scripts.html lacks the qa-run section before extension-pattern");
const vc = rd("documentation/reference/validation-checks.html");
if (!vc.includes("qa-run-contract") || !vc.includes("id=\"qa-run-contract\"")) bad.push("validation-checks.html lacks the qa-run-contract section");
if (/\b27 checks\b/.test(vc) || !/\b28 checks\b/.test(vc)) bad.push("validation-checks.html totals must say 28 checks and no longer 27 checks");
if (!rd("documentation/guide/validation-suite.html").includes("qa-run-contract")) bad.push("validation-suite.html lacks the qa-run-contract row");
if (bad.length) { console.error("FAIL: " + bad.join(" | ")); process.exit(1); }
const m = await import(pathToFileURL(process.cwd() + "/scripts/validate/checks/registration-parity.mjs").href);
const r = m.runRegistrationParityCheck();
if (!r.ok) { console.error("FAIL: registration-parity: " + JSON.stringify(r.findings)); process.exit(1); }
console.log("PASS: documentation site registers /relay-qa-run, qa-run.mjs and qa-run-contract; registration-parity green");
'
git diff --quiet 9e9ce214b9361929fadbbcbdb62c7df012d15cb4 -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
test -f plugins/relay/commands/relay-qa-run.md
grep -q "runQaRunContractCheck" scripts/validate/index.mjs
grep -q "plugins/relay/scripts/qa-run.mjs" scripts/validate/checks/auth-local-guard-sites.mjs
npm run validate
```

The two `node --check` lines, the `test -f` and the two `grep` lines fail before this phase's tasks (the files and the registrations do not exist), which is the real pre-ACTION signal — `npm run validate` alone passes on the dirty Phase 1-3 tree. The runner sets a non-zero exit code when any registered check reports a finding. Baseline is 27 passed / 0 failed; after Tasks 7 and 8 it is 28 passed / 0 failed.

### Level 2 — CONTENT_INVARIANTS and UNIT_TESTS

```bash
set -euo pipefail
BASE=9e9ce214b9361929fadbbcbdb62c7df012d15cb4
# Pre-ACTION signal: the deliverables must exist (these fail on the unmodified tree).
test -f plugins/relay/scripts/qa-run.mjs
test -f plugins/relay/commands/relay-qa-run.md
test -f scripts/validate/checks/qa-run-contract.mjs
# AC-16 and every frozen file: single-argument tree form, never two-dot.
git diff --quiet "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs plugins/relay/scripts/auth-local-guard.mjs plugins/relay/scripts/auth-kit-secrecy.mjs plugins/relay/resources/auth-login.template.mjs plugins/relay/resources/auth-kit.gitignore plugins/relay/commands/relay-auth-scripts.md plugins/relay/commands/relay-auth-setup.md plugins/relay/commands/relay-execute.md plugins/relay/resources/redaction-policy.md
# New files are untracked, so their whole content is the added text: scan them directly.
for f in plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs; do
  if grep -n '\.claude/PRPs' "$f" | grep -qv 'MUST NOT appear'; then
    echo "FAIL: forbidden .claude/PRPs reference in $f outside a quoted prohibition"; exit 1
  fi
done
# Modified files: scan only the added diff lines, excluding the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- scripts/validate/index.mjs scripts/validate/checks/auth-local-guard-sites.mjs docs/api-reference.md documentation/reference/commands.html documentation/reference/scripts.html documentation/reference/validation-checks.html documentation/guide/validation-suite.html documentation/assets/data/search-index.json documentation/changelog.html | grep -E '^\+[^+]' | grep '\.claude/PRPs' | grep -qv 'MUST NOT appear'; then
  echo "FAIL: forbidden .claude/PRPs reference introduced in a modified file"; exit 1
fi
# The corpus, one file per process so the node runner's own exit code carries the signal (no reporter parsing).
# Two files legitimately fail until the test pair updates them (EXISTING_TEST_UPDATED); every other file must be green.
node -e '
const cp=require("child_process"),fs=require("fs"),path=require("path");
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const all=walk("scripts/validate").filter((p)=>p.endsWith(".test.mjs")).map((p)=>p.split(path.sep).join("/"));
const ALLOWED=["scripts/validate/checks/auth-local-guard-sites.test.mjs","scripts/validate/checks/figma-visual-first-track-phase7.test.mjs"];
const failed=[];
for(const f of all){const r=cp.spawnSync(process.execPath,["--test",f],{stdio:"ignore"});if(r.status!==0)failed.push(f)}
const unexpected=failed.filter((f)=>!ALLOWED.includes(f));
if(unexpected.length){console.error("FAIL: unexpected failing test files: "+unexpected.join(" | "));process.exit(1)}
console.log("PASS: "+(all.length-failed.length)+"/"+all.length+" test files green; "+failed.length+" pinned file(s) awaiting the test pair");
'
```

The corpus baseline of 1215 tests / 0 fail is HELD, not reached, on this dirty tree: after the phase every file outside the two named pin files stays green, and the two pin files are the test pair's `EXISTING_TEST_UPDATED` items (see Notes) — they fail only because the command count moved to 22 and `GUARD_SITES` gained two sites. The three `test -f` lines are the pre-ACTION failure signal; the frozen-file `git diff --quiet` lines guard invariants and are green before and after by design.

### Level 3 — INTEGRATION (the command's script lines as written, against a loopback fixture)

```bash
set -euo pipefail
node -e '
const cp=require("child_process"),fs=require("fs"),os=require("os"),path=require("path"),http=require("http"),crypto=require("crypto");
const plugin=path.resolve("plugins/relay");
const cmdLines=fs.readFileSync("plugins/relay/commands/relay-qa-run.md","utf8").split(/\r?\n/);
const PRE="node \"${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs\" ";
const pick=(mode)=>cmdLines.find((l)=>l.startsWith(PRE+mode+" "));
const fill=(l,vars)=>{let s=l.split("${CLAUDE_PLUGIN_ROOT}").join(plugin);for(const [k,v] of Object.entries(vars))s=s.split("<"+k+">").join(v);return s};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"qa-l3-"));
const server=http.createServer((q,s)=>{if(q.url==="/health"){s.writeHead(200,{"Content-Type":"text/plain"});return s.end("ok")}s.writeHead(404);s.end()});
const finish=(code,msg)=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});(code?console.error:console.log)(msg);process.exit(code)};
(async()=>{try{
 const need=(c,m)=>{if(!c)throw new Error(m)};
 for(const mode of ["parse","init","run"])need(pick(mode),"the command does not carry a "+mode+" invocation line as written");
 await new Promise((r)=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const a=path.join(tmp,"PRPs","auth");fs.mkdirSync(a,{recursive:true});fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify({baseUrl:base,roles:{}}));
 const names=["Health pass","Health fail","Manual only"];
 const rep=["# QA Report","","## Test Cases",...names.flatMap((t,i)=>["","### Case "+(i+1),"","1. **Title:** "+t,"2. **Risk level:** Low","3. **Required state:** none","4. **Coverage:** manual","5. **Automated test path:** unverified","6. **Manual status:** pending","7. **Manual step-by-step:**","   1. step for "+t]),""].join("\n");
 const rdir=path.join(tmp,"PRPs","reports","feat");fs.mkdirSync(rdir,{recursive:true});const rp=path.join(rdir,"qa-report.md");fs.writeFileSync(rp,rep);
 const sha=()=>crypto.createHash("sha256").update(fs.readFileSync(rp)).digest("hex");const h0=sha();
 const vars={target_root:tmp,feature:"feat",report:rp};
 const parsed=JSON.parse(cp.execSync(fill(pick("parse"),vars),{encoding:"utf8"}));need(parsed.cases.length===3,"parse line as written must list 3 cases");
 const ini=cp.execSync(fill(pick("init"),vars),{encoding:"utf8"});const dir=/RUN_DIR: (\S+)/.exec(ini);need(dir,"init line as written must print RUN_DIR");
 const st=(i,exp)=>({index:i,title:names[i-1],driver:"http",role:null,state:"none",steps:[{action:"request",method:"GET",path:"/health",expect_status:exp}]});
 fs.writeFileSync(path.join(tmp,dir[1],"plan.json"),JSON.stringify({schema_version:1,cases:[st(1,200),st(2,500)]}));
 const out=cp.execSync(fill(pick("run"),Object.assign({"run-dir":dir[1]},vars)),{encoding:"utf8"});
 const j=JSON.parse(fs.readFileSync(path.join(tmp,dir[1],"results.json"),"utf8"));
 need(j.cases.map((c)=>c.outcome).join()==="pass,fail,needs-human","outcomes must be pass,fail,needs-human, got "+j.cases.map((c)=>c.outcome).join());
 need(j.cases.length===parsed.cases.length,"entry count must equal the case count");
 need(j.cases[0].evidence.length>=1&&fs.existsSync(path.join(tmp,j.cases[0].evidence[0])),"a pass must carry evidence on disk");
 need(sha()===h0,"qa-report.md must be byte-identical after the run");
 need(/HUMAN GATE STILL OPEN/.test(out)&&out.includes("PRPs/reports/feat/qa-report.md"),"the run line must end by stating the gate is open and naming the review file");
 // guard refusal through the init line as written
 fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify({baseUrl:"http://localhost@evil.example:3000",roles:{}}));
 let refused=false;try{cp.execSync(fill(pick("init"),vars),{stdio:"pipe"})}catch(e){refused=String(e.stderr).includes("FAILED_NON_LOCAL_TARGET")}
 need(refused,"the init line as written must refuse a userinfo-at target by name");
 finish(0,"PASS: parse, init and run lines run as written; four-way outcomes, evidence, byte-identical report, gate-open statement, guard refusal");
}catch(err){finish(1,"FAIL: "+err.message)}})();
'
```

This block executes the exact `parse`, `init` and `run` lines the command tells the operator to run, so a flag drift between the command and the script fails here. It exercises `pass`, `fail` and `needs-human` against a loopback server with no login (the `blocked` outcome and the kit-session path are exercised in Tasks 3-5). The browser driver's real-Chromium path, the kit login against a real application and every dogfood-scale behavior are NOT exercised by this plan's commands.

## Acceptance Criteria

- **AC-A1 (PRD AC-2):** Given a `qa-report.md` with N cases, `/relay-qa-run` writes a `results.json` with exactly N entries, one per case and each keyed by the report's case index and title; the entry count equals N even when the run aborted partway — unreached cases are recorded `blocked` with `reason_code: "RUN_ABORTED"`. The case list comes from the script's own parser, never from the command's judgment.
- **AC-A2 (PRD AC-3):** A case whose steps no active driver can perform (no plan entry, an invalid entry, a driver other than `http`/`browser`, or no evaluated expectation) is recorded `needs-human`, its entry reproduces the case's manual step-by-step verbatim, and it is never recorded as `pass` or omitted.
- **AC-A3 (PRD AC-4):** Every entry's `outcome` is exactly one of `pass`, `fail`, `blocked`, `needs-human`; the `qa-run-contract` check, registered in `npm run validate`, fails on any other literal in the script and on any tracked `results.json` carrying a fifth value.
- **AC-A4 (PRD AC-7):** After a run, `qa-report.md` is byte-identical to its pre-run content (the script records its SHA-256 before and after), and the runner process writes only under `PRPs/reports/<feature>/qa-run/<run-id>/` through one marked write helper that refuses any other destination.
- **AC-A5 (PRD AC-8):** The terminal summary and the command's final output state that the human validation gate is still open and name `PRPs/reports/<feature>/qa-report.md` as the file the human reviews; no Manual status is flipped and no phase status advances as a result of a run.
- **AC-A6 (PRD AC-13):** The run and every case entry carry `started_at` and `finished_at` as real UTC instants with milliseconds observed by the script's own clock (never derived or fabricated), `duration_ms` is their difference, and no stamp ends `T00:00:00Z`.
- **AC-A7 (PRD AC-14):** Required state is prepared only from the declared sources — the exact-match `states` map of the tracked `PRPs/auth/qa-seed.json` (each declared command run at most once per run) and the kit's own login script for a role-only state; when neither declares how to produce a state, the case is `blocked` with `STATE_UNDECLARED` naming the missing declaration, and a seed command naming a non-local URL is never executed.
- **AC-A8 (PRD AC-15):** Every `pass` and `fail` entry lists at least one evidence artifact (HTTP response record, screenshot or redacted text snapshot) under that run's `evidence/` directory, and every evidence byte was passed through the `redaction-policy.md` layers in memory before the write; a screenshot is withheld in favor of redacted text when the page text contains a secret, and a `pass` whose evidence cannot be written is `blocked` instead.
- **AC-A9 (PRD AC-1):** The runner calls `auth-local-guard.mjs` (`checkTarget`) before any request, login or write and refuses a non-local target by name (`FAILED_NON_LOCAL_TARGET`) with the run directory uncreated; every HTTP path is same-origin and every browser request is tested with `isAllowedHost`; a seed command argument naming a non-local URL blocks the case.
- **AC-A10 (PRD AC-6):** No credential value (cookie, localStorage value, token, password) reaches the conversation, a report, a run file or git: session artifacts are read in memory only to feed the redaction table, the kit's login script output is never echoed, runner output carries statuses and repo-relative paths only, and the fixture scan of every run file and the runner's output finds zero secret values.
- **AC-A11 (PRD AC-16):** After the phase, `code-reviewer.md`, `code-reviewer-semantic.md` and `relay-implement.md` are byte-identical to their pre-phase content, as are `capture.mjs`, `auth-local-guard.mjs`, `auth-login.template.mjs`, `auth-kit-secrecy.mjs`, `relay-auth-scripts.md`, `relay-auth-setup.md` and `relay-execute.md`.
- **AC-A12 (PRD AC-1):** The runner script and `/relay-qa-run` are registered as guard sites in `GUARD_SITES`; the `auth-local-guard-sites` check fails when either loses its guard reference or the script loses its `// GUARD-SITE` marker.

R8b (PRD AC-N token check) is satisfied: every bullet above carries a PRD AC token. Not claimed by any bullet: PRD AC-10 (a real authenticated `capture.mjs` render) and AC-12 (an exercised headed or form browser login) stay unproven and belong to the Phase 5 dogfood.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Translating prose steps into the closed plan is unreliable and a case gets a wrong `pass` or `fail` instead of an honest `needs-human` | H | H | The plan vocabulary is closed and small; the script validates every entry (title and index must match the report, unknown action invalidates it); a `pass` requires at least one evaluated expectation; a step the command cannot ground is omitted so the script records `needs-human` with the steps verbatim; the 60% target is a marker the Phase 5 dogfood measures, not a number reached by loosening classification |
| A credential value reaches a run file, the runner's output or git | M | H | Redaction is applied to the in-memory value before the single write helper; session values feed the redaction table only; the kit login script's output is never echoed; Task 4's VALIDATE scans every run file and the runner output for the fixture secrets; screenshots are withheld when the page text contains a secret |
| On-screen secrets inside a screenshot that no text scan can see | L | M | Password inputs are masked, and the screenshot is replaced by a redacted text snapshot whenever the page text matches the table or the value regexes; a secret rendered only as pixels remains a residual risk, recorded rather than hidden, and the dogfood's zero-credential scan covers the produced artifacts |
| The runner's local-only guard is missed at one call site | M | H | The guard runs at `init` and `run` before any write; Task 7 registers the script and the command in `GUARD_SITES`; Task 8 pins the marker, the single-write-helper rule and the HTTP same-origin rule's observable behavior is asserted in Task 4 |
| A declared seed command or a login script acts on a non-local store | L | H | Argv elements containing `://` are guard-checked before spawn; commands come only from the tracked `qa-seed.json` and the kit's own scripts; `shell: false`; DNS pinning and a command that connects somewhere without naming a URL are residual risks, recorded here and in Notes |
| The environment handle's real path and format differ from the explicit `--env-handle` seam (registered, undecided) | M | L | The seam reads one key from an explicitly passed file, performs no discovery and approximates none of the six strategies; when the registered feature lands, the flag's reader is the single place to change |
| `PRPs/auth/qa-seed.json` is a new declaration surface the PRD names no location for | M | M | It is a tracked, value-free, exact-match map held on the tracked side of the kit (no ignore rule matches it, and `auth-secrecy` pins only required rules); its location and format are recorded as a decision in Notes and flagged to the human before the dogfood relies on it |
| Corpus pins break: three count literals in `figma-visual-first-track-phase7.test.mjs`, and the `baseline()` map in `auth-local-guard-sites.test.mjs` | H | M | Expected and legitimate: the requirement moved. Level 2 tolerates failures in exactly those two files; they are test-pair `EXISTING_TEST_UPDATED` items after the Implementer finishes, never Implementer edits; any further breaking pin the corpus reveals is reported as a reviewer finding and routed the same way, never fixed by editing a test |
| The browser driver cannot be exercised without a Chromium binary, so its VALIDATE could go green by skipping | M | M | Task 4's VALIDATE never skips: with no binary it asserts the degraded outcome (`blocked`, `FAILED_BROWSER_UNAVAILABLE`, never `pass`) and prints a NOTE that the real path was not exercised; `RELAY_REQUIRE_BROWSER=1` turns the missing binary into a failure. The real-browser path is test-pair territory where a browser exists, and the Phase 5 dogfood owns the real-application proof |
| New files trip a pattern-based check (registration-parity, path-existence, plugin-root-resolvable, line-endings, the design-spec and design-map command bans, the inert-command pin) | M | M | Every packaged citation uses the full `${CLAUDE_PLUGIN_ROOT}/...` prefix; the command avoids `design-spec`, `design-map`, `relay-auth-setup` and `Next:` lines, and Task 6's VALIDATE greps for each; LF-only files; Level 1 runs all 28 checks |
| `/relay-qa-run` triggers a login script run, which writes kit artifacts, against AC-7's "writes only under the run directory" | L | L | The runner process itself writes only inside the run directory; the session refresh is the kit's own script writing only under `PRPs/auth/.sessions/` (ignored, secrecy-proven by the script before it writes). Recorded in Notes so the boundary is stated rather than implied |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Test-pair work this phase hands over (EXISTING_TEST_UPDATED and NEW_TEST_REQUIRED, never Implementer tasks):** (1) `figma-visual-first-track-phase7.test.mjs` — the three count pins move with the three surfaces Tasks 9 and 10 edit: `docs/api-reference.md` `21 commands` to `22 commands` (the occurrence count stays 2), `documentation/reference/commands.html` `Twenty-one commands` to `Twenty-two commands`, and the search-index `Commands` excerpt prefix `^Twenty-one commands` to `^Twenty-two commands` (with the negative regexes extended accordingly); (2) `auth-local-guard-sites.test.mjs` — add constants for the two new sites to `ALL_SITES` and to `baseline()` carrying their required tokens, and a `REQUIRED_NON_MARKER` row if needed; (3) NEW tests for `qa-run.mjs` (parser in both layouts and the real sample, the redaction layers, outcome assembly, the abort count invariant, the guard-before-write ordering, same-origin and seed-argv refusals, the real-UTC stamps) and for `qa-run-contract.mjs` (`validateResults` with a fifth outcome value, a midnight stamp, a count mismatch, a pass with no evidence). Any browser-dependent test must not use a conditional `{ skip: ... }` as its only path: pair a real-browser test with a degraded-path assertion (the shape Task 4's VALIDATE uses), or it becomes a latent vacuous-green path.
- **Which drivers land (decided, stated plainly):** browser (Playwright) and HTTP are ACTIVE. The CLI driver and the read-only DB verification driver are NOT built in this phase (PRD Should-items; Open Question 3 is for the Phase 5 dogfood to resolve against the real case mix). A case needing either returns `needs-human` with its steps verbatim, which keeps the narrow MVP honest rather than dishonest.
- **Division of labor (decided):** the case list is derived by the script's parser, never by the command; the command contributes only the plan, and the script validates it. The plan is written by the command with the `Write` tool into the run directory the script created, so the runner's own writes stay confined and the report stays read-only input. A case the command declines to plan, or plans badly, degrades to `needs-human` or `fail`/`blocked` with evidence — it can never vanish, because the count invariant is enforced in code.
- **Environment handle (decided, flagged for the human):** `docs/decisions.md` [2026-09-21] item 4 says "one file per worktree, at a fixed path" but names neither the path nor the format, and the PRD that would fix them does not exist; [2026-05-15] forbids approximating any of the six strategies. The runner therefore does NOT discover a handle. It reads one only from an explicit `--env-handle <path>` JSON file and takes exactly one key, `baseUrl`; otherwise it falls back to `PRPs/auth/login.config.json` `baseUrl` (the project's own tracked declaration); with neither, every case needing a target is `blocked` `TARGET_UNDECLARED` and cases needing none are unaffected. The registered environment-handle PRD will replace this seam; the flag's reader is the one place to change.
- **Seed declaration location (decided, flagged for the human):** the registration says seed or fixture commands are "declared in `methodology.md` / `testing.md`", but `testing.md` does not exist here, `methodology.md` has no seed key, and the machine-readable environment declaration ([2026-09-21] item 1) is registered but undecided. Rather than inventing a methodology key (which would touch `context-builder` and the gating-structure check), this plan introduces the tracked, value-free `PRPs/auth/qa-seed.json` (`{ "states": { "<exact required-state text>": { "command": [argv...] } } }`) on the kit's tracked side. Matching is exact string equality, so nothing is inferred; the kit's own user creation (the login scripts) covers `role-only` states. If the human prefers a different declaration location, the change is confined to Task 5.
- **Open Question 1 (markdown sibling) — decided:** not built; the terminal summary plus `results.json` ship, per the PRD's Could-item. **Open Questions 2 and 4** are untouched by this phase.
- **AC-10 and AC-12 stay unproven.** Phase 3 delivered no real authenticated `capture.mjs` render and no exercised headed or form browser login. This phase cannot discharge either: Task 4 exercises the kit's API-mode login against a loopback fixture and a Chromium-dependent browser path that may be unavailable, and neither runs `capture.mjs` against a real application. Both remain for the Phase 5 dogfood; no Acceptance Criterion above claims them.
- **Write boundary, stated precisely:** the runner process writes only inside `PRPs/reports/<feature>/qa-run/<run-id>/`. To obtain a session it spawns the kit's own `PRPs/auth/login-<role>.mjs`, which writes only under `PRPs/auth/.sessions/` after proving the ignore rules; a declared seed command writes to whatever store the project declared. None of these touches `qa-report.md`.
- **Why `fail` and `blocked` are split the way they are:** `fail` is reserved for an expectation the runner evaluated and found unmet (a real finding, counted as automated); everything that prevents an attempt (no target, no role, no session, undeclared state, unreachable server, missing browser, unperformable step, unwritable evidence, abort) is `blocked` with a stable `reason_code`, so the PRD's "unresolved residue" partition (`needs-human` plus `blocked`) stays an exact complement of the automated outcomes.
- **timestamp-contract:** this phase adds no reviewer agent and no command that dispatches one, so `timestamp-contract.mjs` is not edited. AC-13's real instants come from the script's own clock (`new Date().toISOString()`), which that check does not constrain; the `qa-run-contract` check pins the stamp shape in any tracked `results.json`.
- **Hard boundary:** no task edits `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` or `capture.mjs`; Level 2 and Task 10 assert byte-identity with the single-argument tree form `git diff --quiet <base>`. The two auth commands, `auth-local-guard.mjs`, `auth-login.template.mjs` and `relay-execute.md` are also frozen because pinned negative assertions in the corpus (`relay-auth-scripts.md` must not mention `/relay-qa-run`; no other command may contain `relay-auth-setup`; `relay-execute.md` must not mention `auth-model` or `auth-setup`) would break.
- **Documentation ownership:** the docs-updater contract forbids writing under `documentation/`, so Task 10 is an Implementer task, with a changelog entry per `documentation/AGENTS.md`. `docs/api-reference.md` is an Implementer task here (Task 9) because the corpus pins its `21 commands` literal; `docs/context/architecture.md` (`21 implemented`, `21 commands`) and `CLAUDE.md` (`27 static consistency checks`) are left to docs-sync.
- **Environment:** heredocs through Bash do not work here — every file is created with the `Write` or `Edit` tool, and every file written must be LF-only (`line-endings` check). Files created before `git add` are invisible to the line-endings check's tracked set; keep them LF regardless.
- **Diff base:** the tree object `9e9ce214b9361929fadbbcbdb62c7df012d15cb4` is this phase's base; only the single-argument `git diff <base>` form is used, never two-dot. The working tree is dirty with Phases 1-3, so a bare "counts still hold" command would pass before this phase does anything — Level 1 and each task's VALIDATE therefore fail first on the absence of the new files, tokens and registrations.
- **Baselines to hold:** `npm run validate` 27 passed / 0 failed before this phase (28 after Task 8); the corpus 1215 tests / 0 fail, held outside the two named pin files.

*Generated: 2026-10-02*
*Approved: 2026-10-02*
*Status: IMPLEMENTED*
