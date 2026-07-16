# Feature: Approve as safety net (Phase 3 of implement-phase-docs-sync)

```
**Decision Gate**
- Active context: none
- Activated criteria: reuse of existing components (docs-updater / docs-reviewer pair, `/relay-approve`); impact on reusable services (`/relay-approve`, and the `docs_sync` precedent `/relay-implement` already established); per-project config-flag consistency across commands (the `docs_sync` master switch must behave identically wherever it is read)
- Decisions found:
  - [2026-06-19] `/relay-approve` design + interactivity-boundary extension — the post-merge interactivity extension applies ONLY to the approve-time invocation; the command itself remains deterministic (no LLM judgment), all docs interpretation stays delegated to the docs-updater/docs-reviewer pair. Unaffected by this phase's gating change.
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute`/`-implement` never commit — implement-time docs edits land uncommitted and are committed later by `/relay-commit`. This phase does not alter that invariant; it only extends the existing Phase 4 DOCS COMMIT skip guard with an additional condition.
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` — `docs_sync` is an additive frontmatter key read by agents/commands, the same pattern as `tdd`/`test_frameworks`. This phase adds the command-side read to `relay-approve.md`, mirroring the read `/relay-implement` already performs.
  - [2026-04-19] PRP artifacts live under `PRPs/`, never `.claude/` — unaffected; no new artifact paths are introduced this phase.
  - [2026-04-25] Plan filenames carry the source PRD phase number and slug — governs this plan's own filename.
- Applicable anti-patterns:
  - "Activating the test pair by heuristic" (analogous principle, `docs/anti-patterns.md:43-48`) — `docs_sync` must be read as an explicit declared value with a documented default, never inferred. This phase's new Phase 0 read step must mirror `relay-implement.md`'s default-true-when-absent handling exactly, not invent a new heuristic.
  - "Writing pipeline artifacts under `.claude/`" (`docs/anti-patterns.md:61-67`) — not triggered by this phase's edits (both touched files already live under `plugins/relay/` and `docs/`), restated as a standing constraint since the task touches command-file prose.
  - "Injecting plugin defaults into the target project's `decisions.md`" (`docs/anti-patterns.md:52-58`) — this phase does NOT write to `docs/decisions.md`; that promotion of the PRD's two conscious refinements is explicitly PRD row 4's job ("Docs + site"), confirmed still pending (no such entry exists in `docs/decisions.md` as of this writing). Task 6 below is scoped strictly to `docs/context/methodology.md`'s `## Docs Sync` section.
- Applicable architectural rules:
  - Interactivity boundary — `/relay-approve` remains deterministic; only the docs-updater/docs-reviewer pair may reopen dialogue, unchanged by this phase.
  - Three-pillar architecture — Pillar 3 (Approval) retains its safety-net role; this phase documents (does not redesign) the two-pass idempotent relationship with Pillar 2.
  - PRP artifact paths table — unaffected by this phase.
