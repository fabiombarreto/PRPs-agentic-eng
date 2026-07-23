# Feature: Design Spec (Phase 4 of figma-implementation-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent files in plugins/relay/agents/; new command file in plugins/relay/commands/; cross-cutting artifact creation (design-spec.md format Phase 5 consumes); documentation/ site registration (three-file rule); extends the interactivity boundary in a recorded way
- Decisions found:
  - [2026-04-19] Interactivity boundary — PRD interactive, downstream autonomous. This phase's writer/reviewer pair is a DELIBERATE, recorded extension: it runs inline in the interactive stretch (before the pipeline's autonomous portion begins for this feature), the same class of extension already precedented by the 2026-06-19 post-merge docs-pair dialogue extension
  - [2026-07-09] PRD DRAFT→APPROVED flip ownership is invocation-context-scoped — the exact `main`/`subagent` contract this phase's reviewer reuses verbatim
  - [2026-06-19] `/relay-approve` docs pair post-merge interactivity extension — the existing precedent for a "conscious, recorded extension" of the interactivity-boundary rule, the same framing this phase's Decisions Log entry uses
  - [2026-04-19] Command surface — writer/reviewer split, one command per stage (the PRD-authoring `/relay-prd` bundled exception is the precedent this phase's `/relay-design-spec` follows, not the plan/code autonomous split)
- Applicable anti-patterns:
  - Activating any pipeline track by heuristic — the Design Spec's APPROVED status is never auto-flipped; only the user's own explicit affirmative reply flips it
  - Treating relayed consent as the user's approval (docs/anti-patterns.md via prd-reviewer's own hard constraints) — this phase's reviewer inherits that exact discipline
