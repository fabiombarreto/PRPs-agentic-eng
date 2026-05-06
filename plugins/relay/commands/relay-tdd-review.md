---
description: Autonomous TDD initial-suite validation against the five-pathology rubric (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`) plus the hybrid `R-RED-LEGITIMATE` check. Validates the suite path, runs the preconditions check (including the `methodology.md` self-skip gate symmetric to `/relay-tdd`), then dispatches the `tdd-reviewer` agent (B8) via `Task`. On APPROVED rubric, performs the suite manifest's DRAFT→APPROVED flip via `Edit`. Every verdict appended to `PRPs/plans/<basename>.tdd-review.jsonl` (no short-circuit). Writer dispatch is OUT of scope — the separate `/relay-tdd` command generates the initial suite.
argument-hint: <suite-path>
---

# /relay-tdd-review

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the suite path argument, run the preconditions check
(including the `methodology.md` self-skip gate symmetric to
`/relay-tdd`), then dispatch the `tdd-reviewer` agent (B8) via
`Task` for the rubric pass. On APPROVED, perform the suite
manifest's DRAFT→APPROVED flip via `Edit`. Writer dispatch is OUT
of scope — that is the `/relay-tdd` command (Phase 1 sibling
artifact).

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/tdd-writer-reviewer.prd.md` —
  this feature's PRD; AC-1 through AC-13, scope, rationale.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/tdd-reviewer.md` —
  the Reviewer protocol dispatched in Phase A via `Task`.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-code-review.md`
  — structural template for the heavier reviewer-command shape
  with explicit no-D8-mutation no-op step.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command
validates a cross-cutting artifact (the TDD initial suite that
becomes the contract for the Implementer); the gate is active.
Consult `docs/decisions.md`, `docs/anti-patterns.md`, and
`docs/context/architecture.md` in the target project.

---

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat
the argument as the suite path (the
`tdd-initial-suite.diff` manifest produced by `/relay-tdd`);
resolve it as absolute, or as relative to the current working
directory. If the argument is blank/whitespace, HALT with:

> /relay-tdd-review requires a suite path. Usage:
>   /relay-tdd-review PRPs/reports/<feature>/tdd-initial-suite.diff
> Example:
>   /relay-tdd-review PRPs/reports/feat-x/tdd-initial-suite.diff

If the argument is non-empty but does not resolve to an existing
readable file, fall through to P1 below.

Record `suite_path` as the resolved absolute path. Record
`target_root` as the current working directory.

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any
of these fail.

### P1 — Suite path resolves to a readable file

If `suite_path` does not point at an existing readable file:

> I cannot start TDD review without `<suite_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-tdd-review PRPs/reports/<feature>/tdd-initial-suite.diff

### P2 — Suite ends with `*Status: DRAFT*`

`Read` the suite manifest. Inspect its trailing status line.

- If it equals `*Status: DRAFT*` → proceed.
- If it equals `*Status: APPROVED*` → return verbatim:

  > The suite manifest at `<suite_path>` is already APPROVED.
  > /relay-tdd-review will not re-validate an APPROVED suite.
  > Manual hand-edit of the trailing `*Status:*` line back to
  > DRAFT is the documented escape hatch if a re-review is
  > genuinely needed.

  Exit 0.

- If any other status (or no status line):

  HALT with:

  > The suite manifest at `<suite_path>` does not end with a
  > recognized `*Status:*` line (current trailing line:
  > `<line>`). The manifest may be malformed. Inspect the file
  > and re-run `/relay-tdd` if regeneration is needed.

### P3 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with:

> I cannot dispatch the tdd-reviewer without `<missing-file>`.
> The Decision Gate consultation requires all three mandatory
> sources. Run the `context-builder` skill (`*init` or `*update`
> mode), then re-run /relay-tdd-review.

### P4 — methodology.md self-skip (symmetric to /relay-tdd)

Read `<target_root>/docs/context/methodology.md`. If the file is
missing OR `tdd: false`:

Emit verbatim and exit 0:

> TDD track inactive (tdd: false). Skipping.

This protects against accidentally running the reviewer in a
project that has flipped `tdd: true → false` between the
`/relay-tdd` invocation and this one. The suite manifest is
preserved on disk; the user can flip `tdd: true` again and
re-run, or delete the manifest manually.

If `tdd: true`: proceed to Phase A.

(Note: P4 here does NOT hard-abort on empty `test_frameworks` —
B8's `R-RED-LEGITIMATE` handles missing-framework gracefully via
the `passed: null` degraded outcome per PRD AC-13.)

---

## Phase A — Adopt the Reviewer role

### A.1 — Dispatch the tdd-reviewer agent

Invoke the Reviewer via `Task`:

```
Task(
  subagent_type="tdd-reviewer",
  prompt={
    "suite_path": <resolved absolute suite_path>,
    "target_root": <cwd>
  }
)
```

The agent:
1. Reads the suite manifest, the source PRD, the new test files,
   and the existing-coverage mappings.
2. Walks the six rubric ids
   (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`,
   `R-AC-COVERAGE`, `R-DUPLICATE`, `R-RED-LEGITIMATE`).
3. Appends one JSON line to
   `PRPs/plans/<basename>.tdd-review.jsonl` with the verdict and
   rubric array.
4. Returns the verdict + rubric summary.

### A.2 — Read the just-appended JSONL line

`Read` `<target_root>/PRPs/plans/<basename>.tdd-review.jsonl`. The
last non-empty line is the verdict from A.1. Parse it and
inspect:

- `verdict: "APPROVED"` → proceed to A.3.
- `verdict: "CHANGES_REQUESTED"` → proceed to A.4.

### A.3 — On APPROVED, flip the suite manifest's status

Use `Edit` with:

- `file_path`: `<suite_path>`
- `old_string`: `*Status: DRAFT*`
- `new_string`: `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`
- `replace_all`: `false`

`<YYYY-MM-DD>` is today's date in UTC. The `Edit` is exact-match
character-for-character on the suite's trailing status line.

If `Edit` fails (the trailing line was not exactly `*Status:
DRAFT*` despite P2 passing — possible if a hook mutated the file
between P2 and A.3), surface the failure:

> The suite manifest at `<suite_path>` could not be flipped to
> APPROVED — the trailing `*Status: DRAFT*` line did not match
> exactly. JSONL verdict has been recorded as APPROVED. Manual
> hand-edit of the trailing line is the recovery action.

This is a soft-fail — the rubric verdict is preserved in the
JSONL.

### A.4 — Do NOT perform any orchestrator-level mutation

This step is a no-op by design. Stated explicitly so the
discipline is visible in the command body:

- Do NOT `Edit` the source PRD's Implementation Phases table.
- Do NOT `Bash(mv ...)` the suite manifest to a `completed/`
  directory.
- Do NOT amend `plugins/relay/commands/relay-execute.md`.
- Do NOT re-invoke `/relay-tdd` on `CHANGES_REQUESTED` — the
  orchestrator (`/relay-execute`) owns the retry loop with
  budget `max_tdd_review_retries=2` per PRD AC-9.
- Do NOT mutate `docs/decisions.md`, `documentation/`, or
  `plugin.json` — those belong to Phase 4 of the source PRD's
  implementation plan, not to the reviewer command.

The reviewer command's footprint is: one `Task` dispatch, one
`Read` of the JSONL, one `Edit` (on APPROVED) of the suite
manifest's trailing status line. Nothing else.

---

## Final output surface

### On APPROVED

Emit verbatim:

> ✅ TDD suite **APPROVED** at `<suite_path>`.
> Rubric: all five pathology checks passed; R-RED-LEGITIMATE: <true|null+reason>.
> JSONL: `PRPs/plans/<basename>.tdd-review.jsonl`.
> Ready for `/relay-implement` (the Implementer must satisfy this
> suite as contract).

### On CHANGES_REQUESTED

Surface the agent's structured failing-rubric bullet list
verbatim, then add:

> JSONL: `PRPs/plans/<basename>.tdd-review.jsonl`.
> The orchestrator (`/relay-execute`) decides whether to retry
> `/relay-tdd` with this feedback (budget `max_tdd_review_retries=2`)
> or HALT with `FAILED_TDD_REVIEW_BUDGET_EXCEEDED`.

Exit.

---

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** The JSONL goes to
   `PRPs/plans/`; the suite manifest stays where B7 wrote it
   (`PRPs/reports/<feature>/`); no `.claude/` writes. The
   command's only `Edit` target is the suite manifest's trailing
   status line.
2. **Never bundle writer + reviewer.** The orchestrator dispatches
   `/relay-tdd` then `/relay-tdd-review` in order. This command
   does not invoke `/relay-tdd` or `tdd-writer`. It does not
   modify any test file (the agent itself has no `Edit`, but the
   command also abstains from modifying tests via its own `Edit`
   tool).
3. **Never re-run the Reviewer.** A single `/relay-tdd-review`
   invocation produces exactly one rubric pass and one JSONL
   line. Looping is the orchestrator's job.
4. **Never prompt the user.** Past the interactivity boundary.
   HALTs are surfaced verbatim and the command exits.
5. **Never skip the Decision Gate evidence block.** The
   command-level gate is mandatory.
6. **Never short-circuit the rubric.** The agent records all six
   rubric ids in the JSONL even when an early one fails. Ensures
   the audit log is complete.
7. **Never `Edit` the source PRD's Implementation Phases table or
   the source plan's trailing block.** Those belong to
   `/relay-implement`'s D8 mutations, not to this command.

---

## What you do NOT do

- **Generating test content** — `tdd-writer` (B7) is the only
  author. If the rubric demands a fix, return `CHANGES_REQUESTED`
  and let the orchestrator re-invoke `/relay-tdd`.
- **Re-running the rubric** — single-shot per invocation.
- **Performing D8 mutations** — those belong to
  `/relay-implement` after the Implementer is APPROVED by
  `code-reviewer`. Test-suite review does not flip plan or PRD
  status.
- **Looping with the orchestrator** — no auto-retry; the
  orchestrator manages the loop.
- **Activating in `tdd: false` projects** — symmetric self-skip
  with `/relay-tdd` ensures consistent behavior.
- **Modifying test files** — agent has no `Edit`; command's
  `Edit` is restricted to the suite manifest's status line only.
- **Bypassing the no-D8 invariant** — even if a `CHANGES_REQUESTED`
  → `APPROVED` cycle eventually completes, this command never
  archives the suite or mutates the source PRD's row.
