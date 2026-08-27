# Test Formatting Prevention + Preflight

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting patterns (contract spanning test-writer, /relay-write-test, /relay-implement, code-reviewer, context-builder); architectural decisions (R-X/D17 invariant, diff-baseline semantics); reuse or creation of components (formatter discovery, methodology frontmatter keys)
- Decisions found:
  - [2026-05-06] TDD pair is the only authorized test-file author; R-X strict (D17) preserved verbatim — explicit non-mutation is the load-bearing contract. This PRD keeps R-X byte-identical.
  - [2026-07-10] Test pair universalized; R-X preserved and extended to the whole lifecycle. The formatting step is pair-side/command-side, consistent with the pair being the sole test author.
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md`, non-heuristic — the new `formatter_cmd:` key follows the same emit/preserve/backfill contract; the `package.json` `scripts.format` fallback is runtime discovery of an existing project convention, not a gating-key flip (line drawn explicitly in Architecture Notes).
  - [2026-04-30] code-reviewer has no Edit tool (read-only charter) — the reason the R-X carve-out alternative was rejected.
  - [2026-04-30] §7.5 plugin.json version bump binding contract; [2026-07-12] validation suite — both in the change surface.
- Applicable anti-patterns: "Weakening or deleting tests to make the loop green" (normalization must be provably semantics-free, never a weakening channel); "Activating the test pair by heuristic" (extends to `formatter_cmd` sourcing); "Writing pipeline artifacts under `.claude/`".
- Applicable architectural rules: writer/reviewer split with reviewer-owned flips; interactivity boundary (the formatting step and preflight run autonomously, no dialogue); `documentation/` three-file registration rule.
- Result: PROCEED
```

## Problem Statement

Two mandatory relay rules are mutually exclusive in any target project whose
Level 1 STATIC_ANALYSIS gate includes a formatter check over test files: the
code-reviewer's R-X test-modification guard (D17 — any test-file match in
`git diff --name-only <diff_target>..HEAD -- <test-globs>` is an immediate
FAIL, no grace period) and the plan template's mandatory Level 1 gate (which
in real projects runs e.g. `prettier --check` via `npm run check`). Because
the test-writer has no formatting step, approved suites are frequently not
formatter-clean — so the implementer can only fail Level 1 or fail R-X. The
cost of not solving it: a full TEST_CONTRACT_DISPUTE arbitration round
(~100k tokens) per occurrence, to authorize changes verified as semantically
empty, on effectively every test-touching phase of every formatter-enforcing
project.

## Evidence

- Formal arbitration recorded at
  `PRPs/plans/google-calendar-read-phase-2-consent-credential-revocation.code-review.jsonl`
  line 3 in `C:\repos\assistente-pessoal` (Praesto Sum, 2026-08-26): one full
  TEST_CONTRACT_DISPUTE round (~100k tokens) to authorize a token-level-verified
  semantically-empty formatting change.
- R-X mechanics: `plugins/relay/agents/code-reviewer.md:373-401` — immediate
  FAIL on any test-glob match, "no 'first warning' grace period"; read-only
  charter at `:3-6`; `diff_target` is handed in by `/relay-implement`, never
  derived by the reviewer.
- Level 1 mandatory on every phase with exit-code semantics:
  `plugins/relay/resources/plan-template.md:374-389`; it runs inside the
  implementer's Phase 4 VALIDATE (`plugins/relay/agents/implementer.md:764-766`),
  i.e. inside the exact window R-X later inspects.
- The test-writer has no formatting step and no `Bash` in its allowlist
  (`plugins/relay/agents/test-writer.md:6`).

## Proposed Solution

Fix the incompatibility structurally, with zero R-X carve-outs, via
**prevention + preflight**: (1) `/relay-write-test` runs the project's
formatter — discovered deterministically — over the suite's test files at the
command layer, after the test-writer returns and before test-reviewer
dispatch, so approved suites are born formatter-clean; (2) `/relay-implement`
normalizes test-file formatting **before** the `base_commit`/`diff_target`
baseline is captured, so the window R-X inspects is born clean by
construction — covering already-approved suites and formatter-config changes;
(3) prose clarification in `code-reviewer.md` (R-SEM section) and
`implementer.md` that a reviewer finding is never self-executing
authorization to edit a test — TEST_CONTRACT_DISPUTE remains the mandatory
channel, and formatting is never a dispute subject. This approach was chosen
over (a) prevention alone (does not cover already-approved suites or
formatter-config changes) and (b) an R-X carve-out (breaks the guard whose
entire value is having no exceptions, and forces a mutating tool onto the
read-only reviewer). Prevention is not trust-based — there is no
self-certification, because the artifact is formatted before the manifest is
approved; the "verifiable > trusted" argument applies to carve-outs, not to
prevention.

