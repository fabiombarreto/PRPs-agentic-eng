# Feature: Planning entrypoint (Phase 1 of relay-plan-prd-less-mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of existing relay command file (relay-plan.md); modification of existing relay agent file (plan-writer.md); cross-cutting artifact creation (new input mode consumed by the planning chain); architectural decision (alternative entrypoint for /relay-plan)
- Decisions found:
  - 2026-05-15 "/relay-plan PRD-less mode: registered future capability, not yet implemented" — this phase is the first implementation of that registered capability; the "Out of scope until a dedicated PRD is approved" block is now in scope as of the PRD that authorized this phase.
  - 2026-04-19 "Command surface: one command per stage, writer and reviewer split" — /relay-plan stays a writer; the description entrypoint does not collapse the writer/reviewer split; plan-reviewer is still invoked separately via /relay-plan-review.
  - 2026-04-25 "Plan filenames carry the source PRD phase number and slug" — description-mode plans consciously diverge to a flat `<slug>.plan.md` per Decisions Log entry in relay-plan-prd-less-mode.prd.md.
  - 2026-04-19 "PRP artifacts live under PRPs/, never .claude/" — description-mode plans still written to PRPs/plans/.
  - 2026-04-19 "Interactivity boundary: PRD interactive, downstream autonomous" — planning is autonomous; the description entrypoint adds no user dialogue downstream.
  - 2026-04-30 "D8 post-approval mutations are best-effort atomic" — Mutation c (source PRD row N flip) becomes a no-op for PRD-less plans; Mutations a + b are preserved; this phase delivers the plan-writer no-op branch.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — description-mode plans go to PRPs/plans/, never .claude/.
  - "Treating plugins/prp-core/ as active relay code" — prp-plan is the behavioral design reference ONLY; its Phase 0 detection logic is adapted into relay's own command and agent files, never imported.
  - "Relying on interactive permission prompts in the autonomous loop" — the description entrypoint must run without per-command prompts; no user dialogue downstream.
- Applicable architectural rules:
  - PRP artifacts live under PRPs/plans/<slug>.plan.md; flat filename for description mode per Decisions Log.
  - Writer/reviewer split (one command per stage) is preserved.
  - Orchestrator state machine is the source PRD's Implementation Phases table — description-mode plans have no PRD row and are outside /relay-execute (Won't).
  - Plan shape conforms to docs/context/plan-template.md; this phase delivers the plan-writer entrypoint that produces plans against that template.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-plan-prd-less-mode.prd.md` — Implementation Phases row 1: "Planning entrypoint" — Goal: `/relay-plan "<text>"` enters description mode and `plan-writer` produces a PRD-less DRAFT plan — Success signal: A description-only DRAFT plan exists at `PRPs/plans/<slug>.plan.md` and PRD mode is unchanged.

## Summary

Phase 1 delivers the two-file entrypoint for description-only planning: (1) `plugins/relay/commands/relay-plan.md` gains a Phase 0 input-type detection step that routes a `.prd.md` path (or any text containing an "Implementation Phases" table) to the existing PRD mode and any other non-empty free-text argument to a new description mode, replacing the blanket PRD-required contract; and (2) `plugins/relay/agents/plan-writer.md` gains a description-only entrypoint section — new Phase 0.B and Phase 1.B branches that skip the table parse, derive a flat `<slug>.plan.md` filename, capture the description as the plan's `## Source` section, generate derived `AC-A<i>` items from the description, and skip the Phase 5 PRD back-fill. PRD mode remains behaviorally identical (regression-safe). The upstream `prp-plan` Phase 0 detection table (`plugins/prp-core/commands/prp-plan.md:42-89`) is the behavioral design reference; relay's adaptation differs by preserving the Decision Gate, the full plan-template shape, and the writer/reviewer split.

## User Story

As a relay developer working on a small, well-scoped feature,
I want to run `/relay-plan "<description>"` and receive a DRAFT plan without authoring a PRD,
So that I can use relay's grounding, Decision Gate, and plan-reviewer rubric on small work without paying the full PRD authoring cost.

## Problem Statement

