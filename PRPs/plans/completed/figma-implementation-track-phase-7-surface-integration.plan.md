# Feature: Surface integration + self-improvement (Phase 7 of figma-implementation-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (docs-updater write-scope extension); new command file in plugins/relay/commands/; reuse of an existing dispatch shape (mirrors /relay-code-review's standalone single-shot pattern); impacts orchestrator (relay-execute.md per-phase audit-log schema)
- Decisions found:
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-04-19] Command surface — one command per stage, writer/reviewer split
  - [2026-06-19] `/relay-approve` Docs Updater / Docs Reviewer pair is scoped to `docs/` (OQ-b) — this phase's write-scope extension stays inside `docs/design/`, still within that scope
  - [2026-07-23] Component map is a durable `docs/design/` knowledge-base artifact, not a per-run `PRPs/` pipeline artifact
  - [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder inside `/relay-implement` (Figma Implementation Track Phase 6) — the dispatch shape and `figma_track_declared` gating idiom this phase's new surfaces reuse
  - [2026-07-23] `design_source` declaration is mandatory and non-heuristic when `figma_track: true` — inapplicable here since this repo's own `docs/context/methodology.md` does not declare `figma_track` (the relay repo is building the track, not consuming a Figma design itself)
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (docs/anti-patterns.md:60-66)
  - Flipping `figma_track` (or any gating key) by heuristic (docs/anti-patterns.md:89-95) — the self-improving component-map append this phase adds must be evidence-driven (a real `VISUAL_VERIFIED` `fidelity-report.json` entry tracing to a real `CM-<n>` row), never inferred
  - Querying the Figma MCP from a dispatched writer/reviewer agent (docs/anti-patterns.md:98-104) — `/relay-visual-review` and the extended `docs-updater` logic stay MCP-free, reading only already-persisted `fidelity-report.json` / `component-map.md` evidence
- Applicable architectural rules:
  - `PRPs/` artifact path convention; `.claude/` never-write rule
  - "Nothing changes when `figma_track` is off" invariant (PRD AC-1) — every new surface this phase adds (qa-report section, execute rollup, pr body, standalone command) must be gated identically to `/relay-implement`'s existing `Visual:` line
  - `docs-updater`'s PRESERVE-ENTIRELY / additive-only discipline extends to the new `docs/design/component-map.md` write scope — append/upgrade only, never a wholesale regenerate
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-implementation-track.prd.md` — Implementation Phases row 7:
  "Surface integration + self-improvement" — Goal: Make the track's
  outputs visible everywhere a human already looks (QA report, PR body)
  and let the component map improve itself over time. — Success signal:
  One real feature runs the full pipeline end to end, including a
  multi-phase PRD and at least one auth-gated route, and the map gains
  at least one `verified:auto` row without human intervention.

## Summary

This phase closes out the Figma Implementation Track by making its
outputs visible in the two places a human already looks after
`/relay-execute` runs (the QA report and the PR body), giving the
component map a mechanism to improve itself automatically from
confirmed visual-verification evidence, shipping a standalone
`/relay-visual-review` command for ad-hoc re-checks, and registering
the whole track's command/agent surface across the three
documentation sites that were never touched by the automated
`docs-updater` sync during Phases 1–6 (`docs/api-reference.md`,
`docs/context/architecture.md`, and the rendered `documentation/`
site). The literal "end-to-end dogfood on a real project" item from
the PRD's Phase 7 description cannot be executed inside this
plan/implement cycle — it requires a separate downstream project with
a real Figma file — so it is scoped as a documentation/checklist
deliverable (a dogfood runbook) rather than an executable task; see
`## Notes` for the explicit scoping decision.

## User Story

As a developer who just ran `/relay-execute` on a Figma-sourced
feature,
I want the visual-fidelity outcome to show up automatically in my QA
report and PR description, and the component map to learn from
confirmed matches without me touching it,
So that I don't have to go spelunking through `PRPs/reports/` to know
whether the implementation matched the design, and the one-time
component-map setup cost keeps paying down over every future feature.

## Problem Statement

Phases 1–6 built the full Figma Implementation Track machinery
(opt-in gate, component map, Design Spec, `design_source` plumbing,
and the bounded visual-verification loop inside `/relay-implement`)
but its outputs are trapped in `/relay-implement`'s own per-invocation
console line and a per-attempt `fidelity-report.json` on disk. A
developer running the human validation gate (`/relay-qa-report`)
between `/relay-execute` and Pillar 3, or reading a PR opened by
`/relay-pr`, has no visibility into visual fidelity unless they know
the exact `PRPs/reports/<feature>/phase-<N>/visual/<attempt>/`
path to look in. Separately, `docs/api-reference.md` — the one
documentation surface `docs-updater` never writes to — has zero
entries for the six shipped Figma commands/agents, even though
`docs/context/architecture.md` (which `docs-updater` does sync) is
already thorough. And the component map's own template has carried a
forward-referenced `verified:auto` Confidence value since Phase 3
with no writer ever populating it — the self-improvement loop the
PRD's Should-item promises has no closing mechanism yet.

## Solution Statement

Extend `scripts/generate-final-report.mjs` (already invoked on the
full-body path by `/relay-pr` Phase 3 Step 3 — the Minimal body path
never calls the script) to discover and render
a "## Visual Fidelity" section from any `phase-*/visual/*/
fidelity-report.json` artifacts under a feature's reports directory;
add a symmetrically-gated "Visual Fidelity" section to
`/relay-qa-report`'s output; extend `docs-updater`'s Explicit Write
Scope to `docs/design/component-map.md` so that a merged feature's
confirmed `VISUAL_VERIFIED` evidence for a `REUSE`-mapped frame
upgrades that row's `Confidence` to `verified:auto` and populates
`verified_at`, append-only and never overwriting a human-set value
without corroborating fresh evidence; ship `/relay-visual-review` as a
single-shot standalone dispatch of the existing `visual-verifier`
agent, structurally identical to `/relay-code-review`'s
non-mutating shape; record a per-phase `visual_outcome` in
`/relay-execute`'s `orchestrator_run_log` with a gated terminal-summary
rollup; and register the full track across `docs/api-reference.md`,
`docs/context/architecture.md`, and the `documentation/` site
(three-file registration rule). Every new surface reuses the exact
`figma_track_declared`-gated presence/omission idiom
`/relay-implement`'s own `Visual:` line already established, so a
non-Figma project's output stays byte-identical to today's.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature — cross-cutting surface integration + self-improvement (final phase of the Figma Implementation Track) |
| Complexity | High — touches 1 new command, 4 existing command/agent files, 1 build-free Node script, and 3 separate documentation-registration surfaces, plus one non-executable scope item resolved as a documentation deliverable |
| Systems Affected | `plugins/relay/commands/` (new `relay-visual-review.md`; edits to `relay-qa-report.md`, `relay-execute.md`, `relay-pr.md`); `plugins/relay/agents/docs-updater.md`; `scripts/generate-final-report.mjs`; `docs/api-reference.md`; `docs/context/architecture.md`; `documentation/` site; `docs/design/component-map.md` (new docs-updater write target) |
| Dependencies | Phase 6 (Visual loop, complete) — `visual-verifier` agent, `fidelity-report.json` schema, plan `## Design Source` table; Phase 3 (Component map, complete) — `component-map-template.md`'s `verified:auto`/`verified_at` slot; Phase 4/5 (complete) — Design Spec + `design_source` plumbing this phase's gating logic reuses read-only |
| Estimated Tasks | 10 |
| Source PRD line ref | `PRPs/prds/figma-implementation-track.prd.md` lines 145, 179–182 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| High | `plugins/relay/commands/relay-code-review.md` | 1–278 (full file) | Canonical single-shot, non-mutating standalone command shape — `/relay-visual-review` mirrors its Decision Gate / Preconditions / single Task dispatch / Final output surface structure exactly |
| High | `plugins/relay/commands/relay-implement.md` | 368–397 | Phase A.3.4 visual-verification dispatch — the exact `Task(subagent_type="visual-verifier", ...)` payload shape and verdict branching `/relay-visual-review` reuses for its own single dispatch |
| High | `plugins/relay/commands/relay-implement.md` | 559–560, 571–572 | The `Visual:` line's `figma_track_declared`-gated presence/omission pattern — the exact gating idiom every new surface added by this phase (qa-report section, execute rollup, pr body) must reproduce byte-for-byte |
| High | `plugins/relay/agents/docs-updater.md` | 153–169 | Explicit Write Scope table — the extension point for adding `docs/design/component-map.md` as a narrowly-scoped, append-only write target |
| High | `docs/context/component-map-template.md` | 95–145, 182–188 | `verified:auto` Confidence value + `verified_at` field definitions, and the "never clobber a human-verified row" lifecycle rule the docs-updater append logic must respect |
| Medium | `plugins/relay/agents/visual-verifier.md` | 1–60 | Inputs contract + `fidelity_report_path` derivation — grounds both `/relay-visual-review`'s dispatch payload and the aggregation logic added to `generate-final-report.mjs` / `relay-qa-report.md` |
| Medium | `scripts/generate-final-report.mjs` | 138–163, 329–361 | `buildMarkdown()`'s `lines.push(...)` section-assembly pattern and the `main()` CLI entrypoint — the extension point for a new "## Visual Fidelity" section |
| Medium | `plugins/relay/commands/relay-pr.md` | 300–330 | PR body generation (Phase 3 Step 3) — confirms `/relay-pr` already calls `generate-final-report.mjs` on the full-body path (both `run.json` and `test-review.json` exist; the Minimal body path never calls it), so extending the script is sufficient wiring; no new script invocation is needed in this file |
| Medium | `docs/api-reference.md` | 15–84 | Current command surface table — confirms the Figma Implementation Track (Phases 1–6, all `complete`) has zero entries here; this phase's "PRD-side three-site registration" item closes exactly this gap |
| Medium | `docs/context/architecture.md` | 178–196 | Existing Command surface prose already documents `/relay-design-map` and `/relay-design-spec` as "standalone, human-triggered" commands — the pattern `/relay-visual-review`'s own registration bullet must follow |
| Low | `PRPs/prds/figma-implementation-track.prd.md` | 145, 179–182 | Row 7 + Phase Details — Goal, Scope, Success signal for this phase |
| Low | `docs/decisions.md` | 789–803 | [2026-07-23] Visual-verification loop decision — the architectural precedent for gating, budget-independence, and non-blocking degradation this phase's new surfaces must stay consistent with |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-code-review.md:174-191
### A.1 — Dispatch the code-reviewer agent in standard mode

Invoke `code-reviewer` exactly once via `Task`:

Task(subagent_type="code-reviewer",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       mode: "standard",
       attempt: 1,
       diff_target: <base_commit>,
     })

