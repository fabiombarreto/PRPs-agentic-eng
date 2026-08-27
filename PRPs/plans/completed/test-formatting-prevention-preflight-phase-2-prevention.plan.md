# Feature: Prevention (Phase 2 of test-formatting-prevention-preflight)

```
**Decision Gate**
- Active context: none
- Activated criteria: command-layer protocol extension in `plugins/relay/commands/`; cross-cutting artifact creation (the formatting-outcome record consumed downstream by `test-reviewer`); reuse of existing components (methodology.md key-read-with-default-on-absence pattern, suite-manifest `Edit` pattern)
- Decisions found:
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` — the new `formatter_cmd` key (shipped Phase 1) is consumed here non-heuristically, via the same emit/preserve/backfill contract already established for `tdd`/`docs_sync`/`figma_track`.
  - [2026-07-10] Test pair universalized — R-X strict preserved verbatim; the writer/reviewer split (`test-writer` create/update/delete authority, `test-reviewer` DRAFT→APPROVED flip) is untouched by this phase.
  - [2026-04-30] Code-reviewer has no `Edit` tool (read-only charter) — the same least-privilege reasoning is why this phase keeps `test-writer`'s tools allowlist Bash-free and puts formatting ownership at the command layer instead (source PRD's own Decisions Log, "Prevention ownership" row, session-recorded; promoting it into `docs/decisions.md` itself is Phase 5's "docs/decisions.md entry" scope item, not this phase's).
  - [2026-04-25] Plan filenames carry the source PRD phase number and slug — governs this plan's own path.
- Applicable anti-patterns:
  - "Activating the test pair by heuristic" — extends here: `formatter_cmd` discovery is a fixed three-branch deterministic chain (frontmatter → `package.json` `scripts.format` → recorded omission), never inferred from file extensions, installed devDependencies, or config presence.
  - "Weakening or deleting tests to make the auto-correction loop turn green" — a formatter mutates test-file bytes; the whole feature's premise (source PRD Proposed Solution) is that this mutation is provably semantics-free (whitespace/formatting only), the same trust model as the plan's own Validation Commands. This phase does not add its own semantic-equivalence verification — that would duplicate the trust model the PRD already established for `formatter_cmd`.
  - "Writing pipeline artifacts under `.claude/`" — the formatting-outcome record lands inside the existing `PRPs/reports/<feature>/test-suite.diff` manifest; no new artifact root is introduced.
- Applicable architectural rules:
  - Writer/reviewer split with reviewer-owned flips — `test-reviewer` still owns the suite manifest's DRAFT→APPROVED flip; this phase's `Edit` on the manifest only appends an informational section and never touches the trailing `*Status:*` line's semantics.
  - Interactivity boundary — Phase A.4 runs autonomously inside `/relay-write-test`, no dialogue, no HALT-on-formatter-failure (soft-fail only).
  - PRP artifact paths convention — no new path introduced; the record is appended to the manifest already at `PRPs/reports/<feature>/test-suite.diff`.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-formatting-prevention-preflight.prd.md` — Implementation Phases row 2:
  "Prevention" — Goal: Suites leave `/relay-write-test` formatter-clean, or with a
  recorded omission. — Success signal: AC-1 and AC-2 demonstrable on a fixture
  project with and without a discoverable formatter.

## Summary

Add a command-layer formatting step to `/relay-write-test`: a new `## Phase A.4 —
Command-layer formatting (Prevention)` sub-phase that runs immediately after the
`test-writer` agent returns a non-halting verdict (`SUITE_DRAFT_WRITTEN` or
`EXISTING_COVERAGE_SUFFICIENT`) and before the command's Final output surface —
i.e. strictly before any later, separate invocation of `/relay-test-write-review`
could ever dispatch `test-reviewer`. The step collects the suite's touched test
files, runs a deterministic three-branch discovery chain for a formatter command
(`formatter_cmd` in `methodology.md` → `package.json` `scripts.format` → recorded
omission), invokes the formatter scoped strictly to the touched-file list, and
records the outcome (command, discovery source, files touched, or omission) as a
new `## Formatting Outcome` section appended to the existing `test-suite.diff`
manifest via a command-owned `Edit` — mirroring the exact `Edit`-on-manifest +
soft-fail pattern `/relay-test-write-review`'s own Phase A.3 already establishes.
`test-reviewer` gains one informational Phase 0 awareness bullet documenting that
this section may be present on the manifest it already reads in full — resolving
the PRD's "where does the record land" Open Question without adding a new rubric
id or a sibling artifact file. `test-writer`'s tools allowlist
(`Task, Read, Write, Edit, Glob`) is untouched — prevention ownership stays
strictly at the command layer, per the source PRD's explicit DECIDED constraint.

