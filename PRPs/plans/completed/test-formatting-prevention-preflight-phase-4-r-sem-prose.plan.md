# Feature: R-SEM prose (Phase 4 of test-formatting-prevention-preflight)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions (R-X/D17 byte-identical invariant); cross-cutting prose clarification spanning two agent files in the same writer/reviewer pair (`code-reviewer`, `implementer`)
- Decisions found:
  - [2026-08-26] Test-formatting prevention runs at the command layer, never inside `test-writer` (Phase 2 of this same PRD) — confirms `code-reviewer.md`'s R-X/D17 stays untouched by this feature's structural phases; this phase is the prose-only complement codifying the arbitration's second ruling (`docs/decisions.md:2167-2176`).
  - [2026-05-06]/[2026-07-10] TDD pair is the only authorized test-file author; R-X strict (D17) preserved verbatim — cited by the source PRD's own Decision Gate block and by Phase 3's plan (`PRPs/plans/completed/test-formatting-prevention-preflight-phase-3-preflight.plan.md:11`).
  - [2026-04-30] `code-reviewer` has no `Edit` tool (read-only charter) — reinforces why this phase's clarification lives entirely in prose (agent instructions), never in a new capability.
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the loop turn green" (`docs/anti-patterns.md:15-21`) — this phase touches zero test files and zero test-file semantics; it clarifies authorization language only.
  - "Writing pipeline artifacts under `.claude/`" (`docs/anti-patterns.md:61-67`) — not triggered by this phase's two-file edit set, restated as the standing structural constraint.
- Applicable architectural rules:
  - Writer/reviewer split — `code-reviewer`'s R-X/D17 stay byte-identical; zero bytes inside the R-X section are touched by this plan (mechanically verified, Task 3 + Level 2).
  - `code-reviewer`'s read-only review philosophy (D11) — the prose addition documents a consequence of that charter; it does not expand its tools or its `Write` scope.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-formatting-prevention-preflight.prd.md` — Implementation
  Phases row 4: "R-SEM prose" — Goal: The arbitration's second ruling
  becomes explicit prose — Success signal: AC-4, AC-5, AC-7 hold on diff
  inspection.

## Summary