Today `/relay-plan` hard-requires an APPROVED PRD (preconditions P1–P4 in `plugins/relay/commands/relay-plan.md:76-153`). The "Parse arguments" block unconditionally treats `$ARGUMENTS` as a PRD path; P2 requires `*Status: APPROVED*`; P4 requires an Implementation Phases table. There is no branch for free-text input. The `What you do NOT do` section at `relay-plan.md:278-283` explicitly records the bypass as forbidden until a dedicated PRD is approved. Similarly, `plan-writer.md`'s Phase 0 reads the PRD end-to-end (`plan-writer.md:107-117`) and Phase 1 parses the Implementation Phases table to select row N (`plan-writer.md:121-194`). There is no entrypoint for a raw description. Consequently, small, well-scoped features must either pay the full 6-phase `/relay-prd` authoring cost or bypass relay entirely with ad-hoc Claude Code invocations, losing grounding, Decision Gate, plan-template conformance, and reviewer rubric coverage. This phase removes that binary by adding a conditional branch at both the command and agent layers.

## Solution Statement

The solution adds two parallel conditional branches, one at the command layer and one at the agent layer, without touching any of the existing PRD-mode code paths. In `relay-plan.md`, the "Parse arguments" block gains a detection step (Phase 0 detection): if the argument ends with `.prd.md` or if, after reading the file, it contains the exact header `| # | Phase | Description | Status | Parallel | Depends | PRP Plan |`, the command runs the existing PRD mode (P1–P4 then Phase A); otherwise it enters description mode (keeping P3 for the Decision Gate sources, adapting P1 to "non-empty argument", skipping P2 and P4, then dispatching a new Phase B that calls the description-only entrypoint of `plan-writer`). In `plan-writer.md`, a new Phase 0.B + Phase 1.B section handles description-mode context: Phase 0.B captures the description string as the sole source input and derives the slug from the description text; Phase 1.B skips the table parse entirely, computes a flat `<slug>.plan.md` filename, runs the collision check, and marks `description_mode = true`; Phases 2–4 proceed normally (grounding, Decision Gate, plan body assembly) but Phase 4.3 emits `## Source` with the verbatim description instead of `## Source PRD` with a PRD path, and AC items carry no `(PRD AC-N)` token; Phase 5.1 (PRD back-fill) is a no-op. The upstream `prp-plan` Phase 0 detection table is the reference; relay's adaptation differs in preserving Decision Gate, full plan-template, and writer/reviewer split.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/commands/relay-plan.md`; `plugins/relay/agents/plan-writer.md` |
| Dependencies | None (Phase 1 depends on nothing per Implementation Phases table row 1) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-plan-prd-less-mode.prd.md` row 1 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-plan.md` | 47-153 | Parse-arguments block and all four preconditions (P1–P4) to be branched |
| P0 | `plugins/relay/commands/relay-plan.md` | 154-230 | Phase A adopt-writer handoff and halt-case handling |
| P0 | `plugins/relay/commands/relay-plan.md` | 261-283 | "What you do NOT do" section — PRD-less deferral text to be replaced |
| P0 | `plugins/relay/agents/plan-writer.md` | 99-194 | Phase 0 setup (PRD read) and Phase 1 (table parse, filename, collision) |
| P0 | `plugins/relay/agents/plan-writer.md` | 335-349 | Phase 4.3 `## Source PRD` pointer section to be generalized |
| P0 | `plugins/relay/agents/plan-writer.md` | 481-530 | Phase 5 PRD back-fill (to be made no-op for description mode) |
| P1 | `plugins/prp-core/commands/prp-plan.md` | 42-89 | Reference Phase 0 detection table (adapt, do not import) |
| P1 | `PRPs/prds/relay-plan-prd-less-mode.prd.md` | 100-117 | Core Capabilities MoSCoW table — exact Must-have scope for Phase 1 |
| P1 | `PRPs/prds/relay-plan-prd-less-mode.prd.md` | 138-148 | Architecture Notes — dispatch design, flat filename, no back-fill |
| P2 | `docs/context/plan-template.md` | 115-123 | `## Source PRD` template section that `## Source` generalizes |
| P2 | `docs/context/plan-template.md` | 209-213 | AC format `**AC-A<i> (PRD AC-<N>):**` to be relaxed for description mode |

## Patterns to Mirror

The following snippets are anchor points for the tasks below. Every `# SOURCE:` reference is taken verbatim from the research-codebase findings.

---

# SOURCE: plugins/prp-core/commands/prp-plan.md:42-89

