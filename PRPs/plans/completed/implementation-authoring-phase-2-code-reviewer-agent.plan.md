# Feature: code-reviewer agent (Phase 2 of implementation-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent file in `plugins/relay/agents/`; cross-cutting artifact creation (every `/relay-implement` attempt passes through this agent); third writer/reviewer pair of Pillar 2 — reviewer half; impacts `/relay-implement` command (Phase 3 of this PRD), `/relay-code-review` command (Phase 4), and the future `/relay-execute` orchestrator
- Decisions found:
  - [2026-04-19] Command surface: writer/reviewer split — `code-reviewer` is the reviewer half of the third pair; the `implementer` agent (Phase 1 of this PRD, now complete) is the writer half. The standalone `/relay-code-review` command (Phase 4) is a single-shot surface over this agent.
  - [2026-04-19] PRP artifacts under `PRPs/`, never `.claude/` — the agent's only write surface is `PRPs/plans/<basename>.code-review.jsonl`; all other reads are read-only. The COMMAND (not the agent) performs D8 mutations on plan flip, plan move, and PRD row update.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — code-reviewer auto-flips on rubric pass with no "Aprovar?" gate. CHANGES_REQUESTED is the reviewer's terminal-per-run signal; the loop lives in `/relay-implement`, not here.
  - [2026-04-19] Keep upstream `prp-core` as reference, not active relay code — `prp-implement.md` is studied for section-shape context; `plan-reviewer.md` is the closest relay-internal sibling; neither is imported.
  - [2026-04-19] TDD activation by explicit declaration only — the universal R-X rule (D9 Layer 0 of the source PRD) fires regardless of `tdd:` value. The agent reads `docs/context/methodology.md` only to confirm TDD routing context, not to activate or suppress R-X.
  - [2026-04-25] Plan filenames carry source PRD phase number and slug — code-reviewer references the plan's `## Source PRD` section to locate the source PRD path and the row N number; it does not mutate those files (that is the COMMAND's D8 responsibility).
  - [2026-04-26] D10 — Audit log at `PRPs/plans/<basename>.code-review.jsonl`; one JSON line per verdict; append-only. Schema: `{ timestamp, attempt, verdict, mode, rubric[], dispute_evidence?, action, user_message }`.
  - [2026-04-26] D11 — code-reviewer tool allowlist: `Read, Write, Glob, Grep, Bash, BashOutput`. NO `Edit` tool (read-only review philosophy diverges from `plan-reviewer` which has `Edit`). `Write` only for `code-review.jsonl`. `Bash` restricted by prompt to read-only operations (lint, type-check, `git diff`/`log`; no mutations).
  - [2026-04-26] D17 — Straight R-X fail in MVP: any diff touching a test file without a `TEST_CONTRACT_DISPUTE` verdict triggers immediate R-X failure with the file path listed. No "first warning" grace period.
