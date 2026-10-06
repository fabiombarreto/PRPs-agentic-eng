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

Grounding browser steps. For a case whose browser steps name no selector (or whose labels
you cannot trust), run, once per role and route and BEFORE writing the plan entry:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" ground --root "<target_root>" --feature "<feature>" --run-dir "<RUN_DIR>" --route "<route>"
```

Append ` --role "<role>"` when the plan entry names a role and ` --env-handle "<path>"` when
the argument was given. It prints `GROUNDED: <path> entries=<n> withheld=<m>`; `Read` the
written snapshot file under `<RUN_DIR>/grounding/`. It lists role-and-name and visible-text
entries, each with the number of elements it `matches`. A non-zero exit is a named halt (for
example `FAILED_PLAYWRIGHT_UNAVAILABLE`, `SESSION_UNAVAILABLE`, `TARGET_UNREACHABLE`): relay
it, plan no locator step for that route, and leave the case to the script.

The closed vocabulary. Every step is a FLAT JSON object with a string `action`. The
nested form `{ "request": { ... } }` is rejected `PLAN_ENTRY_INVALID`, with a reason
that names the flat shape `{"action": "<name>", ...}`.

One literal `http` step (action `request`):

<!-- qa-step-example driver=http -->
```json
{ "action": "request", "method": "GET", "path": "/api/x", "expect_status": 200 }
```

Optional `http` keys, on the same flat object: `body`, `expect_body_contains`
(a string), and `expect_json` (`{ "path": "<dotted path>", "equals": <value> }`).

One literal `browser` step (action `expect_text`):

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_text", "selector": "h1", "contains": "Dashboard" }
```

The other `browser` actions, each flat: `{ "action": "goto", "path": ... }`,
`{ "action": "click", "selector": ... }`, `{ "action": "fill", "selector": ..., "value": ... }`,
`{ "action": "expect_visible", "selector": ... }` and `{ "action": "expect_url", "path": ... }`.

A literal `browser` step that names its target by role and name instead of a selector:

<!-- qa-step-example driver=browser -->
```json
{ "action": "click", "role": "button", "name": "Save" }
```

A literal `browser` step that names its target by visible text:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_visible", "text": "Welcome back" }
```

The browser actions `click`, `fill`, `expect_visible` and `expect_text` accept, instead of
`selector`, either `role` plus `name` (matched exactly through the accessible role and name)
or `text` (matched exactly against visible text). The forms are mutually exclusive. `role` is
one of `button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `heading`, `tab`,
`menuitem`, `option`, `switch`, `searchbox`, `spinbutton`, `slider`, `dialog`, `alert`,
`status`, `row`, `cell`, `columnheader`, `listitem`, `img`, `navigation`, `region`, `table`,
`menu` or `tabpanel`, and an existing `selector` step is unchanged.

Grounding rules. Write a locator step only for an entry of the snapshot of the step's own
route and role whose `matches` is exactly `1`, copying its `role` and `name` or its `text`
verbatim; the route of a step is the last `goto` or `expect_url` path before it. A step whose
element is not in the snapshot, matches 0 or matches more than one element is not planned:
omit the case, or the case is `needs-human` `STEP_UNGROUNDED` naming the step, before
anything is seeded, authenticated or requested. At run time a locator that matches more than
one element is never acted on and also ends the case `needs-human` `STEP_UNGROUNDED`.
Elements that only appear after an interaction are not in the snapshot and cannot be
grounded. The expectations always come from the report's own steps: an `expect_text`
`contains` must appear in the case's manual steps (otherwise `PLAN_ENTRY_INVALID`), and the
snapshot only supplies how to find an element, never what to expect.

Personal data. The snapshot never stores raw page text; an entry whose text carries a secret
known to the redaction table, an e-mail address or a match of a `regex:` line of
`PRPs/redaction-extensions.txt` is withheld (counted in `withheld`) and cannot be used as a
locator, so an operator whose pages show account names adds a `regex:` line for them to that
file before grounding.

One literal `query` step, a read-only database check:

<!-- qa-step-example driver=http -->
```json
{ "action": "query", "source": "d1-local", "sql": "SELECT status FROM tasks WHERE id = 7", "expect_rows": 1 }
```

A `query` step is valid inside `http` and `browser` entries. It names a source declared
in `query_sources` (never an argv, never a connection string) and supplies `sql`.
`expect_rows` is an exact non-negative row count; `expect_json` is
`{ "path": "<dotted path over the rows array, e.g. 0.status>", "equals": <value> }`; at
least one of the two is required. `{{name}}` may appear in `sql`.

One literal `origin` step, a request to a declared second local origin:

<!-- qa-step-example driver=http -->
```json
{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "expect_status": 200 }
```

