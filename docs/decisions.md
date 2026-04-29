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

<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
