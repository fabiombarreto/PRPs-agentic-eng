# Feature: MCP-access spike (Phase 2 of figma-implementation-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (docs/decisions.md entry that future phases 3-4 will cite as the operative contract); documents an empirical infrastructure finding without reopening the APPROVED source PRD
- Decisions found:
  - [2026-04-28] AC-10 of plan-authoring.prd.md evolves — the direct precedent for recording a resolved architectural question in `docs/decisions.md` without mutating the APPROVED source PRD
  - [2026-05-06] TDD pair is the authorized mechanism — the closest existing precedent for turning a real-world empirical/dogfood observation into a decisions.md entry
  - [2026-07-16] Docs-sync relocates to Pillar 2 — the template this entry's cross-referencing style follows (architecture.md pointing at a dated decisions.md entry rather than inlining the finding)
  - [2026-05-14] phase_type annotation — `docs` value definition (Files to Change containing only documentation files)
- Applicable anti-patterns:
  - Reopening an APPROVED PRD (docs/anti-patterns.md via the prd-reviewer's already_approved precondition) — this phase records the finding in decisions.md, never edits `PRPs/prds/figma-implementation-track.prd.md`
- Applicable architectural rules:
  - `docs/decisions.md` is the canonical home for decisions the AI must not re-evaluate (docs/decision-gate.md)
  - `docs/context/integrations.md`'s per-integration entry shape (Purpose / Auth type / Used by / Known endpoint-tool)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-implementation-track.prd.md` — Implementation Phases row 2:
  "MCP-access spike" — Goal: Resolve, empirically, whether Task-dispatched subagents in this environment can call Figma MCP tools directly. — Success
  signal: A recorded pass/fail outcome that Phase 4's design explicitly branches on, with the baseline (MCP calls in interactive commands) valid regardless of the result.

## Summary

This phase records the outcome of the empirical MCP-access spike performed by the orchestrator ahead of this plan: a Task-dispatched subagent (`general-purpose`, tool access via `ToolSearch`) successfully discovered and called a Figma MCP tool (`get_metadata`), receiving a Figma-backend access-denial error (not a tool-routing failure) — confirming Figma MCP tools ARE reachable from Task-dispatched subagents in this environment. Despite this, the baseline architecture (Figma MCP calls made only by the interactive commands `/relay-design-map` and `/relay-design-spec`, never by autonomous Task-dispatched writer/reviewer agents) is retained as the operative design for Phases 3-4, for reasons independent of pure reachability: it keeps the entire autonomous stretch of the pipeline structurally independent of Figma/MCP availability, centralizes context-budget management for the traversal, and aligns naturally with the mandatory human-approval gate already required on the Design Spec (which happens in the same interactive window). This phase records both facts — the empirical result and the design decision it does NOT change — as a `docs/decisions.md` entry, cited by name so Phase 4's plan-writer consults it rather than re-deriving or re-testing it.

## User Story

As a developer planning Phase 4 (Design Spec) of the figma-implementation-track feature, I want the MCP-access question already resolved and recorded, so that I don't re-run the spike or second-guess the architecture when I write that phase's plan.

## Problem Statement

Frontend developers spend disproportionate time implementing Figma-designed layouts because today's tooling has no structured, verified path to the Figma design programmatically. This phase does not touch that problem directly — it resolves one narrow technical unknown (subagent MCP reachability) that a later phase's design depends on, so that dependency is not re-litigated.

## Solution Statement

Record the spike's empirical result and the architectural decision it does (and does not) change as a single `docs/decisions.md` entry, add a one-line cross-reference in `docs/context/architecture.md`'s MCP-usage narrative, and add a `docs/context/integrations.md` entry for the Figma MCP server (replacing the `[INFERRED - VALIDATE]` pattern used for Context7 with a confirmed fact).

## Metadata

| Field | Value |
|---|---|
| Type | Documentation / architecture decision record |
| Complexity | Low |
| Systems Affected | `docs/decisions.md`, `docs/context/architecture.md`, `docs/context/integrations.md` |
| Dependencies | Phase 1 (Foundations) — complete |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/figma-implementation-track.prd.md` Implementation Phases row 2 |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `docs/decisions.md` | 741-750 | Canonical entry template every new decision must follow (Title/Context/Decision/Reason/Areas affected) |
| P0 | `docs/decisions.md` | 288-297 | Direct precedent: recording a resolved question in decisions.md WITHOUT mutating the APPROVED source PRD |
| P1 | `docs/decisions.md` | 421-437 | Precedent for converting a real-world empirical observation into a decisions.md entry |
| P1 | `docs/decisions.md` | 727-737 | Template for cross-referencing a decisions.md entry from architecture.md by date, rather than inlining the finding |
| P1 | `docs/context/architecture.md` | 38-46 | The "Three-pillar target architecture" section — existing slot where MCP usage (Context7) is already narrated; the natural location for a one-line Figma MCP cross-reference |
| P1 | `docs/context/integrations.md` | 15-23 | Per-integration entry shape (Purpose / Auth type / Used by / Known endpoint-tool) — template for the new Figma MCP entry |
| P2 | `plugins/relay/agents/plan-writer.md` | 497-499 | `phase_type: docs` signal definition — confirms this phase's classification |

## Patterns to Mirror

```
# SOURCE: docs/decisions.md:741-750
## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]
```
Copied into Task 1 as the exact structural template for the new entry.

```
# SOURCE: docs/context/integrations.md:15-23
## MCP Context7 (planned, optional)

- **Purpose:** ...
- **Auth type:** provided by the user's MCP configuration.
- **Used by:** `context-builder` skill, Phase 0 ...
- **Known endpoint/tool:** ... [INFERRED - VALIDATE].
```
Copied into Task 3 as the field shape for the new Figma MCP entry — with the confirmed reachability fact replacing any `[INFERRED - VALIDATE]` tag.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `docs/decisions.md` | UPDATE | Append the new decision entry recording the spike's empirical result and the retained baseline architecture |
| `docs/context/architecture.md` | UPDATE | Add a one-line cross-reference to the new decision inside the existing MCP-usage narrative |
| `docs/context/integrations.md` | UPDATE | Add a Figma MCP entry (confirmed reachable from Task-dispatched subagents; baseline design still routes calls through interactive commands) |

## NOT Building (Scope Limits)

- **Reopening or editing the APPROVED source PRD** — the finding is recorded in `docs/decisions.md`, never in `PRPs/prds/figma-implementation-track.prd.md`.
- **Any change to `/relay-design-map`, `/relay-design-spec`, or any agent's `tools:` allowlist** — this phase records a finding; Phase 3/4 own the actual command/agent authorship.
- **A dedicated `PRPs/reports/<feature>/spike.md` artifact** — research confirmed this repo's precedent is inline prose directly in `docs/decisions.md`, not a separate spike-report file format.
- **Re-testing narrower agent tool-allowlist scenarios** (e.g. an agent whose `tools:` list omits `ToolSearch`) — the spike confirms the harness-level fact (subagents CAN reach Figma MCP via `ToolSearch` discovery); the specific allowlist Phase 3/4's agents declare is those phases' own design decision.

## Step-by-Step Tasks

### Task 1: UPDATE docs/decisions.md — record the spike finding

**ACTION**: Append a new dated entry (today's date) titled "MCP-access spike: Figma MCP tools are reachable from Task-dispatched subagents; baseline architecture retained". Context: the figma-implementation-track PRD's Phase 2 needed to resolve whether Task-dispatched subagents can call Figma MCP tools directly, to de-risk Phase 4's design. Decision: state the empirical result verbatim (a `general-purpose` subagent called `ToolSearch`, discovered the Figma MCP server's tools, called `get_metadata` with a fake `fileKey`, and received a Figma-backend access-denial error rather than a tool-not-found error — confirming the call round-tripped to Figma's backend from within the subagent's own execution context) AND state explicitly that the baseline architecture (Figma MCP calls made only by the interactive commands, never by autonomous Task-dispatched agents) is RETAINED for Phases 3-4 regardless, for the three reasons in this plan's Summary. Reason: explain why retaining the baseline despite confirmed reachability is the right call (autonomous-stretch independence from MCP availability; centralized context-budget management for traversal; natural alignment with the mandatory human-approval gate on the Design Spec). Areas affected: future Phase 3 (`design-map-writer`), Phase 4 (`design-spec-writer`) agent designs.

**MIRROR**: `docs/decisions.md:741-750` (template), `:288-297` (no-PRD-mutation precedent).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "MCP-access spike" docs/decisions.md && grep -q "reachable from Task-dispatched subagents" docs/decisions.md`

### Task 2: UPDATE docs/context/architecture.md — cross-reference

**ACTION**: In the "Three-pillar target architecture" section's Initialization bullet (the existing paragraph narrating MCP Context7 usage), add one sentence cross-referencing the new decision by date: "The Figma MCP server (planned, Pillar 2 extension) is confirmed reachable from Task-dispatched subagents as well as the main session — see `docs/decisions.md` <today's date> — though the baseline design keeps Figma MCP calls in the interactive commands only." Do not restructure the section or add a new heading.

**MIRROR**: `docs/context/architecture.md:38-46` (existing MCP-narration style), `docs/decisions.md:727-737` (cross-reference-by-date pattern).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "Figma MCP" docs/context/architecture.md && grep -q "docs/decisions.md" docs/context/architecture.md`

### Task 3: UPDATE docs/context/integrations.md — Figma MCP entry

**ACTION**: Add a new `## Figma MCP (planned, optional)` section immediately after the existing MCP Context7 entry, using the same four-field shape (Purpose, Auth type, Used by, Known endpoint/tool). State the confirmed reachability fact plainly (no `[INFERRED - VALIDATE]` tag needed for that specific claim, since it is now empirically confirmed) while marking the eventual `Used by` field `[INFERRED - VALIDATE]` (Phases 3-4 have not yet named their exact command/agent files).

**MIRROR**: `docs/context/integrations.md:15-23`.

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "Figma MCP" docs/context/integrations.md`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
if grep -q "MCP-access spike" docs/decisions.md; then
  echo "PASS: spike finding recorded in decisions.md"
else
  echo "FAIL: spike finding missing from decisions.md"; exit 1
fi
if grep -q "Figma MCP" docs/context/integrations.md; then
  echo "PASS: Figma MCP integration entry present"
else
  echo "FAIL: Figma MCP integration entry missing"; exit 1
fi
```

**Level 3 — DRY-RUN END-TO-END**
```bash
if git diff --unified=0 development -- docs/decisions.md docs/context/architecture.md docs/context/integrations.md | grep -E "^\+[^+]" | grep -q "\.claude/PRPs"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced by this diff"; exit 1
else
  echo "PASS: no forbidden path references introduced by this diff"
fi
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given this phase's three documentation-only edits (decisions.md, architecture.md, integrations.md), when `npm run validate` runs, then it passes with zero new findings — no new gated emission site, no new command, no new agent is introduced by this phase, confirming it stays inert relative to any project without `figma_track: true`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A narrowly-scoped future agent (explicit `tools:` allowlist omitting `ToolSearch`) might not reach Figma MCP the same way the general-purpose spike agent did | L | Low | Explicitly out of scope for this phase (see NOT Building); the retained baseline architecture (interactive commands own all MCP calls) makes this residual risk irrelevant to Phases 3-4's actual design |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. Given `phase_type: docs` and a Files-to-Change table containing only documentation files, the test pair's Phase 1 AC-enumeration is expected to yield `EXISTING_COVERAGE_SUFFICIENT` or an empty in-scope set — no test files are anticipated for this phase, matching the `docs`-phase precedent noted in `docs/decisions.md:505-519`.

Spike evidence: performed by the orchestrator via `Agent(subagent_type="general-purpose", ...)` immediately before this plan was authored — not via `research-codebase`/`research-web` (both were still dispatched for grounding on decisions.md formatting precedent, per protocol, and returned useful structural findings but no evidence bearing on the spike question itself, since that question is answerable only by direct empirical test, not codebase or web research).

**Bounded post-approval correction (attempt 1 → attempt 2):** the Level 3 command originally used a whole-file `grep` for `.claude/PRPs`, which false-positived on pre-existing historical prose in `docs/decisions.md`/`docs/context/architecture.md` describing the upstream prp-core convention (not new content this diff introduced) — the exact over-broad-Level-3-grep pattern this repo has hit before. Corrected to a diff-scoped check (`git diff ... | grep "^+"`) after code-reviewer's attempt-1 CHANGES_REQUESTED confirmed the false positive via `git diff`. This is a narrow, mechanical fix to the plan's own validation command, not a change to the phase's scope or tasks — analogous to plan-reviewer's own sanctioned Phase 0 `phase_type` bounded exception.

---

*Generated: 2026-07-22*
*Approved: 2026-07-22*
*Implemented: 2026-07-22*
*Status: IMPLEMENTED*
