---
tdd: false
tdd_evidence: null
test_frameworks: []
---

# Methodology

## TDD (Test-Driven Development)

Current state: **not declared** (default).

The test writer/reviewer pair (`test-writer` + `test-reviewer`) activates when
`test_frameworks` above is non-empty — in BOTH modes. The `tdd:` value only
selects ORDERING: `tdd: true` = test-first (the pair authors before the
Implementer), `tdd: false` = test-after (the pair authors after the Implementer
+ Code Review). With `test_frameworks: []` (as here) the pair self-skips.
Heuristics MUST NOT flip these values — only a human edit or an explicit
declaration during `*init` can.

### Observed signals

None. This repository has no test suite yet — the plugin is markdown +
JSON and the Test Runner (Phase 2) is not yet implemented.

### How to activate

Not applicable for the `relay` repo itself: `relay` is the plugin, not a
target project that the plugin drives. The TDD contract is exercised
against **target** projects run through the context-builder skill, not
against this repository.

Kept at `tdd: false` with `test_frameworks: []` — the test pair self-skips for
this repo (no declared framework). This documents the contract and provides the
reference format other projects inherit when the skill processes them.

## Other methodologies

None declared. Add additional frontmatter keys here if and when the plugin
gains additional opt-in flows (e.g., BDD, mandatory pair-review,
specific branching strategy) — keeping the file additive so existing
`tdd` consumers keep working.
