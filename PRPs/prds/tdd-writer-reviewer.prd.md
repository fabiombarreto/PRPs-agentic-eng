# TDD Writer + Reviewer (B7/B8 trilho TDD)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting feature (two new agents + two new commands), reuse/creation of components, impact on /relay-execute orchestrator, impact on the writer/reviewer command surface, methodology.md contract consumer
- Decisions found:
  - 2026-04-19 TDD activation is opt-in by explicit declaration only (heuristics MUST NOT activate the track)
  - 2026-04-19 Methodology declaration lives in `docs/context/methodology.md` (key `tdd: true|false`)
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/`
  - 2026-04-19 Interactivity boundary: TDD pair runs autonomously (post-PRD)
  - 2026-04-19 Command surface: `/relay-tdd` (writer) + `/relay-tdd-review` (reviewer) split, self-skip when `tdd: false`
  - 2026-04-19 PRD template fork (canonical PRD shape)
  - 2026-04-30 Reviewer agents lack `Edit`; status flips owned by their command (precedent for `/relay-tdd-review`)
  - 2026-04-30 Implementer Bash tool allowlist gate — agent declares Bash open; project `.claude/settings.json` is the security boundary (precedent for B8 dynamic R-RED-LEGITIMATE)
  - 2026-05-01 Dispatch model: inline command-protocol adoption via Read (D7 of /relay-execute)
  - 2026-05-01 State machine: source PRD's Implementation Phases table IS the state machine (D6)
  - 2026-05-01 Per-stage retry budget composition: orchestrator owns session-level budgets (D3)
  - 2026-04-30 Plugin manifest version bump on every minor/major release
- Applicable anti-patterns:
  - Writing TDD tests that mirror imagined implementation (the failure mode B8 must catch)
  - Activating TDD by heuristic (forbidden — only `tdd: true` activates)
  - Weakening/deleting tests to make the auto-correction loop turn green (downstream B4 invariant the B8-APPROVED suite must protect)
  - Writing pipeline artifacts under `.claude/`
- Applicable architectural rules:
  - Plugin assets live under `plugins/relay/agents/` and `plugins/relay/commands/`
  - Pipeline artifacts under `PRPs/` (TDD outputs include `PRPs/reports/<feature>/tdd-initial-suite.diff` and `tdd-reviews.md` per planejamento §B6/C4)
  - Writer/reviewer split with reviewer command owning DRAFT→APPROVED flip
  - TDD pair slots between Plan Reviewer and Implementer in `/relay-execute`
  - The TDD suite produced by B8-APPROVED is the contract; B4 must not weaken it
  - D17 of `implementation-authoring.prd.md` (R-X strict): `code-reviewer` blocks ANY test-file edits by `implementer` in standard mode — this PRD does NOT relax R-X; B7 is the authorized author of new test files
- Result: PROCEED
```

## Problem Statement

`/relay-execute` (v0.9.0, shipped 2026-05-01) cannot atravessar the pipeline end-to-end for any feature whose Acceptance Criteria require new test files. The R-X strict rule in `code-reviewer` (D17 of `implementation-authoring.prd.md`) blocks any test-file edit by the `implementer` in standard mode — even purely additive edits — and the `plan-reviewer`'s APPROVAL of a plan that lists test files in "Files to Change" is NOT treated as an authorized bypass. The cost of not solving this is that every feature requiring test additions falls back to manual implementation, defeating the "single prompt → PR" promise that justifies the entire `relay` plugin.

## Evidence

- Three concrete halts on the user's current real-world `/relay-execute` runs: Phase 2 (xfail removal blocked by R-X), Phase 3 (AC-5 test addition blocked), Phase 4 (avoided by direct manual implementation, breaking autonomy).
- `relay-execute.md:145-153` already reserves a dead-code routing branch for B7/B8 (P5 reads `methodology.md`, AC-11 emits routing note, D5 declares "never invoke /relay-tdd in MVP") — confirming the integration point was always planned but pending agent ship.
- `docs/anti-patterns.md:24-29` lists "Writing TDD tests that mirror imagined implementation" with `[INFERRED - VALIDATE]` because B7/B8 are unshipped — the entire anti-pattern record was waiting for this PRD.
- TDD-Bench Verified (arxiv 2412.02883) defines `tddScore = failToPass × adequacy`, the formula that distinguishes "expected red" (fails on old code, passes on new) from "broken setup" — directly applicable as the B8 R-RED-LEGITIMATE check.
- Documentation page `documentation/concepts/tdd-track.html:131-134` already names the five B8 pathologies canonically; `documentation/reference/commands.html:69-115` already has stub rows for `/relay-tdd` and `/relay-tdd-review` — registration scaffolding is in place, only the agent + command files are missing.

