# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/clean/mini-prd.md AC-3
# Mocks a *protocol/interface* (KeyResolver), not the SUT (TokenValidator).
# Asserts on the *effect* (return value), not just `was_called`.

import pytest


def test_validate_rejects_token_signed_with_wrong_key_without_raising():
    pytest.skip("synthetic clean fixture — would run against a real TokenValidator implementation")
    # If this ran, it would assert:
    #   from token_validator import TokenValidator
    #   from token_validator.protocols import KeyResolver
    #   class FakeKeyResolver(KeyResolver):
    #       def resolve(self, kid): return "configured_key"
    #   validator = TokenValidator(key_resolver=FakeKeyResolver())
    #   token = make_token(exp=time.time() + 3600, key="WRONG_key")
    #   # Must not raise:
    #   result = validator.validate(token)
    #   # Effect assertion — not just `mock.was_called`:
    #   assert result.ok is False
    #   assert result.reason == "bad_signature"
