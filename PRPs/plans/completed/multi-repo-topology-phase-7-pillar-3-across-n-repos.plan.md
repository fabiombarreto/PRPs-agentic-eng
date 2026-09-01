# Feature: Pillar 3 across N repos (Phase 7 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: generalizes the three Pillar 3 commands from one worktree to N; makes `/relay-pr` consume the base `/relay-worktree` recorded and drop a heuristic tier; migrates the 21 remaining bare `.worktrees/` git invocations; adds the validate check that pins the migration
- Decisions found:
  - [2026-05-18] Pillar 2 never commits — Pillar 3 owns every commit, which is why lane integration belongs here and not in the orchestration loop
  - [2026-05-11] relay-worktree D1/D10 — `.worktrees/<feature>/` and the `feature/` branch prefix are preserved per member; only the root they hang off becomes explicit
  - Phase 5 of this feature — `PRPs/reports/<feature>/worktree-bases.json`, the recorded resolved base this phase consumes
  - [2026-08-05] Five-state phase lifecycle — `/relay-approve` never touches the Implementation Phases table, and this phase does not change that
  - PRP artifacts live under `PRPs/`, never under `.claude/` — the per-repo outcome record joins the existing report directory
- Applicable anti-patterns:
  - "Relying on interactive permission prompts in the autonomous loop" — the repo-qualified `git -C` forms must be in the allowlist, which Phase 5 already extended
  - "Logic duplication across command files" — the per-member iteration is described once per command against the shared topology contract, not re-derived
  - "Weakening or deleting tests to make the auto-correction loop turn green" — the new check ships with tests that prove it FIRES, not only that it passes
- Applicable architectural rules:
  - Three-pillar Pillar 3 (Delivery); each command stays explicitly triggered and deterministic
  - Graceful degradation: with no topology declared, all three commands behave exactly as today against one worktree
  - Writer/reviewer split — `/relay-commit` and `/relay-pr` stay infra-class; `/relay-approve` keeps its docs pair unchanged
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 7: "Pillar 3 across N repos" — Goal: Ship a cross-repo feature. — Success signal: A two-repo feature produces two PRs whose bases match their creation bases, both merge, and both worktrees and branches are cleaned up.

## Summary

Pillar 2 now isolates work per repository; Pillar 3 still assumes exactly one worktree, one branch, one PR and one ordered cleanup. This phase generalizes all three commands to iterate the participating members, makes `/relay-pr` resolve each PR's base from the record `/relay-worktree` wrote rather than from a `merge-base --fork-point` guess, and migrates the 21 remaining bare `.worktrees/` git invocations to the repo-qualified form. A new `worktree-path-qualified` validate check pins that migration: any line that invokes git against `.worktrees/` must name its repository, so a future edit cannot silently reintroduce a command that runs in the workspace root.

## User Story

```
As a relay operator who has just finished a feature spanning two repositories
I want each repository committed, PR'd against the branch it was cut from, and cleaned up
So that shipping a cross-repo change is one sequence of commands rather than manual bookkeeping
```

## Problem Statement

`/relay-commit` operates on a single `.worktrees/<arg>/` chosen by argument match, `/relay-pr` pushes one branch and opens one PR, and `/relay-approve`'s cleanup is a strictly ordered single-worktree sequence. All 21 of their git invocations name `.worktrees/` without a repository, so in a workspace they run against the artifact root, which has no such worktree. Separately, `/relay-pr` guesses its PR base with a `merge-base --fork-point` heuristic that can disagree with the base the worktree was actually cut from — on `AlfaFront` the two resolve to `origin/main` and `origin/dev` respectively.

## Solution Statement

Give each command the same shape: resolve the topology, iterate the participating members, and perform the existing per-worktree logic once per member with `git -C <repo_root>` and a qualified path. Record per-member outcomes so a partial failure names which repository failed and which succeeded. In `/relay-pr`, insert the recorded base from `worktree-bases.json` as the first tier after `--base` and delete the fork-point tier entirely — a recorded fact makes the guess unnecessary, and removing it is what stops the two from disagreeing. Ship a `worktree-path-qualified` check asserting every git invocation against `.worktrees/` names its repository, scoped to command files and matching only lines that actually invoke git, so prose about the path convention is out of scope by construction.