The agent reads the plan + the working-tree diff ... appends one
verdict line to PRPs/plans/<basename>.code-review.jsonl itself per
its protocol (D11 — code-reviewer is the writer of its own audit
log; this command does NOT duplicate that write).
```
Copies into Task 1 (`plugins/relay/commands/relay-visual-review.md`) — the single-shot, no-internal-loop, no-D8-mutation dispatch shape.

```
# SOURCE: plugins/relay/commands/relay-implement.md:374-386
Task(subagent_type="visual-verifier",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       design_spec_path: <from the plan's ## Design Source section>,
       attempt: <attempt>,
       diff_target: "<artifact_root><attempt>/diff.patch",
       non_interactive: true,
     })
```
Copies into Task 1 — the exact dispatch payload `/relay-visual-review` reuses (with `attempt: 1` sentinel per the `/relay-code-review` precedent above).

```
# SOURCE: plugins/relay/commands/relay-implement.md:560
> Visual: `<visual_outcome>` (...) — **this line's very presence is
> gated on `figma_track_declared`** (Phase A.0): shown ONLY when
> `figma_track_declared == true`; when `figma_track_declared ==
> false` the line is OMITTED ENTIRELY (no line, no `SKIPPED` marker,
> nothing), so a non-Figma project's output stays byte-identical to
> today's (PRD AC-1 of figma-implementation-track.prd.md).
```
Copies into Tasks 3, 4, 5, 6 — every new surface this phase adds reproduces this exact "omit the line entirely, don't even print SKIPPED" gating idiom.

```
# SOURCE: plugins/relay/agents/docs-updater.md:153-165 (Explicit Write Scope table)
| Path | Write mode |
|------|-----------|
| `<target_root>/docs/context/*` | Surgical additive edit only (PRESERVE rule applies) |
| `<target_root>/docs/domain/*` | Surgical additive edit only |
| `<target_root>/docs/decisions.md` | Surgical additive edit only for a decision the merged diff or source PRD states explicitly ... |
...
| `<target_root>/PRPs/reports/<feature>/docs-update.md` | CREATE — the manifest (the primary deliverable) |
```
Copies into Task 2 — adds a new row `| <target_root>/docs/design/component-map.md | Surgical additive edit only — upgrade an existing REUSE-mapped row's Confidence to verified:auto + verified_at when corroborated by a fresh VISUAL_VERIFIED fidelity-report.json entry; never create or reorder rows |`.

