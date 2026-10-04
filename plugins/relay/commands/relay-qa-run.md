---
description: 'Standalone, non-interactive runner for an existing QA report. Translates each case''s manual steps into a closed plan only where they map onto the HTTP and browser drivers, then hands execution to the runner script, which gives every case exactly one of pass, fail, blocked or needs-human and writes redacted evidence only under PRPs/reports/<feature>/qa-run/<run-id>/. Never edits the report. A pass is evidence, not approval: the human validation gate stays open. Never invoked by /relay-execute.'
argument-hint: '<feature | path-to-qa-report.md> [--env-handle <path>]'
---

# /relay-qa-run

**Arguments:** `$ARGUMENTS`

---

## Your mission

Execute what is locally executable in an existing QA report and hand the human
redacted evidence per case. You do one piece of judgment: reading each case's
manual steps and, only where they map onto the closed vocabulary below, writing a
plan entry for that case. The runner script does everything that must be
deterministic and auditable: it parses the report itself, validates your plan
against it, runs the local-only guard, obtains sessions from the kit's login
scripts, redacts evidence in memory, stamps real UTC instants and enforces one
entry per case.

**A runner pass is evidence, not approval.** This command never edits the QA
report, never flips a Manual status and never advances a phase status. The human
validation gate stays open. It never asks the user a question.

See:
- `${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs` — the runner script (`parse`, `init`, `run`) this command calls.
- `${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs` — the local-only guard the runner script calls, never reimplemented.
- `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` — the redaction rules the runner applies in code before any evidence is written.
- `/relay-qa-report` — the command that produces the report this command consumes.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command creates new
artifacts, handles session-adjacent secrets and enforces a permanent hard
constraint, so the gate is active. Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: execution of a QA report's cases; secret handling (sessions read, evidence written); the local-only hard constraint
- Decisions found:
  - {decision 1 — e.g. the runner is part of the registered test-auth kit capability (2026-09-25)}
  - {decision 2 — e.g. PRP artifacts live under PRPs/, never .claude/}
  - {decision 3 — e.g. the environment handle has no registered path, so it is read only from an explicit --env-handle file}
- Applicable anti-patterns:
  - Emitting secret values in run reports or logs — evidence is redacted in memory before any write
  - Relying on interactive permission prompts in the autonomous loop — this command is standalone
- Applicable architectural rules:
  - Command versus agent separation — this command owns the plan and the preconditions; the script owns every deterministic mutation
  - Graceful degradation, except the local-only guard, which is a hard failure by design
- Result: PROCEED | HALT (reason)
```

---

## Parse arguments

`$ARGUMENTS` must carry exactly one of:

- a bare `<feature>` slug matching `^[a-z0-9][a-z0-9-]*$`; or
- a path ending in `/qa-report.md`, whose parent directory name is the feature.

and may carry:

- `--env-handle <path>` — optional; an explicit JSON file with a single `baseUrl`
  key, read by the script. No path is discovered and no default exists. Without
  it the script falls back to the project's own `PRPs/auth/login.config.json`.

A blank argument or anything else HALTs:

> Usage: `/relay-qa-run <feature | path-to-qa-report.md> [--env-handle <path>]`
> Example: `/relay-qa-run my-feature`
> Unrecognized or missing argument. Nothing has been read or written.

No feature is ever inferred from the branch. Record `target_root` as the current
working directory.

---

## Preconditions

Run in this order. HALT with a clear, actionable message on any failure; nothing
is written before P3 passes.

### P1 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the byte-exact pattern shared by every relay
command:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-qa-run.
> No run has been started.

### P2 — The report exists

`PRPs/reports/<feature>/qa-report.md` must exist. Otherwise HALT:

> FAILED_QA_REPORT_MISSING: `PRPs/reports/<feature>/qa-report.md` does not exist.
> Produce it with `/relay-qa-report` first. Nothing has been written.

### P3 — Local-only guard and run directory

Run, from a fenced bash block, exactly this line:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" init --root "<target_root>" --feature "<feature>"
```

When the argument was given, append ` --env-handle "<path>"` to that line verbatim.
The script's first action is the guard (`${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs`),
so a refused target prints `FAILED_NON_LOCAL_TARGET` before anything is created.

On any non-zero exit, HALT:

> FAILED_NON_LOCAL_TARGET: the guard refused the target. Script stderr:
> `<stderr>`. The guard is a hard failure, never a warning. Nothing has been
> written and nothing has been requested.

When stderr names a different `FAILED_*` code, relay that code and its message in
place of the first word instead. On success, record `RUN_DIR` from stdout.

---

## Phase A — Parse and plan

