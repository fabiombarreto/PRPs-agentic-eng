# Multi-Repo Workspace Topology

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting change to the worktree contract, the artifact-path convention, and the Implementation Phases table schema; alters recorded decision D11 (worktree base ref); introduces a human-confirmation point ahead of the autonomous loop; touches ~90 `.worktrees/` path literals and 8+ exact-match sites of the phase-table header
- Decisions found:
  - [2026-05-11] relay-worktree architecture decisions D1-D11 — D1 (`.worktrees/<feature>/` path), D2 (shell-out `git worktree add` over `EnterWorktree`), D4 (idempotency via `git worktree list --porcelain`), D9 (project-owned bootstrap script, 60s timeout), D10 (`feature/` branch prefix) are all PRESERVED and merely applied per repo. **D11 (base-ref chain `--base` -> `origin/main` -> `origin/master` -> `HEAD`) is CHANGED by this PRD** — see Decisions Log.
  - [2026-05-18] Pillar 2 never commits — permanent architectural boundary. Forces every integration step into Pillar 3; this PRD adds no commit to Pillar 2.
  - [2026-08-05] Five-state phase-status lifecycle (`pending` -> `in-progress` -> `implemented` -> `tested` -> `complete`), last two transitions owned by `/relay-execute`. The new `Repo` column must not disturb it.
  - [2026-07-27] Orchestrator resumability + `/relay-visual-approve`: relay's third interactivity-boundary extension, and the recorded reason a synchronous dialogue only works inside a single unbroken interactive turn. Governs where the base preflight may live (before the loop, never inside it).
  - PRP artifacts live under `PRPs/`, never under `.claude/`.
  - [2026-08-05] Plugin-owned resources live in `plugins/relay/resources/`, not in `docs/context/`.
  - [2026-08-28] Review agents never mutate the target working tree — bounds how the per-phase diff base may be captured.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — the workspace-root `PRPs/` exists precisely to end the violation already observed in `super-ensino`, where a hand-authored PRD sits in an artifact tree nested under `.claude/`. Propagating `.claude/settings.json` into a worktree is NOT a violation: the anti-pattern governs pipeline artifacts, and `settings.json` is setup configuration, which `docs/anti-patterns.md` exempts.
  - "Relying on interactive permission prompts in the autonomous loop" — the base preflight runs BEFORE the orchestration loop and confirms all N repos in one interaction; the loop itself stays prompt-free.
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — the governing precedent for topology, `Role` and `Base`: all declared, never detected. Repository membership is never inferred by scanning for `.git`.
  - "Injecting plugin defaults into the target project's `decisions.md`".
- Applicable architectural rules:
  - Interactivity boundary — three sanctioned extensions today; this PRD adds a fourth confirmation point and must record it as such.
  - Three-pillar split; Pillar 2 terminates with uncommitted changes.
  - Writer/reviewer split — this PRD introduces no new agent.
  - Graceful degradation: single-repo behavior must be preserved byte-for-byte when no topology is declared.
