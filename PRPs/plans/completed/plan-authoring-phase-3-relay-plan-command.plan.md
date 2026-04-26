# Feature: /relay-plan command (Phase 3 of plan-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation; new public command surface; impacts orchestrator and downstream pipeline
- Decisions found:
  - [2026-04-19] Command surface: writer/reviewer split — `/relay-plan` writes only; `/relay-plan-review` (Phase 4) reviews. Bundling is the PRD stage's exception.
  - [2026-04-19] PRP artifact paths under `PRPs/`, never `.claude/` — command emits paths under `PRPs/plans/` only.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — `/relay-plan` runs without Q&A; surfaces writer halts to caller and exits.
  - [2026-04-25] Plan filename pattern `<feature>-phase-<N>-<slug>.plan.md` (PRD Decisions Log).
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — `docs/anti-patterns.md:60-66`.
  - Bundling writer + reviewer into one command — bound by 2026-04-19 command-surface decision.
  - Interactive permission prompts in autonomous loop — command surfaces writer's halt verbatim and exits.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — public command surface for the plan-writer.
  - PRPs/ artifact path convention.
  - Interactivity boundary — autonomous from PRD-APPROVED onward.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-authoring.prd.md` — Implementation Phases row 3: "/relay-plan command" — Goal: public command surface for the plan-writer — Success signal: `/relay-plan PRPs/prds/<feature>.prd.md` produces the expected DRAFT or HALTs with a clear preconditions message.

## Summary

Create `plugins/relay/commands/relay-plan.md` — a Claude Code slash-command that takes a PRD path as its argument, validates preconditions (PRD exists + ends with `*Status: APPROVED*` + has at least one parseable Implementation Phases row whose dependencies are satisfied), then adopts the `plan-writer` role to generate a DRAFT plan. Mirrors the structure of `plugins/relay/commands/relay-prd.md` but is single-role (writer only — no Phase B reviewer adoption), takes a required positional argument (the PRD path), and surfaces writer halts to the caller without dialogue.

## User Story

As the relay developer (and future `/relay-execute` orchestrator),
I want a public `/relay-plan <prd-path>` command that dispatches the plan-writer agent,
So that PRD → DRAFT plan transformation has a stable, documented invocation surface independent of how the agent is exposed internally.

## Problem Statement

Today the `plan-writer` agent (Phase 1, complete) has no public command surface. A developer must manually invoke `Task(subagent_type="plan-writer", ...)` with hand-built input parameters; the orchestrator has no canonical entry point to dispatch. Without the command, the canonical 12-command relay pipeline surface listed in `docs/decisions.md` has a missing entry, and the docs at `docs/api-reference.md:39-50` describe a contract with no producer.

## Solution Statement

Implement a single markdown command file (`plugins/relay/commands/relay-plan.md`) following the proven `relay-prd.md` shape: YAML frontmatter (description, argument-hint), Mission, Decision Gate emission, Argument parsing (single positional `<prd-path>`), Preconditions (P1 PRD exists, P2 PRD ends with APPROVED, P3 Decision Gate sources readable, P4 actionable phase exists in the table), Phase A "Adopt the Writer role" (dispatch to `plan-writer.md`), Final output surface, Constraints, and What-you-do-NOT-do. There is **no Phase B** — the reviewer command is separate (Phase 4 of the PRD).

## Metadata

| Field            | Value                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| Type             | NEW_CAPABILITY                                                                   |
| Complexity       | LOW–MEDIUM                                                                       |
| Systems Affected | `plugins/relay/commands/`, surfaces `plan-writer` agent (Phase 1)                |
| Dependencies     | sibling `plan-writer.md` (Phase 1, complete)                                     |
| Estimated Tasks  | 6                                                                                |
| Source PRD       | `PRPs/prds/plan-authoring.prd.md` Phase 3                                        |

---

## Mandatory Reading

Before authoring `relay-plan.md`, the implementer MUST read:

| Priority | File                                                              | Lines    | Why                                                                                   |
| -------- | ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| P0       | `plugins/relay/commands/relay-prd.md`                             | 1-235    | Pattern to MIRROR — frontmatter, mission, Decision Gate, preconditions, role adoption |
| P0       | `plugins/relay/agents/plan-writer.md`                             | 1-548    | The agent this command dispatches; the Inputs section + Phase 1 phase-selection      |
| P0       | `PRPs/prds/plan-authoring.prd.md`                                 | all      | Source PRD; AC-1, AC-2, AC-6, AC-8 are the contract                                  |
| P1       | `docs/api-reference.md`                                           | 39-50    | The I/O contract being made real; per-phase filename divergence                       |
| P1       | `docs/context/prd-template.md`                                    | 173-180  | Implementation Phases canonical header — P4 precondition reads this                   |
| P2       | `PRPs/prds/plan-authoring.prd.md`                                 | row table | Real PRD with two `complete` rows + actionable rows for P4 dogfood                  |
| P2       | `plugins/relay/agents/prd-writer.md` Step 7.1                     | 297-311  | Halt-message wording style; align command-level halts with agent-level                |

No external library docs needed.

---

## Patterns to Mirror

### FRONTMATTER + ARGUMENT HINT

```yaml
# SOURCE: plugins/relay/commands/relay-prd.md:1-4
# COPY THIS PATTERN, adapting description and argument-hint:
---
description: Interactive PRD authoring. Drives the 6-phase Q&A ...
argument-hint: [description | draft-path]
---
```

For `/relay-plan`:
- `description`: one sentence — autonomous plan generation from an APPROVED PRD; dispatches the `plan-writer` agent; produces a DRAFT plan at `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`; reviewer is the separate `/relay-plan-review` command.
- `argument-hint: <prd-path>` (single required positional, not optional like `relay-prd`).

### MISSION + SEE-ALSO BLOCK

```markdown
# SOURCE: plugins/relay/commands/relay-prd.md:6-32
# COPY THIS PATTERN, adapting paths and dropping reviewer references:

# /relay-plan

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the PRD path argument, run the preconditions check, then
adopt the `plan-writer` role to generate a DRAFT plan for the next
actionable phase. Reviewer dispatch is OUT of scope — that is the
`/relay-plan-review` command.

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/plan-authoring.prd.md` — this
  feature's PRD; scope, AC-1 through AC-10, rationale.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-writer.md` — the
  Writer protocol you adopt in Phases 0–5.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/research-codebase.md`
  and `research-web.md` — subagents the Writer invokes via `Task`.
- `docs/context/prd-template.md` (in the target project) —
  canonical PRD shape; the command reads the Implementation Phases
  table from a PRD that conforms to this template.
```

### DECISION GATE EMISSION

```markdown
# SOURCE: plugins/relay/commands/relay-prd.md:36-46
# COPY THIS PATTERN — same three sources, adapted prose:

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command
creates a cross-cutting artifact (a plan that the Implementer
consumes); the gate is active. Consult `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md` in the
target project — these are also the three files the Writer
consults in its Phase 3 when assembling the plan's own Decision
Gate block. Your gate here covers the *command invocation*; the
Writer's gate inside the generated plan covers the *phase being
planned*.
```

### ARGUMENT PARSING

```markdown
# SOURCE: plugins/relay/commands/relay-prd.md:49-63
# ADAPTATION: single required argument, no enum dispatch.

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat
the argument as the PRD path; resolve it as absolute, or as
relative to the current working directory. If it does not resolve
to an existing readable file, HALT with the P1 message below.

If `$ARGUMENTS` is blank/whitespace, HALT with:

> /relay-plan requires a PRD path. Usage:
>   /relay-plan PRPs/prds/<feature>.prd.md
> Example:
>   /relay-plan PRPs/prds/plan-authoring.prd.md

Record `prd_path` as the resolved absolute path. Record
`target_root` as the current working directory.
```

### PRECONDITIONS (4 items, all HALT-on-fail)

