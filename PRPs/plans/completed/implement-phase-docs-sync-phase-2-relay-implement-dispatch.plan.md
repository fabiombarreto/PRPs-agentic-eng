# Feature: /relay-implement dispatch (Phase 2 of implement-phase-docs-sync)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting pattern change (relocates the docs-sync dispatch point into Pillar 2, inside /relay-implement, ahead of the D8 state-machine flip); reuse of existing components (docs-updater / docs-reviewer pair, already extended with diff_source/non_interactive/patch_path in Phase 1); impact on a reusable, orchestrator-composed command (/relay-implement, invoked per-phase by /relay-execute); REVISION — expands scope to re-open two Phase-1-delivered agent files (docs-updater.md, docs-reviewer.md) to add explicit feature/prd_path grounding inputs, closing a HIGH code-review finding that the original Phase 2 plan was under-scoped (docs-updater's only feature/prd_path derivation path — orchestrator-run.json — does not exist at implement time for standalone /relay-implement)
- Decisions found:
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — /relay-implement is in the autonomous zone; this dispatch MUST set non_interactive: true unconditionally (no exception carve-out here, unlike the approve-time invocation).
  - [2026-05-18] Pillar 2/3 boundary + "never commit" invariant — implement-time docs edits stay uncommitted in the worktree; committed later by /relay-commit alongside the code. The new dispatch sub-phase must not issue a git commit.
  - [2026-04-19] PRP artifacts live under PRPs/, never .claude/ — all docs-sync artifacts (the docs-updater manifest, the docs-reviewer jsonl log) stay under PRPs/reports/<feature>/; nothing this phase adds writes under .claude/.
  - [2026-04-19] Methodology declaration lives in docs/context/methodology.md — docs_sync is an additive frontmatter key read the same way tdd: is read; default true when the key is absent, mirroring the tdd absence-handling precedent.
  - [2026-04-19] Command surface: one command per stage, writer/reviewer split — dispatching the SAME docs-updater/docs-reviewer pair a second time from a second call site does not violate the split; it is a second invocation of an already-independent pair, not a new bundled agent.
- Applicable anti-patterns:
  - "Relying on interactive permission prompts in the autonomous loop" — the new dispatch must never prompt; non_interactive: true is hardcoded for this call site.
  - "Writing pipeline artifacts under .claude/" — the docs-sync dispatch's artifacts (manifest, jsonl log, diff.patch reuse) all resolve under PRPs/ or docs/, never .claude/.
  - "Activating [a pair] by heuristic" (analogous principle, docs/anti-patterns.md line 43) — docs_sync is an explicit declared flag with a default; this phase must read it, never infer it from project shape.
- Applicable architectural rules:
  - Interactivity boundary (autonomous after PRD approval) — docs/context/architecture.md "Interactivity boundary" section.
  - Three-pillar architecture / Pillar 2 "never commit" invariant — docs/context/architecture.md "Three-pillar target architecture".
  - PRP artifact paths table — docs/context/architecture.md "PRP artifact paths".
  - Graceful degradation — relay-implement.md's own Decision Gate template already names this as an applicable architectural rule (plugins/relay/commands/relay-implement.md:46); it governs the docs-sync budget-exhaustion behavior designed in this plan (proceed to D8 rather than blocking code success on a docs failure).
- Result: PROCEED — no unresolvable conflict. This revision keeps the same PROCEED result: the dispatch mechanics are unchanged in shape, only their grounding inputs are corrected. Adding optional feature/prd_path inputs to docs-updater.md and docs-reviewer.md, with a fallback that reproduces today's /relay-approve behavior exactly when they are omitted, does not touch any of the decisions/anti-patterns/rules above — it is additive, not a redesign.
```

## Source PRD

- `PRPs/prds/implement-phase-docs-sync.prd.md` — Implementation Phases row 2:
  "/relay-implement dispatch" — Goal: Run the docs pair inside implement at
  the right point with the right guards. — Success signal: An implement run
  against a `docs_sync: true` project produces `docs/` edits + manifest +
  review in the worktree; `--no-docs` and `docs_sync: false` each skip;
  deferred questions appear in the report.

## Summary

Edit three files to close a HIGH code-review finding that blocked this
phase's IMPLEMENT stage: the original scope (editing only
`relay-implement.md`) was under-scoped because `docs-updater.md` derives
`feature`/`prd_path` ONLY by reading
`PRPs/reports/<feature>/orchestrator-run.json` — a file that is ABSENT at
implement time (standalone `/relay-implement` never writes it;
`/relay-execute` writes it only at Phase A.6, AFTER implement). Without an
alternate grounding path, the new Phase A.3.5 dispatch cannot ground the
docs pair at all. This revision:

1. Adds explicit `feature` / `prd_path` inputs to `docs-updater.md`'s
   Inputs table, with the orchestrator-run.json read demoted to a fallback
   used only when those inputs are omitted — preserving today's
   `/relay-approve` behavior exactly.
2. Adds the symmetric explicit `feature` (+ `prd_path`) input to
   `docs-reviewer.md`, with the same fallback discipline.
3. Adjusts `relay-implement.md`'s Phase A.3.5 dispatch (already in scope,
   already applied to the working tree by a prior blocked implementer
   attempt) to pass `feature` and `prd_path` explicitly to both agents, and
   fixes three further code-review findings: an undocumented
   `prior_feedback` dispatch key, a deferred-questions source/pointer
   mismatch in the Final output surface, and stale prose describing how
   `docs-reviewer` derives `feature`.

The dispatch mechanics themselves (post-APPROVED, pre-D8, own
`max_docs_review_retries=2` budget, `--no-docs` / `docs_sync` gating,
graceful degradation on budget exhaustion, no commit) are UNCHANGED from
the original plan — this is a grounding fix, not a redesign.

## User Story

As a developer operating relay whose implementations frequently never reach
`/relay-approve`
I want `/relay-implement` to dispatch the docs-updater/docs-reviewer pair
automatically right after code-review APPROVED, before the plan/PRD state
flips to complete
So that `docs/` reflects the change even when approve is never run, without
the docs pair ever blocking code delivery or prompting me mid-run

## Problem Statement

(Narrowed from the PRD's Problem Statement to Phase 2's scope.) Today
`/relay-implement`'s Phase A.3 standard-mode branch, on an `APPROVED`
code-review verdict, exits straight into Phase A.4's D8 mutations
(`plugins/relay/commands/relay-implement.md:316` — "APPROVED → exit Phase A
loop into Phase A.4 (D8 mutations)."). There is no call site anywhere in
`/relay-implement` that dispatches `docs-updater` or `docs-reviewer` — a
repo-wide search matches only the two agent files, `relay-approve.md`, and
narrative docs (PRD Evidence). Phase 1 already gave the docs pair the
capability to run pre-PR and non-interactively (`diff_source`,
`non_interactive`, `patch_path` inputs; `docs_sync` frontmatter key), but
nothing calls that capability from `/relay-implement` yet.

**Revision (HIGH finding from this phase's own IMPLEMENT stage):** the
original Phase 2 plan dispatched `docs-updater` and `docs-reviewer` with
only `target_root`/`diff_source`/`patch_path`/`non_interactive` (and, for
the reviewer, `target_root`/`non_interactive`), relying implicitly on each
agent's existing `feature`/`prd_path` derivation —
`plugins/relay/agents/docs-updater.md:35-53` (mirrored at Step 1,
`docs-updater.md:162-165`) — which reads
`<target_root>/PRPs/reports/<feature>/orchestrator-run.json`. That file
does not exist at implement time: standalone `/relay-implement` never
writes it, and `/relay-execute` (per its own Phase A.6) writes it only
AFTER a phase's implement completes. The dispatch therefore had no way to
ground `feature`/`prd_path`, and code-review correctly flagged the plan as
under-scoped rather than approving an implementation built on an
ungroundable contract.

## Solution Statement

(Narrowed from the PRD's Proposed Solution to Phase 2's scope.) Insert a new
`Phase A.3.5 — Docs-sync dispatch` section into
`plugins/relay/commands/relay-implement.md`, physically between the
existing `### Phase A.3` (verdict branching) and `### Phase A.4` (D8
mutations) sections, triggered exactly when Phase A.3's standard mode
returns `APPROVED`. The new section dispatches `docs-updater`
(`diff_source: "patch"`, `patch_path: <artifact_root><attempt>/diff.patch`,
`non_interactive: true`, `feature: <feature>`,
`prd_path: PRPs/prds/<feature>.prd.md` when `is_prd_less == false`) then
`docs-reviewer` (`non_interactive: true`, `feature: <feature>`, `prd_path`
under the same condition) via `Task`, in a bounded loop
(`max_docs_review_retries=2`) that mirrors `/relay-approve`'s Phase 3 DOCS
CYCLE step-for-step. `--no-docs` flag parsing (mirroring `relay-approve.md`'s
own `--no-docs` flag) and a `docs_sync` methodology read (default `true`
when absent) gate the whole sub-phase; either one skips it. The Final
output surface carries a `Docs:` line surfacing the manifest outcome and
any deferred questions, pointing at BOTH artifacts that can carry them. A
Constraints entry documents that docs-sync budget exhaustion never blocks
D8.

