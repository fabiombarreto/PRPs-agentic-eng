# Feature: Fix degenerate T00:00:00 timestamps in relay reviewer jsonl audit logs (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting patterns (a shared audit-log field contract spanning 7 reviewer agents and 8 dispatching commands); reuse or creation of components (a new agent input threaded through every reviewer dispatch site); impact on reusable services (the `*.jsonl` verdict schema consumed by `scripts/efficiency.mjs`)
- Decisions found:
  - [2026-04-28] R-COH-* rubric relaxation — pins verbatim numerals and `rubric[]` length arithmetic in `plan-reviewer.md`; this change must not alter rubric row counts, `#### R-COH-*` heading counts, or the arithmetic prose.
  - [2026-07-30] merge-resolution entry — names `plan-reviewer.md`'s rubric arithmetic as the canonical reference and lists four `scripts/validate/checks/*.test.mjs` files asserting verbatim numerals against it.
  - [2026-04-29] D11 tool-allowlist evolution (code-reviewer) — establishes that a reviewer's `tools:` line is a recorded contract, not an incidental detail. This plan does NOT change any `tools:` line; it supplies the clock through the invoker instead.
  - [2026-07-30] efficiency-initiative entry — the consumer this fix unblocks.
- Applicable anti-patterns:
  - No `.claude/` writes — all artifacts stay under `PRPs/` and `plugins/relay/`.
  - No silent failure — the degraded no-clock path must be visible in the corpus, not swallowed.
  - No treating `prp-core/` as active relay code — untouched here.
- Applicable architectural rules:
  - Markdown + YAML prompt files only; the plugin ships no runtime source.
  - Interactivity boundary — every file touched here runs past it; no change may introduce a user prompt.
  - Writer/reviewer split — this plan touches reviewers and their invokers only, never a writer's flip authority.
- Result: PROCEED
```

## Source

Fix degenerate T00:00:00 timestamps in relay reviewer jsonl audit logs. Seven reviewer agents under plugins/relay/agents/ append verdict lines to jsonl audit logs, and most emit a date-only stamp (YYYY-MM-DDT00:00:00Z) instead of a real UTC instant: plan-reviewer.md (.review.jsonl, 101/135 = 75% degenerate), prd-reviewer.md (PRPs/prds/*.review.jsonl, 16/27 = 59%), code-reviewer.md (.code-review.jsonl, 26/104 = 25%), test-reviewer.md (.test-write-review.jsonl, 1/44), docs-reviewer.md (docs-review.jsonl, no corpus yet), design-map-reviewer.md (component-map-review.jsonl, no corpus yet), design-spec-reviewer.md (design-spec-review.jsonl, no corpus yet). post-green-reviewer.md appends NO jsonl and is explicitly OUT of scope.

Root cause (revised during grounding — see `## Notes`): the defect is not weak wording, it is that four of the seven reviewers have no clock. Their `tools:` allowlist is `Read, Edit, Write` (plus `Task` for prd-reviewer), which contains no way to observe the current time; the harness supplies today's *date* only. `T00:00:00Z` is the honest output of an agent asked for an instant it cannot obtain. The degenerate rate correlates exactly with clock availability: plan-reviewer 75% and prd-reviewer 59% (no Bash) versus code-reviewer 25% and test-reviewer 2% (Bash). Wording is nevertheless a real, separate gap for the three Bash-capable reviewers — code-reviewer has carried timestamp prose since 2026-04-29 and still emitted degenerate stamps through 2026-07-29.

Resolution (operator decision, this session): the invoking command captures the instant and passes it in as a `review_started_at` input the reviewer writes verbatim, mirroring the `attempt` precedent already in `code-reviewer.md`. One mechanism for every reviewer and both dispatch modes (inline adoption and `Task` dispatch). No `tools:` line changes.

Why it matters: `scripts/efficiency.mjs compare` classifies each artifact by its FIRST verdict timestamp against a recorded release marker (`PRPs/reports/efficiency/v0.24.0.json` = `2026-07-31T14:19:41Z`), so a same-day artifact stamped `T00:00:00Z` sorts BEFORE a mid-day marker and is miscounted as pre-change; this already corrupted the v0.24.0 comparison and blocks the relay efficiency initiative's wave-2 revert and wave-3 go/no-go decisions.

Do NOT attempt to repair historic jsonl entries — they are unrecoverable; instead add a note to `docs/context/constraints.md` that comparisons spanning a marker should use boundaries at least a day apart until the corpus refills.

