# Feature: `/relay-code-review` command (Phase 4 of implementation-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a new command file consumed by hand-invoked review of an existing implementation diff); fourth phase of implementation-authoring; depends on Phase 2 (code-reviewer agent — complete); structurally a sibling of /relay-implement (Phase 3 — complete) but single-shot rather than internal-loop
- Decisions found:
  - [2026-04-19] Command surface — writer/reviewer split: `/relay-code-review` is the standalone reviewer surface; `/relay-implement` (Phase 3) is the writer-only command with internal loop. Both single-role per the 2026-04-19 decision.
  - [2026-04-19] PRP artifacts under `PRPs/`, never `.claude/` — code-review.jsonl appended at `PRPs/plans/<basename>.code-review.jsonl`; no other on-disk artifacts (single-shot, no per-attempt diff.patch).
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — `/relay-code-review` runs with no user dialogue; surfaces verdict and exits.
  - [2026-04-19] Keep upstream `prp-core` as reference, not active relay code.
  - Source PRD `PRPs/prds/implementation-authoring.prd.md` — D1 (writer/reviewer split), D5 (granularity: standalone surface for hand-invoked review), D8 (mutations are /relay-implement-only — /relay-code-review does NOT perform them), D11 (code-reviewer tool allowlist; no Edit on agent), AC-10 (rubric items recorded on every run, no short-circuit), AC-12 (single-shot dispatch; no internal loop; no D8 mutations).
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — `docs/anti-patterns.md` lines 60–66.
  - Bundling writer + reviewer into one command — the 2026-04-19 split applies; this command is reviewer-only.
  - Auto-flipping plan status from a standalone reviewer — diverges from `/relay-plan-review` which DOES auto-flip; D5 + D8 + AC-12 together establish the rationale.
  - Treating `plugins/prp-core/` as active relay code.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — third writer/reviewer pair's standalone reviewer surface.
  - Interactivity boundary — autonomous from PRD-APPROVED onward.
  - PRPs/ artifact path convention.
  - Writer/reviewer split — `/relay-code-review` is reviewer-only, single-shot.
  - Graceful degradation — no concurrency state to corrupt (no D8 mutations); the standalone reviewer is naturally re-runnable.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/implementation-authoring.prd.md` — Implementation Phases row 4: "`/relay-code-review` command" — Goal: Public command surface for the reviewer (standalone, hand-invoked). Success signal: `/relay-code-review PRPs/plans/<basename>.plan.md` against a hand-edited diff either reports APPROVED (with jsonl entry) or reports the rubric defect list (with jsonl entry), never blocks on user input, never mutates the plan or PRD.

## Summary

Build `plugins/relay/commands/relay-code-review.md` — a single markdown file with YAML frontmatter that dispatches the already-shipped `code-reviewer` agent (Phase 2 of source PRD, color: magenta) in `standard` mode exactly once against a working-tree diff, appends one verdict to `PRPs/plans/<basename>.code-review.jsonl`, and surfaces APPROVED or CHANGES_REQUESTED to the caller. The command is single-shot (no internal loop), single-role (reviewer-only per D1), and **does NOT perform any D8 mutations** — those are `/relay-implement`'s exclusive responsibility per source PRD AC-12 and D5+D8. The structural precedent is `plugins/relay/commands/relay-plan-review.md` (single-shot reviewer command shape) with the canonical divergence that auto-flip-on-rubric-pass is **disabled**: this reviewer surfaces the verdict and exits without mutating any artifact's status. The architectural rationale is the writer/reviewer split + the orchestrator-owned-mutations principle: `/relay-implement`'s internal loop dispatches the same `code-reviewer` agent and DOES trigger D8 on APPROVED; the standalone `/relay-code-review` is for hand-invoked review where no automated state transition is desired (the developer hand-edited the implementation and wants the rubric verdict, full stop). The closest external precedent is Cloudflare's AI code review architecture (sub-reviewers emit findings; a separate coordinator alone mutates GitLab state) and GitHub's `Comment` PR review type (verdict without approval signal).

## User Story

As a relay developer who has hand-edited code in the worktree against an APPROVED or IMPLEMENTED plan, I want a single command that runs the same 8-item rubric (R-S1/R-S2/R-S3/R-L1/R-L2/R-L3/R-SEM/R-X plus R-COH-* additive) the autonomous `/relay-implement` loop uses internally, surfaces APPROVED or CHANGES_REQUESTED, appends one audit-log line to `code-review.jsonl`, and exits — without touching plan status, without re-running `/relay-implement`'s D8 mutations, and without prompting me — so that I can sanity-check a manual edit, get rubric feedback on a partial implementation, or re-validate an IMPLEMENTED plan after a hand-edit, all without triggering downstream state changes.

## Problem Statement

Source PRD's Phase 1 (`implementer` agent), Phase 2 (`code-reviewer` agent), and Phase 3 (`/relay-implement` command) are complete; the autonomous orchestrator path is fully functional end-to-end. But the standalone reviewer surface — for hand-invoked review of a working-tree diff against a plan, **without** triggering the internal loop or D8 mutations — does not yet exist. Without `/relay-code-review`, a developer who edited code by hand cannot get the same rubric verdict without invoking `/relay-implement` (which would attempt the full writer↔reviewer loop, capture per-attempt diffs, and on APPROVED perform the three D8 mutations — all overkill when the developer just wants a rubric check). This blocks the documented escape hatch for re-reviewing IMPLEMENTED plans after manual hand-edits and forces the developer to invoke a heavyweight autonomous command for what is conceptually a read-only inspection.

## Solution Statement

Create `plugins/relay/commands/relay-code-review.md` mirroring the shape of `plugins/relay/commands/relay-plan-review.md` (the canonical single-shot reviewer command precedent), with three deliberate divergences:

1. **No auto-flip on rubric pass.** Unlike `/relay-plan-review` which performs a two-line `Edit` to flip `*Status: DRAFT*` → `*Status: APPROVED*`, `/relay-code-review` surfaces the verdict and exits. The code-reviewer agent's hard constraint (no D8 mutations from agent layer) and source PRD D8 (mutations are COMMAND-owned, specifically `/relay-implement`'s) together forbid this command from mutating plan status.
2. **Diff-input reviewer.** Unlike `/relay-plan-review` (which reviews a plan markdown file), `/relay-code-review` reviews a working-tree code diff against a base-commit. The base-commit derivation reuses the canonical four-step fallback chain shipped in `/relay-implement` Precondition P5.
3. **Plan status precondition allows both `APPROVED` and `IMPLEMENTED`.** `/relay-plan-review` requires `*Status: DRAFT*`; `/relay-implement` requires `*Status: APPROVED*`; `/relay-code-review` accepts either `APPROVED` (mid-implementation review) or `IMPLEMENTED` (re-review of a completed implementation after hand-edit). This is the natural set of states where a developer would want the rubric verdict on a working-tree diff.

The command's Phase A is a single-shot code-reviewer dispatch via `Task(subagent_type='code-reviewer', prompt={plan_path, target_root, mode: 'standard', attempt: 1, diff_target: <base_commit>})`. The agent appends its verdict to `PRPs/plans/<basename>.code-review.jsonl` per its own protocol; the command parses the just-appended line and surfaces the verdict to the caller. There is no internal loop, no per-attempt diff.patch artifact, no `halt.json`, no D8 mutations, no oscillation detection, no budget envelope. The simplicity is the value-add: this is the read-only counterpart to `/relay-implement`'s mutation-triggering autonomous loop.

## Metadata

| Field | Value |
|-------|-------|
| Type | Command file (markdown + YAML frontmatter) |
| Complexity | Low — structurally the simplest of the implementation-authoring command/agent files; no internal loop, no D8 mutations, no per-attempt artifacts, no budgets |
| Systems Affected | Relay developer (primary user; hand-invokes the command); future `/relay-execute` orchestrator (does NOT consume `/relay-code-review` — uses the internal code-reviewer dispatch in `/relay-implement` instead); `code-reviewer` agent (dispatched via Task once per invocation) |
| Dependencies | Phase 2 code-reviewer agent (complete) |
| Estimated Tasks | 5 atomic tasks |
| Source PRD line ref | `PRPs/prds/implementation-authoring.prd.md` Implementation Phases row 4 (around line 261); AC-12 (around line 106); User Flow §"Standalone /relay-code-review flow" (around lines 197–203) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| HIGH | `plugins/relay/commands/relay-plan-review.md` | 1–248 | Canonical single-shot reviewer command shape — frontmatter, command-level Decision Gate, three-precondition pattern with verbatim HALT messages, "Phase A — Adopt the Reviewer role" (single Task dispatch, no loop), Final output / Constraints / What you do NOT do sections. The "Never re-run the Reviewer in a loop" prose at line 247 is the exact discipline `/relay-code-review` adopts. |
| HIGH | `plugins/relay/commands/relay-test-review.md` | 60–130 | Precedent for "reviewer that operates on a worktree diff" + "verdict-without-artifact-status-mutation" — the only shipped relay command with both properties. The diff-input contract and the no-mutation behaviour both transfer to `/relay-code-review`. |
| HIGH | `plugins/relay/commands/relay-implement.md` | 152–169 | Just-shipped Precondition P5 — the canonical base-commit derivation pattern (four-step fallback chain: --base flag → `git symbolic-ref refs/remotes/origin/HEAD` → `git remote show origin` → literal `main`). Reuse verbatim in `/relay-code-review`. |
| HIGH | `plugins/relay/agents/code-reviewer.md` | 49–75 | Code-reviewer agent input contract for `mode: 'standard'` — `plan_path`, `target_root`, `mode`, `attempt`, `diff_target`. For standalone use: `attempt: 1` (per the gap surfaced in grounding — code-reviewer.md line 65 requires integer ≥ 1; the natural value for first-and-only is 1). |
| HIGH | `plugins/relay/agents/code-reviewer.md` | 131–137 | Hard constraint: APPROVED never triggers D8 mutations from the agent layer; the COMMAND owns those. For `/relay-code-review` specifically, the COMMAND also does NOT perform them — that is `/relay-implement`'s exclusive responsibility per source PRD AC-12 + D5 + D8. |
| HIGH | `PRPs/prds/implementation-authoring.prd.md` | (whole) | Source PRD; especially AC-12 (single-shot, no D8), D5 (granularity), D8 (mutations are /relay-implement-only), D11 (code-reviewer tool allowlist), User Flow §"Standalone /relay-code-review flow" lines 197–203. |
| MEDIUM | `PRPs/plans/completed/implementation-authoring-phase-3-relay-implement-command.plan.md` | (whole) | Just-shipped sibling plan for `/relay-implement` — the writer-loop command. Useful for cross-checking divergences (Phase 4 has none of: internal loop, per-attempt diff.patch, oscillation, budget envelope, dispute cap, D8 mutations). |
| MEDIUM | `docs/decisions.md` | 188–246 | Command surface decision (2026-04-19) — `/relay-code-review` is one of the 12 canonical commands (row 8 in the table). |
| MEDIUM | `docs/anti-patterns.md` | 60–66 | "Writing pipeline artifacts under `.claude/`" — universal anti-pattern enforced by the `code-reviewer` agent at the agent level + by this command at the command level. |
| LOW | https://blog.cloudflare.com/ai-code-review/ | — | External architectural precedent: sub-reviewers emit findings; a separate coordinator alone mutates state. Maps to relay's split: code-reviewer agent (read-only) → `/relay-implement` coordinator (mutates plan/PRD) and `/relay-code-review` standalone (no mutations). |

## Patterns to Mirror

### Single-shot reviewer command shape (frontmatter through What-you-do-NOT-do)

# SOURCE: plugins/relay/commands/relay-plan-review.md:1-248
```
---
description: Single-shot review of a DRAFT plan against the 8-item structural rubric...
argument-hint: <plan-path>
---

