# Feature: Agent capability + config surface (Phase 1 of implement-phase-docs-sync)

```
**Decision Gate**
- Active context: none
- Activated criteria: new/extended inputs on existing agent files in plugins/relay/agents/ (docs-updater.md, docs-reviewer.md); additive frontmatter-key change to docs/context/methodology.md; context-builder skill emission-logic change (plugins/relay/skills/context-builder/SKILL.md); reuse of existing components (no new agent created); impact on a reusable pipeline artifact schema (methodology.md) consumed by the existing /relay-approve and the future /relay-implement
- Decisions found:
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` — `docs_sync` is an additive frontmatter key following the same pattern as `tdd`/`test_frameworks`; the file's own "Other methodologies" section documents that new keys "may be added ... in the future without breaking the `tdd` contract."
  - [2026-06-19] `/relay-approve` design + interactivity-boundary extension — establishes the docs-updater/docs-reviewer pair's current baseline: inputs `pr` + `target_root` only, `gh pr diff <pr>` as the sole diff source, and a single-question Interactivity Clause on each agent. This is the exact baseline Phase 1 extends. It also records that the pair's post-merge interactivity extension applies ONLY to the approve-time invocation — motivating why `non_interactive` must be an explicit new gate on the agents rather than an implicit stance, since a future pre-merge invocation (Phase 2) needs the opposite default.
  - [2026-04-19] PRP artifacts live under `PRPs/`, never `.claude/` — background constraint; Phase 1 does not introduce any new artifact path, but the manifest fields it extends still live at `PRPs/reports/<feature>/docs-update.md`.
  - Anti-pattern "Activating the test pair by heuristic" (analogous principle, cited in the source PRD) — `docs_sync` must be an explicit declared key with a deterministic default, never inferred from repo signals; the context-builder emission task (Task 8) must not heuristically set it.
- Applicable anti-patterns:
  - "Injecting plugin defaults into the target project's `decisions.md`" — the `docs_sync` default lives in `docs/context/methodology.md` (written by context-builder), never in `decisions.md`.
  - "Activating the test pair by heuristic" (analogous principle) — `docs_sync` is an explicit declaration with a default, never a heuristic activation.
  - "Relying on interactive permission prompts in the autonomous loop" — motivates building the `non_interactive` gate now, ahead of the Phase 2 dispatch that will actually require it.
  - "Writing pipeline artifacts under `.claude/`" — respected; no path in this phase resolves under `.claude/`.
- Applicable architectural rules:
  - Interactivity boundary (autonomous after PRD approval) — Phase 1 builds the non-interactive mechanism without yet wiring the dispatch that will exercise it (that is Phase 2).
  - Methodology declaration is the single source of truth for per-project opt-in flags (`docs/decisions.md` 2026-04-19) — `docs_sync` must live in `docs/context/methodology.md`, not a new config surface.
  - PRP artifact paths table (`docs/context/architecture.md`) — unaffected by this phase; the manifest path stays `PRPs/reports/<feature>/docs-update.md`.
