# Feature: Evidence contract + rungs + R-DM7 (Phase 4 of figma-quota-resilience)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions (evidence-bundle write contract); cross-cutting patterns (rubric-count encoding across 24 sites in one reviewer file); impact on reusable services (the /relay-design-map command and its design-map-writer/design-map-reviewer pair)
- Decisions found:
  - [2026-07-22] MCP-access spike — Figma MCP calls stay in the interactive command's own session. This phase touches only the command's evidence-write prose (Phase B step 7); it adds no new MCP call and does not widen either dispatched agent's tool allowlist.
  - [2026-07-23] Component map is a durable `docs/design/` artifact; its supporting evidence bundle is a per-run `PRPs/reports/design-map/evidence/` artifact. Binds where the new checkpoint may live: outside `evidence_dir`, still under `PRPs/`.
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`.
  - [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array, not a hardcoded literal count — the direct precedent for this phase's own R-DM7 addition and its DERIVED-count test strategy.
- Applicable anti-patterns:
  - "Querying the Figma MCP from a dispatched writer/reviewer agent" — `design-map-writer`/`design-map-reviewer` gain no new tool and no new MCP access; every new instruction in this phase is satisfied by files already on disk.
  - "Writing pipeline artifacts under `.claude/`" — the new checkpoint at `PRPs/reports/design-map/.state/` and the evidence bundle both stay under `PRPs/`.
  - "Weakening or deleting tests to make the auto-correction loop turn green" — the R-DM/R-DS rubric-count test rewrites this phase's edits force MUST re-derive from live headings, not relax a hardcoded literal, and MUST be authored by the test pair via its lifecycle ledger, never by an Implementer task.
- Applicable architectural rules:
  - `docs/context/architecture.md` — the evidence bundle is "the sole Figma-fact source either agent is permitted to read".
  - `docs/context/architecture.md` — `/relay-design-map` dispatches an MCP-free writer/reviewer pair; this phase does not change that shape.
  - `docs/context/architecture.md` PRP artifact paths table — evidence at `PRPs/reports/design-map/evidence/`, the durable map at `docs/design/` outside `PRPs/`.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-quota-resilience.prd.md` — Implementation Phases row 4:
  "Evidence contract + rungs + R-DM7" — Goal: Evidence is cumulative and
  honest; degradation is visible in the artifact. — Success signal: A
  partial run cannot overwrite a more complete bundle; a map with
  unenriched `CONFIRMED` rows fails `R-DM7`; the DERIVED test fails
  loudly when a rubric heading is added or removed.

## Summary

