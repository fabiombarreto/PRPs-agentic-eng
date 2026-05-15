---
description: Autonomous plan generation from an APPROVED PRD. Validates the PRD path, runs preconditions, then dispatches the plan-writer agent which selects the next actionable Implementation Phases row, runs research grounding in parallel, consults the Decision Gate, and writes a DRAFT plan to PRPs/plans/<feature>-phase-<N>-<slug>.plan.md while back-filling the source PRD's row N. Reviewer adoption is OUT of scope — the separate /relay-plan-review command (Phase 4 of plan-authoring) owns the DRAFT→APPROVED flip.
argument-hint: <prd-path>
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

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat
the argument as the PRD path; resolve it as absolute, or as
relative to the current working directory. If the argument is
blank/whitespace, HALT with:

> /relay-plan requires a PRD path. Usage:
>   /relay-plan PRPs/prds/<feature>.prd.md
> Example:
>   /relay-plan PRPs/prds/plan-authoring.prd.md

If the argument is non-empty but does not resolve to an existing
readable file, fall through to P1 below for the canonical
file-not-readable HALT message.

Record `prd_path` as the resolved absolute path. Record
`target_root` as the current working directory (the repository
from which the user invoked the command). The Writer will use
`target_root` as the root for all documentation reads and for the
output path.

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any
of these fail.

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

## Phase A — Adopt the Writer role

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

**There is no Phase B.** Reviewer adoption is the
`/relay-plan-review` command's job (Phase 4 of `plan-authoring`).
This command is single-role by design — the writer/reviewer split
is the canonical post-PRD command-surface decision
(`plan-authoring.prd.md` Decision Gate, 2026-04-19 row).

### If the Writer halts

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

In all halt cases, do NOT invoke `/relay-plan-review`. The user
(or orchestrator) decides next steps.

---

## Final output surface

On success, the last user-facing message is plan-writer's Phase
5.2 confirmation:

> DRAFT plan written to `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
> Decision Gate: **PROCEED**.
> Source PRD row <N> marked `in-progress`.
> Run `/relay-plan-review PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` to validate.

Surface it verbatim. Do not append anything.

On halt or AC-2 exit, the user-facing message explains the reason
(P1/P2/P3/P4 HALT message, Writer halt verbatim, or AC-2 verbatim)
and the command exits without writing any plan file. The
`/relay-plan-review` command is NOT invoked in any halt case.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Plans live at
  `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`. Nothing else
  goes on disk from this command. The plan-writer enforces this
  at the agent level too; this command is the first guard.
- **Never adopt the Reviewer role.** Reviewer is
  `/relay-plan-review` (separate command, Phase 4 of the PRD).
  This command file MUST NOT contain a Phase B section, and MUST
  NOT invoke `plan-reviewer` via `Task` or otherwise.
- **Never prompt the user.** Past the interactivity boundary
  (`docs/context/architecture.md` §Interactivity boundary). HALTs
  are surfaced verbatim and the command exits.
- **Never overwrite an APPROVED plan.** plan-writer's Phase 1.5
  collision-suffix rule handles the write-time case.
- **Never invoke the Writer when a precondition failed.** HALT
  before adopting the Writer role.
- **Never skip the Decision Gate evidence block.** Both the
  command-level gate (above) and the Writer's in-plan Decision
  Gate block are mandatory.
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
- **Operating without an APPROVED PRD** — PRD-less mode
  (accepting a short feature description directly, analogous to
  how `prp-plan` works) is a registered future capability; see
  `docs/decisions.md` 2026-05-15. The PRD-required contract
  (P1–P4) is the only operative contract. Do not implement or
  approximate a bypass.
