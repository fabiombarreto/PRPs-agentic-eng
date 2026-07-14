# Feature: Eval layer (Phase 5 of validation-suite)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting repo-root dev-tooling creation (promptfooconfig.yaml + scripts/eval.mjs) that reads plugins/relay/agents/test-reviewer.md and the golden fixtures under PRPs/reports/; introduces the repo's first external-service (Anthropic API) dependency, gated behind an on-demand, non-blocking command; adds the repo's first network-installed npm devDependency (promptfoo)
- Decisions found:
  - [2026-04-19] plugins/prp-core/ is reference, not active relay code — the eval targets plugins/relay/agents/test-reviewer.md and existing relay fixtures only; it never reads or references anything under plugins/prp-core/.
  - [2026-04-19] PRP artifacts live under PRPs/, never under .claude/ — the eval config + wrapper are repo-root dev tooling (not pipeline artifacts); the golden fixtures already live under PRPs/reports/; nothing in this phase writes under .claude/.
  - [2026-04-19] Command surface: one command per stage; and (source PRD Decisions Log) "Two commands, two triggers" — `validate` is the blocking pre-commit gate, `eval` is manual + non-blocking; LLM evals cost tokens and are non-deterministic, so they are unfit to gate every commit.
  - [2026-04-19] Methodology declaration lives in docs/context/methodology.md — read at write time: `tdd: false` + `test_frameworks: ["node:test"]` → test-after ordering with an ACTIVE test pair; the Implementer authors ZERO test files (R-X strict); the eval wrapper's no-key degradation node:test unit is delivered test-after by the test-writer/test-reviewer pair.
  - (source PRD Decisions Log) Eval strategy = Approximate (promptfoo→API, verdict-token assertion), chosen over headless `claude -p` full-runtime; fidelity upgrade deferred.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — respected: the eval config + wrapper are repo-root tooling; validation surfaces via exit code + stdout; no writes under .claude/.
  - "Treating plugins/prp-core/ as active relay code" — respected: the config reads only plugins/relay/agents/test-reviewer.md + the PRPs/reports/ fixtures; never prp-core.
  - "Activating the test pair by heuristic" — respected: the wrapper's degradation-path unit is authored test-after because a framework is DECLARED (`test_frameworks: ["node:test"]`), not inferred from a test folder; the Implementer authors no tests.