- Applicable anti-patterns:
  - Weakening or deleting tests to make the auto-correction loop turn green — the code-reviewer's universal R-X rule is the rubric-layer guard that catches this; R-X fires regardless of `tdd:` value (D9 Layer 0). Any diff touching test files without an upheld dispute fails R-X immediately.
  - Writing pipeline artifacts under `.claude/` — the agent's only write is `PRPs/plans/<basename>.code-review.jsonl`; no `.claude/PRPs/` paths are ever constructed. This is enforced by D11's "Write only for code-review.jsonl" constraint and `docs/anti-patterns.md` lines 60–66.
  - Treating `plugins/prp-core/` as active relay code — `plan-reviewer.md` and `post-green-reviewer.md` are the relay-internal review precedents; `prp-implement.md` is a shape reference only; none are imported.
  - Relying on interactive permission prompts in the autonomous loop — code-reviewer runs without prompts and auto-flips on rubric pass (interactivity boundary; D1 of source PRD).
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — code-reviewer is the reviewer half of the third writer/reviewer pair (after PRD pair and Plan pair), downstream of the implementer.
  - Interactivity boundary — autonomous from PRD-APPROVED onward; auto-flip on rubric pass is the canonical pattern for reviewer agents past the boundary.
  - PRPs/ artifact path convention — the only artifact this agent writes is `PRPs/plans/<basename>.code-review.jsonl`; never under `.claude/`.
  - Writer/reviewer split — every stage post-PRD has two independently invokable commands; this agent file is the reviewer half, invoked by both `/relay-implement` (in the internal loop) and `/relay-code-review` (standalone).
  - Read-only over the repo (D11 divergence from plan-reviewer) — the agent uses `Read`, `Glob`, `Grep`, `Bash` (read-only ops only), `BashOutput`. The `Edit` tool is explicitly absent to enforce the read-only review philosophy.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/implementation-authoring.prd.md` — Implementation Phases row 2: "code-reviewer agent" — Goal: Implement the three-layer rubric runner (structural / static / semantic) plus the universal R-X test-modification guard plus arbitration mode. — Success signal: Given a hand-crafted passing diff with all rubric items satisfied, the agent emits APPROVED. Given a diff that modifies a test file without dispute, R-X fails with the file path. Given a hand-crafted dispute payload, the agent emits one of the three arbitration verdicts with structured rationale.

## Summary

This phase delivers a single new agent file at `plugins/relay/agents/code-reviewer.md` — the reviewer half of the relay implementation stage. The agent consumes either a working-tree diff (standard mode) or a `TEST_CONTRACT_DISPUTE` payload (arbitration mode) and applies a layered rubric: structural checks (R-S1 every Step-by-Step Task addressed, R-S2 every Files-to-Change row touched, R-S3 every plan AC-A satisfied), static checks (R-L1 Level-1 lint, R-L2 Level-2 type-check/unit-test, R-L3 Level-3 integration/markdown-lint), semantic review (R-SEM business-rule consistency, bugs, security gaps), and the universal R-X test-modification guard. It is read-only over the repo except for `Write` to `PRPs/plans/<basename>.code-review.jsonl`. It auto-flips (APPROVED verdict) on full rubric pass and emits CHANGES_REQUESTED on any failure — no "Aprovar?" gate, matching the interactivity boundary. In arbitration mode it emits one of `{DISPUTE_REJECTED, DISPUTE_UPHELD_TEST_WRONG, DISPUTE_UPHELD_PRD_AMBIGUOUS}`. The agent file shape mirrors the shipped `plan-reviewer.md` sibling with three canonical divergences documented in the source PRD's D11: no `Edit` tool (read-only philosophy), `Write` restricted to `code-review.jsonl`, and `Bash` restricted by prompt to read-only shell operations. The code-reviewer is called single-shot per attempt by `/relay-implement`'s internal loop and single-shot by `/relay-code-review` in standalone mode; the loop, retry budget, and D8 post-approval mutations are the COMMAND's responsibility, not this agent's.

## User Story

```
As the `/relay-implement` command (internal loop) and as the `/relay-code-review` command (standalone hand-invoked reviewer)
I want a single autonomous reviewer agent that evaluates a working-tree diff or a dispute payload against a three-layer rubric (structural / static / semantic) with a universal test-modification guard, and appends a machine-readable verdict to code-review.jsonl without prompting the user
So that every implementation attempt is validated by a consistent rubric that catches structural gaps, lint failures, and logic errors the implementer may have introduced — and so that silent test-weakening is blocked at the rubric layer before it reaches the Test Runner
```

## Problem Statement

Without a code-reviewer agent, the writer half of the third writer/reviewer pair (`implementer`, Phase 1) has no corresponding reviewer to validate its output. The relay autonomous pipeline halts at implementation — the COMMAND has no rubric-runner to dispatch; no `code-review.jsonl` audit trail is written; the universal R-X test-modification guard (D9 Layer 0 of the source PRD) is unenforced; and the `TEST_CONTRACT_DISPUTE` arbitration mode (D9 Layers 1–2) has no resolver. Until this agent exists, `/relay-implement` cannot complete its internal loop, `/relay-code-review` has no core logic, and the relay value proposition of an autonomously-governed implementation stage stays broken at its second step. Asking an LLM to review code ad-hoc at run-time produces inconsistent, untraced, non-machine-readable verdicts that drift from the plan's task and AC contract — this phase fixes precisely that gap.

## Solution Statement

Create one new file, `plugins/relay/agents/code-reviewer.md`, modeled on the shipped `plan-reviewer.md` sibling and adapted from the source PRD's D4 / D9 / D10 / D11 design decisions. The frontmatter declares `color: magenta` (unused in the existing palette per D12), `tools: Read, Write, Glob, Grep, Bash, BashOutput` (NO `Edit` per D11), and `model: sonnet`. Hard constraints (8 rules) are stated up-front: no user dialogue; no `Edit` tool; `Write` only for `code-review.jsonl`; `Bash` restricted by prompt to read-only operations; no short-circuit of the rubric; every verdict appended to the jsonl; AC-14 byte-exact halt on missing Decision Gate sources. Phase 0 reads `methodology.md`, the plan (path provided by the COMMAND), the source PRD, and the three Decision Gate sources; halts with the byte-exact AC-14 message on any unreadable source. Phase 1 dispatches to standard mode or arbitration mode based on the input shape the COMMAND provides. Phase 2 (standard mode) runs the eight rubric items in order: R-S1/R-S2/R-S3 (structural — every task addressed, every Files-to-Change row touched, every plan AC-A satisfied); R-L1/R-L2/R-L3 (static — run the plan's Validation Commands Levels 1/2/3 via `Bash` and check exit code + output); R-SEM (semantic — business-rule consistency, bugs, security gaps beyond what automated tests catch); R-X (universal test-modification guard — any test-glob match in the diff without an upheld dispute is a straight fail per D17). Phase 3 (arbitration mode) resolves a `TEST_CONTRACT_DISPUTE` payload and emits one of three verdicts. Phase 4 appends the verdict JSON line to `code-review.jsonl` using the append-only `Read + concat + Write` discipline of `plan-reviewer.md:437–439`. Phase 5 is the handoff message. The agent is single-shot; the loop is the COMMAND's job.

## Metadata

| Key | Value |
|-----|-------|
| Type | New agent file (markdown + YAML frontmatter) |
| Complexity | High — eight rubric items, two modes (standard / arbitration), three dispute-verdict branches, universal R-X guard, append-only jsonl logging; downstream-impacting |
| Systems Affected | `plugins/relay/agents/` (new file); `/relay-implement` (consumer of this agent in the internal loop, Phase 3 of this PRD); `/relay-code-review` (standalone command surface, Phase 4 of this PRD); future `/relay-execute` orchestrator |
| Dependencies | `plugins/relay/agents/implementer.md` (sibling writer — its `IMPLEMENTATION_COMPLETE` and `TEST_CONTRACT_DISPUTE` verdict shapes are what this agent parses); `plugins/relay/agents/plan-reviewer.md` (review-pattern precedent: rubric structure, jsonl append-only discipline, auto-flip on full pass); `docs/context/plan-template.md` (the APPROVED plan this agent reads conforms to this template); `docs/context/methodology.md` (TDD routing read); Decision Gate sources (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`) |
| Estimated Tasks | 5 (one frontmatter + role paragraph + hard constraints; one Phase 0 setup + Decision Gate halt; one Phase 1 mode dispatch + Phase 2 standard-mode rubric; one Phase 3 arbitration mode; one Phase 4 jsonl append + Phase 5 handoff) |
| Source PRD line ref | `PRPs/prds/implementation-authoring.prd.md:259` (row 2) and `:271-274` (Phase 2 details) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/implementation-authoring.prd.md` | 1-374 (entire PRD) | Source contract; D4 (three-layer rubric scope), D9 (R-X / TEST_CONTRACT_DISPUTE / arbitration), D10 (code-review.jsonl schema), D11 (tool allowlist divergence), D12 (color), D17 (straight R-X fail) govern every decision in this agent |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 1-7 (frontmatter); 51-88 (hard constraints); 91-233 (eight-item rubric R1–R8); 400-444 (review.jsonl append-only discipline + schema) | Closest relay-internal reviewer precedent; code-reviewer mirrors the overall shape and the jsonl append discipline; canonical divergences (no `Edit`, two modes, eight different rubric items) are documented in D11 |
| P0 | `plugins/relay/agents/implementer.md` | 1-7 (frontmatter); 59-105 (hard constraints); 108-157 (Phase 0 setup + AC-14 halt pattern) | Sibling writer whose verdicts (`IMPLEMENTATION_COMPLETE`, `TEST_CONTRACT_DISPUTE`) this agent must parse; also the structural precedent for Phase 0 setup and the byte-exact AC-14 halt message shape |
| P0 | `plugins/relay/agents/post-green-reviewer.md` | 1-36 (Decision Gate inline block + role framing); 39-80 (protocol: Step 1 verify, Step 2 identify changed test files via `git diff`, Step 3 per-file scan) | Review-pattern precedent for reading a diff via `git diff` and emitting a structured verdict; R-X test-file detection logic mirrors the pathspecs in Step 2 |
| P1 | `plugins/relay/agents/plan-reviewer.md` | 435-444 (append-only jsonl: Read + concat + Write recipe) | Exact three-step recipe the code-reviewer uses to append to `code-review.jsonl` without truncation |
| P1 | `docs/context/plan-template.md` | 1-60 (relay adaptations; per-task VALIDATE invariant; TDD routing note) | The agent reads an APPROVED plan conforming to this template; the parsing logic in Phase 0 reads the same 14 mandatory sections |
| P1 | `docs/context/methodology.md` | 1-39 (entire file) | Read at Phase 0; the TDD routing note in the Phase 5 handoff reflects the `tdd:` value; R-X universality does NOT depend on this value |
| P2 | `docs/decisions.md` | 188-239 (Command surface, writer/reviewer split); 261-266 (PRPs/ artifact paths); 243-248 (Interactivity boundary) | The three decisions this agent most directly instantiates |

## Patterns to Mirror

### Anchor 1 — Frontmatter shape (reviewer variant)

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:1-7
---
name: plan-reviewer
description: Validate a DRAFT plan against an 8-item structural rubric (R1–R8) derived from PRPs/prds/plan-authoring.prd.md AC-3, AC-4, AC-9, AC-10. Auto-flip DRAFT→APPROVED on rubric pass — no user dialogue (interactivity boundary). Emit CHANGES_REQUESTED bullet list on any failure. Append every verdict to PRPs/plans/<basename>.review.jsonl with all 8 rubric outcomes (no short-circuit). Owns the DRAFT→APPROVED status flip for plans.
model: sonnet
color: cyan
tools: Read, Edit, Write
---
```