- Result: PROCEED
```

## Problem Statement

Relay assumes `cwd == target_root == exactly one git repository`. Three real workspaces — `super-ensino` (8 repos), `inplay` (2) and `sisalfa` (2) — violate that assumption, each in a structurally different way, and relay's response is silent degradation rather than a clear failure. Counting the single-repo case this repository itself represents, the feature must serve four distinct topology shapes. In `super-ensino` the orchestrator falls back to editing the live working tree of each sub-repo on whatever branch is checked out; in `inplay` it creates a worktree that succeeds and comes up empty. The cost is that a feature spanning two repos cannot be driven by relay at all: it is coordinated by hand, and the resulting PRD was written into an artifact tree nested under `.claude/`, violating relay's own artifact-path anti-pattern because no sanctioned location exists.

## Evidence

- `/relay-worktree` P1 (`git rev-parse --show-toplevel`) fails at the `super-ensino` root, and `relay-execute.md:481-492` treats worktree-creation failure as non-fatal, continuing against cwd with a single warning. Isolation has never existed for that workspace.
- `inplay-back` and `inplay-front` are recorded in the `inplay` index as gitlinks (mode `160000`) with **no `.gitmodules`**. `git worktree add` at that root succeeds and produces empty directories. Git's own documentation states multiple checkout support for submodules is incomplete and advises against multiple checkouts of a superproject (https://git-scm.com/docs/git-worktree).
- The base-ref defect is reproducible today: `sisalfa/AlfaFront` is checked out on `dev` and `origin/main` resolves, so D11 branches the worktree from `origin/main`, discarding the line the operator is on. `super-ensino/CLAUDE.md` independently documents `spe-api` as having two diverged lines with overlapping version numbers ("higher tag != newer"), where branching from the wrong one is silently destructive.
- `git worktree` documentation states that when no commit-ish is given, the new branch is created from the current checkout's `HEAD`; there is no notion of a workspace-wide default base. D11's `origin/main`-first chain overrides git's own default without a recorded rationale.
- A hand-authored multi-repo PRD named `coleta-dados-visualizacao-video.prd.md` already exists in `super-ensino`, inside an artifact tree nested under `.claude/`, with five phase reports named by repo (`phase-1-backend`, `phase-2/3/4-frontend-camada-1/2/3`). The workflow is in production use; only the tooling is missing.
- `methodology.md` diverges irreconcilably across the six initialized `super-ensino` repos: jest, vitest and pytest coexist, `tdd` differs per repo, and `figma_track: true` holds in exactly one. A single workspace-level file cannot represent this.
- Codebase grounding found `.worktrees/<feature>/` as a bare relative literal at roughly 90 sites across five commands plus `resources/settings-allowlist.md` and the context-builder skill; only `relay-worktree.md:239` ever qualifies it with a `repo_root` variable, and even that file emits the bare literal in its own Bash at line 209.
- The Implementation Phases header is exact-matched at 8+ sites, including `scripts/validate/checks/figma-visual-first-track-phase2.test.mjs:623`, which holds the 7-column header as a constant and asserts that no 8th column was added.
- Two divergent base-ref chains already coexist: `relay-worktree.md:127-132` (3 tiers) and `relay-pr.md:96-124` (5 tiers, including a `merge-base --fork-point` heuristic). On `AlfaFront` they disagree — `origin/main` versus `origin/dev`.
- Prior art is unanimous that workspace membership is declared, not detected: Google `repo` uses an explicit `<project>` manifest, `vcstool` a YAML keyed by relative path, `gita` an explicit registration command. `repo` and `vcstool` both implement exactly the fallback shape this PRD adopts for `Base` (per-entry revision, falling back to a default).

## Proposed Solution

Introduce a declared workspace topology and split relay's single `target_root` into three addressable roots: `project_root` (one artifact plane — the PRD, plans, reports and review logs, versioned by making the workspace root a git repository), `context_root` (per member — `CLAUDE.md`, `docs/`, `methodology.md`), and `repo_root` (per member — where `.git` lives, which is not always the same directory as `context_root`). Each participating repo gets its own worktree at `<repo_root>/.worktrees/<feature>/` on branch `feature/<feature>`, based on a declared ref that defaults to the current checkout, confirmed once in a preflight before the autonomous loop begins. Every topology that cannot be served — a `reference-only` member, an orphaned gitlink, an unresolvable path or base — becomes a named HALT instead of silent degradation. Execution stays strictly serial; parallelism is a separate PRD that depends on this one.

The alternative of auto-detecting topology by scanning for `.git` was rejected on two grounds: it contradicts relay's standing non-heuristic contract for gating keys, and it would have failed on the real data — `sisalfa/api-escola` holds its relay context one directory above its git root, which a depth-1 scan misreads twice over.

## Key Hypothesis

We believe that declaring workspace topology and creating one worktree per participating repo will eliminate silent degradation and make a cross-repo feature drivable by a single `/relay-execute` for the relay operator.

We'll know we're right when a real two-phase PRD spanning two repos of `super-ensino` runs end to end with no manual intervention, and every unsupported topology halts with an actionable message instead of proceeding.

## What We're NOT Building

- **Parallel phase execution** — the subject of the companion PRD 2. This PRD leaves `/relay-execute` strictly serial and changes nothing in its Phase A.1 row-selection rule.
- **Lane semantics and the `Parallel` column's meaning** — deferred to PRD 2. This PRD populates the cell as advisory annotation only; it remains read-but-not-acted-upon per `relay-execute.md:1060`.
- **A single pull request spanning repositories** — not technically possible; GitHub has no mechanism to bundle one PR across repos. Pillar 3 opens one PR per repo.
- **Support for orphaned gitlinks** (mode `160000` with no `.gitmodules`) — a named HALT with repair instructions, per git's own recommendation against multiple checkouts of a superproject.
- **Commits inside Pillar 2** — the "Pillar 2 never commits" boundary is preserved; all integration happens in `/relay-commit`.
- **Cross-repo dependency ordering or version coordination** (e.g. bumping a shared package tag and its consumers in lockstep) — out of scope; a phase targets exactly one repo.

## Success Metrics

The operator has specified binary acceptance gates rather than numeric targets. All five must pass.

| Metric | Target | How Measured |
|--------|--------|--------------|
| Cross-repo run completes unattended | Pass / Fail | `/relay-execute` on a two-phase PRD spanning two `super-ensino` repos reaches "all phases complete" with zero manual intervention |
| Real isolation per repo | Pass / Fail | `git worktree list --porcelain` in each participating repo shows `.worktrees/<feature>/` on `feature/<feature>` |
| Per-phase diff attribution | Pass / Fail | Phase N's code-review diff contains no files from phases 1..N-1; no false R-S1/R-S2 failure |
| No silent degradation | Pass / Fail | Each of the four measured topologies either runs or emits a named HALT; none falls through to cwd |
| Regression suite green | Pass / Fail | `npm run validate` reports 0 failed checks |

## Acceptance Criteria (test scenarios)

- **AC-1 single-repo unchanged:** Given a project whose `docs/context/architecture.md` has no `## Repository topology` section, when `/relay-execute` runs, then every path, root and base resolves exactly as before this feature, and the worktree is created at `<repo_root>/.worktrees/<feature>/` with no new precondition, prompt or artifact.
- **AC-2 topology parsed:** Given a workspace whose `docs/context/architecture.md` contains a `## Repository topology` section with rows for two members, when `/relay-execute` runs its preconditions, then both members are resolved to absolute `context_root` and `repo_root` paths and recorded in `orchestrator-run.json`.
- **AC-3 context root differs from repo root:** Given a member whose declared context path is `api-escola` and whose git root is `api-escola/apiescola`, when the orchestrator reads that member's `methodology.md` and Decision Gate sources, then it reads them from `api-escola/`, and when it creates the worktree, then it creates it under `api-escola/apiescola/.worktrees/<feature>/`.
- **AC-4 reference-only refused:** Given a topology row with `Role: reference-only`, when any phase's `Repo` cell names that member, then the run HALTs with a named code before any worktree is created and no file in that member is modified.
- **AC-5 orphaned gitlink refused:** Given a repo whose index contains a mode-`160000` entry with no `.gitmodules` file, when the orchestrator resolves that member, then it HALTs with a named code naming the offending path and the repair options, and creates no worktree.
- **AC-6 base defaults to the current checkout:** Given a member declared `Base: current` (or with an empty `Base` cell) that is checked out on `dev` while `origin/main` also resolves, when the worktree is created, then its branch is based on the `HEAD` of `dev`, not on `origin/main`.
- **AC-7 base preflight confirms once:** Given a workspace with three participating repos, when `/relay-execute` starts, then before entering the orchestration loop it emits one table listing each repo's declared base, resolved ref, current branch and SHA, and waits for one explicit confirmation; on a negative or absent confirmation it exits having created no worktree, and once the loop begins it never prompts again.
- **AC-8 unresolvable base halts before side effects:** Given a member whose declared `Base` does not resolve under `git rev-parse --verify`, when the preflight runs, then the run HALTs with `FAILED_BASE_REF_MISSING` naming that member, and no worktree exists in any member afterwards.
- **AC-9 per-phase diff base:** Given a two-phase run in one worktree where phase 1 modified file A and phase 2 modified file B, when phase 2's code review computes its diff, then the diff contains B and does not contain A.
- **AC-10 PR base derives from the recorded creation base:** Given a worktree created from `dev` and recorded as such, when `/relay-pr` resolves the PR base without a `--base` override, then it targets `dev`, and the `merge-base --fork-point` ancestor-detection tier is not consulted.
- **AC-11 one PR per repo:** Given a feature whose phases touched two repos, when Pillar 3 runs, then `/relay-commit` integrates each repo's worktree onto `feature/<feature>` in that repo, `/relay-pr` opens one PR per repo, and `/relay-approve` merges and cleans up each repo's worktree and branch, reporting per-repo outcomes.
- **AC-12 worktree carries settings:** Given a project with a `.claude/settings.json` at its root, when a worktree is created for a member, then `.claude/settings.json` is present inside that worktree and `/relay-test` does not abort with `ABORT_INFRA/missing_settings_json`.
- **AC-13 phase table carries a repo pointer:** Given a PRD whose Implementation Phases table includes a `Repo` column, when `prd-reviewer` validates it, then every non-empty `Repo` value must name a member declared in the topology whose `Role` is `editable`, and a value naming an undeclared or `reference-only` member yields `CHANGES_REQUESTED`.