**Revision — grounding fix.** Add an explicit `feature` (+ `prd_path`)
input to `docs-updater.md`'s and `docs-reviewer.md`'s Inputs contracts,
used directly when supplied; demote each agent's existing
`orchestrator-run.json` read to a fallback used ONLY when `feature`/
`prd_path` are omitted, so today's `/relay-approve` call site (which still
omits them) is byte-for-byte unaffected. This makes the docs pair
groundable by ANY caller, including standalone `/relay-implement` before
`orchestrator-run.json` exists. Additionally: remove the undocumented
`prior_feedback` key from the `docs-updater` dispatch payload (the agent's
Inputs contract has no such field — and `/relay-approve`'s own canonical
DOCS CYCLE dispatch doesn't pass it either, confirming it was never a real
precedent); source the Final output's `docs_deferred_questions` list from
BOTH the docs-updater manifest's `## Deferred Questions` section
(writer-side ambiguity) and the docs-reviewer jsonl's `deferred_question`
field (reviewer-side ambiguity), and point the `Docs:` line at both
artifacts so source and pointer agree; and correct the Phase A.3.5 prose
that previously (incorrectly) described `docs-reviewer` as deriving
`feature` implicitly — it now names the explicit `feature`/`prd_path`
payload keys instead.

## Metadata

| Key | Value |
|-----|-------|
| Type | Command-file edit + two agent-file edits (prompt/config markdown; relay ships no runtime source) |
| Complexity | Medium-High (expanded from the original single-file scope; still prompt/config markdown only, no new architectural surface) |
| Systems Affected | `plugins/relay/commands/relay-implement.md`, `plugins/relay/agents/docs-updater.md`, `plugins/relay/agents/docs-reviewer.md` (all three edited); reads (not edits) `docs/context/methodology.md` |
| Dependencies | Phase 1 (`implement-phase-docs-sync-phase-1-agent-capability-config-surface.plan.md`) — complete; supplies the `diff_source`/`non_interactive`/`patch_path` inputs this phase's dispatch payload consumes. This revision re-opens two of Phase 1's delivered files (`docs-updater.md`, `docs-reviewer.md`) to add the `feature`/`prd_path` grounding inputs Phase 1 did not anticipate being needed pre-`orchestrator-run.json`. |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/implement-phase-docs-sync.prd.md:164` (Implementation Phases row 2), `:175-178` (Phase 2 Phase Details) |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-implement.md` | 295-360 | Phase A.3 verdict branching (the exact APPROVED transition point) |
| P0 | `plugins/relay/commands/relay-implement.md` | 364-399 | The CURRENT (under-scoped) Phase A.3.5 dispatch this revision corrects — already applied to the working tree by a prior implementer attempt: Step A/B payloads, the `prior_feedback` key to remove, the deferred-questions Step 6 to fix, the `pr`-omission prose to fix |
| P0 | `plugins/relay/agents/docs-updater.md` | 23-53 | Inputs table + "From these, you derive..." paragraph — the CURRENT contract this revision extends with explicit `feature`/`prd_path` inputs and demotes the orchestrator-run.json read to a fallback |
| P0 | `plugins/relay/agents/docs-updater.md` | 162-176 | Step 1 of the Diff-Driven Procedure — the exact `feature`/`prd_path` derivation call site to make conditional |
| P0 | `plugins/relay/agents/docs-reviewer.md` | 43-68 | Inputs section + "From these, you derive:" — the symmetric CURRENT contract this revision extends |
| P0 | `plugins/relay/agents/docs-reviewer.md` | 283-297 | Step 1 ("Ground yourself") of the Protocol — the exact `feature`/`prd_path` derivation call site to make conditional |
| P0 | `plugins/relay/commands/relay-approve.md` | 275-343 | Phase 3 DOCS CYCLE — the canonical bounded-retry docs-pair dispatch loop this phase mirrors; also the existing approve-time dispatch (`Step 3.1`, lines 288-291) that passes only `pr`/`target_root` — proof the fallback preserves this call site unchanged |
| P1 | `plugins/relay/commands/relay-implement.md` | 261-293 | Phase A.2 diff capture — `<artifact_root><attempt>/diff.patch` is the `patch_path` source for the new dispatch |
| P1 | `plugins/relay/commands/relay-implement.md` | 69-97 | `## Parse arguments` `feature`/`is_prd_less` derivation (both PRD and PRD-less branches) — the source of the `feature` value now passed explicitly to the docs pair |
| P1 | `docs/context/methodology.md` | 45-79 | `docs_sync` frontmatter semantics, default-true-when-absent precedent |
| P1 | `plugins/relay/commands/relay-approve.md` | 28-32 | Phase 0 flag extraction pattern, including the already-shipped `--no-docs` → `no_docs_flag` precedent |
| P2 | `PRPs/prds/implement-phase-docs-sync.prd.md` | 175-178 | Phase 2 Phase Details (Goal / Scope / Success signal) — authoritative phase scope |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-approve.md:275-343
## Phase 3: DOCS CYCLE

If `no_docs_flag = true`, skip this phase entirely and proceed to Phase 4.

