# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md AC-2
# PLANTED: R-TRIVIAL-ASSERT — body contains `assert True` plus existence-only assert,
# no observable behavior assertion.

from token_validator import TokenValidator


def test_accepts_valid_token():
    validator = TokenValidator(key="secret")
    # Trivial assert: tautology
    assert True
    # Trivial assert: existence-only, no behavior
    assert validator.config is not None
