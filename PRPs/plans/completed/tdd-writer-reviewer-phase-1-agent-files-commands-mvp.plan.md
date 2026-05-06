# Feature: Agent files + commands MVP (Phase 1 of tdd-writer-reviewer)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent files in plugins/relay/agents/; new command files in plugins/relay/commands/; cross-cutting artifact creation impacting downstream Phase 3 (/relay-execute integration); reviewer agent introduces Bash for dynamic R-RED-LEGITIMATE check
- Decisions found:
  - 2026-04-19 Command surface: `/relay-tdd` (writer) + `/relay-tdd-review` (reviewer) split, self-skip when `tdd: false`
  - 2026-04-19 TDD activation opt-in by explicit declaration only
  - 2026-04-19 Methodology declaration in `docs/context/methodology.md` (key `tdd:`)
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/`
  - 2026-04-19 Interactivity boundary (post-PRD autonomous)
  - 2026-04-30 Reviewer agents lack `Edit`; status flips owned by their command
  - 2026-04-30 Implementer Bash tool allowlist gate — agent declares Bash open; project `.claude/settings.json` is the security boundary
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (`docs/anti-patterns.md:60-66`)
  - Writing TDD tests that mirror imagined implementation (`docs/anti-patterns.md:24-29`)
  - Activating TDD by heuristic (`docs/anti-patterns.md:43-48`)
  - Filler in mandatory sections; flipping status to APPROVED from a writer agent
- Applicable architectural rules:
  - Plugin assets under `plugins/relay/agents/` and `plugins/relay/commands/` (`docs/context/architecture.md`)
  - Writer/reviewer split with reviewer command owning DRAFT→APPROVED flip
  - JSONL audit log discipline (`PRPs/plans/<basename>.tdd-review.jsonl`) — append-only Read+concat+Write
  - Phase 1 MUST NOT modify `relay-execute.md` TDD routing dead-code branch (Phase 3 owns that edit)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/tdd-writer-reviewer.prd.md` — Implementation Phases row 1: "Agent files + commands MVP" — Goal: ship the four artifacts (two agents, two commands) such that standalone `/relay-tdd` and `/relay-tdd-review` invocations work end-to-end against any plan path — Success signal: standalone invocation in a target project with `tdd: true` produces a B7 suite + B8 verdict + JSONL line; standalone invocation with `tdd: false` self-skips.

## Summary

Author the four canonical artifacts of the TDD track — `tdd-writer.md` (B7 agent), `tdd-reviewer.md` (B8 agent), `relay-tdd.md` (writer command), `relay-tdd-review.md` (reviewer command) — by structurally mirroring the shipped `plan-writer`/`plan-reviewer`/`code-reviewer` triad. Phase 1 ships standalone-invocable artifacts only; orchestrator integration (`relay-execute.md` amendment) is explicitly deferred to Phase 3. The reviewer agent (B8) declares `Bash` in its frontmatter to support the AC-13 hybrid R-RED-LEGITIMATE check (gated by the project-level `.claude/settings.json` allowlist per the 2026-04-30 implementer Bash decision). All four files are markdown with YAML frontmatter; no compiled code is produced.

## User Story

```
As a relay maintainer running /relay-execute against a project with tdd: true
I want to invoke /relay-tdd <plan-path> and /relay-tdd-review <suite-path> standalone
So that I can author and validate B7 + B8 in isolation before wiring them into the orchestrator (Phase 3) and dogfooding (Phase 5)
```

## Problem Statement

Without B7/B8 agent and command files on disk, every downstream phase of `tdd-writer-reviewer.prd.md` is blocked. Phase 2 (synthetic fixture) needs `/relay-tdd-review` to validate; Phase 3 (`/relay-execute` integration) needs both commands as adoption targets via D7 dispatch. The PRD's R-X-strict driver (three real-world `/relay-execute` halts on test additions) cannot be unblocked until Phase 1 produces the four artifacts.

## Solution Statement