## User Story

As a relay pipeline operator running `/relay-write-test` on a formatter-enforcing
project
I want the DRAFT test suite to be formatter-clean (or to carry an explicit,
auditable omission note) the moment the Writer returns
So that the suite the Implementer later inherits never forces a choice between
failing Level 1 STATIC_ANALYSIS and failing `code-reviewer`'s R-X guard

## Problem Statement

Narrowed to this phase: `test-writer` has no formatting step and no `Bash` in its
tools allowlist (`plugins/relay/agents/test-writer.md:6`), so every DRAFT suite it
produces is formatted however the agent happened to emit it — not necessarily
matching the target project's formatter conventions. Nothing today records whether
a formatter was even considered, so a project with a discoverable
`formatter_cmd`/`scripts.format` gets no benefit from it at suite-authoring time,
and a project with neither gets no visibility into that fact.

## Solution Statement

Insert the formatting step at the one point in the pipeline where it can run
without adding `Bash` to any agent: the `/relay-write-test` command itself, after
`test-writer`'s Phase 3.2 confirmation and before the command's own Final output
surface. Discovery is a fixed, non-heuristic three-branch chain. Invocation is
scoped to exactly the suite's touched test-file paths (never a glob, never the
whole repo — PRD Risk R1). The outcome — including the "nothing discoverable"
case — is always recorded, appended to the manifest `test-reviewer` already reads
in Phase 0, which is what makes `test-reviewer` "aware" of the record without any
new rubric row or second artifact file.

## Metadata

| Key | Value |
|---|---|
| Type | Feature (command-layer protocol extension) |
| Complexity | Medium |
| Systems Affected | `/relay-write-test` command (`plugins/relay/commands/relay-write-test.md`); `test-reviewer` agent (informational awareness only) |
| Dependencies | Phase 1 (formatter_cmd contract) — `complete` |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/test-formatting-prevention-preflight.prd.md:292-293,345-353` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/commands/relay-write-test.md` | 1-327 | The command file this phase edits; must be read whole to find the exact insertion point (after Writer adoption, before "There is no Phase B") and to avoid disturbing any existing precondition, constraint, or halt message. |
| P0 | `plugins/relay/agents/test-writer.md` | 1-30, 457-520 | Confirms the `tools:` allowlist invariant this phase must not touch (line 6) and the exact manifest template/trailing block (`## Status\n\n*Status: DRAFT*`, lines 497-499) the new `Edit` must anchor on byte-for-byte. |
| P0 | `plugins/relay/agents/test-reviewer.md` | 1-20, 91-159 | Confirms Phase 0's exact `<suite_path>` extraction bullet list (where the new informational awareness bullet is inserted) and the seven-canonical-rubric-id constraint (hard constraint 4) this phase must not violate by adding an eighth id. |
| P1 | `plugins/relay/commands/relay-implement.md` | 217-219 | Canonical `methodology.md` key-read-with-default-on-absence pattern (`docs_sync`, `figma_track`) mirrored here for `formatter_cmd` discovery. |
| P1 | `plugins/relay/commands/relay-test-write-review.md` | 187-232 | Canonical command-owned `Edit`-on-manifest + soft-fail pattern (A.3/A.4) mirrored here for the formatting-outcome record. |
| P1 | `docs/context/methodology.md` (worktree copy, post-Phase-1) | 79-101 | The `formatter_cmd` contract Phase 1 already shipped — the `## Formatter` section's emit/preserve/backfill rules and its explicit forward-reference naming this phase's command (`/relay-write-test`) as the first consumer. |
| P2 | `PRPs/prds/test-formatting-prevention-preflight.prd.md` | 110-168, 278-297, 345-353 | Source PRD: AC-1/AC-2 text, Technical Risks (R1 formatter over-reach), Phase 2 Goal/Scope/Success-signal. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-implement.md:217
Read `<target_root>/docs/context/methodology.md` frontmatter and extract the `docs_sync` key, recording `docs_sync_enabled` (boolean). Default `true` when the key is absent, mirroring the `tdd` absence-handling precedent and `docs-updater.md`'s own default-true-when-absent handling of the same key (`docs/context/methodology.md:45-65`).
```
Copied by: Task 1 (A.4.2 discovery-chain branch (a) — read `formatter_cmd` from `methodology.md` frontmatter with an explicit absent/null fallback).

```
# SOURCE: plugins/relay/agents/test-reviewer.md:293-304
Invoke via `Bash` the test command for `test_frameworks[0]`, regardless of `mode`. The command form depends on the framework:
- pytest → `pytest <new_test_paths>`
- vitest → `npx vitest run <new_test_paths>`
- jest → `npx jest <new_test_paths>`
- ExUnit → `mix test <new_test_paths>`
- RSpec → `bundle exec rspec <new_test_paths>`
Capture stdout + stderr + exit code via `BashOutput`.
```
Copied by: Task 2 (A.4.3 — invoking the discovered formatter scoped to the explicit touched-file list, never a glob, captured via `BashOutput`).

```
# SOURCE: plugins/relay/commands/relay-test-write-review.md:187-209
Use `Edit` with:
- `file_path`: `<suite_path>`
- `old_string`: `*Status: DRAFT*`
- `new_string`: `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`
- `replace_all`: `false`
...
If `Edit` fails (the trailing line was not exactly `*Status: DRAFT*` despite P2 passing — possible if a hook mutated the file between P2 and A.3), surface the failure: ... This is a soft-fail — the rubric verdict is preserved in the JSONL.
```
Copied by: Task 2 (A.4.4 — the command-owned `Edit` that appends the `## Formatting Outcome` section to the manifest, plus its soft-fail-on-mismatch handling).