- Result: PROCEED — no unresolvable conflict. Phase 1 only extends existing agent input surfaces and an already-additive config file; the 2026-06-19 interactivity-boundary extension is scoped to the approve-time invocation and is not contradicted by adding a currently-dormant `non_interactive` flag to the same agents.
```

## Source PRD

- `PRPs/prds/implement-phase-docs-sync.prd.md` — Implementation Phases row 1: "Agent capability + config surface" — Goal: Make the docs pair invokable pre-PR and non-interactively, and add the per-project switch. — Success signal: The agents accept the new inputs; context-builder `*init` emits `docs_sync: true`; unit tests (`node:test`) pass.

## Summary

This phase gives the existing `docs-updater`/`docs-reviewer` writer/reviewer pair the raw capability surface that later phases will dispatch: an alternate diff source (`diff_source: pr | worktree | patch`) so the pair can run before a PR exists, a `non_interactive` input on both agents so they can run inside the autonomous `/relay-implement` zone without prompting, and a new `docs_sync` master-switch key in `docs/context/methodology.md` (emitted by `context-builder` on `*init`/`*update`). No dispatch point is wired yet — that is Phase 2's job — so every new input is optional and defaults to reproducing today's exact `/relay-approve` behavior, keeping the existing shipped call site untouched.

## User Story

As a relay maintainer implementing the docs-sync feature
I want the `docs-updater` and `docs-reviewer` agents to accept an alternate diff source, a non-interactive mode, and a `docs_sync` config switch
So that later phases can dispatch the docs pair pre-PR, inside the autonomous `/relay-implement` flow, without breaking the existing post-merge `/relay-approve` invocation

## Problem Statement

Narrowed from the source PRD's Problem Statement to this phase's scope: `docs-updater` is hard-tied to `gh pr diff <pr>` as its sole diff source and has no non-interactive mode; `docs-reviewer` likewise has no non-interactive mode; and there is no per-project switch to gate automated docs-sync behavior at all. Until these capabilities exist on the agents themselves, no dispatch point (Phase 2), safety-net idempotency check (Phase 3), or documentation update (Phase 4) can proceed — this phase is the seam the other three depend on.

## Solution Statement

Extend `docs-updater.md` with an optional `diff_source` input (`pr` | `worktree` | `patch`, default `pr`) alongside a `non_interactive` input; extend `docs-reviewer.md` with a matching `non_interactive` input and a `deferred_question` jsonl field; add an additive `docs_sync: true` frontmatter key to `docs/context/methodology.md`; and teach the `context-builder` skill to emit and preserve that default. Every new input is optional with a default that reproduces today's exact `/relay-approve` behavior, so the existing shipped call site (`plugins/relay/commands/relay-approve.md`) needs zero changes.

## Metadata

| Key | Value |
|-----|-------|
| Type | Agent capability extension (prompt-file / config surface) |
| Complexity | M |
| Systems Affected | `docs-updater` agent, `docs-reviewer` agent, `docs/context/methodology.md` schema, `context-builder` skill |
| Dependencies | none (Implementation Phases row 1 has no `Depends`) |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/implement-phase-docs-sync.prd.md:163` (Implementation Phases row 1); Phase Details lines 170–173 |
| phase_type | scaffold |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/docs-updater.md` | 1–52 | Current frontmatter + Inputs table — the surface being extended |
| P0 | `plugins/relay/agents/docs-updater.md` | 155–293 | Diff-Driven Procedure Step 1/2, Interactivity Clause — the logic being branched/gated |
| P0 | `plugins/relay/agents/docs-reviewer.md` | 43–140 | Current Inputs, Hard Constraints 1–9 (esp. 6 "Edit only for the flip" and 9 the existing Interactivity clause) |
| P0 | `docs/context/methodology.md` | 1–49 | Current frontmatter shape + "Other methodologies" additive-key anchor |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 585–654 | methodology.md emission template + Init/Update behavior bullets |
| P1 | `plugins/relay/agents/code-reviewer.md` | 60–73 | `diff_target` precedent — naming/optionality convention for an optional diff-parameter |
| P1 | `plugins/relay/commands/relay-approve.md` | 286–316 | Existing dispatch call site (`pr` + `target_root` only) that Phase 1 must remain backward compatible with |
| P2 | `PRPs/prds/implement-phase-docs-sync.prd.md` | 99–156 | Technical Approach / Architecture Notes — full phase rationale |
| P2 | `scripts/validate/index.mjs` | 1–45 | Level 1 STATIC_ANALYSIS entrypoint (`npm run validate`) — real exit-code semantics already built in |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/code-reviewer.md:70-73
- `diff_target` (standard mode, optional): a base ref (default
  `HEAD~1`) the agent diffs against to identify changed files.
  When omitted, the agent uses `git diff --name-only HEAD~1..HEAD`
  to enumerate changed files.
```
Copied by Task 1 — naming/optionality convention for `docs-updater`'s new `diff_source` input.

