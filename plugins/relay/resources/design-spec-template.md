# Design Spec Template

Canonical shape of `PRPs/designs/<feature>/design-spec.md` — the
human-approved, business-grounded, evidence-backed intermediate
contract that turns one feature's Figma design into something every
downstream, fully-autonomous phase of the pipeline can trust blindly.
Both `design-spec-writer` and `design-spec-reviewer` reference this
file as the single authoritative source for the spec's shape,
mirroring how `${CLAUDE_PLUGIN_ROOT}/resources/prd-template.md` anchors
`prd-writer`/`prd-reviewer` and
`${CLAUDE_PLUGIN_ROOT}/resources/component-map-template.md` anchors
`design-map-writer`/`design-map-reviewer`.

**Provenance:** this template has no upstream fork — it is
relay-original, unlike `${CLAUDE_PLUGIN_ROOT}/resources/prd-template.md`
(a fork of `plugins/prp-core/commands/prp-prd.md`) and
`${CLAUDE_PLUGIN_ROOT}/resources/plan-template.md`.
Figma-to-business-interpretation is outside `prp-core`'s scope,
exactly as `${CLAUDE_PLUGIN_ROOT}/resources/component-map-template.md`
records for its own artifact.

**Keeping this file authoritative:** any change to the spec's shape (a
new section, a new required column) must land here first, then
propagate to `design-spec-writer` and `design-spec-reviewer` as a
conscious, coordinated edit. Never let the two agents' expectations of
the spec's shape drift apart — they must always agree with this file.

---

## Output path

`PRPs/designs/<feature>/design-spec.md`

