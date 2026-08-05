# Feature: Checkpoint / resume (Phase 5 of figma-quota-resilience)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions (evidence-bundle read/skip semantics); cross-cutting patterns (resume idiom mirrored from relay-worktree.md / relay-execute.md); impact on reusable services (the /relay-design-map command's Phase B)
- Decisions found:
  - [2026-07-22] MCP-access spike — Figma MCP calls stay in the interactive command's own session. This phase only adds skip-logic around existing calls in Phase B; it issues no new MCP call type and widens no dispatched agent's tool allowlist.
  - [2026-07-23] Checkpoint location — outside `evidence_dir`, at `PRPs/reports/design-map/.state/checkpoint.json`. This phase reads (never relocates) that checkpoint and the evidence bundle it already governs.
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`.
  - [2026-04-25] Plan filenames carry the source PRD phase number and slug — followed for this plan's own path.
- Applicable anti-patterns:
  - "Querying the Figma MCP from a dispatched writer/reviewer agent" — this phase touches only the command's own Phase B prose; neither `design-map-writer` nor `design-map-reviewer` gains any new instruction or tool.
  - "Writing pipeline artifacts under `.claude/`" — no new artifact path is introduced; the existing evidence bundle and checkpoint locations are unchanged.
  - "Weakening or deleting tests to make the auto-correction loop turn green" — every task in this plan is scoped to avoid touching any pinned test substring; no task edits a `*.test.mjs` file.
- Applicable architectural rules:
  - `docs/context/architecture.md` — the checkpoint's cumulative `call_log` and the evidence bundle's disk-derived truncation flags are "the sole Figma-fact source either agent is permitted to read"; this phase's resume logic reads the SAME persisted state, adding no new source of truth.
  - `docs/context/architecture.md` — `/relay-design-map` dispatches an MCP-free writer/reviewer pair; this phase does not change that shape.
  - `plugins/relay/commands/relay-worktree.md`'s idempotent_reuse precedent — the command-level "check disk state before doing work" pattern this phase's resume logic follows.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-quota-resilience.prd.md` — Implementation Phases row 5:
  "Checkpoint / resume" — Goal: A re-run costs the delta. — Success
  signal: An interrupted run's resume issues zero redundant calls; a
  fully-cached re-run issues zero calls in total.

## Summary

