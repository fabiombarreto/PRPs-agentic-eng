# Feature: formatter_cmd contract (Phase 1 of test-formatting-prevention-preflight)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions (methodology-frontmatter key contract precedent); cross-cutting patterns (contract spans context-builder skill, docs/context/methodology.md, validation suite); reuse or creation of components (reusing the docs_sync/figma_track emit-preserve-backfill shape for a new key)
- Decisions found:
  - [2026-04-19] `docs/decisions.md:270-276` — Methodology declaration lives in `docs/context/methodology.md`, a dedicated YAML-frontmatter file that is the single source of truth; additive keys may be added without breaking existing consumers; default-false/no-heuristic-flip is the load-bearing discipline `formatter_cmd` inherits.
  - [2026-07-09] `docs/decisions.md:680-688` — Validation commands (Level 1-3, per-task `VALIDATE`) must carry real exit-code semantics; the `<check> && echo PASS || echo FAIL` idiom is forbidden. Governs this plan's own Validation Commands section.
  - [2026-04-25] `docs/decisions.md:279-284` — Plan filenames carry the source PRD phase number and slug (`PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`). Governs this plan's own filename.
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" (`docs/anti-patterns.md:89-94`) — `formatter_cmd` must never be inferred from `package.json` `scripts.format`, installed devDependencies, or config files; that fallback is runtime discovery inside a later phase's command, never a value written back into `methodology.md`.
  - "Injecting plugin defaults into the target project's `decisions.md`" (`docs/anti-patterns.md:52-58`) — this phase does NOT add a `docs/decisions.md` entry; that is explicitly Phase 5 scope ("Docs + release").
  - "Writing pipeline artifacts under `.claude/`" (`docs/anti-patterns.md:61-67`) — this plan writes only under `PRPs/plans/` and edits existing files under `plugins/relay/` and `docs/`; no `.claude/` write.
- Applicable architectural rules:
  - Three-pillar target architecture, Pillar 1 "Initialization" (`docs/context/architecture.md:38-50`) — `context-builder` is exactly the layer this phase modifies.
  - PRP artifact paths convention (`docs/context/architecture.md:168-187`) — this plan's own path and the PRD back-fill both conform.
  - `plugins/prp-core/` is a read-only reference, never active relay code (`docs/context/architecture.md:29-36`) — out of scope, not touched.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-formatting-prevention-preflight.prd.md` — Implementation
  Phases row 1: "formatter_cmd contract" — Goal: A deterministic,
  non-heuristic source for the project formatter command — Success signal:
  `*init` output carries the key with its deterministic default; `*update`
  never flips a set value; `npm run validate` green.

## Summary

Adds a `formatter_cmd` key to the `docs/context/methodology.md`
frontmatter contract that `context-builder` owns: `*init` always emits
`formatter_cmd: null` (mirroring the existing `tdd_evidence: null`
default-emission precedent), and `*update` preserves an already-set value
untouched and backfills `null` only when the key is entirely absent —
never heuristically inferred. This is the declaration surface later
phases (2 Prevention, 3 Preflight) will read from; this phase adds
nothing that consumes or executes the value. It also dogfoods the
contract onto this repo's own `docs/context/methodology.md`, and makes a
documented, non-code-changing judgment call that `formatter_cmd` should
**not** be added to `scripts/validate/checks/gating-structure.mjs`'s
`SITES` registry: `SITES` currently registers only boolean opt-in
track-gates (`figma_track`, `visual_first_approval`), not declared-value
keys — `docs_sync` and `tdd_evidence` share the identical
emit/preserve/backfill shape and are not `SITES` entries either.
`formatter_cmd` follows that same precedent.

## User Story

As the relay pipeline operator preparing a formatter-enforcing target
project, I want a deterministic, non-heuristic `formatter_cmd`
declaration in `docs/context/methodology.md`, so that later phases
(Prevention, Preflight) have an unambiguous, human-owned source for the
formatter command instead of guessing one from project files.

## Problem Statement

There is currently no declared, deterministic source for "the project's
formatter command" in `docs/context/methodology.md`. Later phases of this
feature (2 Prevention in `/relay-write-test`, 3 Preflight in
`/relay-implement`) need one to scope a formatter invocation to test
files before the R-X inspection window opens. Inventing that source ad
hoc — e.g. sniffing `devDependencies` or config files at the point of
use — would violate the non-heuristic contract already established for
`tdd`/`docs_sync`/`figma_track` (`docs/anti-patterns.md:89-94`) and would
make an autonomously-executed command's origin unauditable.

## Solution Statement

`context-builder`'s `SKILL.md` Step 5 gains a `formatter_cmd` key
(`null` default on `*init`, preserved/backfilled on `*update`, never
heuristic) using the exact three-property shape already documented for
`figma_track`/`visual_first_approval`. This repo's own
`docs/context/methodology.md` is backfilled with the same key and a new
`## Formatter` documentation section, dogfooding the contract. The
`gating-structure.mjs` validation check is left structurally unchanged
(no new `SITES` entry) but gains a short, explicit rationale comment so
a future reader does not have to re-derive the judgment call.

