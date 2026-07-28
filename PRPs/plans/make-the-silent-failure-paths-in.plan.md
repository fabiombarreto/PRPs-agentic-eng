# Feature: Make the silent failure paths in scripts/generate-final-report.mjs emit stderr warnings (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on reusable services (scripts/generate-final-report.mjs is invoked by /relay-pr, relay-qa-report.md's Visual Fidelity section, and the Test Runner reporting flow — a shared script consumed by multiple call sites even though only one file is edited); cross-cutting patterns (aligning error-handling convention across multiple functions in the same file)
- Decisions found:
  - [2026-04-30] D8 post-approval mutations are best-effort atomic with rollback note (docs/decisions.md:353-358) — the Reason clause explicitly names "graceful degradation + no silent failures" as the operative architectural rule; this fix directly implements that rule at three sites that currently violate it
  - [2026-04-19] Secret redaction policy for Test Runner reports (docs/decisions.md) — captured/emitted execution output must never leak secret values; bounds what the new warning messages may interpolate
- Applicable anti-patterns:
  - Emitting secret values in run reports or logs (docs/anti-patterns.md:34-39) — the new warning messages must interpolate only `path` and `err.message`, matching the existing `readJsonIfExists` convention exactly; never raw file contents, env values, or other data that could carry a credential
  - Writing pipeline artifacts under `.claude/` (docs/anti-patterns.md:61-67) — not triggered by the implementation itself (no artifact is produced by the fix), but binds this plan's own artifact path: `PRPs/plans/`, never `.claude/PRPs/`
- Applicable architectural rules:
  - Graceful degradation + no silent failures (docs/decisions.md [2026-04-30], line 357) — genuine errors must be surfaced (even non-fatally, via a warning); only true absence of a resource stays silent. This is the rule the three target sites currently violate.
  - Figma Visual-First Track Phase 7's binding output-omission contract (docs/context/architecture.md §"Three-pillar target architecture"; scripts/validate/checks/figma-visual-first-track-phase7.test.mjs) — the `## Visual Fidelity` table's Scope column and per-phase approval lines must stay omitted entirely (never an empty placeholder) whenever no phase_scope data is discoverable, and rendered output must stay byte-identical to the pre-Phase-7 base track. This fix must not perturb that contract — verified explicitly, not assumed (see Validation Commands Level 3).
- Result: PROCEED
```

## Source

Make the silent failure paths in scripts/generate-final-report.mjs emit stderr warnings consistent with readJsonIfExists

## Summary

`scripts/generate-final-report.mjs` renders the PR body / QA-report `## Visual Fidelity` section for every relay feature run, not only Figma Visual-First Track ones. Three `catch` blocks — one inside `loadPhaseScopes()` and two inside `loadVisualApprovalLine()` — currently swallow genuine `readFileSync`/`JSON.parse` failures with zero diagnostic output, unlike the file's own established `readJsonIfExists()` convention (stderr warning, then `return null`). This plan extends each of the three catch blocks to bind its error and write one `warning: could not <read|parse> <path>: <err.message>\n` line to `process.stderr`, mirroring `readJsonIfExists()` exactly in message shape, stream, and post-warning control flow. The fix is strictly additive to error-handling: no return value, rendered-output, or exit-code behavior changes. Implements the repo's recorded "graceful degradation + no silent failures" architectural rule (`docs/decisions.md` [2026-04-30]).

## User Story

As a relay maintainer debugging a Test Runner report whose Visual Fidelity table is missing an expected Scope column or human-approval line
I want the three silent read/parse failure paths in `scripts/generate-final-report.mjs` to emit a diagnostic stderr warning
So that I can immediately tell *why* the data is missing (a genuine read/parse error) instead of having to guess whether it was ever recorded at all

## Problem Statement

`scripts/generate-final-report.mjs` is invoked by `/relay-pr`, by `relay-qa-report.md`'s "Visual Fidelity section (figma_track-gated)", and by the Test Runner reporting flow to produce `final-report.md` for every relay feature run. Three `catch` blocks added in Figma Visual-First Track Phase 7 — `loadPhaseScopes()`'s `readFileSync` catch (scripts/generate-final-report.mjs:210-216) and `loadVisualApprovalLine()`'s `readFileSync` catch (231-235) and `JSON.parse` catch (239-243) — currently swallow genuine errors with no diagnostic output at all. This has been verified empirically with real CLI fixture runs: an unreadable `visual-approval.jsonl` (a directory in its place, causing `EISDIR`), a malformed/truncated last line, and an unreadable plan file (again `EISDIR`) each currently produce **zero** stderr output — the exact same silent behavior as a legitimately-absent file. This is a genuine defect against the repo's own recorded "graceful degradation + no silent failures" architectural rule (`docs/decisions.md` [2026-04-30], line 357) and departs from this same file's own established convention: `readJsonIfExists()` (lines 57-65) already writes a `warning: could not parse ...` line to stderr on exactly this class of failure. The inconsistency makes these three specific failure modes invisible to anyone debugging a missing Scope column or missing approval line in a real run — they look identical to "nothing was ever recorded here."