Create exactly four markdown files under `plugins/relay/`. Each agent file follows the shipped writer/reviewer pattern (`plan-writer.md` shape for B7; `plan-reviewer.md` minus `Edit` plus `Bash` for B8 — precedent from `code-reviewer.md`). Each command file follows the shipped command-shell pattern (`relay-plan.md` shape for `/relay-tdd`; `relay-code-review.md` shape for `/relay-tdd-review`). The two commands self-skip silently when `tdd: false` (PRD AC-1, AC-2) and hard-abort when `tdd: true` + no test framework (AC-3). No content from `relay-execute.md` is touched — that file's TDD routing branch lines `141-154` and hard-rule `9` (line 507) remain in their current dead-code state until Phase 3.

## Metadata

| Key | Value |
|---|---|
| Type | Plugin asset creation (4 markdown files) |
| Complexity | Medium — prompt engineering across 4 specialized roles |
| Systems Affected | `plugins/relay/agents/`, `plugins/relay/commands/` |
| Dependencies | None (Phase 1 is the foundation) |
| Estimated Tasks | 5 (4 file creations + 1 markdown-lint sweep) |
| Source PRD line ref | `PRPs/prds/tdd-writer-reviewer.prd.md:198` (Implementation Phases row 1) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| HIGH | `PRPs/prds/tdd-writer-reviewer.prd.md` | 75–110 | AC-1..AC-13 — every rubric item B8 enforces and every behavior contract B7 must satisfy |
| HIGH | `plugins/relay/agents/plan-writer.md` | 1–29 | Frontmatter + role-declaration prose — direct structural mirror for `tdd-writer.md` |
| HIGH | `plugins/relay/agents/plan-reviewer.md` | 1–7, 588–633 | Reviewer frontmatter + JSONL append-only discipline — direct mirror for `tdd-reviewer.md` |
| HIGH | `plugins/relay/agents/code-reviewer.md` | 1–46 | Reviewer with Bash + Task; no Edit — closest precedent for B8's tool allowlist |
| HIGH | `plugins/relay/agents/post-green-reviewer.md` | 82–120, 247–252 | Pathology-enumeration pattern + concern-object schema — closest analog to B8's five-pathology rubric |
| HIGH | `plugins/relay/commands/relay-plan.md` | 76–184 | Writer-command structural skeleton — mirror for `relay-tdd.md` |
| HIGH | `plugins/relay/commands/relay-plan-review.md` | 76–188 | Reviewer-command lighter skeleton |
| HIGH | `plugins/relay/commands/relay-code-review.md` | 174–213 | Reviewer-command with Task-dispatch + explicit no-D8-mutation no-op step — mirror for `relay-tdd-review.md` |
| MED | `plugins/relay/commands/relay-execute.md` | 141–154, 507 | Reference only — these lines MUST NOT be modified in Phase 1 |
| MED | `docs/context/methodology.md` | 1–7 | Frontmatter shape (`tdd: false`, `test_frameworks: []`) — what B7/B8 read at runtime |
| MED | `docs/context/prd-template.md` | 95–105 | AC-N format `**AC-1 {short name}:** Given/When/Then` that B7 parses from PRDs |
| MED | `documentation/concepts/tdd-track.html` | 131–134 | Canonical naming of the five B8 pathologies (the source the PRD already cites) |
| LOW | `docs/decisions.md` | 200–208 | 2026-04-19 command-surface row defining `/relay-tdd` and `/relay-tdd-review` slots |

## Patterns to Mirror

### # SOURCE: plugins/relay/agents/plan-writer.md:1-7 (writer agent frontmatter)

```yaml
---
name: plan-writer
description: Autonomously transform an APPROVED PRD into a per-phase DRAFT plan. ...
model: sonnet
color: orange
tools: Task, Read, Write, Edit, Glob
---
```

Used by Task 1 (`tdd-writer.md` frontmatter). B7 changes: `name: tdd-writer`; `color: green` (TDD/red-green-refactor association); `tools: Task, Read, Write, Edit, Glob` identical (Task for parallel research dispatch if used; Write for new test files; Edit narrow for status flip on its own draft; Glob for existing-coverage scan in AC-12 path).

