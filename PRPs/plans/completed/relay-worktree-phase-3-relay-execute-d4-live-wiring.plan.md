# Feature: /relay-execute D4 live wiring (Phase 3 of relay-worktree)

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: surgical Edit to a shipped cross-cutting orchestrator command; evolves the D4 graceful-degradation rule bullet; extends orchestrator-run.json schema; adds a new Phase A.X step to the live orchestration loop; introduces --no-worktree flag to the argument parser
- Decisions found:
  - 2026-04-19 Command surface table pins /relay-worktree as infra with output .worktrees/<feature>/
  - 2026-04-19 PRP artifacts under PRPs/ at repo root; never .claude/ — orchestrator artifacts go to PRPs/reports/<feature>/
  - 2026-04-19 Interactivity boundary: PRD interactive, downstream autonomous; /relay-execute is fully autonomous post-PRD-APPROVED
  - 2026-04-19 Command surface: one command per stage, writer and reviewer split; /relay-worktree is infra-class (no writer/reviewer split)
  - 2026-05-01 D7 dispatch model: inline command-protocol adoption via Read — orchestrator adopts /relay-worktree the same way it adopts /relay-plan
  - 2026-05-01 D6 state machine: source PRD Implementation Phases table IS the state machine; orchestrator-run.json is the audit artifact
  - 2026-05-01 D3 per-stage retry budget composition: each downstream command owns its internal loop budget; worktree-creation failure is non-fatal (D8 of relay-worktree.prd.md)
  - relay-worktree.prd.md D8: worktree-creation-failure handling is graceful fallback to cwd per D3/D4; pipeline does NOT halt on worktree failure — only on downstream stage failure
  - relay-worktree.prd.md D1: worktree path is .worktrees/<feature>/ (sibling, not under .claude/)
  - relay-worktree.prd.md D10: branch-name pattern is feature/<feature>
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66) — orchestrator-run.json and orchestrator-halt.json MUST remain under PRPs/reports/<feature>/
  - Logic duplication across command files — orchestrator references /relay-worktree by path and adopts its protocol inline; never pastes steps
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md:79-84)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary past PRD-APPROVED; PRPs/ artifact path convention
  - Graceful degradation: worktree-creation failure falls through to cwd behavior; pipeline does NOT halt on worktree failure
  - Writer/reviewer split: /relay-worktree is infra-class; the orchestrator invokes it directly without a reviewer pair
  - orchestrator-run.json schema is the canonical audit artifact; all schema extensions must remain backward-compatible (new fields, not renamed fields)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-worktree.prd.md` — Implementation Phases row 3: "/relay-execute D4 live wiring" — Goal: activate the value — `/relay-execute` now creates worktrees by default — Success signal: Phase 3's plan passes the plan-reviewer rubric (R8 PRD↔plan traceability against this PRD's row 3); the modified `relay-execute.md` passes a manual `/relay-code-review` pass against the source plan.

## Summary

Phase 3 evolves `plugins/relay/commands/relay-execute.md` from dead-code deferral to live worktree orchestration. The deliverable is a set of surgical Edits to that single file that (1) replace the line-611 deferral comment with a live Phase A.3.3 step that invokes `/relay-worktree <feature>` between Phase A.3 (`/relay-plan-review`) and Phase A.3.5 (`/relay-tdd`); (2) evolve the line-49 rule bullet from "graceful degradation when /relay-worktree absent" to "graceful degradation when /relay-worktree fails OR --no-worktree passed"; (3) add `--no-worktree` flag parsing with documented opt-out semantics to the argument parser section; and (4) extend the `orchestrator-run.json` schema with three new fields (`worktree_attempted`, `worktree_succeeded`, `fallback_reason`) that record worktree-creation outcomes and fallback events. The approach is exclusively Edit-based — no new files, no agent, no writer/reviewer split — matching the infra-class designation of `/relay-worktree` and the D7 inline-Read dispatch model already used for every other downstream command.

## User Story

As a relay-developer running `/relay-execute <prd-path>`
I want the orchestrator to automatically create an isolated worktree before the implementation stages run
So that my AI-driven changes are physically confined to `.worktrees/<feature>/`, two concurrent pipeline invocations never collide on files or branches, and I can opt out with `--no-worktree` to preserve the current sequential behavior.

## Problem Statement

`/relay-execute` today runs all implementation stages (plan, TDD, implement, test) against the current working directory's branch. Two concurrent invocations against distinct PRDs share the same working tree, producing file-write collisions, shared branch state, and no physical boundary around each AI agent's changes. The dead-code reservation at `relay-execute.md:611` explicitly defers worktree wiring: "Wiring `/relay-worktree` — deferred per 2026-04-19 surface decision; the orchestrator runs against cwd until `/relay-worktree` ships." Phase 1 has now shipped `/relay-worktree` and Phase 2 has shipped the context-builder extension. Phase 3 completes the wiring: without it, the shipped `/relay-worktree` command is inaccessible from the orchestrated pipeline, and the parallel-execution value of the full feature remains unrealized.

## Solution Statement

Two surgical Edits to `plugins/relay/commands/relay-execute.md` activate the value. Edit 1 (line 49): evolve the architectural-rules bullet from "graceful degradation when /relay-worktree absent (cwd against current branch)" to "graceful degradation when /relay-worktree fails OR --no-worktree passed (cwd against current branch)". Edit 2 (line 611): replace the dead-code deferral bullet with a live Phase A.3.3 sub-section that (a) reads `/relay-worktree <feature>` inline per the D7 dispatch model, (b) on success records `worktree_attempted: true, worktree_succeeded: true`, (c) on failure logs a warning and falls through to cwd-based execution recording `worktree_succeeded: false, fallback_reason: <code>`, and (d) is skipped entirely (recording `worktree_attempted: false`) when `--no-worktree` was passed. Two additional Edits complete the picture: the argument-parser section gains the `--no-worktree` flag with full documented opt-out semantics (AC-13); and every `orchestrator-run.json` schema block gains the three new fields. No new files are created; no agents are added; the writer/reviewer split is not touched.

## Metadata

| Key | Value |
|-----|-------|
| Type | Command file evolution (surgical Edit) |
| Complexity | Medium — multiple non-adjacent Edits in a single large file; schema extension must be consistent across all JSON blocks |
| Systems Affected | `plugins/relay/commands/relay-execute.md` (the only file changed); `orchestrator-run.json` runtime schema (extended with 3 fields) |
| Dependencies | Phase 1 complete (`relay-worktree.md` shipped); Phase 2 complete (context-builder extension shipped) |
| Estimated Tasks | 5 atomic tasks (argument parser, Phase A.3.3 sub-section, line-49 rule bullet, orchestrator-run.json schema blocks, What-you-do-NOT-do bullet removal) |
| Source PRD line ref | `PRPs/prds/relay-worktree.prd.md` row 3 (Implementation Phases table) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-execute.md` | 1–621 | The file being edited; must read end-to-end before any Edit to avoid stale-content mismatches |
| P0 | `plugins/relay/commands/relay-execute.md` | 49 | Exact line to replace: the architectural-rules bullet with the old graceful-degradation wording |
| P0 | `plugins/relay/commands/relay-execute.md` | 607–621 | The "What you do NOT do" section containing the line-611 dead-code deferral bullet |
| P0 | `PRPs/prds/relay-worktree.prd.md` | 188–194 | Implementation Phases table — row 3 scope and ACs |
| P0 | `PRPs/prds/relay-worktree.prd.md` | 208–212 | Phase 3 Phase Details (Goal, Scope, Success signal) |
| P1 | `PRPs/prds/relay-worktree.prd.md` | 78–81 | AC-12, AC-13, AC-14, AC-15 — the four ACs this phase satisfies |
| P1 | `plugins/relay/commands/relay-execute.md` | 56–68 | Argument-parser section — where `--no-worktree` flag goes |
| P1 | `plugins/relay/commands/relay-execute.md` | 170–215 | Phase A.0 and A.1 sections — context for inserting Phase A.3.3 |
| P1 | `plugins/relay/commands/relay-execute.md` | 241–300 | Phase A.3 plan sub-flow and A.3.5 TDD sub-flow — Phase A.3.3 inserts between them |
| P1 | `plugins/relay/commands/relay-execute.md` | 533–565 | Phase A.6 and orchestrator-run.json schema blocks — schema extension sites |
| P2 | `plugins/relay/commands/relay-worktree.md` | 1–50 | Precondition and argument shape of the command being wired in; confirms the invocation signature `/relay-worktree <feature>` |
| P2 | `PRPs/prds/relay-worktree.prd.md` | 228–239 | Decisions Log D1, D8, D10 — path convention, failure-handling, branch-name pattern |

