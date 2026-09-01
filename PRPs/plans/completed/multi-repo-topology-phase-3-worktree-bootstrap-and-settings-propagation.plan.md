# Feature: Worktree bootstrap and settings propagation (Phase 3 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: adds a settings-propagation step to the worktree command, ships this repository's own bootstrap script pair, and corrects recovery guidance in two files that currently name a fix which cannot work; writes one file under `.claude/` inside a worktree, which the anti-pattern explicitly exempts
- Decisions found:
  - [2026-05-11] relay-worktree D9 — the bootstrap contract is a single project-owned script at `scripts/worktree-bootstrap.sh` / `.ps1`, invoked with a 60-second timeout, its failure non-fatal. This phase ships this repository's own instance of that contract; it does not change the contract
  - [2026-05-11] relay-worktree D1 — the worktree lives at `.worktrees/<feature>/`; propagation targets that path and no other
  - [2026-05-18] Pillar 2 never commits — propagation copies an untracked file into an untracked worktree location; nothing is staged or committed
  - PRP artifacts live under `PRPs/`, never under `.claude/` — the bootstrap LOG stays at `PRPs/reports/<feature>/worktree-bootstrap.log`; only `settings.json` itself lands under `.claude/`
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — `settings.json` is setup configuration, not a pipeline artifact, and `docs/anti-patterns.md` exempts it on exactly that ground. The exemption is named explicitly at the propagation step so a future reader does not read it as a violation
  - "Relying on interactive permission prompts in the autonomous loop" — this phase exists to keep that promise: without the allowlist inside the worktree, every bash command in the loop prompts
  - "Logic duplication across command files" — propagation is performed once by `/relay-worktree`, not repeated by each downstream consumer
- Applicable architectural rules:
  - Three-pillar Pillar 2; the propagation happens at worktree creation, before any implementation runs
  - Writer/reviewer split — `/relay-worktree` is infra-class, no agent and no rubric
  - Graceful degradation: a project with no `settings.json` at its root is warned, never halted
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 3: "Worktree bootstrap and settings propagation" — Goal: Make a freshly created worktree able to run its own test suite. — Success signal: `/relay-test` runs in a fresh worktree without `ABORT_INFRA/missing_settings_json`.

## Summary

`git worktree add` checks out tracked content only, and `.claude/settings.json` is gitignored — so every worktree relay creates comes up without the permission allowlist the autonomous loop depends on. The test runner detects the absence and aborts with `ABORT_INFRA` / `missing_settings_json`. This phase makes `/relay-worktree` copy the file from the repository root into the new worktree at creation time, ships this repository's own `scripts/worktree-bootstrap` pair for the stack-specific half the project owns, and corrects the recovery guidance in two files that currently tell the operator to re-run `context-builder` — a fix that cannot work, because `context-builder` writes to the project root and the file is missing from the worktree.

## User Story

```
As a relay operator whose pipeline just created a fresh worktree
I want that worktree to carry the permission allowlist and its stack's setup
So that the test stage runs instead of aborting on infrastructure that was never propagated
```

## Problem Statement

Three files describe this failure and none of them fixes it. `test-runner.md` aborts with `missing_settings_json` and tells the caller to "re-run context-builder"; `relay-test.md` HALTs pointing at the skill's `*update` mode; the skill writes `settings.json` to the project root, which is exactly where it already exists. Nothing copies it into `.worktrees/<feature>/`, so the documented recovery leaves the operator in the same state. Separately, this repository ships no `scripts/worktree-bootstrap` of its own — the templates live inside the context-builder skill and are only ever emitted into OTHER projects — so relay cannot dogfood the hook it defines.

## Solution Statement

Add one step to `/relay-worktree`'s bootstrap phase, ahead of the project hook: copy `<repo_root>/.claude/settings.json` to `<worktree>/.claude/settings.json` when the source exists, warning and continuing when it does not. Ship `scripts/worktree-bootstrap.sh` and `scripts/worktree-bootstrap.ps1` for this repository, carrying only the stack-specific half — making the Node dependency tree resolvable from inside the worktree. Correct the two recovery messages so they name the propagation step rather than a command that writes to the wrong directory. The universal half belongs to the plugin because every relay worktree needs it in every project; the stack-specific half stays project-owned per D9.

