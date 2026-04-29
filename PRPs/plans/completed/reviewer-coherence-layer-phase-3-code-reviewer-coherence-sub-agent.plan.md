# Feature: code-reviewer coherence + sub-agent (Phase 3 of reviewer-coherence-layer)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of an existing agent file (`plugins/relay/agents/code-reviewer.md`); creation of a new agent file (`plugins/relay/agents/code-reviewer-semantic.md` — first new agent in the relay surface since plan-reviewer); creation of a new context file (`docs/context/code-review-registries.md`); two contract evolutions of an APPROVED PRD (D11 and AC-10 of `implementation-authoring.prd.md`, recorded as a new entry in `docs/decisions.md`); cross-cutting impact on the documentation site (regra dos 3 arquivos); reuses the `R-COH-*` ID-naming convention shipped by Phases 1 and 2
- Decisions found:
  - 2026-04-19 Interactivity boundary — code-reviewer remains autonomous; CHANGES_REQUESTED stays terminal; the new sub-agent is invoked synchronously and its return is folded into the parent's existing autonomous flow
  - 2026-04-19 PRD template fork — new `R-COH-*` IDs slot into the existing code-review.jsonl `rubric[]` array; R-S*/R-L*/R-SEM/R-X are not renumbered
  - 2026-04-19 Command surface (writer/reviewer split) — code-reviewer is the reviewer half of `/relay-code-review`; sub-agent dispatch happens inside the agent, not via a new command
  - 2026-04-25 Plan filenames carry phase number + slug — this plan uses `reviewer-coherence-layer-phase-3-code-reviewer-coherence-sub-agent.plan.md`
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/` — JSONL log path (`PRPs/plans/<basename>.code-review.jsonl`) unchanged
  - 2026-04-28 AC-10 of plan-authoring.prd.md evolves (Phase 2 of this feature) — establishes the canonical pattern Phase 3 follows for the analogous evolution of D11 + AC-10 of `implementation-authoring.prd.md`
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — none introduced (sub-agent is also read-only over the repo)
  - "Treating `plugins/prp-core/` as active relay code" — not touched
  - "Activating the TDD track by heuristic" — not touched; the `R-COH-*` framework-mismatch check pattern from Phase 2 is mirrored conceptually but the deterministic checks in Phase 3 are diff-specific (lint, ast-grep), not framework-based
- Applicable architectural rules:
  - Interactivity boundary at PRD approval (preserved; code-reviewer + sub-agent are both autonomous)
  - PRP artifact paths under `PRPs/` (preserved)
  - `documentation/AGENTS.md` §6 three-file registration rule (Phase 3 extends Phases 1-2's Unreleased block in changelog; promotes code-reviewer to shipped in agents.html; adds new code-reviewer-semantic shipped section)
  - D11 read-only philosophy (preserved: parent gains Task only; sub-agent is read-only itself; no Edit anywhere; Bash restricted to lint/ast-grep/type-check report)
- Result: PROCEED
```

> **Decision Gate note — D11 + AC-10 contract evolution.** This phase consciously evolves two contracts in `PRPs/prds/implementation-authoring.prd.md`:
> 1. **D11** ("code-reviewer: Read, Write, Glob, Grep, Bash, BashOutput. Read-only over the repo. … The code-reviewer agent does NOT have Edit") — adds `Task` to the tools allowlist for bounded sub-agent dispatch. The read-only invariant is preserved verbatim: parent does NOT gain `Edit`; the sub-agent (`code-reviewer-semantic`) is itself read-only over the repo.
> 2. **AC-10** ("rubric array contains exactly one entry per rubric item the reviewer evaluated (one of each, no duplicates, no extras)") — relaxed to "R-S*/R-L*/R-SEM/R-X always present, no duplicates among them; R-COH-* rows additional", mirroring Phase 2's pattern for plan-authoring's AC-10. AC-10's no-short-circuit invariant is preserved verbatim.
>
> Both evolutions are recorded as a single new 2026-04-28 entry in `docs/decisions.md` (Task 5 below). The APPROVED `implementation-authoring.prd.md` is NOT mutated. See the Notes section for the full rationale.

## Source PRD

- `PRPs/prds/reviewer-coherence-layer.prd.md` — Implementation Phases row 3: "code-reviewer coherence + sub-agent" — Goal: apply the pattern to `code-reviewer`, factoring the K=5 pass to a sub-agent, plus the dedicated "code contradicts task" check — Success signal: `/relay-code-review` against an existing completed plan diff emits new rows with sub-agent invocation visible in execution; verdict matches expected (APPROVED for clean diffs, CHANGES_REQUESTED for diffs with seeded coherence defects).

## Summary

Extend `plugins/relay/agents/code-reviewer.md` with a new `## The R-COH-* coherence layer (additive, runs after R-S*/R-L*/R-SEM/R-X)` section, mirroring the structural template established by Phases 1-2. Add `Task` to the agent's `tools:` allowlist (D11 contract evolution); create a new sub-agent `plugins/relay/agents/code-reviewer-semantic.md` (read-only frontmatter, `tools: Glob, Grep, Read`) that runs the bounded K=5 LLM judgment pass plus a dedicated `R-COH-TASK-CONTRADICTION` check, returning structured JSON to the parent. Create `docs/context/code-review-registries.md` with the default-relay 4-path allowlist. Implement four deterministic intra-diff checks (`R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-REGISTRY-MISSING`) inline within the parent agent using `Bash` for `ast-grep`/lint invocations and `Read`/`Glob` for path-existence verification. Three surgical Edits relax the "exactly 8" rubric-array constraint at the three sites in code-reviewer.md identified by Phase 3 grounding (vs. five sites in plan-reviewer). Both contract evolutions (D11 adding Task; AC-10 admitting R-COH-* rows) are recorded as one combined 2026-04-28 entry in `docs/decisions.md`. Existing R-S*/R-L*/R-SEM/R-X textual definitions are byte-identical pre/post Phase 3 (additive only); the arbitration mode of code-review.jsonl (single-row `id: arbitration` shape) is also untouched. Documentation site: promote code-reviewer from Planned to a new shipped section in `agents.html`; add code-reviewer-semantic as a new shipped sub-agent section; extend Stage 5 description in `pipeline.html`; extend the Unreleased block in `changelog.html` to cover all three implementation phases of the feature.

## User Story

As a relay operator running `/relay-code-review` against an implementer's diff, I want the reviewer to additionally surface intra-diff coherence defects (dead imports, calls to nonexistent functions, signature changes the diff didn't propagate to its own callers, configuration references missing from touched config files, new files unregistered in expected indexes, comments that contradict the code below them, tests whose names lie about what they assert, code whose behavior contradicts what its source plan task described) so I don't merge a diff whose internal incoherence will surface later as silent breaks, missed registrations, or human PR review thrash.

## Problem Statement

The current `code-reviewer` walks 8 rubric items: R-S1/R-S2/R-S3 (structural), R-L1/R-L2/R-L3 (lint/type/build static), R-SEM (semantic vs. plan/PRD), R-X (test-modification guard). R-S* and R-L* are structural and static-analysis. R-SEM is the "primary value layer" per D4 of `implementation-authoring.prd.md` — but it specifically checks **vertical** alignment (diff faithful to the plan task and PRD AC). It does NOT detect **horizontal** coherence within the diff itself (dead imports, signature drift between caller/callee in the same diff, comments that contradict the code below them, drift terminology between files in the diff, registry-missing for new files). R-X is a guard against test weakening but doesn't catch test-name-vs-assert mismatch. These intra-diff defects survive R-S*/R-L*/R-SEM/R-X and only surface when the test runner happens to break (subset that hits assertions) or when human PR review catches them — exactly the rework the post-PRD autonomous pipeline exists to prevent.

## Solution Statement