- Result: PROCEED — no unresolvable conflict. The `docs/decisions.md` promotion of the PRD's two conscious refinements remains correctly deferred to Phase 4.
```

## Source PRD

- `PRPs/prds/implement-phase-docs-sync.prd.md` — Implementation Phases row 3:
  "Approve as safety net" — Goal: Keep approve as a low-delta reconciliation
  pass that coexists with implement-time sync. — Success signal: Approve
  after an implement-synced run finds only additive post-implementation
  deltas.

## Summary

This phase (Phase 3 of `implement-phase-docs-sync`) confirms and adjusts
`/relay-approve`'s existing docs cycle so it honors the per-project
`docs_sync` master switch the same way `/relay-implement` already does
(Phase 2, shipped), and so its prose documents the two-pass idempotent
model now that primary docs-sync has relocated to implement time.
Concretely: read `docs_sync` from `docs/context/methodology.md` in Phase 0
(mirroring `relay-implement.md`'s Phase A.0 read + default-true-when-absent
semantics), extend the Phase 3 DOCS CYCLE and Phase 4 DOCS COMMIT skip
guards to check `docs_sync_enabled` alongside the existing `--no-docs`
flag (same precedence and outcome-naming convention `relay-implement.md`'s
Phase A.3.5 established), document the pass's idempotency and its optional
consultation of the implement-time manifest, and correct the one stale
sentence in `docs/context/methodology.md` that still claims approve-time
gating is unbuilt. No `docs-updater`/`docs-reviewer` agent contract changes
are needed — the manifest already records `docs_sync` in its
effective-configuration header from Phase 1.

## User Story

As the developer operating relay day-to-day,
I want `/relay-approve`'s docs cycle to honor the same `docs_sync` master
switch `/relay-implement` already honors, and to behave predictably as a
low-delta safety net when docs were already synced at implement time,
So that I have one consistent per-project switch to disable automated docs
sync entirely, and I am not surprised by a near-empty manifest when approve
runs after a successful implement-time sync.

## Problem Statement

`/relay-approve`'s existing docs cycle (Phase 3 DOCS CYCLE + Phase 4 DOCS
COMMIT) has no awareness of the `docs_sync` per-project switch introduced
in Phase 1 — it self-skips only on the per-invocation `--no-docs` flag, not
on `docs_sync: false`. It also runs today with no documented acknowledgment
that, now that Phase 2 has shipped, docs may already be synced by
`/relay-implement`'s own docs pair dispatch — so operators have no
documented expectation that approve's own pass should be low-delta.
`docs/context/methodology.md`'s `## Docs Sync` section still states
approve-time gating is "Phase 3, not built yet", which becomes stale the
moment this phase ships.

## Solution Statement

Extend `/relay-approve` to read `docs_sync` from
`docs/context/methodology.md` (mirroring the read + default-true semantics
`/relay-implement` already implements at Phase A.0), and gate both Phase 3
DOCS CYCLE and Phase 4 DOCS COMMIT on `no_docs_flag == true OR
docs_sync_enabled == false` (mirroring `/relay-implement`'s Phase A.3.5
dual-condition gate and its `SKIPPED (--no-docs)` / `SKIPPED (docs_sync:
false)` outcome-naming convention), so the master switch behaves
consistently across both commands. Document, in Phase 3's prose, that the
pass is idempotent against implement-time sync (docs-updater's own
comparison logic evaluates against the current `docs/` state, so
already-applied edits produce no delta) and that the docs-updater
invocation may optionally consult the implement-time manifest at
`PRPs/reports/<feature>/docs-update.md` to avoid re-proposing
already-applied edits. Finally, correct `docs/context/methodology.md`'s
`## Docs Sync` section so it no longer claims approve-time gating is
unbuilt.

## Metadata

