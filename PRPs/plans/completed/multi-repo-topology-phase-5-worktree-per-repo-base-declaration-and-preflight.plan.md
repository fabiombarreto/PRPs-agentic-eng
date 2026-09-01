# Feature: Worktree per repo, base declaration and preflight (Phase 5 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: creates one worktree per declared member instead of one per feature; makes the `Base` column live and inverts the recorded D11 base-ref chain for declared members; adds the pipeline's fourth human-confirmation point, placed before the autonomous loop; migrates the bare `.worktrees/` path literals in the two commands this phase owns
- Decisions found:
  - [2026-05-11] relay-worktree D1/D2/D4/D9/D10 — path, shell-out primitive, `--porcelain` idempotency, bootstrap contract and `feature/` prefix are all PRESERVED and merely applied once per member
  - [2026-05-11] relay-worktree **D11 — CHANGED for declared members.** Its chain (`--base` → `origin/main` → `origin/master` → `HEAD`) puts the current checkout last, so it is never reached when `origin/main` exists. For a declared member the `Base` cell governs, defaulting to `current`. The chain is preserved unchanged for every project with no topology declaration
  - [2026-07-27] Orchestrator resumability + `/relay-visual-approve` — relay's third interactivity-boundary extension, and the recorded reasoning that a synchronous dialogue only works inside a single unbroken interactive turn. That is why the base confirmation is a PRECONDITION, before the loop, and not a step inside it
  - Phase 1 of this feature — the topology registry and the three roots this phase creates worktrees against
  - [2026-05-18] Pillar 2 never commits — worktree creation and base recording introduce no commit
- Applicable anti-patterns:
  - "Relying on interactive permission prompts in the autonomous loop" — the confirmation runs BEFORE Phase A begins and resolves every member in one interaction; the loop itself stays prompt-free
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — `Base` is read from the declaration only, never inferred from branch names or remote layout
  - "Writing pipeline artifacts under `.claude/`" — the resolved-base record goes to `PRPs/reports/<feature>/`
- Applicable architectural rules:
  - Interactivity boundary — this phase adds a fourth confirmation point and is the first to do so as a precondition; `docs/decisions.md` records it in Phase 8
  - Graceful degradation: a project with no topology declaration keeps its current worktree behavior AND its current base resolution, byte-for-byte
  - Writer/reviewer split — `/relay-worktree` stays infra-class
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 5: "Worktree per repo, base declaration and preflight" — Goal: Real isolation in every participating repo, from a base the operator chose and confirmed. — Success signal: `git worktree list --porcelain` shows the expected worktree in each member; a member on `dev` with `origin/main` present branches from `dev`; the loop itself never prompts.

## Summary

Phase 1 made members addressable and Phase 4 let a phase name one. This phase acts on both: `/relay-worktree` gains a repo context so it creates `<repo_root>/.worktrees/<feature>/` for a named member rather than always for the cwd, and its base resolution consults the member's declared `Base` — default `current`, the currently checked-out `HEAD` — ahead of the D11 chain. The resolved ref and SHA are recorded so Phase 7 can derive the PR base from a fact instead of a heuristic. `/relay-execute` gains a precondition that resolves and displays every participating member's base and asks for one confirmation before the orchestration loop starts, and its per-phase worktree sub-flow creates a worktree in the phase's own repo. The bare `.worktrees/` literals in these two commands become repo-qualified.

## User Story

```
As a relay operator about to run a feature across several repositories
I want each repo's worktree cut from the line I am actually working on, confirmed once up front
So that no phase silently builds on a branch I never chose
```

## Problem Statement

`/relay-worktree` resolves one repo root from the cwd and creates one worktree there; in a workspace, that is the wrong directory or no repository at all. Its base chain reaches the current checkout only when both `origin/main` and `origin/master` fail to resolve, so in practice it never does — reproduced on `sisalfa/AlfaFront`, checked out on `dev` with `origin/main` present, where the worktree would be cut from `main`. And nothing records which base was actually used, so `/relay-pr` later guesses the PR target with a `merge-base --fork-point` heuristic that can disagree with it.

## Solution Statement

