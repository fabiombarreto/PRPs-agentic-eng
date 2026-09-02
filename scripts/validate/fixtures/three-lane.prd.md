# Fixture: three independent lanes (POSITIVE)

Test input for the `lane-fixture` validation check. Not a real PRD: it lives
under `scripts/validate/fixtures/`, beside the suite that reads it, and never
under `PRPs/prds/` where the pipeline looks for work.

It is the worked example from `plugins/relay/resources/lane-model.md`, expressed
in the real canonical Implementation Phases table shape so the derivation is
exercised against the schema the pipeline actually uses rather than a convenient
one. Rows 1, 2 and 3 have no dependencies; rows 4 and 5 both depend on 1.

**Expected outcome:** exactly three lanes — {1, 4, 5}, {2} and {3} — with zero
refusals. Rows 4 and 5 share a lane with row 1 despite having no edge to each
other, because both attach to 1 and a lane is a *weakly*-connected component.

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Alpha | independent chain head | pending | - | - | - | - |
| 2 | Bravo | independent, alone | pending | - | - | - | - |
| 3 | Charlie | independent, alone | pending | - | - | - | - |
| 4 | Delta | attaches to 1 | pending | - | - | 1 | - |
| 5 | Echo | attaches to 1, not to 4 | pending | - | - | 1 | - |
