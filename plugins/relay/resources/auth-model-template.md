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

## Login Flow

1. <step> — <scriptable | not scriptable>

(one numbered flow per mechanism; mark each scriptable or not)

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