Constraints: this is prompt-file work under `plugins/relay/` so it ships a plugin asset, and per `documentation/AGENTS.md` §7.5 the same commit needs a `plugins/relay/.claude-plugin/plugin.json` version bump plus a `documentation/changelog.html` entry. `plan-reviewer.md` and `code-reviewer.md` have existing `node:test` checks under `scripts/validate/checks/` that assert verbatim numerals, `rubric[]` array lengths and section counts against those files, so edits must be additive to the timestamp field only and must not alter rubric row counts or headings; `npm run validate` must stay green. The tree is CRLF, so any VALIDATE grep for a phrase spanning a line break must normalize first with `tr -d '\r' | tr '\n' ' ' | tr -s ' '`, and every VALIDATE command must be verified to actually FAIL against the unmodified tree before the plan is approved.

## Summary

Introduce a single new agent input — `review_started_at`, a full UTC instant in `YYYY-MM-DDTHH:MM:SSZ` — that every jsonl-appending reviewer receives from its invoker and writes verbatim into its verdict's `timestamp` field. Each of the eight dispatching commands captures the instant with `date -u +%Y-%m-%dT%H:%M:%SZ` immediately before adopting or dispatching the reviewer, and passes it in the existing execution-context list. Each of the seven reviewer agents gains the input in its `## Inputs (from the calling command)` block plus a `### Timestamp discipline (mandatory)` block adjacent to its jsonl-write step, stating the required format, forbidding a date-only or midnight value, and defining a non-silent fallback when the input is absent. No `tools:` line, rubric row, heading count, or jsonl schema key changes on the success path, so the ten existing validation checks stay green. `docs/context/constraints.md` records the unrecoverable-corpus caveat, and `plugin.json` + `changelog.html` move together per §7.5.

## User Story

As the operator running the relay efficiency initiative,
I want every reviewer verdict stamped with the real instant it was written,
So that `scripts/efficiency.mjs compare` classifies same-day artifacts on the correct side of a mid-day release marker and the wave-2 revert and wave-3 go/no-go decisions rest on a true plan-review first-attempt failure rate.

## Problem Statement

128 of 284 verdict entries (45.1%) across `PRPs/plans/*.jsonl` carry a `T00:00:00` timestamp, and 99 files contain at least one. No entry omits the field, so agents are writing a date-only value rather than nothing. `scripts/efficiency.mjs` sorts artifacts by their first verdict timestamp against a recorded marker (`firstSeen` at `scripts/efficiency.mjs:116`, applied at lines 176–177), so any artifact reviewed after a mid-day marker but stamped at midnight sorts into the before-set. This has already happened: `PRPs/plans/close-the-validation-docs-debt-recorded-in.review.jsonl` line 1 is stamped `2026-07-31T00:00:00Z` for a plan authored hours after the `v0.24.0` marker, and `compare` reported "plan-review: no new artifacts since the marker" while warning its before-set recomputed to 80 against a recorded 79. The stage that emits the worst stamps — plan-review, at 75% — is precisely the stage whose first-attempt failure rate the initiative's remaining decisions hinge on.

## Solution Statement

Supply the missing clock from the invoker rather than asking a clockless agent to invent one, and separately close the wording gap for the reviewers that do have a clock. A new `review_started_at` input carries a full UTC instant from each dispatching command into its reviewer; the reviewer copies it verbatim into `timestamp` and is explicitly forbidden from substituting a date, midnight, or any fabricated value. Where the input is absent, Bash-capable reviewers self-serve `date -u` and clockless reviewers append the verdict with an explicit `"timestamp_degraded": true` marker so the gap is visible in the corpus rather than silent. Historic entries are left untouched and the resulting analysis caveat is recorded in `docs/context/constraints.md`.

## Metadata

| Field | Value |
|-------|-------|
| Type | fix |
| Complexity | medium |
| Systems Affected | 7 reviewer agents; 8 dispatching commands; `docs/context/constraints.md`; plugin ship assets |
| Dependencies | none |
| Estimated Tasks | 6 |
| Source | free-text description (description mode — no source PRD) |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/code-reviewer.md` | 755–795 | The `attempt` verbatim-from-command precedent this change mirrors, and the one piece of existing timestamp prose being strengthened. |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 40–48, 1188–1216 | The `## Inputs` block gaining `review_started_at`, and the jsonl format section the discipline block sits beside. The 75% offender. |
| P0 | `plugins/relay/commands/relay-plan-review.md` | 137–152 | The command-side execution-context list shape all eight commands share. |
| P1 | `scripts/validate/checks/version-parity.mjs` | 46–129 | Enforces plugin.json ↔ changelog.html lock-step; it is what makes §7.5 a gate rather than a convention. |
| P1 | `scripts/efficiency.mjs` | 116, 176–177 | The consumer: `firstSeen` and the before/after filter that the degenerate stamps defeat. |
| P1 | `documentation/AGENTS.md` | 332–369 | §7.5 — the three-file registration rule and the ship-asset bump requirement. |
| P2 | `docs/context/constraints.md` | 49–142 | House style for a dated caveat note; where the marker-spanning note lands. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/code-reviewer.md:789-792
The `timestamp` is captured at the moment of jsonl write, in UTC
ISO-8601 (e.g. `2026-04-28T17:42:00Z`). The `attempt` is verbatim
from the COMMAND's input — the agent does not increment, decrement,
or fabricate this value.
```
Task 3 replaces the first sentence with the stronger discipline block and extends the second sentence's "verbatim from the COMMAND's input … does not fabricate" contract to cover `review_started_at`. This is the exact precedent the whole design rests on: relay already has a field the command owns and the agent copies.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:40-48
# (heading below is quoted snippet content, indented to keep it out of the plan's own section list)
  ## Inputs (from the calling command)

- `draft_path`: absolute path to the DRAFT plan file. Must end in
  `.plan.md`. The command has already verified the file's current
  status is `*Status: DRAFT*` — you can trust that precondition.
- `target_root`: absolute path to the target project's root (the
  repository the user invoked `/relay-plan-review` from). Used to
  read `docs/context/methodology.md` for R5 and to resolve the
  source PRD path for R8.
```
Tasks 1–3 append a third bullet to this block (and its equivalent in each of the other six agents) declaring `review_started_at`.

