# Feature: Per-lane worktree and branch (Phase 2 of parallel-phase-execution)

```
**Decision Gate**
- Active context: none
- Activated criteria: changes the worktree identity key, an infra contract 8 plugin files depend on; adds an invoker-supplied input to a shipped command; registers a new validation check
- Decisions found:
  - [2026-05-11] relay-worktree D1/D2/D4/D10 — the `.worktrees/` path convention, the `git worktree add` shell-out, `--porcelain` idempotency and the `feature/` branch prefix are all PRESERVED; only the slug inside them gains a lane dimension
  - [2026-09-01] The per-repo dimension shipped by `multi-repo-topology` (the optional `repo` input, supplied by an invoker and never by a CLI flag) — this phase adds the lane dimension the same way, and keeps the repo one
  - [2026-08-05] Plugin-owned resources live in `plugins/relay/resources/` — the identity rule extends the phase-1 lane contract rather than starting a second one
  - [2026-05-18] Pillar 2 never commits — creating a worktree and a branch is infra, not a commit
  - [2026-05-15] Runnable worktree environments — registered and BLOCKED; this phase gives a lane its own filesystem, and deliberately assumes nothing about running a server or a database inside it
- Applicable anti-patterns:
  - Writing pipeline artifacts under the agent config directory (docs/anti-patterns.md:61) — worktrees stay at `.worktrees/`, a sibling
  - Relying on interactive permission prompts in the autonomous loop (:80) — the lane input is invoker-supplied, adding no prompt and no flag
  - Weakening or deleting tests to make the loop turn green (:15) — the new check ships with its failing direction exercised
- Applicable architectural rules:
  - Graceful degradation: with no lane supplied the slug IS the feature name, so every existing path and branch form is byte-identical to today
  - Three-pillar Pillar 2; `PRPs/` artifact paths; writer/reviewer split
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/parallel-phase-execution.prd.md` — Implementation Phases row 2:
  "Per-lane worktree and branch" — Goal: Stop two concurrent phases from sharing
  a working tree and a git index. — Success signal: Two lanes in the same
  repository have distinct worktrees and branches, and neither one's
  `git add -A` stages the other's files.

## Summary

Two phases running at once in one worktree share a working tree AND a git index,
so the phase-boundary `git add -A` shipped by `multi-repo-topology` would stage a
concurrent lane's in-flight edits into the wrong diff base. This phase gives each
lane its own filesystem by extending the worktree identity key with a lane
dimension. Rather than rewriting the 96 `.worktrees/` literals spread across
eight plugin files, it introduces one derived value — `<worktree_slug>` — that
those literals already-shaped forms consume: the slug is the feature name when no
lane is supplied, and `<feature>-lane-<k>` when one is. The branch follows the
same slug, because git refuses to check one branch out in two worktrees, so lane
branches are forced rather than chosen. A new validation check holds the path
slug and the branch slug to being the same token, which is the one-sided edit
that would silently put two lanes back on one branch.

## User Story

As the relay orchestrator about to run two independent phases at the same time,
I want each lane to own a distinct worktree and a distinct branch,
So that neither lane's staging operation can capture the other's uncommitted work.

## Problem Statement

`/relay-worktree`'s idempotency key is `.worktrees/<feature>/` — the feature name
and nothing else. Two phases targeting the same repository therefore resolve to
one worktree, one branch and one git index. The per-repo worktrees shipped by
`multi-repo-topology` added a member dimension, not a phase one, so the collision
survives that feature untouched. The concrete corruption path is documented in
the source PRD's Evidence section: `relay-execute.md` runs `git add -A` then
`git write-tree` at every phase close-out, and under concurrency that stages a
second phase's in-flight edits into the first phase's recorded diff base.

## Solution Statement