- Applicable architectural rules:
  - The eval is on-demand + manual — outside the autonomous loop AND outside the pre-commit gate; the interactivity/execution boundary is preserved (evals never block a commit or a pipeline run).
  - plugins/prp-core/ is external to the relay surface (scope invariant).
  - `promptfooconfig.yaml` lives at repo root; promptfoo `file://` references resolve relative to the config file's directory (= repo root), so every fixture path in the config is repo-root-relative.
  - Note (graceful degradation): a live eval requires both ANTHROPIC_API_KEY and an installed `promptfoo`; the wrapper degrades cleanly (clean exit + a clear guidance message) when the key is absent, mirroring the `native-validate.mjs` "skip cleanly when the dependency is unavailable" precedent (source PRD AC-9). Automated validation confirms the no-key path + config structural soundness, NOT a live API run (a live run costs API tokens and needs a key — out of scope for automated validation).
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/validation-suite.prd.md` — Implementation Phases row 5: "Eval layer" — Goal: On-demand behavioral evals of the reviewer agents. — Success signal: `npm run eval` reports clean → APPROVED and dirty → CHANGES_REQUESTED; missing `ANTHROPIC_API_KEY` yields a clear message, not a crash.

## Summary

This final phase ships the behavioral-evals layer of the relay self-test suite: a repo-root `promptfooconfig.yaml` that runs the `test-reviewer` agent's own instructions (`plugins/relay/agents/test-reviewer.md`) against the EXISTING golden fixtures under `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/{clean,dirty}/` and asserts the emitted verdict token — clean fixture → `APPROVED`, dirty fixture → `CHANGES_REQUESTED` — plus a thin `scripts/eval.mjs` wrapper wired to `npm run eval` that pre-flights `ANTHROPIC_API_KEY`. The eval strategy is APPROXIMATE (promptfoo → Anthropic API): the prompt fed to the model is the reviewer agent's verbatim instructions concatenated with the fixture suite as input; promptfoo `contains`/`regex` assertions check the verdict token. The CRITICAL graceful-degradation requirement (source PRD AC-12) is delivered by the wrapper: when `ANTHROPIC_API_KEY` is not set, it prints a clear guidance message and exits cleanly (exit 0 — a documented skip, mirroring `native-validate.mjs`), rather than crashing. `promptfoo` is added as a devDependency; because the install is network-dependent, the phase deliverable is the eval harness (config + wrapper + no-key path) and the automated validation exercises the no-key degradation path and config structural soundness — never a live API run (which costs tokens and needs a key). The wrapper mirrors the repo's established `scripts/*.mjs` conventions (shebang, `// @ts-check`, JSDoc header, `die(code, msg)`, `spawnSync`, unconditional `main()`).

## User Story

```
As the relay maintainer
I want an on-demand `npm run eval` that asserts the test-reviewer agent returns the right verdict on the golden clean/dirty fixtures, and that degrades cleanly to a clear message when no API key is present
So that I can regression-check the reviewer agent's calibration before a release without the eval ever crashing a keyless environment or blocking a commit
```

## Problem Statement

The relay repo's static-validation layer (`npm run validate`, Phases 1–4) mechanically catches consistency/cross-reference rot, but it cannot verify that the reviewer *agents* still behave correctly — that `test-reviewer` still returns `APPROVED` on a clean suite and `CHANGES_REQUESTED` on a deliberately-flawed one. That behavioral contract lives in an LLM prompt (`plugins/relay/agents/test-reviewer.md`) with no machine check, and it can silently drift when the rubric prompt is amended. Ready-made golden fixtures already exist (`synthetic-b8-fixture-1/{clean,dirty}/`, built to calibrate exactly this agent) but nothing exercises them. This phase closes that gap with a cheap, on-demand behavioral layer — while honoring the constraint that LLM evals cost tokens, are non-deterministic, and require an API key, so they must never gate a commit and must degrade gracefully when no key is available.

## Solution Statement

Ship the second layer of the two-layer suite: `npm run eval`. A repo-root `promptfooconfig.yaml` defines a prompt template that interpolates the `test-reviewer` agent's verbatim instructions plus the fixture suite (mini-PRD + suite manifest) as input, targets a current Claude model via the promptfoo Anthropic provider (`anthropic:messages:...`, authenticated by `ANTHROPIC_API_KEY`; the model id is configurable — a cheaper tier is acceptable for a verdict assertion), and carries two test cases whose assertions check the byte-exact verdict tokens (`APPROVED` for the clean fixture, `CHANGES_REQUESTED` for the dirty fixture). A thin `scripts/eval.mjs` wrapper pre-flights `ANTHROPIC_API_KEY`: absent → print a clear guidance message naming the variable and exit 0 (a clean, documented skip, not a crash — mirroring `native-validate.mjs`); present → invoke promptfoo against the config and propagate its exit code. `promptfoo` is added as a devDependency (best-effort install; network-independent config + wrapper are the deliverable). Node/ESM for parity with the existing `scripts/*.mjs`.

## Metadata

| Key | Value |
|-----|-------|
| Type | Tooling / behavioral-eval harness |
| Complexity | Low–Medium |
| Systems Affected | repo-root `promptfooconfig.yaml`, `scripts/eval.mjs` (new wrapper), `package.json` (rewire `eval` script + add `promptfoo` devDependency) |
| Dependencies | Depends on Phase 1 (`complete`) — reuses the repo-root `package.json` + Node/ESM `scripts/` conventions; reuses the EXISTING golden fixtures under `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/` |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/validation-suite.prd.md` Implementation Phases row 5 (line 297); AC-12 (lines 148–152); Phase 5 Details (lines 333–339) |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** the phase's automated validation surface is shell/node-builtins only — it invokes `npm run eval` with the key unset and asserts a clean exit + guidance message, and checks the config's structural soundness + fixture-path existence; no test-framework invocation is the natural in-phase validation mechanism, and no live API run is performed (that costs tokens + needs a key). This mirrors the sibling Phase 1 "Harness scaffold" plan's `scaffold` choice for the same reason. The wrapper's genuinely-behavioral no-key degradation path IS covered by a `node:test` unit — but that unit is delivered TEST-AFTER by the test-writer/test-reviewer pair (R-X strict; the Implementer authors zero tests), consistent with `tdd: false` + `test_frameworks: ["node:test"]`. `scaffold` therefore keeps the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption clean without under-claiming coverage.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/validation-suite.prd.md` | 148-152, 333-339 | AC-12 (the eval-classifies-fixtures + graceful-no-key contract) + Phase 5 Details (Goal / Scope / Success signal) — the definition of done for this phase |
| P0 | `plugins/relay/agents/test-reviewer.md` | 446-474 | The verdict contract: the agent emits EXACTLY two verdict tokens — `APPROVED` and `CHANGES_REQUESTED` (no `RUBRIC_PASSED`/`RUBRIC_FAILED`). The promptfoo assertions must match these byte-exact tokens |
| P0 | `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/README.md` | 1-49 | Fixture layout + expected verdicts: clean → APPROVED, dirty → CHANGES_REQUESTED; the exact files per variant (mini-prd.md, tdd-initial-suite.diff, tests/) |
| P0 | `scripts/setup-hooks.mjs` | 1-40 | Closest structural analog to the eval wrapper: shebang + `// @ts-check` + JSDoc header, local `die(code, msg)`, `spawnSync` (shell:false), status/error handling, unconditional `main()` |
| P1 | `scripts/validate/checks/native-validate.mjs` | 36-61 | The graceful-degradation precedent: "the dependency I need to run is unavailable" is modeled as a clean skip (print a note, no crash), NOT a failure. The eval wrapper's no-key guard adopts the same tone (print guidance, `process.exit(0)`) |
| P1 | `scripts/generate-final-report.mjs` | 1-45 | Second confirmation of the `.mjs` header/`die` conventions to mirror |
| P1 | `package.json` | 8-16 | The `eval` stub to replace (`node -e "...implemented in Phase 5"`) + the `validate`/`setup-hooks` sibling-script wiring convention (`node scripts/<file>.mjs`); current devDependencies (`ajv`, `node-html-parser`) — `promptfoo` is not yet present |
| P2 | `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tdd-initial-suite.diff` | whole | The clean suite manifest the reviewer is invoked against (fed as the `suite` var for the clean test case) |
| P2 | `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tdd-initial-suite.diff` | whole | The dirty suite manifest (fed as the `suite` var for the dirty test case) |

## Patterns to Mirror

```
# SOURCE: scripts/setup-hooks.mjs:1-40   (wrapper script shape — mirror in scripts/eval.mjs)
#!/usr/bin/env node
// @ts-check
/**
 * <one-line purpose>
 * Runtime: Node.js >= 18. ...
 */
