# TokenValidator (synthetic mini-PRD for B8 fixture)

This mini-PRD is **synthetic** — it exists only as input to the `tdd-reviewer` agent's calibration. The "feature" it describes is a hypothetical token-validation class. No production code is implied.

## Acceptance Criteria (test scenarios)

- **AC-1 Rejects expired tokens:** Given a JWT token whose `exp` claim is in the past, when `validator.validate(token)` is called, then it returns `ValidationResult(ok=False, reason="expired")`.
- **AC-2 Accepts well-formed unexpired tokens:** Given a JWT token signed with the configured key whose `exp` claim is in the future, when `validator.validate(token)` is called, then it returns `ValidationResult(ok=True, reason=None)`.
- **AC-3 Rejects tokens with bad signatures:** Given a JWT token signed with a key other than the configured one, when `validator.validate(token)` is called, then it returns `ValidationResult(ok=False, reason="bad_signature")` and does NOT raise.
- **AC-4 Rejects malformed tokens:** Given a string that is not a valid JWT (missing dots, invalid base64), when `validator.validate(token)` is called, then it returns `ValidationResult(ok=False, reason="malformed")`.

*Status: APPROVED*
