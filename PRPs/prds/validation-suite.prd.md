# Validation Suite (relay self-test)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting repo tooling that reads plugins/relay/, docs/, documentation/, scripts/, and PRPs/; introduces the repo's first build/lint/test surface
- Decisions found:
  - [2026-04-19] PRP artifacts live under PRPs/, never under .claude/ — this PRD and all pipeline artifacts obey it; the suite's own code lives at repo root (package.json, scripts/validate/, .githooks/), which are dev tooling, not pipeline artifacts.
  - [2026-04-19] plugins/prp-core/ is reference, not active relay code — the suite MUST scope every structural check to plugins/relay/ and never flag prp-core/ as if it were relay surface.
  - [2026-04-19] Marketplace single-plugin; both manifests versioned — the version-parity check enforces plugin.json.version == latest changelog release.
  - [2026-04-19] One command per stage, writer/reviewer split — the registration check depends on this command/agent surface being enumerable.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — respected: the suite writes nothing under .claude/; the pre-commit hook is wired via git core.hooksPath (git config), and validation reports via exit code / stdout.
  - "Treating plugins/prp-core/ as active relay code" — respected as a hard scoping constraint on every check.
- Applicable architectural rules:
  - Manifests versioned; prp-core external to the relay surface; artifacts under PRPs/.
  - Note (evolution, not conflict): CLAUDE.md and docs/context/architecture.md currently state "There are no build, lint, or test commands." This feature evolves that characterization; the docs must be updated post-merge (Docs Updater).