## Key Hypothesis

We believe command-layer prevention in `/relay-write-test` plus a
formatting-normalization preflight in `/relay-implement` (before baseline
capture) will eliminate formatting-caused R-X failures and disputes for
formatter-enforcing projects. We'll know we're right when a full pipeline run
on a Praesto Sum-shaped project (prettier via `npm run check`) passes both
Level 1 and R-X with no test-file entries in the implementer's diff window
and no formatting-motivated dispute.

## What We're NOT Building

- **An R-X / D17 carve-out** — the guard's entire value is having zero
  exceptions; its text ships byte-identical.
- **Any mutating tool on the code-reviewer** — its read-only charter
  (`code-reviewer.md:3`, no Edit, Bash restricted to read-only) is untouched.
- **A formatting sub-channel in TEST_CONTRACT_DISPUTE** — dispute is for
  semantic contradiction with the PRD, never whitespace.
- **Heuristic inference of `formatter_cmd`** — the key is emitted by
  `context-builder` or human-set; heuristics never invent it. The
  `scripts.format` fallback reads an existing project convention, it does not
  synthesize one.
- **Semantic-diff / "formatting-only" diff classifiers** — no shipped system
  uses formatting classification as a permission mechanism, and relay won't
  be the first; prevention makes classification unnecessary.
- **Formatting of non-test files in the preflight** — strictly scoped to the
  canonical test globs (Open Question resolution pending confirms scope).

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Formatting-caused TEST_CONTRACT_DISPUTE rounds after ship | 0 (baseline: 1 observed, ~100k tokens) | Audit of `*.code-review.jsonl` arbitration entries in dogfood projects |
| R-X failures whose diff is formatting-only | 0 | Audit of code-review.jsonl R-X rows |
| Omission recording when no formatter is discoverable | 100% of such runs produce an explicit skip record | Audit of suite manifests / run reports |
| Validation suite | `npm run validate` exits 0 (12 checks) after full change surface | CI-less pre-commit gate + manual run |

## Acceptance Criteria (test scenarios)

- **AC-1 Prevention runs:** Given a target project with a discoverable
  formatter (`formatter_cmd:` declared in `docs/context/methodology.md`
  frontmatter, or `package.json` `scripts.format` present), when
  `/relay-write-test` completes the test-writer's suite, then the command
  layer runs the formatter scoped to the suite's test files before
  dispatching test-reviewer, and the formatting outcome (command used,
  source of discovery, files touched) is recorded with the suite manifest.
- **AC-2 Omission never silent:** Given a target project with neither
  `formatter_cmd:` nor `scripts.format`, when `/relay-write-test` runs, then
  the formatting step is skipped and the omission is recorded explicitly
  (discovery chain attempted + result) — never silently.
- **AC-3 Preflight cleans the window:** Given an APPROVED suite whose test
  files are not formatter-clean, when `/relay-implement` starts, then
  test-file formatting is normalized before `base_commit`/`diff_target`
  capture, so `git diff --name-only <diff_target>..HEAD -- <test-globs>`
  returns empty for formatting-only content and R-X passes without the
  implementer touching any test file.
- **AC-4 R-X byte-identical:** Given the shipped change, when the R-X rule
  text and D17 references in `code-reviewer.md` are compared to v0.34.0,
  then they are byte-identical — zero carve-outs, zero new exception prose
  inside the rule.
- **AC-5 R-SEM not self-executing:** Given a code-review R-SEM finding that
  requests a test change, when the implementer processes the verdict, then
  both `code-reviewer.md` (R-SEM section, ~:347) and `implementer.md`
  (adjacent to "never edit the test silently", ~:780) state explicitly that
  a reviewer finding is not self-executing authorization —
  TEST_CONTRACT_DISPUTE remains the mandatory channel even when the reviewer
  requested the change.