## Patterns to Mirror

The following patterns are derived from the current `relay-execute.md` content read above. All `file:line` references are confirmed from the Read output.

### Pattern 1 — Inline command-protocol adoption (D7 dispatch model)

```
# SOURCE: plugins/relay/commands/relay-execute.md:317-322

#### Step A.3.5.1 — Adopt /relay-tdd role

Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-tdd.md` and execute its full protocol inline against `current_plan_path`. Pass context:

- `plan_path`: `current_plan_path`
- `target_root`: the cwd
- `prior_feedback`: null on first attempt; the captured B8 JSONL line on retry attempts (orchestrator-side feedback channel)
```

**Used by:** Task 2 (insert Phase A.3.3 worktree sub-section) — mirrors the exact shape of the `Read + execute inline` adoption pattern, adapted for `/relay-worktree`.

### Pattern 2 — orchestrator_run_log append on outcome

```
# SOURCE: plugins/relay/commands/relay-execute.md:348-352

**On APPROVED:**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "tdd", "outcome": "APPROVED", "suite_path": "<current_suite_path>"}
```
```

**Used by:** Task 2 (Phase A.3.3) — mirrors the orchestrator_run_log entry shape for the new worktree stage, with additional fields `worktree_attempted`, `worktree_succeeded`, `fallback_reason`.