# /relay-plan-review

**Arguments:** `$ARGUMENTS`

---

## Your mission

...

---

## Decision Gate (before any action)
## Parse arguments
## Preconditions
## Phase A — Adopt the Reviewer role
## Final output surface
## Constraints (hard rules)
## What you do NOT do
```

Used by Task 1 (frontmatter + outer skeleton): the relay-code-review file's 8-section structure mirrors this byte-for-byte.

### Three-precondition pattern with verbatim HALT messages

# SOURCE: plugins/relay/commands/relay-plan-review.md:75-133
```
### P1 — Plan path resolves to a readable file

If <plan_path> does not point at an existing readable file:

> I cannot start plan review without `<plan_path>`. ...

### P2 — Plan ends with `*Status: DRAFT*`

[for /relay-plan-review specifically]

### P3 — Decision Gate sources readable

[the canonical AC-14 message verbatim]
```

Used by Task 3 (Parse arguments + 5 Preconditions): the relay-code-review variant has 5 preconditions (P1 plan readable, P2 plan APPROVED OR IMPLEMENTED, P3 worktree has diff vs base, P4 Decision Gate sources, P5 base-commit derivable) — extending the three-precondition pattern with the diff-input + base-commit checks needed for a code-diff reviewer.

### "There is no Phase B" — single-shot discipline

# SOURCE: plugins/relay/commands/relay-plan-review.md:185-248
```
There is no Phase B. CHANGES_REQUESTED is terminal for this invocation.
The orchestrator (or developer) decides next steps.