- **AC-6 Non-heuristic key contract:** Given `context-builder` runs, then
  `*init` emits the `formatter_cmd` key with its deterministic default,
  `*update` preserves an existing value untouched and backfills the default
  only when the key is entirely absent — never heuristically inferred, per
  the established `docs_sync`/`tdd` contract.
- **AC-7 Dispute never formatting:** Given the shipped `implementer.md`,
  when its dispute guidance is read, then it states the implementer does NOT
  open TEST_CONTRACT_DISPUTE for formatting — dispute is the channel for
  semantic contradiction with the PRD, not whitespace.
- **AC-8 Validation green:** Given the full change surface (agents,
  commands, skills, docs site three-file rule, `plugin.json` bump from
  0.34.0), when `npm run validate` runs, then it exits 0.

## Open Questions

- [ ] `*init` default value for `formatter_cmd` — emit `formatter_cmd: null`
  explicitly (visible, deterministic; mirrors `tdd_evidence: null`) vs. omit
  the key entirely. Leaning: emit `null`.
- [ ] Exact preflight mechanics in `/relay-implement` — dedicated, labeled
  normalization commit before baseline capture vs. other placement that
  keeps the normalization outside the `diff_target..HEAD` window without
  polluting history or tripping worktree-cleanliness checks. Deferred to
  plan stage (Risk R2).
- [ ] Preflight scope confirmation — strictly the canonical test globs
  (proposed) vs. any broader normalization. Briefing implies test files
  only.
- [ ] Where the command-layer formatting record lands — command-owned
  annotation appended to the writer's manifest vs. a sibling record file.
  Deferred to plan stage (consequence of command-layer ownership).

---

## Users & Context

**Primary User**
- **Who:** The relay pipeline operator running `/relay-execute` (or
  standalone `/relay-write-test` + `/relay-implement`) on a target project
  whose Level 1 gate includes a formatter check — today: the plugin author,
  on Praesto Sum-shaped projects.
- **Current behavior:** Hits an R-X failure or burns a ~100k-token
  TEST_CONTRACT_DISPUTE arbitration on formatting-only test-file diffs.
- **Trigger:** Any pipeline phase touching test files in a
  formatter-enforcing project.
- **Success state:** The run passes both Level 1 and R-X with zero human
  intervention and zero disputes about whitespace.

**Job to Be Done**
When the autonomous pipeline authors or inherits test files in a project
that enforces a formatter, I want test files to be formatter-clean before
the R-X inspection window opens, so the implementer never has to choose
between failing Level 1 and failing R-X — and D17 keeps zero carve-outs.

**Non-Users**
Projects with no formatter (no `formatter_cmd:`, no `scripts.format`) — both
steps skip with a recorded omission, observably unchanged otherwise. Also
not for: humans wanting a general-purpose formatting tool, and never a
channel for semantic test modification (that stays with the test pair's
lifecycle ledger and the dispute channel).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Command-layer formatting step in `/relay-write-test` (after writer returns, before test-reviewer dispatch), scoped to the suite's test files | Prevention: suites born formatter-clean; writer's allowlist untouched (least-privilege, mirrors reviewer no-Edit precedent) |
| Must | Deterministic formatter discovery: `formatter_cmd:` frontmatter → `package.json` `scripts.format` → skip with recorded omission | Non-heuristic, auditable; never silent |
| Must | `/relay-implement` preflight: normalize test-file formatting before `base_commit`/`diff_target` capture | Covers already-approved suites and formatter-config changes; R-X window born clean by construction |
| Must | `context-builder` emits `formatter_cmd` (`*init` default, `*update` preserve/backfill) | Same contract as `docs_sync`/`tdd`; key never invented by heuristic |
| Must | R-X / D17 text byte-identical | The guard's value is having zero exceptions |
| Must | R-SEM prose clarification in `code-reviewer.md` + `implementer.md` | Codifies the arbitration's second ruling: reviewer findings are not self-executing test-edit authorization |
| Should | Documentation site pages + changelog per the three-file registration rule (`documentation/AGENTS.md`) | Team-facing surface must mirror the canonical docs |
| Should | Validation-suite coverage of the new contract | Mechanical enforcement over manual discipline, per the validation-suite precedent |
| Could | Normalization statistics (files touched, bytes changed) in run reports | Observability nicety, not needed to validate the hypothesis |
| Won't | R-X carve-out; mutating tools on code-reviewer; formatting dispute sub-channel; heuristic `formatter_cmd`; semantic-diff classifiers | See "What We're NOT Building" |

