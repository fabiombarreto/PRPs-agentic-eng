# Feature: Surface integration + dogfood (Phase 7 of figma-visual-first-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (documentation registration across docs/api-reference.md + the documentation/ rendered site for an already-shipped command); reuse of an existing aggregation/dispatch shape (scripts/generate-final-report.mjs's already-shipped, figma_track-gated Visual Fidelity section, extended); no new interactivity-boundary extension (this phase surfaces already-recorded human decisions, it does not add new dialogue)
- Decisions found:
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-06-19] Docs Updater / Docs Reviewer pair is scoped strictly to `docs/context/` + `docs/domain/` (OQ-b) — `documentation/` and `docs/api-reference.md` are explicitly outside its Explicit Write Scope
  - [2026-07-16] Docs-sync's primary trigger relocated to Pillar 2 (`/relay-implement`); the `documentation/` HTML site remains release-cut-phase-maintained, never automated
  - [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder inside `/relay-implement` — the `fidelity-report.json` schema and `figma_track_declared`-gated omission idiom this phase's new surfaces must keep reproducing
  - [2026-07-27] Implement-time visual gate — the exact `phase_scope_value`/`visual_approval_mode` source-of-truth fields (plan `## Metadata` row; `methodology.md` frontmatter) this phase's new aggregation logic reads
  - [2026-07-27] Orchestrator resumability + `/relay-visual-approve` — the `halt.json`/`visual-approval.jsonl` shapes this phase's new aggregation logic consumes
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (docs/anti-patterns.md:60-66)
  - Flipping `figma_track` (or any gating key) by heuristic (docs/anti-patterns.md:89-95) — extended here: the new Scope column / approval lines this phase adds must stay strictly evidence-driven (a real `phase_scope` Metadata row; a real `visual-approval.jsonl` file), never inferred from file names or directory shape
- Applicable architectural rules:
  - `PRPs/` artifact path convention; `.claude/` never-write rule
  - "Nothing changes when a gate is off" invariant (PRD AC-1) — every new surface this phase adds stays gated, omitted entirely (never an empty placeholder), identical to `/relay-implement`'s own `Visual:` line idiom
  - `docs-updater`'s Explicit Write Scope table excludes `documentation/` (Hard Constraint #4, byte-confirmed) and `docs/api-reference.md` (absent from the table) — this phase hand-authors both directly rather than repeating Phase 6's mistaken deferral to that pair
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-visual-first-track.prd.md` — Implementation Phases row 7:
  "Surface integration + dogfood" — Goal: The dual-mode outcome is
  visible end-to-end and the whole mechanism is proven on one real
  feature. — Success signal: A real visual-first feature completes
  through `/relay-approve` with the Visual Fidelity surfaces
  correctly reflecting both phases' outcomes.

## Summary

This phase closes out the Figma Visual-First Track by making its
dual-mode outcome visible in the two places a developer already
looks after `/relay-execute` runs (the QA report and the PR
description), by hand-authoring the documentation registration
Phase 6 mistakenly deferred to an agent that is structurally
forbidden from performing it, and by resolving the PRD's
"end-to-end dogfood on a real visual-first PRD" item as an honest
checklist/runbook deliverable complemented by a self-hosted,
synthetic-fixture dry run — mirroring exactly how the sibling base
Figma Implementation Track resolved the identical infeasibility in
its own final phase. Every new surface reuses the existing
`figma_track_declared`-gated, omit-entirely idiom the base track's
own Phase 7 already established, so a non-visual-first project's
output stays byte-identical.

## User Story

```
As a developer running relay's Figma Visual-First Track (in either auto or human approval mode)
I want the QA report, the PR description, and the documentation site to accurately reflect which phases were visual vs. logic and whether a human explicitly approved the visual result
So that I don't have to go spelunking through PRPs/reports/ to know how a visual-first feature was actually verified, and the /relay-visual-approve command I already shipped is discoverable and documented like every other command
```

## Problem Statement

Phases 1–6 built the complete visual-first mechanism — dual-mode
phase pairing, sentinel resolution, a genuinely blocking
implement-time gate, and a working human-approval round trip via
`/relay-visual-approve` — but every one of its outcomes is trapped
in per-invocation console lines and on-disk JSON a developer would
have to know to go looking for. The base Figma Implementation Track
already solved this exact problem once for its own single-verdict
visual check (Visual Fidelity sections in the QA report and PR
body, Phase 7 of `figma-implementation-track.prd.md`) — but that
existing machinery has no concept of `phase_scope` or of a recorded
human decision, so a visual-first feature's QA report and PR
description look identical whether the gate passed automatically or
a human explicitly signed off, and identical whether a given phase
was the locked-and-approved visual phase or the logic phase wiring
real data behind it. Separately, `/relay-visual-approve` itself —
Phase 6's own new command — is undocumented outside
`docs/context/architecture.md`: Phase 6's own plan explicitly
deferred its `docs/api-reference.md` and `documentation/` site
registration to the `docs-updater`/`docs-reviewer` pair, but that
pair is contractually forbidden from touching `documentation/` at
all (`docs-updater.md` Hard Constraint #4) and its Explicit Write
Scope table does not include `docs/api-reference.md` either — so
the deferred registration never happened and structurally never
could have.

## Solution Statement

Extend the base Figma Implementation Track's already-shipped Visual
Fidelity aggregation (`scripts/generate-final-report.mjs` and
`relay-qa-report.md`'s mirrored spec) to additionally read each
phase's own plan for a `phase_scope` Metadata row and each phase's
own `visual-approval.jsonl` for a recorded human decision —
surfacing both, additively and only when genuinely present, so a
non-visual-first project's rendering stays byte-identical. Document
`relay-pr.md`'s inherited behavior in place (it already calls the
extended script unconditionally). Hand-author — never defer — the
two registration surfaces `docs-updater` structurally cannot reach:
`docs/api-reference.md` and the `documentation/` rendered site,
closing the gap Phase 6 left open, correcting the stale
Fifteen/18-commands counts discovered along the way in the same
edit. Resolve the PRD's "end-to-end dogfood on a real visual-first
PRD" item as a checklist/runbook deliverable, mirroring the sibling
Figma Implementation Track's own identical resolution for an
identical infeasibility (relay itself has no UI and does not
declare `figma_track`), complemented by a self-hosted Level 3 dry
run against two synthetic fixtures that concretely exercises the
new dual-mode rendering logic end to end.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature — cross-cutting surface integration + documentation registration + dogfood (final phase of the Figma Visual-First Track) |
| Complexity | Medium-High — touches 1 build-free Node script, 2 existing command/prompt files, 1 knowledge-base doc, 3 coupled documentation-site files, plus one non-executable scope item resolved as a documentation deliverable |
| Systems Affected | `scripts/generate-final-report.mjs`; `plugins/relay/commands/relay-qa-report.md`; `plugins/relay/commands/relay-pr.md`; `docs/api-reference.md`; `documentation/` site (`reference/commands.html`, `assets/data/search-index.json`, `changelog.html`); `docs/design/` (new runbook file) |
| Dependencies | Phase 5 (Implement-time gate, complete) — `phase_scope_value`/`visual_approval_mode` source fields, `halt.json` shape; Phase 6 (Orchestrator wiring, complete) — `visual-approval.jsonl` shape, `/relay-visual-approve` itself; the base Figma Implementation Track's own Phase 7 (complete) — the existing `generate-final-report.mjs`/`relay-qa-report.md` Visual Fidelity sections this phase extends |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/figma-visual-first-track.prd.md` lines 156, 190–193 |
| phase_type | feature |

**On `phase_type: feature` (not `scaffold`, not `docs`):** this
phase's deliverable is dominated by one real application script
(`scripts/generate-final-report.mjs` gains two new functions and a
render-path extension) alongside supporting prompt/doc edits —
directly matching the base Figma Implementation Track's own Phase 7
(`figma-implementation-track-phase-7-surface-integration.plan.md`),
which chose `feature` for the identical reason. This is distinct
from Phase 6 of THIS SAME track, which chose `scaffold` because its
own deliverable was 100% prompt/command markdown with zero
`.mjs`/application-code surface.

This target project's own `docs/context/methodology.md` does not
declare `figma_track: true`, so per `docs/context/plan-template.md`'s
dual-branch rule this table carries no `design_source` row and the
plan body carries no `## Design Source` section. This plan's own
source PRD (`figma-visual-first-track.prd.md`) does not declare
`visual_first: true` either — row 7's own `Phase` cell ("Surface
integration + dogfood") carries no `[VISUAL]`/`[LOGIC]` tag — so
this table also carries no `phase_scope` row, consistent with every
prior phase of this track's own self-application notes.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/generate-final-report.mjs` | 125–166, 369–380 | `findFidelityReportPaths`/`loadVisualFidelityFrames` — the exact directory-walk and aggregation functions Task 1 extends; the existing `if (visualFrames.length > 0) {...}` gated render block Task 1's new Scope column/approval lines must extend identically |
| P0 | `plugins/relay/commands/relay-implement.md` | 376, 401–427 | The exact `phase_scope_value`/`visual_approval_mode` non-heuristic source-of-truth fields, and the `AWAITING_VISUAL_APPROVAL`/`VISUAL_GATE_BLOCKED` `halt.json` shapes this phase's new aggregation logic must stay consistent with |
| P0 | `plugins/relay/commands/relay-visual-approve.md` | 145–171 | The exact `visual-approval.jsonl` per-line JSON shape (`decision`, `confirmation_text`/`rejection_feedback`, `timestamp`, `fidelity_report_path`) Task 1/2 parse |
| P0 | `plugins/relay/agents/docs-updater.md` | 104–170 | Hard Constraint #2 (no `.claude/` writes), #4 (documentation/ HTML site is never a write target), and the Explicit Write Scope table (excludes `docs/api-reference.md` entirely) — the direct, load-bearing evidence that Phase 6's deferral was structurally impossible and this phase must hand-author both surfaces instead |
| P1 | `plugins/relay/commands/relay-qa-report.md` | 128–155 | The existing `figma_track`-gated Visual Fidelity section spec Task 2 extends |
| P1 | `plugins/relay/commands/relay-pr.md` | 300–317 | Confirms the existing "Full body path already calls the script unconditionally" prose Task 3 extends one layer further |
| P1 | `docs/api-reference.md` | 15–27, 82–97 | The stale "18 commands" summary line and the "Design system (Figma track)" table shape Task 4 must fix/extend |
| P1 | `documentation/reference/commands.html` | 24, 279–289 | The stale "Fifteen commands" page-subtitle and the existing `/relay-visual-review` h3 block — the nearest-sibling shape Task 5's new h3 mirrors |
| P1 | `documentation/assets/data/search-index.json` | 93–97, 194–199 | The existing top-level "Commands" entry (already carries a generic, non-anchored `/relay-visual-approve` mention plus the stale "Fifteen") and the existing dedicated `/relay-visual-review` entry — the shape Task 5's new dedicated entry mirrors |
| P2 | `documentation/changelog.html` | 33–47 | The existing `Unreleased`/`Added` bullets for Phases 1–6 of this same track — the exact sibling bullet shape (and closing-sentence convention) Task 5's new Phase 7 bullet mirrors |
| P2 | `docs/design/dogfood-runbook.md` | full file (150 lines) | The exact sibling runbook shape (Prerequisites / numbered Checklist with per-step Checkpoints / "What done looks like") Task 6 mirrors precisely |
| P2 | `docs/decisions.md` | 628–641 | `[2026-06-19] /relay-approve design + interactivity-boundary extension` — OQ-b, the decision entry that first established "docs-only scope" for the docs pair; the direct textual precedent this plan's Notes cites when explaining why Task 4/5 are hand-authored, not deferred |

## Patterns to Mirror

```
# SOURCE: scripts/generate-final-report.mjs:125-149
function findFidelityReportPaths(reportsDir) {
  const found = [];
  if (!existsSync(reportsDir)) return found;
  for (const entry of readdirSync(reportsDir)) {
    if (!entry.startsWith('phase-')) continue;
    const phaseDir = join(reportsDir, entry);
    if (!statSync(phaseDir).isDirectory()) continue;
    const visualDir = join(phaseDir, 'visual');
    if (!existsSync(visualDir) || !statSync(visualDir).isDirectory()) continue;
    for (const attempt of readdirSync(visualDir)) {
      ...
      if (existsSync(reportPath)) {
        found.push({ phase: entry, attempt, path: reportPath });
      }
    }
  }
  return found;
}
```
Copied into Task 1 — the exact manual `readdirSync`-based directory-walk style (no npm glob dependency) the new `loadPhaseScopes`/`loadVisualApprovalLine` helpers reuse for locating `PRPs/plans/` and each phase's `visual-approval.jsonl`.

```
# SOURCE: scripts/generate-final-report.mjs:369-380
const visualFrames = loadVisualFidelityFrames(reportsDir);
if (visualFrames.length > 0) {
  lines.push('## Visual Fidelity');
  lines.push('');
  lines.push('| Phase | Node ID | Route | Diff % | Threshold | Status |');
  lines.push('|-------|---------|-------|--------|-----------|--------|');
  for (const f of visualFrames) {
    const diffPct = f.diff_percent == null ? '—' : f.diff_percent;
    lines.push(`| ${f.phase} | ${f.node_id ?? '—'} | ${f.route ?? '—'} | ${diffPct} | ${f.threshold ?? '—'} | ${f.status ?? '—'} |`);
  }
  lines.push('');
}
```
Copied into Task 1 — the exact omit-entirely-when-empty gating idiom (no heading, no placeholder) the new Scope column and approval lines must extend identically: added only when discoverable, never when absent.

```
# SOURCE: plugins/relay/commands/relay-implement.md:376
Record `phase_scope_value` (`"visual"`, `"logic"`, or `null` when the
row is absent) — read verbatim, never inferred from row content or
task prose... Read `<target_root>/docs/context/methodology.md`
frontmatter for `visual_first_approval` (values `auto`/`human`);
record `visual_approval_mode`, defaulting to `"auto"` only when the
key is entirely absent from the frontmatter.
```
Copied into Task 1/2 — the exact non-heuristic field names and defaulting rule this phase's new aggregation logic must read consistently with (via the plan's own `## Metadata` `phase_scope` row, since `halt.json` only carries this field on a HALT — never on the pure `VISUAL_VERIFIED`/`auto` happy path).

