# Feature: Workspace initialization and decision records (Phase 8 of multi-repo-topology)

```
**Decision Gate**
- Active context: none
- Activated criteria: records two architectural decisions this feature already implemented — a change to a recorded decision (D11) and a fourth interactivity-boundary extension — and adds the context-builder mode that makes a workspace set up in one command; every `docs/decisions.md` edit is mirrored into the documentation site by a registered check
- Decisions found:
  - [2026-05-11] relay-worktree D11 — the base-ref chain this feature changed for declared members. This phase writes the divergence record the change has been running without
  - [2026-07-27] Orchestrator resumability + `/relay-visual-approve` — relay's third interactivity extension and the reasoning that governs where a fourth may live. This phase records the fourth
  - [2026-04-19] Methodology declaration; context-builder emits, never infers — the workspace mode seeds a topology section from an existing `CLAUDE.md`, and a seeded declaration is still a declaration a human owns
  - PRP artifacts live under `PRPs/`, never under `.claude/` — the workspace mode creates `PRPs/` at the workspace root, which is what ends the violation this feature's Evidence documents
- Applicable anti-patterns:
  - "Injecting plugin defaults into the target project's `decisions.md`" — the workspace mode creates structure, never opinions; the two entries written here go in THIS repository's own decision record, about relay itself
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — the seeded topology is written for a human to review, never activated by detection
- Applicable architectural rules:
  - Every `docs/decisions.md` entry is mirrored in `documentation/governance/decisions.html`, enforced by the `decisions-mirror` check as a count comparison
  - `documentation/AGENTS.md` §7.4: every change to `documentation/` carries a changelog entry
  - Three-pillar Pillar 2; nothing is committed
- Result: PROCEED
```

## Source

- `PRPs/prds/multi-repo-topology.prd.md` — Implementation Phases row 8: "Workspace initialization and decision records" — Goal: Make a new workspace set up in one command and record what changed. — Success signal: A previously unconfigured workspace reaches a runnable state in one command; `npm run validate` green including the decisions mirror.

## Summary

Seven phases changed how relay addresses repositories; two of those changes are the kind the Decision Gate is supposed to be able to read back, and neither is recorded yet. This phase writes both — the D11 base-ref divergence and the fourth interactivity-boundary extension — into `docs/decisions.md` and mirrors them into the documentation site, which a registered check enforces by count. It also adds the `context-builder` workspace mode, so a workspace root reaches a runnable state in one command instead of by hand, and closes the documentation debt the seventeenth and eighteenth checks left behind.

## User Story

```
As the next agent to consult the Decision Gate before touching relay's worktree contract
I want the D11 change and the new confirmation point to be findable in decisions.md
So that I extend what was decided rather than re-deriving or contradicting it
```

## Problem Statement

The feature changed a recorded decision and added a human-confirmation point, and both are currently only described in plans that have moved to `completed/`. The Decision Gate reads `docs/decisions.md` — so an agent consulting it today would find D11's original chain and conclude the base resolution still puts `origin/main` first, and would find three sanctioned interactivity extensions when there are four. Separately, `super-ensino` still has no `PRPs/` at its root and no topology declaration, so the workflow this feature enables cannot actually start there; and `CLAUDE.md` and the validation-checks page still report 17 checks after Phase 7 registered the eighteenth.

## Solution Statement

Write the two decision entries with their real context, decision, reason and areas affected, and mirror each into `documentation/governance/decisions.html` as both an index row and a body entry, numbered 94 and 95 — the `decisions-mirror` check compares counts, so a missing half fails the build. Add a `*init-workspace` mode to `context-builder` that runs `git init` at the workspace root, creates `PRPs/`, writes a `.gitignore` excluding the declared members, and seeds a `## Repository topology` section into the root's `docs/context/architecture.md` from whatever the existing root `CLAUDE.md` already describes — seeded for a human to review, never activated by detection. Bring `CLAUDE.md` and the validation-checks page to 18, and record the whole feature in the changelog.

