# `/relay-qa-report` Command

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new plugin command file (cross-cutting artifact consumed by the
  operator's human-validation workflow and referenced by documentation); adds a new command role
  category; impacts command surface, plugin manifest, and all documentation surfaces
- Decisions found:
    • 2026-04-19 Command surface: one command per stage; writer/reviewer split only for
      non-deterministic authoring steps — /relay-qa-report uses LLM judgment but has NO
      writer/reviewer pair (the human doing manual QA is the validator)
    • 2026-04-19 PRP artifacts live under PRPs/, never under .claude/ — report output at
      PRPs/reports/<feature>/qa-report.md; command file at plugins/relay/commands/; PRD at PRPs/prds/
    • 2026-04-19 Test Runner reports live under PRPs/reports/<feature>/ — the QA report co-locates
      with and references run.json / record.json rather than duplicating final-report.md
    • 2026-04-30 Plugin manifest version bump on every minor/major release that ships a plugin
      asset — relay-qa-report.md is a new plugin asset requiring a version bump in plugin.json
    • 2026-04-19 .claude/settings.json allowlist: narrow patterns — git status*, git diff* already
      present in docs/context/settings-allowlist.md; the command only reads the diff, no new
      patterns needed
- Applicable anti-patterns:
    • Writing pipeline artifacts under .claude/ — command file goes to plugins/relay/commands/;
      report to PRPs/reports/<feature>/; PRD to PRPs/prds/; no .claude/ writes
    • Weakening/hiding coverage to look green — the report MUST surface cases covered by neither an
      automated nor a manual test explicitly; hiding a gap is the forbidden pattern this command
      exists to counter (honesty requirement)
    • Activating the test pair by heuristic — /relay-qa-report never runs, authors, or modifies
      tests; it only reports observed coverage. It must not activate any test pair.
- Applicable architectural rules:
    • One command per stage; /relay-qa-report is a new human-facing QA/Support command living in the
      human validation gate between Pillar 2 (/relay-execute) and Pillar 3 (/relay-commit)
    • Interactivity boundary — the command is invoked by the human in the validation gate; it is not
      part of the autonomous loop and must not be called by /relay-execute
    • documentation/ three-file registration rule (NAV + search-index + changelog) + plugin.json bump
      for any new command page (documentation/AGENTS.md)
- Result: PROCEED
```

## Problem Statement

After `/relay-execute` (or a manual implementation session) completes, the operator must validate
the work by hand before committing — manual testing is always required, no matter how reliable the
AI is. Today there is no single artifact that says which automated tests were created, what they
cover, what still needs manual testing, and what is covered by nothing at all. The operator has to
reconstruct this from the conversation and the diff every time, so manual QA is ad-hoc, un-traceable,
and real coverage gaps slip through unnoticed.

## Evidence

- The maintainer already reconstructs this report by hand after every executed PRD: *"Estou sempre
  pedindo para a IA criar esse relatório após a execução de um PRD para me ajudar a fazer o teste
  manual e entender qual o estado real da aplicação"* — a recurring manual workflow is the direct
  signal for a first-class command.
- The `architecture.md` interactivity boundary formalizes a **human gate before Pillar 3**: *"after
  `/relay-execute` completes, the human reviews the result and performs any manual testing before
  triggering Pillar 3"* (`docs/context/architecture.md:79-81`) — the QA report is the missing tool
  for that gate.
- The existing Test Runner report captures only `failures[]` plus aggregate pass/fail/skip counts
  (`docs/context/test-output-schema.md:162-191`); there is no enumerated, per-case list mapping
  each case to automated vs. manual vs. no coverage — that mapping must be produced.
- Industry QA practice (ISO/IEC/IEEE 29119-3, which supersedes IEEE 829; ISTQB) formalizes exactly
  this artifact as a requirements-traceability matrix with a verification-method field and forward
  traceability whose stated purpose is to make coverage gaps visible — validating both the shape and
  the honesty requirement of this feature.

## Proposed Solution

A command file `plugins/relay/commands/relay-qa-report.md` — a single, LLM-judgment command (no
writer/reviewer pair; the human performing manual QA is the validator) that generates a human-facing
QA support report and writes it to `PRPs/reports/<feature>/qa-report.md`. A **Phase 0 routing step**
resolves four input modes by argument shape:

- `.prd.md` path → **PRD mode**; derive test cases from the PRD's Acceptance Criteria. `<feature>` =
  PRD basename.
- `.plan.md` path → **plan mode**; derive cases from the plan's tasks/validation. `<feature>` = the
  `<feature>` segment of the plan filename.
- non-empty free text → **description mode**; treat the argument as scope. `<feature>` = current git
  branch slug (strip a `feature/` prefix), falling back to a kebab slug of the description.
- blank → **diff mode**; derive cases from everything uncommitted on the current branch (via
  `git status --porcelain` + `git diff`). `<feature>` = current branch slug. A clean working tree
  HALTs with `FAILED_NOTHING_TO_REPORT`.

The report enumerates test cases. Each entry carries seven fields: **title**, **risk level**
(Critical/High/Medium/Low), **required state** (which DB entities with which values are needed to
run it), **coverage** (automated / manual / none), **automated test path**, **manual test status**
(every entry starts `pending`), and a brief **step-by-step** for the manual test. A single test
(automated or manual) may cover multiple cases (n:1) — not every case needs a dedicated test, and
less-critical cases may be left uncovered. The command is **honest**: any case covered by neither an
automated nor a manual test appears explicitly marked as uncovered, never omitted. When
`PRPs/reports/<feature>/record.json` from a prior Test Runner run exists, the command reads it to
ground the automated-coverage column instead of re-deriving; otherwise it infers coverage from the
repo's test files and is explicit about what it could not confirm. Iterative updates (marking a
manual test as passed after the operator tests it) are done conversationally — the command's job is
one-shot generation, and it will not silently overwrite an existing report.

## Key Hypothesis

We believe that generating an honest, structured QA report on demand will make manual testing faster
and more reliable and will expose coverage gaps that today go unnoticed — for the maintainer in the
gate between `/relay-execute` and Pillar 3.
We'll know we're right when the command consistently produces a correct, complete report at
`PRPs/reports/<feature>/qa-report.md` without the operator having to hand-author or re-run it.

## What We're NOT Building

- **Running, authoring, or modifying tests** — the command only *reports* coverage; it never
  executes a suite or writes a test (that is the Test Runner / test pair's domain)
- **A writer/reviewer pair** — the human doing manual QA is the validator; a reviewer agent adds no
  value and contradicts the single-command shape
- **CI / automated gating** — this is an explicitly manual step in the human validation gate; it is
  not invoked by `/relay-execute` and does not block any pipeline
- **A command-driven update mode** — marking manual tests passed / preserving statuses across a
  regenerate is deferred (Should/Could). MVP generation is one-shot; updates are conversational
- **Replacing the Test Runner's `final-report.md`** — that is the PR-embedded automated summary;
  the QA report is a complementary human manual-testing companion
- **Team-scale QA tooling** — the target is a single maintainer; multi-tester assignment, sign-off
  workflows, and defect-tracker integration are out of scope
- **End-user documentation** — the report is an internal engineering artifact

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Structural conformance | 100% of generated reports contain all 7 required fields for every test entry | Inspection of the generated `qa-report.md` |
| Coverage honesty | Every case with neither automated nor manual coverage appears explicitly marked "uncovered" (0 hidden gaps) | Manual review of the report against the diff / Acceptance Criteria |
| Automated-path fidelity | 100% of cited automated-test paths resolve to a real file in the repo (0 fabricated paths) | Verify each cited path exists |
| Right place, first try | 100% of invocations write to `PRPs/reports/<feature>/qa-report.md` with no re-run for a malformed report | Operator observation during dogfood |

## Acceptance Criteria (test scenarios)

- **AC-1 PRD-mode generation:** Given a valid `<name>.prd.md` path with an Acceptance Criteria
  section, when `/relay-qa-report <path>` is invoked, then a report is written to
  `PRPs/reports/<name>/qa-report.md` enumerating at least one test entry per derived case, and the
  output names the written path.

- **AC-2 plan-mode generation:** Given a valid `<feature>-phase-<N>-<slug>.plan.md` path, when
  `/relay-qa-report <path>` is invoked, then the report is written to
  `PRPs/reports/<feature>/qa-report.md` with cases derived from the plan's tasks and validation
  commands.

- **AC-3 blank → uncommitted diff, with clean-tree HALT:** Given no argument and a dirty working
  tree, when `/relay-qa-report` is invoked, then cases are derived from the uncommitted diff and the
  report is keyed on the current branch slug; and given a clean working tree, the command HALTs with
  `FAILED_NOTHING_TO_REPORT` and creates no file.

- **AC-4 seven-field schema:** Given any generated report, when it is inspected, then every test
  entry contains all seven fields — title, risk level, required state (DB entities + values),
  coverage (automated/manual/none), automated test path, manual status, and a manual step-by-step.

- **AC-5 coverage honesty:** Given a case covered by neither an automated nor a manual test, when
  the report is generated, then that case appears explicitly marked as uncovered — never silently
  omitted.

- **AC-6 automated-path fidelity:** Given a case mapped to an automated test, when the report cites
  the automated test path, then that path resolves to a real file in the repo; and given the command
  cannot confirm automated coverage, then it marks the entry as unverified rather than inventing a
  path.

- **AC-7 manual status default:** Given any test entry with a manual test, when the report is first
  generated, then that entry's manual status is `pending`.

- **AC-8 n:1 mapping:** Given multiple cases covered by a single test, when the report is generated,
  then one automated or manual test may be mapped to several cases (no forced 1:1) and less-critical
  cases may be left without a dedicated test.

- **AC-9 anti-overwrite:** Given an existing `PRPs/reports/<feature>/qa-report.md`, when
  `/relay-qa-report` is invoked for that feature, then the command does not silently overwrite it —
  it HALTs asking the operator to confirm (or pass an explicit override) so previously recorded
  manual statuses are not lost.

- **AC-10 docs + documentation registration:** Given the command ships, when the documentation is
  inspected, then `/relay-qa-report` appears in `docs/api-reference.md` (command table + updated
  count) and has a rendered `documentation/` reference page registered in all three required places
  (NAV, search index, changelog) per `documentation/AGENTS.md`.

## Open Questions

- [ ] Exact name of the new command role category — "QA / Support" is the working title for the
  `docs/api-reference.md` taxonomy bucket.
- [ ] Should a `--force` (overwrite) flag ship in the MVP, or is the AC-9 HALT-and-confirm sufficient
  until the preserve-statuses update mode is built? (Could-item — deferred to implementation.)
- [ ] Should `<feature>` derivation in description/diff mode prefer the branch slug or a slug of the
  description when both are available and disagree? (Current position: branch slug wins; fall back to
  description slug only when the branch is detached or generically named.)

---

## Users & Context

**Primary User**
- **Who:** the relay maintainer acting as human QA in the validation gate between `/relay-execute`
  and Pillar 3
- **Current behavior:** manually asks the AI, once per executed PRD, to reconstruct a coverage
  report from the conversation and the diff so they can drive manual testing
- **Trigger:** a PRD/feature implementation completes and the maintainer needs to test it by hand
  before committing
- **Success state:** a correct, honest `qa-report.md` exists at `PRPs/reports/<feature>/`, ready to
  drive manual QA

**Job to Be Done**
When I finish executing a PRD/feature and need to validate it by hand, I want an honest report that
enumerates each test case with its coverage (automated/manual/none), the DB state it needs, and a
manual step-by-step, so I can conduct manual testing efficiently and see the real coverage gaps.

**Non-Users**
- Automated CI agents — the command is an explicitly manual step in the human validation gate; CI
  invocation is out of scope
- `/relay-execute` itself — the orchestrator runs autonomously and must not call this human-gate
  command
- End users and multi-tester QA teams — the report is a single-maintainer internal artifact

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Phase 0 four-way routing: `.prd.md` / `.plan.md` / free-text / blank→diff | The feature explicitly needs all four input shapes |
| Must | Derive `<feature>` per mode and write to `PRPs/reports/<feature>/qa-report.md` | Co-locates with the Test Runner report; honors the PRPs/ artifact convention |
| Must | Seven-field schema per test entry | The exact contract the operator asked for |
| Must | Manual status defaults to `pending` for every entry | Well-defined starting state for the manual pass |
| Must | Honesty: cases with no automated and no manual coverage listed explicitly as uncovered | Core purpose — surface gaps, never hide them |
| Must | n:1 mapping — one test may cover many cases; low-criticality cases may be uncovered | Matches RTM practice and the operator's stated intent |
| Must | Clean-working-tree HALT in diff mode (`FAILED_NOTHING_TO_REPORT`) | Nothing to report on an empty diff |
| Must | Anti-overwrite guard for an existing report | Protects manual statuses already recorded |
| Should | Read `PRPs/reports/<feature>/record.json` to ground the automated-coverage column when present | Reuses Test Runner output instead of duplicating it |
| Should | Emit an output block naming the written path and a per-risk case count | Operator confirmation and next-step guidance |
| Could | `--force` flag to overwrite an existing report | Power-user escape hatch |
| Could | Update mode that regenerates automated coverage while preserving recorded manual statuses | The iterative workflow, promoted from conversational to command-driven |
| Won't | Run, author, or modify any test | The command only reports coverage |
| Won't | Writer/reviewer split, or any reviewer agent | Human manual QA is the validator |
| Won't | CI gating / invocation by `/relay-execute` | Manual human-gate command only |

### MVP Scope

A single command file `plugins/relay/commands/relay-qa-report.md` implementing Phase 0 four-way
routing, `<feature>` derivation, the seven-field report schema written to
`PRPs/reports/<feature>/qa-report.md`, honest uncovered-case listing, the diff-mode clean-tree HALT,
and the anti-overwrite guard — plus the docs and documentation-site registration for the new command.

### User Flow

1. Operator runs `/relay-execute <prd-path>` (or implements manually) → work completes
2. Operator runs `/relay-qa-report [<prd-path> | <plan-path> | <description> | (blank)]`
3. Phase 0 resolves the mode and derives `<feature>`
4. Command gathers inputs: the PRD/plan/diff cases, plus `PRPs/reports/<feature>/record.json` if
   present, plus the repo's test files for coverage inference
5. Command HALTs if the working tree is clean (diff mode) or a report already exists (anti-overwrite)
6. Command writes `PRPs/reports/<feature>/qa-report.md` with one entry per case, all seven fields,
   manual statuses `pending`, and uncovered cases listed explicitly
7. Output names the written path and a per-risk case count
8. Operator drives manual testing; as tests pass, asks the AI conversationally to update statuses and
   fix code as needed

---

## Technical Approach

**Feasibility:** HIGH — a markdown command reusing established patterns (`relay-commit` current-branch
diff review, `relay-plan` suffix routing, the Test Runner report schema, and the documentation
three-file registration rule). No new dependencies, no new settings-allowlist entries.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test
framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from
the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no
tests are authored. For the relay repo itself `test_frameworks: []`, so no automated tests are
authored for this markdown feature — the Acceptance Criteria are validated by dogfood inspection
(Phase 4).

### Architecture Notes

- Command file at `plugins/relay/commands/relay-qa-report.md` — relay command markdown with YAML
  frontmatter (`description`, `argument-hint: '[prd-path | plan-path | description] (blank = uncommitted diff)'`);
  no `allowed-tools` key (relay commands are prose protocols the invoking session executes inline)
- Phase 0 routing composes the `relay-plan.md:47` suffix test (`.prd.md` / `.plan.md`) with the
  `relay-commit.md:181` current-branch diff-review fallback for the blank case
- HALT idiom follows `relay-pr.md:33` — verbatim `FAILED_<REASON>:` blockquotes with remediation
  (`FAILED_NOTHING_TO_REPORT`, and an anti-overwrite HALT)
- Automated-coverage grounding: read `PRPs/reports/<feature>/record.json` (schema v1: per-failure
  suite/test/file/line/message/category + passed/failed/skipped counts) when present; else infer from
  repo test files and mark unconfirmed coverage honestly
- Report is a markdown table (or per-entry sections) — one row/section per case with the seven fields;
  risk scale Critical/High/Medium/Low (probability × severity per risk-based-testing convention)
- Read-only over git (`git status`, `git diff`) — patterns already in
  `docs/context/settings-allowlist.md`; no new allowlist entries

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hallucinated automated coverage (citing a test path that does not exist) | M | Every cited automated-test path must resolve to a real file; unconfirmed coverage is marked unverified, never invented (AC-6) |
| Ambiguous `<feature>` derivation in description/diff mode (detached/generic branch) | M | Prefer the branch slug; fall back to a description slug; HALT and ask if indeterminable |
| Docs / rendered-site drift (orphan page, stale command count) | L | The three-file registration rule + `plugin.json` bump are a dedicated implementation phase with an explicit checklist |
| Silent overwrite of a report holding recorded manual statuses | M | Anti-overwrite HALT (AC-9); overwrite only via an explicit future `--force` |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Command file | Author `plugins/relay/commands/relay-qa-report.md` — Phase 0 four-way routing, `<feature>` derivation, seven-field report schema, honest uncovered-case listing, `record.json` grounding, clean-tree + anti-overwrite HALTs | complete | - | - | PRPs/plans/relay-qa-report-command-phase-1-command-file.plan.md |
| 2 | Canonical docs | Update `docs/api-reference.md` (new "QA / Support" category + command count 14→15) and `docs/context/architecture.md` (command count + role taxonomy + happy-path note) | complete | - | 1 | PRPs/plans/relay-qa-report-command-phase-2-canonical-docs.plan.md |
| 3 | Documentation site + plugin bump | Add a `documentation/` reference page; register it in all three places (NAV in `assets/js/app.js`, `assets/data/search-index.json`, `changelog.html`); bump `plugins/relay/.claude-plugin/plugin.json` | complete | - | 1 | PRPs/plans/relay-qa-report-command-phase-3-documentation-site-plugin-bump.plan.md |
| 4 | Dogfood | Run `/relay-qa-report` against a real executed PRD's `PRPs/reports/<feature>/` and validate AC-4/AC-5/AC-6 (schema, honesty, path fidelity) | complete | - | 1 | PRPs/plans/relay-qa-report-command-phase-4-dogfood.plan.md |

### Phase Details

**Phase 1: Command file**
- **Goal:** Produce `plugins/relay/commands/relay-qa-report.md` with a complete, unambiguous protocol
- **Scope:** Single command file; no agents, hooks, or scripts; Phase 0 routing + report schema +
  HALT preconditions
- **Success signal:** File exists; a human reads the protocol and finds no ambiguity; all Acceptance
  Criteria AC-1..AC-9 are addressable from the protocol text

**Phase 2: Canonical docs**
- **Goal:** Reflect the new command in the tier-1/2 canonical docs
- **Scope:** `docs/api-reference.md` (category + count), `docs/context/architecture.md` (count +
  taxonomy + happy-path)
- **Success signal:** api-reference lists `/relay-qa-report` under a "QA / Support" bucket; the
  command count is consistent across both files

**Phase 3: Documentation site + plugin bump**
- **Goal:** Ship the rendered reference page and version the release
- **Scope:** New `documentation/` page; three-file registration; `changelog.html` entry; `plugin.json`
  version bump
- **Success signal:** No orphan page (page appears in NAV + search index); `changelog.html` has a
  versioned entry matching `plugin.json`; `documentation/AGENTS.md` checklist passes

**Phase 4: Dogfood**
- **Goal:** Validate the honesty and fidelity guarantees on a real feature
- **Scope:** One run against an existing `PRPs/reports/<feature>/`; inspect the output
- **Success signal:** Generated report satisfies AC-4 (all 7 fields), AC-5 (uncovered cases explicit),
  and AC-6 (all cited automated paths resolve)

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Output path | `PRPs/reports/<feature>/qa-report.md` | `docs/reports/` (initial ask) | Aligns with the binding "PRP artifacts under PRPs/, never elsewhere" decision (`docs/decisions.md:263`) and co-locates with the Test Runner report it references; avoids a conscious divergence. Operator confirmed the switch during authoring |
| Command shape | Single command, LLM judgment, no writer/reviewer pair | Deterministic infra (no LLM); writer/reviewer pair | Enumerating cases and assessing risk needs judgment, but the human performing manual QA is the validator — a reviewer agent adds no value |
| Role taxonomy | New "QA / Support" category in api-reference | Force-fit into Infrastructure or Writers | The command is neither a pipeline-artifact writer, a reviewer, nor a Pillar 3 step; a new bucket keeps the taxonomy honest |
| Argument dispatch | Four-way: `.prd.md` / `.plan.md` / description / blank→diff | Two-way, like existing commands | The feature explicitly needs all four input shapes; Phase 0 composes `relay-plan`'s suffix test with `relay-commit`'s diff fallback |
| Update behavior (MVP) | One-shot generation; iterative status updates done conversationally; anti-overwrite guard | Command update-mode preserving manual statuses | Keeps MVP simple; success is scoped to generation; preserving statuses on regenerate deferred to Should/Could |
| Automated-coverage source | Read `record.json` when present; else infer from repo test files | Always re-run tests; or ignore Test Runner output | Avoids duplicating the Test Runner; honest degradation when artifacts are absent |
| Risk scale | Critical / High / Medium / Low | Numeric probability × severity score | Four named tiers are the common risk-based-testing convention and are readable in a manual-QA companion doc |

---

## Research Summary

**Market Context**

QA test documentation is formalized by ISO/IEC/IEEE 29119-3:2013 (which supersedes IEEE 829) and the
ISTQB glossary; the structure the operator described maps almost 1:1 onto a requirements-traceability
matrix (RTM). A widely-cited RTM converges on a seven-column core (requirement id/description, test
case id/description, test status as a fixed enum — Pass/Fail/Blocked/Not Run — defect id, coverage
status) and a distinct **verification-method** field that records manual vs. automated validation
(testrail.com/blog/test-coverage-traceability). Forward traceability exists explicitly to *make
coverage gaps visible* — validating the honesty requirement. Risk-based prioritization computes risk
as probability × severity, commonly bucketed into four tiers (guru99.com/risk-based-testing). A common
convention points the "test case id" column at the automation script name/path, and RTMs are
inherently n:1 (one test may satisfy several requirements) — supporting "one test covers many cases".
Sources address team/enterprise tooling; the single-developer, post-AI-implementation workflow is
inferred, not directly evidenced (research gap).

**Technical Context**

`plugins/relay/commands/relay-commit.md:1-4` — command frontmatter shape (`description` +
`argument-hint`, no `allowed-tools`); `relay-commit.md:181-224` — the current-branch mode is the
direct precedent for the blank→uncommitted-diff fallback (`git status --porcelain`, `git diff`).
`plugins/relay/commands/relay-plan.md:47-68` — Phase 0 mode detection by suffix, the closest analog
for multi-way routing. `plugins/relay/commands/relay-pr.md:33-56` — the `FAILED_<REASON>:` HALT idiom.
`docs/decisions.md:263-266` — the binding "all pipeline artifacts under PRPs/, never elsewhere"
decision (a grep for `docs/reports` returns zero matches), which drove the output-path decision.
`docs/context/test-output-schema.md:162-191` — the existing Test Runner report artifacts (`run.json`,
per-attempt `record.json` schema v1, `final-report.md` via `scripts/generate-final-report.mjs`) the QA
report reads/references rather than duplicating. `documentation/AGENTS.md:239-285` — the binding
three-file registration rule (NAV + search index + changelog) plus the `plugin.json` version bump.
`docs/api-reference.md:17-22` — the "14 commands" count and role taxonomy the new command extends;
the command does not fit an existing role bucket, so a new "QA / Support" category is added.

---

*Generated: 2026-07-12*
*Approved: 2026-07-12*
*Status: APPROVED*
