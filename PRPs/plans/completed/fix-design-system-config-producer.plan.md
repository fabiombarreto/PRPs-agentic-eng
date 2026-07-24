# Feature: Fix the orphaned docs/context/design-system.md config producer (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions (correcting a command's precondition/producer contract for a load-bearing config file); cross-cutting patterns (one underlying fact — the file's path and generation ownership — must stay synchronized across a command prompt, a skill prompt, and the rendered documentation site); reuse of existing components (mirrors the repo's existing scaffold-then-preserve pattern and its existing named-HALT-message shape)
- Decisions found:
  - `docs/decisions.md` [2026-07-23] "`R-COH-DS-REUSE` ... gap-closing addition after all 7 Figma Implementation Track phases" — direct precedent for this exact shape of work: a standalone, description-mode gap-closing fix against an already-complete (all 7 phases `complete`), APPROVED PRD, with no new phase row added and the PRD itself never reopened/mutated.
  - `docs/decisions.md` [2026-06-16] "`/relay-plan` PRD-less mode: SHIPPED" — the mechanism this plan itself uses (flat `PRPs/plans/<slug>.plan.md` filename, verbatim `## Source`, derived `AC-A<i>` items with no `(PRD AC-N)` token, no PRD back-fill, mandatory `## NOT Building` section).
  - `docs/decisions.md` [2026-07-09] "Validation commands must carry real exit-code semantics; plan-reviewer enforces via R-COH-VALIDATE-ALWAYS-PASS" — governs every Level/VALIDATE command below; the `<check> && echo PASS || echo FAIL` idiom is forbidden.
  - `docs/decisions.md` [2026-07-23] "Component map is a durable `docs/design/` knowledge-base artifact, not a per-run `PRPs/` pipeline artifact" — establishes that `docs/context/design-system.md` (like `component-map.md`) is project-durable config, not a `PRPs/` run artifact; consistent with this fix never touching `PRPs/`.
  - `docs/anti-patterns.md` "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — `/relay-design-map`'s Phase E confirmation/flip logic is the one sanctioned non-heuristic path and is explicitly OUT of this fix's scope; it is not touched.
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (`docs/anti-patterns.md` lines 60-66) — not applicable; this fix writes nothing under `PRPs/` or `.claude/`, only edits existing files under `plugins/relay/` and `documentation/`.
  - "Weakening or deleting tests to make the auto-correction loop turn green" — not applicable; this plan explicitly does NOT edit the one coupled test file (`scripts/validate/checks/figma-track-phase1.test.mjs`) and instead flags its required update as downstream `test-writer`/`test-reviewer`-owned work (see `## Notes`).
- Applicable architectural rules:
  - `documentation/AGENTS.md` §6 three-file registration rule — triggers only on page add/rename/remove; this fix edits existing content on an already-registered page (`documentation/reference/commands.html`), so NAV and `search-index.json` are unaffected, but a `documentation/changelog.html` entry is still mandatory (§7.4) for the touched page.
  - `docs/decisions.md` [2026-05-06] / [2026-07-10] "R-X strict" — the Implementer never edits test files; this is why `## Step-by-Step Tasks` below contains no task touching any `*.test.mjs` file.
  - PRP artifact paths convention (`docs/context/architecture.md`) — not applicable; no `PRPs/` write occurs in this plan.