Add an additive coherence layer (`R-COH-*` rubric IDs, descriptive prefixed) to `code-reviewer.md`, structurally identical to the layers shipped by Phases 1-2 on prd-reviewer and plan-reviewer. The layer runs after R-S*/R-L*/R-SEM/R-X in the agent's protocol. Two execution stages: (a) **four deterministic checks** for the classes detectable mechanically within the parent agent — `R-COH-DEAD-IMPORT` (lint/ast-grep on diff content), `R-COH-CALLER-DRIFT` (ast-grep cross-reference within diff + 1-hop imports per source PRD's D4 scope), `R-COH-CONFIG-DANGLING` (grep config references in diff against touched config files), `R-COH-REGISTRY-MISSING` (Glob new-file paths against `docs/context/code-review-registries.md` allowlist); (b) a **bounded sub-agent dispatch** to a new `code-reviewer-semantic` agent invoked via `Task` — receives the diff content + plan task descriptions + PRD AC excerpts via prompt (no re-Read; XML-tag delimited per Anthropic best practices), returns at most 5 K=5 findings (`R-COH-COMMENT-MISMATCH`, `R-COH-TEST-NAME-LIES`, `R-COH-OTHER-INTERNAL-CONTRADICTION`) plus a single dedicated `R-COH-TASK-CONTRADICTION` row (always emitted with `passed: true|false`). When the sub-agent return is unparseable, the parent emits a single `R-COH-SEMANTIC-DEGRADED: passed: true` row with reason. The "exactly 8" constraint in `code-reviewer.md` is relaxed at three sites (Hard constraint #4, Phase 2 intro paragraph, JSONL format section) to "R-S*/R-L*/R-SEM/R-X always present, no duplicates among them; R-COH-* rows additional". Adding `Task` to the tools allowlist evolves D11; both AC-10 and D11 evolutions are recorded as one combined 2026-04-28 entry in `docs/decisions.md`. The arbitration-mode JSONL contract (single-row `id: arbitration` shape) is **not** modified — R-COH-* rows only appear in standard mode.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Agent prompt extension + new agent file (sub-agent) + new governance file + documentation site sync |
| Complexity | High (the most complex of the four phases): 1 agent file extended with 4 deterministic checks + Task contract, 1 new sub-agent file from scratch, 1 new context file, 1 governance entry covering 2 contract evolutions, 3 documentation surfaces) |
| Systems Affected | `plugins/relay/agents/code-reviewer.md`; `plugins/relay/agents/code-reviewer-semantic.md` (NEW); `docs/context/code-review-registries.md` (NEW); `docs/decisions.md`; `documentation/reference/agents.html`; `documentation/concepts/pipeline.html`; `documentation/changelog.html` |
| Dependencies | Phase 2 complete (plan-reviewer pattern shipped; AC-10-evolution-via-decisions.md pattern established; Phase 3 reuses both) |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/reviewer-coherence-layer.prd.md` Implementation Phases row 3 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| 1 | `plugins/relay/agents/code-reviewer.md` | full file | Target file. Understand current rubric (R-S*/R-L*/R-SEM/R-X), the standard-vs-arbitration mode dichotomy, the Bash-restricted-to-read-only protocol, the JSONL append-with-Write-first discipline (mirrored from plan-reviewer 0.7.2), and the 3 sites carrying the "exactly 8" constraint before extending. |
| 1 | `plugins/relay/agents/plan-reviewer.md` | 245–411 (the Phase 2 R-COH-* section) | Canonical structural template Phase 3 mirrors. Heading hierarchy, ID naming convention, K=5 prompt discipline, Logging discipline, Anti-pattern. |
| 1 | `plugins/relay/agents/prd-reviewer.md` | 153–260 (the Phase 1 R-COH-* section) | Secondary reference for the inline K=5 pass shape that Phase 3 adapts to a sub-agent invocation. |
| 1 | `plugins/relay/agents/research-codebase.md` | full file | Canonical template for the new `code-reviewer-semantic.md` sub-agent: frontmatter (`tools: Glob, Grep, Read`), hard caps, structured JSON return contract (`{findings, gaps, degradation_reason, scope_cap_reached}`), degradation handling. Phase 3's sub-agent reuses the discipline with code-reviewer-specific return shape. |
| 1 | `plugins/relay/agents/prd-writer.md` | 182–195 (the parallel Task invocation pattern) | Canonical pattern for `Task(subagent_type=..., prompt=...)` invocation, structured JSON parsing of the return, and degradation handling (degradation_reason set, unparseable return surfaced as partial). Phase 3 reuses this for sequential (single) sub-agent dispatch. |
| 1 | `PRPs/prds/reviewer-coherence-layer.prd.md` | full file (especially Architecture Notes lines 287-296 listing the 9 R-COH-* IDs forward-design) | Source-of-truth PRD: scope, ACs, MVP threshold (≤25% FP), the canonical R-COH-* ID list for code-reviewer (`R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-REGISTRY-MISSING`, `R-COH-COMMENT-MISMATCH`, `R-COH-TEST-NAME-LIES`, `R-COH-TASK-CONTRADICTION`, `R-COH-SEMANTIC-DEGRADED`, `R-COH-OTHER-INTERNAL-CONTRADICTION`). |
| 1 | `PRPs/prds/implementation-authoring.prd.md` | 103 (AC-10 verbatim), 316 (D11 verbatim) | The two contract sources Phase 3 evolves. AC-10's "no extras" language and D11's tool allowlist + read-only philosophy must be cited verbatim in the new docs/decisions.md entry (Task 5). |
| 2 | `docs/decisions.md` | full file (especially the 2026-04-28 entry shipped by Phase 2 for plan-authoring's AC-10) | Phase 2's entry is the structural template for Phase 3's combined D11+AC-10 entry. Same `## [2026-04-28]` heading style, same four-field shape (Context / Decision / Reason / Areas affected). |
| 2 | `plugins/relay/agents/prd-writer.md` | 383–385 | Verbatim TDD routing strings (canonical source) — required for the plan's Notes section by R5 of plan-reviewer. |
| 2 | `docs/context/methodology.md` | 1–5 | Frontmatter `tdd: false`, `test_frameworks: []`. Phase 3's deterministic checks do NOT require methodology.md (unlike Phase 2's R-COH-VALIDATE-FRAMEWORK-MISMATCH); code-reviewer's checks operate on the diff itself. |
| 2 | `documentation/AGENTS.md` | 241–285 | §6 three-file registration rule. Phase 3 promotes code-reviewer from Planned to shipped + adds a new shipped section for code-reviewer-semantic + extends the Unreleased changelog block + extends Stage 5 in pipeline.html. NAV / search-index untouched (no new pages). |
| 2 | `documentation/changelog.html` | 31–55 (Unreleased block post-Phase-2) | Phase 2's Unreleased block already exists; Phase 3 extends it in-place with additional `<li>` items + extends the description paragraph + updates Notes to "all three implementation phases shipped". No new `<h2>` heading. |
| 3 | `https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices` | - | Anthropic best practices: XML tags as canonical delimiters for multi-section prompts. Phase 3's parent uses `<diff>...</diff>`, `<plan_task>...</plan_task>`, `<prd_acs>...</prd_acs>` to delineate the sub-agent's structured input. |
| 3 | `https://code.claude.com/docs/en/sub-agents` | - | Sub-agent context preservation rationale: 'side task would flood your main conversation with search results, logs, or file contents you won't reference again.' Validates Phase 3's design — diff stays in sub-agent's window; only structured findings return. |
| 3 | `https://ast-grep.github.io/catalog/go/` | - | ast-grep `scan` command (lint/report mode, no rewrites) — Phase 3's deterministic checks invoke ast-grep via Bash for structural patterns (dead imports, signature drift). YAML rules support `has`/`inside`/`follows`/`precedes` operators for intra-file structural patterns. |
| 3 | `https://dl.acm.org/doi/10.1145/3663529.3664458` (FSE 2024) | - | Hybrid program-analysis-pre-filter + LLM-judge architecture validates Phase 3's deterministic-then-sub-agent split for comment-vs-code inconsistency. |

## Patterns to Mirror

### Pattern 1 — Phase 2's R-COH-* section structure on plan-reviewer.md

```markdown
# SOURCE: plugins/relay/agents/plan-reviewer.md:245-411
## The R-COH-* coherence layer (additive, runs after R1–R8)

After R1–R8 record their outcomes, walk this layer to detect intra-plan
contradictions the structural rubric does not catch. The layer is
**additive** — it does NOT modify or replace any R1–R8 check, and its
rows append to the same `rubric[]` array of the per-plan JSONL.
…

The "exactly 8" wording at five sites in this file (frontmatter
description, opening prose, hard-rule callout, JSONL format section,
anti-pattern bullets) is consciously evolved to "R1–R8 always present,
no duplicates among R1–R8; R-COH-* rows additional". AC-10's intent
("no short-circuit; all 8 R1–R8 always evaluated and recorded
regardless of which fail") is preserved verbatim. The contract
evolution is recorded as the 2026-04-28 entry in `docs/decisions.md`.

Two execution stages, in order:

1. **Deterministic checks** — mechanical regex / cross-reference
   validation; emit one row per check.
2. **Bounded K=5 LLM judgment pass** — single inline prompt over the
   full plan body using HD-Eval-style section-pair decomposition;
   emit at most 5 rows, one per finding; explicit "return zero
   findings if none exist" branch.

### Deterministic checks
#### R-COH-TASK-AC-MISSING — ...
#### R-COH-FILES-UNTOUCHED — ...
…

### Bounded K=5 LLM judgment pass
…

### Logging discipline
…

### Anti-pattern (specific to this layer)
**Padding the K=5 LLM pass with synthetic contradictions to fill the
cap.** Forbidden. …
```