## Metadata

| Key | Value |
|-----|-------|
| Type | Infra command extension + project bootstrap script pair + recovery-guidance correction |
| Complexity | Low–Medium |
| Systems Affected | `plugins/relay/commands/relay-worktree.md`, `scripts/worktree-bootstrap.sh` + `.ps1` (new), `plugins/relay/agents/test-runner.md`, `plugins/relay/commands/relay-test.md`, `scripts/validate/checks/path-existence.mjs` (comment accuracy), `docs/context/architecture.md` |
| Dependencies | None — row 3 of the PRD, `Depends: -`. Independent of Phases 1 and 2; recorded `Parallel: yes` |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 3; AC-12; Phase 3 Details |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** the deliverables are a prompt-contract step, two shell scripts whose own validation is running them, and three prose corrections. In-phase validation is shell only — executing the scripts and asserting the propagation happens — so no test-framework invocation is the natural mechanism. Mirrors the sibling Phase 1 and Phase 2 plans.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/commands/relay-worktree.md` | 243-260 | `## Phase B — Bootstrap hook execution`: where the propagation step is inserted, and the existing hook lookup/timeout/log contract it must precede without disturbing |
| 1 | `plugins/relay/agents/test-runner.md` | 70, 342 | The two places that detect the absence and name a recovery that cannot work |
| 1 | `plugins/relay/commands/relay-test.md` | 78 | The command-level HALT with the same misdirected guidance |
| 2 | `plugins/relay/skills/context-builder/SKILL.md` | 350-420 | Phase 1.8's `.sh` + `.ps1` starter templates — the shape this repository's own pair should follow, and the parity `bootstrap-parity` enforces over the skill |
| 2 | `scripts/validate/checks/path-existence.mjs` | class-1 exclusion comment | It asserts `worktree-bootstrap` names "a script relay's prompts describe emitting into a TARGET project, never this repo" — a claim this phase makes false |
| 3 | `docs/anti-patterns.md` | "Writing pipeline artifacts under `.claude/`" | The exemption that makes propagating `settings.json` legitimate, and the wording the propagation step must cite |
| 3 | `PRPs/prds/multi-repo-topology.prd.md` | AC-12, Phase 3 Details | The acceptance contract |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/test-runner.md:342
- **`.claude/settings.json` absent** → `ABORT_INFRA` reason `missing_settings_json`
  before running anything. The caller is the one that can fix this (re-run
  context-builder).