Introduce `<worktree_slug>` as the single derived identity value, and accept an
optional `lane` input the same way `multi-repo-topology` accepted `repo`:
supplied by an invoker, never by a CLI flag, absent for every standalone
invocation. With no lane, the slug is exactly `<feature>` and every path,
branch, precondition and message keeps today's shape byte-for-byte. With a lane,
the slug is `<feature>-lane-<k>`, which flows unchanged through D1's path
convention, D4's `--porcelain` idempotency key and D10's `feature/` prefix
because all three consume the slug rather than the feature name. Guard the one
edit that would break the guarantee — changing the path slug without changing the
branch slug — with a check that compares the two tokens in the creation command.

## Metadata

| Field | Value |
|-------|-------|
| Type | feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/resources/lane-model.md`, `plugins/relay/commands/relay-worktree.md`, `scripts/validate/` |
| Dependencies | Phase 1 (lane model) — `complete` |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/parallel-phase-execution.prd.md:187` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-worktree.md` | 100-260 | Parse arguments (where the optional `repo` input is documented, and where `lane` joins it), P1-P4 preconditions, and Phase A.1's creation command — the three places the slug is consumed. |
| P0 | `plugins/relay/resources/lane-model.md` | 1-160 | The phase-1 contract this extends. Its named-code registry and compatibility clause are the shapes the new section must sit beside without disturbing. |
| P0 | `scripts/validate/checks/lane-contract.mjs` | 1-206 | The check pattern established in phase 1: pure `check<Name>({inputs})` plus a thin `run<Name>Check()`, injected inputs, a missing input returned as a loud finding. |
| P1 | `plugins/relay/resources/repository-topology.md` | 1-60 | How the `repo` dimension was introduced as an invoker-supplied input — the precedent `lane` follows exactly. |
| P1 | `scripts/validate/index.mjs` | 19-70 | The two-line registration contract: one import, one `CHECKS` array entry. |
| P1 | `PRPs/prds/parallel-phase-execution.prd.md` | 76-99 | AC-4 verbatim — distinct worktrees, distinct branches, and neither lane's `git add -A` staging the other's files. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-worktree.md:113-118
**An optional `repo` input (supplied by an invoker, never by a CLI flag).** When
an invoker — `/relay-execute`'s per-phase worktree sub-flow — supplies a `repo`
context, it carries that member's resolved topology entry: `repo`, absolute
`repo_root`, `role`, and the resolved base. In that case `repo_root` comes from
the entry and P1's `git rev-parse --show-toplevel` is SKIPPED; the worktree is
created in that member's repository rather than in the cwd's.
```
Task 2 copies this paragraph's exact shape for the `lane` input: an
invoker-supplied optional value, a statement of what it carries, and — critically
— the follow-on sentence stating what happens when it is absent, which is what
makes the no-change guarantee legible rather than implied.

```
# SOURCE: plugins/relay/commands/relay-worktree.md:219
git -C <repo_root> worktree add <repo_root>/.worktrees/<feature>/ -b feature/<feature> <resolved-base>
```
Task 1 mirrors this line as the concrete form its contract section describes,
and Task 3 rewrites it, along with its verbatim echo in the failure message at
line 231, to consume `<worktree_slug>` in BOTH positions. Task 4's check exists
precisely because these two positions can be edited independently: the path slug
and the branch slug appearing on one line is what makes the coupling checkable.