## Proposed Solution

Ship two new agents (`tdd-writer` = B7, `tdd-reviewer` = B8) and two new commands (`/relay-tdd`, `/relay-tdd-review`), modeled structurally on the `plan-writer` ↔ `plan-reviewer` pair (writer autonomous + reviewer auto-flip + JSONL audit log), and amend `/relay-execute` to invoke the pair between `/relay-worktree` and `/relay-implement` when `methodology.md` declares `tdd: true`. The TDD pair becomes the **authorized mechanism** for creating test files in the autonomous pipeline, preserving R-X strict (the implementer never edits tests). B7 reads PRD Acceptance Criteria + APPROVED plan and emits per-AC outcomes (`NEW_TEST_REQUIRED` writes a test, `EXISTING_TEST_COVERS` documents the mapping, `AMBIGUOUS` aborts). B8 applies a five-item rubric (implementation leak, trivial assert, mock abuse, AC coverage gap, duplicate-without-discriminative-value) plus a hybrid static+dynamic R-RED-LEGITIMATE check (runs the suite when the framework is executable; degrades to `passed: null` with `reason` when not). The orchestrator-level retry budget `max_tdd_review_retries=2` lives in `/relay-execute`, mirroring `max_plan_review_retries`.

## Key Hypothesis

We believe **a TDD Writer dedicated to creating test files plus a TDD Reviewer applying a structured five-pathology rubric** will **eliminate R-X strict halts in `/relay-execute`** for the relay maintainer running it on `tdd: true` projects. We'll know we're right when (a) `/relay-execute` in phoenix and sisalfa traverses Plan→TDD→Implement→Test→PR without manual fallback in ≥3 consecutive features per project, and (b) the B7-produced suite that B8 APPROVES is red for the legitimate reason (`failToPass=1` semantics) and turns green after implementation without `code-reviewer` ever needing to weaken or skip a test.

## What We're NOT Building

- **Relaxing R-X strict (D17 of `implementation-authoring.prd.md`)** — preserved verbatim. Test-file edits by `implementer` remain forbidden in standard mode. Any reopening of D17 is a separate PRD.
- **Activating the TDD pair by heuristic** — anti-pattern preserved. Only explicit `tdd: true` activates.
- **B7 modifying existing test files** — B7 only creates new tests or documents existing-coverage mappings. Modifications to existing tests are out of pipeline scope.
- **TDD pair for `tdd: false` or missing `methodology.md`** — silent self-skip; current behavior preserved.
- **Quantitative mock-count threshold** — deferred to Could-item; calibrated post-dogfood. MVP uses 4 syntactic-categorical detections.
- **Mutation testing or coverage thresholds beyond AC-coverage tracing** — out of scope.
- **Reopening APPROVED PRDs** — out of scope per `prd-reviewer` `already_approved` precondition.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| End-to-end `/relay-execute` traversal on `tdd: true` projects | ≥3 consecutive features in phoenix and ≥3 in sisalfa with outcome `MERGED`, no manual fallback | `orchestrator-run.json` artifact at `PRPs/reports/<feature>/` |
| B7 suite is red-for-legitimate-reason | 100% of B8-APPROVED suites satisfy `failToPass=1` (red before impl, green after, suite unchanged across the boundary) | Compare `tdd-initial-suite.diff` (red run) with post-implementation run (green); no edits to test files in `diff.patch` per-attempt artifacts |
| B8 detects synthetic five-pathology fixture | Rubric returns `CHANGES_REQUESTED` with ≥1 finding per category (implementation-leak, trivial-assert, mock-abuse, AC-coverage-gap, duplicate-without-discriminative-value) | Fixture at `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/` |
| R-X invariant preserved end-to-end | 0 `TEST_CONTRACT_DISPUTE` from `code-reviewer` in dogfood `/relay-execute` runs with `tdd: true` | Audit `code-review.jsonl` across N runs |

## Acceptance Criteria (test scenarios)