```

```
# SOURCE: plugins/relay/commands/relay-worktree.md:2
executes scripts/worktree-bootstrap.sh (or .ps1) with a 60-second timeout (D9)
capturing redacted output to PRPs/reports/<feature>/worktree-bootstrap.log
```

```
# SOURCE: plugins/relay/commands/relay-worktree.md:247-251
Check for bootstrap scripts in this order:
1. `scripts/worktree-bootstrap.sh` at the repo root.
2. `scripts/worktree-bootstrap.ps1` at the repo root (Windows fallback).
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-worktree.md` | UPDATE | Add the settings-propagation step ahead of the project hook — the universal half, which every relay worktree needs in every project. |
| `scripts/worktree-bootstrap.sh` | CREATE | This repository's own instance of the D9 project-owned hook, carrying the stack-specific half. |
| `scripts/worktree-bootstrap.ps1` | CREATE | Windows parity for the same hook, matching the pairing discipline `bootstrap-parity` enforces over the skill templates. |
| `plugins/relay/agents/test-runner.md` | UPDATE | Correct the `missing_settings_json` recovery guidance, which today names a command that writes to the wrong directory. |
| `plugins/relay/commands/relay-test.md` | UPDATE | Same correction at the command level. |
| `scripts/validate/checks/path-existence.mjs` | UPDATE | Comment-only: its class-1 exclusion asserts the bootstrap script is "never this repo", which this phase makes false. |
| `docs/context/architecture.md` | UPDATE | Document the split — universal propagation by the plugin, stack-specific setup by the project. |

## NOT Building (Scope Limits)

- **Changing the D9 bootstrap contract** — the lookup order, the 60-second timeout, the redacted log path and the non-fatal failure semantics all stay exactly as recorded on 2026-05-11.
- **Emitting bootstrap templates into target projects** — the context-builder skill already does that at Phase 1.8; this phase adds only this repository's own instance.
- **Propagating any other `.claude/` file** — `settings.local.json` is a per-developer file and is deliberately not propagated; only the versioned allowlist is.
- **Installing dependencies for arbitrary stacks** — the shipped script is Node-specific because this repository is; a generic installer would make relay a dependency orchestrator, which D9 exists to prevent.
- **Per-repo propagation in a workspace** — Phase 5 creates the per-repo worktrees; propagation is written here to target one worktree path and will be invoked once per repo then.
- **Test files** — routed through the test pair; see Notes.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/commands/relay-worktree.md — propagate the permission allowlist

- **SATISFIES**: AC-A1, AC-A3 — this step is the propagation itself, and its graceful-degradation branch is what keeps a project without the file from being halted.
- **ACTION**: In `## Phase B — Bootstrap hook execution`, add a step headed exactly `### Step B.0 — Propagate the permission allowlist` ahead of the existing hook lookup. It instructs: when `<repo_root>/.claude/settings.json` exists, create `<absolute_worktree_path>/.claude/` if needed and copy the file into it; when the source does not exist, emit a warning naming the path and continue — never halt. It must state why the copy is necessary (`git worktree add` checks out tracked content only, and `settings.json` is gitignored, so the worktree comes up without the allowlist the autonomous loop depends on) and why it is not an anti-pattern violation (`docs/anti-patterns.md` governs pipeline artifacts under `.claude/`; `settings.json` is setup configuration and is exempt on that ground). It must also state that `settings.local.json` is deliberately NOT propagated, being per-developer rather than versioned.
- **MIRROR**: the Phase B lookup-order and non-fatal-warning idiom from the `relay-worktree.md` Phase B anchor.
- **VALIDATE**: `w=plugins/relay/commands/relay-worktree.md; if ! grep -q '^### Step B.0 — Propagate the permission allowlist$' "$w"; then echo "FAIL: Step B.0 heading absent or not byte-exact"; exit 1; fi; if ! grep -q 'settings.local.json' "$w"; then echo "FAIL: the settings.local.json exclusion is not stated"; exit 1; fi; if ! grep -q 'setup configuration' "$w"; then echo "FAIL: the anti-pattern exemption is not justified"; exit 1; fi; echo "PASS: propagation step documented"`

### Task 2: CREATE scripts/worktree-bootstrap.sh and scripts/worktree-bootstrap.ps1

- **SATISFIES**: AC-A2 — the pair is this repository's own instance of the D9 hook, and running it is what proves the hook contract is dogfoodable here.
- **ACTION**: Write both scripts. Each takes the absolute worktree path as its first argument, exits non-zero with a clear message when that argument is missing or does not resolve to a directory, and otherwise makes the Node dependency tree resolvable from inside the worktree — verifying with `node -e "require.resolve('ajv')"` (a real devDependency the validate suite imports) and reporting clearly when it is not, rather than silently succeeding. Each prints what it did. Neither installs anything unconditionally, and neither touches `.claude/` — that is Step B.0's job, and duplicating it here would be the logic-duplication anti-pattern. The `.sh` carries `#!/usr/bin/env bash` and `set -euo pipefail`; the `.ps1` is the Windows-parity twin with equivalent behavior and its own error handling.
- **MIRROR**: the argument contract from `relay-worktree.md`'s frontmatter (`scripts/worktree-bootstrap.sh <absolute-worktree-path>`); the `.sh`/`.ps1` pairing discipline `bootstrap-parity` enforces over the skill templates.
- **VALIDATE**: `for f in scripts/worktree-bootstrap.sh scripts/worktree-bootstrap.ps1; do if [ ! -f "$f" ]; then echo "FAIL: $f missing"; exit 1; fi; done; if ! head -1 scripts/worktree-bootstrap.sh | grep -q '^#!/usr/bin/env bash$'; then echo "FAIL: .sh shebang missing or wrong"; exit 1; fi; if bash scripts/worktree-bootstrap.sh 2>/dev/null; then echo "FAIL: the script must exit non-zero when given no worktree path"; exit 1; fi; if ! bash scripts/worktree-bootstrap.sh "$(pwd)" > /dev/null 2>&1; then echo "FAIL: the script must succeed against a real worktree path"; exit 1; fi; echo "PASS: bootstrap pair present, refuses a missing argument, succeeds on a real path"`