The code-reviewer mirrors this exact 5-key frontmatter with adaptations: `name: code-reviewer`; `description:` rewritten to describe the code-reviewer's job (three-layer rubric, R-X universal guard, arbitration mode, jsonl logging, auto-flip on rubric pass); `model: sonnet` preserved; `color: magenta` per D12 (unused in the palette; no collision risk); `tools: Read, Write, Glob, Grep, Bash, BashOutput` per D11 (note: `Edit` is REMOVED — read-only review philosophy enforced at the tool level per D11; `Glob`, `Grep`, `Bash`, `BashOutput` ADDED for diff navigation and lint/type-check execution).

Used by: Task 1.

### Anchor 2 — Phase 0 setup + AC-14 halt pattern

```
# SOURCE: plugins/relay/agents/implementer.md:108-157
## Phase 0 — Setup (internal, no user dialogue)

Before Phase 1, do these reads (all relative to `<target_root>`):

- `docs/context/methodology.md` — capture the `tdd:` value ...
- `<plan_path>` — read end-to-end ...
- The source PRD ...
- The three Decision Gate sources, in this order:
  - `docs/decisions.md`
  - `docs/anti-patterns.md`
  - `docs/context/architecture.md`

If any of those three Decision Gate sources cannot be read, halt
with this exact message (substitute `<missing-file>` and
`<relative-path>`):

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run `/relay-implement`. No
> code has been changed and no review has been run.

Do NOT proceed to Phase 1. Exit.
```