Never re-run the Reviewer in a loop. A single /relay-plan-review
invocation produces exactly one verdict (APPROVED or CHANGES_REQUESTED)
and exits.
```

Used by Task 4 (Phase A — single-shot code-reviewer dispatch): identical discipline applies; the prose can be lifted nearly verbatim with `code-reviewer` substituted for `plan-reviewer` and the additional clause "and never performs the D8 post-approval mutations — those are `/relay-implement`'s exclusive responsibility".

### Canonical base-commit derivation chain

# SOURCE: plugins/relay/commands/relay-implement.md:152-169
```
1. If $ARGUMENTS contained --base <branch>, extract that value.
2. Otherwise: git symbolic-ref refs/remotes/origin/HEAD ...
3. Fallback: git remote show origin | grep 'HEAD branch' ...
4. Last resort: main.

Record base_branch. Then compute base_commit = git merge-base HEAD <base_branch>.
```

Used by Task 3 (Precondition P5 — base-commit derivable): identical four-step fallback chain. Same HALT message on `git merge-base` failure.

### Code-reviewer agent input contract for standard mode

# SOURCE: plugins/relay/agents/code-reviewer.md:49-75
```
Inputs:
- plan_path: absolute path to the plan markdown file (status APPROVED or IMPLEMENTED)
- target_root: absolute path to the target project's root
- mode: "standard" | "arbitration"
- attempt: integer ≥ 1
- dispute_payload?: the implementer's TEST_CONTRACT_DISPUTE evidence (arbitration only)
- diff_target: the base commit hash against which the working-tree diff is computed
```

Used by Task 4 (Phase A code-reviewer dispatch): the prompt structure is fixed by the agent; the standalone command passes `mode: 'standard'`, `attempt: 1` (sentinel — first-and-only invocation; resolves the gap surfaced in grounding), and the derived `base_commit` as `diff_target`.

### Hard constraint — agent does NOT perform D8 mutations

# SOURCE: plugins/relay/agents/code-reviewer.md:131-137
```
APPROVED never triggers D8 mutations from this agent. The COMMAND
(/relay-implement or /relay-code-review) is the one that performs
the D8 flip — and only /relay-implement actually does so. The
standalone /relay-code-review surface explicitly does NOT mutate
plan status; surfaces verdict and exits.
```

Used by Task 5 (Final output + Constraints + What you do NOT do): the constraint is restated at command level so the discipline is visible from both the agent file and the command file. The command's Constraints section will include "Never auto-flip plan status. Never perform any D8 mutation" as the central architectural divergence from `/relay-plan-review`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-code-review.md` | CREATE | The phase deliverable — the new standalone reviewer command file. Single-file create; no other source files modified by this plan. |

