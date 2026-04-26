# Feature: plan-writer agent (Phase 1 of plan-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation; new agent file in plugins/relay/agents/; impacts orchestrator and downstream pipeline (Implementer, Test Runner, TDD agents)
- Decisions found:
  - [2026-04-19] Command surface: writer/reviewer split — `plan-writer` is the writer half; `plan-reviewer` is its sibling (Phase 2, not this plan).
  - [2026-04-19] PRP artifact paths under `PRPs/`, never `.claude/` — plan output goes to `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — plan-writer runs without user dialogue.
  - [2026-04-19] Keep upstream `prp-core` as reference, not active relay code — `plugins/prp-core/commands/prp-plan.md` is the section-shape reference; never imported.
  - [2026-04-19] PRD template fork — Plan Writer consumes the canonical PRD shape at `docs/context/prd-template.md`; the PRD's Implementation Phases table is the bidirectional link surface.
  - [2026-04-19] Methodology declaration — plan-writer reads `tdd:` from `docs/context/methodology.md` and emits a routing note matching the same three exact strings the PRD Writer uses.
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — `docs/anti-patterns.md:60-66`.
  - Treating `plugins/prp-core/` as active relay code — section shape is studied, never imported.
  - Activating the TDD track by heuristic — plan-writer reads only `tdd:` from `methodology.md`.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — Plan Writer is the first writer downstream of the PRD pair.
  - Interactivity boundary — autonomous from PRD-APPROVED onward; plan-writer MUST NOT prompt the user.
  - PRPs/ artifact path convention.
- Result: PROCEED
```

## Summary

Create `plugins/relay/agents/plan-writer.md` — an autonomous Claude Code subagent that consumes an APPROVED PRD, selects the next actionable phase from its Implementation Phases table, dispatches the existing `research-codebase` and `research-web` subagents in parallel for grounding, consults the three Decision Gate sources, writes a DRAFT plan file at `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`, and back-fills the source PRD's row N (Status `pending` → `in-progress`, `PRP Plan` cell populated). Mirrors the file structure of `plugins/relay/agents/prd-writer.md` byte-for-pattern, with autonomous-flow adaptations (no user dialogue) and the per-phase-plan filename convention.

## User Story

As the relay developer (and future `/relay-execute` orchestrator),
I want plan-writer to deterministically transform an APPROVED PRD phase into a DRAFT plan,
So that the Implementer can proceed without me re-deriving context and the autonomous pipeline does not stall.

## Problem Statement

Today there is no producer for the `PRP Plan` column of an APPROVED PRD's Implementation Phases table. Without plan-writer, the relay pipeline halts at PRD-APPROVED — `/relay-execute` cannot be wired, and the Implementer has no per-phase contract to consume. Manual planning re-derives context every run and produces hallucinated paths.

## Solution Statement

Implement a single markdown agent file (`plugins/relay/agents/plan-writer.md`) following the proven `prd-writer.md` shape: YAML frontmatter, Inputs, Hard constraints, then numbered Phases (0 setup → 1 PRD parse + phase selection → 2 research dispatch → 3 Decision Gate → 4 plan assembly + write → 5 PRD back-fill + handoff). All reads/writes are scoped under `<target_root>`; no `.claude/` writes; no user prompts. The agent's contract is fully derivable from `PRPs/prds/plan-authoring.prd.md` AC-1, AC-2, AC-5, AC-6, AC-7, AC-8.

## Metadata

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Type             | NEW_CAPABILITY                                                   |
| Complexity       | MEDIUM                                                           |
| Systems Affected | `plugins/relay/agents/`, `PRPs/plans/`, `PRPs/prds/` (back-fill) |
| Dependencies     | existing `research-codebase`, `research-web` subagents           |
| Estimated Tasks  | 6                                                                |
| Source PRD       | `PRPs/prds/plan-authoring.prd.md` Phase 1                        |

---

## Mandatory Reading