### MVP Scope

The Musts only: on a Praesto Sum-shaped project (prettier via
`npm run check`), a full pipeline run passes Level 1 and R-X with no
test-file entries in the implementer's diff window, and a formatter-less
project shows the recorded omission.

### User Flow

Operator declares `formatter_cmd` (or the project already has
`scripts.format`) → `/relay-write-test` emits a formatter-clean approved
suite → `/relay-implement` preflight normalizes any residue before fixing
the baseline → implementer writes production code, never touches tests →
Level 1 passes, R-X passes → PR.

---

## Technical Approach

**Feasibility:** HIGH — prompt/markdown and command-protocol changes only,
no runtime code; every insertion point verified during grounding
(`relay-implement.md:195` records `base_commit` before Phase A; Phase A.1
hosts ordered preflight checks; the `methodology.md` key-read pattern with
default-on-absence is already established there for `docs_sync`/`figma_track`).

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**.
Test-after ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with no
framework declared, no tests are authored. (This repo declares
`test_frameworks: ["node:test"]`, so the pair is active test-after;
validation-suite checks cover the deterministic surface.)

### Architecture Notes

- **Command-layer ownership of the prevention step (decided):** the
  formatter runs in `/relay-write-test` after the writer returns —
  `test-writer`'s allowlist (`Task, Read, Write, Edit, Glob`, no Bash) stays
  untouched, consistent with least-privilege precedents (code-reviewer's
  no-Edit). Consequence: the manifest is writer-authored, so the formatting
  record is command-owned (exact landing spot is an Open Question for the
  plan stage).
- **Non-heuristic line:** `formatter_cmd:` follows the
  emit/preserve/backfill contract of `docs_sync`/`tdd`. The
  `scripts.format` fallback is runtime discovery of an existing,
  human-authored project convention — it reads a declared script, it never
  infers a command from installed devDependencies, config files, or file
  extensions.
- **Preflight placement:** normalization must complete before
  `base_commit`/`diff_target` capture in `/relay-implement`, so the
  `<diff_target>..HEAD` window R-X inspects never contains formatting
  changes. The implementer never opens TEST_CONTRACT_DISPUTE for
  formatting.
- **Trust model for `formatter_cmd`:** an arbitrary command executed
  autonomously — sourced exclusively from the human-owned
  `docs/context/methodology.md`, the same trust model as the plan's
  Validation Commands (which already carry mandatory exit-code semantics).

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Formatter over-reach: a naively invoked project formatter touches non-test files | M | Invoke scoped to explicit test-file paths / canonical test globs only |
| Preflight/baseline commit semantics pollute history or trip worktree-cleanliness checks | M | Dedicated, labeled normalization commit before baseline capture; exact mechanics settled at plan stage (Open Question) |
| `formatter_cmd` as command-injection surface (arbitrary autonomous execution) | L | Sourced only from human-owned `methodology.md` — same trust model as Validation Commands |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | formatter_cmd contract | `context-builder` emit/preserve/backfill of `formatter_cmd`; `docs/context/methodology.md` documentation; validation-suite awareness of the new key | complete | - | - | PRPs/plans/test-formatting-prevention-preflight-phase-1-formatter-cmd-contract.plan.md |
| 2 | Prevention | `/relay-write-test` command-layer formatting step + discovery chain + omission recording + `test-reviewer` awareness of the record | complete | - | 1 | PRPs/plans/test-formatting-prevention-preflight-phase-2-prevention.plan.md |
| 3 | Preflight | `/relay-implement` test-file normalization before `base_commit`/`diff_target` capture | complete | - | 1 | PRPs/plans/test-formatting-prevention-preflight-phase-3-preflight.plan.md |
| 4 | R-SEM prose | Clarification in `code-reviewer.md` (R-SEM section) + `implementer.md` (dispute guidance): findings not self-executing; formatting never a dispute | complete | - | - | PRPs/plans/test-formatting-prevention-preflight-phase-4-r-sem-prose.plan.md |
| 5 | Docs + release | Documentation site (three-file registration rule), `docs/decisions.md` entry, `plugin.json` bump from 0.34.0, `npm run validate` green | complete | - | 2, 3, 4 | PRPs/plans/test-formatting-prevention-preflight-phase-5-docs-release.plan.md |

