# Figma Implementation Track

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions, cross-cutting patterns, reuse or creation of components
- Decisions found: [2026-04-19] Interactivity boundary (PRD interactive, downstream autonomous); [2026-04-19] Command surface — writer/reviewer split, one command per stage; [2026-04-19] PRP artifacts live under `PRPs/`, never `.claude/`; [2026-05-14] `phase_type` Metadata-field precedent (non-heuristic per-plan declaration, reviewer structural enforcement); [2026-05-18] Pillar 2/3 boundary — `/relay-execute` never commits/PRs; [2026-07-09] PRD `DRAFT→APPROVED` flip ownership is invocation-context-scoped; [2026-07-10] Test pair universalized (activation on declared `test_frameworks`, `tdd:` selects ordering only); [2026-07-16] Docs-sync relocated to Pillar 2 (implement-time, non-interactive gated sub-phase)
- Applicable anti-patterns: activating any pipeline track by heuristic (must be explicit declaration only); writing pipeline artifacts under `.claude/`; relying on interactive permission prompts inside the autonomous loop
- Applicable architectural rules: interactivity boundary is fixed at PRD approval — nothing after that point may dialogue with the user except explicitly-recorded extensions; `PRPs/` artifact convention; the source PRD's Implementation Phases table is the orchestrator's state machine; one command per stage with writer/reviewer split
- Result: PROCEED
```

## Problem Statement

Frontend developers — including the feature owner themselves — spend disproportionate time and many rounds of prompt iteration implementing layouts that are already fully specified in Figma, because describing a feature in prose is not enough for an agent to reproduce a precise design: the agent has no reliable way to know what to reuse versus build new, nor how closely the result must match visually. The cost is measured in hours of prompt writing and revision per feature, frequent divergence from the intended visual result, and duplicated components that fragment the design system over time.

## Evidence

- User's own account: implementing a Figma-designed layout today requires "muita interação com a IA, horas de escrita e revisão de prompts," and the result "muitas vezes foge bastante ao esperado" / "nem sequer chega perto do que está no figma."
- Figma's own data: without design-system context, only 32% of designers and developers trust AI-generated code (figma.com/blog/design-systems-ai-mcp).
- Independent 2026 survey of design-to-code tools (Builder.io, Anima, Locofy, TeleportHQ, Quest): un-mapped tools reliably produce duplicate components; only 1 of 5 surveyed meaningfully reuses existing code components (altersquare.io).
- Without a shared design/code vocabulary (tokens), colors and spacing get hardcoded or guessed on every generation pass (medium.com/@aliafsah1988).

## Proposed Solution

Add an explicit, opt-in Figma implementation track to the relay pipeline: a per-project versioned component map plus a per-feature Design Spec — a human-approved contract that pins reference screenshots, design tokens, component-reuse mapping, and business interpretation before any code is written — consumed by the existing autonomous pipeline via a mandatory, non-heuristic `design_source` declaration, and closed by a bounded, non-blocking visual-verification loop inside `/relay-implement`. This approach was chosen over letting agents query the Figma MCP ad hoc per feature because both market and academic evidence show that a structured, human-validated intermediate artifact — not direct design-to-prompt translation — is what prevents fidelity collapse and duplicate-component creation.

## Key Hypothesis

We believe correctly mapping the Figma layout to the feature — via a versioned component map and an explicitly approved Design Spec — will accelerate and de-risk frontend implementation for developers.
We'll know we're right when the time and effort required to implement a layout correctly and faithfully drops drastically, measured via the Success Metrics below.

## What We're NOT Building

- Full data/auth seeding beyond a single Playwright storage-state session — data-heavy or dynamic screens degrade to a manual QA case instead of burning automated-fix budget; broader seeding is a future extension.
- Figma Code Connect write-back — requires Figma file-edit permission the developer often lacks; recorded as a Could-item, not MVP.
- Cross-project / cross-repository component maps — the map is versioned per target project, matching how the design system is actually consumed (npm package + local clone) in that project.
- Special handling for PRDs authored before this feature exists — explicitly excluded by product decision; the `design_source` declaration requirement halts loudly rather than guessing when absent, with no legacy carve-out.
- Any activation by heuristic (detecting Figma-shaped references, inferring intent from an informally pasted URL) — relay's existing anti-pattern against heuristic pipeline activation (`docs/anti-patterns.md`) applies identically here; activation is by explicit declaration only.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Human time per Figma-driven feature | < 30 min of active human effort per feature (initial estimate; no baseline exists yet — reassess after ~10-20 real feature runs, mirroring this repo's own `max_test_retries` reassess-trigger convention) | Wall-clock from `/relay-prd` invocation to `/relay-qa-report`, per feature |
| Component reuse rate | ≥ 80% of mapped Figma nodes resolve to REUSE, not NEW, once the component map matures (initial estimate) | `component-map.md` REUSE vs. NEW rows in each Design Spec's Implementation Delta, aggregated across features |
| Visual fidelity at first pass | ≥ 90% of plan-scoped frames within the visual-verifier's diff threshold on the Implementer's first attempt (initial estimate) | % of plan-scoped frames scoring within threshold in `fidelity-report.json`, before any fix dispatch |
| Manual adjustment rounds post-delivery | ≤ 1 round of human-requested changes per feature after `/relay-qa-report` (initial estimate) | Count of human-requested changes after `/relay-qa-report`, tracked manually per feature until telemetry exists |

## Acceptance Criteria (test scenarios)

- **AC-1 Inert when off:** Given a project where `figma_track` is absent or `false` in `docs/context/methodology.md`, when any relay command runs, then no Figma-related section, output, or artifact appears anywhere in that run.
- **AC-2 Reuse enforced:** Given a Design Spec that cites a REUSE component-map row for a Figma node, when the Implementer or Code Reviewer processes the corresponding task, then a new component file for that node is never created — the code-reviewer's coherence check fails the diff if it is, citing the mapped import path.
- **AC-3 Explicit human approval required:** Given a Design Spec that has passed its structural rubric (evidence-backed, zero unresolved ambiguity), when it has not yet received the user's own explicit confirmation, then its status remains DRAFT and no downstream plan may treat it as APPROVED.
- **AC-4 Non-heuristic declaration always present:** Given a project with `figma_track: true`, when plan-writer generates any plan (or prd-writer generates any PRD phase), then the artifact's Metadata carries a `design_source: figma | none` value — plan-reviewer/prd-reviewer return CHANGES_REQUESTED if it is absent, and never infer the value themselves.
- **AC-5 Visual loop bounded and non-blocking:** Given the visual-verification loop in `/relay-implement` exhausts its retry or time budget, or hits a named degradation condition (e.g., the dev server fails to boot), when Phase A.3.4 completes, then the outcome is recorded (never silently dropped) and the pipeline proceeds to docs-sync and the D8 mutations rather than halting.

## Open Questions

- [ ] The four Success Metrics targets above are initial best-effort estimates with no baseline — validate and recalibrate them against real usage after ~10-20 feature runs.
- [ ] Pilot project: which concrete React/Next.js repository serves as the first dogfood target, and confirmation of that project's design-system package name, local clone path, and any auth requirements for the visual loop.

---

## Users & Context

**Primary User**
- **Who:** The developer responsible for implementing a given feature — including the plugin's own maintainer — working in a React/Next.js project with the relay plugin installed.
- **Current behavior:** Writes a long, detailed prose description of the desired layout and behavior for the agent, then iterates through multiple rounds of manual review and correction prompts.
- **Trigger:** A feature whose frontend layout is already finalized in Figma reaches planning time.
- **Success state:** The developer pastes the Figma URL at PRD time, answers a small bounded set of genuinely ambiguous questions, confirms the resulting Design Spec once, and the rest of the pipeline runs autonomously to a faithful result.

**Job to Be Done**
When I have a feature with a layout already finalized in Figma, I want the AI to implement it faithfully to the design without me writing detailed prompts or reviewing line by line, so I can deliver frontend at the same pace I already deliver backend with relay.

**Non-Users**
Projects without `figma_track: true` — the existing relay flow is completely unchanged for them. Designers (they interact with Figma directly, not with this track). End-users of the application being built (they consume the shipped product, not this pipeline).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `figma_track` project-level opt-in key (default off) + MCP-access spike resolving the extraction architecture | Nothing else in this feature can activate without this gate and this architectural decision |
| Must | Versioned per-project component map (`docs/design/component-map.md`) with writer/reviewer pair | Directly attacks duplicate-component creation — confirmed as the market's biggest unsolved gap |
| Must | Per-feature Design Spec with mandatory explicit human approval (never auto-flip) | The single point of contact with the Figma interpretation; everything downstream trusts it blindly |
| Must | `design_source: figma \| none` mandatory, non-heuristic Metadata declaration on every plan/PRD phase when the track is on | Prevents silent ambiguity between "no Figma applies" and "forgot to check" |
| Must | Bounded, non-blocking visual-verification loop inside `/relay-implement` | Closes the fidelity loop without becoming a delivery gate |
| Should | `/relay-visual-review` standalone command | Lets a developer re-check fidelity after manual tweaks without re-running the whole pipeline |
| Should | Self-improving component map (auto-appended verified rows per shipped feature) | Amortizes the one-time setup cost across every future feature |
| Could | Figma Code Connect write-back | Requires file-edit permission on the Figma file the developer may not hold |
| Won't | Full data/auth seeding beyond storage-state MVP | Data-heavy screens degrade to manual QA by design, not by gap |
| Won't | Cross-project component maps | The map is scoped to how the design system is actually consumed per project |
| Won't | Legacy-PRD retrofitting or lenient defaults for pre-existing PRDs | Explicit product decision — the declaration requirement halts loudly rather than guessing |

### MVP Scope

The full 7-step rollout described in Implementation Phases below IS the MVP — each phase ships something independently observable and useful (the component map alone already reduces duplicate components even before the Design Spec or visual loop exist), so there is no smaller slice that still validates the Key Hypothesis without also validating each phase's own sub-claim.

### User Flow

`/relay-prd` with the feature description + Figma URL → (autonomous) Figma extraction + draft Design Spec with an ambiguity list → developer answers the batched ambiguity questions (max 2 rounds) → developer reviews the full spec (component mapping, reference screenshots, implementation delta) and gives explicit confirmation → spec locks as APPROVED, PRD gains the Design Source section → `/relay-execute` runs plan → plan-review → implement (including the visual loop) → docs-sync → tests, per phase, fully autonomous → `/relay-qa-report` surfaces visual fidelity per frame → `/relay-commit` → `/relay-pr` → `/relay-approve`, unchanged from today.

---

## Technical Approach

**Feasibility:** MEDIUM

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — `test_frameworks: ["node:test"]` is declared, so the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review, for every phase of this feature.

### Architecture Notes

- Every new agent/command follows the existing writer/reviewer pair shape (DRAFT→APPROVED flip owned by the reviewer, verdict logged to a `.jsonl`) — no new pattern invented.
- The visual-verification loop is a structural clone of `/relay-implement`'s Phase A.3.5 docs-sync gated sub-phase (flag extraction, config-key gate with a default, own bounded retry budget, graceful degradation that never blocks delivery) — the closest existing precedent to what this feature needs.
- `design_source` reuses the `phase_type` Metadata-field shape but diverges deliberately: `phase_type` is inferred and self-healed by the reviewer when absent; `design_source` is NEVER inferred — its absence is a structural CHANGES_REQUESTED, because "has Figma or not" is a business decision, not a mechanical code-shape inference.
- All Figma MCP calls are made from the interactive commands (`/relay-design-map`, `/relay-design-spec`), never from Task-dispatched writer/reviewer subagents, pending confirmation from the Phase 2 spike — this keeps the entire autonomous stretch (everything after PRD approval) structurally independent of Figma/MCP availability.
- No existing precedent in this codebase for MCP tools, image reading, or dev-server orchestration exists (confirmed by codebase research) — the visual loop's tooling (`plugins/relay/scripts/visual/`) is 100% new surface, self-contained with its own dependency package rather than reusing anything.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Figma MCP tools may not be reachable from Task-dispatched subagents | M | Phase 2 spike resolves this before any writer/reviewer pair is built; the baseline design (MCP calls in interactive commands only) does not depend on the spike passing |
| Pixel-diff noise across renderers causes false positives/negatives in the visual loop | M | Confirmed as an industry-wide problem, not unique to this feature; mitigated by AA-tolerant diffing, mask regions for dynamic content, content-vs-style triage before any fix dispatch, and a tolerance band with LLM adjudication at the boundary |
| Visual-tooling provisioning (Playwright/Chromium, dev-server boot) fails in restricted network/CI-like environments | M | Dedicated provisioning budget with named exit codes; graceful `DEGRADED_STATIC_ONLY` fallback that still verifies token conformance rather than skipping verification entirely |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Foundations | `figma_track` key in context-builder (default off); `docs/design-system.md` generated-doc registration gated on the key; new deterministic gating-structure check + artifact-naming/path-existence extensions in `npm run validate`; advisory structural-absence eval fixtures | complete | - | - | PRPs/plans/figma-implementation-track-phase-1-foundations.plan.md |
| 2 | MCP-access spike | Task-dispatch a tools-omitted test agent in a session with the Figma MCP connected; confirm whether `get_metadata` is callable; the outcome selects the extraction architecture for later phases without blocking any of them either way | complete | - | 1 | PRPs/plans/figma-implementation-track-phase-2-mcp-access-spike.plan.md |
| 3 | Component map | `/relay-design-map` command + `design-map-writer`/`design-map-reviewer` pair + `component-map.md` format (component-key rows, CM-ids, Conventions, UNMAPPED, truncation marker) + evidence-bundle persistence + review jsonl + preflight incl. scratch-worktree dry-run boot | complete | - | 1 | PRPs/plans/figma-implementation-track-phase-3-component-map.plan.md |
| 4 | Design Spec | `/relay-design-spec` command (chunked MCP traversal, node-id normalization, budgets) + `design-spec-writer`/`design-spec-reviewer` pair with mandatory explicit human approval + `design-spec-template.md` + `PRPs/designs/` layout + re-pin lifecycle + stuck detection | complete | - | 2, 3 | PRPs/plans/figma-implementation-track-phase-4-design-spec.plan.md |
| 5 | Plan integration | Conditional `## Design Source` section registered in both plan and PRD templates + `design_source` mandatory Metadata field (non-heuristic) + `plan-writer` third parallel grounding subagent (`research-design`) + `plan-reviewer`/`prd-reviewer` structural checks | complete | - | 4 | PRPs/plans/figma-implementation-track-phase-5-plan-integration.plan.md |
| 6 | Visual loop | `plugins/relay/scripts/visual/` tooling + `visual-verifier` agent + `/relay-implement` Phase A.3.4 (provisioning, boot, budgets, degradation ladder, post-visual re-review with deterministic revert) | complete | - | 5 | PRPs/plans/figma-implementation-track-phase-6-visual-loop.plan.md |
| 7 | Surface integration + self-improvement | PRD-side three-site registration; `/relay-qa-report` Visual Fidelity section; `relay-execute`/`relay-pr` wiring; self-improving map appends via `docs-updater`; standalone `/relay-visual-review`; end-to-end dogfood on a real project | complete | - | 6 | PRPs/plans/figma-implementation-track-phase-7-surface-integration.plan.md |

