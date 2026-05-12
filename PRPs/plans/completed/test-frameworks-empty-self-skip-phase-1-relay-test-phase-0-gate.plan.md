# Feature: /relay-test Phase 0 gate (Phase 1 of test-frameworks-empty-self-skip)

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: protocol evolution touching /relay-test command file; inserts Phase 0 self-skip gate symmetric to /relay-tdd P4.a; cross-cutting artifact (command file consumed by /relay-execute Phase A.5)
- Decisions found:
  - 2026-05-06 — TDD pair is the authorized mechanism for test creation; /relay-execute A.3.5.0 self-skips silently when tdd: false or methodology.md missing — direct structural precedent for symmetric self-skip at command level
  - 2026-04-19 — PRP artifact paths under PRPs/ (never .claude/) — no artifact path change in this phase; constraint satisfied by construction
  - 2026-05-11 D8 — Worktree-creation-failure graceful fallback to cwd — graceful-degradation philosophy applied symmetrically here (self-skip = correct semantics, not a failure)
  - 2026-05-01 D6 — Source PRD's Implementation Phases table is the canonical state machine — plan-writer back-fill required (this phase)
- Applicable anti-patterns:
  - docs/anti-patterns.md:43-48 — "Activating the TDD track by heuristic" — applied symmetrically: test_frameworks activation requires explicit non-empty declaration; never heuristic
  - docs/anti-patterns.md:60-66 — "Writing pipeline artifacts under .claude/" — no .claude/ writes; all artifacts under PRPs/
  - docs/anti-patterns.md:79-84 — "Relying on interactive permission prompts" — a false FAILED_INFRA_UNRECOVERABLE halt is semantically equivalent to an unsignalled prompt; this phase eliminates it