### # SOURCE: plugins/relay/agents/plan-reviewer.md:1-7 (reviewer agent frontmatter — no Bash)

```yaml
---
name: plan-reviewer
tools: Read, Edit, Write
model: sonnet
color: cyan
---
```

Used as the **starting point** for Task 2 (`tdd-reviewer.md` frontmatter). B8 deviates by ADDING `Bash, BashOutput, Glob, Grep, Task` and REMOVING `Edit` (the command owns the status flip per the 2026-04-30 reviewer pattern). Reference for the deviation:

### # SOURCE: plugins/relay/agents/code-reviewer.md:1-7 (reviewer with Bash + Task; no Edit)

```yaml
---
name: code-reviewer
description: Validate the implementer's working-tree diff ...
model: sonnet
color: blue
tools: Read, Write, Glob, Grep, Bash, BashOutput, Task
---
```

Used by Task 2. B8 final shape: `tools: Read, Write, Glob, Grep, Bash, BashOutput, Task` — explicitly omitting `Edit`. The status flip on the suite's own DRAFT marker is performed by the `/relay-tdd-review` command (Step A.2 of Task 4 below), not by the agent.

### # SOURCE: plugins/relay/agents/post-green-reviewer.md:82-120 (pathology enumeration with typed concern objects)

```
#### 3a — Removed test functions (weakening via deletion)
#### 3b — Newly-added skip markers (weakening via skipping)
concern object: {"type": "test_removed", "file": ..., "net_removed": 2, "evidence": [...]}
```

Used by Task 2. B8 uses the same concern-object pattern with five typed `id` values mapped to the PRD's five pathologies — `R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE` — plus the hybrid R-RED-LEGITIMATE.

### # SOURCE: plugins/relay/agents/plan-reviewer.md:588-633 (JSONL append-only discipline)

```
Append-only discipline:
1. `Read` the existing file if it exists (empty string otherwise).
2. Concatenate existing content + one newline + new JSON line.
3. `Write` the result back.
```

Used by Task 2. B8 appends to `PRPs/plans/<basename>.tdd-review.jsonl` with the schema `{timestamp, verdict, rubric:[{id, passed, reason?}], action, user_message}` — `passed` admits `true | false | null` per PRD AC-13.

### # SOURCE: plugins/relay/commands/relay-plan.md:76-184 (writer command skeleton)

```
## Preconditions
### P1 — PRD path resolves to a readable file
### P2 — PRD ends with `*Status: APPROVED*`
### P3 — Decision Gate sources readable
### P4 — At least one actionable phase exists
## Phase A — Adopt the Writer role
```

Used by Task 3. `relay-tdd.md` adapts to four preconditions: P1 plan path readable; P2 plan status APPROVED; P3 decision-gate sources readable; P4 read `methodology.md` and decide self-skip / hard-abort / proceed (covers PRD AC-1, AC-2, AC-3).

### # SOURCE: plugins/relay/commands/relay-plan-review.md:76-188 (reviewer command lighter skeleton)

Reference for `relay-tdd-review.md` overall shape — the same `## Preconditions` + `## Phase A — Adopt the Reviewer role` structure.

### # SOURCE: plugins/relay/commands/relay-code-review.md:200-208 (explicit no-D8 no-op step)

```
### A.3 — Do NOT perform any D8 mutation
This step is a no-op by design. Stated explicitly so the discipline is visible in the command body:
- Do NOT `Edit` the plan trailing block.
- Do NOT `Bash(mv ...)` the plan to `PRPs/plans/completed/`.
- Do NOT `Edit` the source PRD's Implementation Phases table.
```

