# Feature: docs/decisions.md codification entry (Phase 3 of test-frameworks-empty-self-skip)

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: append-only mutation to docs/decisions.md; cross-cutting protocol rule formalizing /relay-test self-skip on test_frameworks: []; symmetric with 2026-05-06 TDD self-skip entry; D5 inheritance paragraph for /relay-test-review; consumed by future Decision Gate consultations
- Decisions found:
  - 2026-05-06 — TDD pair authorized for test creation; /relay-execute A.3.5 self-skips silently when tdd: false or methodology.md missing — direct structural precedent for the new entry's shape and rationale
  - 2026-04-19 — TDD activation is opt-in by explicit declaration only (heuristic activation forbidden) — precedent applied symmetrically: test framework activation requires explicit non-empty test_frameworks
  - 2026-04-19 — PRP artifact paths under PRPs/ (never .claude/) — unaffected by this phase (no artifact-path change)
  - 2026-05-11 D8 — Worktree-creation-failure graceful fallback to cwd — graceful-degradation philosophy applied symmetrically to framework-less projects
- Applicable anti-patterns:
  - docs/anti-patterns.md:43-48 — "Activating the TDD track by heuristic" — applied symmetrically: test runner activation requires explicit non-empty test_frameworks; never heuristic
  - docs/anti-patterns.md:60-66 — "Writing pipeline artifacts under .claude/" — this phase writes only to docs/decisions.md; no .claude/ writes involved
  - docs/anti-patterns.md:79-84 — "Relying on interactive permission prompts in the autonomous loop" — a false FAILED_INFRA_UNRECOVERABLE halt on framework-less projects is semantically equivalent to an unsignalled prompt
- Applicable architectural rules:
  - docs/context/architecture.md:58-81 — Interactivity boundary; past PRD approval, autonomous; halts must be semantically correct
  - docs/context/architecture.md:84-98 — PRPs/ artifact paths; no .claude/ writes
  - docs/decisions.md entries are append-only; the 2026-05-06 entry's "Areas affected" MUST NOT be modified
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-frameworks-empty-self-skip.prd.md` — Implementation Phases row 3: "docs/decisions.md codification entry" — Goal: Future agents consulting the Decision Gate find the operative rule for the `test_frameworks: []` case. — Success signal: entry is appended; `grep -n "test_frameworks: \[\]" docs/decisions.md` returns the new entry; the 2026-05-06 entry's "Areas affected" is NOT modified (entries are append-only).

## Summary

Phase 3 appends a new dated entry to `docs/decisions.md` that formalizes the `test_frameworks: []` silent self-skip rule for `/relay-test`. The entry follows the exact four-field shape (Context / Decision / Reason / Areas affected) of the 2026-05-06 TDD self-skip entry, cites `PRPs/reports/relay-worktree/dogfood.md:278-283` as driving evidence, declares symmetry with the 2026-05-06 precedent, documents the strict-vs-graceful boundary (framework-not-declared = self-skip; framework-declared-infra-broken = strict halt), and includes an explicit D5 paragraph establishing that `/relay-test-review` self-skips inheritedly when no `run.json` is written — without requiring any code change to `/relay-test-review`. This single-file append closes the Decision Gate gap: future agents and human reviewers consulting `docs/decisions.md` will find the operative contract for framework-less projects.

## User Story

```
As a relay pipeline operator running /relay-execute against a framework-less project
I want the Decision Gate to contain an explicit, findable rule for the test_frameworks: [] self-skip
So that future agents consult the correct operative contract and never re-introduce the dogfood-B FAILED_INFRA_UNRECOVERABLE regression
```

## Problem Statement

Phases 1 and 2 ship the command-level and orchestrator-level self-skip gates, but neither records the operative contract in `docs/decisions.md`. Without a decisions.md entry, future agents consulting the Decision Gate have no authoritative record of:

- Why `test_frameworks: []` triggers a graceful self-skip (not a strict halt).
- That the strict `FAILED_INFRA_UNRECOVERABLE` path is preserved for framework-declared-but-infra-broken projects.
- That `/relay-test-review` self-skips inheritedly (via the natural absence of `run.json`) and requires no additional code gate.

The gap leaves the Decision Gate incomplete and risks future agents re-deriving different conclusions from the same raw evidence — the exact source of the dogfood-A vs dogfood-B divergence this PRD corrects.

## Solution Statement

Append a single new entry to `docs/decisions.md` immediately before the trailing template comment block (around line 487). The entry uses the four-field shape established by the 2026-05-06 entry (`docs/decisions.md:421-437`) and adds a D5 sub-paragraph on `/relay-test-review` inheritance. Five-paragraph minimum per the PRD Phase Details: Context (dogfood evidence), Decision (the rule with boundary), Reason (symmetry with 2026-05-06), Areas affected, D5 inheritance paragraph. The change is append-only; no existing entry is modified.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation / Decision record |
| Complexity | Low |
| Systems Affected | `docs/decisions.md` |
| Dependencies | Phase 1 complete (relay-test Phase 0 gate shipped); Phase 2 complete (relay-execute Phase A.5.0 explicit handling shipped) |
| Estimated Tasks | 3 atomic tasks |
| Source PRD line ref | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` row 3 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` | 1–223 | Source PRD; AC-6 D5 requirement; boundary specification; decisions log D1–D6 |
| P0 | `docs/decisions.md` | 421–437 | 2026-05-06 TDD self-skip entry — exact four-field shape to mirror |
| P0 | `docs/decisions.md` | 485–497 | Trailing template comment block — insertion point for new entry |
| P1 | `PRPs/reports/relay-worktree/dogfood.md` | 278–283 | Driving evidence: "Protocol inconsistency surfaced" passage; explicit proposed-fix paragraph |
| P1 | `plugins/relay/commands/relay-tdd.md` | 116–134 | P4.a canonical self-skip pattern; verbatim line shape to cite in the new entry |
| P2 | `plugins/relay/commands/relay-test.md` | 146–147 | Current (pre-Phase-1) strict-halt encoding; cited in Context paragraph as the conflated path being corrected |

## Patterns to Mirror

### Pattern 1 — Four-field decisions.md entry shape

# SOURCE: docs/decisions.md:421-437

```markdown
## [2026-05-06] TDD pair is the authorized mechanism for creating test files in the autonomous pipeline (R-X strict preserved)

