# Feature: Pre-commit wiring (Phase 4 of validation-suite)

```
**Decision Gate**
- Active context: none
- Activated criteria: wires the existing `npm run validate` harness into a local git pre-commit gate; creates repo-root dev tooling (`.githooks/pre-commit`, `scripts/setup-hooks.mjs`) + a `package.json` script change + a contributor doc note; cross-cutting but confined to repo-root tooling and README; never touches `plugins/relay/` component frontmatter or `plugins/prp-core/`
- Decisions found:
  - [2026-04-19] PRP artifacts live under PRPs/, never under .claude/ — the hook is wired via git `core.hooksPath` (local git config) + a committed `.githooks/` dir at repo root; the hook script and `scripts/setup-hooks.mjs` are repo-root dev tooling, NOT pipeline artifacts, and nothing in this phase writes under `.claude/`.
  - [2026-04-19] plugins/prp-core/ is reference, not active relay code — Phase 4 authors a fresh POSIX sh hook; the only `.sh` scripts in the repo live under `plugins/prp-core/hooks/` and are deliberately NOT mirrored or referenced.
  - [2026-04-19] Methodology declaration lives in docs/context/methodology.md — read at write time: `tdd: false` + `test_frameworks: ["node:test"]` → test-after ordering with an ACTIVE test pair; the Implementer authors ZERO test files (R-X strict).
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — respected: nothing under `.claude/`; the gate is git config (`core.hooksPath`) + a committed `.githooks/` directory at the repo root.
  - "Treating plugins/prp-core/ as active relay code" — respected: `prp-core/hooks/*.sh` are upstream reference, not mirrored; the new hook is authored from scratch.
  - "Relying on interactive permission prompts in the autonomous loop" — not applicable: the pre-commit hook runs on the human's local `git commit`, outside the autonomous relay pipeline; it introduces no per-command prompt into any relay command.
- Applicable architectural rules:
  - Dev tooling (`package.json`, `scripts/`, `.githooks/`) lives at the repo root; pipeline artifacts under `PRPs/`; nothing under `.claude/`.
  - `plugins/prp-core/` is external to the relay surface (scope invariant).
  - Note (evolution, not conflict): `docs/development.md` Prerequisites currently says "There is no language runtime, no package manager, and no test runner to install" — now stale relative to `package.json`; the source PRD's Decision Gate defers this docs reconciliation to the post-merge Docs Updater, not this phase.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/validation-suite.prd.md` — Implementation Phases row 4: "Pre-commit wiring" — Goal: Local commits are gated by `npm run validate`. — Success signal: A commit carrying a violation is blocked with validate output.

## Summary

This phase wires the already-green static-validation harness (`npm run validate`, delivered in Phases 1–3) into a local git pre-commit gate so violations block a commit before it lands. It ships three production artifacts: (1) `.githooks/pre-commit` — a portable POSIX `sh` hook that runs `npm run validate`, prints its output, and exits with the runner's status (any finding → non-zero exit → commit blocked); (2) `scripts/setup-hooks.mjs` — a small Node/ESM script that runs `git config core.hooksPath .githooks` (via `spawnSync`, mirroring the repo's only existing child-process precedent) and prints a confirmation, replacing the current `package.json` placeholder for `npm run setup-hooks`; and (3) a contributor note in `README.md` documenting the one-time post-clone activation (`npm install` then `npm run setup-hooks`), since `core.hooksPath` is local git config and is not auto-applied on clone. Under `tdd: false` + `test_frameworks: ["node:test"]` (test-after, active pair, R-X strict) the Implementer authors production files ONLY and ZERO test files; hook/git-config behavior is validated primarily by the Level-3 block/allow demonstration rather than a hermetic `node:test` unit.

## User Story

```
As the relay maintainer (and future contributors)
I want `git commit` to run `npm run validate` and refuse the commit when a consistency invariant is violated
So that a drift or dead cross-reference is caught locally, at commit time, instead of shipping in the published plugin
```

## Problem Statement

Phases 1–3 delivered a deterministic `npm run validate` harness that turns red on any consistency/cross-reference violation and green on a clean tree. But nothing runs it automatically: a contributor can still commit a violation without ever invoking the runner. The source PRD's core promise (AC-11) is that the suite "blocks any commit that reintroduces a violation" — which requires a local pre-commit gate. Git's default hook directory (`.git/hooks/`) is not versioned, so the hook must live in a committed `.githooks/` directory activated per-clone via `git config core.hooksPath .githooks` (a local git-config opt-in, not auto-applied on clone). This phase supplies the hook, the one-command activation, and the contributor documentation that ties them together.

## Solution Statement

Ship the local enforcement layer of the validation suite: a committed `.githooks/pre-commit` hook plus a `npm run setup-hooks` convenience that points git at it. The hook is a portable POSIX `sh` script (the repo is developed on Windows but hooks run under Git for Windows' bundled `sh`) that shells out to `npm run validate`, echoes its output so the developer sees which check + `file:line` failed, and propagates the runner's exit status (`status=$?; exit "$status"`). Because the runner sets `process.exitCode = 1` on any finding, `npm run validate` exits non-zero and the commit is blocked. `scripts/setup-hooks.mjs` runs `git config core.hooksPath .githooks` via `spawnSync('git', [...], { shell: false })` — mirroring `native-validate.mjs`, the repo's only existing child-process caller — and prints a confirmation; `package.json`'s `setup-hooks` script is repointed from its Phase-1 placeholder to `node scripts/setup-hooks.mjs`. A README note documents the one-time `npm install` + `npm run setup-hooks` post-clone step. Node/ESM is chosen for `setup-hooks` (over an inline `package.json` shell command) for cross-platform portability: `node <path>` runs identically under Windows `cmd.exe` and Unix `sh`, whereas inline `git config … && echo '…'` diverges on quoting between the two.

## Metadata

| Key | Value |
|-----|-------|
| Type | Tooling / infrastructure (local pre-commit enforcement) |
| Complexity | Low |
| Systems Affected | `.githooks/` (new hook), `scripts/setup-hooks.mjs` (new), `package.json` (`setup-hooks` script), `README.md` (contributor note) |
| Dependencies | Phase 3 "Go green" complete (`Depends: 3`) — the validate suite must exit 0 on the tree so the hook's happy path allows a commit |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/validation-suite.prd.md` Implementation Phases row 4 (line 296); Phase 4 Details (lines 327-331) |
| phase_type | scaffold — tooling/wiring (pre-commit hook + git-config activator), validated by Node built-ins (`node --check`, `node -e`) + shell (`sh -n`, `sh .githooks/pre-commit`) + a Level-3 hook block/allow demonstration, NOT by the project test framework (`node:test`); matches the scaffold signal, the same category as Phase 1's harness scaffold. This selects the correct `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption. |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/validate/checks/native-validate.mjs` | 1-60 | The repo's ONLY child-process precedent: `import { spawnSync } from 'node:child_process'`, called with an explicit args array + `{ encoding: 'utf-8', shell: false }`, with `result.error` / `result.status` handling. This is the exact shape `scripts/setup-hooks.mjs` mirrors to run `git config core.hooksPath .githooks`, plus the canonical `.mjs` header (shebang, `// @ts-check`, JSDoc, `node:` import, "Runtime: Node.js >= 18" note). |
| P0 | `scripts/validate/index.mjs` | 28-31, 80-100 | `die(code, msg)` helper shape for `setup-hooks.mjs` error handling; and the `process.exitCode = 1`-on-any-finding contract the hook relies on (so `npm run validate` exits non-zero and the commit is blocked). |
| P0 | `package.json` | 8-12 | The `scripts` block; Phase 4 replaces ONLY the `setup-hooks` placeholder (line 11) with `node scripts/setup-hooks.mjs`, leaving `validate` (line 9, `node scripts/validate/index.mjs` — the `node <path>` form to mirror) and `eval` untouched. |
| P1 | `PRPs/prds/validation-suite.prd.md` | 144-147, 217, 284, 327-331 | AC-11 (pre-commit hook blocks violations, shows output) + the `setup-hooks` convenience Should item (line 217) + the "hook not auto-applied on clone" Technical Risk (line 284) + Phase 4 Details. |
| P1 | `README.md` | 18-22 | The existing "## Install" section — short imperative Markdown; the contributor `setup-hooks` note mirrors its prose style. |
| P1 | `docs/development.md` | 5-13, 65-71 | Prerequisites ("no package manager to install" — now stale, reconciled post-merge by Docs Updater, NOT here) + Commit hygiene; context for why README (not this file) carries the note this phase. |
| P1 | `docs/context/methodology.md` | 1-42 | `tdd: false` + `test_frameworks: ["node:test"]` → test-after, active pair, R-X strict (Implementer authors zero tests). |

## Patterns to Mirror

```
# SOURCE: scripts/validate/checks/native-validate.mjs:1-24,36-42
#!/usr/bin/env node
// @ts-check
/**
 * Check A — wraps the native `claude plugin validate ...` command ...
 * Runtime: Node.js >= 18. No npm dependencies beyond `node:child_process`.
 */
