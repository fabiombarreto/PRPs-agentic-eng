# Feature: Per-phase diff base (Phase 2 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: adds a phase-boundary snapshot to the orchestrator's close-out and a base-override priority to the implement command's precondition chain; writes to the git object store and index but never commits; touches no test file with the Implementer's hands
- Decisions found:
  - [2026-05-18] Pillar 2 never commits — the reason the phase boundary is marked by a tree object rather than a commit, and the constraint the capture must not violate
  - [2026-08-28] Review agents never mutate the target working tree; `git stash` is removed from the allowlist — bounds how the boundary may be captured: `git add -A` followed by `git write-tree` writes to the index and the object store, never to tracked file contents
  - [2026-08-05] Five-state phase lifecycle, last two transitions owned by `/relay-execute` — the capture hangs off the same Phase A.6 close-out this command already owns
  - [2026-05-11] relay-worktree D1/D2 — the worktree is where the boundary is captured; its path and creation primitive are untouched here
  - PRP artifacts live under `PRPs/`, never under `.claude/` — `phase_diff_bases` is recorded in the existing `orchestrator-run.json`
- Applicable anti-patterns:
  - "Relying on interactive permission prompts in the autonomous loop" — `git add -A` and `git write-tree` are allowlisted index/object operations and prompt nothing
  - "Logic duplication across command files" — the base is recorded once by the orchestrator and consumed by the adopted command through its existing precondition chain, not re-derived
- Applicable architectural rules:
  - Three-pillar Pillar 2; no commit is introduced, and a tree object is not a commit
  - Writer/reviewer split — no agent gains new mutation authority
  - Interactivity boundary: the capture is deterministic and silent
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 2: "Per-phase diff base" — Goal: Give each phase a diff that contains only its own changes — and that contains its own changes at all. — Success signal: In a two-phase run, phase 2's review diff excludes phase 1's files, contains its own, and raises no R-S1/R-S2 scope failure; and a deliberately test-touching implementer diff is caught by R-X rather than passing on an empty set.

## Summary

Every phase of a multi-phase run shares one base commit, because Pillar 2 never commits and the worktree's `HEAD` never moves. Phase N's review therefore inherits phases 1..N-1's files and emits false scope failures. This phase gives each phase its own starting point: at the close-out of every phase, `/relay-execute` snapshots the worktree with `git add -A && git write-tree` and records the resulting tree object in `orchestrator-run.json` under `phase_diff_bases`; the next phase's adopted `/relay-implement` uses that tree as its base instead of deriving one via `merge-base`. A tree object is not a commit, so the Pillar 2 boundary is untouched.

## User Story

```
As a relay operator running a multi-phase feature in one worktree
I want each phase's code review to start from the previous phase's end state
So that phase 3 is judged on phase 3's work instead of on everything before it
```

## Problem Statement

`/relay-implement` P6 derives `base_commit = git merge-base HEAD <base_branch>`. In a feature worktree with no commits of its own, that resolves to the same commit for every phase of the run. Phase 2's code review therefore sees phase 1's files as well as its own, and the code-reviewer's R-S1 ("no files outside the plan") fails on files the plan legitimately never mentioned. Observed in a real end-to-end run on 2026-08-26, where two reviewers independently emitted false R-S1/R-S2 scope failures for exactly this reason.

## Solution Statement

Add a snapshot step to the orchestrator's per-phase close-out and a first priority to the implement command's base-derivation chain. The snapshot uses `git add -A && git write-tree`, which writes a tree object to the object store and updates the index without modifying any tracked file and without creating a commit. The recorded tree becomes the next phase's `base_commit`. The existing four-step `merge-base` chain is preserved unchanged as the fallback for the first phase of a run, for a hand-invoked `/relay-implement`, and for any invocation where no base was supplied.

## Metadata

| Key | Value |
|-----|-------|
| Type | Orchestrator state capture + precondition extension |
| Complexity | Low–Medium |
| Systems Affected | `plugins/relay/commands/relay-execute.md` (close-out capture + dispatch plumbing), `plugins/relay/commands/relay-implement.md` (P6 base override), `docs/context/architecture.md` (orchestrator state-machine documentation) |
| Dependencies | None — row 2 of the PRD, `Depends: -`. Independent of Phase 1; recorded `Parallel: yes` |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 2; AC-9; Phase 2 Details including the 2026-08-31 scope amendment |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** the deliverables are prompt-contract extensions to two commands plus a documentation subsection. Their in-phase validation is shell and node-builtins only — there is no runtime module in this phase to unit-test, so no test-framework invocation is the natural validation mechanism. Mirrors the sibling Phase 1 plan's `scaffold` choice.