- Applicable architectural rules:
  - docs/context/architecture.md:57-81 — Interactivity boundary; past PRD approval, autonomous; halts must be semantically correct for genuine failures only
  - docs/context/architecture.md:84-98 — PRPs/ artifact paths; no .claude/ writes
  - Three-pillar Pillar 2 writer/reviewer pairs preserved (no command-surface change, behavioral fix only)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-frameworks-empty-self-skip.prd.md` — Implementation Phases row 1: "/relay-test Phase 0 gate" — Goal: Make `/relay-test` semantically correct for framework-less projects when invoked standalone. — Success signal: `grep -n "Test framework inactive" plugins/relay/commands/relay-test.md` returns the verbatim line at the Phase 0 location; running the standalone command against a `test_frameworks: []` worktree emits the line and exits 0.

## Summary

Phase 1 delivers a Phase 0 self-skip gate inserted at the top of `plugins/relay/commands/relay-test.md`'s precondition chain. When `docs/context/methodology.md` has `test_frameworks: []` — or the file is absent entirely — the command emits the verbatim line `Test framework inactive (test_frameworks: []). Skipping.` and exits 0 without writing any artifact. This is the exact symmetric counterpart to `/relay-tdd`'s existing P4.a branch (`TDD track inactive (tdd: false). Skipping.`). The phase also updates the Graceful degradation summary table in the same file, replacing the current `FAILED_INFRA_UNRECOVERABLE` row for "Worktree has no test framework" with the new `skipped_no_test_framework` / exit-0 outcome. The strict `FAILED_INFRA_UNRECOVERABLE` path is preserved for genuine infra failures (missing `.claude/settings.json` when a framework IS declared, docker not running, container failure, normalizer crash).

## User Story

As a relay pipeline operator running `/relay-execute` (or `/relay-test` directly) against a project that legitimately has no test suite (markdown/JSON-only plugin, doc-only repo, IaC-only repo — including the relay repo itself),
I want `/relay-test` to recognize `test_frameworks: []` (or absent `methodology.md`) as a declared framework-less state and self-skip gracefully,
So that I can run the autonomous pipeline end-to-end without false `FAILED_INFRA_UNRECOVERABLE` halts and receive a semantically correct exit code of 0.

## Problem Statement

`/relay-test`'s precondition chain currently conflates three distinct failure modes — `missing_settings_json`, `no_runner_detected`, and `no_test_framework` — into a single `FAILED_INFRA_UNRECOVERABLE` halt. For projects with `test_frameworks: []` (framework-less by design), this conflation is semantically wrong: the project has no test suite BY DESIGN, not because of broken infrastructure. The relay repo itself is the canonical case. The 2026-05-11 relay-worktree dogfood demonstrated non-deterministic results: session A self-skipped gracefully while session B took the strict halt path yet still declared `ALL_PHASES_COMPLETE` — a direct contradiction of the strict orchestrator protocol and evidence that the current behavior is inconsistent rather than merely strict.

## Solution Statement

Insert a Phase 0 self-skip gate immediately above the existing Preconditions check (P1–P5) in `plugins/relay/commands/relay-test.md`. The gate reads `<target_root>/docs/context/methodology.md` and branches: (a) if the file is absent OR `test_frameworks` is empty (`[]`), emit the verbatim line `Test framework inactive (test_frameworks: []). Skipping.` and exit 0 — no artifacts written; (b) if `test_frameworks` is non-empty, fall through to the existing P1–P5 preconditions chain unchanged. Update the Graceful degradation summary table to reflect the new outcome for the "Worktree has no test framework" scenario.

## Metadata

| Key | Value |
|-----|-------|
| Type | Command file evolution (behavioral fix, Markdown) |
| Complexity | Low — single file, two insertion points (Phase 0 block + table row update) |
| Systems Affected | `plugins/relay/commands/relay-test.md` |
| Dependencies | None (Phase 1 has no `Depends` cell; self-contained) |
| Estimated Tasks | 3 atomic tasks |
| Source PRD line ref | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` row 1, line 152 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-tdd.md` | 112–141 | Canonical pattern to mirror: P4.a / P4.b / P4.c three-branch gate; verbatim skip line shape; structural position above Phase A |
| P0 | `plugins/relay/commands/relay-test.md` | 1–252 | File being edited; need current structure, preconditions wording (lines 53–63), Graceful degradation table (lines 229–239), Constraints section |
| P1 | `plugins/relay/commands/relay-execute.md` | 353–361 | A.3.5.0 orchestrator gate — structural reference showing the symmetric self-skip at orchestrator level (for understanding the dual-layer design, not edited in Phase 1) |
| P1 | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` | 59–68 | AC-1 through AC-7 — acceptance criteria this phase must satisfy |
| P2 | `docs/decisions.md` | 421–437 | 2026-05-06 TDD self-skip entry — format precedent and rationale anchor |

## Patterns to Mirror

### Pattern 1 — P4.a self-skip gate (the canonical reference)

```markdown
# SOURCE: plugins/relay/commands/relay-tdd.md:112-141

### P4 — methodology.md gate (self-skip / hard-abort / proceed)

Read `<target_root>/docs/context/methodology.md`. Three branches:

#### P4.a — self-skip (PRD AC-1, AC-2)

If the file is missing OR its frontmatter has `tdd: false`:

Emit verbatim and exit 0:

> TDD track inactive (tdd: false). Skipping.

Do NOT dispatch the Writer. Do NOT write any artifact.

#### P4.b — hard-abort (PRD AC-3)

If `tdd: true` AND `test_frameworks` is missing OR empty (`[]`):

HALT with verbatim message and non-zero exit:

> TDD track active but no test framework declared. Run context-builder *update or remove tdd:true.

Do NOT dispatch the Writer. Do NOT write any artifact.

#### P4.c — proceed

If `tdd: true` AND `test_frameworks` is non-empty: proceed to
Phase A.
```

