# Feature: Post-green (B5) ledger-awareness (Phase 4 of test-pair-universalization)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decision (post-green weakening gate becomes ledger-aware); cross-cutting pattern (the anti-weakening guarantee intersecting the new lifecycle-ledger authorization signal); reuse of an existing component (extends the `post-green-reviewer` agent + `/relay-test-review` command, edits no other file); impact on a reusable service (B5's verdict gates `/relay-pr` and is consumed by `/relay-execute`)
- Decisions found:
  - 2026-05-06 "TDD pair is the only authorized mechanism for creating test files (R-X strict preserved)" (`docs/decisions.md:421-425`) — PRESERVED and EXTENDED: B5 now treats the pair's APPROVED lifecycle ledger as the single positive-authorization signal for a legitimate removal; the sole-author + anti-weakening half is enforced here, the tdd:false self-skip half (superseded by this PRD) is not touched by this phase
  - 2026-05-12 "Test framework absence is a silent self-skip" (`docs/decisions.md:487`) — PRESERVED: this phase does not change any activation gate; B5 runs only when `/relay-test` already produced a GREEN run
  - 2026-04-28 "reviewer `rubric[]`/verdict arrays are additive; no short-circuit" (precedent cited by sibling reviewers) — the B5 verdict keeps evaluating and recording every concern; ledger-matched ones move to `notes[]` (accepted), they are not silently dropped
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the loop turn green" (`docs/anti-patterns.md`) — consciously NARROWED by this PRD: a removal/skip/whole-file-deletion that matches an APPROVED ledger entry (by `file:function`, or file-path for a whole file) is an authorized retirement recorded as an accepted note; ANY removal/skip/deletion NOT in the ledger — or when no APPROVED manifest exists — still BLOCKS exactly as today. B5 remains a positive gate: the ledger authorizes, it never blanket-exempts a test-pair diff
  - "Writing pipeline artifacts under `.claude/`" (`docs/anti-patterns.md:60-66`) — preserved; the review record stays at `PRPs/reports/<feature>/test-review.json`, the consulted manifest at `PRPs/reports/<feature>/test-suite.diff`
- Applicable architectural rules:
  - Interactivity boundary — autonomous after PRD approval (`docs/context/architecture.md:60`); B5 never prompts, it returns APPROVED / CHANGES_REQUESTED
  - PRP artifact paths (`docs/context/architecture.md:94`) — the manifest B5 reads and the review record it writes both stay under `PRPs/reports/<feature>/`, never `.claude/`
  - Command surface = 14 commands (`docs/context/architecture.md:115`) — this phase edits one agent file and one existing command; no command is added or removed
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-pair-universalization.prd.md` — Implementation Phases row 4: "Post-green (B5) ledger-awareness" — Goal: authorized removals pass post-green; unexplained ones and whole-file deletions still block. Scope: `post-green-reviewer.md` reads the APPROVED manifest and reclassifies ledger-matched concerns; add whole-file-deletion detection; `/relay-test-review.md` resolves + passes the manifest path. Success signal: AC-10, AC-11 (Phase Details line 223; row 4 line 208).

## Summary

This phase makes the post-green reviewer (B5) consult the feature's APPROVED suite manifest lifecycle ledger, confined to two files: `plugins/relay/agents/post-green-reviewer.md` (the agent) and `plugins/relay/commands/relay-test-review.md` (its wrapping command). Today B5 flags **every** net-removed test function and **every** newly-added skip marker as a blocking `test_removed` / `test_skipped` concern (`post-green-reviewer.md:82-136`, `179-186`), with no concept of an authorized removal, and it explicitly does **not** detect whole-file test deletions (a documented deferral at `post-green-reviewer.md:252-255`). This phase (a) adds a `suite_manifest_path` input and a new load step that reads the manifest and treats it as authoritative **only** when its trailing status is `*Status: APPROVED*`, parsing the `## Lifecycle ledger` table into entries keyed by `file:function`; (b) makes the removed-function and skip-marker detections ledger-aware — a detected removal/skip whose `file:function` matches an APPROVED ledger entry becomes an **accepted note** (`notes[]`) instead of a blocking concern, while an unmatched one — or any removal when the ledger is absent/DRAFT — still blocks; (c) adds whole-file test-deletion detection (via `git diff --name-status` filtering `D` status), gated on the same ledger, overturning the prior deferral; and (d) resolves the manifest path in the command and passes it to the agent. The anti-weakening guarantee is preserved verbatim: the ledger is a **positive authorization** signal; with no APPROVED manifest present, B5's behavior is byte-identical to today (all removals/skips block).

## User Story

```
As a developer running relay against a tdd:false project whose feature phase legitimately retired an obsolete or redundant test
I want post-green review to accept a removal that the APPROVED suite manifest ledger justifies, while still blocking any removal, skip, or whole-file deletion that the ledger does not justify
So that a legitimately pruned suite passes the post-green gate on the way to /relay-pr, and an un-authorized weakening of the suite is still caught exactly as it is today
```

## Problem Statement