> **Scope reduction (2026-08-31, operator-authorized).** This plan originally carried a second half: correcting the `git diff <base>..HEAD` form that left the code-reviewer's changed-file set empty. That half shipped separately as an isolated commit on `fix/code-reviewer-diff-base-form` (`03b6775`, branched from `development`), covering nine call sites across `code-reviewer.md` and `post-green-reviewer.md` plus the `diff-base-form` validate check. This plan is reduced to the phase-boundary half only. It deliberately does NOT touch `code-reviewer.md`, `post-green-reviewer.md` or `scripts/validate/index.mjs`, and does NOT create a `## Diff-base contract` section — all of which the separate commit already changed on another branch — so that this feature branch merges without avoidable conflict.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/commands/relay-execute.md` | 930-960 | `Step A.6.1 — Completion record`, the close-out the capture hangs off, and the `orchestrator-run.json` field set the new key joins |
| 1 | `plugins/relay/commands/relay-implement.md` | 256-274 | `P6 — Base-commit derivable`: the four-step priority chain the override becomes the new first step of |
| 2 | `plugins/relay/commands/relay-execute.md` | 194-230, 300-340 | Phase A.0 state initialisation and the Phase A.2.5 resume path, both of which must carry the new value without contradicting their own "skip Phase A.3" instructions |
| 2 | `plugins/relay/commands/relay-implement.md` | 14, 292 | The house `git diff <base-commit>` capture form and `files_changed_by_attempt`, the two existing consumers of `base_commit` that inherit the override for free |
| 3 | `docs/context/architecture.md` | Orchestrator state machine section | Where the phase-boundary rule is documented, chosen deliberately over a new top-level section to avoid colliding with the separately-shipped diff-base contract |
| 3 | `PRPs/prds/multi-repo-topology.prd.md` | AC-9, Phase 2 Details | The acceptance contract and the recorded scope amendment |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-implement.md:258-266
Detect the base branch in priority order:

1. If `$ARGUMENTS` contained `--base <branch>`, extract that value.
2. Otherwise, run `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`.
3. Fallback: `git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'`.
4. Last resort: `main`.
```

```
# SOURCE: plugins/relay/commands/relay-implement.md:14
Capture `git diff <base-commit>` to a per-attempt artifact after every attempt
regardless of verdict.
```

```
# SOURCE: plugins/relay/commands/relay-execute.md:194-199
### Phase A.0 — Initialise orchestrator state

Set the budget caps and counters:

- `max_plan_review_retries = 2` (0 forbidden; 3 total plan attempts including the initial)
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-execute.md` | UPDATE | Capture the phase-boundary tree at close-out, record it under `phase_diff_bases`, initialise the map in Phase A.0, and pass the previous phase's tree into the adopted `/relay-implement` protocol. |
| `plugins/relay/commands/relay-implement.md` | UPDATE | P6 accepts an orchestrator-supplied base as its new first priority, falling back to the existing chain unchanged. |
| `docs/context/architecture.md` | UPDATE | Document the phase-boundary rule inside the existing orchestrator state-machine section. |

## NOT Building (Scope Limits)

- **The diff-form correction and the `diff-base-form` check** — shipped separately as `03b6775` on `fix/code-reviewer-diff-base-form`. This plan must not duplicate it, and must not touch the files it changed.
- **Committing at the phase boundary** — the boundary is a tree object. The Pillar 2 no-commit invariant is preserved.
- **Per-repo diff bases in a workspace** — a phase targets one repo, and the `Repo` column does not exist until Phase 4; the capture here is per phase within one worktree.
- **Reconciling the two base-ref chains** (`relay-worktree` D11 versus `relay-pr` Step 2) — Phase 7.
- **Restoring a phase's base after a failed run** — re-invocation picks up at the next `pending` row and the recorded map is read fresh; no rollback of a recorded tree is attempted.
- **Test files** — this phase adds no runtime module, so it authors none; see Notes.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/commands/relay-execute.md — initialise and capture the phase-boundary tree

- **SATISFIES**: AC-A1, AC-A4 — the capture is what produces the per-phase base, its recorded location is what the next phase reads, and its soft-fail branch is what keeps a completed phase from being lost to a snapshot error.
- **ACTION**: In `### Phase A.0 — Initialise orchestrator state`, add `phase_diff_bases = {}` to the counter list, described as a map from phase number to that phase's end-state tree object. Then add a new step headed exactly `#### Step A.6.0.5 — Phase-boundary snapshot`, placed immediately before `#### Step A.6.1 — Completion record`, instructing: in the worktree, run `git add -A` then `git write-tree`; record the resulting object id in `phase_diff_bases` keyed by the current phase number. State explicitly that this writes a tree object to the object store and updates the index but modifies no tracked file and creates no commit, so it violates neither the Pillar 2 no-commit invariant nor the rule that review agents never mutate the working tree. State that the recorded tree is the NEXT phase's diff base, and that a consumer reads it with the single-argument form `git diff <tree>` — never a two-dot range, because `HEAD` is still the untouched base commit. Add `phase_diff_bases` to the `orchestrator-run.json` shape emitted by Step A.6.1. Make the step soft-fail: if `git write-tree` exits non-zero, warn, record no entry for that phase, and continue — the next phase then falls back to its own derivation.
- **MIRROR**: the counter-list shape from the `relay-execute.md:194-199` anchor; the soft-fail-and-continue discipline the command already applies to its row-status flips.
- **VALIDATE**: `e=plugins/relay/commands/relay-execute.md; if ! grep -q '^#### Step A.6.0.5 — Phase-boundary snapshot$' "$e"; then echo "FAIL: A.6.0.5 heading absent or not byte-exact"; exit 1; fi; if ! grep -q 'git write-tree' "$e"; then echo "FAIL: snapshot command not documented"; exit 1; fi; if [ "$(grep -c 'phase_diff_bases' "$e")" -lt 3 ]; then echo "FAIL: phase_diff_bases must appear in A.0 init, the capture step and the run.json shape"; exit 1; fi; if ! grep -q 'creates no commit' "$e"; then echo "FAIL: the no-commit justification is not stated"; exit 1; fi; echo "PASS: boundary snapshot wired"`

### Task 2: UPDATE plugins/relay/commands/relay-implement.md — base override as P6's first priority

- **SATISFIES**: AC-A2 — the override is what makes the recorded tree actually govern the next phase's diff.
- **ACTION**: In `### P6 — Base-commit derivable`, insert a new priority ahead of the existing numbered list: when the invoker supplied a diff base for this phase — the previous phase's recorded tree object — use it verbatim as `base_commit` and skip the base-branch detection and the `merge-base` call entirely. State that the supplied value may be a tree object rather than a commit, and that every existing consumer of `base_commit` (the per-attempt `git diff <base-commit>` capture and `files_changed_by_attempt`) already uses the single-argument form and therefore accepts a tree unchanged. Keep the existing four-step chain verbatim, introduced as the fallback that applies when no base was supplied.
- **MIRROR**: the priority-ordered detection prose from the `relay-implement.md:258-266` anchor; the single-argument capture form from the `relay-implement.md:14` anchor.
- **VALIDATE**: `i=plugins/relay/commands/relay-implement.md; if ! grep -q 'supplied a diff base' "$i"; then echo "FAIL: P6 does not accept an invoker-supplied base"; exit 1; fi; if ! grep -q 'tree object' "$i"; then echo "FAIL: P6 does not state the base may be a tree object"; exit 1; fi; if ! grep -q 'git merge-base HEAD <base_branch>' "$i"; then echo "FAIL: the existing fallback chain was removed rather than preserved"; exit 1; fi; echo "PASS: P6 override wired with the fallback intact"`

### Task 3: UPDATE plugins/relay/commands/relay-execute.md — pass the recorded base into the adopted protocol

- **SATISFIES**: AC-A2, AC-A3 — a recorded base that is never handed to the consumer changes nothing; this is the plumbing between Task 1 and Task 2.
- **ACTION**: In `#### Step A.4.1 — Adopt /relay-implement role`, add an execution-context bullet stating that when `phase_diff_bases` holds an entry for the highest-numbered phase completed before this one, that tree object is passed to the adopted protocol as its supplied diff base, and that when the map is empty — the first phase of a run — nothing is passed and P6's own chain applies unchanged. Add the same bullet, worded identically, to the Phase A.2.5 resume branch's enumerated value list, so a resumed phase does not silently lose the base its original session recorded.
- **MIRROR**: the execution-context bullet-list idiom already used by Step A.3.1's `/relay-plan` adoption (`prd_path`, `target_root`, `prior_feedback`).
- **VALIDATE**: `e=plugins/relay/commands/relay-execute.md; n=$(grep -c 'supplied diff base' "$e"); if [ "$n" -lt 2 ]; then echo "FAIL: the supplied-base bullet must appear in both the A.4.1 dispatch and the A.2.5 resume list (found $n)"; exit 1; fi; if ! grep -q 'first phase of a run' "$e"; then echo "FAIL: the empty-map first-phase case is not documented"; exit 1; fi; echo "PASS: base threaded into both dispatch paths"`