import { spawnSync } from 'node:child_process';

function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function main() {
  const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
    encoding: 'utf-8',
    shell: false,
  });
  if (result.error) {
    die(1, `setup-hooks: could not run "git" (${result.error.code || result.error.message})`);
  }
  // ...
}

main();
```
Task 1 (`scripts/eval.mjs`) mirrors this exactly: shebang, `// @ts-check`, JSDoc header (with a `Runtime:` line that also notes `promptfoo` is a devDependency + a live key is only needed for the actual run), local `die(code, msg)`, `spawnSync` with `shell:false`, and an unconditional `main()` at file end.

```
# SOURCE: scripts/validate/checks/native-validate.mjs:36-61   (graceful-degradation precedent — mirror the tone of the no-key guard)
// "the dependency I need to run is unavailable" → clean skip, never a crash:
if (result.error) {
  // ENOENT (claude CLI not on PATH) or any other spawn-level failure —
  // graceful degradation, never a crash of the runner (AC-9).
  return {
    name: CHECK_NAME,
    ok: true,
    findings: [],
    note: `native validator skipped: "claude" CLI unavailable (${result.error.code || result.error.message})`,
  };
}
```
Task 1's `ANTHROPIC_API_KEY` pre-flight adopts the same "skip cleanly with a clear note" tone — but as a pre-flight env-var check (`if (!process.env.ANTHROPIC_API_KEY) { print guidance; process.exit(0); }`) rather than a post-spawn `result.error` branch. This is a simpler, pre-flight variant of the same idea (no direct verbatim precedent for the env-var shape — the env check is new, but the "absence → clean skip, not failure" philosophy is copied).

