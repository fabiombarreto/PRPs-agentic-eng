# Feature: Synthetic B8 fixture + rubric calibration (Phase 2 of tdd-writer-reviewer)

```
**Decision Gate**
- Active context: none
- Activated criteria: new fixture artifact under PRPs/reports/; calibration target for the just-shipped tdd-reviewer (B8) agent; depends on Phase 1 (B7+B8 + commands)
- Decisions found:
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/`
  - 2026-04-28 AC-6 of reviewer-coherence-layer.prd.md — synthetic TPs satisfy ≥1-TP requirement when no real-world fixture surfaces it (precedent for synthetic fixtures as rubric calibration)
- Applicable anti-patterns:
  - Padding rubric findings with synthetic-only contradictions (reviewer-coherence-layer dogfood lesson)
  - Writing TDD tests that mirror imagined implementation (the patologias the fixture deliberately plants)
- Applicable architectural rules:
  - Fixture artifacts live under `PRPs/reports/<feature>/`
  - The synthetic fixture is not part of the runtime test suite — it is reviewer training data
  - The clean variant must NOT trigger any rubric finding; the dirty variant must trigger ≥1 finding per category
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/tdd-writer-reviewer.prd.md` — Implementation Phases row 2: "Synthetic B8 fixture + rubric calibration" — Goal: produce a fixture that exercises every B8 rubric item, calibrating the rubric prompt against known-bad and known-good inputs before integrating into `/relay-execute` — Success signal: AC-6 and AC-7 pass against the fixture.

## Summary

Author the synthetic fixture at `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/` containing two complete TDD suite manifests: a **dirty** variant with one deliberate instance of each of the five pathologies (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`) plus a deliberately broken-setup test for `R-RED-LEGITIMATE`, and a **clean** variant covering all ACs of a synthetic mini-PRD without any pathology. The fixture exercises AC-6 (CHANGES_REQUESTED with ≥1 finding per category) and AC-7 (APPROVED) of the source PRD. The fixture is markdown + framework-idiomatic test code; no production code is written.

## User Story

```
As a relay maintainer wiring up the B8 rubric prompt
I want a known-bad and known-good fixture against which to manually validate the agent's behavior
So that I can confirm B8 catches every pathology before exposing it to real-world dogfood (Phase 5)
```

## Problem Statement

Without a synthetic fixture exercising every rubric category, the only way to validate B8's prompt is to wait for real-world halts — which are sparse on a well-authored corpus (precedent: 2026-04-28 reviewer-coherence-layer Phase 4 dogfood). The fixture decouples B8 prompt calibration from real-world signal frequency.

## Solution Statement