**Context:** Three real-world halts on the user's `/relay-execute` runs ... demonstrated empirically that ...

**Decision:** The TDD pair ... is the **only** authorized mechanism for creating new test files ...

**Reason:** R-X strict's purpose is to prevent the implementer from "passing" tests by weakening or modifying them ...

**Areas affected:** `plugins/relay/agents/tdd-writer.md` (NEW); ...
```

The new entry MUST reproduce this exact four-field shape (`**Context:**` / `**Decision:**` / `**Reason:**` / `**Areas affected:**`), preceded by the `---` separator and the `## [YYYY-MM-DD] Title` header, and followed by `---` and the trailing template comment. The D5 sub-paragraph on `/relay-test-review` inheritance is appended as an additional paragraph inside the `**Decision:**` field (or as a named paragraph immediately after `**Areas affected:**` — match the prose style of the 2026-05-06 entry).

### Pattern 2 — Verbatim self-skip line cited in the entry

# SOURCE: plugins/relay/commands/relay-tdd.md:120-122

```
Emit verbatim and exit 0:

> TDD track inactive (tdd: false). Skipping.
```

The new entry's Decision field must cite the symmetric new line:

> Test framework inactive (test_frameworks: []). Skipping.

and cross-reference the 2026-05-06 entry to signal the symmetry explicitly.

### Pattern 3 — Driving evidence block from dogfood report

# SOURCE: PRPs/reports/relay-worktree/dogfood.md:278-283

```
**Protocol inconsistency surfaced (logged for follow-up):** dogfood-A's session interpreted the test
stage as `skipped_no_test_framework` (graceful); dogfood-B's session interpreted it as
`FAILED_INFRA_UNRECOVERABLE` (strict) but still returned `ALL_PHASES_COMPLETE`. Per the current
strict orchestrator protocol, dogfood-B should have HALTed. Suggests a future `docs/decisions.md`
entry formalizing /relay-test self-skip when `test_frameworks: []` in `methodology.md` — analogous
to the `tdd: false` self-skip in Phase A.3.5. Deferred as a separate follow-up.
```

