# Glossary

Recurring terms used across the `relay` plugin, its planning documents, and
the documentation. Sourced from `docs/planning/planejamento_fase_2.docx` §13
and the upstream prp-core vocabulary.

## Advisory Pass-Through

The mechanism that carries a plan-review verdict's open advisory-classed
findings (see Materiality Class below) forward to the Implementer and to
the operator, without gating anything. `/relay-implement`'s Phase A.0
derives `open_advisories: list<{rubric_id, reason}>` from the plan's
`<basename>.review.jsonl` LAST entry — every row carrying both `"class":
"advisory"` and `passed: false` (a row with no `class` field reads as
blocking per Materiality Class's compatibility rule, so it can never
contribute an advisory); a plan with no `review.jsonl` yet simply
contributes none, no halt, no warning. `open_advisories` is computed
ONCE per invocation and carried unmodified into every attempt's
implementer dispatch of that invocation. Phase A.2's dispatch payload
carries an `advisories` key set to `open_advisories` only when
non-empty — the key is OMITTED entirely, never passed as `null`, on a
zero-advisory run, so that dispatch stays byte-identical to the
pre-Phase-3 shape. `implementer.md` declares `advisories` as an
optional input and reads it BEFORE executing tasks, absorbing each as a
non-blocking caveat during normal execution (e.g. re-locating a
drifted `file:line` cite by content search instead of trusting the
number) — advisories never add tasks, never modify the plan, and never
gate completion. Advisories are never a retry trigger and are never
counted by any session budget (`max_implement_retries`,
`max_implement_minutes`, `max_disputes_per_session`). Separately,
standalone `/relay-plan-review`'s own APPROVED summary MAY carry a
second, informational-only line — `Open advisories: <n> (recorded in
review.jsonl; not gating).` — when the approving entry has open
advisory-classed rows; the command appends nothing else of its own, and
no sidecar artifact is written (console-only surfacing by design).
Shipped as Phase 3 of `plan-review-materiality` (see
`docs/decisions.md` 2026-08-07); class-aware `efficiency.mjs`
measurement and PR-body advisory surfacing — see Measurement +
Surfaces below — shipped as Phase 4 (see `docs/decisions.md`
2026-08-07), completing `plan-review-materiality` end to end.

## Agent

Within Claude Code, a specialized persona with a dedicated system prompt and
its own tool allowlist. Distinct from the orchestrator, which coordinates
agents.

## Auto-correction loop

Automatic cycle in which the Test Runner identifies failures, asks the
Implementer to fix them, re-runs the tests, and repeats until green or a
configurable retry limit is reached.

## Component map

Per-project, cross-feature table (`docs/design/component-map.md`) mapping
Figma library components to real code components in the target project's
design system. Built or additively refreshed by `/relay-design-map` via
the `design-map-writer`/`design-map-reviewer` pair; a durable
knowledge-base artifact, not a per-run pipeline artifact (see
`docs/decisions.md` 2026-07-23). Part of the Figma Implementation Track
(Phase 3).

## Context-builder

Phase 1 component that documents the target project into structured files
(`docs/context/`, `docs/domain/`, `docs/libs/`) so downstream AI agents can
operate precisely in the repository. In `relay`, it ships as the skill at
`plugins/relay/skills/context-builder/`.

## Decision Gate

Mandatory cognitive control mechanism applied before planning, coding, or
reviewing. Forces consultation of `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md`. See
`docs/decision-gate.md`.

## Design Source

`design_source: figma | none` — a mandatory, non-heuristic Metadata field
on every plan/PRD phase when the target project declares
`figma_track: true`; NEVER inferred by a reviewer (diverges deliberately
from the `phase_type` precedent — see `docs/decisions.md` 2026-07-23).
When `figma`, a conditional `## Design Source` section (table of in-scope
frames: node-id, name-path, route, viewport, diff threshold, ref PNG
path) accompanies the field in both `plugins/relay/resources/plan-template.md` and
`plugins/relay/resources/prd-template.md`. Absence under `figma_track: true` is a
structural `CHANGES_REQUESTED` (`plan-reviewer`'s
`R-COH-DESIGN-SOURCE-MISSING`, `prd-reviewer`'s
`R-COH-DESIGN-SOURCE-INCOMPLETE`), never self-healed. Part of the Figma
Implementation Track (Phase 5).

## Design Spec