Set:
```
docs_review_attempts = 0
max_docs_review_retries = 2
prior_feedback = null
```

### Step 3.1 — Dispatch docs-updater (writer)
...
### Step 3.2 — Dispatch docs-reviewer (reviewer)
...
### Step 3.3 — Evaluate docs-reviewer verdict

**On CHANGES_REQUESTED:**
Increment `docs_review_attempts`. ... If `docs_review_attempts > max_docs_review_retries`, HALT: ...
Else: loop back to Step 3.1 with the prior feedback.

**On APPROVED:**
Proceed to Step 3.4.
```
Copied (shape only, HALT replaced with graceful-degradation continue) by
Task 5 (`### Phase A.3.5 — Docs-sync dispatch`). Note: `relay-approve.md`'s
own `prior_feedback` here is a LOOP-INTERNAL variable — but its Step 3.1
dispatch payload itself (`relay-approve.md:288-291`) passes docs-updater
only `pr` and `target_root`; it does NOT forward `prior_feedback` into the
`Task` payload either. This confirms the original Phase 2 draft's
`prior_feedback: <docs_prior_feedback...>` payload key (removed by Task 5)
was never a real precedent — even the canonical DOCS CYCLE this phase
mirrors does not pass it to the agent.

```
# SOURCE: plugins/relay/commands/relay-implement.md:297-317
Invoke the code-reviewer agent via `Task`:

Task(subagent_type="code-reviewer",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       mode: "standard",
       attempt: <attempt>,
       diff_target: "<artifact_root><attempt>/diff.patch",
     })
...
Read the just-appended jsonl line. Parse `verdict`:

- **APPROVED** → exit Phase A loop into Phase A.4 (D8 mutations).
- **CHANGES_REQUESTED** → carry the rubric defects ... Restart pre-flight checks (Phase A.1).
```
Copied (Task dispatch syntax + verdict-branch prose style) by Task 1 (flag
anchor context) and Task 5 (dispatch payload shape).

```
# SOURCE: plugins/relay/agents/docs-updater.md:23-34
| `pr` | PR number or URL | ... |
| `target_root` | absolute path | ... |
| `diff_source` | optional string: `pr` \| `worktree` \| `patch` | Selects the diff-read mechanism ... Default `pr`. ... `patch` reads a captured diff file at `patch_path` directly via `Read`. |
| `non_interactive` | optional boolean | When `true`, you MUST NOT ask the operator any question ... Default `false`. |
| `patch_path` | absolute path (required only when `diff_source: patch`) | The path to a captured `diff.patch` file. Read directly via `Read` — never via `Bash` — when `diff_source: patch` is selected. |
```
Copied (row shape/style — two-column-with-default convention) by Task 3,
which ADDS `feature` and `prd_path` rows in this exact style. Also copied
(input names + exact semantics, unchanged) by Task 5's
`Task(subagent_type="docs-updater", ...)` payload.

```
# SOURCE: plugins/relay/agents/docs-updater.md:35-53
From these, you derive the remaining context by reading one JSON
file. At `<target_root>/PRPs/reports/<feature>/orchestrator-run.json`
you will find at minimum:

```json
{
  "feature": "<feature>",
  "prd_path": "<prd_path>",
  "started_at": "<ISO timestamp>",
  "ended_at": "<ISO timestamp>",
  "outcome": "ALL_PHASES_COMPLETE",
  "phases_completed": "<phases_completed>"
}
```

Extract `feature` and `prd_path` from this file. The PR number
arrives directly from `/relay-approve <pr>` — the `orchestrator-run.json`
shape does NOT carry `pr_url`, so you must not attempt to read the
PR number from it.
```
This is the CURRENT single-path derivation Task 3 restructures: the JSON
shape + extraction sentence + PR-number caveat are copied VERBATIM into a
new fallback branch (used only when `feature`/`prd_path` are omitted); a
new explicit-input-first branch is added above it. This is the root-cause
paragraph the HIGH code-review finding identified as the phase's only
(and, at implement time, non-functional) grounding path.

```
# SOURCE: plugins/relay/agents/docs-reviewer.md:43-54
- **`pr`**: the merged PR number or URL.
- **`target_root`**: absolute path to the target project's root.
- **`non_interactive`** (optional boolean, default `false`): when
  `true`, you MUST NOT ask the operator any question — see Hard
  Constraint 9 below.
```
Copied (bullet shape/style) by Task 4, which ADDS `feature` and `prd_path`
bullets in this exact style. Also copied (input names, unchanged) by
Task 5's `Task(subagent_type="docs-reviewer", ...)` payload.

