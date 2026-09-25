# Feature: The pass (Phase 2 of hybrid-code-review)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting change to a reviewer agent's tool capability (`Skill` added to `code-reviewer`); a new per-invocation input threaded through `/relay-implement`'s dispatch of `code-reviewer`; a new project-declared companion methodology key (`hybrid_code_review_level`)
- Decisions found:
  - [2026-09-21] "Code-review evaluation outcome: improve" — mandates the hybrid pass and fixes this phase's scope: dispatch via `Skill` inside `code-reviewer`, level ceiling refused by name, findings collected but adjudication (advisory-by-default intake) deferred to Phase 3
  - [2026-08-28] "Review agents never mutate the target working tree" — governs the before/after `git status --porcelain` read-only verification this phase adds around the `Skill` call
  - [2026-08-27] an R-SEM finding is not self-executing test-edit authorization — governs that this phase's pass findings carry no authority of any kind yet (Phase 3 wires adjudication; this phase only collects evidence)
  - [2026-07-09] a `Task`-dispatched subagent never reaches the user — confirms the pass, like every other autonomous-loop step, must degrade with a named reason rather than prompt
  - [2026-08-06] BLOCKING/ADVISORY materiality taxonomy — the destination this phase's collected evidence feeds in Phase 3; not consumed by this phase
- Applicable anti-patterns:
  - "Mutating a target project's working tree from a review agent" — this agent never runs `git restore`/`git checkout`/`git clean` against the target; a detected mismatch is recorded, never repaired
  - "Relying on interactive permission prompts in the autonomous loop" — the pass degrades on any tool failure rather than prompting
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — governs the new `hybrid_code_review_level` companion key's declared/never-inferred contract
  - "Writing pipeline artifacts under `.claude/`" — no new artifact path is introduced by this phase
