# Feature: prd-reviewer coherence (Phase 1 of reviewer-coherence-layer)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of an existing agent file (`plugins/relay/agents/prd-reviewer.md`); cross-cutting impact on the documentation site (regra dos 3 arquivos); establishes the `R-COH-*` ID-naming convention reused by Phase 2 and Phase 3
- Decisions found:
  - 2026-04-19 Interactivity boundary — prd-reviewer remains interactive on rubric-pass; the new layer adds rubric items, not new dialog turns
  - 2026-04-19 PRD template fork — new `R-COH-*` IDs slot into the existing `rubric[]` array without renumbering R1–R7
  - 2026-04-19 Command surface (writer/reviewer split) — prd-reviewer is the reviewer half of `/relay-prd`; the layer extends rubric, not surface
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/` — JSONL log path (`PRPs/prds/<basename>.review.jsonl`) unchanged
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — none introduced
  - prd-reviewer's own anti-pattern "Editing the DRAFT to make it pass the rubric on the user's behalf" — preserved; the new layer surfaces issues, never silently fixes them
- Applicable architectural rules:
  - Interactivity boundary at PRD approval (preserved)
  - PRP artifact paths under `PRPs/` (preserved)
  - `documentation/AGENTS.md` §6 three-file registration rule (must comply for Phase 1 docs sync)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/reviewer-coherence-layer.prd.md` — Implementation Phases row 1: "prd-reviewer coherence" — Goal: establish the additive `R-COH-*` pattern on the smallest reviewer (PRD `.md` is the smallest artifact) — Success signal: `/relay-prd-review` against an existing APPROVED PRD emits the new rows with deterministic checks passing AND K=5 returning 0–5 well-formed issues.

## Summary

Extend `plugins/relay/agents/prd-reviewer.md` with a new `## The R-COH-* coherence layer` section appended after the existing R7 definition, plus a Protocol Step 2 update so the agent walks the new layer after R1–R7. The layer combines deterministic checks (number drift between table and prose, references to non-existent sections/ACs/phases) with a single bounded K=5 LLM judgment pass running inline within the same agent (no sub-agent in this phase — sub-agent is Phase 3 territory). New rows append to the existing `PRPs/prds/<basename>.review.jsonl` schema using the open-array shape that already accepts arbitrary `id` values. Phase 1 also fixes the `R-COH-*` descriptive ID taxonomy reused by Phase 2 and Phase 3, and syncs the four canonical documentation surfaces per the three-file rule of `documentation/AGENTS.md`.

## User Story