```
# SOURCE: plugins/relay/agents/docs-updater.md:23-31
## Inputs

`/relay-approve` passes you:

| Input | Type | Description |
|-------|------|-------------|
| `pr` | PR number or URL | The merged PR whose diff you will read via `gh pr diff <pr>` |
| `target_root` | absolute path | The root of the target project repository |
```
Copied by Task 1 — the exact table format for the two new input rows.

```
# SOURCE: plugins/relay/agents/docs-updater.md:285-291
- If you choose not to ask (because the ambiguity is low-stakes),
  record your choice in the manifest's "Candidate Decisions" section
  and let the Docs Reviewer decide.
```
Extended by Task 3 — the existing "don't ask, record" fallback becomes the ALWAYS path under `non_interactive: true`, writing to the new "Deferred Questions" section instead.

```
# SOURCE: plugins/relay/agents/docs-reviewer.md:132-140
9. **Interactivity clause.** This agent is dispatched post-merge,
   past the standard autonomy boundary. It MAY ask the operator one
   focused, single question when a manifest claim is genuinely
   ambiguous and the question cannot be answered from the diff or
   the source PRD alone. This is a conscious, recorded extension of
   the downstream-autonomous rule, consistent with the Docs Updater.
```
Gated by Task 6 — the existing clause becomes conditional on `non_interactive: false`.

```
# SOURCE: plugins/relay/agents/docs-reviewer.md:112-120
6. **`Edit` is used ONLY for the manifest flip; `Write` ONLY for
   the jsonl log.** [...] Your only writes are:
   - `Write`: `PRPs/reports/<feature>/docs-review.jsonl` (verdict
     log, append-only).
   - `Edit`: `PRPs/reports/<feature>/docs-update.md` (two-line
     status flip, APPROVED branch only).
```
Constrains Task 6 — the `deferred_question` field must land inside the existing jsonl `Write`, never via a new `Edit`, so Hard Constraint 6 stays byte-for-byte intact.

```
# SOURCE: docs/context/methodology.md:44-49
## Other methodologies

None declared. Add additional frontmatter keys here if and when the
plugin gains additional opt-in flows (e.g., BDD, mandatory pair-review,
specific branching strategy) — keeping the file additive so existing
`tdd` consumers keep working.
```
Copied by Task 7 — the documented anchor point for adding `docs_sync` additively.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:592-597
tdd: false                # true | false — the only key consulted by the TDD track
tdd_evidence: null        # null | "<path-or-short-reason>" | "user-declared"
test_frameworks: []       # array of frameworks detected in the scan (informative only)
```
Extended by Task 8 — `docs_sync: true` is added as a sibling frontmatter line in the same emission template.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:637-649
**Update behavior:**

- If the file exists:
  - **Never mutate the frontmatter.** `tdd`, `tdd_evidence`, and the
    set of entries in `test_frameworks` are validated human input.
  - **Exception for `test_frameworks`**: if Phase 1 detected a NEW
    framework not in the current array [...] APPEND it to the array.
    Never remove existing entries.
```
Mirrored by Task 8 — `docs_sync` gets the same "never mutate once set, backfill only when entirely absent" preservation rule.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/docs-updater.md` | UPDATE | Add `diff_source`/`non_interactive`/`patch_path` inputs; branch the diff-read step; add the `non_interactive` gate + `## Deferred Questions` manifest section; read the new `docs_sync` key |
| `plugins/relay/agents/docs-reviewer.md` | UPDATE | Add `non_interactive` input; gate Hard Constraint 9 on it; add a `deferred_question` field to the jsonl verdict object |
| `docs/context/methodology.md` | UPDATE | Add `docs_sync: true` frontmatter key + a new `## Docs Sync` body section, following the additive-key pattern |
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | Extend the methodology.md emission template + Init/Update behavior bullets to emit and preserve `docs_sync` |

