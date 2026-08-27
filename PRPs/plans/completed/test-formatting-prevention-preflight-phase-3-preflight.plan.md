# Feature: Preflight (Phase 3 of test-formatting-prevention-preflight)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (modifies `/relay-implement`, the shared implementation-loop command every phase of every feature runs through); architectural decisions (Pillar 2 "never commit" invariant; R-X/D17 byte-identical constraint); reuse of an existing component (`formatter_cmd` discovery chain, Phase 1 shipped)
- Decisions found:
  - [2026-05-18] Pillar 2 terminates with all phases complete and uncommitted changes; does NOT commit or create a PR — a permanent boundary (`docs/context/architecture.md:51-56`, restated at `plugins/relay/commands/relay-implement.md:450` and `:510` for two existing sub-phases). Resolves this phase's Open Question: no dedicated normalization commit.
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md`, non-heuristic; `formatter_cmd`'s emit/preserve/backfill contract already shipped by Phase 1 — this phase only CONSUMES the key, never redeclares it.
  - `formatter_cmd` discovery chain is closed to exactly two ordered branches (`methodology.md` frontmatter → `package.json` `scripts.format`), explicitly naming "a future `/relay-implement` preflight" as a sanctioned consumer (`docs/anti-patterns.md:125-131`, "Inferring `formatter_cmd`'s value or invocation source outside its declared discovery chain").
  - [2026-05-06]/[2026-07-10] TDD pair is the only authorized test-file author; R-X strict (D17) preserved verbatim (source PRD's own Decision Gate block, `PRPs/prds/test-formatting-prevention-preflight.prd.md:8-9`). This phase's diff never touches `code-reviewer.md`.
- Applicable anti-patterns:
  - "Inferring `formatter_cmd`'s value or invocation source outside its declared discovery chain" (`docs/anti-patterns.md:125-131`) — this phase calls the existing chain, never reimplements it.
  - "Writing pipeline artifacts under `.claude/`" (`docs/anti-patterns.md:61-67`) — the new `preflight-formatting.json` side-record lands under `PRPs/reports/<feature>/phase-<N>/`, never `.claude/`.
  - "Weakening or deleting tests to make the loop turn green" (`docs/anti-patterns.md:15-21`) — normalization is formatting-only; this phase never edits test content, and never touches `code-reviewer.md`'s R-X guard.
- Applicable architectural rules:
  - Three-pillar Pillar 2 "never commit" invariant (binds the Open-Question resolution below).
  - Writer/reviewer split — code-reviewer's R-X/D17 stay byte-identical; zero lines of `code-reviewer.md` are touched by this plan.
  - `PRPs/` artifact-path convention for the new `preflight-formatting.json` side-record.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-formatting-prevention-preflight.prd.md` — Implementation
  Phases row 3: "Preflight" — Goal: The R-X inspection window is born clean
  regardless of suite provenance — Success signal: AC-3 demonstrable: an
  unclean approved suite yields an empty test-glob diff in the R-X window;
  R-X passes.

## Summary

Add a new precondition, `P5 — Test-file formatting preflight`, to
`/relay-implement`'s `## Preconditions` section, positioned immediately
before the existing base-commit derivation step (renumbered `P4 → P5(new)
→ P6`). The new step reuses Phase 1's `formatter_cmd` discovery chain and
Phase 2's scoped-invocation discipline (both already shipped, in this same
worktree, inside `/relay-write-test`) to normalize every canonical
test-glob file currently sitting in the working tree — covering suites
approved in a prior phase and any formatter-config drift — directly and
uncommitted, before `base_commit` is computed and before Phase A.2 ever
captures a `diff.patch`. No commit is ever created: the Pillar 2 "never
commit" invariant (`docs/decisions.md` 2026-05-18) rules out the
"dedicated, labeled normalization commit" alternative named in the source
PRD's Open Questions, so this plan resolves that question in favor of a
direct, uncommitted working-tree edit. `code-reviewer.md`'s R-X rule and
D17 text are not touched at all — zero carve-outs, per PRD AC-4.