Before authoring `plan-writer.md`, the implementer MUST read:

| Priority | File                                                                    | Lines    | Why                                                                    |
| -------- | ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| P0       | `plugins/relay/agents/prd-writer.md`                                    | 1-462    | Pattern to MIRROR — frontmatter, hard constraints, phase prose, halts  |
| P0       | `PRPs/prds/plan-authoring.prd.md`                                       | all      | Source PRD; AC-1, AC-2, AC-5, AC-6, AC-7, AC-8 are the contract        |
| P0       | `plugins/prp-core/commands/prp-plan.md`                                 | 358-693  | Section-shape REFERENCE for the plan body the agent writes (not import)|
| P1       | `docs/context/prd-template.md`                                          | 173-180  | Implementation Phases table column header — exact parser target        |
| P1       | `plugins/relay/agents/research-codebase.md`                             | 1-153    | Subagent input/output JSON shape                                       |
| P1       | `plugins/relay/agents/research-web.md`                                  | 1-141    | Subagent input/output JSON shape                                       |
| P1       | `docs/anti-patterns.md`                                                 | 60-66    | `.claude/` write prohibition — R6 rubric driver                        |
| P2       | `plugins/relay/agents/prd-reviewer.md`                                  | 51-56,287-310 | Status flip + jsonl logging — sibling reviewer's contract         |
| P2       | `PRPs/prds/test-runner.prd.md`                                          | 3-25,356-365  | Real Decision Gate block + real Implementation Phases table       |
| P2       | `plugins/relay/commands/relay-prd.md`                                   | 119-158  | "Adopt the writer role" pattern (relay-plan command will mirror, Phase 3) |

No external library docs needed — this is a markdown prompt, not code.

---

## Patterns to Mirror

### NAMING + FRONTMATTER

```yaml
# SOURCE: plugins/relay/agents/prd-writer.md:1-7
# COPY THIS PATTERN (adapt name, description, color, tools):
---
name: prd-writer
description: Drive the interactive 6-phase PRD authoring flow with the user, invoke relay research subagents during GROUNDING, consult the Decision Gate sources, and write a DRAFT PRD conformant with docs/context/prd-template.md to PRPs/prds/<kebab>.prd.md. Invoked by the /relay-prd command. Never approves its own output — the prd-reviewer agent owns the DRAFT→APPROVED flip.
model: sonnet
color: blue
tools: Task, Read, Write, Edit, Glob
---
```

For `plan-writer`:
- `name: plan-writer`
- `color: orange` (unused; existing palette: blue, teal, purple, amber, coral, green)
- `tools: Task, Read, Write, Edit, Glob` (same set; needs Task for research subagents, Edit for PRD back-fill)
- `description`: one-line summary describing the autonomous PRD-phase → plan-DRAFT transformation, mentioning that `plan-reviewer` owns the DRAFT→APPROVED flip.

### HARD-CONSTRAINTS BLOCK

```markdown
# SOURCE: plugins/relay/agents/prd-writer.md:41-72
# COPY THIS PATTERN, REPLACING THE 7 ITEMS WITH PLAN-SPECIFIC ONES:

## Hard constraints (read before anything else)

1. **Template conformance is non-negotiable.** Every DRAFT must match
   the section order and required sections of `docs/context/plan-template.md`
   (Phase 5 deliverable; until it lands, follow the section list in
   `PRPs/prds/plan-authoring.prd.md` line 41).
2. **Decision Gate evidence block is the first fenced block below the title.**
3. **Step-by-Step Tasks section has at least 3 atomic tasks, each with a
   `VALIDATE:` line followed by a non-empty command.** (AC-9 / R4)
4. **TDD routing note matches `docs/context/methodology.md`** — copy verbatim
   from `prd-writer.md:382-386`. (AC-7 / R5)
5. **Never overwrite an APPROVED plan.** Collision → numeric suffix.
6. **TBD discipline** — never invent `file:line` references.
7. **Status lines at end of every DRAFT:** `*Generated: <YYYY-MM-DD>*` then
   `*Status: DRAFT*`. The `plan-reviewer` agent flips, never `plan-writer`.
8. **No `.claude/` writes.** All artifacts under `<target_root>/PRPs/plans/`. (AC-6 / R6)
```

