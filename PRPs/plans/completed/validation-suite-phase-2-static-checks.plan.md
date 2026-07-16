# Feature: Static checks (Phase 2 of validation-suite)

```
**Decision Gate**
- Active context: none
- Activated criteria: adds seven structural static checks (A, C, D, E, F, G, P) under scripts/validate/ that read plugins/relay/, docs/, documentation/, and PRPs/; introduces two new devDependencies (ajv for check F, node-html-parser for check C); every structural check MUST be scoped to plugins/relay/ and MUST NEVER read or flag plugins/prp-core/
- Decisions found:
  - [2026-04-19] plugins/prp-core/ is reference, not active relay code — checks C/D/E/F/A glob plugins/relay/** exclusively and never traverse plugins/prp-core/**; AC-10 validates zero prp-core findings.
  - [2026-04-19] Command surface: one command per stage, writer/reviewer split — the command/agent surface is enumerable from plugins/relay/{commands,agents}/, which is the ground truth check C (registration parity) and check E (dispatch graph) diff against.
  - [2026-04-19] Marketplace single-plugin; both manifests versioned — check A wraps `claude plugin validate ./plugins/relay --strict`, the native manifest/frontmatter validator, scoped to the relay plugin tree only.
  - [2026-04-19] PRP artifacts live under PRPs/, never under .claude/ — the suite's own code (scripts/validate/, package.json, package-lock.json) is repo-root dev tooling, NOT a pipeline artifact; nothing in this phase writes under .claude/. Check G reads PRPs/plans/ read-only.
  - [2026-04-19] Methodology declaration lives in docs/context/methodology.md — read at write time: tdd: false + test_frameworks: ["node:test"] → test-after ordering with an ACTIVE test pair; the Implementer authors ZERO test files (R-X strict); the checker unit tests are authored test-after by the test-writer/test-reviewer pair.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — respected: the seven check modules, the ajv schemas, package.json/package-lock.json, and the registry wiring are repo-root dev tooling; validation surfaces via exit code + stdout only; nothing is written under .claude/.
  - "Treating plugins/prp-core/ as active relay code" — respected as a HARD scoping invariant on every structural check; each check globs plugins/relay/** and never plugins/prp-core/** (AC-10 gate).
  - "Activating the test pair by heuristic" — respected: the pair is active because a framework is DECLARED (test_frameworks: ["node:test"]), not inferred; the Implementer authors production code ONLY (check modules + schemas + dep additions + registry wiring) and ZERO *.test.mjs files (R-X strict).
- Applicable architectural rules:
  - plugins/prp-core/ is external to the relay surface (scope invariant on all structural checks).
  - All pipeline artifacts live under PRPs/; the suite's own code is repo-root tooling.
  - The command surface is 15 commands + 15 agents enumerable from plugins/relay/{commands,agents}/; check C treats those directory listings as the registration ground truth.
  - Note (evolution, not conflict): CLAUDE.md and docs/context/architecture.md currently state "There are no build, lint, or test commands." This suite continues to evolve that characterization; the docs are updated post-merge by the Docs Updater (not in this phase's scope).
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/validation-suite.prd.md` — Implementation Phases row 2: "Static checks" — Goal: The full A–G check set plus check P, each independently unit-tested. — Success signal: Running on the current tree turns red on holes #1–#5; running on the good fixtures stays green; no prp-core file is flagged.

## Summary

This phase fills out the static-validation harness (stood up in Phase 1) with the remaining seven consistency checks and wires them into the runner registry. Each check is a Node/ESM module under `scripts/validate/checks/` that mirrors the Phase 1 `version-parity.mjs` contract exactly — a pure function plus a thin file-reading wrapper, both returning `{ name, ok, findings: [{ message, file, line }] }`, failing loud (a returned finding) rather than throwing. The seven checks are: **A** (wrap `claude plugin validate ./plugins/relay --strict`, degrading gracefully when the `claude` CLI is absent), **C** (three-file registration parity — the shipped command/agent set under `plugins/relay/{commands,agents}/` must match the NAV in `documentation/assets/js/app.js`, `documentation/assets/data/search-index.json`, and `documentation/changelog.html`), **D** (referenced-path existence for `${CLAUDE_PLUGIN_ROOT}/…`, `scripts/…`, and inter-doc paths in `plugins/relay/` + `docs/`), **E** (dispatch graph — every `subagent_type:`/agent name resolves to an `agents/*.md`, every `Next: /relay-x` resolves to a command file), **F** (frontmatter schema per component type via `ajv`, with JSON Schemas under `scripts/validate/schemas/`), **G** (artifact naming — no doubled `.plan.review.jsonl` under `PRPs/plans/`), and **P** (`.sh`/`.ps1` bootstrap parity over the context-builder skill). Every structural check is scoped to `plugins/relay/` and never reads or flags `plugins/prp-core/`. Two devDependencies are added (`ajv` for F, `node-html-parser` for C) with `package-lock.json` committed. On the current tree, checks C/D/G/P are EXPECTED to fire on holes #1–#5 — that detection is the phase's definition of done; going green is Phase 3. Per `tdd: false` + `test_frameworks: ["node:test"]` (test-after, active pair, R-X strict) the Implementer authors ZERO test files; the checker unit tests land test-after via the test-writer/test-reviewer pair.

## User Story

```
As the relay maintainer
I want the full static-check set (A, C, D, E, F, G, P) registered in the validate runner
So that a single `npm run validate` detects registration drift, dead cross-references, broken dispatch pointers, frontmatter violations, mis-named artifacts, and .sh/.ps1 bootstrap gaps the moment they appear — and the five known holes light up on the current tree, proving the checks work before Phase 3 fixes them
```

## Problem Statement