## User Story

As the relay pipeline operator running `/relay-implement` on a
formatter-enforcing target project, I want any not-yet-formatter-clean
test files already sitting in the worktree to be normalized before
`/relay-implement` computes its baseline, so that Level 1 STATIC_ANALYSIS
and R-X both pass without the implementer ever touching a test file or
opening a formatting-motivated dispute.

## Problem Statement

Narrowed to this phase's scope: an APPROVED test suite from an earlier
phase (or a formatter-config change) can sit in the working tree
uncommitted — Pillar 2 never commits — not formatter-clean, because the
test-writer's own formatting step (Phase 2, `/relay-write-test`) only
covers the *session that just wrote it*. When a later phase's
`/relay-implement` invocation starts, Level 1's formatter check
(`npm run check` / equivalent) sees that pre-existing unformatted content
and fails, but the implementer cannot fix it by editing the test file
directly — R-X's straight-fail (D17, no grace period) forbids any
test-glob match in the implementer's own diff. There is no prevention-only
fix for this case: the file was already approved before this
`/relay-implement` invocation began.

## Solution Statement

Insert a new, non-halting precondition step that runs once per
`/relay-implement` invocation, before `base_commit` is computed: discover
`formatter_cmd` via the identical closed two-branch chain Phase 1/2
already established, collect every file in the working tree matching the
same canonical test-glob pathspec set `code-reviewer.md`'s R-X rule itself
inspects, invoke the formatter scoped to exactly those literal paths (never
a glob, never the whole repo), and record the outcome to a small
command-owned side-record. The edit lands directly and uncommitted in the
working tree — never behind a dedicated commit, which the Pillar 2 "never
commit" invariant forecloses. `code-reviewer.md`'s R-X/D17 text is not
opened by any task in this plan.

## Metadata