```
# SOURCE: plugins/relay/agents/docs-reviewer.md:55-68
From these, you derive:

- **`feature`**: read `<target_root>/PRPs/reports/<feature>/orchestrator-run.json`
  — the `feature` field gives the feature name. The directory name
  under `PRPs/reports/` that contains `orchestrator-run.json` is
  `<feature>`. Scan `PRPs/reports/*/orchestrator-run.json` if the
  feature name is not obvious from context; prefer the most recently
  modified one tied to the merged PR.
- **Manifest path**: `<target_root>/PRPs/reports/<feature>/docs-update.md`
  — the manifest the Docs Updater wrote, ending `*Status: DRAFT*`.
- **jsonl log path**: `<target_root>/PRPs/reports/<feature>/docs-review.jsonl`
  — your append-only verdict log (create on first verdict; never
  truncate).
```
This is the CURRENT single-path `feature` derivation (plus the two
downstream path-derivation bullets, UNCHANGED by this revision) Task 4
restructures: the `orchestrator-run.json`-read sentence + scan fallback are
copied VERBATIM into a new fallback branch; a new explicit-input-first
branch is added above it; the Manifest-path / jsonl-log-path bullets move,
unchanged, into a trailing "From `feature`, you also derive:" block.

```
# SOURCE: plugins/relay/agents/docs-updater.md:277-285 (manifest template, `## Deferred Questions`)
## Deferred Questions

Questions that would have been asked of the operator, deferred
because `non_interactive: true` was set. Each entry carries the
question and a concrete suggested default; empty when
`non_interactive: false` (or no ambiguity arose):

- <question 1> — suggested default: <default 1>
```
```
# SOURCE: plugins/relay/agents/docs-reviewer.md:148-155 (Hard Constraint 9, non_interactive gate)
**When `non_interactive: true`, you MUST NOT ask** the operator
anything under any circumstance. Instead, record the would-be
question as a `deferred_question` field (string, or `null` when
no question arose) on the JSON verdict object you already append
to `docs-review.jsonl` ...
```
These are the TWO real, independent deferred-question artifacts — the
docs-updater's manifest section (writer-side) and the docs-reviewer's jsonl
field (reviewer-side). The original Phase 2 draft's Step 6 sourced
`docs_deferred_questions` from ONLY the second (`docs-review.jsonl`'s
`deferred_question` field) while its Final-output pointer named ONLY the
first (`docs-update.md`'s `## Deferred Questions` section) — a
source/pointer mismatch flagged by code-review. Task 5 Step 6 and Task 6
are revised to read BOTH and point at BOTH.

```
# SOURCE: plugins/relay/commands/relay-implement.md:69-97 (## Parse arguments, PRD-less detection)
**PRD-less detection (flat filename):** Inspect the plan's basename before attempting the canonical pattern parse.

- If the basename matches `<slug>.plan.md` ... then:
  - Set `is_prd_less = true`.
  - Set `slug = basename minus .plan.md`.
  - Set `feature = slug` ...
- If the basename matches the canonical `<feature>-phase-<N>-<slug>.plan.md` pattern ... then:
  - Set `is_prd_less = false`.
  - Parse `<feature>` = basename minus `-phase-<N>-<slug>.plan.md`.
  ...
```
This is the command's EXISTING `feature`/`is_prd_less` derivation — the
source of the `feature` value Task 5 now passes explicitly into both
dispatch payloads, and the branch that decides whether `prd_path` is
included (PRD mode: `PRPs/prds/<feature>.prd.md`) or omitted entirely
(PRD-less mode: no source PRD exists).

```
# SOURCE: plugins/relay/commands/relay-approve.md:28-32
Parse `$ARGUMENTS`. Extract flags first:
- `--strategy merge|squash|rebase` → record as `<merge_strategy>` (default: `merge`)
- `--admin` → record as `admin_flag = true` (optional; bypasses branch protection on merge)
- `--force` → record as `force_flag = true` (optional; allows `git worktree remove --force` on dirty worktree post-merge)
- `--no-docs` → record as `no_docs_flag = true` (optional; skips the docs cycle entirely)
```
Copied (flag name `--no-docs` → `no_docs_flag`, extraction style) by Task 1.

```
# SOURCE: docs/context/methodology.md:45-65
## Docs Sync

Current state: **true** (default) — `docs_sync: true` in the
frontmatter above is the per-project master switch INTENDED to gate
automated `docs/` knowledge-base synchronization ... Today it is a
declared value only, read but not yet acted on ... that is Phase 2
(`/relay-implement` dispatch) and Phase 3 (`/relay-approve` safety net)
... `docs_sync` is intended to govern BOTH the implement-time and
approve-time docs cycles once Phase 2 and Phase 3 wire their
respective dispatch/gating logic.
```
Copied (default-true-when-absent semantics, precedence note) by Task 2.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/docs-updater.md` | UPDATE | Add explicit `feature`/`prd_path` inputs to the Inputs table; demote the existing `orchestrator-run.json` read (Inputs preamble + Step 1 item 1) to a fallback used only when those inputs are omitted — closes the HIGH finding: the agent has no other way to ground itself at implement time, when `orchestrator-run.json` does not yet exist |
| `plugins/relay/agents/docs-reviewer.md` | UPDATE | Add the symmetric explicit `feature` (+ `prd_path`) input, with the same fallback discipline, so the implement-time dispatch (Phase A.3.5) can ground the reviewer half of the pair the same way |
| `plugins/relay/commands/relay-implement.md` | UPDATE | The already-applied `--no-docs` flag parsing, `docs_sync` methodology read, `Phase A.3.5 — Docs-sync dispatch` sub-phase, `Docs:` Final-output line, and graceful-degradation Constraints entry (all in place from a prior blocked implementer attempt) are corrected: Phase A.3.5's dispatch payloads now pass `feature`/`prd_path` explicitly to both agents, the undocumented `prior_feedback` key is removed, the deferred-questions Step 6 + `Docs:` line are reconciled to a dual-artifact source/pointer, and stale `feature`-derivation prose is fixed — per PRD Implementation Phases row 2 / Phase 2 Phase Details and the code-review HIGH finding |

## NOT Building (Scope Limits)

- **Automated sync of the `documentation/` HTML site** — unchanged from Phase 1; the docs pair still never touches it (PRD "What We're NOT Building").
- **Making `implementer` / `code-reviewer` docs-aware** — the docs pair is reused unchanged; those two agents stay docs-blind.
- **An interactive docs pass inside `/relay-implement`** — `non_interactive: true` is hardcoded for this call site, no exception.
- **A new `.relay.yaml` config surface** — `docs_sync` stays in `docs/context/methodology.md` frontmatter.
- **Committing at implement time** — docs edits from this dispatch stay uncommitted in the worktree (Pillar 2 invariant).
- **Solving the multi-phase manifest-collision question** — PRD Open Question #2 is explicitly deferred; this phase dispatches per-phase as the PRD leans, without adding batching/dedup logic.
- **A dedicated wall-clock sub-budget for the docs loop** — PRD Open Question #1 is explicitly deferred to post-ship measurement; this phase does not add a second deadline check, only the retry-count bound.
- **Confirming/adjusting `/relay-approve`'s docs-cycle idempotency** — that is Phase 3's scope.
- **Updating `docs/` or the `documentation/` site to describe the new model** — that is Phase 4's scope.
- **Adding a `prior_feedback` (or any other retry-feedback) input to `docs-updater.md`'s contract** — the code-review finding was that the dispatch sent an undocumented key, not that the agent needs one; the fix removes the key from the payload rather than adding a matching input. A structured retry-feedback channel, if wanted, is a separate future enhancement.
- **A general-purpose `feature`/`prd_path`-scanning helper shared by both agents** — each agent keeps its own (now-conditional) fallback logic; no shared derivation module is introduced.

## Step-by-Step Tasks

### Task 1: Add `--no-docs` flag parsing to `## Parse arguments`

- **ACTION**: In `plugins/relay/commands/relay-implement.md`, under the
  `## Parse arguments` section (line 54), add a flag extraction step that
  scans `$ARGUMENTS` for the literal token `--no-docs` before the
  positional plan-path parse. When present, strip it from `$ARGUMENTS` and
  record `no_docs_flag = true` (default `false`). Mirror the naming and
  extraction style of the existing `--no-docs` flag already shipped on
  `/relay-approve`.
- **MIRROR**: Pattern 5 (`relay-approve.md:28-32`, `--no-docs` → `no_docs_flag`).
- **AC**: AC-A4 (PRD AC-6)
- **VALIDATE**:
  ```bash
  if ! grep -q -- "--no-docs" plugins/relay/commands/relay-implement.md; then
    echo "FAIL: --no-docs flag not found in relay-implement.md"; exit 1
  fi
  echo "PASS: --no-docs flag present"
  ```

### Task 2: Add a `docs_sync` methodology read to Phase A.0

- **ACTION**: In `plugins/relay/commands/relay-implement.md`, under
  `### Phase A.0 — Initialise loop state` (line 199), add a step that reads
  `<target_root>/docs/context/methodology.md` frontmatter and extracts the
  `docs_sync` key, recording `docs_sync_enabled` (boolean). Default `true`
  when the key is absent, mirroring the `tdd` absence-handling precedent
  and `docs-updater.md`'s own default-true-when-absent handling of the same
  key. State the precedence rule explicitly: `no_docs_flag` (from Task 1)
  always wins over `docs_sync_enabled` when both are evaluated in Task 5's
  gate.
- **MIRROR**: Pattern 6 (`docs/context/methodology.md:45-65`).
- **AC**: AC-A4 (PRD AC-6)
- **VALIDATE**:
  ```bash
  if ! grep -q "docs_sync" plugins/relay/commands/relay-implement.md; then
    echo "FAIL: docs_sync read step not found in Phase A.0"; exit 1
  fi
  echo "PASS: docs_sync methodology read present"
  ```

### Task 3: Add explicit `feature`/`prd_path` inputs to `docs-updater.md`

- **ACTION**: In `plugins/relay/agents/docs-updater.md`, under `## Inputs`
  (line 23), add two new rows to the Inputs table: `feature` (optional
  string — "the feature slug; when supplied, used directly for every
  `PRPs/reports/<feature>/...` path in this contract; skip the
  orchestrator-run.json read for this value entirely") and `prd_path`
  (optional absolute path — "the source PRD path; when supplied, used
  directly for the Step 1 PRD `Read`; skip the orchestrator-run.json read
  for this value entirely"). Then restructure the paragraph at lines 35-53
  ("From these, you derive the remaining context by reading one JSON
  file...") into a new `### Deriving feature and prd_path` subsection with
  two branches: (1) when `feature`/`prd_path` are supplied explicitly, use
  them directly; (2) when NOT supplied, fall back to reading
  `<target_root>/PRPs/reports/<feature>/orchestrator-run.json` exactly as
  today — copy the existing JSON shape + extraction sentence + PR-number
  caveat verbatim into the fallback branch, unchanged, so `/relay-approve`'s
  existing call site (which omits `feature`/`prd_path`) is byte-for-byte
  unaffected. Add one sentence naming standalone `/relay-implement` as the
  reason the explicit path exists (no `orchestrator-run.json` until
  `/relay-execute`'s Phase A.6, after implement). Then update Step 1 item 1
  of the Diff-Driven Procedure (line 164, "Read
  `<target_root>/PRPs/reports/<feature>/orchestrator-run.json` to extract
  `feature` and `prd_path`.") to reference the new "Deriving `feature` and
  `prd_path`" subsection instead of unconditionally reading the file.
- **MIRROR**: Pattern 7 (`docs-updater.md:35-53`, the paragraph being
  restructured) and Pattern 3 (`docs-updater.md:23-34`, the Inputs table
  row style to extend).
- **AC**: AC-A1 (PRD AC-1), AC-A6 (PRD AC-1)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q 'feature.*slug' plugins/relay/agents/docs-updater.md
  grep -q 'prd_path' plugins/relay/agents/docs-updater.md
  grep -qi 'Deriving `feature` and `prd_path`' plugins/relay/agents/docs-updater.md
  echo "PASS: docs-updater.md declares explicit feature/prd_path inputs and a Deriving subsection"
  ```

### Task 4: Add explicit `feature` (+ `prd_path`) input to `docs-reviewer.md`

- **ACTION**: In `plugins/relay/agents/docs-reviewer.md`, under
  `## Inputs (from the calling command)` (line 43), add two new bullets:
  `feature` (optional string) and `prd_path` (optional absolute path), each
  documented as "use directly when supplied; skip the orchestrator-run.json
  read for this value entirely." Restructure the "From these, you derive:"
  block (lines 55-68) into a new `### Deriving feature and prd_path`
  subsection with the same two-branch shape as Task 3's docs-updater.md
  revision: explicit-input-first, `orchestrator-run.json`-read-as-fallback
  (including the existing `Scan PRPs/reports/*/orchestrator-run.json...`
  sentence, copied verbatim into the fallback branch). Then update Step 1
  item 1 of the Protocol (line 285, "Read
  `<target_root>/PRPs/reports/<feature>/orchestrator-run.json` to extract
  `feature` and `prd_path`.") to reference the new subsection instead of
  unconditionally reading the file. Keep the Manifest-path / jsonl-log-path
  derivation bullets (lines 63-68) as a trailing "From `feature`, you also
  derive:" block, unchanged in content.
- **MIRROR**: Pattern 8 (`docs-reviewer.md:55-68`, the block being
  restructured) and Pattern 4 (`docs-reviewer.md:43-54`, the Inputs bullet
  style to extend); Task 3's docs-updater.md edit (structural precedent
  within this same plan).
- **AC**: AC-A1 (PRD AC-1), AC-A6 (PRD AC-1)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q 'feature.*slug' plugins/relay/agents/docs-reviewer.md
  grep -q 'prd_path' plugins/relay/agents/docs-reviewer.md
  grep -qi 'Deriving `feature` and `prd_path`' plugins/relay/agents/docs-reviewer.md
  echo "PASS: docs-reviewer.md declares explicit feature/prd_path inputs and a Deriving subsection"
  ```