```
# SOURCE: docs/context/component-map-template.md:128-141
- **`Confidence`** — one of three values:
  - `CONFIRMED` — exact match (name and prop/variant surface both correspond).
  - `INFERRED` — best-effort match, flagged for human review.
  - `verified:auto` — a later automated re-verification pass ...
    independently reconfirmed the row against a real implementation diff.
- **`verified_at`** — an ISO date once a human curator (or an
  automated re-verification pass) has confirmed the row; `unverified`
  for a freshly-written row.
```
Copies into Task 2 — the exact field semantics the appended `docs-updater` logic must satisfy.

```
# SOURCE: scripts/generate-final-report.mjs:148-160
lines.push(`# Test Runner Report — ${feature}`);
lines.push('');
lines.push(`**Outcome:** ${outcomeBadge(outcome)}`);
lines.push(`**Duration:** ${formatDuration(elapsedMs)}`);
lines.push(`**Run ID:** \`${runId}\``);
lines.push(`**TDD track:** ${tdd ? 'active' : 'inactive'}`);
```
Copies into Task 3 — the `lines.push(...)` section-assembly idiom the new "## Visual Fidelity" section follows.

```
# SOURCE: docs/api-reference.md:76
| `/relay-qa-report [<prd-path> \| <plan-path> \| <description>]`
(blank = uncommitted diff) ✅ **implemented** | Four-way argument
router: ... | `PRPs/reports/<feature>/qa-report.md` — one entry per
case carrying all seven fields ... |
```
Copies into Task 7 — the exact row shape (name, input, output, one-line contract summary) every newly-registered command row in `docs/api-reference.md` follows.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/commands/relay-visual-review.md` | CREATE | New standalone command (MoSCoW Should-item) — single-shot `visual-verifier` dispatch mirroring `/relay-code-review`'s non-mutating shape |
| `plugins/relay/agents/docs-updater.md` | UPDATE | Extend Explicit Write Scope + Diff-Driven Procedure to append `verified:auto` component-map rows from confirmed `VISUAL_VERIFIED` evidence |
| `scripts/generate-final-report.mjs` | UPDATE | Add a "## Visual Fidelity" section aggregating `phase-*/visual/*/fidelity-report.json` into the PR body / final report |
| `plugins/relay/commands/relay-qa-report.md` | UPDATE | Add a `figma_track`-gated "Visual Fidelity" report section sourced from the same fidelity-report.json aggregation |
| `plugins/relay/commands/relay-execute.md` | UPDATE | Record per-phase `visual_outcome` in `orchestrator_run_log` + a gated rollup line in the terminal success message |
| `plugins/relay/commands/relay-pr.md` | UPDATE | Document that the `final-report.md` already generated unconditionally by Phase 3 Step 3 now carries a Visual Fidelity section when applicable |
| `docs/api-reference.md` | UPDATE | Site 1 of three-site registration — register the full Figma Implementation Track command/agent surface (currently absent entirely) |
| `docs/context/architecture.md` | UPDATE | Site 2 — add `/relay-visual-review` to the "standalone, human-triggered" command-surface bullets |
| `documentation/reference/commands.html`, `documentation/reference/agents.html`, `documentation/changelog.html`, `documentation/roadmap/status.html`, `documentation/assets/data/search-index.json` | UPDATE | Site 3 — `documentation/AGENTS.md`'s mandatory three-file registration rule (NAV + search index + changelog) plus the reference pages, for the new command |
| `docs/design/dogfood-runbook.md` | CREATE | Non-executable "end-to-end dogfood on a real project" scope item, delivered as a checklist/runbook artifact per the explicit scoping decision recorded in `## Notes` |

