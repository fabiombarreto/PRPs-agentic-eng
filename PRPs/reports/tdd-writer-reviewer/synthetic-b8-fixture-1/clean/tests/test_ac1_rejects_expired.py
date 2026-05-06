# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/mini-prd.md AC-1
# Asserts on validate()'s public return value — observable behavior only.

import pytest


def test_validate_returns_expired_reason_for_past_exp_claim():
    pytest.skip("synthetic clean fixture — would run against a real TokenValidator implementation")
    # If this ran, it would assert:
    #   from token_validator import TokenValidator
    #   validator = TokenValidator(key="secret")
    #   token = make_token(exp=time.time() - 3600, key="secret")
    #   result = validator.validate(token)
    #   assert result.ok is False
    #   assert result.reason == "expired"
