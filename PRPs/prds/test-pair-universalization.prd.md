# Test-Pair Universalization (test-writer / test-reviewer across both modes, full lifecycle)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions; cross-cutting patterns; reuse/creation of components; impact on reusable services (the test writer/reviewer pair, the post-green reviewer, the /relay-execute orchestrator, the R-X test-authoring contract)
- Decisions found:
  - 2026-05-06 "TDD pair is the only authorized mechanism for creating test files; tdd:false → A.3.5 self-skips" — PARTIALLY SUPERSEDED (the tdd:false self-skip half only; the sole-author invariant is preserved and EXTENDED to a full create/update/delete lifecycle)
  - 2026-05-12 "test-framework absence is a silent self-skip in /relay-test (symmetric with /relay-tdd self-skip on tdd:false)" — PRESERVED and PROMOTED to the single activation gate (empty test_frameworks → skip)
  - 2026-04-19 "writer/reviewer command-surface split" — PRESERVED (the pair stays split into two commands)
  - Opt-in activation (only tdd:true activates B7/B8) — EVOLVED: activation now keyed on non-empty test_frameworks; `tdd:` selects ordering (test-first vs test-after), not existence
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the auto-correction loop turn green" — consciously NARROWED here: obsolete/redundant removals performed by the approved test pair (justified in the manifest + reviewer-validated + B5 ledger-gated) are carved out as legitimate; weakening of a test that still encodes a live requirement stays forbidden, and the Implementer + auto-correction loop still may not touch tests at all
  - "Writing TDD tests that mirror the imagined implementation" — in test-after the failure mode shifts to mirroring the ACTUAL implementation; test-reviewer R-IMPL-LEAK must still reject implementation-coupled tests
  - "Activating the TDD track by heuristic" — still holds (only methodology.md routes); the "tdd:false → skip B7/B8 silently" clause is consciously narrowed to "empty test_frameworks → skip"
  - "Writing pipeline artifacts under .claude/" — preserved; renamed artifacts stay under PRPs/
- Applicable architectural rules:
  - Interactivity boundary (autonomous after PRD approval) — the test-after stage runs autonomously; docs/context/architecture.md §Interactivity boundary to be updated to include the tdd:false test-after path
  - PRP artifact paths — renamed artifacts (test-suite.diff, <basename>.test-write-review.jsonl, test-write-reviews.md) stay under PRPs/
  - Command surface = 14 commands — a rename keeps the count (no command added or removed)