## Metadata

| Key | Value |
|-----|-------|
| Type | Pillar 3 generalization + heuristic removal + migration guard |
| Complexity | High |
| Systems Affected | `plugins/relay/commands/relay-commit.md`, `plugins/relay/commands/relay-pr.md`, `plugins/relay/commands/relay-approve.md`, `scripts/validate/` (new check + registry entry), `docs/context/architecture.md` |
| Dependencies | Phase 5 (`complete`) — per-repo worktrees and the recorded base this phase consumes |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 7; AC-10, AC-11; Phase 7 Details |
| phase_type | scaffold |

> **phase_type justification (scaffold, not feature):** the deliverables are prompt-contract generalizations across three commands plus one check module. The check's in-phase validation is running it against real fixtures; the commands' is grep plus the check itself. Its behavioral unit coverage is delivered TEST-AFTER by the test pair. Mirrors the sibling phases.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/commands/relay-pr.md` | 96-130 | The five-tier base chain whose tier 2 this phase deletes and whose new first tier reads the recorded base |
| 1 | `plugins/relay/commands/relay-approve.md` | 172-195 | The collision-safe cleanup order that must now run once per member, and the partial-failure artifact that must name which |
| 1 | `plugins/relay/commands/relay-commit.md` | worktree mode | The single-worktree commit flow that becomes per-member |
| 1 | `plugins/relay/resources/repository-topology.md` | resolution protocol | The resolved member list all three commands iterate |
| 2 | `scripts/validate/checks/diff-base-form.mjs` | whole file | The sibling guard shipped for the same defect class: a line-scanning pure function with an explicit out-of-scope rule, plus its fail-closed contract |
| 2 | `scripts/validate/index.mjs` | 19-35, 44-62 | The two-line registration contract |
| 3 | `docs/context/architecture.md` | Orchestrator state machine | Where the Pillar 3 rule joins its sibling subsections |
| 3 | `PRPs/prds/multi-repo-topology.prd.md` | AC-10, AC-11 | The acceptance contract |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-pr.md:111
2. **Feature's source integration branch** — detect the nearest ancestor of `feature/<feature>` among all `origin/*` branches (excluding `origin/feature/*`). Use `git merge-base --fork-point` or the shortest `git log --ancestry-path` distance.
```

```
# SOURCE: plugins/relay/commands/relay-approve.md:191
git worktree remove .worktrees/<feature>/
```

```
# SOURCE: plugins/relay/commands/relay-worktree.md (Phase 5 output)
git -C <repo_root> worktree add <repo_root>/.worktrees/<feature>/ -b feature/<feature> <resolved-base>
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-commit.md` | UPDATE | Iterate participating members; commit each member's worktree; repo-qualify its 7 git invocations. |
| `plugins/relay/commands/relay-pr.md` | UPDATE | One PR per member; consume the recorded base as tier 1 and delete the fork-point tier; repo-qualify its 11 git invocations. |
| `plugins/relay/commands/relay-approve.md` | UPDATE | Merge and clean up per member with per-repo outcomes; repo-qualify its 3 git invocations. |
| `scripts/validate/checks/worktree-path-qualified.mjs` | CREATE | Pin the migration: a git invocation against `.worktrees/` must name its repository. |
| `scripts/validate/index.mjs` | UPDATE | Register the new check. |
| `docs/context/architecture.md` | UPDATE | Document Pillar 3 across N repos and the recorded-base consumption. |
| `scripts/validate/checks/topology-contract.mjs` | UPDATE | **Amendment, discovered at implement time.** This phase's own per-member prose mentions the topology section heading, which the check treated as "locates the table" — the second false positive from inferring scope from a substring. Scope is now self-selecting by the header's own shape (`| Repo | Path |`): a file that RESTATES the header must restate it correctly, and a file carrying no such row is out of scope entirely. |
| `scripts/validate/checks/topology-contract.test.mjs` | UPDATE | **Test-pair task, amendment.** Fixtures, the out-of-scope case and the finding line follow the shape-based scope; the finding now points at the offending header row rather than at a citation elsewhere. |

## NOT Building (Scope Limits)

- **Merging the N PRs in a defined order** — the source PRD's Open Question #2. This phase opens and merges them; whether a dependency between repositories dictates an order stays open.
- **A single PR spanning repositories** — impossible on GitHub; explicitly out of scope in the PRD.
- **The `context-builder` SKILL.md `.worktrees/` mentions (11)** — Phase 8's workspace mode. They are prose about a target project's `.gitignore`, not git invocations, so the new check does not reach them.
- **`resources/settings-allowlist.md` mentions (2)** — allowlist patterns, not invocations; also out of the check's scope by construction.
- **Changing the cleanup ORDER** — the collision-safe sequence (`worktree remove` → `branch -d` → `push --delete` → `prune`) is preserved verbatim per member.
- **Test file for the new check** — authored by the test pair; see Notes.

## Step-by-Step Tasks

### Task 1: CREATE scripts/validate/checks/worktree-path-qualified.mjs

- **SATISFIES**: AC-A4 — the guard is what keeps the migration from silently regressing, and it must ship able to fail.
- **ACTION**: Author the check following the `diff-base-form.mjs` anatomy. Export a pure `checkWorktreePathQualified({ files })` returning `{ name, ok, findings }` with `CHECK_NAME = 'worktree-path-qualified'`, failing closed on an empty map or a `null` value. Its invariant: for every scanned line, strip leading whitespace and any `> ` blockquote markers; if the result begins with `git ` AND contains `.worktrees/`, then the line MUST also contain `repo_root`. A line that merely mentions `.worktrees/` in prose is out of scope by construction — the rule only matches lines that actually invoke git. Each finding names the file, the 1-indexed line and the offending text. Also export the no-argument wrapper `runWorktreePathQualifiedCheck()` scanning every `.md` under `plugins/relay/commands/`.
- **MIRROR**: the line-scanning pure function, the out-of-scope rule and the fail-closed branch from `scripts/validate/checks/diff-base-form.mjs`.
- **VALIDATE**: `node -e "import('./scripts/validate/checks/worktree-path-qualified.mjs').then(m => { const bad = m.checkWorktreePathQualified({ files: { 'x.md': 'git worktree remove .worktrees/f/' } }); if (bad.ok !== false || bad.findings[0].line !== 1) { console.error('FAIL: unqualified invocation not caught'); process.exit(1); } const good = m.checkWorktreePathQualified({ files: { 'x.md': 'git -C <repo_root> worktree remove <repo_root>/.worktrees/f/' } }); if (good.ok !== true) { console.error('FAIL: qualified invocation wrongly flagged'); process.exit(1); } const prose = m.checkWorktreePathQualified({ files: { 'x.md': 'The worktree lives at .worktrees/<feature>/ by convention.' } }); if (prose.ok !== true) { console.error('FAIL: prose about the path must be out of scope'); process.exit(1); } if (m.checkWorktreePathQualified({ files: {} }).ok !== false) { console.error('FAIL: empty map must fail closed'); process.exit(1); } console.log('PASS: catches invocations, spares prose, fails closed'); }).catch(e => { console.error('FAIL: ' + e.message); process.exit(1); })"`

### Task 2: UPDATE plugins/relay/commands/relay-pr.md — recorded base and one PR per member

- **SATISFIES**: AC-A1, AC-A2 — targeting the branch the worktree was cut from, and opening a PR per repository.
- **ACTION**: In Step 2's base chain, insert a new tier immediately after the `--base` override: read `PRPs/reports/<feature>/worktree-bases.json` and, when it carries an entry for this member, use its recorded resolved ref as `<resolved-base>`. State that this is a recorded fact rather than an inference, and that it is what keeps the PR target consistent with the branch the worktree was actually cut from. Then DELETE the fork-point tier entirely — the recorded base makes it unnecessary, and it is the tier that could disagree. Keep the develop-family and main/master fallbacks verbatim for branches with no recorded base. Then generalize the command: when a topology is declared, iterate the participating members, and for each one push `feature/<feature>` from that member's worktree and open one PR in that member's repository, recording per-member outcomes; when no topology is declared, the existing single-worktree flow runs unchanged. Repo-qualify every git invocation.
- **MIRROR**: the priority-ordered chain prose the file already uses; the `git -C <repo_root>` form from the `relay-worktree.md` Phase 5 anchor.
- **VALIDATE**: `p=plugins/relay/commands/relay-pr.md; if grep -q "Feature.s source integration branch" "$p"; then echo "FAIL: the fork-point tier survives"; exit 1; fi; if ! grep -q 'worktree-bases.json' "$p"; then echo "FAIL: the recorded base is not consumed"; exit 1; fi; if ! grep -q 'origin/develop' "$p"; then echo "FAIL: the develop-family fallback was removed rather than preserved"; exit 1; fi; n=$(sed 's/^[[:space:]>]*//' "$p" | grep '^git .*\.worktrees/' | grep -cv 'repo_root' || true); if [ "$n" != "0" ]; then echo "FAIL: $n unqualified git invocation(s) remain"; exit 1; fi; echo "PASS: recorded base consumed, guess removed, invocations qualified"`