### Task 5: Correct the `### Phase A.3.5 — Docs-sync dispatch` payloads

- **ACTION**: In `plugins/relay/commands/relay-implement.md`, the
  `### Phase A.3.5 — Docs-sync dispatch` section is already present
  (lines 364-399 in the current working tree, applied by a prior
  implementer attempt against the original, under-scoped plan). Make the
  following three surgical edits inside it; leave the Gate (item 1),
  budget-init (item 2), and "No commit issued" (item 7) prose unchanged.

  **(i) Step A's dispatch payload.** Replace:
  ```
     Task(subagent_type="docs-updater",
          prompt={
            target_root: <target_root>,
            diff_source: "patch",
            patch_path: "<artifact_root><attempt>/diff.patch",
            non_interactive: true,
            prior_feedback: <docs_prior_feedback when retrying; null otherwise>,
          })
  ```
  with:
  ```
     Task(subagent_type="docs-updater",
          prompt={
            target_root: <target_root>,
            feature: <feature>,
            prd_path: "PRPs/prds/<feature>.prd.md",   # PRD mode only (is_prd_less == false); key omitted entirely in PRD-less mode
            diff_source: "patch",
            patch_path: "<artifact_root><attempt>/diff.patch",
            non_interactive: true,
          })
  ```
  removing `prior_feedback` (undocumented on `docs-updater.md`'s Inputs
  contract — see Task 3) and adding the explicit `feature`/`prd_path` keys
  `docs-updater.md`'s Task 3 revision now accepts.

  **(ii) Step B's dispatch payload + trailing sentence.** Replace:
  ```
     Task(subagent_type="docs-reviewer",
          prompt={
            target_root: <target_root>,
            non_interactive: true,
          })
  ```
  ```
     `pr` is intentionally omitted from this dispatch — there is no PR yet at implement time; `docs-reviewer` derives `feature` from the same `<feature>`/`<slug>` context this command already carries (its `Inputs` section preamble documents this derivation independent of `pr`).
  ```
  with:
  ```
     Task(subagent_type="docs-reviewer",
          prompt={
            target_root: <target_root>,
            feature: <feature>,
            prd_path: "PRPs/prds/<feature>.prd.md",   # PRD mode only (is_prd_less == false); key omitted entirely in PRD-less mode
            non_interactive: true,
          })
  ```
  ```
     `pr` is intentionally omitted — there is no PR yet at implement time.
     `feature` (and, in PRD mode, `prd_path`) are passed EXPLICITLY instead
     of relying on `docs-reviewer`'s `orchestrator-run.json` fallback
     (Task 4's revision of `docs-reviewer.md`), because that file does not
     exist at implement time for standalone `/relay-implement`. `<feature>`
     is the same value this command already derives in `## Parse arguments`
     (lines 69-97: `feature = slug` in PRD-less mode; the parsed `<feature>`
     prefix in PRD mode).
  ```

  **(iii) Item 6, deferred questions.** Replace:
  ```
  6. **Deferred questions.** Record any `deferred_question` value the docs pair returned (per `docs-reviewer.md`'s jsonl `deferred_question` field) into a running list `docs_deferred_questions`, surfaced in the Final output surface (below) via the new `Docs:` line.
  ```
  with:
  ```
  6. **Deferred questions.** Record deferred questions from BOTH docs-pair
     artifacts into a running list `docs_deferred_questions` (each entry
     tagged with its source): (i) after Step A completes, read
     `PRPs/reports/<feature>/docs-update.md`'s `## Deferred Questions`
     section — append each entry found, tagged `writer`; (ii) after Step B
     completes, read the just-appended `docs-review.jsonl` line's
     `deferred_question` field (string or `null`) — if non-null, append it,
     tagged `reviewer`. The Final output surface's `Docs:` line (Task 6)
     points at both source artifacts explicitly, so source and pointer
     always agree.
  ```

  Also lightly amend item 5 (Step C) so its closing clause — "...Otherwise,
  loop back to Step A with `docs_prior_feedback` set." — reads "...
  Otherwise, loop back to Step A (`docs_prior_feedback` is retained only
  for the `BUDGET_EXCEEDED` warning-log line — Step A's dispatch payload no
  longer accepts it per edit (i) above)."

- **MIRROR**: Pattern 1 (`relay-approve.md:275-343`, loop shape), Pattern 2
  (`relay-implement.md:297-317`, dispatch + verdict-branch style),
  Pattern 3/7 (`docs-updater.md` Inputs, post-Task-3-revision shape),
  Pattern 4/8 (`docs-reviewer.md` Inputs, post-Task-4-revision shape),
  Pattern 9 (`relay-implement.md:69-97`, `feature`/`is_prd_less`
  derivation), Pattern 10 (docs-updater.md `## Deferred Questions` manifest
  section + docs-reviewer.md `deferred_question` jsonl field — the two real
  artifacts Step 6 reconciles).