- Applicable architectural rules:
  - Interactivity boundary — this phase is the second (and last planned) place in relay where a writer/reviewer pair dialogues with the user before the autonomous stretch
  - `documentation/AGENTS.md`'s three-file registration rule is binding for the new command/agents
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-implementation-track.prd.md` — Implementation Phases row 4:
  "Design Spec" — Goal: Turn a Figma URL into a human-approved, business-grounded, evidence-backed intermediate contract for one feature. — Success
  signal: A real feature produces an APPROVED Design Spec that a human reviewed and confirmed, with zero unresolved ambiguity.

## Summary

This phase authors the second user-facing surface of the Figma track: a new `/relay-design-spec` command plus a `design-spec-writer`/`design-spec-reviewer` pair that, unlike Phase 3's `design-map` pair, are **inline-adopted in the main interactive conversation** — mirroring `prd-writer.md`/`prd-reviewer.md`/`relay-prd.md` exactly, never Task-dispatched. This is deliberate: the pair's job is to interpret a Figma URL against business context (the user's original P1 concern), surface only genuinely ambiguous items to the user in a bounded Q&A, and require the user's own explicit, in-dialogue affirmative reply before the resulting Design Spec can flip from DRAFT to APPROVED — the single point of human contact with the raw Figma interpretation that every downstream, fully-autonomous phase then trusts blindly. The command performs all Figma MCP querying itself (per the Phase 2 decision and consistent with Phase 3), persists evidence to `PRPs/designs/<feature>/raw/` and reference screenshots to `PRPs/designs/<feature>/refs/`, and writes the final artifact to `PRPs/designs/<feature>/design-spec.md` against a new canonical `docs/context/design-spec-template.md`.

## User Story

As a developer with a feature whose layout is already finalized in Figma, I want to paste the Figma URL and have an agent produce a business-grounded interpretation that I review and explicitly approve once, so that everything downstream can proceed autonomously without re-litigating what the design means.

## Problem Statement

Frontend developers implementing Figma-designed layouts get poor results because literal design-to-prompt translation loses the business interpretation a human would naturally apply — an academic ablation confirms removing a structured intermediate representation collapses AI-generated UI quality even when raw output stays syntactically valid. This phase builds that structured, human-validated intermediate representation as a standalone artifact type (its consumption by the plan/PRD pipeline is Phase 5's job).

## Solution Statement

`/relay-design-spec` adopts `design-spec-writer` inline: it queries the Figma MCP directly (main session), normalizes node-id URL format (`123-456` → `123:456`), traverses in chunks bounded by `max_figma_nodes=20` and 6-8 `get_design_context` calls per chunk (persist-then-discard, preventing context blowout), cross-reads the target's business docs and PRD draft, and produces a DRAFT spec with every ambiguous region flagged rather than guessed. The command then surfaces a single batched Q&A round (max 2 rounds) to the user. Once answered, it adopts `design-spec-reviewer` inline (`invocation_context: main`): the reviewer runs a 7-item evidence-based rubric (R-DS1–R-DS7, MCP-free — verifies only against the persisted evidence bundle and the local design-system clone), and on full pass asks the user directly "Aprovar o Design Spec?" — only an explicit affirmative flips DRAFT to APPROVED.

## Metadata

| Field | Value |
|---|---|
| Type | New command + new agent pair, inline-adopted (prompt/config files) |
| Complexity | High |
| Systems Affected | `plugins/relay/agents/`, `plugins/relay/commands/`, `docs/context/`, `documentation/`, `PRPs/designs/` (new tree) |
| Dependencies | Phase 1 (Foundations) — complete; Phase 2 (MCP-access spike) — complete; Phase 3 (Component map) — complete |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/figma-implementation-track.prd.md` Implementation Phases row 4 |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/prd-writer.md` | 88-150 | Exact restate-and-wait interactive gate pattern (Phase 1 INITIATE) — the model for the Figma-URL confirmation + ambiguity Q&A |
| P0 | `plugins/relay/agents/prd-writer.md` | 292-424 | Exact GENERATE-phase mechanics (Decision Gate consult, collision-safe filename, Write, fixed handoff line) |
| P0 | `plugins/relay/agents/prd-reviewer.md` | 55-60 | `invocation_context` input contract, fail-safe `subagent` default |
| P0 | `plugins/relay/agents/prd-reviewer.md` | 440-464 | The literal "Rubric passed. Aprovar?" dialogue gate — the model for the Design Spec's own approval prompt |
| P0 | `plugins/relay/agents/prd-reviewer.md` | 488-511 | Exact final-flip step order: re-validate → `Edit` → jsonl append (NOT jsonl-before-Edit — that ordering is `docs-reviewer`/`plan-reviewer`'s autonomous-mode cache workaround, which does not apply here) |
| P0 | `plugins/relay/commands/relay-prd.md` | 111-197 | Exact command-level inline-adoption framing (Phase A Writer, Phase B Reviewer, `invocation_context: main` declaration) — the direct template for `/relay-design-spec` |
| P1 | `docs/context/prd-template.md` | 16-42 | "Relay adaptations (mandatory extensions)" preamble shape — the template for `design-spec-template.md` |
| P1 | `PRPs/plans/completed/figma-implementation-track-phase-3-component-map.plan.md` | (full) | This feature's own prior phase — component-map format + CM-id convention this phase's REUSE rows cite |
| P2 | `documentation/AGENTS.md` | (full) | Binding contract for the doc-site registration tasks (already applied once this feature, in Phase 3) |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/prd-writer.md:100-107
### description mode
Restate your understanding:

> I understand you want to build: {restatement of `description`}
> Is this correct, or should I adjust my understanding?

Wait for confirmation or correction. If corrected, restate again and
re-gate.
```
Copied into Task 1 (`design-spec-writer`) as the restate-and-wait pattern, adapted: restate the Figma URL + inferred feature scope, not a free-text description.

```
# SOURCE: plugins/relay/agents/prd-reviewer.md:451-457
> **Rubric passed.** All structural checks succeeded.
>
> Aprovar PRD? (sim / pedir alterações)

Wait for the user's reply.
```
Copied into Task 2 (`design-spec-reviewer`) as the literal approval-gate wording pattern, adapted for "Aprovar o Design Spec?".

