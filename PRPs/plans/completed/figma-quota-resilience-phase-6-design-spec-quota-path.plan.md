# Feature: Design-spec quota path (Phase 6 of figma-quota-resilience)

```
**Decision Gate**
- Active context: none
- Activated criteria: prose-only modification to two existing agent files (`design-spec-writer`, `design-spec-reviewer`) and one existing standalone command (`relay-design-spec`); no new agent, no new command, no new Decision Gate entry; the new quota-detection/degradation logic must stay inline in the Writer's own session (never delegated), mirroring the existing MCP-access-point discipline
- Decisions found:
  - [2026-07-22] MCP-access spike — Figma MCP calls stay in the interactive session; `design-spec-writer` already performs all its own Figma MCP calls inline (never `Task`-dispatched) per the [2026-07-23] Design Spec pair entry. This phase's new quota-detection logic extends that same inline discipline; it introduces no new dispatch surface.
  - [2026-07-23] Design Spec pair is relay's second interactivity-boundary extension — `design-spec-writer`/`design-spec-reviewer` are inline-adopted by `/relay-design-spec`, never `Task`-dispatched; this phase's changes stay entirely within that already-approved inline architecture.
  - [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder — named rungs, exhaustive outcome mapping, "fail toward the safer rung" default. The precedent this phase's `DEGRADED_NO_TOKENS`/partial-evidence branch clones, applied to `design-spec-writer`'s own Phase 2 traversal instead of `/relay-implement`'s visual verification.
  - [2026-05-06] / [2026-07-10] R-X strict (the Implementer authors zero test files; the test pair is the only authorized creator/updater of test files) — grounding confirmed no existing test pins the specific content this phase changes, so no `EXISTING_TEST_UPDATED` routing is triggered by this plan's own tasks (see `## Notes`).
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/` — not directly implicated (this phase edits only `plugins/relay/` agent/command files, writes no new `PRPs/` artifact), recorded for completeness per the Decision Gate's mandatory consultation.
- Applicable anti-patterns:
  - "Querying the Figma MCP from a dispatched writer/reviewer agent" — not implicated: `design-spec-writer` already performs its Figma MCP calls inline (an approved, deliberate divergence from this anti-pattern, per its own explicit carve-out in `docs/anti-patterns.md`); this phase adds no new dispatch.
  - "Writing pipeline artifacts under `.claude/`" — not implicated; this phase writes no new artifact path at all, only edits three existing `plugins/relay/` source files.
- Applicable architectural rules:
  - `docs/context/architecture.md` — "design-spec-writer... queries the Figma MCP directly in its own session by design" (Interactivity boundary section) — this phase's quota-detection logic must stay inside that same inline session.
  - `${CLAUDE_PLUGIN_ROOT}` resolves to `plugins/relay/`, and plugin install is a verbatim directory copy — this phase introduces no new resource reference and touches no `plugins/relay/resources/` file (confirmed by direct read: `design-spec-template.md` has no rung/degradation field today, and this phase does not add one there).
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-quota-resilience.prd.md` — Implementation Phases row 6:
  "Design-spec quota path" — Goal: `/relay-design-spec` has a defined
  outcome under quota exhaustion. — Success signal: A refused traversal
  produces a degraded spec with an accurate diagnosis rather than a
  deadlock, and the exhaustion offer never proposes a re-traversal that
  is guaranteed to fail.

## Summary

Phase 6 gives `design-spec-writer`'s own Phase 2 traversal (its
evidence-gathering phase, distinct from this PRD's Implementation
Phase 2) a defined outcome when a Figma MCP call is refused mid-run,
instead of the unconditional exit gate it has today. The gate is
replaced with a named, three-branch evidence-completeness check
covering the three symmetric evidence surfaces the traversal writes —
`raw/` (nodes), `refs/` (screenshots), `raw/variables.json`
(tokens) — that narrows scope with a loud note when some evidence is
missing, sets a new `DEGRADED_NO_TOKENS` rung when tokens specifically
are absent, and HALTs with `FAILED_FIGMA_QUOTA_EXHAUSTED` only when
literally nothing was gathered. `design-spec-reviewer`'s R-DS4 is
updated to report "tokens not collected" (an honest degraded
declaration, not a failure) rather than "token does not resolve" (a
real per-value mismatch) when `variables.json` is absent.
`relay-design-spec.md` gains a third "If the Writer halts" entry for
the new HALT, a session-scoped cumulative Figma-call counter carried
across both of the session's re-traversal entry points, and a rewrite
of the `max_spec_review_retries` exhaustion offer that displays that
counter and suppresses the "retry with corrected inputs" outcome when
the most recent round degraded on quota. This is a prose-only,
three-file change with a deliberately tight blast radius: row 6 is a
leaf in the Implementation Phases table (nothing depends on it) and
the only phase outside this PRD's MVP.

## User Story

As the relay operator running `/relay-design-spec` against a Figma
design whose traversal calls get refused partway through (most often
by a spent Figma MCP quota),
I want the Design Spec Writer to produce an honestly-labeled, useful
DRAFT from whatever evidence it did gather — or to halt cleanly when it
gathered nothing — instead of deadlocking on an evidence gate that can
never be satisfied again,
So that a quota interruption costs me a degraded-but-usable spec (or a
clear, actionable halt) instead of a silent hang, and so that the
review-retry loop never wastes my time offering a "retry" that is
guaranteed to fail again against the same spent quota.

## Problem Statement