### Task 3: UPDATE plugins/relay/commands/relay-commit.md — commit each member's worktree

- **SATISFIES**: AC-A2 — a cross-repo feature has uncommitted work in several worktrees, and Pillar 3 owns every commit.
- **ACTION**: Generalize worktree mode: when a topology is declared, resolve the participating members and run the existing per-worktree flow once per member — verify the branch, check `git status --porcelain` for idempotency, stage and commit — recording per-member outcomes and treating a clean member as a skip rather than a failure. When no topology is declared, the existing single-worktree flow runs unchanged. Repo-qualify every git invocation. Do not change the message-generation logic, and never pass `--no-verify`.
- **MIRROR**: the worktree-mode flow the file already documents; the `git -C <repo_root>` form.
- **VALIDATE**: `c=plugins/relay/commands/relay-commit.md; n=$(sed 's/^[[:space:]>]*//' "$c" | grep '^git .*\.worktrees/' | grep -cv 'repo_root' || true); if [ "$n" != "0" ]; then echo "FAIL: $n unqualified git invocation(s) remain"; exit 1; fi; if ! grep -q 'per member' "$c"; then echo "FAIL: the per-member iteration is not documented"; exit 1; fi; if grep -q 'no-verify' "$c" && ! grep -q 'never passed' "$c"; then echo "FAIL: the no-verify prohibition was weakened"; exit 1; fi; echo "PASS: commit is per member and qualified"`