### Phase Details

**Phase 1: Foundations**
- **Goal:** Establish the opt-in surface and the "nothing changes when off" guarantee before any feature-facing component exists.
- **Scope:** `methodology.md` gains `figma_track: false` default; `npm run validate` gains the gating-structure check; no agent or command is user-facing yet.
- **Success signal:** `npm run validate` passes; a project with the key absent/false shows zero behavioral difference anywhere.

**Phase 2: MCP-access spike**
- **Goal:** Resolve, empirically, whether Task-dispatched subagents in this environment can call Figma MCP tools directly.
- **Scope:** One bounded spike dispatch and a documented outcome; no production agent/command changes.
- **Success signal:** A recorded pass/fail outcome that Phase 4's design explicitly branches on, with the baseline (MCP calls in interactive commands) valid regardless of the result.

**Phase 3: Component map**
- **Goal:** Give every Figma-enabled project a versioned, human-curatable map from Figma library components to real code components.
- **Scope:** `/relay-design-map`, the writer/reviewer pair, `component-map.md` format, one-time setup flow including the visual-tooling preflight.
- **Success signal:** A real project's component map is APPROVED and committed; `figma_track: true` is flipped.

**Phase 4: Design Spec**
- **Goal:** Turn a Figma URL into a human-approved, business-grounded, evidence-backed intermediate contract for one feature.
- **Scope:** `/relay-design-spec`, the writer/reviewer pair, the template, the mandatory explicit-approval gate.
- **Success signal:** A real feature produces an APPROVED Design Spec that a human reviewed and confirmed, with zero unresolved ambiguity.

