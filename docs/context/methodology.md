---
tdd: false
tdd_evidence: null
test_frameworks: ["node:test"]
docs_sync: true
lane_runtime_safe: false
formatter_cmd: null
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

## Docs Sync

Current state: **true** (default) — `docs_sync: true` in the
frontmatter above is the per-project master switch that gates
automated `docs/` knowledge-base synchronization by the
`docs-updater` / `docs-reviewer` pair. Both `/relay-implement`
(Phase 2) and `/relay-approve` (Phase 3) now read `docs_sync`:
`docs-updater` records it in the manifest's effective-configuration
header, and each command wires its own skip logic — self-skipping
its respective docs cycle when `docs_sync_enabled == false`.

`docs_sync` governs BOTH the implement-time and approve-time docs
cycles. Setting `docs_sync: false` disables automated docs sync for
this project entirely — the docs-updater/docs-reviewer pair will
self-skip in both commands. `--no-docs` is a separate, per-invocation
override, shipped on both `/relay-implement` and `/relay-approve` —
it overrides `docs_sync` for a single run without changing the
persisted project-level default.

### How to override

1. Change `docs_sync: true` to `docs_sync: false` above to disable
   automated docs sync for this project. This is a manual human edit
   to this file — `context-builder` never produces a `false` value
   itself.
2. Heuristics MUST NOT flip this value — only a human edit can.
   `context-builder` `*init` always emits the deterministic default
   `docs_sync: true` (never heuristically inferred); `*update`
   preserves an existing value untouched and backfills
   `docs_sync: true` only when the key is entirely absent — never
   flipping a set value to `false`, mirroring the `tdd` preservation
   precedent above.

## Formatter

Current state: **not declared** (default) — `formatter_cmd: null` in the
frontmatter above means no project formatter command has been declared.
Later phases of `test-formatting-prevention-preflight` (2 Prevention in
`/relay-write-test`, 3 Preflight in `/relay-implement`) read this key to
scope a formatter invocation to test files before the R-X inspection
window opens.

### How to override

1. Change `formatter_cmd: null` to `formatter_cmd: "<command string>"`
   above to declare the project's formatter command. This is a manual
   human edit to this file — `context-builder` never produces a non-null
   value itself.
2. Heuristics MUST NOT flip this value — only a human edit can.
   `context-builder` `*init` always emits the deterministic default
   `formatter_cmd: null` (never heuristically inferred from
   `package.json` `scripts.format`, installed devDependencies, or config
   files); `*update` preserves an existing value untouched and backfills
   `formatter_cmd: null` only when the key is entirely absent — never
   flipping a set value.

## Other methodologies

None declared. Add additional frontmatter keys here if and when the plugin
gains additional opt-in flows (e.g., BDD, mandatory pair-review,
specific branching strategy) — keeping the file additive so existing
`tdd` consumers keep working.
