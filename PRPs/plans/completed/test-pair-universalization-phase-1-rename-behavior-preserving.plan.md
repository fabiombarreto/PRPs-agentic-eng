# Feature: Rename (behavior-preserving) (Phase 1 of test-pair-universalization)

```
**Decision Gate**
- Active context: none
- Activated criteria: agent + command file renames in plugins/relay/; cross-cutting artifact-identifier rename; impact on the orchestrator (/relay-execute) and /relay-implement cross-references; behavior-preservation invariant (tdd:false self-skip intact)
- Decisions found:
  - 2026-04-19 "Command surface: one command per stage, writer/reviewer split" — PRESERVED: the pair stays two commands; the rename keeps the 14-command count
  - 2026-04-19 "Distribute via Claude Code marketplace (single-plugin repo)" — plugin.json enumerates no commands/agents (auto-discovery by filename); the rename needs no manifest edit (research finding, plugins/relay/.claude-plugin/plugin.json:1-9)
  - 2026-04-25 "Plan filenames carry the source PRD phase number and slug" — governs this plan's own path (PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.plan.md)
  - 2026-04-19 "PRP artifacts live under PRPs/, never under .claude/" — the renamed artifacts (test-suite.diff, <basename>.test-write-review.jsonl) stay under PRPs/
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — preserved; every renamed artifact path stays under PRPs/reports/ and PRPs/plans/
  - "Activating the TDD track by heuristic" — behavior byte-identical this phase; the tdd:false self-skip and the single-key methodology read are untouched (semantic changes deferred to Phases 2/5)
  - "Treating plugins/prp-core/ as active relay code" — the rename touches only plugins/relay/; prp-core is not modified
- Applicable architectural rules:
  - Command surface = 14 commands — a rename adds or removes none
  - PRP artifact paths under PRPs/ — renamed artifact strings stay under PRPs/reports/ and PRPs/plans/
  - Interactivity boundary (autonomous after PRD approval) — this rename runs autonomously; unchanged
  - plugin.json auto-discovery: command filename == slash-command slug; agent frontmatter `name:` == Task `subagent_type` — the rename must keep these in lockstep
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-pair-universalization.prd.md` — Implementation Phases row 1:
  "Rename (behavior-preserving)" — Goal: all active-plugin identifiers move to
  the `test-*` scheme, behavior byte-identical — Success signal: AC-1 zero-grep
  passes; a tdd:true synthetic phase behaves as before under new names.

## Summary

This phase performs a purely mechanical, behavior-preserving rename of the relay
test pair across `plugins/relay/`. Two agent files (`tdd-writer.md` →
`test-writer.md`, `tdd-reviewer.md` → `test-reviewer.md`) and two command files
(`relay-tdd.md` → `relay-write-test.md`, `relay-tdd-review.md` →
`relay-test-write-review.md`) are `git mv`'d and their internal identifiers
rewritten; every cross-reference in the plugin tree is updated (including the
`${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/...` sibling-path Read dispatches in
`relay-execute.md`, the deferred `Task(subagent_type='tdd-writer')` example in
`relay-implement.md`, and three residual `/relay-tdd` prose references in
`plan-writer.md`, `plan-reviewer.md`, and `relay-prd.md`); and the two artifact-name
strings are renamed (`tdd-initial-suite.diff` → `test-suite.diff`,
`<basename>.tdd-review.jsonl` → `<basename>.test-write-review.jsonl`). No behavior
changes: the `tdd:false` self-skip, the R-X guard, and all ordering/control flow stay
byte-identical modulo the renamed identifiers. Success is the AC-1 zero-grep gate over
the whole `plugins/relay/` tree.

## User Story

As a relay maintainer evolving the TDD pair into a universal test pair
I want the two agents, two commands, and their artifact-name strings renamed from
the `tdd-*` scheme to the `test-*` scheme across `plugins/relay/`, with every
cross-reference updated and behavior byte-identical
So that later phases can layer test-after ordering and full-lifecycle authority onto
names that no longer imply TDD-exclusivity, and AC-1's zero-grep gate passes.

## Problem Statement