Used by Task 1 to shape the new `## The R-COH-* coherence layer (additive, runs after R-S*/R-L*/R-SEM/R-X)` section in `code-reviewer.md`. The hierarchy (parent → Deterministic checks with `####` headings → Bounded sub-agent dispatch → Logging → Anti-pattern) is reproduced verbatim in style; only the per-check content, the sub-agent dispatch contract (vs. inline K=5), and the dedicated `R-COH-TASK-CONTRADICTION` check are code-specific.

### Pattern 2 — research-codebase.md sub-agent shape

```markdown
# SOURCE: plugins/relay/agents/research-codebase.md:1-40
---
name: research-codebase
description: Perform bounded local-codebase research…
model: sonnet
color: cyan
tools: Glob, Grep, Read
---

You are the local-codebase researcher subagent…

## Inputs (from the calling agent)
- `topic`: …
- `focus_areas`: …
- `roots`: …

## Hard constraints
- Tools: Glob, Grep, Read only. No Bash, no Edit, no Write.
- Scope caps: Operations at most 5 Glob+Grep. File reads at most 25.
  Findings returned at most 8. If any cap reached, set
  `scope_cap_reached: true`.
- All findings carry a verbatim `source` field with `path:line[s]`.

## Output (structured JSON in a fenced block)

```json
{
  "findings": [
    { "title": "...", "summary": "...", "evidence": "...", "source": "..." }
  ],
  "gaps": ["..."],
  "degradation_reason": null,
  "scope_cap_reached": false
}
```
```

Used by Task 3 to shape the new `code-reviewer-semantic.md` sub-agent file. Adaptations: `tools: Glob, Grep, Read` (read-only over the repo, satisfying D11's invariant at the sub-agent level); hard cap at 5 K=5 findings + 1 R-COH-TASK-CONTRADICTION row; return shape `{findings: [{id, passed, reason, file, line}], task_contradiction: {id, passed, reason, file, line}, scope_cap_reached, degradation_reason}` (slightly different from research-codebase's because Phase 3's findings carry rubric-style `id`/`passed`/`reason` fields, not research-style `title`/`summary`/`evidence`).

### Pattern 3 — prd-writer.md Task invocation pattern

```markdown
# SOURCE: plugins/relay/agents/prd-writer.md:182-195
Invoke the two research subagents **in parallel** via the `Task` tool:

- `subagent_type: research-web` with the topic + 1–2 focus areas
  derived from Phase 1–2 answers.
- `subagent_type: research-codebase` with the same topic; pass
  `roots` only if the user has explicitly scoped the problem to a
  sub-tree.

Parse each subagent's returned JSON block per the contract in
`plugins/relay/agents/research-web.md` and
`plugins/relay/agents/research-codebase.md`. Handle each independently:

- If `findings` is non-empty: keep all findings (subject to later
  trimming when assembling Research Summary).
- If `findings` is empty and `degradation_reason` is set: record the
  gap — the PRD's Research Summary will note the unavailability.
- If the return is unparseable: surface as
  "research agent returned unparseable output — Research Summary
  treated as partial" and continue (do NOT halt).
```

Used by Task 1 (parent code-reviewer's protocol step that dispatches the sub-agent) for: the `Task(subagent_type='code-reviewer-semantic', prompt=<XML-delimited input>)` invocation shape (sequential single dispatch, not parallel); the JSON return parsing; and the degradation handling (`degradation_reason` set → emit `R-COH-SEMANTIC-DEGRADED` row with reason; unparseable return → emit same row with reason "sub-agent returned unparseable output").

### Pattern 4 — Phase 2's docs/decisions.md AC-10 evolution entry

```markdown
# SOURCE: docs/decisions.md (the 2026-04-28 entry for plan-authoring's AC-10)
## [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array

**Context:** The reviewer-coherence-layer feature (`PRPs/prds/reviewer-coherence-layer.prd.md`, APPROVED 2026-04-28) ships an additive R-COH-* coherence layer on `plan-reviewer.md`. The layer appends rows to the same `PRPs/plans/<basename>.review.jsonl` `rubric[]` array that R1–R8 populate. AC-10 of `plan-authoring.prd.md` (line 88) was originally written as "rubric MUST contain exactly 8 objects with id values R1, R2, R3, R4, R5, R6, R7, R8 — one of each, no duplicates, no extras", which would forbid the additive R-COH-* rows.

**Decision:** AC-10's "no extras" literal wording is consciously relaxed to "R1–R8 always present, no duplicates among R1–R8, plus zero or more R-COH-* rows from the coherence layer". AC-10's intent — no short-circuit; all 8 R1–R8 items always evaluated and recorded regardless of which fail — is preserved verbatim. … The APPROVED `PRPs/prds/plan-authoring.prd.md` is NOT mutated …

**Reason:** AC-10's purpose was to forbid short-circuit; that purpose is invariant to the array length cap. The literal "no extras" wording was a design-time choice to keep the array bounded for the original 8-item rubric; it does not constitute a load-bearing contract for the additive coherence layer that did not exist when AC-10 was written. …

**Areas affected:** plan-reviewer agent (5 surgical Edits); …
```

Used by Task 5 to shape the new combined entry for D11 + AC-10 of `implementation-authoring.prd.md`. Same `## [2026-04-28]` heading style; same four-field shape (Context / Decision / Reason / Areas affected). The new entry covers BOTH evolutions (D11 adds `Task`; AC-10 admits R-COH-* rows) in one block to keep the related decisions adjacent in the audit log.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/code-reviewer.md` | UPDATE | Phase 3 core deliverable: add `R-COH-*` rubric layer section after R-X; extend Step 2 prose; extend JSONL example; relax "exactly 8" wording at 3 sites; add `Task` to frontmatter `tools:`. R-S*/R-L*/R-SEM/R-X textual definitions and arbitration-mode prose unchanged. |
| `plugins/relay/agents/code-reviewer-semantic.md` | CREATE | New sub-agent file (Phase 3 first new agent in the relay surface since plan-reviewer). Frontmatter `tools: Glob, Grep, Read` (read-only); receives diff + plan task + PRD AC excerpts via prompt; returns structured JSON with up to 5 K=5 findings + 1 R-COH-TASK-CONTRADICTION row; hard caps documented per the research-codebase template. |
| `docs/context/code-review-registries.md` | CREATE | New context file with frontmatter listing the project paths code-reviewer always considers in `R-COH-REGISTRY-MISSING` checks. Default-relay 4-path list ships; target projects override via `*update` of `context-builder`. Empty default for projects with no registry signals → silent degradation (no `R-COH-REGISTRY-MISSING` row emitted). |
| `docs/decisions.md` | UPDATE | New combined 2026-04-28 entry recording both contract evolutions (D11 adding Task; AC-10 admitting R-COH-* rows) of `implementation-authoring.prd.md`. Phase 2's separate entry for `plan-authoring.prd.md`'s AC-10 stays unchanged. |
| `documentation/reference/agents.html` | UPDATE | Promote code-reviewer from Planned to a new shipped section mirroring prd-reviewer / plan-reviewer (Phase 3 closes the analogous pre-existing gap that Phase 2 closed for plan-reviewer). Add new shipped section for `code-reviewer-semantic` (the first new sub-agent in agents.html since `research-codebase`). Update the Planned table to remove code-reviewer. |
| `documentation/concepts/pipeline.html` | UPDATE | PRD M4 + AC-7: Stage 5 Implementation Reviewer description declares "structural + coherence" coverage; mention the sub-agent dispatch and link to the reference. |
| `documentation/changelog.html` | UPDATE | `documentation/AGENTS.md` §6 three-file rule — extend Phase 1+2's Unreleased block with Phase 3 items in the Added section + extend the description paragraph; both contract evolutions noted; Notes paragraph updates to "all three implementation phases of the feature shipped; Phase 4 dogfood validation follows". No new `<h2>` heading. |

## NOT Building (Scope Limits)

- **Modification of R-S*/R-L*/R-SEM/R-X textual definitions** — the additive invariant of the source PRD; these definitions must be byte-identical pre/post Phase 3.
- **Modification of the arbitration-mode JSONL contract** — the single-row `id: arbitration` shape used in dispute resolution stays untouched. R-COH-* rows only appear in standard mode.
- **Mutation of `PRPs/prds/implementation-authoring.prd.md`** — both contract evolutions (D11 + AC-10) are recorded in `docs/decisions.md`, not by editing the APPROVED PRD. Reopening APPROVED PRDs is explicitly out of scope.
- **Phase 4 (dogfood validation) work** — Phase 4 owns its scope. Phase 3 ships the layer; Phase 4 generates the first `*.code-review.jsonl` files (no real fixtures exist on disk yet — confirmed by Phase 3 grounding).
- **Schema changes to `code-review.jsonl` beyond accommodating new IDs and the relaxed "exactly 8" constraint** — explicit invariant of the source PRD; the rubric[] array shape is unchanged. Only the *constraint* on the array's content is relaxed.
- **Repo-wide drift terminology detection** — out of scope per source PRD; code-reviewer's K=5 pass operates on diff + 1-hop imports + registry allowlist only.
- **Repo-wide caller scan for symbols modified in the diff** — limited to first-degree imports per the source PRD's D4 scope. Discovering callers of a modified symbol in arbitrary repo files is out of scope (source PRD explicitly notes this).
- **CodeRabbit-style verification-script pattern** — explicitly rejected at the source PRD level (D10).
- **Reopening already-APPROVED code-review verdicts to re-validate with the new layer** — out of scope.
- **Adding `Edit` to code-reviewer's tools** — explicitly preserved as forbidden by the relaxed D11. Only `Task` is added.
- **Promoting `plan-writer` to a shipped section in agents.html** — Phase 2's report tracked this as a fast-follow gap; Phase 3 doesn't address it.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/code-reviewer.md — add R-COH-* layer + extend Step 2 + extend JSONL example

**ACTION**: Insert a new `## The R-COH-* coherence layer (additive, runs after R-S*/R-L*/R-SEM/R-X)` section in `code-reviewer.md` between the existing R-X definition's last bullet and the next `---` separator before `## Protocol`. Mirror the Pattern 1 structure (parent prose → Deterministic checks subsection with `#### R-COH-*` headings → Bounded sub-agent dispatch subsection → Logging discipline → Anti-pattern). Four deterministic `#### R-COH-*` headings ship in Phase 3:

  - **R-COH-DEAD-IMPORT** — for each file in the diff, parse import declarations and flag any imported symbol not used in the file body. Implementation: Bash invocation of `ast-grep` (or language-specific lint in report mode) on each touched file; parser-error → emit `passed: true` with reason "language not supported by ast-grep; check skipped". Fail reason names the file path and the unused import token verbatim.
  - **R-COH-CALLER-DRIFT** — for each function/method signature changed in the diff, search the diff itself + first-degree imports of the diff's files (M=10 hop cap per source PRD's D4 scope) for callers; if any caller is on the OLD signature, fail. Implementation: ast-grep cross-reference within diff; `Read` of each first-degree import (cap M=10). Fail reason names the renamed/changed symbol + caller file:line + signature mismatch.
  - **R-COH-CONFIG-DANGLING** — grep the diff for configuration key references (e.g., `config["KEY"]`, `getenv("KEY")`, `process.env.KEY`); for each touched config file in the diff, verify the keys are defined. Implementation: regex on diff body (language-agnostic patterns) + grep on touched config files. Fail reason names the dangling key and the file expected to define it.
  - **R-COH-REGISTRY-MISSING** — for each new file (CREATE action) in the diff under directories listed in `docs/context/code-review-registries.md`'s allowlist, verify the new file appears in at least one of the allowlist registry files (typically index pages, NAV, search-index). Implementation: parse `code-review-registries.md` frontmatter (`registries:` key); for each new file under a registered directory, grep the registry files. **Silent-degradation branch:** if `code-review-registries.md` is absent OR `registries: []`, emit single `passed: true` row with reason "no registries declared; check skipped". Fail reason names the new file and the missing registry path(s).

  Then a `### Bounded sub-agent dispatch (code-reviewer-semantic via Task)` subsection that documents:
  - **Dispatch contract**: parent invokes `Task(subagent_type='code-reviewer-semantic', prompt=<XML-delimited structured input>)`. The prompt template uses XML tags (Anthropic best practices, Pattern from web grounding):
    ```
    <diff>
    ...full unified diff content...
    </diff>

    <plan_task>
    ...the source plan's Step-by-Step Tasks excerpt for this code change...
    </plan_task>

    <prd_acs>
    ...the source PRD's relevant AC-N items...
    </prd_acs>

    <instructions>
    Run the K=5 LLM judgment pass and the dedicated R-COH-TASK-CONTRADICTION check.
    Return strict JSON per the contract documented in your agent file.
    </instructions>
    ```
  - **K=5 ID taxonomy** (sub-agent classifies findings):
    - `R-COH-COMMENT-MISMATCH` — comment in diff contradicts the code below it.
    - `R-COH-TEST-NAME-LIES` — test name describes one behavior; assertions check another.
    - `R-COH-OTHER-INTERNAL-CONTRADICTION` — catchall.
  - **Dedicated check** `R-COH-TASK-CONTRADICTION` — code's signature/parameter list/return type/behavior literally contradicts the source plan task description (extension of R-SEM, focused on intra-diff structural divergence vs. R-SEM's broader semantic alignment). Always emitted as one row (`passed: true|false`).
  - **Degradation handling**: if sub-agent returns unparseable output, emit `R-COH-SEMANTIC-DEGRADED: passed: true` with reason "sub-agent returned unparseable output; semantic checks treated as partial" and continue (do NOT fail the run).

  Then `### Logging discipline` mirroring Phase 1+2 patterns (one row per check; total per run: 8 [R-S/R-L/R-SEM/R-X] + 4 [deterministic R-COH-*] + ≤5 [K=5 sub-agent findings] + 1 [R-COH-TASK-CONTRADICTION] + ≤1 [R-COH-SEMANTIC-DEGRADED on degradation] = 13 to 19 rows in standard mode).

  Then `### Anti-pattern (specific to this layer)` forbidding K=5 padding (mirror Phase 1+2 wording).

  Then update Protocol Step 2 prose: append a sentence after the existing "Walk R-S1/R-S2/R-S3/R-L1/R-L2/R-L3/R-SEM/R-X in order" paragraph: "After R-S*/R-L*/R-SEM/R-X record their outcomes, walk the R-COH-* coherence layer: deterministic checks first, then dispatch the bounded sub-agent. Append one row per check + one row per sub-agent finding to the same outcome array."

  Then update the JSONL example block (around lines 698-705 per Phase 3 grounding) to include at least 4 deterministic R-COH-* rows + 1 sample sub-agent finding + 1 `R-COH-TASK-CONTRADICTION` row.