```
# SOURCE: scripts/validate/checks/lane-contract.mjs:96-118
export function checkLaneContract({ contract, consumers }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  if (!contract) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
```
Task 4 copies this signature and this discipline: a pure function over injected
inputs, and a missing or unreadable input returned as a loud finding rather than
thrown or silently passed.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/lane-model.md` | UPDATE | Add the worktree-identity rule to the contract that already owns lane semantics, rather than opening a second authority. |
| `plugins/relay/commands/relay-worktree.md` | UPDATE | Accept the optional `lane` input, derive `<worktree_slug>`, and consume it in the path, the branch, the idempotency key and the branch-conflict check. |
| `scripts/validate/checks/lane-worktree-parity.mjs` | CREATE | Hold the path slug and the branch slug in the creation command to being the same token — the one-sided edit that would silently return two lanes to one branch. |
| `scripts/validate/index.mjs` | UPDATE | Register the new check (one import, one `CHECKS` entry). |
| `CLAUDE.md` | UPDATE | The advertised check count moves 20 to 21. |

## NOT Building (Scope Limits)

- **Deriving which lane a phase belongs to, or passing lane context from the
  orchestrator.** Phase 5 owns dispatch; this phase builds the plumbing it will
  use. `/relay-execute` is not touched here.
- **Serialized state mutation.** Phase 3.
- **The runtime-safety gate and the concurrency cap.** Phase 4.
- **Integrating lane branches back into one branch per repository.** Phase 6.
- **Rewriting the 96 `.worktrees/` literals across the eight plugin files.** The
  slug is introduced at the point of derivation precisely so those forms keep
  working unchanged; a sweep would be a large diff with no behavioural gain.
- **Any change to `/relay-worktree`'s bootstrap contract (D9), its 60-second
  timeout, or its redaction policy.**

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/resources/lane-model.md`

**ACTION**: Add a section headed byte-exactly `## Worktree identity`, placed
after `## The `Parallel` column` and before `## Named-code registry` so the
registry stays the contract's last substantive section. It defines:
(a) `<worktree_slug>` — the value every worktree path and branch name is built
from. It is `<feature>` when no lane context is supplied, and
`<feature>-lane-<k>` when a lane is, where `k` is the lane's index in the derived
lane list. State plainly that with no lane the slug IS the feature name, so
`.worktrees/<worktree_slug>/` and `feature/<worktree_slug>` reduce to exactly the
forms that shipped before this contract existed.
(b) The path and branch are built from the SAME slug — `.worktrees/<worktree_slug>/`
on `feature/<worktree_slug>` — and must never diverge.
(c) Why the branch dimension is forced rather than chosen: git refuses to check
one branch out in two worktrees. Record the verbatim refusal observed on this
repository, `fatal: 'feature/parallel-phase-execution' is already checked out at`,
so a future reader can see the constraint is measured rather than assumed.
(d) That the lane dimension composes with, and does not replace, the per-repo
dimension: a lane's worktree lives at `<repo_root>/.worktrees/<worktree_slug>/`,
so a laned run in a declared workspace is still per-member.
Delivers **AC-A1**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-worktree.md:219`
**VALIDATE**:
```bash
set -euo pipefail
L=plugins/relay/resources/lane-model.md
grep -q '^## Worktree identity$' "$L"
grep -q 'worktree_slug' "$L"
grep -q 'already checked out at' "$L"
# The section must sit between the Parallel column and the registry.
for H in '^## The `Parallel` column$' '^## Worktree identity$' '^## Named-code registry$'; do
  C=$(grep -c "$H" "$L")
  if [ "$C" -ne 1 ]; then echo "FAIL: heading $H occurs $C times; expected exactly 1"; exit 1; fi
done
P=$(grep -n '^## The `Parallel` column$' "$L" | cut -d: -f1)
W=$(grep -n '^## Worktree identity$' "$L" | cut -d: -f1)
R=$(grep -n '^## Named-code registry$' "$L" | cut -d: -f1)
if [ "$P" -lt "$W" ] && [ "$W" -lt "$R" ]; then
  echo "PASS: Worktree identity sits between the Parallel column and the registry"
else
  echo "FAIL: section order is $P / $W / $R"; exit 1
