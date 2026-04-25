# Plan Authoring (`/relay-plan` + `/relay-plan-review`)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation; new commands + agents; impacts orchestrator and downstream pipeline (Implementer, Test Runner, TDD agents)
- Decisions found:
  - [2026-04-19] Command surface: one command per stage, writer/reviewer split — `/relay-plan` (writer) + `/relay-plan-review` (reviewer) are canonical, separate commands.
  - [2026-04-19] PRP artifact paths under `PRPs/`, never `.claude/` — plan output goes to `PRPs/plans/`.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — plan stage runs without user dialogue; auto-approve on rubric pass.
  - [2026-04-19] Keep upstream `prp-core` as reference, not active relay code — `plugins/prp-core/commands/prp-plan.md` is the section-shape reference; never imported.
  - [2026-04-19] PRD template fork — Plan Writer consumes the canonical PRD shape at `docs/context/prd-template.md`; the PRD's Implementation Phases table (with the `PRP Plan` column) is the bidirectional link surface.
  - [2026-04-19] Methodology declaration in `docs/context/methodology.md` — plan must read `tdd:` and emit a routing note matching the same three exact strings the PRD Writer uses.
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — plan output path strictly `PRPs/plans/...`.
  - Treating `plugins/prp-core/` as active relay code — `prp-plan.md` is studied, not imported.
  - Relying on interactive permission prompts in the autonomous loop — both agents run without user prompts; the reviewer auto-approves on rubric pass.
  - Activating the TDD track by heuristic — plan reads only `tdd:` from `methodology.md`.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — Plan Writer/Reviewer is the first writer/reviewer pair downstream of the PRD pair.
  - Interactivity boundary — autonomous from PRD-APPROVED onward; plan stage MUST NOT prompt the user.
  - PRPs/ artifact path convention — plans go to `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
  - Writer/reviewer split — every stage post-PRD has two independently invokable commands.
- Result: PROCEED
```

## Problem Statement

Without a Plan Writer/Reviewer pair, there is no deterministic bridge between an APPROVED PRD and the Implementer agent: the PRD captures *what* and *why* but not the *how*, and asking an LLM to plan inline at implementation time produces unreliable, untraceable, hallucinated file paths and missing dependencies. The cost is paid downstream — the Implementer fails, the Test Runner loops, and the human is dragged back into the autonomous portion of the pipeline that was supposed to run untouched. Until this stage exists, `/relay-execute` cannot be built, and the relay value proposition (one prompt → PR) stays hypothetical.

## Evidence

- The relay command surface decision in `docs/decisions.md` (2026-04-19) explicitly lists `/relay-plan <prd-path>` and `/relay-plan-review <plan-path>` as separate, mandatory commands of the canonical 12-command surface; both are still unimplemented.
- `docs/api-reference.md:39-48` already locks the I/O contracts (`PRPs/plans/<feature>.plan.md`, `DRAFT`/`APPROVED` statuses) — they exist on paper but not in code.
- `docs/planning/planejamento_fase_2.docx` §7.4 names "Plan Writer/Reviewer" as a Pilar 2 dependency for `/relay-execute`; without it, the orchestrator HALTs before reaching the Implementer.
- The PRD template at `docs/context/prd-template.md` includes an Implementation Phases table with a `PRP Plan` column whose cells are currently always `(no plan — agent + command)` in shipped PRDs (`PRPs/prds/test-runner.prd.md:356-365`) — direct evidence that the back-reference contract exists but has no producer.
- Web research surfaces the failure mode that motivates a structural rubric: AI-generated plans "look plausible yet call non-existent functions, violate internal style rules, or fail CI pipelines" (MIT, 2025-07).

## Proposed Solution

