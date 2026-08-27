---
description: "Autonomous test-suite authoring from an APPROVED plan + its source APPROVED PRD. Reads the target's `docs/context/methodology.md`; the single activation gate is a declared test framework — self-skips silently when `test_frameworks: []` or the file is missing (no idiom to author in), regardless of `tdd:`. When a framework is declared it runs in BOTH methodology modes: `tdd: true` = test-first (before the Implementer), `tdd: false` = test-after (after the Implementer + Code Review); the `tdd:` value only selects ordering. Dispatches the `test-writer` agent which walks every in-scope PRD AC-N and emits per-AC outcomes (`NEW_TEST_REQUIRED` writes a test, `EXISTING_TEST_COVERS` documents the mapping, `EXISTING_TEST_UPDATED`/`OBSOLETE_TEST_REMOVED`/`REDUNDANT_TEST_REMOVED` record lifecycle ops, `AMBIGUOUS` aborts). Reviewer adoption is OUT of scope — the separate `/relay-test-write-review` command owns the DRAFT→APPROVED flip on the suite manifest."
argument-hint: <plan-path>
---

# /relay-write-test

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the plan path argument, run the preconditions check
(including the `methodology.md` activation gate — a declared test
framework — plus the `tdd:`-derived ordering mode),
then adopt the `test-writer` role to generate a DRAFT test
suite for the phase the plan describes. Reviewer dispatch is OUT
of scope — that is the `/relay-test-write-review` command (Phase 1
sibling artifact, ships in the same release).

See:
- the source PRD `tdd-writer-reviewer.prd.md`, in the relay plugin repo
  (not packaged) — this feature's PRD; AC-1 through AC-13, scope, rationale.
- `${CLAUDE_PLUGIN_ROOT}/agents/test-writer.md` — the
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

> /relay-write-test requires a plan path. Usage:
>   /relay-write-test PRPs/plans/<feature>-phase-<N>-<slug>.plan.md
> Example:
>   /relay-write-test PRPs/plans/feat-x-phase-1-foundation.plan.md

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
> Usage: /relay-write-test PRPs/plans/<feature>-phase-<N>-<slug>.plan.md

### P2 — Plan ends with `*Status: APPROVED*`

`Read` the plan. Inspect its trailing status line (the last
non-empty line of the file).

- If it equals `*Status: APPROVED*` → proceed.
- If it equals `*Status: DRAFT*` (or any other non-APPROVED
  status, or has no status line):

  HALT with:

  > The plan at `<plan_path>` is not APPROVED (current status:
  > `<status>`). /relay-write-test only operates on APPROVED plans.
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

> I cannot dispatch the test-writer without `<missing-file>`.
> The Decision Gate consultation requires all three mandatory
> sources. Run the `context-builder` skill (`*init` or `*update`
> mode) to generate the missing governance files, then re-run
> /relay-write-test.

### P4 — methodology.md gate (activation = declared framework; `tdd:` selects ordering)

Read `<target_root>/docs/context/methodology.md`. The single activation gate is
whether a test framework is declared; the `tdd:` value only selects *when* the
pair runs (test-first vs test-after), never *whether* it runs. Two branches:

#### P4.a — self-skip (no framework to author in)

If the file is missing OR its frontmatter `test_frameworks` is missing or empty
(`[]`):

Emit verbatim and exit 0:

> Test authoring inactive (no test_frameworks declared). Skipping.

Do NOT dispatch the Writer. Do NOT write any artifact. This is the SOLE
self-skip of this gate: with no declared framework there is no idiom to author
tests in, so the pair skips regardless of the `tdd:` value — observably
identical to the pre-universalization empty-frameworks / `tdd: false` skip.

#### P4.b — proceed + derive ordering mode

If `test_frameworks` is non-empty, record the ordering `mode` from `tdd:` and
proceed to P5:

- `tdd: true` → `mode = test-first` (the pair runs BEFORE the Implementer; the
  suite must be RED pre-implementation).
- `tdd: false`, or `tdd:` absent/unset → `mode = test-after` (the pair runs
  AFTER the Implementer + Code Review; the suite must be GREEN against the
  implemented code).

The Writer (`test-writer.md` mode-awareness) and Reviewer (`test-reviewer.md`
RED↔GREEN + `R-LIFECYCLE-LEGITIMATE`) consume `mode`; this command only routes
it. WHERE the stage sits relative to the Implementer is the orchestrator's
concern (`/relay-execute`), not this command's.

### P5 — plan phase_type gate (foundation self-skip — test-first only)

`Read` the plan's `## Metadata` table and inspect the `phase_type`
row (populated by the plan-writer, or by the plan-reviewer's Phase 0
pre-pass).

**Test-after (`mode = test-after`) — no foundation skip.** In test-after the
Implementer has already materialized the seam (entities, repositories,
resolvers, schema/migrations) before the pair runs, so the types and methods a
test references already exist. Proceed to Phase A regardless of `phase_type`.