```
# SOURCE: plugins/relay/commands/relay-prd.md:111-125
- `invocation_context: main`. You adopt the Reviewer protocol *inside
  this command's main conversation*, so the user's messages reach the
  Reviewer directly. The two-condition approval gate (rubric pass AND
  explicit user approval) is satisfiable here, and the Reviewer owns
  the `DRAFT → APPROVED` flip inline (Step 4 of its protocol). This is
  the ONLY place the flip happens in a `/relay-prd` session
```
Copied into Task 3 (`relay-design-spec` command) as the exact inline-adoption + `invocation_context: main` declaration pattern.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/design-spec-writer.md` | CREATE | New writer agent — interactive, inline-adopted, interprets Figma into a Design Spec |
| `plugins/relay/agents/design-spec-reviewer.md` | CREATE | New reviewer agent — inline-adopted, MCP-free rubric, owns the human-confirmed flip |
| `plugins/relay/commands/relay-design-spec.md` | CREATE | New command — adopts both roles inline, owns all Figma MCP querying |
| `docs/context/design-spec-template.md` | CREATE | Canonical Design Spec shape both agents reference as authoritative |
| `documentation/assets/data/search-index.json` | UPDATE | Register `/relay-design-spec`, `design-spec-writer`, `design-spec-reviewer` |
| `documentation/changelog.html` | UPDATE | `Unreleased` entry describing the three new files |
| `documentation/reference/commands.html` + `documentation/reference/agents.html` | UPDATE | Add entries for the new command and two agents, in the "Design system (Figma track)" section Phase 3 already created |

## NOT Building (Scope Limits)

- **Wiring the Design Spec into `plan-writer`/`prd-writer`** — the `design_source` field and `## Design Source` plan/PRD sections are Phase 5's job. This phase's Design Spec is a standalone, consumable-later artifact.
- **The visual-verification loop that consumes the Design Spec's reference screenshots** — Phase 6's job. This phase only captures and persists the references.
- **Actually running `/relay-design-spec` against a real feature** — Phase 7's end-to-end dogfood.
- **Any change to how `/relay-execute` or `/relay-plan` operate** — untouched by this phase; Phase 5 wires the integration.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/agents/design-spec-writer.md