### Task 4: UPDATE docs/context/architecture.md — document the phase-boundary rule

- **SATISFIES**: AC-A3 — the rule is a cross-cutting orchestrator invariant and belongs with the state machine it extends.
- **ACTION**: Inside the existing `## Orchestrator state machine` section, add a subsection headed exactly `### Per-phase diff base` stating: every phase of a multi-phase run shares one base commit because Pillar 2 never commits and the worktree's `HEAD` never moves, so without intervention phase N's review inherits phases 1..N-1's files and emits false scope failures; that `/relay-execute` therefore snapshots the worktree at each phase close-out with `git add -A && git write-tree` and records the tree under `phase_diff_bases` in `orchestrator-run.json`; that a tree object is not a commit, so the no-commit invariant holds; and that the next phase's `/relay-implement` uses that tree as `base_commit` in place of its `merge-base` derivation, falling back to that derivation for the first phase of a run. Do NOT create a new top-level section — the diff-base form contract is documented separately on another branch and a second top-level section would collide at merge.
- **MIRROR**: the existing subsection shape inside `docs/context/architecture.md`'s own `## Orchestrator state machine` section.
- **VALIDATE**: `a=docs/context/architecture.md; if ! grep -q '^### Per-phase diff base$' "$a"; then echo "FAIL: subsection missing from $a"; exit 1; fi; if grep -q '^## Diff-base contract$' "$a"; then echo "FAIL: must not create the top-level section that ships on the other branch"; exit 1; fi; if ! grep -q 'phase_diff_bases' "$a"; then echo "FAIL: documentation does not name the recorded key"; exit 1; fi; out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out" | grep -A3 '^\[FAIL\]'; exit 1; }; echo "PASS: phase-boundary rule documented"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
node -e "const fs=require('fs');for(const p of ['plugins/relay/commands/relay-execute.md','plugins/relay/commands/relay-implement.md','docs/context/architecture.md']){const t=fs.readFileSync(p,'utf8');if(!t.trim()){console.error('FAIL: empty file '+p);process.exit(1)}const f=(t.match(/^\x60\x60\x60/gm)||[]).length;if(f%2!==0){console.error('FAIL: unbalanced fenced block in '+p);process.exit(1)}}console.log('PASS: all three files non-empty with balanced fences')"
```

The deliverables are markdown, so the static gate is structural: non-empty, and every fenced block closed. An unbalanced fence silently swallows the rest of a prompt file. Exits non-zero on violation.

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
e=plugins/relay/commands/relay-execute.md
i=plugins/relay/commands/relay-implement.md
a=docs/context/architecture.md
if ! grep -q '^#### Step A.6.0.5 — Phase-boundary snapshot$' "$e"; then echo "FAIL: A.6.0.5 heading absent"; exit 1; fi
if ! grep -q 'git write-tree' "$e"; then echo "FAIL: snapshot command absent"; exit 1; fi
if [ "$(grep -c 'phase_diff_bases' "$e")" -lt 3 ]; then echo "FAIL: phase_diff_bases underused in the orchestrator"; exit 1; fi
if [ "$(grep -c 'supplied diff base' "$e")" -lt 2 ]; then echo "FAIL: supplied-base bullet missing from a dispatch path"; exit 1; fi
if ! grep -q 'supplied a diff base' "$i"; then echo "FAIL: P6 override absent"; exit 1; fi
if ! grep -q 'git merge-base HEAD <base_branch>' "$i"; then echo "FAIL: P6 fallback chain was removed"; exit 1; fi
if ! grep -q '^### Per-phase diff base$' "$a"; then echo "FAIL: architecture subsection absent"; exit 1; fi
if grep -q '^## Diff-base contract$' "$a"; then echo "FAIL: collides with the separately-shipped section"; exit 1; fi
echo "PASS: content invariants hold"
```

Every branch exits non-zero on violation. Every pattern is a literal this plan itself instructs be authored, copied byte-for-byte from the corresponding `**ACTION**` prose.

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '17 passed, 0 failed (17 checks run)' || { echo "FAIL: expected 17 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }
git add -A || { echo "FAIL: git add -A failed"; exit 1; }
tmp="$(git write-tree)" || { echo "FAIL: git write-tree did not produce a tree object"; exit 1; }
git cat-file -t "$tmp" | grep -qx tree || { echo "FAIL: the captured object is not a tree"; exit 1; }
git diff --quiet "$tmp" || { echo "FAIL: git diff <tree> did not accept a tree object as a base"; exit 1; }
echo "PASS: suite green and the boundary-capture mechanism works end to end"
```