The pair's identifiers (`tdd-writer`, `tdd-reviewer`, `/relay-tdd`,
`/relay-tdd-review`, `tdd-initial-suite.diff`, `<basename>.tdd-review.jsonl`) imply
TDD-exclusivity. Before the pair can own the full test lifecycle in both methodology
modes (Phases 2–6), the names must move to a `test-*` scheme without changing any
behavior — otherwise a behavior change and a large mechanical rename would be entangled
in one diff, making both hard to review and risking a broken `Task` dispatch, a broken
sibling-path Read, or a dangling artifact path. This phase isolates the rename so a
missed reference surfaces as a broken cross-reference, not a silent behavior change.

## Solution Statement

Perform a behavior-preserving rename across `plugins/relay/`: `git mv` the 2 agent
files and 2 command files to their `test-*` names; update the agent frontmatter
`name:` fields (which must equal the `Task` `subagent_type` dispatch strings), the
command titles (`# /relay-tdd` → `# /relay-write-test`, etc.), every intra-plugin
cross-reference, the sibling-path Read dispatches in `relay-execute.md`, the
`Task`-dispatch example in `relay-implement.md`, the three residual `/relay-tdd` prose
references, and the two artifact-name strings. Only identifiers change; the
`tdd:false` self-skip, the R-X universal guard, the foundation-skip logic, and all
ordering/control flow remain byte-identical.

## Metadata

| Key | Value |
|-----|-------|
| Type | Refactor (behavior-preserving rename) |
| Complexity | Medium — mechanical, but completeness-critical across 9 files; a missed reference breaks a dispatch |
| Systems Affected | `plugins/relay/agents/` (2 files renamed), `plugins/relay/commands/` (2 renamed + 3 updated: relay-execute.md, relay-implement.md, relay-prd.md), `plugins/relay/agents/plan-writer.md`, `plugins/relay/agents/plan-reviewer.md`; artifact-name strings under PRPs/reports/ and PRPs/plans/ |
| Dependencies | None (source PRD row 1 `Depends: -`) |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/test-pair-universalization.prd.md` Implementation Phases row 1 (line 205); Phase Details line 217; AC-1 line 76; zero-grep metric line 71 |
| phase_type | refactor |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/test-pair-universalization.prd.md` | 205, 217, 76, 71 | Phase 1 row + Phase Details + AC-1 text + the exact zero-grep metric that is this phase's success gate |
| P0 | `plugins/relay/agents/tdd-writer.md` | 1-7, 315-358 | Agent frontmatter `name:` field (must equal `Task` subagent_type); origin of the `tdd-initial-suite.diff` write + handoff message |
| P0 | `plugins/relay/agents/tdd-reviewer.md` | 1-7 | `name:` field (must equal `Task` subagent_type) + description cross-refs to `tdd-writer` / `/relay-tdd-review` |
| P0 | `plugins/relay/agents/tdd-reviewer.md` | 112-123 | Coupled derivation of `<basename>.tdd-review.jsonl` from the `tdd-initial-suite.diff` suffix |
| P0 | `plugins/relay/commands/relay-tdd.md` | 1-6 | Command title `# /relay-tdd`; description cross-refs to `tdd-writer` + `/relay-tdd-review` |
| P0 | `plugins/relay/commands/relay-tdd-review.md` | 1-9 | Command title + description cross-refs |
| P1 | `plugins/relay/commands/relay-execute.md` | 447-498 | Sibling-path Read adoption of the two commands + the `.tdd-review.jsonl` artifact reference (line 498) |
| P1 | `plugins/relay/commands/relay-implement.md` | 339-348 | Deferred `Task(subagent_type='tdd-writer')` example in the DISPUTE_UPHELD_TEST_WRONG branch |
| P2 | `plugins/relay/agents/plan-writer.md` | 498-500 | Residual `/relay-tdd` command-name reference (foundation phase_type consumer note) |
| P2 | `plugins/relay/agents/plan-reviewer.md` | 368-370 | Residual `/relay-tdd` command-name reference (foundation-skip note) |
| P2 | `plugins/relay/commands/relay-prd.md` | 217-219 | Residual `/relay-tdd` command-name reference (downstream-commands list) |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/tdd-writer.md:1-7
```
---
name: tdd-writer
description: Autonomously transform an APPROVED plan + its source PRD's Acceptance Criteria into a DRAFT initial test suite (B7 of relay's Phase 2 trilho TDD). ... the `tdd-reviewer` agent (B8) owns the DRAFT→APPROVED flip via `/relay-tdd-review`.
model: sonnet
color: green
tools: Task, Read, Write, Edit, Glob
---
```
The frontmatter `name:` value is the exact string commands pass to
`Task(subagent_type=...)`. Task 1 renames the file to `test-writer.md` AND sets
`name: test-writer`, and rewrites the `tdd-reviewer` / `/relay-tdd-review` references
in the description. Task 2 mirrors this for `tdd-reviewer.md` → `test-reviewer.md`
(`name: test-reviewer`). The file basename and the `name:` field must move in lockstep.

