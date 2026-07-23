# Feature: Foundations (Phase 1 of figma-implementation-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (context-builder skill prose + new validate check module + changelog); impacts the target project's methodology.md contract; establishes a new opt-in configuration key
- Decisions found:
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` — single source of truth for methodology keys
  - [2026-04-19] TDD activation is opt-in by explicit declaration only — the general "no heuristic activation" principle `figma_track` follows
  - [2026-04-30] Plugin manifest version is bumped on every minor/major release cut — an `Unreleased` changelog entry does NOT require a matching `plugin.json` bump (version-parity check skips `id="unreleased"`)
  - [2026-07-12] Validation suite: Node/ESM static-check harness + local pre-commit gate — `scripts/validate/` conventions this phase extends
- Applicable anti-patterns:
  - "Activating the test pair by heuristic" (`docs/anti-patterns.md`) — generalizes: no pipeline track or key may be heuristically inferred; `figma_track` must default `false` and flip only by explicit declaration
  - "Injecting plugin defaults into the target project's `decisions.md`" (`docs/anti-patterns.md`) — `figma_track`'s default lives in the context-builder's own prompt, never hardcoded into a target project's `decisions.md`
- Applicable architectural rules:
  - `docs/context/methodology.md` is the single source of truth for methodology declarations
  - context-builder `*update` PRESERVE-ENTIRELY discipline (never overwrite a human-set value; backfill only when the key is entirely absent)
  - `scripts/validate/` checks are scoped to `plugins/relay/` only — never `plugins/prp-core/`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-implementation-track.prd.md` — Implementation Phases row 1:
  "Foundations" — Goal: Establish the opt-in surface and the "nothing changes when off" guarantee before any feature-facing component exists. — Success
  signal: `npm run validate` passes; a project with the key absent/false shows zero behavioral difference anywhere.

## Summary

This phase adds the `figma_track` opt-in key to the context-builder's `methodology.md` template (default `false`, never heuristically flipped — mirroring the existing `docs_sync` key precedent verbatim), registers `docs/design-system.md` as a new conditionally-generated doc in the context-builder skill (created only when a project later turns `figma_track: true` on), and adds a new deterministic `gating-structure` check to `npm run validate` that asserts the `figma_track` site is documented non-heuristically. No agent or command is user-facing yet — this phase is pure groundwork, establishing the pattern later phases extend additively.

## User Story

As a developer maintaining the relay plugin, I want a `figma_track` opt-in key with the same non-heuristic emission/preservation discipline as `docs_sync`, plus a deterministic check that catches drift from that discipline, so that every later phase of the Figma implementation track has a solid, gated foundation to build on without risking silent heuristic activation.

## Problem Statement

Frontend developers spend disproportionate time and many rounds of prompt iteration implementing layouts already specified in Figma, because describing a feature in prose is not enough for an agent to reproduce a precise design. This phase does not solve that problem directly — it establishes the opt-in surface (`figma_track`) and the "nothing changes when off" guarantee that every subsequent phase depends on.

## Solution Statement

Add `figma_track: false` to the context-builder's `methodology.md` frontmatter template, following the exact emission/preservation/backfill contract already proven by `docs_sync`. Register `docs/design-system.md` as a new conditionally-generated doc (created only when `figma_track: true`). Add a new `gating-structure` deterministic check to `npm run validate` verifying this site is documented non-heuristically. Record the change in `documentation/changelog.html` under `Unreleased` (no `plugin.json` bump needed at this stage).

## Metadata

