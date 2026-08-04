# Feature: Scoped scan + metadata budget (Phase 2 of figma-quota-resilience)

```
**Decision Gate**
- Active context: none
- Activated criteria: prose-only modification to an existing `figma_track`-gated standalone command (`/relay-design-map`); no new agent, no new Decision Gate entry; the new local pre-match must stay inside the command's own session, never a dispatched agent
- Decisions found:
  - [2026-07-22] MCP-access spike — Figma MCP tools are reachable from Task-dispatched subagents, but the baseline architecture is retained: all Figma MCP calls (and, by direct extension, this phase's Glob/Grep pre-match, which issues zero Figma calls of its own) stay in the interactive command's own session, never in a dispatched agent (`docs/decisions.md:741-749`).
  - [2026-07-23] `docs/context/design-system.md` is command-owned, scaffolded by `/relay-design-map`'s P2 precondition — `design_system_config.local_clone_path`, the exact path this phase's pre-match searches, is the same config `/relay-design-map` already loads in Phase A (`docs/decisions.md:836-844`).
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/` — the evidence bundle this phase extends already lives at `PRPs/reports/design-map/evidence/`; nothing in this phase writes anywhere else.
  - [2026-04-19] Command surface: one command per stage, writer and reviewer split — this phase modifies only the command (`relay-design-map.md`); the dispatched `design-map-writer`/`design-map-reviewer` pair is unchanged (zero files of theirs are edited).
- Applicable anti-patterns:
  - "Querying the Figma MCP from a dispatched writer/reviewer agent" (`docs/anti-patterns.md:98-103`) — the new pre-match step must not widen `design-map-writer`'s or `design-map-reviewer`'s tool allowlist; it runs entirely inside `/relay-design-map`'s own session via `Glob`/`Grep`, issuing zero Figma MCP calls itself.
  - "Writing pipeline artifacts under `.claude/`" — the evidence bundle stays at `PRPs/reports/design-map/evidence/`; nothing in this phase writes under `.claude/`.
  - "Injecting plugin defaults into the target project's `decisions.md`" — `max_metadata_calls` is hardcoded in the command body/frontmatter, never written into any target project's `docs/decisions.md`.
- Applicable architectural rules:
  - `docs/context/architecture.md` — "`/relay-design-map` dispatches an MCP-free writer/reviewer pair" — unchanged by this phase; the pair's tool allowlists are not touched.
  - `docs/context/architecture.md` — `${CLAUDE_PLUGIN_ROOT}` resolves to `plugins/relay/`, and plugin install is a verbatim directory copy; the packaged resource form is `${CLAUDE_PLUGIN_ROOT}/resources/<name>.md` (Phase 1, complete). This phase adds no new resource reference, so the form is not exercised here, but any prose this phase writes must not reintroduce the pre-Phase-1 `${CLAUDE_PLUGIN_ROOT}/docs/context/…` form.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-quota-resilience.prd.md` — Implementation Phases row 2:
  "Scoped scan + metadata budget" — Goal: Phase B stops
  enumerating-then-enriching everything — Success signal: A run on a
  ~7000-component library issues `get_metadata` proportional to the
  candidate set, bounded by the budget, with both counts recorded.

## Summary

Phase 2 of `figma-quota-resilience` rewrites `/relay-design-map`'s
Phase B (`plugins/relay/commands/relay-design-map.md`) so the
load-bearing `get_metadata` enrichment loop — currently one
unconditional call per discovered component, 7090 calls on a real
production library (7019 components, 71 component sets) — is gated by
a new local, Figma-call-free pre-match step and a new
`max_metadata_calls` budget. The pre-match runs entirely inside the
command's own session via `Glob`/`Grep` against the design-system
clone, is recall-oriented (over-inclusive) and explicitly
non-authoritative by design, and states this in the command's own
prose so `design-map-writer` remains free to map anything in the
evidence bundle regardless of candidate-set membership. Budget
exhaustion is non-fatal, recorded as `enrichment_truncated: true` with
a reason; the evidence bundle's existing `library-search.json` header
gains `candidates_prematched` and `metadata_calls_made` counters. This
is a single-file, prose-only change requiring zero test-file edits
(see `## Notes`).