### Task 4: UPDATE plugins/relay/commands/relay-approve.md — merge and clean up per member

- **SATISFIES**: AC-A3 — a partial failure must name which repository failed, or recovery is guesswork.
- **ACTION**: Generalize the close-out: when a topology is declared, accept the N PRs for the feature and run the existing merge plus the collision-safe cleanup sequence once per member, preserving that sequence's ORDER verbatim (`worktree remove` → `branch -d` → `push origin --delete` → `prune`). Record per-member outcomes, and extend the partial-failure artifact at `PRPs/reports/<feature>/approve-halt.json` so each entry names the member alongside its failed step and its manual recovery. State that a member already merged and already cleaned is an idempotent skip, not a failure, exactly as the single-repo path already treats it. When no topology is declared, the existing single-worktree flow runs unchanged. Repo-qualify every git invocation. Leave the docs-updater/docs-reviewer dispatch untouched — it operates on the artifact plane, which is single.
- **MIRROR**: the collision-safe cleanup ordering and its rationale, preserved verbatim from the `relay-approve.md:191` anchor's surrounding steps.
- **VALIDATE**: `a=plugins/relay/commands/relay-approve.md; n=$(sed 's/^[[:space:]>]*//' "$a" | grep '^git .*\.worktrees/' | grep -cv 'repo_root' || true); if [ "$n" != "0" ]; then echo "FAIL: $n unqualified git invocation(s) remain"; exit 1; fi; if ! grep -q 'per member' "$a"; then echo "FAIL: the per-member iteration is not documented"; exit 1; fi; if ! grep -q 'approve-halt.json' "$a"; then echo "FAIL: the partial-failure artifact is no longer named"; exit 1; fi; echo "PASS: approve is per member and qualified"`

