# Implement-Phase Documentation Sync

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting pattern change (relocates a pipeline responsibility across the Pillar 2/3 boundary); reuse of existing components (docs-updater / docs-reviewer); impact on reusable services (the docs pair, /relay-implement, /relay-approve, /relay-execute, context-builder, the docs/context/methodology.md schema)
- Decisions found:
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — `/relay-implement` is in the autonomous zone, so the docs pair MUST run non-interactively there. Drives the non-interactive + defer-questions-to-report design.
  - [2026-06-19] /relay-approve design + interactivity-boundary extension — the docs pair's post-merge interactivity extension is defined AT MERGE. This feature keeps that extension only for the approve-time (safety-net) invocation and consciously does NOT grant it to the new implement-time invocation.
  - [2026-05-18] Pillar 2/3 boundary: /relay-execute/-implement never commit — implement-time docs edits land UNCOMMITTED in the worktree and are committed later by `/relay-commit` alongside the code (no new commit at implement time). Consistent, not violated.
  - [2026-04-19] Methodology declaration in docs/context/methodology.md — the new per-project `docs_sync` flag is an additive frontmatter key here (same pattern as `tdd:` / `test_frameworks:`).
  - [2026-04-19] PRP artifacts live under PRPs/, never .claude/ — the implement-time docs-update manifest is written to `PRPs/reports/<feature>/`.
  - [2026-06-19 OQ-b] Docs pair scoped to docs/, never the documentation/ HTML site — retained: implement-time sync also never touches `documentation/`.
- Applicable anti-patterns:
  - "Relying on interactive permission prompts in the autonomous loop" — the implement-time docs pair must be non-interactive (respected).
  - "Writing pipeline artifacts under `.claude/`" — manifest → `PRPs/reports/<feature>/`; docs edits → `docs/` (respected).
  - "Injecting plugin defaults into the target project's decisions.md" — the `docs_sync` default lives in `docs/context/methodology.md` (written by context-builder), NOT `decisions.md` (respected).
  - "Activating the test pair by heuristic" (analogous principle) — `docs_sync` is an explicit declaration with a default, never a heuristic activation.
- Applicable architectural rules:
  - Interactivity boundary (autonomous after PRD approval) — bounds the implement-time invocation to non-interactive.
  - Three-pillar architecture — this feature refines the Pillar 2/3 split: the PRIMARY docs-sync moves into Pillar 2 (implementation); Pillar 3 is retained as a safety net. Conscious refinement, to be recorded in `docs/decisions.md` at implementation time.
  - PRP artifact paths table — manifest path.
  - Pillar 2 "never commit" invariant — implement-time docs edits stay uncommitted in the worktree.