- Result: PROCEED (conscious supersede of the 2026-05-06 self-skip half + anti-pattern narrowing, recorded in the Decisions Log below and codified in docs/decisions.md during the documentation phase)
```

## Problem Statement

In a `tdd: false` target project, relay's pipeline has **no agent that can author, update, or delete the tests a PRD requires**. The TDD pair (`tdd-writer` / `tdd-reviewer`) silently self-skips when `tdd: false` and is create-only even when active; the universal R-X guard forbids the Implementer from touching any test file; and the post-green reviewer (B5) treats **every** removed test as weakening. So a PRD with test-authoring Acceptance Criteria produces a plan the Plan Reviewer *approves* but the Implementer *must reject*, and even where tests can be created there is no legitimate path to **modify** a test whose contract changed or **retire** a test that is obsolete or redundant. The cost: `tdd: false` projects cannot get maintained tests from relay, and the full test lifecycle (create → update → retire) has no authorized owner.

## Evidence

- `tdd-writer` command `/relay-tdd` P4.a self-skips on `tdd: false` (`plugins/relay/commands/relay-tdd.md:116-124`), and `docs/decisions.md:425` codifies the TDD pair as the **only** authorized test-file author. Together: no authorized test author exists when `tdd: false`.
- The Implementer's universal R-X guard rejects any test-glob `**ACTION**:` — CREATE, UPDATE, or DELETE — "regardless of `tdd:` value" (`plugins/relay/agents/implementer.md:314-352`), and the Code Reviewer straight-fails any test-glob file in the diff (`plugins/relay/agents/code-reviewer.md:370-401`).
- `tdd-writer` is **create-only**: modifying an existing test is a hard `AMBIGUOUS` abort (`plugins/relay/agents/tdd-writer.md:53-58`, `254-268`, `390-391`). No agent can update or delete an existing test.
- The post-green reviewer (B5) counts every net-removed test function across the branch diff and flags it as `test_removed` → `CHANGES_REQUESTED` (`plugins/relay/agents/post-green-reviewer.md:82-107`, `183-186`), with no concept of an *authorized* removal — a legitimately retired obsolete test is blocked identically to a cheat. It also does not detect whole-file test deletions at all (`post-green-reviewer.md:252-255`).
- The Plan Reviewer's R5 *mandates* a `tdd: false` routing note asserting "tests written alongside implementation. Acceptance Criteria seed those tests." (`plugins/relay/agents/plan-reviewer.md:187-188`) — a behavior no agent implements, since R-X forbids the Implementer from writing tests. `prd-template.md:29-31,158-159` carries the same phantom framing.
- Real trigger: the `printed-exams-single-record` PRD in a `tdd: false` project with declared frameworks demands test authoring **and** must update/retire several existing tests across its phases; every path through the current pipeline dead-ends at an R-X halt or a B5 weakening rejection.

## Proposed Solution

Universalize the test writer/reviewer pair so it owns the **full test lifecycle** (create / update / delete) in **both** methodology modes, and rename it to reflect that it is no longer TDD-exclusive:

- **Rename** agent `tdd-writer` → `test-writer`, agent `tdd-reviewer` → `test-reviewer`; commands `/relay-tdd` → `/relay-write-test`, `/relay-tdd-review` → `/relay-test-write-review`; artifacts `tdd-initial-suite.diff` → `test-suite.diff`, `<basename>.tdd-review.jsonl` → `<basename>.test-write-review.jsonl`, `tdd-reviews.md` → `test-write-reviews.md`.
- **Reframe `tdd:`** from "do tests exist" to "**test-first vs test-after ordering**." Activation is keyed on `test_frameworks` being non-empty; the `tdd:` value only selects *when* the pair runs (`true` = before the Implementer, RED-legitimate; `false` = after the Implementer + Code Review, GREEN-legitimate). `test_frameworks: []` or missing methodology → skip.
- **Give the pair full lifecycle authority with a justification ledger.** `test-writer` may CREATE, UPDATE, and DELETE test files. Every non-create operation is recorded in the suite manifest's **lifecycle ledger** with a classification and justification (`EXISTING_TEST_UPDATED`, `OBSOLETE_TEST_REMOVED` = behavior gone from the in-scope ACs, `REDUNDANT_TEST_REMOVED` = proven duplicate naming the survivor). `test-reviewer` validates each with `R-LIFECYCLE-LEGITIMATE` — a removal/update that still maps to a live in-scope AC is weakening → `CHANGES_REQUESTED`.
- **Make the post-green reviewer (B5) ledger-aware.** B5 consults the feature's APPROVED suite manifest: a removed/skipped test that matches an approved ledger entry is downgraded from a blocking concern to an accepted note; any removal/skip **not** in the ledger (or when no manifest exists) still blocks exactly as today. B5 detection is extended to whole-file test deletions, gated on the same ledger.

This preserves R-X strict verbatim: the Implementer and the auto-correction loop still perform **zero** test-file changes. The pair remains the sole test author, now across the whole lifecycle. In test-after the pair's diff is separate from the Implementer's diff and is reviewed by `test-reviewer`, never by the Code Reviewer — so R-X never sees it.

## Key Hypothesis

We believe making the test pair the **universal, ordering-agnostic, full-lifecycle** sole test author will let `tdd: false` projects deliver and maintain test-backed features through relay.
We'll know we're right when a `tdd: false` project with declared frameworks (e.g. `printed-exams-single-record`) completes `/relay-execute` with an authored/updated suite, at least one obsolete test legitimately retired, a green test-run, and post-green APPROVED — with **zero** R-X halts and **zero** false weakening rejections.

## What We're NOT Building

- **Any change to R-X strict on the Implementer** — the Implementer authors, updates, and deletes zero test files in either mode; R-X is preserved verbatim. Only the *pair* touches tests.
- **Test deletion by the auto-correction loop** — a removal is legitimate only when performed by the pair, justified in the manifest, and reviewer-approved; the loop's Implementer re-invocations still cannot remove tests, and B5 still blocks any removal absent from the approved ledger.
- **Merging the pair with the Test Runner or the post-green reviewer** — the authoring pair (`/relay-write-test` + `/relay-test-write-review`), `/relay-test` (runs the suite), and `/relay-test-review` (post-green weakening check) stay three distinct command families.
- **A net-new command** — this is a rename; the command count stays 14.
- **Any change to test-first (`tdd: true`) ordering behavior** beyond the rename and the lifecycle ledger — the test-first path is otherwise byte-identical modulo renamed identifiers.
- **Heuristic flipping of `tdd:` / `test_frameworks`** — still human-only via methodology.md; no inference from test folders.
- **Multi-framework selection beyond today's first-framework heuristic** — deferred.
- **Retrofitting historical PRPs/ artifacts** (completed plans, `.jsonl` audit logs, prior PRDs) with the new names — immutable history.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| tdd:false feature reaches green tests via relay with no R-X halt | 1 end-to-end (`printed-exams-single-record`) | `/relay-execute` run log shows write-test → test-write-review APPROVED → test-run GREEN; zero `TEST_FILE_EDIT_REJECTED` |
| Obsolete tests legitimately retired without a B5 false-positive | ≥1 in the dogfood | Suite manifest lifecycle ledger records the removal; post-green review returns APPROVED with the removal as an accepted note, not a concern |
| Unauthorized removal still blocked | 100% | A removal injected outside the ledger yields a B5 `test_removed` concern → CHANGES_REQUESTED |
| Old identifiers remaining in the active plugin surface | 0 | `grep -R 'tdd-writer\|tdd-reviewer\|/relay-tdd\b\|tdd-initial-suite\|tdd-review.jsonl' plugins/relay/` returns 0 |
| Docs surfaces asserting the stale "self-skips when tdd:false" | 0 | `grep` across docs/ and documentation/ finds only the frameworks-empty-qualified statement |

## Acceptance Criteria (test scenarios)

- **AC-1 rename-complete:** Given the plugin after the rename phase, when grepping `plugins/relay/` for `tdd-writer`, `tdd-reviewer`, `/relay-tdd`, `tdd-initial-suite.diff`, or `tdd-review.jsonl`, then zero matches remain and the corresponding `test-writer` / `test-reviewer` / `/relay-write-test` / `/relay-test-write-review` / `test-suite.diff` / `test-write-review.jsonl` identifiers are present instead.
- **AC-2 test-first unchanged:** Given `tdd: true` and non-empty `test_frameworks`, when `/relay-execute` runs a non-foundation feature phase, then the test pair runs **before** the Implementer and `test-reviewer` applies the RED-legitimate check (a suite green pre-implementation → CHANGES_REQUESTED), identical to pre-change behavior modulo names.
- **AC-3 test-after activation:** Given `tdd: false` and non-empty `test_frameworks`, when `/relay-execute` runs a non-foundation feature phase, then the test pair runs **after** the Implementer + Code Review, authors/updates tests, and does **not** self-skip.
- **AC-4 green-legitimate in test-after:** Given test-after mode with the Implementer's code already in the tree, when `test-reviewer` evaluates the suite, then it returns APPROVED when the suite is green against the implemented code and CHANGES_REQUESTED when the suite is red (surfacing "implementation bug or bad test") — i.e. the RED-legitimate check is inverted to a GREEN-legitimate check for this mode.
- **AC-5 writer updates existing tests:** Given an in-scope AC requires modifying an existing test, when `test-writer` runs, then it UPDATES the existing test file and records an `EXISTING_TEST_UPDATED` entry (file:function + which AC drove the change) in the suite manifest's lifecycle ledger — instead of aborting `AMBIGUOUS`.
- **AC-6 writer retires an obsolete test:** Given an in-scope behavior removed from the contract and an existing test that only covers it, when `test-writer` runs, then it DELETES that test and records an `OBSOLETE_TEST_REMOVED` ledger entry (file:function + the behavior/AC that was removed), without aborting.
- **AC-7 writer removes a redundant test:** Given two tests covering the same observable with no discriminative difference, when `test-writer` runs, then it removes one and records a `REDUNDANT_TEST_REMOVED` ledger entry naming the surviving test.
- **AC-8 reviewer blocks illegitimate removal/update:** Given a ledger removal or update whose test still maps to a live in-scope AC, when `test-reviewer` runs `R-LIFECYCLE-LEGITIMATE`, then it returns CHANGES_REQUESTED (weakening) and the operation is not approved.
- **AC-9 lifecycle ledger completeness:** Given a session that updated or deleted any test, when the suite manifest is written, then every update/delete appears in the lifecycle ledger with a classification and justification; a manifest whose diff removes/updates a test with no matching ledger entry fails `test-reviewer`.
- **AC-10 B5 accepts an authorized removal:** Given the branch diff shows a removed test function (or a deleted test file) AND that removal appears in the APPROVED suite-manifest lifecycle ledger, when post-green review runs, then it does **not** emit a blocking `test_removed` concern (records an accepted note instead) and can return APPROVED.
- **AC-11 B5 still blocks an unauthorized removal:** Given a removed/skipped test (or deleted test file) NOT present in the approved ledger — or when no suite manifest exists — when post-green review runs, then it emits the blocking `test_removed` / `test_skipped` concern exactly as today.
- **AC-12 R-X strict preserved:** Given either mode, when the Implementer produces its diff, then that diff contains no test-glob file (create, update, or delete) and the Code Reviewer's R-X passes; every test-file change in the run originates from the test pair.
- **AC-13 frameworks-empty still skips:** Given `test_frameworks: []` or a missing `methodology.md`, when the pipeline runs, then the test pair self-skips regardless of the `tdd:` value, preserving the 2026-05-12 empty-frameworks skip as the single activation gate.
- **AC-14 no code-reviewer R-X on the test diff:** Given test-after mode, when the pair writes/updates/deletes test files after the Implementer, then those changes are validated by `test-reviewer` (not the Code Reviewer) and never trigger a Code Reviewer R-X failure.
- **AC-15 plan routing note truthful:** Given a `tdd: false` plan, when the Plan Reviewer runs R5, then the required routing note describes **test-after authoring by the test pair** (not "tests written alongside implementation"), and a plan carrying the old phantom note fails R5.
- **AC-16 governance recorded:** Given the release, when inspecting `plugins/relay/.claude-plugin/plugin.json`, then version is `0.19.0`; `docs/decisions.md` carries a superseding entry for the 2026-05-06 tdd:false self-skip and a new entry for the lifecycle-ledger authority; `docs/anti-patterns.md` "Weakening or deleting tests" is narrowed to carve out ledger-approved obsolete/redundant removals.
- **AC-17 docs-site consistency:** Given the docs site after the change, when searching the renamed identifiers, then `documentation/reference/agents.html`, `documentation/reference/commands.html`, `documentation/concepts/tdd-track.html`, the NAV (`assets/js/app.js`), and the search index (`assets/data/search-index.json`) reflect the new names, the test-after behavior, and the lifecycle ledger, and `documentation/changelog.html` carries a v0.19.0 entry.

## Open Questions

- [x] Command names: DECIDED (2026-07-09) — writer `/relay-write-test`, reviewer `/relay-test-write-review`. Note the deliberate word-order asymmetry (write-test vs test-write); the symmetric alternative `/relay-write-test-review` remains available if preferred.
- [ ] Artifact names: `test-suite.diff` vs keeping a `test-initial-suite.diff` (the "initial" reads oddly in test-after); `<basename>.test-write-review.jsonl` (aligned to `/relay-test-write-review`) chosen to avoid confusion with post-green's `test-review.json`.
- [ ] Ledger matching key for B5: match a removed test by `file + test-function-name`; is that robust enough, or should the ledger also carry a content hash of the removed test body to prevent a spoofed ledger entry from laundering an unrelated deletion?
- [ ] In test-after, does the Test Runner (A.5) stay a full second pass after `test-write-review`'s green check, or is it redundant for the phase's own suite (kept for regression + flaky classification in this PRD)?
- [ ] Does the `context-builder` skill need to prompt tdd:false projects to declare `test_frameworks` so test-after can engage? (Likely a follow-up; out of MVP scope here.)

---

## Users & Context

**Primary User**
- **Who:** A developer authoring a relay PRD against a `tdd: false` codebase that expects automated tests and evolves over time (the common case).
- **Current behavior:** Runs `/relay-prd` → `/relay-execute`; the run dead-ends at an Implementer R-X halt, or — where a phase must retire an obsolete test — at a B5 weakening rejection, with no authorized path to update or delete tests.
- **Trigger:** A PRD Acceptance Criterion that requires creating, updating, or retiring a test.
- **Success state:** The pipeline authors/updates tests after the code, legitimately retires obsolete/redundant ones with a justification, validates quality, runs green, and passes post-green review — no manual test surgery, no R-X halt, no false weakening flag.

**Job to Be Done**
When my project isn't test-first but still needs a maintained test suite, I want relay to create, update, and retire tests after implementation with an auditable justification, so I can evolve test-backed features through the autonomous pipeline without hand-maintaining the suite.

**Non-Users**
Projects that deliberately want **no** relay-authored tests — they declare `test_frameworks: []` and the pair skips. Projects already practicing TDD are unaffected on ordering (test-first path unchanged) and gain the lifecycle ledger.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Rename agents/commands/artifacts to the `test-*` scheme | The pair is no longer TDD-exclusive; names must stop implying otherwise |
| Must | Activate the pair on non-empty `test_frameworks` regardless of `tdd:` | Removes the tdd:false dead-end; `tdd:` becomes an ordering switch |
| Must | test-after mode in `test-writer` (before/after ordering) | The core ordering change the user asked for |
| Must | Full lifecycle authority in the pair: CREATE / UPDATE / DELETE + manifest lifecycle ledger | Real suites must be updated and pruned; only the sole authorized author may, with an audit trail |
| Must | `R-LIFECYCLE-LEGITIMATE` in `test-reviewer` (obsolete = behavior gone; redundant = proven duplicate) | Distinguishes legitimate retirement from weakening |
| Must | Mode-aware legitimacy check (RED for test-first, GREEN for test-after) | Otherwise the reviewer rejects every test-after suite |
| Must | Post-green (B5) ledger-awareness + whole-file-deletion detection | Accept authorized removals; keep blocking unexplained ones and close the whole-file hole |
| Must | Orchestrator ordering: pair before/after the Implementer by mode | Keeps R-X clean and the test diff out of the Code Reviewer's view |
| Must | Truthful plan/PRD routing notes for tdd:false | Removes the self-contradiction the Plan Reviewer currently mandates |
| Must | Governance: decisions.md supersede + new ledger decision + anti-pattern narrowing + version bump | Conscious contract evolution, not silent drift |
| Should | Docs-site parity (three-file registration rule + concept/reference pages) | Team- and external-facing surface must match |
| Could | Ledger content-hash of removed test bodies (anti-spoof) | Hardens B5 matching; deferred pending the Open Question |
| Could | context-builder prompt for `test_frameworks` on tdd:false init | Makes test-after discoverable; deferred |
| Won't | Any relaxation of R-X on the Implementer / loop | Non-negotiable invariant |
| Won't | Multi-framework selection beyond first-framework heuristic | Out of scope |

### MVP Scope

Rename + the two ordering modes + full lifecycle (create/update/delete) with the manifest ledger + reviewer `R-LIFECYCLE-LEGITIMATE` + GREEN-legitimate + B5 ledger-awareness (incl. whole-file deletion) + command-gate + orchestrator ordering + truthful notes + governance/docs/version. Validated by dogfooding `printed-exams-single-record` (tdd:false, frameworks declared, ≥1 obsolete test retired).

### User Flow

Test-after critical path (`tdd: false`, frameworks declared):

```
/relay-prd → /relay-execute:
  plan → plan-review
       → implement → code-review            (R-X: implementer diff has no tests)
       → write-test → test-write-review      (create/update/delete; ledger; GREEN-legitimate)
       → test-run → post-green-review        (B5 consults the approved ledger) → next phase