**Task 1 copies this pattern** for the new Phase 0 gate in `relay-test.md`, substituting the `test_frameworks` key (instead of `tdd`) as the gate condition, retaining the same three-branch structure (self-skip on empty/absent, hard-abort is not applicable here — the equivalent of P4.b does not apply because `test_frameworks: []` is itself the self-skip trigger; the gate collapses to two branches: self-skip vs proceed).

### Pattern 2 — A.3.5.0 orchestrator gate (structural reference for symmetric shape)

```markdown
# SOURCE: plugins/relay/commands/relay-execute.md:353-361

#### Step A.3.5.0 — methodology.md gate (live no-op when `tdd: false`)

Re-read `<target_root>/docs/context/methodology.md` (already read in P5 — re-read here protects against mid-flow mutations).

- If file absent or `tdd: false`: A.3.5 self-skips. Append to `orchestrator_run_log`:
  ```json
  {"phase": <N>, "stage": "tdd", "outcome": "skipped_tdd_false"}
  ```
  Proceed directly to Phase A.4. No suite manifest is produced.

- If `tdd: true`: proceed to Step A.3.5.1.
```

**Task 1 references this pattern** as the orchestrator-level structural anchor showing the dual-layer design (command gate + orchestrator gate). This phase implements only the command-level gate; Phase 2 implements the orchestrator gate.

### Pattern 3 — Graceful degradation table (current state, to be updated)

```markdown
# SOURCE: plugins/relay/commands/relay-test.md:229-239

## Graceful degradation summary

| Scenario | Outcome code | What happens |
|----------|--------------|--------------|
| `.claude/settings.json` missing | HALT at precondition check | User re-runs context-builder |
| Worktree has no test framework | `FAILED_INFRA_UNRECOVERABLE` (via agent `ABORT_INFRA`) | "Not verified by tests" noted in run.json |
| Docker not running | Recovery once via `make test-down && make test-bootstrap`; if still fails, `FAILED_INFRA_UNRECOVERABLE` | User checks docker daemon |
| Time budget exceeded mid-attempt | `FAILED_TIME_BUDGET_EXCEEDED` | Run stops, partial record preserved |
| Retry budget exhausted | `FAILED_AFTER_N_RETRIES` | Run stops with attempt history |
| Implementer proposes oscillation | `FAILED_OSCILLATION` | Run stops; pair of conflicting attempts reported |
| `/relay-implement` command not yet available (pipeline WIP) | HALT on first `RETRY_NEEDED` | Feedback written to disk; user applies manually |
```

**Task 3 updates this table** — replaces the "Worktree has no test framework" row with the new `skipped_no_test_framework` / exit-0 outcome.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-test.md` | UPDATE | Insert Phase 0 self-skip gate above current Preconditions check; update Graceful degradation summary table row for "Worktree has no test framework" |

## NOT Building (Scope Limits)

- `/relay-execute` Phase A.5.0 explicit handling — that is Phase 2; not in this phase's scope.
- `docs/decisions.md` codification entry — that is Phase 3; not in this phase's scope.
- Documentation site updates (`documentation/commands.html`, `docs/api-reference.md`, `documentation/changelog.html`, `plugin.json` bump) — that is Phase 4; not in this phase's scope.
- Auto-detection of test frameworks — explicit anti-pattern (`docs/anti-patterns.md:43-48`); never build.
- Changing `FAILED_INFRA_UNRECOVERABLE` semantics for genuine infra issues (missing `.claude/settings.json` when framework declared, docker down, container failure) — preserved verbatim.
- Updating `plugins/relay/agents/test-runner.md` (lines 69, 91, 281 `no_test_framework` ABORT_INFRA emission sites) — captured as an Open Question in the PRD (Could-item); deferred.
- Adding an explicit Phase 0 gate to `/relay-test-review` — the natural inheritance (self-skip when `run.json` absent) already produces the correct behavior; the decisions.md entry (Phase 3) documents this as the operative contract.
- Re-validating the relay-worktree AC-16 cross-contamination methodology gap — separate concern, deferred.

## Step-by-Step Tasks

### Task 1: INSERT Phase 0 self-skip gate above current Preconditions section in `plugins/relay/commands/relay-test.md`

- **ACTION**: Using `Edit`, insert a new `## Phase 0 — methodology.md self-skip gate` section immediately above the existing `## Preconditions check` section (currently at line 53). The new section reads `<worktree-path>/docs/context/methodology.md` (the `<worktree-path>` arg already parsed above). Two branches:
  - **Phase 0.a — self-skip:** if the file is absent OR its frontmatter `test_frameworks` key is missing OR is an empty list (`[]`): emit verbatim and exit 0: `Test framework inactive (test_frameworks: []). Skipping.` Do NOT initialize loop state. Do NOT write any artifact.
  - **Phase 0.b — proceed:** if `test_frameworks` is non-empty: fall through to the existing `## Preconditions check` unchanged.
  The section structure mirrors `/relay-tdd`'s P4 gate (Pattern 1 above) with `test_frameworks` as the gate key instead of `tdd`. The verbatim skip line is: `Test framework inactive (test_frameworks: []). Skipping.` — symmetric in shape to `TDD track inactive (tdd: false). Skipping.` — no deviation.

  *(satisfies AC-A1, AC-A2, AC-A3, AC-A4)*