The new entry's Context paragraph must cite this passage (`PRPs/reports/relay-worktree/dogfood.md:278-283`) as the primary driving evidence and quote the dogfood-A vs dogfood-B inconsistency as the trigger.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/decisions.md` | UPDATE (append before line 487 template comment) | Append the new 2026-05-12 entry formalizing the test_frameworks: [] self-skip rule, D5 /relay-test-review inheritance paragraph, and strict-vs-graceful boundary |

## NOT Building (Scope Limits)

- Modifying the 2026-05-06 TDD self-skip entry's "Areas affected" cell or any other existing entry — entries are append-only.
- Updating `docs/api-reference.md`, `documentation/commands.html`, `documentation/changelog.html`, or `plugins/relay/.claude-plugin/plugin.json` — deferred to Phase 4 (v0.11.1 release cut).
- Updating `plugins/relay/agents/test-runner.md` (lines 69, 91, 281 ABORT_INFRA emission sites) — classified as Could in MoSCoW; deferred to Phase 4 or a follow-up.
- Auto-detecting test frameworks from file system inspection — explicit anti-pattern per `docs/anti-patterns.md:43-48`.
- Changing `FAILED_INFRA_UNRECOVERABLE` semantics for genuine infra issues — preserved verbatim; the new entry documents the boundary, not a change to the strict path.
- Re-validating relay-worktree AC-16 cross-contamination methodology gap — separate concern, deferred.

## Step-by-Step Tasks

### Task 1: READ docs/decisions.md insertion point (scaffolding)

- **ACTION**: Read `docs/decisions.md` lines 480–497 to confirm the exact text of the trailing `---` separator and the `<!-- Template for future entries: -->` comment block that immediately follows the D8 entry. Capture the exact whitespace and newline shape so the `Edit` old_string in Task 2 is byte-exact.
- **MIRROR**: Pattern 1 — four-field decisions.md entry shape (`docs/decisions.md:421-437`)
- **VALIDATE**: `grep -n "Template for future entries" C:\repos\PRPs-agentic-eng\docs\decisions.md` — confirms the template comment exists at the expected line; output must show a match around line 487.

*(structural verification / scaffolding)*

### Task 2: APPEND new 2026-05-12 entry to docs/decisions.md

