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
manual steps and writing exactly one plan entry per case: an executable entry where
the steps map onto the closed vocabulary below, a declining entry (a `class` and a
catalogued `reason_code`, no steps) otherwise. The runner script does everything that must be
deterministic and auditable: it parses the report itself, validates your plan
against it, runs the local-only guard, obtains sessions from the kit's login
scripts, redacts evidence in memory, stamps real UTC instants and enforces one
entry per case.

**A runner pass is evidence, not approval.** This command never edits the QA
report, never flips a Manual status and never advances a phase status. The human
validation gate stays open. It never asks the user a question.

See:
- `${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs` — the runner script (`parse`, `init`, `run`, `ground`) this command calls.
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

The script also writes a `.gitignore` inside the new run directory, through its single write
helper, that ignores `grounding/` and `evidence/`. It proves the rules with
git check-ignore -q for a path of each kind before it prints anything. The grounding
snapshots, screenshots, redacted-text files and the response and row bodies can hold
personal data, so none of them may be tracked, while `results.json` and `plan.json` stay
tracked. The output ends with `IGNORE_PROOF: proven`, or with
`IGNORE_PROOF: not-applicable` when the run directory is not inside a git work tree. When
git is present and the paths are not proven ignored, the script halts
`FAILED_IGNORE_UNPROVEN` and writes no snapshot and no screenshot: relay that code and its
message, fix the ignore rule and run `init` again. `ground` and `run` prove the same rules
before they write anything and, inside a work tree, restore a missing `.gitignore` first.

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
onto the closed vocabulary below. Write exactly one entry for every returned case,
with the `Write` tool, into `<RUN_DIR>/plan.json`, and never omit a case: an entry
whose steps map onto the vocabulary is executable, and an entry for a case that does
not map declines it with a `class` and a catalogued `reason_code` (see "Classify
every case and name every decline" below). A case with no entry is recorded
`needs-human` with `NO_PLAN_ENTRY`, which is a planner defect: it is reported
`unclassified` and counts against the classification metric.

```json
{ "schema_version": 1, "cases": [ { "index": 1, "title": "<copied exactly>", "class": "automatable", "driver": "http", "role": null, "state": "none", "steps": [] } ] }
```

A declining entry for a case the vocabulary cannot execute:

```json
{ "index": 7, "title": "<copied exactly>", "class": "human-by-nature", "reason_code": "EXTERNAL_CHANNEL" }
```

Grounding browser steps. For a case whose browser steps name no selector (or whose labels
you cannot trust), run, once per role and route and BEFORE writing the plan entry:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" ground --root "<target_root>" --feature "<feature>" --run-dir "<RUN_DIR>" --route "<route>"
```

Append ` --role "<role>"` when the plan entry names a role and ` --env-handle "<path>"` when
the argument was given, and ` --prefix '<json>'` to ground an element that exists only after
an interaction (see Grounding after an interaction below). The route starts with a single `/`.
Under Windows Git Bash, MSYS rewrites a leading-slash argument such as `--route "/perfil"`
into a Windows path before the script sees it, and the script then exits 2 with its usage
text; run the same `node` line with `MSYS_NO_PATHCONV=1` set as a prefix, whereas PowerShell
and POSIX shells do not rewrite the argument.

`ground` plans from the settled page, never from its first paint. It reads the page's
accessibility snapshot repeatedly and writes the file only once two successive accessibility
snapshots are equal, taken 1 second apart, and it waits at most 20 seconds for such a pair. A
page that never settles (a live counter, an animation, a request that never ends) ends the
command with `GROUND_UNSTABLE`, a non-zero exit and no snapshot file, because a locator
planned from a page that was still changing is a guess.

It prints `GROUNDED: <path> entries=<n> withheld=<m>`; `Read` the written snapshot file under
`<RUN_DIR>/grounding/`. It lists role-and-name and visible-text entries, and the visible-text
entries include the text of paragraph, list-item and cell lines, each with the number of
elements it `matches`. A non-zero exit is a named halt (for example
`FAILED_PLAYWRIGHT_UNAVAILABLE`, `SESSION_UNAVAILABLE`, `TARGET_UNREACHABLE` or
`GROUND_UNSTABLE`): relay the halt and plan no locator step for that route. A halted `ground`
never leaves a case without an entry, so every case whose steps need a locator on that route
gets a declining entry with its class from the frozen table below and the code
`STEP_UNGROUNDED`, or `UNGROUNDABLE_AFTER_INTERACTION` when the element exists only after an
interaction, and the script reports it with the manual steps verbatim.

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

Three further `browser` actions assert more than presence. Each is flat, takes only the
grounded locator forms (never a `selector`), counts as one expectation and is planned only
from a snapshot entry whose `matches` is exactly `1`.

A literal `browser` step that compares the value of an input, a textarea or a select:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_value", "role": "textbox", "name": "Telefone", "not_empty": true }
```

`expect_value` takes `role` and `name` and exactly one of `equals` (a string), `contains`
(a non-empty string) or `not_empty` (always `true`). `{{name}}` bindings are allowed in
`equals` and `contains`, and a literal `equals` or `contains` must come from the report's
own steps. The comparison is exact, and `not_empty` ignores surrounding whitespace.
The value is re-read for up to 5 seconds before the comparison fails.
The evidence records which comparison ran and whether it passed, never the value, and the final
screenshot masks the field. An element that holds no value (it is not an input, a textarea
or a select) blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted.

A literal `browser` step that asserts an element is gone:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_not_visible", "role": "listitem", "name": "Buy milk" }
```

`expect_not_visible` takes `role` and `name`, or `text`. It passes only when the grounded
locator is hidden or absent, re-checked for up to 5 seconds. It is valid only after a
positive step on the same route in the same case: an `expect_visible`, `expect_text`,
`expect_value` or `expect_state` step since the last `goto`. Otherwise the entry is
`PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, because an
absence step alone would pass on a page that never rendered. A `click` that navigates to
another page does not reset that anchor, so follow a navigating `click` with an `expect_url`
of the new path and a positive step on the page it lands on before any `expect_not_visible`.
The element must be one the snapshot of that page state already lists: the plain snapshot,
or the one a `--prefix` ground wrote after the interactions of the case.

A literal `browser` step that asserts a state:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_state", "role": "button", "name": "Não concluídas", "state": "expanded", "equals": false }
```

`expect_state` takes `role` and `name`, a `state` of `expanded`, `disabled` or `checked`
and a boolean `equals` that is always written. It passes only when the element's state
equals `equals`, re-read for up to 5 seconds. `expanded` reads `aria-expanded`,
`disabled` follows Playwright's definition of a disabled element and `checked` reads the
checked state of a checkbox or radio. An element that exposes no such state (a button with
no `aria-expanded`, a `details` disclosure, a non-checkbox) blocks the case
`STEP_NOT_PERFORMABLE` and never passes as collapsed or unchecked, and so does a `checked`
step on an element whose `aria-checked` is `mixed`. The runner reads only that attribute: a
native checkbox whose DOM `indeterminate` property is set exposes no `aria-checked`, is not
detected, and is read as Playwright reports its checked state.

A literal `browser` step that counts the requests the page issues:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_requests", "method": "POST", "url_contains": "/avatar", "count": 1 }
```

`expect_requests` takes a `method` (`GET`, `HEAD`, `POST`, `PUT`, `PATCH` or `DELETE`), a
`url_contains` and an integer `count` from 0 to 100, and takes no locator, no `selector`
and no `session`. `url_contains` starts with a single `/` and carries no query string,
fragment or whitespace; a character the URL parser encodes is matched in its encoded
form. The step counts the requests of the page whose method equals `method` and
whose path contains `url_contains`, from the start of the case's last `goto`, `click` or
`fill` step until 2 seconds after the step starts, and it passes only when that number
equals `count`. Each redirect hop is a request of its own, a popup, a worker and a
WebSocket are not observed, and a case that carries this step runs with service workers
blocked, so none can answer a request out of sight. The step is valid only after a `goto`,
`click` or `fill` step of the same case, and a `count` of 0 also needs a positive step on
the same route since the last `goto`, as `expect_not_visible` does; otherwise the entry is
`PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested.

A matching request to a host the local-only guard does not approve was aborted before it
left the machine and blocks the case `FAILED_NON_LOCAL_TARGET` with nothing asserted, and
a request to such a host that does not match the step is ignored. The evidence file
`evidence/case-<index>.requests-<step>.json` records the method, the expected count, the
observed count and, for each matching request, only its method, host and path (at most
50 are listed, with `truncated` set past that, and the observed count stays exact): the
query string and the fragment are dropped, and no header, cookie, token or body is ever
read. A path can still carry an identifier the redaction table does not recognize, so
the file sits in the ignored `evidence/` directory, and for the step `results.json`
carries only the result, the counts of a failing reason and the path of that file.

Grounding rules. Write a locator step only for an entry of the snapshot of the step's own
route and role whose `matches` is exactly `1`, copying its `role` and `name` or its `text`
verbatim; the route of a step is the last `goto` or `expect_url` path before it. A step whose
element is not in the snapshot, matches 0 or matches more than one element is not planned:
decline the case with `STEP_UNGROUNDED` before anything is seeded, authenticated or
requested. The declining entry names no step and carries no free text: the runner writes
the fixed catalogue sentence for the code and reproduces the manual steps verbatim, so
which step could not be grounded belongs in your own working notes or in the run summary
you relay to the operator, never in the plan entry. At run time a locator that matches more than
one element is never acted on and also ends the case `needs-human` `STEP_UNGROUNDED`.
Elements that only appear after an interaction are not in the plain snapshot: ground them
with a prefix (see Grounding after an interaction below), and decline a case that still needs
one with `UNGROUNDABLE_AFTER_INTERACTION`.
A text entry may come from a paragraph, list-item or cell line of the snapshot; it is matched
exactly against visible text like any other `text` locator and must still match exactly one
element.
The expectations always come from the report's own steps: an `expect_text`
`contains` must appear in the case's manual steps (otherwise `PLAN_ENTRY_INVALID`), and the
snapshot only supplies how to find an element, never what to expect.

Personal data. The snapshot never stores raw page text; an entry whose text carries a secret
known to the redaction table, an e-mail address or a match of a `regex:` line of
`PRPs/redaction-extensions.txt` is withheld (counted in `withheld`) and cannot be used as a
locator, so an operator whose pages show account names adds a `regex:` line for them to that
file before grounding. The snapshot file is written under `<RUN_DIR>/grounding/`, which the
run directory's `.gitignore` ignores, so free-text personal data the withholding rules cannot
recognize (a task title, a person's name) stays out of git even when it is not withheld.

Grounding after an interaction. An element that exists only after a click or a fill (the
rows of a collapsed group, the results of a filter) is not in the plain snapshot of its
route, so ground the plain route first and plan the interaction itself from that snapshot,
then run the same `ground` line again with a `--prefix` that is a JSON array of the steps of
the case that come before the element, in order. `--route` is the case's own `goto`, so
`--prefix` lists only the steps that come after it:

```bash
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" ground --root "<target_root>" --feature "<feature>" --run-dir "<RUN_DIR>" --route "/tarefas" --role "<role>" --prefix '[{"action":"click","role":"button","name":"Não concluídas"}]'
```

The prefix accepts only `goto`, `click` and `fill` steps, at most 5 steps, and at least one
`click` or `fill`. Each step is flat and names its element by `role` and `name`, or by
`text`, never by `selector`; a `fill` carries a string `value` of at most 200 characters.
A `{{name}}` binding is refused, because `ground` runs before any seed.
The page is loaded at `--route` as before and each step is replayed in order with the
role's saved session behind the same local-only guard; every step must match exactly one
element at the moment it is replayed, and a `goto` must stay on the guard-approved origin.
The snapshot is taken afterwards, only once two successive snapshots are equal, exactly as
for a plain route. Quote the JSON in single quotes: Windows PowerShell 5.1 removes the
double quotes inside a single-quoted argument and the script then refuses it, so run the
line from Git Bash, a POSIX shell or PowerShell 7.

A prefix step that matches zero or more than one element, or that cannot be performed,
halts `GROUND_PREFIX_FAILED`: the exit is non-zero and no snapshot and no `GROUNDED:` line
are written. A locator that names a value the redaction rules withhold halts the same way
before the browser starts, and a `goto` that leaves the guard-approved origin halts
`FAILED_NON_LOCAL_TARGET` before any request. A malformed prefix
exits 2 with `GROUND_PREFIX_INVALID` and the usage text and writes nothing.

The snapshot of a prefix is a different file from the plain snapshot of the route and
never overwrites it: it is named `grounding/<role>--<route>--after-<digest>.snapshot.json`,
where the route is the path the page is on after the replay, and it records the prefix with
a SHA-256 digest in place of every typed value, never the value. The runner grounds a
locator step against it only when the steps of the case before that step are exactly the
prefix: the case's own `goto` of the `--route` path followed by the steps of `--prefix`, in
the same order and with the same values, on the route the page is on (after an `expect_url`,
the route that step names). Only the `goto`, `click` and `fill` steps of the case count, and
an assertion between them is ignored. Every other step is grounded against the plain
snapshot exactly as before.
Write a `fill` value of a prefix only when the steps of the report state it.

A replayed `click` or `fill` is a real interaction with the local application, made at plan
time and never undone. A click that submits a form, deletes a row or toggles a setting
changes the state of the local environment the guard approved, and the runner cannot tell a
harmless click from a destructive one. Prefix only the interactions the case itself performs
before the element it needs, keep the prefix short, and never prefix a step whose manual
wording submits, saves, deletes or sends. `ground` runs no seed, so the page shows the state
the local application holds now, not the state the declaration of the case would seed. If the
element is still not listed, matches more than one element or the prefix halts, decline the
case with `UNGROUNDABLE_AFTER_INTERACTION`. A response that arrives later than the
one-second pair may be missed, in which case the `ground` line can be run once more before
declining.

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

A literal `origin` step sent without the role's session:

<!-- qa-step-example driver=http -->
```json
{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "session": "none", "expect_status": 401 }
```

The optional `session` key has one legal value, `"none"`, and only an `http` `request` step
may carry it, with or without `origin`; any other value, and the key on a `query` step or a
`browser` step, is `PLAN_ENTRY_INVALID`. The step is sent with no cookie, no storage state
and no derived header, through the same local-only guard, so a non-local origin still
blocks the case `FAILED_NON_LOCAL_TARGET` before any request. Every other step of the case
keeps the role's session, and a step without `session` behaves exactly as before. A
`"session": "none"` step to a header-bearing origin needs no role, and an entry whose every
request carries it names no role, because the runner still obtains the session of a role
the entry names.

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

### Classify every case and name every decline

Every plan entry carries a `class`, the classification of its case made before the
run, and an entry that does not execute its case carries a catalogued `reason_code`
instead of steps. The runner validates and echoes both; it never infers either, and
it never reads the report to classify.

The four classes:

- `automatable`: every step maps onto an existing driver step once grounding works.
- `needs-a-new-driver`: the case needs a named step or driver the vocabulary lacks.
- `human-by-nature`: the case needs an external channel or a visual judgment.
- `blocked-by-product`: a known product defect blocks the case.

`class` is declared per entry and is independent of the outcome: never change it to
improve a result. An entry with no `class` is reported `unclassified`, an invalid
value makes the entry `PLAN_ENTRY_INVALID` naming it, and `unclassified` is never
written by a plan.

The reference classification of the 14 reachable cases of the two reference reports
is frozen. Copy the class of a case from this table and do not re-derive it. The
letter-prefixed ids (T-, A-, S-, X-) are `super-ensino` cases and the bare numbers
are `praesto-sum` cases; cases 21 and 22 of `praesto-sum` stay outside the 14.

| Class | Cases | Why |
|-------|-------|-----|
| `automatable` (3) | `praesto-sum` 23; `super-ensino` T-1, A-1 | every step maps onto an existing driver step once grounding works |
| `needs-a-new-driver` (7) | A-2 and S-2 (request without a session); S-1 (input value); S-4 and T-2 (grounding after an interaction); `praesto-sum` 20 (absence, state, grounding after an interaction); S-6 (network request) | a named missing step or driver |
| `human-by-nature` (3) | T-3 (e-mail inbox); S-3 (SMS or e-mail); S-5 (visual preview) | an external channel or a visual judgment |
| `blocked-by-product` (1) | X-1 | `/perfil` without a session renders an error page, not the login form |

The closed catalogue of reason codes a declining entry may carry. A code outside the
catalogue, and `NO_PLAN_ENTRY` itself, makes the entry `PLAN_ENTRY_INVALID` naming
the code. The reason the runner writes is a fixed sentence and the manual steps are
reproduced verbatim.

| Code | Outcome | Use it when |
|------|---------|-------------|
| `UNGROUNDABLE_AFTER_INTERACTION` | `needs-human` | the case needs an element that exists only after an interaction and no snapshot can ground it |
| `EXTERNAL_CHANNEL` | `needs-human` | the case needs an inbox, SMS, a physical device or a third-party payment |
| `VISUAL_JUDGEMENT` | `needs-human` | the case asks for a subjective judgment of appearance |
| `VOCABULARY_GAP` | `needs-human` | a needed step, or a declared source or origin for it, is missing from the closed vocabulary and the tracked declarations |
| `STEP_UNGROUNDED` | `needs-human` | a step's element is not in the snapshot or does not match exactly one element |
| `PRODUCT_DEFECT` | `blocked` | a known product defect blocks the case |
| `STATE_UNCONFIRMED` | `blocked` | the declaration for the required state is not confirmed |
| `PARTIAL_REMAINDER` | `needs-human` | never declared: the runner derives it from `human_remainder`, which must name its gap |

Runtime halt codes (session, probe, query and origin codes such as
`SESSION_UNAVAILABLE`, `QUERY_FAILED` or `API_ORIGIN_INVALID`) stay as they are and
are not part of this catalogue.

A declining entry carries `class` and `reason_code` and no `steps` and no
`human_remainder`; its outcome comes from the catalogue and it never needs a
declared target, a session or a seed. Declining does not raise a rate: the class is
fixed by the table above, and a declined `automatable` case lowers the
driver-executed rate over that class.

<!-- qa-plan-entry-example -->
```json
{ "index": 4, "title": "<copied exactly>", "class": "needs-a-new-driver", "reason_code": "VOCABULARY_GAP", "objective_steps": 3 }
```

Objective steps. An executable entry may carry `objective_steps`, an integer from 0
to 500 that counts the case's objective steps, including those no driver step can
express yet. It defaults to the number of executable steps and may not be lower,
because an executable step is an objective step by definition. A declining entry of
class `automatable` or `needs-a-new-driver` should declare it, and a missing value
is counted in `objective_steps_undeclared`. The per-case counts the dogfood audits
are frozen in its pre-run table before the run, so the declared value is read
against that reference.

An executable partial entry carries the class, the objective-step count and the
remainder together:

<!-- qa-plan-entry-example -->
```json
{ "index": 2, "title": "<copied exactly>", "class": "automatable", "driver": "http", "role": null, "state": "none", "objective_steps": 3, "steps": [ { "action": "request", "method": "GET", "path": "/api/x", "expect_status": 200 } ], "human_remainder": { "reason": "<why the rest is human>" } }
```

Result fields. Each case in `results.json` carries `class` and `objective_steps`
beside its outcome, and the top level carries a `classification` block with
`per_class`, `driver_executed`, `automatable_total`, `automatable_driver_executed`,
`automatable_rate`, `objective_steps_executed`, `objective_steps_total` and
`objective_steps_undeclared`. "Driver-executed" means `pass` or `fail` produced by a
driver: record-resolved and partially executed cases never count. The rate is over
the `automatable` class only and is `null` when that class is empty. "Objective
steps executed" counts the per-step results `passed` or `failed` over the
`automatable` and `needs-a-new-driver` classes. The four-key `counts` partition is
unchanged.

The paragraphs that follow (the declaration schema, origins, query sources, the
`role` and `state` fields and the honesty rules) continue the planning instructions.

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

- Decline any case that needs an email inbox, SMS, a physical device, a third-party
  payment, a subjective visual judgment, a CLI or any action outside the
  vocabulary: write a declining entry with a `class` and a catalogued
  `reason_code`, `EXTERNAL_CHANNEL` for an inbox, SMS, a physical device or a
  third-party payment, `VISUAL_JUDGEMENT` for a subjective visual judgment and
  `VOCABULARY_GAP` for a CLI or any other action outside the vocabulary. The script
  records it with the steps verbatim.
- Plan a case that needs a database read only when its verification maps onto a
  `SELECT` against a source already named in `PRPs/auth/qa-seed.json`
  `query_sources`; read the source names from that file, never invent one, never
  write a connection string or argv, and decline the case with `VOCABULARY_GAP`
  when no source is declared.
- Never invent a selector, path, credential or expected value the steps do not
  state.
- Plan a browser step by a role-and-name or text locator only from an entry of a
  snapshot written by the `ground` mode with `matches` exactly 1; never write a
  locator from the report's own wording or from the code, and never take an
  expectation from the snapshot.
- Plan `"session": "none"` only when the report's own step asks for a request made
  without the session (a rejection such as 401 or 403, or a public endpoint), and never
  to avoid a login.
- Plan `expect_not_visible` only after a positive step of the same route, and
  `expect_value` and `expect_state` only on an entry whose `matches` is exactly `1`,
  with the expected value or state taken from the report's own steps, never from the
  snapshot.
- Plan a `ground` prefix only from the `goto`, `click` and `fill` steps of the case itself,
  write a prefix `fill` value only when the steps of the report state it, and
  never prefix a step whose manual wording submits, saves, deletes or sends.
- Plan `expect_requests` only when the report's own step asks how many requests an action
  issues, with `method`, `url_contains` and `count` taken from the report's own steps and
  after the `goto`, `click` or `fill` step that triggers them; never to confirm that a page
  rendered.
- Every executable entry must carry at least one expectation; a declining entry has
  no steps and so carries none.
- Never put a credential or token value in `plan.json`.
- Never infer a driver the steps do not need.

### Record resolution (done by the script, not by you)

Before it routes a case, the script checks every case whose coverage is
`automated` against the Test Runner's schema-v1 record, found by the discovery
rule of `/relay-qa-report` (the top-level `PRPs/reports/<feature>/record.json`,
else the latest `attempts/<N>/record.json`). You do not resolve the record yourself
and you still write the one entry per case, because the script cannot tell before it
runs whether a record resolves. When the record resolves, the entry decides nothing
about the outcome (only its `class` and `objective_steps` are still read, so the case
is still classified); when it does not resolve, the case routes on the entry like any
other.

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

For a role whose mechanism is `minted`, the runner reads the expiry the login script recorded in the
value-free `PRPs/auth/.sessions/<role>.mint.json` (else the token artifact's `expires_at`). When that
expiry is within 240 seconds of the run start, the runner passes the login script `--force`, so the
script mints and proves a new session before the first case uses it. The runner never runs the mint
command itself: the kit script does, behind its own `confirmed` gate and local-only guard. Session
values are registered for redaction source-first: the token artifact, the role's declared
`sessionCookie` and the cookie named by every `api_origins` entry are always registered, and every
other cookie, localStorage and IndexedDB string (record keys included) only when it is
at least 12 characters long, has an entropy of at least
3.0 bits per character and is not a part of the target origin. A short or low-entropy value in
an undeclared cookie is therefore not masked by value, so a cookie that carries a secret is
declared as `sessionCookie` or in `api_origins`.

A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT` right after it minted
(the application may have been too cold for the declared marker to appear) is run once more
by the runner with `--force`, at most once per role per run (each `ground` command is a run
of its own): the runner runs only the kit login script again, with the same arguments plus
that flag and never the mint command, and the script runs its own local-only guard before
its mint command. A proven second attempt yields the session, and a second halt leaves the
role blocked with the code of that halt, which is `FAILED_PROBE_MARKER_ABSENT` again when
the proof fails again. A role whose mechanism is not `minted`, and every other halt, is
never retried, and the login template and its stamp are unchanged.

---

## Final output surface

Relay the script's summary: the four driver-executed counts, the separate
`record-resolved` line, the `results.json` path and the evidence directory. List every `blocked` and `needs-human` case by its
`reason_code`. Read the driver-executed rate over the automatable class and the
objective-step counters from the `classification` block of `results.json`, and treat
a non-zero `objective_steps_undeclared`, any `unclassified` case and any
`NO_PLAN_ENTRY` case as a planner defect. A kit login script that proves a session in both directions can halt with
`FAILED_PROBE_NOT_PROTECTED`, `FAILED_PROBE_WRONG_ACCOUNT`, `FAILED_PROBE_PAGE_UNLOADABLE` or
`FAILED_PROBE_MARKER_ABSENT` (the login completed but the declared marker never became stably visible); these appear as
named `blocked` reasons and mean a configuration or account problem, not "could not log in". A login script
generated from a different template than the installed one is reported as `FAILED_KIT_SCRIPT_STALE`, also a named
`blocked` reason, and the operator should run `/relay-auth-scripts --refresh`. For a role whose mechanism is `minted`, the
login halts `FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`, `FAILED_NON_LOCAL_TARGET`,
`FAILED_MINT_COMMAND` and `FAILED_MINT_OUTPUT` are also named `blocked` reasons (the first two are fixed by
the operator editing `PRPs/auth/login.config.json`). A browser case for a role whose model
records a pre-authenticated target (a target that authenticates every request) is `blocked` with
`FAILED_TARGET_PRE_AUTHENTICATED` unless the configuration names an alternative local target that the runner's
anonymous check confirms clean. Every other session failure keeps `SESSION_UNAVAILABLE`. A run that
halts `FAILED_IGNORE_UNPROVEN` before its first case wrote neither results nor evidence, so the
operator fixes the run directory's ignore rule and runs it again. Then state explicitly:

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
- **Run evidence never reaches git.** The run directory carries its own `.gitignore` for
  `grounding/` and `evidence/`, proven with git check-ignore -q, and an unproven ignore
  halts `FAILED_IGNORE_UNPROVEN` before any evidence is written.
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
