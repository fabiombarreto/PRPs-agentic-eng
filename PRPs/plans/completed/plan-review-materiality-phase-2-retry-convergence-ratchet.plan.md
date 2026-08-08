# Feature: Retry convergence ratchet (Phase 2 of plan-review-materiality)

```
**Decision Gate**
- Active context: none
- Activated criteria: modifies a shipped reviewer agent protocol (plan-reviewer) and the orchestrator command (relay-execute); extends the cross-cutting review.jsonl verdict contract with additive optional fields; changes retry-loop convergence behavior
- Decisions found:
  - [2026-07-31] review_started_at — invoker-supplied values over tools widening; the plan hash inputs mirror this mechanism exactly (the reviewer has Read/Edit/Write only and computes nothing; the dispatching command's shell computes, the reviewer writes through verbatim and compares strings)
  - [2026-04-28] AC-10 no-short-circuit — evaluation and logging stay full on every attempt; the ratchet narrows only what may BLOCK, never what is evaluated or recorded
  - [2026-07-30] prior_feedback / Targeted revision — the writer's implicated-sections contract is the ratchet's blocking-scope anchor; reviewer-side delta review stays rejected
  - [2026-05-14] phase_type rubric differentiation — per-check conditional-branch precedent
  - Phase 1 of this feature (uncommitted, on the feature worktree) — the Materiality classes partition, class-aware gating, and jsonl class field the ratchet composes with
- Applicable anti-patterns:
  - Relying on interactive permission prompts in the autonomous loop (no interactivity added)
  - Weakening or deleting tests (the 3 byte-shape pin tests and the 2 materiality tests must stay green; any test-file work routes to the test pair)
- Applicable architectural rules:
  - review.jsonl is append-only with registered consumers; all new fields are optional and additive; absence keeps pre-ratchet semantics (fail-safe full blocking scope)
  - Interactivity boundary: plan-review stays autonomous
  - Reviewer tools: allowlist is a recorded capability contract — unchanged
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 2:
  "Retry convergence ratchet" — Goal: Retries converge — the blocking set is
  monotone non-increasing absent new writer-introduced defects in touched
  sections. — Success signal: AC-5, AC-7, AC-9 demonstrable; stuck-detection
  fixture unchanged behavior for blocking-only corpora.

## Summary

This phase makes plan-review retries converge. The plan-reviewer gains a
prior-verdict ratchet: on a re-review that follows a Targeted-revision
retry, only previously-cited blocking ids and findings anchored inside the
sections those ids implicate may still gate `CHANGES_REQUESTED`; a new
blocking-classed finding outside that scope is emitted as
`"class": "advisory"` with a ratchet annotation. The reviewer's own
`review.jsonl` is the memory (it already derives the path canonically and
can `Read` its last entry); integrity comes from invoker-supplied content
hashes — a whole-plan `plan_sha256` plus per-section `section_hashes`
computed by the dispatching command's shell and written through verbatim,
mirroring the `review_started_at` invoker-supplied precedent — so an
out-of-contract edit (a changed section outside the implicated set) voids
the ratchet fail-safe back to full blocking scope, with the void reason
recorded on the verdict line. `relay-execute.md`'s stuck-detection is
composed over blocking-classed failing-id sets only, and its stale
bullet-list format pointer is repaired in passing. All evaluation and
logging stay full — the ratchet narrows gating, never coverage. Phase-1
state note: the current `plan-reviewer.md` (with `## Materiality classes`)
lives on the feature worktree at
`.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md`
(uncommitted); all cited plan-reviewer line numbers reference that file
state, and the Implementer edits that same worktree copy.

## User Story

As a relay operator running `/relay-execute`
I want a plan-review retry to be judged only on what was cited before and
on what the writer was allowed to touch
So that the reviewer stops surfacing brand-new failures on unchanged text
each round and the loop converges in at most two review rounds.

## Problem Statement