- **MIRROR**: Pattern 1 (`plugins/relay/commands/relay-tdd.md:112-141`) — copy the three-branch gate structure; adapt to two branches (P0.a self-skip on empty/absent, P0.b proceed on non-empty); preserve the "Emit verbatim and exit 0" + "Do NOT write any artifact" discipline.
- **VALIDATE**: `grep -n "Test framework inactive (test_frameworks: \[\]). Skipping." plugins/relay/commands/relay-test.md`

### Task 2: VERIFY the Phase 0 gate is positioned correctly relative to Parse arguments and Preconditions check

- **ACTION**: After the Task 1 edit, read `plugins/relay/commands/relay-test.md` and confirm the section order is: (1) frontmatter + title + mission + Decision Gate, (2) `## Parse arguments`, (3) **`## Phase 0 — methodology.md self-skip gate`** (NEW), (4) `## Preconditions check` (unchanged), (5) `## Initialize loop state`, (6) `## The B4 loop`. The gate must fire after argument parsing (so `<worktree-path>` is available for the methodology.md read) but before preconditions (so the `.claude/settings.json` check never fires for framework-less projects).

  *(structural gate — verifies AC-A1 precondition: Phase 0 fires after arg parse and before preconditions check)*
- **MIRROR**: Pattern 2 (`plugins/relay/commands/relay-execute.md:353-361`) — the gate's position in the precondition chain mirrors A.3.5.0's position above A.3.5.1: read the key first, branch before doing any further work.
- **VALIDATE**: `grep -n "## " plugins/relay/commands/relay-test.md`

### Task 3: UPDATE Graceful degradation summary table — replace `FAILED_INFRA_UNRECOVERABLE` row for "Worktree has no test framework"

- **ACTION**: Using `Edit`, locate the "Worktree has no test framework" row in the Graceful degradation summary table (currently at approximately line 233 of `plugins/relay/commands/relay-test.md`). Replace it with: `| Worktree has no test framework (`test_frameworks: []` or `methodology.md` absent) | `skipped_no_test_framework` (Phase 0 self-skip, exit 0) | Phase 0 gate fires before preconditions; verbatim line emitted; no artifacts written |`. This change is the only table modification; all other rows remain unchanged.

  *(satisfies AC-A5, AC-A6)*
- **MIRROR**: Pattern 3 (`plugins/relay/commands/relay-test.md:229-239`) — preserve the existing table format (three columns: Scenario, Outcome code, What happens); replace only the "Worktree has no test framework" row.
- **VALIDATE**: `grep -n "skipped_no_test_framework" plugins/relay/commands/relay-test.md`

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Verify the file is valid Markdown (no broken fence blocks, no unclosed sections)
# Check frontmatter is intact
head -5 plugins/relay/commands/relay-test.md