- **AC-1 Self-skip on tdd:false** — Given `methodology.md` has `tdd: false`, when `/relay-tdd <plan-path>` is invoked standalone, then the command exits 0 without writing any artifact and prints exactly `TDD track inactive (tdd: false). Skipping.`
- **AC-2 Self-skip on missing methodology.md** — Given `docs/context/methodology.md` does not exist at the target root, when `/relay-tdd` runs, then it treats the absence as `tdd: false` and self-skips identically to AC-1.
- **AC-3 Hard-abort on tdd:true + no test framework** — Given `methodology.md` has `tdd: true` AND `test_frameworks: []` (or absent), when `/relay-tdd` runs, then it halts with the actionable message `TDD track active but no test framework declared. Run context-builder *update or remove tdd:true.` and exits with non-zero status. No agent invocation.
- **AC-4 Writer produces red suite (failToPass=1)** — Given `tdd: true`, an APPROVED PRD, and an APPROVED plan, when `/relay-tdd` runs, then B7 commits only test files (zero production code in the diff), and the initial run of the suite fails because of assertion failures (not import/compile errors), and a subsequent run after the implementer satisfies the contract turns green without any edit to those test files.
- **AC-5 Writer aborts on PRD ambiguity** — Given a PRD AC that lacks Given/When/Then concreteness or unambiguous input/output, when B7 cannot derive a discriminative test for that AC, then it emits a structured halt message identifying the ambiguous AC by name and exits without committing partial test files.
- **AC-6 Reviewer rubric detects all five pathologies** — Given the synthetic B8 fixture (`PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/`) with one instance of each pathology planted, when `/relay-tdd-review` runs, then the JSONL verdict is `CHANGES_REQUESTED` with `rubric[]` containing at least one `passed: false` entry per id: `R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`.
- **AC-7 Reviewer APPROVES clean suite** — Given a hand-written clean suite covering all PRD ACs without any of the five pathologies, when `/relay-tdd-review` runs, then verdict is `APPROVED`, the suite's status flips DRAFT→APPROVED via the command's Edit, and one APPROVED line is appended to `PRPs/plans/<basename>.tdd-review.jsonl`.
- **AC-8 JSONL audit log shape** — Every B8 verdict appends exactly one JSON line to `PRPs/plans/<basename>.tdd-review.jsonl` with schema `{timestamp, verdict, rubric:[{id, passed, reason?}], action, user_message}` where `passed` ∈ `{true, false, null}` and `null` is reserved for degraded-environment cases (see AC-13). Append is atomic Read+concat+Write; no short-circuit.
- **AC-9 Orchestrator-level retry budget** — Given `tdd: true` and `/relay-execute` running, when B8 returns `CHANGES_REQUESTED` twice consecutively for the same plan, then the orchestrator halts with HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED`, the partially-written suite stays in the worktree, and `orchestrator-run.json` records the budget exhaustion. Default `max_tdd_review_retries=2`, value `0` forbidden.
- **AC-10 /relay-execute integration** — Given `tdd: true`, when `/relay-execute <prd-path>` runs against an APPROVED PRD, then the orchestrator adopts `/relay-tdd` then `/relay-tdd-review` protocols inline (per D7 dispatch model) between `/relay-worktree` and `/relay-implement`, and the orchestrator retries `/relay-tdd` with the previous JSONL verdict appended as feedback when B8 returns `CHANGES_REQUESTED`. Given `tdd: false` or missing `methodology.md`, the routing branch self-skips silently (current dead-code behavior preserved as live no-op).
- **AC-11 R-X invariant preserved end-to-end** — Given `tdd: true` and a `/relay-execute` run that reaches `/relay-implement`, when the `code-reviewer` evaluates the implementer's diff in standard mode, then 0 file edits to test files appear in `diff.patch` per-attempt artifact, no R-X check fires, and no `TEST_CONTRACT_DISPUTE` is emitted.
- **AC-12 Existing-coverage path** — Given `tdd: true` and a plan whose ACs are all already covered by existing tests, when B7 runs, then for each AC it emits one of three outcomes (`NEW_TEST_REQUIRED`, `EXISTING_TEST_COVERS path:line`, `AMBIGUOUS`), and when ALL outcomes are `EXISTING_TEST_COVERS` the aggregate verdict is `EXISTING_COVERAGE_SUFFICIENT` — B7 writes zero test files but produces `tdd-initial-suite.diff` documenting the AC→test mapping. B8 then validates the mapping (every AC really covered?) and APPROVES if so; `/relay-execute` proceeds to `/relay-implement` without a new suite.
- **AC-13 R-RED-LEGITIMATE graceful degradation** — Given `tdd: true` but the test framework execution fails or is unavailable in B8's environment (Docker not up, missing dependency, sandbox restriction), when B8 cannot run the suite, then the rubric entry `R-RED-LEGITIMATE` is emitted with `passed: null` and `reason: "degraded — test framework execution unavailable: <details>"`. The other static rubric items still produce concrete `passed: true|false`. Verdict aggregation treats `null` as non-blocking when all other items pass.

## Open Questions

- [ ] Quantitative mock-count threshold for `R-MOCK-ABUSE` (currently 4 syntactic-categorical detections; threshold deferred to post-dogfood calibration).

---

## Users & Context

**Primary User**
- **Who:** the relay plugin maintainer running `/relay-execute` end-to-end on real target projects (currently the user, against phoenix and sisalfa).
- **Current behavior:** invokes `/relay-execute <prd-path>`; pipeline halts at the first phase requiring new test files because R-X strict blocks the implementer; falls back to manual implementation, breaking autonomy.
- **Trigger:** an APPROVED PRD with Acceptance Criteria that demand new or expanded test coverage.
- **Success state:** `/relay-execute` traverses end-to-end without manual intervention, producing a PR whose test suite was authored by B7+B8 and whose implementation satisfies that suite under R-X strict.

**Job to Be Done**
When I have an APPROVED PRD with ACs that require tests not yet present, I want a writer/reviewer pair that produces and validates the red suite before the implementer runs, so that `/relay-execute` traverses the pipeline without violating R-X strict and without manual fallback.

**Non-Users**
- Projects with `tdd: false` or missing `methodology.md` — TDD pair skips silently; current behavior preserved.
- Features whose existing test coverage already satisfies the PRD ACs — handled by AC-12 existing-coverage path; B7 documents the mapping but writes no new tests.
- Teams adopting TDD as historical methodology rather than as a structural unblock — supported, but not the MVP framing.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `tdd-writer` agent (B7) with prompt parametrized by `methodology.md → test_frameworks[]`; proibited from writing production code | Authorized author of test files under R-X strict; the structural unblock |
| Must | `tdd-reviewer` agent (B8) with five-pathology rubric + hybrid static/dynamic R-RED-LEGITIMATE | Quality gate that prevents AI-TDD failure modes from reaching the implementer |
| Must | `/relay-tdd <plan-path>` writer command, self-skip when `tdd: false` | Standalone invocation; mirrors `/relay-plan` shape |
| Must | `/relay-tdd-review <suite-path>` reviewer command, Task-dispatches B8, owns DRAFT→APPROVED flip | Mirrors `/relay-code-review` shape; preserves writer/reviewer split |
| Must | `/relay-execute` integration: remove dead-code branch; orchestrator-level loop with `max_tdd_review_retries=2`; HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` | The whole point of B7/B8 is unblocking the orchestrator |
| Must | `.tdd-review.jsonl` convention at `PRPs/plans/<basename>.tdd-review.jsonl` | Audit log paralleling `.review.jsonl` and `.code-review.jsonl` |
| Must | Output paths `PRPs/reports/<feature>/tdd-initial-suite.diff` and `tdd-reviews.md` | Honors `architecture.md` PRP artifact paths convention |
| Must | One synthetic fixture at `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/` covering all five pathologies + one clean variant | Calibrates B8 rubric and validates AC-6 + AC-7 |
| Must | Documentation: `documentation/reference/agents.html` (B7+B8 entries), `commands.html` (populate stubs), `changelog.html` v0.10.0 entry, `plugin.json` bump to `0.10.0` | Plugin manifest version-sync rule (2026-04-30 decision) |
| Should | Dogfood pass against phoenix (ExUnit) and sisalfa (framework TBD) — ≥3 features each | Validates the success metric in the wild |
| Should | New entry in `docs/decisions.md` formalizing "TDD pair is the authorized mechanism for creating test files in the pipeline (R-X strict preserved)" | Cements the architectural relationship for future agents |
| Could | Quantitative `mock_per_test` threshold calibrated post-dogfood | Currently deferred — qualitative detections suffice for MVP |
| Could | TDD-Bench `tddScore` integration as observable metric in final report | Adds quantitative quality signal but not load-bearing |
| Won't | Relax R-X strict (D17) | Separate PRD; structural invariant preserved here |
| Won't | B7 modifies existing test files | Only creates new tests or documents existing-coverage mappings |
| Won't | TDD activation by heuristic | Anti-pattern reaffirmed |
| Won't | B7/B8 for `tdd: false` or missing methodology.md | Silent self-skip preserved |

