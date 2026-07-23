# Feature: Plan integration (Phase 5 of figma-implementation-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: surgical edits to 7 EXISTING, live, shared pipeline files used by every relay feature (not just Figma ones); new agent file; cross-cutting behavioral change gated on figma_track; extends the non-heuristic-declaration principle already established for tdd/docs_sync
- Decisions found:
  - [2026-05-14] phase_type annotation — DIRECT precedent for a Metadata-field addition + reviewer-side structural check, with a deliberate divergence recorded below (no self-healing inference for design_source, unlike phase_type)
  - [2026-04-19] TDD activation is opt-in by explicit declaration only — the general non-heuristic principle design_source extends
  - [2026-04-19] Methodology declaration lives in docs/context/methodology.md — figma_track (Phase 1 of this feature) is the gate this phase's every new instruction is conditioned on
  - [2026-04-25] Plan filenames carry the source PRD phase number and slug — unaffected by this phase, cited only because plan-reviewer R8c's filename-parse logic is adjacent to code this phase touches
- Applicable anti-patterns:
  - Activating any pipeline track by heuristic — design_source is NEVER inferred by plan-writer or plan-reviewer from plan/task content; it is copied verbatim from an explicit PRD-time declaration or an explicit CLI flag, or the run HALTs
  - Injecting plugin defaults into a target project's decisions.md — not applicable here (this repo IS relay's own source), but the principle informs keeping design_source project-agnostic in the agent files
- Applicable architectural rules:
  - "Nothing changes when figma_track is off" is THE governing invariant for every edit in this phase — every new instruction block in every one of the 7 edited files sits behind an explicit figma_track/design_source presence check that falls through to today's unchanged behavior
  - Writer/reviewer split — plan-writer copies the declaration, plan-reviewer enforces its presence structurally, never the reverse
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-implementation-track.prd.md` — Implementation Phases row 5:
  "Plan integration" — Goal: Make every plan/PRD phase declare its Figma relationship explicitly and non-heuristically. — Success
  signal: A plan generated from an APPROVED Design Spec carries a correct `## Design Source` section and passes plan-review; a plan with no Figma involvement carries `design_source: none` and is unaffected otherwise.

## Summary

This phase wires the Phase 3/4 artifacts (component map, Design Spec) into relay's core planning pipeline, without ever changing behavior for a project that hasn't opted in. It adds a new `design_source: figma | none` field to every plan's `## Metadata` table, mandatory whenever `figma_track: true`, and — critically, per an explicit prior product decision in this same feature's conversation history — NEVER inferred by plan-writer or self-healed by plan-reviewer the way `phase_type` is; its absence under `figma_track: true` is a structural failure, not an inference opportunity. The declaration is sourced non-heuristically: in PRD mode, copied verbatim from a per-phase declaration the user gave during the PRD's own interactive authoring (this phase adds that Q&A step to `prd-writer.md`); in description mode, derived deterministically from an explicit `--design-spec <path>` CLI flag (added to `relay-plan.md`) or its absence. A new `research-design` grounding subagent joins `plan-writer`'s existing parallel research dispatch (never breaking the two-subagent case when no Design Spec exists) to verify component-map freshness for any cited `CM-<n>` ids.

## User Story

As a developer running the existing `/relay-prd` → `/relay-plan` flow on a project with `figma_track: true`, I want every plan and every PRD phase to state plainly whether it implements a Figma layout, so that nothing can silently skip the reuse/fidelity checks Phases 4 and 6 depend on, and so that a project with the track off sees zero difference from today.

## Problem Statement

Even in a Figma-enabled project, most features will not have a Figma layout — a plan's silent absence of Figma content is ambiguous between "doesn't apply here" and "nobody checked." This phase closes that ambiguity by making the declaration mandatory and explicit wherever the track is active, while guaranteeing zero behavioral change wherever it is not.

## Solution Statement

