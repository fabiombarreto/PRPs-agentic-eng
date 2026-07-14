# Feature: Harness scaffold (Phase 1 of validation-suite)

```
**Decision Gate**
- Active context: none
- Activated criteria: introduces the repo's first build/lint/test surface (repo-root package.json + scripts/validate/); cross-cutting dev-tooling artifact creation at the repository root; the version-parity check reads plugins/relay/ manifest + documentation/ changelog and MUST scope to plugins/relay/, never plugins/prp-core/
- Decisions found:
  - [2026-04-19] Marketplace single-plugin; both manifests versioned — the version-parity check (B) mechanizes plugin.json.version == latest changelog release (documentation/AGENTS.md §7.5).
  - [2026-04-19] plugins/prp-core/ is reference, not active relay code — check B reads EXACTLY two files (plugins/relay/.claude-plugin/plugin.json + documentation/changelog.html) and never reads or flags anything under plugins/prp-core/.
  - [2026-04-19] PRP artifacts live under PRPs/, never under .claude/ — the harness's own code is repo-root dev tooling (package.json, scripts/validate/), NOT a pipeline artifact; nothing in this phase writes under .claude/.
  - [2026-04-19] Methodology declaration lives in docs/context/methodology.md — read at write time: tdd: false + test_frameworks: ["node:test"] → test-after ordering with an ACTIVE test pair; the Implementer authors ZERO test files (R-X strict).
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — respected: the harness writes nothing under .claude/; validation surfaces via exit code + stdout only.
  - "Treating plugins/prp-core/ as active relay code" — respected as a hard scoping invariant on check B (reads only plugin.json + changelog.html).
  - "Activating the test pair by heuristic" — respected: the pair is active because a framework is DECLARED (test_frameworks: ["node:test"]), not inferred; the Implementer authors no tests, so the checker unit tests are delivered test-after by the test-writer/test-reviewer pair.
- Applicable architectural rules:
  - Both marketplace and plugin manifests are versioned; the parity check enforces the lock-step contract.
  - plugins/prp-core/ is external to the relay surface (scope invariant).
  - All pipeline artifacts (this plan, the source PRD) live under PRPs/; the harness code is repo-root tooling.
  - Note (evolution, not conflict): CLAUDE.md and docs/context/architecture.md currently state "There are no build, lint, or test commands." This phase begins to evolve that characterization; the docs are updated post-merge by the Docs Updater (not in this phase's scope).
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/validation-suite.prd.md` — Implementation Phases row 1: "Harness scaffold" — Goal: A runnable `npm run validate` that aggregates checks and exits non-zero on failure. — Success signal: `npm run validate` runs; check B passes on the current tree (plugin.json 0.20.0 == changelog latest 0.20.0) and fails when either is perturbed.

## Summary

This phase stands up the Node/ESM static-validation harness skeleton for the relay repo: a repo-root `package.json` (scripts `validate` / `eval` / `setup-hooks`, `type: module`, `engines.node >= 18`, zero runtime dependencies), an aggregating runner `scripts/validate/index.mjs` that invokes a registry of independent check functions, prints a human-readable summary, and sets `process.exitCode = 1` on any finding (no short-circuit — every registered check runs), the first concrete check `scripts/validate/checks/version-parity.mjs` (check B: `plugin.json.version` == latest `documentation/changelog.html` `<h2>` release; separator-agnostic; skips the `Unreleased` heading; fail-loud on missing/unparseable inputs), and an additive `.gitignore` entry for `node_modules/`. The approach mirrors the conventions of the two existing `scripts/*.mjs` utilities (shebang, `// @ts-check`, JSDoc header, `node:fs`/`node:path` imports, a `die(code, msg)` helper, unconditional `main()` at end). All four production files already exist in the working tree from a prior attempt; the Implementer reconciles them against this plan rather than authoring from a blank slate.

## User Story

```
As the relay maintainer
I want a runnable `npm run validate` harness with a first version-parity check
So that a drift between plugin.json and the changelog's latest release turns red the moment it is introduced, and later phases have a runner to register their checks into
```

## Problem Statement

