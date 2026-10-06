# Feature: Captured seeds (Phase 2 of qa-runner-case-vocabulary)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a plan downstream stages consume); impact on shared contracts (`qa-run.mjs` seed hook, `PRPs/auth/qa-seed.json` declaration schema, `results.json` reason codes); execution of project commands from a relay script; secret handling (captured seed outputs are a new leak surface); the local-only guard extended to a new site (declared stores)
- Decisions found:
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "Plan side only" — every change lives in the planning instructions, the runner and tracked declarations; `/relay-qa-report` and the reports are untouched
  - Same PRD, Decisions Log "CLI scope (D2)" — commands run only through declared seeds and query sources; the planning agent never writes an argv, so a variable is bound by a declaration, never invented
  - Same PRD, Decisions Log "Phase serialization" — phases 1-7 share `lane:qa-run`; Phase 1 is `complete`, this phase edits the same two files and runs second
  - Same PRD, Decisions Log "Frozen surfaces" — `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `scripts/visual/capture.mjs` byte-identical (AC-15)
  - Phase 1 plan (`PRPs/plans/completed/qa-runner-case-vocabulary-phase-1-plan-contract-and-partial-plans.plan.md`) Notes — Open Question 3 resolved: seeds, captures and declared stores in `PRPs/auth/qa-seed.json` under `states`; query sources top-level `query_sources` in the same file; API origins in `login.config.json` `api_origins`
  - [2026-05-06] / [2026-07-10] R-X strict — the Implementer authors zero test files; tests for this phase are routed through the test pair
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — captured values, per-step results and refusal reasons must never carry a `redact: true` value; `qa-seed.json` holds declarations only
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green" — no existing test is edited; text that existing tests pin (the `runSeed` argv-guard line) is preserved byte-for-byte
  - "Flipping any opt-in gating key by heuristic" — a seed declaration becomes runnable only through an explicit operator edit; this phase adds no status inference
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary — no new extension; `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - Command versus agent separation — the planning agent proposes plan entries and never composes an argv; the script validates and executes declared commands only
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard (parent PRD AC-1) is a hard failure at every new network- or store-touching site
  - The `qa-run-contract` invariants stay true: `OUTCOMES` is the exact four-value literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-case-vocabulary.prd.md` — Implementation Phases row 2: "Captured seeds" — Goal: a seed can hand a generated value to later steps — Success signal: a fixture shaped like `praesto-sum` case 23 seeds a row, captures its id and uses it in a request path; a seed whose output lacks the path is `blocked` with `CAPTURE_MISSING`, and no step runs.

## Summary

This phase makes a seed able to hand a generated value to the plan. `runSeed` stops discarding stdout: when the seed's declaration carries a `captures` map, it spawns the command with a bounded stdout pipe, parses the output as JSON, resolves each declared dotted path, and returns the values as named variables (or `blocked` / `CAPTURE_MISSING` naming the variable, with no step run). The runner binds the declared capture names into `validateSteps` before anything is seeded (replacing Phase 1's empty bound set), substitutes `{{name}}` in each step after the seed ran, and re-checks every substituted path against the guard-approved origin. Captures marked `redact: true` are registered in the run's redaction table before any write, and a redact-marked value too short to be redacted is refused. A declaration that carries `captures` must name its `store`, and the store passes the local-only guard before the command runs. The command doc's reserved declaration schema becomes a read-and-enforced schema. The approach is additive: a legacy declaration with only `command` behaves byte-identically, and the four-outcome vocabulary does not change.

## User Story

As the operator of relay's human validation gate
I want a seed command's generated id to reach the later steps of the same case
So that cases like `praesto-sum` 23 (a CLI-created row whose id is reused in a request path) run with evidence instead of coming back as `needs-human`

## Problem Statement

`runSeed` spawns the seed argv with `stdio: 'ignore'`, so a seed can never hand a generated value back to the plan (`qa-run.mjs:1313`). `praesto-sum` case 23 needs a CLI-created row whose id is reused in a request path (PS5). Phase 1 gave steps a `{{name}}` reference syntax but no binding source, so every reference is refused. Seeds also touch a store the argv guard cannot see: the guard only inspects argv elements containing `://`, so a seed reaching a non-local store through env or config is not caught.

## Solution Statement