```markdown
# SOURCE: plugins/relay/commands/relay-prd.md:67-114
# ADAPTATION: 4 preconditions instead of 3; P2 + P4 are new (PRD-status
# and actionable-phase checks); P3 Decision Gate sources mirror /relay-prd's P1.

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any
of these fail.

### P1 — PRD path resolves to a readable file

If `prd_path` does not point at an existing readable file:

> I cannot start plan authoring without `<prd_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-plan PRPs/prds/<feature>.prd.md

### P2 — PRD ends with `*Status: APPROVED*`

`Read` the PRD. Inspect its trailing status line.

- If it ends with `*Status: APPROVED*` → proceed.
- If it ends with `*Status: DRAFT*` (or any other non-APPROVED
  status, or has no status line):
  HALT with:

  > The PRD at `<prd_path>` is not APPROVED (current status:
  > `<status>`). /relay-plan only operates on APPROVED PRDs.
  > Run /relay-prd to bring the PRD to APPROVED first, or
  > manually flip its trailing `*Status:*` line to APPROVED if
  > the rubric was already validated by hand.

### P3 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with:

> I cannot dispatch the plan-writer without `<missing-file>`.
> The Decision Gate consultation in plan-writer's Phase 3
> requires all three mandatory sources. Run the
> `context-builder` skill (`*init` or `*update` mode) to
> generate the missing governance files, then re-run
> /relay-plan.

### P4 — At least one actionable phase exists

Locate the Implementation Phases table in the PRD by exact-match
header:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

If the header is not found, HALT with:

> Implementation Phases table header not found in `<prd_path>`.
> Expected: `| # | Phase | Description | Status | Parallel | Depends | PRP Plan |`.
> The PRD must conform to docs/context/prd-template.md before
> /relay-plan can run.

Parse data rows. A row is **actionable** when:
- Status cell is `pending`, AND
- Depends cell is `-` (empty) OR every comma-separated phase
  number listed has Status `complete`.

If zero rows are actionable, surface plan-writer's AC-2 message
verbatim and exit 0 (this is success, not failure):

> No pending phases with satisfied dependencies in `<prd-path>`.
> Nothing to plan.