The relay repository is Markdown prompts + JSON config whose correctness lives in consistency invariants that rot silently. Phase 1 shipped the runner and the first check (version parity, B). But the invariants that actually matter for day-to-day rot — the three-file registration rule (`documentation/AGENTS.md` §6), dead path references, broken subagent/command dispatch pointers, per-component-type frontmatter contracts, mis-named artifacts, and `.sh`/`.ps1` bootstrap parity — remain unenforced. Five concrete holes (#1 stale `relay-tdd` names, #2 stale `search-index.json`, #3 `.py`→`.mjs` dangling path, #4 doubled `.plan.review.jsonl`, #5 missing `worktree-bootstrap.ps1`) sit in the current tree undetected. This phase mechanizes those invariants as seven independent checks so the harness can catch this whole class of drift — while never treating `plugins/prp-core/` as relay surface (a hard scoping constraint the checks must honor).

## Solution Statement

Add seven check modules (A, C, D, E, F, G, P) to `scripts/validate/checks/`, each factored as the Phase 1 pattern: a pure function over already-read inputs plus a thin wrapper that does the file I/O relative to repo root, both returning the `{ name, ok, findings }` contract and failing loud. Register all seven in the `CHECKS` array in `scripts/validate/index.mjs` (the runner already aggregates without short-circuit and sets `process.exitCode = 1` on any finding). Check F validates YAML frontmatter against three JSON Schemas (`command`, `agent`, `skill`) via `ajv`, plus a code-level `name == filename-stem` cross-check for agents; check C parses `documentation/changelog.html` and the NAV via `node-html-parser` and diffs against the enumerable `plugins/relay/{commands,agents}/` listings. Every structural check globs `plugins/relay/**` and never `plugins/prp-core/**`. Add `ajv` and `node-html-parser` as devDependencies (commit `package-lock.json`; `node_modules/` already gitignored). The checker unit tests are delivered test-after by the test pair — the Implementer writes production code only (R-X strict).

## Metadata

| Key | Value |
|-----|-------|
| Type | Tooling / static-analysis checks |
| Complexity | Medium–High (seven independent checks + schemas + two deps) |
| Systems Affected | `scripts/validate/checks/` (7 new modules), `scripts/validate/schemas/` (3 new JSON Schemas), `scripts/validate/index.mjs` (registry wiring), `package.json` + `package-lock.json` (two devDependencies) |
| Dependencies | Phase 1 (Harness scaffold, complete) — the runner + `{ name, ok, findings }` contract; adds `ajv` + `node-html-parser` npm devDependencies |
| Estimated Tasks | 10 |
| Source PRD line ref | `PRPs/prds/validation-suite.prd.md` Implementation Phases row 2 (line 294); Phase 2 Details lines 310-317 |
| phase_type | feature |

> `phase_type: feature` (NOT `scaffold`): these are behavioral consistency checks with real detection logic, not project bootstrap/config. The framework-mismatch exemption does not apply — Level-2 unit coverage of each checker is genuinely test-first-able and is delivered test-after by the pair.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/validate/checks/version-parity.mjs` | 24-174 | Canonical check-module contract every new check MUST mirror: pure `checkX({...})` (no I/O, returns `{ name, ok, findings }`) + thin `runXCheck()` wrapper (`existsSync`/`readFileSync` via `resolve()` from repo root); every failure path returns a loud finding, never throws |
| P0 | `scripts/validate/index.mjs` | 26-46, 66-86 | The `CHECKS` registry array (the single registration point; comment already names A/C/D/E/F/G/P), the no-short-circuit `runChecks` try/catch loop, and `process.exitCode = 1` on any finding — the seven new checks register here |
| P0 | `PRPs/prds/validation-suite.prd.md` | 117-156, 310-317 | Acceptance Criteria AC-4..AC-10 + AC-13 (the seven checks + the prp-core scope invariant) and Phase 2 Details (Goal / Scope / Success signal) |
| P1 | `plugins/relay/commands/relay-plan.md` | 1-4 | Command frontmatter shape check F validates: `description` + `argument-hint`, NO `name` field |
| P1 | `plugins/relay/agents/plan-writer.md` | 1-7 | Agent frontmatter shape check F validates: `name` (== filename stem), `description`, `model`, `color`, `tools` |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 1-4, 397-447 | Skill frontmatter (`name` + `description`) for check F; and the sole `worktree-bootstrap.sh` emission with NO `.ps1` sibling (hole #5) that check P detects |
| P1 | `documentation/assets/js/app.js` | 18-92 | The hand-authored `NAV` array ("single source of truth") check C parses via node-html-parser's sibling JSON/HTML surfaces; diffed against the `plugins/relay/{commands,agents}/` listings |
| P1 | `docs/context/methodology.md` | 1-42 | `tdd: false` + `test_frameworks: ["node:test"]` → test-after with an active pair; R-X strict (Implementer authors ZERO test files) |
| P2 | https://ajv.js.org/api.html | — | ajv v8 usage for check F: `new Ajv()` → `ajv.compile(schema)` → `validate(data)` → `validate.errors` (each carries `instancePath` + `message`; the array is overwritten every call — copy it before reuse) |
| P2 | https://github.com/taoqf/node-html-parser | — | node-html-parser API for check C: `parse(html)` → `root.querySelectorAll(selector)`, `element.getAttribute(key)`, `.text`/`.textContent`, `.childNodes` |

## Patterns to Mirror

```
# SOURCE: scripts/validate/checks/version-parity.mjs:73-174
export function checkVersionParity({ pluginJson, changelogHtml }) {
  if (!pluginJson) {
    return { name: CHECK_NAME, ok: false,
      findings: [{ message: `missing or empty input: ${PLUGIN_JSON_PATH}`, file: PLUGIN_JSON_PATH, line: null }] };
  }
  // ...compare, return findings...
  return { name: CHECK_NAME, ok: true, findings: [] };
}

export function runVersionParityCheck() {
  const pluginJsonPath = resolve(PLUGIN_JSON_PATH);
  let pluginJson = null;
  if (existsSync(pluginJsonPath)) {
    try { pluginJson = readFileSync(pluginJsonPath, 'utf-8'); }
    catch (err) { return { name: CHECK_NAME, ok: false,
      findings: [{ message: `could not read ${PLUGIN_JSON_PATH}: ${err.message}`, file: PLUGIN_JSON_PATH, line: null }] }; }
  }
  return checkVersionParity({ pluginJson, changelogHtml });
}
```
Every one of the seven new checks (Tasks 3–9) copies this exact shape: a `const CHECK_NAME`, a pure `checkX(inputs)` returning `{ name, ok, findings: [{ message, file, line }] }`, and a thin `runXCheck()` wrapper doing `resolve()` + `existsSync` + `readFileSync` from repo root. A missing/unreadable input is a loud FAIL-finding, never a throw and never a silent pass. Same `#!/usr/bin/env node`, `// @ts-check`, JSDoc header, and `node:` imports.

```
# SOURCE: scripts/validate/index.mjs:26-31
// Registry of check modules. Each entry is a zero-arg function returning
// { name, ok, findings: [{ message, file, line }] }. Later phases of
// validation-suite append additional checks (A, C, D, E, F, G, P) here.
const CHECKS = [
  runVersionParityCheck,
];
```
Task 10 appends the seven `runXCheck` imports + registry entries here. Preserve the no-short-circuit `runChecks` try/catch (index.mjs:33-46) and the `process.exitCode = 1` (not `process.exit`) so all findings flush (index.mjs:78-83).

```
# SOURCE: plugins/relay/commands/relay-plan.md:1-4
---
description: Autonomous plan generation from an APPROVED PRD or a free-text feature description. ...
argument-hint: <prd-path> | "<description>"
---
```
Command frontmatter = `description` + `argument-hint`, and crucially NO `name` key. `scripts/validate/schemas/command.schema.json` (Task 2) encodes `required: [description, argument-hint]` + `not: { required: [name] }`. Check F (Task 3) validates every `plugins/relay/commands/*.md` against it.

```
# SOURCE: plugins/relay/agents/plan-writer.md:1-7
---
name: plan-writer
description: Autonomously transform an APPROVED PRD into a per-phase DRAFT plan ...
model: sonnet
color: orange
tools: Task, Read, Write, Edit, Glob
---
```
Agent frontmatter = `name` + `description` + `model` + `color` + `tools`, with `name` equal to the filename stem (`plan-writer.md` → `plan-writer`). `agent.schema.json` encodes `required: [name, description, model, color, tools]`; check F adds a CODE-level `data.name === basename(file, '.md')` cross-check (the schema alone cannot see the filename).

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:397-447
### Sub-step B — `scripts/worktree-bootstrap.sh` emission
**Canonical template:** ```bash
#!/usr/bin/env bash
...
```   ← emits ONLY the .sh variant; no worktree-bootstrap.ps1 anywhere in SKILL.md (hole #5)
```
Check P (Task 9) reads this SKILL.md: if it emits a `worktree-bootstrap.sh` template, it MUST also emit a `worktree-bootstrap.ps1` template — else a finding. On the current tree this FIRES (hole #5). Skill frontmatter (SKILL.md:1-4) is `name` + `description` only — `skill.schema.json` encodes `required: [name, description]`.

```
# SOURCE: documentation/assets/js/app.js:18-92
// ---------- Nav structure (single source of truth) ----------
const NAV = [
  { heading: "Getting started", items: [ /* ... */ ] },
  // ...8 sections, hand-authored...
];
```
Check C (Task 4) extracts command/agent names from this NAV, from `documentation/assets/data/search-index.json` (flat array of `{title, path, category, excerpt}`), and from `documentation/changelog.html` (`<h2 id="...">` releases via node-html-parser), then diffs all three against the enumerable `plugins/relay/{commands,agents}/*.md` basenames. Missing-in-docs OR stale-in-docs (present in a doc, absent on disk) → findings. On the current tree this FIRES on holes #1 (stale `relay-tdd`/`relay-tdd-review` names) and #2 (search-index missing commands).

```
# SOURCE: https://ajv.js.org/api.html  (research-web finding)
const ajv = new Ajv();               // v8
const validate = ajv.compile(schema);
const valid = validate(data);
if (!valid) { for (const e of validate.errors) { /* e.instancePath, e.message */ } }
// NOTE: validate.errors is overwritten on every call — copy it before the next validate().
```
Check F (Task 3) compiles the three schemas once, validates each component file's parsed frontmatter, and turns each `{ instancePath, message }` into a `{ message, file, line }` finding. Copy `validate.errors` immediately after each call.

```
# SOURCE: https://github.com/taoqf/node-html-parser  (research-web finding)
import { parse } from 'node-html-parser';
const root = parse(html);
const headings = root.querySelectorAll('h2');   // returns array
for (const h of headings) { h.getAttribute('id'); h.text; }
```
Check C (Task 4) uses this to read `changelog.html` (and the NAV/search surfaces) rather than fragile hand-rolled regex.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `package.json` | UPDATE | Add `ajv` (check F) + `node-html-parser` (check C) to `devDependencies`; scripts/deps otherwise unchanged. Additive. |
| `package-lock.json` | CREATE | Generated by `npm install`; committed so the dep graph is reproducible. `node_modules/` stays gitignored (Phase 1). |
| `scripts/validate/schemas/command.schema.json` | CREATE | JSON Schema for command frontmatter: `required: [description, argument-hint]`, `not: { required: [name] }` (commands must NOT carry `name`). |
| `scripts/validate/schemas/agent.schema.json` | CREATE | JSON Schema for agent frontmatter: `required: [name, description, model, color, tools]`. |
| `scripts/validate/schemas/skill.schema.json` | CREATE | JSON Schema for skill frontmatter: `required: [name, description]`. |
| `scripts/validate/checks/frontmatter-schema.mjs` | CREATE | Check F: parse YAML frontmatter of every `plugins/relay/{commands,agents}/*.md` + `skills/*/SKILL.md`, validate against the matching schema via ajv, plus code-level `name == filename stem` cross-check for agents. Scoped to plugins/relay/; never prp-core. |
| `scripts/validate/checks/registration-parity.mjs` | CREATE | Check C: diff the `plugins/relay/{commands,agents}/` listings against NAV (`app.js`) + `search-index.json` + `changelog.html` (parsed via node-html-parser). Fires on holes #1, #2. |
| `scripts/validate/checks/path-existence.mjs` | CREATE | Check D: every `${CLAUDE_PLUGIN_ROOT}/…`, `scripts/…`, and inter-doc path referenced in `plugins/relay/` + `docs/` resolves on disk. Fires on hole #3. Scoped away from prp-core. |
| `scripts/validate/checks/dispatch-graph.mjs` | CREATE | Check E: every `subagent_type:`/agent name a command references exists under `plugins/relay/agents/`; every `Next: /relay-x` resolves to a `plugins/relay/commands/*.md`. |
| `scripts/validate/checks/artifact-naming.mjs` | CREATE | Check G: no `PRPs/plans/*.plan.review.jsonl` (doubled `.plan`). Fires on hole #4. |
| `scripts/validate/checks/native-validate.mjs` | CREATE | Check A: spawn `claude plugin validate ./plugins/relay --strict`; non-zero → finding; `claude` CLI absent (ENOENT) → `ok: true` with a "native validator skipped" note (graceful degrade). |
| `scripts/validate/index.mjs` | UPDATE | Register the seven new `runXCheck` functions in the `CHECKS` array (imports + array entries); preserve no-short-circuit + `process.exitCode = 1`. |

## NOT Building (Scope Limits)

- **Fixing holes #1–#5 / going green** — Phase 3. This phase's checks are EXPECTED to fire on the holes; the tree stays red on `npm run validate` until Phase 3.
- **Check B (version parity)** — already shipped in Phase 1; not re-authored here.
- **The pre-commit hook** (`.githooks/pre-commit`, real `setup-hooks`) — Phase 4.
- **The eval layer** (`promptfooconfig.yaml`, real `npm run eval`, `promptfoo` dependency) — Phase 5.
- **HALT-code coverage check (H), external link-check (I), markdownlint** — Could-items, deferred (out of MVP).
- **Validating `plugins/prp-core/`** — explicitly out of the relay surface; every structural check globs `plugins/relay/**` only. AC-10 gate.
- **The checker unit tests** (`scripts/validate/**/*.test.mjs`) — NOT authored by the Implementer (R-X strict). Under `tdd: false` + `test_frameworks: ["node:test"]` (test-after, active pair) the test-writer/test-reviewer pair authors them AFTER the Implementer + Code Review; `/relay-test` then runs them via `node --test`. No Step-by-Step Task, Files-to-Change row, or Validation Command in this plan creates or edits a test file.

## Step-by-Step Tasks

> **Comment-accuracy directive (applies to every task below):** all code comments and JSDoc in the new modules MUST describe behavior EXACTLY as implemented — no aspirational or stale comments. A comment claiming "reads only plugins/relay/" beside code that also traverses another tree is a defect (`R-COH-COMMENT-MISMATCH`). Keep comments in lock-step with the code.

### Task 1: UPDATE `package.json` (+ CREATE `package-lock.json`) — add ajv + node-html-parser

- **AC**: infrastructure / scaffolding (enables AC-A5 check F and AC-A2 check C)
- **ACTION**: Run `npm install --save-dev ajv node-html-parser` from repo root, adding both to `devDependencies` in `package.json` and generating `package-lock.json`. Do not change `type: module`, `engines`, or the three `scripts`. `node_modules/` is already gitignored (Phase 1); `package-lock.json` is committed.
- **MIRROR**: N/A (manifest / lockfile).
- **VALIDATE**:
  ```sh
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); const d=p.devDependencies||{}; if(!d.ajv||!d['node-html-parser']){console.error('FAIL: devDependencies missing ajv and/or node-html-parser'); process.exit(1);} if(!fs.existsSync('package-lock.json')){console.error('FAIL: package-lock.json not present'); process.exit(1);} console.log('PASS: ajv + node-html-parser in devDependencies, lockfile committed');"
  ```

### Task 2: CREATE the three frontmatter JSON Schemas under `scripts/validate/schemas/`

- **AC**: AC-A5 (PRD AC-7)
- **ACTION**: Create `command.schema.json` (`type: object`, `required: ["description","argument-hint"]`, `not: { "required": ["name"] }`), `agent.schema.json` (`required: ["name","description","model","color","tools"]`), and `skill.schema.json` (`required: ["name","description"]`). Each is a draft-2020-12 (or draft-07) JSON Schema consumed by check F via ajv. Keep them permissive on additional properties except the command `name`-forbidden rule.
- **MIRROR**: N/A (data files) — schemas encode the frontmatter shapes at `plugins/relay/commands/relay-plan.md:1-4`, `plugins/relay/agents/plan-writer.md:1-7`, `plugins/relay/skills/context-builder/SKILL.md:1-4`.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  for f in scripts/validate/schemas/command.schema.json scripts/validate/schemas/agent.schema.json scripts/validate/schemas/skill.schema.json; do
    node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))"
  done
  node -e "const s=JSON.parse(require('fs').readFileSync('scripts/validate/schemas/command.schema.json','utf8')); if(!(s.not&&Array.isArray(s.not.required)&&s.not.required.includes('name'))){console.error('FAIL: command schema must forbid a name field'); process.exit(1);} console.log('PASS: schemas parse; command schema forbids name');"
  ```

