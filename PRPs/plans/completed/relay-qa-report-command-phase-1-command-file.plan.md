# Feature: Command file (Phase 1 of relay-qa-report-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new plugin command file `plugins/relay/commands/relay-qa-report.md` (cross-cutting artifact consumed by the operator's human-validation workflow); adds a new command role category (QA / Support); command must never write pipeline artifacts under `.claude/`; command must not activate the test pair
- Decisions found:
  - 2026-04-19 Command surface — one command per stage; writer/reviewer split only for non-deterministic authoring. `/relay-qa-report` is a single LLM-judgment command with NO writer/reviewer pair (the human doing manual QA is the validator).
  - 2026-04-19 PRP artifacts live under `PRPs/`, never `.claude/` — command file at `plugins/relay/commands/`; report output at `PRPs/reports/<feature>/qa-report.md`.
  - 2026-04-19 `.claude/settings.json` allowlist: narrow patterns — `git status*` / `git diff*` already present in `docs/context/settings-allowlist.md`; the command only reads the diff, so no new allowlist patterns are needed.
  - 2026-04-19 Interactivity boundary — the command lives in the human validation gate between Pillar 2 (`/relay-execute`) and Pillar 3 (`/relay-commit`); it is not part of the autonomous loop.
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (`docs/anti-patterns.md:61-67`) — command file goes to `plugins/relay/commands/`; report to `PRPs/reports/<feature>/`; never under `.claude/`.
  - Weakening or hiding coverage to look green (`docs/anti-patterns.md:15-21`) — the report MUST surface cases covered by neither an automated nor a manual test explicitly; hiding a gap is the forbidden pattern this command exists to counter.
  - Activating the test pair by heuristic (`docs/anti-patterns.md:43-48`) — `/relay-qa-report` never runs, authors, or modifies tests; it only reports observed coverage and must not activate any test pair.
  - Treating `plugins/prp-core/` as active relay code (`docs/anti-patterns.md:71-76`) — prp-core command files are read-only format references, never imported into the authored command.
