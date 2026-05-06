# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md AC-3
# PLANTED: R-MOCK-ABUSE detection 1 — mocks the SUT itself.

from token_validator import TokenValidator


def test_rejects_bad_signature(mocker):
    # Mock-abuse: patches the SUT itself (TokenValidator.validate is the asserted method)
    mocker.patch('TokenValidator.validate', return_value=False)
    validator = TokenValidator(key="secret")
    result = validator.validate("token.with.bad.sig")
    # Mock-abuse compounding: the mock made the assertion meaningless
    assert result is False
