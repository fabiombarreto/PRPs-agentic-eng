# Feature: Per-repo context resolution (Phase 6 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: moves the Decision Gate source check and the methodology read from a single session-level root to the phase's own member; makes TDD routing a per-phase decision; touches two commands' preconditions and three per-phase re-read sites
- Decisions found:
  - [2026-04-19] Methodology declaration — `tdd`, `test_frameworks` and the other keys are read from a declaration, never inferred. This phase changes only WHICH file is read, never how a value is obtained
  - Phase 1 of this feature — `context_root` is the root a member's `CLAUDE.md` and `docs/` live under, and it is not always the member's git root
  - Phase 4 of this feature — the `Repo` cell that names which member a phase belongs to, and therefore which context governs it
  - [2026-08-05] Five-state phase lifecycle — untouched; this phase changes reads, not transitions
  - PRP artifacts live under `PRPs/`, never under `.claude/` — the artifact plane stays single and at `project_root`
- Applicable anti-patterns:
  - "Activating the test pair by heuristic" — the pair's activation stays a declared-framework gate; this phase only resolves WHERE the declaration is read from
  - "Logic duplication across command files" — the resolution rule is stated once in the contract and referenced by the commands
- Applicable architectural rules:
  - Graceful degradation: with no topology declared, every read resolves at `target_root` exactly as before
  - Interactivity boundary: resolution is deterministic and silent
  - Three-pillar Pillar 2; nothing is committed
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 6: "Per-repo context resolution" — Goal: Read each phase's governing context from its own repository. — Success signal: A run whose two phases target a `tdd: true` member and a `tdd: false` member routes each correctly.

## Summary

Relay reads the Decision Gate sources and `docs/context/methodology.md` from one root, once per session. In a workspace those files live in each member, and they disagree: across the six initialized `super-ensino` repositories, jest, vitest and pytest coexist, `tdd` differs, and `figma_track: true` holds in exactly one. A single session-level read cannot represent that. This phase resolves both from the phase's own member `context_root`: the Decision Gate check becomes per participating member, the methodology read becomes per phase, and the TDD routing note is emitted per phase rather than once at startup. With no topology declared, every read resolves at `target_root` exactly as it does today.

## User Story

```
As a relay operator running one feature across a Django backend and a React frontend
I want each phase to be governed by its own repository's methodology and decisions
So that a pytest phase is not routed by the vitest repo's declaration
```

## Problem Statement

`/relay-execute` P4 requires the three Decision Gate sources at `target_root`, and P5 reads `methodology.md` there once, emitting a single TDD routing note for the whole run. Three later sites re-read the same path per phase, but always the same path. In a workspace `target_root` is the artifact plane, which has no `methodology.md` of its own — and even if it did, one file cannot express that `spe-services` is pytest/`tdd: true` while `portal` is vitest/`tdd: false`. The routing decision would be made once, from the wrong file, for every phase.

## Solution Statement

Make the read root a function of the phase rather than of the session. When a topology is declared, the Decision Gate sources are checked in each participating member's `context_root`, and every `methodology.md` read — the initial routing note and the three per-phase re-reads — resolves against the `context_root` of the member the phase's `Repo` cell names. The routing note moves from P5 to the phase iteration, because with divergent declarations there is no single note to emit at startup. When no topology is declared, `context_root` is `target_root` for every read, so behavior is unchanged.

## Metadata

