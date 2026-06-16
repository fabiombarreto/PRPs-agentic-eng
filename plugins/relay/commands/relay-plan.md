---
description: Autonomous plan generation from an APPROVED PRD or a free-text feature description. In PRD mode (argument ends with .prd.md): validates the PRD path, runs preconditions P1–P4, then dispatches the plan-writer agent which selects the next actionable Implementation Phases row, runs research grounding in parallel, consults the Decision Gate, and writes a DRAFT plan to PRPs/plans/<feature>-phase-<N>-<slug>.plan.md while back-filling the source PRD's row N. In description mode (any other non-empty argument): skips P2 and P4, keeps P3 Decision Gate sources check, and dispatches plan-writer's description-only entrypoint which derives a flat PRPs/plans/<slug>.plan.md with no PRD back-fill. Reviewer adoption is OUT of scope — the separate /relay-plan-review command owns the DRAFT→APPROVED flip.
argument-hint: <prd-path> | "<description>"
---

# /relay-plan

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the PRD path argument, run the preconditions check, then
adopt the `plan-writer` role to generate a DRAFT plan for the next
actionable phase. Reviewer dispatch is OUT of scope — that is the
`/relay-plan-review` command (Phase 4 of `plan-authoring`).

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/plan-authoring.prd.md` — this
  feature's PRD; scope, AC-1 through AC-10, rationale.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-writer.md` — the
  Writer protocol you adopt in Phases 0–5.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/research-codebase.md`
  and `research-web.md` — subagents the Writer invokes via `Task`
  during its Phase 2 GROUNDING.
- `${CLAUDE_PLUGIN_ROOT}/docs/context/prd-template.md` —
  canonical PRD shape; the command reads the Implementation Phases
  table from a PRD that conforms to this template.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command
creates a cross-cutting artifact (a plan that the Implementer
consumes); the gate is active. Consult `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md` in the
target project — these are also the three files the Writer
consults in its Phase 3 when assembling the plan's own Decision
Gate block. Your gate here covers the *command invocation*; the
Writer's gate inside the generated plan covers the *phase being
planned*.

---

## Phase 0 — Input-type detection

`$ARGUMENTS` MUST be a single non-empty string. If the argument is
blank/whitespace, HALT with:

> /relay-plan requires a PRD path or a feature description. Usage:
>   /relay-plan PRPs/prds/<feature>.prd.md
>   /relay-plan "<description>"
> Example:
>   /relay-plan PRPs/prds/plan-authoring.prd.md
>   /relay-plan "Add dark mode toggle to the settings panel"

**Detection step** — examine the argument value:

- If the argument ends with `.prd.md` → set `mode = prd`, record
  `prd_path` as the resolved absolute path, and proceed to the
  existing P1–P4 preconditions then **Phase A**.
- Otherwise → set `mode = description`, record `description =
  $ARGUMENTS` (the raw free-text string), record `target_root` as
  the current working directory, and proceed to P1.D and P3.D then
  **Phase B**.

---

## Preconditions (PRD mode)

HALT with a clear user-facing message (and do not proceed) if any
of these fail. These preconditions apply only when `mode = prd`.

### P1 — PRD path resolves to a readable file

If `prd_path` does not point at an existing readable file:

> I cannot start plan authoring without `<prd_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-plan PRPs/prds/<feature>.prd.md

### P2 — PRD ends with `*Status: APPROVED*`

`Read` the PRD. Inspect its trailing status line (the last
non-empty line of the file).

- If it equals `*Status: APPROVED*` → proceed.
- If it equals `*Status: DRAFT*` (or any other non-APPROVED
  status, or has no status line):

  HALT with:

  > The PRD at `<prd_path>` is not APPROVED (current status:
  > `<status>`). /relay-plan only operates on APPROVED PRDs.
  > Run /relay-prd to bring the PRD to APPROVED first, or
  > manually flip its trailing `*Status:*` line to APPROVED if
  > the rubric was already validated by hand.

Trim trailing whitespace and newlines before comparison; the
check is "the last non-empty line equals `*Status: APPROVED*`"
character-for-character.

### P3 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with:

> I cannot dispatch the plan-writer without `<missing-file>`.
> The Decision Gate consultation in plan-writer's Phase 3
> requires all three mandatory sources. Run the
> `context-builder` skill (`*init` or `*update` mode) to
> generate the missing governance files, then re-run
> /relay-plan.

### P4 — At least one actionable phase exists

Locate the Implementation Phases table in the PRD by exact-match
header line:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

If the header line is not found, HALT with:

> Implementation Phases table header not found in `<prd_path>`.
> Expected: `| # | Phase | Description | Status | Parallel | Depends | PRP Plan |`.
> The PRD must conform to docs/context/prd-template.md before
> /relay-plan can run.

Parse the data rows that follow (skip the GFM separator row
`|---|---|...|` consisting only of dashes and pipes).

A row is **actionable** when:
- Its `Status` cell equals `pending` (case-sensitive), AND
- Its `Depends` cell is `-` (empty) OR every comma-separated
  phase number listed has `Status == complete`.

If zero rows are actionable, surface plan-writer's AC-2 message
verbatim and exit 0 (this is success, not failure):

> No pending phases with satisfied dependencies in `<prd-path>`.
> Nothing to plan.

The orchestrator interprets this as "feature complete; nothing
more to plan" per `plan-authoring.prd.md` Open Questions
resolution.

---

## Preconditions (description mode)

These preconditions apply only when `mode = description`.

### P1.D — Non-empty argument

The blank/whitespace HALT fires before the detection step. If
execution reaches P1.D, the argument is guaranteed non-empty.
No additional file-existence check is required — the argument is
the description text itself, not a file path.

### P3.D — Decision Gate sources readable

Same as P3 above — all three files must exist and be readable at
`target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with:

> I cannot dispatch the plan-writer without `<missing-file>`.
> The Decision Gate consultation in plan-writer's Phase 3
> requires all three mandatory sources. Run the
> `context-builder` skill (`*init` or `*update` mode) to
> generate the missing governance files, then re-run
> /relay-plan.

P2 (APPROVED status) and P4 (Implementation Phases table) are
**skipped** in description mode — there is no PRD to check.

---

## Phase A — Adopt the Writer role (PRD mode)

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-writer.md`.

Execution context to pass into the Writer's Phase 0 setup:

- `prd_path`: the resolved absolute path verified by P1–P4.
- `target_root`: the cwd.

Run Phases 0 through 5 as specified by `plan-writer.md`. At Phase
2 GROUNDING, the Writer invokes the research subagents in a single
parallel dispatch:

```
Task(subagent_type="research-codebase", prompt=<topic + focus_areas + roots>)
Task(subagent_type="research-web",      prompt=<topic + focus_areas>)
```

Both calls go in a SINGLE message. The Writer handles each
subagent's return independently (non-empty findings, degradation
gap, unparseable partial) per its Phase 2 prose.

The Writer's Phase 5.2 confirmation (`DRAFT plan written to ...`)
is the terminal signal. Surface it verbatim to the user and exit.

Reviewer adoption is the `/relay-plan-review` command's job.
This command is single-role by design — the writer/reviewer split
is the canonical post-PRD command-surface decision
(`plan-authoring.prd.md` Decision Gate, 2026-04-19 row).

---

## Phase B — Adopt the Writer role (description mode)

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-writer.md`,
entering at the description-mode entrypoint **Phase 0.B**.

Execution context to pass into the Writer's Phase 0.B setup:

- `description`: the raw free-text string from `$ARGUMENTS`.
- `target_root`: the cwd.

Run Phase 0.B then Phase 1.B (flat filename + collision check),
then Phases 2–4 (grounding, Decision Gate, plan body), then
Phase 5 (where Phase 5.1 is a documented no-op for description
mode). At Phase 2 GROUNDING, the Writer invokes the research
subagents in a single parallel dispatch (same as Phase A).

The Writer's Phase 5.2 description-mode confirmation is the
terminal signal:

> DRAFT plan written to `PRPs/plans/<slug>.plan.md`.
> Decision Gate: **PROCEED**.
> Run `/relay-plan-review PRPs/plans/<slug>.plan.md` to validate.

Surface it verbatim to the user and exit. (No "Source PRD row N
marked in-progress" line — there is no PRD row in description
mode.)

Reviewer adoption is still the `/relay-plan-review` command's job.

### If the Writer halts (PRD mode)

Possible Writer halt conditions (all specified in
`plan-writer.md`):

- **Implementation Phases header mismatch** (Writer's Phase 1.1)
  — cannot parse the table mid-flow despite P4 passing.
  Surface the halt message verbatim and exit.
- **No actionable phase** (Writer's Phase 1.3) — surface AC-2
  message verbatim and exit 0. This is success, not failure.
- **Decision Gate consultation fails** (Writer's Phase 3.1) —
  one of the three sources became unreadable mid-flow despite
  P3 passing. Surface the verbatim halt message and exit.
- **Decision Gate `HALT (reason)`** (Writer's Phase 3.2) — a
  rule conflict emerged between the PRD and the Decision Gate
  sources. Surface the conflict verbatim and exit; do NOT
  prompt the user, do NOT auto-resolve.
- **PRD back-fill soft-fail** (Writer's Phase 5.1) — the plan
  was written successfully but the source PRD's row N could
  not be back-filled (whitespace drift in the row line).
  Surface the soft-fail message; the plan is still on disk
  and can be reviewed.

### If the Writer halts (description mode)

Possible halt conditions in description mode:

- **Decision Gate consultation fails** (Writer's Phase 3.1) —
  one of the three sources became unreadable mid-flow despite
  P3.D passing. Surface the verbatim halt message and exit.
- **Decision Gate `HALT (reason)`** (Writer's Phase 3.2) — a
  rule conflict emerged between the description and the Decision
  Gate sources. Surface the conflict verbatim and exit; do NOT
  prompt the user, do NOT auto-resolve.
- **Phase 5.1 no-op** — this is not a halt; it is an expected
  documented no-op. No PRD back-fill is attempted in description
  mode; the Writer logs "description mode: no PRD row back-fill"
  and proceeds to Phase 5.2.

In all halt cases, do NOT invoke `/relay-plan-review`. The user
(or orchestrator) decides next steps.

---

## Final output surface

**PRD mode** — on success, the last user-facing message is
plan-writer's Phase 5.2 confirmation:

> DRAFT plan written to `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
> Decision Gate: **PROCEED**.
> Source PRD row <N> marked `in-progress`.
> Run `/relay-plan-review PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` to validate.

