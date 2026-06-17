---
description: Autonomous TDD initial-suite generation from an APPROVED plan + its source APPROVED PRD. Reads the target's `docs/context/methodology.md` and self-skips silently when `tdd: false` or the file is missing; hard-aborts when `tdd: true` AND `test_frameworks: []`. Otherwise dispatches the `tdd-writer` agent (B7) which walks every PRD AC-N and emits per-AC outcomes (`NEW_TEST_REQUIRED` writes a test, `EXISTING_TEST_COVERS` documents the mapping, `AMBIGUOUS` aborts). Reviewer adoption is OUT of scope — the separate `/relay-tdd-review` command owns the DRAFT→APPROVED flip on the suite manifest.
argument-hint: <plan-path>
---

# /relay-tdd

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the plan path argument, run the preconditions check
(including the `methodology.md` self-skip / hard-abort gate),
then adopt the `tdd-writer` role to generate a DRAFT initial test
suite for the phase the plan describes. Reviewer dispatch is OUT
of scope — that is the `/relay-tdd-review` command (Phase 1
sibling artifact, ships in the same release).

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/tdd-writer-reviewer.prd.md` —
  this feature's PRD; AC-1 through AC-13, scope, rationale.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/tdd-writer.md` — the
  Writer protocol you adopt in Phase A.
- `docs/context/methodology.md` (in the target project) — the
  single source of truth for `tdd:` and `test_frameworks: [...]`.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command
creates a cross-cutting artifact (a test suite that the
Implementer must satisfy and that the Test Runner exercises);
the gate is active. Consult `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md` in
the target project — these are also the three files the Writer
consults when scoping its work.

---

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat
the argument as the plan path; resolve it as absolute, or as
relative to the current working directory. If the argument is
blank/whitespace, HALT with:

> /relay-tdd requires a plan path. Usage:
>   /relay-tdd PRPs/plans/<feature>-phase-<N>-<slug>.plan.md
> Example:
>   /relay-tdd PRPs/plans/feat-x-phase-1-foundation.plan.md

If the argument is non-empty but does not resolve to an existing
readable file, fall through to P1 below.

Record `plan_path` as the resolved absolute path. Record
`target_root` as the current working directory (the repository
from which the user invoked the command).

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any
of these fail.

### P1 — Plan path resolves to a readable file

If `plan_path` does not point at an existing readable file:

> I cannot start TDD suite authoring without `<plan_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-tdd PRPs/plans/<feature>-phase-<N>-<slug>.plan.md

### P2 — Plan ends with `*Status: APPROVED*`

`Read` the plan. Inspect its trailing status line (the last
non-empty line of the file).

- If it equals `*Status: APPROVED*` → proceed.
- If it equals `*Status: DRAFT*` (or any other non-APPROVED
  status, or has no status line):

  HALT with:

  > The plan at `<plan_path>` is not APPROVED (current status:
  > `<status>`). /relay-tdd only operates on APPROVED plans.
  > Run /relay-plan-review to bring the plan to APPROVED first,
  > or manually flip its trailing `*Status:*` line if the rubric
  > was already validated by hand.

Trim trailing whitespace and newlines before comparison.

### P3 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with:

> I cannot dispatch the tdd-writer without `<missing-file>`.
> The Decision Gate consultation requires all three mandatory
> sources. Run the `context-builder` skill (`*init` or `*update`
> mode) to generate the missing governance files, then re-run
> /relay-tdd.

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

---

## Phase A — Adopt the Writer role

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/tdd-writer.md`.

Execution context to pass into the Writer's Phase 0 setup:

- `plan_path`: the resolved absolute path verified by P1–P4.
- `target_root`: the cwd.

Run Phases 0 through 3 as specified by `tdd-writer.md`. The
Writer reads the plan + the source PRD, classifies each AC, and
either:

- Writes new test files + a `tdd-initial-suite.diff` manifest
  with aggregate verdict `SUITE_DRAFT_WRITTEN`, OR
- Writes only the `tdd-initial-suite.diff` manifest with
  aggregate verdict `EXISTING_COVERAGE_SUFFICIENT`, OR
- Halts with a structured `AMBIGUOUS` message naming the ACs
  that need tightening.