## Metadata

| Key | Value |
|-----|-------|
| Type | Decision records + skill mode + documentation debt |
| Complexity | Medium |
| Systems Affected | `docs/decisions.md`, `documentation/governance/decisions.html`, `plugins/relay/skills/context-builder/SKILL.md`, `CLAUDE.md`, `documentation/reference/validation-checks.html`, `documentation/changelog.html` |
| Dependencies | Phase 1 (`complete`) — the topology contract the workspace mode seeds; Phase 5 (`complete`) — the D11 change and the preflight this phase records |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/multi-repo-topology.prd.md` Implementation Phases row 8; Phase 8 Details |
| phase_type | docs |

> **phase_type justification (docs, not feature):** every deliverable is a record or a prose contract — two decision entries, their site mirror, a skill mode, and three documentation surfaces. In-phase validation is the `decisions-mirror` count check plus grep; there is no runtime module. The `docs` classification is what the plan-reviewer's own `phase_type` vocabulary offers for exactly this shape.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `scripts/validate/checks/decisions-mirror.mjs` | 1-26 | The mirror contract: a COUNT comparison between the markdown entries, the page's index rows and the page's body entries — deliberately not a title match |
| 1 | `docs/decisions.md` | 2223-2236 | The most recent entry's shape — Context, Decision, Reason, Areas affected — the two new entries must follow |
| 1 | `documentation/governance/decisions.html` | 125-126, 875-890 | The index-row and body-entry shapes, and the numbering the next two continue |
| 2 | `plugins/relay/skills/context-builder/SKILL.md` | 12-13, 170-200 | The mode table and the mode-validation phase the new workspace mode joins |
| 2 | `plugins/relay/resources/repository-topology.md` | declaration, roles | The section the workspace mode seeds and the `Role` values it must offer |
| 3 | `documentation/AGENTS.md` | §7.2, §7.4, §9 | The changelog entry shape and the rule that every `documentation/` change carries one |

## Patterns to Mirror

```
# SOURCE: docs/decisions.md:2223-2229 (entry body shape; the heading line is
# deliberately not quoted here - a column-0 '##' inside a fenced block would
# pollute this plan own section list)
**Context:** ...
**Decision:** ...
**Reason:** ...
**Areas affected:** ...
```

```
# SOURCE: documentation/governance/decisions.html:126
        <li><a href="#reviewers-never-mutate-worktree">Review agents never mutate the target working tree</a></li>
```

```
# SOURCE: documentation/governance/decisions.html:883-885
      <h3 id="reviewers-never-mutate-worktree">93. Review agents never mutate the target working tree</h3>
      <div class="kv">
        <dt>Date</dt><dd>2026-08-28</dd>
```

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/decisions.md` | UPDATE | The two entries the Decision Gate needs in order to read back what this feature changed. |
| `documentation/governance/decisions.html` | UPDATE | Both entries mirrored as index rows and body entries, numbered 94 and 95; the check compares counts. |
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | The `*init-workspace` mode that makes a workspace root runnable in one command. |
| `CLAUDE.md` | UPDATE | The check count reached 18 when Phase 7 registered `worktree-path-qualified`. |
| `documentation/reference/validation-checks.html` | UPDATE | The eighteenth check's row and detail section, and the same count. |
| `documentation/changelog.html` | UPDATE | Required by `AGENTS.md` §7.4 for every `documentation/` change, and the record of the feature itself. |

## NOT Building (Scope Limits)

- **Running `*init-workspace` against `super-ensino`, `inplay` or `sisalfa`** — the mode is shipped here; invoking it against a real workspace is a human act on a repository this feature does not own.
- **Migrating the hand-authored PRD out of `super-ensino`'s `.claude/`** — same reason; the sanctioned destination now exists, and moving the file is the operator's call.
- **Amending AC-1's base clause** — Phase 5 recorded that AC-1 forbids fixing F7 for plain single-repo projects. Changing an approved acceptance criterion belongs to a follow-up PRD, not to this phase.
- **The `context-builder` `.worktrees/` prose mentions (11)** — they describe a target project's `.gitignore`, are not git invocations, and the `worktree-path-qualified` check does not reach them by construction.
- **Test files** — routed through the test pair; see Notes.