**Phase 5: Plan integration**
- **Goal:** Make every plan/PRD phase declare its Figma relationship explicitly and non-heuristically.
- **Scope:** Template registration in both plan and PRD templates, `design_source` field, reviewer structural checks, `research-design` grounding subagent.
- **Success signal:** A plan generated from an APPROVED Design Spec carries a correct `## Design Source` section and passes plan-review; a plan with no Figma involvement carries `design_source: none` and is unaffected otherwise.

**Phase 6: Visual loop**
- **Goal:** Close the fidelity loop automatically, within a bounded budget, without ever blocking delivery.
- **Scope:** Capture/compare tooling, the `visual-verifier` agent, `/relay-implement` Phase A.3.4 including its full degradation ladder.
- **Success signal:** A real implementation attempt produces a `fidelity-report.json` with per-frame scores, and at least one degradation rung (e.g., `DEGRADED_STATIC_ONLY`) is exercised and confirmed non-blocking.

**Phase 7: Surface integration + self-improvement**
- **Goal:** Make the track's outputs visible everywhere a human already looks (QA report, PR body) and let the component map improve itself over time.
- **Scope:** PRD-side registration, `/relay-qa-report` Visual Fidelity section, `docs-updater` auto-append, `/relay-visual-review`, end-to-end dogfood.
- **Success signal:** One real feature runs the full pipeline end to end, including a multi-phase PRD and at least one auth-gated route, and the map gains at least one `verified:auto` row without human intervention.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Design interpretation control model | Design Spec pair behaves like `prd-writer`/`prd-reviewer` (interactive, mandatory explicit human approval) | Behave like `plan-writer`/`plan-reviewer` (autonomous auto-flip on rubric pass) | The Figma interpretation is the single point of business judgment the user explicitly worried about; it happens inside the interactive stretch of the pipeline, the same zone where PRD approval already requires the user's own confirmation |
| `design_source` declaration | Mandatory, non-heuristic Metadata field on every plan/PRD phase when `figma_track: true`; absence is a structural CHANGES_REQUESTED, never inferred | Mirror `phase_type`'s self-healing inference | User-requested correction: even Figma-enabled projects will have recurring non-Figma features; silent absence is ambiguous between "doesn't apply" and "forgot to check" — inference would reintroduce exactly that ambiguity |
| Legacy PRDs | No special handling; a project turning on `figma_track: true` mid-flight halts loudly on any in-flight PRD lacking the declaration | Graceful default (`design_source: none`) for pre-existing PRDs | Explicit user decision — legacy PRDs are out of scope |
| MVP scope | All 7 phases as one PRD, phased rollout | Split into multiple PRDs per phase group | Matches this repo's own established phased-rollout convention (2026-04-19 decision) and the existing Implementation Phases table mechanism — no smaller slice validates the Key Hypothesis |
| Figma MCP access point | Interactive commands only (never Task-dispatched subagents), pending the Phase 2 spike | Design writer/reviewer agents call the MCP directly | The `tools:` allowlist in `agent.schema.json` is a fixed comma-separated list; MCP server tool names are install-specific; the interactive commands provably run in the main session where the MCP and ToolSearch exist |