# SOURCE: plugins/relay/agents/tdd-writer.md:315-319
```
### Step 3.1 — Write `tdd-initial-suite.diff`

Use `Write` to create
`<target_root>/PRPs/reports/<feature>/tdd-initial-suite.diff` with
content:
```
This is the canonical origin of the `tdd-initial-suite.diff` artifact-name string.
Task 1 renames every occurrence in this file to `test-suite.diff` (path + heading +
handoff message at lines 315-358).

# SOURCE: plugins/relay/agents/tdd-reviewer.md:112-118
```
Compute the JSONL path:
`<target_root>/PRPs/plans/<basename>.tdd-review.jsonl` where
`<basename>` is the suite_path basename without
`tdd-initial-suite.diff` — e.g., for
`PRPs/reports/feat-x/tdd-initial-suite.diff` the basename
component is `feat-x` so the JSONL is
`PRPs/plans/feat-x.tdd-review.jsonl`.
```
The two artifact-name strings are coupled here: the reviewer strips the
`tdd-initial-suite.diff` suffix and appends `.tdd-review.jsonl`. Task 2 must rename
BOTH consistently — `test-suite.diff` and `.test-write-review.jsonl` — or the
derivation breaks.

# SOURCE: plugins/relay/commands/relay-execute.md:449, 485
```
Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-tdd.md` and execute its full protocol inline against `current_plan_path`. Pass context:
...
Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-write-review.md`? (currently: relay-tdd-review.md) and execute its full protocol inline against `current_suite_path`.
```
The orchestrator adopts the two commands by absolute sibling path (D7 dispatch), not
by `Task`. Task 5 repoints both Read paths to the renamed command files
(`relay-write-test.md`, `relay-test-write-review.md`) and updates the `.tdd-review.jsonl`
reference at line 498 to `.test-write-review.jsonl`. If the path does not match the
renamed file, the inline adoption silently reads nothing.

# SOURCE: plugins/relay/commands/relay-implement.md:347
```
  > be: Task(subagent_type='tdd-writer',
```
A deferred (B7/B8 not-yet-shipped) `Task`-dispatch example naming `tdd-writer` in
prose. Task 5 updates it to `test-writer`. This is a cross-reference, not a live
dispatch, but AC-1's `tdd-writer` grep catches it.

