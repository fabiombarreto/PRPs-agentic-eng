---
description: "Standalone interactive entry point for Figma-to-Design-Spec extraction. Adopts design-spec-writer inline (Phase A) then design-spec-reviewer inline with invocation_context: main (Phase B) — mirroring /relay-prd's writer/reviewer bundling, never Task-dispatched. Parses a Figma URL + feature name from the argument, verifies figma_track: true and Figma MCP reachability, performs all Figma MCP querying itself in this session as the writer's protocol directs, relays the writer's restate-and-wait and batched-Q&A dialogue to the user, then relays the reviewer's rubric-pass approval dialogue and owns the human-confirmed DRAFT→APPROVED flip. Bounded max_spec_review_retries=2 exhaustion offers retry-or-abort, never a silent loop. Writes PRPs/designs/<feature>/design-spec.md plus its raw/ evidence and refs/ screenshots. Never invoked by /relay-execute."
argument-hint: <figma-url> [feature-or-description]
---

# /relay-design-spec

**Arguments:** `$ARGUMENTS`

---

## Your mission

Turn a Figma URL into a human-approved, business-grounded, evidence-
backed Design Spec for one feature: adopt the `design-spec-writer` role
inline to interpret the design and gather the user's answers to any
genuinely ambiguous regions, then adopt the `design-spec-reviewer` role
inline (`invocation_context: main`) to validate the DRAFT and — only
after the rubric passes AND the user gives their own explicit
affirmative reply — flip it to `APPROVED`.