```
# SOURCE: plugins/relay/agents/test-writer.md:6
tools: Task, Read, Write, Edit, Glob
```
Copied by: Task 3 (the new Constraints bullet protecting this exact line — no `Bash` added).

```
# SOURCE: plugins/relay/agents/test-writer.md:497-499
## Status

*Status: DRAFT*
```
Copied by: Task 2 (the literal `old_string` anchor the new `Edit` call must match byte-for-byte).

```
# SOURCE: plugins/relay/agents/test-reviewer.md:95-102
- `<suite_path>` — the `test-suite.diff` manifest. Extract:
  - Aggregate verdict from B7 (`SUITE_DRAFT_WRITTEN` or `EXISTING_COVERAGE_SUFFICIENT`).
  - The source PRD path.
  - The source plan path (the manifest's `# Source plan:` header).
  - The list of new test files written this session.
  - The list of `EXISTING_TEST_COVERS` mappings (`AC-N → path:line`).
```
Copied by: Task 4 (the exact bullet list the new informational "## Formatting Outcome" awareness bullet is appended to).

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/commands/relay-write-test.md` | UPDATE | Add the command-layer `## Phase A.4 — Command-layer formatting (Prevention)` step (touched-file collection, discovery chain, scoped invocation, manifest-record `Edit`, soft-fail handling), plus supporting Constraints and Final-output-surface additions. |
| `plugins/relay/agents/test-reviewer.md` | UPDATE | Add one informational Phase 0 awareness bullet for the optional `## Formatting Outcome` manifest section — no new rubric row, preserving the seven-canonical-id taxonomy (hard constraint 4). |

## NOT Building (Scope Limits)

- **An R-X / D17 carve-out** — untouched by this phase; the guard's text ships
  byte-identical (Phase 4's concern, not this one's).
- **Any mutating tool on `code-reviewer`** — irrelevant to this phase.
- **A formatting sub-channel in `TEST_CONTRACT_DISPUTE`** — Phase 4 scope.
- **Heuristic inference of `formatter_cmd`** — already resolved by Phase 1; this
  phase only *consumes* the key via the fixed three-branch chain, never infers.
- **Semantic-diff / "formatting-only" diff classifiers** — no shipped system uses
  this as a permission mechanism (source PRD Research Summary); not built here.
- **Formatting of non-test files** — Phase A.4.3 is strictly scoped to the
  touched-file list from A.4.1; this is the direct Risk R1 mitigation.
- **The `/relay-implement` preflight (normalizing formatting before
  `base_commit`/`diff_target` capture)** — that is Phase 3 ("Preflight"), a
  separate phase, not built here.