fi
```

### Task 2: UPDATE `plugins/relay/commands/relay-worktree.md` — accept the `lane` input

**ACTION**: In `## Parse arguments`, immediately after the existing paragraph
beginning `**An optional `repo` input`, add a paragraph beginning byte-exactly
`**An optional `lane` input (supplied by an invoker, never by a CLI flag).**`
It states that when an invoker supplies a `lane` context it carries the lane's
index `k` and the lane's member rows; that `<worktree_slug>` is then
`<feature>-lane-<k>`; and that when no lane context is supplied — every
standalone invocation, and every serial orchestrator run — `<worktree_slug>` is
exactly `<feature>`, so every path, branch, precondition and message in this
command is byte-identical to today. It must name
`resources/lane-model.md` as the authority for the slug rule rather than
restating it. Do NOT add a CLI flag: the `--base` and `--bootstrap-timeout`
flag list is unchanged.
Delivers **AC-A2**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-worktree.md:113-118`
**VALIDATE**:
```bash
set -euo pipefail
W=plugins/relay/commands/relay-worktree.md
grep -q 'An optional `lane` input (supplied by an invoker, never by a CLI flag)' "$W"
grep -q 'resources/lane-model.md' "$W"
# The lane paragraph must follow the repo paragraph, not precede it.
Rp=$(grep -n 'An optional `repo` input' "$W" | head -1 | cut -d: -f1)
Lp=$(grep -n 'An optional `lane` input' "$W" | head -1 | cut -d: -f1)
if [ "$Rp" -lt "$Lp" ]; then
  echo "PASS: the lane input is documented after the repo input"
else
  echo "FAIL: lane paragraph at $Lp does not follow repo paragraph at $Rp"; exit 1
fi
# No CLI flag may have been introduced for it. The real flag list uses a plain
# backticked form (`--base <ref>`), not a bold one, so this greps the token
# itself rather than a shape it might not wear.
if grep -q -- '--lane' "$W"; then
  echo "FAIL: a --lane token appears; the input is invoker-supplied, never a CLI flag"; exit 1
else
  echo "PASS: no --lane CLI flag"
fi
```

### Task 3: UPDATE `plugins/relay/commands/relay-worktree.md` — consume the slug

**ACTION**: Replace `<feature>` with `<worktree_slug>` at the four places that
form the identity, leaving every other `<feature>` occurrence (the bootstrap-log
path under `PRPs/reports/<feature>/`, the slug-sanitization contract, the usage
examples) untouched:
1. P3's idempotency key — the absolute path matched against
   `git -C <repo_root> worktree list --porcelain`.
2. P4's branch-conflict check — `git branch --list feature/<worktree_slug>`.
3. Phase A.1's creation command at line 219.
4. The verbatim echo of that command inside the Phase A.1 failure message.
Both the path position and the branch position of the creation command must use
the slug; that coupling is what Task 4 checks.
Delivers **AC-A3**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-worktree.md:219`
**VALIDATE**:
```bash
set -euo pipefail
W=plugins/relay/commands/relay-worktree.md
# Both creation-command lines must now carry the slug in BOTH positions.
N=$(grep -c 'worktree add .*\.worktrees/<worktree_slug>/ -b feature/<worktree_slug>' "$W")
if [ "$N" -ne 2 ]; then
  echo "FAIL: expected 2 creation-command lines using <worktree_slug> in both positions, found $N"; exit 1
fi
# The old feature-keyed creation form must be gone.
if grep -q 'worktree add .*\.worktrees/<feature>/ -b feature/<feature>' "$W"; then
  echo "FAIL: a creation command still keys on <feature> rather than <worktree_slug>"; exit 1
fi
grep -q 'git branch --list feature/<worktree_slug>' "$W"
# The bootstrap-log path is feature-scoped, not lane-scoped, and must NOT have been swept.
grep -q 'PRPs/reports/<feature>/worktree-bootstrap.log' "$W"
echo "PASS: slug consumed at the identity sites, feature-scoped artifact path preserved"
```

### Task 4: CREATE `scripts/validate/checks/lane-worktree-parity.mjs`

