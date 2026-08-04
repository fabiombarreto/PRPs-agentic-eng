---
description: 'Generates a human-facing QA support report enumerating test cases with coverage (automated, manual, or none), required DB state, and a manual step-by-step, for the human validation gate between /relay-execute and Pillar 3. Single LLM-judgment command with NO writer/reviewer pair — the human performing manual QA is the validator. Phase 0 four-way argument router: a .prd.md path enters PRD mode (cases derived from the PRD Acceptance Criteria section; <feature> = PRD basename); a .plan.md path enters plan mode (cases derived from the plan Step-by-Step Tasks and Validation Commands; <feature> = the plan <feature> segment); non-empty free text enters description mode (cases derived from the uncommitted diff interpreted through the description as scope, or from the description itself on a clean tree; <feature> = current branch slug with a feature/ prefix stripped, falling back to a description slug); blank enters diff mode (cases derived from git status --porcelain plus git diff on the current branch; <feature> = current branch slug; a clean working tree HALTs with FAILED_NOTHING_TO_REPORT and writes no file). Every entry carries seven fields: title, risk level, required state, coverage, automated test path, manual status defaulting to pending, and a manual step-by-step; n:1 test-to-case mapping is allowed; any case covered by neither an automated nor a manual test is listed explicitly as uncovered, never omitted. Grounds the automated-coverage column in PRPs/reports/<feature>/record.json when present, else infers from repo test files and marks unconfirmed coverage unverified. Writes to PRPs/reports/<feature>/qa-report.md; HALTs rather than silently overwriting an existing report. Never writes under .claude/, never runs or authors or modifies a test, never invoked by /relay-execute.'
argument-hint: '[prd-path | plan-path | description] (blank = uncommitted diff)'
---

# /relay-qa-report

**Arguments:** `$ARGUMENTS`

---

## Your mission

Generate an honest, structured QA report at `PRPs/reports/<feature>/qa-report.md` for the human validation gate between `/relay-execute` and Pillar 3. You are a single-role, LLM-judgment command — there is no writer/reviewer pair, no reviewer agent, and you never dispatch any pipeline agent. The human performing manual QA is the validator. You are read-only over the repository except for the one report you write; you never run, author, or modify a test.

See:
- the source PRD `relay-qa-report-command.prd.md`, in the relay plugin repo (not packaged) — AC-1 through AC-10; Decisions Log; Architecture Notes.
- `plugins/relay/commands/relay-plan.md` — Phase 0 suffix-based mode detection (two-way; this command extends the same shape to four-way).
- `plugins/relay/commands/relay-commit.md` — current-branch diff-review fallback (`git status --porcelain` then `git diff`), mirrored for the blank→diff-mode branch.
- `plugins/relay/commands/relay-pr.md` — the `FAILED_<REASON>:` named-HALT blockquote idiom, mirrored for `FAILED_NOTHING_TO_REPORT`.
- `plugins/relay/commands/relay-prd.md` — the read-existing-file-and-HALT-rather-than-clobber anti-overwrite precedent, mirrored for the existing-`qa-report.md` guard.
- `${CLAUDE_PLUGIN_ROOT}/resources/test-output-schema.md` — the Test Runner `record.json` schema v1, the grounding source for the automated-coverage column.

---

## Phase 0 — Four-way mode routing and `<feature>` derivation

Trim `$ARGUMENTS`. Examine the trimmed value:

- Ends with `.prd.md` → `mode = prd`.
- Else ends with `.plan.md` → `mode = plan`.
- Else non-empty → `mode = description`.
- Else (blank/whitespace) → `mode = diff`.

### PRD mode

Resolve `prd_path` to the absolute path of the argument. If it does not resolve to an existing readable file, HALT:

> I cannot generate a QA report without a readable PRD. The path `<prd_path>` did not resolve to an existing readable file.
> Usage: /relay-qa-report PRPs/prds/<feature>.prd.md

`<feature>` = the PRD basename with the `.prd.md` extension stripped (e.g. `PRPs/prds/foo-bar.prd.md` → `foo-bar`).

Case source: the PRD `## Acceptance Criteria` section (AC-1..AC-N). Each Acceptance Criterion becomes at least one report entry.

### Plan mode

Resolve `plan_path` to the absolute path of the argument. If it does not resolve to an existing readable file, HALT:

> I cannot generate a QA report without a readable plan. The path `<plan_path>` did not resolve to an existing readable file.
> Usage: /relay-qa-report PRPs/plans/<feature>-phase-<N>-<slug>.plan.md

`<feature>` = the `<feature>` segment of the plan filename — everything before the first `-phase-<digits>-` segment of the canonical `<feature>-phase-<N>-<slug>.plan.md` pattern (e.g. `PRPs/plans/foo-bar-phase-2-widgets.plan.md` → `foo-bar`). If the filename carries no `-phase-<N>-` segment (a flat `<slug>.plan.md` description-mode plan), `<feature>` = the full slug (filename minus `.plan.md`).

Case source: the plan `## Step-by-Step Tasks` section (each task's `**ACTION**` + `**VALIDATE**`) and the `## Validation Commands` section.

### Description mode

Record `description = $ARGUMENTS` (the trimmed free-text string).

`<feature>` derivation:
1. Run `git branch --show-current`.
2. If the result starts with `feature/`, strip that prefix — the remainder is the candidate branch slug.
3. If the branch result is empty (detached HEAD) or is a generic name (`main`, `master`, `develop`, `dev`, `development`, `HEAD`), the branch slug is unusable. Fall back to a kebab-case slug of `description` (lowercase; runs of non-alphanumeric characters collapsed to a single `-`; leading/trailing `-` trimmed).
4. If neither the branch slug nor the description slug yields any alphanumeric character, HALT:

   > Cannot derive a `<feature>` slug from either the current branch (`<branch>`) or the description (`<description>`). Pass a description with at least one alphanumeric word, or check out a `feature/<name>` branch, then re-run.

Case source: treat `description` as scope. Run `git status --porcelain`. If the working tree is **dirty**, derive cases from `git diff` (and `git diff --staged` when relevant) interpreted through the lens of `description` — the description narrows which changed areas matter; it does not replace the diff as ground truth. If the working tree is **clean**, derive cases directly from `description` as a freeform case list — there is no clean-tree HALT in description mode (`FAILED_NOTHING_TO_REPORT` is diff-mode-only).

### Diff mode (blank)

Run:

```bash
git status --porcelain
```

`<feature>` derivation: the same steps 1–3 as description mode, using the current branch (there is no description text for a step-3 fallback). If the branch slug is unusable per step 3 and there is no description to fall back to, HALT:

> Cannot derive a `<feature>` slug from the current branch (`<branch>` — detached HEAD or a generic branch name). Check out a `feature/<name>` branch, or invoke `/relay-qa-report "<description>"` instead, then re-run.

Case source: `git status --porcelain` + `git diff` (unstaged) + `git diff --staged` (staged) on the current branch — everything uncommitted.

If the working tree is clean (the `git status --porcelain` output above is empty), this is the `FAILED_NOTHING_TO_REPORT` precondition — see the HALT in Phase 2 below. Do not derive cases; do not write a file.

---

## Report body — seven-field per-case schema

Gather every candidate test case from the mode's case source above. For each case, produce one report entry carrying all seven fields:

1. **Title** — a short, specific name for the case.
2. **Risk level** — one of `Critical`, `High`, `Medium`, `Low` (probability × severity; a defect here breaks a core flow or blocks shipping = Critical, down to a cosmetic/rare-path issue = Low).
3. **Required state** — the DB entities and specific values needed to exercise the case (e.g. "Institution with `status=active`; User with `role=admin` at that institution"). Use "none" when the case needs no seeded state.
4. **Coverage** — one of `automated`, `manual`, `none`.
5. **Automated test path** — the repo-relative path (and test name, when derivable) of the automated test that covers this case. Every cited path MUST resolve to a real file in the repo (`test -f <path>` before citing it) — never invent a path. When coverage cannot be confirmed, mark the entry `unverified` in this field instead of guessing a path.
6. **Manual status** — `pending` on first generation for every entry that has (or needs) a manual test. Never any other value on a first-time generation — status updates only happen conversationally in a later session, never by this command re-running (see the anti-overwrite HALT in Phase 2).
7. **Manual step-by-step** — a short numbered sequence of concrete steps to exercise the case by hand (setup, action, expected result).

### Honesty rule

Any case covered by **neither** an automated **nor** a manual test appears in the report explicitly marked as **uncovered** — field 4 (**Coverage**) is `none`, and the entry is never silently omitted from the report. Hiding a coverage gap to make the report look complete is the exact anti-pattern this command exists to counter (`docs/anti-patterns.md` — weakening or hiding coverage to look green).

### `record.json` grounding

Before inferring automated coverage from repo test files, check whether `PRPs/reports/<feature>/record.json` (or, when a Test Runner session produced multiple attempts, the latest `PRPs/reports/<feature>/attempts/<N>/record.json`) exists:

- **If it exists**: read it (schema v1 — `${CLAUDE_PLUGIN_ROOT}/resources/test-output-schema.md`) and ground the **coverage** and **automated test path** fields in its `failures[]` entries and `counts` — a test named in `record.json` is confirmed automated coverage; cite its `file`/`line` fields directly rather than re-deriving.
- **If it is absent**: infer automated coverage by searching the repo's test files (matching the project's test glob) for tests whose names/descriptions plausibly cover the case. Be explicit about what could not be confirmed — mark such entries `unverified` rather than asserting confident coverage. Absence of `record.json` is expected and not an error (e.g. `test_frameworks: []` in `docs/context/methodology.md`, or a manual-only implementation).