## NOT Building (Scope Limits)

- Dispatching the docs pair inside `/relay-implement` — that is Phase 2's scope; this phase only builds the capability the dispatch will use.
- The `--no-docs` flag parsing and its retry-budget wiring — Phase 2 scope.
- Any change to `/relay-approve`'s docs-cycle idempotency behavior — Phase 3 scope.
- Updating `docs/` knowledge-base content or the `documentation/` site to describe the new model — Phase 4 scope.
- Automated sync of the `documentation/` rendered HTML site — permanent Won't (D-R6 / `[2026-06-19] OQ-b`); the docs pair stays scoped to `docs/`.
- Making `implementer` / `code-reviewer` docs-aware — permanent Won't; they remain docs-blind.
- An actual interactive prompt path being exercised inside `/relay-implement` — the `non_interactive` gate exists specifically so that never happens; no dispatch to exercise it exists yet in this phase.
- A new per-project config surface (`.relay.yaml`) — `docs_sync` reuses the existing `methodology.md` frontmatter surface.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/docs-updater.md (Inputs table)

- **ACTION**: Extend the `## Inputs` table (currently rows for `pr` and `target_root`, lines 27–31) with three new rows: `diff_source` (optional, one of `pr` | `worktree` | `patch`, default `pr`), `non_interactive` (optional boolean, default `false`), and `patch_path` (required only when `diff_source: patch`; the path to a captured `diff.patch`). Document explicitly that omitting `diff_source`/`non_interactive` reproduces today's `/relay-approve` behavior exactly.
- **MIRROR**: `plugins/relay/agents/code-reviewer.md:70-73` (optional diff-parameter shape) + `plugins/relay/agents/docs-updater.md:23-31` (existing Inputs table format)
- **AC**: Implements AC-A1 (PRD AC-3) and AC-A2 (PRD AC-2); the backward-compatible defaults documented here also serve AC-A6 (PRD AC-1).
- **VALIDATE**:
```bash
if ! grep -q "diff_source" plugins/relay/agents/docs-updater.md; then echo "FAIL: diff_source input missing from docs-updater.md"; exit 1; fi
if ! grep -q "non_interactive" plugins/relay/agents/docs-updater.md; then echo "FAIL: non_interactive input missing from docs-updater.md"; exit 1; fi
echo "PASS: docs-updater.md declares diff_source and non_interactive inputs"
```

### Task 2: UPDATE plugins/relay/agents/docs-updater.md (diff-read branching + docs_sync read)

- **ACTION**: In Step 1 of the Diff-Driven Procedure (currently line 163: `Run gh pr diff <pr> via Bash to capture the merged diff.`), branch on `diff_source`: `pr` (default) keeps the existing `gh pr diff <pr>` command unchanged; `worktree` runs `git -C <target_root> diff` to capture the uncommitted working-tree diff; `patch` reads the file at `patch_path` via `Read` directly (no `Bash` invocation). Extend Step 2 (knowledge-base read, which already reads `docs/context/methodology.md` at line 173) to also parse the new `docs_sync` key from that read and record the effective `diff_source` / `non_interactive` / `docs_sync` values as a new header line in the manifest template (wired concretely in Task 4).
- **MIRROR**: `plugins/relay/agents/docs-updater.md:161-166` (Step 1 format) + `plugins/relay/agents/docs-updater.md:172-173` (existing methodology.md read site)
- **AC**: Implements AC-A1 (PRD AC-3) via the diff_source branching, and AC-A5 (PRD AC-3) via the docs_sync read + effective-configuration manifest header.
- **VALIDATE**:
```bash
if ! grep -q "worktree" plugins/relay/agents/docs-updater.md; then echo "FAIL: docs-updater.md missing worktree diff_source branch"; exit 1; fi
if ! grep -q "docs_sync" plugins/relay/agents/docs-updater.md; then echo "FAIL: docs-updater.md does not read docs_sync"; exit 1; fi
echo "PASS: docs-updater.md branches on diff_source and reads docs_sync"
```