**MIRROR**: Pattern 1 (Phase 2's plan-reviewer R-COH-* section) for hierarchy and prose style; Pattern 3 (prd-writer Task invocation) for the dispatch contract; Phase 1's prd-reviewer K=5 prompt discipline (Datadog quote-both-sides + temperature 0.2 + strict JSON + no padding) for the sub-agent's K=5 contract.

**VALIDATE**: `grep -cE '^### R-(S[1-3]|L[1-3]|SEM|X)' plugins/relay/agents/code-reviewer.md` must equal `8` (R-S*/R-L*/R-SEM/R-X unchanged). `grep -cE '^#### R-COH-' plugins/relay/agents/code-reviewer.md` must equal `4` (the four deterministic check headings). `grep -c 'R-COH-' plugins/relay/agents/code-reviewer.md` must show ≥12 occurrences. `grep -c "code-reviewer-semantic" plugins/relay/agents/code-reviewer.md` must be ≥3 (sub-agent name appears in the dispatch subsection + Anti-pattern + JSONL example commentary).

### Task 2: UPDATE plugins/relay/agents/code-reviewer.md — relax "exactly 8" + add Task to tools

**ACTION**: Three surgical Edits at the sites identified by Phase 3 grounding (vs. five sites in plan-reviewer Phase 2):

  1. **Frontmatter `tools:` line** — replace `tools: Read, Write, Glob, Grep, Bash, BashOutput` with `tools: Read, Write, Glob, Grep, Bash, BashOutput, Task`. Add a new comment line in frontmatter or the opening prose noting the D11 evolution: "(`Task` added 2026-04-28 to enable bounded `code-reviewer-semantic` sub-agent dispatch; D11's read-only invariant preserved — sub-agent is also read-only over the repo; no `Edit`)".

  2. **Hard constraint #4 at lines 99-104** — replace "the jsonl `rubric` array MUST contain exactly 8 objects with ids `R-S1`, `R-S2`, `R-S3`, `R-L1`, `R-L2`, `R-L3`, `R-SEM`, `R-X` — one of each, no duplicates, no extras" with "the jsonl `rubric` array MUST contain at least 8 objects with ids `R-S1`, `R-S2`, `R-S3`, `R-L1`, `R-L2`, `R-L3`, `R-SEM`, `R-X` — one of each, no duplicates among them — plus zero or more `R-COH-*` rows from the additive coherence layer. AC-10's no-short-circuit invariant is preserved; the relaxation of 'no extras' is recorded as the 2026-04-28 entry in `docs/decisions.md`."

  3. **Phase 2 intro at line 237** — locate the prose stating the rubric[] contains "exactly 8 objects" and apply the same relaxation phrasing.

  4. **JSONL format section at lines 697-700** — locate the prose stating the standard-mode rubric MUST contain "exactly 8 objects" and apply the same relaxation. **Important**: arbitration mode's "exactly 1 object in arbitration mode" wording is preserved unchanged (R-COH-* rows do NOT appear in arbitration mode; arbitration is a separate dispute-resolution shape).

  Each Edit uses a narrow `old_string` covering only the wording to change; the surrounding paragraph structure is preserved byte-for-byte.

**MIRROR**: Pattern 1 (Phase 2's relax-Edits in plan-reviewer.md). The "at least 8 objects … no duplicates among them" phrasing is reused verbatim.

**VALIDATE**: `grep -c 'exactly 8' plugins/relay/agents/code-reviewer.md` must equal `0` after Edits at the 3 substantive sites (any remaining occurrences must be inside meta-references in the new R-COH-* layer section explaining the relaxation, mirroring Phase 2's deviation #2). `grep -c 'no duplicates among them' plugins/relay/agents/code-reviewer.md` must be ≥2 (multiple sites carry the new wording). `grep -c 'Task' plugins/relay/agents/code-reviewer.md` (in frontmatter context) must be ≥1 — confirming Task added to tools. `grep -c 'exactly 1 object in arbitration mode' plugins/relay/agents/code-reviewer.md` must equal `1` — confirming arbitration mode wording untouched.

### Task 3: CREATE plugins/relay/agents/code-reviewer-semantic.md — new sub-agent

**ACTION**: Create a new agent file at `plugins/relay/agents/code-reviewer-semantic.md` with the following structure (mirroring research-codebase.md template per Pattern 2):

  - **Frontmatter**: `name: code-reviewer-semantic`, `description: Bounded LLM judgment pass for intra-diff coherence — invoked by code-reviewer parent via Task. Receives diff + plan task + PRD AC excerpts via prompt; returns structured JSON with up to 5 K=5 findings + 1 dedicated R-COH-TASK-CONTRADICTION row. Read-only over the repo; no Edit; no Bash; no Write to anything other than the parent's prompt return.`, `model: sonnet`, `color: <choose: not used by other agents — orange? purple?>`, `tools: Glob, Grep, Read`.

  - **Body sections**:
    - **Inputs (from the calling agent)**: structured prompt with XML tags (`<diff>`, `<plan_task>`, `<prd_acs>`, `<instructions>`).
    - **Hard constraints**: tools restricted; no Bash, Edit, Write; cap at K=5 generic findings + 1 task-contradiction row; verbatim-quote-both-sides discipline; temperature 0.2; XML-tag delimiter mandate per Anthropic best practices.
    - **Output (structured JSON in a fenced block)**:
      ```json
      {
        "findings": [
          { "id": "R-COH-COMMENT-MISMATCH", "passed": false, "reason": "...", "file": "...", "line": ... }
        ],
        "task_contradiction": { "id": "R-COH-TASK-CONTRADICTION", "passed": true|false, "reason": "..." },
        "scope_cap_reached": false,
        "degradation_reason": null
      }
      ```
    - **K=5 ID taxonomy** (sub-agent picks per finding): R-COH-COMMENT-MISMATCH, R-COH-TEST-NAME-LIES, R-COH-OTHER-INTERNAL-CONTRADICTION.
    - **Dedicated R-COH-TASK-CONTRADICTION check**: always emitted as one row; passes when diff faithfully implements the plan task's described signature/behavior, fails when it diverges.
    - **Anti-patterns**: no padding to 5; no fabrication; no commentary outside the JSON; no Bash invocations; no Read of files outside `target_root`; preserve verbatim quotes of contradicting fragments.
    - **Out of scope**: anything beyond the K=5 + task-contradiction checks (the parent agent owns the deterministic checks).

**MIRROR**: Pattern 2 (research-codebase.md structure). Adapt the return shape to rubric-style `{id, passed, reason, file, line}` rows instead of research-style `{title, summary, evidence, source}`.

**VALIDATE**: `test -f plugins/relay/agents/code-reviewer-semantic.md && echo OK` must print OK. `grep -c '^name: code-reviewer-semantic$' plugins/relay/agents/code-reviewer-semantic.md` must equal `1`. `grep -c '^tools: Glob, Grep, Read$' plugins/relay/agents/code-reviewer-semantic.md` must equal `1`. `grep -c 'R-COH-TASK-CONTRADICTION' plugins/relay/agents/code-reviewer-semantic.md` must be ≥3 (in the body, the output schema, and the anti-pattern section). `grep -cE 'R-COH-(COMMENT-MISMATCH|TEST-NAME-LIES|OTHER-INTERNAL-CONTRADICTION)' plugins/relay/agents/code-reviewer-semantic.md` must equal `3`.

### Task 4: CREATE docs/context/code-review-registries.md — new context file with default-relay allowlist

**ACTION**: Create a new file at `docs/context/code-review-registries.md` with frontmatter listing the four default-relay registry paths plus prose explaining the file's purpose and how target projects override.

  Frontmatter shape:
  ```yaml
  ---
  registries:
    - path: plugins/relay/commands/
      rule: every new agent file in plugins/relay/agents/ must be referenced by at least one command file in plugins/relay/commands/
    - path: documentation/reference/agents.html
      rule: every new agent file must have a section in this page (or be listed in the Planned table)
    - path: documentation/changelog.html
      rule: every change to plugins/relay/agents/ must add a changelog entry under the current Unreleased block
    - path: documentation/AGENTS.md
      rule: contract for documentation/ changes — the three-file rule mandates NAV / search-index / changelog updates whenever pages are added, renamed, or removed
  ---

  # Code Review Registries
  ```

  Followed by prose:
  - Purpose: declarative list of paths the `code-reviewer` agent's `R-COH-REGISTRY-MISSING` check considers when verifying that new files in the diff are properly registered in expected indexes / NAV / cross-references.
  - Per-project regeneration: target projects' `context-builder` `*update` regenerates this file when the project's documentation structure changes. Manual edits are preserved across regeneration when possible.
  - Empty-default behavior: when `registries: []` (or the file is absent), the `R-COH-REGISTRY-MISSING` check degrades silently — emits a single `passed: true` row with reason "no registries declared; check skipped".
  - Cross-reference: see `plugins/relay/agents/code-reviewer.md` (the `R-COH-REGISTRY-MISSING` deterministic check) and `PRPs/prds/reviewer-coherence-layer.prd.md` (Q4 Decision Gate evidence + D6 in Decisions Log).

**MIRROR**: `docs/context/methodology.md`'s structure (frontmatter + prose body). The `methodology.md` file is the closest pattern in the repo for "small frontmatter declarative + prose body" per Phase 1's grounding.

**VALIDATE**: `test -f docs/context/code-review-registries.md && echo OK` must print OK. The frontmatter must parse as valid YAML — `python3 -c "import yaml; print('OK' if yaml.safe_load(open('docs/context/code-review-registries.md').read().split('---')[1]) else 'FAIL')"` must print OK. `grep -c 'plugins/relay/commands/' docs/context/code-review-registries.md` must be ≥1. `grep -c 'documentation/AGENTS.md' docs/context/code-review-registries.md` must be ≥1.

### Task 5: UPDATE docs/decisions.md — add 2026-04-28 combined entry for D11 + AC-10 evolution

**ACTION**: Insert a new entry between the Phase 2 entry (the 2026-04-28 plan-authoring AC-10 entry) and the trailing template comment. Mirror Pattern 4's four-field shape:

  - **Title**: `## [2026-04-28] code-reviewer gains Task tool + AC-10 of implementation-authoring.prd.md evolves: R-COH-* rows are additive`
  - **Context**: Phase 3 of the reviewer-coherence-layer feature ships an additive R-COH-* coherence layer on `code-reviewer.md` plus a new sub-agent `code-reviewer-semantic.md` invoked via `Task`. This requires evolving two contracts in the APPROVED `PRPs/prds/implementation-authoring.prd.md`: D11 (line 316 — tools allowlist excludes Task) and AC-10 (line 103 — rubric[] array contains "exactly one entry per rubric item evaluated, no duplicates, no extras"). Both contracts predate the sub-agent factoring decision (D2 of `reviewer-coherence-layer.prd.md`) and the additive R-COH-* layer.
  - **Decision**: (D11) `Task` is consciously added to code-reviewer's tools allowlist, exclusively for invoking the read-only `code-reviewer-semantic` sub-agent. D11's read-only invariant is preserved verbatim: code-reviewer parent does NOT gain `Edit`; the sub-agent is itself read-only over the repo (`tools: Glob, Grep, Read`); no Bash invocations from the sub-agent. (AC-10) AC-10's "no extras" wording is consciously relaxed to "R-S*/R-L*/R-SEM/R-X always present, no duplicates among them; R-COH-* rows additional". AC-10's no-short-circuit invariant is preserved verbatim. Both relaxations are implemented by surgical Edits in `plugins/relay/agents/code-reviewer.md` (Phase 3 of reviewer-coherence-layer plan, Tasks 1 and 2). The APPROVED `PRPs/prds/implementation-authoring.prd.md` is NOT mutated.
  - **Reason**: D11's purpose was to enforce read-only review philosophy; that purpose is invariant to the tool count — adding `Task` for bounded delegation to a read-only sub-agent does not violate the philosophy, it extends it. AC-10's purpose was to forbid short-circuit; that purpose is invariant to the array length cap. Recording both evolutions in a single entry keeps the related contract changes adjacent in the audit log; future agents consulting code-reviewer's tools or code-review.jsonl shape find both relaxations together.
  - **Areas affected**: code-reviewer agent (frontmatter `tools:` Edit + 3 surgical relax-Edits at the "exactly 8" sites + new `## The R-COH-* coherence layer` section + Step 2 prose extension + JSONL example extension); new code-reviewer-semantic sub-agent (the read-only delegate invoked via Task); future code-reviewer-related decisions (e.g., a Phase 4 dogfood-driven calibration that may add or remove R-COH-* IDs).

**MIRROR**: Pattern 4 (Phase 2's 2026-04-28 entry for plan-authoring's AC-10). Same `## [2026-04-28]` heading style; same four-field shape.

**VALIDATE**: `grep -cE '^## \[2026-04-28\] (AC-10|code-reviewer)' docs/decisions.md` must equal `2` (Phase 2's entry + Phase 3's entry). `grep -c 'D11 of `implementation-authoring' docs/decisions.md` must be ≥1. `grep -c 'reviewer-coherence-layer' docs/decisions.md` must be ≥2 (referenced from both the Phase 2 and Phase 3 entries).

### Task 6: UPDATE documentation/reference/agents.html — promote code-reviewer to shipped + add code-reviewer-semantic shipped section

**ACTION**: Three updates to `documentation/reference/agents.html`:

  1. **Promote code-reviewer from Planned to a new shipped section.** Insert after the existing plan-reviewer shipped section (added by Phase 2) and before research-web. Mirror prd-reviewer's / plan-reviewer's structure: kv-block (Path, Model, Invoked by, Responsibility, Never), 8-item rubric kv-block (R-S1/R-S2/R-S3/R-L1/R-L2/R-L3/R-SEM/R-X), and a new `<h4 id="code-reviewer-coherence">The R-COH-* coherence layer (additive)</h4>` sub-section enumerating all 9 R-COH-* IDs (4 deterministic + 3 K=5 + 1 task-contradiction + 1 semantic-degraded) in a kv-block + 2 explanatory paragraphs (sub-agent dispatch contract, AC-10 + D11 contract evolution).

  2. **Add a new `<h3 id="code-reviewer-semantic">code-reviewer-semantic <span class="badge badge--done">shipped</span></h3>` section** after the code-reviewer section. Brief kv-block: Path, Model, Invoked by (`code-reviewer` parent via Task), Responsibility (bounded K=5 LLM judgment pass + R-COH-TASK-CONTRADICTION check), Caps (5 K=5 findings, 1 task-contradiction row), Never (no padding, no fabrication, no Bash, no Edit, no Write, no Read outside target_root).

  3. **Remove code-reviewer row from the Planned table** at line 246. Annotate the row deletion in the Phase 3 changelog entry (Task 8). The remaining `report-pr-creator`, `docs-updater`, `docs-reviewer` rows stay in Planned.

**MIRROR**: The plan-reviewer shipped section added by Phase 2 (lines ~189-265 area post-Phase-2). Same heading hierarchy + kv-block layout + sub-section style.

**VALIDATE**: `grep -c '<h3 id="code-reviewer">' documentation/reference/agents.html` must equal `1` (the new shipped section). `grep -c '<h3 id="code-reviewer-semantic">' documentation/reference/agents.html` must equal `1` (the new sub-agent section). `grep -c '<h4 id="code-reviewer-coherence">' documentation/reference/agents.html` must equal `1`. The Planned table must NOT contain a row with `<code>code-reviewer</code>` (i.e., `grep -c '<tr><td><code>code-reviewer</code></td>' documentation/reference/agents.html` must equal `0`).

### Task 7: UPDATE documentation/concepts/pipeline.html — Stage 5 Implementation Reviewer description

**ACTION**: Locate Stage 5 description in `documentation/concepts/pipeline.html` (around line 84 per Phase 1 grounding: "focuses on correctness + rule violations"). Replace the Reviewer dt/dd pair to mirror Phase 2's Stage 2 update style: original prose preserved, then **plus an additive R-COH-* coherence layer** appended with a brief enumeration of the four deterministic checks (dead imports, caller drift, config dangling, registry missing) + the sub-agent K=5 pass (comment mismatch, test name lies, code contradicts task) + a link to `../reference/agents.html#code-reviewer-coherence`.

**MIRROR**: Phase 2's Stage 2 sentence in `documentation/concepts/pipeline.html`.

**VALIDATE**: `grep -c 'R-COH-' documentation/concepts/pipeline.html` must equal `3` after Edit (Phase 1: 1 for Stage 1; Phase 2: 1 for Stage 2; Phase 3: 1 for Stage 5). The HTML must remain well-formed (Level 1 validation).

### Task 8: UPDATE documentation/changelog.html — extend Phase 1+2's Unreleased block with Phase 3 items

**ACTION**: Read the current Unreleased block (lines ~31-65 area, post-Phase-2). Three updates:

  1. **Extend the description paragraph** to cover all three phases together. Phrasing: change "Phases 1 and 2 of the **reviewer-coherence-layer** feature" to "Phases 1, 2, and 3 of the **reviewer-coherence-layer** feature" and append (in the same paragraph) a Phase 3 paragraph: "**Phase 3 (code-reviewer):** intra-diff coherence shipped via four deterministic checks (`R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-REGISTRY-MISSING`) inline in the parent agent + a new sub-agent `code-reviewer-semantic` invoked via `Task` for the bounded K=5 LLM judgment pass over three K=5 IDs (`R-COH-COMMENT-MISMATCH`, `R-COH-TEST-NAME-LIES`, `R-COH-OTHER-INTERNAL-CONTRADICTION`) plus a dedicated `R-COH-TASK-CONTRADICTION` check. The sub-agent receives the diff + plan task + PRD AC excerpts via XML-delimited prompt (Anthropic best practices); is read-only (`tools: Glob, Grep, Read`); returns structured JSON. **D11 + AC-10 contract evolution:** Phase 3 consciously evolves D11 of `implementation-authoring.prd.md` (`Task` added to code-reviewer's tools, preserving the read-only invariant — sub-agent is also read-only) and AC-10 (`exactly 8 objects` → `R-S*/R-L*/R-SEM/R-X always present, no duplicates among them; R-COH-* rows additional`); both evolutions are recorded as a single combined 2026-04-28 entry in `docs/decisions.md`. New context file: `docs/context/code-review-registries.md` with the default-relay 4-path allowlist."

  2. **Extend the Added section** with new `<li>` items for Phase 3 files: `plugins/relay/agents/code-reviewer.md` (new R-COH-* section + 3 surgical relax-Edits + Task added to tools + Step 2 extension + JSONL example update); `plugins/relay/agents/code-reviewer-semantic.md` (new sub-agent file from scratch); `docs/context/code-review-registries.md` (new context file); `docs/decisions.md` (new combined 2026-04-28 entry); `documentation/reference/agents.html` (new shipped section for code-reviewer + new shipped section for code-reviewer-semantic + code-reviewer row removed from Planned table); `documentation/concepts/pipeline.html` (Stage 5 description extended).

  3. **Update the Notes paragraph** to "All three implementation phases of the reviewer-coherence-layer feature shipped. Phase 4 (dogfood validation against ≥3 APPROVED artifacts per reviewer with FP ≤25% per reviewer) is the release gate; the dogfood pass will generate the first `*.code-review.jsonl` files (none exist on disk yet, per Phase 3 grounding)."

**MIRROR**: Phase 2's extension pattern in `documentation/changelog.html:31-55`. Phase 3 extends the same Unreleased block in-place — no new `<h2>` heading, no new section. All three phases share the same Unreleased block until release cut.

**VALIDATE**: `grep -cE 'R-COH-(DEAD-IMPORT|CALLER-DRIFT|CONFIG-DANGLING|REGISTRY-MISSING|COMMENT-MISMATCH|TEST-NAME-LIES|TASK-CONTRADICTION|SEMANTIC-DEGRADED)' documentation/changelog.html` must equal at least `8` (each new Phase 3 ID appears at least once). `grep -c 'code-reviewer-semantic' documentation/changelog.html` must be ≥3. `grep -c 'D11' documentation/changelog.html` must be ≥1. `grep -c 'all three implementation phases' documentation/changelog.html` must equal `1` — confirming the Notes paragraph updated.

## Validation Commands

### Level 1 — STATIC_ANALYSIS

- Markdown lint on the agent files: `markdownlint plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md docs/context/code-review-registries.md` (if installed; otherwise visual review).
- Markdown lint on the governance file: `markdownlint docs/decisions.md`.
- HTML well-formedness on the touched documentation files: `python -c "from html.parser import HTMLParser; p=HTMLParser(); p.feed(open('documentation/reference/agents.html', encoding='utf-8').read())"` per file (the lenient HTMLParser smoke from Phases 1-2; tolerant of HTML5 self-closing tags).
- YAML frontmatter parse on `code-review-registries.md`: `python3 -c "import yaml; yaml.safe_load(open('docs/context/code-review-registries.md').read().split('---')[1])"`.

### Level 2 — CONTENT_INVARIANTS

- R-S/R-L/R-SEM/R-X byte-identical: `git diff plugins/relay/agents/code-reviewer.md` filtered to lines starting with `### R-(S[1-3]|L[1-3]|SEM|X)` and their immediate following content must show NO changes to the rubric definitions themselves. The 3 surgical relax-Edits (Task 2) are explicitly allowed and only touch the wording of the "exactly 8" / "Task allowed" prose, not the rubric definitions.
- Phase 3 deterministic checks present: `grep -cE '^#### R-COH-' plugins/relay/agents/code-reviewer.md` must equal `4`.
- Phase 3 K=5 IDs documented (in code-reviewer-semantic.md): `grep -cE 'R-COH-(COMMENT-MISMATCH|TEST-NAME-LIES|OTHER-INTERNAL-CONTRADICTION)' plugins/relay/agents/code-reviewer-semantic.md` must equal `3`.
- R-COH-TASK-CONTRADICTION present in both parent and sub-agent: `grep -c 'R-COH-TASK-CONTRADICTION' plugins/relay/agents/code-reviewer.md` ≥`1`; `grep -c 'R-COH-TASK-CONTRADICTION' plugins/relay/agents/code-reviewer-semantic.md` ≥`3`.
- "exactly 8" relaxation applied at all 3 sites: `grep -c 'exactly 8' plugins/relay/agents/code-reviewer.md` must equal `0` for substantive sites (any remaining occurrences are intentional meta-references in the new R-COH-* section explaining the relaxation, mirroring Phase 2's deviation #2). `grep -c 'no duplicates among them' plugins/relay/agents/code-reviewer.md` must be ≥`2`.
- Task added to tools: `grep -c '^tools:.*Task' plugins/relay/agents/code-reviewer.md` must equal `1` (frontmatter line).
- Arbitration mode untouched: `grep -c 'exactly 1 object in arbitration mode' plugins/relay/agents/code-reviewer.md` must equal `1`.
- New combined decision entry: `grep -cE '^## \[2026-04-28\] code-reviewer gains Task' docs/decisions.md` must equal `1`. The entry must mention both D11 and AC-10.
- New sub-agent file exists with correct frontmatter: per Task 3 VALIDATE.
- New context file exists with valid YAML frontmatter: per Task 4 VALIDATE.
- Documentation surfaces synced: per Tasks 6, 7, 8 VALIDATEs.

### Level 3 — INTEGRATION (DRY-RUN END-TO-END)

- Same constraint as Phases 1-2: no DRAFT plan exists in `PRPs/plans/` to run `/relay-plan-review` against; for code-reviewer, no `*.code-review.jsonl` fixtures exist on disk (confirmed by Phase 3 grounding: zero existing files). True end-to-end exercise of the layer is **Phase 4 dogfood** which generates the first code-review runs.
- Substantive equivalent for Phase 3:
  - Validate the JSONL example block in `code-reviewer.md` parses as valid JSON (Phase 1+2 mirror).
  - Validate the sub-agent return shape example in `code-reviewer-semantic.md` parses as valid JSON.
  - Validate the YAML frontmatter of `code-review-registries.md` parses (Level 1 includes this).
  - Manual sanity walk: walk the new R-COH-* layer + sub-agent dispatch mentally against `PRPs/plans/completed/reviewer-coherence-layer-phase-1-prd-reviewer-coherence.plan.md`'s implementation diff (the Phase 1 implementation that produced the prd-reviewer R-COH-* layer, recoverable via `git log --follow plugins/relay/agents/prd-reviewer.md`). Confirm:
    - The 4 deterministic checks have well-defined parsing semantics on the diff.
    - The sub-agent's K=5 prompt produces well-formed structured output when applied mentally.
    - The dedicated R-COH-TASK-CONTRADICTION check correctly compares the diff to the Phase 1 plan's task descriptions.
- Phase 4 (dogfood validation) is the formal end-to-end verification gate per the source PRD AC-6. Phase 3's L3 is a smoke check, not the substantive validation.

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** `plugins/relay/agents/code-reviewer.md` contains a new `## The R-COH-* coherence layer (additive, runs after R-S*/R-L*/R-SEM/R-X)` section after the R-X definition; the section defines 4 deterministic `#### R-COH-*` headings (`R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-REGISTRY-MISSING`) and documents the sub-agent dispatch contract; R-S*/R-L*/R-SEM/R-X textual definitions are byte-identical to pre-Phase-3 (verifiable via `git diff` filtered to those rubric items).
- **AC-A2 (PRD AC-3, AC-4):** Protocol Step 2 walks R-COH-* after R-S*/R-L*/R-SEM/R-X; the resulting `PRPs/plans/<basename>.code-review.jsonl` `rubric[]` array contains the existing R-S*/R-L*/R-SEM/R-X rows in their existing format AND ≥1 new `R-COH-*` deterministic row AND ≥1 row sourced from the `code-reviewer-semantic` sub-agent (visible in the JSONL example block).
- **AC-A3 (PRD AC-3, AC-9):** The new sub-agent `plugins/relay/agents/code-reviewer-semantic.md` exists with frontmatter `tools: Glob, Grep, Read` (no Bash, no Edit, no Write, no Task — the sub-agent is read-only over the repo), receives input via XML-delimited prompt sections (`<diff>`, `<plan_task>`, `<prd_acs>`, `<instructions>`), and returns a structured JSON block per the documented contract (`{findings, task_contradiction, scope_cap_reached, degradation_reason}`).
- **AC-A4 (PRD AC-1):** A new combined entry in `docs/decisions.md` titled `## [2026-04-28] code-reviewer gains Task tool + AC-10 of implementation-authoring.prd.md evolves: R-COH-* rows are additive` records both contract evolutions. The entry preserves the four-field shape and explicitly states that D11's read-only invariant and AC-10's no-short-circuit invariant are both preserved verbatim.
- **AC-A5 (PRD AC-8):** A new context file `docs/context/code-review-registries.md` exists with frontmatter listing the 4 default-relay registry paths (`plugins/relay/commands/`, `documentation/reference/agents.html`, `documentation/changelog.html`, `documentation/AGENTS.md`); each row has a `path` and a `rule` field. The frontmatter parses as valid YAML.
- **AC-A6 (PRD AC-7):** `documentation/reference/agents.html` adds a new shipped `<h3 id="code-reviewer">` section with kv-block + 8-item rubric + R-COH-* coherence sub-section + AC-10/D11 evolution paragraph; adds a new shipped `<h3 id="code-reviewer-semantic">` section for the sub-agent; removes the code-reviewer row from the Planned table.
- **AC-A7 (PRD AC-7, M4):** `documentation/concepts/pipeline.html` Stage 5 Implementation Reviewer description references the additive R-COH-* layer + sub-agent dispatch and links to `../reference/agents.html#code-reviewer-coherence`.
- **AC-A8 (PRD AC-7):** `documentation/changelog.html` Unreleased block extends Phases 1+2 content with Phase 3 items in the Added section, updates the description paragraph to cover all three phases, and updates the Notes paragraph to "all three implementation phases shipped". No new Unreleased `<h2>` is created.
- **AC-A9 (PRD AC-3):** Rubric R-S*/R-L*/R-SEM/R-X textual definitions in `plugins/relay/agents/code-reviewer.md` are byte-identical pre/post Phase 3 (no whitespace, wording, or ordering changes to the rubric definitions themselves; the "exactly 8" wording at the 3 sites IS changed by Task 2 — this is intentional and is NOT inside the rubric definitions).
- **AC-A10 (PRD AC-4, AC-5):** code-reviewer remains autonomous; CHANGES_REQUESTED stays terminal; the existing read-only philosophy (no `Edit`, Bash restricted to read-only) is preserved verbatim. `Task` is the ONLY tool added; `Edit` remains absent. The sub-agent itself is read-only over the repo (no `Bash`, no `Edit`, no `Write`).
- **AC-A11 (PRD AC-10):** `R-COH-CALLER-DRIFT` deterministic check operates on diff + first-degree imports of diff files (M=10 hop cap per source PRD's D4 scope); the check does NOT scan the repo for callers beyond imports.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Surgical Edit at one of the 3 "exactly 8" sites accidentally changes R-S/R-L/R-SEM/R-X wording | Medium | High (breaks AC-A9) | Each Edit uses `old_string` covering only the wording-to-change, narrow enough to be unique; post-edit `git diff` filtered to the rubric-item region must be empty; Level 2 invariant `grep -c 'exactly 8'` = 0 confirms all 3 substantive sites updated |
| Sub-agent return is unparseable in production | Medium | Low (with mitigation) | Parent's protocol explicitly handles unparseable returns by emitting a single `R-COH-SEMANTIC-DEGRADED: passed: true` row with reason; the run continues; Phase 4 dogfood will measure how often this fires |
| Token budget for sub-agent invocation exceeds expected when diff + plan task + PRD AC excerpts are stuffed in prompt | Medium | Medium | Web grounding indicates 10–50K tokens is normal for sub-agent calls; typical relay diffs (3-5 files, hundreds of LOC) + plan task descriptions + PRD AC excerpts fit in 5–15K. If budget is exceeded for unusually large diffs, parent emits `R-COH-SEMANTIC-DEGRADED` with reason "diff too large for sub-agent budget" |
| `R-COH-CALLER-DRIFT` ast-grep usage doesn't work for languages without ast-grep support | Medium | Low | Each deterministic check has a per-language degradation branch (passed: true with reason "language not supported by ast-grep; check skipped"); silent degradation matches the source PRD's principle |
| Adding `Task` to code-reviewer's tools is mistaken for a broader scope expansion | Low | Medium | The new docs/decisions.md entry (Task 5) explicitly bounds the addition: `Task` is added EXCLUSIVELY for the `code-reviewer-semantic` sub-agent dispatch; the code-reviewer parent still has no `Edit` and no general write access; the sub-agent is itself read-only |
| `R-COH-REGISTRY-MISSING` produces false positives because relay's own `code-review-registries.md` is the first instance and the registries themselves may have lag in updating | Medium | Medium | Phase 4 dogfood will measure FP rate of this specific check separately. If FP > 25%, the check's allowlist behavior (silent-degradation when registry's "rule" is ambiguous) can be tightened in fast-follow |
| Token budget for the parent agent is strained when 4 deterministic checks + sub-agent dispatch + JSONL emission all demand context | Medium | Medium | Cap M=10 imports + ≤5 registries hard-coded; sub-agent receives diff via prompt (no re-Read inside sub-agent); parent halts-and-emits-`R-COH-SEMANTIC-DEGRADED` if sub-agent return is unparseable |
| Phase 3 mid-flow grounding missed an "exactly 8" / "exactly 1" site beyond the 3 identified | Low | Low | Task 2 begins with a targeted `grep -nE "exactly [0-9]+ objects?" plugins/relay/agents/code-reviewer.md` BEFORE applying Edits to confirm the count matches research findings; if a 4th site is found, it gets added to the Edit list |
| Documentation gap: code-reviewer is being promoted from Planned to shipped but no v0.7.x changelog entry recorded its original ship | Low | Low | Phase 3's changelog entry covers the promotion explicitly; future readers find the shipped state in v0.7.x's effective date (2026-04-28) and the in-place Unreleased block |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

- **ID naming convention reused from Phases 1-2.** Phase 3 emits 4 deterministic IDs (`R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-REGISTRY-MISSING`), 3 K=5 taxonomy IDs (`R-COH-COMMENT-MISMATCH`, `R-COH-TEST-NAME-LIES`, `R-COH-OTHER-INTERNAL-CONTRADICTION`), 1 dedicated check (`R-COH-TASK-CONTRADICTION`), and 1 degradation marker (`R-COH-SEMANTIC-DEGRADED`). Total 9 new IDs in Phase 3. Combined with Phase 1 (7 IDs) and Phase 2 (10 IDs), the feature ships 26 R-COH-* IDs in total.

- **The K=5 pass for code-reviewer is sub-agent (not inline).** This is the canonical D2 decision from the source PRD: PRD/plan reviewers run K=5 inline because their artifacts are small markdown files; code-reviewer dispatches a sub-agent because diffs can be large and parent token budget pressures justify the factoring. Phase 3 is the only phase implementing the sub-agent pattern.

- **D11 + AC-10 contract evolution is recorded in `docs/decisions.md`, not in the APPROVED `implementation-authoring.prd.md`**. Same canonical pattern as Phase 2's evolution of plan-authoring's AC-10. APPROVED PRDs are immutable; contract evolution lives in `docs/decisions.md`. Future agents reading D11 or AC-10 of `implementation-authoring.prd.md` should also consult `docs/decisions.md` for any subsequent decisions binding those contracts.

- **The code-reviewer-semantic sub-agent is the first new agent in the relay surface since plan-reviewer (v0.7.0).** This is a structurally significant addition — it's the first agent invoked via Task by another agent that's NOT a research-* agent. The sub-agent's contract is intentionally narrower than research-codebase (only 3 K=5 finding classes + 1 dedicated check) to keep the surface focused on intra-diff coherence.

- **Phase 4 dogfood will run code-reviewer's new layer against the implementation-authoring Phase 1 + Phase 2 diffs** (recoverable via git history), generating the first `*.code-review.jsonl` files in the repo. The dogfood report will show `R-COH-CALLER-DRIFT` and `R-COH-DEAD-IMPORT` in action against real production code, plus the sub-agent's K=5 findings on real comment-vs-code patterns.

- **Color choice for the new sub-agent.** Relay agents currently use: blue (prd-writer), teal (prd-reviewer), cyan (plan-reviewer, research-codebase), orange (plan-writer), green (?), yellow (?). The new code-reviewer-semantic sub-agent's color should be distinct from cyan (used by research-codebase to signal sub-agent role); proposed: `purple` or `magenta`. The implementer picks during Task 3 based on what's actually in use in the repo.

- **No NAV / search-index updates needed.** Per `documentation/AGENTS.md` §6, NAV and search-index updates apply only when pages are added / renamed / removed; Phase 3 only modifies content of existing pages. Phases 1-2 already applied the same logic.

- **The `R-COH-CONFIG-DANGLING` check has language-agnostic regex patterns.** The check looks for common config-key-reference patterns: `config["KEY"]`, `config.KEY`, `getenv("KEY")`, `process.env.KEY`, `os.environ["KEY"]`, `ENV["KEY"]`. Each pattern is matched against config files of the corresponding language (when the diff touches them). When the diff doesn't touch config files, the check emits `passed: true` with reason "no config files in diff".

- **Phase 3 is the longest plan of the four.** Reflects the source PRD's MoSCoW: code-reviewer phase has the most surface area (parent agent + sub-agent + new context file + 2 contract evolutions + 3 doc surfaces). Phase 4 (dogfood) is operationally lighter but takes longer wall-clock time because it generates real review verdicts.

*Generated: 2026-04-28*
*Approved: 2026-04-28*
*Status: APPROVED*
