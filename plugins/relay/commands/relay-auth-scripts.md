---
description: 'Standalone, non-interactive generator of per-role login scripts, login.config.json and credentials.example.json from an APPROVED PRPs/auth/auth-model.md. Enforces the hard local-only guard and proves the PRPs/auth secrecy ignore rules before anything is written. Writes no credential value and creates no session; the operator runs each generated script at their own terminal. Never asks the user a question. Never invoked by /relay-execute.'
argument-hint: [--role <role>]...
---

# /relay-auth-scripts

**Arguments:** `$ARGUMENTS`

---

## Your mission

Generate one login script per role from the approved auth model: derive
`PRPs/auth/login.config.json` from the model's evidence, copy the packaged login
script template once per role, and write a placeholder-only
`PRPs/auth/credentials.example.json`.

**This command creates no session, stores no credential value and never asks the
user a question.** Generation is gated on the auth model being `APPROVED` — the
command that produces `PRPs/auth/auth-model.md` stops at `APPROVED` and writes
no script. The human validation gate is unchanged by this command.

See:
- `${CLAUDE_PLUGIN_ROOT}/resources/auth-login.template.mjs` — the per-role login script template you copy, never rewrite.
- `${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs` — the local-only guard this command calls, never reimplements.
- `${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs` — the secrecy script this command calls, never reimplements.
- `${CLAUDE_PLUGIN_ROOT}/resources/auth-model-template.md` — the canonical auth model shape whose sections you read.
- `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` — the rules for secret files, referenced by path only.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command creates new
artifacts from a cross-cutting model, handles secret-adjacent paths and enforces
a permanent hard constraint, so the gate is active. Emit the canonical six-line
shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: generation of login scripts and a config from an approved model; secret-adjacent paths; the local-only hard constraint
- Decisions found:
  - {decision 1 — e.g. the test-auth kit is a registered future capability scoped by the 2026-09-25 entry}
  - {decision 2 — e.g. PRP artifacts live under PRPs/, never .claude/}
  - {decision 3 — e.g. gating and declaration inputs are explicit human-authored files, never flags or heuristics}
- Applicable anti-patterns:
  - Emitting secret values in run reports or logs — secret files are referenced by path only
  - Relying on interactive permission prompts in the autonomous loop — this command is standalone
- Applicable architectural rules:
  - Command versus agent separation — this command owns the file writes and the preconditions
  - Graceful degradation, except the local-only guard, which is a hard failure by design
- Result: PROCEED | HALT (reason)
```

---

## Parse arguments

`$ARGUMENTS` may carry:

- `--role <role>` — optional and repeatable; restricts generation to the named
  roles (kebab-case slugs).

Any other argument HALTs:

> Usage: `/relay-auth-scripts [--role <role>]...`
> Example: `/relay-auth-scripts --role admin`
> Unrecognized argument: `<argument>`. Nothing has been read or written.

Record `target_root` as the current working directory.

---

## Preconditions

Run in this order. HALT with a clear, actionable message on any failure; nothing
is written on HALT.

### P1 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the byte-exact pattern shared by every relay
command:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-auth-scripts.
> No script has been written.

### P2 — The auth model is APPROVED

`PRPs/auth/auth-model.md` must exist and end with `*Status: APPROVED*`. Otherwise
HALT:

> FAILED_AUTH_MODEL_NOT_APPROVED: `PRPs/auth/auth-model.md` is missing or is not
> APPROVED. No login script and no credential file is generated before the auth
> model is approved. Nothing has been written.

### P3 — Local-only guard

Read every URL under the model's `## Local Targets`. If none is found, HALT:

> FAILED_LOCAL_TARGET_MISSING: `PRPs/auth/auth-model.md` records no URL under
> `## Local Targets`. Nothing has been written.

For each URL, run, from a fenced bash block, exactly this line:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" check --root "<target_root>" --url "<base-url>"
```

On any non-zero exit, HALT:

> FAILED_NON_LOCAL_TARGET: the guard refused `<base-url>`. Guard stderr:
> `<stderr>`. The guard is a hard failure, never a warning. Nothing has been
> written and nothing has been requested.

The declared local hostnames, beyond `localhost`, `127.0.0.1` and `::1`, come
only from the tracked file `PRPs/auth/local-hosts.txt` (one bare hostname per
line). There is no flag for them.

### P4 — Secrecy proven before anything is written

Run, from a fenced bash block, exactly this line:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs" ensure --root "<target_root>"
```

On any non-zero exit, HALT:

> FAILED_IGNORE_UNPROVEN: the secrecy script could not prove the
> `PRPs/auth` ignore rules. Script stderr: `<stderr>`. Nothing further was
> written.

---

## Phase A — Generate