## Metadata

| Field | Value |
|-------|-------|
| Type | Feature |
| Complexity | Low |
| Systems Affected | `context-builder` skill (`plugins/relay/skills/context-builder/SKILL.md`); `docs/context/methodology.md` documentation; validation suite (`scripts/validate/checks/gating-structure.mjs`, comment-only) |
| Dependencies | None (`Depends: -`) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/test-formatting-prevention-preflight.prd.md:292, 335-343` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 584-710 | Step 5's `docs/context/methodology.md` contract — the exact frontmatter template, Init behavior, and Update behavior pattern `formatter_cmd` must mirror |
| P0 | `docs/context/methodology.md` | 1-84 | This repo's own live instance — the file being backfilled; shows the current key set and the `## Docs Sync` section shape to mirror for `## Formatter` |
| P1 | `scripts/validate/checks/gating-structure.mjs` | 1-66 | `SITES` registry + docstring — required reading to make (and correctly document) the non-membership judgment call |
| P1 | `docs/anti-patterns.md` | 89-94 | "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — `formatter_cmd` inherits this discipline verbatim |
| P2 | `docs/decisions.md` | 270-276 | [2026-04-19] Methodology declaration decision — origin of the non-heuristic, single-source-of-truth contract |

## Patterns to Mirror

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:645-652
- Always emit `figma_track: false` — the per-project opt-in switch for the
  Figma implementation track (design-to-code) defaults to off, mirroring
  the `docs_sync` default-emission precedent verbatim. Never heuristically
  inferred from Figma-related file names, `.fig` references, or
  design-tool content; always emitted deterministically on every `*init`
  run. Flips to `true` only via a human edit to this file or the explicit
  confirmation step of the `/relay-design-map` command (Phase 3 of
  the Figma implementation track) — never by heuristic detection.
```
Copied by Task 1 (`formatter_cmd` Init-behavior bullet) — same
"Always emit `X: default` — ... mirroring `Y` precedent verbatim. Never
heuristically inferred ... Flips ... only via a human edit ..." structure.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:681-690
  - **`figma_track` preservation**: if `figma_track` is already present
    in the frontmatter, preserve its value untouched — validated
    human/command input, same treatment as `docs_sync`. If the key is
    entirely absent (a project initialized before this key existed),
    backfill `figma_track: false` — this is the ONLY case where
    `*update` adds this key; never remove or flip an existing value.
    Heuristics (Figma file names, `.fig` references, design-tool
    mentions in commit history or docs) MUST NOT flip this value —
    only a human edit or the `/relay-design-map` confirmation
    step can.
```
Copied by Task 2 (`formatter_cmd` Update-behavior preservation bullet) —
same "preserve untouched / backfill only when absent / heuristics MUST
NOT flip" structure.

```
# SOURCE: docs/context/methodology.md:45-76
## Docs Sync

Current state: **true** (default) — `docs_sync: true` in the
frontmatter above is the per-project master switch ...

### How to override

1. Change `docs_sync: true` to `docs_sync: false` above to disable
   automated docs sync for this project. This is a manual human edit
   to this file — `context-builder` never produces a `false` value
   itself.
2. Heuristics MUST NOT flip this value — only a human edit can.
   ...
```
Copied by Task 3 (new `## Formatter` section) — same two-subsection
"Current state" + "### How to override" shape.