`npm run validate` sets `process.exitCode = 1` on any failing check. The count is 17 because Phase 1 registered the seventeenth on this branch; the eighteenth (`diff-base-form`) ships on a separate branch and is deliberately absent here. The last three commands exercise the actual mechanism the prose describes — that `git write-tree` yields a real tree object and that `git diff` accepts one as a base — rather than asserting that the prose was written.

## Acceptance Criteria

- **AC-A1 (PRD AC-9):** Given a phase that has just reached its close-out in `/relay-execute`, when Step A.6.0.5 runs, then `git add -A && git write-tree` produces a tree object, that object id is recorded in `orchestrator-run.json` under `phase_diff_bases` keyed by the phase number, no commit is created, and no tracked file's content is modified.
- **AC-A2 (PRD AC-9):** Given a `phase_diff_bases` entry for the previously completed phase, when the next phase's adopted `/relay-implement` runs P6, then it uses that tree object verbatim as `base_commit` and performs no `merge-base` call; and given an empty map — the first phase of a run — then P6's existing four-step chain applies with its behavior unchanged.
- **AC-A3 (PRD AC-9):** Given a two-phase run in one worktree where phase 1 modified file A and phase 2 modified file B, when phase 2's code review computes `git diff <base>` against its supplied tree, then the result contains B and does not contain A.
- **AC-A4 (PRD AC-9):** Given `git write-tree` exiting non-zero at a phase boundary, when Step A.6.0.5 runs, then the orchestrator warns, records no entry for that phase, and continues — the next phase falling back to its own derivation — rather than halting a phase whose work is complete.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `git add -A` at the boundary stages files a later phase did not intend to include | L | M | Staging is not committing, and Pillar 3 runs its own `git add -A` before committing. The index is a scratch surface here; no tracked file content is modified, per the 2026-08-28 rule |
| A tree object is passed where a consumer uses a two-dot range and silently yields an empty diff | M | H | The consuming form is stated in both the capture step and the P6 override, and the `diff-base-form` check shipped on the sibling branch fails on any two-dot reintroduction once the branches meet |
| The resume path (Phase A.2.5) loses the recorded base and silently reverts to `merge-base` | M | M | Task 3 adds the bullet to the resume branch's own value list, and Level 2 asserts the bullet appears at least twice |
| This branch and `fix/code-reviewer-diff-base-form` conflict at merge | M | L | Expected and mechanical: both raise the check count in `CLAUDE.md` and both insert a section into `docs/context/architecture.md`. This plan touches neither `scripts/validate/index.mjs` nor the fixed agent files, and deliberately uses a subsection inside an existing section rather than a colliding top-level heading, so the conflict surface stays confined to Phase 1's changes |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task above and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework. This phase adds no runtime module, so the pair may legitimately conclude `EXISTING_COVERAGE_SUFFICIENT`.

**Why a tree and not a commit.** A commit at the phase boundary would be the obvious mechanism and is forbidden: `docs/decisions.md` 2026-05-18 makes "Pillar 2 never commits" a permanent architectural boundary, and Pillar 3 owns every commit. `git write-tree` gives the boundary exactly what it needs — an immutable, addressable snapshot usable as a diff base — while writing only to the object store and the index.

**Provenance of the reduction.** This plan originally carried the diff-form correction as well. That half shipped as an isolated commit (`03b6775`) on its own branch after it turned out to affect nine call sites across two agents and to have made four separate guards vacuous, which warranted landing independently rather than behind seven phases of this PRD. The source PRD's Phase 2 Details records the original amendment; this plan's Metadata records the reduction.

*Generated: 2026-08-31*
*Approved: 2026-08-31*
*Status: IMPLEMENTED*