**Test-first (`mode = test-first`) AND `phase_type: foundation`:**

Emit verbatim and exit 0:

> Foundation phase (phase_type: foundation) — test-first skipped. A
> foundation phase creates the seam (the entities, repositories,
> resolvers, schema/migrations that later phases depend on); the types
> and methods a test would reference do not exist yet, so authoring a
> test-first suite would either reference non-existent symbols (which
> breaks the whole test source set in a compiled language) or invent
> production signatures (forbidden for the test-first Writer). The implementer
> materializes the seam for this phase; the feature phases that follow run
> fully test-first.

Do NOT dispatch the Writer. Do NOT write any artifact.

If `mode = test-first` and the `phase_type` row is absent, or holds any value
other than `foundation` (`feature`, `scaffold`, `docs`, `refactor`): proceed to
Phase A. (`scaffold` and `docs` phases produce no test suite in
practice — their in-scope AC set is typically empty — but they are not
force-skipped here; the Writer's Phase 1 AC-enumeration naturally
yields `EXISTING_COVERAGE_SUFFICIENT` or an empty in-scope set for
them. Only `foundation` is a hard self-skip in test-first, because its ACs are
precise yet not test-first-authorable until the seam exists.)

---

## Phase A — Adopt the Writer role

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/agents/test-writer.md`.

Execution context to pass into the Writer's Phase 0 setup:

- `plan_path`: the resolved absolute path verified by P1–P4.
- `target_root`: the cwd.
- `prior_feedback`: the reviewer defect list from a prior
  `CHANGES_REQUESTED` verdict, in the canonical
  `list<{rubric_id, reason}>` shape (the same shape
  `relay-implement.md` already threads into the implementer).
  Forward it verbatim when the caller supplies one; `null`
  otherwise. `/relay-execute` populates this from the captured
  `test-reviewer` defect list when it re-adopts `/relay-write-test`
  inside its `max_tdd_review_retries` budget — before this input
  existed the value was computed upstream and silently dropped
  here, so a rejected suite was re-authored blind.

Run Phases 0 through 3 as specified by `test-writer.md`. The
Writer reads the plan + the source PRD, classifies each AC, and
either:

- Writes new test files + a `test-suite.diff` manifest
  with aggregate verdict `SUITE_DRAFT_WRITTEN`, OR
- Writes only the `test-suite.diff` manifest with
  aggregate verdict `EXISTING_COVERAGE_SUFFICIENT`, OR
- Halts with a structured `AMBIGUOUS` message naming the ACs
  that need tightening.

The Writer's Phase 3.2 confirmation (`DRAFT TDD suite written
to ...`) is the terminal signal. Surface it verbatim to the user
and exit.

## Phase A.4 — Command-layer formatting (Prevention)

This step runs only when the Writer's Phase 3.2 confirmation
reports `SUITE_DRAFT_WRITTEN` or `EXISTING_COVERAGE_SUFFICIENT` —
never on an `AMBIGUOUS` halt.

### A.4.1 — Collect the suite's touched test-file paths

Read the just-written `test-suite.diff` manifest. The touched-file
set = every path under "## Test files written this session" UNION
every UPDATE-classified lifecycle-ledger row's file component.
DELETE rows name a file that no longer exists, so they are
excluded; `EXISTING_TEST_COVERS` mappings are excluded — that file
was not touched this session.

If the touched-file set is empty, skip straight to A.4.4 and
record: "no test files touched this session — formatter not
invoked (nothing to format)".

### A.4.2 — Deterministic formatter discovery chain

Three branches, tried in order — never heuristic:

- (a) Read `<target_root>/docs/context/methodology.md` frontmatter
  and extract `formatter_cmd`. If present, non-null, non-empty:
  `formatter_cmd = <value>`, `discovery_source = "methodology.md
  formatter_cmd"`. Proceed to A.4.3.
- (b) Else read `<target_root>/package.json`. If `scripts.format`
  is a non-empty string: `formatter_cmd = "npm run format --"`
  (npm's documented `--` pass-through convention routes appended
  file-path arguments into the underlying script),
  `discovery_source = "package.json scripts.format"`. Proceed to
  A.4.3.
- (c) Else `formatter_cmd = null`, `discovery_source = "none — no
  formatter_cmd in methodology.md frontmatter and no package.json
  scripts.format"`. Record this **omission** explicitly at A.4.4 —
  never silently.

### A.4.3 — Invoke, scoped to the touched-file set ONLY

When `formatter_cmd` is non-null, run
`Bash("<formatter_cmd> <touched_file_1> <touched_file_2> ...")` —
the literal touched-file paths from A.4.1 appended as trailing
arguments, never a glob and never the whole repo (PRD Risk R1).
Capture stdout, stderr, and exit code via `BashOutput`.

- Exit code 0 → outcome = "formatted" (best-effort capture of
  which files the tool itself reports changed, falling back to the
  touched-file list if the tool is silent on this).
- Non-zero exit → outcome = "formatter invocation failed"; this is
  recorded but does **not** halt the command.