- **ACTION**: Use `Edit` on `docs/decisions.md` with `old_string` = the exact `---\n\n<!-- Template for future entries:` block (copied verbatim from Task 1's read), and `new_string` = the separator `---` followed by the full new entry block followed by `---` followed by the original template comment. The new entry must contain:

  **Header:** `## [2026-05-12] Test framework absence is a silent self-skip in /relay-test (symmetric with /relay-tdd self-skip on tdd: false)`

  **Context paragraph:** Cite the dogfood-A vs dogfood-B inconsistency observed on 2026-05-11 (`PRPs/reports/relay-worktree/dogfood.md:278-283`) as primary evidence. Note that the current code at `plugins/relay/commands/relay-test.md:146-147` conflates three failure modes (`missing_settings_json`, `no_runner_detected`, `no_test_framework`) into a single `FAILED_INFRA_UNRECOVERABLE` halt, incorrectly treating "no framework configured by design" identically to "framework configured but infra broken".

  **Decision paragraph (with D5 sub-paragraph):** State the rule: when `docs/context/methodology.md` declares `test_frameworks: []` OR the file is absent, `/relay-test` emits verbatim `Test framework inactive (test_frameworks: []). Skipping.` and exits 0 — symmetric in shape and position to `/relay-tdd` P4.a's `TDD track inactive (tdd: false). Skipping.`. Document the strict-vs-graceful boundary: framework-NOT-declared (or file-absent) → graceful self-skip; framework-DECLARED-but-infra-broken (missing `.claude/settings.json` when a framework IS declared, docker down, container failure, normalizer failure) → strict `FAILED_INFRA_UNRECOVERABLE` (preserved verbatim). Include the D5 sub-paragraph: `/relay-test-review` self-skips inheritedly when `/relay-test` self-skipped because no `run.json` is written; `/relay-test-review`'s existing precondition check requires `run.json` to exist; no code change to `/relay-test-review` is required; this inheritance is the operative contract.

  **Reason paragraph:** Symmetry with the 2026-05-06 TDD self-skip entry is the primary reason. Cite the broader CI/orchestrator ecosystem precedent (pytest exit-5, Jest/Vitest `--passWithNoTests`, GitLab CI `rules:exists`) as industry validation. State that the `FAILED_INFRA_UNRECOVERABLE` semantic is preserved where it is correct (genuine infra brokenness) and corrected where it was wrong (no-framework-by-design state).

  **Areas affected paragraph:** List `plugins/relay/commands/relay-test.md` (Phase 0 self-skip gate, shipped in Phase 1 of this PRD); `plugins/relay/commands/relay-execute.md` (Phase A.5.0 explicit handling, shipped in Phase 2 of this PRD); this `docs/decisions.md` entry (Phase 3); `docs/api-reference.md`, `documentation/commands.html`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json` (Phase 4 release cut, deferred).

- **MIRROR**: Pattern 1 (`docs/decisions.md:421-437`) for four-field shape; Pattern 2 (`plugins/relay/commands/relay-tdd.md:120-122`) for verbatim self-skip line citation; Pattern 3 (`PRPs/reports/relay-worktree/dogfood.md:278-283`) for driving evidence quote.
- **VALIDATE**: `grep -n "Test framework absence is a silent self-skip" C:\repos\PRPs-agentic-eng\docs\decisions.md` — must return exactly one match with the correct date header `[2026-05-12]`.

*(satisfies AC-A1, AC-A2, AC-A3, AC-A4)*

### Task 3: VERIFY entry correctness and append-only invariant

- **ACTION**: Read `docs/decisions.md` from the D8 entry (around line 478) to the end of the file. Confirm: (a) the new `[2026-05-12]` entry is present with all five required paragraphs (Context, Decision including D5, Reason, Areas affected); (b) the 2026-05-06 entry's content at lines 421–437 is byte-identical to the pre-edit version (no accidental mutation); (c) the trailing `<!-- Template for future entries: -->` comment block is still present after the new entry; (d) `grep -c "test_frameworks: \[\]" docs/decisions.md` returns at least 1.
- **MIRROR**: Pattern 1 (`docs/decisions.md:421-437`) — the pre-edit 2026-05-06 entry is the reference for the byte-identical check.
- **VALIDATE**: `grep -n "test_frameworks: \[\]" C:\repos\PRPs-agentic-eng\docs\decisions.md` — must return at least one match inside the new 2026-05-12 entry; must NOT return any match inside the 2026-05-06 entry (which predates this concept).

*(satisfies AC-A5)*

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Confirm docs/decisions.md is well-formed Markdown (no unclosed code fences, no broken pipe tables)
# The file has no YAML frontmatter, so a line-count sanity check serves as the lint proxy.
grep -c "^##" C:\repos\PRPs-agentic-eng\docs\decisions.md
# Expected: count increases by 1 compared to the pre-edit baseline (new ## [2026-05-12] header added)
```

### Level 2 CONTENT_INVARIANTS

```bash
# Invariant 1: new entry header present with correct date
grep -n "\[2026-05-12\] Test framework absence is a silent self-skip" C:\repos\PRPs-agentic-eng\docs\decisions.md

# Invariant 2: test_frameworks: [] appears in the new entry
grep -n "test_frameworks: \[\]" C:\repos\PRPs-agentic-eng\docs\decisions.md

# Invariant 3: D5 /relay-test-review inheritance paragraph present
grep -n "relay-test-review" C:\repos\PRPs-agentic-eng\docs\decisions.md

# Invariant 4: strict-vs-graceful boundary terms present
grep -n "FAILED_INFRA_UNRECOVERABLE" C:\repos\PRPs-agentic-eng\docs\decisions.md

# Invariant 5: 2026-05-06 entry NOT modified (Areas affected line still references tdd-writer.md as NEW)
grep -n "tdd-writer.md (NEW)" C:\repos\PRPs-agentic-eng\docs\decisions.md

# Invariant 6: trailing template comment still present
grep -n "Template for future entries" C:\repos\PRPs-agentic-eng\docs\decisions.md

# Invariant 7: dogfood evidence cited
grep -n "dogfood.md:278" C:\repos\PRPs-agentic-eng\docs\decisions.md
```

### Level 3 INTEGRATION

```bash
# Confirm the new entry appears AFTER the 2026-05-11 D8 entry and BEFORE the template comment
# by checking line ordering of three anchors:
$d8_line = (Select-String -Path "C:\repos\PRPs-agentic-eng\docs\decisions.md" -Pattern "D8 — Worktree-creation-failure").LineNumber
$new_line = (Select-String -Path "C:\repos\PRPs-agentic-eng\docs\decisions.md" -Pattern "\[2026-05-12\] Test framework absence").LineNumber
$tmpl_line = (Select-String -Path "C:\repos\PRPs-agentic-eng\docs\decisions.md" -Pattern "Template for future entries").LineNumber
Write-Host "D8 at $d8_line; new entry at $new_line; template at $tmpl_line"
# Expected: d8_line < new_line < tmpl_line
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** The new `docs/decisions.md` entry dated `[2026-05-12]` contains an explicit D5 paragraph documenting that `/relay-test-review` self-skips inheritedly when `/relay-test` self-skipped (because no `run.json` is written) and that no code change to `/relay-test-review` is required.
- **AC-A2 (PRD AC-6, AC-7):** The Decision field of the new entry states the self-skip rule in the verbatim-line shape `Test framework inactive (test_frameworks: []). Skipping.` and cross-references the 2026-05-06 TDD self-skip entry's symmetric shape `TDD track inactive (tdd: false). Skipping.`.
- **AC-A3 (PRD AC-3):** The Decision field documents the strict-vs-graceful boundary: framework-NOT-declared (or file-absent) → graceful self-skip; framework-DECLARED-but-infra-broken → strict `FAILED_INFRA_UNRECOVERABLE` (preserved verbatim). The boundary must be explicit enough for a future agent consulting the Decision Gate to distinguish the two cases without reading the command source.
- **AC-A4 (PRD AC-8):** The new entry is appended before the trailing `<!-- Template for future entries: -->` comment block; no existing entry is modified; `grep -n "\[2026-05-06\]" docs/decisions.md` returns a line with byte-identical content to the pre-edit version.
- **AC-A5 (PRD AC-6):** `grep -n "test_frameworks: \[\]" docs/decisions.md` returns at least one match inside the new 2026-05-12 entry and zero matches inside the 2026-05-06 entry.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edit old_string does not match verbatim (whitespace drift between Task 1 read and actual file bytes) | M | Low — plan is safe; only the append fails; soft-fail path preserves existing file | Task 1 explicitly reads the insertion point before composing the Edit; old_string is constructed from the read output, not from memory |
| New entry accidentally mutates the 2026-05-06 entry (e.g., wrong Edit boundary) | L | High — corrupts an existing decision record | Task 3 verification step reads the 2026-05-06 block and byte-checks it against the pre-edit content; AC-A4 enforces this |
| D5 paragraph omitted or too brief to be actionable for a future Decision Gate consultation | M | Medium — Decision Gate gap persists for /relay-test-review inheritance | AC-A1 explicitly requires the D5 paragraph to name the `run.json` absence as the inheritance mechanism; plan-reviewer rubric R8b enforces AC-A1 traceability |
| Entry inserted after the template comment (not before it) | L | Low — cosmetically wrong; comment is not load-bearing | Level 3 INTEGRATION command explicitly asserts `new_line < tmpl_line` ordering |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Dogfood evidence note:** The driving evidence at `PRPs/reports/relay-worktree/dogfood.md:278-283` is a first-person observation from the 2026-05-11 live dogfood run. The new decisions.md entry should quote it faithfully; it is the only primary source for the dogfood-A vs dogfood-B inconsistency that motivated this entire PRD.

**Append-only discipline:** `docs/decisions.md` is strictly append-only for the Decision Gate to remain trustworthy. Never edit a past entry — even to fix a typo — without a separate decisions.md entry recording the correction rationale. This phase's implementer must not touch any entry above the insertion point.

**Precedent alignment note:** The 2026-05-06 entry spans approximately 17 lines (lines 421–437). The new 2026-05-12 entry will be longer (five paragraphs including D5), which is fine — no line-count constraint exists for decisions.md entries.

*Generated: 2026-05-12*
*Approved: 2026-05-12*
*Implemented: 2026-05-12*
*Status: IMPLEMENTED*