This phase makes `/relay-design-map`'s Phase B resume-aware. Today,
steps 2 (library search), 5 (node-scoped metadata), and 6 (Code
Connect) always issue fresh Figma calls on every invocation, regardless
of what Phase 4's checkpoint and evidence bundle already recorded on
disk — including step 6's `get_code_connect_map`, which is NOT among
the three documented quota-exempt tools, so a fully-cached re-run
cannot claim zero Figma calls without also skipping it. This phase adds
a disk-first skip check to all three steps: step 2 skips
`search_design_system` entirely when `--refresh` is absent and the
prior bundle's `inventory_truncated` already reads `false`; step 4
computes its cost estimate from the delta set — step 3 candidates
lacking an existing `metadata/<component-key>.json` file — and skips
its own confirmation gate entirely when that delta is empty, cloning
the existing decline-branch idiom; step 5 enriches only that delta
set, skipping any candidate an existing metadata file already covers,
regardless of `--refresh`; step 6 skips `get_code_connect_map` entirely
when `--refresh` is absent and a prior `code-connect.json` already
exists, reusing it verbatim. Step 7 records three new evidence-bundle
header fields (`search_skipped`, `candidates_skipped_already_enriched`,
`code_connect_skipped`) so every skip decision is visible in the
artifact, and the `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT message's re-run
guidance and the command's user-facing `--refresh`/frontmatter
documentation are updated to describe the cheaper retry story honestly
— including the honest carve-out that a run interrupted mid-search (not
after it) still re-searches from scratch, since `search_design_system`
exposes no resumable cursor. Every edit lands inside
`plugins/relay/commands/relay-design-map.md` only — neither
`design-map-writer.md` nor `design-map-reviewer.md` needs any change,
since neither calls Figma or needs awareness of the skip mechanics. No
task touches a `*.test.mjs` file.

## User Story

As the relay operator re-invoking `/relay-design-map` after a
quota-interrupted run, or periodically with `--refresh`
I want the command to skip Figma calls for work it already recorded
on disk
So that a retry costs only the delta and a fully-cached re-run costs
nothing at all

## Problem Statement

Today, `/relay-design-map` Phase B always issues fresh
`search_design_system` and `get_metadata` calls on every invocation,
regardless of what a prior run already recorded on disk (Phase 4's
checkpoint and evidence bundle). An interrupted run — one that HALTs
on `FAILED_FIGMA_QUOTA_EXHAUSTED` partway through enrichment, the
scenario PRD AC-14 names — has no way to resume cheaply: re-invoking
the command re-declares cost against the FULL candidate-set size and
re-enriches candidates already covered by an existing
`metadata/<component-key>.json` file, and a `--refresh` re-scan
re-enriches every candidate rather than only the ones that changed.
This directly blocks the second half of the PRD's Key Hypothesis ("a
quota-interrupted run's retry issues zero redundant Figma calls") and
leaves Success Metric 2 ("Redundant Figma calls on a resumed run = 0")
unmeasurable.

## Solution Statement

Make Phase B steps 2, 4, 5, and 6 resume-aware by reading what Phase
4's evidence bundle already records before issuing any Figma call.
Step 2 skips `search_design_system` entirely when `--refresh` is absent
and the prior bundle's `inventory_truncated` already reads `false` (a
complete prior enumeration) — reusing the existing component list
verbatim and recording `search_skipped: true`. Step 4 partitions the
step 3 candidate set into already-enriched (an existing metadata file
on disk) and delta (the remainder), computes its cost estimate from
the delta set's size rather than the full candidate-set size, and — when
the delta is empty — skips the confirmation gate entirely, recording
`metadata_calls_made: 0` and continuing to steps 6-7 exactly like the
existing decline branch already does. Step 5 enriches only the delta
set, skipping (zero calls, reusing the on-disk file) any candidate the
partition excluded, unconditionally — this applies whether or not
`--refresh` was passed, since `--refresh` only forces step 2's search
to re-run, never forces re-enrichment of an already-known candidate.
Step 6 skips `get_code_connect_map` entirely when `--refresh` is absent
and a prior `code-connect.json` already exists (any recorded outcome,
success or `unavailable(...)`), reusing it verbatim — closing the one
remaining Figma-call source `search_design_system`/`get_metadata`'s
skip logic does not cover, since `get_code_connect_map` is not among
the three documented quota-exempt tools. Step 7 gains three new
evidence-bundle header fields making every skip decision auditable. The
`FAILED_FIGMA_QUOTA_EXHAUSTED` message's final sentence is scoped
honestly — the delta-only-cost promise holds for a run interrupted
after library search completed; a run interrupted mid-search still
re-searches from the start, since `search_design_system` exposes no
resumable cursor. The frontmatter `description` and the `--refresh`
Parse-arguments section are updated so the documented retry story
matches the new behavior.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (prose/prompt extension to a single existing command file — no new files created) |
| Complexity | Medium — 7 sequenced tasks in one file, dense verbatim-preservation constraints against a 3-phase existing test corpus (`figma-quota-resilience-phase2/3/4.test.mjs`) |
| Systems Affected | `/relay-design-map` command (Phase B steps 2, 4, 5, 6, 7; the `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT message; the frontmatter `description`; the `--refresh` Parse-arguments section) |
| Dependencies | Phase 4 (evidence contract + checkpoint — this phase's resume logic reads the `inventory_truncated`/`enrichment_truncated` flags and `metadata/<component-key>.json` files Phase 4 already produces) |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/figma-quota-resilience.prd.md:227-230` (Phase 5 Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-design-map.md` | 1-4 | Frontmatter `description` — Task 1's insertion point |
| P0 | `plugins/relay/commands/relay-design-map.md` | 87-101 | `--refresh` Parse-arguments section — Task 1's second insertion point |
| P0 | `plugins/relay/commands/relay-design-map.md` | 238-256 | `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT message — Task 7 replaces only its final sentence; the other four sentences are pinned by the phase 3 test corpus and MUST survive |
| P0 | `plugins/relay/commands/relay-design-map.md` | 269-274 | Phase B step 2 ("Library search") — the exact block Task 2 extends |
| P0 | `plugins/relay/commands/relay-design-map.md` | 297-325 | Phase B step 4 ("Cost declaration + confirmation") — the exact block Task 3 extends; contains the decline-branch idiom Task 3 clones and the pinned confirmation-gate sentences Task 3 must not disturb |
| P0 | `plugins/relay/commands/relay-design-map.md` | 326-334 | Phase B step 5 ("Node-scoped metadata") — the exact block Task 4 extends; contains the two sentences pinned verbatim by `figma-quota-resilience-phase2.test.mjs` |
| P0 | `plugins/relay/commands/relay-design-map.md` | 335-340 | Phase B step 6 ("Code Connect") — the exact block Task 5 extends; contains the "never fatal to this command" sentence pinned verbatim by `figma-quota-resilience-phase3.test.mjs`'s regression guard |
| P0 | `plugins/relay/commands/relay-design-map.md` | 341-364 | Phase B step 7 ("Persist evidence") field-list sentence — the exact block Task 6 extends, positioned before Phase 4's own appended checkpoint/merge paragraphs (366-429), so Task 6's edit cannot collide with those |
| P1 | `docs/context/architecture.md` | 179 | The checkpoint's canonical description — the persisted state this phase's resume logic reads (`call_log`, per-candidate `metadata/<component-key>.json` presence) |
| P1 | `plugins/relay/commands/relay-worktree.md` | 138-202 | The `idempotent_reuse` precedent `relay-design-map.md:39` already names as this command's own mirrored structure — Case A/D disk-state check + Phase A.0 skip |
| P1 | `plugins/relay/commands/relay-execute.md` | 210-224 | The "scan disk state before deciding what work remains" idiom (resumable visual-approval check) — the closest existing per-step resume precedent in the plugin |
| P2 | `scripts/validate/checks/figma-quota-resilience-phase2.test.mjs` | 152-170, 172-189 | Pins Phase B's exact 7-top-level-step count and step 5's two core sentences — every task in this plan must survive these unmodified |
| P2 | `scripts/validate/checks/figma-quota-resilience-phase3.test.mjs` | 192-232, 250-284, 294-351, 386-424 | Pins step 4's decline-branch sentences, the `seat`/`preflight_confirmed` field-definition tests (250-284), four of the five sentences in the `FAILED_FIGMA_QUOTA_EXHAUSTED` blockquote, and the two step-6 regression guards (386-424) — every task in this plan must survive these unmodified |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-worktree.md:142-169
**Case A — Entry found, branch matches `feature/<feature>`:**
Set `idempotent_reuse = true`. Proceed to Phase A.0. The bootstrap script is NOT re-executed.
...
### Phase A.0 — Idempotency gate

If `idempotent_reuse = true` (set by P3 Case A):

Emit the verbatim AC-3 success message and skip to Final output. The bootstrap script is NOT re-executed:

> Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using.

Do NOT proceed to Phase A.1 or Phase B.
```
Copied by: Task 2 (step 2's skip-when-cached-and-non-refresh check — inspect disk state first, then either short-circuit with zero work or fall through to the normal path, exactly this shape).

```
# SOURCE: plugins/relay/commands/relay-execute.md:218-224
Before picking the lowest-numbered actionable row below, scan for any row whose `Status` cell equals `in-progress` and whose `PRPs/reports/<feature>/phase-<row's #>/halt.json` has `outcome == "AWAITING_VISUAL_APPROVAL"`: ... set `resume_mode` to the `resolution` value, and skip the normal actionable-row pick below entirely
```
Copied by: Task 3 and Task 4 (deciding what remains to be done by scanning persisted evidence on disk before falling through to the default path, rather than always doing the full amount of work).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:313-320
**On decline or non-affirmative reply:** do NOT proceed to step 5; record `metadata_calls_made: 0`, `enrichment_truncated: true`, reason `"cost-declaration preflight declined by operator"`, then continue to steps 6-7 as normal — this is not a HALT; the evidence gathered so far, and any prior map, remain valid, and re-running later is safe.
```
Copied by: Task 3 (the new "delta set is empty" branch clones this exact continue-to-steps-6-7-as-normal idiom for symmetry, rather than inventing a second, differently-worded non-HALT skip path).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:269-274
2. **Library search.** Call `search_design_system` against the Figma
   library file key(s) from `design_system_config`, enumerating the
   library's components. Budget: `max_library_search_calls = 40` —
   stop issuing further search calls once this budget is reached and
   record the scan as truncated (this feeds the map's
   `inventory_truncated` marker via the evidence bundle).
```
Copied by: Task 2 (the exact existing sentence this task's new skip-check paragraph is prepended before, left otherwise untouched).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:326-334
5. **Node-scoped metadata (candidates only).** For each component (or
   component set) in the step 3 candidate set — never the full step 2
   enumeration — call node-scoped `get_metadata` to retrieve its
   variant/property structure. Budget: `max_metadata_calls = 150` —
   stop issuing further `get_metadata` calls once this budget is
   reached. Exhaustion is never fatal: record
   `enrichment_truncated: true` with a reason ... and continue to the
   next step.
```
Copied by: Task 4 — every phrase above is pinned verbatim by `figma-quota-resilience-phase2.test.mjs`; Task 4's new clauses are inserted around, never inside, these phrases.

```
# SOURCE: plugins/relay/commands/relay-design-map.md:335-340
6. **Code Connect (opportunistic).** Call `get_code_connect_map` for
   the library. This call is opportunistic — any error (missing Code
   Connect configuration, permission error, timeout) is recorded as
   `code_connect: unavailable(<error class>)` in the evidence bundle's
   header and the run CONTINUES. A Code Connect failure is never fatal
   to this command.
```
Copied by: Task 5 (the exact existing sentences this task's new skip-check paragraph precedes, left unchanged — the pinned "never fatal to this command" sentence in particular).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:341-364
7. **Persist evidence.** ... `seat` — the value read in step 1, or
   `"unavailable"` when `whoami` did not expose it; `tier` — same
   convention; `metadata_call_estimate` — the step 4 estimate;
   `metadata_call_ceiling` — ...; and `preflight_confirmed` — `true`
   when the user gave an explicit affirmative reply, `false` when
   declined, `null` when the confirmation gate was never triggered ...),
   a `metadata/<component-key>.json` per enriched candidate (step 5),
   and a `code-connect.json` ...
```
Copied by: Task 6 (the three new fields are inserted immediately after `preflight_confirmed`'s definition and before the closing paren, positioned after every phase2/phase3-pinned field definition in document order).

```
# SOURCE: docs/context/architecture.md:179
`PRPs/reports/design-map/.state/checkpoint.json` | `/relay-design-map` run checkpoint — a cumulative Figma MCP `call_log` ... plus a monotonically incrementing scan-generation counter, appended on every run ... Its cumulative `call_log` is projected into `library-search.json`'s own header on every evidence write.
```
Copied by: Tasks 2-5 (the canonical description of the persisted state this phase's resume logic reads, grounding why checking `evidence_dir`'s own files — not re-deriving from the checkpoint's `call_log` directly — is the correct, already-established way to know what enrichment succeeded).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:1-4
description: 'Give every Figma-enabled project a versioned, human-curatable map from Figma library components to real code components. Queries the target project''s Figma library in the main session (search_design_system, budget max_library_search_calls=40; ... node-scoped get_metadata for pre-matched candidates, budget max_metadata_calls=150, non-fatal on exhaustion; get_code_connect_map read opportunistically), persists evidence bundles to PRPs/reports/design-map/evidence/, ...'
```
Copied by: Task 1 (the exact frontmatter `description` string this task's new clause is inserted into, between the "non-fatal on exhaustion" and "get_code_connect_map" tokens — the existing dual-declaration convention `max_library_search_calls`/`max_metadata_calls` already follow in this same line).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:87-101
`$ARGUMENTS` accepts one optional flag:

- **`--refresh`** — additive re-scan mode. When absent, this is the
  project's one-time setup path (first-ever map, or a fresh full
  build if no map exists yet). When present, the command re-queries
  the Figma library and additively re-scans: existing `CM-<n>` rows
  are never renumbered, human-verified `Confidence`/`verified_at`
  values are never clobbered without contradicting evidence, and only
  newly-discovered Figma components receive new `CM-<n>` ids.
```
Copied by: Task 1 (the exact `--refresh` bullet this task's new closing sentence is appended to, before the existing "No other arguments are accepted." paragraph).

```
# SOURCE: plugins/relay/commands/relay-design-map.md:238-256
> FAILED_FIGMA_QUOTA_EXHAUSTED: A Figma MCP data call failed with a
> quota-exhaustion error ...
> ...
> Re-run `/relay-design-map` (with `--refresh` if a partial map
> already exists) once your quota has recovered.
```
Copied by: Task 7 (the exact blockquote whose final sentence — quoted in full above — is the ONLY sentence this task replaces; the four sentences preceding it are pinned verbatim by the test corpus and untouched).

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/commands/relay-design-map.md` | UPDATE | Add resume/skip logic to Phase B steps 2, 4, 5, 6, 7 (Tasks 2-6); update the `FAILED_FIGMA_QUOTA_EXHAUSTED` re-run sentence and the frontmatter/`--refresh` documentation to match (Tasks 1, 7) |

## NOT Building (Scope Limits)

- **An embedded REST fallback.** Per the source PRD's "What We're NOT Building" — unchanged, unaffected by this phase.
- **The REST script's lazy-credential property.** Explicitly named out of scope by this phase's own Phase Details: "the MCP path has none to defer."
- **Evidence-bundle condensation / an agent-facing library index.** Deferred to its own PRD per the source PRD.
- **A shared, session-wide Figma call budget across commands.** Deferred per the source PRD.
- **Automatic quota-exhaustion refusal.** Rejected per the source PRD — the preflight still only declares and asks.
- **Retry/backoff against the Figma MCP.** Rejected per the source PRD — this phase adds skip-already-done, not sleep-and-retry.
- **Resuming an interrupted/truncated library search (step 2) at sub-call granularity.** `search_design_system` exposes no documented resumable pagination cursor. When a prior run's own inventory is itself incomplete (`inventory_truncated: true`), a resumed run re-issues the search from the start rather than resuming mid-enumeration — a known, documented limitation. PRD AC-14's own `Given` clause is scoped to "a run interrupted after **partial enrichment**" (search already complete), not a mid-search interruption; this phase's resume guarantee targets exactly that scenario, matching the AC's own scope.
- **Skipping the Phase C writer/reviewer dispatch on a fully-cached re-run.** Out of scope — PRD AC-14 and Success Metric 2 measure Figma calls, not agent-dispatch cost; Phase C re-validating an already-`APPROVED` map against unchanged evidence issues zero Figma calls either way, so the dispatch itself is not a resume-cost problem this phase needs to solve.
- **`design-map-writer.md` / `design-map-reviewer.md` changes.** Neither agent calls Figma or needs awareness of the resume/skip mechanics; both continue reading whatever evidence bundle exists on disk, exactly as today.
- **Any new or edited `*.test.mjs` file.** This plan's own GROUNDING corpus scan found zero existing test assertions covering any of the seven areas this phase touches (including step 6's Code Connect skip logic) — every new field/branch is `NEW_TEST_REQUIRED`, routed to the test pair's lifecycle ledger (see `## Notes`), never an Implementer task in this plan (R-X strict).

## Step-by-Step Tasks

### Task 1: Update the frontmatter `description` and the `--refresh` Parse-arguments section to describe resume

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, edit the frontmatter `description` (line 2): immediately after the existing clause "...non-fatal on exhaustion" and before "; get_code_connect_map read opportunistically)", insert a short clause stating that a re-invocation skips already-recorded work so retries and `--refresh` cost only the delta — the exact literal phrase "cost only the delta" MUST appear. Then, in the `## Parse arguments` section (lines 87-101), append a new sentence at the end of the existing `--refresh` bullet (after "...receive new `CM-<n>` ids." and before the blank line that precedes "No other arguments are accepted."), stating that independent of this flag, Phase B steps 2 and 5 automatically skip Figma calls for work already recorded on disk from a prior run — the exact literal phrase "automatically skip Figma calls" MUST appear — so a plain re-invocation resumes an interrupted run at no extra Figma cost, and `--refresh` itself now costs only the delta rather than a full re-scan. Do not alter the existing `max_library_search_calls=40` / `max_metadata_calls=150` frontmatter tokens or any other existing sentence in either location.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:1-4` and `:87-101` (the exact text extended).
- **VALIDATE**: `tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'cost[[:space:]]+only[[:space:]]+the[[:space:]]+delta' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'automatically[[:space:]]+skip[[:space:]]+Figma[[:space:]]+calls'`
- **AC**: AC-A3 (PRD AC-14) — documents the delta-cost guarantee this phase's remaining tasks implement.

### Task 2: Phase B step 2 (Library search) — skip entirely when non-`--refresh` and inventory already complete

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, immediately after the bold lead-in "2. **Library search.**" and BEFORE the existing sentence "Call `search_design_system` against the Figma library file key(s)...", insert a new paragraph: before issuing any call, check whether `--refresh` is ABSENT and a prior evidence bundle exists at `evidence_dir/library-search.json` whose own `inventory_truncated` field reads `false` (a complete prior enumeration). When both hold, SKIP this step's `search_design_system` calls entirely — reuse the existing component/component-set list verbatim as this run's step 2 result (zero search calls issued, `inventory_truncated` carried forward unchanged) — and record `search_skipped: true` for step 7. Otherwise (either `--refresh` was passed, or no complete prior inventory exists), record `search_skipped: false` and proceed as follows. Leave the existing "Call `search_design_system`..." sentence and its budget sentence completely unchanged, immediately following this new paragraph.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-worktree.md:142-169` (the idempotent_reuse disk-state check + short-circuit shape) and `# SOURCE: plugins/relay/commands/relay-design-map.md:269-274` (the exact existing sentence this task's new paragraph precedes, unaltered).
- **VALIDATE**: `tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'search_skipped:[[:space:]]+true' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'Call[[:space:]]+`search_design_system`[[:space:]]+against[[:space:]]+the[[:space:]]+Figma'`
- **AC**: AC-A2 (PRD AC-14) — a fully-cached re-run's search-skip contribution; also AC-A3 (PRD AC-14) — `--refresh`'s delta-cost guarantee for the search phase.

### Task 3: Phase B step 4 (Cost declaration) — compute the estimate from the delta set; skip confirmation when the delta is empty

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, immediately after the bold lead-in "4. **Cost declaration + confirmation.**" and BEFORE the existing sentence "Using the step 1 `whoami` result and the step 3 candidate set size, estimate the number of `get_metadata` calls...", insert a new paragraph: first, partition the step 3 candidate set using `evidence_dir`'s existing `metadata/<component-key>.json` files — a candidate with an existing file is already enriched from a prior run (excluded); the remainder is the delta set step 5 will actually call `get_metadata` for. This partition applies regardless of `--refresh`. When the delta set is empty, do NOT proceed with the declaration/confirmation below: record `metadata_calls_made: 0`, reason `"fully cached — no candidates pending enrichment"`, then continue to steps 6-7 as normal — this is not a HALT (mirroring the existing decline branch below). Otherwise, continue below using the delta set's size — never the full step 3 candidate-set size — as the estimate. Then, in the existing sentence immediately following (the "Using the step 1 `whoami` result..." sentence), replace the two occurrences of "the step 3 candidate set" / "the step 3 candidate count" with "the delta set (defined above)" / "the delta set's count" respectively — this is the ONLY existing sentence in step 4 this task may reword; every other existing sentence in step 4 (the seat/tier ceiling comparison, the confirmation-gate prompt, and the entire decline branch) is pinned verbatim by the test corpus and MUST NOT be touched.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-execute.md:218-224` (scan disk state before deciding what remains) and `# SOURCE: plugins/relay/commands/relay-design-map.md:313-320` (the exact decline-branch idiom this task's new empty-delta branch clones for symmetry).
- **VALIDATE**: `tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'delta[[:space:]]+set' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'ask[[:space:]]+the[[:space:]]+user[[:space:]]+for[[:space:]]+an[[:space:]]+explicit,[[:space:]]+quoted[[:space:]]+affirmative[[:space:]]+reply'`
- **AC**: AC-A1 (PRD AC-14) — a resumed run's delta-only cost declaration; AC-A2 (PRD AC-14) — the fully-cached re-run's skip-confirmation branch.

### Task 4: Phase B step 5 (Node-scoped metadata) — enrich only the delta set defined in step 4

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, within step 5 ("5. **Node-scoped metadata (candidates only).**"), extend — never remove — the existing sentence "For each component (or component set) in the step 3 candidate set — never the full step 2 enumeration — call node-scoped `get_metadata` to retrieve its variant/property structure." by appending, immediately after "get_metadata" and before "to retrieve", a clause scoping the iteration to step 4's delta set only: a candidate excluded from the delta set (an existing `metadata/<component-key>.json` file already covers it) issues zero calls here, reusing the on-disk file as this run's evidence for it. Immediately after the existing "Budget: `max_metadata_calls = 150` — stop issuing further `get_metadata` calls once this budget is reached." sentence and BEFORE the existing "Exhaustion is never fatal..." sentence, insert one new sentence: track `candidates_skipped_already_enriched`, the count of step 3 candidates excluded from the delta set by the check above, for step 7. Do not alter the wording of the "Budget:..." sentence or the "Exhaustion is never fatal..." sentence themselves — both are pinned verbatim by the test corpus.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:326-334` (the exact existing sentences this task's new clauses are inserted around).
- **VALIDATE**: `tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'candidates_skipped_already_enriched' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'Budget:[[:space:]]+`max_metadata_calls[[:space:]]+=[[:space:]]+150`'`
- **AC**: AC-A1 (PRD AC-14) — the concrete zero-call skip for already-enriched candidates on a resumed run; AC-A2 (PRD AC-14) — every candidate skipped when the delta is the empty set (fully-cached case).

### Task 5: Phase B step 6 (Code Connect) — skip entirely when non-`--refresh` and a prior result already exists

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, immediately after the bold lead-in "6. **Code Connect (opportunistic).**" and BEFORE the existing sentence "Call `get_code_connect_map` for the library.", insert a new paragraph: before issuing this call, check whether `--refresh` is ABSENT and a prior evidence bundle already contains `evidence_dir/code-connect.json` — any prior recorded outcome, including a `code_connect: unavailable(<error class>)` marker, counts as already-recorded, since an opportunistic call whose outcome is already known needs no repeat. When both hold, SKIP this call entirely: reuse the existing `code-connect.json` verbatim as this run's step 6 result (zero calls issued), and record `code_connect_skipped: true` for step 7. Otherwise (either `--refresh` was passed — deliberately re-attempting in case a Code Connect configuration was added or fixed since the last recorded outcome — or no prior `code-connect.json` exists), record `code_connect_skipped: false` and proceed as follows. Leave the existing "Call `get_code_connect_map` for the library. This call is opportunistic — any error (missing Code Connect configuration, permission error, timeout) is recorded as `code_connect: unavailable(<error class>)` in the evidence bundle's header and the run CONTINUES. A Code Connect failure is never fatal to this command." sentences completely unchanged, immediately following this new paragraph — this task adds a skip, not a new failure mode; the existing non-fatal, opportunistic handling (protected explicitly by Phase 3's own regression guard) is untouched. `get_code_connect_map` is NOT among the three documented quota-exempt tools (`whoami`, `add_code_connect_map`, `generate_figma_design` — note `add_code_connect_map` is a distinct, writer-only tool), so without this task a "fully-cached" re-run would still spend at least one real Figma call every time, contradicting PRD AC-14's "zero Figma calls in total" claim.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:335-340` (the exact existing sentences this task's new paragraph precedes) and `# SOURCE: plugins/relay/commands/relay-worktree.md:142-169` (the same idempotent_reuse disk-state-check-then-skip shape Task 2 also mirrors).
- **VALIDATE**: `tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'code_connect_skipped:[[:space:]]+true' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'A[[:space:]]+Code[[:space:]]+Connect[[:space:]]+failure[[:space:]]+is[[:space:]]+never[[:space:]]+fatal[[:space:]]+to[[:space:]]+this[[:space:]]+command'`
- **AC**: AC-A2 (PRD AC-14) — closes the fully-cached re-run's last remaining Figma-call source; also AC-A3 (PRD AC-14) — `--refresh` still forces a fresh Code Connect attempt.

### Task 6: Phase B step 7 (Persist evidence) — record `search_skipped`, `candidates_skipped_already_enriched`, and `code_connect_skipped`

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, within step 7's existing field-list sentence, immediately after `preflight_confirmed`'s definition ("...`null` when the confirmation gate was never triggered because the estimate did not exceed the ceiling or seat/tier was unavailable)") and BEFORE the closing text ", a `metadata/<component-key>.json` per enriched candidate (step 5), and a `code-connect.json`...", insert three new field definitions: `search_skipped` — `true` when step 2 reused a prior run's complete library enumeration verbatim (zero `search_design_system` calls issued this run), `false` otherwise; `candidates_skipped_already_enriched` — the count of step 3 candidates step 5 excluded from its delta set because an existing `metadata/<component-key>.json` file from a prior run was reused instead of a fresh `get_metadata` call; and `code_connect_skipped` — `true` when step 6 reused a prior run's `code-connect.json` verbatim (zero `get_code_connect_map` calls issued this run), `false` otherwise. Do not alter any existing field definition in this list (`candidates_prematched`, `metadata_calls_made`, `enrichment_truncated`, `seat`, `tier`, `metadata_call_estimate`, `metadata_call_ceiling`, `preflight_confirmed`) or anything in the checkpoint/merge/disk-derivation paragraphs Phase 4 appended after this sentence (lines 366-429) — this task's insertion point is entirely within the original pre-Phase-4 sentence, positioned before all of Phase 4's own appended content.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:341-364` (the exact field-list sentence extended).
- **VALIDATE**: `tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'search_skipped' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'code_connect_skipped' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE '`candidates_prematched`,[[:space:]]+the[[:space:]]+size[[:space:]]+of[[:space:]]+the[[:space:]]+step[[:space:]]+3[[:space:]]+candidate[[:space:]]+set'`
- **AC**: AC-A1, AC-A2, AC-A3 (PRD AC-14) — makes Tasks 2, 4, and 5's skip decisions auditable in the evidence bundle, the artifact-level evidence the AC's "issues zero Figma calls" claim is measured against.

### Task 7: Update the `FAILED_FIGMA_QUOTA_EXHAUSTED` message's re-run guidance sentence

- **ACTION**: In `plugins/relay/commands/relay-design-map.md`, within the `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT message blockquote, replace ONLY the final sentence — "> Re-run `/relay-design-map` (with `--refresh` if a partial map already exists) once your quota has recovered." — with two sentences that scope the delta-cost promise honestly rather than unconditionally: (1) when the interruption happened after library search completed, re-running once quota has recovered costs only the delta — Phase B steps 2, 5, and 6 automatically skip work already recorded on disk — the exact literal phrase "costs only the delta" MUST appear; (2) when the interruption happened during search itself, search re-runs from the start on retry, because `search_design_system` exposes no resumable cursor; `--refresh` is only needed when deliberately re-scanning for new or removed Figma components. Do not touch any of the four other sentences in this same blockquote ("This message promises no reset time.", the durable-fix sentence, the thousandfold sentence, and the no-seat-viable sentence) — all four are pinned verbatim by the test corpus.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-design-map.md:238-256` (the exact blockquote; only its final sentence changes).
- **VALIDATE**: `tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'costs[[:space:]]+only[[:space:]]+the[[:space:]]+delta' && tr '\n' ' ' < plugins/relay/commands/relay-design-map.md | grep -qE 'This[[:space:]]+message[[:space:]]+promises[[:space:]]+no[[:space:]]+reset[[:space:]]+time'`
- **AC**: AC-A1, AC-A2 (PRD AC-14) — the HALT path's own guidance now honestly reflects the delta-cost retry story Tasks 2-6 implement, scoped to exclude the one case (mid-search interruption) this phase's own `## NOT Building` names as out of scope.

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```bash
set -euo pipefail
head -1 plugins/relay/commands/relay-design-map.md | grep -q '^---$' || { echo "FAIL: relay-design-map.md missing opening --- frontmatter delimiter"; exit 1; }
grep -q '^# /relay-design-map$' plugins/relay/commands/relay-design-map.md || { echo "FAIL: relay-design-map.md missing its title heading"; exit 1; }
echo "PASS: relay-design-map.md retains its frontmatter delimiter and title heading"
```

Before this phase's edits: PASS (the unmodified file already has both). After: still PASS — no task in this plan removes the frontmatter delimiter or the title heading.

**Level 2 CONTENT_INVARIANTS**

```bash
set -euo pipefail
C=$(tr '\n' ' ' < plugins/relay/commands/relay-design-map.md)
# CQ ("collapsed, quote-stripped") additionally strips each line's leading
# blockquote "> " marker BEFORE collapsing newlines. $C alone is correct for
# every plain-prose check below, but is unsafe for a check whose pinned phrase
# spans two lines INSIDE the `> `-prefixed FAILED_FIGMA_QUOTA_EXHAUSTED
# blockquote (relay-design-map.md:243-267): tr '\n' ' ' turns the newline into
# a space but leaves the next line's "> " marker embedded mid-sentence, which
# [[:space:]]+ can never bridge (`>` is not a whitespace character). Used
# below only for the one check that actually needs it (the durable-fix
# sentence) — every other check, including three other sentences that also
# live inside this same blockquote, was traced against the real on-disk bytes
# and found to sit entirely on one line, so $C already collapses it safely
# without stripping "> " at all; those are intentionally left on $C.
CQ=$(sed 's/^> //' plugins/relay/commands/relay-design-map.md | tr '\n' ' ')

# --- New-content checks (Tasks 1-7): FAIL on the current unmodified tree, PASS after all 7 tasks land.
echo "$C" | grep -qE 'cost[[:space:]]+only[[:space:]]+the[[:space:]]+delta' || { echo "FAIL: frontmatter/--refresh resume-cost framing missing (Task 1)"; exit 1; }
echo "$C" | grep -qE 'automatically[[:space:]]+skip[[:space:]]+Figma[[:space:]]+calls' || { echo "FAIL: Parse-arguments resume framing missing (Task 1)"; exit 1; }
echo "$C" | grep -qE 'search_skipped' || { echo "FAIL: search_skipped field missing (Tasks 2/6)"; exit 1; }
echo "$C" | grep -qE 'delta[[:space:]]+set' || { echo "FAIL: delta-set concept missing from step 4 (Task 3)"; exit 1; }
echo "$C" | grep -qE 'fully[[:space:]]+cached' || { echo "FAIL: fully-cached skip-confirmation reason string missing (Task 3)"; exit 1; }
echo "$C" | grep -qE 'candidates_skipped_already_enriched' || { echo "FAIL: candidates_skipped_already_enriched field missing (Tasks 4/6)"; exit 1; }
echo "$C" | grep -qE 'code_connect_skipped' || { echo "FAIL: code_connect_skipped field missing (Tasks 5/6)"; exit 1; }
echo "$C" | grep -qE 'costs[[:space:]]+only[[:space:]]+the[[:space:]]+delta' || { echo "FAIL: FAILED_FIGMA_QUOTA_EXHAUSTED re-run sentence not updated (Task 7)"; exit 1; }

# --- Pinned-substring survival checks: MUST remain present both before and after (collapsed
# across line-wraps per this corpus's ~72-column wrap convention, mirroring the technique
# figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md's own Level 2 block uses).
echo "$C" | grep -qE '`candidates_prematched`,[[:space:]]+the[[:space:]]+size[[:space:]]+of[[:space:]]+the[[:space:]]+step[[:space:]]+3[[:space:]]+candidate[[:space:]]+set' || { echo "FAIL: pinned candidates_prematched definition regressed (phase2 corpus)"; exit 1; }
echo "$C" | grep -qE '`metadata_calls_made`,[[:space:]]+the[[:space:]]+count[[:space:]]+of[[:space:]]+step[[:space:]]+5' || { echo "FAIL: pinned metadata_calls_made definition regressed (phase2 corpus)"; exit 1; }
echo "$C" | grep -qE 'in[[:space:]]+the[[:space:]]+step[[:space:]]+3[[:space:]]+candidate[[:space:]]+set' || { echo "FAIL: pinned step-5 candidate-set scoping phrase regressed (phase2 corpus)"; exit 1; }
echo "$C" | grep -qE 'Budget:[[:space:]]+`max_metadata_calls[[:space:]]+=[[:space:]]+150`' || { echo "FAIL: pinned max_metadata_calls budget sentence regressed (phase2 corpus)"; exit 1; }
echo "$C" | grep -qE 'Exhaustion[[:space:]]+is[[:space:]]+never[[:space:]]+fatal:[[:space:]]+record[[:space:]]+`enrichment_truncated:[[:space:]]+true`[[:space:]]+with[[:space:]]+a[[:space:]]+reason' || { echo "FAIL: pinned exhaustion-non-fatal sentence regressed (phase2 corpus)"; exit 1; }
echo "$C" | grep -qE 'ask[[:space:]]+the[[:space:]]+user[[:space:]]+for[[:space:]]+an[[:space:]]+explicit,[[:space:]]+quoted[[:space:]]+affirmative[[:space:]]+reply[[:space:]]+before[[:space:]]+issuing[[:space:]]+any[[:space:]]+`get_metadata`[[:space:]]+call' || { echo "FAIL: pinned confirmation-gate sentence regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE 'a[[:space:]]+non-answer,[[:space:]]+an[[:space:]]+ambiguous[[:space:]]+reply,[[:space:]]+or[[:space:]]+any[[:space:]]+non-affirmative[[:space:]]+reply[[:space:]]+MUST[[:space:]]+be[[:space:]]+treated[[:space:]]+as[[:space:]]+do-not-proceed' || { echo "FAIL: pinned do-not-proceed sentence regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE '"cost-declaration[[:space:]]+preflight[[:space:]]+declined[[:space:]]+by[[:space:]]+operator"' || { echo "FAIL: pinned decline-reason string regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE 'continue[[:space:]]+to[[:space:]]+steps[[:space:]]+6-7[[:space:]]+as[[:space:]]+normal' || { echo "FAIL: pinned decline-branch continuation phrase regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE 'This[[:space:]]+message[[:space:]]+promises[[:space:]]+no[[:space:]]+reset[[:space:]]+time' || { echo "FAIL: pinned no-reset-time sentence regressed (phase3 corpus)"; exit 1; }
# This check reads $CQ, not $C: the pinned sentence spans relay-design-map.md
# lines 250-252 inside the blockquote — "> The scoped scan this command
# already performs (enumerate -> pre-match" / "> -> enrich only candidates,
# bounded by `max_metadata_calls`) is the" / "> durable fix for this failure
# class." Note line 251 itself starts with a literal "-> " arrow that is part
# of the pinned prose ("enumerate -> pre-match -> enrich"), distinct from the
# blockquote's own "> " marker — sed 's/^> //' strips only the marker (the
# first two characters, greater-than plus one space, anchored to line start)
# and leaves that arrow untouched. Traced against the real bytes: after
# stripping and collapsing, this region reads "...(enumerate -> pre-match ->
# enrich only candidates, bounded by `max_metadata_calls`) is the durable fix
# for this failure class. Upgrading from a View/Collab seat..." — "is the
# durable fix for this failure class" is now contiguous, with no "> " between
# "the" and "durable" the way the old $C-based check had. An earlier revision
# of this plan checked $C here, which can never pass: $C's collapse leaves
# "...is the > durable fix for this failure class." embedded, and
# [[:space:]]+ cannot bridge a literal ">" character.
echo "$CQ" | grep -qE 'is[[:space:]]+the[[:space:]]+durable[[:space:]]+fix[[:space:]]+for[[:space:]]+this[[:space:]]+failure[[:space:]]+class' || { echo "FAIL: pinned durable-fix sentence regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE 'roughly[[:space:]]+a[[:space:]]+thousandfold' || { echo "FAIL: pinned thousandfold sentence regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE 'no[[:space:]]+Figma[[:space:]]+seat[[:space:]]+makes[[:space:]]+whole-library[[:space:]]+enrichment[[:space:]]+viable' || { echo "FAIL: pinned no-seat-viable sentence regressed (phase3 corpus)"; exit 1; }
# The next two checks bridge a field name's closing backtick to its prose across the
# " — " (space, em-dash, space) gap the real file uses at these two sites (relay-design-map.md
# ~350 and ~355). An earlier revision of this plan used a bare "." directly abutting the
# backtick with no space token on either side — that can never match, because the real gap
# is three characters (space, em-dash, space), not one, and a lone "." only ever consumes a
# single character. Fixed here per plan-reviewer's finding by matching the literal em-dash,
# bounded by optional whitespace on each side. Verified character-by-character against the
# real on-disk text before shipping: "`seat` — the value read in step 1" and
# "`preflight_confirmed` — `true` when the user gave" both match the two patterns below.
echo "$C" | grep -qE '`seat`[[:space:]]*—[[:space:]]*the[[:space:]]+value[[:space:]]+read[[:space:]]+in[[:space:]]+step[[:space:]]+1' || { echo "FAIL: pinned seat field definition regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE '`preflight_confirmed`[[:space:]]*—[[:space:]]*`true`[[:space:]]+when[[:space:]]+the[[:space:]]+user[[:space:]]+gave[[:space:]]+an[[:space:]]+explicit[[:space:]]+affirmative[[:space:]]+reply' || { echo "FAIL: pinned preflight_confirmed field definition regressed (phase3 corpus)"; exit 1; }
echo "$C" | grep -qE 'A[[:space:]]+Code[[:space:]]+Connect[[:space:]]+failure[[:space:]]+is[[:space:]]+never[[:space:]]+fatal[[:space:]]+to[[:space:]]+this[[:space:]]+command' || { echo "FAIL: pinned Code Connect non-fatal sentence regressed (phase3 corpus)"; exit 1; }

echo "PASS: all Phase 5 new-content invariants present and every corpus-pinned substring survives unmodified"
```

Before this phase's edits: the new-content block FAILS at its very first condition (`cost only the delta` is absent from the current unmodified file) — expected, since none of Tasks 1-7 have landed yet. The pinned-substring block PASSES on the current unmodified tree (this is simply today's state of the untouched corpus) — including the two em-dash-bridging checks, verified character-by-character above, and the `$CQ`-based durable-fix check, which passes on the unmodified tree too (the pinned sentence's wrap-across-`> `-lines shape already exists pre-edit; `$CQ` handles it correctly both before and after). After all 7 tasks land: both blocks PASS — the new-content checks because every task's mandated literal phrase is now present, the pinned-substring checks because every task's `ACTION` explicitly inserts new prose around, never inside, each cited pinned phrase. This block was corrected once, post-implementation: the durable-fix check originally read `$C` (plain newline-collapsed) and could never pass, because the pinned sentence wraps across the blockquote's `> `-prefixed lines and `$C` leaves that marker embedded mid-sentence — confirmed against the real implemented file and fixed by introducing `$CQ` (see the inline comments above).

**Level 3 DRY-RUN END-TO-END**

```bash
set -euo pipefail
node -e '
const fs = require("fs");
const content = fs.readFileSync("plugins/relay/commands/relay-design-map.md", "utf8");
const start = content.indexOf("## Phase B — Query the Figma library");
const end = content.indexOf("## Phase C");
if (start === -1 || end === -1) { console.error("FAIL: Phase B/C boundary not found"); process.exit(1); }
const phaseB = content.slice(start, end);
const matches = [...phaseB.matchAll(/^\d+\.\s+\*\*(.+?)\*\*/gm)];
if (matches.length !== 7) {
  console.error("FAIL: expected exactly 7 top-level numbered steps in Phase B, found " + matches.length);
  process.exit(1);
}
if (!/library search/i.test(matches[1][1])) { console.error("FAIL: step 2 label drifted: " + matches[1][1]); process.exit(1); }
if (!/cost declaration/i.test(matches[3][1])) { console.error("FAIL: step 4 label drifted: " + matches[3][1]); process.exit(1); }
if (!/node-scoped metadata/i.test(matches[4][1])) { console.error("FAIL: step 5 label drifted: " + matches[4][1]); process.exit(1); }
if (!/code connect/i.test(matches[5][1])) { console.error("FAIL: step 6 label drifted: " + matches[5][1]); process.exit(1); }
if (!/persist evidence/i.test(matches[6][1])) { console.error("FAIL: step 7 label drifted: " + matches[6][1]); process.exit(1); }
console.log("PASS: Phase B retains exactly 7 top-level numbered steps with steps 2/4/5/6/7 labels intact");
'
```

Before this phase's edits: PASS (the unmodified file already has exactly 7 top-level numbered steps with these labels — confirmed against the file read during GROUNDING). After: still PASS — every task in this plan inserts continuation prose WITHIN an existing numbered item (never a new top-level `N. **Bold**` line) and never renames any step's bold lead-in label. This is the same regression guard `figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md`'s own Level 3 uses, re-run here because Tasks 2-6 touch the same Phase B block.

## Acceptance Criteria

- **AC-A1 (PRD AC-14):** Given a run interrupted after partial enrichment (search already complete, some candidates already enriched), when the command is re-invoked, then it issues zero `get_metadata` calls for candidates already covered by an existing `metadata/<component-key>.json` file — only the delta set is called (Tasks 3, 4, 6).
- **AC-A2 (PRD AC-14):** Given a fully-cached prior run (`inventory_truncated: false`, `enrichment_truncated: false`, no `--refresh`), when the command is re-invoked, then it issues zero `search_design_system` calls (Task 2), zero `get_metadata` calls (Tasks 3-4), and zero `get_code_connect_map` calls (Task 5 — not quota-exempt, so without this task a fully-cached re-run would still spend a real Figma call) — zero Figma data calls in total, made auditable via `search_skipped`/`candidates_skipped_already_enriched`/`code_connect_skipped` in the evidence bundle (Task 6) and reflected honestly in the HALT-path re-run guidance (Task 7).
- **AC-A3 (PRD AC-14):** Given `--refresh` is passed, when the command re-scans, then step 2's search still re-runs (to catch additions/removals, its existing documented purpose), step 5's enrichment still skips every candidate already covered by an existing metadata file, and step 6 still re-attempts Code Connect (to catch a configuration added or fixed since the last outcome) — `--refresh` costs only the delta, not a full re-enrichment (Tasks 1-5).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| New content inserted in steps 4/5/7 lands adjacent to test-pinned substrings, corrupting them | M | H | Every task's `ACTION` names the exact insertion point relative to the pinned text it must not touch; Level 2's pinned-substring-survival block re-checks every cited phrase after all tasks land |
| The new "delta set is empty" branch in step 4 and the pre-existing decline branch diverge in phrasing, later read as two different mechanisms rather than one symmetric idiom | M | L | Task 3 explicitly clones the existing decline branch's "continue to steps 6-7 as normal — this is not a HALT" idiom for the new branch, verified by Level 2's `continue to steps 6-7 as normal` check |
| A `--refresh` re-scan silently stops detecting removed components because step 5's skip logic is misread as also skipping step 2's retirement-driving search | L | M | Task 2's skip check is explicitly conditioned on `--refresh` being ABSENT; Task 1 updates the `--refresh` documentation in the same phase so the flag's remaining purpose (catching additions/removals) is stated explicitly alongside the new skip behavior |
| A validation command's grep pattern never matches the actual prose the Implementer writes, silently degrading the gate to a false PASS or a permanent FAIL | M | M | Every `VALIDATE` anchor is a literal phrase the corresponding task's `ACTION` mandates verbatim ("cost only the delta", "search_skipped", "delta set", "fully cached", "candidates_skipped_already_enriched", "code_connect_skipped", "costs only the delta"), and every multi-word check uses the `tr '\n' ' '` collapse technique so a manual line-wrap in the ~72-column-wrapped source cannot hide a match; two Level 2 checks that previously bridged a field name to its prose with a bare single-character `.` (which can never match the real 3-character space-em-dash-space gap) were caught in review and rewritten to match the literal em-dash, verified character-by-character against the real on-disk text |
| A `code_connect_skipped` check that treats ANY prior outcome (including a recorded `unavailable(...)` failure) as already-recorded could mask a Code Connect configuration that was fixed between runs, indefinitely | L | L | `--refresh` always forces a fresh Code Connect attempt regardless of the prior outcome; Task 1's frontmatter/`--refresh` documentation states this explicitly as part of the flag's remaining purpose |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
when a test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored. This repo declares `test_frameworks: ["node:test"]`, so the
pair is active in test-after mode.

**R-X strict / test routing — no task in this plan touches a `*.test.mjs`
file.** Per `docs/anti-patterns.md`'s "Weakening or deleting tests" entry
and the R-X strict rule, every test-file change this phase's edits
warrant is routed through the test pair's lifecycle ledger, never
authored by an Implementer task. Corpus-impact scan performed during
GROUNDING (this session, via a dedicated subagent grep across all 44
`scripts/validate/checks/*.test.mjs` files, independently re-confirmed
correct by `plan-reviewer` in its Attempt 1 review): **zero existing
assertions** anywhere in the corpus pin Phase B step 2's body content,
step 4's declaration-estimate sentence, step 6's `get_code_connect_map`
lead sentence (only the surrounding "never fatal to this command"
sentence and the intro paragraph's load-bearing-calls parenthetical are
pinned — both confirmed unchanged by Task 5), the `--refresh`
Parse-arguments section, the frontmatter `description`'s wording beyond
the two `max_*` budget tokens, or the `FAILED_FIGMA_QUOTA_EXHAUSTED`
message's re-run sentence. Every new field/branch this phase introduces
(`search_skipped`, `candidates_skipped_already_enriched`,
`code_connect_skipped`, the delta-set partition, the fully-cached
skip-confirmation branch, the step-6 skip branch) is therefore
**NEW_TEST_REQUIRED**, not `EXISTING_TEST_UPDATED` — no existing test
needs repair, but new coverage for these fields/branches is a genuine
gap for the test pair to close, not delivered by this plan.

**Why Level 1-3 above never invoke `node --test` directly.** A test
framework (`node:test`) IS declared in `docs/context/methodology.md`,
but every edit in this plan is a prose change to a single markdown
command file, and — as documented immediately above — this plan's tasks
deliberately author zero `*.test.mjs` changes (R-X strict). This
documented deferral, combined with the fact that no task touches a test
file, is the condition-based `R-COH-VALIDATE-FRAMEWORK-MISMATCH`
exemption (`plugins/relay/agents/plan-reviewer.md:387-405`) — the same
exemption `figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md`'s
own `## Notes` invokes for the identical reason.

**Grounding.** `research-codebase` and `research-web` were dispatched in
parallel during Phase 2 GROUNDING. `research-codebase` located every
`file:line` cited in `## Patterns to Mirror` above, plus confirmed (as an
honest gap) that no existing skip-if-cached logic exists anywhere in
`relay-design-map.md` today — this phase adds it, rather than extending
a prior instance. `research-web` returned six cross-domain resumable-scan
patterns (Scrapy's fingerprint dupe filter, Azure AI Search's enrichment
cache, marker-file idioms, AWS Lambda durable-execution checkpoint
replay, Prefect's checkpoint+idempotency-key framing, and a
state-machine-per-operation pattern for long-running agent tools) —
consistent with, but not load-bearing for, the design above, which is
grounded entirely in this repo's own existing `idempotent_reuse` /
resumable-check precedents (`relay-worktree.md`, `relay-execute.md`)
rather than the external analogues. Both subagents' findings are
enumerated in full in this plan's authoring transcript; none conflicted
with the design above.

**Why `design-map-writer.md` / `design-map-reviewer.md` are untouched.**
Both agents already read whatever `evidence_dir` contains, unconditionally
(per Phase 4's own missing/partial-evidence handling). This phase changes
only WHICH Figma calls the command issues before writing that evidence
bundle — the bundle's shape (component list, `metadata/*.json` files,
truncation flags) is unchanged, so neither dispatched agent has anything
new to read or a reason to change.

**Revision (Attempt 2, addressing `plan-reviewer`'s CHANGES_REQUESTED on
Attempt 1).** Three findings addressed: (1) two Level 2 checks bridging a
field name's closing backtick to its prose used a bare `.` immediately
against the backtick, where the real on-disk gap is three characters
(space, em-dash, space) — fixed by matching the literal em-dash bounded
by optional whitespace, verified character-by-character against the real
text before shipping (see the inline comment in the Level 2 block).
(2) Task 7's (formerly Task 6's) HALT-message sentence is now scoped
honestly: the delta-cost promise applies only when the interruption
happened after library search completed; a mid-search interruption still
re-searches from the start, consistent with this plan's own `## NOT
Building` scope limit. (3) A new Task 5 gives Phase B step 6
(`get_code_connect_map`, not quota-exempt) the same
skip-when-cached-and-non-refresh treatment Tasks 2 and 4 give steps 2 and
5, closing the gap that would otherwise have left a "fully-cached"
re-run spending one real Figma call every time. Every task/AC/count
reference across the plan (Summary, Solution Statement, Metadata,
Mandatory Reading, Patterns to Mirror, Files to Change, `## NOT
Building`, Acceptance Criteria, Risks, Validation Commands Levels 2-3,
this Notes section) was swept and updated to reflect the new 7-task,
3-field shape. A non-blocking citation gap
(`figma-quota-resilience-phase3.test.mjs:250-284`'s `seat`/
`preflight_confirmed` pinning test, missing from `## Mandatory Reading`'s
citation range) was also corrected.

**Revision (manual-recovery round, post-implementation).** All 7 tasks
landed correctly against the real file (Levels 1 and 3 PASS, `npm run
validate` 12/12, corpus stayed green at 494/494, zero test files touched)
— the defect was in this plan's own Level 2 script, not the
implementation. The durable-fix check (`is the durable fix for this
failure class`) read `$C` (plain `tr '\n' ' '` collapse), which can never
pass: the pinned sentence spans `relay-design-map.md:250-252` inside the
`> `-prefixed `FAILED_FIGMA_QUOTA_EXHAUSTED` blockquote, and `$C`'s
collapse leaves the next line's `> ` marker embedded mid-sentence — a
literal `>` character `[[:space:]]+` can never bridge. Fixed by
introducing a second variable, `$CQ` (`sed 's/^> //' ... | tr '\n' ' '`,
stripping each line's leading blockquote marker before collapsing), used
only for this one check. The other four sentences Task 7's `## NOT
Building`-adjacent HALT message pins (`This message promises no reset
time.`, the thousandfold sentence, the no-seat-viable sentence, and
Task 7's own new `costs only the delta` sentence) were traced against the
real implemented bytes and confirmed to sit entirely on one blockquote
line each — no `> ` interrupts any of them — so they correctly stay on
`$C` and were left unchanged. No task body, `## NOT Building`, `##
Risks`, `## Acceptance Criteria`, the Decision Gate, or Levels 1/3 were
touched.

---

*Generated: 2026-08-04*
*Approved: 2026-08-04*
*Implemented: 2026-08-04*
*Status: IMPLEMENTED*