## Research Summary

**Market Context**

Figma's own materials confirm the premise: without design-system context, only 32% of designers and developers trust AI-generated code, and Figma positions Code Connect + MCP explicitly as the fix (figma.com/blog/design-systems-ai-mcp). Independent surveys of design-to-code tools (Builder.io, Anima, Locofy, TeleportHQ, Quest — altersquare.io, 2026) found that un-mapped tools reliably produce duplicate components, and only one of five meaningfully reuses existing code (~70% mapping accuracy); the rest generate deeply-nested, non-modular code needing manual cleanup. A separate analysis (medium.com/@aliafsah1988) attributes fidelity loss to a vocabulary mismatch between Figma's design language and code's component/token language, absent a shared intermediate contract — directly motivating this feature's Design Spec and embedded token table. An academic ablation (arxiv.org/html/2603.14724v1) shows that removing a structured intermediate representation in LLM-driven UI generation collapses output quality even when the raw output stays syntactically valid — direct validation of the Design Spec's role as a structured contract rather than a formality. On the verification side, a visual-regression tooling comparison (getautonoma.com) found that naive pixel-diff tools produce high false-positive rates on AI-generated UI because they cannot distinguish intentional change from regression — validating this feature's content-vs-style triage and tolerance-band design rather than a hard pixel threshold. Gaps: the literal-transcription-vs-business-context interpretation problem was not directly addressed in any source found — it appears to be a genuine product-judgment gap this feature is first to name, not a solved problem being replicated; a reported Figma MCP server security concern (data interception/exfiltration) surfaced in search results but was not independently verified against a primary source and should be validated before the MCP-access spike.