import { spawnSync } from 'node:child_process';
...
export function runNativeValidateCheck() {
  let result;
  try {
    result = spawnSync('claude', ['plugin', 'validate', PLUGIN_DIR, '--strict'], {
      encoding: 'utf-8',
      shell: false,
    });
  } catch (err) { /* graceful degrade */ }
  if (result.error) { /* ENOENT etc. */ }
```
Task 2 (`scripts/setup-hooks.mjs`) mirrors this header shape AND the `spawnSync(cmd, argsArray, { encoding: 'utf-8', shell: false })` + `result.error` / `result.status` handling — substituting `git config core.hooksPath .githooks` for the `claude plugin validate` invocation. Unlike `native-validate` (which degrades gracefully on a missing binary), `setup-hooks` should `die()` loud on a git failure — activation must succeed or say why.

```
# SOURCE: scripts/validate/index.mjs:28-31,92-100
function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}
...
  if (anyFailed) {
    // Set exitCode (not process.exit) so pending stdout writes flush ...
    process.exitCode = 1;
  }
...
main();
```
Two mirrors here: (a) Task 2 reuses the `die(code, msg)` helper shape for `setup-hooks.mjs`; (b) Task 1's hook relies on this `process.exitCode = 1`-on-any-finding contract — because `npm run validate` exits non-zero on a finding, the hook's `npm run validate; status=$?; exit "$status"` propagates the block. There is NO existing `.sh` hook in the relay surface to mirror (research-codebase gap: the only `.sh` files live under `plugins/prp-core/hooks/`, which is upstream reference and deliberately not mirrored); the POSIX `sh` hook shape is authored fresh, anchored to this exit-code contract.

```
# SOURCE: package.json:8-12
  "scripts": {
    "validate": "node scripts/validate/index.mjs",
    "eval": "node -e \"console.log('eval: implemented in Phase 5'); process.exit(0)\"",
    "setup-hooks": "node -e \"console.log('setup-hooks: implemented in Phase 4'); process.exit(0)\""
  },