- Result: PROCEED
```

## Problem Statement

The `relay` repository is a Claude Code marketplace + plugin made almost entirely
of Markdown prompts and JSON config, with no runtime source code. Its correctness
therefore lives in **consistency invariants and cross-reference integrity** —
which today rot silently because nothing verifies them. There is no build, lint,
or test command, so a rename or edit can leave dead references, out-of-sync
indexes, and drifted contracts that ship undetected until the plugin misbehaves
in a user's environment.

## Evidence

- **Five live "holes" in the current tree** (found during grounding, with
  `file:line`):
  1. Stale command names `relay-tdd` / `relay-tdd-review` (renamed to
     `relay-write-test` / `relay-test-write-review`) persist across 9
     `documentation/` pages plus `docs/api-reference.md` and `docs/decisions.md`.
  2. `documentation/assets/data/search-index.json` lists only 9 commands, missing
     at least `relay-execute`, `relay-plan-review`, `relay-code-review`,
     `relay-worktree`, `relay-write-test`, `relay-test-write-review` — a direct
     violation of the three-file registration rule (`documentation/AGENTS.md` §6).
  3. `docs/api-reference.md:120` cites `scripts/normalize-test-output.py`; the
     file is `.mjs`.
  4. A mis-named artifact `...rename-behavior-preserving.plan.review.jsonl`
     doubles the `.plan` segment next to the correctly-named sibling.
  5. `worktree-bootstrap.sh`/`.ps1` parity: `relay-worktree` looks for either,
     but the context-builder only emits the `.sh` variant.
- **HALT-code drift** between command frontmatter and command body (e.g.
  `relay-worktree` emits `FAILED_EMPTY_SLUG` undeclared; `relay-pr` emits ~6
  codes beyond its frontmatter list).
- **Written-but-unenforced contracts:** the three-file registration rule
  (`documentation/AGENTS.md` §6) and the plugin.json↔changelog version-sync rule
  (`documentation/AGENTS.md` §7.5) are binding prose today with no machine check.

## Proposed Solution

Ship a two-layer, Node/ESM self-test suite for the `relay` repo:

1. **Static validation (`npm run validate`)** — a deterministic, dependency-light
   harness (`scripts/validate/`) that runs a set of consistency checks over
   `plugins/relay/`, `docs/`, `documentation/`, and `PRPs/`, returning a non-zero
   exit code with a named failing check and offending `file:line` on any
   violation. Wired into a local pre-commit hook (git `core.hooksPath .githooks`)
   so violations block the commit. Chosen over ad-hoc scripts because the
   invariants are already written contracts (`AGENTS.md`) that only need
   mechanical enforcement.
2. **Behavioral evals (`npm run eval`)** — an on-demand [promptfoo](https://www.promptfoo.dev)
   suite that asserts the reviewer agents produce the right verdict on golden
   fixtures, reusing the clean/dirty fixtures that already exist under
   `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/{clean,dirty}/`.

Node/ESM is chosen for parity with the existing `scripts/*.mjs` and because
promptfoo is Node-native.

## Key Hypothesis

We believe a deterministic static-validation harness plus verdict-level evals
will catch the class of consistency/cross-reference rot that currently escapes
manual review, for the maintainer and contributors of `relay`.
We'll know we're right when `npm run validate` detects all five known holes on
the current tree, exits 0 once they are fixed, and blocks any commit that
reintroduces a violation — and `npm run eval` classifies the clean fixture as
APPROVED and the dirty fixture as CHANGES_REQUESTED.

## What We're NOT Building

- **CI / GitHub Actions** — out of MVP; execution is local (pre-commit +
  manual). The repo is a fork and Phase 5 (CI/CD) is not started; CI is deferred.
- **Headless (`claude -p`) evals** — MVP uses the promptfoo→API approximation of
  reviewer agents; running the agents in the real Claude Code runtime is deferred.
- **A Python layer** — the suite is Node/ESM only.
- **HALT-code coverage check and external link-checking / markdownlint** — known
  valuable checks, deferred to a follow-up (Could).
- **Validating `plugins/prp-core/`** — prp-core is upstream reference, explicitly
  out of the relay surface; checks never flag it.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Known holes detected on current tree | 5 / 5 | Run `npm run validate` on HEAD before fixes; count distinct checks firing on holes #1–#5 (the A–G checks cover #1–#4; the `.sh`/`.ps1` parity check P covers #5) |
| `npm run validate` wall-clock | < 5 s | Time the runner on a clean tree (pre-commit must stay snappy) |
| False positives on `plugins/prp-core/` | 0 | Inspect validate output; no prp-core file is ever flagged |
| Eval fixture classification | clean → APPROVED, dirty → CHANGES_REQUESTED | `npm run eval` report over test-reviewer fixtures |

## Acceptance Criteria (test scenarios)

- **AC-1 validate runner exists and fails loud:** Given a seeded inconsistency
  (e.g. `plugin.json.version` ≠ latest `changelog.html` release), when
  `npm run validate` runs, then it exits non-zero and prints the failing check
  name plus the offending `file:line`.
- **AC-2 green on a consistent tree:** Given a tree with holes #1–#5 fixed, when
  `npm run validate` runs, then it exits 0 with no findings.
- **AC-3 version parity (check B):** Given `plugin.json` version X and the latest
  `documentation/changelog.html` `<h2>` release Y with X ≠ Y, when validate runs,
  then the version-parity check fails naming both X and Y.
- **AC-4 three-file registration (check C):** Given a command in
  `plugins/relay/commands/` absent from `search-index.json` (or the NAV in
  `assets/js/app.js`, or `changelog.html`), OR a command name present in those
  docs but absent from `commands/`, when validate runs, then the registration
  check fails listing every missing/stale entry. (Catches holes #1 and #2.)
- **AC-5 referenced-path existence (check D):** Given a doc referencing a path
  that does not exist (e.g. `scripts/normalize-test-output.py`), when validate
  runs, then the path-existence check fails naming the dangling reference.
  (Catches hole #3.)
- **AC-6 dispatch graph (check E):** Given a command referencing
  `subagent_type: X` where `agents/X.md` does not exist, or a `Next: /relay-y`
  pointer with no matching command file, when validate runs, then the dispatch
  check fails naming the unresolved target.
- **AC-7 frontmatter schema (check F):** Given an agent whose `name` ≠ its
  filename stem, or a command carrying a `name` field, or any component missing a
  required frontmatter field, when validate runs, then the ajv-backed frontmatter
  check fails naming the file and the violated rule.
- **AC-8 artifact naming (check G):** Given a file matching
  `PRPs/plans/*.plan.review.jsonl` (doubled `.plan`), when validate runs, then
  the artifact-naming check fails. (Catches hole #4.)
- **AC-9 native validator wrap (check A):** Given
  `claude plugin validate ./plugins/relay --strict` returns non-zero, when
  `npm run validate` runs, then it surfaces that failure as a check result
  (and degrades gracefully with a clear note if the `claude` CLI is unavailable).
- **AC-10 scope excludes prp-core:** Given `plugins/prp-core/` contains files that
  would fail relay's frontmatter/dispatch rules, when validate runs, then none of
  them are flagged — every structural check is scoped to `plugins/relay/`.
- **AC-11 pre-commit hook blocks violations:** Given `.githooks/pre-commit` is
  active (`git config core.hooksPath .githooks`), when a commit is attempted with
  a validation violation present, then the commit is blocked and the validate
  output is shown.
- **AC-12 eval classifies fixtures:** Given `ANTHROPIC_API_KEY` is set, when
  `npm run eval` runs promptfoo over the `test-reviewer` agent with the existing
  clean/dirty fixtures, then it asserts clean → APPROVED and dirty →
  CHANGES_REQUESTED and writes a report; given no API key, `npm run eval` exits
  with a clear message rather than crashing.
- **AC-13 `.sh`/`.ps1` bootstrap parity (check P):** Given the `context-builder`
  skill emits a `worktree-bootstrap.sh` template but no matching
  `worktree-bootstrap.ps1` template, when `npm run validate` runs, then the parity
  check fails naming the missing `.ps1` variant. (Catches hole #5.)

## Open Questions

- [ ] Eval fidelity: MVP uses the promptfoo→API approximation of reviewer agents
      (assert only the verdict token). When/whether to graduate to headless
      (`claude -p`) execution for full-runtime fidelity?
- [ ] Which model powers the evals (cost vs. fidelity) — is a cheaper tier
      acceptable when only asserting the verdict?
- [ ] Should `npm run eval` ever gate anything (e.g. pre-push), or stay purely
      manual? MVP: manual.
- [ ] Dependency management: commit `package-lock.json`, gitignore `node_modules/`
      — confirm the repo is comfortable gaining a `node_modules/`.
- [x] RESOLVED (2026-07-12): the relay repo declares
      `test_frameworks: ["node:test"]` in `docs/context/methodology.md`; the relay
      test pair authors the checker unit tests test-after. The earlier assumption
      (Implementer authors them directly) conflicts with R-X strict and was
      rejected in code review.
- [ ] HALT-code drift (frontmatter vs body) has its dedicated coverage check
      deferred (Could). Track whether to pull it into a fast-follow after MVP.

---

## Users & Context

**Primary User**
- **Who:** The `relay` maintainer (single owner today) and future contributors.
- **Current behavior:** Rely on manual review to catch cross-reference and
  consistency errors across `plugins/relay/`, `docs/`, and the `documentation/`
  mirror site.
- **Trigger:** Renaming or editing a command/agent/skill/doc, cutting a release
  (version bump), or adding a page to the documentation site.
- **Success state:** A single `npm run validate` (also fired on every commit)
  turns red the moment an invariant is violated, naming the exact file and rule.

**Job to Be Done**
When I rename or edit a command, agent, or doc, I want inconsistencies and dead
references to break my commit, so I can avoid publishing a plugin with rotted
cross-references or an out-of-sync mirror site.

**Non-Users**
Target projects that `relay` processes through its pipeline. This suite validates
the **relay plugin repository itself**, not projects the plugin drives. It is also
not for `plugins/prp-core/`, which is upstream reference material.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `npm run validate` runner: aggregates checks, non-zero exit + named findings | The core deterministic gate |
| Must | Static checks A–G (native-wrap, version-parity, registration, path-existence, dispatch, frontmatter-schema, artifact-naming) | Cover the known invariants and holes #1–#4 |
| Must | Check P: `.sh`/`.ps1` bootstrap parity (context-builder must emit both variants) | Covers hole #5, which no A–G check reaches |
| Must | Scope every structural check to `plugins/relay/` (never `prp-core/`) | Enforces the prp-core anti-pattern |
| Must | Fix holes #1–#5 so `npm run validate` is green | Definition of done: suite passes on the repo |
| Must | Pre-commit hook via `.githooks/` + `core.hooksPath` | Local enforcement without CI |
| Must | `npm run eval`: promptfoo over `test-reviewer` with existing clean/dirty fixtures | Behavioral layer, cheapest ready win |
| Should | Evals over `plan-reviewer`, `prd-reviewer`, `code-reviewer` | Broaden behavioral coverage |
| Should | `npm run setup-hooks` convenience (sets `core.hooksPath`) | Hooks are not auto-applied on clone |
| Could | HALT-code coverage check (H); external link-check (I); markdownlint | Valuable, non-blocking for MVP |
| Won't | CI / GitHub Actions | Deferred to Phase 5 |
| Won't | Headless (`claude -p`) evals; Python layer | Out of MVP scope |

### MVP Scope

`npm run validate` with checks A–G plus the `.sh`/`.ps1` parity check (P), scoped
to `plugins/relay/` (the parity check reads the context-builder skill), wired to a
pre-commit hook; holes #1–#5 fixed so the suite is green; and `npm run eval` with a
promptfoo config asserting `test-reviewer` verdicts on the existing clean/dirty
fixtures.

### User Flow

1. Contributor edits a command/agent/doc and stages a commit.
2. The pre-commit hook runs `npm run validate`; on a violation the commit is
   blocked with the failing check + `file:line`.
3. Contributor fixes the inconsistency and re-commits (now green).
4. Before a release or when touching reviewer prompts, the contributor runs
   `npm run eval` on demand and reads the verdict report.

---

## Technical Approach

**Feasibility:** HIGH — deterministic file/JSON/HTML parsing in Node; the
invariants are already specified in prose; golden eval fixtures already exist.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**;
`test_frameworks: ["node:test"]`.

Test-after ordering with a declared framework — the test pair
(test-writer/test-reviewer) authors and maintains the checker unit tests from the
Acceptance Criteria above, **after** the Implementer + Code Review. The
Implementer authors ZERO test files (R-X strict); `node:test` (Node's built-in
runner) is the declared framework, and `/relay-test` runs the suite via
`node --test`. (Resolved from Open Question #5 on 2026-07-12: an earlier draft had
the Implementer author the checker tests directly, which conflicts with R-X strict
— see `docs/decisions.md` [2026-05-06], [2026-07-10].)

### Architecture Notes

- **Layout:** `package.json` (scripts: `validate`, `eval`, `setup-hooks`) +
  `scripts/validate/index.mjs` (runner) + `scripts/validate/checks/*.mjs`
  (one file per check) + `scripts/validate/schemas/*.json` (ajv frontmatter
  schemas per component type) + `.githooks/pre-commit` + `promptfooconfig.yaml`.
- **Dependencies:** `ajv` (JSON Schema), `js-yaml`/`gray-matter` (frontmatter),
  `node-html-parser` (the documentation site), `promptfoo` (evals). Commit
  `package-lock.json`; gitignore `node_modules/`.
- **Scoping invariant:** structural checks glob `plugins/relay/**`, never
  `plugins/prp-core/**` (enforces the prp-core anti-pattern; validated by AC-10).
- **Site parsing:** anchor on stable structures — `search-index.json` is JSON;
  changelog releases are `<h2>` headings; NAV is derivable from `assets/js/app.js`.
- **The furo-fix phase touches `documentation/`** and therefore must obey
  `documentation/AGENTS.md` (three-file registration + a `changelog.html` entry
  for every site change).

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Evals only approximate the real agent (prompt fed to API ≠ Claude Code runtime with tools) | M | Assert only the verdict token; document as approximate; graduate to headless later (Open Question) |
| Over-broad checks produce false positives on legitimate content (prior art: the relay-execute docs-phase Level-3 grep false positives) | M | Scope to `plugins/relay/`; unit-test each checker against known-good and known-bad fixtures; prefer structured parsing over broad greps |
| Brittle HTML parsing of the documentation site | L | Use `node-html-parser`; anchor on `<h2>`/JSON, not fragile regex |
| Pre-commit hook not auto-applied on clone (`core.hooksPath` is local git config) | M | Ship `npm run setup-hooks` + document in README/CONTRIBUTING |
| `claude plugin validate` CLI absent in some environments (check A) | L | Degrade gracefully with a clear "native validator skipped" note; never hard-crash the runner |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Harness scaffold | `package.json` + `scripts/validate/index.mjs` runner (aggregation + exit code) + first check: version parity (B) | complete | - | - | PRPs/plans/validation-suite-phase-1-harness-scaffold.plan.md |
| 2 | Static checks | Checks A, C, D, E, F, G scoped to `plugins/relay/`, plus check P (`.sh`/`.ps1` bootstrap parity over the context-builder skill); each unit-tested against good/bad fixtures | complete | - | 1 | PRPs/plans/validation-suite-phase-2-static-checks.plan.md |
| 3 | Go green | Fix holes #1–#5 (stale `relay-tdd` names, search-index sync, `.py`→`.mjs`, doubled `.plan` artifact, and add the `worktree-bootstrap.ps1` template to the context-builder) so `npm run validate` exits 0; documentation edits follow `AGENTS.md` | complete | - | 2 | PRPs/plans/validation-suite-phase-3-go-green.plan.md |
| 4 | Pre-commit wiring | `.githooks/pre-commit` + `npm run setup-hooks` + README/CONTRIBUTING note | complete | - | 3 | PRPs/plans/validation-suite-phase-4-pre-commit-wiring.plan.md |
| 5 | Eval layer | `promptfooconfig.yaml` + `npm run eval` asserting `test-reviewer` verdicts on existing clean/dirty fixtures | complete | - | 1 | PRPs/plans/validation-suite-phase-5-eval-layer.plan.md |

### Phase Details

**Phase 1: Harness scaffold**
- **Goal:** A runnable `npm run validate` that aggregates checks and exits
  non-zero on failure.
- **Scope:** `package.json`, the runner, and the version-parity check (B) as the
  first concrete check.
- **Success signal:** `npm run validate` runs; check B passes on the current tree
  (plugin.json 0.20.0 == changelog latest 0.20.0) and fails when either is
  perturbed.

**Phase 2: Static checks**
- **Goal:** The full A–G check set plus check P, each independently unit-tested.
- **Scope:** Checks A (native wrap), C (registration), D (path existence),
  E (dispatch), F (frontmatter schema via ajv), G (artifact naming) scoped to
  `plugins/relay/`, plus P (`.sh`/`.ps1` bootstrap parity) over the
  context-builder skill.
- **Success signal:** Running on the current tree turns red on holes #1–#5;
  running on the good fixtures stays green; no prp-core file is flagged.

**Phase 3: Go green**
- **Goal:** `npm run validate` exits 0 on the repo.
- **Scope:** Fix holes #1–#5 (including adding the `worktree-bootstrap.ps1`
  template to the context-builder skill). Documentation-site edits register per
  `AGENTS.md` (NAV + search index + changelog entry).
- **Success signal:** `npm run validate` → exit 0; a re-introduced violation
  → exit non-zero.

**Phase 4: Pre-commit wiring**
- **Goal:** Local commits are gated by `npm run validate`.
- **Scope:** `.githooks/pre-commit`, `npm run setup-hooks`, contributor docs.
- **Success signal:** A commit carrying a violation is blocked with validate
  output.

**Phase 5: Eval layer**
- **Goal:** On-demand behavioral evals of the reviewer agents.
- **Scope:** `promptfooconfig.yaml` targeting `test-reviewer` with the existing
  clean/dirty fixtures; `npm run eval`.
- **Success signal:** `npm run eval` reports clean → APPROVED and dirty →
  CHANGES_REQUESTED; missing `ANTHROPIC_API_KEY` yields a clear message, not a
  crash.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Runtime | Node / ESM | Python (pytest+deepeval); pure shell | Parity with existing `scripts/*.mjs`; promptfoo is Node-native; no new language |
| Execution | Local pre-commit + manual eval | GitHub Actions CI | MVP defers CI (fork; Phase 5 not started); pre-commit gives immediate local feedback |
| Two commands, two triggers | `validate` (pre-commit, blocking) vs `eval` (manual, non-blocking) | Single gate for both | LLM evals cost tokens / are slow / non-deterministic — unfit to block every commit |
| Eval strategy | Approximate (promptfoo→API), verdict-token assertion | Headless `claude -p` full runtime | Cheapest ready win; reviewer verdict is a clean assertable token; fidelity upgrade deferred |
| Static-check scope | `plugins/relay/` only | Whole repo incl. prp-core | Enforces the "prp-core is reference, not relay code" anti-pattern |
| Build via | Dogfood `/relay-prd` → `/relay-execute` | Direct hand-build | Validates the relay pipeline end-to-end; on-brand |
| Hole #5 in MVP | Promote the `.sh`/`.ps1` parity check (P) + context-builder `.ps1` fix to Must | Defer #5 to a Could/stretch | Keeps the "detect all 5 holes" success promise honest; #5 is a real Windows-correctness gap |

---

## Research Summary

**Market Context** (from this session's grounding — market survey)
- **promptfoo** (MIT, ~350k devs, acquired by OpenAI Mar 2026) is the de-facto
  standard for prompt evals: YAML test cases, prompt×model×case grids,
  deterministic asserts + `llm-rubric` (LLM-as-judge), CI-friendly — the closest
  fit for the behavioral layer. Source: https://www.promptfoo.dev
- **DeepEval** (pytest-native, 50+ metrics) fits Python-first stacks; not chosen
  because the suite is Node/ESM. LangSmith / Braintrust / Arize Phoenix are hosted
  eval+observability platforms — overkill for a plugin repo.
- **Static validation** ecosystem for markdown/prompt repos: the native
  `claude plugin validate --strict` (frontmatter, kebab-case, wrong-type fields),
  `remark-lint-frontmatter-schema` (YAML frontmatter vs JSON Schema),
  `markdown-link-check`, `markdownlint`.

**Technical Context** (from this session's grounding — repo testable-surface map)
- No existing tests, CI, or lint config: no `.github/`, no `package.json`, no
  linter configs. CLAUDE.md states outright "There are no build, lint, or test
  commands."
- Three distinct frontmatter schemas: commands (`description` + `argument-hint`,
  no `name`), agents (`name` == filename stem, plus `model`/`color`/`tools`),
  skills (`name` + `description`).
- The version-sync contract (`documentation/AGENTS.md` §7.5) and three-file
  registration rule (§6) are binding prose with no machine check today.
- Ready-made golden datasets already exist:
  `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/{clean,dirty}/` —
  deliberately clean vs. deliberately-flawed suites built to calibrate
  `test-reviewer`, directly reusable as eval fixtures.
- `scripts/` already uses Node ESM (`generate-final-report.mjs`,
  `normalize-test-output.mjs`), confirming Node/ESM as the natural runtime.

---

*Generated: 2026-07-12*
*Approved: 2026-07-12*
*Status: APPROVED*
