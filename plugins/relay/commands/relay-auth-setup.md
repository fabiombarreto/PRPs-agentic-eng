---
description: 'Standalone interactive entry point for describing how a project authenticates and authorizes — the fourth interactivity-boundary extension, confined to this command. Adopts auth-model-writer inline (Phase A) then auth-model-reviewer inline with invocation_context: main (Phase B), never Task-dispatched. Enforces a hard local-only guard and proves the PRPs/auth secrecy ignore rules before anything is written. Produces an APPROVED PRPs/auth/auth-model.md and nothing else — no login script, no credential file. Bounded max_auth_model_review_retries=2 exhaustion offers retry-or-abort, never a silent loop. Never invoked by /relay-execute.'
argument-hint: [--base-url <local-url>] [--fresh]
---

# /relay-auth-setup

**Arguments:** `$ARGUMENTS`

---

## Your mission

Produce a human-approved, evidence-backed description of how this project
authenticates and authorizes: adopt the `auth-model-writer` role inline to
statically read the project's authentication and authorization code and write a
DRAFT `PRPs/auth/auth-model.md`, then adopt the `auth-model-reviewer` role
inline (`invocation_context: main`) to validate the DRAFT and — only after the
rubric passes AND the user gives their own explicit affirmative reply — flip it
to `APPROVED`.

**This is the fourth interactivity-boundary extension** in relay (after the PRD
pair, the Design Map pair and the Design Spec pair). It is permitted only
because this is a standalone command with a human present; it is never part of
the autonomous loop.

**This command writes no login script and no credential file.** Generating them
is a later phase of this feature that this command does not perform. The human
validation gate is unchanged by this command.

See:
- `${CLAUDE_PLUGIN_ROOT}/agents/auth-model-writer.md` — the Writer protocol you adopt in Phase A.
- `${CLAUDE_PLUGIN_ROOT}/agents/auth-model-reviewer.md` — the Reviewer protocol you adopt in Phase B.
- `${CLAUDE_PLUGIN_ROOT}/resources/auth-model-template.md` — the canonical auth model shape both agents reference.
- `${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs` — the secrecy script this command calls, never reimplements.
- `${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs` — the local-only guard script this command calls, never reimplements.
- `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` — the rules for secret files, referenced by path only.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. This command creates a
cross-cutting artifact (`PRPs/auth/auth-model.md`, consumed blindly by later
phases), extends the interactivity boundary and handles secret-adjacent paths,
so the gate is active. Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: new cross-cutting artifact creation (auth-model.md); inline writer/reviewer adoption on the interactive side of the boundary; secret-adjacent paths
- Decisions found:
  - {decision 1 — e.g. Interactivity boundary extensions are permitted only inside standalone commands}
  - {decision 2 — e.g. PRP artifacts live under PRPs/, never .claude/}
  - {decision 3 — e.g. the test-auth kit is a registered future capability scoped by the 2026-09-25 entry}
- Applicable anti-patterns:
  - Emitting secret values in run reports or logs — credential, session and storage-state files are referenced by path only
  - Treating relayed consent as the user's approval — the reviewer's main-mode flip requires the user's own explicit reply
- Applicable architectural rules:
  - Command versus agent separation — this command owns the guard and the secrecy call; the agents own judgment
  - Writer/reviewer split: the reviewer alone owns the DRAFT to APPROVED flip
- Result: PROCEED | HALT (reason)
```

The local-only guard (precondition P1) is evaluated first, on the argument text
alone, before any file of the project is read, except the hostname declaration
`PRPs/auth/local-hosts.txt`.

---

## Parse arguments

`$ARGUMENTS` may carry:

- `--base-url <url>` — optional; the base URL of the local application.
- `--fresh` — optional and combinable with `--base-url`; archives the existing
  kit files (see P5) and authors the model from scratch.

Any other argument HALTs:

> Usage: `/relay-auth-setup [--base-url <local-url>] [--fresh]`
> Example: `/relay-auth-setup --fresh`
> Example: `/relay-auth-setup --base-url http://localhost:3000`
> Unrecognized argument: `<argument>`. Nothing has been read or written.