Build two new agents and two new commands following the writer/reviewer split pattern already proven by the PRD pair. `plan-writer` runs autonomously: it parses the source PRD's Implementation Phases table, picks the next `pending` phase whose dependencies are `complete`, dispatches `research-codebase` and `research-web` in parallel for grounding, consults the three Decision Gate sources, and writes one plan file **per phase** at `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` with status `DRAFT`. The plan file structure is adapted from `plugins/prp-core/commands/prp-plan.md` — Summary, Metadata, Mandatory Reading, Patterns to Mirror (with real `file:line` snippets), Files to Change, NOT Building, Step-by-Step Tasks (each with a `VALIDATE` command), Validation Commands (Levels 1–3), Acceptance Criteria traceable to the PRD's AC-N items, Risks, Notes — dropping the UX ASCII section that does not apply to relay's prompt-plugin features. After writing, the writer back-fills the source PRD's `PRP Plan` column with the plan path and flips the row's Status to `in-progress`. `plan-reviewer` then runs an 8-item structural rubric (R1 Decision Gate, R2 mandatory sections, R3 no TBD in mandatory fields, R4 ≥3 atomic tasks each with a VALIDATE command, R5 TDD routing matches `methodology.md`, R6 no `.claude/` writes, R7 Files to Change has ≥1 real row, R8 PRD↔plan traceability) and **auto-flips DRAFT → APPROVED on full rubric pass without user dialogue** — this is the key divergence from `prd-reviewer`, mandated by the interactivity boundary. CHANGES_REQUESTED returns a structured bullet list; small edits go inline, structural defects hand back to the writer via `Task`.

## Key Hypothesis

We believe a writer/reviewer pair that mirrors the proven PRD-stage pattern, anchored on the upstream `prp-plan` section shape but adapted for relay's autonomous-pipeline constraints, will produce APPROVED implementation plans for ≥80% of APPROVED PRDs in one writer→reviewer round, for the orchestrator and the developer working through the Pilar 2 stack. We'll know we're right when (a) the first three real PRDs run through `/relay-plan` + `/relay-plan-review` reach APPROVED without human edits, (b) the `/relay-execute` orchestrator can be wired without a per-stage workaround for missing plans, and (c) Implementer failures attributable to plan defects (hallucinated paths, missing deps, untestable phases) stay below 20% of total Implementer runs once telemetry is available.

## What We're NOT Building

- **A single command bundling both agents.** The decision on writer/reviewer split is binding — `/relay-plan` writes only; `/relay-plan-review` reviews only. Bundling is the PRD stage's exception, not a general pattern.
- **An interactive Plan Writer.** No Q&A, no clarifying questions. The writer either produces a complete plan from the PRD + research grounding, or HALTs with a clear diagnostic.
- **UX Before/After ASCII diagrams.** Relay features are prompts/agents/commands; the prp-plan UX section does not apply.
- **A `--phase <N>` override on the writer.** MVP picks the next actionable phase deterministically from the PRD's Implementation Phases table; manual override is deferred.
- **A `--strict` or manual-confirmation flag on the reviewer.** Auto-approve on rubric pass is the contract; a future "manual mode" flag is deferred.
- **Auto-loop writer↔reviewer on CHANGES_REQUESTED.** That is the orchestrator's responsibility (`/relay-execute`), not the plan stage's.
- **Plan-level Browser/Database validation levels (Levels 4–6 of prp-plan).** Those re-introduce per project as concrete content inside the Validation Commands section, not as fixed agent contract.
- **Persisting research blobs.** Could-item per the analog deferred in PRD Authoring; deferred here too.
- **Re-opening an APPROVED plan.** Mirrors PRD Authoring — manual hand-edit (status flip back to DRAFT) is the documented escape hatch.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| First-round APPROVAL rate | ≥80% of APPROVED PRDs reach plan-APPROVED in one writer→reviewer round | Count APPROVED entries in `<basename>.review.jsonl` with no preceding CHANGES_REQUESTED for the first 10 real plans |
| Plan rubric coverage of Implementer failures | <20% of Implementer failures attributable to plan defects | Test Runner outcome reports (post `/relay-execute` rollout) classified against the 8 rubric items |
| Time from PRD-APPROVED to plan-APPROVED (autonomous mode) | <90 seconds median | Wall-clock between writer's `Write` call and reviewer's APPROVED jsonl entry |
| Per-phase plan focus | 100% of plans target exactly one PRD phase | Filename pattern + Source PRD section presence; rubric R8 enforces |

