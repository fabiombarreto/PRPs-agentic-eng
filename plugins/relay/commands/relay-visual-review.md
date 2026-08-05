---
description: 'Single-shot standalone visual-fidelity re-check of a plan whose ## Metadata carries design_source: figma. Validates the plan path, confirms figma_track: true in the target project''s docs/context/methodology.md and design_source: figma on the plan, resolves the referenced APPROVED Design Spec at PRPs/designs/<feature>/design-spec.md, captures a fresh diff against the derived base commit, then dispatches the already-shipped visual-verifier agent (Figma Implementation Track Phase 6) exactly once (attempt: 1 sentinel — mirrors /relay-code-review''s standalone dispatch shape) via Task. Reads the returned verdict and surfaces VISUAL_VERIFIED / VISUAL_DEGRADED / VISUAL_MISMATCH plus the fidelity-report.json path to the caller. Performs zero D8 mutations and never edits the plan or any PRD — byte-identical before/after, exactly like /relay-code-review. Structurally identical, non-mutating, single-shot standalone command; no internal loop, no retries, no budget envelope.'
argument-hint: <plan-path>
---

# /relay-visual-review

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the plan path argument, run the preconditions check, then dispatch the already-shipped `visual-verifier` agent (Figma Implementation Track Phase 6, color: cyan) exactly once against the plan's referenced Design Spec. Read the returned verdict and surface `VISUAL_VERIFIED` / `VISUAL_DEGRADED` / `VISUAL_MISMATCH` plus the `fidelity-report.json` path to the caller. Exit.

You are autonomous. You do not prompt the user. You do not loop the visual-verifier across invocations — the bounded retry budget, the post-visual fix round, and the deterministic revert are `/relay-implement`'s Phase A.3.4 internal-loop responsibilities, not this command's job. **You do NOT auto-flip plan status. You do NOT perform any D8 mutation.** The plan file at `<plan_path>` is byte-identical before and after the command runs. The source PRD's Implementation Phases table (when the plan is PRD-mode) is byte-identical. The only on-disk writes are the captured `diff.patch` and the `visual-verifier`-written `fidelity-report.json` (and, on a degraded rung, its manifest scratch file) under `PRPs/reports/<feature-or-slug>/.../visual-review/`.

This is the **read-only standalone visual-review surface** — a Should-item of the Figma Implementation Track (Phase 7, `figma-implementation-track.prd.md`, in the relay plugin repo, not packaged). The hand-invoked counterpart to `/relay-implement`'s internal Phase A.3.4 `visual-verifier` dispatch (which runs automatically, once, immediately after code-review `APPROVED`, when the plan is Figma-sourced). When a developer wants an ad-hoc re-check of visual fidelity — after a manual hand-edit to styling, after refreshing reference screenshots, or simply to re-confirm a merged feature's visual state — without re-running the full `/relay-implement` writer/reviewer loop, they invoke `/relay-visual-review`. The architectural rationale mirrors `/relay-code-review`'s: mutation-triggering visual verification goes through `/relay-implement`'s Phase A.3.4; advisory/read-only re-verification goes through this command.

