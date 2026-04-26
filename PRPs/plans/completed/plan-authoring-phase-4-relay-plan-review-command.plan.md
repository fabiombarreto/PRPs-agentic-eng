# Feature: /relay-plan-review command (Phase 4 of plan-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation; new public command surface; reviewer half of writer/reviewer pair; impacts orchestrator and downstream pipeline
- Decisions found:
  - [2026-04-19] Command surface: writer/reviewer split — `/relay-plan-review` is the reviewer command; `/relay-plan` (Phase 3, complete) is the writer command. Single-role each.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — `/relay-plan-review` runs without Q&A; surfaces plan-reviewer's verdict and exits. CHANGES_REQUESTED is terminal for one invocation.
  - [2026-04-19] PRP artifact paths under `PRPs/`, never `.claude/` — review.jsonl writes go to `PRPs/plans/<basename>.review.jsonl`.
  - [2026-04-25] Plan filename pattern `<feature>-phase-<N>-<slug>.plan.md` (PRD Decisions Log).
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — `docs/anti-patterns.md:60-66`.
  - Bundling writer + reviewer into one command — bound by 2026-04-19 command-surface decision.
  - Interactive permission prompts in autonomous loop — command surfaces verdict verbatim and exits.
  - Approving via heuristic — agent's 8-item rubric is the only gate; command does not second-guess.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — public command surface for the plan-reviewer.
  - PRPs/ artifact path convention.
  - Interactivity boundary — autonomous from PRD-APPROVED onward.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-authoring.prd.md` — Implementation Phases row 4: "/relay-plan-review command" — Goal: public command surface for the reviewer — Success signal: `/relay-plan-review PRPs/plans/<basename>.plan.md` either flips and reports APPROVED or reports the rubric defect list, never blocks on user input.

## Summary

Create `plugins/relay/commands/relay-plan-review.md` — a Claude Code slash-command that takes a plan path as its argument, validates preconditions (plan exists + ends with `*Status: DRAFT*`), then adopts the `plan-reviewer` role to run the 8-item rubric and either auto-flip DRAFT→APPROVED or surface a CHANGES_REQUESTED bullet list. Mirrors `/relay-plan`'s single-role command shape but adapted for the reviewer side: argument is `<plan-path>` (not `<prd-path>`), 3 preconditions (P1 file readable, P2 status is DRAFT, P3 Decision Gate sources readable — no P4 actionable-phase check since the reviewer reads a plan, not a PRD), and surfaces plan-reviewer's verdict verbatim with no Phase B.

## User Story

As the relay developer (and future `/relay-execute` orchestrator),
I want a public `/relay-plan-review <plan-path>` command that dispatches the plan-reviewer agent,
So that DRAFT plan validation has a stable, documented invocation surface that auto-approves or returns CHANGES_REQUESTED without dialogue.

## Problem Statement

Today the `plan-reviewer` agent (Phase 2, complete) has no public command surface. A developer must manually invoke `Task(subagent_type="plan-reviewer", ...)` with hand-built input parameters; the orchestrator has no canonical entry point to dispatch the rubric run. Without the command, the canonical 12-command relay pipeline surface listed in `docs/decisions.md` is missing the second-to-last entry, and the contract documented at `docs/api-reference.md:46` (`/relay-plan-review <plan-path>`) has no producer.

## Solution Statement

Implement a single markdown command file (`plugins/relay/commands/relay-plan-review.md`) following the proven `/relay-plan` shape (Phase 3, just shipped): YAML frontmatter (description, argument-hint), Mission, Decision Gate emission, Argument parsing (single positional `<plan-path>`), Preconditions (P1 file readable, P2 ends with `*Status: DRAFT*`, P3 Decision Gate sources readable), Phase A "Adopt the Reviewer role" (dispatch to `plan-reviewer.md`), Final output surface (surface APPROVED or CHANGES_REQUESTED verbatim), Constraints, and What-you-do-NOT-do. There is no Phase B — single-role.

## Metadata

| Field            | Value                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| Type             | NEW_CAPABILITY                                                                   |
| Complexity       | LOW                                                                              |
| Systems Affected | `plugins/relay/commands/`, surfaces `plan-reviewer` agent (Phase 2)              |
| Dependencies     | sibling `plan-reviewer.md` (Phase 2, complete); structural sibling `/relay-plan` (Phase 3, complete) |
| Estimated Tasks  | 6                                                                                |
| Source PRD       | `PRPs/prds/plan-authoring.prd.md` Phase 4                                        |

---

## Mandatory Reading

| Priority | File                                                              | Lines    | Why                                                                                            |
| -------- | ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| P0       | `plugins/relay/commands/relay-plan.md`                            | 1-209    | Pattern to MIRROR — frontmatter, mission, Decision Gate, preconditions, single-role Phase A    |
| P0       | `plugins/relay/agents/plan-reviewer.md`                           | 1-389    | The agent this command dispatches; Inputs section + Step-by-step rubric protocol               |
| P0       | `PRPs/prds/plan-authoring.prd.md`                                 | all      | Source PRD; AC-3, AC-4, AC-6 are the contract                                                 |
| P1       | `plugins/relay/commands/relay-test-review.md`                     | 1-163    | Reviewer-command precedent (different stage); confirms single-role + verdict-surface pattern   |
| P1       | `plugins/relay/commands/relay-prd.md`                             | 161-187  | "Adopt the Reviewer role" prose for shape reference (bundled command's Phase B)                |
| P2       | `docs/api-reference.md`                                           | 46       | The I/O contract being made real                                                              |

No external library docs needed.

---

## Patterns to Mirror

### FRONTMATTER + ARGUMENT HINT

```yaml
# SOURCE: plugins/relay/commands/relay-plan.md:1-4
# COPY THIS PATTERN, swap "plan generation" → "plan validation":
---
description: Autonomous plan generation from an APPROVED PRD. ...
argument-hint: <prd-path>
---
```

For `/relay-plan-review`:
- `description`: one sentence — autonomous plan validation against the 8-item rubric; dispatches the `plan-reviewer` agent; auto-flips DRAFT→APPROVED on rubric pass; emits CHANGES_REQUESTED bullet list otherwise; appends to `PRPs/plans/<basename>.review.jsonl`; writer is the separate `/relay-plan` command.
- `argument-hint: <plan-path>`.

### MISSION + SEE-ALSO BLOCK

```markdown
# SOURCE: plugins/relay/commands/relay-plan.md:6-32
# Adapt: dispatch plan-reviewer (not plan-writer); see-also references plan-reviewer + plan-writer (sibling)

