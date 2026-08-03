# Decisions

Decisões estáveis do projeto que não devem ser reavaliadas pela IA.
Atualizado pelo Docs Updater após cada aprovação de implementação.

---

## [2026-04-19] Distribute via Claude Code marketplace (single-plugin repo)

**Context:** The repository needs a way to be installed into Claude Code users' environments. [INFERRED - VALIDATE]
**Decision:** Ship `relay` as the sole plugin of a marketplace declared at the repo root (`.claude-plugin/marketplace.json`). Plugin metadata lives at `plugins/relay/.claude-plugin/plugin.json`.
**Reason:** Marketplace format is Claude Code's first-class distribution mechanism for plugins. [INFERRED - VALIDATE]
**Areas affected:** installation, plugin packaging

---

## [2026-04-19] Keep upstream `prp-core` as reference, not as active relay code

**Context:** The planning docs describe `relay` as incorporating and extending ideas from Wirasm's `prp-core` plugin. The repository keeps a full copy of `prp-core` under `plugins/`.
**Decision:** `plugins/prp-core/` is treated as a read-only reference for file format and agent design; it is not merged into, extended inside, or imported by the `relay` plugin tree.
**Reason:** Keeps upstream evolution independent from relay's own evolution, and lets relay own its prompts without forking. [INFERRED - VALIDATE]
**Areas affected:** plugin structure, documentation scope

---

## [2026-04-19] Phased rollout driven by `docs/planning/dev_process_improvement_plan.html`

**Context:** Building an end-to-end autonomous delivery pipeline in one step is infeasible.
**Decision:** Ship in five ordered phases: (1) Foundation — context-builder + decision-gate, (2) Testing — Test Runner + self-correction loop, (3) Agents — single-command orchestrator, (4) Approval — merge + docs updater, (5) CI/CD integration.
**Reason:** Each phase produces something verifiable and unlocks the next, avoiding a big-bang release. [INFERRED - VALIDATE] (this ordering is the explicit recommendation of the planning document)
**Areas affected:** roadmap, scope of each release

---

## [2026-04-19] TDD activation is opt-in by explicit declaration only

**Context:** Phase 2 includes an optional TDD Writer / TDD Reviewer pair (B7/B8) that runs between the Plan Reviewer and the Implementer.
**Decision:** The TDD track is activated ONLY when the target project explicitly declares TDD in its context-builder output. Heuristics (e.g., existence of a test folder) MUST NOT activate the track.
**Reason:** Explicit declaration prevents surprising projects that happen to have tests but do not practice TDD as a methodology. (explicitly stated in `docs/planning/planejamento_fase_2.docx`)
**Areas affected:** orchestration, context-builder schema, TDD agents

---

## [2026-04-19] Test Runner auto-correction loop: `max_test_retries = 3`

**Context:** Component B4 of Phase 2 (`docs/planning/planejamento_fase_2.docx`) is the auto-correction loop: run tests → classify failures → apply Implementer correction → re-run. The planning doc proposed `3` as a default without nailing down the exact semantics of the counter.
**Decision:** The default is `max_test_retries: 3`, with the following explicit semantics:
- The counter counts **correction attempts after the initial run**. The test suite therefore runs at most 4 times in a session: 1 initial + 3 retries.
- A "retry" = one full round of (run suite → classify → correct → re-run).
- Flakiness-driven retries (B3 detects non-deterministic failure via retry without code change) do NOT count against `max_test_retries`.
- Oscillation detection (B4 Observações — a correction reverting files from an earlier correction) aborts the loop BEFORE exhausting the retry budget and signals conflict to the human.
- Setting the value to `0` (disabling retries) is forbidden — it would defeat the purpose of the loop.
**Reason:** 1–2 aborts prematurely on second-tier bugs where the first fix exposes another failure. 5+ wastes expensive E2E time when the loop is stuck on a requirement gap or weak test, not a bug the agent can solve. 3 matches literature on agentic correction loops (Ralph, SWE-Agent) and common CI retry policies. This default is a starting point — reassess after ~20 real runs in target projects; telemetry may justify lowering to 2 or stratifying by test tier.
**Override guidance:**
- Projects with expensive E2E (>5 min per run) → lower to 2.
- Projects with fast unit-only suites → raise to 5.
- Never set to 0.
**Out of scope (deferred):** complementary time budget (`max_test_minutes`), per-tier retry counts (unit vs integration vs E2E), adaptive defaults based on suite duration. These are separate decisions when Phase 2 implementation surfaces the need.
**Areas affected:** Test Runner (B1), auto-correction loop (B4), configuration schema of the plugin, override guidance for target projects

---

## [2026-04-19] Layered test execution: adaptive (auto-detect with opt-out)

**Context:** Planning document §10 identifies "loop explode em projetos grandes" as Medium risk and proposes layered execution (unit → integration → E2E) as a mitigation alongside `max_test_minutes`. Layered execution runs fast tests first and skips subsequent layers when an earlier layer fails — preserving the time budget and matching natural "fail fast" intuition. The open question was whether this should be automatic (always on) or opt-in (always off until configured).

**Decision:** Neither extreme — **adaptive**: the context-builder detects test-layer signals in Phase 1 and activates layered execution automatically when they are found. Flat execution (current default) when no signals are present. Override available via a future `.relay.yaml` at the target-repo root.

**Detection signals** (any one suffices, all are inclusive):
- Separate directories: `tests/unit/`, `tests/integration/`, `tests/e2e/`, or common equivalents (`test/features/`, `spec/system/`, etc.)
- Separate test commands / scripts in manifests: `npm run test:unit` + `test:e2e`, `mix test.unit` + `mix test.e2e`, etc.
- Framework markers: `@pytest.mark.unit`, `@pytest.mark.e2e`, `@Tag("unit")`, etc.
- Framework conventions: phoenix `test/` vs `test/features/`; rspec `spec/` vs `spec/system/`.

**Canonical layer order** (when detected): `unit → integration → e2e`. Per-project reordering or addition of intermediate layers (smoke, contract) via `.relay.yaml`.

**Failure behavior:** Failure at layer N ⇒ **subsequent layers are skipped**. Report marks skipped layers as `SKIPPED_UPSTREAM_FAILURE` (distinct from other skips — not due to missing infra or missing framework, but due to an earlier-layer failure).

**Auto-correction loop interaction:** Each retry re-runs **from layer 1**. A correction may have fixed unit but silently broken E2E; conservative re-run catches this. Unit is cheap enough that the cost is acceptable.