Measured across 353 verdicts, retries fail on NEWLY discovered rubric items
(33) slightly more often than on repeated ones (31) — the reviewer is
memoryless, re-judges everything from scratch each round, and each pass of
the nondeterministic K=5 layer can surface different findings on unchanged
text. There is no fixed point: the writer fixes what was cited and the
reviewer finds something else. Stuck-detection compounds this by comparing
the FULL failing-id set, so rotating ids read as progress.

## Solution Statement

Give the reviewer bounded memory (its own jsonl last entry), a scope rule
tied to the Targeted-revision contract (previously-cited blocking ids +
their implicated sections may block; everything else logs advisory with a
ratchet annotation), and an integrity guard (invoker-computed section
hashes; mismatch outside the implicated set → ratchet void, full blocking
scope, reason recorded). Compose `relay-execute` stuck-detection over
blocking-classed ids only. Advisory-only outcomes already approve
(Phase 1), so they structurally never enter the retry loop.

## Metadata

| Field | Value |
|---|---|
| Type | Feature |
| Complexity | Medium-High |
| Systems Affected | plan-reviewer agent protocol; relay-execute orchestrator command; review.jsonl verdict contract (additive optional fields) |
| Dependencies | Implementation Phases row 1 (complete — Materiality classes shipped on the feature worktree) |
| Estimated Tasks | 5 |
| Source PRD | `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 2 |
| phase_type | feature |

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md` | 1286-1343 | Step 1 (load/parse — where the new Step 1.5 ratchet-context hook inserts), Step 2's class-aware closing sentence and Step 3 branch headers the ratchet rule extends |
| P0 | `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md` | 1489-1537 | The canonical `<basename>` jsonl-path derivation (the ratchet's memory-read reuses it verbatim) and the Timestamp discipline block — the exact invoker-supplied write-through idiom the hash inputs mirror |
| P0 | `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md` | 1381-1417 | Step 4's re-validation + APPROVED-entry rules that must stay ratchet-consistent (re-validation uses the same ratchet context as Step 2) |
| P1 | `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md` | 104-186 | The Materiality classes section (partition table + escalation valve) the ratchet composes with — the valve stays available on retries; the ratchet never disables it |
| P1 | `plugins/relay/agents/plan-writer.md` | 71-111 | Targeted revision mode — the cited-id→implicated-sections mapping contract and byte-preservation rule the ratchet's blocking scope and void semantics lean on |
| P1 | `plugins/relay/commands/relay-execute.md` | 336-432 | Step A.3.2: the defect-list capture (incl. the stale `:459-483` format pointer to repair), stuck-detection extraction + equality test, FAILED_PLAN_REVIEW_STUCK halt shape, and the retry re-dispatch — the sites Task 5 edits |
| P1 | `PRPs/prds/plan-review-materiality.prd.md` | 152-201 | PRD AC-5, AC-7, AC-9 — the three acceptance criteria this phase delivers |
| P2 | `plugins/relay/agents/plan-writer.md` | 421-445 | The grounding-dependent carve-out — the existing "which cited ids get special retry handling" sibling mechanism, and the id set whose re-grounding interacts with implicated-section scoping |

## Patterns to Mirror

# SOURCE: .worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1286-1288
```
### Step 1 — Load and parse

- `Read` the full DRAFT plan at `draft_path`.
```
Task 1 inserts the new `### Step 1.5 — Prior-verdict ratchet context`
immediately after Step 1's closing line ("Hold the plan content in memory
for rubric evaluation.", worktree line 1295), reusing its load-then-hold
shape.

# SOURCE: .worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1324-1330
```
After R1–R8 record their outcomes, walk the R-COH-* coherence layer
(see "## The R-COH-* coherence layer" section above): deterministic
checks first, then the bounded K=5 LLM pass. Append one row per check
and one row per K=5 finding to the same outcome array. The combined
array (R1–R8 + R-COH-*) is what Step 3's branch logic evaluates:
any blocking-classed `passed: false` row triggers the CHANGES_REQUESTED branch; a run whose only failing rows are advisory-classed proceeds
to Step 4 as an advisory-carrying APPROVED.
```
Task 2 extends this closing sentence with the ratchet qualifier
(blocking-EFFECTIVE under an active ratchet).

# SOURCE: .worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1523-1537
```
### Timestamp discipline (mandatory)

The `timestamp` field in the jsonl verdict below MUST be
`review_started_at` written through verbatim, in the exact format
`YYYY-MM-DDTHH:MM:SSZ` — a full UTC instant, never a date-only value
and never midnight.
```
Task 3 adds the sibling `### Hash discipline` block: `plan_sha256` and
`section_hashes` are invoker-supplied, written through verbatim, never
computed by this agent (whose `tools:` carry no shell); absence is
recorded, never fabricated.

# SOURCE: .worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1397-1404
```
1. **Re-run R1 through R8** one more time by `Read`-ing the plan
   again from disk and evaluating fresh. If anything changed since
   Step 2 and a blocking-classed item now fails, return
   CHANGES_REQUESTED with the new defect list — do NOT flip. Append
   a CHANGES_REQUESTED jsonl entry with
   `action: "revalidation_fail"` (Step 4a below) and exit. A
   newly-failing advisory-classed item is recorded on the entry
   that eventually flips but does not itself block the flip.
```
Task 4 makes this re-validation apply the SAME ratchet context computed
in Step 1.5 (a re-validation finding outside ratchet scope downgrades
exactly as in Step 2).

# SOURCE: plugins/relay/agents/plan-writer.md:91-99
```
2. **Map each cited `rubric_id` to the sections it implicates.** Correct
   only those sections. A `rubric_id` you do not recognize is still
   addressed: read its `reason` and fix what the reason describes.
3. **Preserve everything else byte-for-byte.** Do not regenerate the
   Decision Gate block, `## Source`, or any section no cited item
   touches. Prefer narrow `Edit` calls over a whole-file `Write`. The
   reviewer re-runs its FULL rubric on every attempt, so anything you
   silently rewrite is re-judged from scratch — a needless risk when
   the reviewer already passed it.
```
Task 1's implicated-sections derivation mirrors this exact mapping
contract from the writer's side; Task 1's void rule enforces item 3's
byte-preservation promise via the invoker-supplied section hashes.

# SOURCE: plugins/relay/commands/relay-execute.md:355-364
```
**Stuck-loop detection (before budget check):**

Extract the set of failing rubric item IDs from the current verdict
(the `id` values of all `passed: false` rows in the JSONL entry just
appended). Call this `current_failing_ids`.

If `last_plan_review_failing_ids` is **not null** AND
`current_failing_ids` is identical to `last_plan_review_failing_ids`
(same set of IDs regardless of order), the plan-writer made zero
progress on the failing items — the loop is stuck.
```
Task 5 rewrites the extraction sentence to filter blocking-classed rows
(absent `class` reads as blocking) while keeping the equality mechanism
byte-identical.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Step 1.5 ratchet context, ratchet gating rule in Steps 2/3, Hash discipline + jsonl optional fields, Step 4/4a ratchet consistency (edited on the feature worktree, which carries the Phase-1 state) |
| `plugins/relay/commands/relay-execute.md` | UPDATE | Hash capture before each reviewer adoption, blocking-only stuck-detection, blocking-only prior_feedback capture, stale format-pointer repair (edited on the feature worktree) |

## NOT Building (Scope Limits)

- **Advisory pass-through to the implementer and `/relay-plan-review`
  output surfacing** — Phase 3 of the source PRD. Standalone
  `/relay-plan-review` is untouched this phase: invoked without hash
  inputs, the ratchet stays inactive (fail-safe full blocking scope —
  today's behavior, documented).
- **Class-aware `efficiency.mjs` / reports / docs surfaces** — Phase 4.
- **Any reviewer `tools:` widening** — the hash inputs exist precisely to
  avoid it (2026-07-31 precedent).
- **Reviewer-side delta review** — evaluation and logging stay full on
  every attempt; only gating narrows.
- **Test-file edits** — the corpus additions for AC-5/AC-7/AC-9 coverage
  and any pin adjustments are the test pair's (R-X strict; test-after).
- **Cross-session ratchet policy changes** — the ratchet reads whatever
  the jsonl holds; no session bookkeeping is added.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/plan-reviewer.md — Step 1.5 prior-verdict ratchet context + optional hash inputs

**ACTION**: Two edits, delivering AC-A1 (PRD AC-5) and AC-A3 (PRD AC-9)
groundwork. (a) In the `## Inputs (from the calling command)` section, add
two optional inputs with these exact names: `plan_sha256` (whole-plan
content hash of `draft_path` at dispatch time) and `section_hashes` (map
of every `## `-heading section of the plan to its content hash), both
"invoker-supplied — computed by the dispatching command's shell and
written through verbatim; this agent never computes a hash (its `tools:`
carry no shell) and never fabricates one when absent". (b) Insert a new
subsection with the exact heading `### Step 1.5 — Prior-verdict ratchet
context` immediately after Step 1 (before Step 2), specifying: derive the
jsonl path via the canonical `<basename>` derivation (the `## review.jsonl
format` section); `Read` the file; when it exists and its LAST entry is a
`CHANGES_REQUESTED` verdict for this plan, set `previously_cited_ids` =
that entry's blocking-classed `passed: false` ids, and derive
`implicated_sections` by mapping each cited id to the plan sections it
implicates (the same cited-id→sections mapping `plan-writer.md`'s
`## Targeted revision mode` item 2 applies from the writer's side); the
ratchet is ACTIVE only when ALL of: the prior entry carries
`section_hashes`, this invocation received `section_hashes`, and every
section OUTSIDE `implicated_sections` has an unchanged hash
(string-equality between the two maps — no computation). Any other state —
no prior entry, prior entry APPROVED, either hash map absent, or a
non-implicated section's hash differing — sets the ratchet INACTIVE, and
when the cause is a hash mismatch outside the implicated set, records the
exact string `ratchet_void_reason` with a one-sentence explanation
(out-of-contract edit detected → full blocking scope, fail-safe). State
explicitly: an inactive ratchet means Step 2/3 gate exactly as Phase 1
shipped (full blocking scope); the ratchet can only narrow gating, never
widen it, and never affects WHAT is evaluated or logged.
**MIRROR**: `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1286-1288`
(insertion point + load-then-hold shape),
`plugins/relay/agents/plan-writer.md:91-99` (the implicated-sections
mapping + byte-preservation contract the void rule enforces).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q '^### Step 1.5 — Prior-verdict ratchet context$' plugins/relay/agents/plan-reviewer.md
grep -q 'ratchet_void_reason' plugins/relay/agents/plan-reviewer.md
grep -q 'section_hashes' plugins/relay/agents/plan-reviewer.md
```

### Task 2: UPDATE plugins/relay/agents/plan-reviewer.md — ratchet gating rule in Steps 2/3

**ACTION**: Delivers AC-A1 (PRD AC-5). Extend Step 2's closing sentence
(the class-aware gating sentence at worktree lines 1324-1330) and Step 3's
branch logic with the ratchet qualifier, introducing the term
"blocking-effective" with this exact definition sentence: `Under an ACTIVE
ratchet (Step 1.5), a blocking-classed failing row is blocking-effective
only when its id is in previously_cited_ids OR its finding is anchored
inside an implicated section; every other blocking-classed failing row is
emitted with "class": "advisory" plus "ratchet": "out-of-scope-new-finding"
and does not gate.` Step 3's branch headers key on blocking-EFFECTIVE
failures when the ratchet is active (inactive ratchet ≡ every
blocking-classed failure is blocking-effective — Phase 1 semantics
verbatim). The escalation valve remains available on retries — an
escalated row (with its mandatory Implementer-impact justification) is
always blocking-effective; state this explicitly so the ratchet is never
read as disabling the valve. The CHANGES_REQUESTED bullet list keeps
blocking-effective items as mandatory fixes; ratchet-downgraded findings
appear under the existing "Non-blocking advisories" sub-list with their
ratchet annotation.
**MIRROR**: `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1324-1330`
(the sentence being extended).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'blocking-effective' plugins/relay/agents/plan-reviewer.md
grep -q '"ratchet": "out-of-scope-new-finding"' plugins/relay/agents/plan-reviewer.md
```

### Task 3: UPDATE plugins/relay/agents/plan-reviewer.md — Hash discipline + jsonl optional fields

**ACTION**: Delivers AC-A3 (PRD AC-9). In the `## review.jsonl format`
section: (a) add a `### Hash discipline` subsection immediately after
`### Timestamp discipline`, mirroring its shape: `plan_sha256` and
`section_hashes` are written through verbatim onto every verdict entry
WHEN supplied by the invoker; when absent, the entry is appended anyway
(never drop an audit line) WITHOUT hash fields — absence keeps the next
re-review's ratchet inactive (fail-safe), never fabricated; (b) document
the three new OPTIONAL top-level entry fields — `plan_sha256` (string),
`section_hashes` (object: section heading → hash), `ratchet_void_reason`
(string, present only when Step 1.5 voided an otherwise-eligible ratchet)
— and the per-row annotation `"ratchet": "out-of-scope-new-finding"`
(present only on ratchet-downgraded rows); (c) add ONE new standalone
example line showing a ratchet-downgraded row, placed OUTSIDE the existing
worked example's fenced block — the existing example rows are byte-pinned
by three corpus tests
(`plan-reviewer-action-validate-contradiction-check.test.mjs`,
`plan-reviewer-validate-pattern-ungrounded-check.test.mjs`,
`plan-reviewer-validate-search-ambiguous-check.test.mjs`) and MUST NOT be
modified; (d) extend the invariant paragraph with one sentence: hash
fields and ratchet annotations are additive and optional; consumers
reading entries without them apply pre-ratchet semantics.
**MIRROR**: `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1523-1537`
(the Timestamp discipline block whose shape Hash discipline mirrors).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q '^### Hash discipline' plugins/relay/agents/plan-reviewer.md
grep -q 'plan_sha256' plugins/relay/agents/plan-reviewer.md
node --test scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs scripts/validate/checks/plan-reviewer-validate-pattern-ungrounded-check.test.mjs scripts/validate/checks/plan-reviewer-validate-search-ambiguous-check.test.mjs
```

### Task 4: UPDATE plugins/relay/agents/plan-reviewer.md — Step 4/4a ratchet consistency

**ACTION**: Delivers AC-A1 (PRD AC-5) closure. Amend Step 4 item 1 (the
re-validation) and Step 4a so both apply the SAME ratchet context computed
in Step 1.5: a re-validation finding that would be ratchet-downgraded in
Step 2 is equally downgraded here (recorded on the flipping entry with its
ratchet annotation, not blocking the flip); only a blocking-EFFECTIVE
newly-failing item aborts the flip. Amend Step 4 item 2's APPROVED-entry
bullet to state that the entry carries the write-through hash fields per
`### Hash discipline` when supplied. Do not alter the operation order
(jsonl before Edit) or any other Step 4 mechanics.
**MIRROR**: `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1397-1404`
(the re-validation bullet being amended).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
n=$(grep -c 'blocking-effective' plugins/relay/agents/plan-reviewer.md)
[ "$n" -ge 3 ]
```

### Task 5: UPDATE plugins/relay/commands/relay-execute.md — hash capture, blocking-only stuck-detection, pointer repair

**ACTION**: Delivers AC-A2 (PRD AC-7) and the invoker half of AC-A3 (PRD
AC-9). All edits inside Step A.3.2 (lines 336-432) and its immediate
dispatch context: (a) immediately before each `/relay-plan-review`
adoption, add a hash-capture step: compute `plan_sha256` and per-section
`section_hashes` of `current_plan_path` via a deterministic dependency-free
node one-liner (this exact command, quoted in the command file):
`node -e "const fs=require('fs'),c=require('crypto');const t=fs.readFileSync(process.argv[1],'utf8');const h=s=>c.createHash('sha256').update(s).digest('hex');const out={plan_sha256:h(t),section_hashes:{}};for(const m of t.split(/^(?=## )/m))if(m.startsWith('## '))out.section_hashes[m.split('\n')[0]]=h(m);console.log(JSON.stringify(out))" <current_plan_path>`
and pass both values into the reviewer adoption's execution context
alongside `review_started_at`; (b) rewrite the stuck-detection extraction
sentence to read: `Extract the set of blocking-effective failing rubric
item IDs from the current verdict (the id values of all passed: false rows
whose class is blocking — a row without a class field reads as blocking).
Call this current_failing_ids.` — the equality test, halt shape, and
FAILED_PLAN_REVIEW_STUCK message stay byte-identical; (c) amend the
CHANGES_REQUESTED capture so `prior_feedback` carries only
blocking-effective rows' `{rubric_id, reason}` (advisory rows never gate a
retry — an advisory-only verdict is APPROVED and never reaches this
branch; state this in one sentence); (d) repair the stale format pointer
at line 351: replace the citation
`plugins/relay/agents/plan-reviewer.md:459-483` with a line-number-free
reference to the reviewer's Step 3 CHANGES_REQUESTED bullet-list contract
(`plugins/relay/agents/plan-reviewer.md, Step 3 "One or more
blocking-classed failures" branch`), removing the brittle range.
**MIRROR**: `plugins/relay/commands/relay-execute.md:355-364` (the
extraction sentence being rewritten).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'whose class is blocking' plugins/relay/commands/relay-execute.md
grep -q 'plan_sha256' plugins/relay/commands/relay-execute.md
if grep -q 'plan-reviewer.md:459-483' plugins/relay/commands/relay-execute.md; then
  echo "FAIL: stale format pointer remains"; exit 1
else
  echo "PASS: stale pointer repaired"
fi
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS (file structure intact)

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
test "$(head -20 plugins/relay/agents/plan-reviewer.md | grep -cx -- '---')" -ge 2
test "$(head -20 plugins/relay/commands/relay-execute.md | grep -cx -- '---')" -ge 2
grep -q '^### Step 1.5 — Prior-verdict ratchet context$' plugins/relay/agents/plan-reviewer.md
```

### Level 2 — CONTENT_INVARIANTS

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'blocking-effective' plugins/relay/agents/plan-reviewer.md
grep -q '^### Hash discipline' plugins/relay/agents/plan-reviewer.md
grep -q 'ratchet_void_reason' plugins/relay/agents/plan-reviewer.md
grep -q 'whose class is blocking' plugins/relay/commands/relay-execute.md
node --test scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs scripts/validate/checks/plan-reviewer-materiality-class-derived.test.mjs scripts/validate/checks/plan-reviewer-materiality-gating.test.mjs
```

### Level 3 — INTEGRATION (full validation suite + corpus)

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-5):** Given a re-review at attempt N≥2 following a
  Targeted-revision retry with an active ratchet, when the reviewer finds
  a new defect in a section NOT implicated by the previous verdict's cited
  ids, then the finding is logged with `"class": "advisory"` plus the
  `"ratchet": "out-of-scope-new-finding"` annotation and does not produce
  `CHANGES_REQUESTED`; findings on previously-cited ids or inside
  implicated sections retain their declared class and may gate.
- **AC-A2 (PRD AC-7):** Given `/relay-execute`'s plan-review retry loop,
  when consecutive `CHANGES_REQUESTED` verdicts are compared for
  `FAILED_PLAN_REVIEW_STUCK`, then the equality test runs over
  blocking-classed failing-id sets only (absent `class` reads as
  blocking), and an advisory-only outcome never enters the retry loop —
  it is `APPROVED` and takes the APPROVED branch.
- **AC-A3 (PRD AC-9):** Given each verdict line records the
  invoker-supplied `plan_sha256` and `section_hashes`, when a retry's plan
  content diverges from the Targeted-revision contract (a section outside
  the implicated set changed, detected by hash string-inequality), then
  the ratchet is voided for that attempt — full blocking scope applies —
  and `ratchet_void_reason` is recorded on the verdict line; when hash
  inputs are absent (e.g. standalone `/relay-plan-review`), the ratchet
  stays inactive fail-safe with Phase-1 gating semantics.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The id→implicated-sections mapping diverges between plan-writer's Targeted revision and the reviewer's ratchet, downgrading a finding the writer legitimately introduced in a touched section | Medium | A real defect in an edited section slips to advisory | The mapping rule is stated once and cross-referenced in both files; findings INSIDE implicated sections always retain their declared class (the ratchet only downgrades outside them); the escalation valve remains available and always blocking-effective |
| The node hash one-liner behaves differently across shells/OS (quoting, CRLF) | Medium | Void false-positives (ratchet silently inactive) | The one-liner is dependency-free node (guaranteed by the validation suite), quoted verbatim in the command file; hashing raw file bytes as read keeps CRLF stable within a checkout; a false void only widens gating (fail-safe direction, never unsafe) |
| Editing near the pinned worked-example rows re-breaks the 3 byte-shape pin tests | Low | Corpus red; test-pair round-trip | Task 3 places all new example material OUTSIDE the pinned fenced block and its VALIDATE runs the 3 pin tests directly; Level 3 runs the full corpus |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of
  `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
  when a test framework is declared, the test pair
  (test-writer/test-reviewer) authors and maintains the suite from the
  Acceptance Criteria above, after the Implementer + Code Review; with no
  framework declared, no tests are authored.
- **Test-pair deferral (R-X strict).** Corpus coverage for the ratchet
  (Step 1.5 presence, hash-discipline invariants, blocking-only
  stuck-detection sentence) and any pin adjustment are routed through the
  `test-writer`/`test-reviewer` pair's lifecycle ledger, never authored by
  the Implementer. No task in this plan touches a test file; the plan's
  gates run existing tests only (running ≠ editing). (Both conditions of
  the reviewer's test-pair-deferral exemption hold: documented here, and
  no `## Files to Change` row or task ACTION targets a test glob.)
- **Worktree state note.** This phase builds on Phase 1's uncommitted
  output: the authoritative `plan-reviewer.md` lives on the feature
  worktree (`.worktrees/plan-review-materiality/`), where the Implementer
  makes all edits; `relay-execute.md` is identical in both trees and is
  likewise edited in the worktree. Cited line numbers for
  `plan-reviewer.md` reference the worktree file state.
- The invoker-supplied hash mechanism deliberately mirrors the
  [2026-07-31] `review_started_at` decision: the reviewer's `tools:`
  allowlist is a recorded capability contract; the dispatching command's
  shell computes, the reviewer write-throughs and string-compares.
- Standalone `/relay-plan-review` passes no hash inputs this phase, so
  hand-invoked re-reviews keep full blocking scope (fail-safe); PRD OQ-3's
  standalone surfacing question stays open for Phase 3.

*Generated: 2026-08-07*
*Approved: 2026-08-07*
*Implemented: 2026-08-07*
*Status: IMPLEMENTED*