### Task 3: UPDATE plugins/relay/agents/docs-updater.md (Interactivity Clause non_interactive gate)

- **ACTION**: In the `## Interactivity Clause` section (lines 273–293), add a `non_interactive` gate immediately after the existing "MAY ask the operator a single focused question" rule: when `non_interactive: true`, docs-updater MUST NOT ask under any circumstance and MUST always take the existing "record and defer" fallback path. Introduce a new manifest section, `## Deferred Questions` (distinct from the existing `## Candidate Decisions`), for recording any question that would have been asked, each entry carrying the question text and a concrete suggested default.
- **MIRROR**: `plugins/relay/agents/docs-updater.md:285-291` (existing fallback-recording rule)
- **AC**: Implements AC-A2 (PRD AC-2) — the non_interactive MUST-NOT-ask gate and the Deferred Questions fallback path.
- **VALIDATE**:
```bash
if ! grep -q "MUST NOT ask" plugins/relay/agents/docs-updater.md; then echo "FAIL: docs-updater.md missing non_interactive MUST-NOT-ask gate"; exit 1; fi
echo "PASS: docs-updater.md Interactivity Clause gates on non_interactive"
```

### Task 4: UPDATE plugins/relay/agents/docs-updater.md (manifest template)

- **ACTION**: In the manifest template (Step 5, lines 227–264), add the new header line (recording `diff_source` / `non_interactive` / `docs_sync`, from Task 2) and the new `## Deferred Questions` heading (from Task 3) to the concrete markdown template block, positioned between `## Candidate Decisions` and `## Files Scanned — No Edit Required`.
- **MIRROR**: `plugins/relay/agents/docs-updater.md:230-264` (existing manifest template structure)
- **AC**: Implements AC-A5 (PRD AC-3) — the manifest header recording effective diff_source/non_interactive/docs_sync — and AC-A2 (PRD AC-2) by wiring the Deferred Questions heading into the concrete template.
- **VALIDATE**:
```bash
if ! grep -q "^## Deferred Questions" plugins/relay/agents/docs-updater.md; then echo "FAIL: manifest template missing '## Deferred Questions' heading"; exit 1; fi
echo "PASS: manifest template declares Deferred Questions section"
```

### Task 5: UPDATE plugins/relay/agents/docs-reviewer.md (Inputs section)

- **ACTION**: In the `## Inputs (from the calling command)` section (lines 43–49, currently `pr` and `target_root`), add a new optional `non_interactive` input (boolean, default `false`) with a one-line description mirroring docs-updater's Task 1 addition and stating that omitting it reproduces the current `/relay-approve` behavior exactly.
- **MIRROR**: `plugins/relay/agents/docs-reviewer.md:43-49` (existing Inputs bullet-list format)
- **AC**: Implements AC-A2 (PRD AC-2) — docs-reviewer's non_interactive input declaration.
- **VALIDATE**:
```bash
if ! grep -q "non_interactive" plugins/relay/agents/docs-reviewer.md; then echo "FAIL: non_interactive input missing from docs-reviewer.md"; exit 1; fi
echo "PASS: docs-reviewer.md declares non_interactive input"
```

### Task 6: UPDATE plugins/relay/agents/docs-reviewer.md (Hard Constraint 9 gate + deferred_question field)