## Step-by-Step Tasks

### Task 1: UPDATE docs/decisions.md — record the D11 divergence

- **SATISFIES**: AC-A1 — an agent consulting the Decision Gate today would read D11's original chain and conclude the current checkout comes last.
- **ACTION**: Append an entry dated `2026-09-01` titled so it names the change, following the file's four-part shape. **Context:** D11 ordered the base chain `--base` → `origin/main` → `origin/master` → `HEAD`, so the current checkout is reached only when both remote defaults fail to resolve — which does not happen in any repository whose default branch exists on the remote. **Decision:** for a member declared in a `## Repository topology`, the member's `Base` cell governs, defaulting to `current`; the D11 chain is preserved unchanged for every project with no topology declaration. **Reason:** `git worktree add`'s own documented behavior with no commit-ish is to branch from the current checkout, so D11 overrode git's default without recording why; reproduced on a repository checked out on `dev` with `origin/main` present, where the worktree would be cut from `main`. Record explicitly that this leaves the same exposure live for plain single-repo projects because AC-1 of the source PRD guarantees their base resolution is unchanged, and that revisiting that clause is a follow-up. **Areas affected:** name the files.
- **MIRROR**: the entry shape from the `docs/decisions.md:2223` anchor.
- **VALIDATE**: `d=docs/decisions.md; if ! grep -q '^## \[2026-09-01\].*[Bb]ase' "$d"; then echo "FAIL: the D11 entry is absent"; exit 1; fi; if ! grep -q 'AC-1' "$d"; then echo "FAIL: the residual single-repo exposure is not recorded"; exit 1; fi; echo "PASS: D11 divergence recorded"`

### Task 2: UPDATE docs/decisions.md — record the fourth interactivity extension

- **SATISFIES**: AC-A1 — `architecture.md` names three sanctioned extensions; there are now four, and the fourth has a different shape.
- **ACTION**: Append a second entry dated `2026-09-01` recording the base preflight as relay's fourth interactivity-boundary extension. **Context:** the first three are PRD approval, the Design Spec pair, and `/relay-visual-approve`; the third deliberately used HALT-and-resume because `/relay-execute` runs long and unattended. **Decision:** `/relay-execute` precondition P7 resolves every declared member's base and requires ONE confirmation before Phase A begins; it is a complete no-op for a project with no topology declaration. **Reason:** a precondition runs before the unattended run starts, in the turn the operator invoked — so it can dialogue, while the loop it precedes stays prompt-free; confirming N members once is strictly cheaper than N confirmations inside the loop, and the "no prompts in the autonomous loop" anti-pattern is preserved rather than excepted. Note that this is the first extension that is a precondition rather than a resumable halt. **Areas affected:** name the files.
- **MIRROR**: the same entry shape.
- **VALIDATE**: `d=docs/decisions.md; if ! grep -q 'fourth interactivity' "$d"; then echo "FAIL: the fourth extension is not recorded"; exit 1; fi; if ! grep -q 'P7' "$d"; then echo "FAIL: the precondition is not named"; exit 1; fi; n=$(grep -c '^## \[2026-09-01\]' "$d"); if [ "$n" != "2" ]; then echo "FAIL: expected exactly 2 entries dated 2026-09-01, found $n"; exit 1; fi; echo "PASS: fourth extension recorded"`

### Task 3: UPDATE documentation/governance/decisions.html — mirror both entries