| Key | Value |
|-----|-------|
| Type | Command enhancement (prompt/config markdown) |
| Complexity | Low-Medium |
| Systems Affected | `/relay-approve` command; `docs/context/methodology.md` declaration |
| Dependencies | Phase 1 (agent capability + config surface, complete); Phase 2 (`/relay-implement` dispatch, complete) — provides the `docs_sync`/`--no-docs` precedent this phase mirrors |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/implement-phase-docs-sync.prd.md:165, 180-183` |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-approve.md` | 26-42, 275-390, 393-424 | The command file being modified: flags parsing (P0), Phase 3 DOCS CYCLE, Phase 4 DOCS COMMIT, Phase 5 summary |
| P0 | `plugins/relay/commands/relay-implement.md` | 214, 364-419, 515-537 | Phase 2 precedent (already shipped) for the `docs_sync` read, the dual-gate logic, the outcome-naming convention, and the summary-line terminology this phase must mirror exactly |
| P1 | `plugins/relay/agents/docs-updater.md` | 27-35, 207-214, 259-313 | Confirms `diff_source`/`non_interactive`/`docs_sync` inputs already exist and the manifest already records the effective configuration — grounds the idempotency + manifest-consultation documentation as a command-prose-only change (no agent contract change needed) |
| P1 | `docs/context/methodology.md` | 45-79 | The `## Docs Sync` section to be corrected (stale "not built yet" phrasing) |
| P1 | `PRPs/prds/implement-phase-docs-sync.prd.md` | 69-70, 165, 180-183 | AC-5, AC-6, the Phase 3 Implementation Phases row, and Phase Details (Goal / Scope / Success signal) |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-approve.md:277
If `no_docs_flag = true`, skip this phase entirely and proceed to Phase 4.
```
Copied (as the shape to extend) by Task 2.

```
# SOURCE: plugins/relay/commands/relay-implement.md:214
Read `<target_root>/docs/context/methodology.md` frontmatter and extract
the `docs_sync` key, recording `docs_sync_enabled` (boolean). Default
`true` when the key is absent, mirroring the `tdd` absence-handling
precedent and `docs-updater.md`'s own default-true-when-absent handling of
the same key (`docs/context/methodology.md:45-65`). Precedence rule,
evaluated by Phase A.3.5's gate: `no_docs_flag` (set in `## Parse
arguments`) always wins over `docs_sync_enabled` — either one alone is
sufficient to skip the docs-sync sub-phase.
```
Copied (adapted to relay-approve.md's Phase 0 shape) by Task 1.

```
# SOURCE: plugins/relay/commands/relay-implement.md:368
**Gate.** If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip
the entire docs-sync sub-phase (log a one-line skip note naming which of
the two gated it) and proceed directly to Phase A.4. Record
`docs_sync_outcome = "SKIPPED (--no-docs)"` when `no_docs_flag == true`
(checked first — `--no-docs` takes precedence over `docs_sync_enabled`
when both are true), otherwise `docs_sync_outcome = "SKIPPED (docs_sync:
false)"`.
```
Copied (the dual-condition gate + outcome-naming convention) by Task 2 and
Task 3, applied respectively to relay-approve.md's Phase 3 and Phase 4
skip guards.

```
# SOURCE: plugins/relay/agents/docs-updater.md:219-232
For every file in the merged diff, ask:
1. Does this change add a new architectural decision that isn't in
   `docs/decisions.md`? -> If the merged diff or the source PRD states
   the decision explicitly and concretely, make a surgical additive edit
   to `docs/decisions.md`. If it is inferred or ambiguous, record it as a
   candidate in the manifest (do not write it in).
...
```
Referenced (as the grounding evidence, not copied verbatim) by Task 4 —
the reason a second pass is naturally additive-only: docs-updater's
comparisons run against the *current* `docs/` state, not diff presence, so
an already-applied edit produces no delta on a second run.

```
# SOURCE: plugins/relay/commands/relay-implement.md:525
> Docs: `<docs_sync_outcome>` (`APPROVED` / `BUDGET_EXCEEDED` /
> `SKIPPED (--no-docs)` / `SKIPPED (docs_sync: false)`).
```
Copied (terminology alignment for the summary line) by Task 5.

```
# SOURCE: docs/context/methodology.md:51-55
Today it is a declared value only, read but not yet acted on:
`docs-updater` records it in the manifest's effective-configuration
header, but no command wires the actual skip logic yet — that is Phase 2
(`/relay-implement` dispatch) and Phase 3 (`/relay-approve` safety net) of
`PRPs/prds/implement-phase-docs-sync.prd.md`, both not built yet.
```
Replaced (this is the exact stale sentence being edited) by Task 6.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/commands/relay-approve.md` | UPDATE | Wire `docs_sync` gating into Phase 0 (read), Phase 3 DOCS CYCLE and Phase 4 DOCS COMMIT (skip guards), Phase 3 prose (idempotency + manifest-consultation documentation), and Phase 5 summary (outcome terminology) |
| `docs/context/methodology.md` | UPDATE | Remove the stale "Phase 3 ... not built yet" sentence in `## Docs Sync` now that this phase wires the approve-time gating; align the section's tense with Phase 2 (already shipped) and Phase 3 (this phase) both being built |

## NOT Building (Scope Limits)

- No changes to `docs-updater.md` / `docs-reviewer.md` agent contracts —
  Phase 1 already shipped the `diff_source`/`non_interactive` inputs and
  the manifest's `docs_sync` effective-configuration header; no agent
  input or output shape changes this phase.
