# Mock Sentinel Convention

Canonical documentation of the inline mock-sentinel convention every
`phase_scope: visual` plan (Figma Visual-First Track, v2) authors
against. Two bounded token classes stand in for real data and real
business logic so a visual phase can be implemented, captured, and
blocking-gated against a deterministic diff before any logic exists —
the mechanism `PRPs/prds/figma-visual-first-track.prd.md` proposes to
avoid late, expensive rework when a wrong visual forces a redo of
logic already built on top of it.

This convention is about **marking every place a visual phase stands
in for something that will become real** — a displayed value, or an
interactive handler — so the paired logic phase has an unambiguous,
greppable ledger to resolve. It is **not** a mocking framework, a test
double library, or a runtime feature-flag mechanism; it is a plain
inline-comment convention, deliberately language-agnostic so it works
identically across every target stack relay operates in.

---

## The two sentinel classes

### `[RELAY-MOCK-DATA]`

Wraps a literal displayed value standing in for real data — anything
that would otherwise come from an API response, a database query, or
a prop threaded down from a real data source.

```js
// [RELAY-MOCK-DATA] user's display name — real source: GET /api/me
const displayName = "Jane Doe";
```

```python
# [RELAY-MOCK-DATA] order total — real source: orders.total_cents
order_total = 4999  # cents
```

### `[RELAY-MOCK-BEHAVIOR]`

Wraps a handler or interaction standing in for real business logic —
anything that would otherwise call a service, mutate state, or run a
real validation/business rule.

```js
// [RELAY-MOCK-BEHAVIOR] submit handler — real source: POST /api/orders
function handleSubmit() {
  setStatus("success"); // choreography locked here; real call added in the logic phase
}
```

```python
# [RELAY-MOCK-BEHAVIOR] checkout validation — real source: CheckoutService.validate()
def validate_checkout(cart):
    return True  # always succeeds during the visual phase
```

Both classes are plain inline comments — no special syntax, no
required tooling, no runtime dependency. Any language or framework
that supports comments can carry them.

---

## Zero side effects in the visual phase (binding)

Every `phase_scope: visual` plan is bound by a hard constraint, quoting
`PRPs/prds/figma-visual-first-track.prd.md` AC-3 verbatim:

> Given a plan with `phase_scope: visual`, when the Implementer
> executes its tasks, then no task performs a network call, persists
> data, or mutates real application state — every displayed datum and
> interactive action is wrapped in a `[RELAY-MOCK-DATA]` or
> `[RELAY-MOCK-BEHAVIOR]` sentinel; `code-reviewer` fails the diff
> otherwise.

In practice: no `fetch`/`axios`/HTTP client call, no database write,
no filesystem write, no real external side effect of any kind may
appear in a visual-phase diff. Every value on screen and every
interactive action a user can trigger must be traceable to one of the
two sentinel classes above.

---

## Swap semantics — how the paired logic phase resolves a sentinel

A `phase_scope: visual` phase is always paired 1:1 (via the source
PRD's `Depends` column) with a `phase_scope: logic` phase. The logic
phase's job is to resolve every sentinel left behind by the visual
phase:

- **Resolving `[RELAY-MOCK-DATA]`:** replace the literal mock value
  with the real data source (an API call, a query, or a prop threaded
  from a real source) at the exact sentinel site. The displayed shape
  established during the visual phase does not change — only where
  the value comes from changes.
- **Resolving `[RELAY-MOCK-BEHAVIOR]`:** fill in the real
  handler/business logic in the "middle" of the already-approved
  choreography — the timing, sequencing, and visual states (loading,
  success, error) locked in and blocking-approved during the visual
  phase are preserved; only the substance of what the handler
  actually does (the real call, the real validation, the real
  mutation) changes.

The visual phase's approved choreography is a contract the logic
phase must honor, not a scaffold it is free to redesign.

---

## Zero remaining sentinels — no deferral path (binding)

Quoting `PRPs/prds/figma-visual-first-track.prd.md` AC-5 verbatim:

> Given a `phase_scope: logic` plan paired with an already-complete
> visual phase, when the Implementer completes its tasks, then zero
> `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinels remain in the
> feature's visual-phase files — validation fails otherwise, with no
> deferral path.

And the source PRD's own Decisions Log "Sentinel deferral policy" row,
quoted verbatim by column:

> **Choice:** Never allowed — logic-phase validation requires zero
> remaining sentinels
>
> **Alternatives considered:** Allowed with a recorded justification
> (e.g. a feature flag still off)
>
> **Rationale:** Simpler and safer; no mock silently ships if the
> recording discipline lapses

There is no recorded-justification escape hatch. A sentinel of either
class still present anywhere in the feature's visual-phase files after
the logic phase completes is a hard failure — never a warning, never a
deferred item, regardless of the reason.

---

## Cross-references

- `docs/context/plan-template.md` — the `phase_scope` Metadata field
  (`visual | logic`) that gates which discipline (zero-side-effects
  emission, or sentinel-ledger resolution) applies to a given plan.
- `PRPs/prds/figma-visual-first-track.prd.md` — the source PRD this
  convention exists to satisfy (MoSCoW "Inline mock sentinel
  convention" row; AC-3; AC-5; Decisions Log "Sentinel format" and
  "Sentinel deferral policy" rows).

---

## What this convention is NOT

- **Not a mocking framework or test double library.** No import, no
  runtime dependency, no test-runner integration. It is a plain
  inline-comment convention that works identically in any language.
- **Enforcement layers, starting in Phase 3.** This file
  (`figma-visual-first-track` Phase 1, Foundations) documents the
  convention only. Zero-side-effects enforcement at plan-review time
  (`plan-reviewer`'s `R-COH-VISUAL-SCOPE-PURITY` check) shipped in
  Phase 3; the zero-remaining sentinel-ledger check (`plan-reviewer`'s
  `R-COH-SENTINEL-RESOLUTION-MISSING` check, requiring both a
  sentinel-resolution task and a VALIDATE command targeting zero
  remaining sentinels) shipped in Phase 4.
- **Not a runtime feature flag.** The sentinels never survive into a
  logic-phase diff — they are fully resolved and removed, not
  toggled on/off at runtime.
- **Not phase-number-bearing.** Per the source PRD's own "Sentinel
  format" decision, sentinels never carry a reference to the specific
  logic-phase number that will resolve them — this keeps the
  convention simple to write and avoids staleness if phases are later
  renumbered.