The code-reviewer mirrors this setup pattern exactly, substituting `/relay-implement` with `/relay-code-review` in the halt message (AC-14 of the source PRD specifies this substitution in the standalone-reviewer surface). Phase 0 also reads the COMMAND's input: either (a) the plan path + `mode: "standard"` or (b) the plan path + `mode: "arbitration"` + `dispute_evidence` block from the implementer's `TEST_CONTRACT_DISPUTE` verdict.

Used by: Task 2.

### Anchor 3 — Rubric item structure + no-short-circuit discipline

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:91-106
## The 8-item rubric (derived from AC-3, AC-4, AC-9, AC-10 of the PRD)

For each item, record `pass` or `fail` with a short rationale string
on failure. **Run all 8 on every review — do not short-circuit.**

### R1 — Decision Gate block present, well-formed, first fenced block
...
```

The code-reviewer's rubric has eight items in standard mode (R-S1, R-S2, R-S3, R-L1, R-L2, R-L3, R-SEM, R-X) and one item in arbitration mode (`arbitration` with `verdict ∈ {DISPUTE_REJECTED, DISPUTE_UPHELD_TEST_WRONG, DISPUTE_UPHELD_PRD_AMBIGUOUS}`). The no-short-circuit rule is universal: **all rubric items are evaluated and recorded in the jsonl `rubric[]` array regardless of whether earlier items fail** (AC-10 of the source PRD).

Used by: Task 3.

### Anchor 4 — jsonl append-only discipline (Read + concat + Write)

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:435-444
Append-only discipline:

1. `Read` the existing file if it exists (empty string otherwise).
2. Concatenate existing content + one newline + new JSON line.
3. `Write` the result back.

A missing `PRPs/plans/<basename>.review.jsonl` file is created on
the first verdict. The `Write` target path MUST be under
`<target_root>/PRPs/plans/` — never under `.claude/`.
```

The code-reviewer applies this exact three-step recipe to `PRPs/plans/<basename>.code-review.jsonl`. The schema extends the plan-reviewer's with `attempt`, `mode` (`"standard"` | `"arbitration"`), and optional `dispute_evidence` (per D10 of the source PRD).

Used by: Task 4.

### Anchor 5 — Test-file detection via git diff pathspecs

```
# SOURCE: plugins/relay/agents/post-green-reviewer.md:64-75
git diff --name-only <base_branch>..HEAD -- \
    '**/test_*.py' '**/tests/**/*.py' '**/*.test.ts' '**/*.test.tsx' \
    '**/*.spec.ts' '**/*.spec.tsx' '**/*.test.js' '**/*.spec.js' \
    '**/*_test.go' '**/tests/**/*.rb' '**/*_spec.rb'

Record the list as `changed_test_files`. If empty, skip to Step 4
with no file-level concerns.
```

The code-reviewer's R-X check uses the same pathspec set, extended with `**/__tests__/**`, `**/*.test.rs`, `**/*_test.rs` (per the implementer's Phase 2.3 canonical test-glob list). Any file in the implementer's diff matching these globs without an upheld dispute triggers a straight R-X fail with the file path listed (D17 of the source PRD).