```
# SOURCE: plugins/relay/commands/relay-plan-review.md:142-149
Execution context to pass into the Reviewer's Step 1:

- `draft_path`: the resolved absolute path verified by P1–P3.
  (Note: the agent's input field is named `draft_path` for
  symmetry with `prd-reviewer`'s convention; semantically it is
  the plan path. This is not a typo.)
- `target_root`: the cwd. Used for R5 (read methodology.md) and
  R8 (resolve source PRD path).
```
Task 4 appends a `review_started_at` bullet to this list in all eight commands, preceded by the capture instruction.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:1188-1192
One JSON object per line, appended (never truncated). Shape:

```json
{
  "timestamp": "2026-04-25T19:33:00Z",
```
The jsonl format section in each agent. Note the example is already a non-midnight instant — Task 1–3 must NOT change these examples (grounding established that every example in all seven files is already correct; the defect is behavioral, not exemplary).

```
# SOURCE: scripts/validate/checks/version-parity.mjs:46-129
const versionMatch = text.trim().match(/^\d+\.\d+\.\d+/);
...
if (pluginVersion !== changelogVersion) { ... }
```
Task 6 must satisfy this check: bumping `plugin.json` without adding a matching `<h2>` release heading in `changelog.html` fails `npm run validate`, which is how Level 3 enforces §7.5 automatically.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | 75% degenerate; clockless. Add input + discipline block. |
| `plugins/relay/agents/prd-reviewer.md` | UPDATE | 59% degenerate; clockless. |
| `plugins/relay/agents/design-map-reviewer.md` | UPDATE | Clockless; no corpus yet but will produce one. |
| `plugins/relay/agents/design-spec-reviewer.md` | UPDATE | Clockless; no corpus yet but will produce one. |
| `plugins/relay/agents/code-reviewer.md` | UPDATE | 25% degenerate despite existing prose; strengthen + self-serve fallback. |
| `plugins/relay/agents/test-reviewer.md` | UPDATE | Placeholder-only example; add input + discipline. |
| `plugins/relay/agents/docs-reviewer.md` | UPDATE | No prose; Bash-capable. |
| `plugins/relay/commands/relay-plan-review.md` | UPDATE | Adopts plan-reviewer inline; must capture + pass. |
| `plugins/relay/commands/relay-prd.md` | UPDATE | Adopts prd-reviewer inline (Phase B). |
| `plugins/relay/commands/relay-code-review.md` | UPDATE | Task-dispatches code-reviewer. |
| `plugins/relay/commands/relay-implement.md` | UPDATE | Task-dispatches code-reviewer (2 sites) and docs-reviewer. |
| `plugins/relay/commands/relay-test-write-review.md` | UPDATE | Task-dispatches test-reviewer. |
| `plugins/relay/commands/relay-approve.md` | UPDATE | Task-dispatches docs-reviewer. |
| `plugins/relay/commands/relay-design-map.md` | UPDATE | Task-dispatches design-map-reviewer. |
| `plugins/relay/commands/relay-design-spec.md` | UPDATE | Adopts design-spec-reviewer inline. |
| `docs/context/constraints.md` | UPDATE | Record the unrecoverable-corpus caveat. |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | §7.5 ship-asset version bump. |
| `documentation/changelog.html` | UPDATE | §7.5 changelog entry; version-parity gate. |

## NOT Building (Scope Limits)