- Result: PROCEED
```

## Source

Fix the orphaned/dead-end `docs/context/design-system.md` config artifact in the relay plugin's figma-implementation-track feature. A prior 6-agent investigation (reading the real shipped files) established these FACTS — re-verify each line reference yourself before writing tasks, but treat the conclusions as the agreed design:

CORE BUG: `plugins/relay/commands/relay-design-map.md` precondition P2 (around lines 133-147) HALTs with `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` when `docs/context/design-system.md` is absent, and its error message tells the user to "Run `context-builder *update` first to generate it." But `plugins/relay/skills/context-builder/SKILL.md` contains NO logic that generates that file — grep it for `package_name`, `local_clone_path`, `figma_library_file_keys`, `tokens_module`, `dev_server`, `storage_state_path` and you get zero hits. So the user hits a dead end: the command points them at a command that does nothing.

LOAD-BEARING VERDICT (do NOT just delete the precondition): `/relay-design-map` genuinely READS and parses 5 frontmatter fields from that file in its Phase A (lines ~151-164): package name, local clone path, token module path, Figma library file key(s), and the dev_server block (start command + port) — held as `design_system_config` and consumed downstream (Phase B `search_design_system`, Phase C writer dispatch payload, Phase D preflight). Removing P2 would break a real consumer. The file IS load-bearing for component-map generation. (Note: the VISUAL pipeline — provision.mjs/capture.mjs/compare.mjs/visual-verifier.md — does NOT read this file at all; its dev-server URL is hardcoded to localhost:3000 and its frames/auth come from the Design Spec. So `/relay-design-map` is the file's ONLY consumer.)

CHICKEN-AND-EGG (this is why the producer must live in the command, not context-builder): `/relay-design-map` does NOT require `figma_track: true` — its only preconditions are P1 (Figma MCP reachable) and P2 (this file exists). It is the command that FLIPS `figma_track` to true at its very end (Phase D, after the map is APPROVED). So on a fresh project `figma_track` is still false when `/relay-design-map` first runs. Any context-builder generator gated on `figma_track: true` (which is what SKILL.md's stubs imply) could NEVER produce the file the command needs before the flip. The gating is backwards for bootstrap. Therefore the producer belongs in the command itself.

THE FIX (implement all of these as one cohesive change):

1. PRODUCER — In `plugins/relay/commands/relay-design-map.md` P2: change "HALT-on-absence" into "scaffold-then-HALT". When `docs/context/design-system.md` is absent, WRITE a skeleton file to that exact path with a YAML frontmatter carrying the required keys (package_name, local_clone_path, tokens_module, figma_library_file_keys, and a dev_server block with command + port). Infer what is cheaply inferable from the target project (e.g. package_name from the project's package.json if present) and mark every field the command cannot know — especially figma_library_file_keys, local_clone_path — with an explicit `[INFERRED - VALIDATE]` / TODO placeholder, mirroring the [INFERRED - VALIDATE] convention context-builder already uses for other generated docs. After scaffolding, still HALT (the file is not yet usable until the human fills the Figma-specific keys), but with a NEW, accurate message: it created a starter file at docs/context/design-system.md, lists which keys the human must fill in (the Figma library keys, clone path), and says to re-run `/relay-design-map` after filling them. REMOVE the false "Run `context-builder *update` first to generate it" instruction. Keep Phase A/B/C/D consumer logic unchanged (already correct path spelling). You may keep the HALT code name FAILED_DESIGN_SYSTEM_CONFIG_MISSING or rename to something like FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE — your call, but update every enumeration of it (there is a HALT-code list around relay-design-map.md:351, and the documentation/reference/commands.html mirror around :258 — verify).

2. PATH NORMALIZATION — In `plugins/relay/skills/context-builder/SKILL.md`, five references use the WRONG bare spelling `docs/design-system.md` (no context/ segment): around lines 1024 (decision-gate [DYNAMIC] row), 1338 (KNOWLEDGE_BASE required-entries bullet), 1392 and 1395 (CLAUDE.md Context & Domain pointer — two occurrences), and 1565 (Content Placement table row). Normalize ALL of them to `docs/context/design-system.md`. Verify exact line numbers yourself.

3. STUB HONESTY — In the same SKILL.md sites, the stub wording currently claims the file is "generated in Phase 3 of the Figma implementation track" / "the file does not exist yet." That is misleading (Phase 3 = /relay-design-map, the consumer). Update the wording so it accurately says the file is COMMAND-OWNED: scaffolded by `/relay-design-map` on first run, and PRESERVE-ENTIRELY on context-builder `*update` (context-builder registers/preserves it but never generates it). Keep the registration itself (the four sites stay — they correctly register a real, now-producible file); only correct the generation claim and the path.

4. COUPLED TEST — `scripts/validate/checks/figma-track-phase1.test.mjs` asserts the EXACT old stub strings including the bare `docs/design-system.md` spelling and the old stub wording (assertions around lines 132, 179-188, 193-200, 208-215, 223-229 — verify). These WILL break when tasks 2/3 land. Your plan must explicitly flag, in its ## Notes section, that this existing test's assertions must be updated (as an EXISTING_TEST_UPDATED lifecycle event owned by the test-writer/test-reviewer pair, per this repo's tdd:false test-after methodology) to expect the normalized path and corrected stub wording. Do NOT write a task instructing the implementer to edit the test file (R-X: the implementer never edits tests) — instead note it as required downstream test-pair work so the orchestrator sequences it. (Cross-check the OTHER coupled checks the investigation flagged as NOT coupled and must-not-touch: path-existence.mjs and registration-parity.mjs contain zero design-system references; figma-track-phase3.test.mjs references only the bare phrase "design-system clone", not the .md file.)

5. STALE TEXT (same file, bonus, in-scope) — `plugins/relay/commands/relay-design-map.md` Phase D preflight (around lines 265-269) still says plugins/relay/scripts/visual/ "is Phase 6's deliverable, not shipped as of this phase." Phase 6 shipped; the scripts exist now. Correct this stale conditional text to reflect that the directory exists.

6. DOCUMENTATION SITE — Any change to relay-design-map.md's P2 behavior/message means its rendered mirror must stay in sync. Read `documentation/AGENTS.md` FIRST (binding contract). Update `documentation/reference/commands.html`'s /relay-design-map entry (around :252-258) to mirror the new scaffold-then-HALT P2 behavior and the (possibly renamed) HALT code. Add a NEW entry to `documentation/changelog.html` describing this fix (mandatory for any documentation/ change — do not rewrite the historical :35 entry). Honor the three-file registration rule (NAV + search index + changelog) if applicable — verify whether search-index.json needs a touch.

DO NOT TOUCH (completed historical record): PRPs/prds/figma-implementation-track.prd.md, and anything under PRPs/plans/completed/ — these are the finished planning record and must not be rewritten even though they contain the old spelling.

METHODOLOGY: this repo is relay's own source; docs/context/methodology.md declares tdd:false, test_frameworks:["node:test"], docs_sync:true, and does NOT declare figma_track:true (so no design_source machinery applies to this plan — this is a plain PRD-less bug-fix plan). phase_type should be scaffold or foundation (the VALIDATE commands will be grep/node --check/npm-run-validate, no new test-framework invocation authored by the implementer — the test pair owns the test update). Follow the Phase-1 lesson: grep/npm-only VALIDATE with no test-framework invocation as the first token => phase_type scaffold/foundation, never feature.

## Summary

`/relay-design-map`'s P2 precondition currently HALTs with `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` when `docs/context/design-system.md` is absent, and its message sends the user to `context-builder *update` — a command that has zero logic to generate this file, verified by direct grep (no `package_name`/`local_clone_path`/`figma_library_file_keys`/`tokens_module`/`dev_server`/`storage_state_path` hits anywhere in `SKILL.md`). This fix turns P2 from "HALT-on-absence" into "scaffold-then-HALT": the command itself writes a starter `docs/context/design-system.md` with `[INFERRED - VALIDATE]` placeholders for fields it cannot know, then still HALTs with an accurate message naming exactly which keys need a human value. It also normalizes five bare `docs/design-system.md` path mentions in `SKILL.md` to the correct `docs/context/design-system.md`, corrects the accompanying "generated in Phase 3" stub claim to accurately describe the file as command-owned and scaffolded (not context-builder-generated), fixes a second stale claim in the same command file (Phase D's preflight text still says the Phase 6 visual-tooling directory "is not shipped as of this phase," when it demonstrably exists on disk), and syncs the rendered documentation mirror (`documentation/reference/commands.html`) plus a new `documentation/changelog.html` entry. The one coupled test file (`scripts/validate/checks/figma-track-phase1.test.mjs`) asserts the exact old strings this fix corrects; its required update is explicitly deferred to the test-writer/test-reviewer pair (R-X strict — the Implementer never edits tests) and flagged in `## Notes`.

## User Story

As a relay user running `/relay-design-map` for the first time on a fresh, Figma-enabled project
I want the command to scaffold a starter `docs/context/design-system.md` (with clearly marked placeholders) instead of pointing me at a `context-builder *update` step that does nothing
So that I have a concrete, fillable file and an accurate HALT message instead of hitting a dead end

## Problem Statement