Used by: Task 3.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/code-reviewer.md` | CREATE | Net-new agent file; the reviewer half of the third writer/reviewer pair; implements the three-layer rubric, universal R-X guard, and arbitration mode described in Phase 2 of the source PRD |

## NOT Building (Scope Limits)

- **The `/relay-code-review` command.** That is Phase 4 of this PRD. This phase creates only the agent file; the command surface that invokes it is a separate deliverable.
- **The `/relay-implement` command internal loop.** The retry budget, oscillation detection, diff capture, and D8 post-approval mutations are Phase 3 of this PRD. This agent is single-shot.
- **D8 post-approval mutations** (plan flip, plan move, PRD row update). Exclusively the COMMAND's responsibility per D8 and D11. The agent does NOT perform these mutations even when it emits APPROVED.
- **B7/B8 TDD Writer/Reviewer bounce-back.** On `DISPUTE_UPHELD_TEST_WRONG`, the agent surfaces a deferred-B7/B8 message per D9 Layer 2; the concrete B7/B8 invocation protocol (D14) is not implemented in the MVP.
- **Per-agent Bash allowlist enforcement.** The project's `.claude/settings.json` allowlist is the security gate; the agent's `Bash` is restricted by prompt to read-only operations (lint, type-check, `git diff`/`log`), but the tooling allowlist itself is not managed here (that is the context-builder skill's job per D11).
- **`--dry-run` flag.** Could-item per the PRD; deferred.
- **`--from-attempt <N>` resume flag.** Could-item; deferred.
- **`code-review.jsonl` truncation or rewriting.** The log is append-only forever. No tooling-managed pruning in the MVP.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/agents/code-reviewer.md` — frontmatter, role paragraph, and hard constraints

**ACTION**: CREATE `plugins/relay/agents/code-reviewer.md` with frontmatter (5 keys: `name: code-reviewer`, `description:` [role summary], `model: sonnet`, `color: magenta`, `tools: Read, Write, Glob, Grep, Bash, BashOutput`) and the role-framing prose (agent identity, what it does NOT do, three canonical divergences from `plan-reviewer`), followed by `## Inputs` (listing `plan_path`, `target_root`, `mode`, and the optional `dispute_payload` the COMMAND provides), then the 8 hard-constraint rules:
1. No user dialogue ever.
2. No `Edit` tool — `Write` only for `code-review.jsonl`.
3. `Bash` restricted by prompt to read-only operations (lint, type-check, `git diff`/`log`; explicitly forbidden: `git commit`, `Edit`, `Write` to source files, `rm`, mutations).
4. Run all rubric items; no short-circuit (AC-10 of source PRD).
5. Every verdict appended to `PRPs/plans/<basename>.code-review.jsonl` via the three-step `Read + concat + Write` recipe.
6. AC-14 halt is byte-exact: substitute `/relay-code-review` for the standalone-surface path in the halt message.
7. No `.claude/PRPs/` writes.
8. APPROVED verdict never triggers D8 mutations from this agent; those are the COMMAND's responsibility.

**MIRROR**: Anchor 1 (frontmatter shape) — adapt `plan-reviewer.md:1-7` with `name: code-reviewer`, `color: magenta`, `tools: Read, Write, Glob, Grep, Bash, BashOutput`.

**VALIDATE**: `grep -n "^name: code-reviewer" plugins/relay/agents/code-reviewer.md && grep -n "^color: magenta" plugins/relay/agents/code-reviewer.md && grep -n "^tools: Read, Write, Glob, Grep, Bash, BashOutput" plugins/relay/agents/code-reviewer.md`

### Task 2: APPEND Phase 0 setup + mode-dispatch to `plugins/relay/agents/code-reviewer.md`

**ACTION**: APPEND to `plugins/relay/agents/code-reviewer.md` the `## Phase 0 — Setup` section (mirrors `implementer.md:108-157` with the substitution of `/relay-code-review` in the AC-14 halt message) and the `## Phase 1 — Mode dispatch` section. Phase 1 inspects the `mode` value provided by the COMMAND:
- If `mode == "standard"`: hold the implementer's `IMPLEMENTATION_COMPLETE` verdict shape (or the raw diff, if the COMMAND passed it) for Phase 2 standard-mode rubric. Record the plan path, feature, phase N.
- If `mode == "arbitration"`: hold the `TEST_CONTRACT_DISPUTE` payload `{disputed_tests, prd_refs, claim, proposed_resolution}` for Phase 3. Record `attempt` from the COMMAND input.
- If neither: halt with a structured error: `{ "error": "unknown_mode", "mode": "<value>" }`.

**MIRROR**: Anchor 2 (Phase 0 setup + AC-14 halt pattern) — use `implementer.md:108-157` with substitution.

**VALIDATE**: `grep -n "Phase 0" plugins/relay/agents/code-reviewer.md && grep -n "relay-code-review" plugins/relay/agents/code-reviewer.md && grep -n "mode.*standard.*arbitration\|standard.*mode\|arbitration.*mode" plugins/relay/agents/code-reviewer.md`

### Task 3: APPEND Phase 2 standard-mode rubric and Phase 3 arbitration-mode to `plugins/relay/agents/code-reviewer.md`

**ACTION**: APPEND to `plugins/relay/agents/code-reviewer.md` the `## Phase 2 — Standard-mode rubric` section and the `## Phase 3 — Arbitration mode` section.