### DECISION-GATE HALT MESSAGE (byte-exact for AC-8)

```markdown
# SOURCE: plugins/relay/agents/prd-writer.md:306-310
# COPY THIS PATTERN, CHANGING ONLY /relay-prd → /relay-plan:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run `/relay-plan`. No DRAFT
> has been written.
```

### TDD VERBATIM STRINGS (byte-exact, single source of truth)

```markdown
# SOURCE: plugins/relay/agents/prd-writer.md:382-386
# COPY THESE STRINGS VERBATIM into Phase 4's plan-body assembly step:

- `tdd: true` → "Current value of `tdd` in `docs/context/methodology.md`: **true**. TDD track active — TDD Writer (B7) produces the initial test suite from the Acceptance Criteria above, before the Implementer runs."
- `tdd: false` → "Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests."
- methodology.md missing → "Current value of `tdd` in `docs/context/methodology.md`: **unavailable** (file missing). Defaulting to tdd: false semantics: tests written alongside implementation."
```

### RESEARCH SUBAGENT DISPATCH

```markdown
# SOURCE: plugins/relay/agents/prd-writer.md:183-187 + commands/relay-prd.md:135-138
# COPY THIS PARALLEL-DISPATCH PATTERN:

Invoke the two research subagents **in parallel** via the `Task` tool in a
SINGLE message:

  Task(subagent_type="research-codebase", prompt=<topic + focus_areas + roots>)
  Task(subagent_type="research-web",      prompt=<topic + focus_areas>)

Topic = the selected phase's Goal + Scope (verbatim from the PRD's Phase
Details section). Focus areas = the phase's "Patterns to Mirror" anchors
inferred from Description.

Per-output handling (mirror prd-writer.md:192-213):
- Non-empty `findings`: keep all for Patterns-to-Mirror assembly.
- Empty + `degradation_reason` set: record gap in plan's Risks section.
- Unparseable: surface as partial; do NOT halt.
```

### PRD BACK-FILL EDIT (narrow `old_string`)

```markdown
# SOURCE: PRPs/prds/plan-authoring.prd.md:186 ("Use Edit with narrow old_string")
# CONCRETE PATTERN — never `Write`-rewrite the PRD:

For the selected row N (e.g. row 1 of plan-authoring.prd.md):

old_string =
  "| 1 | plan-writer agent | `plugins/relay/agents/plan-writer.md` ... | pending | yes (with #2) | - | - |"

new_string =
  "| 1 | plan-writer agent | `plugins/relay/agents/plan-writer.md` ... | in-progress | yes (with #2) | - | PRPs/plans/plan-authoring-phase-1-plan-writer.plan.md |"

The `old_string` MUST be the entire row line copied verbatim from the PRD,
guaranteeing uniqueness. Edit fails closed if multiple rows match (Edit
tool's documented behavior).
```

### STATUS LINE TRAILER

```markdown
# SOURCE: plugins/relay/agents/prd-writer.md:66-69
# COPY VERBATIM at end of every DRAFT plan:

*Generated: <YYYY-MM-DD>*
*Status: DRAFT*
```

### IMPLEMENTATION PHASES TABLE PARSER (canonical header)

```markdown
# SOURCE: docs/context/prd-template.md:175 + plugins/relay/agents/prd-reviewer.md:144-149
# THE PARSER MUST MATCH THIS HEADER EXACTLY:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|

Phase-selection rule (informally):
  pick the first row R where R.Status == "pending"
  AND (R.Depends is empty/"-" OR every phase number in R.Depends has Status == "complete").

If no such R → emit AC-2 message and exit 0 without writing.
If header mismatch → HALT (Risks row §"PRD Implementation Phases table format drifts").
```