Run, from a fenced bash block, exactly this line:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" parse --report "<report>"
```

where `<report>` is `<target_root>/PRPs/reports/<feature>/qa-report.md`. The script
returns every case with its index, title and manual steps verbatim; the case list
is never yours to author.

For each returned case, decide from the case's manual steps alone whether they map
onto the closed vocabulary below. Write ONLY the cases that do, with the `Write`
tool, into `<RUN_DIR>/plan.json`:

```json
{ "schema_version": 1, "cases": [ { "index": 1, "title": "<copied exactly>", "driver": "http", "role": null, "state": "none", "steps": [] } ] }
```

The closed vocabulary:

- `http` steps: `request {method, path, body?, expect_status?, expect_body_contains?, expect_json?: {path, equals}}`
- `browser` steps: `goto {path}`, `click {selector}`, `fill {selector, value}`, `expect_visible {selector}`, `expect_text {selector, contains}`, `expect_url {path}`

`role` is a role slug declared in `PRPs/auth/login.config.json`, or null. `state`
is `none` only when the report's required state is none, `role-only` only when the
required state is nothing but a logged-in user of that role, and otherwise
`declared` (the script then looks the exact required-state text up in the tracked
`PRPs/auth/qa-seed.json`).

Honesty rules:

- Omit any case that needs an email inbox, SMS, a physical device, a third-party
  payment, a subjective visual judgment, a CLI, a database query or any action
  outside the vocabulary. The script records it `needs-human` with the steps
  verbatim.
- Never invent a selector, path, credential or expected value the steps do not
  state.
- Every planned case must carry at least one expectation.
- Never put a credential or token value in `plan.json`.
- Never infer a driver the steps do not need.

### Record resolution (done by the script, not by you)

Before it routes a case, the script checks every case whose coverage is
`automated` against the Test Runner's schema-v1 record, found by the discovery
rule of `/relay-qa-report` (the top-level `PRPs/reports/<feature>/record.json`,
else the latest `attempts/<N>/record.json`). You write no plan entry for this and
a plan entry for such a case is ignored once it resolves.

- The outcome comes from the JUnit testcases of each cited test file in the
  record's artifact: every cited file listed and none failed gives `pass`, any
  failed testcase gives `fail`, and any cited file the artifact does not list
  means the case is not resolved.
- The reason_code is `AUTOMATED_EVIDENCE`. It is a reason_code, never an outcome:
  the vocabulary stays `pass`, `fail`, `blocked`, `needs-human`.
- A record outside schema v1 is never evidence, and the case routes as before. So
  is a record whose run executed nothing (`SKIPPED_UPSTREAM_FAILURE` or zero
  tests), a JUnit artifact written after the record, and a cited path that
  matches more than one distinct file.
- The evidence names the record's run id, attempt and `generated_at`, so a reader
  can see whether the run predates the code.
- `results.json` reports these cases through a separate `record_resolved` count.
  `counts` stays the four-outcome partition and therefore still contains them, so
  the summary line and the driver-executed rate exclude `AUTOMATED_EVIDENCE`
  outcomes and `record_resolved` is reported beside them, never added to them.

---

## Phase B — Run

Run, from a fenced bash block, exactly this line:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" run --root "<target_root>" --feature "<feature>" --run-dir "<run-dir>"
```

where `<run-dir>` is the `RUN_DIR` recorded in P3. When the argument was given,
append ` --env-handle "<path>"` to that line verbatim. Exit 0 means every case has
an outcome; exit 1 is an aborted run or a named halt (results are still written
for an aborted run).

---

## Final output surface

Relay the script's summary: the four driver-executed counts, the separate
`record-resolved` line, the `results.json` path and the evidence directory. List every `blocked` and `needs-human` case by its
`reason_code`. Then state explicitly:

> HUMAN GATE STILL OPEN: a runner pass is evidence, not approval.

Name the file the human reviews, `PRPs/reports/<feature>/qa-report.md`, and state
that no Manual status and no phase status was changed. On halt, explain the reason
and state what was and was not written.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Artifacts live under `PRPs/`.
- **Never invoked by `/relay-execute`.** Standalone, human-triggered.
- **The command itself writes only `<RUN_DIR>/plan.json`.** The script writes
  everything else, and only inside the run directory. The one carve-out is
  outside the runner process: the kit's own login script, when the runner calls it
  for a role session, writes only under `PRPs/auth/.sessions/`, and a seed command
  declared in `PRPs/auth/qa-seed.json` writes to whatever store the project
  declared.
- **Never edit `qa-report.md` or any Manual status.**
- **Never run a command taken from the report or its steps.** Seed commands come
  only from `PRPs/auth/qa-seed.json`, and sessions only from the kit's login scripts.
- **No credential value enters the conversation or any file this command writes.**
- **Never `Task`-dispatch anything.**
- **Never ask the user a question.**
- **Use the `Write` tool** (heredocs through Bash do not work in this environment).
- **Nothing is written before P3 passes.**

---

## What you do NOT do

- **Log in yourself.** Sessions come from the kit's login scripts, called by the script.
- **Create users or seed data yourself.**
- **Interpret steps outside the closed vocabulary.**
- **Mark a case passed that was not executed.**
- **Advance any status.**