Give `/relay-worktree` an optional repo context: when supplied, it resolves `repo_root` from the topology entry rather than from the cwd, and creates the worktree there. Make the `Base` column live: for a declared member, `current` (or an empty cell) resolves to that member's checked-out `HEAD`, and any other value is a named ref verified with `git rev-parse --verify`; the D11 chain remains untouched as the resolution for projects with no topology. Record the resolved ref name and SHA per member to `PRPs/reports/<feature>/worktree-bases.json`. Add precondition P7 to `/relay-execute`: for a declared workspace, resolve every participating member's base, present one table, and require one explicit confirmation before Phase A begins — halting per-member and before any worktree exists when a base does not resolve.

## Metadata

| Key | Value |
|-----|-------|
| Type | Infra command generalization + live column semantics + human-confirmation precondition |
| Complexity | High |
| Systems Affected | `plugins/relay/commands/relay-worktree.md`, `plugins/relay/commands/relay-execute.md`, `plugins/relay/resources/repository-topology.md`, `plugins/relay/resources/settings-allowlist.md`, `docs/context/architecture.md` |
| Dependencies | Phase 1 (`complete`) — the topology registry and three roots; Phase 4 (`complete`) — the `Repo` column that names a phase's member |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 5; AC-1, AC-6, AC-7, AC-8; Phase 5 Details |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** the deliverables are prompt-contract changes to two commands plus two resource updates. In-phase validation is grep plus real git plumbing — resolving a base against this repository and confirming the recorded semantics — with no runtime module to unit-test. Mirrors the sibling phases.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/commands/relay-worktree.md` | 108-160, 192-241 | P1's cwd-derived `repo_root`, P2's D11 chain, and Phase A's creation step with its `absolute_worktree_path` record — the three places the repo context changes |
| 1 | `plugins/relay/resources/repository-topology.md` | Base column row, resolution protocol | The `Base` semantics this phase makes live, and the resolved-member shape Phase 1 defined |
| 1 | `plugins/relay/commands/relay-execute.md` | P6, 469-495 | The topology resolution P7 builds on, and the per-phase worktree sub-flow that becomes per-repo |
| 2 | `plugins/relay/resources/settings-allowlist.md` | worktree patterns | The allowlist entries that must admit `git -C <path> worktree add`, or the loop prompts |
| 2 | `plugins/relay/commands/relay-execute.md` | P5 | The precondition immediately before the new P7, and the graceful "proceed silently" idiom for an absent declaration |
| 3 | `docs/context/architecture.md` | Interactivity boundary | The three sanctioned extensions this phase adds a fourth to |
| 3 | `PRPs/prds/multi-repo-topology.prd.md` | AC-1, AC-6, AC-7, AC-8 | The acceptance contract, including AC-1's byte-for-byte single-repo guarantee |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-worktree.md:127-132
2. Otherwise, try each in order until one resolves (exit code 0):
   - `git rev-parse --verify origin/main`
   - `git rev-parse --verify origin/master`
   - `git rev-parse --verify HEAD`