---

## Files to Change

| File                                              | Action | Justification                                                            |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `plugins/relay/agents/plan-writer.md`             | CREATE | The Phase 1 deliverable — autonomous plan-writer agent                   |
| `PRPs/prds/plan-authoring.prd.md`                 | UPDATE | Back-fill row 1 (Status `pending` → `in-progress`; `PRP Plan` cell)      |

No other files modified by this phase. The `plan-template.md`, `relay-plan` command, `plan-reviewer`, and docs updates belong to Phases 2–6 of the PRD.

---

## NOT Building (Scope Limits)

- **The `plan-reviewer` agent.** Phase 2 of the PRD; sibling deliverable.
- **The `/relay-plan` command.** Phase 3; depends on this phase being complete.
- **`docs/context/plan-template.md`.** Phase 5; until it ships, plan-writer references the section list inline (from PRD line 41).
- **A `--phase <N>` override.** Explicit Won't-build per PRD MoSCoW.
- **Auto-loop on CHANGES_REQUESTED.** Orchestrator's job, not this agent's.
- **UX Before/After ASCII.** Not applicable — relay features have no UI.
- **Persisting research blobs.** Could-item, deferred.

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and has a VALIDATE step.

### Task 1: CREATE `plugins/relay/agents/plan-writer.md` skeleton (frontmatter + intro + Inputs)

- **ACTION**: Create the file with YAML frontmatter, opening prose paragraph identifying the agent's role, and an Inputs section.
- **MIRROR**: `plugins/relay/agents/prd-writer.md:1-37`
- **FRONTMATTER**: `name: plan-writer`, `model: sonnet`, `color: orange`, `tools: Task, Read, Write, Edit, Glob`
- **DESCRIPTION FIELD**: One sentence summarizing autonomous PRD-phase → DRAFT-plan transformation; mention that `plan-reviewer` owns the DRAFT→APPROVED flip and the per-phase filename pattern.
- **INPUTS section**: Document `prd_path` (absolute, command-verified APPROVED), `target_root` (cwd). No `mode` enum (single mode: parse-and-plan).
- **VALIDATE**: `Read` the new file end-to-end; confirm frontmatter is parseable YAML; confirm Inputs section names `prd_path` and `target_root`.

### Task 2: ADD Hard Constraints section to `plan-writer.md`

- **ACTION**: Append the 8-item Hard Constraints block (see "Patterns to Mirror" / HARD-CONSTRAINTS BLOCK above).
- **MIRROR**: `plugins/relay/agents/prd-writer.md:41-72`
- **DEVIATIONS FROM PRD-WRITER**:
  - Item 3 swaps "AC has ≥3 items" for "Step-by-Step Tasks has ≥3 atomic tasks each with VALIDATE" (AC-9).
  - Item 4 references `methodology.md` strings VERBATIM-copied from `prd-writer.md:382-386` (single source of truth per PRD line 185 / R5).
  - Add Item 8: "No `.claude/` writes" (AC-6 / R6).
- **VALIDATE**: `Grep` the file for "VALIDATE", "Decision Gate", "Status: DRAFT", "claude/" — each hard constraint must appear; the `.claude/` mention must be in the prohibition context, not as a write target.

### Task 3: ADD Phase 0 (setup) and Phase 1 (PRD parse + phase selection)

- **ACTION**: Append two sections.
  - **Phase 0**: Read `<target_root>/docs/context/methodology.md` for `tdd:`. Read `<prd_path>` end-to-end.
  - **Phase 1**: Locate the Implementation Phases table by exact header match (see parser snippet above). HALT with diagnostic on mismatch. Apply phase-selection rule. If no actionable row, emit verbatim AC-2 message: `"No pending phases with satisfied dependencies in <prd-path>. Nothing to plan."` and exit 0 without writing.