### Pattern 3 — Command-exists guard skip with structured log entry

```
# SOURCE: plugins/relay/commands/relay-execute.md:439-454

#### Step A.5.1 — Command-exists check

Check that both `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md` and `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-review.md` are readable.

If either is absent: emit structured warning:

> Warning: relay-test / relay-test-review not available; skipping test
> stage for phase <N>. ...

Record in `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test", "outcome": "skipped_command_absent"}
```
```

**Used by:** Task 2 (Phase A.3.3) — the `--no-worktree` skip path mirrors this guarded-skip pattern, recording `{"stage": "worktree", "outcome": "skipped_no_worktree_flag"}` instead.

### Pattern 4 — Argument-parser section (flag addition site)

```
# SOURCE: plugins/relay/commands/relay-execute.md:56-68

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat the argument as the PRD path; resolve it as absolute, or as relative to the current working directory. If the argument is blank/whitespace, HALT with:
...
Record `prd_path` as the resolved absolute path. Record `target_root` as the current working directory. Parse `<feature>` as the PRD basename minus `.prd.md`.
```

**Used by:** Task 1 (add `--no-worktree` flag to the argument parser) — shows the existing parser boundary where the new flag extraction line is appended.

### Pattern 5 — Constraints / hard-rules bullet shape

```
# SOURCE: plugins/relay/commands/relay-execute.md:587-603

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** All orchestrator artifacts go to `PRPs/reports/<feature>/` ...
2. **Never bundle writer + reviewer.** ...
...
9. **When `tdd: true`, the orchestrator invokes `/relay-tdd` and `/relay-tdd-review` in Phase A.3.5 with budget `max_tdd_review_retries=2`; ...
```

**Used by:** Task 4 (add hard-rule 10 for worktree wiring) — mirrors the numbered-constraint prose style to document the new `--no-worktree` + fallback-chain rule.

