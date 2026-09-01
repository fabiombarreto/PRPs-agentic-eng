# Feature: Topology registry and root resolution (Phase 1 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new plugin-owned shared contract under plugins/relay/resources/; adds a precondition to relay-execute.md; adds a scripts/validate check + registry entry; the contract's presence/absence semantics must preserve single-repo behavior byte-for-byte in this very repository
- Decisions found:
  - [2026-08-05] Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/` — the new topology contract is a plugin-owned shared module, so it belongs in `resources/` alongside `mock-sentinels.md` and `redaction-policy.md`
  - [2026-05-11] relay-worktree D1/D2/D4 — worktree path, shell-out primitive and `--porcelain` idempotency are untouched by this phase; only the root that path is relative to becomes addressable
  - [2026-08-05] Five-state phase lifecycle — this phase adds a precondition only; it writes no Status cell
  - PRP artifacts live under `PRPs/`, never under `.claude/`
  - [2026-04-19] Writer/reviewer split — this phase adds no agent and no reviewer
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — the governing precedent: topology membership, `Role` and `Base` are read from an explicit declaration only, never inferred by scanning for `.git`
  - "Relying on interactive permission prompts in the autonomous loop" — P6 resolves and HALTs deterministically; it prompts nothing (the base preflight belongs to Phase 5)
  - "Writing pipeline artifacts under `.claude/`" — this phase writes only to `plugins/relay/`, `scripts/validate/` and `docs/context/`
  - "Logic duplication across command files" — the contract lives in one resource that consumers Read by reference, mirroring `redaction-policy.md`
- Applicable architectural rules:
  - Graceful degradation: a project with no topology declaration must behave byte-for-byte as before — enforced here in the repository that is itself single-repo
  - Interactivity boundary: preconditions HALT verbatim and exit; they never dialogue
  - Three-pillar Pilar 2; nothing is committed by this phase's own deliverable
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 1: "Topology registry and root resolution" — Goal: Make workspace membership addressable and every unserviceable topology loud. — Success signal: All four measured workspaces resolve or halt with an actionable message; a project with no topology section behaves byte-for-byte as before.

## Summary

This phase creates the single shared contract that makes a workspace's repository membership addressable, and wires the first consumer to it. A new plugin-owned resource, `plugins/relay/resources/repository-topology.md`, defines a byte-exact `| Repo | Path | Git root | Role | Base |` table read from a `## Repository topology` section of the target's `docs/context/architecture.md`, the resolution of three distinct roots (`project_root`, `context_root`, `repo_root`), and five named HALT codes for every topology that cannot be served. `/relay-execute` gains a precondition, P6, that adopts the contract inline. The section's absence is the compatibility clause: it means single-repo, and every downstream behavior stays exactly as it is today. No worktree behavior, no phase-to-repo pointer and no base declaration are wired here — those are Phases 5, 4 and 5 respectively.

## User Story

```
As a relay operator working in a workspace of sibling repositories
I want relay to read a declared topology and refuse the topologies it cannot serve
So that a cross-repo run stops guessing and stops silently editing my live working tree
```

## Problem Statement

`/relay-execute` records `target_root` as the bare current working directory with no validation, so a workspace root that is not a git repository is discovered only downstream, when `/relay-worktree` fails and the orchestrator degrades to editing whatever branch happens to be checked out. Worse, a root that IS a repository but whose real code lives in sibling repositories produces a worktree that succeeds and comes up empty. Relay has no way to express which repositories a workspace contains, which of them may be written to, or where each one's context and git root actually live.

## Solution Statement

Introduce one shared, plugin-owned contract that defines the topology table, the three-root resolution and the named HALT codes, and have `/relay-execute` adopt it as precondition P6. Membership is declared, never detected — the governing precedent is the standing non-heuristic contract for `tdd`, `docs_sync` and `figma_track`. A `Git root` column exists because the context root and the git root are not always the same directory, and a `Role` column exists so a member declared `reference-only` can be refused rather than merely documented. When the `## Repository topology` section is absent, P6 records `topology: null` and every downstream stage behaves exactly as it does today.