The relay repository is Markdown prompts + JSON config with no runtime source code, so its correctness lives in consistency invariants that today rot silently — there is no build, lint, or test command. The specific invariant this phase mechanizes is the version-sync contract (`documentation/AGENTS.md` §7.5): every changelog release cut MUST bump `plugins/relay/.claude-plugin/plugin.json` to the same version in the same commit. Today that contract is binding prose with no machine check. This phase also has to establish the harness skeleton itself — an aggregating runner with real non-zero exit semantics — so that the remaining checks (A, C, D, E, F, G, P) have a runner to plug into in Phase 2.

## Solution Statement

Ship the first slice of the two-layer self-test suite: the static-validation runner (`npm run validate`) plus check B. The runner aggregates a registry of zero-arg check functions, each returning `{ name, ok, findings: [{ message, file, line }] }`, runs all of them without short-circuit (a thrown check becomes a loud fail-finding rather than crashing the runner), prints a `[PASS]/[FAIL]` summary, and sets `process.exitCode = 1` when any check reports a violation. Check B is factored as a pure `checkVersionParity({ pluginJson, changelogHtml })` (no file I/O, unit-testable) plus a thin `runVersionParityCheck()` wrapper that performs the two real file reads. Node/ESM is chosen for parity with the existing `scripts/*.mjs`. Dependencies are zero for this phase (the `ajv` / `node-html-parser` / `promptfoo` dependencies land with later phases).

## Metadata

| Key | Value |
|-----|-------|
| Type | Tooling / scaffold |
| Complexity | Low–Medium |
| Systems Affected | repo-root build tooling (`package.json`), `scripts/validate/` (runner + first check), `.gitignore` |
| Dependencies | None (Phase 1 has `Depends: -`); zero runtime npm dependencies in this phase |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/validation-suite.prd.md` Implementation Phases row 1 (line 293) |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/generate-final-report.mjs` | 1-45 | Canonical `.mjs` conventions to mirror: shebang, `// @ts-check`, JSDoc header, `node:fs`/`node:path` named imports, `parseArgs`, `die(code, msg)`, `main()` at end |
| P0 | `scripts/normalize-test-output.mjs` | 1-55 | Second confirmation of the same conventions; explicit "Runtime: Node.js >= 18. No npm dependencies" header note |
| P0 | `PRPs/prds/validation-suite.prd.md` | 106-156, 289-309 | Acceptance Criteria (AC-1, AC-2, AC-3, AC-10) + Implementation Phases row 1 + Phase 1 Details (Goal / Scope / Success signal) |
| P1 | `documentation/changelog.html` | 31-33 | The `<h2 id="...">Version &#8212; date</h2>` release-heading markup check B parses; `id="unreleased"` is always first |
| P1 | `plugins/relay/.claude-plugin/plugin.json` | 1-4 | Flat top-level `"version": "0.20.0"` string that check B compares against the changelog token |
| P1 | `docs/context/methodology.md` | 1-42 | `tdd: false` + `test_frameworks: ["node:test"]` → test-after with active pair; R-X strict (Implementer authors zero tests) |

## Patterns to Mirror

```
# SOURCE: scripts/generate-final-report.mjs:1-45
#!/usr/bin/env node
// @ts-check
/**
 * <one-line purpose>
 * ...
 * Runtime: Node.js >= 18. No npm dependencies.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}
```
Mirror this header/CLI shape (shebang, `// @ts-check`, JSDoc header block, `node:` prefixed imports, `die(code, msg)`, unconditional `main()` at file end) in `scripts/validate/index.mjs` (Task 2) and `scripts/validate/checks/version-parity.mjs` (Task 3).

```
# SOURCE: scripts/validate/index.mjs:19-83   (already present in the working tree; reconcile against this)
const CHECKS = [
  runVersionParityCheck,
];
// run every check without short-circuit; a thrown check becomes a fail-finding
// ...
  // Set exitCode (not process.exit) so pending stdout writes flush before
  // the process exits gracefully.
  process.exitCode = 1;
```
The runner registry + `process.exitCode = 1` (not `process.exit`) so all findings flush is the exact shape Task 2 must preserve. Corroborated by Node's own docs ("set the `process.exitCode` and allow the process to exit naturally", https://nodejs.org/api/process.html).

