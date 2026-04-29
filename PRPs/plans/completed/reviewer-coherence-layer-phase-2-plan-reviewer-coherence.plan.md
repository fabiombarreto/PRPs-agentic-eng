# Feature: plan-reviewer coherence (Phase 2 of reviewer-coherence-layer)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of an existing agent file (`plugins/relay/agents/plan-reviewer.md`); contract evolution of AC-10 of an APPROVED PRD (recorded as a new decision in `docs/decisions.md`, not by mutating the APPROVED PRD); cross-cutting impact on the documentation site (regra dos 3 arquivos); reuses the `R-COH-*` ID-naming convention shipped by Phase 1
- Decisions found:
  - 2026-04-19 Interactivity boundary — plan-reviewer remains autonomous; the new layer adds rubric items, not new dialog turns; CHANGES_REQUESTED stays terminal
  - 2026-04-19 PRD template fork — new `R-COH-*` IDs slot into the existing `rubric[]` array without renumbering R1–R8
  - 2026-04-19 Command surface (writer/reviewer split) — plan-reviewer is the reviewer half of `/relay-plan-review`; the layer extends rubric, not surface
  - 2026-04-25 Plan filenames carry phase number + slug — this plan uses `reviewer-coherence-layer-phase-2-plan-reviewer-coherence.plan.md`
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/` — JSONL log path (`PRPs/plans/<basename>.review.jsonl`) unchanged
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — none introduced
  - "Activating the TDD track by heuristic" — not touched; R5 of plan-reviewer (TDD routing) preserved verbatim
- Applicable architectural rules:
  - Interactivity boundary at PRD approval (preserved; plan-reviewer stays autonomous)
  - PRP artifact paths under `PRPs/` (preserved)
  - `documentation/AGENTS.md` §6 three-file registration rule (must comply for Phase 2 docs sync; Phase 1's Unreleased changelog block extends, no new page)
- Result: PROCEED
```

> **Decision Gate note — AC-10 contract evolution.** This phase consciously evolves AC-10 of `plan-authoring.prd.md` ("rubric MUST contain exactly 8 objects … no extras"). AC-10's intent ("no short-circuit; all 8 evaluated every run") is preserved; only its literal "no extras" wording is relaxed to "R1–R8 always present, no duplicates among R1–R8; R-COH-* rows additional". The evolution is recorded as a new 2026-04-28 entry in `docs/decisions.md` (Task 3 below), not by mutating the APPROVED `plan-authoring.prd.md`. See the Notes section for the full rationale.

## Source PRD

- `PRPs/prds/reviewer-coherence-layer.prd.md` — Implementation Phases row 2: "plan-reviewer coherence" — Goal: apply the Phase 1 pattern to `plan-reviewer`, extending R8 traceability with intra-plan checks — Success signal: `/relay-plan-review` against an existing APPROVED plan emits the new rows; existing R1–R8 unchanged.

## Summary

Extend `plugins/relay/agents/plan-reviewer.md` with a new `## The R-COH-* coherence layer (additive, runs after R1–R8)` section between R8's definition and the `## Protocol` section, mirroring the exact structure shipped by Phase 1 in `prd-reviewer.md` (parent heading → `### Deterministic checks` with `#### R-COH-*` headings → `### Bounded K=5 LLM judgment pass` with K=5 ID taxonomy as bullets → `### Logging discipline` → `### Anti-pattern`). Five plan-specific deterministic checks ship: `R-COH-TASK-AC-MISSING`, `R-COH-FILES-UNTOUCHED`, `R-COH-VALIDATE-FRAMEWORK-MISMATCH`, `R-COH-PATTERN-SOURCE-MISSING`, `R-COH-MANDATORY-READING-MISSING`. The K=5 LLM pass picks among five plan-specific contradiction classes plus a catchall. Phase 2 also relaxes the "exactly 8" rubric-array constraint at the five sites in `plan-reviewer.md` that carry it (frontmatter description, opening prose, hard-rule callout, JSONL format section, anti-pattern bullets) to the additive "R1–R8 always present + R-COH-* rows additional" contract, and records the AC-10 contract evolution as a new entry in `docs/decisions.md`. Existing R1–R8 textual definitions and Step 2 / Step 4 protocol prose are byte-identical pre/post Phase 2 (additive only). The plan-reviewer agent stays autonomous (CHANGES_REQUESTED terminal); no `Task` tool added (sub-agent factoring is Phase 3 / code-reviewer territory only).

## User Story

