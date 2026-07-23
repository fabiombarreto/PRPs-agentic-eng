# Feature: Component map (Phase 3 of figma-implementation-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent files in plugins/relay/agents/; new command file in plugins/relay/commands/; cross-cutting artifact creation (component-map.md format that Phases 4-6 consume); documentation/ site registration (three-file rule)
- Decisions found:
  - [2026-04-19] Command surface — writer/reviewer split, one command per stage
  - [2026-04-19] PRP artifacts live under `PRPs/`, never `.claude/`
  - [2026-04-30] Plugin manifest version bumped on every minor/major release cut — an `Unreleased` changelog entry does NOT require a matching `plugin.json` bump
  - [2026-05-11] relay-worktree architecture: D2 shell-out, D4 idempotency via `git worktree list --porcelain`, D6 project-owned bootstrap-hook contract with non-fatal failure — the closest existing precedent for this phase's preflight concept
  - [2026-06-19] `/relay-approve` docs-updater/docs-reviewer pair design — the closest existing writer/reviewer precedent for a "scan evidence, write a surgical additive doc, get reviewed" agent shape
  - [2026-07-22] MCP-access spike (this feature's own Phase 2) — confirms Figma MCP tools are reachable from subagents, but the retained baseline keeps MCP calls in the interactive command only
- Applicable anti-patterns:
  - Activating any pipeline track by heuristic (must be explicit declaration only) — this phase's confirmation-flip of `figma_track: true` must be an explicit, quoted human confirmation, never inferred
  - Writing pipeline artifacts under `.claude/` — evidence bundles and the map itself go under `PRPs/reports/` and `docs/design/` respectively, never `.claude/`
- Applicable architectural rules:
  - `documentation/AGENTS.md`'s three-file registration rule (search-index.json + changelog.html + NAV) is binding for any new command/agent
  - `docs/decision-gate.md` — new command must emit its own Decision Gate evidence block
  - Writer/reviewer split: reviewer alone owns the DRAFT→APPROVED flip
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-implementation-track.prd.md` — Implementation Phases row 3:
  "Component map" — Goal: Give every Figma-enabled project a versioned, human-curatable map from Figma library components to real code components. — Success
  signal: A real project's component map is APPROVED and committed; `figma_track: true` is flipped.

## Summary

This phase authors the first user-facing surface of the Figma track: a new `/relay-design-map` command plus a `design-map-writer`/`design-map-reviewer` agent pair that together build `docs/design/component-map.md` — a versioned, human-curatable table mapping Figma library components to real code components in a target project's design system. The command owns all Figma MCP querying (per the Phase 2 decision — MCP calls stay in interactive commands, never in the dispatched agents) and persists evidence bundles to disk; `design-map-writer` is a pure file-interpreter over that persisted evidence plus the design-system clone source; `design-map-reviewer` validates the map against the same persisted evidence (MCP-free) and never auto-flips — the command's own preflight step requires an explicit, quoted human confirmation before flipping `figma_track: true`. A new canonical template, `docs/context/component-map-template.md`, defines the map's exact shape (component-key rows, `CM-<n>` identifiers, Conventions section, UNMAPPED section, truncation marker) so both agents reference one authoritative source, mirroring how `plan-template.md` anchors `plan-writer`/`plan-reviewer`.

## User Story

As a developer setting up the Figma track for a real project for the first time, I want a single command that builds and validates a reusable component map from my project's Figma library, so that every later feature avoids recreating components that already exist in my design system.

## Problem Statement

Frontend developers implementing Figma-designed layouts have no structured way to know which parts of a design already exist as real code components versus which are genuinely new — AI tooling without this mapping reliably invents duplicate components, fragmenting the design system over time (confirmed by market research: only 1 of 5 surveyed design-to-code tools meaningfully reuses existing components). This phase builds the reusable mapping infrastructure that later phases (Design Spec, Plan Integration) consume to enforce reuse.

## Solution Statement

A new command (`/relay-design-map`) performs the Figma library queries itself (in the main session, per the Phase 2 decision), persists the raw evidence to disk, then dispatches `design-map-writer` (a pure evidence-interpreter, no MCP access) to draft `docs/design/component-map.md` against the canonical `docs/context/component-map-template.md` shape, then dispatches `design-map-reviewer` (also MCP-free, verifying only against persisted evidence and the local design-system clone) in a bounded retry loop. On APPROVED, the command prints a preflight report (visual-tooling dependency check, dry-run boot) and requires the user's own explicit, quoted confirmation before flipping `figma_track: true` in `docs/context/methodology.md` — this is a per-project, one-time, human-gated action, never automatic.

## Metadata

| Field | Value |
|---|---|
| Type | New command + new agent pair (prompt/config files) |
| Complexity | High |
| Systems Affected | `plugins/relay/agents/`, `plugins/relay/commands/`, `docs/context/`, `documentation/` |
| Dependencies | Phase 1 (Foundations) — complete; Phase 2 (MCP-access spike) — complete |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/figma-implementation-track.prd.md` Implementation Phases row 3 |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/docs-updater.md` | 1-149 | Closest existing writer precedent — `tools:` allowlist shape, `## Inputs` table format, DRAFT-only status discipline (never self-flips) |
| P0 | `plugins/relay/agents/docs-reviewer.md` | 1-157 | Closest existing reviewer precedent — no-short-circuit rubric shape, append-then-Edit ordering discipline, two-line status flip |
| P0 | `plugins/relay/commands/relay-worktree.md` | 1-190 | Closest existing infra-command precedent — named HALT codes, idempotency via authoritative state (not path-existence), preflight/precondition structure |
| P0 | `docs/context/plan-template.md` | 1-70 | How an existing canonical-template file frames its own authority and "mandatory extensions" registration slot — the pattern `component-map-template.md` follows |
| P1 | `documentation/AGENTS.md` | (full) | Binding contract for any documentation/ change — three-file registration rule, page template |
| P1 | `scripts/validate/checks/registration-parity.mjs` | 53-123 | Exact string-matching logic the new command/agent names must satisfy in search-index.json/changelog.html |
| P1 | `scripts/validate/checks/dispatch-graph.mjs` | 33-102 | Exact `subagent_type:`/`Next:` pointer matching the new command file must satisfy |
| P2 | `PRPs/plans/completed/figma-implementation-track-phase-2-mcp-access-spike.plan.md` | (full) | This feature's own prior phase — confirms the MCP-access architecture this phase's command implements |
| P2 | `docs/decisions.md` | (Figma MCP entry, 2026-07-22) | The operative MCP-access-point decision this command's design directly implements |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/docs-updater.md:6-7
tools: Read, Write, Edit, Glob, Grep, Bash
```
Copied into Task 1 (`design-map-writer`) as the tools-allowlist shape — adjusted to exclude `Bash` (the writer never queries Figma or runs shell commands; it only reads persisted evidence + the design-system clone and writes the map).

```
# SOURCE: plugins/relay/agents/docs-reviewer.md:119-157
[Append-only jsonl write BEFORE the two-line status-flip Edit; mandatory
re-Read of the manifest immediately before the Edit to avoid stale-cache
failures; Edit used ONLY for the flip, Write ONLY for the jsonl log.]
```
Copied into Task 2 (`design-map-reviewer`) as the exact flip-ordering discipline.

```
# SOURCE: plugins/relay/commands/relay-worktree.md:102-190
[Named HALT codes (FAILED_*), each with a verbatim actionable message;
idempotency checked via authoritative state (git worktree list --porcelain),
never path-existence alone; "No artifact is written and no operation is
performed on HALT."]
```
Copied into Task 3 (`relay-design-map` command) as the preflight/precondition structure.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/design-map-writer.md` | CREATE | New writer agent — builds `component-map.md` from persisted evidence |
| `plugins/relay/agents/design-map-reviewer.md` | CREATE | New reviewer agent — validates the map, owns the DRAFT→APPROVED flip |
| `plugins/relay/commands/relay-design-map.md` | CREATE | New command — owns Figma MCP querying, evidence persistence, preflight, and the explicit `figma_track` confirmation |
| `docs/context/component-map-template.md` | CREATE | Canonical `component-map.md` shape both agents reference as authoritative |
| `documentation/assets/data/search-index.json` | UPDATE | Register `/relay-design-map`, `design-map-writer`, `design-map-reviewer` |
| `documentation/changelog.html` | UPDATE | `Unreleased` entry describing the three new files |
| `documentation/reference/commands.html` + `documentation/reference/agents.html` | UPDATE | Add entries for the new command and two agents in the existing listing shape |

## NOT Building (Scope Limits)

- **Actually running `/relay-design-map` against a real target project** — this phase authors the prompt files; a real dogfood run is Phase 7's job.
- **Code Connect write-back** — recorded as a Could-item in the PRD; not built here.
- **The scratch-worktree dry-run boot's actual visual-tooling dependency install** — that tooling (`plugins/relay/scripts/visual/`) is Phase 6's deliverable; this phase's preflight step checks for its future presence gracefully (absent-tooling is a documented, non-blocking note, not a hard dependency of this phase).
- **Any change to `docs/context/methodology.md` in THIS repo** — the `figma_track` confirmation flip is a per-target-project action performed by a human running the command against their own project; this phase does not flip it here.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/agents/design-map-writer.md

**ACTION**: Author a new agent file with frontmatter `{name: design-map-writer, description: <one paragraph — writes docs/design/component-map.md from persisted Figma evidence + the local design-system clone; never queries the Figma MCP directly; never approves its own output>, model: sonnet, color: orange, tools: Read, Write, Edit, Glob, Grep}`. Body sections, mirroring `docs-updater.md`'s structure: (1) role statement ("You are the Design Map Writer agent... You do NOT query the Figma MCP. You do NOT approve your own output."); (2) `## Inputs` table: `target_root`, `design_system_config` (parsed from `docs/context/design-system.md` frontmatter — package name, local clone path, token module path), `evidence_dir` (the command-persisted Figma query results); (3) Hard constraints (never invents a mapping without evidence; every REUSE row cites a component actually found in the design-system clone via `Glob`/`Grep`; every row not found becomes an `## UNMAPPED` entry with a reason, never silently dropped; loads `docs/context/component-map-template.md` FIRST as the authoritative output shape); (4) Protocol: Step 1 read the evidence bundle + design-system clone source; Step 2 for each Figma component in evidence, search the clone for a matching export (by name similarity + prop shape), assign a stable `CM-<n>` id (never reuse a retired id), classify `CONFIRMED` (exact match) or `INFERRED` (best-effort match, needs human review) or route to `## UNMAPPED`; Step 3 write a `## Conventions` section capturing any naming-quirk patterns observed in the Figma file structure (the interpretation lens future phases reuse); Step 4 write `docs/design/component-map.md` conforming to `component-map-template.md`, trailing `*Status: DRAFT*`; (5) Anti-patterns (never invents a CM-id without evidence; never silently drops an unmatched component; never touches the Figma MCP).

**MIRROR**: `plugins/relay/agents/docs-updater.md:6-7` (tools shape), `docs-updater.md` overall structure (P0 Mandatory Reading).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "^name: design-map-writer" plugins/relay/agents/design-map-writer.md && grep -q "component-map-template.md" plugins/relay/agents/design-map-writer.md`

### Task 2: CREATE plugins/relay/agents/design-map-reviewer.md

**ACTION**: Author a new agent file with frontmatter `{name: design-map-reviewer, description: <one paragraph — validates a DRAFT component-map.md against evidence + the design-system clone; owns the DRAFT->APPROVED flip; MCP-free>, model: sonnet, color: cyan, tools: Read, Edit, Write}`. Body, mirroring `docs-reviewer.md`: (1) role statement; (2) `## Inputs` table: `map_path`, `target_root`, `evidence_dir`; (3) the six-item rubric (R-DM1 every import path resolves in the design-system clone; R-DM2 every Figma reference resolves against persisted evidence — a search hit or Code Connect entry; R-DM3 every mapped prop/variant exists in the component's actual TypeScript props per the clone source; R-DM4 no duplicate Figma keys and no duplicate `CM-<n>` ids; R-DM5 scoped honestly to the inventoried subset of the Figma library, with any truncation explicitly recorded rather than silently claiming completeness; R-DM6 the `## Conventions` section is non-empty when the writer's evidence included at least one naming-quirk observation) — no short-circuit, all 6 always evaluated; (4) Protocol: Step 1 load + verify `*Status: DRAFT*`; Step 2 run R-DM1-R-DM6, recording pass/fail with reasons; Step 3 branch — all pass → Step 4 (re-validate fresh, append APPROVED to `docs/design/component-map-review.jsonl`, two-line Edit flip `*Status: DRAFT*` → `*Approved: <date>*\n*Status: APPROVED*`, exact ordering: jsonl Write before the Edit, re-Read immediately before the Edit); any fail → append CHANGES_REQUESTED with per-item reasons, leave file untouched, exit (no dialogue loop — same interactivity-boundary reasoning as `plan-reviewer`, since map review happens after the human already reviewed the persisted evidence at command level); (5) Anti-patterns (never queries the Figma MCP; never flips without full rubric pass; never rewrites the map body — Edit only for the two-line flip).

**MIRROR**: `plugins/relay/agents/docs-reviewer.md:119-157` (flip-ordering discipline), `docs-reviewer.md` overall rubric/protocol structure.

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "^name: design-map-reviewer" plugins/relay/agents/design-map-reviewer.md && grep -c "R-DM" plugins/relay/agents/design-map-reviewer.md | grep -qv "^0$"`

### Task 3: CREATE plugins/relay/commands/relay-design-map.md

**ACTION**: Author a new command file, frontmatter `{description: <one paragraph matching the PRD row 3 description>, argument-hint: [--refresh]}` (no `name` key — schema forbids it). Body sections mirroring `relay-worktree.md`'s shape: (1) mission statement; (2) Decision Gate block (per `docs/decision-gate.md`); (3) Parse arguments (`--refresh` flag; when absent, this is the one-time setup path; when present, additive re-scan); (4) Preconditions with named HALT codes: `FAILED_FIGMA_MCP_UNAVAILABLE` (Figma MCP tools not discoverable via `ToolSearch` in the main session — HALT with connection instructions, never silently degrade), `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` (no `docs/context/design-system.md` — direct the user to run `context-builder *update` first, or offer to run it inline); (5) Phase A — ensure `docs/context/design-system.md` exists (read its frontmatter: package name, clone path, Figma library file keys, `dev_server` block); (6) Phase B — query the Figma library in the main session (`search_design_system` + node-scoped `get_metadata`, budget `max_library_search_calls=40`; `get_code_connect_map` read opportunistically — any error recorded as `code_connect: unavailable(<error class>)` in the map header and the run continues, never fatal), persist evidence bundles to `PRPs/reports/design-map/evidence/`; (7) Phase C — dispatch `design-map-writer` then `design-map-reviewer` via `Task`, in a `max_map_review_retries=2` bounded loop (mirroring `/relay-implement`'s retry-loop shape); on budget exhaustion, HALT loudly listing the failing R-DM items — never silently accept a failing map; (8) Phase D — preflight report: check `node` present, `scripts/visual/` deps installable (best-effort `npm install --prefix` dry-run; absence is a documented note, not a HALT, since Phase 6 has not shipped that tooling yet), dev script exists per `design-system.md`'s `dev_server` config, configured port free; (9) Phase E — on APPROVED map + preflight, print a summary and ask for the user's own explicit, quoted confirmation before performing a single `Edit` flipping `figma_track: true` in the target project's `docs/context/methodology.md` — this is the ONLY sanctioned non-human-edit path to flip that key (per Phase 1's Decision Gate); never flip without it; (10) Final output surface + Constraints + What you do NOT do sections, matching the sibling commands' shape.

**MIRROR**: `plugins/relay/commands/relay-worktree.md:102-190` (HALT-code + preflight structure), `plugins/relay/commands/relay-implement.md` Phase A.3.5's bounded-retry-loop shape (already read in Phase 1/2 of this session).

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**: `grep -q "subagent_type.*design-map-writer" plugins/relay/commands/relay-design-map.md && grep -q "subagent_type.*design-map-reviewer" plugins/relay/commands/relay-design-map.md && grep -q "argument-hint" plugins/relay/commands/relay-design-map.md`

### Task 4: CREATE docs/context/component-map-template.md

**ACTION**: Author the canonical template file, mirroring `docs/context/plan-template.md`'s framing (a "Relay adaptations" preamble + an exact fenced body-shape block + a "Lifecycle — where this template is consumed" closing section). Define: a `Component Map` heading; a `## Conventions` section (the P1 interpretation-lens content, human-curatable prose); a component table with columns `CM-id | Figma component (name/key) | Import path | Props/variant mapping | Confidence (CONFIRMED\|INFERRED\|verified:auto) | verified_at`; a `## UNMAPPED` section (Figma component name/key + reason, table shape); an `inventory_truncated` marker line (boolean + reason, for R-DM5 honesty); trailing `*Generated: <date>*` / `*Status: DRAFT | APPROVED*` lines matching every other relay artifact's status-line convention.

**MIRROR**: `docs/context/plan-template.md:1-70` (template-authority framing).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "CM-id" docs/context/component-map-template.md && grep -q "UNMAPPED" docs/context/component-map-template.md && grep -q "Status: DRAFT" docs/context/component-map-template.md`

### Task 5: UPDATE documentation/assets/data/search-index.json

**ACTION**: Add three entries following the existing entry shape (one per existing command/agent entry pattern already in the file): `/relay-design-map`, `design-map-writer`, `design-map-reviewer` — each with a short description matching the agent/command's frontmatter description, and a link to wherever `reference/commands.html`/`reference/agents.html` will anchor them (Task 7).

**MIRROR**: an existing command entry and an existing agent entry already present in `documentation/assets/data/search-index.json` (read the file directly for the exact JSON shape before editing — MIRROR snippet omitted here since the file's real current shape is the source of truth, not a stale copy).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "relay-design-map" documentation/assets/data/search-index.json && grep -q "design-map-writer" documentation/assets/data/search-index.json && grep -q "design-map-reviewer" documentation/assets/data/search-index.json`

### Task 6: UPDATE documentation/changelog.html

**ACTION**: Add a list entry under the `Unreleased` section (created by Phase 1/2's docs-sync if not already present) describing: "`/relay-design-map` command + `design-map-writer`/`design-map-reviewer` agent pair added — builds and validates a per-project versioned Figma-to-code component map (`docs/design/component-map.md`), gated behind an explicit `figma_track: true` confirmation. Part of the Figma Implementation Track, Phase 3 of `PRPs/prds/figma-implementation-track.prd.md`." No new versioned `<h2>` heading; no `plugin.json` bump.

**MIRROR**: the existing `Unreleased` entry shape from Phase 1/2's docs-sync passes (read the file directly for its current exact state).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -qi "relay-design-map" documentation/changelog.html && grep -q "id=\"unreleased\"" documentation/changelog.html`

### Task 7: UPDATE documentation/reference/commands.html + documentation/reference/agents.html

**ACTION**: Add one entry to `reference/commands.html`'s command listing for `/relay-design-map` (description, input, output, composes-with fields matching the existing table/list shape on that page) and two entries to `reference/agents.html`'s agent listing for `design-map-writer` and `design-map-reviewer` (role, color, tools). Follow `documentation/AGENTS.md`'s page-template conventions exactly — read the existing page content first and match its real current structure rather than inventing a new shape.

**MIRROR**: existing command/agent entries on both pages (read directly — the pages' real current shape is authoritative).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "relay-design-map" documentation/reference/commands.html && grep -q "design-map-writer" documentation/reference/agents.html && grep -q "design-map-reviewer" documentation/reference/agents.html`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
if grep -q "^name: design-map-writer" plugins/relay/agents/design-map-writer.md && grep -q "^name: design-map-reviewer" plugins/relay/agents/design-map-reviewer.md; then
  echo "PASS: both new agent files have correct name frontmatter"
else
  echo "FAIL: agent frontmatter name mismatch"; exit 1
fi
if grep -q "argument-hint" plugins/relay/commands/relay-design-map.md; then
  echo "PASS: command frontmatter present"
else
  echo "FAIL: command frontmatter missing argument-hint"; exit 1
fi
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
node -e "
const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('documentation/assets/data/search-index.json', 'utf8'));
const text = JSON.stringify(idx);
for (const name of ['relay-design-map', 'design-map-writer', 'design-map-reviewer']) {
  if (!text.includes(name)) { console.error('FAIL: ' + name + ' not registered in search-index.json'); process.exit(1); }
}
console.log('PASS: search-index.json is valid JSON and all three names are registered');
"
# Excludes the standard quoted-prohibition idiom ("... MUST NOT appear ...") already
# used verbatim by 7 APPROVED agent files in this repo (docs-updater.md, docs-reviewer.md,
# plan-writer.md, plan-reviewer.md, prd-reviewer.md, test-writer.md, code-reviewer.md) --
# R6's own sanctioned exception. Only a real introduced write-target reference should fail.
if git diff --unified=0 development -- plugins/relay/agents/design-map-writer.md plugins/relay/agents/design-map-reviewer.md plugins/relay/commands/relay-design-map.md docs/context/component-map-template.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced outside quoted prohibitions"
fi
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given this phase's new command and agent files, when `figma_track` is absent or `false` on any project (this repo included), then none of the three new files are ever dispatched or invoked by any other command — `npm run validate` passes with zero new gated-emission findings, confirming the phase stays fully inert until a human explicitly runs `/relay-design-map`.
- **AC-A2 (PRD AC-2):** Given a `component-map.md` produced by `design-map-writer` cites a `CONFIRMED` or `INFERRED` row for a Figma component, when `design-map-reviewer` runs R-DM1, then the cited import path is verified to actually resolve in the design-system clone source before the map can reach `APPROVED` — laying the structural foundation Phase 5's `R-COH-DS-REUSE` code-review check will enforce against real implementation diffs.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The new agent/command files, written without a live target project to test against, may not survive first real-world dogfood unchanged | M | Medium | Explicitly expected and acceptable — Phase 7's end-to-end dogfood is the designated point to surface and fix real-world gaps; this phase's job is a structurally sound, protocol-conforming first draft, not a battle-tested final version |
| `documentation/reference/commands.html`/`agents.html`'s real current structure may differ from what research summarized | L | Low | Task 7's MIRROR step explicitly reads the files fresh before editing rather than trusting cached research findings |
| Preflight step (Task 3, Phase D) references `scripts/visual/` tooling that does not exist until Phase 6 | L | Low | Explicitly designed as a graceful, non-blocking note (see NOT Building) — the command's preflight degrades honestly rather than failing on a dependency two phases in the future |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` is declared, so the pair is active test-after; given all deliverables here are prompt/config/doc-site files (mirroring Phase 1's `phase_type: scaffold` precedent), any resulting test coverage is expected to be structural (content-invariant assertions via `readFileSync`, mirroring `docs-sync-phase2.test.mjs`'s idiom), not behavioral unit tests.

Scope note: this is the largest single phase so far in this feature (7 tasks, 2 new agents + 1 new command + 1 new template + 3 doc-site registrations) — deliberately kept as one plan rather than split, because all seven pieces are tightly coupled (the command cannot be validated without both agents existing, and registration is meaningless without the command). Phase 4 (Design Spec) is comparably sized and will follow the identical structural pattern established here.

**Bounded post-approval correction (attempt 1 → attempt 2):** the Level 3 forbidden-path check false-positived on the new agent files' own correctly-worded anti-pattern warnings (the standard "... MUST NOT appear ..." quoted-prohibition sentence, already used verbatim by 7 other APPROVED agent files in this repo). Corrected to exclude that established idiom. Same defect class as Phase 2's attempt-1 correction (over-broad Level-3 pattern matching), different root cause (quoted-prohibition text this time, not pre-existing unrelated prose) — both now resolved by more precise diff-scoped filtering rather than a blanket whole-file check.

---

*Generated: 2026-07-22*
*Approved: 2026-07-22*
*Status: APPROVED*
