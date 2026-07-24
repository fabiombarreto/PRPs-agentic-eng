# Component Map Template

Canonical shape of `docs/design/component-map.md` — the versioned,
human-curatable map from a target project's Figma library components
to its real code components. Both `design-map-writer` and
`design-map-reviewer` reference this file as the single authoritative
source for the map's shape, mirroring how `plan-template.md` anchors
`plan-writer`/`plan-reviewer`.

**Provenance:** authored fresh for the Figma Implementation Track
(`PRPs/prds/figma-implementation-track.prd.md` Implementation Phases
row 3, Phase 3 "Component map"). There is no upstream `prp-core`
precedent for this artifact — Figma-to-code component mapping is
outside that plugin's scope.

**Keeping this file authoritative:** any change to the map's shape
(a new column, a new required section) must land here first, then
propagate to `design-map-writer` and `design-map-reviewer` as a
conscious, coordinated edit. Never let the two agents' expectations
of the map's shape drift apart — they must always agree with this
file.

---

## Relay adaptations (mandatory extensions)

1. **`## Conventions` is the P1 interpretation lens.** Unlike a plan
   or PRD, this artifact is designed to be re-read and hand-curated
   by a human designer/developer over the life of a project. The
   `## Conventions` section captures naming-quirk patterns observed
   in the Figma file structure (prefix/suffix conventions,
   variant-naming schemes, component-set groupings) so that later
   phases (Design Spec, Plan Integration) and human curators do not
   have to re-derive the same interpretation lens from scratch every
   time. `design-map-reviewer`'s `R-DM6` enforces that this section
   is non-empty whenever the evidence warrants it.

2. **Honest scoping via `inventory_truncated`.** A Figma library can
   be arbitrarily large; a single `/relay-design-map` run is bounded
   by a search-call budget. Rather than silently presenting a partial
   scan as if it were exhaustive, the map carries an explicit
   `inventory_truncated` marker line (boolean + reason) immediately
   before the trailing status block. `design-map-reviewer`'s `R-DM5`
   enforces that this marker accurately reflects the persisted
   evidence bundle.

3. **`## UNMAPPED` is a first-class section, not an omission.** Every
   Figma component the writer could not confidently match to a real
   code component is recorded here with a reason — never silently
   dropped. `design-map-reviewer`'s `R-DM2` cross-checks every row
   (mapped or unmapped) against the persisted evidence bundle.

4. **Status-line discipline matches every other relay artifact.** The
   map ends with the same `*Generated: <date>*` / `*Status: DRAFT |
   APPROVED*` trailing block used by plans, PRDs, and docs-sync
   manifests — `design-map-writer` writes `DRAFT`;
   `design-map-reviewer` alone performs the `DRAFT` → `APPROVED`
   flip.

---

## Output path

`docs/design/component-map.md`

One map per target project (not per feature, not per phase) — the
map is a durable, cross-feature artifact that accumulates rows over
successive `/relay-design-map --refresh` re-scans. Directory is
created if it doesn't exist. NEVER write under `.claude/` — see
`docs/anti-patterns.md` lines 60–66 and `docs/decisions.md` on the PRP
artifact path convention (the map itself lives under `docs/design/`,
not `PRPs/`, because it is a durable knowledge-base artifact rather
than a per-run pipeline artifact — but the same `.claude/`
never-write rule applies).

---

## Map body — structure

Sections appear in this exact order.

```markdown
# Component Map

## Conventions

<Human-curatable prose. Naming-quirk patterns observed in the Figma
file structure — prefix/suffix conventions, variant-naming schemes,
component-set groupings. Non-empty whenever the evidence warrants an
observation; states "No recurring naming pattern observed" explicitly
when genuinely none was found — never silently empty.>

## Components

| CM-id | Figma component (name/key) | Import path | Props/variant mapping | Confidence | verified_at |
|-------|------------------------------|--------------|------------------------|------------|-------------|
| CM-1  | {Figma name} ({Figma key})   | {import path in the design-system clone} | {prop/variant → Figma property mapping} | CONFIRMED \| INFERRED \| verified:auto | {ISO date or "unverified"} |

## UNMAPPED

| Figma component (name/key) | Reason |
|------------------------------|--------|
| {Figma name} ({Figma key})   | {why no confident code-component match was found} |

inventory_truncated: true | false — {reason when true; "full library scan completed" when false}

---

*Generated: <YYYY-MM-DD>*
*Status: DRAFT | APPROVED*
```

