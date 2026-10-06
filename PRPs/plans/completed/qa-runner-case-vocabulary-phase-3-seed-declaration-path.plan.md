# Feature: Seed declaration path (Phase 3 of qa-runner-case-vocabulary)

```
**Decision Gate**
- Active context: none
- Activated criteria: creation of a new standalone command (`/relay-qa-seed`); creation of a new script; impact on shared contracts (`PRPs/auth/qa-seed.json` declaration schema, `qa-run.mjs` reason codes, the `qa-run-contract` check); execution-adjacent trust decision (a seed declaration becomes runnable only through an operator edit); cross-cutting artifact (a tracked declaration file the runner consumes); documentation-site registration (a new command is a registered surface)
- Decisions found:
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "Seed declaration approval (D1)" — `/relay-qa-seed` is non-interactive and writes `proposed` entries; the operator sets `confirmed` by editing the tracked file; the runner refuses anything else
  - Same PRD, Decisions Log "CLI scope (D2)" — commands run only through confirmed seed declarations; the generator never composes an argv and executes nothing
  - Same PRD, Decisions Log "Missing project seed scripts (D3)" — when a project has no command for a state the generator names the gap; it never generates a seed script
  - Same PRD, Decisions Log "Plan side only" — `/relay-qa-report` and the reports are untouched; the report is read-only input
  - Same PRD, Decisions Log "Phase serialization" — phases 1-7 share `lane:qa-run`; Phases 1 and 2 are `complete`, this phase runs third on the same files
  - Same PRD, Decisions Log "Frozen surfaces" — `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `scripts/visual/capture.mjs` byte-identical (AC-15)
  - Phase 2 plan (`PRPs/plans/completed/qa-runner-case-vocabulary-phase-2-captured-seeds.plan.md`) Notes — full AC-10 (a store on every declaration) and the `status` key were deferred to this phase because existing tests pin command-only declarations
  - `docs/decisions.md` [2026-05-06] / [2026-07-10] R-X strict — the Implementer authors zero test files; test updates are routed through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Flipping any opt-in gating key by heuristic" / "Activating the test pair by heuristic" — no relay component writes `confirmed`; a declaration becomes runnable only through an explicit operator edit
  - "Emitting secret values in run reports or logs" — `qa-seed.json` holds declarations only; refusal reasons name states and gaps, never values
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green" — no test is edited by the Implementer; the tests this phase's behavior change breaks are routed to the test pair (see Notes)
  - "Relying on interactive permission prompts in the autonomous loop" — the new command is standalone and never invoked by `/relay-execute`
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary — no new extension: `/relay-qa-seed` is non-interactive and confirmation is an operator edit of a tracked file
  - Command versus agent separation — the command owns judgment (finding existing project commands) and the script owns every deterministic write
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard (parent PRD AC-1) is a hard failure at every store- or network-touching site; the generator touches neither
  - `qa-run-contract` invariants stay true for `qa-run.mjs`: exact four-value `OUTCOMES`, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-case-vocabulary.prd.md` — Implementation Phases row 3: "Seed declaration path" — Goal: `qa-seed.json` stops being a hand-written file whose keys drift from the report — Success signal: against a `super-ensino`-shaped report, every state text becomes a byte-equal key; a state with no project command is written as a named gap; a `proposed` entry is refused by the runner and runs once the operator confirms it.

## Summary

This phase gives `qa-seed.json` a generator and a trust gate. A new script, `plugins/relay/scripts/qa-seed.mjs`, lists a report's distinct non-`none` required-state texts and merges proposals into `PRPs/auth/qa-seed.json`: each new key is the report's text byte-for-byte, each entry is written `status: "proposed"`, existing entries are never changed, and the script spawns nothing. A new standalone command, `/relay-qa-seed <feature>`, does the one piece of judgment: it finds commands the project already declares (package script, management command, Makefile target, seed script), cites each with `file:line`, writes a proposals file, and calls the script. A state with no existing command becomes `command: null` with a named gap. On the runner side, `prepareState` gains a pure, exported `classifySeedDeclaration` that refuses an entry whose `command` is `null` (`STATE_COMMAND_MISSING`, naming the gap), whose `status` is not exactly `confirmed` (`STATE_UNCONFIRMED`), or that names no checkable store (`FAILED_NON_LOCAL_TARGET`), before any command runs. `STATE_UNDECLARED` keeps its meaning. The command doc, the `qa-run-contract` check and the documentation site are updated for the new command.

## User Story

As the operator of relay's human validation gate
I want `qa-seed.json` generated from the report's own state texts, pointing only at commands my project already has
So that the seed gap behind `super-ensino`'s F8 (`STATE_UNDECLARED` for hand-paraphrased keys) closes without relay ever choosing a command that runs unreviewed

## Problem Statement

`qa-seed.json` is a hand-written file looked up by the **exact** required-state text, and `relay-qa-report.md` writes that text as free prose, so any paraphrase yields `STATE_UNDECLARED`; no command generates the file (F8). Separately, a declared seed runs the moment it exists: there is no operator confirmation step between a proposed command and its execution, and the runner reads no `status`. A seed executes a project command against a store, so the trust decision must stay with the human.

## Solution Statement

Plan side and runner side only. Add `qa-seed.mjs` (deterministic: key listing, proposal validation, atomic merge), `relay-qa-seed.md` (judgment: discovery with evidence), a `status` / `evidence` / `gap` vocabulary on `states[<text>]`, and `classifySeedDeclaration` in the runner. Treat a declaration with no `status` key as unconfirmed (strict reading of PRD AC-9; the decision and its test cost are recorded in Notes). Complete PRD AC-10 by requiring every runnable declaration to name a store that the local-only guard can evaluate.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/scripts/qa-seed.mjs` (new); `plugins/relay/commands/relay-qa-seed.md` (new); `plugins/relay/commands/relay-qa-run.md`; `scripts/validate/checks/qa-run-contract.mjs`; `documentation/` (registration only) |
| Dependencies | Phase 2 (`complete`): `runSeed(ctx, argv, decl)`, `normalizeStore`, `declaredCaptureNames` exist |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/qa-runner-case-vocabulary.prd.md` lines 228 (row 3), 256-259 (Phase Details), 100-103 (AC-7, AC-8, AC-9, AC-10) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-case-vocabulary.prd.md` | 100-103, 256-259 | AC-7, AC-8, AC-9, AC-10 and the Phase 3 scope/success signal |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1357-1389 | `prepareState` — the declaration lookup and refusal path being changed |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1397-1430 | `runSeed` — keeps the argv guard line verbatim and already guards a declared store |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 155-170 and 410 | the report field regex and exported `parseReport`, which the generator reuses to read `required_state` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 661-685 | the tmp-then-rename write idiom `qa-seed.mjs` mirrors |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 204-221 | the declaration-schema paragraph and example being extended with `status` |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 118-186 | the contract check being extended with seed-script and seed-command pins |
| P0 | `scripts/validate/checks/registration-parity.mjs` | 45-60 and 134-181 | a new command must be mentioned as `/relay-<name>` in `search-index.json` and `changelog.html` |
| P0 | `documentation/AGENTS.md` | 239-285 and 305-330 | the documentation-site contract: search index and changelog rules; read in full before Task 6 |
| P1 | `plugins/relay/commands/relay-qa-report.md` | 1-24 | frontmatter and body shape of a sibling command (`description`, `argument-hint`, `**Arguments:**`, `## Your mission`, `See:`) |
| P1 | `plugins/relay/commands/relay-qa-run.md` | 1-33 | the command shape `/relay-qa-seed` mirrors (flat one-line frontmatter) |
| P1 | `scripts/validate/schemas/command.schema.json` | 8-15 | a command needs `description` and `argument-hint` and must not carry `name` |
| P1 | `scripts/validate/checks/qa-run-captured-seeds.test.mjs` | 532-545 | read-only: tests that parse the doc's example declaration; the edit must keep its keys valid |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 915-975 | read-only: `seedFixture` and the seed tests whose status-less fixtures this phase's rule changes (ledger work, see Notes) |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1374-1385
  const missing = `the required state is not declared: PRPs/auth/qa-seed.json states[${JSON.stringify(text)}]`;
  if (stateKind !== 'declared') return blocked('STATE_UNDECLARED', missing);
  const states = ctx.seedConfig && isObj(ctx.seedConfig.states) ? ctx.seedConfig.states : {};
  const decl = Object.hasOwn(states, text) ? states[text] : null;
  const argv = decl && Array.isArray(decl.command) ? decl.command : null;
  if (argv === null || argv.length === 0 || !argv.every((a) => isStr(a) && a !== '')) return blocked('STATE_UNDECLARED', missing);
  let seeded = ctx.seeds.get(text);
  if (!seeded) {
    seeded = await runSeed(ctx, argv, decl);
    ctx.seeds.set(text, seeded);
  }
  if (!seeded.ok) return blocked(seeded.code, seeded.reason);