This phase makes `/relay-design-map`'s Figma evidence bundle cumulative
and honest across re-runs, and makes `docs/design/component-map.md`
tell the truth about how complete it is. Concretely: Phase B step 7
("Persist evidence") gains a checkpoint relocated outside `evidence_dir`
holding a cumulative Figma-call log; the evidence write becomes additive
(union, never replace) with a `last_seen_scan` generation id gating
retirement to only a scan that itself reports a complete inventory; the
single `truncated` flag is renamed to `inventory_truncated` (aligning
with terminology the file's own step 2 and the map template already
use) and split from `enrichment_truncated`, both now derived by scanning
what is actually on disk rather than trusted from the run's own belief
about itself, guarding three named degenerate cases. `design-map-writer`
gains a surgical (not wholesale) confidence-downgrade rule for the
`DEGRADED_NO_ENRICHMENT` rung and persists that rung into the map itself
(cloning `visual-verifier.md`'s degradation-ladder idiom).
`design-map-reviewer` gains a missing-evidence branch it currently lacks
and a new `R-DM7` rubric item that fails a map whose declared
completeness contradicts its own evidence, or whose `CONFIRMED` rows
rest on property data the bundle never enriched. All existing
corpus assertions this phase's edits knowingly break are named by
file:line and routed to the test pair — no task in this plan touches a
`*.test.mjs` file.

## User Story

As the relay operator running `/relay-design-map` against a real Figma
library across multiple sessions (interrupted by quota, budget, or
simply re-running with `--refresh`)
I want every evidence write to add to what is already known rather than
silently discard it, and the resulting component map to honestly
describe how complete its own enrichment is
So that an interrupted or partial run never retroactively invalidates an
already-APPROVED map, and a map claiming a row is `CONFIRMED` is never
lying about the enrichment data behind that claim.

## Problem Statement

Today's evidence writes (Phase B step 7 of `/relay-design-map`) are
non-additive — an interrupted or partial run's write can retroactively
erase a prior, more-complete bundle's calls and entries, as the
observed incident (`PRPs/reports/figma-rate-limit-relay.md`) shows,
invalidating an already-`APPROVED` component map. A single `truncated`
flag conflates two independent completeness dimensions — has the
library been fully enumerated, and has enrichment run for what was
enumerated — letting a map with 31 of 48 rows purely `INFERRED` (zero
enrichment) pass review while the flag reads `false`, because
`R-DM5` checks inventory completeness, never enrichment completeness.
Degradation state is visible to the human who ran the command but never
persisted into the map artifact itself, so a later reader of
`docs/design/component-map.md` cannot distinguish a genuinely complete
map from a lucky pass over incomplete evidence.

## Solution Statement

Make the evidence bundle additive and cumulative — merged, never
replaced — with a `last_seen_scan` generation id gating retirement to
only a scan that itself reports a complete (`inventory_truncated:
false`) enumeration. Relocate the run checkpoint outside `evidence_dir`
so it structurally cannot leak into either consuming agent's "read
every file under `evidence_dir`" instruction (no dotfile convention
required). Rename the single `truncated` flag to `inventory_truncated`
(matching what the command's own step 2 and the map template already
call it) and split it from `enrichment_truncated`, both now derived by
scanning what is actually on disk at write time, guarding three named
degenerate cases. Give `design-map-writer` a surgical
confidence-downgrade rule so enrichment-independent rows survive a
`DEGRADED_NO_ENRICHMENT` run, and have it persist that rung directly
into the map (cloning `visual-verifier.md:88-142`'s degradation-ladder
idiom: fail toward the safer rung, and make the rung visible in the
artifact, not only to the caller). Add `R-DM7` to `design-map-reviewer`
so a map's declared completeness is cross-checked against what the
evidence bundle actually shows.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (prose/prompt extension across existing command + agent + resource files — no new files created) |
| Complexity | High — 9 sequenced tasks across 4 files, 24 rubric-count edit sites in one file (plus 1 further site deliberately left unchanged), dense verbatim-preservation constraints against an existing test corpus |
| Systems Affected | `/relay-design-map` command (Phase B evidence persistence), `design-map-writer` agent, `design-map-reviewer` agent, `component-map-template.md` resource |
| Dependencies | Phase 1 (resource packaging — `component-map-template.md` now lives at `plugins/relay/resources/`); Phase 3 (quota preflight — Phase B's current 7-numbered-step shape and `seat`/`tier`/`metadata_call_estimate` fields this phase must not disturb) |
| Estimated Tasks | 9 |
| Source PRD line ref | `PRPs/prds/figma-quota-resilience.prd.md:222-226` (Phase 4 Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-design-map.md` | 341-364 | Phase B step 7 "Persist evidence" — the exact block Tasks 1-3 extend; contains the `candidates_prematched`/`metadata_calls_made` substrings pinned verbatim by the existing test corpus |
| P0 | `plugins/relay/commands/relay-design-map.md` | 152-170, 268-280 | Phase B's full 7-step structure and step 2's existing `inventory_truncated` naming (line 273-274) — confirms the rename target already exists elsewhere in the same file |
| P0 | `plugins/relay/agents/design-map-writer.md` | 125-196 | Step 1 (evidence read + missing-evidence branch), Step 2 (classification — lines 140, 142-145 are pinned verbatim by the test corpus), Step 4 (map write) — anchors for Tasks 4-6 |
| P0 | `plugins/relay/agents/design-map-reviewer.md` | 61-68, 116-186, 193-207, 226-262, 291-336, 352-362 | Hard Constraint 2, the R-DM1-R-DM6 rubric section, Step 1, the verdict branches, the jsonl format spec, and the anti-pattern bullets — every "six" site Task 9 must update in lockstep |
| P0 | `plugins/relay/resources/component-map-template.md` | 79-113, 143-146, 166-181 | The map body structure (single `inventory_truncated` marker line, field reference, Lifecycle section's own "six-item R-DM1-R-DM6" reference) — anchor for Task 7 |
| P1 | `plugins/relay/agents/visual-verifier.md` | 88, 121-142 | The degradation-ladder / rung-persistence idiom this phase clones: "fail toward the safer degraded rung, never toward silently reporting FULL" and "`status` on every entry matches `rung` ... verbatim ... makes the degradation visible in the artifact itself" |
| P1 | `scripts/validate/checks/figma-quota-resilience-phase2.test.mjs` | 152-263, 347-365 | Pins Phase B's exact 7-top-level-step count, the verbatim `candidates_prematched`/`metadata_calls_made` field definitions inside step 7, and `design-map-writer.md`'s Step 2 heuristic sentences (plus the hard "candidate set" phrase MUST-BE-ABSENT check) — every edit in this plan must survive these assertions unless explicitly routed to the test pair below |
| P1 | `scripts/validate/checks/figma-quota-resilience-phase3.test.mjs` | 250-284, 412-423 | Pins additional step-7 field-definition substrings and the literal `'7. **Persist evidence'` boundary string used to isolate step 6 — renumbering or reheading step 7 breaks this too |
| P1 | `scripts/validate/checks/figma-track-phase3.test.mjs` | 290-335 | Pins `R-DM1..R-DM6` and `**If all six items pass` — the exact strings Task 9's six→seven rewrite breaks; named here so the test-pair routing in `## Notes` cites real line numbers |
| P2 | `scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs` | 151-219 | The DERIVED rubric-count precedent (counts live `#### R-COH-*` headings via regex rather than a hardcoded literal) — background for why Task 9's `### R-DM7` heading must stay in the exact `### R-DM<n>` format; the actual DERIVED test is test-pair work, not an Implementer task in this plan |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/visual-verifier.md:88
4. **Never silently skip a degradation-ladder rung.** Every `provision.mjs`/`capture.mjs` outcome maps to exactly one of: proceed `FULL`, `DEGRADED_STATIC_ONLY`, or `DEGRADED_PROVISION_FAILED`. An unrecognized exit code from `provision.mjs` is treated as `DEGRADED_PROVISION_FAILED` — fail toward the safer degraded rung, never toward silently reporting `FULL`.
```
Copied by: Task 6 (rung computation in `design-map-writer.md` — "worse condition wins": `DEGRADED_PARTIAL_INVENTORY` beats `DEGRADED_NO_ENRICHMENT` beats `FULL`).

```
# SOURCE: plugins/relay/agents/visual-verifier.md:142
`status` on every entry matches `rung` from Step 1/2 verbatim. This is what makes the degradation visible in the artifact itself (AC-A4), not only in `/relay-implement`'s own `visual_outcome`.
```
Copied by: Task 6 (persisting the rung into `docs/design/component-map.md` itself, not only into the command's own return/summary).

```
# SOURCE: plugins/relay/agents/design-map-writer.md:128-134
2. `Read` every file under `evidence_dir` — the persisted Figma query
   results (library search results, node-scoped metadata, and, when
   present, the Code Connect map). Treat a missing or empty
   `evidence_dir` as zero evidence, not as an error to halt on: write
   a map whose component table is empty and whose `## UNMAPPED`
   section is empty, with `inventory_truncated: true` and a reason
   naming the missing evidence.
```
Copied by: Task 8 (`design-map-reviewer.md` Step 1's new missing-evidence branch mirrors this exact shape) and Task 4 (extends this same item with the present-but-partial case).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:341-364
7. **Persist evidence.** Write every raw result from steps 1–6 to
   `PRPs/reports/design-map/evidence/` (create the directory if
   absent) as one or more evidence files — at minimum a
   `library-search.json` (step 2 results plus the
   `max_library_search_calls` budget consumption and a
   `truncated: true|false` flag; `candidates_prematched`, the size of
   the step 3 candidate set; `metadata_calls_made`, the count of step
   5 `get_metadata` calls actually issued this run; ...
```
Copied by: Tasks 1-3 (the exact block extended; the `truncated: true|false` phrase is renamed to `inventory_truncated: true|false` in Task 3, and the `candidates_prematched`/`metadata_calls_made` sentences are preserved verbatim, unmoved).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:269-274
2. **Library search.** Call `search_design_system` against the Figma
   library file key(s) from `design_system_config`, enumerating the
   library's components. Budget: `max_library_search_calls = 40` —
   stop issuing further search calls once this budget is reached and
   record the scan as truncated (this feeds the map's
   `inventory_truncated` marker via the evidence bundle).
```
Copied by: Task 3 (`inventory_truncated`'s existing name at step 2 — the alignment target the step-7 flag rename in Task 3 matches).

```
# SOURCE: plugins/relay/agents/design-map-writer.md:163-166
4. When no code component match is found, add a row to
   `## UNMAPPED` naming the Figma component (name and key) and a
   reason (e.g., "no candidate found in clone", "multiple ambiguous
   candidates, none confidently primary").
```
Copied by: Task 5 (the existing item 4 this task's new item 5 follows — same numbered list, same numbering discipline, appended without touching items 1-4).

```
# SOURCE: plugins/relay/agents/design-map-reviewer.md:162-173
### R-DM5 — Honest scoping — truncation explicitly recorded

The map's `inventory_truncated` marker line accurately reflects
whether the evidence bundle itself notes a truncated Figma library
scan (e.g., a search-call budget reached, a library too large to
enumerate exhaustively). The map must not claim
`inventory_truncated: false` when the evidence indicates the scan was
incomplete.

**Fails when:** the evidence bundle shows a truncated/incomplete scan
but the map's `inventory_truncated` marker claims `false`, or the
marker line is absent entirely.
```
Copied by: Task 9 (the exact shape — heading, one prose paragraph, a `**Fails when:**` sentence — that the new `### R-DM7` heading mirrors).

```
# SOURCE: plugins/relay/resources/component-map-template.md:106,143-146
inventory_truncated: true | false — {reason when true; "full library scan completed" when false}
...
- **`inventory_truncated`** — boolean + reason, immediately before the
  trailing status block. `true` whenever the evidence bundle notes a
  truncated/incomplete Figma library scan (e.g. a search-call budget
  reached); `false` only when the scan is genuinely complete.
```
Copied by: Task 7 (split into two marker lines plus a `rung` marker line, and a second field-reference bullet for `enrichment_truncated` added alongside).

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/commands/relay-design-map.md` | UPDATE | Extend Phase B step 7 with checkpoint relocation + cumulative call log (Task 1), additive merge + `last_seen_scan` retirement (Task 2), and disk-derived split truncation flags with degenerate-case guards (Task 3) |
| `plugins/relay/agents/design-map-writer.md` | UPDATE | Step 1 propagates the evidence bundle's own truncation flags when partial (Task 4); Step 2 gains the surgical downgrade rule (Task 5); Step 4 persists the `rung` field (Task 6) |
| `plugins/relay/agents/design-map-reviewer.md` | UPDATE | Step 1 gains a missing-evidence branch (Task 8); new `R-DM7` rubric item and every six→seven count reference updated in lockstep (Task 9) |
| `plugins/relay/resources/component-map-template.md` | UPDATE | New `rung` field; split `inventory_truncated`/`enrichment_truncated` marker lines; Lifecycle section's six-item reference updated to seven (Task 7) |

## NOT Building (Scope Limits)

- **Resume semantics** (skipping already-completed work on a re-invocation, making `--refresh` cost only the delta) — Phase 5's deliverable. This phase creates the checkpoint's structural home and cumulative shape; consuming it to skip work is out of scope here.
- **The design-spec quota path** (`DEGRADED_NO_TOKENS`, the re-traversal consumption counter) — Phase 6's deliverable, a different command (`/relay-design-spec`) entirely.
- **Any new or edited `*.test.mjs` file.** Per this plan's test routing (see `## Notes`), all test-file work this phase's edits necessitate is routed to the test pair as `EXISTING_TEST_UPDATED` or `NEW_TEST_REQUIRED` — never an Implementer task in this plan.
- **Rewriting `design-spec-reviewer.md`'s own production prose.** Its R-DS1-R-DS7 rubric count does not change in this phase (still seven items); only the absence of a DERIVED test covering that count is a test-pair follow-up, not a production-file change here.
- **A `docs/decisions.md` rationale entry for `max_library_search_calls`/`max_metadata_calls`.** Recorded as a Could-item in the source PRD's MoSCoW table, not in this phase's Must scope.
- **Reopening `relay-design-map.md`'s Phase B step count.** Step 7 remains the seventh and last top-level numbered step; no task in this plan adds an eighth.

## Step-by-Step Tasks

### Task 1: Relocate the checkpoint outside `evidence_dir`; add a cumulative call log

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, immediately after the existing step 7 paragraph (ending `...they never call the Figma MCP themselves.`, line 364), append a new paragraph, still inside the same numbered item 7 (do not start a new top-level `N. **Bold**` line — Phase B must stay at exactly 7 top-level numbered steps): introduce a checkpoint at `PRPs/reports/design-map/.state/checkpoint.json` (create the `.state/` directory if absent), a path deliberately OUTSIDE `evidence_dir` — never reached by either agent's "Read every file under `evidence_dir`" instruction, satisfying the checkpoint-exclusion requirement (PRD AC-9) structurally via path placement rather than a dotfile naming convention. The checkpoint holds a cumulative `call_log`: an array recording every Figma MCP data call this project's `/relay-design-map` has ever issued across every run (tool name, UTC timestamp, outcome), appended to — never replaced — on every run, including a run that HALTs on `FAILED_FIGMA_QUOTA_EXHAUSTED` (capture the partial `call_log` before halting). On every step-7 write, project (copy) the checkpoint's cumulative `call_log` into `library-search.json`'s own header as `call_log`, so a reader of the evidence bundle sees the cumulative total without opening the checkpoint (this is what Success Metric 1's "Cumulative `call_log` in the evidence bundle header" measures).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:341-364` — the exact step-7 block this paragraph is appended to.
- **VALIDATE**: `grep -qF '.state/checkpoint.json' plugins/relay/commands/relay-design-map.md && grep -qF 'call_log' plugins/relay/commands/relay-design-map.md`
- **AC**: AC-A2 (PRD AC-9) — checkpoint placement outside `evidence_dir`; also contributes to AC-A1 (PRD AC-8) via the cumulative `call_log`.

### Task 2: Additive merge with `last_seen_scan` generation id; surgical retirement

- **ACTION**: Immediately after Task 1's new paragraph, append a further paragraph (still inside step 7): before writing, `Read` the EXISTING `library-search.json` and `metadata/<component-key>.json` files under `evidence_dir` when present (a prior run's bundle) and MERGE this run's newly-observed components/component-sets into them additively — union, never replace. Each merged entry (in `library-search.json`'s component/component-set list, and each `metadata/<component-key>.json` file) carries a `last_seen_scan` field set to this run's generation id — the checkpoint's own monotonically incrementing scan counter, incremented once per `/relay-design-map` invocation and persisted alongside `call_log`. An entry present in the prior bundle but not observed in this run's results is retired (removed from the merged bundle) only when THIS run's own `inventory_truncated` is `false` — a complete, non-budget-truncated library enumeration, so a component's absence genuinely means it left the Figma library. When this run's `inventory_truncated` is `true` (a partial scan), no entry is ever retired — partial scans merge additively and retire nothing (per the source PRD's Decisions Log "Retirement under additive merge" row).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:341-364` — same step-7 block; this paragraph documents the retirement rule the PRD's Architecture Notes name explicitly ("Retirement detection constrains the additive merge").
- **VALIDATE**: `grep -qi 'last_seen_scan' plugins/relay/commands/relay-design-map.md && grep -qi 'retired' plugins/relay/commands/relay-design-map.md`
- **AC**: AC-A1 (PRD AC-8) — additive merge and surgical, generation-gated retirement.

### Task 3: Split `inventory_truncated`/`enrichment_truncated`, disk-derived, guarding 3 degenerate cases

- **ACTION**: Still within step 7, rename the existing `truncated: true|false` flag phrase (line 346 of the pre-edit file) to `inventory_truncated: true|false` — aligning the evidence-bundle's field name with what the same file's own step 2 (line 273-274) and `component-map-template.md` already call it; this is a naming alignment, not new terminology. Append a further paragraph stating that both `inventory_truncated` and `enrichment_truncated` are derived by scanning what this write actually has on disk at write time — never trusted from an in-memory flag the run merely believes about itself: `inventory_truncated` is `true` iff step 2's library search stopped before enumerating the full library (cross-checked against the merged component/component-set count, not assumed); `enrichment_truncated` is `true` iff any pre-matched candidate lacks a corresponding `metadata/<component-key>.json` file on disk after this write (counted by scanning the `metadata/` directory's actual file count against the step 3 candidate set size — never from a flag merely recording whether enrichment was attempted). Guard three degenerate cases explicitly, in prose: (a) a run that fails before contributing any new evidence must leave the PRIOR bundle's `inventory_truncated`/`enrichment_truncated` values untouched rather than deriving a false `inventory_truncated: false` from an empty diff; (b) an empty component-set list (a library genuinely containing zero component sets) must not derive `enrichment_truncated: false` merely because there was vacuously nothing to enrich — when the candidate set is empty, `enrichment_truncated` reports whether enrichment was even reachable this run, never a silent "complete"; (c) `enrichment_truncated` is always recomputed from the actual `metadata/*.json` file count on disk, never from a field recording only the run's own intent to enrich, so the flag can never diverge from what the evidence bundle actually shows.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:341-364` (the flag being renamed) and `# SOURCE: plugins/relay/commands/relay-design-map.md:269-274` (`inventory_truncated`'s existing name at step 2, the alignment target).
- **VALIDATE**: `grep -qF 'inventory_truncated: true|false' plugins/relay/commands/relay-design-map.md && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'derived[[:space:]]+by[[:space:]]+scanning'`. Note: the phrase "derived by scanning" itself lands across a manual line wrap in the written prose (the word "derived" ends one line, "by scanning" begins the next) — same defect family as the Level 2 `candidates_prematched`/`metadata_calls_made` checks; this line already uses the collapse technique rather than a bare `grep -qF`.
- **AC**: AC-A3 (PRD AC-10) — disk-derived, degenerate-case-guarded completeness flags.

### Task 4: `design-map-writer.md` Step 1 propagates the bundle's own truncation flags when partial

- **ACTION**: In `plugins/relay/agents/design-map-writer.md`, extend Step 1 item 2 (lines 128-134 — the existing missing/empty-`evidence_dir` branch) with a new sentence covering the present-but-partial case: when `evidence_dir` is present but partial — `library-search.json` exists and reports its own `inventory_truncated`/`enrichment_truncated` flags — propagate those flags verbatim into the map you write rather than re-deriving them independently; the writer has no basis to compute completeness more accurately than the command that scanned the actual Figma library. State explicitly that the checkpoint at `PRPs/reports/design-map/.state/` is never part of this read — it lives outside `evidence_dir` by design, so this instruction structurally never reaches it (mirrors PRD AC-9). Do not touch item 1 or item 3 of Step 1, and do not touch Hard Constraint 1 (lines 45-57), which a separate, unrelated test pins verbatim.
- **MIRROR**: `# SOURCE: plugins/relay/agents/design-map-writer.md:128-134` — the exact item being extended.
- **VALIDATE**: `grep -qi 'propagate' plugins/relay/agents/design-map-writer.md && grep -qF '.state/' plugins/relay/agents/design-map-writer.md`
- **AC**: AC-A2 (PRD AC-9) — explicit checkpoint-exclusion statement; also AC-A3 (PRD AC-10) — propagates the disk-derived flags Task 3 computes, since the writer has no independent basis to recompute them.

### Task 5: Surgical downgrade rule under `DEGRADED_NO_ENRICHMENT`

- **ACTION**: In `plugins/relay/agents/design-map-writer.md` Step 2 ("Match every Figma component to a real code component"), append a NEW numbered item 5 after the existing item 4 (lines 163-166 — "route to `## UNMAPPED`"). Do NOT touch items 1-4, especially item 1's two sentences (lines 140, 142-145), which the test corpus pins verbatim, and do NOT introduce the phrase "candidate set" anywhere in this file (a corpus test asserts its absence). New item 5 text: "**Surgical downgrade under `DEGRADED_NO_ENRICHMENT`.** When this run's rung (Step 4) is `DEGRADED_NO_ENRICHMENT` (`enrichment_truncated: true` — no `get_metadata` data available for the component being classified), a row may remain `CONFIRMED` ONLY when its `Props/variant mapping` relies exclusively on variant axes recoverable from the Figma component's own name (a `Prop=Value` naming scheme parseable without node enrichment); a row whose classification depends on any non-variant property (booleans, `TEXT`, `INSTANCE_SWAP`, or any property not derivable from the component name alone) MUST be downgraded to `INFERRED` when unenriched. A row that already carries a human-populated `verified_at` is NEVER downgraded by this rule — flag it for re-verification (a note in the row) instead of silently overriding a human's prior judgment."
- **MIRROR**: `# SOURCE: plugins/relay/agents/design-map-writer.md:163-166` — the existing item 4 this new item 5 follows, same list, same numbering discipline.
- **VALIDATE**: `grep -qF 'Surgical downgrade under' plugins/relay/agents/design-map-writer.md && ! grep -q 'candidate set' plugins/relay/agents/design-map-writer.md`
- **AC**: AC-A4 (PRD AC-11) — surgical (not wholesale) confidence downgrade under `DEGRADED_NO_ENRICHMENT`.

### Task 6: Persist the `rung` field when writing the map

- **ACTION**: In `plugins/relay/agents/design-map-writer.md` Step 4 ("Write the map", lines 180-196), extend the sentence listing the map's required elements ("...`## UNMAPPED`, the `inventory_truncated` marker line, and the trailing:") to also require the `enrichment_truncated` marker line and a `rung` marker line. Define the rung computation, mirroring `visual-verifier.md:88`'s "fail toward the safer degraded rung" idiom (worse condition wins): `rung = "DEGRADED_PARTIAL_INVENTORY"` when `inventory_truncated: true`; else `rung = "DEGRADED_NO_ENRICHMENT"` when `enrichment_truncated: true`; else `rung = "FULL"`. State explicitly (mirroring `visual-verifier.md:142`) that this `rung` value is written into the map itself, not only surfaced in the writer's handoff summary — making degradation visible in the artifact, not only to the caller.
- **MIRROR**: `# SOURCE: plugins/relay/agents/visual-verifier.md:88` and `# SOURCE: plugins/relay/agents/visual-verifier.md:142` — the rung-computation and rung-persistence idioms cloned here.
- **VALIDATE**: `grep -qF 'rung' plugins/relay/agents/design-map-writer.md && grep -qF 'DEGRADED_PARTIAL_INVENTORY' plugins/relay/agents/design-map-writer.md`
- **AC**: Infrastructure — no dedicated PRD AC of its own (the source PRD's Acceptance Criteria list does not name rung-persistence as a standalone criterion); required precondition for AC-A5 (PRD AC-12), since `R-DM7` cannot evaluate a map that never writes `rung`/`enrichment_truncated` in the first place.

### Task 7: `component-map-template.md` — new `rung` field; split truncation markers; Lifecycle update

- **ACTION**: In `plugins/relay/resources/component-map-template.md`, replace the single marker line at line 106 (`inventory_truncated: true | false — {reason when true; "full library scan completed" when false}`) with three lines: the existing `inventory_truncated` marker (unchanged wording), a new `enrichment_truncated: true | false — {reason when true; "enrichment complete for all pre-matched candidates" when false}` marker, and a new `rung: FULL | DEGRADED_PARTIAL_INVENTORY | DEGRADED_NO_ENRICHMENT` marker — all three immediately before the trailing status block, matching the existing marker's placement convention. Add a matching `enrichment_truncated` bullet and a `rung` bullet to the "Column and field reference" section (after the existing `inventory_truncated` bullet, lines 143-146), describing the same disk-derivation and worse-condition-wins computation Tasks 3 and 6 define. Update the Lifecycle section's own reference (lines 177-181, "validates the DRAFT map against the six-item `R-DM1`–`R-DM6` rubric...") to "seven-item `R-DM1`–`R-DM7` rubric", adding "dishonest completeness" to the parenthetical list of rubric concerns already named there.
- **MIRROR**: `# SOURCE: plugins/relay/resources/component-map-template.md:106,143-146` — the exact marker line and field-reference bullet being split/extended.
- **VALIDATE**: `grep -qF 'rung' plugins/relay/resources/component-map-template.md && grep -qF 'enrichment_truncated' plugins/relay/resources/component-map-template.md`
- **AC**: Infrastructure — no dedicated PRD AC of its own; defines the field shapes AC-A3 (PRD AC-10) and AC-A5 (PRD AC-12) depend on being documented in the canonical template both agents reference.

### Task 8: `design-map-reviewer.md` Step 1 gains a missing-evidence branch

- **ACTION**: In `plugins/relay/agents/design-map-reviewer.md` Step 1 ("Ground yourself", lines 193-207), extend item 2 ("`Read` every file under `evidence_dir`.", line 204) with the same missing/empty-evidence handling `design-map-writer.md`'s own Step 1 item 2 already has: treat a missing or empty `evidence_dir` the same way the writer does — zero evidence is not a reviewer error; `R-DM2` and `R-DM5` (and the new `R-DM7`, Task 9) are evaluated against whatever evidence is actually present, honestly reflecting an empty bundle rather than halting the review. State explicitly that the checkpoint at `PRPs/reports/design-map/.state/` is never part of this read — it lives outside `evidence_dir` by design. Do not touch item 1 (the `already_approved` precondition guard) or item 3.
- **MIRROR**: `# SOURCE: plugins/relay/agents/design-map-writer.md:128-134` — the exact missing-evidence branch shape this task mirrors into the reviewer.
- **VALIDATE**: `grep -qF 'not a reviewer error' plugins/relay/agents/design-map-reviewer.md`
- **AC**: AC-A2 (PRD AC-9) — reinforces the checkpoint-exclusion statement in the reviewer; also a precondition for AC-A5 (PRD AC-12), since `R-DM7` must be evaluated honestly even against missing/partial evidence.

### Task 9: Add `R-DM7`; update every six→seven reference in lockstep

- **ACTION**: In `plugins/relay/agents/design-map-reviewer.md`, add a new `### R-DM7` heading immediately after the existing `### R-DM6` section (after line 186), in the exact same shape as the existing five items (one prose paragraph, one `**Fails when:**` sentence — mirror `R-DM5`'s shape at lines 162-173): "### R-DM7 — Declared completeness is honest; no `CONFIRMED` row rests on unenriched data — The map's `enrichment_truncated` marker accurately reflects the evidence bundle's actual `metadata/` coverage (cross-check against `evidence_dir`, mirroring `R-DM5`'s `inventory_truncated` check), AND no row classified `CONFIRMED` depends — per its `Props/variant mapping` cell — on a non-variant property (boolean, `TEXT`, `INSTANCE_SWAP`) that the evidence bundle's `metadata/` directory does not actually enrich for that component. **Fails when:** the map declares `enrichment_truncated: false` while the evidence bundle shows incomplete `metadata/` coverage, OR any `CONFIRMED` row's classification depends on unenriched non-variant property data."

  Then, in the SAME task (these must land together or the file is internally self-contradictory), update every one of the following 24 verified edit sites — a complete, line-by-line inventory, cross-checked two independent ways against the unmodified file: every line containing `R-DM6` (15 lines) and every line containing the word `six` (12 lines; lines 3 and 358 appear in both sets, so 15 + 12 − 2 = 25 unique lines total). Of those 25, **24 require an edit**; line 175 (row 25) is the `### R-DM6` heading itself and requires **no edit** — it stays exactly as-is, and the new `### R-DM7` heading (above) is inserted immediately after it, so the heading count goes from 6 to 7 without renaming R-DM6:

  | line | current shape | required change |
  |---|---|---|
  | 3 | frontmatter `description`: "six-item rubric (R-DM1-R-DM6, no short-circuit)" | "seven-item rubric (R-DM1-R-DM7, no short-circuit)" |
  | 16 | "against a six-item rubric (`R-DM1`" (sentence wraps to line 17) | "against a seven-item rubric (`R-DM1`" |
  | 17 | "through `R-DM6`), append a verdict object to" (wrap-continuation of line 16 — the site both prior regexes missed) | "through `R-DM7`), append a verdict object to" |
  | 37 | "every `R-DM1`..`R-DM6`" | "every `R-DM1`..`R-DM7`" |
  | 61 | "No short-circuit — run all R-DM1..R-DM6 every run." | "...R-DM1..R-DM7 every run." |
  | 65 | "MUST contain exactly six objects with ids `R-DM1`, `R-DM2`," (list wraps to line 66) | "exactly seven objects with ids `R-DM1`, `R-DM2`," |
  | 66 | "`R-DM3`, `R-DM4`, `R-DM5`, `R-DM6` — one of each, no duplicates —" (wrap-continuation of line 65's id list — a site both prior regexes missed) | "`R-DM3`, `R-DM4`, `R-DM5`, `R-DM6`, `R-DM7` — one of each, no duplicates —" |
  | 87 | "a full R-DM1..R-DM6 pass." | "a full R-DM1..R-DM7 pass." |
  | 116 | heading `## The R-DM1..R-DM6 Rubric` | `## The R-DM1..R-DM7 Rubric` |
  | 118 | "Evaluate all six items on every run." | "Evaluate all seven items on every run." |
  | 175 | heading `### R-DM6 — \`## Conventions\` non-empty when warranted` | **NO EDIT** — stays verbatim; `### R-DM7` is inserted immediately after this section |
  | 208 | heading `### Step 2 — Run the rubric (R-DM1..R-DM6)` | `### Step 2 — Run the rubric (R-DM1..R-DM7)` |
  | 210 | "Walk `R-DM1` through `R-DM6` in document order." (the ids are 11 characters apart — a site both prior regexes missed, the second one because its `{0,6}` proximity window was too narrow) | "Walk `R-DM1` through `R-DM7` in document order." |
  | 220 | "Accumulate all six results into the `rubric` array." | "...all seven results..." |
  | 226 | "1. Append a `CHANGES_REQUESTED` jsonl entry (all R-DM1..R-DM6" | "...all R-DM1..R-DM7" |
  | 241 | "**If all six items pass (APPROVED path):**" (pinned by `figma-track-phase3.test.mjs:331` as a `sliceBetween` needle — routed to the test pair, see `## Notes`) | "**If all seven items pass (APPROVED path):**" |
  | 249 | "1. Re-run the R-DM1..R-DM6 rubric fresh (Step 2) one final time" | "...R-DM1..R-DM7 rubric..." |
  | 259 | "Entry shape: `verdict: \"APPROVED\"`, all six items with" | "...all seven items with" |
  | 323 | jsonl worked example row `{ "id": "R-DM6", "passed": true }` — the last of six rows (a site both prior regexes missed entirely, since it is JSON syntax, not prose) | add a seventh row immediately after: `{ "id": "R-DM7", "passed": true }` |
  | 333 | "The `rubric` array MUST contain exactly six objects with `id` values" (list wraps to line 334) | "...exactly seven objects with `id` values" |
  | 334 | "`R-DM1`, `R-DM2`, `R-DM3`, `R-DM4`, `R-DM5`, `R-DM6` — one of each, no" (wrap-continuation of line 333's id list — a site both prior regexes missed) | "`R-DM1`, `R-DM2`, `R-DM3`, `R-DM4`, `R-DM5`, `R-DM6`, `R-DM7` — one of each, no" |
  | 335 | "duplicates. No short-circuit: all six are always present and" | "...all seven are always present..." |
  | 353 | "inside the APPROVED branch (all six items `passed: true`). Even" | "...(all seven items `passed: true`)..." |
  | 358 | "All six `R-DM1`..`R-DM6` items" | "All seven `R-DM1`..`R-DM7` items" |
  | 361 | "earlier failures. A `rubric` array with fewer than six objects is a" | "...fewer than seven objects..." |

  Five of the rows above (17, 66, 210, 323, 334) were genuinely missed by this task's own completeness check across two prior review rounds — two different kinds of miss: lines 17, 66, 210, 334 are prose that **wraps across a line break** (the id or the word "six" sits on one physical line, its counterpart on the next); line 323 is **JSON syntax**, not prose, so a prose-count regex never looked at it there at all. Line 175 is a different kind of gap: no regex ever incorrectly flagged it (it correctly contains neither "six" nor an adjacent `R-DM1`), but it was simply **absent from this task's own site table** in prior drafts, leaving it ambiguous whether it had been considered at all — it is included above explicitly to close that ambiguity, not because any check missed it. This is why the `VALIDATE` line below no longer relies on a hand-tuned prose regex at all (see the rationale there).

- **MIRROR**: `# SOURCE: plugins/relay/agents/design-map-reviewer.md:162-173` — the `R-DM5` shape the new `R-DM7` section mirrors.
- **VALIDATE**: `[ "$(grep -c '^### R-DM[0-9]' plugins/relay/agents/design-map-reviewer.md)" = "7" ] && [ "$(grep -c '"id": "R-DM' plugins/relay/agents/design-map-reviewer.md)" = "7" ] && ! tr '\n' ' ' < plugins/relay/agents/design-map-reviewer.md | grep -qiE 'six-item|all six|six objects|exactly six'`

  This replaces prose-pattern matching entirely with three **structural** checks, since three consecutive review rounds each shipped a regex that looked complete and missed real sites — the correct conclusion is that no single hand-tuned pattern can reliably prove "no stray six-language remains" in prose, not that a fourth pattern will finally be the right one:
  1. **Heading count** — `grep -c '^### R-DM[0-9]'` counts `### R-DM<n>` headings anchored at line-start; this can never miss a line-wrap, because a heading is never a line-wrap continuation of anything. Manually verified against the current file (`Read` at lines 122, 132, 143, 154, 162, 175 — six `### R-DM<n>` headings, one per existing rubric item): **current count is 6**. After this task adds `### R-DM7`: **7**.
  2. **JSONL example row count** — `grep -c '"id": "R-DM'` counts the quoted-JSON-key form, which appears nowhere in this file except inside the fenced worked example (the file's other id-mentions use the unquoted form `` `{id: "R-DM<i>", ...}` `` at lines 214-215, which does not match `"id":`). Manually verified against the current file (lines 318-323 in the fenced block): **current count is 6**. After this task adds the seventh row: **7**.
  3. **Residual "six"-word forms, newline-collapsed** — `tr '\n' ' '` joins the whole file into one line before grepping, so a phrase split across a line-wrap (like lines 16-17 or 65-66, though in this specific case the word "six" itself is never wrap-split — only the `R-DM6` half of those sentences is) cannot hide from the pattern. Manually verified against the current file: all 12 lines containing "six" (3, 16, 65, 118, 220, 241, 259, 333, 335, 353, 358, 361) match at least one of `six-item` / `all six` / `six objects` / `exactly six`. **Current: 12 matches found → check reports FAIL.** After this task's edits replace every one with "seven": **0 matches → check reports PASS.**

  On the CURRENT unmodified tree this command FAILS at the very first condition (`headings` = 6, not 7). After this task's 24 edits land, all three conditions hold and it PASSES.
- **AC**: AC-A5 (PRD AC-12) and AC-A6 (PRD AC-13) — the `R-DM7` rubric item itself, and the lockstep six→seven rewrite that keeps the file internally consistent.

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```bash
set -euo pipefail
for f in plugins/relay/commands/relay-design-map.md plugins/relay/agents/design-map-writer.md plugins/relay/agents/design-map-reviewer.md; do
  head -1 "$f" | grep -q '^---$' || { echo "FAIL: $f missing opening --- frontmatter delimiter"; exit 1; }
done
grep -q '^# Component Map Template$' plugins/relay/resources/component-map-template.md || { echo "FAIL: component-map-template.md missing its title heading"; exit 1; }
echo "PASS: all four edited files retain valid structural openings"
```

Before this phase's edits: PASS (unedited files already have these openings). After: still PASS (no task removes frontmatter or the template's title heading).

**Level 2 CONTENT_INVARIANTS**

```bash
set -euo pipefail

grep -qF '.state/checkpoint.json' plugins/relay/commands/relay-design-map.md || { echo "FAIL: checkpoint path missing from relay-design-map.md"; exit 1; }
grep -qF 'call_log' plugins/relay/commands/relay-design-map.md || { echo "FAIL: call_log missing from relay-design-map.md"; exit 1; }
grep -qi 'last_seen_scan' plugins/relay/commands/relay-design-map.md || { echo "FAIL: last_seen_scan missing from relay-design-map.md"; exit 1; }
grep -qF 'inventory_truncated: true|false' plugins/relay/commands/relay-design-map.md || { echo "FAIL: inventory_truncated rename missing from relay-design-map.md step 7 (note: the bare word already appears at step 2's pre-existing prose, so this check requires the full renamed-field pattern to discriminate before/after)"; exit 1; }

grep -qF 'DEGRADED_NO_ENRICHMENT' plugins/relay/agents/design-map-writer.md || { echo "FAIL: surgical downgrade rung missing from design-map-writer.md"; exit 1; }
grep -qF 'rung' plugins/relay/agents/design-map-writer.md || { echo "FAIL: rung field missing from design-map-writer.md"; exit 1; }

grep -qF '### R-DM7' plugins/relay/agents/design-map-reviewer.md || { echo "FAIL: R-DM7 heading missing from design-map-reviewer.md"; exit 1; }

grep -qF 'rung' plugins/relay/resources/component-map-template.md || { echo "FAIL: rung field missing from component-map-template.md"; exit 1; }
grep -qF 'enrichment_truncated' plugins/relay/resources/component-map-template.md || { echo "FAIL: enrichment_truncated missing from component-map-template.md"; exit 1; }

# Pinned substrings from the existing corpus MUST survive verbatim.
# The candidates_prematched/metadata_calls_made definitions span a manual
# line wrap in the source file (pre-existing at base commit 0302e03, not a
# regression — Task 3 only renamed the adjacent truncated/step-2 tokens,
# never touched the wrap point), so a single-line -F match can never see
# them. Collapse the file first (tr), then match with -E and [[:space:]]+
# in place of literal spaces so the wrap (and any future rewrap) cannot
# hide the match — the same technique the R-DM7 structural gate already
# uses successfully below.
tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE '`candidates_prematched`,[[:space:]]+the[[:space:]]+size[[:space:]]+of[[:space:]]+the[[:space:]]+step[[:space:]]+3[[:space:]]+candidate[[:space:]]+set' || { echo "FAIL: pinned candidates_prematched definition regressed"; exit 1; }
tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE '`metadata_calls_made`,[[:space:]]+the[[:space:]]+count[[:space:]]+of[[:space:]]+step[[:space:]]+5[[:space:]]+`get_metadata`[[:space:]]+calls[[:space:]]+actually[[:space:]]+issued[[:space:]]+this[[:space:]]+run' || { echo "FAIL: pinned metadata_calls_made definition regressed"; exit 1; }
grep -qF 'For each Figma component present in the evidence bundle:' plugins/relay/agents/design-map-writer.md || { echo "FAIL: pinned Step 2 lead-in sentence regressed"; exit 1; }
if grep -q 'candidate set' plugins/relay/agents/design-map-writer.md; then
  echo "FAIL: forbidden phrase 'candidate set' introduced into design-map-writer.md"; exit 1
fi

# R-DM7 completeness gate — STRUCTURAL, not prose-regex-based. Three
# consecutive review rounds each shipped a prose regex that looked complete
# and missed real sites (line-wrapped ids at 17/66/210/334, a JSON-syntax
# row at 323); the fix is not a fourth pattern but a different instrument.
# This checks the exact same three thresholds as Task 9's own VALIDATE line
# above (heading count = 7, jsonl row count = 7, zero collapsed "six"-word
# matches) — logically identical, just written as an if-block here instead
# of Task 9's compact one-liner. The two MUST NOT diverge in what they
# check or in the pass/fail thresholds. See Task 9 for the full manual
# verification of each count against the unmodified tree.
DMR=plugins/relay/agents/design-map-reviewer.md
headings=$(grep -c '^### R-DM[0-9]' "$DMR")
if [ "$headings" -ne 7 ]; then
  echo "FAIL: expected 7 '### R-DM<n>' rubric headings in $DMR, found $headings"; exit 1
fi
rows=$(grep -c '"id": "R-DM' "$DMR")
if [ "$rows" -ne 7 ]; then
  echo "FAIL: expected 7 jsonl worked-example rows in $DMR, found $rows"; exit 1
fi
if tr '\n' ' ' < "$DMR" | grep -qiE 'six-item|all six|six objects|exactly six'; then
  echo "FAIL: stale six-item rubric language remains in $DMR (checked against the newline-collapsed file so a line-wrapped phrase cannot hide)"; exit 1
fi

# component-map-template.md's own Lifecycle-section reference is untouched
# by this round's defect — both "six-item" and "R-DM1...R-DM6" already sit
# on a single physical line there (verified: no line-wrap), so the existing
# proximity check is not blind in the way design-map-reviewer.md's was.
if grep -niE 'R-DM1.{0,5}R-DM6|six-item' plugins/relay/resources/component-map-template.md; then
  echo "FAIL: stale six-item R-DM rubric language remains in component-map-template.md"; exit 1
fi

echo "PASS: all new content invariants present and all pinned substrings survive unmodified"
```

This block bundles three different kinds of check, with different expected pre/post behavior — stated explicitly rather than as one blanket claim:

- **New-content checks** (`call_log`, `last_seen_scan`, `inventory_truncated: true|false`, `DEGRADED_NO_ENRICHMENT`, `rung`, `### R-DM7`, `enrichment_truncated` in the template): FAIL on the current unmodified tree (none of this phase's new fields exist yet) and PASS only after all 9 tasks land.
- **Pinned-substring-survival checks** (`candidates_prematched`, `metadata_calls_made`, the Step 2 lead-in sentence, the `candidate set` absence guard): PASS both before and after — before, because this is simply the current state of the untouched corpus; after, because Tasks 1-3 and 5 are designed not to disturb this exact text.
- **The R-DM7 structural gate and the template's "no stray six" check**: FAIL on the current unmodified tree — `design-map-reviewer.md` has 6 headings (not 7), 6 jsonl rows (not 7), and 12 lines of stale "six" language; `component-map-template.md` still carries its own "six-item `R-DM1`–`R-DM6`" Lifecycle-section reference — and PASS only once Task 9 (design-map-reviewer.md) and Task 7 (component-map-template.md) have both landed. This is the inverse of the pinned-substring checks above; conflating the two into a single "passes both before and after" claim was a defect an earlier review round of this same plan caught.

**Level 3 DRY-RUN END-TO-END**

```bash
set -euo pipefail
node -e '
const fs = require("fs");
const content = fs.readFileSync("plugins/relay/commands/relay-design-map.md", "utf8");
const start = content.indexOf("## Phase B — Query the Figma library");
const end = content.indexOf("## Phase C");
if (start === -1 || end === -1) { console.error("FAIL: Phase B/C boundary not found"); process.exit(1); }
const phaseB = content.slice(start, end);
const matches = [...phaseB.matchAll(/^\d+\.\s+\*\*(.+?)\*\*/gm)];
if (matches.length !== 7) {
  console.error("FAIL: expected exactly 7 top-level numbered steps in Phase B, found " + matches.length);
  process.exit(1);
}
if (!/persist evidence/i.test(matches[6][1])) {
  console.error("FAIL: step 7 label no longer contains persist evidence: " + matches[6][1]);
  process.exit(1);
}
console.log("PASS: Phase B retains exactly 7 top-level numbered steps, step 7 still names persist evidence");
'
```

Before this phase's edits: PASS (the unmodified file already has exactly 7 steps). After: PASS (Tasks 1-3 append prose inside step 7's own paragraph via indented continuation text, never introducing a new top-level `N. **Bold**` line). This is the regression guard for
`scripts/validate/checks/figma-quota-resilience-phase2.test.mjs:152-170`'s own step-count assertion, run here as a plan-stage DRY-RUN rather than via `node --test` — see `## Notes` for why this plan's Level 1-3 gates deliberately never invoke the declared `node:test` framework directly.

## Acceptance Criteria

- **AC-A1 (PRD AC-8):** Evidence writes are additive — the bundle is merged, never replaced, the call log is cumulative across runs, and no entry is retired unless the writing scan itself reports `inventory_truncated: false` (Tasks 1-2).
- **AC-A2 (PRD AC-9):** The checkpoint is outside the read surface — enforced by its path (`PRPs/reports/design-map/.state/`) being outside `evidence_dir`, never by a dotfile naming convention (Task 1; reinforced explicitly in Tasks 4 and 8).
- **AC-A3 (PRD AC-10):** `inventory_truncated`/`enrichment_truncated` are computed by scanning what is actually on disk, describing the artifact rather than the invoking run's intent, guarding the three named degenerate cases (Task 3).
- **AC-A4 (PRD AC-11):** Downgrade under `DEGRADED_NO_ENRICHMENT` is surgical, not wholesale — variant-name-derivable rows may remain `CONFIRMED`; non-variant-dependent rows downgrade to `INFERRED`; rows carrying a human `verified_at` are never downgraded, only flagged for re-verification (Task 5).
- **AC-A5 (PRD AC-12):** `R-DM7` fails a map whose declared `enrichment_truncated` contradicts the evidence bundle, or whose `CONFIRMED` row rests on unenriched non-variant property data (Task 9).
- **AC-A6 (PRD AC-13):** `design-map-reviewer.md`'s rubric headings remain in the clean `### R-DM<n>` format after `R-DM7` is added, and every count-carrying sentence across the file is updated in lockstep (no internal contradiction) — laying the structural precondition for the test pair's DERIVED rubric-count test; the actual DERIVED test authorship is routed to the test pair (`## Notes`), not delivered by an Implementer task in this plan.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Renaming the evidence bundle's generic `truncated` field to `inventory_truncated` breaks a corpus reference this plan's research did not surface | L | M | The rename aligns with terminology the same file's own step 2 (line 273-274) and `component-map-template.md` already use — it is not new terminology; Level 3 plus a corpus grep (named in `## Notes`) are the Implementer's final check before declaring the task done |
| Packing three substantial new behaviors (checkpoint, additive merge, split derivation) into Phase B's single numbered step 7 makes that step's prose dense | M | L | Tasks 1-3 are sequenced, each independently `VALIDATE`-checked, and each explicitly preserves the pinned `candidates_prematched`/`metadata_calls_made` substrings and the 7-top-level-step count (Level 3 DRY-RUN) |
| Adding `R-DM7` breaks `figma-track-phase3.test.mjs:322-333`'s hardcoded `R-DM1..R-DM6`/"all six items pass" assertions, and no R-DS-equivalent DERIVED test exists yet for AC-13 | H | M | Routed explicitly to the test pair as `EXISTING_TEST_UPDATED` (`figma-track-phase3.test.mjs:322-333`) and `NEW_TEST_REQUIRED` (an R-DM DERIVED count test replacing the hardcoded one, and a new R-DS DERIVED count test) — documented by file:line in `## Notes`, never an Implementer task per R-X strict |
| Task 5's surgical downgrade rule lands adjacent to two sentences (`design-map-writer.md:140,142-145`) pinned verbatim by `figma-quota-resilience-phase2.test.mjs:347-365`, including a hard "candidate set" MUST-BE-ABSENT check | M | H | Task 5 appends as a NEW numbered item 5 after existing items 1-4, never editing the pinned text; its own `VALIDATE` line asserts `candidate set` remains absent after the edit |
| Prose-pattern regexes for the "six→seven" residual-language check keep missing sites — three consecutive review rounds each shipped one that looked complete: round 1 missed backtick-wrapped ids (37, 358); round 2's fix still missed line-wrapped prose (17, 66, 210, 334) and a JSON-syntax row (323) | H (confirmed across three rounds of review) | M | Both checks (Task 9's own `VALIDATE` and the identical Level 2 gate) abandon prose-regex matching entirely in favor of three structural checks: `### R-DM<n>` heading count = 7, jsonl `"id": "R-DM<n>"` row count = 7, and a newline-collapsed residual "six"-word check (`tr '\n' ' '` first, so a line-wrap cannot hide a match) — re-derived from live document structure rather than a hand-tuned pattern, which is also what AC-13 itself asks for |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
when a test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored. This repo declares `test_frameworks: ["node:test"]`, so the
pair is active in test-after mode.

**R-X strict / test routing — no task in this plan touches a `*.test.mjs`
file.** Per `docs/anti-patterns.md`'s "Weakening or deleting tests" entry
and the R-X strict rule, every test-file change this phase's edits
necessitate is routed through the test pair's lifecycle ledger, never
authored by an Implementer task. Confirmed corpus impact, by file:line:

- `scripts/validate/checks/figma-track-phase3.test.mjs:322-333` — **EXISTING_TEST_UPDATED.**
  Two assertions in this file break the moment Task 9 lands: the regex
  `/This flip happens ONLY inside the APPROVED branch\*\* — gated by a
  full R-DM1\.\.R-DM6 pass\./` (line ~328, must become `R-DM1..R-DM7`),
  and the slice boundary string `'**If all six items pass'` (line 331,
  must become `'**If all seven items pass'`). Per AC-13 and the source
  PRD's Decisions Log ("Rewrite `R-DM`/`R-DS` count assertions to
  re-derive from live headings"), the test pair should convert these
  into a DERIVED count assertion (counting live `### R-DM<n>` headings
  via regex, mirroring `plan-reviewer-rubric-arithmetic-derived.test.mjs:166-219`'s
  technique) rather than simply bumping the hardcoded literal from six
  to seven — otherwise `R-DM8` re-incurs the exact same debt.
- **NEW_TEST_REQUIRED** — an R-DS-equivalent DERIVED rubric-count test.
  This plan's own research confirmed (honest negative, not inferred) that
  no existing test under `scripts/validate/checks/*.test.mjs` hardcodes
  `design-spec-reviewer.md`'s "seven objects"/`R-DS1`-`R-DS7` count as a
  literal — `figma-visual-first-track-phase1.test.mjs:495-506` only
  asserts a prose sentence in `design-spec-template.md` that NAMES `R-DS7`
  by id, not a count assertion against `design-spec-reviewer.md` itself.
  Per AC-13's "R-DM (or R-DS)" phrasing and the Decisions Log, the test
  pair should author a DERIVED count test for `design-spec-reviewer.md`
  even though this phase does not touch its production content — R-DS's
  count does not change here, but AC-13's re-derivation requirement is
  itself an unmet gap the source PRD explicitly names.
- **NEW_TEST_REQUIRED** — content-level coverage for `design-map-writer.md`
  Step 1/Step 4 and `component-map-template.md`'s marker-line shape. This
  plan's own research confirmed neither currently has any test asserting
  specific prose content (only the template's file existence/location is
  tested, per `figma-quota-resilience-phase1.test.mjs:63-118`) — the new
  `rung`/`enrichment_truncated`/checkpoint-propagation behavior this phase
  adds has no existing anchor to update and needs fresh test-pair coverage.
- **Before finalizing**, the Implementer MUST additionally grep the full
  corpus (`scripts/validate/checks/*.test.mjs`) for any reference to
  `design-map-writer.md`, `design-map-reviewer.md`,
  `component-map-template.md`, or `relay-design-map.md` that this plan's
  own research did not surface, and add it to the test-pair ledger above
  by file:line — this list is not asserted to be exhaustive, only the
  confirmed subset this plan's grounding found.

**Why Level 1-3 above never invoke `node --test` directly.** A test
framework (`node:test`) IS declared in `docs/context/methodology.md`, but
every edit in this plan is a prose/prompt change to a markdown agent or
command file, and — as documented immediately above — this plan's tasks
deliberately author zero `*.test.mjs` changes (R-X strict). Running
`npm run validate`'s full corpus as a plan-stage gate would show a known,
already-catalogued set of failures (the `figma-track-phase3.test.mjs`
assertions named above) that only the test pair's follow-up work resolves
— gating this plan's own Level 3 on that corpus would conflate "the
Implementer's 9 tasks are done" with "the test pair's follow-up has
landed," two different pipeline stages. This plan's Level 1-3 gates
therefore check only the content invariants and structural properties
(step count, pinned-substring survival) the Implementer's own 9 tasks are
responsible for. This documented deferral, combined with the fact that no
task touches a test file, is the condition-based
`R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption
(`plugins/relay/agents/plan-reviewer.md:387-405`).

**Grounding-dependent field-name choice.** `call_log`, `last_seen_scan`,
and the exact rung names (`FULL`/`DEGRADED_PARTIAL_INVENTORY`/
`DEGRADED_NO_ENRICHMENT`) are drawn directly from the source PRD's own
Success Metrics table, Architecture Notes, and Decisions Log rather than
invented — `call_log` and `last_seen_scan` are named verbatim in the PRD
text; `DEGRADED_PARTIAL_INVENTORY`/`DEGRADED_NO_ENRICHMENT` are named
verbatim in the PRD's Architecture Notes ("named rungs without a domain
prefix... `DEGRADED_NO_TOKENS`" — the latter is Phase 6 scope, correctly
excluded here).

**Scope boundary confirmed against Phases 5 and 6.** This plan creates
the checkpoint's cumulative shape and the merge/retirement logic that
consumes it, but does not add any "skip already-completed work" resume
logic (Phase 5), and does not touch `design-spec-writer.md`,
`design-spec-reviewer.md`, or any `DEGRADED_NO_TOKENS` rung (Phase 6).

---

*Generated: 2026-08-04*
*Approved: 2026-08-04*
*Implemented: 2026-08-04*
*Status: IMPLEMENTED*