## Open Questions

- [ ] Should the workspace-root `.gitignore` generated for `git init` enumerate declared members explicitly, or use a broader pattern? Enumeration is safer but must stay in sync with the topology registry.
- [ ] Does `/relay-approve` merge the N PRs in a defined order when one repo's change depends on another's being released first (e.g. a package tag bump)? Cross-repo release ordering is declared out of scope above, but the merge order may still need to be deterministic rather than arbitrary.
- [ ] Whether the `Repo` column should be mandatory (every row) or optional (empty means single-repo) once a topology is declared. Optional preserves migration ease; mandatory removes an ambiguity class.

---

## Users & Context

**Primary User**
- **Who:** The relay operator — a single developer driving a feature that spans several repositories of one workspace. Relay is single-operator today; this is not a team-coordination feature.
- **Current behavior:** Runs relay repo by repo and stitches the coordination by hand, or abandons the pipeline and writes the PRD manually — as already happened in `super-ensino`, where the PRD landed in an artifact tree nested under `.claude/`.
- **Trigger:** A change that requires backend and frontend work together, in separate repositories.
- **Success state:** One `/relay-execute` drives every phase into the right repo, with real isolation in each.

**Job to Be Done**
When a feature spans N repos of one workspace, I want relay to isolate, plan and implement each phase in the correct repository, so I can avoid hand-stitching coordination and avoid the pipeline editing my live working tree.

