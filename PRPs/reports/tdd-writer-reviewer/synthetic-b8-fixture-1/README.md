# Synthetic B8 fixture #1

Calibration target for the `tdd-reviewer` agent (B8) — exercises every rubric id of `plugins/relay/agents/tdd-reviewer.md` against known-bad and known-good inputs. Validates **AC-6** (CHANGES_REQUESTED with ≥1 finding per category) and **AC-7** (APPROVED on a clean suite) of `PRPs/prds/tdd-writer-reviewer.prd.md`.

## Layout

```
synthetic-b8-fixture-1/
├── README.md                  this file
├── dirty/
│   ├── mini-prd.md            synthetic mini-PRD with 4 ACs
│   ├── tdd-initial-suite.diff suite manifest (DRAFT)
│   └── tests/                 5 test files, one planted pathology each
└── clean/
    ├── mini-prd.md            same 4 ACs as dirty/
    ├── tdd-initial-suite.diff suite manifest (DRAFT)
    └── tests/                 4 test files, one per AC, no pathologies
```

## Synthetic SUT

Both variants validate behavior of `TokenValidator` — a hypothetical token-validation class with public method `validate(token: str) -> ValidationResult` and private helpers (`_check_signature`, `_check_expiry`). The mini-PRD's ACs constrain `validate()`'s observable behavior across four scenarios.

## Dirty variant — planted pathologies

Run `/relay-tdd-review PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/tdd-initial-suite.diff`.
Expected verdict: **CHANGES_REQUESTED** with at least one finding per id below.

| Test file | Planted id | Detection heuristic that fires |
|---|---|---|
| `tests/test_ac1_impl_leak.py` | `R-IMPL-LEAK` | Asserts on `_validate_signature` (private symbol — underscore prefix) and test name embeds the private method name |
| `tests/test_ac2_trivial.py` | `R-TRIVIAL-ASSERT` | Body contains `assert True` plus an existence-only assert (`assert validator.config is not None`) — no observable behavior assertion |
| `tests/test_ac3_mock_abuse.py` | `R-MOCK-ABUSE` (detection 1) | Mocks the SUT itself: `mocker.patch('TokenValidator.validate', ...)` |
| `tests/test_duplicate_ac1.py` | `R-DUPLICATE` | Asserts the same property as `test_ac1_impl_leak.py` with non-discriminative input variance (both use the same equivalence class) |
| `tests/test_broken_setup.py` | `R-RED-LEGITIMATE` (broken-setup branch) | Imports `from nonexistent_module import Foo` — non-zero exit + `ModuleNotFoundError` output |
| (no test file for AC-4) | `R-AC-COVERAGE` | The mini-PRD's AC-4 has zero test references in the suite |

## Clean variant — passes all rubric ids

Run `/relay-tdd-review PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/tdd-initial-suite.diff`.
Expected verdict: **APPROVED** with all rubric ids `passed: true` (or `R-RED-LEGITIMATE: passed: null` if the test framework is unavailable in B8's environment per AC-13 graceful degradation).

| Test file | Covers AC | Why it's clean |
|---|---|---|
| `tests/test_ac1_rejects_expired.py` | AC-1 | Asserts on `validate()`'s public return; uses `pytest.skip` to avoid green-pre-impl false positive |
| `tests/test_ac2_accepts_valid.py` | AC-2 | Discriminative happy path; AC reference comment present |
| `tests/test_ac3_isolated_with_protocol.py` | AC-3 | Uses a protocol/interface mock (not the concrete SUT); asserts on effect, not just call |
| `tests/test_ac4_invalid_format.py` | AC-4 | Closes the AC-coverage gap; discriminative input space |

## How to use

1. **Calibration run (operator):** invoke `/relay-tdd-review` against each variant manually (or via `Task(subagent_type="tdd-reviewer", ...)` in a calibration shell). Confirm verdicts match the table above.
2. **Regression run (post-PRD-evolution):** when `tdd-reviewer.md`'s rubric prompt is amended, re-run both variants to confirm no false-positive drift on the clean suite and no false-negative drift on the dirty suite.
3. **Phase 5 dogfood reference:** the fixture is the baseline reference for "true positive rate" and "false positive rate" measurements before exposing B8 to phoenix and sisalfa.

## Out of scope for this fixture

- Multi-framework variants (only Python+pytest in MVP).
- Quantitative mock-count thresholds (Could-item per the source PRD).
- Mutation testing or property-based test patterns.