```
# SOURCE: plugins/relay/commands/relay-visual-approve.md:152-156
{"timestamp": "<ISO timestamp>", "feature": "<feature>", "phase_N": <N>, "decision": "approved", "confirmation_text": "<verbatim reply>", "fidelity_report_path": "<path>"}
```
Copied into Task 1/2 — the exact `visual-approval.jsonl` per-line JSON shape (plus the rejected variant, which additionally carries `rejection_feedback`) the new `loadVisualApprovalLine` helper and the `relay-qa-report.md` prose both parse.

```
# SOURCE: plugins/relay/commands/relay-qa-report.md:130-143
present ONLY when BOTH conditions hold: (1) the target project's
docs/context/methodology.md declares figma_track: true, and (2) at
least one phase-*/visual/*/fidelity-report.json artifact is found...
Absent entirely — no heading, no "N/A" placeholder...
```
Copied into Task 2 — the exact existing figma_track-gated prose shape the new phase_scope-aware / approval-aware extension is appended to, preserving the same "absent entirely, not a placeholder" discipline.

```
# SOURCE: plugins/relay/commands/relay-pr.md:311-317
Since Figma Implementation Track Phase 7, generate-final-report.mjs
also discovers any phase-*/visual/*/fidelity-report.json artifacts
under PRPs/reports/<feature>/ and appends a "## Visual Fidelity"
section automatically when at least one is found — omitted entirely
... This command performs no new script invocation and takes no new
flag to get this behavior...
```
Copied into Task 3 — the exact "inherited automatically, no new invocation" idiom this phase's edit extends one layer further (the same script call now also renders `phase_scope`/approval awareness).

