# Redaction Policy

Canonical list of patterns the Test Runner (component A4 + B6) applies
when capturing stdout/stderr/logs into `PRPs/reports/<feature>/`. Secret
values present in test output are replaced with `[REDACTED]` markers
before being written to the versioned report that travels with the PR.

This policy is about **output redaction** — what to hide when writing
reports. It is **not** about secret injection (how secrets reach the
test container in the first place); that is a separate concern.

---

## Layer 1 — Invariant defaults (applied to every project)

### Env var names — wildcards (case-insensitive)

Any env var whose name matches one of these patterns → its value is
redacted wherever it appears in captured output.

- `*KEY*`
- `*TOKEN*`
- `*SECRET*`
- `*PASSWORD*`
- `*PASSWD*`
- `*CREDENTIAL*`
- `*PRIVATE*`
- `*SIGNING*`
- `*AUTH*`

### Env var names — exact matches

Specific env vars that carry connection strings with embedded
credentials, or paths worth protecting for opsec reasons.

- `DATABASE_URL`
- `DB_URL`
- `REDIS_URL`
- `MONGODB_URI`
- `KAFKA_BROKERS`
- `AMQP_URL`
- `GOOGLE_APPLICATION_CREDENTIALS` (path to service-account JSON; path
  itself reveals system layout)

Matched URL values are replaced with `[REDACTED_URL]` wholesale. No
attempt at parse-and-partial redaction — fragile under edge cases
(special characters in passwords, non-standard port syntax, etc.).

### Value regex — well-known secret formats

Applied to every captured line regardless of env var context. Catches
secrets that leak outside env vars (hardcoded in config, printed by
libraries, etc.).

| Source | Pattern |
|--------|---------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| Stripe live | `sk_live_[A-Za-z0-9]{24,}` |
| Stripe test | `sk_test_[A-Za-z0-9]{24,}` |
| GitHub classic PAT | `ghp_[A-Za-z0-9]{36}` |
| GitHub fine-grained PAT | `github_pat_[A-Za-z0-9_]{82}` |
| JWT | `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` |
| PEM private key header | `-----BEGIN [A-Z ]+PRIVATE KEY-----` |
| OpenAI API key | `sk-[A-Za-z0-9]{48}` |
| Anthropic API key | `sk-ant-[A-Za-z0-9_-]{95,}` |
| Google API key | `AIza[0-9A-Za-z_-]{35}` |
| Google OAuth2 access token | `ya29\.[A-Za-z0-9_-]{10,}` |
| Google OAuth2 client secret | `GOCSPX-[A-Za-z0-9_-]{28,}` |

---

## Layer 2 — Per-project extensions

Each target project gets a file at `PRPs/redaction-extensions.txt`,
created empty by the context-builder during `*init`. The team adds:

- Extra env var names (exact or glob) whose values must be redacted.
- Extra value regex for project-specific secret formats.

Format — one entry per line, comments with `#`:

```
# Env var names (exact or glob):
PHOENIX_AUTH_PROXY_SECRET
LEGACY_*_API

# Value regex — prefix with `regex:`
regex:phoenix-[a-f0-9]{32}
```

The extensions file is versioned in git alongside the project's other
config. Loading order: Layer 1 defaults first, then Layer 2
extensions — either can add new rules; neither can remove rules from
the other.

---

## Layer 3 — Known-informative-but-not-secret (documented, not redacted)

Some values are sensitive-ish but NOT redacted by default because
redacting them breaks debugging without adding meaningful security.
Documented here so teams can opt-in via Layer 2 if they decide
otherwise:

- Service account JSON non-key fields: `client_email`, `project_id`,
  `client_id`. Reveal GCP project metadata; do not expose credentials
  by themselves. Add to `PRPs/redaction-extensions.txt` if your team
  considers project layout sensitive.
- Git commit hashes, build IDs, internal hostnames in CI. Useful for
  debugging; rarely secret.

---

## How the Test Runner applies this

1. **At test execution (A4 / B6):** env vars matching Layer 1 wildcards
   or exact matches have their values recorded in a runtime
   redaction table. Values are replaced in any captured line before
   the line is written to any file under `PRPs/reports/<feature>/`.
2. **After execution (B6 filter):** the full captured output is
   re-scanned with the Layer 1 value regex set AND any Layer 2 regex
   entries. Additional matches are replaced.
3. **Report footer:** every `final-report.md` carries a
   `secrets_redacted` section showing count + category breakdown —
   the human knows *what* was hidden even without seeing the values:

   ```
   secrets_redacted:
     count: 7
     categories:
       env_names: 5
       url_values: 1
       regex_matches: 1
   ```

4. **If zero redactions happened**, the section still appears with
   `count: 0` — absence is informative (tests didn't produce sensitive
   output at all).

---

## URL handling (special case)

Connection strings like `postgres://user:pass@host:5432/db` are
replaced whole: `[REDACTED_URL]`. Not parse-and-partial-redacted.

Rationale: URL parsers struggle with passwords containing special
characters (`!`, `@`, `:`, `/`, `#`, `?`, `=`). A parse failure that
emits the raw URL = leak. Going integral on the redaction is the safe
default. If a team needs to see the host for debugging, they can
re-run the suite manually outside the autonomous pipeline — the raw
logs there are not written to a versioned report.

---

## What this policy is NOT

- **Not a replacement for proper secret management.** Secrets must
  still be injected via `.env` / vault / compose secrets, NOT hardcoded
  in source. This policy catches accidental leaks into test output; it
  doesn't legitimize any sloppy handling upstream.
- **Not a policy for source-code scanning.** pre-commit secret scanners
  (trufflehog, gitleaks) are complementary — they prevent secrets from
  entering the repo; this policy prevents captured output from
  containing them in reports. Both are needed.
- **Not about blocking tests from using secrets.** Tests legitimately
  need credentials to hit sandbox APIs. This policy never blocks
  access — it only redacts captured output.