**ACTION**: Author the check as a pure
`checkLaneWorktreeParity({ sources })` returning `{ name, ok, findings }`, plus a
thin `runLaneWorktreeParityCheck()` wrapper reading the real files. `sources`
maps file paths to text; a null value is a loud finding. For every line
containing both `worktree add` and `-b feature/`, extract the path slug (the
token between `.worktrees/` and the following `/`) and the branch slug (the token
after `-b feature/`), and emit a finding naming the file, the line and both
tokens when they differ. A file containing no such line is out of scope — scope
is self-selecting, as in `lane-contract`. Additionally emit a finding when the
scanned set yields ZERO creation-command lines overall, because a check whose
input has silently vanished is a check that passes by vacuity, which is the
failure mode this repository removed at nine sites. Candidate sources are
`plugins/relay/commands/relay-worktree.md` and
`plugins/relay/commands/relay-execute.md`.
Delivers **AC-A4**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-contract.mjs:96-118`
**VALIDATE**: the check is exercised in both directions, because a parity gate
that cannot fail is worth nothing:
```bash
set -euo pipefail
node --input-type=module -e '
import { checkLaneWorktreeParity } from "./scripts/validate/checks/lane-worktree-parity.mjs";
const OK = "git -C <repo_root> worktree add <repo_root>/.worktrees/<worktree_slug>/ -b feature/<worktree_slug> <base>";
const SKEW = "git -C <repo_root> worktree add <repo_root>/.worktrees/<worktree_slug>/ -b feature/<feature> <base>";
const good = checkLaneWorktreeParity({ sources: { "a.md": OK } });
if (!good.ok) { console.error("FAIL: matching slugs must pass: " + JSON.stringify(good.findings)); process.exit(1); }
const bad = checkLaneWorktreeParity({ sources: { "a.md": SKEW } });
if (bad.ok) { console.error("FAIL: a path/branch slug mismatch must be caught"); process.exit(1); }
const empty = checkLaneWorktreeParity({ sources: { "a.md": "no creation command here" } });
if (empty.ok) { console.error("FAIL: zero creation-command lines must be caught as vacuity"); process.exit(1); }
const unreadable = checkLaneWorktreeParity({ sources: { "a.md": null } });
if (unreadable.ok) { console.error("FAIL: an unreadable source must be caught"); process.exit(1); }
console.log("PASS: skew, vacuity and unreadable input all fail; matching slugs pass");
'
```

### Task 5: UPDATE `scripts/validate/index.mjs` and `CLAUDE.md`

**ACTION**: Add an import of `runLaneWorktreeParityCheck` from
`./checks/lane-worktree-parity.mjs` alongside the existing check imports, and
append `runLaneWorktreeParityCheck` to the `CHECKS` array. Then update
`CLAUDE.md` so its validation line reads `(21 static consistency checks; docs at
documentation/guide/validation-suite.html).`
Delivers **AC-A5**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-contract.mjs:96-118`
**VALIDATE**:
```bash
set -euo pipefail
OUT=$(npm run validate 2>&1)
printf '%s\n' "$OUT" | grep -q '^\[PASS\] lane-worktree-parity$'
ACTUAL=$(printf '%s\n' "$OUT" | grep -oE '[0-9]+ checks run' | grep -oE '[0-9]+')
ADVERTISED=$(grep -oE '[0-9]+ static consistency checks' CLAUDE.md | grep -oE '[0-9]+')
if [ "$ACTUAL" = "$ADVERTISED" ]; then
  echo "PASS: CLAUDE.md advertises $ADVERTISED checks and the suite runs $ACTUAL"
else
  echo "FAIL: CLAUDE.md advertises $ADVERTISED but the suite runs $ACTUAL"; exit 1
fi
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
set -euo pipefail
node --check scripts/validate/checks/lane-worktree-parity.mjs
node --check scripts/validate/index.mjs
npm run validate 2>&1 | grep -q '^\[PASS\] line-endings$'
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
# The no-lane guarantee must be stated, not merely implied: without it the
# whole AC-1 non-regression claim rests on nothing a reader can check.
grep -q 'worktree_slug' plugins/relay/resources/lane-model.md
grep -q 'worktree_slug' plugins/relay/commands/relay-worktree.md
# Phase 5 owns orchestrator wiring; this phase must not touch the loop.
if git status --porcelain -- plugins/relay/commands/relay-execute.md | grep -q .; then
  echo "FAIL: relay-execute.md is out of scope for phase 2"; exit 1
else
  echo "PASS: orchestrator loop untouched"
fi
# The phase-1 contract must still pass its own check after being extended.
npm run validate 2>&1 | grep -q '^\[PASS\] lane-contract$'
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
# The grep is what makes this level able to fail before the phase is done;
# bare `npm run validate` is green on the unmodified tree.
npm run validate 2>&1 | grep -q '^\[PASS\] lane-worktree-parity$'
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** `lane-model.md` carries a `## Worktree identity` section
  defining `<worktree_slug>` as `<feature>` with no lane and `<feature>-lane-<k>`
  with one, stating that path and branch are built from the same slug, and
  recording the observed git refusal that makes the branch dimension forced.