## Solution Statement

Extend each of the three silent `catch` blocks to bind its error (`catch (err)`) and write one `warning: could not <read|parse> <path>: <err.message>\n` line to `process.stderr` — mirroring `readJsonIfExists()`'s exact message shape, stream, and post-warning control flow — immediately before the existing `return null;` / `scopes.set(phase, null);` statement each block already executes today. The two diagnoses stay textually distinct: "could not read" for a `readFileSync` failure, "could not parse" for a `JSON.parse` failure — never collapsed into one generic string. No other behavior changes: the pre-existing `existsSync`-guarded "resource legitimately absent" paths (`loadVisualApprovalLine`'s line 229 guard; `loadPhaseScopes`'s "no plan file found" branch at 206-209) remain completely silent, rendered stdout/markdown stays byte-identical (verified by a before/after comparison against the pre-fix script recovered from `git HEAD`, not merely assumed), and the script's exit code is unaffected — so `execFileSync`-based test-harness invocations, which only throw on a non-zero exit and by default inherit stderr, are unaffected by the new stderr writes.

## Metadata

| Key | Value |
|-----|-------|
| Type | Bug fix — error-handling consistency (stderr diagnostics for silent-swallow catch blocks) |
| Complexity | Low |
| Systems Affected | `scripts/generate-final-report.mjs` (consumed by `/relay-pr`, `relay-qa-report.md`'s Visual Fidelity section, and the Test Runner reporting flow) |
| Dependencies | None |
| Estimated Tasks | 3 |
| Source PRD line ref | N/A — description mode (no source PRD; see `## Source` above for the verbatim description) |
| phase_type | feature |

Note: `design_source` and `phase_scope` Metadata rows are intentionally absent. This project's own `docs/context/methodology.md` does not declare `figma_track: true` (relay's own development repo has no Figma-sourced UI to track), so per `docs/context/plan-template.md` item 6 both conditional rows — and the conditional `## Design Source` section — are correctly omitted entirely, not set to "none".

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/generate-final-report.mjs` | 57-65 | `readJsonIfExists()` — the canonical stderr-warning pattern every task mirrors (message shape, stream, post-warning `return null`). |
| P0 | `scripts/generate-final-report.mjs` | 186-219 | `loadPhaseScopes()` — contains Task 1's target catch block (210-216) plus the "plan not found" silent branch (206-209) that must stay untouched. |
| P0 | `scripts/generate-final-report.mjs` | 221-250 | `loadVisualApprovalLine()` — contains Task 2's and Task 3's target catch blocks plus the `existsSync` guard (228-229) that must stay untouched. |
| P1 | `scripts/validate/checks/figma-visual-first-track-phase7.test.mjs` | 492-521 | The AC-A3 malformed-jsonl test — proves no existing assertion pins stderr silence at Task 3's site; its own comment (507-513) explicitly declines to assert on stderr so this fix would not have to fight it; documents the graceful-degradation properties (no throw, Scope column unaffected) this fix must preserve. |
| P1 | `docs/decisions.md` | 353-358 | `[2026-04-30] D8 post-approval mutations are best-effort atomic with rollback note` — source of the "graceful degradation + no silent failures" architectural rule this fix implements. |
| P2 | `docs/anti-patterns.md` | 34-39 | "Emitting secret values in run reports or logs" — bounds what the new warning messages may interpolate (path + err.message only). |
| P2 | `package.json` | 8-17 | Confirms the exact `npm run validate` script (`node scripts/validate/index.mjs`) and that no `typescript`/`tsc` devDependency or `tsconfig.json` exists in this repo, despite the target file's `// @ts-check` pragma — Level 1 below uses `node --check`, not an invented `tsc` command. |

## Patterns to Mirror

```js
# SOURCE: scripts/generate-final-report.mjs:57-65
function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    process.stderr.write(`warning: could not parse ${path}: ${err.message}\n`);
    return null;
  }
}
```
Copied by: Tasks 1, 2, and 3 — the message shape `warning: <diagnosis> <path>: <err.message>\n`, the single `process.stderr.write` call, and the unchanged `return`/`set` statement immediately after.

