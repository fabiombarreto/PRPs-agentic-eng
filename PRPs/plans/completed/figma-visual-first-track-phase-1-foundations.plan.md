# Feature: Foundations (Phase 1 of figma-visual-first-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (three docs/context/ template registrations + one new docs/context/ file + context-builder skill prose + validate-check registry extension + changelog entry); impacts the target project's methodology.md contract; establishes three new opt-in, non-heuristic declaration surfaces
- Decisions found:
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` — single source of truth for methodology keys; `visual_first_approval` follows this exact contract
  - [2026-04-19] TDD activation is opt-in by explicit declaration only — the general "no heuristic activation" principle every new key here follows
  - [2026-05-14] `phase_type` Metadata-field precedent (self-healing, reviewer may infer/insert) — the lineage `phase_scope` deliberately does NOT follow
  - [2026-07-09] Validation commands must carry real exit-code semantics; `plan-reviewer` enforces via `R-COH-VALIDATE-ALWAYS-PASS` — binding on every Level/VALIDATE command this plan emits
  - [2026-07-12] Validation suite: Node/ESM static-check harness — `scripts/validate/checks/gating-structure.mjs`'s extensible `SITES` registry this phase extends
  - [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference — the exact lineage `phase_scope` mirrors
  - [2026-07-23] Component map is a durable `docs/design/` knowledge-base artifact, not a per-run `PRPs/` pipeline artifact — the general durable-knowledge-lives-under-docs/ principle informing the new `docs/context/mock-sentinels.md` placement
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — generalizes directly to `visual_first`, `phase_scope`, and `visual_first_approval`: all three default safe and are never inferred from PRD/plan/file content
  - "Injecting plugin defaults into the target project's `decisions.md`" — `visual_first_approval`'s default lives in the context-builder's own SKILL.md prompt, never hardcoded into a target project's `docs/decisions.md`
  - "Writing pipeline artifacts under `.claude/`" — every write in this phase lands under `docs/`, `plugins/relay/`, `scripts/`, `documentation/`, or `PRPs/plans/`, never `.claude/`
- Applicable architectural rules:
  - `docs/context/methodology.md` is the single source of truth for methodology declarations
  - context-builder `*update` PRESERVE-ENTIRELY discipline (never overwrite a human-set value; backfill only when the key is entirely absent)
  - `scripts/validate/` checks are scoped to `plugins/relay/` only — never `plugins/prp-core/`
  - PRP artifact convention: pipeline artifacts live under `PRPs/`, never `.claude/`
  - Interactivity boundary is fixed at PRD approval — relevant background for why `visual_first_approval: human` exists as a future gate; this phase implements no dialogue mechanism itself
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-visual-first-track.prd.md` — Implementation Phases row 1:
  "Foundations" — Goal: Establish the non-heuristic declaration surfaces
  with zero behavior change to any existing path. — Success signal:
  `npm run validate` stays green; no existing test or output changes.

## Summary

