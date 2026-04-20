# Domain Areas — Stub

`relay` has no traditional business-domain areas.

The project is a meta-tool: a Claude Code plugin whose architecture is a
**pipeline of AI agents** rather than a model of a business domain. There is
no "billing", "auth", "inventory", or similar domain to split into area
files.

## Where the information you might expect here actually lives

| Looking for… | Go to |
|--------------|-------|
| How the pipeline is organized (pillars, phases) | `docs/context/architecture.md` |
| Sequence of agents in a run | `docs/domain/flows.md` |
| Vocabulary (agents, test runner, TDD track, etc.) | `docs/domain/glossary.md` |
| Rules about what the pipeline must not do | `docs/anti-patterns.md` |
| Stable decisions about the pipeline's shape | `docs/decisions.md` |

## When to add area files here

Introduce `docs/domain/areas/<area>.md` only if one of the following becomes
true:

- A pipeline stage accumulates enough distinct rules and invariants that
  keeping them inside `architecture.md` makes that file unmanageable (likely
  candidates in the future: `test-runner.md`, `tdd-track.md`,
  `approval-cycle.md`).
- `relay` gains a domain outside its own pipeline (unlikely, but possible if
  it ever tracks, e.g., user accounts or billing).

Until then, do NOT create empty or speculative area files — the
documentation system treats their presence as a signal that real rules live
inside them.