Seven surgical, additive edits: a new `research-design` agent; `design_source` added to `plan-template.md`'s and (as a per-phase table) `prd-template.md`'s canonical shapes; `plan-writer.md` gains non-heuristic `design_source` sourcing + conditional `## Design Source` emission + the conditional third research dispatch + a new named HALT for the undeclared case; `plan-reviewer.md` gains a structural (never-inferring) presence check + R2's dual-branch heading acceptance + a zero-emission `R-COH-DESIGN-GROUNDED` row; `prd-writer.md` gains the per-phase declaration Q&A + `## Design Source` section assembly; `prd-reviewer.md` gains the matching R2 heading rule + a row-count structural check; `relay-plan.md` gains a flags-first parse preamble so `--design-spec`/`--no-figma` never get misrouted into the existing PRD-path-vs-description mode detection.

## Metadata

| Field | Value |
|---|---|
| Type | Core pipeline integration — new agent + surgical edits to 6 existing live files |
| Complexity | Very High |
| Systems Affected | `plugins/relay/agents/plan-writer.md`, `plan-reviewer.md`, `prd-writer.md`, `prd-reviewer.md`, `plugins/relay/commands/relay-plan.md`, `docs/context/plan-template.md`, `docs/context/prd-template.md`, `documentation/` |
| Dependencies | Phase 1 (Foundations) — complete; Phase 3 (Component map) — complete; Phase 4 (Design Spec) — complete |
| Estimated Tasks | 9 |
| Source PRD line ref | `PRPs/prds/figma-implementation-track.prd.md` Implementation Phases row 5 |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/plan-reviewer.md` | 512-570 | The `phase_type` self-healing Phase 0 pre-pass — the precedent this phase's `design_source` check DELIBERATELY diverges from (no inference, no self-heal) |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 118-146 | R2's exact 15-heading order + item 1's dual-name (`## Source`/`## Source PRD`) acceptance — the closest precedent for the new conditional `## Design Source` heading rule |
| P0 | `plugins/relay/agents/plan-writer.md` | 488-526 | Step 4.4 item 5's Metadata table + inline `phase_type` inference block — the insertion point for `design_source`, explicitly NOT mirroring the inference block |
| P0 | `plugins/relay/agents/plan-writer.md` | 442-476 | Step 4.3's dual-branch `## Source`/`## Source PRD` assembly — the section immediately after which conditional `## Design Source` slots in |
| P0 | `plugins/relay/agents/plan-writer.md` | 306-351 | Phase 2's single-message parallel Task dispatch — where the conditional third `research-design` call joins |
| P1 | `plugins/relay/agents/prd-writer.md` | 256-379 | Phase 6 Q&A item 7 + Step 7.4's 18-item body order — insertion points for the per-phase declaration question and the `## Design Source` section |
| P1 | `plugins/relay/agents/prd-reviewer.md` | 212-231 | R2's 15-heading PRD list (no existing dual-branch precedent — a new presence rule is needed) |
| P1 | `plugins/relay/commands/relay-plan.md` | 47-67 | Phase 0's mode-detection step — must run AFTER the new flags-first preamble, never before |
| P1 | `PRPs/plans/completed/figma-implementation-track-phase-3-component-map.plan.md` | (full) | This feature's own Phase 3 — `component-map.md`'s `CM-<n>` id convention `research-design` cites |
| P2 | `plugins/relay/agents/docs-updater.md` | 6-7 | `tools:` allowlist shape for a new text-only, MCP-free, image-free agent — the template for `research-design`'s frontmatter |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:522-526
2. **Locate** the `## Metadata` table. Scan each row for a first-cell
   value that matches `phase_type` (case-insensitive).

3. **If present:** extract the value and record it as
   `plan_phase_type`. Proceed to Step 1.
```
Copied into Task 4 (`plan-reviewer.md`) as the structural presence-scan shape for `design_source` — reused for the "if present" branch ONLY; the "if absent" branch is deliberately NOT mirrored (no inference-and-Edit).

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:125-128
1. `## Source` (formerly `## Source PRD` in PRD-mode plans; both
   `## Source` and `## Source PRD` are accepted in R2 to allow
   backward-compatible review of pre-Phase-2 plans that still use
   the old heading)
```
Copied into Task 4 as the dual-branch presence-rule pattern for the new conditional `## Design Source` heading.

