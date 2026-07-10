---
description: 'Single-shot standalone code review of a working-tree diff against a plan. Validates the plan path and the diff, dispatches the code-reviewer agent in mode=standard exactly once, appends one verdict to PRPs/plans/<basename>.code-review.jsonl, and surfaces APPROVED or CHANGES_REQUESTED to the caller. CRITICAL DIVERGENCE FROM /relay-plan-review: this command does NOT auto-flip plan status, does NOT perform any of the three D8 post-approval mutations (plan trailing-block flip, plan move to PRPs/plans/completed/, source PRD row N flip in-progress→complete), and does NOT modify any artifact other than the append to code-review.jsonl. D8 mutations are exclusively /relay-implement''s responsibility per source PRD AC-12 + D5 + D8. The plan trailing block at *Status: APPROVED* or *Status: IMPLEMENTED* is byte-identical before and after the command runs. Single Task dispatch per invocation; no internal loop, no retries, no oscillation detection, no budget envelope, no per-attempt diff.patch artifact. The architectural framing is the read-only counterpart to /relay-implement''s mutation-triggering autonomous loop — for hand-invoked review where the developer wants a rubric verdict without triggering downstream state changes.'
argument-hint: <plan-path>
---

# /relay-code-review

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the plan path argument, run the preconditions check, then dispatch the already-shipped `code-reviewer` agent (Phase 2 of `implementation-authoring`, color: magenta) exactly once in `mode: 'standard'` against a working-tree diff. Read the just-appended jsonl verdict line and surface APPROVED or CHANGES_REQUESTED to the caller. Exit.

You are autonomous. You do not prompt the user. You do not loop the reviewer across invocations — that is `/relay-implement`'s internal loop logic, not this command's job. **You do NOT auto-flip plan status. You do NOT perform any D8 mutation.** The plan file at `<plan_path>` is byte-identical before and after the command runs. The source PRD's Implementation Phases table is byte-identical. The only on-disk write is the code-reviewer agent's append to `PRPs/plans/<basename>.code-review.jsonl`.

This is the **read-only standalone reviewer surface**. The hand-invoked counterpart to `/relay-implement`'s internal `code-reviewer` dispatch (which DOES trigger D8 on APPROVED). When a developer hand-edits code in the worktree against an APPROVED or IMPLEMENTED plan and wants the same 8-item rubric verdict that the autonomous loop would produce — without triggering downstream state changes — they invoke `/relay-code-review`. The architectural rationale is the writer/reviewer split (D1) + the orchestrator-owned-mutations principle (D8): mutation-triggering review goes through `/relay-implement`'s coordinator; advisory/read-only review goes through this command.

The closest external precedent is **Cloudflare's AI code review architecture** (sub-reviewers emit findings; a separate coordinator alone mutates GitLab state) and **GitHub's `Comment` PR review type** (verdict without approval signal). The closest relay sibling is `plugins/relay/commands/relay-test-review.md` (the only existing relay command where the reviewer operates on a worktree diff and surfaces a verdict without mutating any plan/PRD status).

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/implementation-authoring.prd.md` — source PRD with D1+D5+D8+D11 decisions and AC-10+AC-12+AC-14, especially the User Flow §"Standalone /relay-code-review flow" (lines 197–203).
- `${CLAUDE_PLUGIN_ROOT}/agents/code-reviewer.md` — the code-reviewer agent's input/output contract for `mode: 'standard'`; hard constraint that the agent never performs D8 mutations (lines 131–137).
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan-review.md` — canonical single-shot reviewer command shape; key divergence: relay-plan-review DOES auto-flip plan status, this command does NOT.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` — sibling writer command with the canonical base-commit derivation chain (Precondition P5); the mutation-triggering counterpart to this command.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-test-review.md` — only existing relay command with both "diff-input reviewer" and "verdict-without-status-mutation" properties.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay plugin repo. This command creates a cross-cutting artifact (a code-review.jsonl audit entry consumed by the orchestrator and the developer); the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` in the target project. Your gate here covers the *command invocation*; the code-reviewer agent emits its own gate inside its dispatch payload, covering the *diff being reviewed*.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: {semicolon-separated — typically: cross-cutting artifact creation; standalone reviewer surface; reads diff against base-commit; references source PRD D5+D8+AC-12}
- Decisions found:
  - {decision 1, e.g. command surface writer/reviewer split (2026-04-19)}
  - {decision 2, e.g. PRP artifact paths under PRPs/ (2026-04-19)}
  - {decision 3, e.g. D5+D8 from implementation-authoring.prd.md — no auto-flip from this command}
  - ...
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66)
  - Bundling writer + reviewer into one command (the 2026-04-19 split applies)
  - Auto-flipping plan status from a standalone reviewer (D5+D8 forbid this)
- Applicable architectural rules:
  - Three-pillar Pillar 2; interactivity boundary; PRPs/ artifact paths; writer/reviewer split; graceful degradation
- Result: PROCEED | HALT (reason)
```

