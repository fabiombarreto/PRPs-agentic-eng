# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md AC-1
# PLANTED: R-IMPL-LEAK — asserts on private symbol _validate_signature
# and test name embeds the private method name.

from token_validator import TokenValidator


def test_validate_signature_rejects_expired_via_private_helper():
    validator = TokenValidator(key="secret")
    token = "header.payload_with_past_exp.signature"
    # Implementation-leak: asserts on private helper, not public observable
    result = validator._validate_signature(token)
    assert result is False
    # Implementation-leak: counts internal calls to a specific private method
    assert validator._check_expiry.call_count == 1