- **Repairing historic jsonl entries.** Unrecoverable by construction — the real instant was never observed. Explicitly excluded; the caveat is documented instead.
- **Changing any reviewer's `tools:` allowlist.** The operator chose the invoker-supplied mechanism precisely to avoid expanding a recorded capability contract.
- **`post-green-reviewer.md`.** Audited and confirmed to append no jsonl at all — it returns a verdict to its command. Nothing to fix.
- **A new `scripts/validate/` check enforcing timestamp discipline.** Defensible follow-up, but adding an 11th check is separate work with its own test-pair obligation under R-X.
- **Changing the jsonl schema on the success path.** `timestamp_degraded` appears only on the degraded fallback path; `scripts/efficiency.mjs` reads `.timestamp` and ignores unknown keys.
- **Altering any JSON example's time value.** Grounding established all seven are already non-midnight; changing them would be churn and risks the verbatim-numeral checks.
- **Touching `plugins/prp-core/`.** Reference directory, not active relay code.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/plan-reviewer.md

**ACTION**: Append a `review_started_at` bullet to the `## Inputs (from the calling command)` block at lines 40–48, declaring it as a full UTC instant supplied by the invoker. Then insert a `### Timestamp discipline (mandatory)` block immediately before the ````json` example in the `## review.jsonl format` section (the example begins at line 1190), stating: the `timestamp` field MUST be `review_started_at` written through verbatim, in the exact format `YYYY-MM-DDTHH:MM:SSZ`, never a date-only value and never midnight; `2026-07-31T00:00:00Z` is explicitly named as an unacceptable value with the reason (a `T00:00:00Z` component means the instant was fabricated from a date rather than observed, and `scripts/efficiency.mjs compare` then sorts the entry before any same-day marker). Add the clockless fallback: if `review_started_at` was not supplied, append the verdict anyway — never drop an audit line — and add `"timestamp_degraded": true` to that same JSON object so the gap is visible rather than silent. Do NOT alter the existing example's time value, any `#### R-COH-*` heading, any rubric row, or the `rubric[]` length arithmetic prose.

**SATISFIES**: AC-A1, AC-A2, AC-A5, AC-A8.

**MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:40-48` (Inputs block shape) and `# SOURCE: plugins/relay/agents/code-reviewer.md:789-792` (the verbatim-from-command contract wording).

**VALIDATE**:
```bash
set -uo pipefail
f=plugins/relay/agents/plan-reviewer.md
grep -q 'review_started_at' "$f" || { echo "FAIL: plan-reviewer.md missing review_started_at"; exit 1; }
grep -q 'YYYY-MM-DDTHH:MM:SSZ' "$f" || { echo "FAIL: plan-reviewer.md does not state the required instant format"; exit 1; }
tr -d '\r' < "$f" | tr '\n' ' ' | tr -s ' ' | grep -q 'never a date-only value and never midnight' \
  || { echo "FAIL: plan-reviewer.md lacks the date-only prohibition"; exit 1; }
n=$(grep -c '^#### R-COH-' "$f")
[ "$n" -eq 13 ] || { echo "FAIL: R-COH heading count changed: $n (expected 13)"; exit 1; }
echo "PASS: plan-reviewer.md carries the timestamp contract; R-COH headings intact"
```

### Task 2: UPDATE the three remaining clockless reviewers

**ACTION**: Apply the identical treatment from Task 1 to `plugins/relay/agents/prd-reviewer.md` (Inputs block; jsonl format section at lines 618–634), `plugins/relay/agents/design-map-reviewer.md` (format section at lines 285–309), and `plugins/relay/agents/design-spec-reviewer.md` (format section at lines 349–368). Each gains the `review_started_at` input declaration, the `### Timestamp discipline (mandatory)` block with the same format requirement and prohibition wording, and the clockless `"timestamp_degraded": true` fallback. For `prd-reviewer.md` and `design-spec-reviewer.md`, state explicitly that the requirement is identical in both `invocation_context` modes — `main` and subagent — so the existing mode branching for flip ownership does not read as licensing a second timestamp behavior. Leave every example time value unchanged.

**SATISFIES**: AC-A1, AC-A2, AC-A4, AC-A5.

**MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:40-48` — same Inputs-block shape; the block authored in Task 1 is the template.

**VALIDATE**:
```bash
set -uo pipefail
miss=""
for f in prd-reviewer design-map-reviewer design-spec-reviewer; do
  p="plugins/relay/agents/$f.md"
  grep -q 'review_started_at'    "$p" || miss="$miss $f:input"
  grep -q 'YYYY-MM-DDTHH:MM:SSZ' "$p" || miss="$miss $f:format"
  grep -q 'timestamp_degraded'   "$p" || miss="$miss $f:fallback"
  tr -d '\r' < "$p" | tr '\n' ' ' | tr -s ' ' | grep -q 'never a date-only value and never midnight' \
    || miss="$miss $f:prohibition"
