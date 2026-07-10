---
description: Review a GREEN test state for weakening patterns (B5 post-green review). Invokes the post-green-reviewer agent; returns APPROVED or CHANGES_REQUESTED. Preconditions require a run.json with outcome=GREEN from a prior /relay-test.
argument-hint: <worktree-path> [--base <branch>] [--feature <name>]
---

# /relay-test-review

**Arguments:** `$ARGUMENTS`

---

## Your mission

Wrap the `post-green-reviewer` agent with preconditions, base-branch
resolution, and result dispatch. You do not interpret the diff
yourself — the agent does. You run preconditions, invoke the agent,
and surface its verdict.

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/test-runner.prd.md` — B5 scope + AC-6
- `${CLAUDE_PLUGIN_ROOT}/agents/post-green-reviewer.md` — the agent

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md`. Review is
active; result usually `PROCEED` unless preconditions fail.

---

## Parse arguments

- `<worktree-path>` (required): absolute path to the target worktree.
- `--base <branch>` (optional): reference to diff against. Default
  resolution: (1) `$RELAY_BASE_BRANCH` if set, (2) `main` if it exists,
  (3) `master` if it exists, (4) HALT with a clear error asking the
  user to pass `--base`.
- `--feature <name>` (optional): feature name for
  `PRPs/reports/<feature>/`. If absent, derive from branch
  (`feature/foo` → `foo`; fallback `unnamed-feature`).

HALT with a clear error if the worktree path does not exist or is not
a git worktree.

---

## Preconditions

Before invoking the agent:

1. **Worktree is a git worktree** — `git -C <worktree> rev-parse --git-dir` succeeds.
2. **Base branch resolves** — `git -C <worktree> rev-parse --verify <base>` succeeds.
3. **run.json exists** at `<worktree>/PRPs/reports/<feature>/run.json`. If missing, HALT with "No run.json found. Run `/relay-test` first."
4. **run.json outcome is `GREEN`** — read the file, check `outcome` field. If any other value (e.g., `FAILED_AFTER_N_RETRIES`, `FAILED_OSCILLATION`), HALT with the actual outcome reported: "post-green review requires a GREEN outcome; got `<outcome>`. Either re-run `/relay-test` until it passes, or fix the underlying failure."

If any precondition fails, HALT — do not invoke the agent.

---

## Invoke the agent

Use the Agent tool with `subagent_type="post-green-reviewer"`. Pass a
prompt including:

```
worktree: <absolute path>
run_json_path: <worktree>/PRPs/reports/<feature>/run.json
base_branch: <resolved base>
run_id: <from run.json>
suite_manifest_path: <worktree>/PRPs/reports/<feature>/test-suite.diff
```

`<feature>` is the same value already resolved above for
`run_json_path` — no new resolution logic is needed, only the path
string. A missing or `*Status: DRAFT*` manifest is expected and
legitimate (e.g. a run with no test-pair activity this session); the
agent's own Step 2.5 treats that as `ledger = none`. Its removal/skip
blocking behavior (Steps 3a/3b) is then byte-identical to before —
every removal/skip still blocks. Its whole-file-deletion detection
(Step 3d) is new, strictly-additive behavior this phase introduces:
it applies regardless of manifest presence, so with no manifest a
deleted test file still blocks (new, stricter than the pre-phase
agent, which had no such detection at all).

The agent reads the run.json, diffs changed test files against the
base, classifies concerns, and returns a JSON verdict inside a fenced
`json` block.

---

## Dispatch on verdict

**APPROVED** → write the verdict to
`<worktree>/PRPs/reports/<feature>/test-review.json` with an
additional `reviewed_at` timestamp. Print a terse user-facing summary:

```
Post-green review: APPROVED
Run: <run_id>
Files analyzed: N
Notes: <any notes the agent surfaced>
```

**CHANGES_REQUESTED** → write the verdict to
`<worktree>/PRPs/reports/<feature>/test-review.json` (same field
shape). Print:

```
Post-green review: CHANGES_REQUESTED
Run: <run_id>
Concerns:
  - [type] file — short summary
  - ...

Next step: fix the flagged tests (re-add the removed cases, remove
the skip markers, restore the assertions), then re-run /relay-test,
then /relay-test-review.
```

**Error verdict (`error: "run_not_green"`)** → should have been caught
by preconditions; if the agent still returns it, surface as HALT with
the agent's message.

---

## Write the review record

Regardless of verdict, produce
`<worktree>/PRPs/reports/<feature>/test-review.json`:

```json
{
  "run_id": "<uuid>",
  "reviewed_at": "ISO-8601 UTC",
  "base_branch": "<branch>",
  "verdict": "APPROVED | CHANGES_REQUESTED",
  "analyzed_files": N,
  "concerns": [...],
  "notes": [...]
}
```

This file is the input consumed by `/relay-pr` (Phase 8 / B6): the PR
description embeds the verdict and — on `CHANGES_REQUESTED` — blocks
the PR from being opened until a subsequent APPROVED review exists.

---

## Constraints (hard rules)

- **Never modify code, tests, or configuration.** Review is read-only
  end-to-end.
- **Never re-run tests.** That's `/relay-test`'s job. If the user
  wants to re-run, they invoke `/relay-test`.
- **Never propose specific fixes.** Output identifies weakening; the
  team (or a future Implementer loop) remediates.
- **Never skip preconditions.** A missing or non-green run.json makes
  this review meaningless and confusing — HALT.
- **Never write under `.claude/`.** test-review.json goes in
  `PRPs/reports/<feature>/`.
- **Never skip the Decision Gate evidence block.**

---

## What you do NOT do

- **Full code review** — that's `/relay-code-review` (separate
  command, future phase).
- **Writing the final PR report** — that's `/relay-pr` (Phase 8).
  This command only produces `test-review.json` as input.
- **Re-triggering the auto-correction loop** — the orchestrator
  (`/relay-execute`) decides what to do with a `CHANGES_REQUESTED`
  verdict: loop back to the Implementer with the concerns as new
  feedback, or HALT for human review.