Plan side and runner side only. Extend `states[<text>]` in `PRPs/auth/qa-seed.json` with two optional keys: `captures` (`{ "<variable>": { "path": "<dotted JSON path into stdout>", "redact"?: true } }`) and `store` (a URL or `host[:port]` naming the store the seed writes to). Add four exported pure helpers (`declaredCaptureNames`, `parseSeedCaptures`, `substituteVariables`, `normalizeStore`), export `runSeed` with an extra `decl` parameter, and wire them into `prepareState` and `executeCase`. Rewrite the doc's "Variables" paragraph and "Reserved declaration schema" paragraph to describe what the runner now reads.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md` |
| Dependencies | Phase 1 (`complete`): `validateSteps(driver, steps, boundNames)` and `stepVariables` already exist |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/qa-runner-case-vocabulary.prd.md` lines 227 (row 2), 251-255 (Phase Details), 95-96 and 103 (AC-2, AC-3, AC-10) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-case-vocabulary.prd.md` | 95-96, 103, 251-255 | AC-2, AC-3, AC-10 and the Phase 2 scope/success signal |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1277-1317 | `prepareState` / `runSeed` — the seed hook being changed; the argv-guard line is pinned text (see Notes) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1633-1701 | `executeCase` — the `validateSteps` call site (1645-1648) that binds names, `prepareState` (1676), and the driver dispatch (1694-1696) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 846-900 | `stepVariables` / `validateSteps` — the walk that `substituteVariables` mirrors |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 574-583 | `addSecretValues` — registers run-time values for redaction (values under 4 characters are ignored) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 990-1002 and 1081-1092 | `getPath` and its use for `expect_json`; the capture-path resolver reuses it |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 165-215 and 290-307 | the Variables and Reserved declaration schema paragraphs being rewritten; the constraints bullets about seeds |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1755-1775 | `makeCtx` — `seedConfig`, `seeds` and `table` live on the run ctx |
| P1 | `plugins/relay/scripts/auth-local-guard.mjs` | whole file | `checkTarget` — read it to confirm what a `host:port` store looks like after `normalizeStore` |
| P1 | `plugins/relay/resources/redaction-policy.md` | whole file | what must be stripped before any evidence write |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 905-975 | existing seed tests (read-only): they pin `if (!a.includes('://')) continue;` and run `command`-only declarations |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 120-186 | the contract the edit must keep satisfying |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1307-1317
async function runSeed(ctx, argv) {
  for (const a of argv) {
    if (!a.includes('://')) continue;
    const r = await ctx.target.guard.checkTarget(a, { root: ctx.root });
    if (!r.ok) return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: `a seed command argument names a non-local URL (${r.reason}); the command was not executed` };
  }
  const r = spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: 'ignore', timeout: 120000 });
  if (r.error) return { ok: false, code: 'SEED_FAILED', reason: 'the declared seed command could not be run or timed out' };
  if (r.status !== 0) return { ok: false, code: 'SEED_FAILED', reason: `the declared seed command exited with status ${r.status}` };
  return { ok: true };
}
```
Copied by Task 2 (the argv-guard line and the spawn options stay; the store check goes before the spawn; stdout is piped only when the declaration has `captures`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1289-1298
  const states = ctx.seedConfig && isObj(ctx.seedConfig.states) ? ctx.seedConfig.states : {};
  const decl = Object.hasOwn(states, text) ? states[text] : null;
  const argv = decl && Array.isArray(decl.command) ? decl.command : null;
  if (argv === null || argv.length === 0 || !argv.every((a) => isStr(a) && a !== '')) return blocked('STATE_UNDECLARED', missing);
  let seeded = ctx.seeds.get(text);
  if (!seeded) {
    seeded = await runSeed(ctx, argv);
    ctx.seeds.set(text, seeded);
  }
  if (!seeded.ok) return blocked(seeded.code, seeded.reason);
  return null;
```
Copied by Task 2 (the per-state-text cache means captures are cached with the seed result; `runSeed` receives `decl`; redaction registration happens after a successful seed).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1645-1648
  // Captures do not exist until a later phase (runSeed discards stdout), so no name is ever bound:
  // a literal {{name}} is refused here, before any state is seeded, session obtained or request sent.
  const invalid = validateSteps(driver, p.steps, []);
  if (invalid) return out(needsHuman(invalid.code, invalid.reason));