- Applicable architectural rules:
  - One command per stage (`docs/context/architecture.md:113-135`) — a new human-facing QA / Support command living in the human validation gate.
  - Interactivity boundary (`docs/context/architecture.md:60-92`) — invoked by the human in the validation gate; it must NOT be called by `/relay-execute`.
  - PRPs/ artifact-path convention (`docs/context/architecture.md:94-109`) — all pipeline artifacts under `PRPs/`, never `.claude/`.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-qa-report-command.prd.md` — Implementation Phases row 1: "Command file" — Goal: Produce `plugins/relay/commands/relay-qa-report.md` with a complete, unambiguous protocol — Success signal: File exists; a human reads the protocol and finds no ambiguity; all Acceptance Criteria AC-1..AC-9 are addressable from the protocol text. (Source PRD is APPROVED; this plan back-fills row 1 `Status` → `in-progress` and populates its `PRP Plan` cell.)

## Summary

This phase authors a single new relay command file, `plugins/relay/commands/relay-qa-report.md`, that generates a human-facing QA support report at `PRPs/reports/<feature>/qa-report.md`. The command is a single LLM-judgment prose protocol (no writer/reviewer pair). It opens with a Phase 0 four-way argument router (`.prd.md` path → PRD mode, `.plan.md` path → plan mode, non-empty free text → description mode, blank → uncommitted-diff mode), derives `<feature>` per mode, and emits a report enumerating test cases with a fixed seven-field schema. The approach composes three already-shipped relay patterns: `relay-plan.md`'s suffix-based mode detection, `relay-commit.md`'s current-branch `git status --porcelain` + `git diff` fallback, and the `FAILED_<REASON>:` named-HALT idiom. Two hard preconditions are encoded as named HALTs: a clean-working-tree HALT (`FAILED_NOTHING_TO_REPORT`) in diff mode, and an anti-overwrite guard so a regenerate never silently discards recorded manual statuses.

## User Story

```
As the relay maintainer acting as human QA in the validation gate between /relay-execute and Pillar 3
I want to run a single command that enumerates each test case with its coverage (automated / manual / none), required DB state, and a manual step-by-step
So that I can conduct manual testing efficiently and see the real coverage gaps without hand-reconstructing the report from the conversation and diff every time
```

## Problem Statement

After `/relay-execute` (or a manual implementation session) completes, the maintainer must validate the work by hand before committing, but there is no single artifact that says which automated tests exist, what they cover, what still needs manual testing, and what is covered by nothing at all. This phase is the root of the feature: without the command file itself, none of the downstream docs, site, or dogfood phases have anything to describe or exercise. The narrow scope of this phase is the protocol text — the routing, the schema, the honesty rule, and the HALT preconditions — authored unambiguously enough that a human reading it finds no gaps and every Acceptance Criterion AC-1..AC-9 is addressable from the prose.

## Solution Statement

Author `plugins/relay/commands/relay-qa-report.md` as a relay command markdown file with YAML frontmatter (`description`, `argument-hint`; no `allowed-tools` key — relay commands are prose protocols the invoking session executes inline). The body defines: a Phase 0 four-way router with per-mode `<feature>` derivation; a seven-field per-case report schema (title, risk level, required state, coverage, automated test path, manual status, manual step-by-step) written to `PRPs/reports/<feature>/qa-report.md`; an honesty rule that lists any case covered by neither an automated nor a manual test explicitly as uncovered; `record.json` grounding for the automated-coverage column when present with honest degradation when absent; and two named-HALT preconditions (`FAILED_NOTHING_TO_REPORT` on a clean tree in diff mode, and an anti-overwrite guard). No agents, hooks, or scripts are produced in this phase.

## Metadata

| Key | Value |
|-----|-------|
| Type | Command authoring (relay plugin command file / prose protocol) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/commands/` (one new file). At runtime the command reads the git working tree and `PRPs/reports/<feature>/record.json`, and writes `PRPs/reports/<feature>/qa-report.md`. No source is executed. |
| Dependencies | None — row 1 `Depends` cell is `-`. Reuses existing patterns from `relay-plan.md`, `relay-commit.md`, `relay-pr.md`, `relay-prd.md`. No new dependencies, no new settings-allowlist entries. |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/relay-qa-report-command.prd.md` Implementation Phases row 1 (line 307); Phase Details lines 314-319 |
| phase_type | docs |

`phase_type: docs` — the sole changed file is a `.md` prose protocol (`plugins/relay/commands/relay-qa-report.md`); this repo declares `test_frameworks: []` and has no compiled application source, so the deliverable is validated by content-invariant `grep` + markdown/frontmatter parse, not by a test framework. This correctly routes `plan-reviewer` to exempt the framework-mismatch check for a prompt-only deliverable.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| High | `PRPs/prds/relay-qa-report-command.prd.md` | 40-185, 215-301 | Problem/solution, AC-1..AC-10, MoSCoW, and the Technical Approach + Architecture Notes for the command being authored. |
| High | `plugins/relay/commands/relay-plan.md` | 1-4, 47-67 | Command frontmatter shape (`description` + `argument-hint`, no `allowed-tools`) and the Phase 0 suffix-based mode router — the direct structural precedent for the four-way router. |
| High | `plugins/relay/commands/relay-commit.md` | 181-224 | Current-branch diff-review fallback (`git status --porcelain` then `git diff`) and its clean-tree short-circuit — mirror for blank→diff mode and the clean-tree HALT. |
| High | `plugins/relay/commands/relay-pr.md` | 146-151 | The `FAILED_<REASON>:` named-HALT blockquote idiom with remediation — mirror for `FAILED_NOTHING_TO_REPORT`. |
| Medium | `plugins/relay/commands/relay-prd.md` | 88-103 | Anti-overwrite HALT-on-APPROVED precedent — the strongest existing precedent for a true anti-overwrite HALT (vs. plan-writer's silent numeric-suffix collision avoidance). |
| Medium | `docs/context/test-output-schema.md` | 24-96 | The Test Runner `record.json` schema v1 (`## Schema v1` + `### Field semantics`: per-failure suite/test/file/line/message/category + pass/fail/skip counts) — the grounding source for the automated-coverage column. |
| Medium | `docs/context/settings-allowlist.md` | (whole) | Confirms `git status*` / `git diff*` are already allowlisted — the command adds no new allowlist entries. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-plan.md:59-67
**Detection step** — examine the argument value:

- If the argument ends with `.prd.md` → set `mode = prd`, record
  `prd_path` as the resolved absolute path, and proceed to the
  existing P1–P4 preconditions then **Phase A**.
- Otherwise → set `mode = description`, record `description =
  $ARGUMENTS` (the raw free-text string), record `target_root` as
  the current working directory, and proceed to P1.D and P3.D then
  **Phase B**.
```
Task 1 copies this suffix-detection shape and extends it from two-way to four-way: `.prd.md` → PRD mode, `.plan.md` → plan mode, non-empty free text → description mode, blank → diff mode.

```
# SOURCE: plugins/relay/commands/relay-commit.md:181-193
## B.1 — ASSESS

Run:

```bash
git status --porcelain
```

If the output is **empty** (clean working tree), exit 0:

> Nothing to commit — the working tree is already clean.

Do not proceed. If non-empty: continue to B.2.
```
Task 1 (blank→diff branch) copies the `git status --porcelain` assessment; Task 3 replaces the benign "exit 0" short-circuit with the named `FAILED_NOTHING_TO_REPORT` HALT because in this command a clean tree in diff mode is a failure to report on, not a success.

```
# SOURCE: plugins/relay/commands/relay-pr.md:146-151
If the count is **0** (no commits ahead of base), HALT:

> FAILED_NOTHING_TO_PR: Branch `feature/<feature>` has no commits ahead of `<resolved-base>`.
> There is nothing to open a PR for.
> Implement changes with /relay-execute <prd-path>, commit with /relay-commit <feature>,
> then re-run /relay-pr <feature>.
```
Task 3 mirrors this `FAILED_<SCREAMING_SNAKE>: <diagnosis>` + remediation blockquote shape verbatim for `FAILED_NOTHING_TO_REPORT`.

```
# SOURCE: plugins/relay/commands/relay-prd.md:95-103
- Parse the draft's trailing status line. If it contains
  `*Status: APPROVED*`, HALT with:

  > The file at `<draft_path>` is already marked APPROVED.
  > `/relay-prd` will not modify an APPROVED PRD. If you want to run
  > a new authoring session against it, manually flip its status
  > back to `DRAFT` (edit the trailing `*Status:*` line) or copy/
  > rename the file, then re-run `/relay-prd` on the DRAFT file.

  Exit without invoking the Writer.
```
Task 3 mirrors this "read the existing file, HALT rather than clobber, tell the operator how to proceed" anti-overwrite precedent for the existing-`qa-report.md` guard (AC-9).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-qa-report.md` | CREATE | The Phase 1 deliverable — the complete command protocol (frontmatter + Phase 0 four-way router + `<feature>` derivation + seven-field schema + honesty rule + `record.json` grounding + clean-tree and anti-overwrite HALTs). |

## NOT Building (Scope Limits)

