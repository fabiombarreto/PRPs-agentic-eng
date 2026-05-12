# test-frameworks-empty-self-skip

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: protocol evolution touching /relay-test and /relay-execute Phase A.5; formalizes silent self-skip on test_frameworks: [] (or absent methodology.md); symmetric with /relay-tdd P4.a self-skip on tdd: false; cross-cutting downstream-consumed artifact
- Decisions found:
  - 2026-04-19 — TDD activation is opt-in by explicit declaration only (heuristic activation forbidden) — precedent for opt-in/methodology-driven self-skip semantics
  - 2026-05-06 — TDD pair authorized for test creation; /relay-execute A.3.5 self-skips silently when tdd: false or methodology.md missing — direct structural precedent
  - 2026-04-19 — Command surface: one command per stage, writer/reviewer split
  - 2026-04-19 — PRP artifact paths under PRPs/ (never .claude/)
  - 2026-05-11 D8 — Worktree-creation-failure graceful fallback to cwd — graceful-degradation philosophy applied symmetrically here
- Applicable anti-patterns:
  - docs/anti-patterns.md:43-48 — "Activating the TDD track by heuristic" — applied symmetrically: Test Runner activation requires explicit non-empty test_frameworks; never heuristic
  - docs/anti-patterns.md:79-84 — "Relying on interactive permission prompts in the autonomous loop" — a false FAILED_INFRA_UNRECOVERABLE halt on framework-less projects forces manual intervention semantically equivalent to an unsignalled prompt
- Applicable architectural rules:
  - docs/context/architecture.md:58-81 — Interactivity boundary; past PRD approval, autonomous; halts must be semantically correct
  - docs/context/architecture.md:84-98 — PRPs/ artifact paths; no .claude/ writes (this PRD changes no artifact paths)
  - Three-pillar Pillar 2 writer/reviewer pairs preserved (no command-surface change)