Used by Task 4. `relay-tdd-review.md` includes an explicit no-op step stating the reviewer command does NOT modify the source PRD or move plans — only the test suite's own status flip + JSONL append are within scope.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/tdd-writer.md` | CREATE | B7 agent — authorized author of new test files; reads PRD ACs + plan; emits per-AC outcomes (`NEW_TEST_REQUIRED`, `EXISTING_TEST_COVERS`, `AMBIGUOUS`) |
| `plugins/relay/agents/tdd-reviewer.md` | CREATE | B8 agent — five-pathology rubric + hybrid R-RED-LEGITIMATE; appends `.tdd-review.jsonl`; never edits files |
| `plugins/relay/commands/relay-tdd.md` | CREATE | Writer command shell — preconditions including `tdd:` self-skip; adopts B7 protocol inline |
| `plugins/relay/commands/relay-tdd-review.md` | CREATE | Reviewer command shell — Task-dispatches B8; owns DRAFT→APPROVED flip via Edit; appends JSONL |

## NOT Building (Scope Limits)

- **Orchestrator integration** — `plugins/relay/commands/relay-execute.md` lines 141–154 and hard-rule 9 (line 507) MUST remain unchanged. Phase 3 of this PRD owns that amendment.
- **Synthetic fixture for B8 calibration** — Phase 2 of this PRD ships the fixture at `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/`. Phase 1 must NOT pre-populate the fixture directory.
- **Documentation surface (agents.html, commands.html, changelog.html, plugin.json bump)** — Phase 4 owns these. No HTML edits and no `plugin.json` version bump in Phase 1.
- **Decisions.md entry** — Phase 4 owns the 2026-05-06 entry codifying the R-X / B7 relationship.
- **Dogfood pass against phoenix/sisalfa** — Phase 5; cannot run from this repo's worktree.
- **Modifying R-X strict (D17)** — preserved verbatim by every phase including Phase 1; the agent prompts must NOT propose any relaxation.
- **TDD activation by heuristic** — anti-pattern reaffirmed; both command files must self-skip silently when `tdd: false` or `methodology.md` is missing.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/agents/tdd-writer.md

- **ACTION**: write a new file at `plugins/relay/agents/tdd-writer.md` containing YAML frontmatter (`name: tdd-writer`, `model: sonnet`, `color: green`, `tools: Task, Read, Write, Edit, Glob`) followed by the agent's full prompt prose. The prose must include: (a) a Phase 0 setup section that reads `<target_root>/docs/context/methodology.md` and captures `test_frameworks: [...]`; (b) a Phase 1 section that reads the source PRD's `## Acceptance Criteria (test scenarios)` and the APPROVED plan; (c) a Phase 2 section that walks each AC and emits one of `NEW_TEST_REQUIRED` (writes a test file using the framework template), `EXISTING_TEST_COVERS path:line` (records the mapping; writes nothing), or `AMBIGUOUS` (aborts with a structured message naming the AC); (d) a Phase 3 section that produces the aggregate verdict (`SUITE_DRAFT_WRITTEN` or `EXISTING_COVERAGE_SUFFICIENT`) and writes `PRPs/reports/<feature>/tdd-initial-suite.diff` with the AC→test mapping; (e) hard constraints: never write production code, never modify existing test files, never write under `.claude/`, abort on PRD ambiguity rather than invent. Trailing two-line block: `*Generated: 2026-05-06*` and `*Status: DRAFT*` are NOT used for agent files (only plans/PRDs carry that block); agent files end with the prose body.
- **MIRROR**: `plugins/relay/agents/plan-writer.md:1-29` (frontmatter shape + role-declaration prose); the per-AC outcome enumeration mirrors the structured-verdict pattern in `post-green-reviewer.md:82-120`.
- **VALIDATE**: `test -f plugins/relay/agents/tdd-writer.md && head -7 plugins/relay/agents/tdd-writer.md | grep -q '^name: tdd-writer$' && grep -q '^tools: Task, Read, Write, Edit, Glob$' plugins/relay/agents/tdd-writer.md`

### Task 2: CREATE plugins/relay/agents/tdd-reviewer.md

