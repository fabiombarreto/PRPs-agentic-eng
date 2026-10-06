---
description: 'Standalone, non-interactive proposer of seed declarations for an existing QA report. Lists the report''s required-state texts through the generator script, finds the commands the project already declares for each, cites them with file:line evidence and merges them into PRPs/auth/qa-seed.json as proposed entries; a state with no existing command becomes a named gap. Never runs a command, never writes a seed script, never confirms an entry. Never invoked by /relay-execute.'
argument-hint: '<feature | path-to-qa-report.md>'
---

# /relay-qa-seed

**Arguments:** `$ARGUMENTS`

---

## Your mission

Close the gap between a QA report's required-state texts and the tracked
`PRPs/auth/qa-seed.json` the runner reads. You do one piece of judgment: for each
state, find a command the project ALREADY declares that produces it, and cite where.
The generator script does everything deterministic: it lists the state texts, validates
every proposal (a real `file:line` that names the command) and merges the entries
atomically, byte-equal to the report's text, all as `proposed`.

**A proposal is not a permission.** No entry is runnable until the operator reviews it
and edits its `status` by hand. This command never confirms an entry, never runs a
command and never asks the user a question.

See:
- `${CLAUDE_PLUGIN_ROOT}/scripts/qa-seed.mjs` — the generator script (`states`, `merge`) this command calls.
- `${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs` — the runner, whose parser the generator shares and which enforces the refusals.
- `/relay-qa-run` — the command that consumes the declarations.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command creates a tracked
declaration file the runner consumes, so the gate is active. Emit the canonical
six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: a tracked declaration the runner executes; a trust decision left to the operator
- Decisions found:
  - {decision 1 — e.g. the generator proposes and never confirms; the operator edits the tracked file}
  - {decision 2 — e.g. PRP artifacts live under PRPs/, never .claude/}
  - {decision 3 — e.g. a missing project command is a named gap, never a generated script}
- Applicable anti-patterns:
  - Flipping any opt-in gating key by heuristic — no relay component writes confirmed
  - Emitting secret values in run reports or logs — declarations only, never values
- Applicable architectural rules:
  - Command versus agent separation — this command owns discovery; the script owns every write
  - Interactivity boundary — confirmation is an operator edit of a tracked file
- Result: PROCEED | HALT (reason)
```

---

## Parse arguments

`$ARGUMENTS` must carry exactly one of:

- a bare `<feature>` slug matching `^[a-z0-9][a-z0-9-]*$`; or
- a path ending in `/qa-report.md`, whose parent directory name is the feature.

A blank argument or anything else HALTs:

> Usage: `/relay-qa-seed <feature | path-to-qa-report.md>`
> Example: `/relay-qa-seed my-feature`
> Unrecognized or missing argument. Nothing has been read or written.

No feature is ever inferred from the branch. Record `target_root` as the current
working directory.

---

## Preconditions

Run in this order. HALT with a clear, actionable message on any failure; nothing is
written before both pass.

### P1 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the byte-exact pattern shared by every relay command:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-qa-seed.
> No proposal has been written.

### P2 — The report exists

`PRPs/reports/<feature>/qa-report.md` must exist. Otherwise HALT:

> FAILED_QA_REPORT_MISSING: `PRPs/reports/<feature>/qa-report.md` does not exist.
> Produce it with `/relay-qa-report` first. Nothing has been written.

---

## Flow

1. List the states. Run, from a fenced bash block, exactly this line:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-seed.mjs" states --report "<report>"
   ```

   Its JSON array is the only list of states. Never derive a state text yourself.
   If it exits non-zero, HALT and relay its message verbatim.

2. For each text, search the project (Read, Glob and Grep only) for a command the
   project ALREADY declares that produces that state: a `package.json` script, a
   management command, a Makefile target or an existing seed script. Cite each as
   `evidence` `<relative-path>:<line>` where the cited line names the command. Never
   write, generate or modify a seed script; never run any discovered command; never
   use a command named only by the report's steps.

3. Write `<target_root>/PRPs/reports/<feature>/qa-seed-proposals.json` with the
   `Write` tool, shaped like this:

   ```json
   { "states": { "<text>": { "command": ["npm", "run", "seed:teacher"], "evidence": "package.json:12" } } }
   ```

   For a state with no existing command write `{ "command": null, "gap": "<what is
   missing, in one sentence>" }`. Never include `status`, `captures` or a credential
   or token value. An optional `store` is allowed only when the cited file states the
   store.

4. Merge. Run, from a fenced bash block, exactly this line:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-seed.mjs" merge --root "<target_root>" --report "<report>" --proposals "<proposals>"
   ```

   Relay a `FAILED_SEED_*` halt verbatim; nothing was written.

5. Final output: list the added entries (each `proposed`), the kept entries and every
   gap. Then state that no entry is runnable until the operator reviews `git diff` on
   `PRPs/auth/qa-seed.json`, writes any missing project seed script, adds `captures`
   and the declaration's `store`, and edits `status` to the confirmed value by hand.
   `/relay-qa-run` refuses `proposed` entries with `STATE_UNCONFIRMED` and
   `command: null` entries with `STATE_COMMAND_MISSING`. Name `/relay-qa-run` as the
   next step in prose.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Artifacts live under `PRPs/`.
- **Never invoked by `/relay-execute`.** Standalone, human-triggered.
- **The only files this command writes** are the proposals file and, through the
  script, `PRPs/auth/qa-seed.json`.
- **Never edit `qa-report.md`.**
- **Never write a confirmed status** or any value that makes an entry runnable.
- **Never run a command**, discovered or otherwise.
- **Never dispatch a subagent.**
- **Never ask the user a question.**
- **Use the `Write` tool** (heredocs through Bash do not work in this environment).