- **MIRROR**: `prd-writer.md:75-152` for the prose discipline (numbered steps, "wait for X before proceeding").
- **AC LINKAGE**: AC-2 (no actionable phase) and AC-8 (Decision Gate halt — but emitted in Phase 3 here).
- **VALIDATE**: `Grep` for "No pending phases with satisfied dependencies" — must match AC-2 wording byte-for-byte. `Grep` for the canonical column header line.

### Task 4: ADD Phase 2 (research dispatch) and Phase 3 (Decision Gate consultation)

- **ACTION**: Append two sections.
  - **Phase 2**: Single-message parallel `Task` dispatch of `research-codebase` and `research-web` (see RESEARCH SUBAGENT DISPATCH snippet above). Document the per-output handling rules (non-empty findings, degradation gap, unparseable partial).
  - **Phase 3**: Read `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` from `<target_root>` in that order. On any read failure, emit the byte-exact halt message (DECISION-GATE HALT MESSAGE snippet above) and exit without writing. Otherwise build the 6-line evidence block (Active context, Activated criteria, Decisions found, Applicable anti-patterns, Applicable architectural rules, Result).
- **MIRROR**: `prd-writer.md:180-213` for research; `prd-writer.md:297-335` for the gate.
- **AC LINKAGE**: AC-8 byte-exact halt wording. The `/relay-prd` substring must be `/relay-plan` here.
- **VALIDATE**: `Grep -F` for the literal halt phrase `"I cannot emit the Decision Gate evidence block without reading"` — must occur exactly once. `Grep` for `/relay-plan` adjacent to that phrase, NOT `/relay-prd`.

### Task 5: ADD Phase 4 (plan body assembly + write) and Phase 5 (PRD back-fill + handoff)

- **ACTION**: Append two sections.
  - **Phase 4**:
    - Compute filename: `<feature>-phase-<N>-<slug>.plan.md` where `<feature>` is the PRD basename (stripped of `.prd.md`), `<N>` is the selected phase number, `<slug>` is kebab-cased from the phase's Phase Name cell. Output path: `<target_root>/PRPs/plans/<filename>`.
    - Collision rule: if a file with the same path exists and ends with `*Status: APPROVED*`, abort with diagnostic; otherwise (`*Status: DRAFT*` or stale), append `-2`, `-3`, … until free.
    - Assemble plan body in this exact section order (the 14 mandatory sections per AC-1 / R2):
      1. `# Feature: <Phase Name>` title
      2. Decision Gate fenced block (from Phase 3)
      3. `## Summary`
      4. `## Source PRD` (path + phase number — back-reference for R8 traceability)
      5. `## Metadata` (Type, Complexity, Source PRD line ref, etc.)
      6. `## Mandatory Reading`
      7. `## Patterns to Mirror` (populated from research-codebase findings; each snippet must carry `file:line` from the findings JSON `source` field — never invent)
      8. `## Files to Change`
      9. `## NOT Building (Scope Limits)`
      10. `## Step-by-Step Tasks` (≥3, each with `VALIDATE:` line — R4)
      11. `## Validation Commands` (Levels 1–3 only)
      12. `## Acceptance Criteria` (each item must reference a PRD AC-N — R8)
      13. `## Risks and Mitigations`
      14. `## Notes`
    - TDD note: emit one of the three verbatim strings (TDD VERBATIM STRINGS snippet above), placed in `## Notes`.
    - Trailer: `*Generated: <YYYY-MM-DD>*\n*Status: DRAFT*`.
    - `Write` the file.
  - **Phase 5**:
    - `Edit` the source PRD to back-fill row N (BACK-FILL EDIT snippet above): full-row `old_string`, full-row `new_string` flipping `pending` → `in-progress` and `-` → relative plan path. Never `Write`-rewrite.
    - Emit handoff confirmation (mirror `prd-writer.md:417-421`):
      `"DRAFT plan written to PRPs/plans/<filename>. Source PRD row <N> marked in-progress. Run /relay-plan-review PRPs/plans/<filename> to validate."`