### Column and field reference

- **`CM-id`** — stable identifier, `CM-<n>`, monotonically assigned.
  Never renumbered across `--refresh` re-scans; never reused after a
  row is retired.
- **`Figma component (name/key)`** — the Figma component's
  human-readable name plus its stable Figma key, so the row survives
  a Figma-side rename.
- **`Import path`** — the real import path in the target project's
  design-system clone; `design-map-reviewer`'s `R-DM1` verifies this
  resolves to a real file.
- **`Props/variant mapping`** — the correspondence between the code
  component's props/variants and the Figma component's
  properties/variants; `design-map-reviewer`'s `R-DM3` verifies every
  named prop/variant exists on the real component.
- **`Confidence`** — one of three values:
  - `CONFIRMED` — exact match (name and prop/variant surface both
    correspond).
  - `INFERRED` — best-effort match, flagged for human review.
  - `verified:auto` — a later automated re-verification pass (e.g. a
    future `R-COH-DS-REUSE` code-review check, per
    `PRPs/prds/figma-implementation-track.prd.md` AC-2 / this
    template's Phase 5 forward reference) independently reconfirmed
    the row against a real implementation diff.
- **`verified_at`** — an ISO date once a human curator (or an
  automated re-verification pass) has confirmed the row; `unverified`
  for a freshly-written row. Never invented by the writer agent — it
  is populated only by a later human hand-edit or automated
  re-verification.
- **`inventory_truncated`** — boolean + reason, immediately before the
  trailing status block. `true` whenever the evidence bundle notes a
  truncated/incomplete Figma library scan (e.g. a search-call budget
  reached); `false` only when the scan is genuinely complete.

The map ends with a trailing two-line block, identical in shape to
every other relay artifact's status convention:

```
*Generated: <YYYY-MM-DD>*
*Status: DRAFT*
```

`design-map-reviewer` flips this on rubric pass to:

```
*Generated: <YYYY-MM-DD>*
*Approved: <YYYY-MM-DD>*
*Status: APPROVED*
```

---

## Lifecycle — where this template is consumed

1. **`/relay-design-map` command + `design-map-writer` agent** (Phase
   3 of the Figma Implementation Track) — the command persists a
   Figma evidence bundle to `PRPs/reports/design-map/evidence/`, then
   dispatches `design-map-writer`, which reads this template FIRST,
   matches every Figma component in the evidence bundle against the
   local design-system clone, and writes a DRAFT
   `docs/design/component-map.md` conforming to this shape.

2. **`design-map-reviewer` agent** (Phase 3) — validates the DRAFT
   map against the six-item `R-DM1`–`R-DM6` rubric (import-path
   resolution, evidence cross-reference, prop/variant existence, no
   duplicate keys/ids, honest `inventory_truncated` scoping,
   non-empty `## Conventions` when warranted) and auto-flips
   `*Status: DRAFT*` → `*Status: APPROVED*` on full pass.

3. **Human curator** (ongoing) — the map is designed to be
   hand-edited after approval: correcting an `INFERRED` row,
   populating `verified_at`, resolving an `## UNMAPPED` entry once a
   component is actually built. `/relay-design-map --refresh` re-scans
   additively — it never clobbers a human-verified row's
   `Confidence`/`verified_at` values without re-deriving evidence that
   contradicts them.

4. **Design Spec (Phase 4) and Plan Integration (future phase)** —
   consume the APPROVED map to avoid recreating components that
   already exist in the design system, per this feature's Problem
   Statement.

5. **The `R-COH-DS-REUSE` code-review check** (shipped in
   `plugins/relay/agents/code-reviewer.md`'s R-COH-* coherence layer,
   fulfilling `PRPs/prds/figma-implementation-track.prd.md` AC-2 — a
   gap-closing addition landed after all 7 Implementation Phases rows
   were already `complete`) — enforces, against real implementation
   diffs, that a Figma node the feature's Design Spec `## Component
   Mapping` table classifies `REUSE` (citing a real `CM-<n>` id) is
   not re-created: a plan task whose `## Files to Change` action is
   `CREATE` of a file other than the REUSE row's cited import path
   fails the review, citing that import path verbatim. Zero-emission
   unless `figma_track: true` and the plan's `design_source: figma`.
   This template's `R-DM1` rubric item in `design-map-reviewer` laid
   the structural foundation (import-path resolution) this check
   builds on.