### Task 3: CREATE `scripts/validate/checks/frontmatter-schema.mjs` (check F)

- **AC**: AC-A5 (PRD AC-7)
- **ACTION**: Author check F as pure `checkFrontmatterSchema({ files })` (each `files` entry = `{ path, kind, frontmatter }`) + thin `runFrontmatterSchemaCheck()`. The wrapper globs `plugins/relay/commands/*.md`, `plugins/relay/agents/*.md`, `plugins/relay/skills/*/SKILL.md` (NEVER `plugins/prp-core/**`), extracts YAML frontmatter, and delegates. Compile the three schemas once with ajv; validate each file's frontmatter against its kind's schema; turn every `{ instancePath, message }` into a `{ message, file, line }` finding (copy `validate.errors` right after each call). Add the agent-only cross-check: `frontmatter.name === basename(path, '.md')` else a finding. Return the `{ name, ok, findings }` contract; missing/unparseable frontmatter is a loud finding, never a throw.
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:73-174` (pure+wrapper contract) and the ajv usage at https://ajv.js.org/api.html.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/checks/frontmatter-schema.mjs
  node -e "import('./scripts/validate/checks/frontmatter-schema.mjs').then(m=>{ if(typeof m.checkFrontmatterSchema!=='function'||typeof m.runFrontmatterSchemaCheck!=='function'){console.error('FAIL: check F must export checkFrontmatterSchema + runFrontmatterSchemaCheck'); process.exit(1);} console.log('PASS: check F exports the pure+wrapper seam'); }).catch(e=>{console.error('FAIL: '+e.message); process.exit(1);});"
  ```

