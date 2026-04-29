# Feature: implementer agent (Phase 1 of implementation-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent file in `plugins/relay/agents/`; cross-cutting artifact creation (downstream pipeline depends on this agent); third writer/reviewer pair of Pillar 2 (after PRD pair and Plan pair); impacts the future `/relay-execute` orchestrator and the existing Test Runner / post-green-reviewer
- Decisions found:
  - [2026-04-19] Command surface: writer/reviewer split — `implementer` is the writer half of the third pair; the `code-reviewer` agent (Phase 2 of this PRD) is the reviewer half. The internal loop lives in `/relay-implement`, not in the agent.
  - [2026-04-19] PRP artifacts under `PRPs/`, never `.claude/` — implementer's per-attempt `diff.patch` is captured by the COMMAND under `PRPs/reports/<feature>/phase-<N>/attempts/<i>/`, not by the agent. The agent's only file-system surface is `Edit`/`Write` on source files in the working tree.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — implementer runs without user dialogue. No "Aprovar?" gate; no clarifying questions; no resume-where-you-left-off prompts.
  - [2026-04-19] Keep upstream `prp-core` as reference, not active relay code — `plugins/prp-core/commands/prp-implement.md` is the section-shape reference (Phase 0 DETECT / Phase 1 LOAD / Phase 3 EXECUTE / Phase 4 VALIDATE structure adapted); never imported, never `Read`-into-output verbatim.
  - [2026-04-19] TDD activation by explicit declaration only — implementer reads `docs/context/methodology.md` `tdd:` value and emits the byte-exact routing string. The universal R-X test-modification guard (D9 Layer 0 of the source PRD) applies REGARDLESS of `tdd:` value; this is enforced by the code-reviewer rubric, not the implementer.
  - [2026-04-19] `max_test_retries = 3` semantic precedent — counts attempts after the initial run, 0 forbidden; the source PRD's `max_implement_retries = 3` mirrors this shape, but the agent itself is single-attempt — the loop lives in `/relay-implement`.
  - [2026-04-25] Plan filenames carry source PRD phase number and slug — implementer parses `<feature>` and `<N>` from the plan filename pattern `<feature>-phase-<N>-<slug>.plan.md` for any path computations it surfaces (e.g., naming the source PRD path; the `diff.patch` path is the COMMAND's responsibility per D2).
- Applicable anti-patterns:
  - Weakening or deleting tests to make the auto-correction loop turn green — implementer MUST emit `TEST_CONTRACT_DISPUTE` when it believes a test contradicts the PRD; it MUST NOT silently edit a test file. The R-X rubric in the code-reviewer (Phase 2) catches violations.
  - Writing pipeline artifacts under `.claude/` — the agent's `Edit`/`Write` targets are source files in the working tree (which may or may not include `.claude/settings.json` in the rare case the plan touches it). The agent NEVER writes to `.claude/PRPs/`. Plan/PRD mutations and the `diff.patch` audit artifact are the COMMAND's responsibility, not the agent's.
  - Treating `plugins/prp-core/` as active relay code — `prp-implement.md` is studied for section shape; never imported; never cited in the implementer's output.
  - Relying on interactive permission prompts in the autonomous loop — the agent runs without prompts; `Bash` is open at the agent layer per D11 of the source PRD; the project's `.claude/settings.json` allowlist is the security gate.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — implementer is the writer half of the third writer/reviewer pair (after PRD pair and Plan pair).
  - Interactivity boundary — autonomous from PRD-APPROVED onward.
  - PRPs/ artifact path convention — the agent does not produce a pipeline artifact directly; the command captures `git diff <base-commit>` after the agent returns.
  - Writer/reviewer split — every stage post-PRD has two independently invokable commands; this agent file is the writer half.
  - "Graceful degradation is mandatory" (D3 of the source PRD) — the agent works in the cwd's working tree; it does not assume a worktree at `.worktrees/<feature>/`.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/implementation-authoring.prd.md` — Implementation Phases row 1: "implementer agent" — Goal: Implement the autonomous plan→code transformation with `TEST_CONTRACT_DISPUTE` escape valve. — Success signal: Given a sample APPROVED plan with 3 Step-by-Step Tasks and 3 Validation Commands, manual invocation of the agent (passing the plan path and a worktree) produces a working tree diff that addresses every task, all VALIDATE commands pass on first run, and the agent emits the structured handoff message naming the changed files.

## Summary

This phase delivers a single new agent file at `plugins/relay/agents/implementer.md` — the writer half of the relay implementation stage. The agent reads `docs/context/methodology.md`, the APPROVED plan, and the source PRD; executes the plan's Step-by-Step Tasks in order via `Edit`/`Write` directly in the working tree (D2); runs the plan's Validation Commands at Levels 1–3 after all tasks complete (D6); and returns either a structured success handoff (naming the changed files and the validation outcome) or a `TEST_CONTRACT_DISPUTE` verdict carrying `{disputed_tests, prd_refs, claim, proposed_resolution}` (D9 Layer 1) when an existing test appears to contradict the PRD. The agent is single-attempt — the writer↔reviewer loop, oscillation detection, dual budget envelope, per-attempt `diff.patch` capture, and post-approval mutations (D8) all live in `/relay-implement` (Phase 3 of this PRD), not here. The agent file shape mirrors the proven `plan-writer.md` sibling: same frontmatter style (`name`, `description`, `model: sonnet`, `color: green`, `tools` per D11 — minus `Task` per D11 to forbid re-grounding); same Phase 0 setup pattern (read methodology + plan + source PRD + Decision Gate sources, halt with the byte-exact AC-14 message if any of the three Decision Gate sources is unreadable); same fenced six-line Decision Gate evidence block emission contract (the agent does not emit this block from its own Phase 0 — the command does — but the agent's halt message is byte-symmetric with `plan-writer`'s Phase 3.1 halt). The novel parts are: the `TEST_CONTRACT_DISPUTE` structured verdict (no public precedent — designed from first principles per D9), the per-task execute-then-aggregate-validate discipline (D6 vs `prp-implement`'s per-task type-check loop), and the "no `Task`" tool constraint (D11 — re-grounding forbidden).

## User Story

```
As the future `/relay-implement` command (and as the relay developer hand-invoking this agent during Pilar 2 dogfood)
I want a single autonomous agent that consumes one APPROVED plan and produces working-tree code (or a structured dispute verdict) without prompting me
So that the writer↔reviewer internal loop in `/relay-implement` has a deterministic, single-shot writer to call per attempt — and so that the relay autonomous pipeline (`/relay-execute`) has a real artifact producer to invoke after plan-APPROVED, unblocking the Test Runner step of Pilar 2
```

## Problem Statement

Without an autonomous code producer between an APPROVED plan and the Test Runner, the relay pipeline halts at plan-APPROVED — the autonomous portion that was supposed to run untouched is broken at its third step. The writer half of the implementation stage's writer/reviewer pair does not yet exist as a Claude Code agent file; until it does, `/relay-implement` cannot dispatch a writer to execute the plan, the Test Runner has no working tree to operate on, and the relay value proposition (one prompt → PR) stays hypothetical. Asking an LLM to implement inline at run-time produces unreliable, untraceable, ungoverned changes that drift from the plan's atomic-task contract — this phase fixes precisely that gap by codifying the implementer agent's contract: what it reads, what it executes, what it returns, and what it MUST NOT do (silently edit tests, re-ground via research subagents, prompt the user, write under `.claude/PRPs/`, fill mandatory plan slots with plausible filler).

## Solution Statement

Create one new file, `plugins/relay/agents/implementer.md`, modeled byte-for-byte on the section shape of the shipped `plan-writer.md` sibling agent and adapted from `prp-core/commands/prp-implement.md`'s six-phase structure (DETECT / LOAD / PREPARE / EXECUTE / VALIDATE / REPORT) with relay-specific divergences: no `Task` tool (D11), no PRP-archive logic (the COMMAND owns D8 mutations), no inline test edits (universal R-X applies — implementer MUST emit `TEST_CONTRACT_DISPUTE` instead), and aggregate-validation-after-all-tasks (D6, not per-task). The frontmatter declares `color: green` (note the documented collision with `post-green-reviewer` per the source PRD's D12 — accepted in MVP; swap to `lime` if dogfood surfaces confusion) and `tools: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash` (no `Task`). Hard constraints (8 rules) are stated up-front so a reader can predict every failure mode before reading the phase prose. Phase 0 reads the four canonical inputs (`methodology.md`, plan, source PRD, three Decision Gate sources) with the byte-exact AC-14 halt message on any unreadable Decision Gate source. Phase 1 parses the plan's Step-by-Step Tasks, Files to Change, Validation Commands, Acceptance Criteria, and Patterns to Mirror. Phase 2 executes tasks in order via `Edit`/`Write` (no `Read`-then-rewrite shortcuts; preserve byte-equality of unchanged regions). Phase 3 runs Validation Commands Levels 1–3 via `Bash` after all tasks complete (D6) and captures their stdout/stderr for the verdict. Phase 4 emits one of two structured verdicts: `IMPLEMENTATION_COMPLETE` (with the list of changed files + Validation Levels passing) or `TEST_CONTRACT_DISPUTE` (with `{disputed_tests, prd_refs, claim, proposed_resolution}` per D9 Layer 1). Phase 5 is the handoff message naming the verdict and the next-step expectation. The agent is single-attempt; the loop is the COMMAND's job.

## Metadata

| Key | Value |
|-----|-------|
| Type | New agent file (markdown + YAML frontmatter) |
| Complexity | Medium — single file, but contract is precise and downstream-impacting |
| Systems Affected | `plugins/relay/agents/` (new file); `/relay-implement` (consumer, Phase 3 of this PRD); `code-reviewer` agent (sibling, Phase 2 of this PRD); future `/relay-execute` orchestrator |
| Dependencies | `docs/context/plan-template.md` (canonical plan shape the agent parses); `docs/context/methodology.md` (TDD routing read); `docs/decisions.md` + `docs/anti-patterns.md` + `docs/context/architecture.md` (Decision Gate sources); `plugins/relay/agents/plan-writer.md` (sibling structural precedent); `plugins/prp-core/commands/prp-implement.md` (section shape reference) |
| Estimated Tasks | 5 (one frontmatter + role paragraph; one Phase 0 + Hard constraints; one Phase 1 plan parse; one Phase 2 + Phase 3 execute+validate; one Phase 4 verdict + Phase 5 handoff) |
| Source PRD line ref | `PRPs/prds/implementation-authoring.prd.md:258` (row 1) and `:266-269` (Phase 1 details) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/implementation-authoring.prd.md` | 1-374 (entire PRD) | Source contract; D1–D18 codify every design decision the agent must respect |
| P0 | `plugins/relay/agents/plan-writer.md` | 1-7 (frontmatter); 45-95 (Hard constraints); 99-118 (Phase 0); 256-261 (halt message); 297-310 (Decision Gate format) | Structural sibling — the implementer mirrors this file's section order, frontmatter shape, hard-constraints discipline, and halt-message style |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 76-80 (status-flip Edit pattern with byte-exact `old_string`/`new_string`) | Status-flip discipline (the implementer does NOT flip status — that's the COMMAND — but the byte-exact-Edit discipline is the same; the agent's `Edit` calls inside Phase 2 follow this same "narrow `old_string`, full match" pattern to avoid accidental rewrites of unrelated regions) |
| P0 | `plugins/prp-core/commands/prp-implement.md` | 26-302 (Phase 0 DETECT through Phase 5 REPORT) | Section-shape reference per D13; the implementer's six phases map onto these but DROP Phase 5 archive (COMMAND's job per D8) and Phase 2 git-state (D3 graceful degradation) |
| P0 | `docs/context/plan-template.md` | 1-272 (entire template) | The agent parses an APPROVED plan that conforms to this template; the parsing logic in Phase 1 of the agent reads the same 14 mandatory sections |
| P1 | `docs/context/methodology.md` | 1-39 (entire file) | Read at Phase 0 to extract `tdd:` value; the implementer's handoff message names the value verbatim per D9 Layer 0 universality |
| P1 | `docs/decisions.md` | 188-239 (Command surface decision); 261-266 (PRPs/ artifact paths); 243-248 (Interactivity boundary); 35-40 (TDD opt-in); 44-59 (max_test_retries semantics) | Decisions the agent's contract concretely depends on |
| P1 | `docs/anti-patterns.md` | 60-66 (no .claude/ writes); 14-21 (no test weakening); 70-76 (no prp-core import) | The three anti-patterns the agent's hard constraints encode |
| P2 | `plugins/relay/agents/test-runner.md` | 101-129 (per-attempt artifact layout `PRPs/reports/<feature>/attempts/<N>/`) | Symmetry reference for the COMMAND's `phase-<N>/attempts/<i>/diff.patch` path (the agent itself does not write here, but the path shape is part of the surrounding contract) |

## Patterns to Mirror

### Anchor 1 — Frontmatter shape

```
# SOURCE: plugins/relay/agents/plan-writer.md:1-7
---
name: plan-writer
description: Autonomously transform an APPROVED PRD into a per-phase DRAFT plan. Parse the PRD's Implementation Phases table, select the next pending phase whose dependencies are complete, dispatch relay research subagents in parallel, consult the Decision Gate sources, and write a DRAFT plan to PRPs/plans/<feature>-phase-<N>-<slug>.plan.md while back-filling the source PRD's row N (pending → in-progress, PRP Plan cell populated). Runs without user dialogue. Never approves its own output — the plan-reviewer agent owns the DRAFT→APPROVED flip.
model: sonnet
color: orange
tools: Task, Read, Write, Edit, Glob
---
```

The implementer mirrors this exact 5-key frontmatter with adaptations: `name: implementer`; `description:` rewritten to describe the implementer's job; `model: sonnet` preserved; `color: green` per D12 (collision with `post-green-reviewer` accepted in MVP); `tools: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash` per D11 (note: `Task` is REMOVED — re-grounding forbidden; `Bash`/`BashOutput`/`KillBash` ADDED for Validation Commands execution).

Used by: Task 1.

### Anchor 2 — Phase 0 setup pattern (no user dialogue, multiple reads, halt-on-missing)

```
# SOURCE: plugins/relay/agents/plan-writer.md:99-118
## Phase 0 — Setup (internal, no user dialogue)

Before Phase 1, do these reads:

- `<target_root>/docs/context/methodology.md` — capture the `tdd:`
  value for later. If the file is absent, record "methodology.md not
  present" and default the TDD routing note to the methodology-missing
  verbatim string (Step 4.4); do NOT halt.
- `<prd_path>` — read end-to-end and hold the content in context.
  In particular, locate and remember:
  - The PRD title (line 1, after `# `).
  - The feature kebab-slug (the basename of `<prd_path>` minus
    the `.prd.md` suffix). Example: `plan-authoring.prd.md` →
    `plan-authoring`.
```

The implementer mirrors this Phase 0 shape: read `methodology.md` (capture `tdd:` for the handoff message); read the APPROVED plan end-to-end (capture the title, the source PRD path embedded in `## Source PRD`, the Step-by-Step Tasks, the Files to Change rows, the Validation Commands Levels 1–3, the Acceptance Criteria, and the Patterns to Mirror snippets); read the source PRD end-to-end (for AC-N traceability and for the source PRD basename used in `<feature>` derivation); read the three Decision Gate sources. Halt with the byte-exact AC-14 message if any of the three Decision Gate sources is unreadable.

Used by: Task 2.

### Anchor 3 — Decision Gate halt message (byte-exact, symmetric across writer agents)

```
# SOURCE: plugins/relay/agents/plan-writer.md:256-261
> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run `/relay-plan`. No DRAFT
> has been written.
```

The implementer's halt message is a byte-symmetric adaptation: substitute `/relay-plan` → `/relay-implement` (or `/relay-code-review` per AC-14 in the source PRD); substitute "No DRAFT has been written." → "No code has been changed and no review has been run." Per source PRD AC-14, this exact form is mandated.

Used by: Task 2.

### Anchor 4 — Decision Gate fenced six-line block format

```
# SOURCE: plugins/relay/agents/plan-writer.md:297-310
**Decision Gate**
- Active context: {path or "none"}
- Activated criteria: {semicolon-separated list}
- Decisions found:
  - {decision 1}
  - {decision 2}
- Applicable anti-patterns:
  - {anti-pattern 1}
- Applicable architectural rules:
  - {rule 1}
- Result: {PROCEED | HALT (reason)}
```

This block is emitted by the COMMAND (`/relay-implement`), not the agent — but the agent file documents the contract so a reader can predict the surrounding command's behavior. Plan-reviewer rubric R1 (and code-reviewer R-S* by analogy) fails any artifact missing this block.

Used by: Task 2 (the agent file references this format inside its Hard constraints rather than emitting it).

### Anchor 5 — Status-flip Edit discipline (byte-exact `old_string`/`new_string`, no rewrite)

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:76-80
- `old_string`: `*Status: DRAFT*`
- `new_string`: `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`
where `<YYYY-MM-DD>` is today's date (UTC). Use `Edit` to
preserve the rest of the file byte-for-byte.
```

The implementer's `Edit` calls inside Phase 2 (per-task source-file edits) follow the same "narrow `old_string`, full match, no rewrite of unrelated regions" discipline — even though the implementer does NOT perform the trailing-block flip (that is the COMMAND's job per D8). The discipline is identical: every `Edit` carries enough context to be unambiguous, and the agent never falls back to `Write` for files it could `Edit`.

Used by: Task 4.

### Anchor 6 — prp-core six-phase structure (reference-only, adapted)

```
# SOURCE: plugins/prp-core/commands/prp-implement.md:26-302
## Phase 0: DETECT
## Phase 1: LOAD - Read the Plan
## Phase 2: PREPARE
## Phase 3: EXECUTE - Implement Tasks
## Phase 4: VALIDATE - Full Verification
## Phase 5: REPORT - Create Implementation Report
  mkdir -p .claude/PRPs/reports  ← relay adapts path to PRPs/reports/
```

The implementer adapts this six-phase shape with three relay-specific divergences (per D13 of the source PRD):
1. Phase 2 (PREPARE git-state) is DROPPED — graceful degradation per D3 means the agent works in the cwd's working tree without assuming a worktree at `.worktrees/<feature>/`.
2. Phase 5 (REPORT + archive plan to `.claude/PRPs/plans/completed/`) is DROPPED — the COMMAND owns D8 mutations, and the relay equivalent path is `PRPs/plans/completed/` (no `.claude/` per the universal anti-pattern).
3. Phase 4 (VALIDATE) runs Levels 1–3 only after ALL tasks complete (D6 aggregate validation), not interleaved with task execution as in the upstream.

Used by: Task 3 (Phase 1 plan parse aligns with upstream's Phase 1 LOAD), Task 4 (Phase 2 EXECUTE), Task 5 (Phase 3 VALIDATE + Phase 4 verdict).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/implementer.md` | CREATE | The single new file this phase delivers — the implementer agent's full Claude Code agent definition (frontmatter + role paragraph + 8 hard constraints + Phase 0 setup + Phase 1 plan parse + Phase 2 task execution + Phase 3 validation + Phase 4 verdict + Phase 5 handoff). No other files are touched in Phase 1 of the source PRD. |

The source PRD's Phase 1 details (line 268 of `PRPs/prds/implementation-authoring.prd.md`) explicitly scope this phase to "Single file `plugins/relay/agents/implementer.md`". Sibling agent (`code-reviewer.md`), command files (`/relay-implement`, `/relay-code-review`), and docs updates are Phases 2, 3, 4, 5 of the source PRD respectively — out of scope here.

## NOT Building (Scope Limits)

Drawn from the source PRD's "What We're NOT Building" section, filtered to this phase:

- **The internal writer↔reviewer loop.** The agent is SINGLE-ATTEMPT. The loop, retry budget (`max_implement_retries = 3`), wall-clock budget (`max_implement_minutes = 45`), dispute cap (`max_disputes_per_session = 2`), and oscillation detection all live in `/relay-implement` (Phase 3 of the source PRD).
- **Per-attempt `diff.patch` capture.** The COMMAND captures `git diff <base-commit>` after each agent invocation, NOT the agent.
- **D8 post-approval mutations.** Plan trailing-block flip (`*Status: APPROVED*` → `*Implemented: <date>*\n*Status: IMPLEMENTED*`), plan move to `PRPs/plans/completed/`, source PRD row N flip from `in-progress` to `complete` — all owned by the COMMAND, not the agent.
- **`code-review.jsonl` writes.** Owned by the `code-reviewer` agent (Phase 2 of the source PRD).
- **TDD bounce-back to B7/B8.** Deferred opt-in. The implementer's `TEST_CONTRACT_DISPUTE` carries the `{disputed_tests, prd_refs, claim, proposed_resolution}` block; downstream consumers (the `code-reviewer` arbitration mode and, eventually, `/relay-execute`) handle the bounce-back per D14.
- **Decision Gate fenced block emission.** The agent's Phase 0 READS the three Decision Gate sources and HALTS on any unreadable source, but the actual six-line fenced block is emitted by the COMMAND at command invocation. The agent file documents the contract for a reader, but the agent's output does not contain the block.
- **Re-grounding via research subagents.** The implementer has NO `Task` tool per D11. The plan is the source of truth; the plan-writer's research grounding is what fed the plan; re-grounding at implementation time would defeat the contract.
- **Browser / Database / Manual validation Levels 4–6.** The agent's Validation phase runs Levels 1–3 only (D6). If the plan body includes Levels 4–6, the agent reports them as "not part of the agent contract" and skips them; the surrounding pipeline (or a human) handles those manually.
- **`--dry-run` flag.** Could-item per the source PRD; deferred. The agent does not branch on a dry-run mode.
- **`--from-attempt <N>` resume flag.** Could-item; deferred. The agent has no awareness of attempt history; that is the COMMAND's bookkeeping.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/agents/implementer.md` frontmatter + role paragraph

- **ACTION**: Create the new file `plugins/relay/agents/implementer.md` with the YAML frontmatter (`name: implementer`, `description:` describing the agent's role in 1–3 sentences mirroring `plan-writer.md`'s description style, `model: sonnet`, `color: green`, `tools: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash`) followed by a one-paragraph role description and a compact "You do NOT..." block mirroring `plan-writer.md` lines 9–28. Note in the role paragraph that `color: green` collides with `post-green-reviewer` per D12 of the source PRD; document the collision inside the file as a comment so a future maintainer can swap to `lime` if dogfood surfaces confusion.
- **MIRROR**: Anchor 1 (frontmatter shape) — `plugins/relay/agents/plan-writer.md:1-7`.
- **VALIDATE**: `head -n 7 plugins/relay/agents/implementer.md | grep -E '^(name|description|model|color|tools):' | wc -l` returns `5` AND `grep -c '^tools: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash$' plugins/relay/agents/implementer.md` returns `1` AND `grep -c '^Task' plugins/relay/agents/implementer.md` returns `0` for the frontmatter region (no `Task` tool listed).

### Task 2: ADD Hard constraints + Phase 0 Setup section

- **ACTION**: Append the "Hard constraints (read before anything else)" section (8 numbered constraints) and the `## Phase 0 — Setup (internal, no user dialogue)` section to `plugins/relay/agents/implementer.md`. The 8 hard constraints are: (1) byte-exact verdict shapes for `IMPLEMENTATION_COMPLETE` and `TEST_CONTRACT_DISPUTE`; (2) no user dialogue ever; (3) no `Task` tool — re-grounding forbidden; (4) no test-file edits without an upheld dispute (universal R-X reminder, even though enforcement lives in the code-reviewer); (5) no writes under `.claude/PRPs/`; (6) no overwriting an APPROVED plan or PRD; (7) Validation Levels 1–3 run after ALL tasks (D6), never per-task; (8) byte-exact AC-14 halt message if any of the three Decision Gate sources is unreadable. Phase 0 reads four canonical inputs: methodology.md (capture `tdd:`), the APPROVED plan end-to-end, the source PRD end-to-end, and the three Decision Gate sources (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`); halt with the byte-exact AC-14 message if any Decision Gate source is unreadable.
- **MIRROR**: Anchor 2 (Phase 0 setup) — `plugins/relay/agents/plan-writer.md:99-118`. Anchor 3 (halt message) — `plugins/relay/agents/plan-writer.md:256-261`. Anchor 4 (Decision Gate format) — `plugins/relay/agents/plan-writer.md:297-310`.
- **VALIDATE**: `grep -c '^## Phase 0' plugins/relay/agents/implementer.md` returns `1` AND `grep -cE 'Hard constraints|Phase 0' plugins/relay/agents/implementer.md` returns at least `2` AND `grep -c 'I cannot emit the Decision Gate evidence block without reading' plugins/relay/agents/implementer.md` returns `1` (the byte-exact AC-14 halt prefix is present) AND `grep -c 'No code has been changed and no review has been run.' plugins/relay/agents/implementer.md` returns `1` (the byte-exact AC-14 halt suffix per the source PRD is present).

### Task 3: ADD Phase 1 — Plan parse + invariants

- **ACTION**: Append `## Phase 1 — Plan parse + invariants` to `plugins/relay/agents/implementer.md`. The phase parses the APPROVED plan (already read in Phase 0) and extracts: Step-by-Step Tasks (≥3 atomic tasks each with a `VALIDATE:` line per `plan-template.md`); Files to Change (table rows: file, action, justification); Validation Commands Levels 1–3 (each with a non-empty shell command); Acceptance Criteria (every bullet referencing a PRD AC-N); Patterns to Mirror (snippets each anchored on a real `file:line`). Plan invariants the implementer asserts before proceeding: at least 3 atomic tasks (else HALT with a structured error naming the missing-task count); every task has a non-empty `VALIDATE:` command; at least 1 Files-to-Change row; the plan ends with `*Status: APPROVED*` (HALT if not). Compute `<feature>` and `<N>` from the plan filename pattern `<feature>-phase-<N>-<slug>.plan.md` for any path computations the agent surfaces in its handoff message.
- **MIRROR**: Anchor 6 (prp-core Phase 1 LOAD shape) — `plugins/prp-core/commands/prp-implement.md:26-302` (Phase 1 LOAD section adapted; relay drops the upstream's `.claude/PRPs/plans/` archive logic per D13).
- **VALIDATE**: `grep -c '^## Phase 1' plugins/relay/agents/implementer.md` returns `1` AND `grep -cE 'Step-by-Step Tasks|Files to Change|Validation Commands|Acceptance Criteria|Patterns to Mirror' plugins/relay/agents/implementer.md` returns at least `5` (every plan section the implementer parses is named at least once) AND `grep -c '<feature>-phase-<N>-<slug>.plan.md' plugins/relay/agents/implementer.md` returns at least `1` (filename-pattern parse documented).

### Task 4: ADD Phase 2 — Task execution loop

- **ACTION**: Append `## Phase 2 — Task execution (Edit/Write in working tree)` to `plugins/relay/agents/implementer.md`. The phase iterates each Step-by-Step Task in the plan's order. For each task: (a) read the task's `**ACTION**:` line, the `**MIRROR**:` reference (find the anchor in `## Patterns to Mirror`), and the `**VALIDATE**:` command (held for Phase 3, NOT run per-task per D6); (b) apply the action via `Edit` (preferred — narrow `old_string`/`new_string` per the plan-reviewer status-flip discipline) or `Write` (only when CREATEing a file or when the rewrite is total); (c) record the file path in an internal "files changed" set for the handoff message; (d) move on. The agent NEVER `Read`-then-rewrites a file with `Write` when an `Edit` would suffice (preserves byte-equality of unchanged regions). The agent NEVER edits a file matching the project's test glob (universal R-X reminder; if the plan ASKS to edit a test, that is itself a CHANGES_REQUESTED-grade defect against the plan, NOT something the implementer silently obeys — the implementer halts with a structured error naming the offending plan task and the test-glob match).
- **MIRROR**: Anchor 5 (status-flip Edit discipline) — `plugins/relay/agents/plan-reviewer.md:76-80`. Anchor 6 (prp-core Phase 3 EXECUTE) — `plugins/prp-core/commands/prp-implement.md:26-302`.
- **VALIDATE**: `grep -c '^## Phase 2' plugins/relay/agents/implementer.md` returns `1` AND `grep -cE 'Edit|Write' plugins/relay/agents/implementer.md` returns at least `2` AND `grep -c '## Patterns to Mirror' plugins/relay/agents/implementer.md` returns at least `1` (Patterns to Mirror anchor lookup documented) AND `grep -ciE 'test glob|test file|R-X' plugins/relay/agents/implementer.md` returns at least `1` (universal R-X reminder is present in Phase 2).

### Task 5: ADD Phase 3 — Validation execution + Phase 4 verdict + Phase 5 handoff

- **ACTION**: Append three sections in sequence to `plugins/relay/agents/implementer.md`:
  - `## Phase 3 — Validation execution (Levels 1–3, after all tasks)` — after every Step-by-Step Task in Phase 2 has been executed, run the plan's Validation Commands Level 1 (STATIC_ANALYSIS / lint / type-check / markdown-lint), Level 2 (CONTENT_INVARIANTS / unit-tests), Level 3 (INTEGRATION / dry-run end-to-end) via `Bash`; capture stdout + stderr + exit code per Level. Per D6, validation is aggregate and runs after all tasks — NEVER per-task. Levels 4–6 if present in the plan body are reported as "not part of the agent contract" and skipped (D6 + the "NOT Building" item on Levels 4–6).
  - `## Phase 4 — Verdict` — emit one of two structured verdicts: (a) `IMPLEMENTATION_COMPLETE` carrying `{files_changed: [...], validation: {level_1: PASS|FAIL, level_2: PASS|FAIL, level_3: PASS|FAIL}, validation_outputs: {level_1: "...", level_2: "...", level_3: "..."}}` — emit when all tasks executed without an R-X-grade failure, regardless of whether Validation Levels passed (the COMMAND, not the agent, decides whether to retry or HALT based on the Validation outcome); or (b) `TEST_CONTRACT_DISPUTE` carrying `{disputed_tests: [...], prd_refs: [...], claim: "...", proposed_resolution: "..."}` per D9 Layer 1 — emit when the implementer's analysis of the plan + the existing test suite + the source PRD reveals what it believes is a test-vs-PRD contradiction. The verdict is the agent's final structured output before Phase 5.
  - `## Phase 5 — Handoff message` — emit a single human-readable confirmation message naming the verdict, the files changed (or the disputed tests), the Validation Levels outcome, and the next-step expectation: "/relay-implement will capture the diff, dispatch the code-reviewer, and decide on retry, dispute arbitration, or D8 mutations." Per D9 Layer 0 universality, the handoff message ALSO names the current `tdd:` value verbatim.
- **MIRROR**: Anchor 6 (prp-core Phase 4 VALIDATE + Phase 5 REPORT) — `plugins/prp-core/commands/prp-implement.md:26-302` (relay drops the upstream's archive-plan logic per D13).
- **VALIDATE**: `grep -c '^## Phase 3' plugins/relay/agents/implementer.md` returns `1` AND `grep -c '^## Phase 4' plugins/relay/agents/implementer.md` returns `1` AND `grep -c '^## Phase 5' plugins/relay/agents/implementer.md` returns `1` AND `grep -cE 'IMPLEMENTATION_COMPLETE|TEST_CONTRACT_DISPUTE' plugins/relay/agents/implementer.md` returns at least `2` (both verdict types named) AND `grep -c 'disputed_tests' plugins/relay/agents/implementer.md` returns at least `1` (D9 Layer 1 evidence shape present) AND `grep -c 'tdd:' plugins/relay/agents/implementer.md` returns at least `1` (TDD routing surfaced in handoff per D9 Layer 0).

## Validation Commands

### Level 1 — STATIC_ANALYSIS (markdown / YAML lint)

```bash
# A: Markdown structural sanity — file exists, has at least 50 lines, ends with a newline
test -f plugins/relay/agents/implementer.md && \
  test "$(wc -l < plugins/relay/agents/implementer.md)" -ge 50 && \
  tail -c 1 plugins/relay/agents/implementer.md | od -An -c | grep -q '\\n'

# B: YAML frontmatter parses (uses python's yaml; falls back to grep-only if python is unavailable)
python -c "import sys, yaml; t=open('plugins/relay/agents/implementer.md').read(); p=t.split('---',2); yaml.safe_load(p[1]); print('OK')" 2>/dev/null \
  || (head -n 7 plugins/relay/agents/implementer.md | grep -E '^(name|description|model|color|tools):' | wc -l | grep -q '^5$')

# C: No `.claude/PRPs/` substring in the file body (universal anti-pattern guard;
# the literal string may appear inside a quoted prohibition reference, but never
# as a path the agent would write to — guard checks for any non-quoted occurrence)
! grep -nE '^[^>`].*\.claude/PRPs/' plugins/relay/agents/implementer.md
```

### Level 2 — CONTENT_INVARIANTS (grep checks for the agent's contract)

```bash
# D: Frontmatter declares the exact tool set per D11 (Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash) and NO Task tool
grep -c '^tools: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash$' plugins/relay/agents/implementer.md | grep -q '^1$'
! grep -E '^tools:.*\bTask\b' plugins/relay/agents/implementer.md

# E: All five phases (0–5) are present as `## Phase N` headings, plus Hard constraints
for h in '## Phase 0' '## Phase 1' '## Phase 2' '## Phase 3' '## Phase 4' '## Phase 5' 'Hard constraints'; do
  grep -q "$h" plugins/relay/agents/implementer.md || { echo "MISSING: $h"; exit 1; }
done

# F: Both verdict types are documented + dispute evidence shape (D9 Layer 1)
grep -q 'IMPLEMENTATION_COMPLETE' plugins/relay/agents/implementer.md
grep -q 'TEST_CONTRACT_DISPUTE' plugins/relay/agents/implementer.md
grep -q 'disputed_tests' plugins/relay/agents/implementer.md
grep -q 'prd_refs' plugins/relay/agents/implementer.md
grep -q 'proposed_resolution' plugins/relay/agents/implementer.md

# G: Byte-exact AC-14 halt message prefix and suffix are present
grep -q 'I cannot emit the Decision Gate evidence block without reading' plugins/relay/agents/implementer.md
grep -q 'No code has been changed and no review has been run.' plugins/relay/agents/implementer.md

# H: Universal R-X reminder is present (test-glob / test-file / R-X) somewhere in Phase 2
grep -iE 'R-X|test glob|test file' plugins/relay/agents/implementer.md | wc -l | awk '$1 < 1 {exit 1}'

# I: TDD routing read from methodology.md is mentioned (Phase 0 + Phase 5 handoff per D9 Layer 0)
grep -c 'methodology.md' plugins/relay/agents/implementer.md | awk '$1 < 1 {exit 1}'
grep -c '`tdd:`' plugins/relay/agents/implementer.md | awk '$1 < 1 {exit 1}'
```

### Level 3 — DRY-RUN END-TO-END (agent file is loadable as a Claude Code agent)

```bash
# J: The file conforms to Claude Code agent format — frontmatter delimited by `---`
# on lines 1 and N, body starts after line N+1, body is non-empty markdown
awk 'NR==1 && /^---$/ {start=1; next} start && /^---$/ {end=NR; exit} END {if (!end || end < 4) exit 1; print "frontmatter ends at line " end}' plugins/relay/agents/implementer.md

# K: All Patterns-to-Mirror file:line references resolve to real files in the repo
# (the implementer's mandatory readings reference plan-writer.md, plan-reviewer.md,
# prp-implement.md, plan-template.md — the agent file should cite these)
for f in plugins/relay/agents/plan-writer.md plugins/relay/agents/plan-reviewer.md plugins/prp-core/commands/prp-implement.md docs/context/plan-template.md; do
  test -f "$f" || { echo "MISSING REFERENCED FILE: $f"; exit 1; }
done

# L: Plan-reviewer rubric R1 simulation — the agent file does NOT itself emit a
# Decision Gate fenced block (that's the COMMAND's job), but it MUST document
# the format. Confirm the six required key names appear inside a fenced block
# inside the agent file body (anchored at "Anchor 4" or similar)
awk '/^```/{f=!f} f && /Active context|Activated criteria|Decisions found|Applicable anti-patterns|Applicable architectural rules|Result/{c++} END{if (c < 6) exit 1; print "DG keys found: " c}' plugins/relay/agents/implementer.md
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** The agent file exists at `plugins/relay/agents/implementer.md`, is loadable as a Claude Code agent (frontmatter parses), and declares `name: implementer`, `model: sonnet`, `color: green`, `tools: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash` (no `Task`). When invoked manually with a sample APPROVED plan and an existing working tree, the agent reads the plan + source PRD + methodology.md + Decision Gate sources without prompting the user, executes the plan's Step-by-Step Tasks via `Edit`/`Write`, runs Validation Levels 1–3 via `Bash` after all tasks complete, and emits `IMPLEMENTATION_COMPLETE` with `{files_changed, validation, validation_outputs}` (this seeds the AC-1 happy-path scenario at the agent level; the COMMAND-level mutations are out of scope for this phase).

- **AC-A2 (PRD AC-3):** Given a plan whose Step-by-Step Tasks would require modifying an existing test file but the implementer believes the test contradicts the source PRD, the agent emits `TEST_CONTRACT_DISPUTE` carrying `{disputed_tests: [...], prd_refs: [...], claim: "...", proposed_resolution: "..."}` per D9 Layer 1 — instead of silently editing the test. The dispute payload is structured (parseable by the code-reviewer's arbitration mode) and references real test paths + real PRD line ranges.

- **AC-A3 (PRD AC-4 + D9 Layer 0):** The agent's Phase 2 contains an explicit "no test-file edits without an upheld dispute" reminder (universal R-X) regardless of `tdd:` value. If the plan body itself ASKS the implementer to edit a test (which would be a plan-rubric defect upstream), the agent halts with a structured error naming the offending plan task and the test-glob match — it does NOT silently obey.

- **AC-A4 (PRD AC-9):** No path the agent ever passes to `Edit` or `Write` resolves under `.claude/PRPs/`. The agent file documents this hard constraint (constraint #5 of the 8). The Level-1 lint (validation command C) confirms the file body has no non-quoted `.claude/PRPs/` reference.

- **AC-A5 (PRD AC-14):** When any of the three Decision Gate sources (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`) is unreadable at Phase 0, the agent halts with the byte-exact message `"I cannot emit the Decision Gate evidence block without reading <missing-file>. Please ensure the file exists at <target_root>/<relative-path> and re-run /relay-implement (or /relay-code-review). No code has been changed and no review has been run."` (the `/relay-implement` substitution is the implementer's; `/relay-code-review` is the code-reviewer's — the agent file uses `/relay-implement` since this is the implementer file).

- **AC-A6 (PRD AC-9 + D11 + D6):** The agent has NO `Task` tool (re-grounding forbidden, per D11). The agent runs Validation Commands Levels 1–3 ONLY after all Step-by-Step Tasks complete (D6 aggregate validation), never per-task. The agent's `Edit`/`Write` targets never resolve under `.claude/PRPs/` (PRD AC-9 universal anti-pattern). All three invariants are stated in the Hard constraints section and cross-checked by Validation commands D, E, and C.

- **AC-A7 (PRD AC-4 + D9 Layer 0 universal):** The agent's Phase 5 handoff message names the current `tdd:` value verbatim (read from `methodology.md` in Phase 0). When `methodology.md` is missing, the handoff message names the `tdd: false` default with a "(file missing)" annotation per the prd-writer Step 7.4 canonical strings. The universal R-X test-modification reminder in Phase 2 fires regardless of `tdd:` value (PRD AC-4 + D9 Layer 0 universality).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The implementer overuses `TEST_CONTRACT_DISPUTE` as an escape valve when it cannot find a way to make existing tests pass (per source PRD Technical Risks) | M | M | Agent file's Hard constraint #1 names the verdict-emission discipline: dispute requires structured evidence (`prd_refs` referencing real PRD line ranges; `claim` stating the contradiction precisely; `proposed_resolution` naming a concrete fix). The COMMAND-level `max_disputes_per_session = 2` cap (out of scope here, but documented in the agent file as the surrounding contract) prevents abuse. The code-reviewer's arbitration mode (Phase 2 of source PRD) adjudicates. |
| The implementer hallucinates non-existent file paths or function signatures despite plan grounding (arXiv 2409.20550: 43% task-requirement conflicts) | M | H | Patterns-to-Mirror anchors carry verified `file:line` from research-codebase findings (per Anchor 1 / Anchor 2 / Anchor 5 / Anchor 6 of THIS plan); the agent file's Phase 1 documents the "anchor lookup" step where every task's `**MIRROR**:` reference must resolve to a real anchor in the plan's `## Patterns to Mirror` section. The downstream code-reviewer's R-S* structural rubric and R-L1 static analysis catch surviving path drift. |
| `color: green` collision with `post-green-reviewer` causes /agents-list confusion in dogfood (per source PRD D12) | L | L | Document the collision inside the agent file (1-line comment near the frontmatter); plan-writer R8c-style validation does not apply to colors. If dogfood surfaces confusion, swap to `lime` — recorded as a low-risk follow-up in the source PRD's Decisions Log D12. |
| The implementer attempts to `Read` a file outside the working tree (e.g., `/etc/passwd` or some other off-tree path) because the plan body silently references one | L | M | Hard constraint #5 (no writes under `.claude/PRPs/`) is the closest existing anti-pattern; broader off-tree reads are bounded by the project's `.claude/settings.json` allowlist (D11 of the source PRD: `Bash` is open at the agent layer; the project's settings allowlist is the security gate). The agent file does NOT need its own path allowlist. |
| The agent file's frontmatter declares an unsupported tool name and the agent fails to load at runtime | L | H | Validation Level 1B verifies the YAML frontmatter parses; Level 3J confirms the file conforms to the Claude Code agent format (frontmatter delimited correctly). The exact tool list (`Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash`) is the same set used by `test-runner.md` and is known-good. |
| Patterns-to-Mirror references in this plan are stale (plan-writer.md and plan-reviewer.md line ranges drift between now and implementation) | L | M | Validation Level 3K confirms each referenced file exists; the implementer's Phase 1 also re-resolves `**MIRROR**:` anchors at run-time against the plan's own `## Patterns to Mirror` section, so a drift in absolute line numbers does not break the agent's flow. |
| `prp-implement.md` upstream changes between research and implementation, drifting the section-shape reference | L | L | The agent file cites `prp-implement.md` with line range `:26-302` and the section names (Phase 0 DETECT through Phase 5 REPORT); a future drift would not silently propagate because relay's no-`.claude/`-import rule (anti-pattern #6) and D13 of the source PRD lock the relay shape to the documented divergences (Phase 2 PREPARE dropped, Phase 5 REPORT replaced with COMMAND-owned mutations, Phase 4 VALIDATE = aggregate). |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Color choice** — `color: green` per D12 of the source PRD. Note the documented collision with `post-green-reviewer` (also green); the agent's role is sufficiently different that runtime confusion in `/agents` is unlikely. If dogfood surfaces confusion, swap to `lime` — D12 records this as a low-risk follow-up.

**Dogfood opportunity** — This phase's deliverable (the implementer agent file) is a prompt-only markdown artifact; the file itself can be authored by hand or via a future `/relay-implement` invocation against a sibling APPROVED plan. The relay developer is the first user; the orchestrator (`/relay-execute`, future) is the second. The first three real implementations through `/relay-implement` will validate the agent's verdict shapes (`IMPLEMENTATION_COMPLETE`, `TEST_CONTRACT_DISPUTE`) against actual `code-reviewer` arbitration; if the verdicts need refinement, those changes are recorded in a future PRD (not in this plan).

**Section-shape divergence callout (D13)** — The agent adapts `prp-core/commands/prp-implement.md`'s six phases (DETECT / LOAD / PREPARE / EXECUTE / VALIDATE / REPORT) but DROPS PREPARE (no git-state assumption per D3) and REPLACES REPORT (the COMMAND owns D8 mutations; the agent's Phase 5 is a handoff message, not a report-with-archive). This divergence is the relay-specific value-add; the agent file should call this out in a 1-line comment so a future maintainer reading both files can locate the divergence quickly.

**No Task tool (D11)** — The implementer cannot dispatch research subagents. The plan-writer's grounding (codified in the plan's `## Patterns to Mirror` and `## Mandatory Reading`) is the source of truth for what the implementer needs. If the implementer encounters a question that cannot be answered from the plan + the working tree, the correct action is `TEST_CONTRACT_DISPUTE` (when the question is "is this test wrong?") or a structured halt naming the gap (when the question is "is this PRD ambiguous?") — never a `Task` re-grounding.

**Out-of-scope reminder** — All loop / budget / oscillation / diff-capture / D8-mutation logic lives in `/relay-implement` (Phase 3 of the source PRD), not in this agent. The agent is single-attempt by design, and the COMMAND wraps it with the full operational envelope. This boundary is what makes the agent independently testable (manual invocation against a sample plan) before the COMMAND ships.

*Generated: 2026-04-27*
*Approved: 2026-04-28*
*Status: APPROVED*