```markdown
## Phase 0: DETECT - Input Type Resolution

**Determine input type:**

| Input Pattern | Type | Action |
|---------------|------|--------|
| Ends with `.prd.md` | PRD file | Parse PRD, select next phase |
| Ends with `.md` and contains "Implementation Phases" | PRD file | Parse PRD, select next phase |
| File path that exists | Document | Read and extract feature description |
| Free-form text | Description | Use directly as feature input |
| Empty/blank | Conversation | Use conversation context as input |

### If PRD File Detected:
...
### If Free-form or Conversation Context:
- Proceed directly to Phase 1 with the input as feature description
```

**Used by:** Task 1 (relay-plan.md Phase 0 detection block) and Task 3 (plan-writer.md Phase 0.B/1.B). Relay's adaptation omits the "Conversation context" branch (blank-argument HALT is preserved), the "Document" branch (relay does not read arbitrary `.md` files), and all prp-core agent references. Relay adds Decision Gate sources check (P3) in both modes.

---

# SOURCE: plugins/relay/commands/relay-plan.md:47-68

```markdown
## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat
the argument as the PRD path; resolve it as absolute, or as
relative to the current working directory. If the argument is
blank/whitespace, HALT with:

> /relay-plan requires a PRD path. Usage:
>   /relay-plan PRPs/prds/<feature>.prd.md
> Example:
>   /relay-plan PRPs/prds/plan-authoring.prd.md

If the argument is non-empty but does not resolve to an existing
readable file, fall through to P1 below for the canonical
file-not-readable HALT message.

Record `prd_path` as the resolved absolute path. Record
`target_root` as the current working directory...
```

**Used by:** Task 1 — the Parse arguments block is the insertion point for Phase 0 detection. The blank-argument HALT remains unchanged; the "non-empty" branch diverges into the new detection step.

---

# SOURCE: plugins/relay/commands/relay-plan.md:76-153

```markdown
### P1 — PRD path resolves to a readable file
### P2 — PRD ends with `*Status: APPROVED*`
### P3 — Decision Gate sources readable
### P4 — At least one actionable phase exists
```

**Used by:** Task 1 — P2 and P4 are skipped in description mode; P1 is relaxed to "non-empty argument" in description mode; P3 is retained in both modes. The existing PRD-mode precondition text is unchanged.

---

# SOURCE: plugins/relay/agents/plan-writer.md:99-118

```markdown
## Phase 0 — Setup (internal, no user dialogue)

Before Phase 1, do these reads:

- `<target_root>/docs/context/methodology.md` — capture the `tdd:`
  value for later. If the file is absent, record "methodology.md not
  present" and default the TDD routing note to the methodology-missing
  verbatim string (Step 4.4); do NOT halt.
- `<prd_path>` — read end-to-end and hold the content in context.
  In particular, locate and remember:
  - The PRD title (line 1, after `# `).
  - The feature kebab-slug (the basename of `<prd_path>` minus
    the `.prd.md` suffix). Example: `plan-authoring.prd.md` →
    `plan-authoring`.
  - The Implementation Phases table (header line + all data rows).
  - The Phase Details section (per-phase Goal / Scope / Success
    signal blocks).
  - The Acceptance Criteria section (AC-1 through AC-N) — needed for
    R8 traceability when assembling the plan's Acceptance Criteria.
```

**Used by:** Task 3 — Phase 0.B is inserted after the existing Phase 0 reads, gated on `description_mode = true`. It captures the description string (from command context) instead of reading a PRD file, and derives the slug from the description text.

---

# SOURCE: plugins/relay/agents/plan-writer.md:122-194

```markdown
## Phase 1 — PRD parse + phase selection

### Step 1.1 — Locate the Implementation Phases table
### Step 1.2 — Parse all data rows
### Step 1.3 — Select the next actionable phase
### Step 1.4 — Compute the plan filename
  Plan path: `<target_root>/PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
### Step 1.5 — Collision check
  Use `Glob` against `<target_root>/PRPs/plans/<feature>-phase-<N>-<slug>*.plan.md`.
```

**Used by:** Task 3 — Phase 1.B is inserted as an early-exit branch when `description_mode = true`: skip Steps 1.1–1.3, compute flat `<slug>.plan.md` from the description slug, run the same collision check logic against `PRPs/plans/<slug>*.plan.md`.

