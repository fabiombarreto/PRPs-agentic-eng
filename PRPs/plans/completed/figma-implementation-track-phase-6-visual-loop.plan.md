# Feature: Visual loop (Phase 6 of figma-implementation-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: new tooling dependency introduction (self-contained npm package under plugins/relay/scripts/visual/); new agent file in plugins/relay/agents/; surgical edit to an EXISTING, live, shared pipeline command used by every relay feature, not just Figma ones (/relay-implement); cross-cutting artifact creation (fidelity-report.json, consumed by the future Phase 7 QA report); graceful-degradation contract extension
- Decisions found:
  - [2026-04-19] PRP artifacts live under PRPs/ at the repository root, never under .claude/ — fidelity-report.json and all visual-loop evidence must live under PRPs/reports/<feature>/phase-<N>/visual/
  - [2026-04-19] Command surface: one command per stage, writer/reviewer split — the visual loop joins as a bounded internal sub-phase inside /relay-implement (mirroring the docs-updater/docs-reviewer sub-phase), never as a new top-level /relay-* command; the Should-item /relay-visual-review is a separate, standalone command deferred to Phase 7
  - [2026-07-16] Docs-sync relocated to Pillar 2 (implement-time, non-interactive gated sub-phase) — Phase A.3.5 is the exact structural precedent this phase's Phase A.3.4 clones (gate + own bounded budget + graceful degradation, dispatched non-interactively via Task, no commit issued)
  - [2026-07-22] MCP-access spike (Figma MCP confirmed reachable, but baseline keeps calls in interactive commands only) — does not constrain this phase at all: visual-verifier never queries the Figma MCP: it reads only the already-persisted Design Spec and reference PNGs already on disk, exactly like design-map-writer/design-map-reviewer/research-design
  - [2026-07-23] Design Spec pair extends the interactivity boundary — this phase sits entirely downstream (autonomous), consuming an ALREADY-APPROVED Design Spec's Visual Acceptance Criteria table; it introduces no new interactivity-boundary extension of its own
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:61-67) — all visual-loop evidence goes under PRPs/reports/
  - Querying the Figma MCP from a dispatched writer/reviewer agent (docs/anti-patterns.md:98-104) — visual-verifier is Task-dispatched and MUST carry no Figma-MCP tool in its allowlist
  - Flipping figma_track (or any future opt-in gating key) by heuristic (docs/anti-patterns.md:89-95) — Phase A.3.4's gate reuses the EXISTING figma_track + per-plan design_source declarations verbatim; it must not invent a parallel heuristic gate or a redundant new methodology.md key
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md:80-86) — the entire visual loop runs non-interactively inside /relay-implement's autonomous stretch
- Applicable architectural rules:
  - Pillar 2 "never commit" invariant (docs/decisions.md 2026-05-18) — the visual loop, like docs-sync, performs no commit of any kind
  - Interactivity boundary is fixed at PRD approval (extended once, deliberately, for Design Spec) — Phase A.3.4 sits fully inside the autonomous stretch and does not extend the boundary further
  - PRPs/ artifact path convention
  - Graceful degradation that never blocks delivery — the single governing invariant for this entire phase (PRD AC-5)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-implementation-track.prd.md` — Implementation Phases row 6:
  "Visual loop" — Goal: Close the fidelity loop automatically, within a bounded budget, without ever blocking delivery. — Success
  signal: A real implementation attempt produces a `fidelity-report.json` with per-frame scores, and at least one degradation rung (e.g., `DEGRADED_STATIC_ONLY`) is exercised and confirmed non-blocking.

## Summary

This phase closes the Figma Implementation Track's fidelity loop: a new, 100%-self-contained `plugins/relay/scripts/visual/` tooling package (provisioning, capture, and AA-tolerant compare), a new `visual-verifier` agent that orchestrates that tooling and classifies results, and a new gated sub-phase — Phase A.3.4 — inserted into the live, shared `/relay-implement` command immediately before the existing Phase A.3.5 docs-sync sub-phase. Phase A.3.4 structurally clones A.3.5's shape (config-key gate reusing the already-declared `figma_track`/`design_source`, its own bounded retry budget, graceful degradation that never blocks delivery) and adds a degradation ladder (`FULL` → `DEGRADED_STATIC_ONLY` → `DEGRADED_PROVISION_FAILED`) plus a post-visual re-review step with a deterministic revert when a visual-fix attempt itself fails re-review — the worktree is never left in a state code-review never approved.

## User Story

As a developer running `/relay-implement` on a plan whose `design_source: figma` Metadata cites an APPROVED Design Spec, I want the pipeline to automatically verify the implementation against the Design Spec's reference screenshots — within a bounded budget, degrading gracefully rather than blocking delivery when the tooling can't provision or the dev server won't boot — so that visual fidelity is checked without me reviewing every frame by hand, and so that a project with the track off (or a plan with no Figma involvement) sees zero behavioral difference.

## Problem Statement

Even with an APPROVED Design Spec pinning reference screenshots and diff thresholds (Phase 4), nothing in the pipeline today actually compares the Implementer's output against those references — fidelity checking is entirely manual, which is exactly the "hours of prompt writing and revision" cost this PRD's Problem Statement names. Narrowed to this phase's scope: the gap is specifically the missing automated verification step inside `/relay-implement`, not the Design Spec's existence (already shipped) or its surfacing to humans (Phase 7).

## Solution Statement

Add a bounded, non-blocking visual-verification loop as Phase A.3.4 of `/relay-implement`, gated on the plan's already-declared `design_source: figma` (no new heuristic, no duplicated config key), dispatching a new `visual-verifier` agent that drives new self-contained tooling (`plugins/relay/scripts/visual/`) through provisioning, dev-server boot, per-frame capture, and AA-tolerant pixel-diff against the Design Spec's `## Visual Acceptance Criteria` table — producing a `fidelity-report.json`, applying a named degradation ladder when tooling or the dev server can't come up, and performing one bounded post-visual re-review-with-deterministic-revert round before falling through gracefully to Phase A.3.5 (docs-sync) and Phase A.4 (D8 mutations), never halting the pipeline.