# SOURCE: plugins/relay/agents/plan-writer.md:499 (mirror: plan-reviewer.md:369, relay-prd.md:218)
```
     is consumed by the TDD track (`/relay-tdd` P5, `/relay-execute`
     A.3.5) to skip test-first for the phase. ...
```
Three residual `/relay-tdd` command-name references in prose, beyond the dispatch's
named files. Task 6 renames the command IDENTIFIER (`/relay-tdd` →
`/relay-write-test`) at each site. It does NOT touch the tdd:false routing-note
SEMANTICS (that rewrite is Phase 7) — these lines are factual command-name references,
not the phantom note text.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/tdd-writer.md` | RENAME → `agents/test-writer.md`, then UPDATE contents | `name:` field, description cross-refs, `tdd-initial-suite.diff` write (lines 315-358), any internal `/relay-tdd*` refs |
| `plugins/relay/agents/tdd-reviewer.md` | RENAME → `agents/test-reviewer.md`, then UPDATE contents | `name:` field, description cross-refs, coupled `tdd-initial-suite.diff` + `.tdd-review.jsonl` derivation (lines 112-123) |
| `plugins/relay/commands/relay-tdd.md` | RENAME → `commands/relay-write-test.md`, then UPDATE contents | Command title `# /relay-tdd`, `tdd-writer` dispatch, `/relay-tdd-review` refs, artifact strings |
| `plugins/relay/commands/relay-tdd-review.md` | RENAME → `commands/relay-test-write-review.md`, then UPDATE contents | Command title, `tdd-reviewer` dispatch, `/relay-tdd` refs, `.tdd-review.jsonl` refs |
| `plugins/relay/commands/relay-execute.md` | UPDATE | Sibling-path Read dispatches (lines 449, 485), `.tdd-review.jsonl` ref (498), `/relay-tdd*` prose (10 occurrences), `tdd-initial-suite.diff` ref (456) |
| `plugins/relay/commands/relay-implement.md` | UPDATE | `Task(subagent_type='tdd-writer')` deferred example (lines 339-348, 2 occurrences) |
| `plugins/relay/agents/plan-writer.md` | UPDATE | Residual `/relay-tdd` command-name ref (line 499) |
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Residual `/relay-tdd` command-name ref (line 369) |
| `plugins/relay/commands/relay-prd.md` | UPDATE | Residual `/relay-tdd` command-name ref (line 218) |

## NOT Building (Scope Limits)

- **No behavior change.** The `tdd:false` self-skip stays intact; test-after ordering,
  full lifecycle authority (CREATE/UPDATE/DELETE), the lifecycle ledger,
  `R-LIFECYCLE-LEGITIMATE`, the GREEN-legitimate check, and B5 ledger-awareness are all
  deferred to Phases 2–6. This phase is byte-identical modulo renamed identifiers.
- **No plan/PRD routing-note SEMANTIC rewrite.** The `tdd:false` note text rewrite
  ("test-after authoring by the test pair") is Phase 7. Phase 1 renames only the command
  IDENTIFIER where it appears in prose.
- **No canonical-docs or docs-site renames.** `docs/context/architecture.md:103`
  (`tdd-reviews.md`, `tdd-initial-suite.diff`), the other `docs/` surfaces, and the
  `documentation/` site are Phases 8–9. Phase 1 is scoped to `plugins/relay/` only.
- **No version bump.** The `plugin.json` → `0.19.0` bump is Phase 9.
- **No net-new command.** This is a rename; the command count stays 14.
- **No retrofitting of historical `PRPs/` artifacts** (completed plans, `.jsonl` audit
  logs, prior reports) with the new names — immutable history.

## Step-by-Step Tasks

### Task 1: RENAME plugins/relay/agents/tdd-writer.md → agents/test-writer.md

- **AC**: AC-A1, AC-A2, AC-A3 (PRD AC-1) — renames the `tdd-*` identifiers and the agent file to the `test-*` scheme; verified collectively by the Level-2 whole-tree zero-grep gate + the Level-1 file-existence check.
- **ACTION**: `git mv plugins/relay/agents/tdd-writer.md plugins/relay/agents/test-writer.md`,
  then edit the moved file: set frontmatter `name: test-writer`; rewrite every
  `tdd-reviewer` → `test-reviewer`, `/relay-tdd-review` → `/relay-test-write-review`,
  `/relay-tdd` → `/relay-write-test`; rename `tdd-initial-suite.diff` → `test-suite.diff`
  (write path + Step 3.1 heading + handoff message, lines 315-358); rename any
  `.tdd-review.jsonl` → `.test-write-review.jsonl`. Change no control flow.
- **MIRROR**: `plugins/relay/agents/tdd-writer.md:1-7` (name field) and `:315-319` (artifact write).
- **VALIDATE**: `test -f plugins/relay/agents/test-writer.md && ! test -f plugins/relay/agents/tdd-writer.md && ! grep -nE 'tdd-writer|tdd-reviewer|/relay-tdd|tdd-initial-suite|tdd-review\.jsonl' plugins/relay/agents/test-writer.md`