The Writer's Phase 3.2 confirmation (`DRAFT TDD suite written
to ...`) is the terminal signal. Surface it verbatim to the user
and exit.

**There is no Phase B.** Reviewer adoption is the
`/relay-tdd-review` command's job. This command is single-role by
design — the writer/reviewer split is the canonical post-PRD
command-surface decision (`docs/decisions.md` 2026-04-19 row).

### If the Writer halts

Possible Writer halt conditions (all specified in
`tdd-writer.md`):

- **Unexpected invocation** (P0 detected `tdd: false` or empty
  `test_frameworks` despite this command's P4 passing) — should
  not happen; surface the halt verbatim and treat as a bug.
- **AMBIGUOUS ACs** (Writer's Phase 3 verdict halt) — surface the
  structured halt message verbatim and exit. The user must
  tighten the PRD ACs before re-running.

In all halt cases, do NOT invoke `/relay-tdd-review`. The user
(or orchestrator) decides next steps.

---

## Final output surface

On success, the last user-facing message is `tdd-writer`'s Phase
3.2 confirmation:

> DRAFT TDD suite written to PRPs/reports/<feature>/tdd-initial-suite.diff.
> Aggregate verdict: <SUITE_DRAFT_WRITTEN | EXISTING_COVERAGE_SUFFICIENT>.
> Test files written: <count> (paths in the .diff manifest).
> Run /relay:relay-tdd-review PRPs/reports/<feature>/tdd-initial-suite.diff to validate.

Surface it verbatim. Do not append anything.

On halt or self-skip exit, the user-facing message is the
P4 / Writer halt message verbatim and the command exits without
writing the suite manifest. The `/relay-tdd-review` command is
NOT invoked in any halt case.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Test files go to the
  framework-natural test root in the target project. The suite
  manifest goes to `PRPs/reports/<feature>/tdd-initial-suite.diff`.
  Nothing under `.claude/`.
- **Never adopt the Reviewer role.** Reviewer is
  `/relay-tdd-review` (separate command). This command file MUST
  NOT contain a Phase B section, and MUST NOT invoke
  `tdd-reviewer` via `Task` or otherwise.
- **Never prompt the user.** Past the interactivity boundary
  (`docs/context/architecture.md` §Interactivity boundary). HALTs
  are surfaced verbatim and the command exits.
- **Never overwrite an existing suite manifest.** The Writer
  scans for the path; collision handling is the Writer's
  responsibility — but in MVP, one phase = one suite manifest, so
  re-running on the same APPROVED plan is the user's choice.
- **Never invoke the Writer when a precondition failed.** HALT
  before adopting the Writer role.
- **Never skip the Decision Gate evidence block.** The
  command-level gate (above) is mandatory.
- **Never re-run the Writer on `CHANGES_REQUESTED` from a later
  `/relay-tdd-review`.** That is the orchestrator's call
  (`/relay-execute`'s `max_tdd_review_retries=2` budget). A
  single `/relay-tdd` invocation produces zero or one DRAFT suite;
  it never loops.
- **Never activate by heuristic.** The only signal is `tdd: true`
  in `methodology.md`. Existence of test folders, CI jobs, high
  coverage, etc., MUST NOT activate this command.

---

## What you do NOT do

- **Reviewing the suite** — `/relay-tdd-review` owns the rubric
  run + DRAFT→APPROVED flip + JSONL append.
- **Writing production code** — that is `/relay-implement`. The
  R-X-strict invariant of `code-reviewer` (D17 of
  `implementation-authoring.prd.md`) is preserved by this
  command's symmetric inverse: B7 only writes tests.
- **Modifying existing test files** — Writer aborts (`AMBIGUOUS`)
  when an AC requires modifying an existing test.
- **Bundling writer + reviewer** — bound by the 2026-04-19
  command-surface decision; the PRD stage's bundled `/relay-prd`
  is the documented exception, not the rule.
- **Reopening an APPROVED suite** — out of scope. Manual hand-edit
  of the suite manifest's trailing `*Status:*` line back to
  `DRAFT` is the documented escape hatch.
- **Targeting a specific AC via `--ac <N>`** — Could-item;
  deferred. The Writer walks every in-scope AC deterministically.
- **Cross-plan TDD authoring** — the command operates on exactly
  one plan per invocation. Multi-plan coordination is the
  orchestrator's job.
- **Activation by heuristic from a project's test folder
  structure** — explicit anti-pattern (`docs/anti-patterns.md`
  lines 43-48). Only `tdd: true` activates.