# /relay-plan-review

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the plan path argument, run the preconditions check, then
adopt the `plan-reviewer` role to run the 8-item rubric and either
auto-flip DRAFT→APPROVED or emit a CHANGES_REQUESTED bullet list.
Writer dispatch is OUT of scope — that is the `/relay-plan`
command (Phase 3 of `plan-authoring`, complete).

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/plan-authoring.prd.md` — this
  feature's PRD; scope, AC-3 / AC-4 / AC-10, rationale.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-reviewer.md` —
  the Reviewer protocol you adopt: 8-item rubric, auto-flip on
  pass, jsonl logging, CHANGES_REQUESTED on fail.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-writer.md` —
  the sibling Writer; informational only, not dispatched here.
- `docs/context/prd-template.md` (in the target project) —
  canonical PRD shape; R8 traceability cross-reads from the source
  PRD's Implementation Phases table.
```

### DECISION GATE EMISSION

```markdown
# SOURCE: plugins/relay/commands/relay-plan.md:36-46
# Adapt: command-level gate covers the *invocation*; agent's read of
# decisions.md / anti-patterns.md / architecture.md is informational

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command
mutates a pipeline artifact (the plan's status line) on the happy
path and writes to a per-plan jsonl audit log on every run; the
gate is active. Consult `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md` in the
target project — these are the same three files the Reviewer
references (R5 reads `methodology.md`; R6 enforces no-`.claude/`).
The command-level gate covers the *command invocation*; the
agent's rubric covers the *plan being reviewed*.
```

### ARGUMENT PARSING