## User Story

As the relay operator running `/relay-design-map` against a real,
large Figma library,
I want Phase B to enrich only a small, locally pre-matched candidate
set instead of every discovered component, bounded by an explicit
budget,
So that a ~7000-component library scan issues a Figma-quota-feasible
number of `get_metadata` calls instead of 7090.

## Problem Statement

`/relay-design-map`'s Phase B instructs one `get_metadata` call per
component or component set discovered in the target Figma library,
with no budget and no candidate filter. On a real production library
(7019 components, 71 component sets) that is 7090 unconditional calls
against a documented Figma MCP quota of 6 calls/month (View/Collab) or
200–600 calls/day (Dev/Full) — arithmetically infeasible on every
published plan, and the single largest contributor to the PRD's
headline defect. `max_library_search_calls = 40` is the only existing
numeric Figma budget in the file, and it governs the comparatively
cheap enumeration call (step 1), not the expensive per-component
enrichment call this phase fixes.

## Solution Statement

Invert Phase B from enumerate-then-enrich-everything to
enumerate → pre-match → enrich-candidates-only. Between the existing
library-search step and the existing metadata-enrichment step, insert
a new step that compares each enumerated component's name/slug against
the local design-system clone via `Glob`/`Grep` — no Figma calls, no
new agent, executed entirely inside this command's own session per the
[2026-07-22] MCP-access decision — producing a recall-oriented
(over-inclusive), explicitly non-authoritative candidate set. Scope the
metadata-enrichment step to that candidate set only, bounded by a new
`max_metadata_calls` budget declared in both the frontmatter
`description` and the body (mirroring `max_library_search_calls`'s
existing dual-declaration convention), with non-fatal exhaustion
recorded as `enrichment_truncated: true` plus a reason. Record
`candidates_prematched` and `metadata_calls_made` in the evidence
bundle's existing `library-search.json` header fields.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (command-prose behavioral change) |
| Complexity | Medium — single file, but the load-bearing behavioral inversion the PRD's entire feasibility claim rests on (7090 calls → bounded by 150); requires careful step renumbering and precise, testable prose (recall-oriented / non-authoritative framing, dual-declared budget) rather than large surface area |
| Systems Affected | `/relay-design-map` command (Figma Implementation Track Phase 3); evidence bundle at `PRPs/reports/design-map/evidence/`, read-only-affected downstream by `design-map-writer`/`design-map-reviewer` (neither file is edited this phase) |
| Dependencies | Phase 1 (Resource packaging) — complete; Implementation Phases row 2 `Depends: 1` |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/figma-quota-resilience.prd.md:199` (Implementation Phases row 2); Phase Details `PRPs/prds/figma-quota-resilience.prd.md:212-215` |
| phase_type | feature |

(`design_source` / `phase_scope` rows are not added: this repository's
`docs/context/methodology.md` does not declare `figma_track` — the
whole reason `design_spec_path` was passed as `null` for this
dispatch — and the source PRD has no `## Visual-First Mode` section.
Both conditional rows are correctly absent, and no `## Design Source`
section follows this table.)

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-design-map.md` | 1-4 | Frontmatter `description` — the exact field Task 1 adds `max_metadata_calls=150` to, mirroring the existing inline `max_library_search_calls=40` declaration. |
| P0 | `plugins/relay/commands/relay-design-map.md` | 211-241 | Current Phase B ("Query the Figma library") — the exact 4-step block every task in this plan rewrites into 5 steps. |
| P1 | `plugins/relay/agents/design-map-writer.md` | 138-178 | Step 2's `Glob`/`Grep` candidate-matching heuristic — the logic the new pre-match step (Task 2) partially duplicates and must name explicitly as a drift risk; also confirms the writer's own behavior (map anything in the evidence bundle) is unaffected by this phase. |
| P1 | `plugins/relay/agents/design-map-reviewer.md` | 162-173 | R-DM5 — the existing downstream rubric item that checks truncation-flag honesty against the evidence bundle. The exact field names this phase introduces (`enrichment_truncated`, `candidates_prematched`, `metadata_calls_made`) are what a future, analogous Phase 4 rubric item will build on — their spelling here must not need a rename later. |
| P2 | `docs/decisions.md` | 741-749 | `[2026-07-22]` MCP-access spike — binds the pre-match to run in the command's own session, never a dispatched agent. |
| P2 | `docs/anti-patterns.md` | 98-103 | "Querying the Figma MCP from a dispatched writer/reviewer agent" — the new pre-match step must not widen either dispatched agent's tool allowlist. |

## Patterns to Mirror

# SOURCE: plugins/relay/commands/relay-design-map.md:216-221
```
1. **Library search.** Call `search_design_system` against the Figma
   library file key(s) from `design_system_config`, enumerating the
   library's components. Budget: `max_library_search_calls = 40` —
   stop issuing further search calls once this budget is reached and
   record the scan as truncated (this feeds the map's
   `inventory_truncated` marker via the evidence bundle).