#### Phase-status lifecycle

This table IS relay's canonical phase-state machine (`docs/decisions.md`,
2026-05-04) — there is no separate state file. Every row starts at
`pending` and advances through exactly five states, in order, never
skipping backwards:

| Status | Meaning | Written by |
|--------|---------|------------|
| `pending` | No plan yet. The only state from which a row is actionable. | Authored here, by hand or by `prd-writer` |
| `in-progress` | A DRAFT plan exists and the `PRP Plan` cell points at it. | `plan-writer` Step 5.1 back-fill |
| `implemented` | Code written and code-review APPROVED; tests not yet settled. | `/relay-implement` D8 Mutation c |
| `tested` | Test suite ran GREEN *and* post-green review confirmed the green was not obtained by weakening tests. | `/relay-execute` Step A.5.3 |
| `complete` | The orchestrator drove the phase end to end. | `/relay-execute` Step A.6.0 |

Three rules follow from this table and are enforced across the pipeline:

1. **`tested` is skipped, never faked, when nothing was tested.** A project
   with no declared test framework (or a phase whose test stage self-skipped)
   goes `implemented` → `complete` directly. The skip reason is recorded in
   `PRPs/reports/<feature>/orchestrator-run.json`, not hidden in the Status
   cell.
2. **A dependency is satisfied from `implemented` onward.** A row listed in
   another row's `Depends` cell unblocks it once it reaches `implemented`,
   `tested`, or `complete` — not only at `complete`. Otherwise a
   hand-invoked `/relay-implement`, which legitimately stops at
   `implemented` because nothing outside the orchestrator writes the last
   two states, would block every dependent phase forever.
3. **`complete` does not mean "merged".** It means the orchestrator finished
   the phase. Merge, branch cleanup, and post-merge docs sync belong to
   `/relay-approve`, which never edits this table.

To re-run a phase, hand-edit its `Status` cell back to `pending` — that is
the documented escape hatch, and the only sanctioned backwards transition.

### Phase Details

**Phase 1: formatter_cmd contract**
- **Goal:** A deterministic, non-heuristic source for the project formatter
  command.
- **Scope:** `context-builder` skill (`*init` emit, `*update`
  preserve/backfill), `docs/context/methodology.md` documentation of the
  key, validation-suite awareness (frontmatter/gating-structure checks as
  applicable).
- **Success signal:** `*init` output carries the key with its deterministic
  default; `*update` never flips a set value; `npm run validate` green.

**Phase 2: Prevention**
- **Goal:** Suites leave `/relay-write-test` formatter-clean, or with a
  recorded omission.
- **Scope:** `/relay-write-test` command protocol (discovery chain a→b→c,
  scoped formatter invocation, outcome/omission recording),
  `test-reviewer`/`/relay-test-write-review` awareness of the record.
- **Success signal:** AC-1 and AC-2 demonstrable on a fixture project with
  and without a discoverable formatter.

**Phase 3: Preflight**
- **Goal:** The R-X inspection window is born clean regardless of suite
  provenance.
- **Scope:** `/relay-implement` normalization of test-file formatting before
  `base_commit`/`diff_target` capture; explicit no-dispute-for-formatting
  rule.
- **Success signal:** AC-3 demonstrable: an unclean approved suite yields an
  empty test-glob diff in the R-X window; R-X passes.

**Phase 4: R-SEM prose**
- **Goal:** The arbitration's second ruling becomes explicit prose.
- **Scope:** `code-reviewer.md` R-SEM section (~:347) and `implementer.md`
  (~:780) — reviewer findings are not self-executing authorization; dispute
  remains the only channel; formatting is never a dispute. R-X/D17 text
  untouched (AC-4).
- **Success signal:** AC-4, AC-5, AC-7 hold on diff inspection.

**Phase 5: Docs + release**
- **Goal:** Ship the change surface coherently.
- **Scope:** `documentation/` pages + changelog + NAV + search index
  (three-file rule per `documentation/AGENTS.md`), `docs/decisions.md`
  entry, `plugin.json` bump from 0.34.0, full `npm run validate`.