- **ACTION**: write a new file at `plugins/relay/agents/tdd-reviewer.md` containing YAML frontmatter (`name: tdd-reviewer`, `model: sonnet`, `color: green`, `tools: Read, Write, Glob, Grep, Bash, BashOutput, Task` — explicitly NO `Edit`) followed by the full reviewer prompt. Sections: (a) Inputs (`suite_path`, `target_root`); (b) Hard constraints (no `Edit`; status flip is the command's job; never weaken or remove existing tests; JSONL append-only Read+concat+Write); (c) The five-pathology rubric — one section per id with detection heuristics: `R-IMPL-LEAK` (assert on private symbol; count of calls to a method; test name = internal method name — `oracle/graal #4808` heuristics), `R-TRIVIAL-ASSERT` (assertion strict-subset of AC properties — TDD-Bench django-13401 pattern), `R-MOCK-ABUSE` (the four syntactic-categorical detections from the PRD: mock-of-SUT; mock of concrete type when interface exists; mock chained ≥3 levels; `was_called`-only assertion), `R-AC-COVERAGE` (every AC-N in the source PRD has ≥1 corresponding test reference per yrkan.com RTM convention), `R-DUPLICATE` (two tests assert the same property without discriminative input variance); (d) The hybrid `R-RED-LEGITIMATE` check: invoke `Bash(<test-command-from-test_frameworks[0]>)`; non-zero exit + assertion-failure output = `passed: true`; non-zero exit + import/compile-error output = `passed: false, reason: "broken setup"`; zero exit = `passed: false, reason: "suite green pre-implementation"`; Bash failure outright = `passed: null, reason: "degraded — test framework execution unavailable: <details>"` (PRD AC-13); (e) JSONL append protocol — Read existing `PRPs/plans/<basename>.tdd-review.jsonl` (or treat absence as empty), append one line `{timestamp, verdict, rubric:[{id, passed, reason?}], action, user_message}`, Write back; (f) anti-patterns: padding rubric to fill K=5 cap; weakening a check to APPROVE; using `Edit` (tool not granted).
- **MIRROR**: frontmatter from `code-reviewer.md:1-7` (Bash+Task, no Edit); JSONL append discipline from `plan-reviewer.md:588-633`; pathology-enumeration pattern from `post-green-reviewer.md:82-120,247-252`.
- **VALIDATE**: `test -f plugins/relay/agents/tdd-reviewer.md && grep -q '^tools: Read, Write, Glob, Grep, Bash, BashOutput, Task$' plugins/relay/agents/tdd-reviewer.md && ! grep -E '^tools:.*\bEdit\b' plugins/relay/agents/tdd-reviewer.md && grep -c 'R-IMPL-LEAK\|R-TRIVIAL-ASSERT\|R-MOCK-ABUSE\|R-AC-COVERAGE\|R-DUPLICATE\|R-RED-LEGITIMATE' plugins/relay/agents/tdd-reviewer.md | awk '$1>=6{exit 0} {exit 1}'`

### Task 3: CREATE plugins/relay/commands/relay-tdd.md

- **ACTION**: write a new file at `plugins/relay/commands/relay-tdd.md` containing YAML frontmatter (`description: ...`, `argument-hint: <plan-path>`) followed by command shell prose. Sections in canonical order: `## Your mission`, `## Decision Gate`, `## Parse arguments` (single non-empty path-like string), `## Preconditions` with P1 plan path readable, P2 plan ends with `*Status: APPROVED*`, P3 decision-gate sources readable, P4 read `methodology.md` and dispatch: (a) absent or `tdd: false` → exit 0 silently with the verbatim line `TDD track inactive (tdd: false). Skipping.` (PRD AC-1, AC-2); (b) `tdd: true` AND `test_frameworks: []` (empty or missing) → halt with verbatim message `TDD track active but no test framework declared. Run context-builder *update or remove tdd:true.` and non-zero exit (PRD AC-3); (c) `tdd: true` AND `test_frameworks` non-empty → proceed; `## Phase A — Adopt the Writer role` reads `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/tdd-writer.md` and executes its protocol inline; `## Final output surface` (B7's handoff message verbatim); `## Constraints` (no `.claude/` writes; no orchestrator-loop logic; no auto-invocation of `/relay-tdd-review`); `## What you do NOT do` (review the suite — that's `/relay-tdd-review`; modify production code; activate by heuristic).
- **MIRROR**: full shell from `plugins/relay/commands/relay-plan.md:76-184` (P1–P4 + Phase A + final surface + constraints).
- **VALIDATE**: `test -f plugins/relay/commands/relay-tdd.md && grep -q '^argument-hint: <plan-path>$' plugins/relay/commands/relay-tdd.md && grep -q 'TDD track inactive' plugins/relay/commands/relay-tdd.md && grep -q 'no test framework declared' plugins/relay/commands/relay-tdd.md`

### Task 4: CREATE plugins/relay/commands/relay-tdd-review.md

- **ACTION**: write a new file at `plugins/relay/commands/relay-tdd-review.md` mirroring the reviewer-command pattern. Frontmatter (`description: ...`, `argument-hint: <suite-path>`). Sections: `## Your mission`, `## Decision Gate`, `## Parse arguments`, `## Preconditions` with P1 suite path readable (or symbolic — accept the worktree path produced by B7), P2 source PRD discoverable from suite location (parses the AC-N tokens for R-AC-COVERAGE), P3 decision-gate sources readable, P4 same `methodology.md` self-skip behavior as `relay-tdd.md` (silent skip on `tdd: false`/missing); `## Phase A — Adopt the Reviewer role` with sub-steps: A.1 `Task(subagent_type="tdd-reviewer", prompt={...})` dispatch; A.2 read the just-appended JSONL line; A.3 on `verdict: APPROVED`, perform the suite-status-flip via `Edit` (replacing `*Status: DRAFT*` with `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*` on the suite manifest if applicable, or noop when the suite has no manifest); A.4 explicit no-D8-mutation no-op step (verbatim from the `relay-code-review.md:200-208` pattern, adapted to TDD context: the reviewer does NOT mutate the source PRD's Implementation Phases table; does NOT move plans to `PRPs/plans/completed/`; does NOT amend `relay-execute.md`). `## Final output surface`: APPROVED summary or CHANGES_REQUESTED bullet list (failing rubric ids + reasons). `## Constraints`: no `Edit` outside the JSONL append + the suite status flip; never re-invoke `/relay-tdd` (orchestrator owns the retry per PRD AC-9).
- **MIRROR**: shell from `plugins/relay/commands/relay-plan-review.md:76-188`; Task-dispatch + no-D8 no-op step from `plugins/relay/commands/relay-code-review.md:174-213`.
- **VALIDATE**: `test -f plugins/relay/commands/relay-tdd-review.md && grep -q '^argument-hint: <suite-path>$' plugins/relay/commands/relay-tdd-review.md && grep -qE 'subagent_type.{0,5}tdd-reviewer' plugins/relay/commands/relay-tdd-review.md && grep -q 'no-op by design' plugins/relay/commands/relay-tdd-review.md`

### Task 5: Sweep verifying no Phase 3/4 work was performed in this phase

- **ACTION**: confirm that `plugins/relay/commands/relay-execute.md` lines 141–154 and 507 are byte-unchanged (Phase 3 owns the amendment), no HTML files under `documentation/` were touched (Phase 4), `plugins/relay/.claude-plugin/plugin.json` version is unchanged, and no entry was added to `docs/decisions.md`. This is a structural guardrail enforcing the Phase 1 scope boundary.
- **MIRROR**: not applicable — this is a negative-space check.
- **VALIDATE**: `git diff --name-only HEAD | grep -vE '^(plugins/relay/agents/tdd-(writer|reviewer)\.md|plugins/relay/commands/relay-tdd(-review)?\.md|PRPs/plans/.*tdd-writer-reviewer.*|PRPs/prds/tdd-writer-reviewer\.prd\.md|PRPs/prds/tdd-writer-reviewer\.review\.jsonl)$' ; test $? -eq 1`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```sh
# Verify all four files exist and parse as YAML+markdown (frontmatter delimiters)
for f in plugins/relay/agents/tdd-writer.md plugins/relay/agents/tdd-reviewer.md plugins/relay/commands/relay-tdd.md plugins/relay/commands/relay-tdd-review.md; do
  test -f "$f" || { echo "MISSING: $f"; exit 1; }
  head -1 "$f" | grep -q '^---$' || { echo "FRONTMATTER MISSING: $f"; exit 1; }
done
echo "Level 1 PASS"
```

### Level 2 — CONTENT_INVARIANTS

```sh
# B7 frontmatter
grep -q '^name: tdd-writer$' plugins/relay/agents/tdd-writer.md
grep -q '^tools: Task, Read, Write, Edit, Glob$' plugins/relay/agents/tdd-writer.md

# B8 frontmatter (Bash + Task; no Edit)
grep -q '^name: tdd-reviewer$' plugins/relay/agents/tdd-reviewer.md
grep -q '^tools: Read, Write, Glob, Grep, Bash, BashOutput, Task$' plugins/relay/agents/tdd-reviewer.md
! grep -E '^tools:.*\bEdit\b' plugins/relay/agents/tdd-reviewer.md

# Five rubric ids + R-RED-LEGITIMATE referenced in B8
for rid in R-IMPL-LEAK R-TRIVIAL-ASSERT R-MOCK-ABUSE R-AC-COVERAGE R-DUPLICATE R-RED-LEGITIMATE; do
  grep -q "$rid" plugins/relay/agents/tdd-reviewer.md
done

# Self-skip + hard-abort literals in /relay-tdd
grep -q 'TDD track inactive' plugins/relay/commands/relay-tdd.md
grep -q 'no test framework declared' plugins/relay/commands/relay-tdd.md

# Reviewer command Task-dispatches B8
grep -qE 'subagent_type.{0,5}tdd-reviewer' plugins/relay/commands/relay-tdd-review.md

# No-op step pattern in /relay-tdd-review
grep -q 'no-op by design' plugins/relay/commands/relay-tdd-review.md

# No `.claude/PRPs/` references in any of the four files
! grep -r '.claude/PRPs/' plugins/relay/agents/tdd-writer.md plugins/relay/agents/tdd-reviewer.md plugins/relay/commands/relay-tdd.md plugins/relay/commands/relay-tdd-review.md

echo "Level 2 PASS"
```

### Level 3 — DRY-RUN END-TO-END

```sh
# Phase 1 scope boundary: relay-execute.md TDD routing branch unchanged
# (sed extracts current lines 141-154 and verifies they still contain the dead-code marker)
grep -n 'dead code in /relay-execute MVP' plugins/relay/commands/relay-execute.md
grep -n 'When tdd: true but B7/B8 are unshipped' plugins/relay/commands/relay-execute.md

# Phase 1 scope boundary: plugin.json unchanged
git diff --quiet plugins/relay/.claude-plugin/plugin.json || { echo "plugin.json was modified — Phase 4 work leaked into Phase 1"; exit 1; }

# Phase 1 scope boundary: no HTML files modified
git diff --name-only HEAD | grep -E '^documentation/.*\.html$' && { echo "documentation/ HTML modified — Phase 4 work leaked"; exit 1; }

# Phase 1 scope boundary: no decisions.md mutation
git diff --quiet docs/decisions.md || { echo "decisions.md was modified — Phase 4 work leaked"; exit 1; }

echo "Level 3 PASS"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1, AC-2):** `relay-tdd.md` self-skip block contains the verbatim string `TDD track inactive (tdd: false). Skipping.` and treats missing `methodology.md` as `tdd: false`.
- **AC-A2 (PRD AC-3):** `relay-tdd.md` hard-abort block contains the verbatim string `TDD track active but no test framework declared.`
- **AC-A3 (PRD AC-4, AC-5, AC-12):** `tdd-writer.md` prose enumerates the three per-AC outcomes (`NEW_TEST_REQUIRED`, `EXISTING_TEST_COVERS`, `AMBIGUOUS`) and the aggregate verdicts (`SUITE_DRAFT_WRITTEN`, `EXISTING_COVERAGE_SUFFICIENT`).
- **AC-A4 (PRD AC-6):** `tdd-reviewer.md` prose names all five pathology ids (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`) plus `R-RED-LEGITIMATE` with at least one detection heuristic per id.
- **AC-A5 (PRD AC-7, AC-8):** `relay-tdd-review.md` performs the DRAFT→APPROVED flip via `Edit` and appends one JSON line to `PRPs/plans/<basename>.tdd-review.jsonl` with the schema `{timestamp, verdict, rubric:[{id, passed, reason?}], action, user_message}`. The reviewer agent itself has no `Edit` tool (Hard constraint mirrored from code-reviewer).
- **AC-A6 (PRD AC-13):** `tdd-reviewer.md` describes the hybrid R-RED-LEGITIMATE check with explicit branches for assertion-failure red (`passed: true`), broken-setup red (`passed: false`), green-pre-impl (`passed: false`), and Bash-degraded environment (`passed: null` + `reason`).
- **AC-A7 (PRD MoSCoW Won't — Phase 1 boundary):** Lines 141–154 and line 507 of `plugins/relay/commands/relay-execute.md` are byte-unchanged. `plugins/relay/.claude-plugin/plugin.json` is byte-unchanged. No file under `documentation/` is modified. `docs/decisions.md` is byte-unchanged.
- **AC-A8 (PRD architectural rule "no `.claude/` writes"):** No `.claude/PRPs/` substring appears in any of the four created files.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Prompt drift between B8's R-MOCK-ABUSE prose and the four syntactic-categorical detections defined in the PRD | M | M | Task 2 must enumerate the four detections verbatim from `tdd-writer-reviewer.prd.md` Architecture Notes; Level 2 grep verifies presence |
| `tdd-writer.md` prose accidentally permits production-code edits | L | H | Hard constraint listed in Task 1; Level 2 grep optional next-phase enhancement to catch literal `production code` permissive language |
| Phase 1 work bleeds into Phase 3 by editing `relay-execute.md` | M | M | Task 5 + Level 3 explicit guardrails (`grep -n` confirms the dead-code branch text still present) |
| `tdd-reviewer.md` accidentally declares `Edit` in tools | L | H | Level 2 negative grep `! grep '\bEdit\b'` enforces |
| `tdd-reviewer.md` JSONL append wording diverges from `plan-reviewer.md`'s canonical Read+concat+Write description | L | M | Patterns to Mirror cites `plan-reviewer.md:588-633` verbatim; reviewer rubric R-COH-* deterministic check would catch a divergence in a future plan-review pass |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Color choice for B7/B8:** `green` — references the red-green-refactor cycle that TDD operates on (mnemonic for downstream agents reading the agent file frontmatter). Distinct from `plan-writer` (orange), `plan-reviewer` (cyan), `code-reviewer` (blue), `prd-writer` (blue), `prd-reviewer` (teal), `post-green-reviewer` (green) — note: `post-green-reviewer` is also green; this is acceptable because the two are not co-invoked (B5 runs after `/relay-test`, B7/B8 run before `/relay-implement`).

**Phase boundary discipline:** the explicit Task 5 + Level 3 guardrails enforcing "no Phase 3/4 leak" exist because the PRD's MVP Scope explicitly defers each of those concerns; an implementer could be tempted to "fix while I'm here" — those temptations are exactly what the plan-authoring R-X-strict driver protects against in the orchestrator chain.

**Dogfood downstream:** Phase 5 of the source PRD requires `/relay-execute` to drive ≥3 features per project on phoenix and sisalfa. Neither external repo can be exercised from this relay worktree; Phase 5 is implicitly out of scope for any `/relay-execute` invocation against `tdd-writer-reviewer.prd.md` from this repo. The orchestrator will surface "skipped — external repo" semantics or simply find nothing actionable when it reaches row 5.

*Generated: 2026-05-06*
*Approved: 2026-05-06*
*Implemented: 2026-05-06*
*Status: IMPLEMENTED*