- **AC-A2 (PRD AC-4):** `relay-worktree.md` documents an optional `lane` input
  supplied by an invoker and never by a CLI flag, positioned after the `repo`
  input it mirrors, and no `--lane` flag exists.
- **AC-A3 (PRD AC-1, AC-4):** the idempotency key, the branch-conflict check and
  both creation-command lines consume `<worktree_slug>`; the feature-scoped
  bootstrap-log path is deliberately NOT swept, so artifacts stay per feature
  while worktrees become per lane.
- **AC-A4 (PRD AC-4):** `lane-worktree-parity.mjs` emits a finding when a
  creation command's path slug and branch slug differ, when the scanned set
  yields zero creation-command lines, and when a source is unreadable — and
  passes when the slugs match. All four are exercised by Task 4's VALIDATE.
- **AC-A5 (PRD AC-1):** `npm run validate` reports `[PASS] lane-worktree-parity`
  and the count it prints equals the count `CLAUDE.md` advertises.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A blanket sweep of `<feature>` to `<worktree_slug>` also renames the artifact paths, scattering `PRPs/reports/` across lanes | H | H | Task 3 enumerates the four identity sites explicitly and its VALIDATE asserts the bootstrap-log path still reads `PRPs/reports/<feature>/`, so an over-broad sweep fails the gate |
| The parity check passes vacuously if the creation-command lines are reworded out of pattern range | M | H | The check emits a finding when the scanned set yields ZERO matching lines, and Task 4's VALIDATE exercises that case directly |
| Changing the identity key breaks the 96 existing `.worktrees/` literals in eight files | M | H | The slug is introduced at the point of derivation, so those forms consume it unchanged; Level 3 runs the full suite and corpus, which is where a broken reference would surface |
| Lane worktrees multiply disk usage on a wide PRD | M | L | Out of scope here — the concurrency cap that bounds lanes in flight is phase 4, and it bounds this too |
| The lane dimension is defined but nothing supplies it until phase 5 | H | L | Deliberate, and exactly what `Depends: 2` on row 5 expresses. The parity check gives the coupling a consumer immediately rather than leaving it unguarded until dispatch exists |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file, so this plan's `**VALIDATE**` commands exercise the
  change directly rather than invoking the test framework.
- **Grounding method.** Phase 2 GROUNDING was performed inline with `Grep`/`Read`
  rather than by dispatching the research subagents, per the standing operator
  instruction in this session not to dispatch subagents unless requested. Every
  `# SOURCE:` anchor is a verified `file:line`. Web research was not performed —
  the phase is internal to relay's own infra contract.
- **The git constraint was measured, not assumed.** Attempting a second worktree
  on an already-checked-out branch in this repository returned
  `fatal: 'feature/parallel-phase-execution' is already checked out at
  'C:/repos/PRPs-agentic-eng/.worktrees/parallel-phase-execution'`. That is why
  the branch dimension follows necessarily from the worktree dimension rather
  than being a design preference.
- **Why a derived slug instead of a sweep.** `.worktrees/` appears 96 times
  across eight plugin files. Rewriting each to carry a lane dimension would be a
  large diff whose every line is a chance to desynchronise the path from the
  branch. Introducing the slug where identity is derived leaves those forms
  correct by construction, and reduces the guarded surface to the two lines where
  path and branch appear together.

*Generated: 2026-09-02*
*Approved: 2026-09-02*
*Implemented: 2026-09-02*
*Status: IMPLEMENTED*