One Design Spec per feature (not per project — contrast
`component-map.md`, which is one per project). Sibling paths under the
same feature directory: `PRPs/designs/<feature>/raw/` (persisted Figma
evidence, one file per traversed node plus `variables.json`),
`PRPs/designs/<feature>/refs/` (reference screenshots, one PNG per
in-scope frame), and `PRPs/designs/<feature>/design-spec-review.jsonl`
(the reviewer's append-only verdict log). Directory is created if it
doesn't exist. NEVER write under `.claude/` — see
`docs/anti-patterns.md` ("Writing pipeline artifacts under .claude/") and
`docs/decisions.md` on the PRP artifact path convention.

---

## Design Spec body — structure

Sections appear in this exact order. Empty subsections are marked
`TBD - needs validation` rather than filled with filler; unresolved
ambiguity is recorded as an explicit `ASSUMPTION` row, never silently
dropped.

```markdown
# {Feature Name} — Design Spec

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: {list}
- Decisions found: {list or "none"}
- Applicable anti-patterns: {list or "none"}
- Applicable architectural rules: {list or "none"}
- Result: PROCEED | HALT (reason)
```

## Source

- **Figma URL:** {the confirmed URL}
- **File key:** {Figma file key}
- **Normalized node-id(s):** {`123:456` form — never the URL-safe `123-456` form}
- **Name-path(s):** {e.g. `Checkout / Confirmation / Default`}
- **Capture date:** {ISO date the traversal ran}
- **Feature slug:** {`<feature>`}

## Frame Inventory

| Node-id | Name-path | Phase assignment |
|---------|-----------|-------------------|
| {node-id} | {name-path} | {PRD phase number, when this spec was born from a multi-phase PRD — omit this column entirely when not applicable} |

## Component Mapping

| Verdict | Node-id | Name-path | Evidence |
|---------|---------|-----------|----------|
| REUSE | {node-id} | {name-path} | `CM-<n>` ({resolved import path}) |
| NEW | {node-id} | {name-path} | {what was searched, where, why no match was found} |
| ASSUMPTION | {node-id} | {name-path} | {the assumption made, and why — used only after the writer's bounded Q&A stuck-detection converts a remaining AMBIGUOUS item} |

## Token Map

| Token/value | Category | Resolution |
|-------------|----------|------------|
| {color/spacing/font value observed in the design} | {color \| spacing \| typography} | {resolved token name} or {explicit raw-value justification} |

## Implementation Delta

| Verdict | Target | Evidence |
|---------|--------|----------|
| EXISTS | {component/module name} | `{file}:{line}` |
| NEW | {component/module name} | {what was searched, where, why no match was found} |

## Behavioral Notes

{Prose: interaction behavior, state transitions, edge cases observed
in the Figma design or clarified during the batched Q&A. Every
ASSUMPTION row from Component Mapping that concerns behavior (rather
than a component/token choice) is elaborated here.}

## Visual Acceptance Criteria

Per frame:

| Frame (node-id) | Route | Preconditions | Auth mode | Viewport | Diff threshold | Ref PNG (path + dims) | Masks | Interaction |
|-------------------|-------|----------------|-----------|----------|------------------|--------------------------|-------|-------------|
| {node-id} | {route} | {preconditions} | {auth mode} | {viewport} | {diff threshold} | `PRPs/designs/<feature>/refs/<node-id>.png` ({W}x{H}) | {optional masks, or "none"} | {optional ordered interaction script — semicolon-separated steps from the bounded vocabulary click(<selector>), fill(<selector>, <value>), wait(<ms> \| <selector>), executed in order before capture; or "none"} |

---

*Generated: {timestamp}*
*Status: DRAFT | APPROVED*
```

### Section reference

- **`## Source`** — the confirmed Figma URL, file key, normalized
  node-id(s) (canonical `123:456` form, never the URL-safe `123-456`
  form the writer converts away from during traversal), name-path(s),
  capture date, and the feature slug this spec was authored for.
- **`## Frame Inventory`** — every in-scope frame from the writer's
  `max_figma_nodes = 20`-bounded traversal. The `Phase assignment`
  column is present ONLY when this spec was born from a multi-phase
  PRD (i.e., the feature's own PRD has more than one Implementation
  Phases row and the spec's scope maps to a specific one); omit the
  column entirely otherwise — never leave it present-but-empty.
- **`## Component Mapping`** — every subtree classified `REUSE` (citing
  a real `CM-<n>` id resolvable in `docs/design/component-map.md`),
  `NEW` (citing a persisted failed-search record), or `ASSUMPTION`
  (only for a subtree that was `AMBIGUOUS` through the writer's Phase
  3/4 and reached the batched-Q&A stuck-detection threshold — never a
  substitute for genuine classification effort).
- **`## Token Map`** — an EMBEDDED table, not a pointer to
  `raw/variables.json`. Every color/spacing/font value observed in the
  design either resolves to a real design-system token or carries an
  explicit raw-value justification. This is the artifact of record;
  `design-spec-reviewer`'s R-DS4 enforces both the embedding and the
  resolution/justification discipline.
- **`## Implementation Delta`** — `EXISTS` rows cite a real
  `file:line` in the target project (verified by `design-spec-reviewer`'s
  R-DS5); `NEW` rows cite a persisted failed-search record, mirroring
  Component Mapping's `NEW` discipline but scoped to the
  implementation (rather than the design-system component) surface.
- **`## Behavioral Notes`** — prose, not a table. Captures interaction
  behavior and state transitions the static frame inventory alone
  cannot express, plus elaboration of any behavior-related
  `ASSUMPTION` row.
- **`## Visual Acceptance Criteria`** — one row per frame, all eight
  original fields present and non-empty (Frame (node-id), route,
  preconditions, auth mode, viewport, diff threshold, reference PNG
  path + dimensions, optional masks) — this completeness scope is
  UNCHANGED by the 9th,
  optional `Interaction` column below; `design-spec-reviewer`'s R-DS7
  continues to enforce exactly the same eight-field scope, never the
  9th. `Interaction` is optional and additive, never retroactively
  required on an already-APPROVED spec — quoting
  `PRPs/prds/figma-visual-first-track.prd.md`'s own "What We're NOT
  Building" guarantee verbatim: "frames without an `Interaction`
  entry behave byte-identically to today." This phase registers only
  the column's shape and bounded vocabulary syntax — it does NOT wire
  `design-spec-writer`, `design-spec-reviewer`, or `capture.mjs` to
  author, validate, or execute the column; that wiring is deferred to
  a future phase of `PRPs/prds/figma-visual-first-track.prd.md`. This
  is the objective, machine-checkable fidelity contract a future
  Phase 6 visual-verification loop will consume — `design-spec-reviewer`'s
  R-DS7 enforces completeness now, before that loop exists.

The spec ends with the same trailing two-line block used by every
other relay artifact:

```
*Generated: <YYYY-MM-DD>*
*Status: DRAFT*
```

`design-spec-reviewer` flips this on rubric pass AND the user's
explicit approval to:

```
*Generated: <YYYY-MM-DD>*
*Approved: <YYYY-MM-DD>*
*Status: APPROVED*
```

---

## Lifecycle — where this template is consumed

1. **`/relay-design-spec` command + `design-spec-writer` agent**
   (Phase 4 of the Figma Implementation Track) — the command adopts
   `design-spec-writer` inline (never `Task`-dispatched); the Writer
   reads this template FIRST, performs the Figma MCP traversal itself
   in this session, persists evidence to
   `PRPs/designs/<feature>/raw/` and reference screenshots to
   `PRPs/designs/<feature>/refs/`, runs a bounded batched Q&A round
   for genuinely ambiguous regions, and writes a DRAFT
   `PRPs/designs/<feature>/design-spec.md` conforming to this shape.

2. **`design-spec-reviewer` agent** (Phase 4) — adopted inline
   (`invocation_context: main`) immediately after the Writer hands
   off. Validates the DRAFT against the seven-item `R-DS1`–`R-DS7`
   rubric (reference-screenshot completeness, REUSE
   evidence/import resolution, NEW search-miss evidence, token
   resolution/justification, spot-verifiable implementation-delta
   claims, zero unresolved AMBIGUOUS items, objective per-frame
   fidelity criteria), MCP-free — verified only against the persisted
   evidence bundle and the local design-system clone. On full pass,
   asks the user directly "Aprovar o Design Spec?" and flips
   `*Status: DRAFT*` → `*Status: APPROVED*` ONLY after the user's own
   explicit affirmative reply — the single point of human contact with
   the raw Figma interpretation.

3. **A future Phase 5 (Plan Integration)** — will wire the APPROVED
   Design Spec into `plan-writer`/`prd-writer` via a `design_source`
   field and a `## Design Source` plan/PRD section, per this feature's
   own scope note. Not built by this phase.

4. **A future Phase 6 (visual verification)** — will consume the
   `## Visual Acceptance Criteria` section's reference screenshots and
   diff thresholds to close the loop between the approved intent and
   the rendered implementation. This phase only captures and persists
   the references; the verification loop itself is out of scope here.
