# Feature: Repo column (Phase 4 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: changes the Implementation Phases table schema, which is exact-matched at eleven sites across seven relay files; updates a regression test written specifically to assert the schema did not grow, which R-X routes through the test pair; adds a rubric rule binding a phase's declared repo to the topology registry Phase 1 shipped
- Decisions found:
  - [2026-08-05] Five-state phase-status lifecycle — the `Status` cell's semantics are untouched; only a sibling column is added beside it
  - [2026-08-28] R-X clears a matched test path only through a script-computed executable-content hash — the test update here is authored by the test pair, never by the Implementer, and is recorded as an `EXISTING_TEST_UPDATED` lifecycle op
  - [2026-04-19] Writer/reviewer split — `prd-reviewer` gains a rule; no new agent is introduced
  - Phase 1 of this feature — the topology registry the new rubric rule validates a `Repo` value against
  - PRP artifacts live under `PRPs/`, never under `.claude/`
- Applicable anti-patterns:
  - "Treating `plugins/prp-core/` as active relay code" — `prp-core` carries two copies of the same header and MUST NOT be edited; it is upstream reference, not relay's surface
  - "Weakening or deleting tests to make the auto-correction loop turn green" — the pinning test is UPDATED to assert the new canonical schema and the absence of a scope column, never relaxed or removed; its original intent is preserved
  - "Logic duplication across command files" — the canonical header lives in the template; every other site quotes it, and this phase keeps that relationship rather than adding a second source of truth
- Applicable architectural rules:
  - Graceful degradation: every PRD authored before this phase must keep parsing byte-for-byte, so the legacy seven-column form stays valid
  - Interactivity boundary: parsing and rubric evaluation are deterministic
  - Three-pillar Pillar 2; nothing is committed
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 4: "Repo column" — Goal: Let a phase name the repository it targets. — Success signal: A PRD with a `Repo` column parses everywhere and is validated; `npm run validate` is green; a row naming an undeclared or reference-only member is rejected.

## Summary

The topology registry Phase 1 shipped says which repositories a workspace contains; nothing yet says which one a phase touches. This phase adds a `Repo` column to the Implementation Phases table and threads it through every site that matches the header exactly — the template, the plan-writer's row selection, the prd-reviewer's R7 quote, and the parse preconditions of `/relay-execute`, `/relay-plan` and `/relay-implement`. The seven-column form stays valid so every existing PRD keeps parsing unchanged, and parsers are told to map cells by column NAME rather than position so a mid-table insertion cannot silently shift a legacy row's meaning. `prd-reviewer` gains a rule binding each non-empty `Repo` value to a declared `editable` member. The regression test that asserts the schema never grew is updated by the test pair to assert what it actually cared about: that no visual/logic scope column exists.

## User Story

```
As a PRD author working in a workspace of sibling repositories
I want each phase row to name the repository it targets
So that the orchestrator resolves the right context and creates the worktree in the right place
```

## Problem Statement

Phase 1 made workspace membership addressable but left it unaddressed: a phase has no way to say which member it touches. The hand-authored multi-repo PRD already in production encodes the repo in the phase NAME (`phase-1-backend`, `phase-2-frontend-camada-1`), which no parser reads and no reviewer validates. Meanwhile the header is exact-matched at eleven sites, and a regression test asserts it has exactly seven columns — so the change cannot be made in one place, and cannot be made at all without the test pair.

## Solution Statement

Insert `Repo` after `Status`, making the canonical header `| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |`, and update every relay site that quotes it. Instruct every parser to detect which header form is present and then map cells by column name, not by ordinal — a rule that makes the legacy seven-column form parse correctly by construction and removes the whole class of off-by-one bugs a mid-table insertion would otherwise invite. An empty or `-` cell means "the project's single repo", preserving single-repo behavior with no migration. `prd-reviewer` validates each non-empty value against the `## Repository topology` registry: the member must exist and its `Role` must be `editable`. The pinning test is updated to assert the new canonical schema plus the absence of any scope column — the property the visual-first feature actually needed it to guarantee.

## Metadata