See:
- the source PRD `figma-implementation-track.prd.md`, in the relay plugin repo (not packaged) — Implementation Phases row 7 ("Surface integration + self-improvement"); this command is the Should-item standalone re-check surface.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-code-review.md` — canonical single-shot, non-mutating standalone command shape this command mirrors structurally (Decision Gate / Preconditions / single Task dispatch / Final output surface).
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` — Phase A.3.4 ("Visual-verification dispatch"), the internal-loop counterpart this command's single dispatch payload reuses verbatim.
- `${CLAUDE_PLUGIN_ROOT}/agents/visual-verifier.md` — the visual-verifier agent's inputs contract, `fidelity_report_path` derivation, and the three verdict shapes.
- `${CLAUDE_PLUGIN_ROOT}/resources/design-spec-template.md` — canonical Design Spec shape; the `## Visual Acceptance Criteria` table `visual-verifier` reads.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay plugin repo. This command dispatches a self-contained tooling pipeline (provision → capture → compare) and writes a fresh `fidelity-report.json`; the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` in the target project.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: {semicolon-separated — typically: standalone reviewer surface; figma_track_declared-gated; reuses /relay-implement Phase A.3.4 dispatch shape; references figma-implementation-track.prd.md Phase 7}
- Decisions found:
  - {decision 1, e.g. [2026-07-23] Visual-verification loop — bounded, non-blocking degradation ladder}
  - {decision 2, e.g. command surface writer/reviewer split (2026-04-19)}
  - {decision 3, e.g. Flipping figma_track by heuristic is forbidden (docs/anti-patterns.md:89-95) — this command only READS the declared value}
  - ...
- Applicable anti-patterns:
  - Querying the Figma MCP from a dispatched writer/reviewer agent (docs/anti-patterns.md:98-104) — this command and visual-verifier stay MCP-free, reading only already-persisted Design Spec + reference PNG evidence
  - Flipping figma_track (or any gating key) by heuristic (docs/anti-patterns.md:89-95)
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); "Nothing changes when figma_track is off" invariant; PRPs/ artifact paths; writer/reviewer split
- Result: PROCEED | HALT (reason)
```

If the Decision Gate cannot be emitted because one of the three sources is unreadable, fall through to P6 below for the canonical halt message.

---

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat the argument as the plan path; resolve it as absolute, or as relative to the current working directory. If the argument is blank/whitespace, HALT with:

> /relay-visual-review requires a plan path. Usage:
>   /relay-visual-review PRPs/plans/<feature>-phase-<N>-<slug>.plan.md
>   (or PRPs/plans/completed/<basename>.plan.md for an IMPLEMENTED plan)
> Example:
>   /relay-visual-review PRPs/plans/completed/figma-implementation-track-phase-6-visual-loop.plan.md

If the argument is non-empty but does not resolve to an existing readable file, fall through to P1 below.

Record `plan_path` as the resolved absolute path. Record `target_root` as the current working directory. Compute `<basename>` as the plan filename minus `.plan.md`.