As a relay operator running `/relay-prd-review` against a DRAFT PRD, I want the reviewer to additionally surface internal contradictions inside the PRD (ACs that contradict each other, success metrics that don't measure the hypothesis, references to non-existent sections, decisions that contradict the proposed solution) so I don't approve a PRD whose textual coherence will cascade defects downstream into the plan-writer and the implementer.

## Problem Statement

The current `prd-reviewer` walks R1–R7 (Decision Gate block well-formed, mandatory sections present and ordered, no TBD in mandatory fields, AC count and shape, TDD routing matches `methodology.md`, no `.claude/` prefix, Implementation Phases table has at least one real row). All seven checks are **structural**: they verify shape, not internal consistency of content. A PRD where AC-3 contradicts AC-7 in prose, or where the Decisions Log contradicts the Proposed Solution, or where the Success Metrics measure something the Key Hypothesis never claimed, can pass R1–R7 entirely and proceed to APPROVED. The defect is then absorbed by the plan-writer (which produces a plan based on a contradictory spec), the implementer, and finally the human reviewing the PR — exactly the cascading rework the autonomous post-PRD pipeline exists to prevent.

## Solution Statement

Add an additive coherence layer (`R-COH-*` rubric IDs, descriptive prefixed) to `prd-reviewer.md` that runs after R1–R7 in Protocol Step 2. The layer has two components: (a) deterministic checks for the classes detectable mechanically (table-vs-prose number drift; references to non-existent sections, ACs, or phase numbers), implemented inline using `Read` + `Grep` semantics already available to the agent; (b) a single bounded K=5 LLM judgment pass that reads the full PRD body and returns at most 5 contradiction findings, each with `file:line` evidence, with explicit "return empty list if no contradictions exist" instruction in the prompt. Each finding becomes one row in `PRPs/prds/<basename>.review.jsonl` under the `rubric[]` array. The existing R1–R7 text inside the agent file is **not modified** — the layer is purely additive.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Agent prompt extension + documentation site sync |
| Complexity | Medium (single agent file edit + 4 documentation surfaces; no new agent file) |
| Systems Affected | `plugins/relay/agents/prd-reviewer.md`; `documentation/reference/agents.html`; `documentation/concepts/pipeline.html`; `documentation/guide/writing-a-prd.html`; `documentation/changelog.html` |
| Dependencies | None (Phase 1 is independent per source PRD's Phases table) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/reviewer-coherence-layer.prd.md` Implementation Phases row 1 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| 1 | `plugins/relay/agents/prd-reviewer.md` | full file | Target file. Understand current rubric structure (R1–R7), Protocol Step 2 walk, JSONL append discipline, and Anti-patterns/Out-of-scope blocks before extending |
| 1 | `plugins/relay/agents/plan-reviewer.md` | 205–236 | R8 traceability is the closest structural precedent for an intra-artifact consistency rubric item — mirror its heading + sub-check style |
| 1 | `docs/context/prd-template.md` | 56–209 | 15 mandatory sections — ground truth for `R-COH-SECTION-REF-MISSING` to validate references against |
| 1 | `PRPs/prds/reviewer-coherence-layer.prd.md` | full file | Source-of-truth PRD: scope, ACs, Decisions Log entries, MoSCoW table, MVP threshold (≤25% FP / ≥1 TP per reviewer) |
| 2 | `plugins/relay/agents/prd-writer.md` | 383–385 | Verbatim TDD routing strings (canonical source) — required for the plan's Notes section and reused by future writers |
| 2 | `documentation/AGENTS.md` | 241–285 | §6 three-file registration rule — what to update for Phase 1 docs sync (changelog at minimum; NAV/search-index only if page list changes — it does not in Phase 1) |
| 2 | `documentation/reference/agents.html` | 141–167 | Current prd-reviewer section text; Responsibility currently says "7-item structural rubric" — must reflect "structural + coherence" |
| 2 | `documentation/concepts/pipeline.html` | 36–45 | Stage 1 PRD Reviewer description; currently "checks Acceptance Criteria are concrete scenarios, Decision Gate evidence is present, hypothesis is testable, out-of-scope is explicit" — add coherence layer mention |
| 3 | `https://www.datadoghq.com/blog/ai/llm-hallucination-detection/` | - | Quote-from-both-sides pattern for K=5 LLM prompt; reduces fabricated contradictions |
| 3 | `https://www.promptfoo.dev/docs/guides/llm-as-a-judge/` | - | Strict JSON output + binary pass/fail scales reduce variance in evaluation passes |
| 3 | `https://www.evidentlyai.com/llm-guide/llm-as-a-judge` | - | "Insufficient evidence" / empty-list escape hatch — anchors the "return zero findings if none exist" branch of the K=5 prompt |

## Patterns to Mirror

### Pattern 1 — Rubric item heading + sub-check structure (R8 of plan-reviewer)

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:205-236
### R8 — PRD↔plan traceability (NEW, plan-stage exclusive)

Three sub-checks, all of which must pass:

- **R8a — Source PRD exists.**
  - The plan's `## Source PRD` section names a `.prd.md` file path.
  - That file exists under `<target_root>/PRPs/prds/`.
  - That file's trailing status line equals `*Status: APPROVED*`.
- **R8b — AC traceability.**
  - Every item in the plan's `## Acceptance Criteria` section
    references at least one PRD `AC-<N>` token.
  - Each cited PRD `AC-<N>` must actually exist in the source PRD's
    `## Acceptance Criteria (test scenarios)` section.
- **R8c — Source PRD back-fill.**
  - ...
```

Used by Task 1 to shape the new `## The R-COH-* coherence layer` section: each `R-COH-*` ID gets a heading, a criteria bullet list, and "how to check" sub-bullets. The sub-check style of R8a/R8b/R8c is the canonical structural precedent for grouped checks under one rubric item.

### Pattern 2 — JSONL row shape (open-array, no schema change)

```
# SOURCE: plugins/relay/agents/prd-reviewer.md:292-300
"rubric": [
    { "id": "R1", "passed": true },
    { "id": "R3", "passed": false, "reason": "TBD in Problem Statement body" }
],
```

Used by Task 1 to extend the JSONL example block with one or more `R-COH-*` rows. The schema is open — no change required beyond adding new ID values.

### Pattern 3 — Protocol Step 2 walk (existing prose)

```
# SOURCE: plugins/relay/agents/prd-reviewer.md:165-173
### Step 2 — Run the rubric

Walk R1 through R7 in order. For each, record:

```json
{ "id": "R3", "passed": false, "reason": "TBD in Problem Statement body" }
```
```

Used by Task 1 to extend with: "After R1–R7, walk the R-COH-* coherence layer (deterministic checks first, then the bounded K=5 LLM pass)."

### Pattern 4 — Documentation changelog entry shape

```html
# SOURCE: documentation/changelog.html:35-43
<h2 id="v0-7-2">0.7.2 — 2026-04-28</h2>

<p>Patch &mdash; reorder the <code>plan-reviewer</code> Step 4 (auto-flip happy path) operations so the jsonl write happens BEFORE the plan-flip <code>Edit</code>. Surfaced during the dogfood review of <code>implementation-authoring</code> Phase 1: ...</p>

<h3 id="v0-7-2-changed">Changed</h3>

<ul>
  <li><strong><code>plugins/relay/agents/plan-reviewer.md</code></strong> &mdash; Step 4 reordered: ...</li>
</ul>
```

Used by Task 5 to shape the new entry. The canonical structure is `<h2 id="v<slug>">version — date</h2>` + a one-paragraph `<p>Patch — ...</p>` describing the change, followed by one or more `<h3 id="v<slug>-<category>">Category</h3>` (Added / Changed / Deprecated / Removed / Fixed per Keep a Changelog) each with a `<ul>` of `<li><strong><code>path</code></strong> &mdash; ...</li>` items.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/prd-reviewer.md` | UPDATE | Phase 1 core deliverable: add `R-COH-*` rubric layer section after R7 + extend Protocol Step 2 + extend JSONL example. R1–R7 textually unchanged. |
| `documentation/reference/agents.html` | UPDATE | PRD AC-7: docs sync for prd-reviewer section — Responsibility, rubric kv-block, Never list reflect coherence layer |
| `documentation/concepts/pipeline.html` | UPDATE | PRD M4 + AC-7: Stage 1 PRD Reviewer description declares "structural + coherence" coverage |
| `documentation/guide/writing-a-prd.html` | UPDATE | PRD AC-7: explain new prd-reviewer scope to PRD-authoring users |
| `documentation/changelog.html` | UPDATE | `documentation/AGENTS.md` §6 three-file rule — Phase 1 entry under Unreleased |

## NOT Building (Scope Limits)

- **Modification of R1–R7 textual definitions** — the additive invariant of the source PRD ("rubrica original NÃO muda"); R1–R7 must be byte-identical pre/post Phase 1.
- **Sub-agent for the K=5 pass in prd-reviewer** — Phase 1 runs the K=5 pass inline within the existing `prd-reviewer` agent. Sub-agent factoring (`code-reviewer-semantic`) is Phase 3 territory and applies to `code-reviewer` only.
- **Plan-reviewer or code-reviewer extensions** — Phases 2 and 3 own those.
- **Dogfood report and FP-rate measurement** — Phase 4 owns dogfood; Phase 1 only ships the layer.
- **Schema changes to `*.review.jsonl` beyond accommodating new IDs** — explicit invariant of the PRD; the open-array shape of prd-reviewer's JSONL accepts new IDs without change.
- **Repo-wide drift terminology detection** — out of scope per PRD; prd-reviewer's K=5 pass operates on the single PRD `.md` only.
- **Reopening already-APPROVED PRDs to re-validate with the new layer** — explicit out-of-scope of the source PRD; manual hand-edit (status flip back to DRAFT) is the documented escape hatch.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/prd-reviewer.md — add R-COH-* layer

**ACTION**: Insert a new `## The R-COH-* coherence layer (additive)` section between the existing `## The 7-item rubric` block (which ends after R7's definition) and `## Protocol`. The new section defines each `R-COH-*` ID with the heading + criteria + how-to-check structure mirrored from Pattern 1 (plan-reviewer R8). Then update Protocol Step 2 prose (Pattern 3) to extend with "After R1–R7, walk the R-COH-* coherence layer in order: deterministic checks first, then the bounded K=5 LLM pass." Then update the JSONL format example (Pattern 2) to include one example R-COH-* row. The R-COH-* IDs to ship in Phase 1 (final taxonomy reused by Phase 2/3):

  Deterministic:
  - `R-COH-NUMBER-DRIFT` — numbers in tables vs. prose body diverge (e.g., "5 phases" in table, "4 phases" in text).
  - `R-COH-SECTION-REF-MISSING` — prose references a section/AC/phase that does not exist in the file (validated against `docs/context/prd-template.md`'s 15-section list and against the file's own AC-N / Phase # tokens).

  K=5 LLM pass (issued under one or more of these IDs based on the LLM's classification of each finding; up to 5 findings total per run):
  - `R-COH-AC-CONTRADICT` — ACs that contradict each other in prose.
  - `R-COH-METRIC-HYPOTHESIS-DECOUPLED` — Success Metrics that don't measure anything cited in the Key Hypothesis.
  - `R-COH-SOLUTION-DETAIL-DRIFT` — Solution Detail describes something different from Proposed Solution.
  - `R-COH-DECISIONS-CONTRADICT` — Decisions Log entries contradict the Proposed Solution.
  - `R-COH-OTHER-INTERNAL-CONTRADICTION` — catchall for findings that don't fit the above (LLM picks this only when none of the named classes apply).

  K=5 prompt design (inline in the agent system prompt, used by Step 2 of Protocol):
  - Read the full PRD body.
  - Return at most 5 contradiction findings as a strict JSON array `[{id, passed, reason, file, line}]`. **If no contradictions exist, return an empty array `[]` — do NOT pad to 5.**
  - For each finding, `id` is one of the K=5 IDs above; `passed: false`; `reason` quotes the exact contradicting fragments verbatim from both sides ("X says <quote A>; Y says <quote B>"); `file` is the PRD path; `line` is the line where the second-quoted fragment appears.
  - Apply Datadog's "quote both sides" pattern (Mandatory Reading row 9) and Promptfoo's strict-JSON discipline (row 10). No commentary outside the JSON. Temperature low (0.2 default for evaluation passes — see Mandatory Reading findings).

**MIRROR**: Pattern 1 (R8 sub-check style) for the rubric section; Pattern 2 (JSONL row shape) for the example update; Pattern 3 (Protocol Step 2) for the walk extension.

**VALIDATE**: `grep -c '^### R[1-7] —' plugins/relay/agents/prd-reviewer.md` must return `7` (R1–R7 unchanged). `grep -c '^### R-COH-' plugins/relay/agents/prd-reviewer.md` must return at least `7` (the seven IDs above). `grep -c 'R-COH-' plugins/relay/agents/prd-reviewer.md` must show the IDs present in both the rubric section and the JSONL example.

### Task 2: UPDATE documentation/reference/agents.html — prd-reviewer section reflects coherence

**ACTION**: Read the prd-reviewer section (lines ~141–167). Update the Responsibility text from "7-item structural rubric" to "7-item structural rubric plus the additive R-COH-* coherence layer (deterministic + bounded K=5 LLM pass)". Add a brief description of the layer (1–2 sentences) after the rubric kv-block. Add 1 new bullet to the Never list: "Pad the K=5 LLM pass with synthetic contradictions to fill the cap." Preserve the surrounding HTML structure exactly.

**MIRROR**: existing prd-reviewer section structure (kv-block + Never list).

**VALIDATE**: `grep -c 'R-COH-' documentation/reference/agents.html` must return at least `1`. The HTML file must remain well-formed (no unclosed tags introduced — see Validation Commands Level 1).

### Task 3: UPDATE documentation/concepts/pipeline.html — Stage 1 PRD Reviewer text

**ACTION**: Read Stage 1 PRD Reviewer description (lines ~36–45). Append a sentence: "The reviewer also runs an additive coherence layer (R-COH-*) that catches intra-PRD contradictions — ACs that contradict each other, metrics decoupled from the hypothesis, references to non-existent sections, and decisions that contradict the proposed solution." Preserve surrounding HTML.

**MIRROR**: existing Stage 1 description prose style.

**VALIDATE**: `grep -c 'R-COH-' documentation/concepts/pipeline.html` must return at least `1`. The PR description includes a screenshot or HTML excerpt showing the updated paragraph.

### Task 4: UPDATE documentation/guide/writing-a-prd.html — explain new scope

**ACTION**: Read the page's section headings (lines 1–200; subsequent sections may exist beyond what this plan's research captured). Locate the section that describes what `prd-reviewer` checks (likely under a "What the reviewer validates" or similar heading). Add a brief paragraph explaining the new coherence layer and what it catches, framed for PRD authors so they understand the additional gate before approval.

**MIRROR**: existing prose style of the guide page (instructional, second-person, concrete examples).

**VALIDATE**: `grep -c 'coherence' documentation/guide/writing-a-prd.html` must return at least `1` (currently `0`). HTML well-formed.

### Task 5: UPDATE documentation/changelog.html — add Phase 1 entry

**ACTION**: Read `documentation/changelog.html` lines 1–100 to identify the most recent entry's HTML shape (`<h2>` version + `<h3>` sub-sections + `<ul>/<li>`). Add a new entry under the **Unreleased** heading (or whichever heading the recent entries use, per AGENTS.md §6.3). Entry body: brief description of the additive R-COH-* coherence layer in prd-reviewer, and the four documentation files updated.

**MIRROR**: most recent entry's HTML structure verbatim.

**VALIDATE**: `git diff documentation/changelog.html` shows exactly one new entry block; HTML well-formed; the entry references "prd-reviewer" and "R-COH-".

## Validation Commands

### Level 1 — STATIC_ANALYSIS

- Markdown lint on the agent file: `markdownlint plugins/relay/agents/prd-reviewer.md` (if installed; otherwise visual review for malformed sections).
- HTML well-formedness for the four documentation files: `python -c "from xml.etree import ElementTree as ET; ET.parse('documentation/reference/agents.html')"` per file (or equivalent — accept that XHTML parsers may reject HTML5 self-closing tags; fall back to `tidy -e` or visual review).

### Level 2 — CONTENT_INVARIANTS

- R1–R7 byte-identical (AC-A7): `git diff plugins/relay/agents/prd-reviewer.md` must show the R1–R7 heading lines and bodies unchanged. Specifically, `git diff` filtered to lines starting with `### R[1-7]` and their immediate following content must be empty.
- New IDs present (AC-A1, AC-A2): `grep -c '^### R-COH-' plugins/relay/agents/prd-reviewer.md` ≥ 7.
- Protocol Step 2 extended: `grep -A 3 'Walk R1 through R7 in order' plugins/relay/agents/prd-reviewer.md` includes the R-COH-* extension line.
- JSONL example updated: `grep -c 'R-COH-' plugins/relay/agents/prd-reviewer.md` ≥ 8 (the IDs in the rubric section + at least one in the JSONL example).
- Documentation surfaces synced: `grep -c 'R-COH-' documentation/reference/agents.html documentation/concepts/pipeline.html` returns matches for both files; `grep -c 'coherence' documentation/guide/writing-a-prd.html` ≥ 1; `grep -c 'R-COH-\|prd-reviewer' documentation/changelog.html` shows new entry present.

### Level 3 — INTEGRATION (DRY-RUN END-TO-END)

- Dry-run `/relay-prd-review PRPs/prds/reviewer-coherence-layer.prd.md` (this very PRD) and confirm:
  - Verdict is APPROVED or CHANGES_REQUESTED (either is acceptable for the dry-run; the goal is to verify the new rows ship).
  - The resulting `PRPs/prds/reviewer-coherence-layer.review.jsonl` has at least one new line whose `rubric[]` array contains at least one `R-COH-*` ID alongside the existing R1–R7 rows.
  - The verdict reasoning surfaces R-COH-* findings (or absence) in the user-facing message, not silently.
- Dry-run against one other APPROVED PRD (e.g., `PRPs/prds/plan-authoring.prd.md`) to spot-check the layer behaves on artifacts not authored knowing about the layer.

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** `plugins/relay/agents/prd-reviewer.md` contains a new `## The R-COH-* coherence layer` section after the R7 definition; the section defines at least 7 `R-COH-*` IDs with descriptive names; R1–R7 textual definitions are byte-identical to pre-Phase-1 (verifiable via `git diff`).
- **AC-A2 (PRD AC-1, AC-4):** Protocol Step 2 walks R-COH-* after R1–R7; the resulting `PRPs/prds/<basename>.review.jsonl` `rubric[]` array contains R1–R7 rows in their existing format AND ≥1 new `R-COH-*` row.
- **AC-A3 (PRD AC-7):** `documentation/reference/agents.html` prd-reviewer section reflects "structural + coherence" coverage; the Responsibility text references the new layer; the Never list includes "Pad the K=5 LLM pass with synthetic contradictions".
- **AC-A4 (PRD AC-7, M4):** `documentation/concepts/pipeline.html` Stage 1 PRD Reviewer description references the additive R-COH-* layer in one sentence.
- **AC-A5 (PRD AC-7):** `documentation/guide/writing-a-prd.html` mentions the coherence layer in at least one paragraph.
- **AC-A6 (PRD AC-7):** `documentation/changelog.html` contains a new entry under Unreleased referencing prd-reviewer and R-COH-*.
- **AC-A7 (PRD AC-1):** Rubric R1–R7 in `plugins/relay/agents/prd-reviewer.md` is byte-identical pre/post Phase 1 (no whitespace, wording, or ordering changes).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| K=5 LLM pass fabricates contradictions not in the PRD | Medium | Medium | Apply Datadog's "quote both sides" pattern in the prompt (Mandatory Reading row 9); require `file:line` evidence per finding; explicit "return empty array if no contradictions exist" instruction; low temperature 0.2 |
| Editing the agent file inadvertently changes R1–R7 wording | Low | High (breaks AC-A7 and PRD AC-1) | Use `Edit` with narrow `old_string` covering only the insertion point between R7's last line and the `## Protocol` heading; post-edit `git diff` filtered to R1–R7 region must be empty |
| `documentation/changelog.html` entry shape drifts from existing pattern | Low | Low | Read the most recent two entries before drafting; mirror their HTML structure verbatim |
| Phase 1 ID taxonomy doesn't carry cleanly to Phase 2 (plan-reviewer's "exactly 8" constraint) | Low | Medium | Document the Phase 1 IDs as the canonical naming convention; Phase 2 plan addresses the plan-reviewer constraint relaxation separately (the AC-10 of plan-authoring.prd.md may need updating to "R1–R8 always present; R-COH-* additional"). Surfaced in this plan's Notes for awareness, not blocking Phase 1 |
| Documentation guide page's existing structure is unknown beyond line 200 (research gap) | Low | Low | Task 4 begins with a Read of the full page before editing; the addition is a single paragraph and tolerant of where it lands within the existing structure |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

- **ID naming convention established here is reused by Phase 2 and Phase 3**: descriptive prefixed (`R-COH-<NAME>`), all caps with hyphens for the suffix portion. Phase 2 will add IDs like `R-COH-TASK-AC-MISSING`, `R-COH-FILES-UNTOUCHED`, `R-COH-VALIDATE-FRAMEWORK-MISMATCH`, `R-COH-PATTERN-SOURCE-MISSING`, `R-COH-MANDATORY-READING-MISSING`. Phase 3 will add IDs like `R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-COMMENT-MISMATCH`, `R-COH-CONFIG-DANGLING`, `R-COH-TEST-NAME-LIES`, `R-COH-REGISTRY-MISSING`, `R-COH-TASK-CONTRADICTION`, `R-COH-SEMANTIC-DEGRADED`. Phase 1 commits no Phase 2/3 IDs — they are listed here as forward-looking design intent, not deliverables.

- **The K=5 pass is inline in this phase (no sub-agent).** Sub-agent factoring (`code-reviewer-semantic`) applies only to `code-reviewer` per the source PRD's D2 decision (token budget pressure is unique to code-reviewer; PRD/plan reviewers operate on small markdown artifacts where inline is cheaper).

- **Plan-reviewer's "exactly 8 rubric items" constraint (AC-10 of plan-authoring.prd.md) is a Phase 2 concern**, surfaced here for awareness. The grounding research-codebase pass found that prd-reviewer's JSONL schema is open-array — Phase 1 adds R-COH-* rows without any constraint conflict. Phase 2 will need to relax plan-reviewer's "exactly 8" language to "R1–R8 always present; R-COH-* additional", or document the relaxation separately.

- **Color/model of the agent are unchanged.** Phase 1 modifies only the prompt body of the agent, not its frontmatter (`tools`, `model`, `color`, `description`). The agent description string may be updated to mention the coherence layer, but `tools: Read, Edit, Write, Task` remains.

- **Dogfood opportunity**: Phase 4 of the source PRD will run the updated prd-reviewer against `PRPs/prds/test-runner.prd.md`, `PRPs/prds/prd-authoring.prd.md`, `PRPs/prds/plan-authoring.prd.md`, `PRPs/prds/implementation-authoring.prd.md`, and possibly `PRPs/prds/reviewer-coherence-layer.prd.md` itself — five APPROVED PRDs available, exceeding the ≥3 sample threshold.

*Generated: 2026-04-28*
*Approved: 2026-04-28*
*Status: APPROVED*