### Task 4: CREATE `scripts/validate/checks/registration-parity.mjs` (check C)

- **AC**: AC-A2 (PRD AC-4)
- **ACTION**: Author check C as pure `checkRegistrationParity({ commands, agents, navHtml, searchIndexJson, changelogHtml })` + thin `runRegistrationParityCheck()`. The wrapper lists `plugins/relay/commands/*.md` and `plugins/relay/agents/*.md` basenames (the ground truth; NEVER prp-core), reads `documentation/assets/js/app.js`, `documentation/assets/data/search-index.json`, `documentation/changelog.html`, and delegates. Parse NAV/changelog with `node-html-parser` and the search index as JSON. For each of the three doc surfaces, emit a finding for every command/agent present on disk but absent from the surface (missing) AND every command name present in the surface but absent on disk (stale). Return the contract. (On the current tree this FIRES on holes #1 and #2 — that is correct.)
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:73-174` (contract) and node-html-parser usage at https://github.com/taoqf/node-html-parser; NAV shape at `documentation/assets/js/app.js:18-92`.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/checks/registration-parity.mjs
  node -e "import('./scripts/validate/checks/registration-parity.mjs').then(m=>{ if(typeof m.checkRegistrationParity!=='function'||typeof m.runRegistrationParityCheck!=='function'){console.error('FAIL: check C must export checkRegistrationParity + runRegistrationParityCheck'); process.exit(1);} console.log('PASS: check C exports the pure+wrapper seam'); }).catch(e=>{console.error('FAIL: '+e.message); process.exit(1);});"
  ```

### Task 5: CREATE `scripts/validate/checks/path-existence.mjs` (check D)

- **AC**: AC-A3 (PRD AC-5)
- **ACTION**: Author check D as pure `checkPathExistence({ references })` (each reference = `{ raw, resolvedPath, file, line }`) + thin `runPathExistenceCheck()`. The wrapper scans `plugins/relay/**/*.md` + `docs/**/*.md` (NEVER `plugins/prp-core/**`) for precisely-anchored path references — backtick- or inline-quoted `${CLAUDE_PLUGIN_ROOT}/…` (resolve `${CLAUDE_PLUGIN_ROOT}` → `plugins/relay/`), `scripts/…`, and relative inter-doc paths — and checks each resolves with `existsSync`. Use precise anchors (quoted/backticked path tokens with a known prefix), NOT arbitrary word matching, to avoid false positives on prose. Emit a finding per dangling reference naming the `file:line` and the missing target. (Fires on hole #3: `scripts/normalize-test-output.py` cited in `docs/api-reference.md`.)
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:73-174` (contract); `${CLAUDE_PLUGIN_ROOT}/…` reference shape at `plugins/relay/commands/relay-plan.md` body.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/checks/path-existence.mjs
  node -e "import('./scripts/validate/checks/path-existence.mjs').then(m=>{ if(typeof m.checkPathExistence!=='function'||typeof m.runPathExistenceCheck!=='function'){console.error('FAIL: check D must export checkPathExistence + runPathExistenceCheck'); process.exit(1);} console.log('PASS: check D exports the pure+wrapper seam'); }).catch(e=>{console.error('FAIL: '+e.message); process.exit(1);});"
  ```

### Task 6: CREATE `scripts/validate/checks/dispatch-graph.mjs` (check E)

- **AC**: AC-A4 (PRD AC-6)
- **ACTION**: Author check E as pure `checkDispatchGraph({ commandFiles, agentNames })` + thin `runDispatchGraphCheck()`. The wrapper reads `plugins/relay/commands/*.md`, collects the set of agent basenames from `plugins/relay/agents/*.md` (NEVER prp-core). For each command, find every `subagent_type: X` / dispatched agent name and emit a finding if `agents/X.md` does not exist (normalize any `relay:` namespace prefix). For every `Next: /relay-x` (or `/relay:relay-x`) pointer, emit a finding if `plugins/relay/commands/relay-x.md` does not exist. Treat `Next:` as common-but-not-universal — only validate pointers actually present. Return the contract.
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:73-174` (contract); `subagent_type:` dispatch shape at `plugins/relay/agents/plan-writer.md:311-325`.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/checks/dispatch-graph.mjs
  node -e "import('./scripts/validate/checks/dispatch-graph.mjs').then(m=>{ if(typeof m.checkDispatchGraph!=='function'||typeof m.runDispatchGraphCheck!=='function'){console.error('FAIL: check E must export checkDispatchGraph + runDispatchGraphCheck'); process.exit(1);} console.log('PASS: check E exports the pure+wrapper seam'); }).catch(e=>{console.error('FAIL: '+e.message); process.exit(1);});"
  ```

### Task 7: CREATE `scripts/validate/checks/artifact-naming.mjs` (check G)

- **AC**: AC-A6 (PRD AC-8)
- **ACTION**: Author check G as pure `checkArtifactNaming({ planFiles })` + thin `runArtifactNamingCheck()`. The wrapper lists `PRPs/plans/*.jsonl` (read-only) and delegates. Emit a finding for every file whose basename matches the doubled `.plan.review.jsonl` form (distinct from the correct `.review.jsonl` / `.code-review.jsonl` / `.test-write-review.jsonl` forms). Return the contract. (Fires on hole #4: `PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.plan.review.jsonl`.)
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:73-174` (contract).
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/checks/artifact-naming.mjs
  node -e "import('./scripts/validate/checks/artifact-naming.mjs').then(m=>{ if(typeof m.checkArtifactNaming!=='function'||typeof m.runArtifactNamingCheck!=='function'){console.error('FAIL: check G must export checkArtifactNaming + runArtifactNamingCheck'); process.exit(1);} console.log('PASS: check G exports the pure+wrapper seam'); }).catch(e=>{console.error('FAIL: '+e.message); process.exit(1);});"
  ```

### Task 8: CREATE `scripts/validate/checks/native-validate.mjs` (check A)

- **AC**: AC-A1 (PRD AC-9)
- **ACTION**: Author check A as `runNativeValidateCheck()` that spawns `claude plugin validate ./plugins/relay --strict` (via `node:child_process` `spawnSync`, no shell). On non-zero exit, surface the failure as a finding (include the trimmed stderr/stdout tail). On spawn ENOENT (the `claude` CLI is unavailable) return `{ name, ok: true, findings: [] }` WITH a clear degradation note in the finding-free result (e.g. a `note` field or a `console`-free ok result documented in the JSDoc) — degrade gracefully, never crash the runner. Scope: it validates `./plugins/relay` only, never prp-core.
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:143-174` (thin wrapper + loud-finding-not-throw shape). A pure/wrapper split is optional here since the check is inherently I/O (subprocess); keep the same `{ name, ok, findings }` return contract.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/checks/native-validate.mjs
  node -e "import('./scripts/validate/checks/native-validate.mjs').then(m=>{ if(typeof m.runNativeValidateCheck!=='function'){console.error('FAIL: check A must export runNativeValidateCheck'); process.exit(1);} const r=m.runNativeValidateCheck(); if(!r||typeof r.ok!=='boolean'||!('findings'in r)){console.error('FAIL: check A must return { name, ok, findings }'); process.exit(1);} console.log('PASS: check A returns the contract and degrades gracefully'); }).catch(e=>{console.error('FAIL: '+e.message); process.exit(1);});"
  ```

### Task 9: CREATE `scripts/validate/checks/bootstrap-parity.mjs` (check P)

- **AC**: AC-A7 (PRD AC-13)
- **ACTION**: Author check P as pure `checkBootstrapParity({ skillMd })` + thin `runBootstrapParityCheck()`. The wrapper reads `plugins/relay/skills/context-builder/SKILL.md` and delegates. If the SKILL.md emits a `worktree-bootstrap.sh` template, it MUST also emit a `worktree-bootstrap.ps1` template; if the `.sh` is present and the `.ps1` is absent, emit a finding naming the missing `.ps1`. Anchor detection on the template markers (e.g. the `worktree-bootstrap.sh` / `worktree-bootstrap.ps1` filename tokens), not fragile whole-file regex. Return the contract. (Fires on hole #5.)
- **MIRROR**: `scripts/validate/checks/version-parity.mjs:73-174` (contract); the `.sh`-only emission at `plugins/relay/skills/context-builder/SKILL.md:397-447`.
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/checks/bootstrap-parity.mjs
  node -e "import('./scripts/validate/checks/bootstrap-parity.mjs').then(m=>{ if(typeof m.checkBootstrapParity!=='function'||typeof m.runBootstrapParityCheck!=='function'){console.error('FAIL: check P must export checkBootstrapParity + runBootstrapParityCheck'); process.exit(1);} console.log('PASS: check P exports the pure+wrapper seam'); }).catch(e=>{console.error('FAIL: '+e.message); process.exit(1);});"
  ```

### Task 10: UPDATE `scripts/validate/index.mjs` — register all seven checks

- **AC**: AC-A8 (PRD AC-10 scope + runner aggregation of the full set)
- **ACTION**: Import the seven `runXCheck` functions and append them to the `CHECKS` array (after `runVersionParityCheck`). Do NOT alter the no-short-circuit `runChecks` try/catch, `printResults`, or the `process.exitCode = 1` line. After this, `npm run validate` runs all eight checks and aggregates findings.
- **MIRROR**: `scripts/validate/index.mjs:19,26-31` (import + registry append point).
- **VALIDATE**:
  ```sh
  set -euo pipefail
  node --check scripts/validate/index.mjs
  node -e "const s=require('fs').readFileSync('scripts/validate/index.mjs','utf8'); for(const fn of ['runFrontmatterSchemaCheck','runRegistrationParityCheck','runPathExistenceCheck','runDispatchGraphCheck','runArtifactNamingCheck','runNativeValidateCheck','runBootstrapParityCheck']){ if(!s.includes(fn)){console.error('FAIL: index.mjs does not register '+fn); process.exit(1);} } console.log('PASS: all seven checks registered');"
  ```

## Validation Commands

Every command below carries real exit-code semantics — it exits non-zero when its invariant is violated. No `<check> && echo "PASS" || echo "FAIL"` masking. The `code-reviewer` scores each Level PASS iff exit code is 0.

**Level 1 — STATIC_ANALYSIS (syntax + JSON validity of all new sources)**
```sh
set -euo pipefail
# ESM syntax check of all seven new check modules + the updated runner
for f in \
  scripts/validate/checks/frontmatter-schema.mjs \
  scripts/validate/checks/registration-parity.mjs \
  scripts/validate/checks/path-existence.mjs \
  scripts/validate/checks/dispatch-graph.mjs \
  scripts/validate/checks/artifact-naming.mjs \
  scripts/validate/checks/native-validate.mjs \
  scripts/validate/checks/bootstrap-parity.mjs \
  scripts/validate/index.mjs ; do
  node --check "$f"
done
# JSON validity of the three schemas + package.json + package-lock.json
for j in \
  scripts/validate/schemas/command.schema.json \
  scripts/validate/schemas/agent.schema.json \
  scripts/validate/schemas/skill.schema.json \
  package.json \
  package-lock.json ; do
  node -e "JSON.parse(require('fs').readFileSync('$j','utf8'))"
done
echo "Level 1 PASS: all new sources parse and all JSON is valid"
```

**Level 2 — CONTENT_INVARIANTS (structural invariants runnable now; unit tests delivered test-after)**
```sh
set -euo pipefail
# Every new check module exports the { name, ok, findings } contract seam
node -e "
const mods = [
  ['./scripts/validate/checks/frontmatter-schema.mjs','runFrontmatterSchemaCheck'],
  ['./scripts/validate/checks/registration-parity.mjs','runRegistrationParityCheck'],
  ['./scripts/validate/checks/path-existence.mjs','runPathExistenceCheck'],
  ['./scripts/validate/checks/dispatch-graph.mjs','runDispatchGraphCheck'],
  ['./scripts/validate/checks/artifact-naming.mjs','runArtifactNamingCheck'],
  ['./scripts/validate/checks/native-validate.mjs','runNativeValidateCheck'],
  ['./scripts/validate/checks/bootstrap-parity.mjs','runBootstrapParityCheck'],
];
Promise.all(mods.map(async ([p,fn]) => {
  const m = await import(p);
  if (typeof m[fn] !== 'function') { throw new Error('missing export '+fn+' in '+p); }
})).then(() => console.log('Level 2a PASS: all seven wrapper exports present'))
   .catch(e => { console.error('FAIL: '+e.message); process.exit(1); });
"
# AC-10 behavioral scope guard: run the whole suite and assert NO finding references a prp-core file.
# (Grep the runtime OUTPUT — the actual findings — not the source, so source comments that mention
#  prp-core in the scoping-invariant sense never false-positive. Precise anchor per the docs-phase lesson.)
out="$(node scripts/validate/index.mjs 2>&1 || true)"
if printf '%s\n' "$out" | grep -q "plugins/prp-core"; then
  echo "FAIL: a check flagged a plugins/prp-core file — AC-10 scope violation"; exit 1
fi
echo "Level 2 PASS: contract seams present; no prp-core file is flagged"
```
> Note: Level-2 UNIT-test coverage of the seven checkers (each pure `checkX()` over good/bad fixtures, missing/unparseable inputs, the prp-core scope exclusion, and each hole-detection path) is delivered TEST-AFTER by the test-writer/test-reviewer pair (`tdd: false` + `test_frameworks: ["node:test"]`), then run by `/relay-test` via `node --test`. The Implementer authors ZERO test files (R-X strict); the content-invariant commands above are the runnable Level-2 gate for the implement stage.

**Level 3 — INTEGRATION (the checks correctly DETECT the known holes on the current tree)**
```sh
set -euo pipefail
# On the CURRENT tree, `npm run validate` is EXPECTED to exit non-zero: checks C/D/G/P fire on
# holes #1–#5 (going green is Phase 3). The Level-3 success signal is that the NEW checks correctly
# DETECT the known holes — NOT that the tree is green. Capture output without aborting under set -e.
out="$(node scripts/validate/index.mjs 2>&1 || true)"
printf '%s\n' "$out"
# check G must flag the doubled .plan.review.jsonl (hole #4)
printf '%s\n' "$out" | grep -q "plan.review.jsonl" || { echo "FAIL: check G did not detect the doubled .plan.review.jsonl (hole #4)"; exit 1; }
# check P must flag the missing worktree-bootstrap.ps1 (hole #5)
printf '%s\n' "$out" | grep -q "worktree-bootstrap.ps1" || { echo "FAIL: check P did not detect the missing .ps1 bootstrap (hole #5)"; exit 1; }
# check D must flag the dangling scripts/normalize-test-output.py reference (hole #3)
printf '%s\n' "$out" | grep -q "normalize-test-output.py" || { echo "FAIL: check D did not detect the dangling .py path (hole #3)"; exit 1; }
# check C must fire on registration drift (holes #1/#2) — at least one registration-parity finding
printf '%s\n' "$out" | grep -q "registration-parity" || { echo "FAIL: check C (registration-parity) did not fire on the current tree (holes #1/#2)"; exit 1; }
echo "Level 3 PASS: the new checks correctly detect holes #1–#5 on the current tree"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-9):** Check A wraps `claude plugin validate ./plugins/relay --strict` and surfaces a non-zero result as a check finding; when the `claude` CLI is unavailable it degrades gracefully (`ok: true` with a clear "native validator skipped" note) rather than crashing the runner.
- **AC-A2 (PRD AC-4):** Check C (`registration-parity`) fails listing every command/agent present under `plugins/relay/{commands,agents}/` but missing from the NAV (`app.js`), `search-index.json`, or `changelog.html`, AND every name present in those docs but absent on disk — catching holes #1 (stale `relay-tdd` names) and #2 (search-index missing commands).
- **AC-A3 (PRD AC-5):** Check D (`path-existence`) fails naming any `${CLAUDE_PLUGIN_ROOT}/…`, `scripts/…`, or inter-doc path referenced in `plugins/relay/` + `docs/` that does not resolve on disk — catching hole #3 (`scripts/normalize-test-output.py`).
- **AC-A4 (PRD AC-6):** Check E (`dispatch-graph`) fails naming any `subagent_type:`/agent reference in a command with no matching `plugins/relay/agents/*.md`, or any `Next: /relay-x` pointer with no matching command file.
- **AC-A5 (PRD AC-7):** Check F (`frontmatter-schema`) validates command, agent, and skill frontmatter against the ajv-backed JSON Schemas and fails naming the file + violated rule — including an agent whose `name` ≠ its filename stem, or a command carrying a forbidden `name` field.
- **AC-A6 (PRD AC-8):** Check G (`artifact-naming`) fails for any `PRPs/plans/*.plan.review.jsonl` (doubled `.plan`) — catching hole #4.
- **AC-A7 (PRD AC-13):** Check P (`bootstrap-parity`) fails naming the missing `worktree-bootstrap.ps1` when the context-builder SKILL.md emits a `worktree-bootstrap.sh` template but no `.ps1` sibling — catching hole #5.
- **AC-A8 (PRD AC-10):** Every structural check (C, D, E, F, A) is scoped to `plugins/relay/` and reads/flags NOTHING under `plugins/prp-core/`; running the full suite produces zero findings whose `file` resolves under `plugins/prp-core/`. All seven checks are registered in the `CHECKS` array of `scripts/validate/index.mjs` and aggregate through the no-short-circuit runner.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Over-broad checks produce false positives on legitimate content (prior art: relay-execute docs-phase Level-3 grep false positives) | M | M | Every structural check uses precise anchors (quoted/backticked path tokens for D; frontmatter parsing for F; directory-listing diffs + node-html-parser for C; `subagent_type:`/`Next:` tokens for E) rather than broad greps; each is scoped to `plugins/relay/`; the Level-2 prp-core guard greps the RUNTIME OUTPUT (actual findings), not source comments; unit-tested test-after by the pair against good/bad fixtures |
| Brittle HTML parsing of the documentation site (check C) | L | M | Use `node-html-parser` and anchor on stable structures (`<h2 id="...">` releases, the NAV array, JSON search index), not fragile hand-rolled regex |
| `claude plugin validate` CLI absent in some environments (check A) | L | L | Detect spawn ENOENT and degrade gracefully with a clear "native validator skipped" note; never hard-crash the runner (AC-9) |
| ajv `validate.errors` is overwritten on each `validate()` call — later findings could clobber earlier ones (check F) | M | M | Copy `validate.errors` into a local array immediately after each call before the next `validate()`; compile each schema once and reuse the validator (per ajv v8 docs) |
| Level 3 couples to specific hole strings; a hole fixed early (out of order) would break the "detects the hole" assertion | L | L | Holes #1–#5 are Phase 3 scope by design and still present on the current tree; Level 3 asserts detection, which is the phase's actual success signal per the PRD Phase 2 Details |
| research-web could not directly fetch the npm page for node-html-parser (403); API confirmed via the GitHub mirror only | L | L | Non-load-bearing — the `parse`/`querySelectorAll`/`getAttribute` surface is stable and corroborated by the GitHub README; the Implementer verifies against the installed package version at implement time |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Concretely for this phase:** `test_frameworks: ["node:test"]` IS declared, so the pair is ACTIVE. The Implementer authors production code ONLY (the seven check modules + three schemas + the two devDependency additions + the registry wiring) and authors ZERO test files (R-X strict). The checker unit tests — each pure `checkX()` over good/bad fixtures, missing/unparseable inputs, the prp-core scope exclusion, and every hole-detection path — are authored test-after by the test-writer/test-reviewer pair (after the Implementer + Code Review), then run by `/relay-test` via `node --test`. This resolves the source PRD's Open Question #5 (2026-07-12): having the Implementer author the checkers' own tests conflicts with R-X strict (`docs/decisions.md` [2026-05-06], [2026-07-10]).
- **Expected-red on the current tree (NOT a bug):** `npm run validate` is EXPECTED to exit non-zero after this phase because checks C/D/G/P correctly DETECT holes #1–#5. Going green is Phase 3 (fix the holes + add the `.ps1` template). The Level-3 gate asserts DETECTION, not a green tree — do not "fix" a check to make the suite pass; that would defeat the phase.
- **Comment accuracy:** all code comments and JSDoc in the new modules must match behavior exactly (see the directive above the Step-by-Step Tasks). A comment that overstates scope (e.g. "reads only plugins/relay/" beside code that traverses elsewhere) is a defect.
- **Scope invariant is load-bearing:** checks C/D/E/F/A must glob `plugins/relay/**` and never `plugins/prp-core/**`. The Level-2 behavioral guard (no finding references a `plugins/prp-core` path) is the AC-10 gate; keep the exclusion explicit in each wrapper's globbing.
- **Dependencies:** `ajv` (check F) and `node-html-parser` (check C) are the only new deps; both are devDependencies, `package-lock.json` is committed, `node_modules/` stays gitignored (Phase 1). `promptfoo` (Phase 5) and the pre-commit tooling (Phase 4) are out of scope.
- **Docs evolution (out of this phase):** CLAUDE.md and `docs/context/architecture.md` still say "There are no build, lint, or test commands." The Docs Updater reconciles that post-merge; no documentation edit is in this phase's scope (and this phase must NOT edit `documentation/` — that is Phase 3's registration-fix work under `AGENTS.md`).

*Generated: 2026-07-13*
*Approved: 2026-07-13*
*Implemented: 2026-07-13*
*Status: IMPLEMENTED*