```markdown
# SOURCE: plugins/relay/commands/relay-plan.md:48-68
# Adapt: prd_path → plan_path; usage example uses .plan.md path

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat
the argument as the plan path; resolve it as absolute, or as
relative to the current working directory. If the argument is
blank/whitespace, HALT with:

> /relay-plan-review requires a plan path. Usage:
>   /relay-plan-review PRPs/plans/<feature>-phase-<N>-<slug>.plan.md
> Example:
>   /relay-plan-review PRPs/plans/plan-authoring-phase-4-relay-plan-review-command.plan.md

If the argument is non-empty but does not resolve to an existing
readable file, fall through to P1 below for the canonical
file-not-readable HALT message.

Record `plan_path` as the resolved absolute path. Record
`target_root` as the current working directory. The Reviewer will
use `target_root` to read `docs/context/methodology.md` for R5 and
to resolve the source PRD path for R8.
```

### PRECONDITIONS (3 items, all HALT-on-fail)

```markdown
# SOURCE: plugins/relay/commands/relay-plan.md:67-114
# Adapt: 3 preconditions instead of 4 (no P4 actionable-phase; reviewer reads a plan, not a PRD)

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any
of these fail.

### P1 — Plan path resolves to a readable file

If `plan_path` does not point at an existing readable file:

> I cannot start plan review without `<plan_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-plan-review PRPs/plans/<feature>-phase-<N>-<slug>.plan.md

### P2 — Plan ends with `*Status: DRAFT*`

`Read` the plan. Inspect its trailing status line (the last
non-empty line of the file).

- If it equals `*Status: DRAFT*` → proceed.
- If it equals `*Status: APPROVED*`:
  HALT with:

  > The plan at `<plan_path>` is already APPROVED.
  > /relay-plan-review will not re-validate an APPROVED plan. If
  > you want to re-run the rubric, manually flip its trailing
  > `*Status:*` line back to `DRAFT` (and remove the `*Approved:*`
  > line above it), then re-run /relay-plan-review.

- If it has any other status (or no status line at all):
  HALT with:

  > The plan at `<plan_path>` does not end with `*Status: DRAFT*`
  > (current trailer: `<actual>`). /relay-plan-review only
  > operates on DRAFT plans.

### P3 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with:

> I cannot dispatch the plan-reviewer without `<missing-file>`.
> The Decision Gate consultation requires all three mandatory
> sources. Run the `context-builder` skill (`*init` or `*update`
> mode) to generate the missing governance files, then re-run
> /relay-plan-review.