## Acceptance Criteria (test scenarios)

- **AC-1 PRD parsing and phase selection:** Given an APPROVED PRD at `PRPs/prds/<feature>.prd.md` with at least one Implementation Phases row in `Status: pending` whose `Depends` cell is empty or references only `complete` rows, when `/relay-plan PRPs/prds/<feature>.prd.md` is invoked, then a DRAFT plan file is written at `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` containing the Decision Gate fenced block, all 14 mandatory sections in order, and trailing `*Status: DRAFT*`.

- **AC-2 No actionable phase:** Given an APPROVED PRD whose Implementation Phases table has zero rows in `Status: pending` with satisfied dependencies, when `/relay-plan` is invoked, then the writer emits a clear user-facing message ("No pending phases with satisfied dependencies in `<prd-path>`. Nothing to plan.") and exits with status 0 without writing any file.

- **AC-3 Auto-approve on rubric pass:** Given a DRAFT plan that passes all 8 rubric items (R1–R8), when `/relay-plan-review PRPs/plans/<basename>.plan.md` is invoked, then the reviewer flips the trailing line from `*Status: DRAFT*` to `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*` via two-line `Edit`, appends one APPROVED entry to `PRPs/plans/<basename>.review.jsonl`, and emits the success summary — without prompting the user.

- **AC-4 Rubric fail returns structured CHANGES_REQUESTED:** Given a DRAFT plan with one or more rubric failures, when `/relay-plan-review` is invoked, then the reviewer returns a bullet list naming each failing rubric item by ID + reason, appends a CHANGES_REQUESTED entry to the jsonl log, leaves the file at `*Status: DRAFT*`, and does not perform the flip.

- **AC-5 PRD back-fill:** Given a successful plan write for phase N of feature `<feature>`, when the writer's Phase 7 completes, then the source PRD at `PRPs/prds/<feature>.prd.md` has its row N's Status cell updated from `pending` to `in-progress` and its `PRP Plan` cell updated from `-` (or `(no plan...)`) to the relative plan path `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`. No other rows are modified.

- **AC-6 No `.claude/` writes:** Given any invocation of `/relay-plan` or `/relay-plan-review`, when the agent writes any file, then the resolved write path does not contain `/.claude/` anywhere; rubric R6 fails any plan body that references `.claude/PRPs/`.

- **AC-7 TDD routing fidelity:** Given `docs/context/methodology.md` with `tdd: true`, the plan's TDD note reads `"Current value of \`tdd\` in \`docs/context/methodology.md\`: **true**. TDD track active — TDD Writer (B7) produces the initial test suite from the Acceptance Criteria above, before the Implementer runs."` verbatim. Given `tdd: false` or missing methodology.md, the plan's TDD note matches the corresponding verbatim string defined in `prd-writer.md`'s Step 7.4. R5 fails any deviation.

- **AC-8 Decision Gate halt:** Given that any of `docs/decisions.md`, `docs/anti-patterns.md`, or `docs/context/architecture.md` cannot be read at writer Phase 7.1, when `/relay-plan` runs, then the writer halts with the message `"I cannot emit the Decision Gate evidence block without reading <missing-file>. Please ensure the file exists at <target_root>/<relative-path> and re-run /relay-plan. No DRAFT has been written."` and writes no plan file.

- **AC-9 Atomic-task discipline:** Given a generated DRAFT plan, when rubric R4 inspects the Step-by-Step Tasks section, then it counts ≥3 tasks each containing the `VALIDATE` keyword followed by a non-empty command line; a plan with fewer than 3 tasks or any task missing a VALIDATE command fails R4.

- **AC-10 Reviewer evaluates all 8 rubric items per run:** Given a DRAFT plan, when `/relay-plan-review` runs, then the appended `<basename>.review.jsonl` entry's `rubric` array contains exactly 8 objects with `id` values `R1, R2, R3, R4, R5, R6, R7, R8` (one of each, no duplicates, no extras), each with a boolean `passed` field — regardless of whether earlier items failed (no short-circuit).