| Key | Value |
|-----|-------|
| Type | Schema change across exact-match sites + rubric rule + test-pair update |
| Complexity | Medium–High |
| Systems Affected | `plugins/relay/resources/prd-template.md`, `plugins/relay/agents/plan-writer.md`, `plugins/relay/agents/prd-reviewer.md`, `plugins/relay/commands/relay-execute.md`, `plugins/relay/commands/relay-plan.md`, `plugins/relay/commands/relay-implement.md`, `scripts/validate/checks/figma-visual-first-track-phase2.test.mjs`, `docs/context/architecture.md` |
| Dependencies | Phase 1 (`complete`) — the `## Repository topology` registry the new rubric rule validates against |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 4; AC-13; Phase 4 Details |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** the deliverables are a schema change across prompt files plus one test update. In-phase validation is grep and the existing suite — the behavioral surface is the parsers themselves, which are prompts rather than runtime modules. The one test file touched is updated by the test pair under an `EXISTING_TEST_UPDATED` lifecycle op, not authored by the Implementer.

> **Test-file exception, explicit.** Unlike Phases 1–3, this phase's `## Files to Change` DOES include a test file. It is therefore NOT eligible for the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` test-pair-deferral branch, and no deferral note is emitted. The Implementer must not touch that row; Task 5 is a test-pair task and says so.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/resources/prd-template.md` | 184-215 | The canonical header and the phase-status lifecycle table beneath it — the source every other site quotes |
| 1 | `plugins/relay/agents/plan-writer.md` | 293-320 | Step 1.1's byte-for-byte match and Step 1.2's cell extraction — the parse that must become name-based |
| 1 | `scripts/validate/checks/figma-visual-first-track-phase2.test.mjs` | 618-636 | The regression test asserting exactly seven columns, and its stated intent: proving the visual/logic marker added no 8th column |
| 2 | `plugins/relay/commands/relay-execute.md` | 105-110, 775 | P3's parse precondition and the Phase A.4.9 row-flip procedure's own header quote |
| 2 | `plugins/relay/commands/relay-plan.md` | 185-190 | P4's parse precondition |
| 2 | `plugins/relay/commands/relay-implement.md` | 144 | D8 Mutation c's header quote |
| 2 | `plugins/relay/agents/prd-reviewer.md` | R7 block | The rubric item that quotes the header, and where the new topology-binding rule attaches |
| 3 | `plugins/relay/resources/repository-topology.md` | Role semantics | What `editable` and `reference-only` mean for a `Repo` value — shipped by Phase 1 |
| 3 | `PRPs/prds/multi-repo-topology.prd.md` | AC-13, Phase 4 Details | The acceptance contract |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/plan-writer.md:293-314
Find the table whose header line matches **byte-for-byte**:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

Do not attempt fuzzy matching. The canonical header is fixed.