### Task 5: UPDATE scripts/validate/index.mjs — register the guard

- **SATISFIES**: AC-A4 — registration is what makes the guard run.
- **ACTION**: Add `import { runWorktreePathQualifiedCheck } from './checks/worktree-path-qualified.mjs';` to the import block and `runWorktreePathQualifiedCheck,` to the `CHECKS` array. Change nothing else.
- **MIRROR**: the one-import-plus-one-array-entry registration the file already uses.
- **VALIDATE**: `out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out" | grep -A3 '^\[FAIL\]'; exit 1; }; printf '%s\n' "$out" | grep -q '^\[PASS\] worktree-path-qualified$' || { echo "FAIL: check not registered or not passing"; printf '%s\n' "$out" | tail -20; exit 1; }; printf '%s\n' "$out" | grep -q '18 passed, 0 failed (18 checks run)' || { echo "FAIL: expected 18 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }; echo "PASS: guard registered, suite green at 18"`

### Task 6: UPDATE docs/context/architecture.md — document Pillar 3 across N repos

- **SATISFIES**: AC-A1, AC-A2, AC-A3 — the shape of delivery in a workspace is a cross-cutting rule.
- **ACTION**: Add a subsection headed exactly `### Pillar 3 across N repos` inside the existing `## Orchestrator state machine` section, stating: a cross-repo feature produces one commit, one branch, one PR and one cleanup PER member, because a pull request cannot span repositories; each PR targets the base recorded in `worktree-bases.json`, so the branch a worktree was cut from and the branch its PR merges into are the same by construction rather than by inference; the collision-safe cleanup order is preserved per member; a partial failure names the member; and with no topology declared all three commands behave exactly as before. Name the `worktree-path-qualified` check as the guard that keeps every git invocation repo-scoped.
- **MIRROR**: the sibling subsections this feature added to the same section.
- **VALIDATE**: `a=docs/context/architecture.md; if ! grep -q '^### Pillar 3 across N repos$' "$a"; then echo "FAIL: subsection absent"; exit 1; fi; if ! grep -q 'worktree-bases.json' "$a"; then echo "FAIL: the recorded-base consumption is not documented"; exit 1; fi; if ! grep -q 'worktree-path-qualified' "$a"; then echo "FAIL: the guard is not named"; exit 1; fi; echo "PASS: Pillar 3 documented"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
node --check scripts/validate/checks/worktree-path-qualified.mjs || { echo "FAIL: check module does not parse"; exit 1; }
node --check scripts/validate/index.mjs || { echo "FAIL: registry does not parse"; exit 1; }
node -e "const fs=require('fs');for(const p of ['plugins/relay/commands/relay-commit.md','plugins/relay/commands/relay-pr.md','plugins/relay/commands/relay-approve.md','docs/context/architecture.md']){const t=fs.readFileSync(p,'utf8');if(!t.trim()){console.error('FAIL: empty '+p);process.exit(1)}if((t.match(/^\x60\x60\x60/gm)||[]).length%2!==0){console.error('FAIL: unbalanced fences in '+p);process.exit(1)}}console.log('PASS: modules parse, fences balanced')"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
total=0
for f in plugins/relay/commands/*.md; do
  n=$(sed 's/^[[:space:]>]*//' "$f" | grep '^git .*\.worktrees/' | grep -cv 'repo_root' || true)
  if [ "$n" != "0" ]; then echo "FAIL: $n unqualified git invocation(s) in $f"; total=$((total+n)); fi
done
[ "$total" = "0" ] || exit 1
if grep -q "Feature.s source integration branch" plugins/relay/commands/relay-pr.md; then echo "FAIL: the fork-point tier survives"; exit 1; fi
if ! grep -q 'worktree-bases.json' plugins/relay/commands/relay-pr.md; then echo "FAIL: recorded base not consumed"; exit 1; fi
if ! grep -q 'origin/develop' plugins/relay/commands/relay-pr.md; then echo "FAIL: develop-family fallback removed"; exit 1; fi
if ! grep -q '^### Pillar 3 across N repos$' docs/context/architecture.md; then echo "FAIL: architecture subsection absent"; exit 1; fi
echo "PASS: content invariants hold"
```

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '^\[PASS\] worktree-path-qualified$' || { echo "FAIL: guard absent or failing"; exit 1; }
printf '%s\n' "$out" | grep -q '18 passed, 0 failed (18 checks run)' || { echo "FAIL: expected 18 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }
node --test "scripts/**/*.test.mjs" 2>&1 | tail -20 | grep -q 'fail 0' || { echo "FAIL: corpus not green"; exit 1; }
echo "PASS: suite and corpus green with the migration guard registered"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-10):** Given a worktree whose resolved base was recorded in `worktree-bases.json`, when `/relay-pr` resolves the PR base without a `--base` override, then it uses the recorded ref; and given the file after this phase, then no `merge-base --fork-point` tier remains, while the develop-family and main/master fallbacks survive for branches with no recorded base.
- **AC-A2 (PRD AC-11):** Given a feature whose phases touched two members, when Pillar 3 runs, then `/relay-commit` commits each member's worktree and `/relay-pr` opens one PR per member, each recording a per-member outcome; and given no topology declared, then both run their existing single-worktree flow unchanged.
- **AC-A3 (PRD AC-11):** Given N merged PRs, when `/relay-approve` runs, then it merges and cleans up each member in the preserved collision-safe order, treats an already-merged-and-cleaned member as an idempotent skip, and on partial failure writes an `approve-halt.json` whose every entry names the member alongside its failed step.
- **AC-A4 (PRD AC-11):** Given the `worktree-path-qualified` check, when a command file contains a line that begins with `git` and names `.worktrees/` without `repo_root`, then the check reports a finding at that 1-indexed line; and given the same path mentioned in prose, or a qualified invocation, then it reports nothing; and given an empty file map, then it fails closed.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An unqualified git invocation survives and runs against the workspace root, deleting or committing the wrong thing | M | H | Task VALIDATEs, Level 2's loop over every command file, AND the new registered check all assert zero unqualified invocations — three independent gates |
| Deleting the fork-point tier regresses a repository that relied on it | M | M | It is deleted only because a recorded base supersedes it; the develop-family and main/master fallbacks remain for branches with no record, and Level 2 asserts they survive |
| The check false-positives on prose describing the path convention | M | M | The rule matches only lines whose trimmed form BEGINS with `git`; Task 1's VALIDATE feeds it a prose fixture and requires `ok: true` |
| The cleanup order is reworded and loses its collision-safe property | L | H | Task 4's ACTION forbids changing the order and the plan states it verbatim; the ordering rationale already lives in the command |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task above and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.

**Why the fork-point tier is deleted rather than demoted.** Demoting it would leave a heuristic that fires whenever the recorded base is missing for any reason — and a heuristic that fires rarely is the worst kind, because its failures are unreproducible. The develop-family and main/master fallbacks are deterministic and already cover the no-record case. Removing the guess is what makes the branch a worktree was cut from and the branch its PR merges into the same by construction; on `AlfaFront` the two currently resolve to `origin/main` and `origin/dev`.

**A third gate on the same invariant is deliberate.** The per-task VALIDATE, Level 2's loop and the registered check all assert the same thing. That is not redundancy for its own sake: the first two run only while this phase is being implemented, and the third is the only one that still runs a year from now. Phase 4 taught the lesson directly — a pin that stops discriminating goes unnoticed precisely because everything stays green.

*Generated: 2026-09-01*
*Approved: 2026-09-01*
*Status: IMPLEMENTED*