- **SATISFIES**: AC-A2 — the check compares counts, and a decision missing from the site is binding on agents but invisible to humans.
- **ACTION**: Add two index rows and two body entries, numbered `94.` and `95.` continuing the existing sequence, each with a stable `id` slug matching its index anchor and the `Date`/`Context`/`Decision`/`Reason` key-value shape the page already uses. Paraphrase the titles as the page does — the check is a count comparison precisely so rewording stays legal.
- **MIRROR**: the index-row and body-entry shapes from the `decisions.html:126` and `decisions.html:883-885` anchors.
- **VALIDATE**: `h=documentation/governance/decisions.html; if ! grep -q '>94\.' "$h"; then echo "FAIL: entry 94 absent from the body"; exit 1; fi; if ! grep -q '>95\.' "$h"; then echo "FAIL: entry 95 absent from the body"; exit 1; fi; out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out" | grep -A4 '^\[FAIL\]'; exit 1; }; printf '%s\n' "$out" | grep -q '^\[PASS\] decisions-mirror$' || { echo "FAIL: the mirror is out of step"; exit 1; }; echo "PASS: both decisions mirrored"`

### Task 4: UPDATE plugins/relay/skills/context-builder/SKILL.md — the workspace mode

- **SATISFIES**: AC-A3 — without it a workspace root is configured by hand, which is how the artifact plane ended up under `.claude/` in the first place.
- **ACTION**: Add a `*init-workspace` row to the mode table and a phase describing it. The mode runs at a workspace root — a directory holding several sibling git repositories — and performs: `git init` when the root is not already a repository, so the artifact plane is versioned; creation of `PRPs/prds/`, `PRPs/plans/` and `PRPs/reports/`; a root `.gitignore` excluding every declared member directory plus `.worktrees/`; and a seeded `## Repository topology` section in the root's `docs/context/architecture.md`, with one row per sibling repository found, `Role` defaulted to `editable`, `Base` defaulted to `current`, and `Git root` left empty unless the repository sits below the member directory. State that the seeding is a DRAFT for a human to review and correct — membership, `Role` and `Base` are declarations the operator owns, and the mode never activates anything by detection; a directory it lists is a proposal, not a decision. State that the mode never writes into a member repository.
- **MIRROR**: the mode-table row shape and the mode-validation prose the skill already uses for `*init` and `*update`.
- **VALIDATE**: `s=plugins/relay/skills/context-builder/SKILL.md; if ! grep -q 'init-workspace' "$s"; then echo "FAIL: the workspace mode is absent"; exit 1; fi; if ! grep -q 'never activates anything by detection' "$s"; then echo "FAIL: the seeded-declaration caveat is missing"; exit 1; fi; if ! grep -q 'never writes into a member repository' "$s"; then echo "FAIL: the write boundary is not stated"; exit 1; fi; out="$(npm run validate 2>&1)" || { echo "FAIL: validate non-zero"; printf '%s\n' "$out" | grep -A3 '^\[FAIL\]'; exit 1; }; printf '%s\n' "$out" | grep -q '^\[PASS\] bootstrap-parity$' || { echo "FAIL: bootstrap-parity regressed"; exit 1; }; echo "PASS: workspace mode added"`

### Task 5: UPDATE CLAUDE.md and documentation/reference/validation-checks.html — the eighteenth check

- **SATISFIES**: AC-A4 — Phase 7 registered a check and left both surfaces reporting 17.
- **ACTION**: Change the count in `CLAUDE.md` from 17 to 18. In the validation-checks page, add a `worktree-path-qualified` row to the summary table and a detail section following the page's `Functionality` / `Passes when` / `Fails when` / representative-finding shape, and change the totals sentence to 18. Leave the `Unit tests` column as an em-dash — the check's unit coverage is authored by the test pair and this phase adds none.
- **MIRROR**: the row and detail-section shapes the page already uses for `diff-base-form` and `topology-contract`.
- **VALIDATE**: `if ! grep -q '18 static consistency checks' CLAUDE.md; then echo "FAIL: CLAUDE.md count stale"; exit 1; fi; h=documentation/reference/validation-checks.html; if ! grep -q 'reports 18 checks' "$h"; then echo "FAIL: page totals stale"; exit 1; fi; if ! grep -q 'id="worktree-path-qualified"' "$h"; then echo "FAIL: the check has no detail section"; exit 1; fi; echo "PASS: both surfaces at 18"`