Phase 2 standard-mode rubric (all 8 items, no short-circuit):
- **R-S1**: Verify every `### Task <i>:` in the plan's Step-by-Step Tasks is addressed in the implementer's diff (file paths in `files_changed` cover every Files-to-Change row's `**ACTION**:` target).
- **R-S2**: Verify every file in the plan's Files-to-Change table has at least one change in the diff.
- **R-S3**: Verify every `**AC-A<i> (PRD AC-<N>):**` bullet in the plan's Acceptance Criteria has an observable counterpart in the diff (heuristic: the files changed address the stated scope).
- **R-L1**: Run the plan's Level-1 STATIC_ANALYSIS command via `Bash`; pass iff exit code 0.
- **R-L2**: Run the plan's Level-2 CONTENT_INVARIANTS or UNIT_TESTS command via `Bash`; pass iff exit code 0.
- **R-L3**: Run the plan's Level-3 INTEGRATION or DRY-RUN command via `Bash`; pass iff exit code 0.
- **R-SEM**: Evaluate the diff for business-rule consistency, potential bugs, security gaps not caught by the automated levels (Simon Willison 2025-03: logic errors passing compilation are the dangerous class; this is the primary value layer per D4 of source PRD).
- **R-X**: Universal test-modification guard — using the pathspec set from Anchor 5, check whether the diff touches any test-glob file. Straight fail with the file path(s) listed if any match found AND the input `mode` is `"standard"` (not arbitration-post-upheld). D17: no "first warning" grace period.

Phase 3 arbitration mode:
- Read the `TEST_CONTRACT_DISPUTE` payload fields: `disputed_tests`, `prd_refs`, `claim`, `proposed_resolution`.
- Cross-reference `prd_refs` against the source PRD's Acceptance Criteria to verify the citation is real.
- Evaluate the dispute claim against the cited AC-N: is the test actually contradicting the PRD (→ `DISPUTE_UPHELD_TEST_WRONG`), is the PRD ambiguous enough that the test could be read as correct (→ `DISPUTE_UPHELD_PRD_AMBIGUOUS`), or is the claim unsubstantiated (→ `DISPUTE_REJECTED`)?
- Emit one of the three verdicts. On `DISPUTE_UPHELD_TEST_WRONG`: surface the deferred-B7/B8 message per D9 Layer 2 / D14. On `DISPUTE_UPHELD_PRD_AMBIGUOUS`: surface a structured HALT for human PRD update. On `DISPUTE_REJECTED`: the COMMAND must dispatch a mandatory-code next attempt.

**MIRROR**: Anchor 3 (rubric item structure + no-short-circuit) and Anchor 5 (test-file detection via git diff pathspecs).

**VALIDATE**: `grep -n "R-S1\|R-S2\|R-S3\|R-L1\|R-L2\|R-L3\|R-SEM\|R-X" plugins/relay/agents/code-reviewer.md | wc -l`

### Task 4: APPEND Phase 4 jsonl verdict + Phase 5 handoff to `plugins/relay/agents/code-reviewer.md`

**ACTION**: APPEND to `plugins/relay/agents/code-reviewer.md` the `## Phase 4 — Verdict + jsonl append` section and the `## Phase 5 — Handoff` section.

Phase 4:
- Construct the verdict JSON object using D10's schema: `{ timestamp (UTC ISO-8601), attempt (from COMMAND input), verdict ("APPROVED" | "CHANGES_REQUESTED"), mode ("standard" | "arbitration"), rubric[] (one object per rubric item evaluated, with `id`, `passed`, and `reason` on failures), dispute_evidence (only on arbitration mode — full payload), action ("final_flip" | "rubric_fail" | "revalidation_fail"), user_message: "" }`.
- Apply the three-step append-only discipline from Anchor 4: (1) `Read` existing `code-review.jsonl` or empty string; (2) concatenate + newline + new JSON line; (3) `Write` the result to `PRPs/plans/<basename>.code-review.jsonl`. The path MUST resolve under `<target_root>/PRPs/plans/` — never under `.claude/`.
- On APPROVED: set `action: "final_flip"` and note that the COMMAND (not this agent) will perform D8 mutations.
- On CHANGES_REQUESTED: set `action: "rubric_fail"`; include `reason` on every failed rubric item.

Phase 5 (handoff message): emit the verdict summary to the COMMAND:
- APPROVED: list the 8 rubric items all passing, name the `code-review.jsonl` path, state the next step (COMMAND performs D8 mutations).
- CHANGES_REQUESTED: emit a bullet list of failing rubric items by ID + reason (same shape as `plan-reviewer.md` Step 3 CHANGES_REQUESTED branch). Do NOT suggest fixes — that is the COMMAND's job (re-invoke implementer with feedback).

**MIRROR**: Anchor 4 (jsonl append-only discipline).

**VALIDATE**: `grep -n "code-review.jsonl\|Read.*jsonl\|Write.*jsonl\|concat\|append" plugins/relay/agents/code-reviewer.md | head -20`

### Task 5: APPEND `## code-review.jsonl format` reference section to `plugins/relay/agents/code-reviewer.md`

**ACTION**: APPEND to `plugins/relay/agents/code-reviewer.md` a `## code-review.jsonl format` section documenting the schema, the append-only discipline, an example JSON block for both standard-mode APPROVED and arbitration-mode verdicts, and the constraint that the path MUST be under `<target_root>/PRPs/plans/` — mirroring the `## review.jsonl format` section of `plan-reviewer.md:400-444`. Include the extended schema fields: `attempt`, `mode`, `dispute_evidence?`.

**MIRROR**: Anchor 4 (jsonl append-only discipline — `plan-reviewer.md:435-444`).

**VALIDATE**: `grep -n "code-review.jsonl format\|\"attempt\"\|\"mode\"\|\"dispute_evidence\"\|\"timestamp\"\|\"verdict\"\|\"rubric\"" plugins/relay/agents/code-reviewer.md | wc -l`

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Verify the file exists and has valid frontmatter (non-empty name, model, color, tools)
test -f plugins/relay/agents/code-reviewer.md && \
  grep -q "^name: code-reviewer" plugins/relay/agents/code-reviewer.md && \
  grep -q "^model: sonnet" plugins/relay/agents/code-reviewer.md && \
  grep -q "^color: magenta" plugins/relay/agents/code-reviewer.md && \
  grep -q "^tools: Read, Write, Glob, Grep, Bash, BashOutput" plugins/relay/agents/code-reviewer.md && \
  echo "PASS: frontmatter valid" || echo "FAIL: frontmatter missing or malformed"
```

### Level 2 CONTENT_INVARIANTS

```bash
# Verify all mandatory rubric items, mode dispatch, jsonl write pattern, and no Edit tool
grep -q "R-S1" plugins/relay/agents/code-reviewer.md && \
  grep -q "R-S2" plugins/relay/agents/code-reviewer.md && \
  grep -q "R-S3" plugins/relay/agents/code-reviewer.md && \
  grep -q "R-L1" plugins/relay/agents/code-reviewer.md && \
  grep -q "R-L2" plugins/relay/agents/code-reviewer.md && \
  grep -q "R-L3" plugins/relay/agents/code-reviewer.md && \
  grep -q "R-SEM" plugins/relay/agents/code-reviewer.md && \
  grep -q "R-X" plugins/relay/agents/code-reviewer.md && \
  grep -q "DISPUTE_REJECTED" plugins/relay/agents/code-reviewer.md && \
  grep -q "DISPUTE_UPHELD_TEST_WRONG" plugins/relay/agents/code-reviewer.md && \
  grep -q "DISPUTE_UPHELD_PRD_AMBIGUOUS" plugins/relay/agents/code-reviewer.md && \
  grep -q "code-review.jsonl" plugins/relay/agents/code-reviewer.md && \
  grep -q "arbitration" plugins/relay/agents/code-reviewer.md && \
  ! grep -q "^tools:.*Edit" plugins/relay/agents/code-reviewer.md && \
  echo "PASS: content invariants satisfied" || echo "FAIL: content invariants violated"
```

### Level 3 INTEGRATION (dry-run end-to-end)

```bash
# Verify the agent file is parseable as a markdown document with YAML frontmatter
# and that no .claude/ paths appear in the non-quoted body
python3 -c "
import re, sys
content = open('plugins/relay/agents/code-reviewer.md').read()
# Check frontmatter delimiters
assert content.startswith('---'), 'Missing opening frontmatter delimiter'
end = content.index('---', 3)
frontmatter = content[3:end]
assert 'name: code-reviewer' in frontmatter, 'Missing name'
assert 'color: magenta' in frontmatter, 'Missing color'
# Check no bare .claude/PRPs/ paths (allow quoted prohibition references)
body = content[end+3:]
bare = re.findall(r'(?<![\`\'\"])\.claude/PRPs/', body)
assert not bare, f'Bare .claude/PRPs/ reference found: {bare}'
print('PASS: agent file structure and .claude/ prohibition satisfied')
"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-10):** Given the code-reviewer runs in standard mode, when it appends a verdict line to `code-review.jsonl`, then the line's `rubric` array contains exactly 8 entries — one each for R-S1, R-S2, R-S3, R-L1, R-L2, R-L3, R-SEM, R-X — with a boolean `passed` field on each. CHANGES_REQUESTED entries include a non-empty `reason` on every failed item; APPROVED entries set every `passed: true`. No short-circuit regardless of earlier failures (AC-10 of source PRD).

- **AC-A2 (PRD AC-4):** Given any standard-mode code-reviewer run where the implementer's diff touches one or more files matching the test glob (e.g. `**/*.test.ts`, `**/test_*.py`, `**/tests/**`) and the implementer did NOT emit a `TEST_CONTRACT_DISPUTE` verdict, when the code-reviewer evaluates R-X, then R-X fails with a structured reason listing every modified test file path. R-X fires regardless of whether `docs/context/methodology.md` has `tdd: true` or `tdd: false`.

- **AC-A3 (PRD AC-3):** Given the code-reviewer receives a `TEST_CONTRACT_DISPUTE` payload in arbitration mode, when it evaluates the dispute, then it emits exactly one of `{DISPUTE_REJECTED, DISPUTE_UPHELD_TEST_WRONG, DISPUTE_UPHELD_PRD_AMBIGUOUS}` and appends a verdict line with `mode: "arbitration"` and the full `dispute_evidence` block to `code-review.jsonl`. On `DISPUTE_UPHELD_TEST_WRONG`, the deferred-B7/B8 message is surfaced per D9 Layer 2 / D14.

- **AC-A4 (PRD AC-13):** Given the code-reviewer's standard-mode rubric (all 8 items) passes, when the agent emits its verdict, then it auto-emits APPROVED with no user dialogue, no "Aprovar?" prompt, and the verdict is appended to `code-review.jsonl`. The agent does NOT perform D8 mutations (plan flip, plan move, PRD row update) — those are exclusively the COMMAND's responsibility.

- **AC-A5 (PRD AC-14):** Given any of `docs/decisions.md`, `docs/anti-patterns.md`, or `docs/context/architecture.md` cannot be read at Phase 0 setup, when the agent runs, then it halts with the byte-exact message: `"I cannot emit the Decision Gate evidence block without reading <missing-file>. Please ensure the file exists at <target_root>/<relative-path> and re-run /relay-code-review. No code has been changed and no review has been run."` No `code-review.jsonl` line is appended.

- **AC-A6 (PRD AC-9):** Given any invocation of the code-reviewer, when any artifact is written, then the only resolved write path is `PRPs/plans/<basename>.code-review.jsonl`. No path the agent computes or passes to `Write` contains `/.claude/` or starts with `.claude/`. The `Edit` tool is absent from the frontmatter and never used.

- **AC-A7 (PRD AC-12):** Given the agent is invoked in standard mode with no internal loop, when it completes, then it appends exactly one verdict line to `PRPs/plans/<basename>.code-review.jsonl` and surfaces APPROVED or CHANGES_REQUESTED to the COMMAND. The agent does NOT enter a retry loop, does NOT perform D8 mutations, and does NOT modify the plan or PRD.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| R-SEM false positives block legitimate implementations (semantic reviewer over-flags) | M | M | The rubric records each item independently; CHANGES_REQUESTED feedback names the specific R-SEM finding; the developer can hand-edit and re-run `/relay-code-review` as a standalone override. Success metric tracks R-SEM false-positive rate (source PRD Technical Risks, row 4). |
| R-X pathspec mismatch with project's actual test layout causes false negatives (test files missed) or false positives (non-test files flagged) | M | M | Pathspec set mirrors the implementer's Phase 2.3 canonical test-glob list (Anchor 5) — deliberately permissive; false negatives are the dangerous class. Per-project test-glob tuning is a Could-item for the COMMAND layer. |
| `code-review.jsonl` Write overwrites existing content if `Read` returns empty when the file exists (tooling edge case) | L | H | The three-step append discipline (Anchor 4) always `Read`s first; an empty return on an existing file is surfaced as a structured warning; the agent falls back to treating the existing content as empty rather than writing a partial line. |
| Arbitration-mode verdict `DISPUTE_UPHELD_TEST_WRONG` surfaces B7/B8 message but B7/B8 agents do not yet exist in MVP | M | M | The deferred-B7/B8 message is explicitly a structured placeholder per D14 of the source PRD; the agent surfaces the message verbatim and halts structurally. The COMMAND (Phase 3) documents this as an expected halt outcome in its precondition list. |
| jsonl schema drift between this agent and what the COMMAND (Phase 3 / Phase 4) parses | M | H | D10 codifies the schema verbatim in the source PRD; this plan's Phase 4 step and the companion command plans both reference the same D10 schema. A schema change requires updating D10 in the decisions log. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Color selection (magenta):** `color: magenta` is currently unused in the relay agent palette (per D12 of the source PRD: `plan-writer = orange`, `plan-reviewer = cyan`, `prd-writer = blue`, `prd-reviewer = teal`, `test-runner = coral`, `post-green-reviewer = green`, `implementer = green`). Magenta provides clear visual differentiation in the `/agents` list with no collision risk.

**`Edit` tool absence is a tool-level invariant, not just a prose constraint:** Omitting `Edit` from the frontmatter `tools:` list means the COMMAND layer cannot accidentally invoke it against this agent. This is the canonical divergence from `plan-reviewer` (which has `Edit` for its status-flip) documented in D11 of the source PRD. The code-reviewer's `Write` tool is exclusively scoped to `code-review.jsonl` by prompt discipline.

**Dogfood opportunity:** This agent is itself a deliverable of the Implementation Authoring PRD. Once Phase 3 (`/relay-implement`) ships, the code-reviewer agent will be the first agent to review its own sibling (the implementer's diff). Telemetry from those first runs will surface whether R-SEM false-positive rates or R-X pathspec gaps need tuning (source PRD Success Metrics table).

*Generated: 2026-04-28*
*Approved: 2026-04-28*
*Status: APPROVED*