- Result: PROCEED
```

## Problem Statement

relay pipeline operators running `/relay-execute` against projects with no test suite by design (markdown/JSON plugins, doc-only repos, IaC-only repos — including the relay repo itself) hit a false `FAILED_INFRA_UNRECOVERABLE` halt because `/relay-test`'s precondition chain treats "no framework configured" identically to "framework configured but infra broken". Worse, `/relay-execute` resolves the halt inconsistently across sessions: the 2026-05-11 relay-worktree dogfood ran two parallel sessions against framework-less PRDs and observed session A self-skipping gracefully with a `skipped_no_test_framework` outcome while session B took the strict path with `FAILED_INFRA_UNRECOVERABLE` yet still declared `ALL_PHASES_COMPLETE` (which contradicts the strict orchestrator protocol). The cost of not solving it is two-fold: divergent autonomous outcomes from the same input (the antithesis of relay's determinism contract) and a halt code that misrepresents the actual state (the project has NO test suite BY DESIGN, not because of broken infra).

## Evidence

- `PRPs/reports/relay-worktree/dogfood.md:80-81` — dogfood-A: "Test stage `skipped_no_test_framework` (graceful path)" vs dogfood-B: "Test stage `FAILED_INFRA_UNRECOVERABLE` (strict path; relay repo has no `.claude/settings.json`) — BUT outcome still `ALL_PHASES_COMPLETE` per the session's interpretation."
- `PRPs/reports/relay-worktree/dogfood.md:278-283` — "Protocol inconsistency surfaced: dogfood-A's session interpreted the test stage as `skipped_no_test_framework` (graceful); dogfood-B's session interpreted it as `FAILED_INFRA_UNRECOVERABLE` (strict) but still returned `ALL_PHASES_COMPLETE`. Per the current strict orchestrator protocol, dogfood-B should have HALTed. Suggests a future `docs/decisions.md` entry formalizing /relay-test self-skip when `test_frameworks: []` in `methodology.md` — analogous to the `tdd: false` self-skip in Phase A.3.5."
- `plugins/relay/commands/relay-test.md:146-147` — current strict-halt encoding: "If `reason` is `missing_settings_json` or `no_runner_detected` or `no_test_framework`, recovery is not possible. Exit with `FAILED_INFRA_UNRECOVERABLE`." This conflates three distinct failure modes (two genuine-infra, one no-framework-configured) into a single halt code.
- `plugins/relay/commands/relay-tdd.md:116-134` — canonical reference pattern: P4.a (`tdd: false` or methodology.md absent → emit verbatim line and exit 0), P4.b (`tdd: true` + empty `test_frameworks` → hard abort), P4.c (`tdd: true` + non-empty → proceed).
- `docs/decisions.md:421-437` — 2026-05-06 TDD self-skip entry; provides the format and rationale precedent.

## Proposed Solution

Add a Phase 0 self-skip gate at the top of `/relay-test`'s precondition chain that reads `docs/context/methodology.md.test_frameworks`. When the field is `[]` OR the file is absent, emit the verbatim line `Test framework inactive (test_frameworks: []). Skipping.` and exit 0 — symmetric in shape and position to `/relay-tdd`'s P4.a (`TDD track inactive (tdd: false). Skipping.`). In `/relay-execute`, evolve Phase A.5 to add a new Step A.5.0 that re-reads the same key and explicitly logs a `{phase: <N>, stage: "test", outcome: "skipped_no_test_framework"}` entry to `orchestrator_run_log` before proceeding to Phase A.6 — symmetric to A.3.5.0's `skipped_tdd_false`. `FAILED_INFRA_UNRECOVERABLE` semantics are preserved verbatim for genuine infra failures: missing `settings.json` WHEN a framework IS declared, docker not running, container failure, normalizer failure. The change is bidirectional: the command-level gate handles the standalone `/relay-test` invocation path; the orchestrator-level gate handles the `/relay-execute` adoption path, ensuring two parallel sessions against the same framework-less PRD produce identical outcome codes.

## Key Hypothesis

We believe formalizing a `test_frameworks: []`/file-absent silent self-skip in `/relay-test` Phase 0 (symmetric to `/relay-tdd` P4.a) and explicitly handling the resulting `skipped_no_test_framework` outcome in `/relay-execute` Phase A.5.0 will eliminate the dogfood-A vs dogfood-B path divergence and produce deterministic orchestrator outcomes for framework-less projects. We'll know we're right when re-running the parallel-session dogfood against the relay repo (or any `test_frameworks: []` project) produces identical test-stage outcome codes across N≥2 sessions.

## What We're NOT Building

- Auto-detection of test frameworks — explicit anti-pattern (`docs/anti-patterns.md:43-48`); team declares via `context-builder *init`.
- Changing `FAILED_INFRA_UNRECOVERABLE` semantics for genuine infra issues — preserved verbatim where they apply.
- Re-validating the relay-worktree AC-16 cross-contamination methodology gap — separate concern, deferred.
- New halt outcome codes, new agents, new commands, new artifact paths — the protocol evolution is a behavior change under existing surfaces.
- A backwards-compatibility shim for the old strict-halt path on framework-less projects — the dogfood-B behavior is incorrect and is being corrected, not preserved.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Deterministic test-stage outcome on framework-less projects | 100% across N≥2 parallel-session runs | Re-run the relay-worktree dogfood-B scenario against the relay repo; assert both sessions log `skipped_no_test_framework` and reach `ALL_PHASES_COMPLETE` |
| `FAILED_INFRA_UNRECOVERABLE` semantics preserved for genuine infra failures | 0 regressions | Run `/relay-test` against a synthetic worktree with `test_frameworks: ["pytest"]` but missing `.claude/settings.json`; assert HALT with `FAILED_INFRA_UNRECOVERABLE` |
| Symmetric verbatim-line shape with `/relay-tdd` | byte-identical structure | grep both `relay-tdd.md` (`"TDD track inactive (tdd: false). Skipping."`) and the new `relay-test.md` line (`"Test framework inactive (test_frameworks: []). Skipping."`); confirm same `<Subject> inactive (<key>: <value>). Skipping.` shape |

## Acceptance Criteria (test scenarios)

- **AC-1 `/relay-test` self-skip on framework-less project:** Given `docs/context/methodology.md` exists with `test_frameworks: []`, when `/relay-test <worktree-path>` is invoked, then the command emits the verbatim line `Test framework inactive (test_frameworks: []). Skipping.` on stdout, exits with code 0, and does NOT write `PRPs/reports/<feature>/run.json` or any per-attempt artifact.
- **AC-2 `/relay-test` self-skip on absent methodology.md:** Given `docs/context/methodology.md` does not exist at the target root, when `/relay-test <worktree-path>` is invoked, then the command emits the same verbatim line as AC-1, exits 0, and writes no artifacts.
- **AC-3 Strict `FAILED_INFRA_UNRECOVERABLE` preserved for genuine infra issues:** Given `docs/context/methodology.md` declares `test_frameworks: ["pytest"]` (non-empty) AND `.claude/settings.json` is missing at the worktree root, when `/relay-test <worktree-path>` is invoked, then the command HALTs with `FAILED_INFRA_UNRECOVERABLE` as before — the self-skip gate must NOT fire.
- **AC-4 `/relay-execute` Phase A.5 logs `skipped_no_test_framework`:** Given a project with `test_frameworks: []` and an APPROVED PRD, when `/relay-execute <prd-path>` reaches Phase A.5 for some phase N, then `orchestrator_run_log` contains the entry `{"phase": <N>, "stage": "test", "outcome": "skipped_no_test_framework"}` and the orchestrator proceeds to Phase A.6 without halting.
- **AC-5 Deterministic outcome across parallel sessions:** Given two parallel `/relay-execute` sessions invoked within 30 seconds against framework-less PRDs, when both sessions reach Phase A.5, then both log `skipped_no_test_framework` (NOT one logging `skipped_no_test_framework` and the other `FAILED_INFRA_UNRECOVERABLE`) — closing the dogfood-A-vs-dogfood-B inconsistency.
- **AC-6 `/relay-test-review` inheritance documented:** Given `/relay-test` self-skipped on Phase N (no `run.json` produced), when `/relay-test-review` is invoked or adopted, then it self-skips with no rubric run; the inheritance is documented explicitly in the new `docs/decisions.md` entry as D5 of the decisions block.
- **AC-7 Symmetric verbatim-line shape:** Given the existing `/relay-tdd` P4.a line `TDD track inactive (tdd: false). Skipping.` and the new `/relay-test` Phase 0 line `Test framework inactive (test_frameworks: []). Skipping.`, when both are inspected, then both match the shape `<Subject> inactive (<key>: <value>). Skipping.` for grep-friendly cross-command discovery.
- **AC-8 Documentation surface coherence:** Given the v0.11.1 release cut, when `documentation/commands.html` (`/relay-test` kv-block), `docs/api-reference.md` (`/relay-test` and `/relay-execute` rows), `documentation/changelog.html` (v0.11.1 entry), and `plugins/relay/.claude-plugin/plugin.json` are inspected, then all four reflect the new `skipped_no_test_framework` outcome and the version is `0.11.1` across all of them.

## Open Questions

- [ ] Should `plugins/relay/agents/test-runner.md` (line 281 graceful-degradation table; lines 69, 91 ABORT_INFRA emission sites for `no_test_framework`) be updated in the same release to reflect that the `no_test_framework` ABORT_INFRA branch becomes defensive dead code after the command-level gate intercepts upstream? Currently classified as **Could** in MoSCoW; promote to **Should** for full coherence if the implementer agrees.
- [ ] Should the v0.11.1 changelog entry name the dogfood report explicitly ("Surfaced by 2026-05-11 relay-worktree dogfood, sessions A vs B")? Style call; default to yes for traceability.

---

## Users & Context

**Primary User**
- **Who:** relay pipeline operators running `/relay-execute` (and `/relay-test` directly) against projects that legitimately have no test suite — markdown/JSON-only plugins (the relay repo itself is the canonical case), doc-only repos, IaC-only repos, or any project where `docs/context/methodology.md` declares `test_frameworks: []`.
- **Current behavior:** invokes `/relay-execute <prd-path>`; expects either green-end-to-end or a semantically-correct HALT. Today receives a `FAILED_INFRA_UNRECOVERABLE` for what is actually a "no framework configured by design" state, with inconsistent post-halt resolution.
- **Trigger:** any phase of the autonomous pipeline that reaches Phase A.5 against a framework-less project.
- **Success state:** the test stage logs a structured `skipped_no_test_framework` entry, the orchestrator continues, and the final outcome is `ALL_PHASES_COMPLETE` — deterministically, across sessions.

**Job to Be Done**
When my project legitimately has no test suite (because it's prompt+config, not code), I want `/relay-test` and `/relay-execute` to recognize that as a declared state and skip the test stage gracefully, so I can run the autonomous pipeline end-to-end without false `FAILED_INFRA_UNRECOVERABLE` halts or inconsistent post-halt outcomes.

**Non-Users**
- Projects with `test_frameworks: ["pytest"]` (or any non-empty list) — the strict precondition chain is preserved unchanged.
- Projects with genuine infra failures (docker down, missing `settings.json` when a framework IS declared, container failure, normalizer crash) — also retain the strict `FAILED_INFRA_UNRECOVERABLE` path.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `/relay-test` Phase 0 self-skip gate on `test_frameworks: []` or methodology.md absent, emitting verbatim `Test framework inactive (test_frameworks: []). Skipping.` and exit 0 | Core fix; symmetric to `/relay-tdd` P4.a |
| Must | `/relay-execute` Phase A.5.0 explicit handling of `skipped_no_test_framework` outcome with `orchestrator_run_log` entry analogous to A.3.5's `skipped_tdd_false` | Closes the dogfood-B inconsistency at the orchestrator layer |
| Must | `docs/decisions.md` entry codifying the rule, citing dogfood evidence and 2026-05-06 TDD self-skip as precedent | Future agents consulting the Decision Gate must find this entry |
| Must | Preserve `FAILED_INFRA_UNRECOVERABLE` for genuine infra failures (missing `settings.json` *when* framework declared, docker down, container failure, normalizer crash) | Strict semantics retained where applicable |
| Should | v0.11.1 release cut: `plugin.json` bump, `changelog.html` entry, `api-reference.md` + `commands.html` `/relay-test` kv-block updates | Surfaces the change to external users |
| Should | Documentation cross-reference: `/relay-test-review` inheritance (self-skips when run.json absent) documented explicitly, not silently inherited | D5 of original argument; AC-6 |
| Could | Update `plugins/relay/agents/test-runner.md` (line 281 graceful-degradation table; lines 69, 91 emission sites) to reflect that `no_test_framework` ABORT_INFRA becomes defensive dead code | Coherence with the new command-level contract |
| Won't | Auto-detection of test frameworks (heuristic activation) | Explicit anti-pattern per `docs/anti-patterns.md:43-48` |
| Won't | Changing `FAILED_INFRA_UNRECOVERABLE` semantics for genuine infra issues | Out of scope; preserved verbatim |
| Won't | Re-validating relay-worktree AC-16 cross-contamination methodology gap | Out of scope; separate concern |

### MVP Scope

The four Musts above. The two Shoulds ship together with the Musts in the same v0.11.1 release cut. The Could is captured as an Open Question for the implementer to decide.

### User Flow

Operator invokes `/relay-execute <prd-path>` against a project with `methodology.md` declaring `test_frameworks: []` → orchestrator iterates phases → reaches A.5 for phase N → A.5.0 reads methodology.md, detects `test_frameworks: []`, appends `{phase: N, stage: "test", outcome: "skipped_no_test_framework"}` to `orchestrator_run_log`, proceeds to A.6 → all phases complete → `ALL_PHASES_COMPLETE`. Deterministic across sessions. Standalone `/relay-test` invocation against the same project emits the verbatim Phase 0 self-skip line and exits 0 without writing artifacts.

---

## Technical Approach

**Feasibility:** HIGH

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### Architecture Notes

- **Gate placement (dual-layer):** A command-level gate in `/relay-test` Phase 0 handles standalone invocation. An orchestrator-level gate in `/relay-execute` Phase A.5.0 handles the adoption path. Both read the same key (`methodology.md.test_frameworks`); both emit symmetric outcomes (`skipped_no_test_framework`). Dual placement is required because `/relay-execute` does not currently read `methodology.md.test_frameworks` directly (it delegates to inline `/relay-test` adoption per the D7 dispatch model) — leaving the orchestrator gate implicit would reproduce the dogfood-B inconsistency.
- **Verbatim-line discipline:** the new `/relay-test` Phase 0 line `Test framework inactive (test_frameworks: []). Skipping.` matches `/relay-tdd` P4.a's `TDD track inactive (tdd: false). Skipping.` shape character-for-character (subject + adjective `inactive` + parenthetical key:value + `Skipping.`) — enables grep-friendly cross-command discovery and signals the symmetry to future readers.
- **Strict-path preservation:** the genuine-infra triggers (`missing_settings_json` *when framework declared*, `docker_not_running`, `db_unreachable`, `container_not_found`, normalizer failure) remain unchanged. Only the `no_test_framework` ABORT_INFRA branch in `plugins/relay/agents/test-runner.md` (lines 69, 91, 281) becomes defensive — intercepted upstream by the command-level Phase 0 gate.
- **`/relay-test-review` inheritance (D5):** `/relay-test-review`'s existing precondition check requires `run.json` to exist; when `/relay-test` self-skips no `run.json` is written, so `/relay-test-review` self-skips inheritedly. No code change required; the new decisions.md entry documents this as the operative contract.
- **Industry precedent:** this is a well-established pattern (pytest exit-5, Jest/Vitest `--passWithNoTests`, GitLab CI `rules:exists`) — not a relay novelty. The PRD aligns relay's protocol with the broader CI/orchestrator world.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The self-skip gate accidentally swallows a genuine infra failure (e.g., `methodology.md` present with `test_frameworks: []` AND broken Docker) | L | Gate fires only on the "no framework configured" precondition; framework-declared projects fall through to strict semantics. AC-3 explicitly tests the framework-declared-but-infra-broken case |
| `test-runner.md` agent still emits `no_test_framework` ABORT_INFRA after the command-level gate is in place, creating dead code | M | Could-item in MoSCoW: update agent emission sites in the same release. If deferred, the branch is defensive (never reached) — non-blocking |
| Patch-vs-minor bump misclassification | L | Per `documentation/AGENTS.md:334-352`, behavior change under existing commands without new pages = patch (v0.11.1). Plan locks in v0.11.1 |
| The new outcome code `skipped_no_test_framework` collides with an existing outcome elsewhere | L | grep confirms no existing use as an outcome code; it appears only in `PRPs/reports/relay-worktree/dogfood.md:78` as a one-off observed-behavior reference, which this PRD now formalizes |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | /relay-test Phase 0 gate | Insert a Phase 0 self-skip gate at the top of the precondition chain in `plugins/relay/commands/relay-test.md`: read `methodology.md.test_frameworks`; on `[]` or file-absent, emit verbatim `Test framework inactive (test_frameworks: []). Skipping.` and exit 0. Preserve strict-halt path for framework-declared projects. Update the Graceful degradation summary table to reflect the new outcome. | complete | - | - | PRPs/plans/completed/test-frameworks-empty-self-skip-phase-1-relay-test-phase-0-gate.plan.md |
| 2 | /relay-execute Phase A.5.0 explicit handling | Add new Step A.5.0 (between A.5 entry and A.5.1 command-exists check) that re-reads `methodology.md.test_frameworks`. On `[]` or file-absent, append `{phase: <N>, stage: "test", outcome: "skipped_no_test_framework"}` to `orchestrator_run_log` and proceed to Phase A.6. Document the de-facto contradictory `FAILED_INFRA_UNRECOVERABLE → ALL_PHASES_COMPLETE` path observed in dogfood-B is now structurally impossible. | complete | - | 1 | PRPs/plans/completed/test-frameworks-empty-self-skip-phase-2-relay-execute-phase-a50-explicit-handling.plan.md |
| 3 | docs/decisions.md codification entry | New 2026-MM-DD entry titled "Test framework absence is a silent self-skip in /relay-test (symmetric with /relay-tdd self-skip on tdd: false)". Cite `PRPs/reports/relay-worktree/dogfood.md:278-283` as driving evidence. Declare symmetry with 2026-05-06 entry. Document the strict-vs-graceful boundary (framework-not-declared = self-skip; framework-declared-infra-broken = strict halt). Include D5 paragraph documenting `/relay-test-review` inheritance. | complete | - | 1,2 | PRPs/plans/completed/test-frameworks-empty-self-skip-phase-3-docsdecisionsmd-codification-entry.plan.md |
| 4 | Docs site + v0.11.1 patch release cut | Update `docs/api-reference.md` `/relay-test` and `/relay-execute` rows. Update `documentation/commands.html` `/relay-test` kv-block with new `skipped_no_test_framework` outcome. Append `documentation/changelog.html` v0.11.1 entry (2026-MM-DD) citing dogfood evidence. Bump `plugins/relay/.claude-plugin/plugin.json` 0.11.0 → 0.11.1 per `documentation/AGENTS.md:334-352`. | complete | - | 1,2,3 | PRPs/plans/completed/test-frameworks-empty-self-skip-phase-4-docs-site-v0111-patch-release-cut.plan.md |

### Phase Details

**Phase 1: /relay-test Phase 0 gate**
- **Goal:** Make `/relay-test` semantically correct for framework-less projects when invoked standalone.
- **Scope:** Single edit to `plugins/relay/commands/relay-test.md` — insert Phase 0 between argument-parse and current Preconditions check (P1–P5). Update the Graceful degradation summary table row for "Worktree has no test framework".
- **Success signal:** `grep -n "Test framework inactive" plugins/relay/commands/relay-test.md` returns the verbatim line at the Phase 0 location; running the standalone command against a `test_frameworks: []` worktree emits the line and exits 0.

**Phase 2: /relay-execute Phase A.5.0 explicit handling**
- **Goal:** Make `/relay-execute` produce a deterministic structured log entry for framework-less projects, closing the dogfood-A vs dogfood-B inconsistency at the orchestrator layer.
- **Scope:** Single edit to `plugins/relay/commands/relay-execute.md` — insert Step A.5.0 immediately above Step A.5.1. The new step re-reads `methodology.md` (re-read protects against mid-flow mutations, same discipline as A.3.5.0).
- **Success signal:** `orchestrator_run_log` schema accepts the new outcome; two parallel sessions against framework-less PRDs produce identical `skipped_no_test_framework` entries (AC-5).

**Phase 3: docs/decisions.md codification entry**
- **Goal:** Future agents consulting the Decision Gate find the operative rule for the `test_frameworks: []` case.
- **Scope:** Append new entry to `docs/decisions.md` following the four-field shape of the 2026-05-06 TDD entry. Five-paragraph minimum: Context (dogfood evidence), Decision (the rule), Reason (symmetry with 2026-05-06), Areas affected, D5 paragraph on `/relay-test-review` inheritance.
- **Success signal:** entry is appended; `grep -n "test_frameworks: \[\]" docs/decisions.md` returns the new entry; the 2026-05-06 entry's "Areas affected" is NOT modified (entries are append-only).

**Phase 4: Docs site + v0.11.1 patch release cut**
- **Goal:** External documentation surface coherence (AC-8).
- **Scope:** Four-file release cut per `documentation/AGENTS.md` §7.5 three-file registration rule + changelog: `docs/api-reference.md`, `documentation/commands.html` (kv-block + nav + search index if new outcome surfaces in search), `documentation/changelog.html` (new v0.11.1 entry), `plugins/relay/.claude-plugin/plugin.json` (version bump).
- **Success signal:** all four files show v0.11.1 and the new outcome code; `git diff --stat` shows exactly these four files plus the two command files from Phases 1-2 and the decisions.md entry from Phase 3.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| D1 — Self-skip line shape | Mirror `/relay-tdd` P4.a verbatim shape: `<Subject> inactive (<key>: <value>). Skipping.` | Free-form message; different parenthetical format; no verbatim mandate | Grep-friendly cross-command discovery; signals symmetry to future readers; matches 2026-05-06 precedent |
| D2 — Outcome-code name | `skipped_no_test_framework` (formalize the de-facto name observed in dogfood-A) | `skipped_test_frameworks_empty`; `skipped_test_inactive`; `skipped_no_framework` | Already used inconsistently in dogfood-A's session; this PRD canonicalizes that name; semantically clearest (the framework, not the suite, is absent) |
| D3 — File-absent treatment | Identical to `test_frameworks: []` (graceful self-skip, no halt) | Hard-abort on file-absent (treat as "context-builder not run") | Symmetric to `/relay-tdd` P4.a's "tdd:false OR file absent" branch; framework absence with no methodology declared is the default-state of an un-onboarded project |
| D4 — `FAILED_INFRA_UNRECOVERABLE` boundary | Preserved verbatim for genuine infra issues: missing `settings.json` *when framework declared*, docker not running, container failure, normalizer failure | Migrate all `FAILED_INFRA_UNRECOVERABLE` cases to graceful; deprecate the code entirely | Strict halt is correct for genuine infra brokenness; the gate fires only on the "no framework configured" precondition; AC-3 explicitly tests this boundary |
| D5 — `/relay-test-review` inheritance | No code change to `/relay-test-review`; already self-skips when `run.json` is absent (which is the new self-skip's natural state); inheritance documented in the decisions.md entry as an explicit operative paragraph | Add an explicit `/relay-test-review` Phase 0 gate symmetric to `/relay-test`'s | The natural inheritance already produces the correct behavior; explicit documentation is sufficient; avoids redundant gate placement |
| D6 — Version bump | Patch (v0.11.0 → v0.11.1) | Minor (v0.12.0) framing as protocol-semantics change | Per `documentation/AGENTS.md:334-352`, behavior change under existing commands without new pages = patch; no new pages added in this release; AGENTS.md §7.5 binding |

---

## Research Summary

**Market Context**

The proposed self-skip pattern is well-established in the broader CI/orchestrator ecosystem, not a relay novelty:

- pytest defines exit code 5 ("no tests were collected") as a first-class state distinct from exit code 1 ("tests failed"), and the long-running [pytest #2393](https://github.com/pytest-dev/pytest/issues/2393) issue (open since 2016) explicitly raises the new-project/test-free-project use case as a CI failure mode requiring opt-in remap.
- Jest and [Vitest both ship `--passWithNoTests`](https://vitest.dev/config/passwithnotests) as an explicit opt-in flag for "no tests found = exit 0" — direct evidence that mature test runners treat "no framework / no tests" as a distinct, non-failure state that requires opt-in signaling.
- A March 2024 [Nx #22139](https://github.com/nrwl/nx/issues/22139) regression shows the exact failure mode of NOT forwarding `passWithNoTests` through an orchestrator layer — projects with no test files started failing CI. This is the structural analogue of the dogfood-B inconsistency: each orchestration layer (test runner, monorepo orchestrator, CI system) must independently forward the "no-tests-ok" signal or the default collapses to hard failure.
- [GitLab CI's `rules:exists`](https://docs.gitlab.com/ci/jobs/job_rules/) is platform-level encoding of the same pattern: skipped jobs ≠ failed jobs; the platform distinguishes "no matching rule fired" (skipped, non-blocking) from "execution produced errors" (failed).

**Technical Context**

The relay codebase already encodes the exact pattern this PRD applies symmetrically:

- Reference pattern to mirror: `plugins/relay/commands/relay-tdd.md:116-134` — P4.a (`tdd: false` or methodology.md absent → emit verbatim line and exit 0), P4.b (`tdd: true` + empty `test_frameworks` → hard abort), P4.c (`tdd: true` + non-empty → proceed). This three-branch gate at the top of the precondition chain is the canonical structure to replicate.
- Orchestrator-level reference: `plugins/relay/commands/relay-execute.md:353-361` — Phase A.3.5.0 re-reads `methodology.md` and appends `{phase: N, stage: "tdd", outcome: "skipped_tdd_false"}` to `orchestrator_run_log` on the self-skip branch. The new Phase A.5.0 mirrors this exactly.
- Strict-halt sites to evolve: `plugins/relay/commands/relay-test.md:146-147` (canonical strict-halt encoding); `plugins/relay/agents/test-runner.md:69,91,238,281` (three ABORT_INFRA emission sites with `missing_settings_json` / `no_runner_detected` / `no_test_framework` reasons); `plugins/relay/commands/relay-execute.md:518` (HALT-propagation site in Phase A.5.2).
- Cite target: `PRPs/reports/relay-worktree/dogfood.md:78-81` (dogfood-A vs dogfood-B observed paths) and `dogfood.md:278-283` ("Protocol inconsistency surfaced" passage with the explicit proposed-fix paragraph).
- Format precedent for the new decisions.md entry: `docs/decisions.md:421-437` (the 2026-05-06 TDD self-skip entry's four-field Context/Decision/Reason/Areas-affected shape).
- Version bump rule: `documentation/AGENTS.md:334-352` confirms patch (v0.11.1) is correct for behavior change under existing commands without new pages.

Surfaced gap (no PRD source): the Test Runner PRD lives only as rendered HTML in `documentation/roadmap/test-runner-prd.html` with no canonical Markdown source in `PRPs/prds/`. Not blocking for this PRD, but flagged for future cleanup.

---

*Generated: 2026-05-12*
*Approved: 2026-05-12*
*Status: APPROVED*