### A.4.4 — Record the outcome on the suite manifest

`Edit` `<target_root>/PRPs/reports/<feature>/test-suite.diff` with:

- `old_string`: `"\n## Status\n\n*Status: DRAFT*"`
- `new_string`: `"\n## Formatting Outcome\n\n<rendered outcome
  block>\n\n## Status\n\n*Status: DRAFT*"`
- `replace_all`: `false`

`<rendered outcome block>` is one of four shapes:

- **formatted** — command used, discovery source, files touched.
- **formatter invocation failed** — command attempted, discovery
  source, exit code, and a note that the DRAFT suite is still
  surfaced unmodified in outcome.
- **nothing to format** — the A.4.1 empty-set note.
- **omitted** — the A.4.2 branch-(c) discovery-chain-attempted
  note.

If the `Edit` fails (the trailing block text did not match
exactly): this is a **soft-fail** — surface a warning in the
command's own narration (not a HALT), proceed to Final output
surface with `*Status: DRAFT*` intact and the formatting outcome
explicitly noted as unrecorded in that surfaced warning.

**There is no Phase B.** Reviewer adoption is the
`/relay-test-write-review` command's job. This command is single-role by
design — the writer/reviewer split is the canonical post-PRD
command-surface decision (`docs/decisions.md` 2026-04-19 row).

### If the Writer halts

Possible Writer halt conditions (all specified in
`test-writer.md`):

- **Unexpected invocation** (P0 detected empty `test_frameworks`
  despite this command's P4 passing) — should
  not happen; surface the halt verbatim and treat as a bug.
- **AMBIGUOUS ACs** (Writer's Phase 3 verdict halt) — surface the
  structured halt message verbatim and exit. The user must
  tighten the PRD ACs before re-running.

In all halt cases, do NOT invoke `/relay-test-write-review`. The user
(or orchestrator) decides next steps.

---

## Final output surface

On success, the last user-facing message is `test-writer`'s Phase
3.2 confirmation:

> DRAFT TDD suite written to PRPs/reports/<feature>/test-suite.diff.
> Aggregate verdict: <SUITE_DRAFT_WRITTEN | EXISTING_COVERAGE_SUFFICIENT>.
> Test files written: <count> (paths in the .diff manifest).
> Run /relay:relay-test-write-review PRPs/reports/<feature>/test-suite.diff to validate.

Followed by one command-owned line summarizing the Phase A.4
outcome:

> Formatting: <formatted <n> files via <source> | formatter
> invocation failed (exit <code>) — DRAFT suite surfaced unmodified
> | omitted — no formatter discoverable | nothing to format>.

Surface both lines verbatim. Do not append anything else.

On halt or self-skip exit, the user-facing message is the
P4 / P5 / Writer halt message verbatim and the command exits without
writing the suite manifest. The `/relay-test-write-review` command is
NOT invoked in any halt or self-skip case.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Test files go to the
  framework-natural test root in the target project. The suite
  manifest goes to `PRPs/reports/<feature>/test-suite.diff`.
  Nothing under `.claude/`.
- **Never adopt the Reviewer role.** Reviewer is
  `/relay-test-write-review` (separate command). This command file MUST
  NOT contain a Phase B section, and MUST NOT invoke
  `test-reviewer` via `Task` or otherwise.
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
  `/relay-test-write-review`.** That is the orchestrator's call
  (`/relay-execute`'s `max_tdd_review_retries=2` budget). A
  single `/relay-write-test` invocation produces zero or one DRAFT suite;
  it never loops. This is unchanged by the `prior_feedback` input
  above: forwarding a caller-supplied defect list into a single
  Writer adoption is not looping. The command still never decides
  to retry — it only stops discarding the feedback when the
  orchestrator has already decided to.
- **Never activate by heuristic.** The only signal is `tdd: true`
  in `methodology.md`. Existence of test folders, CI jobs, high
  coverage, etc., MUST NOT activate this command.
- **Never invoke the formatter unscoped.** The `Bash` command Phase
  A.4.3 runs is built by appending the explicit touched-file-path
  list from A.4.1; never a bare `formatter_cmd` call, never `.`,
  never a glob.
- **A failing or unconfigured formatter never blocks suite
  authoring.** A.4.3's non-zero-exit branch and A.4.2's omission
  branch both record and continue; the Writer's DRAFT suite is
  always surfaced.

---

## What you do NOT do

- **Never add `Bash` to `test-writer`'s tools allowlist.**
  Prevention ownership is the command layer (this file); the
  agent's allowlist stays `Task, Read, Write, Edit, Glob`
  (DECIDED constraint).

- **Reviewing the suite** — `/relay-test-write-review` owns the rubric
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
- **Authoring a test-first suite for a foundation phase** — P5
  self-skips `phase_type: foundation` phases. The seam (entities,
  repositories, resolvers, schema/migrations) is the implementer's
  to create; test-first resumes on the feature phases that follow.