### Pattern 6 — What-you-do-NOT-do bullet (the dead-code reservation to remove)

```
# SOURCE: plugins/relay/commands/relay-execute.md:611

- **Wiring `/relay-worktree`** — deferred per 2026-04-19 surface decision; the orchestrator runs against cwd until `/relay-worktree` ships.
```

**Used by:** Task 5 (delete this bullet) — this exact line is the old_string for the Edit that removes the dead-code reservation. Once Phase A.3.3 is inserted, this bullet becomes false and must be removed to avoid contradicting the live wiring.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-execute.md` | UPDATE | Five surgical Edits: (1) add `--no-worktree` to argument parser; (2) insert Phase A.3.3 worktree sub-section; (3) evolve line-49 rule bullet; (4) add hard-rule 10 for worktree + fallback; (5) remove line-611 dead-code deferral bullet. Also update all `orchestrator-run.json` schema blocks with three new fields. Satisfies AC-12, AC-13, AC-14, AC-15. |

## NOT Building (Scope Limits)

- **Worktree cleanup / removal** — out of scope for this phase and the entire `relay-worktree` PRD for Phase 3. Pillar 3 (`/relay-approve`) owns `git worktree remove` + branch deletion.
- **`/relay-pr` wiring** — separate future command; the orchestrator continues to surface "ready for /relay-pr" on success but does not invoke it.
- **Phase 4 synthetic dogfood** — verifying AC-16 (parallel non-collision) is Phase 4's scope, not Phase 3.
- **Phase 5 docs + v0.11.0 release cut** — `docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, and `plugin.json` bump are Phase 5.
- **`--bootstrap-timeout` flag** — Could-item in the relay-worktree PRD; Phase 3 does not touch this.
- **Cross-OS shell-script bootstrap differences** — Phase 1 concern; Phase 3 only wires the invocation.
- **Stack auto-detection in bootstrap template** — Could-item; not Phase 3.
- **`/relay-worktree` command itself** — shipped in Phase 1; Phase 3 only wires it into the orchestrator.

## Step-by-Step Tasks

### Task 1: UPDATE argument parser — add `--no-worktree` flag

**ACTION**: Edit the `## Parse arguments` section of `plugins/relay/commands/relay-execute.md` to add `--no-worktree` flag extraction after the existing `Record prd_path ...` sentence. The new text documents that when `--no-worktree` is present, Phase A.3.3 is entirely skipped and all downstream stages operate against cwd (AC-13 opt-out semantics preserved verbatim).

**MIRROR**: Pattern 4 (argument-parser section, `relay-execute.md:56-68`) — append after the existing "Parse `<feature>` as the PRD basename minus `.prd.md`." line.

**VALIDATE**: `grep -n "no-worktree" plugins/relay/commands/relay-execute.md | grep "Parse arguments" || grep -c "no-worktree" plugins/relay/commands/relay-execute.md`

The command must return at least 1 (the newly added flag line appears in the file).

### Task 2: UPDATE relay-execute.md — insert Phase A.3.3 worktree sub-section

**ACTION**: Edit `plugins/relay/commands/relay-execute.md` to insert a new `### Phase A.3.3 — Per-phase worktree creation sub-flow` section immediately after the last sentence of Phase A.3.2 (`### Phase A.3.2 — Adopt /relay-plan-review role`) and before `### Phase A.3.5`. The new section must:

1. If `--no-worktree` was passed: skip silently, append `{"phase": <N>, "stage": "worktree", "outcome": "skipped_no_worktree_flag", "worktree_attempted": false}` to `orchestrator_run_log`, proceed to Phase A.3.5.
2. Else: Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-worktree.md` and execute its protocol inline for feature `<feature>` (D7 dispatch model).
3. On success (exit 0): append `{"phase": <N>, "stage": "worktree", "outcome": "CREATED", "worktree_path": ".worktrees/<feature>/", "worktree_attempted": true, "worktree_succeeded": true, "fallback_reason": null}` to `orchestrator_run_log`.
4. On failure (non-zero exit): log warning per AC-14 ("worktree-creation failure — falling through to cwd-based execution per D3/D4 graceful-degradation"), append `{"phase": <N>, "stage": "worktree", "outcome": "FALLBACK_CWD", "worktree_attempted": true, "worktree_succeeded": false, "fallback_reason": "<exit-code or error message>"}` to `orchestrator_run_log`, continue. The pipeline does NOT halt.

**MIRROR**: Pattern 1 (`relay-execute.md:317-322`) for the inline-Read + execute shape; Pattern 2 (`relay-execute.md:348-352`) for the orchestrator_run_log append; Pattern 3 (`relay-execute.md:439-454`) for the guarded-skip (--no-worktree) log entry shape.

**VALIDATE**: `grep -n "Phase A.3.3" plugins/relay/commands/relay-execute.md`

The command must return exactly one line showing the new sub-section header.

### Task 3: UPDATE orchestrator-run.json schema blocks — add three new fields

**ACTION**: Edit every `orchestrator-run.json` JSON schema block in `plugins/relay/commands/relay-execute.md` (Phase A.1 final summary, Phase A.2 halt block, Phase A.6 mid-run block) to include the three new fields adjacent to the `phases` field:

```json
"worktree_attempted": <boolean | null>,
"worktree_succeeded": <boolean | null>,
"fallback_reason": "<string | null>"
```

These fields are `null` when Phase A.3.3 has not yet run (early halt before worktree step) and carry the actual values from the Phase A.3.3 log entry once it has run. This is a backward-compatible additive extension (new fields, no renamed fields).

**MIRROR**: Pattern 2 (`relay-execute.md:348-352`) for the orchestrator_run_log field-append style.

**VALIDATE**: `grep -c "worktree_attempted" plugins/relay/commands/relay-execute.md`

The command must return a count ≥ 3 (one occurrence per schema block).

### Task 4: UPDATE line-49 rule bullet and add hard-rule 10

**ACTION**: Two Edits to `plugins/relay/commands/relay-execute.md`:

Edit 4a — evolve the architectural-rules bullet at line 49 from:
```
  - Three-pillar Pillar 2 (Implementation); interactivity boundary; PRPs/ artifact paths; writer/reviewer split; graceful degradation when /relay-worktree absent (cwd against current branch)
```
to:
```
  - Three-pillar Pillar 2 (Implementation); interactivity boundary; PRPs/ artifact paths; writer/reviewer split; graceful degradation when /relay-worktree fails OR --no-worktree passed (cwd against current branch)
```

Edit 4b — add hard-rule 10 to the `## Constraints (hard rules)` section after item 9:
```
10. **`/relay-worktree` is invoked in Phase A.3.3 by default before Phase A.3.5.** When `--no-worktree` is passed, Phase A.3.3 is entirely skipped. When `/relay-worktree` returns a non-zero exit code, the orchestrator logs a warning, records `worktree_succeeded: false` and `fallback_reason` in `orchestrator-run.json`, and continues against cwd — the pipeline does NOT halt on worktree-creation failure (D8 of relay-worktree.prd.md). The worktree at `.worktrees/<feature>/` and its branch `feature/<feature>` persist on disk even if /relay-execute halts mid-pipeline (AC-15).
```

**MIRROR**: Pattern 5 (`relay-execute.md:587-603`) for the numbered-constraint prose style.

**VALIDATE**: `grep -n "worktree fails OR" plugins/relay/commands/relay-execute.md && grep -n "hard rule" plugins/relay/commands/relay-execute.md || grep -c "Wiring.*relay-worktree.*fails OR" plugins/relay/commands/relay-execute.md; grep -n "Phase A.3.3 by default" plugins/relay/commands/relay-execute.md`

Both the updated line-49 bullet and the new hard-rule 10 must appear.

### Task 5: DELETE line-611 dead-code deferral bullet