```
Used by: Task 3 — mirrors the exact "numeric budget + stop-issuing-
further-calls + record the outcome" idiom for the new
`max_metadata_calls` budget on the metadata-enrichment step.

# SOURCE: plugins/relay/commands/relay-design-map.md:225-230
```
3. **Code Connect (opportunistic).** Call `get_code_connect_map` for
   the library. This call is opportunistic — any error (missing Code
   Connect configuration, permission error, timeout) is recorded as
   `code_connect: unavailable(<error class>)` in the evidence bundle's
   header and the run CONTINUES. A Code Connect failure is never
   fatal to this command.
```
Used by: Task 3 — mirrors the "non-fatal, recorded with a reason, run
CONTINUES" idiom for `enrichment_truncated: true` on budget
exhaustion.

# SOURCE: plugins/relay/agents/design-map-writer.md:140-166
```
1. Search the design-system clone (via `Glob` for filenames, `Grep`
   for exported symbol names) for a component whose name is similar
   to the Figma component's name and whose prop shape is plausible
   given the Figma node's variant/property data in the evidence.
...
4. When no code component match is found, add a row to
   `## UNMAPPED` naming the Figma component (name and key) and a
   reason (e.g., "no candidate found in clone", "multiple ambiguous
   candidates, none confidently primary").
```
Used by: Task 2 — the new pre-match step mirrors the `Glob`-for-
filenames / `Grep`-for-exported-symbols clone-search mechanic, while
explicitly diverging from it in authority and timing: this heuristic
is authoritative (its output IS the map row) and runs after all
evidence is gathered; the new pre-match is non-authoritative (an
enrichment-scoping filter only) and runs before any `get_metadata`
call. Task 2's prose must name this coupling and the drift risk it
creates, per the source PRD's Architecture Notes.

# SOURCE: plugins/relay/commands/relay-design-map.md:1-4 (frontmatter description)
```
description: 'Give every Figma-enabled project a versioned, human-curatable map from Figma library components to real code components. Queries the target project''s Figma library in the main session (search_design_system + node-scoped get_metadata, budget max_library_search_calls=40; get_code_connect_map read opportunistically), persists evidence bundles to PRPs/reports/design-map/evidence/, ...'
```
Used by: Task 1 — mirrors the inline `budget <name>=<N>` frontmatter-
description convention (the ONLY other file in the plugin restating a
numeric budget in its frontmatter besides `relay-design-spec.md`, per
the PRD's own Research Summary) for the new `max_metadata_calls=150`
declaration.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/commands/relay-design-map.md` | UPDATE | Phase B inverted from enumerate-then-enrich-everything to enumerate→pre-match→enrich-candidates-only (AC-1); `max_metadata_calls` declared in frontmatter `description` and body, non-fatal exhaustion recorded (AC-2); pre-match prose states recall-orientation and non-authoritative status explicitly (AC-3); evidence bundle's `library-search.json` header gains `candidates_prematched`/`metadata_calls_made` (AC-1). This is the sole file the source PRD's Phase 2 Scope names. |

## NOT Building (Scope Limits)

- **The `whoami` quota preflight, its explicit-confirmation gate, and the corrected P1 message** (discoverability vs. reachability wording) — Phase 3.
- **`FAILED_FIGMA_QUOTA_EXHAUSTED`, error-class/string detection, and the "no sleep-and-retry" rule** — Phase 3.
- **Cumulative/additive evidence merge, `last_seen_scan` retirement, checkpoint relocation to `PRPs/reports/design-map/.state/`, disk-derived `inventory_truncated`/`enrichment_truncated` splitting with the three degenerate-case guards, persisted degradation rungs, the surgical downgrade rule, `R-DM7`, and the DERIVED `R-DM`/`R-DS` rubric-count rewrite** — Phase 4. In particular, this phase does NOT touch `design-map-writer.md` or `design-map-reviewer.md` at all — instructing the writer to read `library-search.json`'s own `truncated` flag when `evidence_dir` is present-but-partial, and giving the reviewer a missing-evidence branch, are explicitly Phase 4's job per the source PRD's own Phase 4 Scope text.
- **Checkpoint/resume semantics** (an interrupted run or `--refresh` costing only the delta) — Phase 5.
- **The `design-spec-writer` partial-evidence branch, `DEGRADED_NO_TOKENS`, and the re-traversal consumption counter** — Phase 6.
- **An embedded REST fallback** — rejected outright by the source PRD's "What We're NOT Building".
- **Evidence-bundle condensation / an agent-facing library index** — deferred to its own PRD per the source PRD.
- **A unified evidence-bundle "manifest" file** — grounding (`research-codebase`) confirms no such file exists yet; Phase 4's own Scope text ("Cumulative call log held in the checkpoint and projected into the manifest on write") is where that concept is formalized. This phase keeps `candidates_prematched`/`metadata_calls_made` as additional fields on the existing `library-search.json`, the closest already-established artifact, rather than inventing a new file ahead of Phase 4's design.
- **A `docs/decisions.md` rationale entry for `max_metadata_calls` or `max_library_search_calls`** — an explicit "Could" item in the source PRD's MoSCoW table (not MVP-blocking); left for a future pass. See `## Notes`.
- **Editing `relay-design-map.md`'s own runtime Decision Gate template block** (lines 47-75, the six-line shape the command emits when it runs) — the existing "Figma MCP calls stay in interactive commands, never dispatched agents" example decision already covers the new pre-match's session-locality requirement; nothing in this phase's scope requires changing that block's example text.
- **Any `*.test.mjs` file** — grounding confirms zero existing test assertions depend on Phase B's specific prose (only the `"## Phase A — Ensure design-system config is loaded"` / `"## Phase B — Query the Figma library"` heading strings are used as slice delimiters by one test, and both are preserved byte-identical by every task below). See `## Notes` for the full determination — unlike Phase 1, this phase requires no test-pair routing at all.

## Step-by-Step Tasks

### Task 1: UPDATE relay-design-map.md frontmatter description

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`'s
  frontmatter `description` field (line 2), insert the new
  `max_metadata_calls=150` budget declaration immediately after the
  existing `max_library_search_calls=40` mention, and split the
  parenthetical so `search_design_system` and node-scoped
  `get_metadata` are no longer bundled under a single budget clause.
  Old fragment: `(search_design_system + node-scoped get_metadata,
  budget max_library_search_calls=40; get_code_connect_map read
  opportunistically)`. New fragment: `(search_design_system, budget
  max_library_search_calls=40; a local Glob/Grep pre-match against the
  design-system clone narrows enrichment to candidates only;
  node-scoped get_metadata for pre-matched candidates, budget
  max_metadata_calls=150, non-fatal on exhaustion; get_code_connect_map
  read opportunistically)`. Preserve the YAML single-quote escaping
  (`''`) used elsewhere in this description string; change nothing
  else in the field.
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:1-4` (the
  existing inline `budget <name>=<N>` convention).
- **AC**: AC-A2 — the frontmatter half of the dual declaration.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -q 'max_metadata_calls=150' plugins/relay/commands/relay-design-map.md \
     && grep -q 'max_library_search_calls=40' plugins/relay/commands/relay-design-map.md; then
    echo "PASS: frontmatter description declares both max_library_search_calls=40 and max_metadata_calls=150"
  else
    echo "FAIL: frontmatter description missing one or both budget declarations"
    exit 1
  fi
  ```

### Task 2: UPDATE relay-design-map.md Phase B — insert pre-match step

- **ACTION**: In Phase B, insert a new numbered step 2 ("Pre-match
  candidates") between the existing step 1 ("Library search") and the
  existing step 2 ("Node-scoped metadata" — which Task 3 renumbers to
  3). The new step reads, in substance: against
  `design_system_config.local_clone_path`, compare each
  component/component-set name (and slug) enumerated in step 1 to file
  names and exported symbol names in the local design-system clone via
  `Glob`/`Grep`, producing a candidate set for enrichment. State
  explicitly, as prose in this step (not merely implied): (a) the
  pre-match is **recall-oriented** by design — it over-includes and
  never under-includes; any plausible partial match, pluralization
  difference, or ambiguous multi-candidate name is always included,
  never excluded; (b) it carries **no classification authority** — it
  never decides CONFIRMED vs. INFERRED vs. UNMAPPED, which remains
  exclusively `design-map-writer` Step 2's job against the full
  evidence bundle, and the writer may map any component present in the
  evidence bundle regardless of membership in this candidate set; (c)
  this step necessarily duplicates part of `design-map-writer.md`
  Step 2's own name/prop matching heuristic, the two are expected to
  drift over time, and neither is authoritative over the other — this
  pre-match only scopes *which components get enriched here*.
- **MIRROR**: `plugins/relay/agents/design-map-writer.md:140-166` (the
  Glob/Grep-against-clone matching mechanic being duplicated and named
  as a coupling risk).
- **AC**: AC-A1 (the candidate set is what bounds/scopes the following
  enrichment step) and AC-A3 (the recall-oriented / non-authoritative
  framing this task's prose states verbatim).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -q 'recall-oriented' plugins/relay/commands/relay-design-map.md \
     && grep -q 'no classification authority' plugins/relay/commands/relay-design-map.md; then
    echo "PASS: pre-match step framed as recall-oriented and non-authoritative"
  else
    echo "FAIL: pre-match framing (recall-oriented / no classification authority) missing from relay-design-map.md"
    exit 1
  fi
  ```

### Task 3: UPDATE relay-design-map.md Phase B — scope and budget metadata enrichment

- **ACTION**: Rewrite the (now step 3, post-Task-2-renumbering)
  "Node-scoped metadata" step so it iterates the step 2 candidate
  set — never the full step 1 enumeration — and is bounded by a new
  budget: `max_metadata_calls = 150` (code-formatted, spaces around
  `=`, mirroring the existing body-level `max_library_search_calls =
  40` style). Stop issuing further `get_metadata` calls once the
  budget is reached. State explicitly that exhaustion is NEVER fatal:
  record `enrichment_truncated: true` with a reason (e.g.
  `"max_metadata_calls exhausted at 150/<candidate count>"`) and
  continue to the next step. Also renumber the old step 3 ("Code
  Connect") to step 4 in place, with no content change beyond the
  number.
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:216-221`
  (numeric-budget + stop-issuing-further-calls idiom) and
  `plugins/relay/commands/relay-design-map.md:225-230` (non-fatal,
  recorded-reason, run-continues idiom).
- **AC**: AC-A1 (bounded, candidate-proportional call count) and
  AC-A2 (the budget itself plus its non-fatal exhaustion handling).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -q 'max_metadata_calls = 150' plugins/relay/commands/relay-design-map.md \
     && grep -q 'enrichment_truncated' plugins/relay/commands/relay-design-map.md; then
    echo "PASS: metadata budget (max_metadata_calls = 150) and non-fatal enrichment_truncated recording both present"
  else
    echo "FAIL: metadata budget or enrichment_truncated recording missing from relay-design-map.md"
    exit 1
  fi
  ```

### Task 4: UPDATE relay-design-map.md Phase B — persist-evidence header fields

- **ACTION**: Rewrite the "Persist evidence" step (renumbered to step
  5) so its "raw result from steps 1–3" reference becomes "steps
  1–4", and so the described `library-search.json` fields gain two
  new counters alongside the existing budget-consumption and
  `truncated: true|false` fields: `candidates_prematched` (the size of
  the step 2 candidate set) and `metadata_calls_made` (the count of
  step 3 `get_metadata` calls actually issued this run), plus
  `enrichment_truncated: true|false` and its reason when applicable.
  `library-search.json` is the evidence bundle's existing header-like
  artifact and is where this phase records both new counters (see
  `## NOT Building` for why no new manifest file is introduced).
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:231-241`
  (the current persist-evidence step's file-and-field listing
  convention).
- **AC**: AC-A1 — this task is exactly where `candidates_prematched`
  and `metadata_calls_made` are recorded.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -q 'candidates_prematched' plugins/relay/commands/relay-design-map.md \
     && grep -q 'metadata_calls_made' plugins/relay/commands/relay-design-map.md; then
    echo "PASS: evidence bundle header records both candidates_prematched and metadata_calls_made"
  else
    echo "FAIL: evidence bundle header missing candidates_prematched or metadata_calls_made"
    exit 1
  fi
  ```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
npm run validate
```
Exits non-zero if any of the 12 registered checks fails (real
exit-code semantics via `index.mjs`'s own `process.exitCode = 1` on
any failure; no wrapping needed). This phase creates, moves, and
deletes no files, so it is a general regression gate here (frontmatter
still parses, no dangling path reference introduced), not a proof of
this phase's specific new content — that is Level 2's job.

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
FILE="plugins/relay/commands/relay-design-map.md"
COUNT=$(grep -c 'max_metadata_calls' "$FILE")
if [ "$COUNT" -lt 2 ]; then
  echo "FAIL: max_metadata_calls must appear at least twice (frontmatter description + body) — found $COUNT"
  exit 1
fi
grep -q 'recall-oriented' "$FILE"
grep -q 'no classification authority' "$FILE"
grep -q 'enrichment_truncated' "$FILE"
grep -q 'candidates_prematched' "$FILE"
grep -q 'metadata_calls_made' "$FILE"
echo "PASS: Phase 2 content invariants present — dual-declared max_metadata_calls, recall-oriented/non-authoritative framing, non-fatal enrichment_truncated recording, and both new bundle-header counters"
```
Fails on the current unmodified tree (`COUNT=0`, and none of the five
subsequent phrases exist yet — confirmed by `research-codebase`: zero
hits anywhere in the plugin for `max_metadata_calls`,
`candidates_prematched`, `metadata_calls_made`, or
`enrichment_truncated`); passes once Tasks 1-4 land.

**Level 3 — INTEGRATION / DRY-RUN END-TO-END**
```bash
set -euo pipefail
FILE="plugins/relay/commands/relay-design-map.md"

# Structural: the two heading strings an existing test
# (fix-design-system-config-producer.test.mjs) uses as slice
# delimiters must remain byte-identical — this phase must not rename
# either.
grep -q '^## Phase A — Ensure design-system config is loaded$' "$FILE"
grep -q '## Phase B — Query the Figma library' "$FILE"

# Structural: Phase B must now enumerate exactly 5 numbered steps
# (was 4) after inserting the pre-match step.
PHASE_B_BLOCK=$(awk '/^## Phase B/{flag=1; next} /^## Phase C/{flag=0} flag' "$FILE")
STEP_COUNT=$(printf '%s\n' "$PHASE_B_BLOCK" | grep -cE '^[0-9]+\. \*\*')
if [ "$STEP_COUNT" -ne 5 ]; then
  echo "FAIL: Phase B must enumerate exactly 5 numbered steps after inserting the pre-match step (found $STEP_COUNT)"
  exit 1
fi
echo "PASS: Phase A/B/C heading delimiters intact; Phase B restructured to 5 sequential numbered steps"

# Regression safety net: the declared node:test framework must not
# regress beyond this worktree's documented, pre-existing baseline of
# 2 unrelated failures in fix-design-system-config-producer.test.mjs
# (not this phase's to fix — see ## Notes). No task in this phase
# touches a *.test.mjs file.
set +e
OUTPUT="$(node --test "scripts/validate/checks/*.test.mjs" 2>&1)"
set -e
FAIL_COUNT="$(printf '%s' "$OUTPUT" | grep -oE '# fail [0-9]+' | grep -oE '[0-9]+')"
if [ -z "$FAIL_COUNT" ]; then FAIL_COUNT=0; fi
if [ "$FAIL_COUNT" -gt 2 ]; then
  echo "FAIL: regression corpus failures increased beyond the documented pre-existing baseline of 2 (found $FAIL_COUNT)"
  exit 1
fi
echo "PASS: regression corpus at or below documented baseline ($FAIL_COUNT <= 2 pre-existing, unrelated failures)"
```
Fails on the current unmodified tree at the `STEP_COUNT` check
(Phase B currently has 4 steps, not 5), before ever reaching the
regression-corpus check; passes once Tasks 2-4 land, provided the
regression corpus stays at or below its documented baseline.

Levels 4-6 (browser/database/manual) are not part of the fixed agent
contract and are not included — this phase has no need for them (no
UI, no database, no step that resists automation).

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a Figma library enumerating 7019
  components and 71 component sets, and a design-system clone
  containing a few dozen name/slug matches, when `/relay-design-map`
  Phase B runs, then the number of `get_metadata` calls issued is
  bounded by `max_metadata_calls` and is proportional to the
  pre-matched candidate set (never the full enumeration), and the
  evidence bundle's `library-search.json` records both
  `candidates_prematched` and `metadata_calls_made`.
- **AC-A2 (PRD AC-2):** Given `plugins/relay/commands/relay-design-map.md`,
  when `max_metadata_calls` is introduced, then it appears both in the
  frontmatter `description` (line 2) and in the command body (Phase B
  step 3), matching the dual-declaration convention
  `max_library_search_calls` already follows in that same file; and
  its exhaustion is non-fatal, recording `enrichment_truncated: true`
  with a reason.
- **AC-A3 (PRD AC-3):** Given the command's pre-match selects
  candidate set C, when `design-map-writer` runs, then it remains free
  to map any component present in the evidence bundle regardless of
  membership in C (unchanged agent behavior — this phase edits no
  agent file), and `relay-design-map.md`'s own prose states explicitly
  that the pre-match over-includes by design and carries no
  classification authority.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pre-match under-includes, silently dropping components `design-map-writer` would have mapped | M | M | Prose mandates recall orientation (over-include by default; Task 2); `max_metadata_calls` exhaustion is non-fatal and recorded (Task 3); `design-map-writer` may map anything in the bundle regardless of the candidate set — unchanged, since no agent file is edited this phase. From the source PRD's own Technical Risks table, directly applicable to this phase. |
| Pre-match and `design-map-writer` Step 2 heuristics drift apart over time | M | L | Declared non-authoritative in prose at both sites (Task 2's new command prose; the existing, unedited writer prose), with the coupling named explicitly rather than left implicit. From the source PRD's own Technical Risks table. |
| `max_metadata_calls = 150` proves miscalibrated once measured against a real ~7000-component library | M | L | Value is derived from the source PRD's own ≤200-total-calls Success Metric (40 search + 150 metadata, leaving ~10 calls of headroom for Phase 3's `whoami` preflight and the opportunistic Code Connect call); the source PRD's own Open Questions section already flags budget recalibration as a live follow-up once this phase ships, and the fix is a single-value edit, not a redesign. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. This repo declares
`test_frameworks: ["node:test"]`, so the pair is active in test-after
mode.

**Row-2 selection independently confirmed.** This plan's own Phase 1
parse of the Implementation Phases table agrees with the dispatching
command's pre-check: row 1 ("Resource packaging") is `complete`; row 2
("Scoped scan + metadata budget") is `pending` with `Depends: 1`
(satisfied) — the lowest-numbered actionable row. Rows 3-6 all depend
(directly or transitively) on row 2 or a later row and are therefore
not yet actionable.

**Why this phase requires zero `*.test.mjs` changes — unlike Phase
1.** A dedicated search of `scripts/validate/checks/*.test.mjs` (36
files) for any assertion on `relay-design-map.md`'s Phase B prose
found none. Only one file,
`fix-design-system-config-producer.test.mjs`, references
`relay-design-map.md` content at all in a way that could be affected,
and it uses the literal strings `"## Phase A — Ensure design-system
config is loaded"` and `"## Phase B — Query the Figma library"`
purely as `sliceBetween` delimiters to isolate Phase A's own text for
an unrelated assertion (Phase A's five `design_system_config` fields)
— it asserts nothing about Phase B's body. Every task in this plan
preserves both heading strings byte-identical (verified structurally
by this plan's own Level 3 command) and touches nothing in Phase C
(where the unrelated `review_started_at` timestamp-capture instruction
lives). Because no test file needs to change, the
`R-COH-VALIDATE-FRAMEWORK-MISMATCH` condition-based test-pair-deferral
exemption (`docs/decisions.md`, `[2026-08-03]`) is not invoked at
all — this plan's Level 3 Validation Command directly runs the
declared `node:test` framework (`node --test
"scripts/validate/checks/*.test.mjs"`) as a regression safety net,
scoped to this worktree's documented, pre-existing baseline of 2
unrelated failures in `fix-design-system-config-producer.test.mjs`
(not introduced by, and not fixed by, this phase).

**Why `max_metadata_calls = 150`.** The source PRD's Success Metrics
table targets "≤ 200 (fits one Dev/Full day)" total Figma MCP calls
per `/relay-design-map` run on a ~7000-component library.
`max_library_search_calls = 40` already consumes part of that budget;
150 leaves roughly 10 calls of headroom for Phase 3's `whoami`
preflight probe and the opportunistic Code Connect call (40 + 150 +
~10 ≈ 200). No existing `docs/decisions.md` entry or PRD text pins an
exact value — the source PRD's own Open Questions section states
"Grounding found neither Figma budget has one" — so this is a
plan-level default in the same spirit as `max_test_retries = 3`
(`docs/decisions.md` [2026-04-19]): a considered starting point,
explicitly open to recalibration once measured against a real library
(source PRD Open Questions, item 1).

**Why `library-search.json`, not a new manifest file, holds the new
counters.** `research-codebase` grounding confirmed no unified
evidence-bundle "header" file exists yet in this plugin — only
scattered per-artifact fields, the closest being
`library-search.json`'s existing `truncated: true|false` and budget-
consumption fields. The source PRD's own Phase 4 Scope text
("Cumulative call log held in the checkpoint and projected into the
manifest on write") is where a formal manifest concept is introduced.
Adding `candidates_prematched`/`metadata_calls_made` to
`library-search.json` now, rather than inventing a new file ahead of
Phase 4's design, satisfies AC-1's "evidence bundle header" language
without preempting or duplicating Phase 4's own work.

**`phase_type: feature` — reasoning.** This phase adds new observable
behavior (a bounded, budgeted, candidate-scoped enrichment loop) to an
existing command; it does not match `scaffold` (not a bootstrap/
config-only/init phase; its Validation Commands are content-invariant
greps plus a structural dry-run, not filesystem/OS probes), `docs`
(the sole changed file, `relay-design-map.md`, is the command's own
instructional source — the plugin's closest equivalent to application
source code, not documentation describing it), `refactor` (adds new
capability — a candidate filter and a budget that did not exist
before — rather than restructuring existing behavior unchanged), or
`foundation` (creates no new domain entity/repository/schema seam that
a *later* phase's Acceptance Criteria depend on being tested against;
Phases 3-5 touch `relay-design-map.md` again for their own unrelated
capabilities, not because this phase created a seam they build on).
Given `tdd: false` in this repository, the `foundation` self-skip this
classification exists to gate does not trigger regardless of this
call.

**Could-item deferred.** A `docs/decisions.md` rationale entry for
`max_metadata_calls` (and `max_library_search_calls`, retroactively)
is an explicit "Could" item in the source PRD's MoSCoW table, not
MVP-blocking. Left for a future pass rather than folded into this
phase's Step-by-Step Tasks, to keep this plan's scope matching the
source PRD's own Phase 2 Scope text exactly.

---

*Generated: 2026-08-04*
*Approved: 2026-08-04*
*Status: IMPLEMENTED*
