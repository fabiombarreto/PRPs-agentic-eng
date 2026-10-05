# Auth Model Template

Canonical shape of `PRPs/auth/auth-model.md` — the human-approved, tracked
description of how a project authenticates and authorizes. Both
`auth-model-writer` and `auth-model-reviewer` reference this file as the single
authoritative source for the artifact's shape, mirroring how
`${CLAUDE_PLUGIN_ROOT}/resources/design-spec-template.md` anchors
`design-spec-writer` / `design-spec-reviewer`.

**Provenance:** this template has no upstream fork — it is relay-original.

**Keeping this file authoritative:** any change to the artifact's shape (a new
section, a new required column) must land here first, then propagate to
`auth-model-writer` and `auth-model-reviewer` as a conscious, coordinated edit.
Never let the two agents' expectations of the artifact's shape drift apart —
they must always agree with this file.

---

## Output path

`PRPs/auth/auth-model.md`

The file is tracked (committed). The sibling `PRPs/auth/auth-model-review.jsonl`
is the reviewer's append-only verdict log. The directory is created if it does
not exist. NEVER write under `.claude/` — see `docs/anti-patterns.md` ("Writing
pipeline artifacts under .claude/") and `docs/decisions.md` on the PRP artifact
path convention.

---

## Secrecy rules

- Credential values never appear in this file. Use `<placeholder>` tokens.
- Secret files (credential stores, session files, storage-state files) are
  cited by path only, per `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md`
  — never read, never quoted.
- Environment variables are recorded by NAME only, never by value.
- Every host recorded is local: loopback or a hostname the project explicitly
  declares as a local development host.

---

## Skeleton

```markdown
# Auth Model: <project name>

## Authentication Mechanisms

| Mechanism | Used for | Evidence (file:line) |
|-----------|----------|----------------------|
| <mechanism> | <what it authenticates> | <file:line> |

(a login-less shared secret presented by the client with no login request is
the `static-token` mechanism: record where the client presents it — an HTTP
header, and for browser use `localStorage` or IndexedDB with the declared
database, object store and key — and the token's source as an environment
variable NAME, never its value)

## Login Flow

1. <step> — <scriptable | not scriptable>

(one numbered flow per mechanism; mark each scriptable or not; a `static-token`
flow has no login step: state the header or browser location that carries the
token and that no login request exists; a role may also state a browser probe as
one line: the route, the authenticated-only marker as visible text or a selector,
and optionally a role marker, recorded by description, never a credential or
cookie value; prefer a marker that appears only after a successful API response
over one drawn from layout rendered from client-side state, because a
client-rendered layout can stay visible for seconds with an invalidated session;
a role may also state, as one line, a pre-authenticated target:
`pre-authenticated target: <what the origin does>; injecting code: <file:line>;
alternative local target: <url or none>`, recorded by description and never a
credential, token or cookie value, the injecting code's `file:line` being
mandatory)

## Session and Token Model

<cookie or token kind, lifetime, how expiry is detected, refresh; environment
variable names only>

## Role and Permission Matrix

| Role | Capabilities | Guard evidence (file:line) | Tenant scope |
|------|--------------|----------------------------|--------------|
| <role> | <capabilities> | <file:line> | <scope> |

## Tenant Scoping

<how requests are scoped to a tenant, or "none declared">

## Local User Creation

| Role | Creation path (declared command, endpoint, seed, or manual) | Evidence | Automatable (yes/no) |
|------|-------------------------------------------------------------|----------|----------------------|
| <role> | <path or "none declared"> | <file:line> | <yes/no> |

## Non-Automatable Items

- <SSO | MFA | captcha | email or SMS verification> — affected roles: <roles>

## Local Targets

- <http://localhost:<port> or an explicitly declared local hostname>

## Open Questions and Assumptions

| Item | Assumption or question |
|------|------------------------|
| <item> | <text> |

*Generated: <YYYY-MM-DD>*
*Status: DRAFT*
```

The nine second-level headings above are required, in this order. Every
mechanism, role and guard cites a real `file:line`; an unknown is written as
`TBD - needs validation` and listed under `## Open Questions and Assumptions`.