Add explicit clarifying prose to exactly two agent files —
`plugins/relay/agents/code-reviewer.md` (its R-SEM section) and
`plugins/relay/agents/implementer.md` (its Anti-patterns list, adjacent
to the existing "never edit the test silently" bullet) — codifying the
2026-08-26 arbitration's second ruling: an R-SEM finding that requests a
test change is never itself authorization to edit that test
(`TEST_CONTRACT_DISPUTE` remains mandatory even when the reviewer
requested the change, PRD AC-5), and the implementer never opens
`TEST_CONTRACT_DISPUTE` for a formatting-only difference (PRD AC-7,
prose half — Phase 3 already shipped AC-7's structural half). The
existing `### R-X — Universal test-modification guard (straight fail,
D17)` section in `code-reviewer.md` — its rule text, canonical
test-glob pathspec set, git command, and straight-fail semantics —
ships byte-identical (PRD AC-4), mechanically verified by a dedicated
task and a Level 2 Validation Command that diffs the section against
the pre-phase `HEAD` baseline.

## User Story

As the relay pipeline operator, I want the code-reviewer and the
implementer to state explicitly that an R-SEM finding is not
self-executing authorization to edit a test and that formatting is
never a `TEST_CONTRACT_DISPUTE` subject, so that a future run cannot
repeat the ~100k-token arbitration this PRD's Evidence section
describes, without touching the R-X guard whose entire value is having
zero exceptions.

## Problem Statement

Narrowed to this phase's scope: before this change, both
`code-reviewer.md`'s R-SEM section and `implementer.md`'s
"never edit the test silently" anti-pattern bullet leave two things
only implicit: (a) whether an R-SEM finding that names a test change
counts as authorization to make that change outside the
`TEST_CONTRACT_DISPUTE` channel, and (b) whether a formatting-only
mismatch is a legitimate `TEST_CONTRACT_DISPUTE` `claim`. The
2026-08-26 field arbitration on `assistente-pessoal` exploited exactly
this ambiguity, burning a full dispute round to authorize a change
later verified as semantically empty. `research-web` (dispatched
during this plan's GROUNDING) corroborates the general risk: several
LLM-agent guardrail sources agree that prompt-level prose is advisory,
not enforcement, and that a model can rationalize around instructions
that are merely implicit — the concrete failure mode PRD AC-5 and AC-7
require this phase to close by making both rules explicit.

## Solution Statement

Insert one clarifying paragraph into `code-reviewer.md`'s existing
R-SEM section — strictly before the `### R-X` heading, verified never
to cross it — stating that an R-SEM finding carries no delegated
authority to edit a test outside `TEST_CONTRACT_DISPUTE`. Insert two
new anti-pattern bullets into `implementer.md`, immediately after the
existing "Silently editing a test file" bullet, stating the same
non-authorization rule from the implementer's side and stating that
formatting is never a dispute subject. Both additions are pure prose;
neither task edits `code-reviewer.md`'s R-X section, its tools
allowlist, or `implementer.md`'s Phase 2.3/Phase 4.B structural logic.

## Metadata

| Field | Value |
|-------|-------|
| Type | Prompt-only prose clarification (no runtime source) |
| Complexity | Low |
| Systems Affected | `plugins/relay/agents/code-reviewer.md` (R-SEM section only — R-X section untouched), `plugins/relay/agents/implementer.md` (Anti-patterns section only) |
| Dependencies | none (`Depends: -` in the source PRD's Implementation Phases row 4) |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/test-formatting-prevention-preflight.prd.md:295, 363-369` (Implementation Phases row 4 + Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/code-reviewer.md` | 347-372 | The exact R-SEM section boundary — Task 1's insertion point, strictly before `### R-X` |
| P0 | `plugins/relay/agents/code-reviewer.md` | 373-406 | The R-X rule text, canonical 12-pattern test-glob pathspec set, git command, and straight-fail semantics — must stay byte-identical (AC-4); the section Task 3 mechanically verifies |
| P0 | `plugins/relay/agents/implementer.md` | 773-780 | "Never edit the test silently" anti-pattern bullet — Task 2's exact insertion anchor |
| P0 | `plugins/relay/agents/implementer.md` | 566-607 | Phase 4.B `TEST_CONTRACT_DISPUTE` structured-verdict definition and discipline reminders — the channel both new bullets reference; grounds accurate prose |
| P1 | `PRPs/prds/test-formatting-prevention-preflight.prd.md` | 133-148 | AC-5 and AC-7 verbatim text — the source wording this phase's prose reuses for traceability |
| P1 | `docs/decisions.md` | 2167-2176 | 2026-08-26 "Test-formatting prevention runs at the command layer" decision — this feature's own precedent for keeping R-X untouched across every structural phase |
| P2 | `PRPs/plans/completed/test-formatting-prevention-preflight-phase-3-preflight.plan.md` | 491-496 | "AC-7 prose deferred to Phase 4, by design" — confirms this phase's scope boundary and that Phase 3 deliberately left this prose unwritten |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/code-reviewer.md:347-372
### R-SEM — Semantic review of the diff (business-rule consistency, bugs, security gaps)

This is the primary value layer per D4 of the source PRD —
automated lint and type-check (R-L1/R-L2/R-L3) catch syntactic
issues; R-SEM catches the dangerous class of logic errors that
pass compilation. Evaluate:
...
PASS iff no concerns. FAIL with a structured `findings[]` array of
`{file, line_or_range, concern, severity}`. Severity is
`{low, medium, high}`. ANY high-severity finding fails R-SEM
regardless of count; medium/low findings fail only when accumulated
above a project-tunable threshold (MVP: any medium finding fails;
low findings are advisory and do not fail).
```
Task 1 appends its new paragraph immediately after this exact text,
strictly before the blank line + `### R-X` heading that follows.

```
# SOURCE: plugins/relay/agents/code-reviewer.md:373-406
### R-X — Universal test-modification guard (straight fail, D17)

Using the canonical test-glob pathspec set:

'**/test_*.py' '**/tests/**/*.py' '**/*.test.ts' '**/*.test.tsx'
'**/*.spec.ts' '**/*.spec.tsx' '**/*.test.js' '**/*.spec.js'
'**/*_test.go' '**/tests/**/*.rb' '**/*_spec.rb'
'**/__tests__/**' '**/*.test.rs' '**/*_test.rs'
'**/*.test.jsx' '**/*.test.mjs' '**/*.test.cjs' '**/spec/**'

Run via `Bash`:

git diff --name-only <diff_target>..HEAD -- <pathspec-set>
...
```
Task 3 and the Level 2 Validation Command extract exactly this section
(from the `### R-X` heading through, but excluding, the following
`## The R-COH-* coherence layer` heading) from both the pre-phase
`HEAD` baseline and the post-edit working tree, and FAIL on any byte
difference — this is the section neither task may touch.

```
# SOURCE: plugins/relay/agents/implementer.md:775-780
- **Silently editing a test file.** Universal R-X (D9 Layer 0) —
  fires regardless of `tdd:` value. If a plan task asks for a test
  edit, halt with the `TEST_FILE_EDIT_REJECTED` structured error
  (Phase 2.3). If the implementer believes a test contradicts the
  PRD (and the plan does NOT ask for an edit), emit
  `TEST_CONTRACT_DISPUTE` (Phase 4.B) — never edit the test silently.
```
Task 2 inserts its two new bullets immediately after this exact bullet,
before the following "Re-grounding via research subagents" bullet.

```
# SOURCE: PRPs/plans/completed/test-formatting-prevention-preflight-phase-3-preflight.plan.md:400-408
### Level 2: CONTENT_INVARIANTS
if git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md | grep -q .; then
  echo "FAIL: code-reviewer.md was modified — R-X/D17 must stay byte-identical (PRD AC-4)"
  exit 1
else
  echo "PASS: code-reviewer.md untouched by this phase"
fi
```
Phase 3's Level 2 check asserted the whole file stayed untouched
(correct for a phase that never edits `code-reviewer.md`). This phase
DOES edit `code-reviewer.md` (R-SEM only), so Task 3 / this plan's own
Level 2 adapts the same real-exit-code diff idiom to a section-scoped
comparison instead of a whole-file one — same discipline, narrower
scope.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/code-reviewer.md` | UPDATE | Adds R-SEM clarifying prose (AC-5) strictly before the `### R-X` heading; R-X section itself is untouched (AC-4) |
| `plugins/relay/agents/implementer.md` | UPDATE | Adds two anti-pattern bullets clarifying AC-5 (R-SEM not self-executing) and AC-7 (no formatting disputes) |

## NOT Building (Scope Limits)

- **An R-X / D17 carve-out** — zero bytes inside the R-X section
  change; mechanically verified by Task 3 and Level 2 (PRD AC-4).
- **Any mutating tool on the code-reviewer** — its read-only charter,
  `Edit`-less tools allowlist, and `Write` scope (jsonl log only) are
  untouched.
- **A formatting sub-channel in `TEST_CONTRACT_DISPUTE`** — the new
  prose states the opposite: formatting is explicitly excluded from
  the channel, never given its own lane.
- **Structural preflight/prevention mechanics** — already shipped in
  Phases 2 (Prevention) and 3 (Preflight); this phase is prose only,
  no discovery chain, no formatter invocation, no new methodology key.
- **A `docs/decisions.md` or `docs/anti-patterns.md` entry for this
  phase's own change** — the source PRD's Phase 5 ("Docs + release")
  owns the Decisions Log entry for the overall feature (confirmed: as
  of this plan, `docs/decisions.md` records Phase 2's decision only —
  no Phase 3 or Phase 4 entry exists yet, consistent with that Phase 5
  ownership).
- **Any change to `implementer.md`'s Phase 2.3 halt logic or Phase
  4.B verdict shape** — both are structural code paths already
  correct; this phase adds anti-pattern prose only, referencing them.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/code-reviewer.md — append R-SEM clarifying prose (AC-A1, PRD AC-5)

**ACTION**: `Edit` `plugins/relay/agents/code-reviewer.md`. Delivers
AC-A1 (PRD AC-5): the R-SEM section states explicitly that a finding
requesting a test change is not self-executing authorization to edit
that test. Match the
exact existing text (the R-SEM section's closing paragraph, ending
immediately before the blank line + `### R-X` heading):

```
PASS iff no concerns. FAIL with a structured `findings[]` array of
`{file, line_or_range, concern, severity}`. Severity is
`{low, medium, high}`. ANY high-severity finding fails R-SEM
regardless of count; medium/low findings fail only when accumulated
above a project-tunable threshold (MVP: any medium finding fails;
low findings are advisory and do not fail).
```

Replace it with the same text plus a new paragraph appended after a
blank line — leaving everything from the following blank line onward
(including the entire `### R-X` section) byte-for-byte untouched,
since the `old_string` match ends before that boundary:

```
PASS iff no concerns. FAIL with a structured `findings[]` array of
`{file, line_or_range, concern, severity}`. Severity is
`{low, medium, high}`. ANY high-severity finding fails R-SEM
regardless of count; medium/low findings fail only when accumulated
above a project-tunable threshold (MVP: any medium finding fails;
low findings are advisory and do not fail).

**Not self-executing authorization (2026-08-26 arbitration follow-up):**
An R-SEM finding is not self-executing authorization to edit a test.
When a `concern` implies a test file should change, the finding still
only records a semantic disagreement — it does NOT license the
implementer, or any other agent, to edit the test file directly.
`TEST_CONTRACT_DISPUTE`, arbitrated in Phase 3 below, remains the
mandatory channel even when it was this agent's own R-SEM row that
requested the change. This agent's read-only charter (Hard constraint
2) already forbids editing the test itself; this note makes explicit
that an R-SEM finding also carries no delegated authority for anyone
else to do so outside the dispute channel.
```

**MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:347-372`
(R-SEM section boundary — insertion point).

**VALIDATE**:
```bash
SEM_LINE=$(grep -n "Not self-executing authorization" plugins/relay/agents/code-reviewer.md | head -1 | cut -d: -f1)
RX_LINE=$(grep -n "^### R-X — Universal test-modification guard" plugins/relay/agents/code-reviewer.md | head -1 | cut -d: -f1)
if [ -z "$SEM_LINE" ] || [ -z "$RX_LINE" ] || [ "$SEM_LINE" -ge "$RX_LINE" ]; then
  echo "FAIL: R-SEM clarification missing, or not positioned before the R-X heading"
  exit 1
else
  echo "PASS: R-SEM clarification (line $SEM_LINE) precedes R-X heading (line $RX_LINE)"
fi
```

### Task 2: UPDATE plugins/relay/agents/implementer.md — add two anti-pattern bullets (AC-A1, AC-A2, PRD AC-5, AC-7)

**ACTION**: `Edit` `plugins/relay/agents/implementer.md`. Delivers
AC-A1 (PRD AC-5, implementer-side restatement — an R-SEM finding is not
self-executing authorization to edit a test) and AC-A2 (PRD AC-7 —
the implementer never opens `TEST_CONTRACT_DISPUTE` for a
formatting-only difference). Match the
exact existing text (the "Silently editing a test file" bullet,
immediately followed by the "Re-grounding via research subagents"
bullet):

```
- **Silently editing a test file.** Universal R-X (D9 Layer 0) —
  fires regardless of `tdd:` value. If a plan task asks for a test
  edit, halt with the `TEST_FILE_EDIT_REJECTED` structured error
  (Phase 2.3). If the implementer believes a test contradicts the
  PRD (and the plan does NOT ask for an edit), emit
  `TEST_CONTRACT_DISPUTE` (Phase 4.B) — never edit the test silently.
- **Re-grounding via research subagents.** No `Task` tool per D11.
  The plan is the source of truth.
```

Replace it with the same two bullets, with two new bullets inserted
between them:

```
- **Silently editing a test file.** Universal R-X (D9 Layer 0) —
  fires regardless of `tdd:` value. If a plan task asks for a test
  edit, halt with the `TEST_FILE_EDIT_REJECTED` structured error
  (Phase 2.3). If the implementer believes a test contradicts the
  PRD (and the plan does NOT ask for an edit), emit
  `TEST_CONTRACT_DISPUTE` (Phase 4.B) — never edit the test silently.
- **Treating an R-SEM finding as self-executing test-edit authorization.**
  A code-review R-SEM finding that requests a test change is not
  itself authorization to edit the test — `TEST_CONTRACT_DISPUTE`
  (Phase 4.B) remains the mandatory channel even when it was the
  reviewer that requested the change. A `prior_feedback` entry citing
  an R-SEM row is read, per "Targeted revision mode" above, like any
  other citation: it identifies what to fix in the *implementation*,
  never a license to edit the disputed test directly.
- **Opening `TEST_CONTRACT_DISPUTE` for formatting.** Dispute is the
  channel for semantic contradiction between a test's expectations
  and the PRD — never for whitespace, indentation, quote style, or
  any other formatting-only difference. A formatting-only mismatch is
  not a `claim` this agent may submit through Phase 4.B.
- **Re-grounding via research subagents.** No `Task` tool per D11.
  The plan is the source of truth.
```

**MIRROR**: `# SOURCE: plugins/relay/agents/implementer.md:775-780`
(anti-pattern bullet — insertion anchor).

**VALIDATE**:
```bash
grep -q "R-SEM finding that requests a test change is not" plugins/relay/agents/implementer.md && \
grep -q 'Opening `TEST_CONTRACT_DISPUTE` for formatting' plugins/relay/agents/implementer.md
```

### Task 3: VERIFY plugins/relay/agents/code-reviewer.md — R-X section stays byte-identical (AC-4, mechanical proof)

**ACTION**: No `Edit`/`Write` in this task — it is a verification-only
task. Via `Bash`, extract the `### R-X` section (from the `### R-X`
heading through, but excluding, the following `## The R-COH-*
coherence layer` heading) from both the pre-phase `HEAD` baseline
(`git show HEAD:plugins/relay/agents/code-reviewer.md`) and the
current working-tree file (post-Task-1 edit), and diff them. Since
`code-reviewer.md` has not been touched by any of Phases 1-3 of this
feature (confirmed: Phase 3's own Level 2 Validation Command asserted
zero changes to it relative to `HEAD`, and Pillar 2 never commits —
`docs/decisions.md` 2026-05-18), `HEAD` is a valid pre-phase baseline
for this comparison at the time this task runs.

**MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:373-406`
(R-X section content — the exact range extracted and compared);
`# SOURCE: PRPs/plans/completed/test-formatting-prevention-preflight-phase-3-preflight.plan.md:400-408`
(real-exit-code diff idiom this task adapts to a section-scoped
comparison).

**VALIDATE**:
```bash
set -euo pipefail
extract_rx() {
  awk '
    /^### R-X — Universal test-modification guard \(straight fail, D17\)$/ { flag=1 }
    /^## The R-COH-\* coherence layer/ { flag=0 }
    flag
  '
}
if ! diff <(git show HEAD:plugins/relay/agents/code-reviewer.md | extract_rx) <(extract_rx < plugins/relay/agents/code-reviewer.md); then
  echo "FAIL: R-X section (code-reviewer.md) differs from the pre-phase HEAD baseline — AC-4 byte-identical requirement violated"
  exit 1
else
  echo "PASS: R-X section byte-identical to HEAD"
fi
```

## Validation Commands

### Level 1: STATIC_ANALYSIS
```bash
npm run validate
```
(Must exit 0 — the repo's 14-check static-consistency gate.)

### Level 2: CONTENT_INVARIANTS
```bash
set -euo pipefail
extract_rx() {
  awk '
    /^### R-X — Universal test-modification guard \(straight fail, D17\)$/ { flag=1 }
    /^## The R-COH-\* coherence layer/ { flag=0 }
    flag
  '
}
if ! diff <(git show HEAD:plugins/relay/agents/code-reviewer.md | extract_rx) <(extract_rx < plugins/relay/agents/code-reviewer.md); then
  echo "FAIL: R-X section (code-reviewer.md) differs from the pre-phase HEAD baseline — AC-4 byte-identical requirement violated"
  exit 1
else
  echo "PASS: R-X section byte-identical to HEAD"
fi
```

### Level 3: INTEGRATION / DRY-RUN
```bash
set -euo pipefail
extract_rx() {
  awk '
    /^### R-X — Universal test-modification guard \(straight fail, D17\)$/ { flag=1 }
    /^## The R-COH-\* coherence layer/ { flag=0 }
    flag
  '
}
if extract_rx < plugins/relay/agents/code-reviewer.md | grep -qiE 'except formatting|carve-out|exception clause|formatting exception'; then
  echo "FAIL: forbidden carve-out/exception language found inside the R-X section"
  exit 1
fi
grep -q "R-SEM finding is not self-executing authorization" plugins/relay/agents/code-reviewer.md
grep -q "R-SEM finding that requests a test change is not" plugins/relay/agents/implementer.md
grep -q 'Opening `TEST_CONTRACT_DISPUTE` for formatting' plugins/relay/agents/implementer.md
echo "PASS: AC-5/AC-7 clarifying prose present in both files; no carve-out language inside R-X"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-5):** Given a code-review R-SEM finding that requests
  a test change, both `code-reviewer.md`'s R-SEM section and
  `implementer.md`'s anti-pattern bullets state explicitly that the
  finding is not self-executing authorization — `TEST_CONTRACT_DISPUTE`
  remains the mandatory channel even when it was the reviewer that
  requested the change.
- **AC-A2 (PRD AC-7):** Given the shipped `implementer.md`, its
  anti-pattern list states explicitly that the implementer does NOT
  open `TEST_CONTRACT_DISPUTE` for formatting — dispute is the channel
  for semantic contradiction with the PRD, never whitespace.
- **AC-A3 (PRD AC-4):** Given the shipped change, `code-reviewer.md`'s
  R-X rule text, canonical test-glob pathspec set, git command, and
  D17 straight-fail semantics are byte-identical to the pre-phase
  `HEAD` baseline — zero carve-outs, zero new exception prose inside
  the rule — verified mechanically by Task 3 and the Level 2
  Validation Command above.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A prose edit to R-SEM accidentally drifts past the `### R-X` heading boundary, silently violating AC-4 | L | High | Task 1's `Edit` uses a narrow `old_string` ending exactly at the R-SEM section's last sentence, never including or touching the R-X heading; Task 3 and the Level 2 command mechanically diff the R-X section against the pre-phase `HEAD` baseline and FAIL (non-zero exit) on any byte difference |
| Clarifying prose reads as a formatting-dispute carve-out — the exact anti-pattern this PRD forbids | L | High | Level 3's grep explicitly fails on carve-out/exception vocabulary found inside the R-X section specifically; the new prose lives in R-SEM (`code-reviewer.md`) and the anti-patterns list (`implementer.md`), never inside R-X itself |
| Prompt-level prose is advisory, not enforcement — `research-web` (this plan's GROUNDING) found multiple LLM-agent-guardrail sources arguing that instructions written into a system prompt can be rationalized around, since real prevention needs an enforcement point outside the model's own reasoning | M | M | Accepted for this phase by design: the PRD's structural enforcement (Prevention in Phase 2, Preflight in Phase 3) already removes the scenario that motivates a formatting dispute in practice; this phase's prose closes the interpretive gap the 2026-08-26 arbitration exposed for the R-SEM/dispute-authorization question specifically, which has no structural fix available (R-X already exists as the deterministic guard on the *edit* side — Phase 4's gap is purely one of stated intent on the *authorization* side) |
| Wording drifts from the PRD's own AC-5/AC-7 language, weakening traceability | L | M | Both new prose blocks reuse the PRD's own AC-5/AC-7 phrasing ("not self-executing authorization", "never for formatting") verbatim where practical |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering
— when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with no
framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
by the Implementer — R-X is a blanket straight-fail on any test glob in
the Implementer's diff. No task above and no `## Files to Change` row
targets a test file, so this plan's `**VALIDATE**` commands exercise
the change directly rather than invoking the test framework.

**`docs/decisions.md` entry deferred to Phase 5, confirmed on read:**
as of this plan's GROUNDING pass, `docs/decisions.md` (2189 lines)
carries exactly one entry for this feature — "[2026-08-26] Test-formatting
prevention runs at the command layer, never inside `test-writer`"
(Phase 2 only, lines 2167-2176). No Phase 3 or Phase 4 entry exists
yet. This is consistent with the source PRD's own Phase 5 ("Docs +
release") owning the Decisions Log entry for the overall feature — this
plan deliberately does not add one.

**Base-commit hash for Task 3 / Level 2:** this plan uses `HEAD`
(rather than a hardcoded SHA) as the pre-phase baseline for the R-X
section comparison, matching the exact idiom Phase 3's own Level 2
check already established (`git diff --name-only HEAD -- ...`).
`code-reviewer.md` is untouched at `HEAD` (confirmed above), and Pillar
2 never commits mid-feature (`docs/decisions.md` 2026-05-18), so `HEAD`
stays a stable, valid baseline for the whole lifetime of this
attempt — it does not require pinning to the specific merge-commit SHA
supplied at dispatch time.

**AC-7 structural half already shipped:** Phase 3's plan
(`PRPs/plans/completed/test-formatting-prevention-preflight-phase-3-preflight.plan.md`,
Notes section) explicitly deferred AC-7's prose half to this phase
while shipping its structural half (the preflight itself removes the
scenario that would motivate a formatting dispute). This phase closes
that deferral; no other phase has any remaining claim on AC-7.

*Generated: 2026-08-26*
*Approved: 2026-08-26*
*Implemented: 2026-08-26*
*Status: IMPLEMENTED*