```
Task 3 replaces ONLY the `setup-hooks` value with `node scripts/setup-hooks.mjs` — mirroring the `node <path>` form already used by `validate`. `validate` and `eval` are left byte-identical.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `.githooks/pre-commit` | CREATE | Portable POSIX `sh` pre-commit hook: runs `npm run validate`, prints its output, `exit "$status"` (non-zero on any finding → commit blocked). The committed hook activated via `core.hooksPath`. |
| `scripts/setup-hooks.mjs` | CREATE | Node/ESM one-time activator: `spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { shell: false })`, `die()` loud on failure, else print confirmation. Mirrors `native-validate.mjs`. |
| `package.json` | UPDATE | Repoint the `setup-hooks` script from the Phase-1 placeholder to `node scripts/setup-hooks.mjs`; `validate` and `eval` untouched. |
| `README.md` | UPDATE | Add a concise contributor note: after cloning, run `npm install` then `npm run setup-hooks` once to activate the pre-commit validation gate (core.hooksPath is local git config, not auto-applied on clone). |

## NOT Building (Scope Limits)

- **CI / GitHub Actions gate** — explicit Won't (source PRD); enforcement stays local (pre-commit) in MVP. Deferred to Phase 5.
- **Auto-activating hooks on clone (`postinstall` automation that silently runs `git config`)** — MVP keeps a one-time, explicit `npm run setup-hooks`, documented in the README. A silent `postinstall` that mutates git config on every `npm install` is intentionally avoided (surprising side effect).
- **The eval layer** (`promptfooconfig.yaml`, `npm run eval` implementation) — Phase 5; the `eval` script stays a placeholder here.
- **Any change to checks A–G / P, the runner, or the holes #1–#5** — delivered in Phases 1–3 (complete); this phase only wires the existing green runner into a hook.
- **The checker unit tests / any `*.test.mjs` authored by the Implementer** — R-X strict. Under `tdd: false` + `test_frameworks: ["node:test"]` the test-after pair (test-writer/test-reviewer) owns all test authorship. A pre-commit hook plus a `core.hooksPath` git-config side effect is hard to unit-test hermetically in `node:test`; hook behavior is validated primarily by the Level-3 block/allow demonstration below. The pair will likely record `EXISTING_COVERAGE_SUFFICIENT`, or add a light test asserting `setup-hooks.mjs` invokes `git config core.hooksPath .githooks`. No Step-by-Step Task, Files-to-Change row, or Validation Command in this plan creates or edits a test file.
- **Correcting `docs/development.md`'s stale "no package manager to install" Prerequisites line** — deferred to the post-merge Docs Updater, matching the source PRD's Decision Gate stance on docs evolution. This phase adds the contributor note to `README.md` only.

## Step-by-Step Tasks

### Task 1: CREATE `.githooks/pre-commit`

- **AC**: AC-A1, AC-A3 (PRD AC-11)
- **ACTION**: Create a portable POSIX `sh` hook. Start with a `#!/bin/sh` shebang and a short comment noting it is activated per-clone via `npm run setup-hooks` (`core.hooksPath .githooks`) and runs under Git for Windows' `sh`. Echo a start line, run `npm run validate`, capture `status=$?`, print a "validation FAILED — commit blocked" line to stderr when `status` is non-zero, and end with `exit "$status"`. Do NOT invoke a real `git commit` from the hook. After writing, mark it executable in the git index: `git update-index --chmod=+x .githooks/pre-commit` (Windows checkouts commit shell scripts as mode 100644; Git for Windows still runs the hook via `sh`, and Unix contributors need the 100755 mode). `npm run validate` already prints each failing check + `file:line`, so the developer sees what failed.
- **MIRROR**: `scripts/validate/index.mjs:92-100` — the `process.exitCode = 1`-on-any-finding contract the hook propagates via `npm run validate; status=$?; exit "$status"`. (No in-repo `.sh` hook exists to mirror; `prp-core/hooks/*.sh` is upstream reference, not mirrored.)
- **VALIDATE**:
  ```sh
  set -e  # any unguarded failure below aborts the block with a non-zero exit
  sh -n .githooks/pre-commit
  if ! head -1 .githooks/pre-commit | grep -q '^#!'; then echo "FAIL: hook missing shebang"; exit 1; fi
  if ! grep -q "npm run validate" .githooks/pre-commit; then echo "FAIL: hook does not run npm run validate"; exit 1; fi
  echo "PASS: pre-commit hook parses, has a shebang, and runs npm run validate"
  ```