### n:1 mapping

A single automated or manual test MAY cover several report entries — there is no forced 1:1 mapping between tests and cases. When one test covers multiple cases, cite the same test path/name in every covered entry. Less-critical (`Low`, sometimes `Medium`) cases MAY be left without a dedicated test — that is a legitimate `coverage: none` entry, not a defect in the report, as long as the honesty rule above still marks it explicitly.

### Output path

Write the assembled report to:

```
PRPs/reports/<feature>/qa-report.md
```

This is the only file this command ever writes.

---

## Visual Fidelity section (figma_track-gated)

In addition to the seven-field case table above, append a "## Visual
Fidelity" section to the written `qa-report.md` — present ONLY when
BOTH conditions hold: (1) the target project's
`docs/context/methodology.md` declares `figma_track: true`, and (2)
at least one `phase-*/visual/*/fidelity-report.json` artifact is
found under the resolved `<feature>`'s `PRPs/reports/<feature>/`
directory (the same glob-equivalent discovery walk
`plugins/relay/scripts/generate-final-report.mjs`'s `findFidelityReportPaths` uses
over `phase-*/visual/*/fidelity-report.json`). Absent entirely — no
heading, no "N/A" placeholder — for a non-Figma project or when no
fidelity artifact exists yet, reproducing the identical
`figma_track_declared`-gated omission idiom `/relay-implement`'s own
`Visual:` line already established (Figma Implementation Track Phase
7).

When present, aggregate every discovered `fidelity-report.json`'s
frame entries — support both `compare.mjs`'s bare-array shape and a
`{ frames: [...] }`-wrapped shape, same as the aggregation approach
in Task 3 of this phase's plan — into a table: one row per frame,
carrying `node_id`, `route`, `diff_percent`, `threshold`, and
`status`. This section is informational, sourced entirely from
already-persisted evidence on disk — it never runs the
visual-verification tooling itself (that is `/relay-implement`'s
Phase A.3.4 or the standalone `/relay-visual-review` command's job;
this command never dispatches an agent, per its Constraints below).

Since the Figma Visual-First Track's own Phase 7, this section is
additionally `phase_scope`- and human-approval-aware. For each
discovered `phase-<N>` directory contributing frames to the section,
also attempt to read that phase's own plan
(`PRPs/plans/<feature>-phase-<N>-*.plan.md`, falling back to
`PRPs/plans/completed/<feature>-phase-<N>-*.plan.md`) for a
`phase_scope` row in its `## Metadata` table. When at least one
discovered phase declares a `phase_scope` value, add a sixth "Scope"
column to the per-frame table — omitted entirely, five columns
unchanged, when no phase declares one, the same conditional-column
rule `plugins/relay/scripts/generate-final-report.mjs`'s own extension applies, so
both surfaces stay consistent with each other. For every phase that
both declares `phase_scope` AND has a
`PRPs/reports/<feature>/phase-<N>/visual-approval.jsonl` file, append
one line below the table per such phase summarizing the recorded
human decision (approved/rejected, with the verbatim confirmation or
rejection-feedback text) parsed from that file's last line. This
extension never infers a `phase_scope` or approval decision — both
are sourced only from real, on-disk evidence, mirroring this
section's own "sourced entirely from already-persisted evidence on
disk" sentence above.