## Metadata

| Key | Value |
|-----|-------|
| Type | Shared contract module + command precondition + validate check |
| Complexity | Medium |
| Systems Affected | `plugins/relay/resources/` (new contract), `plugins/relay/commands/relay-execute.md` (new P6), `scripts/validate/` (new check + registry entry), `docs/context/architecture.md` (contract documentation) |
| Dependencies | None — row 1 of the PRD, `Depends: -` |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 1; AC-1, AC-2, AC-3, AC-4, AC-5; Phase 1 Details |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** this phase's deliverables are a prose contract, a command precondition, and a check module whose in-phase validation is shell/node-builtins only — running the module's pure function against in-memory fixtures and asserting the aggregate suite stays green. No test-framework invocation is the natural in-phase validation mechanism. The check module's genuinely-behavioral unit coverage IS warranted, but it is delivered TEST-AFTER by the `test-writer`/`test-reviewer` pair (R-X strict; the Implementer authors zero tests), consistent with `tdd: false` + `test_frameworks: ["node:test"]`. This mirrors `PRPs/plans/completed/validation-suite-phase-5-eval-layer.plan.md`'s `scaffold` choice for the same reason, and keeps the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption clean without under-claiming coverage.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/agents/plan-writer.md` | 293-314 | The canonical byte-exact table-header match + separator-skip + trim + `-`-as-empty parsing idiom the topology parser must mirror |
| 1 | `plugins/relay/commands/relay-worktree.md` | 108-115 | The only existing git-derived root resolution (`git rev-parse --show-toplevel`) and its `FAILED_NOT_A_GIT_REPO` HALT — the shape P6's own codes follow |
| 1 | `plugins/relay/commands/relay-worktree.md` | 148-156, 321-330 | The lettered-options HALT body, and the Final-output named-code registry the contract's own registry mirrors |
| 2 | `plugins/relay/commands/relay-execute.md` | 68, 101-113, 181 | The bare-cwd `target_root` line P6 must sit beside; the command-level restatement of an exact-match header contract; the canonical "no note required; proceed silently" graceful-default branch |
| 2 | `scripts/validate/checks/version-parity.mjs` | 1-22, 60-73, 138-152 | Check-module anatomy: pure `check<Name>({inputs})` returning `{name, ok, findings[]}` that fails closed on missing input, plus the `run<Name>Check()` I/O wrapper |
| 2 | `scripts/validate/index.mjs` | 19-34, 44-61 | The two-line registration contract: one `import` and one entry in the `CHECKS` array |
| 3 | `plugins/relay/resources/redaction-policy.md` | 1-10 | An existing shared `resources/` contract read by reference from a command — the structural sibling of the new module |
| 3 | `PRPs/prds/multi-repo-topology.prd.md` | Decision Gate, AC-1 to AC-5, Architecture Notes | The phase's own acceptance contract and the three-root rationale |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/plan-writer.md:293-314
Find the table whose header line matches **byte-for-byte**:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

If no such header exists in <prd_path>, halt with: ...
Do not attempt fuzzy matching. The canonical header is fixed.

Step 1.2: For each pipe-delimited data row below the separator (|---|...|),
extract the seven cells ... Trim whitespace. Treat `-` as "empty" for
`Parallel`, `Depends`, and `PRP Plan`.
```

```
# SOURCE: plugins/relay/commands/relay-worktree.md:108-115
Run `git rev-parse --show-toplevel`. If the command exits non-zero (cwd is not
inside a git repository):

> FAILED_NOT_A_GIT_REPO: The current working directory is not a git repository.
> /relay-worktree requires a git repository to create a worktree.
> Run `git init` to initialize a repository, or navigate to an existing
> git repository root and re-run /relay-worktree.

Record `repo_root` as the output of `git rev-parse --show-toplevel` (the
absolute path to the repository root).
```