### Task 2: CREATE `scripts/setup-hooks.mjs`

- **AC**: AC-A2 (PRD AC-11)
- **ACTION**: Create the Node/ESM activator mirroring `native-validate.mjs`'s header + child-process shape. Header: `#!/usr/bin/env node`, `// @ts-check`, a JSDoc block explaining it points git's `core.hooksPath` at the tracked `.githooks/` for this clone (one-time post-clone opt-in because `core.hooksPath` is local git config), `import { spawnSync } from 'node:child_process'`, and a "Runtime: Node.js >= 18. No npm dependencies beyond node:child_process" note. Define a `die(code, msg)` helper (stderr + `process.exit`, per `index.mjs`). In `main()`, call `spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { encoding: 'utf-8', shell: false })`; `die` loud on `result.error` (e.g. git not on PATH) or a non-zero `result.status` (surfacing `result.stderr`); otherwise write a confirmation to stdout (e.g. "git core.hooksPath set to .githooks — pre-commit validation gate active for this clone"). Call `main()` unconditionally at file end.
- **MIRROR**: `scripts/validate/checks/native-validate.mjs:1-24,36-42` (spawnSync named import, args array, `{ encoding: 'utf-8', shell: false }`, `result.error`/`result.status` handling) + `scripts/validate/index.mjs:28-31` (`die(code, msg)`).
- **VALIDATE**:
  ```sh
  set -e  # any unguarded failure below aborts the block with a non-zero exit
  node --check scripts/setup-hooks.mjs
  if ! grep -q "core.hooksPath" scripts/setup-hooks.mjs; then echo "FAIL: setup-hooks.mjs does not set core.hooksPath"; exit 1; fi
  if ! grep -q '\.githooks' scripts/setup-hooks.mjs; then echo "FAIL: setup-hooks.mjs does not reference .githooks"; exit 1; fi
  echo "PASS: setup-hooks.mjs parses and configures core.hooksPath .githooks"
  ```