### Task 3: UPDATE plugins/relay/agents/test-runner.md and plugins/relay/commands/relay-test.md — correct the recovery guidance

- **SATISFIES**: AC-A4 — a detection whose stated remedy cannot work is worse than no remedy, because it sends the operator to re-run something that changes nothing.
- **ACTION**: In `test-runner.md`, rewrite the `missing_settings_json` recovery sentence so it names the real cause and the real fix: the file is gitignored, so `git worktree add` never carries it in; `/relay-worktree` Step B.0 propagates it at creation time; re-running `context-builder` writes to the project root and does not populate a worktree. Apply the same correction to the corresponding HALT text in `relay-test.md`. Do not change the detection itself, the `ABORT_INFRA` outcome, or the `missing_settings_json` reason token — only the guidance that follows them.
- **MIRROR**: the existing recovery-sentence shape from the `test-runner.md:342` anchor, preserving its bullet structure and its outcome/reason tokens.
- **VALIDATE**: `t=plugins/relay/agents/test-runner.md; r=plugins/relay/commands/relay-test.md; if ! grep -q 'missing_settings_json' "$t"; then echo "FAIL: the reason token was removed from $t"; exit 1; fi; if grep -q 're-run context-builder' "$t"; then echo "FAIL: $t still names a recovery that cannot populate a worktree"; exit 1; fi; if ! grep -q 'Step B.0' "$t"; then echo "FAIL: $t does not name the propagation step"; exit 1; fi; if ! grep -q 'Step B.0' "$r"; then echo "FAIL: $r does not name the propagation step"; exit 1; fi; echo "PASS: recovery guidance now names a fix that works"`

### Task 4: UPDATE scripts/validate/checks/path-existence.mjs — comment accuracy

- **SATISFIES**: AC-A2 — the exclusion's stated reason becomes false the moment this repository ships the script, and a check that reasons from a false premise is the kind of rot that misleads the next editor.
- **ACTION**: Update only the class-1 exclusion comment. It currently justifies excluding `scripts/worktree-bootstrap.sh` / `.ps1` on the ground that they name "a script relay's prompts describe emitting into a TARGET project, never this repo". Replace that justification: the exclusion stands because the reference class is about paths relay's PROMPTS name for target projects, and check P (`bootstrap-parity`) owns the skill-template invariant — but note that this repository now also ships its own instance of the pair, so the "never this repo" clause is no longer true and must not be relied on. Change no executable line: the exclusion behavior stays identical.
- **MIRROR**: the existing comment voice in `path-existence.mjs`'s class enumeration.
- **VALIDATE**: `p=scripts/validate/checks/path-existence.mjs; if grep -q 'never this repo' "$p"; then echo "FAIL: the false justification is still present in $p"; exit 1; fi; if ! grep -q 'worktree-bootstrap' "$p"; then echo "FAIL: the exclusion itself was removed rather than re-justified"; exit 1; fi; out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out" | grep -A3 '^\[FAIL\]'; exit 1; }; printf '%s\n' "$out" | grep -q '^\[PASS\] path-existence$' || { echo "FAIL: path-existence regressed"; exit 1; }; echo "PASS: comment corrected, check behavior unchanged"`

### Task 5: UPDATE docs/context/architecture.md — document the two-halves split