- **No canonical-docs edits** — `docs/api-reference.md` (new "QA / Support" category + count 14→15) and `docs/context/architecture.md` (count + taxonomy + happy-path) are Phase 2.
- **No documentation-site page, three-file registration, or `plugin.json` bump** — the rendered `documentation/` reference page and the NAV + search-index + changelog registration + version bump are Phase 3.
- **No dogfood run** — running `/relay-qa-report` against a real executed PRD's `PRPs/reports/<feature>/` to validate AC-4/AC-5/AC-6 is Phase 4.
- **No running, authoring, or modifying tests** — the command only reports coverage; it never executes a suite or writes a test.
- **No writer/reviewer pair / no reviewer agent** — the human doing manual QA is the validator.
- **No CI gating / invocation by `/relay-execute`** — this is an explicitly manual human-gate command.
- **No `--force` flag or command-driven update mode** — overwrite/preserve-statuses is a Could-item deferred; MVP is one-shot generation with the anti-overwrite HALT, and status updates stay conversational.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/commands/relay-qa-report.md` — frontmatter + Phase 0 four-way router + `<feature>` derivation

- **ACTION**: Create the file with YAML frontmatter (`description`; `argument-hint: '[prd-path | plan-path | description] (blank = uncommitted diff)'`; no `allowed-tools` key). Author the Phase 0 router that resolves four modes by argument shape — `.prd.md` → PRD mode (`<feature>` = PRD basename), `.plan.md` → plan mode (`<feature>` = the `<feature>` segment of the plan filename), non-empty free text → description mode (`<feature>` = current git branch slug, `feature/` prefix stripped, falling back to a kebab slug of the description), blank → diff mode over `git status --porcelain` + `git diff` (`<feature>` = current branch slug). Address AC-1/AC-2/AC-3 routing entry and the description-mode branch here.
- **MIRROR**: `plugins/relay/commands/relay-plan.md:59-67` (suffix detection, extended two-way → four-way) and `plugins/relay/commands/relay-commit.md:181-193` (blank→diff `git status --porcelain` assessment).
- **VALIDATE**: `grep -q '^argument-hint:' plugins/relay/commands/relay-qa-report.md && grep -q '\.prd\.md' plugins/relay/commands/relay-qa-report.md && grep -q '\.plan\.md' plugins/relay/commands/relay-qa-report.md && grep -q 'git status --porcelain' plugins/relay/commands/relay-qa-report.md`

### Task 2: UPDATE `plugins/relay/commands/relay-qa-report.md` — seven-field report schema + honesty rule + `record.json` grounding + n:1 mapping

- **ACTION**: Add the report body specification: each test entry carries all seven fields — **title**, **risk level** (Critical/High/Medium/Low), **required state** (DB entities + values needed to run it), **coverage** (automated / manual / none), **automated test path**, **manual status** (defaults to `pending` for every entry), and a manual **step-by-step**. Specify that the report is written to `PRPs/reports/<feature>/qa-report.md`. Encode the honesty rule: any case covered by neither an automated nor a manual test appears explicitly marked as uncovered, never omitted (AC-5). Specify `record.json` grounding — when `PRPs/reports/<feature>/record.json` exists, read it to ground the automated-coverage column; otherwise infer from repo test files and mark unconfirmed coverage as unverified rather than inventing a path (AC-6). Specify n:1 mapping — one test may cover several cases; low-criticality cases may be left uncovered (AC-8). Address AC-4, AC-5, AC-6, AC-7, AC-8.
- **MIRROR**: `docs/context/test-output-schema.md:24-96` (the `record.json` schema v1 the automated-coverage column reads) — grounding source, not a code snippet to copy verbatim.
- **VALIDATE**: `f=plugins/relay/commands/relay-qa-report.md; for field in 'title' 'risk' 'required state' 'coverage' 'manual' 'step-by-step' 'pending' 'record.json'; do grep -qi "$field" "$f" || { echo "FAIL: missing '$field'"; exit 1; }; done; echo "PASS"`

### Task 3: UPDATE `plugins/relay/commands/relay-qa-report.md` — clean-tree HALT + anti-overwrite HALT + output block

- **ACTION**: Add the two named-HALT preconditions and the output block. (a) Clean-tree HALT: in diff mode, if `git status --porcelain` is empty, HALT with a `FAILED_NOTHING_TO_REPORT:` blockquote (diagnosis + remediation) and create no file (AC-3). (b) Anti-overwrite HALT: if `PRPs/reports/<feature>/qa-report.md` already exists, do not silently overwrite it — HALT and ask the operator to confirm (or pass an explicit override) so recorded manual statuses are not lost (AC-9). (c) Output block: on success, name the written path and a per-risk case count.
- **MIRROR**: `plugins/relay/commands/relay-pr.md:146-151` (the `FAILED_<REASON>:` HALT blockquote shape) and `plugins/relay/commands/relay-prd.md:95-103` (read-existing-file-and-HALT-rather-than-clobber anti-overwrite precedent).
- **VALIDATE**: `grep -q 'FAILED_NOTHING_TO_REPORT' plugins/relay/commands/relay-qa-report.md && grep -qi 'overwrite' plugins/relay/commands/relay-qa-report.md && grep -q 'PRPs/reports/' plugins/relay/commands/relay-qa-report.md`

### Task 4: UPDATE `plugins/relay/commands/relay-qa-report.md` — `.claude/` write guard + prp-core non-import self-check

- **ACTION**: Do a final review pass over the authored protocol to guarantee two invariants hold in the prose: (a) every artifact path the command writes resolves under `PRPs/reports/<feature>/` — the command never writes a pipeline artifact under `.claude/`; (b) the protocol does not import or re-export any `plugins/prp-core/` asset (prp-core is a read-only format reference only). Add an explicit "writes only under `PRPs/reports/<feature>/`" statement to the protocol so the invariant is self-documenting. This guard is the path-convention hygiene underlying AC-1/AC-2/AC-3 (every mode writes to `PRPs/reports/<feature>/qa-report.md`) and satisfies plan AC-A10.
- **MIRROR**: `docs/anti-patterns.md:61-67` (no `.claude/` pipeline-artifact writes) and `docs/anti-patterns.md:71-76` (prp-core is reference, not active code) — invariants to satisfy, not code to copy.
- **VALIDATE**: `f=plugins/relay/commands/relay-qa-report.md; grep -q 'PRPs/reports/' "$f" || { echo "FAIL: output path convention absent"; exit 1; }; if grep -Eq '\.claude/PRPs' "$f"; then echo "FAIL: forbidden .claude/PRPs artifact path present"; exit 1; fi; echo "PASS"`

## Validation Commands

### Level 1 — STATIC_ANALYSIS (frontmatter + file shape)

```bash
set -euo pipefail
f=plugins/relay/commands/relay-qa-report.md
test -f "$f" || { echo "FAIL: command file missing"; exit 1; }
head -1 "$f" | grep -q '^---$' || { echo "FAIL: no YAML frontmatter opener on line 1"; exit 1; }
grep -q '^description:' "$f" || { echo "FAIL: missing 'description' frontmatter key"; exit 1; }
grep -q '^argument-hint:' "$f" || { echo "FAIL: missing 'argument-hint' frontmatter key"; exit 1; }
if grep -q '^allowed-tools:' "$f"; then echo "FAIL: relay commands must not declare 'allowed-tools'"; exit 1; fi
echo "PASS: static analysis"
```

### Level 2 — CONTENT_INVARIANTS (routing, schema, HALTs, path safety)

```bash
set -euo pipefail
f=plugins/relay/commands/relay-qa-report.md
# Phase 0 four-way router markers
grep -q '\.prd\.md' "$f" || { echo "FAIL: PRD-mode branch missing"; exit 1; }
grep -q '\.plan\.md' "$f" || { echo "FAIL: plan-mode branch missing"; exit 1; }
grep -q 'git status --porcelain' "$f" || { echo "FAIL: blank/diff-mode assessment missing"; exit 1; }
# Named HALTs
grep -q 'FAILED_NOTHING_TO_REPORT' "$f" || { echo "FAIL: clean-tree HALT code missing"; exit 1; }
grep -qi 'overwrite' "$f" || { echo "FAIL: anti-overwrite guard missing"; exit 1; }
# Output path convention + no .claude artifact writes
grep -q 'PRPs/reports/' "$f" || { echo "FAIL: PRPs/reports output path missing"; exit 1; }
if grep -Eq '\.claude/PRPs' "$f"; then echo "FAIL: forbidden .claude/PRPs artifact path present"; exit 1; fi
# Seven-field schema markers
for field in 'title' 'risk' 'required state' 'coverage' 'manual' 'step-by-step'; do
  grep -qi "$field" "$f" || { echo "FAIL: missing field marker '$field'"; exit 1; }