## Open Questions

- [ ] How does the orchestrator (`/relay-execute`) handle "no actionable phase" (AC-2) — does it interpret as success (feature complete) or failure (PRD malformed)? Resolved direction: success/exit-0; orchestrator treats as terminal "nothing more to plan" signal. To validate when `/relay-execute` is designed.
- [ ] What jsonl entry shape best represents R8 traceability failures (PRD AC-N missing from plan AC)? Closely mirror `prd-reviewer`'s `{ id, passed, reason }` but the `reason` may need to enumerate the specific missing AC-Ns.
- [ ] Should the `<slug>` portion of the plan filename derive from the PRD's phase name (kebab-cased) or from a fresh kebab of the writer-generated phase title? Proposing the former for stability across re-writes; defer firm decision to implementation.

---

## Users & Context

**Primary User**
- **Who:** the relay developer (manually invoking commands during Pilar 2 / Pilar 3 development) and the future `/relay-execute` orchestrator agent (automated invocation in production).
- **Current behavior:** writes plans by hand, asks the LLM ad-hoc, or uses `/prp-plan` and re-shapes the output manually to fit relay's `PRPs/plans/` and Decision Gate conventions.
- **Trigger:** a PRD has just been approved (`*Status: APPROVED*`); the next pipeline stage needs a plan.
- **Success state:** an APPROVED `<feature>-phase-<N>-<slug>.plan.md` file exists; the source PRD's row N is marked `in-progress`; the Implementer can proceed without re-derivation.

**Job to Be Done**
When an APPROVED PRD lands and a feature phase needs implementation, I want a structured plan auto-generated and auto-validated against a structural rubric, so that the Implementer can run without me re-deriving context and the orchestrator can proceed without per-stage workarounds.

**Non-Users**
- The PRD Writer/Reviewer (different stage, interactive).
- The Implementer/Code Reviewer (consumers of the plan, not authors).
- Anyone needing UX / UI design output (relay features have no UI surface).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `plan-writer` agent — autonomous parse-PRD → grounding → Decision Gate → file write | The artifact producer; without it, the pipeline does not move past PRD-APPROVED |
| Must | `plan-reviewer` agent — 8-item rubric, auto-flip on pass, jsonl logging | Decouples validation from generation; same writer/reviewer split as PRD stage |
| Must | `/relay-plan` command — preconditions + adopt writer role | Public surface; matches the canonical 12-command list |
| Must | `/relay-plan-review` command — preconditions + adopt reviewer role | Public surface; symmetric to `/relay-plan` |
| Must | `docs/context/plan-template.md` — canonical plan section shape | Anchor for R2 (mandatory sections) and Implementer expectations; analogous to `prd-template.md` |
| Must | One plan per PRD phase, file at `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` | Aligns with prp-plan's per-phase model and web findings on phase-isolated context |
| Must | Decision Gate fenced block in every DRAFT, immediately below title | Plugin-wide invariant; enforced by R1 |
| Must | TDD routing note (verbatim strings from methodology.md) | Same contract `prd-writer` follows; enables B7/B8 dispatch |
| Should | R8 PRD↔plan traceability rubric item | Distinguishes plan-stage rubric from PRD-stage; catches misaligned plans |
| Should | Writer back-fills PRD's `PRP Plan` column + sets row Status to `in-progress` | Mirrors prp-plan; gives the orchestrator a single source of truth for phase progress |
| Should | research-codebase + research-web parallel dispatch in writer's grounding phase | Reuses existing relay subagents; avoids hallucinated `file:line` references in Patterns to Mirror |
| Could | `--phase <N>` writer override targeting a specific phase | Manual debugging convenience; not needed for autonomous orchestration |
| Could | `--strict` reviewer flag re-introducing user-confirmation gate | For high-stakes manual reviews; defer until use case emerges |
| Could | Persist research blobs to `PRPs/plans/<basename>.research.md` | Audit trail; not MVP |
| Won't | Auto-loop writer↔reviewer on CHANGES_REQUESTED | Orchestrator's responsibility |
| Won't | UX Before/After ASCII diagrams | Not applicable to relay features |
| Won't | Browser/Database validation levels in the agent contract | Plan body may include them per project; not part of fixed structure |
| Won't | Re-opening an APPROVED plan via tooling | Manual hand-edit (flip status back to DRAFT) is the escape hatch |
| Won't | Bundle writer + reviewer into a single command | Bound by command-surface decision |