done
if [ -n "$miss" ]; then echo "FAIL: clockless reviewers incomplete:$miss"; exit 1; fi
echo "PASS: all 3 remaining clockless reviewers carry the full timestamp contract"
```

### Task 3: UPDATE the three Bash-capable reviewers

**ACTION**: Apply the same input declaration and `### Timestamp discipline (mandatory)` block to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/test-reviewer.md`, and `plugins/relay/agents/docs-reviewer.md`. In `code-reviewer.md`, replace the existing sentence at lines 789–790 ("The `timestamp` is captured at the moment of jsonl write, in UTC ISO-8601 (e.g. `2026-04-28T17:42:00Z`).") with the stronger block, preserving the following `attempt` sentence byte-for-byte — that sentence is the precedent being extended, not superseded. In `test-reviewer.md`, keep the `"<ISO-8601 UTC>"` placeholder in the example but make the surrounding prose state the concrete required format. Because these three have `Bash`, their fallback differs from Task 1/2's: if `review_started_at` was not supplied, obtain the instant directly with `date -u +%Y-%m-%dT%H:%M:%SZ` before appending — these agents never emit a fabricated stamp and never set `timestamp_degraded`.

**SATISFIES**: AC-A1, AC-A2, AC-A5, AC-A8.

**MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:789-792` — the sentence pair being strengthened, whose second half is preserved verbatim.

**VALIDATE**:
```bash
set -uo pipefail
miss=""
for f in code-reviewer test-reviewer docs-reviewer; do
  p="plugins/relay/agents/$f.md"
  grep -q 'review_started_at'                "$p" || miss="$miss $f:input"
  grep -q 'YYYY-MM-DDTHH:MM:SSZ'             "$p" || miss="$miss $f:format"
  grep -q 'date -u +%Y-%m-%dT%H:%M:%SZ'      "$p" || miss="$miss $f:selfserve"
  tr -d '\r' < "$p" | tr '\n' ' ' | tr -s ' ' | grep -q 'never a date-only value and never midnight' \
    || miss="$miss $f:prohibition"
done
if [ -n "$miss" ]; then echo "FAIL: bash-capable reviewers incomplete:$miss"; exit 1; fi
# The preserved attempt-precedent sentence must survive verbatim in code-reviewer.
tr -d '\r' < plugins/relay/agents/code-reviewer.md | tr '\n' ' ' | tr -s ' ' \
  | grep -q 'The `attempt` is verbatim from the COMMAND'"'"'s input' \
  || { echo "FAIL: code-reviewer.md lost the attempt-precedent sentence"; exit 1; }
echo "PASS: all 3 bash-capable reviewers carry the contract; attempt precedent preserved"
```

### Task 4: UPDATE the eight dispatching commands to capture and pass the instant

**ACTION**: In each of `relay-plan-review.md`, `relay-prd.md`, `relay-code-review.md`, `relay-implement.md`, `relay-test-write-review.md`, `relay-approve.md`, `relay-design-map.md`, and `relay-design-spec.md` under `plugins/relay/commands/`, add to the execution-context list that precedes each reviewer adoption or `Task` dispatch a `review_started_at` bullet, plus an instruction to capture the value immediately before dispatch with `date -u +%Y-%m-%dT%H:%M:%SZ`. Capture once per reviewer invocation, not once per command run — `relay-implement.md` dispatches `code-reviewer` at two sites (lines 312 and 334) and `docs-reviewer` at one (line 454), and each attempt must carry its own instant so retries are distinguishable in the audit trail. Do not alter any existing bullet, precondition, or HALT code. Verify whether `relay-execute.md` needs a change: it adopts `/relay-plan-review` inline per the D7 zero-duplication dispatch model, so it should inherit the capture without its own edit — confirm this by reading its adoption site and record the finding in `## Notes` either way.

**SATISFIES**: AC-A3, AC-A4.

**MIRROR**: `# SOURCE: plugins/relay/commands/relay-plan-review.md:142-149` — the execution-context list shape shared by all eight commands.

**VALIDATE**:
```bash
set -uo pipefail
miss=""
for f in relay-plan-review relay-prd relay-code-review relay-implement \
         relay-test-write-review relay-approve relay-design-map relay-design-spec; do
  p="plugins/relay/commands/$f.md"
  grep -q 'review_started_at'           "$p" || miss="$miss $f:input"
  grep -q 'date -u +%Y-%m-%dT%H:%M:%SZ' "$p" || miss="$miss $f:capture"
done
if [ -n "$miss" ]; then echo "FAIL: commands not supplying review_started_at:$miss"; exit 1; fi
# relay-implement dispatches three reviewer invocations; it must capture per-invocation.
c=$(grep -c 'review_started_at' plugins/relay/commands/relay-implement.md)
[ "$c" -ge 3 ] || { echo "FAIL: relay-implement.md has $c review_started_at mentions, expected >=3 (2x code-reviewer + 1x docs-reviewer)"; exit 1; }
echo "PASS: all 8 dispatching commands capture and pass a per-invocation instant"
```

### Task 5: UPDATE docs/context/constraints.md with the unrecoverable-corpus caveat