A project declares a local development hostname, beyond the built-in loopback
names, by listing it in the tracked file `PRPs/auth/local-hosts.txt` (one bare
hostname per line). A per-run flag can never add a host.

Record `target_root` as the current working directory.

---

## Preconditions

Run in this order. HALT with a clear, actionable message on any failure; no
artifact is written and no role is adopted on HALT.

### P1 — Local-only guard

When `--base-url` is given, run, from a fenced bash block, exactly this line:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" check --root "<target_root>" --url "<base-url>"
```

On any non-zero exit, HALT:

> FAILED_NON_LOCAL_TARGET: the host of `--base-url`, as parsed from the URL
> (`<host>`), is not `localhost`, `127.0.0.1`, `::1` or a hostname declared in
> `PRPs/auth/local-hosts.txt` that resolves to loopback. The userinfo form
> `http://localhost@evil.com` and the suffix form `localhost.evil.com` are
> refused by name. `/relay-auth-setup` only ever works against a local
> application. Nothing has been written or requested.

This guard is a hard failure, never a warning. It performs no write, no network
request and no read of the project other than the hostname declaration
`PRPs/auth/local-hosts.txt`. This command makes no network request at all.

On success the command records the guard's `LOCAL_TARGET_OK: <origin>` origin as
the normalized base URL and, from the output of the following line, the verified
declared hosts:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" list-declared --root "<target_root>"
```

### P2 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the byte-exact pattern shared by every relay
command:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-auth-setup.
> No auth model has been written.

### P3 — Secrecy proven before anything is written

Run, from a fenced bash block, exactly this line:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs" ensure --root "<target_root>"
```

On any non-zero exit, HALT:

> FAILED_IGNORE_UNPROVEN: the secrecy script could not prove the
> `PRPs/auth` ignore rules. Script stderr: `<stderr>`. Nothing further was
> written.

### P4 — Collision

Inspect `PRPs/auth/auth-model.md`:

- If `--fresh` was given, run P5 and then run Phase A as if no model existed.
  This is the one exception to the halt below.
- If it ends with `*Status: APPROVED*`, HALT:

  > FAILED_AUTH_MODEL_ALREADY_APPROVED: `PRPs/auth/auth-model.md` is already
  > APPROVED. To re-author it, hand-edit its trailing `*Status:*` line back to
  > `DRAFT` and re-run `/relay-auth-setup`.

- If it is a DRAFT, skip Phase A and go straight to Phase B. Without `--fresh`,
  first ask the user once whether to review the existing DRAFT (the default, as
  before) or to re-run the writer; choosing the re-run archives the DRAFT model
  and its review log by the P5 move and then runs Phase A instead.
- If it is absent, run Phase A.

### P5 — Archive on `--fresh`

Runs only with `--fresh` (and for the DRAFT re-run choice above, which moves only
the DRAFT model and its review log).

1. Capture a UTC stamp, from a fenced bash block, exactly this line:

   ```bash
   date -u +%Y%m%dT%H%M%SZ
   ```

2. The archive directory is `archive/<stamp>/` inside the kit's ignored
   `.sessions/` directory (both relative to the kit directory, `PRPs/auth/`). The
   P3 `ensure` call has already proven that directory ignored, and it is the one
   ignore rule every kit carries: an existing kit's `.gitignore` is never
   overwritten, so a new ignore rule could not reach it.
3. Move (with `mv`, never copy-then-keep) the model, its review log, every
   `login-*.mjs` script and `login.config.json` into the archive directory, each
   only when it exists.
4. Never move, copy, read or print any other file of the ignored directory, any
   credential file, or any session, storage-state or token file, and archive
   nothing outside the kit directory.

`--fresh` then proceeds as if no model existed. The new DRAFT still needs its own
fresh, explicit approval in Phase B. A login script that carries no template
identity counts as stale; once the new model is approved,
`/relay-auth-scripts --refresh` replaces a hand-written script.