done
echo "PASS: content invariants"
```

### Level 3 — DRY-RUN END-TO-END (AC addressability by inspection)

```bash
set -euo pipefail
f=plugins/relay/commands/relay-qa-report.md
# AC-7 manual status default 'pending'
grep -qi 'pending' "$f" || { echo "FAIL: AC-7 manual-status default 'pending' not addressable"; exit 1; }
# AC-6 record.json grounding for the automated-coverage column
grep -qi 'record.json' "$f" || { echo "FAIL: AC-6 record.json grounding not addressable"; exit 1; }
# AC-5 honesty — uncovered cases explicit
if ! grep -qi 'uncovered' "$f"; then
  grep -qi 'no coverage' "$f" || { echo "FAIL: AC-5 uncovered-case honesty not addressable"; exit 1; }
fi
echo "PASS: AC-5/AC-6/AC-7 addressable from protocol text; full end-to-end dogfood deferred to Phase 4"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** The authored protocol's Phase 0 PRD-mode branch derives cases from a `<name>.prd.md`'s Acceptance Criteria, writes the report to `PRPs/reports/<name>/qa-report.md` with at least one entry per derived case, and names the written path in its output.
- **AC-A2 (PRD AC-2):** The plan-mode branch derives cases from a `<feature>-phase-<N>-<slug>.plan.md`'s tasks and validation commands and writes to `PRPs/reports/<feature>/qa-report.md`.
- **AC-A3 (PRD AC-3):** The blank→diff branch derives cases from the uncommitted diff (`git status --porcelain` + `git diff`) keyed on the current branch slug; on a clean working tree it HALTs with `FAILED_NOTHING_TO_REPORT` and creates no file.
- **AC-A4 (PRD AC-4):** The report schema specifies all seven fields per entry — title, risk level, required state (DB entities + values), coverage (automated/manual/none), automated test path, manual status, and a manual step-by-step.
- **AC-A5 (PRD AC-5):** The honesty rule states that a case covered by neither an automated nor a manual test appears explicitly marked as uncovered, never silently omitted.
- **AC-A6 (PRD AC-6):** A case mapped to an automated test cites a path that must resolve to a real repo file; when coverage cannot be confirmed the entry is marked unverified rather than inventing a path; `record.json` grounds the column when present.
- **AC-A7 (PRD AC-7):** Every test entry with a manual test starts with manual status `pending` on first generation.
- **AC-A8 (PRD AC-8):** The schema permits n:1 mapping — one automated or manual test may cover several cases (no forced 1:1) and less-critical cases may be left without a dedicated test.
- **AC-A9 (PRD AC-9):** An existing `PRPs/reports/<feature>/qa-report.md` is not silently overwritten — the command HALTs asking the operator to confirm (or pass an explicit override) so recorded manual statuses are preserved.
- **AC-A10 (PRD AC-1, AC-2, AC-3):** Phase 0 resolves all four input shapes (`.prd.md` / `.plan.md` / non-empty free text / blank) with `<feature>` derived per mode, and the command writes pipeline artifacts only under `PRPs/reports/<feature>/` (never `.claude/`).