**ACTION**: Append a dated entry to the "Known TODOs / open planning items" section (lines 49–142) recording that verdict entries written before this fix carry a date-only `T00:00:00Z` stamp in 45.1% of cases (128/284 across `PRPs/plans/*.jsonl` on 2026-07-31), that these are unrecoverable and were deliberately not repaired, and that any `scripts/efficiency.mjs compare` whose boundaries span a marker must therefore use boundaries at least a full day apart until the corpus refills with post-fix entries. Name the concrete failure it prevents: a same-day artifact stamped at midnight sorts before a mid-day marker and is silently counted as pre-change. Match the house style of the existing dated notes in that section.

**SATISFIES**: AC-A6.

**MIRROR**: `# SOURCE: docs/context/constraints.md:62-124` — the dated accepted-technical-debt notes, whose bold-lead-in and discharge-note shape this entry follows.

**VALIDATE**:
```bash
set -uo pipefail
f=docs/context/constraints.md
n=$(tr -d '\r' < "$f" | tr '\n' ' ' | tr -s ' ' | grep -c 'at least a full day apart')
[ "$n" -ge 1 ] || { echo "FAIL: constraints.md lacks the marker-spanning boundary caveat"; exit 1; }
grep -q 'T00:00:00' "$f" || { echo "FAIL: constraints.md does not name the degenerate stamp"; exit 1; }
grep -q 'efficiency.mjs' "$f" || { echo "FAIL: constraints.md does not name the affected consumer"; exit 1; }
echo "PASS: constraints.md records the unrecoverable-corpus caveat"
```

### Task 6: UPDATE plugin.json version and documentation/changelog.html

**ACTION**: Bump `version` in `plugins/relay/.claude-plugin/plugin.json` from `0.24.0` to `0.25.0` (a behavior change to the audit-log contract across seven agents and eight commands is a minor bump, not a patch). Add a matching release entry to `documentation/changelog.html` whose `<h2>` heading text begins `0.25.0` so `version-parity` reconciles the two, describing the new `review_started_at` contract, the root cause (clockless reviewers, not weak wording), and the explicit non-goal of repairing historic entries. Follow `documentation/AGENTS.md` §7.5 (lines 332–369) — including any NAV and search-index obligations that section imposes.

**SATISFIES**: AC-A7.

**MIRROR**: `# SOURCE: scripts/validate/checks/version-parity.mjs:46-129` — the check that reconciles `plugin.json`'s `version` against the first non-unreleased `<h2>` release heading; satisfying it is the definition of done here.

**VALIDATE**:
```bash
set -uo pipefail
v=$(node -p "require('./plugins/relay/.claude-plugin/plugin.json').version")
if [ "$v" = "0.24.0" ]; then echo "FAIL: plugin.json still at 0.24.0 - no version bump"; exit 1; fi
grep -q "$v" documentation/changelog.html || { echo "FAIL: changelog.html has no entry for $v"; exit 1; }
node scripts/validate/index.mjs 2>&1 | grep -q '\[PASS\] version-parity' \
  || { echo "FAIL: version-parity check does not pass"; exit 1; }
echo "PASS: plugin.json at $v with a matching changelog entry; version-parity green"
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
# Every touched markdown file must still parse its YAML frontmatter, and
# plugin.json must remain valid JSON.
node -e "JSON.parse(require('fs').readFileSync('plugins/relay/.claude-plugin/plugin.json','utf8'))"
for f in plan-reviewer prd-reviewer code-reviewer test-reviewer docs-reviewer \
         design-map-reviewer design-spec-reviewer; do
  head -1 "plugins/relay/agents/$f.md" | grep -q '^---$' \
    || { echo "FAIL: $f.md frontmatter fence missing"; exit 1; }
done
echo "PASS: JSON valid; all 7 agent frontmatter fences intact"
```

### Level 2 — CONTENT_INVARIANTS

```bash
set -uo pipefail
AG="plan-reviewer prd-reviewer code-reviewer test-reviewer docs-reviewer design-map-reviewer design-spec-reviewer"
CM="relay-plan-review relay-prd relay-code-review relay-implement relay-test-write-review relay-approve relay-design-map relay-design-spec"
fail=0

for f in $AG; do
  p="plugins/relay/agents/$f.md"
  grep -q 'review_started_at'    "$p" || { echo "FAIL: $f missing review_started_at"; fail=1; }
  grep -q 'YYYY-MM-DDTHH:MM:SSZ' "$p" || { echo "FAIL: $f missing required format"; fail=1; }
  tr -d '\r' < "$p" | tr '\n' ' ' | tr -s ' ' | grep -q 'never a date-only value and never midnight' \
    || { echo "FAIL: $f missing date-only prohibition"; fail=1; }
done

for f in $CM; do
  p="plugins/relay/commands/$f.md"
  grep -q 'review_started_at'           "$p" || { echo "FAIL: $f not passing review_started_at"; fail=1; }
  grep -q 'date -u +%Y-%m-%dT%H:%M:%SZ' "$p" || { echo "FAIL: $f not capturing the instant"; fail=1; }
done

# No tools: line may change - the invoker-supplied design exists to avoid this.
for f in plan-reviewer design-map-reviewer design-spec-reviewer; do
  grep -m1 '^tools:' "plugins/relay/agents/$f.md" | grep -q 'Bash' \
    && { echo "FAIL: $f gained Bash - tools contract was not to change"; fail=1; }
done
grep -m1 '^tools:' plugins/relay/agents/prd-reviewer.md | grep -q 'Bash' \
  && { echo "FAIL: prd-reviewer gained Bash - tools contract was not to change"; fail=1; }

[ "$fail" -eq 0 ] || exit 1
echo "PASS: contract present in all 15 files; no tools: line widened"
```