---

## Phase A — Adopt the Writer role

Follow the protocol in `${CLAUDE_PLUGIN_ROOT}/agents/auth-model-writer.md`
inline.

Execution context:

- `target_root`: the cwd.
- `auth_model_path`: `<target_root>/PRPs/auth/auth-model.md`.
- `base_urls`: the normalized origin the guard printed, as a list (empty when
  `--base-url` is absent).
- `local_hosts`: the `list-declared` output (possibly empty).

Surface any Writer halt (for example `FAILED_TEMPLATE_UNREADABLE` or
`FAILED_NON_LOCAL_TARGET`) verbatim and exit. Do not adopt the Reviewer role.

---

## Phase B — Adopt the Reviewer role

Capture the dispatch instant immediately before adopting the Reviewer role:
`date -u +%Y-%m-%dT%H:%M:%SZ`.

Follow the protocol in `${CLAUDE_PLUGIN_ROOT}/agents/auth-model-reviewer.md`
inline.

Execution context:

- `auth_model_path`: the path written by the Writer (or the existing DRAFT).
- `target_root`: the cwd.
- `review_started_at`: the instant captured immediately above.
- `invocation_context: main`. You adopt the Reviewer protocol inside this
  command's main conversation, so the user's messages reach the Reviewer
  directly and the two-condition approval gate is satisfiable here. This is the
  ONLY place the flip happens in a `/relay-auth-setup` session.

Run the Reviewer protocol: load, rubric, branch on result.

### Bounded exhaustion — `max_auth_model_review_retries = 2`

Count each `CHANGES_REQUESTED` verdict appended to
`PRPs/auth/auth-model-review.jsonl` in this session. On the first and second,
let the Reviewer's dialogue loop run. If a **third** would occur, do NOT enter
another round; instead offer:

> The auth model has not reached APPROVED after
> `max_auth_model_review_retries = 2` review rounds. What would you like to do?
> 1. **Retry with corrected inputs** — describe what should change (a different
>    base URL, an additional local host, guidance on where the auth code lives)
>    and I will re-adopt the Writer role with your correction.
> 2. **Abort** — stop here. The DRAFT is preserved at
>    `PRPs/auth/auth-model.md`; nothing is discarded.

Never silently loop past the budget, and never silently discard the DRAFT.

---

## Final output surface

On APPROVED, the last user-facing message is the Reviewer's summary, followed
by an explicit statement that no login script and no credential file has been
written and that the human validation gate is unchanged. `/relay-auth-scripts`
generates the per-role login scripts from the approved model.

On the exhaustion offer, the last message is the two-outcome prompt above. On
halt, the message explains the reason and names the DRAFT path if any.

---

## Constraints (hard rules)

- **Never write anything under `.claude/`.** Artifacts live under `PRPs/auth/`.
- **The only files written** are `PRPs/auth/.gitignore` (via the secrecy
  script), `PRPs/auth/auth-model.md` and `PRPs/auth/auth-model-review.jsonl`.
  With `--fresh`, existing kit files are relocated into the P5 archive directory,
  not rewritten.
- **Never flip without the user's own explicit affirmative reply.**
- **Never `Task`-dispatch either role.** Both are adopted inline.
- **Never invoked by `/relay-execute`.** Standalone, human-triggered.
- **No network request**, ever, from this command or its agents.
- **No credential value enters the conversation.** Secret files are referenced
  by path only.
- **Never invoke either role when a precondition failed.**
- **Never silently loop past `max_auth_model_review_retries = 2`.**

---

## What you do NOT do

- **Generate a login script or a credential file.** A later phase of this
  feature does that; this command stops at `APPROVED`.
- **Reimplement the secrecy script.** You call it.
- **Run the application or discover dynamically.** Discovery is static.
- **Be invoked by `/relay-execute`.**
- **Reopen an APPROVED auth model.** Hand-editing the trailing status line back
  to `DRAFT` is the documented escape hatch.