- Result: PROCEED — no unresolvable conflict. Two conscious refinements are recorded (the interactivity-extension scope, and the relocation of primary docs-sync to Pillar 2), both consistent with the cited decisions and captured in the Decisions Log below for promotion to `docs/decisions.md` when this feature is implemented.
```

## Problem Statement

Relay updates a target project's living knowledge base (`docs/`, `CLAUDE.md`, `docs/KNOWLEDGE_BASE.md`) only in Pillar 3, inside `/relay-approve`, post-merge, via the `docs-updater` + `docs-reviewer` pair. In practice `/relay-approve` is frequently never reached — the project cannot open a PR, the PR cannot be merged directly, or the change is committed straight to `develop`. When approve is skipped, the knowledge base is **never** updated: code, decisions, and architecture drift while the docs stagnate, and over months this becomes a large, silent maintenance problem.

## Evidence

- The user reports that after several months of daily use, `/relay-approve` is reached in a minority of runs (no PR possible, PR not directly mergeable, or direct-to-`develop` implementation), and in every skipped case the target `docs/` goes untouched. (Primary source: this PRD's authoring session.)
- The docs pair is structurally tied to a merged PR: `docs-updater` consumes `gh pr diff <pr>` as its only diff source and derives the feature via `orchestrator-run.json` — there is no working-tree / patch input path (`plugins/relay/agents/docs-updater.md`; confirmed by codebase grounding).
- `/relay-execute` and `/relay-implement` never invoke the docs pair today — a repo-wide search for `docs-updater|docs-reviewer` matches only the two agent files, `relay-approve.md`, and narrative docs; `relay-execute.md` does not match (codebase grounding).
- Industry practice treats documentation drift as a **process gap**, not a tooling gap, and recommends co-locating doc updates with the code change ("docs-as-code", "definition of done includes docs"); documentation debt is especially dangerous because it produces no failing test to signal it. (Market grounding — see Research Summary.)

## Proposed Solution

Reuse the existing `docs-updater` / `docs-reviewer` pair, but dispatch it a **second time**, inside `/relay-implement`, immediately after the code-review rubric returns APPROVED and **before** the D8 post-approval mutations. In that context the pair runs **non-interactively** (respecting the autonomous boundary), consumes the **working-tree diff / captured `attempt diff.patch`** instead of `gh pr diff` (there is no PR yet), and writes its surgical, additive-only edits directly into `docs/` in the worktree — so docs ride along with the code in the same eventual `/relay-commit`. Any situation that would require an operator decision is **recorded as an open question in the implementation report** and surfaced to the user after implementation (at the existing human-validation gate), never asked mid-run. The `/relay-approve` docs cycle is **retained unchanged as a safety net** for decisions taken after implementation. A per-project master switch, `docs_sync` in `docs/context/methodology.md` (default `true`), plus a per-invocation `--no-docs` flag on `/relay-implement`, gate the behavior. This approach was chosen over building a new agent (would duplicate the additive-only / PRESERVE-ENTIRELY logic) and over making `implementer` / `code-reviewer` docs-aware (would break their deliberate docs-blindness and read-only philosophy).

## Key Hypothesis

We believe that dispatching the `docs-updater`/`docs-reviewer` pair (non-interactive, working-tree diff source) during `/relay-implement` will eliminate documentation drift in the cases where `/relay-approve` is never reached, for the developer operating relay against projects with a `docs/` knowledge base. We'll know we're right when implement runs consistently produce up-to-date `docs/` edits in the worktree without depending on approve, and the approve-time docs cycle degrades to a low-delta safety net rather than the primary update path.

## What We're NOT Building

- **Automated sync of the `documentation/` rendered HTML site** — the docs pair is forbidden from touching it (D-R6 / [2026-06-19] OQ-b); it stays human-authored via release-cut phases. Implement-time sync inherits the same scope.
- **Making `implementer` / `code-reviewer` docs-aware** — we reuse the docs pair instead; those two agents remain docs-blind (implementer authors only plan-named files; code-reviewer stays read-only). This preserves R-X strict and the read-only review philosophy.
- **An interactive docs pass inside `/relay-implement`** — the pair never prompts the user in the autonomous zone; questions defer to the report.
- **A new per-project config surface (`.relay.yaml`)** — the master switch reuses the existing `docs/context/methodology.md` frontmatter; the deferred `.relay.yaml` remains out of scope.
- **Committing at implement time** — the Pillar 2 "never commit" invariant holds; implement-time docs edits stay uncommitted and are committed later by `/relay-commit`.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Implement-time sync coverage | 100% of successful implement phases (with `docs_sync: true` and a `docs/` knowledge base) produce a `docs-update.md` manifest | Presence of `PRPs/reports/<feature>/docs-update.md` (Status APPROVED) after implement |
| Drift when approve is skipped | 0 cases of stale `docs/` in runs that never reach `/relay-approve` | Inspection: `docs/` reflects the implemented diff without `/relay-approve` having run |
| Approve becomes a safety net | Approve-time docs cycle produces only low-delta, additive edits | The approve manifest records only post-implementation decisions, not the full change set |
| Autonomy preserved | 0 operator prompts raised by the docs pair during `/relay-implement` | Deferred questions appear in the implementation report, not as mid-run prompts |

## Acceptance Criteria (test scenarios)

- **AC-1 (implement-time sync happens):** Given a target project with a `docs/` knowledge base, `docs_sync: true`, and a plan whose code-review reaches APPROVED, when `/relay-implement` completes the phase, then the `docs-updater`/`docs-reviewer` pair has run non-interactively, additive edits are present in `docs/` in the working tree, and a `docs-update.md` manifest with `*Status: APPROVED*` exists in `PRPs/reports/<feature>/`.
- **AC-2 (non-interactive + question deferral):** Given the docs pair encounters a situation that would require an operator decision during implement, when it runs, then it does NOT prompt the user, the raised question is recorded in the implementation report (`PRPs/reports/<feature>/`), and the report surfaces it to the user after implementation completes.
- **AC-3 (pre-PR diff source + scope):** Given there is no PR during implement, when `docs-updater` runs, then it consumes the working-tree diff / the attempt's `diff.patch` (not `gh pr diff`), and it touches only `docs/context/`, `docs/domain/`, `docs/decisions.md`, `docs/anti-patterns.md`, `CLAUDE.md`, and `docs/KNOWLEDGE_BASE.md` — never `documentation/` and never anything under `.claude/`.
- **AC-4 (ordering + no commit):** Given code-review returned APPROVED, when the implement flow proceeds, then docs-sync runs after APPROVED and **before** the D8 mutations (plan flip → IMPLEMENTED, plan move to `completed/`, PRD row N → complete), and no commit is created at implement time (docs edits remain uncommitted in the worktree).
- **AC-5 (approve retained + idempotent):** Given docs were already synced at implement, when `/relay-approve` runs its docs cycle post-merge, then it still runs but produces only additive deltas for post-implementation decisions (additive-only / PRESERVE-ENTIRELY honored; no destructive rewrite of implement-time edits).
- **AC-6 (per-project + per-invocation opt-out):** Given `docs_sync: false` in `docs/context/methodology.md`, when `/relay-implement` (or `/relay-approve`) runs, then the docs cycle self-skips in both commands; and given `docs_sync: true` but `/relay-implement` invoked with `--no-docs`, when it runs, then only that invocation skips the implement-time docs cycle.
- **AC-7 (docs + site describe the new model):** Given the feature ships, when a reader consults `docs/context/architecture.md` and the `documentation/` site, then docs-sync is described as occurring during implementation (with approve as a safety net), accompanied by a `documentation/changelog.html` entry and a `plugin.json` version bump.

## Open Questions

- [ ] Does the implement-time docs loop's wall-clock count against `max_implement_minutes=45`, or is it accounted separately? (Leaning: counts toward it, since it runs inside the implement session; confirm at implementation and measure.)
- [ ] For multi-phase PRDs driven by `/relay-execute`, docs-sync runs **per phase** (a consequence of `/relay-implement` doing it). Is per-phase sync always desirable, or should rapid successive phases batch to reduce churn? (Leaning: per-phase; revisit if churn is observed.)
- [ ] Should the deferred-questions surface in the implementation report be consumed by `/relay-qa-report` at the validation gate, or remain a standalone report section? (Nice-to-have integration.)
- [ ] Exact retry-budget wiring: reuse the `max_docs_review_retries=2` constant/name inside `/relay-implement`, or introduce an implement-scoped alias? (Leaning: reuse the constant; confirm naming at implementation.)

---

## Users & Context

**Primary User**
- **Who:** The developer operating relay day-to-day whose implementations frequently do not reach `/relay-approve` (no PR possible, PR not directly mergeable, or direct-to-`develop` commits). Secondarily, any team adopting relay that works on branches without a mergeable PR.
- **Current behavior:** Runs `/relay-execute` (or `/relay-implement`); code changes land, but the target `docs/` would only be touched by an approve step that rarely happens.
- **Trigger:** Completion of an implementation phase whose code-review rubric returned APPROVED.
- **Success state:** At the end of implement, `docs/` already reflects the change — without depending on approve.

**Job to Be Done**
When I finish an implementation that may never become a merged PR, I want the project's knowledge base to be updated as part of the delivery itself, so that documentation does not fall behind regardless of whether I reach approve.

**Non-Users**
- Projects with no `docs/` knowledge base (context-builder never ran) — nothing to sync.
- The `documentation/` HTML site and anything under `.claude/` — out of the docs pair's scope by existing invariant.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `docs-updater` gains an alternate diff source (working-tree diff / `attempt diff.patch`) in addition to `gh pr diff <pr>` | No PR exists at implement time; precedent: `code-reviewer` already has a diff-target parameter |
| Must | `docs-updater` + `docs-reviewer` gain a non-interactive mode | Autonomous boundary of `/relay-implement`; user decision |
| Must | `/relay-implement` dispatches the docs pair after code-review APPROVED and before D8 mutations; edits land uncommitted in the worktree | "Docs in the same changeset as the code" (industry norm); committed later by `/relay-commit` |
| Must | The pair's operator questions are recorded in the implementation report and surfaced to the user after implementation | User decision; lands at the human-validation gate |
| Must | `/relay-approve` retains its docs cycle as a safety-net reconciliation pass | Captures post-implementation decisions |
| Must | Per-project master switch `docs_sync: true` in `docs/context/methodology.md` (context-builder emits the default on `*init`) | Configure automatic docs sync per project |
| Must | Per-invocation `--no-docs` flag on `/relay-implement` | Single-run override, analogous to the existing approve flag |
| Must | Update the plugin docs (`docs/`) and the `documentation/` site (three-file rule + changelog + `plugin.json` bump) to describe the new model | `documentation/AGENTS.md` binding contract |
| Should | `/relay-execute` inherits per-phase docs-sync automatically (consequence of `/relay-implement` doing it) — documented explicitly | No new code, but must be clear; watch `max_orchestrator_minutes` |
| Should | Fix pre-existing stale Pillar-3 content (`pillars.html` "planned"; `flows.md` naming a nonexistent `/approve-implementation`) | Opportunistic drift correction surfaced by grounding |
| Could | Telemetry of the approve-time docs delta to quantify the "safety net" size | Validates the hypothesis over time |
| Won't | Automated sync of the `documentation/` HTML site | Docs pair forbidden from touching it (D-R6) — stays manual |
| Won't | Making `implementer` / `code-reviewer` docs-aware | Reuse the docs pair; keep them docs-blind |
| Won't | Interactive docs pass inside `/relay-implement` | Violates the autonomy boundary |

### MVP Scope

The Must block: the docs pair runs non-interactively inside `/relay-implement` (after code-review APPROVED, before D8) using a working-tree diff source; additive edits land in `docs/` in the worktree; a manifest + review are produced; operator questions defer to the implementation report; `docs_sync` (methodology.md) and `--no-docs` (implement) gate the behavior; `/relay-approve` keeps its safety-net pass; the plugin docs and site are updated.

### User Flow

`/relay-execute` (or `/relay-implement`) → per phase: code implemented + code-review **APPROVED** → **docs pair runs non-interactively**, syncs `docs/` in the worktree, writes the manifest, records any open questions → D8 mutations → implement completes with **code + docs together** (uncommitted) in the worktree → human validation (sees the deferred questions) → `/relay-commit` commits code + docs together → `/relay-pr` → (if reached) `/relay-approve` runs the safety-net docs pass.

---

## Technical Approach

**Feasibility:** HIGH

Reuses the existing agent pair — no new agent. The work is: (a) an alternate diff-source parameter on `docs-updater`, (b) a non-interactive mode on both docs agents with question-deferral, (c) a dispatch point in `/relay-implement` (post-APPROVED, pre-D8) with its own retry budget and a `--no-docs` flag, (d) the `docs_sync` methodology key + context-builder emission, (e) confirming approve idempotency, and (f) docs + site updates. The diff-source precedent already exists on `code-reviewer`.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared (here `test_frameworks: ["node:test"]`), the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

### Architecture Notes

- **Dispatch point:** inside `/relay-implement` Phase A, in the code-reviewer-APPROVED branch, after APPROVED and before the three D8 mutations. Docs+code thereby compose the same delivered state before the plan/PRD state flips.
- **Diff source:** the working-tree diff or the attempt's captured `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch`. A new `diff_source` input on `docs-updater` selects between `pr` (approve) and `worktree`/`patch` (implement).
- **Interactivity:** a `non_interactive: true` input suppresses the pair's Interactivity Clause; the [2026-06-19] post-merge interactivity extension applies ONLY to the approve-time invocation. Raised questions are appended to the implementation report.
- **No commit at implement time:** edits are left uncommitted (Pillar 2 invariant); `/relay-commit` bundles docs with code.
- **Master switch:** `docs_sync` in `docs/context/methodology.md` (default `true`) governs both the implement-time and approve-time cycles; `--no-docs` is a per-invocation override. Precedence: `--no-docs` (run) > `docs_sync` (project).
- **Scope invariant preserved:** implement-time sync touches only the docs pair's existing target set; `documentation/` and `.claude/` remain off-limits.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A working-tree diff differs in shape from `gh pr diff` and breaks docs-updater's parsing | M | Normalize to a unified diff; reuse the same parser path; cover with `node:test` |
| Syncing during implement describes not-yet-merged / later-reverted state | M | Approve-time safety net; additive-only + PRESERVE-ENTIRELY keeps edits reconcilable |
| The docs loop inside implement overruns `max_implement_minutes=45` | L/M | Own retry budget (`max_docs_review_retries=2`); measure; decide budget accounting (Open Question) |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Agent capability + config surface | `docs-updater` alt diff source + non-interactive mode + reads `docs_sync`; `docs-reviewer` non-interactive mode + question-deferral; `docs/context/methodology.md` gains `docs_sync` (context-builder emits default `true`) | complete | - | - | PRPs/plans/implement-phase-docs-sync-phase-1-agent-capability-config-surface.plan.md |
| 2 | /relay-implement dispatch | Dispatch the docs pair after code-review APPROVED and before D8; own retry budget (`max_docs_review_retries=2`); `--no-docs` flag; deferred-questions section in the implementation report; honor `docs_sync` | complete | - | 1 | PRPs/plans/implement-phase-docs-sync-phase-2-relay-implement-dispatch.plan.md |
| 3 | Approve as safety net | Confirm/adjust `/relay-approve` docs cycle for idempotency vs implement-time sync; honor `docs_sync` (self-skip when false) | complete | - | 1 | PRPs/plans/implement-phase-docs-sync-phase-3-approve-as-safety-net.plan.md |
| 4 | Docs + site | Update `docs/` (architecture pillars, api-reference labels, flows, KNOWLEDGE_BASE, new decisions.md entry) and the `documentation/` site (three-file rule + changelog + `plugin.json` bump); fix pre-existing stale Pillar-3 content | complete | - | 1, 2, 3 | PRPs/plans/implement-phase-docs-sync-phase-4-docs-site.plan.md |

### Phase Details

**Phase 1: Agent capability + config surface**
- **Goal:** Make the docs pair invokable pre-PR and non-interactively, and add the per-project switch.
- **Scope:** `docs-updater.md` (new `diff_source` + `non_interactive` inputs, reads `docs_sync`), `docs-reviewer.md` (non-interactive mode, question-deferral to the report), `docs/context/methodology.md` (new `docs_sync` key), context-builder skill (emit `docs_sync: true` default on `*init`/`*update`).
- **Success signal:** The agents accept the new inputs; context-builder `*init` emits `docs_sync: true`; unit tests (`node:test`) pass.

**Phase 2: /relay-implement dispatch**
- **Goal:** Run the docs pair inside implement at the right point with the right guards.
- **Scope:** `relay-implement.md` — dispatch post-APPROVED and pre-D8; own retry budget; `--no-docs` parsing; report section for deferred questions; read `docs_sync`.
- **Success signal:** An implement run against a `docs_sync: true` project produces `docs/` edits + manifest + review in the worktree; `--no-docs` and `docs_sync: false` each skip; deferred questions appear in the report.

**Phase 3: Approve as safety net**
- **Goal:** Keep approve as a low-delta reconciliation pass that coexists with implement-time sync.
- **Scope:** `relay-approve.md` — confirm the docs cycle is idempotent against already-synced docs (additive-only already helps); honor `docs_sync: false` (self-skip); no destructive rewrite of implement-time edits.
- **Success signal:** Approve after an implement-synced run finds only additive post-implementation deltas.

**Phase 4: Docs + site**
- **Goal:** The plugin's own documentation describes the new model and the site is registered per contract.
- **Scope:** `docs/context/architecture.md` (Pillar 2/3 split), `docs/api-reference.md` (agent-table labels), `docs/domain/flows.md`, `docs/KNOWLEDGE_BASE.md`, a new `docs/decisions.md` entry (the two conscious refinements below), and the `documentation/` site (NAV + search index + `changelog.html` + `plugin.json` bump); fix stale Pillar-3 content in `pillars.html` and `flows.md`.
- **Success signal:** Docs + site describe docs-sync during implementation with approve as a safety net; changelog entry + `plugin.json` bump present; `documentation/AGENTS.md` three-file rule satisfied.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Where docs-sync runs | Reuse the existing `docs-updater`/`docs-reviewer` pair, dispatched a second time inside `/relay-implement` | New agent; make implementer/code-reviewer docs-aware | Single source of docs-sync logic; keeps implementer/code-reviewer docs-blind (R-X strict + read-only review) |
| Interactivity at implement | Non-interactive; defer operator questions to the implementation report | Allow the pair to prompt (as it does post-merge) | Respects the autonomous boundary; questions land at the human-validation gate |
| Ordering vs D8 | Docs-sync after code-review APPROVED, before the D8 mutations | After D8; interleaved | Docs + code compose the same delivered state before the plan/PRD status flips |
| Retry budget | Own budget reusing `max_docs_review_retries=2` | Count against `max_implement_retries` | Keeps the docs loop bounded independently of code retries |
| Per-project switch | `docs_sync: true` (default) in `docs/context/methodology.md` | `.relay.yaml` (deferred surface); `.claude/settings.json` (off-pattern for behavior toggles) | Reuses the established methodology frontmatter read by agents; smallest, most consistent surface |
| Switch semantics | Master switch governs BOTH implement and approve; `--no-docs` is a per-invocation override | Implement-only switch | A project managing docs by hand disables everything in one place |
| Commit timing | Implement-time docs edits stay uncommitted; committed later by `/relay-commit` | Commit at implement time | Preserves the Pillar 2 "never commit" invariant; docs ride with code |
| `documentation/` site | Stays out of automated sync | Auto-sync the HTML site | Retains [2026-06-19] OQ-b; the styled site needs human-authored release cuts |
| Conscious refinement #1 (to record in decisions.md) | The [2026-06-19] post-merge interactivity extension applies ONLY to the approve-time invocation; the implement-time invocation is non-interactive | — | The interactivity boundary is defined at PRD approval; implement is autonomous, approve is post-merge |
| Conscious refinement #2 (to record in decisions.md) | Primary docs-sync relocates to Pillar 2 (implementation); Pillar 3 is retained as a safety net | Keep docs-sync Pillar-3-only | Approve is frequently unreached; co-locating docs with code is the industry norm |

| Draft carryover | Not applicable (description mode) | — | Authored via full 6-phase Q&A, no pre-filled draft |

---

## Research Summary

**Market Context**
- Docs-in-the-same-PR / same-changeset-as-code is framed as an industry norm and a required code-review checklist item, to remove reviewer uncertainty about whether docs still match behavior (https://graphite.com/guides/documenting-code-for-better-reviews-best-practices). Documentation drift is characterized as a **process gap** — docs excluded from the development process — best closed by embedding docs in the same repo/PR review flow (https://gaudion.dev/blog/documentation-drift). Documentation debt is described as more dangerous than code debt because it produces no automated failure signal, so it is chronically deprioritized (https://happysupport.ai/blog/documentation-debt-vs-technical-debt).
- Real production systems deliberately keep a **post-merge** doc-reconciliation pass as a safety net — because whoever merges is often not the docs owner, and post-merge catches what same-PR discipline misses (Popsa: https://popsa.com/perspectives/ai-maintained-technical-documentation-system/; Dosu: https://dosu.dev/blog/how-to-catch-documentation-drift-claude-code-github-actions; https://understandingdata.com/posts/doc-drift-detection-ci/). This directly validates relay's hybrid: sync during implement AND retain a lighter approve-time pass. The "living specs" pattern for AI-agent development argues implementation decisions should be written back into the spec as an ongoing part of the workflow (https://www.augmentcode.com/guides/living-specs-for-ai-agent-development).
- Gaps (web): no source evaluates relay's exact hybrid (during-implement + lighter post-merge net) head-to-head; none addresses the risk of docs describing not-yet-merged / reverted state; evidence is practitioner blogs, not controlled studies; none is set in a multi-agent orchestrated pipeline. Treat market findings as directional support, not proof.

**Technical Context**
- `docs-updater` is hard-tied to a merged PR: it consumes only `gh pr diff <pr>` and derives the feature via `orchestrator-run.json`; it writes `PRPs/reports/<feature>/docs-update.md` (`*Status: DRAFT*`), additive-only, mirroring context-builder `*update` PRESERVE-ENTIRELY, and never touches `documentation/` (`plugins/relay/agents/docs-updater.md`).
- `docs-reviewer` runs the D-R1..D-R8 rubric, logs to `docs-review.jsonl`, and owns the manifest DRAFT→APPROVED flip; dispatched today only by `/relay-approve` (`plugins/relay/agents/docs-reviewer.md`).
- `/relay-approve` Phase 3 dispatches the pair in a loop bounded by `max_docs_review_retries=2`; Phase 4 commits `docs(<feature>): sync knowledge base post-merge` on the base branch; `--no-docs` skips both phases (`plugins/relay/commands/relay-approve.md`).
- `/relay-implement` Phase A holds the implementer↔code-reviewer loop; captures a per-attempt `diff.patch` at `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch`; the three D8 mutations fire once on APPROVED — the natural slot for docs-sync is the APPROVED branch, before D8, with the working-tree/patch diff as source (`plugins/relay/commands/relay-implement.md`).
- `implementer` (`Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash`, no Task) and `code-reviewer` (no Edit; read-only) are docs-blind today — confirmed; reusing the docs pair keeps them so.
- `documentation/AGENTS.md` binds any site change to the three-file registration rule (NAV + search index + changelog) plus a `plugin.json` bump. Pre-existing stale content exists (`pillars.html` "Pillar 3 planned"; `flows.md` names a nonexistent `/approve-implementation`), worth fixing opportunistically.
- Gaps (codebase): no existing `diff_source` parameter on `docs-updater` to reuse (one must be added, mirroring `code-reviewer`'s); the implement-phase "no dialogue, ever" rule vs the docs pair's Interactivity Clause must be reconciled (resolved here via non-interactive mode); D8-vs-docs-sync ordering was previously undecided (resolved here: docs-sync before D8).

---

*Generated: 2026-07-15*
*Approved: 2026-07-15*
*Status: APPROVED*
