---
description: Interactive PRD authoring. Drives the 6-phase Q&A (Initiate → Foundation → Grounding → Deep Dive → Grounding → Decisions → Generate), invokes relay research subagents during grounding, emits the Decision Gate evidence block, writes a DRAFT to PRPs/prds/<kebab>.prd.md, then hands off to the PRD Reviewer for the DRAFT→APPROVED flip. The single interactive entry point of the relay pipeline.
argument-hint: [description | draft-path]
---

# /relay-prd

**Arguments:** `$ARGUMENTS`

---

## Your mission

Drive the PRD authoring flow end-to-end: dispatch on the argument
shape, run the precondition checks, adopt the `prd-writer` role to
conduct the 6-phase Q&A with the user, then adopt the `prd-reviewer`
role to validate the DRAFT and flip to `APPROVED`. Research is
delegated to the `research-web` and `research-codebase` subagents via
the `Task` tool during Phase 3 (and conditionally Phase 5).

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/prd-authoring.prd.md` — this
  feature's PRD; scope, AC-1 through AC-16, rationale.
- `${CLAUDE_PLUGIN_ROOT}/agents/prd-writer.md` — the
  Writer protocol you adopt in Phases 1–7.
- `${CLAUDE_PLUGIN_ROOT}/agents/prd-reviewer.md` — the
  Reviewer protocol you adopt after the DRAFT is written.
- `${CLAUDE_PLUGIN_ROOT}/agents/research-web.md` and
  `research-codebase.md` — subagents invoked via `Task` during
  grounding.
- `${CLAUDE_PLUGIN_ROOT}/docs/context/prd-template.md` — canonical
  PRD shape; the Writer assembles the DRAFT against this template.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command
creates a cross-cutting artifact (a PRD that downstream stages
consume); the gate is active. Consult `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md` in the
target project — these are also the three files the Writer consults
in Phase 7.2 when assembling the PRD's own Decision Gate block. Your
gate here covers the *command invocation*; the Writer's gate inside
the generated PRD covers the *feature being specified*.

---

## Parse arguments

Dispatch on `$ARGUMENTS`:

1. **Empty** — `$ARGUMENTS` is blank/whitespace → `mode = blank`.
2. **Looks like a file path** — `$ARGUMENTS` ends in `.md` AND
   resolves to an existing file (absolute path, or relative to the
   current working directory) → `mode = draft-path`.
3. **Otherwise** — `mode = description`; the argument is the
   description string.

Record `target_root` as the current working directory (the repository
from which the user invoked the command). The Writer and Reviewer
will use this as the root for all documentation reads and for the
output path.

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of
these fail.

### P1 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with:

> I cannot start PRD authoring without `<missing-file>`.
> The Decision Gate consultation in Phase 7 requires all three
> mandatory sources. Run the `context-builder` skill (`*init` or
> `*update` mode) to generate the missing governance files, then
> re-run `/relay-prd`.

### P2 — Draft-path specific preconditions

These checks apply only when `mode == draft-path`:

- The file at `draft_path` exists and is readable (already verified
  by the mode-detection step above, but re-confirm explicitly).
- Parse the draft's trailing status line. If it contains
  `*Status: APPROVED*`, HALT with:

  > The file at `<draft_path>` is already marked APPROVED.
  > `/relay-prd` will not modify an APPROVED PRD. If you want to run
  > a new authoring session against it, manually flip its status
  > back to `DRAFT` (edit the trailing `*Status:*` line) or copy/
  > rename the file, then re-run `/relay-prd` on the DRAFT file.

  Exit without invoking the Writer.

- Other status values (`DRAFT`, missing status line, or anything
  else) → proceed. The Writer handles partial/malformed drafts via
  its skip-on-answered logic.

---

## Phase A — Adopt the Writer role

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/agents/prd-writer.md`.

Execution context to pass into the Writer's Phase 0 setup:

- `mode`: the value determined above.
- `description`: the raw `$ARGUMENTS` (only when `mode == description`).
- `draft_path`: the resolved absolute path (only when
  `mode == draft-path`).
- `target_root`: the cwd.

Run Phases 1 through 7 as specified. At Phase 3 GROUNDING (and
conditionally Phase 5), invoke the research subagents:

```
Task(subagent_type="research-web", prompt=<topic + focus_areas>)
Task(subagent_type="research-codebase", prompt=<topic + focus_areas + roots>)
```

Prefer parallel invocation (single message, both `Task` calls) in
Phase 3. Phase 5 is at most one targeted re-invocation.

The Writer's Phase 7.6 confirmation (`DRAFT written to ...`) is the
handoff signal. At that point, record the final DRAFT path and
proceed to Phase B.

### If the Writer halts

