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

## Lane

One independent dependency chain of an Implementation Phases table, derived
from the `Depends` column restricted to a repository. Each lane gets its own
worktree and `feature/` branch, so concurrent phases stop sharing a working
tree and git index. The optional `Parallel` cell may force two chains into one
lane (more serial) but can never split rows `Depends` ties together.
`/relay-execute` runs lanes concurrently only when the project declares
`lane_runtime_safe: true` in `docs/context/methodology.md`, up to
`max_lanes_in_flight` (default 3); otherwise it runs serially and says why.
Lanes return structured outcomes and the orchestrator alone writes the PRD
table and `orchestrator-run.json`. `/relay-commit` integrates a repository's
lane branches into its feature branch. See
`PRPs/prds/parallel-phase-execution.prd.md`.

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

## QA assertion actions

The three flat `browser` plan steps `plugins/relay/scripts/qa-run.mjs` adds to
its closed step vocabulary so that a case can assert more than presence:
`expect_value`, `expect_state` and `expect_not_visible`. Each takes only a
grounded locator form (`role` plus `name`, and for `expect_not_visible` also
`text`; never a `selector`), counts as one expectation and is grounded like any
locator step (a `ground` snapshot entry whose `matches` is exactly 1, or a name or text the
report's own steps state), with the expected value or state taken from the report's own steps
and never from the snapshot.
`expect_value` compares the value of an input, a textarea or a select with
exactly one of `equals` (exact), `contains` (a non-empty string) or `not_empty`
(always `true`, surrounding whitespace ignored), and allows `{{name}}` bindings
in `equals` and `contains`. The value is never written: the comparison evidence
(`case-<n>.value-<step>.json`) holds the action, the step position, the locator
already in the plan, a closed comparison word and `passed` or `failed`, no
result or reason carries the value, and the final screenshot masks the located
field. `expect_state` asserts `expanded` (read from `aria-expanded`), `disabled`
(Playwright's definition) or `checked` (a checkbox or radio) against a boolean
`equals` that is always written. An element that holds no value, or exposes no
such state (a button without `aria-expanded`, a `details` disclosure, a
non-checkbox, an `aria-checked="mixed"` element), blocks the case
`STEP_NOT_PERFORMABLE` and is never read as an empty value, collapsed or
unchecked. `expect_not_visible` passes only when the grounded locator is hidden
or absent. A value, a state and an absence are each re-read for up to 5 seconds
(`ASSERT_SETTLE_MS`, every 100 ms, both chosen and not measured) before the step
is decided. The absence anchor: an `expect_not_visible` step is valid only after
a positive step (`expect_visible`, `expect_text`, `expect_value` or
`expect_state`) on the same route since the last `goto`, because a locator that
matches nothing is hidden and an absence alone would pass on a page that never
rendered; without it the entry is `PLAN_ENTRY_INVALID` before anything is
seeded, authenticated or requested. A `goto` resets the anchor and an
`expect_url` to another route drops it, but a `click` that navigates away does
not: the anchor proves that the route rendered earlier in the case, not at the
instant of the absence check. See `plugins/relay/commands/relay-qa-run.md`.

Visibility is judged as a person would in `expect_visible`, `expect_text` and
`expect_not_visible`: an element counts as visible only when Playwright reports it
visible and the browser's `checkVisibility`, read with its opacity and visibility
options, agrees, so an element at `opacity: 0`, under an ancestor at `opacity: 0` or
at `visibility: hidden` is not visible (`expect_visible` and `expect_text` fail on
it with a fixed reason, `expect_not_visible` passes). Playwright alone counts an
`opacity: 0` element as visible. A positive step is re-read for up to
`ASSERT_SETTLE_MS`, so a fade-in has time to finish. The final capture of a browser
case is a full-page screenshot with the password and `expect_value` masks, bounded
by `CAPTURE_TIMEOUT_MS` (30 seconds, chosen and not measured) and retried once as a
viewport-only capture if the full-page capture fails.

Two planner rules the command doc states for these actions. A `click` that
navigates does not reset the absence anchor, so the planner follows it with an
`expect_url` of the new path and a positive step on the page it lands on before
any `expect_not_visible`. A `checked` step on an element whose `aria-checked` is
`mixed` blocks the case, but the runner reads only that attribute: a native
checkbox whose DOM `indeterminate` property is set exposes no `aria-checked`, is
not detected and is read as Playwright reports its checked state. A step planned
after an interaction is grounded from the plain snapshot or from the
post-interaction snapshot a `--prefix` ground wrote (see "QA grounding
snapshot").

A locator step is also valid when its `name` or `text` appears in the case's manual
steps: it then has no snapshot entry, and the runner resolves it when the case runs,
passing on exactly one match and ending the case `needs-human` `STEP_UNGROUNDED` on none
or several; a locator that is neither a snapshot entry nor a word of the report is
`PLAN_ENTRY_INVALID`. Four optional keys reshape a locator and are always resolved when
the case runs: `within` (a `role` plus `name` or `name_prefix` scope that must resolve to
exactly one element, chained so the locator matches only inside it), `name_prefix`
(a name matched by its start, for a name that embeds a live count), `label_text` (an input
whose label is not associated with it: from the one element whose visible text equals the
label, the runner walks up to the nearest ancestor that holds exactly one `input`,
`textarea` or `select`) and `index` (the zero-based position among the elements of a
`role` inside a `within` scope). See `plugins/relay/commands/relay-qa-run.md`.

A browser step that is none of these three, `expect_requests`, counts the
requests the page issues instead of reading an element. It takes no locator, is
not a positive assertion and so is no anchor for `expect_not_visible` (see "QA
observed-request window").

## QA case class and reason-code catalogue

Two fields of a `/relay-qa-run` plan entry (`plan.json`), both declared by the
planner and only validated and echoed by the runner, never inferred from the
report. `class` is the pre-run classification of a case: `automatable`,
`needs-a-new-driver`, `human-by-nature` or `blocked-by-product`; it is
independent of the outcome, and an entry with no class is reported
`unclassified`. `reason_code` names why a declining entry (a class and a code,
no steps) does not execute its case, drawn from a closed catalogue defined once
in `plugins/relay/scripts/qa-run.mjs` (`REASON_CATALOGUE`) and pinned by the
`qa-run-contract` check: `UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`,
`OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`, `VISUAL_JUDGEMENT`,
`VOCABULARY_GAP`, `STEP_UNGROUNDED`, `PRODUCT_DEFECT` and `STATE_UNCONFIRMED`,
plus the runner-produced `PARTIAL_REMAINDER`, `JUDGEMENT_UNCERTAIN` and
`ROLE_NOT_DEDICATED`, which a plan entry may not declare. Every code carries a
reason class, `impossible` (`EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT`,
`HUMAN_SIGNOFF`) or `gap` (every other code), distinct from the `class` of a
case. A declined case is `needs-human` or `blocked` with a fixed reason and its
manual steps verbatim, and a code outside the catalogue makes the entry
`PLAN_ENTRY_INVALID`. A case the plan omits is `NO_PLAN_ENTRY`, a planner defect
that is not a catalogue member. `results.json` carries a `classification` block
(per-class counts, the driver-executed rate over the automatable class and the
objective-step counters); the four-key `counts` partition is unchanged, and the
step counters `needs_human_impossible` and `needs_human_gap` sit beside it. See
`plugins/relay/commands/relay-qa-run.md`.

Two more plan-side declarations of `/relay-qa-run`, both validated by the runner and
never inferred. `chosen_inputs` is an optional entry key that lists the `fill` steps
whose value the planner chose because the report leaves it open, each with a `source`:
`capture` (a `{{name}}` binding of a declared capture) or `snapshot` (a literal of at
least 3 characters found, whitespace collapsed and case ignored, in the name or text of
an entry of a grounding snapshot of the run directory); a literal found nowhere is
`PLAN_ENTRY_INVALID`, and a later `expect_value` or `expect_text` may expect a chosen
value. `effect` is an optional step key with the single value `write`, valid on a
`click`, `fill` or `request` step: a case that carries a marked step is blocked with
`ROLE_NOT_DEDICATED`, before any seed, session or request, unless the case's role has
`"dedicated": true` in `PRPs/auth/login.config.json`, a flag the operator sets by hand
and `/relay-auth-scripts` never writes. See `plugins/relay/commands/relay-qa-run.md`.

A third plan-side declaration of `/relay-qa-run` is the `judge` step, for a visual,
language or checklist judgment that the report's own steps ask for. Its `criterion`
must appear verbatim in the case's manual steps, so it is never invented. When `run`
reaches it the script writes a capture, and an element capture when the step names a
`within` scope, and records the step as `pending-judgment`; the case has no outcome
until the command session reads each capture and records a verdict through the `judge`
mode of `qa-run.mjs` (`pass`, `fail` or `uncertain`, always with a text that says what
the capture shows). The script never calls a model and never replaces a recorded
verdict. A judged step is flagged `judged_by` `model`; an `uncertain` verdict ends the
case `needs-human` with `JUDGEMENT_UNCERTAIN`. See `plugins/relay/commands/relay-qa-run.md`.

A fourth plan-side declaration of `/relay-qa-run` is the `read_message` step, for a verification
code that a local mail catcher or a local file holds. The project declares the source under
`channel_sources` in `PRPs/auth/qa-seed.json` (a Mailpit origin that the local-only guard
approves, or a file inside the target root); the step reads the newest message received
after the case began, binds the first group of its regular expression to a variable of the
case and registers the value for redaction, so it reaches no evidence file, reason or
terminal line. A case that needs a message from a channel with no declared source is
declined as before. See `plugins/relay/commands/relay-qa-run.md`.

The preflight of `/relay-qa-run` is a read-only mode of `qa-run.mjs` that checks the
environment before a run starts, with no network request: that Playwright resolves from
the target or from the installed plugin directory, that the Chromium build it needs is
installed, that every kit login script carries the installed template's stamp and that
`PRPs/auth/.sessions/` is ignored by git. It exits non-zero on any failure and names the
one command that provisions a missing dependency, which the operator runs once per
plugin version; the runner never downloads anything itself. The same unresolvable
Playwright halts `run` and `ground`, and a stale kit script halts `ground` by name. See
`plugins/relay/commands/relay-qa-run.md`.

## QA grounding snapshot

The file `qa-run.mjs ground` writes under `<run-dir>/grounding/` for one route
and one role: the role-and-name and visible-text candidates of the page's
accessibility snapshot, each with the number of elements it `matches`, from
which `/relay-qa-run` plans locator steps (a step is planned from an entry
that matches exactly one element, or from a word of the report's own steps). It is taken from the settled page, not the
first paint: the script reads the snapshot repeatedly and writes the file only
once two successive snapshots, 1 second apart (`GROUND_POLL_INTERVAL_MS`), are
equal within 20 seconds (`GROUND_STABLE_BOUND_MS`). A page that never settles
ends `GROUND_UNSTABLE` (exit 1, no snapshot file, never a best-effort snapshot),
and each case that needed a locator on that route is declined
`STEP_UNGROUNDED`. The visible-text candidates include paragraph, list-item and
cell lines, capped separately from the other candidates so a long table cannot
displace a button or a heading. The interval and the bound are chosen, not
measured on a real single-page application. Under Windows Git Bash a
leading-slash `--route` needs `MSYS_NO_PATHCONV=1`, because MSYS otherwise
rewrites it before the script sees it. See
`plugins/relay/commands/relay-qa-run.md`.

A post-interaction snapshot is the same file kind taken after `ground` replayed
a prefix (`--prefix '<json>'`): at most 5 flat `goto`, `click` and `fill` steps
of the case itself (`GROUND_PREFIX_MAX_STEPS`; at least one `click` or `fill`;
each naming its element by `role` and `name` or by `text`, never a `selector`
or a `{{name}}` binding; a `fill` value of at most 200 characters), replayed in
order after the route loads, with the role's session behind the same local-only
guard, each `click` or `fill` on exactly one element at that moment. It is named
`<role>--<route>--after-<8 hex>.snapshot.json` (`schema_version` 2, `<route>`
the path the page is on afterwards, the 8 hex the start of the SHA-256 of the
canonical prefix), is written beside the plain snapshot and never over it, and
carries a `prefix` array: the `--route` `goto` and every replayed step, with a
`fill` recorded as `value_sha256`, the SHA-256 digest of its value, never the
value. The digest keeps the typed value out of the `prefix`, out of every
terminal line and out of every other file `ground` writes; it does not keep it
out of the `entries`, which are page text read after the interaction and can
echo a typed value the page renders back (an entry is withheld only for a
registered secret, an e-mail address or a `regex:` match, and a typed value is
not registered), so the file is protected by the run directory's ignored
`grounding/`, whose rule is proven before the file is written. A malformed
prefix exits 2 `GROUND_PREFIX_INVALID`; a step that matches zero or several
elements, cannot be performed or names a withheld value halts
`GROUND_PREFIX_FAILED` (exit 1); in both cases no snapshot is written. The
plan-time check reads such a snapshot only when its role and route are the
step's and the `goto`, `click` and `fill` steps of the case before that step,
each `fill` hashed the same way, equal the recorded `prefix` in order (an
assertion between them is ignored); every other step, and the interaction
itself, is grounded against the plain snapshot. A prefix `fill` value that the
report's own steps do not state is `PLAN_ENTRY_INVALID` when the snapshot is
consumed, not at ground time. Each replayed `click` or `fill` is a real
interaction with the local application, made at plan time and not undone, and
`ground` runs no seed, so the planner prefixes only the case's own steps and
never one that submits, saves, deletes or sends. Windows PowerShell 5.1 strips
the double quotes inside a single-quoted argument, so the `--prefix` line is run
from Git Bash, a POSIX shell or PowerShell 7.

## QA observed-request window

The span in which an `expect_requests` step of a `/relay-qa-run` browser case
counts the requests the page issues, and the flat step that uses it:
`{ "action": "expect_requests", "method": "POST", "url_contains": "/avatar",
"count": 1 }`, exactly those four keys (no locator, no `selector`, no
`session`). `method` is one of `GET`, `HEAD`, `POST`, `PUT`, `PATCH` or
`DELETE`, or an array of distinct ones (the step then counts the requests of any of them); `url_contains` is a path that starts with a single `/`, carries no
query string, fragment or whitespace and is at most 200 characters, and a
character the URL parser encodes is matched in its encoded form; `count` is an
integer from 0 to 100 (`EXPECT_REQUESTS_COUNT_MAX`). The step counts the
requests of the page whose method equals `method` and whose whole path contains
`url_contains`, from the start of the case's last `goto`, `click` or `fill`
step until 2 seconds (`EXPECT_REQUESTS_SETTLE_MS`, 2000 ms) after the step
starts, and passes only when that number equals `count`. The wait comes first
and the log is read after it, so a request a handler issues once the click
returned is inside the window; matching and counting run on the whole path,
however long. Each redirect hop is a request of its own, a popup, a worker and a
WebSocket are not observed, and a case that carries the step runs with service
workers blocked, so none answers a request out of sight.

The step counts as one expectation but is not a positive assertion. It is valid
only after a `goto`, `click` or `fill` step of the same case, and a `count` of 0
also needs the positive step (`expect_visible`, `expect_text`, `expect_value` or
`expect_state`) on the same route since the last `goto` that `expect_not_visible`
needs, because an absence of requests alone does not show that a page rendered;
otherwise the entry is `PLAN_ENTRY_INVALID` before anything is seeded,
authenticated or requested. A request to a host the local-only guard does not
approve is aborted before it leaves the machine: when it matches the step the
case is `blocked` `FAILED_NON_LOCAL_TARGET` with nothing asserted, and when it
does not match it is ignored. A failing step's reason carries only a step
position and the observed and expected counts. An action the validator accepts
but the browser driver has no branch for ends `STEP_NOT_PERFORMABLE` through the
driver's terminal branch and is never recorded as passed.

The evidence file is `evidence/case-<index>.requests-<step>.json`: the action,
the step position, the method, the expected and observed counts, `truncated`,
the `result` and, for each matching request, only its method, host and path. At
most 50 requests are listed (`EXPECT_REQUESTS_EVIDENCE_MAX`) and the observed
count stays exact. A listed path is redacted first and cut to its first 200
characters afterwards, an evidence-size cap on the written listing only (the
decision was made on the whole path), so a registered secret that straddles the
cut is replaced whole. The query string and the fragment are dropped in memory
and no header, cookie, token or body is ever read. The redaction masks a
registered secret, a token-shaped value of the runner's value patterns and a
`regex:` line match, and nothing else: an identifier no table entry recognizes (a
user id, a name or an e-mail address in a route) can appear in the file. It is
on no terminal stream and not in `results.json`, which carries for the step only
its result, the counts of a failing reason and the file's path, and the file sits
in the run directory's git-ignored `evidence/`. If the file cannot be written the
case is `blocked` `EVIDENCE_WRITE_FAILED`.

The numbers are chosen, not measured, and the Phase 8 dogfood recalibrates them:
the 2000 ms window, the bound of 100 on `count`, the 50 listed requests and the
200 characters of a listed path. The window is fixed, so a request issued after
it closes is outside it and a `count` of 0 can pass on it; that is a stated
limit, not a defect the step can detect. See
`plugins/relay/commands/relay-qa-run.md` and
`plugins/relay/resources/redaction-policy.md`.

## QA run-evidence ignore

The `.gitignore` that `qa-run.mjs init` writes inside every new run directory
(`PRPs/reports/<feature>/qa-run/<run-id>/`), through the script's single write
helper, so the run's own evidence stays out of git. Its rules are `grounding/`
and `evidence/` (`RUN_IGNORE_RULES`): grounding snapshots, screenshots,
redacted-text files and the response and row bodies can hold personal data (a
task title, a person's name) that no redaction table recognizes, while
`results.json` and `plan.json` are deliberately not listed and stay tracked.
Before it writes anything the runner proves the rules with `git check-ignore -q`
for one probe path of each evidence kind, and `init` ends its output with
`IGNORE_PROOF: proven`, or `IGNORE_PROOF: not-applicable` when the run directory
is not inside a git work tree, or git is absent or does not answer the work-tree
probe (nothing there can be committed; `init` still writes the file). With the
run directory inside a work tree and any probe path not ignored, the mode halts
`FAILED_IGNORE_UNPROVEN` (exit 1) and writes no snapshot, screenshot or result. `ground` and `run` prove the same rules first and, inside a work tree,
restore a missing `.gitignore`; an existing file is never overwritten and is
judged by the proof. The halt name is the one the test-auth kit's secrecy script
uses for its own proof. See `plugins/relay/commands/relay-qa-run.md` and
`plugins/relay/resources/redaction-policy.md`.

## QA session-less request

The optional `"session": "none"` key of an `http` `request` step in a
`/relay-qa-run` plan, with `"none"` its only legal value: the step is sent
without the role's session, so a case can check that an endpoint refuses a
request made with no token (a 401 or 403 rejection) or serves a public one. Only
an `http` `request` step may carry it, with or without `origin`; any other value,
and the key on a `query` step or a `browser` step, is `PLAN_ENTRY_INVALID`. The
step is sent through its own fresh request context that holds no storage state
and no derived `api_origins` header, so it carries no cookie and a `Set-Cookie`
from one session-less step never reaches the next; its evidence file records
`session: "none"`. It passes the same local-only guard first, so a non-local
origin still blocks the case `FAILED_NON_LOCAL_TARGET` before any request. Every
other step of the case keeps the role's session and a step without the key
behaves exactly as before. A session-less step to a header-bearing origin needs
no role (it does not end `API_HEADER_NO_SESSION`), and an entry whose every
request carries the key names no role, because the runner still obtains the
session of any role the entry names. The planner writes it only when the report's
own step asks for a request made without the session, never to avoid a login.
See `plugins/relay/commands/relay-qa-run.md`.

## QA session-value floor

The rule that decides which strings of a saved session `qa-run.mjs` registers
as secrets for redaction by substring. Registration is by source: the token
artifact, the cookie the role declares as `sessionCookie` and the cookie named
by each `api_origins` entry are always registered (only the redaction table's
4-character minimum applies). Every other cookie, `localStorage` and IndexedDB
string, record keys included, is registered only when it is at least 12
characters long (`SESSION_VALUE_MIN_LENGTH`) and has a Shannon entropy of at
least 3.0 bits per character (`SESSION_VALUE_MIN_ENTROPY`), and never when it is
a part of the target origin; short literals such as `true`, `false` or a small
integer are therefore never registered, and `localhost` or `MIDDLE` no longer
turn a verbatim URL into `[REDACTED]`. The numbers are a judgment calibrated on
one recorded scan, not a measurement, and the accepted failure mode is that a
short or low-entropy secret held by an undeclared cookie is not masked by value
(the structural masks, the Layer 1 value regexes, the run directory's ignore
and the dogfood scan back-stop it); the remedy is to declare that cookie as
`sessionCookie` or in `api_origins`, or to add a `regex:` line to
`PRPs/redaction-extensions.txt`. The `auth-secrecy` check pins the two constants
equal to the numbers the redaction policy states, and `qa-run-contract` pins
them in the command doc. See `plugins/relay/commands/relay-qa-run.md`.

## Repository topology

The explicit declaration of a workspace's member repositories — a `## Repository
topology` table in the workspace's own `docs/context/architecture.md` (columns
Repo, Path, Git root, Role, Base). Declared, never detected: relay does not scan
for `.git` directories. A member is `editable` or `reference-only`. Three roots
are distinguished: `project_root` (artifact plane), `context_root` (a member's
relay context) and `repo_root` (a member's git root). With no declaration all
three collapse to the working directory. See
`plugins/relay/resources/repository-topology.md`.

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

## Test-auth kit

The project-local, tracked-vs-ignored set under `PRPs/auth/` that lets
`/relay-qa-run` execute a QA report's cases against a locally running
application: an approved `auth-model.md` (`/relay-auth-setup`), one login
script per role plus `login.config.json` (`/relay-auth-scripts`), and the seed
declarations in `qa-seed.json` (`/relay-qa-seed`). Everything is local-only,
secrets are ignored by proven ignore rules, and no credential value is ever
written into a tracked file or report. An auth model may also declare a
`minted` mechanism: the session is issued by a local project command with no
login request, and the model records only the issuing code's file:line, the
declared argv command and the local store it touches, never a credential.
For a `minted` role `/relay-qa-run` passes the login script `--force` when the
recorded expiry is within 240 seconds of the run start, registers IndexedDB
strings as secrets only above the session-value floor (see QA session-value
floor), and reports the five minted login halts as named `blocked` reasons.

When a minted role's login script halts `FAILED_PROBE_MARKER_ABSENT` right after
it minted (a cold application may not have rendered the declared marker yet),
the runner runs that script once more before it blocks the role: only the kit
login script is run again, with the same arguments plus `--force`, never the
mint command itself, and the script runs its own local-only guard before its
mint command. The cap is `LOGIN_REMINT_MAX_RETRIES`, 1, per role per run (each
`ground` command is a run of its own), a number chosen and not measured that the
Phase 8 dogfood recalibrates. The runner's comment on the cap gives the cost: a
second halt after two fresh mints is a configuration problem the operator must
see, and every extra run mints again and rotates the account's session. A proven
second attempt yields the session; a second halt leaves the role blocked with
that halt's own code, which is `FAILED_PROBE_MARKER_ABSENT` again when the proof
fails again. A role whose mechanism is not `minted`, and every other halt, is
never retried; the login template and its `KIT_TEMPLATE_ID` are unchanged, and
the runner writes nothing for the retry, so a re-minted pass reads like a
first-try pass in `results.json`.

`/relay-auth-scripts --refresh` covers the roles a run selects: the roles of the
approved model's `## Role and Permission Matrix`, narrowed by `--role`. It
regenerates the script of those that already have one; a selected role with no
`PRPs/auth/login-<role>.mjs` is generated exactly as without `--refresh` and is
not reported as refreshed, so a kit narrower than the matrix is refreshed for
its own roles only, and a role the kit holds that the matrix does not list is
not selected and its script is left as it is. The statement documents the
selection that already existed; it changes no behavior.

## Test Runner

Specialized agent that executes the test suite, interprets results,
coordinates the auto-correction loop, and produces the execution report.
Component B1 of the Phase 2 plan.

## Usage metrics

Per-project TSV shards under `PRPs/metrics/` that
`plugins/relay/scripts/usage-metrics.mjs` regenerates by full rescan of
artifacts relay already writes (relations `verdict`, `rubric`, `run`, `scan`).
Cells are bare codes, integers, timestamps or `-`; no free text. Operator-run
only; no agent, command or skill may reference `PRPs/metrics`. See
`plugins/relay/resources/usage-metrics-schema.md`.

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
