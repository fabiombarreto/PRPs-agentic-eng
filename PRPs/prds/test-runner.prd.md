# Test Runner

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions; cross-cutting patterns; creation of components; impact on reusable services
- Decisions found:
  - max_test_retries = 3 with explicit semantics (1 initial + up to 3 retries; flakiness retries excluded; oscillation aborts before budget)
  - PRP artifacts under PRPs/ at repo root; never under .claude/
  - Interactivity boundary: Test Runner is in the autonomous zone — must not prompt the user during a run
  - Command surface: /relay-test (B1–B4) and /relay-test-review (B5) are separate, writer/reviewer split
  - methodology.md is the single source of truth for TDD routing (tdd: true | false)
  - .claude/settings.json allowlist: narrow patterns emitted by context-builder; invariant denylist; settings.json is setup config (exception to the no-write-under-.claude rule)
- Applicable anti-patterns:
  - Weakening or deleting tests to make the loop turn green (B5 is the guard)
  - Emitting secret values in run reports or logs (A4 redaction + B6 filter)
  - Writing pipeline artifacts under .claude/ (reports go to PRPs/reports/)
  - Relying on interactive permission prompts in the autonomous loop
- Applicable architectural rules:
  - Plugin assets are markdown + JSON; agents are prompts, not code
  - Hooks reference scripts via ${CLAUDE_PLUGIN_ROOT}
  - Graceful degradation is mandatory: every component detects its preconditions and self-skips with a reported reason when absent
  - Artifacts live under PRPs/<type>/; worktrees at .worktrees/<feature>/