`design-spec-writer`'s Phase 2 traversal ends with an unconditional
exit gate ("Do not proceed to Phase 3 until every in-scope node has a
persisted evidence file under `raw/` and every in-scope frame has a
persisted reference screenshot under `refs/`.") that assumes every
Figma MCP call in the chunked traversal (`get_design_context`,
`get_variable_defs`, `get_screenshot`) succeeds. It does not: none of
the writer, the reviewer, or the command has any quota-detection logic
today (confirmed by grounding — zero hits for "quota" across all three
files), so a refusal on any of those three calls — most commonly a
spent Figma MCP quota mid-traversal — leaves the gate permanently
unsatisfied. Compounding this, `design-spec-reviewer`'s R-DS4 has no
language distinguishing "tokens were never collected because
`variables.json` is absent" from "a value was evaluated against a
present `variables.json` and still doesn't resolve" — the same wording
would describe both, obscuring the real cause. And
`relay-design-spec.md`'s `max_spec_review_retries` exhaustion offer
always proposes "retry with corrected inputs" as its first option, even
when the underlying cause of every failed round was a quota refusal
that "corrected inputs" cannot fix — the retry is certain to fail
again for a reason no input change addresses.

## Solution Statement

Replace the unconditional exit gate with a named, exhaustive
evidence-completeness branch precisely mirroring the degradation-ladder
idiom this plugin already uses (`visual-verifier.md`,
`design-map-writer.md`): full evidence proceeds unchanged (rung
`FULL`); partial evidence narrows the in-scope node/frame set to what
was actually persisted, with a loud note naming every exclusion (the
same narrowing idiom `design-spec-writer`'s own Hard Constraint 7
already uses for the `max_figma_nodes` cap), and sets rung
`DEGRADED_NO_TOKENS` specifically when `raw/variables.json` is absent;
zero evidence gathered at all HALTs with `FAILED_FIGMA_QUOTA_EXHAUSTED`
rather than writing a spec grounded in nothing. Quota detection reuses
`relay-design-map.md`'s already-shipped error-class/string idiom
verbatim (never HTTP status — Figma's MCP documents neither `429` nor
`Retry-After`). `design-spec-reviewer`'s R-DS4 gains an explicit
if/else on `variables.json`'s presence so "tokens not collected" (the
absent-file case, not a failure when honestly declared) and "token
does not resolve" (the present-but-mismatched case, a real failure)
never share the same reason string.
`relay-design-spec.md` gains a third "If the Writer halts" bullet, a
`cumulative_figma_calls` / `last_round_quota_degraded` pair tracked
across the session's two re-traversal entry points (the exhaustion
offer's own "retry" outcome, and the Reviewer's Step 5 "fresh Writer
pass" branch), and a rewritten exhaustion offer that displays the
running total and drops the "retry with corrected inputs" outcome
entirely when the most recent round degraded on quota.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (agent/command prose behavioral change) |
| Complexity | Medium — three files, but each edit is a self-contained, narrowly-scoped prose rewrite (a gate, a rubric item, two command-level blocks); no new file, no new agent, no new command, no template change |
| Systems Affected | `design-spec-writer` agent, `design-spec-reviewer` agent, `/relay-design-spec` command (all three shipped as Figma Implementation Track Phase 4; this plan is `figma-quota-resilience`'s own, distinct Phase 6, modifying the same files for a different feature) |
| Dependencies | Phase 3 (Quota preflight + named failure) — complete; Implementation Phases row 6 `Depends: 3` |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/figma-quota-resilience.prd.md:203` (Implementation Phases row 6); Phase Details `PRPs/prds/figma-quota-resilience.prd.md:232-236` |
| phase_type | feature |

(`design_source` / `phase_scope` rows are not added: this repository's
`docs/context/methodology.md` does not declare `figma_track`, and the
source PRD has no `## Visual-First Mode` section — both conditional
rows are correctly absent, and no `## Design Source` section follows
this table, matching Phase 3's plan determination for the same
repository.)

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/design-spec-writer.md` | 160-194 | Current Phase 2 traversal (5 numbered steps + the unconditional two-line exit gate) — the exact block Tasks 1-3 rewrite. |
| P0 | `plugins/relay/agents/design-spec-reviewer.md` | 169-181 | Current R-DS4 rubric item — the exact block Task 4 rewrites. |
| P0 | `plugins/relay/commands/relay-design-spec.md` | 176-190 | Phase A's handoff-capture sentence + "If the Writer halts" (currently 2 bullets) — the exact block Task 5 rewrites. |
| P0 | `plugins/relay/commands/relay-design-spec.md` | 224-260 | `max_spec_review_retries` exhaustion-offer block (currently 2 outcomes) — the exact block Task 6 rewrites. |
| P1 | `plugins/relay/agents/design-map-writer.md` | 222-229 | Rung-computation idiom (`DEGRADED_NO_ENRICHMENT` / `DEGRADED_PARTIAL_INVENTORY` / `FULL`, disk-derived, written into the artifact itself, mirroring `visual-verifier.md:142`) — the precedent Tasks 2-3's `DEGRADED_NO_TOKENS` rung and artifact-visible recording mirror. |
| P1 | `plugins/relay/agents/visual-verifier.md` | 83-90 | Hard constraints 3-6, especially #4 ("Never silently skip a degradation-ladder rung ... fail toward the safer degraded rung, never toward silently reporting `FULL`") — the idiom Task 1's new Hard Constraint 10 mirrors. |
| P1 | `plugins/relay/agents/design-spec-writer.md` | 102-105 | Hard Constraint 7's `max_figma_nodes` narrowing idiom ("narrow scope with a loud, visible note ... never silently truncate") — the idiom Task 2's `raw/`/`refs/` narrowing branch mirrors. |
| P1 | `plugins/relay/commands/relay-design-map.md` | 227-273 | Quota-exhaustion detection (error class/string, never HTTP status) + the full `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT message shape — the idiom Task 2's quota-detection clause and Task 5's HALT bullet mirror. |
| P2 | `docs/decisions.md` | 741-749 | [2026-07-22] MCP-access spike — binds this phase's new quota-detection logic to stay inline in `design-spec-writer`'s own session, never delegated. |
| P2 | `docs/decisions.md` | 801-816 | [2026-07-23] Visual-verification loop — the ur-precedent for a bounded, non-blocking degradation ladder inside relay, cited by the PRD's own Decision Gate block. |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/design-spec-writer.md:192-194
```
Do not proceed to Phase 3 until every in-scope node has a persisted
evidence file under `raw/` and every in-scope frame has a persisted
reference screenshot under `refs/`.
```
Used by: Task 2 — the exact unconditional gate replaced by the named
evidence-completeness branch.

# SOURCE: plugins/relay/agents/design-spec-writer.md:102-105
```
7. **Hard cap `max_figma_nodes = 20`.** If the traversal would exceed
   20 in-scope nodes, narrow scope with a loud, visible note to the
   user (naming which nodes were excluded and why) — never silently
   truncate the frame inventory.
```
Used by: Task 2 — the exact narrow-with-a-loud-note idiom the
partial-evidence branch's `raw/`/`refs/` narrowing reuses.