Note: AC-10 of the source PRD (docs + documentation-site registration) is out of scope for this phase — it is delivered by Phase 2 (canonical docs) and Phase 3 (documentation site + plugin bump).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hallucinated automated coverage — the protocol lets the report cite a test path that does not exist | Medium | High | The protocol requires every cited automated-test path to resolve to a real repo file; unconfirmed coverage is marked unverified, never invented (AC-6 / AC-A6). |
| Ambiguous `<feature>` derivation in description/diff mode (detached or generically-named branch) | Medium | Medium | The protocol prefers the branch slug, falls back to a description slug, and HALTs asking the operator when indeterminable (Task 1 derivation rules). |
| Silent overwrite of a report holding recorded manual statuses | Medium | High | Anti-overwrite HALT (AC-9 / AC-A9); overwrite only via an explicit future `--force` (deferred Could-item). |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- Contextual note: the relay repo declares `test_frameworks: []`, so the test writer/reviewer pair self-skips for this markdown feature regardless of the `tdd:` ordering flag. The Acceptance Criteria above are validated by dogfood inspection (source PRD Phase 4), consistent with `docs/context/methodology.md`.
- Dogfood opportunity: this authoring session and Phase 4 both exercise `/relay-qa-report`'s own contract — the command can eventually generate its own QA report against `PRPs/reports/relay-qa-report-command/`.
- Divergence callout: the PRD frames `/relay-qa-report` as a single LLM-judgment command with no writer/reviewer pair. That is a conscious, decision-backed divergence from the split-reviewer norm (2026-04-19 Command surface decision) — the human performing manual QA is the validator, so no reviewer agent is authored in this phase.

*Generated: 2026-07-12*
*Approved: 2026-07-12*
*Implemented: 2026-07-12*
*Status: IMPLEMENTED*