### Task 3: UPDATE `package.json`

- **AC**: AC-A2 (PRD AC-11)
- **ACTION**: Replace the `setup-hooks` script value (the `node -e "...implemented in Phase 4..."` placeholder on line 11) with `node scripts/setup-hooks.mjs`. Leave `validate` (`node scripts/validate/index.mjs`) and `eval` byte-identical. Keep the file valid JSON.
- **MIRROR**: `package.json:8-12` — the `node <path>` form already used by the `validate` script.
- **VALIDATE**:
  ```sh
  set -e  # the node -e below exits 1 on any violation; set -e aborts the block
  node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); if(p.scripts['setup-hooks']!=='node scripts/setup-hooks.mjs'){console.error('FAIL: setup-hooks not wired to scripts/setup-hooks.mjs'); process.exit(1);} if(p.scripts.validate!=='node scripts/validate/index.mjs'){console.error('FAIL: validate script changed'); process.exit(1);} if(/implemented in Phase 4/.test(p.scripts['setup-hooks'])){console.error('FAIL: placeholder still present'); process.exit(1);}"
  echo "PASS: package.json setup-hooks wired to scripts/setup-hooks.mjs; validate intact"
  ```

### Task 4: UPDATE `README.md`

- **AC**: AC-A4 (PRD AC-11)
- **ACTION**: Add a concise contributor note (a new short section, e.g. `## Local development`, or extend an existing one) documenting: after cloning, run `npm install` then `npm run setup-hooks` once to activate the pre-commit validation gate; note that `core.hooksPath` is local git config and is therefore NOT auto-applied on clone, so the one-time step is required. Reference only real, existing paths (`.githooks/pre-commit`, `npm run validate`). Keep it a few lines — do not restructure the README.
- **MIRROR**: `README.md:18-22` — the existing "## Install" section's short imperative Markdown style.
- **VALIDATE**:
  ```sh
  if ! grep -q "npm run setup-hooks" README.md; then echo "FAIL: README missing npm run setup-hooks note"; exit 1; fi
  if ! grep -q "npm install" README.md; then echo "FAIL: README missing npm install step"; exit 1; fi
  echo "PASS: README documents npm install + npm run setup-hooks"
  ```

## Validation Commands

Every command below carries real exit-code semantics — it exits non-zero when its invariant is violated (no `&& echo PASS || echo FAIL` masking). The `code-reviewer` scores each level PASS iff exit code is 0.