An `http` `request` step may carry an optional `origin` naming an `api_origins` entry. The `path` must then be relative (an absolute URL to another origin is refused). Without `origin` the step goes to the target origin, unchanged.

Statement rule: the statement must be one `SELECT` or `WITH ... SELECT`, with no
comment, no second statement and no `PRAGMA`, `ATTACH`, `VACUUM` or write. Anything
else blocks the case `QUERY_NOT_READ_ONLY` before anything is seeded, authenticated or
executed, and a captured value substituted into `sql` is checked again after
substitution.

Variables: `{{name}}` may appear in a path, body, fill value or expectation, and every
reference must be bound by a capture declared for the case's seed. An unbound
reference makes the case `needs-human` with `PLAN_ENTRY_INVALID`, naming the
variable, before anything is seeded, authenticated or requested. A variable is
bound only when the case's `declared` required state has a `captures` entry of that
name in `PRPs/auth/qa-seed.json`: write `{{name}}` only for names read there, never
invent one and never write a value. The value arrives after the seed ran; a capture
path that resolves to nothing, or seed output that is not JSON, blocks the case
`CAPTURE_MISSING` with no step run.

Partial plans: when a report's objective steps are separable from its subjective or
outward-effect ones, the plan entry may carry
`"human_remainder": { "reason": "<why the rest is human>" }`. The objective steps
still need at least one expectation. When every planned step passes, the case is
`needs-human` with `PARTIAL_REMAINDER`, keeps its objective evidence and reproduces
the manual steps verbatim; when an objective step fails, the case is `fail`.
Partially executed cases are counted in `partially_executed`, reported beside
`record_resolved`, and never in the driver-executed rate.

Per-step results: every case a driver executed lists a `steps` array in
`results.json`, one item per step with `index`, `action`, `result` (`passed`,
`failed`, `not-run` or `human`) and `evidence` (a path or null). Cases no driver
executed carry an empty `steps`.

