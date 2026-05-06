# TokenValidator (synthetic mini-PRD for B8 fixture — clean variant)

Same 4 ACs as `dirty/mini-prd.md`. Reproduced here so the clean variant is self-contained.

## Acceptance Criteria (test scenarios)

- **AC-1 Rejects expired tokens:** Given a JWT token whose `exp` claim is in the past, when `validator.validate(token)` is called, then it returns `ValidationResult(ok=False, reason="expired")`.
- **AC-2 Accepts well-formed unexpired tokens:** Given a JWT token signed with the configured key whose `exp` claim is in the future, when `validator.validate(token)` is called, then it returns `ValidationResult(ok=True, reason=None)`.
- **AC-3 Rejects tokens with bad signatures:** Given a JWT token signed with a key other than the configured one, when `validator.validate(token)` is called, then it returns `ValidationResult(ok=False, reason="bad_signature")` and does NOT raise.
- **AC-4 Rejects malformed tokens:** Given a string that is not a valid JWT (missing dots, invalid base64), when `validator.validate(token)` is called, then it returns `ValidationResult(ok=False, reason="malformed")`.

*Status: APPROVED*