### Task 2: RENAME plugins/relay/agents/tdd-reviewer.md → agents/test-reviewer.md

- **AC**: AC-A1, AC-A2, AC-A3 (PRD AC-1) — renames `tdd-reviewer` to `test-reviewer` (file + `name:` field + coupled artifact strings); verified collectively by the Level-2 zero-grep gate + the Level-1 file-existence check.
- **ACTION**: `git mv plugins/relay/agents/tdd-reviewer.md plugins/relay/agents/test-reviewer.md`,
  then edit: set `name: test-reviewer`; rewrite `tdd-writer` → `test-writer`,
  `/relay-tdd-review` → `/relay-test-write-review`, `/relay-tdd` → `/relay-write-test`;
  rename the coupled derivation `tdd-initial-suite.diff` → `test-suite.diff` and
  `.tdd-review.jsonl` → `.test-write-review.jsonl` (lines 112-123). Preserve the JSONL
  basename-stripping logic exactly; only the two literal strings change.
- **MIRROR**: `plugins/relay/agents/tdd-reviewer.md:112-118` (coupled derivation).
- **VALIDATE**: `test -f plugins/relay/agents/test-reviewer.md && ! test -f plugins/relay/agents/tdd-reviewer.md && ! grep -nE 'tdd-writer|tdd-reviewer|/relay-tdd|tdd-initial-suite|tdd-review\.jsonl' plugins/relay/agents/test-reviewer.md`

### Task 3: RENAME plugins/relay/commands/relay-tdd.md → commands/relay-write-test.md