- Result: PROCEED
```

## Problem Statement

Testing the code an agent just wrote is the largest manual bottleneck in
the current development workflow. A developer using `prp-core` gets the
code produced autonomously but must then run the suite by hand,
interpret failures, ask the agent to fix them, re-run, and repeat — all
at a Claude Code prompt with per-command permission confirmations.
Without a Test Runner that closes the loop, the promise of "one prompt
to PR" collapses into "one prompt to code, then hours of supervision."

## Evidence

- Planning document `docs/planning/planejamento_fase_2.docx` §2.1
  identifies manual E2E testing as the current top bottleneck.
- The five problems catalogued in
  `docs/planning/dev_process_improvement_plan.html` place "testes manuais
  E2E" as problem #2, solved specifically by "container isolado + Test
  Runner com auto-correção".
- Every subsequent pillar of relay (orchestrator, approval cycle)
  depends on the Test Runner existing — without it, pillars 2 and 3
  have no autonomous path to PR.

## Proposed Solution

A Test Runner agent that takes a worktree with fresh code and returns a
green test state plus a structured execution report — without human
intervention between invocation and result. Under the hood: an isolated
Docker-based test environment, a failure classifier that separates real
bugs from flakes and infrastructure noise, an auto-correction loop
(bounded by `max_test_retries`), a post-green review that catches test
weakening, and a Markdown execution report the human can audit later.
Graceful degradation at every layer so projects without Docker, without
E2E, or without any tests still produce an auditable outcome.

## Key Hypothesis

We believe an agent that executes tests, classifies failures, loops on
corrections, and reviews the green state will close the manual-testing
bottleneck for developers running relay. We'll know we're right when
≥70% of feature sessions in the phoenix project close autonomously
(PR opened) within the `max_test_retries` budget and oscillation
aborts happen in <5% of sessions.

## What We're NOT Building

- Cross-container E2E with multiple external services (sandbox external
  APIs, remote queues) — too much integration surface for a first
  delivery; future PRD.
- Parallelization or sharding of large test suites — optimization, not
  correctness; future PRD.
- Integration with external CI systems (GitHub Actions, CircleCI) — the
  Test Runner runs locally via Docker; CI parity is future work.
- Snapshot or visual-regression testing — specialized tooling, own PRD.
- Performance or benchmark tests — Test Runner targets correctness, not
  profiling.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Autonomous closure rate | ≥ 70% of sessions finish green and open a PR without human intervention | Count of `/relay-execute` runs that reach `/relay-pr` success out of total runs, measured over the first 20 feature sessions in phoenix |
| Oscillation abort rate | < 5% of sessions | Count of B4 oscillation aborts (correction reverting files from a previous correction within the session) out of total runs |
| Environment setup time | < 30 seconds for a full `docker compose up -d` + bootstrap in phoenix | Wall-clock from `/relay-test` invocation to first test executing |
| Secret leak incidents | 0 across all PRs generated | Manual audit of the first 20 PRs for any `[REDACTED]` misses |

Baseline (before Test Runner): all of the above are manually-driven, so
closure rate = 100% manual, oscillation doesn't apply, setup time ≈
minutes, leak risk = present.

## Acceptance Criteria (test scenarios)

Mandatory. Each criterion is an observable scenario the Test Runner
must satisfy. `docs/context/methodology.md` currently declares
`tdd: false` for relay; when relay gains test infrastructure and
declares `tdd: true`, these criteria will become B7's input contract.
For now, they seed the tests that the Implementer writes alongside the
Test Runner code.

- **AC-1 Happy path green:** Given a worktree whose implementation
  passes every test in the suite, when `/relay-test <worktree>` runs,
  then it reports green on the first execution and writes
  `PRPs/reports/<feature>/final-report.md` with `attempts: 1,
  outcome: GREEN`.

- **AC-2 Auto-correction succeeds within budget:** Given a worktree
  whose implementation fails one legitimate test, when `/relay-test`
  runs, then B4 loops — run → classify → request Implementer fix →
  re-run — and reports green within `max_test_retries` attempts. The
  report shows `attempts: N, outcome: GREEN` with the per-attempt
  diff.

- **AC-3 Retry budget exhausted:** Given a worktree that fails the
  same legitimate test across the initial run and 3 retries, when
  `/relay-test` runs, then it aborts with
  `outcome: FAILED_AFTER_N_RETRIES`, attaches the per-attempt diffs,
  and does NOT open a PR.

- **AC-3b Time budget exhausted:** Given a session whose total
  wall-clock exceeds `max_test_minutes` (default 30), when the budget
  is reached — regardless of retry count remaining — then `/relay-test`
  aborts with `outcome: FAILED_TIME_BUDGET_EXCEEDED`, attaches the
  `time_breakdown` by phase, and does NOT open a PR. Outcome must be
  distinguishable from `FAILED_AFTER_N_RETRIES` so the human knows
  whether to (a) investigate convergence or (b) raise the budget / reduce
  suite size.

- **AC-4 Oscillation aborts early:** Given a correction in attempt N+1
  that reverts files modified in attempt N, when B4 detects the
  reversal, then the loop aborts before exhausting the retry budget
  with `outcome: OSCILLATION_DETECTED` and reports the conflicting
  files pair-by-pair.

- **AC-5 Flakiness does not count against budget:** Given a test that
  fails on attempt 1 and passes on retry WITHOUT any code change from
  the Implementer, when B3 reclassifies the failure as flaky after N
  retry-without-change attempts (default 2), then the session's
  `max_test_retries` budget is unaffected and the report tags the test
  as `flaky: true`.

- **AC-6 Post-green review catches test weakening:** Given a
  correction that deletes or skips a failing test to reach green,
  when `/relay-test-review <worktree>` runs, then it returns
  `CHANGES_REQUESTED` with the removed/skipped tests listed and
  `coverage_drop` reported if measurable.

- **AC-7 Graceful degradation — no Docker:** Given a target project
  without Docker installed, when `/relay-test` runs, then it falls
  back to local execution, completes the run, and the report includes
  `degradation: { docker: "not_available", risk: "contamination_between_runs" }`.

- **AC-8 Graceful degradation — no test suite:** Given a project with
  no detectable test framework, when `/relay-test` runs, then it
  exits immediately with `outcome: SKIPPED, reason: "no test suite detected"`
  and the PR description flags the PR as "not verified by tests".

- **AC-9 Secret redaction in reports:** Given a test that emits stdout
  containing a value known to be a secret per
  `docs/context/redaction-policy.md` (env var name matches a Layer 1
  wildcard or exact match; value matches a Layer 1 regex; or Layer 2
  extension in `PRPs/redaction-extensions.txt` matches), when the
  report is generated, then the value appears as `[REDACTED]` (or
  `[REDACTED_URL]` for connection strings) and the report footer
  includes `secrets_redacted: { count: N, categories: {...} }`.

- **AC-10 Report structure:** The final report at
  `PRPs/reports/<feature>/final-report.md` contains: total wall-clock
  time, `time_breakdown` by phase (`infra_setup`, `attempt_N_suite`,
  `attempt_N_correction`, `postgreen_review`), attempts count,
  per-attempt outcome and diff pointer, failure classification
  histogram, files changed by auto-correction, coverage before/after,
  components skipped with rationale, `layers:` section with
  per-layer outcome + duration + tests_run when layered execution is
  active, `secrets_redacted` footer, and (when TDD active) the TDD
  Writer initial suite diff and B8 reviews.

- **AC-11 Layered execution — detected:** Given a project with layer
  signals detected by the context-builder (separate directories,
  markers, commands, or scripts), when `/relay-test` runs and the
  unit layer fails, then subsequent layers are not executed and the
  report's `layers:` section marks them as `SKIPPED_UPSTREAM_FAILURE`.
  The first run's report also includes the activation note ("Layered
  execution enabled because X, Y, Z signals detected").

- **AC-12 Layered execution — not detected:** Given a project with no
  detectable layer signals, when `/relay-test` runs, then the full
  suite executes flat (current default behavior) and no `layers:`
  section is emitted. Report confirms `layered_execution: disabled (no signals)`.

## Open Questions

- [x] ~~Exact redaction policy: which env var names are always treated as secret sources?~~ **Resolved 2026-04-19:** three-layer policy in `docs/context/redaction-policy.md`; per-project extensions in `PRPs/redaction-extensions.txt`. See `docs/decisions.md`.
- [x] ~~Time budget as complementary stop condition~~ **Resolved 2026-04-19:** `max_test_minutes: 30` default, total wall-clock, distinct outcome `FAILED_TIME_BUDGET_EXCEEDED`. Override guidance + reassess trigger in `docs/decisions.md`.
- [x] ~~Layered execution order (unit first, E2E only if unit passes)~~ **Resolved 2026-04-19:** adaptive — auto-detected signals activate it; flat execution when no signals. Override via future `.relay.yaml`. See `docs/decisions.md`.
- [ ] In phoenix specifically: test command detection (`mix test` vs
  `mix test.e2e` vs compose-internal). Validate at implementation
  time against phoenix's actual Makefile / mix aliases.

---

## Users & Context

**Primary User**
- **Who:** Developer at the team using `relay` to deliver a feature end-to-end in Claude Code.
- **Current behavior:** Writes code themselves or via `prp-core`, then manually runs tests, interprets failures, pastes output into Claude Code for diagnosis, iterates by hand.
- **Trigger:** Approved PRD exists for a feature; the developer wants to hand off implementation and testing without babysitting.
- **Success state:** Issues `/relay-execute` and walks away. Returns to find a PR opened with a green test run and a readable report, or a clear abort with diagnostic for human decision.

**Job to Be Done**
When I have an approved PRD for a feature, I want to delegate implementation and testing to relay, so I can spend my attention on architectural decisions and reviews rather than on running tests and fixing trivial bugs.

**Non-Users**
- Teams that don't practice any automated testing — relay cannot close what doesn't exist. Those teams get the "no test suite detected" graceful-degradation path but shouldn't expect autonomy gains.
- Teams whose tests are inherently non-deterministic at scales larger than B3's flakiness-retry budget can handle — the Test Runner will abort frequently; they need to stabilize tests first.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Isolated Docker-based test environment (A1) | Deterministic state is the precondition for auto-correction to be trustworthy |
| Must | Bootstrap of known DB / services / fixtures (A2) | Without determinism, classification can't distinguish bug from state noise |
| Must | Run isolation between sessions (A3) | Auto-correction runs the same suite many times; leaked state contaminates diagnosis |
| Must | Secret-safe env injection (A4) | PRs generated by this pipeline are team-visible; secret leaks are incidents |
| Must | Test Runner agent (B1) | The dedicated agent with specialized prompt, tools, and scope |
| Must | Structured output collection (B2) | String-parsing terminal output is fragile; JUnit/JSON enables precise classification |
| Must | Failure classifier (B3) | Without this, Implementer treats every failure as bug; fragile tests get deleted |
| Must | Auto-correction loop (B4) with `max_test_retries=3` | The core value proposition of the Test Runner |
| Must | Oscillation detection in B4 | Protects the retry budget from correction-reversion cycles |
| Must | Post-green review (B5) | Closes the "pass tests by deleting them" attack surface |
| Must | Execution report (B6) | The human returns after the fact and needs one place to audit |
| Must | Time budget as complementary abort signal (`max_test_minutes: 30` default) | Retry count alone does not bound wall-clock; E2E-heavy loops burn hours before retry abort. Budget is wall-clock total; outcome `FAILED_TIME_BUDGET_EXCEEDED` when hit. See `docs/decisions.md` |
| Must | Layered execution (adaptive: auto-detect + opt-out) | Amplifies the time budget — failing fast at unit preserves budget for subsequent retries. Detection in Phase 1 of context-builder; activation transparent in first run's report. See `docs/decisions.md` |
| Should | Secrets allowlist extensible per project | Default list won't cover every team's env vars |
| Could | JSON wrapper for frameworks that emit only text | Some frameworks lack JUnit/JSON; a transformer could widen coverage |
| Could | Test selection based on diff (only tests touching changed files) | Optimization; higher signal-to-time but adds complexity |
| Won't | Parallel/sharded execution | Out of scope (see "What We're NOT Building") |
| Won't | External CI integration | Out of scope |
| Won't | Snapshot / visual testing | Out of scope |
| Won't | Performance benchmarks | Out of scope |

### MVP Scope

The first dogfooded version delivers every **Must** row above, plus the
two **Should** rows that the planning document explicitly calls out
(time budget and layered execution). **Could** rows are deferred
pending real-run telemetry.

Concretely: after MVP, running `/relay-test` against the phoenix
worktree with a failing change should:
1. Bring up phoenix's `compose.test.yml` stack in <30s.
2. Run phoenix's mix test suite (or equivalent detected command) and
   capture structured output.
3. On failure, classify each failure, send to Implementer, loop up to
   3 retries.
4. On green, run B5 post-green review against the baseline.
5. Emit a report to `PRPs/reports/<feature>/` and return structured
   outcome.

### User Flow

Shortest journey to value (autonomous happy path):

1. Developer invokes `/relay-execute <prd-path>`.
2. Orchestrator reaches the Test Runner step with a worktree containing
   the Implementer's changes.
3. `/relay-test <worktree>` boots the environment, runs the suite,
   classifies failures, loops corrections.
4. `/relay-test-review <worktree>` validates the green result.
5. Orchestrator proceeds to `/relay-pr`.
6. Developer comes back to a PR opened with the execution report in
   the description. No interruption during the run.

Manual / debugging flow (stage-level):
1. Developer hand-edits code or tests.
2. Runs `/relay-test <worktree>` directly. Inspects result.
3. Optionally runs `/relay-test-review <worktree>` to validate.
4. Iterates.

---

## Technical Approach

**Feasibility:** HIGH. Every component has prior art (Docker Compose,
JUnit-parseable frameworks, failure classification via error pattern
matching). The novel part is orchestration via a Claude Code agent
prompt, which is the plugin's core competency.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**.

- The relay project itself has no test suite yet, so the TDD track
  does not activate for the Test Runner PRD's own implementation.
  The Implementer writes tests alongside the production code.
- When the Test Runner is deployed against phoenix, phoenix's own
  `docs/context/methodology.md` governs. If phoenix declares
  `tdd: true`, the Acceptance Criteria above become B7's input
  contract for any feature routed through phoenix. If `tdd: false`,
  the Acceptance Criteria seed tests written alongside implementation.

### Architecture Notes

- **Test Runner agent = prompt + tool allowlist.** Per relay's
  architecture (`docs/context/architecture.md`), the agent is a
  markdown file at `plugins/relay/agents/test-runner.md` with YAML
  frontmatter and a body prompt. No compiled code.
- **Invoked via `/relay-test` command.** The command file at
  `plugins/relay/commands/relay-test.md` orchestrates A1–A4 setup,
  invokes the agent, parses structured output, runs B3 classifier,
  drives the B4 loop, returns outcome.
- **Structured output is a contract.** Every test framework integrated
  must produce JUnit XML or equivalent JSON. Text-only frameworks are
  a `Could` item (transformer wrapper) and initially unsupported.
- **Failure classifier (B3) = heuristic table.** An evolving table of
  error patterns → category (legitimate / infra / weak-test /
  flakiness), loaded by the agent at run time. Living file, not
  hardcoded.
- **Reports written to `PRPs/reports/<feature>/`.** Per PRP artifact
  path decision. Files: `execution.log`, `attempts.jsonl`,
  `diff-per-attempt/<N>.patch`, `final-report.md`, and (TDD-active
  projects only) `tdd-initial-suite.diff` + `tdd-reviews.md`.
- **Permissions from `.claude/settings.json`.** All bash commands the
  Test Runner issues (docker compose, mix test, etc.) must be in the
  allowlist generated by the context-builder from the catalog at
  `docs/context/settings-allowlist.md`. Running against phoenix
  requires phoenix's `.claude/settings.json` to exist first.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auto-correction oscillates (fix A breaks B, fix B breaks A) | M | B4 detects file-set reversion across attempts and aborts with conflict signal before exhausting retries |
| Agent weakens tests to reach green | H if unchecked | B5 post-green review compares baseline vs post-run test counts and coverage; CHANGES_REQUESTED on regression |
| Test framework output isn't structured (plain text only) | M | Require structured output in MVP scope; wrapper transformer is a `Could` item for future |
| Docker unavailable in target environment | L (expected in CI) / H (expected on some devs' machines) | Graceful degradation AC-7 — fallback to local execution with risk flagged in report |
| Secret values leaked in execution log / report | M | A4 redaction by env var name pattern; B6 runs an additional filter; AC-9 codifies this; risk registry tracks regressions |
| Loop takes hours on slow suites | M | Time budget (Should item) as complementary abort; layered execution runs unit first |
| phoenix-specific test commands differ from detected patterns | M | Context-builder's `*update` mode extends allowlist; Test Runner flags missing permissions in the report instead of silently stalling |

---

## Implementation Phases

Order from planning document §11, consolidated. Each phase produces
something observable and testable; no big-bang integration at the end.

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Infra A1–A2 | Docker Compose test stack for phoenix + bootstrap (migrations, seeds, service wait) reaching a known state via a single command | pending | - | context-builder run against phoenix | - |
| 2 | Infra A3–A4 | Run isolation strategy (ephemeral containers or transactional reset) + secret injection via env allowlist with redaction policy | pending | - | 1 | - |
| 3 | B2 Structured output | Configure phoenix's test tooling to emit JUnit/JSON; normalize into relay's canonical failure JSON schema | pending | - | 1 | - |
| 4 | B1 + B3 agent | Test Runner agent file + failure classifier with initial heuristic table (4 categories) | pending | - | 3 | - |
| 5 | C1 Permissions | `.claude/settings.json` for phoenix populated by context-builder from the allowlist catalog | pending | with 4 | - | - |
| 6 | B4 Auto-correction loop | State machine with `max_test_retries=3`, oscillation detection, feedback format to Implementer | pending | - | 4, 5 | - |
| 7 | B5 Post-green review | Separate `/relay-test-review` agent comparing baseline tests/coverage to post-run state | pending | - | 6 | - |
| 8 | B6 + C4 Report and observability | Final report Markdown schema, `execution.log`, `attempts.jsonl`, diff artifacts directory | pending | - | 7 | - |
| 9 | Integration dogfood | Run end-to-end against a real feature in phoenix; tune thresholds from real telemetry | pending | - | 8 | - |

### Phase Details

**Phase 1: Infra A1–A2**
- **Goal:** One command (`make test-bootstrap` or equivalent) brings phoenix's test environment up deterministically.
- **Scope:** `compose.test.yml` (or phoenix's existing test compose), migration + seed scripts, readiness wait. No Test Runner logic yet.
- **Success signal:** Fresh clone of phoenix → context-builder run → `make test-bootstrap` → all services green; `mix test` (or equivalent) executes.

**Phase 2: Infra A3–A4**
- **Goal:** Between-run determinism and redaction-safe secret injection.
- **Scope:** Choose and implement ephemeral-containers OR transactional reset; produce the env var allowlist; test redaction on known sensitive env names.
- **Success signal:** Ten consecutive `make test-bootstrap && mix test` runs produce identical output; logs audited, no secret value present.

**Phase 3: B2 Structured output**
- **Goal:** Every test execution emits parseable JSON with `{passed, failed, skipped, failures: [...], duration, coverage?}`.
- **Scope:** Config phoenix's test runner to emit JUnit XML; write the normalizer that converts framework-specific output into relay's canonical schema.
- **Success signal:** Given a known-failing change, the normalizer produces correct failure records matching the suite, test, file, line, and message.

**Phase 4: B1 + B3 agent**
- **Goal:** Agent that executes the bootstrap, invokes the framework, consumes the normalized JSON, and labels each failure.
- **Scope:** `plugins/relay/agents/test-runner.md` with prompt, `plugins/relay/agents/test-runner-classifier.md` (or inlined), initial heuristic pattern table.
- **Success signal:** Against a synthetic suite with one failure of each category, the agent correctly labels all four.

**Phase 5: C1 Permissions**
- **Goal:** Autonomous execution without permission prompts in phoenix.
- **Scope:** Context-builder run generates `.claude/settings.json` for phoenix from the allowlist catalog.
- **Success signal:** A scripted `/relay-test` invocation in phoenix completes without a single permission prompt.

**Phase 6: B4 Auto-correction loop**
- **Goal:** State machine drives fix → rerun → verdict, bounded by `max_test_retries`, with oscillation abort.
- **Scope:** Loop logic in the command file, Implementer feedback payload format, oscillation detector (file-set reversion across attempts).
- **Success signal:** Scenarios AC-2, AC-3, AC-4 pass against synthetic failing changes.

**Phase 7: B5 Post-green review**
- **Goal:** Green runs are validated against test-weakening patterns.
- **Scope:** `plugins/relay/agents/post-green-reviewer.md`, command file `/relay-test-review`, baseline comparison logic.
- **Success signal:** AC-6 passes: a correction that deletes a failing test is caught and `CHANGES_REQUESTED` returned.

**Phase 8: B6 + C4 Report and observability**
- **Goal:** Every run produces an auditable record without reopening Claude Code.
- **Scope:** Report generator writes `PRPs/reports/<feature>/` with all artifacts; redaction filter re-runs on the captured logs.
- **Success signal:** AC-9, AC-10 pass; a human auditor can reconstruct what happened from the files alone.

**Phase 9: Integration dogfood**
- **Goal:** Tune from real data.
- **Scope:** Run `/relay-execute` on a real phoenix feature; measure closure rate, oscillation rate, setup time against targets in Success Metrics; adjust heuristics if targets missed.
- **Success signal:** After 20 sessions, metrics meet or exceed the targets in Success Metrics; if not, root cause documented and either the Test Runner or the targets are revised.

### Parallelism Notes

Phase 5 (C1 Permissions) can run in parallel with Phase 4 (agent) —
they touch different surfaces (target-project config vs plugin agent
file). Everything else is sequential because each depends on structured
output from the previous.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Scope of first delivery | B1 through B6 (full Test Runner + post-green review + report) | Slim B1–B4 (defer B5/B6) | Without B5, the "weaken tests to turn green" anti-pattern has no enforcement. Without B6, the autonomy promise ("come back later to an auditable outcome") doesn't hold. |
| `max_test_retries` default | 3 | 2 (aggressive), 5 (generous) | Matches existing project decision (`docs/decisions.md`); 3 is the documented default with full semantics and override guidance. |
| `max_test_minutes` default | 30 | 20 (aggressive), 60 (generous) | 30 covers typical medium projects (2x headroom); forces E2E-heavy projects to consciously override. See `docs/decisions.md` for override guidance and reassess trigger. |
| Layered execution activation | Adaptive (auto-detect + opt-out) | Pure automatic (false-positive risk); pure opt-in (benefit left on the table) | Adaptive detects layer signals in Phase 1 and reports the reason in every first-run report. Team can override either way. |
| Dogfood target | phoenix (local project) | Open-source reference repo / synthetic project | Real project, real commands, real edge cases; the team already has access. |
| Post-green review split | Separate `/relay-test-review` command | Embedded inside `/relay-test` | Matches command-surface decision (`docs/decisions.md`); lets user re-run review after hand-edits; semantically distinct (review ≠ execution). |
| Reports path | `PRPs/reports/<feature>/` | `.claude/PRPs/reports/<feature>/` | Follows the PRP artifact path decision; `.claude/` triggers permission prompts that break autonomy. |
| Structured output required | JUnit XML / JSON from the framework | Parse plain text output | String parsing is fragile and framework-specific; structured output is cheap to configure upfront and pays off at every classifier call. |

---

## Research Summary

**Market Context**
Not fetched anew — the space is well-understood: CI runners (GitHub
Actions, CircleCI, Jenkins) execute tests; Anthropic's own SWE-Agent
and similar autonomous-coding projects have retry loops; `prp-core`
already provides test-adjacent commands but no autonomous loop. Relay's
contribution is the **combination** of agent-driven loop + post-green
review + report within Claude Code's plugin model, specifically for
projects that also run through relay's PRD/plan/implement pipeline.

**Technical Context**
From the planning document and decisions:
- Docker Compose test stacks are the established pattern for
  deterministic test envs; A1–A2 follow the convention.
- JUnit XML is near-universal across JVM, JS, Python (pytest-junit),
  Ruby, Go (via go2xunit), Elixir (via junit-formatter); B2 adopts it.
- Auto-correction loops with oscillation detection are novel territory;
  the chosen approach (file-set reversion) is the simplest effective
  heuristic.
- Post-green review against baseline coverage is a pattern borrowed
  from code-review tooling (Codecov, SonarQube); applying it inside a
  Claude Code agent is the new part.

---

*Generated: 2026-04-19*
*Status: DRAFT*