- **AC**: AC-A1 (PRD AC-1), AC-A2 (PRD AC-2), AC-A3 (PRD AC-4), AC-A5 (PRD AC-1 / Technical Risks), AC-A6 (PRD AC-1), AC-A7 (PRD AC-2)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q '^### Phase A.3.5' plugins/relay/commands/relay-implement.md
  a35=$(grep -n '^### Phase A.3.5' plugins/relay/commands/relay-implement.md | head -1 | cut -d: -f1)
  a4=$(grep -n '^### Phase A.4' plugins/relay/commands/relay-implement.md | head -1 | cut -d: -f1)
  if [ -z "$a35" ] || [ -z "$a4" ] || [ "$a35" -ge "$a4" ]; then
    echo "FAIL: Phase A.3.5 is not positioned before Phase A.4"; exit 1
  fi
  section=$(awk '/^### Phase A.3.5/,/^### Phase A.4/' plugins/relay/commands/relay-implement.md)
  if echo "$section" | grep -qE '(^|[^_a-zA-Z])prior_feedback[[:space:]]*:'; then
    echo "FAIL: Phase A.3.5 still passes the undocumented prior_feedback key"; exit 1
  fi
  if ! echo "$section" | grep -q 'feature: <feature>'; then
    echo "FAIL: Phase A.3.5 dispatch payload omits explicit feature"; exit 1
  fi
  echo "PASS: Phase A.3.5 present, ordered before Phase A.4, prior_feedback removed, feature passed explicitly"
  ```

### Task 6: Reconcile the Final output surface `Docs:` line to a dual-artifact pointer

- **ACTION**: In `plugins/relay/commands/relay-implement.md`, under
  `## Final output surface`, the `Docs:` line is already present in both
  the PRD-mode and PRD-less-mode success blocks. Replace both occurrences
  of the pointer clause:
  ```
  When `docs_deferred_questions` is non-empty, see `PRPs/reports/<feature>/docs-update.md`'s `## Deferred Questions` section.
  ```
  with:
  ```
  When `docs_deferred_questions` is non-empty, see `PRPs/reports/<feature>/docs-update.md`'s `## Deferred Questions` section (writer-side questions) and/or `PRPs/reports/<feature>/docs-review.jsonl`'s `deferred_question` field (reviewer-side questions) — the two artifacts Task 5 Step 6 sources the list from.
  ```
- **MIRROR**: `relay-approve.md:397-407` (Docs: line pattern); Task 5's
  Step 6 (the corrected dual-source list this task's pointer must match).
- **AC**: AC-A2 (PRD AC-2), AC-A7 (PRD AC-2)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  section=$(awk '/## Final output surface/,/## Constraints/' plugins/relay/commands/relay-implement.md)
  if ! echo "$section" | grep -q 'Docs:'; then
    echo "FAIL: Final output surface missing Docs: line"; exit 1
  fi
  if ! echo "$section" | grep -q 'docs-update.md'; then
    echo "FAIL: Docs: line does not point at docs-update.md (writer-side deferred questions)"; exit 1
  fi
  if ! echo "$section" | grep -q 'docs-review.jsonl'; then
    echo "FAIL: Docs: line does not point at docs-review.jsonl (reviewer-side deferred questions)"; exit 1
  fi
  echo "PASS: Final output surface documents docs-sync outcome and points at both deferred-question artifacts"
  ```

### Task 7: Update the command frontmatter description + mission prose

- **ACTION**: In `plugins/relay/commands/relay-implement.md`, extend the
  YAML frontmatter `description:` field (line 2) and the `## Your mission`
  paragraph (lines 12-16) — already updated by the prior implementer
  attempt to mention the docs-sync dispatch — with one additional clause
  noting that the docs pair is grounded via explicit `feature`/`prd_path`
  inputs rather than `orchestrator-run.json` (which does not exist yet at
  implement time). Keep the existing description content intact; append
  rather than rewrite.
- **MIRROR**: `relay-approve.md:2` (comprehensive one-paragraph command
  description style).
- **AC**: AC-A1 (PRD AC-1)
- **VALIDATE**:
  ```bash
  if ! grep -q "docs-sync" plugins/relay/commands/relay-implement.md; then
    echo "FAIL: docs-sync not mentioned in command description/mission"; exit 1
  fi
  echo "PASS: description/mission documents docs-sync dispatch"
  ```

### Task 8: Add a graceful-degradation Constraint + "What you do NOT do" bullet