# SOURCE: plugins/relay/agents/design-map-writer.md:222-229
```
**Rung computation.** Mirroring `visual-verifier.md:88`'s "fail
toward the safer degraded rung" idiom (worse condition wins):
`rung = "DEGRADED_PARTIAL_INVENTORY"` when `inventory_truncated:
true`; else `rung = "DEGRADED_NO_ENRICHMENT"` when
`enrichment_truncated: true`; else `rung = "FULL"`. This `rung`
value is written into the map itself, not only surfaced in the
writer's handoff summary — making degradation visible in the
artifact, not only to the caller (mirroring `visual-verifier.md:142`).
```
Used by: Tasks 2-3 — the exhaustive-outcome-mapping + artifact-visible
recording idiom the `DEGRADED_NO_TOKENS` rung (set in Task 2, reported
in Task 3's Phase 5.6 handoff) mirrors.

# SOURCE: plugins/relay/agents/visual-verifier.md:88
```
4. **Never silently skip a degradation-ladder rung.** Every `provision.mjs`/`capture.mjs` outcome maps to exactly one of: proceed `FULL`, `DEGRADED_STATIC_ONLY`, or `DEGRADED_PROVISION_FAILED`. An unrecognized exit code from `provision.mjs` is treated as `DEGRADED_PROVISION_FAILED` — fail toward the safer degraded rung, never toward silently reporting `FULL`.
```
Used by: Task 1 — the exact "exhaustive outcome mapping, fail toward
the safer rung" shape the new Hard Constraint 10 restates for
`design-spec-writer`'s own Phase 2 refusals.

# SOURCE: plugins/relay/commands/relay-design-map.md:227-232
```
Any of this phase's two load-bearing Figma MCP data calls
(`search_design_system`, `get_metadata`) that fails with a
quota-exhaustion error HALTs immediately with
`FAILED_FIGMA_QUOTA_EXHAUSTED` — detection is by error class/string
match, never by HTTP status, since Figma's MCP documentation defines
neither `429` nor `Retry-After`. No retry, no backoff: sleeping is
useless against a per-day or per-month bucket.
```
Used by: Task 1 (Hard Constraint 10's detection rule) and Task 2 (the
per-call refusal-detection clauses on `get_design_context`,
`get_variable_defs`, `get_screenshot`).

# SOURCE: plugins/relay/commands/relay-design-map.md:673
```
- `FAILED_FIGMA_QUOTA_EXHAUSTED` — Phase B: a Figma MCP data call failed with a quota-exhaustion error; no retry, no backoff.
```
Used by: Task 5 — the exact `` `CODE` — <phase label>: <terse reason>. ``
bulleted-HALT-code shape (adapted here to a narrative "If the Writer
halts" bullet rather than a bare HALT-paths list entry, since
`relay-design-spec.md`'s existing two bullets use the narrative form).

# SOURCE: plugins/relay/agents/design-spec-reviewer.md:169-181
```
### R-DS4 — Every color/spacing/font resolves to a token or is justified

Every value referenced in `## Token Map` either resolves to a real
token (cross-checked against `raw_dir`'s persisted `variables.json`,
or the project's token module when `docs/context/design-system.md` is
available) or carries an explicit raw-value justification (e.g. "one-
off value, no matching token — intentional per Figma design"). The
Token Map is embedded as a real table in the spec body — not a pointer
to `raw/`.

**Fails when:** `## Token Map` is a pointer/placeholder instead of an
embedded table, or any row's value neither resolves to a token nor
carries an explicit justification.
```
Used by: Task 4 — the exact block rewritten to add the
`raw_dir/variables.json`-presence if/else.

# SOURCE: plugins/relay/commands/relay-design-spec.md:180-188
```
### If the Writer halts

- **Decision Gate consultation fails** (Writer's Phase 5.1) — one of
  the three sources could not be read mid-flow. Surface the Writer's
  halt message verbatim and exit. Do not adopt the Reviewer role.
- **Decision Gate `HALT (reason)`** (Writer's Phase 5.2) — a rule
  conflict emerged. Surface the conflict to the user, ask how to
  proceed, and (at the user's direction) either restart the Writer
  from the appropriate phase or exit.
```
Used by: Task 5 — the exact narrative-bullet shape the new third bullet
joins.

# SOURCE: plugins/relay/commands/relay-design-spec.md:224-251
```
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
```
Used by: Task 6 — the exact block rewritten to display
`cumulative_figma_calls` and drop outcome 1 when
`last_round_quota_degraded` is `true`.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/design-spec-writer.md` | UPDATE | New Hard Constraint 10 (degradation-branch discipline); Phase 2 traversal steps 3-5 gain per-call refusal detection; the unconditional exit gate is replaced by the named evidence-completeness branch (`raw/`/`refs/` narrowing, `DEGRADED_NO_TOKENS` rung, `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT); Phase 5.6 handoff reports the rung and the Figma-call count (AC-15, AC-16 support). |
| `plugins/relay/agents/design-spec-reviewer.md` | UPDATE | R-DS4 distinguishes "tokens not collected" (honest `DEGRADED_NO_TOKENS` declaration, not a failure) from "token does not resolve" (real per-value mismatch against a present `variables.json`) (AC-15). |
| `plugins/relay/commands/relay-design-spec.md` | UPDATE | Third "If the Writer halts" bullet for `FAILED_FIGMA_QUOTA_EXHAUSTED`; session-level `cumulative_figma_calls`/`last_round_quota_degraded` tracking; the `max_spec_review_retries` exhaustion offer displays the cumulative count and suppresses outcome 1 when the most recent round was quota-degraded (AC-16). |

## NOT Building (Scope Limits)

- **An embedded REST fallback** — rejected outright by the source
  PRD's "What We're NOT Building".
- **Retry/backoff against the Figma MCP** — explicitly rejected; this
  phase adds abort-and-record (zero evidence) or degrade-and-continue
  (partial evidence) only, never a sleep-and-retry loop.
- **A `whoami`-based cost preflight for `/relay-design-spec`** — not in
  this phase's scope. The source PRD's Phase 6 Scope text names only
  the partial-evidence branch, `DEGRADED_NO_TOKENS`, the re-traversal
  consumption counter, and the Writer-halts list entry — no preflight.
  That mechanism (Phase 3 of this PRD) belongs to `/relay-design-map`
  only.
- **Automatic quota-exhaustion refusal** — not applicable here either;
  this phase introduces no consent gate for `design-spec-writer` to
  auto-refuse through.
- **Touching `plugins/relay/resources/design-spec-template.md`** —
  confirmed by direct grounding read: the template has no rung /
  `DEGRADED_*` field today (only per-row `REUSE | NEW | ASSUMPTION` and
  `EXISTS | NEW` verdicts, plus the document-level `*Status:*`
  trailer). This phase records the rung and the degraded-reason
  entirely in prose within the already-templated `## Behavioral Notes`
  and `## Token Map` sections — never a new template field — matching
  the three-file scope this phase's own dispatch confirmed.
- **A cross-command aggregate Figma call budget** — explicitly
  rejected by the source PRD's "What We're NOT Building". The
  `cumulative_figma_calls` counter this phase adds is scoped to a
  single `/relay-design-spec` session; it is never shared across
  commands, sessions, or projects.
- **Evidence-bundle condensation** — deferred to its own PRD per the
  source PRD; not implicated by this phase's file set regardless.
- **Any `*.test.mjs` file** — no task in this plan touches a test
  file. Grounding confirmed no existing test pins the specific content
  this phase changes (see `## Notes`); per R-X strict
  (`docs/decisions.md` [2026-05-06], [2026-07-10]), any future
  test-file authorship for this phase's own new AC surface is the test
  pair's job, not this plan's.

## Step-by-Step Tasks

### Task 1: UPDATE design-spec-writer.md — Hard Constraint 10 (degradation-branch discipline)

- **ACTION**: Immediately after Hard Constraint 9's closing sentence
  ("The `design-spec-reviewer` agent is the one that adds
  `*Approved: ...*` and flips the status. You never emit `APPROVED`.")
  and before the `---` separator that precedes `## Phase 0 — Setup`,
  insert a new Hard Constraint 10:
  ```
  10. **Never silently skip a Phase 2 degradation branch.** Every Figma
      MCP refusal in Phase 2 (`get_design_context`, `get_variable_defs`,
      or `get_screenshot`) resolves to exactly one of: proceed `FULL`,
      the partial-evidence branch (narrowed node/frame scope, or rung
      `DEGRADED_NO_TOKENS`), or — only when zero evidence was gathered
      at all — `FAILED_FIGMA_QUOTA_EXHAUSTED`. Mirrors
      `visual-verifier.md:88`'s "fail toward the safer degraded rung,
      never toward silently reporting FULL" idiom. A quota-exhaustion
      error is detected by error class/string match (e.g. Figma's
      documented exhaustion message shape, "You've reached the Figma
      MCP tool call limit for your `<seat>` seat on the `<plan>`
      plan."), never by HTTP status — Figma's MCP documentation
      defines neither `429` nor `Retry-After`
      (`plugins/relay/commands/relay-design-map.md:227-232`). No
      retry, no backoff.
  ```
  Renumber nothing else — this is a pure append after Hard Constraint 9.
- **MIRROR**: `plugins/relay/agents/visual-verifier.md:88` (the
  "never silently skip a rung ... fail toward the safer degraded rung"
  idiom) and `plugins/relay/commands/relay-design-map.md:227-232` (the
  error-class/string, never-HTTP-status detection rule).
- **AC**: infrastructure for AC-A1, AC-A2, AC-A3, AC-A4 (the shared
  detection/branch-naming discipline Task 2's branch depends on).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/agents/design-spec-writer.md"
  if ! grep -q "^10\. \*\*Never silently skip a Phase 2 degradation branch\.\*\*" "$FILE"; then
    echo "FAIL: Hard Constraint 10 (degradation-branch discipline) not found"
    exit 1
  fi
  if ! grep -q "FAILED_FIGMA_QUOTA_EXHAUSTED" "$FILE"; then
    echo "FAIL: FAILED_FIGMA_QUOTA_EXHAUSTED not referenced in design-spec-writer.md"
    exit 1
  fi
  echo "PASS: Hard Constraint 10 present and references FAILED_FIGMA_QUOTA_EXHAUSTED"
  ```

### Task 2: UPDATE design-spec-writer.md — Phase 2 refusal detection + evidence-completeness branch

- **ACTION**: In Phase 2 (`## Phase 2 — Traversal ...`), extend steps
  3, 4, and 5 with a per-call refusal clause each (non-retry, keep-going
  discipline; when the refusal is a quota-exhaustion error per Hard
  Constraint 10, stop issuing further calls of that surface's own kind
  for the rest of the traversal — a quota-exhaustion error on one call
  type means the same session-wide budget backs the others too), then
  replace the two-line unconditional exit gate
  ("Do not proceed to Phase 3 until every in-scope node has a
  persisted evidence file under `raw/` and every in-scope frame has a
  persisted reference screenshot under `refs/`.") with a new
  `### Evidence-completeness branch (replaces an unconditional exit
  gate)` subsection containing exactly three named outcomes:
  - **Zero evidence gathered at all** (no file under `raw/` other than
    a possible `variables.json`, no file under `refs/`) — HALT with
    `FAILED_FIGMA_QUOTA_EXHAUSTED` when the refusal(s) were
    quota-exhaustion errors; a spec with nothing behind it is worse
    than no spec at all. Point to `relay-design-spec.md`'s "If the
    Writer halts" list for how this HALT propagates.
  - **Partial-evidence branch** (some, but not all, in-scope evidence
    gathered) — for `raw/` incomplete: narrow the in-scope node set to
    exactly the nodes with a persisted `raw/<node-id>.json`, mirroring
    Hard Constraint 7's narrowing idiom (loud note naming every
    excluded node and why); for `refs/` incomplete: same narrowing
    discipline applied to the in-scope frame set feeding `## Frame
    Inventory` / `## Visual Acceptance Criteria`; for
    `raw/variables.json` absent entirely: this loss does not narrow
    scope (no "some tokens in scope" concept) — set rung
    `DEGRADED_NO_TOKENS` and write every `## Token Map` row as
    "tokens not collected — `get_variable_defs` was refused this run"
    instead of attempting a resolution the evidence cannot support.
  - **Full evidence** — every in-scope node/frame/token surface is
    present; rung is `FULL`. Proceed exactly as this gate always did.
  Close the subsection with: "Record the determined rung (`FULL` or
  `DEGRADED_NO_TOKENS`) in `## Behavioral Notes` — visible in the
  artifact itself, not only in this phase's own reasoning (mirroring
  `design-map-writer.md:222-229`). Do not proceed to Phase 3 until this
  branch has been evaluated and — for the HALT case — exited, or — for
  the `DEGRADED_NO_TOKENS`/`FULL` cases — the rung has been determined."
- **MIRROR**: `plugins/relay/agents/design-spec-writer.md:102-105`
  (Hard Constraint 7's narrowing idiom) and
  `plugins/relay/agents/design-map-writer.md:222-229` (rung
  computation, artifact-visible recording).
- **AC**: AC-A1, AC-A2, AC-A3 (rung-setting half), AC-A4 (HALT branch).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/agents/design-spec-writer.md"
  PHASE2_BLOCK=$(awk '/^## Phase 2 — Traversal/{flag=1; next} /^## Phase 3 — Interpretation/{flag=0} flag' "$FILE")
  if [ -z "$PHASE2_BLOCK" ]; then
    echo "FAIL: Phase 2 section not found"
    exit 1
  fi
  for marker in "Evidence-completeness branch" "Partial-evidence branch" "DEGRADED_NO_TOKENS" "FAILED_FIGMA_QUOTA_EXHAUSTED"; do
    if ! printf '%s' "$PHASE2_BLOCK" | grep -q "$marker"; then
      echo "FAIL: Phase 2 section missing marker: $marker"
      exit 1
    fi
  done
  if printf '%s' "$PHASE2_BLOCK" | grep -q "every in-scope node has a persisted"; then
    echo "FAIL: old unconditional exit-gate wording still present"
    exit 1
  fi
  echo "PASS: Phase 2 evidence-completeness branch present with all three named outcomes; old unconditional gate wording removed"
  ```

### Task 3: UPDATE design-spec-writer.md — Phase 5.6 handoff reports rung + call count

- **ACTION**: Rewrite Step 5.6's "Emit exactly:" block from:
  ```
  > DRAFT written to `PRPs/designs/<feature>/design-spec.md`.
  > Decision Gate: **{PROCEED | HALT}**.
  > Handing off to the Design Spec Reviewer for validation.
  ```
  to:
  ```
  > DRAFT written to `PRPs/designs/<feature>/design-spec.md`.
  > Decision Gate: **{PROCEED | HALT}**.
  > Evidence rung: **{FULL | DEGRADED_NO_TOKENS}**. Figma MCP calls
  > issued this pass: **{figma_call_count}**.
  > Handing off to the Design Spec Reviewer for validation.
  ```
  Leave the "Do not emit anything after this line ..." sentence
  immediately below unchanged — it still holds true.
- **MIRROR**: `plugins/relay/agents/design-map-writer.md:222-229`
  ("this `rung` value is written into the map itself, not only
  surfaced in the writer's handoff summary" — here inverted to "also
  surfaced in the handoff", since the Design Spec template gains no
  new field this phase; the handoff line is this phase's own
  artifact-adjacent visibility mechanism for `relay-design-spec.md` to
  consume).
- **AC**: infrastructure for AC-A5, AC-A6 (the command needs this
  reported count/rung to track `cumulative_figma_calls` and
  `last_round_quota_degraded`).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/agents/design-spec-writer.md"
  STEP56=$(awk '/^### Step 5\.6 — Confirm to the user/{flag=1; next} /^---/{flag=0} flag' "$FILE")
  if [ -z "$STEP56" ]; then
    echo "FAIL: Step 5.6 section not found"
    exit 1
  fi
  if ! printf '%s' "$STEP56" | grep -q "Evidence rung"; then
    echo "FAIL: Step 5.6 handoff does not report the evidence rung"
    exit 1
  fi
  if ! printf '%s' "$STEP56" | grep -q "Figma MCP calls"; then
    echo "FAIL: Step 5.6 handoff does not report the Figma MCP call count"
    exit 1
  fi
  echo "PASS: Step 5.6 handoff reports evidence rung and Figma MCP call count"
  ```

### Task 4: UPDATE design-spec-reviewer.md — R-DS4 distinguishes "tokens not collected" from "token does not resolve"

- **ACTION**: In `### R-DS4 — Every color/spacing/font resolves to a
  token or is justified`, insert a new paragraph immediately after the
  existing description paragraph and before the "**Fails when:**"
  line:
  ```
  **Degraded-evidence exception (rung `DEGRADED_NO_TOKENS`).** When
  `raw_dir/variables.json` is absent entirely (the writer's Phase 2
  evidence-completeness branch could not collect tokens this run),
  this item does not fail on missing per-value resolution — instead
  verify every `## Token Map` row honestly states "tokens not
  collected" and report the finding as "tokens not collected" (never
  "token does not resolve", which describes a different failure: a
  value that WAS evaluated against a present `variables.json` and
  still could not be matched).
  ```
  Then rewrite the "**Fails when:**" line to:
  ```
  **Fails when:** `## Token Map` is a pointer/placeholder instead of an
  embedded table; OR `raw_dir/variables.json` is present and a row's
  value neither resolves to a token nor carries an explicit
  justification (report: "token does not resolve"); OR
  `raw_dir/variables.json` is absent and any `## Token Map` row omits
  the "tokens not collected" declaration or attempts a resolution the
  evidence cannot support (report: "tokens not collected" is
  missing/dishonest).
  ```
- **MIRROR**: `plugins/relay/agents/design-spec-reviewer.md:169-181`
  (the exact block rewritten).
- **AC**: AC-A3 (the R-DS4 wording half).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/agents/design-spec-reviewer.md"
  RDS4_BLOCK=$(awk '/^### R-DS4 —/{flag=1; next} /^### R-DS5 —/{flag=0} flag' "$FILE")
  if [ -z "$RDS4_BLOCK" ]; then
    echo "FAIL: R-DS4 section not found"
    exit 1
  fi
  if ! printf '%s' "$RDS4_BLOCK" | grep -q "tokens not collected"; then
    echo "FAIL: R-DS4 does not report 'tokens not collected'"
    exit 1
  fi
  if ! printf '%s' "$RDS4_BLOCK" | grep -q "token does not resolve"; then
    echo "FAIL: R-DS4 does not report 'token does not resolve' for the present-but-mismatched case"
    exit 1
  fi
  RDS_HEADING_COUNT=$(grep -cE '^### R-DS[0-9]+' "$FILE")
  if [ "$RDS_HEADING_COUNT" -ne 7 ]; then
    echo "FAIL: expected 7 ### R-DS<n> headings unchanged, found $RDS_HEADING_COUNT"
    exit 1
  fi
  echo "PASS: R-DS4 distinguishes 'tokens not collected' from 'token does not resolve'; rubric item count unchanged at 7"
  ```

### Task 5: UPDATE relay-design-spec.md — third Writer-halts bullet + session-level call tracking

- **ACTION**: Extend the sentence "The Writer's Phase 5.6 confirmation
  (`DRAFT written to ...`) is the handoff signal. At that point, record
  the final DRAFT path and proceed to Phase B." to also read:
  "... add this pass's reported Figma MCP call count to a running
  session total `cumulative_figma_calls` (initialized `0` at the start
  of Phase A on first adoption, never reset on re-adoption), record
  `last_round_quota_degraded = true` when the Writer's handoff reported
  rung `DEGRADED_NO_TOKENS` (or the Writer instead HALTed with
  `FAILED_FIGMA_QUOTA_EXHAUSTED`), `false` otherwise, and proceed to
  Phase B." Then add a third bullet to `### If the Writer halts`:
  ```
  - **Writer HALTs with `FAILED_FIGMA_QUOTA_EXHAUSTED`** (Writer's
    evidence-completeness branch, Phase 2) — zero evidence was gathered
    because of a quota-exhaustion refusal. Surface the Writer's halt
    message verbatim and exit. Do not adopt the Reviewer role.
  ```
- **MIRROR**: `plugins/relay/commands/relay-design-spec.md:180-188`
  (the exact narrative-bullet shape the third bullet joins) and
  `plugins/relay/commands/relay-design-map.md:673` (the
  `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT-code naming convention, adapted
  to the narrative form this file already uses).
- **AC**: AC-A4 (the Writer-halts list entry) and AC-A5 (the tracking
  mechanism this task introduces).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/commands/relay-design-spec.md"
  HALTS_BLOCK=$(awk '/^### If the Writer halts/{flag=1; next} /^---/{flag=0} flag' "$FILE")
  BULLET_COUNT=$(printf '%s\n' "$HALTS_BLOCK" | grep -cE '^- \*\*')
  if [ "$BULLET_COUNT" -ne 3 ]; then
    echo "FAIL: 'If the Writer halts' must enumerate exactly 3 bullets (found $BULLET_COUNT)"
    exit 1
  fi
  if ! printf '%s' "$HALTS_BLOCK" | grep -q "FAILED_FIGMA_QUOTA_EXHAUSTED"; then
    echo "FAIL: third bullet must name FAILED_FIGMA_QUOTA_EXHAUSTED"
    exit 1
  fi
  if ! grep -q "cumulative_figma_calls" "$FILE"; then
    echo "FAIL: cumulative_figma_calls session tracking not introduced"
    exit 1
  fi
  if ! grep -q "last_round_quota_degraded" "$FILE"; then
    echo "FAIL: last_round_quota_degraded session tracking not introduced"
    exit 1
  fi
  echo "PASS: 'If the Writer halts' has 3 bullets including FAILED_FIGMA_QUOTA_EXHAUSTED; cumulative_figma_calls and last_round_quota_degraded tracking introduced"
  ```

### Task 6: UPDATE relay-design-spec.md — exhaustion offer displays consumption, suppresses outcome 1 on quota-degraded

- **ACTION**: Rewrite the `### Bounded exhaustion — \`max_spec_review_retries = 2\``
  block. Keep the existing tracking paragraph and the first/second
  `CHANGES_REQUESTED` bullet, extended with: "When Step 5's own
  dialogue loop instead determines the defect requires a fresh
  `design-spec-writer` pass (\"If the change requires re-traversing the
  Figma design...\"), the re-adopted Writer's Phase 5.6 handoff feeds
  the SAME `cumulative_figma_calls` / `last_round_quota_degraded`
  tracking established above — this is the second of the two
  user-chosen re-traversal paths whose consumption is carried forward,
  alongside this section's own outcome 1." Rewrite the third-exhaustion
  bullet so that when `last_round_quota_degraded` is `false`, it
  presents both existing outcomes (unchanged text) preceded by "This
  session has issued **`cumulative_figma_calls`** Figma MCP calls so
  far."; and when `last_round_quota_degraded` is `true`, it states
  explicitly that "outcome 1 is suppressed — a re-traversal under an
  exhausted quota is guaranteed to fail" and presents only a single
  renumbered outcome 1 (Abort), whose message also states the session's
  cumulative call count and that the most recent round degraded on a
  Figma quota refusal. Preserve the closing sentence "Never silently
  loop past the budget, and never silently discard the DRAFT on abort."
  unchanged.
- **MIRROR**: `plugins/relay/commands/relay-design-spec.md:224-251`
  (the exact block rewritten).
- **AC**: AC-A6.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/commands/relay-design-spec.md"
  EXHAUST_BLOCK=$(awk '/^### Bounded exhaustion/{flag=1; next} /^The Reviewer either:/{flag=0} flag' "$FILE")
  if [ -z "$EXHAUST_BLOCK" ]; then
    echo "FAIL: Bounded exhaustion section not found"
    exit 1
  fi
  if ! printf '%s' "$EXHAUST_BLOCK" | grep -q "cumulative_figma_calls"; then
    echo "FAIL: exhaustion offer does not display cumulative_figma_calls"
    exit 1
  fi
  if ! printf '%s' "$EXHAUST_BLOCK" | grep -q "last_round_quota_degraded"; then
    echo "FAIL: exhaustion offer does not branch on last_round_quota_degraded"
    exit 1
  fi
  if ! printf '%s' "$EXHAUST_BLOCK" | grep -q "outcome 1 is suppressed"; then
    echo "FAIL: expected explicit statement that outcome 1 is suppressed when the previous round was quota-degraded"
    exit 1
  fi
  echo "PASS: exhaustion offer displays cumulative_figma_calls and suppresses outcome 1 on last_round_quota_degraded"
  ```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
npm run validate
```
Exits non-zero if any of the 12 registered checks fails (real
exit-code semantics via `index.mjs`'s own `process.exitCode = 1` on
any failure). This phase creates, moves, and deletes no files, so
this is a general regression gate (frontmatter still parses, no
dangling path reference introduced), not a proof of this phase's
specific new content — that is Level 2's job.

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail

WRITER="plugins/relay/agents/design-spec-writer.md"
REVIEWER="plugins/relay/agents/design-spec-reviewer.md"
COMMAND="plugins/relay/commands/relay-design-spec.md"

# AC-A1..AC-A4: Phase 2 evidence-completeness branch present, old
# unconditional gate wording gone, Hard Constraint 10 present.
PHASE2_BLOCK=$(awk '/^## Phase 2 — Traversal/{flag=1; next} /^## Phase 3 — Interpretation/{flag=0} flag' "$WRITER")
for marker in "Evidence-completeness branch" "Partial-evidence branch" "DEGRADED_NO_TOKENS" "FAILED_FIGMA_QUOTA_EXHAUSTED"; do
  if ! printf '%s' "$PHASE2_BLOCK" | grep -q "$marker"; then
    echo "FAIL: Phase 2 missing marker: $marker"
    exit 1
  fi
done
if printf '%s' "$PHASE2_BLOCK" | grep -q "every in-scope node has a persisted"; then
  echo "FAIL: old unconditional exit-gate wording still present in Phase 2"
  exit 1
fi
if ! grep -q "^10\. \*\*Never silently skip a Phase 2 degradation branch\.\*\*" "$WRITER"; then
  echo "FAIL: Hard Constraint 10 not found"
  exit 1
fi

# AC-A5/AC-A6 infra: Phase 5.6 handoff reports rung + call count.
STEP56=$(awk '/^### Step 5\.6 — Confirm to the user/{flag=1; next} /^---/{flag=0} flag' "$WRITER")
if ! printf '%s' "$STEP56" | grep -q "Evidence rung"; then
  echo "FAIL: Step 5.6 does not report the evidence rung"
  exit 1
fi

# AC-A3: R-DS4 distinguishes the two reasons.
RDS4_BLOCK=$(awk '/^### R-DS4 —/{flag=1; next} /^### R-DS5 —/{flag=0} flag' "$REVIEWER")
if ! printf '%s' "$RDS4_BLOCK" | grep -q "tokens not collected"; then
  echo "FAIL: R-DS4 does not report 'tokens not collected'"
  exit 1
fi
if ! printf '%s' "$RDS4_BLOCK" | grep -q "token does not resolve"; then
  echo "FAIL: R-DS4 does not report 'token does not resolve' for the present-but-mismatched case"
  exit 1
fi

# AC-A4/AC-A5: relay-design-spec.md's Writer-halts list + session tracking.
HALTS_BLOCK=$(awk '/^### If the Writer halts/{flag=1; next} /^---/{flag=0} flag' "$COMMAND")
BULLET_COUNT=$(printf '%s\n' "$HALTS_BLOCK" | grep -cE '^- \*\*')
if [ "$BULLET_COUNT" -ne 3 ]; then
  echo "FAIL: 'If the Writer halts' must enumerate exactly 3 bullets (found $BULLET_COUNT)"
  exit 1
fi
if ! grep -q "cumulative_figma_calls" "$COMMAND"; then
  echo "FAIL: cumulative_figma_calls tracking not introduced"
  exit 1
fi

# AC-A6: exhaustion offer displays consumption and suppresses outcome 1.
EXHAUST_BLOCK=$(awk '/^### Bounded exhaustion/{flag=1; next} /^The Reviewer either:/{flag=0} flag' "$COMMAND")
if ! printf '%s' "$EXHAUST_BLOCK" | grep -q "outcome 1 is suppressed"; then
  echo "FAIL: exhaustion offer does not state that outcome 1 is suppressed"
  exit 1
fi

echo "PASS: Phase 6 content invariants present across all three files"
```
Fails on the current unmodified tree (none of these markers exist yet
— confirmed by `research-codebase`: zero hits anywhere in the plugin
for "Evidence-completeness branch", "DEGRADED_NO_TOKENS", "tokens not
collected", or `cumulative_figma_calls`); passes once Tasks 1-6 land.

**Level 3 — INTEGRATION / DRY-RUN END-TO-END**
```bash
set -euo pipefail

WRITER="plugins/relay/agents/design-spec-writer.md"
REVIEWER="plugins/relay/agents/design-spec-reviewer.md"

# Regression: figma-track-phase4.test.mjs's pinned anchors must survive
# byte-for-byte — this phase's edits sit in different sections of the
# same files (Phase 2 traversal + Hard Constraint 10 + Step 5.6, never
# Phase 3 classification, flip-ownership Hard Constraint 1, or Step 3/4).
grep -q "^3\. \*\*Classify every subtree\.\*\*" "$WRITER"
grep -q "^## Phase 4 — Batched Q&A" "$WRITER"
grep -q "\*\*The flip is an interactivity-boundary action\*\*" "$REVIEWER"
grep -q "^1\. \*\*The flip is gated by context + two conditions" "$REVIEWER"
grep -q "^### Step 4 — Final flip (happy path, \`main\` mode only)" "$REVIEWER"
echo "PASS: figma-track-phase4.test.mjs pinned anchors intact"

# Regression: design-spec-reviewer-rubric-count-derived.test.mjs's
# rubric item count must stay 7 — this phase edits R-DS4's body only,
# adding no heading and removing none.
RDS_HEADING_COUNT=$(grep -cE '^### R-DS[0-9]+' "$REVIEWER")
if [ "$RDS_HEADING_COUNT" -ne 7 ]; then
  echo "FAIL: expected 7 ### R-DS<n> headings unchanged, found $RDS_HEADING_COUNT"
  exit 1
fi
echo "PASS: R-DS<n> heading count unchanged at 7"

# Structural: Hard Constraints section in design-spec-writer.md now
# holds exactly 10 items (was 9), appended, not renumbered.
HC_BLOCK=$(awk '/^## Hard constraints/{flag=1; next} /^---/{flag=0} flag' "$WRITER")
HC_COUNT=$(printf '%s\n' "$HC_BLOCK" | grep -cE '^[0-9]+\. \*\*')
if [ "$HC_COUNT" -ne 10 ]; then
  echo "FAIL: expected 10 Hard Constraints in design-spec-writer.md, found $HC_COUNT"
  exit 1
fi
echo "PASS: Hard Constraints section holds exactly 10 items"
```
Fails on the current unmodified tree at the `RDS_HEADING_COUNT`
check's sibling `HC_COUNT` check (currently 9 Hard Constraints, not
10); the anchor-preservation greps already pass today and continue to
pass after Tasks 1-6 (they assert what must NOT change). This Level
intentionally omits a `node --test` regression check: no
`figma-quota-resilience-phase6.test.mjs` exists yet — that file is the
test pair's own `NEW_TEST_REQUIRED` work, authored test-after this
phase's Implementer + Code Review (see `## Notes`), mirroring how
Phase 3 of this same PRD kept `node --test` out of its own Level 1-3
gates for the identical reason.

Levels 4-6 (browser/database/manual) are not part of the fixed agent
contract and are not included — this phase has no UI, no database, and
no step that resists automation.

## Acceptance Criteria

- **AC-A1 (PRD AC-15):** Given `get_design_context` is refused
  mid-traversal with some `raw/` evidence already gathered, when the
  writer evaluates its Phase 2 evidence-completeness branch, then it
  narrows the in-scope node set to exactly the nodes with a persisted
  `raw/<node-id>.json`, emits a loud note naming every excluded node
  and why, and proceeds — rather than deadlocking.
- **AC-A2 (PRD AC-15):** Given `get_screenshot` is refused mid-traversal
  with some `refs/` evidence already gathered, when the writer
  evaluates its Phase 2 evidence-completeness branch, then it applies
  the identical narrowing discipline to the in-scope frame set feeding
  `## Frame Inventory` / `## Visual Acceptance Criteria` — rather than
  deadlocking.
- **AC-A3 (PRD AC-15):** Given `get_variable_defs` is refused (
  `raw/variables.json` absent), when the writer evaluates its Phase 2
  evidence-completeness branch, then rung is `DEGRADED_NO_TOKENS`,
  every `## Token Map` row explicitly states "tokens not collected",
  and `design-spec-reviewer`'s R-DS4 reports "tokens not collected"
  (not "token does not resolve") for that condition without failing
  the rubric item, while a value that fails to resolve against a
  present `variables.json` still fails R-DS4 and is still reported
  "token does not resolve".
- **AC-A4 (PRD AC-15):** Given all three evidence surfaces come back
  empty because of a quota-exhaustion refusal, when the writer
  evaluates the branch, then it HALTs with
  `FAILED_FIGMA_QUOTA_EXHAUSTED` rather than writing an empty or
  misleading spec, and `relay-design-spec.md`'s "If the Writer halts"
  list names this HALT as its third entry.
- **AC-A5 (PRD AC-16):** Given a re-traversal is triggered via either
  the exhaustion offer's outcome 1 or `design-spec-reviewer`'s Step 5
  "fresh Writer pass" branch, when the re-adopted Writer completes,
  then `relay-design-spec.md`'s `cumulative_figma_calls` increases by
  that pass's own reported call count — never resets across either
  entry point.
- **AC-A6 (PRD AC-16):** Given the `max_spec_review_retries`
  exhaustion offer is presented and the most recently completed round
  degraded on a Figma quota refusal (`last_round_quota_degraded ==
  true`), when the offer is rendered, then the accumulated Figma-call
  consumption is displayed and outcome 1 ("Retry with corrected
  inputs") is omitted from the offer.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The partial-evidence branch's `raw/`/`refs/` narrowing leaves an in-scope set so small the resulting spec is nearly empty, technically satisfying R-DS1/R-DS7 but practically low-value | M | M | The writer's loud, visible note (mirroring Hard Constraint 7) makes the narrowing visible to the user in the same interactive session; the user can choose to abort/retry rather than accept a near-empty DRAFT — a UX outcome, not a silently-swallowed rubric gap. |
| A future change to Figma's exhaustion-message wording breaks the error-class/string detection this phase reuses verbatim from `relay-design-map.md` | M | M | Detection matches the documented message shape as a pattern (seat/plan placeholders tolerant), identical discipline already accepted for Phase 3's own detection rule in this same PRD — recalibration is a single prose edit, not a redesign. |
| R-DS4's new degraded-evidence exception is read too broadly by a future editor, letting a genuine per-value mismatch slip through as "tokens not collected" | L | M | The rewritten "Fails when" clause is an explicit if/else on `raw_dir/variables.json`'s presence — the exception fires ONLY when the file is absent, never when it exists but a value fails to resolve; Task 4's own VALIDATE checks both phrases are present, not just one. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. This repo declares
`test_frameworks: ["node:test"]`, so the pair is active in test-after
mode.

**Row-6 selection independently confirmed.** This plan's own Phase 1
parse of the Implementation Phases table agrees with the dispatching
command's pre-check: rows 1-5 are all `complete`; row 6 ("Design-spec
quota path") is `pending` with `Depends: 3` — satisfied (row 3 is
`complete`, a dependency-satisfying state at or past `implemented`).
Row 6 is the lowest-numbered — and only — actionable row.

**Blast radius, deliberately kept tight.** Row 6 is a leaf in the
Implementation Phases table — no other row names it in a `Depends`
cell (it is the highest-numbered row) — and the source PRD's own MVP
Scope section states plainly: "Phase 6 ... is the only phase outside
the MVP ... no Success Metric depends on it." The three touched files
are all within the already-shipped, already-`figma_track`-gated Design
Spec surface (Figma Implementation Track Phase 4); nothing outside
that surface changes.

**Release-cut decision (deliberate, per `documentation/AGENTS.md`
§7.5).** This phase's three touched files are all under
`plugins/relay/`, but none is under `documentation/` —
`documentation/AGENTS.md` §7.4's changelog-update requirement is
scoped to changes that touch `documentation/`, and none of this
phase's tasks do. Consequently §7.5's `plugin.json` lock-step rule,
which binds only ON a release cut, also does not fire here: no task in
this plan bumps `plugins/relay/.claude-plugin/plugin.json` (currently
`0.29.0`) or edits `documentation/changelog.html`. This mirrors Phase 3
of this same PRD
(`PRPs/plans/completed/figma-quota-resilience-phase-3-quota-preflight-named-failure.plan.md`),
which also touched only `plugins/relay/` and included no
changelog/release task in its own Step-by-Step Tasks. Grounding
confirmed the pattern holds across this PRD: Phases 2, 3, and 5 all
shipped with zero `changelog.html` footprint of their own, while Phase
1 and (later, partially) Phase 4 were swept into dedicated,
independent release-cut commits (`0.26.0`, `0.27.0`). The correct
place for this phase's content to reach the changelog is a LATER,
separate, deliberate release-cut commit — not a task inside this plan.

**No test-file edit in this plan's Step-by-Step Tasks — confirmed, not
assumed.** Grounding (`research-codebase`) confirmed no existing test
under `scripts/validate/checks/*.test.mjs` pins the specific content
this phase changes: `design-spec-reviewer-rubric-count-derived.test.mjs`
(the one DERIVED test touching `design-spec-reviewer.md`) pins only the
rubric's item COUNT and id sequence (`R-DS1`-`R-DS7`), never R-DS4's
own "Fails when" wording; `figma-track-phase4.test.mjs` pins
`design-spec-writer.md`'s Phase 3 classification block and
`design-spec-reviewer.md`'s flip-ownership prose (Hard Constraint 1,
Step 3/4), both of which sit outside the sections Tasks 1-6 touch
(Phase 2 traversal, the new Hard Constraint 10, Phase 5.6, R-DS4, and
`relay-design-spec.md`'s Writer-halts/exhaustion-offer blocks). No
`EXISTING_TEST_UPDATED` routing is triggered by this plan. A new
`figma-quota-resilience-phase6.test.mjs` will presumably be authored
fresh by the `test-writer`/`test-reviewer` pair after this phase's
Implementer + Code Review (test-after, per `tdd: false`), covering this
phase's own AC-A1..AC-A6 surface — standard `NEW_TEST_REQUIRED` work
outside this plan's Step-by-Step Tasks, mirroring Phase 3's identical
precedent.

**`phase_type: feature` — reasoning.** This phase adds new observable
behavior (a named evidence-completeness branch, a new
`DEGRADED_NO_TOKENS` rung, a new terminal HALT code, a session-scoped
consumption counter, and a suppressed retry outcome) to three existing
files; it does not match `scaffold` (not a bootstrap/config-only/init
phase), `docs` (the touched files are agent/command prose, not
documentation describing already-shipped behavior), `refactor` (adds
new capability rather than restructuring existing behavior unchanged),
or `foundation` (creates no new domain entity/repository/schema seam a
later phase's Acceptance Criteria depend on — row 6 has no dependents
at all, per the Blast-radius note above). Given `tdd: false` in this
repository, the `foundation` self-skip this classification exists to
gate does not trigger regardless of this call.

---

*Generated: 2026-08-06*
*Approved: 2026-08-06*
*Implemented: 2026-08-06*
*Status: IMPLEMENTED*