```
# SOURCE: plugins/relay/agents/test-reviewer.md:450-463   (verdict contract — the assertion target)
- **APPROVED** when: Every row in the rubric array has `passed: true` (or the mode-selected legitimacy row is `passed: null`).
- **CHANGES_REQUESTED** when any row has `passed: false`.
{ "verdict": "<APPROVED | CHANGES_REQUESTED>", ... }
```
There are EXACTLY two verdict tokens: `APPROVED` and `CHANGES_REQUESTED`. Task 2's promptfoo assertions match these byte-exact (clean → `contains: APPROVED` + `not-contains: CHANGES_REQUESTED`; dirty → `contains: CHANGES_REQUESTED`). Note: `APPROVED` is NOT a substring of `CHANGES_REQUESTED`, so the tokens are unambiguous; the fixture README (`synthetic-b8-fixture-1/README.md:27,41`) confirms the expected verdict per variant.

```
# SOURCE: promptfoo docs (https://www.promptfoo.dev/docs/configuration/guide/ + /providers/anthropic/ + /docs/configuration/test-cases/)   (config skeleton — no in-repo promptfoo config exists to mirror; grounded in the web-research findings)
description: relay test-reviewer verdict evals over the synthetic-b8-fixture-1 golden fixtures
prompts:
  - |
    {{agentInstructions}}
    ---
    Review the following TDD suite and emit your B8 verdict line.
    ## mini-PRD
    {{miniPrd}}
    ## suite manifest (tdd-initial-suite.diff)
    {{suite}}
providers:
  - id: anthropic:messages:claude-sonnet-4-5-20250929   # configurable — any current Claude model; a cheaper tier is acceptable for verdict assertion
defaultTest:
  vars:
    agentInstructions: file://plugins/relay/agents/test-reviewer.md
tests:
  - description: clean fixture → APPROVED
    vars:
      miniPrd: file://PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/mini-prd.md
      suite:   file://PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tdd-initial-suite.diff
    assert:
      - { type: contains, value: APPROVED }
      - { type: not-contains, value: CHANGES_REQUESTED }
  - description: dirty fixture → CHANGES_REQUESTED
    vars:
      miniPrd: file://PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md
      suite:   file://PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tdd-initial-suite.diff
    assert:
      - { type: contains, value: CHANGES_REQUESTED }
```
Task 2 (`promptfooconfig.yaml`) mirrors this shape. `file://` paths resolve relative to the config's directory (= repo root), so the fixture paths above are repo-root-relative and correct as written. The Implementer MAY add an `llm-rubric` assertion for robustness and MAY concatenate the `tests/` directory bodies into the `suite` var (via a `file://prompt.mjs` prompt-builder) if the `tdd-initial-suite.diff` manifest proves an insufficient input — the fixture README instructs invoking the reviewer against `tdd-initial-suite.diff`, so the diff is the canonical minimal input.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `scripts/eval.mjs` | CREATE | The `npm run eval` wrapper: pre-flight `ANTHROPIC_API_KEY` guard (absent → clear guidance message + `process.exit(0)`, a clean non-crash skip per AC-12); present → `spawnSync` promptfoo against `promptfooconfig.yaml` and propagate its exit code. Mirrors `scripts/setup-hooks.mjs` conventions. |
| `promptfooconfig.yaml` | CREATE | The promptfoo eval config at repo root: prompt template = `test-reviewer` agent instructions + fixture suite; Anthropic provider (configurable model id); two test cases asserting clean → `APPROVED`, dirty → `CHANGES_REQUESTED`, over the EXISTING golden fixtures. |
| `package.json` | UPDATE | Replace the `eval` stub (`node -e "...implemented in Phase 5"`) with `node scripts/eval.mjs`; add `promptfoo` to `devDependencies` (via `npm install --save-dev promptfoo`, which also writes the resolved version — or a manual entry when offline). Additive to the existing `ajv`/`node-html-parser` deps and the `validate`/`setup-hooks` scripts. |

## NOT Building (Scope Limits)