### Level 3 — INTEGRATION

```bash
set -euo pipefail
# The full ten-check suite must stay green. version-parity transitively
# enforces AGENTS.md 7.5 (plugin.json must match the changelog heading).
npm run validate
# The efficiency consumer must still run against the existing corpus.
node scripts/efficiency.mjs compare --since v0.24.0 >/dev/null
echo "PASS: 10/10 validation checks green; efficiency compare still executes"
```

## Acceptance Criteria

*R8b (PRD AC-N token check) does not apply in description mode — no `(PRD AC-N)` token is required on these items.*

- **AC-A1:** All seven jsonl-appending reviewer agents (`plan-reviewer`, `prd-reviewer`, `code-reviewer`, `test-reviewer`, `docs-reviewer`, `design-map-reviewer`, `design-spec-reviewer`) declare a `review_started_at` input and state that the `timestamp` field must be that value written verbatim in `YYYY-MM-DDTHH:MM:SSZ` form.
- **AC-A2:** Each of those seven agents contains an explicit prohibition on a date-only or midnight value, phrased so it cannot be read as "today's date is fine", and names a concrete unacceptable example.
- **AC-A3:** All eight dispatching commands capture the instant with `date -u +%Y-%m-%dT%H:%M:%SZ` immediately before each reviewer invocation and pass it in their execution-context list, with `relay-implement.md` capturing separately for each of its three reviewer dispatch sites.
- **AC-A4:** No reviewer's `tools:` allowlist gains `Bash` (or any other tool) — the invoker-supplied mechanism is what makes the tool contract unnecessary to change.
- **AC-A5:** A reviewer that does not receive `review_started_at` never silently emits a fabricated stamp: Bash-capable reviewers self-serve `date -u`, and clockless reviewers append the verdict with `"timestamp_degraded": true` so the gap is visible in the corpus.
- **AC-A6:** `docs/context/constraints.md` records that historic entries are unrecoverable and that marker-spanning `efficiency.mjs compare` boundaries must be at least a full day apart until the corpus refills.
- **AC-A7:** `plugin.json` is bumped off `0.24.0` and `documentation/changelog.html` carries a matching release entry, with `version-parity` and all ten checks passing under `npm run validate`.
- **AC-A8:** No `#### R-COH-*` heading count, rubric row, `rubric[]` length arithmetic, or existing JSON example time value changes in any agent file — the four `scripts/validate/checks/*.test.mjs` files that assert verbatim numerals against `plan-reviewer.md` and `code-reviewer.md` still pass.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| An edit to `plan-reviewer.md` or `code-reviewer.md` perturbs a verbatim numeral, heading count, or `rubric[]` arithmetic asserted by an existing `node:test` check | medium | high | Every task's VALIDATE is additive-only (grep for new tokens); Task 1 additionally pins the `#### R-COH-` heading count at 10, and Level 3 runs the full suite. Edits insert new prose blocks rather than rewriting existing ones. |
| The clockless fallback's `timestamp_degraded` key is read as a schema change by a downstream consumer | low | medium | `scripts/efficiency.mjs` reads `.timestamp` only and ignores unknown keys; the key appears solely on the degraded path, which the same change makes unreachable for all eight in-tree invokers. |
| Prose alone still fails for the three Bash-capable reviewers, as it did for `code-reviewer` since 2026-04-29 | medium | medium | Those three get a mechanical fallback (`date -u`) in addition to wording, so compliance no longer depends on the model choosing to observe the clock. |
| `relay-execute.md` does not in fact inherit the capture through inline adoption, leaving orchestrated runs still degenerate | medium | high | Task 4 makes verifying this an explicit deliverable with the finding recorded in `## Notes` either way, rather than assuming D7 inheritance. |
| A future reviewer agent is added without the contract, silently reintroducing the defect | medium | medium | Out of scope here, but flagged: a `scripts/validate/` check asserting the contract across every jsonl-appending agent is the durable guard. Recorded as follow-up in `## Notes`. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Grounding correction — the brief's premise about examples was wrong.** The description asked to "make every JSON example in those files use a non-midnight time". Grounding established that every JSON example in all seven agents is *already* non-midnight (`plan-reviewer.md:1192` = `19:33:00Z`, `code-reviewer.md:936/965/988`, `prd-reviewer.md:628`, `docs-reviewer.md:418`, `design-map-reviewer.md:298`, `design-spec-reviewer.md:362`; `test-reviewer.md:462` is a placeholder). The agents emit midnight despite a correct example in front of them, so that sub-task is a no-op and was dropped. This is also positive evidence that few-shot example-following is not the mechanism here.