- **MIRROR**: `prd-writer.md:293-424` (Phase 7 sub-steps); `prp-core/commands/prp-plan.md:358-693` for section shape (reference only).
- **AC LINKAGE**: AC-1 (DRAFT trailer + 14 sections), AC-5 (back-fill), AC-6 (no `.claude/` in resolved path), AC-7 (TDD strings).
- **VALIDATE**: `Grep -F` for the three TDD verbatim strings — each must appear exactly once. `Grep` for `*Status: DRAFT*` placement instructions. Confirm no occurrence of `.claude/PRPs/` anywhere in the agent prose.

### Task 6: SELF-CHECK pass on the new agent file

- **ACTION**: `Read` the entire `plan-writer.md` end-to-end. Walk each PRD AC item (AC-1, AC-2, AC-5, AC-6, AC-7, AC-8, AC-9) and confirm at least one section of the agent file produces the AC's required behavior. Walk each rubric item the future `plan-reviewer` will check (R1 Decision Gate, R2 sections, R3 no TBD in mandatory fields, R4 ≥3 atomic tasks with VALIDATE, R5 TDD routing, R6 no `.claude/`, R7 ≥1 Files-to-Change row, R8 PRD↔plan traceability) — confirm the agent prose instructs how to satisfy it.
- **MIRROR**: This task has no codebase analog; it is the equivalent of Phase 7 self-confirmation in `prd-writer.md:417-424`.
- **VALIDATE**: Produce a short trace (in the PR description, not in the file) listing each AC and the agent line range that satisfies it.

---

## Validation Commands

This deliverable has no compilable code; validation is structural.

### Level 1: STATIC_ANALYSIS (markdown + YAML)

```bash
# Frontmatter parses as YAML
python -c "import yaml,sys; t=open('plugins/relay/agents/plan-writer.md').read(); fm=t.split('---',2)[1]; yaml.safe_load(fm); print('OK')"

# All sibling agents have parseable frontmatter — drift check
for f in plugins/relay/agents/*.md; do
  python -c "import yaml; t=open('$f').read(); yaml.safe_load(t.split('---',2)[1])" || echo "BAD: $f"
done
```

**EXPECT**: Exit 0, `OK` printed, no `BAD:` lines.

### Level 2: CONTENT_INVARIANTS (grep checks)

```bash
F=plugins/relay/agents/plan-writer.md

# AC-8 byte-exact halt phrase, mentions /relay-plan (not /relay-prd)
grep -F "I cannot emit the Decision Gate evidence block without reading" "$F" | grep -F "/relay-plan"

# AC-7 TDD verbatim strings — all three must appear
grep -F 'TDD track active — TDD Writer (B7) produces the initial test suite' "$F"
grep -F 'TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.' "$F"
grep -F 'unavailable** (file missing). Defaulting to tdd: false semantics' "$F"

# AC-6 no `.claude/PRPs/` write target (the only `.claude` mention must be the prohibition)
! grep -E 'Write.*\.claude/PRPs' "$F"

# Implementation Phases canonical header presence
grep -F '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |' "$F"

# AC-2 verbatim "no actionable phase" message
grep -F 'No pending phases with satisfied dependencies in' "$F"
```

**EXPECT**: Each command exits 0 (matches present, except the `! grep` line which must NOT match).

### Level 3: DRY-RUN END-TO-END

```bash
# In a Claude Code session with the relay plugin loaded:
# 1. Manually invoke the agent via Task with subagent_type="plan-writer"
#    (until /relay-plan command lands in Phase 3, this is the dispatch path).
# 2. Pass prd_path=PRPs/prds/plan-authoring.prd.md and target_root=$PWD.
# 3. Confirm the agent:
#    a. Reads methodology.md (tdd: false)
#    b. Reads the PRD
#    c. Selects phase 1 OR phase 2 (both pending, deps satisfied)
#       — but row 1's Status will already be in-progress after Task 5 of THIS plan,
#       so on first dry-run select phase 2 deterministically.
#    d. Dispatches research-codebase + research-web in a SINGLE message
#    e. Reads the three Decision Gate sources
#    f. Writes PRPs/plans/plan-authoring-phase-2-plan-reviewer-agent.plan.md
#    g. Edits the PRD's row 2 from `pending` to `in-progress`
#    h. Emits the handoff confirmation
```