If the Decision Gate cannot be emitted because one of the three sources is unreadable, fall through to P4 below for the canonical halt message.

---

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat the argument as the plan path; resolve it as absolute, or as relative to the current working directory. The plan path may resolve to either:

- `PRPs/plans/<basename>.plan.md` (status `*Status: APPROVED*`, mid-implementation review), or
- `PRPs/plans/completed/<basename>.plan.md` (status `*Status: IMPLEMENTED*`, post-implementation re-review after a hand-edit).

Both are valid review contexts.

If the argument is blank/whitespace, HALT with:

> /relay-code-review requires a plan path. Usage:
>   /relay-code-review PRPs/plans/<basename>.plan.md
>   (or PRPs/plans/completed/<basename>.plan.md for an IMPLEMENTED plan)
> Example:
>   /relay-code-review PRPs/plans/completed/implementation-authoring-phase-3-relay-implement-command.plan.md

If the argument is non-empty but does not resolve to an existing readable file, fall through to P1 below.

Record `plan_path` as the resolved absolute path. Record `target_root` as the current working directory. Compute `<basename>` as the plan filename minus `.plan.md`. Compute `<feature>` and `<N>` from `<basename>` per the canonical pattern `<feature>-phase-<N>-<slug>` — both values are used for documentation purposes (e.g., the success summary cites the feature) but are NOT used for any artifact-write path (this command writes only the code-reviewer's jsonl line, which is keyed on `<basename>`, not `<feature>` / `<N>`).

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail.

**Implementation order note:** the documentation order below is P1 → P2 → P3 → P4 → P5 for readability, but the actual control flow is **P1 → P2 → P5 → P3 → P4** because P3 needs `<base_commit>` (computed in P5) to test for a working-tree diff.

### P1 — Plan path resolves to a readable file

If `plan_path` does not point at an existing readable file:

> I cannot start standalone code review without `<plan_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-code-review PRPs/plans/<basename>.plan.md
> (or PRPs/plans/completed/<basename>.plan.md for an IMPLEMENTED plan)

### P2 — Plan ends with `*Status: APPROVED*` or `*Status: IMPLEMENTED*`

`Read` the plan. Inspect its trailing status line (the last non-empty line of the file). Trim trailing whitespace and newlines before comparison.

- If it equals exactly `*Status: APPROVED*` → proceed (mid-implementation review context).
- If it equals exactly `*Status: IMPLEMENTED*` → proceed (post-implementation re-review context).
- Otherwise (DRAFT, no status line, or any other value):

  HALT with:

  > The plan at `<plan_path>` has trailing status `<status>`,
  > but /relay-code-review requires `*Status: APPROVED*` or
  > `*Status: IMPLEMENTED*`. If the plan is at DRAFT, run
  > /relay-plan-review first (different command; reviews the
  > plan document itself, not a code diff). If the plan has
  > no status line, hand-edit the trailing block to add one.

The check is for one of the two acceptable values exactly. Both contexts (APPROVED and IMPLEMENTED) make sense for standalone review: APPROVED means the plan is the spec for an in-flight implementation; IMPLEMENTED means the plan was completed and a developer hand-edited the code afterward and wants a fresh rubric pass.

### P3 — Working tree has a diff against `<base_commit>`

(Implementation order: runs after P5, which derives `<base_commit>`.)

Run `git diff --quiet HEAD <base_commit>`. The exit code semantics:
- Non-zero → there ARE differences in the working tree → proceed.
- Zero → no diff → HALT with:

  > No working-tree diff against `<base_commit>` (base branch:
  > `<base_branch>`). /relay-code-review reviews an existing
  > implementation diff; if you have not edited any code yet
  > or have not committed your changes against the right
  > base, there is nothing to review. Either edit some code
  > in the worktree, or run /relay-implement against the plan
  > if you want the autonomous loop to produce code from
  > scratch.

### P4 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the source PRD AC-14 message verbatim (substituting `/relay-code-review` for `/relay-implement`):

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-code-review.
> No code has been changed and no review has been run.

### P5 — Base-commit derivable

(Implementation order: runs before P3.) Reuse the canonical four-step fallback chain shipped in `/relay-implement` Precondition P5:

1. If `$ARGUMENTS` contained `--base <branch>`, extract that value.
2. Otherwise, run `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`.
3. Fallback: `git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'`.
4. Last resort: `main`.

Record `base_branch`. Then compute `base_commit = git merge-base HEAD <base_branch>`. If `git merge-base` exits non-zero, HALT with:

> Cannot derive base-commit: `git merge-base HEAD <base_branch>`
> exited non-zero. /relay-code-review needs a base-commit
> against which to compute the working-tree diff. Ensure the
> branch has a clean ancestry to `<base_branch>` or pass an
> explicit `--base <branch>` argument. No code has been
> changed and no review has been run.

Record `base_commit` for use in P3 and Phase A.

---

## Phase A — Adopt the Reviewer role

Single-shot. No internal loop. No retries. No D8 mutations.

### A.1 — Dispatch the code-reviewer agent in standard mode

Invoke `code-reviewer` exactly once via `Task`:

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

The `attempt: 1` value is the standalone-invocation sentinel — first-and-only. The code-reviewer agent's input contract requires `attempt: integer ≥ 1`; `1` reuses the existing integer contract without modification. The agent's appended jsonl line records `attempt: 1, mode: "standard"`, which is unambiguous.

The agent reads the plan + the working-tree diff against `<base_commit>`, runs the 8-item rubric (R-S1, R-S2, R-S3, R-L1, R-L2, R-L3, R-SEM, R-X — plus R-COH-* additive when the reviewer-coherence-layer is active) against the diff, and appends one verdict line to `PRPs/plans/<basename>.code-review.jsonl` itself per its protocol (D11 — code-reviewer is the writer of its own audit log; this command does NOT duplicate that write). All rubric items are recorded in the verdict line per AC-10 (no short-circuit).

### A.2 — Read the just-appended jsonl line and surface the verdict

`Read` `PRPs/plans/<basename>.code-review.jsonl`. The just-appended line is the last line. Parse the `verdict` field:

- `APPROVED` → emit the success summary (Final output surface, APPROVED variant) and exit.
- `CHANGES_REQUESTED` → emit the bullet list of failing rubric items by ID + reason (Final output surface, CHANGES_REQUESTED variant) and exit.

### A.3 — Do NOT perform any D8 mutation

This step is a no-op by design. Stated explicitly so the discipline is visible in the command body:

- Do NOT `Edit` the plan trailing block. The plan file at `<plan_path>` is byte-identical before and after this command runs, regardless of verdict.
- Do NOT `Bash(mv ...)` the plan to `PRPs/plans/completed/`. The plan stays at its current location.
- Do NOT `Edit` the source PRD's Implementation Phases table. The source PRD is byte-identical before and after this command runs.

The architectural rationale: D8 mutations are exclusively `/relay-implement`'s responsibility per source PRD AC-12 + D5 + D8. The standalone surface is read-only with respect to artifact status.

### There is no Phase B

A single `/relay-code-review` invocation produces exactly one verdict (APPROVED or CHANGES_REQUESTED) and exits. The orchestrator (or developer) decides whether to re-run, invoke `/relay-implement` for the autonomous loop, or hand-edit and re-invoke `/relay-code-review`. This command never re-runs the Reviewer in a loop and never performs the D8 post-approval mutations — those are `/relay-implement`'s exclusive responsibility per source PRD AC-12 + D5 + D8.

CHANGES_REQUESTED is terminal for the invocation; the developer typically resolves the rubric defects and re-runs `/relay-code-review` for re-validation, or invokes `/relay-implement` to drive the autonomous loop with retries.

---

## Final output surface

### APPROVED variant

> ✅ Code review **APPROVED** at `PRPs/plans/<basename>.code-review.jsonl` (line `<line_index>`).
> Plan: `<plan_path>` (status unchanged at `<APPROVED|IMPLEMENTED>`).
> Diff reviewed against `<base_commit>` (base branch: `<base_branch>`).
> No mutations performed (use `/relay-implement` to drive plan status to IMPLEMENTED).

### CHANGES_REQUESTED variant

> ❌ Code review **CHANGES_REQUESTED** at `PRPs/plans/<basename>.code-review.jsonl` (line `<line_index>`).
> Failing rubric items:
> - **<R-ID>** — <reason>
> - **<R-ID>** — <reason>
> - ...
> Plan: `<plan_path>` (status unchanged at `<APPROVED|IMPLEMENTED>`).
> Diff reviewed against `<base_commit>` (base branch: `<base_branch>`).
> No mutations performed. Resolve the rubric defects and re-run /relay-code-review, or invoke /relay-implement to drive the autonomous loop with retries.

### HALT variants

Each precondition HALT (P1/P2/P3/P4/P5) produces the verbatim message defined in its sub-section above. The command exits without dispatching the code-reviewer and without writing any jsonl line.

---

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** The only on-disk write performed in the success path is the code-reviewer agent's append to `PRPs/plans/<basename>.code-review.jsonl`. Nothing else. The agent enforces this at the agent level via its own Hard constraints; this command is the first guard.

2. **Never auto-flip plan status.** The plan trailing block is read-only from this command. Both `*Status: APPROVED*` and `*Status: IMPLEMENTED*` cases are left byte-identical. This is the canonical divergence from `/relay-plan-review` (which DOES auto-flip DRAFT → APPROVED). The architectural rationale is source PRD D5 + D8 + AC-12.

3. **Never perform any D8 mutation.** No plan trailing-block edit. No plan move to `PRPs/plans/completed/`. No source PRD row N edit. D8 mutations are exclusively `/relay-implement`'s responsibility per source PRD AC-12 + D5 + D8. This command's job is to surface the rubric verdict; downstream state changes are not its concern.

4. **Never re-run the Reviewer in a loop.** Single Task dispatch per command invocation. The internal writer↔reviewer loop lives in `/relay-implement`; this standalone command produces exactly one verdict and exits. CHANGES_REQUESTED is terminal for the invocation.

5. **Never adopt the Writer role.** This is reviewer-only per D1. The implementer is dispatched by `/relay-implement`, not by this command. Hand-edits to code in the worktree are the developer's responsibility, not this command's job to produce.

6. **Never prompt the user.** Past the interactivity boundary (`docs/context/architecture.md` §Interactivity boundary). HALTs are surfaced verbatim and the command exits.

7. **Never skip the Decision Gate evidence block.** The command-level gate is mandatory; the code-reviewer agent emits its own gate inside its dispatch payload.

8. **Never dispatch `code-reviewer` in arbitration mode.** This standalone surface is exclusively `mode: 'standard'`. Arbitration is reachable only through `/relay-implement`'s internal dispatch on `TEST_CONTRACT_DISPUTE`.

---

## What you do NOT do

- **Mutating plan status** — see Constraints #2. The plan file at `<plan_path>` is byte-identical before and after.
- **Performing D8 mutations** — see Constraints #3. No plan-move, no PRD row update, no plan trailing-block flip.
- **Running an internal loop** — single-shot only. No retries; no oscillation detection; no budget envelope; no per-attempt diff.patch artifact.
- **Writing a per-attempt `diff.patch`** — AC-12 does not require it; the code-review.jsonl line itself is the audit trail. If the developer wants per-attempt diff capture, they invoke `/relay-implement` instead.
- **Dispatching `code-reviewer` in arbitration mode** — see Constraints #8.
- **Reviewing a plan whose trailing status is `DRAFT`** — that is `/relay-plan-review`'s job (different command; reviews the plan document itself, not a code diff). Caught at P2.
- **Reviewing a worktree-only diff with no plan context** — the plan path argument is mandatory; the plan provides the rubric's structural inputs (Step-by-Step Tasks, Files to Change, Acceptance Criteria) per the code-reviewer agent's contract.
- **Reopening or modifying an IMPLEMENTED plan via tooling** — manual hand-edit (flip status back to APPROVED + move from `PRPs/plans/completed/` back) is the documented escape hatch; `/relay-code-review` does not perform this for the developer.
- **Cross-PRD planning / cross-plan orchestration** — single plan per invocation. Multi-plan coordination is `/relay-execute`'s job.
- **`--mode arbitration` flag** — Could-item; deferred. The arbitration path is reachable only through `/relay-implement`'s internal dispatch.
- **`--strict` flag re-introducing a manual confirmation gate** — past the interactivity boundary; the standalone command is naturally non-blocking and re-runnable.
- **Concurrency soft-fail diagnostic** — single-shot read-only; no D8 mutations to race on. Concurrent invocations against the same plan append two valid jsonl lines; both verdicts are valid audit records. Differs from `/relay-implement`'s D18 diagnostic which guards against attempt-loop / D8-mutation races.