| Field | Value |
|---|---|
| Type | Infrastructure / configuration |
| Complexity | Low-Medium |
| Systems Affected | context-builder skill, `npm run validate` suite, documentation changelog |
| Dependencies | none |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/figma-implementation-track.prd.md` Implementation Phases row 1 |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 625-661 | The `docs_sync` key emission/preservation/backfill contract — the exact pattern `figma_track` must replicate |
| P0 | `scripts/validate/index.mjs` | 19-45 | The `CHECKS` array registration point for the new `gating-structure` check |
| P1 | `scripts/validate/checks/frontmatter-schema.mjs` | 142-200 | The pure-function + thin-wrapper module split convention every check follows |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 991-1003 | The `[DYNAMIC]` decision-gate mandatory-sources registration block — the pattern for registering `docs/design-system.md` |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 1298-1335 | KNOWLEDGE_BASE.md required-entries registration site |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 1345-1360 | CLAUDE.md "Context & Domain" pointer registration site |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 1515-1536 | Content Placement table registration site |
| P2 | `scripts/validate/checks/docs-sync-phase2.test.mjs` | 1-40 | Precedent for testing prompt/config markdown files via `readFileSync` content assertions (no production module to import) — the shape `test-writer` will likely follow test-after for `gating-structure.mjs` |
| P2 | `PRPs/prds/figma-implementation-track.prd.md` | Acceptance Criteria (AC-1, AC-4) | AC-1 ("inert when off") and AC-4 ("non-heuristic declaration") are the acceptance contract this phase's groundwork exists to satisfy in later phases |

## Patterns to Mirror

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:625-661
[docs_sync emission/preservation/backfill prose — the non-heuristic
key contract `figma_track` must replicate verbatim in shape: init
always emits the deterministic default; update preserves an existing
set value untouched; update backfills the key only when entirely
absent; heuristics MUST NOT flip the value.]
```
Copied into Task 1 as the structural template for the new `figma_track` prose block.

```
# SOURCE: scripts/validate/index.mjs:19-45
const CHECKS = [
  runVersionParityCheck,
  runNativeValidateCheck,
  ...
  runArtifactNamingCheck,
  runBootstrapParityCheck,
];
```
Copied into Task 3 as the registration point for `runGatingStructureCheck`.