**Time budget interaction:** Layered execution amplifies `max_test_minutes` (OQ #2) — failing fast in unit preserves budget for subsequent retries. No per-tier budgets in this decision; total `max_test_minutes: 30` remains the single budget. Per-tier budgets deferred until telemetry justifies them.

**Reporting:** Report `layers:` section shows per-layer outcome + duration + tests_run. Example:
```
layers:
  unit:        { outcome: PASSED, duration: 30s, tests_run: 142 }
  integration: { outcome: FAILED, duration: 2min, tests_run: 28, failures: 3 }
  e2e:         { outcome: SKIPPED_UPSTREAM_FAILURE }
```

**Activation transparency:** The first run of a project with layered execution active writes a one-line note into the report ("Layered execution enabled because X, Y, Z signals detected. Disable via `test_layers.enabled: false` in .relay.yaml"). Human sees immediately; can turn off if detection misfired.

**Reason:** Pure automatic is unsafe — false positives (integration test classified as unit) lead to wrong abort decisions. Pure opt-in leaves benefit on the table for teams that would use it but don't know it exists. Adaptive is honest: activate when there's strong signal; report the reason; let the team override in either direction.

**Out of scope (deferred):**
- `.relay.yaml` schema in full — this decision mentions it as override location without designing it.
- Per-tier time budgets (`max_unit_minutes`, `max_e2e_minutes`).
- Custom layer names beyond unit/integration/e2e.
- Skip-from-layer-N in retries (optimization — the Implementer signaling "only touched E2E" to skip earlier layers).
- Parallel execution of layers (explicit Won't in the Test Runner PRD).

**Areas affected:** Test Runner auto-correction loop (B4), report schema (B6), context-builder scan (Phase 1 — detect layer signals), future `.relay.yaml` config surface

---

## [2026-04-19] Test Runner time budget: `max_test_minutes = 30`

**Context:** `max_test_retries = 3` bounds the number of correction attempts but not the wall-clock time a session can consume. A project with slow E2E (15 min per run) hits `4 × 15min + 3 × correction = ~67min` before a retry-exhausted abort — far longer than a developer is willing to walk away for. The planning document §10 calls this out as a Medium-severity risk and proposes a configurable time budget as the complementary stop condition.

**Decision:** `max_test_minutes: 30` default, covering **total session wall-clock** from `/relay-test` invocation to final outcome. Semantics:

- Counts all phases: Docker setup, each suite execution, Implementer correction time, post-green review time. No "pausing" for thinking time — total wall-clock is simpler and matches the developer's actual wait.
- **Independent of `max_test_retries`** — whichever budget exhausts first wins. Outcome codes are distinct:
  - `FAILED_AFTER_N_RETRIES` — retry budget exhausted; loop tried `max_test_retries` corrections and none converged.
  - `FAILED_TIME_BUDGET_EXCEEDED` — time budget hit; may or may not have been on a retry.
- Value `0` is forbidden — disabling the budget defeats its purpose.
- Per-project override via the future `.relay.yaml` (same mechanism as `max_test_retries`).
- Reports include `time_breakdown` by phase (`infra_setup`, `attempt_N_suite`, `attempt_N_correction`, `postgreen_review`) so humans know where the budget went.

**Override guidance:**
- Fast-feedback projects (unit only, no Docker) → lower to 15 min.
- E2E-heavy projects (>10 min per run) → raise to 60–90 min and strongly consider layered execution (OQ #3 in Test Runner PRD) so that unit tests fail fast before E2E burns the budget.
- Projects with suites >30 min per run → case-by-case; likely signal that feature scope should be smaller or the suite needs splitting.

**Reason:** 30 min covers typical medium projects with ~2x headroom (Docker setup + 4 suite runs + 3 corrections ≈ 14 min for a 3-min suite) while forcing heavy-E2E projects to consciously opt into a larger budget. 20 min is too aggressive — aborts legitimate second-retry convergence. 60 min is too generous — loops stuck on requirement gaps waste 2x the time before aborting, which is precisely what the budget exists to prevent.

**Reassess trigger:** after ~20 real runs in phoenix (the first dogfood target per `PRPs/prds/test-runner.prd.md`), check the actual distribution of session durations. If the median converged session is far from 30 min in either direction, revise.

**Out of scope (deferred):**
- Per-tier budgets (`max_unit_minutes`, `max_integration_minutes`, `max_e2e_minutes`) — tied to layered execution decision (OQ #3 in Test Runner PRD).
- Fine-grained accounting inside phases (breakdown of "infra setup" into pull / build / wait).

**Areas affected:** Test Runner auto-correction loop (B4), report schema (B6), future `.relay.yaml` config surface

---

## [2026-04-19] Secret redaction policy for Test Runner reports

**Context:** Test Runner captures stdout/stderr during test execution and writes it to versioned reports under `PRPs/reports/<feature>/`. Those reports travel with the PR description. Without explicit redaction, any test that inadvertently logs an env var value (via `print`, error messages, fixture dumps) leaks that secret to every reviewer of the PR, including in open-source contexts. The planning document §7.1 A4 mandates an explicit redaction policy; the exact pattern list was left open.

**Decision:** Three-layer redaction policy, canonical list in `docs/context/redaction-policy.md`.

1. **Layer 1 (invariant defaults):** env var names matching case-insensitive wildcards (`*KEY*`, `*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*PASSWD*`, `*CREDENTIAL*`, `*PRIVATE*`, `*SIGNING*`, `*AUTH*`); exact-match env names carrying connection URIs (`DATABASE_URL`, `DB_URL`, `REDIS_URL`, `MONGODB_URI`, `KAFKA_BROKERS`, `AMQP_URL`, `GOOGLE_APPLICATION_CREDENTIALS`); value regex for well-known secret formats (AWS, Stripe, GitHub PAT, JWT, PEM, OpenAI, Anthropic, Google API key / OAuth2 access token / OAuth2 client secret).
2. **Layer 2 (per-project extensions):** `PRPs/redaction-extensions.txt` (created empty by context-builder on `*init`); team adds project-specific env names or value regex; versioned in git alongside other config.
3. **Layer 3 (documented non-redacted):** values that are semi-sensitive but left alone by default (service-account non-key fields, git hashes) — teams can opt into redaction via Layer 2.

**Implementation mechanics:** runtime redaction table built from env vars at the start of a run; replace values in every captured line before writing to any file under `PRPs/reports/<feature>/`. After execution, a second pass applies value regex to catch secrets leaked outside env contexts. Report footer always carries a `secrets_redacted` block with count + category breakdown, even when count is 0.

**URL handling:** connection strings replaced integrally with `[REDACTED_URL]`. No parse-and-partial redaction — URL parsers fail on passwords with special characters and a parse failure that emits the raw URL is a leak. Going integral is the safe default.

**Reason:** Name-pattern + exact-match + value-regex together cover the common cases (env vars that follow naming conventions, exceptions that don't, and secrets that leak outside env vars entirely) without requiring the team to audit every possible leak surface. Per-project extensions handle the long tail. Integrally-redacted URLs trade debuggability for safety — a legitimate debugging need can be served by running the suite manually outside the autonomous pipeline.

**Out of scope (deferred to A4/B6 implementation):**
- Regex library choice and streaming vs batch redaction.
- Multi-line value handling (PEM blocks span lines).
- Whether to also redact in `attempts.jsonl` individual fix attempts (expected: yes; same policy, test separately).
- Pre-commit secret scanning integration (complementary, different tool category).

**Areas affected:** Test Runner infra (A4), Report generator (B6), context-builder (creates the extensions file at `*init`), every `PRPs/reports/<feature>/` ever produced

---

## [2026-04-19] `.claude/settings.json` allowlist: narrow patterns, invariant denylist, generated by context-builder

**Context:** Component C1 of Phase 2 (`docs/planning/planejamento_fase_2.docx` §7.3) requires `.claude/settings.json` to carry pre-approved permissions so the autonomous portion of the pipeline does not stall on per-command prompts. The planning doc says "allowlist estrita por comando (não por ferramenta)" but left the exact scope open.

**Decision:** Three interlocking choices:

1. **Narrow patterns, never broad.** The allowlist contains patterns specific to detected commands (e.g., `Bash(pnpm test *)`, `Bash(docker compose -f compose.test.yml up -d*)`). Catch-all patterns like `Bash(*)`, `Bash(git *)`, `Bash(docker *)`, `Bash(rm *)` are forbidden in the allowlist; they defeat the security purpose. If a stack signal would require such a pattern, the detection logic needs more granularity.

2. **Invariant denylist applied to every project.** Destructive operations always require human confirmation regardless of project: `git push --force*`, `git reset --hard*`, `rm -rf /*` and `rm -rf ..*` (only the scoped `.worktrees/*` form is allowed), `sudo`, global package installs (`npm install -g *`, `pip install --user *`), `curl * | sh*`, `docker system prune*`, `docker volume rm *`, writes to system directories, GitHub API mutations (`gh api -X DELETE/PUT *`, `gh repo delete *`). Full catalog in `docs/context/settings-allowlist.md`.

3. **Generated by the context-builder, not by the pipeline.** The context-builder skill extends `*init` to emit `.claude/settings.json` based on Phase 1 stack detection. `*update` mode re-runs detection and adds missing allow entries but never removes human-added ones; the denylist is replaced wholesale each run because it is invariant.

**Reason:** Narrow patterns + invariant denylist together mean the pipeline can run autonomously without the user approving every bash call, while destructive operations still require explicit consent. Generating the file from detected stack signals means the allowlist fits the project (no bloat, no gaps) and is auditable in git diff on the `settings.json` commit. Letting the pipeline itself maintain this file would be a security regression — the thing being authorized shouldn't author its own authorization.

**Exception to the "no writes to `.claude/`" rule:** `.claude/settings.json` is **setup configuration**, not a pipeline artifact. The context-builder writes it once during `*init`, interactively (user's Claude Code asks once to write to `.claude/` at setup time — acceptable UX). The autonomous pipeline only reads it, never writes under `.claude/`. This does not contradict the earlier decision on PRP artifact paths — pipeline-produced artifacts still go under `PRPs/`.

**Out of scope (deferred to C1 implementation):**
- Exact Claude Code `permissions` schema syntax (verifying `Bash(pattern)` vs other form at implementation time).
- Per-OS differences (Windows path conventions, `cmd.exe` vs `bash`).
- `.claude/settings.local.json` (git-ignored, per-user overrides) — not generated; user-maintained.

**Areas affected:** context-builder skill (gains a generation phase), anti-patterns doc (exception clarified), every target project's `.claude/settings.json`, security posture of the autonomous pipeline

---

## [2026-04-19] Command surface: one command per stage, writer and reviewer split

**Context:** With the interactivity boundary decided (PRD interactive, downstream autonomous), the remaining question was how many commands to expose. Two extremes were considered: a single `/relay-run` that does everything (collapses the boundary into one invocation) vs one command per agent (maximum granularity). The goals that drove the answer: (a) every pipeline stage must be individually invokable — for isolated testing and for human intervention between stages; (b) the orchestrator must compose them seamlessly when the user wants the full flow; (c) naming must be semantically clean — a "review" command shouldn't be nested inside a "test" command; (d) reuse prp-core naming conventions where they exist (`/prp-implement` is familiar).

**Decision:** Ship 12 commands plus 1 placeholder for Pillar 3, organized by role (writer / reviewer / infra / executor / orchestrator). Writers produce artifacts; reviewers validate existing artifacts (including hand-edited ones). The orchestrator invokes them in a fixed order and loops writer→reviewer pairs on `CHANGES_REQUESTED` until approved or retry budget exhausted.

| Command | Role | Input | Output |
|---------|------|-------|--------|
| `/relay-prd <description \| draft-path>` | interactive writer+reviewer (special: both dialog with user) | description or draft | PRD `APPROVED` |
| `/relay-plan <prd-path>` | writer | PRD `APPROVED` | plan `DRAFT` |
| `/relay-plan-review <plan-path>` | reviewer | plan `DRAFT` (or hand-edited) | `APPROVED` or `CHANGES_REQUESTED` |
| `/relay-worktree <feature-name>` | infra | feature name | worktree at `.worktrees/<feature>/` + branch |
| `/relay-tdd <plan-path>` | writer (opt-in) | plan `APPROVED` | test suite `DRAFT`; silently self-skips if `tdd: false` |
| `/relay-tdd-review <suite-path>` | reviewer (opt-in) | test suite `DRAFT` | `APPROVED` or `CHANGES_REQUESTED`; silently self-skips if `tdd: false` |
| `/relay-implement <plan-path>` | writer (matches `prp-implement` convention) | plan `APPROVED` (+ TDD suite if present) | implementation committed to worktree |
| `/relay-code-review <worktree>` | reviewer | worktree diff | `APPROVED` or `CHANGES_REQUESTED` |
| `/relay-test <worktree>` | executor (B1–B4: run, classify, auto-correct loop) | worktree with code | green test state or `FAILED_AFTER_N_RETRIES` |
| `/relay-test-review <worktree>` | reviewer (B5 post-green) | green test state | `APPROVED` or `CHANGES_REQUESTED` (weakened tests, coverage drop) |
| `/relay-pr <feature-name>` | creator | worktree green + all reviews `APPROVED` | PR opened + `PRPs/reports/<feature>/final-report.md` |
| `/relay-execute <prd-path>` | orchestrator | PRD `APPROVED` | PR opened (composes everything above in order) |
| `/relay-approve <pr>` *(Pillar 3, exact name TBD)* | merge + docs | PR number or URL | merge + docs updated |

**Orchestrator execution order** (`/relay-execute`):

```
/relay-plan → /relay-plan-review
  ↓ (loop back to writer on CHANGES_REQUESTED; max retries configurable)
/relay-worktree
  ↓
/relay-tdd → /relay-tdd-review         (silently skip if tdd: false)
  ↓
/relay-implement → /relay-code-review
  ↓
/relay-test → /relay-test-review
  ↓
/relay-pr
```

**Preconditions** (each command fails loud if unmet):
- Review commands require the artifact file to exist with expected status in frontmatter.
- `/relay-implement` requires plan `APPROVED` + worktree checked out.
- `/relay-test` requires worktree with pending commits.
- `/relay-pr` requires last `/relay-test-review` returned `APPROVED`.

**Reason:** Split reviewers enable the manual flow the user asked for — edit an artifact by hand, then re-run only the reviewer to validate. Writer/reviewer as independent commands also means each can be tested in isolation before the orchestrator is built (important for Phase 2 validation). `/relay-implement` (not `/relay-code`) was chosen for the code-writing step because it matches the `prp-implement` name users are already familiar with; the orchestrator takes `/relay-execute` instead of `/relay-implement` to avoid collision. `/relay-test-review` mirrors the other review splits — B5 is semantically a review, not an execution, and users may want to re-run it after hand-editing.

**Out of scope (deferred):**
- Per-stage retry budgets (analogous to `max_test_retries`): e.g., `max_plan_review_retries`, `max_code_review_retries`. Values settle when Phase 2 config design happens.
- `/relay-approve` exact naming: settles when Pillar 3 is designed.
- Flags for review-only / write-only modes on writer commands: defer to implementation time if needed.

**Areas affected:** every Phase 2/3 agent, orchestrator, plugin config schema, `docs/api-reference.md`, README.

---

## [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous

**Context:** The original framing of `relay` was "one prompt → PR" — fully autonomous end-to-end. In practice, the highest-leverage moment to catch scope drift, unclear requirements, and user misunderstanding is during PRD authoring. Fixing those issues later (after plan, tests, and code have been produced) cascades rework across every stage.
**Decision:** The pipeline has an explicit **interactivity boundary** at PRD approval. Up to and including PRD Writer and PRD Reviewer, the flow is interactive — the PRD Writer runs the full 6-phase Q&A loop (inherited from `prp-core/commands/prp-prd.md`), and the PRD Reviewer can loop with the user until the PRD is approved. From PRD approval onward — Plan Writer, Plan Reviewer, TDD Writer/Reviewer (when active), Implementer, Code Reviewer, Test Runner with auto-correction loop, Report + PR Creator — the pipeline runs autonomously and only interrupts the user when an agent exhausts its recovery strategies.
**Reason:** The cost of resolving an ambiguity during PRD authoring is minutes of conversation. The same ambiguity caught after implementation costs hours or days of compounded rework. Trading up-front dialogue for autonomy guarantees is a net win on confidence and total time-to-PR.
**Areas affected:** PRD Writer agent, PRD Reviewer agent, orchestrator, all downstream agents, command surface

---

## [2026-04-19] PRD template is a fork of `prp-core/commands/prp-prd.md`

**Context:** Relay needs a canonical PRD shape that (a) downstream agents can rely on, (b) humans can reason about, (c) carries relay-specific contracts (Decision Gate evidence, TDD routing).
**Decision:** Adopt a fork of the `prp-core/commands/prp-prd.md` output template as the canonical relay PRD shape. The full interactive 6-phase flow (Initiate → Foundation → Grounding → Deep Dive → Grounding → Decisions → Generate) is preserved. Relay adds three mandatory extensions: (1) Decision Gate evidence block as the PRD header, (2) Acceptance Criteria (test scenarios) section, (3) TDD routing note stating whether the TDD track will run. The fork lives at `docs/context/prd-template.md`.
**Reason:** Reusing a proven template avoids reinventing structure that upstream already refined. Forking (not linking) prevents upstream changes from silently altering relay's contract. The three extensions encode relay-specific invariants the upstream template does not cover.
**Areas affected:** PRD Writer agent, PRD Reviewer agent, Plan Writer (consumes the PRD), TDD agents (consume Acceptance Criteria)

---

## [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`

**Context:** The upstream `prp-core` convention writes PRDs, plans, and reports under `.claude/PRPs/`. Claude Code applies hardcoded permission prompts on writes to `.claude/`. These prompts interrupt any agent attempting to write there, which is incompatible with the autonomous portion of the relay pipeline (Plan Writer, TDD Writer, Test Runner reports, Docs Updater outputs).
**Decision:** All pipeline artifacts — PRDs, implementation plans, Test Runner reports, TDD initial suites, observability logs — are written under `PRPs/` at the target repository root, with the substructure `PRPs/prds/<feature>.prd.md`, `PRPs/plans/<feature>.plan.md`, `PRPs/reports/<feature>/`. Nothing pipeline-produced goes under `.claude/`.
**Reason:** Claude Code's permission guards on `.claude/` are intentional and have no bypass. Using a sibling folder keeps artifacts versionable, auditable, and writable by the autonomous loop without per-file consent prompts.
**Areas affected:** every agent that writes an artifact (PRD Writer, Plan Writer, TDD Writer, Implementer reports, Test Runner B6, Observability C4, Docs Updater), orchestrator, `.gitignore` policy

---

## [2026-04-19] Methodology declaration lives in `docs/context/methodology.md`

**Context:** The previous decision mandates explicit TDD declaration but left the storage location, field name, and format open (Open Question #1 of the initial context-builder run). Downstream agents (orchestrator, B7, B8) need a predictable read target across every project the plugin processes.
**Decision:** Every project initialized by the `context-builder` skill receives a `docs/context/methodology.md` file with YAML frontmatter as the **single source of truth** for methodology declarations. The TDD track reads exactly one key: `tdd: true | false`. Additional methodologies (BDD, pair-review, branching policy) may be added as new frontmatter keys in the future without breaking the `tdd` contract.
**Reason:** A dedicated file is unambiguous for agents to parse (`test -f` + frontmatter read), survives prose rewrites that could eat an embedded section, and scales to other methodology declarations as they emerge. File is created in every `*init` run so its absence signals a setup bug rather than "TDD off". The skill MUST default `tdd: false` and MUST NOT flip it by heuristic.
**Areas affected:** context-builder skill, orchestrator, TDD agents (B7, B8), every future target project

---

## [2026-04-25] Plan filenames carry the source PRD phase number and slug

**Context:** The api-reference shorthand at `docs/api-reference.md:39` lists `/relay-plan` output as `PRPs/plans/<feature>.plan.md`, treating each feature as one plan. The plan-authoring PRD (Phase 1 of `plan-authoring.prd.md`, shipped 2026-04-25) generates one plan per PRD Implementation Phases row, not one per feature. A `<feature>.plan.md` shorthand cannot represent that 1-to-many relationship and would force collisions whenever a PRD has more than one phase to plan.
**Decision:** Plan files written by `plan-writer` use the path `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`, where `<feature>` is the PRD basename (without `.prd.md`), `<N>` is the Implementation Phases row number, and `<slug>` is the kebab-cased phase name. The plan-template at `docs/context/plan-template.md` codifies this; `plan-reviewer` rubric R8c validates the back-reference between the plan filename and the source PRD's row.
**Reason:** Per-phase plans match the actual unit of work the Implementer consumes, keep filenames grep-friendly, and make orchestrator state machine bookkeeping trivial (`PRP Plan` cell of row N points at exactly one plan). The `<feature>.plan.md` shorthand survives only as a documentation simplification in the api-reference and architecture rows; both have been refined to the per-phase pattern in Phase 6 of `plan-authoring.prd.md`.
**Areas affected:** plan-writer agent, plan-reviewer agent, `/relay-plan` command, `/relay-plan-review` command, `docs/context/plan-template.md`, `docs/api-reference.md`, `docs/context/architecture.md`, future Implementer (`/relay-implement`)

---

## [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array

**Context:** The reviewer-coherence-layer feature (`PRPs/prds/reviewer-coherence-layer.prd.md`, APPROVED 2026-04-28) ships an additive R-COH-* coherence layer on `plan-reviewer.md`. The layer appends rows to the same `PRPs/plans/<basename>.review.jsonl` `rubric[]` array that R1–R8 populate. AC-10 of `plan-authoring.prd.md` (line 88) was originally written as "rubric MUST contain exactly 8 objects with id values R1, R2, R3, R4, R5, R6, R7, R8 — one of each, no duplicates, no extras", which would forbid the additive R-COH-* rows.

**Decision:** AC-10's "no extras" literal wording is consciously relaxed to "R1–R8 always present, no duplicates among R1–R8, plus zero or more R-COH-* rows from the coherence layer". AC-10's intent — no short-circuit; all 8 R1–R8 items always evaluated and recorded regardless of which fail — is preserved verbatim. The relaxation is implemented by surgical Edits at five sites in `plugins/relay/agents/plan-reviewer.md` (frontmatter description, opening prose, hard-rule callout, JSONL format section, anti-pattern bullets), shipped in Phase 2 of the reviewer-coherence-layer plan. The APPROVED `PRPs/prds/plan-authoring.prd.md` is NOT mutated — reopening APPROVED PRDs is explicitly out of scope per `docs/anti-patterns.md` and the `prd-reviewer`'s `already_approved` precondition. Future plan-authoring work refers to this decision as the operative contract; AC-10 of plan-authoring.prd.md documents the original design-time constraint.

**Reason:** AC-10's purpose was to forbid short-circuit; that purpose is invariant to the array length cap. The literal "no extras" wording was a design-time choice to keep the array bounded for the original 8-item rubric; it does not constitute a load-bearing contract for the additive coherence layer that did not exist when AC-10 was written. Recording the evolution in `docs/decisions.md` (per `docs/decision-gate.md`'s mandate that decisions.md is the canonical home for "decisions the AI must not re-evaluate") preserves the ability of future agents to consult the decision without re-deriving it from PRD evolution.

**Areas affected:** plan-reviewer agent (5 surgical Edits at the "exactly 8" sites + new `## The R-COH-* coherence layer` section + Step 2 prose extension + JSONL example extension); future plan-authoring features that may add additional rubric layers; the `prd-reviewer` agent's similar layer (already shipped Phase 1 of reviewer-coherence-layer; prd-reviewer's `rubric[]` was already open-ended so no constraint relaxation was needed there); the future `code-reviewer` extension (Phase 3) which may need an analogous decision when its own rubric[] gains R-COH-* rows.

---

## [2026-04-28] code-reviewer gains Task tool + AC-10 of implementation-authoring.prd.md evolves: R-COH-* rows are additive

**Context:** Phase 3 of the reviewer-coherence-layer feature (`PRPs/prds/reviewer-coherence-layer.prd.md`, APPROVED 2026-04-28) ships an additive R-COH-* coherence layer on `plugins/relay/agents/code-reviewer.md` plus a new sub-agent `plugins/relay/agents/code-reviewer-semantic.md` invoked via `Task`. Two contracts in the APPROVED `PRPs/prds/implementation-authoring.prd.md` would otherwise block this evolution: D11 (line 316 — tools allowlist for code-reviewer is `Read, Write, Glob, Grep, Bash, BashOutput`, explicitly excluding Task and Edit) and AC-10 (line 103 — `code-review.jsonl` rubric array contains "exactly one entry per rubric item the reviewer evaluated, no duplicates, no extras"). Both contracts predate the sub-agent factoring decision (D2 of `reviewer-coherence-layer.prd.md`) and the additive R-COH-* layer.

**Decision:**

- **(D11)** `Task` is consciously added to code-reviewer's tools allowlist, exclusively for invoking the read-only `code-reviewer-semantic` sub-agent. D11's read-only invariant is preserved verbatim: code-reviewer parent does NOT gain `Edit`; `Edit` remains absent forever; the sub-agent (`code-reviewer-semantic`) is itself read-only over the repo (`tools: Glob, Grep, Read`); the sub-agent has no `Bash` and no `Write`. Adding `Task` for bounded delegation to a read-only sub-agent extends the philosophy, not violates it.
- **(AC-10)** AC-10's "no extras" wording is consciously relaxed to "R-S*/R-L*/R-SEM/R-X always present, no duplicates among them; R-COH-* rows additional in standard mode". AC-10's no-short-circuit invariant is preserved verbatim: all 8 standard-mode items are always evaluated and recorded regardless of which fail. Arbitration mode is unchanged: exactly 1 object with id `arbitration` (R-COH-* rows do NOT appear in arbitration mode).

Both relaxations are implemented by surgical Edits in `plugins/relay/agents/code-reviewer.md` (Phase 3 of the reviewer-coherence-layer plan, Tasks 1 and 2). The APPROVED `PRPs/prds/implementation-authoring.prd.md` is NOT mutated — reopening APPROVED PRDs is explicitly out of scope per `docs/anti-patterns.md` and the source PRD's invariants. Future code-reviewer-related decisions consult this entry alongside D11 and AC-10 of implementation-authoring.prd.md.

**Reason:** D11's purpose was to enforce read-only review philosophy; that purpose is invariant to the tool count — adding `Task` for bounded delegation to a read-only sub-agent does not violate the philosophy, it extends it. AC-10's purpose was to forbid short-circuit; that purpose is invariant to the array length cap. The literal "no extras" wording was a design-time choice to keep the array bounded for the original 8-item rubric; it does not constitute a load-bearing contract for the additive coherence layer that did not exist when AC-10 was written. Recording both evolutions in a single entry keeps the related contract changes adjacent in the audit log; future agents consulting code-reviewer's tools or code-review.jsonl shape find both relaxations together.

**Areas affected:** code-reviewer agent (frontmatter `tools:` Edit adding `Task`, plus 3 surgical relax-Edits at the "exactly 8" sites — Hard constraint #4, Phase 2 intro, JSONL format section — plus the new `## The R-COH-* coherence layer` section + Phase 2 prose extension + JSONL example extension); new `code-reviewer-semantic` sub-agent (the read-only delegate invoked via Task); new `docs/context/code-review-registries.md` context file (registry allowlist for the `R-COH-REGISTRY-MISSING` deterministic check); future code-reviewer-related decisions (e.g., a Phase 4 dogfood-driven calibration that may add or remove R-COH-* IDs).

---

## [2026-04-28] AC-6 of reviewer-coherence-layer.prd.md ≥1-TP requirement: synthetic TPs satisfy when no dedicated fixture exists; real-world TPs deferred to cement-target reassess

**Context:** Phase 4 of the reviewer-coherence-layer feature ran a dogfood pass against 3 PRDs + 3 plans + 2 real code diffs + 1 synthetic fixture for code-reviewer (per source PRD's D7). AC-6 of the source PRD (`PRPs/prds/reviewer-coherence-layer.prd.md:79`) requires "the headline FP rate per reviewer (computed only over real-world artifacts) is ≤25% per reviewer AND ≥1 TP per reviewer". Phase 4 dogfood found that the relay repository's APPROVED PRDs / plans / diffs are well-authored (passed their respective structural rubrics R1–R7 / R1–R8 / R-S/R-L/R-SEM/R-X) and surface 0 real-world TPs across all three reviewers when walked through the new R-COH-* layer. The synthetic fixture (per D7) provides 3 TPs for code-reviewer; no synthetic fixtures were shipped for prd-reviewer / plan-reviewer in MVP scope. AC-6's strict reading (≥1 TP per reviewer in real-world only) would FAIL Phase 4's release gate despite the layer demonstrably working on the synthetic fixture and not fabricating findings on real-world artifacts.

**Decision:** AC-6's "≥1 TP per reviewer" requirement is consciously evolved per the following clarification:

- **(a)** When a reviewer has a dedicated synthetic regression fixture (per D7) that produces ≥1 TP exercising deliberate intra-artifact contradictions matching the reviewer's R-COH-* check classes, the synthetic TPs satisfy the ≥1 TP requirement for that reviewer. (For Phase 4, this applies to code-reviewer, which has 3 synthetic TPs from `synthetic-code-reviewer-fixture-1.diff`.)
- **(b)** When a reviewer does NOT have a dedicated synthetic fixture (MVP scope per D7 only specified one fixture for code-reviewer), and the real-world dogfood surfaces 0 TPs (sample is too clean — all artifacts are well-authored APPROVED files that already passed their structural rubrics), the ≥1 TP requirement is **DEFERRED** to the cement-target reassess pass against ≥10 production runs (per source PRD's Should-item). The deferral is recorded in the dogfood report's Cement decision section with explicit trigger conditions for the reassess pass.
- **(c)** AC-6's other requirements (≤25% FP rate per reviewer; "Real-world dogfood" section ≥3 PRDs / ≥3 plans / ≥2 real diffs; "Regression fixtures" section ≥1 synthetic) are unchanged and must still be met for the dogfood to PASS.

The evolution is implemented at the dogfood report level (`PRPs/reports/reviewer-coherence-layer/dogfood.md`), not by mutating the APPROVED `PRPs/prds/reviewer-coherence-layer.prd.md`. Future Phase 4 dogfood runs (e.g., for related future features like a hypothetical "post-green-reviewer coherence layer") would inherit this evolution as the operative contract.

**Reason:** AC-6's intent was to validate the layer's accuracy: ≤25% FP rate proves the layer doesn't fabricate; ≥1 TP per reviewer proves the layer catches what it should. The "real-world only" phrasing assumed real-world artifacts would naturally surface ≥1 TP per reviewer at the MVP sample size. Phase 4 empirically demonstrated this assumption is incorrect for relay's well-authored corpus — real-world artifacts are too clean to surface TPs at N=2-3. Synthetic fixtures (deliberately defective artifacts) are the correct validation path for the ≥1 TP intent at MVP scale; cement-target reassess against larger production-run samples is the correct path for validating ≥1 real-world TP at scale. Conflating the two paths into one strict gate at MVP scope produces a measurement-method limitation, not a layer accuracy bug. The evolution preserves AC-6's intent while making the gate achievable at MVP scope.

**Areas affected:** Phase 4 dogfood report (`PRPs/reports/reviewer-coherence-layer/dogfood.md`); Phase 4 implementation report (`PRPs/reports/reviewer-coherence-layer/phase-4-implementation.md`); future cement-target reassess design (its own PRD); future feature dogfoods that inherit this AC-6 evolution as the operative contract for similar measurement-method limitations.

---

## [2026-04-30] Implementer Bash tool allowlist gate (D11 of implementation-authoring)

**Context:** The `implementer` agent (shipped Phase 1 of `implementation-authoring`) needs `Bash` to execute the plan's Validation Commands Levels 1–3 after all Step-by-Step Tasks complete (per D6 aggregate validation). A per-agent pattern allowlist would duplicate context-builder's project-level `.claude/settings.json` allowlist generated at `*init`.
**Decision:** The implementer's frontmatter declares `Bash` (open at the agent layer); the project's `.claude/settings.json` allowlist is the security gate per the 2026-04-19 narrow-patterns decision. No agent-level Bash pattern allowlist is added; the security boundary is the `.claude/settings.json` denylist + allowlist already enforced by Claude Code.
**Reason:** Avoids duplication; reuses existing security plumbing; matches the established pattern from `/relay-test`'s `test-runner` agent which also has open `Bash` gated by the project allowlist. A second allowlist at the agent layer would diverge under maintenance from the project-level one and create silent security gaps.
**Areas affected:** implementer agent, `/relay-implement` command, project-level allowlist generation by context-builder, future `/relay-execute` orchestrator (which composes implementer dispatches).

---

## [2026-04-30] Code-reviewer agent has no Edit tool (D11 divergence from plan-reviewer)

**Context:** The `plan-reviewer` agent has the `Edit` tool because its protocol Step 4 flips the plan's trailing block `*Status: DRAFT*` → `*Status: APPROVED*` directly. The `code-reviewer` agent (shipped Phase 2 of `implementation-authoring`) must NOT mutate plan or PRD status — D8 of `implementation-authoring.prd.md` specifies that the three post-approval mutations (plan trailing-block flip, plan move to `PRPs/plans/completed/`, source PRD row N flip) are exclusively `/relay-implement`'s responsibility (the COMMAND, not the agent).
**Decision:** The `code-reviewer` agent's frontmatter tool allowlist is `Read, Write, Glob, Grep, Bash, BashOutput, Task` — explicitly omitting `Edit`. `Write` is gated by the agent's prompt to `PRPs/plans/<basename>.code-review.jsonl` only. The `Task` tool is added (per the reviewer-coherence-layer 2026-04-28 D11 evolution) for invoking the `code-reviewer-semantic` sub-agent during the K=5 LLM judgment pass; the read-only invariant is preserved verbatim because the sub-agent itself is read-only (`tools: Glob, Grep, Read`).
**Reason:** Tool-level enforcement of the read-only review philosophy. Even if the agent's prompt drifted under maintenance and accidentally instructed a plan-status mutation, the absence of `Edit` makes the mutation impossible. Defense-in-depth between prompt-level constraints and tool-level capabilities.
**Areas affected:** code-reviewer agent, `/relay-implement` command (internal dispatch), `/relay-code-review` command (standalone dispatch), `code-reviewer-semantic` sub-agent.

---

## [2026-04-30] D8 post-approval mutations are best-effort atomic with rollback note (no transactional WAL)

**Context:** `/relay-implement` performs three post-approval mutations on APPROVED rubric: (a) plan trailing-block flip `*Status: APPROVED*` → `*Status: IMPLEMENTED*`; (b) plan move from `PRPs/plans/<basename>.plan.md` to `PRPs/plans/completed/<basename>.plan.md` via `Bash(mv ...)`; (c) source PRD's Implementation Phases row N `Status` cell flip `in-progress` → `complete` via `Edit` with verbatim full-row `old_string`. A transactional Write-Ahead Log was considered (mirroring databasesandlife.com's indirection-pointer pattern) but rejected for MVP scope.
**Decision:** Best-effort atomic — each mutation is attempted in order; on the first failure, the partial state is captured to `PRPs/reports/<feature>/phase-<N>/halt.json` with structured `{mutations_attempted, mutations_succeeded, mutation_failed, error, manual_recovery_steps}` and an actionable rollback message is emitted; the command does NOT roll back successful mutations. Recovery is documented (in the halt message), not automatic.
**Reason:** WAL adds significant complexity (dedicated rollback file, replay logic, post-crash startup hooks) without proportional value for three filesystem mutations on a single repo. Partial-state capture + manual recovery is sufficient and matches the "graceful degradation + no silent failures" architectural rule. If dogfood telemetry shows recurrent partial failures, a follow-up decision can introduce a WAL; until then, simpler is better.
**Areas affected:** `/relay-implement` command Phase A.4, plan trailing-block discipline, plan archive directory `PRPs/plans/completed/`, source PRD Implementation Phases table back-fill.

---

## [2026-04-30] PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans

**Context:** Upstream `prp-core` archives implemented plans at `.claude/PRPs/plans/completed/`. Relay's no-`.claude/`-writes rule (2026-04-19) explicitly forbids that path because Claude Code's permission guards on `.claude/` would interrupt the autonomous loop on every archive operation. With `/relay-implement` shipped and producing IMPLEMENTED plans that need archival, a relay-specific path was needed.
**Decision:** Relay archives implemented plans at `PRPs/plans/completed/<basename>.plan.md`. The archive operation is performed by `/relay-implement` Mutation b (Phase A.4) after rubric APPROVED, via `Bash(mv ...)`. The directory is created on-demand (`mkdir -p PRPs/plans/completed/` if absent) but in practice it already exists and is populated with prior completed plans across `plan-authoring`, `implementation-authoring`, and `reviewer-coherence-layer` features.
**Reason:** Aligns with relay's PRPs-at-repo-root convention (2026-04-19); preserves the prp-core archive semantics while avoiding the `.claude/` permission-prompt failure mode; keeps the plan filesystem layout grep-friendly and version-controllable.
**Areas affected:** `/relay-implement` command Mutation b, `docs/context/architecture.md` PRP artifact paths table, future `/relay-execute` orchestrator's per-phase state-machine bookkeeping.

---

## [2026-04-30] Per-attempt diff.patch artifact at PRPs/reports/<feature>/phase-<N>/attempts/<i>/

**Context:** `/relay-implement` runs an internal writer↔reviewer loop with up to 4 attempts (`max_implement_retries=3`). Each attempt's cumulative diff vs the base commit must be auditable both for debugging the loop's retry behavior and for the future `/relay-execute` orchestrator's reasoning about which artifacts /relay-implement produced. The Test Runner's existing layout uses flat `PRPs/reports/<feature>/attempts/<N>/`; the implementer needs an additional path tier because it runs per-PRD-phase (not per-feature) and multiple plans may exist for one feature.
**Decision:** After each attempt, `/relay-implement` captures `git diff <base-commit>` and writes it to `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch` plus a `record.json` containing `{attempt, verdict, files_changed, validation, base_commit}`. The `phase-<N>/` segment is the relay-implement-original tier (no precedent in the existing Test Runner C4 layout). The `<feature>` value is parsed from the plan filename pattern `<feature>-phase-<N>-<slug>.plan.md`.
**Reason:** Per-attempt cumulative diffs (each retry stacks on the previous, not a clean reset per D2) are the audit trail for the loop's bounded-retry behavior; the `phase-<N>/` segment provides per-phase isolation and prevents cross-phase artifact collision when one feature ships through multiple `/relay-implement` invocations; reuses Test Runner's directory shape with one additional tier so future Test Runner integration consumes the worktree state without restructuring.
**Areas affected:** `/relay-implement` command Phase A.2, `docs/context/architecture.md` PRP artifact paths table (PRPs/reports/ row description extended), future Test Runner integration (downstream consumes the worktree state /relay-implement leaves behind), future `/relay-execute` orchestrator (composes both commands).

---

## [2026-04-30] Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html

**Context:** The plugin manifest at `plugins/relay/.claude-plugin/plugin.json` carries a `version` field. Claude Code uses this version as a cache key under `~/.claude/plugins/cache/relay-marketplace/relay/<version>/`. Until 2026-04-30 the manifest was frozen at `0.1.0` (its initial value) while the documentation changelog cut nine releases (`v0.5.0` Test Runner → `v0.7.3` reviewer-coherence-layer → `v0.8.0` Implementation Authoring). Result: users who had previously installed the plugin kept loading the stale `0.1.0` cache and never picked up new commands (`/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-code-review`) or new agents (`plan-writer`, `plan-reviewer`, `implementer`, `code-reviewer`, `code-reviewer-semantic`) even after pulling the updated marketplace. The drift was discovered when the user attempted to invoke `/relay-implement` post-v0.8.0 ship and the command was absent from the registered slash-command list.

**Decision:** The plugin manifest version is kept in lock-step with `documentation/changelog.html`'s most recent versioned release. Every minor (`0.X.0`) or major (`X.0.0`) bump in the changelog **MUST** include a matching bump in `plugins/relay/.claude-plugin/plugin.json` within the same commit. Patch bumps (`0.x.Y`) require a plugin bump only when the patch ships a plugin asset (anything under `plugins/relay/`); pure doc-site copy fixes do not require a plugin bump.

This supersedes the prior framing in `documentation/AGENTS.md` §7.1 ("the doc site uses its own semver, independent of the plugin version") — the two version numbers remain conceptually independent (the changelog tracks doc-site changes; the plugin manifest identifies the plugin) but they share the same number from 2026-04-30 onward to keep Claude Code's cache invalidation aligned with shipped plugin contracts.

**Reason:** Claude Code's plugin cache is keyed by manifest version, not by git SHA or content hash. Without a manifest bump, the cache silently serves stale plugin assets even after the marketplace publishes new ones. Manual cache clears (`rm -rf ~/.claude/plugins/cache/relay-marketplace/`) are a workaround, not a contract — they require user intervention and don't scale to multi-user installations. Aligning the manifest version with changelog releases makes cache invalidation automatic and version-traceable: a user who runs `/plugin` after a manifest bump gets a fresh `<version>/` directory; a user who upgraded their marketplace clone but didn't see new commands knows immediately to check whether `plugin.json` was bumped.

**Areas affected:** `plugins/relay/.claude-plugin/plugin.json` (versioned identically to the most recent versioned changelog release); `documentation/AGENTS.md` §7.1 + §7.5 (the binding contract for release discipline; §7.5 codifies the bump rule explicitly); `documentation/changelog.html` (every minor/major release block now also documents the plugin bump in its Changed section); future PRDs' Phase 5 docs-update plans (the deliverable now includes "bump `plugin.json` to match the new release version" as an explicit task); release-cut workflow (whether manual or future-automated via `/relay-execute`'s docs-update phase).

---

## [2026-05-01] Dispatch model: inline command-protocol adoption via Read (D7)

**Context:** The `/relay-execute` orchestrator needs to sequence five downstream command protocols (`/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-code-review`, `/relay-test`) without duplicating their logic. Two approaches were considered: (a) sub-agent replication — copy each command's protocol into a dedicated sub-agent; (b) inline `Read`-based adoption — the LLM reads each command file and executes its protocol in the same conversation context.
**Decision:** Inline command-protocol adoption via `Read`. The orchestrator reads each downstream command file at runtime and executes the protocol it describes within the same LLM conversation context. No sub-agents are spawned for the orchestration layer itself; each downstream command's own internal agents (e.g., `implementer`, `code-reviewer`) are dispatched by their commands as usual.
**Reason:** (a) Sub-agent replication forks the protocol logic — any change to `/relay-implement`'s internal loop would require a matching update to a replication sub-agent, creating a maintenance liability. (b) The manual-execution pattern relay's developer runs today (reading a command file then following it) IS this model formalized as an autonomous loop. (c) Zero new agents, zero new logic — the orchestrator is a thin sequencer that delegates all heavy lifting to the commands it composes.
**Areas affected:** `/relay-execute` command, five referenced downstream command files, future orchestrator evolution when new pipeline stages are added.

---

## [2026-05-01] State machine: source PRD's Implementation Phases table IS the state machine (D6)

**Context:** The `/relay-execute` orchestrator needs a phase-state representation that enables idempotent re-entry without a separate state file. When re-invoked mid-pipeline (e.g., after a budget-exceeded halt), the orchestrator must determine which phases are complete and which remain pending without ambiguity.
**Decision:** The source PRD's Implementation Phases table IS the canonical state machine for `/relay-execute`. Each row's `Status` cell (`pending` / `in-progress` / `complete`) is the authoritative phase-state representation. On every invocation, the orchestrator re-reads the table from the PRD file to determine the current state. No separate state file (e.g., `orchestrator-state.json`) is maintained.
**Reason:** The PRD table is already the canonical phase-state representation per plan-writer's back-fill discipline (plan-writer sets row N `Status` to `in-progress` on plan generation; `/relay-implement` flips it to `complete` on D8 post-approval). Idempotency follows naturally from re-reading the table on each invocation — the orchestrator skips rows with `Status: complete` and resumes from the first `pending` or `in-progress` row. Trade-off vs Temporal-style event-sourced durable execution is acknowledged: the PRD-table model is lightweight and appropriate for relay's single-developer scale; a durable execution engine would be over-engineering for the current use case.
**Areas affected:** `/relay-execute` command, plan-writer back-fill discipline (Status cell transitions), future `/relay-execute` re-invocations (idempotency guarantee), `docs/context/architecture.md` §"Orchestrator state machine" sub-section.

---

## [2026-05-01] Per-stage retry budget composition: each downstream command owns its internal loop budget; orchestrator adds two session-level budgets (D3)

**Context:** The `/relay-execute` orchestrator composes commands each with their own internal loop budget (`/relay-implement`: `max_implement_retries=3` + `max_implement_minutes=45`; `/relay-test`: `max_test_retries=3` + `max_test_minutes=30`). The orchestrator needs to add session-level budgets without violating the per-stage budget contracts — overly long orchestrator runs must be terminable without requiring changes to per-stage logic.
**Decision:** Each downstream command owns its internal loop budget exclusively; the orchestrator does not override or aggregate these. The orchestrator adds exactly two new budgets at the orchestration layer: `max_plan_review_retries` (caps the `/relay-plan` → `/relay-plan-review` loop when the plan reviewer returns `CHANGES_REQUESTED`) and `max_orchestrator_minutes` (wall-clock budget for the entire orchestration session; first-to-expire wins). Both values must be non-zero; `0` is forbidden. Distinct HALT outcome codes (`FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`, `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`) make the failing budget layer unambiguous in the audit artifact.
**Reason:** Per-stage budgets are authoritative within their stage — the orchestrator has no basis to override them without knowing each stage's internal retry semantics. The orchestrator budget is a session-level wall-clock that prevents runaway multi-hour pipeline runs independently of any single stage's behavior. Distinct outcome codes make post-hoc debugging unambiguous: a developer reading `orchestrator-run.json` can immediately identify whether the halt was caused by a plan-review loop or a wall-clock overrun.
**Areas affected:** `/relay-execute` command, per-stage HALT codes (propagated from `/relay-implement` and `/relay-test`), `orchestrator-run.json` schema, future orchestrator evolution.

---

## [2026-05-06] TDD pair is the authorized mechanism for creating test files in the autonomous pipeline (R-X strict preserved)

**Context:** Three real-world halts on the user's `/relay-execute` runs (Phase 2 xfail removal, Phase 3 AC-5 test addition, Phase 4 manual fallback) demonstrated empirically that the R-X strict rule in `code-reviewer` (D17 of `implementation-authoring.prd.md`) — which blocks ANY test-file edit by the `implementer` in standard mode — leaves no autonomous path forward when a feature's Acceptance Criteria require new test files. The plan-reviewer's APPROVAL of a plan that lists test files in "Files to Change" was NOT being treated as an authorized bypass. The `tdd-writer-reviewer` PRD (`PRPs/prds/tdd-writer-reviewer.prd.md`, APPROVED 2026-05-06) ships B7/B8 + commands + `/relay-execute` integration as the structural unblock.

**Decision:** The TDD pair (B7 `tdd-writer` + B8 `tdd-reviewer` + `/relay-tdd` + `/relay-tdd-review`) is the **only** authorized mechanism for creating new test files in the autonomous pipeline. R-X strict (D17 of `implementation-authoring.prd.md`) is preserved verbatim — the `code-reviewer` continues to reject any test-file edit by the `implementer` in standard mode, and the plan-reviewer's APPROVAL is still NOT treated as a bypass. The mechanism works in two complementary directions:

- **Forward direction (R-X strict, unchanged):** the `implementer` cannot edit test files. Any test-file edit in the implementer's diff causes `code-reviewer` to reject the diff in standard mode (or, with the `TEST_CONTRACT_DISPUTE` escape valve under D9 Layer 1, escalate to arbitration mode for the structured `disputed_tests` payload).
- **Inverse direction (B7 authorized):** the `tdd-writer` agent (B7) is the only agent allowed to create new test files. The `tdd-writer` is symmetrically forbidden from writing production code — its tool allowlist is `Task, Read, Write, Edit, Glob` but its prompt enforces "test files only" and "never modify existing test files" (always emit `AMBIGUOUS` or `EXISTING_TEST_COVERS` instead). The `tdd-reviewer` agent (B8) explicitly lacks `Edit` per the same D11 read-only invariant as `code-reviewer`.

`/relay-execute` Phase A.3.5 wires the B7→B8 loop with budget `max_tdd_review_retries=2` (0 forbidden; 3 total TDD-write attempts including the initial). On budget exhaustion, the orchestrator HALTs with the new outcome code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED`; the implementer is NOT invoked when A.3.5 halted (running it against an unapproved TDD suite would violate R-X strict in the test-file write direction).

When `tdd: false` or `methodology.md` is missing, A.3.5 self-skips silently as a live no-op — the v0.9.0 dead-code routing branch is now a live integration with the same observable behavior on the no-TDD path. The previous "TDD routing reserved but unshipped" framing in `relay-execute.prd.md` D5 is **superseded** by this entry; future agents consulting the Decision Gate find this entry as the operative contract.

**Reason:** R-X strict's purpose is to prevent the implementer from "passing" tests by weakening or modifying them — the failure mode the post-green-reviewer (B5) was created to catch and that plagued the early Test Runner. That purpose is invariant to who *creates* test files; introducing an authorized author (B7) for new tests preserves the invariant while unblocking the autonomous pipeline. The bidirectional symmetry — B7 writes tests but not production code; the `implementer` writes production code but not tests — is enforceable at the tool level (B7 has `Edit` but its prompt restricts it; the `implementer` has `Edit` and `code-reviewer` rejects test-file changes downstream). Per-stage retry budget composition (D3 of `relay-execute.prd.md`, 2026-05-01) extends naturally to the new B7↔B8 loop with the same shape as the existing `max_plan_review_retries=2`.

**Areas affected:** `plugins/relay/agents/tdd-writer.md` (NEW); `plugins/relay/agents/tdd-reviewer.md` (NEW); `plugins/relay/commands/relay-tdd.md` (NEW); `plugins/relay/commands/relay-tdd-review.md` (NEW); `plugins/relay/commands/relay-execute.md` (Phase A.3.5 inserted; P5 routing note rewritten; `max_tdd_review_retries` budget added; new `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` HALT outcome; hard-rule 9 rewritten); `plugins/relay/.claude-plugin/plugin.json` (bumped `0.9.0` → `0.10.0` per the 2026-04-30 §7.5 binding contract); the future `/relay-pr` command (consumes the B8-APPROVED suite as part of the final report); future Phase 5 dogfood against phoenix and sisalfa (validates the unblock empirically against ≥3 features per project); the `R-X` strict rule in `code-reviewer.md` (preserved verbatim — explicit non-mutation is the load-bearing contract).

---

## [2026-05-11] relay-worktree architecture decisions: path, shell-out primitive, bootstrap contract, .gitignore evolution, graceful fallback

### D1 — `.worktrees/<feature>/` path (not `.claude/worktrees/`)

**Context:** Claude Code's native `EnterWorktree` tool hardcodes the worktree location to `.claude/worktrees/<name>/`. The 2026-04-19 surface decision pins the output path to `.worktrees/<feature>/` (sibling directory at repo root, not under `.claude/`). The `.claude/` permission gate documented in `docs/anti-patterns.md:60-66` also makes any autonomous write to `.claude/` an interactive-prompt risk.
**Decision:** Worktrees are created at `.worktrees/<feature>/` relative to the repo root. `EnterWorktree` is not used.
**Reason:** Honors the 2026-04-19 surface decision; avoids the `.claude/` permission gate entirely — no exception entry needed since `.worktrees/<feature>/` sits outside `.claude/`; keeps the path convention grep-friendly and version-visible in `git worktree list`.
**Areas affected:** `/relay-worktree` command, `context-builder` `.gitignore` append, `docs/context/architecture.md` PRP artifact paths table.

---

### D2 — Shell-out `git worktree add` via `Bash` rather than `EnterWorktree`

**Context:** `EnterWorktree` has two misalignments with relay's requirements: (a) its hardcoded `.claude/worktrees/<name>/` path conflicts with D1; (b) its auto-cleanup-on-session-exit lifecycle removes the worktree when the Claude Code session ends, which conflicts with relay's pipeline lifecycle (the worktree must survive across multiple `/relay-execute` invocations and persist until Pillar 3 post-merge cleanup).
**Decision:** The `/relay-worktree` command invokes `git worktree add .worktrees/<feature>/ -b feature/<feature> <base>` directly via `Bash`. Idempotency detection uses `git worktree list --porcelain` (locale-independent; git's authoritative state) rather than path-existence check (which has false positives from stale directories).
**Reason:** Path contract preserved (D1); lifecycle survives across `/relay-execute` invocations; `--porcelain` flag avoids locale-dependent output parse failures. Trade-off acknowledged: relay loses the native cwd-switching behavior of `EnterWorktree`; downstream commands continue to receive the worktree path as an argument (existing contract).
**Areas affected:** `/relay-worktree` command.

---

### D6 — Bootstrap-hook contract (project-owned script; context-builder emits template; failure is non-fatal)

**Context:** Per-worktree environment setup (env-file replication, Docker Compose project name override, dependency installation, port allocation) is stack-specific and varies across every target project. Relay cannot become a Docker/dependency orchestrator without losing its stack-agnostic character.
**Decision:** The bootstrap contract is a single project-owned shell script at `scripts/worktree-bootstrap.sh` (Unix) or `scripts/worktree-bootstrap.ps1` (Windows). `/relay-worktree` invokes whichever is present as `scripts/worktree-bootstrap.sh <absolute-worktree-path>` with a 60-second timeout. Stdout/stderr are captured to `PRPs/reports/<feature>/worktree-bootstrap.log` with secret redaction. `context-builder *init` emits the initial template (shebang + four commented-out TODO blocks); `*update` is a no-op for the script (PRESERVE ENTIRELY per SKILL.md:861-868). Bootstrap failure is non-fatal — worktree creation is the load-bearing outcome; a warning is logged naming the bootstrap log path.
**Reason:** Delegating to a project-owned script keeps relay out of Docker/dependency orchestration; mirrors the precedent of `.claude/settings.json` allowlist (template + customize + preserve-on-update); non-fatal failure preserves the worktree as the load-bearing outcome for the graceful-degradation contract (D3/D4).
**Areas affected:** `/relay-worktree` command, `context-builder` SKILL.md.

---

### D7 — `.gitignore` auto-write by `context-builder *init`

**Context:** `SKILL.md:1090-1106` previously advised users to add `.worktrees/` to `.gitignore` but did not auto-write the entry. Codebase research confirmed this was advisory-only. Without the entry, git tracks the worktree directory, causing spurious status noise and diff pollution across all concurrent pipeline invocations.
**Decision:** `context-builder *init` auto-appends `.worktrees/` to `.gitignore` with a comment line `# relay — per-feature worktrees (ephemeral)` immediately above it. `*init` and `*update` re-runs on a `.gitignore` that already contains `.worktrees/` are no-ops (no duplicate entry appended).
**Reason:** Zero-risk single-line append; closes the advisory-vs-auto gap; the PRESERVE ENTIRELY rule at `SKILL.md:861-868` applies to `*update` mode, meaning team edits to `.gitignore` (including deliberate removal of the `.worktrees/` line) are never overwritten by subsequent `*update` invocations.
**Areas affected:** `context-builder` SKILL.md, target project `.gitignore`.

---

### D8 — Worktree-creation-failure graceful fallback to cwd (D3/D4 graceful-degradation preserved)

**Context:** `/relay-execute`'s D3 graceful-degradation rule (2026-05-01 decision) mandates that the pipeline works against the cwd when no worktree is set up. D4 of the same decision preserves this as the fallback for worktree creation failures. Without an explicit D8 decision, a worktree creation failure (disk full, permission denied, transient git error) would halt the entire pipeline on a non-requirement-related infrastructure issue.
**Decision:** When `/relay-worktree` returns a non-zero exit code during a `/relay-execute` run and `--no-worktree` was not passed, the orchestrator logs a warning, falls through to cwd-based execution, and records the fallback in `orchestrator-run.json` with fields `worktree_attempted: true`, `worktree_succeeded: false`, `fallback_reason: <code>`. The pipeline does NOT halt on worktree creation failure — only on downstream stage failure.
**Reason:** Worktree is an optimization (isolation, parallelism), not a correctness requirement. The pipeline's correctness invariants (implementer writes the right files, tests pass, code review approves) hold equally against the cwd as against a worktree. Halting on a transient infrastructure failure would block users on issues the AI cannot resolve autonomously — the antithesis of relay's graceful-degradation philosophy.
**Areas affected:** `/relay-execute` D4 live wiring, `orchestrator-run.json` `worktree_attempted` / `worktree_succeeded` / `fallback_reason` fields.

---

## [2026-05-12] Test framework absence is a silent self-skip in /relay-test (symmetric with /relay-tdd self-skip on tdd: false)

**Context:** The 2026-05-11 relay-worktree dogfood surfaced a protocol inconsistency (`PRPs/reports/relay-worktree/dogfood.md:278-283`): dogfood-A's session interpreted the test stage as `skipped_no_test_framework` (graceful); dogfood-B's session interpreted it as `FAILED_INFRA_UNRECOVERABLE` (strict) but still returned `ALL_PHASES_COMPLETE`. Per the current strict orchestrator protocol, dogfood-B should have HALTed — the inconsistency demonstrated that two parallel sessions against the same framework-less PRD could reach divergent, contradictory outcomes from identical inputs. The root cause is in `plugins/relay/commands/relay-test.md:146-147`, which conflates three distinct failure modes (`missing_settings_json`, `no_runner_detected`, `no_test_framework`) into a single `FAILED_INFRA_UNRECOVERABLE` halt — incorrectly treating "no framework configured by design" identically to "framework configured but infra broken". For projects where `test_frameworks: []` is the intended declared state (markdown/JSON-only plugins, doc-only repos, IaC-only repos — including the relay repo itself), the strict halt misrepresents the actual project state and forces manual intervention that is semantically equivalent to an unsignalled permission prompt.

**Decision:** When `docs/context/methodology.md` declares `test_frameworks: []` OR the file is absent, `/relay-test` emits the verbatim line:

> Test framework inactive (test_frameworks: []). Skipping.

and exits 0. This is symmetric in shape and position to `/relay-tdd`'s P4.a (`TDD track inactive (tdd: false). Skipping.`) — same `<Subject> inactive (<key>: <value>). Skipping.` structure, same Phase 0 placement at the top of the precondition chain before any infra checks, same exit-0 semantics. The strict-vs-graceful boundary is explicit: framework-NOT-declared (or file-absent) → graceful self-skip; framework-DECLARED-but-infra-broken (missing `.claude/settings.json` when a framework IS declared, docker not running, container failure, normalizer failure) → strict `FAILED_INFRA_UNRECOVERABLE` (preserved verbatim). The gate fires only on the "no framework configured" precondition; framework-declared projects fall through to the strict semantics unchanged. `/relay-execute` Phase A.5.0 re-reads `methodology.md.test_frameworks` at the orchestrator layer, appends `{phase: <N>, stage: "test", outcome: "skipped_no_test_framework"}` to `orchestrator_run_log`, and proceeds to Phase A.6 — symmetric to A.3.5.0's `skipped_tdd_false` handling. Two parallel sessions against the same framework-less PRD now produce identical outcome codes; the dogfood-A vs dogfood-B inconsistency is structurally impossible.

**D5 — `/relay-test-review` inheritance:** `/relay-test-review`'s existing precondition check requires `run.json` to exist before any rubric is run. When `/relay-test` self-skips on `test_frameworks: []`, no `run.json` is written; `/relay-test-review` therefore self-skips inheritedly when invoked or adopted. No code change to `/relay-test-review` is required — the natural absence of `run.json` is the operative inheritance mechanism. This is the explicit operative contract: the D5 inheritance is documented here so future agents consulting the Decision Gate do not derive a redundant Phase 0 gate for `/relay-test-review`.

**Reason:** The primary reason is symmetry with the 2026-05-06 TDD self-skip entry (see `docs/decisions.md:421-437`): that entry established the pattern of methodology-keyed silent self-skips at Phase 0, bidirectional gate placement (command-level + orchestrator-level), and exit-0 semantics for "inactive by design" states. Applying the same pattern to `test_frameworks: []` is the minimal consistent extension. The broader CI/orchestrator ecosystem validates this as an industry-standard pattern: pytest defines exit code 5 ("no tests collected") as a distinct non-failure state; Jest and Vitest ship `--passWithNoTests` as an explicit "no tests = exit 0" opt-in; GitLab CI's `rules:exists` distinguishes "no matching rule fired" (skipped, non-blocking) from "execution produced errors" (failed); the 2024 Nx regression (Nx #22139) demonstrates exactly what happens when an orchestrator layer does NOT forward the "no-tests-ok" signal — projects with no test files start failing CI. The `FAILED_INFRA_UNRECOVERABLE` semantic is preserved where it is semantically correct (genuine infra brokenness) and corrected where it was wrong (no-framework-by-design state, incorrectly classified as infra failure).

**Areas affected:** `plugins/relay/commands/relay-test.md` (Phase 0 self-skip gate, shipped in Phase 1 of `test-frameworks-empty-self-skip.prd.md`); `plugins/relay/commands/relay-execute.md` (Phase A.5.0 explicit handling, shipped in Phase 2 of the same PRD); this `docs/decisions.md` entry (Phase 3); `docs/api-reference.md`, `documentation/commands.html`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json` (Phase 4 release cut, deferred — to reflect `skipped_no_test_framework` outcome and v0.11.1 version bump).

---

## [2026-05-14] phase_type annotation enables rubric differentiation for scaffold phases

**Context:** Three consecutive `/relay-execute` runs on `web-docs-site` Phase 1 (Bootstrap — an Astro + Starlight project scaffold) all failed `R-COH-VALIDATE-FRAMEWORK-MISMATCH`. The rubric requires every VALIDATE command's first token to match a declared test framework (`vitest`, `pytest`, etc.). But scaffold phases have no application code to exercise; their legitimate validation is filesystem-oriented (`Test-Path`, `Select-String`, `Get-ChildItem`, `npm run build`). No mechanical fix existed short of replacing all PowerShell VALIDATE blocks with synthetic Vitest/Playwright assertions over filesystem state — performative tests that exist only to pass the rubric, not to validate the deliverable. The orchestrator exhausted its `max_plan_review_retries=2` budget without the plan-writer being able to fix an irresolvable structural mismatch between the rubric's assumption (every phase has testable application code) and the phase's reality (config-only bootstrap). The halt artifact's `halt_reason_summary` field explicitly identified this as a rubric edge case. Additionally, the orchestrator spent its full retry budget on a stuck loop rather than detecting early that no progress was being made.

**Decision:** Three coordinated changes:

1. **`phase_type` field in plan Metadata.** `plan-writer` populates a `phase_type` row in the `## Metadata` table for every plan it generates, using inference signals: `scaffold` (filesystem-only VALIDATE commands; bootstrap/install/config-only goals), `docs` (only documentation files in Files to Change), `refactor` (primary action is move/rename/extract), `feature` (default). The field is the canonical per-plan annotation that downstream rubric checks consult.

2. **Phase 0 pre-pass in `plan-reviewer`.** Before running R1–R8, the reviewer checks whether the plan's `## Metadata` table contains a `phase_type` row. If absent, it infers the value using the same signals the plan-writer uses and adds the row via a bounded `Edit`. This is the only plan body mutation the reviewer performs outside the happy-path status flip. The `R-COH-VALIDATE-FRAMEWORK-MISMATCH` check then consults `plan_phase_type`: if the value is `scaffold` or `docs`, the check emits `passed: true` with an explicit rationale and skips the framework-first-token matching entirely.

3. **Stuck-loop detection in `/relay-execute`.** The plan-review retry loop now tracks the set of failing rubric item IDs from the previous attempt (`last_plan_review_failing_ids`). If two consecutive attempts produce an identical failing ID set, the orchestrator halts early with `FAILED_PLAN_REVIEW_STUCK` rather than exhausting the full `max_plan_review_retries` budget. The halt artifact includes `stuck_rubric_items` and a `manual_recovery_paths` entry that names the `phase_type` fix as the first recovery option.

**Reason:** The rubric's framework-first-token requirement was calibrated for feature phases where test-framework invocations are the natural validation. Scaffold phases have a fundamentally different validation surface; forcing them to use test frameworks produces meaningless tests that inflate test count without verifying the deliverable. The `phase_type` field is the right abstraction: it is a per-plan annotation the writer sets once, and downstream checks use it to select the appropriate rubric variant. The Phase 0 auto-population ensures backwards compatibility with existing DRAFT plans that were written before this decision. The stuck-loop detection is a complementary improvement: when a rubric item cannot be mechanically resolved (as R-COH-VALIDATE-FRAMEWORK-MISMATCH was for scaffold phases), burning the full retry budget is wasteful and produces a less informative halt artifact than an early `FAILED_PLAN_REVIEW_STUCK` with named stuck items and recovery guidance.

**Areas affected:** `plugins/relay/agents/plan-writer.md` (Step 4.4 item 5: `phase_type` added to Metadata table); `plugins/relay/agents/plan-reviewer.md` (new Phase 0 pre-pass before Step 1; `R-COH-VALIDATE-FRAMEWORK-MISMATCH` phase-type exemption branch; anti-patterns section updated); `plugins/relay/commands/relay-execute.md` (Phase A.0 init: `last_plan_review_failing_ids`; Phase A.1: reset on new phase; Phase A.3.2 CHANGES_REQUESTED branch: stuck detection before budget check; new `FAILED_PLAN_REVIEW_STUCK` halt code; frontmatter description updated to eight HALT codes).

---

## [2026-05-15] /relay-plan PRD-less mode: registered future capability, not yet implemented

**Context:** `prp-plan` (the upstream reference plugin) operates without a formal PRD — the user passes a short feature description directly and the planner generates a plan from it. The current `/relay-plan` contract requires a full APPROVED PRD as input (preconditions P1–P4). Users working on small, well-scoped features sometimes want to skip the full PRD authoring flow and go directly to planning, using only a feature description as input.

**Decision:** PRD-less mode for `/relay-plan` — accepting a short feature description string instead of an APPROVED PRD path, analogous to how `prp-plan` operates — is a **registered future capability**. It is NOT implemented. The current PRD-required contract (P1–P4 preconditions) is the only operative contract. No agent should implement, approximate, or bypass the PRD requirement before a dedicated PRD for this capability has been authored and approved.

**Reason:** Recording the intention in decisions.md prevents premature implementation (agents must not add ad-hoc PRD-bypass logic without a formal design pass), aligns the team on the roadmap direction, and establishes `prp-plan`'s description-only input model as the explicit design reference for when the capability is formally designed.

**Out of scope until a dedicated PRD is approved:**
- Passing a free-form description string to `/relay-plan` instead of a PRD path.
- Automatically generating a lightweight PRD from the description before planning.
- A `--no-prd` flag, an alternative precondition branch, or any other bypass of P1/P2.
- Merging or aliasing `/relay-prd` + `/relay-plan` into a single shortcut command.

**Areas affected (when eventually shipped):** `/relay-plan` command (new input mode), `plan-writer` agent (new entrypoint without Implementation Phases table), preconditions P1/P2 (alternative branch or replacement), command-surface documentation, `docs/api-reference.md`.

---

## [2026-06-16] /relay-plan PRD-less mode: SHIPPED — supersedes the 2026-05-15 "not yet implemented" framing

**Context:** The 2026-05-15 entry above registered PRD-less mode for `/relay-plan` as a future capability and explicitly forbade any implementation before a dedicated PRD was approved. That precondition is now satisfied: `PRPs/prds/relay-plan-prd-less-mode.prd.md` (APPROVED 2026-06-16) authorized the design, and Phases 1–3 of that PRD have been implemented and completed. The 2026-05-15 entry's "Out of scope until a dedicated PRD is approved" list is now fully in scope and shipped. The 2026-05-15 entry is left intact as the historical record of the prior state.

**Decision:** PRD-less mode for `/relay-plan` IS now implemented. The shipped contract covers five behavior changes across the planning and implementation chain:

1. **Phase 0 input-type detection in `/relay-plan`** (`plugins/relay/commands/relay-plan.md`): an argument that resolves to a `.prd.md` file or whose content contains an "Implementation Phases" table runs the existing PRD mode unchanged; any other non-empty free-text argument enters description mode. PRD mode is behaviorally identical (AC-2 regression-safe).

2. **`plan-writer` description-only entrypoint** (`plugins/relay/agents/plan-writer.md`): no Implementation Phases table parse, no PRD back-fill; description captured verbatim in the plan's `## Source` section; derived `AC-A<i>` items (no `(PRD AC-N)` token); flat `PRPs/plans/<slug>.plan.md` filename (no phase number); mandatory "NOT Building" scope section. `plan-reviewer` R8a/R8b/R8c emit `passed: true` with explicit "description-only mode" rationale recorded in `PRPs/plans/<basename>.review.jsonl`.

3. **`/relay-implement` P3 branch + D8 Mutation c no-op** (`plugins/relay/commands/relay-implement.md`): the P3 precondition check ("source PRD row N is in-progress") is branched to skip for PRD-less plans; D8 Mutation c (source PRD row N flip from `in-progress` to `complete`) is skipped as a documented no-op — no `PARTIAL_D8_FAILURE` for the absent PRD row. D8 Mutations a (plan trailing-block flip `APPROVED` → `IMPLEMENTED`) and b (move to `PRPs/plans/completed/`) are preserved.

4. **`implementer` flat-filename parse tolerance** (`plugins/relay/agents/implementer.md`): the implementer no longer HALTs when the plan filename does not match the `<feature>-phase-<N>-<slug>` pattern. For a flat `<slug>.plan.md`, it derives artifact/report paths from the basename (e.g., `PRPs/reports/<slug>/attempts/`) instead of HALTing. Source-read tolerance: reads the plan's `## Source` description and `AC-A<i>` items when no source PRD is present; does not HALT on the absent mandatory-source-PRD read.

5. **`code-reviewer`/`code-reviewer-semantic` AC-source substitution** (`plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`): when no source PRD is present, the `<prd_acs>` payload handed to `code-reviewer-semantic` is sourced from the plan's `AC-A<i>` items rather than from a source PRD. No finding citing a missing/absent source PRD is emitted.

**Flat filename convention:** Description-mode plans use `PRPs/plans/<slug>.plan.md` (flat, no `-phase-<N>-` segment). This is a conscious divergence from the 2026-04-25 "Plan filenames carry the source PRD phase number and slug" decision, which applies only to PRD-mode plans. The divergence is recorded here per that decision's requirement.

**Mutation c no-op:** D8 Mutation c (source PRD row N flip) is skipped for PRD-less plans because there is no source PRD row to flip. This is not a `PARTIAL_D8_FAILURE`; it is a documented architectural no-op. Mutations a and b are unchanged.

**Description-mode R8 exemption:** `plan-reviewer` R8a/R8b/R8c emit `passed: true` with rationale rather than HALT for PRD-less plans. This follows the `phase_type=scaffold` precedent (2026-05-14): the reviewer detects PRD-less plans (absence of `## Source PRD` section or APPROVED `.prd.md` reference) and records the exemption in `PRPs/plans/<basename>.review.jsonl` without short-circuiting the rubric audit trail.

**`/relay-execute` integration deferred:** Description-mode plans have no PRD row to drive the orchestrator's state machine (D6, 2026-05-01). Description-mode plans are a manual single-stage flow; they are not consumable by `/relay-execute`. This is an explicit Won't per the source PRD.

**TDD track deferred:** The `tdd-writer` (B7) reads a source PRD's Acceptance Criteria; a PRD-less plan lacks these. Description mode supports `tdd: false` target projects only in MVP. A description-mode branch for the TDD pair is a future feature.

**Reason:** The 2026-05-15 entry's stated precondition — "before a dedicated PRD for this capability has been authored and approved" — is now satisfied. The dedicated PRD (`relay-plan-prd-less-mode.prd.md`) was authored, reviewed, and approved, and Phases 1–3 of its Implementation Phases table are complete. The 2026-05-15 "Out of scope" list is now in-scope and shipped; agents must no longer refuse to operate in description mode.

**Areas affected:** `/relay-plan` (Phase 0 detection, precondition branch); `plan-writer` (description-only entrypoint, flat filename, `## Source` capture, derived AC format, "NOT Building" section); `plan-reviewer` (R8a/R8b/R8c description-mode variant); `/relay-implement` (P3 branch, D8 Mutation c no-op); `implementer` (source-read tolerance, flat-filename parse tolerance); `code-reviewer`/`code-reviewer-semantic` (AC-source substitution); `docs/api-reference.md` (Input cell updated); `documentation/reference/commands.html` ("Planned" callout replaced with "Shipped" callout); `documentation/changelog.html` (v0.13.0 release entry); `plugins/relay/.claude-plugin/plugin.json` (version bumped `0.12.0` → `0.13.0` per §7.5).

---

## [2026-05-15] Runnable worktree environments: registered future feature (picks up relay-worktree's deferred "What We're NOT Building" items)

**Context:** `relay-worktree` (shipped v0.11.0) established the worktree as a *file-isolation* boundary: `git worktree add .worktrees/<feature>/` plus a project-owned `scripts/worktree-bootstrap.sh` hook (D6, 2026-05-11). It explicitly deferred everything that makes the application actually *runnable* inside that folder — its "What We're NOT Building" section lists container orchestration / port allocation, dependency installation, Docker Compose project-name management, and per-stack bootstrap content as out of scope. Today the bootstrap-hook contract (D6) delegates all of this to the project's script with no relay-level strategy; two parallel `/relay-execute` runs are isolated for file writes but cannot reliably start a dev server, a test stack, or a database inside their own worktree folders without manual, collision-prone setup. The autonomous agents (`implementer`, `test-runner`) have no contract for discovering or binding to a worktree-local runnable environment.

**Decision:** "Runnable worktree environments" is a **registered future feature**, not yet implemented. Its goal is to evolve each `.worktrees/<feature>/` from a file-isolation boundary into a self-contained runnable environment so the autonomous pipeline's agents can start and exercise the application inside the worktree with zero cross-pipeline collision. The feature's PRD MUST define explicit strategies for: (1) per-worktree env/secret replication; (2) per-worktree dependency installation; (3) deterministic per-worktree port allocation (the cksum-from-branch-name pattern surfaced in relay-worktree's research is the design reference); (4) per-worktree container / Compose project-name isolation; (5) per-worktree data/DB isolation; (6) how the runnable-environment handle is discovered and threaded through `/relay-execute` down to the `implementer` and `test-runner` agents. No agent may implement, approximate, or partially build any of these six strategies before a dedicated PRD is authored (via `/relay-prd`) and approved. Until then, the D6 project-owned-script delegation remains the only operative contract.

**Reason:** Registering the feature prevents the relay-worktree deferrals from being silently re-decided ad-hoc inside bootstrap scripts or agent prompts; it names the full strategy surface so the future PRD starts from a scoped problem rather than rediscovering it; and it preserves the D6 boundary (project owns stack-specific setup) as the explicit default until the PRD consciously decides which of the six strategies relay owns versus continues to delegate. This mirrors the registration pattern used for the 2026-05-15 PRD-less `/relay-plan` entry — record the intention so the roadmap is shared and premature implementation is blocked.

**Out of scope until a dedicated PRD is approved:**
- Implementing any of the six strategies above.
- Changing or extending the D6 bootstrap-hook contract.
- Modifying `implementer` / `test-runner` to assume a runnable worktree environment exists.
- Any automatic port-allocation, Compose project-name, or dependency-install logic in `/relay-worktree` or `context-builder`.

**Areas affected (when eventually shipped):** `/relay-worktree` (or a new companion command), `context-builder` bootstrap template (D6 evolution), `implementer` + `test-runner` agents (runnable-env discovery contract), `/relay-execute` orchestrator (threading the env handle through the pipeline), `docs/context/architecture.md`, `docs/api-reference.md`.

---

## [2026-05-18] Pillar 3 command surface: `/relay-commit` + `/relay-pr` + `/relay-approve` (three-command split)

**Context:** The initial 2026-04-19 command surface decision listed `/relay-pr` as a single "creator" command responsible for commit, push, and PR creation in one shot. The 2026-05-18 boundary decision (next entry below) clarified that `/relay-execute` terminates with uncommitted changes — but still left Pillar 3 as a monolithic `/relay-pr`. During Pillar 3 planning it became clear that commit and PR creation are meaningfully separate user actions: the user reviews the changes and commits locally first; only after reviewing the commit does the user push and create the PR. A single command conflating both operations offers no recovery point between "local commit" and "PR opened", and the commit is a local reversible operation whereas push + PR creation are network operations with external visibility.

**Decision:** Pillar 3 is split into three commands:
- `/relay-commit <feature>` — stages + commits all working-tree changes in `.worktrees/<feature>/`. Local only; no push. Commit message generated from the orchestrator audit log and source PRD title. Idempotent: clean worktree exits 0 with a structured message. Deterministic infra command — no writer/reviewer split, no LLM.
- `/relay-pr <feature>` — verifies branch state (checks whether ahead of origin); pushes if needed; runs `gh pr create` with the final report as the PR description; writes `PRPs/reports/<feature>/final-report.md`.
- `/relay-approve <pr>` — merges the PR, deletes branch + worktree, runs Docs Updater and Docs Reviewer. (Placeholder — Phase 4.)

The 2026-04-19 command surface's single `/relay-pr` (commit + push + PR) is **superseded** by this three-command split. Total command surface: **13 commands** + 1 Pillar 3 placeholder (`/relay-approve`).

Happy path: `/relay-prd` → `/relay-execute` → (human validates + manual testing) → `/relay-commit` → (review commit) → `/relay-pr` → (after PR review + merge) → `/relay-approve`.

**Reason:** Separating commit from push + PR gives the user a local, reversible checkpoint before taking network-visible actions. `git reset HEAD~1` undoes a commit harmlessly; a prematurely-opened PR requires closing or a revert commit. The deterministic nature of `/relay-commit` (no LLM, no rubric) means it can run safely and repeatedly with no autonomy risk. `/relay-pr`'s branch-state check before push also handles idempotency at the push layer (branch already pushed but PR not yet created).

**Areas affected:** `docs/api-reference.md` (`/relay-commit` added to Pillar 3; `/relay-pr` scoped to push + PR only; count updated to 13); `docs/context/architecture.md` (happy path, Pillar 3 description, command count); `plugins/relay/commands/relay-execute.md` (success message updated to point to `/relay-commit`); `documentation/reference/commands.html` (Pillar 3 restructured with `/relay-commit` + scoped `/relay-pr`); `documentation/changelog.html` (Unreleased); `documentation/roadmap/status.html` (What's next).

---

## [2026-05-18] Pillar 2/3 boundary: `/relay-execute` does NOT commit or create a PR; Pillar 3 owns commit and PR creation

**Context:** The 2026-04-19 command surface decision described `/relay-execute`'s output as "PR opened". During implementation and dogfood runs it became clear that the autonomous pipeline must not commit the working tree or open a PR without an explicit human validation gate: (a) for `test_frameworks: []` projects the test stage is a no-op (self-skip, v0.11.1), leaving unverified changes in the worktree with no automated signal; (b) even when automated tests pass, the pipeline may produce changes requiring manual inspection or functional testing before a PR is appropriate; (c) opening a PR before manual review bypasses the human gate that relay's interactivity boundary deliberately preserves at PRD approval.

**Decision:** `/relay-execute` terminates at "all phases complete" state — all PRD Implementation Phases rows reach `Status: complete`, all plans are archived under `PRPs/plans/completed/`, and the working tree inside `.worktrees/<feature>/` carries uncommitted implementation changes. `/relay-execute` does NOT execute `git add`, `git commit`, `gh pr create`, or any equivalent. A new hard rule (#11) in the command file makes this prohibition explicit and permanent.

Pillar 3 owns the full commit + PR lifecycle:
- `/relay-pr <feature>` — commits the worktree changes, pushes the branch, opens the PR, and generates `PRPs/reports/<feature>/final-report.md`.
- `/relay-approve <pr>` — merges the PR, runs the docs-update cycle, and deletes branch and worktree post-merge.

The 2026-04-19 command surface decision's description of `/relay-execute` output as "PR opened" is **superseded** by this entry. The operative happy path is: `/relay-prd` → `/relay-execute` → (human validates + manual testing) → `/relay-pr` → (after merge) `/relay-approve`.

**Reason:** Manual testing before committing is a non-negotiable gate that the autonomous pipeline cannot replace. The `relay-execute` orchestrator already implemented the spirit of this decision (the success message says "Ready for /relay-pr"; the "What you do NOT do" section lists "Wiring `/relay-pr`" as deferred) — this entry formalizes that design-time pattern as a permanent architectural boundary rather than a temporary deferral. The boundary also prevents the pipeline from committing partial-phase changes when the wall-clock budget expires (`FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`) — uncommitted working-tree state is recoverable; a bad commit requires force-push or a revert PR to undo in a team environment.

**Areas affected:** `plugins/relay/commands/relay-execute.md` (new hard rule #11: never commit, never create PR; "What you do NOT do" entry updated; success-message note clarified); `docs/api-reference.md` (`/relay-execute` output description fixed; command surface table updated); `docs/context/architecture.md` (Pillar 2/3 boundary text; interactivity boundary section; happy-path description); `documentation/reference/commands.html` (`/relay-execute` Output and Composes rows fixed); `documentation/changelog.html` (patch entry v0.11.3).

---

## [2026-06-19] /relay-approve design + interactivity-boundary extension

**Context:** The 2026-05-18 Pillar 3 entry recorded `/relay-approve` as "(Placeholder — Phase 4)". Phases 1–3 of the `relay-approve-command` feature shipped the `docs-updater` agent (writer), the `docs-reviewer` agent (reviewer), and the `/relay-approve` command body onto disk. This entry records the finalized design decisions that guided Phase 3 implementation, including two open-question resolutions (OQ-a and OQ-b) and a conscious extension of the 2026-04-19 "downstream autonomous" interactivity rule.

**Decision:**
- **Deterministic merge + cleanup command.** `/relay-approve <pr>` accepts a PR number or URL and wires the full Pillar 3 close-out: Phase 0 state verification with 8 named HALT codes; merge via `gh pr merge <pr> --merge` (merge-commit default; `--strategy merge|squash|rebase` overridable) from the repo root; collision-safe cleanup ordering — `git worktree remove` → `git branch -d feature/<feature>` → `git push origin --delete feature/<feature>` → `git worktree prune` — avoiding the cli/cli #13380 trap (deleting the remote branch via `--delete-branch` before local cleanup corrupts the worktree ref); dispatch of the `docs-updater` then `docs-reviewer` agents via `Task` in a `max_docs_review_retries` bounded loop. Supports `--admin`, `--force`, `--no-docs` flags.
- **Docs Updater (writer) / Docs Reviewer (reviewer) pair.** Post-merge, `/relay-approve` dispatches `docs-updater` (reads `gh pr diff <pr>` + source PRD via `orchestrator-run.json prd_path`, compares the change set against `docs/` knowledge base, makes surgical additive-only updates mirroring the context-builder `*update` PRESERVE-ENTIRELY rules, writes `PRPs/reports/<feature>/docs-update.md` ending `*Status: DRAFT*`) and then `docs-reviewer` (validates the manifest + edits against the D-R1–D-R8 rubric, appends every verdict to `docs-review.jsonl`, owns the DRAFT→APPROVED flip). The pair is scoped strictly to `docs/` — not the `documentation/` rendered HTML site (OQ-b; documented below).
- **OQ-a (docs-commit-on-base):** After the Docs Reviewer approves the manifest, `/relay-approve` commits the `docs/` edits on the base branch and pushes (commit message `docs(<feature>): sync knowledge base post-merge`; never `--no-verify`; protected base → `FAILED_DOCS_PUSH_BLOCKED`, commit kept local). The commit happens on the base branch, not on the feature branch (which was deleted post-merge), so the knowledge-base update lands directly in the shared history.
- **OQ-b (docs/-only scope):** The Docs Updater and Docs Reviewer agents are scoped strictly to `docs/context/` and `docs/domain/`. The `documentation/` rendered HTML site is explicitly out of scope and is maintained by release-cut phases (like this one) rather than automated per-merge agents.
- **Interactivity-boundary extension (conscious, recorded).** The 2026-04-19 "downstream autonomous" rule states that agents after PRD approval must not prompt the user. The Docs Updater + Docs Reviewer pair operates post-merge — a new context where the feature branch no longer exists and the operator is not watching the terminal. The Docs Reviewer MAY surface ambiguities to the operator (e.g., when the knowledge-base update requires a judgment call about scope or phrasing) rather than silently emitting `CHANGES_REQUESTED` and halting. This is a conscious, recorded extension of the 2026-04-19 rule; it is not a violation, because the interactivity boundary is defined at PRD approval, not at merge.

**Reason:** The cleanup ordering (worktree remove before branch delete before remote delete before prune) is the safe sequence that avoids the cli/cli #13380 git-worktree corruption. The merge-commit default preserves attribution history and makes the merge recoverable via `git revert -m 1`. Docs-commit-on-base (OQ-a) ensures the knowledge-base update is atomic with the merge and does not require a follow-on PR. Docs-only scope (OQ-b) keeps the automated agent surface narrow and predictable — the HTML site requires human-authored release cuts because it carries styled content, navigation, and changelog structure that a diff-reading agent cannot reliably maintain without the AGENTS.md binding contract. The interactivity-boundary extension is recorded here because any future agent consulting `decisions.md` must know that post-merge Docs pair dialogue is expected and intentional, not a bug.

**Areas affected:** `plugins/relay/commands/relay-approve.md`; `plugins/relay/agents/docs-updater.md`; `plugins/relay/agents/docs-reviewer.md`; `docs/api-reference.md` (command flipped to implemented; Docs Updater/Reviewer moved to Implemented agents); `docs/context/architecture.md` (Pillar 3 Phase 4 flipped to shipped; count updated to 14 commands); `documentation/reference/commands.html`; `documentation/reference/agents.html`; `documentation/roadmap/status.html`; `documentation/changelog.html` (v0.17.0 cut); `plugins/relay/.claude-plugin/plugin.json` (0.16.0 → 0.17.0).

---

## [2026-07-02] Foundation phases skip test-first in the TDD track (`phase_type: foundation`)

**Context:** Running `/relay-execute` over an APPROVED PRD in a Java/Spring Boot project with `tdd: true` halted at the Phase 1 foundation phase (create entity + repository + resolver + GraphQL fields + migration). The `tdd-writer` (B7) returned `AMBIGUOUS` for 4 of 5 ACs and the orchestrator emitted `FAILED_TDD_AMBIGUOUS_ACS` with no auto-recovery path; no code was written. Root cause was three coupled gaps: (1) B7's framework-template list had no JUnit5/Java entry, so any Java project defaulted to `AMBIGUOUS`; (2) there was no concept of a foundation/seam-creation phase in the TDD track, and the RED discipline (`tdd-reviewer` R-RED-LEGITIMATE) classifies a compile error as illegitimate "broken setup" — but in a compiled language a seam-creating phase's test either references not-yet-existing types (compile failure across the whole test source set) or invents production signatures (forbidden for B7), so there was no legal path; (3) the orchestrator treated `AMBIGUOUS` as a terminal HALT recommending "tighten the PRD ACs", which is misleading when the ACs are precise (clear Given/When/Then) and the real problem is ordering. The existing `phase_type: scaffold` signal — already read by `plan-reviewer` to relax `R-COH-VALIDATE-FRAMEWORK-MISMATCH` — was the natural hook, but its definition (config-only, no application source, filesystem VALIDATE commands) does not fit a phase that creates real domain source.

**Decision:**
- **New `phase_type: foundation` value.** A foundation phase creates the seam (entities, repositories, resolvers, interfaces, GraphQL/schema types, migrations) that later phases depend on, where the phase itself introduces the types/methods its ACs name. It is distinct from `scaffold` (config-only) and `feature` (exercises existing types); its legitimate validation is a compile/build/migration check, not a test-framework assertion. Inferred conservatively by `plan-writer` and `plan-reviewer` Phase 0, and honored when explicitly annotated.
- **The TDD track skips test-first for `foundation` phases.** `/relay-tdd` gains precondition P5 (self-skip on `phase_type: foundation`), `/relay-execute` A.3.5 gains a symmetric phase_type gate logging `skipped_foundation_phase`, and `tdd-writer` Phase 0 carries a defensive guard. The implementer materializes the seam for the foundation phase; the feature phases that follow run fully test-first. This is symmetric with how `scaffold`/`docs` phases are already exempt from framework validation.
- **B7 framework support broadened.** `tdd-writer` Step 2.2 gains JUnit5 (Java, Maven/Gradle), Go (`go test`), and .NET/xUnit templates, and the `Other` fallback now attempts corpus discovery before emitting `AMBIGUOUS` — so a declared-but-unlisted framework with a discoverable test corpus is no longer auto-ambiguous.
- **Compiled-language RED is first-class.** `tdd-reviewer` R-RED-LEGITIMATE (Step 1.6.b) applies a seam-set discriminator: a compile/import error whose unresolved symbols are all in the plan's `## Files to Change` `CREATE`/`UPDATE` set is a legitimate red-by-design failure (`passed: true`), not broken setup. Only unresolved symbols outside the seam set (typos, wrong imports, missing deps) or pure test-source syntax errors remain illegitimate. This applies to the feature phases that follow a foundation phase.
- **AMBIGUOUS HALT recovery distinguishes vague from precise ACs.** `/relay-execute`'s `FAILED_TDD_AMBIGUOUS_ACS` now carries two `manual_recovery_paths`: tighten the PRD ACs only when they genuinely lack Given/When/Then concreteness; otherwise, when the ACs are precise and the phase creates the types under test, mark the plan `phase_type: foundation` and re-run.

**Reason:** Skipping test-first for the seam-creation phase is the least-invasive option consistent with relay's existing scaffold semantics: a phase whose legitimate validation is a compile/migration check is not test-first-authorable, and forcing it produces only `AMBIGUOUS` noise or invented signatures. A distinct `foundation` value (rather than overloading `scaffold`) keeps `scaffold`'s "config-only" meaning intact while giving the seam case precise, self-documenting semantics. Compilable stubs (letting B7 write production) was rejected because it breaks B7's "production code is forbidden" invariant; implementer-first-then-tests was rejected as a larger pipeline reorder where "tests after code" is not TDD. The seam-set discriminator in R-RED-LEGITIMATE is necessary regardless of the foundation skip — without it, the very next (feature) phase in a compiled-language project would still fail, because a legitimate red-by-design test references a not-yet-created production symbol that surfaces as a compile error.

**Areas affected:** `plugins/relay/agents/tdd-writer.md` (Step 2.2 templates + Phase 0 foundation guard); `plugins/relay/commands/relay-tdd.md` (P5 self-skip); `plugins/relay/commands/relay-execute.md` (A.3.5 phase_type gate + AMBIGUOUS recovery paths); `plugins/relay/agents/plan-writer.md` + `plugins/relay/agents/plan-reviewer.md` (`foundation` inference + framework-mismatch exemption); `plugins/relay/agents/tdd-reviewer.md` (seam-set RED discriminator); `plugins/relay/.claude-plugin/plugin.json` (0.17.0 → 0.18.0); `documentation/concepts/tdd-track.html`, `documentation/reference/agents.html`, `documentation/changelog.html` (v0.18.0 cut).

---

## [2026-07-09] PRD `DRAFT → APPROVED` flip ownership is invocation-context-scoped

**Context:** `prd-reviewer` requires the user's OWN explicit in-dialogue approval (distinct from the rubric passing) before flipping a PRD `DRAFT → APPROVED`, and correctly refuses to treat any agent- or orchestrator-relayed approval as the user's consent (the [2026-04-19] interactivity-boundary decision; `docs/anti-patterns.md`). But when `prd-reviewer` is dispatched as a `Task` subagent, the harness delivers the user's messages only to the main conversation — never to a subagent. The approval condition is therefore structurally unsatisfiable in subagent context: the reviewer runs the full rubric, returns a pass, and MUST refuse the flip, forcing the caller to bypass the gate and flip manually. Observed 2026-07-09 approving `PRPs/prds/test-pair-universalization.prd.md` — the reviewer subagent returned `RUBRIC_PASSED` and withheld the flip; the main-loop coordinator applied the two-line Edit after the user approved directly via the approval UI (see `PRPs/prds/test-pair-universalization.review.jsonl`).

**Decision:** The flip is an interactivity-boundary action and its ownership is scoped by an explicit `invocation_context` input to `prd-reviewer`. This is **Option (a)** — main-conversation-only flip; the caller owns the mutation in subagent context. **Option (b)** — a caller-supplied approval token that the reviewer accepts as consent — was rejected because it re-introduces the exact relayed-consent risk the design forbids (a subagent cannot distinguish real user consent from a coordinator asserting it).

- **`main` mode** — the reviewer protocol is adopted directly in the main conversation (as `/relay-prd` Phase B does). The user's messages reach the reviewer; it runs the rubric, dialogues, obtains the user's explicit approval, and OWNS the two-line `Edit` + the `final_flip` jsonl append. This is the unchanged `/relay-prd` behavior, now an explicit contract.
- **`subagent` mode** — the reviewer was dispatched via `Task`. It runs the full rubric (R1–R7 + R-COH-*), appends a `verdict: "RUBRIC_PASSED"` / `action: "rubric_pass_delegated"` row, and RETURNS the rubric array plus exact `flip_instructions` to its invoker. It NEVER edits the DRAFT and NEVER appends `final_flip`. The invoker — which holds real user contact — obtains the user's own approval in the main conversation and then performs the flip. On rubric failure the subagent returns the defect list and does NOT enter the dialogue loop (Step 5).
- **Default is `subagent`** (fail-safe): absent an explicit `main` declaration the reviewer never auto-flips.

The APPROVED `PRPs/prds/prd-authoring.prd.md` is NOT mutated (reopening APPROVED PRDs is out of scope per `docs/anti-patterns.md` and the reviewer's `already_approved` precondition). AC-11's "the Reviewer commits the approval" is refined by this entry: the reviewer commits the approval when — and only when — it runs in `main` mode; in `subagent` mode the invoker commits it. This mirrors the established relay pattern where the COMMAND owns state mutations and the reviewer subagent owns only the verdict (`code-reviewer` + `/relay-implement`'s D8 mutations). The sibling `plan-reviewer` auto-flips with no user dialogue precisely because plans require no user approval — only the PRD sits on the interactivity boundary.

**Reason:** Consent must live only where the user actually is. A subagent cannot receive the user's approval, so it must not own an approval-gated mutation. Encoding the locus as an explicit input (rather than a token the reviewer trusts) keeps the gate satisfiable by design in both contexts while preserving the no-relayed-consent invariant. The fail-safe default guarantees that a caller who forgets to declare the context can never cause an un-approved auto-flip.

**Areas affected:** `plugins/relay/agents/prd-reviewer.md` (new `invocation_context` input; `## Invocation context and flip ownership` section; dual-mode Step 3/4/5 branching; `RUBRIC_PASSED` verdict + `rubric_pass_delegated` action in the review.jsonl contract; anti-patterns); `plugins/relay/commands/relay-prd.md` (Phase B declares `invocation_context: main`; subagent-dispatch note; approval constraint); any future orchestrator that dispatches `prd-reviewer` as a subagent (inherits the caller-owns-flip obligation); `PRPs/prds/prd-authoring.prd.md` AC-11 (refined here, not mutated).

---

## [2026-07-09] Validation commands must carry real exit-code semantics; plan-reviewer enforces via R-COH-VALIDATE-ALWAYS-PASS

**Context:** `plan-writer`-generated plans routinely expressed Level-1/2/3 Validation Commands and per-task `VALIDATE` commands with the shell idiom `<check> && echo "PASS" || echo "FAIL"` (and the anti-pattern mirror `grep <forbidden> … && echo "FOUND" || echo "PASS"`). Both branches are a successful `echo`, so the command ALWAYS exits 0. `code-reviewer`'s R-L1/R-L2/R-L3 score a Level command PASS iff its exit code is 0, so a violated invariant that prints "FAIL" still passes review — the gate is cosmetic. Observed concretely in the generated Phase 1 plan of `PRPs/prds/test-pair-universalization.prd.md` (the AC-1 zero-grep gate printed "FAIL: residual …" yet exited 0). A second, related trap: a multi-line Level block returns only its LAST command's exit code, so an earlier `grep -q` miss is masked by a later passing line.

**Decision:** Every command under `## Validation Commands` (Levels 1–3) and every per-task `VALIDATE:` command MUST exit non-zero when its invariant is violated. The canonical forms are `if grep -q <pattern> <paths>; then echo "FAIL: …"; exit 1; else echo "PASS: …"; fi`, the compact `grep -q … || { echo "FAIL: …"; exit 1; }`, or letting the tool's own non-zero status propagate under `set -euo pipefail`. The always-exit-0 `… && echo PASS || echo FAIL` idiom is forbidden. Enforced in three places: `plan-writer.md` (Hard constraint #11 + Step 4.4 item 11 wrong→right examples + anti-pattern bullet), `docs/context/plan-template.md` (mandatory extension #5 + item 12 note), and a new deterministic coherence check `R-COH-VALIDATE-ALWAYS-PASS` in `plan-reviewer.md` that fails any plan whose Level or `VALIDATE` commands can never exit non-zero.

**Reason:** The weak idiom silently defeats the entire automated validation layer — the reviewer's exit-code gate is the only thing standing between a broken invariant and an APPROVED plan. Guidance alone is insufficient because the generating LLM emits the idiom freely; the deterministic `R-COH-VALIDATE-ALWAYS-PASS` check makes the contract enforceable at plan-review time (before implementation), where `code-reviewer`'s R-L gate structurally cannot catch it.

**Areas affected:** `plugins/relay/agents/plan-writer.md`, `docs/context/plan-template.md`, `plugins/relay/agents/plan-reviewer.md` (new R-COH-VALIDATE-ALWAYS-PASS deterministic check; rubric[] length 14–19), every future generated plan's Validation Commands and per-task VALIDATE lines.

---

## [2026-07-10] Test pair universalized: activation on declared framework, `tdd:` selects ordering, full test lifecycle (supersedes the 2026-05-06 self-skip half)

**Context:** The 2026-05-06 decision made the pair the *only* authorized test-file author and self-skipped it on `tdd: false`, so a `tdd: false` project could get NO relay-authored tests — a plan with test-authoring ACs was APPROVED by the plan-reviewer but had to be rejected by the implementer (R-X). The pair was also create-only, and the post-green reviewer (B5) flagged *every* removed test as weakening, so no agent could update or retire a test. See `PRPs/prds/test-pair-universalization.prd.md`.

**Decision:** Universalize the pair (renamed `tdd-writer`→`test-writer`, `tdd-reviewer`→`test-reviewer`; commands `/relay-tdd`→`/relay-write-test`, `/relay-tdd-review`→`/relay-test-write-review`; artifacts `tdd-initial-suite.diff`→`test-suite.diff`, `.tdd-review.jsonl`→`.test-write-review.jsonl`):

- **Activation gate = non-empty `test_frameworks`**, in BOTH methodology modes. This PROMOTES the 2026-05-12 empty-frameworks self-skip to the single activation gate and SUPERSEDES the 2026-05-06 "tdd:false → self-skip" half. `test_frameworks: []` or missing methodology → skip (observably identical to before).
- **`tdd:` now selects ORDERING, not existence:** `tdd: true` = test-first (the pair runs before the Implementer, RED-legitimate; `/relay-execute` Phase A.3.5); `tdd: false` = test-after (the pair runs after the Implementer + Code Review, GREEN-legitimate; new Phase A.4.5). The mode-selected legitimacy row in `test-reviewer` is `R-RED-LEGITIMATE` / `R-GREEN-LEGITIMATE`.
- **Full test lifecycle (CREATE / UPDATE / DELETE)** with a suite-manifest **lifecycle ledger.** Every non-create op is recorded (`EXISTING_TEST_UPDATED`, `OBSOLETE_TEST_REMOVED` = behavior gone from the in-scope ACs, `REDUNDANT_TEST_REMOVED` = proven duplicate naming the survivor) and validated by `test-reviewer`'s new `R-LIFECYCLE-LEGITIMATE` check. B5 consults the APPROVED manifest ledger: a removal/skip matching an approved entry is an accepted note, an unmatched one (or any removal when no manifest exists) still blocks; B5 also now detects whole-file test deletions.

**R-X strict is preserved verbatim.** The 2026-05-06 sole-author invariant is KEPT and EXTENDED to the whole lifecycle: the Implementer and the auto-correction loop still author ZERO test-file changes. In test-after the pair's diff is reviewed by `test-reviewer`, never the code-reviewer — so R-X (which fires on the Implementer's diff) never sees it. The ledger is a POSITIVE authorization signal from the APPROVED test pair, not a blanket exemption.

**Reason:** Test-after is the dominant real-world mode outside strict-TDD shops; forcing `tdd: true` to get any relay-authored tests, and having no path to update/retire a stale test, mismatched how most teams work. Keying activation on the framework (which is *required* to author a test at all) makes the model coherent and gives projects a clean opt-out (`test_frameworks: []`).

**Areas affected:** `plugins/relay/agents/test-writer.md`, `test-reviewer.md`, `post-green-reviewer.md`; `plugins/relay/commands/relay-write-test.md`, `relay-test-write-review.md`, `relay-test-review.md`, `relay-execute.md` (Phase A.3.5 gate + new Phase A.4.5); `plugins/relay/agents/prd-writer.md`, `plan-writer.md`, `plan-reviewer.md` (R5 routing note); `docs/context/methodology.md`, `prd-template.md`, `anti-patterns.md`, `api-reference.md`, `architecture.md`, `constraints.md`, `docs/domain/glossary.md`. Supersedes the 2026-05-06 entry's tdd:false self-skip half; preserves its sole-author + R-X-strict invariants.

---

## [2026-07-12] Validation suite: Node/ESM static-check harness + local pre-commit gate + on-demand promptfoo evals; relay repo declares `test_frameworks: ["node:test"]`

**Context:** `PRPs/prds/validation-suite.prd.md` (APPROVED 2026-07-12) observed that `relay` is almost entirely Markdown + JSON with no build, lint, or test command, so cross-reference and consistency rot (stale command names, an out-of-sync `documentation/assets/data/search-index.json`, a stale `.py` path reference that was actually `.mjs`, a doubled-`.plan` artifact filename, and a missing `worktree-bootstrap.ps1` template alongside the existing `.sh` one) accumulated silently. `documentation/AGENTS.md`'s three-file registration rule (§6) and plugin-version/changelog sync rule (§7.5) were binding prose with no mechanical enforcement. All five Implementation Phases of the PRD are `complete`.

**Decision:** Ship a two-layer, dependency-light self-test suite for the `relay` repo itself (never `plugins/prp-core/`, which stays out of scope per the 2026-04-19 reference-only decision):

- **`npm run validate`** (`scripts/validate/index.mjs`) — deterministic checks scoped to `plugins/relay/`: native `claude plugin validate --strict` wrap (degrades gracefully if the CLI is absent), `plugin.json`↔`changelog.html` version parity, command/agent three-file registration parity, referenced-path existence, dispatch-graph resolution (`subagent_type`/`Next:` pointers), ajv-backed frontmatter schema checks per component type, artifact-naming, and `.sh`/`.ps1` worktree-bootstrap parity. Exits non-zero with a named check + `file:line` on any violation. Wired to a local pre-commit gate via `.githooks/pre-commit` + `git config core.hooksPath .githooks` (one-time `npm run setup-hooks`) — CI/GitHub Actions is explicitly deferred (repo is a fork; Phase 5 CI/CD not started).
- **`npm run eval`** (`scripts/eval.mjs` + `promptfooconfig.yaml`) — an on-demand [promptfoo](https://www.promptfoo.dev) suite asserting reviewer-agent verdict tokens (starting with `test-reviewer`) against the existing clean/dirty golden fixtures under `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/`. Manual only, never a commit gate — LLM evals cost tokens, are slower, and are non-deterministic, unfit to block every commit; fidelity is an approximation (prompt fed to the API, not the full Claude Code runtime with tools), an explicitly acknowledged and accepted limitation for MVP.

Runtime is Node/ESM (`package.json` + `ajv`, `node-html-parser`, `promptfoo` as devDependencies; `node_modules/` gitignored, `package-lock.json` committed) — chosen over Python for parity with the pre-existing `scripts/*.mjs` (`normalize-test-output.mjs`, `generate-final-report.mjs`) and because promptfoo is Node-native. The relay repository itself now declares `test_frameworks: ["node:test"]` in `docs/context/methodology.md` (`tdd: false`, test-after ordering): the relay `test-writer`/`test-reviewer` pair authors and maintains the checker unit tests test-after, after the Implementer + Code Review — the Implementer authors ZERO test files, preserving R-X strict (see the 2026-05-06 and 2026-07-10 entries above). This was a conscious correction of an earlier draft that had the Implementer author the checker tests directly, which conflicts with R-X strict.

**Reason:** Documentation and cross-reference drift produces no failing test to signal it, so a deterministic, fast (<5s target), pre-commit-blocking static layer is the correct primary defense — the invariants it enforces were already written contracts (`documentation/AGENTS.md`) needing only mechanical enforcement. Scoping every structural check to `plugins/relay/` (never `prp-core/`) enforces the existing 2026-04-19 "prp-core is reference, not relay code" anti-pattern at the tooling layer instead of relying on manual discipline. Keeping evals manual and separate from `validate` avoids coupling a fast, deterministic commit gate to slow, costly, non-deterministic LLM calls.

**Areas affected:** `package.json` (new); `scripts/validate/index.mjs` + `scripts/validate/checks/*.mjs` + `scripts/validate/schemas/*.json` (new); `.githooks/pre-commit` + `scripts/setup-hooks.mjs` (new); `scripts/eval.mjs` + `promptfooconfig.yaml` (new); `plugins/relay/agents/test-runner.md` (native `node:test` invocation + JUnit reporter wiring); `docs/context/test-output-schema.md` (`node:test` framework + JUnit shape documented); `docs/context/methodology.md` (`test_frameworks: ["node:test"]` declaration + Observed signals); `docs/development.md` (new "Testing / validation" section); `CLAUDE.md` (Essential commands); `plugins/relay/skills/context-builder/SKILL.md` (Phase 1.8 now emits `worktree-bootstrap.ps1` alongside `.sh` as a parity pair); `documentation/guide/validation-suite.html`, `documentation/reference/validation-checks.html` (site coverage, out of `docs/` scope for this agent).

---

## [2026-07-16] Docs-sync relocates to Pillar 2 (implementation); Pillar 3 retained as a safety net; implement-time invocation stays non-interactive

**Context:** `PRPs/prds/implement-phase-docs-sync.prd.md` (APPROVED 2026-07-15) relocates the primary docs-sync trigger point into `/relay-implement`, retaining `/relay-approve`'s cycle as a safety net. Phases 1-3 of that PRD (all `complete`) already shipped the underlying code: `docs-updater`/`docs-reviewer` gained `diff_source`/`non_interactive` inputs and read `docs_sync` (Phase 1); `/relay-implement` gained a `Phase A.3.5 — Docs-sync dispatch` sub-phase that runs the pair non-interactively immediately after code-review `APPROVED` and before the D8 mutations, with its own `max_docs_review_retries=2` budget and a `--no-docs` flag (Phase 2); `/relay-approve`'s existing docs cycle self-skips on `docs_sync: false` and was confirmed idempotent against an already implement-time-synced worktree (Phase 3). This entry records the two conscious refinements from that PRD's Decisions Log so future agents consult the decision instead of re-deriving it.

**Decision:**
- (1) The [2026-06-19] post-merge interactivity extension (allowing the docs pair to dialogue with the operator) applies ONLY to the approve-time invocation. The new implement-time invocation is non-interactive unconditionally — any question the pair would otherwise ask a human is deferred to the implementation report instead of interrupting the autonomous run.
- (2) Primary docs-sync relocates to Pillar 2: `/relay-implement`'s `Phase A.3.5` dispatch, consuming the working-tree diff / captured attempt `diff.patch` as its `diff_source`. Pillar 3's approve-time cycle (`/relay-approve`'s existing docs phase) is RETAINED, unchanged in mechanics, now serving as a low-delta safety-net reconciliation pass that catches only decisions made after implementation.

**Reason:** Approve is frequently unreached — co-locating docs with code in the same changeset is the industry norm for closing documentation drift (see the PRD's Research Summary). The interactivity boundary is defined at PRD approval: implement runs autonomously past that boundary, while approve is an explicitly-triggered, post-merge human act where a dialogue extension is safe. Splitting the two invocations' interactivity semantics keeps both behaviors consistent with the existing [2026-04-19] interactivity-boundary decision without weakening it.

**Areas affected:** `plugins/relay/agents/docs-updater.md`, `plugins/relay/agents/docs-reviewer.md` (Phase 1 capability surface), `plugins/relay/commands/relay-implement.md` (Phase 2 dispatch), `plugins/relay/commands/relay-approve.md` (Phase 3 safety-net confirmation), and every `docs/`/`documentation/` file this Phase 4 plan touches (`docs/context/architecture.md`, `docs/api-reference.md`, `docs/domain/flows.md`, `docs/context/integrations.md`, `docs/KNOWLEDGE_BASE.md`, `documentation/concepts/pillars.html`, `documentation/concepts/interactivity-boundary.html`, `documentation/roadmap/status.html`, `documentation/reference/commands.html`, `documentation/reference/agents.html`, `documentation/assets/data/search-index.json`, `documentation/changelog.html`).

---

## [2026-07-22] MCP-access spike: Figma MCP tools are reachable from Task-dispatched subagents; baseline architecture retained

**Context:** Phase 2 of `PRPs/prds/figma-implementation-track.prd.md` (Implementation Phases row 2, "MCP-access spike") needed to resolve, empirically, whether Task-dispatched subagents in this environment can call Figma MCP tools directly, to de-risk Phase 4's (Design Spec) architecture before that phase's plan is written. This entry records the finding here rather than by reopening the APPROVED `PRPs/prds/figma-implementation-track.prd.md`.

**Decision:** The empirical result: a Task-dispatched subagent (`general-purpose`, tool access via `ToolSearch`) successfully discovered and called a Figma MCP tool (`get_metadata`), receiving a Figma-backend access-denial error (not a tool-routing failure) — confirming Figma MCP tools ARE reachable from Task-dispatched subagents in this environment. Despite this confirmed reachability, the baseline architecture — Figma MCP calls made only by the interactive commands (`/relay-design-map` and `/relay-design-spec`), never by autonomous Task-dispatched writer/reviewer agents — is RETAINED for Phases 3-4.

**Reason:** Retaining the baseline despite confirmed reachability is the right call for three reasons independent of pure reachability: (1) it keeps the entire autonomous stretch of the pipeline structurally independent of Figma/MCP availability; (2) it centralizes context-budget management for the traversal in the interactive commands; (3) it aligns naturally with the mandatory human-approval gate already required on the Design Spec, which happens in the same interactive window.

**Areas affected:** future Phase 3 (`design-map-writer`) agent design, Phase 4 (`design-spec-writer`) agent design.

---

## [2026-07-23] plan-reviewer gains R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE — forbidden-reference VALIDATE greps must be diff-scoped and prohibition-idiom-aware

**Context:** Autonomous `/relay-execute` dogfood of the `figma-implementation-track` feature (against this repo) hit the same defect class twice with two distinct root causes, both in Level-3 `VALIDATE` commands checking that the phase's diff introduces no forbidden `.claude/PRPs` write-target reference. Phase 2's command (`PRPs/plans/completed/figma-implementation-track-phase-2-mcp-access-spike.plan.md`) grepped the whole file and false-positived on pre-existing historical prose in `docs/decisions.md` / `docs/context/architecture.md` comparing relay's convention to the upstream `prp-core` one — content the diff never touched. Phase 3's command (`...-phase-3-component-map.plan.md`), corrected to scope to the diff after Phase 2's incident, still false-positived — this time because the phase's own new agent files (`design-map-writer.md`, `design-map-reviewer.md`) correctly cite the repo's standard quoted-prohibition sentence ("... MUST NOT appear ...", the same idiom already used verbatim by `docs-updater.md`, `docs-reviewer.md`, `plan-writer.md`, `plan-reviewer.md`, `prd-reviewer.md`, `test-writer.md`, `code-reviewer.md`). Both commands had real exit-code semantics — both would have passed the existing `R-COH-VALIDATE-ALWAYS-PASS` check — yet both produced a false `CHANGES_REQUESTED` against a structurally sound diff, costing an extra implement/review round-trip each time. No existing rubric item catches this: `R-COH-VALIDATE-ALWAYS-PASS` verifies a command CAN fail, not that it fails for the RIGHT reason.

**Decision:** Add a new deterministic coherence check, `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE`, to `plan-reviewer.md`'s R-COH-* layer (7th deterministic check; the documented `rubric[]` length range moves from 14–19 to 15–20 rows). It scans every `## Validation Commands` (Levels 1–3) command and per-task `VALIDATE:` command for a grep asserting the ABSENCE of a forbidden-reference literal (`\.claude/PRPs` and similar), and fails when that grep is either (a) not scoped to `git diff` output for the phase's own changed paths, or (b) does not exclude lines matching the standard `MUST NOT appear` quoted-prohibition idiom. The authoring-time guidance is mirrored into `plan-writer.md` (Hard constraint #11 pointer, Step 4.4 item 11 wrong→right examples, a new anti-pattern bullet) and `docs/context/plan-template.md` (new mandatory extension 6, plus the item-12 Level-command note) — the same three-site enforcement pattern the 2026-07-09 `R-COH-VALIDATE-ALWAYS-PASS` decision established.

**Reason:** Catching the defect at plan-review time, before implementation, is strictly cheaper than at code-review time — the same reasoning that justified `R-COH-VALIDATE-ALWAYS-PASS` originally, since `code-reviewer` executes the plan's own `VALIDATE` commands and trusts their exit code as ground truth. Both dogfood incidents are recorded as "Bounded post-approval correction" notes in their respective plans' own `## Notes` sections; this decision generalizes the two one-off fixes into a standing, mechanically-enforced rubric check so future plans — in this repo or any relay target project — don't repeat either mistake.

**Areas affected:** `plugins/relay/agents/plan-reviewer.md` (new `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE` deterministic check; `rubric[]` length 15–20); `plugins/relay/agents/plan-writer.md` (Hard constraint #11 pointer, Step 4.4 item 11 diff-scope/prohibition-idiom examples, new anti-pattern bullet); `docs/context/plan-template.md` (new mandatory extension 6; item 12 Level-command note); every future generated plan whose Validation Commands or per-task `VALIDATE` lines check for a forbidden-reference literal.

---

## [2026-07-23] Component map is a durable `docs/design/` knowledge-base artifact, not a per-run `PRPs/` pipeline artifact

**Context:** Phase 3 of `PRPs/prds/figma-implementation-track.prd.md` (Implementation Phases row 3, "Component map") ships `docs/design/component-map.md` — a per-project, cross-feature table mapping Figma library components to real code components, built/refreshed by the new `/relay-design-map` command. Every other durable pipeline output (PRDs, plans, reports) lives under `PRPs/` per the [2026-04-19] "PRP artifacts live under `PRPs/`" decision, which could be misread as covering this artifact too.

**Decision:** The component map itself is placed at `docs/design/component-map.md`, NOT under `PRPs/`, because it is a durable, cross-feature knowledge-base artifact — one map per target project, accumulating rows across successive `/relay-design-map --refresh` re-scans and consumed by later phases (Design Spec, Plan Integration) — rather than a per-run pipeline artifact scoped to one feature's execution. The same `.claude/`-never-write rule still applies to it. Its supporting evidence bundle (raw Figma query results) IS a per-run pipeline artifact and stays under `PRPs/reports/design-map/evidence/`, consistent with the existing `PRPs/` convention.

**Reason:** The `PRPs/` convention exists to keep autonomous-run artifacts out of `.claude/`'s permission-prompt gate and scoped per feature/run. The component map does not fit that shape — it is intentionally hand-curated and versioned across the project's lifetime, matching how `docs/context/*` and `docs/decisions.md` already live under `docs/` rather than `PRPs/`. Splitting the durable map (`docs/design/`) from its per-run raw evidence (`PRPs/reports/design-map/evidence/`) keeps each artifact under the convention that actually matches its lifecycle.

**Areas affected:** `design-map-writer` agent, `design-map-reviewer` agent, `/relay-design-map` command, `docs/context/component-map-template.md`, future Phase 4 (Design Spec) and Phase 5 (Plan Integration) consumers of the map.

---

## [2026-07-23] Design Spec pair is relay's second interactivity-boundary extension (inline-adopted, mirrors prd-writer/prd-reviewer)

**Context:** Phase 4 of `PRPs/prds/figma-implementation-track.prd.md` (Implementation Phases row 4, "Design Spec") ships `/relay-design-spec` plus the `design-spec-writer`/`design-spec-reviewer` pair. The PRD's own Decisions Log (row 1, "Design interpretation control model") posed an explicit either/or at design time: behave like `prd-writer`/`prd-reviewer` (interactive, mandatory explicit human approval) or like `plan-writer`/`plan-reviewer` (autonomous auto-flip on rubric pass). The PRD resolved this explicitly; this entry records the shipped mechanics so future agents consult the decision instead of re-deriving it.

**Decision:** The Design Spec pair is inline-adopted directly in the main conversation by `/relay-design-spec` — never `Task`-dispatched — mirroring `/relay-prd`'s bundling of `prd-writer`/`prd-reviewer`, and diverging deliberately from Phase 3's `design-map-writer`/`design-map-reviewer` pattern (`Task`-dispatched, MCP-free, evidence-bundle-only). `design-spec-writer` performs Figma MCP calls directly in this session (node-scoped `get_metadata` first, then chunked `get_design_context` at 6–8 calls per chunk with persist-then-discard evidence capture, `get_variable_defs`, per-frame `get_screenshot` at 1x; hard cap `max_figma_nodes = 20`) and runs a restate-and-wait confirmation plus a bounded batched Q&A round (max 2 rounds; stuck-detection converts any remainder to explicit `ASSUMPTION` rows), mirroring `prd-writer`'s Q&A shape. `design-spec-reviewer` reuses the identical `invocation_context`-scoped flip-ownership contract established by the [2026-07-09] PRD flip-ownership decision: default `subagent` (fail-safe, never auto-flip), and only in `main` mode — declared explicitly by `/relay-design-spec` — does it dialogue with the user ("Aprovar o Design Spec?") and own the `DRAFT → APPROVED` flip, after both the rubric passing AND the user's own explicit affirmative reply. This is the **second** place in relay (after PRD authoring) where a reviewer dialogues with the user before flipping an artifact's status.

**Reason:** The Figma interpretation is the single point of business judgment the user explicitly worried about; it happens inside the interactive stretch of the pipeline, the same zone where PRD approval already requires the user's own confirmation (PRD Decisions Log row 1). Reusing the already-battle-tested `invocation_context` flip-ownership contract — rather than inventing a new one — keeps the two interactive-boundary reviewers' semantics identical and avoids re-deriving the no-relayed-consent safeguard from scratch.

**Areas affected:** `design-spec-writer` agent, `design-spec-reviewer` agent, `/relay-design-spec` command, `docs/context/architecture.md` (Interactivity boundary + Command surface sections), future Phase 5 (Plan Integration) consumers of the Design Spec.

---

## [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference (Figma Implementation Track Phase 5)

**Context:** Phase 5 of `PRPs/prds/figma-implementation-track.prd.md` (Implementation Phases row 5, "Plan integration") registers a conditional `## Design Source` section in both `docs/context/plan-template.md` and `docs/context/prd-template.md`, plus a `design_source: figma | none` Metadata field on every plan/PRD phase when the target project declares `figma_track: true`. The source PRD's own Decisions Log (row 2, "`design_source` declaration") posed this explicitly at design time as an either/or against the closest existing precedent — mirror `phase_type`'s self-healing inference (reviewer infers and inserts an absent value) or make the declaration mandatory and non-heuristic (absence is a structural `CHANGES_REQUESTED`, never inferred). This entry records the shipped mechanics so future agents consult the decision instead of re-deriving it.

**Decision:** `design_source` is NEVER inferred or inserted by a reviewer, unlike `phase_type`. `plan-writer` (Step 4.4 item 5) sources it non-heuristically: in PRD mode, copied verbatim from the source PRD's own `## Design Source` section for the phase row (added by `prd-writer` Step 7.4 item 15.5, itself populated from an explicit per-phase question — Item 7.5 — asked of every phase captured in the PRD, including phases that don't obviously look like frontend work); in description mode, `figma` only when an explicit `--design-spec <path>` CLI flag (new on `/relay-plan`) referencing an APPROVED Design Spec was passed, `none` otherwise. When `figma_track: true` and no declaration is sourceable, `plan-writer` HALTs with `FAILED_DESIGN_SOURCE_UNDECLARED` rather than silently defaulting to `none` — a silent default would mask an undeclared phase as "confirmed no Figma involvement" rather than surfacing the real gap. `plan-reviewer`'s `R-COH-DESIGN-SOURCE-MISSING` (declaration presence) and `R-COH-DESIGN-GROUNDED` (UI/frontend tasks cite a frame or `CM-<n>` id), plus `prd-reviewer`'s `R-COH-DESIGN-SOURCE-INCOMPLETE` (every Implementation Phases row has a declaration row), enforce this structurally and read-only — never self-healing an absence — and all three are zero-emission (no rubric row at all) when `figma_track` is off or absent, preserving the "nothing changes when `figma_track` is off" invariant (PRD AC-1) exactly.

**Reason:** Even Figma-enabled projects have recurring non-Figma phases (backend-only, docs-only); a self-healing inference (like `phase_type`) would reintroduce the exact "forgot to check" vs. "doesn't apply" ambiguity the methodology-declaration model already exists to prevent (`docs/decisions.md` [2026-04-19] Methodology declaration lives in `docs/context/methodology.md`). This is a deliberate, explicit divergence from the `phase_type` precedent (`docs/decisions.md` [2026-05-14] `phase_type` Metadata-field precedent), not an oversight: `phase_type` is a structural classification a reviewer can safely infer from observable plan content, while "has Figma or not" is a business decision a reviewer cannot manufacture on the writer's behalf.

**Areas affected:** `plan-writer` agent (Step 4.3.5 conditional `## Design Source` section assembly, Step 4.4 item 5 Metadata sourcing + `FAILED_DESIGN_SOURCE_UNDECLARED` HALT, Phase 2 GROUNDING's conditional third `research-design` dispatch), `plan-reviewer` agent (`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`, item-6 dual-branch section-order note), `prd-writer` agent (item 7.5 per-phase Figma question, Step 7.4 item 15.5 section assembly), `prd-reviewer` agent (`R-COH-DESIGN-SOURCE-INCOMPLETE`, item-13 dual-branch section-order note), `docs/context/plan-template.md`, `docs/context/prd-template.md`, new `research-design` grounding subagent, `/relay-plan` command (`--no-figma`, `--design-spec` flags and PRD-mode auto-derivation).

---

## [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder inside `/relay-implement` (Figma Implementation Track Phase 6)

**Context:** Phase 6 of `PRPs/prds/figma-implementation-track.prd.md` (Implementation Phases row 6, "Visual loop") ships a new self-contained `plugins/relay/scripts/visual/` tooling package (`provision.mjs`, `capture.mjs`, `compare.mjs`), the `visual-verifier` agent, and `/relay-implement`'s `Phase A.3.4 — Visual-verification dispatch`, closing the automated fidelity loop between a Design Spec's reference screenshots and a real implementation attempt. The source PRD's own Architecture Notes name the closest existing precedent for this sub-phase's shape directly: "a structural clone of `/relay-implement`'s Phase A.3.5 docs-sync gated sub-phase." This entry records the shipped mechanics so future agents consult the decision instead of re-deriving it.

**Decision:** Phase A.3.4 triggers exactly once, immediately after Phase A.3 standard-mode returns `APPROVED` (never on an arbitration-mode verdict), and runs BEFORE Phase A.3.5 (docs-sync). It is gated by `visual_verification_enabled = figma_track_declared AND this plan's design_source == "figma"` — both derivations reuse the Phase 5 `figma_track`/`design_source` declarations verbatim, never a new heuristic or a new `methodology.md` key (see `docs/anti-patterns.md` "Flipping `figma_track` ... by heuristic") — with a per-invocation `--no-visual` flag (sibling to `--no-docs`) that always wins when both gates are true. When active, `visual-verifier` is dispatched non-interactively (own `max_visual_retries = 2` budget, independent of `max_implement_retries`/`disputes_used`/`max_docs_review_retries`) to orchestrate `provision.mjs` → `capture.mjs` → `compare.mjs` against the plan's `## Design Source` table and the referenced APPROVED Design Spec's `## Visual Acceptance Criteria` table, classifying every in-scope frame into exactly one of three verdicts:

- `VISUAL_VERIFIED` — FULL rung (Chromium provisioned, dev server ready, pixel capture/compare ran), every frame within its own `diff_threshold`.
- `VISUAL_DEGRADED` — a degradation rung was hit (`DEGRADED_STATIC_ONLY` on a dev-server readiness-probe timeout, `DEGRADED_PROVISION_FAILED` on Chromium provisioning failure, including any unrecognized `provision.mjs` exit code — fail toward the safer degraded rung, never toward silently reporting `FULL`); always non-blocking, and the degraded rung's own lightweight token-conformance check writes a stub directly into `fidelity-report.json` so the degradation is visible in the artifact itself, not only in the command's own `visual_outcome`.
- `VISUAL_MISMATCH` — FULL rung, ≥1 frame `FAIL` after content-vs-style triage confirms a genuine regression (never a dynamic-content mask gap the frame's own masks should have covered).

On `VISUAL_MISMATCH`, `/relay-implement` dispatches at most one bounded post-visual fix round per Phase A.3.4 invocation (re-`implementer` → re-`code-reviewer` → re-`visual-verifier`); if that round's `code-reviewer` step returns `CHANGES_REQUESTED` or the re-dispatched `visual-verifier` still returns `VISUAL_MISMATCH`, a **deterministic revert** (`git checkout` to the last `code-reviewer`-APPROVED state, reusing the existing `files_changed_by_attempt` oscillation-detection bookkeeping) restores the worktree and `visual_outcome = "BUDGET_EXCEEDED_REVERTED"`. Budget exhaustion without ever attempting a fix round sets `visual_outcome = "BUDGET_EXCEEDED"`. Every branch proceeds to Phase A.3.5 without halting (source PRD AC-5) — the sub-phase issues no commit of its own, mirroring the Pillar 2 "never commit" invariant (`docs/decisions.md` [2026-05-18]). `visual-verifier` itself never edits application code (write surface confined to `PRPs/reports/<feature>/.../visual/`), never queries the Figma MCP (MCP-free by its own tools allowlist, mirroring `design-map-writer`/`design-map-reviewer`/`research-design`'s own contract — `docs/anti-patterns.md` "Querying the Figma MCP from a dispatched writer/reviewer agent"), and never prompts the user. The `/relay-implement` success message gains a `Visual:` line whose presence is itself gated on `figma_track_declared`: omitted entirely (not even a `SKIPPED` marker) for a non-Figma project, preserving source PRD AC-1 ("nothing changes when `figma_track` is off") byte-for-byte.

**Reason:** Cloning the Phase A.3.5 docs-sync shape (flag extraction, config-key-derived gate, own bounded retry budget, graceful non-blocking degradation) reuses a battle-tested pattern rather than inventing a new one for the visual loop's own bounded-budget-without-blocking-delivery requirement (source PRD AC-5). Naming the degraded rungs explicitly (`DEGRADED_STATIC_ONLY` / `DEGRADED_PROVISION_FAILED`) rather than collapsing them to a single "degraded" flag preserves the operator-facing diagnostic distinction between a slow dev server and a blocked Chromium install, without the degradation ladder itself branching differently downstream (both degrade identically to non-blocking `VISUAL_DEGRADED`). The deterministic revert (rather than leaving a failed fix attempt's partial edits in the worktree) keeps the post-Phase-A.3.4 worktree state always traceable to a `code-reviewer`-APPROVED commit or diff, mirroring the existing oscillation-detection precedent (`plugins/relay/commands/relay-implement.md:239-250`).

**Areas affected:** `visual-verifier` agent (new), `plugins/relay/scripts/visual/` tooling (new — `provision.mjs`, `capture.mjs`, `compare.mjs`, `package.json`), `/relay-implement` command (new `Phase A.3.4 — Visual-verification dispatch`, `--no-visual` flag, success-message `Visual:` line), `docs/context/architecture.md` (Pillar 2 description, PRP artifact paths), `docs/context/integrations.md` (new Playwright/Chromium entry), `docs/anti-patterns.md` (MCP-free contract Areas-affected list), `docs/domain/flows.md` (Implementation flow step ordering), future Phase 7 (Surface integration) consumers of `fidelity-report.json`.

---

## [2026-07-23] `R-COH-DS-REUSE` + implementer CREATE-guard ship AC-2 ("Reuse enforced") as a gap-closing addition after all 7 Figma Implementation Track phases

**Context:** `PRPs/prds/figma-implementation-track.prd.md` AC-2 ("Given a Design Spec that cites a REUSE component-map row for a Figma node, when the Implementer or Code Reviewer processes the corresponding task, then a new component file for that node is never created — the code-reviewer's coherence check fails the diff if it is, citing the mapped import path") was never assigned to any of the PRD's 7 Implementation Phases rows — all 7 are `complete`, yet AC-2 stayed unbuilt. `docs/context/component-map-template.md`'s own Lifecycle section had forward-referenced this exact check by name ("a future `R-COH-DS-REUSE` code-review check ... not built in this phase") since Phase 3. This entry records a standalone, description-mode gap-closing change (no new PRD phase row, no new plan) that builds it directly against the already-APPROVED PRD's AC-2.

**Decision:** Two coordinated, additive edits:

- **`code-reviewer.md`** gains a fifth deterministic `R-COH-*` check, `R-COH-DS-REUSE` (rubric-count sites updated 4→5 deterministic / 13-19→14-20 total standard-mode rows). Zero-emission (no rubric row at all, not even `passed: true`) unless `figma_track: true` AND the plan's `design_source: figma` — the identical two-part gate `R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED` already use. When active, it resolves `PRPs/designs/<feature>/design-spec.md`, parses its `## Component Mapping` table for `Verdict == REUSE` rows (extracting `{node_id, cm_id, import_path}` from the Evidence cell), and FAILs an in-scope task whose `## Files to Change` action is `CREATE` of a file other than the REUSE row's cited import path — the `reason` string cites that import path verbatim, per AC-2's own wording. A silent-degradation branch (`passed: true` with a specific reason) covers an unresolvable Design Spec, zero REUSE rows, or no in-scope task — mirroring `R-COH-REGISTRY-MISSING`/`R-COH-CONFIG-DANGLING`'s existing silent-degradation idiom rather than inventing a new one.
- **`implementer.md`** gains Hard Constraint #9 plus a conditional Phase 0 read (methodology `figma_track` + the plan's `design_source` Metadata row +, when both are Figma-flavored, the Design Spec's REUSE rows held in context) and a new **Step 2.3.5** guard: before applying a CREATE action, if the task's target node/`CM-<n>` matches a held REUSE row, halt with a structured `REUSE_VIOLATION_REJECTED` error (naming the task index, the verbatim ACTION line, and the reused import path) instead of executing the CREATE — mirroring Step 2.3's existing `TEST_FILE_EDIT_REJECTED` halt shape exactly, rather than a third novel halt pattern.

Both edits are zero-effect on any plan where `figma_track` is off or `design_source` is not `figma`, preserving AC-1 ("nothing changes when `figma_track` is off") byte-for-byte.

**Reason:** AC-2 requires enforcement against a *real implementation diff*, which only exists once code-review and implementation are both live — the Design Spec (Phase 4) and Design Source Metadata (Phase 5) are the two prerequisites, and both were already in place, but no phase's own scope line ever named building the enforcement check itself, so it fell through the phase table. Reusing the already-battle-tested two-part gate, silent-degradation idiom, and `TEST_FILE_EDIT_REJECTED`-shaped halt keeps this addition structurally consistent with the rest of the R-COH-* coherence layer and the implementer's existing halt vocabulary instead of introducing new mechanics for a single check.

**Areas affected:** `plugins/relay/agents/code-reviewer.md` (new `R-COH-DS-REUSE` deterministic check + rubric-count sites + JSONL example row), `plugins/relay/agents/implementer.md` (new Hard Constraint #9, conditional Phase 0 read, new Step 2.3.5 guard + `REUSE_VIOLATION_REJECTED` halt shape), `docs/context/component-map-template.md` (Lifecycle item 5 forward-reference resolved to reflect the shipped check), `PRPs/prds/figma-implementation-track.prd.md` AC-2 (now built).

---

## [2026-07-23] `docs/context/design-system.md` is command-owned: scaffolded by `/relay-design-map`'s P2 precondition, never generated by `context-builder` (fixes a chicken-and-egg gap)

**Context:** `/relay-design-map`'s P2 precondition genuinely reads and parses `docs/context/design-system.md` (package name, local design-system clone path, token module path, Figma library file key(s), `dev_server` block) in its Phase A, consumed downstream by Phase B (`search_design_system`), Phase C (writer dispatch payload), and Phase D (preflight). Until this fix, P2 HALTed on absence with `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` and told the user to "run `context-builder *update` first to generate it" — but `context-builder`'s `SKILL.md` contains zero logic that writes this file (confirmed by a zero-hit grep across every frontmatter key P2 parses), so the remediation instruction was a dead end. A context-builder-side generator gated on `figma_track: true` (the pattern the four `SKILL.md` registration-site stubs implied) cannot work either: `/relay-design-map` does not require `figma_track: true` as a precondition — it is the command that FLIPS `figma_track` to `true` at the end of its own Phase E, after the map is `APPROVED`. On a fresh project `figma_track` is still `false` when `/relay-design-map` first runs, so a `figma_track`-gated generator could never produce the file the command needs before the flip — a structural chicken-and-egg gap.

**Decision:** `docs/context/design-system.md` is COMMAND-OWNED by `/relay-design-map`, not context-builder-generated. When absent, `/relay-design-map`'s P2 precondition now scaffolds a starter file at that exact path — inferring `package_name` and `dev_server.command` cheaply from the target project's `package.json` when discoverable, marking every other field (at minimum `figma_library_file_keys`, `local_clone_path`) with the existing `[INFERRED - VALIDATE]` placeholder convention (`plugins/relay/skills/context-builder/SKILL.md:100`) — and THEN still HALTs, with the HALT code renamed `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` → `FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE` and a message naming exactly which keys need a human value before a re-run. The false `context-builder *update` remediation instruction is removed entirely. `context-builder`'s four `docs/context/design-system.md` registration sites in `SKILL.md` (decision-gate `[DYNAMIC]` row, `KNOWLEDGE_BASE.md` required-entries bullet, `CLAUDE.md` `Context & Domain` conditional pointer, Content Placement table row) are corrected to describe the file as command-owned and scaffolded by `/relay-design-map` on first run — `context-builder *update` only registers and PRESERVES the file once it exists; it never generates or overwrites it. The same four sites' bare `docs/design-system.md` path spelling is normalized to `docs/context/design-system.md`.

**Reason:** The gating direction was backwards for bootstrap: gating the producer on the very flag the producer's own consumer is responsible for flipping makes the file unproducible on a fresh project. Moving the scaffold into the command that already reads and needs the file — mirroring the existing `PRPs/redaction-extensions.txt` default-content-skeleton precedent (`SKILL.md:307-336`) and the existing named-code, multi-line actionable-HALT-message shape (`FAILED_MAP_REVIEW_BUDGET_EXCEEDED`) — resolves the chicken-and-egg without weakening the precondition: the command still HALTs on an incomplete config, it just leaves the human a concrete, fillable starting point instead of a dead-end instruction.

**Areas affected:** `plugins/relay/commands/relay-design-map.md` (P2 scaffold-then-HALT producer, HALT-code rename, HALT-code enumeration, Phase D preflight + Constraints hard-rule Phase-6-shipped corrections); `plugins/relay/skills/context-builder/SKILL.md` (four registration-site path normalizations + command-owned/scaffolded wording corrections); `documentation/reference/commands.html` (`/relay-design-map` Preconditions/Preflight mirror); future context-builder work touching `figma_track`-gated registration sites (must preserve this ownership split — context-builder registers and preserves, never generates, `docs/context/design-system.md`).

---

## [2026-07-25] Visual-first phase-pairing: `[VISUAL]`/`[LOGIC]` bracket tag on the `Phase` cell + strict 1:1 `Depends` pairing (Figma Visual-First Track Phase 2)

**Context:** Phase 2 of `PRPs/prds/figma-visual-first-track.prd.md` (Implementation Phases row 2, "PRD authoring") ships the mechanism a `visual_first: true` PRD uses to express AC-2's mandatory strict visual/logic phase separation inside the existing `## Implementation Phases` table, with no new table column and no new orchestrator sequencing primitive. The source PRD's own Decisions Log posed two related items at authoring time: "Scope-flag placement" — a plan-level choice, `phase_scope: visual | logic` as a new non-heuristic field in the plan's `## Metadata` table, chosen over a new PRD-table column and over reusing `phase_type` — and "Visual/logic pairing" (strict 1:1 via the existing `Depends` column vs. N:1, deferred). The PRD itself was silent on how a visual-first PRD marks per-row scope at the PRD level; the `[VISUAL]`/`[LOGIC]` Phase-cell bracket tag actually shipped here is this Phase 2 plan's own authoring-time invention (`PRPs/plans/figma-visual-first-track-phase-2-prd-authoring.plan.md` Notes: "neither the source PRD nor Phase 1 specified how an individual PRD phase row should declare its visual/logic scope"), which reuses the "Scope-flag placement" row's rejection of a new PRD-table column as a carried-over constraint on the design. The 2026-07-24 Phase 1 docs-sync deliberately withheld the "Visual-first architectural direction" as a Candidate Decision pending "the first point where this direction has real, observable behavior to anchor the entry to," explicitly naming Phase 2 ("PRD authoring") as the suggested timing (`PRPs/reports/figma-visual-first-track/docs-update.md`, superseded by this sync's manifest). This entry records the shipped mechanics so future agents consult the decision instead of re-deriving it.

**Decision:** A `visual_first: true` PRD marks each `## Implementation Phases` row's scope directly in the `Phase` cell using a mandatory leading bracket tag — `[VISUAL] {Phase Name}` or `[LOGIC] {Phase Name}` — rather than a dedicated table column, mirroring `docs/context/mock-sentinels.md`'s `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` bracket-tag idiom (Phase 1). Every row carries exactly one of the two tags, never both, never neither. Pairing reuses the existing `Depends` column with a strict 1:1 rule: a `[LOGIC]` row's `Depends` cell names exactly the `#` of its one paired `[VISUAL]` row (a lone value, never comma-separated), and a `[VISUAL]` row is named by exactly one `[LOGIC]` row's `Depends` cell — never N:1. Per AC-2's "(and vice versa)" clause, every phase belongs to exactly one pair; a visual-first PRD has no standalone, unpaired phase. `prd-writer` gains a `figma_track`-gated Item 6.5 question in Phase 6 DECISIONS ("Is this PRD visual-first?", recorded verbatim as `visual_first: true | false`, never inferred) plus Step 7.4 items 15 and 15.4, which assemble the tagged, paired rows and emit a single `**visual_first:**` line inside the new `## Visual-First Mode` section, positioned immediately after `## Implementation Phases` and before the conditional `## Design Source` section. `prd-reviewer` enforces the shape structurally and read-only via the new `R-COH-VISUAL-PAIRING-INCOMPLETE` deterministic check — zero-emission unless `## Visual-First Mode` is present AND `visual_first: true`; otherwise it fails `CHANGES_REQUESTED` on a missing/doubled tag, an unpaired `[VISUAL]`/`[LOGIC]` row, a malformed or multi-valued `Depends` cell, or non-1:1 fan-in — and its item-13 dual-branch section-order note (mirroring `plan-reviewer`'s analogous item-6 note) now orders `## Visual-First Mode` before `## Design Source` when both are `figma_track`-gated-present. Canonical shape lives in `docs/context/prd-template.md`'s `## Visual-First Mode` → `### Phase-pairing mechanism` subsection.

**Reason:** A new table column would widen every PRD's Implementation Phases table even in the common `visual_first: false`/`figma_track: false` case unless made conditional with extra ceremony; reusing `phase_type` would conflate a reviewer-inferable structural classification (`docs/decisions.md` [2026-05-14]) with a business-level scope declaration that must never be inferred — the same non-heuristic reasoning that already separated `design_source` from `phase_type` (`docs/decisions.md` [2026-07-23] `design_source` declaration). Tagging the `Phase` cell instead reuses a convention already proven one phase earlier in this same track rather than inventing a second bracket-tag idiom. Strict 1:1 via `Depends` maps directly onto the dependency primitive the orchestrator's own state machine already understands (`docs/decisions.md` [2026-05-01] D6), with no ambiguity about which logic phase owns which visual phase; N:1 was deferred as a future extension per the source PRD's own Open Questions, consistent with this project's "no legacy carve-out, no premature generalization" posture elsewhere in this log.

**Areas affected:** `docs/context/prd-template.md` (`## Visual-First Mode` + `### Phase-pairing mechanism` section); `plugins/relay/agents/prd-writer.md` (Item 6.5 question, item 7 amendment, Step 7.4 items 15 and 15.4); `plugins/relay/agents/prd-reviewer.md` (item-13 dual-branch section-order note, new `R-COH-VISUAL-PAIRING-INCOMPLETE` check); future Phase 3 (`plan-writer`/`plan-reviewer` `phase_scope: visual` handling) and Phase 4 (`phase_scope: logic` + sentinel-ledger resolution) consumers of the paired rows this mechanism produces.

---

## [2026-07-25] `phase_scope` non-heuristic sourcing + `R-COH-VISUAL-SCOPE-PURITY` enforcement ship (Figma Visual-First Track Phase 3)

**Context:** Phase 1 (Foundations) registered `phase_scope: visual | logic` as a plan-Metadata field stub without a sourcing mechanism; the [2026-07-25] Visual-first phase-pairing entry above (Phase 2) forward-referenced "future Phase 3 (`plan-writer`/`plan-reviewer` `phase_scope: visual` handling)" as the phase that would resolve it. Phase 3 of `PRPs/prds/figma-visual-first-track.prd.md` (Implementation Phases row 3, "Plan authoring — visual phase") now ships that sourcing mechanism plus `plan-reviewer`'s structural enforcement of visual-scope task purity. This entry records the shipped mechanics so future agents consult the decision instead of re-deriving it.

**Decision:** `plan-writer` sources `phase_scope` non-heuristically, mirroring `design_source`'s lineage (`docs/decisions.md` [2026-07-23] `design_source` declaration) rather than `phase_type`'s self-healing one (`docs/decisions.md` [2026-05-14]): it reads Implementation Phases row N's own `Phase` cell for its mandatory leading `[VISUAL]`/`[LOGIC]` bracket tag (the tag `prd-writer` emits per the [2026-07-25] Visual-first phase-pairing entry) — never inferred from the row's `Description` cell, Phase Details prose, or any task content. When the source PRD declares `visual_first: true` and the row's `Phase` cell does not begin with exactly one recognized tag, `plan-writer` HALTs with `FAILED_PHASE_SCOPE_UNDECLARED` before writing any DRAFT plan, rather than silently defaulting to `logic`. This HALT is a defense-in-depth backstop, not the expected path — `prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` check (shipped Phase 2) already structurally guarantees every row carries exactly one valid tag before a `visual_first: true` PRD can reach `APPROVED`.

For a `phase_scope: visual` plan, every task under `## Step-by-Step Tasks` is restricted to UI-and-mocks scope: no task's `**ACTION**:` line or body prose may contain forbidden side-effect vocabulary (client-call, persistence-write, SQL-write, or REST-write shapes, or an explicit real-side-effect phrase), and every data-display or interactive-action task must name the type-matched `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel it will emit. `docs/context/mock-sentinels.md` (Phase 1) becomes a mandatory P0 `## Mandatory Reading` row on every `phase_scope: visual` plan. `plan-reviewer` enforces both rules structurally via the new zero-emission deterministic check `R-COH-VISUAL-SCOPE-PURITY` — no rubric row at all unless `## Metadata` carries `phase_scope: visual` — which never infers or repairs an offending task (always a structural defect). The check's own text records a known limitation: it is a textual scan over plan-authored task prose, not a real diff (no code exists yet at plan-review time), so it can miss a cleverly-worded side effect or false-positive on an incidental word match; Phase 5 (Implement-time gate) is where a real diff gets checked against real code.

The rubric-length range in `plan-reviewer.md` widens to `14 to 22 rows` in the maximal case (all three conditional rows — `R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`, and now `R-COH-VISUAL-SCOPE-PURITY` — present at once). Each conditional row remains independently zero-emission, so the 14–19 baseline is unchanged for non-Figma projects and the 14–21 range is unchanged for a `figma_track: true` project whose plan is not `phase_scope: visual`.

**Reason:** "Is this phase visual or logic" is a business/authoring decision no reviewer may manufacture on the plan-writer's behalf — the same reasoning that already separated `design_source` from the reviewer-inferable `phase_type` (`docs/decisions.md` [2026-07-23]). Reusing the already-proven non-heuristic lineage, the `[VISUAL]`/`[LOGIC]` bracket-tag idiom `prd-writer` already emits (Phase 2), and the existing zero-emission/otherwise shape of `R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED` keeps this addition structurally consistent with the rest of the R-COH-* coherence layer instead of inventing new mechanics.

**Areas affected:** `plugins/relay/agents/plan-writer.md` (Hard Constraint #12; Phase 0 read of the PRD's `visual_first` value; Step 4.4 item 5 `phase_scope` Metadata sourcing + `FAILED_PHASE_SCOPE_UNDECLARED` HALT; item 6 mandatory `mock-sentinels.md` P0 reading; item 10 task-restriction rule; anti-patterns bullet); `plugins/relay/agents/plan-reviewer.md` (new `R-COH-VISUAL-SCOPE-PURITY` deterministic check; rubric-length range 14–21 → 14–22); `docs/context/plan-template.md` (`phase_scope` conditional Metadata field resolved from stub to the sourcing mechanism + HALT shape); future Phase 4 (`phase_scope: logic` + sentinel-ledger resolution, per the source PRD's own Implementation Phases row 4) consumer of this mechanism.

---

## [2026-07-25] `phase_scope: logic` sentinel-ledger resolution + `R-COH-SENTINEL-RESOLUTION-MISSING` enforcement ship (Figma Visual-First Track Phase 4)

**Context:** The [2026-07-25] entry directly above (`phase_scope` non-heuristic sourcing + `R-COH-VISUAL-SCOPE-PURITY` enforcement ship) forward-referenced "future Phase 4 (`phase_scope: logic` + sentinel-ledger resolution, per the source PRD's own Implementation Phases row 4)" as the phase that would resolve the paired logic-side half of the mechanism. Phase 4 of `PRPs/prds/figma-visual-first-track.prd.md` (Implementation Phases row 4, "Plan authoring — logic phase + sentinel ledger") now ships that resolution. This entry records the shipped mechanics so future agents consult the decision instead of re-deriving it.

**Decision:** `plan-writer`'s Phase 2 GROUNDING extends its existing `research-codebase` dispatch for a `[LOGIC]`-tagged row (source PRD declares `visual_first: true`): it resolves the paired visual phase's row number from row N's own `Depends` cell, reads that row's `PRP Plan` cell, and extends the dispatch's `focus_areas` with `RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR` occurrences and `roots` with the paired visual phase's touched files (from its `## Files to Change` table); the returned findings become the initial sentinel ledger, falling back to `TBD - needs validation` (never halting) if the paired plan is unreadable. New Hard Constraint #13 (mirroring #12's visual-side dual-branch, never-inferred lineage) and a Step 4.4 item 10 amendment require every `phase_scope: logic` plan to author at least one task resolving every ledger entry per `docs/context/mock-sentinels.md`'s Swap semantics — replacing each `[RELAY-MOCK-DATA]` literal with its real data source at the exact sentinel site, filling each `[RELAY-MOCK-BEHAVIOR]` handler with real logic inside the already-approved choreography — backed by at least one VALIDATE command that greps the paired visual phase's own touched files for both sentinel tokens and fails (non-zero exit) if either remains: no count threshold, no recorded-justification exception, per `docs/context/mock-sentinels.md`'s "Zero remaining sentinels — no deferral path" rule and the source PRD's own Decisions Log "Sentinel deferral policy" row ("Never allowed — logic-phase validation requires zero remaining sentinels"). Step 4.4 item 6 additionally makes `docs/context/mock-sentinels.md` and the paired visual phase's own plan file mandatory P0 `## Mandatory Reading` rows on every `phase_scope: logic` plan.

Step 4.3.5's `## Design Source` conditional section gains a frame-filter exception for `phase_scope: logic` plans: because the Design Spec's `Phase assignment` column (when present) names the VISUAL phase that renders each frame, never the logic phase that later wires real data behind it, a logic-scoped plan filters frames by the paired visual phase's row number (read from row N's own `Depends` cell) instead of row N's own number — inheriting the SAME locked frame set the paired visual phase already declared, rather than deriving an empty or mismatched set.

`plan-reviewer` gains the new zero-emission deterministic check `R-COH-SENTINEL-RESOLUTION-MISSING`, a deliberate mirror of `R-COH-VISUAL-SCOPE-PURITY`'s zero-emission/otherwise shape applied to the opposite `phase_scope` value: it emits no rubric row at all unless `## Metadata` carries `phase_scope: logic`; otherwise it fails when either (a) no task references `RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR` anywhere in `## Step-by-Step Tasks`, or (b) the `**VALIDATE**:` commands (task-level or `## Validation Commands` Level 2/3), collectively, name no sentinel token at all or only one sentinel class without a class-agnostic `RELAY-MOCK` match covering both. It is mutually exclusive with `R-COH-VISUAL-SCOPE-PURITY` — both key off the same single-valued `phase_scope` Metadata cell, so at most one of the two ever emits a row for a given plan. The rubric-length range's maximum stays `22 rows` (two conditional design-source rows, plus exactly one of the two mutually-exclusive `phase_scope` rows, plus the full 5-row K=5 pass, on top of the 8 R1–R8 + 6 fixed R-COH-* baseline) — it never reaches a 23rd row, since `R-COH-VISUAL-SCOPE-PURITY` and `R-COH-SENTINEL-RESOLUTION-MISSING` can never both fire on the same plan.

**Reason:** Resolving the sentinel ledger is the other half of the visual/logic split this track exists to enable — a visual phase that locks a deterministic mock diff is only safe if the paired logic phase is structurally guaranteed to remove every mock before completion (source PRD AC-5). Deriving the ledger from the paired visual phase's own touched files only, never the whole repo or other visual/logic pairs in the same feature, keeps resolution scoped to the exact 1:1 pair each logic phase resolves. Reusing `R-COH-VISUAL-SCOPE-PURITY`'s zero-emission/otherwise shape for the new check keeps the R-COH-* coherence layer structurally consistent rather than inventing new mechanics; the mutual-exclusivity property falls directly out of `phase_scope` being single-valued, not a new design choice. The frame-inheritance exception is necessary because a logic phase does not itself render any frame — the Design Spec's own `Phase assignment` column only ever names visual phases, so filtering by row N's own number would silently produce an empty or wrong frame set for every logic-scoped plan.

**Areas affected:** `plugins/relay/agents/plan-writer.md` (Hard Constraint #13; Phase 2 GROUNDING ledger-dispatch extension; Step 4.3.5 frame-inheritance exception; Step 4.4 item 6 mandatory-reading amendment; Step 4.4 item 10 mandatory sentinel-resolution-task rule; anti-patterns bullet); `plugins/relay/agents/plan-reviewer.md` (new `R-COH-SENTINEL-RESOLUTION-MISSING` deterministic check; rubric-length-range prose now accounts for the two mutually-exclusive `phase_scope` rows); `docs/context/plan-template.md` (`phase_scope: logic` implications paragraph; `## Design Source` frame-filter exception). This closes the forward reference from the Phase 3 entry above; per the source PRD's own Implementation Phases table, Phase 5 (Implement-time gate) and Phase 6 (Orchestrator wiring) are the remaining phases of this track.

---

## [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED deterministic plan-reviewer check catching ACTION/VALIDATE self-contradiction; rubric[] arithmetic shifts to 15–20/15–23

**Context:** `plan-reviewer`'s additive R-COH-* coherence layer had no
check cross-referencing a single task's own `**ACTION**:` prose
against that SAME task's own `**VALIDATE**:` command. A real instance
escaped review: `PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md`
Task 8 instructed inserting the literal `` `14 to 23` `` into
`plugins/relay/agents/plan-reviewer.md` (as part of a clarifying "NOT
`14 to 23`" aside) while that SAME task's own VALIDATE asserted
`grep -q "14 to 23" plugins/relay/agents/plan-reviewer.md` must find
nothing — literal compliance with the ACTION was structurally
impossible. `plan-reviewer` APPROVED the plan anyway: it verified the
rubric-row arithmetic was correct but never cross-checked the ACTION
prose against the VALIDATE command of the SAME task. The Implementer
deviated from the plan's literal ACTION text (landing "the range
never extends to a 23rd row" instead of the plan's literal
instruction) and self-reported the judgment call; `code-reviewer`
independently ruled the deviation justified. No mechanism existed to
catch the authoring-time defect itself, before implementation.

**Decision:** `plan-reviewer` gains a 7th FIXED deterministic
`R-COH-*` check, `R-COH-ACTION-VALIDATE-CONTRADICTION`, positioned
immediately after `R-COH-VALIDATE-ALWAYS-PASS` and immediately before
`R-COH-DESIGN-SOURCE-MISSING` — preserving "fixed checks first,
conditional checks after". For each `### Task <i>` in `##
Step-by-Step Tasks`, it detects two contradiction shapes between that
task's own ACTION and its own VALIDATE: (a) the ACTION instructs
inserting a quoted/backticked literal into a file while the VALIDATE
asserts a zero count of that same literal in that same file; and (b)
the inverse — the ACTION instructs removing a literal while the
VALIDATE requires its presence. It is a textual scan performed by the
reviewer over the plan already in memory (`plan-reviewer`'s tool
grant is `Read, Edit, Write` — no `Bash`, no `Grep` — so it cannot
execute the VALIDATE command itself), in the same voice as
`R-COH-VALIDATE-ALWAYS-PASS`, and closes with a "Known limitation"
paragraph matching `R-COH-VISUAL-SCOPE-PURITY`/`R-COH-SENTINEL-RESOLUTION-MISSING`'s
own shape.

**Deliberately UNCONDITIONAL, not a 5th zero-emission conditional
row.** Unlike the four existing declaration-gated zero-emission
checks (`R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED` gated on
`figma_track`; `R-COH-VISUAL-SCOPE-PURITY`/`R-COH-SENTINEL-RESOLUTION-MISSING`
gated on `phase_scope`), `R-COH-ACTION-VALIDATE-CONTRADICTION` has no
project- or plan-level declaration to gate on — every plan has
ACTION+VALIDATE tasks by construction (the plan template already
mandates this shape on every task). It therefore always contributes
exactly one row to `rubric[]`, `passed: true` vacuously on a plan
with no task matching the tractable contradiction shape, mirroring
`R-COH-VALIDATE-ALWAYS-PASS`'s own unconditional precedent, not the
four conditional siblings' zero-emission one.

**Rubric[] arithmetic shifts.** The `### Logging discipline`
paragraph in `plugins/relay/agents/plan-reviewer.md` is updated for 7
fixed deterministic checks (was 6): baseline (non-Figma)
`8 (R1–R8) + 7 (deterministic R-COH-*) + ≤5 (K=5 pass) = 15 to 20
rows` (was 14 to 19); maximal (two design rows plus exactly one of
the two mutually-exclusive `phase_scope` rows, plus the full 5-row
K=5 pass) = `15 to 23 rows` (was 14 to 22); the range never extends
to a 24th row (was 23rd), because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` remain mutually exclusive. The
preserved range for a `figma_track: true` project whose plan has no
`phase_scope` row at all shifts from 14–21 to 15–22. The "four
conditional rows" wording is UNCHANGED — the new check is FIXED, not
a fifth conditional row, so the count of conditional rows stays four.
**This entry's numerals supersede the "rubric[] length 14–19" numeral
recorded in the [2026-07-09] entry's "Areas affected" line above**
(`docs/decisions.md` [2026-07-09] "Validation commands must carry
real exit-code semantics..."), which predates this shipment.

**Reason:** The escaped instance demonstrates the gap is real, not
hypothetical: a plan can be structurally well-formed (correct
rubric-row arithmetic, correct ordering, correct wording) while still
being internally self-contradictory at the single-task granularity
R1–R8 and the six prior R-COH-* checks do not examine. The check is
deliberately scoped to the tractable, high-value subset (quoted/
backticked literal + same-file zero-count/presence grep) rather than
attempting general natural-language contradiction detection,
consistent with this layer's existing deterministic checks
(mechanical, not LLM-judged) and its separate bounded K=5 LLM pass
(which already covers broader, harder-to-mechanize contradiction
classes). Making it UNCONDITIONAL rather than a fifth zero-emission
conditional row is correct because — unlike Figma/visual-first
involvement, which is a business decision the reviewer cannot
manufacture — every plan already has ACTION+VALIDATE task pairs by
construction; there is no "doesn't apply" case to gate on, only a
"found nothing" vacuous-pass case, mirroring
`R-COH-VALIDATE-ALWAYS-PASS`'s own precedent exactly.

**Areas affected:** `plugins/relay/agents/plan-reviewer.md` (new
`#### R-COH-ACTION-VALIDATE-CONTRADICTION` deterministic check,
positioned between `R-COH-VALIDATE-ALWAYS-PASS` and
`R-COH-DESIGN-SOURCE-MISSING`; `### Logging discipline`
rubric[]-length arithmetic 14–19/14–22 → 15–20/15–23, 23rd → 24th row
wording, 14–21 → 15–22 preserved range; `## review.jsonl format`
example block gains a matching row); `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`
and `scripts/validate/checks/figma-track-phase5.test.mjs` (both
assert verbatim sentences from the updated paragraph —
`EXISTING_TEST_UPDATED` follow-up by the test pair, test-after per
`docs/context/methodology.md`); this entry's own numerals now the
canonical rubric[]-length reference, superseding the [2026-07-09]
entry's stale "14–19" mention.

---

## [2026-07-27] Implement-time visual gate: Phase A.3.4 becomes dual-mode blocking/non-blocking + additive interaction-step capture (Figma Visual-First Track Phase 5)

**Context:** Phase 5 of `PRPs/prds/figma-visual-first-track.prd.md` (Implementation Phases row 5, "Implement-time gate") ships the first phase of this track to touch executable code and the first to make the track's blocking promise (source PRD AC-4) real at runtime — Phases 1-4 registered and enforced `phase_scope`/`visual_first_approval` only at PRD- and plan-authoring time (see the [2026-07-25] entries above); nothing yet branched on them inside `/relay-implement` itself. This entry records the shipped mechanics so future agents consult the decision instead of re-deriving it, and narrows the [2026-07-23] Visual-verification loop entry's "always non-blocking" framing above to the `phase_scope: logic`/absent case specifically — that entry's dispatch, three-way-verdict, one-bounded-fix-round, and deterministic-revert mechanics are otherwise UNCHANGED and remain the operative contract regardless of `phase_scope`.

**Decision:** `/relay-implement`'s `Phase A.3.4` reads two new inputs immediately before dispatching `visual-verifier`, both sourced from already-shipped, non-heuristic declarations (never a new methodology key): `phase_scope_value` — the verbatim `phase_scope` row from the plan's `## Metadata` table (`"visual"`, `"logic"`, or `null` when the row is absent; read verbatim, mirroring the non-heuristic sourcing lineage shipped in Phase 3) — and `visual_approval_mode` — the `visual_first_approval` key in `docs/context/methodology.md` frontmatter (`"auto"`/`"human"`, defaulting to `"auto"` only when the key is entirely absent, mirroring the `figma_track`/`docs_sync` default-when-absent idiom already used earlier in the same Phase A.0, `plugins/relay/commands/relay-implement.md:203-220`).

A new Terminal-routing paragraph, inserted immediately after the existing three-way verdict branch (`VISUAL_VERIFIED`/`VISUAL_DEGRADED`/`VISUAL_MISMATCH`), gates every one of that branch's five "proceed to Phase A.3.5" exit points — the `VISUAL_VERIFIED` bullet, the `VISUAL_DEGRADED` bullet, and, inside the `VISUAL_MISMATCH` bullet, its deterministic-revert sub-case, its budget-exhausted-without-a-fix-round sub-case, and its fix-round-succeeds sub-case (whose own re-dispatched verdict may itself be `VISUAL_VERIFIED` OR `VISUAL_DEGRADED`) — and is deliberately written as an inverse (block unless the outcome is exactly `VISUAL_VERIFIED`) rather than a positive enumeration, specifically so a future branch addition to Step 5 cannot silently bypass it:

- `phase_scope_value != "visual"` (absent, or `"logic"`) → proceeds to Phase A.3.5 immediately, byte-identical to today — the non-visual path is untouched (source PRD AC-6).
- `phase_scope_value == "visual"` AND `visual_approval_mode == "human"` → regardless of which point above was reached — including a genuine `VISUAL_VERIFIED` result — does NOT proceed. HALTs the entire `/relay-implement` invocation with outcome `AWAITING_VISUAL_APPROVAL` before Phase A.3.5 (docs-sync) and Phase A.4 (D8) ever run; the actionable recommendation names `/relay-visual-approve` explicitly as "not yet built as of this phase" — that command and `/relay-execute`'s cross-phase resume semantics are Phase 6's job, not shipped here.
- `phase_scope_value == "visual"` AND `visual_approval_mode == "auto"` (or absent, defaulting to `auto`) → proceeds to Phase A.3.5 ONLY on a genuine `VISUAL_VERIFIED` result (`visual_outcome = "APPROVED"`, D8 continues normally); every other reachable point — `VISUAL_DEGRADED` (directly, or via the fix-round-succeeds sub-case's re-dispatched verdict), the deterministic-revert sub-case (`BUDGET_EXCEEDED_REVERTED`), or the budget-exhausted-without-a-fix-round sub-case (`BUDGET_EXCEEDED`) — HALTs with outcome `VISUAL_GATE_BLOCKED` instead, before Phase A.3.5 and Phase A.4.

Both new outcomes are registered in the Final output surface's HALT enumeration and in Constraints item 6 ("Never bypass D8"), which now states explicitly that D8 is never attempted for either. `max_visual_retries` is unchanged — the routing paragraph introduces no new budget.

Additively, `capture.mjs` gains a bounded interaction-step executor, exported as `parseInteractionScript()` and `executeInteractionSteps()`: a `click(<selector>)` / `fill(<selector>, <value>)` / `wait(<ms> | <selector>)` vocabulary, semicolon-separated, parsed from the Design Spec's `Interaction` column (the 9th, optional column of the `## Visual Acceptance Criteria` table, already registered by Phase 1 — `docs/context/design-spec-template.md:111-113`) and executed via Playwright strictly between `page.goto` and `page.screenshot` inside `captureFrame()`. An absent value or the literal `"none"` parses to zero steps — a genuine no-op on every frame that declares no script. `visual-verifier`'s Step 0 frame manifest grows from eight fields to nine (`interaction` added), defaulting to `"none"` when a given Design Spec predates this column or leaves the cell empty. `compare.mjs`/`provision.mjs` are untouched.

**Reason:** The inverse framing of the Terminal-routing paragraph (block-unless-`VISUAL_VERIFIED` rather than enumerating which verdicts should block) is a deliberate defense against the exact gap a positive enumeration risks — a future branch added to Step 5 without a matching addition to an enumeration could silently proceed unblocked; an inverse rule cannot make that mistake. Gating on the already-shipped, non-heuristic `phase_scope` and `visual_first_approval` declarations (rather than inventing a third) keeps this phase a pure consumer of Phases 1-4's authoring-time mechanics, consistent with the source PRD's own Decision Gate block — its "Decisions found" line describes this as "the exact mechanism this feature extends to a dual-mode blocking/non-blocking shape." The interaction-step vocabulary follows the source PRD's own resolved Open Question ("Interactive-state capture") choosing scripted interaction capture — mirroring the Storybook play-function pattern — over an addressable mock-state variant or deferring interaction states to human QA: it verifies the choreography actually fires, not just that a forced state renders, and stays deterministic because the visual phase's own `[RELAY-MOCK-BEHAVIOR]` handlers control all timing.

**Areas affected:** `plugins/relay/commands/relay-implement.md` (Phase A.3.4 dual-mode read + Terminal-routing paragraph + Final-output HALT enumeration + Constraints item 6); `plugins/relay/scripts/visual/capture.mjs` (new exported `parseInteractionScript`/`executeInteractionSteps`, frame-manifest comment); `plugins/relay/agents/visual-verifier.md` (Step 0 nine-field frame manifest); `documentation/changelog.html` (already updated within this same diff by the implementer). Narrows the [2026-07-23] Visual-verification loop entry's "always non-blocking" framing to the `phase_scope: logic`/absent case only — that entry's mechanics remain the operative contract otherwise. Phase 6 (`/relay-execute`'s resumable visual-approval check + Phase A.2.5 resume short-circuit, plus the new `/relay-visual-approve` command) is the consumer of the two new HALT outcomes this phase introduces — shipped; see the [2026-07-27] Orchestrator resumability entry below.

---

## [2026-07-27] Orchestrator resumability + `/relay-visual-approve`: relay's third interactivity-boundary extension (Figma Visual-First Track Phase 6)

**Context:** Phase 6 of `PRPs/prds/figma-visual-first-track.prd.md` (Implementation Phases row 6, "Orchestrator wiring") closes the human-approval round trip Phase 5 opened. Phase 5 (`docs/decisions.md` [2026-07-27] Implement-time visual gate) shipped the `AWAITING_VISUAL_APPROVAL`/`VISUAL_GATE_BLOCKED` HALTs as single-invocation outcomes only — an `AWAITING_VISUAL_APPROVAL` halt had no sanctioned way back into the pipeline and no command existed for a human to act on it — the `halt.json` `actionable_recommendation` field Phase 5's own shipped code writes named `/relay-visual-approve` explicitly as "not yet built as of this phase". This entry records the shipped resumption mechanics and the new command so future agents consult the decision instead of re-deriving it.

**Decision:** Three additive pieces in `plugins/relay/commands/relay-execute.md` and `relay-implement.md`, plus a new sibling command:

1. **Resumable visual-approval check**, mirrored verbatim at both the P3 precondition and Phase A.1 (re-run at Phase A.1 because it re-reads the PRD table fresh on every loop iteration): for every `Status: in-progress` row, `Read` `PRPs/reports/<feature>/phase-<N>/halt.json`; when its `outcome == "AWAITING_VISUAL_APPROVAL"` and it carries no `resolution` field yet, this is neither an actionable row nor grounds for the "all phases complete" exit — the orchestrator emits a structured no-op naming `/relay-visual-approve` and exits 0, writing no artifacts. When a `resolution` field IS present (`"approved"`/`"rejected"`, written by `/relay-visual-approve`), the row becomes actionable and Phase A.1 sets `resume_mode` to the resolution value instead of picking a fresh row.
2. **Phase A.2.5 — Resume-from-visual-approval short-circuit**, new, runs only when `resume_mode` is non-null: `current_plan_path` is derived from disk (`Glob`; exactly one match expected, `FAILED_RESUME_PLAN_AMBIGUOUS` otherwise); Phase A.3 (plan sub-flow) and Phase A.3.3 (worktree creation) are skipped entirely, since the plan is already `APPROVED` and the worktree already exists. On `resume_mode == "approved"`, the adopted `/relay-implement` protocol resumes starting at its own `Phase A.3.5 — Docs-sync dispatch` — Phase A.0 through A.3.4 are skipped because the implementer, code-reviewer, and visual-verifier already ran to completion in the original session and the worktree still holds their uncommitted output. On `resume_mode == "rejected"`, the adopted protocol instead restarts from `/relay-implement`'s own `Phase A.0` with a fresh attempt budget, seeding `last_reviewer_feedback = [{rubric_id: "human_visual_rejection", reason: <rejection_feedback>}]` — the same shape the existing `DISPUTE_REJECTED` arbitration branch already populates — so the very first implementer dispatch of the resumed session sees the human's own feedback.
3. **`/relay-implement`'s `prior_feedback` dispatch condition narrows from `attempt > 1` to `last_reviewer_feedback` non-empty** (one line + a justification sentence in `plugins/relay/commands/relay-implement.md`): in every pre-Phase-6 code path `last_reviewer_feedback` is populated only together with an `attempt` increment, so the two conditions are equivalent for every existing invocation shape; the new condition is what lets item 2's rejected-resume branch seed feedback for a genuine `attempt == 1` dispatch, which the old condition would have silently discarded.

The new standalone command `/relay-visual-approve <feature>` (deterministic infra, no writer/reviewer pair, mirroring `relay-worktree.md`/`relay-commit.md`/`relay-pr.md`) serves the human side of the gate: it locates the single unresolved `AWAITING_VISUAL_APPROVAL` halt (`FAILED_NOTHING_TO_APPROVE` / `FAILED_MULTIPLE_PENDING_APPROVALS` otherwise), surfaces the fidelity report plus derived captured/reference PNG paths, requires an explicit quoted affirmative-or-negative reply (never inferred consent, never a flip on silence or a generic "continue"), and records the decision via exactly one `Edit` on `halt.json` (adding `resolution`/`resolved_at`/`resolver_confirmation`, plus `rejection_feedback` on rejection) plus one appended `visual-approval.jsonl` audit line. It performs no D8 mutation, dispatches no writer/reviewer pair, and is never invoked by `/relay-execute` — resuming the pipeline is `/relay-execute`'s own job on a later re-invocation, per items 1–2 above.

This is relay's **third** interactivity-boundary extension (after PRD approval and the Design Spec pair — `docs/decisions.md` [2026-07-23]), but a structurally different one: the first two both use a synchronous, in-conversation dialogue; `/relay-visual-approve` instead reuses `/relay-execute`'s own HALT-and-resume idiom, because `/relay-execute` autonomously drives many phases across one long run with no guaranteed human presence mid-flight — a synchronous dialogue pattern only works inside a single unbroken interactive turn.

**Reason:** HALT-and-resume is the only mechanism compatible with `/relay-execute`'s own long-running, unattended, multi-phase session (source PRD Architecture Notes). Deriving `current_plan_path` from disk rather than re-running the plan sub-flow, and skipping the already-complete implementer/code-reviewer/visual-verifier steps on the approved branch, avoids redundant work and — more importantly — avoids re-running steps whose side effects (a second implementer dispatch, a second code-review verdict log line) would corrupt the audit trail the original session already wrote. Narrowing `prior_feedback`'s condition, rather than adding a second parallel feedback-seeding path, keeps exactly one seeding mechanism for the implementer's first dispatch. A dedicated command — rather than a manual `Status`-cell hand-edit or overloading the read-only `/relay-visual-review` with an `--approve` mode (which would contradict its documented non-mutating contract) — keeps every human approval in relay auditable and closes the rejection-to-feedback loop without inventing a new prompt shape.

**Areas affected:** `plugins/relay/commands/relay-execute.md` (description frontmatter; P3 + Phase A.1 resumable visual-approval check; new Phase A.2.5; Step A.4.1's dedicated `AWAITING_VISUAL_APPROVAL` branch; Constraints item 5 exception; HALT-paths section; new "out of scope" bullet), `plugins/relay/commands/relay-implement.md` (one-line `prior_feedback` condition + justification sentence), new `plugins/relay/commands/relay-visual-approve.md`, `documentation/changelog.html` + `documentation/assets/data/search-index.json` (already updated by the implementer within the same diff), `docs/context/architecture.md` (asset-types table, Interactivity boundary, Command surface, Orchestrator state machine sections), `docs/domain/glossary.md` (Visual-First Approval + Visual-verification loop entries), `docs/domain/flows.md` (step 7.4).

---

## [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS: an 8th FIXED deterministic plan-reviewer check catching non-unique position-based search terms in ordering VALIDATE assertions; rubric[] arithmetic shifts to 16–21/16–24

**Context:** `plan-reviewer`'s additive R-COH-* coherence layer had no
check for a distinct defect class from the one
`R-COH-ACTION-VALIDATE-CONTRADICTION` (shipped 2026-07-26) catches: a
`**VALIDATE**` command computes `str.indexOf(needle)` (or
`lastIndexOf`) and feeds the result into an ORDERING comparison
(`aIdx > bIdx`, etc.) asserting one edit site precedes or follows
another — and the assertion fails on a byte-perfect implementation
whenever `needle` occurs more than once in the target file, because
`indexOf` silently resolves to whichever occurrence, not necessarily
the one the assertion means. Unlike `R-COH-ACTION-VALIDATE-CONTRADICTION`
(where ACTION and VALIDATE DISAGREE on a literal), this class is one
where ACTION and VALIDATE AGREE on the string — the string is simply
not unique in the file being searched. Four confirmed instances across
two phases of the `figma-visual-first-track` run, all now fixed in
their respective archived plans:
`PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md`
Task 2 (`executeInteractionSteps(page` resolved to the function
definition at the task's own insertion rather than the call site,
fixed by anchoring on the call-site-unique `await
executeInteractionSteps(page`); and three sites in
`PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md`
— its Validation Commands Level 3 `editIdx` (resolved to a
precondition's own "no `resolution` field" text, fixed by anchoring on
`resolved_at`), and its Task 1 `checkIdx`/Level 3 `p3CheckIdx` pair
(tightened to a longer, genuinely unique phrase). The same plan's own
Task 1 `ruleIdx` demonstrates the LEGITIMATE inverse case: a search
string that is deliberately byte-identical in two places by design
(the actionable-row rule text, mirrored verbatim into both `P3` and
`Phase A.1`), where `indexOf`'s first-match is correct, not lucky,
because document order permanently guarantees which copy comes first.

**Decision:** `plan-reviewer` gains an 8th FIXED deterministic
`R-COH-*` check, `R-COH-VALIDATE-SEARCH-AMBIGUOUS`, positioned
immediately after `R-COH-ACTION-VALIDATE-CONTRADICTION`'s Known
limitation paragraph and immediately before
`R-COH-DESIGN-SOURCE-MISSING` — preserving "fixed checks first,
conditional checks after". For each position-based search
(`indexOf`/`lastIndexOf`) whose result feeds an ordering comparison
against another same-derived index (a bare `=== -1`/`!== -1` presence
test is out of scope), the check applies a primary, plan-local
signal — the plan's OWN `**ACTION**:` text for that same task
contains the search string more than once — and a secondary, weaker
heuristic: a bare identifier under 20 characters with no
disambiguating context (no leading `await `, no
`function `/`const `/`### `/`## ` anchor, no surrounding punctuation).
An escape hatch — the sentinel token `RELAY-FIRST-MATCH-INTENDED`
followed by a non-empty justification, adjacent to the VALIDATE — lets
a plan author declare a deliberately-duplicated, first-match-intended
site (mirroring the escape-hatch idiom `R-COH-VISUAL-SCOPE-PURITY`/
`R-COH-SENTINEL-RESOLUTION-MISSING` already established for
`RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR`, using a deliberately
non-colliding token). Like its nearest sibling
`R-COH-ACTION-VALIDATE-CONTRADICTION`, it is a textual scan performed
by the reviewer over the plan already in memory (`plan-reviewer`'s
tool grant is `Read, Edit, Write` — no `Bash`, no `Grep` — so it
cannot execute the VALIDATE command itself or count real occurrences
in the target file), and closes with a "Known limitation" paragraph
in the same voice.

**Deliberately UNCONDITIONAL, not a 5th zero-emission conditional
row.** Mirroring `R-COH-ACTION-VALIDATE-CONTRADICTION`'s own
reasoning: a position-based search inside a `**VALIDATE**:` command is
plan CONTENT, not a project- or plan-level declaration
(`figma_track`, `phase_scope`, `design_source`, `test_frameworks` are
the only gating declarations any conditional check in this layer keys
off) — there is nothing to gate on. It therefore always contributes
exactly one row to `rubric[]`, `passed: true` vacuously on a plan with
no in-scope position-based search at all.

**Rubric[] arithmetic shifts.** The `### Logging discipline`
paragraph in `plugins/relay/agents/plan-reviewer.md` is updated for 8
fixed deterministic checks (was 7): baseline (non-Figma)
`8 (R1–R8) + 8 (deterministic R-COH-*) + ≤5 (K=5 pass) = 16 to 21
rows` (was 15 to 20); maximal (two design rows plus exactly one of
the two mutually-exclusive `phase_scope` rows, plus the full 5-row
K=5 pass) = `16 to 24 rows` (was 15 to 23); the range never extends
to a 25th row (was 24th), because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` remain mutually exclusive. The
preserved range for a `figma_track: true` project whose plan has no
`phase_scope` row at all shifts from 15–22 to 16–23. The "four
conditional rows" wording is UNCHANGED — the new check is FIXED, not
a fifth conditional row, so the count of conditional rows stays four.
**This entry's numerals supersede the "15 to 20 rows"/"15 to 23 rows"
numerals recorded in the [2026-07-26] entry above** (`docs/decisions.md`
[2026-07-26] "R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED
deterministic plan-reviewer check..."), which predates this shipment.

**Reason:** The four confirmed instances demonstrate the gap is real
and recurring, not hypothetical — a plan can be byte-perfect and still
have its own VALIDATE fail because a search term the ACTION and
VALIDATE both agree on happens to recur in the target file. The check
is deliberately scoped to the plan-local, mechanically-checkable proxy
signals (same-task ACTION duplication; unqualified short identifiers)
rather than attempting to verify true uniqueness in the target file —
`plan-reviewer` has no `Bash`/`Grep` tool and cannot read the target
file to count occurrences; that would require capability outside this
agent's tool surface. The escape hatch preserves the one legitimate
case this class of check would otherwise false-positive on: a
deliberately duplicated string whose first match is correct by
construction (document order, not luck) — exactly the shape the
`ruleIdx` instance above demonstrates. Making it UNCONDITIONAL rather
than a fifth zero-emission conditional row follows
`R-COH-ACTION-VALIDATE-CONTRADICTION`'s own precedent exactly: every
plan already has `**VALIDATE**` commands by construction; there is no
"doesn't apply" case to gate on, only a "found nothing" vacuous-pass
case.

**Areas affected:** `plugins/relay/agents/plan-reviewer.md` (new
`#### R-COH-VALIDATE-SEARCH-AMBIGUOUS` deterministic check, positioned
between `R-COH-ACTION-VALIDATE-CONTRADICTION` and
`R-COH-DESIGN-SOURCE-MISSING`; `### Logging discipline`
rubric[]-length arithmetic 15–20/15–23 → 16–21/16–24, 24th → 25th row
wording, 15–22 → 16–23 preserved range; `## review.jsonl format`
example block gains a matching row);
`scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs`,
`scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`,
and `scripts/validate/checks/figma-track-phase5.test.mjs` (all three
assert verbatim numerals from the updated paragraph, and the first
also asserts an exact `#### R-COH-*` heading count — required
`EXISTING_TEST_UPDATED` follow-up by the test pair, test-after per
`docs/context/methodology.md`, routed around `code-reviewer`'s
universal R-X test-modification guard exactly as the test pair's own
diff already is (`docs/decisions.md` [2026-07-10])); this entry's own
numerals now the canonical rubric[]-length reference, superseding the
[2026-07-26] entry's "15 to 20"/"15 to 23" mention.

---

## [2026-07-28] Merge `origin/development`: R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE joins the deterministic catalog; rubric[] arithmetic re-derived to 17–22/17–25

**Context:** `origin/development` (commit `89b7f76`) and `feature/figma-implementation-track` (commit `c5dd265`) each independently extended `plan-reviewer.md`'s additive `#### R-COH-*` coherence layer since their shared ancestor: origin added `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE` (recorded in the [2026-07-23] entry above), while this branch separately added `R-COH-ACTION-VALIDATE-CONTRADICTION` ([2026-07-26] entry above) and `R-COH-VALIDATE-SEARCH-AMBIGUOUS` ([2026-07-28] entry above), plus four Figma-track conditional checks. Each session correctly updated the `### Logging discipline` rubric-length arithmetic paragraph for its own addition in isolation, never seeing the other lineage's work — so origin's arithmetic (7 deterministic, 15–20/15–23) and this branch's own two successive statements (7 deterministic then 8 deterministic, ending at 16–21/16–24) were all mutually stale once `git merge origin/development` combined the two lineages.

**Decision:** The merge combines all three deterministic additions plus the four pre-existing conditional checks: 6 long-standing + `R-COH-ACTION-VALIDATE-CONTRADICTION` + `R-COH-VALIDATE-SEARCH-AMBIGUOUS` + `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE` = **9 deterministic** checks, plus the 4 conditional (`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`, `R-COH-VISUAL-SCOPE-PURITY`, `R-COH-SENTINEL-RESOLUTION-MISSING`) = **13 `#### R-COH-*` headings total** in the merged `plugins/relay/agents/plan-reviewer.md`, independently counted against the real merged file (`grep -c '^#### R-COH-' plugins/relay/agents/plan-reviewer.md` → 13) rather than assumed or carried over from either branch. The `### Logging discipline` paragraph is rewritten from scratch for this count: baseline (non-Figma) `8 (R1–R8) + 9 (deterministic R-COH-*) + ≤5 (K=5 pass) = 17 to 22 rows` (was 16 to 21 on this branch, 15 to 20 on origin); maximal (two design rows plus exactly one of the two mutually-exclusive `phase_scope` rows, plus the full 5-row K=5 pass) = `17 to 25 rows` (was 16 to 24 on this branch, 15 to 23 on origin); the range never extends to a 26th row (was 25th on this branch, 24th on origin), because `R-COH-VISUAL-SCOPE-PURITY` and `R-COH-SENTINEL-RESOLUTION-MISSING` remain mutually exclusive. The preserved range for a `figma_track: true` project whose plan has no `phase_scope` row at all shifts from 16–23 to 17–24. **This entry's numerals supersede the "16 to 21 rows"/"16 to 24 rows" numerals recorded in the [2026-07-28] entry above** (`docs/decisions.md` [2026-07-28] "R-COH-VALIDATE-SEARCH-AMBIGUOUS: an 8th FIXED deterministic plan-reviewer check..."), **and the "15 to 20 rows"/"15 to 23 rows" numerals recorded in the [2026-07-26] entry above** (`docs/decisions.md` [2026-07-26] "R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED deterministic plan-reviewer check..."), both of which predate this merge and were each internally correct only for their own pre-merge, single-lineage state.

**Reason:** Neither branch's stale arithmetic could be picked as-is — each was correct only for its own lineage's deterministic count — and the merge is additive across both lineages, not a choice of one side over the other (`docs/decisions.md` [2026-04-28] "AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array"). Re-deriving from an explicit count of the merged file's own `#### R-COH-*` headings, rather than carrying forward either side's number or arithmetically summing the two branches' deltas without verification, guards against the residual risk this specific merge shape carries: a duplicated or dropped heading paired with arithmetic "consistently" derived from that wrong count would otherwise pass unnoticed.

**Areas affected:** `plugins/relay/agents/plan-reviewer.md` (three merge-conflict hunks resolved: the additive `#### R-COH-*` section-header union — HEAD's six sections plus origin's `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE` — the `### Logging discipline` rubric[]-length arithmetic rewritten to 17–22/17–25, 26th-row wording, and the 17–24 preserved range; and the `## review.jsonl format` worked-example `rubric[]` array union); `plugins/relay/agents/plan-writer.md` (two additive merge-conflict hunks resolved by union, preserving Hard Constraints #12/#13 byte-for-byte); this entry's own numerals now the canonical rubric[]-length reference, superseding both the [2026-07-26] and [2026-07-28] entries' mentions above; `scripts/validate/checks/figma-track-phase5.test.mjs`, `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`, `scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs`, and `scripts/validate/checks/plan-reviewer-validate-search-ambiguous-check.test.mjs` (all assert now-superseded verbatim numerals or heading counts against `plan-reviewer.md` — identified at merge time as needing `EXISTING_TEST_UPDATED` follow-up by the test-writer/test-reviewer pair, test-after per `docs/context/methodology.md` `tdd: false`, routed around `code-reviewer`'s universal R-X test-modification guard exactly as the test pair's own diff already is (`docs/decisions.md` [2026-07-10])); NOT `scripts/validate/checks/figma-track-ac2-reuse-enforcement.test.mjs`, which asserts `code-reviewer.md`'s own separate R-COH-* catalog and arithmetic, not `plan-reviewer.md`'s, and is therefore unaffected by this merge.

---

## [2026-07-30] Writers consume prior_feedback: a retry is a targeted revision, and plan-writer's grounding is one-shot per DRAFT

**Context:** Aggregating this repo's own review audit logs
(`PRPs/plans/*.jsonl`, 270 recorded runs on 2026-07-30) showed the
pipeline is effective but slow, and that the cost is concentrated in
rework: `plan-review` averages **1.66 runs per artifact** (77 artifacts
/ 128 runs; 49% fail on the first attempt), `code-review` **1.49**
(67/100; 34%), `test-write-review` **3.50** (12/42). The cause was a
severed feedback pipe: `prior_feedback` was computed and passed by
`commands/relay-execute.md` (8 references) and
`commands/relay-implement.md` (5 references), but consumed by ZERO
writer agents — `plan-writer.md`, `implementer.md`, `test-writer.md`
each had none — and `commands/relay-plan.md` /
`commands/relay-write-test.md` never forwarded it at all.
`relay-execute.md`'s own instruction to "re-adopt `/relay-plan` role
passing `prior_feedback`" therefore handed the value to a command that
did not declare it. Every retry regenerated its artifact from scratch,
blind to what had failed — and for `plan-writer` that included
re-dispatching the research subagents whose findings were already
written into the DRAFT. The HALT code `FAILED_PLAN_REVIEW_STUCK` ("same
rubric items fail across consecutive attempts") exists because this
blind loop was observed repeating identical failures.

**Decision:** Close the pipe for the three writer pairs with measured
churn. (1) `plan-writer`, `implementer`, and `test-writer` each declare
an optional `prior_feedback` input (canonical
`list<{rubric_id, reason}>` shape, matching `relay-implement.md`'s
existing dispatch) and carry a uniform `## Targeted revision mode`
section: when it is non-empty, correct only the cited rubric items and
leave the rest of the artifact byte-identical, instead of re-running the
full protocol. (2) `/relay-plan` (both its PRD-mode and description-mode
execution-context lists) and `/relay-write-test` declare and forward the
input. (3) `plan-writer`'s Phase 2 GROUNDING short-circuits on a retry,
reusing the DRAFT's own `## Patterns to Mirror` and `## Mandatory
Reading` — with a carve-out that re-runs the full dispatch when a cited
id is `R-COH-PATTERN-TASK-DRIFT`, `R-COH-PATTERN-SOURCE-MISSING`,
`R-COH-MANDATORY-READING-MISSING`, or
`R-COH-MANDATORY-READING-IRRELEVANT`, since there the grounding is
itself what was rejected. Two candidates were deliberately EXCLUDED:
**reviewer-side delta review** (re-validating only previously-failed
items) conflicts with the [2026-04-28] entries' no-short-circuit
invariant, which requires all rubric items to be *evaluated*, not merely
recorded — the invariant is preserved untouched and no reviewer file is
modified by this change; and **`docs-updater`**, whose pair shows zero
measured churn (a single `docs-review.jsonl`, 0 runs) and whose
`docs_prior_feedback` was deliberately removed from
`relay-implement.md`'s dispatch payload — reversing that without
evidence was declined.

**Reason:** The defect was a plumbing gap, not a rubric weakness, so the
fix belongs entirely on the writer side. Closing it reduces both the
number of retries (a writer that knows what failed can fix it) and the
cost of each (a targeted edit instead of a regeneration plus fresh
research), while every rubric item, budget, HALT code, and audit-logging
behavior stays byte-identical. Excluding delta review keeps the change
strictly additive to the audit guarantees rather than trading them for
speed. Excluding `docs-updater` keeps the change evidence-led: the two
included behaviors are the ones the logs actually justify.

**Areas affected:** `plugins/relay/agents/plan-writer.md`,
`plugins/relay/agents/implementer.md`,
`plugins/relay/agents/test-writer.md`,
`plugins/relay/commands/relay-plan.md`,
`plugins/relay/commands/relay-write-test.md`;
`/relay-execute` and `/relay-implement` as upstream callers (unmodified
— they already send the value); explicitly NOT
`plugins/relay/agents/plan-reviewer.md`, `code-reviewer.md`, or
`test-reviewer.md`. Two accepted verification gaps in the source plan,
plus a separate reviewer-non-determinism finding surfaced during its
review, are recorded as technical debt in
`docs/context/constraints.md` under "Known TODOs / open planning items".

---

## [2026-07-30] Writer pre-emission self-checks: authoring rules, never rubric restatement

**Context:** After v0.23.1 closed the `prior_feedback` pipe, the audit logs
still showed a 50% first-attempt failure rate on plans (39/78) and 34% on
implementations (23/67). v0.23.1 cannot move those numbers by construction —
`prior_feedback` is null on attempt 1, so it only reduces the cost of later
attempts. The first-attempt rate had a separate cause: every writer was graded
against rubric items its own protocol never mentioned. Of the six checks
causing 73% of the 97 recorded plan-review failures, `plan-writer.md` named
one; of the three causing 80% of the 44 code-review failures, `implementer.md`
named none (`R-SEM` appeared 24 times in `code-reviewer.md`, zero times in
`implementer.md`). The distribution being concentrated rather than diffuse is
what made a short targeted check plausible where a generic "review your work"
instruction would not be.

**Decision:** Each of `plan-writer`, `implementer`, and `test-writer` carries a
named pre-emission self-check covering only its own concentrated defect
classes, placed at the point where its authoring path and its
`## Targeted revision mode` revision path converge on the terminal write —
`plan-writer`'s new Step 4.4.ter before Step 4.5, `implementer`'s labelled
block at the top of Phase 4, `test-writer`'s existing lifecycle-ledger check
extended in place to two items. Three rules bind the design. (1) **Items state
artifact properties, never the reviewer's rubric wording** — showing a model
the criteria it is graded on measurably increases literal compliance that
satisfies the check while failing the goal, so an item says "every task names
an acceptance criterion it satisfies", not the id of the check that tests it.
Rubric ids are permitted only in the surrounding front-running prose. (2) **Each
check front-runs, never replaces** — the reviewer re-runs its full rubric
independently on every attempt, unchanged. (3) **`implementer`'s check is a
labelled block, not a `### Phase 4.` heading**, because a corpus test pins that
count at exactly two. All three rules are enforced mechanically by the
`feedback-chain` check, each assertion mutation-tested rather than merely
observed passing.

**Reason:** The measured cause was informational, not a rubric weakness, so the
fix belongs entirely on the writer side and no reviewer file is touched. The
phrasing prohibition is the mitigation the specification-gaming research
specifically recommends — state the underlying property and its intent rather
than the grader's wording — and it is why this is not simply "paste the rubric
into the writer", which would both invite gaming and inflate prompts whose
length already dilutes the instructions that matter. The line budget was
deliberately relaxed from "no growth" to "at most 2% growth" mid-implementation:
hitting zero would have required deleting the one worked exit-code example in
`plan-writer.md`, the concrete anchor that the same research says protects
against the gaming risk this entry exists to bound. Trading it for a
self-imposed number would have been metric-gaming of exactly the kind the
decision is meant to prevent.

**Areas affected:** `plugins/relay/agents/plan-writer.md` (new Step 4.4.ter;
`Cosmetic validation gates` anti-pattern collapsed to a cross-reference),
`plugins/relay/agents/implementer.md` (Phase 4 labelled block),
`plugins/relay/agents/test-writer.md` (lifecycle self-check extended to
ledger + coverage), `scripts/validate/checks/feedback-chain.mjs` (SELF_CHECKS
registry and its five assertions). Explicitly NOT
`plugins/relay/agents/plan-reviewer.md`, `code-reviewer.md`,
`code-reviewer-semantic.md`, or `test-reviewer.md` — no rubric item is added,
removed, reworded, or reweighted. The decisive follow-up is the first-attempt
failure rate itself: if it does not fall below about 35% after roughly ten new
artifacts, the self-refinement research that predicts marginal gains is the
better explanation than the concentration hypothesis, and the honest response
is to revert rather than add more checklist items.

---

## [2026-07-31] Reviewer jsonl timestamps are invoker-supplied (`review_started_at`), never agent-derived — rejects widening the clockless reviewers' `tools:` allowlist

**Context:** 128 of 284 recorded verdict entries (45.1%) across
`PRPs/plans/*.jsonl` carried a date-only `T00:00:00Z` timestamp instead of a
real UTC instant. Grounding traced this to clock availability, not wording:
four of the seven jsonl-appending reviewers — `plan-reviewer`, `prd-reviewer`,
`design-map-reviewer`, `design-spec-reviewer` — carry a `tools:` allowlist of
`Read, Edit, Write` (plus `Task` for `prd-reviewer`) with no way to observe
the current time, so `T00:00:00Z` was the honest output of an agent asked for
an instant it structurally could not obtain. `scripts/efficiency.mjs compare`
sorts artifacts by first verdict timestamp against a recorded release marker,
so a same-day artifact stamped at midnight sorts before a mid-day marker and
is silently miscounted as pre-change — this had already corrupted the
`v0.24.0` comparison. Two mechanisms were available to supply the missing
clock: grant `Bash` to the four clockless reviewers, or have each dispatching
command capture the instant and pass it in. Per D11 (`2026-04-29`, this file),
a reviewer's `tools:` line is a recorded capability contract, not an
incidental detail — widening it is itself a decision this file must record,
not a side effect of a bug fix.

**Decision:** The invoker-supplied mechanism was chosen over widening any
`tools:` allowlist. A new agent input, `review_started_at` — a full UTC
instant in `YYYY-MM-DDTHH:MM:SSZ` — is captured by each of the eight
dispatching commands (`relay-plan-review`, `relay-prd`, `relay-code-review`,
`relay-implement`, `relay-test-write-review`, `relay-approve`,
`relay-design-map`, `relay-design-spec`) via `date -u +%Y-%m-%dT%H:%M:%SZ`
immediately before each reviewer invocation, and passed into the reviewer's
execution context. The reviewer writes this value through verbatim into its
verdict's `timestamp` field — mirroring the `attempt`-is-verbatim-from-the-
COMMAND precedent already shipped in `code-reviewer.md`. `relay-implement.md`
captures a fresh instant at each of its three reviewer dispatch sites so
retries stay distinguishable. No reviewer's `tools:` allowlist changes as
part of this fix. When `review_started_at` is absent, the three Bash-capable
reviewers (`code-reviewer`, `test-reviewer`, `docs-reviewer`) self-serve
`date -u +%Y-%m-%dT%H:%M:%SZ` rather than fabricate a stamp; the four
clockless reviewers append the verdict anyway (never dropping the audit line)
with `"timestamp_degraded": true` added to that JSON object, so the gap stays
visible in the corpus rather than silent. Historic degenerate entries are
deliberately NOT repaired — the real instant was never observed and cannot be
reconstructed; the resulting analysis caveat is recorded in
`docs/context/constraints.md` (dated `2026-07-31` entry).

**Reason:** Granting `Bash` to four reviewers whose entire design rests on a
narrow, auditable, non-executing tool surface would have been a materially
larger and riskier change than the defect warranted, and it would have
silently expanded a capability contract this project has already decided
(D11) must be recorded and justified on its own terms — not incurred as a
side effect of a timestamp bug fix. Supplying the clock from the invoker
costs nothing in capability surface: the command process already has to run
before dispatching the reviewer, already has a shell, and already passes
other fields (e.g. `attempt`) through the same execution-context channel.
The self-serve fallback for the three Bash-capable reviewers exists because
prose alone had already failed for `code-reviewer` — it carried timestamp
prose since 2026-04-29 and still emitted degenerate stamps through
2026-07-29 — so compliance for those three no longer depends on the model
choosing to observe the clock. The `timestamp_degraded` fallback is
"no silent failure" applied to a data-quality gap: an invoker bug that drops
`review_started_at` becomes visible in the corpus instead of manifesting as
another undetectable `T00:00:00Z` stamp.

**Areas affected:** all seven jsonl-appending reviewer agents (`plan-reviewer`,
`prd-reviewer`, `code-reviewer`, `test-reviewer`, `docs-reviewer`,
`design-map-reviewer`, `design-spec-reviewer` — `post-green-reviewer` appends
no jsonl and is unaffected); all eight dispatching commands
(`relay-plan-review`, `relay-prd`, `relay-code-review`, `relay-implement`,
`relay-test-write-review`, `relay-approve`, `relay-design-map`,
`relay-design-spec`); `scripts/efficiency.mjs`'s consumer-side classification
(unblocked going forward, not retroactively); any future reviewer agent that
appends a jsonl verdict line, which must adopt the identical
`review_started_at` contract rather than inventing its own timestamp
mechanism.

---

## [2026-07-31] A `timestamp_degraded` entry excludes its artifact from before/after classification — rejects classify-with-a-warning

**Context:** The `timestamp_degraded` flag (recorded above) declares a
verdict entry's stamp a placeholder, but nothing consumed it:
`scripts/efficiency.mjs compare` classified every artifact by its first
verdict's raw timestamp regardless of the flag, so a flagged midnight
stamp still silently sorted a post-marker artifact into the BEFORE set —
the exact miscount the flag exists to make visible, now merely labelled
rather than fixed. Reproduced concretely: the one genuinely degraded
corpus entry (`add-an-11th-static-check-to-scriptsvalidate-that.review.jsonl`)
was reviewed after the `v0.25.0` marker but counted as pre-change,
producing the drift `plan-review: snapshot recorded 81 artifacts,
recomputed 82`.

**Decision:** An artifact with ANY entry carrying `timestamp_degraded:
true` is UNCLASSIFIABLE and is excluded from both the before and after
sets, mirroring the existing `undated` bucket exactly — the same idiom
for "no usable timestamp, excluded from both sides, count reported" is
reused rather than inventing a second doubt-signalling mechanism. A new
`WARNING -` line, distinct from the `undated` warning, names every
excluded artifact file so the exclusion is visible rather than merely
absent from the totals. `timestamp-contract.mjs` additionally gained a
`CONSUMERS` registry asserting that `scripts/efficiency.mjs` references
`timestamp_degraded` in executable code (comments stripped), gating the
consumer end of the contract the same way the existing `REVIEWERS`/
`COMMANDS` registries gate the producer end.

**Reason:** The rejected alternative was classify-with-a-warning — keep
the artifact in its time-based bucket and merely print a caution next to
it. That was rejected because it keeps a known-wrong number in the
headline metric and relies on the reader to discount it every time,
which is exactly what this tool's existing small-sample and drift
cautions already exist to avoid; exclusion instead makes the number
itself correct and pushes the caveat into a named, unmissable warning.
Over-exclusion is the safe direction here — a shrinking sample is
visible and directional, while a silently-wrong classification is not.
No partially-sound refinement (e.g. "classify as BEFORE when some real
entry predates the marker") was adopted either: it would only sharpen
the already-approximate BEFORE side, never the scarce AFTER side, and
was judged not worth the added complexity.

**Areas affected:** `scripts/efficiency.mjs` (`readCorpus`,
`classifyArtifacts`, `doCompare`); `scripts/validate/checks/timestamp-contract.mjs`
(`CONSUMERS` registry); `docs/context/constraints.md` (the 2026-07-31
degenerate-timestamp entry's stale "silently counted as pre-change"
consequence, now corrected); `.claude/commands/efficiency-report.md`
(step 2's warning enumeration). The 128 historic, unflagged
`T00:00:00Z` entries are unaffected — they carry no flag and remain
classified, subject only to the pre-existing day-apart-boundaries
caveat.

---

## [2026-08-03] `R-COH-VALIDATE-FRAMEWORK-MISMATCH` gains a condition-based test-pair-deferral exemption — rejects widening the `phase_type` list to `refactor`

**Context:** `/relay-execute` on `PRPs/prds/figma-quota-resilience.prd.md`
Phase 1 (Resource packaging) failed `R-COH-VALIDATE-FRAMEWORK-MISMATCH`
on two consecutive `plan-reviewer` runs while R1–R8 passed 8/8 both
times. The phase `git mv`s 8 plugin-owned resources out of
`docs/context/`, which invalidates 55 hardcoded path constants across 8
`*.test.mjs` files. Those constants cannot be repaired in the same diff:
`code-reviewer`'s R-X is a blanket straight-fail on any test glob in the
Implementer's diff ([2026-05-06], [2026-07-10]). The plan correctly
routed them to the `test-writer`/`test-reviewer` pair in test-after
mode, documented the temporary-red window in its Risks table, and
therefore correctly kept `node --test` out of its own Level 1–3 gates —
which is exactly what the check flagged. The reviewer named the item
"not resolvable by `plan-writer`" both times, and the two existing
exemption branches did not cover it: `test_frameworks` is non-empty
(so the silent-degradation branch does not fire) and `phase_type` is
`refactor` (so the `{scaffold, docs, foundation}` branch does not fire).
The loop was structurally guaranteed to exhaust its budget.

**Decision:** A third exemption branch was added to
`R-COH-VALIDATE-FRAMEWORK-MISMATCH`, keyed on a **condition** rather
than on `phase_type`. The check emits `passed: true` when BOTH hold:
(1) the plan documents in `## Notes` or `## NOT Building` that its
test-file updates are routed through the test pair's lifecycle ledger
rather than authored by the Implementer, AND (2) no task in
`## Step-by-Step Tasks` actually touches a test file. Both conditions
are mandatory — the documented deferral alone is never sufficient,
because a plan that claims deferral while also editing a test file is
making a false claim and must still face the framework requirement.
Condition 2 is what makes the claim verifiable rather than
self-asserted.

**Reason:** Adding `refactor` to the `phase_type` list was considered
and rejected: the operative fact is "this phase's tests belong to a
later stage", not "this phase is a refactor", and a blanket `refactor`
exemption would also excuse refactors that genuinely should run the
framework — widening the hole well past the case that motivated it.
Relabelling the phase's `phase_type` to `scaffold`/`docs`/`foundation`
to satisfy the existing list was rejected outright as a false
declaration in an artifact downstream stages trust. Accepting the plan
under a one-off documented waiver was rejected because the same PRD's
Phase 4 has the identical shape (it rewrites rubric-count assertions
through the test pair), so the false positive would recur immediately.
The deeper principle this records: when R-X forces a phase's test
updates into a later stage, requiring a test-framework VALIDATE in that
phase forces the plan to assert a red state as if it were green — a
worse defect than the one the check exists to catch.

**Areas affected:** `plugins/relay/agents/plan-reviewer.md`
(`R-COH-VALIDATE-FRAMEWORK-MISMATCH` third exemption branch). The
check's `rubric[]` arithmetic is unchanged — it still emits exactly one
row per run, so no count assertion moves.

---

<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