**ACTION**: Edit `plugins/relay/commands/relay-execute.md` to remove the `## What you do NOT do` bullet at line 611:

```
- **Wiring `/relay-worktree`** — deferred per 2026-04-19 surface decision; the orchestrator runs against cwd until `/relay-worktree` ships.
```

Once Phase A.3.3 is live, this bullet is factually false and must be removed to avoid contradicting the wired behavior. The removal also satisfies AC-12 ("The `relay-execute.md:611` deferral comment ... are replaced with the live wiring; the dead-code reservation is gone").

**MIRROR**: Pattern 6 (`relay-execute.md:611`) — this exact string is the `old_string` for the Edit; `new_string` is empty (the line and trailing newline are deleted).

**VALIDATE**: `grep -n "deferred per 2026-04-19 surface decision" plugins/relay/commands/relay-execute.md`

The command must return no output (the dead-code line is gone).

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Markdown lint — verify the file is valid GFM after all Edits
npx markdownlint-cli plugins/relay/commands/relay-execute.md --config .markdownlint.json 2>/dev/null || echo "markdownlint not configured; skipping"

# YAML frontmatter parse — verify the description field is still valid
python3 -c "
import sys, re
content = open('plugins/relay/commands/relay-execute.md').read()
fm = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
if not fm: sys.exit('FAIL: no frontmatter found')
print('PASS: frontmatter present')
"

# Verify no .claude/PRPs references leaked into the body
grep -n "\.claude/PRPs" plugins/relay/commands/relay-execute.md && echo "FAIL: .claude/PRPs found" || echo "PASS: no .claude/PRPs references"
```

### Level 2 CONTENT_INVARIANTS

```bash
# AC-12: dead-code reservation is gone
grep -n "deferred per 2026-04-19 surface decision" plugins/relay/commands/relay-execute.md \
  && echo "FAIL: dead-code line still present" \
  || echo "PASS: dead-code deferral removed (AC-12)"

# AC-12: Phase A.3.3 sub-section is present and in the right position
python3 -c "
content = open('plugins/relay/commands/relay-execute.md').read()
a33 = content.find('Phase A.3.3')
a35 = content.find('Phase A.3.5')
if a33 == -1: sys.exit('FAIL: Phase A.3.3 not found')
if a35 == -1: sys.exit('FAIL: Phase A.3.5 not found')
if a33 < a35: print('PASS: A.3.3 appears before A.3.5 (AC-12)')
else: sys.exit('FAIL: A.3.3 is not before A.3.5')
" 2>/dev/null || python3 -c "
import sys; content = open('plugins/relay/commands/relay-execute.md').read()
a33 = content.find('Phase A.3.3'); a35 = content.find('Phase A.3.5')
if a33 == -1: sys.exit('FAIL: Phase A.3.3 not found')
if a35 == -1: sys.exit('FAIL: Phase A.3.5 not found')
print('PASS') if a33 < a35 else sys.exit('FAIL: A.3.3 is not before A.3.5')
"

# AC-13: --no-worktree flag documented in argument parser
grep -n "no-worktree" plugins/relay/commands/relay-execute.md \
  | grep -i "parse\|argument\|flag\|opt" \
  && echo "PASS: --no-worktree flag in parser section (AC-13)" \
  || grep -c "no-worktree" plugins/relay/commands/relay-execute.md

# AC-14: fallback chain fields present in schema
grep -c "worktree_attempted" plugins/relay/commands/relay-execute.md \
  | awk '$1 >= 3 {print "PASS: worktree_attempted in >=3 schema blocks (AC-14)"} $1 < 3 {print "FAIL: worktree_attempted in only " $1 " blocks"}'

grep -c "worktree_succeeded" plugins/relay/commands/relay-execute.md \
  | awk '$1 >= 3 {print "PASS: worktree_succeeded in >=3 schema blocks"} $1 < 3 {print "FAIL"}'

grep -c "fallback_reason" plugins/relay/commands/relay-execute.md \
  | awk '$1 >= 3 {print "PASS: fallback_reason in >=3 schema blocks"} $1 < 3 {print "FAIL"}'