- **A live API eval run in automated validation** — running promptfoo against the real Anthropic API costs tokens and needs a key; it is explicitly out of scope for automated validation (Level 3 confirms the no-key path + config soundness only). The maintainer runs the live eval manually with a key set.
- **Evals over `plan-reviewer` / `prd-reviewer` / `code-reviewer`** — Should-items per the source PRD MoSCoW; MVP covers `test-reviewer` only (the cheapest ready win, with fixtures already on disk).
- **Headless (`claude -p`) full-runtime evals** — the MVP uses the promptfoo → API APPROXIMATION (verdict-token assertion). Graduating to the real Claude Code runtime with tools is an explicit Won't / deferred Open Question in the PRD.
- **Gating anything on the eval** (pre-push, pre-commit, or the autonomous loop) — `npm run eval` stays purely manual + non-blocking (PRD Decisions Log: LLM evals are too slow/non-deterministic to gate commits).
- **The wrapper's no-key `node:test` unit** — NOT authored by the Implementer. Under `tdd: false` + `test_frameworks: ["node:test"]` (test-after, active pair, R-X strict), the test-writer/test-reviewer pair authors the `scripts/eval.test.mjs` unit for the no-key degradation path AFTER the Implementer + Code Review; `/relay-test` then runs it via `node --test`. No task/row/command in this plan creates or edits a test file.
- **Committing `node_modules/`** — already git-ignored (Phase 1). `package-lock.json` stays committed; the `promptfoo` install populates it best-effort.
- **A YAML-parser devDependency (`js-yaml`) for config validation** — out of scope; config soundness is checked structurally offline (required keys + fixture-path existence), with full validation deferred to `npx promptfoo validate` when promptfoo is installed.

## Step-by-Step Tasks

### Task 1: CREATE `scripts/eval.mjs`

- **AC**: AC-A2 (no-key graceful degradation) + AC-A3 (with-key promptfoo invocation) → PRD AC-12
- **ACTION**: Create the `npm run eval` wrapper. Header mirrors `scripts/setup-hooks.mjs` (shebang, `// @ts-check`, JSDoc block with a `Runtime:` line noting `promptfoo` is a devDependency and a live `ANTHROPIC_API_KEY` is required only for the actual run), local `die(code, msg)`, `import { spawnSync } from 'node:child_process'`. In `main()`: FIRST check `if (!process.env.ANTHROPIC_API_KEY)` → write a clear guidance message to stdout that names `ANTHROPIC_API_KEY` (e.g. `eval skipped: ANTHROPIC_API_KEY is not set — set it to run the reviewer-agent evals`), then `process.exit(0)` (clean skip, NOT a crash). Otherwise `spawnSync` promptfoo (`['promptfoo', 'eval', '-c', 'promptfooconfig.yaml']` via the local binary / `npx`, `stdio: 'inherit'`), `die(1, ...)` on `result.error` with a hint to run `npm install`, else `process.exit(result.status ?? 1)` to propagate promptfoo's exit code. End with an unconditional `main()`.
- **MIRROR**: `scripts/setup-hooks.mjs:1-40` (wrapper shape + `die` + `spawnSync`); `scripts/validate/checks/native-validate.mjs:36-61` (skip-cleanly-when-dependency-absent tone).
- **VALIDATE**:
  ```sh
  set -euo pipefail
  # ESM syntax must be valid (propagates non-zero on any syntax error)
  node --check scripts/eval.mjs
  # the no-key guard must be present (the load-bearing degradation branch)
  grep -q "ANTHROPIC_API_KEY" scripts/eval.mjs
  echo "PASS: scripts/eval.mjs parses and contains the ANTHROPIC_API_KEY guard"
  ```

### Task 2: CREATE `promptfooconfig.yaml`