## NOT Building (Scope Limits)

- **Auto-flip plan status on APPROVED rubric** — D5+D8+AC-12 establish that `/relay-code-review` surfaces verdict and exits without mutating any artifact's status. This is the canonical divergence from `/relay-plan-review` (which DOES auto-flip).
- **Internal writer↔reviewer loop** — single-shot dispatch only; one Task call, one jsonl entry, exit. The internal loop lives in `/relay-implement`.
- **Per-attempt `diff.patch` artifact** — AC-12 does not require it; the code-review.jsonl line itself is the audit trail. Skipping the diff.patch keeps the command lighter and reflects the read-only nature of the review.
- **D8 post-approval mutations** — exclusively `/relay-implement`'s responsibility per source PRD AC-12 + D5 + D8.
- **Budget envelope (`max_implement_*`)** — single-shot; no retries, no wall-clock budget needed.
- **Oscillation detection** — single-shot; no prior attempts to compare against.
- **Dispute cap / arbitration mode dispatch** — `/relay-code-review` runs `code-reviewer` exclusively in `mode: 'standard'`. If the developer wants to test the arbitration path, they invoke `/relay-implement` (which dispatches in `mode: 'arbitration'` when the implementer emits `TEST_CONTRACT_DISPUTE`).
- **Re-grounding via research subagents** — code-reviewer has no `Task` tool per D11; the plan is the source of truth.
- **Concurrency soft-fail diagnostic** — single-shot, no D8 mutations to race on; the standalone surface is naturally re-runnable. The plan's Notes section documents this design choice explicitly.
- **`--mode arbitration` flag** — the standalone surface is exclusively `mode: 'standard'`. Arbitration is a code-reviewer mode reachable only through `/relay-implement`'s internal dispatch on TEST_CONTRACT_DISPUTE.
- **`--strict` flag re-introducing a manual confirmation gate** — past the interactivity boundary; the standalone command is naturally non-blocking.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/commands/relay-code-review.md` frontmatter + outer skeleton

**ACTION**: Create the file. Write the YAML frontmatter (`description: 'Single-shot standalone code review...'` — single-quoted to allow `:` in literals like `*Status: APPROVED*`, lesson learned from `/relay-implement` Phase 3 inline fix; `argument-hint: <plan-path>`). Write the top-level title `# /relay-code-review` and the eight canonical section headings: `## Your mission`, `## Decision Gate (before any action)`, `## Parse arguments`, `## Preconditions`, `## Phase A — Adopt the Reviewer role`, `## Final output surface`, `## Constraints (hard rules)`, `## What you do NOT do`. Leave each section body empty for now.

**MIRROR**: `plugins/relay/commands/relay-plan-review.md:1-248` (canonical single-shot reviewer shape); the YAML-quoting lesson from `plugins/relay/commands/relay-implement.md:1-2` (single-quote the description to handle `:` inside).

**VALIDATE**: `grep -c "^## " plugins/relay/commands/relay-code-review.md` returns 8 (the eight canonical `##`-level sections) AND `head -5 plugins/relay/commands/relay-code-review.md | grep -c "^description: '" ` returns 1 (frontmatter description is single-quoted).

### Task 2: WRITE `## Your mission` and `## Decision Gate (before any action)` section bodies

**ACTION**: Within `## Your mission`, write a paragraph explaining what the command does (single-shot dispatch of `code-reviewer` agent in `standard` mode against a working-tree diff; appends one verdict to `code-review.jsonl`; surfaces APPROVED or CHANGES_REQUESTED; **does NOT auto-flip plan status; does NOT perform any D8 mutations**). Include the explicit "this command is read-only with respect to artifact status; mutation-triggering review goes through `/relay-implement`'s internal loop" framing. Include the `See:` references list pointing at: `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/implementation-authoring.prd.md`, `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/code-reviewer.md`, `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan-review.md`, `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-implement.md`. Within `## Decision Gate (before any action)`, write the instruction to consult `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` and emit the canonical six-line fenced block with the activated criteria specific to `/relay-code-review` (cross-cutting artifact creation; new command file; standalone reviewer surface; references source PRD D5 + D8 + D11 + AC-12). Include the canonical six-line block as a literal example.

**MIRROR**: `plugins/relay/commands/relay-plan-review.md:30-72` (Your mission + Decision Gate prose); `plugins/relay/agents/implementer.md:518-530` (six-line block shape).

**VALIDATE**: `grep -c "^- Active context:" plugins/relay/commands/relay-code-review.md` returns 1 (exactly one Decision Gate template instance) AND `grep -c "does NOT.*D8 mutation\|does NOT auto-flip" plugins/relay/commands/relay-code-review.md` returns ≥2 (the no-mutation invariant is stated at least twice — once in Your mission and once in Constraints later).