- Applicable architectural rules:
  - the writer/reviewer pair model — `code-reviewer` stays the sole verdict owner; the COMMAND still owns D8 mutations; this phase changes neither
  - the diff-base contract (`git diff <base>`, single-argument form) — already governs this agent's own R-X and file-set derivation; unaffected by this phase
  - PRP artifact paths — the pass's findings live only inside the verdict object this phase extends, not a new file
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/hybrid-code-review.prd.md` — Implementation Phases row 2:
  "The pass" — Goal: the reviewer can run `/code-review` over the right
  tree, safely — Success signal: with the key on, a review records the
  pass outcome and the target tree is untouched; with the skill
  unavailable, the review completes with a degraded reason and no halt.

## Summary

This phase gives `code-reviewer` the `Skill` tool and a bounded,
evidence-only `/code-review` pass: one invocation per standard-mode
review, at a declared level (`medium` or `high` only — anything else,
including `xhigh`/`max`/`ultra`, is refused by name), against the
worktree path passed explicitly. The pass never touches `--fix` or
`--comment`, carries its own fixed 3-minute budget that never consumes
`max_implement_retries`, is skipped outright when the loop's own
wall-clock deadline (newly forwarded from `/relay-implement`) leaves
too little room, and is verified read-only via a before/after
`git status --porcelain` comparison. Every outcome — success, refusal,
skip, or degradation — is recorded on four new optional verdict-log
fields (`hyb`, `hyb_lvl`, `hyb_n`, `hyb_ms`) that Phase 1 already
declared in the schema. Nothing in this phase changes `R-S1`, `R-S2`,
`R-S3`, `R-L1`, `R-L2`, `R-L3`, `R-SEM`, `R-X`, `verdict`, or `action` —
the findings are collected, not adjudicated. Adjudication is Phase 3.

## User Story

As a relay operator who has opted a target project into the hybrid
`/code-review` evidence pass
I want `code-reviewer` to run that pass safely — the right tree, a
declared level, its own budget, and a graceful degradation path — and
record what happened
So that the evidence exists for Phase 3's adjudication without risking
the loop's stability, the target tree's integrity, or a silent misuse
of `xhigh`/`max`/`ultra`/`--fix`/`--comment`

## Problem Statement

Narrowed to this phase: `code-reviewer` has no way to invoke
`/code-review` at all today — no `Skill` tool, no level configuration,
no budget isolation from the loop's own wall-clock deadline, and no
verification that the pass left the target tree untouched. Without
this phase, Phase 3's adjudication logic would have nothing to
adjudicate, and any naive addition of `Skill` would risk exactly the
failure modes the 2026-09-21 evaluation measured at `max`: side effects
outside the target tree, unbounded cost, and a level ceiling nobody
enforces.

## Solution Statement

Add `Skill` to `code-reviewer`'s `tools:` frontmatter — the same
"gains exactly one tool, no other capability change" pattern already
used when the agent gained `Task` for `code-reviewer-semantic`
dispatch. Read the `hybrid_code_review` / `hybrid_code_review_level`
declaration from `methodology.md` in Phase 0 (mirroring the existing
`tdd:` read). Add a new, standalone section that runs after the
existing 8-item rubric in standard mode only: it refuses any
configured level other than exactly `medium`/`high` by name, never
constructs `--fix`/`--comment`, skips outright when a newly forwarded
`deadline_ts` shows insufficient remaining budget, verifies the target
tree is unchanged before and after the one `Skill` call it makes, and
degrades — never halts — on any tool error, unparseable output, or
timeout. Populate the four already-declared optional verdict fields
from this section's outcome, present only when the project has opted
in. `/relay-implement` forwards its own `deadline_ts` into the
standard-mode dispatch so the pass can make the skip decision; the
arbitration-mode dispatch is untouched, since the pass never runs
there.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/agents/code-reviewer.md`; `docs/context/methodology.md`; `plugins/relay/skills/context-builder/SKILL.md`; `plugins/relay/commands/relay-implement.md` |
| Dependencies | Phase 1 (`hybrid-code-review-phase-1-contract-and-opt-in.plan.md`) — the `hybrid_code_review` key, the `class` field slot, and the four `hyb_*` verdict-log field declarations this phase populates |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/hybrid-code-review.prd.md:169,181-184` (Implementation Phases row 2 + Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/code-reviewer.md` | 1-30, 90-165 | frontmatter `tools:` line, Hard constraints, and the existing Phase 0 methodology read pattern this phase's new reads mirror |
| P0 | `plugins/relay/agents/code-reviewer.md` | 362-524 | R-SEM, R-X, and the R-COH-* coherence layer intro — the new pass section is inserted between R-X and this intro, and must not alter any of these rows |
| P0 | `plugins/relay/agents/code-reviewer.md` | 892-1225 | Phase 4 verdict construction and the `code-review.jsonl format` worked examples this phase extends with the four `hyb_*` fields |
| P0 | `PRPs/plans/completed/hybrid-code-review-phase-1-contract-and-opt-in.plan.md` | 1-496 | the shipped Phase 1 contract this phase builds on — the exact `hybrid_code_review` key shape, the `class` field slot prose, and the `hyb`/`hyb_lvl`/`hyb_n`/`hyb_ms` field declarations already in the schema |
| P0 | `plugins/relay/commands/relay-implement.md` | 286-320, 394-417 | Phase A.0's budget/deadline bookkeeping and Phase A.3's existing `code-reviewer` dispatch block this phase extends with `deadline_ts` |
| P1 | `docs/context/methodology.md` | 80-133 | the "## Formatter" (value-string key) and "## Hybrid Code Review" (boolean key, Phase 1) sections this phase's new `hybrid_code_review_level` companion key mirrors |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 630-790 | the per-project template's Init/Update behavior prose, including `formatter_cmd`'s value-string-key shape this phase's `hybrid_code_review_level` key follows |
| P1 | `PRPs/reports/code-review-evaluation/report.md` | 16-30, 93-120 | the reachability spike (Skill needs an explicit path argument; the fork returns free text at `medium`/`high`) and the effort-level sweep (cost, output shape, `max`'s side effects) this phase's refusal and timeout design are grounded in |
| P2 | `docs/anti-patterns.md` | 161-167 | "Mutating a target project's working tree from a review agent" — the anti-pattern the new read-only verification step exists to satisfy without attempting a repair |
| P2 | `scripts/validate/checks/gating-structure.mjs` | 32-38 | the `formatter_cmd` exclusion boundary comment confirming a value-string key like `hybrid_code_review_level` does NOT need a `SITES` registry entry |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/code-reviewer.md:519-524
read-only invariant is also preserved verbatim: code-reviewer parent
gains `Task` only (for sub-agent dispatch); the sub-agent
(`code-reviewer-semantic`) is itself read-only over the repo
(`tools: Glob, Grep, Read`); no `Edit` anywhere; no `Bash` in the
sub-agent. Both contract evolutions are recorded as the 2026-04-28
combined entry in `docs/decisions.md`.
```
Copied by Task 1 (the "gains exactly one tool, no other capability
change" precedent — `Skill` is added the same narrow way `Task` was).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:159-165
- `docs/context/methodology.md` — capture the `tdd:` value for the
  Phase 5 handoff (the universal R-X rule fires regardless of this
  value per D9 Layer 0; the value is reported only for context). If
  the file is absent, record "methodology.md not present" and
  default the routing string to `tdd: unavailable (file missing —
  defaulting to tdd: false semantics)` per the `prd-writer.md`
  Step 7.4 canonical text. Do NOT halt.
```
Copied by Task 1 (the exact shape a second, third frontmatter-key read
in the same Phase 0 paragraph must follow: capture, default when
absent, never halt).

```
# SOURCE: plugins/relay/commands/relay-implement.md:291,295,312-320
- `max_implement_minutes = 45` (wall-clock; 0 forbidden per source PRD D7)
...
- `deadline_ts = now() + max_implement_minutes minutes`
...
1. **Time budget check.** If `now() >= deadline_ts`:
   - Write `<artifact_root>../halt.json` ...
   - HALT with verbatim message:
     > FAILED_TIME_BUDGET_EXCEEDED. /relay-implement aborted after
     > <elapsed_minutes> wall-clock minutes (max_implement_minutes=45)
     > with <max_implement_retries + 1 - attempt> retries unused.
```
Copied by Task 2 (the existing wall-clock budget vocabulary —
`deadline_ts`, a fixed named cap, a pre-flight check before dispatch —
that this phase's own smaller, pass-scoped budget check mirrors; this
phase's check SKIPS the pass rather than halting the loop).

```
# SOURCE: plugins/relay/agents/research-web.md:106-121
### Step 5 — Handle graceful degradation

If `WebSearch` is unavailable, returns no useful results across all
planned queries, or every `WebFetch` fails, return:

{
  "findings": [],
  "gaps": ["<what the caller should know about why this is empty>"],
  "degradation_reason": "<one-sentence explanation: search unavailable / no relevant results / fetch failures>",
  "scope_cap_reached": false
}

Never fabricate findings to fill a sparse result. An empty return with
a clear `degradation_reason` is a correct outcome.
```
Copied by Task 2 (the relay-wide vocabulary for "never halt, never
fabricate, always return a named reason" that this phase's
`SKILL_UNAVAILABLE`/`SKILL_ERROR:<message>`/`UNPARSEABLE_OUTPUT`/
`TIMEOUT_EXCEEDED` reasons follow).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:894-909
{
  "timestamp": "<UTC ISO-8601>",
  "attempt": <integer from COMMAND>,
  "verdict": "APPROVED" | "CHANGES_REQUESTED",
  "mode": "standard" | "arbitration",
  "rubric": [ /* 8 standard items OR 1 arbitration item */ ],
  "dispute_evidence": { /* present only in arbitration mode */ },
  "action": "final_flip" | "rubric_fail" | "revalidation_fail",
  "user_message": ""
}
```
Copied by Task 3 (the verdict-object schema block the four new
optional `hyb_*` fields are appended to, without touching any existing
key).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:1115-1120
{ "id": "R-COH-DEAD-IMPORT", "passed": true },
{ "id": "R-COH-CALLER-DRIFT", "passed": true },
{ "id": "R-COH-CONFIG-DANGLING", "passed": true, "reason": "no config files in diff" },
{ "id": "R-COH-REGISTRY-MISSING", "passed": true, "reason": "no registries declared; check skipped" },
```
Copied by Task 3 (the additive-optional-field precedent — a field
appears only when relevant/populated, never as a placeholder).

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:714-721
- Always emit `formatter_cmd: null` — the per-project declared formatter
  command defaults to undeclared, mirroring the `tdd_evidence: null`
  default-emission precedent verbatim. Never heuristically inferred from
  `package.json` `scripts.format`, installed devDependencies, or config
  files — that fallback is a later phase's own runtime discovery at
  formatting time, never a value written back into this file; always
  emitted deterministically on every `*init` run. Flips away from `null`
  only via a human edit to this file.
```
Copied by Task 5 (the value-string-key Init-behavior shape —
`hybrid_code_review_level` is a value key like `formatter_cmd`, not a
boolean gate like `lane_runtime_safe`/`hybrid_code_review`).

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:776-782
- **`formatter_cmd` preservation**: if `formatter_cmd` is already
  present in the frontmatter (including an explicit `null`), preserve
  its value untouched — same treatment as `tdd`/`docs_sync`. If the
  key is entirely absent, backfill `formatter_cmd: null` — the ONLY
  case `*update` adds this key; never remove or flip an existing
  non-null value, and never infer one from `package.json`
  `scripts.format` or any other project file.
```
Copied by Task 5 (the value-string-key Update/preservation shape).

```
# SOURCE: plugins/relay/commands/relay-implement.md:406-414
Task(subagent_type="code-reviewer",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       mode: "standard",
       attempt: <attempt>,
       diff_target: "<artifact_root><attempt>/diff.patch",
       review_started_at: <the instant captured immediately above>,
     })
```
Copied by Task 6 (the exact standard-mode dispatch block `deadline_ts`
is appended to; the arbitration-mode dispatch a few lines later is
deliberately NOT touched).

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/code-reviewer.md` | UPDATE | add `Skill` to `tools:`; read `hybrid_code_review`/`hybrid_code_review_level` in Phase 0; accept the new `deadline_ts` input; add the standalone pass section; populate the four `hyb_*` verdict fields in Phase 4 (Tasks 1-3) |
| `docs/context/methodology.md` | UPDATE | add the `hybrid_code_review_level: "medium"` companion key and its "### Level" prose (Task 4) |
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | mirror the same companion key into the per-project template's frontmatter + Init/Update behavior prose (Task 5) |
| `plugins/relay/commands/relay-implement.md` | UPDATE | forward `deadline_ts` into the standard-mode `code-reviewer` dispatch only (Task 6) |

## NOT Building (Scope Limits)

- No adjudication logic — the pass's findings never influence `R-SEM`,
  `class`, `verdict`, or `action` in this phase (Phase 3's job).
- No `class: blocking | advisory` value is ever set on any rubric row
  by this phase; the slot Phase 1 documented stays unpopulated.
- No findings cap, no reachability-confirmation logic (Phase 3).
- No drift gate, no pinned-sample-set wiring (Phase 4).
- No target-project dogfood, no default-level decision (Phase 5).
- No change to R-X, arbitration, the dispute channel, or
  `/relay-code-review` (explicit PRD exclusions, unaffected by this
  phase).
- No `scripts/validate/checks/gating-structure.mjs` change —
  `hybrid_code_review_level` is a value-string key like `formatter_cmd`,
  which that file's own boundary comment (lines 32-38) explicitly
  excludes from the `SITES` registry; only boolean opt-in gates like
  `hybrid_code_review` itself (already registered in Phase 1) go there.
- No `.claude/settings.json` / allowlist change — `Skill` is a
  frontmatter-declared tool capability, not a `Bash` command pattern,
  and the reachability spike (`report.md` §1) observed no permission
  prompt when a `Task`-dispatched subagent invoked it.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/code-reviewer.md (tools, Phase 0, Inputs)

- **ACTION**: Change the frontmatter `tools:` line (currently
  `tools: Read, Write, Glob, Grep, Bash, BashOutput, Task`) to
  `tools: Read, Write, Glob, Grep, Bash, BashOutput, Task, Skill`.
  In Phase 0's methodology-read paragraph (immediately after the
  existing `tdd:` bullet), add: "Also capture `hybrid_code_review`
  (boolean, default `false` when absent) and
  `hybrid_code_review_level` (string, default `"medium"` when absent)
  from the same frontmatter, recording `hybrid_enabled` and
  `hybrid_level`. Never heuristically inferred — read the declared
  value only, mirroring the `tdd:` read immediately above. If
  `methodology.md` is absent, both default exactly as stated (no
  halt, matching the existing missing-file default branch)." In the
  Inputs section, add a new bullet immediately after
  `review_started_at`: "`deadline_ts` (standard mode, optional): the
  calling command's own wall-clock budget deadline
  (`YYYY-MM-DDTHH:MM:SSZ`, UTC), forwarded verbatim from
  `/relay-implement`'s `deadline_ts` (Phase A.0). Used exclusively by
  the hybrid `/code-review` pass's pre-flight skip decision (see the
  dedicated pass section below); absent when the caller has no
  wall-clock budget (e.g. standalone `/relay-code-review`), in which
  case the pass is never skipped for budget reasons."
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:519-524` (single-tool-addition precedent) and `# SOURCE: plugins/relay/agents/code-reviewer.md:159-165` (Phase 0 read shape)
- **AC**: AC-A1 (PRD AC-2), AC-A6 (PRD AC-10) — the capability and input preconditions the rest of this phase's pass logic depends on.
- **VALIDATE**: `if grep -q 'tools: Read, Write, Glob, Grep, Bash, BashOutput, Task, Skill' plugins/relay/agents/code-reviewer.md && grep -q 'hybrid_enabled' plugins/relay/agents/code-reviewer.md && grep -q 'deadline_ts' plugins/relay/agents/code-reviewer.md; then echo "PASS: Skill tool, hybrid_enabled read, and deadline_ts input all present"; else echo "FAIL: one or more of Skill tool / hybrid_enabled / deadline_ts missing"; exit 1; fi`

### Task 2: UPDATE plugins/relay/agents/code-reviewer.md (the pass section)

- **ACTION**: Insert a new section titled exactly
  `## The hybrid /code-review pass (Phase 2 — evidence collection only)`
  immediately after the R-X section ends and before the
  `## The R-COH-* coherence layer` heading. The section MUST state,
  in this order: (1) standard mode only — never runs in arbitration
  mode; (2) zero-effect when `hybrid_enabled == false` — no
  invocation, no local state, Phase 4 adds none of the four `hyb_*`
  fields; (3) a refusal-by-name guard: when `hybrid_level` is not
  exactly `medium` or `high` (covers `xhigh`, `max`, `ultra`, and any
  other value), set local state to `"refused"` with the literal
  marker `HYBRID_LEVEL_REFUSED` and reason `refused_level:<value>`,
  and do NOT invoke `Skill`; (4) `--fix` and `--comment` are never
  constructed in the invocation args, under any configuration —
  hardcoded, unreachable via any project declaration; (5) a fixed
  internal budget `hybrid_pass_timeout_minutes = 3` (not
  project-configurable), distinct from and never consuming
  `max_implement_retries`; (6) a pre-flight skip: when `deadline_ts`
  is present and
  `now() + hybrid_pass_timeout_minutes minutes > deadline_ts`, set
  local state to `"skipped"` with reason `SKIPPED_INSUFFICIENT_BUDGET`
  and do NOT invoke `Skill`; (7) a read-only verification: capture
  `git status --porcelain` via `Bash` immediately before invoking and
  again immediately after; if they differ, set local state to
  `"degraded"` with reason `READ_ONLY_VIOLATION_DETECTED`, discard the
  pass's findings, and explicitly do NOT attempt any repair (`git
  restore`/`git checkout`/`git clean` are never run against the
  target — cite the anti-pattern by name); (8) otherwise invoke
  exactly once: `Skill("code-review", "<hybrid_level> <target_root>")`;
  (9) on tool error, empty/unparseable return, or the tool's own
  timeout signal, set local state to `"degraded"` with one of
  `SKILL_UNAVAILABLE` / `SKILL_ERROR:<message>` /
  `UNPARSEABLE_OUTPUT` / `TIMEOUT_EXCEEDED`, and continue — never
  halt, never prompt; (10) on success, parse the returned text for
  the `file:line — description` finding-line shape (per
  `report.md` §1's documented free-text output at `medium`/`high`)
  and count matching lines as `hyb_findings_count`; (11) state
  explicitly, in bold, that no branch of this section alters any
  `R-S*/R-L*/R-SEM/R-X` `passed` value or the run's `verdict`/`action`
  in this phase — adjudication is deferred to Phase 3 of
  `hybrid-code-review`; this section only populates local state
  consumed by Phase 4.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-implement.md:291,295,312-320` (budget/deadline vocabulary) and `# SOURCE: plugins/relay/agents/research-web.md:106-121` (graceful-degradation shape)
- **AC**: AC-A3 (PRD AC-3), AC-A4 (PRD AC-4), AC-A5 (PRD AC-7), AC-A6 (PRD AC-10), AC-A7 (PRD AC-11) — this task is the pass's entire safety envelope.
- **VALIDATE**: `if grep -q 'The hybrid /code-review pass (Phase 2 — evidence collection only)' plugins/relay/agents/code-reviewer.md && grep -q 'HYBRID_LEVEL_REFUSED' plugins/relay/agents/code-reviewer.md && grep -q 'SKIPPED_INSUFFICIENT_BUDGET' plugins/relay/agents/code-reviewer.md && grep -q 'READ_ONLY_VIOLATION_DETECTED' plugins/relay/agents/code-reviewer.md && grep -q 'hybrid_pass_timeout_minutes = 3' plugins/relay/agents/code-reviewer.md; then echo "PASS: hybrid pass section present with all required markers"; else echo "FAIL: hybrid pass section missing one or more required markers"; exit 1; fi`

### Task 3: UPDATE plugins/relay/agents/code-reviewer.md (Phase 4 verdict fields)

- **ACTION**: In Step 4.1's verdict JSON schema block, add a comment
  line immediately below the `"user_message": ""` line stating:
  "When `hybrid_enabled == true`, the object additionally carries
  `"hyb": 0 | 1`, `"hyb_lvl": "<hybrid_level>" | "-"`,
  `"hyb_n": <non-negative integer> | "-"`,
  `"hyb_ms": <non-negative integer> | "-"` — entirely absent when
  `hybrid_enabled == false`." Immediately below, add the field
  semantics: `"hyb"` is `1` iff the pass reached the actual `Skill`
  invocation (i.e. local state `"invoked"` from Task 2, including a
  subsequently degraded outcome), `0` for `"refused"`/`"skipped"`/
  never-attempted; `"hyb_lvl"` is `hybrid_level` when `hyb == 1`, else
  `"-"`; `"hyb_n"` is `hyb_findings_count` when the pass returned
  parseable output, else `"-"`; `"hyb_ms"` is the `Skill` call's
  measured wall-clock duration in milliseconds whenever the call was
  actually made (including an errored or degraded call), else `"-"`.
  State explicitly, in bold, that these four fields never change
  `verdict` or `action` in this phase. Add a third worked example to
  the `code-review.jsonl format` section (after the existing
  CHANGES_REQUESTED example, before the arbitration-mode example)
  showing a standard-mode APPROVED entry carrying all four `hyb_*`
  fields with representative values.
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:894-909` (verdict schema block) and `# SOURCE: plugins/relay/agents/code-reviewer.md:1115-1120` (additive-optional-field precedent)
- **AC**: AC-A2 (PRD AC-1), AC-A8 (PRD AC-8) — the closed, additive log contract this phase must not violate.
- **VALIDATE**: `if grep -q '"hyb": 0 | 1' plugins/relay/agents/code-reviewer.md && grep -q '"hyb_lvl"' plugins/relay/agents/code-reviewer.md && grep -q '"hyb_ms"' plugins/relay/agents/code-reviewer.md; then echo "PASS: Phase 4 verdict schema documents hyb_* fields"; else echo "FAIL: hyb_* fields missing from Phase 4 verdict schema"; exit 1; fi`

### Task 4: UPDATE docs/context/methodology.md

- **ACTION**: Add `hybrid_code_review_level: "medium"` to the
  frontmatter block immediately after `hybrid_code_review: false`
  (this key was added by Phase 1; see the risk note below if it is
  not yet present in the working tree). Extend the existing
  "## Hybrid Code Review" section (also added by Phase 1) with a new
  "### Level" subsection mirroring the "## Formatter" section's
  Current-state / How-to-override shape: current state `"medium"`
  (default); values restricted to `"medium"`/`"high"` — any other
  value causes `code-reviewer` to refuse the pass by name per Phase 2
  of `hybrid-code-review`; never heuristically inferred; consumed
  starting Phase 2.
- **MIRROR**: `# SOURCE: docs/context/methodology.md:80-101` ("## Formatter" shape) — this repo's own Phase-1-shipped "## Hybrid Code Review" section is the section extended, not a separate mirror source
- **AC**: AC-A1 (PRD AC-2), AC-A4 (PRD AC-4) — the declared, never-inferred source of the level value the refusal-by-name check reads.
- **VALIDATE**: `grep -q '^hybrid_code_review_level: "medium"' docs/context/methodology.md`

### Task 5: UPDATE plugins/relay/skills/context-builder/SKILL.md

- **ACTION**: Add
  `hybrid_code_review_level: "medium"   # "medium" | "high" — configured /code-review effort level for the hybrid pass; any other value (xhigh, max, ultra, etc.) is refused by name inside code-reviewer, never heuristically inferred`
  to the frontmatter template block immediately after the
  `hybrid_code_review: false` line. Add an
  "Always emit `hybrid_code_review_level: "medium"`" bullet to the
  Init behavior list (after the `hybrid_code_review` bullet),
  mirroring `formatter_cmd`'s value-string-key shape rather than a
  boolean gate's shape. Add a
  "**`hybrid_code_review_level` preservation**" bullet to the Update
  behavior list (after the `hybrid_code_review` bullet): preserve an
  already-present value untouched; if the key is entirely absent,
  backfill `hybrid_code_review_level: "medium"` — the ONLY case
  `*update` adds this key; never remove or flip an existing value;
  never infer one from any project file.
- **MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:714-721` (formatter_cmd Init bullet) and `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:776-782` (formatter_cmd Update/preservation bullet)
- **AC**: AC-A1 (PRD AC-2) — the per-project template's own declared, never-inferred contract for the new key.
- **VALIDATE**: `if grep -q 'hybrid_code_review_level: "medium"' plugins/relay/skills/context-builder/SKILL.md && grep -q 'Always emit \`hybrid_code_review_level: "medium"\`' plugins/relay/skills/context-builder/SKILL.md && grep -q '\`hybrid_code_review_level\` preservation' plugins/relay/skills/context-builder/SKILL.md; then echo "PASS: hybrid_code_review_level markers present in SKILL.md"; else echo "FAIL: hybrid_code_review_level markers missing in SKILL.md"; exit 1; fi`

### Task 6: UPDATE plugins/relay/commands/relay-implement.md

- **ACTION**: In Phase A.3's standard-mode `Task(subagent_type=
  "code-reviewer", prompt={...})` block, add one new line immediately
  after `review_started_at: <the instant captured immediately
  above>,`: `deadline_ts: <deadline_ts>,` — forwarding the wall-clock
  deadline already computed in Phase A.0
  (`deadline_ts = now() + max_implement_minutes minutes`). Do NOT add
  this field to the arbitration-mode dispatch block a few lines
  later — the hybrid pass never runs in arbitration mode (Task 2).
  Add one sentence immediately after the standard-mode dispatch block
  stating that `deadline_ts` lets `code-reviewer`'s own hybrid-pass
  budget check (when `hybrid_code_review: true`) skip the pass rather
  than risk contributing to a later `FAILED_TIME_BUDGET_EXCEEDED` on
  the loop's own next pre-flight check.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-implement.md:406-414` (the dispatch block being extended)
- **AC**: AC-A6 (PRD AC-10) — the calling side of the budget-isolation contract Task 2 depends on.
- **VALIDATE**: `set -euo pipefail
count=$(grep -c 'deadline_ts: <deadline_ts>,' plugins/relay/commands/relay-implement.md)
if [ "$count" -ne 1 ]; then echo "FAIL: expected exactly 1 occurrence of deadline_ts forwarding, found $count"; exit 1; fi
grep -B3 'deadline_ts: <deadline_ts>,' plugins/relay/commands/relay-implement.md | grep -q 'mode: "standard"'
echo "PASS: deadline_ts forwarded exactly once, in the standard-mode dispatch block"`

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```
npm run validate
```

Runs the full 24-check `scripts/validate/index.mjs` suite. Exits
non-zero if any check fails (real tool exit code, no wrapping). This
phase adds no new check and touches no file `gating-structure.mjs`
scans beyond the already-registered `hybrid_code_review` boolean site
(Phase 1), so this level also serves as a no-regression check on that
site.

**Level 2 CONTENT_INVARIANTS**

```
set -euo pipefail
grep -q 'tools: Read, Write, Glob, Grep, Bash, BashOutput, Task, Skill' plugins/relay/agents/code-reviewer.md
grep -q 'hybrid_enabled' plugins/relay/agents/code-reviewer.md
grep -q 'deadline_ts' plugins/relay/agents/code-reviewer.md
grep -q 'The hybrid /code-review pass (Phase 2 — evidence collection only)' plugins/relay/agents/code-reviewer.md
grep -q 'HYBRID_LEVEL_REFUSED' plugins/relay/agents/code-reviewer.md
grep -q 'SKIPPED_INSUFFICIENT_BUDGET' plugins/relay/agents/code-reviewer.md
grep -q 'READ_ONLY_VIOLATION_DETECTED' plugins/relay/agents/code-reviewer.md
grep -q '"hyb": 0 | 1' plugins/relay/agents/code-reviewer.md
grep -q '"hyb_lvl"' plugins/relay/agents/code-reviewer.md
grep -q '^hybrid_code_review_level: "medium"' docs/context/methodology.md
grep -q 'hybrid_code_review_level: "medium"' plugins/relay/skills/context-builder/SKILL.md
grep -q 'deadline_ts: <deadline_ts>,' plugins/relay/commands/relay-implement.md
echo "PASS: all Phase 2 markers present"
```

`set -euo pipefail` makes any single failing `grep -q` abort the whole
block with a non-zero exit before the final `echo` runs — not the
`&& echo PASS || echo FAIL` idiom that always exits 0.

**Level 3 DRY-RUN END-TO-END**

```
node --test "scripts/validate/**/*.test.mjs"
```

Re-runs the existing `node:test` corpus (including
`gating-structure.test.mjs`) to confirm this phase's edits did not
regress the already-registered `hybrid_code_review` gating site or any
other existing check. Exits non-zero on any test failure (the glob
form, per the documented `node --test <dir>` `MODULE_NOT_FOUND`
gotcha).

## Acceptance Criteria

- **AC-A1 (PRD AC-2):** Given the target project declares
  `hybrid_code_review: true`, when `code-reviewer` runs in standard
  mode, then exactly one `/code-review` pass is attempted, configured
  by the declared `hybrid_code_review_level` value — never inferred
  from a mention of `/code-review` in a PRD, plan, or diff.
- **AC-A2 (PRD AC-1):** Given `hybrid_code_review` is absent or
  `false`, when `code-reviewer` runs, then no `Skill` invocation
  occurs, no `hyb`/`hyb_lvl`/`hyb_n`/`hyb_ms` field is added to the
  verdict object, and every `R-S*/R-L*/R-SEM/R-X`/`R-COH-*` row and
  the `rubric[]` array shape are byte-identical to today's.
- **AC-A3 (PRD AC-3):** Given the reviewer runs against `target_root`,
  when it invokes the pass, then the `Skill` call's arguments contain
  `<target_root>` verbatim, so the review targets that tree and not
  the session's primary working directory.
- **AC-A4 (PRD AC-4):** Given a configured `hybrid_code_review_level`
  of anything other than exactly `medium` or `high` (including
  `xhigh`, `max`, `ultra`), when the reviewer resolves the pass
  configuration, then the pass is refused with `HYBRID_LEVEL_REFUSED`
  / `refused_level:<value>` and never invoked; and `--fix`/`--comment`
  are never constructed in the invocation args under any
  configuration.
- **AC-A5 (PRD AC-7):** Given the pass errors, returns unparseable
  output, or exceeds its own timeout, when the reviewer continues,
  then it records one of `SKILL_UNAVAILABLE`/`SKILL_ERROR:<message>`/
  `UNPARSEABLE_OUTPUT`/`TIMEOUT_EXCEEDED`, the standard rubric verdict
  proceeds unaffected, and the run never halts and never prompts the
  operator.
- **AC-A6 (PRD AC-10):** Given the pass runs, when the loop accounts
  for time, then the pass's duration is tracked separately from and
  never decrements `max_implement_retries`; and given `deadline_ts`
  (forwarded from `/relay-implement`) shows less than
  `hybrid_pass_timeout_minutes` of remaining budget, then the pass is
  skipped with `SKIPPED_INSUFFICIENT_BUDGET` rather than overrunning
  it.
- **AC-A7 (PRD AC-11):** Given the pass runs, when it returns, then
  `git status --porcelain` on the target tree, captured immediately
  before and immediately after the `Skill` call, is byte-identical; a
  mismatch is recorded as `READ_ONLY_VIOLATION_DETECTED` and the
  pass's findings are discarded rather than trusted.
- **AC-A8 (PRD AC-8):** Given a verdict written with the pass active,
  when `usage-metrics.mjs` and `scripts/efficiency.mjs` read the line,
  then both parse it without error, and every new value (`hyb`,
  `hyb_lvl`, `hyb_n`, `hyb_ms`) is `0`/`1`, a code, a non-negative
  integer, or `-` — no free-text column is introduced.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phase 1's shipped changes (`hybrid_code_review` key, the `class` field slot, the `hyb_*` schema declarations) are not yet present in the working tree this plan is implemented against — the tree this plan was authored against still lacks them | H | M | Task 4/5's insertion anchors (`hybrid_code_review: false`, the "## Hybrid Code Review" section) are Phase 1 deliverables; this plan's `Depends: 1` and the source PRD's own dependency-satisfying gate (`implemented`/`tested`/`complete`) exist precisely so Phase 1's diff is reconciled into the implementation tree before Phase 2 starts — if the anchor text is missing, that is a precondition failure to surface, not a gap for this plan's tasks to silently paper over |
| The free-text `/code-review` output is misparsed into a wrong `hyb_findings_count` (the `file:line — description` shape is a documented convention, not a guaranteed contract, per `report.md` §1) | M | L | the count is advisory-only and influences nothing in this phase (`verdict`/`action`/any rubric row are untouched); Phase 3 defines the real adjudication contract and can re-derive or ignore the count as needed |
| The fixed 3-minute internal pass timeout is miscalibrated against the measured 43-133s range at `high` and the wider `medium` range | M | L | the value is documented as a fixed internal constant, not project-configurable, and explicitly revisable; Phase 5's dogfood measurement is where a data-driven adjustment belongs |
| `deadline_ts` forwarding leaks into the arbitration-mode dispatch, letting the pass run somewhere it should never run | L | M | Task 2's own gating states standard-mode-only explicitly, and Task 6's VALIDATE asserts the field appears exactly once in the file, in the standard-mode block only |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
by the Implementer — R-X is a blanket straight-fail on any test glob in
the Implementer's diff. No task above and no `## Files to Change` row
targets a test file (`scripts/validate/checks/gating-structure.test.mjs`
is re-run by Level 3 but never edited by any task), so this plan's
`**VALIDATE**` commands exercise the change directly rather than
invoking the test framework for new coverage.

**On the working-tree gap flagged in the Risks table.** This plan was
authored per the calling command's explicit instruction to treat
Phase 1's shipped state (verified in a sibling worktree,
`C:/repos/PRPs-agentic-eng/.worktrees/hybrid-code-review`) as this
phase's grounding baseline, even though the implementation `target_root`
this plan was written against does not yet contain that diff. Every
`# SOURCE:` anchor in `## Patterns to Mirror` and every insertion point
named in `## Step-by-Step Tasks` was verified against that shipped
state. If Phase 1's diff has not been reconciled into the tree by the
time this plan is implemented, Task 4 and Task 5's insertion anchors
will not exist yet — the correct response is to reconcile Phase 1's
changes first (they are this phase's hard `Depends`), not to
improvise a different insertion point.

**On `hybrid_code_review_level` needing no `gating-structure.mjs`
entry.** Confirmed against that file's own boundary comment (lines
32-38): a declared value-string key (`formatter_cmd`'s precedent)
follows the emit/preserve/backfill discipline via prose alone, the
same way `formatter_cmd` does — only boolean opt-in track-gates
(`figma_track`, `visual_first_approval`, `lane_runtime_safe`,
`hybrid_code_review`) get a `SITES` entry.

**Why the 3-minute pass timeout is fixed, not project-configurable.**
The Phase 1 plan and this one both treat `hybrid_code_review_level` as
the only project-declared knob; a per-project timeout would be a
second knob this phase's PRD scope never asked for (`## NOT Building`:
"No findings cap, no reachability-confirmation logic" — the same
minimal-surface principle extends to the timeout). `3` minutes is
derived from the measured `high` range (43-133s) plus headroom, and is
explicitly documented as revisable rather than tuned per project.

*Generated: 2026-09-23*
*Approved: 2026-09-23*
*Status: IMPLEMENTED*