- **ACTION**: In `plugins/relay/commands/relay-implement.md`, the numbered
  Constraint 11 ("Never block D8 mutations on docs-sync budget
  exhaustion...") and the matching `## What you do NOT do` bullet are
  already present from the prior implementer attempt. No further edit is
  required for this task; VALIDATE confirms the entries remain intact
  after Task 5/6's edits.
- **MIRROR**: `relay-implement.md:495` (existing Constraint 6, "Never
  bypass D8" — numbered hard-rule-with-rationale style).
- **AC**: AC-A3 (PRD AC-4), AC-A5 (PRD AC-1 / Technical Risks)
- **VALIDATE**:
  ```bash
  if ! awk '/^## Constraints/,/^## What you do NOT do/' plugins/relay/commands/relay-implement.md | grep -qi "graceful degradation\|docs-sync budget"; then
    echo "FAIL: Constraints section missing graceful-degradation rule for docs-sync budget exhaustion"; exit 1
  fi
  echo "PASS: graceful-degradation constraint documented"
  ```

## Validation Commands

**Level 1 STATIC_ANALYSIS**
```bash
set -euo pipefail
grep -q "^---$" plugins/relay/commands/relay-implement.md
grep -q "^## Parse arguments" plugins/relay/commands/relay-implement.md
grep -q "^### Phase A.3.5" plugins/relay/commands/relay-implement.md
grep -q "^### Phase A.4" plugins/relay/commands/relay-implement.md
grep -q "^---$" plugins/relay/agents/docs-updater.md
grep -q "^## Inputs" plugins/relay/agents/docs-updater.md
grep -q "^---$" plugins/relay/agents/docs-reviewer.md
grep -q "^## Inputs" plugins/relay/agents/docs-reviewer.md
echo "PASS: frontmatter and required section headers intact across all three edited files"
```

**Level 2 CONTENT_INVARIANTS**
```bash
set -euo pipefail
grep -q -- "--no-docs" plugins/relay/commands/relay-implement.md
grep -q "docs_sync" plugins/relay/commands/relay-implement.md
grep -q "max_docs_review_retries" plugins/relay/commands/relay-implement.md
grep -q "docs-updater" plugins/relay/commands/relay-implement.md
grep -q "docs-reviewer" plugins/relay/commands/relay-implement.md
section=$(awk '/^### Phase A.3.5/,/^### Phase A.4/' plugins/relay/commands/relay-implement.md)
if echo "$section" | grep -q "git commit"; then
  echo "FAIL: docs-sync section (Phase A.3.5) issues a git commit — violates Pillar 2 never-commit invariant"
  exit 1
fi
if echo "$section" | grep -qi "\.claude/PRPs"; then
  echo "FAIL: docs-sync section references a .claude/PRPs/ path"
  exit 1
fi
if echo "$section" | grep -qE '(^|[^_a-zA-Z])prior_feedback[[:space:]]*:'; then
  echo "FAIL: docs-sync section still passes the undocumented prior_feedback key"
  exit 1
fi
if ! echo "$section" | grep -q "feature: <feature>"; then
  echo "FAIL: docs-sync section does not pass feature explicitly"
  exit 1
fi
if ! grep -q "prd_path" plugins/relay/agents/docs-updater.md; then
  echo "FAIL: docs-updater.md does not declare a prd_path input"
  exit 1
fi
if ! grep -q "prd_path" plugins/relay/agents/docs-reviewer.md; then
  echo "FAIL: docs-reviewer.md does not declare a prd_path input"
  exit 1
fi
echo "PASS: docs-sync dispatch content present; Phase A.3.5 issues no commit, no .claude/ write, no undocumented prior_feedback key, and passes feature explicitly to both agents; both agent files declare prd_path"
```

**Level 3 INTEGRATION (dry-run cross-file contract check)**
```bash
set -euo pipefail
for key in diff_source non_interactive patch_path feature prd_path; do
  if ! grep -q "$key" plugins/relay/agents/docs-updater.md; then
    echo "FAIL: docs-updater.md no longer declares input '$key' — Phase A.3.5's dispatch payload would be stale"
    exit 1
  fi
done
for key in non_interactive feature prd_path; do
  if ! grep -q "$key" plugins/relay/agents/docs-reviewer.md; then
    echo "FAIL: docs-reviewer.md no longer declares input '$key'"
    exit 1
  fi
done
section=$(awk '/^### Phase A.3.5/,/^### Phase A.4/' plugins/relay/commands/relay-implement.md)
if ! echo "$section" | grep -q "non_interactive"; then
  echo "FAIL: Phase A.3.5 dispatch payload omits non_interactive"
  exit 1
fi
if ! echo "$section" | grep -q "diff_source"; then
  echo "FAIL: Phase A.3.5 dispatch payload omits diff_source"
  exit 1
fi
if ! echo "$section" | grep -q "feature: <feature>"; then
  echo "FAIL: Phase A.3.5 dispatch payload omits explicit feature"
  exit 1
fi
if echo "$section" | grep -qE '(^|[^_a-zA-Z])prior_feedback[[:space:]]*:'; then
  echo "FAIL: Phase A.3.5 dispatch payload still carries the removed prior_feedback key"
  exit 1
fi
echo "PASS: Phase A.3.5 dispatch payload keys align with docs-updater/docs-reviewer input contracts; prior_feedback removed"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a target project with `docs_sync: true` and a
  plan whose code-review reaches `APPROVED` (standard mode), when
  `/relay-implement` completes Phase A.3, then it dispatches the
  docs-updater/docs-reviewer pair non-interactively via `Task` in Phase
  A.3.5, before Phase A.4 runs, using `diff_source: "patch"` against the
  current attempt's `diff.patch`.
- **AC-A2 (PRD AC-2):** Given the docs pair defers a question because
  `non_interactive: true` was set, when `/relay-implement`'s Final output
  surface is emitted, then the deferred question is surfaced to the user
  (via the `Docs:` line) rather than as a mid-run prompt.
- **AC-A3 (PRD AC-4):** Given code-review returns `APPROVED`, when the loop
  proceeds, then the docs-sync dispatch (Phase A.3.5) runs strictly after
  the `APPROVED` verdict and strictly before Mutations a/b/c of Phase A.4,
  and no `git commit` is issued by Phase A.3.5.
- **AC-A4 (PRD AC-6):** Given `docs_sync: false` in `methodology.md`, or
  `/relay-implement` invoked with `--no-docs`, when the command runs, then
  Phase A.3.5 is skipped entirely (`--no-docs` takes precedence).
- **AC-A5 (PRD AC-1; PRD Technical Risks row 3):** Given the docs-reviewer
  returns `CHANGES_REQUESTED` more than `max_docs_review_retries=2` times,
  when the docs-sync budget is exhausted, then `/relay-implement` logs the
  exhaustion and proceeds to Phase A.4 D8 mutations rather than halting.
- **AC-A6 (PRD AC-1):** Given no `orchestrator-run.json` exists at
  `<target_root>` (the standalone-`/relay-implement` case, before
  `/relay-execute`'s Phase A.6 has ever run), when Phase A.3.5 dispatches
  `docs-updater` and `docs-reviewer`, then both agents receive `feature`
  explicitly (and `prd_path` explicitly in PRD mode) in the `Task` payload,
  ground themselves directly from those inputs per their revised
  "Deriving `feature` and `prd_path`" contracts, and do NOT attempt (or
  fail attempting) to read a nonexistent `orchestrator-run.json`.
- **AC-A7 (PRD AC-2):** Given `non_interactive: true` causes either agent
  to defer a question, when `/relay-implement`'s Final output surface is
  emitted, then the `Docs:` line points at exactly the two artifacts
  `docs_deferred_questions` was sourced from — `docs-update.md`'s
  `## Deferred Questions` section (writer-side) and `docs-review.jsonl`'s
  `deferred_question` field (reviewer-side) — with no source/pointer
  mismatch.
- **AC-A8 (PRD AC-1 / Technical Risks — non-regression):** Given
  `/relay-approve`'s existing Phase 3 DOCS CYCLE dispatch (unchanged by
  this phase), which passes only `pr`/`target_root`(/`non_interactive`) to
  `docs-updater`/`docs-reviewer` — omitting `feature`/`prd_path` entirely —
  when those agents run, then they fall back to reading
  `orchestrator-run.json` exactly as today, and their `/relay-approve`-
  observable behavior is byte-for-byte unchanged by this phase's edits to
  `docs-updater.md`/`docs-reviewer.md`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A working-tree/patch diff differs in shape from `gh pr diff` and breaks `docs-updater`'s parsing | M | M | Phase 1 already normalized this via `diff_source: "patch"` reading the same captured unified `diff.patch` format `/relay-code-review`'s `diff_target` already consumes |
| The docs loop inside implement overruns `max_implement_minutes=45` | L/M | M | Own retry budget (`max_docs_review_retries=2`) bounds the loop independently of code retries; on exhaustion the command proceeds to D8 rather than blocking (AC-A5) |
| Multi-phase PRDs invoke docs-sync per phase, each dispatch writing to the same feature-level `docs-update.md` manifest before the prior phase's manifest is durably reconciled | M | L | Explicitly deferred per PRD Open Question #2; out of scope for this phase; the approve-time safety net (Phase 3) reconciles any residual drift |
| `diff_source: "patch"` has no existing end-to-end caller anywhere in the repo today | M | M | The contract was authored in Phase 1 specifically for this call site; validate manually against a representative `diff.patch` during implementation |
| Re-opening Phase 1's already-"complete" deliverables (`docs-updater.md`, `docs-reviewer.md`) for a second edit risks silently breaking `/relay-approve`'s existing (already-shipped) call site if the new explicit-input branch isn't strictly additive | L | H | Both edits are additive-only (new optional inputs; orchestrator-run.json read demoted to a fallback triggered only by ABSENCE of the new inputs); AC-A8 makes the non-regression an explicit, testable acceptance criterion; Level 3 VALIDATE confirms both `orchestrator-run.json`-derived keys remain declared |
| PRD-less mode (`is_prd_less == true`) has no source PRD, so `prd_path` cannot be constructed for the Phase A.3.5 dispatch; if either agent treated a missing `prd_path` as a hard failure, PRD-less implement runs would break the docs-sync dispatch entirely | M | M | `prd_path` is documented as optional on both agents (Tasks 3/4); the dispatch payload omits the key entirely in PRD-less mode rather than passing an invalid path; this phase does not otherwise change either agent's pre-existing best-effort handling of an absent `prd_path` |

## Notes

**Revision history.** This plan was originally APPROVED on 2026-07-15 and
scoped to a single file (`relay-implement.md`). Its IMPLEMENT stage was
blocked by a code-review HIGH finding: the plan was under-scoped because
`docs-updater.md` derives `feature`/`prd_path` ONLY by reading
`PRPs/reports/<feature>/orchestrator-run.json`
(`plugins/relay/agents/docs-updater.md:35-53`), a file that is ABSENT at
implement time (standalone `/relay-implement` never writes it;
`/relay-execute` writes it only at its Phase A.6, AFTER implement). This
revision (2026-07-16) expands `## Files to Change` from 1 to 3 files,
adding `docs-updater.md` and `docs-reviewer.md` edits that add explicit
`feature`/`prd_path` inputs (fallback preserves `/relay-approve`'s current
behavior exactly), and fixes three further findings in
`relay-implement.md`'s already-applied Phase A.3.5 draft: an undocumented
`prior_feedback` dispatch key, a deferred-questions source/pointer
mismatch, and stale `feature`-derivation prose. The dispatch mechanics
themselves (ordering, budget, gating, graceful degradation, no-commit
invariant) are unchanged from the original approval. Status reverts to
DRAFT for re-review by `plan-reviewer`.

**Grounding for this revision** was performed via a direct re-`Read` of the
CURRENT working-tree shape of `plugins/relay/agents/docs-updater.md`,
`plugins/relay/agents/docs-reviewer.md`, and
`plugins/relay/commands/relay-implement.md` in this revision session — all
`file:line` citations above (including the confirmation that
`relay-implement.md`'s Phase A.3.5, `--no-docs` flag, `docs_sync` read,
`Docs:` line, and Constraint 11 are already applied from the prior blocked
implementer attempt) were verified against that re-read, not carried over
unverified from the original plan. No fresh `research-codebase` /
`research-web` dispatch was performed for this targeted revision: the
orchestrator's code-review already isolated the exact root cause with
file:line precision, and direct `Read` verification of the three affected
files satisfies the "no invented `file:line`" grounding discipline at
least as strongly as a summarized research-agent finding would.

**TDD routing (this plan, against the relay repo):** Current value of `tdd`
in `docs/context/methodology.md`: **false**. Test-after ordering — when a
test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored. This phase is a prompt/config-markdown-only edit to three
command/agent files (`phase_type: scaffold`); its Files to Change table
contains no runtime source, so the `node:test` framework declared in
`methodology.md` has no unit-testable surface here — grep-based filesystem
VALIDATE commands are the correct idiom (exempt from
R-COH-VALIDATE-FRAMEWORK-MISMATCH per `docs/decisions.md` [2026-07-02], per
the pre-seeded guidance carried into this plan from Phase 1's plan-review).

Grounding for the original plan was performed via direct `Read` of
`plugins/relay/commands/relay-implement.md`,
`plugins/relay/commands/relay-approve.md`,
`plugins/relay/agents/docs-updater.md`, `plugins/relay/agents/docs-reviewer.md`,
and `docs/context/methodology.md`, in addition to dispatching
`research-codebase` and `research-web` subagents in parallel per the
standard Phase 2 GROUNDING protocol. `research-codebase` independently
confirmed the same insertion point and the same `--no-docs`/`no_docs_flag`
precedent, and flagged the gap Task 6 resolves (no command-owned
"implementation report" distinct from `diff.patch`/`record.json`/
`halt.json`) — this revision resolves it more precisely than the original
draft by pointing at BOTH real deferred-question artifacts rather than
just one. `research-web` found no published example of a docs-sync
writer/reviewer pair dispatched pre-merge on a working-tree diff; this is
treated as directional, not a blocker.

The graceful-degradation design for docs-sync budget exhaustion (AC-A5,
Task 5 Step C, Task 8) remains this plan's one substantive design decision
beyond literal PRD restatement, unchanged by this revision: reasoned from
(a) the PRD's own "Approve becomes a safety net" success metric, (b) the
Decisions Log's "own budget ... keeps the docs loop bounded independently
of code retries," and (c) relay-implement.md's own Decision Gate template
already naming "graceful degradation" as an applicable architectural rule.

*Generated: 2026-07-15*
*Revised: 2026-07-16*
*Approved: 2026-07-16*
*Implemented: 2026-07-16*
*Status: IMPLEMENTED*