---

# SOURCE: plugins/relay/agents/plan-writer.md:335-349

```markdown
## Source PRD

- `PRPs/prds/<feature>.prd.md` — Implementation Phases row <N>:
  "{Phase Name}" — Goal: {Goal line from PRD Phase Details} —
  Success signal: {Success signal line from PRD Phase Details}.
```

**Used by:** Task 4 — Phase 4.3 in description mode emits `## Source` with the verbatim description instead of this `## Source PRD` pointer.

---

# SOURCE: plugins/relay/agents/plan-writer.md:481-530

```markdown
### Step 5.1 — Edit the source PRD's row N

Use `Edit` with:
- `old_string`: the row N line **copied verbatim from the PRD**
- `new_string`: same row, with Status `pending` → `in-progress` and PRP Plan cell populated.

### Step 5.2 — Handoff confirmation

...DRAFT plan written to `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
...Source PRD row <N> marked `in-progress`.
```

**Used by:** Task 5 — Phase 5.1 becomes a documented no-op when `description_mode = true`; Phase 5.2 confirmation omits the "Source PRD row N marked in-progress" line and uses the flat filename.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-plan.md` | UPDATE | Add Phase 0 input-type detection to the Parse arguments block; add description-mode precondition branch (skip P2/P4, keep P3, adapt P1); add Phase B for description-mode writer dispatch; update "What you do NOT do" to remove the PRD-less deferral note |
| `plugins/relay/agents/plan-writer.md` | UPDATE | Add Phase 0.B (description input capture, slug derivation); add Phase 1.B (skip table parse, flat filename, collision check); branch Phase 4.3 to emit `## Source` instead of `## Source PRD`; add description-mode AC format spec (no `(PRD AC-N)` token); make Phase 5.1 a documented no-op in description mode; update Phase 5.2 confirmation for description mode |

## NOT Building (Scope Limits)