### Task 3: WRITE `## Parse arguments` and `## Preconditions` section bodies

**ACTION**: In `## Parse arguments`, define `$ARGUMENTS` as a single non-empty path-like string (the plan path); resolve as absolute or relative to cwd; HALT with usage message on blank/whitespace; record `plan_path` and `target_root`. Note that the plan path may resolve to either `PRPs/plans/<basename>.plan.md` (APPROVED, mid-implementation review) or `PRPs/plans/completed/<basename>.plan.md` (IMPLEMENTED, post-implementation re-review).

In `## Preconditions`, write five preconditions, each as a `### P<N>` subsection with a verbatim HALT message:

- **P1** — Plan path resolves to a readable file (canonical file-not-readable HALT).
- **P2** — Plan ends with `*Status: APPROVED*` OR `*Status: IMPLEMENTED*` (last non-empty line equals exactly one of those strings; trim trailing whitespace before comparison; HALT names the actual status found and lists the two acceptable values).
- **P3** — Working tree has a diff against base (run `git diff --quiet HEAD <base_commit>`; non-zero exit means there ARE differences → proceed; zero exit means no diff → HALT with "No working-tree diff against `<base_commit>`. /relay-code-review reviews an existing implementation diff; if you have not edited any code yet, there is nothing to review.").
- **P4** — Decision Gate sources readable — emit the byte-exact AC-14 message (substituting `/relay-code-review` for `/relay-implement`).
- **P5** — Base-commit derivable — reuse the canonical four-step fallback chain shipped in `/relay-implement` P5: (1) `--base <branch>` argument; (2) `git symbolic-ref refs/remotes/origin/HEAD`; (3) `git remote show origin | grep 'HEAD branch'`; (4) literal `main`. Then `base_commit = git merge-base HEAD <base_branch>`. HALT on `git merge-base` failure with the same diagnostic prose as `/relay-implement`.

Note: P5 is run BEFORE P3 in the actual control flow, since P3 needs `<base_commit>` to compute the diff. The numbering is for documentation order; the implementation order is P1 → P2 → P5 → P3 → P4.

**MIRROR**: `plugins/relay/commands/relay-plan-review.md:75-133` (precondition pattern with verbatim HALT messages); `plugins/relay/commands/relay-implement.md:152-169` (P5 base-commit chain).

**VALIDATE**: `grep -c "^### P[1-5] —" plugins/relay/commands/relay-code-review.md` returns 5 (five preconditions) AND `grep -c "APPROVED\|IMPLEMENTED" plugins/relay/commands/relay-code-review.md` returns ≥2 (P2 names both acceptable statuses).

### Task 4: WRITE `## Phase A — Adopt the Reviewer role` (single-shot dispatch + verdict surfacing)

**ACTION**: Write Phase A as a single-shot dispatch (no sub-phases A.0/A.1/A.2/A.3 — just one flow):

1. **Compute `<basename>`** from the plan filename (basename minus `.plan.md`).
2. **Dispatch `code-reviewer`** via `Task`:
   ```
   Task(subagent_type="code-reviewer",
        prompt={
          plan_path: <plan_path>,
          target_root: <target_root>,
          mode: "standard",
          attempt: 1,
          diff_target: <base_commit>,
        })
   ```
   The agent reads the plan + the working-tree diff against `base_commit`, runs the 8-item rubric (R-S1, R-S2, R-S3, R-L1, R-L2, R-L3, R-SEM, R-X plus R-COH-* additive), and appends one verdict line to `PRPs/plans/<basename>.code-review.jsonl` itself per its protocol (D11 — code-reviewer is the writer of its own audit log). All 8 (or 8+ with R-COH-*) rubric items are recorded in the verdict line per AC-10 (no short-circuit).
3. **Read the just-appended jsonl line.** Parse the `verdict` field:
   - `APPROVED` → emit the success summary (Final output surface) and exit.
   - `CHANGES_REQUESTED` → emit the bullet list of failing rubric items by ID + reason (Final output surface) and exit.
4. **Do NOT perform any D8 mutation.** No `Edit` on the plan trailing block. No `mv` to `PRPs/plans/completed/`. No `Edit` on the source PRD's row N. The plan file at `<plan_path>` is left byte-identical to the state it was in when the command started.

Add a "There is no Phase B" prose paragraph mirroring `relay-plan-review.md:185-200` but with the additional clause "and never performs the D8 post-approval mutations — those are `/relay-implement`'s exclusive responsibility per source PRD AC-12 + D5 + D8".

**MIRROR**: `plugins/relay/commands/relay-plan-review.md:135-200` (Phase A — Adopt the Reviewer role; "There is no Phase B" prose); `plugins/relay/agents/code-reviewer.md:49-75,131-137` (input contract + no-D8-from-agent constraint).

**VALIDATE**: `grep -c "^## Phase A" plugins/relay/commands/relay-code-review.md` returns 1 AND `grep -c "There is no Phase B" plugins/relay/commands/relay-code-review.md` returns 1 AND `grep -c "subagent_type=.code-reviewer." plugins/relay/commands/relay-code-review.md` returns ≥1 AND `grep -c "mode.*standard" plugins/relay/commands/relay-code-review.md` returns ≥1.