```
Copied by Task 1 (the classification slots between the declaration lookup and the argv check; the `missing` text is reused for `STATE_UNDECLARED`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1397-1402
export async function runSeed(ctx, argv, decl = {}) {
  for (const a of argv) {
    if (!a.includes('://')) continue;
    const r = await ctx.target.guard.checkTarget(a, { root: ctx.root });
    if (!r.ok) return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: `a seed command argument names a non-local URL (${r.reason}); the command was not executed` };
  }
```
Copied by Task 1 (this function is NOT edited; the pinned `if (!a.includes('://')) continue;` line must survive and `runSeed` already guards a declared `store`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:680-684
  const dest = resolve(destAbs);
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, dest);
```
Copied by Task 2 (`qa-seed.mjs` has its own single write helper using the same tmp-then-rename shape, with one `// WRITE-SITE` marker, writing only `PRPs/auth/qa-seed.json`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2111-2113
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
```
Copied by Task 2 (the script runs `main` only when it is the entry point, so importing it for tests has no side effect).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:155-156
const FIELD_RE =
  /^\s*(?:[-*+]\s+|\d+\.\s*)?\*\*(Title|Risk level|Risk|Required state|Coverage|Automated test path|Manual status|Manual step-by-step):\*\*\s*(.*)$/;
```
Copied by Task 2 (the shape of the report the generator reads through the exported `parseReport`; the generator never re-implements the regex).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:137-147
    for (const marker of ['// GUARD-SITE', '// WRITE-SITE']) {
      const n = occurrences(scriptText, marker);
      if (n !== 1) add(`the runner script must contain ${marker} exactly once, found ${n}`, SCRIPT_FILE);
    }
    for (const call of ['writeFileSync(', 'renameSync(']) {
      const n = occurrences(scriptText, call);
      if (n !== 1) add(`the single-write-helper rule: ${call} must appear exactly once, found ${n}`, SCRIPT_FILE);
    }
    for (const required of ['toISOString', 'FAILED_NON_LOCAL_TARGET', 'auth-local-guard.mjs', 'HUMAN GATE STILL OPEN']) {
```
Copied by Task 5 (the same occurrence-count pins applied to `qa-seed.mjs`, plus a ban on `child_process` and on the quoted word `confirmed`).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:3-4
argument-hint: '<feature | path-to-qa-report.md> [--env-handle <path>]'
---
```
Copied by Task 3 (a command's frontmatter is a flat one-line `description:` and `argument-hint:` pair; the doc's description ends with `Never invoked by /relay-execute.`).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:204-208
Declaration schema. A `states[<exact required-state text>]` entry in
`PRPs/auth/qa-seed.json` has `command` (an argv array), an optional `captures` map
(`{ "<variable>": { "path": "<dotted path into the seed's JSON stdout>", "redact": true } }`,
`redact` optional) and `store` (a URL or `host[:port]`, REQUIRED when `captures` is
present). The store is checked by the local-only guard before the seed runs; a
```
Copied by Task 4 (the paragraph gains `status`, `evidence`, `gap` and the "`store` required on every runnable declaration" rule).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | export `classifySeedDeclaration`; `prepareState` refuses `command: null`, non-`confirmed` status and an uncheckable store before any seed runs |
| `plugins/relay/scripts/qa-seed.mjs` | CREATE | deterministic generator half: `states` listing and `merge` of validated proposals into `PRPs/auth/qa-seed.json` as `proposed` entries |
| `plugins/relay/commands/relay-qa-seed.md` | CREATE | the standalone, non-interactive command: discovery of existing project commands with `file:line` evidence, `command: null` gaps |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | document `status`, `evidence`, `gap`, the new refusal codes, the store rule, and the pointer to `/relay-qa-seed` |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | pin the seed script and seed command invariants (no process spawning, one write helper, never writes `confirmed`) |
| `documentation/reference/commands.html` | UPDATE | add the `/relay-qa-seed` command block next to `/relay-qa-run` |
| `documentation/reference/scripts.html` | UPDATE | add the `qa-seed.mjs` section next to `qa-run.mjs` |
| `documentation/assets/data/search-index.json` | UPDATE | register `/relay-qa-seed` so `registration-parity` passes |
| `documentation/changelog.html` | UPDATE | log the new command (every `documentation/` change needs an entry) |

## NOT Building (Scope Limits)

- Any change to `/relay-qa-report` or the reports themselves; the generator reads the report and never writes it.
- A fifth outcome. New behavior is the reason codes `STATE_UNCONFIRMED` and `STATE_COMMAND_MISSING` (both `blocked`).
- Anything that writes `confirmed`. No relay command, script or agent writes it; the operator edits the tracked file.
- Seed `captures` generation. The generator proposes `command`, `evidence`, `gap` and an optional `store`; the operator adds `captures` and the real `store` during the dogfood.
- Generating seed scripts in target projects, or running any discovered command. A missing command is a named gap (PRD D3).
- A writer/reviewer pair for seed declarations, or any interactive step (PRD D1).
- Invocation from `/relay-execute`.
- The read-only DB driver, declared API origins, UI grounding and per-test record resolution — Phases 4-7.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-15).
- Any test file. R-X strict: the Implementer authors zero test files; the test pair authors the new corpus and updates the existing tests this phase's rule changes.
- A release or version bump (`plugin.json`, changelog version cut). The release is cut after the dogfood.
- Edits to the installed plugin cache under `~/.claude/plugins/cache`.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — classify a seed declaration before it runs

- **ACTION**: Delivers AC-A3 (only a `confirmed` declaration runs; `STATE_UNCONFIRMED`, `STATE_COMMAND_MISSING`; `STATE_UNDECLARED` keeps its meaning) and AC-A4 (every runnable declaration names a store the guard can evaluate). In `plugins/relay/scripts/qa-run.mjs`:
  1. Add an exported pure function `classifySeedDeclaration(decl, text)` next to `declaredCaptureNames` (no I/O, no `writeFileSync(`, no `outcome:` literal). It returns `null` when the declaration may run, otherwise `{ code, reason }`, checking in this order (first match wins):
     - `decl` is not an object, or `decl.command` is not `null` and not an array of non-empty strings with at least one element: `STATE_UNDECLARED` with the reason `the required state is not declared: PRPs/auth/qa-seed.json states[<JSON.stringify(text)>]` (byte-identical to the text `prepareState` builds today). A `decl` with `command` absent or `[]` therefore stays `STATE_UNDECLARED`, exactly as today.
     - `decl.command === null` (explicit null): `STATE_COMMAND_MISSING`, reason naming the state text and, when `decl.gap` is a non-empty string, the gap truncated to 200 characters; no command exists to run, so this precedes the status check (confirming such an entry cannot make it runnable).
     - `decl.status !== 'confirmed'` (exact string comparison; a missing `status`, `proposed`, `Confirmed` and `true` are all refused): `STATE_UNCONFIRMED`, reason naming the state text and telling the operator to review the entry and set `"status": "confirmed"` in `PRPs/auth/qa-seed.json`.
     - `normalizeStore(decl.store) === null`: `FAILED_NON_LOCAL_TARGET`, reason `the seed declaration names no checkable store; the command was not executed`.
  2. In `prepareState`, replace the single line that computes `argv` and the single `STATE_UNDECLARED` return that follows it with: `const verdict = classifySeedDeclaration(decl, text); if (verdict !== null) return blocked(verdict.code, verdict.reason);` then `const argv = decl.command;`. Keep everything after it (the per-state-text cache, the `runSeed(ctx, argv, decl)` call, the `addSecretValues` registration) unchanged. The `stateKind !== 'declared'` line stays ahead of the lookup, unchanged.
  3. Do not edit `runSeed`. Keep the line `if (!a.includes('://')) continue;` byte-for-byte (an existing test mutates that exact text). `runSeed` already guards a declared `store` before spawning; the new store requirement lives in `classifySeedDeclaration` so direct `runSeed(ctx, argv, {})` callers behave as today.
  4. No reason may carry a value from the declaration other than the state text and the `gap` string. Do not add any `writeFileSync(` or `renameSync(` call, a second `// GUARD-SITE` or `// WRITE-SITE` marker, or an `outcome:` literal outside the four values.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1374-1385` (the refusal site and the reused `missing` text) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1397-1402` (the pinned guard line that must survive).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { classifySeedDeclaration } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const T = "A teacher exists";
  const c = (d) => classifySeedDeclaration(d, T);
  const base = { command: ["node", "seed.mjs"], store: "localhost:5432" };
  if (c({ ...base, status: "confirmed" }) !== null) fail("a confirmed, stored declaration was refused: " + JSON.stringify(c({ ...base, status: "confirmed" })));
  for (const s of [undefined, "proposed", "Confirmed", true, ""]) {
    const v = c({ ...base, status: s });
    if (!v || v.code !== "STATE_UNCONFIRMED") fail("status " + JSON.stringify(s) + " was not STATE_UNCONFIRMED: " + JSON.stringify(v));
  }
  const gap = c({ command: null, status: "proposed", gap: "no seed script exists for teachers" });
  if (!gap || gap.code !== "STATE_COMMAND_MISSING" || !gap.reason.includes("no seed script exists for teachers") || !gap.reason.includes(T)) fail("null command not STATE_COMMAND_MISSING naming the gap: " + JSON.stringify(gap));
  const gapConfirmed = c({ command: null, status: "confirmed", store: "localhost:5432" });
  if (!gapConfirmed || gapConfirmed.code !== "STATE_COMMAND_MISSING") fail("a confirmed null command was not STATE_COMMAND_MISSING");
  for (const d of [null, "x", { status: "confirmed", store: "localhost:5432" }, { command: [], status: "confirmed", store: "localhost:5432" }, { command: ["a", ""], status: "confirmed", store: "localhost:5432" }]) {
    const v = c(d);
    if (!v || v.code !== "STATE_UNDECLARED" || !v.reason.includes("PRPs/auth/qa-seed.json states[")) fail("a malformed declaration was not STATE_UNDECLARED: " + JSON.stringify(d) + " -> " + JSON.stringify(v));
  }
  for (const s of [undefined, "", "a b", "host/path", 5]) {
    const v = c({ command: ["node", "x"], status: "confirmed", store: s });
    if (!v || v.code !== "FAILED_NON_LOCAL_TARGET") fail("an uncheckable store " + JSON.stringify(s) + " was not refused: " + JSON.stringify(v));
  }
  '
  [ "$(grep -c 'classifySeedDeclaration(' plugins/relay/scripts/qa-run.mjs)" -ge 2 ]
  grep -qF "if (!a.includes('://')) continue;" plugins/relay/scripts/qa-run.mjs
  ```
  Before this task, the import of `classifySeedDeclaration` fails (it is not exported) and the command exits non-zero. The second line asserts the helper is defined and called (at least two occurrences); the third asserts the pinned text survives.

### Task 2: CREATE plugins/relay/scripts/qa-seed.mjs — states listing and proposal merge

- **ACTION**: Delivers AC-A1 (every distinct non-`none` required-state text becomes a byte-equal `states` key; existing entries unchanged; the report byte-identical), AC-A2 (a proposal cites a real `file:line`; no proposal means `command: null` and a named gap; nothing is executed) and AC-A6 (the file holds declarations only). Create `plugins/relay/scripts/qa-seed.mjs` as a Node ESM script (`#!/usr/bin/env node`, `// @ts-check`, header comment naming the contract). It imports only `node:fs`, `node:path`, `node:url` and `parseReport` from `./qa-run.mjs`; it MUST NOT import or mention `child_process`, spawn, exec or fetch anything, and it MUST NOT contain the quoted word `confirmed` in either quote form (no relay component writes it). It runs `main` only when it is the entry point (mirror the entry-point guard), and exports `listStates(reportText)` and `mergeProposals(opts)` for tests. Subcommands:
  1. `states --report <path>`: reads the report, calls `parseReport`, and prints a JSON array of the distinct required-state texts in order of first appearance. Each text is `(case.required_state ?? '').trim()`; a text is skipped when empty or when it matches `/^(none|n\/a)\b/i` (the same rule `prepareState` applies). Exit 1 with `FAILED_REPORT_UNPARSEABLE: ...` on an unreadable report or zero cases.
  2. `merge --root <dir> --report <path> --proposals <path>`: reads the proposals file (`{ "states": { "<text>": { "command": ["argv", "..."], "evidence": "<relative path>:<line>", "store": "<optional host[:port] or URL>" } | { "command": null, "gap": "<why no command exists>" } } }`), the report's state list and the existing `<root>/PRPs/auth/qa-seed.json` (absent means `{ "states": {} }`; present but unparseable or without an object `states` means exit 1 `FAILED_SEED_FILE_UNPARSEABLE`, nothing written). It validates EVERY proposal before writing anything and exits 1 with `FAILED_SEED_PROPOSAL_INVALID: <reason>` (nothing written, no value echoed beyond the state text) when any of these holds: a proposal key is not one of the report's state texts (nothing is invented); a proposal carries a `status` key; `command` is neither `null` nor a non-empty array of non-empty strings; a non-null command has no `evidence`, or the evidence is not `<relative-path>:<line>` where the path is relative, has no `..` segment, names an existing file under `--root`, and `<line>` is an integer from 1 to the file's line count, or the cited line contains none of the command's non-first elements (or their basenames; for a one-element command, the element itself); a `null` command has no non-empty `gap` string; `store`, when present, is not a non-empty string. Then, for each report state text that is NOT already an own key of `states`: write a new entry `{ "command": <argv or null>, "status": "proposed", "evidence": <string>, "store": <string, when proposed> }` (non-null command) or `{ "command": null, "status": "proposed", "gap": <string> }`; a report state with no proposal gets `{ "command": null, "status": "proposed", "gap": "no existing project command was proposed for this state" }`. Every existing key and value, and every other top-level key of the file (for example `query_sources`), is preserved exactly. Write `<root>/PRPs/auth/qa-seed.json` only when at least one key was added, as `JSON.stringify(value, null, 2) + "\n"`, through ONE write helper marked `// WRITE-SITE` using tmp-then-rename (exactly one `writeFileSync(` and one `renameSync(` in the file), refusing any destination other than that path. Print a JSON summary `{ "added": [...], "kept": [...], "gaps": [...] }` of state texts to stdout.
  3. The script never reads the report with a write call and never names `qa-report.md` in any write; it writes nothing else. `--help` prints usage; an unknown subcommand exits 2.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:680-684` (the tmp-then-rename write), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2111-2113` (entry-point guard) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:155-156` (the report shape the shared `parseReport` reads).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { createHash } from "node:crypto";
  import { spawnSync } from "node:child_process";
  const fail = (m) => { console.error(m); process.exit(1); };
  const SCRIPT = "plugins/relay/scripts/qa-seed.mjs";
  const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
  const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
  const root = mkdtempSync(join(tmpdir(), "qa-seed-gen-"));
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(join(root, "PRPs", "reports", "f"), { recursive: true });
  const block = (n, state) => `### ${n}. Case ${n}\n- **Risk level:** High\n- **Required state:** ${state}\n- **Coverage:** manual\n- **Automated test path:** none\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. Do it\n\n`;
  const report = join(root, "PRPs", "reports", "f", "qa-report.md");
  writeFileSync(report, "# QA\n\n## Cases\n\n" + block(1, "A teacher exists") + block(2, "none") + block(3, "A student with 2 enrollments") + block(4, "An admin exists") + block(5, "A teacher exists"));
  writeFileSync(join(root, "package.json"), `{\n  "scripts": {\n    "seed:student": "node scripts/seed-student.mjs"\n  }\n}\n`);
  const seedFile = join(root, "PRPs", "auth", "qa-seed.json");
  const original = { states: { "A teacher exists": { command: ["node", "old.mjs"], status: "confirmed", store: "localhost:5432" } }, query_sources: { keep: "me" } };
  writeFileSync(seedFile, JSON.stringify(original, null, 2) + "\n");
  const states = run(["states", "--report", report]);
  if (states.status !== 0) fail("states exited " + states.status + ": " + states.stderr);
  if (JSON.parse(states.stdout).join("|") !== "A teacher exists|A student with 2 enrollments|An admin exists") fail("states listing wrong: " + states.stdout);
  const prop = join(root, "proposals.json");
  const good = { command: ["npm", "run", "seed:student"], evidence: "package.json:3", store: "localhost:5432" };
  const bad = (label, proposals) => {
    writeFileSync(prop, JSON.stringify({ states: proposals }));
    const before = readFileSync(seedFile, "utf8");
    const r = run(["merge", "--root", root, "--report", report, "--proposals", prop]);
    if (r.status === 0) fail(label + ": an invalid proposal was accepted");
    if (readFileSync(seedFile, "utf8") !== before) fail(label + ": the seed file changed on an invalid proposal");
  };
  bad("status key", { "A student with 2 enrollments": { ...good, status: "confirmed" } });
  bad("missing evidence file", { "A student with 2 enrollments": { ...good, evidence: "missing.json:1" } });
  bad("evidence line does not name the command", { "A student with 2 enrollments": { ...good, evidence: "package.json:1" } });
  bad("evidence escapes the root", { "A student with 2 enrollments": { ...good, evidence: "../x:1" } });
  bad("evidence line out of range", { "A student with 2 enrollments": { ...good, evidence: "package.json:99" } });
  bad("state not in the report", { "Invented state": { command: null, gap: "x" } });
  bad("null command without a gap", { "An admin exists": { command: null } });
  const reportBefore = sha(report);
  writeFileSync(prop, JSON.stringify({ states: { "A student with 2 enrollments": good } }));
  const r = run(["merge", "--root", root, "--report", report, "--proposals", prop]);
  if (r.status !== 0) fail("merge exited " + r.status + ": " + r.stderr);
  const seed = JSON.parse(readFileSync(seedFile, "utf8"));
  const keys = Object.keys(seed.states).sort().join("|");
  if (keys !== ["A teacher exists", "A student with 2 enrollments", "An admin exists"].sort().join("|")) fail("keys are not the report texts byte-for-byte: " + keys);
  if (JSON.stringify(seed.states["A teacher exists"]) !== JSON.stringify(original.states["A teacher exists"])) fail("an existing entry changed");
  if (JSON.stringify(seed.query_sources) !== JSON.stringify(original.query_sources)) fail("another top-level key changed");
  const s = seed.states["A student with 2 enrollments"];
  if (s.status !== "proposed" || s.command.join(" ") !== "npm run seed:student" || s.evidence !== "package.json:3") fail("student entry wrong: " + JSON.stringify(s));
  const a = seed.states["An admin exists"];
  if (a.status !== "proposed" || a.command !== null || typeof a.gap !== "string" || a.gap.length === 0) fail("admin gap entry wrong: " + JSON.stringify(a));
  if (Object.values(seed.states).filter((e) => e.status === "confirmed").length !== 1) fail("a relay-written entry is confirmed");
  if (sha(report) !== reportBefore) fail("the report changed");
  const again = run(["merge", "--root", root, "--report", report, "--proposals", prop]);
  if (again.status !== 0 || JSON.stringify(JSON.parse(readFileSync(seedFile, "utf8"))) !== JSON.stringify(seed)) fail("a second merge was not idempotent");
  '
  [ "$(grep -c 'writeFileSync(' plugins/relay/scripts/qa-seed.mjs)" -eq 1 ]
  [ "$(grep -c 'renameSync(' plugins/relay/scripts/qa-seed.mjs)" -eq 1 ]
  if grep -qE "child_process|spawn|exec(File)?Sync|fetch\(" plugins/relay/scripts/qa-seed.mjs; then echo "FAIL: the generator must not execute or fetch anything"; exit 1; else echo "PASS: no execution or network surface"; fi
  if grep -qE "[\"']confirmed[\"']" plugins/relay/scripts/qa-seed.mjs; then echo "FAIL: the generator names the quoted word confirmed"; exit 1; else echo "PASS: nothing writes confirmed"; fi
  ```
  Before this task the script does not exist, so the first spawned `states` run exits non-zero and the block fails. The fixture report uses the `- **Label:** value` bullet shape the shared `parseReport` accepts (see `FIELD_RE`); the greps assert forbidden surface is absent (exit 1 on a match) and the write-helper counts propagate through `set -e`.

### Task 3: CREATE plugins/relay/commands/relay-qa-seed.md — the standalone proposal command

- **ACTION**: Delivers AC-A1 and AC-A2 on the command side (judgment: find existing project commands with evidence; never invent, never run, never confirm) and AC-A5 (the command touches no frozen surface and is never invoked by `/relay-execute`). Create `plugins/relay/commands/relay-qa-seed.md`. Frontmatter is flat one-line `description:` (single-quoted, ending with `Never invoked by /relay-execute.`; escape an apostrophe by doubling it) and `argument-hint: '<feature | path-to-qa-report.md>'`; no `name` key. Body, mirroring `relay-qa-run.md`: `# /relay-qa-seed`, `**Arguments:** \`$ARGUMENTS\``, `## Your mission`, a `See:` list naming `${CLAUDE_PLUGIN_ROOT}/scripts/qa-seed.mjs`, `${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs` and `/relay-qa-run`; a six-line Decision Gate evidence block (same shape as `relay-qa-run.md`: PRP artifacts under `PRPs/`, the generator proposes and never confirms); `## Parse arguments` (a bare `<feature>` slug matching `^[a-z0-9][a-z0-9-]*$` or a path ending in `/qa-report.md`; anything else HALTs with a usage blockquote, nothing read or written); preconditions (P1 the three Decision Gate sources readable with the byte-exact missing-file pattern, P2 `PRPs/reports/<feature>/qa-report.md` exists else `FAILED_QA_REPORT_MISSING`); then the flow:
  1. Run, from a fenced bash block, exactly `node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-seed.mjs" states --report "<report>"` and treat its JSON array as the only list of states; never derive a state text yourself.
  2. For each text, search the project (Read, Glob, Grep only) for a command the project ALREADY declares that produces that state: a `package.json` script, a management command, a Makefile target or an existing seed script. Cite each as `evidence` `<relative-path>:<line>` where the cited line names the command. Never write, generate or modify a seed script; never run any discovered command; never use a command named only by the report's steps.
  3. Write `<target_root>/PRPs/reports/<feature>/qa-seed-proposals.json` with the `Write` tool using the shape `{ "states": { "<text>": { "command": ["argv"], "evidence": "<path>:<line>" } } }`; for a state with no existing command write `{ "command": null, "gap": "<what is missing, in one sentence>" }`. Never include `status`, `captures` or a credential or token value; an optional `store` is allowed only when the cited file states the store.
  4. Run, from a fenced bash block, exactly `node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-seed.mjs" merge --root "<target_root>" --report "<report>" --proposals "<proposals>"` and relay a `FAILED_SEED_*` halt verbatim (nothing was written).
  5. Final output: list the added entries (each `proposed`), the kept entries and every gap; then state that no entry is runnable until the operator reviews `git diff` on `PRPs/auth/qa-seed.json`, writes any missing project seed script, adds `captures` and the declaration's `store`, and edits `status` to `confirmed` by hand; `/relay-qa-run` refuses `proposed` entries with `STATE_UNCONFIRMED` and `command: null` entries with `STATE_COMMAND_MISSING`. Name `/relay-qa-run` as the next step in prose without a `Next:` line.
  `## Constraints (hard rules)`: never write anything under `.claude/`; never invoked by `/relay-execute`; the only files this command writes are the proposals file and, through the script, `PRPs/auth/qa-seed.json`; never edit `qa-report.md`; never write `status: confirmed` or any value that makes an entry runnable; never run a command; never dispatch a subagent; never ask the user a question; use the `Write` tool, not heredocs. Do not use the tokens `subagent_type` or the forbidden `.claude/PRPs` path anywhere in the file, and do not include a `Next:` line.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:3-4` (flat frontmatter shape) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:204-208` (the declaration vocabulary the command's examples must agree with).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f=plugins/relay/commands/relay-qa-seed.md
  head -4 "$f" | grep -q '^description: '
  head -4 "$f" | grep -q '^argument-hint: '
  if head -4 "$f" | grep -q '^name:'; then echo "FAIL: a command must not carry a name key"; exit 1; fi
  grep -qF 'Never invoked by /relay-execute' "$f"
  grep -qF 'qa-seed.mjs" states' "$f"
  grep -qF 'qa-seed.mjs" merge' "$f"
  grep -qF '"command": null' "$f"
  grep -qF 'STATE_UNCONFIRMED' "$f"
  grep -qF 'STATE_COMMAND_MISSING' "$f"
  grep -qF 'qa-seed-proposals.json' "$f"
  if grep -qE 'subagent_type|\.claude/PRPs|Next:' "$f"; then echo "FAIL: banned token in the seed command"; exit 1; else echo "PASS: no banned token"; fi
  if grep -qF '"status": "confirmed"' "$f"; then echo "FAIL: the command must not show a confirmed status literal to write"; exit 1; else echo "PASS: no confirmed literal"; fi
  ```
  Before this task the file does not exist, so `head` fails and the block exits non-zero. The greps copy literals byte-for-byte from the ACTION above (`qa-seed.mjs" states` and `qa-seed.mjs" merge` come from the two quoted bash lines, including the closing double quote after the script name).

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — document status, gaps and the new refusals

- **ACTION**: Delivers AC-A3 and AC-A4 for the planning agent and the operator: the doc states the enforced schema and codes. In `plugins/relay/commands/relay-qa-run.md`, keep every other section, the required tokens (`HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs`), every `<!-- qa-step-example ... -->` block and the banned-token rule (the file must not contain `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`), and:
  1. In the `Declaration schema.` paragraph, add: `status` (`proposed` or `confirmed`; the runner executes an entry only when `status` is exactly `confirmed`, and an entry with no `status` key is treated as `proposed`); `evidence` (a `<path>:<line>` citation written by `/relay-qa-seed`, ignored by the runner); `gap` (why no command exists, used with `"command": null`). Change the `store` sentence from required-when-`captures` to required on every declaration that can run, keeping the guard sentence and its `FAILED_NON_LOCAL_TARGET` outcome.
  2. Add the refusal vocabulary in the same paragraph: `STATE_UNCONFIRMED` (a declaration whose `status` is not `confirmed`; nothing runs), `STATE_COMMAND_MISSING` (`"command": null`, naming the gap; nothing runs) and that `STATE_UNDECLARED` means only that no usable declaration exists for the exact required-state text. State that `/relay-qa-seed <feature>` proposes entries keyed by the report's literal text and never writes `confirmed`; only the operator's edit of the tracked file does.
  3. Update the existing example declaration (the fenced `json` block after the paragraph, which is not a step example) by adding `"status": "confirmed"` to the entry, keeping its `command`, `store` and `captures` keys exactly as they are so existing tests that parse it keep working.
  4. In the Constraints bullet about seed commands, keep it and add that only `confirmed` declarations run. Do not rewrite the `HUMAN GATE STILL OPEN` statement or the Phase B run line.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:204-208` (the paragraph being extended).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f=plugins/relay/commands/relay-qa-run.md
  grep -qF 'STATE_UNCONFIRMED' "$f"
  grep -qF 'STATE_COMMAND_MISSING' "$f"
  grep -qF '/relay-qa-seed' "$f"
  grep -qF '"status": "confirmed"' "$f"
  grep -qF '"command": null' "$f"
  node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  ```
  Before this task, `STATE_UNCONFIRMED` is absent from the doc so the first `grep` exits non-zero. The literals are copied byte-for-byte from the ACTION above (including the quoted JSON keys); a text match is legitimate here because the deliverable IS the doc text, and the contract check additionally keeps every literal step example validating and the banned tokens out.

### Task 5: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the seed script and seed command

- **ACTION**: Delivers AC-A6 (no relay component writes `confirmed`; the generator never executes anything) as a standing validation. In `scripts/validate/checks/qa-run-contract.mjs` (a check module, not a test file; do not touch any `*.test.mjs`):
  1. Add constants `SEED_SCRIPT_FILE = 'plugins/relay/scripts/qa-seed.mjs'` and `SEED_COMMAND_FILE = 'plugins/relay/commands/relay-qa-seed.md'`.
  2. Extend `checkQaRunContract`'s input with two OPTIONAL fields, `seedScriptText` and `seedCommandText`, with the other inputs and every existing finding unchanged. When `seedScriptText` is a string (when it is `null`, add `missing or unreadable file: <SEED_SCRIPT_FILE>`; when `undefined`, add nothing, so existing callers and fixtures are unaffected), add findings (file `SEED_SCRIPT_FILE`) when: `// WRITE-SITE` does not occur exactly once; `writeFileSync(` or `renameSync(` does not occur exactly once; the text contains `child_process`; a line that calls a write function names `qa-report.md`; the text contains `'confirmed'` or `"confirmed"` (no relay component writes it); the text lacks `'proposed'` or `"proposed"`.
  3. When `seedCommandText` is a string (when `null`, add `missing or unreadable file: <SEED_COMMAND_FILE>`; when `undefined`, nothing), add findings (file `SEED_COMMAND_FILE`) when it lacks `qa-seed.mjs`, lacks `proposed`, or contains `subagent_type`, `.claude/PRPs` (this path MUST NOT appear in the command) or the literal `"status": "confirmed"`.
  4. `runQaRunContractCheck` passes `readOrNull(SEED_SCRIPT_FILE)` and `readOrNull(SEED_COMMAND_FILE)`. Do not register a new check and do not change `scripts/validate/index.mjs`; the existing 28-check count stays.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:137-147` (occurrence-count and required-token pins).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { checkQaRunContract, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const real = runQaRunContractCheck();
  if (!real.ok) fail("the real tree violates the contract: " + JSON.stringify(real.findings, null, 2));
  const SEED = "plugins/relay/scripts/qa-seed.mjs";
  const CMD = "plugins/relay/commands/relay-qa-seed.md";
  const mine = (r, file) => r.findings.filter((f) => f.file === file);
  const clean = "// WRITE-SITE\nfunction w(){ writeFileSync(a,b); renameSync(a,c); }\nconst s = \"proposed\";\n";
  if (mine(checkQaRunContract({ seedScriptText: clean }), SEED).length !== 0) fail("a clean seed script was flagged: " + JSON.stringify(mine(checkQaRunContract({ seedScriptText: clean }), SEED)));
  for (const [label, text] of [["child_process", clean + "import \"node:child_process\";\n"], ["confirmed literal", clean + "const c = \"confirmed\";\n"], ["second write", clean + "writeFileSync(x,y);\n"], ["no proposed", "// WRITE-SITE\nwriteFileSync(a,b); renameSync(a,c);\n"], ["no marker", "writeFileSync(a,b); renameSync(a,c); const s = \"proposed\";\n"]]) {
    if (mine(checkQaRunContract({ seedScriptText: text }), SEED).length === 0) fail("the seed script violation was not flagged: " + label);
  }
  if (mine(checkQaRunContract({ seedScriptText: null }), SEED).length === 0) fail("a missing seed script was not flagged");
  const cmdClean = "qa-seed.mjs proposed";
  if (mine(checkQaRunContract({ seedCommandText: cmdClean }), CMD).length !== 0) fail("a clean seed command was flagged");
  for (const [label, text] of [["subagent_type", cmdClean + " subagent_type"], ["claude path", cmdClean + " .claude/PRPs"], ["confirmed literal", cmdClean + " \"status\": \"confirmed\""], ["no script", "proposed"], ["no proposed", "qa-seed.mjs"]]) {
    if (mine(checkQaRunContract({ seedCommandText: text }), CMD).length === 0) fail("the seed command violation was not flagged: " + label);
  }
  if (mine(checkQaRunContract({}), SEED).length !== 0 || mine(checkQaRunContract({}), CMD).length !== 0) fail("omitted seed inputs must add no finding");
  '
  ```
  Before this task, the exported function ignores `seedScriptText` / `seedCommandText`, so the violation cases produce no finding and the block exits non-zero. The negative cases are built from the clean fixture so each one isolates a single rule.

### Task 6: UPDATE documentation/ — register /relay-qa-seed and qa-seed.mjs

- **ACTION**: Infrastructure/registration task; it delivers no acceptance criterion by itself and exists so `npm run validate` (`registration-parity`) passes with the new command on disk. Read `documentation/AGENTS.md` in full first (the site contract: no new CSS or JS files, no emojis, no inline styles, relative paths only, American English, no first person). No new page is created, so `documentation/assets/js/app.js` (NAV is page-level) is NOT edited. Then:
  1. `documentation/reference/commands.html`: add an `<h3 id="relay-qa-seed">` block immediately after the `/relay-qa-run` block (starts near line 339), copying that block's structure exactly (`<code>/relay-qa-seed &lt;feature&gt;</code>`, the `badge badge--done` badge, the `kv` Input/Output/Mode list): input the feature slug or report path; output `PRPs/auth/qa-seed.json` entries all `proposed` plus `PRPs/reports/<feature>/qa-seed-proposals.json`; mode standalone and non-interactive; one sentence that the operator sets `confirmed` by hand and that the runner refuses unconfirmed entries.
  2. `documentation/reference/scripts.html`: add an `<h2 id="qa-seed">` section after the `qa-run.mjs` section (near lines 207-223), mirroring it: path, invoked by `/relay-qa-seed`, a usage block with `states` and `merge`.
  3. `documentation/assets/data/search-index.json`: add one object (`title`, `path`, `category`, `excerpt`, keys in the same order as the neighboring `relay-qa-run` entries; `category` copied exactly from them; excerpt 15-35 words naming `/relay-qa-seed`, byte-equal state keys and `proposed` entries) pointing at `reference/commands.html#relay-qa-seed`, keeping the file valid JSON.
  4. `documentation/changelog.html`: add an entry under the current top (unreleased) block per `documentation/AGENTS.md` §7, under `Added`, mentioning `/relay-qa-seed` and `qa-seed.mjs`, and under `Changed` the runner refusals `STATE_UNCONFIRMED` and `STATE_COMMAND_MISSING`. Do not cut a version and do not bump `plugin.json`.
- **MIRROR**: `# SOURCE: documentation/AGENTS.md:265-279` (the search-index entry shape and rule that `category` matches exactly) — the `/relay-qa-run` block in `documentation/reference/commands.html` (near line 339) is read at implementation time for the block markup.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { runRegistrationParityCheck } from "./scripts/validate/checks/registration-parity.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const r = runRegistrationParityCheck();
  if (!r.ok) fail(JSON.stringify(r.findings, null, 2));
  const idx = JSON.parse(readFileSync("documentation/assets/data/search-index.json", "utf8"));
  if (!JSON.stringify(idx).includes("/relay-qa-seed")) fail("search index does not mention /relay-qa-seed");
  '
  grep -qF 'id="relay-qa-seed"' documentation/reference/commands.html
  grep -qF 'qa-seed.mjs' documentation/reference/scripts.html
  grep -qF 'STATE_UNCONFIRMED' documentation/changelog.html
  if grep -qE 'style="|<style' documentation/reference/commands.html documentation/reference/scripts.html; then echo "FAIL: inline style introduced into the doc site"; exit 1; else echo "PASS: no inline styles"; fi
  ```
  Before this task, the new command file exists but is mentioned in neither surface, so `runRegistrationParityCheck` reports it missing and the block exits non-zero. The greps assert literals this task itself authors (the anchor `id="relay-qa-seed"` and the code names), copied from the ACTION.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check plugins/relay/scripts/qa-seed.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
# The search index must stay valid JSON.
node -e 'JSON.parse(require("fs").readFileSync("documentation/assets/data/search-index.json", "utf8"))'
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The runner's vocabulary and contract hold, the seed surface is pinned, and the new exports exist (exit 1 on any miss).
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import * as qa from "./plugins/relay/scripts/qa-run.mjs";
if (qa.OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") { console.error("OUTCOMES changed"); process.exit(1); }
if (typeof qa.classifySeedDeclaration !== "function") { console.error("missing export: classifySeedDeclaration"); process.exit(1); }
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# The new files exist.
test -f plugins/relay/scripts/qa-seed.mjs
test -f plugins/relay/commands/relay-qa-seed.md
# The pinned argv-guard line (an existing test mutates this exact text) must survive in the runner.
grep -qF "if (!a.includes('://')) continue;" plugins/relay/scripts/qa-run.mjs
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
# No forbidden .claude/PRPs reference introduced outside the quoted prohibition idiom (tracked diff, then the two new files).
if git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced in tracked files"
fi
if grep -n "\.claude/PRPs" plugins/relay/scripts/qa-seed.mjs plugins/relay/commands/relay-qa-seed.md | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference in a new file"; exit 1
else
  echo "PASS: no forbidden path reference in new files"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite (28 checks today, no new check file) must pass; its exit code propagates.
# This includes registration-parity, frontmatter-schema, path-existence, dispatch-graph and auth-local-guard-sites for the new command.
npm run validate
# The corpus, restricted to the files whose fixtures this phase's status rule does not touch.
# qa-run.test.mjs and qa-run-captured-seeds.test.mjs build status-less seed fixtures that now (by design) return
# STATE_UNCONFIRMED; the test pair updates them through the lifecycle ledger (see Notes), so they are excluded here
# and the whole corpus is re-run, unfiltered, in /relay-test after the test pair finishes.
find scripts/validate -name '*.test.mjs' ! -name 'qa-run.test.mjs' ! -name 'qa-run-captured-seeds.test.mjs' -print0 | xargs -0 node --test
```

## Acceptance Criteria

- **AC-A1 (PRD AC-7):** Given a `qa-report.md`, when `/relay-qa-seed <feature>` runs, then every distinct non-`none` *Required state* text in the report appears as a `states` key in `PRPs/auth/qa-seed.json` that is byte-equal to the report's (trimmed) text; existing entries, their values and every other top-level key of the file are left unchanged; and the report is byte-identical afterwards.
- **AC-A2 (PRD AC-8):** Given a required state, when a declaration is proposed, then the command is one the project already declares, cited as `<path>:<line>` where the line exists in the file and names the command; a proposal whose evidence is missing, out of range, outside the root or does not name the command is refused with nothing written; when no command exists the entry is `command: null` with a named gap; the generator executes nothing and writes no seed script.
- **AC-A3 (PRD AC-9):** Given a seed entry whose `status` is not exactly `confirmed` (including a missing `status`) the case is `blocked` with `STATE_UNCONFIRMED`, and an entry with `command: null` is `blocked` with `STATE_COMMAND_MISSING` naming the gap, in both cases before any command runs; `STATE_UNDECLARED` keeps its meaning (no usable declaration exists for the exact state text); no relay command, script or agent writes `confirmed`.
- **AC-A4 (PRD AC-10):** Given a confirmed seed declaration, when the runner is about to execute it, then it names a store the local-only guard can evaluate and that passes the guard, otherwise the case is `blocked` with `FAILED_NON_LOCAL_TARGET` and nothing executes; every argv element naming a URL still passes the guard.
- **AC-A5 (PRD AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, `OUTCOMES` is still exactly the four values, and neither the new command nor `/relay-qa-run` is invoked by `/relay-execute`.
- **AC-A6 (PRD AC-16):** `qa-seed.json` holds declarations only (no captured values, tokens or credentials); the generator's refusal reasons name state texts and gaps only; and the contract check keeps the generator free of process spawning and of any write of `confirmed`.

R8b (PRD AC-N token check) is satisfied here by the `(PRD AC-N)` tokens above; the criteria are phase-scoped slices of PRD AC-7, AC-8, AC-9, AC-10, AC-15 and AC-16.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Treating a status-less declaration as unconfirmed breaks existing status-less fixtures | H | M | Deliberate and bounded: the breakage is limited to `qa-run.test.mjs` and `qa-run-captured-seeds.test.mjs` fixtures, routed to the test pair as `EXISTING_TEST_UPDATED` (Notes lists them); Level 3 excludes exactly those two files and the unfiltered corpus is run by `/relay-test` afterward |
| The generator proposes a command that does not exist or does not produce the state | M | H | Evidence must resolve to a real `file:line` naming the command, checked by the script; a proposal is only `proposed`, never runnable until the operator reads `git diff` and confirms; the generator executes nothing |
| A model-written proposal smuggles `status`, captures or a credential | L | H | The script refuses any `status` key, ignores nothing silently (invalid proposal means nothing is written), writes only the closed key set, and the contract check bans the quoted word `confirmed` in the script |
| The shared `parseReport` yields different state text than `prepareState` looks up | M | M | Both trim the same `required_state` and skip the same `none`/`n/a` rule; Task 2 VALIDATE asserts the byte-equal keys; the doc states the key is the report's literal text |
| `qa-seed.mjs` importing `qa-run.mjs` runs the runner | L | M | `qa-run.mjs` runs `main` only when it is the entry point (lines 2111-2113); the generator imports only `parseReport` |
| `/relay-qa-run` doc edits break the doc-example tests or banned-token rule | M | M | Task 4 keeps the example's keys, adds only `status`, and its VALIDATE runs `runQaRunContractCheck`; Level 3 runs the doc-parsing tests' file only after the test pair updates it |
| The documentation registration is incomplete (search index, changelog) and `npm run validate` fails | M | L | Task 6 VALIDATE runs `runRegistrationParityCheck` directly; Level 3 runs the full suite |
| research-codebase did not enumerate every file mentioning commands (for example `docs/api-reference.md`) | L | L | `docs_sync: true` routes `docs/` knowledge-base updates through the docs-updater at implement time; only `documentation/` registration is a validation gate |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Decision recorded: a declaration with no `status` key is NOT runnable.** PRD AC-9 says only an entry whose `status` the operator set to `confirmed` runs, and no relay component writes `confirmed`. Because `/relay-qa-seed` always writes `proposed`, an entry with no `status` was either hand-written before this phase or edited by the operator; treating it as runnable would be a heuristic default in the trust gate ("flipping an opt-in gating key by heuristic"), and would let the AC be satisfied only for generated entries. The cost is that existing legacy fixtures stop running and the operator must add `"status": "confirmed"` once to each pre-existing hand-written entry; the runner's refusal reason says exactly that. The rejected alternative (legacy = confirmed) keeps existing tests green but leaves the AC-9 gate bypassable by omission.
- **Recorded for the test pair (lifecycle-ledger work, never Implementer tasks).** The strict rule changes the behavior pinned by these existing tests, each to be handled as `EXISTING_TEST_UPDATED` (add `status: "confirmed"` and, where missing, a `store` such as `"localhost:5432"` to the fixture declaration, keeping the asserted outcome): in `scripts/validate/checks/qa-run.test.mjs`, the default `seedFixture` declaration (line ~923) and the tests that use it — "a state declared by exact text ... is seeded" (~929), "a failing declared seed command is blocked SEED_FAILED" (~955), the `isAllowedHost`-on-seed-argv test (~964, including its mutated plugin copy) and any later `seedFixture` users; the `STATE_UNDECLARED` scenario with `command: []` (~943) keeps its expectation unchanged because malformed argv is classified before the status check. In `scripts/validate/checks/qa-run-captured-seeds.test.mjs`, the `runRun` end-to-end tests that write a `qa-seed.json` declaration (~417, 429, 440, 448, 479, 488, 501, 515; the ~464 unbound-reference test is refused before `prepareState` and should be unaffected); the direct `runSeed` and `declaredCaptureNames` unit tests (~54-91, 207-310) are unaffected because `runSeed` is not changed. The tests at ~532 and ~540 parse the doc's example declaration, which keeps its keys. The test pair must also author NEW cases for: byte-equal keys from `states` and `merge`, existing entries preserved, report sha unchanged, every invalid-proposal refusal writing nothing, `command: null` gaps, `STATE_UNCONFIRMED` / `STATE_COMMAND_MISSING` end to end through `runRun` with a marker file proving no command ran, the missing-store refusal, the `proposed` to `confirmed` flip making the same declaration run, and the extended contract check (including its fixtures). The full corpus must be run with the quoted glob `node --test "scripts/validate/**/*.test.mjs"` after the ledger updates.
- **AC-10 completion.** Phase 2 required a `store` only for declarations that capture output; this phase requires an evaluable `store` on every runnable (confirmed) declaration, enforced in `classifySeedDeclaration` rather than `runSeed` so direct `runSeed(ctx, argv, {})` unit tests are unaffected. A declared store that is non-local is refused by the existing `runSeed` store guard before spawning.
- **Order of refusals.** malformed or absent declaration (`STATE_UNDECLARED`), then `command: null` (`STATE_COMMAND_MISSING`), then status (`STATE_UNCONFIRMED`), then store (`FAILED_NON_LOCAL_TARGET`). `command: null` precedes the status check because confirming such an entry cannot make it runnable, and the gap is the actionable information.
- **Guard-site registration.** `qa-seed.mjs` touches no network, store or process, so it needs no `GUARD_SITES` entry in `auth-local-guard-sites.mjs`; the runner's store guard is the existing `// GUARD-SITE`. If the implementer finds the generator needs to contact anything, that is a scope violation to HALT on, not a guard to add.
- **Registration surfaces.** Per the codebase research: `frontmatter-schema`, `dispatch-graph` and `path-existence` auto-discover `commands/*.md` and need no list edit (the command must not carry a `name` key, must not use `subagent_type`, and any backticked `${CLAUDE_PLUGIN_ROOT}/scripts/...` path must exist, which is why Task 2 precedes Task 3); `registration-parity` requires a `/relay-qa-seed` mention in `search-index.json` and `changelog.html`; NAV is page-level and is not edited. The research subagent did not open `README.md`, `plugin.json` or `marketplace.json`; it found no mention of `relay-qa-run` in them, so none is expected to need an edit, and `npm run validate` at Level 3 would fail loudly if one did.
- The plan writer has no shell tool: the VALIDATE commands were derived by reading the current tree and were not executed. Task 2's fixture report relies on the bullet-field shape `parseReport` accepts (read from `FIELD_RE`) and a `###` case heading; if the shared parser needs a different heading shape, adjust the fixture, not the assertions. The Level 2 frozen-surface and forbidden-reference checks pass on the unmodified tree by design, as regression guards.
- Release is out of scope: the 0.44.0 cut follows the phase 8 dogfood.

*Generated: 2026-10-05*
*Approved: 2026-10-05*
*Implemented: 2026-10-05*
*Status: IMPLEMENTED*