**Non-Users**
Single-repo projects, for whom nothing changes — a hard design constraint, not a courtesy. Monorepos (one repo, many packages) already work and are unaffected. Members marked `reference-only`, such as `spe-ui` and `spe-tokens`, are part of the workspace but are explicitly never written to.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Topology registry in the workspace `docs/context/architecture.md` (`Repo`, `Path`, git root, `Role`, `Base`) | Declared, never detected; the single source that makes every other capability addressable |
| Must | Root split: `project_root` / `context_root` / `repo_root` | Today one variable serves three roles; `sisalfa/api-escola` proves context and git roots can differ |
| Must | Workspace artifact plane at `<project_root>/PRPs/`, versioned via `git init` at the root | Ends the nested-under-`.claude/` artifact anti-pattern violation; keeps one PRD, one `orchestrator-run.json`, one writer |
| Must | `Repo` column in the Implementation Phases table + `prd-reviewer` validation | The registry says which repos exist; the column says which one each phase touches |
| Must | One worktree per participating repo | The isolation contract that F1 and F2 show has never actually held |
| Must | `Base` declaration defaulting to `current`, plus a single pre-loop confirmation preflight | Restores git's own default and makes the base an audited fact rather than an implicit choice |
| Must | Per-repo context resolution (Decision Gate + `methodology.md` read per phase) | Frameworks and `tdd` diverge irreconcilably across members |
| Must | Per-phase diff base | Already a live defect in serial mode; without it the code review of phase 2 onward is noise |
| Must | Bootstrap + `.claude/settings.json` propagation into worktrees | Without it `/relay-test` aborts in every fresh worktree, blocking validation of this PRD's own deliverable |
| Must | Pillar 3 across N repos (N worktrees, N PRs, N cleanups) with per-repo outcome reporting | A cross-repo feature is not delivered until it ships |
| Must | Base-chain reconciliation: `/relay-worktree` records the resolved creation base; `/relay-pr` consumes it as its first tier and drops the fork-point heuristic | Branch-from and merge-into become consistent by construction, and one heuristic is removed |
| Must | Named HALTs for every unserviceable topology (invalid path, orphaned gitlink, reference-only target, unresolvable base) | Replaces the silent cwd fallback that is the root of F1 and F2 |
| Should | `context-builder` workspace mode (`git init`, `PRPs/`, topology section seeded from an existing root `CLAUDE.md`) | Without it every workspace is set up by hand; `super-ensino/CLAUDE.md` already contains the needed content as prose |
| Should | Reconcile the pre-existing root asymmetry (`relay-worktree` uses `git rev-parse --show-toplevel`; five other commands assume `cwd == target_root`) | Predates and is orthogonal to multi-repo, but this PRD inherits it |
| Must | A `npm run validate` check forbidding bare `.worktrees/` literals outside `relay-worktree.md` | Guards the ~90-site migration against silent partial completion; it is the completion criterion of the worktree phase, so it cannot be optional |
| Won't | Parallel phase execution, lanes, `Parallel` semantics | PRD 2 |
| Won't | A single PR spanning repositories | Not possible on GitHub |
| Won't | Orphaned-gitlink support | HALT with repair guidance instead |