```js
# SOURCE: scripts/generate-final-report.mjs:228-229
const jsonlPath = join(reportsDir, phase, 'visual-approval.jsonl');
if (!existsSync(jsonlPath)) return null;
```
Boundary Tasks 2 and 3 must NOT cross: this `existsSync`-absent branch stays a silent `return null` — it is the "resource legitimately absent" case, not a failure, and is not part of this fix.

```js
# SOURCE: scripts/generate-final-report.mjs:205-216 (current shape, before this fix)
    const planPath = findPlanForPhase(plansRoot, match[1]);
    if (!planPath) {
      scopes.set(phase, null);
      continue;
    }
    try {
      const content = readFileSync(planPath, 'utf-8');
      const scopeMatch = /\|\s*phase_scope\s*\|\s*(visual|logic)\s*\|/i.exec(content);
      scopes.set(phase, scopeMatch ? scopeMatch[1].toLowerCase() : null);
    } catch {
      scopes.set(phase, null);
    }
```
Edited by: Task 1 (the catch block at lines 210-216 only). The preceding `if (!planPath)` branch (206-209) is the "not found" silent case and stays untouched — it is shown here only to make the boundary explicit.

```js
# SOURCE: scripts/generate-final-report.mjs:230-243 (current shape, before this fix)
  let content;
  try {
    content = readFileSync(jsonlPath, 'utf-8');
  } catch {
    return null;
  }
  const nonEmptyLines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (nonEmptyLines.length === 0) return null;
  let entry;
  try {
    entry = JSON.parse(nonEmptyLines[nonEmptyLines.length - 1]);
  } catch {
    return null;
  }
```
Edited by: Task 2 (the first catch, lines 231-235) and Task 3 (the second catch, lines 239-243). The `nonEmptyLines.length === 0` branch (line 237) sits between them and stays untouched — per the function's own doc comment, an empty file is intentionally treated the same as an absent file, not as an error.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `scripts/generate-final-report.mjs` | UPDATE | Add a stderr warning to each of the three silent-swallow catch blocks (`loadPhaseScopes`'s `readFileSync` catch; `loadVisualApprovalLine`'s `readFileSync` and `JSON.parse` catches), mirroring the file's own `readJsonIfExists` convention. This is the ONLY file changed by this plan — R-X strict: the Implementer authors zero test files; the test-writer/test-reviewer pair owns any test-file changes, test-after per `docs/context/methodology.md` (`tdd: false`, `test_frameworks: ["node:test"]`). |

## NOT Building (Scope Limits)

- No test files of any kind. The test-writer/test-reviewer pair owns test authorship (test-after ordering, since `tdd: false` and `test_frameworks: ["node:test"]` is declared) — R-X strict forbids the Implementer from touching test files, and the `## Files to Change` table above lists only `scripts/generate-final-report.mjs`.
- No change to the `existsSync`-guarded "resource legitimately absent" branches: `loadVisualApprovalLine`'s line 229 guard (`if (!existsSync(jsonlPath)) return null;`) and `loadPhaseScopes`'s "no plan file found" branch (lines 206-209, reached when `findPlanForPhase` returns `null`). Both stay silent — absence is not a failure.
- No change to `loadVisualApprovalLine`'s other silent `return null` branches that are not genuine read/parse errors: the empty-file case (`nonEmptyLines.length === 0`, line 237) and the "entry carries neither an approved nor a rejected decision" case (line 245). Neither is a read/parse failure; both stay silent, unchanged.
- No change to `findPlanForPhase()`'s own `existsSync`/`statSync`/`readdirSync` directory-walk (lines 168-184) — out of scope; only the three named catch sites are touched.
- No change to rendered stdout/markdown output, function signatures, return values, or call sites anywhere in the file — purely additive stderr side effects. Verified explicitly by the before/after comparison in Validation Commands Level 3, never merely assumed.
- No change to the script's exit code in any fixture in scope.
- No broader repo-wide stderr-convention refactor. `scripts/validate/index.mjs`, `scripts/eval.mjs`, `scripts/setup-hooks.mjs`, and `scripts/normalize-test-output.mjs` all use a different, fatal `die(code, msg)` idiom (message + `process.exit`) and are untouched by this plan.
- No new CLI flags (e.g. a `--quiet`/`--verbose` toggle) — out of scope for this fix.

## Step-by-Step Tasks

### Task 1: UPDATE scripts/generate-final-report.mjs (loadPhaseScopes readFileSync catch)

