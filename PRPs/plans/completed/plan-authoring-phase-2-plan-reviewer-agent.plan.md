# Feature: plan-reviewer agent (Phase 2 of plan-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation; new agent file in plugins/relay/agents/; impacts orchestrator and downstream pipeline (Implementer); writer/reviewer split for Pillar 2
- Decisions found:
  - [2026-04-19] Command surface: writer/reviewer split — `plan-reviewer` is the reviewer half; `plan-writer` is its sibling (Phase 1, completed).
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — plan-reviewer auto-approves on rubric pass; this is the canonical divergence from `prd-reviewer.md`.
  - [2026-04-19] PRP artifact paths under `PRPs/`, never `.claude/` — review.jsonl writes go to `PRPs/plans/<basename>.review.jsonl`.
  - [2026-04-19] Methodology declaration — R5 reads `tdd:` from `docs/context/methodology.md` and validates verbatim strings sourced from `prd-writer.md` Step 7.4.
  - [2026-04-25] Plan filename pattern `<feature>-phase-<N>-<slug>.plan.md` (PRD Decisions Log row).
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — `docs/anti-patterns.md:60-66`; R6 enforces.
  - Weakening or short-circuiting the rubric — AC-10 mandates evaluating all 8 items per run, even when earlier ones fail.
  - Approving via heuristic — auto-approve fires only when ALL 8 rubric items pass.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — plan-reviewer is the second writer/reviewer pair downstream of PRD.
  - Interactivity boundary — autonomous from PRD-APPROVED onward; plan-reviewer MUST NOT prompt the user.
  - PRPs/ artifact path convention.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-authoring.prd.md` — Implementation Phases row 2: "plan-reviewer agent" — Goal: Implement the 8-item rubric runner with auto-flip and jsonl logging — Success signal: Given a hand-crafted passing DRAFT plan, the agent flips it to APPROVED autonomously and appends a single APPROVED jsonl entry. Given a failing DRAFT, it returns the bullet list and leaves the file untouched.

## Summary

Create `plugins/relay/agents/plan-reviewer.md` — an autonomous Claude Code subagent that validates a DRAFT plan against an 8-item structural rubric (R1–R8), auto-flips `*Status: DRAFT*` → `*Status: APPROVED*` (with `*Approved: <YYYY-MM-DD>*` inserted above) when all 8 items pass, and appends one verdict entry to `PRPs/plans/<basename>.review.jsonl` per run. On any rubric failure, returns a structured bullet list (CHANGES_REQUESTED), logs the same to jsonl, and leaves the file at DRAFT. Mirrors `plugins/relay/agents/prd-reviewer.md` byte-for-pattern with three canonical divergences: 8 rubric items (not 7) — R8 added for PRD↔plan traceability; auto-flip without user "Aprovar?" gate (the interactivity boundary); and AC-10 no-short-circuit discipline (rubric array always contains exactly 8 objects).

## User Story

As the relay developer (and future `/relay-execute` orchestrator),
I want plan-reviewer to deterministically validate a DRAFT plan and auto-approve when structurally sound,
So that the autonomous pipeline can advance from plan-DRAFT to Implementer without per-stage workarounds.

## Problem Statement

Today there is no validator for the DRAFT plans produced by `plan-writer` (Phase 1). Without `plan-reviewer`, plans never reach `*Status: APPROVED*` autonomously, the Implementer has no signal it is safe to proceed, and `/relay-execute` cannot be wired without a stub. Manual approval re-introduces the human in the autonomous portion of the pipeline that the interactivity boundary explicitly excludes.

## Solution Statement

Implement a single markdown agent file (`plugins/relay/agents/plan-reviewer.md`) following the proven `prd-reviewer.md` shape: YAML frontmatter, Inputs, Hard constraints, the 8-item rubric (R1–R8 with explicit pass/fail criteria), the Protocol (Load → Run rubric → Branch → Auto-flip OR CHANGES_REQUESTED), the review.jsonl format, and the dialogue rules for inline-edit vs writer-handoff (used only on CHANGES_REQUESTED). All reads/writes scoped under `<target_root>`; no `.claude/` writes; the auto-flip step (Step 4) is fully autonomous with a final re-validation guard.

## Metadata

| Field            | Value                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| Type             | NEW_CAPABILITY                                                                       |
| Complexity       | MEDIUM                                                                               |
| Systems Affected | `plugins/relay/agents/`, `PRPs/plans/` (read + jsonl write + status flip Edit)       |
| Dependencies     | sibling `plan-writer` (Phase 1, complete) for Task-handoff on structural defects     |
| Estimated Tasks  | 6                                                                                    |
| Source PRD       | `PRPs/prds/plan-authoring.prd.md` Phase 2                                            |

---

## Mandatory Reading

Before authoring `plan-reviewer.md`, the implementer MUST read:

| Priority | File                                                              | Lines      | Why                                                                              |
| -------- | ----------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| P0       | `plugins/relay/agents/prd-reviewer.md`                            | 1-346      | Pattern to MIRROR — frontmatter, hard constraints, rubric prose, jsonl, dialogue |
| P0       | `PRPs/prds/plan-authoring.prd.md`                                 | all        | Source PRD; AC-3, AC-4, AC-6, AC-7, AC-9, AC-10 are this agent's contract        |
| P0       | `plugins/relay/agents/plan-writer.md`                             | 1-548      | Sibling writer; the artifacts plan-reviewer validates and the agent it hands off to |
| P1       | `docs/context/prd-template.md`                                    | 173-180    | Implementation Phases canonical header — R8 traceability cross-reads              |
| P1       | `plugins/relay/agents/prd-writer.md`                              | 382-386    | TDD verbatim strings — single source of truth for R5                             |
| P1       | `docs/anti-patterns.md`                                           | 60-66      | `.claude/` write prohibition — R6 driver                                         |
| P2       | `PRPs/prds/plan-authoring.review.jsonl`                           | all        | Real jsonl shape (existing PRD-stage log) — confirm format on disk               |
| P2       | `PRPs/plans/completed/plan-authoring-phase-1-plan-writer.plan.md` | all        | Real DRAFT plan that plan-reviewer must approve as its first dogfood             |

No external library docs needed — markdown prompt deliverable.

---

## Patterns to Mirror

### NAMING + FRONTMATTER

```yaml
# SOURCE: plugins/relay/agents/prd-reviewer.md:1-7
# COPY THIS PATTERN (adapt name, description, color):
---
name: prd-reviewer
description: Validate a DRAFT PRD against the 7-item structural rubric derived from docs/context/prd-template.md and AC-10 of PRPs/prds/prd-authoring.prd.md. Returns APPROVED (rubric fully passes + user confirms) or CHANGES_REQUESTED (bullet list of defects). Dialogues with the user on small edits; hands back to the prd-writer agent for structural regeneration. Owns the DRAFT→APPROVED status flip.
model: sonnet
color: teal
tools: Read, Edit, Write, Task
---
```

For `plan-reviewer`:
- `name: plan-reviewer`
- `color: cyan` (unused — current palette: blue, teal, purple, amber, coral, green, orange)
- `tools: Read, Edit, Write, Task` (same set as prd-reviewer; needs Task for plan-writer handoff on structural defects)
- `description`: one sentence stating the 8-item rubric, **auto-approve on rubric pass** (mention this divergence explicitly), CHANGES_REQUESTED bullet list otherwise, jsonl logging, and that it owns the DRAFT→APPROVED flip for plans.

### HARD CONSTRAINTS BLOCK

```markdown
# SOURCE: plugins/relay/agents/prd-reviewer.md:33-56
# COPY THIS PATTERN, adapting items #1, #2, #5 for autonomous flow:

## Hard constraints (read before anything else)

1. **The flip is gated by ONE condition.** The 8-item rubric must pass.
   No user dialogue; no "Aprovar?" prompt. This is the canonical
   divergence from `prd-reviewer.md` mandated by the interactivity
   boundary (`docs/context/architecture.md` §Interactivity boundary).
2. **Re-validate the rubric immediately before flipping.** Even though
   no user can edit the file mid-run, the file may have been changed
   by another agent or process. Re-run R1–R8 against on-disk content
   right before the Edit. If re-validation fails, return
   CHANGES_REQUESTED — do NOT flip.
3. **Run all 8 rubric items every run, no short-circuit.** AC-10
   mandates the jsonl `rubric` array contain exactly 8 objects with
   ids R1, R2, R3, R4, R5, R6, R7, R8 (one of each, no duplicates,
   no extras), each with a boolean `passed` field — regardless of
   whether earlier items failed.
4. **Structural defects go back to plan-writer via Task.** When the
   defect requires regenerating Patterns to Mirror, the Step-by-Step
   Tasks block, or the Decision Gate block, invoke `plan-writer` via
   `Task`. Inline edits are reserved for single-row / single-line
   fixes that do not change the plan's shape.
5. **Every verdict logs to `PRPs/plans/<basename>.review.jsonl`.**
   One JSON object per line, appended. Never truncate.
6. **Status flip is a two-line `Edit`** — same shape as prd-reviewer:
   - `old_string`: `*Status: DRAFT*`
   - `new_string`: `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`