```
# SOURCE: plugins/relay/agents/plan-writer.md:306-309
Invoke the two research subagents **in parallel** via the `Task`
tool, in a SINGLE message with two tool calls:
```
Copied into Task 3 (`plan-writer.md`) as the exact multi-tool-call-in-one-message shape the conditional third dispatch must join, never a separate sequential call.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/research-design.md` | CREATE | New third grounding subagent — verifies component-map freshness for cited CM-ids, text-only |
| `docs/context/plan-template.md` | UPDATE | Register `design_source` Metadata field + conditional `## Design Source` section |
| `docs/context/prd-template.md` | UPDATE | Register conditional `## Design Source` section (per-phase declaration table) |
| `plugins/relay/agents/plan-writer.md` | UPDATE | Non-heuristic `design_source` sourcing, conditional section emission, conditional third research dispatch, new HALT |
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Structural (non-inferring) presence check, R2 dual-branch rule, zero-emission `R-COH-DESIGN-GROUNDED` |
| `plugins/relay/agents/prd-writer.md` | UPDATE | Per-phase declaration Q&A, `## Design Source` section assembly |
| `plugins/relay/agents/prd-reviewer.md` | UPDATE | R2 conditional heading rule, row-count structural check |
| `plugins/relay/commands/relay-plan.md` | UPDATE | Flags-first parse preamble (`--design-spec`, `--no-figma`) before mode detection |
| `documentation/assets/data/search-index.json` + `documentation/changelog.html` + `documentation/reference/agents.html` | UPDATE | Register `research-design`; describe the `design_source` mechanism |

## NOT Building (Scope Limits)

- **The visual-verification loop** — Phase 6's job; this phase only makes `design_source`/`## Design Source` available for that loop to eventually key off.
- **`code-reviewer`'s `R-COH-DS-REUSE` enforcement against real implementation diffs** — deferred to when Phase 6 (or a later phase) actually needs it; this phase stops at plan/PRD generation and review.
- **Actually running the full `/relay-prd` → `/relay-plan` flow against a real Figma feature** — Phase 7's end-to-end dogfood.
- **Retrofitting or special-casing PRDs authored before this phase ships** — explicitly out of scope per the user's own product decision earlier in this feature's history; an undeclared phase under `figma_track: true` HALTs loudly, full stop, no legacy carve-out.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/agents/research-design.md

