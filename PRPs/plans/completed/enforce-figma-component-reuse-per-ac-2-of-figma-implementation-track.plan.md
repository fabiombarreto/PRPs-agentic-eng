# Feature: Enforce Figma component reuse per AC-2 of figma-implementation-track (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent-file edit in plugins/relay/agents/ (cross-cutting shared pipeline artifact); reuse or creation of components
- Decisions found:
  - [2026-04-19] PRP artifacts live under `PRPs/`, never `.claude/`
  - [2026-05-14] `phase_type` Metadata-field precedent (non-heuristic per-plan declaration, reviewer structural enforcement) — the direct architectural ancestor of the zero-emission gating this fix mirrors
  - [2026-07-23] Component map is a durable `docs/design/` knowledge-base artifact, not a per-run `PRPs/` pipeline artifact
  - [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference — establishes the exact zero-emission gating pattern (`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`) this fix's new checks must mirror
  - [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder — establishes the silent-degradation-vs-hard-failure discipline this fix's "Design Spec unresolvable" branch follows
- Applicable anti-patterns:
  - Flipping `figma_track` (or any Figma-gating conditional) by heuristic — this fix gates purely off the existing `figma_track`/`design_source` declarations already read elsewhere in the codebase, never infers Figma involvement
  - Querying the Figma MCP from a dispatched writer/reviewer agent — not applicable here (code-reviewer and implementer read only the already-persisted Design Spec and component map files on disk; neither gains MCP tool access)
  - Writing pipeline artifacts under `.claude/`
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval — this fix operates entirely in the autonomous stretch (`code-reviewer`, `implementer`); no user dialogue anywhere in scope
  - `PRPs/` artifact convention; `PRPs/designs/<feature>/design-spec.md` and `docs/design/component-map.md` path conventions (`docs/context/architecture.md` PRP artifact paths table)
  - One command per stage / writer-reviewer split — unaffected; this fix touches only the two named agent files, no command file
- Result: PROCEED
```

## Source

Enforce Figma component reuse per AC-2 of figma-implementation-track: prevent a new component file from ever being created for a Figma node that a Design Spec's Component Mapping table classifies REUSE. Add a new deterministic R-COH-DS-REUSE check to code-reviewer.md's existing R-COH-* coherence layer — the id is already forward-referenced in docs/context/component-map-template.md — that fails the diff and cites the mapped import path when this happens, gated so it stays zero-emission (no rubric row at all) unless the target project declares figma_track: true and the plan's design_source Metadata reads figma, exactly mirroring plan-reviewer.md's R-COH-DESIGN-SOURCE-MISSING/R-COH-DESIGN-GROUNDED zero-emission pattern. Add a matching hard constraint and Phase 2 guard to implementer.md — currently the file has zero Figma-related constraints — mirroring the shape of its existing Step 2.3 universal test-modification guard (a halt naming the offending task, not a silent workaround), so the Implementer also refuses to create a duplicate component file for a REUSE-mapped node before code-reviewer ever reviews the diff. This closes a real gap: AC-2 was never implemented across any of the feature's 7 completed and merged phases.

Note: R8b (PRD AC-N token check) does not apply in description mode — no `(PRD AC-N)` token required. There is no source PRD row for this plan; see `## Notes` below for why this closes a gap in an existing, already-shipped feature rather than adding a new phase to it.

## Summary

`PRPs/prds/figma-implementation-track.prd.md`'s AC-2 ("Reuse enforced") was never implemented across any of the feature's 7 completed phases: `plugins/relay/agents/code-reviewer.md` and `plugins/relay/agents/implementer.md` were never touched by any of them. This plan closes that gap with two additive, conditionally-gated edits. First, `code-reviewer.md` gains a new deterministic `R-COH-DS-REUSE` check in its existing R-COH-* coherence layer (alongside `R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-REGISTRY-MISSING`) that resolves the feature's Design Spec by convention path, cross-references its `## Component Mapping` REUSE rows against the plan's Step-by-Step Tasks, and fails the diff — citing the mapped import path — when a task creates a new file for a REUSE-mapped node instead of reusing it. Second, `implementer.md` gains a matching hard constraint and a Phase 2 guard, structurally identical in shape to its existing Step 2.3 universal test-modification guard, that halts before applying a CREATE action for a REUSE-mapped node rather than silently duplicating the component. Both edits are zero-emission/zero-effect unless the target project declares `figma_track: true` and the plan being reviewed/implemented declares `design_source: figma` — preserving the source PRD's AC-1 "nothing changes when figma_track is off" invariant exactly, the same invariant every other Figma-conditional check in this codebase already preserves.

## User Story

As the relay maintainer running the Figma Implementation Track on a real target project,
I want the Implementer and Code Reviewer to actively refuse to duplicate a component the project's component map already resolves as REUSE for a given Figma node,
So that AC-2 of the feature's own PRD is actually enforced instead of being a documented-but-unbuilt promise, and the reuse rate the PRD's Success Metrics depend on is real rather than aspirational.

## Problem Statement

Frontend developers implementing a Figma-designed layout need a hard guarantee that components already mapped in `docs/design/component-map.md` get imported, not re-created, or the design system fragments over time exactly as the PRD's Evidence section documents happening industry-wide. The Design Spec's `## Component Mapping` table already records this REUSE/NEW/ASSUMPTION verdict per Figma node with a real `CM-<n>` id and import path — but nothing downstream currently reads it. Both the Implementer (which executes plan tasks) and the Code Reviewer (which is the diff's actual gate, per AC-2's own wording) are silent on Figma reuse today.

## Solution Statement

Add one deterministic, additive coherence-layer check to `code-reviewer.md` (`R-COH-DS-REUSE`) and one structurally-identical guard to `implementer.md`, both consuming the same convention-resolved Design Spec path and the same REUSE-row cross-reference logic, both gated off the exact same `figma_track`/`design_source` declarations every other Figma-conditional check in this codebase already reads, and both degrading gracefully (never hard-failing, never silently going zero-emission once active) when the Design Spec cannot be resolved.

## Metadata

| Field | Value |
|---|---|
| Type | Additive edit to two existing live pipeline agent files (no new files, no new commands) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/implementer.md` |
| Dependencies | - |
| Estimated Tasks | 5 |
| Source PRD line ref | N/A (description mode — no source PRD; closes a gap in the already-APPROVED `PRPs/prds/figma-implementation-track.prd.md` AC-2 without adding a new Implementation Phases row) |
| phase_type | feature |

`figma_track` is absent from this repo's own `docs/context/methodology.md` (relay has no frontend of its own), so no `design_source` row is added to this table and no `## Design Source` section follows — this plan's own generation is itself an instance of the "nothing changes when figma_track is off" invariant the fix under construction is meant to preserve for every other plan.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/code-reviewer.md` | 450-634 | The full R-COH-* coherence layer — insertion point for the new check, plus the row-count arithmetic and JSONL example that must be updated alongside it |
| P0 | `plugins/relay/agents/implementer.md` | 58-141, 275-367 | Hard constraints list, Phase 0 setup, and Phase 2 task-execution (Steps 2.1-2.4 including the Step 2.3 R-X guard) — insertion points for the new constraint, Phase 0 read, and Phase 2 guard |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 441-489 | `R-COH-DESIGN-SOURCE-MISSING` and `R-COH-DESIGN-GROUNDED` — the exact zero-emission gating pattern and node-id/`CM-<n>` grep approach this fix's new checks must mirror byte-for-byte in spirit |
| P1 | `docs/context/design-spec-template.md` | 27-40, 79-85 | Design Spec Output path convention (`PRPs/designs/<feature>/design-spec.md`) and the `## Component Mapping` table shape (`Verdict \| Node-id \| Name-path \| Evidence`; REUSE rows cite `CM-<n>` + import path) |
| P1 | `docs/context/component-map-template.md` | 128-145, 195-201 | The literal forward reference to `R-COH-DS-REUSE` by name (source of the rubric id used in this plan) and the `Confidence`/`verified:auto` column this check's existence enables |
| P1 | `docs/decisions.md` | [2026-07-23] entries (4) | Established conventions this fix must follow: durable `docs/design/` artifact path, Design Spec interactivity-boundary extension, non-heuristic `design_source` declaration, and the visual-loop's silent-degradation-vs-hard-failure discipline |
| P2 | `docs/context/plan-template.md` | 191-223 | `design_source` Metadata field + conditional `## Design Source` section shape — context for why this repo's own plan (figma_track off) carries neither |
| P2 | `docs/anti-patterns.md` | 89-103 | Figma-gating heuristic prohibition + Figma-MCP-from-dispatched-agent prohibition — both directly bound this fix's design |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/code-reviewer.md:497-511
#### R-COH-REGISTRY-MISSING — new files unregistered in expected indexes

For each new file (CREATE action) in the diff under directories
listed in `<target_root>/docs/context/code-review-registries.md`'s
`registries:` frontmatter:

- Read `code-review-registries.md` frontmatter.
- For each registry entry whose `path` matches a directory
  containing a new file, grep the registry's expected index files
  (NAV, search-index, changelog, etc.) for the new file's path or
  basename.
- **Silent-degradation branch:** if `code-review-registries.md` is
  absent OR `registries: []`, emit a single `passed: true` row
  with reason "no registries declared; check skipped".
- FAIL with the new file path + the missing registry path(s).
```
Snippet 1 — copied by Task 1 for the shape of a deterministic R-COH-* check with a named silent-degradation branch (the closest existing sibling to `R-COH-DS-REUSE`'s own "Design Spec unresolvable" degradation).

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:441-489
#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active

**Deliberate divergence from Phase 0's `phase_type` behavior — stated
explicitly:** "has Figma or not" is a business decision the reviewer
cannot manufacture on the plan-writer's behalf, unlike `phase_type` (a
structural classification the reviewer can safely infer from
observable plan content). This check does NOT insert or infer a
`design_source` value under any circumstance — an absence is recorded
as a structural defect, full stop.

- Read `<target_root>/docs/context/methodology.md`. Extract the
  `figma_track:` value from the frontmatter.
- **Zero-emission branch:** if `figma_track` is `false`, absent, or
  `methodology.md` itself is missing, emit NO row at all for this
  check — not even a `passed: true` row — keeping a non-Figma plan's
  `rubric[]` array byte-identical to today. Do NOT fail in this case.
- Otherwise (`figma_track: true`): scan the plan's `## Metadata` table
  for a first-cell value matching `design_source` (case-insensitive).
  - **Present** (value `figma` or `none`) → emit
    `{ "id": "R-COH-DESIGN-SOURCE-MISSING", "passed": true }`.
  - **Absent** → emit
    `{ "id": "R-COH-DESIGN-SOURCE-MISSING", "passed": false, "reason": "..." }`.
  - This check is READ-ONLY. Unlike Phase 0's `phase_type` pre-pass, it
    never performs an `Edit` — an absent `design_source` under
    `figma_track: true` is always a CHANGES_REQUESTED-triggering
    structural defect, never a self-healing opportunity.

#### R-COH-DESIGN-GROUNDED — UI/frontend tasks reference the Design Source frame set

- **Zero-emission branch:** if `## Design Source` is absent from the
  plan (the common case — `figma_track` off, or `design_source:
  none`), emit NO row at all for this check ...
- Otherwise (`## Design Source` is present — i.e. `design_source:
  figma`): parse `## Step-by-Step Tasks` for `### Task <i>: ...`
  headings. For each task whose `**ACTION**:` line names a UI/frontend
  file ..., grep its body for a frame reference (a node-id from the
  `## Design Source` table, e.g. `123:456`) or a `CM-<n>` id.
  - A matching task with zero frame/`CM-<n>` references fails this
    check. `reason` names the orphan task by its `### Task <i>:`
    heading verbatim.
  - Otherwise emit `{ "id": "R-COH-DESIGN-GROUNDED", "passed": true }`
```
Snippet 2 — copied by Task 1 for the exact zero-emission gating structure (`figma_track`/`design_source` two-part gate) and the node-id/`CM-<n>` grep-in-task-body technique `R-COH-DS-REUSE` reuses to find which plan tasks are "in scope" for a given REUSE row.

```
# SOURCE: plugins/relay/agents/implementer.md:314-357
### Step 2.3 — Universal R-X test-modification guard

Before applying any `Edit`/`Write`/`Bash rm` to a file path, check
whether the path matches the project's test glob. ...

If a Step-by-Step Task's `**ACTION**:` line names a test-glob match,
the universal R-X rule fires (regardless of `tdd:` value, per D9
Layer 0 universality of the source PRD). Halt with a structured
error of this shape:

```
TEST_FILE_EDIT_REJECTED:
  task_index: <i>
  task_action: <verbatim ACTION line>
  test_glob_match: <which glob matched>
  rationale: |
    Universal R-X (D9 Layer 0): test files cannot be edited by the
    implementer without an upheld TEST_CONTRACT_DISPUTE arbitrated
    by the code-reviewer. The plan task above asks for a direct
    edit; this is a plan-rubric defect upstream, not something the
    implementer silently obeys.
```

Do NOT proceed to the next task. Do NOT continue to Phase 3. Exit
with the structured error. (The COMMAND interprets this as a
non-retryable failure of the current attempt.)
```
Snippet 3 — copied by Task 5 for the exact halt shape (structured error, named fields, "plan-rubric defect upstream" framing, exit without a Phase-4 verdict) the new `REUSE_VIOLATION_REJECTED` guard reuses verbatim.

```
# SOURCE: docs/context/design-spec-template.md:27-40
`PRPs/designs/<feature>/design-spec.md`

One Design Spec per feature (not per project — contrast
`component-map.md`, which is one per project). Sibling paths under the
same feature directory: `PRPs/designs/<feature>/raw/` (persisted Figma
evidence, one file per traversed node plus `variables.json`),
`PRPs/designs/<feature>/refs/` (reference screenshots, one PNG per
in-scope frame), and `PRPs/designs/<feature>/design-spec-review.jsonl`
(the reviewer's append-only verdict log). Directory is created if it
doesn't exist. NEVER write under `.claude/`.
```
Snippet 4a — copied by Task 1 and Task 4 for the Design Spec's output-path convention (`<feature>` is already parsed by `code-reviewer.md`'s own Phase 0 basename parsing in PRD mode).

```
# SOURCE: docs/context/design-spec-template.md:79-85
## Component Mapping

| Verdict | Node-id | Name-path | Evidence |
|---------|---------|-----------|----------|
| REUSE | {node-id} | {name-path} | `CM-<n>` ({resolved import path}) |
| NEW | {node-id} | {name-path} | {what was searched, where, why no match was found} |
| ASSUMPTION | {node-id} | {name-path} | {the assumption made, and why — used only after the writer's bounded Q&A stuck-detection converts a remaining AMBIGUOUS item} |
```
Snippet 4b — copied by Task 1 and Task 4 for the exact `## Component Mapping` column shape both new checks parse REUSE rows out of.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/code-reviewer.md` | UPDATE | Add the `R-COH-DS-REUSE` deterministic check to the R-COH-* coherence layer; update the rubric row-count arithmetic and the JSONL APPROVED example to account for the new row (Tasks 1-2) |
| `plugins/relay/agents/implementer.md` | UPDATE | Add a new hard constraint, a conditional Phase 0 read, and a new Phase 2 guard step mirroring Step 2.3's shape (Tasks 3-5) |

## NOT Building (Scope Limits)

- Not modifying `plan-writer.md`, `plan-reviewer.md`, `design-spec-writer.md`, or `design-spec-reviewer.md` — Phase 5 of the source PRD already ships the `design_source`/`## Design Source`/Component Mapping machinery this fix only consumes; this plan adds exclusively the two enforcement points AC-2 names ("the Implementer or Code Reviewer").
- Not adding a new explicit Design Spec path field anywhere in the plan or PRD template — this fix resolves `PRPs/designs/<feature>/design-spec.md` by the existing documented output-path convention (`docs/context/design-spec-template.md`), reusing the `<feature>` value `code-reviewer.md`'s own Phase 0 already parses from the plan basename in PRD mode, rather than introducing new plumbing.
- Not building description-mode Design Spec path resolution. A description-mode plan has no derivable feature slug matching the Design Spec's own naming (no `--design-spec <path>` value is persisted into the plan body today). Both new checks degrade gracefully (`passed: true` with an explicit reason) in this case — a documented limitation, not a bug to silently paper over, and not a call to invent new plan-body plumbing outside this plan's scope.
- Not modifying `/relay-implement` or `/relay-code-review` command files. Both new guards are fully self-contained within the two agent files' own halt/rubric mechanics — exactly like the existing Step 2.3 R-X guard and the existing R-COH-* layer, neither of which required command-level changes either.
- Not adding a third `implementer.md` Phase 4 verdict shape. The new guard halts and exits (mirroring Step 2.3 exactly) rather than inventing a new verdict the `code-reviewer`'s arbitration mode would need to learn to parse.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/code-reviewer.md — add the R-COH-DS-REUSE deterministic check

- **ACTION**: In the "### Deterministic checks" subsection of "## The R-COH-* coherence layer" (immediately after the existing `#### R-COH-REGISTRY-MISSING` section and before "### Bounded sub-agent dispatch"), insert a new `#### R-COH-DS-REUSE — REUSE-mapped Figma nodes are not duplicated` subsection. Gate: zero-emission (no rubric row at all) unless `<target_root>/docs/context/methodology.md` declares `figma_track: true` AND the plan's `## Metadata` table's `design_source` row reads `figma` (same two-part gate, same wording style, as `R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED` in `plan-reviewer.md`). When active: resolve `design_spec_path = <target_root>/PRPs/designs/<feature>/design-spec.md` (reusing the `<feature>` value already parsed in this agent's own Phase 0 basename parsing); `Read` it and parse its `## Component Mapping` table for `Verdict == REUSE` rows, extracting `{node_id, cm_id, import_path}` from each row's Evidence cell. For each REUSE row, grep the plan's `## Step-by-Step Tasks` body (already held in context from Phase 0) for the row's node-id or `CM-<n>` id — same technique as `R-COH-DESIGN-GROUNDED` — to find in-scope tasks. For each in-scope REUSE row, FAIL when that task's `## Files to Change` action is `CREATE` of a file that is NOT the REUSE row's cited import path; the `reason` string MUST cite the mapped import path verbatim (per AC-2's own wording: "citing the mapped import path"). Degrade gracefully to `passed: true` with an explicit reason (never zero-emission, never a hard failure) when: the Design Spec can't be resolved/read (including description-mode plans where the path isn't derivable), the spec has zero REUSE rows, or no plan task references any REUSE-mapped node — mirroring `R-COH-REGISTRY-MISSING`'s and `R-COH-CONFIG-DANGLING`'s existing silent-degradation branches.
- **MIRROR**: Patterns to Mirror Snippet 1 (silent-degradation shape) + Snippet 2 (zero-emission gate + node-id/`CM-<n>` grep technique) + Snippet 4a (Design Spec path convention) + Snippet 4b (Component Mapping table shape)
- **ADDRESSES**: AC-A1, AC-A2, AC-A4
- **VALIDATE**: `grep -q "^#### R-COH-DS-REUSE" plugins/relay/agents/code-reviewer.md`

### Task 2: UPDATE plugins/relay/agents/code-reviewer.md — update row-count arithmetic and JSONL example

- **ACTION**: In the "### Logging discipline" subsection, change the rubric-length arithmetic sentence from `4 (deterministic R-COH-*)` to `5 (deterministic R-COH-*)` (and adjust the total range accordingly), matching how the file already documents the `figma_track`-conditional widening for `plan-reviewer.md`'s own rubric range elsewhere in this same paragraph's spirit. In the "### Standard-mode APPROVED entry" JSONL example block (under "## code-review.jsonl format"), add one additional example row for `R-COH-DS-REUSE` (e.g. `{ "id": "R-COH-DS-REUSE", "passed": true }`) immediately after the existing `R-COH-REGISTRY-MISSING` row, consistent with how each of the other three deterministic checks already has its own example row there.
- **MIRROR**: Patterns to Mirror Snippet 1 (the existing JSONL row shape for a deterministic R-COH-* check)
- **ADDRESSES**: AC-A1 (infrastructure — keeps the rubric row-count arithmetic and JSONL example consistent with Task 1's new check; no independent behavior of its own)
- **VALIDATE**: `grep -q "5 (deterministic R-COH-\*)" plugins/relay/agents/code-reviewer.md`

### Task 3: UPDATE plugins/relay/agents/implementer.md — add the REUSE hard constraint

- **ACTION**: Append a new item 9 to the "## Hard constraints" list: "**No new component files for REUSE-mapped Figma nodes (Figma track only).** When the target project's `docs/context/methodology.md` declares `figma_track: true` and this plan's `## Metadata` table's `design_source` row reads `figma`, a CREATE-action task whose target node/`CM-<n>` is classified REUSE in the feature's Design Spec `## Component Mapping` table halts per Step 2.3.5 rather than being executed — the mapped import path must be reused, never duplicated. Zero-effect on any plan where `figma_track` is off or `design_source` is not `figma`."
- **MIRROR**: Patterns to Mirror Snippet 3 (the Step 2.3 guard's "plan-rubric defect upstream, not something the implementer silently obeys" framing — this new constraint's wording previews the same halt philosophy that Task 5's Step 2.3.5 guard implements procedurally)
- **ADDRESSES**: AC-A3, AC-A4
- **VALIDATE**: `grep -q "No new component files for REUSE-mapped Figma nodes" plugins/relay/agents/implementer.md`

### Task 4: UPDATE plugins/relay/agents/implementer.md — add the conditional Phase 0 read

- **ACTION**: In "## Phase 0 — Setup", immediately after the existing `docs/context/methodology.md` `tdd:` read bullet, add a new bullet: "Also from `docs/context/methodology.md`, capture the `figma_track:` value. When `figma_track: true`, additionally scan the plan's `## Metadata` table for its `design_source` row. When `design_source: figma`, resolve `design_spec_path = <target_root>/PRPs/designs/<feature>/design-spec.md` (same convention and same `<feature>` value as Step 1.1's basename parse) and `Read` it if present, holding its `## Component Mapping` REUSE rows (`{node_id, cm_id, import_path}` per row) in context for the Step 2.3.5 guard. When `figma_track` is false/absent, or `design_source` is `none`/absent, or the Design Spec cannot be read, hold an empty REUSE-row set and do NOT halt — this mirrors the existing `tdd:`-missing degradation on the same line."
- **MIRROR**: Patterns to Mirror Snippet 4a (Design Spec path convention) + Snippet 4b (Component Mapping table shape)
- **ADDRESSES**: AC-A3, AC-A4
- **VALIDATE**: `grep -q "figma_track:\` value" plugins/relay/agents/implementer.md`

### Task 5: UPDATE plugins/relay/agents/implementer.md — add the Step 2.3.5 REUSE guard

- **ACTION**: Immediately after "### Step 2.3 — Universal R-X test-modification guard" and before "### Step 2.4 — Move on", insert a new "### Step 2.3.5 — REUSE-mapped Figma node guard (Figma track only)". Zero-effect when the Phase 0 REUSE-row set (Task 4) is empty. Otherwise: before applying a CREATE action (Step 2.2), check whether the task's target node-id/`CM-<n>` (the same reference `R-COH-DESIGN-GROUNDED` already requires UI/frontend plan tasks to carry) matches a held REUSE row. If it does, halt with a structured `REUSE_VIOLATION_REJECTED` error — same shape as `TEST_FILE_EDIT_REJECTED` (Snippet 3): `task_index`, `task_action` (verbatim ACTION line), `reused_import_path` (the REUSE row's mapped import path, cited verbatim per AC-2's wording), and a `rationale` naming this "a plan-rubric defect upstream, not something the implementer silently obeys" — exit without proceeding to the next task or to Phase 3, and without emitting a Phase 4 verdict (this is a halt, not a third verdict shape).
- **MIRROR**: Patterns to Mirror Snippet 3 (verbatim halt shape and framing)
- **ADDRESSES**: AC-A3
- **VALIDATE**: `grep -q "REUSE_VIOLATION_REJECTED" plugins/relay/agents/implementer.md`

## Validation Commands

**Level 1 STATIC_ANALYSIS:**
```bash
set -euo pipefail
grep -q "^#### R-COH-DS-REUSE" plugins/relay/agents/code-reviewer.md
count=$(grep -c "^#### R-COH-" plugins/relay/agents/code-reviewer.md)
if [ "$count" -ne 5 ]; then
  echo "FAIL: expected exactly 5 deterministic R-COH-* headings (4 existing + R-COH-DS-REUSE), found $count"
  exit 1
fi
echo "PASS: R-COH-DS-REUSE present; deterministic R-COH-* count is 5"
```

**Level 2 CONTENT_INVARIANTS:**
```bash
set -euo pipefail
grep -q "REUSE_VIOLATION_REJECTED" plugins/relay/agents/implementer.md
grep -q "No new component files for REUSE-mapped Figma nodes" plugins/relay/agents/implementer.md
verdict_count=$(grep -c "^### Phase 4\." plugins/relay/agents/implementer.md)
if [ "$verdict_count" -ne 2 ]; then
  echo "FAIL: expected exactly 2 Phase 4 verdict shapes (IMPLEMENTATION_COMPLETE, TEST_CONTRACT_DISPUTE) to remain unchanged, found $verdict_count"
  exit 1
fi
echo "PASS: REUSE guard present in implementer.md; Phase 4 verdict shape count unchanged at 2"
```

**Level 3 INTEGRATION / DRY-RUN END-TO-END:**
```bash
npm run validate
```
This repository self-hosts its own static consistency suite (9 checks: version-parity, native-validate, registration-parity, path-existence, dispatch-graph, frontmatter-schema, artifact-naming, bootstrap-parity, gating-structure). A markdown-only, additive edit to two existing, already-registered agent files must not break any of them; this is the closest available end-to-end dry run for a prompt/config-only repository with no runtime source to compile.

## Acceptance Criteria

- **AC-A1:** Given a project with `figma_track: true` and a plan whose `design_source` Metadata reads `figma`, when `code-reviewer.md` processes a diff whose Files-to-Change/task set creates a new file for a Figma node the Design Spec's `## Component Mapping` table classifies REUSE, then `R-COH-DS-REUSE` fails with a reason citing the REUSE row's mapped import path verbatim.
- **AC-A2:** Given a project where `figma_track` is absent/`false`, or a plan whose `design_source` reads `none`/is absent, when `code-reviewer.md` runs its R-COH-* coherence layer, then `R-COH-DS-REUSE` emits no rubric row at all (zero-emission) — preserving the source PRD's AC-1 "nothing changes when figma_track is off" invariant.
- **AC-A3:** Given the same REUSE-mapped-node scenario as AC-A1, when `implementer.md`'s Phase 2 processes the corresponding CREATE-action task before `code-reviewer` ever sees the diff, then it halts with a structured `REUSE_VIOLATION_REJECTED` error citing the mapped import path, rather than creating the duplicate file — mirroring the existing Step 2.3 test-modification guard's halt shape (not a silent workaround, not a third Phase-4 verdict type).
- **AC-A4:** Given a figma-active plan whose Design Spec cannot be resolved (a description-mode plan, a missing/unreadable `design-spec.md`, or a spec with zero REUSE rows), when either new check runs, then it degrades gracefully to `passed: true` with an explicit reason — never a hard failure and never zero-emission once the check is otherwise active.

R8b (PRD AC-N token check) does not apply in description mode — no `(PRD AC-N)` token required.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The Design Spec path (`PRPs/designs/<feature>/design-spec.md`) is resolved by convention only in PRD mode; description-mode plans have no derivable path | M | L | Explicitly degrade to `passed: true` with a documented reason rather than guessing or hard-failing; a future phase can add an explicit path field if this proves limiting in practice |
| No real target project exists yet with `figma_track: true` plus an APPROVED Design Spec to dogfood these two new checks end-to-end against a live REUSE violation | M | M | Both checks are structurally validated against the established R-COH-* / zero-emission conventions and grep-verified via this plan's own Validation Commands; full behavioral dogfood is deferred to the source PRD's own still-open pilot-project question |
| A future edit to `code-reviewer.md`'s R-COH-* row-count arithmetic or JSONL example could drift out of sync with the actual check count again | L | L | This plan updates both the arithmetic sentence and the JSONL example in the same task as the new check (Task 2), following the convention the file already documents for its own `figma_track`-conditional widening |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. This repo declares `test_frameworks: ["node:test"]`, so the pair is ACTIVE in test-after mode — it will author/maintain `node:test` coverage asserting the new `R-COH-DS-REUSE` check and `implementer.md` guard behave per this plan's Acceptance Criteria, after the Implementer + Code Review land.
- **Why description mode, not a new PRD phase row:** AC-2 was one of five Acceptance Criteria the already-APPROVED, already-fully-shipped `figma-implementation-track.prd.md` names; it was simply never implemented by any of the 7 completed phases. Adding an 8th Implementation Phases row to a PRD whose phases are all marked `complete` would misrepresent this as new scope rather than a gap-closure of existing scope — description mode (no PRD back-fill) is the better fit, consistent with how `/relay-plan` itself models "a scoped fix to already-shipped pipeline surface" versus "a new phase."
- **Web research gap:** `research-web` found no established industry precedent for an automated code-review gate that specifically blocks duplicate component creation against a design-system map (the closest analogues — Builder.io Visual Copilot, Anima — are AI code-generation features, not review gates). This check is genuinely novel for this domain, consistent with the source PRD's own Research Summary gap note ("the literal-transcription-vs-business-context interpretation problem... appears to be a genuine product-judgment gap this feature is first to name").

---

*Generated: 2026-07-23*
*Approved: 2026-07-23*
*Implemented: 2026-07-23*
*Status: IMPLEMENTED*