### MVP Scope

Phase 1 (agents + commands) + Phase 2 (synthetic fixture) + Phase 3 (`/relay-execute` integration) + Phase 4 (docs + manifest bump). Phase 5 (dogfood phoenix+sisalfa) validates Success Metrics in the wild but does not block the MVP code ship.

### User Flow

```
dev: /relay-execute PRPs/prds/feat-x.prd.md   (target project has tdd: true)
 └─ orchestrator: /relay-plan → /relay-plan-review → /relay-worktree
     └─ orchestrator: /relay-tdd <plan>            ← B7 writes red suite, commits
        └─ orchestrator: /relay-tdd-review <suite> ← B8 applies rubric
           ├─ APPROVED → status flips DRAFT→APPROVED, append .tdd-review.jsonl
           │   └─ orchestrator: /relay-implement   ← R-X preserved (no test edits)
           │      └─ /relay-test → /relay-test-review → /relay-pr
           └─ CHANGES_REQUESTED → orchestrator re-invokes /relay-tdd with feedback
               (max_tdd_review_retries=2; on exhaustion: FAILED_TDD_REVIEW_BUDGET_EXCEEDED)
```

---

## Technical Approach

**Feasibility:** HIGH. Every structural pattern (writer/reviewer split, JSONL audit log, command shells, Task-dispatch reviewer, orchestrator-level retry budget) is already proven in production via the `plan-writer`/`plan-reviewer` and `implementer`/`code-reviewer` pairs. Real risk is prompt quality of B8's five-pathology rubric, not infrastructure.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