### MVP Scope

The entire Must set. The hypothesis is only testable by a cross-repo `/relay-execute` completing end to end, and each Must is a literal precondition of that run: without the per-phase diff base the review is noise, without settings propagation the tests abort, and without Pillar 3 the feature cannot ship.

### User Flow

Declare the topology once in the workspace `docs/context/architecture.md` -> author a PRD with a `Repo` cell per phase -> run `/relay-execute` -> confirm the base preflight table once -> the serial loop runs, creating and reusing one worktree per repo -> Pillar 3 commits, opens one PR per repo, and cleans up each.

---

## Technical Approach

**Feasibility:** MEDIUM

There is no unknown. The design is closed, the failure modes are reproduced on real repositories, and the prior art (`repo`, `vcstool`) validates both the declaration form and the per-entry base fallback. The risk is volume and coupling, not discovery: roughly 90 bare `.worktrees/` literals and 8+ exact-match sites of the phase-table header, one of which is a test written specifically to prevent the change this PRD makes.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` is declared here, so the pair is active in test-after mode.

### Architecture Notes

- **Two planes, explicitly separated.** The artifact plane is single and lives at `project_root`; the code plane is plural, one `repo_root` per member. Only the code plane multiplies, which keeps auditing and HALT reporting in one place with one writer.
- **Three roots, not two.** `context_root` and `repo_root` coincide in six of the eight measured members but diverge in `sisalfa/api-escola`, whose relay context sits one directory above its git root. The registry must express both; the git root defaults to the context path when not stated.
- **Topology is declared, never detected.** This follows the standing non-heuristic contract for `tdd`, `docs_sync` and `figma_track`. Scanning for `.git` would have failed on the real data twice over.
- **Section-absent means single-repo.** The `## Repository topology` section's absence is the compatibility clause that satisfies AC-1; no existing project migrates.
- **The base preflight sits before the loop, never inside it.** Per the recorded reasoning behind relay's third interactivity extension, a synchronous dialogue only works inside one unbroken interactive turn; `/relay-execute` runs long and unattended. Confirming N repos once, before any work, is compatible with both that constraint and the standing anti-pattern against prompts inside the autonomous loop.
- **This PRD's own phase table uses the current 7-column header.** The `Repo` column does not exist until Phase 4 of this PRD ships; emitting an 8-column header here would break `relay-execute` P3 parsing and the `prd-reviewer` R7 check at the moment this very PRD is reviewed. All phases below target this single repository, so no repo pointer is needed.
- **The `Parallel` cells below carry advisory annotation only.** Phases 1, 2 and 3 are genuinely independent. The cell has no consumer today (`relay-execute.md:1060`), so this changes nothing in execution; it is recorded as real input for PRD 2.
- **The `Repo` column change must route through the test pair.** `scripts/validate/checks/figma-visual-first-track-phase2.test.mjs:623` asserts the header has exactly 7 columns. Under the code-reviewer's R-X guard the Implementer may not edit test files, so this is planned as a test-pair `EXISTING_TEST_UPDATED` task, never an Implementer task.
- **D11 is changed, not extended.** `git worktree`'s own default base is the current checkout; D11's `origin/main`-first chain overrode it. Restoring `current` as the default is a return to git semantics, and must be recorded in `docs/decisions.md` as a conscious divergence from the 2026-05-11 entry.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The `Repo` column breaks the validate check that pins the 7-column header, and R-X forbids the Implementer from editing tests | H | Dedicated phase; the test change is planned as a test-pair `EXISTING_TEST_UPDATED` task with the header constant updated in lockstep with `prd-template.md` and `prd-reviewer`'s R7 quote |
| Incomplete migration of ~90 bare `.worktrees/` literals leaves some commands silently operating against the workspace root | M | Introduce a validate check forbidding the bare literal outside `relay-worktree.md`; treat the check as the completion criterion for the worktree phase |
| `git init` at the `super-ensino` root interacts badly with the 8 child repos (accidental tracking, status noise) | L | The generated root `.gitignore` excludes every declared member; verified against `super-ensino` before the phase closes |
| The base preflight is perceived as breaking the "single prompt to PR" promise | L | It runs once, before the loop, and is skipped entirely for single-repo projects with no declared topology (AC-1) |
| Changing `/relay-pr`'s base resolution regresses existing single-repo PRs | M | The recorded-base tier is additive and only fires when a recorded base exists; the develop-family and main/master fallbacks are preserved for hand-created branches and `--no-worktree` runs |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Topology registry and root resolution | Parse `## Repository topology`; resolve `project_root`/`context_root`/`repo_root`; named HALTs for invalid path, orphaned gitlink and reference-only target; section-absent preserves single-repo | complete | yes | - | PRPs/plans/multi-repo-topology-phase-1-topology-registry-and-root-resolution.plan.md |
| 2 | Per-phase diff base | Fix the commit-range diff form that leaves the code-reviewer's changed-file set empty on uncommitted work, then capture a per-phase tree object at each phase boundary and pass it as the next phase's diff base | complete | yes | - | PRPs/plans/multi-repo-topology-phase-2-per-phase-diff-base.plan.md |
| 3 | Worktree bootstrap and settings propagation | Ship this repo's bootstrap script and propagate `.claude/settings.json` into every created worktree so the test runner stops aborting | complete | yes | - | PRPs/plans/multi-repo-topology-phase-3-worktree-bootstrap-and-settings-propagation.plan.md |
| 4 | Repo column | Add `Repo` to the phase-table schema across template, parsers and `prd-reviewer` R7; update the validate check pinning the header via the test pair | complete | - | 1 | PRPs/plans/multi-repo-topology-phase-4-repo-column.plan.md |
| 5 | Worktree per repo, base declaration and preflight | Create one worktree per participating repo; `Base` defaults to `current`; record the resolved base; single pre-loop confirmation preflight; change D11 | complete | - | 1, 4 | PRPs/plans/multi-repo-topology-phase-5-worktree-per-repo-base-declaration-and-preflight.plan.md |
| 6 | Per-repo context resolution | Read Decision Gate sources and `methodology.md` from each phase's own member, making TDD routing per-phase rather than per-session | complete | - | 1, 4 | PRPs/plans/multi-repo-topology-phase-6-per-repo-context-resolution.plan.md |
| 7 | Pillar 3 across N repos | `/relay-commit`, `/relay-pr` and `/relay-approve` handle N worktrees, N PRs and N cleanups; `/relay-pr` consumes the recorded base and drops the fork-point tier | complete | - | 5 | PRPs/plans/multi-repo-topology-phase-7-pillar-3-across-n-repos.plan.md |
| 8 | Workspace initialization and decision records | `context-builder` workspace mode (`git init`, `PRPs/`, seeded topology section) plus the `docs/decisions.md` entries for the D11 change and the new confirmation point | complete | - | 1, 5 | PRPs/plans/multi-repo-topology-phase-8-workspace-initialization-and-decision-records.plan.md |