As a relay operator running `/relay-plan-review` against a DRAFT plan, I want the reviewer to additionally surface internal inconsistencies inside the plan (tasks that don't reference any AC, Files-to-Change rows that no task touches, VALIDATE commands that don't match the project's declared frameworks, Patterns-to-Mirror SOURCE paths that don't exist, Mandatory Reading paths that don't exist, plus prose-level drift between Summary / Solution Statement and the Step-by-Step Tasks) so I don't approve a plan whose internal incoherence will propagate defects into the implementation phase and waste downstream review cycles.

## Problem Statement

The current `plan-reviewer` walks R1–R8 (Decision Gate, mandatory sections in order, no TBD in mandatory fields, ≥3 tasks with VALIDATE, TDD routing matches methodology.md, no `.claude/` prefix, Files to Change ≥1 row, PRD↔plan traceability via R8a/R8b/R8c). All eight checks are **structural** (R1–R7) plus one **vertical traceability** check (R8 — plan AC-A items reference real PRD AC-N tokens). None of them detects **horizontal coherence within the plan**: a Step-by-Step Task that promises to update a file not in the Files-to-Change table; a Files-to-Change row whose file no task ever touches; a VALIDATE command using a framework the project doesn't declare; a Patterns-to-Mirror snippet citing a SOURCE path that doesn't exist; a Mandatory Reading entry pointing at an absent file; or prose-level drift where the Summary claims approach X but the tasks deliver Y. These intra-plan defects survive R1–R8 and surface only when the implementer runs (and either silently produces the wrong code or fails on the missing file), absorbing rework that the autonomous post-PRD pipeline exists to prevent.

## Solution Statement

Add an additive coherence layer (`R-COH-*` rubric IDs, descriptive prefixed) to `plan-reviewer.md`, structurally identical to Phase 1's shipped layer in `prd-reviewer.md`. The layer runs after R1–R8 in Protocol Step 2. Two execution stages: (a) five deterministic checks for the classes detectable mechanically (regex / cross-reference validation against `Read`/`Glob`-resolvable paths and the plan's own table content); (b) one bounded K=5 LLM judgment pass over the full plan body, with the prompt anchored to the named sections of `plan-template.md` (HD-Eval-style criteria decomposition: section-pair comparisons rather than monolithic "find all contradictions"). Each finding becomes one row in `PRPs/plans/<basename>.review.jsonl` under the `rubric[]` array; the existing R1–R8 rows remain in their existing format, byte-identical. The "exactly 8" constraint that exists at five sites in `plan-reviewer.md` is relaxed to "R1–R8 always present, no duplicates among R1–R8; R-COH-* rows additional" — surgical Edits at each site preserve the spirit of AC-10 (no short-circuit; all 8 always evaluated) while accommodating the additive layer. The AC-10 contract evolution is recorded as a new entry in `docs/decisions.md` rather than by mutating the APPROVED `plan-authoring.prd.md`, per the Decision Gate's resolution above.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Agent prompt extension + governance file update + documentation site sync |
| Complexity | Medium-High (agent file with 5 surgical relax-Edits + new section + governance addition + 3 documentation surfaces) |
| Systems Affected | `plugins/relay/agents/plan-reviewer.md`; `docs/decisions.md`; `documentation/reference/agents.html`; `documentation/concepts/pipeline.html`; `documentation/changelog.html` |
| Dependencies | Phase 1 complete (`R-COH-*` ID-naming convention established in `prd-reviewer.md`; Phase 2 reuses the structural pattern) |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/reviewer-coherence-layer.prd.md` Implementation Phases row 2 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| 1 | `plugins/relay/agents/plan-reviewer.md` | full file | Target file. Understand current rubric (R1–R8), Protocol Step 2 walk, Step 4 auto-flip, JSONL append-and-Write-first discipline, and the 5 sites carrying the "exactly 8" constraint before extending. |
| 1 | `plugins/relay/agents/prd-reviewer.md` | 153–261 (the new R-COH-* section shipped by Phase 1) | Canonical structural template Phase 2 mirrors. Heading hierarchy, ID naming convention, K=5 prompt discipline, Logging discipline, Anti-pattern. |
| 1 | `PRPs/prds/reviewer-coherence-layer.prd.md` | full file (especially line 211 Phase 2 scope, lines 274–281 ACs, line 116 Hypothesis with Phase 1's TDD-false routing) | Source-of-truth PRD: scope, ACs, MVP threshold (≤25% FP), naming convention reuse mandate. |
| 1 | `docs/context/plan-template.md` | 56–224 (15 mandatory sections with structural shapes) | Ground truth for the 5 deterministic checks: Mandatory Reading is a table; Patterns to Mirror snippets have `# SOURCE: <path>:<line-range>` headers; Files to Change is a table with File/Action/Justification; Step-by-Step Tasks have `**VALIDATE**: <command>` lines; Acceptance Criteria are `**AC-A<i> (PRD AC-<N>):** <statement>`. |
| 1 | `PRPs/prds/plan-authoring.prd.md` | 88 (AC-10 verbatim) | The source of the "exactly 8" constraint. Phase 2 evolves AC-10's contract via `docs/decisions.md` entry, not by mutating this PRD. |
| 2 | `plugins/relay/agents/prd-writer.md` | 383–385 | Verbatim TDD routing strings (canonical source) — required for the plan's Notes section by R5 of plan-reviewer. |
| 2 | `docs/context/methodology.md` | 1–5 (frontmatter) | Frontmatter has `tdd: false`, `tdd_evidence: null`, `test_frameworks: []`. The R-COH-VALIDATE-FRAMEWORK-MISMATCH check reads `test_frameworks`; when empty, the check degrades silently (no mismatch detectable). |
| 2 | `docs/decisions.md` | full file (especially the most recent entry shape) | New decision entry to be added: "[2026-04-28] AC-10 of plan-authoring.prd.md evolves to allow additive R-COH-* rows alongside R1–R8". Mirror the existing entry shape exactly. |
| 2 | `documentation/AGENTS.md` | 241–285 | §6 three-file registration rule. Phase 2 updates `documentation/reference/agents.html` (plan-reviewer section), `documentation/concepts/pipeline.html` (Stage 2 description), and `documentation/changelog.html` (extend Phase 1's Unreleased block; no new entry — both phases ship together). NAV / search-index untouched (no new pages). |
| 2 | `documentation/changelog.html` | 31–43 (current Unreleased block from Phase 1) | Phase 1's Unreleased entry already exists; Phase 2 extends it with additional `<li>` items in the Added section + extends the description paragraph. Confirms entry shape and extension strategy. |
| 3 | `https://arxiv.org/html/2411.15594v6` | - | LLM-as-judge survey: HD-Eval criteria decomposition pattern. Phase 2's K=5 prompt structures section-pair comparisons (Summary vs. Tasks; ACs vs. Tasks; Patterns vs. Tasks) rather than monolithic "find all contradictions". |
| 3 | `https://cleanlab.ai/blog/tlm-structured-outputs-benchmark/` | - | Per-field/per-section trust scoring is the production analog of K=5 with section-name evidence; reinforces "cite the section name" requirement in the K=5 prompt. |

## Patterns to Mirror

### Pattern 1 — Phase 1's R-COH-* section structure on prd-reviewer.md

```markdown
# SOURCE: plugins/relay/agents/prd-reviewer.md:153-261
## The R-COH-* coherence layer (additive, runs after R1–R7)

After R1–R7 record their outcomes, walk this layer to detect intra-PRD
contradictions the structural rubric does not catch. The layer is
**additive** — it does NOT modify or replace any R1–R7 check, and its
rows append to the same `rubric[]` array of the per-PRD JSONL.

Two execution stages, in order:

1. **Deterministic checks** — mechanical regex / cross-reference
   validation; emit one row per check.
2. **Bounded K=5 LLM judgment pass** — single inline prompt over the
   full PRD body; emit at most 5 rows, one per finding; explicit
   "return zero findings if none exist" branch.

### Deterministic checks

#### R-COH-NUMBER-DRIFT — table vs. prose number drift
- ...

### Bounded K=5 LLM judgment pass

After the deterministic checks emit their rows, run a single LLM pass
over the full PRD body with this contract...

### Logging discipline

Each R-COH-* outcome is one row in `rubric[]`. ...

### Anti-pattern (specific to this layer)

**Padding the K=5 LLM pass with synthetic contradictions to fill the
cap.** Forbidden. ...
```

Used by Task 1 to shape the new `## The R-COH-* coherence layer (additive, runs after R1–R8)` section in `plan-reviewer.md`. The hierarchy (parent → Deterministic checks with `####` headings → K=5 pass with bullet taxonomy → Logging → Anti-pattern) is reproduced verbatim in style; only the per-check content and the K=5 ID taxonomy are plan-specific.

### Pattern 2 — plan-reviewer.md's R8 sub-check inline-bold-label structure

```markdown
# SOURCE: plugins/relay/agents/plan-reviewer.md:205-236
### R8 — PRD↔plan traceability (NEW, plan-stage exclusive)

Three sub-checks, all of which must pass:

- **R8a — Source PRD exists.** The plan's `## Source PRD` section
  names a real PRD file. ...
- **R8b — AC traceability.** Every item in the plan's
  `## Acceptance Criteria` section must reference at least one
  PRD `AC-<N>` token. ...
- **R8c — Source PRD back-fill.** Extract `<N>` from the plan
  filename suffix... ...

R8 fails if any of R8a, R8b, R8c fails. The fail reason should
name which sub-check tripped and why.
```

Used by Task 1 as a secondary reference for grouping multiple cross-reference checks under one rubric item. Note: Phase 2's deterministic checks use the Phase 1 style (`####` headings per check) rather than R8's inline-bold-label style — Phase 1's style is more discoverable and matches how Phase 1 shipped. R8's grouping discipline ("the fail reason should name which sub-check tripped") is preserved in spirit for the K=5 pass (each finding's `id` field IS the named class).

### Pattern 3 — JSONL "exactly 8" constraint sites needing surgical relaxation

```markdown
# SOURCE: plugins/relay/agents/plan-reviewer.md:430-433
The `rubric` array MUST contain exactly 8 objects with `id` values
`R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8` — one of each, no
duplicates, no extras. AC-10 enforces this regardless of whether
earlier items failed.
```

Used by Task 2 to identify the exact wording to replace. Five sites carry this language (per research-codebase grounding):
1. Frontmatter `description:` line 3 — "8-item structural rubric (R1–R8)" + "all 8 rubric outcomes recorded (no short-circuit)"
2. Opening prose line 20 — "8 outcomes regardless of whether earlier items failed"
3. Hard-rule callout lines 63–66 — "exactly 8 objects with ids R1–R8"
4. JSONL format section lines 430–433 (this snippet) — "exactly 8 objects … no extras"
5. Anti-pattern bullets around lines 454–456 — "truncated rubric array is a contract violation"

Each site gets a surgical Edit that preserves the no-short-circuit invariant ("R1–R8 always present, no duplicates among R1–R8") while explicitly admitting R-COH-* rows ("plus zero or more R-COH-* rows additional"). Task 2 enumerates each site in detail.

### Pattern 4 — docs/decisions.md most recent entry shape

```markdown
# SOURCE: docs/decisions.md:279-284
## [2026-04-25] Plan filenames carry the source PRD phase number and slug

**Context:** The api-reference shorthand at `docs/api-reference.md:39` lists `/relay-plan` output as `PRPs/plans/<feature>.plan.md`, treating each feature as one plan. The plan-authoring PRD ... generates one plan per PRD Implementation Phases row, not one per feature. ...
**Decision:** Plan files written by `plan-writer` use the path `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`, where ...
**Reason:** Per-phase plans match the actual unit of work the Implementer consumes, ...
**Areas affected:** plan-writer agent, plan-reviewer agent, /relay-plan command, ...
```

Used by Task 3 to shape the new decision entry: `## [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive`. Same four-field structure (Context / Decision / Reason / Areas affected). Body explains that AC-10's "exactly 8 objects … no extras" wording was a design-time constraint to forbid short-circuiting; the no-short-circuit invariant is preserved (R1–R8 always present, no duplicates), only the literal "no extras" wording is relaxed to admit additive R-COH-* rows.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Phase 2 core deliverable: add `R-COH-*` rubric layer section after R8; extend Protocol Step 2 prose; extend JSONL example; relax "exactly 8" wording at 5 sites. R1–R8 textual definitions and Step 4 auto-flip prose unchanged. |
| `docs/decisions.md` | UPDATE | New entry recording the AC-10 contract evolution (R-COH-* additive). The canonical place per `docs/decision-gate.md` for "decisions the AI must not re-evaluate". |
| `documentation/reference/agents.html` | UPDATE | PRD AC-7: docs sync for plan-reviewer section — Responsibility, rubric kv-block, Never list reflect coherence layer; mirror Phase 1's prd-reviewer section style. |
| `documentation/concepts/pipeline.html` | UPDATE | PRD M4 + AC-7: Stage 2 Plan Reviewer description declares "structural + coherence" coverage. |
| `documentation/changelog.html` | UPDATE | `documentation/AGENTS.md` §6 three-file rule — extend Phase 1's Unreleased block with additional `<li>` items in the Added section + extend the description paragraph; both phases ship together. |

## NOT Building (Scope Limits)

- **Modification of R1–R8 textual definitions** — the additive invariant of the source PRD; R1–R8 must be byte-identical pre/post Phase 2.
- **Sub-agent for the K=5 pass in plan-reviewer** — Phase 2 runs the K=5 pass inline within the existing `plan-reviewer` agent. Sub-agent factoring (`code-reviewer-semantic`) is Phase 3 territory and applies to `code-reviewer` only.
- **`Task` tool added to plan-reviewer's frontmatter** — current `tools: Read, Edit, Write` preserved. The plan-reviewer's hard-constraint "this agent has no Task tool" (per the "Structural defects are reported, not edited" rule) is reaffirmed by Phase 2.
- **Mutation of `PRPs/prds/plan-authoring.prd.md`** — AC-10 contract evolution is recorded in `docs/decisions.md`, not by editing the APPROVED PRD. Reopening APPROVED PRDs is explicitly out of scope per the source PRD's invariants and `prd-reviewer`'s `already_approved` precondition.
- **Phase 3 (code-reviewer) or Phase 4 (dogfood) work** — those phases own their respective scopes.
- **Schema changes to `*.review.jsonl` beyond accommodating new IDs** — explicit invariant of the source PRD; the rubric[] array shape is unchanged. Only the *constraint* on the array's content (the "no extras" wording) is relaxed.
- **Repo-wide drift terminology detection** — out of scope per source PRD; plan-reviewer's K=5 pass operates on the single plan `.md` only.
- **CodeRabbit-style verification-script pattern** — explicitly rejected at the source PRD level (D10) and inapplicable to plan-reviewer regardless.
- **Reopening already-APPROVED plans to re-validate with the new layer** — manual hand-edit (status flip back to DRAFT) is the documented escape hatch.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/plan-reviewer.md — add R-COH-* layer section + extend Step 2 + extend JSONL example

**ACTION**: Insert a new `## The R-COH-* coherence layer (additive, runs after R1–R8)` section between the existing `### R8` definition's last bullet (line 236 area) and the next `---` separator (which sits before `## Protocol`). The new section follows the Phase 1 hierarchical structure (Pattern 1):

  - Parent prose paragraph explaining the additive nature.
  - `### Deterministic checks` subsection with five `#### R-COH-*` headings:
    - **R-COH-TASK-AC-MISSING** — every Step-by-Step Task references at least one Acceptance Criterion (`AC-A<i>` or `AC-<N>` token) that the plan defines, OR the task is explicitly marked as infrastructure / scaffolding (no AC binding required for the latter narrow class). The check parses the plan's `### Task` headings and grep their bodies for `AC-` token references; cross-checks against the plan's `## Acceptance Criteria` section. Fail reason names the orphan task by `### Task <i>` heading.
    - **R-COH-FILES-UNTOUCHED** — every row of the `## Files to Change` table has at least one task in `## Step-by-Step Tasks` whose ACTION line or body mentions the file path. The check parses both tables and computes the symmetric difference; specifically: orphan files (in the table but no task touches them) FAIL. Tasks touching files not in the table are a separate (already R7-adjacent) concern not in this Phase 2 scope.
    - **R-COH-VALIDATE-FRAMEWORK-MISMATCH** — every `**VALIDATE**:` command in `## Step-by-Step Tasks` matches at least one declared framework in `<target_root>/docs/context/methodology.md` `test_frameworks` array. When `test_frameworks` is empty (current state of relay's own methodology.md), the check **degrades silently** — emit a single `passed: true` row with `reason` field set to "test_frameworks is empty in methodology.md; no framework declared, check skipped". Do NOT fail in the empty-frameworks case (silent degradation per the source PRD's principle).
    - **R-COH-PATTERN-SOURCE-MISSING** — every `# SOURCE: <path>:<line-range>` header in `## Patterns to Mirror` resolves to a real path readable from `<target_root>`. Use `Read` (with optional `offset`/`limit` matching the line range) to verify both the path exists AND the cited line range is within the file's actual line count. Fail reason names the orphan SOURCE header verbatim and reports whether the path is missing or the line range is out of bounds.
    - **R-COH-MANDATORY-READING-MISSING** — every path in the `## Mandatory Reading` table (path column, when not a URL) resolves to a real file readable from `<target_root>`. URLs (recognized by `https://` or `http://` prefix) are skipped (web reads are not part of plan-reviewer's tool surface). Fail reason names the orphan path.
  - `### Bounded K=5 LLM judgment pass` subsection with the K=5 ID taxonomy as bullets:
    - `R-COH-SUMMARY-TASKS-DRIFT` — Summary or Solution Statement claims approach X but Step-by-Step Tasks deliver approach Y.
    - `R-COH-AC-TASK-DECOUPLED` — a plan AC-A item references an AC behavior that no task implements, OR a task delivers behavior that no AC-A enforces.
    - `R-COH-PATTERN-TASK-DRIFT` — a Pattern-to-Mirror snippet doesn't match what a referencing task claims to copy (header `# SOURCE: ...` exists and resolves but the snippet content doesn't match the task's MIRROR claim).
    - `R-COH-MANDATORY-READING-IRRELEVANT` — a Mandatory Reading row's "why" justification doesn't match the file's actual content (LLM-judged; deterministic version would require Read of every file which exceeds budget).
    - `R-COH-OTHER-INTERNAL-CONTRADICTION` — catchall.
  - K=5 prompt design (inline in agent system prompt; HD-Eval criteria decomposition style — section-pair comparisons; document-first placement; quote-both-sides; cite the section heading verbatim per finding; explicit "return `[]` if no contradictions" instruction; temperature 0.2 default; Promptfoo strict-JSON discipline; no commentary outside JSON).
  - `### Logging discipline` subsection: each R-COH-* outcome is one row in `rubric[]`; total length per run is `8 (R1–R8) + 5 (deterministic R-COH-*) + ≤5 (K=5 pass) = 13 to 18 rows` for plan-reviewer (vs. 9–14 for prd-reviewer). The "exactly 8" wording at the 5 sites is relaxed by Task 2.
  - `### Anti-pattern (specific to this layer)`: identical-in-spirit to Phase 1 — "Padding the K=5 LLM pass with synthetic contradictions to fill the cap. Forbidden."

  Then update Protocol Step 2 prose (around line 255 of the current file): after the existing "Walk R1 through R8 in order" paragraph, append a sentence: "After R1–R8 record their outcomes, walk the R-COH-* coherence layer (deterministic checks first, then the bounded K=5 LLM pass). Append one row per check and one row per K=5 finding to the same outcome array."

  Then update the JSONL example block (around lines 405–425) to include at least one `R-COH-*` row showing the verbatim-quote `reason` discipline (Phase 1 mirror).

**MIRROR**: Pattern 1 (Phase 1's prd-reviewer.md R-COH-* section) for hierarchy and prose style; Pattern 2 (plan-reviewer R8 sub-check style) for grouping discipline reference; Pattern 3 (the JSONL "exactly 8" snippet) is mirrored separately by Task 2.

**VALIDATE**: `grep -c '^### R[1-8] —' plugins/relay/agents/plan-reviewer.md` must equal `8` (R1–R8 unchanged). `grep -c '^#### R-COH-' plugins/relay/agents/plan-reviewer.md` must equal `5` (the five deterministic check headings). `grep -c 'R-COH-' plugins/relay/agents/plan-reviewer.md` must show ≥10 occurrences (the 5 deterministic IDs + 5 K=5 IDs in the taxonomy + the JSONL example row + prose mentions).

### Task 2: UPDATE plugins/relay/agents/plan-reviewer.md — relax "exactly 8" constraint at 5 sites

**ACTION**: Five surgical Edits, one per site identified by Pattern 3:

  1. **Frontmatter `description:` (line 3)** — replace "8-item structural rubric (R1–R8)" with "8-item structural rubric (R1–R8) plus the additive R-COH-* coherence layer"; replace "all 8 rubric outcomes recorded (no short-circuit)" with "all 8 R1–R8 outcomes recorded plus zero or more R-COH-* outcomes (no short-circuit on R1–R8)".

  2. **Opening prose (line 20)** — replace "8 outcomes regardless" with "8 R1–R8 outcomes plus zero or more R-COH-* outcomes regardless".

  3. **Hard-rule callout (lines 63–66)** — preserve the bullet structure but replace the "exactly 8 objects … no duplicates, no extras" prose with: "the jsonl `rubric` array contain at least 8 objects with ids `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8` — one of each, no duplicates among R1–R8 — plus zero or more `R-COH-*` rows from the coherence layer (additive). The 'no short-circuit' invariant of AC-10 is preserved: R1–R8 are always all present and recorded regardless of whether earlier items failed."

  4. **JSONL format section (lines 430–433)** — replace "The `rubric` array MUST contain exactly 8 objects with `id` values `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8` — one of each, no duplicates, no extras. AC-10 enforces this regardless of whether earlier items failed." with: "The `rubric` array MUST contain at least 8 objects with `id` values `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8` — one of each, no duplicates among R1–R8. Additional `R-COH-*` rows from the coherence layer may follow. AC-10's no-short-circuit invariant is preserved: R1–R8 are always all present and evaluated regardless of whether earlier items failed; the relaxation of 'no extras' to admit R-COH-* rows is recorded as a 2026-04-28 entry in `docs/decisions.md`."

  5. **Anti-pattern bullets (around lines 454–456)** — replace "Short-circuiting the rubric. AC-10 requires all 8 items to be evaluated and recorded every run. A truncated rubric array is a contract violation visible in the audit log." with: "Short-circuiting the rubric. AC-10 requires all 8 R1–R8 items to be evaluated and recorded every run, and the coherence layer adds zero or more R-COH-* rows after them. A rubric array missing any of R1–R8, or containing duplicate R1–R8 ids, is a contract violation visible in the audit log."

  Each Edit uses a narrow `old_string` covering only the wording to change; the surrounding paragraph structure is preserved byte-for-byte.

**MIRROR**: Pattern 3 (the JSONL "exactly 8" snippet) is the canonical phrase shape that needs evolution; the relaxed wording reuses the shape ("rubric array MUST contain …") to keep the document's voice consistent.

**VALIDATE**: `grep -c 'exactly 8' plugins/relay/agents/plan-reviewer.md` must equal `0` after the edits (all 5 sites replaced). `grep -c 'no duplicates among R1–R8' plugins/relay/agents/plan-reviewer.md` must be ≥3 (multiple sites carry the new wording). `grep -c 'AC-10' plugins/relay/agents/plan-reviewer.md` must remain ≥3 (AC-10 references preserved with revised explanation).

### Task 3: UPDATE docs/decisions.md — add 2026-04-28 entry for AC-10 contract evolution

**ACTION**: Insert a new entry between the most recent existing entry (the 2026-04-25 plan filename entry) and the trailing template comment. The entry follows Pattern 4 (Context / Decision / Reason / Areas affected):

  - **Title**: `## [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array`
  - **Context**: The reviewer-coherence-layer feature (PRPs/prds/reviewer-coherence-layer.prd.md, APPROVED 2026-04-28) ships an additive R-COH-* coherence layer on plan-reviewer.md. The layer appends rows to the same `PRPs/plans/<basename>.review.jsonl` `rubric[]` array that R1–R8 populate. AC-10 of plan-authoring.prd.md (lines 88) was originally written as "rubric MUST contain exactly 8 objects with id values R1, R2, R3, R4, R5, R6, R7, R8 — one of each, no duplicates, no extras", which would forbid the additive R-COH-* rows.
  - **Decision**: AC-10's "no extras" literal wording is consciously relaxed to "R1–R8 always present, no duplicates among R1–R8, plus zero or more R-COH-* rows from the coherence layer". AC-10's *intent* — no short-circuit; all 8 R1–R8 items always evaluated and recorded regardless of which fail — is **preserved verbatim**. The relaxation is implemented by surgical Edits at the five sites in `plugins/relay/agents/plan-reviewer.md` carrying the original "exactly 8" wording (Phase 2 of reviewer-coherence-layer plan, Task 2). The APPROVED PRPs/prds/plan-authoring.prd.md is **NOT mutated** — reopening APPROVED PRDs is explicitly out of scope per `docs/anti-patterns.md` and the source PRD's invariants. Future plan-authoring work should refer to this decision as the operative contract, with AC-10 documenting the original design-time constraint.
  - **Reason**: AC-10's purpose was to forbid short-circuit; that purpose is invariant to the array length cap. The literal "no extras" wording was a design-time choice to keep the array bounded for the original 8-item rubric; it does not constitute a load-bearing contract for the additive coherence layer that did not exist when AC-10 was written. Recording the evolution in `docs/decisions.md` (per `docs/decision-gate.md`'s mandate that decisions.md is the canonical home) preserves the ability of future agents to consult the decision without re-deriving it from the PRD evolution.
  - **Areas affected**: plan-reviewer agent (5 surgical Edits); the new `## The R-COH-* coherence layer` section in plan-reviewer.md; future plan-authoring features that may add additional rubric layers.

  The entry's surrounding markdown (the closing `---` separator before the next entry, and the trailing template comment) is preserved byte-for-byte.

**MIRROR**: Pattern 4 (the 2026-04-25 plan filename entry) — same four-field shape (Context / Decision / Reason / Areas affected) and the same `## [YYYY-MM-DD] <title>` heading style.

**VALIDATE**: `grep -c '## \[2026-04-28\] AC-10' docs/decisions.md` must equal `1`. `grep -c 'reviewer-coherence-layer' docs/decisions.md` must be ≥1. The `Areas affected:` line must mention "plan-reviewer agent". The entry must precede the trailing `<!-- Template for future entries:` comment.

### Task 4: UPDATE documentation/reference/agents.html — plan-reviewer section reflects coherence layer

**ACTION**: Locate the plan-reviewer section in `documentation/reference/agents.html` (the section adjacent to the prd-reviewer section already updated in Phase 1; structure mirrors prd-reviewer's). Apply three updates following the Phase 1 prd-reviewer template:

  1. Update the Responsibility text from the current "8-item structural rubric" wording to "8-item structural rubric **plus the additive R-COH-* coherence layer** (5 deterministic intra-plan checks + a bounded K=5 LLM judgment pass)".
  2. Add a new bullet to the Never list: "Pad the K=5 LLM pass with synthetic contradictions to fill the cap" (mirroring Phase 1's prd-reviewer addition).
  3. Add a new `<h4 id="plan-reviewer-coherence">The R-COH-* coherence layer (additive)</h4>` sub-section after the existing 8-item rubric kv-block, with a kv-block enumerating the 5 deterministic IDs and the 5 K=5 IDs (10 dt/dd pairs total) plus a closing paragraph documenting the K=5 prompt discipline (HD-Eval section-pair decomposition; cite section heading verbatim; quote both sides; temperature 0.2; no Task sub-agent in this stage). Mirror the Phase 1 sub-section's HTML structure exactly.

**MIRROR**: `documentation/reference/agents.html` Phase 1 prd-reviewer-coherence sub-section (the new `<h4 id="prd-reviewer-coherence">` block) — copy the HTML structure verbatim and adapt the IDs and prose to plan-specific.

**VALIDATE**: `grep -c 'R-COH-' documentation/reference/agents.html` must increase by ≥10 (the 5 deterministic + 5 K=5 IDs in the new kv-block) compared to its post-Phase-1 count. The HTML must remain well-formed (Level 1 validation). `grep -c 'plan-reviewer-coherence' documentation/reference/agents.html` must equal `1` (the new `<h4 id>` anchor).

### Task 5: UPDATE documentation/concepts/pipeline.html — Stage 2 Plan Reviewer description

**ACTION**: Locate Stage 2 Plan Reviewer description in `documentation/concepts/pipeline.html` (around lines 47–56 per Phase 1 grounding). Replace the current Reviewer kv-block dt/dd pair with a longer one that follows Phase 1's prd-reviewer style: original prose preserved, then **plus an additive R-COH-* coherence layer** appended with a brief enumeration of contradiction classes (tasks that don't reference any AC, Files-to-Change rows untouched by tasks, VALIDATE commands mismatching declared frameworks, Patterns-to-Mirror SOURCE paths missing, Mandatory Reading paths missing, plus K=5 LLM-detected drift between Summary / Solution Statement and Tasks) and a link to `../reference/agents.html#plan-reviewer-coherence`.

**MIRROR**: `documentation/concepts/pipeline.html` Phase 1 Stage 1 PRD Reviewer sentence — the appended-sentence style and the link-to-reference-anchor pattern.

**VALIDATE**: `grep -c 'R-COH-' documentation/concepts/pipeline.html` must equal `2` after the edit (Phase 1 added 1 for Stage 1; Phase 2 adds 1 for Stage 2). HTML remains well-formed.

### Task 6: UPDATE documentation/changelog.html — extend Phase 1's Unreleased block with Phase 2 items

**ACTION**: Read the current Unreleased block (lines 31–55 area, post-Phase-1). Two updates:

  1. **Extend the description paragraph** at the top of the Unreleased block to cover both phases together. Phrasing: change "Phase 1 of the **reviewer-coherence-layer** feature" to "Phases 1 and 2 of the **reviewer-coherence-layer** feature" and append (in the same paragraph) "Phase 2 ships the same additive layer on `plan-reviewer`, with five plan-specific deterministic checks (`R-COH-TASK-AC-MISSING`, `R-COH-FILES-UNTOUCHED`, `R-COH-VALIDATE-FRAMEWORK-MISMATCH`, `R-COH-PATTERN-SOURCE-MISSING`, `R-COH-MANDATORY-READING-MISSING`) plus a bounded K=5 LLM pass over plan-section pairs. AC-10 of `plan-authoring.prd.md` is consciously evolved (R-COH-* rows additive to R1–R8) per a new entry in `docs/decisions.md`; AC-10's no-short-circuit invariant is preserved verbatim."

  2. **Extend the Added section** with new `<li>` items for the Phase 2 files: `plugins/relay/agents/plan-reviewer.md` (new R-COH-* section + 5 surgical relax-Edits at the "exactly 8" sites + Step 2 extension + JSONL example update); `docs/decisions.md` (new 2026-04-28 entry for AC-10 contract evolution); `documentation/reference/agents.html` (new `<h4 id="plan-reviewer-coherence">` sub-section); `documentation/concepts/pipeline.html` (Stage 2 Reviewer description appended).

  3. (Optional) Update the Notes paragraph to "Phases 1 and 2 of three implementation phases" and update the next-phase pointer to "Phase 3 (`code-reviewer` coherence + `code-reviewer-semantic` sub-agent) follows".

**MIRROR**: `documentation/changelog.html:31-55` (the existing Phase 1 Unreleased block). Phase 2 extends it in-place — no new `<h2>` heading, no new section. Both phases share the same Unreleased block until release cut.

**VALIDATE**: `grep -c 'R-COH-TASK-AC-MISSING\|R-COH-FILES-UNTOUCHED\|R-COH-VALIDATE-FRAMEWORK-MISMATCH\|R-COH-PATTERN-SOURCE-MISSING\|R-COH-MANDATORY-READING-MISSING' documentation/changelog.html` must equal `5` (each Phase 2 deterministic ID appears at least once in the new content). `grep -c 'plan-reviewer' documentation/changelog.html` must increase by ≥3 from its post-Phase-1 count.

## Validation Commands

### Level 1 — STATIC_ANALYSIS

- Markdown lint on the agent file: `markdownlint plugins/relay/agents/plan-reviewer.md` (if installed; otherwise visual review for malformed sections).
- Markdown lint on the governance file: `markdownlint docs/decisions.md`.
- HTML well-formedness for the touched documentation files: `python -c "from html.parser import HTMLParser; p=HTMLParser(); p.feed(open('documentation/reference/agents.html', encoding='utf-8').read())"` per file (the lenient HTMLParser smoke from Phase 1; tolerant of HTML5 self-closing tags).

### Level 2 — CONTENT_INVARIANTS

- R1–R8 byte-identical: `git diff plugins/relay/agents/plan-reviewer.md` filtered to lines starting with `### R[1-8]` and their immediate following content must show **only** the changes Task 2 made (the "exactly 8" wording relaxation, NOT changes to the rubric definitions themselves). Specifically: the prose under each `### R<N> —` heading must be byte-identical pre/post Phase 2.
- Phase 2 deterministic checks present: `grep -c '^#### R-COH-' plugins/relay/agents/plan-reviewer.md` must equal `5`.
- Phase 2 K=5 IDs documented: `grep -cE 'R-COH-(SUMMARY-TASKS-DRIFT|AC-TASK-DECOUPLED|PATTERN-TASK-DRIFT|MANDATORY-READING-IRRELEVANT|OTHER-INTERNAL-CONTRADICTION)' plugins/relay/agents/plan-reviewer.md` must equal `5`.
- "exactly 8" relaxation applied at all 5 sites: `grep -c 'exactly 8' plugins/relay/agents/plan-reviewer.md` must equal `0`. `grep -c 'no duplicates among R1–R8' plugins/relay/agents/plan-reviewer.md` must be ≥`3`.
- Step 2 extension prose present: `grep -A 1 'Walk R1 through R8 in order' plugins/relay/agents/plan-reviewer.md` must include the R-COH-* extension sentence.
- JSONL example updated: the example block in plan-reviewer.md must contain at least one `R-COH-*` row. Verify via Python: `python3 -c "import json,re,pathlib; c=pathlib.Path('plugins/relay/agents/plan-reviewer.md').read_text(encoding='utf-8'); m=re.search(r'## review\\.jsonl format.*?\\\`\\\`\\\`json\\n(.*?)\\n\\\`\\\`\\\`', c, re.DOTALL); o=json.loads(m.group(1)); assert any(r['id'].startswith('R-COH-') for r in o['rubric']), 'no R-COH-* row in JSONL example'; print('OK')"`.
- New decision entry present: `grep -c '\[2026-04-28\] AC-10' docs/decisions.md` must equal `1`. The entry's `Areas affected:` line must mention "plan-reviewer".
- Documentation surfaces synced: `grep -c 'R-COH-' documentation/reference/agents.html` must increase by ≥10 from post-Phase-1; `grep -c 'plan-reviewer-coherence' documentation/reference/agents.html` must equal `1`; `grep -c 'R-COH-' documentation/concepts/pipeline.html` must equal `2`; `grep -c 'plan-reviewer' documentation/changelog.html` must increase by ≥3.

### Level 3 — INTEGRATION (DRY-RUN END-TO-END)

- Same constraint as Phase 1: all plans in `PRPs/plans/completed/` are paired with APPROVED status (the source PRD's row points at them). `/relay-plan-review` P2 precondition refuses APPROVED plans, so a strict dry-run cannot exercise the new layer.
- Substantive equivalent: validate the JSONL example block parses as valid JSON (Phase 1 mirror) and contains at least one R-COH-* row. Verify the agent file is internally consistent (Step 2 references the new section, the JSONL example matches Step 2 output shape, the relaxed "exactly 8" wording in the JSONL format section matches the Step 4.2 wording for the APPROVED jsonl entry).
- Manual sanity walk (mirror Phase 1 implementation report): walk the new R-COH-* layer against `PRPs/plans/completed/reviewer-coherence-layer-phase-1-prd-reviewer-coherence.plan.md` (this very feature's Phase 1 plan, available as a real APPROVED-then-archived plan) and confirm:
  - All 5 deterministic checks are well-defined (parsing the plan's tables/headings yields concrete pass/fail outcomes).
  - The K=5 prompt discipline produces well-formed output when applied mentally to the plan's content.
- Phase 4 (dogfood validation) is the formal end-to-end verification gate per the source PRD AC-6. Phase 2's L3 is a smoke check, not the substantive validation.

## Acceptance Criteria

- **AC-A1 (PRD AC-2):** `plugins/relay/agents/plan-reviewer.md` contains a new `## The R-COH-* coherence layer (additive, runs after R1–R8)` section after the R8 definition; the section defines 5 deterministic `#### R-COH-*` headings and a K=5 ID taxonomy of 5 plan-specific IDs + a catchall; R1–R8 textual definitions are byte-identical to pre-Phase-2 (verifiable via `git diff` filtered to the R1–R8 region). The Phase 2 layer reuses the structural template shipped by Phase 1 (parent → Deterministic checks → Bounded K=5 → Logging discipline → Anti-pattern).
- **AC-A2 (PRD AC-2, AC-4):** Protocol Step 2 walks R-COH-* after R1–R8; the resulting `PRPs/plans/<basename>.review.jsonl` `rubric[]` array contains R1–R8 rows in their existing format AND ≥1 new `R-COH-*` row. The verdict logic in Step 4 (auto-flip on full pass) is unchanged in semantic; only the "exactly 8" array constraint at the 5 wording sites is relaxed.
- **AC-A3 (PRD AC-1):** A new entry in `docs/decisions.md` titled `## [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array` records the contract evolution. The entry preserves the `Context / Decision / Reason / Areas affected` four-field shape of existing entries and explicitly states that the no-short-circuit invariant of AC-10 is preserved.
- **AC-A4 (PRD AC-7):** `documentation/reference/agents.html` plan-reviewer section adds a new `<h4 id="plan-reviewer-coherence">The R-COH-* coherence layer (additive)</h4>` sub-section mirroring the Phase 1 prd-reviewer-coherence sub-section style; Responsibility text references the coherence layer; Never list adds the K=5 padding anti-pattern.
- **AC-A5 (PRD AC-7, M4):** `documentation/concepts/pipeline.html` Stage 2 Plan Reviewer description references the additive R-COH-* layer and links to `../reference/agents.html#plan-reviewer-coherence`.
- **AC-A6 (PRD AC-7):** `documentation/changelog.html` Unreleased block extends Phase 1's content with Phase 2 items in the Added section and updates the description paragraph to cover both phases. No new Unreleased `<h2>` is created — both phases share the same block until release cut.
- **AC-A7 (PRD AC-2):** Rubric R1–R8 textual definitions in `plugins/relay/agents/plan-reviewer.md` are byte-identical pre/post Phase 2 (no whitespace, wording, or ordering changes to the R1–R8 prose itself; the "exactly 8" wording at the 5 sites IS changed by Task 2 — this is intentional and is NOT inside the R1–R8 definitions).
- **AC-A8 (PRD AC-4):** plan-reviewer remains autonomous; CHANGES_REQUESTED stays terminal; no `Task` tool added to its frontmatter; the existing "no Task tool" hard constraint is preserved verbatim.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Surgical Edit at one of the 5 "exactly 8" sites accidentally changes R1–R8 wording | Medium | High (breaks AC-A7 and PRD AC-2) | Each Edit uses `old_string` covering only the wording-to-change, narrow enough to be unique; post-edit `git diff` filtered to the `### R[1-8]` region must be empty; Level 2 invariant `grep -c 'exactly 8'` = 0 confirms all 5 sites updated |
| K=5 LLM pass fabricates contradictions not in the plan (Phase 1 risk replicated) | Medium | Medium | Same mitigations as Phase 1: Datadog quote-both-sides + HD-Eval section-pair decomposition + `file:line` evidence + explicit "return `[]` if none exist" + temperature 0.2; additionally for plans, the prompt requires the LLM to cite the verbatim section heading (e.g., "## Patterns to Mirror") of each side, leveraging the structured-document pattern from Cleanlab TLM |
| `R-COH-VALIDATE-FRAMEWORK-MISMATCH` produces false positives because `test_frameworks` is empty in relay's own methodology.md | Medium | Medium | Specify silent-degradation branch explicitly: when `test_frameworks: []`, emit a single `passed: true` row with `reason: "test_frameworks empty in methodology.md; check skipped"`. Phase 4 dogfood will measure FP rate of this specific check separately |
| AC-10 contract evolution recorded in docs/decisions.md but plan-authoring.prd.md AC-10 still says "no extras", causing confusion for future readers | Low | Medium | The new decisions.md entry explicitly notes that AC-10 evolved; the 5-site Edits in plan-reviewer.md cite the docs/decisions.md entry by date; future agents consulting AC-10 directly will find the relay codebase's plan-reviewer.md states the operative contract |
| Task 6 changelog edit creates a new Unreleased section instead of extending Phase 1's | Low | Low | Task 6 explicitly mirrors `documentation/changelog.html:31-55` and requires no new `<h2>` heading; the Edit modifies the existing paragraph and `<ul>` block in-place |
| `R-COH-MANDATORY-READING-IRRELEVANT` (K=5 finding) requires reading every Mandatory Reading file to verify the "why" justification, blowing the token budget | Low | Medium | This is a K=5 *finding* the LLM picks at its discretion when it independently judges that the "why" doesn't match what the file appears to discuss; it does NOT require deterministic Read of every file. If false-positive rate is high in Phase 4 dogfood, the class becomes Won't fast-follow |
| Phase 2 mid-flow research-codebase pass missed the docs/reference/agents.html plan-reviewer section line range | Low | Low | Task 4 begins with a targeted `grep` for "plan-reviewer" in agents.html before editing; the addition follows the Phase 1 prd-reviewer template verbatim |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

- **ID naming convention reused from Phase 1.** Phase 2 emits 5 deterministic IDs (`R-COH-TASK-AC-MISSING`, `R-COH-FILES-UNTOUCHED`, `R-COH-VALIDATE-FRAMEWORK-MISMATCH`, `R-COH-PATTERN-SOURCE-MISSING`, `R-COH-MANDATORY-READING-MISSING`) and 5 K=5 taxonomy IDs (`R-COH-SUMMARY-TASKS-DRIFT`, `R-COH-AC-TASK-DECOUPLED`, `R-COH-PATTERN-TASK-DRIFT`, `R-COH-MANDATORY-READING-IRRELEVANT`, `R-COH-OTHER-INTERNAL-CONTRADICTION`). Phase 3 will add the code-reviewer set per the source PRD's Notes section forward design.

- **The K=5 pass in this phase is inline (no sub-agent).** Sub-agent factoring (`code-reviewer-semantic`) applies only to `code-reviewer` per the source PRD's D2 decision. Plan-reviewer remains a single-agent execution with no `Task` tool.

- **AC-10 contract evolution is recorded in `docs/decisions.md`, not in the APPROVED `plan-authoring.prd.md`**. This is the canonical pattern for evolving contracts: APPROVED PRDs are immutable (per the source PRD's invariant and the broader "PRDs are contract" architecture); contract evolution lives in `docs/decisions.md`. Future agents reading AC-10 of plan-authoring.prd.md should also consult `docs/decisions.md` for any subsequent decisions that bind the AC.

- **Test_frameworks emptiness in relay's methodology.md is intentional.** `relay` is a markdown plugin without a test framework (per CLAUDE.md and the Phase 1 implementation report). The R-COH-VALIDATE-FRAMEWORK-MISMATCH check's silent-degradation branch is the correct behavior here; for target projects with declared frameworks (e.g., Phoenix's `mix test`, pytest), the check will activate and produce meaningful pass/fail outcomes.

- **Phase 4 dogfood will run plan-reviewer's new layer against `PRPs/plans/completed/reviewer-coherence-layer-phase-1-prd-reviewer-coherence.plan.md`** (Phase 1's own archived plan), the implementation-authoring plans (phases 1 and 2), and the plan-authoring plans (phases 1–6) — exceeding the ≥3 sample threshold of AC-6.

- **Color/model of the agent are unchanged.** Phase 2 modifies only the prompt body of `plan-reviewer.md`, not its frontmatter `model` or `color`. The frontmatter `description` field IS updated (Task 2.1) to mention the coherence layer, but `tools: Read, Edit, Write` remains.

- **No NAV / search-index updates needed.** Per `documentation/AGENTS.md` §6, NAV and search-index updates apply only when pages are added / renamed / removed; Phase 2 only modifies content of existing pages. Phase 1 already applied the same logic.

*Generated: 2026-04-28*
*Approved: 2026-04-28*
*Status: APPROVED*