```
# SOURCE: docs/api-reference.md:92-96
| `/relay-visual-review <plan-path>` ✅ **implemented** (`figma_track: true` gate) | A plan whose `## Metadata` carries `design_source: figma`... | Single-shot standalone dispatch of the `visual-verifier` agent... Figma Implementation Track Phase 7. |
```
Copied into Task 4 — the exact row shape (name, input, output, one-line contract summary, closing "Phase N" attribution) the new `/relay-visual-approve` row in a new "Figma Visual-First Track" subsection mirrors.

```
# SOURCE: documentation/reference/commands.html:279-289
<h3 id="relay-visual-review"><code>/relay-visual-review &lt;plan-path&gt;</code> <span class="badge badge--done">implemented</span></h3>
<div class="kv">
  <dt>Input</dt> <dd>...</dd>
  <dt>Output</dt> <dd>...</dd>
  <dt>Mode</dt> <dd>...</dd>
  <dt>Notes</dt> <dd>...</dd>
</div>
```
Copied into Task 5 — the exact `.kv` dt/dd block shape the new `id="relay-visual-approve"` h3 mirrors, per `documentation/AGENTS.md` §5.2's registered vocabulary.

```
# SOURCE: documentation/assets/data/search-index.json:194-199
{
  "title": "/relay-visual-review",
  "path": "reference/commands.html#relay-visual-review",
  "category": "Reference",
  "excerpt": "Standalone, single-shot, non-mutating re-check of visual fidelity..."
}
```
Copied into Task 5 — the exact dedicated per-command search-index object shape the new `/relay-visual-approve` entry mirrors.

```
# SOURCE: documentation/changelog.html:46 (Phase 6's own Unreleased bullet, closing sentence)
...rejection feedback is routed into the next implementation attempt
automatically. Part of the Figma Visual-First Track, Phase 6 of
<code>PRPs/prds/figma-visual-first-track.prd.md</code>.
```
Copied into Task 5 — the exact `<code>`-tagged (not markdown-backtick) closing-sentence convention every sibling bullet in this same `Unreleased` block already uses; Task 5's new bullet closes "...Phase 7 of `<code>PRPs/prds/figma-visual-first-track.prd.md</code>`."

```
# SOURCE: docs/design/dogfood-runbook.md:50-68 (Checklist step 1 shape)
1. **Confirm `figma_track: true` is set via `/relay-design-map`'s
   confirmation gate.**
   Run `/relay-design-map` against the target project...
   **Checkpoint:** `docs/context/methodology.md` reads `figma_track:
   true`, and `docs/design/component-map.md` exists with at least one
   `CONFIRMED` or `INFERRED` row.
```
Copied into Task 6 — the exact numbered-step + bolded-action + explicit `**Checkpoint:**` shape every step of the new `visual-first-dogfood-runbook.md` mirrors.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `scripts/generate-final-report.mjs` | UPDATE | Extend the Visual Fidelity aggregation to be `phase_scope`- and human-approval-aware |
| `plugins/relay/commands/relay-qa-report.md` | UPDATE | Mirror the same dual-mode extension in the QA report's own spec |
| `plugins/relay/commands/relay-pr.md` | UPDATE | Document that the inherited Visual Fidelity section is now dual-mode aware too |
| `docs/api-reference.md` | UPDATE | Register `/relay-visual-approve` (currently absent entirely) + fix the stale 18-command count |
| `documentation/reference/commands.html` | UPDATE | New section registering `/relay-visual-approve` + fix the stale Fifteen-command count |
| `documentation/assets/data/search-index.json` | UPDATE | New dedicated search entry for `/relay-visual-approve` + fix the stale Fifteen-command count in the Commands excerpt |
| `documentation/changelog.html` | UPDATE | New `Unreleased`/`Added` bullet for Phase 7 |
| `docs/design/visual-first-dogfood-runbook.md` | CREATE | Non-executable "end-to-end dogfood on a real feature" scope item, delivered as a checklist artifact mirroring the sibling track's own precedent |

## NOT Building (Scope Limits)

- Actually executing the end-to-end dogfood run against a real
  downstream `figma_track: true` project with a real visual-first
  feature — no such project exists as a fixture inside this repo
  (relay itself has no UI surface and does not declare
  `figma_track`); delivered instead as the
  `docs/design/visual-first-dogfood-runbook.md` checklist artifact,
  complemented by a self-hosted Level 3 synthetic-fixture dry run
  (see `## Notes`).