```
# SOURCE: scripts/validate/checks/gating-structure.mjs:22-30
 * Extensible by design: this module intentionally started with a single
 * site (`figma_track`, added by
 * PRPs/plans/figma-implementation-track-phase-1-foundations.plan.md Task 3)
 * and now registers a 2nd site (`visual_first_approval`, added by
 * PRPs/plans/figma-visual-first-track-phase-1-foundations.plan.md Task 5).
 * Later phases of the Figma implementation track (or any future opt-in
 * methodology key) append a new entry to the `SITES` array below instead
 * of creating a new check module ...
```
Copied by Task 4 (rationale-comment addition) — same docstring placement
and tone, immediately after this paragraph.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | Add `formatter_cmd` to the Step 5 methodology.md frontmatter template, the Init-behavior default-emission bullet, and the Update-behavior preserve/backfill bullet — the canonical non-heuristic contract every future `*init`/`*update` run reads from. |
| `docs/context/methodology.md` | UPDATE | Backfill `formatter_cmd: null` into this repo's own live frontmatter and add a `## Formatter` body section, dogfooding the contract and satisfying the PRD's explicit "docs/context/methodology.md must document the key" scope line. |
| `scripts/validate/checks/gating-structure.mjs` | UPDATE | Comment-only addition documenting the judgment call that `formatter_cmd` is intentionally excluded from the `SITES` registry (a command-string value key like `tdd_evidence`, not a boolean opt-in track-gate like `figma_track`/`visual_first_approval`) — satisfies "validation-suite awareness ... as applicable" without a behavior change or new test obligation. |

## NOT Building (Scope Limits)