- **plan-reviewer R8 description-mode variant** — R8a/R8b/R8c exemption branches are Phase 2 scope; Phase 1 does not touch plan-reviewer.
- **plan-template `## Source` generalization** — the template comment update is Phase 2 scope; Phase 1 only implements the behavior in plan-writer.
- **`/relay-implement` P3 branch and D8 Mutation c no-op** — Phase 3 scope.
- **`implementer` flat-filename parse tolerance** — Phase 3 scope.
- **`code-reviewer`/`code-reviewer-semantic` AC-source substitution** — Phase 3 scope.
- **Docs + release cut** — Phase 4 scope (`docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `plugin.json` bump, new `docs/decisions.md` entry).
- **A `--no-prd` flag** — explicitly out of scope for the entire feature (Decisions Log, Won't).
- **A complexity/ambiguity guard** — no heuristic recommending a PRD for large features; description mode always plans from the given text (Decisions Log, Won't).
- **Lightweight PRD generated under the hood** — explicitly rejected (What We're NOT Building); description mode never synthesizes a PRD.
- **`/relay-execute` integration** — description-mode plans are outside the orchestrator (Won't for the entire feature).
- **TDD chain in description mode** — MVP supports `tdd: false` targets only; TDD pair is deferred (What We're NOT Building).

## Step-by-Step Tasks

### Task 1: UPDATE relay-plan.md — add Phase 0 input-type detection and description-mode precondition branch

**Implements: AC-A1, AC-A2, AC-A3**

- **ACTION**: In `plugins/relay/commands/relay-plan.md`, replace the "Parse arguments" block's content after the blank-argument HALT with a two-branch Phase 0 detection step:
  - If the argument ends with `.prd.md` → record `prd_path`, set `mode = prd`, proceed to existing P1–P4 and Phase A unchanged.
  - Else → record `description = $ARGUMENTS`, set `mode = description`, proceed to the new P1.D (non-empty check already passed), P3.D (Decision Gate sources check, same three files), then Phase B.
  Adapt the HALT message for blank argument to say "Usage: /relay-plan PRPs/prds/<feature>.prd.md OR /relay-plan \"<description>\"" so both modes are documented in the HALT.
  Add a new `## Phase B — Adopt the Writer role (description mode)` section immediately after the existing Phase A section, instructing the command to pass `description` and `target_root` to plan-writer's description-mode entrypoint (Phase 0.B).
  Update the `## What you do NOT do` section to remove the PRD-less-deferral bullet (lines 278-283 referencing the 2026-05-15 decision as "not yet implemented") and replace it with a one-line note: "Operating without any argument — blank arguments HALT before any mode is entered."
  Update the command-level `description:` frontmatter to document that the command accepts either a PRD path or a free-text description.
- **MIRROR**: Patterns-to-Mirror anchor `plugins/prp-core/commands/prp-plan.md:42-89` (Phase 0 detection table shape); `plugins/relay/commands/relay-plan.md:47-68` (Parse arguments block to modify); `plugins/relay/commands/relay-plan.md:76-153` (preconditions to branch).
- **VALIDATE**: `grep -n "Phase 0" plugins/relay/commands/relay-plan.md | head -5` — must return a line containing "Phase 0" and "input-type detection" or equivalent heading; `grep -n "description mode" plugins/relay/commands/relay-plan.md | wc -l` — must return ≥ 3 (detection branch, P1.D, Phase B heading).

### Task 2: UPDATE relay-plan.md — update Final output surface for description-mode confirmation

**Implements: AC-A7**

- **ACTION**: In `plugins/relay/commands/relay-plan.md`, extend the `## Final output surface` section to document the description-mode success confirmation emitted by plan-writer Phase 5.2 in description mode:
  ```
  DRAFT plan written to `PRPs/plans/<slug>.plan.md`.
  Decision Gate: **PROCEED**.
  Run `/relay-plan-review PRPs/plans/<slug>.plan.md` to validate.
  ```
  (The "Source PRD row N marked in-progress" line is absent because there is no PRD row.) Also add to the `## Constraints (hard rules)` section a note that the `.claude/PRPs/` write prohibition applies to description-mode plans as well (plans still go to `PRPs/plans/<slug>.plan.md`).
- **MIRROR**: Patterns-to-Mirror anchor `plugins/relay/commands/relay-plan.md:47-68` (parse arguments shape that establishes mode context); existing Final output surface pattern at `relay-plan.md:219-226`.
- **VALIDATE**: `grep -A5 "Final output surface" plugins/relay/commands/relay-plan.md | grep "slug"` — must match the flat filename pattern without `-phase-`.

### Task 3: UPDATE plan-writer.md — add Phase 0.B (description input) and Phase 1.B (flat filename)

**Implements: AC-A4, AC-A8**

- **ACTION**: In `plugins/relay/agents/plan-writer.md`, insert a new `## Phase 0.B — Description-mode setup (when called from Phase B)` section immediately after the existing `## Phase 0 — Setup` section. Phase 0.B:
  - Receives `description` (the raw free-text string) and `target_root` from the calling command.
  - Reads `<target_root>/docs/context/methodology.md` for `tdd:` (same as Phase 0; if already read in Phase 0 this is a no-op).
  - Derives `<slug>`: apply the same kebab-slugification rule as Step 1.4 but applied to the first 8 words (or first 60 characters, whichever is shorter) of the description text.
  - Sets `description_mode = true`. Does NOT read any PRD file. Does NOT parse any Implementation Phases table.
  Then insert `## Phase 1.B — Description-mode filename + collision check (skip when description_mode = false)` immediately after `## Phase 1 — PRD parse + phase selection`. Phase 1.B:
  - Skips Steps 1.1–1.3 entirely.
  - Computes `plan_path = <target_root>/PRPs/plans/<slug>.plan.md`.
  - Runs the collision check: `Glob` against `<target_root>/PRPs/plans/<slug>*.plan.md`; apply the same suffix logic (`-2`, `-3`, …) as Step 1.5 (never overwrite APPROVED or DRAFT).
  - Records the final `plan_path`.
- **MIRROR**: Patterns-to-Mirror anchors `plugins/relay/agents/plan-writer.md:99-118` (Phase 0 structure to parallel); `plugins/relay/agents/plan-writer.md:122-194` (Phase 1 steps to bypass/adapt); `plugins/prp-core/commands/prp-plan.md:42-89` (free-text branch).
- **VALIDATE**: `grep -n "Phase 0.B\|Phase 1.B\|description_mode" plugins/relay/agents/plan-writer.md | wc -l` — must return ≥ 6 (two headings, slug derivation, collision reference, `description_mode = true`, and the skip guard).

### Task 4: UPDATE plan-writer.md — branch Phase 4.3 (Source section) and add description-mode AC format

**Implements: AC-A5, AC-A6, AC-A7**

- **ACTION**: In `plugins/relay/agents/plan-writer.md`, edit Step 4.3 to be conditional:
  - When `description_mode = false` (PRD mode): emit the existing `## Source PRD` section unchanged.
  - When `description_mode = true` (description mode): emit a `## Source` section containing the verbatim description text, with no PRD path, no row number, no Goal/Success-signal reference. Header is `## Source` (not `## Source PRD`).
  Also update Step 4.4 item 12 (`## Acceptance Criteria`) to add a description-mode branch: when `description_mode = true`, each AC bullet's format is `**AC-A<i>:** <statement>` with no `(PRD AC-N)` token; the statement is derived from observable behaviors implied by the description. The rubric R8b check (which enforces `(PRD AC-N)` presence) does not apply in description mode — note this explicitly so plan-reviewer Phase 2 knows to apply its R8b description-mode variant (Phase 2 of the PRD).
  Add a note in the plan-writer Phase 5.1 prose that when `description_mode = true`, Phase 5.1 is a documented no-op: no `Edit` is performed, no PRD row is back-filled. The plan-writer logs "description mode: no PRD row back-fill" and proceeds to Phase 5.2.
  Update the Phase 5.2 confirmation to emit the flat-filename form when `description_mode = true`:
  ```
  DRAFT plan written to `PRPs/plans/<slug>.plan.md`.
  Decision Gate: **{PROCEED | HALT}**.
  Run `/relay-plan-review PRPs/plans/<slug>.plan.md` to validate.
  ```
- **MIRROR**: Patterns-to-Mirror anchors `plugins/relay/agents/plan-writer.md:335-349` (Source PRD section to generalize); `plugins/relay/agents/plan-writer.md:481-530` (Phase 5 back-fill and confirmation to branch).
- **VALIDATE**: `grep -n "## Source\b" plugins/relay/agents/plan-writer.md` — must show both the `## Source PRD` (PRD mode) and `## Source` (description mode) headings documented within the branched Step 4.3; `grep -n "no-op" plugins/relay/agents/plan-writer.md` — must return ≥ 1 line referencing "description mode: no PRD row back-fill" or equivalent.

### Task 5: UPDATE plan-writer.md — update frontmatter description and Hard constraints for description mode

*Infrastructure / scaffolding: updates frontmatter and hard-constraint documentation to formally register description mode; no new behavioral capability beyond Tasks 1–4.*

- **ACTION**: In `plugins/relay/agents/plan-writer.md`, update the frontmatter `description:` field to state that the agent handles both PRD-mode (existing) and description-mode (new) inputs. Update Hard constraint #2 to note that in description mode the plan title is `# Feature: <first few words of description> (description mode)` and the Decision Gate block is still the first fenced block. Update Hard constraint #9 to note that in description mode there is no `Write`-rewrite or `Edit` of a PRD (Phase 5.1 is a no-op). Add a new Hard constraint #10: "In description mode, the plan path is `PRPs/plans/<slug>.plan.md` (flat, no `phase-<N>` segment). Never insert a phase-number segment for description-mode plans."
- **MIRROR**: Patterns-to-Mirror anchor `plugins/relay/agents/plan-writer.md:99-118` (Phase 0 frontmatter/setup structure); existing hard-constraint list at `plan-writer.md:45-96`.
- **VALIDATE**: `grep -c "description mode" plugins/relay/agents/plan-writer.md` — must return ≥ 5 (frontmatter, Phase 0.B heading, Phase 1.B heading, Phase 4.3 branch note, Phase 5.1 no-op note, and hard constraint); `grep "phase_type" plugins/relay/agents/plan-writer.md | wc -l` — must return ≥ 1 (phase_type inference step unchanged, still present).

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Verify both changed files are valid Markdown (no broken fence blocks)
npx markdownlint plugins/relay/commands/relay-plan.md plugins/relay/agents/plan-writer.md --config .markdownlint.json 2>&1 || echo "markdownlint not configured — manual check required"

# Confirm no .claude/ path strings were introduced into relay-plan.md
grep -n "\.claude/" plugins/relay/commands/relay-plan.md && echo "FAIL: .claude/ reference found" || echo "PASS: no .claude/ references"

# Confirm no .claude/ path strings were introduced into plan-writer.md
grep -n "\.claude/" plugins/relay/agents/plan-writer.md && echo "FAIL: .claude/ reference found" || echo "PASS: no .claude/ references"
```

### Level 2 CONTENT_INVARIANTS

```bash
# relay-plan.md: Phase 0 detection block present
grep -n "Phase 0\|input-type detection\|description mode" plugins/relay/commands/relay-plan.md | wc -l
# Expect ≥ 4

# relay-plan.md: PRD mode preconditions P1–P4 still present (regression check)
grep -n "P1 — PRD path\|P2 — PRD ends\|P3 — Decision Gate\|P4 — At least" plugins/relay/commands/relay-plan.md | wc -l
# Expect 4

# relay-plan.md: blank-argument HALT still present
grep -n "blank/whitespace\|HALT with" plugins/relay/commands/relay-plan.md | wc -l
# Expect ≥ 2

# plan-writer.md: Phase 0.B and Phase 1.B headings present
grep -n "Phase 0\.B\|Phase 1\.B" plugins/relay/agents/plan-writer.md | wc -l
# Expect 2

# plan-writer.md: description_mode references present
grep -n "description_mode" plugins/relay/agents/plan-writer.md | wc -l
# Expect ≥ 5

# plan-writer.md: flat filename pattern documented
grep -n "slug.*\.plan\.md\|<slug>\.plan\.md" plugins/relay/agents/plan-writer.md | wc -l
# Expect ≥ 2

# plan-writer.md: Phase 5.1 no-op noted
grep -n "no-op\|no PRD row" plugins/relay/agents/plan-writer.md | wc -l
# Expect ≥ 1

# plan-writer.md: ## Source PRD (PRD mode) still present and ## Source (description mode) present
grep -n "## Source" plugins/relay/agents/plan-writer.md
# Expect both "## Source PRD" and "## Source" lines

# plan-writer.md: AC-A<i> description-mode format (no PRD AC-N token) documented
grep -n "AC-A.*PRD\|no (PRD AC-N)\|description.*AC format" plugins/relay/agents/plan-writer.md | wc -l
# Expect ≥ 1
```

### Level 3 INTEGRATION (DRY-RUN END-TO-END)

```bash
# Dogfood dry-run: confirm the relay-plan command file is parseable and the Phase B section exists
grep -A20 "Phase B" plugins/relay/commands/relay-plan.md | head -20
# Expect: Phase B section with description-mode writer dispatch instructions

# Confirm plan-writer Phase 0.B and 1.B are ordered correctly relative to Phase 0 and Phase 1
grep -n "## Phase 0\|## Phase 0\.B\|## Phase 1\|## Phase 1\.B" plugins/relay/agents/plan-writer.md
# Expect: Phase 0 < Phase 0.B < Phase 1 < Phase 1.B in line number order

# Confirm PRD-mode preconditions in relay-plan.md are unchanged (regression)
grep -A3 "P2 — PRD ends" plugins/relay/commands/relay-plan.md | grep "APPROVED"
# Expect: line containing "*Status: APPROVED*"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a non-empty free-text argument to `/relay-plan` that does not end with `.prd.md` and does not contain an "Implementation Phases" table header, when the command runs its Phase 0 detection, it enters description mode and does NOT HALT on P2 (APPROVED status) or P4 (Implementation Phases table). The detection step in `relay-plan.md` routes correctly without PRD-shaped preconditions blocking the flow.
- **AC-A2 (PRD AC-1):** Given a blank or whitespace-only argument to `/relay-plan`, when Phase 0 detection runs, the command HALTs with the adapted P1 HALT message. The blank-argument guard is preserved in both PRD mode and description mode (the detection step fires first, but blank → HALT before any mode is entered).
- **AC-A3 (PRD AC-2):** Given an argument ending with `.prd.md` that resolves to a readable APPROVED PRD with a valid Implementation Phases table, when the command runs Phase 0 detection, it enters PRD mode and enforces P1–P4 exactly as before. No regression in PRD-mode precondition behavior is introduced by Phase 1.
- **AC-A4 (PRD AC-3):** Given a valid free-text description, when description mode runs `plan-writer` Phase 0.B and Phase 1.B, the flat `<slug>.plan.md` filename is computed from the description, the collision check runs against `PRPs/plans/<slug>*.plan.md`, and no phase-number segment is inserted in the filename.
- **AC-A5 (PRD AC-3):** Given a valid free-text description and description mode active, when `plan-writer` Phase 4.3 runs, the generated DRAFT plan contains a `## Source` section with the verbatim description text (not a `## Source PRD` pointer with a PRD path and row N reference).
- **AC-A6 (PRD AC-3):** Given a description-mode plan with derived `AC-A<i>` items, when plan-writer assembles the Acceptance Criteria section, each bullet has the format `**AC-A<i>:** <statement>` with no `(PRD AC-N)` token, and the plan contains at least 3 such derived items (R4 parity floor documented for Phase 2 plan-reviewer enforcement).
- **AC-A7 (PRD AC-3):** Given description mode active, when plan-writer Phase 5.1 runs, no `Edit` is performed on any PRD file and no PRD row is mutated. The Phase 5.2 confirmation omits "Source PRD row N marked in-progress" and uses the flat filename form.
- **AC-A8 (PRD AC-5):** Given description mode, when planning, the Decision Gate consultation over the three P3 sources (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`) still runs and the generated plan carries a Decision Gate evidence block as the first fenced block below the title.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PRD-mode regression: adding the detection branch inadvertently changes the behavior of existing P1–P4 checks | M | H | The detection step fires before any precondition; PRD-mode falls through to unchanged P1–P4 code. Level 2 CONTENT_INVARIANTS grep checks verify all four precondition headings still present. AC-A3 explicitly tests PRD mode. |
| Slug derivation produces collisions between different descriptions that share the same leading words | L | M | Collision check uses the same suffix logic (`-2`, `-3`, …) as PRD mode; never overwrites existing plans. |
| Divergence from plan-template: description-mode plans missing mandatory sections or using wrong section headings | M | H | plan-writer Phases 2–4 are unchanged in structure; only Phase 4.3 (Source section name) and AC format differ. plan-reviewer R2 (section order) and R3 (no-TBD) still run against description-mode plans; Phase 2 of the PRD adds R8 exemption. |
| plan-reviewer R8b false HALT on description-mode plans (no `(PRD AC-N)` token) | H | M | This is Phase 2 scope; the plan-writer adds an explicit note in Step 4.4 item 12 that R8b does not apply in description mode, giving Phase 2 the hook it needs. AC-A6 documents the floor. |
| Scope creep without a PRD anchor: description-mode plans may hallucinate requirements | M | M | Mandatory "NOT Building" section in every generated plan; derived ACs bound the contract; grounding (Phase 2 GROUNDING) is preserved and strengthened to compensate for the missing PRD anchor. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**PRD-mode regression boundary:** The key invariant for all tasks is that the detection step must be a pure prefix to the existing flow. Every line of the existing PRD-mode logic (P1–P4, Phase A) must be reachable unchanged when the argument ends with `.prd.md`. The easiest structural approach is a top-level `if/else` in the "Parse arguments" block: the `if` branch handles the `.prd.md` / "Implementation Phases" case and falls into the existing protocol; the `else` branch handles description mode and jumps to the new Phase B section.

**plan-writer.md ordering:** Phase 0.B and Phase 1.B must appear as additive sections in the plan-writer agent file, clearly labelled with their gating condition (`when description_mode = true` / `when called from Phase B`). They must not restructure or renumber the existing Phase 0 and Phase 1 sections. plan-reviewer R2 walks section headings in order; the additive Phase 0.B / Phase 1.B headings do not appear in the *plan* body (they appear only in the plan-writer agent protocol), so R2 is unaffected.

**Dogfood opportunity:** After Phase 1 ships, the next small relay feature should be planned via `/relay-plan "<description>"` to exercise the full Phase 1 entrypoint end-to-end before Phase 2 (plan-reviewer R8 description-mode variant) is implemented. The plan-reviewer will return CHANGES_REQUESTED on R8 items for the description-mode plan; that is expected until Phase 2 ships.

*Generated: 2026-06-16*
*Approved: 2026-06-16*
*Implemented: 2026-06-16*
*Status: IMPLEMENTED*
