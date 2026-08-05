---
description: 'Deterministic infra command (Figma Visual-First Track, Phase 6; no writer/reviewer pair, mirroring relay-worktree.md/relay-commit.md/relay-pr.md) — the third interactivity-boundary extension in relay, confined entirely to this standalone command. Locates the single unresolved AWAITING_VISUAL_APPROVAL halt for <feature>, surfaces the fidelity report plus derived captured/reference PNG paths, requires explicit confirmation, and records the decision via a single Edit on the phase halt.json plus an appended audit jsonl line; on rejection, captures free-text feedback for the resume path (relay-execute.md Phase A.2.5) to route into the implementer next attempt. Never invoked by /relay-execute.'
argument-hint: <feature-name>
---

# /relay-visual-approve

**Arguments:** `$ARGUMENTS`

---

## Your mission

Serve the human side of the Figma Visual-First Track's `human`-mode approval gate: locate the single unresolved `AWAITING_VISUAL_APPROVAL` halt for the given `<feature>`, surface the captured evidence (fidelity report, per-frame status, captured/reference PNG paths), require an unambiguous, affirmative-or-negative confirmation before recording either decision, and record the decision on the phase's own `halt.json` plus an appended audit line. This is relay's third interactivity-boundary extension (after PRD approval and the Design Spec pair), confined entirely to this standalone, explicitly human-triggered command — never invoked by `/relay-execute`.

You are deterministic infra: no writer/reviewer pair, no rubric, no LLM judgment beyond interpreting the human's own reply. You do not resume the pipeline yourself — that is `/relay-execute`'s job (Phase A.1's resumable visual-approval check + Phase A.2.5's resume short-circuit) on a later re-invocation. You do not perform any D8 mutation. You do not query the Figma MCP.

See:
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-execute.md` — Phase A.1's resumable visual-approval check and Phase A.2.5's resume short-circuit; the consumer of the `halt.json` `resolution` field this command writes.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` — Phase A.3.4's Terminal-routing paragraph; the exact `halt.json` shape (`outcome`, `phase_scope`, `final_visual_verdict`, `fidelity_report_path`, `attempt_history`, `actionable_recommendation`) this command reads and extends.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-design-map.md` — Phase E; the confirm-then-single-`Edit` discipline this command's own Phase B/C mirror.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-approve.md` — P3; the "already resolved, nothing to do" idempotency-guard shape this command's own P2 mirrors.
- `${CLAUDE_PLUGIN_ROOT}/scripts/visual/compare.mjs` — `frameFilename()`; the captured-PNG naming convention this command reuses to derive a FULL-rung frame's captured screenshot path.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay plugin repo. This command records an explicit, audited human decision that gates a phase's completion; the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` in the target project.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: explicit human-gated decision recording; relay's third interactivity-boundary extension; reuse of Phase 5's halt.json shape; single-Edit-plus-audit-jsonl flip pattern
- Decisions found:
  - {decision 1, e.g. Interactivity boundary: PRD interactive, downstream autonomous (2026-04-19), extended a third time by this command}
  - {decision 2, e.g. Human-gate mechanism: HALT-and-resume, not synchronous dialogue (figma-visual-first-track.prd.md Decisions Log)}
  - {decision 3, e.g. Human-gate resume mechanism: dedicated infra command, single Edit + audit jsonl, rejection routes feedback}
  - ...
- Applicable anti-patterns:
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md) — this command's confirmation lives entirely outside /relay-execute's own loop, which never prompts
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66)
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval, plus deliberately recorded extensions; this command is the third
  - PRPs/ artifact convention; infra commands carry no writer/reviewer pair
- Result: PROCEED | HALT (reason)
```

If the Decision Gate cannot be emitted because one of the three sources is unreadable, fall through to P4 below for the canonical halt message.

---

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty `<feature>` name — the same `<feature>` value `/relay-execute` derives from a PRD basename (`PRPs/prds/<feature>.prd.md`). If the argument is blank/whitespace, HALT with:

> /relay-visual-approve requires a feature name. Usage:
>   /relay-visual-approve <feature-name>
> Example:
>   /relay-visual-approve figma-visual-first-track

Record `feature` as the trimmed argument.

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail. The HALTs are surfaced verbatim and the command exits without performing any mutation.

### P1 — `<feature>` argument present

Already enforced by `## Parse arguments` above — a blank `$ARGUMENTS` HALTs before this point is reached. Recorded here only for structural symmetry with every sibling command's own `P1` slot.

### P2 — Locate the unresolved halt

