# Feature: Read-only DB driver (Phase 4 of qa-runner-case-vocabulary)

```
**Decision Gate**
- Active context: none
- Activated criteria: execution of project commands and database reads from a relay script (a new store-touching site); impact on shared contracts (`qa-run.mjs` plan vocabulary, `qa-seed.json` declaration schema, the `qa-run-contract` and `auth-local-guard-sites` validation checks); creation of a new script module; secret handling (row evidence is a new leak surface); cross-cutting artifact (a plan downstream stages consume)
- Decisions found:
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "CLI scope (D2)" — commands run only through confirmed seed declarations and declared query sources; the planning agent never writes an argv, so the `query` step names a declared `source` and supplies only `sql`
  - Same PRD, Decisions Log "Plan side only" — `/relay-qa-report` and the reports are untouched; every change lives in the planning instructions, the runner and tracked declarations
  - Same PRD, Decisions Log "Phase serialization" — phases 1-7 share `lane:qa-run`; phases 1-3 are `complete`, this phase runs fourth on the same files
  - Same PRD, Decisions Log "Frozen surfaces" — `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `scripts/visual/capture.mjs` byte-identical (AC-15)
  - Same PRD, Decisions Log "Partial plans and the outcome vocabulary" — no fifth outcome; new behavior is reason codes only
  - Phase 1 plan (`PRPs/plans/completed/qa-runner-case-vocabulary-phase-1-plan-contract-and-partial-plans.plan.md`) Task 4 and Notes — read-only query sources are a top-level `query_sources` map in `PRPs/auth/qa-seed.json` (resolves PRD Open Question 3 for this phase)
  - `docs/decisions.md` [2026-05-06] / [2026-07-10] R-X strict — the Implementer authors zero test files; tests (and the `GUARD_SITES` length assertion) are routed through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — result rows, reasons and the statement text are new leak surfaces; rows go through the redaction table and `redact_columns`, reasons carry counts only
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green" — no existing test is edited by the Implementer; the one test this phase's `GUARD_SITES` addition breaks is routed to the test pair (see Notes)
  - "Relying on interactive permission prompts in the autonomous loop" — `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - The local-only guard (parent PRD AC-1) is a hard failure at every new network- or store-touching site; this phase adds one (the query-source invocation), registered in `auth-local-guard-sites`
  - Command versus agent separation — the planning agent selects among declared names and writes `sql`; the script owns every spawn
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - `qa-run-contract` invariants stay true for `qa-run.mjs`: exact four-value `OUTCOMES`, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
  - Interactivity boundary — no new extension; no operator dialogue
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-case-vocabulary.prd.md` — Implementation Phases row 4: "Read-only DB driver" — Goal: a case can verify its effect in the database without any risk of writing — Success signal: a `SELECT` against a local fixture database asserts its row; an `UPDATE`, a multi-statement string and a `--remote` invocation are each refused by name before execution.

## Summary

This phase lets a plan verify an effect in a local database. It adds a `query` step action, `{ "action": "query", "source": "<name>", "sql": "...", "expect_rows"?: n, "expect_json"?: { path, equals } }`, usable inside both `http` and `browser` plan entries (a case such as `praesto-sum` case 23 mixes an HTTP request with a DB verification, and one plan entry has one driver). The step names a source declared by the operator in a top-level `query_sources` map of `PRPs/auth/qa-seed.json`; the declaration carries the argv prefix, the planning agent never writes argv. A new pure module, `plugins/relay/scripts/qa-query.mjs`, holds the single-statement lexical guard (`SELECT` or `WITH ... SELECT` only, no comments, no second statement, no `PRAGMA`/`ATTACH`/`VACUUM`/writes), the closed source-kind table (`wrangler-d1`, `sqlite3`) with its provably-local rules (`--local` required, `--remote`/`--preview` refused; `-readonly` required for `sqlite3`), output parsing, row assertions and row redaction. `qa-run.mjs` validates the step shape, refuses unsafe queries and unsafe sources before any state is seeded, session obtained or request sent, then runs the query with `shell: false`, bounded output, and writes redacted row evidence. The phase resolves PRD Open Question 1 (Notes), registers the module as a guard site, pins its purity in `qa-run-contract`, and rewrites the `relay-qa-run.md` vocabulary and honesty rules.

## User Story

As the operator of relay's human validation gate
I want a plan step that reads a local database and asserts the rows
So that cases whose effect is only visible in the database (`praesto-sum` case 23) are driver-executed with evidence, with no possibility that the runner writes to the store

## Problem Statement

`/relay-qa-run` cannot verify a database effect: the vocabulary has only `http` and `browser` actions, and the command doc tells the planning agent to omit any case needing a database query. `praesto-sum` case 23 needs a CLI-created row whose id is reused in a request path and a DB read to verify it. A free query step would let model judgment choose a command that the runner executes against a store, so the read path must be constrained on four axes: which statements run, which command runs, where it runs, and what reaches the evidence.

## Solution Statement

Plan side and runner side only. Add the `query` action to the closed vocabulary (flat object, validated like every other step, counted as an expectation). Resolve the command from an operator-declared source, never from the plan. Refuse, by name and before execution: a statement that is not one `SELECT`/`WITH ... SELECT` (`QUERY_NOT_READ_ONLY`), an undeclared or malformed source (`QUERY_SOURCE_UNDECLARED`, `QUERY_SOURCE_INVALID`), and a source whose invocation is not provably local (`FAILED_NON_LOCAL_TARGET`). Apply the engine's own read-only control wherever the source kind can declare one (`sqlite3 -readonly`, required by the kind rules). Re-run the lexical guard on the statement after `{{name}}` substitution, because a captured value is untrusted text. Assert rows with `expect_rows` and `expect_json`, and write redacted, bounded row evidence through the existing single write helper.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-query.mjs` (new); `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `scripts/validate/checks/auth-local-guard-sites.mjs`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | Phase 1 (`complete`): `validateStep`/`validateSteps`, `recordSteps`, per-step results, the `query_sources` schema decision. Phases 2-3 (`complete`) share the same files. |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/qa-runner-case-vocabulary.prd.md` lines 229 (row 4), 261-264 (Phase Details), 104-108 (AC-11), 116-122 (AC-15), 123 (AC-16), 127 (Open Question 1) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-case-vocabulary.prd.md` | 104-108, 127, 261-264 | AC-11, Open Question 1 and the Phase 4 scope and success signal |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 780-900 | `stepRules`, `stepVariables`, `validateStep`, `validateSteps` — where the `query` action is added |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1122-1126 | `writeEvidence` — the only way row evidence is written (redaction is applied by `writeRunFile`) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1142-1210 | `DRIVERS.http` — every step does `resolveStepUrl(step.path, ...)` first; a `query` step has no `path` and MUST be branched before that line |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1212-1300 | `DRIVERS.browser` — the step chain and the single final-capture evidence indexing that a query step must not disturb |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1423-1458 | `runSeed` — the `://` guard scan and the bounded `spawnSync` the query spawn mirrors |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1762-1855 | `executeCase` — the pre-side-effect validation order and the driver dispatch |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 155-245 | the vocabulary, the declaration schema paragraph (with the "reserved" `query_sources` sentence) and the honesty rule that tells the agent to omit database queries |
| P0 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 29-75 | `GUARD_SITES` — the new site is appended here |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 120-222 | `checkQaRunContract` — the seed-script pins the query-module pins mirror |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 470-690 | `buildRedactionTable`, `addSecretValues`, `redactJson` (secret-named keys such as `password`, `token` are redacted structurally), `writeRunFile` |
| P1 | `docs/anti-patterns.md` | 34-39 | secret-leak rule governing evidence and reasons |
| P1 | `PRPs/plans/completed/qa-runner-case-vocabulary-phase-3-seed-declaration-path.plan.md` | 531-542 | Notes: the guard-site, test-pair and refusal-order conventions this plan follows |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:790-800
function stepRules(driver, s) {
  const bad = (/** @type {string} */ why) => ({ why });
  let expectations = 0;
  if (!isObj(s) || !isStr(s.action)) {
    const keys = isObj(s) ? Object.keys(s) : [];
    const known = driver === 'http' ? HTTP_ACTIONS : BROWSER_ACTIONS;
    if (keys.length === 1 && known.includes(keys[0]) && isObj(s[keys[0]])) {
      return bad('nested step form is not accepted; use the flat shape {"action": "<name>", ...}');
    }
    return bad('not an object with a string action');
  }
```
Copied by Task 2 (`query` is added to the known-action list used by the nested-form hint for both drivers, and handled with its own rule function before the driver branch; the `bad()` reason shape and the `expectations` count are reused).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1031-1035
export function classifySeedDeclaration(decl, text) {
  const wellFormed = (/** @type {any} */ c) => Array.isArray(c) && c.length > 0 && c.every((a) => isStr(a) && a !== '');
  if (!isObj(decl) || (decl.command !== null && !wellFormed(decl.command))) {
    return { code: 'STATE_UNDECLARED', reason: `the required state is not declared: PRPs/auth/qa-seed.json states[${JSON.stringify(text)}]` };
  }
```
Copied by Task 1 (`classifyQuerySource` is a pure, ordered-refusal classifier of the same shape: `{ code, reason }` or an ok result, argv validated as a non-empty array of non-empty strings, reasons naming the source and never a value).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1439-1441
  const r = captures === null
    ? spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: 'ignore', timeout: 120000 })
    : spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', maxBuffer: 65536, timeout: 120000 });