(plan-reviewer itself does not consult these three sources for
its rubric — R5 reads `methodology.md`, R6 inspects the plan body
for `.claude/`, R8 reads the source PRD. P3 is a command-level
hygiene check matching `/relay-plan`'s contract.)
```

### PHASE A — ADOPT REVIEWER ROLE (single role)

```markdown
# SOURCE: plugins/relay/commands/relay-plan.md:118-176 (Phase A pattern)
#         + plugins/relay/commands/relay-prd.md:161-187 (reviewer adoption shape)

## Phase A — Adopt the Reviewer role

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-reviewer.md`.

Execution context to pass into the Reviewer's Step 1:

- `draft_path`: the resolved absolute path verified by P1–P3.
  (Note: the agent's input field is named `draft_path` for
  symmetry with `prd-reviewer`; semantically it is the plan path.)
- `target_root`: the cwd. Used for R5 (read methodology.md) and
  R8 (resolve source PRD path).

Run the Reviewer protocol: load → run rubric (all 8, no
short-circuit) → branch on result.

The Reviewer's two terminal outcomes:

1. **All 8 rubric items pass** → Step 4 auto-flip:
   - Re-validates rubric against on-disk content (final guard).
   - `Edit`s the trailing status line: `*Status: DRAFT*` →
     `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`.
   - Appends an APPROVED entry to
     `<target_root>/PRPs/plans/<basename>.review.jsonl` with all
     8 rubric items recorded.
   - Emits the success summary:
     `> ✅ Plan **APPROVED** at PRPs/plans/<basename>.plan.md.`
     `> Ready for the Implementer.`

2. **One or more fail** → CHANGES_REQUESTED:
   - Appends a CHANGES_REQUESTED entry to the jsonl log (all 8
     items recorded; AC-10 no-short-circuit).
   - Emits a bullet list naming each failing rubric item by ID +
     reason.
   - Leaves the file at `*Status: DRAFT*`. Does NOT modify the
     plan body.

Surface the Reviewer's verdict to the user verbatim and exit.
There is **no Phase B**. CHANGES_REQUESTED is terminal for this
invocation; the orchestrator (or developer) decides whether to
re-run `/relay-plan` for structural regeneration.

### If the Reviewer halts

Possible Reviewer halt conditions (all specified in
`plan-reviewer.md`):

- **`already_approved` error** (Reviewer's Step 1) — the file
  ends with `*Status: APPROVED*` despite P2 passing (race or
  hand-edit between P2 and Step 1). Surface the verbatim error
  JSON and exit.
- **Re-validation failure in Step 4.1** — the rubric passed in
  Step 2 but a re-read in Step 4.1 finds a now-failing item.
  Reviewer returns CHANGES_REQUESTED with
  `action: "revalidation_fail"`; surface verbatim and exit.

In all halt cases, do NOT re-invoke the Reviewer or invoke
`/relay-plan`. The user (or orchestrator) decides next steps.
```

### CONSTRAINTS + DO-NOT

```markdown
# SOURCE: plugins/relay/commands/relay-plan.md:191-226
# Adapt: drop writer-specific items; add reviewer specifics

## Constraints (hard rules)

- **Never write under `.claude/`.** review.jsonl lives at
  `PRPs/plans/<basename>.review.jsonl`. The plan-reviewer agent
  enforces this at the agent level; this command is the first
  guard.
- **Never adopt the Writer role.** Writer is `/relay-plan`
  (separate command, Phase 3 of the PRD, complete). This command
  file MUST NOT contain a "Phase B" or "Writer" section, MUST NOT
  invoke `plan-writer` via `Task`, and MUST NOT regenerate plan
  content on CHANGES_REQUESTED.
- **Never prompt the user.** Past the interactivity boundary.
  HALTs and verdicts are surfaced verbatim and the command exits.
- **Never modify the plan body.** The only mutation on the happy
  path is the two-line status flip via `Edit`. CHANGES_REQUESTED
  leaves the file untouched.
- **Never invoke the Reviewer when a precondition failed.** HALT
  before adopting the Reviewer role.
- **Never skip the Decision Gate evidence block.** The
  command-level gate is mandatory.
- **Never re-run the Reviewer in a loop.** A single
  /relay-plan-review invocation produces exactly one verdict
  (APPROVED or CHANGES_REQUESTED) and exits. Looping is the
  orchestrator's responsibility (`/relay-execute`).
- **Never short-circuit the rubric.** The Reviewer evaluates all
  8 items every run (AC-10); the command does not second-guess
  this — surface what the agent returns.

---

## What you do NOT do

- **Generating the plan** — `/relay-plan` (Phase 3 of the PRD).
- **Implementing the plan** — `/relay-implement` (downstream).
- **Bundling writer + reviewer** — bound by command-surface
  decision; the PRD stage's bundled `/relay-prd` is the
  documented exception.
- **Reopening an APPROVED plan** — out of scope. Manual hand-edit
  (flip the trailing `*Status:*` line back to `DRAFT`) is the
  documented escape hatch.
- **Re-running the rubric on a single invocation if it fails** —
  CHANGES_REQUESTED is terminal; the orchestrator decides
  regeneration.
- **Cross-plan review** — the command operates on exactly one
  plan per invocation.
- **A `--strict` flag** re-introducing user-confirmation. PRD
  Could-item; deferred.
```

---

## Files to Change

| File                                              | Action | Justification                                                            |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `plugins/relay/commands/relay-plan-review.md`     | CREATE | The Phase 4 deliverable — public command surface for plan-reviewer       |
| `PRPs/prds/plan-authoring.prd.md`                 | UPDATE | Back-fill row 4 (Status `pending` → `in-progress` → `complete`)          |

---

## NOT Building (Scope Limits)

- **Writer adoption (Phase B).** Bound by command-surface decision.
- **Auto-loop on CHANGES_REQUESTED.** Orchestrator's job.
- **`--strict` reviewer flag** re-introducing user-confirmation. Could-item.
- **Re-opening APPROVED plans via tooling.** Manual hand-edit only.
- **`/relay-plan-review` for PRDs.** Wrong artifact — `/relay-prd` (Phase B) handles PRD review.
- **Updating `docs/api-reference.md`.** Phase 6 of the PRD.

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and has a VALIDATE step.

### Task 1: CREATE `plugins/relay/commands/relay-plan-review.md` skeleton (frontmatter + mission)

- **ACTION**: Create the file with YAML frontmatter, `# /relay-plan-review` title, `**Arguments:** $ARGUMENTS`, and the Mission + See-also block.
- **MIRROR**: `plugins/relay/commands/relay-plan.md:1-32`
- **FRONTMATTER**:
  - `description`: one sentence on autonomous plan validation, agent dispatch, auto-flip behavior, jsonl logging, sibling `/relay-plan`.
  - `argument-hint: <plan-path>`.
- **VALIDATE**: `python -c "import yaml; t=open('plugins/relay/commands/relay-plan-review.md').read(); fm=t.split('---',2)[1]; d=yaml.safe_load(fm); assert 'description' in d and d['argument-hint']=='<plan-path>'; print('OK')"` exits 0.

### Task 2: ADD Decision Gate emission section

- **ACTION**: Append the Decision Gate section per the snippet above.
- **MIRROR**: `plugins/relay/commands/relay-plan.md:36-46`
- **DEVIATION**: prose calls out that the agent's R5/R6/R8 are the rubric-level analogs; command-level gate covers invocation only.
- **VALIDATE**: `grep -F "Decision Gate (before any action)" plugins/relay/commands/relay-plan-review.md` returns at least one match.

### Task 3: ADD Parse arguments section

- **ACTION**: Append per the snippet above. `plan_path` (not `prd_path`); blank-arg HALT example uses a `.plan.md` path.
- **MIRROR**: `plugins/relay/commands/relay-plan.md:48-68`
- **VALIDATE**: `grep -F "/relay-plan-review requires a plan path" plugins/relay/commands/relay-plan-review.md` returns at least one match; `grep -c -F 'plan_path' plugins/relay/commands/relay-plan-review.md` returns ≥3.

### Task 4: ADD Preconditions P1–P3

- **ACTION**: Append the Preconditions section with three sub-sections (P1 file readable, P2 ends with `*Status: DRAFT*`, P3 Decision Gate sources readable).
- **MIRROR**: `plugins/relay/commands/relay-plan.md:67-110` for prose discipline (drop P4).
- **AC LINKAGE**:
  - P2 enforces "operates only on DRAFT plans" with two distinct halt branches: `*Status: APPROVED*` (already approved) and other/missing.
  - The `*Status: APPROVED*` branch documents the manual flip-back escape hatch for re-review.
  - P3 mirrors `/relay-plan`'s P3 verbatim except agent name (`plan-reviewer` vs `plan-writer`).
- **GOTCHA**: agent's input field is named `draft_path` (mirrored from prd-reviewer); document this in the Phase A section so the implementer doesn't rename mid-flow.
- **VALIDATE**: `grep -cE "^### P[1-3] " plugins/relay/commands/relay-plan-review.md` returns `3`; no `### P4` heading; `grep -F '*Status: DRAFT*' plugins/relay/commands/relay-plan-review.md` returns at least one match; `grep -F '*Status: APPROVED*' plugins/relay/commands/relay-plan-review.md` returns at least one match (in the P2 branch).

### Task 5: ADD Phase A — Adopt the Reviewer role (single role)

- **ACTION**: Append Phase A per the snippet above. Document the execution context (`draft_path`, `target_root`); the two terminal outcomes (APPROVED auto-flip, CHANGES_REQUESTED bullet list); the explicit "no Phase B" prose; the halt branches (`already_approved`, revalidation_fail).
- **MIRROR**: `plugins/relay/commands/relay-plan.md:118-176` (Phase A shape) + `plugins/relay/commands/relay-prd.md:161-187` (Reviewer adoption flow).
- **DEVIATION**:
  - Drops Writer-specific halt branches; adds Reviewer-specific (`already_approved`, `revalidation_fail`).
  - Documents the `draft_path` field name (mirrored from `prd-reviewer`'s convention) explicitly so future readers don't see it as a typo.
  - Does NOT loop — single verdict per invocation.
- **VALIDATE**:
  - `grep -E '^## Phase A' plugins/relay/commands/relay-plan-review.md` returns at least one match.
  - `grep -E '^## Phase B' plugins/relay/commands/relay-plan-review.md` returns 0 matches.
  - `grep -F "plan-reviewer.md" plugins/relay/commands/relay-plan-review.md` returns at least one match.
  - `grep -F "plan-writer.md" plugins/relay/commands/relay-plan-review.md` returns at most one match (only as informational sibling reference in see-also).
  - `grep -F "draft_path" plugins/relay/commands/relay-plan-review.md` returns at least one match.

### Task 6: ADD Final output surface + Constraints + What-you-do-NOT-do

- **ACTION**: Append three closing sections.
  - **Final output surface**: success → plan-reviewer's verbatim ✅ summary; CHANGES_REQUESTED → verbatim bullet list; halts → halt message + exit. No additional text appended by the command.
  - **Constraints (hard rules)**: 8 items per the CONSTRAINTS snippet above.
  - **What you do NOT do**: 7 bullets per the DO-NOT snippet above.
- **MIRROR**: `plugins/relay/commands/relay-plan.md:191-226`
- **VALIDATE**:
  - `grep -F "Final output surface" plugins/relay/commands/relay-plan-review.md` returns at least one match.
  - `grep -F "Constraints (hard rules)" plugins/relay/commands/relay-plan-review.md` returns at least one match.
  - `grep -F "What you do NOT do" plugins/relay/commands/relay-plan-review.md` returns at least one match.
  - `grep -F ".claude/" plugins/relay/commands/relay-plan-review.md` returns at least one match (the prohibition).
  - `grep -F "Never adopt the Writer role" plugins/relay/commands/relay-plan-review.md` returns at least one match.

---

## Validation Commands

This deliverable has no compilable code; validation is structural.

### Level 1: STATIC_ANALYSIS (markdown + YAML)

```bash
F=plugins/relay/commands/relay-plan-review.md
python -c "import yaml; t=open('$F').read(); fm=t.split('---',2)[1]; d=yaml.safe_load(fm); assert 'description' in d and d['argument-hint']=='<plan-path>'; print('OK')"
for f in plugins/relay/commands/*.md; do
  python -c "import yaml; t=open('$f').read(); yaml.safe_load(t.split('---',2)[1])" 2>/dev/null && echo "OK: $f" || echo "BAD: $f"
done
```

**EXPECT**: Exit 0, `OK` printed for the new file and all 5 sibling commands.

### Level 2: CONTENT_INVARIANTS (grep)

```bash
F=plugins/relay/commands/relay-plan-review.md

# Frontmatter argument-hint
grep -F 'argument-hint: <plan-path>' "$F"

# Mission references plan-reviewer.md
grep -F "plan-reviewer.md" "$F"

# Decision Gate emission
grep -F "Decision Gate (before any action)" "$F"

# Argument parsing names $ARGUMENTS and plan_path
grep -F '$ARGUMENTS' "$F"
grep -F 'plan_path' "$F"

# 3 preconditions, P1-P3, no P4
test "$(grep -cE '^### P[1-3] ' $F)" -eq 3
! grep -E '^### P4 ' "$F"

# P2 status checks (DRAFT proceed, APPROVED HALT)
grep -F '*Status: DRAFT*' "$F"
grep -F '*Status: APPROVED*' "$F"

# Phase A present, no Phase B section header
grep -E '^## Phase A' "$F"
! grep -E '^## Phase B' "$F"

# No plan-writer.md dispatch (only see-also reference allowed)
test "$(grep -c -F 'plan-writer.md' $F)" -le 1

# Reviewer's draft_path input field documented
grep -F "draft_path" "$F"

# .claude/ prohibition
grep -F ".claude/" "$F"

# 3 closing sections
grep -F "Final output surface" "$F"
grep -F "Constraints (hard rules)" "$F"
grep -F "What you do NOT do" "$F"

# No stray /relay-plan dispatch (only sibling references)
! grep -E '/relay-plan[^-]' "$F" | grep -v "Phase 3\|complete\|sibling\|writer\|/relay-plan-review"
```

**EXPECT**: Each command exits 0 (matches present, except the negated `! grep` lines).

### Level 3: DRY-RUN END-TO-END

```bash
# In a Claude Code session with the relay plugin loaded:
# 1. /relay-plan-review PRPs/plans/completed/plan-authoring-phase-1-plan-writer.plan.md
#    NOTE: that plan was archived; un-archive (move back to PRPs/plans/) or
#    use a fresh DRAFT generated by /relay-plan against a different PRD.
# 2. Confirm the harness:
#    a. Reads the command file
#    b. Resolves $ARGUMENTS to the plan path
#    c. P1: file exists ✓
#    d. P2: trailing line equals *Status: DRAFT* ✓
#    e. P3: docs/decisions.md, docs/anti-patterns.md, docs/context/architecture.md readable ✓
#    f. Phase A: dispatches plan-reviewer
#    g. Reviewer runs all 8 rubric items
#    h. On full pass: flips status, appends APPROVED jsonl, surfaces ✅ summary
#       On any fail: appends CHANGES_REQUESTED jsonl, surfaces bullet list, leaves DRAFT
# 3. Negative cases (run separately):
#    /relay-plan-review                                 # blank → P1 usage hint
#    /relay-plan-review does/not/exist.plan.md          # missing → P1 fail
#    /relay-plan-review PRPs/plans/already-APPROVED.plan.md  # APPROVED → P2 fail with re-flip hint
```

**EXPECT**: Happy path produces APPROVED status flip + jsonl entry, OR CHANGES_REQUESTED bullet list. Negative cases surface the corresponding HALT message; no plan body modified, no `.claude/` writes.

---

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** Given a DRAFT plan that passes all 8 rubric items, `/relay-plan-review <plan-path>` dispatches the Reviewer which auto-flips status, appends APPROVED jsonl entry, and the command surfaces the success summary verbatim — without prompting the user.
- **AC-A2 (PRD AC-4):** Given a DRAFT plan with rubric failures, the command dispatches the Reviewer which appends a CHANGES_REQUESTED jsonl entry (with all 8 rubric items recorded), and the command surfaces the bullet list verbatim. The plan file is left at `*Status: DRAFT*`.
- **AC-A6 (PRD AC-6):** No path the command resolves to or instructs `Write`/`Edit` to use contains `/.claude/`. Constraints section enforces this.
- **AC-Cmd1 (Phase 4 success signal):** The command produces a verdict (APPROVED or CHANGES_REQUESTED) or HALTs with a clear preconditions message — never a partial state, never silently exits, never blocks on user input.
- **AC-Cmd2 (writer/reviewer split decision):** The command file contains zero `plan-writer.md` dispatch (only one informational reference in see-also is allowed); zero `## Phase B` sections; zero `Task(subagent_type="plan-writer", ...)` invocations.

---

## Risks and Mitigations

| Risk                                                                     | Likelihood | Impact | Mitigation                                                                                          |
| ------------------------------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------------------- |
| User pipes a PRD path instead of a plan path                             | M          | L      | P1 fails with clear usage hint; argument-hint is `<plan-path>`; P2 catches APPROVED PRDs            |
| P2 misreads status because plan has trailing whitespace/newlines         | L          | M      | Trim before compare; P2 prose specifies "last non-empty line equals X"                              |
| User confuses input field name (`draft_path` is plan path, not PRD path) | L          | L      | Phase A prose explicitly notes the symmetry-with-prd-reviewer naming; documented as not-a-typo      |
| `already_approved` race between P2 and Reviewer Step 1                   | L          | L      | Reviewer's Step 1 catches; command surfaces verbatim and exits                                      |
| Concurrent invocations race on the same jsonl                            | L          | L      | Same race risk as prd-reviewer; mitigated at orchestrator layer; out of scope                       |

---

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Symmetry note:** with this phase shipped, the relay plan stage has both halves (`/relay-plan` writes; `/relay-plan-review` reviews) — closing the writer/reviewer pair for Pillar 2. The first end-to-end dogfood is `/relay-plan` against this PRD followed by `/relay-plan-review` on the produced DRAFT.

**Why P3 is identical to /relay-plan's P3:** even though the Reviewer does not consult `decisions.md`/`anti-patterns.md`/`architecture.md` directly (the Writer does, when generating the plan), the command-level gate is uniform across the relay command surface. Treating P3 as a "pipeline hygiene" check keeps the command interface consistent and is cheap.

**Phase 5 / Phase 6 dependencies:** Phase 5 (`docs/context/plan-template.md`) is independent and can run in parallel. Phase 6 (docs updates) depends on rows 1–5 all being `complete` and ships the api-reference + decisions-log + changelog updates.

---

*Generated: 2026-04-25*
*Status: DRAFT*