Declaration schema. A `states[<exact required-state text>]` entry in
`PRPs/auth/qa-seed.json` has `command` (an argv array, or `"command": null` when the
project has no command for the state), `status` (`proposed` or `confirmed`; the runner
executes an entry only when `status` is exactly `confirmed`, and an entry with no
`status` key is treated as `proposed`), `evidence` (a `<path>:<line>` citation written
by `/relay-qa-seed`, ignored by the runner), `gap` (why no command exists, used with
`"command": null`), an optional `captures` map
(`{ "<variable>": { "path": "<dotted path into the seed's JSON stdout>", "redact": true } }`,
`redact` optional) and `store` (a URL or `host[:port]`, REQUIRED on every declaration
that can run). Refusals, all `blocked` and all before any command runs:
`STATE_UNCONFIRMED` (a declaration whose `status` is not `confirmed`; nothing runs),
`STATE_COMMAND_MISSING` (`"command": null`, naming the gap; nothing runs) and
`STATE_UNDECLARED`, which means only that no usable declaration exists for the exact
required-state text. `/relay-qa-seed <feature>` proposes entries keyed by the report's
literal text and never writes `confirmed`; only the operator's edit of the tracked file
does. The store is checked by the local-only guard before the seed runs; a
non-local or unreadable store blocks the case `FAILED_NON_LOCAL_TARGET` with nothing
executed. Captured output is bounded to 65536 bytes of stdout and scalar values only
(string, number or boolean). A `redact: true` value is never written in clear, and one
shorter than 4 characters blocks the case `CAPTURE_UNREDACTABLE`. `api_origins` is a map in
`PRPs/auth/login.config.json`, next to the roles; each entry is
`{ "url": "<local origin>", "header": "<header name>", "cookie": "<cookie name in the role's saved session>", "value_prefix": "<optional, e.g. Bearer >" }`,
where `header` and `cookie` go together or are both absent (an origin with neither only
reaches a second local origin with the session's cookies). The runner builds the header
value at run time from that cookie of the role's saved storage state and sends it only
with steps naming that origin; the value is never written to evidence, a reason or the
terminal. Every declared origin is checked by the local-only guard; an origin not
declared in `api_origins`, or not local, blocks the case `FAILED_NON_LOCAL_TARGET` with
nothing requested. Other refusals, all `blocked` and all before any request:
`API_ORIGIN_INVALID` (a malformed declaration) and `API_HEADER_NO_SESSION` (a
header-bearing origin in a case whose plan entry names no role); at run time
`API_HEADER_SOURCE_MISSING` (the role session has no usable cookie of that name). These
files hold declarations only, never captured values or credentials.

Honesty rule for origins: plan a case that needs a second local origin only when the
origin is already named in `PRPs/auth/login.config.json` `api_origins`; read the names
from that file, never invent one and never write a URL, header value or token.

Query sources. `query_sources` is a top-level map in `PRPs/auth/qa-seed.json`; each
entry has `kind` (`wrangler-d1` or `sqlite3`), `command` (the argv PREFIX; the
statement is appended as the final argument, so a `wrangler-d1` command ends with
`--command`) and an optional `redact_columns` list of column names whose values are
written as `[REDACTED]` in evidence. A `wrangler-d1` source must carry `--local` and
`--json` and must not carry `--remote` or `--preview`; otherwise the case is blocked
`FAILED_NON_LOCAL_TARGET` with nothing executed. A `sqlite3` source must carry
`-readonly` and `-json`, and no URL or `file:` argument. Any argument naming a URL is
also checked by the local-only guard. D1 offers no engine-level read-only control
through `wrangler`, so a D1 source relies on the statement guard plus `--local`; an
operator who wants the engine control declares the local SQLite file as a `sqlite3`
source instead. The refusal codes, all `blocked` and all before any command runs:
`QUERY_NOT_READ_ONLY`, `QUERY_SOURCE_UNDECLARED`, `QUERY_SOURCE_INVALID` and
`FAILED_NON_LOCAL_TARGET`; at run time `QUERY_FAILED` and `QUERY_OUTPUT_UNPARSEABLE`.
The runner loads its query module lazily, so a case whose module cannot be loaded is
`blocked` `QUERY_MODULE_UNAVAILABLE`, never a crash.
Rows are written as evidence after `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` and `redact_columns` are
applied, capped at 100 rows; a failed expectation is `fail` and its reason carries
counts or a path, never a value. On Windows the `command` must start with `node` plus
the tool's script path (or an executable), because commands run without a shell.

```json
{ "states": { "A teacher exists": { "command": ["node", "scripts/seed-teacher.mjs"], "status": "confirmed", "store": "localhost:5432", "captures": { "teacher_id": { "path": "teacher.id" } } } } }
```

`role` is a role slug declared in `PRPs/auth/login.config.json`, or null. `state`
is `none` only when the report's required state is none, `role-only` only when the
required state is nothing but a logged-in user of that role, and otherwise
`declared` (the script then looks the exact required-state text up in the tracked
`PRPs/auth/qa-seed.json`).

Honesty rules:

- Omit any case that needs an email inbox, SMS, a physical device, a third-party
  payment, a subjective visual judgment, a CLI or any action outside the
  vocabulary. The script records it `needs-human` with the steps verbatim.
- Plan a case that needs a database read only when its verification maps onto a
  `SELECT` against a source already named in `PRPs/auth/qa-seed.json`
  `query_sources`; read the source names from that file, never invent one, never
  write a connection string or argv, and omit the case when no source is declared.
- Never invent a selector, path, credential or expected value the steps do not
  state.
- Plan a browser step by a role-and-name or text locator only from an entry of a
  snapshot written by the `ground` mode with `matches` exactly 1; never write a
  locator from the report's own wording or from the code, and never take an
  expectation from the snapshot.
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
- A cited test title narrows the decision to the testcases it names: a `describe("...")`, `it("...")` or `test("...")` citation (optionally followed by a `›` chain to a test title), or a `<path>::<title>` or `<path> > <title>` span, in the same field as the cited file. Each cited title must match a JUnit testcase of that file exactly (its name, its class name or an enclosing suite name, or one ` > `-separated segment of its name); only the matching testcases decide the outcome, and a cited title with no match, or one that follows no cited file, leaves the case not resolved.
- When the field cites only a file, resolution stays per file and the evidence records `granularity: file`; a title-level resolution records `granularity: test`, and a case citing both kinds records `granularity: mixed`.

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
`reason_code`. A kit login script that proves a session in both directions can halt with
`FAILED_PROBE_NOT_PROTECTED`, `FAILED_PROBE_WRONG_ACCOUNT`, `FAILED_PROBE_PAGE_UNLOADABLE` or
`FAILED_PROBE_MARKER_ABSENT` (the login completed but the declared marker never became stably visible); these appear as
named `blocked` reasons and mean a configuration or account problem, not "could not log in". A login script
generated from a different template than the installed one is reported as `FAILED_KIT_SCRIPT_STALE`, also a named
`blocked` reason, and the operator should run `/relay-auth-scripts --refresh`. A browser case for a role whose model
records a pre-authenticated target (a target that authenticates every request) is `blocked` with
`FAILED_TARGET_PRE_AUTHENTICATED` unless the configuration names an alternative local target that the runner's
anonymous check confirms clean. Every other session failure keeps `SESSION_UNAVAILABLE`. Then state explicitly:

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
  declared; a capturing declaration must name that store and pass the local-only guard.
- **Never edit `qa-report.md` or any Manual status.**
- **Never run a command taken from the report or its steps.** Seed commands come
  only from `PRPs/auth/qa-seed.json` and only when the declaration is `confirmed`,
  and sessions only from the kit's login scripts.
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
