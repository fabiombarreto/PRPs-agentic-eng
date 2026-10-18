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

### Credential stores, session files and storage-state paths

The test-auth kit holds credentials and logged-in sessions that can impersonate
a test account. A transcript, a prompt and a log are all leak surfaces, so these
artifacts follow a stricter rule than the value regexes above.

- **Referenced by path only.** `PRPs/auth/credentials.*` (except the tracked
  placeholder `credentials.example.*`), `PRPs/auth/.sessions/` and any
  `*.storage-state.json` or `*.session.json` file are never read into an
  agent's context, never quoted, and never embedded in a report. Only the path
  is written.
- **Redact wholesale when encountered anyway.** If such a file's content
  appears (an evidence artifact, a captured log, a response body), its values
  are replaced with `[REDACTED]`: every cookie `value`, every `localStorage`
  entry value of a Playwright storage-state file (its top-level keys are
  `cookies` and `origins`), every `password` or `token` field, and the values
  of the `Cookie`, `Set-Cookie` and `Authorization` headers.
- **Applies to later auth-kit evidence and Test Runner output alike.**
- **Path presence is informative.** A report may name a session file's path,
  and `git check-ignore` output may be shown, but never the file's content.

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

## QA runner evidence: session values, snapshots, screenshots and personal data

The QA runner keeps its own redaction table in memory and writes evidence under
`PRPs/reports/<feature>/qa-run/<run-id>/`. Substring redaction is only as
precise as the values registered, and a snapshot or a screenshot can show data
no table knows. This section states what the runner registers, why, and what
keeps the rest out of git.

### Session values are registered source-first

Registering every string of a saved session corrupts the evidence the operator
reads: on a recorded run `localhost`, `false` and `MIDDLE` became `[REDACTED]`
inside 23 URLs. The runner therefore registers a session value by its source:

- **Always registered** (any entropy; the table's absolute 4-character minimum
  still applies): the token artifact, the cookie the role declares as its
  `sessionCookie`, the cookie named by each `api_origins` entry, env values
  selected by Layer 1 or Layer 2 names, `redact: true` captures and
  `redact_columns` values.
- **Registered above a floor**: every other cookie, `localStorage` and
  IndexedDB string, record keys included, only when it is at least
  12 characters long and has a Shannon entropy of at least
  3.0 bits per character.
- **Never registered**: a part of the target origin (scheme, host, port, host
  and port, the origin or a URL on it) and short literals such as `true`,
  `false`, `null` and small integers (the length gate refuses them).

The floor is a judgment, not a measurement. No scanner documents a minimum
length (detect-secrets documents entropy limits of 4.5 for base64 and 3.0 for
hex, gitleaks an example of 3.5). The numbers are calibrated on the recorded
values of a real scan, whose six non-secrets were all shorter than the floor
and below its entropy.

**Failure mode.** A short or low-entropy secret held by a cookie nobody
declared is not masked by value. Four things back it: the Layer 1 value
regexes; the structural masking of every cookie and `localStorage` `value`
field and of every secret-named property in each JSON evidence file; the
ignore rule below; and the secrecy scan of the dogfood. The remedy is to
declare such a cookie as `sessionCookie` or in `api_origins`, or to add a
`regex:` line to `PRPs/redaction-extensions.txt`.

### Snapshots, screenshots and personal data

An accessibility snapshot lists locator names and visible text, a screenshot
is pixels, and a response or row body is whatever the application returned for
the test account. Any of them can hold personal data (a task title, a person's
name, an e-mail address) that no secret table recognizes.

- **What the runner withholds.** A snapshot entry that carries a registered
  secret, an e-mail address or a `regex:` match is withheld, and a screenshot
  is withheld (redacted text is written instead) when the page text carries a
  registered secret. The runner cannot recognize free-text personal data.
- **Where the evidence lives.** Every grounding snapshot, screenshot,
  redacted-text file and evidence body lives under the run directory's
  `grounding/` and `evidence/`. The run's own `.gitignore` ignores both. It is
  written through the runner's single write helper and proven with
  `git check-ignore -q` for a path of each kind before anything is written.
  `results.json` and `plan.json` stay tracked and hold no page text and no
  input value.
- **When the proof does not hold.** With git present and the proof unproven,
  the runner halts `FAILED_IGNORE_UNPROVEN` and writes no snapshot and no
  screenshot. When the run directory is not inside a git work tree, nothing
  there can be committed and the proof is recorded as `not-applicable`.
- **Input values.** An input value asserted by the runner is never written,
  only the result of the comparison: the evidence names which comparison ran
  and whether it passed, and the final screenshot masks the located field, so
  the value reaches no evidence file, no result, no reason and no terminal line.
- **Post-interaction snapshots.** A snapshot written after the `ground` mode replayed
  a prefix of `goto`, `click` and `fill` steps lives under `grounding/` beside the plain
  snapshot of its route and is withheld by the same rules, entry by entry. A prefix
  locator that names a withheld value is refused before the browser starts. The recorded
  `prefix` holds no typed value, only a SHA-256 digest, never in clear, and `ground`
  prints the value on no terminal line and writes it to no other file. The `entries`
  are page text read after the interaction, so they can echo a typed value the page
  renders back: an entry is withheld only for a registered secret, an e-mail address or
  a `regex:` match, and a typed value is not registered. That value comes from the
  report's own steps, which the report file already holds, and the snapshot sits under
  the run directory's ignored `grounding/`, whose ignore rule is proven before it is
  written.
- **Observed requests.** An `expect_requests` step watches the requests the page issues,
  and the runner reads nothing from a request but its method and its URL: never a header,
  a cookie, a token or a body. For each request that matches the step the evidence file
  records the method, the host and the path (at most 50 are listed, the observed count
  staying exact), with the query string and the fragment dropped in memory, and the
  expected and observed counts. A registered secret that
  appears in a path is masked like any evidence string, but a path can still carry an
  identifier or a name the table does not recognize, so the file lives under the run
  directory's ignored `evidence/`, whose ignore rule is proven before anything is
  written, and for the step `results.json` carries only the result, the counts of a
  failing reason and the path of that file.

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