- **ACTION**: In Hard Constraint 9 (Interactivity clause, lines 132–140), gate the existing "MAY ask the operator one focused, single question" rule on `non_interactive: false`. When `non_interactive: true`, docs-reviewer MUST NOT ask; instead it records the would-be question as a new `deferred_question` field (string, or `null` when no question arose) on the JSON verdict object it already appends to `docs-review.jsonl` via the existing `Write`-only mechanism. Hard Constraint 6 (`Edit` solely for the manifest flip) is NOT touched by this task.
- **MIRROR**: `plugins/relay/agents/docs-reviewer.md:132-140` (existing Hard Constraint 9) + `plugins/relay/agents/docs-reviewer.md:112-120` (Hard Constraint 6, the invariant this task must not violate)
- **AC**: Implements AC-A2 (PRD AC-2) — docs-reviewer's non_interactive gate and deferred_question jsonl field.
- **VALIDATE**:
```bash
if ! grep -q "deferred_question" plugins/relay/agents/docs-reviewer.md; then echo "FAIL: docs-reviewer.md missing deferred_question jsonl field"; exit 1; fi
if ! grep -q "MUST NOT ask" plugins/relay/agents/docs-reviewer.md; then echo "FAIL: docs-reviewer.md missing non_interactive MUST-NOT-ask gate"; exit 1; fi
echo "PASS: docs-reviewer.md non_interactive gate + deferred_question field present"
```

### Task 7: UPDATE docs/context/methodology.md (docs_sync key + body section)

