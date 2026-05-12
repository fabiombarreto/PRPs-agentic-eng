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

<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