7. **No `.claude/` writes.** All paths resolve under
   `<target_root>/PRPs/plans/`. The string `.claude/PRPs/` MUST NOT
   appear in any path passed to `Write` or `Edit`. R6 mirrors this
   for the plan body.
```

### THE 8-ITEM RUBRIC (R1–R8)

The first 7 items mirror the prd-reviewer's R1–R7 with plan-specific anchors. R8 is new.

```markdown
# R1 — Decision Gate block, well-formed, first fenced block
SOURCE: plugins/relay/agents/prd-reviewer.md:65-75
ADAPTATION: identical shape; the block sits below the plan title,
              same six required lines.

# R2 — All 14 mandatory plan sections present and in order
SOURCE: plugins/relay/agents/prd-reviewer.md:77-97 (PRD's R2 lists 15)
ADAPTATION: list the 14 plan sections from `plan-writer.md` Step 4.4:
  ## Source PRD
  ## Summary
  ## User Story
  ## Problem Statement
  ## Solution Statement
  ## Metadata
  ## Mandatory Reading
  ## Patterns to Mirror
  ## Files to Change
  ## NOT Building (Scope Limits)
  ## Step-by-Step Tasks
  ## Validation Commands
  ## Acceptance Criteria
  ## Risks and Mitigations
  ## Notes
NOTE: 15 sections including `## Source PRD`. The PRD Phase Details
text says "14 mandatory sections" (line 70, 206). Reconcile in Task 4
below by including `## Source PRD` as section #1 of the 14, with the
per-row Summary subsumed (or treat Source PRD + 14 body sections = 15
total; the Phase 1 plan-writer used 14 body sections + Source PRD
prefix). Implementer must lock the count to 14 by either folding
Source PRD into Metadata or making it the 14th. Recommended: keep
Source PRD as a first-class section and document R2 as enforcing the
14-section list of body sections AFTER the title + Decision Gate +
Source PRD prefix block.

# R3 — No TBD tokens in mandatory fields
SOURCE: plugins/relay/agents/prd-reviewer.md:98-115
ADAPTATION: scan these plan sections for "TBD" / "TBD - needs validation":
  ## Summary body
  ## Patterns to Mirror — code-snippet headers (SOURCE: lines)
  ## Files to Change — table cells
  ## Step-by-Step Tasks — every task's MIRROR and VALIDATE lines
TBD permitted in:
  ## Notes (research gaps)
  ## Risks and Mitigations (mitigation column when deferred)

# R4 — Step-by-Step Tasks count and shape (replaces PRD's R4 about ACs)
SOURCE: plugins/relay/agents/prd-reviewer.md:116-124 (different domain)
NEW SHAPE per AC-9 / `plan-authoring.prd.md` line 86:
  - At least 3 tasks under `## Step-by-Step Tasks`.
  - Each task contains the literal keyword `VALIDATE` followed by a
    non-empty command line (on the same line or the immediately
    following line).
  - Fewer than 3 tasks → fail.
  - Any task missing a VALIDATE command → fail.

# R5 — TDD routing note matches methodology.md
SOURCE: plugins/relay/agents/prd-reviewer.md:126-135
ADAPTATION: same logic, but the TDD note lives in the plan's
            ## Notes section (per plan-writer Step 4.4.bis).
            Verify byte-exact match against one of the three strings
            from `plugins/relay/agents/prd-writer.md:382-386` — the
            single source of truth.

# R6 — Output path has no `.claude/` prefix
SOURCE: plugins/relay/agents/prd-reviewer.md:136-140
ADAPTATION: identical, scoped to plan path:
  - `draft_path` (the input path passed to plan-reviewer) must not
    contain `/.claude/` or start with `.claude/` relative to
    target_root.
  - The plan body must not reference `.claude/PRPs/` anywhere
    (except as a quoted prohibition reference, e.g. when listing
    the anti-pattern).

# R7 — Files to Change has at least one real row
SOURCE: plugins/relay/agents/prd-reviewer.md:142-149 (PRD's R7 = Implementation Phases)
NEW SHAPE per `plan-authoring.prd.md` (R7 driver):
  - `## Files to Change` contains a markdown table with header
    `| File | Action | Justification |` (or compatible).
  - At least one data row with non-empty File, non-empty Action
    (CREATE / UPDATE / DELETE), and non-empty Justification.
  - All-TBD table is a fail.

# R8 — PRD↔plan traceability (NEW, plan-stage exclusive)
SOURCE: invented from `plan-authoring.prd.md` lines 41, 88, AC-1, AC-5
SHAPE:
  - Plan's `## Source PRD` section names a real PRD file (verify it
    exists under `<target_root>/PRPs/prds/`).
  - Plan's `## Acceptance Criteria` items each reference at least
    one PRD AC-N (format: `**AC-A<i> (PRD AC-<N>):**` or similar).
    Every AC-A item must cite a PRD AC-N that exists in the source
    PRD's `## Acceptance Criteria` section.
  - Source PRD's row N (extracted from filename suffix
    `phase-<N>-`) has its `Status` cell set to `in-progress` or
    `complete` AND its `PRP Plan` cell pointing at this plan path.
    A row still showing `pending` or `-` in `PRP Plan` is a fail
    (plan-writer's Phase 5 back-fill did not run; structural defect).
```

### AUTO-FLIP PROTOCOL (Step 4 — happy path)

```markdown
# SOURCE: plugins/relay/agents/prd-reviewer.md:209-228
# ADAPTATION: drop the "Aprovar PRD?" gate; flip is rubric-only.

### Step 4 — Auto-flip (happy path, autonomous)

No user dialogue.

1. Re-run R1 through R8 one more time against the current on-disk
   content. If anything changed since Step 2 and a rubric item now
   fails, return CHANGES_REQUESTED with the new defect list — do
   NOT flip.
2. Use `Edit` to replace:
   - `old_string`: `*Status: DRAFT*`
   - `new_string`: `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`
3. Append an APPROVED entry to
   `<target_root>/PRPs/plans/<basename>.review.jsonl` (see jsonl
   format below). The entry's `rubric` array MUST contain all 8
   items each with `passed: true`. `action: "final_flip"`.
4. Emit the final summary:

   > ✅ Plan **APPROVED** at `PRPs/plans/<basename>.plan.md`.
   > Ready for the Implementer.

Exit. The orchestrator (or developer) takes over.
```

### CHANGES_REQUESTED (Step 3 fail branch)

```markdown
# SOURCE: plugins/relay/agents/prd-reviewer.md:191-207
# ADAPTATION: drop the question; just emit the bullet list.

#### One or more fail

1. Append a CHANGES_REQUESTED entry to
   `<target_root>/PRPs/plans/<basename>.review.jsonl` — `rubric`
   array contains all 8 items (no short-circuit, AC-10).
2. Emit a bullet list naming each failing rubric item by ID + reason:

   > **Rubric found defects.**
   >
   > - **R3** — Patterns to Mirror contains "TBD - needs validation"
   >   in 2 snippet SOURCE headers; mandatory section cannot defer.
   > - **R4** — Only 2 tasks under Step-by-Step Tasks; rubric
   >   requires at least 3.
   > - **R8** — Plan AC-A2 references PRD AC-99 which does not
   >   exist in `PRPs/prds/<feature>.prd.md`.
   >
   > File left at `*Status: DRAFT*`. Resolve the defects and re-run
   > `/relay-plan-review`, or hand back to `plan-writer` for
   > structural regeneration via `Task`.

3. Do NOT flip the status. Do NOT modify the plan body.
4. Exit. No further dialogue.

Note: the plan-reviewer NEVER prompts the user. CHANGES_REQUESTED is
terminal for this run; the caller (orchestrator or developer) decides
whether to invoke plan-writer for regeneration or hand-edit the plan.
```

### REVIEW.JSONL FORMAT

```markdown
# SOURCE: plugins/relay/agents/prd-reviewer.md:285-311
# ADAPTATION: identical, scoped to PRPs/plans/. rubric array has 8 items.

Path: `<target_root>/PRPs/plans/<basename>.review.jsonl`

One JSON object per line, appended (never truncated). Shape:

```json
{
  "timestamp": "2026-04-25T19:33:00Z",
  "verdict": "APPROVED",
  "rubric": [
    { "id": "R1", "passed": true },
    { "id": "R2", "passed": true },
    { "id": "R3", "passed": true },
    { "id": "R4", "passed": true },
    { "id": "R5", "passed": true },
    { "id": "R6", "passed": true },
    { "id": "R7", "passed": true },
    { "id": "R8", "passed": true }
  ],
  "action": "final_flip",
  "user_message": ""
}
```

CHANGES_REQUESTED entry — same shape, with `passed: false` and
non-empty `reason` strings on failing items, `action: "rubric_fail"`,
and `user_message: ""` (no user dialogue in autonomous flow).

Append-only:
1. `Read` existing file (empty string if absent).
2. Concatenate existing content + one newline + new JSON line.
3. `Write` the result back.
```

### TASK HANDOFF TO plan-writer

```markdown
# SOURCE: plugins/relay/agents/prd-reviewer.md:239-247
# ADAPTATION: only used on CHANGES_REQUESTED, only when caller
              opts in via re-running plan-writer. The reviewer
              itself never invokes Task in the autonomous flow.

If the caller (orchestrator or developer) decides to regenerate
after CHANGES_REQUESTED, they re-run /relay-plan against the same
PRD. The plan-reviewer documents the handoff target as plan-writer
in the CHANGES_REQUESTED message — but does not Task-dispatch
itself. (Diverges from prd-reviewer which DOES Task-dispatch in its
dialogue loop; the autonomous flow has no dialogue loop.)
```

---

## Files to Change

| File                                              | Action | Justification                                                            |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `plugins/relay/agents/plan-reviewer.md`           | CREATE | The Phase 2 deliverable — autonomous plan-reviewer agent                 |
| `PRPs/prds/plan-authoring.prd.md`                 | UPDATE | Back-fill row 2 (Status `pending` → `in-progress` → `complete`)          |

---

## NOT Building (Scope Limits)

- **The `/relay-plan-review` command.** Phase 4; depends on this phase.
- **`docs/context/plan-template.md`.** Phase 5; until it lands, R2's section list is hard-coded from `plan-writer.md` Step 4.4.
- **A `--strict` reviewer flag** re-introducing user-confirmation. Explicit Won't-build per PRD MoSCoW.
- **Auto-loop writer↔reviewer on CHANGES_REQUESTED.** Orchestrator's job.
- **Dialogue loop on rubric fail.** Diverges from prd-reviewer Step 5; CHANGES_REQUESTED is terminal in the autonomous flow.
- **Re-opening an APPROVED plan.** Refused at command-layer precondition; reviewer returns the `already_approved` error if it ever sees one.
- **Semantic critique of plan content.** Reviewer validates structure + traceability; not whether the plan is a good implementation strategy.
- **Coverage analysis, code review.** Other agents' jobs (Implementer / Test Runner).

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and has a VALIDATE step.

### Task 1: CREATE `plugins/relay/agents/plan-reviewer.md` skeleton (frontmatter + intro + Inputs)

- **ACTION**: Create the file with YAML frontmatter, opening prose, and an Inputs section.
- **MIRROR**: `plugins/relay/agents/prd-reviewer.md:1-30`
- **FRONTMATTER**: `name: plan-reviewer`, `model: sonnet`, `color: cyan`, `tools: Read, Edit, Write, Task`
- **DESCRIPTION FIELD**: one sentence summarizing the 8-item rubric, AUTO-FLIP on rubric pass (state explicitly), CHANGES_REQUESTED on fail, jsonl logging at `PRPs/plans/<basename>.review.jsonl`, and ownership of the DRAFT→APPROVED flip for plans.
- **INPUTS section**: document `draft_path` (absolute, command-verified DRAFT) and `target_root` (cwd). Note that `draft_path` ends in `.plan.md` (vs prd-reviewer's `.prd.md`).
- **OPENING PROSE**: state the agent's single responsibility (validate + auto-flip on rubric pass), and list the things it does NOT do (write plans, modify plan bodies on rubric pass, prompt the user, short-circuit the rubric).
- **VALIDATE**: `python -c "import yaml; t=open('plugins/relay/agents/plan-reviewer.md').read(); yaml.safe_load(t.split('---',2)[1])"` exits 0; `grep -c "name: plan-reviewer" plugins/relay/agents/plan-reviewer.md` returns `1`.

### Task 2: ADD Hard Constraints section (7 items, autonomous-flow adapted)

- **ACTION**: Append the Hard Constraints block per the snippet above.
- **MIRROR**: `plugins/relay/agents/prd-reviewer.md:33-56`
- **DEVIATIONS FROM prd-reviewer**:
  - #1 swaps "rubric AND user approval" for "rubric only — no Aprovar gate". Cite `docs/context/architecture.md` §Interactivity boundary.
  - #3 added: AC-10 no-short-circuit (rubric array always has all 8 items).
  - #7 added: no `.claude/` writes (R6 mirror).
- **VALIDATE**: `grep -c "auto-flip\|Aprovar\|interactivity boundary" plugins/relay/agents/plan-reviewer.md` ≥ 1; `grep -F "no short-circuit" plugins/relay/agents/plan-reviewer.md` returns at least one match.

### Task 3: ADD The 8-item rubric (R1–R8)

- **ACTION**: Append the rubric section with one heading per item, each spelling out pass/fail criteria.
- **MIRROR**: `plugins/relay/agents/prd-reviewer.md:60-149` for R1–R7 prose discipline.
- **R1**: identical shape to prd-reviewer R1; six required lines below the plan title.
- **R2**: list the 15 plan sections (`## Source PRD` + 14 body sections per `plan-writer.md` Step 4.4). Document the section-count reconciliation: rubric enforces sections in this exact order; the "14 mandatory" wording in the PRD refers to body sections after the Source PRD prefix.
- **R3**: TBD scan covering Patterns to Mirror SOURCE headers, Files to Change cells, Step-by-Step MIRROR/VALIDATE lines.
- **R4**: ≥3 tasks each containing `VALIDATE` keyword + non-empty command (NEW shape per AC-9).
- **R5**: TDD note byte-exact match against one of the three strings from `prd-writer.md:382-386`.
- **R6**: no `.claude/` in `draft_path` or in plan body (except as quoted prohibition).
- **R7**: Files to Change has ≥1 real row.
- **R8** (NEW): three sub-checks — (a) Source PRD file exists, (b) every plan AC-A item references a real PRD AC-N, (c) source PRD row N's Status is `in-progress`/`complete` and `PRP Plan` cell points at this plan.
- **MIRROR**: `plugins/relay/agents/prd-writer.md:382-386` is named explicitly as the R5 source of truth.
- **VALIDATE**: `grep -E "^### R[1-8] " plugins/relay/agents/plan-reviewer.md | wc -l` returns `8`; `grep -F "382-386" plugins/relay/agents/plan-reviewer.md` returns at least one match (R5 source-of-truth pointer).

### Task 4: ADD Protocol — Step 1 (Load) and Step 2 (Run rubric, no short-circuit)

- **ACTION**: Append two protocol sections.
  - **Step 1 — Load and parse**: `Read` the full DRAFT. Verify it ends with `*Status: DRAFT*`. If it ends with `*Status: APPROVED*`, return the `already_approved` error JSON exactly as prd-reviewer does (mirror lines 158–163).
  - **Step 2 — Run the rubric**: walk R1 through R8 in order; record each as a `{id, passed, reason?}` object. **Do NOT short-circuit** — every run produces all 8 results.
- **MIRROR**: `plugins/relay/agents/prd-reviewer.md:155-171`
- **GOTCHA**: AC-10 explicitly forbids short-circuit. Even if R1 fails (Decision Gate missing), the agent still evaluates R2–R8 and records all 8 entries. This is the behavioral difference from a typical fail-fast validator.
- **VALIDATE**: `grep -F "already_approved" plugins/relay/agents/plan-reviewer.md` returns at least one match; `grep -F "no short-circuit\|all 8 rubric items" plugins/relay/agents/plan-reviewer.md` returns at least one match.

### Task 5: ADD Step 3 (Branch) + Step 4 (Auto-flip) + Step 5 deferred

- **ACTION**: Append three protocol sections.
  - **Step 3 — Branch on the result**:
    - **All 8 pass** → proceed directly to Step 4 (no user dialogue).
    - **One or more fail** → emit the CHANGES_REQUESTED bullet list (CHANGES_REQUESTED snippet above), append jsonl with `verdict: "CHANGES_REQUESTED"` and all 8 rubric items, leave file at DRAFT, exit.
  - **Step 4 — Auto-flip (happy path, autonomous)** (AUTO-FLIP PROTOCOL snippet above):
    1. Re-run R1–R8 against on-disk content (final guard).
    2. `Edit` flip: `old_string="*Status: DRAFT*"`, `new_string="*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*"`.
    3. Append jsonl APPROVED entry with all 8 items `passed: true`.
    4. Emit final summary `> ✅ Plan APPROVED at PRPs/plans/<basename>.plan.md. Ready for the Implementer.`
    5. Exit.
  - **Step 5** — explicitly DEFERRED. Document that no Step 5 dialogue loop exists in the autonomous flow (diverges from prd-reviewer Step 5). CHANGES_REQUESTED is terminal; the orchestrator decides regeneration.
- **MIRROR**: `plugins/relay/agents/prd-reviewer.md:174-228` for Step 3+4 prose; explicitly call out the divergence from `prd-reviewer.md:230-251` (Step 5) which is NOT mirrored.
- **AC LINKAGE**: AC-3 (auto-flip on rubric pass), AC-4 (CHANGES_REQUESTED bullet list + jsonl + DRAFT untouched), AC-10 (rubric array has 8 items every run).
- **VALIDATE**: `grep -F "✅ Plan **APPROVED**" plugins/relay/agents/plan-reviewer.md` returns at least one match; `grep -F "*Approved: <YYYY-MM-DD>*" plugins/relay/agents/plan-reviewer.md` returns at least one match.

### Task 6: ADD review.jsonl format + Anti-patterns + Out-of-scope sections

- **ACTION**: Append three closing sections.
  - **review.jsonl format**: path `<target_root>/PRPs/plans/<basename>.review.jsonl`; shape with 8-item rubric array; append-only protocol (Read existing → concat → Write); missing file created on first verdict.
  - **Anti-patterns (hard rules)**: list at least 8 hard rules — flipping without the rubric pass; flipping without the final re-validation guard; short-circuiting the rubric (skipping items after a fail); writing under `.claude/`; rewriting plan bodies inline when the rubric passes (no edits on the happy path); prompting the user (autonomous flow); using `Write` to rewrite the plan (use `Edit` for surgical changes; `Write` only for review.jsonl); approving a plan whose source PRD row N still shows `pending` (R8 catches this).
  - **Out of scope (explicit deferrals)**: generating plan content (plan-writer); semantic critique of implementation strategy; running research subagents; opening an APPROVED plan; coverage / test validation.
- **MIRROR**: `plugins/relay/agents/prd-reviewer.md:285-346`
- **VALIDATE**: `grep -F "PRPs/plans/<basename>.review.jsonl" plugins/relay/agents/plan-reviewer.md` returns at least one match; `grep -F "Anti-patterns" plugins/relay/agents/plan-reviewer.md` returns at least one match; `grep -F "Out of scope" plugins/relay/agents/plan-reviewer.md` returns at least one match.

---

## Validation Commands

This deliverable has no compilable code; validation is structural.

### Level 1: STATIC_ANALYSIS (markdown + YAML)

```bash
F=plugins/relay/agents/plan-reviewer.md
python -c "import yaml,sys; t=open('$F').read(); fm=t.split('---',2)[1]; yaml.safe_load(fm); print('OK')"
for f in plugins/relay/agents/*.md; do
  python -c "import yaml; t=open('$f').read(); yaml.safe_load(t.split('---',2)[1])" 2>/dev/null && echo "OK: $f" || echo "BAD: $f"
done
```

**EXPECT**: Exit 0, `OK` printed, no `BAD:` lines.

### Level 2: CONTENT_INVARIANTS (grep)

```bash
F=plugins/relay/agents/plan-reviewer.md

# 8 rubric headings present
test "$(grep -cE '^### R[1-8] ' $F)" -eq 8

# Auto-flip language (canonical divergence from prd-reviewer)
grep -F "auto-flip" "$F"
grep -F "interactivity boundary" "$F"

# AC-10 no-short-circuit
grep -F "no short-circuit" "$F" || grep -F "all 8 rubric items" "$F"

# AC-3 status flip Edit
grep -F '*Status: DRAFT*' "$F"
grep -F '*Approved: <YYYY-MM-DD>*' "$F"
grep -F '*Status: APPROVED*' "$F"

# AC-4 CHANGES_REQUESTED
grep -F "CHANGES_REQUESTED" "$F"

# AC-10 jsonl 8-item array
grep -F "PRPs/plans/<basename>.review.jsonl" "$F"

# already_approved guard (mirror prd-reviewer)
grep -F "already_approved" "$F"

# R5 source of truth pointer
grep -F "382-386" "$F"

# R6 forbids .claude/ in draft_path AND plan body
grep -F ".claude/" "$F"

# No stray /relay-prd references (only /relay-plan-review)
! grep -E '/relay-prd[^-]' "$F"

# Final summary phrase
grep -F "Ready for the Implementer" "$F"
```

**EXPECT**: Each command exits 0 (matches present, except the negated `! grep`).

### Level 3: DRY-RUN END-TO-END

```bash
# In a Claude Code session with the relay plugin loaded:
# 1. Manually invoke: Task(subagent_type="plan-reviewer",
#    prompt="draft_path=PRPs/plans/completed/plan-authoring-phase-1-plan-writer.plan.md, target_root=$PWD")
#    NOTE: The Phase 1 plan was archived to completed/. For dogfooding,
#    move it back to PRPs/plans/ first, or generate a fresh DRAFT via
#    plan-writer (Phase 1 dogfood) and feed that.
# 2. Confirm the agent:
#    a. Reads the plan, verifies trailing *Status: DRAFT*
#    b. Runs all 8 rubric items, recording each pass/fail
#    c. On full pass: Edits the plan to flip status, appends APPROVED
#       jsonl entry with 8-item rubric array, emits success summary
#    d. On any fail: appends CHANGES_REQUESTED jsonl entry, emits
#       bullet list, leaves plan at DRAFT
# 3. Inspect the jsonl file:
#    cat PRPs/plans/<basename>.review.jsonl | python -c \
#      "import json,sys; [print(len(json.loads(l)['rubric'])) for l in sys.stdin]"
#    EXPECT: every line prints "8".
```

**EXPECT**: A new APPROVED plan or a CHANGES_REQUESTED bullet list; jsonl entry with 8-item rubric array; no user prompts during the run; no `.claude/` writes.

---

## Acceptance Criteria

Each item ties back to a numbered AC in `PRPs/prds/plan-authoring.prd.md`.

- **AC-A1 (PRD AC-3):** Given a DRAFT plan that passes all 8 rubric items, the agent flips `*Status: DRAFT*` to `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*` via two-line `Edit`, appends one APPROVED entry to `PRPs/plans/<basename>.review.jsonl` with an 8-item rubric array, emits the success summary, and exits — without prompting the user.
- **AC-A2 (PRD AC-4):** Given a DRAFT plan with one or more rubric failures, the agent returns a bullet list naming each failing rubric item by ID + reason, appends a CHANGES_REQUESTED entry to the jsonl log (with all 8 items in the rubric array, no short-circuit), leaves the file at `*Status: DRAFT*`, and does not perform the flip.
- **AC-A6 (PRD AC-6):** Given any invocation of plan-reviewer, no resolved write path contains `/.claude/`. R6 fails any plan body referencing `.claude/PRPs/`.
- **AC-A7 (PRD AC-7):** R5 verifies the plan's TDD routing note matches one of the three byte-exact strings from `prd-writer.md:382-386` according to `docs/context/methodology.md`'s `tdd:` value at review time. Any deviation fails R5.
- **AC-A9 (PRD AC-9):** R4 fails any plan with fewer than 3 tasks under `## Step-by-Step Tasks` or any task missing a `VALIDATE` keyword followed by a non-empty command line.
- **AC-A10 (PRD AC-10):** Every jsonl entry's `rubric` array contains exactly 8 objects with `id` values `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8` (one of each, no duplicates, no extras), each with a boolean `passed` field — regardless of whether earlier items failed.

---

## Risks and Mitigations

| Risk                                                              | Likelihood | Impact | Mitigation                                                                                       |
| ----------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------ |
| 14-vs-15 section-count ambiguity in R2                            | M          | M      | Task 3 reconciles by treating Source PRD as section #1 of 15 enforced sections; document in R2 prose |
| TDD verbatim strings drift from `prd-writer.md`                   | M          | M      | R5 prose names `prd-writer.md:382-386` as single source of truth; any drift caught here          |
| Auto-approve hides bad plans (semantic, not structural defects)   | M          | M      | Documented in PRD Risks; Test Runner downstream catches semantic drift; deferred `--strict` flag |
| jsonl append race if reviewer invoked concurrently                | L          | L      | Same race risk as prd-reviewer; mitigated at orchestrator layer; out-of-scope for this phase     |
| R8 false-positive when source PRD's row N is hand-edited offline  | L          | L      | R8 reads on-disk PRD content at review time; row N must be in-progress/complete with plan path   |
| First dogfood plan (Phase 1's `plan-writer` plan) was archived    | —          | —      | Acceptable; dry-run requires moving the file back to `PRPs/plans/` or generating a fresh DRAFT   |

---

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Color choice (`cyan`):** Picked from outside the existing palette (blue, teal, purple, amber, coral, green, orange-Phase-1). `cyan` pairs visually with `orange` (plan-writer) for the plan stage.

**Canonical divergences from `prd-reviewer.md`** — make these the agent file's most-prominent callouts so future maintainers don't accidentally re-introduce the PRD-stage dialogue:
1. **Auto-flip on rubric pass** (no "Aprovar?" gate). Mandated by interactivity boundary.
2. **8 rubric items, not 7.** R8 = PRD↔plan traceability, exclusive to plan stage.
3. **No-short-circuit rubric** (AC-10). Every run records all 8 outcomes.
4. **No Step 5 dialogue loop.** CHANGES_REQUESTED is terminal; orchestrator decides regeneration.

**Dogfood opportunity:** Once this phase lands, manually invoke `Task(subagent_type="plan-reviewer", ...)` against the Phase 1 plan (after un-archiving) — that closes the loop and validates the writer/reviewer pair end-to-end before Phases 3–4 (the public commands) ship.

**Section-count reconciliation note (for Task 3 R2):** The PRD says "14 mandatory sections" (lines 70, 206) but `plan-writer.md` Step 4.4 enumerates 14 body sections AFTER a `## Source PRD` prefix. Either treat Source PRD as part of the 14 (folding it in) or document R2 as enforcing 15 sections total (Source PRD + 14 body sections). Recommended: enforce 15 in R2 and update the PRD Phase Details prose to "14 body sections + Source PRD prefix" in a future docs pass (Phase 6).

---

*Generated: 2026-04-25*
*Status: DRAFT*