Per-feature, human-approved contract (`PRPs/designs/<feature>/design-spec.md`)
turning one feature's Figma design into a business-grounded,
evidence-backed intermediate artifact — reference screenshots, an
embedded token map, REUSE/NEW/ASSUMPTION component-mapping rows (citing
the Component map's `CM-<n>` ids), an implementation delta, and
per-frame visual acceptance criteria. Written by `design-spec-writer`,
inline-adopted (never `Task`-dispatched) alongside `design-spec-reviewer`
by `/relay-design-spec`; flips to `APPROVED` only after the user's own
explicit affirmative reply — the single point of human contact with the
raw Figma interpretation. Part of the Figma Implementation Track
(Phase 4).

## Environment probe

Step executed at the start of an autonomous run that detects which
capabilities are available in the target project (Docker, test frameworks,
`gh` CLI, etc.) so the pipeline can skip components with absent
prerequisites.

## Fidelity report

`fidelity-report.json` — per-attempt artifact written by the
`visual-verifier` agent (`PRPs/reports/<feature>/phase-<N>/visual/<attempt>/`)
recording one entry per in-scope frame (`node_id`, `route`,
`diff_percent`, `threshold`, `status`). Written by `compare.mjs` on the
FULL rung; written directly by the agent as a degraded-mode stub on
either degradation rung, so degradation stays visible in the artifact
itself, never only in the command's own `visual_outcome`. Part of the
Figma Implementation Track (Phase 6).

## Flakiness

Property of a test that passes and fails non-deterministically without code
changes. Common source of noise in CI pipelines; the Test Runner's failure
classifier (B3) handles it via bounded retry without code changes.

## Graceful degradation

Property of a system that continues functioning (with reduced capabilities)
when an optional component or resource is unavailable. Required of every
relay component — see `docs/context/constraints.md`.

## Implementer (Implementador)

Agent that turns an approved plan into code changes in the worktree. Does not
run tests itself — hands off to the Test Runner.

## Marketplace

Claude Code's distribution container for plugins. In this repo, declared at
`.claude-plugin/marketplace.json` and publishes the single plugin `relay`.

## Materiality Class

`class: blocking | advisory` — a statically declared per-check
attribute on every `plan-reviewer` rubric check id (R1–R8 and every
deterministic/K=5 `R-COH-*` id), recorded in
`plugins/relay/agents/plan-reviewer.md`'s `## Materiality classes
(blocking / advisory)` partition table. `blocking` gates the
`APPROVED`/`CHANGES_REQUESTED` verdict — R1–R8 are all `blocking`.
`advisory` is recorded and surfaced in `review.jsonl` but never gates
approval on its own: a run whose only failing rows are advisory-classed
still flips to `APPROVED`, with an added `Open advisories: <n>` summary
line. A check id added to the rubric after this taxonomy shipped
defaults to `advisory`; promotion to `blocking` requires a recorded
`docs/decisions.md` entry citing measured evidence. A one-way
**escalation valve** lets the reviewer mark an individual
advisory-classed finding `"class": "blocking", "escalated": true`
when it would mislead the Implementer, with a `reason` naming the
concrete Implementer-impact — never the reverse; no demotion
mechanism exists anywhere in the protocol. Every emitted
`review.jsonl` rubric row carries a `class` field; rows without one
predate this taxonomy and are read as `blocking`. Shipped as Phase 1
of `plan-review-materiality` (see `docs/decisions.md` 2026-08-06). A
retry convergence ratchet narrowing blocking scope on retry attempts
≥2 — see Retry Convergence Ratchet below — shipped as Phase 2 (see
`docs/decisions.md` 2026-08-07). `/relay-implement` advisory
pass-through — see Advisory Pass-Through above — shipped as Phase 3
(see `docs/decisions.md` 2026-08-07); class-aware `efficiency.mjs`
measurement and PR-body advisory surfacing — see Measurement +
Surfaces below — shipped as Phase 4 (see `docs/decisions.md`
2026-08-07), completing `plan-review-materiality` end to end.

## Measurement + Surfaces

The Phase 4 (final) capability of `plan-review-materiality`, making the
Materiality Class taxonomy's (see above) hypothesis measurable and its
open advisories visible outside `review.jsonl` itself.
`scripts/efficiency.mjs`'s `readCorpus()` captures each failing rubric
row's `class` as `failClasses` — a row missing the field reads as
`blocking`, the same absence-is-blocking compatibility rule Materiality
Class established; `aggregate()` computes per-stage `blockingFailRows`,
`advisoryFailRows`, and `topFailuresByClass: {blocking, advisory}` (top
8 ids each by count), leaving `firstAttemptFailureRate` semantics
unchanged (it is verdict-based, so an advisory-carrying `APPROVED`
already counted as a first-attempt pass before this phase);
`doCompare()`'s console output gains one conditional `blocking/advisory`
summary line per stage (top 4 advisory ids), printed only when that
stage's after-set carries at least one advisory-classed failing row, so
a pre-materiality corpus's comparison output stays byte-identical to
before this phase. `plugins/relay/scripts/generate-final-report.mjs`
gains `loadOpenPlanReviewAdvisories()`, which walks a feature's
phase-numbered plans across `PRPs/plans/` and `PRPs/plans/completed/`,
reads each `<basename>.review.jsonl`'s last entry, and collects every
open (`passed: false`, `"class": "advisory"`) rubric row into an "Open
plan-review advisories" PR-body table — omitted entirely (no heading)
when none exist, mirroring the Visual Fidelity section's own
discover-then-guard idiom, so a merge with zero open advisories
produces a byte-identical PR body. The `efficiency-report` skill
(`.claude/commands/efficiency-report.md`) gains a semi-manual sampling
step: read the new per-class tallies, sample artifacts carrying the
most-frequent advisory-classed ids, and judge — never compute — whether
the same phase later failed code-review or tests for a related reason,
feeding the evidence-based promotion loop Materiality Class already
named (a frequently-converting advisory-classed check is a *candidate*
for promotion to `blocking`, only via an explicit, human-recorded
`docs/decisions.md` entry citing the measured evidence; promotion is
never automatic). Shipped as Phase 4 of `plan-review-materiality` (see
`docs/decisions.md` 2026-08-07) — the feature's final phase. All four
phases (Materiality Class, Retry Convergence Ratchet, Advisory
Pass-Through, Measurement + Surfaces) are now shipped end to end; the
source PRD's own Success Metrics (≤20% first-attempt
`CHANGES_REQUESTED`, ≤1.25 mean verdicts per plan, <10% open advisories
implicated in a later failure) remain UNVALIDATED as of this entry —
they require measurement over the first ~20 post-release plan
artifacts, which has not yet accumulated.

## Mock Sentinel Convention

`[RELAY-MOCK-DATA]` / `[RELAY-MOCK-BEHAVIOR]` — a plain, language-agnostic
inline-comment convention every `phase_scope: visual` plan is authored
against: `[RELAY-MOCK-DATA]` wraps a literal displayed value standing in
for real data; `[RELAY-MOCK-BEHAVIOR]` wraps a handler standing in for
real business logic. Deliberately not phase-number-bearing, so the
convention survives phase renumbering. A visual phase is bound to zero
real side effects (no network call, no persistence, no real state
mutation) — every value on screen and every interactive action must
carry one of the two sentinels. The paired `phase_scope: logic` phase
must resolve every sentinel with no deferral path before it can
complete. Canonical documentation: `plugins/relay/resources/mock-sentinels.md`.
The zero-side-effects check at plan-review time
(`plan-reviewer`'s `R-COH-VISUAL-SCOPE-PURITY`) shipped in Phase 3; the
zero-remaining-sentinel ledger check (`plan-reviewer`'s
`R-COH-SENTINEL-RESOLUTION-MISSING`, mutually exclusive with
`R-COH-VISUAL-SCOPE-PURITY` since `phase_scope` carries exactly one
value per plan) shipped in Phase 4. Part of the Figma Visual-First
Track (Phase 1).

## Orchestrator (Orquestrador)

Phase 3 component that coordinates all agents in sequence, turning N
discrete commands into a single end-to-end command.

## Phase Scope

`phase_scope: visual | logic` — a plan `## Metadata` field, present
only when the plan's source PRD declares `visual_first: true`; absent
entirely otherwise, never inferred. Deliberately mirrors `design_source`'s
non-heuristic, never-inferred lineage rather than `phase_type`'s
self-healing one: "is this phase visual or logic" is a business/authoring
decision no reviewer may manufacture on the plan-writer's behalf. A
`visual` phase is restricted to UI-and-mocks work (see Mock Sentinel
Convention); its paired `logic` phase resolves that sentinel ledger and
wires real behavior. Strict 1:1 pairing between a `visual` phase and its
`logic` phase is expressed via the existing `Depends` column — no new
PRD-table column. Part of the Figma Visual-First Track (Phase 1); the
per-row sourcing mechanism (verbatim `[VISUAL]`/`[LOGIC]` tag read from
the source PRD row's `Phase` cell, HALTing `FAILED_PHASE_SCOPE_UNDECLARED`
when undeclared) and `plan-reviewer`'s `R-COH-VISUAL-SCOPE-PURITY`
enforcement check shipped in Phase 3; the `logic`-side sentinel-ledger
derivation and `plan-reviewer`'s `R-COH-SENTINEL-RESOLUTION-MISSING`
enforcement check (mutually exclusive with `R-COH-VISUAL-SCOPE-PURITY`)
shipped in Phase 4.

## Plugin

A Claude Code installable package that bundles skills, commands, agents, and
hooks under a `.claude-plugin/plugin.json` manifest. `relay` is one such
plugin; `prp-core` is the upstream reference plugin kept on disk.

## Post-green review (Revisão pós-verde)

Validation step executed after the auto-correction loop turns all tests
green, to verify that tests were not weakened and still measure the intended
behavior. Implemented by component B5 of the Phase 2 plan.

## PRD (Product Requirement Document)

Structured specification of a feature, produced by the PRD Writer agent and
reviewed by the PRD Reviewer. Serves as input to the Plan Writer.

## PRP (Product Requirement Prompt)

Concept inherited from `prp-core`: PRD + repository intelligence + an
executable runbook the AI can follow.

## Retry Convergence Ratchet

A `plan-reviewer` mechanism (`### Step 1.5 — Prior-verdict ratchet
context`) that narrows blocking scope on a plan-review retry (attempt
≥2). Computes `previously_cited_ids` (the prior `CHANGES_REQUESTED`
entry's blocking-classed failing ids only) and `implicated_sections`
(those ids mapped to plan sections, mirroring `plan-writer.md`'s own
`## Targeted revision mode` cited-id→section mapping). **ACTIVE** only
when both the prior `review.jsonl` entry and the current invocation
carry a `section_hashes` map (a per-`## `-heading content-hash map,
computed by the invoking command's own shell — `plan-reviewer` never
computes a hash itself) and every section outside `implicated_sections`
is unchanged between the two maps. Under an ACTIVE ratchet, a
blocking-classed failing row is "blocking-effective" (gates the
verdict) only when previously cited or anchored inside an implicated
section; every other blocking-classed row is downgraded to `"class":
"advisory"` plus `"ratchet": "out-of-scope-new-finding"` and does not
gate. Under an **INACTIVE** ratchet (no prior entry, prior `APPROVED`,
either hash map absent, or a hash mismatch outside the implicated
set — the last case recording a `ratchet_void_reason`), every
blocking-classed row is blocking-effective, i.e. Materiality Class's
Phase 1 semantics verbatim. Narrows gating only — never widens it, and
never changes what Step 2 evaluates or logs (the AC-10 no-short-circuit
invariant is unchanged). The Materiality Class escalation valve always
wins regardless of ratchet state. `relay-execute.md`'s
`FAILED_PLAN_REVIEW_STUCK` stuck-loop detection and its `prior_feedback`
payload both compose over blocking-effective ids only. Shipped as Phase
2 of `plan-review-materiality` (see `docs/decisions.md` 2026-08-07).

## Skill

Reusable capability that Claude Code loads on demand. Each skill lives at
`plugins/<plugin>/skills/<name>/SKILL.md` and is described by YAML
frontmatter. `context-builder` is the only relay skill today.

## TDD (Test-Driven Development)

Development methodology in which tests are written before production code,
in a red-green-refactor cycle. In `relay`, TDD is an opt-in mode: active
only when the target project explicitly declares it in its context-builder
output.

## Test writer/reviewer pair (formerly the TDD track / Trilho de TDD)

Pair of agents — `test-writer` and `test-reviewer` (formerly `tdd-writer` /
`tdd-reviewer`) — that authors and maintains a project's test suite whenever a
test framework is declared. The `tdd:` value selects ordering: test-first
(before the Implementer, `tdd: true`) or test-after (after the Implementer +
Code Review, `tdd: false`). Owns the full test lifecycle (create / update /
delete) via a manifest lifecycle ledger; the Implementer never touches test
files (R-X strict).

## R-X executable-content equivalence (Step X.2)

The only way an R-X-matched test path can be cleared in standard mode. After
the file-level `git diff --name-only` match, `code-reviewer` runs
`plugins/relay/scripts/executable-content-hash.mjs`, which strips comments,
Python docstrings and test-title strings from both revisions of the path and
hashes what remains; the path clears if and only if the two hashes are equal,
and both are recorded in the verdict so the clearance is reproducible. Every
other string literal and the callee survive into the hash, so a changed
expected value or an added `.skip` never clears. Fail-closed: an unsupported
extension, an ambiguous source or a script that cannot run clears nothing.
Added test content is out of scope by construction — that is
`DISPUTE_UPHELD_NEW_COVERAGE`'s territory (2026-08-28).

## Test Runner

Specialized agent that executes the test suite, interprets results,
coordinates the auto-correction loop, and produces the execution report.
Component B1 of the Phase 2 plan.

## Visual-First Approval

`visual_first_approval: auto | human` — a `docs/context/methodology.md`
frontmatter key, default `auto`, meaningful only when `figma_track:
true`. Selects how a `phase_scope: visual` phase's blocking
visual-verification gate is signed off: `auto` lets the machine gate
(`visual-verifier` returning `VISUAL_VERIFIED`) unlock the paired logic
phase on its own; `human` additionally requires an explicit human
approval — via the `/relay-visual-approve` command — after
inspecting the captures. Follows the same non-heuristic contract as
`figma_track`: deterministic default-emission on `*init`,
preserve-on-`*update` of an already-set value, backfill only when the
key is entirely absent. Enforced deterministically by the
`gating-structure` check's second `SITES` registry entry (`npm run
validate`). Part of the Figma Visual-First Track (Phase 1); the
blocking gate itself (both `auto` and `human` modes) and the
`human`-mode `AWAITING_VISUAL_APPROVAL` halt shipped in Phase 5; the
`/relay-execute` resume semantics and the dedicated
`/relay-visual-approve` command shipped in Phase 6.

## Visual-First Mode

`visual_first: true | false` — a PRD-level opt-in flag (`## Visual-First
Mode` section of `plugins/relay/resources/prd-template.md`), present only when the
target project's `docs/context/methodology.md` declares `figma_track:
true`; never inferred from PRD content. When `true`, every row of the
PRD's Implementation Phases table must be strictly scope-pure — wholly
`phase_scope: visual` or wholly `phase_scope: logic`, never mixed —
paired 1:1 via the existing `Depends` column, so the UI is locked and
visually approved against inline mocks (see Mock Sentinel Convention)
before any business logic exists. Opt-in per PRD, not per project — a
`figma_track: true` project may still author non-visual-first PRDs on
the v1 single-phase flow. Part of the Figma Visual-First Track
(Phase 1). Phase 2 ships the authoring/enforcement mechanics: a
`figma_track`-gated `prd-writer` question (Phase 6 DECISIONS Item 6.5)
records the flag, each Implementation Phases row is tagged with a
mandatory leading `[VISUAL]`/`[LOGIC]` bracket in its `Phase` cell
(mirrors the Mock Sentinel Convention's own bracket-tag idiom), and
`prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` structurally
enforces exactly-one-tag-per-row plus strict 1:1 `Depends` pairing,
`CHANGES_REQUESTED` otherwise.

## Visual-verification loop

Sub-phase (`/relay-implement`'s `Phase A.3.4`) that dispatches the
`visual-verifier` agent immediately after the Code Reviewer returns
`APPROVED`, when `figma_track: true` and the plan's `design_source:
figma`. Orchestrates `provision.mjs` → `capture.mjs` → `compare.mjs`
against the plan's Design Source and the referenced Design Spec's
Visual Acceptance Criteria, classifying every frame as
`VISUAL_VERIFIED`, `VISUAL_DEGRADED` (a named degradation rung), or
`VISUAL_MISMATCH` (triggers one bounded fix round, then a
deterministic revert on non-convergence). On a `phase_scope: logic`
plan (or a plan with no `phase_scope` row) the loop stays
non-blocking exactly as originally shipped. On a `phase_scope: visual`
plan (Figma Visual-First Track), the loop instead blocks: only a
genuine `VISUAL_VERIFIED` under `visual_first_approval: auto` lets the
phase proceed past Phase A.3.4 automatically; under
`visual_first_approval: human`, every outcome — including
`VISUAL_VERIFIED` — instead HALTs `AWAITING_VISUAL_APPROVAL`, resumed
by the Figma Visual-First Track Phase 6 human-approval mechanism (the
`/relay-visual-approve` command plus `/relay-execute`'s own resumable
visual-approval check); every other `auto`-mode outcome HALTs
`VISUAL_GATE_BLOCKED`. Part of the Figma Implementation
Track (Phase 6); the `phase_scope: visual` blocking extension is Figma
Visual-First Track Phase 5.

## Worktree

Native git mechanism that allows multiple checkouts of different branches
of the same repository in isolated directories. Phase 3 of the plan uses a
worktree per autonomous run so the user's working copy stays untouched.

## Writer / Reviewer pair

Design pattern used throughout the relay pipeline: every generative stage
(PRD, Plan, TDD suite, Code, Docs) has a writer agent and an independent
reviewer agent. The reviewer can request changes; the writer reapplies.