**EXPECT**: A new DRAFT plan file under `PRPs/plans/`; PRD row 2 mutated; no `.claude/` writes; no user prompts during the run.

---

## Acceptance Criteria

Each item ties back to a numbered AC in `PRPs/prds/plan-authoring.prd.md`.

- **AC-A1 (PRD AC-1):** A DRAFT plan file is written at `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` containing the Decision Gate fenced block as the first fenced block below the title, the 14 mandatory sections in order, and trailing `*Status: DRAFT*`.
- **AC-A2 (PRD AC-2):** When no phase row in `Status: pending` has all dependencies `complete`, plan-writer emits `"No pending phases with satisfied dependencies in <prd-path>. Nothing to plan."` and exits 0 with no file write.
- **AC-A5 (PRD AC-5):** On successful write, the source PRD's row N has `Status` flipped from `pending` to `in-progress` and `PRP Plan` cell populated with the relative plan path. No other rows mutated.
- **AC-A6 (PRD AC-6):** No write resolves to a path containing `/.claude/`; agent prose never directs `Write` under `.claude/`.
- **AC-A7 (PRD AC-7):** The plan body's TDD note matches one of the three verbatim strings copied from `prd-writer.md:382-386` byte-for-byte.
- **AC-A8 (PRD AC-8):** When any of `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` is unreadable, the agent halts with the byte-exact halt message naming the missing file and writes no plan.
- **AC-A9 (PRD AC-9):** The Step-by-Step Tasks section the writer emits in plan bodies enforces ≥3 tasks each with a `VALIDATE` line + non-empty command.

---

## Risks and Mitigations

| Risk                                                          | Likelihood | Impact | Mitigation                                                                                  |
| ------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------- |
| TDD verbatim strings drift from `prd-writer.md` over time     | M          | M      | Agent prose names `prd-writer.md:382-386` as the source of truth; reviewer R5 cross-reads it |
| Implementation Phases table column header changes upstream    | L          | H      | Strict header-row match; HALT with diagnostic on mismatch (no silent retry)                  |
| Edit narrow-`old_string` matches multiple rows accidentally   | L          | M      | Use the FULL row line as `old_string`; Edit fails closed on ambiguity (documented behavior)  |
| Research subagent returns unparseable output                  | M          | L      | Mirror `prd-writer.md:192-213` per-output handling: surface as partial; do not halt          |
| Future per-phase filename collision (e.g. re-plan after edit) | L          | L      | Numeric-suffix collision rule; never overwrite `*Status: APPROVED*` plan                     |
| First dogfood of plan-writer plans Phase 2 (plan-reviewer)    | —          | —      | Acceptable — the agent is content-agnostic; Phase 2's plan will dogfood the same agent       |

---

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Per-phase filename divergence from `docs/api-reference.md`:** The PRD's Decisions Log (line 242) records that the api-reference's `<feature>.plan.md` shorthand is refined to `<feature>-phase-<N>-<slug>.plan.md`. The api-reference itself is updated in PRD Phase 6, not here.

**Color choice (`orange`):** Picked from outside the existing palette (blue, teal, purple, amber, coral, green). Any unused color works; coordinate with the Phase 2 `plan-reviewer` color choice when that lands.

**Dogfood opportunity:** Once this phase lands, manually invoke `Task(subagent_type="plan-writer", ...)` against `PRPs/prds/plan-authoring.prd.md` to generate Phase 2's plan. That is the first end-to-end validation of the agent's contract.

---

*Generated: 2026-04-25*
*Status: DRAFT*