- **Adding `Bash` to `test-writer`'s tools allowlist** — explicit DECIDED
  constraint; prevention ownership is the command layer only.
- **A new `test-reviewer` rubric row / new legitimacy check for formatting** —
  Phase 2's "test-reviewer awareness" requirement is satisfied by an
  informational Phase 0 read, never a gating check.
- **Promoting the "Prevention ownership: Command layer" decision into
  `docs/decisions.md` itself** — that dated entry is Phase 5's
  "`docs/decisions.md` entry" scope item.

## Step-by-Step Tasks

### Task 1: relay-write-test.md — collect touched test files + deterministic discovery chain

- **ACTION**: In `plugins/relay/commands/relay-write-test.md`, insert a new
  `## Phase A.4 — Command-layer formatting (Prevention)` section immediately
  after the existing "Run Phases 0 through 3 as specified by `test-writer.md`..."
  paragraph and its three-verdict bullet list, and before the existing
  "**There is no Phase B.**" sentence. This step runs only when the Writer's
  Phase 3.2 confirmation reports `SUITE_DRAFT_WRITTEN` or
  `EXISTING_COVERAGE_SUFFICIENT` — never on an `AMBIGUOUS` halt. Open with two
  sub-steps:
  - **A.4.1 — Collect the suite's touched test-file paths**: read the
    just-written `test-suite.diff` manifest; the touched-file set = every path
    under "## Test files written this session" UNION every UPDATE-classified
    lifecycle-ledger row's file component (DELETE rows name a file that no
    longer exists, so they are excluded; `EXISTING_TEST_COVERS` mappings are
    excluded — that file was not touched this session). If the set is empty,
    skip straight to A.4.4 and record: "no test files touched this session —
    formatter not invoked (nothing to format)".
  - **A.4.2 — Deterministic formatter discovery chain**: (a) read
    `<target_root>/docs/context/methodology.md` frontmatter and extract
    `formatter_cmd` — if present, non-null, non-empty, `formatter_cmd = <value>`
    and `discovery_source = "methodology.md formatter_cmd"`, proceed to A.4.3;
    (b) else read `<target_root>/package.json` — if `scripts.format` is a
    non-empty string, `formatter_cmd = "npm run format --"` (npm's documented
    `--` pass-through convention routes appended file-path arguments into the
    underlying script) and `discovery_source = "package.json scripts.format"`,
    proceed to A.4.3; (c) else `formatter_cmd = null`,
    `discovery_source = "none — no formatter_cmd in methodology.md frontmatter
    and no package.json scripts.format"`, and record this **omission**
    explicitly at A.4.4 — never silently.
  - **Implements AC-A1** (the touched-file collection and discovery chain are
    the prerequisite steps that let A.4.3 run the formatter scoped to the
    suite's test files before test-reviewer dispatch) **and AC-A2** (the
    discovery chain's branch (c) is exactly what produces the explicit,
    never-silent omission record).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-implement.md:217`
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q '## Phase A.4' plugins/relay/commands/relay-write-test.md
  grep -q 'formatter_cmd' plugins/relay/commands/relay-write-test.md
  grep -q 'scripts.format' plugins/relay/commands/relay-write-test.md
  grep -q 'omission' plugins/relay/commands/relay-write-test.md
  ```

### Task 2: relay-write-test.md — scoped invocation + manifest record + soft-fail

- **ACTION**: Continue the `## Phase A.4` section with:
  - **A.4.3 — Invoke, scoped to the touched-file set ONLY**: when
    `formatter_cmd` is non-null, run
    `Bash("<formatter_cmd> <touched_file_1> <touched_file_2> ...")` — the
    literal touched-file paths from A.4.1 appended as trailing arguments, never
    a glob and never the whole repo (PRD Risk R1); capture stdout, stderr, and
    exit code via `BashOutput`. Exit code 0 → outcome = "formatted" (best-effort
    capture of which files the tool itself reports changed, falling back to the
    touched-file list if the tool is silent on this). Non-zero exit → outcome =
    "formatter invocation failed"; this is recorded but does **not** halt the
    command.
  - **A.4.4 — Record the outcome on the suite manifest**: `Edit`
    `<target_root>/PRPs/reports/<feature>/test-suite.diff` with
    `old_string: "\n## Status\n\n*Status: DRAFT*"`,
    `new_string: "\n## Formatting Outcome\n\n<rendered outcome block>\n\n##
    Status\n\n*Status: DRAFT*"`, `replace_all: false` — one of the four
    rendered-outcome shapes (formatted / failed / nothing-to-format / omitted).
    If the `Edit` fails (the trailing block text did not match exactly): this is
    a **soft-fail** — surface a warning in the command's own narration (not a
    HALT), proceed to Final output surface with `*Status: DRAFT*` intact and the
    formatting outcome explicitly noted as unrecorded in that surfaced warning.
  - **Implements AC-A1** (A.4.3's scoped invocation is what runs the formatter
    before test-reviewer dispatch, and A.4.4 is the manifest record AC-A1
    requires), **AC-A2** (A.4.4 renders the omission shape when A.4.2 produced
    no `formatter_cmd`), **AC-A3** (A.4.3 builds the `Bash` command strictly
    from the A.4.1 touched-file list — never a glob, never the whole repo),
    and **AC-A6** (A.4.3's non-zero-exit branch records the failure and does
    not halt the command).