```
# SOURCE: plugins/relay/commands/relay-worktree.md:321-330
- `FAILED_NOT_A_GIT_REPO` — P1: cwd is not a git repository.
- `FAILED_BASE_REF_MISSING` — P2: base ref does not resolve.
- `FAILED_BRANCH_DIVERGENCE` — P3 Case B: worktree registered on wrong branch.
- `FAILED_PATH_OCCUPIED` — P3 Case C: stale directory blocks creation.
- `FAILED_BRANCH_CONFLICT` — P4: branch pre-exists without a registered worktree.
- `FAILED_EMPTY_SLUG` — Parse arguments: sanitized feature name is empty.
```

```
# SOURCE: plugins/relay/commands/relay-execute.md:181
- If `test_frameworks: []` (empty) or file absent: no note required; proceed
  silently. Phases A.3.5 and A.4.5 both self-skip (no declared framework — no
  idiom to author in).
```

```
# SOURCE: scripts/validate/checks/version-parity.mjs:60-73
/**
 * Pure check function — no file I/O. ... A missing or
 * unparseable input is a loud validation FAILURE (a returned finding),
 * never a throw and never a silent pass.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkVersionParity({ pluginJson, changelogHtml }) {
  if (!pluginJson) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing or empty input: ${PLUGIN_JSON_PATH}`, file: PLUGIN_JSON_PATH, line: null }],
    };
  }
```

```
# SOURCE: scripts/validate/index.mjs:19-20,44-46
import { runVersionParityCheck } from './checks/version-parity.mjs';
import { runNativeValidateCheck } from './checks/native-validate.mjs';