## Metadata

| Field | Value |
|---|---|
| Type | New tooling package + new agent + surgical edit to one existing, live, shared command |
| Complexity | Very High |
| Systems Affected | `plugins/relay/scripts/visual/` (new self-contained package), `plugins/relay/agents/visual-verifier.md` (new), `plugins/relay/commands/relay-implement.md` (Phase A.3.4 insertion), `documentation/` (registration) |
| Dependencies | Phase 4 (Design Spec) — complete, supplies the `## Visual Acceptance Criteria` contract this loop consumes; Phase 5 (Plan integration) — complete, supplies the `design_source`/`## Design Source` gate this loop reuses |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/figma-implementation-track.prd.md` Implementation Phases row 6 |
| phase_type | foundation |

`phase_type` reclassified `feature` → `foundation` (plan-reviewer attempt-1 R-COH-VALIDATE-FRAMEWORK-MISMATCH fix): Tasks 2-4 CREATE brand-new `plugins/relay/scripts/visual/*.mjs` modules with zero prior test surface — the seam `visual-verifier` (Task 5) and Phase A.3.4 (Task 6) depend on — and their VALIDATE commands are `node --check` compile/syntax checks (this ecosystem's closest analog to `go build`/`mvn test-compile`), not filesystem probes. `test_frameworks: ["node:test"]` is declared but none of the 7 tasks' VALIDATE commands invoke `node --test`, which under `phase_type: feature` would trip the framework-mismatch check; under `phase_type: foundation` the exemption applies. This mirrors the established phase_type-correction precedent from this feature's own Phase 1 (`PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md` — grep/npm-only VALIDATE commands → `scaffold`, never `feature`).

`design_source` Metadata row: **not added** — this target project (`docs/context/methodology.md`) does not declare `figma_track: true` (this repo is relay's own source, not a Figma-enabled downstream project), so per `plan-writer.md` Step 4.4 item 5 the row is omitted entirely and no `## Design Source` section is emitted. This is the "nothing changes when figma_track is off" invariant applied to the plan-authoring meta-layer itself: building the capability that a downstream project will later gate on does not itself require that gate to be on here.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/commands/relay-implement.md` | 364-419 | Phase A.3.5 docs-sync sub-phase — the exact gate/budget/dispatch/degradation shape Phase A.3.4 structurally clones |
| P0 | `plugins/relay/commands/relay-implement.md` | 420-459 | Phase A.4 D8 post-approval mutations + atomicity discipline — confirms Phase A.3.4 must complete (pass or gracefully degrade) before D8 runs, never interleaving |
| P0 | `plugins/relay/commands/relay-implement.md` | 197-263 | Phase A.0/A.1 — budget initialization + ordered pre-flight checks (time, retry, oscillation, dispute) — the pattern `max_visual_retries` and its own ordered checks mirror |
| P0 | `plugins/relay/commands/relay-implement.md` | 239-250 | Oscillation detection's `reverting_files` concept — direct precedent for "post-visual re-review with deterministic revert" |
| P0 | `docs/context/design-spec-template.md` | 107-159 | `## Visual Acceptance Criteria` table shape (node-id, route, preconditions, auth mode, viewport, diff threshold, ref PNG path+dims, masks) — the exact input contract `visual-verifier` consumes |
| P1 | `plugins/relay/commands/relay-design-map.md` | 256-286 | Phase D preflight — visual-tooling dependency check + dev-server config check + port-free check; explicitly forward-references "visual regression tooling ships in Phase 6" |
| P1 | `plugins/relay/agents/implementer.md` | 1-30 | Frontmatter/tools shape (`Bash, BashOutput, KillBash`) for an agent that must launch and manage background processes (dev server) — the closest existing precedent for `visual-verifier`'s own tools allowlist |
| P1 | `plugins/relay/agents/docs-updater.md` | 1-36 | Writer-agent frontmatter/description shape, `non_interactive` input handling — mirrored by `visual-verifier`'s own dispatch contract |
| P2 | `PRPs/plans/completed/figma-implementation-track-phase-5-plan-integration.plan.md` | (full) | Immediate sibling phase's plan — structural template this plan mirrors section-for-section |
| P2 | `docs/context/methodology.md` | 45-76 | `docs_sync` config-key-with-default convention — consciously NOT duplicated by this phase (see Notes); cited to justify the gate-reuse design decision |
| P2 | `scripts/validate/checks/gating-structure.mjs` | 1-56 | `SITES` registry — confirms `figma_track` is already registered and extensible; this phase needs no new site since it reuses the existing gate |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-implement.md:364-370
### Phase A.3.5 — Docs-sync dispatch

Triggered exactly once when Phase A.3 standard-mode returns APPROVED — never on an arbitration-mode verdict (mirrors Phase A.4's own trigger phrasing below).

1. **Gate.** If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip the entire docs-sync sub-phase (log a one-line skip note naming which of the two gated it) and proceed directly to Phase A.4. Record `docs_sync_outcome = "SKIPPED (--no-docs)"` when `no_docs_flag == true` (checked first — `--no-docs` takes precedence over `docs_sync_enabled` when both are true), otherwise `docs_sync_outcome = "SKIPPED (docs_sync: false)"`.
2. **Initialise the docs-sync budget.** Otherwise, initialise `docs_review_attempts = 0`, `max_docs_review_retries = 2`, `docs_prior_feedback = null` — its own budget, independent of `max_implement_retries`/`disputes_used`.
```
Copied into Task 6 as the exact gate/budget-init shape for Phase A.3.4 — substituting `no_docs_flag`/`docs_sync_enabled` for a new `no_visual_flag` plus the reused `figma_track`/`design_source: figma` gate (never a new config key).

```
# SOURCE: plugins/relay/commands/relay-implement.md:239-250
3. **Oscillation check** (only when `attempt >= 3`). For each prior attempt `k` in `[1, attempt-1]`:
   - Compute `intersection_k = files_changed_by_attempt[k] ∩ files_changed_by_attempt[attempt-1]`.
   - If `intersection_k` is non-empty AND, for at least one file in `intersection_k`, the diff in attempt `attempt-1` semantically reverses the diff in attempt `k` ...
```
Copied into Task 6 as the precedent for "deterministic revert": when a post-visual fix attempt's own re-review still fails, `git checkout` the touched files back to the last code-reviewer-APPROVED state, using the same `files_changed_by_attempt` bookkeeping already maintained by Phase A.2.

```
# SOURCE: plugins/relay/commands/relay-design-map.md:264-272
2. **Visual-tooling dependency install (best-effort).** Attempt a
   dry-run `npm install --prefix plugins/relay/scripts/visual/` if
   plugins/relay/scripts/visual/ exists. If it does not exist yet
   (it is Phase 6's deliverable, not shipped as of this phase), record
   a documented note: "plugins/relay/scripts/visual/ not present yet —
   visual regression tooling ships in Phase 6 of the Figma Implementation
   Track; this is expected, not an error." Never HALT on this absence.
```
Copied into Task 1/2 as the exact directory + provisioning-check convention `plugins/relay/scripts/visual/` must satisfy once it exists (this is the file that forward-referenced this very phase).

```
# SOURCE: docs/context/design-spec-template.md:111-113
| Frame (node-id) | Route | Preconditions | Auth mode | Viewport | Diff threshold | Ref PNG (path + dims) | Masks |
|-------------------|-------|----------------|-----------|----------|------------------|--------------------------|-------|
| {node-id} | {route} | {preconditions} | {auth mode} | {viewport} | {diff threshold} | `PRPs/designs/<feature>/refs/<node-id>.png` ({W}x{H}) | {optional masks, or "none"} |
```
Copied into Task 3/4/5 as the exact per-frame manifest shape `capture.mjs`/`compare.mjs`/`visual-verifier` read — every field (route, preconditions, auth mode, viewport, diff threshold, ref PNG path, masks) maps directly to a provisioning/capture/compare parameter.

```
# SOURCE: plugins/relay/agents/implementer.md:1-7
---
name: implementer
description: Autonomously transform an APPROVED plan into working-tree code (or a structured TEST_CONTRACT_DISPUTE verdict). ...
model: sonnet
color: green
tools: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash
---
```
Copied into Task 5 as the closest existing tools-allowlist precedent for an agent that must launch/monitor/kill a background process (the dev server) — `visual-verifier` adapts this shape minus `Edit` only (it never touches application source, but it DOES `Grep` the diff's touched CSS/token usage during degraded-rung triage, so `Grep` is retained).

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/scripts/visual/package.json` | CREATE | Self-contained dependency package (Playwright-class browser automation + pixelmatch-class AA-tolerant diff lib) — zero existing visual-tooling surface in this repo; kept separate from the root `package.json` (which has no runtime deps beyond the validate/eval tooling) per the PRD's explicit "100% new surface, self-contained" design note |
| `plugins/relay/scripts/visual/provision.mjs` | CREATE | Browser/Chromium provisioning with named exit codes distinguishing network-blocked vs. other failure, plus a dev-server readiness-probe helper |
| `plugins/relay/scripts/visual/capture.mjs` | CREATE | Boots the dev server (or reuses one already running), drives the headless browser through each in-scope frame's route/viewport/auth-mode, captures PNG screenshots |
| `plugins/relay/scripts/visual/compare.mjs` | CREATE | AA-tolerant pixel diff of captured vs. reference PNGs, mask-region support, per-frame diff-threshold scoring, writes `fidelity-report.json` |
| `plugins/relay/agents/visual-verifier.md` | CREATE | New agent — orchestrates provision → capture → compare via `Bash`, classifies each frame (`PASS`/`FAIL`/degradation rung), performs content-vs-style triage on failures, returns a structured verdict; writes a degraded-mode stub entry directly to `fidelity-report.json` when a degradation rung skips `compare.mjs` (so the artifact always reflects the outcome, not just `visual_outcome`); never edits application code, never queries the Figma MCP |
| `plugins/relay/commands/relay-implement.md` | UPDATE | Insert Phase A.3.4 (gate reusing `figma_track`/`design_source`, own bounded budget, dispatch, degradation ladder, post-visual re-review + deterministic revert) between the existing Phase A.3 and Phase A.3.5; extend the flags-first preamble with `--no-visual`; extend the Final output surface with a `Visual:` line whose PRESENCE (not just value) is gated on the new `figma_track_declared` derivation, so a project with `figma_track` absent/false sees no line at all |
| `documentation/assets/data/search-index.json` + `documentation/changelog.html` + `documentation/reference/agents.html` | UPDATE | Register `visual-verifier`; describe Phase A.3.4 and the degradation ladder |

## NOT Building (Scope Limits)

- **Full data/auth seeding beyond a single Playwright storage-state session** — data-heavy or dynamic screens degrade to manual QA rather than burning automated-fix budget; broader seeding is a future extension (explicit PRD Won't-item).
- **`/relay-qa-report` Visual Fidelity section** — surfacing `fidelity-report.json` to humans is Phase 7's job; this phase only produces the artifact.
- **Standalone `/relay-visual-review` command** — a Should-item explicitly deferred to Phase 7; this phase's loop lives entirely inside `/relay-implement`.
- **Self-improving component map auto-append** — Phase 7's `docs-updater` extension; unrelated to this phase's tooling.
- **Figma Code Connect write-back** — a Could-item requiring Figma file-edit permission; out of scope for the entire PRD's MVP.
- **Any new heuristic activation path or a duplicated methodology.md gating key** — the loop strictly reuses the already-declared `figma_track` + per-plan `design_source: figma`; it never invents a parallel `visual_track`-style key.
- **B7/B8 TDD-writer bounce-back for a disputed visual mismatch** — out of scope; a persistent `VISUAL_MISMATCH` after the one bounded post-visual re-review round degrades gracefully (`BUDGET_EXCEEDED_REVERTED`), it does not open a dispute-arbitration channel the way `TEST_CONTRACT_DISPUTE` does.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/scripts/visual/package.json

**ACTION**: Author a self-contained `package.json` for the new tooling package: `{name: "@relay/visual-tooling", private: true, type: "module", engines: {node: ">=18"}, dependencies: {playwright: "^1.4x", pixelmatch: "^5.x", pngjs: "^7.x"}, scripts: {postinstall: "playwright install --with-deps chromium"}}` (exact pinned versions are an implementation-time detail — record the family/major only here). Keep this package fully separate from the root `package.json` (no merge, no shared `node_modules` hoisting assumption) so a non-Figma project/clone of this repo never pays the Playwright/Chromium install cost.

**MIRROR**: `plugins/relay/commands/relay-design-map.md:264-272` (the exact directory this package must occupy, and the "not present yet" forward-reference this phase resolves).

**ADDRESSES**: AC-A3

**VALIDATE**: `if [ -f plugins/relay/scripts/visual/package.json ]; then node -e "JSON.parse(require('fs').readFileSync('plugins/relay/scripts/visual/package.json','utf8'))" && echo "PASS: valid package.json"; else echo "FAIL: package.json missing"; exit 1; fi`

### Task 2: CREATE plugins/relay/scripts/visual/provision.mjs

**ACTION**: Author a provisioning script exporting a `provision()` function that (a) checks whether Chromium is already installed for Playwright; (b) if not, attempts `playwright install --with-deps chromium` with a bounded timeout; (c) on success exits `0`; on a network-blocked/restricted-environment failure exits a distinct named non-zero code (e.g. `2`) and prints `PROVISION_FAILED_NETWORK`; on any other failure exits a different named non-zero code (e.g. `3`) and prints `PROVISION_FAILED_OTHER`. Also export a `waitForDevServer(url, {timeoutMs})` readiness-probe helper (poll HTTP GET with backoff) used by `capture.mjs` before navigating.

**MIRROR**: `plugins/relay/commands/relay-design-map.md:264-272` (dependency-install-as-best-effort framing) and `plugins/relay/commands/relay-implement.md:222-230` (named-outcome + budget-check shape, adapted to a provisioning exit-code taxonomy).

**ADDRESSES**: AC-A4

**VALIDATE**: `node --check plugins/relay/scripts/visual/provision.mjs`

### Task 3: CREATE plugins/relay/scripts/visual/capture.mjs

**ACTION**: Author a capture script that reads a JSON frame manifest (one entry per `## Visual Acceptance Criteria` row: node-id, route, preconditions, auth mode, viewport, ref PNG path) from a CLI arg, calls `provision.mjs`'s `waitForDevServer`, launches a headless browser (reusing a Playwright storage-state file when `auth mode` names one — never performing its own login flow), navigates to each `route` at the specified `viewport`, and writes one captured PNG per frame to a per-attempt output directory passed in as a CLI arg.

**MIRROR**: `docs/context/design-spec-template.md:111-113` (the exact manifest field set).

**ADDRESSES**: AC-A3

**VALIDATE**: `node --check plugins/relay/scripts/visual/capture.mjs`

### Task 4: CREATE plugins/relay/scripts/visual/compare.mjs

**ACTION**: Author a compare script that, for each frame, loads the captured PNG and the reference PNG (`PRPs/designs/<feature>/refs/<node-id>.png`), applies any named mask regions (blacked out in both images before diffing), runs an AA-tolerant pixel diff (pixelmatch-class, antialiasing-aware), computes a diff percentage, compares it against the frame's own `diff threshold`, and writes `fidelity-report.json` with one entry per frame: `{node_id, route, diff_percent, threshold, status: "PASS"|"FAIL", masked_regions}`. Never mutates the reference PNG.

**MIRROR**: `docs/context/design-spec-template.md:107-159` (per-frame contract + the "objective, machine-checkable fidelity contract" framing already anticipating this exact consumer).

**ADDRESSES**: AC-A3

**VALIDATE**: `node --check plugins/relay/scripts/visual/compare.mjs`

### Task 5: CREATE plugins/relay/agents/visual-verifier.md

**ACTION**: Author a new agent, frontmatter `{name: visual-verifier, description: <one paragraph — given a plan's ## Design Source table and the referenced APPROVED Design Spec, orchestrate provision → capture → compare via the plugins/relay/scripts/visual/ tooling, classify each frame, perform content-vs-style triage on FAIL frames before ever recommending a fix, and return a structured verdict (VISUAL_VERIFIED | VISUAL_DEGRADED | VISUAL_MISMATCH) plus the fidelity-report.json path; never edits application code; never queries the Figma MCP — reads only the already-persisted Design Spec and reference PNGs; dispatched non-interactively by /relay-implement's Phase A.3.4>, model: sonnet, color: cyan, tools: Read, Write, Glob, Grep, Bash, BashOutput, KillBash}`. Body: (1) role statement + explicit "never touches application source, never queries Figma MCP" boundary; (2) `## Inputs`: `plan_path`, `target_root`, `design_spec_path`, `attempt`, `diff_target`, `non_interactive`; (3) Protocol — read the plan's `## Design Source` table + the Design Spec's `## Visual Acceptance Criteria` section to build the frame manifest; call `provision.mjs` (branch on its exit code into the degradation ladder: `0` → proceed FULL, network-blocked → `DEGRADED_PROVISION_FAILED`, dev-server readiness-probe timeout inside `capture.mjs` → `DEGRADED_STATIC_ONLY`); on `FULL`, call `capture.mjs` then `compare.mjs`; on either degraded rung, skip pixel capture/compare and instead run a lightweight static check (`Grep` the diff's touched CSS/token usage against the Design Spec's `## Token Map` for gross conformance) so degradation still verifies *something*, never nothing — AND, because `compare.mjs` (the only component that writes `fidelity-report.json`) was skipped, write a degraded-mode stub entry directly to that same `fidelity-report.json` path, one per in-scope frame: `{node_id, route, diff_percent: null, threshold, status: "DEGRADED_STATIC_ONLY"|"DEGRADED_PROVISION_FAILED", token_conformant: true|false}`, so the degradation is visible in the artifact itself, not only in Phase A.3.4's `visual_outcome` (AC-A4); (4) classify: all frames PASS (or degraded-but-token-conformant) → `VISUAL_VERIFIED`; a degradation rung was hit → `VISUAL_DEGRADED` (still non-blocking); any frame FAIL after triage confirms it is a genuine style regression (not acceptable dynamic content already covered by a mask) → `VISUAL_MISMATCH`; (5) Anti-patterns section (no Figma MCP, no application-code edits, no silent skip of a degradation ladder rung).

**MIRROR**: `plugins/relay/agents/implementer.md:1-30` (tools shape adapted, Bash/BashOutput/KillBash for process management), `plugins/relay/agents/docs-updater.md:1-36` (writer-agent inputs-table + `non_interactive` handling shape).

**ADDRESSES**: AC-A3, AC-A4

**VALIDATE**: `grep -q "^name: visual-verifier" plugins/relay/agents/visual-verifier.md && grep -q "VISUAL_VERIFIED" plugins/relay/agents/visual-verifier.md && grep -q "DEGRADED_STATIC_ONLY" plugins/relay/agents/visual-verifier.md && grep -q "never queries the Figma MCP" plugins/relay/agents/visual-verifier.md && grep -q "fidelity-report.json" plugins/relay/agents/visual-verifier.md`

### Task 6: UPDATE plugins/relay/commands/relay-implement.md

**ACTION**: Four additive changes, all preserving today's non-Figma behavior byte-for-byte. (a) In `## Parse arguments`, extend the existing `--no-docs` flag-extraction preamble with a sibling `--no-visual` extraction, recording `no_visual_flag` (default `false`). (b) In Phase A.0, alongside the existing `docs_sync_enabled` derivation, derive `visual_verification_enabled = figma_track (methodology.md) == true AND this plan's Metadata design_source == "figma"` — reusing both existing declarations verbatim, never a new methodology.md key. ALSO derive a second, narrower flag `figma_track_declared = figma_track (methodology.md) == true` — the project-level-only component of the gate above (independent of any single plan's `design_source`), used solely in (d) below to decide whether the Final output surface's `Visual:` line appears AT ALL. (c) Insert a new `### Phase A.3.4 — Visual-verification dispatch` section immediately BEFORE the existing `### Phase A.3.5 — Docs-sync dispatch` heading, triggered exactly once when Phase A.3 standard-mode returns APPROVED (never on arbitration-mode), structured as: **Gate** — skip entirely (record `visual_outcome = "SKIPPED (--no-visual)"` or `"SKIPPED (not figma-sourced)"`) when `no_visual_flag == true` OR `visual_verification_enabled == false`; **Budget init** — `visual_review_attempts = 0`, `max_visual_retries = 2`, own budget independent of `max_implement_retries`; **Step A** — dispatch `visual-verifier` via `Task` with `{plan_path, target_root, design_spec_path: <from the plan's ## Design Source section>, attempt, diff_target: "<artifact_root><attempt>/diff.patch", non_interactive: true}`; **Step B** — branch on the returned verdict: `VISUAL_VERIFIED` → `visual_outcome = "APPROVED"`, proceed to Phase A.3.5; `VISUAL_DEGRADED` → record the named rung (e.g. `DEGRADED_STATIC_ONLY`), log a warning, proceed to Phase A.3.5 WITHOUT halting (this is the AC-5 non-blocking guarantee); `VISUAL_MISMATCH` → increment `visual_review_attempts`; if within `max_visual_retries`, dispatch one post-visual fix round (re-invoke `implementer` with the fidelity-report.json's failing frames as `prior_feedback`, then `code-reviewer` standard mode to re-approve the code change, then re-dispatch `visual-verifier`); if that round's `code-reviewer` step itself returns `CHANGES_REQUESTED`, OR the re-dispatched `visual-verifier` still returns `VISUAL_MISMATCH`, perform a **deterministic revert**: `git checkout <last code-reviewer-APPROVED commit/diff> -- <files touched by the fix attempt>` (using the same `files_changed_by_attempt` bookkeeping Phase A.2 already maintains) so the worktree returns to exactly the last APPROVED state, then set `visual_outcome = "BUDGET_EXCEEDED_REVERTED"` and proceed to Phase A.3.5 WITHOUT halting; if `visual_review_attempts` exceeds `max_visual_retries` without ever dispatching a fix round, set `visual_outcome = "BUDGET_EXCEEDED"` and proceed to Phase A.3.5 WITHOUT halting. No commit issued anywhere in this sub-phase (mirrors A.3.5's own note). (d) Extend the Final output surface (both PRD mode and PRD-less mode success-path messages) with a new `Visual: <visual_outcome>` line immediately after the existing `Docs:` line — but UNLIKE the always-present `Docs:` line, this line's very PRESENCE is itself gated on `figma_track_declared` (from (b) above), not just its value: when `figma_track_declared == false` (the target project has never opted into the Figma track at all), OMIT the `Visual:` line entirely — no line, no `SKIPPED` marker, nothing — so a non-Figma project's Final output surface stays byte-identical to today's (this is what PRD AC-1's "no Figma-related output appears anywhere" and this plan's AC-A2 require). When `figma_track_declared == true` but this specific plan's own Phase A.3.4 gate (`visual_verification_enabled`) was false (plan's `design_source` isn't `figma`, or `--no-visual` was passed), still emit the line reading `Visual: SKIPPED (not figma-sourced)` / `Visual: SKIPPED (--no-visual)` — since the project already opted in globally via `figma_track: true`, this per-plan skip marker is expected pipeline noise, not a today-behavior regression for that project.

**MIRROR**: `plugins/relay/commands/relay-implement.md:364-370` (gate + budget-init shape), `:239-250` (deterministic-revert precedent via `files_changed_by_attempt`), `:513-537` (Final output surface insertion point).

**ADDRESSES**: AC-A1, AC-A2, AC-A4

**VALIDATE**: `grep -q "Phase A.3.4" plugins/relay/commands/relay-implement.md && grep -q "no-visual" plugins/relay/commands/relay-implement.md && grep -q "BUDGET_EXCEEDED_REVERTED" plugins/relay/commands/relay-implement.md && grep -q "visual_verification_enabled" plugins/relay/commands/relay-implement.md && grep -q "figma_track_declared" plugins/relay/commands/relay-implement.md`

### Task 7: UPDATE documentation/assets/data/search-index.json + documentation/changelog.html + documentation/reference/agents.html

**ACTION**: Register the new `visual-verifier` agent in `search-index.json` and `reference/agents.html` (mirroring the existing agent entries' shape and section placement). Add an `Unreleased` entry to `changelog.html` describing: "Visual-verification loop — `plugins/relay/scripts/visual/` tooling, the `visual-verifier` agent, and `/relay-implement` Phase A.3.4 (provisioning, boot, bounded budget, degradation ladder, post-visual re-review with deterministic revert). Gated on the already-declared `figma_track`/`design_source: figma`, never a new heuristic. Part of the Figma Implementation Track, Phase 6 of `PRPs/prds/figma-implementation-track.prd.md`." No new versioned `<h2>`; no `plugin.json` bump.

**MIRROR**: the existing agent entries on `reference/agents.html`/`search-index.json`; Phases 3/4/5's own `Unreleased` entries in `changelog.html`.

**ADDRESSES**: AC-A3

**VALIDATE**: `grep -q "visual-verifier" documentation/assets/data/search-index.json && grep -q "visual-verifier" documentation/reference/agents.html && grep -qi "Phase A.3.4" documentation/changelog.html`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
node --check plugins/relay/scripts/visual/provision.mjs
node --check plugins/relay/scripts/visual/capture.mjs
node --check plugins/relay/scripts/visual/compare.mjs
node -e "JSON.parse(require('fs').readFileSync('plugins/relay/scripts/visual/package.json','utf8'))"
```

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
grep -q "^name: visual-verifier" plugins/relay/agents/visual-verifier.md
grep -q "never queries the Figma MCP" plugins/relay/agents/visual-verifier.md
grep -q "fidelity-report.json" plugins/relay/agents/visual-verifier.md
grep -q "Phase A.3.4" plugins/relay/commands/relay-implement.md
grep -q "DEGRADED_STATIC_ONLY" plugins/relay/commands/relay-implement.md
grep -q "DEGRADED_PROVISION_FAILED" plugins/relay/agents/visual-verifier.md
grep -q "figma_track_declared" plugins/relay/commands/relay-implement.md
if grep -nE "search_design_system|get_metadata|get_code_connect_map" plugins/relay/agents/visual-verifier.md; then
  echo "FAIL: visual-verifier references a Figma MCP tool"; exit 1
else
  echo "PASS: visual-verifier carries no Figma MCP reference"
fi
```

**Level 3 — INTEGRATION**
```bash
set -euo pipefail
# Diff-scoped inertness check: no forbidden .claude/PRPs reference introduced
# outside the standard quoted-prohibition idiom (established fix from
# Phases 2-5 of this same feature).
if git diff --unified=0 development -- plugins/relay/scripts/visual/ plugins/relay/agents/visual-verifier.md plugins/relay/commands/relay-implement.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced outside quoted prohibitions"
fi
# Confirm the new Phase A.3.4 sits strictly between A.3 and A.3.5 (ordering invariant).
node -e "
const fs = require('fs');
const text = fs.readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const iA3 = text.indexOf('### Phase A.3 —');
const iA34 = text.indexOf('### Phase A.3.4 —');
const iA35 = text.indexOf('### Phase A.3.5 —');
if (iA3 === -1 || iA34 === -1 || iA35 === -1 || !(iA3 < iA34 && iA34 < iA35)) {
  console.error('FAIL: Phase A.3.4 is not positioned strictly between Phase A.3 and Phase A.3.5');
  process.exit(1);
}
console.log('PASS: Phase A.3.4 ordering confirmed');
"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-5):** Given the visual-verification loop's `max_visual_retries` budget is exhausted, or a named degradation condition (dev-server boot failure, provisioning failure) is hit, when Phase A.3.4 completes, then the outcome (`visual_outcome`) is recorded — never silently dropped — and the pipeline proceeds to Phase A.3.5 (docs-sync) and Phase A.4 (D8 mutations) rather than halting.
- **AC-A2 (PRD AC-5, PRD AC-1):** Given a project where `figma_track` is absent/false (`figma_track_declared == false`), when `/relay-implement` reaches the point where Phase A.3.4 would run, then the entire sub-phase is skipped with zero visible artifact/output difference from today's behavior — no `fidelity-report.json`, no `visual-verifier` dispatch, and no `Visual:` line of any kind (not even a `SKIPPED` marker) in the Final output surface, satisfying PRD AC-1's "no Figma-related output appears anywhere" verbatim. Given instead a `figma_track: true` project (`figma_track_declared == true`) whose plan's `design_source` Metadata reads `none`/is absent, or `--no-visual` was passed, the sub-phase is likewise skipped, but because the project has already opted into the visual-verification capability at the methodology level, a `Visual: SKIPPED (not figma-sourced)` / `Visual: SKIPPED (--no-visual)` marker line IS shown — this per-plan skip marker is expected pipeline noise for an opted-in project, distinct from the true "figma_track absent" case above, and does not violate PRD AC-1 (which is scoped to projects that have not opted in).
- **AC-A3 (PRD AC-5):** Given a real implementation attempt against an APPROVED Design Spec's `## Visual Acceptance Criteria` table, when `visual-verifier` completes, then a `fidelity-report.json` exists with one entry per in-scope frame carrying an explicit `PASS`/`FAIL` status and diff score.
- **AC-A4 (PRD AC-5):** Given the dev server fails to boot within its readiness-probe timeout, when `visual-verifier` runs, then it degrades to `DEGRADED_STATIC_ONLY` (still verifying token conformance) rather than crashing or silently skipping, the degradation is visible in both `fidelity-report.json` and Phase A.3.4's recorded `visual_outcome`, and delivery is not blocked.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pixel-diff noise across renderers causes false positives/negatives (PRD Technical Risk) | M | Medium | AA-tolerant diffing (pixelmatch-class, antialiasing-aware), named mask regions for dynamic content, content-vs-style triage in `visual-verifier` before ever emitting `VISUAL_MISMATCH`, tolerance-band adjudication at the threshold boundary |
| Visual-tooling provisioning fails in restricted network/CI-like environments (PRD Technical Risk) | M | Medium | Dedicated `provision.mjs` step with named exit codes distinguishing network-blocked vs. other failure; `DEGRADED_PROVISION_FAILED`/`DEGRADED_STATIC_ONLY` rungs that still record an outcome and never block Phase A.3.5/A.4 |
| Surgical edit to `relay-implement.md` (a live, shared command used by every relay feature, not just Figma ones) risks subtly breaking today's non-Figma implement flow | M | High | Every new instruction block is gated behind the reused `figma_track`/`design_source: figma` check with an explicit "skip entirely when false" fallback; Level 1 (`npm run validate`) and Level 3's diff-scoped dry-run both exercise the unchanged path against this repo's own `figma_track`-absent state |
| `research-codebase`/`research-web` subagent dispatch was unavailable in this authoring session (`Task` tool disabled in this execution context) — grounding performed directly by `plan-writer` via `Read`/`Glob` instead | N/A (authoring-time only) | Low | Every Patterns to Mirror snippet above still carries a real `file:line` citation obtained via direct `Read`; none are invented. `/relay-plan-review` should independently confirm R1/R3 pass despite the substitution before this plan is APPROVED |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` is declared, so the pair is active test-after. Mirroring this feature's own `figma-track-phaseN.test.mjs` convention (`scripts/validate/checks/figma-track-phase5.test.mjs` is the most recent precedent), expect the test pair to author a `figma-track-phase6.test.mjs` content-invariant suite exercising AC-A1/AC-A2 (the inertness/skip guarantee) and the frontmatter/tools-allowlist shape of the new `visual-verifier` agent — the Implementer authors ZERO test files itself (R-X strict).

**Research subagent dispatch degradation (this authoring session):** `Task` was reported as "not enabled in this context" when this plan-writer attempted to dispatch `research-codebase` and `research-web` in Phase 2 (GROUNDING). Per the plan-writer's own degradation-handling contract (treat an unusable research return as partial, continue, never halt), grounding for this plan was performed directly via `Read`/`Glob` against the same roots research-codebase would have used (`plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-design-map.md`, `plugins/relay/agents/`, `docs/context/design-spec-template.md`, `docs/context/methodology.md`). No web research (industry Playwright/pixelmatch conventions) was performed at all in this session — the Implementer should independently sanity-check the `provision.mjs`/`compare.mjs` library choices against current Playwright/pixelmatch documentation before finalizing version pins in Task 1.

**`design_source` routing does not apply to this plan.** The calling context flagged that "design_source routing applies" for this dispatch, anticipating a third `research-design` GROUNDING subagent per `plan-writer.md` Phase 2's conditional third bullet. Checked directly: `docs/context/methodology.md` in this target project does not declare `figma_track: true` (confirmed by reading its frontmatter — only `tdd`, `tdd_evidence`, `test_frameworks`, `docs_sync` are present), and the source PRD (`figma-implementation-track.prd.md`) carries no `## Design Source` section. Per the plan-writer's own non-heuristic contract, `design_source` is therefore correctly omitted from this plan's Metadata, no `## Design Source` section is emitted, and `research-design` was correctly NOT dispatched (its conditional trigger — an available `design_spec_path` — never held). This is expected: this repo is relay's own source, not a Figma-enabled downstream project; a future downstream project building a feature FROM this shipped capability is where `design_source: figma` will actually appear.

**Gate-reuse design decision.** Rather than introducing a new `visual_verification`-style key in `docs/context/methodology.md` (which would duplicate `figma_track`'s already-established config-key-with-default contract), Phase A.3.4's gate is defined purely as `figma_track == true AND this plan's design_source == "figma"` — reusing two declarations that already exist and are already non-heuristically sourced. This keeps the gate strictly narrower than `docs_sync` (which applies to every plan) while avoiding config-key proliferation. `figma_track_declared` (Task 6(b)/(d), added in this retry to fix R-COH-AC-TASK-DECOUPLED against AC-A2) is likewise not a new key — it is a purely local, in-command derivation of the same existing `figma_track` declaration, scoped narrowly to deciding the Final output surface's `Visual:` line PRESENCE, independent of the per-plan `design_source` component of the broader gate.

---

*Generated: 2026-07-23*
*Approved: 2026-07-23*
*Implemented: 2026-07-23*
*Status: IMPLEMENTED*