- **MIRROR**: `# SOURCE: plugins/relay/agents/test-reviewer.md:293-304` and
  `# SOURCE: plugins/relay/commands/relay-test-write-review.md:187-209` and
  `# SOURCE: plugins/relay/agents/test-writer.md:497-499`
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q 'BashOutput' plugins/relay/commands/relay-write-test.md
  grep -q 'Formatting Outcome' plugins/relay/commands/relay-write-test.md
  grep -q 'soft-fail' plugins/relay/commands/relay-write-test.md
  grep -q '## Status' plugins/relay/agents/test-writer.md
  ```

### Task 3: relay-write-test.md — Constraints, "What you do NOT do", Final output surface

- **ACTION**: In `## Constraints (hard rules)`, add two bullets: "**Never
  invoke the formatter unscoped.**" (the `Bash` command is built by appending
  the explicit touched-file-path list from A.4.1; never a bare `formatter_cmd`
  call, never `.`, never a glob) and "**A failing or unconfigured formatter
  never blocks suite authoring.**" (A.4.3's non-zero-exit branch and A.4.2's
  omission branch both record and continue; the Writer's DRAFT suite is always
  surfaced). In `## What you do NOT do`, add: "**Never add `Bash` to
  `test-writer`'s tools allowlist.**" — prevention ownership is the command
  layer; the agent's allowlist stays `Task, Read, Write, Edit, Glob` (DECIDED
  constraint). In `## Final output surface`, append one command-owned line
  after `test-writer`'s verbatim Phase 3.2 confirmation, summarizing the Phase
  A.4 outcome, e.g. `Formatting: <formatted <n> files via <source> | omitted —
  no formatter discoverable | nothing to format>.`
  - **Implements AC-A3** (the new Constraints bullet makes the scoped-only
    invocation rule explicit and durable, not merely an artifact of how A.4.3
    happens to be worded) and **AC-A4** (the "Never add `Bash`" Constraints
    bullet and the `## What you do NOT do` addition are what keep
    `test-writer`'s tools allowlist byte-identical, per the Constraints bullet
    protecting `# SOURCE: plugins/relay/agents/test-writer.md:6`).
- **MIRROR**: `# SOURCE: plugins/relay/agents/test-writer.md:6`
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q 'Never invoke the formatter unscoped' plugins/relay/commands/relay-write-test.md
  grep -q 'Never add `Bash` to `test-writer`' plugins/relay/commands/relay-write-test.md
  grep -q '^tools: Task, Read, Write, Edit, Glob$' plugins/relay/agents/test-writer.md
  ```

### Task 4: test-reviewer.md — informational Phase 0 awareness bullet

- **ACTION**: In `plugins/relay/agents/test-reviewer.md`'s Phase 0 setup file
  list (the bullet enumerating what to extract from `<suite_path>`), add one new
  sub-bullet immediately after the existing "The list of `EXISTING_TEST_COVERS`
  mappings (`AC-N → path:line`)" bullet: "- A `## Formatting Outcome` section,
  when present (informational only — the command-layer record of
  `/relay-write-test` Phase A.4's discovery/format step; **NOT a rubric input**,
  and reading it never produces or removes a rubric row)."
  - **Implements AC-A5** (this is exactly the "`test-reviewer` documents
    reading it for informational awareness" half of AC-A5 — the manifest-side
    `## Formatting Outcome` section is authored by Task 2; this task is the
    reader-side awareness bullet AC-A5 also requires).