```

```
# SOURCE: plugins/relay/commands/relay-worktree.md:239
Record `absolute_worktree_path = <repo_root>/.worktrees/<feature>/` for use in Phase B.
```

```
# SOURCE: plugins/relay/commands/relay-execute.md:181
- If `test_frameworks: []` (empty) or file absent: no note required; proceed
  silently. Phases A.3.5 and A.4.5 both self-skip (no declared framework — no
  idiom to author in).
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-worktree.md` | UPDATE | Optional repo context; `Base`-first resolution for a declared member with the D11 chain preserved as the no-topology path; resolved-base record; repo-qualified paths. |
| `plugins/relay/commands/relay-execute.md` | UPDATE | New precondition P7 (base preflight + one confirmation); per-repo worktree creation in the A.3.3 sub-flow. |
| `plugins/relay/resources/repository-topology.md` | UPDATE | `Base` stops being reserved and gains its resolution rules and its own HALT code. |
| `plugins/relay/resources/settings-allowlist.md` | UPDATE | Admit the repo-qualified `git -C <path> worktree add` form, or every creation prompts. |
| `docs/context/architecture.md` | UPDATE | Document per-repo worktrees, the base contract, and the fourth interactivity point. |
| `scripts/validate/checks/topology-contract.mjs` | UPDATE | **Amendment, discovered at implement time.** The check shipped in Phase 1 held any file NAMING the contract to carrying its canonical header. Phase 5 makes `/relay-worktree` cite the contract solely to reference `FAILED_TOPOLOGY_BASE_UNRESOLVED`, without ever parsing the table — so the check demanded a header that would serve no purpose there. Its trigger is narrowed to files that LOCATE the table (the exact section heading), which is what the invariant was always about. |
| `scripts/validate/checks/topology-contract.test.mjs` | UPDATE | **Test-pair task, amendment.** Fixtures and the line-number assertion follow the narrowed trigger; the out-of-scope case is strengthened to the real one — a file citing a HALT code without locating the table. |
| `documentation/reference/validation-checks.html` | UPDATE | The check row and detail section described the old, broader trigger. |

## NOT Building (Scope Limits)

- **Changing base resolution for projects with no topology declaration.** AC-1 guarantees a single-repo project resolves paths, roots AND base exactly as before. The D11 chain therefore stays intact on that path. **This leaves F7 live for plain single-repo projects** — a project on `dev` with `origin/main` present still gets a worktree cut from `main`. That exposure is deliberate here because AC-1 forbids the change, and it is recorded as a residual gap in Notes rather than silently fixed or silently ignored.
- **Migrating the Pillar 3 literals** — `relay-commit.md` (18), `relay-pr.md` (20) and `relay-approve.md` (10) are Phase 7's scope, which depends on this phase. This phase migrates only the 32 literals in the two commands it owns.
- **The `context-builder` SKILL.md literals (11)** — Phase 8's workspace mode.
- **A validate check forbidding bare `.worktrees/` literals** — it cannot pass until Phase 7 finishes the migration, so it lands there.
- **`docs/decisions.md` entries for the D11 change and the new confirmation point** — Phase 8 owns the decision records; this phase implements what they will describe.
- **Consuming the recorded base in `/relay-pr`** — Phase 7.
- **Test files** — routed through the test pair; see Notes.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/resources/repository-topology.md — make `Base` live

- **SATISFIES**: AC-A1, AC-A4 — the contract owns the column's semantics and its HALT, so the rules land here before any consumer reads them.
- **ACTION**: Replace the `Base` row's "**Reserved in this phase:**" clause with its live semantics: `current` or an empty cell resolves to the member's currently checked-out `HEAD` (`git -C <repo_root> rev-parse HEAD`), which is also `git worktree add`'s own documented default when no commit-ish is given; any other value is a named ref, resolved with `git -C <repo_root> rev-parse --verify <value>`. Add a `FAILED_TOPOLOGY_BASE_UNRESOLVED` HALT blockquote following the file's existing shape, naming the member, the declared value and the repo root, and add it to the named-code registry. Extend the resolution protocol's recorded member shape so each entry carries the RESOLVED base ref name and SHA alongside the raw declaration.
- **MIRROR**: the HALT blockquote shape and the named-code registry this file already establishes.
- **VALIDATE**: `f=plugins/relay/resources/repository-topology.md; if grep -q 'Reserved in this phase' "$f"; then echo "FAIL: Base is still marked reserved"; exit 1; fi; if ! grep -q 'FAILED_TOPOLOGY_BASE_UNRESOLVED' "$f"; then echo "FAIL: the base HALT code is absent"; exit 1; fi; if [ "$(grep -c 'FAILED_TOPOLOGY_BASE_UNRESOLVED' "$f")" -lt 2 ]; then echo "FAIL: the code must appear in both its blockquote and the registry"; exit 1; fi; if ! grep -q 'rev-parse --verify' "$f"; then echo "FAIL: named-ref resolution is not specified"; exit 1; fi; echo "PASS: Base column is live"`

### Task 2: UPDATE plugins/relay/commands/relay-worktree.md — repo context and repo-qualified paths

- **SATISFIES**: AC-A2 — creating the worktree in the member's own repository is the isolation this whole feature exists for.
- **ACTION**: Add an optional `repo` input to the command's context: when supplied by an invoker, `repo_root` comes from that member's resolved topology entry and P1's `git rev-parse --show-toplevel` is skipped; when absent, P1 runs exactly as today against the cwd. Change every `.worktrees/<feature>/` occurrence that names a filesystem location or a git invocation to the repo-qualified form — `<repo_root>/.worktrees/<feature>/` for paths, and `git -C <repo_root> worktree ...` for commands — so no bare relative literal remains outside prose that discusses the convention itself. State that with no `repo` supplied the resolved `repo_root` is the cwd's toplevel, making the qualified form identical to today's behavior for a single-repo project.
- **MIRROR**: the `absolute_worktree_path = <repo_root>/.worktrees/<feature>/` record from the `relay-worktree.md:239` anchor — the one place that already qualifies the path.
- **VALIDATE**: `w=plugins/relay/commands/relay-worktree.md; if ! grep -q 'git -C <repo_root> worktree' "$w"; then echo "FAIL: git invocations are not repo-qualified"; exit 1; fi; n=$(grep -c 'git worktree add \.worktrees/' "$w" || true); if [ "$n" != "0" ]; then echo "FAIL: $n bare worktree-add literal(s) remain"; exit 1; fi; if ! grep -q "optional .repo. input" "$w"; then echo "FAIL: the repo context input is not documented"; exit 1; fi; echo "PASS: relay-worktree is repo-aware and repo-qualified"`

### Task 3: UPDATE plugins/relay/commands/relay-worktree.md — Base-first resolution and the recorded base

- **SATISFIES**: AC-A3, AC-A4, AC-A5 — the base a worktree is cut from, the refusal when it does not resolve, and the record Phase 7 will consume.
- **ACTION**: In P2, add a new first priority AFTER the existing `--base` override: when a `repo` context was supplied, consult that member's declared `Base`. `current` or empty resolves to `git -C <repo_root> rev-parse HEAD`; any other value resolves with `git -C <repo_root> rev-parse --verify <value>`, and a non-zero exit raises `FAILED_TOPOLOGY_BASE_UNRESOLVED` from the contract. State explicitly that this INVERTS the recorded D11 ordering for declared members — `current` first rather than last — and why: `git worktree add`'s own documented behavior with no commit-ish is to branch from the current checkout, so D11's `origin/main`-first chain overrode git's default, and a member checked out on `dev` with `origin/main` present would otherwise be cut from `main`. State equally explicitly that the D11 chain is UNCHANGED when no `repo` context was supplied, preserving AC-1. Then, after creation, record the resolved ref name and its SHA for this member to `PRPs/reports/<feature>/worktree-bases.json`.
- **MIRROR**: the priority-ordered chain prose from the `relay-worktree.md:127-132` anchor.
- **VALIDATE**: `w=plugins/relay/commands/relay-worktree.md; if ! grep -q 'worktree-bases.json' "$w"; then echo "FAIL: the resolved base is not recorded"; exit 1; fi; if ! grep -q 'FAILED_TOPOLOGY_BASE_UNRESOLVED' "$w"; then echo "FAIL: the unresolvable-base HALT is not surfaced"; exit 1; fi; if ! grep -q 'INVERTS' "$w"; then echo "FAIL: the D11 inversion is not stated"; exit 1; fi; if ! grep -q 'rev-parse --verify origin/main' "$w"; then echo "FAIL: the D11 chain was removed rather than preserved for the no-topology path"; exit 1; fi; echo "PASS: Base-first for members, D11 intact otherwise, base recorded"`

### Task 4: UPDATE plugins/relay/commands/relay-execute.md — precondition P7, the base preflight

- **SATISFIES**: AC-A6, AC-A7 — one confirmation before the loop, and a halt before any worktree exists when a base does not resolve.
- **ACTION**: Add a precondition headed exactly `### P7 — Base preflight and confirmation`, placed after P6 and before `## Phase A`. When `topology = null`, it is a complete no-op: proceed silently, emit nothing, ask nothing — this is what preserves AC-1 for single-repo projects. When a topology is declared, resolve each `editable` member's base per the contract and emit ONE table with the columns `Repo`, declared `Base`, resolved ref, current branch and SHA, then require one explicit confirmation before Phase A begins. On a negative or absent reply, exit having created no worktree and written no artifact. If any member's base fails to resolve, HALT with `FAILED_TOPOLOGY_BASE_UNRESOLVED` naming that member — before any confirmation is requested and before any worktree exists. State why this sits in the preconditions and not inside the loop: the loop runs long and unattended, and a synchronous dialogue only works inside a single unbroken interactive turn — the recorded reasoning behind relay's third interactivity extension. Note that this is the pipeline's FOURTH human-confirmation point.
- **MIRROR**: the "no note required; proceed silently" graceful-default idiom from the `relay-execute.md:181` anchor.
- **VALIDATE**: `e=plugins/relay/commands/relay-execute.md; if ! grep -q '^### P7 — Base preflight and confirmation$' "$e"; then echo "FAIL: P7 heading absent or not byte-exact"; exit 1; fi; if ! grep -q 'topology = null' "$e"; then echo "FAIL: the single-repo no-op branch is not specified"; exit 1; fi; if ! grep -q 'FAILED_TOPOLOGY_BASE_UNRESOLVED' "$e"; then echo "FAIL: the unresolvable-base halt is not surfaced by P7"; exit 1; fi; if ! grep -qi 'fourth' "$e"; then echo "FAIL: the interactivity extension is not named as the fourth"; exit 1; fi; echo "PASS: P7 preflight wired"`