const CHECKS = [
  runVersionParityCheck,
  runNativeValidateCheck,
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/repository-topology.md` | CREATE | The single shared contract: table schema + byte-exact header, three-root resolution, `Role`/`Base` semantics, five named HALT codes, and the section-absent compatibility clause. Lives in `resources/` per the 2026-08-05 plugin-owned-resources decision, mirroring `redaction-policy.md`'s read-by-reference pattern. |
| `plugins/relay/commands/relay-execute.md` | UPDATE | Add precondition `P6 — Repository topology resolution`, which adopts the contract inline and records the resolved topology (or `null`). First consumer; proves the contract is usable. |
| `scripts/validate/checks/topology-contract.mjs` | CREATE | Guards the exact-match header against drift between the contract and every command that cites it — the same defect class the 7-column phase-table assertion guards. |
| `scripts/validate/index.mjs` | UPDATE | Register the new check: one `import` line and one `CHECKS` array entry. |
| `docs/context/architecture.md` | UPDATE | Document the contract under a `## Workspace topology contract` heading and point at the resource. |

## NOT Building (Scope Limits)

- **The `Repo` column in the Implementation Phases table** — Phase 4. Without it no phase can name a member, so P6 resolves the topology but nothing yet targets a specific repo.
- **Worktree creation per repo, the `Base` default and the confirmation preflight** — Phase 5. This phase defines `Base`'s column and semantics in the contract schema so the table shape is stable, but resolves and acts on nothing.
- **Migrating the ~90 bare `.worktrees/` literals** — Phase 5, where the repo-qualified path becomes meaningful.
- **Per-repo Decision Gate and `methodology.md` resolution** — Phase 6.
- **Pilar 3 across N repos** — Phase 7.
- **`context-builder` workspace mode and the `docs/decisions.md` entries** — Phase 8.
- **Firing `FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET` from a real phase** — the code and its trigger contract are defined here, but nothing can target a member until Phase 4 ships the `Repo` column. This phase delivers the definition and the refusal rule, not the wiring.
- **Test files for the new check module** — routed through the test pair (see Notes).

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/resources/repository-topology.md

- **SATISFIES**: AC-A2, AC-A3, AC-A4, AC-A5 — this task authors the table schema, the three-root resolution rules, the `reference-only` refusal and the orphaned-gitlink detection those criteria assert.
- **ACTION**: Author the shared topology contract. It MUST contain, in order: (a) a purpose paragraph naming the three roots `project_root`, `context_root` and `repo_root`; (b) the canonical section heading `## Repository topology` that consumers look for in the target's `docs/context/architecture.md`, and the byte-exact table header line `| Repo | Path | Git root | Role | Base |` presented on its own line; (c) parsing rules mirroring the plan-writer anchor — locate by byte-exact header, no fuzzy matching, skip the GFM separator row, trim every cell, treat `-` as empty; (d) column semantics: `Path` is relative to `project_root` and is the member's `context_root`; `Git root` is relative to `project_root` and defaults to `Path` when the cell is `-`; `Role` is `editable` or `reference-only`; `Base` is reserved with default `current` and is not acted upon until Phase 5; (e) the compatibility clause stating that when the `## Repository topology` section is absent the project is single-repo and every consumer behaves exactly as before; (f) five named HALT blockquotes following the relay-worktree shape, for the codes `FAILED_TOPOLOGY_MALFORMED_ROW`, `FAILED_TOPOLOGY_PATH_UNRESOLVED`, `FAILED_TOPOLOGY_NOT_A_GIT_REPO`, `FAILED_TOPOLOGY_ORPHANED_GITLINK` and `FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET`; and (g) a flat named-code registry listing all five with a one-line trigger each. The orphaned-gitlink rule MUST state its detection: a `Git root` whose parent repository lists it via `git ls-files -s` with mode `160000` while no `.gitmodules` entry exists for it.
- **MIRROR**: the byte-exact-header + separator-skip + trim idiom from the `plan-writer.md:293-314` anchor; the HALT blockquote shape from the `relay-worktree.md:108-115` anchor; the flat code registry from the `relay-worktree.md:321-330` anchor; the graceful-default phrasing from the `relay-execute.md:181` anchor.
- **VALIDATE**: `f=plugins/relay/resources/repository-topology.md; if [ "$(grep -c '^| Repo | Path | Git root | Role | Base |$' "$f")" != "1" ]; then echo "FAIL: canonical topology header must appear exactly once in $f"; exit 1; fi; for c in FAILED_TOPOLOGY_MALFORMED_ROW FAILED_TOPOLOGY_PATH_UNRESOLVED FAILED_TOPOLOGY_NOT_A_GIT_REPO FAILED_TOPOLOGY_ORPHANED_GITLINK FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET; do if ! grep -q "$c" "$f"; then echo "FAIL: HALT code $c missing from $f"; exit 1; fi; done; if ! grep -q '160000' "$f"; then echo "FAIL: orphaned-gitlink detection rule must name mode 160000"; exit 1; fi; echo "PASS: topology contract complete"`

### Task 2: CREATE scripts/validate/checks/topology-contract.mjs

- **SATISFIES**: AC-A6 — the check module is the mechanism that criterion asserts, including its negative half (a one-sided header edit must produce a finding).
- **ACTION**: Author the check module following the `version-parity.mjs` anatomy exactly. Export a pure function `checkTopologyContract({ contract, consumers })` where `contract` is the contract file's text (or `null`) and `consumers` is an object mapping consumer file paths to their text. It returns `{ name, ok, findings }` with `name` set to the module constant `CHECK_NAME = 'topology-contract'`. It MUST fail closed: a `null` or empty `contract` returns `ok: false` with a finding, never a throw and never a silent pass. Its invariant: the canonical header line `| Repo | Path | Git root | Role | Base |` appears exactly once in the contract, and every consumer whose text mentions `repository-topology.md` also contains that same header line byte-for-byte — so a header edit in one place and not the other is caught. Also export the thin no-argument wrapper `runTopologyContractCheck()` that reads the real files from disk (returning a finding rather than throwing when one is unreadable) and delegates to the pure function.
- **MIRROR**: the pure-function signature, the fail-closed missing-input branch, the `{name, ok, findings}` return shape and the JSDoc form from the `version-parity.mjs:60-73` anchor.
- **VALIDATE**: `node -e "import('./scripts/validate/checks/topology-contract.mjs').then(m => { if (typeof m.checkTopologyContract !== 'function' || typeof m.runTopologyContractCheck !== 'function') { console.error('FAIL: module must export checkTopologyContract and runTopologyContractCheck'); process.exit(1); } const r = m.checkTopologyContract({ contract: null, consumers: {} }); if (r === undefined || r.ok !== false) { console.error('FAIL: null contract must fail closed, got ok=' + (r \&\& r.ok)); process.exit(1); } if (r.name !== 'topology-contract' || !Array.isArray(r.findings) || r.findings.length === 0) { console.error('FAIL: wrong return shape or no finding on missing input'); process.exit(1); } console.log('PASS: check module runs, fails closed, returns the contract shape'); }).catch(e => { console.error('FAIL: ' + e.message); process.exit(1); })"`

### Task 3: UPDATE scripts/validate/index.mjs

- **SATISFIES**: AC-A6 — registration is what makes the check run in the aggregate suite the criterion measures.
- **ACTION**: Register the new check with exactly two edits: add `import { runTopologyContractCheck } from './checks/topology-contract.mjs';` to the existing import block, and add `runTopologyContractCheck,` as a new entry in the `CHECKS` array. Change nothing else in the file.
- **MIRROR**: the one-import-plus-one-array-entry registration from the `scripts/validate/index.mjs:19-20,44-46` anchor.
- **VALIDATE**: `out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }; printf '%s\n' "$out" | grep -q '^\[PASS\] topology-contract$' || { echo "FAIL: topology-contract check not registered or not passing"; printf '%s\n' "$out"; exit 1; }; printf '%s\n' "$out" | grep -q '17 passed, 0 failed (17 checks run)' || { echo "FAIL: expected 17 registered checks all green"; printf '%s\n' "$out"; exit 1; }; echo "PASS: check registered, suite green at 17"`

### Task 4: UPDATE plugins/relay/commands/relay-execute.md

- **SATISFIES**: AC-A1, AC-A2, AC-A3, AC-A5 — P6 is the consumer that performs the resolution, records `topology = null` on the section-absent path, and surfaces the named HALTs.
- **ACTION**: Add a new precondition section headed exactly `### P6 — Repository topology resolution`, placed immediately after the existing `### P5` section and before the `## Phase A` heading. Its body instructs: Read `${CLAUDE_PLUGIN_ROOT}/resources/repository-topology.md` and execute its resolution protocol inline against `<target_root>/docs/context/architecture.md`. When the `## Repository topology` section is absent, record `topology = null` and proceed silently — no note, no artifact, exactly as the `test_frameworks`-absent branch of P5 does. When present, record the resolved member list with each member's absolute `context_root` and `repo_root`, and surface any of the contract's five named HALT codes verbatim, exiting without performing any phase work. Also amend the `Record target_root as the current working directory.` line in the Parse arguments section with one following sentence stating that `target_root` is the `project_root` — the artifact plane — and that per-member code roots are resolved by P6.
- **MIRROR**: the command-level restatement of an exact-match contract from the `relay-execute.md:101-113` anchor; the silent graceful-default phrasing from the `relay-execute.md:181` anchor.
- **VALIDATE**: `c=plugins/relay/commands/relay-execute.md; p=plugins/relay/resources/repository-topology.md; if ! grep -q '^### P6 — Repository topology resolution$' "$c"; then echo "FAIL: P6 heading absent or not byte-exact in $c"; exit 1; fi; if ! grep -q 'resources/repository-topology\.md' "$c"; then echo "FAIL: P6 does not cite the topology contract"; exit 1; fi; if [ ! -f "$p" ]; then echo "FAIL: cited contract path does not resolve: $p"; exit 1; fi; if ! grep -q 'topology = null' "$c"; then echo "FAIL: section-absent compatibility branch not documented in P6"; exit 1; fi; echo "PASS: P6 wired to a contract that resolves on disk"`

### Task 5: UPDATE docs/context/architecture.md

- **SATISFIES**: AC-A1 — documenting the contract without emitting the declaration heading is what keeps this repository single-repo, which is exactly what that criterion measures.
- **ACTION**: Add a section headed exactly `## Workspace topology contract` documenting, in prose: that relay addresses three roots (`project_root`, `context_root`, `repo_root`); that a workspace declares its members in a `## Repository topology` section of its own `docs/context/architecture.md`; that the declaration is explicit and never detected by scanning; and that this repository is single-repo and therefore declares no such section. It MUST point at `plugins/relay/resources/repository-topology.md` as the authoritative contract. The heading MUST NOT be `## Repository topology` — that literal heading is the multi-repo declaration marker, and emitting it here would declare this single-repo repository as a workspace and break AC-1.
- **MIRROR**: the existing prose-section shape of `docs/context/architecture.md` (its `## Interactivity boundary` and `## PRP artifact paths` sections).
- **VALIDATE**: `a=docs/context/architecture.md; if ! grep -q '^## Workspace topology contract$' "$a"; then echo "FAIL: contract documentation section missing from $a"; exit 1; fi; if grep -q '^## Repository topology$' "$a"; then echo "FAIL: $a must NOT emit the multi-repo declaration heading — it would declare this single-repo project as a workspace"; exit 1; fi; if ! grep -q 'repository-topology\.md' "$a"; then echo "FAIL: documentation does not point at the authoritative contract"; exit 1; fi; out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }; printf '%s\n' "$out" | grep -q '^\[PASS\] path-existence$' || { echo "FAIL: path-existence regressed"; printf '%s\n' "$out"; exit 1; }; echo "PASS: contract documented without declaring a topology"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
node --check scripts/validate/checks/topology-contract.mjs && node --check scripts/validate/index.mjs
```

Both files must parse as valid ESM; `node --check` exits non-zero on a syntax error and its status propagates.

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
f=plugins/relay/resources/repository-topology.md
c=plugins/relay/commands/relay-execute.md
a=docs/context/architecture.md
if [ "$(grep -c '^| Repo | Path | Git root | Role | Base |$' "$f")" != "1" ]; then echo "FAIL: canonical header must appear exactly once in the contract"; exit 1; fi
for code in FAILED_TOPOLOGY_MALFORMED_ROW FAILED_TOPOLOGY_PATH_UNRESOLVED FAILED_TOPOLOGY_NOT_A_GIT_REPO FAILED_TOPOLOGY_ORPHANED_GITLINK FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET; do
  if ! grep -q "$code" "$f"; then echo "FAIL: HALT code $code missing from the contract"; exit 1; fi
  if ! grep -q "$code" "$c"; then echo "FAIL: HALT code $code not surfaced by relay-execute P6"; exit 1; fi
done
if ! grep -q '^### P6 — Repository topology resolution$' "$c"; then echo "FAIL: P6 heading absent or not byte-exact"; exit 1; fi
if grep -q '^## Repository topology$' "$a"; then echo "FAIL: this repository must not declare a topology section"; exit 1; fi
if ! grep -q '^## Workspace topology contract$' "$a"; then echo "FAIL: contract documentation section missing"; exit 1; fi
echo "PASS: content invariants hold"
```

Every branch exits non-zero on violation; no `&& echo PASS || echo FAIL` masking. Every pattern is a literal this plan itself instructs be authored, copied byte-for-byte from the corresponding `**ACTION**` prose.

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '^\[PASS\] topology-contract$' || { echo "FAIL: new check absent or failing"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '17 passed, 0 failed (17 checks run)' || { echo "FAIL: expected 17 checks all green"; printf '%s\n' "$out"; exit 1; }
echo "PASS: full validation suite green with the new check registered"
```

`npm run validate` sets `process.exitCode = 1` on any failing check (`scripts/validate/index.mjs`), so its status propagates. The `[PASS] <name>` and `N passed, M failed (K checks run)` formats are the suite's own observed output, and `topology-contract` is the `CHECK_NAME` this plan authors.

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given this repository, whose `docs/context/architecture.md` carries no `## Repository topology` section, when `/relay-execute`'s P6 runs, then it records `topology = null`, emits no note and writes no artifact, and every subsequent stage resolves paths exactly as before this phase.
- **AC-A2 (PRD AC-2):** Given a `docs/context/architecture.md` containing a `## Repository topology` section whose table header matches `| Repo | Path | Git root | Role | Base |` byte-for-byte with two data rows, when P6 runs, then both members are resolved to absolute `context_root` and `repo_root` paths and held for downstream stages.
- **AC-A3 (PRD AC-3):** Given a member row whose `Path` is `api-escola` and whose `Git root` is `api-escola/apiescola`, when P6 resolves that member, then `context_root` ends in `api-escola` and `repo_root` ends in `api-escola/apiescola`; and given a member row whose `Git root` cell is `-`, then `repo_root` equals `context_root`.
- **AC-A4 (PRD AC-4):** Given a member row whose `Role` cell is `reference-only`, when the contract is consulted, then that member is recorded as non-targetable and `FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET` is the defined refusal for any future attempt to target it.
- **AC-A5 (PRD AC-5):** Given a member whose `Git root` is listed by its parent repository via `git ls-files -s` with mode `160000` while no `.gitmodules` entry exists for it, when P6 resolves that member, then it HALTs with `FAILED_TOPOLOGY_ORPHANED_GITLINK` naming the offending path and the repair options, and performs no phase work.
- **AC-A6 (PRD AC-2):** Given the contract file and every command citing `repository-topology.md`, when `npm run validate` runs, then the `topology-contract` check reports `[PASS]` and the suite reports 17 checks with 0 failures; and given a contract with the canonical header edited in only one of the two places, then the check reports a finding and the suite exits non-zero.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Documenting the contract in this repo's own `architecture.md` accidentally declares this single-repo project as a workspace, breaking AC-1 in the very repository that must prove it | M | H | The documentation heading is `## Workspace topology contract`, deliberately not the `## Repository topology` declaration marker; Task 5's and Level 2's VALIDATE both assert the declaration heading is ABSENT, so the trap fails the build rather than shipping |
| The `path-existence` check's class-2 allowlist covers `${CLAUDE_PLUGIN_ROOT}/{agents,commands,skills,.claude-plugin,scripts}/` and may not cover `resources/`, so a broken contract reference could go unnoticed | L | M | Task 4's VALIDATE asserts the cited path resolves with an explicit `test -f`, independently of whether check D covers the class |
| The new check's own header constant drifts from the contract, making the guard vacuous | M | M | The check compares contract and consumers against each other rather than against a third hardcoded copy; AC-A6's negative half requires a one-sided edit to produce a finding |
| The check module's real unit coverage is deferred to the test pair and could be forgotten | M | M | `phase_type: scaffold` records the deferral explicitly, and the test-after pair runs at Phase A.4.5 of this same orchestrated run |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.

**Why a shared resource rather than inline logic.** Five commands will eventually need root resolution (`relay-execute`, `relay-worktree`, `relay-commit`, `relay-pr`, `relay-approve`). Research confirmed `plugins/relay/resources/` already holds cross-command contracts read by reference — `redaction-policy.md` is read by `relay-worktree.md` Phase B.2, `prd-template.md` by both `relay-execute.md` and `relay-plan.md`. Inlining the parser in each consumer would be the "logic duplication across command files" anti-pattern at five sites.

**Genuinely new ground.** Research found no existing gitlink or submodule handling anywhere in `plugins/relay/` or `scripts/validate/`, and no existing multi-root resolution. Only `relay-worktree.md` P1 validates that a directory is a git repository at all; every other command records the cwd unchecked. This phase therefore extends a single precedent rather than refactoring an established pattern.

**Phase 5 dependency note.** The `Base` column is defined in the contract's schema here so the table shape is stable from the first declaration a user writes, but nothing reads or acts on it until Phase 5. A contract that omitted the column now would force every early adopter to rewrite their table later.

*Generated: 2026-08-31*
*Approved: 2026-08-31*
*Status: IMPLEMENTED*