- **MIRROR**: `# SOURCE: plugins/relay/agents/test-reviewer.md:95-102`
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q 'Formatting Outcome' plugins/relay/agents/test-reviewer.md
  grep -q 'NOT a rubric input' plugins/relay/agents/test-reviewer.md
  ```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```
npm run validate
```
(14 static consistency checks over `plugins/relay/`; exits non-zero on any
violation — a real tool exit code, no wrapping needed.)

**Level 2 — CONTENT_INVARIANTS**
```
set -euo pipefail

# DECIDED constraint: test-writer's tools allowlist must stay byte-identical
grep -q '^tools: Task, Read, Write, Edit, Glob$' plugins/relay/agents/test-writer.md

# The new command-layer formatting step must exist
grep -q '## Phase A.4' plugins/relay/commands/relay-write-test.md

# The three-branch discovery chain must be named explicitly (never heuristic)
grep -q 'formatter_cmd' plugins/relay/commands/relay-write-test.md
grep -q 'scripts.format' plugins/relay/commands/relay-write-test.md

# AC-2: the omission-recording language must be present, never silent
grep -q 'omission' plugins/relay/commands/relay-write-test.md

# test-reviewer must document informational awareness of the record
grep -q 'Formatting Outcome' plugins/relay/agents/test-reviewer.md
grep -q 'NOT a rubric input' plugins/relay/agents/test-reviewer.md

echo "PASS: all command-layer formatting invariants present"
```

**Level 3 — DRY-RUN END-TO-END**
```
set -euo pipefail

# Extension 7 pattern grounding: the Phase A.4.4 Edit anchor must be grounded
# in test-writer.md's own manifest template — never a guessed anchor.
grep -q '## Status' plugins/relay/agents/test-writer.md
grep -q '\*Status: DRAFT\*' plugins/relay/agents/test-writer.md

# The command file's own new section names the same anchor text, so the
# Edit call documented in Phase A.4.4 will match test-writer's real output
# at runtime.
grep -q '## Formatting Outcome' plugins/relay/commands/relay-write-test.md
grep -q '## Status' plugins/relay/commands/relay-write-test.md

echo "PASS: formatting-outcome Edit anchor is grounded end-to-end"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a target project with a discoverable
  `formatter_cmd` (or `package.json` `scripts.format`), when
  `/relay-write-test`'s Writer returns `SUITE_DRAFT_WRITTEN` or
  `EXISTING_COVERAGE_SUFFICIENT` with ≥1 touched test file, then Phase A.4 runs
  the formatter scoped to exactly those touched paths — strictly before any
  later, separate `/relay-test-write-review` invocation could dispatch
  `test-reviewer` — and records command / discovery-source / files-touched in a
  `## Formatting Outcome` section appended to the suite manifest.
- **AC-A2 (PRD AC-2):** Given neither `formatter_cmd` nor `scripts.format` is
  discoverable, when Phase A.4 runs, then formatting is skipped and the
  omission — including the discovery chain attempted — is recorded explicitly
  in the `## Formatting Outcome` section, never silently.
- **AC-A3 (PRD AC-1):** Given any touched-file set, when Phase A.4 invokes the
  formatter, then the invocation is scoped to exactly the touched-file paths
  (never a glob, never the whole repo) by construction — the `Bash` command is
  built by appending the literal file-path list, never invoking the bare
  `formatter_cmd` alone.
- **AC-A4 (PRD AC-1; Decisions Log "Prevention ownership" row):** Given
  `test-writer`'s tools frontmatter (`Task, Read, Write, Edit, Glob`), when
  this phase ships, then the allowlist is byte-identical — zero `Bash` added
  — because prevention ownership is the command layer (`relay-write-test.md`),
  never the agent. This derives most directly from the source PRD's Decisions
  Log "Prevention ownership" row (command layer chosen over granting `Bash`
  to `test-writer`, for least-privilege reasons) rather than from AC-1's own
  text, which describes the formatter *running*, not the allowlist staying
  untouched; AC-1 is cited alongside it because AC-1 is the acceptance
  criterion whose "the command layer runs the formatter" clause is the
  concrete mechanism this constraint protects.