For each role in the model's `## Role and Permission Matrix` (slug: lowercase
kebab-case, de-duplicated, matching `^[a-z0-9][a-z0-9-]{0,39}$`; `--role`
filters), derive a config entry using the exact schema documented in the header
of `${CLAUDE_PLUGIN_ROOT}/resources/auth-login.template.mjs`:

- `mechanism` is `headed` when the role is named under `## Non-Automatable Items`
  for SSO or MFA, `static-token` when `## Login Flow` or
  `## Authentication Mechanisms` names a shared static token presented with no
  login request, `api` when `## Login Flow` names a scriptable API login
  endpoint, otherwise `form`.
- For a `static-token` role the `staticToken` block is filled only from the
  model's evidence: `tokenEnv` is an environment-variable NAME taken from
  `## Session and Token Model` (else null), `header` and `valuePrefix` come from
  where the API expects the token, and `browser` comes from the declared storage
  location (`localStorage`, or `indexedDB` with the declared database, object
  store and key) and is otherwise null. Every field the model does not state is
  the literal `TBD - needs validation`, never a guess. The generated script's own
  halts for this mechanism are `FAILED_TOKEN_UNPROVEN`,
  `FAILED_TOKEN_LOCATION_UNREACHABLE` and `FAILED_INDEXEDDB_UNSUPPORTED`.
- `browserProbe` is filled only when `## Login Flow` states a browser probe for
  the role: a same-origin route and an authenticated-only marker (visible text or
  a selector), optionally a role marker. Otherwise it is absent (null). A route
  stated without a marker, or a marker whose text or selector the model does not
  give, is written as the literal `TBD - needs validation` so the generated
  script halts `FAILED_LOGIN_CONFIG_INCOMPLETE` naming the field; never a guessed
  selector or text. A declared browser probe is the role's proof for `form`,
  `api` and `headed` (the HTTP `probe` is then not consulted); a `static-token`
  role keeps `FAILED_TOKEN_UNPROVEN` and may also declare one. The generated
  script's own halts for the probes are `FAILED_PROBE_NOT_PROTECTED`,
  `FAILED_PROBE_WRONG_ACCOUNT` and `FAILED_PROBE_PAGE_UNLOADABLE`.
- Every other field is filled only from evidence in the model and is otherwise
  the literal `TBD - needs validation` — never a guessed selector or path.
- `credentials` holds environment-variable NAMES only, taken from the model's
  `## Session and Token Model` when it names them, else null.
- `userCreation.command` is set only when `## Local User Creation` names a
  declared command for the role, else null.

Merge into `PRPs/auth/login.config.json` additively: an existing role entry is
never overwritten and an existing `baseUrl` is kept; write `baseUrl` from the
first `## Local Targets` URL when absent.

For each role write `PRPs/auth/login-<role>.mjs` by `Read`-ing
`${CLAUDE_PLUGIN_ROOT}/resources/auth-login.template.mjs` and replacing every
occurrence of `__RELAY_ROLE__` with the slug — no other substitution and no edit.
An existing script is skipped and reported, never overwritten.

Write `PRPs/auth/credentials.example.json` with placeholder values only when
absent:

```json
{ "<role>": { "username": "<placeholder>", "password": "<placeholder>" } }
```

Use the `Write` tool (heredocs through Bash do not work in this environment).

---

## Final output surface

Report, per role:

- the exact run line, to be run by the operator at their own terminal, where any
  credential prompt happens: `node PRPs/auth/login-<role>.mjs --plugin-root "${CLAUDE_PLUGIN_ROOT}"`;
- the config fields still `TBD - needs validation` (each script halts on them);
- the value the visual track consumes: `auth_mode: storage-state:PRPs/auth/.sessions/<role>.json`.

Close with an explicit statement that no session and no credential value was
created and that the human validation gate is unchanged. On halt, the message
explains the reason and states that nothing was written.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Artifacts live under `PRPs/auth/`.
- **The only files written** are `PRPs/auth/login.config.json`,
  `PRPs/auth/login-<role>.mjs` and `PRPs/auth/credentials.example.json`.
- **Never write** `PRPs/auth/credentials.json`, anything under
  `PRPs/auth/.sessions/`, or any `*.storage-state.json` or `*.session.json`.
- **Never invoked by `/relay-execute`.** Standalone, human-triggered.
- **No network request**, ever, from this command.
- **No credential value enters the conversation.** Secret files are referenced
  by path only.
- **Never `Task`-dispatch anything.**
- **Never ask the user a question.** Unresolved fields are written as
  `TBD - needs validation`.
- **Nothing is written before the approval check (P2), the guard (P3) and the
  secrecy proof (P4) have passed.**

---

## What you do NOT do

- **Create a session or run a generated script.** The operator does that.
- **Store a real credential, username or token**, anywhere, in any file.
- **Reimplement the guard or the secrecy script.** You call them.
- **Edit the script template while copying it.** One substitution only.
- **Overwrite an existing role entry or an existing script.**
- **Run the application or discover dynamically.** Generation is static.
