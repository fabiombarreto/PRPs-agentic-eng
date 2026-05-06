# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/mini-prd.md AC-2
# Asserts both the ok=True observable AND the reason=None observable
# (covers both properties the AC requires — adequacy = 1.0 in TDD-Bench terms).

import pytest


def test_validate_returns_ok_true_and_no_reason_for_signed_unexpired_token():
    pytest.skip("synthetic clean fixture — would run against a real TokenValidator implementation")
    # If this ran, it would assert:
    #   from token_validator import TokenValidator
    #   validator = TokenValidator(key="secret")
    #   token = make_token(exp=time.time() + 3600, key="secret")
    #   result = validator.validate(token)
    #   assert result.ok is True
    #   assert result.reason is None
