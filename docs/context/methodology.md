---
tdd: false
tdd_evidence: null
test_frameworks: []
---

# Methodology

## TDD (Test-Driven Development)

Current state: **not declared** (default).

The TDD track (agents B7 TDD Writer and B8 TDD Reviewer) activates only
when `tdd: true` in the frontmatter above. Heuristics MUST NOT flip this
value — only a human edit or an explicit user declaration during
`*init` can.

### Observed signals

None. This repository has no test suite yet — the plugin is markdown +
JSON and the Test Runner (Phase 2) is not yet implemented.

### How to activate

Not applicable for the `relay` repo itself: `relay` is the plugin, not a
target project that the plugin drives. The TDD contract is exercised
against **target** projects run through the context-builder skill, not
against this repository.

Kept at `tdd: false` to document the contract and provide the reference
format other projects will inherit when the skill processes them.

## Other methodologies

None declared. Add additional frontmatter keys here if and when the plugin
gains additional opt-in flows (e.g., BDD, mandatory pair-review,
specific branching strategy) — keeping the file additive so existing
`tdd` consumers keep working.