```
Copied by Task 2 (the empty bound set becomes the names a declaration binds; the call stays ahead of every side effect).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:852-866
function stepVariables(step) {
  /** @type {string[]} */ const names = [];
  /** @param {any} v */
  const walk = (v) => {
    if (isStr(v)) {
      for (const m of v.matchAll(VARIABLE_PATTERN)) names.push(m[1]);
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x);
    } else if (isObj(v)) {
      for (const x of Object.values(v)) walk(x);
    }
  };
  if (isObj(step)) for (const [k, v] of Object.entries(step)) if (k !== 'action') walk(v);
  return names;
}
```
Copied by Task 1 (`substituteVariables` walks the same leaves, skips the same `action` key, and uses the same `VARIABLE_PATTERN`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:574-583
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
Copied by Task 2 (every `redact: true` capture value goes through it; because it ignores values under 4 characters, such a capture is refused `CAPTURE_UNREDACTABLE` rather than written in clear).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:180-185
Variables: `{{name}}` may appear in a path, body, fill value or expectation, and every
reference must be bound by a capture declared for the case's seed. An unbound
reference makes the case `needs-human` with `PLAN_ENTRY_INVALID`, naming the
variable, before anything is seeded, authenticated or requested. Until seeds
capture their output (a later phase), every reference is unbound, so do not write
`{{name}}` references in a plan yet.
```
Copied by Task 3 (the last sentence is the Phase 1 stop-gap; it is replaced by the capture rule).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | export `declaredCaptureNames`, `parseSeedCaptures`, `substituteVariables`, `normalizeStore`, `runSeed`; bounded stdout capture and `CAPTURE_MISSING` / `CAPTURE_UNREDACTABLE`; store guard; bind names in `executeCase`; substitute after seeding and re-check substituted paths against the origin |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the Variables paragraph states how a variable is bound; the Reserved declaration schema becomes the enforced `captures` / `store` schema with a literal example; the constraints bullet about seed writes names the store |

## NOT Building (Scope Limits)

- Any change to `/relay-qa-report` or the reports themselves; every change is plan-side and runner-side.
- A fifth outcome. New behavior is the reason codes `CAPTURE_MISSING` and `CAPTURE_UNREDACTABLE` (both `blocked`).
- The seed `status` (`proposed` / `confirmed`), `STATE_UNCONFIRMED`, `STATE_COMMAND_MISSING` and the `/relay-qa-seed` command — Phase 3. This phase reads no `status` key.
- Capture from an earlier HTTP step (Should-item) — a variable has exactly one source here: a seed's `captures`.
- The read-only DB driver, declared API origins, UI grounding and per-test record resolution — Phases 4-7.
- A free CLI step in the plan, or any argv authored by the planning agent.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-15).
- Any test file. R-X strict: the Implementer authors zero test files; the test pair authors the corpus for this phase after code review.
- Writing captured values to any tracked file. Captures live in memory for one run; `qa-seed.json` holds declarations only.
- Edits to the installed plugin cache under `~/.claude/plugins/cache`.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — exported capture, substitution and store helpers

- **ACTION**: Delivers AC-A1 (captures are read from the seed's JSON output, never invented), AC-A2 (a missing capture is `CAPTURE_MISSING`), AC-A3 (redact marking is carried through) and AC-A5 (names a declaration binds are derivable before anything runs). In `plugins/relay/scripts/qa-run.mjs`, add these exported pure functions next to `validateSteps`/`getPath` (no I/O, no `writeFileSync(`, no `outcome:` literal):
  1. `declaredCaptureNames(seedConfig, requiredStateText, planState)` returns `string[]`: the variable names of the well-formed `captures` entries of `seedConfig.states[requiredStateText]`, only when `planState === 'declared'` and the key exists as an own property; otherwise `[]`. A well-formed entry has a name matching `[A-Za-z_][A-Za-z0-9_]*` and an object value with a non-empty string `path`.
  2. `parseSeedCaptures(stdoutText, captures)` returns `{ ok: true, values }` where `values` is `Record<string, { value: string, redact: boolean }>`, or `{ ok: false, code: 'CAPTURE_MISSING', reason }`. It parses `stdoutText` as JSON (the whole text, trimmed); resolves each declared `path` with the existing `getPath` (dotted path); accepts only a string, finite number or boolean at the path and stringifies it; `redact` is true only when the entry's `redact` is exactly `true`. Not JSON, a path resolving to `undefined` or `null`, an object/array at the path, or a malformed entry yields `CAPTURE_MISSING` and a `reason` that names the variable (for non-JSON output, every declared variable name) and NEVER contains a value from the output.
  3. `substituteVariables(step, values)` returns a deep copy of a plan step in which every `{{name}}` (same `VARIABLE_PATTERN`, same string leaves at any depth, `action` key excluded) is replaced by `values[name].value`; a name absent from `values` is left as written; the input step is not mutated.
  4. `normalizeStore(store)` returns the string the guard should check, or `null`: a non-empty string containing `://` is returned unchanged; a non-empty string matching a bare `host` or `host:port` (no whitespace, no `/`) is returned as `http://<store>`; anything else (empty, non-string, with whitespace or a path and no scheme) is `null`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:852-866` (the string-leaf walk, the `action` exclusion, `VARIABLE_PATTERN`) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:574-583` (a helper that never echoes the value it handles).
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { declaredCaptureNames, parseSeedCaptures, substituteVariables, normalizeStore, validateSteps } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const ok = parseSeedCaptures(`{"row":{"id":"abc-12345","n":7}}`, { item_id: { path: "row.id" }, count: { path: "row.n", redact: true } });
  if (!ok.ok || ok.values.item_id.value !== "abc-12345" || ok.values.item_id.redact !== false || ok.values.count.value !== "7" || ok.values.count.redact !== true) fail("capture parse wrong: " + JSON.stringify(ok));
  const notJson = parseSeedCaptures("hello", { item_id: { path: "id" } });
  if (notJson.ok || notJson.code !== "CAPTURE_MISSING" || !notJson.reason.includes("item_id")) fail("non-JSON output not CAPTURE_MISSING naming the variable: " + JSON.stringify(notJson));
  const absent = parseSeedCaptures(`{"other":"zzz-secret-1"}`, { item_id: { path: "id" } });
  if (absent.ok || absent.code !== "CAPTURE_MISSING" || !absent.reason.includes("item_id") || absent.reason.includes("zzz-secret-1")) fail("absent path wrong or leaked a value: " + JSON.stringify(absent));
  const obj = parseSeedCaptures(`{"id":{"a":1}}`, { item_id: { path: "id" } });
  if (obj.ok || obj.code !== "CAPTURE_MISSING") fail("a non-scalar capture was accepted");
  const step = { action: "request", method: "GET", path: "/api/items/{{item_id}}", expect_json: { path: "a", equals: "{{item_id}}" } };
  const sub = substituteVariables(step, { item_id: { value: "abc-12345", redact: false } });
  if (sub.path !== "/api/items/abc-12345" || sub.expect_json.equals !== "abc-12345" || sub.action !== "request") fail("substitution wrong: " + JSON.stringify(sub));
  if (step.path !== "/api/items/{{item_id}}") fail("the input step was mutated");
  if (substituteVariables(step, {}).path !== "/api/items/{{item_id}}") fail("an unknown name was not left as written");
  const cfg = { states: { S: { command: ["x"], captures: { a: { path: "x" }, b: { path: "y" }, "bad name": { path: "z" }, c: { path: "" } } } } };
  if (declaredCaptureNames(cfg, "S", "declared").join(",") !== "a,b") fail("declared names wrong: " + declaredCaptureNames(cfg, "S", "declared"));
  if (declaredCaptureNames(cfg, "S", "none").length !== 0 || declaredCaptureNames(cfg, "other", "declared").length !== 0 || declaredCaptureNames(null, "S", "declared").length !== 0) fail("names bound outside a declared state");
  if (validateSteps("http", [{ ...step, expect_status: 200 }], declaredCaptureNames(cfg, "S", "declared")) === null) fail("an unbound name (item_id) was accepted");
  const bound = { states: { S: { command: ["x"], captures: { item_id: { path: "id" } } } } };
  if (validateSteps("http", [{ ...step, expect_status: 200 }], declaredCaptureNames(bound, "S", "declared")) !== null) fail("a declared name was refused");
  if (normalizeStore("localhost:5432") !== "http://localhost:5432" || normalizeStore("postgres://localhost/db") !== "postgres://localhost/db") fail("store normalisation wrong");
  if (normalizeStore("") !== null || normalizeStore(5) !== null || normalizeStore("a b") !== null || normalizeStore("host/path") !== null) fail("a bad store was not null");
  '
  ```
  Before this task, the import fails (none of the helpers is exported) and the command exits non-zero.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — capture in runSeed, store guard, binding and substitution in executeCase

- **ACTION**: Delivers AC-A1 (the seed's stdout is captured, bounded, and each capture is bound to its variable), AC-A2 (output that is not JSON or lacks a path blocks the case `CAPTURE_MISSING` and no step runs), AC-A3 (a `redact: true` value is registered for redaction before any write), AC-A4 (a seed's declared store passes the local-only guard) and AC-A5 (the names a declaration binds replace Phase 1's empty bound set; an unbound reference is still refused before anything is seeded). In `plugins/relay/scripts/qa-run.mjs`:
  1. Export `runSeed(ctx, argv, decl = {})`. Keep the argv loop, including the line `if (!a.includes('://')) continue;` byte-for-byte (an existing test mutates that exact text), and keep `shell: false`, `cwd: ctx.root` and the 120000 ms timeout.
  2. Store: when `decl.captures` is an object with at least one key, `decl.store` is REQUIRED. Compute `normalizeStore(decl.store)`; when it is `null`, return `{ ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: 'the seed declaration captures output but names no checkable store; the command was not executed' }`. Otherwise run it through `ctx.target.guard.checkTarget(normalized, { root: ctx.root })` BEFORE spawning; on `!r.ok` return `FAILED_NON_LOCAL_TARGET` with a reason naming the store check (`r.reason`, no argv value). A declaration with `store` and no `captures` is also guard-checked the same way. A legacy declaration with neither key behaves exactly as today (documented carve-out; see Notes).
  3. Capture: when the declaration has `captures`, spawn with `stdio: ['ignore', 'pipe', 'ignore']`, `encoding: 'utf8'` and `maxBuffer: 65536`; otherwise keep `stdio: 'ignore'`. `r.error` or a non-zero status stay `SEED_FAILED` with today's messages (an exceeded `maxBuffer` surfaces as `r.error`: report it `CAPTURE_MISSING` with the reason `the seed output exceeded the 65536-byte capture bound`, naming no value). On success call `parseSeedCaptures(r.stdout, decl.captures)`; on `!ok` return `{ ok: false, code: 'CAPTURE_MISSING', reason }`. Return `{ ok: true, captures: values }` (omit `captures` when none were declared). A `redact: true` capture whose value is shorter than 4 characters (`addSecretValues` ignores it) returns `{ ok: false, code: 'CAPTURE_UNREDACTABLE', reason }` naming the variable only.
  4. `prepareState`: pass `decl` to `runSeed`; after a successful seed (cached or fresh) call `addSecretValues(ctx.table, <every captured value with redact true>)` BEFORE returning, so no later write carries it. Keep the cache per state text; the cached object now includes `captures`. A blocked seed (`CAPTURE_MISSING`, `CAPTURE_UNREDACTABLE`, `FAILED_NON_LOCAL_TARGET`, `SEED_FAILED`) is cached and returned through the existing `blocked(...)` path, and no driver runs.
  5. `executeCase`: replace the empty bound set at the existing `validateSteps` call with `declaredCaptureNames(<seedConfig>, (kase.required_state ?? '').trim(), p.state)`, obtaining `seedConfig` from the run ctx when it already exists or by reading `PRPs/auth/qa-seed.json` the same way `makeCtx` does (`readJsonOrNull`); do NOT hoist `makeCtx()` above the `target === null` check. Replace the Phase 1 comment (captures do not exist yet) with one stating that a declaration binds names and values arrive only after the seed ran. After `prepareState` succeeds, read the captured values from `ctx.seeds.get(text)`, build `steps = p.steps.map((s) => substituteVariables(s, values))`, re-run the existing `resolveStepUrl(path, target)` pre-check loop on the substituted steps (a captured value such as `//evil.example/x` must still be refused `FAILED_NON_LOCAL_TARGET` before any request), and call the driver with `{ ...p, steps }`. Per-step results and `applyPartialRemainder` keep using the same step indexes.
  6. No captured value may appear in a `reason`, a per-step result, a log line or the terminal summary. Do not add any `writeFileSync(` or `renameSync(` call, a second `// GUARD-SITE` or `// WRITE-SITE` marker, or an `outcome:` literal outside the four values. Reuse `ctx.target.guard.checkTarget` (no new marker).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1307-1317` (argv guard line and spawn options), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1289-1298` (decl lookup and per-state-text cache), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1645-1648` (the pre-side-effect validation site) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:574-583` (redaction registration).
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { runSeed, declaredCaptureNames, validateSteps } from "./plugins/relay/scripts/qa-run.mjs";
  import { mkdtempSync, existsSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  const fail = (m) => { console.error(m); process.exit(1); };
  const root = mkdtempSync(join(tmpdir(), "qa-seed-"));
  const ctx = { root, target: { guard: { checkTarget: async (u) => { const h = new URL(u).hostname; return h === "localhost" || h === "127.0.0.1" ? { ok: true } : { ok: false, reason: "not local" }; } } } };
  const node = process.execPath;
  const emit = (code) => [node, "-e", code];
  const decl = (extra) => ({ store: "localhost:5432", captures: { item_id: { path: "id" } }, ...extra });
  const a = await runSeed(ctx, emit(`console.log(JSON.stringify({id:"abc-12345"}))`), decl());
  if (!a.ok || !a.captures || a.captures.item_id.value !== "abc-12345") fail("capture not returned: " + JSON.stringify(a));
  const b = await runSeed(ctx, emit(`console.log("hello")`), decl());
  if (b.ok || b.code !== "CAPTURE_MISSING") fail("non-JSON output not CAPTURE_MISSING: " + JSON.stringify(b));
  const c = await runSeed(ctx, emit(`console.log(JSON.stringify({other:1}))`), decl());
  if (c.ok || c.code !== "CAPTURE_MISSING" || !c.reason.includes("item_id")) fail("absent path not CAPTURE_MISSING naming the variable: " + JSON.stringify(c));
  const big = await runSeed(ctx, emit(`console.log("x".repeat(200000))`), decl());
  if (big.ok || big.code !== "CAPTURE_MISSING") fail("oversized output was not refused: " + JSON.stringify(big));
  const marker = join(root, "marker.txt");
  const writer = [node, "-e", `require("node:fs").writeFileSync(process.argv[1], "ran")`, marker];
  const remote = await runSeed(ctx, writer, decl({ store: "evil.example:5432" }));
  if (remote.ok || remote.code !== "FAILED_NON_LOCAL_TARGET" || existsSync(marker)) fail("a non-local store was not refused unexecuted: " + JSON.stringify(remote));
  const noStore = await runSeed(ctx, writer, { captures: { item_id: { path: "id" } } });
  if (noStore.ok || noStore.code !== "FAILED_NON_LOCAL_TARGET" || existsSync(marker)) fail("a capturing declaration with no store was not refused unexecuted: " + JSON.stringify(noStore));
  const short = await runSeed(ctx, emit(`console.log(JSON.stringify({id:"ab"}))`), decl({ captures: { item_id: { path: "id", redact: true } } }));
  if (short.ok || short.code !== "CAPTURE_UNREDACTABLE" || short.reason.includes("ab\"")) fail("a too-short redact value was not refused by name only: " + JSON.stringify(short));
  const failing = await runSeed(ctx, emit(`process.exit(3)`), decl());
  if (failing.ok || failing.code !== "SEED_FAILED") fail("a failing seed was not SEED_FAILED");
  const legacy = await runSeed(ctx, emit(``), {});
  if (!legacy.ok || (legacy.captures && Object.keys(legacy.captures).length)) fail("a legacy command-only declaration changed: " + JSON.stringify(legacy));
  const cfg = { states: { S: { command: ["x"], captures: { item_id: { path: "id" } } } } };
  const step = { action: "request", method: "GET", path: "/api/items/{{item_id}}", expect_status: 200 };
  if (validateSteps("http", [step], declaredCaptureNames(cfg, "S", "declared")) !== null) fail("the declared capture name was not bound");
  if (validateSteps("http", [step], declaredCaptureNames({ states: {} }, "S", "declared")) === null) fail("an undeclared reference was accepted");
  '
  ```
  Before this task, `runSeed` is not exported, so the import fails and the command exits non-zero. The seed bodies are copied byte-for-byte from the ACTION above (store form `host:port`, the 65536-byte bound, the `item_id` name).

### Task 3: UPDATE plugins/relay/commands/relay-qa-run.md — document the capture schema and the variable rule

- **ACTION**: Delivers AC-A6 (the doc states the enforced schema; no frozen surface is touched; the contract check still holds) and documents AC-A1 to AC-A5 for the planning agent. In `plugins/relay/commands/relay-qa-run.md`, keep every other section, the required tokens (`HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs`) and the banned-token rule (the command must not contain `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`) intact, and:
  1. Replace the sentence `Until seeds capture their output (a later phase), every reference is unbound, so do not write {{name}} references in a plan yet.` (it spans lines 183-185 of the current file) with the capture rule: a variable is bound only when the case's `declared` required state has a `captures` entry of that name in `PRPs/auth/qa-seed.json`; the planning agent may write `{{name}}` only for names it read there, never invents one, and never writes a value; the value arrives after the seed ran, and a path that resolves to nothing, or output that is not JSON, blocks the case `CAPTURE_MISSING` with no step run.
  2. Replace the `Reserved declaration schema (not yet read by the runner; ...)` paragraph with an enforced schema paragraph. State that a `states[<exact required-state text>]` entry has `command` (argv array), optional `captures` (`{ "<variable>": { "path": "<dotted path into the seed's JSON stdout>", "redact": true } }`, `redact` optional) and `store` (a URL or `host[:port]`, REQUIRED when `captures` is present, checked by the local-only guard before the seed runs; a non-local or unreadable store blocks the case `FAILED_NON_LOCAL_TARGET` with nothing executed). State the capture bound (65536 bytes of stdout, scalar values only), that a `redact: true` value is never written in clear and that one shorter than 4 characters blocks the case `CAPTURE_UNREDACTABLE`. Keep the sentences that put `query_sources` in `PRPs/auth/qa-seed.json` and `api_origins` in `PRPs/auth/login.config.json` as reserved for later phases, and keep `These files hold declarations only, never captured values or credentials.`
  3. Add one literal declaration example in a fenced `json` block (NOT preceded by a `qa-step-example` marker, since it is not a step): `{ "states": { "A teacher exists": { "command": ["node", "scripts/seed-teacher.mjs"], "store": "localhost:5432", "captures": { "teacher_id": { "path": "teacher.id" } } } } }`.
  4. In the Constraints bullet that says a seed command writes `to whatever store the project declared`, keep the sentence and add that a capturing declaration must name that store and pass the local-only guard.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:180-185` (the Variables paragraph being completed).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  grep -q 'CAPTURE_MISSING' plugins/relay/commands/relay-qa-run.md
  grep -q 'CAPTURE_UNREDACTABLE' plugins/relay/commands/relay-qa-run.md
  grep -qF '"captures"' plugins/relay/commands/relay-qa-run.md
  grep -qF '"store"' plugins/relay/commands/relay-qa-run.md
  if grep -q 'Until seeds' plugins/relay/commands/relay-qa-run.md; then echo "FAIL: the Phase 1 stop-gap sentence is still present"; exit 1; fi
  if grep -q 'not yet read by the runner' plugins/relay/commands/relay-qa-run.md; then echo "FAIL: the schema is still marked reserved/unread"; exit 1; fi
  ```
  Before this task, `CAPTURE_MISSING` is absent from the doc so the first `grep` exits non-zero. The greps assert prose this task itself authors, with literals copied byte-for-byte from the ACTION above (including the quoted JSON keys), and are acceptable because the deliverable is the doc text; `runQaRunContractCheck` additionally keeps the doc's step examples validating.

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
# The runner's vocabulary and contract hold, the doc's examples validate, and the new surface exists (exit 1 on any miss).
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import * as qa from "./plugins/relay/scripts/qa-run.mjs";
if (qa.OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") { console.error("OUTCOMES changed"); process.exit(1); }
for (const n of ["runSeed", "declaredCaptureNames", "parseSeedCaptures", "substituteVariables", "normalizeStore"]) {
  if (typeof qa[n] !== "function") { console.error("missing export: " + n); process.exit(1); }
}
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# The pinned argv-guard line (an existing test mutates this exact text) must survive in the runner.
grep -qF "if (!a.includes('://')) continue;" plugins/relay/scripts/qa-run.mjs
# AC-15: the four frozen surfaces are byte-identical to HEAD (single-argument diff, working tree vs HEAD).
if [ -n "$(git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen surface changed"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# No forbidden .claude/PRPs reference introduced outside the quoted prohibition idiom.
if git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite (28 checks today) must still pass; its exit code propagates.
npm run validate
# The whole corpus, glob quoted: every existing qa-run test (seed, guard-mutation, contract, Phase 1 vocabulary)
# still passes against the extended script; a command-only declaration behaves exactly as before.
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** Given a seed declaration with a `captures` map (variable name to dotted JSON path), when the seed runs, its stdout is read with a bounded size (65536 bytes), parsed as JSON, and each capture is bound to its variable; values reach later steps only through `{{name}}` substitution, after the seed ran, and are never invented.
- **AC-A2 (PRD AC-3):** Given seed output that is not JSON, exceeds the bound, or lacks a declared path, when the case runs, then it is `blocked` with `CAPTURE_MISSING` naming the variable (never a value) and no step runs.
- **AC-A3 (PRD AC-3, AC-16):** A captured value is written to evidence only after the redaction policy is applied; a capture marked `redact: true` is registered for redaction before any write and is never written in clear, and one too short to redact blocks the case `CAPTURE_UNREDACTABLE`. `qa-seed.json` holds declarations only, never captured values.
- **AC-A4 (PRD AC-10, seed side):** Given a declaration that captures output, when the runner is about to execute it, then the declared `store` passes the local-only guard; a missing, unreadable or non-local store halts the case `FAILED_NON_LOCAL_TARGET` and executes nothing. Every argv element that names a URL still passes the guard.
- **AC-A5 (PRD AC-2):** The names a seed declaration binds replace Phase 1's empty bound set: an unbound `{{name}}` is still `needs-human` with `PLAN_ENTRY_INVALID` naming the variable before any state is seeded, any session is obtained or any request is sent, and a bound name no longer blocks the entry. A substituted path that leaves the guard-approved origin is refused `FAILED_NON_LOCAL_TARGET` before any request.
- **AC-A6 (PRD AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, the report is never written, `OUTCOMES` is still exactly the four values, and `relay-qa-run.md` documents the enforced `captures` / `store` schema and the variable rule.

R8b (PRD AC-N token check) is satisfied here by the `(PRD AC-N)` tokens above; the criteria are phase-scoped slices of PRD AC-2, AC-3, AC-10, AC-15 and AC-16.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A captured secret reaches evidence, a reason or the terminal | M | H | `redact: true` values are added to the redaction table before any write; `parseSeedCaptures` and every refusal reason name variables, never values; a redact value under 4 characters is refused `CAPTURE_UNREDACTABLE`; Task 1 and 2 VALIDATE assert a value is absent from the reason |
| A captured value redirects a request off the approved origin (for example `//evil.example`) | M | H | Substituted steps go through the existing `resolveStepUrl` pre-check again before the driver runs, and the HTTP driver re-checks per step |
| The store guard cannot see a store, or `checkTarget` rejects a `host:port` form | M | M | `normalizeStore` prefixes `http://` only to give the guard a host to evaluate; the implementer reads `auth-local-guard.mjs` first; an unprovable store is refused rather than assumed local |
| Legacy `command`-only declarations are held to the store rule and existing seed tests break | M | M | The store requirement applies only to declarations that carry `captures` (or `store`); `command`-only behavior is unchanged and Level 3 runs the whole corpus. The wider "every confirmed seed names its store" rule (PRD AC-10) lands with the `status` key in Phase 3 |
| The existing test that mutates `if (!a.includes('://')) continue;` stops finding its text | L | M | The line is preserved byte-for-byte; Level 2 greps for it |
| A seed's stdout exceeds the bound or hangs the run | L | M | `maxBuffer: 65536` and the 120 s timeout stay; an exceeded bound is `CAPTURE_MISSING`, never a partial parse |
| Hoisting `makeCtx()` earlier changes target-null behavior | L | M | The ACTION forbids moving `makeCtx()` above the `target === null` check; `seedConfig` is read with `readJsonOrNull` when no ctx exists yet |
| research-web returned only primary docs for Hurl and Node `maxBuffer` (exact failure shapes unconfirmed) | L | L | The design is validated by the Task 2 VALIDATE against real `spawnSync` behavior (oversized output), not against documentation wording |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- The test pair will need new cases for: capture binding end to end through `runRun` (a `praesto-sum` case 23 shaped fixture: seed creates an id, the request path uses it), `CAPTURE_MISSING` with no step run (a hit counter proves it), the non-local store refusal with a marker file proving nothing ran, `redact: true` values absent from every file under the run directory, `CAPTURE_UNREDACTABLE`, the substituted-path origin re-check, and an unbound reference still refused before the seed ran. Existing `qa-run*.test.mjs` files should need no edit; if one does (for example a test pinning the Phase 1 doc sentence), it goes through `EXISTING_TEST_UPDATED`, never an Implementer edit.
- Pinned text: `scripts/validate/checks/qa-run.test.mjs` mutates the exact string `if (!a.includes('://')) continue;` in a plugin copy to prove the guard is load-bearing. Keep that line verbatim in `runSeed`.
- Design choice recorded for review: the store requirement is scoped to declarations that capture output. Phase 3 introduces the `status` key and is where "every confirmed seed names its store" (PRD AC-10 in full) can be enforced without breaking command-only declarations that existing tests pin.
- Evidence records the substituted path of an HTTP step (`request.path`), so a non-redact capture appears in evidence after the redaction policy is applied (AC-3 allows this); only `redact: true` values are masked by value. A capture the operator considers sensitive must be declared `redact: true`.
- The plan writer has no shell tool: the VALIDATE commands were derived by reading the current tree (for example `runSeed` and the four helpers are not exported today, so Tasks 1-3's checks exit non-zero before the work) and were not executed. The Level 2 frozen-surface and forbidden-reference checks and Level 3 pass on the unmodified tree by design, as regression guards.

*Generated: 2026-10-05*
*Approved: 2026-10-05*
*Implemented: 2026-10-05*
*Status: IMPLEMENTED*