### Task 5: WRITE `## Final output surface` + `## Constraints (hard rules)` + `## What you do NOT do` section bodies

**ACTION**: In `## Final output surface`, define two output paths:

- **APPROVED path** — emit verbatim (per AC-12):
  > ✅ Code review **APPROVED** at `PRPs/plans/<basename>.code-review.jsonl` (line `<line_index>`).
  > Plan: `<plan_path>` (status unchanged at `<APPROVED|IMPLEMENTED>`).
  > Diff reviewed against `<base_commit>`.
  > No mutations performed (use `/relay-implement` to drive plan status to IMPLEMENTED).

- **CHANGES_REQUESTED path** — emit verbatim:
  > ❌ Code review **CHANGES_REQUESTED** at `PRPs/plans/<basename>.code-review.jsonl` (line `<line_index>`).
  > Failing rubric items:
  > - **<R-ID>** — <reason>
  > - **<R-ID>** — <reason>
  > - ...
  > Plan: `<plan_path>` (status unchanged at `<APPROVED|IMPLEMENTED>`).
  > Diff reviewed against `<base_commit>`.
  > No mutations performed. Resolve the rubric defects and re-run /relay-code-review, or invoke /relay-implement to drive the autonomous loop with retries.

In `## Constraints (hard rules)`, list the canonical seven invariants — adapted from `/relay-plan-review` and stripped of plan-status-flip language:

1. **Never write anything under `.claude/`.** The only on-disk write is the code-reviewer agent's append to `PRPs/plans/<basename>.code-review.jsonl`. Nothing else. The agent enforces this at the agent level; this command is the first guard.
2. **Never auto-flip plan status.** The plan trailing block is read-only from this command. Both `*Status: APPROVED*` and `*Status: IMPLEMENTED*` cases are left untouched. This is the canonical divergence from `/relay-plan-review` (which DOES auto-flip DRAFT → APPROVED).
3. **Never perform any D8 mutation.** No plan trailing-block edit. No plan move to `PRPs/plans/completed/`. No source PRD row N edit. D8 mutations are exclusively `/relay-implement`'s responsibility per source PRD AC-12 + D5 + D8.
4. **Never re-run the Reviewer in a loop.** Single Task dispatch per command invocation. The internal loop lives in `/relay-implement`; this standalone command produces exactly one verdict and exits.
5. **Never adopt the Writer role.** This is reviewer-only per D1. The implementer is dispatched by `/relay-implement`, not by this command.
6. **Never prompt the user.** Past the interactivity boundary.
7. **Never skip the Decision Gate evidence block.** The command-level gate is mandatory; the code-reviewer agent emits its own gate inside its dispatch payload.

In `## What you do NOT do`, list scope limits:

- **Mutating plan status** — see Constraints #2.
- **Performing D8 mutations** — see Constraints #3.
- **Running an internal loop** — single-shot only.
- **Dispatching `code-reviewer` in arbitration mode** — `/relay-code-review` is exclusively `mode: 'standard'`. Arbitration is reachable only through `/relay-implement`'s internal dispatch on `TEST_CONTRACT_DISPUTE`.
- **Reviewing a plan whose trailing status is `DRAFT`** — that is `/relay-plan-review`'s job (and operates on a different artifact: the plan markdown itself, not a working-tree code diff).
- **Reviewing a `worktree-only diff with no plan context`** — the plan path argument is mandatory; the plan provides the rubric's structural inputs (Step-by-Step Tasks, Files to Change, Acceptance Criteria) per `code-reviewer` agent's contract.
- **Reopening or modifying an IMPLEMENTED plan via tooling** — manual hand-edit (flip status back to APPROVED + move from `PRPs/plans/completed/` back) is the documented escape hatch; `/relay-code-review` does not perform this for the developer.
- **Cross-PRD planning / cross-plan orchestration** — single plan per invocation.

**MIRROR**: `plugins/relay/commands/relay-plan-review.md:200-248` (Final output + Constraints + What you do NOT do shape); `plugins/relay/commands/relay-implement.md` Constraints + What-you-do-NOT-do sections (just-shipped sibling).

**VALIDATE**: `grep -c "^## " plugins/relay/commands/relay-code-review.md` returns 8 (no accidental section additions/removals) AND `grep -c "Never auto-flip\|Never perform any D8 mutation\|Never re-run the Reviewer in a loop" plugins/relay/commands/relay-code-review.md` returns ≥3 (the three central constraints are stated explicitly) AND `grep -c "status unchanged" plugins/relay/commands/relay-code-review.md` returns ≥2 (both Final output paths state the no-mutation invariant).

## Validation Commands

### Level 1 — STATIC_ANALYSIS

- Markdown structure check: `grep -E "^(##|###) " plugins/relay/commands/relay-code-review.md | wc -l` returns ≥13 (8 `##` sections + 5 `### P` precondition sub-sections at minimum).
- YAML frontmatter parses: extract the frontmatter block (between first two `---` lines) and parse as YAML. The frontmatter must contain `description` (non-empty, single-quoted in source) and `argument-hint` (non-empty).
- Markdown lint (best-effort; skip if no markdownlint available): `npx --no-install markdownlint plugins/relay/commands/relay-code-review.md 2>/dev/null || true`.