- **ACTION**: In `loadPhaseScopes()`, replace the bare `catch { scopes.set(phase, null); }` around the `readFileSync(planPath, 'utf-8')` call (lines 210-216) with a catch that binds the error and writes one `warning: could not read <planPath>: <err.message>` line to stderr immediately before the existing `scopes.set(phase, null);` call. Control flow and the returned `Map` value are otherwise unchanged. Additionally extend the function's own doc comment (lines 186-196, currently ending "...or no phase_scope row is present. Never throws.") with one sentence: "A genuine read failure on a found plan file additionally emits a `warning: could not read ...` line to stderr before falling back to null." (Implements AC-A1 — this task's VALIDATE proves the new warning is emitted for the read failure on the phase-2 plan; the "plan not found" absence-boundary sub-clause of AC-A3 is covered instead by Level 3(b) fixture A, whose `PRPs/plans/` directory is never created at all.)

  Before:
  ```js
      try {
        const content = readFileSync(planPath, 'utf-8');
        const scopeMatch = /\|\s*phase_scope\s*\|\s*(visual|logic)\s*\|/i.exec(content);
        scopes.set(phase, scopeMatch ? scopeMatch[1].toLowerCase() : null);
      } catch {
        scopes.set(phase, null);
      }
  ```

  After:
  ```js
      try {
        const content = readFileSync(planPath, 'utf-8');
        const scopeMatch = /\|\s*phase_scope\s*\|\s*(visual|logic)\s*\|/i.exec(content);
        scopes.set(phase, scopeMatch ? scopeMatch[1].toLowerCase() : null);
      } catch (err) {
        process.stderr.write(`warning: could not read ${planPath}: ${err.message}\n`);
        scopes.set(phase, null);
      }
  ```

- **MIRROR**: Patterns to Mirror snippet 1 (`readJsonIfExists`, scripts/generate-final-report.mjs:57-65) for message shape/stream/control-flow; snippet 3 (scripts/generate-final-report.mjs:205-216) for the exact current shape being edited.
- **VALIDATE**: (run from the repository root; creates and removes its own temp fixture; real exit-code semantics via `assert` — a thrown `AssertionError` exits the process non-zero)
  ```bash
  node -e "
  const assert = require('assert');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } = require('fs');
  const { join } = require('path');
  const os = require('os');
  const { spawnSync } = require('child_process');
  const dir = mkdtempSync(join(os.tmpdir(), 'val-t1-'));
  const reportsDir = join(dir, 'PRPs', 'reports', 'f');
  mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
  mkdirSync(join(reportsDir, 'phase-2', 'visual', '1'), { recursive: true });
  writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature: 'f', run_id: 'r', outcome: 'GREEN' }));
  writeFileSync(join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'), JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }]));
  writeFileSync(join(reportsDir, 'phase-2', 'visual', '1', 'fidelity-report.json'), JSON.stringify([{ node_id: '2:2', route: '/x', diff_percent: 0, threshold: 2, status: 'PASS' }]));
  mkdirSync(join(dir, 'PRPs', 'plans'), { recursive: true });
  writeFileSync(join(dir, 'PRPs', 'plans', 'f-phase-1-x.plan.md'), '## Metadata\n\n| Key | Value |\n|-----|-------|\n| phase_scope | visual |\n');
  mkdirSync(join(dir, 'PRPs', 'plans', 'f-phase-2-y.plan.md'));
  const res = spawnSync(process.execPath, ['scripts/generate-final-report.mjs', reportsDir, '--out', join(dir, 'out.md')], { encoding: 'utf-8' });
  assert.equal(res.status, 0, 'script must still exit 0 despite the read failure on the phase-2 plan');
  assert.match(res.stderr, /warning: could not read .*phase-2-y\.plan\.md/i, 'expected a could-not-read stderr warning naming the unreadable plan path');
  const out = readFileSync(join(dir, 'out.md'), 'utf-8');
  assert.match(out, /\| phase-1 \| 1:1 \| \/ \| 0 \| 2 \| PASS \| visual \|/, 'expected phase-1 row to still render its real scope despite phase-2 failing to read');
  assert.match(out, /\| phase-2 \| 2:2 \| \/x \| 0 \| 2 \| PASS \| — \|/, 'expected phase-2 row to fall back to the literal em-dash, not crash the whole table');
  rmSync(dir, { recursive: true, force: true });
  console.log('PASS: Task 1 - loadPhaseScopes readFileSync catch now warns; other phases unaffected');
  "
  ```

### Task 2: UPDATE scripts/generate-final-report.mjs (loadVisualApprovalLine readFileSync catch)