- **SATISFIES**: AC-A1, AC-A2 — the split between plugin-owned and project-owned setup is a cross-cutting rule, and the reason a future reader will not re-merge them.
- **ACTION**: Add a subsection headed exactly `### Worktree setup` inside the existing `## Orchestrator state machine` section, stating: a worktree is a tracked-content-only checkout, so anything gitignored is absent from it; relay therefore splits setup in two. The UNIVERSAL half — propagating `.claude/settings.json` so the autonomous loop's permission allowlist exists inside the worktree — belongs to `/relay-worktree` Step B.0, because every relay worktree needs it in every project and a project-owned script would reintroduce the "forgot to check" ambiguity. The STACK-SPECIFIC half — dependencies, env files, ports, container project names — stays in the project-owned `scripts/worktree-bootstrap.sh` / `.ps1` hook per D9, invoked with a 60-second timeout and non-fatal on failure. Note that `settings.local.json` is deliberately not propagated. Do NOT create a new top-level section.
- **MIRROR**: the subsection shape of the `### Per-phase diff base` subsection this feature's Phase 2 added to the same section.
- **VALIDATE**: `a=docs/context/architecture.md; if ! grep -q '^### Worktree setup$' "$a"; then echo "FAIL: subsection missing from $a"; exit 1; fi; if ! grep -q 'settings.local.json' "$a"; then echo "FAIL: the non-propagated file is not named"; exit 1; fi; if ! grep -q 'worktree-bootstrap' "$a"; then echo "FAIL: the project-owned half is not named"; exit 1; fi; echo "PASS: two-halves split documented"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
bash -n scripts/worktree-bootstrap.sh || { echo "FAIL: .sh does not parse"; exit 1; }
node -e "const fs=require('fs');for(const p of ['plugins/relay/commands/relay-worktree.md','plugins/relay/agents/test-runner.md','plugins/relay/commands/relay-test.md','docs/context/architecture.md']){const t=fs.readFileSync(p,'utf8');if(!t.trim()){console.error('FAIL: empty '+p);process.exit(1)}if((t.match(/^\x60\x60\x60/gm)||[]).length%2!==0){console.error('FAIL: unbalanced fences in '+p);process.exit(1)}}console.log('PASS: shell parses, markdown fences balanced')"
```

`bash -n` parses the script without executing it and exits non-zero on a syntax error; the node pass asserts every touched markdown file is non-empty with balanced fences.

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
w=plugins/relay/commands/relay-worktree.md
t=plugins/relay/agents/test-runner.md
r=plugins/relay/commands/relay-test.md
a=docs/context/architecture.md
p=scripts/validate/checks/path-existence.mjs
if ! grep -q '^### Step B.0 — Propagate the permission allowlist$' "$w"; then echo "FAIL: Step B.0 absent"; exit 1; fi
if ! grep -q 'setup configuration' "$w"; then echo "FAIL: anti-pattern exemption unjustified"; exit 1; fi
if ! grep -q 'settings.local.json' "$w"; then echo "FAIL: settings.local.json exclusion unstated"; exit 1; fi
if grep -q 're-run context-builder' "$t"; then echo "FAIL: stale recovery guidance in $t"; exit 1; fi
if ! grep -q 'missing_settings_json' "$t"; then echo "FAIL: reason token removed from $t"; exit 1; fi
if ! grep -q 'Step B.0' "$t"; then echo "FAIL: $t does not name the propagation step"; exit 1; fi
if ! grep -q 'Step B.0' "$r"; then echo "FAIL: $r does not name the propagation step"; exit 1; fi
if grep -q 'never this repo' "$p"; then echo "FAIL: false justification still in $p"; exit 1; fi
if ! grep -q '^### Worktree setup$' "$a"; then echo "FAIL: architecture subsection absent"; exit 1; fi
echo "PASS: content invariants hold"
```

Every branch exits non-zero on violation. Every pattern is a literal this plan instructs be authored or removed, copied byte-for-byte from the corresponding `**ACTION**` prose.

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '17 passed, 0 failed (17 checks run)' || { echo "FAIL: expected 17 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }
bash scripts/worktree-bootstrap.sh 2>/dev/null && { echo "FAIL: bootstrap accepted a missing worktree path"; exit 1; }
bash scripts/worktree-bootstrap.sh "$(pwd)" > /dev/null 2>&1 || { echo "FAIL: bootstrap failed against a real worktree path"; exit 1; }
node -e "require.resolve('ajv')" || { echo "FAIL: the dependency the bootstrap verifies is not actually resolvable"; exit 1; }
echo "PASS: suite green and the bootstrap hook runs end to end"
```