## NOT Building (Scope Limits)

- Actually executing the end-to-end dogfood run against a real
  downstream project — no such project + real Figma file is available
  inside this plan/implement cycle; delivered instead as the
  `docs/design/dogfood-runbook.md` checklist artifact (see `## Notes`).
- A future `R-COH-DS-REUSE` code-review check that cross-verifies
  every `REUSE` claim against real implementation diffs — explicitly
  named as "not built in this phase" by both
  `component-map-template.md` and `design-spec-template.md`'s own
  forward references; this phase's `docs-updater` extension only
  upgrades a row's `Confidence`/`verified_at` post-merge from
  visual-verification evidence, it does not add a new code-review
  rubric item.
- Automated Success Metrics telemetry/dashboarding (human time per
  feature, component reuse rate, visual fidelity at first pass,
  manual adjustment rounds) — the PRD's own Open Questions defer
  this until "~10-20 real feature runs"; out of scope for this phase.
- Figma Code Connect write-back — Won't/Could per the PRD's MoSCoW;
  requires file-edit permission the developer may not hold.
- Cross-project / cross-repository component maps — the map stays
  scoped per target project (2026-07-23 decision); this phase's
  self-improving append logic operates only on the single project's
  own `docs/design/component-map.md`.
- Special handling for PRDs authored before this feature existed —
  explicitly excluded by product decision; no legacy carve-out is
  added by this phase's documentation registration either.
- Any activation of the self-improving append (or of
  `/relay-visual-review`) by heuristic — both are strictly gated on
  `figma_track: true` plus real persisted evidence (`fidelity-report.json`
  / `component-map.md` rows), never inferred from file names or diff
  shape.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/commands/relay-visual-review.md

- **ACTION** (AC-A2): Author a new standalone command that accepts a
  `<plan-path>` argument, validates it resolves to a plan whose
  `## Metadata` carries `design_source: figma` (HALT with a named,
  actionable message otherwise — including the case where the target
  project's own `docs/context/methodology.md` lacks `figma_track:
  true`), resolves the plan's `## Design Source` table's referenced
  APPROVED Design Spec path, emits the standard six-line Decision
  Gate block, then dispatches `visual-verifier` via `Task` exactly
  once (`attempt: 1` sentinel), reads the returned verdict, and
  surfaces `VISUAL_VERIFIED` / `VISUAL_DEGRADED` / `VISUAL_MISMATCH`
  plus the `fidelity-report.json` path to the caller. Performs zero
  D8 mutations and never edits the plan or any PRD — byte-identical
  before/after, exactly like `/relay-code-review`.
- **MIRROR**: Patterns to Mirror snippets 1 and 2 above
  (`relay-code-review.md:174-191` dispatch shape;
  `relay-implement.md:374-386` `visual-verifier` payload).
- **VALIDATE**:
  ```
  set -euo pipefail
  test -f plugins/relay/commands/relay-visual-review.md
  grep -q "^description:" plugins/relay/commands/relay-visual-review.md
  grep -q 'subagent_type="visual-verifier"' plugins/relay/commands/relay-visual-review.md
  grep -q "Decision Gate" plugins/relay/commands/relay-visual-review.md
  echo "PASS: relay-visual-review.md exists, carries frontmatter + Decision Gate + a single visual-verifier dispatch"
  ```

### Task 2: UPDATE plugins/relay/agents/docs-updater.md

- **ACTION** (AC-A3): Add a new row to the Explicit Write Scope table for
  `<target_root>/docs/design/component-map.md` (surgical additive
  edit only — never a wholesale regenerate), and add a new
  Diff-Driven Procedure step: when the merged diff's plan carried
  `design_source: figma` and a per-phase
  `phase-<N>/visual/<attempt>/fidelity-report.json` exists with a
  frame's `status: PASS` verdict traceable (via the plan's `##
  Design Source` table) to a `REUSE`-mapped `CM-<n>` row in
  `docs/design/component-map.md`, upgrade that row's `Confidence`
  cell to `verified:auto` and its `verified_at` cell to the sync
  date, via `Edit` with a narrow `old_string` (the full existing row
  line) — never touching a row's Confidence/verified_at when no
  fresh corroborating evidence exists, and never inventing a new row.