- **ACTION**: In `loadVisualApprovalLine()`, replace the bare `catch { return null; }` around the `readFileSync(jsonlPath, 'utf-8')` call (lines 231-235) with a catch that binds the error and writes one `warning: could not read <jsonlPath>: <err.message>` line to stderr immediately before the existing `return null;`. Additionally extend the function's own doc comment (lines 222-227, currently ending "...or carries neither an 'approved' nor a 'rejected' decision. Never throws.") with one sentence: "A genuine read or parse failure (past the `existsSync` absence guard) additionally emits a `warning: could not read|parse ...` line to stderr before returning null." (Implements AC-A1, AC-A2 — this task's VALIDATE asserts the "could not read" diagnosis and explicitly asserts the "could not parse" diagnosis is absent.)

  Before:
  ```js
    let content;
    try {
      content = readFileSync(jsonlPath, 'utf-8');
    } catch {
      return null;
    }
  ```

  After:
  ```js
    let content;
    try {
      content = readFileSync(jsonlPath, 'utf-8');
    } catch (err) {
      process.stderr.write(`warning: could not read ${jsonlPath}: ${err.message}\n`);
      return null;
    }
  ```

- **MIRROR**: Patterns to Mirror snippet 1 (`readJsonIfExists`, scripts/generate-final-report.mjs:57-65) for message shape/stream; snippet 2 (scripts/generate-final-report.mjs:228-229) for the boundary — do not touch the preceding `existsSync` guard; snippet 4 (scripts/generate-final-report.mjs:230-243) for the exact current shape being edited.
- **VALIDATE**: (run from the repository root)
  ```bash
  node -e "
  const assert = require('assert');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('fs');
  const { join } = require('path');
  const os = require('os');
  const { spawnSync } = require('child_process');
  const dir = mkdtempSync(join(os.tmpdir(), 'val-t2-'));
  const reportsDir = join(dir, 'PRPs', 'reports', 'f');
  mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
  writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature: 'f', run_id: 'r', outcome: 'GREEN' }));
  writeFileSync(join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'), JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }]));
  mkdirSync(join(reportsDir, 'phase-1', 'visual-approval.jsonl'));
  // loadVisualApprovalLine is only invoked when phaseScopes.get(phase) is non-null
  // (generate-final-report.mjs:483) — a real, readable plan declaring phase_scope
  // is required here, or this fixture never reaches the catch under test.
  mkdirSync(join(dir, 'PRPs', 'plans'), { recursive: true });
  writeFileSync(join(dir, 'PRPs', 'plans', 'f-phase-1-x.plan.md'), '## Metadata\n\n| Key | Value |\n|-----|-------|\n| phase_scope | visual |\n');
  const res = spawnSync(process.execPath, ['scripts/generate-final-report.mjs', reportsDir, '--out', join(dir, 'out.md')], { encoding: 'utf-8' });
  assert.equal(res.status, 0, 'script must still exit 0 despite the read failure');
  assert.match(res.stderr, /warning: could not read .*visual-approval\.jsonl/i, 'expected a could-not-read stderr warning naming the jsonl path');
  assert.doesNotMatch(res.stderr, /could not parse/i, 'expected the read-failure diagnosis, not the parse-failure diagnosis, for this fixture');
  rmSync(dir, { recursive: true, force: true });
  console.log('PASS: Task 2 - loadVisualApprovalLine readFileSync catch now warns');
  "
  ```

### Task 3: UPDATE scripts/generate-final-report.mjs (loadVisualApprovalLine JSON.parse catch)