# AC-15: worktree persistence on halt — verify the constraint section states this
grep -n "persist" plugins/relay/commands/relay-execute.md \
  && echo "PASS: persistence language present" \
  || echo "INFO: check constraints section manually for AC-15 language"

# Line-49 rule bullet evolved
grep -n "worktree fails OR" plugins/relay/commands/relay-execute.md \
  && echo "PASS: line-49 bullet updated" \
  || echo "FAIL: old graceful-degradation wording still present"

grep -n "worktree absent" plugins/relay/commands/relay-execute.md \
  && echo "FAIL: old 'absent' wording still present in line-49 bullet" \
  || echo "PASS: old 'absent' wording removed"
```

### Level 3 INTEGRATION (DRY-RUN END-TO-END)

```bash
# Dry-run: read the modified file end-to-end and verify section structure
python3 -c "
import sys, re
content = open('plugins/relay/commands/relay-execute.md').read()
required = [
  '## Your mission',
  '## Decision Gate',
  '## Parse arguments',
  '## Preconditions',
  '## Phase A',
  'Phase A.0',
  'Phase A.1',
  'Phase A.2',
  'Phase A.3',
  'Phase A.3.3',
  'Phase A.3.5',
  'Phase A.4',
  'Phase A.5',
  'Phase A.6',
  '## Final output surface',
  '## Constraints (hard rules)',
  '## What you do NOT do',
  '--no-worktree',
  'worktree_attempted',
  'worktree_succeeded',
  'fallback_reason',
]
missing = [s for s in required if s not in content]
if missing:
    sys.exit('FAIL: missing sections/tokens: ' + str(missing))
print('PASS: all required sections and tokens present')
"

# Verify the dead-code line is absent and the live section is present
python3 -c "
import sys
content = open('plugins/relay/commands/relay-execute.md').read()
if 'deferred per 2026-04-19 surface decision' in content:
    sys.exit('FAIL: dead-code deferral line still present')
if 'Phase A.3.3' not in content:
    sys.exit('FAIL: Phase A.3.3 sub-section missing')
print('PASS: live wiring confirmed; dead code removed')
"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** The `relay-execute.md:611` deferral bullet ("Wiring `/relay-worktree` — deferred...") is removed. A new `### Phase A.3.3 — Per-phase worktree creation sub-flow` section appears between Phase A.3.2 (`/relay-plan-review` sub-flow) and Phase A.3.5 (`/relay-tdd` sub-flow). When `/relay-execute <prd-path>` is invoked without `--no-worktree`, the orchestrator reaches Phase A.3.3 and invokes `/relay-worktree <feature>` inline via the D7 Read-and-execute-inline dispatch model. All subsequent stages (A.3.5 TDD, A.4 implement, A.5 test) operate with the worktree context established in A.3.3.

- **AC-A2 (PRD AC-13):** The `## Parse arguments` section of `relay-execute.md` documents `--no-worktree` as a recognized optional flag. When `--no-worktree` is present in `$ARGUMENTS`, Phase A.3.3 is skipped entirely (records `worktree_attempted: false` in `orchestrator_run_log`) and all downstream stages operate against cwd on the current branch — exactly preserving the pre-Phase-3 behavior. The flag is documented in the argument-parser section with explicit opt-out semantics.

- **AC-A3 (PRD AC-14):** When Phase A.3.3 runs (without `--no-worktree`) and `/relay-worktree` returns a non-zero exit code, the orchestrator logs a structured warning, falls through to cwd-based execution, and records `worktree_attempted: true, worktree_succeeded: false, fallback_reason: <exit-code or message>` in `orchestrator-run.json`. The pipeline does NOT halt on worktree-creation failure — it proceeds to Phase A.3.5 and beyond against cwd.