| Key | Value |
|-----|-------|
| Type | Read-root resolution across preconditions and per-phase sites |
| Complexity | Medium |
| Systems Affected | `plugins/relay/commands/relay-execute.md`, `plugins/relay/commands/relay-plan.md`, `plugins/relay/resources/repository-topology.md`, `docs/context/architecture.md` |
| Dependencies | Phase 1 (`complete`) — `context_root`; Phase 4 (`complete`) — the `Repo` cell naming the member |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 6; AC-1, AC-3; Phase 6 Details |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** the deliverables are prompt-contract changes to two commands plus two documentation updates. In-phase validation is grep against real declarations — including the measured divergence across `super-ensino`'s members — with no runtime module to unit-test. Mirrors the sibling phases.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/commands/relay-execute.md` | 145-190 | P4's `target_root` source check and P5's single methodology read plus its routing note — the two session-level reads that become per-phase |
| 1 | `plugins/relay/commands/relay-execute.md` | 537, 757, 826 | The three per-phase re-read sites that already re-read for freshness but always from the same path |
| 1 | `plugins/relay/resources/repository-topology.md` | three roots, resolution protocol | `context_root`'s definition and the resolved member shape the read root comes from |
| 2 | `plugins/relay/commands/relay-plan.md` | 165-175 | P3's identical `target_root` source check, which the plan-writer runs once per phase |
| 3 | `docs/context/architecture.md` | Orchestrator state machine | Where the resolution rule is documented, alongside the sibling subsections |
| 3 | `PRPs/prds/multi-repo-topology.prd.md` | AC-1, AC-3, Evidence | The acceptance contract and the measured methodology divergence that motivates the change |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-execute.md:145-147
All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
```

```
# SOURCE: plugins/relay/commands/relay-execute.md:826
Re-read `<target_root>/docs/context/methodology.md` (already read in P5 — re-read here protects against mid-flow mutations).
```

```
# SOURCE: plugins/relay/resources/repository-topology.md (three roots)
| `context_root` | A member's relay context: its `CLAUDE.md`, `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`, `docs/context/methodology.md`. | one per member |
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-execute.md` | UPDATE | P4 checks sources per participating member; P5's single routing note becomes per-phase; the three per-phase re-reads resolve from the phase's `context_root`. |
| `plugins/relay/commands/relay-plan.md` | UPDATE | P3's identical source check resolves from the phase's member, since the plan-writer runs once per phase. |
| `plugins/relay/resources/repository-topology.md` | UPDATE | State that `context_root` is the read root for the Decision Gate sources and `methodology.md`, so the rule lives with the roots it uses. |
| `docs/context/architecture.md` | UPDATE | Document per-repo context resolution alongside the sibling subsections. |

## NOT Building (Scope Limits)

- **Per-repo reads in agents that are not orchestrated per phase** — `prd-reviewer`, `code-reviewer`, `docs-updater`, `relay-approve`, `relay-design-*` also read `methodology.md`. They run at PRD scope, at review scope, or post-merge, where "which phase" is not defined. Generalizing them needs its own decision and is out of scope.
- **Merging a workspace-level context with a member's** — a member's own `docs/` wins outright; there is no inheritance or overlay. Whether a workspace root should contribute defaults is the PRD's Open Question #1 and stays open.
- **Requiring every member to be relay-initialized** — a member missing `methodology.md` is handled by the existing absent-file branches, not by a new precondition.
- **`PRPs/` per repo** — the artifact plane stays single and at `project_root`.
- **Test files** — routed through the test pair; see Notes.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/resources/repository-topology.md — name the read root

- **SATISFIES**: AC-A1 — the contract owns root semantics, so the rule that context is read from `context_root` belongs here before any consumer applies it.
- **ACTION**: Add a subsection headed exactly `## Where a member's context is read from` stating: the Decision Gate sources (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`) and `docs/context/methodology.md` are read from the member's `context_root`, never from `project_root`; a member's own declaration wins outright, with no inheritance from or overlay onto a workspace-level file; and when no topology is declared, `context_root` IS `project_root`, so every read resolves exactly where it did before. State the reason plainly: these declarations diverge irreconcilably between members — jest, vitest and pytest coexist in one measured workspace, `tdd` differs per member, and a single file cannot represent that.
- **MIRROR**: the three-roots table's own definition of `context_root` (the `repository-topology.md` three-roots anchor).
- **VALIDATE**: `f=plugins/relay/resources/repository-topology.md; if ! grep -q "^## Where a member's context is read from$" "$f"; then echo "FAIL: subsection absent or not byte-exact"; exit 1; fi; if ! grep -q 'no inheritance' "$f"; then echo "FAIL: the no-overlay rule is not stated"; exit 1; fi; if ! grep -q 'context_root IS' "$f"; then echo "FAIL: the single-repo collapse is not stated"; exit 1; fi; echo "PASS: read root named"`

### Task 2: UPDATE plugins/relay/commands/relay-execute.md — P4 checks sources per member

- **SATISFIES**: AC-A2 — a workspace's artifact root has no `docs/decisions.md`, so a check pinned to it fails on every workspace before any phase runs.
- **ACTION**: Rewrite P4 so its root depends on the topology. When `topology = null`, the check is unchanged: all three files must exist and be readable at `target_root`, with the existing byte-exact HALT message intact. When a topology is declared, the same three files must exist and be readable in the `context_root` of every `editable` member, and the HALT names the member alongside the missing path. Keep the HALT's existing shape and wording for the single-repo branch so no existing project sees a different message.
- **MIRROR**: the `target_root` source-check prose from the `relay-execute.md:145-147` anchor, preserved verbatim as the no-topology branch.
- **VALIDATE**: `e=plugins/relay/commands/relay-execute.md; if ! grep -q 'All three files must exist and be readable at `target_root`' "$e"; then echo "FAIL: the single-repo branch wording was not preserved"; exit 1; fi; if ! grep -q 'context_root` of every `editable` member' "$e"; then echo "FAIL: the per-member branch is absent"; exit 1; fi; echo "PASS: P4 is topology-aware"`