```
# SOURCE: scripts/validate/checks/frontmatter-schema.mjs:142-200
export function checkFrontmatterSchema({ files }) { /* pure, no I/O */ }
export function runFrontmatterSchemaCheck() { /* thin I/O wrapper, delegates */ }
```
Copied into Task 3 as the module-shape template for `gating-structure.mjs`.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:991-1003
<!-- [DYNAMIC] Add one row per docs/domain/areas/*.md file found in
Phase 3: | `docs/domain/areas/[area].md` | Business rules for [area] | -->
```
Copied into Task 2 as the pattern for registering `docs/design-system.md`'s conditional decision-gate row.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | Add `figma_track: false` key emission/preservation/backfill (Task 1) + register `docs/design-system.md` as a new conditionally-generated doc across its 4 registration sites (Task 2) |
| `scripts/validate/checks/gating-structure.mjs` | CREATE | New deterministic check verifying the `figma_track` site is documented non-heuristically |
| `scripts/validate/index.mjs` | UPDATE | Register `runGatingStructureCheck` in the `CHECKS` array |
| `documentation/changelog.html` | UPDATE | Add an `Unreleased` entry for this phase |

## NOT Building (Scope Limits)

- **Actual creation of `docs/design-system.md` content** — deferred to Phase 3 (`/relay-design-map`), the first phase where a real project can turn `figma_track: true` on. This phase only registers the doc's generation machinery.
- **Extensions to `artifact-naming.mjs` / `path-existence.mjs`** — no Figma-conditional artifact-naming or path pattern exists yet at this phase (research confirmed no hook point in either check); deferred to the phase that introduces the relevant new path/name convention.
- **Advisory structural-absence `promptfoo` eval fixtures** — genuinely underspecified; no "structural-absence, non-LLM" fixture style exists yet in this repo's `promptfooconfig.yaml` (confirmed by codebase research gap). Recorded as an open risk below rather than forced into a task this phase.
- **`plugin.json` version bump** — deferred to the release-cut at the end of the rollout (Phase 7 per the PRD). This phase's changelog entry stays under `Unreleased`, so `version-parity` remains green without a bump (per the 2026-04-30 decision).
- **Any new agent or command file** — none are user-facing yet per this phase's Goal.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/skills/context-builder/SKILL.md — figma_track key

**ACTION**: In Step 5 (methodology.md frontmatter template), add a new key `figma_track: false` immediately after the existing `docs_sync` key. Add emission/preservation/backfill prose mirroring `docs_sync`'s exact contract: `*init` always emits `figma_track: false` deterministically (never heuristically inferred); `*update` preserves an existing set value untouched; `*update` backfills `figma_track: false` only when the key is entirely absent from an existing file. Document that `figma_track` is flipped to `true` only by a human edit or by the explicit confirmation step of the future `/relay-design-map` command (Phase 3) — never by heuristic detection of Figma-related file names or content.

**MIRROR**: `plugins/relay/skills/context-builder/SKILL.md:625-661` (the `docs_sync` prose block).

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**: `grep -q "figma_track" plugins/relay/skills/context-builder/SKILL.md && grep -q "figma_track: false" plugins/relay/skills/context-builder/SKILL.md`

### Task 2: UPDATE plugins/relay/skills/context-builder/SKILL.md — register docs/design-system.md

**ACTION**: Add a new step registering `docs/design-system.md` as a conditionally-generated doc: created strictly when `figma_track: true` (detection alone, i.e. `figma_track: false`, emits only a one-line "observed signal, not generated" report note); PRESERVE-ENTIRELY on `*update` once it exists. Wire the registration into all four sites research identified: (a) the `[DYNAMIC]` decision-gate mandatory-sources block, (b) the `KNOWLEDGE_BASE.md` required-entries list, (c) the `CLAUDE.md` "Context & Domain" pointer block, (d) the Content Placement table. Document the doc's intended content (npm package name, local clone path, token module, Figma library file keys, `dev_server` config block) as forward-looking scaffolding for Phase 3 — this phase does not generate the file itself.

**MIRROR**: `plugins/relay/skills/context-builder/SKILL.md:991-1003` (DYNAMIC block pattern), `:1298-1335` (KB entries), `:1345-1360` (CLAUDE.md pointer), `:1515-1536` (Content Placement table).

**ADDRESSES**: AC-A4

**VALIDATE**: `for site in "design-system.md"; do grep -q "$site" plugins/relay/skills/context-builder/SKILL.md || { echo "FAIL: $site not registered"; exit 1; }; done; echo "PASS: design-system.md registered"`

### Task 3: CREATE scripts/validate/checks/gating-structure.mjs + UPDATE scripts/validate/index.mjs

**ACTION**: Create `scripts/validate/checks/gating-structure.mjs` following the pure-function + thin-wrapper split: a pure `checkGatingStructure({ skillContent })` function that verifies the `figma_track` block in `SKILL.md` content documents all three non-heuristic properties (default-false emission, preserve-on-update, backfill-only-when-absent) using the same three markers `docs_sync`'s block uses, returning `{ name: "gating-structure", ok, findings }`; a thin `runGatingStructureCheck()` wrapper that reads `plugins/relay/skills/context-builder/SKILL.md` and delegates. This check module is intentionally extensible: later phases append additional site checks to the same module rather than creating a new check each time. Register `runGatingStructureCheck` in `scripts/validate/index.mjs`'s `CHECKS` array.

**MIRROR**: `scripts/validate/checks/frontmatter-schema.mjs:142-200` (pure/wrapper split), `scripts/validate/index.mjs:19-45` (CHECKS array registration).

**ADDRESSES**: AC-A2

**VALIDATE**: `output=$(npm run validate 2>&1); status=$?; echo "$output" | grep -q "gating-structure" || { echo "FAIL: gating-structure check name not found in validate output"; exit 1; }; exit $status`

### Task 4: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a list entry under the `Unreleased` section (create the section if absent, matching the existing changelog's heading structure) describing: "`figma_track` opt-in key added to `methodology.md` (default off); `docs/design-system.md` registered as a future conditionally-generated doc; new `gating-structure` deterministic check in `npm run validate`. Part of the Figma Implementation Track, Phase 1 of `PRPs/prds/figma-implementation-track.prd.md`." Do NOT create a new versioned `<h2>` release heading and do NOT bump `plugins/relay/.claude-plugin/plugin.json` — this stays under `Unreleased` so `version-parity` remains green.

**MIRROR**: existing `documentation/changelog.html` entry structure (most recent `Unreleased` or versioned entry, for exact HTML shape).

**ADDRESSES**: AC-A3

**VALIDATE**: `grep -qi "figma_track" documentation/changelog.html && grep -q "id=\"unreleased\"" documentation/changelog.html`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
if grep -nE "figma_track" plugins/relay/skills/context-builder/SKILL.md >/dev/null; then
  echo "PASS: figma_track key documented in SKILL.md"
else
  echo "FAIL: figma_track key missing from SKILL.md"; exit 1
fi
if grep -nq "design-system.md" plugins/relay/skills/context-builder/SKILL.md; then
  echo "PASS: design-system.md registered"
else
  echo "FAIL: design-system.md not registered"; exit 1
fi
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
node --check scripts/validate/checks/gating-structure.mjs
node -e "import('./scripts/validate/checks/gating-structure.mjs').then(m => { if (typeof m.runGatingStructureCheck !== 'function') { console.error('FAIL: runGatingStructureCheck not exported'); process.exit(1); } console.log('PASS: module exports runGatingStructureCheck'); })"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a project where `figma_track` is absent from `docs/context/methodology.md` (this repo's own current state, before Phase 3 flips it), when `npm run validate` runs, then it passes with zero Figma-related findings — confirming the groundwork introduces no behavioral change.
- **AC-A2 (PRD AC-4):** Given the new `figma_track` key documentation in `SKILL.md`, when the `gating-structure` check runs, then it verifies all three non-heuristic properties (default-false, preserve-on-update, backfill-only-when-absent) are present — establishing the structural precedent `design_source` (Phase 5) will extend.
- **AC-A3 (PRD AC-1):** Given `documentation/changelog.html`'s `Unreleased` section gains this phase's entry, when `npm run validate`'s `version-parity` check runs, then it still passes without requiring a `plugin.json` bump.
- **AC-A4 (PRD AC-4):** Given `docs/design-system.md` is registered but not yet generated (no project has `figma_track: true` yet), when `context-builder *init` or `*update` runs against any project, then it emits at most a one-line "observed signal, not generated" note — never the full doc — until `figma_track: true`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Advisory structural-absence `promptfoo` eval fixtures remain undesigned after this phase | M | Low | Explicitly deferred (see NOT Building); the `gating-structure` deterministic check is the load-bearing enforcement mechanism — the eval layer is advisory-only per the PRD's own framing, not required for AC-1/AC-4 |
| `gating-structure.mjs`'s "site" list is a single entry after this phase (`figma_track` only) | L | Low | By design — later phases (5, 6) append new site checks to the same module additively, matching the R-COH-* additive-rubric precedent already established in `code-reviewer.md` |
| `documentation/changelog.html`'s exact HTML structure may drift from what research observed | L | Low | Task 4's MIRROR step reads the file's current state directly before editing, rather than relying solely on cached research findings |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` is declared here, so the pair is active: it authors `scripts/validate/checks/gating-structure.test.mjs` (readFileSync-based content assertions, mirroring `docs-sync-phase2.test.mjs`'s established idiom for prompt/config markdown coverage) after this phase's implementation lands.

Research degradation note: `research-web`'s market-context pass returned useful adjacent findings (opt-in feature-flag conventions, pre-commit gate design patterns) but explicitly flagged that no source addresses Claude Code plugin configuration keys specifically — the ecosystem is too new for public precedent. This is expected and does not block the phase; the internal `docs_sync` precedent is the load-bearing pattern.

---

*Generated: 2026-07-22*
*Approved: 2026-07-22*
*Status: APPROVED*
