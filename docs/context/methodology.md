---
tdd: false
tdd_evidence: null
test_frameworks: ["node:test"]
---

# Methodology

## TDD (Test-Driven Development)

Current state: **test-after** — `test_frameworks: ["node:test"]` declares the
Node built-in test runner; `tdd: false` selects test-after ordering.

The test writer/reviewer pair (`test-writer` + `test-reviewer`) activates when
`test_frameworks` above is non-empty — in BOTH modes. The `tdd:` value only
selects ORDERING: `tdd: true` = test-first (the pair authors before the
Implementer), `tdd: false` = test-after (the pair authors after the Implementer
+ Code Review). With `test_frameworks: ["node:test"]` (as here) the pair is
ACTIVE in test-after mode. Heuristics MUST NOT flip these values — only a human
edit or an explicit declaration can.

### Observed signals

The `validation-suite` feature (2026-07-12) introduces the repo's first Node/ESM
test surface — `scripts/validate/**/*.test.mjs` run via `node --test`. This
declares `node:test` as the framework; the relay test-writer/test-reviewer pair
authors and maintains those tests test-after (after the Implementer + Code
Review). R-X strict is preserved: the Implementer authors ZERO test files.

### How to activate

Already active for the `validation-suite` work: the repo now self-hosts a test
surface (`scripts/validate/`). Because a framework is declared, the relay test
pair authors and maintains the checker unit tests — the Implementer never authors
them (R-X strict). Ordering is test-after (`tdd: false`): Implementer + Code
Review land production code first, then the pair authors the tests, then
`/relay-test` runs them.

Resolved from the `validation-suite` PRD Open Question #5 on 2026-07-12: having
the Implementer author the checkers' own tests directly conflicts with R-X strict
(`docs/decisions.md` [2026-05-06], [2026-07-10]); declaring the framework routes
test authorship through the compliant mechanism.

## Other methodologies

None declared. Add additional frontmatter keys here if and when the plugin
gains additional opt-in flows (e.g., BDD, mandatory pair-review,
specific branching strategy) — keeping the file additive so existing
`tdd` consumers keep working.