### Level 2 — CONTENT_INVARIANTS

- All eight canonical `##` sections present:
  `grep -cE "^## (Your mission|Decision Gate|Parse arguments|Preconditions|Phase A|Final output|Constraints|What you do NOT do)" plugins/relay/commands/relay-code-review.md` returns 8.
- Five preconditions present:
  `grep -c "^### P[1-5] —" plugins/relay/commands/relay-code-review.md` returns 5.
- The no-mutation invariants are explicit in at least three sections (Your mission, Constraints, What you do NOT do):
  `grep -c "does NOT auto-flip\|Never auto-flip\|status unchanged" plugins/relay/commands/relay-code-review.md` returns ≥3.
- Single-shot discipline stated:
  `grep -c "There is no Phase B\|Single Task dispatch\|single-shot" plugins/relay/commands/relay-code-review.md` returns ≥2.
- Code-reviewer agent dispatch with mode='standard' and attempt=1:
  `grep -E "subagent_type=.code-reviewer." plugins/relay/commands/relay-code-review.md` matches once.
  `grep -c "mode.*standard\|attempt.*1" plugins/relay/commands/relay-code-review.md` returns ≥2.
- No `.claude/PRPs/` write target (contrastive references in quoted prohibitions are allowed):
  `grep -E "(Write|Edit)\(.*\.claude/PRPs" plugins/relay/commands/relay-code-review.md` returns nothing.