- **AC**: AC-A1 (config exists + two fixture cases) + AC-A4 (byte-exact verdict-token assertions, scoped to the golden fixtures) → PRD AC-12
- **ACTION**: Create the repo-root promptfoo config per the Patterns-to-Mirror skeleton: a `description`; a `prompts` template interpolating `{{agentInstructions}}` + `{{miniPrd}}` + `{{suite}}`; a `providers` entry using the Anthropic provider (`anthropic:messages:<current-claude-model>`, with a comment that the model id is configurable and a cheaper tier is acceptable); `defaultTest.vars.agentInstructions: file://plugins/relay/agents/test-reviewer.md`; and two `tests` cases — clean (`vars` → the clean fixture's mini-prd.md + tdd-initial-suite.diff; `assert` → `contains: APPROVED` + `not-contains: CHANGES_REQUESTED`) and dirty (`vars` → the dirty fixture's files; `assert` → `contains: CHANGES_REQUESTED`). All `file://` paths are repo-root-relative (they resolve relative to the config dir). Reference ONLY `plugins/relay/agents/test-reviewer.md` + the `synthetic-b8-fixture-1` fixtures — never anything under `plugins/prp-core/`.
- **MIRROR**: the config skeleton in Patterns to Mirror (grounded in the promptfoo docs findings); the verdict tokens from `plugins/relay/agents/test-reviewer.md:450-463`.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  # required top-level keys present
  grep -q '^prompts:'   promptfooconfig.yaml
  grep -q '^providers:' promptfooconfig.yaml
  grep -q '^tests:'     promptfooconfig.yaml
  # both verdict tokens are asserted, and the reviewer agent is the prompt source
  grep -q 'APPROVED'                                promptfooconfig.yaml
  grep -q 'CHANGES_REQUESTED'                       promptfooconfig.yaml
  grep -q 'plugins/relay/agents/test-reviewer.md'   promptfooconfig.yaml
  # config must never reference prp-core (scope invariant)
  if grep -n 'prp-core' promptfooconfig.yaml; then echo "FAIL: config references plugins/prp-core/"; exit 1; fi
  # every file:// fixture/agent path referenced by the config must exist on disk
  grep -oE 'file://[^ ]+' promptfooconfig.yaml | sed 's#file://##' | while read -r p; do
    if [ ! -f "$p" ]; then echo "FAIL: referenced path does not exist: $p"; exit 1; fi
  done
  echo "PASS: promptfooconfig.yaml is structurally sound, scoped to relay, and every referenced path exists"
  ```

### Task 3: UPDATE `package.json`

- **AC**: AC-A3 (the `eval` script wires to the wrapper; `promptfoo` is a declared devDependency) → PRD AC-12
- **ACTION**: Replace the `eval` script value `node -e "console.log('eval: implemented in Phase 5'); process.exit(0)"` with `node scripts/eval.mjs`. Add `promptfoo` to `devDependencies` — prefer `npm install --save-dev promptfoo` (installs + writes the resolved version + updates `package-lock.json`); if the registry is unreachable in the sandbox, add the entry manually (`"promptfoo": "<latest>"`) and note the install is deferred. Leave `validate`/`setup-hooks` and the `ajv`/`node-html-parser` deps untouched.
- **MIRROR**: `package.json:8-16` (the `node scripts/<file>.mjs` script convention shared by `validate` + `setup-hooks`).
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node -e "const p=require('./package.json'); if(p.scripts.eval!=='node scripts/eval.mjs'){console.error('FAIL: eval script not wired to scripts/eval.mjs (got: '+p.scripts.eval+')');process.exit(1);} if(!(p.devDependencies&&p.devDependencies.promptfoo)){console.error('FAIL: promptfoo missing from devDependencies');process.exit(1);} console.log('PASS: eval wired + promptfoo declared');"
  ```

## Validation Commands

Every command below carries real exit-code semantics — it exits non-zero when its invariant is violated (no `<check> && echo PASS || echo FAIL` masking). The `code-reviewer` scores each level PASS iff the block's exit code is 0. Level blocks use `set -euo pipefail` (or an explicit `exit 1`) so a mid-block failure fails the whole block. No level performs a live API eval run.

**Level 1 — STATIC_ANALYSIS (syntax + JSON validity + config key presence)**
```sh
set -euo pipefail
# ESM syntax of the new wrapper (non-zero on any syntax error)
node --check scripts/eval.mjs
# package.json remains valid JSON after the edit
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
# promptfooconfig.yaml carries the required top-level keys
grep -q '^prompts:'   promptfooconfig.yaml
grep -q '^providers:' promptfooconfig.yaml
grep -q '^tests:'     promptfooconfig.yaml
echo "Level 1 PASS: wrapper parses, package.json is valid JSON, config has required keys"
```

**Level 2 — CONTENT_INVARIANTS (wiring + verdict-token assertions + scope; unit test delivered test-after)**
```sh
set -euo pipefail
# package.json wiring: eval → wrapper, promptfoo declared
node -e "const p=require('./package.json'); if(p.scripts.eval!=='node scripts/eval.mjs'||!(p.devDependencies&&p.devDependencies.promptfoo)){console.error('FAIL: package.json eval wiring / promptfoo devDependency');process.exit(1);}"
# wrapper contains the load-bearing no-key guard
grep -q "ANTHROPIC_API_KEY" scripts/eval.mjs
# config asserts BOTH byte-exact verdict tokens and sources the reviewer agent as the prompt
grep -q 'APPROVED'                              promptfooconfig.yaml
grep -q 'CHANGES_REQUESTED'                     promptfooconfig.yaml
grep -q 'plugins/relay/agents/test-reviewer.md' promptfooconfig.yaml
# scope invariant: neither the config nor the wrapper references prp-core
if grep -n 'prp-core' promptfooconfig.yaml scripts/eval.mjs; then echo "FAIL: prp-core referenced"; exit 1; fi
# every file:// path the config references must exist (fixtures + agent body)
grep -oE 'file://[^ ]+' promptfooconfig.yaml | sed 's#file://##' | while read -r p; do
  if [ ! -f "$p" ]; then echo "FAIL: referenced path missing: $p"; exit 1; fi
done
echo "Level 2 PASS: wiring, verdict-token assertions, scope, and referenced-path existence all hold"
```
> Note: Level-2 UNIT coverage of the wrapper's no-key degradation path (`scripts/eval.test.mjs`: "given no ANTHROPIC_API_KEY, the wrapper exits 0 with the guidance message, not a crash") is delivered TEST-AFTER by the test-writer/test-reviewer pair (`tdd: false` + `test_frameworks: ["node:test"]`), then run by `/relay-test` via `node --test`. The Implementer authors ZERO test files (R-X strict); this plan therefore does not gate the implement stage on a `*.test.mjs` that does not yet exist. The content-invariant + Level-3 commands here are the runnable gate for the implement stage.