Note: this PRD describes a feature *of* the relay plugin itself; the relay repository's own `methodology.md` is `tdd: false` because relay is the plugin (markdown + JSON), not a TDD target. The TDD contract this PRD specifies is exercised against **target** projects (phoenix, sisalfa) whose `methodology.md` declares `tdd: true`.

### Architecture Notes

- **Structural mirror:** B7 frontmatter mirrors `plan-writer.md` (`tools: Task, Read, Write, Edit, Glob`); B8 frontmatter mirrors `plan-reviewer.md` minus `Edit` plus `Bash` (D11 precedent for `code-reviewer` lacking Edit + 2026-04-30 implementer Bash gate). B8 tools: `Read, Write, Glob, Grep, Bash, BashOutput, Task` — explicitly omitting `Edit` (status flip is owned by `/relay-tdd-review` command, not the agent).
- **Command shells:** `/relay-tdd` follows `/relay-plan` shape (writer adopt-role inline). `/relay-tdd-review` follows `/relay-code-review` shape (Task-dispatch B8, JSONL append, status flip via command's own Edit).
- **Framework parametrization:** B7 reads `test_frameworks: [...]` from target's `methodology.md` at runtime. Empty list + `tdd: true` → AC-3 hard abort. Non-empty list → B7 generates test templates parametrized by the first framework; multi-framework projects use heuristic match between framework's test-file extension and the source module under test.
- **R-RED-LEGITIMATE hybrid check:** B8 attempts `Bash(<test-command>)` once; non-zero exit with assertion failures = legitimate red; non-zero exit with import/compile errors = `R-RED-BROKEN-SETUP` finding; zero exit = `R-RED-NOT-LEGITIMATE` finding. If `Bash` fails outright (framework not installed, Docker down) → `passed: null` with `reason` (AC-13).
- **R-MOCK-ABUSE syntactic-categorical detections (MVP, no quantitative threshold):**
  1. Mock of the SUT itself (mock and assertion target are the same symbol)
  2. Mock of a concrete type where an interface/protocol exists in the codebase
  3. Mock returning another mock chained ≥3 levels deep
  4. Mock with only `was_called` / `assert_called` assertions and no assert on the effect or return value
- **Orchestrator integration:** `/relay-execute` D5 entry evolves from "never invoke /relay-tdd in MVP" to "invoke /relay-tdd → /relay-tdd-review loop between /relay-worktree and /relay-implement when tdd: true; budget = max_tdd_review_retries=2". The current dead-code branch at `relay-execute.md:145-153` is replaced by the live integration. New HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` joins the existing seven HALT codes documented in the relay-execute PRD.
- **Decisions.md amendment:** new entry dated 2026-05-06 codifying the relationship "B7 is the only agent authorized to create test files in the autonomous pipeline; R-X strict invariant in code-reviewer is preserved verbatim".

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| B7 writes tests that mirror imagined implementation (the failure mode being prevented) | M | B8 R-IMPL-LEAK rubric using oracle/graal-style heuristics: assert on private method/field, count of calls to a specific method, test name matching internal method name. Plus synthetic fixture with leak planted (AC-6) calibrates rubric pre-dogfood. |
| B7 produces suite that fails for setup reasons, not feature absence (`failToPass=0`) | M | B8 R-RED-LEGITIMATE hybrid check uses TDD-Bench tddScore semantics; distinguishes assertion-failure red from import/compile-error red. Degrades gracefully (AC-13) when framework unavailable. |
| Mock abuse escapes static detection (semantic gap) | M | MVP relies on the four syntactic-categorical detections. Could-item: quantitative threshold calibrated post-dogfood. False negatives surfaced in dogfood drive Phase-6-style decision evolution, not blocking ship. |
| `/relay-execute` integration introduces orchestration regression | L | Orchestrator-level integration follows the established D7 dispatch model and D3 budget composition pattern. AC-10 explicitly tests both branches (`tdd: true` and `tdd: false`). |
| sisalfa test framework unknown at PRD time | L | TBD - needs validation via context-builder run on sisalfa before Phase 5 dogfood. Phase 1 implementation uses ExUnit (phoenix) as the reference framework for the synthetic fixture. |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Agent files + commands MVP | `tdd-writer.md`, `tdd-reviewer.md`, `relay-tdd.md`, `relay-tdd-review.md` — agents and commands without orchestrator integration; standalone invocation only | complete | - | - | PRPs/plans/completed/tdd-writer-reviewer-phase-1-agent-files-commands-mvp.plan.md |
| 2 | Synthetic B8 fixture + rubric calibration | One fixture with five pathologies planted (validates AC-6) + one clean variant (validates AC-7) at `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/` | complete | - | 1 | PRPs/plans/completed/tdd-writer-reviewer-phase-2-synthetic-b8-fixture-rubric-calibration.plan.md |
| 3 | `/relay-execute` integration | Remove dead-code branch in `plugins/relay/commands/relay-execute.md`; insert orchestrator-level loop B7↔B8 with `max_tdd_review_retries=2`; emit HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` on budget exhaustion; amend D5 entry | complete | - | 1, 2 | PRPs/plans/completed/tdd-writer-reviewer-phase-3-relay-execute-integration.plan.md |
| 4 | Documentation + manifest bump v0.10.0 | Populate `documentation/reference/agents.html` (B7+B8), `commands.html` (existing stubs), `changelog.html` (v0.10.0 entry), bump `plugins/relay/.claude-plugin/plugin.json` to `0.10.0`, append decisions.md entry dated 2026-05-06 | complete | - | 3 | PRPs/plans/completed/tdd-writer-reviewer-phase-4-documentation-manifest-bump-v0-10-0.plan.md |
| 5 | Dogfood phoenix + sisalfa | ≥3 features traversed end-to-end in phoenix (ExUnit) and ≥3 in sisalfa (framework TBD via context-builder) without manual fallback; validates Success Metrics in the wild | pending (operator action — runs from external phoenix/sisalfa repos, not from this orchestrator invocation) | - | 4 | - |

### Phase Details

**Phase 1: Agent files + commands MVP**
- **Goal:** ship the four artifacts (two agents, two commands) such that standalone `/relay-tdd` and `/relay-tdd-review` invocations work end-to-end against any plan path.
- **Scope:** `plugins/relay/agents/tdd-writer.md`, `plugins/relay/agents/tdd-reviewer.md`, `plugins/relay/commands/relay-tdd.md`, `plugins/relay/commands/relay-tdd-review.md`. Frontmatter, full protocol prose, anti-patterns, output schemas. No orchestrator integration in this phase.
- **Success signal:** standalone invocation in a target project with `tdd: true` produces a B7 suite + B8 verdict + JSONL line; standalone invocation with `tdd: false` self-skips.

**Phase 2: Synthetic B8 fixture + rubric calibration**
- **Goal:** produce a fixture that exercises every B8 rubric item, calibrating the rubric prompt against known-bad and known-good inputs before integrating into `/relay-execute`.
- **Scope:** `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/` containing one suite with deliberate instances of all five pathologies, plus a clean variant. Manual validation that `/relay-tdd-review` returns `CHANGES_REQUESTED` with ≥1 finding per id on the dirty fixture and `APPROVED` on the clean fixture.
- **Success signal:** AC-6 and AC-7 pass against the fixture.

**Phase 3: /relay-execute integration**
- **Goal:** replace the dead-code routing branch in `relay-execute.md` with a live orchestrator-level loop that adopts `/relay-tdd` and `/relay-tdd-review` protocols inline (per D7).
- **Scope:** edit `plugins/relay/commands/relay-execute.md` (remove dead-code at `:145-153`; insert live loop with budget); amend D5 entry; emit `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` on budget exhaustion; record budget consumption in `orchestrator-run.json`.
- **Success signal:** AC-10 passes both branches (`tdd: true` and `tdd: false`); AC-9 emits the HALT code on forced double-CHANGES_REQUESTED; AC-11 confirms zero R-X disputes.

**Phase 4: Documentation + manifest bump v0.10.0**
- **Goal:** complete the documentation surface and align the plugin manifest with the changelog per the 2026-04-30 version-sync rule.
- **Scope:** `documentation/reference/agents.html` adds B7+B8 entries; `commands.html` populates the stub rows for `/relay-tdd` and `/relay-tdd-review` with full contract (preconditions, output, behavior under `tdd: false`); `changelog.html` adds a v0.10.0 entry naming the four shipped artifacts and the `/relay-execute` amendment; `plugins/relay/.claude-plugin/plugin.json` bumps to `0.10.0`; `docs/decisions.md` appends the 2026-05-06 entry codifying the R-X / B7 relationship.
- **Success signal:** documentation builds without dead links; plugin cache invalidates correctly on next install.

**Phase 5: Dogfood phoenix + sisalfa**
- **Goal:** validate Success Metrics in the wild against two real target projects.
- **Scope:** run `context-builder` against sisalfa to discover its test framework; declare `tdd: true` in both phoenix and sisalfa `methodology.md`; run `/relay-execute` against ≥3 features per project; capture `orchestrator-run.json` outcomes and any HALT codes; calibrate `R-MOCK-ABUSE` quantitative threshold (Could-item) if false negatives surface.
- **Success signal:** ≥3 features per project complete with `MERGED` outcome and zero manual fallback; the `code-reviewer` audit log shows zero `TEST_CONTRACT_DISPUTE`.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Driver of this PRD | R-X strict halts in `/relay-execute` (3 concrete halts on the user's runs) — the TDD pair is the structural unblock | Relax R-X strict; allow implementer to edit tests under specific conditions | Preserves the R-X invariant verbatim; adds an authorized author (B7) instead of granting bypass to an unauthorized one (implementer) |
| OQ-1 Existing-coverage handling | B7 emits per-AC outcomes (`NEW_TEST_REQUIRED`, `EXISTING_TEST_COVERS`, `AMBIGUOUS`); aggregate `EXISTING_COVERAGE_SUFFICIENT` possible | (A) B7 always writes new tests; (B) heuristic skip in B7 | C produces auditable AC→test mapping without duplicating B8's coverage logic; A would force trivial/duplicate tests; B duplicates coverage validation |
| OQ-2 Mock-abuse detection | Four syntactic-categorical detections (MVP); quantitative threshold deferred | (A) fixed threshold N=4; (C) layered-test adaptive threshold | A produces false positives in legitimate integration tests; C couples to layered-execution that may not be active; B is upgrade-able post-dogfood |
| OQ-3 Multi-framework support | B7 prompt parametrized by `methodology.md → test_frameworks[]` at runtime | (A) block PRD until sisalfa framework known; (C) ExUnit-only MVP | B keeps the agent target-agnostic; (A) blocks the PRD; (C) contracts the dogfood metric |
| OQ-4 R-RED-LEGITIMATE check | Hybrid: dynamic (Bash test execution) when framework executable; static + `passed: null + reason` when not | (A) static-only; (B) dynamic-only | C captures the strong dynamic signal in happy-path environments and degrades gracefully when infra is missing — matches `test-runner` precedent |
| OQ-5 Loop ownership | Orchestrator-level retry in `/relay-execute` with `max_tdd_review_retries=2`; commands stay single-purpose | (A) internal loop in `/relay-tdd-review`; (C) halt to user on first CHANGES_REQUESTED | B preserves writer/reviewer split symmetry across all relay command pairs; aligns with D3 of `/relay-execute` (orchestrator owns session-level budgets); doesn't violate interactivity boundary |
| B8 frontmatter `Bash` | Granted (gated by target's `.claude/settings.json`) | Reviewer remains read-only via `Glob, Grep, Read` only | Required for dynamic R-RED-LEGITIMATE check; precedent established 2026-04-30 (implementer); security boundary preserved at project allowlist |
| Plugin version target | v0.10.0 | v0.9.1 patch | Minor bump because new agents and commands ship — patch is reserved for non-feature plugin asset changes per the 2026-04-30 version-sync rule |

---

## Research Summary

**Market Context**

- **TDD-Bench Verified (arxiv 2412.02883):** defines `tddScore = failToPass × adequacy` distinguishing red-legitimate from broken-setup. Adopted as the semantic basis for B8's R-RED-LEGITIMATE rubric item. Trivial-assert example (Django django-13401, GPT-4o 0.71 vs developer 0.96 adequacy) confirms the detectable signal is "model asserts strict subset of properties the AC requires" — incorporated into R-TRIVIAL-ASSERT detection.
- **TDD Governance for Multi-Agent Code Generation (arxiv 2604.26615):** formalizes a rubric across Order/Granularity/Feedback Quality with retry cap N=3 and early termination on identical consecutive outputs. Confirms `max_tdd_review_retries=2` is on the conservative-but-defensible end of the published range.
- **Implementation-leak heuristics (oracle/graal #4808):** three concrete detectable signals — assert on private method, count of calls to a specific method, test name matching internal method name. Adopted as R-IMPL-LEAK rubric item.
- **AC-to-test traceability matrix (yrkan.com):** coverage % = (ACs with test cases) / (total ACs) × 100; one AC ≈ 3–5 test cases (positive, negative, boundary). Adopted as R-AC-COVERAGE rubric item.
- **SWT-Bench (swebench.com):** dedicated benchmark for test-generation-quality with categories Test Generation / Test Repair / Coverage Improvement; AgentCoder cites role-split (programmer/test-designer/executor) as quality factor. Validates the writer/reviewer split design choice.
- **Gaps:** no public structured rubric for test-reviewer agents in Aider/Cursor TDD/Devin/Copilot Workspace; mock-count thresholds referenced in practitioner discourse but no cite-able paper; BDD-LLM PDF (scitepress 2025) not extractable from binary.

**Technical Context**

- **Structural mirrors in the codebase:** `plugins/relay/agents/plan-writer.md:1-7` + `plan-reviewer.md:1-7` provide the cleanest writer/reviewer template (frontmatter tools, autonomous-no-dialogue protocol, JSONL append-only audit). `plugins/relay/agents/post-green-reviewer.md:247-252` is the closest precedent for a reviewer judging test quality — defers `mock_bloat`, `assertion_inversion`, `whole-file deletions` to v2; B8 explicitly extends this set.
- **JSONL schema (`PRPs/plans/relay-execute-phase-1-relay-execute-command-file.review.jsonl:1-2`):** `{timestamp, verdict, rubric:[{id, passed, reason?}], action, user_message}`. `.tdd-review.jsonl` inherits identical shape; `passed: null` is the new admitted value for AC-13 degradation case.
- **Command shell precedents:** `plugins/relay/commands/relay-plan-review.md:137-188` (adopt-role inline, lighter shape) and `relay-code-review.md:174-213` (Task-dispatch reviewer, heavier shape with explicit "no D8 mutations" no-op step). `/relay-tdd-review` adopts the Task-dispatch shape because B8's five-pathology rubric is non-trivial logic worth isolating.
- **/relay-execute reserved integration point:** `plugins/relay/commands/relay-execute.md:145-153` already has the dead-code routing branch — P5 reads `methodology.md`, AC-11 emits routing note, D5 declares "never invoke /relay-tdd in MVP". This PRD's Phase 3 turns dead code into live integration.
- **Anti-patterns marked `[INFERRED - VALIDATE]` waiting for this PRD:** `docs/anti-patterns.md:24-29` (mirror imagined impl), `:43-48` (activate by heuristic), `:15-19` (weaken to turn green). All three lose their `[INFERRED - VALIDATE]` tag when this PRD ships.
- **Documentation scaffolding already in place:** `documentation/concepts/tdd-track.html:131-134` names the five B8 pathologies canonically; `documentation/reference/commands.html:69-115` has stub rows for `/relay-tdd` and `/relay-tdd-review`. Phase 4 populates rather than authors from scratch.
- **Codebase gaps:** no existing TDD Writer agent file (B7 is built from scratch using plan-writer mirror); no `.tdd-review.jsonl` schema or path convention shipped (this PRD establishes it); no codified Implementer-↔-TDD-suite contract in `implementer.md` (Phase 1 task includes adding it). sisalfa test framework unknown — `TBD - needs validation` until context-builder runs against it before Phase 5 dogfood.

---

*Generated: 2026-05-06*
*Approved: 2026-05-06*
*Status: APPROVED*