(The orchestrator interprets this as "feature complete; nothing
more to plan" per PRD Open Questions resolution.)
```

### PHASE A — ADOPT WRITER ROLE (single role, no Phase B)

```markdown
# SOURCE: plugins/relay/commands/relay-prd.md:118-158
# ADAPTATION: drops the Reviewer adoption (Phase B); single-role contract.

## Phase A — Adopt the Writer role

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-writer.md`.

Execution context to pass into the Writer's Phase 0 setup:

- `prd_path`: the resolved absolute path verified by P1–P4.
- `target_root`: the cwd.

Run Phases 0 through 5 as specified by `plan-writer.md`. At Phase
2 GROUNDING, the Writer invokes the research subagents:

  Task(subagent_type="research-codebase", prompt=<topic + focus_areas + roots>)
  Task(subagent_type="research-web",      prompt=<topic + focus_areas>)

Both dispatched in parallel (single message, two `Task` calls).

The Writer's Phase 5.2 confirmation (`DRAFT plan written to ...`)
is the terminal signal. Surface it verbatim to the user and exit.

### If the Writer halts

Possible Writer halt conditions (all specified in plan-writer.md):

- Implementation Phases header mismatch (Phase 1.1) — cannot parse.
  Surface the halt message verbatim and exit.
- No actionable phase (Phase 1.3) — surface AC-2 message and exit 0.
- Decision Gate consultation fails (Phase 3.1) — surface verbatim.
- Decision Gate `HALT (reason)` (Phase 3.2) — surface and exit; do
  NOT prompt the user.
- PRD back-fill failed (Phase 5.1 soft-fail) — surface the soft-fail
  message; the plan is still on disk and can be reviewed.

In all halt cases, do NOT invoke `/relay-plan-review`. The user (or
orchestrator) decides next steps.
```

### CONSTRAINTS + DO-NOT block

```markdown
# SOURCE: plugins/relay/commands/relay-prd.md:201-235
# ADAPTATION: drop reviewer-specific items; add plan-stage specifics.

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Plans live at
  `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`. Nothing else
  goes on disk from this command.
- **Never adopt the Reviewer role.** Reviewer is `/relay-plan-review`
  (separate command, Phase 4 of the PRD).
- **Never prompt the user.** Past the interactivity boundary.
  HALTs are surfaced verbatim and the command exits.
- **Never overwrite an APPROVED plan.** plan-writer's Phase 1.5
  collision-suffix rule handles the write-time case.
- **Never invoke the Writer when a precondition failed.** HALT
  before adopting the Writer role.
- **Never skip the Decision Gate evidence block.** Both the
  command-level gate and the Writer's in-plan Decision Gate block
  are mandatory.
- **Never re-run the Writer on CHANGES_REQUESTED.** That is the
  orchestrator's call (`/relay-execute`).

## What you do NOT do

- **Reviewing the plan** — `/relay-plan-review` (Phase 4 of the PRD).
- **Implementing the plan** — `/relay-implement` (downstream).
- **Bundling writer + reviewer** — bound by command-surface decision.
- **Reopening an APPROVED plan** — out of scope. Manual hand-edit
  is the documented escape hatch.
- **Targeting a specific phase via `--phase <N>`** — Could-item per
  PRD MoSCoW; deferred. The Writer picks the lowest-numbered
  actionable phase deterministically.
- **Cross-PRD planning** — the command operates on exactly one PRD
  per invocation.
```

---

## Files to Change

| File                                              | Action | Justification                                                            |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `plugins/relay/commands/relay-plan.md`            | CREATE | The Phase 3 deliverable — public command surface for plan-writer         |
| `PRPs/prds/plan-authoring.prd.md`                 | UPDATE | Back-fill row 3 (Status `pending` → `in-progress` → `complete`)          |

---

## NOT Building (Scope Limits)

- **`/relay-plan-review` command.** Phase 4; sibling deliverable.
- **`docs/context/plan-template.md`.** Phase 5; independent.
- **Phase B Reviewer adoption.** Bound by command-surface decision (writer/reviewer split).
- **`--phase <N>` override.** Could-item per PRD MoSCoW.
- **Auto-loop writer↔reviewer on CHANGES_REQUESTED.** Orchestrator's job.
- **Re-opening an APPROVED plan via tooling.** Manual hand-edit is the escape hatch.
- **Updating `docs/api-reference.md`.** Phase 6 of the PRD (docs updates).

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and has a VALIDATE step.

### Task 1: CREATE `plugins/relay/commands/relay-plan.md` skeleton (frontmatter + mission)

- **ACTION**: Create the file with YAML frontmatter, command title `# /relay-plan`, `**Arguments:** $ARGUMENTS`, and the Mission + See-also block.
- **MIRROR**: `plugins/relay/commands/relay-prd.md:1-32`
- **FRONTMATTER**:
  - `description`: one-sentence summary stating autonomous plan generation, single-role writer dispatch, plan path pattern, and that the reviewer is the separate `/relay-plan-review` command.
  - `argument-hint: <prd-path>` (single required positional).
- **NO `name:` or `model:` keys** — those are agent frontmatter; commands use only `description` and `argument-hint`.
- **VALIDATE**: `python -c "import yaml; t=open('plugins/relay/commands/relay-plan.md').read(); fm=t.split('---',2)[1]; d=yaml.safe_load(fm); assert 'description' in d and 'argument-hint' in d; print('OK')"` exits 0.

### Task 2: ADD Decision Gate emission section

- **ACTION**: Append the Decision Gate section per the snippet above. Cite `docs/decision-gate.md` and the three sources (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`).
- **MIRROR**: `plugins/relay/commands/relay-prd.md:36-46`
- **DEVIATION**: text explicitly distinguishes command-level gate (covers the invocation) from the in-plan gate (covers the phase being planned).
- **VALIDATE**: `grep -F "Decision Gate (before any action)" plugins/relay/commands/relay-plan.md` returns at least one match; `grep -F "decisions.md" plugins/relay/commands/relay-plan.md` returns at least one match.

### Task 3: ADD Parse arguments section

- **ACTION**: Append the Parse arguments section per the snippet above. Single positional `prd_path`; blank-arg HALT message; `target_root = cwd`.
- **MIRROR**: `plugins/relay/commands/relay-prd.md:49-63`
- **DEVIATION**: drops the 3-mode dispatch (blank/description/draft-path); only one valid input shape — a path.
- **VALIDATE**: `grep -F "/relay-plan requires a PRD path" plugins/relay/commands/relay-plan.md` returns at least one match; `grep -F "prd_path" plugins/relay/commands/relay-plan.md` returns at least one match.

### Task 4: ADD Preconditions P1–P4

- **ACTION**: Append the Preconditions section with four sub-sections (P1 file readable, P2 status APPROVED, P3 Decision Gate sources readable, P4 actionable phase exists).
- **MIRROR**: `plugins/relay/commands/relay-prd.md:67-114` for prose discipline; `plan-writer.md` Step 1.1 for P4 header-match wording; `plan-writer.md` Step 1.3 for AC-2 verbatim message.
- **AC LINKAGE**:
  - P2 enforces "operates only on APPROVED PRDs" (PRD line 215, "Preconditions: …, ends with `*Status: APPROVED*`").
  - P3 mirrors AC-8 byte-exact halt language pattern at command level.
  - P4 surfaces AC-2 message verbatim ("No pending phases with satisfied dependencies in `<prd-path>`. Nothing to plan.") and exits 0.
- **GOTCHA**: P4's "exit 0 with success message" is NOT a failure — it represents "feature complete, nothing more to plan" per PRD Open Questions #1 resolution. The orchestrator depends on this signal.
- **VALIDATE**: `grep -cE "^### P[1-4] " plugins/relay/commands/relay-plan.md` returns `4`; `grep -F "No pending phases with satisfied dependencies in" plugins/relay/commands/relay-plan.md` returns at least one match; `grep -F '*Status: APPROVED*' plugins/relay/commands/relay-plan.md` returns at least one match.

### Task 5: ADD Phase A — Adopt the Writer role (single role)

- **ACTION**: Append Phase A per the snippet above. Document the execution context passed to plan-writer (`prd_path`, `target_root`); the Phase 2 GROUNDING parallel-Task dispatch (informational; the Writer does it); the Phase 5.2 confirmation as the terminal signal; the halt branches.
- **MIRROR**: `plugins/relay/commands/relay-prd.md:118-158`
- **DEVIATION**: NO Phase B section. The command file ends after Phase A + Final output surface + Constraints. Add an explicit comment in prose: "There is no Phase B — Reviewer adoption is `/relay-plan-review`'s job."
- **HALT BRANCHES** (mirror plan-writer's halts):
  - Implementation Phases header mismatch (plan-writer Step 1.1).
  - No actionable phase (plan-writer Step 1.3) — surface AC-2 message, exit 0.
  - Decision Gate consultation fails (plan-writer Step 3.1).
  - Decision Gate HALT (plan-writer Step 3.2).
  - PRD back-fill soft-fail (plan-writer Step 5.1).
- **VALIDATE**: `grep -F "Phase A" plugins/relay/commands/relay-plan.md` returns at least one match; `grep -F "Phase B" plugins/relay/commands/relay-plan.md` returns at most one match (only as the explicit "no Phase B" comment); `grep -F "plan-writer" plugins/relay/commands/relay-plan.md` returns several matches.

### Task 6: ADD Final output surface + Constraints + What-you-do-NOT-do

- **ACTION**: Append three closing sections.
  - **Final output surface**: on success, the last user-facing message is plan-writer's Phase 5.2 confirmation (`DRAFT plan written to ...`). On halt, the user-facing message explains the reason.
  - **Constraints (hard rules)**: 7 items per the CONSTRAINTS snippet above.
  - **What you do NOT do**: 6 bullets per the DO-NOT snippet above.
- **MIRROR**: `plugins/relay/commands/relay-prd.md:191-235`
- **VALIDATE**: `grep -F "Final output surface" plugins/relay/commands/relay-plan.md` returns at least one match; `grep -F "Constraints (hard rules)" plugins/relay/commands/relay-plan.md` returns at least one match; `grep -F "What you do NOT do" plugins/relay/commands/relay-plan.md` returns at least one match; `grep -F ".claude/" plugins/relay/commands/relay-plan.md` returns at least one match (the prohibition).

---

## Validation Commands

This deliverable has no compilable code; validation is structural.

### Level 1: STATIC_ANALYSIS (markdown + YAML)

```bash
F=plugins/relay/commands/relay-plan.md
python -c "import yaml; t=open('$F').read(); fm=t.split('---',2)[1]; d=yaml.safe_load(fm); assert 'description' in d and 'argument-hint' in d; print('OK')"
for f in plugins/relay/commands/*.md; do
  python -c "import yaml; t=open('$f').read(); yaml.safe_load(t.split('---',2)[1])" 2>/dev/null && echo "OK: $f" || echo "BAD: $f"
done
```

**EXPECT**: Exit 0, `OK` printed for the new file and all sibling commands.

### Level 2: CONTENT_INVARIANTS (grep)

```bash
F=plugins/relay/commands/relay-plan.md

# Frontmatter has argument-hint
grep -F 'argument-hint:' "$F"

# Mission + See-also point to plan-writer.md (not prd-writer.md)
grep -F "plan-writer.md" "$F"
! grep -F "prd-writer.md" "$F"

# Decision Gate emission section
grep -F "Decision Gate (before any action)" "$F"

# Argument parsing names $ARGUMENTS and prd_path
grep -F '$ARGUMENTS' "$F"
grep -F 'prd_path' "$F"

# 4 preconditions, P1-P4
test "$(grep -cE '^### P[1-4] ' $F)" -eq 4

# P2 enforces APPROVED status
grep -F '*Status: APPROVED*' "$F"

# P4 surfaces AC-2 verbatim message
grep -F "No pending phases with satisfied dependencies in" "$F"

# Implementation Phases canonical header (P4 reference)
grep -F '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |' "$F"

# Phase A present, no Phase B section header (only an explicit "no Phase B" comment)
grep -E '^## Phase A' "$F"
! grep -E '^## Phase B' "$F"

# No reviewer adoption
! grep -F "plan-reviewer.md" "$F"
! grep -F "/relay-plan-review" "$F" | grep -v "deferred\|separate\|Phase 4\|sibling" || true
# (the file may mention /relay-plan-review in the "what you do NOT do" or constraint sections;
#  the command must NOT actually invoke it, which is enforced by the absence of a Phase B section)

# .claude/ prohibition stated
grep -F ".claude/" "$F"

# Final output + Constraints + Do-NOT sections
grep -F "Final output surface" "$F"
grep -F "Constraints (hard rules)" "$F"
grep -F "What you do NOT do" "$F"
```

**EXPECT**: Each command exits 0 (matches present, except the negated `! grep` lines).

### Level 3: DRY-RUN END-TO-END

```bash
# In a Claude Code session with the relay plugin loaded:
# 1. Invoke the slash command:
#      /relay-plan PRPs/prds/plan-authoring.prd.md
# 2. Confirm the harness:
#    a. Reads the command file
#    b. Resolves $ARGUMENTS to the PRD path
#    c. P1: file exists ✓
#    d. P2: PRD ends with *Status: APPROVED* ✓
#    e. P3: docs/decisions.md, docs/anti-patterns.md, docs/context/architecture.md all readable ✓
#    f. P4: actionable rows exist (rows #4 and #5 are pending with deps satisfied at the time of this dry-run)
#    g. Phase A: dispatches plan-writer, which selects row #4 (lowest-# actionable),
#       writes PRPs/plans/plan-authoring-phase-4-relay-plan-review-command.plan.md,
#       and back-fills PRD row #4
#    h. Surfaces plan-writer's Phase 5.2 confirmation
#    i. Exits without invoking /relay-plan-review
# 3. Negative cases (run separately, against fresh fixtures):
#    /relay-plan                              # blank → P1 fail message
#    /relay-plan does/not/exist.prd.md         # missing → P1 fail
#    /relay-plan PRPs/prds/some-DRAFT.prd.md   # not APPROVED → P2 fail
#    /relay-plan PRPs/prds/all-complete.prd.md # no actionable → AC-2 message, exit 0
```

**EXPECT**: Happy path produces a new DRAFT plan + back-filled PRD. Each negative case surfaces the corresponding HALT/AC-2 message; no plan written.

---

## Acceptance Criteria

Each item ties back to a numbered AC in `PRPs/prds/plan-authoring.prd.md`.

- **AC-A1 (PRD AC-1):** Given an APPROVED PRD with at least one actionable phase, `/relay-plan <prd-path>` triggers `plan-writer` and produces a DRAFT plan at the canonical path.
- **AC-A2 (PRD AC-2):** Given an APPROVED PRD with no actionable phases, `/relay-plan` emits the verbatim "No pending phases with satisfied dependencies in `<prd-path>`. Nothing to plan." message and exits 0 without writing any file.
- **AC-A6 (PRD AC-6):** No path the command resolves to or instructs `Write`/`Edit` to use contains `/.claude/`. Constraints section enforces this.
- **AC-A8 (PRD AC-8):** When any of `docs/decisions.md`, `docs/anti-patterns.md`, or `docs/context/architecture.md` is unreadable at command time, P3 HALTs with a clear message naming the missing file and the command exits without dispatching the writer. (The writer also has its own halt at Phase 3.1; both are wired.)
- **AC-Cmd1 (Phase 3 success signal):** The command produces a DRAFT or HALTs with a clear preconditions message — never a partial state, never silently exits.
- **AC-Cmd2 (writer/reviewer split decision):** The command file contains zero references to invoking `plan-reviewer` (only references in the "what you do NOT do" / constraints sections naming the sibling command are allowed; an actual dispatch is forbidden). Verified by Task 5 / Task 6 grep checks.

---

## Risks and Mitigations

| Risk                                                                          | Likelihood | Impact | Mitigation                                                                                          |
| ----------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------- |
| User confuses `/relay-plan` with `/relay-plan-review` and pipes the wrong arg | M          | L      | P1 fails with a clear message naming the expected `<prd-path>` shape; argument-hint reinforces      |
| P2 misreads status because PRD has trailing whitespace/newlines               | L          | M      | Trim before compare; document that P2 checks `*Status: APPROVED*` as a substring of the last line   |
| P4 column-header drift (PRD writer ships a wider table)                       | L          | M      | Strict header match; HALT message explicitly names the canonical 7-column header from the template  |
| Header parser confuses GFM separator row `\|---\|...\|` for a data row        | L          | L      | Skip the row that consists only of dashes/pipes; document this in P4 prose                          |
| Concurrent invocations on the same PRD                                        | L          | L      | Out-of-scope race handling deferred to orchestrator (PRD Risks row §"Concurrent writers")           |
| Future addition of `--phase <N>` flag breaks the single-positional contract   | L          | L      | Documented Could-item; the day it lands, argument-hint becomes `<prd-path> [--phase <N>]`            |

---

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Why no Phase B in this command:** the canonical 2026-04-19 command-surface decision splits writer and reviewer into separate commands for every stage post-PRD (`plan-authoring.prd.md` Decision Gate, line 8). The PRD stage's bundled command (`/relay-prd` with Phase A + B) is documented as the exception, not the rule. `/relay-plan` is single-role; `/relay-plan-review` (Phase 4 of this PRD) is its sibling.

**Dogfood opportunity:** Once this phase lands, run `/relay-plan PRPs/prds/plan-authoring.prd.md` against the still-pending PRD rows (#4, #5). The first dry-run will pick row #4 (`/relay-plan-review` command) — closing the loop nicely: this very command's invocation triggers the planning of its sibling reviewer command.

**Per-phase filename divergence reminder:** `docs/api-reference.md:39` lists the shorthand `<feature>.plan.md`; the per-phase pattern `<feature>-phase-<N>-<slug>.plan.md` is recorded as a deliberate divergence in the PRD's Decisions Log (line 242). Phase 6 of the PRD updates the api-reference to match.

---

*Generated: 2026-04-25*
*Status: DRAFT*