- **AC**: AC-A1, AC-A2, AC-A3 (PRD AC-1); AC-A4 (PRD AC-13) — renames the writer command while keeping the `tdd:false` self-skip wording byte-identical (behavior preserved); verified by the Level-2 zero-grep gate + the Level-3 command-title check.
- **ACTION**: `git mv plugins/relay/commands/relay-tdd.md plugins/relay/commands/relay-write-test.md`,
  then edit: change the title `# /relay-tdd` → `# /relay-write-test`; rewrite the
  `tdd-writer` dispatch → `test-writer`; rewrite `/relay-tdd-review` →
  `/relay-test-write-review`; rename `tdd-initial-suite.diff` → `test-suite.diff` and
  `.tdd-review.jsonl` → `.test-write-review.jsonl`. Keep the `tdd:false` self-skip / P4
  gate wording byte-identical (that is Phase 5's to change).
- **MIRROR**: `plugins/relay/commands/relay-tdd.md:1-6` (command title + description).
- **VALIDATE**: `test -f plugins/relay/commands/relay-write-test.md && ! test -f plugins/relay/commands/relay-tdd.md && ! grep -nE 'tdd-writer|tdd-reviewer|/relay-tdd|tdd-initial-suite|tdd-review\.jsonl' plugins/relay/commands/relay-write-test.md`

### Task 4: RENAME plugins/relay/commands/relay-tdd-review.md → commands/relay-test-write-review.md

- **AC**: AC-A1, AC-A2, AC-A3 (PRD AC-1); AC-A4 (PRD AC-13) — renames the reviewer command while preserving the self-skip precondition wording (behavior preserved); verified by the Level-2 zero-grep gate + the Level-3 command-title check.
- **ACTION**: `git mv plugins/relay/commands/relay-tdd-review.md plugins/relay/commands/relay-test-write-review.md`,
  then edit: change the title `# /relay-tdd-review` → `# /relay-test-write-review`;
  rewrite the `tdd-reviewer` dispatch → `test-reviewer`; rewrite `/relay-tdd` →
  `/relay-write-test`; rename `.tdd-review.jsonl` → `.test-write-review.jsonl` and
  `tdd-initial-suite.diff` → `test-suite.diff`. Preserve the self-skip precondition
  wording.
- **MIRROR**: `plugins/relay/agents/tdd-reviewer.md:112-118` (jsonl-name coupling shared by the review command).
- **VALIDATE**: `test -f plugins/relay/commands/relay-test-write-review.md && ! test -f plugins/relay/commands/relay-tdd-review.md && ! grep -nE 'tdd-writer|tdd-reviewer|/relay-tdd|tdd-initial-suite|tdd-review\.jsonl' plugins/relay/commands/relay-test-write-review.md`

### Task 5: UPDATE cross-references in relay-execute.md and relay-implement.md

- **AC**: AC-A1 (PRD AC-1); AC-A5 (PRD AC-1) — updates cross-references so every sibling-path Read dispatch resolves to the renamed files; verified by the Level-2 zero-grep gate + the Level-3 dangling-reference check.
- **ACTION**: In `relay-execute.md`: repoint the two sibling-path Read dispatches
  (`${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-tdd.md` →
  `.../relay-write-test.md` at line 449; `.../relay-tdd-review.md` →
  `.../relay-test-write-review.md` at line 485); update the `.tdd-review.jsonl`
  reference (line 498) → `.test-write-review.jsonl`; update the `tdd-initial-suite.diff`
  reference (line 456) → `test-suite.diff`; rename all `/relay-tdd` → `/relay-write-test`
  and `/relay-tdd-review` → `/relay-test-write-review` in prose (Steps A.3.5.x, lines
  150-151, 405, 436, 447, 483, 530, 764). Do NOT change the A.3.5 self-skip / budget
  semantics. In `relay-implement.md`: rewrite the two `Task(subagent_type='tdd-writer')`
  occurrences (lines 339, 347) → `test-writer`.
- **MIRROR**: `plugins/relay/commands/relay-execute.md:449, 485` (sibling-path adoption)
  and `plugins/relay/commands/relay-implement.md:347` (Task subagent_type example).
- **VALIDATE**: `! grep -nE 'tdd-writer|tdd-reviewer|/relay-tdd\b|tdd-initial-suite|tdd-review\.jsonl' plugins/relay/commands/relay-execute.md plugins/relay/commands/relay-implement.md`

### Task 6: UPDATE residual /relay-tdd command-name references in plan-writer.md, plan-reviewer.md, relay-prd.md

- **AC**: AC-A1 (PRD AC-1) — removes the three residual `/relay-tdd` command-name references so the whole-tree Level-2 zero-grep gate returns zero.
- **ACTION**: Rename the command identifier `/relay-tdd` → `/relay-write-test` at
  `plan-writer.md:499`, `plan-reviewer.md:369`, and `relay-prd.md:218`. These are
  factual references to the renamed command (foundation-skip consumer note and the
  downstream-commands list), NOT the tdd:false routing-note semantics — leave all
  surrounding wording untouched so no overlap with Phase 7 occurs.
- **MIRROR**: `plugins/relay/agents/plan-writer.md:499` (command-name prose reference).
- **VALIDATE**: `! grep -nE '/relay-tdd\b' plugins/relay/agents/plan-writer.md plugins/relay/agents/plan-reviewer.md plugins/relay/commands/relay-prd.md`

## Validation Commands

**Level 1 — STATIC_ANALYSIS (structure / frontmatter well-formedness)**

```bash
# The four renamed files exist; the four old names are gone.
for f in agents/test-writer.md agents/test-reviewer.md commands/relay-write-test.md commands/relay-test-write-review.md; do test -f "plugins/relay/$f" || { echo "MISSING $f"; exit 1; }; done
for f in agents/tdd-writer.md agents/tdd-reviewer.md commands/relay-tdd.md commands/relay-tdd-review.md; do test ! -e "plugins/relay/$f" || { echo "STILL PRESENT $f"; exit 1; }; done
# Each renamed agent still opens with a YAML frontmatter block and carries the renamed name field.
grep -q '^name: test-writer$' plugins/relay/agents/test-writer.md
grep -q '^name: test-reviewer$' plugins/relay/agents/test-reviewer.md
```

**Level 2 — CONTENT_INVARIANTS (the AC-1 zero-grep gate + positive presence)**

```bash
# AC-1 zero-grep gate (source PRD line 71 pattern), over the WHOLE plugin tree.
# Carve-out (grounding gap found at implement time): the immutable historical PRD
# PRPs/prds/tdd-writer-reviewer.prd.md is a real, still-existing file legitimately
# cited for provenance by the renamed agent/command files. Its filename contains the
# tdd-writer/tdd-reviewer substrings but is NOT a stale identifier — renaming the
# citation would dangle. It is excluded here (see Notes: AC-1 carve-out). The gate
# exits non-zero on any genuine residual and 0 when clean.
if grep -RnE 'tdd-writer|tdd-reviewer|/relay-tdd\b|tdd-initial-suite\.diff|tdd-review\.jsonl' plugins/relay/ | grep -v 'tdd-writer-reviewer\.prd\.md' | grep -q .; then echo "FAIL: residual tdd-* identifiers"; exit 1; else echo "PASS: zero residual (historical tdd-writer-reviewer.prd.md provenance citation excluded)"; fi
# Positive presence: the new identifiers are actually there.
grep -Rq 'test-writer'            plugins/relay/agents/test-writer.md
grep -Rq 'test-reviewer'          plugins/relay/agents/test-reviewer.md
grep -Rq '/relay-write-test'      plugins/relay/commands/relay-write-test.md
grep -Rq '/relay-test-write-review' plugins/relay/commands/relay-test-write-review.md
grep -Rq 'test-suite\.diff'       plugins/relay/agents/test-writer.md
grep -Rq 'test-write-review\.jsonl' plugins/relay/agents/test-reviewer.md
```

**Level 3 — INTEGRATION (cross-reference / dispatch integrity)**

```bash
# Every sibling-path Read in relay-execute.md points at a file that exists.
grep -oE '\$\{CLAUDE_PLUGIN_ROOT\}/plugins/relay/commands/[a-z-]+\.md' plugins/relay/commands/relay-execute.md | sed 's#${CLAUDE_PLUGIN_ROOT}/##' | sort -u | while read -r p; do test -f "$p" || { echo "DANGLING REF $p"; exit 1; }; done
# Agent frontmatter name fields equal the subagent_type strings dispatched anywhere in the plugin.
grep -Rq "subagent_type='test-writer'" plugins/relay/ || echo "note: no live test-writer dispatch (deferred example only) — acceptable"
# The renamed command files carry the renamed title.
grep -q '^# /relay-write-test$'        plugins/relay/commands/relay-write-test.md
grep -q '^# /relay-test-write-review$' plugins/relay/commands/relay-test-write-review.md
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** After this phase, `grep -RnE 'tdd-writer|tdd-reviewer|/relay-tdd\b|tdd-initial-suite\.diff|tdd-review\.jsonl' plugins/relay/` returns zero matches **except** the immutable historical-PRD provenance citation `PRPs/prds/tdd-writer-reviewer.prd.md` (a reference to a real existing file, not a stale identifier — excluded via `grep -v 'tdd-writer-reviewer\.prd\.md'`; see Notes: AC-1 carve-out).
- **AC-A2 (PRD AC-1):** The four renamed files exist (`agents/test-writer.md`, `agents/test-reviewer.md`, `commands/relay-write-test.md`, `commands/relay-test-write-review.md`) and the four old-named files are gone.
- **AC-A3 (PRD AC-1):** The corresponding new identifiers are present instead — `test-writer`, `test-reviewer`, `/relay-write-test`, `/relay-test-write-review`, `test-suite.diff`, `test-write-review.jsonl`.
- **AC-A4 (PRD AC-13, PRD AC-12):** Behavior is byte-identical modulo renamed identifiers — the `tdd:false`/empty-frameworks self-skip logic, the R-X universal guard, the foundation-skip, and all ordering/control flow are unchanged (no semantic edits to gates, budgets, or ordering in this phase).
- **AC-A5 (PRD AC-1):** Cross-reference integrity holds — every `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/...` sibling Read path in `relay-execute.md` resolves to an existing renamed file, and each renamed agent's frontmatter `name:` field equals the `Task` `subagent_type` string used to dispatch it.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rename misses a cross-reference, breaking a `Task` dispatch, a sibling-path Read, or an artifact path (PRD Technical Risk, line 195) | M | H | Grounded 9-file inventory from grep counts; AC-1 zero-grep gate run as Level-2 validation over the whole `plugins/relay/` tree; Level-3 checks each sibling Read path resolves and each renamed title is present; the rename is isolated from behavior phases so a miss surfaces as a broken reference, not silent drift |
| A residual `/relay-tdd` ref outside the dispatch's named files (plan-writer/plan-reviewer/relay-prd) is left behind, failing AC-1 | M | M | Research surfaced all three (`plan-writer.md:499`, `plan-reviewer.md:369`, `relay-prd.md:218`); they are enumerated in Task 6 and covered by the whole-tree Level-2 grep gate |
| Renaming a command-name prose ref collides with Phase 7's tdd:false routing-note rewrite | L | L | Phase 1 renames only the command IDENTIFIER; the routing-note SEMANTICS live on different lines and are left untouched (Task 6 ACTION is explicit about this boundary) |
| Coupled artifact-name derivation (`tdd-initial-suite.diff` → `.tdd-review.jsonl`) renamed inconsistently, breaking the JSONL basename logic | L | M | Tasks 2 and 4 rename BOTH strings together and preserve the suffix-stripping logic; Level-2 positive-presence grep asserts both new strings exist |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
- Context for the routing note above: the `relay` repo is itself `tdd: false` with
  `test_frameworks: []`, so no test suite is authored for this plan regardless of mode.
  The note is emitted byte-exact per its single source of truth
  (`plugins/relay/agents/prd-writer.md` Step 7.4), even though this PRD's later phases
  (Phase 7) revise that note's *semantics* — Phase 1 does not touch it.
- **`tdd-reviews.md` → `test-write-reviews.md` is a no-op inside `plugins/relay/`.**
  Research confirmed the literal string `tdd-reviews.md` does not occur anywhere under
  `plugins/relay/` (only `.tdd-review.jsonl` exists). Its sole occurrence is
  `docs/context/architecture.md:103`, which is Phase 8's scope. Phase 1 therefore
  performs no plugin-scoped edit for this string — a documented no-op grounded on
  research, not a TBD.
- **AC-1 carve-out (grounding gap found at implement time).** The renamed agent/command
  files legitimately cite the immutable historical PRD `PRPs/prds/tdd-writer-reviewer.prd.md`
  for provenance (`test-writer.md:10`, `test-reviewer.md:10`, `relay-write-test.md:22`,
  `relay-test-write-review.md:23`). That filename contains the `tdd-writer`/`tdd-reviewer`
  substrings but is a reference to a real, still-existing file — not a stale identifier;
  renaming it would create a dangling reference. AC-1's intent ("no stale identifiers") is
  preserved. The Level-2 gate excludes this one citation via `grep -v 'tdd-writer-reviewer\.prd\.md'`
  and exits non-zero on any other residual. The historical PRD may be re-cited to the new
  PRD when Phases 2–3 rewrite these agents' bodies for mode-awareness; Phase 1 (rename-only)
  leaves the provenance citation intact.
- **Scope beyond the dispatch's illustrative file list.** The orchestrator's dispatch
  named "2 agents + 2 commands + relay-execute.md + relay-implement.md" using the word
  "including"; research + the AC-1 `/relay-tdd\b` gate require three additional files
  (`plan-writer.md`, `plan-reviewer.md`, `relay-prd.md`). Phase 1 includes them (Task 6)
  so the zero-grep gate genuinely passes over the whole tree.
- **No plugin manifest edit needed.** `plugins/relay/.claude-plugin/plugin.json`
  enumerates no `commands`/`agents` arrays — they are auto-discovered by filename — so
  the file renames suffice (research finding, plugin.json:1-9). The root
  `.claude-plugin/marketplace.json` lists the plugin, not individual commands, and is
  outside Phase 1's `plugins/relay/` scope; it is unaffected by the rename.
- **Dogfood note:** this plan is itself produced by `plan-writer` (one of the files this
  phase edits, at line 499). The Task 6 edit to `plan-writer.md` is a single
  command-name reference and does not alter this agent's protocol.

*Generated: 2026-07-09*
*Approved: 2026-07-09*
*Implemented: 2026-07-09*
*Status: IMPLEMENTED*