# Confirm the file still has its description frontmatter field
grep -c "^description:" plugins/relay/commands/relay-test.md
```

### Level 2 CONTENT_INVARIANTS

```bash
# AC-1 / AC-7: verbatim line present
grep -n "Test framework inactive (test_frameworks: \[\]). Skipping." plugins/relay/commands/relay-test.md

# AC-7: symmetric shape check — both commands have the <Subject> inactive (<key>: <value>). Skipping. pattern
grep "inactive.*Skipping\." plugins/relay/commands/relay-tdd.md plugins/relay/commands/relay-test.md

# AC-3: strict halt path preserved — FAILED_INFRA_UNRECOVERABLE still present for genuine infra failures
grep -n "FAILED_INFRA_UNRECOVERABLE" plugins/relay/commands/relay-test.md

# Phase 0 gate is present and positioned before Preconditions check
grep -n "## Phase 0" plugins/relay/commands/relay-test.md
grep -n "## Preconditions check" plugins/relay/commands/relay-test.md

# Graceful degradation table updated — old FAILED_INFRA_UNRECOVERABLE entry for no-framework scenario is gone
# (the FAILED_INFRA_UNRECOVERABLE grep above should show it only in the ABORT_INFRA loop section, not in the table)
grep -n "FAILED_INFRA_UNRECOVERABLE" plugins/relay/commands/relay-test.md

# New outcome code present in table
grep -n "skipped_no_test_framework" plugins/relay/commands/relay-test.md
```

### Level 3 DRY-RUN END-TO-END

```bash
# Structural section-order check: Phase 0 comes before Preconditions check
python3 -c "
import re, sys
content = open('plugins/relay/commands/relay-test.md').read()
p0_pos = content.find('## Phase 0')
prec_pos = content.find('## Preconditions check')
if p0_pos == -1: sys.exit('FAIL: Phase 0 section not found')
if prec_pos == -1: sys.exit('FAIL: Preconditions check section not found')
if p0_pos >= prec_pos: sys.exit(f'FAIL: Phase 0 (pos {p0_pos}) is not before Preconditions check (pos {prec_pos})')
print(f'PASS: Phase 0 at pos {p0_pos} < Preconditions check at pos {prec_pos}')
"

# Confirm no artifact write instructions in the Phase 0 section
python3 -c "
content = open('plugins/relay/commands/relay-test.md').read()
# Extract Phase 0 section (between ## Phase 0 and ## Preconditions check)
start = content.find('## Phase 0')
end = content.find('## Preconditions check')
section = content[start:end]
if 'run.json' in section or 'PRPs/reports' in section:
    raise SystemExit('FAIL: Phase 0 section references artifact writes — should not write artifacts on self-skip')