**Root-cause revision.** The brief attributed the defect to weak wording. The corpus says otherwise: degenerate rate tracks clock availability almost perfectly — `plan-reviewer` 75% and `prd-reviewer` 59% (`tools:` has no Bash) versus `code-reviewer` 25% and `test-reviewer` 2% (Bash present). Four reviewers cannot observe the time at all, so `T00:00:00Z` is their honest answer. Wording remains a genuine secondary gap for the Bash-capable three, which is why Task 3 exists alongside Task 4.

**Design decision (operator, this session).** Two mechanisms were offered for supplying the clock: granting `Bash` to the four clockless reviewers, or having the invoking command capture and pass the instant. The operator chose the invoker-supplied mechanism, applied uniformly across both dispatch modes. It preserves every reviewer's read-only-except-jsonl posture, requires no `tools:` contract change (and therefore no `docs/decisions.md` capability-expansion entry), and mirrors the `attempt` field precedent already shipped in `code-reviewer.md:790-792`.

**`phase_type: scaffold` rationale.** Every file this plan touches is prompt/config wiring — 16 markdown prompt files, one `plugin.json`, one `changelog.html` — with no application source. Its legitimate validation is content-invariant greps plus Node built-ins (`node -p`, `node scripts/validate/index.mjs`), not `node:test` assertions, because there is no code under test. This selects the correct `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption and matches this repo's established precedent for prompt-file phases (`implement-phase-docs-sync-phase-2-relay-implement-dispatch`, `figma-visual-first-track-phase-6-orchestrator-wiring`, `validation-suite-phase-4-pre-commit-wiring`, all `scaffold`). The first DRAFT declared `feature` and was correctly rejected for it.

**Revision history.** Attempt 1 returned CHANGES_REQUESTED on three items, all corrected here: R2 (a quoted `## Inputs (from the calling command)` heading inside a Patterns-to-Mirror snippet scanned as an extra top-level section — now indented), `R-COH-TASK-AC-MISSING` (Tasks 1–5 carried no AC-A references — each task now declares a `**SATISFIES**:` line), and `R-COH-VALIDATE-FRAMEWORK-MISMATCH` (`phase_type` corrected from `feature` to `scaffold`, per the rationale above). Grounding was not re-run: no cited rubric id falls in the grounding-dependent carve-out, so `## Patterns to Mirror` and `## Mandatory Reading` are preserved from attempt 1.

**`relay-execute.md` inheritance — verified, no edit needed.** Task 4 required confirming rather than assuming this. `relay-execute.md:335` reads `Read ${CLAUDE_PLUGIN_ROOT}/commands/relay-plan-review.md and execute its full protocol inline against current_plan_path` — full-protocol inline adoption under the D7 zero-duplication dispatch model. Because `relay-plan-review.md`'s Phase A now carries both the `date -u +%Y-%m-%dT%H:%M:%SZ` capture instruction and the `review_started_at` execution-context bullet, `relay-execute.md` inherits the capture automatically. It was deliberately left untouched; orchestrated runs are covered.

**Follow-up not built here.** No static check enforces this contract, so a future reviewer agent could be added without it. An 11th `scripts/validate/` check asserting that every jsonl-appending agent declares `review_started_at` would make the fix self-policing. Deliberately deferred: a new check needs its own `node:test` unit tests, which under R-X strict must come from the test-writer/test-reviewer pair rather than the Implementer (`docs/decisions.md` [2026-05-06]).

**VALIDATE commands were verified against the unmodified tree before this plan was written.** Each of the five distinctive greps returns 0 matches today and each command exits 1 with an informative message: `review_started_at` absent from all 7 agents and all 8 commands, `YYYY-MM-DDTHH:MM:SSZ` absent from all 7 agents, the CRLF-normalized prohibition phrase absent from all 7, and `plugin.json` still reading `0.24.0`. Baseline `npm run validate` is 10 passed / 0 failed, so Level 3's green requirement is a real gate rather than a pre-satisfied one. All multi-word phrase checks normalize with `tr -d '\r' | tr '\n' ' ' | tr -s ' '` per the repo's CRLF convention.

*Generated: 2026-07-31*
*Approved: 2026-07-31*
*Implemented: 2026-07-31*
*Status: IMPLEMENTED*