### Task 5: UPDATE plugins/relay/commands/relay-execute.md — per-repo worktree creation

- **SATISFIES**: AC-A2 — a phase must get its worktree in the repository its `Repo` cell names.
- **ACTION**: In `### Phase A.3.3 — Per-phase worktree creation sub-flow`, make Step A.3.3.1 pass the current phase's member as the `repo` context to the adopted `/relay-worktree` protocol: resolve the phase row's `Repo` cell against the recorded topology, and pass that member's entry. When the cell is empty or `topology = null`, pass no `repo` context — the adopted protocol then behaves exactly as today. When the cell names a `reference-only` member, HALT with `FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET` from the contract, naming the phase and the member; this is the first place that code can actually fire, since Phase 4 shipped the column it reads. Update Step A.3.3.2's recorded outcome so `worktree_path` carries the repo-qualified path rather than the bare literal.
- **MIRROR**: the execution-context bullet idiom Step A.3.3.1 already uses (`feature`, `target_root`).
- **VALIDATE**: `e=plugins/relay/commands/relay-execute.md; n=$(grep -c 'FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET' "$e"); if [ "$n" -lt 2 ]; then echo "FAIL: the reference-only refusal appears $n time(s) — P6 already surfaces it, so the worktree sub-flow must add a second, discriminating occurrence"; exit 1; fi; if ! grep -q 'repo_root>/\.worktrees/' "$e"; then echo "FAIL: the recorded worktree path is not repo-qualified"; exit 1; fi; if ! grep -q '`repo` context' "$e"; then echo "FAIL: the repo context is not passed to the adopted protocol"; exit 1; fi; echo "PASS: per-repo worktree creation wired"`