**Technical Context**

Codebase research confirms every non-Figma-specific mechanism this feature needs already has a working precedent in this exact repository: the writer/reviewer DRAFT→APPROVED flip pattern (`plan-reviewer.md:86-90,658-704`); the gated optional sub-phase shape this feature's visual loop clones (`relay-implement.md:364-419`, the docs-sync Phase A.3.5); the non-heuristic config-key-with-default convention (`docs/context/methodology.md:1-6,45-76`, `docs_sync`); and the `phase_type` Metadata-field precedent for a non-heuristic per-plan declaration with reviewer-side structural enforcement (`plan-reviewer.md:512-570`, `plan-writer.md:488-526`) — the direct architectural ancestor of this feature's `design_source` field, though this feature deliberately diverges by never letting the reviewer infer the value. Both mandatory-section-order enforcement (`plan-reviewer.md:118-146`; `plan-template.md:21-70`; `prd-template.md:16-42`) and the "Relay adaptations (mandatory extensions)" registration point in both templates are established, reusable patterns. Conversely, research confirmed a genuine gap: no MCP tool, image/screenshot reading, or dev-server orchestration exists anywhere in the current plugin (`implementer.md:6`, `code-reviewer.md:6` tool allowlists checked) — this feature's Figma extraction and visual-verification tooling are 100% new surface with no existing code to reuse, only patterns to mirror. `prd-writer.md:456-457` itself already names "Figma-to-spec preprocessing" as an explicit out-of-scope deferral pointing at "separate PRD" — this PRD is that deferral being resolved.

---

*Generated: 2026-07-22*
*Approved: 2026-07-22*
*Status: APPROVED*