**Level 1 — STATIC_ANALYSIS (hook syntax + ESM syntax + JSON validity)**
```sh
set -euo pipefail
# POSIX sh syntax of the hook (exits non-zero on any syntax error)
sh -n .githooks/pre-commit
# ESM syntax of the setup-hooks script
node --check scripts/setup-hooks.mjs
# package.json remains valid JSON
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
echo "Level 1 PASS: hook + setup-hooks parse; package.json is valid JSON"
```

**Level 2 — CONTENT_INVARIANTS (each check exits non-zero on violation)**
```sh
set -euo pipefail  # the node -e wiring check below exits 1 on violation; set -e aborts the block
# hook: shebang + runs npm run validate
if ! head -1 .githooks/pre-commit | grep -q '^#!'; then echo "FAIL: hook missing shebang"; exit 1; fi
if ! grep -q "npm run validate" .githooks/pre-commit; then echo "FAIL: hook does not run npm run validate"; exit 1; fi
# setup-hooks.mjs sets core.hooksPath .githooks
if ! grep -q "core.hooksPath" scripts/setup-hooks.mjs; then echo "FAIL: setup-hooks.mjs does not set core.hooksPath"; exit 1; fi
if ! grep -q '\.githooks' scripts/setup-hooks.mjs; then echo "FAIL: setup-hooks.mjs does not reference .githooks"; exit 1; fi
# package.json wired to the real implementation, placeholder gone, validate intact
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); if(p.scripts['setup-hooks']!=='node scripts/setup-hooks.mjs'){console.error('FAIL: setup-hooks not wired'); process.exit(1);} if(p.scripts.validate!=='node scripts/validate/index.mjs'){console.error('FAIL: validate changed'); process.exit(1);}"
if grep -q "implemented in Phase 4" package.json; then echo "FAIL: setup-hooks placeholder still present"; exit 1; fi
# README documents the one-time setup
if ! grep -q "npm run setup-hooks" README.md; then echo "FAIL: README missing setup-hooks note"; exit 1; fi
echo "Level 2 PASS: hook / setup-hooks / package.json / README content invariants hold"
```