Possible Writer halt conditions (all specified in the Writer
protocol):

- Decision Gate consultation fails (Phase 7.1) — one of the three
  sources could not be read mid-flow. Surface the Writer's halt
  message verbatim and exit. Do not invoke the Reviewer.
- Decision Gate `HALT (reason)` in Phase 7.2 — a rule conflict
  emerged. Surface the conflict to the user, ask how to proceed,
  and (at the user's direction) either restart the Writer from the
  appropriate phase or exit.

---

## Phase B — Adopt the Reviewer role

Capture the dispatch instant immediately before adopting the
Reviewer role: `date -u +%Y-%m-%dT%H:%M:%SZ`.

Follow the protocol in
`${CLAUDE_PLUGIN_ROOT}/agents/prd-reviewer.md`.

Execution context:

- `draft_path`: the path returned by the Writer.
- `target_root`: the cwd.
- `review_started_at`: the instant captured immediately above.
- `invocation_context: main`. You adopt the Reviewer protocol *inside
  this command's main conversation*, so the user's messages reach the
  Reviewer directly. The two-condition approval gate (rubric pass AND
  explicit user approval) is satisfiable here, and the Reviewer owns
  the `DRAFT → APPROVED` flip inline (Step 4 of its protocol). This is
  the ONLY place the flip happens in a `/relay-prd` session — do not
  delegate it elsewhere.

> **Note — subagent dispatch is a different contract.** `/relay-prd`
> never dispatches `prd-reviewer` via `Task`; it adopts the role in
> `main` mode as above. An orchestrator that DOES dispatch the Reviewer
> as a subagent runs it in `subagent` mode, where the Reviewer returns
> `RUBRIC_PASSED` and the *dispatcher* — after obtaining the user's own
> approval in the main conversation — owns the flip. See the Reviewer's
> "## Invocation context and flip ownership" and the `docs/decisions.md`
> [2026-07-09] entry.

Run the Reviewer protocol: load, rubric, branch on result. The
Reviewer either:

- Reaches the final flip (Step 4 of its protocol) → surface its
  `APPROVED` summary to the user and exit.
- Returns `CHANGES_REQUESTED` and enters the dialogue loop (Step 5)
  → let the loop run. The loop either converges on `APPROVED` (exit
  as above) or the user explicitly aborts the session.

### If the user aborts during review

An explicit abort ("cancelar", "abort", "stop") leaves the DRAFT on
disk (status `DRAFT`). Inform the user of the file path and exit:

> Session aborted. DRAFT preserved at
> `PRPs/prds/<basename>.prd.md`. You can resume later by running
> `/relay-prd PRPs/prds/<basename>.prd.md` (draft-path mode).

---

## Final output surface

On successful approval, the last user-facing message is the
Reviewer's approval summary. Do not append anything.

On halt or abort, the user-facing message explains the reason and
names the DRAFT path (if any).

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** PRDs live at
  `PRPs/prds/<feature>.prd.md`; review logs at
  `PRPs/prds/<basename>.review.jsonl`. Nothing else goes on disk.
- **Never approve without the user's own confirmation.** The Reviewer's
  final flip requires both rubric pass AND the user's explicit approval
  in dialogue. In `main` mode (this command) the Reviewer waits for the
  user before flipping. A relayed or secondhand approval is never
  sufficient — if a coordinator ever runs the Reviewer as a subagent,
  the flip stays with the coordinator and still requires the user's own
  approval, never a relayed one.
- **Never overwrite an APPROVED PRD.** P3 refuses draft-path
  invocations against APPROVED files; the Writer's Phase 7.3
  collision-suffix rule handles the write-time case.
- **Never invoke the Writer when a precondition failed.** HALT
  before adopting the Writer role.
- **Never skip the Decision Gate evidence block.** Both the
  command-level gate (above) and the Writer's in-PRD Decision Gate
  block are mandatory.
- **Never fabricate research findings.** If both `research-web` and
  `research-codebase` degrade, the Research Summary documents the
  gap.

---

## What you do NOT do

- **Planning, TDD, implementation, tests** — those are downstream
  commands (`/relay-plan`, `/relay-write-test`, `/relay-implement`,
  `/relay-test`). `/relay-prd` produces the APPROVED PRD that
  `/relay-execute` then drives through the pipeline.
- **Reopening an APPROVED PRD** — out of scope for the MVP per the
  PRD Authoring PRD Open Questions #1 resolution. Manual hand-edit
  is the documented escape hatch.
- **Figma-to-spec preprocessing** — separate future PRD.
- **Cross-project PRDs** — `/relay-prd` writes to the current
  repository's `PRPs/prds/`. Multi-repo coordination is out of
  scope.