This phase establishes the foundational, zero-behavior-change declaration
surfaces for relay's Figma Visual-First Track (v2): a new conditional
`## Visual-First Mode` marker in the PRD template (`visual_first:
true|false`, meaningful only when `figma_track: true`), a new conditional
`phase_scope: visual|logic` Metadata row in the plan template (mirroring
`design_source`'s proven non-heuristic lineage, explicitly not
`phase_type`'s self-healing one), a new `visual_first_approval:
auto|human` methodology key (mirroring `figma_track`/`docs_sync`'s exact
init/update/backfill discipline), a new `docs/context/mock-sentinels.md`
documenting the `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` inline mock
convention, an optional `Interaction` column on the Design Spec's Visual
Acceptance Criteria table, and one new deterministic `gating-structure`
registry entry enforcing `visual_first_approval`'s non-heuristic
discipline. No agent (`prd-writer`, `prd-reviewer`, `plan-writer`,
`plan-reviewer`, `design-spec-writer`) is rewired to consume these
surfaces yet — that is Phases 2 through 5's job. Every registration is
dual-branch (present only when its gating condition holds, fully absent
otherwise), so a project or PRD that declares nothing new sees zero
behavioral change, matching this repo's own current state.

## User Story

As a developer maintaining the relay plugin, I want the visual-first
track's three declaration surfaces (`visual_first`, `phase_scope`,
`visual_first_approval`) and its sentinel/Interaction-column conventions
registered non-heuristically in the canonical templates and methodology
contract, so that Phases 2 through 6 have a solid, zero-drift foundation
to wire real enforcement onto, without risking silent heuristic
activation for any project or PRD that hasn't opted in.

## Problem Statement

Relay's Figma Implementation Track (v1) verifies visual fidelity only at
the end of a phase's implementation, after logic already exists on top of
the visual — a wrong visual can force expensive logic rework. The fix
(v2's visual-first phase pairing) needs three new non-heuristic
declaration surfaces and two documented conventions before any agent can
be safely wired to use them; without a zero-behavior-change foundation,
any downstream phase risks silently activating for projects that never
opted in, repeating the exact "forgot to check vs. doesn't apply"
ambiguity the methodology-declaration model already exists to prevent.

## Solution Statement

Register `visual_first` (PRD-level, conditional on `figma_track: true`),
`phase_scope` (plan-level, conditional on the source PRD's `visual_first:
true`, mirroring `design_source`'s non-heuristic lineage), and
`visual_first_approval` (methodology-level, mirroring
`figma_track`/`docs_sync`'s exact emission/preserve/backfill contract)
across their respective canonical templates and the context-builder
skill; document the `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel
convention in a new `docs/context/mock-sentinels.md`; extend the Design
Spec's Visual Acceptance Criteria table with an optional `Interaction`
column; and extend `gating-structure.mjs`'s existing extensible `SITES`
registry with a `visual_first_approval` entry — the only piece of this
phase that becomes a permanent, always-on `npm run validate` check, since
`visual_first`/`phase_scope` are PRD-level/plan-level fields enforced by
reviewer rubric items in later phases, not by the static registry.

## Metadata

| Field | Value |
|---|---|
| Type | Infrastructure / configuration (declaration surfaces) |
| Complexity | Low-Medium |
| Systems Affected | `docs/context/` templates (prd-template.md, plan-template.md, design-spec-template.md), a new `docs/context/` file, context-builder skill, `npm run validate` suite (gating-structure check), `docs/KNOWLEDGE_BASE.md`, `documentation/changelog.html` |
| Dependencies | none |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/figma-visual-first-track.prd.md` Implementation Phases row 1 |
| phase_type | scaffold |

This target project's own `docs/context/methodology.md` does not declare
`figma_track: true`, so per `docs/context/plan-template.md`'s dual-branch
rule this table carries no `design_source` row (and the plan body carries
no `## Design Source` section). This plan's own source PRD does not
declare `visual_first: true` either (it is a foundational PRD about
relay's own pipeline machinery, not a downstream product feature with a
Figma visual surface), so this table also carries no `phase_scope` row —
the new v2 machinery is inert against this repo and against this very
plan, by design.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `docs/context/prd-template.md` | 198-213 | The conditional `## Design Source` section's exact dual-branch present/absent registration — the pattern `## Visual-First Mode` must replicate |
| P0 | `docs/context/plan-template.md` | 191-222 | `design_source`'s non-heuristic, never-inferred Metadata-row lineage — the exact lineage `phase_scope` must mirror (NOT `phase_type`'s self-healing lineage) |
| P0 | `docs/context/design-spec-template.md` | 107-113, 154-159 | The 8-column Visual Acceptance Criteria table gaining the optional 9th `Interaction` column, plus its "Section reference" completeness-scope prose |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 592-599, 643-650, 670-679 | The `figma_track` key's exact template-block placement and init/update/backfill contract — the pattern `visual_first_approval` must replicate verbatim, default `auto` instead of `false` |
| P0 | `scripts/validate/checks/gating-structure.mjs` | 1-31, 36-56 | The extensible `SITES` registry's docstring and exact array shape — a 2nd entry (`visual_first_approval`) must follow this shape precisely |
| P1 | `plugins/relay/agents/plan-reviewer.md` | 441-449 | States explicitly why `design_source` is never self-healed the way `phase_type` is — the contrast this phase's `phase_scope` registration prose must preserve (found via `research-codebase`; not directly read in this pass) |
| P1 | `docs/KNOWLEDGE_BASE.md` | 22-34 | The "## Project Context" index section where the new `docs/context/mock-sentinels.md` entry is registered |
| P1 | `PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md` | 1-222 | Direct sibling precedent: the base track's own declaration-only, zero-behavior-change Phase 1 — Task shape, `phase_type: scaffold` Metadata value, Validation Commands shape, and the changelog Task 4 pattern |
| P2 | `docs/decisions.md` | 680-688 | The exit-code-semantics decision — binding on every VALIDATE/Level command in this plan |
| P2 | `documentation/changelog.html` | 31-41 | The current `Unreleased` → `Added` list shape and per-entry style ("Part of the ..., Phase N of ...") this phase's entry must match |
| P2 | `PRPs/prds/figma-visual-first-track.prd.md` | Acceptance Criteria (AC-1–AC-6), MoSCoW table, Decisions Log | The full contract this phase's declarations exist to satisfy in later phases |

## Patterns to Mirror

```
# SOURCE: docs/context/prd-template.md:198-211
## Design Source

*(Conditional — present ONLY when the target project's
`docs/context/methodology.md` declares `figma_track: true`; absent
entirely, not an empty section, when `figma_track` is `false` or
absent.)*

One row per `## Implementation Phases` table row above — no phase may
be silently omitted, including phases that don't obviously look like
frontend work:

| Phase # | Declaration (figma \| none) | Figma URL / frames (when figma) |
|---------|------------------------------|-----------------------------------|
| {#} | {figma \| none} | {Figma URL / frame reference, or "-" when none} |
```
Copied into Task 1 as the dual-branch conditional-section template for
the new `## Visual-First Mode` section.

```
# SOURCE: docs/context/plan-template.md:191-206
6. `## Metadata`

   Table with the keys: Type, Complexity, Systems Affected,
   Dependencies, Estimated Tasks, Source PRD line ref, and,
   conditionally, `design_source`.

   **`design_source` (conditional).** Present (`figma | none`) only
   when the target project's `docs/context/methodology.md` declares
   `figma_track: true`; absent entirely otherwise. Never inferred —
   sourced non-heuristically by `plan-writer` (PRD mode: copied
   verbatim from the source PRD's `## Design Source` row for this
   phase; description mode: derived from an explicit `--design-spec`
   CLI flag) and structurally checked (never inferred or inserted) by
   `plan-reviewer`'s `R-COH-DESIGN-SOURCE-MISSING`.
```
Copied into Task 2 as the non-heuristic conditional-Metadata-row
template for `phase_scope`.

```
# SOURCE: docs/context/design-spec-template.md:107-113
## Visual Acceptance Criteria

Per frame:

| Frame (node-id) | Route | Preconditions | Auth mode | Viewport | Diff threshold | Ref PNG (path + dims) | Masks |
|-------------------|-------|----------------|-----------|----------|------------------|--------------------------|-------|
| {node-id} | {route} | {preconditions} | {auth mode} | {viewport} | {diff threshold} | `PRPs/designs/<feature>/refs/<node-id>.png` ({W}x{H}) | {optional masks, or "none"} |
```
Copied into Task 3 as the table extended with a 9th optional
`Interaction` column.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:643-650,670-679
- Always emit `figma_track: false` — the per-project opt-in switch for the
  Figma implementation track (design-to-code) defaults to off, mirroring
  the `docs_sync` default-emission precedent verbatim. Never heuristically
  inferred from Figma-related file names, `.fig` references, or
  design-tool content; always emitted deterministically on every `*init`
  run. Flips to `true` only via a human edit to this file or the explicit
  confirmation step of the future `/relay-design-map` command (Phase 3 of
  the Figma implementation track) — never by heuristic detection.
  ...
  - **`figma_track` preservation**: if `figma_track` is already present
    in the frontmatter, preserve its value untouched — validated
    human/command input, same treatment as `docs_sync`. If the key is
    entirely absent (a project initialized before this key existed),
    backfill `figma_track: false` — this is the ONLY case where
    `*update` adds this key; never remove or flip an existing value.
    Heuristics (Figma file names, `.fig` references, design-tool
    mentions in commit history or docs) MUST NOT flip this value —
    only a human edit or the future `/relay-design-map` confirmation
    step can.
```
Copied into Task 4 as the init/update/backfill prose template for
`visual_first_approval` (default `auto` instead of `false`).

```
# SOURCE: scripts/validate/checks/gating-structure.mjs:47-56
const SITES = [
  {
    key: 'figma_track',
    markers: [
      { id: 'default-false-emission', pattern: /always emit `figma_track: false`/i },
      { id: 'preserve-on-update', pattern: /`figma_track`\s*preservation/i },
      { id: 'backfill-only-when-absent', pattern: /backfill\s*`figma_track: false`/i },
    ],
  },
];
```
Copied into Task 5 as the exact shape a `visual_first_approval` entry
must follow (default-`auto`-emission marker instead of
default-`false`-emission).

```
# SOURCE: docs/KNOWLEDGE_BASE.md:33-34
→ docs/context/component-map-template.md — canonical shape of `docs/design/component-map.md`, the versioned Figma-to-code component map that `design-map-writer`/`design-map-reviewer` reference as authoritative (Figma Implementation Track Phase 3)
→ docs/context/design-spec-template.md — canonical shape of `PRPs/designs/<feature>/design-spec.md`, the per-feature, human-approved Design Spec that `design-spec-writer`/`design-spec-reviewer` reference as authoritative (Figma Implementation Track Phase 4)
```
Copied into Task 7 as the index-entry format for the new
`docs/context/mock-sentinels.md` row.

```
# SOURCE: docs/context/redaction-policy.md:1-10,156-168
# Redaction Policy

Canonical list of patterns the Test Runner (component A4 + B6) applies
when capturing stdout/stderr/logs into `PRPs/reports/<feature>/`. Secret
values present in test output are replaced with `[REDACTED]` markers
before being written to the versioned report that travels with the PR.

This policy is about **output redaction** — what to hide when writing
reports. It is **not** about secret injection (how secrets reach the
test container in the first place); that is a separate concern.
...
## What this policy is NOT

- **Not a replacement for proper secret management.** Secrets must
  still be injected via `.env` / vault / compose secrets, NOT hardcoded
  in source. This policy catches accidental leaks into test output; it
  doesn't legitimize any sloppy handling upstream.
- **Not a policy for source-code scanning.** pre-commit secret scanners
  (trufflehog, gitleaks) are complementary — they prevent secrets from
  entering the repo; this policy prevents captured output from
  containing them in reports. Both are needed.
- **Not about blocking tests from using secrets.** Tests legitimately
  need credentials to hit sandbox APIs. This policy never blocks
  access — it only redacts captured output.
```
Copied into Task 6 as the STRUCTURAL mirror only: title, an opening
"what this is about / what it is explicitly NOT about" framing
paragraph, and a closing "## What this policy is NOT" scope-boundary
section — the shape `docs/context/mock-sentinels.md` follows. No repo
file documents the CONTENT of an inline mock-sentinel convention (see
## Notes for the research-gap discussion); this anchor supplies the
structural container, not the content.

```
# SOURCE: PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md:157-165
### Task 4: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a list entry under the `Unreleased` section (create the
section if absent, matching the existing changelog's heading structure)
describing: "`figma_track` opt-in key added to `methodology.md` (default
off); `docs/design-system.md` registered as a future conditionally-generated
doc; new `gating-structure` deterministic check in `npm run validate`. Part
of the Figma Implementation Track, Phase 1 of
`PRPs/prds/figma-implementation-track.prd.md`." Do NOT create a new
versioned `<h2>` release heading and do NOT bump
`plugins/relay/.claude-plugin/plugin.json` — this stays under `Unreleased`
so `version-parity` remains green.
```
Copied into Task 8 as the exact `<li>`-under-`Unreleased`→`Added` shape
and no-version-bump discipline.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `docs/context/prd-template.md` | UPDATE | Register the `## Visual-First Mode` conditional section (dual-branch, gated on `figma_track: true`) |
| `docs/context/plan-template.md` | UPDATE | Register the `phase_scope` conditional Metadata row (mirrors `design_source`'s lineage) |
| `docs/context/design-spec-template.md` | UPDATE | Add the optional `Interaction` column to the Visual Acceptance Criteria table |
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | Add `visual_first_approval: auto` key emission/preservation/backfill (Step 5), mirroring `figma_track` |
| `scripts/validate/checks/gating-structure.mjs` | UPDATE | Extend the `SITES` registry with a `visual_first_approval` entry |
| `docs/context/mock-sentinels.md` | CREATE | Document the `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel convention |
| `docs/KNOWLEDGE_BASE.md` | UPDATE | Register the new `docs/context/mock-sentinels.md` entry |
| `documentation/changelog.html` | UPDATE | Add an `Unreleased` → `Added` entry for this phase |

## NOT Building (Scope Limits)

- Mixed visual+logic phases, N:1 phase pairing, retrofitting existing
  PRDs, or any heuristic inference of `visual_first`/`phase_scope` —
  inherited PRD-level exclusions; not rebuilt here, and will be enforced
  by Phase 2/3's reviewers, not by this phase.
- Any change to `plugins/relay/agents/prd-writer.md`, `prd-reviewer.md`,
  `plan-writer.md`, or `plan-reviewer.md` themselves — wiring these
  agents to actually emit, consume, or validate `visual_first`/
  `phase_scope` is Phase 2 and Phase 3's job; this phase only registers
  the template shapes.
- Wiring `design-spec-writer`/`design-spec-reviewer` to author or
  validate `Interaction` column values, or `capture.mjs` to execute
  interaction scripts — deferred to Phase 5 (Implement-time gate); this
  phase only registers the column's shape and bounded vocabulary syntax.
- The `human`-mode approval gate mechanism (`/relay-visual-approve`,
  `/relay-execute` halt/resume) — Phase 6's job entirely; this phase only
  declares the `auto | human` key with default `auto`.
- Any runtime enforcement of the sentinel convention (zero-side-effects
  check, zero-remaining-sentinels ledger gate) — Phase 3/4's job
  (`R-COH-*` checks on `plan-reviewer`); this phase only documents the
  convention.
- A `gating-structure.mjs` `SITES` entry for `visual_first` or
  `phase_scope` themselves — the registry's architecture only fits keys
  documented in `SKILL.md`'s prose (methodology.md keys); these two are
  PRD-level/plan-level fields enforced by reviewer rubric items in later
  phases (mirroring how `design_source` itself has no `gating-structure`
  entry), not by the static registry.
- `plugin.json` version bump — deferred to a future release-cut; this
  phase's changelog entry stays under `Unreleased`.

## Step-by-Step Tasks

### Task 1: UPDATE docs/context/prd-template.md — register `## Visual-First Mode`

**ACTION**: Insert a new `## Visual-First Mode` section into the PRD
body-structure template, immediately before the existing conditional
`## Design Source` section (i.e., after `### Phase Details`, before
`## Design Source`). Follow Design Source's exact dual-branch conditional
discipline: present — carrying an explicit `**visual_first:** \`true\` |
\`false\`` declaration line — only when `docs/context/methodology.md`
declares `figma_track: true`; absent entirely (not an empty heading)
otherwise. Add a short paragraph stating the non-heuristic contract
(never inferred from PRD content — same "Won't Building" guarantee the
source PRD itself states) and what `true` implies for the
`## Implementation Phases` table below (strict scope-pure visual/logic
phase pairing via the `Depends` column, per the source PRD's own AC-2),
explicitly forward-referencing Phase 2 of
`PRPs/prds/figma-visual-first-track.prd.md` for the enforcement itself.
Do not modify the "## Relay adaptations (mandatory extensions)" numbered
list at the top of the file — this is a body-structure addition, the
same way `## Design Source` itself was added without altering that list.

**MIRROR**: Pattern 1 (`docs/context/prd-template.md:198-211`).

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**: `if grep -q "## Visual-First Mode" docs/context/prd-template.md && grep -q "figma_track: true" docs/context/prd-template.md; then echo "PASS: Visual-First Mode section registered"; else echo "FAIL: Visual-First Mode section missing or not gated on figma_track"; exit 1; fi`

### Task 2: UPDATE docs/context/plan-template.md — register `phase_scope` conditional Metadata row

**ACTION**: In the `## Metadata` walkthrough (item 6 of the body-structure
list), add a new conditional-field paragraph immediately after the
existing `design_source` paragraph: `phase_scope` (`visual | logic`),
present only when the plan's source PRD declares `visual_first: true`;
absent entirely otherwise. State explicitly that it is never inferred —
mirrors `design_source`'s lineage, explicitly NOT `phase_type`'s
self-healing lineage (cite the contrast plan-reviewer.md:441-449 states
for `design_source` verbatim as the model). State that the exact per-row
sourcing mechanism (how `plan-writer` determines a given PRD row's scope)
is defined in Phase 3 of `PRPs/prds/figma-visual-first-track.prd.md` —
this phase registers only the field's dual-branch shape. Do NOT add a
companion conditional section (unlike `design_source`'s companion
`## Design Source` frame table) — the source PRD names no such companion
for `phase_scope`.

**MIRROR**: Pattern 2 (`docs/context/plan-template.md:191-206`).

**ADDRESSES**: AC-A3

**VALIDATE**: `if grep -q "phase_scope" docs/context/plan-template.md && grep -q "visual_first: true" docs/context/plan-template.md; then echo "PASS: phase_scope conditional row registered"; else echo "FAIL: phase_scope registration missing"; exit 1; fi`

### Task 3: UPDATE docs/context/design-spec-template.md — add optional `Interaction` column

**ACTION**: Extend the `## Visual Acceptance Criteria` table (currently 8
columns, lines 107-113) with a 9th optional column `Interaction`. Cell
shape: `{optional ordered interaction script — semicolon-separated steps
from the bounded vocabulary click(<selector>), fill(<selector>,
<value>), wait(<ms> \| <selector>), executed in order before capture; or
"none"}` (escape the pipe inside `wait(<ms> \| <selector>)` so the table
row parses correctly). Update the "### Section reference" bullet for
`## Visual Acceptance Criteria` (lines 154-159) to state the original 8
fields remain mandatory/non-empty (unchanged `R-DS7` completeness scope)
while `Interaction` is optional and additive — quote the source PRD's own
"What We're NOT Building" guarantee verbatim: "frames without an
`Interaction` entry behave byte-identically to today." Note explicitly
that this phase does not wire `design-spec-writer`, `design-spec-reviewer`,
or `capture.mjs` to author, validate, or execute the column — template
registration only.

**MIRROR**: Pattern 3 (`docs/context/design-spec-template.md:107-113`).

**ADDRESSES**: AC-A6

**VALIDATE**: `if grep -q "| Interaction |" docs/context/design-spec-template.md; then echo "PASS: Interaction column registered"; else echo "FAIL: Interaction column missing from Visual Acceptance Criteria table"; exit 1; fi`

### Task 4: UPDATE plugins/relay/skills/context-builder/SKILL.md — `visual_first_approval` key

**ACTION**: In Step 5 (methodology.md frontmatter template, fenced block
around lines 592-599), add `visual_first_approval: auto` immediately
after the existing `figma_track: false` key, with an inline comment `#
auto | human — default approval mode for the Figma Implementation Track
v2's visual-first blocking gate; only meaningful when figma_track: true`.
Add an Init-behavior bullet mirroring `figma_track`'s bullet exactly
(default `auto`, never heuristically inferred, flips only via a human
edit or a future command's explicit confirmation step — name
`/relay-visual-approve`, Phase 6 of `figma-visual-first-track.prd.md`,
as the forward reference, mirroring how `figma_track`'s own bullet
forward-referenced `/relay-design-map` before that command existed). Add
an Update-behavior bullet mirroring `figma_track`'s preservation bullet
exactly (preserve if present, backfill `auto` only if entirely absent,
never heuristically flipped).

**MIRROR**: Pattern 4 (`plugins/relay/skills/context-builder/SKILL.md:643-650,670-679`).

**ADDRESSES**: AC-A7

**VALIDATE**: `if grep -q "visual_first_approval: auto" plugins/relay/skills/context-builder/SKILL.md && grep -q "visual_first_approval\` preservation" plugins/relay/skills/context-builder/SKILL.md; then echo "PASS: visual_first_approval key documented"; else echo "FAIL: visual_first_approval emission/preservation prose missing"; exit 1; fi`

### Task 5: UPDATE scripts/validate/checks/gating-structure.mjs — extend `SITES` registry

**ACTION**: Append a 2nd entry to the `SITES` array (after the existing
single `figma_track` entry): `key: 'visual_first_approval'` with three
markers — `default-auto-emission` (matches the literal string `always
emit \`visual_first_approval: auto\``), `preserve-on-update` (matches
`` `visual_first_approval` preservation ``), `backfill-only-when-absent`
(matches `backfill \`visual_first_approval: auto\``) — following exactly
the regex shape of the existing `figma_track` entry's three markers. Do
NOT touch the existing `figma_track` entry. Update the module's
top-of-file docstring "Extensible by design" note to record this as the
2nd registered site (it currently documents only `figma_track` as the
sole site added by the v1 plan).

**MIRROR**: Pattern 5 (`scripts/validate/checks/gating-structure.mjs:47-56`).

**ADDRESSES**: AC-A7

**VALIDATE**:
```bash
set -euo pipefail
node --check scripts/validate/checks/gating-structure.mjs
git diff --unified=0 development -- scripts/validate/checks/gating-structure.mjs | grep -E "^\+[^+]" | grep -q "visual_first_approval"
```

### Task 6: CREATE docs/context/mock-sentinels.md

**ACTION**: Create a new file documenting: (1) the two sentinel token
classes `[RELAY-MOCK-DATA]` (wraps a literal displayed value standing in
for real data) and `[RELAY-MOCK-BEHAVIOR]` (wraps a handler/interaction
standing in for real business logic), with at least one inline-comment
example of each, kept language-agnostic since the convention must work
across target stacks; (2) the zero-side-effects rule binding on every
`phase_scope: visual` plan — no network call, no persistence, no real
state mutation; every displayed datum and interactive action wrapped in
one of the two sentinels — quoting the source PRD's AC-3 verbatim; (3)
swap semantics for the paired `phase_scope: logic` phase — a data
sentinel is resolved by replacing the literal mock value with the real
data source (API call, query, prop threading) at the sentinel site; a
behavior sentinel is resolved by filling in the real handler/business
logic in the "middle" while preserving the already-approved choreography
(timing, sequencing, visual states already locked in during the visual
phase); (4) the zero-remaining rule — logic-phase validation fails if any
sentinel of either class remains anywhere in the feature's visual-phase
files, with no deferral path permitted — quoting AC-5 and the source
PRD's Decisions Log "Sentinel deferral policy" row verbatim. Close with a
cross-reference to `docs/context/plan-template.md`'s `phase_scope` field
and to `PRPs/prds/figma-visual-first-track.prd.md`, and an explicit
statement that this phase documents the convention only — no agent or
check enforces it yet (Phase 3 enforces zero-side-effects at plan-review
time; Phase 4 enforces the zero-remaining ledger).

**MIRROR**: No direct content precedent exists for this convention
(genuinely new — see ## Notes for the research-gap discussion);
structural shape mirrors `docs/context/redaction-policy.md:1-10,156-168`
(see Patterns to Mirror above — title, scope-framing intro, and closing
"what this is NOT" section). Content is derived directly from the
source PRD's own Proposed Solution, MoSCoW "Inline mock sentinel
convention" row, and Decisions Log "Sentinel format"/"Sentinel deferral
policy" rows.

**ADDRESSES**: AC-A4, AC-A5

**VALIDATE**: `if [ -f docs/context/mock-sentinels.md ] && grep -q "RELAY-MOCK-DATA" docs/context/mock-sentinels.md && grep -q "RELAY-MOCK-BEHAVIOR" docs/context/mock-sentinels.md; then echo "PASS: mock-sentinels.md created with both sentinel classes documented"; else echo "FAIL: mock-sentinels.md missing or incomplete"; exit 1; fi`

### Task 7: UPDATE docs/KNOWLEDGE_BASE.md — register mock-sentinels.md

**ACTION**: Add one new `→` bullet to the "## Project Context" section,
positioned near the other `docs/context/*-template.md` entries, in the
established one-line-summary style: `→ docs/context/mock-sentinels.md —
the [RELAY-MOCK-DATA]/[RELAY-MOCK-BEHAVIOR] inline sentinel convention
for phase_scope: visual plans (Figma Visual-First Track)`.

**MIRROR**: Pattern 6 (`docs/KNOWLEDGE_BASE.md:33-34`).

**ADDRESSES**: AC-A4

**VALIDATE**: `if grep -q "docs/context/mock-sentinels.md" docs/KNOWLEDGE_BASE.md; then echo "PASS: mock-sentinels.md indexed in KNOWLEDGE_BASE.md"; else echo "FAIL: mock-sentinels.md not registered in KNOWLEDGE_BASE.md"; exit 1; fi`

### Task 8: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a new `<li>` under the existing `<h3
id="unreleased-added">Added</h3>` `<ul>` (do NOT create a new `<h2>`
release heading, do NOT bump `plugins/relay/.claude-plugin/plugin.json`
— stays under `Unreleased` so `version-parity` remains green), describing:
"`visual_first` (PRD-level), `phase_scope` (plan Metadata), and
`visual_first_approval` (methodology, default `auto`) declaration
surfaces added — the foundational, zero-behavior-change scaffolding for
the Figma Visual-First Track (v2): strict visual/logic phase pairing with
a blocking visual gate on deterministic mocks. New
`docs/context/mock-sentinels.md` documents the
`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` convention; the Design Spec's
Visual Acceptance Criteria table gains an optional `Interaction` column;
`gating-structure`'s `SITES` registry extended with
`visual_first_approval`. Part of the Figma Visual-First Track, Phase 1 of
`PRPs/prds/figma-visual-first-track.prd.md`." Match the exact `<code>`
tagging and "Part of ..., Phase N of ..." closing-sentence style of the
sibling entries already in the same list.

**MIRROR**: Pattern 7 (`PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md:157-165`).

**ADDRESSES**: AC-A1 through AC-A7 (documentation of record)

**VALIDATE**: `if grep -q "figma-visual-first-track.prd.md" documentation/changelog.html && grep -q "id=\"unreleased-added\"" documentation/changelog.html; then echo "PASS: changelog Unreleased entry added"; else echo "FAIL: changelog entry missing"; exit 1; fi`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
grep -q "## Visual-First Mode" docs/context/prd-template.md
grep -q "phase_scope" docs/context/plan-template.md
grep -q "| Interaction |" docs/context/design-spec-template.md
grep -q "visual_first_approval: auto" plugins/relay/skills/context-builder/SKILL.md
grep -q "RELAY-MOCK-DATA" docs/context/mock-sentinels.md
grep -q "RELAY-MOCK-BEHAVIOR" docs/context/mock-sentinels.md
grep -q "docs/context/mock-sentinels.md" docs/KNOWLEDGE_BASE.md
echo "PASS: all seven declaration-surface content invariants present"
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
node --check scripts/validate/checks/gating-structure.mjs
git diff --unified=0 development -- scripts/validate/checks/gating-structure.mjs | grep -E "^\+[^+]" | grep -q "visual_first_approval"
node --input-type=module -e "
import { checkGatingStructure } from './scripts/validate/checks/gating-structure.mjs';
import { readFileSync } from 'node:fs';
const skillContent = readFileSync('plugins/relay/skills/context-builder/SKILL.md', 'utf-8');
const result = checkGatingStructure({ skillContent });
const stillFailing = result.findings.some(f => f.message.includes('visual_first_approval'));
if (stillFailing) { console.error('FAIL:', JSON.stringify(result.findings)); process.exit(1); }
console.log('PASS: visual_first_approval site satisfied end-to-end');
"
```

Every command above either exits with the natural non-zero status of a
failing `grep -q`/`node --check`/`npm run validate` under `set -euo
pipefail`, or an explicit `if/then/else/exit 1/fi` — none rely on the
forbidden `<check> && echo "PASS" || echo "FAIL"` idiom, per the
2026-07-09 decision and `plan-reviewer`'s `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given this repo's own `docs/context/methodology.md`
  (which declares no `figma_track` key), when `npm run validate` runs
  after this phase's changes land, then it passes with zero new findings
  and zero visual-first-related output — confirming the new template
  sections, the new methodology key's generation-template default, and
  the new `mock-sentinels.md` doc introduce no behavioral change to any
  existing, non-opted-in project.
- **AC-A2 (PRD AC-1, PRD AC-2):** Given `docs/context/prd-template.md`'s
  new `## Visual-First Mode` section, when a PRD is authored for a
  project without `figma_track: true`, then the section is fully absent
  (not an empty heading) — establishing the dual-branch shape Phase 2's
  `prd-writer`/`prd-reviewer` will read from to enforce strict
  phase-pairing.
- **AC-A3 (PRD AC-2):** Given `docs/context/plan-template.md`'s new
  `phase_scope` Metadata-row registration, when a plan is written for a
  PRD that does not declare `visual_first: true`, then no `phase_scope`
  row appears anywhere in that plan's `## Metadata` table — mirroring
  `design_source`'s proven non-heuristic, never-inferred lineage rather
  than `phase_type`'s self-healing one.
- **AC-A4 (PRD AC-3):** Given the new `docs/context/mock-sentinels.md`,
  when a reader consults it, then both sentinel classes
  (`[RELAY-MOCK-DATA]`, `[RELAY-MOCK-BEHAVIOR]`), the zero-side-effects
  rule for visual phases, and the swap semantics for logic phases are
  fully documented — the contract Phase 3's implementer-facing rules and
  Phase 4's ledger-resolution check will enforce.
- **AC-A5 (PRD AC-5):** Given `docs/context/mock-sentinels.md`'s
  documented "zero remaining" rule, when Phase 4 builds the logic-phase
  sentinel-ledger check, then the "no deferral path" invariant is already
  unambiguously specified — nothing in this phase implements the check
  itself.
- **AC-A6 (PRD AC-4):** Given `docs/context/design-spec-template.md`'s
  new optional `Interaction` column, when an existing, already-APPROVED
  Design Spec (authored before this phase) is re-read, then it remains
  fully valid — the column is optional and additive, never retroactively
  required, preserving "frames without an `Interaction` entry behave
  byte-identically to today."
- **AC-A7 (PRD AC-4):** Given the new `visual_first_approval: auto |
  human` key registered in `plugins/relay/skills/context-builder/SKILL.md`
  and the extended `gating-structure` check, when `npm run validate`
  runs, then the `gating-structure` check verifies all three
  non-heuristic properties (default-`auto`, preserve-on-update,
  backfill-only-when-absent) are documented for `visual_first_approval`
  — extending the same deterministic enforcement `figma_track` already
  has.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `phase_scope`'s exact per-row sourcing mechanism (how `plan-writer` determines whether PRD row N is visual/logic) is not fully specified by this phase — only the Metadata row's shape is registered | Medium | Low | Explicitly deferred to Phase 3 per the PRD's own Phase Details ("plan-writer/plan-reviewer changes for the visual lineage only"); this phase's registration prose forward-references Phase 3 rather than inventing a mechanism |
| `gating-structure.mjs`'s `SITES` registry is hardcoded to a single `SKILL_PATH`; a 2nd entry for `visual_first_approval` fits natively, but `visual_first`/`phase_scope` structurally do not (they live in `prd-template.md`/`plan-template.md`, not `SKILL.md`) | Low | Low | By design — mirrors the `design_source` precedent, which also has no `gating-structure` entry; PRD-level/plan-level non-heuristic fields are enforced by reviewer `R-COH-*` rubric items in later phases, not the static registry |
| The `Interaction` column's bounded vocabulary (`click`/`fill`/`wait`) is specified here but not yet exercised by any real Design Spec or `capture.mjs` — a syntax mismatch could surface only when Phase 5 wires actual execution | Low | Medium | The vocabulary is intentionally minimal (3 verbs) and directly named in the source PRD's own MoSCoW row; Phase 5's own plan re-validates the syntax against `capture.mjs`'s real needs before wiring execution |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
when a test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored. `test_frameworks: ["node:test"]` is declared here, so the pair
is active: `scripts/validate/checks/gating-structure.test.mjs` already
exists (authored test-after following v1 Phase 1's own identically-shaped
foundations phase) — the pair extends it with a case covering the new
`visual_first_approval` `SITES` entry, test-after, once this phase's
implementation lands.

**Research grounding:** the `Task` tool was available in this invocation;
`research-codebase` and `research-web` subagents were dispatched in
parallel per protocol (no direct-Read/Glob fallback was needed). Both
reports are reflected in Mandatory Reading and Patterns to Mirror above.
`research-web`'s pass returned four adjacent findings on non-heuristic
feature-flag design (ConfigCat, Martin Fowler's Feature Toggles, Kent C.
Dodds' "explicit over implicit" principle, ESLint's `no-warning-comments`
sentinel-comment precedent) but explicitly flagged that no source
documents a named convention for inline mock-data sentinel comments, and
that the feature-flag literature targets runtime/SaaS platforms rather
than internal developer-tooling pipeline config — expected for a phase
this internally-scoped; the load-bearing precedent throughout is this
repo's own `figma_track`/`docs_sync`/`design_source` lineage, not
external sources. `research-codebase` also flagged that
`docs/context/plan-template.md:58-59`'s cross-reference to "prd-writer.md
Step 7.4 lines 382-386" for the TDD-routing verbatim strings has drifted
— the strings now sit at prd-writer.md lines 419-421 — noted here as an
observed pre-existing drift, out of scope for this phase to fix.

**mock-sentinels.md content provenance:** no existing repo file
documents an inline mock-sentinel comment convention — confirmed via
`research-codebase`: zero hits repo-wide for "mock-sentinels" or an
equivalent convention doc; the only existing mentions of
`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` prior to this phase are in
the source PRD's own prose. Task 6 therefore authors
`docs/context/mock-sentinels.md`'s CONTENT directly from the source
PRD's own prose (Proposed Solution, MoSCoW "Inline mock sentinel
convention" row, Decisions Log "Sentinel format"/"Sentinel deferral
policy" rows); only the document's STRUCTURAL shape (title, a
scope-framing intro paragraph, and a closing "what this is NOT"
section) is mirrored from an existing file,
`docs/context/redaction-policy.md:1-10,156-168` — see Patterns to
Mirror and Task 6's `MIRROR` line above.

**Scope boundary:** this phase deliberately does NOT extend
`plugins/relay/agents/prd-writer.md`, `prd-reviewer.md`, `plan-writer.md`,
or `plan-reviewer.md` to emit, consume, or validate `visual_first`/
`phase_scope` — those agent-level wiring changes are Phase 2 and Phase 3
of `PRPs/prds/figma-visual-first-track.prd.md` respectively. This phase
registers only the template shapes those later phases will read from and
write into.

**Self-application note:** this plan's own source PRD
(`figma-visual-first-track.prd.md`) does not declare `visual_first: true`,
and this target repo's own `docs/context/methodology.md` does not declare
`figma_track: true` — consistent with the calling context's own framing,
this plan's `## Metadata` table carries no `design_source` row and no
`phase_scope` row; the new v2 machinery is inert against this repo and
against this very plan, by design.

---

*Generated: 2026-07-24*
*Approved: 2026-07-24*
*Implemented: 2026-07-24*
*Status: IMPLEMENTED*