**Description mode** — on success, the last user-facing message is
plan-writer's Phase 5.2 description-mode confirmation:

> DRAFT plan written to `PRPs/plans/<slug>.plan.md`.
> Decision Gate: **PROCEED**.
> Run `/relay-plan-review PRPs/plans/<slug>.plan.md` to validate.

Note the flat `<slug>.plan.md` filename — no `-phase-<N>-` segment
because there is no PRD phase row in description mode.

Surface it verbatim. Do not append anything.

On halt or AC-2 exit, the user-facing message explains the reason
(P1/P2/P3/P4 HALT message, Writer halt verbatim, or AC-2 verbatim)
and the command exits without writing any plan file. The
`/relay-plan-review` command is NOT invoked in any halt case.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Plans live at
  `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` (PRD mode) or
  `PRPs/plans/<slug>.plan.md` (description mode). Nothing else
  goes on disk from this command. The plan-writer enforces this
  at the agent level too; this command is the first guard. The
  `.claude/PRPs/` write prohibition applies equally to
  description-mode plans — they go to `PRPs/plans/<slug>.plan.md`,
  never under `.claude/`.
- **Never adopt the Reviewer role.** Reviewer is
  `/relay-plan-review` (separate command, Phase 4 of the PRD).
  This command MUST NOT invoke `plan-reviewer` via `Task` or
  otherwise.
- **Never prompt the user.** Past the interactivity boundary
  (`docs/context/architecture.md` §Interactivity boundary). HALTs
  are surfaced verbatim and the command exits.
- **Never overwrite an APPROVED plan.** plan-writer's Phase 1.5
  (PRD mode) and Phase 1.B (description mode) collision-suffix
  rules handle the write-time case.
- **Never invoke the Writer when a precondition failed.** HALT
  before adopting the Writer role.
- **Never skip the Decision Gate evidence block.** Both the
  command-level gate (above) and the Writer's in-plan Decision
  Gate block are mandatory in both PRD mode and description mode.
- **Never re-run the Writer on CHANGES_REQUESTED.** That is the
  orchestrator's call (`/relay-execute`), not this command's. A
  single `/relay-plan` invocation produces zero or one DRAFT plan;
  it never loops.

---

## What you do NOT do

- **Reviewing the plan** — `/relay-plan-review` (Phase 4 of the
  PRD) owns the rubric run + DRAFT→APPROVED flip.
- **Implementing the plan** — `/relay-implement` (downstream).
- **Bundling writer + reviewer** — bound by the 2026-04-19
  command-surface decision; the PRD stage's bundled `/relay-prd`
  is the documented exception, not the rule.
- **Reopening an APPROVED plan** — out of scope. Manual hand-edit
  (flip the trailing `*Status:*` line back to `DRAFT`) is the
  documented escape hatch.
- **Targeting a specific phase via `--phase <N>`** — Could-item
  per `plan-authoring.prd.md` MoSCoW; deferred. The Writer picks
  the lowest-numbered actionable phase deterministically.
- **Cross-PRD planning** — the command operates on exactly one
  PRD per invocation. Multi-PRD coordination is out of scope.
- **Operating without any argument** — blank arguments HALT
  before any mode is entered (Phase 0 detection fires first).