### Task 6: UPDATE plugins/relay/resources/settings-allowlist.md and docs/context/architecture.md

- **SATISFIES**: AC-A2, AC-A6 — an allowlist that does not admit the repo-qualified form makes every creation prompt, which would defeat the autonomy this phase depends on; and the architecture record is where the fourth interactivity point is declared.
- **ACTION**: In `settings-allowlist.md`, extend the worktree entries so the repo-qualified `git -C <path> worktree add` and `git -C <path> worktree list` forms are admitted alongside the existing ones, keeping the invariant denylist untouched. In `docs/context/architecture.md`, add a subsection headed exactly `### Per-repo worktrees and the base preflight` inside the existing `## Orchestrator state machine` section, stating: a worktree is created in each participating member's own repository at `<repo_root>/.worktrees/<feature>/`; the member's declared `Base` governs, defaulting to `current`, which restores `git worktree add`'s own documented behavior that D11 had overridden; the resolved ref and SHA are recorded to `PRPs/reports/<feature>/worktree-bases.json`; and `/relay-execute` P7 confirms every member's base once, before the autonomous loop, making it the pipeline's fourth human-confirmation point and the first that is a precondition rather than a resumable halt. State that a project with no topology declaration keeps D11 and gets no preflight.
- **MIRROR**: the subsection shape of `### Per-phase diff base`, `### Worktree setup` and `### The Repo column`, which this feature's earlier phases added to the same section.
- **VALIDATE**: `s=plugins/relay/resources/settings-allowlist.md; a=docs/context/architecture.md; if ! grep -q 'git -C' "$s"; then echo "FAIL: the allowlist does not admit the repo-qualified form"; exit 1; fi; if ! grep -q '^### Per-repo worktrees and the base preflight$' "$a"; then echo "FAIL: architecture subsection absent"; exit 1; fi; if ! grep -q 'worktree-bases.json' "$a"; then echo "FAIL: the recorded artifact is not documented"; exit 1; fi; if ! grep -qi 'fourth' "$a"; then echo "FAIL: the fourth interactivity point is not declared"; exit 1; fi; echo "PASS: allowlist and architecture updated"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
node -e "const fs=require('fs');for(const p of ['plugins/relay/commands/relay-worktree.md','plugins/relay/commands/relay-execute.md','plugins/relay/resources/repository-topology.md','plugins/relay/resources/settings-allowlist.md','docs/context/architecture.md']){const t=fs.readFileSync(p,'utf8');if(!t.trim()){console.error('FAIL: empty '+p);process.exit(1)}if((t.match(/^\x60\x60\x60/gm)||[]).length%2!==0){console.error('FAIL: unbalanced fences in '+p);process.exit(1)}}console.log('PASS: markdown fences balanced')"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
w=plugins/relay/commands/relay-worktree.md
e=plugins/relay/commands/relay-execute.md
f=plugins/relay/resources/repository-topology.md
a=docs/context/architecture.md
if grep -q 'Reserved in this phase' "$f"; then echo "FAIL: Base still reserved"; exit 1; fi
if [ "$(grep -c 'FAILED_TOPOLOGY_BASE_UNRESOLVED' "$f")" -lt 2 ]; then echo "FAIL: base HALT not in both blockquote and registry"; exit 1; fi
if ! grep -q 'git -C <repo_root> worktree' "$w"; then echo "FAIL: git invocations not repo-qualified"; exit 1; fi
if [ "$(grep -c 'git worktree add \.worktrees/' "$w" || true)" != "0" ]; then echo "FAIL: bare worktree-add literal remains"; exit 1; fi
if ! grep -q 'worktree-bases.json' "$w"; then echo "FAIL: resolved base not recorded"; exit 1; fi
if ! grep -q 'rev-parse --verify origin/main' "$w"; then echo "FAIL: D11 chain removed instead of preserved"; exit 1; fi
if ! grep -q '^### P7 — Base preflight and confirmation$' "$e"; then echo "FAIL: P7 absent"; exit 1; fi
if [ "$(grep -c 'FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET' "$e")" -lt 2 ]; then echo "FAIL: reference-only refusal not added by the worktree sub-flow"; exit 1; fi
if ! grep -q '^### Per-repo worktrees and the base preflight$' "$a"; then echo "FAIL: architecture subsection absent"; exit 1; fi
echo "PASS: content invariants hold"
```

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '17 passed, 0 failed (17 checks run)' || { echo "FAIL: expected 17 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }
head_sha="$(git rev-parse HEAD)" || { echo "FAIL: cannot resolve HEAD"; exit 1; }
current_sha="$(git rev-parse HEAD)"
[ "$head_sha" = "$current_sha" ] || { echo "FAIL: 'current' does not resolve to HEAD"; exit 1; }
git rev-parse --verify "$head_sha" > /dev/null || { echo "FAIL: a named ref does not verify"; exit 1; }
git rev-parse --verify definitely-not-a-ref > /dev/null 2>&1 && { echo "FAIL: an invalid ref verified, so the HALT branch is unreachable"; exit 1; }
echo "PASS: suite green and both base-resolution paths behave as the contract states"
```

The last four commands exercise the actual git plumbing the contract specifies — that `current` resolves to `HEAD`, that a named ref verifies, and crucially that an invalid ref does NOT verify, so `FAILED_TOPOLOGY_BASE_UNRESOLVED` is reachable rather than dead prose.

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** Given a topology entry whose `Base` cell is `current` or empty, when the contract resolves it, then the base is `git -C <repo_root> rev-parse HEAD` — the member's currently checked-out commit — and given any other value, then it is resolved with `git -C <repo_root> rev-parse --verify`.
- **AC-A2 (PRD AC-7):** Given a phase whose `Repo` cell names a declared `editable` member, when the worktree sub-flow runs, then the worktree is created at that member's `<repo_root>/.worktrees/<feature>/` and the recorded `worktree_path` is repo-qualified; and given a cell naming a `reference-only` member, then the run HALTs with `FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET` naming the phase and the member, creating no worktree.
- **AC-A3 (PRD AC-6):** Given a declared member checked out on `dev` while `origin/main` also resolves, when its base is resolved with `Base: current`, then the result is `dev`'s `HEAD` — not `origin/main`. Given a project with NO topology declaration, then the D11 chain resolves exactly as before this phase, preserving AC-1.
- **AC-A4 (PRD AC-8):** Given a member whose declared `Base` does not resolve under `git rev-parse --verify`, when P7 runs, then it HALTs with `FAILED_TOPOLOGY_BASE_UNRESOLVED` naming that member, before any confirmation is requested and with no worktree created in any member.
- **AC-A5 (PRD AC-6):** Given a worktree created for a member, when creation completes, then the resolved base ref name and its SHA are recorded for that member in `PRPs/reports/<feature>/worktree-bases.json`.
- **AC-A6 (PRD AC-7):** Given a workspace with several participating members, when `/relay-execute` starts, then P7 emits ONE table naming each member's declared base, resolved ref, current branch and SHA and requires ONE explicit confirmation before Phase A begins; and once the loop begins it never prompts again.
- **AC-A7 (PRD AC-1):** Given a project whose `docs/context/architecture.md` declares no topology, when `/relay-execute` runs P7, then it is a complete no-op — no table, no question, no artifact — and the worktree sub-flow passes no `repo` context, so behavior is identical to before this phase.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The preflight is read as breaking the "single prompt to PR" promise | M | M | It runs once, before the loop, and is a complete no-op for any project without a topology declaration — which is every project that exists today. AC-A7 asserts that directly |
| The D11 inversion is applied to single-repo projects too, breaking AC-1 | M | H | The inversion is conditioned on a supplied `repo` context; Task 3's VALIDATE and Level 2 both assert the original chain text is still present, so removing it fails the build |
| A bare `.worktrees/` literal survives in a command this phase owns and silently targets the workspace root | M | H | Task 2's VALIDATE and Level 2 both assert zero bare `git worktree add .worktrees/` forms remain in `relay-worktree.md`; the Pillar 3 files are explicitly out of scope and get the same treatment in Phase 7 |
| The allowlist is not extended and every worktree creation prompts, stalling the autonomous loop | M | H | Task 6 extends it and its VALIDATE asserts the `git -C` form is admitted |
| F7 remains live for plain single-repo projects | H | M | Deliberate and recorded: AC-1 forbids changing that path. Documented in NOT Building and in Notes as a residual gap for a later PRD, not silently carried |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task above and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.

**Residual gap: F7 stays live for plain single-repo projects.** The base defect — a worktree cut from `origin/main` while the operator is on `dev` — is not specific to workspaces. It reproduces on any repository whose default branch exists on the remote and whose operator works elsewhere. This phase fixes it only for DECLARED members, because AC-1 guarantees a project with no topology declaration resolves paths, roots and base exactly as before. Fixing it for everyone would be the better outcome and would contradict an approved acceptance criterion, so it is left explicit here rather than quietly taken. A follow-up PRD should decide whether AC-1's base clause was too strong; the evidence for changing it is already recorded in this feature's own PRD Evidence section, citing `git worktree`'s documented default.

**Why the confirmation is a precondition and not a loop step.** `docs/decisions.md` 2026-07-27 records why relay's third interactivity extension used HALT-and-resume rather than a dialogue: `/relay-execute` drives many phases across one long unattended run, and a synchronous dialogue only works inside a single unbroken interactive turn. A precondition runs before that run begins, in the turn the operator invoked — so it can dialogue, and the loop it precedes stays prompt-free. Confirming N members once is strictly cheaper than N confirmations inside the loop, and it is the only shape compatible with both constraints.

*Generated: 2026-08-31*
*Approved: 2026-08-31*
*Status: IMPLEMENTED*