B5 exists to close one attack surface: an auto-correction loop that reaches GREEN by weakening the suite. It does this bluntly — any net-removed test function (`post-green-reviewer.md:82-107`) or newly-added skip marker (`:112-136`) forces `CHANGES_REQUESTED` (`:179-186`), with no notion of an *authorized* removal. Phases 2 and 3 introduced the trust anchor that fixes this: the test-writer records every UPDATE/DELETE in the suite manifest's `## Lifecycle ledger` (`test-writer.md:436-448`), and the test-reviewer independently re-validates each op and flips the manifest to `*Status: APPROVED*` via `/relay-test-write-review`. But B5 has no idea that ledger exists — it references neither `test-suite.diff` nor the ledger anywhere. So a phase that legitimately retires an obsolete test (already validated by `test-reviewer`'s `R-LIFECYCLE-LEGITIMATE`) still dead-ends at a B5 false-positive `test_removed` rejection (PRD Success Metric row 2). Separately, B5 cannot see a **whole-file** test deletion at all: its per-file `git diff <file>` scan assumes the file still exists, and the case is an explicit out-of-scope deferral (`:252-255`) — a hole a cheat can drive a deleted test file straight through.

## Solution Statement

Confine all changes to `plugins/relay/agents/post-green-reviewer.md` and `plugins/relay/commands/relay-test-review.md`. First, add a `suite_manifest_path` input to the agent and a **Step 2.5 — load the APPROVED lifecycle ledger**: read the manifest at that path; treat it as authoritative **only** when its trailing line is `*Status: APPROVED*`; parse the `## Lifecycle ledger` table (`| Op | Classification | Test (file:function) | Justification |`) into a set of authorized entries keyed by `file:function` (whole files keyed by `file`); a missing file, an unreadable file, or a `*Status: DRAFT*` (not-yet-approved) manifest yields `ledger = none`. Second, make Step 3a (removed functions) and Step 3b (skip markers) ledger-aware: partition each detected removal/skip into **ledger-matched** (emit an `accepted_removal` / `accepted_skip` entry in `notes[]`) versus **unmatched** (emit the existing blocking concern); when `ledger = none`, no reclassification happens and the behavior is byte-identical to today. Third, add **Step 3d — whole-file test deletions**: run `git diff --name-status <base>..HEAD -- <test-pathspecs>`, take the `D`-status entries, and for each deleted test file emit an accepted note if the file matches a DELETE ledger entry (by file path) or a blocking `test_file_deleted` concern otherwise (added to Step 5's blocking-type enumeration). The match key is `file + function` only, reusing the sibling precedent from `test-reviewer.md:397-401` (content-hash hardening stays a deferred Could-item). Fourth, in `relay-test-review.md`, resolve `suite_manifest_path = <worktree>/PRPs/reports/<feature>/test-suite.diff` (`<feature>` is already resolved for `run.json`) and append it to the agent-invocation prompt block, documenting that a missing/DRAFT manifest gives byte-identical (all-blocking) behavior. R-X strict, the Implementer, and the Code Reviewer are untouched.

## Metadata

| Field | Value |
|-------|-------|
| Type | Agent + command contract change (prompt-only markdown) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/agents/post-green-reviewer.md` (B5 agent) and `plugins/relay/commands/relay-test-review.md` (its wrapping command); reads the `test-suite.diff` manifest produced by the test pair; B5's verdict gates `/relay-pr` and is consumed by `/relay-execute` |
| Dependencies | Phase 3 (test-reviewer mode + legitimacy) — complete; consumes the APPROVED lifecycle-ledger contract from Phases 2–3 |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/test-pair-universalization.prd.md` Implementation Phases row 4 (line 208); Phase Details (line 223); ACs AC-10 (line 85), AC-11 (line 86); invariant AC-12 (line 87) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/post-green-reviewer.md` | whole file | One of the two files this phase edits; the detection/verdict logic four of the five tasks touch |
| P0 | `plugins/relay/commands/relay-test-review.md` | 32-76 | The command's arg/feature/base resolution + the "Invoke the agent" prompt block Task 5 appends `suite_manifest_path` to |
| P0 | `plugins/relay/agents/post-green-reviewer.md` | 39-44 | The Inputs block Task 1 extends with `suite_manifest_path` |
| P0 | `plugins/relay/agents/post-green-reviewer.md` | 82-136 | Step 3a (removed functions → `test_removed`) + Step 3b (skip markers → `test_skipped`) — the concern producers Task 2 makes ledger-aware |
| P0 | `plugins/relay/agents/post-green-reviewer.md` | 179-186 | Step 5 verdict rule — the single choke point that maps blocking-type concerns → CHANGES_REQUESTED |
| P0 | `plugins/relay/agents/post-green-reviewer.md` | 245-255 | The Out-of-scope deferral for whole-file deletions Task 3 overturns |
| P0 | `plugins/relay/agents/test-writer.md` | 436-448 | The `## Lifecycle ledger` table shape (`Op \| Classification \| Test (file:function) \| Justification`) + sentinel row Task 1 parses |
| P1 | `plugins/relay/agents/test-reviewer.md` | 397-401 | The sibling reviewer's `file + function` ledger match-key precedent to reuse (no content-hash) |
| P1 | `plugins/relay/commands/relay-test-write-review.md` | 181-203 | Where the manifest DRAFT→APPROVED flip is performed — establishes that only `*Status: APPROVED*` is authoritative for B5 |
| P1 | `PRPs/prds/test-pair-universalization.prd.md` | 85-87, 186, 192-196, 223 | AC-10/AC-11/AC-12; the "B5 evolution is additive" Architecture Note; the three Technical Risks this phase carries (lines 192, 193, 196); Phase 4 Details |
| P2 | `docs/context/methodology.md` | 1-5 | Confirms `tdd: false` / `test_frameworks: []` — the TDD routing note source and why no in-repo suite validates this phase |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/post-green-reviewer.md:39-44
```
## Inputs (from the calling command)

- `worktree`: absolute path to the target project worktree
- `run_json_path`: absolute path to `PRPs/reports/<feature>/run.json` from the `/relay-test` run that produced GREEN
- `base_branch`: the ref to compare against (default `main`; command resolves it first)
- `run_id`: the run being reviewed (matches `run.json.run_id`)
```
Task 1 appends a fifth input: `suite_manifest_path`: absolute path to the feature's `PRPs/reports/<feature>/test-suite.diff` (may be absent or DRAFT — see the load step). This is the only new input; the command (Task 5) supplies it.

# SOURCE: plugins/relay/agents/test-writer.md:436-448
```
## Lifecycle ledger

Every UPDATE or DELETE performed this session, one row each. When
the session was create-only (no UPDATE/DELETE), the table's sole
row is the default `(none — no update/delete this session)` row
below instead of any operation rows.

| Op | Classification | Test (file:function) | Justification |
|----|-----------------|-----------------------|----------------|
| UPDATE | EXISTING_TEST_UPDATED | <file:function> | <driving AC + what changed> |
| DELETE | OBSOLETE_TEST_REMOVED | <file:function> | <removed behavior/AC> |
| DELETE | REDUNDANT_TEST_REMOVED | <file:function> | <surviving test file:function> |
| (none — no update/delete this session) | — | — | — |
```
Task 1's Step 2.5 parses this exact table into a set of authorized `file:function` keys. The sentinel `(none — no update/delete this session)` row means a create-only session → the authorized set is empty (every removal/skip B5 sees will therefore be unmatched → blocks, which is correct).

# SOURCE: plugins/relay/agents/test-reviewer.md:397-401
```
`test-writer.md:436-448`). Match ledger rows to the observed
test-file changes in the diff by `file + function` only —
content-hash hardening is a deferred Could-item + Open Question
(out of this phase's scope — MVP scope note only, no spoofing
hardening implemented here).
```
Tasks 2 and 3 reuse this exact match key: a removed function matches a ledger row when `file + function` are equal; a whole-file deletion matches when the deleted file path equals the `file` component of a DELETE ledger row. Content-hash hardening stays deferred, identical to the reviewer-side check — the two match keys must agree so the same removal is judged consistently at both gates.

# SOURCE: plugins/relay/agents/post-green-reviewer.md:98-107
```
Produce concern objects:

{
  "type": "test_removed",
  "file": "frontend/tests/e2e/assessment-list.spec.ts",
  "net_removed": 2,
  "evidence": ["- it('filters by institution', async ({ page }) => {", "- it('filters by date', async ({ page }) => {"]
}
```
Task 2 partitions the removed functions behind this object: for each removed `file:function`, if it matches an APPROVED ledger entry emit an `accepted_removal` note instead; only the unmatched removals remain in a `test_removed` concern (with `net_removed` = the unmatched count). The evidence lines already carry the removed test declarations from which `function` is extracted for the match.

# SOURCE: plugins/relay/agents/post-green-reviewer.md:112-136
```
#### 3b — Newly-added skip markers (weakening via skipping)

Count lines matching the added-side patterns:
...
Produce concern objects:

{
  "type": "test_skipped",
  "file": "backend/tests/e2e/test_public_review.py",
  "net_added": 1,
  "evidence": ["+ @pytest.mark.skip(reason='flaky in CI')"]
}
```
Task 2 makes this ledger-aware symmetrically: a skip whose `file:function` matches a ledger `EXISTING_TEST_UPDATED` (or DELETE) entry — i.e. the pair authored the skip/xfail as a recorded update — becomes an `accepted_skip` note; an unmatched skip stays a blocking `test_skipped` concern (skipping a test that still maps to a live requirement is weakening).

# SOURCE: plugins/relay/agents/post-green-reviewer.md:59-68
```
Run in the worktree:

git diff --name-only <base_branch>..HEAD -- \
    '**/test_*.py' '**/tests/**/*.py' '**/*.test.ts' '**/*.test.tsx' \
    '**/*.spec.ts' '**/*.spec.tsx' '**/*.test.js' '**/*.spec.js' \
    '**/*_test.go' '**/tests/**/*.rb' '**/*_spec.rb'
```
Task 3 adds a sibling command using the SAME pathspecs but `--name-status`, filtering rows whose status is `D` (deleted). The pathspec list is copied verbatim so whole-file detection covers the identical framework conventions as the change-detection scan.

# SOURCE: plugins/relay/agents/post-green-reviewer.md:179-186
```
### Step 5 — Build the verdict

Aggregate all concerns. The decision rule:

- If `concerns` contains at least one entry of type `test_removed`,
  `test_skipped`, `trivial_assertion`, or `coverage_drop` →
  `CHANGES_REQUESTED`.
- Otherwise → `APPROVED`.
```
Task 4 extends the blocking-type enumeration with `test_file_deleted` (the new whole-file concern) and states that `accepted_removal` / `accepted_skip` / `accepted_file_deletion` live in `notes[]`, never `concerns[]`, so they never force CHANGES_REQUESTED — a run whose only test-diff findings are ledger-matched can therefore return APPROVED (PRD AC-10).

# SOURCE: plugins/relay/agents/post-green-reviewer.md:245-255
```
## Out of scope (explicit deferrals)
...
- **Newly-disabled test files** (a whole file deleted, or
  `testMatch` patterns narrowed in config) — config-level changes are
  out of scope; the file-level diff already catches the primary case
  of function deletion inside a retained file.
```
Task 3 rewrites this deferral: whole-file **deletion** detection is now IN scope (via the `--name-status` `D` scan, ledger-gated); only `testMatch`/config-level narrowing remains deferred. The bullet must be split so it no longer claims a deleted file is out of scope.

# SOURCE: plugins/relay/commands/relay-test-review.md:62-71
```
Use the Agent tool with `subagent_type="post-green-reviewer"`. Pass a
prompt including:

worktree: <absolute path>
run_json_path: <worktree>/PRPs/reports/<feature>/run.json
base_branch: <resolved base>
run_id: <from run.json>
```
Task 5 appends one line to this block: `suite_manifest_path: <worktree>/PRPs/reports/<feature>/test-suite.diff`. `<feature>` is already resolved above for `run.json`, so no new resolution logic is needed — only the path string and a note that a missing/DRAFT manifest is expected and yields all-blocking behavior.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/post-green-reviewer.md` | UPDATE | Add the `suite_manifest_path` input + Step 2.5 ledger load (APPROVED-gated parse); make Step 3a/3b detections ledger-aware (matched → accepted notes, unmatched → blocking); add Step 3d whole-file deletion detection; wire the verdict + note shapes + templates; overturn the whole-file deferral; refresh the Decision Gate note. Tasks 1–4 confine here. |
| `plugins/relay/commands/relay-test-review.md` | UPDATE | Resolve `suite_manifest_path = <worktree>/PRPs/reports/<feature>/test-suite.diff` and append it to the agent-invocation prompt block; document the missing/DRAFT-manifest byte-identical fallback. Task 5 confines here. |

## NOT Building (Scope Limits)

- **No change to R-X strict, the Implementer, or the Code Reviewer** — `implementer.md` and `code-reviewer.md` are untouched; the pair remains the sole test author and the Implementer/loop still author zero test files (PRD AC-12). B5 only *reads* the ledger; it authorizes, it never grants a blanket test-pair exemption.
- **No new activation gate or `tdd:` semantics** — B5 runs only when `/relay-test` already produced a GREEN run; this phase does not read `methodology.md` for activation.
- **No command-gate changes to `/relay-write-test` / `/relay-test-write-review`** — the activation reframe and foundation-skip scoping are Phase 5.
- **No orchestrator ordering** — `/relay-execute` positioning the pair before/after the Implementer and threading the manifest path from run state is Phase 6; this phase only teaches `/relay-test-review` to resolve the path from its own `<feature>`.
- **No ledger content-hash anti-spoof** — MVP matches a removed test by `file + function` (whole file by path), identical to the reviewer-side check; content-hash hardening is a deferred Could-item + Open Question in the PRD.
- **No `testMatch`/config-level test-disabling detection** — narrowing test discovery via config stays an explicit deferral; only whole-file deletion is added here.
- **No governance / docs / version bump** — `decisions.md`, `anti-patterns.md`, the docs site, and `plugin.json` → `0.19.0` are Phases 8–9.

## Step-by-Step Tasks

### Task 1: UPDATE post-green-reviewer.md — add `suite_manifest_path` input + Step 2.5 APPROVED-ledger load

- **AC**: AC-A1 (PRD AC-10), AC-A5 (PRD AC-10, AC-11) — loading the ledger only when the manifest is APPROVED, and yielding `ledger = none` when it is missing/DRAFT, is the precondition for both accepting authorized removals and preserving today's all-blocking behavior when there is no authorization.
- **ACTION**: In the Inputs section (`:39-44`), add a fifth bullet `suite_manifest_path`: absolute path to `PRPs/reports/<feature>/test-suite.diff` (note: may be absent, unreadable, or still DRAFT). Add a new `### Step 2.5 — Load the APPROVED lifecycle ledger` between Step 2 and Step 3. Instruct: read the file at `suite_manifest_path`; treat it as authoritative ONLY when its trailing status line is exactly `*Status: APPROVED*`; parse the `## Lifecycle ledger` table into a set of authorized entries keyed by `file:function` (record the classification per entry: `EXISTING_TEST_UPDATED` / `OBSOLETE_TEST_REMOVED` / `REDUNDANT_TEST_REMOVED`, and the bare `file` for whole-file matching); the sentinel `(none — no update/delete this session)` row yields an empty authorized set. A missing file, an unreadable file, or a `*Status: DRAFT*` (or any non-APPROVED) trailing status → `ledger = none`. State the match key is `file + function` only (content-hash deferred), reusing the reviewer-side precedent. State explicitly: when `ledger = none`, Steps 3a/3b/3d perform NO reclassification and B5's output is byte-identical to the pre-change agent.
- **MIRROR**: Patterns `# SOURCE: plugins/relay/agents/post-green-reviewer.md:39-44` (Inputs), `# SOURCE: plugins/relay/agents/test-writer.md:436-448` (ledger table), and `# SOURCE: plugins/relay/agents/test-reviewer.md:397-401` (match key).
- **VALIDATE**:
```bash
f=plugins/relay/agents/post-green-reviewer.md
if ! grep -q 'suite_manifest_path' "$f"; then echo "FAIL: suite_manifest_path input not added"; exit 1; fi
if ! grep -qi 'Load the APPROVED lifecycle ledger' "$f"; then echo "FAIL: Step 2.5 ledger-load section missing"; exit 1; fi
if ! grep -qF '*Status: APPROVED*' "$f"; then echo "FAIL: APPROVED-only gate not stated"; exit 1; fi
echo "PASS: input + APPROVED-gated ledger load present"
```

### Task 2: UPDATE post-green-reviewer.md — make Step 3a/3b ledger-aware (matched → accepted notes, unmatched → blocking)

- **AC**: AC-A1 (PRD AC-10), AC-A2 (PRD AC-11) — partitioning detected removals/skips by ledger membership is exactly what turns an authorized removal into an accepted note (AC-10) while leaving an unauthorized one blocking (AC-11).
- **ACTION**: In Step 3a (`:82-107`), after the removed-function count, instruct: for each removed `file:function`, look it up in the authorized set from Step 2.5; if it matches a DELETE-classified ledger entry, emit an `accepted_removal` entry in `notes[]` (with `file`, `function`, `classification`, and the ledger justification) instead of counting it toward the concern; only the UNMATCHED removals remain, and a `test_removed` concern is emitted only when `net_removed` (unmatched) > 0. In Step 3b (`:112-136`), symmetrically: a skip whose `file:function` matches an `EXISTING_TEST_UPDATED` (or DELETE) ledger entry → `accepted_skip` note; unmatched skips stay a blocking `test_skipped` concern. State that when `ledger = none` (Step 2.5) NO removal/skip is reclassified — every detected removal/skip stays a concern exactly as today (PRD AC-11 "or when no suite manifest exists"). Do NOT change the detection regexes themselves.
- **MIRROR**: Patterns `# SOURCE: plugins/relay/agents/post-green-reviewer.md:98-107` (test_removed object) and `# SOURCE: plugins/relay/agents/post-green-reviewer.md:112-136` (test_skipped object).
- **VALIDATE**:
```bash
f=plugins/relay/agents/post-green-reviewer.md
if ! grep -q 'accepted_removal' "$f"; then echo "FAIL: accepted_removal note path missing"; exit 1; fi
if ! grep -q 'accepted_skip' "$f"; then echo "FAIL: accepted_skip note path missing"; exit 1; fi
if ! grep -qi 'unmatched' "$f"; then echo "FAIL: matched/unmatched partition not described"; exit 1; fi
echo "PASS: Step 3a/3b ledger-aware partition present"
```

### Task 3: UPDATE post-green-reviewer.md — add Step 3d whole-file test-deletion detection (ledger-gated) + overturn the deferral

- **AC**: AC-A3 (PRD AC-10), AC-A4 (PRD AC-11) — detecting a whole deleted test file and gating it on the ledger is what lets an authorized whole-file retirement pass (AC-A3) while an unauthorized deletion blocks (AC-A4), closing the hole named in the PRD Evidence.
- **ACTION**: Add `#### 3d — Whole-file test deletions (weakening via file removal)`. Instruct: run `git diff --name-status <base_branch>..HEAD -- <the same test pathspecs as Step 2>`, and take entries whose status letter is `D`. For each deleted test file: if its path matches the `file` component of any DELETE-classified ledger entry from Step 2.5, emit an `accepted_file_deletion` note; otherwise emit a blocking concern `{ "type": "test_file_deleted", "file": "<path>" }`. State the same `ledger = none` fallback: with no APPROVED manifest, ANY deleted test file → blocking `test_file_deleted`. Then rewrite the Out-of-scope bullet (`:252-255`): split it so whole-file **deletion** is no longer deferred (it is now Step 3d, ledger-gated) while `testMatch`/config-level discovery narrowing remains the only deferred case. Copy the Step 2 pathspec list verbatim so coverage matches.
- **MIRROR**: Patterns `# SOURCE: plugins/relay/agents/post-green-reviewer.md:59-68` (the `git diff` pathspecs) and `# SOURCE: plugins/relay/agents/post-green-reviewer.md:245-255` (the deferral to overturn).
- **VALIDATE**:
```bash
f=plugins/relay/agents/post-green-reviewer.md
if ! grep -q 'test_file_deleted' "$f"; then echo "FAIL: whole-file deletion concern type missing"; exit 1; fi
if ! grep -q -- '--name-status' "$f"; then echo "FAIL: --name-status deletion scan missing"; exit 1; fi
if grep -q 'a whole file deleted' "$f" && ! grep -qi 'accepted_file_deletion' "$f"; then echo "FAIL: whole-file deletion still framed as out-of-scope with no in-scope handling"; exit 1; fi
echo "PASS: whole-file deletion detection added and deferral overturned"
```

### Task 4: UPDATE post-green-reviewer.md — wire the verdict, note shapes, output templates, and Decision Gate note

- **AC**: AC-A1 (PRD AC-10), AC-A4 (PRD AC-11), AC-A5 (PRD AC-10, AC-11) — adding `test_file_deleted` to the blocking-type list makes an unauthorized whole-file deletion actually block, and routing the `accepted_*` entries to `notes[]` is what lets a fully-authorized run return APPROVED.
- **ACTION**: In Step 5 (`:179-186`), add `test_file_deleted` to the blocking-type enumeration (so it forces `CHANGES_REQUESTED`), and state that `accepted_removal` / `accepted_skip` / `accepted_file_deletion` are `notes[]` entries that NEVER appear in `concerns[]` and therefore never force CHANGES_REQUESTED. Update the APPROVED and CHANGES_REQUESTED JSON output templates (`:191-226`) to show at least one `accepted_*` note in the APPROVED example (documenting that a run with only ledger-matched removals returns APPROVED). Refresh the Decision Gate evidence block (`:25-35`) to note the manifest consultation is a read-only, positive-authorization step (no code/test modified) and that only an `*Status: APPROVED*` manifest is authoritative. Preserve the no-short-circuit posture: every detected removal/skip/deletion is still evaluated and recorded (as a concern OR an accepted note), none silently dropped.
- **MIRROR**: Pattern `# SOURCE: plugins/relay/agents/post-green-reviewer.md:179-186` (the verdict rule extended).
- **VALIDATE**:
```bash
f=plugins/relay/agents/post-green-reviewer.md
# test_file_deleted must appear both in Step 3d AND in the Step 5 blocking enumeration (>=2 occurrences).
if [ "$(grep -c 'test_file_deleted' "$f")" -lt 2 ]; then echo "FAIL: test_file_deleted not wired into the Step 5 verdict rule"; exit 1; fi
if ! grep -qi 'accepted_file_deletion' "$f"; then echo "FAIL: accepted note types not documented in verdict/templates"; exit 1; fi
echo "PASS: verdict + note shapes wired"
```

### Task 5: UPDATE relay-test-review.md — resolve and pass `suite_manifest_path` to the agent

- **AC**: AC-A5 (PRD AC-10, AC-11) — the command resolving the manifest path and passing it is what actually delivers the ledger to B5; without it Tasks 1–4 never see a manifest and B5 stays byte-identical to today for every run.
- **ACTION**: In the "Invoke the agent" block (`:62-71`), append a fifth line to the prompt: `suite_manifest_path: <worktree>/PRPs/reports/<feature>/test-suite.diff`. Add a one-line note that `<feature>` is the same value already resolved for `run.json` (no new resolution logic), and that a missing or `*Status: DRAFT*` manifest is expected/legitimate (e.g. a run with no test-pair activity) and makes B5 behave byte-identically to before (all removals/skips/deletions block). Do NOT add a precondition that HALTs on a missing manifest — its absence is normal. Do NOT change base-branch or feature resolution.
- **MIRROR**: Pattern `# SOURCE: plugins/relay/commands/relay-test-review.md:62-71` (the agent-invocation prompt block).
- **VALIDATE**:
```bash
f=plugins/relay/commands/relay-test-review.md
if ! grep -q 'suite_manifest_path' "$f"; then echo "FAIL: suite_manifest_path not passed to the agent"; exit 1; fi
if ! grep -q 'test-suite.diff' "$f"; then echo "FAIL: manifest path (test-suite.diff) not resolved in the invocation block"; exit 1; fi
echo "PASS: command resolves and passes the manifest path"
```

## Validation Commands

The `relay` repo has no build/lint/test toolchain (`methodology.md` is `tdd: false`, `test_frameworks: []`); the deliverables are two prompt-only markdown contracts. Validation is therefore content-invariant `grep` with real exit-code semantics — the idiom `<check> && echo PASS || echo FAIL` is forbidden (it always exits 0 and would mask a failure; `docs/context/plan-template.md` item 5). All commands run from `<target_root>` (`C:\repos\PRPs-agentic-eng`).

**Level 1 — STATIC_ANALYSIS (both files intact; agent stays read-only)**
```bash
a=plugins/relay/agents/post-green-reviewer.md
c=plugins/relay/commands/relay-test-review.md
test -f "$a" || { echo "FAIL: $a missing"; exit 1; }
test -f "$c" || { echo "FAIL: $c missing"; exit 1; }
head -n 1 "$a" | grep -q '^---$' || { echo "FAIL: agent frontmatter open missing"; exit 1; }
grep -q '^name: post-green-reviewer$' "$a" || { echo "FAIL: agent name field drifted"; exit 1; }
# Review must stay read-only: the "Never modify any file" hard rule must survive.
grep -qi 'Never modify' "$a" || { echo "FAIL: read-only review constraint dropped"; exit 1; }
echo "PASS: structure + read-only invariant intact"
```

**Level 2 — CONTENT_INVARIANTS (ledger-awareness present; today's blocking types preserved)**
```bash
a=plugins/relay/agents/post-green-reviewer.md
fail=0
for pat in 'suite_manifest_path' 'Load the APPROVED lifecycle ledger' 'accepted_removal' 'accepted_skip' 'accepted_file_deletion' 'test_file_deleted' -- '--name-status'; do
  grep -q -- "$pat" "$a" || { echo "FAIL: missing invariant '$pat'"; fail=1; }
done
# The pre-existing blocking detections must still be present (not deleted, only augmented).
for pat in 'test_removed' 'test_skipped'; do
  grep -q "$pat" "$a" || { echo "FAIL: pre-existing blocking type '$pat' lost"; fail=1; }
done
# APPROVED-only authoritative gate stated verbatim.
grep -qF '*Status: APPROVED*' "$a" || { echo "FAIL: APPROVED-only ledger gate missing"; fail=1; }
if [ "$fail" -eq 0 ]; then echo "PASS: ledger-aware content invariants hold"; else exit 1; fi
```

**Level 3 — INTEGRATION (cross-file wiring + scope containment)**
```bash
a=plugins/relay/agents/post-green-reviewer.md
c=plugins/relay/commands/relay-test-review.md
# The command passes exactly the input the agent now declares.
grep -q 'suite_manifest_path' "$c" || { echo "FAIL: command does not pass suite_manifest_path"; exit 1; }
grep -q 'suite_manifest_path' "$a" || { echo "FAIL: agent does not declare suite_manifest_path"; exit 1; }
grep -q 'test-suite.diff' "$c" || { echo "FAIL: command does not resolve the manifest path"; exit 1; }
# test_file_deleted wired into BOTH the detection and the verdict rule.
[ "$(grep -c 'test_file_deleted' "$a")" -ge 2 ] || { echo "FAIL: test_file_deleted not wired into verdict"; exit 1; }
# Scope containment: ONLY these two files changed in the working tree under plugins/relay/ and docs/.
changed=$(git diff --name-only -- 'plugins/relay/' 'docs/' | sort | tr '\n' ' ')
expected="plugins/relay/agents/post-green-reviewer.md plugins/relay/commands/relay-test-review.md "
if [ "$changed" != "$expected" ]; then echo "FAIL: unexpected files changed -> $changed"; exit 1; fi
echo "PASS: cross-file wiring consistent + scope contained"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-10):** When the branch diff shows a removed test function AND that removal's `file:function` matches an entry in the APPROVED suite-manifest lifecycle ledger, B5 emits an `accepted_removal` entry in `notes[]` (not a blocking `test_removed` concern) and can therefore return APPROVED for that removal.
- **AC-A2 (PRD AC-11):** When a removed or skipped test's `file:function` is NOT present in the APPROVED ledger — or when the manifest is absent or still `*Status: DRAFT*` — B5 emits the blocking `test_removed` / `test_skipped` concern exactly as today, forcing `CHANGES_REQUESTED`.
- **AC-A3 (PRD AC-10):** B5 detects a whole deleted test file (via `git diff --name-status` `D`-status) and, when the deleted file path matches a DELETE-classified ledger entry, records an `accepted_file_deletion` note rather than a blocking concern.
- **AC-A4 (PRD AC-11):** A whole deleted test file NOT matched by any ledger entry — or when there is no APPROVED manifest — yields a blocking `test_file_deleted` concern, which is enumerated in the Step 5 verdict rule as forcing `CHANGES_REQUESTED`.
- **AC-A5 (PRD AC-10, AC-11):** `/relay-test-review` resolves `suite_manifest_path = <worktree>/PRPs/reports/<feature>/test-suite.diff` from the already-resolved `<feature>` and passes it to the `post-green-reviewer` agent; a missing or DRAFT manifest is legitimate and makes B5's output byte-identical to the pre-change behavior (no reclassification, all removals/skips/deletions block).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Ledger-awareness becomes a weakening loophole — a still-live test retired as "authorized" passes B5 (PRD Technical Risk "legitimate deletion becomes a weakening loophole", line 192) | M | H | Positive gate only: B5 accepts a removal ONLY when it matches an entry in an `*Status: APPROVED*` manifest — and that APPROVED status was granted by `test-reviewer`'s `R-LIFECYCLE-LEGITIMATE`, which already re-derived obsolete/redundant independently; a DRAFT or absent manifest authorizes nothing; unmatched removals still block |
| Spoofed ledger entry launders an unrelated deletion (PRD Technical Risk line 193) | M | M | MVP matches by `file + function` (whole file by path), identical to the reviewer-side key (`test-reviewer.md:397-401`); content-hash hardening is a deferred Could-item + Open Question — noted as a known limit, not closed here |
| Whole-file-deletion detection over-fires on a legitimate refactor that relocates tests (PRD Technical Risk line 196) | L | M | Only fires when a test file is `D`-deleted AND its path is not in the ledger; a refactor that relocates tests is recorded by the pair as a DELETE (+ paired CREATE) ledger entry, so the deletion matches and becomes an accepted note |
| Stale ledger — the APPROVED manifest was written for a different run/commit than the one B5 reviews | L | M | Documented as a known limitation (MVP keys on `file:function`, not run_id/commit); B5 still requires an exact `file:function`/path match, so a stale ledger can only accept a removal whose identity matches — surfaced in Notes for the follow-up hardening |
| Behavioral regression for non-test-pair projects that never produce a manifest | L | H | The `ledger = none` branch (missing/unreadable/DRAFT) makes B5 byte-identical to today; Level-2/3 invariants assert the pre-existing `test_removed`/`test_skipped` blocking types survive |
| An edit accidentally touches a sibling agent/command/doc | L | H | Level-3 scope-containment check fails if any file other than the two named changes under `plugins/relay/` or `docs/`; the agent's read-only "Never modify" constraint is asserted present in Level 1 |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
  - Contextual clarification (not a substitute for the verbatim string above): the `relay` repo itself is `tdd: false` with `test_frameworks: []`, so no relay-authored suite validates this phase in-repo. Per `methodology.md`, the test-pair contract is exercised against target projects (the PRD's dogfood is `printed-exams-single-record`), not against this plugin repo. The five Acceptance Criteria here are validated by human review of `post-green-reviewer.md` + `relay-test-review.md` and by the Level 1–3 grep invariants. This PRD's Phase 7 revises the routing note's *semantics* (to describe test-after authoring); Phase 4 does not touch the note.
- **Design decision — APPROVED-only authoritative manifest.** B5 treats the manifest as authorization ONLY when its trailing status is `*Status: APPROVED*` (the flip `test-reviewer`/`/relay-test-write-review` performs on rubric pass, `relay-test-write-review.md:181-203`). A DRAFT manifest is a ledger the reviewer has not yet blessed, so it must not launder a removal past B5. This resolves the research gap "no handling for a DRAFT (not-yet-APPROVED) ledger" — DRAFT is treated as `ledger = none`.
- **Design decision — new `test_file_deleted` concern type over reusing `test_removed`.** A whole-file deletion is emitted under a distinct type added to the Step 5 blocking enumeration, rather than folded into `test_removed`, so the verdict rule and the audit trail distinguish "functions removed inside a retained file" from "an entire file gone". Both are blocking when unauthorized; the explicit type keeps the concern list legible and makes the Level-3 "wired into verdict" invariant checkable.
- **Match-key consistency is load-bearing.** B5's `file + function` (and whole-file `file`) match key must agree with `test-reviewer.md`'s `R-LIFECYCLE-LEGITIMATE` key (`:397-401`) so a removal judged legitimate at authoring time is judged legitimate at post-green time. Diverging keys would let a removal pass one gate and fail the other. Content-hash hardening, when it lands (PRD Open Question), must update both gates together.
- **Anti-weakening guarantee preserved.** This phase does not relax R-X: the Implementer and the auto-correction loop still author zero test files (PRD AC-12). The ledger is a *positive* authorization signal — it can only turn a pair-authored, reviewer-approved removal into an accepted note; it can never exempt an arbitrary test-file change, and with no APPROVED manifest B5 blocks every removal/skip/deletion exactly as before.
- **Confinement.** Every change is inside `plugins/relay/agents/post-green-reviewer.md` (Tasks 1–4) and `plugins/relay/commands/relay-test-review.md` (Task 5). Command gates are Phase 5; orchestrator ordering + threading the manifest path from run state is Phase 6; the `docs/anti-patterns.md` "weakening tests" narrowing + `decisions.md` records are Phase 8.
- **Web-research context (informational, not a blocker).** External practice corroborates the positive-authorization design: independent review gates are recommended precisely because an agent that grades its own diff can hide its own shortcuts (blog.codacy.com); formal test retirement is expected to carry written reasoning rather than be a silent deletion (mergify.com test-quarantine), which is what the ledger records; mutation testing is the industry evidence path for proving a test truly redundant before removal (lakitna.medium.com, about.codecov.io); and default-deny-plus-allowlist is the same-shape "positive authorization" pattern (airlock-dev/airlock). No shipped tool was found implementing a per-op classification+justification ledger as a post-green CI gate, so this remains a novel synthesis (research gap, not a blocker).

*Generated: 2026-07-10*
*Approved: 2026-07-10*
*Implemented: 2026-07-10*
*Status: IMPLEMENTED*