`Glob` `PRPs/reports/<feature>/phase-*/halt.json`. For each match, `Read` it; keep only entries with `outcome == "AWAITING_VISUAL_APPROVAL"` AND no `resolution` field.

- If zero remain: HALT `FAILED_NOTHING_TO_APPROVE`:

  > FAILED_NOTHING_TO_APPROVE: No unresolved AWAITING_VISUAL_APPROVAL halt
  > was found for `<feature>`. Either no phase is currently paused on
  > visual approval, or it was already resolved — re-run
  > `/relay-execute PRPs/prds/<feature>.prd.md` to check current status.

- If more than one remains: HALT `FAILED_MULTIPLE_PENDING_APPROVALS`, naming every matched `phase-<N>` path:

  > FAILED_MULTIPLE_PENDING_APPROVALS: More than one unresolved
  > AWAITING_VISUAL_APPROVAL halt was found for `<feature>`:
  > `<list of matched phase-<N> paths>`. This is unexpected under this
  > track's serial execution model (D6) — inspect by hand.

- Otherwise: record the single match's `<N>` (parsed from its own `phase-<N>/` path segment) and its parsed JSON as `halt_state`.

### P3 — Locate the plan

`Glob` `PRPs/plans/<feature>-phase-<N>-*.plan.md` (using the `<N>` recorded by P2). Exactly one match is expected.