- Bumping `plugins/relay/.claude-plugin/plugin.json` or cutting a
  new `documentation/changelog.html` release. Phase 6 of this SAME
  track — the immediately preceding phase — explicitly stayed under
  `Unreleased` for this identical reason ("do NOT create a new h2
  release heading, do NOT bump plugin.json — stays under Unreleased
  so version-parity remains green"); this phase mirrors that
  precedent rather than unilaterally bundling the large backlog of
  unreleased work from both this track AND the sibling Figma
  Implementation Track into one release cut (see `## Notes`).
- Updating `docs/context/architecture.md` — already accurate
  (confirmed via direct read: correctly states "19 commands" and
  already documents `/relay-visual-approve` in full, since it IS
  inside `docs-updater`'s Explicit Write Scope and was synced
  automatically at Phase 6's implement time). No gap to close there.
- Any change to `plugins/relay/commands/relay-visual-approve.md`,
  `relay-execute.md`, or `relay-implement.md` — all already shipped
  (Phase 5/6); this phase only surfaces their already-recorded
  outputs downstream, never re-opens their mechanics.
- Deferring `documentation/` or `docs/api-reference.md`
  registration to `docs-updater`/`docs-reviewer` — confirmed
  structurally impossible by direct read of `docs-updater.md`'s Hard
  Constraint #4 (documentation/ is never a write target) and its
  Explicit Write Scope table (excludes `docs/api-reference.md`
  entirely). This phase hand-authors both directly instead of
  repeating Phase 6's dead-end deferral.
- Any activation of the new Scope column / approval lines by
  heuristic — strictly gated on real, discoverable evidence (a
  plan's own `phase_scope` Metadata row; a real `visual-approval.jsonl`
  file), never inferred from file names, directory shape, or phase
  numbering.
- Fixing any OTHER pre-existing documentation drift not touched by
  this phase's own Files to Change list — scope stays confined to
  the concrete registration gap and count drift this phase's
  grounding pass found and verified, not a general documentation
  audit.

## Step-by-Step Tasks

### Task 1: UPDATE scripts/generate-final-report.mjs

- **ACTION** (AC-A1, AC-A2, AC-A3): Add two new pure functions
  alongside the existing `findFidelityReportPaths`/
  `loadVisualFidelityFrames` pair: (a) `loadPhaseScopes(reportsDir,
  phases)` — given the array of unique `"phase-<N>"` directory-name
  strings already discovered, resolve the plans root as two levels
  up from `reportsDir` (`resolve(reportsDir, '..', '..')`, i.e. from
  `.../PRPs/reports/<feature>/` up to `.../PRPs/`); for each phase,
  parse `<N>` from `"phase-<N>"` and search first
  `PRPs/plans/*-phase-<N>-*.plan.md` then
  `PRPs/plans/completed/*-phase-<N>-*.plan.md` (manual `readdirSync`
  + regex filename match, mirroring `findFidelityReportPaths`'s own
  walk style — no npm glob dependency); when exactly one plan file
  is found, `readFileSync` it and regex-match its `## Metadata`
  table for a `phase_scope` row (`/\|\s*phase_scope\s*\|\s*(visual|logic)\s*\|/i`);
  return a `Map<phase, 'visual'|'logic'|null>` (`null` when no plan
  file is found, more than one matches, or no `phase_scope` row is
  present — never throws). (b) `loadVisualApprovalLine(reportsDir,
  phase)` — check for `<reportsDir>/<phase>/visual-approval.jsonl`;
  when present, read it, split on newlines, parse the LAST
  non-empty line as JSON, and return a formatted markdown string
  using its `decision` (`"approved"`/`"rejected"`),
  `confirmation_text` (or `rejection_feedback` on rejection), and
  `timestamp` fields; return `null` when the file is absent or
  unparseable (never throws). Inside `buildMarkdown()`'s existing
  `if (visualFrames.length > 0)` block: call `loadPhaseScopes` with
  the unique set of `visualFrames[].phase` values; when at least one
  returned value is non-`null`, render the existing five-column
  table with a sixth `Scope` column appended (header + every data
  row); when all returned values are `null`, render the table
  exactly as today (five columns, byte-unchanged). After the table,
  for every phase whose `phase_scope` is non-`null`, call
  `loadVisualApprovalLine` and, when it returns non-`null`, push one
  additional markdown line per such phase. When zero phases have a
  non-`null` `phase_scope`, this whole approval-lines block is
  skipped entirely — the same omission idiom the section's own
  heading already uses when `visualFrames` is empty.
- **MIRROR**: Patterns to Mirror snippets 1, 2, 3, and 4 above.
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check scripts/generate-final-report.mjs
  grep -q "loadPhaseScopes" scripts/generate-final-report.mjs
  grep -q "loadVisualApprovalLine" scripts/generate-final-report.mjs
  grep -q "phase_scope" scripts/generate-final-report.mjs
  grep -q "visual-approval.jsonl" scripts/generate-final-report.mjs
  echo "PASS: generate-final-report.mjs parses cleanly and carries the new dual-mode aggregation functions"
  ```

### Task 2: UPDATE plugins/relay/commands/relay-qa-report.md

- **ACTION** (AC-A1, AC-A2, AC-A3): Extend the existing
  `figma_track`-gated "## Visual Fidelity" section spec (the
  paragraph beginning "In addition to the seven-field case table
  above...") with new prose instructing the executing LLM: for each
  discovered `phase-<N>` directory contributing frames to the
  section, also attempt to read that phase's own plan
  (`PRPs/plans/<feature>-phase-<N>-*.plan.md`, falling back to
  `PRPs/plans/completed/<feature>-phase-<N>-*.plan.md`) for a
  `phase_scope` row in its `## Metadata` table; when at least one
  discovered phase declares a `phase_scope` value, add a sixth
  "Scope" column to the per-frame table (omitted entirely, five
  columns unchanged, when no phase declares one — the same
  conditional-column rule Task 1 applies to
  `generate-final-report.mjs`, so both surfaces stay consistent with
  each other); and, for every phase that both declares `phase_scope`
  AND has a `PRPs/reports/<feature>/phase-<N>/visual-approval.jsonl`
  file, append one line below the table per such phase summarizing
  the recorded human decision (approved/rejected, with the verbatim
  confirmation or rejection-feedback text) parsed from that file's
  last line. State explicitly that this extension never infers a
  `phase_scope` or approval decision — both are sourced only from
  real, on-disk evidence, mirroring the section's own existing
  "sourced entirely from already-persisted evidence on disk"
  sentence.
- **MIRROR**: Patterns to Mirror snippets 5, 3, and 4 above.
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "phase_scope" plugins/relay/commands/relay-qa-report.md
  grep -q "visual-approval.jsonl" plugins/relay/commands/relay-qa-report.md
  grep -q "Visual Fidelity" plugins/relay/commands/relay-qa-report.md
  echo "PASS: relay-qa-report.md's Visual Fidelity section is now phase_scope- and approval-aware"
  ```

### Task 3: UPDATE plugins/relay/commands/relay-pr.md

- **ACTION** (AC-A2): In Phase 3 Step 3's "Full body path" prose,
  immediately after the existing sentence ending "...omitted
  entirely (no heading, no placeholder) for a non-Figma project or
  when no visual-verification evidence exists yet.", append one more
  sentence: "Since the Figma Visual-First Track's own Phase 7, this
  same `generate-final-report.mjs` call additionally renders the
  section as phase_scope-aware (an added Scope column, present only
  when a phase's own plan declares `phase_scope`) and surfaces any
  recorded `/relay-visual-approve` human decision (approved/rejected)
  from a discovered `phase-<N>/visual-approval.jsonl` file — again
  inherited automatically from the one existing script invocation
  this step already makes, with no new flag or invocation."
- **MIRROR**: Patterns to Mirror snippet 6 above.
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "phase_scope-aware" plugins/relay/commands/relay-pr.md
  echo "PASS: relay-pr.md documents the inherited phase_scope-aware Visual Fidelity behavior"
  ```

### Task 4: UPDATE docs/api-reference.md

- **ACTION** (AC-A4): Two edits. (1) In the `## Commands` section's
  opening paragraph (currently starting "18 commands organized by
  role..."), change "18 commands" to "19 commands", and extend the
  sentence naming the three standalone Figma Implementation Track
  commands to also name `/relay-visual-approve` as a fourth
  standalone command belonging to the sibling Figma Visual-First
  Track, gated by `visual_first_approval: human` (itself only
  reachable when `figma_track: true` and `visual_first: true`)
  rather than `figma_track` directly. (2) Immediately after the
  existing `#### Design system (Figma track)` table (ending with the
  `/relay-visual-review` row), add a new subsection `#### Figma
  Visual-First Track` with one sentence of framing prose (mirroring
  the existing Design system section's own framing-sentence shape)
  noting this is a sibling, dependent track, and a one-row table
  registering `/relay-visual-approve <feature>`: input (a feature
  name), output (a recorded approve/reject decision via a single
  `Edit` on the paused phase's `halt.json` plus an audit
  `visual-approval.jsonl` line), and a one-line contract summary
  naming the three HALT codes (`FAILED_NOTHING_TO_APPROVE`,
  `FAILED_MULTIPLE_PENDING_APPROVALS`, `FAILED_PLAN_AMBIGUOUS`) and
  that it is never invoked by `/relay-execute`.
- **MIRROR**: Patterns to Mirror snippet 7 above.
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "19 commands" docs/api-reference.md
  if grep -q "18 commands" docs/api-reference.md; then
    echo "FAIL: stale '18 commands' count still present in docs/api-reference.md"
    exit 1
  fi
  grep -q "relay-visual-approve" docs/api-reference.md
  grep -q "Figma Visual-First Track" docs/api-reference.md
  echo "PASS: docs/api-reference.md count corrected to 19 and /relay-visual-approve registered under a new Figma Visual-First Track subsection"
  ```

### Task 5: UPDATE documentation/ site (three-file registration rule)

- **ACTION** (AC-A4): Per `documentation/AGENTS.md`'s binding
  registration rule (read that file first, per this repo's own
  `CLAUDE.md` instruction), three coordinated edits. (1) In
  `documentation/reference/commands.html`, change the page-subtitle's
  "Fifteen commands" to "Nineteen commands", and add a new
  `<h2 id="figma-visual-first-track">Figma Visual-First Track</h2>`
  section immediately after the closing of the existing
  `<h2 id="design-system">` section's last h3 (the
  `/relay-visual-review` block) and before `<h2 id="pillar3">`, with
  one framing `<p>` naming this as the sibling, dependent track
  (mirroring the existing "Design system (Figma track)" section's
  own opening framing paragraph shape) and a new
  `<h3 id="relay-visual-approve"><code>/relay-visual-approve
  &lt;feature-name&gt;</code></h3>` block using the existing `.kv`
  structure (Input/Output/Mode/Notes dt/dd pairs), mirroring the
  `/relay-visual-review` h3's own shape: input (a feature name);
  output (a recorded decision — one `Edit` on the paused phase's
  `halt.json` plus one appended `visual-approval.jsonl` audit line);
  mode (deterministic infra, no writer/reviewer pair, never invoked
  by `/relay-execute`); notes (the three HALT codes
  `FAILED_NOTHING_TO_APPROVE` / `FAILED_MULTIPLE_PENDING_APPROVALS` /
  `FAILED_PLAN_AMBIGUOUS`, and that it mirrors
  `relay-design-map.md`'s own confirm-then-single-Edit discipline).
  (2) In `documentation/assets/data/search-index.json`, add one new
  JSON object (mirroring the existing `/relay-visual-review` object's
  shape) with `title: "/relay-visual-approve"`,
  `path: "reference/commands.html#relay-visual-approve"`,
  `category: "Reference"`, and a one-sentence excerpt describing the
  human-mode visual-approval gate; separately, in the existing
  top-level "Commands" entry's excerpt (the one already mentioning
  `/relay-visual-approve` generically), change its leading "Fifteen
  commands" to "Nineteen commands". (3) In
  `documentation/changelog.html`, add one new `<li>` under the
  existing `<h3 id="unreleased-added">Added</h3> <ul>` (mirroring the
  Phase 1–6 bullets already there; do NOT create a new `<h2>` release
  heading and do NOT bump `plugins/relay/.claude-plugin/plugin.json`
  — stays under `Unreleased`, mirroring Phase 6's own explicit
  precedent recorded in this plan's `## Notes`) describing: the QA
  report's and the PR body's Visual Fidelity sections both becoming
  phase_scope-aware and surfacing the recorded
  `/relay-visual-approve` decision; the documentation-site
  registration gap this same bullet's own shipment closes; and the
  new `docs/design/visual-first-dogfood-runbook.md` checklist
  artifact. Close with "Part of the Figma Visual-First Track, Phase
  7 of `<code>PRPs/prds/figma-visual-first-track.prd.md</code>`." —
  matching every sibling bullet's own closing-sentence convention
  exactly (real HTML `<code>` tags, not markdown backticks).
- **MIRROR**: Patterns to Mirror snippets 8, 9, and 10 above.
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q "Nineteen commands" documentation/reference/commands.html
  if grep -q "Fifteen commands" documentation/reference/commands.html; then
    echo "FAIL: stale 'Fifteen commands' still present in documentation/reference/commands.html"
    exit 1
  fi
  grep -q 'id="relay-visual-approve"' documentation/reference/commands.html
  grep -q '"reference/commands.html#relay-visual-approve"' documentation/assets/data/search-index.json
  grep -q "Nineteen commands" documentation/assets/data/search-index.json
  grep -q "phase_scope-aware" documentation/changelog.html
  grep -q "visual-first-dogfood-runbook" documentation/changelog.html
  echo "PASS: documentation/ site three-file registration complete for /relay-visual-approve, counts corrected to Nineteen"
  ```

### Task 6: CREATE docs/design/visual-first-dogfood-runbook.md

- **ACTION** (AC-A5): Author a checklist/runbook artifact, mirroring
  `docs/design/dogfood-runbook.md`'s exact shape (a "Why this file
  exists (scope note)" admission, Prerequisites, a numbered
  Checklist with per-step `**Checkpoint:**` lines, a closing "What
  'done' looks like" section), scoped to the Figma Visual-First
  Track's own new mechanics: (1) author a `visual_first: true` PRD
  with `figma_track: true` via `/relay-prd`, confirming
  `prd-reviewer`'s strict `[VISUAL]`/`[LOGIC]` 1:1 pairing check
  passes; (2) run `/relay-execute` through a visual/logic pair under
  `visual_first_approval: auto`, confirming a genuine
  `VISUAL_VERIFIED` unblocks the paired logic phase automatically
  with no halt; (3) for a second pair, set
  `visual_first_approval: human`, run `/relay-execute`, confirm it
  HALTs with `AWAITING_VISUAL_APPROVAL`, run `/relay-visual-approve`,
  confirm the surfaced evidence (fidelity report + capture/reference
  paths), approve, and confirm a subsequent `/relay-execute`
  re-invocation resumes via Phase A.2.5 without re-running the
  implementer/code-reviewer/visual-verifier; (4) exercise the
  rejection path — reject via `/relay-visual-approve` with feedback,
  confirm the resumed session seeds that feedback as the
  implementer's first `prior_feedback`; (5) confirm the logic phase's
  sentinel ledger resolves to zero remaining
  `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` tokens; (6) confirm
  `/relay-qa-report` and the PR's `final-report.md` both render the
  new dual-mode Visual Fidelity section (Scope column + recorded
  approval decision) — the exact surfaces Tasks 1–3 of this phase
  ship; (7) record the wall-clock/human-touchpoint timing against
  the source PRD's own Success Metrics table ("Two-cycle human
  overhead"). State explicitly, in a scope note mirroring the
  sibling runbook's own admission, that this cannot be executed
  inside this plan/implement cycle (relay itself has no UI surface
  and does not declare `figma_track`) and is resolved as this
  checklist deliverable instead, complemented by this plan's own
  Level 3 synthetic-fixture dry run (see `## Notes`).
- **MIRROR**: Patterns to Mirror snippet 11 above; the whole file
  structurally mirrors `docs/design/dogfood-runbook.md` end to end.
- **VALIDATE**:
  ```
  set -euo pipefail
  test -f docs/design/visual-first-dogfood-runbook.md
  grep -q "visual_first_approval: human" docs/design/visual-first-dogfood-runbook.md
  grep -q "AWAITING_VISUAL_APPROVAL" docs/design/visual-first-dogfood-runbook.md
  grep -q "relay-visual-approve" docs/design/visual-first-dogfood-runbook.md
  grep -q "RELAY-MOCK" docs/design/visual-first-dogfood-runbook.md
  echo "PASS: visual-first dogfood runbook checklist artifact created with required checkpoints"
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
grep -q "loadPhaseScopes" scripts/generate-final-report.mjs
grep -q "loadVisualApprovalLine" scripts/generate-final-report.mjs
grep -q "phase_scope" plugins/relay/commands/relay-qa-report.md
grep -q "phase_scope-aware" plugins/relay/commands/relay-pr.md
grep -q "19 commands" docs/api-reference.md
if grep -q "18 commands" docs/api-reference.md; then
  echo "FAIL: stale count in docs/api-reference.md"
  exit 1
fi
grep -q "Nineteen commands" documentation/reference/commands.html
if grep -q "Fifteen commands" documentation/reference/commands.html; then
  echo "FAIL: stale count in documentation/reference/commands.html"
  exit 1
fi
grep -q '"reference/commands.html#relay-visual-approve"' documentation/assets/data/search-index.json
grep -q "visual-first-dogfood-runbook" documentation/changelog.html
test -f docs/design/visual-first-dogfood-runbook.md
echo "PASS: all Phase 7 content invariants present across every changed/created file"
```

### Level 3 — DRY-RUN END-TO-END

```
set -euo pipefail
TMPDIR=$(mktemp -d)

# --- Fixture A: base Figma Implementation Track shape (no phase_scope data) ---
# Proves backward compatibility: the new Scope column / approval
# lines must NOT appear when no plan/visual-approval evidence exists
# — the base track's own existing rendering must stay byte-unchanged.
mkdir -p "$TMPDIR/A/phase-7/visual/1"
cat > "$TMPDIR/A/run.json" <<'EOF'
{"feature":"basefig-fixture","run_id":"fixture-a","outcome":"GREEN"}
EOF
cat > "$TMPDIR/A/phase-7/visual/1/fidelity-report.json" <<'EOF'
{"frames":[{"node_id":"1:1","route":"/","diff_percent":0.4,"threshold":2,"status":"PASS"}]}
EOF
node scripts/generate-final-report.mjs "$TMPDIR/A" --out "$TMPDIR/A/final-report.md"
grep -q "Visual Fidelity" "$TMPDIR/A/final-report.md"
if grep -q "Scope" "$TMPDIR/A/final-report.md"; then
  echo "FAIL: Scope column must be omitted when no plan phase_scope data is discoverable (backward-compat regression)"
  exit 1
fi
echo "PASS: base-track fixture renders unchanged, no Scope column"

# --- Fixture B: dual-mode visual-first shape (phase_scope + human approval) ---
mkdir -p "$TMPDIR/B/PRPs/plans"
mkdir -p "$TMPDIR/B/PRPs/reports/dualmode-fixture/phase-9/visual/1"
cat > "$TMPDIR/B/PRPs/plans/dualmode-fixture-phase-9-widget.plan.md" <<'EOF'
## Metadata

| Key | Value |
|-----|-------|
| phase_scope | visual |
EOF
cat > "$TMPDIR/B/PRPs/reports/dualmode-fixture/run.json" <<'EOF'
{"feature":"dualmode-fixture","run_id":"fixture-b","outcome":"GREEN"}
EOF
cat > "$TMPDIR/B/PRPs/reports/dualmode-fixture/phase-9/visual/1/fidelity-report.json" <<'EOF'
{"frames":[{"node_id":"2:2","route":"/widget","diff_percent":0.1,"threshold":2,"status":"PASS"}]}
EOF
cat > "$TMPDIR/B/PRPs/reports/dualmode-fixture/phase-9/visual-approval.jsonl" <<'EOF'
{"timestamp":"2026-07-27T00:00:00Z","feature":"dualmode-fixture","phase_N":9,"decision":"approved","confirmation_text":"yes","fidelity_report_path":"PRPs/reports/dualmode-fixture/phase-9/visual/1/fidelity-report.json"}
EOF
node scripts/generate-final-report.mjs "$TMPDIR/B/PRPs/reports/dualmode-fixture" --out "$TMPDIR/B/final-report.md"
grep -q "Scope" "$TMPDIR/B/final-report.md"
grep -q "visual" "$TMPDIR/B/final-report.md"
grep -q "approved" "$TMPDIR/B/final-report.md"
echo "PASS: dual-mode fixture renders Scope column + recorded approval decision"

rm -rf "$TMPDIR"
```

Every command above either exits with the natural non-zero status of
a failing `node --check`/`node -e`/`grep -q`/`npm run validate`
invocation under `set -euo pipefail`, or an explicit `exit 1` inside
an `if` guard — none rely on the forbidden
`<check> && echo "PASS" || echo "FAIL"` idiom, per the 2026-07-09
decision and `plan-reviewer`'s `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given `visual_first`/`phase_scope` absent
  from a feature's phases, when `/relay-qa-report` or `/relay-pr`
  run, then no Scope column and no approval-decision line appears
  anywhere in their Visual Fidelity output — the new surfaces this
  phase adds are gated byte-for-byte identically to
  `/relay-implement`'s existing `Visual:` line gate, and the base
  Figma Implementation Track's own existing rendering stays
  unchanged (Level 3 Fixture A).
- **AC-A2 (PRD AC-6):** Given a completed visual-first feature's
  `phase-<N>/visual/<attempt>/fidelity-report.json`, when
  `/relay-qa-report` or `/relay-pr` render the Visual Fidelity
  section, then each in-scope phase's `phase_scope` (visual/logic)
  is recorded and surfaced — never silently dropped — extending the
  same "always recorded, never hidden" guarantee AC-6 already
  requires of the underlying regression outcome.
- **AC-A3 (PRD AC-4):** Given `/relay-visual-approve` has recorded an
  approve/reject decision in a phase's `visual-approval.jsonl`, when
  `/relay-qa-report` or `/relay-pr` next render that phase, then the
  recorded decision (approved/rejected, with its confirmation or
  rejection-feedback text) becomes visible in both surfaces — closing
  the loop on AC-4's human-review guarantee by making it observable
  after the fact, not just enforced at gate time.
- **AC-A4 (PRD AC-1):** Given the `documentation/` rendered site and
  `docs/api-reference.md`, when a developer looks up the command
  surface after this phase ships, then both sites accurately register
  `/relay-visual-approve` and its `visual_first_approval: human` gate
  — preventing a false impression that the track's human-approval
  command is undocumented or always-on, the same "no false always-on
  impression" spirit AC-1 already protects for runtime behavior.
- **AC-A5 (PRD AC-4):** Given the "end-to-end dogfood on a real
  visual-first feature" scope item cannot be executed inside this
  plan/implement cycle (no downstream `figma_track: true` project
  with a real visual-first feature is available), when this phase
  ships, then `docs/design/visual-first-dogfood-runbook.md` exists
  enumerating concrete checkpoints exercising BOTH `auto` and
  `human` approval modes end to end on a real feature — recording
  the scope decision explicitly (per this plan's `## Notes`) rather
  than silently dropping the PRD's Phase 7 success signal, and
  complemented by this plan's own Level 3 synthetic-fixture dry run
  which DOES execute real, self-hosted code.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `generate-final-report.mjs`'s new `phase_scope` lookup has no real-world visual-first plan to test against inside this repo (relay itself isn't `visual_first`) | Medium | Medium | Level 3 DRY-RUN synthesizes two fixtures (base-track and dual-mode) and asserts correct, opposite renderings; the test-after pair (`test-writer`/`test-reviewer`) authors `node:test` unit tests against the same fixtures per this repo's declared `test_frameworks: ["node:test"]` |
| The new Scope column / approval lines could regress the base Figma Implementation Track's existing, already-shipped Visual Fidelity rendering for non-visual-first projects | Medium | High | Conditional gating: the column/lines are added ONLY when a discoverable `phase_scope` Metadata row exists; Level 3's Fixture A explicitly asserts the OLD rendering shape stays byte-unchanged |
| Repeating Phase 6's dead-end deferral — assuming `docs-updater`/`docs-reviewer` will pick up `documentation/` or `docs/api-reference.md` registration automatically | High (already happened once, this same track) | Medium | Confirmed structurally impossible by direct read of `docs-updater.md` Hard Constraint #4 + its Explicit Write Scope table; this phase hand-authors both directly (Tasks 4 and 5), never defers |
| "End-to-end dogfood on a real feature" cannot be executed inside this plan/implement cycle — no downstream `figma_track: true` project with a real visual-first feature exists inside this repo | High | Medium | Scoped as a documentation/checklist deliverable (`docs/design/visual-first-dogfood-runbook.md`) mirroring the sibling track's own identical resolution, complemented by the Level 3 synthetic dry-run that DOES execute real, self-hosted code against constructed fixtures |
| Documentation registration count drift (Fifteen/18 vs. 19) recurs again in a future phase that adds a new command without updating every count site | Medium | Low | Level 2 CONTENT_INVARIANTS greps enforce both presence of the new count AND absence of the stale one at plan-review and code-review time |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. `test_frameworks:
["node:test"]` IS declared here, so the pair is ACTIVE — it will
author `node:test` unit tests for the new `loadPhaseScopes`/
`loadVisualApprovalLine` aggregation logic in
`scripts/generate-final-report.mjs` (Task 1) after the Implementer +
Code Review land. The prompt-only files touched by this phase
(agent/command markdown, HTML, JSON) carry no unit-test surface of
their own — only the one `.mjs` script does.

**Deliberate decision — no version bump / release cut this phase.**
Phase 6 of this SAME track (`figma-visual-first-track-phase-6-orchestrator-wiring.plan.md`,
Task 8) explicitly added its own bullet under the existing
`Unreleased` block and explicitly instructed "do NOT create a new h2
release heading, do NOT bump `plugin.json` — stays under Unreleased
so `version-parity` remains green." The base Figma Implementation
Track's own final phase
(`figma-implementation-track-phase-7-surface-integration.plan.md`)
made the identical choice. As of this plan's grounding pass, the
current `Unreleased` block accumulates the ENTIRE backlog of both
the base Figma Implementation Track (Phases 1, 3–7) and this whole
Figma Visual-First Track (Phases 1–6) — a large, two-feature backlog
whose release-cut is a bigger decision than this phase's own narrow
scope ("QA report / PR body / documentation site made aware of the
dual-mode outcome; end-to-end dogfood"). This plan mirrors the
twice-precedented choice: add this phase's own bullet, leave the
version and release cut for a dedicated future release-cut pass.

**Deliberate decision — fix the stale command-count drift in the
same edit.** `documentation/reference/commands.html`'s page-subtitle
and `documentation/assets/data/search-index.json`'s "Commands" entry
excerpt both currently read "Fifteen commands" (last corrected at
v0.20.0, 2026-07-12, when `/relay-qa-report` shipped); `docs/api-reference.md`
currently reads "18 commands". The true count, confirmed via `Glob`
against `plugins/relay/commands/*.md`, is **19** — `relay-design-map`,
`relay-design-spec`, and `relay-visual-review` were all added after
the last count correction (bringing the true count to 18 even before
this phase), and `relay-visual-approve` (Phase 6 of this track) makes
19. This is the exact "deferring to an agent that cannot act" defect
class flagged for this run: leaving the count uncorrected while
ALSO being the phase that adds the 19th command's own documentation
in these same two files would be the fourth silent undercount in a
row. Since Tasks 4 and 5 are already editing these exact files for a
directly related reason (registering `/relay-visual-approve`), this
plan corrects both counts in the same edit rather than compounding
the drift a further time. `docs/context/architecture.md` already
states the correct count (19) and needed no fix — see `## NOT
Building`.

**Deliberate decision — a new "Figma Visual-First Track" subsection,
not folded into "Design system (Figma track)".** `docs/api-reference.md`
and `documentation/reference/commands.html` both currently frame
their existing Figma section around `figma_track: true` gating and a
hardcoded count ("All three are gated behind `figma_track: true`").
`/relay-visual-approve` is gated by `visual_first_approval: human`
(itself only reachable when `figma_track: true` AND `visual_first:
true` — a narrower, transitively-dependent condition, not the same
gate directly) and belongs to a distinct, sibling PRD
(`figma-visual-first-track.prd.md`, not `figma-implementation-track.prd.md`).
`docs/context/architecture.md` — already correct — treats these as
parallel, separately-described interactivity-boundary extensions
("Deliberately re-extended, `figma_track`-gated: ..." vs.
"Deliberately re-extended a third time, Figma Visual-First
Track-scoped: ..."), never merging them into one bucket. This plan
mirrors that established, correct precedent rather than rewriting
"All three" to "All four" under a gating condition that would then
be technically imprecise for the fourth row.

**Correcting Phase 6's dead-end deferral.** Phase 6's own `## NOT
Building` section stated: "Registering `/relay-visual-approve` in
`docs/api-reference.md` or `documentation/reference/commands.html` —
this project's `docs_sync: true` routes broader knowledge-base
registration through the automated `docs-updater`/`docs-reviewer`
pair at implement time." This plan's grounding pass directly `Read`
`plugins/relay/agents/docs-updater.md` and confirmed this claim was
incorrect on both counts: Hard Constraint #4 states verbatim "Never
touch the `documentation/` HTML site... Every mention of
`documentation/` in your output is a read... never a write target,"
and the Explicit Write Scope table does not list
`docs/api-reference.md` among its permitted paths at all. Neither
file was ever going to be touched by that pair, regardless of
`docs_sync`. Tasks 4 and 5 of this plan hand-author both directly,
closing the gap Phase 6 left open.

**Grounding methodology.** `research-codebase` and `research-web`
subagents were dispatched in parallel per protocol (Phase 2
GROUNDING). `research-web` returned findings that a
narrating-the-automated-vs-human-approved-distinction-in-prose
pattern (this plan's own design) has no exact external precedent —
every real-world example it found (GitHub branch-protection admin
bypass, an AI-review bot's separate `Approved`/`Escalated` comment
primitive, Diff Vader's reuse of GitHub's native review UI) encodes
the distinction as a separate platform primitive, not narrated prose
inside a generated report — an explicit gap, not a contradiction, so
this plan's simpler embedded-column-plus-line design is a reasonable
choice absent a contradicting precedent, consistent with Phase 6's
own finding of "no direct external precedent" for its rejection-
feedback routing. It also found no precedent for a three-artifact
(changelog + reference doc + search index) parity convention
specifically — confirming this is a project-specific
`documentation/AGENTS.md` contract, not an industry norm, which this
plan follows as written rather than reinventing. Given this task's
high internal specificity, direct `Read`/`Glob` inspection of the
live repository was the PRIMARY grounding method — every `file:line`
citation in `## Mandatory Reading` and `## Patterns to Mirror` above
was independently verified by reading the cited file at the cited
location (including a fresh re-read of `relay-implement.md`'s Phase
A.3.4 to confirm current line numbers after Phase 5's edits shifted
them from the stale citations in earlier plans) — mirroring exactly
how the closest analogous precedent
(`figma-implementation-track-phase-7-surface-integration.plan.md`)
handled an identical situation.

**Defect-class sweep (per dispatcher guidance for this run).** Every
`grep`/`node -e` target in this plan's `VALIDATE` blocks was checked
against the CURRENT content of its target file (via the direct reads
above) to confirm it is either genuinely absent today (so presence
alone proves new content was added — `phase_scope`,
`loadPhaseScopes`, `phase_scope-aware`, `visual-first-dogfood-runbook`,
`"reference/commands.html#relay-visual-approve"`, `Nineteen commands`)
or, where an absence-check was needed (`18 commands`, `Fifteen
commands`), phrased with an explicit `if grep -q ...; then echo
"FAIL"; exit 1; fi` guard rather than a bare `!`-prefixed grep — a
bare `! grep -q ...` under `set -e` does NOT abort the script on a
match (a documented bash `set -e` caveat), which would have silently
defeated the exact invariant it was meant to enforce. Every task's
`**ACTION**` was checked against its own `**VALIDATE**` for the
insert-vs-reject / remove-vs-require contradiction shape: Tasks 4/5
instruct REMOVING a stale count string while their own VALIDATE
requires its ABSENCE (consistent, not a contradiction — the inverse
shape, `R-COH-ACTION-VALIDATE-CONTRADICTION`'s (b) case, would be
instructing removal while requiring presence, which is not what these
tasks do). Every multi-word `grep` target was re-checked for the
line-wrap risk named in this run's dispatcher guidance and, where a
long phrase was originally considered (e.g. the changelog's full
closing sentence), replaced with a short, single/compound-word token
instead (`phase_scope-aware`, `visual-first-dogfood-runbook`) that
cannot be split by line-wrapping and cannot collide with the
sibling Figma Implementation Track's own, textually similar
"Phase 7" bullet already sitting in the same `Unreleased` block.

**Self-application note.** This plan's own source PRD
(`figma-visual-first-track.prd.md`) does not declare `visual_first:
true` — it is the PRD that BUILDS the visual-first mechanism, not
one that USES it; row 7's own `Phase` cell ("Surface integration +
dogfood") carries no `[VISUAL]`/`[LOGIC]` tag, so this table carries
no `phase_scope` row. This target repo's own `docs/context/methodology.md`
declares no `figma_track` key at all, so this table also carries no
`design_source` row and the plan body carries no `## Design Source`
section — consistent with every prior phase of this track's own
notes.

*Generated: 2026-07-27*
*Approved: 2026-07-27*
*Implemented: 2026-07-27*
*Status: IMPLEMENTED*