- **AC-A5 (PRD AC-1):** Given the shipped change, when a human or
  `test-reviewer` reads the suite manifest, then a `## Formatting Outcome`
  section is present (or an explicit "nothing to format" / omission note), and
  `test-reviewer.md`'s own Phase 0 documents reading it for informational
  awareness — satisfying "test-reviewer awareness of the record" without adding
  a new rubric id.
- **AC-A6 (PRD AC-1):** Given a formatter invocation that fails (non-zero
  exit), when Phase A.4 handles it, then the failure is recorded on the
  manifest and does NOT halt `/relay-write-test` or block the Writer's DRAFT
  suite from being surfaced.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Formatter over-reach: a naively invoked project formatter touches non-test files | M | M | A.4.3 invokes strictly via `<formatter_cmd> <touched_file_1> ... <touched_file_N>` — the explicit touched-file list from A.4.1, never a glob or `.`; Task 1/Task 2 VALIDATE commands confirm the design is actually authored, not merely described. |
| `formatter_cmd` as command-injection surface (arbitrary autonomous execution) | L | M | Sourced only from human-owned `methodology.md` (or an existing human-authored `package.json` script) — same trust model as the plan's own Validation Commands (source PRD Architecture Notes); no new trust boundary introduced here. |
| A failing/misconfigured formatter blocks suite authoring entirely | L | M | A.4.3's non-zero-exit branch records the failure on the manifest and explicitly does NOT halt `/relay-write-test` — the Writer's DRAFT suite is still surfaced (AC-A6). |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in
`docs/context/methodology.md`: **false**. Test-after ordering — when a test
framework is declared, the test pair (test-writer/test-reviewer) authors and
maintains the suite from the Acceptance Criteria above, after the Implementer +
Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are routed
through the `test-writer`/`test-reviewer` pair's lifecycle ledger
(`/relay-write-test` → `/relay-test-write-review`), not authored by the
Implementer — R-X is a blanket straight-fail on any test glob in the
Implementer's diff. No task below and no `## Files to Change` row targets a
test file (`plugins/relay/commands/relay-write-test.md` and
`plugins/relay/agents/test-reviewer.md` are prompt/protocol markdown, not test
files), so this plan's `**VALIDATE**` commands exercise the change directly
(structural `grep` checks against the actual authored prose and the
pre-existing `test-writer.md` template) rather than invoking a test framework.

**Open Question resolution (record landing spot):** the PRD's Open Question
"where the command-layer formatting record lands" is resolved here as a
command-owned section (`## Formatting Outcome`) **appended directly to
`test-writer`'s own `test-suite.diff` manifest**, not a sibling record file.
Rationale: `test-reviewer`'s Phase 0 already reads the entire manifest in one
pass; appending to it makes "test-reviewer awareness" true by construction with
zero new Reads, zero new inputs threaded through
`/relay-test-write-review`'s `Task` dispatch payload, and zero risk of the two
artifacts drifting out of sync. The alternative considered — a
`docs-updater.md`-style single top-of-file "Effective configuration" header
line (`docs-updater.md:337`) — was rejected because it would require every
downstream reader to parse a header format the manifest's own Step 3.1 template
does not otherwise use, whereas a full `## `-level section matches the
manifest's existing section-per-concern shape (`## AC outcomes`, `## Test files
written this session`, `## Lifecycle ledger`, `## Status`).

**Formatter_cmd trust model (unchanged from Phase 1):** `formatter_cmd` is an
arbitrary command executed autonomously, sourced exclusively from the
human-owned `docs/context/methodology.md` — the same trust model as this plan's
own Validation Commands. This phase performs no additional sandboxing or
semantic-equivalence verification of the formatter's output; the PRD's
Proposed Solution explicitly frames prevention as "not trust-based" precisely
because the artifact is formatted *before* the manifest is approved, not
because the formatter's own behavior is independently re-verified here.

**Relay repo's own exercise of this phase:** this repository's
`docs/context/methodology.md` currently declares `formatter_cmd: null` (Phase 1,
worktree copy) and its `package.json` has no `scripts.format` entry — so a
`/relay-write-test` run against this repo itself would exercise the AC-2
omission path, not the formatted path. Both paths are exercised by the Task
1–2 VALIDATE commands structurally (grepping for the literal chain and
omission language), since no test framework invocation of the actual Bash
protocol is possible for a prompt-only deliverable.

*Generated: 2026-08-26*
*Approved: 2026-08-26*
*Implemented: 2026-08-26*
*Status: IMPLEMENTED*