If zero or multiple matches are found, HALT `FAILED_PLAN_AMBIGUOUS` (mirrors Phase A.2.5's own `FAILED_RESUME_PLAN_AMBIGUOUS` in shape):

> FAILED_PLAN_AMBIGUOUS: `PRPs/plans/<feature>-phase-<N>-*.plan.md` matched
> `<count>` file(s) (expected exactly 1). Inspect `PRPs/plans/` by hand,
> remove or rename any stray duplicate, and re-run
> `/relay-visual-approve <feature>`.

Otherwise, record `plan_path`.

### P4 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the byte-exact pattern shared by every relay command:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-visual-approve.
> No decision has been recorded and no halt.json has been modified.

---

## Phase A — Surface the evidence

`Read` `halt_state.fidelity_report_path`. For each frame entry:

- When `status` is `PASS`/`FAIL` (FULL rung — `masked_regions` field present): derive the captured PNG path as `<dirname of fidelity_report_path>/captured/<node_id with [:/\\] replaced by '-'>.png` (mirroring `compare.mjs`'s own `frameFilename()`), and the reference PNG path by reading `plan_path`'s `## Design Source` table (or, if absent, the Design Spec it references) for that `node_id`'s own declared ref-PNG column — never re-derived independently of that authoritative source.
- When `status` is `DEGRADED_STATIC_ONLY`/`DEGRADED_PROVISION_FAILED` (degraded rung — `token_conformant` field present, no `masked_regions`): no captured PNG exists at all; surface this explicitly ("no capture — degraded rung, pixel comparison did not run") rather than asserting a path.

Print a structured summary: feature, phase `<N>` and its `Phase` name (read from the source PRD row), `final_visual_verdict`, the per-frame status list with capture/ref paths (or the degraded no-capture note), and `halt_state.actionable_recommendation`.

## Phase B — Explicit confirmation

Mirror `/relay-design-map`'s Phase E precisely: print the exact effect that will occur (which `halt.json` fields will flip, and that an audit `jsonl` line will be appended), then ask for an explicit, quoted, affirmative or negative reply. Distinguish three outcomes:

- An unambiguous affirmative reply (e.g. the user typing "yes", "approve", "confirm", or an equivalent unambiguous affirmative in their own words) → approve.
- An unambiguous negative reply (e.g. "no", "reject" — with optional accompanying feedback text explaining what needs to change) → reject.
- Anything else — silence, an ambiguous reply, a non-answer, or a generic "continue" — MUST be treated as "do not flip": print a note that the halt remains unresolved and that re-running `/relay-visual-approve <feature>` later is safe, then exit 0 with zero mutation.

Never proceed on inferred consent. Never flip on silence.

## Phase C — Record the decision

**On approval:** perform a single `Edit` on the located `halt.json` — `old_string`/`new_string`/`replace_all: false`, anchored on the file's own closing structure — adding:
- `resolution: "approved"`
- `resolved_at: "<ISO timestamp>"`
- `resolver_confirmation: "<verbatim user reply>"`

Append one line to `PRPs/reports/<feature>/phase-<N>/visual-approval.jsonl`:

```json
{"timestamp": "<ISO timestamp>", "feature": "<feature>", "phase_N": <N>, "decision": "approved", "confirmation_text": "<verbatim reply>", "fidelity_report_path": "<path>"}
```

Emit success plus: "Next: re-run `/relay-execute PRPs/prds/<feature>.prd.md` to resume — it will pick up this exact phase via Phase A.1's resumable visual-approval check."

**On rejection:** perform a single `Edit` on the same `halt.json` adding:
- `resolution: "rejected"`
- `resolved_at: "<ISO timestamp>"`
- `resolver_confirmation: "<verbatim user reply>"`
- `rejection_feedback: "<the user's stated reason>"`

Append one line to the same `visual-approval.jsonl` with `"decision": "rejected"` and a `"rejection_feedback"` field.

Emit success plus: "Next: re-run `/relay-execute PRPs/prds/<feature>.prd.md` — your feedback will be passed to the implementer's next attempt automatically via Phase A.2.5's resume short-circuit."

Both branches mutate `halt.json` exactly once and append exactly one `visual-approval.jsonl` line — never more, never independently, never any other field.

---

## Final output surface

### Success — approved

> ✅ Phase `<N>` (`<Phase name>`) visual approval recorded: **approved**.
> `halt.json` updated at `PRPs/reports/<feature>/phase-<N>/halt.json`.
> Audit entry appended to `PRPs/reports/<feature>/phase-<N>/visual-approval.jsonl`.
> Next: re-run `/relay-execute PRPs/prds/<feature>.prd.md` to resume — it
> will pick up this exact phase via Phase A.1's resumable visual-approval
> check.

### Success — rejected

> ✅ Phase `<N>` (`<Phase name>`) visual approval recorded: **rejected**.
> `halt.json` updated at `PRPs/reports/<feature>/phase-<N>/halt.json`.
> Audit entry appended to `PRPs/reports/<feature>/phase-<N>/visual-approval.jsonl`.
> Next: re-run `/relay-execute PRPs/prds/<feature>.prd.md` — your feedback
> will be passed to the implementer's next attempt automatically via
> Phase A.2.5's resume short-circuit.

### Success — declined / ambiguous (no mutation)

> No decision recorded — your reply was not an unambiguous affirmative or
> negative. The halt at `PRPs/reports/<feature>/phase-<N>/halt.json`
> remains unresolved. Re-running `/relay-visual-approve <feature>` later
> is safe.

### HALT paths

`FAILED_NOTHING_TO_APPROVE`, `FAILED_MULTIPLE_PENDING_APPROVALS`, `FAILED_PLAN_AMBIGUOUS` — each surfaced verbatim per its own Precondition above, plus the standard Decision-Gate-unreadable `P4` HALT. In every HALT case, zero mutation has occurred.

---

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** All artifacts (`halt.json` edit, `visual-approval.jsonl` append) go under `PRPs/reports/<feature>/phase-<N>/`.
2. **Never mutate any `halt.json` field other than the four additions.** `resolution`, `resolved_at`, `resolver_confirmation`, and (on rejection only) `rejection_feedback` are the only fields this command ever adds. Every field `/relay-implement` originally wrote (`outcome`, `phase_scope`, `final_visual_verdict`, `fidelity_report_path`, `attempt_history`, `actionable_recommendation`) is read-only from this command's perspective.
3. **Never flip on inferred consent, silence, or a generic "continue".** Mirrors `relay-design-map.md`'s own confirmation discipline verbatim in spirit — an ambiguous or non-affirmative, non-negative reply always means "do not flip".
4. **Never invoked by `/relay-execute`.** This command is exclusively human-triggered, exactly like `/relay-design-map` and `/relay-design-spec`.
5. **No `Bash` dependency.** `Read`/`Glob`/`Edit`/`Write` only — no new `.claude/settings.json` allowlist entry is required (confirmed against `${CLAUDE_PLUGIN_ROOT}/resources/settings-allowlist.md`).

---

## What you do NOT do

- **Resuming the pipeline itself** — that is `/relay-execute`'s job, via Phase A.1's resumable visual-approval check and Phase A.2.5's resume short-circuit.
- **Performing any D8 mutation** — plan status flips, plan archival, and source PRD row flips remain exclusively `/relay-implement`'s (via `/relay-execute`'s adoption).
- **Dispatching any writer/reviewer pair** — this is deterministic infra; there is no rubric and no LLM judgment surface beyond interpreting the human's own reply.
- **Querying the Figma MCP** — no such tool is in this command's surface; all evidence is already persisted on disk by the original `/relay-implement` session.