**ACTION**: Author a new agent file, frontmatter `{name: design-spec-writer, description: <one paragraph — interprets one feature's Figma design into a business-grounded Design Spec; runs inline in the main interactive conversation, never Task-dispatched; performs Figma MCP calls directly; never approves its own output>, model: sonnet, color: blue, tools: Read, Write, Edit, Glob, Grep}` (note: `tools:` intentionally omits any MCP-specific entry — Figma MCP tools are discovered at runtime via `ToolSearch` in the calling command's own session, per the Phase 2 spike finding; the agent protocol's prose, not its frontmatter allowlist, governs MCP usage since this role is inline-adopted, not Task-dispatched, mirroring how `prd-writer.md`'s own frontmatter has no special web/codebase-research tool entries beyond `Task`). Body sections, mirroring `prd-writer.md`: (1) role statement; (2) `## Inputs`: `figma_url`, `feature` (slug), `target_root`, `component_map_path` (from Phase 3's `docs/design/component-map.md`, when it exists — absence is a documented degraded mode, not a HALT, since a project could run `/relay-design-spec` before ever running `/relay-design-map`); (3) Phase 1 — restate the Figma URL + normalized node-id + inferred feature scope, wait for confirmation (mirror prd-writer.md:100-107); (4) Phase 2 — traversal: normalize node-id (`123-456` → `123:456`), `get_metadata` for a node-scoped inventory first, then `get_design_context` in chunks of 6-8 calls with persist-then-discard distillation (write each chunk's evidence to `PRPs/designs/<feature>/raw/` immediately, discard from context), `get_variable_defs` for tokens, `get_screenshot` per frame at 1x into `PRPs/designs/<feature>/refs/<node-id>.png`; hard cap `max_figma_nodes=20` — exceeding it narrows scope with a loud note, never silently truncates; (5) Phase 3 — interpretation: load `component_map_path`'s Conventions section FIRST as the interpretation lens (when present), classify every subtree REUSE (citing a CM-id)/NEW (citing a failed search)/AMBIGUOUS, cross-read the target's business docs; (6) Phase 4 — batched Q&A: surface only AMBIGUOUS items in ONE message, max 2 rounds, stuck-detection (identical AMBIGUOUS set across 2 rounds → convert remainder to explicit ASSUMPTION rows, never silent); (7) Phase 5 GENERATE — mirror `prd-writer.md:292-424`'s mechanics exactly (Decision Gate consult, collision-safe path under `PRPs/designs/<feature>/design-spec.md`, `Write`, fixed handoff line, trailing `*Status: DRAFT*`); (8) Anti-patterns (never invents an evidence-free REUSE/NEW verdict; never silently drops an AMBIGUOUS item; never flips to APPROVED).

**MIRROR**: `plugins/relay/agents/prd-writer.md:88-150` (restate-and-wait gate), `:292-424` (GENERATE mechanics).

**ADDRESSES**: AC-A1, AC-A3

**VALIDATE**: `grep -q "^name: design-spec-writer" plugins/relay/agents/design-spec-writer.md && grep -q "max_figma_nodes" plugins/relay/agents/design-spec-writer.md`

### Task 2: CREATE plugins/relay/agents/design-spec-reviewer.md

**ACTION**: Author a new agent file, frontmatter `{name: design-spec-reviewer, description: <one paragraph — validates a DRAFT Design Spec against persisted evidence; inline-adopted, invocation_context-scoped; owns the human-confirmed DRAFT->APPROVED flip>, model: sonnet, color: teal, tools: Read, Edit, Write}`. Body, mirroring `prd-reviewer.md`: (1) role statement, explicitly naming this as the second (after `prd-reviewer`) place in relay where a reviewer dialogues with the user before flipping status; (2) `## Inputs`: `spec_path`, `target_root`, `component_map_path`, `raw_dir`, `invocation_context` (`main`|`subagent`, absent/unrecognized → `subagent`, fail-safe, mirror `prd-reviewer.md:55-60` verbatim in contract shape); (3) the 7-item rubric, all MCP-free (verifies only against `raw_dir`'s persisted evidence + the local design-system clone, never queries Figma): R-DS1 every in-scope frame has a downloaded reference PNG on disk with node-id, name-path, recorded pixel dimensions; R-DS2 every REUSE row's cited CM-id resolves in `component-map.md` and its import resolves in the design-system clone; R-DS3 every NEW verdict carries persisted search-miss evidence; R-DS4 every color/spacing/font resolves to a token or carries an explicit raw-value justification, embedded as a token table in the spec body; R-DS5 every EXISTS/NEW delta claim is spot-verifiable via `Read`/`Glob`; R-DS6 zero unresolved AMBIGUOUS items (answered or explicit ASSUMPTION); R-DS7 objective per-frame fidelity criteria present (route, auth mode, viewport, diff threshold, ref PNG path + dims); (4) Protocol: Step 1 load + verify `*Status: DRAFT*`; Step 2 run R-DS1-R-DS7, no short-circuit; Step 3 branch — `main` mode + full pass → surface "Rubric passed. Aprovar o Design Spec?" and wait (mirror `prd-reviewer.md:440-464` verbatim in shape), affirmative → Step 4, anything else → dialogue loop; `subagent` mode + full pass → return `RUBRIC_PASSED` + `flip_instructions`, never flip (mirror `prd-reviewer.md`'s subagent-mode contract); any fail → CHANGES_REQUESTED bullet list, `main` mode enters dialogue loop, `subagent` mode returns the list and stops; (5) Step 4 final flip (`main` mode only, after the user's own affirmative): re-validate fresh → `Edit` the two-line flip → append `APPROVED` to `PRPs/designs/<feature>/design-spec-review.jsonl` — this exact order (Edit before jsonl append), mirroring `prd-reviewer.md:488-511` precisely, NOT the jsonl-before-Edit order used by the autonomous `docs-reviewer`/`plan-reviewer` pairs (that ordering exists to work around a Task-dispatch cache-invalidation issue that does not apply to an inline-adopted role); (6) Anti-patterns (never flips without the user's own explicit affirmative reply; never treats relayed/secondhand approval as consent; never queries the Figma MCP).

**MIRROR**: `plugins/relay/agents/prd-reviewer.md:55-60` (invocation_context), `:440-464` (approval dialogue), `:488-511` (flip ordering).

**ADDRESSES**: AC-A2

**VALIDATE**: `grep -q "^name: design-spec-reviewer" plugins/relay/agents/design-spec-reviewer.md && grep -q "invocation_context" plugins/relay/agents/design-spec-reviewer.md && grep -q "Aprovar" plugins/relay/agents/design-spec-reviewer.md`

### Task 3: CREATE plugins/relay/commands/relay-design-spec.md

**ACTION**: Author a new command file, frontmatter `{description: <one paragraph — standalone interactive entry point for spec extraction; adopts design-spec-writer then design-spec-reviewer inline, invocation_context: main>, argument-hint: <figma-url> [feature-or-description]}`. Body mirroring `relay-prd.md`'s Phase A/Phase B shape: (1) mission; (2) Decision Gate block; (3) Parse arguments — extract the Figma URL (HALT `FAILED_INVALID_FIGMA_URL` if the first token doesn't parse as a figma.com design URL), derive `feature` from the remaining text via the same kebab-slug function `/relay-plan` uses (cite that function by name, don't reinvent it); (4) Preconditions — `figma_track: true` in `docs/context/methodology.md` (else HALT naming the key, pointing at `/relay-design-map`'s confirmation step); Figma MCP discoverable via `ToolSearch` in this session (else HALT `FAILED_FIGMA_MCP_UNAVAILABLE` with connection instructions — never silently degrade); (5) Phase A — adopt `design-spec-writer` inline (same framing as `relay-prd.md:111-125`'s Phase A, adapted): run its phases, perform the actual Figma MCP calls in THIS session as the writer's protocol directs, relay its Q&A to the user; (6) Phase B — adopt `design-spec-reviewer` inline with `invocation_context: main` explicitly declared (mirror `relay-prd.md:111-125` verbatim in structure); (7) exhaustion semantics — if the reviewer's dialogue loop exhausts a `max_spec_review_retries=2` budget without reaching APPROVED, offer the user exactly two named outcomes: retry with corrected inputs, or explicitly abort (leaving the DRAFT on disk, never silently discarding it); (8) Final output surface + Constraints ("Never flip without the user's own explicit affirmative reply", "Never Task-dispatch either role", "Never call the Figma MCP from a Task-dispatched context") + What you do NOT do sections.

**MIRROR**: `plugins/relay/commands/relay-prd.md:111-197` (inline-adoption framing).

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**: `grep -q "invocation_context: main" plugins/relay/commands/relay-design-spec.md && grep -q "design-spec-writer" plugins/relay/commands/relay-design-spec.md && grep -q "design-spec-reviewer" plugins/relay/commands/relay-design-spec.md`

### Task 4: CREATE docs/context/design-spec-template.md

**ACTION**: Author the canonical template, mirroring `prd-template.md`'s exact preamble shape: a Provenance note ("this template has no upstream fork — it is relay-original, unlike prd-template.md and plan-template.md"), a "Relay adaptations" section is not applicable (skip it — this IS the whole template, not an adaptation of one), an Output Path section (`PRPs/designs/<feature>/design-spec.md`), then the body-shape block: `## Source` (Figma URL, file key, normalized node-ids, name-paths, capture date, feature slug), `## Frame Inventory` (table: node-id, name-path, phase assignment column present only when the spec was born from a multi-phase PRD), `## Component Mapping` (REUSE/NEW/ASSUMPTION rows citing CM-ids), `## Token Map` (embedded table — the artifact of record, not a pointer to `raw/`), `## Implementation Delta` (EXISTS with file:line / NEW with failed-search evidence), `## Behavioral Notes`, `## Visual Acceptance Criteria` (per frame: route, preconditions, auth mode, viewport, diff threshold, ref PNG path + dims, optional masks), trailing `*Generated:*`/`*Status: DRAFT | APPROVED*` lines; close with a "Lifecycle — where this template is consumed" section mirroring `prd-template.md`'s closing section shape.

**MIRROR**: `docs/context/prd-template.md:16-42` (mandatory-extensions preamble framing, adapted since this template has no upstream), `docs/context/prd-template.md` overall structure (Output path → body shape → Lifecycle).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "Frame Inventory" docs/context/design-spec-template.md && grep -q "Component Mapping" docs/context/design-spec-template.md && grep -q "Token Map" docs/context/design-spec-template.md && grep -q "Status: DRAFT" docs/context/design-spec-template.md`

### Task 5: UPDATE documentation/assets/data/search-index.json

**ACTION**: Add three entries following the file's existing shape (read it fresh first — it already carries Phase 3's three entries, added in this same feature's prior phase): `/relay-design-spec`, `design-spec-writer`, `design-spec-reviewer`.

**MIRROR**: the three entries Phase 3 already added to this same file (read directly — the file's real current shape is authoritative).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "relay-design-spec" documentation/assets/data/search-index.json && grep -q "design-spec-writer" documentation/assets/data/search-index.json && grep -q "design-spec-reviewer" documentation/assets/data/search-index.json`

### Task 6: UPDATE documentation/changelog.html

**ACTION**: Add a list entry under the `Unreleased` section describing: "`/relay-design-spec` command + `design-spec-writer`/`design-spec-reviewer` agent pair added — interprets a Figma URL into a business-grounded, human-approved Design Spec (`PRPs/designs/<feature>/design-spec.md`). Unlike the Phase 3 component-map pair, this pair runs inline in the interactive conversation (mirroring `/relay-prd`'s writer/reviewer adoption) and requires the user's own explicit confirmation before the spec can flip to APPROVED. Part of the Figma Implementation Track, Phase 4 of `PRPs/prds/figma-implementation-track.prd.md`." No new versioned `<h2>`; no `plugin.json` bump.

**MIRROR**: Phase 3's own `Unreleased` entry (read the file directly for its current exact shape).

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -qi "relay-design-spec" documentation/changelog.html && grep -q "id=\"unreleased\"" documentation/changelog.html`

### Task 7: UPDATE documentation/reference/commands.html + documentation/reference/agents.html

**ACTION**: Add one entry to the "Design system (Figma track)" section `relay-worktree.md`... — i.e. the section Phase 3 already created in `reference/commands.html` — for `/relay-design-spec`, and two entries to `reference/agents.html` for `design-spec-writer`/`design-spec-reviewer`. Note in each agent's entry that these two are inline-adopted (not Task-dispatched), matching how `reference/agents.html` presumably already annotates `prd-writer`/`prd-reviewer` (read that existing annotation style first and mirror it, rather than inventing new terminology).

**MIRROR**: the existing `prd-writer`/`prd-reviewer` entries on `reference/agents.html` (read directly for the exact inline-adoption annotation wording), plus Phase 3's `design-map-writer`/`design-map-reviewer` entries for general shape.

**ADDRESSES**: AC-A1

**VALIDATE**: `grep -q "relay-design-spec" documentation/reference/commands.html && grep -q "design-spec-writer" documentation/reference/agents.html && grep -q "design-spec-reviewer" documentation/reference/agents.html`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
if grep -q "^name: design-spec-writer" plugins/relay/agents/design-spec-writer.md && grep -q "^name: design-spec-reviewer" plugins/relay/agents/design-spec-reviewer.md; then
  echo "PASS: both new agent files have correct name frontmatter"
else
  echo "FAIL: agent frontmatter name mismatch"; exit 1
fi
if grep -q "invocation_context" plugins/relay/commands/relay-design-spec.md; then
  echo "PASS: command declares invocation_context"
else
  echo "FAIL: command missing invocation_context declaration"; exit 1
fi
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
node -e "
const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('documentation/assets/data/search-index.json', 'utf8'));
const text = JSON.stringify(idx);
for (const name of ['relay-design-spec', 'design-spec-writer', 'design-spec-reviewer']) {
  if (!text.includes(name)) { console.error('FAIL: ' + name + ' not registered in search-index.json'); process.exit(1); }
}
console.log('PASS: search-index.json is valid JSON and all three names are registered');
"
# Diff-scoped, and excludes the standard quoted-prohibition idiom ("... MUST NOT appear ...")
# already used verbatim by 9 APPROVED agent files in this repo (see Phase 2/3 of this same
# feature's Notes sections for the two prior false-positive round-trips this pattern avoids).
if git diff --unified=0 development -- plugins/relay/agents/design-spec-writer.md plugins/relay/agents/design-spec-reviewer.md plugins/relay/commands/relay-design-spec.md docs/context/design-spec-template.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced outside quoted prohibitions"
fi
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given this phase's new command and agent files, when `figma_track` is absent or `false` on any project, then none of the three new files are ever dispatched or invoked by any other command — `npm run validate` passes with zero new gated-emission findings.
- **AC-A2 (PRD AC-3):** Given a Design Spec that has passed `design-spec-reviewer`'s full R-DS1-R-DS7 rubric, when the user has not yet given an explicit affirmative reply, then the spec's status remains DRAFT — the reviewer's Step 4 flip is structurally reachable ONLY from the `main`-mode Step 3 dialogue gate, never automatically, and never from `subagent` mode.
- **AC-A3 (PRD AC-2):** Given a Figma subtree that resolves to an existing component-map REUSE row, when `design-spec-writer` classifies it, then the row cites the real `CM-<n>` id rather than being silently re-classified as NEW — laying the structural foundation Phase 5's plan/PRD wiring and Phase 6's code-review enforcement build on.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The inline-adoption pattern (writer + reviewer both running in the main conversation, not Task-dispatched) is more complex to get right than Phase 3's simpler Task-dispatched pair, given no test project exists yet to exercise it against | M | Medium | Mitigated by mirroring `prd-writer.md`/`prd-reviewer.md`/`relay-prd.md` as closely as possible — those files are proven, already-shipped, already-dogfooded precedents for exactly this interactivity pattern; Phase 7's dogfood is the designated point to surface any real-world gap |
| `component_map_path` may not exist for a project that runs `/relay-design-spec` before ever running `/relay-design-map` | L | Low | Explicitly designed as a documented degraded mode (see Task 1), not a HALT — REUSE classification degrades to NEW-with-a-note rather than blocking spec authoring entirely |
| `documentation/reference/agents.html`'s real annotation style for inline-adopted agents (prd-writer/prd-reviewer) may differ from what this plan assumes | L | Low | Task 7's MIRROR step explicitly reads the existing prd-writer/prd-reviewer entries fresh before writing the new ones |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` is declared, so the pair is active test-after; given all deliverables here are prompt/config/doc-site files (mirroring the Phase 1/Phase 3 `phase_type: scaffold` precedent in this same feature), any resulting test coverage is expected to be structural, not behavioral.

Scope note: this phase deliberately does NOT wire the Design Spec into `plan-writer`/`prd-writer` (that's Phase 5) or actually run `/relay-design-spec` against a real feature (that's Phase 7). Its job is a structurally sound, protocol-conforming first draft of the pair and template, matching Phase 3's precedent for scope discipline.

Lesson applied from Phase 2/3 of this same feature: the Level 3 forbidden-path check is diff-scoped from the start and excludes the "MUST NOT appear" quoted-prohibition idiom from the start, rather than discovering the need for both fixes across two failed attempts.

---

*Generated: 2026-07-23*
*Approved: 2026-07-23*
*Status: APPROVED*
