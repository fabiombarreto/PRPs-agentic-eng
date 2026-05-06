# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md AC-1
# PLANTED: R-DUPLICATE — duplicates test_ac1_impl_leak.py's assertion target
# with non-discriminative input variance (same equivalence class: "expired token").

from token_validator import TokenValidator


def test_validate_signature_rejects_another_expired():
    validator = TokenValidator(key="secret")
    # Same equivalence class as test_ac1_impl_leak.py (both: expired token)
    token = "header.different_past_exp.signature"
    result = validator._validate_signature(token)
    # Same assertion target as test_ac1_impl_leak.py, no discriminative input
    assert result is False