```
# SOURCE: scripts/validate/checks/version-parity.mjs:42-127   (already present; reconcile against this)
const headingRe = /<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g;
// ... if (id === 'unreleased') continue;
// ... const versionMatch = text.match(/\d+\.\d+\.\d+/);   // separator-agnostic
export function checkVersionParity({ pluginJson, changelogHtml }) { /* pure, no I/O */ }
export function runVersionParityCheck() { /* thin fs wrapper */ }
```
The pure-function-plus-thin-wrapper split (the pure `checkVersionParity` takes strings, the wrapper does the fs reads) is the testability seam the test pair will target test-after. Task 3 preserves this split and the separator-agnostic `\d+\.\d+\.\d+` extraction that skips `id="unreleased"`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `package.json` | CREATE | Repo-root manifest: `type: module`, `engines.node >= 18`, zero deps, scripts `validate` (wires to the runner), `eval`/`setup-hooks` (stubs deferred to Phases 5/4). Already present in tree — reconcile. |
| `scripts/validate/index.mjs` | CREATE | Aggregating runner: CHECKS registry, no-short-circuit run, `[PASS]/[FAIL]` summary, `process.exitCode = 1` on any finding. Already present — reconcile. |
| `scripts/validate/checks/version-parity.mjs` | CREATE | Check B: pure `checkVersionParity` + thin `runVersionParityCheck`; separator-agnostic; skips Unreleased; fail-loud on missing/unparseable; reads only plugin.json + changelog.html (never prp-core). Already present — reconcile. |
| `.gitignore` | UPDATE | Additive: ignore `node_modules/` (later phases install deps; `package-lock.json` stays committed). Already present — reconcile. |

## NOT Building (Scope Limits)

- **Checks A, C, D, E, F, G, P** — the rest of the static check set; deferred to Phase 2 (each unit-tested against good/bad fixtures there).
- **Fixing holes #1–#5** — going green on the repo is Phase 3.
- **The pre-commit hook** (`.githooks/pre-commit`, `npm run setup-hooks` implementation) — deferred to Phase 4; the `setup-hooks` script is a stub in this phase.
- **The eval layer** (`promptfooconfig.yaml`, `npm run eval` implementation) — deferred to Phase 5; the `eval` script is a stub in this phase.
- **Runtime dependencies** (`ajv`, `js-yaml`/`gray-matter`, `node-html-parser`, `promptfoo`) — none are added in Phase 1; check B uses only the Node built-ins and a regex.
- **The checker unit tests** (`scripts/validate/**/*.test.mjs`) — NOT authored by the Implementer in this phase. Under `tdd: false` + `test_frameworks: ["node:test"]` (test-after, active pair, R-X strict), the test-writer/test-reviewer pair authors the check-B unit tests AFTER the Implementer + Code Review; `/relay-test` then runs them via `node --test`. No Step-by-Step Task, Files-to-Change row, or Validation Command in this plan creates or edits a test file.

## Step-by-Step Tasks

### Task 1: CREATE `package.json`

- **AC**: infrastructure / scaffolding (no direct AC)
- **ACTION**: Create (reconcile) the repo-root `package.json` with `"name": "relay-repo"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=18" }`, empty `dependencies`/`devDependencies`, and `"scripts": { "validate": "node scripts/validate/index.mjs", "eval": "<stub, Phase 5>", "setup-hooks": "<stub, Phase 4>" }`.
- **MIRROR**: N/A (manifest, not a script) — the "Runtime: Node.js >= 18. No npm dependencies" convention from `scripts/normalize-test-output.mjs:1-55` motivates the `engines`/zero-deps choices.
- **VALIDATE**:
  ```sh
  node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); const ok=p.type==='module' && p.engines && p.engines.node==='>=18' && p.scripts && p.scripts.validate && p.scripts.eval && p.scripts['setup-hooks'] && Object.keys(p.dependencies||{}).length===0; if(!ok){console.error('FAIL: package.json invariants (type:module, engines node>=18, three scripts, zero deps)'); process.exit(1);} console.log('PASS: package.json invariants hold');"
  ```

### Task 2: CREATE `scripts/validate/index.mjs`

- **AC**: AC-A1, AC-A3 (runner entrypoint + exit-code aggregation)
- **ACTION**: Create (reconcile) the aggregating runner: a `CHECKS` registry array (starting with `runVersionParityCheck`), a `runChecks` that wraps each call in try/catch (a thrown check → a loud fail-finding, never a crash), a `printResults` that emits `[PASS]/[FAIL]` per check plus each finding's `file:line — message`, and a `main()` that runs ALL checks (no short-circuit) then sets `process.exitCode = 1` if any failed.
- **MIRROR**: `scripts/generate-final-report.mjs:1-45` (header/`die`/`main()` shape) and `scripts/validate/index.mjs:19-83` (registry + `process.exitCode = 1` so findings flush).
- **VALIDATE**:
  ```sh
  node --check scripts/validate/index.mjs && echo "syntax-ok"
  ```