### Task 6: UPDATE documentation/changelog.html — record the feature

- **SATISFIES**: AC-A2, AC-A4 — `AGENTS.md` §7.4 requires a changelog entry for every `documentation/` change, and this feature is the change.
- **ACTION**: Add entries under `Unreleased` recording: the repository-topology contract and the three roots; the `Repo` column and its legacy-form compatibility; per-repo worktrees, the `Base` declaration and the base preflight; per-repo context resolution; Pillar 3 across N repos with the recorded-base consumption; the `worktree-path-qualified` check; and the `*init-workspace` mode. Reference the two new decision entries. Follow the existing `Added` / `Changed` / `Fixed` vocabulary, placing the D11 change under `Changed` since it alters recorded behavior.
- **MIRROR**: the entry shape and section vocabulary from `documentation/AGENTS.md` §7.2 and the existing `Unreleased` block.
- **VALIDATE**: `c=documentation/changelog.html; if ! grep -q 'init-workspace' "$c"; then echo "FAIL: the workspace mode is not recorded"; exit 1; fi; if ! grep -q 'worktree-path-qualified' "$c"; then echo "FAIL: the check is not recorded"; exit 1; fi; if ! grep -q 'Repository topology' "$c"; then echo "FAIL: the contract is not recorded"; exit 1; fi; out="$(npm run validate 2>&1)" || { echo "FAIL: validate non-zero"; printf '%s\n' "$out" | grep -A3 '^\[FAIL\]'; exit 1; }; printf '%s\n' "$out" | grep -q '^\[PASS\] registration-parity$' || { echo "FAIL: registration-parity regressed"; exit 1; }; echo "PASS: changelog records the feature"`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
node -e "const fs=require('fs');const {parse}=require('node-html-parser');for(const p of ['documentation/governance/decisions.html','documentation/reference/validation-checks.html','documentation/changelog.html']){const r=parse(fs.readFileSync(p,'utf8'));if(!r.querySelector('body')&&!r.querySelector('main')&&r.childNodes.length===0){console.error('FAIL: unparseable '+p);process.exit(1)}}for(const p of ['docs/decisions.md','plugins/relay/skills/context-builder/SKILL.md','CLAUDE.md']){const t=fs.readFileSync(p,'utf8');if(!t.trim()){console.error('FAIL: empty '+p);process.exit(1)}if((t.match(/^\x60\x60\x60/gm)||[]).length%2!==0){console.error('FAIL: unbalanced fences in '+p);process.exit(1)}}console.log('PASS: HTML parses, markdown fences balanced')"
```

The HTML pass uses `node-html-parser`, already a devDependency the `decisions-mirror` and `registration-parity` checks import, so it introduces no new dependency.

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
n=$(grep -c '^## \[2026-09-01\]' docs/decisions.md)
if [ "$n" != "2" ]; then echo "FAIL: expected 2 decision entries dated 2026-09-01, found $n"; exit 1; fi
if ! grep -q 'fourth interactivity' docs/decisions.md; then echo "FAIL: fourth extension unrecorded"; exit 1; fi
if ! grep -q 'AC-1' docs/decisions.md; then echo "FAIL: residual single-repo exposure unrecorded"; exit 1; fi
if ! grep -q '>94\.' documentation/governance/decisions.html; then echo "FAIL: mirror entry 94 absent"; exit 1; fi
if ! grep -q '>95\.' documentation/governance/decisions.html; then echo "FAIL: mirror entry 95 absent"; exit 1; fi
if ! grep -q 'init-workspace' plugins/relay/skills/context-builder/SKILL.md; then echo "FAIL: workspace mode absent"; exit 1; fi
if ! grep -q '18 static consistency checks' CLAUDE.md; then echo "FAIL: CLAUDE.md count stale"; exit 1; fi
if ! grep -q 'id="worktree-path-qualified"' documentation/reference/validation-checks.html; then echo "FAIL: check detail section absent"; exit 1; fi
echo "PASS: content invariants hold"
```