### Phase Details

**Phase 1: Topology registry and root resolution**
- **Goal:** Make workspace membership addressable and every unserviceable topology loud.
- **Scope:** The `## Repository topology` parser and its exact-match header; resolution of the three roots including the case where the git root sits below the context path; named HALT codes for unresolvable path, orphaned gitlink and reference-only target; the section-absent compatibility clause.
- **Success signal:** All four measured workspaces resolve or halt with an actionable message; a project with no topology section behaves byte-for-byte as before.

**Phase 2: Per-phase diff base**
- **Goal:** Give each phase a diff that contains only its own changes — and that contains its own changes at all.
- **Scope:** Two coupled halves. (a) Correct the diff form: `code-reviewer` enumerates `files_changed` with `git diff --name-only <diff_target>..HEAD`, a commit-to-commit range that excludes the working tree. Because Pillar 2 never commits and a feature worktree's `HEAD` stays at its base, that set is empty in the standard path — measured at 0 files against a working tree carrying 5 real modifications — which makes R-X, the universal test-modification guard, pass by vacuity rather than by conformance, and makes R-S1 trivially true. (b) Capture a tree object at each phase boundary in the worktree and thread it to the code-review stage as the diff base, without any commit and without a review agent mutating the working tree.
- **Success signal:** In a two-phase run, phase 2's review diff excludes phase 1's files, contains its own, and raises no R-S1/R-S2 scope failure; and a deliberately test-touching implementer diff is caught by R-X rather than passing on an empty set.

> **Scope amendment (2026-08-31, operator-authorized).** Half (a) was discovered mid-run while planning this phase and absorbed into it rather than split into a separate hotfix. It is not new acceptance surface: AC-9's "then the diff contains B" half is precisely what the commit-range form violates, so the criterion already covers it.

**Phase 3: Worktree bootstrap and settings propagation**
- **Goal:** Make a freshly created worktree able to run its own test suite.
- **Scope:** Ship `scripts/worktree-bootstrap` for this repository (the target-project template already exists inside the context-builder skill) and propagate `.claude/settings.json`, which git never carries into a worktree because it is ignored.
- **Success signal:** `/relay-test` runs in a fresh worktree without `ABORT_INFRA/missing_settings_json`.