The last three commands exercise the shipped script itself — refusing a missing argument, succeeding against a real path, and confirming the dependency it checks for genuinely resolves — rather than asserting that the script's text was written.

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** Given a repository whose root carries `.claude/settings.json`, when `/relay-worktree` creates a worktree, then Step B.0 copies that file to `<worktree>/.claude/settings.json` before the project hook runs, and `/relay-test` in that worktree does not abort with `ABORT_INFRA` / `missing_settings_json`.
- **AC-A2 (PRD AC-12):** Given this repository after this phase, when `scripts/worktree-bootstrap.sh` is invoked with no argument, then it exits non-zero with a message naming the missing worktree path; and when invoked with a real directory, then it exits zero having confirmed the Node dependency tree resolves; and `scripts/worktree-bootstrap.ps1` exists as its Windows-parity twin.
- **AC-A3 (PRD AC-12):** Given a repository with no `.claude/settings.json` at its root, when `/relay-worktree` runs Step B.0, then it emits a warning naming the absent path and continues to the project hook — worktree creation remains the load-bearing outcome and is never halted by a missing allowlist.
- **AC-A4 (PRD AC-12):** Given `test-runner.md` and `relay-test.md` after this phase, when either is searched for the string `re-run context-builder` as the remedy for `missing_settings_json`, then no occurrence remains, and both name `/relay-worktree` Step B.0 as the mechanism that populates a worktree.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Copying a file into `.claude/` is read as an anti-pattern violation by a future reviewer | M | L | The exemption is stated inline at the step and again in the architecture subsection, citing that the anti-pattern governs pipeline artifacts and `settings.json` is setup configuration |
| Propagating `settings.local.json` alongside would leak per-developer permissions into a shared worktree | L | M | Explicitly excluded in the step's own text, asserted by Task 1's VALIDATE and by Level 2 |
| The shipped bootstrap script is Node-specific and misread as a template for other stacks | M | L | The script is this repository's own D9 instance; the skill's Phase 1.8 templates remain the thing emitted into other projects, and the architecture subsection names the split |
| Correcting the recovery guidance is mistaken for changing the detection | L | M | Task 3's ACTION forbids touching the detection, the `ABORT_INFRA` outcome or the reason token, and its VALIDATE asserts `missing_settings_json` still present |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task above and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.

**Why the universal half is not project-owned.** D9 put the bootstrap hook in the project because per-worktree environment setup is stack-specific and relay cannot become a Docker or dependency orchestrator. Propagating the permission allowlist is the opposite kind of thing: it is identical in every project, it is a precondition of the autonomous loop rather than of any particular stack, and leaving it to a project-owned script reintroduces exactly the "forgot to check" versus "doesn't apply" ambiguity the declaration model exists to prevent. Splitting the two halves keeps D9's reasoning intact while closing the gap it left.

**The recovery guidance was worse than missing.** `test-runner.md` and `relay-test.md` both detect the absence correctly and then name `context-builder` as the fix. The skill writes `settings.json` to the project root — where it already exists — so an operator following the guidance changes nothing and sees the identical abort on the next run. A remedy that cannot work costs more than no remedy, because it consumes a debugging cycle before the operator distrusts it.

**Observed during this very run.** Phases 1 and 2 of this PRD were executed in a worktree whose `settings.json` had to be copied in by hand before the test stage would run, and whose `orchestrator-run.json` records that compensation under `operator_compensation`. This phase removes the need for it.

*Generated: 2026-08-31*
*Approved: 2026-08-31*
*Status: IMPLEMENTED*