---

## Phase 2 — Preconditions (HALTs)

Check these before writing any file.

### Clean-tree HALT (diff mode only)

Applies only when `mode = diff`. If `git status --porcelain` (run in Phase 0) produced empty output, HALT:

> FAILED_NOTHING_TO_REPORT: The working tree is clean — there is nothing uncommitted to report on.
> Run `/relay-qa-report` after making changes, or pass an explicit target: a `.prd.md` path, a `.plan.md` path, or a free-text description.

Create no file. Do not proceed to Phase 3.

### Anti-overwrite HALT (all modes)

Check whether `PRPs/reports/<feature>/qa-report.md` already exists. If it does, do **not** silently overwrite it — HALT:

> An existing QA report was found at `PRPs/reports/<feature>/qa-report.md`. Regenerating would silently
> discard any manual statuses already recorded there.
> Confirm here to overwrite it now, or leave it in place: delete or rename the existing file yourself and
> re-run `/relay-qa-report` later. A `--force` overwrite flag and a status-preserving update mode are deferred (Could-item).

Wait for the operator's explicit confirmation before overwriting; do not infer consent from silence. If the operator confirms, proceed to Phase 3 and overwrite the file within this same invocation — confirm-then-continue is the single procedure for this HALT. If the operator does not confirm, stop here and make no change; the operator may instead delete/rename the existing file and re-run `/relay-qa-report` separately, as a later, independent invocation. If no existing report is found, proceed to Phase 3 without asking.

---

## Phase 3 — Write the report and emit output

Write `PRPs/reports/<feature>/qa-report.md` as a markdown table (or per-entry sections when a table would be unreadable) — one row/section per case, all seven fields present, uncovered cases listed explicitly per the honesty rule.

On success, emit:

```
**QA report written**: PRPs/reports/<feature>/qa-report.md
**Cases**: <total count> (Critical: <n>, High: <n>, Medium: <n>, Low: <n>)
**Uncovered**: <count of coverage=none entries>

Next: drive manual testing from the report; ask conversationally to update a manual status or fix code as issues are found.
```

---

## Constraints (hard rules)

- **Writes only under `PRPs/reports/<feature>/`.** The single artifact this command ever writes is `PRPs/reports/<feature>/qa-report.md`. It never writes anywhere under `.claude/` — see `docs/anti-patterns.md` (writing pipeline artifacts under `.claude/`) and `docs/decisions.md` (PRP artifacts live under `PRPs/`, never under `.claude/`). Every path this command touches for writing resolves under `PRPs/reports/<feature>/`; no exception.
- **Never runs, authors, or modifies a test.** This command only reports observed coverage; it must not activate any test pair and must not invoke the Test Runner.
- **Never a writer/reviewer pair.** There is no reviewer agent for this command — the human performing manual QA is the validator (2026-04-19 Command surface decision).
- **Never invoked by `/relay-execute`.** This is a human-gate command living between Pillar 2 and Pillar 3; the autonomous orchestrator must not call it.
- **Never imports or re-exports `plugins/prp-core/`.** `prp-core` command files are a read-only format reference only (`docs/anti-patterns.md` — treating `plugins/prp-core/` as active relay code); nothing from that tree is copied, cited as behavior, or re-exported as part of this command.
- **Never fabricates an automated-test path.** Every cited path must resolve to a real repo file (`test -f`); unconfirmed coverage is marked `unverified`, never invented.
- **Never silently overwrites an existing report.** The anti-overwrite HALT in Phase 2 is mandatory in every mode.
- **Never prompts beyond the anti-overwrite confirmation.** Past the interactivity boundary this command still requires one explicit confirmation (existing-report overwrite) — it does not turn into an open-ended interview.

---

## What you do NOT do

- **Run a test suite** — the Test Runner (`/relay-test`) owns execution; this command only reports.
- **Author or edit a test file** — the test pair (`test-writer`/`test-reviewer`) owns authoring.
- **Dispatch any reviewer agent** — no writer/reviewer pair exists for this command.
- **Get invoked from `/relay-execute`** — this is an explicitly manual, human-gate-only command.
- **Overwrite an existing `qa-report.md` without confirmation** — the anti-overwrite HALT is mandatory.
- **Write under `.claude/`** — every artifact this command produces goes to `PRPs/reports/<feature>/`.