```

Test-first critical path (`tdd: true`, ordering unchanged modulo names + ledger):

```
plan → plan-review
     → write-test → test-write-review        (create/update/delete; ledger; RED-legitimate)
     → implement → code-review
     → test-run → post-green-review          (B5 consults the approved ledger)
```

---

## Technical Approach

**Feasibility:** HIGH — entirely within prompt/markdown contracts and JSON config; no runtime code. The pair, the orchestrator, the R-X guard, and B5 already exist; this rewires activation, ordering, two mode branches, a lifecycle ledger, one new reviewer check, and B5 ledger-awareness, and renames identifiers.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**.

- The `relay` repo itself is `tdd: false` with `test_frameworks: []`, so under **both** the current and the proposed model the test pair does **not** author tests for this PRD. The Acceptance Criteria above are validated by human review and by the dogfood run against a **target** project (`printed-exams-single-record`, which declares frameworks), not by an authored suite in this repo — mirroring `methodology.md`'s note that the TDD contract is exercised against target projects, not the plugin repo.

### Architecture Notes

- **Activation gate = non-empty `test_frameworks`.** Promotes the 2026-05-12 empty-frameworks decision to the single gate; `tdd:` becomes a pure ordering selector. Missing methodology → treated as no frameworks → skip (observably identical to today).
- **R-X stays universal and unchanged.** The pair is the sole test author across create/update/delete in both modes. In test-after the pair runs *after* the Code Reviewer approved the Implementer's (test-free) diff, so the test diff is reviewed only by `test-reviewer`.
- **The lifecycle ledger is the trust anchor.** Every UPDATE/DELETE the writer performs is recorded in the suite manifest with a classification (`EXISTING_TEST_UPDATED` / `OBSOLETE_TEST_REMOVED` / `REDUNDANT_TEST_REMOVED`) and a justification. `test-reviewer`'s `R-LIFECYCLE-LEGITIMATE` validates the manifest against the diff (no unrecorded update/delete) and validates each op (obsolete ⇒ removed test maps to no live in-scope AC; redundant ⇒ a named survivor covers the observable). B5 consults the APPROVED manifest to distinguish an authorized removal from a cheat. The ledger is the single mechanism that lets deletion exist without reopening the weakening attack surface.
- **`test-reviewer`'s legitimacy check is the one genuinely mode-dependent rubric row** (RED for test-first, GREEN for test-after). The other quality checks (impl-leak, trivial-assert, mock-abuse, AC-coverage, duplicate) are mode-agnostic. In test-after, R-IMPL-LEAK carries extra weight: tests written against existing code must encode the AC's observable behavior, not mirror the implementation.
- **Orchestrator implements ordering as two positioned stages** sharing one adoption body: a test-first stage before the Implementer (`tdd: true`) and a test-after stage after the Implementer+Code-Review (`tdd: false`), both gated on non-empty frameworks. Foundation-phase skip applies to test-first only (in test-after the seam already exists).
- **B5 evolution is additive.** With no manifest present, B5 behaves exactly as today (all removals block), preserving behavior for non-test-pair projects. With an APPROVED manifest, ledger-matched removals/skips become accepted notes; unmatched ones still block. Detection is extended to whole-file test deletions (currently a deferral), gated on the same ledger.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legitimate deletion becomes a weakening loophole | M | Removal requires: performed by the pair (R-X blocks all others), recorded in the ledger, reviewer-validated as obsolete/redundant, and green against the *unmodified* implementer diff; B5 blocks any removal absent from the approved ledger |
| Spoofed ledger entry launders an unrelated deletion | M | MVP matches by file+function; content-hash hardening tracked as a Could-item + Open Question |
| test-after tests mirror the actual implementation (coupled) | M | test-reviewer R-IMPL-LEAK stays strict; writer derives tests from AC observables, not the code it read |
| Rename misses a cross-reference, breaking a `Task` dispatch or artifact path | M | Grounded file inventory + AC-1 zero-grep gate; behavior-preserving rename phase kept separate from behavior phases |
| B5 whole-file-deletion detection over-fires on legitimate refactors | L | Only fires when a test file is deleted AND not in the ledger; refactors that relocate tests are recorded as update/move ledger entries |
| Silent divergence from the 2026-05-06 decision | L | Explicit superseding decisions.md entry + Decisions Log below |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Rename (behavior-preserving) | Rename the 2 agents + 2 commands + artifact strings across `plugins/relay/`; update every cross-reference; keep tdd:false self-skip intact for now | complete | - | - | PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.plan.md |
| 2 | test-writer: mode + lifecycle | test-after mode; full CREATE/UPDATE/DELETE; suite-manifest lifecycle ledger with classifications + justifications; reframe "Implementer must satisfy" | complete | - | 1 | PRPs/plans/test-pair-universalization-phase-2-test-writer-mode-lifecycle.plan.md |
| 3 | test-reviewer: mode + legitimacy | RED↔GREEN legitimacy by mode; new `R-LIFECYCLE-LEGITIMATE` (no unrecorded update/delete; obsolete/redundant validated); keep the five quality checks | pending | - | 2 | - |
| 4 | Post-green (B5) ledger-awareness | `post-green-reviewer` + `/relay-test-review` consult the APPROVED suite manifest: ledger-matched removals/skips = accepted notes, unmatched = blocking; extend detection to whole-file test deletions | pending | 5 | 3 | - |
| 5 | Command gates | `/relay-write-test` + `/relay-test-write-review`: tdd:false + frameworks → run test-after (stop self-skipping); skip only on empty frameworks/missing file; foundation-skip only in test-first | pending | 4 | 2,3 | - |
| 6 | Orchestrator ordering | `/relay-execute`: test-first stage before Implementer, test-after stage after; routing notes, run-log outcomes, budgets; B5 receives the manifest path | pending | - | 4,5 | - |
| 7 | Plan-stage + template coherence | `plan-writer` note emission, `plan-reviewer` R5 note text, `prd-template.md` tdd:false routing/AC text → describe test-after | pending | 8 | 1 | - |
| 8 | Canonical docs | decisions.md (supersede + ledger entry), anti-patterns.md narrowing, methodology.md semantics, architecture.md, api-reference.md, constraints.md, glossary.md | pending | 7 | 6 | - |
| 9 | Docs site + version bump | documentation/ pages (three-file registration rule + tdd-track/agents/commands/pipeline), changelog.html, plugin.json → 0.19.0 | pending | - | 8 | - |

### Phase Details

**Phase 1: Rename (behavior-preserving)** — Goal: all active-plugin identifiers move to the `test-*` scheme, behavior byte-identical. Scope: `agents/test-writer.md`, `agents/test-reviewer.md`, `commands/relay-write-test.md`, `commands/relay-test-write-review.md`, refs in `relay-execute.md` + `relay-implement.md`; artifact strings `test-suite.diff`, `<basename>.test-write-review.jsonl`, `test-write-reviews.md`. Success: AC-1 zero-grep passes; a tdd:true synthetic phase behaves as before under new names.

**Phase 2: test-writer mode + lifecycle** — Goal: the writer authors, updates, and retires tests after implementation, recording every non-create op. Scope: mode branch; CREATE/UPDATE/DELETE; lifecycle ledger in the manifest; relax the create-only + non-test-file-abort rules. Success: AC-3, AC-5, AC-6, AC-7, AC-9 on a tdd:false fixture.

**Phase 3: test-reviewer mode + legitimacy** — Goal: the reviewer validates a test-after suite by GREEN legitimacy and validates lifecycle ops. Scope: invert R-RED→R-GREEN for test-after; add `R-LIFECYCLE-LEGITIMATE`; keep the five quality rows. Success: AC-4, AC-8, AC-9.

**Phase 4: Post-green (B5) ledger-awareness** — Goal: authorized removals pass post-green; unexplained ones and whole-file deletions still block. Scope: `post-green-reviewer.md` reads the APPROVED manifest and reclassifies ledger-matched concerns; add whole-file-deletion detection; `/relay-test-review.md` resolves + passes the manifest path. Success: AC-10, AC-11.

**Phase 5: Command gates** — Goal: tdd:false + frameworks no longer self-skips. Scope: P4 gates in both commands; single activation gate = non-empty frameworks; foundation-skip scoped to test-first. Success: AC-3, AC-13.

**Phase 6: Orchestrator ordering** — Goal: correct stage position per mode + B5 wiring. Scope: `/relay-execute` two positioned stages; routing note; run-log outcomes; budgets reused; manifest path handed to B5. Success: AC-2, AC-3, AC-12, AC-14 across a tdd:true and a tdd:false run.

**Phase 7: Plan-stage + template coherence** — Goal: no artifact promises Implementer-authored tests. Scope: plan-writer note, plan-reviewer R5 note, prd-template.md. Success: AC-15.

**Phase 8: Canonical docs** — Goal: governance records the contract evolution. Scope: decisions.md (supersede + ledger entry), anti-patterns.md narrowing, methodology.md, architecture.md, api-reference.md, constraints.md, glossary.md. Success: AC-16; no stale "self-skips when tdd:false" without the frameworks qualifier.

**Phase 9: Docs site + version bump** — Goal: public surface matches; release cut. Scope: documentation/ per `documentation/AGENTS.md` (NAV + search-index + changelog trio, plus tdd-track/agents/commands/pipeline pages); plugin.json → 0.19.0. Success: AC-17.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Meaning of `tdd:` | Ordering selector (test-first vs test-after) | Keep as existence gate; add a separate `test_ordering:` key | Reuses the existing key; the pair becomes the universal sole author; no new methodology surface |
| Activation gate | Non-empty `test_frameworks` | Keep `tdd:true` as the gate | You cannot author a test without a framework; promotes the 2026-05-12 decision to the single gate; `[]` is a clean opt-out |
| Test lifecycle authority | Pair owns CREATE/UPDATE/DELETE; Implementer + loop own none | Let the Implementer delete in tdd:false; let B5 whitelist by heuristic | Preserves the sole-author invariant and the anti-gaming guarantee; deletion becomes auditable |
| Legitimate-removal mechanism | Manifest lifecycle ledger + reviewer `R-LIFECYCLE-LEGITIMATE` + B5 ledger gate | Trust the writer; loosen B5 to allow any test-pair diff | Removal must be justified and independently validated; B5 needs a positive authorization signal, not a blanket exemption |
| Ledger match key (MVP) | file + test-function name | file+function+content-hash | Simpler for MVP; content-hash hardening tracked as Could-item + Open Question |
| Command slugs | `/relay-write-test`, `/relay-test-write-review` | `/relay-test*` (taken), `/relay-testgen*` | `/relay-test` + `/relay-test-review` already used by Test Runner + post-green; the write-test pair disambiguates |
| Legitimacy check | Mode-dependent RED ↔ GREEN | One check for both | A test-after suite runs green by construction; a single RED check would reject every test-after suite |
| B5 default when no manifest | Behave exactly as today (all removals block) | Assume authorized | Preserves current behavior for non-test-pair projects; the ledger is opt-in evidence |
| Supersede posture | Partial supersede of 2026-05-06 (self-skip half only) | Full supersede | The sole-author invariant is kept and extended; only the tdd:false skip is retired |

---

## Research Summary

**Market Context**
Test-after (write code, then author and *maintain* a covering suite — including pruning obsolete tests) is the dominant real-world mode outside strict TDD shops; forcing `tdd: true` to get any relay-authored tests, and having no path to retire a stale test, mismatches how most teams work. No external dependency — internal contract design.

**Technical Context**
- The contradiction is self-documented: Plan Reviewer R5 (`plan-reviewer.md:187-188`) mandates a note the Implementer's R-X (`implementer.md:314-352`) forbids honoring; `decisions.md:425` names the pair the only test author while `/relay-tdd` self-skips on tdd:false (`relay-tdd.md:116-124`).
- The pair is create-only today (`tdd-writer.md:53-58`), and B5 blocks every net-removed test (`post-green-reviewer.md:82-107`, `183-186`) with no authorization concept, and misses whole-file deletions (`post-green-reviewer.md:252-255`) — the three facts that make "no agent can update or delete a test" true.
- The reviewer's R-RED-LEGITIMATE (`tdd-reviewer.md:249-321`) is the single mode-dependent rubric row; its "suite green pre-implementation → passed:false" rule (`tdd-reviewer.md:268-272`) is exactly what must invert for test-after.
- Blast radius (grounded inventory): 2 agent files, the `post-green-reviewer` agent + `/relay-test-review` command, 4 command files (`relay-tdd`, `relay-tdd-review`, `relay-execute`, `relay-implement` stub), `scripts/generate-final-report.mjs` (tdd_mode reporting), ~8 canonical docs, ~18 documentation-site pages incl. NAV `assets/js/app.js` + `assets/data/search-index.json` + `changelog.html`, and `plugin.json`. Historical `PRPs/` artifacts are immutable and out of scope.

---

*Generated: 2026-07-09*
*Approved: 2026-07-09*
*Status: APPROVED*