```
Copied by Task 3 (the query spawn keeps `shell: false`, `cwd: ctx.root`, a bounded `maxBuffer` and a timeout; stderr is not piped into any evidence).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1122-1126
function writeEvidence(ctx, name, payload) {
  const abs = join(ctx.runDirAbs, 'evidence', name);
  writeRunFile(ctx, abs, payload);
  return `${ctx.runDirRel}/evidence/${name}`;
}
```
Copied by Task 3 (row evidence is a `{ kind: 'json', value }` payload so `writeRunFile` redacts it structurally; no new `writeFileSync(` call).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1802-1806
  for (const [i, s] of p.steps.entries()) {
    if (typeof s.path === 'string' && resolveStepUrl(s.path, target) === null) {
      return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`));
    }
  }
```
Copied by Task 2 (the loop skips a `query` step because it has no `path`; the query-source refusals are added next to it so they also precede `prepareState`, `obtainSession` and every driver call).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1150-1154
  const ended = (res, at) => ({ ...res, steps: recordSteps(plan.steps, at + 1, at, (j) => evidence[j] ?? null) });
  try {
    reqCtx = await ctx.playwright.request.newContext(opts);
    for (const [i, step] of plan.steps.entries()) {
      const url = resolveStepUrl(step.path, target);
```
Copied by Task 3 (a `query` step is branched at the top of this loop body, before `resolveStepUrl`, and pushes exactly one evidence path so `evidence[j]` stays aligned with the step index).

```
# SOURCE: scripts/validate/checks/auth-local-guard-sites.mjs:65-69
  {
    file: 'plugins/relay/scripts/qa-run.mjs',
    required: ['auth-local-guard.mjs', 'checkTarget', 'FAILED_NON_LOCAL_TARGET', '// GUARD-SITE'],
    forbidden: ['--local-host'],
  },
```
Copied by Task 5 (the new entry for `qa-query.mjs` has the same `{ file, required, forbidden }` shape; the existing entries are not edited).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:183-193
  if (seedScriptText === null) {
    add(`missing or unreadable file: ${SEED_SCRIPT_FILE}`, SEED_SCRIPT_FILE);
  } else if (typeof seedScriptText === 'string') {
    const marker = '// WRITE-SITE';
    const nMarker = occurrences(seedScriptText, marker);
    if (nMarker !== 1) add(`the seed script must contain ${marker} exactly once, found ${nMarker}`, SEED_SCRIPT_FILE);
    for (const call of ['writeFileSync(', 'renameSync(']) {
      const n = occurrences(seedScriptText, call);
      if (n !== 1) add(`the seed script single-write-helper rule: ${call} must appear exactly once, found ${n}`, SEED_SCRIPT_FILE);
    }
    if (seedScriptText.includes('child_process')) add('the seed script must not use child_process: the generator executes nothing', SEED_SCRIPT_FILE);
```
Copied by Task 5 (optional input, `null` means missing file, `undefined` adds nothing, so existing callers and fixtures are unaffected).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:240-245
Honesty rules:

- Omit any case that needs an email inbox, SMS, a physical device, a third-party
  payment, a subjective visual judgment, a CLI, a database query or any action
  outside the vocabulary. The script records it `needs-human` with the steps
  verbatim.
```
Copied by Task 4 (the phrase "a database query" leaves this omit-list; a database read becomes plannable only through a declared source).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-query.mjs` | CREATE | pure module: lexical read-only guard, closed source-kind table with provably-local rules, query argv assembly, output parsing, row assertions, row redaction, plan-step pre-check |
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | `query` action in `stepRules`; pre-side-effect refusals in `executeCase`; exported `runQueryStep`; `query` branches in `DRIVERS.http` and `DRIVERS.browser` |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | literal `query` step example, `query_sources` schema, new refusal codes, honesty rule no longer omits database reads |
| `scripts/validate/checks/auth-local-guard-sites.mjs` | UPDATE | append the `qa-query.mjs` guard site |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | pin `qa-query.mjs` purity (no process spawning, no writes, no network) and its required refusal tokens |

## NOT Building (Scope Limits)

- Any change to `/relay-qa-report` or the reports themselves; every change is plan-side and runner-side.
- A fifth outcome. New behavior is reason codes: `QUERY_NOT_READ_ONLY`, `QUERY_SOURCE_UNDECLARED`, `QUERY_SOURCE_INVALID`, `QUERY_FAILED`, `QUERY_OUTPUT_UNPARSEABLE`, `QUERY_MODULE_UNAVAILABLE` (all `blocked`); `FAILED_NON_LOCAL_TARGET` is reused.
- A free CLI step, or any argv authored by the planning agent. The plan carries only a source name and `sql`.
- A `db` driver. `query` is a step action inside `http` and `browser` entries (rationale in Notes).
- A `psql`/MySQL source kind. The kind table is closed and extensible; this phase ships `wrangler-d1` and `sqlite3`, the two the dogfood needs.
- A `status`/`confirmed` gate on query sources. No relay component writes query sources (there is no generator), so the operator's authorship of the tracked declaration is the confirmation.
- Declared API origins (Phase 5), UI grounding (Phase 6), per-test record resolution (Phase 7).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-15).
- Any test file. R-X strict: the Implementer authors zero test files; the test pair authors the corpus for this phase and updates the `GUARD_SITES` length assertion.
- Any `documentation/` edit, a release or version bump. The release is cut after the phase 8 dogfood.
- Edits to the installed plugin cache under `~/.claude/plugins/cache`.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/scripts/qa-query.mjs — lexical guard, source kinds, output and row helpers

- **ACTION**: Delivers AC-A1 (a statement that is not a single `SELECT`/`WITH ... SELECT` is refused), AC-A2 (the engine-level read-only control is required and applied wherever the kind can declare one) and AC-A3 (a source that is not provably local is refused `FAILED_NON_LOCAL_TARGET`) as pure functions. Create `plugins/relay/scripts/qa-query.mjs` as a Node ESM script (`#!/usr/bin/env node` is NOT needed: it is a module; start with `// @ts-check` and a header comment naming the contract). It MUST NOT import `node:child_process` or any `node:fs` write function, MUST NOT contain `fetch(`, and MUST NOT import `qa-run.mjs` (no cycle). It has no I/O at all. Exports:
  1. `QUERY_SOURCE_KINDS = ['wrangler-d1', 'sqlite3']`.
  2. `checkReadOnlySql(sql)` returning `{ ok: true }` or `{ ok: false, reason }`. A reason never contains any part of the statement beyond a keyword name. A tokenizing scan (not a regex over the whole text) enforces, in this order:
     - `sql` is a string, trimmed length 1 to 4096, and holds no control character other than space, tab, CR and LF (NUL included);
     - quoted tokens are skipped as units: `'...'` (with `''` escapes), `"..."`, `` `...` `` and `[...]`; an unterminated quote is refused;
     - outside quoted tokens, ANY comment opener (`--` or `/*`), any `$`, any backslash, and unbalanced parentheses are refused (comments and dollar quoting are how a second statement hides; refuse them wholesale, never strip them);
     - a `;` outside quotes is allowed only as the single last non-whitespace character; any other `;` is refused as a second statement;
     - the first unquoted word, case-insensitive, is exactly `SELECT` or `WITH` (`WITH` may be followed by `RECURSIVE`); anything else (`PRAGMA`, `ATTACH`, `VACUUM`, `EXPLAIN`, `VALUES`, `INSERT`, `UPDATE`, ...) is refused;
     - any unquoted word from this denylist is refused wherever it appears: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `ATTACH`, `DETACH`, `PRAGMA`, `VACUUM`, `REINDEX`, `TRUNCATE`, `GRANT`, `REVOKE`, `MERGE`, `COPY`, `CALL`, `INTO`, `LOAD_EXTENSION`, `WRITEFILE`, `READFILE`, `NEXTVAL`, `SETVAL`, `SET_CONFIG`, `PG_SLEEP`, `LO_IMPORT`, `LO_EXPORT`, `DBLINK`; `REPLACE` is refused unless the next token is `(` (the SQL function `replace(...)` is a read, `REPLACE INTO` is a write); a quoted identifier such as `"update"` is not a word and passes;
     - a `WITH` statement must also contain the unquoted word `SELECT`.
     The denylist is a net, not the boundary: the statement shape, the engine control and the local-only invocation are the boundary (Notes).
  3. `neutralizeVariables(sql)` replacing every `{{name}}` (the runner's `VARIABLE_PATTERN` shape: `\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}`) with `0`, for the pre-substitution check of a statement template.
  4. `classifyQuerySource(sources, name)` where `sources` is the `query_sources` map (any non-object means no sources). Ordered refusals, each `{ ok: false, code, reason }` with `blocked`-class codes and a reason naming only the source name: `QUERY_SOURCE_UNDECLARED` when `name` is not an own key of an object `sources` or the entry is not an object; `QUERY_SOURCE_INVALID` when `kind` is not in `QUERY_SOURCE_KINDS`, `command` is not a non-empty array of at most 64 non-empty strings, or `redact_columns` is present and is not an array of non-empty strings; then the kind rules. `wrangler-d1`: `FAILED_NON_LOCAL_TARGET` when `--local` is absent, or any element equals or starts with `--remote` or `--preview`, or any element contains `://` and is not the flag's own value (a `://` element is additionally passed to the async guard by the runner; the pure check refuses only `--remote`/`--preview`/missing `--local`); `QUERY_SOURCE_INVALID` when `--json` is absent or the LAST element is not `--command`. `sqlite3`: `FAILED_NON_LOCAL_TARGET` when any element contains `://` or starts with `file:`; `QUERY_SOURCE_INVALID` when `-readonly` or `-json` is absent, or an element is `-cmd`, `-init` or `-interactive`. On success return `{ ok: true, kind, argv, redactColumns, readOnlyControl }` where `readOnlyControl` is `'sqlite3 -readonly'` for `sqlite3` and `'none (lexical guard and --local only)'` for `wrangler-d1`. The source's `command` is the argv PREFIX; the statement is appended by `buildQueryArgv`.
  5. `buildQueryArgv(source, sql)` returning `[...source.argv, sql]` (the statement is one argv element, never concatenated into a shell string).
  6. `parseQueryOutput(kind, stdoutText)` returning `{ ok: true, rows }` or `{ ok: false }`. `wrangler-d1`: parse the trimmed stdout as JSON (when that fails, retry from the first line that starts with `[` or `{`); the document is an array whose first element has an array `results`, which are the rows; anything else is `{ ok: false }`. `sqlite3`: an empty stdout is zero rows (`-json` prints nothing for an empty result); otherwise a JSON array of objects. Rows must be an array of plain objects or the result is `{ ok: false }`.
  7. `checkRows(rows, step)` returning `{ ok: true }` or `{ ok: false, reason }`: when `step.expect_rows` is defined the row count must equal it; when `step.expect_json` is defined, the value at its dotted `path` evaluated over the rows array (`"0.status"` is the `status` of the first row; split on `.` and index, returning undefined when any hop is missing) must equal `equals` under `JSON.stringify` comparison. A reason states counts or the path only, NEVER a row value or the expected value.
  8. `redactRows(rows, columns)` returning a deep-enough copy where every listed column's value is the string `[REDACTED]` (the input is not mutated).
  9. `precheckQuerySteps(steps, sources)` returning `null` or `{ code, reason }` for the first `query` step (other actions are ignored) that fails: `checkReadOnlySql(neutralizeVariables(step.sql))` refused gives `QUERY_NOT_READ_ONLY` with the reason `step <n>: <why>`; then `classifyQuerySource(sources, step.source)` refused gives its `code` with the reason prefixed `step <n>: `.
  Never log, return or echo a statement fragment or a source `command` value in any reason.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1031-1035` (ordered-refusal classifier shape, argv well-formedness, reasons that name the declaration and never a value).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import * as q from "./plugins/relay/scripts/qa-query.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const Q = String.fromCharCode(39);
  const accept = [
    "SELECT id, name FROM tasks WHERE id = 7",
    "select 1;",
    "WITH t AS (SELECT 1 AS a) SELECT a FROM t",
    "SELECT replace(name, " + Q + "a" + Q + ", " + Q + "b" + Q + ") FROM t",
    "SELECT " + Q + ";" + Q + " AS semi",
    "SELECT \"update\" FROM t",
  ];
  for (const s of accept) { const r = q.checkReadOnlySql(s); if (!r.ok) fail("a read-only statement was refused: " + s + " -> " + JSON.stringify(r)); }
  const refuse = [
    "UPDATE t SET a = 1", "DELETE FROM t", "REPLACE INTO t VALUES (1)", "SELECT 1; SELECT 2", "SELECT 1; DROP TABLE t", "SELECT 1;;",
    "PRAGMA query_only = 0", "ATTACH DATABASE x AS y", "VACUUM", "EXPLAIN SELECT 1", "SELECT 1 -- hi", "SELECT /* x */ 1",
    "WITH t AS (SELECT 1) INSERT INTO u SELECT * FROM t", "SELECT * INTO u FROM t", "SELECT load_extension(" + Q + "x" + Q + ")",
    "SELECT 1 FROM t FOR UPDATE", "", "   ", "SELECT 1 FROM t WHERE a = " + Q + "open", "SELECT $$x$$", "SELECT (1", "SELECT 1\u0000", 5,
  ];
  for (const s of refuse) { const r = q.checkReadOnlySql(s); if (r.ok) fail("an unsafe statement was accepted: " + JSON.stringify(s)); }
  const d1 = ["wrangler", "d1", "execute", "db", "--local", "--json", "--command"];
  const good = q.classifyQuerySource({ a: { kind: "wrangler-d1", command: d1, redact_columns: ["email"] } }, "a");
  if (!good.ok || good.readOnlyControl.indexOf("none") !== 0 || good.redactColumns[0] !== "email") fail("a local wrangler-d1 source was refused: " + JSON.stringify(good));
  const codeOf = (decl) => { const r = q.classifyQuerySource({ a: decl }, "a"); return r.ok ? "OK" : r.code; };
  if (codeOf({ kind: "wrangler-d1", command: [...d1, "--remote"] }) !== "FAILED_NON_LOCAL_TARGET") fail("--remote was not refused");
  if (codeOf({ kind: "wrangler-d1", command: ["wrangler", "d1", "execute", "db", "--json", "--command"] }) !== "FAILED_NON_LOCAL_TARGET") fail("a missing --local was not refused");
  if (codeOf({ kind: "wrangler-d1", command: [...d1.slice(0, -1), "--preview", "--command"] }) !== "FAILED_NON_LOCAL_TARGET") fail("--preview was not refused");
  if (codeOf({ kind: "wrangler-d1", command: ["wrangler", "d1", "execute", "db", "--local", "--command"] }) !== "QUERY_SOURCE_INVALID") fail("a missing --json was not refused");
  if (codeOf({ kind: "wrangler-d1", command: [...d1, "extra"] }) !== "QUERY_SOURCE_INVALID") fail("a command not ending in --command was not refused");
  if (codeOf({ kind: "mysql", command: d1 }) !== "QUERY_SOURCE_INVALID") fail("an unknown kind was not refused");
  if (codeOf({ kind: "sqlite3", command: ["sqlite3", "-readonly", "-json", "x.db"] }) !== "OK") fail("a read-only sqlite3 source was refused");
  const sq = q.classifyQuerySource({ a: { kind: "sqlite3", command: ["sqlite3", "-readonly", "-json", "x.db"] } }, "a");
  if (sq.readOnlyControl !== "sqlite3 -readonly") fail("sqlite3 did not report its engine control");
  if (codeOf({ kind: "sqlite3", command: ["sqlite3", "-json", "x.db"] }) !== "QUERY_SOURCE_INVALID") fail("sqlite3 without -readonly was accepted");
  if (codeOf({ kind: "sqlite3", command: ["sqlite3", "-readonly", "-json", "-cmd", "x", "x.db"] }) !== "QUERY_SOURCE_INVALID") fail("sqlite3 -cmd was accepted");
  if (codeOf({ kind: "sqlite3", command: ["sqlite3", "-readonly", "-json", "http://example.com/x.db"] }) !== "FAILED_NON_LOCAL_TARGET") fail("a URL database was not refused");
  if (q.classifyQuerySource({}, "a").code !== "QUERY_SOURCE_UNDECLARED" || q.classifyQuerySource(null, "a").code !== "QUERY_SOURCE_UNDECLARED") fail("an undeclared source was not refused");
  const argv = q.buildQueryArgv(good, "SELECT 1");
  if (argv.length !== d1.length + 1 || argv[argv.length - 1] !== "SELECT 1") fail("the statement is not the last argv element");
  const w = q.parseQueryOutput("wrangler-d1", JSON.stringify([{ results: [{ id: 1 }], success: true }]));
  if (!w.ok || w.rows.length !== 1 || w.rows[0].id !== 1) fail("wrangler output was not parsed: " + JSON.stringify(w));
  if (q.parseQueryOutput("wrangler-d1", "not json").ok) fail("garbage output was accepted");
  if (!q.parseQueryOutput("sqlite3", "").ok || q.parseQueryOutput("sqlite3", "").rows.length !== 0) fail("empty sqlite3 output is zero rows");
  const rows = [{ id: 1, status: "done", email: "a@b.test" }];
  if (!q.checkRows(rows, { expect_rows: 1 }).ok || q.checkRows(rows, { expect_rows: 2 }).ok) fail("expect_rows is wrong");
  if (!q.checkRows(rows, { expect_json: { path: "0.status", equals: "done" } }).ok || q.checkRows(rows, { expect_json: { path: "0.status", equals: "open" } }).ok) fail("expect_json is wrong");
  const why = q.checkRows(rows, { expect_json: { path: "0.status", equals: "open" } }).reason;
  if (why.includes("done") || why.includes("open")) fail("a row or expected value leaked into a reason: " + why);
  const red = q.redactRows(rows, ["email"]);
  if (red[0].email !== "[REDACTED]" || red[0].id !== 1 || rows[0].email !== "a@b.test") fail("redactRows is wrong or mutated its input");
  const sources = { d1: { kind: "wrangler-d1", command: d1 } };
  const step = (sql, source = "d1") => ({ action: "query", source, sql, expect_rows: 1 });
  if (q.precheckQuerySteps([{ action: "request" }, step("SELECT id FROM t WHERE id = {{task_id}}")], sources) !== null) fail("a clean plan was refused");
  const bad = q.precheckQuerySteps([step("SELECT 1"), step("UPDATE t SET a = 1")], sources);
  if (!bad || bad.code !== "QUERY_NOT_READ_ONLY" || !bad.reason.includes("step 2")) fail("an UPDATE step was not refused by name: " + JSON.stringify(bad));
  const und = q.precheckQuerySteps([step("SELECT 1", "nope")], sources);
  if (!und || und.code !== "QUERY_SOURCE_UNDECLARED") fail("an undeclared source was not refused");
  '
  if grep -qE "child_process|writeFileSync|renameSync|appendFileSync|fetch\(" plugins/relay/scripts/qa-query.mjs; then echo "FAIL: the query module must be pure (no process, write or network surface)"; exit 1; else echo "PASS: pure module"; fi
  ```
  Before this task the file does not exist, so the dynamic import fails and the block exits non-zero. The SQL fixtures build single quotes with `String.fromCharCode(39)` so the whole script sits inside one bash single-quoted string.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the `query` step in the vocabulary and refusals before any side effect

- **ACTION**: Delivers AC-A1 (an unsafe statement is refused `QUERY_NOT_READ_ONLY` before execution) and AC-A3 (an unsafe or non-local source is refused before execution), and the plan-time half of AC-A4 (a `query` step needs an `expect_rows` or `expect_json` expectation). In `plugins/relay/scripts/qa-run.mjs`:
  1. Load `qa-query.mjs` lazily, never with a static top-level import: a cached `loadQueryModule()` that performs exactly one `import('./qa-query.mjs')` (with `.catch(() => null)`), called only when a plan entry carries a `query` step and before any seed, session or request; a failed load blocks the case `QUERY_MODULE_UNAVAILABLE`. (Amended 2026-10-06: the original static import broke every existing test that copies `qa-run.mjs` alone into a temp plugin dir, which R-X forbids the Implementer to fix; see Notes.) Keep the existing imports and the `spawnSync` import untouched.
  2. In `stepRules`, add `'query'` to the known-action lists used by the nested-form hint for BOTH drivers (so `{ "query": { ... } }` is rejected with the existing flat-shape reason), and handle `s.action === 'query'` for both `http` and `browser` BEFORE the driver branch, with rules (reason text without a step prefix): `source` must be a string matching `^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$` (`query needs a source name of letters, digits, _ or -`); `sql` must be a non-empty string (`query needs a string sql`); `expect_rows`, when present, must be a non-negative integer (`expect_rows must be a non-negative integer`); `expect_json`, when present, must be an object with a string `path` and an own `equals` key (reuse the HTTP wording `expect_json needs path and equals`); at least one of the two expectations must be present (`query needs expect_rows or expect_json`); each present expectation increments `expectations`. Existing messages for `http` and `browser` steps stay byte-for-byte identical (existing tests pin them), and `{{name}}` scanning already covers `sql` because it walks every string leaf except `action`.
  3. In `executeCase`, immediately after the `human_remainder` shape check and BEFORE the `target === null` check, add: `const unsafeQuery = precheckQuerySteps(p.steps, seedConfig && isObj(seedConfig) ? seedConfig.query_sources : undefined); if (unsafeQuery) return out(blocked(unsafeQuery.code, unsafeQuery.reason));` (`seedConfig` is the variable already read for `declaredCaptureNames`). This precedes `prepareState`, `obtainSession` and every driver call.
  4. After the existing per-step path loop (the `resolveStepUrl` pre-check, which ignores `query` steps because they have no `path`) and still before `prepareState`, add a loop over the `query` steps: for each, `const src = classifyQuerySource(sources, step.source)` (re-derive, it is cheap) and for every `src.argv` element containing `://` call `await ctx.target.guard.checkTarget(element, { root: ctx.root })`; a failing check returns `out(blocked('FAILED_NON_LOCAL_TARGET', 'step <n>: a query source argument names a non-local URL; nothing was executed'))`. The reason names the step number only.
  5. Do not add a second `// GUARD-SITE` marker, any `writeFileSync(` or `renameSync(` call, or an `outcome:` literal outside the four values. Do not change `OUTCOMES`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:790-800` (the `stepRules` head and the nested-form hint) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1802-1806` (the pre-side-effect refusal loop).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { validateStep, validateSteps } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const good = { action: "query", source: "d1-local", sql: "SELECT status FROM tasks WHERE id = 7", expect_rows: 1 };
  for (const d of ["http", "browser"]) { const r = validateStep(d, good); if (r !== null) fail("a valid query step was rejected for " + d + ": " + JSON.stringify(r)); }
  const bads = [
    ["no source", { action: "query", sql: "SELECT 1", expect_rows: 1 }],
    ["bad source name", { action: "query", source: "a b", sql: "SELECT 1", expect_rows: 1 }],
    ["no sql", { action: "query", source: "d1-local", expect_rows: 1 }],
    ["no expectation", { action: "query", source: "d1-local", sql: "SELECT 1" }],
    ["negative rows", { action: "query", source: "d1-local", sql: "SELECT 1", expect_rows: -1 }],
    ["fractional rows", { action: "query", source: "d1-local", sql: "SELECT 1", expect_rows: 1.5 }],
    ["expect_json without equals", { action: "query", source: "d1-local", sql: "SELECT 1", expect_json: { path: "0.a" } }],
  ];
  for (const [label, s] of bads) if (validateStep("http", s) === null) fail("an invalid query step was accepted: " + label);
  const nested = validateStep("http", { query: { source: "d1-local", sql: "SELECT 1" } });
  if (!nested || !nested.reason.includes("flat shape")) fail("the nested query form was not rejected naming the flat shape: " + JSON.stringify(nested));
  const withVar = { action: "query", source: "d1-local", sql: "SELECT id FROM t WHERE id = {{task_id}}", expect_rows: 1 };
  const unbound = validateSteps("http", [withVar], []);
  if (!unbound || unbound.code !== "PLAN_ENTRY_INVALID" || !unbound.reason.includes("task_id")) fail("an unbound variable in sql was not refused by name: " + JSON.stringify(unbound));
  if (validateSteps("http", [withVar], ["task_id"]) !== null) fail("a query-only entry with a bound variable was refused (a query expectation counts)");
  const legacy = validateStep("http", { action: "request", method: "GET", path: "/a" });
  if (legacy !== null) fail("an existing http step stopped validating");
  '
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { spawnSync } from "node:child_process";
  const fail = (m) => { console.error(m); process.exit(1); };
  const SCRIPT = "plugins/relay/scripts/qa-run.mjs";
  const root = mkdtempSync(join(tmpdir(), "qa-query-pre-"));
  const runRel = "PRPs/reports/f/qa-run/r1";
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(join(root, ...runRel.split("/")), { recursive: true });
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://localhost:3999", roles: {} }));
  writeFileSync(join(root, "marker.mjs"), "import { writeFileSync } from \"node:fs\"; writeFileSync(\"ran.txt\", \"x\");");
  const mk = (extra) => [process.execPath, "marker.mjs", ...extra, "--json", "--command"];
  writeFileSync(join(root, "PRPs", "auth", "qa-seed.json"), JSON.stringify({ states: {}, query_sources: {
    ok: { kind: "wrangler-d1", command: mk(["--local"]) },
    remote: { kind: "wrangler-d1", command: mk(["--local", "--remote"]) },
  } }));
  const block = (n) => "### " + n + ". Case " + n + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** none\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. Do it\n\n";
  const report = join(root, "PRPs", "reports", "f", "qa-report.md");
  writeFileSync(report, "# QA\n\n## Cases\n\n" + block(1) + block(2) + block(3));
  const parsed = spawnSync(process.execPath, [SCRIPT, "parse", "--report", report], { encoding: "utf8" });
  if (parsed.status !== 0) fail("parse exited " + parsed.status + ": " + parsed.stderr);
  const doc = JSON.parse(parsed.stdout);
  const cases = Array.isArray(doc) ? doc : doc.cases;
  const entry = (i, sql, source) => ({ index: cases[i].index, title: cases[i].title, driver: "http", role: null, state: "none", steps: [{ action: "query", source, sql, expect_rows: 1 }] });
  writeFileSync(join(root, ...runRel.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: [
    entry(0, "UPDATE tasks SET status = 1", "ok"),
    entry(1, "SELECT id FROM tasks", "remote"),
    entry(2, "SELECT id FROM tasks", "nope"),
  ] }));
  spawnSync(process.execPath, [SCRIPT, "run", "--root", root, "--feature", "f", "--run-dir", runRel], { encoding: "utf8" });
  const results = JSON.parse(readFileSync(join(root, ...runRel.split("/"), "results.json"), "utf8"));
  const want = ["QUERY_NOT_READ_ONLY", "FAILED_NON_LOCAL_TARGET", "QUERY_SOURCE_UNDECLARED"];
  want.forEach((code, i) => {
    const c = results.cases[i];
    if (c.outcome !== "blocked" || c.reason_code !== code) fail("case " + (i + 1) + " was not blocked " + code + ": " + JSON.stringify([c.outcome, c.reason_code, c.reason]));
  });
  if (existsSync(join(root, "ran.txt"))) fail("a refused query command was executed");
  '
  [ "$(grep -cF "import('./qa-query.mjs')" plugins/relay/scripts/qa-run.mjs)" -eq 1 ]
  ```
  Before this task the `query` action is rejected as an unknown http action, so the first assertion exits non-zero. The second block drives the real `run` mode: all three refusals happen without Playwright because they precede the target and Playwright gates, and the marker file proves no command ran. The fixture titles are read from `qa-run.mjs parse`, not assumed; if the shared parser needs a different heading shape, adjust the fixture, not the assertions.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — run a query step and assert, with redacted row evidence

- **ACTION**: Delivers AC-A4 (rows asserted with `expect_rows`/`expect_json`; redacted rows written as evidence), AC-A2 (the source's engine-level control is applied: the kind rules in Task 1 make `sqlite3 -readonly` mandatory, and the evidence records which control applied) and AC-A6 (no row value, statement fragment or expected value in any reason; stderr never reaches evidence). In `plugins/relay/scripts/qa-run.mjs`:
  1. Import the remaining helpers from `./qa-query.mjs`: `checkReadOnlySql`, `buildQueryArgv`, `parseQueryOutput`, `checkRows`, `redactRows`.
  2. Add and export `async function runQueryStep(ctx, kase, step, n)` next to `writeEvidence`. It is self-sufficient (it re-validates everything, so a direct call is as safe as a call through `executeCase`) and returns `{ ok: true, evidence }` or `{ ok: false, result }` where `result` is a `CaseResult` (`evidence` holds the path written for this step when one was written). In order:
     - `checkReadOnlySql(step.sql)` on the FINAL statement (after `{{name}}` substitution, because a captured value is untrusted text) refused gives `blocked('QUERY_NOT_READ_ONLY', 'step <n>: <why>')`; nothing is spawned;
     - `classifyQuerySource(ctx.seedConfig && isObj(ctx.seedConfig) ? ctx.seedConfig.query_sources : undefined, step.source)` refused gives `blocked(code, 'step <n>: <reason>')`;
     - every argv element containing `://` goes through `await ctx.target.guard.checkTarget(element, { root: ctx.root })`; a failure gives `blocked('FAILED_NON_LOCAL_TARGET', 'step <n>: a query source argument names a non-local URL; nothing was executed')`;
     - spawn: `spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', maxBuffer: 1048576, timeout: 60000 })` with `argv = buildQueryArgv(src, step.sql)`. A spawn error, a timeout, `ENOBUFS` or a non-zero exit gives `blocked('QUERY_FAILED', 'step <n>: the query command failed, timed out or exceeded the output bound')` (the exit status number may be named, nothing else);
     - `parseQueryOutput(src.kind, r.stdout)` not ok gives `blocked('QUERY_OUTPUT_UNPARSEABLE', 'step <n>: the query output could not be parsed as rows')`;
     - register the values of every `redact_columns` column in `ctx.table` with `addSecretValues(ctx.table, <string values>)` BEFORE any write, then write evidence with `writeEvidence(ctx, \`case-${kase.index}.query-${n}.json\`, { kind: 'json', value: { source: step.source, kind: src.kind, read_only_control: src.readOnlyControl, statement: step.sql, row_count: rows.length, truncated: rows.length > 100, rows: redactRows(rows.slice(0, 100), src.redactColumns) } })`; a throw from the write gives `blocked('EVIDENCE_WRITE_FAILED', 'step <n>: the evidence could not be written')`;
     - assertions run on the RAW in-memory rows via `checkRows(rows, step)`; a failure gives `{ outcome: 'fail', reason_code: null, reason: 'step <n>: <reason from checkRows>', evidence: [<path>] }`; success gives `{ ok: true, evidence: <path> }`.
  3. `DRIVERS.http`: at the TOP of the loop body, before `resolveStepUrl(step.path, target)`, branch on `step.action === 'query'`: call `runQueryStep(ctx, kase, step, i + 1)`; on `ok: false` push the result's evidence path (when any) onto `evidence` and `return ended({ ...res.result, evidence }, i)`; on `ok: true` push the path and `continue`. Each query step pushes exactly one path so `evidence[j]` still lines up with step `j`.
  4. `DRIVERS.browser`: add an `else if (step.action === 'query')` branch to the step chain. Keep query evidence in a separate `Map` keyed by zero-based step index, NOT in the `evidence` array whose index 0 is the final page capture; assemble `evidence` as the query paths followed by the capture, and make the `recordSteps` evidence callback return the map entry for a query step and the existing final-capture value for the last-run step. A failed or blocked query sets `verdict` to its result and breaks, exactly like the other branches.
  5. `executeCase` needs no further change: substituted `steps` already reach the drivers, and `applyPartialRemainder` still wraps the result. Do not add any `writeFileSync(` or `renameSync(` call, a second `// GUARD-SITE` marker, or an `outcome:` literal outside the four values.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1439-1441` (bounded `shell: false` spawn), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1122-1126` (evidence through `writeEvidence`) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1150-1154` (the http loop head the query branch precedes).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { runQueryStep, buildRedactionTable } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const root = mkdtempSync(join(tmpdir(), "qa-query-run-"));
  const runDirRel = "PRPs/reports/f/qa-run/r1";
  const runDirAbs = join(root, ...runDirRel.split("/"));
  mkdirSync(join(runDirAbs, "evidence"), { recursive: true });
  const stub = [
    "import { writeFileSync } from \"node:fs\";",
    "const a = process.argv.slice(2);",
    "writeFileSync(\"argv.txt\", JSON.stringify(a));",
    "const sql = a[a.length - 1];",
    "if (sql.includes(\"boom\")) process.exit(3);",
    "if (sql.includes(\"garbage\")) { process.stdout.write(\"not json\"); process.exit(0); }",
    "process.stdout.write(JSON.stringify([{ results: [{ id: 7, status: \"done\", email: \"person@example.test\" }], success: true }]));",
  ].join("\n");
  writeFileSync(join(root, "fake-d1.mjs"), stub);
  const cmd = [process.execPath, "fake-d1.mjs", "--local", "--json", "--command"];
  const seedConfig = { query_sources: {
    d1: { kind: "wrangler-d1", command: cmd, redact_columns: ["email"] },
    urlsrc: { kind: "wrangler-d1", command: [...cmd.slice(0, -1), "http://example.com/x", "--command"] },
  } };
  const guard = { checkTarget: async (u) => (u.includes("example.com") ? { ok: false, reason: "not local", host: "example.com" } : { ok: true }) };
  const ctx = { root, runDirAbs, runDirRel, table: buildRedactionTable({ root, env: {} }), seedConfig, target: { guard } };
  const run = (sql, extra = {}, source = "d1") => runQueryStep(ctx, { index: 1 }, { action: "query", source, sql, ...extra }, 1);
  const argvFile = join(root, "argv.txt");
  const okSql = "SELECT id, status, email FROM tasks WHERE id = 7";
  const ok = await run(okSql, { expect_rows: 1, expect_json: { path: "0.status", equals: "done" } });
  if (!ok.ok || typeof ok.evidence !== "string") fail("a matching query step did not pass: " + JSON.stringify(ok));
  const ev = readFileSync(join(root, ...ok.evidence.split("/")), "utf8");
  if (!ev.includes("done") || !ev.includes("[REDACTED]") || ev.includes("person@example.test")) fail("row evidence is not redacted by column: " + ev);
  const sent = JSON.parse(readFileSync(argvFile, "utf8"));
  if (sent[sent.length - 1] !== okSql || sent.filter((x) => x === okSql).length !== 1) fail("the statement was not passed as the single last argv element");
  const wrong = await run(okSql, { expect_rows: 2 });
  if (wrong.ok || wrong.result.outcome !== "fail" || wrong.result.reason.includes("done") || wrong.result.reason.includes("person@example.test")) fail("a wrong row count was not a value-free fail: " + JSON.stringify(wrong));
  const wrongJson = await run(okSql, { expect_json: { path: "0.status", equals: "open" } });
  if (wrongJson.ok || wrongJson.result.outcome !== "fail" || wrongJson.result.reason.includes("open")) fail("a wrong expect_json was not a value-free fail");
  rmSync(argvFile);
  const upd = await run("UPDATE tasks SET status = 1", { expect_rows: 1 });
  if (upd.ok || upd.result.reason_code !== "QUERY_NOT_READ_ONLY" || upd.result.outcome !== "blocked" || existsSync(argvFile)) fail("an UPDATE was not refused before execution: " + JSON.stringify(upd));
  const multi = await run("SELECT 1; SELECT 2", { expect_rows: 1 });
  if (multi.ok || multi.result.reason_code !== "QUERY_NOT_READ_ONLY" || existsSync(argvFile)) fail("a multi-statement string was not refused before execution");
  const Q = String.fromCharCode(39);
  const injected = await run("SELECT id FROM t WHERE a = " + Q + "x" + Q + "; DROP TABLE t; --", { expect_rows: 1 });
  if (injected.ok || injected.result.reason_code !== "QUERY_NOT_READ_ONLY" || existsSync(argvFile)) fail("a substituted statement was not re-checked");
  const url = await run("SELECT 1", { expect_rows: 1 }, "urlsrc");
  if (url.ok || url.result.reason_code !== "FAILED_NON_LOCAL_TARGET" || existsSync(argvFile)) fail("a non-local URL argument was not refused before execution: " + JSON.stringify(url));
  const und = await run("SELECT 1", { expect_rows: 1 }, "nope");
  if (und.ok || und.result.reason_code !== "QUERY_SOURCE_UNDECLARED") fail("an undeclared source was not refused");
  const boom = await run("SELECT 1 AS boom", { expect_rows: 1 });
  if (boom.ok || boom.result.reason_code !== "QUERY_FAILED" || boom.result.outcome !== "blocked") fail("a failing command was not QUERY_FAILED");
  const garbage = await run("SELECT 1 AS garbage", { expect_rows: 1 });
  if (garbage.ok || garbage.result.reason_code !== "QUERY_OUTPUT_UNPARSEABLE") fail("unparseable output was not QUERY_OUTPUT_UNPARSEABLE");
  '
  [ "$(grep -c 'runQueryStep(' plugins/relay/scripts/qa-run.mjs)" -ge 3 ]
  node --check plugins/relay/scripts/qa-run.mjs
  ```
  Before this task `runQueryStep` is not exported, so the import fails and the block exits non-zero. The `grep -c` line asserts the helper is defined and called from both drivers (one definition plus two call sites). The stub command stands in for `wrangler`: the kind rules key on flags (`--local`, `--json`, trailing `--command`), not on the executable name, so a stub is a faithful fixture. The driver branches themselves need Playwright to execute and are covered by the call-site count here and by the test pair's driver tests.

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — literal `query` step, `query_sources` schema, honesty rule

- **ACTION**: Delivers AC-A1 and AC-A4 for the planning agent (the doc states the step shape, the statement rule and the assertions) and AC-A6 (the declaration holds no credentials). In `plugins/relay/commands/relay-qa-run.md`, keep every other section, the required tokens (`HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs`), every existing `<!-- qa-step-example ... -->` block, the example declaration fence after the `Declaration schema.` paragraph unchanged, and the banned-token rule (the file must not contain `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`):
  1. After the `browser` step list, add the query step: one literal example preceded by the exact marker line `<!-- qa-step-example driver=http -->` and followed by a fenced `json` block holding exactly `{ "action": "query", "source": "d1-local", "sql": "SELECT status FROM tasks WHERE id = 7", "expect_rows": 1 }` (it already passes `validateStep`; the contract check validates every marker block). Prose beside it: a `query` step is valid inside `http` and `browser` entries, names a source declared in `query_sources` (never an argv, never a connection string) and supplies `sql`; `expect_rows` is an exact non-negative row count, `expect_json` is `{ "path": "<dotted path over the rows array, e.g. 0.status>", "equals": <value> }`, and at least one is required; `{{name}}` may appear in `sql`.
  2. State the statement rule: the statement must be one `SELECT` or `WITH ... SELECT`, with no comment, no second statement and no `PRAGMA`, `ATTACH`, `VACUUM` or write; anything else blocks the case `QUERY_NOT_READ_ONLY` before anything is seeded, authenticated or executed, and a captured value substituted into `sql` is checked again after substitution.
  3. In the `Declaration schema.` paragraph, replace the sentence that reserves `query_sources` for a later phase with its specification (keep `api_origins` reserved): `query_sources` is a top-level map in `PRPs/auth/qa-seed.json`; each entry has `kind` (`wrangler-d1` or `sqlite3`), `command` (the argv PREFIX; the statement is appended as the final argument, so a `wrangler-d1` command ends with `--command`) and an optional `redact_columns` list of column names whose values are written as `[REDACTED]` in evidence. Describe the kind rules in prose (no new fenced `json` block, so the existing doc-example tests that parse the declaration fence are not disturbed): a `wrangler-d1` source must carry `--local` and `--json` and must not carry `--remote` or `--preview` (otherwise `FAILED_NON_LOCAL_TARGET`, nothing executed); a `sqlite3` source must carry `-readonly` and `-json`, and no URL or `file:` argument. Any argument naming a URL is also checked by the local-only guard. State the D1 limitation honestly: D1 offers no engine-level read-only control through `wrangler`, so a D1 source relies on the statement guard plus `--local`; an operator who wants the engine control declares the local SQLite file as a `sqlite3` source instead. The refusal codes, all `blocked` and all before any command runs: `QUERY_NOT_READ_ONLY`, `QUERY_SOURCE_UNDECLARED`, `QUERY_SOURCE_INVALID`, `FAILED_NON_LOCAL_TARGET`; at run time `QUERY_FAILED` and `QUERY_OUTPUT_UNPARSEABLE`. Rows are written as evidence after `redaction-policy.md` and `redact_columns` are applied, capped at 100 rows; a failed expectation is `fail` and its reason carries counts or a path, never a value. State that on Windows the `command` must start with `node` plus the tool's script path (or an executable), because commands run without a shell.
  4. Honesty rules: remove `a database query` from the omit-list sentence (keep the rest of the list). Add a rule: plan a case that needs a database read only when the case's verification maps onto a `SELECT` against a source already named in `PRPs/auth/qa-seed.json` `query_sources`; read the source names from that file, never invent one, never write a connection string or argv, and omit the case when no source is declared.
  5. (Amended 2026-10-06) Name `QUERY_MODULE_UNAVAILABLE` beside the other query reason codes: the runner loads its query module lazily, and a case whose module cannot be loaded is `blocked QUERY_MODULE_UNAVAILABLE`, never a crash.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:240-245` (the honesty rules block being amended).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f=plugins/relay/commands/relay-qa-run.md
  grep -qF '"action": "query"' "$f"
  grep -qF 'QUERY_NOT_READ_ONLY' "$f"
  grep -qF 'QUERY_SOURCE_UNDECLARED' "$f"
  grep -qF 'QUERY_MODULE_UNAVAILABLE' "$f"
  grep -qF 'redact_columns' "$f"
  grep -qF 'expect_rows' "$f"
  grep -qF '"source": "d1-local"' "$f"
  [ "$(grep -c 'qa-step-example driver=' "$f")" -ge 3 ]
  if grep -qF 'a CLI, a database query' "$f"; then echo "FAIL: the honesty rule still tells the agent to omit database queries"; exit 1; else echo "PASS: database reads are plannable"; fi
  if grep -qE 'subagent_type|\.claude/PRPs|design-spec|relay-auth-setup' "$f"; then echo "FAIL: banned token in the runner command"; exit 1; else echo "PASS: no banned token"; fi
  node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  ```
  Before this task `"action": "query"` is absent so the first `grep` exits non-zero. The literals are copied byte-for-byte from the ACTION above (including the `**` -free JSON keys and the marker text); a text match is legitimate because the deliverable IS the doc text, and the contract check additionally proves every literal step example, including the new `query` one, validates against the script's own `validateStep`.

### Task 5: UPDATE scripts/validate/checks/auth-local-guard-sites.mjs and qa-run-contract.mjs — register the guard site, pin the module's purity

- **ACTION**: Delivers AC-A3 (the new store-touching site is enumerated so a later edit that drops its guard fails `npm run validate`), AC-A6 (the module stays free of process, write and network surface) and AC-A5 (no frozen surface is edited; this task only touches check modules, never a `*.test.mjs`). Two check modules:
  1. `scripts/validate/checks/auth-local-guard-sites.mjs`: append ONE entry to `GUARD_SITES` (do not edit any existing entry): `{ file: 'plugins/relay/scripts/qa-query.mjs', required: ['FAILED_NON_LOCAL_TARGET', 'QUERY_NOT_READ_ONLY', '--local', '--remote', '--preview', '-readonly'], forbidden: ['--local-host'] }`. The check's own logic is unchanged. The module's header comment already says a later phase appends its own site.
  2. `scripts/validate/checks/qa-run-contract.mjs`: add a constant `QUERY_MODULE_FILE = 'plugins/relay/scripts/qa-query.mjs'` and an OPTIONAL `checkQaRunContract` input `queryModuleText` (every other input and every existing finding unchanged). When it is `null` add `missing or unreadable file: <QUERY_MODULE_FILE>`; when `undefined` add nothing (so existing callers and fixtures are unaffected); when a string, add findings (file `QUERY_MODULE_FILE`) if it contains `child_process`, `writeFileSync(`, `renameSync(`, `appendFileSync(` or `fetch(`, or if it lacks any of `QUERY_NOT_READ_ONLY`, `FAILED_NON_LOCAL_TARGET`, `--remote`, `-readonly`. `runQaRunContractCheck` passes `readOrNull(QUERY_MODULE_FILE)` as `queryModuleText`. Do not register a new check and do not change `scripts/validate/index.mjs`; the 28-check count stays.
- **MIRROR**: `# SOURCE: scripts/validate/checks/auth-local-guard-sites.mjs:65-69` (the `{ file, required, forbidden }` entry shape) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:183-193` (optional input with `null` = missing and `undefined` = skipped, plus the no-`child_process` pin).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { GUARD_SITES, runAuthLocalGuardSitesCheck, checkAuthLocalGuardSites } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
  import { checkQaRunContract, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  import { readFileSync } from "node:fs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const QF = "plugins/relay/scripts/qa-query.mjs";
  if (!GUARD_SITES.some((s) => s.file === QF)) fail("qa-query.mjs is not a registered guard site");
  const real = runAuthLocalGuardSitesCheck();
  if (!real.ok) fail("the real tree violates the guard-site check: " + JSON.stringify(real.findings, null, 2));
  const files = {};
  for (const s of GUARD_SITES) files[s.file] = readFileSync(s.file, "utf8");
  files[QF] = files[QF].split("--remote").join("");
  if (checkAuthLocalGuardSites({ files }).ok) fail("a query module that lost its --remote refusal was not flagged");
  const rc = runQaRunContractCheck();
  if (!rc.ok) fail("the real tree violates the runner contract: " + JSON.stringify(rc.findings, null, 2));
  const clean = "QUERY_NOT_READ_ONLY FAILED_NON_LOCAL_TARGET --remote -readonly";
  const mine = (r) => r.findings.filter((f) => f.file === QF);
  if (mine(checkQaRunContract({ queryModuleText: clean })).length !== 0) fail("a clean query module was flagged: " + JSON.stringify(mine(checkQaRunContract({ queryModuleText: clean }))));
  for (const [label, text] of [["child_process", clean + " child_process"], ["write", clean + " writeFileSync(a,b)"], ["rename", clean + " renameSync(a,b)"], ["fetch", clean + " fetch(u)"], ["no refusal code", "FAILED_NON_LOCAL_TARGET --remote -readonly"], ["no -readonly", "QUERY_NOT_READ_ONLY FAILED_NON_LOCAL_TARGET --remote"]]) {
    if (mine(checkQaRunContract({ queryModuleText: text })).length === 0) fail("the query module violation was not flagged: " + label);
  }
  if (mine(checkQaRunContract({ queryModuleText: null })).length === 0) fail("a missing query module was not flagged");
  if (mine(checkQaRunContract({})).length !== 0) fail("an omitted queryModuleText must add no finding");
  '
  ```
  Before this task `qa-query.mjs` is not in `GUARD_SITES`, so the first assertion exits non-zero. The negative cases are built from the clean fixture so each isolates a single rule; the guard-site negative case rewrites the real module text in memory and never edits a file.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-query.mjs
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/auth-local-guard-sites.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The runner's vocabulary, the contract and the guard-site registry hold, and the new exports exist (exit 1 on any miss).
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { runAuthLocalGuardSitesCheck } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
import * as qa from "./plugins/relay/scripts/qa-run.mjs";
import * as qq from "./plugins/relay/scripts/qa-query.mjs";
const fail = (m) => { console.error(m); process.exit(1); };
if (qa.OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") fail("OUTCOMES changed");
if (typeof qa.runQueryStep !== "function") fail("missing export: runQueryStep");
for (const n of ["checkReadOnlySql", "classifyQuerySource", "buildQueryArgv", "parseQueryOutput", "checkRows", "redactRows", "precheckQuerySteps", "neutralizeVariables"]) if (typeof qq[n] !== "function") fail("missing export: " + n);
if (qa.validateStep("http", { action: "query", source: "d1-local", sql: "SELECT 1", expect_rows: 1 }) !== null) fail("the query step does not validate");
if (qa.validateStep("http", { action: "request", method: "GET", path: "/api/x" }) !== null) fail("the flat http step no longer validates");
for (const r of [runQaRunContractCheck(), runAuthLocalGuardSitesCheck()]) if (!r.ok) fail(JSON.stringify(r.findings, null, 2));
'
# The runner keeps its single guard marker, and the query module is wired in.
[ "$(grep -c '// GUARD-SITE' plugins/relay/scripts/qa-run.mjs)" -eq 1 ]
grep -qF "import('./qa-query.mjs')" plugins/relay/scripts/qa-run.mjs
# AC-15: the four frozen surfaces are byte-identical to HEAD (single-argument diff, working tree vs HEAD).
if [ -n "$(git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen surface changed"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# The report-producing command is untouched (plan side only).
if [ -n "$(git diff --name-only HEAD -- plugins/relay/commands/relay-qa-report.md)" ]; then
  echo "FAIL: relay-qa-report.md changed"; exit 1
else
  echo "PASS: relay-qa-report.md untouched"
fi
# No forbidden .claude/PRPs reference introduced outside the quoted prohibition idiom (tracked diff, then the new file).
if git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs scripts/validate/checks/auth-local-guard-sites.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced in tracked files"
fi
if grep -n "\.claude/PRPs" plugins/relay/scripts/qa-query.mjs | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference in the new module"; exit 1
else
  echo "PASS: no forbidden path reference in the new module"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite (28 checks, no new check file) must pass; its exit code propagates.
# This includes auth-local-guard-sites (now with the qa-query.mjs site) and qa-run-contract.
npm run validate
# The corpus, restricted to the one file whose fixtures this phase changes (the GUARD_SITES length assertion in
# auth-local-guard-sites.test.mjs, updated by the test pair through the lifecycle ledger; see Notes). The whole
# corpus is re-run, unfiltered and with the quoted glob `node --test "scripts/validate/**/*.test.mjs"`, in /relay-test
# after the ledger updates.
find scripts/validate -name '*.test.mjs' ! -name 'auth-local-guard-sites.test.mjs' -print0 | xargs -0 node --test
```

## Acceptance Criteria

- **AC-A1 (PRD AC-11):** Given a declared query source, when a plan step `{ "action": "query", "source": "<name>", "sql": "..." }` carries a statement that is not a single `SELECT` or `WITH ... SELECT` (a write, a multi-statement string, `PRAGMA`, `ATTACH`, `VACUUM`, a comment, or a captured value that turns the statement into one of these after substitution), then the case is `blocked` with `QUERY_NOT_READ_ONLY` before anything is seeded, authenticated or executed, and no command runs.
- **AC-A2 (PRD AC-11):** The source's engine-level read-only control is applied whenever the source kind can declare one: a `sqlite3` source must carry `-readonly` (a source without it is `QUERY_SOURCE_INVALID`), and the evidence records which control applied; a `wrangler-d1` source declares none (Open Question 1, resolved in Notes) and relies on the statement guard plus `--local`.
- **AC-A3 (PRD AC-11):** A source whose invocation is not provably local is refused `FAILED_NON_LOCAL_TARGET` before execution: a `wrangler-d1` invocation without `--local` or with `--remote`/`--preview`, a `sqlite3` source naming a URL or `file:` database, or any argument naming a non-local URL; the invocation site is registered in `auth-local-guard-sites`.
- **AC-A4 (PRD AC-11):** The result rows are asserted with `expect_rows` (exact count) and `expect_json` (a dotted path over the rows array); a failed expectation is `fail` with a value-free reason, and the redacted, bounded rows are written as evidence listed in the step's per-step result.
- **AC-A5 (PRD AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, the report is never written, and `OUTCOMES` is still exactly the four values.
- **AC-A6 (PRD AC-16):** No row value, statement fragment, expected value or credential appears in any refusal or failure reason, in terminal output or in a tracked file; `redact_columns` values are written as `[REDACTED]` and registered with the redaction table before any write; `query_sources` holds declarations only, never credentials or captured values; the query module stays free of process spawning, file writes and network calls.

R8b (PRD AC-N token check) is satisfied here by the `(PRD AC-N)` tokens above; the criteria are phase-scoped slices of PRD AC-11, AC-15 and AC-16.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A "read-only" query writes (lexical guard bypass) | M | H | Four independent layers: single-statement tokenizer that refuses comments, `$`, backslash and extra `;`; a first-keyword allowlist plus a keyword denylist; the engine control where declarable (`sqlite3 -readonly`); a provably-local invocation. The guard is conservative by construction, so false refusals are accepted over false accepts. No primary source on lexical-guard conventions was found by research, so the guard design is original: `TBD - needs validation` by the test pair with an adversarial statement corpus and by the dogfood |
| D1 has no engine-level read-only control, so a guard bypass would write to the local D1 file | M | M | Local only (`--local` required, `--remote`/`--preview` refused), so the blast radius is a throwaway dev database; the operator may declare the miniflare SQLite file as a `sqlite3 -readonly` source instead. Whether local `wrangler d1` accepts `PRAGMA query_only` is not verified empirically (`TBD - needs validation` in the phase 8 dogfood); it is not relied on |
| Variable substitution turns a safe template into an unsafe statement | M | H | `checkReadOnlySql` runs on the template (variables neutralized) in `executeCase` and again on the final statement inside `runQueryStep`; Task 3 VALIDATE asserts the injected case |
| Row values or personal data leak into evidence, reasons or logs | M | H | Rows go through `writeEvidence` (structural redaction, secret-named keys such as `password` and `token` redacted), `redact_columns` values are replaced and registered before any write, evidence is capped at 100 rows, reasons carry counts and paths only, stderr is never piped to evidence |
| `wrangler` cannot be spawned with `shell: false` on Windows (`.cmd` shim) | M | M | The doc tells the operator to declare `node` plus the tool's script path; the spawn failure is a named `QUERY_FAILED`, never a silent pass |
| `wrangler d1 --json` output shape differs from the parser's expectation | M | M | The parser accepts the documented array-of-`{ results }` shape and fails closed with `QUERY_OUTPUT_UNPARSEABLE`; the dogfood confirms the shape against a real local D1 (`TBD - needs validation`) |
| A query-only case still needs Playwright and a declared target because it rides an `http` entry | M | L | Accepted: every `http`/`browser` entry already needs both; the case is blocked with the existing named codes rather than silently skipped |
| Existing tests pin the doc's "reserved" `query_sources` sentence, the omit-list wording, or `GUARD_SITES.length` | M | M | Level 3 excludes only the guard-sites test; any other doc-parsing test that fails is routed to the test pair as `EXISTING_TEST_UPDATED` (Notes), never edited by the Implementer |
| Registering a new script surface breaks a documentation parity check | L | L | `npm run validate` at Level 3 would fail loudly; if a parity check requires `qa-query.mjs` to be listed in `documentation/reference/scripts.html`, follow `documentation/AGENTS.md` (read it first) including a `changelog.html` entry |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Decision recorded: `query` is a step action, not a `db` driver.** PRD AC-11 words it as a plan step `{ "action": "query", ... }`, and a plan entry has exactly one driver (`executeCase` dispatches `DRIVERS[driver]` over the whole entry). `praesto-sum` case 23 needs an HTTP request and a DB verification in the same case, which a `db` driver could not express without introducing cross-driver entries. A step action usable in `http` and `browser` entries keeps one entry per case, reuses the per-step results and `PARTIAL_REMAINDER` machinery, and needs no change to `NO_ACTIVE_DRIVER`. The cost: a query-only case is written as an `http` entry and so needs Playwright and a target; accepted (Risks).
- **Decision recorded: PRD Open Question 1 (D1 `query_only`) is resolved as "lexical guard plus `--local` only for `wrangler-d1`; the engine control is required for `sqlite3`".** Evidence from this phase's research: Cloudflare's D1 SQL-statements page lists the PRAGMAs D1 supports and `query_only` is not among them; the same page says D1 PRAGMAs apply only to the current transaction; `wrangler d1 execute` has no read-only flag and its `--command` accepts several statements separated by `;`; SQLite documents that `query_only` is not truly read-only and that it is itself a PRAGMA any later statement could switch off. So even if the local emulation accepted it, applying it would need a second statement in the same `--command` (which the single-statement guard forbids) and it would not persist across invocations. It is therefore not relied on for D1. A stronger option exists and is documented: declare the local miniflare SQLite file (under `.wrangler/state`) as a `sqlite3` source with `-readonly`. Whether the local emulation accepts `PRAGMA query_only`, and the exact `--json` output shape, are `TBD - needs validation` empirically during the phase 8 dogfood and recorded in its report.
- **Decision recorded: no `status`/`confirmed` gate on query sources.** Seeds needed one because `/relay-qa-seed` generates entries a human must vet before they execute. No relay component writes `query_sources`; the operator hand-writes the tracked declaration, which is itself the human decision, and the planning agent can only select a declared name. Declarations are closed by `kind`, so an operator typo cannot weaken the locality rules.
- **Decision recorded: the closed kind table ships `wrangler-d1` and `sqlite3` only.** The dogfood needs D1 (`praesto-sum` case 23); the guidance and PRD mention psql/sqlite as possible. Adding `psql` needs CSV or JSON output handling and an engine-control story (`default_transaction_read_only` is an overridable session default per the research), so it is deferred, not refused: a new kind is one table entry plus its rules.
- **New reason codes (all `blocked`, none an outcome):** `QUERY_NOT_READ_ONLY`, `QUERY_SOURCE_UNDECLARED`, `QUERY_SOURCE_INVALID`, `QUERY_FAILED`, `QUERY_OUTPUT_UNPARSEABLE`, `QUERY_MODULE_UNAVAILABLE`; `FAILED_NON_LOCAL_TARGET` is reused for every locality refusal. A plan-shape defect (`PLAN_ENTRY_INVALID`, `NO_EXPECTATION`) stays `needs-human`; a guard refusal is `blocked`, matching how `FAILED_NON_LOCAL_TARGET` is already classified.
- **Guard-site registration.** The invocation site lives in a new pure module, `qa-query.mjs`, which is the registered site; `qa-run.mjs` keeps its single `// GUARD-SITE` marker (the `qa-run-contract` check requires exactly one) and still calls `ctx.target.guard.checkTarget` for any `://` argument. **Routed to the test pair (lifecycle-ledger work, never an Implementer task):** `scripts/validate/checks/auth-local-guard-sites.test.mjs` asserts `GUARD_SITES.length` equals its `ALL_SITES.length` (nine) and compares the file lists (lines ~40 and ~79-80 per the codebase research); it must be updated as `EXISTING_TEST_UPDATED` to ten sites including `plugins/relay/scripts/qa-query.mjs`.
- **Recorded for the test pair.** New cases for: `checkReadOnlySql` (an adversarial corpus: comment-hidden second statements, `$$` quoting, `WITH ... INSERT`, `SELECT ... INTO`, `REPLACE INTO` vs the `replace()` function, quoted keyword identifiers, control characters, over-length input), `classifyQuerySource` for every refusal and for both kinds, `parseQueryOutput` for both kinds, `checkRows` value-free reasons, `redactRows`, `precheckQuerySteps`, `validateStep`/`validateSteps` for the `query` action in both drivers (including the nested form and the unbound variable in `sql`), `runQueryStep` end to end with a stub command (the Task 3 fixture shape), `executeCase` refusals before the target gate (the Task 2 fixture shape, which needs no Playwright), the two driver branches with an injected Playwright where practical, and the extended `qa-run-contract` pins and doc example. Existing doc-parsing tests (`qa-run-captured-seeds.test.mjs` parses the doc's example declaration) should be unaffected because the doc edit adds no new declaration fence; if one pins the old "reserved" sentence or the omit-list wording, update it through the ledger. The full corpus must be run with the quoted glob `node --test "scripts/validate/**/*.test.mjs"` after the ledger updates.
- **Where the declaration is read.** `ctx.seedConfig` is `PRPs/auth/qa-seed.json` parsed once per run; `query_sources` is read from it, so a project with no such key simply has no sources and every `query` step is `QUERY_SOURCE_UNDECLARED`.
- The plan writer has no shell tool: the VALIDATE commands were derived by reading the current working tree (for example `runQueryStep` and `qa-query.mjs` do not exist, so Tasks 1-3 exit non-zero before the work) and were not executed. Task 2's second block relies on `parse` output being the case list (an array or `{ cases }`, both handled) and on the bullet-field report shape that Phase 3's fixture used; if the shared parser needs a different heading shape, adjust the fixture, not the assertions. The Level 2 frozen-surface and forbidden-reference checks and Level 3 pass on the unmodified tree by design, as regression guards.
- Release is out of scope: the 0.44.0 cut follows the phase 8 dogfood.

- **Amendment 2026-10-06 (after code review, before D8):** Task 2 step 1's static import became a lazy `import('./qa-query.mjs')`, and the Task 2 VALIDATE and Level 2 greps now match that form. Reason: the static import made 35 existing tests fail `ERR_MODULE_NOT_FOUND` (their copy helpers copy `qa-run.mjs` alone), the Implementer cannot edit tests under R-X, and code review (artifact attempt 3, R-L2) judged the old grep a stale plan assertion with no code defect. `QUERY_MODULE_UNAVAILABLE` joins the reason codes and Task 4 documents it.

*Generated: 2026-10-05*
*Approved: 2026-10-06*
*Implemented: 2026-10-06*
*Status: IMPLEMENTED*