- Plan status precondition accepts both APPROVED and IMPLEMENTED:
  `grep -E "Status: APPROVED.*Status: IMPLEMENTED|Status: IMPLEMENTED.*Status: APPROVED" plugins/relay/commands/relay-code-review.md` returns ≥1 (both names appear in P2's body, in either order).

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

- Synthesise a minimal APPROVED plan + a tiny working-tree diff in a sandbox; invoke `/relay-code-review` flow against it. Verify (a) all 5 preconditions pass, (b) the code-reviewer agent dispatches in `mode: 'standard'`, (c) the verdict is appended to `<basename>.code-review.jsonl`, (d) the plan trailing block is byte-identical before and after the command (no mutation), (e) the source PRD (if any) is byte-identical before and after, (f) the success summary or CHANGES_REQUESTED bullet list matches the verbatim Final output texts. Cleanup: remove the dry-run plan + jsonl entry.
- Snapshot test: take a `git diff plugins/relay/commands/relay-code-review.md` and confirm it is the only file modified by Phase 4 of this plan (no incidental edits to sibling commands or agents).

## Acceptance Criteria

- **AC-A1 (PRD AC-12 + AC-13):** Given a working-tree diff against base AND a plan file at `<plan_path>` whose trailing status is `*Status: APPROVED*` (or `*Status: IMPLEMENTED*`), when `/relay-code-review <plan-path>` runs, then it dispatches `code-reviewer` in `mode: 'standard'`, appends one verdict line to `PRPs/plans/<basename>.code-review.jsonl`, surfaces APPROVED or CHANGES_REQUESTED to the caller, and exits — without any user prompt and without mutating the plan trailing block, the plan file location, or the source PRD's Implementation Phases table.
- **AC-A2 (PRD AC-12 + D5 + D8):** No D8 mutation is performed by `/relay-code-review`. Verifiable by snapshot: `git diff <plan_path>` returns nothing after the command runs (regardless of verdict); `git diff PRPs/prds/<feature>.prd.md` returns nothing.
- **AC-A3 (PRD AC-9):** No path resolved by the command for any artifact write contains `.claude/`. Static check: `grep -E "(Write|Edit)\(.*\.claude/PRPs" plugins/relay/commands/relay-code-review.md` returns nothing.
- **AC-A4 (PRD AC-10):** The code-reviewer agent's appended jsonl line contains all rubric items with boolean `passed` fields, no short-circuit, regardless of whether earlier items failed. (This is enforced by the agent itself per AC-10; the command does not need to validate this — the assertion is that the command doesn't reach into the jsonl line and short-circuit it.)
- **AC-A5 (PRD AC-14):** The command's Decision Gate consultation HALTs with the byte-exact AC-14 message if any of `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` is unreadable. The message substitutes `/relay-code-review` for `/relay-implement`.
- **AC-A6 (PRD AC-12 — single-shot discipline):** A single `/relay-code-review` invocation produces exactly one new line in `<basename>.code-review.jsonl` (verifiable by line-count delta before and after). No internal loop; no retries; no oscillation detection; no budget envelope.
- **AC-A7 (PRD AC-6 worktree degradation):** The command computes `<base_commit>` via the canonical four-step fallback chain shipped in `/relay-implement` Precondition P5; works in cwd against the current branch when no `/relay-worktree` is set up; HALTs with the documented diagnostic if `git merge-base` fails.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Developer expects `/relay-code-review` to auto-flip plan status (matching `/relay-plan-review`'s behavior) and is surprised by the no-mutation contract | M | L | The "no mutation" invariant is stated in Your mission, in Constraints (rule #2 + #3), in What you do NOT do, and in both Final output surface variants. The success summary explicitly says "status unchanged" + suggests `/relay-implement` for state mutation. AC-12 + D5 + D8 establish the architectural rationale. |
| `code-reviewer` agent's `attempt` parameter is required to be ≥1 but standalone has no loop context | L | L | Use `attempt: 1` (first-and-only) per Task 4. Document the convention in the command body. The agent's jsonl line records `attempt: 1, mode: 'standard'`, which is unambiguous. |
| The agent's rubric depends on the plan's Step-by-Step Tasks / Files to Change / AC sections being well-formed; a malformed plan would produce noise | M | M | Same risk applies to `/relay-implement`'s internal dispatch; addressed there by the plan-reviewer rubric R4/R7/R8 catching plan defects upstream. For `/relay-code-review`, the developer is presumed to be invoking against an APPROVED or IMPLEMENTED plan that already passed plan-reviewer; the command does not re-validate the plan structure. |
| P3 worktree-has-diff check fails when the developer has staged but not modified files vs base (edge case: amended commit that only changes commit metadata) | L | L | `git diff --quiet HEAD <base_commit>` works on tracked content; metadata-only changes are correctly treated as "no diff to review". The HALT message names `<base_commit>` so the developer can debug. |
| `/relay-code-review` invoked against a plan whose trailing status is something other than APPROVED or IMPLEMENTED (e.g., DRAFT, or no status line) | L | L | P2 catches this with a HALT message naming the actual status found and listing the two acceptable values. The developer is directed to either run `/relay-plan-review` (for DRAFT) or hand-edit the status. |
| Concurrent invocations of `/relay-code-review` against the same plan append two jsonl lines; both verdicts are valid (read-only) but the audit log shows two entries with similar timestamps | L | L | No mutation race; both entries are valid audit records; the developer can grep by timestamp + git HEAD to disambiguate. The plan's Notes section documents this as expected behavior (no concurrency diagnostic needed for read-only single-shot commands). |

## Notes

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### Design notes (from grounding)

- The "**reviewer that surfaces APPROVED without auto-flipping**" pattern has no relay sibling precedent; the closest is `relay-test-review.md` which writes a separate `test-review.json` rather than mutating plan status, but it has no APPROVED-as-final-state semantics either. The pattern is a relay-original architectural choice (D5 + D8 + AC-12) with the closest external precedent being **Cloudflare's AI code review** (sub-reviewers emit findings; a separate coordinator alone mutates state) and **GitHub's `Comment` PR review type** (verdict without approval signal).
- The `attempt` sentinel for standalone `/relay-code-review` use is `1` — the first-and-only invocation. The code-reviewer agent's jsonl line records `attempt: 1, mode: 'standard'`, which is unambiguous. An alternative ("named sentinel" like `attempt: 'standalone'`) was rejected because it requires the agent to handle a non-integer; using `1` reuses the existing integer contract without modification.
- **No `diff.patch` artifact is written** by `/relay-code-review`. AC-12 does not require it. The code-reviewer's jsonl line — which references the rubric items + their pass/fail/reason fields — IS the audit trail. Skipping the diff.patch reflects the read-only nature of the command and keeps the artifact footprint minimal. If a developer wants per-attempt diff capture, they invoke `/relay-implement` instead.
- **No concurrency soft-fail diagnostic** for `/relay-code-review`. Unlike `/relay-implement` (which has an attempt-loop and D8 mutations that race), `/relay-code-review` is single-shot read-only with no D8. Concurrent invocations are naturally re-runnable; both verdicts are valid audit entries. The plan's Risks table documents this.
- **Plan path can resolve to either `PRPs/plans/<basename>.plan.md` (APPROVED) or `PRPs/plans/completed/<basename>.plan.md` (IMPLEMENTED).** Both are valid review contexts. P2 accepts either trailing status.
- **Order of precondition execution**: documentation order is P1 → P2 → P3 → P4 → P5 (numbered for readability). Implementation order is P1 → P2 → P5 → P3 → P4 (P5 must run before P3 because P3 needs `<base_commit>` to compute the diff). The command body documents this divergence explicitly so the implementer reading the file understands the actual control flow.
- **The frontmatter description is single-quoted** to allow `:` characters in literal references like `*Status: APPROVED*` — the same lesson learned from the `/relay-implement` Phase 3 implementation, where the unquoted description failed YAML parse during validation Level 1.2.
- **Cloudflare's AI code review architecture** (https://blog.cloudflare.com/ai-code-review/) is the cleanest external precedent: sub-reviewers produce structured findings with no state-mutation awareness; a separate coordinator agent applies a rubric mapping finding profiles to GitLab actions. Maps directly to relay's split: `code-reviewer` agent (read-only sub-reviewer) → `/relay-implement` (coordinator that mutates) and `/relay-code-review` (read-only standalone surface for hand-invoked review).
- **GitHub's `Comment` PR review type** (https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews) is the native precedent for "verdict without approval signal" — confirms that the read-only verdict pattern is well-established in production code-review systems.

*Generated: 2026-04-30*
*Approved: 2026-04-30*
*Implemented: 2026-04-30*
*Status: IMPLEMENTED*