**Level 3 — INTEGRATION**

```bash
out="$(npm run validate 2>&1)" || { echo "FAIL: npm run validate exited non-zero"; printf '%s\n' "$out"; exit 1; }
printf '%s\n' "$out" | grep -q '18 passed, 0 failed (18 checks run)' || { echo "FAIL: expected 18 checks all green"; printf '%s\n' "$out" | tail -3; exit 1; }
printf '%s\n' "$out" | grep -q '^\[PASS\] decisions-mirror$' || { echo "FAIL: the decisions mirror is out of step"; exit 1; }
node --test "scripts/**/*.test.mjs" 2>&1 | tail -20 | grep -q 'fail 0' || { echo "FAIL: corpus not green"; exit 1; }
echo "PASS: suite and corpus green with both decisions mirrored"
```

`decisions-mirror` is called out explicitly because it is the one check that can only pass when both halves of Tasks 1–3 landed — the markdown entries AND their site counterparts.

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** Given `docs/decisions.md` after this phase, when an agent consults the Decision Gate about worktree base resolution, then it finds a dated entry stating that a declared member's `Base` governs with `current` as the default, that the D11 chain survives for projects with no topology, and that the residual single-repo exposure is deliberate under AC-1; and when it consults about the interactivity boundary, then it finds a dated entry naming the base preflight as the fourth extension and the first that is a precondition.
- **AC-A2 (PRD AC-6):** Given both new decision entries, when `npm run validate` runs, then `decisions-mirror` passes — the markdown entry count, the page's index-row count and the page's body-entry count all agree — with the two new entries numbered 94 and 95.
- **AC-A3 (PRD AC-6):** Given a workspace root holding sibling repositories, when `*init-workspace` is described in the skill, then it specifies `git init` at the root, `PRPs/` creation, a `.gitignore` excluding the members and `.worktrees/`, and a SEEDED `## Repository topology` section that is a draft for human review — never an activation by detection — and it never writes into a member repository.
- **AC-A4 (PRD AC-6):** Given `CLAUDE.md` and the validation-checks page after this phase, when either is read for the check count, then both report 18, the page carries a `worktree-path-qualified` row and detail section, and the changelog records the feature.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Only one half of a decision lands — markdown without mirror, or the reverse | M | H | `decisions-mirror` compares three counts and is asserted explicitly at Level 3; a missing half fails the build rather than drifting quietly |
| The seeded topology is read as an activation, and a member is written to that should not be | M | H | The skill states the seed is a draft for human review, that `Role` and `Base` are declarations the operator owns, and that the mode never writes into a member repository; Task 4's VALIDATE asserts both caveats |
| The workspace mode's `git init` is run at a root that is already a repository | L | M | The mode's own description conditions it on the root not already being one, matching the idempotency discipline every other relay infra step uses |
| The changelog entry drifts from what shipped across eight phases | M | L | It is written from the phase list and the two decision entries rather than from memory, and `registration-parity` independently checks the changelog against the on-disk command set |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task above and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.

**Why the decision records come last and not first.** They describe what was decided, and two of the eight phases changed their own decisions at implement time — the topology check's scope was re-derived three times, and the D11 inversion's blast radius was only settled once AC-1's base clause was read closely. Writing the records at the end means they describe what shipped rather than what was intended. The cost is that seven phases ran against an unrecorded divergence; the mitigation is that this phase is a dependency of nothing, so the record lands before the feature does.

**The residual single-repo exposure is recorded, not hidden.** AC-1 guarantees a project with no topology declaration resolves paths, roots and base exactly as before, which forbids fixing the base defect there. The D11 entry says so plainly and names the follow-up. A decision record that omitted it would be worse than none: the next agent would read that the base defect was fixed.

*Generated: 2026-09-01*
*Approved: 2026-09-01*
*Status: IMPLEMENTED*