### Task 3: CREATE `scripts/validate/checks/version-parity.mjs`

- **AC**: AC-A2, AC-A4 (version-parity compare + prp-core scoping)
- **ACTION**: Create (reconcile) check B as a pure `export function checkVersionParity({ pluginJson, changelogHtml })` (returns `{ name, ok, findings }`; missing/empty/unparseable input → a returned fail-finding, never a throw and never a silent pass) plus a thin `export function runVersionParityCheck()` that reads `plugins/relay/.claude-plugin/plugin.json` and `documentation/changelog.html` from repo root. The changelog extractor skips `id="unreleased"` and pulls the first `\d+\.\d+\.\d+` token from the next `<h2>` (separator-agnostic across `&#8212;` and `—`). It reads EXACTLY those two files — never anything under `plugins/prp-core/`.
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:42-127` (pure-plus-wrapper split, separator-agnostic extraction, Unreleased skip).
- **VALIDATE**:
  ```sh
  node --check scripts/validate/checks/version-parity.mjs || exit 1
  if grep -nE "prp-core" scripts/validate/checks/version-parity.mjs; then echo "FAIL: check B must never reference plugins/prp-core/"; exit 1; else echo "PASS: check B is scoped away from prp-core"; fi
  ```

### Task 4: UPDATE `.gitignore`

- **AC**: infrastructure / scaffolding (no direct AC)
- **ACTION**: Ensure `.gitignore` contains a `node_modules/` entry (additive; do not remove existing entries; `package-lock.json` is intentionally NOT ignored so it stays committed in later phases).
- **MIRROR**: N/A (config file).
- **VALIDATE**:
  ```sh
  if grep -qx "node_modules/" .gitignore; then echo "PASS: node_modules/ is ignored"; else echo "FAIL: .gitignore missing node_modules/ entry"; exit 1; fi
  ```

## Validation Commands

Every command below carries real exit-code semantics — it exits non-zero when its invariant is violated (no `&& echo PASS || echo FAIL` masking). The `code-reviewer` scores each level PASS iff exit code is 0.

**Level 1 — STATIC_ANALYSIS (syntax + JSON validity of the production sources)**
```sh
set -euo pipefail
# ESM syntax check of both production .mjs sources (exits non-zero on any syntax error)
node --check scripts/validate/index.mjs
node --check scripts/validate/checks/version-parity.mjs
# JSON validity of the two manifests check B depends on + the new package.json
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('plugins/relay/.claude-plugin/plugin.json','utf8'))"
echo "Level 1 PASS: sources parse and manifests are valid JSON"
```

**Level 2 — CONTENT_INVARIANTS (structural invariants runnable now; unit tests delivered test-after)**
```sh
set -euo pipefail
# package.json shape: type:module, engines node>=18, three scripts, zero runtime deps
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); if(!(p.type==='module' && p.engines && p.engines.node==='>=18' && p.scripts.validate && p.scripts.eval && p.scripts['setup-hooks'] && Object.keys(p.dependencies||{}).length===0)) { console.error('FAIL: package.json invariants'); process.exit(1); }"
# check B is scoped: it must not reference plugins/prp-core/ anywhere
if grep -nE "prp-core" scripts/validate/checks/version-parity.mjs; then echo "FAIL: check B references prp-core"; exit 1; fi
# check B exports the pure/wrapper seam the test pair will target
node -e "import('./scripts/validate/checks/version-parity.mjs').then(m=>{ if(typeof m.checkVersionParity!=='function'||typeof m.runVersionParityCheck!=='function'){console.error('FAIL: missing exports');process.exit(1);} });"
echo "Level 2 PASS: content invariants hold"
```
> Note: Level-2 UNIT-test coverage of check B (`checkVersionParity` over clean/dirty version pairs, missing/unparseable inputs, the Unreleased-skip and separator-agnostic paths) is delivered TEST-AFTER by the test-writer/test-reviewer pair (`tdd: false` + `test_frameworks: ["node:test"]`), then run by `/relay-test` via `node --test`. The Implementer authors ZERO test files (R-X strict); this plan therefore does not gate the implement stage on a `*.test.mjs` that does not yet exist. The content-invariant commands above are the runnable Level-2 gate for the implement stage.

**Level 3 — INTEGRATION (the aggregating runner end-to-end on the current tree)**
```sh
# npm run validate must exit 0 on the current tree, where check B is consistent
# (plugin.json 0.20.0 == changelog latest 0.20.0). It exits non-zero when a check
# reports a finding — real exit-code semantics, able to fail.
npm run validate
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** `npm run validate` runs the aggregating runner; given a seeded inconsistency it exits non-zero and prints the failing check name plus the offending `file:line`. (The runner sets `process.exitCode = 1` on any finding and prints `[FAIL] <check>` with each `file:line — message`.)
- **AC-A2 (PRD AC-3):** Given `plugin.json` version X and the latest `documentation/changelog.html` `<h2>` release Y with X ≠ Y, check B (`version-parity`) fails naming both X and Y; given X == Y (the current tree: `0.20.0` == `0.20.0`) it passes with no findings.
- **AC-A3 (PRD AC-2):** On the current tree, where check B is the only registered check and it is consistent, `npm run validate` exits 0 with no findings. (Full repo-wide green across holes #1–#5 is Phase 3; this AC covers only the exit-0 path of the runner with check B green.)
- **AC-A4 (PRD AC-10):** Check B is scoped to the relay surface — it reads EXACTLY `plugins/relay/.claude-plugin/plugin.json` and `documentation/changelog.html` and never reads or flags anything under `plugins/prp-core/`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Over-broad checks produce false positives on legitimate content (prior art: relay-execute docs-phase Level-3 grep false positives) | M | M | Check B parses structured inputs (JSON version field, `<h2>` regex) rather than broad greps; reads only two named files; scoped away from prp-core; unit-tested test-after by the pair |
| Brittle HTML parsing of `documentation/changelog.html` | L | M | Anchor on the stable `<h2 id="...">` markup and a separator-agnostic `\d+\.\d+\.\d+` token; skip `id="unreleased"` explicitly |
| The four production files already exist in the working tree from a prior attempt — the Implementer could diverge or double-create | M | L | Files-to-Change marks each row "already present — reconcile"; the Implementer reconciles against this plan; Validation Levels 1–3 assert the intended shape regardless of provenance |
| research-web: two npm reference pages (precommit-hook, git-precommit-checks) returned HTTP 403; those findings rely on WebSearch summaries | L | L | Non-load-bearing for Phase 1 — the exit-code and registry design is grounded in the Node docs finding + the in-repo runner already present; the npm-package analogues are corroborating context only |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Concretely for this phase:** `test_frameworks: ["node:test"]` IS declared, so the pair is ACTIVE. The Implementer authors production code ONLY and authors ZERO test files (R-X strict). The checker unit tests for check B are authored test-after by the test-writer/test-reviewer pair (after the Implementer + Code Review), then run by `/relay-test` via `node --test`. This resolves the source PRD's Open Question #5 (2026-07-12): having the Implementer author the checkers' own tests conflicts with R-X strict (`docs/decisions.md` [2026-05-06], [2026-07-10]); declaring the framework routes test authorship through the compliant mechanism.
- **Working-tree reality:** `package.json`, `scripts/validate/index.mjs`, `scripts/validate/checks/version-parity.mjs`, and the `.gitignore` `node_modules/` entry are already present in the working tree from a prior attempt (the earlier attempt was rejected by code review for an R-X violation — the Implementer had authored a `*.test.mjs`). This plan deliberately excludes any test-file authorship so the reconciliation stays R-X compliant.
- **Exit-code design:** the runner uses `process.exitCode = 1` (not `process.exit(1)`) so every aggregated finding flushes to stdout before the process exits — corroborated by the Node.js docs (https://nodejs.org/api/process.html) and the existing `scripts/validate/index.mjs:78-83`.
- **Docs evolution (out of this phase):** CLAUDE.md and `docs/context/architecture.md` currently say "There are no build, lint, or test commands." Once this suite lands, that characterization is stale; the Docs Updater reconciles it post-merge. No documentation edit is in Phase 1 scope.

*Generated: 2026-07-12*
*Approved: 2026-07-12*
*Implemented: 2026-07-12*
*Status: IMPLEMENTED*