**ACTION**: Author a new agent file, frontmatter `{name: research-design, description: <one paragraph — third grounding subagent for plan-writer's Phase 2; verifies component-map freshness for CM-ids a Design Spec cites and harvests real usage snippets of mapped components; text-only, never touches the Figma MCP, never reads PNGs>, model: sonnet, color: purple, tools: Read, Glob, Grep}` (mirrors `research-codebase.md`'s tool shape exactly — no `Write`, no `Task`, no MCP). Body: (1) role statement; (2) `## Inputs`: `design_spec_path`, `component_map_path`, `target_root`, `roots` (optional); (3) Protocol — read the Design Spec's Component Mapping section, extract every cited `CM-<n>` id; for each, look it up in `component_map_path`, verify the import path still resolves in the design-system clone (`Glob`/`Grep`), flag any that don't as `stale_mapping` findings; harvest 1-2 real usage snippets of each mapped component from the target codebase for the plan's own Patterns to Mirror section; (4) return the SAME `{findings, gaps, degradation_reason, scope_cap_reached}` JSON contract `research-codebase.md` and `research-web.md` both use, so `plan-writer.md`'s existing findings-parsing logic needs no special-casing for a third subagent; (5) Anti-patterns (never queries Figma MCP; never reads image files; never invents a stale finding without checking the actual import).

**MIRROR**: `plugins/relay/agents/docs-updater.md:6-7` (tools shape, adapted to text-only), the shared findings/gaps/degradation_reason contract already used by `research-codebase.md`/`research-web.md` (cited in Mandatory Reading via those agents' existing, unmodified files).

**ADDRESSES**: AC-A2

**VALIDATE**: `grep -q "^name: research-design" plugins/relay/agents/research-design.md && grep -q "stale_mapping" plugins/relay/agents/research-design.md && grep -q "degradation_reason" plugins/relay/agents/research-design.md`

### Task 2: UPDATE docs/context/plan-template.md

**ACTION**: In the `## Metadata` table description, add `design_source` to the column list immediately after `Source PRD line ref`, with a note: "present (`figma | none`) only when the target project's `figma_track: true`; never inferred — see `plan-writer.md`/`plan-reviewer.md`." Register a new conditional `## Design Source` section immediately after `## Metadata` in the body-shape block: content is a table of this phase's in-scope frames (node-id, name-path, route, viewport, ref PNG path, diff threshold) drawn from the referenced Design Spec — present ONLY when `design_source: figma`; absent (not an empty section — fully absent) when `design_source: none`. Update the section-count reconciliation note near the top of the file to acknowledge this new conditional section without breaking the fixed count for non-Figma plans.

**MIRROR**: `docs/context/plan-template.md`'s own existing "Relay adaptations (mandatory extensions)" framing (read the file's own current top section before editing — do not invent new terminology).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "design_source" docs/context/plan-template.md && grep -q "Design Source" docs/context/plan-template.md`

### Task 3: UPDATE docs/context/prd-template.md

**ACTION**: Register a new conditional `## Design Source` section, positioned immediately after `## Implementation Phases` in the body-shape block (per `prd-writer.md` Step 7.4's numbered order, Task 6 below): a table with one row per Implementation Phases table row, columns `Phase # | Declaration (figma | none) | Figma URL / frames (when figma)`. Present ONLY when the target's `figma_track: true`; when present, EVERY Implementation Phases row must have a corresponding declaration row — no phase may be silently omitted. Absent entirely when `figma_track: false` or absent.

**MIRROR**: `docs/context/prd-template.md`'s own "Relay adaptations (mandatory extensions)" preamble shape (read the file's own current content first).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "Design Source" docs/context/prd-template.md`

### Task 4: UPDATE plugins/relay/agents/plan-writer.md

**ACTION**: Three additive changes. (a) In Step 4.4 item 5 (the Metadata table), add: "and, when the target's `docs/context/methodology.md` declares `figma_track: true`, a `design_source: figma | none` row — sourced as follows, NEVER inferred from plan content the way `phase_type` is: in PRD mode, copy verbatim the per-phase declaration from the source PRD's `## Design Source` section for row N (added by Task 6); in description mode, `figma` only when a `--design-spec <path>` CLI flag was passed (forwarded by `relay-plan.md`, Task 8) referencing an APPROVED Design Spec, `none` otherwise. When `figma_track: true` and no declaration is sourceable (PRD mode: PRD lacks the section or the row; description mode: N/A, always deterministic), HALT with a new named message `FAILED_DESIGN_SOURCE_UNDECLARED` — do NOT default, do NOT guess." (b) Immediately after Step 4.3's `## Source`/`## Source PRD` assembly, add a conditional Step 4.3.5: when `design_source: figma`, emit the `## Design Source` section (per `plan-template.md`'s new shape) citing the APPROVED Design Spec path and this phase's frame subset; when `design_source: none` or the key is absent (figma_track off), emit nothing — no section, no placeholder. (c) In Phase 2 GROUNDING, when a `design_spec_path` is available (passed in when `design_source: figma`), add `research-design` as a THIRD parallel `Task` call in the SAME single message as `research-codebase`/`research-web`; when absent, the dispatch is unchanged (exactly the existing two calls) — this is the load-bearing "off means unchanged" guarantee for this task.

**MIRROR**: `plugins/relay/agents/plan-reviewer.md:522-526`'s presence-scan shape (adapted, no inference branch), `plugins/relay/agents/plan-writer.md:306-309`'s single-message multi-Task-call pattern.

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**: `grep -q "FAILED_DESIGN_SOURCE_UNDECLARED" plugins/relay/agents/plan-writer.md && grep -q "research-design" plugins/relay/agents/plan-writer.md && grep -q "NEVER inferred" plugins/relay/agents/plan-writer.md`

### Task 5: UPDATE plugins/relay/agents/plan-reviewer.md