- No new `docs/decisions.md` entry this phase — promoting the PRD's two
  conscious refinements (interactivity-extension scope; Pillar 2/3
  relocation) is explicitly PRD Implementation Phases row 4's job ("Docs +
  site"), not row 3's.
- No `documentation/` HTML site changes — also row 4's job.
- No new per-invocation flag on `/relay-approve` — `docs_sync` is consumed
  from `docs/context/methodology.md`; the existing `--no-docs` flag is
  reused unchanged, not duplicated or renamed.
- No automated mechanism that has `docs-updater` programmatically parse
  and diff against the implement-time manifest to suppress proposals —
  the PRD phrases this as "optionally document"; this phase adds narrative
  documentation only, not new agent logic or a new agent input.
- No change to the merge/cleanup phases (Phase 1/Phase 2 of
  `relay-approve.md`) or to the collision-safe cleanup ordering — entirely
  out of this phase's scope.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/commands/relay-approve.md — Phase 0: read `docs_sync`

- **ACTION**: In Phase 0 PRECONDITIONS, after Step P6 ("Read
  `orchestrator-run.json`") and before the `---` phase separator, add a new
  step (P7) that reads `<target_root>/docs/context/methodology.md`
  frontmatter, extracts the `docs_sync` key, and records
  `docs_sync_enabled` (boolean), defaulting to `true` when the key is
  absent — mirroring `relay-implement.md`'s Phase A.0 read exactly
  (including the "mirrors the `tdd` absence-handling precedent" framing).
  If `docs/context/methodology.md` itself is absent, also default
  `docs_sync_enabled = true` and note the absence (do not HALT — mirrors
  the existing soft-fail treatment of a missing `orchestrator-run.json` in
  P6).
- **MIRROR**: Patterns to Mirror snippet 2 (`relay-implement.md:214`).
- **AC**: AC-A1 (PRD AC-6), AC-A2 (PRD AC-6)
- **VALIDATE**:
  ```bash
  grep -qE "\bdocs_sync_enabled\b" plugins/relay/commands/relay-approve.md
  ```

### Task 2: UPDATE plugins/relay/commands/relay-approve.md — Phase 3 DOCS CYCLE: dual-condition gate

- **ACTION**: Replace the existing guard "If `no_docs_flag = true`, skip
  this phase entirely and proceed to Phase 4." at the top of Phase 3 with
  a dual-condition gate: "If `no_docs_flag == true` OR `docs_sync_enabled
  == false`, skip this phase entirely and proceed to Phase 4 (log a
  one-line skip note naming which of the two gated it)." Record
  `docs_sync_outcome = "SKIPPED (--no-docs)"` when `no_docs_flag == true`
  (checked first — `--no-docs` takes precedence when both are true),
  otherwise `docs_sync_outcome = "SKIPPED (docs_sync: false)"` when only
  `docs_sync_enabled == false` triggered the skip. This is the exact
  precedence rule and outcome-naming convention `relay-implement.md`'s
  Phase A.3.5 Step 1 already establishes.
- **MIRROR**: Patterns to Mirror snippets 1 and 3 (`relay-approve.md:277`,
  `relay-implement.md:368`).
- **AC**: AC-A1 (PRD AC-6), AC-A2 (PRD AC-6)
- **VALIDATE**:
  ```bash
  grep -qE "docs_sync_enabled == false" plugins/relay/commands/relay-approve.md && grep -qE "SKIPPED \(docs_sync: false\)" plugins/relay/commands/relay-approve.md
  ```

### Task 3: UPDATE plugins/relay/commands/relay-approve.md — Phase 4 DOCS COMMIT: same dual-condition gate

- **ACTION**: Replace the existing guard "If `no_docs_flag = true`, skip
  this phase." at the top of Phase 4 with the identical dual-condition
  gate and outcome-naming convention applied in Task 2 ("If
  `no_docs_flag == true` OR `docs_sync_enabled == false`, skip this phase
  ..."), so Phase 3 and Phase 4 apply the master switch consistently — a
  project with `docs_sync: false` never reaches either phase, matching the
  behavior `/relay-implement` already guarantees for its own single
  docs-sync sub-phase.
- **MIRROR**: Patterns to Mirror snippet 3 (`relay-implement.md:368`).
- **AC**: AC-A1 (PRD AC-6)
- **VALIDATE**:
  ```bash
  count=$(grep -cE "docs_sync_enabled == false" plugins/relay/commands/relay-approve.md); if [ "$count" -ge 2 ]; then echo "PASS: gate applied to both Phase 3 and Phase 4 ($count occurrences)"; else echo "FAIL: expected >=2 occurrences of the docs_sync_enabled gate (Phase 3 + Phase 4), found $count"; exit 1; fi
  ```

### Task 4: UPDATE plugins/relay/commands/relay-approve.md — Phase 3: document idempotency + optional manifest consultation

- **ACTION**: Add a short paragraph near the top of Phase 3 DOCS CYCLE (after
  the dual-condition gate from Task 2, before Step 3.1) documenting: (a)
  this pass is **idempotent** against implement-time sync — when
  `/relay-implement`'s own docs-sync sub-phase already synced `docs/` for
  this feature, docs-updater's comparison logic evaluates against the
  *current* state of each target file (not merely diff presence), so an
  edit already present in `docs/` produces no delta on this second pass;
  operators should expect a low-delta or near-empty manifest in that case,
  not treat it as a failure; and (b) the docs-updater invocation for this
  phase **may consult the implement-time manifest** at
  `PRPs/reports/<feature>/docs-update.md` (when present) to avoid
  re-proposing edits already applied — noted here as documentation of
  existing/expected behavior, not a new agent input or contract change.
- **MIRROR**: Patterns to Mirror snippet 4 (`docs-updater.md:219-232`).
- **AC**: AC-A3 (PRD AC-5), AC-A4 (PRD AC-5)
- **VALIDATE**:
  ```bash
  grep -qiE "\bidempotent\b" plugins/relay/commands/relay-approve.md && grep -qE "consult(s)? the implement-time manifest" plugins/relay/commands/relay-approve.md
  ```

### Task 5: UPDATE plugins/relay/commands/relay-approve.md — Phase 5 Step 5.1: summary terminology

- **ACTION**: In Phase 5 Step 5.1's structured summary template, extend the
  `Docs:` line's bracketed outcome list from `[APPROVED + pushed to
  <base-branch> | skipped (--no-docs) | APPROVED + push FAILED (see
  FAILED_DOCS_PUSH_BLOCKED)]` to also include `skipped (docs_sync: false)`
  as a distinct outcome, matching the four-way outcome vocabulary
  `relay-implement.md`'s Final output surface already uses for its own
  `docs_sync_outcome`.
- **MIRROR**: Patterns to Mirror snippet 5 (`relay-implement.md:525`).
- **AC**: AC-A1 (PRD AC-6)
- **VALIDATE**:
  ```bash
  grep -qE "skipped \(--no-docs\)" plugins/relay/commands/relay-approve.md && grep -qE "skipped \(docs_sync: false\)" plugins/relay/commands/relay-approve.md
  ```

### Task 6: UPDATE docs/context/methodology.md — correct the stale `## Docs Sync` section

- **ACTION**: In the `## Docs Sync` section: (a) replace the sentence
  "Today it is a declared value only, read but not yet acted on:
  `docs-updater` records it in the manifest's effective-configuration
  header, but no command wires the actual skip logic yet — that is Phase 2
  (`/relay-implement` dispatch) and Phase 3 (`/relay-approve` safety net)
  of `PRPs/prds/implement-phase-docs-sync.prd.md`, both not built yet."
  with present-tense text stating that both `/relay-implement` (Phase 2)
  and `/relay-approve` (Phase 3) now read `docs_sync` and self-skip their
  respective docs cycles when it is `false`; (b) replace "will, once that
  wiring lands, disable automated docs sync for this project entirely"
  with "disables automated docs sync for this project entirely"; (c)
  replace the `--no-docs` sentence's "a separate, per-invocation override
  on the future `/relay-implement` (not a flag on any command shipped in
  this repo today) — once built, it will override" with present tense
  describing the shipped `--no-docs` flags on both `/relay-implement` and
  `/relay-approve`; (d) in "### How to override" item 1, drop the "once
  Phase 2/Phase 3 wire the gating logic" future-tense caveat. Do not touch
  any other section of the file (the `## TDD` section and frontmatter stay
  byte-identical).
- **MIRROR**: Patterns to Mirror snippet 6 (`methodology.md:51-55` — the
  exact stale sentence being replaced).
- **AC**: AC-A5 (PRD AC-6)
- **VALIDATE**:
  ```bash
  if grep -q "both not built yet" docs/context/methodology.md; then echo "FAIL: stale 'not built yet' phrasing still present in methodology.md"; exit 1; else echo "PASS: stale phrasing removed"; fi
  ```

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
for f in plugins/relay/commands/relay-approve.md docs/context/methodology.md; do
  count=$(grep -c "^---$" "$f")
  if [ "$count" -lt 2 ]; then
    echo "FAIL: $f frontmatter not properly closed (found $count '---' delimiter lines, need >=2)"
    exit 1
  fi
done
echo "PASS: frontmatter delimiters well-formed on both changed files"
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail

approve="plugins/relay/commands/relay-approve.md"
methodology="docs/context/methodology.md"

# Positive: docs_sync read step present (Task 1)
grep -qE "\bdocs_sync_enabled\b" "$approve"

# Positive: dual-gate applied at least twice — Phase 3 + Phase 4 (Task 2, Task 3)
count=$(grep -cE "docs_sync_enabled == false" "$approve")
if [ "$count" -lt 2 ]; then
  echo "FAIL: expected >=2 occurrences of the docs_sync_enabled gate (Phase 3 + Phase 4), found $count"
  exit 1
fi

# Positive: idempotency + manifest-consultation documentation (Task 4)
grep -qiE "\bidempotent\b" "$approve"
grep -qE "consult(s)? the implement-time manifest" "$approve"

# Positive: Phase 5 summary reports both skip reasons (Task 5)
grep -qE "skipped \(--no-docs\)" "$approve"
grep -qE "skipped \(docs_sync: false\)" "$approve"

# Negative: stale "not built yet" phrasing removed from methodology.md (Task 6)
if grep -q "both not built yet" "$methodology"; then
  echo "FAIL: stale 'not built yet' phrasing still present in methodology.md"
  exit 1
fi

echo "PASS: all content invariants satisfied"
```

### Level 3 DRY-RUN END-TO-END

```bash
set -euo pipefail
approve="plugins/relay/commands/relay-approve.md"

read_line=$(grep -n "docs_sync_enabled" "$approve" | head -1 | cut -d: -f1)
phase3_line=$(grep -n "^## Phase 3: DOCS CYCLE" "$approve" | head -1 | cut -d: -f1)

if [ -z "$read_line" ] || [ -z "$phase3_line" ]; then
  echo "FAIL: could not locate the docs_sync_enabled read step or the Phase 3 DOCS CYCLE header"
  exit 1
fi

if [ "$read_line" -ge "$phase3_line" ]; then
  echo "FAIL: docs_sync_enabled must be read in Phase 0, before the Phase 3 DOCS CYCLE gate (found read at line $read_line, Phase 3 header at line $phase3_line)"
  exit 1
fi

echo "PASS: docs_sync_enabled is read in Phase 0, before the Phase 3 gate consumes it (line $read_line < line $phase3_line)"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** Given `docs_sync: false` in
  `docs/context/methodology.md`, when `/relay-approve` runs, then Phase 3
  DOCS CYCLE and Phase 4 DOCS COMMIT both self-skip with a logged note
  distinguishing the `docs_sync: false` skip (`docs_sync_outcome =
  "SKIPPED (docs_sync: false)"`) from the `--no-docs` skip.
- **AC-A2 (PRD AC-6):** Given `docs_sync: true` but `/relay-approve`
  invoked with `--no-docs`, when it runs, then only the `--no-docs` skip
  fires (existing behavior preserved) — `--no-docs` takes precedence over
  `docs_sync_enabled` per the same precedence rule `relay-implement.md`'s
  Phase A.3.5 established.
- **AC-A3 (PRD AC-5):** Given docs were already synced at implement time
  (docs already reflect the merged diff), when `/relay-approve`'s docs
  cycle runs post-merge, then `relay-approve.md`'s Phase 3 prose
  documents that the docs-updater pass is expected to produce only
  additive deltas for post-implementation decisions, without destructively
  rewriting implement-time edits (relying on docs-updater's existing
  additive-only / PRESERVE-ENTIRELY behavior, now explicitly acknowledged
  in the command's own prose).
- **AC-A4 (PRD AC-5):** Given the two-pass model (implement-time primary
  sync + approve-time safety net), when an operator reads
  `relay-approve.md`'s Phase 3 section, then it documents that the
  docs-updater invocation may consult the implement-time manifest at
  `PRPs/reports/<feature>/docs-update.md` to avoid re-proposing
  already-applied edits.
- **AC-A5 (PRD AC-6):** Given `docs/context/methodology.md`'s `## Docs
  Sync` section, when a reader consults it after this phase ships, then it
  no longer states that approve-time gating is "not built yet" — it
  accurately reflects that both `/relay-implement` and `/relay-approve`
  wire the `docs_sync` skip logic.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Syncing during implement describes not-yet-merged / later-reverted state | M | M | Approve-time safety net (this phase); additive-only + PRESERVE-ENTIRELY keeps edits reconcilable (PRD Technical Risks table, row 2) |
| The two independent `docs_sync` gate checks (implement-time in `relay-implement.md`, approve-time in `relay-approve.md`) drift out of sync if one is edited without the other in the future | L | M | This phase mirrors the exact precedence rule and outcome-naming convention from `relay-implement.md`'s Phase A.3.5 (Tasks 2 and 3), rather than inventing new gate semantics, so both commands read from the same documented contract |
| Editing `docs/context/methodology.md`'s `## Docs Sync` section (Task 6) collides with Phase 4's future `docs/decisions.md` entry work | L | L | Task 6 is scoped strictly to the `## Docs Sync` section's stale-phrasing sentences; the `## TDD` section, frontmatter, and `docs/decisions.md` are left untouched this phase |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
when a test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored. `test_frameworks: ["node:test"]` is declared in this repo, so
the test pair is ACTIVE in test-after mode — but this phase's deliverable
is prompt/config markdown only (`phase_type: scaffold`), so there is no
production source surface for the pair to write `node:test` files
against; the Implementer authors ZERO test files (R-X strict) regardless.

Other notes:
- `phase_type: scaffold` was chosen over `docs` because the primary
  changed file (`relay-approve.md`) is a command *prompt*, not a knowledge-base
  content file, and its Level 2/3 validation is grep-based content-invariant
  checking rather than a compile/build/migration check — consistent with
  the `phase_type` precedent already established for Phase 1 and Phase 2 of
  this same PRD (also agent/command prompt files, no application source).
- This phase deliberately does NOT change `docs-updater.md` or
  `docs-reviewer.md` — Phase 1 already added everything those agents need
  (`diff_source`, `non_interactive`, and the `docs_sync` read + manifest
  header). This phase is command-prose-only.
- The PRD's own Decision Gate block (top of
  `PRPs/prds/implement-phase-docs-sync.prd.md`) notes that "the PRIMARY
  docs-sync moves into Pillar 2 (implementation); Pillar 3 is retained as a
  safety net" is "a conscious refinement, to be recorded in
  `docs/decisions.md` at implementation time" — confirmed during this
  phase's grounding that this promotion has NOT yet happened and is
  correctly scoped to PRD Implementation Phases row 4 ("Docs + site"), not
  this row.

*Generated: 2026-07-16*
*Approved: 2026-07-16*
*Implemented: 2026-07-16*
*Status: IMPLEMENTED*