- **Success signal:** AC-8; changelog entry present; version parity check
  green.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Overall approach | Prevention + preflight, zero R-X carve-outs | (1) Prevention alone; (2) R-X carve-out for formatting-only diffs | (1) doesn't cover already-approved suites or formatter-config changes; (2) breaks the guard whose entire value is having no exceptions and forces a mutating tool onto the read-only reviewer. Prevention is not trust-based — no self-certification, the pair formats before the manifest is approved; "verifiable > trusted" applies to carve-outs, not prevention. (2026-08-26 arbitration follow-up) |
| Prevention ownership | Command layer: `/relay-write-test` runs the formatter after the writer returns | Grant `Bash` to `test-writer` and run it inside the agent | Least-privilege: writer's allowlist untouched, mirroring the code-reviewer no-Edit precedent; the command layer already owns dispatch sequencing. (User decision, this session) |
| Formatter discovery | `formatter_cmd:` frontmatter → `scripts.format` → skip + recorded omission | Heuristic detection (devDependencies, config files); mandatory key with hard failure | Non-heuristic contract preserved; fallback reads a human-authored convention; omission recording keeps the skip auditable, never silent |
| Dispute scope | Formatting is never a TEST_CONTRACT_DISPUTE subject | Allow formatting disputes as a pressure valve | Dispute is the channel for semantic contradiction with the PRD; preflight removes the need entirely |
| R-SEM findings | Not self-executing authorization to edit tests; dispute mandatory even when the reviewer requested the change | Treat a reviewer finding as implicit authorization | Codifies the 2026-08-26 arbitration's ruling; keeps a single authorization channel |

---

## Research Summary

**Market Context**
- The dominant industry pattern matches the prevention shape: the author
  formats before the artifact leaves their hands (format-on-save →
  pre-commit hook → CI backstop); CI-only enforcement is the anti-pattern
  (https://interrupt.memfault.com/blog/pre-commit;
  https://mlops-coding-course.fmind.dev/5.%20Refining/5.2.%20Pre-Commit%20Hooks.html).
- Documented multi-agent prior art (an OpenCode plan/implement/review
  pipeline) keeps write-scope guards and lint checks strictly orthogonal —
  formatting checks are never a bypass of file-ownership guards; a post-step
  diff gate discards any agent output touching non-allowed files
  (https://gist.github.com/ppries/f07fd6316bbd45807dd7a1896555b05b).
  Independently validates rejecting the R-X carve-out.
- Semantic-diff tooling (CodeRabbit) hides formatting noise for reviewer
  experience, explicitly not as a permission mechanism; no shipped system
  found using "formatting-only" classification as an exemption gate
  (https://www.coderabbit.ai/blog/introducing-semantic-diff).
- Gap: no public prior art for "format-preflight before a diff baseline is
  captured" as a named pattern — novel framing, consistent with the layered
  enforcement philosophy above. No documented case of a formatting exemption
  being abused to sneak semantic changes was found (inferred risk, not
  observed).

**Technical Context**
- R-X: `plugins/relay/agents/code-reviewer.md:373-401` — pathspec'd
  `git diff --name-only <diff_target>..HEAD`, immediate FAIL, no grace
  period; read-only charter `:3-6`; `diff_target` supplied by
  `/relay-implement`.
- Level 1: `plugins/relay/resources/plan-template.md:374-389` — mandatory on
  every phase, exit-code semantics; runs in implementer Phase 4 VALIDATE
  (`implementer.md:764-766`), inside the R-X window.
- Insertion points: `relay-implement.md:195` (`base_commit` recorded before
  Phase A — preflight must precede it); Phase A.1 ordered preflight checks
  (`relay-implement.md:217-227`); methodology key-read with
  default-on-absence already established (`docs_sync`, `figma_track`).
- `test-writer.md:6` — tools `Task, Read, Write, Edit, Glob`, no Bash
  (drove the command-layer ownership decision); manifest ends
  `*Status: DRAFT*` with lifecycle ledger for non-create ops
  (`test-writer.md:102-116, 138-144`) — the formatting record must not
  masquerade as an UPDATE/DELETE lifecycle op.
- Prose anchors: R-SEM at `code-reviewer.md:347-371`; "never edit the test
  silently" at `implementer.md:773-780`.
- Gaps (plan-stage verification): context-builder skill emit/preserve wiring
  for a new key not yet read; `scripts/validate/schemas/` impact of the new
  methodology key unconfirmed; `relay-write-test.md`/`test-reviewer.md` not
  yet read directly.

---

*Generated: 2026-08-26*
*Approved: 2026-08-26*
*Status: APPROVED*