Author a self-contained directory with two PRD-and-suite pairs (dirty + clean) plus a README explaining each planted pathology and the expected B8 verdict. The dirty pair is the calibration target for AC-6; the clean pair is the calibration target for AC-7. The fixture uses Python+pytest as the canonical framework (matches the most-cited example in the source PRD's Research Summary).

## Metadata

| Key | Value |
|---|---|
| Type | Synthetic fixture under `PRPs/reports/<feature>/` |
| Complexity | Low — markdown + small Python files |
| Systems Affected | `PRPs/reports/tdd-writer-reviewer/` |
| Dependencies | Phase 1 complete (B8 agent exists to calibrate against) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/tdd-writer-reviewer.prd.md:199` (Implementation Phases row 2) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| HIGH | `PRPs/prds/tdd-writer-reviewer.prd.md` | 75–110 | AC-6 (rubric all 5 patologias) and AC-7 (clean APPROVED) — the contract this fixture validates |
| HIGH | `plugins/relay/agents/tdd-reviewer.md` | (whole file) | The rubric prompt being calibrated; fixture must exercise each id's detection heuristics |
| MED | `plugins/relay/agents/tdd-writer.md` | Phase 0–3 | The aggregate verdict shape (`SUITE_DRAFT_WRITTEN`) the dirty manifest claims |
| MED | `PRPs/prds/reviewer-coherence-layer.prd.md` | (Phase 4 dogfood references) | Precedent for synthetic fixtures as rubric calibration |

## Patterns to Mirror

### # SOURCE: PRPs/plans/completed/tdd-writer-reviewer-phase-1-agent-files-commands-mvp.plan.md (suite manifest shape from B7's Phase 3.1)

The fixture's `tdd-initial-suite.diff` files mirror the manifest shape B7 produces:
```
# TDD initial suite — phase <N>
# Source PRD: <synthetic mini-PRD path>
# Aggregate verdict: SUITE_DRAFT_WRITTEN
## AC outcomes
| AC | Outcome | Path / mapping |
| AC-1 | NEW_TEST_REQUIRED | tests/test_dirty_ac1.py |
*Status: DRAFT*
```

Used by Tasks 2 and 3.

### # SOURCE: plugins/relay/agents/tdd-reviewer.md R-IMPL-LEAK / R-TRIVIAL-ASSERT / R-MOCK-ABUSE / R-AC-COVERAGE / R-DUPLICATE / R-RED-LEGITIMATE definitions

Used by Task 2 (dirty variant). Each planted pathology must match one of the detection heuristics enumerated in `tdd-reviewer.md` so the rubric is genuinely exercised, not bypassed.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/README.md` | CREATE | Fixture index — explains dirty/clean structure, planted patologias, expected verdicts |
| `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md` | CREATE | Synthetic mini-PRD with 4 ACs that the dirty suite "covers" with planted pathologies |
| `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tdd-initial-suite.diff` | CREATE | Suite manifest pointing at the dirty test files |
| `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/` (5 files) | CREATE | One test file per pathology + a broken-setup file for R-RED-LEGITIMATE |
| `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/mini-prd.md` | CREATE | Synthetic mini-PRD with 4 ACs the clean suite covers cleanly |
| `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tdd-initial-suite.diff` | CREATE | Suite manifest pointing at the clean test files |
| `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tests/` (4 files) | CREATE | One test file per AC, no pathologies |

## NOT Building (Scope Limits)

- **Running B8 against the fixture as a CI gate** — Phase 2 ships the fixture; running B8 against it is operator action, not Phase 2 deliverable.
- **Quantitative thresholds** — the Could-item from the source PRD; deferred.
- **Multi-framework fixtures** — single Python+pytest fixture in MVP. Multi-framework expansion is post-Phase-5 work.
- **Modifying B8's rubric prompt based on calibration results** — if the fixture surfaces a B8 prompt bug, that becomes a separate fix; not inline.
- **Phase 3/4 work** — `/relay-execute` integration is Phase 3; documentation is Phase 4. No leakage.

## Step-by-Step Tasks

### Task 1: CREATE PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/README.md

- **ACTION**: write a README explaining the fixture structure (`dirty/` vs `clean/`), each planted pathology with its detection heuristic, and the expected B8 verdict for each variant. The README is the operator's manual for running B8 against the fixture.
- **MIRROR**: not applicable — README is structural scaffolding.
- **VALIDATE**: `test -f PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/README.md && grep -q 'R-IMPL-LEAK' PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/README.md && grep -q 'R-RED-LEGITIMATE' PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/README.md`

### Task 2: CREATE the dirty variant (mini-PRD + suite manifest + 6 test files)

- **ACTION**: write `dirty/mini-prd.md` with 4 ACs (AC-1 through AC-4), each a Given/When/Then statement on a synthetic SUT (e.g., `TokenValidator`). Write `dirty/tdd-initial-suite.diff` claiming `SUITE_DRAFT_WRITTEN` aggregate verdict referencing 5 test files in `dirty/tests/`. Write the 5 test files, each planting exactly one pathology:
  - `tests/test_ac1_impl_leak.py` — asserts on `_validate_signature` private method (`R-IMPL-LEAK`).
  - `tests/test_ac2_trivial.py` — `assert True; assert validator.config is not None` only (`R-TRIVIAL-ASSERT`).
  - `tests/test_ac3_mock_abuse.py` — uses `mocker.patch('TokenValidator.validate')` mocking the SUT itself (`R-MOCK-ABUSE` detection 1).
  - (no test for AC-4) — covers `R-AC-COVERAGE` gap.
  - `tests/test_duplicate_ac1.py` — duplicates `test_ac1_impl_leak.py`'s assertion target with non-discriminative input (`R-DUPLICATE`).
  - `tests/test_broken_setup.py` — imports `from nonexistent_module import Foo` (`R-RED-LEGITIMATE` broken-setup branch).
- **MIRROR**: B7's manifest shape from `plugins/relay/agents/tdd-writer.md` Phase 3.1; pathology heuristics from `plugins/relay/agents/tdd-reviewer.md` rubric definitions.
- **VALIDATE**: `test -f PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md && test -f PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tdd-initial-suite.diff && test 5 -eq $(ls PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/*.py | wc -l) && grep -q '_validate_signature' PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/test_ac1_impl_leak.py`

### Task 3: CREATE the clean variant (mini-PRD + suite manifest + 4 test files)

- **ACTION**: write `clean/mini-prd.md` with 4 ACs identical to dirty's. Write `clean/tdd-initial-suite.diff`. Write 4 test files, one per AC, each free of all 6 pathologies — discriminative assertions, no SUT mock, no mock chains, every AC referenced in a comment header, the imports point at synthetic-but-existing modules (or use `pytest.skip` to guarantee neither broken-setup nor green-pre-impl). The clean variant proves AC-7 of the source PRD: B8 returns `APPROVED` on a clean suite.
- **MIRROR**: idiomatic pytest from any pytest tutorial; no mock abuse, no implementation references.
- **VALIDATE**: `test 4 -eq $(ls PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tests/*.py | wc -l) && for f in PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tests/*.py; do grep -q 'PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/mini-prd.md AC-' "$f" || { echo "MISSING AC ref in $f"; exit 1; }; done`

### Task 4: Scope-boundary sweep

- **ACTION**: confirm no Phase 3/4 work was performed — `relay-execute.md` lines 141–154 byte-unchanged; no `documentation/` HTML modified; `plugin.json` unchanged; `docs/decisions.md` unchanged.
- **MIRROR**: same negative-space pattern as Phase 1 Task 5.
- **VALIDATE**: `git status --short | grep -vE '^(\?\?|.M) (PRPs/reports/tdd-writer-reviewer/|PRPs/prds/|PRPs/plans/)'  | wc -l | awk '$1==0{exit 0} {exit 1}'`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```sh
test -d PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty
test -d PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean
test -f PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/README.md
echo "Level 1 PASS"
```

### Level 2 — CONTENT_INVARIANTS

```sh
# Dirty variant: 5 test files, each planting one pathology
test 5 -eq $(ls PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/*.py | wc -l)
grep -q '_validate_signature' PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/test_ac1_impl_leak.py
grep -q 'assert True' PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/test_ac2_trivial.py
grep -q "patch('TokenValidator" PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/test_ac3_mock_abuse.py
grep -q 'nonexistent_module' PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tests/test_broken_setup.py

# Clean variant: 4 test files, each with AC reference, no pathologies
test 4 -eq $(ls PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tests/*.py | wc -l)
echo "Level 2 PASS"
```

### Level 3 — DRY-RUN END-TO-END

```sh
# Phase 2 scope boundary
git diff --quiet plugins/relay/.claude-plugin/plugin.json
git diff --quiet docs/decisions.md
git diff --name-only HEAD | grep -E '^documentation/.*\.html$' && exit 1 || true
git status --short | grep -E '^.M plugins/relay/commands/relay-execute.md' && exit 1 || true
echo "Level 3 PASS"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** dirty variant contains exactly one planted pathology per rubric id (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`) plus a `R-RED-LEGITIMATE` broken-setup case.
- **AC-A2 (PRD AC-7):** clean variant covers all 4 ACs of `clean/mini-prd.md` with discriminative tests, AC reference comments, no SUT mocks, no implementation leaks.
- **AC-A3 (PRD MoSCoW Won't):** no Phase 3 or Phase 4 work bleeds into Phase 2 — `relay-execute.md`, `plugin.json`, `documentation/`, `decisions.md` all unchanged.
- **AC-A4 (PRD architectural rule "no `.claude/` writes"):** all fixture files live under `PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Planted pathology too subtle to trip B8's heuristic | M | M | Each pathology is the textbook canonical example listed in `tdd-reviewer.md`'s detection heuristics |
| Clean variant accidentally trips a rubric id | M | M | Task 3 explicitly requires AC-reference comments + no-mock-of-SUT + no-private-symbol assertions |
| Fixture grows beyond MVP scope | L | L | 5 dirty + 4 clean test files; no expansion in MVP |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Phase boundary:** the fixture is reviewer training data, not a runtime suite — the relay repo's own `methodology.md` remains `tdd: false` and unchanged.

*Generated: 2026-05-06*
*Approved: 2026-05-06*
*Implemented: 2026-05-06*
*Status: IMPLEMENTED*