| Field | Value |
|-------|-------|
| Type | Command-protocol change (prompt/markdown only — no runtime source) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/commands/relay-implement.md` (Preconditions ordering + mission/description narration) |
| Dependencies | Phase 1 (`formatter_cmd` contract) — `complete`; this phase reuses its discovery chain and `methodology.md` key verbatim, adds no new key |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/test-formatting-prevention-preflight.prd.md:294, 354-361` (Implementation Phases row 3 + Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-implement.md` | 161-196 | Exact P4/P5 boundary text this plan's Task 1 edits — the insertion anchor and the section being renumbered |
| P0 | `plugins/relay/commands/relay-implement.md` | 272-310 | Phase A.2 diff capture (`git add -A` + `git diff <base_commit>` → `diff.patch`) — the window the preflight must complete before |
| P0 | `plugins/relay/commands/relay-write-test.md` | 222-297 | Phase A.4 Prevention — the exact `formatter_cmd` discovery chain (A.4.2) and scoped-invocation discipline (A.4.3) this phase reuses, not reinvents |
| P0 | `plugins/relay/agents/code-reviewer.md` | 373-404 | R-X rule text and the canonical 12-pattern test-glob pathspec set — byte-identical, zero carve-outs (AC-4); also the set this phase's file-collection step binds to |
| P0 | `docs/anti-patterns.md` | 125-131 | "Inferring `formatter_cmd`'s value ... outside its declared discovery chain" — explicitly names a future `/relay-implement` preflight as the sanctioned consumer of the closed two-branch chain |
| P1 | `docs/context/architecture.md` | 51-56 | Pillar 2 "never commit" invariant — the citation that resolves this phase's Open Question against a dedicated commit |
| P1 | `plugins/relay/commands/relay-implement.md` | 450, 510 | Two existing "No commit issued" precedents (visual-fix round, docs-sync) — the exact phrasing/citation pattern this phase's own no-commit sub-step mirrors |
| P1 | `docs/context/methodology.md` | 79-100 | Formatter section — `formatter_cmd: null` default, override contract (Phase 1, already shipped) |
| P2 | `plugins/relay/agents/implementer.md` | 773-780 | "Never edit the test silently" / dispute anti-pattern — context for why this phase deliberately adds NO dispute-guidance prose (that's Phase 4's scope) |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-write-test.md:241-258
### A.4.2 — Deterministic formatter discovery chain

Three branches, tried in order — never heuristic:

- (a) Read `<target_root>/docs/context/methodology.md` frontmatter
  and extract `formatter_cmd`. If present, non-null, non-empty:
  `formatter_cmd = <value>`, `discovery_source = "methodology.md
  formatter_cmd"`. Proceed to A.4.3.
- (b) Else read `<target_root>/package.json`. If `scripts.format`
  is a non-empty string: `formatter_cmd = "npm run format --"`
  (npm's documented `--` pass-through convention routes appended
  file-path arguments into the underlying script),
  `discovery_source = "package.json scripts.format"`. Proceed to
  A.4.3.
- (c) Else `formatter_cmd = null`, `discovery_source = "none — no
  formatter_cmd in methodology.md frontmatter and no package.json
  scripts.format"`. Record this **omission** explicitly at A.4.4 —
  never silently.
```
Task 1 copies this three-branch shape verbatim (only the section
number and target changes: `A.4.2` → the new `P5` step 1).

```
# SOURCE: plugins/relay/commands/relay-write-test.md:260-272
### A.4.3 — Invoke, scoped to the touched-file set ONLY

When `formatter_cmd` is non-null, run
`Bash("<formatter_cmd> <touched_file_1> <touched_file_2> ...")` —
the literal touched-file paths from A.4.1 appended as trailing
arguments, never a glob and never the whole repo (PRD Risk R1).
Capture stdout, stderr, and exit code via `BashOutput`.

- Exit code 0 → outcome = "formatted" ...
- Non-zero exit → outcome = "formatter invocation failed"; this is
  recorded but does **not** halt the command.
```
Task 1 copies this scoped-invocation discipline verbatim (touched-file
set replaced by this phase's own working-tree-wide collection).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:377-383
'**/test_*.py' '**/tests/**/*.py' '**/*.test.ts' '**/*.test.tsx'
'**/*.spec.ts' '**/*.spec.tsx' '**/*.test.js' '**/*.spec.js'
'**/*_test.go' '**/tests/**/*.rb' '**/*_spec.rb'
'**/__tests__/**' '**/*.test.rs' '**/*_test.rs'
'**/*.test.jsx' '**/*.test.mjs' '**/*.test.cjs' '**/spec/**'
```
Task 1 copies this exact 12-pattern pathspec set for the file-collection
step — deliberately R-X's own set, not `implementer.md`'s separate
10-pattern Step 2.3 set (the two diverge; see Risks).

```
# SOURCE: plugins/relay/commands/relay-implement.md:450
This sub-phase performs no commit action of any kind — any edits
from the post-visual fix round land uncommitted in the worktree (or
are reverted per Step B above), per the Pillar 2 "never commit"
invariant (`docs/decisions.md` 2026-05-18).
```
Task 1's step 5 mirrors this exact phrasing/citation pattern for its
own no-commit sub-step.

```
# SOURCE: plugins/relay/commands/relay-implement.md:177-196
### P5 — Base-commit derivable

Detect the base branch in priority order:
...
Record `base_commit` for use in Phase A diff capture.
```
Task 1 copies this section verbatim except the heading numeral
(`P5` → `P6`); its body content is unchanged.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/commands/relay-implement.md` | UPDATE | Adds the `P5 — Test-file formatting preflight` precondition, renumbers the existing base-commit precondition to `P6`, and names the new step in the command's own mission narration and frontmatter description (AC-3) |

## NOT Building (Scope Limits)

- **An R-X / D17 carve-out** — zero lines of `code-reviewer.md` are
  touched; the rule ships byte-identical (PRD AC-4).
- **Any mutating tool on the code-reviewer** — its read-only charter is
  untouched; this phase's edits are entirely within `relay-implement.md`.
- **A formatting sub-channel in `TEST_CONTRACT_DISPUTE`, or any
  dispute-guidance prose** — the PRD assigns the R-SEM/`implementer.md`
  dispute-guidance prose clarification (AC-7's prose half) to Phase 4.
  This phase's contribution to AC-7 is purely structural: by normalizing
  test files before the implementer runs, the scenario that would
  motivate a formatting dispute never arises in the first place. No task
  below edits `implementer.md` or `code-reviewer.md`'s R-SEM section.
- **Heuristic inference of `formatter_cmd`** — this phase calls the
  exact two-branch chain Phase 1/2 already closed; it never adds a third,
  environment-sniffing branch.
- **Formatting of non-test files** — the working-tree file-collection
  step is strictly scoped to the canonical test-glob pathspec set.
- **A dedicated, labeled normalization git commit** — ruled out by the
  Pillar 2 "never commit" invariant; see Solution Statement and the
  Decisions Log entry below.
- **`docs/decisions.md` / `docs/anti-patterns.md` entries for this
  phase's own change** — the source PRD's own Phase 5 ("Docs + release")
  owns the Decisions Log entry for the overall feature; Phase 3 does not
  pre-empt it.

## Step-by-Step Tasks

### Task 1: Insert the `P5 — Test-file formatting preflight` precondition into `plugins/relay/commands/relay-implement.md`

**ACTION**: `Edit` `plugins/relay/commands/relay-implement.md`. Locate the
exact text:

```
> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-implement
> (or /relay-code-review). No code has been changed and no review
> has been run.

### P5 — Base-commit derivable
```

Replace it with the same P4 HALT block, followed by a blank line, followed
by this new section, followed by a blank line, followed by the SAME
base-commit section heading renumbered to `P6`:

```
### P5 — Test-file formatting preflight

Runs once per `/relay-implement` invocation, BEFORE `base_commit` is
computed (P6 below) — so any formatting normalization this step
performs is already present in the working tree by the time Phase
A.2 captures its first `diff.patch`, rather than landing inside the
window the code-reviewer's R-X rule and the plan's Level 1
STATIC_ANALYSIS gate later inspect. Never HALTs: every branch below
is a soft, recorded outcome.

1. **Discover `formatter_cmd`.** Reuse the identical three-branch
   discovery chain `/relay-write-test`'s Phase A.4.2 already ships
   (`plugins/relay/commands/relay-write-test.md:241-258`) — do not
   reimplement it:
   - (a) Read `<target_root>/docs/context/methodology.md`
     frontmatter and extract `formatter_cmd`. If present, non-null,
     non-empty: `formatter_cmd = <value>`, `discovery_source =
     "methodology.md formatter_cmd"`. Proceed to step 2.
   - (b) Else read `<target_root>/package.json`. If `scripts.format`
     is a non-empty string: `formatter_cmd = "npm run format --"`,
     `discovery_source = "package.json scripts.format"`. Proceed to
     step 2.
   - (c) Else `formatter_cmd = null`, `discovery_source = "none — no
     formatter_cmd in methodology.md frontmatter and no package.json
     scripts.format"`. Record the omission at step 4 and skip to
     step 5 — never silently, never a HALT.

2. **Collect the canonical test-glob file set currently in the
   working tree.** Run, via `Bash`:
   `git ls-files --cached --others --exclude-standard -- '**/test_*.py' '**/tests/**/*.py' '**/*.test.ts' '**/*.test.tsx' '**/*.spec.ts' '**/*.spec.tsx' '**/*.test.js' '**/*.spec.js' '**/*_test.go' '**/tests/**/*.rb' '**/*_spec.rb' '**/__tests__/**' '**/*.test.rs' '**/*_test.rs' '**/*.test.jsx' '**/*.test.mjs' '**/*.test.cjs' '**/spec/**'`
   — the SAME pathspec set `code-reviewer.md`'s R-X rule itself
   inspects (`plugins/relay/agents/code-reviewer.md:377-383`),
   deliberately, so this step normalizes exactly the files whose
   formatting could later trip R-X or Level 1 (not `implementer.md`'s
   separate, narrower Step 2.3 set — the two sets diverge; binding to
   R-X's own set is what makes this step effective). This lists every
   tracked-or-untracked matching file present in the working tree
   right now, regardless of which prior phase added it — an
   already-approved suite from an earlier phase, sitting uncommitted,
   is exactly the AC-3 target, not only files this attempt is about
   to touch.

3. **Invoke, scoped to that file set ONLY.** When `formatter_cmd` is
   non-null and step 2's file set is non-empty, run
   `Bash("<formatter_cmd> <file_1> <file_2> ...")` — the literal
   paths from step 2 appended as trailing arguments, never a glob and
   never the whole repo (mirrors `/relay-write-test`'s A.4.3 scoped-
   invocation discipline, `relay-write-test.md:260-272`, PRD Risk R1).
   Capture the exit code.
   - Exit 0 → outcome = "formatted".
   - Non-zero → outcome = "formatter invocation failed" — record it,
     do NOT halt; Level 1 will surface any residual issue on its own
     terms.
   - Step 2's file set was empty → outcome = "nothing to format".
   - `formatter_cmd` is null (branch c) → outcome = "omitted — <the
     discovery_source detail from step 1c>".

4. **Record the outcome.** `Write` a JSON side-record at
   `<artifact_root>../preflight-formatting.json` (i.e.
   `PRPs/reports/<feature>/phase-<N>/preflight-formatting.json` in
   PRD mode, `PRPs/reports/<slug>/preflight-formatting.json` in
   PRD-less mode) with `{formatter_cmd, discovery_source,
   files_scoped: [...], outcome, exit_code_or_null}`. This is a
   command-owned record — distinct from any test-suite manifest, and
   it never masquerades as a `test-writer` lifecycle-ledger entry.

5. **No commit issued, ever.** All edits from step 3 land directly in
   the working tree, uncommitted — the same as every other
   `/relay-implement` mutation. This is the only sanctioned placement:
   relay's Pillar 2 "never commit" invariant (`docs/decisions.md`
   2026-05-18; restated at this file's own Phase A.3.4 step 6 and
   Phase A.3.5 step 7 above) is architectural and permanent, so a
   dedicated, labeled normalization commit — the alternative named in
   the source PRD's Open Questions / Risk R2 — is not available to
   this step: it would be the first commit `/relay-implement` ever
   makes. Formatting the working tree in place, before any
   `diff.patch` is captured, is the mechanism consistent with that
   invariant.

### P6 — Base-commit derivable
```

**MIRROR**: `# SOURCE: plugins/relay/commands/relay-write-test.md:241-258`
(discovery chain), `# SOURCE: plugins/relay/commands/relay-write-test.md:260-272`
(scoped invocation), `# SOURCE: plugins/relay/agents/code-reviewer.md:377-383`
(pathspec set), `# SOURCE: plugins/relay/commands/relay-implement.md:450`
(no-commit phrasing), `# SOURCE: plugins/relay/commands/relay-implement.md:177-196`
(section preserved, heading renumbered).

**VALIDATE**:
```bash
P5_LINE=$(grep -n "^### P5 — Test-file formatting preflight" plugins/relay/commands/relay-implement.md | head -1 | cut -d: -f1)
P6_LINE=$(grep -n "^### P6 — Base-commit derivable" plugins/relay/commands/relay-implement.md | head -1 | cut -d: -f1)
if [ -z "$P5_LINE" ] || [ -z "$P6_LINE" ] || [ "$P5_LINE" -ge "$P6_LINE" ]; then
  echo "FAIL: P5 preflight heading missing, or not positioned before P6 base-commit heading"
  exit 1
else
  echo "PASS: P5 ($P5_LINE) precedes P6 ($P6_LINE)"
fi
```

### Task 2: Name the new preflight step in the command's `## Your mission` narration

**ACTION**: `Edit` `plugins/relay/commands/relay-implement.md`. Locate the
exact text (the opening sentence of `## Your mission`):

```
Validate the plan path argument, run the preconditions check, then run an internal writer↔reviewer loop
```

Replace it with:

```
Validate the plan path argument, run the preconditions check — including a P5 test-file formatting preflight that normalizes any not-yet-formatter-clean test files in the working tree before base_commit (P6) is computed — then run an internal writer↔reviewer loop
```

**MIRROR**: `# SOURCE: plugins/relay/commands/relay-implement.md:12-16`
(existing mission-paragraph sentence structure — the edit inserts one
clause, changing no other wording).

**VALIDATE**:
```bash
grep -q "P5 test-file formatting preflight that normalizes any not-yet-formatter-clean test files" plugins/relay/commands/relay-implement.md
```

### Task 3: Name the new preflight step in the command's YAML frontmatter `description:` field

**ACTION**: `Edit` `plugins/relay/commands/relay-implement.md`. Locate the
exact text in the frontmatter (line 2):

```
Validates the plan path, runs preconditions, then adopts the implementer/code-reviewer pair
```

Replace it with:

```
Validates the plan path, runs preconditions — including a P5 formatting-preflight precondition ahead of base_commit (P6) — then adopts the implementer/code-reviewer pair
```

**MIRROR**: `# SOURCE: plugins/relay/commands/relay-implement.md:2` (existing
frontmatter `description:` sentence structure — the edit inserts one
clause, changing no other wording).

**VALIDATE**:
```bash
grep -q "P5 formatting-preflight precondition ahead of base_commit" plugins/relay/commands/relay-implement.md
```

## Validation Commands

### Level 1: STATIC_ANALYSIS
```bash
npm run validate
```
(Must exit 0 — the repo's 14-check static-consistency gate.)

### Level 2: CONTENT_INVARIANTS
```bash
if git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md | grep -q .; then
  echo "FAIL: code-reviewer.md was modified — R-X/D17 must stay byte-identical (PRD AC-4)"
  exit 1
else
  echo "PASS: code-reviewer.md untouched by this phase"
fi
```

### Level 3: INTEGRATION / DRY-RUN
```bash
P5_LINE=$(grep -n "^### P5 — Test-file formatting preflight" plugins/relay/commands/relay-implement.md | head -1 | cut -d: -f1)
P6_LINE=$(grep -n "^### P6 — Base-commit derivable" plugins/relay/commands/relay-implement.md | head -1 | cut -d: -f1)
DISCOVERY_COUNT=$(grep -c "formatter_cmd" plugins/relay/commands/relay-implement.md)
if [ -z "$P5_LINE" ] || [ -z "$P6_LINE" ] || [ "$P5_LINE" -ge "$P6_LINE" ] || [ "$DISCOVERY_COUNT" -lt 1 ]; then
  echo "FAIL: preflight ordering or formatter_cmd chain reuse missing from relay-implement.md"
  exit 1
else
  echo "PASS: preflight precedes base-commit ($P5_LINE < $P6_LINE); formatter_cmd referenced $DISCOVERY_COUNT time(s)"
fi
```

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** Given an APPROVED suite whose test files are not
  formatter-clean, when `/relay-implement` starts, the new `P5` precondition
  normalizes those test files — via the reused `formatter_cmd` discovery
  chain, scoped to the canonical test-glob file set currently in the working
  tree — before `base_commit` (now `P6`) is computed, with no commit created.
- **AC-A2 (PRD AC-4):** Given this phase's diff, `plugins/relay/agents/code-reviewer.md`
  never appears in it — the `## Files to Change` table names only
  `relay-implement.md` — so the R-X rule and D17 text remain byte-identical,
  verified structurally by the Level 2 Validation Command above.
- **AC-A3 (PRD AC-7, structural half):** Given the shipped
  `relay-implement.md`, its `TEST_CONTRACT_DISPUTE` arbitration-mode routing
  (Phase A.3) gains no formatting sub-channel and no new dispute-guidance
  prose from this phase — the structural prevention (AC-A1) removes the
  scenario that would motivate a formatting dispute; the prose half of AC-7
  is deliberately deferred to Phase 4 (see NOT Building).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Formatter over-reach touches non-test files | M | M | Step 2/3 scope invocation to the literal collected test-glob file-set paths only — never a glob, never the whole repo (mirrors `relay-write-test.md` A.4.3, PRD Risk R1) |
| Dedicated normalization commit would violate Pillar 2 "never commit" | was a live Open Question | High if chosen wrongly | Resolved: no commit. Formatting lands directly, uncommitted, in the working tree, per `docs/decisions.md` 2026-05-18 (source PRD Risk R2) |
| `formatter_cmd` as an autonomous command-injection surface | L | M | Sourced only from the human-owned `methodology.md`/`package.json`, the same trust model as Phase 1/2 and the plan's own Validation Commands |
| Two divergent canonical test-glob pathspec sets exist in the repo (`code-reviewer.md:377-383`, 12 patterns including `.rb`/`.rs`/`spec/**`, vs `implementer.md:396-409`, a 10-pattern set without `.rb`) | M | M | This phase binds Task 1's file-collection step to `code-reviewer.md`'s set — the actual R-X enforcement point — since that is what decides pass/fail; reconciling the two sets is out of this phase's scope and is not required by PRD AC-3 |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
when a test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger
(`/relay-write-test` → `/relay-test-write-review`), not authored by the
Implementer — R-X is a blanket straight-fail on any test glob in the
Implementer's diff. No task below and no `## Files to Change` row targets
a test file, so this plan's `**VALIDATE**` commands exercise the change
directly rather than invoking the test framework.

**`diff_target` mechanics — an observed, pre-existing inconsistency, out of
scope here:** `relay-implement.md`'s Phase A.2/A.3 passes
`diff_target: "<artifact_root><attempt>/diff.patch"` (a file path) to
`code-reviewer`, while `code-reviewer.md`'s own Inputs section documents
`diff_target` as "a base ref (default `HEAD~1`)" consumed via
`git diff --name-only <diff_target>..HEAD`. This plan does not attempt to
reconcile that mismatch — doing so would mean touching `code-reviewer.md`'s
R-X/Phase-1 logic, which PRD AC-4 forbids for this phase. The preflight
step is designed to be correct regardless of how that ambiguity ultimately
resolves: it normalizes test-file content in the working tree before ANY
diff is captured (Phase A.2's first `git diff <base_commit>`), so whichever
mechanism downstream code actually executes, the test files it inspects are
already formatter-clean at the earliest possible point.

**Open Question resolution (source PRD Risk R2):** "dedicated, labeled
normalization commit before baseline capture" vs. "other placement" is
resolved in favor of the latter — direct, uncommitted working-tree
normalization — because relay's Pillar 2 "never commit" invariant
(`docs/decisions.md` 2026-05-18) is architectural and permanent, and a
normalization commit would be the first commit `/relay-implement` has ever
made. This also means the new `preflight-formatting.json` side-record
(Task 1 step 4) is a plain `PRPs/reports/` artifact, not a commit trailer
or commit message.

**AC-7 prose deferred to Phase 4, by design:** the source PRD assigns the
explicit "the implementer must not open `TEST_CONTRACT_DISPUTE` for
formatting" prose to Phase 4 (`code-reviewer.md` R-SEM section +
`implementer.md` dispute guidance). This phase's contribution to AC-7 is
structural only (AC-A3 above) — no task here edits `implementer.md` or
`code-reviewer.md`.

*Generated: 2026-08-26*
*Approved: 2026-08-26*
*Implemented: 2026-08-26*
*Status: IMPLEMENTED*