print('PASS: Phase 0 section contains no artifact write references')
"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given `docs/context/methodology.md` exists with `test_frameworks: []` at the worktree root, when `/relay-test <worktree-path>` is invoked, then `plugins/relay/commands/relay-test.md` Phase 0 gate emits the verbatim line `Test framework inactive (test_frameworks: []). Skipping.`, instructs exit 0, and explicitly states no `run.json` or per-attempt artifact is written.
- **AC-A2 (PRD AC-2):** Given `docs/context/methodology.md` does not exist at the worktree root (file absent), when `/relay-test <worktree-path>` is invoked, then Phase 0 gate emits the same verbatim line as AC-A1, instructs exit 0, and writes no artifacts — the absent-file branch is explicitly documented in the Phase 0 section.
- **AC-A3 (PRD AC-3):** Given `docs/context/methodology.md` declares `test_frameworks: ["pytest"]` (non-empty), when `/relay-test <worktree-path>` is invoked, the Phase 0 gate does NOT fire; execution falls through to the existing Preconditions check (P1–P5) unchanged. The `FAILED_INFRA_UNRECOVERABLE` halt for missing `.claude/settings.json` is preserved.
- **AC-A4 (PRD AC-7):** The new verbatim line `Test framework inactive (test_frameworks: []). Skipping.` matches the shape `<Subject> inactive (<key>: <value>). Skipping.` symmetric to `/relay-tdd`'s `TDD track inactive (tdd: false). Skipping.`; both are discoverable via `grep "inactive.*Skipping\." plugins/relay/commands/relay-t*.md`.
- **AC-A5 (PRD AC-1, AC-2):** The Graceful degradation summary table in `plugins/relay/commands/relay-test.md` reflects the new outcome: the "Worktree has no test framework" row shows outcome `skipped_no_test_framework` (exit 0), not `FAILED_INFRA_UNRECOVERABLE`.
- **AC-A6 (PRD AC-3):** `grep -n "FAILED_INFRA_UNRECOVERABLE" plugins/relay/commands/relay-test.md` returns lines only from the ABORT_INFRA loop dispatch section (genuine infra failure handling) — not from the Graceful degradation table's framework-absence row.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phase 0 gate reads `<worktree-path>/docs/context/methodology.md` but `<worktree-path>` arg parsing has not resolved the path yet (ordering bug) | Low | High — gate would read the wrong directory's methodology.md | Task 2 explicitly verifies section order: Parse arguments must precede Phase 0 gate; the worktree-path arg must be resolved before Phase 0 executes |
| Self-skip gate accidentally fires for a project that HAS a non-empty `test_frameworks` due to a YAML parse edge case (e.g., `test_frameworks: [pytest]` vs `test_frameworks: ["pytest"]`) | Low | Medium — real test suite skipped | Gate condition is explicit: fire only on `[]` (literal empty list) or file-absent; any non-empty list value (regardless of quoting style) falls through. AC-A3 tests this boundary. |
| `test-runner.md` agent still emits `no_test_framework` ABORT_INFRA after the command-level gate is in place — creating dead code | Medium | Low (non-blocking) | PRD open question captures this as a Could-item. The branch becomes defensive (never reached for framework-less projects). No regression risk since the gate fires upstream. |
| Graceful degradation table row edit introduces whitespace drift that breaks table rendering | Low | Low | Edit uses a narrow `old_string` matching the exact current row; table structure validated by Level 2 grep |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Verbatim-line discipline:** The exact string `Test framework inactive (test_frameworks: []). Skipping.` must appear byte-for-byte in `plugins/relay/commands/relay-test.md`. Any deviation (e.g., `test_frameworks:[]` without space, or trailing period missing) breaks AC-7 and the grep-friendly cross-command discovery pattern. The implementer must not paraphrase.

**Two-branch vs three-branch gate:** `/relay-tdd`'s P4 has three branches (P4.a self-skip, P4.b hard-abort on `tdd: true` + empty `test_frameworks`, P4.c proceed). `/relay-test`'s Phase 0 has only two branches: self-skip on `test_frameworks: []`/file-absent, and proceed on non-empty `test_frameworks`. There is no equivalent of P4.b here because `test_frameworks: []` is itself the self-skip trigger — there is no "declared but empty" inconsistency to hard-abort on. The implementer must not mechanically copy all three branches from P4.

**Phase 0 position (after arg parse, before preconditions):** The gate must fire after `## Parse arguments` so that `<worktree-path>` is resolved, and before `## Preconditions check` so that the `.claude/settings.json` check never fires for framework-less projects. Task 2's section-order verification is mandatory, not optional.

**Graceful degradation table update is load-bearing for Phase 4:** Phase 4 (docs site update) will sync `documentation/commands.html` from the updated table. The table row must use the canonical outcome code `skipped_no_test_framework` (not a variant) so Phase 4's grep-and-update is unambiguous.

*Generated: 2026-05-12*
*Approved: 2026-05-12*
*Implemented: 2026-05-12*
*Status: IMPLEMENTED*