- **ACTION**: Add `docs_sync: true` to the YAML frontmatter (after `test_frameworks`) and add a new `## Docs Sync` body section (mirroring the existing `## TDD (Test-Driven Development)` section's shape: current state, what it governs, how to override) documenting the per-project master switch, its default (`true`), and that `--no-docs` is a separate per-invocation override to be wired by the future `/relay-implement` (Phase 2 — not built yet). Use the "Other methodologies" section (lines 44–49) as the anchor point per its own instruction to add new frontmatter keys there additively.
- **MIRROR**: `docs/context/methodology.md:44-49` (Other methodologies anchor) + `docs/context/methodology.md:1-20` (`## TDD` section shape as the body-section template)
- **AC**: Implements AC-A3 (PRD AC-6) — the docs_sync frontmatter key and its documenting body section.
- **VALIDATE**:
```bash
if ! grep -q "^docs_sync: true" docs/context/methodology.md; then echo "FAIL: methodology.md missing docs_sync: true frontmatter key"; exit 1; fi
if ! grep -q "## Docs Sync" docs/context/methodology.md; then echo "FAIL: methodology.md missing Docs Sync body section"; exit 1; fi
echo "PASS: methodology.md declares docs_sync"
```

### Task 8: UPDATE plugins/relay/skills/context-builder/SKILL.md (emission template + Init/Update behavior)

- **ACTION**: Extend the methodology.md emission template (lines 592–597) with a `docs_sync: true` line (sibling to the existing `tdd: false` line, defaulting `true` per the PRD). Extend the "Init behavior" bullets (lines 624–636) so `*init` always emits `docs_sync: true` (never heuristically inferred, matching the `tdd` precedent). Extend the "Update behavior" bullets (lines 637–649) so `*update` preserves an existing human-set `docs_sync` value untouched, and backfills `docs_sync: true` only when the key is entirely absent (upgrading a project initialized before this phase shipped).
- **MIRROR**: `plugins/relay/skills/context-builder/SKILL.md:592-597` (template) + `plugins/relay/skills/context-builder/SKILL.md:637-649` (Update-behavior preservation pattern)
- **AC**: Implements AC-A4 (PRD AC-6 / AC-7 groundwork) — context-builder's docs_sync emission and preservation behavior.
- **VALIDATE**:
```bash
if ! grep -q "docs_sync: true" plugins/relay/skills/context-builder/SKILL.md; then echo "FAIL: context-builder SKILL.md missing docs_sync: true emission"; exit 1; fi
echo "PASS: context-builder SKILL.md emits docs_sync default"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
npm run validate
```
Runs the repo's registered check suite (frontmatter-schema, dispatch-graph, path-existence, artifact-naming, etc. — `scripts/validate/index.mjs:36-45`) against every file this phase touches. The runner already sets `process.exitCode = 1` on any violation and runs all checks with no short-circuit — real exit-code semantics, no `echo`-masking needed.

**Level 2 — CONTENT_INVARIANTS**
```bash
if ! grep -q "diff_source" plugins/relay/agents/docs-updater.md; then echo "FAIL: diff_source missing"; exit 1; fi
if ! grep -q "non_interactive" plugins/relay/agents/docs-updater.md; then echo "FAIL: non_interactive missing on docs-updater.md"; exit 1; fi
if ! grep -q "non_interactive" plugins/relay/agents/docs-reviewer.md; then echo "FAIL: non_interactive missing on docs-reviewer.md"; exit 1; fi
if ! grep -q "deferred_question" plugins/relay/agents/docs-reviewer.md; then echo "FAIL: deferred_question field missing"; exit 1; fi
if ! grep -q "^## Deferred Questions" plugins/relay/agents/docs-updater.md; then echo "FAIL: Deferred Questions manifest section missing"; exit 1; fi
if ! grep -q "^docs_sync: true" docs/context/methodology.md; then echo "FAIL: docs_sync frontmatter key missing"; exit 1; fi
if ! grep -q "docs_sync: true" plugins/relay/skills/context-builder/SKILL.md; then echo "FAIL: context-builder docs_sync emission missing"; exit 1; fi
echo "PASS: all Phase 1 content invariants present"
```

**Level 3 — DRY-RUN END-TO-END (backward-compatibility check)**
```bash
if ! grep -q '`pr`: the `<pr>` argument (PR number or URL)' plugins/relay/commands/relay-approve.md; then
  echo "FAIL: relay-approve.md docs-updater dispatch contract changed — Phase 1 must remain backward compatible"
  exit 1
fi
if grep -q "diff_source:" plugins/relay/commands/relay-approve.md; then
  echo "FAIL: relay-approve.md should not need to pass diff_source explicitly — new inputs must default to current pr-based behavior"
  exit 1
fi
echo "PASS: existing relay-approve.md dispatch call site is unmodified; new inputs are backward-compatible additions"
```
No live dispatch exists to exercise `worktree`/`patch`/`non_interactive` end-to-end yet (that is Phase 2); this level instead proves the one thing that must hold NOW — the already-shipped `/relay-approve` call site keeps working unmodified because every new input defaults to the current behavior.

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** `docs-updater` accepts a `diff_source` input selecting between `pr` / `worktree` / `patch` as its diff-read mechanism, in addition to the existing `gh pr diff <pr>` default — laying the groundwork for consuming a working-tree diff / attempt's `diff.patch` pre-PR.
- **AC-A2 (PRD AC-2):** `docs-updater` and `docs-reviewer` each accept a `non_interactive` input; when `true`, neither agent prompts the operator — `docs-updater` takes the "record and defer" path into a new manifest `## Deferred Questions` section, and `docs-reviewer` records a `deferred_question` field in its jsonl verdict instead of asking.
- **AC-A3 (PRD AC-6):** `docs/context/methodology.md` declares a new `docs_sync` frontmatter key (default `true`) as the per-project master switch, following the same additive-key pattern as `tdd`/`test_frameworks`.
- **AC-A4 (PRD AC-6 / AC-7 groundwork):** The `context-builder` skill's methodology.md template and Init/Update behavior emit `docs_sync: true` by default on `*init` and preserve/backfill it on `*update`, mirroring the `tdd` preservation pattern.
- **AC-A5 (PRD AC-3):** `docs-updater` reads the `docs_sync` key from `methodology.md` and records the effective `diff_source` / `non_interactive` / `docs_sync` configuration in the manifest header, so downstream consumers (and the Phase 2 dispatcher) can verify which mode a given sync ran under.
- **AC-A6 (PRD AC-1, groundwork):** The existing `relay-approve.md` → `docs-updater`/`docs-reviewer` dispatch call site (which passes only `pr` + `target_root`) continues to function unmodified because all new inputs are optional with backward-compatible defaults (`diff_source` defaults to `pr`, `non_interactive` defaults to `false`).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A working-tree diff (`git diff`) differs in shape from `gh pr diff` and breaks docs-updater's downstream parsing | M | M | Normalize to a unified diff; reuse the same parsing/comparison path regardless of `diff_source`; the PRD calls for `node:test` coverage once a test framework touches this logic (test pair, test-after, out of this plan's scope) |
| New optional inputs on `docs-updater`/`docs-reviewer` are implemented as required instead of optional, breaking the already-shipped `relay-approve.md` call site | L | H | Every new input defaults to the value that reproduces current behavior exactly (`diff_source: pr`, `non_interactive: false`); Level 3 validation explicitly checks the call site is untouched |
| `docs_sync` default drifts into heuristic activation (inferred from repo signals instead of declared) | L | M | `docs_sync` is emitted deterministically by `context-builder` on every `*init`, exactly like `tdd`'s default — never inferred; Task 8 mirrors the `tdd` Init-behavior bullet verbatim |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