**ACTION**: Three additive changes. (a) Add a new structural check (run alongside or immediately after the existing Phase 0 `phase_type` pre-pass, but as its own independent step — never merged into Phase 0's Edit-on-absence logic): read the target's `docs/context/methodology.md`; if `figma_track: true`, scan the plan's `## Metadata` table for a `design_source` row. If absent, this is an immediate structural defect recorded as a NEW rubric row `R-COH-DESIGN-SOURCE-MISSING` with `passed: false` — do NOT insert or infer the value (explicitly the opposite of the `phase_type` Phase 0 behavior; state this divergence explicitly in prose, citing why: "has Figma or not" is a business decision the reviewer cannot manufacture). If `figma_track: false` or absent, this check is a zero-emission no-op (no rubric row at all — not even a `passed: true` row — to keep non-Figma plans' rubric array byte-identical to today). (b) In R2, add item "6.5" to the 15-item list (renumbering downstream items by 1, OR — preferred, to avoid renumbering churn — insert as a dual-branch note on the EXISTING item 6 `## Metadata`, since `## Design Source` immediately follows it): "When the plan's Metadata `design_source` row reads `figma`, `## Design Source` MUST appear immediately after `## Metadata`, before `## Mandatory Reading`; when `design_source` reads `none` or is absent, `## Design Source` MUST be absent. A mismatch between the two (row says figma but section missing, or vice versa) fails R2." (c) Add a new zero-emission conditional `R-COH-DESIGN-GROUNDED` row to the R-COH-* layer: emitted ONLY when `## Design Source` is present in the plan; verifies every task in `## Step-by-Step Tasks` that touches a UI/frontend file references a frame or `CM-<n>` id from the section; absent when the section is absent (no row at all, matching the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` silent-degradation-branch precedent already in this file for the empty-`test_frameworks` case).

**MIRROR**: `plugins/relay/agents/plan-reviewer.md:512-570` (Phase 0 shape, explicitly diverged from for the no-inference rule), `:118-146` (R2 dual-branch precedent).

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**: `grep -q "R-COH-DESIGN-SOURCE-MISSING" plugins/relay/agents/plan-reviewer.md && grep -q "R-COH-DESIGN-GROUNDED" plugins/relay/agents/plan-reviewer.md && grep -q "does NOT insert or infer" plugins/relay/agents/plan-reviewer.md`

### Task 6: UPDATE plugins/relay/agents/prd-writer.md

**ACTION**: Two additive changes. (a) In Phase 6 DECISIONS, immediately after item 7 (Implementation phases), add a new item 7.5: "When the target's `docs/context/methodology.md` declares `figma_track: true`: for EVERY row in the Implementation Phases list just captured, ask explicitly whether that phase implements a layout already defined in Figma — if yes, capture the Figma URL/frame references; if no, capture an explicit confirmation. Every phase gets an answer; none may be silently skipped, including phases that don't obviously look like frontend work." When `figma_track` is `false` or absent, this item is a silent no-op — Phase 6 proceeds exactly as it does today. (b) In Step 7.4's 18-item body order, insert a new conditional item immediately after item 15 (Implementation Phases): "15.5. `## Design Source` (conditional — only when `figma_track: true`) — one row per Implementation Phases row, per `docs/context/prd-template.md`'s registered shape (Task 3), using the answers captured in Phase 6 item 7.5. Every phase row MUST have a corresponding declaration row — never omit one." When `figma_track` is off, this section is not emitted at all.

**MIRROR**: `plugins/relay/agents/prd-writer.md:256-273` (Phase 6 item numbering/shape), `:357-379` (Step 7.4's numbered body-order list, insertion pattern).

**ADDRESSES**: AC-A1, AC-A3

**VALIDATE**: `grep -q "figma_track" plugins/relay/agents/prd-writer.md && grep -q "Design Source" plugins/relay/agents/prd-writer.md`

### Task 7: UPDATE plugins/relay/agents/prd-reviewer.md

**ACTION**: Two additive changes. (a) In R2's 15-heading list, add a dual-branch note analogous to plan-reviewer's item 1 precedent: "When `figma_track: true` for the target project, `## Design Source` MUST appear immediately after `## Implementation Phases`, before `## Decisions Log`; when `figma_track` is `false` or absent, it MUST be absent. A mismatch fails R2." (b) Add a new structural check (own rubric row, e.g. `R-COH-DESIGN-SOURCE-INCOMPLETE`, zero-emission when `## Design Source` is absent): when present, count the Implementation Phases table's data rows and the Design Source table's data rows — they MUST match exactly, and no row's Declaration cell may be empty. A mismatch or empty cell fails this check, naming the missing phase number(s).

**MIRROR**: `plugins/relay/agents/prd-reviewer.md:212-231` (R2 list, insertion point), `plugins/relay/agents/plan-reviewer.md`'s own R2 dual-branch precedent (cross-agent pattern reuse, cited by name since prd-reviewer has no existing dual-branch heading of its own).

**ADDRESSES**: AC-A1, AC-A3

**VALIDATE**: `grep -q "figma_track" plugins/relay/agents/prd-reviewer.md && grep -q "Design Source" plugins/relay/agents/prd-reviewer.md`

### Task 8: UPDATE plugins/relay/commands/relay-plan.md

**ACTION**: Add a new "Parse arguments — extract flags first" preamble immediately BEFORE the existing Phase 0 input-type detection (before the `.prd.md`-suffix check): scan `$ARGUMENTS` for `--no-figma` (strip, record `no_figma_flag`) and `--design-spec <value>` (strip the flag and its value as a pair, record `design_spec_override`); run the existing `.prd.md`-suffix detection against the RESIDUAL string after stripping, so a flag-bearing invocation like `/relay-plan PRPs/prds/x.prd.md --no-figma` no longer risks misrouting. When `design_spec_override` is set, verify (new precondition) it points to a file ending `*Status: APPROVED*`; forward it to `plan-writer` as `design_spec_path`. In PRD mode, when no `--design-spec` override was given, auto-derive `design_spec_path` from the source PRD's own `## Design Source` section for the current phase row (when present and `figma`) — the override always wins when both are present.

**MIRROR**: `plugins/relay/commands/relay-plan.md:47-67` (the exact detection step this preamble must run before, unmodified otherwise).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "no-figma" plugins/relay/commands/relay-plan.md && grep -q "design-spec" plugins/relay/commands/relay-plan.md && grep -q "extract flags first" plugins/relay/commands/relay-plan.md`

### Task 9: UPDATE documentation/assets/data/search-index.json + documentation/changelog.html + documentation/reference/agents.html

**ACTION**: Register the new `research-design` agent in `search-index.json` and `reference/agents.html` (mirroring the existing `research-codebase`/`research-web` entries' shape and section placement). Add an `Unreleased` entry to `changelog.html` describing: "`design_source: figma | none` — a mandatory, non-heuristic Metadata field on every plan and PRD phase when `figma_track: true` — plus the conditional `## Design Source` section in both plan and PRD templates, and a new `research-design` grounding subagent. Part of the Figma Implementation Track, Phase 5 of `PRPs/prds/figma-implementation-track.prd.md`." No new versioned `<h2>`; no `plugin.json` bump.

**MIRROR**: the existing `research-codebase`/`research-web` entries on `reference/agents.html` and `search-index.json`; Phase 3/4's own `Unreleased` entries in `changelog.html`.

**ADDRESSES**: AC-A2

**VALIDATE**: `grep -q "research-design" documentation/assets/data/search-index.json && grep -q "research-design" documentation/reference/agents.html && grep -qi "design_source" documentation/changelog.html`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
if grep -q "^name: research-design" plugins/relay/agents/research-design.md; then
  echo "PASS: research-design agent frontmatter correct"
else
  echo "FAIL: research-design agent frontmatter missing/incorrect"; exit 1
fi
if grep -q "FAILED_DESIGN_SOURCE_UNDECLARED" plugins/relay/agents/plan-writer.md && grep -q "R-COH-DESIGN-SOURCE-MISSING" plugins/relay/agents/plan-reviewer.md; then
  echo "PASS: non-heuristic design_source enforcement present in both writer and reviewer"
else
  echo "FAIL: design_source enforcement incomplete"; exit 1
fi
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
node -e "
const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('documentation/assets/data/search-index.json', 'utf8'));
if (!JSON.stringify(idx).includes('research-design')) { console.error('FAIL: research-design not registered'); process.exit(1); }
console.log('PASS: search-index.json valid and research-design registered');
"
# Diff-scoped, excludes the standard quoted-prohibition idiom (established fix from Phase 2/3/4 of this same feature).
if git diff --unified=0 development -- plugins/relay/agents/research-design.md plugins/relay/agents/plan-writer.md plugins/relay/agents/plan-reviewer.md plugins/relay/agents/prd-writer.md plugins/relay/agents/prd-reviewer.md plugins/relay/commands/relay-plan.md docs/context/plan-template.md docs/context/prd-template.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced outside quoted prohibitions"
fi
```

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** Given a project where `figma_track` is absent or `false`, when `plan-writer`, `plan-reviewer`, `prd-writer`, or `prd-reviewer` run, then none of this phase's new instruction blocks fire — no `design_source` row, no `## Design Source` section, no new rubric row, no new HALT — the rubric array and generated artifact shape are byte-identical to before this phase.
- **AC-A2 (PRD AC-4):** Given a project with `figma_track: true` and a plan whose Metadata table lacks a `design_source` row, when `plan-reviewer` runs, then it returns `CHANGES_REQUESTED` citing `R-COH-DESIGN-SOURCE-MISSING` — it never inserts or infers the value itself, unlike its handling of `phase_type`.
- **AC-A3 (PRD AC-4):** Given a project with `figma_track: true`, when `prd-writer` generates a PRD, then its `## Design Source` section contains one declaration row for every single Implementation Phases table row — `prd-reviewer`'s row-count structural check fails if any phase is missing a declaration.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Surgical edits to 6 live, shared files carry real risk of subtly breaking today's non-Figma behavior | M | High | Every single new instruction block is explicitly gated behind figma_track/design_source presence with a stated "unchanged when absent" fallback; Level 1 (`npm run validate`) and the eventual test suite both exercise the unchanged path via this repo's own `figma_track`-absent state |
| `plan-template.md` and `plan-writer.md` are already known to drift (research confirmed `phase_type` itself isn't in `plan-template.md`'s Metadata description) | L | Low | This phase deliberately keeps `plan-template.md` and the agent files in sync for `design_source`, not perpetuating the existing `phase_type` drift, without attempting to retroactively fix that unrelated pre-existing drift (out of scope) |
| R2's heading-order renumbering (inserting a conditional section) could be interpreted as requiring a full list renumber, risking an editing error | M | Medium | Task 5's ACTION explicitly prefers a dual-branch NOTE on the adjacent existing item over renumbering the fixed list, mirroring how item 1's `## Source`/`## Source PRD` dual-acceptance already works without renumbering anything |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` is declared, so the pair is active test-after. Given `research-design.md` is a new prompt file (matching the `phase_type: feature` classification here, since this phase's real observable behavior — the non-heuristic gating logic across 6 files — genuinely warrants content-invariant regression coverage, not scaffold-style exemption), expect the test pair to write real content-assertion tests verifying the figma_track-off inertness guarantee specifically (AC-A1), mirroring this feature's own `figma-track-phaseN.test.mjs` convention.

Given this feature's own recurring third defect class (inertness-scan tests needing minimal exclusions, not narrowed scope, as new legitimate cross-references appear — see Phase 4's Notes) — this phase itself is likely to be exactly the kind of legitimate cross-reference that trips up an EARLIER phase's inertness test (e.g., Phase 3's or Phase 4's "no other command/agent mentions X" scans, if `plan-writer.md`/`prd-writer.md` now legitimately mention `design-map`/`design-spec` concepts). Applying the lesson proactively: if the test suite flags this, the fix is a minimal per-file exclusion, never a scope narrowing.

---

*Generated: 2026-07-23*
*Approved: 2026-07-23*
*Implemented: 2026-07-23*
*Status: IMPLEMENTED*