### Task 3: UPDATE plugins/relay/commands/relay-execute.md — methodology read and routing note become per-phase

- **SATISFIES**: AC-A3, AC-A4 — the routing decision and the three per-phase re-reads are what actually differ between members.
- **ACTION**: In P5, add a branch: when a topology is declared, P5 does NOT read a single `methodology.md` and does NOT emit one routing note — it states that routing is resolved per phase, from each phase's own member, and defers. The `topology = null` path keeps its existing single read and its byte-exact routing notes unchanged. Then, at each of the three per-phase re-read sites, change the path to `<context_root of the phase's member>/docs/context/methodology.md`, adding one sentence at the first of them stating that the member is the one the phase's `Repo` cell names, and that with no topology (or an empty `Repo` cell) the `context_root` is `target_root`, making the read identical to today. Where the routing note was previously emitted once, emit it per phase at the first per-phase read, using the same byte-exact strings.
- **MIRROR**: the re-read-for-freshness prose from the `relay-execute.md:826` anchor.
- **VALIDATE**: `e=plugins/relay/commands/relay-execute.md; n=$(grep -c 'context_root of the phase' "$e"); if [ "$n" -lt 3 ]; then echo "FAIL: only $n of the 3 per-phase re-read sites resolve from the phase member"; exit 1; fi; if ! grep -q 'resolved per phase' "$e"; then echo "FAIL: P5 does not defer routing to the phase"; exit 1; fi; if ! grep -q 'Test-authoring routing: tdd: false with a declared framework' "$e"; then echo "FAIL: the byte-exact routing note text was lost"; exit 1; fi; echo "PASS: methodology reads and routing are per-phase"`

### Task 4: UPDATE plugins/relay/commands/relay-plan.md — P3 resolves per member

- **SATISFIES**: AC-A2 — the plan-writer runs once per phase, so its Decision Gate check must resolve against that phase's member for the same reason P4 does.
- **ACTION**: Rewrite P3's root the same way as P4: unchanged at `target_root` when no topology is declared, and resolved from the phase's member `context_root` when one is. Preserve the existing HALT wording verbatim on the no-topology branch.
- **MIRROR**: Task 2's own P4 treatment, so the two preconditions stay worded alike.
- **VALIDATE**: `p=plugins/relay/commands/relay-plan.md; if ! grep -q 'All three files must exist and be readable at `target_root`' "$p"; then echo "FAIL: the single-repo branch wording was not preserved"; exit 1; fi; if ! grep -q 'context_root' "$p"; then echo "FAIL: P3 does not resolve from a member context root"; exit 1; fi; echo "PASS: P3 is topology-aware"`

### Task 5: UPDATE docs/context/architecture.md — document per-repo context resolution

- **SATISFIES**: AC-A1, AC-A3 — the rule is cross-cutting and belongs with the state machine subsections its siblings occupy.
- **ACTION**: Add a subsection headed exactly `### Per-repo context resolution` inside the existing `## Orchestrator state machine` section, stating: a phase's governing context comes from its own member — the Decision Gate sources and `methodology.md` are read from that member's `context_root`, never from the artifact root; TDD routing is therefore a per-phase decision, and a single run can legitimately route one phase test-first and another test-after; a member's declaration wins outright with no inheritance; and with no topology declared every read resolves at the project root exactly as before. Name the measured divergence as the reason.
- **MIRROR**: the sibling subsections `### Per-phase diff base`, `### Worktree setup`, `### The Repo column` and `### Per-repo worktrees and the base preflight`.
- **VALIDATE**: `a=docs/context/architecture.md; if ! grep -q '^### Per-repo context resolution$' "$a"; then echo "FAIL: subsection absent"; exit 1; fi; if ! grep -q 'per-phase decision' "$a"; then echo "FAIL: per-phase TDD routing is not documented"; exit 1; fi; if ! grep -q 'context_root' "$a"; then echo "FAIL: the read root is not named"; exit 1; fi; echo "PASS: per-repo context documented"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
node -e "const fs=require('fs');for(const p of ['plugins/relay/commands/relay-execute.md','plugins/relay/commands/relay-plan.md','plugins/relay/resources/repository-topology.md','docs/context/architecture.md']){const t=fs.readFileSync(p,'utf8');if(!t.trim()){console.error('FAIL: empty '+p);process.exit(1)}if((t.match(/^\x60\x60\x60/gm)||[]).length%2!==0){console.error('FAIL: unbalanced fences in '+p);process.exit(1)}}console.log('PASS: markdown fences balanced')"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
e=plugins/relay/commands/relay-execute.md
p=plugins/relay/commands/relay-plan.md
f=plugins/relay/resources/repository-topology.md
a=docs/context/architecture.md
if ! grep -q "^## Where a member's context is read from$" "$f"; then echo "FAIL: contract subsection absent"; exit 1; fi
if ! grep -q 'context_root` of every `editable` member' "$e"; then echo "FAIL: P4 per-member branch absent"; exit 1; fi
if [ "$(grep -c 'context_root of the phase' "$e")" -lt 3 ]; then echo "FAIL: not all three per-phase re-reads resolve per member"; exit 1; fi
if ! grep -q 'Test-authoring routing: tdd: false with a declared framework' "$e"; then echo "FAIL: byte-exact routing note lost"; exit 1; fi
if ! grep -q 'All three files must exist and be readable at `target_root`' "$e"; then echo "FAIL: single-repo P4 wording lost"; exit 1; fi
if ! grep -q 'All three files must exist and be readable at `target_root`' "$p"; then echo "FAIL: single-repo P3 wording lost"; exit 1; fi
if ! grep -q '^### Per-repo context resolution$' "$a"; then echo "FAIL: architecture subsection absent"; exit 1; fi
echo "PASS: content invariants hold"
```

Every branch exits non-zero on violation. The two positive-presence assertions on the `target_root` wording are the graceful-degradation guards: they fail if the single-repo path was rewritten instead of preserved.

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '17 passed, 0 failed (17 checks run)' || { echo "FAIL: expected 17 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }
node --test "scripts/**/*.test.mjs" 2>&1 | tail -20 | grep -q 'fail 0' || { echo "FAIL: corpus not green"; exit 1; }
grep -q '^tdd: false$' docs/context/methodology.md || { echo "FAIL: this repo's own declaration is not the tdd: false the routing note quotes"; exit 1; }
echo "PASS: suite and corpus green, and this repo's own declaration matches the note it emits"
```