`test_frameworks: ["node:test"]` is declared, so the test pair IS active in test-after mode: it will author/maintain tests from the Acceptance Criteria above AFTER the Implementer + Code Review for this phase complete. The Implementer authors ZERO test files (R-X strict, `docs/decisions.md` [2026-05-06], [2026-07-10]) — this plan's Step-by-Step Tasks intentionally create no `.test.mjs` files; the four touched files (`docs-updater.md`, `docs-reviewer.md`, `docs/context/methodology.md`, `context-builder/SKILL.md`) are prompt/config markdown, not executable production modules, so the eventual `node:test` coverage (if any) would assert on file content rather than runtime behavior.

`phase_type: scaffold` — corrected from an earlier `feature` classification per `plan-reviewer` feedback and `docs/decisions.md` [2026-07-02]: this phase touches ONLY prompt/config markdown (`plugins/relay/agents/docs-updater.md`, `plugins/relay/agents/docs-reviewer.md`, `docs/context/methodology.md`, `plugins/relay/skills/context-builder/SKILL.md`) with no `node:test`-testable application source — relay ships "prompt + config, not code" (`CLAUDE.md`). Its VALIDATE commands are filesystem/content probes (`grep`-based presence checks with real exit-code semantics), not framework test invocations — the scaffold signal per Step 4.4 of `plan-writer.md`. It is not a docs phase (the touched `.md` files are relay's own prompt/application source, not `docs/` knowledge-base content — Phase 4 is the docs phase), not a refactor (it adds capability, not just restructures), and not a foundation phase (no compiled seam/typed interface is being introduced). `phase_type: scaffold` is exempt from `R-COH-VALIDATE-FRAMEWORK-MISMATCH` despite `docs/context/methodology.md` declaring `test_frameworks: ["node:test"]`, because this phase's deliverable is not application source under test.

Research gap (recorded, not blocking): `research-codebase` confirmed no existing precedent in this codebase for a parameter that switches between two structurally different diff-retrieval mechanisms (`code-reviewer`'s `diff_target` is a single base-ref override on one `git diff` command, not a source-type selector) — Task 1/2's `diff_source` branching is new plumbing, not an extension of a prior pattern. `research-web` found no source directly contrasting working-tree/patch diff vs. GitHub PR-API diff as a deliberate design tradeoff; both are treated as equally valid non-interactive `claude -p` inputs in Anthropic's own headless-mode documentation (https://code.claude.com/docs/en/headless) and unified diff is the standardized machine-applicable format either way (https://arxiv.org/html/2510.12487v1).

---

*Generated: 2026-07-15*
*Approved: 2026-07-15*
*Implemented: 2026-07-15*
*Status: IMPLEMENTED*