**This is the second inline-adopted writer/reviewer pair in relay**,
after `/relay-prd`. Unlike Phase 3's `/relay-design-map` (which
performs Figma MCP queries itself and then dispatches a Task-based,
MCP-free `design-map-writer`/`design-map-reviewer` pair), this command
adopts both roles directly in this main conversation and performs all
Figma MCP calls itself, as `design-spec-writer`'s own protocol
directs — because that protocol IS this session's protocol for the
duration of Phase A.

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/figma-implementation-track.prd.md` — source PRD, Implementation Phases row 4.
- `${CLAUDE_PLUGIN_ROOT}/agents/design-spec-writer.md` — the Writer protocol you adopt in Phase A.
- `${CLAUDE_PLUGIN_ROOT}/agents/design-spec-reviewer.md` — the Reviewer protocol you adopt in Phase B.
- `${CLAUDE_PLUGIN_ROOT}/docs/context/design-spec-template.md` — the canonical Design Spec shape both agents reference.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-prd.md` — the direct template for this command's inline-adoption framing.
- `${CLAUDE_PLUGIN_ROOT}/agents/plan-writer.md` Phase 0.B — the kebab-slugification rule this command's argument parsing reuses by name.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command
creates a cross-cutting artifact (`PRPs/designs/<feature>/design-spec.md`,
which a future phase's `plan-writer`/`prd-writer` wiring will consume)
and extends the interactivity boundary in a deliberate, recorded way —
the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`,
and `docs/context/architecture.md` in the target project — these are
also the three files `design-spec-writer` consults in its own Phase 5
when assembling the spec's own Decision Gate block. Your gate here
covers the *command invocation*; the Writer's gate inside the
generated spec covers the *feature being interpreted*.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: new cross-cutting artifact creation (design-spec.md); inline writer/reviewer adoption on the interactive side of the boundary; figma_track-gated invocation
- Decisions found:
  - {decision 1 — e.g. Interactivity boundary — the PRD-authoring pair and this Design Spec pair are the two places relay dialogues with the user before flipping status}
  - {decision 2 — e.g. PRD DRAFT→APPROVED flip ownership is invocation-context-scoped}
  - {decision 3 — e.g. PRP artifacts live under PRPs/, never .claude/}
- Applicable anti-patterns:
  - Activating any pipeline track by heuristic — this command's own P1 precondition below enforces figma_track: true was already explicitly confirmed by a prior /relay-design-map run
  - Treating relayed consent as the user's approval — design-spec-reviewer's main-mode flip requires the user's own explicit reply, never a relayed one
- Applicable architectural rules:
  - documentation/AGENTS.md's three-file registration rule (already satisfied by this feature's own Task 5-7)
  - Writer/reviewer split: reviewer alone owns the DRAFT→APPROVED flip
- Result: PROCEED | HALT (reason)
```

If any Decision Gate source cannot be read, HALT with the canonical
byte-exact message:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run `/relay-design-spec`. No
> code has been changed and no review has been run.

---

## Parse arguments

`$ARGUMENTS` carries a Figma URL followed by optional free text naming
the feature (`<figma-url> [feature-or-description]`).

1. **Extract the Figma URL.** Take the first whitespace-delimited
   token. If it does not parse as a `https://www.figma.com/design/...`
   (or `https://figma.com/design/...`) URL, HALT:

   > FAILED_INVALID_FIGMA_URL: The first argument
   > (`<first-token>`) does not parse as a Figma design URL. Usage:
   > `/relay-design-spec <figma-url> [feature-or-description]`
   > Example: `/relay-design-spec
   > https://www.figma.com/design/abc123/My-File?node-id=12-34 checkout-confirmation`

2. **Derive `feature`.** Everything after the first token is the
   remaining text. If non-empty, derive `feature` by applying the
   identical kebab-slugification rule `plan-writer.md`'s Phase 0.B
   applies for its own description-mode slug derivation (first 8
   words or first 60 characters, whichever boundary comes first;
   lowercase, ASCII only, words joined by `-`, no leading/trailing
   hyphens, any character outside `[a-z0-9-]` dropped) — reused by
   name here, not reimplemented independently. If the remaining text
   is empty, derive `feature` from the Figma URL's file name segment
   using the same rule (the URL's `<file-name>` path segment,
   URL-decoded, slugified).

3. Record `target_root` as the current working directory (the
   repository the user invoked `/relay-design-spec` from).

---

## Preconditions

HALT with a clear, actionable message (and do not proceed) if any of
these fail. No artifact is written and no agent role is adopted on
HALT.

### P1 — `figma_track: true` in methodology.md

`Read` `<target_root>/docs/context/methodology.md`. If the file is
absent, or `figma_track` is absent, or `figma_track: false`:

> FAILED_FIGMA_TRACK_NOT_ACTIVE: `figma_track` is not `true` in
> `docs/context/methodology.md` for this project. `/relay-design-spec`
> requires the Figma Implementation Track to already be active.
> Run `/relay-design-map` first — its Phase E is the one sanctioned
> path to flip `figma_track: true` after building and approving this
> project's component map. `/relay-design-spec` never activates the
> track itself and never infers activation by heuristic.

### P2 — Figma MCP tools discoverable

Attempt to discover Figma MCP tools via `ToolSearch` in this main
session. If no Figma MCP tool (e.g. `get_metadata`,
`get_design_context`, `get_variable_defs`, `get_screenshot`) can be
discovered:

> FAILED_FIGMA_MCP_UNAVAILABLE: No Figma MCP server is reachable from
> this session. `/relay-design-spec` requires a configured Figma MCP
> connection to interpret the target feature's design.
> To connect: add a Figma MCP server to your Claude Code MCP
> configuration (see your Figma MCP server's setup instructions), then
> re-run `/relay-design-spec`.
> This command never silently degrades to a Figma-free run — the
> Design Spec's entire purpose is grounding in the real Figma design.

If both preconditions pass, proceed to Phase A.

---

## Phase A — Adopt the Writer role

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/agents/design-spec-writer.md`.

Execution context to pass into the Writer's Phase 0 setup:

- `figma_url`: the URL extracted above.
- `feature`: the slug derived above.
- `target_root`: the cwd.
- `component_map_path`: `<target_root>/docs/design/component-map.md`
  when that file exists (check with `Glob` before passing it — absence
  is not an error, per the Writer's own degraded-mode handling).

Run Phases 1 through 5 as specified by `design-spec-writer.md`. All
Figma MCP calls the Writer's Phase 2 directs (`get_metadata`,
`get_design_context`, `get_variable_defs`, `get_screenshot`) execute
in THIS session — you are not dispatching a separate agent, you have
become the Writer for the duration of this phase. Relay every
restate-and-wait confirmation (Phase 1) and every batched Q&A round
(Phase 4) to the user exactly as the Writer's protocol specifies.

The Writer's Phase 5.6 confirmation (`DRAFT written to ...`) is the
handoff signal. At that point, record the final DRAFT path and
proceed to Phase B.

### If the Writer halts

- **Decision Gate consultation fails** (Writer's Phase 5.1) — one of
  the three sources could not be read mid-flow. Surface the Writer's
  halt message verbatim and exit. Do not adopt the Reviewer role.
- **Decision Gate `HALT (reason)`** (Writer's Phase 5.2) — a rule
  conflict emerged. Surface the conflict to the user, ask how to
  proceed, and (at the user's direction) either restart the Writer
  from the appropriate phase or exit.

---

## Phase B — Adopt the Reviewer role

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/agents/design-spec-reviewer.md`.

Execution context:

- `spec_path`: the path returned by the Writer.
- `target_root`: the cwd.
- `component_map_path`: the same value passed into Phase A.
- `raw_dir`: `PRPs/designs/<feature>/raw/` (populated by the Writer's
  Phase 2).
- `invocation_context: main`. You adopt the Reviewer protocol *inside
  this command's main conversation*, so the user's messages reach the
  Reviewer directly. The two-condition approval gate (rubric pass AND
  explicit user approval) is satisfiable here, and the Reviewer owns
  the `DRAFT → APPROVED` flip inline (Step 4 of its protocol). This is
  the ONLY place the flip happens in a `/relay-design-spec` session —
  do not delegate it elsewhere.

> **Note — subagent dispatch is a different contract.** `/relay-design-spec`
> never dispatches `design-spec-reviewer` via `Task`; it adopts the
> role in `main` mode as above. See the Reviewer's own "Invocation
> context and flip ownership" framing (mirrored from `prd-reviewer.md`)
> for the `subagent`-mode contract a future orchestrator would use.

Run the Reviewer protocol: load, rubric, branch on result.

### Bounded exhaustion — `max_spec_review_retries = 2`

Track the number of times the Reviewer's Step 3 "one or more fail"
branch fires for this session (each `CHANGES_REQUESTED` verdict
appended to `PRPs/designs/<feature>/design-spec-review.jsonl` counts
as one). `max_spec_review_retries = 2`.

- On the **first** and **second** `CHANGES_REQUESTED`, let the
  Reviewer's Step 5 dialogue loop run normally with the user.
- If a **third** `CHANGES_REQUESTED` would occur (the budget is
  exhausted without reaching `APPROVED`), do NOT enter another round
  of the dialogue loop. Instead, interject with exactly two named
  outcomes:

  > The Design Spec has not reached APPROVED after
  > `max_spec_review_retries = 2` review rounds. What would you like
  > to do?
  > 1. **Retry with corrected inputs** — describe what should change
  >    (a different Figma node, additional business context, a
  >    corrected component map) and I will re-adopt the Writer role
  >    from Phase 1 with your correction.
  > 2. **Abort** — stop here. The DRAFT is preserved at
  >    `PRPs/designs/<feature>/design-spec.md`; nothing is discarded.
  >    You can resume later by re-running `/relay-design-spec` with
  >    the same or corrected arguments.

  Never silently loop past the budget, and never silently discard the
  DRAFT on abort.

The Reviewer either:

- Reaches the final flip (Step 4 of its protocol) → surface its
  `APPROVED` summary to the user and exit.
- Returns `CHANGES_REQUESTED` within the retry budget and enters the
  dialogue loop (Step 5) → let the loop run. The loop either converges
  on `APPROVED` (exit as above) or the budget above is reached.

---

## Final output surface

On successful approval, the last user-facing message is the
Reviewer's `APPROVED` summary. Do not append anything.

On the exhaustion offer, the last user-facing message is the
two-outcome prompt above; the session ends there pending the user's
choice on the next turn.

On halt, the user-facing message explains the reason and names the
DRAFT path (if any) — never silently discarded.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Design Specs live at
  `PRPs/designs/<feature>/design-spec.md`, evidence at
  `PRPs/designs/<feature>/raw/`, references at
  `PRPs/designs/<feature>/refs/`, review logs at
  `PRPs/designs/<feature>/design-spec-review.jsonl`. Nothing else goes
  on disk from this command.
- **Never flip without the user's own explicit affirmative reply.**
  The Reviewer's final flip requires both rubric pass AND the user's
  explicit approval in dialogue, in `main` mode, in this session.
- **Never `Task`-dispatch either role.** Both `design-spec-writer` and
  `design-spec-reviewer` are adopted inline, in this main
  conversation — never via `Task`. This is deliberate: the writer
  needs the user's messages during its restate-and-wait gate and
  batched Q&A, and the reviewer needs the user's messages during its
  approval dialogue. Neither is reachable from a `Task`-dispatched
  subagent.
- **Never call the Figma MCP from a `Task`-dispatched context.** All
  Figma MCP calls happen in this session, directed by the Writer's own
  protocol while it is adopted (Phase A). No dispatched subagent in
  this command ever touches the Figma MCP.
- **Never overwrite an APPROVED Design Spec.** The Writer's Phase 5.3
  collision-suffix rule handles the write-time case.
- **Never invoke either role when a precondition failed.** HALT
  before adopting the Writer role.
- **Never skip the Decision Gate evidence block.** Both the
  command-level gate (above) and the Writer's in-spec Decision Gate
  block are mandatory.
- **Never silently loop past `max_spec_review_retries = 2`.** The
  exhaustion offer above is mandatory once the budget is reached.

---

## What you do NOT do

- **Wiring the Design Spec into `plan-writer`/`prd-writer`.** The
  `design_source` field and `## Design Source` plan/PRD sections are a
  future phase's job (Phase 5 of this feature). This command's Design
  Spec is a standalone, consumable-later artifact.
- **Running the visual-verification loop that consumes the reference
  screenshots.** A future phase's job (Phase 6). This command only
  captures and persists the references.
- **Building or refreshing `docs/design/component-map.md`.** That is
  `/relay-design-map`'s job; this command only reads the map when it
  already exists.
- **Being invoked by `/relay-execute`.** This is a standalone,
  human-triggered command outside the autonomous Pillar 2
  orchestration, exactly like `/relay-design-map`.
- **Reopening an APPROVED Design Spec.** Manual hand-edit (flip the
  trailing `*Status:*` line back to `DRAFT`) is the documented escape
  hatch, mirroring `/relay-prd`'s equivalent constraint.