- **ACTION**: In `loadVisualApprovalLine()`, replace the bare `catch { return null; }` around `JSON.parse(nonEmptyLines[nonEmptyLines.length - 1])` (lines 239-243) with a catch that binds the error and writes one `warning: could not parse <jsonlPath>: <err.message>` line to stderr immediately before the existing `return null;`. Note the message names `jsonlPath` (the file), not the raw last-line fragment being parsed — consistent with `readJsonIfExists`, which always names the file path, never the content. The doc-comment extension for this function was already made by Task 2; no further comment change here. (Implements AC-A1, AC-A2 — this task's VALIDATE asserts the "could not parse" diagnosis and explicitly asserts the "could not read" diagnosis is absent.)

  Before:
  ```js
    let entry;
    try {
      entry = JSON.parse(nonEmptyLines[nonEmptyLines.length - 1]);
    } catch {
      return null;
    }
  ```

  After:
  ```js
    let entry;
    try {
      entry = JSON.parse(nonEmptyLines[nonEmptyLines.length - 1]);
    } catch (err) {
      process.stderr.write(`warning: could not parse ${jsonlPath}: ${err.message}\n`);
      return null;
    }
  ```

- **MIRROR**: Patterns to Mirror snippet 1 (`readJsonIfExists`, scripts/generate-final-report.mjs:57-65) for message shape/stream; snippet 4 (scripts/generate-final-report.mjs:230-243) for the exact current shape being edited.
- **VALIDATE**: (run from the repository root; this is the same malformed-last-line shape the existing AC-A3 test in figma-visual-first-track-phase7.test.mjs uses, confirming this fix doesn't fight that test)
  ```bash
  node -e "
  const assert = require('assert');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('fs');
  const { join } = require('path');
  const os = require('os');
  const { spawnSync } = require('child_process');
  const dir = mkdtempSync(join(os.tmpdir(), 'val-t3-'));
  const reportsDir = join(dir, 'PRPs', 'reports', 'f');
  mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
  writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature: 'f', run_id: 'r', outcome: 'GREEN' }));
  writeFileSync(join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'), JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }]));
  writeFileSync(join(reportsDir, 'phase-1', 'visual-approval.jsonl'), 'not-valid-json{');
  // loadVisualApprovalLine is only invoked when phaseScopes.get(phase) is non-null
  // (generate-final-report.mjs:483) — a real, readable plan declaring phase_scope
  // is required here, or this fixture never reaches the catch under test.
  mkdirSync(join(dir, 'PRPs', 'plans'), { recursive: true });
  writeFileSync(join(dir, 'PRPs', 'plans', 'f-phase-1-x.plan.md'), '## Metadata\n\n| Key | Value |\n|-----|-------|\n| phase_scope | visual |\n');
  const res = spawnSync(process.execPath, ['scripts/generate-final-report.mjs', reportsDir, '--out', join(dir, 'out.md')], { encoding: 'utf-8' });
  assert.equal(res.status, 0, 'script must still exit 0 despite the parse failure');
  assert.match(res.stderr, /warning: could not parse .*visual-approval\.jsonl/i, 'expected a could-not-parse stderr warning naming the jsonl path');
  assert.doesNotMatch(res.stderr, /could not read/i, 'expected the parse-failure diagnosis, not the read-failure diagnosis, for this fixture');
  rmSync(dir, { recursive: true, force: true });
  console.log('PASS: Task 3 - loadVisualApprovalLine JSON.parse catch now warns');
  "
  ```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

Run from the repository root:

```bash
set -euo pipefail
node --check scripts/generate-final-report.mjs
npm run validate
```

Both must exit 0 — `set -euo pipefail` makes the block exit non-zero immediately on either command's failure, rather than silently reflecting only the last command's status. `node --check` is Node's built-in syntax-only checker — genuinely present in every Node ≥18 install per this repo's `package.json` `engines` field. The target file carries a `// @ts-check` pragma, but the repo has no `tsconfig.json` and no `typescript` devDependency (confirmed: `package.json` devDependencies are `ajv`, `node-html-parser`, `promptfoo` only) — a `tsc` invocation would be invented, not real, so `node --check` is the honest substitute. `npm run validate` runs `node scripts/validate/index.mjs`, the repo's own static consistency-check suite (CLAUDE.md: "8 static consistency checks"; grown since).

### Level 2 — UNIT_TESTS (scoped to the diff)

Run from the repository root:

```bash
node --test scripts/validate/checks/figma-track-phase7.test.mjs scripts/validate/checks/figma-visual-first-track-phase7.test.mjs
```

Must exit 0 — `node --test`'s own exit code propagates directly (non-zero on any failing test). These are the two existing suites confirmed (by direct read and independent codebase research) to already exercise `scripts/generate-final-report.mjs` via real `execFileSync` CLI invocation, including the AC-A3 malformed-jsonl test (figma-visual-first-track-phase7.test.mjs:492-521) that Task 3's fixture mirrors. Both files MUST continue to pass completely unmodified — this is the explicit "existing tests must pass unchanged" requirement; no assertion in either file pins stderr silence at any of the three sites this plan touches.

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

**(a) Full existing corpus (repo-wide regression sweep).** Run from the repository root:

```bash
node --test scripts/validate/checks/*.test.mjs
```

Must exit 0. NOTE: `node --test <dir>` does NOT recurse on Node v24 on Windows — the glob-expanded file-list form above (relying on shell glob expansion, not Node's own directory traversal) is required, not a bare directory argument.

**(b) Before/after rendered-markdown comparison — proves the fix is stderr-only.** Recovers the pre-fix script from `git HEAD` (the Implementer's working-tree edit is not yet committed at validation time) and asserts byte-identical stdout (timestamp footer normalized before comparison) across three fixtures — a clean baseline, the loadPhaseScopes defect (Task 1), and the loadVisualApprovalLine defect (Task 2) layered on top of a working Scope-column read — while asserting stderr differs exactly where expected. Run from the repository root:

```bash
node -e "
const assert = require('assert');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } = require('fs');
const { join } = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const dir = mkdtempSync(join(os.tmpdir(), 'val-baseline-'));
const beforeScript = join(dir, 'before-generate-final-report.mjs');
const beforeSrc = execFileSync('git', ['show', 'HEAD:scripts/generate-final-report.mjs'], { encoding: 'utf-8' });
writeFileSync(beforeScript, beforeSrc);

function buildBase(name) {
  const reportsDir = join(dir, name, 'PRPs', 'reports', 'f');
  mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
  writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature: 'f', run_id: 'r', outcome: 'GREEN' }));
  writeFileSync(join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'), JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }]));
  return reportsDir;
}

const reportsA = buildBase('a');

const reportsB = buildBase('b');
mkdirSync(join(dir, 'b', 'PRPs', 'plans'), { recursive: true });
mkdirSync(join(dir, 'b', 'PRPs', 'plans', 'f-phase-1-x.plan.md'));

const reportsC = buildBase('c');
mkdirSync(join(dir, 'c', 'PRPs', 'plans'), { recursive: true });
writeFileSync(join(dir, 'c', 'PRPs', 'plans', 'f-phase-1-x.plan.md'), '## Metadata\n\n| Key | Value |\n|-----|-------|\n| phase_scope | visual |\n');
mkdirSync(join(reportsC, 'phase-1', 'visual-approval.jsonl'));

const cases = [
  { label: 'A', reportsDir: reportsA, expectWarnAfter: null },
  { label: 'B', reportsDir: reportsB, expectWarnAfter: /warning: could not read .*plan\.md/i },
  { label: 'C', reportsDir: reportsC, expectWarnAfter: /warning: could not read .*visual-approval\.jsonl/i }
];

// The rendered footer embeds new Date().toISOString() (generate-final-report.mjs:495).
// The before/after runs are sequential spawnSync calls, so the two timestamps never
// match byte-for-byte even on a provably unchanged implementation — normalize ONLY
// that substring before comparing; every other region (table, Scope column, approval
// lines) is compared raw.
const norm = (s) => s.replace(/_Generated \S+ from/, '_Generated <TS> from');

for (let i = 0; i < cases.length; i++) {
  const label = cases[i].label;
  const reportsDir = cases[i].reportsDir;
  const expectWarnAfter = cases[i].expectWarnAfter;
  const outBefore = join(dir, 'out-' + label + '-before.md');
  const outAfter = join(dir, 'out-' + label + '-after.md');
  const resBefore = spawnSync(process.execPath, [beforeScript, reportsDir, '--out', outBefore], { encoding: 'utf-8' });
  const resAfter = spawnSync(process.execPath, ['scripts/generate-final-report.mjs', reportsDir, '--out', outAfter], { encoding: 'utf-8' });
  assert.equal(resBefore.status, 0, 'fixture ' + label + ': pre-fix script must exit 0');
  assert.equal(resAfter.status, 0, 'fixture ' + label + ': post-fix script must exit 0');
  const before = readFileSync(outBefore, 'utf-8');
  const after = readFileSync(outAfter, 'utf-8');
  assert.equal(norm(after), norm(before), 'fixture ' + label + ': rendered markdown changed - expected byte-identical stdout (timestamp-normalized), stderr-only diff');
  assert.equal(resBefore.stderr, '', 'fixture ' + label + ': pre-fix script is expected to have emitted no stderr (documents the defect this fix corrects)');
  if (expectWarnAfter) {
    assert.match(resAfter.stderr, expectWarnAfter, 'fixture ' + label + ': post-fix script should now warn on stderr');
  } else {
    assert.equal(resAfter.stderr, '', 'fixture ' + label + ': no genuine error in this fixture, expected no stderr after the fix either');
  }
}

rmSync(dir, { recursive: true, force: true });
console.log('PASS: before/after rendered markdown byte-identical across 3 fixtures; stderr now warns exactly where the fixed catch blocks are exercised');
"
```

Must exit 0 (an `AssertionError` from any failed `assert.*` call propagates a non-zero exit; no masking `&&`/`||` idiom is used anywhere in this plan's validation commands).

**(c) Per-site targeted checks.** Already covered by each task's own `**VALIDATE**` command above (Tasks 1-3) — not duplicated here.

## Acceptance Criteria

*R8b (PRD AC-N token check) does not apply in description mode — no (PRD AC-N) token required.*

- **AC-A1:** All three previously-silent catch blocks in `scripts/generate-final-report.mjs` (`loadPhaseScopes`'s `readFileSync` catch; `loadVisualApprovalLine`'s `readFileSync` catch; `loadVisualApprovalLine`'s `JSON.parse` catch) emit a single-line stderr warning of the shape `warning: could not <read|parse> <path>: <err.message>\n` when the underlying operation genuinely fails, using `process.stderr.write` exactly as `readJsonIfExists` already does.
- **AC-A2:** The two diagnoses ("could not read" vs "could not parse") remain textually distinguishable in every emitted warning message — no site collapses both failure modes into one generic string.
- **AC-A3:** The `existsSync`-guarded "resource legitimately absent" paths (`loadVisualApprovalLine`'s line 229 guard; `loadPhaseScopes`'s "no plan file found" branch at lines 206-209) remain completely silent — no warning is added to any absence-only path; only genuine read/parse errors past those guards warn.
- **AC-A4:** Rendered stdout/markdown output (the `## Visual Fidelity` table's Scope column and the per-phase human-approval lines) is byte-identical before and after this change, across every fixture shape exercised — the fix is stderr-only; no rendering logic, return value, or control-flow branch changes.
- **AC-A5:** The existing `figma-visual-first-track-phase7.test.mjs` and `figma-track-phase7.test.mjs` tests that exercise these code paths continue to pass completely unmodified — including the AC-A3 malformed-jsonl test, whose own comment (lines 507-513) explicitly declines to pin stderr silence so this exact fix would not have to fight it.
- **AC-A6:** `execFileSync`/`spawnSync`-based test-harness invocations of the script are unaffected by the new stderr output — the script's exit code (0 on success in every in-scope fixture) is unchanged; a harness with default `stdio` inherits stderr and only throws on a non-zero exit.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| New stderr output breaks a test harness elsewhere in the repo that asserts on captured stderr for these paths | Low | Medium | Codebase research confirmed no `*.test.mjs` file in `scripts/validate/checks/` asserts stderr emptiness for these three sites; the one test that touches the malformed-jsonl path explicitly declines to pin silence (its own comment names this). Level 2 and Level 3(a) run the full existing corpus unmodified to catch any missed assertion. |
| Collapsing the two diagnoses ("could not read" vs "could not parse") into one message, losing debuggability | Low | Low | Each task's ACTION names its own diagnosis string explicitly; AC-A2 and each per-task VALIDATE independently assert the distinguishing substring, including a `doesNotMatch` check for the *other* diagnosis in Tasks 2 and 3. |
| A warning message accidentally interpolates file contents or another value that could carry secrets | Low | Medium | Every new warning mirrors `readJsonIfExists` exactly: only `path` and `err.message` are interpolated, matching `docs/anti-patterns.md`'s "Emitting secret values in run reports or logs" constraint (docs/anti-patterns.md:34-39). No new data source is introduced. |
| Rendered stdout changes unintentionally as a side effect of touching these functions | Low | High | Level 3(b)'s before/after comparison runs the pre-fix script (recovered from `git HEAD`) and the post-fix script against identical fixtures and asserts byte-identical stdout via `assert.equal` — a hard, real gate, not an assumption. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. (`docs/context/methodology.md` declares `test_frameworks: ["node:test"]`, non-empty, so the pair is ACTIVE in test-after mode per the file's own text.)

- R-X strict is preserved throughout this plan: `## Files to Change` lists exactly one file (`scripts/generate-final-report.mjs`); the Implementer authors zero test files; any new or updated test coverage for these three sites is exclusively the test-writer/test-reviewer pair's responsibility, test-after.
- This fix directly resolves the "known low-severity advisory (follow-up task already filed)" documented inline in `scripts/validate/checks/figma-visual-first-track-phase7.test.mjs` at lines 507-513, which deliberately declined to pin the pre-fix silent behavior specifically so a future fix would not have to fight it.
- Description mode: this plan was generated from a free-text description, not a PRD. There is no Implementation Phases row to back-fill (Phase 5.1 of the plan-writer protocol is a documented no-op here) and no `(PRD AC-N)` traceability token on the Acceptance Criteria above.
- `design_source` / `phase_scope` Metadata rows and the conditional `## Design Source` section are correctly absent — this project's `docs/context/methodology.md` does not declare `figma_track: true`.

*Generated: 2026-07-28*
*Approved: 2026-07-28*
*Status: IMPLEMENTED*