**Phase 4: Repo column**
- **Goal:** Let a phase name the repository it targets.
- **Scope:** Extend the header across `prd-template.md`, `plan-writer` row selection, `prd-reviewer` R7, and the `relay-execute`/`relay-plan`/`relay-implement` parsers; update the validate check that pins the 7-column header, routed through the test pair per R-X; add the rubric rule tying each `Repo` value to a declared `editable` member.
- **Success signal:** A PRD with a `Repo` column parses everywhere and is validated; `npm run validate` is green; a row naming an undeclared or reference-only member is rejected.

**Phase 5: Worktree per repo, base declaration and preflight**
- **Goal:** Real isolation in every participating repo, from a base the operator chose and confirmed.
- **Scope:** Create and idempotently reuse `<repo_root>/.worktrees/<feature>/` per member; `Base` defaulting to `current`; record the resolved base ref and SHA as an artifact; the single pre-loop confirmation preflight with per-member halt on unresolvable base; migrate the bare `.worktrees/` literals to repo-qualified paths.
- **Success signal:** `git worktree list --porcelain` shows the expected worktree in each member; a member on `dev` with `origin/main` present branches from `dev`; the loop itself never prompts.

**Phase 6: Per-repo context resolution**
- **Goal:** Read each phase's governing context from its own repository.
- **Scope:** Decision Gate sources and `methodology.md` resolved per phase from that phase's `context_root`, making the TDD routing decision per phase; the routing note emitted per phase rather than once per session.
- **Success signal:** A run whose two phases target a `tdd: true` member and a `tdd: false` member routes each correctly.

**Phase 7: Pillar 3 across N repos**
- **Goal:** Ship a cross-repo feature.
- **Scope:** `/relay-commit` integrates each repo's worktree onto its `feature/<feature>` branch; `/relay-pr` opens one PR per repo and resolves the PR base from the recorded creation base, dropping the fork-point heuristic tier while preserving the develop-family and main/master fallbacks for branches with no recorded base; `/relay-approve` merges and cleans up per repo with per-repo outcome reporting and partial-failure capture.
- **Success signal:** A two-repo feature produces two PRs whose bases match their creation bases, both merge, and both worktrees and branches are cleaned up.

**Phase 8: Workspace initialization and decision records**
- **Goal:** Make a new workspace set up in one command and record what changed.
- **Scope:** `context-builder` workspace mode performing `git init`, creating `PRPs/`, generating the root `.gitignore` excluding declared members, and seeding the topology section; `docs/decisions.md` entries for the D11 change and for the new pre-loop confirmation point as an interactivity-boundary extension, mirrored per the decisions-mirror check.
- **Success signal:** A previously unconfigured workspace reaches a runnable state in one command; `npm run validate` green including the decisions mirror.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Topology declaration site (O1) | `## Repository topology` section with exact-match header in the workspace `docs/context/architecture.md` | Frontmatter in `methodology.md`; auto-detection by scanning for `.git` | Keeps the machine-readable declaration in the file the operator chose, using the exact-match table idiom relay already applies to the phase table; auto-detection contradicts the standing non-heuristic contract and would have misread `sisalfa/api-escola` |
| Pillar 3 shape (O2) | One PR per repo, with that repo's work integrated at `/relay-commit` time | One PR spanning repos; merging lanes during Pillar 2 | A PR cannot cross repositories on GitHub; performing integration in Pillar 3 keeps the "Pillar 2 never commits" boundary intact |
| Scope split (O3) | Multi-repo first, parallelism second | One combined PRD; parallelism first for single-repo | Per-repo worktrees are a hard precondition of parallelism; without them concurrency corrupts rather than accelerates |
| Artifact plane (O4) | `PRPs/` at the workspace root, with `git init` at that root | Unversioned root `PRPs/`; a designated coordinator repo; per-repo planes with a root index | One PRD, one run log, one writer; leaving it unversioned would put review logs and the move to `completed/` outside git, unlike every other relay project |
| Phase-to-repo pointer (O5) | A `Repo` column in the Implementation Phases table | Deriving it from the dependency chain; declaring it in phase prose | Explicit and validatable by `prd-reviewer` against the registry; derivation would make the pointer implicit and forbid a chain crossing repos |
| Orphaned gitlinks (O6) | Named HALT with repair guidance | Supporting the topology as-is; repairing the affected repo first | Git documents submodule support in worktrees as incomplete and advises against multiple checkouts of a superproject; no official guidance exists for gitlinks without `.gitmodules` |
| Worktree base (O7) | Declared per repo via `Base`, defaulting to `current`, confirmed in one pre-loop preflight | Keeping D11's `origin/main`-first chain; per-worktree confirmation inside the loop; declaration with no runtime confirmation | `current` restores `git worktree`'s own documented default, which D11 had overridden; a single pre-loop preflight confirms N repos without putting a prompt inside the autonomous loop |
| Base-chain reconciliation | `/relay-worktree` records the resolved creation base; `/relay-pr` consumes it as its first tier after `--base`, dropping the `merge-base --fork-point` tier | Leaving both chains independent; collapsing them into one chain | The two chains answer different questions (branch-from vs merge-into) and must not be collapsed, but they may silently disagree — on `AlfaFront`, `origin/main` versus `origin/dev`; recording the fact makes them consistent by construction and removes a heuristic |
| Third root (`context_root`) | Registry expresses context path and git root separately, git root defaulting to the context path | Assuming they coincide; walking up from `.git` to find context | `sisalfa/api-escola` holds its relay context one directory above its git root; assuming coincidence was a generalization from a sample lacking the counterexample |