- **MIRROR**: Patterns to Mirror snippets 4 and 5 above
  (`docs-updater.md:153-165` write-scope table;
  `component-map-template.md:128-141` Confidence/verified_at
  semantics).
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "docs/design/component-map.md" plugins/relay/agents/docs-updater.md
  grep -q "verified:auto" plugins/relay/agents/docs-updater.md
  grep -q "verified_at" plugins/relay/agents/docs-updater.md
  echo "PASS: docs-updater.md write-scope extended with component-map.md + verified:auto upgrade logic"
  ```

### Task 3: UPDATE scripts/generate-final-report.mjs

- **ACTION** (AC-A1): Add a function that discovers
  `<reports-dir>/phase-*/visual/*/fidelity-report.json` files
  (glob-equivalent directory walk via `node:fs`), reads and
  aggregates their frame entries, and — only when at least one such
  file exists — appends a "## Visual Fidelity" section to
  `buildMarkdown()`'s output listing each frame's `node_id`,
  `route`, `diff_percent`, `threshold`, and `status`. When zero
  fidelity-report.json files are found under the reports dir, the
  section is omitted entirely (no heading, no "N/A" placeholder),
  reproducing the `figma_track_declared`-gated omission idiom.
- **MIRROR**: Patterns to Mirror snippet 6 above
  (`generate-final-report.mjs:148-160` `lines.push()` idiom) and
  snippet 3 (`relay-implement.md:560` omit-entirely gating).
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check scripts/generate-final-report.mjs
  grep -q "Visual Fidelity" scripts/generate-final-report.mjs
  grep -q "fidelity-report.json" scripts/generate-final-report.mjs
  echo "PASS: generate-final-report.mjs parses cleanly and references fidelity-report.json / a Visual Fidelity section"
  ```

### Task 4: UPDATE plugins/relay/commands/relay-qa-report.md

- **ACTION** (AC-A1): Add a "Visual Fidelity" report section, gated
  identically: present only when the target project's
  `docs/context/methodology.md` declares `figma_track: true` AND at
  least one `phase-*/visual/*/fidelity-report.json` is found under
  the resolved `<feature>`'s reports directory; sourced via the same
  aggregation approach as Task 3 (per-frame node_id/route/diff/status
  rows). Absent entirely (not an empty section) for a non-Figma
  project or when no fidelity artifact exists yet.
- **MIRROR**: Patterns to Mirror snippet 3 above
  (`relay-implement.md:560` gating idiom).
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "Visual Fidelity" plugins/relay/commands/relay-qa-report.md
  grep -q "figma_track" plugins/relay/commands/relay-qa-report.md
  echo "PASS: relay-qa-report.md carries a figma_track-gated Visual Fidelity section"
  ```

### Task 5: UPDATE plugins/relay/commands/relay-execute.md

- **ACTION** (AC-A1): Extend the per-phase completion record appended to
  `orchestrator_run_log` (the JSON block preceding "Push
  `current_phase_N` to `phases_completed`") with a `visual_outcome`
  field, populated from `/relay-implement`'s own `Visual:` line
  value for that phase's dispatch when `figma_track_declared ==
  true`, and omitted from the JSON object entirely otherwise (not
  `null` — a genuinely absent key, matching the line-omission
  idiom). Add one gated line to the "Success path (all phases
  complete)" terminal summary: `Visual fidelity: <N> phase(s)
  APPROVED, <M> degraded, <K> mismatch/budget-exceeded (see
  PRPs/reports/<feature>/orchestrator-run.json).` — present only
  when `figma_track_declared == true` for at least one completed
  phase.
- **MIRROR**: Patterns to Mirror snippet 3 above
  (`relay-implement.md:560` gating idiom), applied to the
  orchestrator's own audit log and terminal summary.
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "visual_outcome" plugins/relay/commands/relay-execute.md
  grep -q "figma_track_declared" plugins/relay/commands/relay-execute.md
  echo "PASS: relay-execute.md records per-phase visual_outcome and a gated terminal rollup line"
  ```

### Task 6: UPDATE plugins/relay/commands/relay-pr.md

- **ACTION** (AC-A1): Update the frontmatter `description` and Phase
  3 Step 3 prose to document that `generate-final-report.mjs`
  (already invoked on the full-body path — both `run.json` and
  `test-review.json` exist; the Minimal body path never calls it)
  now emits a Visual Fidelity section automatically when applicable
  per Task 3 — no new script invocation or flag is added to this
  command; this is a documentation-of-behavior edit confirming the
  wiring is inherited, not duplicated.
- **MIRROR**: `plugins/relay/commands/relay-pr.md:300-317` (existing
  Full body path prose this edit extends in place).
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "Visual Fidelity" plugins/relay/commands/relay-pr.md
  echo "PASS: relay-pr.md documents the inherited Visual Fidelity section in final-report.md"
  ```

### Task 7: UPDATE docs/api-reference.md

- **ACTION** (AC-A4): Add rows/prose registering the full Figma
  Implementation Track command surface currently absent from this
  file: `/relay-design-map`, `/relay-design-spec`, and the new
  `/relay-visual-review`, plus their agent pairs
  (`design-map-writer`/`design-map-reviewer`,
  `design-spec-writer`/`design-spec-reviewer`, `visual-verifier`,
  `research-design`), each row noting the `figma_track: true` gate
  explicitly so a reader does not conclude these commands are
  always-on. Update the "15 commands" summary count to reflect the
  additional standalone commands.
- **MIRROR**: Patterns to Mirror snippet 7 above
  (`docs/api-reference.md:76` existing row shape).
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "relay-visual-review" docs/api-reference.md
  grep -q "relay-design-map" docs/api-reference.md
  grep -q "relay-design-spec" docs/api-reference.md
  grep -q "figma_track" docs/api-reference.md
  echo "PASS: docs/api-reference.md registers the full Figma Implementation Track command surface with its gate documented"
  ```

### Task 8: UPDATE docs/context/architecture.md

- **ACTION** (AC-A4): Add `/relay-visual-review` to the "Command surface"
  section's list of standalone, human-triggered commands (the same
  bullet list already documenting `/relay-design-map` and
  `/relay-design-spec`), one sentence describing its single-shot,
  non-mutating relationship to `/relay-implement`'s Phase A.3.4
  dispatch — surgical additive edit, preserving all existing content
  byte-for-byte.
- **MIRROR**: `docs/context/architecture.md:178-196` (existing
  standalone-command bullet prose this edit extends in place).
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "relay-visual-review" docs/context/architecture.md
  echo "PASS: docs/context/architecture.md registers /relay-visual-review in the command surface section"
  ```

### Task 9: UPDATE documentation/ site (three-file registration rule)

- **ACTION** (AC-A4): Per `documentation/AGENTS.md`'s binding three-file
  registration rule, add `/relay-visual-review` to
  `documentation/reference/commands.html` and its agent
  (`visual-verifier`, already dispatched elsewhere — link the
  standalone entry point) to `documentation/reference/agents.html`;
  add a changelog entry to `documentation/changelog.html`; add the
  page to `documentation/assets/data/search-index.json`; update
  `documentation/roadmap/status.html`'s "What's next" / Figma track
  status to reflect Phase 7 shipping. Read `documentation/AGENTS.md`
  first per this repo's own CLAUDE.md instruction before editing
  anything under `documentation/`.
- **MIRROR**: existing `documentation/reference/commands.html` entry
  shape for `/relay-code-review` (structurally nearest sibling —
  single-shot, non-mutating standalone command).
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "relay-visual-review" documentation/reference/commands.html
  grep -q "relay-visual-review" documentation/assets/data/search-index.json
  grep -q "relay-visual-review" documentation/changelog.html
  echo "PASS: documentation/ site three-file registration complete for /relay-visual-review"
  ```

### Task 10: CREATE docs/design/dogfood-runbook.md

- **ACTION** (AC-A5): Author a checklist/runbook artifact enumerating the
  concrete steps and confirmation checkpoints a human runs against a
  real downstream project to exercise the PRD's Phase 7 success
  signal ("one real feature runs the full pipeline end to end,
  including a multi-phase PRD and at least one auth-gated route, and
  the map gains at least one `verified:auto` row without human
  intervention"): (1) confirm `figma_track: true` is set via
  `/relay-design-map`'s confirmation gate; (2) run `/relay-prd` with
  a Figma URL for a multi-phase feature including an auth-gated
  route; (3) confirm the Design Spec's explicit human approval; (4)
  run `/relay-execute` end to end and observe the `Visual:` line per
  phase; (5) confirm `/relay-qa-report` renders the Visual Fidelity
  section; (6) merge via `/relay-pr` → `/relay-approve` and confirm
  `docs/design/component-map.md` gains at least one `verified:auto`
  row without a human edit; (7) record the wall-clock time against
  the PRD's Success Metrics table for future recalibration. This
  artifact is the explicit scope resolution for the non-executable
  "end-to-end dogfood on a real project" item — see `## Notes`.
- **MIRROR**: `docs/development.md:21-29` (the "Add a new skill"
  numbered step-by-step checklist) — the closest existing structural
  precedent in this repo for a sequential, numbered list of concrete
  actions a human executes in order; see `## Notes` for the full
  scoping admission on why no dedicated runbook/checklist artifact
  exists yet.
- **VALIDATE**:
  ```
  set -euo pipefail
  test -f docs/design/dogfood-runbook.md
  grep -q "figma_track: true" docs/design/dogfood-runbook.md
  grep -q "verified:auto" docs/design/dogfood-runbook.md
  grep -q "auth-gated route" docs/design/dogfood-runbook.md
  echo "PASS: dogfood runbook checklist artifact created with required checkpoints"
  ```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```
set -euo pipefail
node --check scripts/generate-final-report.mjs
npm run validate
```

### Level 2 — CONTENT_INVARIANTS

```
set -euo pipefail
grep -q 'subagent_type="visual-verifier"' plugins/relay/commands/relay-visual-review.md
grep -q "docs/design/component-map.md" plugins/relay/agents/docs-updater.md
grep -q "verified:auto" plugins/relay/agents/docs-updater.md
grep -q "Visual Fidelity" scripts/generate-final-report.mjs
grep -q "Visual Fidelity" plugins/relay/commands/relay-qa-report.md
grep -q "visual_outcome" plugins/relay/commands/relay-execute.md
grep -q "Visual Fidelity" plugins/relay/commands/relay-pr.md
grep -q "relay-visual-review" docs/api-reference.md
grep -q "relay-visual-review" docs/context/architecture.md
grep -q "relay-visual-review" documentation/reference/commands.html
test -f docs/design/dogfood-runbook.md
echo "PASS: all Phase 7 content invariants present across every changed file"
```

### Level 3 — DRY-RUN END-TO-END

```
set -euo pipefail
TMPDIR=$(mktemp -d)
mkdir -p "$TMPDIR/phase-7/visual/1"
cat > "$TMPDIR/run.json" <<'EOF'
{"feature":"phase7-fixture","run_id":"fixture-1","outcome":"GREEN"}
EOF
cat > "$TMPDIR/phase-7/visual/1/fidelity-report.json" <<'EOF'
{"frames":[{"node_id":"1:1","route":"/","diff_percent":0.4,"threshold":2,"status":"PASS"}]}
EOF
node scripts/generate-final-report.mjs "$TMPDIR" --out "$TMPDIR/final-report.md"
grep -q "Visual Fidelity" "$TMPDIR/final-report.md"
rm -rf "$TMPDIR"
echo "PASS: generate-final-report.mjs renders a Visual Fidelity section from a synthetic fidelity-report.json fixture"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given `figma_track` absent/false in a target
  project's `docs/context/methodology.md`, when `/relay-qa-report`,
  `/relay-execute`, or `/relay-pr` run, then no "Visual Fidelity"
  section, no `visual_outcome` field, and no visual-fidelity rollup
  line appears anywhere in their output or artifacts — every new
  surface added by this phase is gated byte-for-byte identically to
  `/relay-implement`'s existing `Visual:` line gate
  (`figma_track_declared`).
- **AC-A2 (PRD AC-5):** Given `/relay-visual-review` is invoked
  standalone against a plan whose `design_source: figma`, when it
  dispatches `visual-verifier` via `Task`, then it performs exactly
  one dispatch (no internal retry loop, no D8 mutation, no plan/PRD
  status change) and surfaces one of `VISUAL_VERIFIED` /
  `VISUAL_DEGRADED` / `VISUAL_MISMATCH` — mirroring
  `/relay-code-review`'s single-shot, non-mutating, bounded shape.
- **AC-A3 (PRD AC-2):** Given a merged feature whose plan carried
  `design_source: figma` and whose implement-time
  `fidelity-report.json` recorded a `PASS` for a frame backed by a
  `REUSE` `CM-<n>` component-map row, when `docs-updater` runs
  post-merge, then it upgrades that row's `Confidence` to
  `verified:auto` and `verified_at` to the sync date in
  `docs/design/component-map.md` — strengthening (never weakening)
  the REUSE evidence trail AC-2 protects, and never inventing a row
  for a frame it cannot trace to a real `CM-<n>` id.
- **AC-A4 (PRD AC-1):** Given the `documentation/` rendered site,
  `docs/api-reference.md`, and `docs/context/architecture.md`, when
  a developer looks up the command surface after this phase ships,
  then all three sites accurately register `/relay-visual-review`
  and the full Figma Implementation Track command/agent surface with
  the `figma_track` gate documented explicitly — preventing a false
  impression that the track's outputs are always-on for every
  project.
- **AC-A5 (PRD AC-5):** Given the "end-to-end dogfood on a real
  project" scope item cannot be executed inside this plan/implement
  cycle (no downstream project + real Figma file available), when
  this phase ships, then `docs/design/dogfood-runbook.md` exists
  enumerating the concrete steps and confirmation checkpoints a
  human runs against a real project — recording the scope decision
  explicitly (per this plan's `## Notes`) rather than silently
  dropping the PRD's Phase 7 success signal.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `generate-final-report.mjs`'s Visual Fidelity aggregation has no real-world `fidelity-report.json` to test against until a `figma_track: true` project actually ships a Figma-sourced feature | M | M | Level 3 DRY-RUN synthesizes a fixture `fidelity-report.json` and asserts an exit-0 render containing the section; the test-after pair (`test-writer`/`test-reviewer`) authors `node:test` unit tests against the fixture per this repo's declared `test_frameworks: ["node:test"]` |
| `docs-updater`'s new `component-map.md` write scope could overwrite a human-curated `INFERRED`/`CONFIRMED` row if the append logic isn't scoped narrowly enough | M | H | Append-only, upgrade-only discipline: never touch an existing row's `Confidence`/`verified_at` without fresh corroborating `VISUAL_VERIFIED` evidence tracing to that exact `CM-<n>` id, matching `component-map-template.md`'s own "never clobber a human-verified row" lifecycle rule (lines 186–188) |
| "End-to-end dogfood on a real project" cannot be executed inside this plan/implement cycle — no downstream project or real Figma file is available | H | M | Scoped as a documentation/checklist deliverable (`docs/design/dogfood-runbook.md`) rather than an executable task, per explicit dispatcher guidance; the scoping decision is recorded here in `## Notes` rather than silently dropped |
| Three-site documentation registration (`api-reference.md`, `architecture.md`, `documentation/`) drifts again if a future phase adds a Figma-related command without updating all three | L | M | Level 2 CONTENT_INVARIANTS greps enforce presence at plan-review and code-review time; `documentation/AGENTS.md`'s three-file rule is the existing enforced contract for the `documentation/` site specifically |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. This repo declares
`test_frameworks: ["node:test"]`, so the pair is ACTIVE in test-after
mode — it will author `node:test` unit tests for the new aggregation
logic in `scripts/generate-final-report.mjs` (Task 3) after the
Implementer + Code Review land, per the 2026-07-10 and 2026-07-12
decisions. The prompt-only files touched by this phase (agent/command
markdown) carry no unit-test surface of their own — only the one
`.mjs` script does.

**Explicit scoping decision — "end-to-end dogfood on a real
project."** The dispatching agent's own instruction for this task
flagged that this PRD Phase 7 description item cannot literally be
executed inside this plan/implement cycle: it requires a separate,
already-existing downstream project with `figma_track: true`, a real
Figma file, an approved component map, and an in-flight multi-phase
PRD with an auth-gated route — none of which exist as fixtures inside
the `relay` plugin repo itself. Consistent with how this feature has
already handled other non-executable scope items (e.g. Phase 2's
MCP-access spike was a one-time empirical finding recorded directly
in `docs/decisions.md` rather than a repeatable task), this phase
resolves the item as a **documentation/checklist deliverable**
(`docs/design/dogfood-runbook.md`, Task 10) rather than a
Step-by-Step Task that pretends to execute the dogfood run. A human
operator runs the runbook against a real project separately; this
plan's own Validation Commands only verify the runbook artifact
itself exists and names the right checkpoints.

**No dedicated runbook/checklist precedent exists in this repo.**
This plan's grounding pass (Read/Glob over `docs/`, `documentation/`,
and `PRPs/`) found no existing relay artifact that is itself a
runbook or operator checklist — `docs/troubleshooting.md` is a
symptom/cause/fix reference, not a sequential procedure, and no file
named `*runbook*` or `*checklist*` exists anywhere in the repo.
Task 10's MIRROR anchor (`docs/development.md:21-29`, the "Add a new
skill" numbered step list) is therefore a loose structural analogy —
same numbered, sequential, human-executed-action shape — not a
domain-matched precedent; `docs/design/dogfood-runbook.md`'s content
is derived directly from the PRD's own Phase 7 Success signal and
Success Metrics table.

**Judgment call — "PRD-side three-site registration."** The PRD's
Phase 7 Description cell names this item without further definition
anywhere else in the PRD, its Decisions Log, or `docs/decisions.md`.
This plan's grounding pass (Read/Glob over `docs/api-reference.md`,
`docs/context/architecture.md`, and the `documentation/` site)
found a concrete, verifiable gap consistent with the phrase: Phases
1–6 all synced `docs/context/architecture.md` (in `docs-updater`'s
write scope) but `docs/api-reference.md` is explicitly NOT in
`docs-updater`'s Explicit Write Scope table, and `documentation/` is
explicitly never touched by `docs-updater` (hard constraint #4 of
`docs-updater.md`) — so both have been silently accumulating drift
across six shipped phases with zero Figma entries. This plan
interprets "three-site registration" as closing exactly that gap
across the three sites — `docs/api-reference.md`,
`docs/context/architecture.md`, and the `documentation/` rendered
site (Tasks 7–9) — since that reading is both textually plausible
and empirically grounded in a real, verified gap, rather than
speculating about an alternative meaning with no textual anchor.

**Grounding-pass adaptation.** This plan's GROUNDING phase was
performed via direct `Read`/`Glob` inspection of the live repository
(no `Task`-dispatched `research-codebase`/`research-web` subagents
were available in this invocation's tool set) — every `file:line`
citation in `## Mandatory Reading` and `## Patterns to Mirror` above
was independently verified by reading the cited file at the cited
location, preserving the "never invent a `file:line` reference"
discipline the dispatched-subagent path would otherwise have
enforced.

**`design_source` Metadata field — intentionally omitted.** Per the
2026-07-23 Plan Integration decision and `docs/context/plan-template.md`
item 6, `design_source` is present in a plan's `## Metadata` only
when the *target project* (here, the relay repo itself) declares
`figma_track: true` in its own `docs/context/methodology.md`. This
repo's `methodology.md` does not declare `figma_track` at all — the
relay repo is *building* the Figma Implementation Track, not
*consuming* a Figma design for its own UI (relay has no UI surface).
The field and the conditional `## Design Source` section are
therefore correctly absent from this plan.

*Generated: 2026-07-23*
*Approved: 2026-07-23*
*Implemented: 2026-07-23*
*Status: IMPLEMENTED*