### MVP Scope

The MVP is the six items in the Implementation Phases table below: writer agent, reviewer agent, two commands, plan template, and the docs updates that publish the contract. With these, an APPROVED PRD can be planned phase-by-phase and the resulting plans auto-approved by the reviewer, unblocking the Implementer step of Pilar 2.

### User Flow

Shortest path to value (autonomous orchestration):

1. PRD reaches `*Status: APPROVED*` (existing PRD pair).
2. Orchestrator (or developer) runs `/relay-plan PRPs/prds/<feature>.prd.md`.
3. Writer parses PRD's Implementation Phases table, picks next pending phase with deps satisfied, dispatches `research-codebase` + `research-web` in parallel, consults Decision Gate sources, writes `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` with `*Status: DRAFT*`, back-fills PRD row.
4. Orchestrator (or developer) runs `/relay-plan-review PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
5. Reviewer runs 8-item rubric. On pass → auto-flip to `*Status: APPROVED*`, append jsonl, emit summary, exit. On fail → CHANGES_REQUESTED bullet list, jsonl appended, file remains DRAFT.
6. Implementer (next stage) consumes the APPROVED plan.

---

## Technical Approach

**Feasibility:** HIGH. The shape is a direct adaptation of the already-shipped PRD writer/reviewer pair; the section template draws from a known-good upstream (`prp-plan`); Decision Gate machinery and review.jsonl plumbing already exist.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### Architecture Notes

- **Same writer/reviewer split as PRD stage** — clone the file structure of `plugins/relay/agents/prd-writer.md` and `prd-reviewer.md`, adapting phase content. Keep frontmatter conventions (`name`, `description`, `model: sonnet`, `color`, `tools`).
- **Autonomous reviewer** — the single semantic divergence from `prd-reviewer`: rubric pass triggers immediate flip without "Aprovar PRD?" prompt. Past the interactivity boundary; orchestrator-friendly.
- **Per-phase plan files** — diverges from the api-reference shorthand `<feature>.plan.md`; recorded in Decisions Log row.
- **PRD as state-of-the-feature ledger** — writer mutates the source PRD's Implementation Phases table on success. The PRD becomes the single source of truth for "which phases have plans / are in-progress / are complete." Risk: concurrent plan-writer invocations on the same PRD; mitigation: serialize via orchestrator or rely on file-modtime checks (deferred).
- **Research grounding via existing subagents** — `research-codebase` and `research-web` already exist (built for `prd-writer`); reuse rather than introduce new agent types. Parallel dispatch in a single message.
- **Decision Gate evidence** — emitted twice: once in this PRD (above), once in every plan the writer produces. The plan's gate covers the *phase being planned*; this PRD's gate covers the *feature pair we're spec'ing*.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Plan-writer hallucinates file paths in "Patterns to Mirror" | M | `research-codebase` carries `file:line` evidence; rubric R3 fails any `{...}`/TBD placeholder in mandatory fields; downstream Test Runner B5 catches surviving defects |
| PRD Implementation Phases table format drifts and parser breaks | L | Strict header-row match against canonical `\| # \| Phase \| Description \| Status \| Parallel \| Depends \| PRP Plan \|`; HALT with diagnostic on mismatch; never silently retry |
| Auto-approve hides bad plans | M | R8 traceability check; Test Runner downstream catches semantic drift; deferred `--strict` flag is the escape hatch when needed |
| Concurrent writers mutate same PRD's table | L | Serialize at orchestrator layer; out-of-scope race handling deferred |
| One plan per phase explodes file count for PRDs with many phases | L | Acceptable; aligns with isolated-context principle from web research; filenames stay grep-friendly |
| TDD routing string drift between `prd-writer` and `plan-writer` | L | R5 reads the exact verbatim strings defined in `prd-writer.md` Step 7.4; both agents reference the same source-of-truth text |
| Writer back-fill to PRD corrupts unrelated rows | M | Use `Edit` with narrow `old_string` matching only the target row's `pending` cell + plan-path cell; never `Write`-rewrite the PRD |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | plan-writer agent | `plugins/relay/agents/plan-writer.md` — autonomous PRD-parse, phase-selection, research-subagent dispatch, Decision Gate consultation, plan file write, source PRD back-fill | pending | yes (with #2) | - | - |
| 2 | plan-reviewer agent | `plugins/relay/agents/plan-reviewer.md` — 8-item rubric, auto-flip on pass, review.jsonl append-only logging, inline-edit / writer-handoff dialogue branch | pending | yes (with #1) | - | - |
| 3 | `/relay-plan` command | `plugins/relay/commands/relay-plan.md` — argument dispatch, preconditions (PRD exists + APPROVED + has pending phase), adopt writer role, surface writer halts | pending | yes (with #4) | 1 | - |
| 4 | `/relay-plan-review` command | `plugins/relay/commands/relay-plan-review.md` — preconditions (plan exists + DRAFT), adopt reviewer role, surface CHANGES_REQUESTED to caller | pending | yes (with #3) | 2 | - |
| 5 | `docs/context/plan-template.md` | Canonical plan section shape — analogous to `prd-template.md`. Anchors R2 (mandatory sections check) and Implementer expectations | pending | yes | - | - |
| 6 | docs updates | `docs/decisions.md` row recording per-phase plan path divergence from api-reference; `docs/api-reference.md` refinement; `documentation/changelog.html` entry per AGENTS contract | pending | - | 1, 2, 3, 4, 5 | - |

### Phase Details

**Phase 1: plan-writer agent**
- **Goal:** Implement the autonomous PRD→plan transformation.
- **Scope:** Single file `plugins/relay/agents/plan-writer.md` with frontmatter (`tools: Task, Read, Write, Edit, Glob`), Phase 0 setup (read methodology.md), Phase 1 PRD parse + phase selection, Phase 2 research dispatch, Phase 3 Decision Gate consultation, Phase 4 plan assembly + write + PRD back-fill, Phase 5 handoff message.
- **Success signal:** Given a sample APPROVED PRD with one pending phase, manual invocation of the agent produces a DRAFT plan at the expected path with all 14 mandatory sections and updates the PRD's Implementation Phases row.

**Phase 2: plan-reviewer agent**
- **Goal:** Implement the 8-item rubric runner with auto-flip and jsonl logging.
- **Scope:** Single file `plugins/relay/agents/plan-reviewer.md` with frontmatter (`tools: Read, Edit, Write, Task`), Step 1 load and parse, Step 2 rubric R1–R8, Step 3 branch (auto-flip on full pass; CHANGES_REQUESTED bullet list otherwise), Step 4 dialogue loop (inline edit vs writer handoff), append-only jsonl writer.
- **Success signal:** Given a hand-crafted passing DRAFT plan, the agent flips it to APPROVED autonomously and appends a single APPROVED jsonl entry. Given a failing DRAFT, it returns the bullet list and leaves the file untouched.

**Phase 3: `/relay-plan` command**
- **Goal:** Public command surface for the writer.
- **Scope:** Single file `plugins/relay/commands/relay-plan.md`. Preconditions: `<prd-path>` exists, ends with `*Status: APPROVED*`, contains a parseable Implementation Phases table with at least one row whose deps are satisfied. Decision Gate evidence at command level. Adopt-writer-role contract identical in spirit to `relay-prd.md`'s Phase A.
- **Success signal:** `/relay-plan PRPs/prds/<feature>.prd.md` produces the expected DRAFT or HALTs with a clear preconditions message.

**Phase 4: `/relay-plan-review` command**
- **Goal:** Public command surface for the reviewer.
- **Scope:** Single file `plugins/relay/commands/relay-plan-review.md`. Preconditions: `<plan-path>` exists, ends with `*Status: DRAFT*`. Decision Gate evidence at command level. Adopt-reviewer-role contract; surface APPROVED summary or CHANGES_REQUESTED list to caller.
- **Success signal:** `/relay-plan-review PRPs/plans/<basename>.plan.md` either flips and reports APPROVED or reports the rubric defect list, never blocks on user input.

**Phase 5: plan-template**
- **Goal:** Canonical, versioned plan shape.
- **Scope:** `docs/context/plan-template.md` listing the 14 mandatory sections in order, with brief descriptions and the trailing status-line block. Analogous to `prd-template.md`. Includes an explicit note about per-phase filename convention and the `PRP Plan` back-reference contract.
- **Success signal:** Reviewer's R2 passes only when the plan's section order matches this template byte-for-byte (modulo content).

**Phase 6: docs updates**
- **Goal:** Publish the contract changes the rest of the docs depend on.
- **Scope:** New decision row in `docs/decisions.md` recording the per-phase plan path divergence; refinement of `docs/api-reference.md` lines 39 and 47 to note the per-phase filename pattern; new entry in `documentation/changelog.html` per the binding `documentation/AGENTS.md` contract; possibly a small note in `docs/context/architecture.md` §"PRP artifact paths" about per-phase plan files.
- **Success signal:** A diff hitting `docs/decisions.md`, `docs/api-reference.md`, and `documentation/changelog.html` plus optionally `architecture.md`. Site renders cleanly. No internal links broken.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Command surface | Two commands: `/relay-plan` (writer only) + `/relay-plan-review` (reviewer only) | Single `/relay-plan` bundling both agents | Bound by 2026-04-19 command-surface decision; bundling is the PRD stage's exception |
| Reviewer interactivity | Auto-approve on rubric pass, no user confirmation | Mirror `prd-reviewer`'s "Aprovar PRD?" gate | Past the interactivity boundary (architecture.md §Interactivity boundary); orchestrator-friendly |
| Plan granularity | One plan file per PRD phase | One plan per feature (api-reference's shorthand) | Aligns with `prp-plan`'s per-phase Phase 0 DETECT; matches web research on phase-isolated context; keeps plans focused |
| Plan file naming | `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` | `<feature>.plan.md` (api-reference verbatim) | Refinement of the api-reference; recorded as a divergence to be reflected in the docs in Phase 6 |
| Section template | Adapted from `plugins/prp-core/commands/prp-plan.md`, dropping UX, dropping Levels 4–6 from agent contract | Design from scratch; copy verbatim | Reference-only use of prp-core honors the 2026-04-19 boundary decision; adapting beats inventing |
| Research grounding | Reuse existing `research-codebase` + `research-web` subagents in parallel | Introduce new plan-specific research agents | Reuse beats new types when the contract fits; both subagents already produce the JSON shape `plan-writer` needs |
| Rubric size | 8 items (PRD's 7 + R8 PRD↔plan traceability) | Mirror PRD's 7 items exactly | Plan stage has a unique correctness invariant (PRD↔plan AC alignment) that the PRD stage doesn't have |
| Writer back-fills PRD | Yes — `Edit` the source PRD's Implementation Phases row to mark `in-progress` and populate `PRP Plan` cell | Leave PRD unchanged; track plan↔phase elsewhere | Mirrors `prp-plan`'s behavior; PRD becomes single source of truth for phase progress, simplifying orchestrator state |
| Open-question resolutions (per user, 2026-04-25) | "No actionable phase" → exit 0 + clear message; defer `--phase <N>` override | Treat as failure; ship override now | Simpler MVP; orchestrator gets a clean signal; override is a Could-item until use case emerges |

---

## Research Summary

**Market Context**

- The Wirasm `PRPs-agentic-eng` repo defines the canonical three-tier `/prp-prd` → `/prp-plan` → `/prp-implement` workflow that this PRD adapts ([github.com/Wirasm/PRPs-agentic-eng](https://github.com/Wirasm/PRPs-agentic-eng)).
- "Plan as a lockable artifact with per-phase success criteria" is documented as the right shape for AI coding agents; the failure mode to avoid is plans that "live in the context" and dissolve into noise during execution ([apiad.net "Anatomy of AI Coding Agents"](https://blog.apiad.net/p/the-anatomy-of-ai-coding-agents)).
- Five-section plan structure (Problem, Constraints, Options, Detailed Plan with per-step AC, Validation Strategy) is independently described as a canonical shape; "Blind Generation" (jumping to code without scoping) is the named anti-pattern ([github.com/PaulDuvall/ai-development-patterns](https://github.com/PaulDuvall/ai-development-patterns)).
- Multi-phase AI work degrades when full accumulated context is carried across phases; quality gates between phases and phase-isolated context are mandatory not optional ([docs.bswen.com 2026-04-20](https://docs.bswen.com/blog/2026-04-20-multi-phase-ai-project-best-practices/)). Direct support for the per-phase plan choice.
- LLM-to-LLM plan writer/reviewer split with a structural rubric is **not publicly documented** as a canonical pattern. This PRD designs from first principles, anchored on the PRD pair already shipped in relay.
- AI plan failure modes that motivate the structural rubric: hallucinated file paths, "looks plausible but calls non-existent functions" ([MIT News 2025-07](https://news.mit.edu/2025/can-ai-really-code-study-maps-roadblocks-to-autonomous-software-engineering-0716)).
- Rubric-as-judge pattern with static + adaptive criteria is the underlying evaluation strategy ([Medium AI4HUMAN](https://medium.com/@aiforhuman/rubric-based-evaluation-for-agentic-systems-db6cb14d8526)).
- Anti-pattern: monolithic prompts and "all-or-nothing autonomy" — calibrated checkpoints beat unconstrained agents ([Allen Chan, Medium 2026-03](https://achan2013.medium.com/ai-agent-anti-patterns-part-1-architectural-pitfalls-that-break-enterprise-agents-before-they-32d211dded43)).

**Technical Context**

- `plugins/relay/agents/prd-writer.md:41-72` defines the hard-constraint pattern (template conformance, Decision Gate evidence, TDD routing verbatim strings, status-line discipline) that `plan-writer` mirrors with autonomous-flow adaptations.
- `plugins/relay/agents/prd-reviewer.md:44-56` defines the rubric / status-flip / review.jsonl mechanics that `plan-reviewer` mirrors, with the single divergence that auto-flip on rubric pass replaces the user-confirmation gate.
- `plugins/relay/commands/relay-prd.md:119-144` defines the Phase A (writer) → Phase B (reviewer) command-level orchestration; `/relay-plan` and `/relay-plan-review` are split into two commands instead, but the precondition + adopt-role shape is reused.
- `docs/api-reference.md:39-48` already locks the I/O contracts; this PRD's only refinement is the per-phase filename pattern (recorded in Decisions Log + Phase 6).
- `PRPs/prds/prd-authoring.prd.md:485-492` and `PRPs/prds/test-runner.prd.md:356-365` show the live shape of the Implementation Phases table with the `PRP Plan` column, which `plan-writer` must parse and back-fill.
- `plugins/prp-core/commands/prp-plan.md:352-691` is the section-template reference: Summary, User Story, Problem/Solution, Metadata, UX (dropped), Mandatory Reading, Patterns to Mirror, Files to Change, NOT Building, Step-by-Step Tasks, Testing Strategy, Validation Commands, AC, Risks. `prp-core` is reference-only per `docs/decisions.md` 2026-04-19.
- `docs/anti-patterns.md:60-66` lists Plan Writer explicitly among the components subject to the `.claude/`-write prohibition; rubric R6 enforces.
- `docs/context/methodology.md` currently has `tdd: false`; the TDD routing note in any plan written against the relay repo will read the `tdd: false` verbatim string.

---

*Generated: 2026-04-25*
*Approved: 2026-04-25*
*Status: APPROVED*