- Heuristic inference of `formatter_cmd` from `package.json`
  `scripts.format`, devDependencies, or config files — the key is
  emitted by `context-builder` or human-set only (PRD "What We're NOT
  Building").
- The `/relay-write-test` command-layer formatting step + discovery
  chain (`formatter_cmd:` → `scripts.format` → skip) — Phase 2
  (Prevention).
- The `/relay-implement` preflight normalization before
  `base_commit`/`diff_target` capture — Phase 3 (Preflight).
- Any R-X/D17 carve-out or mutating tool on `code-reviewer` — never
  built, this phase or any other.
- A formatting sub-channel in `TEST_CONTRACT_DISPUTE` — never built.
- Adding `formatter_cmd` to `gating-structure.mjs`'s `SITES` registry —
  deliberately excluded this phase (see Summary); `formatter_cmd` is a
  declared value key, not a boolean opt-in track-gate.
- A `docs/decisions.md` entry recording this contract — deferred to
  Phase 5 ("Docs + release"), not this phase.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/skills/context-builder/SKILL.md (frontmatter template + Init behavior)

**ACTION**: In Step 5's fenced frontmatter template block (`SKILL.md:592-600`),
add a `formatter_cmd: null` line with an inline comment directly after the
`visual_first_approval: auto` line, following the same `key: value  #
comment` shape as the other five keys (e.g. `formatter_cmd: null   #
null | "<command string>" — project formatter command; null means
undeclared; never heuristically inferred`). Then, in the "**Init
behavior:**" list (`SKILL.md:627-661`), add a new bullet immediately
after the `visual_first_approval` bullet stating: always emit
`formatter_cmd: null` deterministically on every `*init` run, mirroring
the `tdd_evidence: null` default-emission precedent verbatim; explicitly
state it is NEVER heuristically inferred from `package.json`
`scripts.format`, installed devDependencies, or config files — that
fallback is a later phase's own runtime discovery at formatting time,
never a value written back into this file; flips away from `null` only
via a human edit to this file.
**MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:645-652`
**Delivers**: AC-A1
**VALIDATE**:
```
grep -q "formatter_cmd: null" plugins/relay/skills/context-builder/SKILL.md && grep -q "Always emit \`formatter_cmd: null\`" plugins/relay/skills/context-builder/SKILL.md
```

### Task 2: UPDATE plugins/relay/skills/context-builder/SKILL.md (Update behavior preservation bullet)

**ACTION**: In the "**Update behavior:**" list (`SKILL.md:663-700`), add a
new bullet immediately after the `visual_first_approval` preservation
bullet (before "If the file is missing: run Init behavior.") titled
`**\`formatter_cmd\` preservation**:` stating: if `formatter_cmd` is
already present in the frontmatter (including an explicit `null`),
preserve its value untouched — same treatment as `tdd`/`docs_sync`; if
the key is entirely absent, backfill `formatter_cmd: null` — the ONLY
case `*update` adds this key; never remove or flip an existing non-null
value, and never infer one from `package.json` `scripts.format` or any
other project file.
**MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:681-690`
**Delivers**: AC-A2
**VALIDATE**:
```
grep -q "formatter_cmd\` preservation" plugins/relay/skills/context-builder/SKILL.md && grep -q "backfill \`formatter_cmd: null\`" plugins/relay/skills/context-builder/SKILL.md
```

### Task 3: UPDATE docs/context/methodology.md (backfill key + document section)

**ACTION**: Add `formatter_cmd: null` as a new line in this file's YAML
frontmatter, immediately after `docs_sync: true`. Add a new `## Formatter`
body section, placed after `## Docs Sync` and before `## Other
methodologies`, documenting "Current state: **not declared** (default)"
and a "### How to override" subsection explaining that setting a
non-null value is a manual human edit, and that `context-builder`
`*init` always emits `null` while `*update` preserves an existing value
and backfills `null` only when the key is absent — mirroring the `##
Docs Sync` section's two-subsection shape exactly.
**MIRROR**: `# SOURCE: docs/context/methodology.md:45-76`
**Delivers**: AC-A3
**VALIDATE**:
```
grep -q "^formatter_cmd: null" docs/context/methodology.md && grep -q "^## Formatter" docs/context/methodology.md
```

### Task 4: UPDATE scripts/validate/checks/gating-structure.mjs (SITES-exclusion rationale, comment-only)

**ACTION**: Add a short paragraph to the file's top-of-file docstring,
immediately after the existing "Extensible by design ..." paragraph
(`gating-structure.mjs:22-30`). Comment-only — no code/logic change, the
`SITES` array itself stays exactly as it is (two entries:
`figma_track`, `visual_first_approval`). State: `formatter_cmd`
(introduced by `test-formatting-prevention-preflight` Phase 1) was
evaluated against this registry and intentionally excluded — it is a
declared command-STRING value key (default `null`), not a boolean
opt-in track-gate like `figma_track`/`visual_first_approval`; it follows
the same non-heuristic emit/preserve/backfill discipline via
`docs_sync`/`tdd_evidence`'s precedent, neither of which is a `SITES`
entry either.
**MIRROR**: `# SOURCE: scripts/validate/checks/gating-structure.mjs:22-30`
**Delivers**: AC-A4
**VALIDATE**:
```
if grep -q "key: 'formatter_cmd'" scripts/validate/checks/gating-structure.mjs; then
  echo "FAIL: formatter_cmd must not be added to SITES"; exit 1
elif ! grep -q "formatter_cmd" scripts/validate/checks/gating-structure.mjs; then
  echo "FAIL: rationale comment for formatter_cmd exclusion missing"; exit 1
else
  echo "PASS: SITES unchanged, exclusion rationale documented"
fi
```

## Validation Commands

**Level 1 STATIC_ANALYSIS:**
```
npm run validate
```
(repo root; `scripts/validate/index.mjs` sets `process.exitCode = 1` on
any check failure, 0 otherwise — real exit-code semantics.)

**Level 2 CONTENT_INVARIANTS:**
```
set -euo pipefail
grep -q "formatter_cmd: null" plugins/relay/skills/context-builder/SKILL.md
grep -q "Always emit \`formatter_cmd: null\`" plugins/relay/skills/context-builder/SKILL.md
grep -q "formatter_cmd\` preservation" plugins/relay/skills/context-builder/SKILL.md
grep -q "backfill \`formatter_cmd: null\`" plugins/relay/skills/context-builder/SKILL.md
grep -q "^formatter_cmd: null" docs/context/methodology.md
grep -q "^## Formatter" docs/context/methodology.md
```
(`set -euo pipefail` makes any single `grep -q` miss fail the whole
block — no masking.)

**Level 3 DRY-RUN:**
```
node --test scripts/validate/checks/gating-structure.test.mjs
```
(Confirms the comment-only `gating-structure.mjs` edit does not regress
its existing test suite — `node --test` exits non-zero on any failure,
propagated directly with no output-format guessing.)

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** Given `context-builder`'s `SKILL.md` Step 5,
  when `*init` is described, then it always emits `formatter_cmd: null`
  deterministically, never heuristically inferred.
- **AC-A2 (PRD AC-6):** Given `context-builder`'s `SKILL.md` Step 5
  Update behavior, when `*update` runs against a project whose
  `methodology.md` already has `formatter_cmd` set, then the value is
  preserved untouched; when the key is entirely absent, `*update`
  backfills `formatter_cmd: null` only — this is the ONLY case it adds
  the key.
- **AC-A3 (PRD AC-6, Phase 1 Scope):** Given `docs/context/methodology.md`
  (this repo's own instance), when read after this phase, then it
  documents `formatter_cmd` with a `## Formatter` section mirroring the
  `## Docs Sync` section's shape (Current state / How to override).
- **AC-A4 (PRD AC-8, narrowed to Phase 1's change surface):** Given the
  Phase 1 change surface (`SKILL.md`, `docs/context/methodology.md`,
  `gating-structure.mjs`), when `npm run validate` runs, then it exits 0
  and no existing check — including `gating-structure` — regresses; and
  the `SITES` registry remains exactly `{figma_track,
  visual_first_approval}` with the exclusion rationale documented
  inline.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `formatter_cmd` becomes a command-injection / arbitrary-execution surface once consumed by later phases | L | M (execution is deferred to Phase 2/3, not this phase) | Sourced only from human-owned `docs/context/methodology.md`, same trust model as a plan's own Validation Commands (PRD Technical Risks table); this phase only declares the key, never executes it |
| `SITES`-registry exclusion judgment call is second-guessed later (a future phase adds `formatter_cmd` to `SITES` inconsistently) | L | L | Rationale documented inline in `gating-structure.mjs`'s docstring, citing the `docs_sync`/`tdd_evidence` non-`SITES` precedent, so future edits see the reasoning instead of re-deriving it |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
when a test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger
(`/relay-write-test` → `/relay-test-write-review`), not authored by the
Implementer — R-X is a blanket straight-fail on any test glob in the
Implementer's diff. No task above and no `## Files to Change` row targets
a test file (Task 4's edit to `gating-structure.mjs` is comment-only and
`gating-structure.test.mjs` is not touched), so this plan's `**VALIDATE**`
commands exercise the change directly rather than invoking the test
framework.

**Open Question resolution (`*init` default value for `formatter_cmd`):**
Resolved to **emit `formatter_cmd: null` explicitly** (visible,
deterministic), mirroring the `tdd_evidence: null` precedent already in
the frontmatter template — matches the PRD's own leaning. An omitted
key would be indistinguishable from "not yet updated to this schema
version" vs. "explicitly undeclared", the same ambiguity the `tdd`/
`docs_sync` precedent was designed to avoid.

**`gating-structure.mjs` `SITES` judgment call:** `formatter_cmd` is
intentionally NOT added as a new `SITES` entry. The registry's two
existing entries (`figma_track`, `visual_first_approval`) are both
boolean opt-in *track*-gates whose flip unlocks a materially different
pipeline branch. `formatter_cmd` is a declared *value* key (a command
string or `null`) in the same family as `docs_sync` and `tdd_evidence`
— both of which share the identical emit/preserve/backfill three-property
contract yet are not `SITES` entries either. Grounding for this call:
`scripts/validate/checks/gating-structure.mjs:1-66` (registry + docstring)
and `docs/anti-patterns.md:89-94` (the anti-pattern this check enforces
is specifically about *boolean opt-in gating keys*). "Validation-suite
awareness ... as applicable" (PRD Phase 1 scope) is satisfied by the
Task 4 rationale comment plus `npm run validate` staying green — not by
forcing a categorically different key into a registry built for a
different shape of key.

*Generated: 2026-08-26*
*Approved: 2026-08-26*
*Implemented: 2026-08-26*
*Status: IMPLEMENTED*