---

## Research Summary

**Market Context**

Multi-repo workspace tooling converges on explicit declaration over detection. Google's `repo` declares each member as a `<project>` element in a manifest held in a dedicated repository, with revision pinning cascading project -> remote -> default (https://gerrit.googlesource.com/git-repo/+/master/docs/manifest-format.md). `vcstool` uses a YAML file keyed by each repo's relative path, falling back to the default branch when `version` is omitted (https://github.com/dirk-thomas/vcstool). `gita` requires explicit registration before operating on a repo (https://github.com/nosarthur/gita). None auto-detect membership by scanning, and the `Base`-with-default shape adopted here mirrors `repo` and `vcstool` directly.

Git's own documentation supplies two load-bearing facts: when no commit-ish is given, `git worktree add` creates the branch from the current checkout's `HEAD`, and there is no workspace-wide default base; and multiple checkout support for submodules is incomplete, with multiple checkouts of a superproject explicitly discouraged (https://git-scm.com/docs/git-worktree). Ignored files never transfer into a new worktree, and the documented community remedy is a post-checkout hook that copies them — the same shape as relay's bootstrap contract (https://spin.atomicobject.com/git-worktrees-untracked-files/). GitHub confirms no native mechanism bundles a single change across repositories (https://github.com/orgs/community/discussions/13733).

Gaps: no official git documentation covers a gitlink present in the index with no `.gitmodules` entry, nor its repair — which is why this PRD halts rather than attempting support. No published postmortem was found on branching from the wrong base in a polyrepo setup; that risk is evidenced here from the local repositories instead.

**Technical Context**

`target_root` is recorded as the bare current working directory in `relay-execute.md:68` and in `relay-approve`, `relay-plan`, `relay-plan-review` and `relay-design-spec`, serving simultaneously as artifact root and code root. `relay-worktree.md` is the sole outlier, computing `repo_root` via `git rev-parse --show-toplevel` — an asymmetry that predates multi-repo and must be reconciled by it.

`.worktrees/<feature>/` appears as a bare relative literal at roughly 90 sites: `relay-commit.md` (~15), `relay-pr.md` (~14), `relay-approve.md` (~10), `relay-execute.md` (2), `resources/settings-allowlist.md` (2) and the context-builder skill (~12). Only `relay-worktree.md:239` qualifies it with a variable, and that same file emits the bare literal at line 209.

The Implementation Phases header is exact-matched at `prd-template.md:184`, `plan-writer.md:298` (byte-for-byte, no fuzzy matching), `prd-reviewer`'s R7, `relay-implement.md:144`, `relay-execute.md` (3 sites), `relay-plan.md` (2 sites), and `scripts/validate/checks/figma-visual-first-track-phase2.test.mjs:623`, which holds the header as a constant and asserts no 8th column exists.

`methodology.md` and the Decision Gate sources are read from a single `target_root` by every consumer, with no per-member notion. Pillar 3 assumes exactly one worktree, one branch, one PR and one ordered cleanup sequence (`relay-approve.md:172-192`). The bootstrap scripts do not exist in this repository at all: they are heredoc templates inside the context-builder skill emitted into target projects, and `relay-worktree.md:247-251` looks for them at "the repo root" of that single target.

---

*Generated: 2026-08-31*
*Approved: 2026-08-31*
*Status: APPROVED*