The last assertion ties the emitted routing note to a real declaration on disk rather than to a remembered value.

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** Given the topology contract after this phase, when a consumer asks where a member's context lives, then the contract states it is read from that member's `context_root` with no inheritance from a workspace-level file, and that with no topology declared `context_root` is the project root.
- **AC-A2 (PRD AC-3):** Given a declared workspace, when `/relay-execute` P4 and `/relay-plan` P3 run, then the three Decision Gate sources are required in each `editable` member's `context_root` and a HALT names the member alongside the missing path; and given no topology, then both preconditions check `target_root` with their existing wording unchanged.
- **AC-A3 (PRD AC-3):** Given a run whose phase 1 targets a member declaring `tdd: true` with pytest and whose phase 2 targets a member declaring `tdd: false` with vitest, when each phase resolves its methodology, then phase 1 routes test-first and phase 2 routes test-after — one run, two routings.
- **AC-A4 (PRD AC-1):** Given a project with no topology declaration, when every methodology read and every Decision Gate check runs, then each resolves at `target_root` exactly as before this phase, and P5 emits its single byte-exact routing note as it does today.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| One of the three per-phase re-read sites is missed and silently keeps reading the artifact root | M | H | Task 3's VALIDATE and Level 2 both require the per-phase marker at all three sites, counted — a missed site fails the build |
| The byte-exact routing notes are paraphrased while being moved | M | M | Both Task 3's VALIDATE and Level 2 assert one of the notes verbatim; `plan-reviewer` R5 independently enforces byte-equality on the plan side |
| The single-repo branch is rewritten rather than preserved, breaking AC-1 | M | H | Level 2 carries positive-presence assertions on the original `target_root` wording in both commands |
| A member without `methodology.md` is treated as an error rather than an absent declaration | L | M | Out of scope by construction: the existing absent-file branches handle it, and this phase adds no new precondition for it |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task above and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.

**Why the routing note moves out of P5.** P5 emits one note describing the whole run's ordering. That is only meaningful when one declaration governs every phase. Measured across `super-ensino`'s six initialized members, `tdd` is `true` in three and `false` in three, and the frameworks are jest, vitest and pytest — so a single startup note would be wrong for at least half the phases. Emitting it per phase keeps the note's byte-exact text and its purpose while making it true.

**A member's declaration wins outright.** No overlay, no inheritance, no workspace-level default. An overlay would mean a phase's effective `tdd` value is not readable from any single file, which is precisely the ambiguity the declaration model exists to prevent. Whether a workspace root should contribute defaults at all is the source PRD's Open Question #1 and is deliberately still open.

*Generated: 2026-08-31*
*Approved: 2026-09-01*
*Status: IMPLEMENTED*
