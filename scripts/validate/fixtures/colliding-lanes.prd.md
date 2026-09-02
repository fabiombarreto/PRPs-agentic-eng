# Fixture: colliding lane labels (NEGATIVE — this fixture MUST fail derivation)

Test input for the `lane-fixture` validation check. Not a real PRD: it lives
under `scripts/validate/fixtures/`, beside the suite that reads it, and never
under `PRPs/prds/` where the pipeline looks for work.

Row 2 depends on row 1, so the `Depends` graph places both in a single derived
lane. Row 1 nevertheless declares `lane:alpha` and row 2 declares `lane:beta` —
an attempt to SPLIT a lane the graph connected. The `Parallel` override is
one-directional: it may merge lanes, never split one.

**Expected outcome:** derivation returns a refusal whose code is
`FAILED_LANE_SPLIT_FORBIDDEN`.

**A run in which this fixture PASSES is a defect in the gate, not a success.**
Do not "repair" a failing suite by relaxing this fixture, removing a label, or
deleting the file. This repository removed three guards in a single day that
could only ever pass; this fixture exists so that this gate is not the fourth.
If it stops refusing, the derivation has lost the ability to refuse at all, and
the fix belongs in the derivation.

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Alpha | chain head, labelled alpha | pending | - | lane:alpha | - | - |
| 2 | Bravo | depends on 1, labelled beta | pending | - | lane:beta | 1 | - |