**Level 3 — INTEGRATION (hook ALLOWS a green tree, BLOCKS a perturbed one; no `git commit`, tree restored)**
```sh
# Invoke the hook directly (no real commit → no side effects). Real exit-code
# semantics; the perturbation is ALWAYS restored before the verdict.

# (a) Green tree → hook exits 0 (commit allowed).
sh .githooks/pre-commit; green_status=$?
if [ "$green_status" -ne 0 ]; then
  echo "FAIL: pre-commit blocked the green tree (exit $green_status)"; exit 1
fi
echo "PASS(a): pre-commit allows the green tree (exit 0)"

# (b) Perturb a checked invariant (plugin.json version), run the hook, restore.
bak="$(mktemp)"
cp plugins/relay/.claude-plugin/plugin.json "$bak"
node -e "const f='plugins/relay/.claude-plugin/plugin.json';const fs=require('fs');const p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='0.0.0-precommit-test';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n');"
sh .githooks/pre-commit; bad_status=$?
cp "$bak" plugins/relay/.claude-plugin/plugin.json
rm -f "$bak"
if [ "$bad_status" -eq 0 ]; then
  echo "FAIL: pre-commit did NOT block a perturbed tree (exit 0); plugin.json restored"; exit 1
fi
echo "PASS(b): pre-commit blocked the perturbed tree (exit $bad_status); plugin.json restored"
echo "Level 3 PASS: hook allows green, blocks perturbed"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-11):** `.githooks/pre-commit` runs `npm run validate` and exits with the runner's status; when a validation violation is present the hook exits non-zero (commit blocked) and the validate output (failing check name + offending `file:line`) is printed for the developer.
- **AC-A2 (PRD AC-11):** `npm run setup-hooks` runs `git config core.hooksPath .githooks` and prints a confirmation — establishing the "hook is active" precondition AC-11 names; `package.json`'s `setup-hooks` placeholder is replaced by `node scripts/setup-hooks.mjs`, and a git failure is surfaced loud (non-zero exit) rather than swallowed.
- **AC-A3 (PRD AC-11):** With the hook active on a GREEN tree it exits 0 (commit allowed); on a perturbed invariant it exits non-zero (commit blocked). Demonstrated by invoking `.githooks/pre-commit` directly, perturbing `plugin.json`'s version, and restoring it — no real `git commit`, no residual tree mutation.
- **AC-A4 (PRD AC-11):** `README.md` documents the one-time post-clone activation (`npm install` then `npm run setup-hooks`), directly addressing the source PRD Technical Risk that `core.hooksPath` is local git config and is not auto-applied on clone.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pre-commit hook not auto-applied on clone (`core.hooksPath` is local git config) | M | M | Ship `npm run setup-hooks` + a README note documenting the one-time `npm install` + `npm run setup-hooks` step (both from the source PRD Technical Risks row, line 284). |
| Windows checkout commits the hook as mode 100644 (non-executable), breaking it for Unix contributors | M | L | Task 1 runs `git update-index --chmod=+x .githooks/pre-commit`; validation invokes the hook via `sh .githooks/pre-commit` (bit-independent); Git for Windows runs hooks via `sh` regardless of the bit (research-web: augmentedmind.de). |
| The Level-3 block-demo leaves the tree perturbed if it aborts mid-run | L | M | The perturb step backs `plugin.json` up to a `mktemp` file and restores it BEFORE the pass/fail verdict; restore is unconditional. |
| The tree is not actually green (a Phase-4 file trips a check) → Level-3 (a) fails | L | M | Phase 3 (Go green) is complete; the new artifacts live outside `plugins/relay/` frontmatter scope and reference only real paths, so no A–G/P check fires on them; verified empirically by Level-3 (a). |
| `npm run validate`'s non-zero exit not propagated under Git for Windows' `sh` (research-web gap) | L | M | The hook uses standard POSIX `status=$?; exit "$status"` propagation; Level-3 demonstrates the propagation empirically on this machine (block on perturbed tree). |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Concretely for this phase:** `test_frameworks: ["node:test"]` IS declared, so the pair is ACTIVE. The Implementer authors production files ONLY — `.githooks/pre-commit`, `scripts/setup-hooks.mjs`, the `package.json` edit, and the README note — and authors ZERO test files (R-X strict). A pre-commit hook plus a `core.hooksPath` git-config side effect resists hermetic `node:test` coverage; hook behavior is therefore validated primarily by the Level-3 block/allow demonstration. The test-after pair will likely record `EXISTING_COVERAGE_SUFFICIENT`, or add a light unit asserting `setup-hooks.mjs` invokes `git config core.hooksPath .githooks`. Do NOT have the Implementer author tests.
- **Why `scripts/setup-hooks.mjs` (not an inline `package.json` shell command):** `node <path>` runs identically under Windows `cmd.exe` (npm's default script shell on Windows) and Unix `sh`, whereas an inline `git config … && echo '…'` diverges on quoting/echo between the two. This mirrors the existing `validate` script (`node scripts/validate/index.mjs`) and the repo's Node/ESM tooling convention.
- **Executable bit:** `git update-index --chmod=+x .githooks/pre-commit` stages the hook as mode 100755 so Unix contributors get an executable hook; on Windows the bit is irrelevant because Git for Windows invokes hooks via `sh` (research-web: augmentedmind.de). Validation invokes the hook via `sh .githooks/pre-commit`, so the demonstration does not depend on the bit.
- **Doc placement:** the contributor note goes in `README.md` (repo-root, first thing a cloning contributor sees; the task's explicit priority). `docs/development.md`'s Prerequisites line ("There is no language runtime, no package manager, and no test runner to install") is now stale relative to `package.json`, but correcting it is deferred to the post-merge Docs Updater per the source PRD's Decision Gate — not this phase.
- **No `.claude/` writes; no `plugins/prp-core/` touched.** The gate is git config (`core.hooksPath`) + a committed `.githooks/` directory at the repo root; `prp-core/hooks/*.sh` are upstream reference and were not mirrored.

*Generated: 2026-07-13*
*Approved: 2026-07-13*
*Implemented: 2026-07-13*
*Status: IMPLEMENTED*