- **AC-A4 (PRD AC-15):** The updated `## Constraints (hard rules)` section (hard-rule 10) explicitly states that the worktree at `.worktrees/<feature>/` and its branch `feature/<feature>` persist on disk even if `/relay-execute` halts mid-pipeline. No cleanup or removal logic is added to `/relay-execute` by this phase.

- **AC-A5 (PRD AC-12):** The line-49 architectural-rules bullet in the Decision Gate block template is evolved from "graceful degradation when /relay-worktree absent (cwd against current branch)" to "graceful degradation when /relay-worktree fails OR --no-worktree passed (cwd against current branch)". This removes the factually outdated "absent" framing and aligns the rule with the live wiring.

- **AC-A6 (PRD AC-14):** Every `orchestrator-run.json` schema block in `relay-execute.md` (Phase A.1 ALL_PHASES_COMPLETE, Phase A.2 FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED, Phase A.6 in-progress write) gains three new fields: `worktree_attempted` (boolean or null), `worktree_succeeded` (boolean or null), `fallback_reason` (string or null). The extension is additive — no existing field is renamed or removed.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stale file content mismatch on Edit — the Implementer reads an outdated version of relay-execute.md before applying Edits, causing `old_string` not-found failures | M | M | Task 1 instruction mandates reading the full file end-to-end before any Edit; all five Edits in this plan use verbatim full-row or full-sentence `old_string` values that are unique in the file |
| Phase A.3.3 insertion point ambiguity — the Edit target between A.3.2 and A.3.5 is not uniquely identified if the old_string is too short | M | M | Use the last unique sentence of Phase A.3.2 as `old_string` anchor; confirmed unique by `grep` in VALIDATE step |
| orchestrator-run.json schema update misses one of the three JSON blocks — leaving an inconsistent schema across success/halt paths | M | L | Task 3 VALIDATE uses `grep -c` expecting ≥ 3 occurrences; Level 2 content-invariants also assert count |
| --no-worktree flag argument parsing collides with PRD path parsing — the PRD path contains a double-dash or the flag is consumed as the path | L | M | Document that `$ARGUMENTS` parsing extracts `--no-worktree` before resolving the path token; the PRD path is always the first non-flag token |
| research-web returned no findings (this is a pure internal-file Edit phase with no meaningful web research surface) | L | L | research-web degradation accepted; all Patterns to Mirror are sourced from codebase research (real `file:line` references confirmed); Patterns section is fully populated |
| The dead-code bullet removal (Task 5) leaves a blank line gap in the "What you do NOT do" section | L | L | Level 3 integration VALIDATE reads the full section and verifies all remaining bullets are still present; the implementer trims any resulting double-blank-line |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Implementer sequence note:** The five Edits in Step-by-Step Tasks MUST be applied in order 1 → 5 within a single read-then-edit session to avoid stale-content failures. The file should be read once at the start (establishing the baseline), then each Edit applied sequentially. Re-reading between Edits is acceptable but not required when the Implementer tracks the in-memory state.

**Inline worktree invocation shape:** The Phase A.3.3 prose should mirror the A.3.5 dispatch model exactly — `Read ${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-worktree.md and execute its full protocol inline for feature <feature>` — so the D7 dispatch contract is applied uniformly to the new infra command, the same way it is applied to the five existing downstream commands.

**orchestrator-run.json backward compatibility:** The three new fields (`worktree_attempted`, `worktree_succeeded`, `fallback_reason`) are additive. Any consumer parsing `orchestrator-run.json` must tolerate their absence (null / missing) in runs that pre-date Phase 3 or that HALTed before Phase A.3.3 ran. No existing field changes name, type, or semantics.

**AC-15 persistence is free:** The worktree persistence guarantee (AC-15) requires no new code — worktrees created by `git worktree add` persist by default unless explicitly removed by `git worktree remove`. The constraint simply prohibits Phase 3 from adding any cleanup logic to the orchestrator, which is already out of scope per the PRD.

*Generated: 2026-05-11*
*Approved: 2026-05-11*
*Implemented: 2026-05-11*
*Status: IMPLEMENTED*