`/relay-design-map`'s P2 precondition is a pure HALT-on-absence check whose remediation instruction ("Run `context-builder *update` first to generate it") is false: `context-builder`'s `SKILL.md` has no code path that writes `docs/context/design-system.md` at all — confirmed by a zero-hit grep across the file for every frontmatter key `/relay-design-map`'s own Phase A parses (`package_name`, `local_clone_path`, `figma_library_file_keys`, `tokens_module`, `dev_server`). Compounding this, `SKILL.md`'s four conditional-registration sites for this file use the wrong bare path spelling `docs/design-system.md` (missing the `context/` segment) and describe the file as "generated in Phase 3 of the Figma implementation track" — but Phase 3 is `/relay-design-map` itself, the file's sole *consumer*, not its producer. A separate, unrelated stale claim in the same command file (`relay-design-map.md`'s Phase D preflight) still describes the Phase 6 visual-tooling directory as unshipped, though it now exists on disk (`plugins/relay/scripts/visual/{provision,capture,compare}.mjs`, confirmed present). None of this is cosmetic: a user following the command's own instructions cannot produce the file it requires, and the four SKILL.md registration sites actively mis-describe both the file's location and its provenance.

## Solution Statement

Turn P2 into a scaffold-then-HALT producer: on absence, `relay-design-map.md` writes a skeleton `docs/context/design-system.md` with the required YAML frontmatter, inferring what is cheaply inferable (e.g. `package_name` from the target project's `package.json`) and marking every field it cannot infer with `[INFERRED - VALIDATE]`, then HALTs with a new, accurate message naming exactly which keys need a human value and instructing a re-run — with the false `context-builder *update` instruction removed entirely. Phase A/B/C/D's existing consumer logic (already correctly spelled) is left untouched. Every enumeration of the HALT code (the P2 body itself, the "Final output surface" list, and the `documentation/reference/commands.html` mirror) is kept byte-consistent, whichever code name is used. All four SKILL.md registration sites are normalized to the correct `docs/context/design-system.md` path and corrected to describe the file as command-owned (scaffolded by `/relay-design-map`, preserved — never generated — by `context-builder *update`). The separate Phase D preflight staleness is corrected in the same file. The documentation site mirror and changelog are updated to match, and the one coupled test file's required update is flagged as downstream test-pair work rather than touched directly.

## Metadata

| Key | Value |
|---|---|
| Type | Bug fix — dead-end precondition + prompt/doc-site content sync |
| Complexity | Medium |
| Systems Affected | `plugins/relay/commands/relay-design-map.md`; `plugins/relay/skills/context-builder/SKILL.md`; `documentation/reference/commands.html`; `documentation/changelog.html` |
| Dependencies | None — standalone fix against an already-complete (all 7 phases `complete`), APPROVED `PRPs/prds/figma-implementation-track.prd.md`; no new PRD phase row |
| Estimated Tasks | 6 |
| Source PRD line ref | N/A — description mode, no source PRD |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/commands/relay-design-map.md` | 133-147 | P2 precondition — the core bug: HALT-only, remediation points at a non-existent generator |
| P0 | `plugins/relay/commands/relay-design-map.md` | 151-164 | Phase A — proves the file is load-bearing: 5 frontmatter fields parsed and held as `design_system_config`, consumed by Phase B/C/D |
| P0 | `plugins/relay/commands/relay-design-map.md` | 236-248 | Phase C's `FAILED_MAP_REVIEW_BUDGET_EXCEEDED` HALT — the named-code, multi-line actionable-message shape the new P2 message should mirror |
| P0 | `plugins/relay/commands/relay-design-map.md` | 264-272 | Phase D preflight step 2 — stale "Phase 6 not shipped" conditional text |
| P0 | `plugins/relay/commands/relay-design-map.md` | 380-383 | Constraints (hard rules), hard rule 6 — a SECOND, differently-worded stale "not-yet-shipped ... tooling (Phase 6)" claim about the same directory, missed by the original Phase-D-only fix scope |
| P0 | `plugins/relay/commands/relay-design-map.md` | 348-355 | "Final output surface" HALT-code enumeration — must stay byte-consistent with P2's chosen code name |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 1020-1027 | Decision-gate `[DYNAMIC]` mandatory-sources row — bare path + stale generation claim |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 1338-1343 | KNOWLEDGE_BASE.md required-entries bullet — bare path + stale generation claim |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 1392-1398 | CLAUDE.md `Context & Domain` conditional pointer — bare path (two occurrences) + stale generation claim |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 1565 | Content Placement table row — bare path |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 307-336 | Existing scaffold-file precedent (`PRPs/redaction-extensions.txt` default-content + Init/Update behavior) — closest in-repo pattern for "write a starter file with placeholder markers" |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 100 | Anti-pattern table row defining the `[INFERRED - VALIDATE]` marker convention |
| P1 | `documentation/reference/commands.html` | 249-263 | `/relay-design-map` `<div class="kv">` reference entry — note line 252's path is already correctly spelled; only 258 (Preconditions) and 260 (Preflight) are stale |
| P1 | `documentation/changelog.html` | 31-41 | Unreleased/Added block — new Fixed heading must sit here; the byte-asserted historical entry (~line 35) must stay untouched |
| P1 | `documentation/AGENTS.md` | 239-286 | Three-file registration rule (only triggers on add/rename/remove) + changelog entry-shape/versioning conventions governing the changelog task |
| P2 | `scripts/validate/checks/figma-track-phase1.test.mjs` | 179-230 | Coupled test asserting the OLD bare spelling + stale wording at all 4 SKILL.md sites — breaks the moment SKILL.md is corrected; flagged in `## Notes` as `EXISTING_TEST_UPDATED`, owned by the test pair |
| P2 | `scripts/validate/checks/figma-track-phase3.test.mjs` | 267-281 | Confirmed: asserts only the phrase "design-system clone" (the source-code clone concept), never the `.md` config file — zero coupling |
| P2 | `scripts/validate/checks/path-existence.mjs` | 1-50, 150-167 | Confirmed: only scans backtick `scripts/…` / `${CLAUDE_PLUGIN_ROOT}/…` tokens and `[text](docs/…md)` markdown links — a bare `docs/design-system.md` backtick mention is outside its scan classes — zero coupling |
| P2 | `scripts/validate/checks/registration-parity.mjs` | 1-60 | Confirmed: diffs `/relay-<command>` mentions and agent names only — zero design-system.md coupling |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-design-map.md:236-248
     > FAILED_MAP_REVIEW_BUDGET_EXCEEDED: `design-map-reviewer` returned
     > CHANGES_REQUESTED `<N>` times, exceeding `max_map_review_retries
     > = 2`. Last failing items:
     >   - R-DM<i>: <reason>
     >   - R-DM<j>: <reason>
     > `/relay-design-map` never silently accepts a failing map. Review
     > the reasons above, fix the underlying issue (evidence gap,
     > design-system clone mismatch, or a `design-map-writer` defect),
     > and re-run `/relay-design-map`.

     Do NOT proceed to Phase D. Do NOT flip `figma_track`. Exit
     non-zero.
```
Task 1 mirrors this named-code, multi-line actionable-HALT-message shape for the new P2 message (name the exact keys needing a human value, instruct a re-run, state what does NOT happen).

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:316-336
**Default content (init creation):**

```
# PRPs/redaction-extensions.txt
#
# Per-project extensions to the Test Runner redaction policy.
# Full catalog and semantics: docs/context/redaction-policy.md
# (in the relay plugin repo).
#
# Format: one entry per line. Blank lines and `#` comments ignored.
#
# Env var names (exact match, or glob with *):
#   PHOENIX_AUTH_PROXY_SECRET
#   LEGACY_*_API
#
# Value regex — prefix with `regex:`:
#   regex:phoenix-[a-f0-9]{32}
#
# Entries added here stack on top of Layer 1 invariants; they can
# only add rules, never remove them.
```

### Init behavior

- If the file does NOT exist: create with the default content above.
- If it exists and Phase 0 user chose [R] Recreate: overwrite with default.
- Otherwise (exists, not [R]): HALT with clear error, same as Phase 1.5.
```
Task 1 mirrors this "write a default-content skeleton file, describe what happens on absence vs. presence" shape — adapted: the producer here is a command (`/relay-design-map`), not `context-builder`, and it still HALTs after scaffolding (never silently proceeds), unlike this precedent which proceeds after creation.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:100
| Asserting inferred rules without marking them | Always use [INFERRED - VALIDATE] |
```
Task 1 copies this exact bracket-marker convention verbatim for every field the scaffolded `docs/context/design-system.md` cannot cheaply infer (`figma_library_file_keys`, `local_clone_path`, and any other unresolvable field).

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:1020-1027 (current wrong state — corrected by Task 4)
<!-- [DYNAMIC] When `figma_track: true` in docs/context/methodology.md, add:
| `docs/design-system.md` | Figma design-system source of truth (component tokens, library file keys, dev server config) — generated in Phase 3 of the Figma implementation track |
Detection alone (figma_track: false) does NOT add this row or generate the
file — emit at most a one-line "observed signal, not generated" report note.
-->
```
Task 4 corrects this exact block (bare path + "generated in Phase 3" claim) at all four SKILL.md sites; the other three sites (1338-1343, 1392-1398, 1565) share the identical two defects and are corrected the same way.

```
# SOURCE: documentation/reference/commands.html:249-263 (existing kv block shape — preserved, not replaced)
      <h3 id="relay-design-map"><code>/relay-design-map [--refresh]</code> <span class="badge badge--done">implemented</span></h3>
      <div class="kv">
        <dt>Input</dt>
        <dd>No required argument. Optional <code>--refresh</code> flag selects an additive re-scan instead of the one-time setup path. Reads <code>docs/context/design-system.md</code> frontmatter (package name, local design-system clone path, token module path, Figma library file keys, <code>dev_server</code> block).</dd>
```
Task 5 preserves this exact `<dt>`/`<dd>` kv structure and only edits the text content of the `Preconditions` and `Preflight` `<dd>` rows (lines 258 and 260) — the `Input` row at line 252 already carries the correct path and needs no change.

```
# SOURCE: documentation/changelog.html:33-46 (existing Unreleased/Added heading id-pattern + list shape)
      <h3 id="unreleased-added">Added</h3>
      <ul>
        <li><code>figma_track</code> opt-in key added to <code>methodology.md</code> (default off); ...
      </ul>
      ...
      <h3 id="v0-22-0-changed">Changed</h3>
      <ul>
```
Task 6 mirrors this exact `<h3 id="unreleased-...">` + `<ul><li>` shape to add a new `<h3 id="unreleased-fixed">Fixed</h3>` block under `Unreleased`, positioned after the existing `Added` block's closing `</ul>` and before the `v0-22-0` heading — the pre-existing `Added` `<li>` entries (including the byte-asserted `figma_track`/`design-system.md` one) are left completely untouched.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/commands/relay-design-map.md` | UPDATE | Core bug fix: P2 becomes a scaffold-then-HALT producer; the HALT-code enumeration (~:351) is kept consistent with P2's chosen code name; BOTH stale "Phase 6 not shipped" claims about the now-shipped `plugins/relay/scripts/visual/` tooling are corrected — Phase D preflight step 2 (~:264-272) and Constraints hard rule 6 (~:380-383) |
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | Normalize all 4 bare `docs/design-system.md` registration sites to `docs/context/design-system.md`; correct the "generated in Phase 3 of the Figma implementation track" / "does not exist yet" stub claim to accurately describe the file as command-owned and scaffolded by `/relay-design-map` |
| `documentation/reference/commands.html` | UPDATE | Mirror the new scaffold-then-HALT P2 behavior, the (possibly renamed) HALT code, and the Phase-6-shipped preflight correction in the `/relay-design-map` reference entry |
| `documentation/changelog.html` | UPDATE | Add a new `Unreleased`/`Fixed` entry describing this fix (§7.4 of `documentation/AGENTS.md` mandates a changelog entry for every `documentation/`-touching change); the pre-existing `Unreleased`/`Added` entry byte-asserted by `figma-track-phase1.test.mjs` is left completely untouched |

## NOT Building (Scope Limits)

- Does NOT touch `PRPs/prds/figma-implementation-track.prd.md` or anything under `PRPs/plans/completed/` — these are the finished planning record and are explicitly excluded even though they contain the old bare-path spelling.
- Does NOT edit `scripts/validate/checks/figma-track-phase1.test.mjs` — its required assertion update is `EXISTING_TEST_UPDATED` work owned by the `test-writer`/`test-reviewer` pair (R-X strict: the Implementer never edits test files), flagged in `## Notes` for the orchestrator to sequence downstream, never performed by this plan's own tasks.
- Does NOT touch `scripts/validate/checks/path-existence.mjs` or `scripts/validate/checks/registration-parity.mjs` — confirmed by direct read: zero `docs/design-system.md` coupling in either check's scan scope; no change needed.
- Does NOT touch `scripts/validate/checks/figma-track-phase3.test.mjs` — confirmed by direct read: it asserts only the bare phrase "design-system clone" (the source-code clone concept, e.g. in `design-map-reviewer.md`'s R-DM1 rubric text), never the `.md` config file; no change needed.
- Does NOT modify `/relay-design-map`'s Phase A/B/C/D consumer logic beyond what P2's producer change requires — those phases already spell the path correctly and their parsing/dispatch behavior is unchanged once a human fills the scaffolded file's placeholders.
- Does NOT modify `/relay-design-map`'s Phase E (the sanctioned `figma_track: true` confirmation-and-flip logic) in any way — that logic, and the anti-pattern it satisfies, is completely out of scope for this fix.
- Does NOT implement any other Figma Implementation Track phase content (Code Connect write-back, new MCP querying, Design Spec/Plan Integration/Visual loop changes) — scope is strictly the P2 producer bug and its three direct mirrors.
- Does NOT flip `figma_track` in this repository's own `docs/context/methodology.md` — this plan does not touch that file at all (confirmed: the key is currently entirely absent from it).
- Does NOT modify `docs/api-reference.md` — checked directly; it carries only a high-level command-table mention of `/relay-design-map` with no precondition-level text requiring sync.
- Does NOT touch `documentation/assets/js/app.js` (NAV) or `documentation/assets/data/search-index.json` — this fix edits existing prose on an already-registered page (not an add/rename/remove), so the three-file registration rule's page-identity triggers do not fire; confirmed the `commands.html` search-index excerpt does not quote any of the stale text being corrected.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/commands/relay-design-map.md — P2 scaffold-then-HALT producer

- **ACTION**: Replace the P2 section body (currently lines 133-147: HALT-only, pointing at `context-builder *update`) with a scaffold-then-HALT producer:
  1. Check for `docs/context/design-system.md` at the target project root, unchanged.
  2. If absent: WRITE a skeleton file at that exact path with YAML frontmatter carrying `package_name`, `local_clone_path`, `tokens_module`, `figma_library_file_keys` (list), and a `dev_server` block (`command`, `port`). Infer `package_name` from the target project's root `package.json` `"name"` field when present; infer a `dev_server.command` from a `package.json` `scripts.dev`/`scripts.start` entry when discoverable. Mark every field that cannot be cheaply inferred — at minimum `figma_library_file_keys` and `local_clone_path` — with an explicit `[INFERRED - VALIDATE]` / TODO placeholder string, mirroring the marker convention at `plugins/relay/skills/context-builder/SKILL.md:100`. Add a short human-readable body below the frontmatter explaining the file's purpose and pointing back at `/relay-design-map`.
  3. Still HALT (the file is not yet usable until the human fills the Figma-specific keys) — but with a new, accurate message that: (a) states a starter file was created at `docs/context/design-system.md`; (b) lists exactly which keys need a human value; (c) instructs re-running `/relay-design-map` after filling them; (d) contains NO reference to `context-builder *update`. Remove the old false instruction entirely.
  4. If present, proceed to Phase A — unchanged.
  You may keep the HALT code name `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` or rename it (e.g. `FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE`) — either is acceptable, but the chosen name MUST be used consistently everywhere it appears in this file (see Task 2) and in its documentation mirror (see Task 5). Leave Phase A/B/C/D untouched in this task.
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:236-248` (named-code, multi-line actionable HALT-message shape) and `plugins/relay/skills/context-builder/SKILL.md:316-336` (default-content-skeleton-file pattern) and `plugins/relay/skills/context-builder/SKILL.md:100` (`[INFERRED - VALIDATE]` marker convention).
- **VALIDATE**:
  ```bash
  if grep -n "Run \`context-builder \*update\` first to generate it" plugins/relay/commands/relay-design-map.md; then
    echo "FAIL: stale context-builder instruction still present in P2"
    exit 1
  fi
  if ! grep -q "\[INFERRED - VALIDATE\]" plugins/relay/commands/relay-design-map.md; then
    echo "FAIL: P2 does not describe the [INFERRED - VALIDATE] placeholder convention"
    exit 1
  fi
  if ! grep -q "docs/context/design-system.md" plugins/relay/commands/relay-design-map.md; then
    echo "FAIL: P2 no longer references the correct scaffold target path"
    exit 1
  fi
  echo "PASS: P2 scaffold-then-HALT producer present, stale instruction removed"
  ```

### Task 2: UPDATE plugins/relay/commands/relay-design-map.md — HALT-code enumeration consistency

- **ACTION**: Update the "Final output surface" HALT-code enumeration (currently line 351: `` - `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` — P2: `docs/context/design-system.md` absent. ``) so its code string is byte-identical to whichever code name Task 1 used in the P2 body, and its description reflects the new scaffold-then-HALT behavior (e.g. "P2: `docs/context/design-system.md` absent or incomplete — a starter file was scaffolded; re-run after filling the listed keys").
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:348-355` (existing HALT-code enumeration list shape — preserve the one-bullet-per-code structure).
- **VALIDATE**:
  ```bash
  P2_CODE=$(grep -oE "FAILED_DESIGN_SYSTEM_CONFIG_[A-Z]+" plugins/relay/commands/relay-design-map.md | head -1)
  LIST_CODE=$(grep -oE "FAILED_DESIGN_SYSTEM_CONFIG_[A-Z]+" plugins/relay/commands/relay-design-map.md | tail -1)
  if [ -z "$P2_CODE" ]; then
    echo "FAIL: no FAILED_DESIGN_SYSTEM_CONFIG_* code found in relay-design-map.md"
    exit 1
  fi
  if [ "$P2_CODE" != "$LIST_CODE" ]; then
    echo "FAIL: P2 HALT code ($P2_CODE) does not match the HALT-code enumeration entry ($LIST_CODE)"
    exit 1
  fi
  echo "PASS: HALT code consistent throughout relay-design-map.md ($P2_CODE)"
  ```

### Task 3: UPDATE plugins/relay/commands/relay-design-map.md — Phase-6-shipped correction (both stale claims)

- **ACTION**: Two corrections in this file, both fixing the same underlying staleness (the claim that `plugins/relay/scripts/visual/` is unshipped) at the two DISTINCT sites that carry it:
  1. Phase D preflight step 2 (currently lines 264-272), which claims `plugins/relay/scripts/visual/` "is Phase 6's deliverable, not shipped as of this phase." Rewrite so the dry-run install is described as the expected default (the directory ships as of Phase 6 and is confirmed present: `provision.mjs`, `capture.mjs`, `compare.mjs`, `package.json`), and the graceful-degradation note is reframed as the unexpected case (e.g. a partial checkout) rather than the expected default.
  2. Constraints (hard rules), hard rule 6 (currently lines 380-383), which separately claims the graceful-degradation design exists "around the not-yet-shipped plugins/relay/scripts/visual/ tooling (Phase 6)." This is a differently-worded restatement of the same stale claim and is NOT touched by correction 1. Reword the rule so it still states the invariant (Phase D's four checks are best-effort notes, never a HALT) without asserting the directory is unshipped — e.g. reframe the graceful-degradation clause to cover the rare case of an incomplete/partial checkout missing `plugins/relay/scripts/visual/` (shipped as of Phase 6), mirroring the reframing applied in correction 1.
  Never HALT on this absence in either location, per the existing "Preflight failures never HALT" hard rule — that invariant itself is unchanged; only the stale "unshipped" framing at both sites is corrected.
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:264-272` and `:380-383` (the two current stale-text blocks being corrected — both restate the same underlying "Preflight failures never HALT" invariant, which is preserved unchanged; only the "unshipped" framing in each is corrected).
- **VALIDATE**:
  ```bash
  if grep -nE "not shipped as of this phase|not-yet-shipped" plugins/relay/commands/relay-design-map.md; then
    echo "FAIL: stale Phase-6-not-shipped text still present (Phase D preflight step 2 or Constraints hard rule 6)"
    exit 1
  fi
  if [ -d plugins/relay/scripts/visual ]; then
    echo "PASS: plugins/relay/scripts/visual/ exists on disk, confirming Phase 6 is shipped"
  else
    echo "FAIL: plugins/relay/scripts/visual/ is missing — cannot confirm the corrected text is accurate"
    exit 1
  fi
  ```

### Task 4: UPDATE plugins/relay/skills/context-builder/SKILL.md — path normalization + stub honesty (4 sites)

- **ACTION**: At all four conditional-registration sites for `docs/design-system.md`, apply both fixes together:
  1. Decision-gate `[DYNAMIC]` mandatory-sources row (~1020-1027): change `` `docs/design-system.md` `` to `` `docs/context/design-system.md` ``; change "generated in Phase 3 of the Figma implementation track" to "scaffolded by `/relay-design-map` on its first run (never generated by context-builder)"; change the "observed signal, not generated" note to "observed signal, not scaffolded".
  2. KNOWLEDGE_BASE.md required-entries bullet (~1338-1343): same path fix; change "the file does not exist yet (generated in Phase 3 of the Figma implementation track)" to "the file is command-owned: scaffolded by `/relay-design-map` on its first run (never generated by context-builder), which may not have happened yet"; adjust the trailing note to "observed signal, not yet scaffolded".
  3. CLAUDE.md `Context & Domain` conditional pointer (~1392-1398, two path occurrences): same path fix at both occurrences; same generation-claim correction as site 2.
  4. Content Placement table row (~1565): change `` design-system.md (Phase 3, conditional) `` to `` docs/context/design-system.md (scaffolded by `/relay-design-map`, conditional) ``.
  Keep all four registrations themselves (they correctly register a real, now-producible file) — only the path spelling and the generation-claim wording change.
- **MIRROR**: `plugins/relay/skills/context-builder/SKILL.md:1020-1027`, `:1338-1343`, `:1392-1398`, `:1565` (the four current-state blocks being corrected, verbatim above).
- **VALIDATE**:
  ```bash
  if grep -n "docs/design-system\.md" plugins/relay/skills/context-builder/SKILL.md; then
    echo "FAIL: bare docs/design-system.md spelling still present in SKILL.md"
    exit 1
  fi
  COUNT=$(grep -c "docs/context/design-system\.md" plugins/relay/skills/context-builder/SKILL.md || true)
  if [ "$COUNT" -lt 4 ]; then
    echo "FAIL: expected at least 4 docs/context/design-system.md references, found $COUNT"
    exit 1
  fi
  if grep -n "generated in Phase 3 of the Figma implementation track" plugins/relay/skills/context-builder/SKILL.md; then
    echo "FAIL: stale generation claim still present in SKILL.md"
    exit 1
  fi
  echo "PASS: SKILL.md normalized ($COUNT correct-path references, no bare spelling, no stale generation claim)"
  ```

### Task 5: UPDATE documentation/reference/commands.html — mirror the new P2 behavior and the Phase-6 correction

- **ACTION**: In the `/relay-design-map` `<div class="kv">` entry:
  1. `Preconditions` `<dd>` (~line 258): replace the `FAILED_DESIGN_SYSTEM_CONFIG_MISSING (no docs/context/design-system.md — run context-builder *update first)` mention with the new scaffold-then-HALT behavior and whichever HALT code Task 1/2 used — e.g. "`<code>FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE</code> (no `docs/context/design-system.md`, or required keys still unfilled — the command scaffolds a starter file with `[INFERRED - VALIDATE]` placeholders, then HALTs naming which keys need a human value before re-running)". Leave the `FAILED_MAP_REVIEW_BUDGET_EXCEEDED` mention in the same `<dd>` untouched.
  2. `Preflight` `<dd>` (~line 260): replace "a documented, non-blocking note when the directory is absent — that tooling ships in Phase 6" with wording reflecting that `scripts/visual/` ships as of the now-complete Phase 6 and is expected present, mirroring Task 3's correction in the source command file.
  Leave the `Input` `<dd>` (~line 252) untouched — it already correctly reads `docs/context/design-system.md`.
- **MIRROR**: `documentation/reference/commands.html:249-263` (existing `<dt>`/`<dd>` kv block shape) and the corrected `plugins/relay/commands/relay-design-map.md` text from Tasks 1-3 (the source of truth this mirror must match).
- **VALIDATE**:
  ```bash
  CODE=$(grep -oE "FAILED_DESIGN_SYSTEM_CONFIG_[A-Z]+" plugins/relay/commands/relay-design-map.md | head -1)
  if [ -z "$CODE" ]; then
    echo "FAIL: could not read the HALT code from relay-design-map.md to cross-check"
    exit 1
  fi
  if ! grep -q "$CODE" documentation/reference/commands.html; then
    echo "FAIL: documentation/reference/commands.html does not mirror HALT code $CODE"
    exit 1
  fi
  if grep -n "run context-builder \*update first" documentation/reference/commands.html; then
    echo "FAIL: stale context-builder remediation instruction still present in commands.html"
    exit 1
  fi
  if grep -n "that tooling ships in Phase 6" documentation/reference/commands.html; then
    echo "FAIL: stale Phase-6-not-shipped preflight text still present in commands.html"
    exit 1
  fi
  echo "PASS: commands.html mirrors HALT code $CODE and the Phase-6-shipped correction"
  ```

### Task 6: UPDATE documentation/changelog.html — new Unreleased/Fixed entry

- **ACTION**: Add a new `<h3 id="unreleased-fixed">Fixed</h3>` block (none currently exists under `Unreleased`) immediately after the existing `<h3 id="unreleased-added">Added</h3>` block's closing `</ul>`, and before the `<h2 id="v0-22-0">` heading. The new `<ul><li>` entry describes: `/relay-design-map`'s P2 precondition now scaffolds a starter `docs/context/design-system.md` (with `[INFERRED - VALIDATE]` placeholders) instead of HALTing with a dead-end remediation instruction — a scaffold-then-HALT fix; `plugins/relay/skills/context-builder/SKILL.md`'s four `docs/design-system.md` registration sites are normalized to the correct `docs/context/design-system.md` path with corrected "command-owned, scaffolded by `/relay-design-map`" wording; and the Phase D preflight's stale "Phase 6 not shipped" text is corrected. The entry text MUST include the literal phrase `scaffold-then-HALT` so it is deterministically checkable. Do NOT modify, reorder, or remove any existing `<li>` under the `Unreleased`/`Added` block (the `figma_track`/`design-system.md` registration entry there is byte-asserted by `scripts/validate/checks/figma-track-phase1.test.mjs` and must remain exactly as-is).
- **MIRROR**: `documentation/changelog.html:33-46` (existing `<h3 id="unreleased-added">` + `<ul><li>` heading-id/list shape, and the sibling `<h3 id="v0-22-0-changed">Changed</h3>` heading-id pattern to follow for the new `unreleased-fixed` id).
- **VALIDATE**:
  ```bash
  if ! grep -q "scaffold-then-HALT" documentation/changelog.html; then
    echo "FAIL: no changelog entry mentioning the scaffold-then-HALT fix was found"
    exit 1
  fi
  if ! grep -q '<h3 id="unreleased-fixed">Fixed</h3>' documentation/changelog.html; then
    echo "FAIL: expected a new <h3 id=\"unreleased-fixed\">Fixed</h3> heading under Unreleased"
    exit 1
  fi
  if ! grep -q 'figma_track</code> opt-in key added to <code>methodology.md</code> (default off)' documentation/changelog.html; then
    echo "FAIL: the pre-existing Unreleased/Added figma_track entry was altered — figma-track-phase1.test.mjs assertions would break"
    exit 1
  fi
  echo "PASS: new Fixed entry present; historical Unreleased/Added entry preserved verbatim"
  ```

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
npm run validate
```
Runs the plugin's own static consistency suite (native `claude plugin validate --strict` wrap, path-existence, registration-parity, dispatch-graph, frontmatter-schema, artifact-naming, version-parity, gating-structure). Exits non-zero on any violation — this is the tool's own real exit-code behavior, no wrapping needed.

### Level 2: CONTENT_INVARIANTS

```bash
if grep -n "docs/design-system\.md" plugins/relay/skills/context-builder/SKILL.md; then
  echo "FAIL: bare docs/design-system.md spelling remains in SKILL.md"
  exit 1
fi
if grep -n "Run \`context-builder \*update\` first to generate it" plugins/relay/commands/relay-design-map.md; then
  echo "FAIL: stale context-builder remediation instruction remains in relay-design-map.md"
  exit 1
fi
if grep -nE "not shipped as of this phase|not-yet-shipped" plugins/relay/commands/relay-design-map.md; then
  echo "FAIL: stale Phase-6-not-shipped text remains in relay-design-map.md (Phase D preflight step 2 or Constraints hard rule 6)"
  exit 1
fi
if ! grep -q "scaffold-then-HALT" documentation/changelog.html; then
  echo "FAIL: expected changelog entry describing the fix was not found"
  exit 1
fi
if ! grep -q 'figma_track</code> opt-in key added to <code>methodology.md</code> (default off)' documentation/changelog.html; then
  echo "FAIL: historical Unreleased/Added changelog entry was altered"
  exit 1
fi
echo "PASS: all content invariants hold across relay-design-map.md, SKILL.md, and changelog.html"
```

### Level 3: DRY-RUN END-TO-END (HALT-code cross-file consistency trace)

```bash
DISTINCT_CODES=$(grep -oE "FAILED_DESIGN_SYSTEM_CONFIG_[A-Z]+" plugins/relay/commands/relay-design-map.md | sort -u)
DISTINCT_COUNT=$(echo "$DISTINCT_CODES" | grep -c . || true)
if [ "$DISTINCT_COUNT" -ne 1 ]; then
  echo "FAIL: expected exactly one distinct FAILED_DESIGN_SYSTEM_CONFIG_* code across relay-design-map.md, found $DISTINCT_COUNT: $DISTINCT_CODES"
  exit 1
fi
if ! grep -q "$DISTINCT_CODES" documentation/reference/commands.html; then
  echo "FAIL: documentation/reference/commands.html does not mirror HALT code $DISTINCT_CODES"
  exit 1
fi
if grep -nE "not shipped as of this phase|not-yet-shipped" plugins/relay/commands/relay-design-map.md; then
  echo "FAIL: stale Phase-6-not-shipped text remains in relay-design-map.md end-to-end (Phase D preflight step 2 or Constraints hard rule 6)"
  exit 1
fi
echo "PASS: HALT code $DISTINCT_CODES consistent end-to-end across relay-design-map.md and its documentation mirror; no stale Phase-6-not-shipped text remains"
```

## Acceptance Criteria

(Description mode: no `(PRD AC-N)` token on any item below — R8b (PRD AC-N token check) does not apply in description mode.)

- **AC-A1:** When `docs/context/design-system.md` is absent, `/relay-design-map`'s P2 check WRITES a skeleton file at that exact path with YAML frontmatter carrying `package_name`, `local_clone_path`, `tokens_module`, `figma_library_file_keys`, and a `dev_server` block (command + port); every field the command cannot cheaply infer is marked `[INFERRED - VALIDATE]` / TODO; the command THEN still HALTs, with a new, accurate message naming exactly which keys the human must fill in and instructing a re-run; the false "Run `context-builder *update` first to generate it" instruction is completely removed.
- **AC-A2:** `/relay-design-map`'s Phase A/B/C/D consumer logic (parsing package name, clone path, token module, Figma library file key(s), and the `dev_server` block from `docs/context/design-system.md`) remains functionally unchanged and continues to work once a human fills in the scaffolded file's placeholders.
- **AC-A3:** Every enumeration of the P2 HALT code — the P2 body's own message and the "Final output surface" HALT-code list, both in `relay-design-map.md` — uses an identical code string, regardless of whether the implementer keeps `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` or renames it to `FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE`.
- **AC-A4:** All five bare `docs/design-system.md` references in `SKILL.md` (the decision-gate `[DYNAMIC]` row, the KNOWLEDGE_BASE required-entries bullet, the two CLAUDE.md `Context & Domain` pointer occurrences, and the Content Placement table row) are normalized to `docs/context/design-system.md`, and the "generated in Phase 3 of the Figma implementation track" / "the file does not exist yet" stub claims at those same sites are corrected to state the file is command-owned: scaffolded by `/relay-design-map` on first run, never generated by `context-builder`.
- **AC-A5:** `documentation/reference/commands.html`'s `/relay-design-map` entry mirrors the new scaffold-then-HALT P2 behavior and whichever HALT code was chosen, kept byte-consistent with the corresponding `relay-design-map.md` source text (verified by an automated cross-file check, not just eyeballing).
- **AC-A6:** `relay-design-map.md` no longer claims `plugins/relay/scripts/visual/` is unshipped, in EITHER location that made this claim: Phase D preflight step 2 ("is Phase 6's deliverable, not shipped as of this phase") AND Constraints hard rule 6 ("designed graceful degradation around the not-yet-shipped ... tooling (Phase 6)") — the directory demonstrably exists on disk (`provision.mjs`, `capture.mjs`, `compare.mjs`, `package.json`), and the corrected Phase D preflight text is mirrored in `documentation/reference/commands.html`'s Preflight row.
- **AC-A7:** `documentation/changelog.html` gains a new entry under the `Unreleased` block's `Fixed` section (newly created — none currently exists) describing this fix, while the pre-existing `Unreleased`/`Added` entry recording the `figma_track`/`design-system.md` registration — byte-asserted by `scripts/validate/checks/figma-track-phase1.test.mjs` — is left completely unmodified.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `scripts/validate/checks/figma-track-phase1.test.mjs` asserts the exact OLD bare spelling + stub wording at 4 SKILL.md sites (confirmed lines 179-230) — will fail the moment Task 4 lands, until the test pair updates it | High | Medium (`npm run validate`'s companion `node --test` suite red until addressed; does not block `npm run validate` itself, which is a separate deterministic layer) | This plan's `## Notes` explicitly flags the required `EXISTING_TEST_UPDATED` work so the orchestrator sequences the test-writer/test-reviewer pair after the Implementer + Code Review (test-after, `tdd: false`); the Implementer authors ZERO test-file changes (R-X strict) |
| Renaming `FAILED_DESIGN_SYSTEM_CONFIG_MISSING` (if the implementer chooses to) could silently desync from a mirror site not covered by this plan's explicit task list | Low | Low | Task 2's and Task 5's VALIDATE blocks cross-check the exact HALT-code string across `relay-design-map.md` and its `commands.html` mirror; `docs/api-reference.md` was checked directly and contains no precondition-level text requiring sync |
| The scaffolded `docs/context/design-system.md` skeleton could be produced with plausible-looking (but wrong) inferred values instead of explicit placeholders, silently misleading the human filling it in | Medium | Medium | Task 1's ACTION mandates every field the command cannot cheaply infer (`figma_library_file_keys`, `local_clone_path` at minimum) carry an explicit `[INFERRED - VALIDATE]` / TODO marker, mirroring the convention at `SKILL.md:100`; Task 1's VALIDATE checks the marker's literal presence |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Required downstream test-pair work (EXISTING_TEST_UPDATED, not performed by this plan's tasks):** `scripts/validate/checks/figma-track-phase1.test.mjs` contains four assertions (verified at lines 179-191, 193-206, 208-221, 223-230) that check the EXACT OLD strings this plan corrects — the bare `docs/design-system.md` path and the "generated in Phase 3 of the Figma implementation track" / "the file does not exist yet" stub wording. Once Task 4 lands, these four assertions will fail. Per this repo's `tdd: false` + `test_frameworks: ["node:test"]` test-after methodology and R-X strict (`docs/decisions.md` [2026-05-06], [2026-07-10]), the Implementer must NOT edit this test file. The orchestrator must sequence the `test-writer`/`test-reviewer` pair to record an `EXISTING_TEST_UPDATED` lifecycle-ledger entry updating these four assertions to expect the normalized `docs/context/design-system.md` path and the corrected "command-owned, scaffolded by `/relay-design-map`" wording, after this plan's Implementer + Code Review complete. The other two checks the source investigation flagged were independently confirmed here by direct read: `scripts/validate/checks/path-existence.mjs` and `scripts/validate/checks/registration-parity.mjs` carry zero `docs/design-system.md` coupling (out of each check's scan-class scope); `scripts/validate/checks/figma-track-phase3.test.mjs` asserts only the unrelated phrase "design-system clone" (the source-code clone concept), never the `.md` config file — none of these three require any change.

**`phase_type: scaffold` rationale:** Every `Files to Change` row is a prompt/prose file (two `plugins/relay/` markdown command/skill files, two `documentation/` HTML files) — the plugin's own domain treats these as source, not application code (`No runtime package manifest — the plugin is prompt + config, not code`, per `CLAUDE.md`). Every Level 1-3 and per-task VALIDATE command is grep/`npm run validate`/filesystem-probe based, with no test-framework invocation as the first token — matching the `docs/decisions.md` [2026-05-14] `phase_type` precedent's `scaffold` signal exactly (filesystem/content-oriented VALIDATE, no application-code test surface). This is deliberately NOT `foundation`: the Files to Change table is dominated by `UPDATE` rows correcting existing prose, not `CREATE` rows introducing a new domain seam.

**Description-mode note:** This plan has no source PRD. R8a/R8b/R8c (PRD-existence, `(PRD AC-N)` token, and PRD-row-back-fill checks) do not apply — `plan-reviewer` emits each as `passed: true` with an explicit "description-only mode" rationale per the shipped `/relay-plan` PRD-less mode contract (`docs/decisions.md` [2026-06-16]). Per Phase 5.1 of the plan-writer contract, no PRD back-fill `Edit` is attempted — this is a documented no-op, consistent with `PRPs/prds/figma-implementation-track.prd.md` remaining fully untouched (all 7 of its phases are already `complete`; this is a standalone gap-closing fix against it, mirroring the precedent set by `docs/decisions.md` [2026-07-23] `R-COH-DS-REUSE`).

*Generated: 2026-07-23*
*Approved: 2026-07-23*
*Implemented: 2026-07-23*
*Status: IMPLEMENTED*
