# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/mini-prd.md AC-4
# Discriminative input space across multiple malformed cases (not constant-input).

import pytest


@pytest.mark.parametrize("bad_token", [
    "",                          # empty
    "not.a.jwt",                 # malformed base64 segments
    "only-one-dot",              # missing segment
    "header.payload",            # missing signature segment
])
def test_validate_returns_malformed_for_non_jwt_strings(bad_token):
    pytest.skip("synthetic clean fixture — would run against a real TokenValidator implementation")
    # If this ran, it would assert:
    #   from token_validator import TokenValidator
    #   validator = TokenValidator(key="secret")
    #   result = validator.validate(bad_token)
    #   assert result.ok is False
    #   assert result.reason == "malformed"