**Level 3 — DRY-RUN END-TO-END (the graceful no-key path — the source PRD AC-12 success signal)**
```sh
# NOTE: this block intentionally omits `set -e` so it can capture npm's exit code
# explicitly instead of aborting on it. It still fails loud via explicit `exit 1`.
set -uo pipefail
unset ANTHROPIC_API_KEY
out="$(npm run eval 2>&1)"; code=$?
if [ "$code" -ne 0 ]; then
  echo "FAIL: 'npm run eval' with no ANTHROPIC_API_KEY exited $code (expected clean 0 — must not crash)"
  printf '%s\n' "$out"
  exit 1
fi
if ! printf '%s' "$out" | grep -qi "ANTHROPIC_API_KEY"; then
  echo "FAIL: no-key output did not mention ANTHROPIC_API_KEY (expected a clear guidance message)"
  printf '%s\n' "$out"
  exit 1
fi
echo "Level 3 PASS: 'npm run eval' degrades cleanly (exit 0 + ANTHROPIC_API_KEY guidance) when the key is absent"
```
> A live promptfoo run (key set, promptfoo installed) is NOT part of automated validation — it costs API tokens and requires a key. To exercise it manually: `export ANTHROPIC_API_KEY=...`, `npm install` (fetch promptfoo), then `npm run eval`; expect the clean case → `APPROVED` and the dirty case → `CHANGES_REQUESTED`, and a non-zero exit if either assertion fails (promptfoo returns exit code 100 on a failed test case).

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** `promptfooconfig.yaml` exists at repo root and defines two test cases feeding the `test-reviewer` agent's instructions (`plugins/relay/agents/test-reviewer.md`) plus the EXISTING golden fixture suite as input — the clean fixture case asserting the verdict `APPROVED`, the dirty fixture case asserting `CHANGES_REQUESTED` — via promptfoo `contains`/`regex` assertions over the byte-exact verdict tokens.
- **AC-A2 (PRD AC-12):** `npm run eval` with `ANTHROPIC_API_KEY` NOT set exits cleanly (exit 0 — a documented skip, not a crash) and prints a clear guidance message naming `ANTHROPIC_API_KEY`. (This is the CRITICAL graceful-degradation clause of AC-12; validated by Level 3.)
- **AC-A3 (PRD AC-12):** `npm run eval` is wired to `scripts/eval.mjs`, which invokes promptfoo against `promptfooconfig.yaml` when a key is present (propagating promptfoo's exit code); `promptfoo` is a declared `devDependency`. (The with-key invocation path is validated structurally — wiring + declared dependency — not via a live API run.)
- **AC-A4 (PRD AC-12):** The config's assertions match the byte-exact verdict tokens `APPROVED` / `CHANGES_REQUESTED` that `test-reviewer.md` emits, and the eval is scoped to the relay surface — it references only `plugins/relay/agents/test-reviewer.md` and the `synthetic-b8-fixture-1` fixtures, never anything under `plugins/prp-core/`. (Supports the source PRD's "eval fixture classification" success metric: clean → APPROVED, dirty → CHANGES_REQUESTED.)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Evals only approximate the real agent (prompt fed to the API ≠ the Claude Code runtime with tools) — a verdict mismatch may be a fidelity artifact, not a real regression | M | M | Assert only the verdict token; document the approximation as explicit MVP scope; graduate to headless `claude -p` later (open PRD question). The clean/dirty fixtures were purpose-built to elicit these exact verdicts |
| `promptfoo` install is network-dependent (registry unreachable in the sandbox) — the live eval cannot run in automated validation | M | L | The phase deliverable is the harness (config + wrapper + no-key path), NOT a live run; Level 3 validates the no-key degradation + config soundness offline. The live run is a documented manual step (key + `npm install` + `npm run eval`) |
| The exact Anthropic provider model id / promptfoo version drifts and becomes stale | M | L | The model id carries an inline "configurable" comment (a cheaper tier is acceptable for verdict assertion); `npm install --save-dev promptfoo` writes the resolved version rather than hard-pinning a guessed one; neither is load-bearing for the offline no-key validation path |
| Verdict tokens could appear in the reviewer's prose (e.g. "not APPROVED") and mislead a `contains` assertion | L | M | Clean case pairs `contains: APPROVED` with `not-contains: CHANGES_REQUESTED`; the Implementer MAY add an `llm-rubric` assertion for robustness. `APPROVED` is not a substring of `CHANGES_REQUESTED`, so the two tokens are mutually unambiguous |
| `npx`/`promptfoo` spawn resolution differs on Windows (`shell:false` + `npx.cmd`) on the with-key path | L | L | The with-key spawn is never reached in automated (keyless) validation; the Implementer resolves the Windows binary path (or uses the local `node_modules/.bin` entry) when wiring the live invocation; a `result.error` branch `die`s with an actionable `npm install` hint |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Concretely for this phase:** `test_frameworks: ["node:test"]` IS declared, so the pair is ACTIVE in test-after mode. The Implementer authors production/config ONLY (`scripts/eval.mjs`, `promptfooconfig.yaml`, the `package.json` edit) and authors ZERO test files (R-X strict). The one genuinely-behavioral unit — the wrapper's no-key degradation ("given no `ANTHROPIC_API_KEY`, `npm run eval` exits 0 with the guidance message, not a crash") — is authored TEST-AFTER by the test-writer/test-reviewer pair as `scripts/eval.test.mjs`, then run by `/relay-test` via `node --test`. The `promptfooconfig.yaml` itself and the live-API path are NOT unit-tested (they require a key + a token-costing API call) — this is a deliberate decision, documented here and reflected in the Level-2 note.
- **phase_type = scaffold (see Metadata justification):** chosen because the automated validation surface is shell/node-builtins only (no live API run; no in-phase `node --test` invocation is the natural mechanism), mirroring the sibling Phase 1 "Harness scaffold" plan. The behavioral no-key unit is still routed to the pair test-after, so coverage is not under-claimed; `scaffold` keeps the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption clean.
- **Graceful degradation is the load-bearing behavior:** the wrapper's no-key path exits 0 (a clean skip) rather than a non-zero "error" — this mirrors `native-validate.mjs`'s "dependency unavailable → skip cleanly, `ok: true`" precedent (source PRD AC-9) and satisfies AC-12's "clear message rather than crashing". If a future maintainer prefers a distinct non-zero "skipped" signal, AC-12 permits "0 or a clear non-crash exit"; exit 0 is chosen for parity with the native-validate skip and to keep `npm run eval` green in keyless CI without special-casing.
- **Fixture naming caveat:** the fixture README (`synthetic-b8-fixture-1/README.md`) and some of `test-reviewer.md`'s internal prose still say `tdd-reviewer` / `/relay-tdd-review` (the pre-rename identifiers). The agent that actually exists on disk is `plugins/relay/agents/test-reviewer.md` (frontmatter `name: test-reviewer`); the config targets that real file. (The stale `relay-tdd*` names were the subject of hole #1, fixed in Phase 3 — any residual mentions inside these fixtures are input data, not the eval's target.)
- **Final phase:** this is the last Implementation Phases row of `validation-suite`. On successful implementation + D8 mutation, row 5 flips `in-progress` → `complete` and the feature's Implementation Phases table is fully green.
- **Docs evolution (out of this phase):** once `npm run eval` lands, the "There are no build, lint, or test commands" characterization in CLAUDE.md / `docs/context/architecture.md` is further stale; the Docs Updater reconciles it post-merge. No documentation edit is in Phase 5 scope.

*Generated: 2026-07-13*
*Approved: 2026-07-13*
*Implemented: 2026-07-13*
*Status: IMPLEMENTED*