Step 1.2: For each pipe-delimited data row below the separator (|---|...|),
extract the seven cells ... Trim whitespace. Treat `-` as "empty".
```

```
# SOURCE: scripts/validate/checks/figma-visual-first-track-phase2.test.mjs:622-636
test('AC-A6 (real structural proof): the real ## Implementation Phases table header row in prd-template.md is unchanged — still exactly the 7 pre-existing columns, matching the identical header substring prd-reviewer.md's own R7 check quotes, confirming no 8th column was added for the visual/logic scope marker', () => {
  const HEADER_ROW = '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |';
  const templateContent = readRepoFile(PRD_TEMPLATE_PATH);
  assert.ok(templateContent.includes(HEADER_ROW), 'expected the unchanged 7-column header row in prd-template.md');
```

```
# SOURCE: plugins/relay/resources/repository-topology.md (Role semantics)
| `Role` | `editable` — the member may be written to and may receive a worktree.
`reference-only` — the member is part of the workspace but is never written to
and never receives a worktree. |
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/prd-template.md` | UPDATE | The canonical header and the `Repo` column's documented semantics — the single source every other site quotes. |
| `plugins/relay/agents/plan-writer.md` | UPDATE | Step 1.1's header match and Step 1.2's cell extraction become name-based and accept both forms. |
| `plugins/relay/agents/prd-reviewer.md` | UPDATE | R7's quoted header, plus the new rule binding a `Repo` value to a declared `editable` member. |
| `plugins/relay/commands/relay-execute.md` | UPDATE | P3's parse precondition (two quotes) and the Phase A.4.9 row-flip procedure's own header quote. |
| `plugins/relay/commands/relay-plan.md` | UPDATE | P4's parse precondition (two quotes). |
| `plugins/relay/commands/relay-implement.md` | UPDATE | D8 Mutation c's header quote. |
| `scripts/validate/checks/figma-visual-first-track-phase2.test.mjs` | UPDATE | **Test-pair task.** The pin asserting seven columns is updated to assert the new canonical schema and the absence of a scope column — its original intent, preserved. |
| `docs/context/architecture.md` | UPDATE | Document the column, the legacy form, and the name-based mapping rule. |

## NOT Building (Scope Limits)

- **Editing `plugins/prp-core/`** — it carries two copies of the same header and is upstream reference, never active relay code. Touching it is a named anti-pattern.
- **Migrating existing PRDs** — the legacy seven-column form stays valid precisely so no PRD in `PRPs/prds/` needs rewriting. This plan's own source PRD keeps its seven-column table.
- **Acting on the `Repo` value** — resolving a phase to its repo root and creating that repo's worktree is Phase 5. This phase makes the value expressible and validated, not executed.
- **Making `Repo` mandatory** — an empty or `-` cell means "the project's single repo". Whether to require it once a topology is declared is the PRD's own Open Question #3 and stays open.
- **The `Parallel` column's semantics** — still read but not acted upon; PRD 2.
- **A validate check pinning the header across all eleven sites** — the updated regression test covers the template and the R7 quote, which is the pairing that previously drifted; a full cross-site check is worth doing but is not this phase's contract.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/resources/prd-template.md — the canonical schema

- **SATISFIES**: AC-A1 — the template is the source every other site quotes, so the canonical header changes here first.
- **ACTION**: Change the Implementation Phases header to `| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |`, updating the example rows and the separator row to match. Immediately beneath the table, document the `Repo` column: it names the workspace member this phase targets, must match a `Repo` value declared in the target project's `## Repository topology` section, and must name a member whose `Role` is `editable`. An empty cell or `-` means the project's single repository — the single-repo default, which requires no topology declaration and no migration. Add a paragraph stating that the SEVEN-column form without `Repo` remains valid for PRDs authored before this schema, that parsers accept both, and that a parser MUST map cells by column NAME rather than by ordinal position so a legacy row is never misread by an off-by-one.
- **MIRROR**: the byte-for-byte header discipline from the `plan-writer.md:293-314` anchor; the `Role` semantics from the `repository-topology.md` anchor.
- **VALIDATE**: `t=plugins/relay/resources/prd-template.md; if ! grep -q '^| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |$' "$t"; then echo "FAIL: canonical 8-column header absent from $t"; exit 1; fi; if ! grep -q 'by column NAME rather than by ordinal' "$t"; then echo "FAIL: the name-based mapping rule is not stated"; exit 1; fi; if ! grep -q 'remains valid' "$t"; then echo "FAIL: the legacy seven-column form is not preserved"; exit 1; fi; echo "PASS: canonical schema updated"`

### Task 2: UPDATE plugins/relay/agents/plan-writer.md — name-based parse accepting both forms

- **SATISFIES**: AC-A1, AC-A2 — the plan-writer is the parser whose Step 1.3 rule every other site cites as canonical, so its parse is the one that must handle both forms correctly.
- **ACTION**: In Step 1.1, replace the quoted header with the eight-column canonical form and add: a table whose header is the legacy seven-column form is also valid; detect which form is present, and in the legacy case treat every row's `Repo` as empty. Keep the existing "Do not attempt fuzzy matching" sentence — the two accepted forms are each matched byte-for-byte, and nothing else is. In Step 1.2, change "extract the seven cells" to instruct extracting cells BY COLUMN NAME, using the header row just matched to map names to positions, and state that ordinal extraction is forbidden because it silently misreads a legacy row. Add `Repo` to the list of cells treated as empty when `-`.
- **MIRROR**: the byte-for-byte match plus explicit no-fuzzy-matching prose from the `plan-writer.md:293-314` anchor.
- **VALIDATE**: `p=plugins/relay/agents/plan-writer.md; if ! grep -q '^| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |$' "$p"; then echo "FAIL: canonical header absent from $p"; exit 1; fi; if ! grep -q 'Do not attempt fuzzy matching' "$p"; then echo "FAIL: the no-fuzzy-matching rule was dropped"; exit 1; fi; if ! grep -qi 'by column name' "$p"; then echo "FAIL: name-based extraction not instructed"; exit 1; fi; if grep -q 'extract the seven cells' "$p"; then echo "FAIL: ordinal seven-cell extraction still instructed"; exit 1; fi; echo "PASS: plan-writer parses both forms by name"`

### Task 3: UPDATE the three command parse sites

- **SATISFIES**: AC-A1 — `/relay-execute` P3, `/relay-plan` P4 and `/relay-implement` D8 Mutation c each restate the header, and a site left on the old form rejects every new-schema PRD.
- **ACTION**: In `relay-execute.md`, update the P3 parse header, its `> Expected:` HALT line, and the Phase A.4.9 row-flip procedure's own header quote. In `relay-plan.md`, update the P4 parse header and its `> Expected:` HALT line. In `relay-implement.md`, update D8 Mutation c's header quote. At each parse precondition (not the flip procedure), add one sentence: the legacy seven-column form is also accepted, and cells are mapped by column name rather than ordinal. After this task no relay file under `plugins/relay/` quotes the seven-column header, and `plugins/prp-core/` is untouched.
- **MIRROR**: the command-level restatement idiom the same files already use for this header.
- **VALIDATE**: `n=$(grep -rl '^| # | Phase | Description | Status | Parallel | Depends | PRP Plan |$' plugins/relay/ 2>/dev/null | wc -l); if [ "$n" != "0" ]; then echo "FAIL: $n relay file(s) still carry the seven-column header as a table row"; grep -rln '^| # | Phase | Description | Status | Parallel | Depends | PRP Plan |$' plugins/relay/; exit 1; fi; if [ "$(grep -rc '^| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |$' plugins/relay/commands/relay-execute.md)" -lt 1 ]; then echo "FAIL: relay-execute not updated"; exit 1; fi; if ! grep -rq 'Parallel | Depends | PRP Plan' plugins/prp-core/commands/prp-prd.md; then echo "FAIL: prp-core was modified and must not be"; exit 1; fi; echo "PASS: all relay parse sites on the canonical header, prp-core untouched"`

### Task 4: UPDATE plugins/relay/agents/prd-reviewer.md — R7 quote and the topology-binding rule

- **SATISFIES**: AC-A3 — validating a `Repo` value against the registry is what makes the column a contract rather than a comment.
- **ACTION**: Update R7's quoted header to the canonical eight-column form and note that the legacy seven-column form also satisfies R7. Then add a rule to the R-COH-* deterministic layer, headed exactly `#### R-COH-REPO-UNDECLARED — every Repo cell names a declared editable member`, with class `blocking`. Its zero-emission branch: when the target project's `docs/context/architecture.md` has no `## Repository topology` section, emit NO row at all — a single-repo project has nothing to validate against. Otherwise, for every phase row whose `Repo` cell is non-empty: fail when the value matches no `Repo` in the registry, naming the offending value and the phase number; fail when it matches a member whose `Role` is `reference-only`, naming both; pass otherwise.
- **MIRROR**: the zero-emission-branch shape of `R-COH-DESIGN-SOURCE-INCOMPLETE` in the same file, which emits no row when its conditional section is absent.
- **VALIDATE**: `r=plugins/relay/agents/prd-reviewer.md; if ! grep -q '^#### R-COH-REPO-UNDECLARED — every Repo cell names a declared editable member$' "$r"; then echo "FAIL: the new rule heading is absent or not byte-exact"; exit 1; fi; if ! grep -q 'reference-only' "$r"; then echo "FAIL: the reference-only refusal is not specified"; exit 1; fi; if ! grep -q 'Status | Repo | Parallel' "$r"; then echo "FAIL: R7 does not quote the canonical header"; exit 1; fi; echo "PASS: R7 updated and the topology-binding rule added"`

### Task 5: UPDATE scripts/validate/checks/figma-visual-first-track-phase2.test.mjs — TEST-PAIR TASK

- **SATISFIES**: AC-A4 — the pin must keep guaranteeing what the visual-first feature needed, against the new schema.
- **ACTION**: **This is a test-pair task (`EXISTING_TEST_UPDATED`). The Implementer must not perform it.** Update the AC-A6 structural-proof test so its `HEADER_ROW` constant is the canonical eight-column form, and rewrite its title to state what it now proves: that the template's header and `prd-reviewer`'s R7 quote carry the identical canonical columns, and that no visual/logic SCOPE column exists — which is the property the visual-first feature actually required, and which the old "exactly 7 columns" phrasing was only a proxy for. Add an assertion that the header contains no column named `Scope`, `Visual` or `Phase Scope`, so the preserved intent is checked directly rather than inferred from a column count. Weaken nothing: both existing assertions (template contains the header; R7 quotes the identical header) survive with the new constant.
- **MIRROR**: the existing test's own structure — `HEADER_ROW` constant, `readRepoFile`, `sliceBetween` on the R7 block, `collapseWs` comparison.
- **VALIDATE**: `f=scripts/validate/checks/figma-visual-first-track-phase2.test.mjs; if grep -q "const HEADER_ROW = '| # | Phase | Description | Status | Parallel" "$f"; then echo "FAIL: the pin still asserts the seven-column header"; exit 1; fi; if ! grep -q 'Status | Repo | Parallel' "$f"; then echo "FAIL: the pin does not assert the canonical header"; exit 1; fi; if ! grep -qi 'scope' "$f"; then echo "FAIL: the preserved intent (no scope column) is not asserted"; exit 1; fi; node --test "$f" > /dev/null 2>&1 || { echo "FAIL: the updated test does not pass"; exit 1; }; echo "PASS: pin updated, intent preserved, suite green"`

### Task 6: UPDATE docs/context/architecture.md — document the column

- **SATISFIES**: AC-A1, AC-A3 — the schema and its validation rule are cross-cutting and belong with the state machine they extend.
- **ACTION**: Inside the existing `## Orchestrator state machine` section, add a subsection headed exactly `### The Repo column` stating: the Implementation Phases table carries a `Repo` cell naming the workspace member a phase targets; an empty cell or `-` means the project's single repository, which is why no existing PRD needed migration; the legacy seven-column form remains valid and parsers accept both, mapping cells by column name rather than ordinal; and `prd-reviewer`'s `R-COH-REPO-UNDECLARED` binds every non-empty value to a member declared `editable` in the `## Repository topology` registry, emitting nothing at all for a single-repo project. Do NOT create a new top-level section.
- **MIRROR**: the `### Per-phase diff base` and `### Worktree setup` subsections this feature's Phases 2 and 3 added to the same section.
- **VALIDATE**: `a=docs/context/architecture.md; if ! grep -q '^### The Repo column$' "$a"; then echo "FAIL: subsection missing from $a"; exit 1; fi; if ! grep -q 'R-COH-REPO-UNDECLARED' "$a"; then echo "FAIL: the validating rule is not named"; exit 1; fi; if ! grep -qi 'by column name' "$a"; then echo "FAIL: the name-based mapping rule is not documented"; exit 1; fi; echo "PASS: Repo column documented"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
node --check scripts/validate/checks/figma-visual-first-track-phase2.test.mjs || { echo "FAIL: test file does not parse"; exit 1; }
node -e "const fs=require('fs');for(const p of ['plugins/relay/resources/prd-template.md','plugins/relay/agents/plan-writer.md','plugins/relay/agents/prd-reviewer.md','plugins/relay/commands/relay-execute.md','plugins/relay/commands/relay-plan.md','plugins/relay/commands/relay-implement.md','docs/context/architecture.md']){const t=fs.readFileSync(p,'utf8');if(!t.trim()){console.error('FAIL: empty '+p);process.exit(1)}if((t.match(/^\x60\x60\x60/gm)||[]).length%2!==0){console.error('FAIL: unbalanced fences in '+p);process.exit(1)}}console.log('PASS: test parses, markdown fences balanced')"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
CANON='^| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |$'
LEGACY='^| # | Phase | Description | Status | Parallel | Depends | PRP Plan |$'
if ! grep -q "$CANON" plugins/relay/resources/prd-template.md; then echo "FAIL: template not on the canonical header"; exit 1; fi
n=$(grep -rl "$LEGACY" plugins/relay/ 2>/dev/null | wc -l)
if [ "$n" != "0" ]; then echo "FAIL: $n relay file(s) still carry the legacy header as a table row"; exit 1; fi
if ! grep -q "$LEGACY" plugins/prp-core/commands/prp-prd.md; then echo "FAIL: prp-core was modified and must not be"; exit 1; fi
if ! grep -q '^#### R-COH-REPO-UNDECLARED — every Repo cell names a declared editable member$' plugins/relay/agents/prd-reviewer.md; then echo "FAIL: rubric rule absent"; exit 1; fi
if grep -q "const HEADER_ROW = '| # | Phase | Description | Status | Parallel" scripts/validate/checks/figma-visual-first-track-phase2.test.mjs; then echo "FAIL: the pin still asserts the legacy header"; exit 1; fi
if ! grep -qi 'by column name' plugins/relay/agents/plan-writer.md; then echo "FAIL: name-based extraction not instructed"; exit 1; fi
if ! grep -q '^### The Repo column$' docs/context/architecture.md; then echo "FAIL: architecture subsection absent"; exit 1; fi
echo "PASS: content invariants hold"
```

Every branch exits non-zero on violation. The `prp-core` assertion is a positive-presence check — it fails if the untouched-reference invariant was broken.

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '17 passed, 0 failed (17 checks run)' || { echo "FAIL: expected 17 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }
node --test "scripts/**/*.test.mjs" 2>&1 | tail -20 | grep -q '^# fail 0$\|fail 0' || { echo "FAIL: corpus not green"; exit 1; }
grep -q '^| # | Phase | Description | Status | Parallel | Depends | PRP Plan |$' PRPs/prds/multi-repo-topology.prd.md || { echo "FAIL: this feature's own PRD should still be on the legacy form, proving no migration was needed"; exit 1; }
echo "PASS: suite and corpus green, and a legacy-form PRD is still on disk unmigrated"
```

The last assertion is the graceful-degradation proof: this feature's own source PRD was authored on the seven-column form and must still be there, unmodified, after the schema change.

## Acceptance Criteria

- **AC-A1 (PRD AC-13):** Given `plugins/relay/` after this phase, when searched for the legacy seven-column header as a table row, then zero occurrences remain; and given `plugins/prp-core/`, then its two occurrences are unchanged.
- **AC-A2 (PRD AC-13):** Given a PRD whose Implementation Phases table uses the legacy seven-column header, when any relay parser reads it, then every row parses correctly with `Repo` treated as empty, and no cell is misread — because cells are mapped by column name rather than ordinal position.
- **AC-A3 (PRD AC-13):** Given a PRD with a `Repo` cell naming a member absent from the target's `## Repository topology` registry, when `prd-reviewer` runs, then `R-COH-REPO-UNDECLARED` fails naming the value and the phase number; given a cell naming a `reference-only` member, then it fails naming both; and given a project with no topology section, then the check emits no row at all.
- **AC-A4 (PRD AC-13):** Given the updated regression pin, when it runs, then it asserts the template header and `prd-reviewer`'s R7 quote carry the identical canonical columns AND that no `Scope`, `Visual` or `Phase Scope` column exists — preserving the property the visual-first feature required, with neither original assertion weakened or removed.
- **AC-A5 (PRD AC-13):** Given the full suite after this phase, when `npm run validate` and the `scripts/**/*.test.mjs` corpus run, then both are green, and this feature's own source PRD remains on disk with its legacy seven-column table unmodified.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A parse site is missed and silently rejects every new-schema PRD | M | H | Task 3's VALIDATE and Level 2 both assert ZERO legacy headers remain anywhere under `plugins/relay/`, so a missed site fails the build rather than a later run |
| `plugins/prp-core/` is edited along with the rest by a broad find-and-replace | M | M | Both Task 3's VALIDATE and Level 2 assert the `prp-core` occurrence is still present; the anti-pattern is named in the Decision Gate |
| The test update is read as weakening a regression pin | M | M | The update preserves both original assertions and ADDS a direct assertion of the intent the old phrasing only proxied; the plan records it as an `EXISTING_TEST_UPDATED` lifecycle op authored by the test pair |
| The Implementer edits the test file, tripping R-X as a straight fail | M | H | The Files-to-Change row and Task 5 both mark it a test-pair task explicitly, and the Metadata carries an explicit test-file exception noting the deferral branch does not apply |
| Ordinal parsing survives somewhere and misreads a legacy row | M | H | The name-based rule is stated in the template, in the plan-writer's Step 1.2, at each command parse site and in the architecture doc; Task 2's VALIDATE asserts the old "extract the seven cells" instruction is gone |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Why `Repo` sits after `Status` and not at the end.** Appending would have made the legacy form a positional prefix of the new one, which is the safer choice for an ordinal parser. The name-based mapping rule removes that advantage entirely and buys something better: no future column insertion, anywhere in the table, can shift a cell's meaning. Placing `Repo` beside `Status` keeps the row readable — the two cells a human scans first are "how far along" and "where".

**Why the pin's intent survives the rewrite.** The test was written to prove the visual-first feature did not solve its scope-marking problem by adding a column — it used a bracket tag in the `Phase` cell instead. "Exactly seven columns" was a proxy for that. This phase adds an eighth column for an unrelated reason, so the proxy stops working while the property it stood for is unchanged. Asserting directly that no scope column exists is a stronger pin than a column count, not a weaker one.

**`plugins/prp-core/` carries the same header twice and must not be touched.** It is the upstream Wirasm PRP plugin kept on disk as reference. `docs/anti-patterns.md` names treating it as active relay code as a forbidden pattern, and a careless repository-wide replace is exactly how that happens.

*Generated: 2026-08-31*
*Approved: 2026-08-31*
*Status: IMPLEMENTED*