**Feature derivation (two-branch, mirrors `/relay-implement`'s Parse arguments):**

- If the basename matches the canonical `<feature>-phase-<N>-<slug>.plan.md` pattern (contains `-phase-<digits>-` as a literal segment): `is_prd_less = false`; `<feature>` = the prefix before `-phase-<N>-`; `<N>` = the integer between `-phase-` and the next `-`; `artifact_root = PRPs/reports/<feature>/phase-<N>/attempts/`.
- Otherwise (flat `<slug>.plan.md`): `is_prd_less = true`; `<feature> = <slug>` = basename minus `.plan.md`; `<N> = null`; `artifact_root = PRPs/reports/<slug>/attempts/`.

These derived values locate the diff-capture artifact path (below) and the by-convention Design Spec path `PRPs/designs/<feature>/design-spec.md` — the Design Spec is scoped per feature (one spec covers every phase plan of that feature that declares `design_source: figma`), matching the `Ref PNG path` column's `PRPs/designs/<feature>/refs/<node-id>.png` convention already present in the plan's `## Design Source` table.

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail.

### P1 — Plan path resolves to a readable file

If `plan_path` does not point at an existing readable file:

> I cannot start a standalone visual review without `<plan_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-visual-review PRPs/plans/<basename>.plan.md
> (or PRPs/plans/completed/<basename>.plan.md for an IMPLEMENTED plan)

### P2 — Plan ends with `*Status: APPROVED*` or `*Status: IMPLEMENTED*`

`Read` the plan. Inspect its trailing status line (the last non-empty line of the file). Trim trailing whitespace and newlines before comparison.

- If it equals exactly `*Status: APPROVED*` → proceed (mid-implementation re-check).
- If it equals exactly `*Status: IMPLEMENTED*` → proceed (post-implementation ad-hoc re-check — the common case for this command).
- Otherwise (DRAFT, no status line, or any other value): HALT with:

  > The plan at `<plan_path>` has trailing status `<status>`,
  > but /relay-visual-review requires `*Status: APPROVED*` or
  > `*Status: IMPLEMENTED*`. If the plan is at DRAFT, it has not
  > been implemented yet — run /relay-plan-review, then
  > /relay-implement, first. If the plan has no status line,
  > hand-edit the trailing block to add one.

### P3 — Target project declares `figma_track: true`

`Read` `<target_root>/docs/context/methodology.md`. Parse the `figma_track` frontmatter key.

- If the file is absent, or `figma_track` is absent/`false`: HALT with:

  > /relay-visual-review requires `figma_track: true` in
  > `docs/context/methodology.md`, but this target project has it
  > absent or `false`. The Figma Implementation Track is not active
  > for this project. Set `figma_track: true` via the explicit,
  > quoted human confirmation step of /relay-design-map first — this
  > command never flips the key itself (docs/anti-patterns.md:89-95).

- If `figma_track: true`: proceed to P4.

### P4 — Plan's `## Metadata` table carries `design_source: figma`

`Read` the plan's `## Metadata` table. Locate the `design_source` row.

- If the row is absent, or reads `none`: HALT with:

  > The plan at `<plan_path>` does not carry `design_source: figma`
  > in its `## Metadata` table (row absent or `none`). This plan was
  > not authored against a Figma design — there is nothing for
  > /relay-visual-review to check. If this is unexpected, confirm the
  > plan was generated after figma_track was set to true and the
  > source PRD (or --design-spec flag, in description mode) declared
  > `design_source: figma` for this phase.

- If `design_source: figma`: proceed to P5.

### P5 — Referenced Design Spec resolves and is `*Status: APPROVED*`

Derive `design_spec_path = PRPs/designs/<feature>/design-spec.md` per the Parse-arguments derivation above. `Read` the file.

- If it does not resolve to an existing readable file: HALT with:

  > /relay-visual-review cannot find the Design Spec at
  > `<design_spec_path>` referenced by `<plan_path>`'s `## Design
  > Source` table. Run /relay-design-spec first, or confirm the
  > feature slug `<feature>` matches the Design Spec's directory.

- If found but its trailing status line is not exactly `*Status: APPROVED*`: HALT with:

  > The Design Spec at `<design_spec_path>` is not APPROVED (current
  > status: `<status>`). /relay-visual-review requires an APPROVED
  > Design Spec — the visual-verifier agent's frame manifest is built
  > from its `## Visual Acceptance Criteria` table. Complete
  > /relay-design-spec's approval dialogue first.

- Otherwise: proceed to P6.

### P6 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the source PRD AC-14 message verbatim (substituting `/relay-visual-review` for `/relay-implement`):

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-visual-review.
> No code has been changed and no review has been run.

### P7 — Base-commit derivable

Reuse the canonical four-step fallback chain shipped in `/relay-implement` Precondition P5 and `/relay-code-review` Precondition P5:

1. If `$ARGUMENTS` contained `--base <branch>`, extract that value.
2. Otherwise, run `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`.
3. Fallback: `git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'`.
4. Last resort: `main`.

Record `base_branch`. Then compute `base_commit = git merge-base HEAD <base_branch>`. If `git merge-base` exits non-zero, HALT with:

> Cannot derive base-commit: `git merge-base HEAD <base_branch>`
> exited non-zero. /relay-visual-review needs a base-commit against
> which to compute the diff visual-verifier's degraded-rung triage
> reads. Ensure the branch has a clean ancestry to `<base_branch>` or
> pass an explicit `--base <branch>` argument. No review has been run.

Record `base_commit` for use in Phase A.

---

## Phase A — Adopt the visual-verifier dispatch

Single-shot. No internal loop. No retries. No D8 mutations.

### A.1 — Capture the diff

1. Run `git add -A` (picks up untracked files so the diff below is complete — mirrors `/relay-implement` Phase A.2 step 1).
2. Run `git diff <base_commit>` and write the result to `<artifact_root>1/diff.patch` (creating parent directories as needed). The literal `attempts/1/diff.patch` suffix is required — `visual-verifier` derives `fidelity_report_path` by string-replacing this exact trailing segment with `visual/1/fidelity-report.json` (its own Inputs-section contract). Re-running this command against the same plan intentionally overwrites this file with the freshly captured diff — the point of a re-check is to reflect current on-disk state, not a historical attempt.
3. The diff may be empty (no uncommitted changes against `<base_commit>` — the common case when re-checking an already-merged `IMPLEMENTED` plan). An empty diff is not an error; `visual-verifier`'s FULL-rung pixel comparison does not depend on the diff's contents — only its own degraded-rung static check reads it.

### A.2 — Dispatch the visual-verifier agent

Invoke `visual-verifier` exactly once via `Task`:

```
Task(subagent_type="visual-verifier",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       design_spec_path: <design_spec_path>,
       attempt: 1,
       diff_target: "<artifact_root>1/diff.patch",
       non_interactive: true,
     })
```

The `attempt: 1` value is the standalone-invocation sentinel — first-and-only, mirroring `/relay-code-review`'s own `attempt: 1` dispatch to `code-reviewer`. The agent reads the plan's `## Design Source` table plus the APPROVED Design Spec's `## Visual Acceptance Criteria` table, orchestrates `provision.mjs` → `capture.mjs` → `compare.mjs` (or degrades per its own ladder), and returns one of `VISUAL_VERIFIED`, `VISUAL_DEGRADED`, `VISUAL_MISMATCH`, always naming `fidelity_report_path`.

### A.3 — Read the returned verdict and surface it

Parse the agent's structured return:

- `VISUAL_VERIFIED` → emit the success summary (Final output surface, VERIFIED variant) and exit.
- `VISUAL_DEGRADED` → emit the degraded summary naming the rung + any `degraded_conformance_gaps` (Final output surface, DEGRADED variant) and exit.
- `VISUAL_MISMATCH` → emit the mismatch summary naming the failing frames + the agent's triage `claim` (Final output surface, MISMATCH variant) and exit.

### A.4 — Do NOT perform any D8 mutation, do NOT recommend or apply a fix

This step is a no-op by design. Stated explicitly so the discipline is visible in the command body:

- Do NOT `Edit` the plan trailing block. The plan file at `<plan_path>` is byte-identical before and after this command runs, regardless of verdict.
- Do NOT `Bash(mv ...)` the plan to `PRPs/plans/completed/`. The plan stays at its current location.
- Do NOT `Edit` the source PRD's Implementation Phases table (PRD mode). The source PRD is byte-identical before and after this command runs.
- Do NOT edit any application source file. `visual-verifier` never touches application code, and neither does this command — the post-visual fix round and deterministic revert live exclusively in `/relay-implement`'s Phase A.3.4, not here.

The architectural rationale: D8 mutations are exclusively `/relay-implement`'s responsibility. The standalone surface is read-only with respect to artifact status and application source.

### There is no Phase B

A single `/relay-visual-review` invocation produces exactly one verdict (`VISUAL_VERIFIED` / `VISUAL_DEGRADED` / `VISUAL_MISMATCH`) and exits. The developer decides whether to re-run after a hand-edit, invoke `/relay-implement` for the full budgeted retry loop, or accept a degraded/mismatch result as-is. This command never re-runs `visual-verifier` in a loop.

---

## Final output surface

### VERIFIED variant

> ✅ Visual review **VISUAL_VERIFIED** for `<plan_path>`.
> Fidelity report: `<fidelity_report_path>` (`<frames_checked>` frame(s), rung: FULL).
> Diff captured against `<base_commit>` (base branch: `<base_branch>`) at `<artifact_root>1/diff.patch`.
> No mutations performed.

### DEGRADED variant

> ⚠ Visual review **VISUAL_DEGRADED** for `<plan_path>` (rung: `<rung>`).
> Fidelity report: `<fidelity_report_path>` (`<frames_checked>` frame(s)).
> Degraded conformance gaps: <list, or "none">.
> Diff captured against `<base_commit>` (base branch: `<base_branch>`) at `<artifact_root>1/diff.patch`.
> No mutations performed. This is a non-blocking outcome — the tooling could not run a pixel-level check this time; re-run once the underlying provisioning/dev-server issue is resolved for a FULL-rung result.

### MISMATCH variant

> ❌ Visual review **VISUAL_MISMATCH** for `<plan_path>`.
> Fidelity report: `<fidelity_report_path>` (`<frames_checked>` frame(s), rung: FULL).
> Failing frames: <list of node_id: diff_percent=X, threshold=Y>.
> Triage: <agent's claim field, verbatim>.
> Diff captured against `<base_commit>` (base branch: `<base_branch>`) at `<artifact_root>1/diff.patch`.
> No mutations performed. Resolve the styling regression by hand, or invoke /relay-implement for the budgeted post-visual fix round.

### HALT variants

Each precondition HALT (P1–P7) produces the verbatim message defined in its sub-section above. The command exits without dispatching `visual-verifier` and without writing any diff or fidelity-report artifact.

---

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** The only on-disk writes performed in the success path are `<artifact_root>1/diff.patch` (this command) and `fidelity-report.json` plus any scratch manifest (the `visual-verifier` agent, scoped to `PRPs/reports/`). Nothing else.

2. **Never auto-flip plan status.** The plan trailing block is read-only from this command in both the `*Status: APPROVED*` and `*Status: IMPLEMENTED*` cases.

3. **Never perform any D8 mutation.** No plan trailing-block edit. No plan move to `PRPs/plans/completed/`. No source PRD row edit. D8 mutations are exclusively `/relay-implement`'s responsibility.

4. **Never edit application source.** Neither this command nor `visual-verifier` touches a file under the target project's application source tree. The post-visual fix round and deterministic revert live exclusively in `/relay-implement`'s Phase A.3.4.

5. **Never re-run `visual-verifier` in a loop.** Single `Task` dispatch per command invocation. The bounded retry budget (`max_visual_retries`), the post-visual fix round, and the deterministic revert all live in `/relay-implement`'s Phase A.3.4, not here.

6. **Never flip `figma_track` or `design_source`.** This command only READS both declarations (P3, P4). Flipping either by heuristic is forbidden per `docs/anti-patterns.md` ("Flipping `figma_track` (or any future opt-in gating key) by heuristic").

7. **Never query the Figma MCP.** Neither this command nor `visual-verifier` has a Figma-MCP tool or mechanism; both read only already-persisted Design Spec + reference PNG evidence already on disk (`docs/anti-patterns.md`, "Querying the Figma MCP from a dispatched writer/reviewer agent").

8. **Never prompt the user.** Past the interactivity boundary. HALTs are surfaced verbatim and the command exits.

9. **Never skip the Decision Gate evidence block.** The command-level gate (above) is mandatory.

---

## What you do NOT do

- **Mutating plan status** — see Constraints #2. The plan file at `<plan_path>` is byte-identical before and after.
- **Performing D8 mutations** — see Constraints #3.
- **Running an internal loop** — single-shot only. No retries, no budget envelope, no post-visual fix round, no deterministic revert.
- **Editing application source** — see Constraints #4. That is exclusively `/relay-implement`'s Phase A.3.4 concern.
- **Flipping `figma_track` (or any gating key) by heuristic** — reads only; never writes `docs/context/methodology.md`.
- **Reviewing a plan whose trailing status is `DRAFT`** — caught at P2; the plan has not been implemented yet.
- **Reviewing a non-Figma-sourced plan** — caught at P4; there is nothing to check without `design_source: figma`.
- **Cross-PRD / cross-plan orchestration** — single plan per invocation.
- **`--no-visual` flag** — not applicable; this command's entire purpose is to run the visual check, unlike `/relay-implement`'s optional Phase A.3.4 sub-phase.
