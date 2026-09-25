# Code-review evaluation: relay `code-reviewer` vs Claude Code `/code-review`

- **Date:** 2026-09-21
- **Registration:** `docs/decisions.md` [2026-09-21] "Evaluating relay's code review against Claude Code's built-in `/code-review` is a registered evaluation" (doc-site entry 98)
- **Environment:** Claude Code 2.1.257 desktop app (Windows 11), model Opus 5; `/code-review` as shipped in that build
- **Companion files:** `findings-sheet.md` (one row per finding, with preliminary and operator labels) and `build-samples.sh` (rebuilds the pinned sample set)

## Proposed outcome

**Improve.** Keep `code-reviewer` as the verdict owner in both surfaces. Through a PRD, add a `/code-review` pass as a supplementary evidence source for R-SEM inside `/relay-implement` Phase A.3. Leave `/relay-code-review` unchanged. Keep `xhigh`, `max` and `ultra` out of the pipeline.

The reasoning, in short:
- **Replacing** fails the contract. `/code-review` returns no verdict, has no R-X, no arbitration and no log. Its output shape changes with the effort level. At `max` it reads and writes outside the review target.
- **Keeping** leaves real defects unfound. On 3 attempts relay APPROVED, `/code-review high` reported 16 findings. At least 5 are defects confirmed by later fixes or still present in `development`, including a shell-quoting bug in `/relay-commit` that is still shipped.

## 1. Reachability spike (question 3)

The [2026-07-22] Figma spike is the precedent: prove it empirically in the context the loop runs in.

| Probe | Context | Result |
|---|---|---|
| A | `general-purpose` subagent dispatched via `Task` (the dispatch primitive the loop uses) | **Reachable.** `Skill` is a loaded tool. `Skill("code-review", "low <path>")` ran as a forked execution with no prompt, and found both seeded bugs in a throwaway repo (off-by-one, wrong divisor). |
| A' | same, args `"low"` only | Ran, but reviewed the **session's primary working directory**, not the subagent's `cd`. The target path must be passed in `args`. |
| B | `relay:code-reviewer` dispatched via `Task` | **Not reachable as declared.** Its tools are `Read, Write, Glob, Grep, Bash, Agent`. There is no `Skill` and no `ToolSearch`. The agent frontmatter's `Task` is surfaced as `Agent`. |
| C | headless `claude -p "/code-review low"` | **Not determined.** The CLI's OAuth session had expired, so the run failed before the skill loaded. This is an environment failure, not a finding about the skill. |

Consequences:
- The in-loop surface **is** a candidate. It is reachable from a `Task`-dispatched subagent, provided either (a) the command dispatches a `general-purpose` subagent that invokes the skill, or (b) `code-reviewer`'s `tools:` gains `Skill`. That choice belongs to the PRD.
- **Headless reachability** must be proven separately before any CI or unattended use.
- **The output is not a stable contract.** At `low`/`medium`/`high` the fork returns free text in `file:line — description` form. At `xhigh`/`max` it returns a JSON array of `{file, line, summary, failure_scenario}`. Every run said the host's `ReportFindings` tool was absent in a subagent, which is why it fell back to text.

## 2. Benchmark corpus and method (question 2)

### Corpus

- **Verdict logs:** 99 `PRPs/plans/*.code-review.jsonl`, holding 150 verdicts (103 APPROVED, 47 CHANGES_REQUESTED, 2 arbitration).
  - Of the 47 CHANGES_REQUESTED verdicts, **41 failed a judgment row** (R-SEM or R-COH-*) and **6 failed only mechanical rows** (R-S*/R-L*). R-X never failed in this repository.
  - Row failure counts: R-COH-OTHER-INTERNAL-CONTRADICTION 36, R-SEM 18, R-COH-COMMENT-MISMATCH 9, R-L3 3, R-COH-TASK-CONTRADICTION 3, R-COH-REGISTRY-MISSING 2, R-L2 2, R-S1/R-S2/R-S3/R-L1 1 each.
- **Patches:** 75 archived `attempts/<i>/diff.patch`. Of these, 58 record a base commit and 70 map to a verdict. **Only 18 touch a code file**; the other 57 are prose (agent prompts, commands, docs).
- **Target-project diffs:** none were provided. See Limitations.

### Sample

A stratified fixed sample of 12 attempts: code and prose, CHANGES_REQUESTED and APPROVED. 10 samples rebuilt cleanly and are the basis of every number below (see `findings-sheet.md`). Each sample was rebuilt as a standalone repo (`build-samples.sh`):
- the base commit's tree without `PRPs/` is committed as HEAD;
- earlier phases of the same feature are applied and committed on top;
- the attempt's patch is applied to the working tree and marked intent-to-add.

**Methodology finding:** in multi-phase features the per-phase `diff.patch` files are relative to the shared base commit but are **not cumulative**. A naive rebuild leaves out the earlier phases' uncommitted work, and the reviewer then reports "X does not exist" defects that are rebuild artifacts. The first runs on s5, s6 and s9 showed exactly that; they were rebuilt as s5f, s6f and s9f and re-run. Two samples (s11, s14) could not be rebuilt cleanly and are excluded. Any future replay of this corpus, and the drift regression set, must apply prior phases first.

### Runs

- **Harness:** one `general-purpose` subagent per run, invoking `Skill("code-review", "<level> <path>")` once, with no `--fix` and no `--comment`, and checking `git status --porcelain` before and after.
- **Tree integrity:** every run left the target tree byte-identical.
- **Coverage:**
  - 15 `high` runs: 12 samples, plus 3 clean rebuilds.
  - An effort sweep on the two cleanest samples: s2 (code) and s13 (prose), at `low`, `medium`, `high`, `xhigh` and `max`.
- **Relay's side:** taken from the archived verdicts, which were produced when those attempts were reviewed in the loop. It was not re-run.

## 3. Results

### 3.1 Detection at `high`, 10 clean samples

| | relay `code-reviewer` (archived) | `/code-review high` |
|---|---|---|
| Judgment findings reported (R-SEM / R-COH-*) | 12 | 44 |
| Findings shared with the other reviewer | 5 (4 full, 1 partial) | 5 |
| Findings unique to this reviewer | 7 | 39 |
| Findings on the 3 attempts relay APPROVED (s4, s5f, s12) | 0 | 16 |

Relay's 7 unique findings fall into three groups:
- **3 are plan-aware**: R-COH-TASK-CONTRADICTION and R-SEM findings that need the plan or its Validation Commands. `/code-review` structurally cannot produce these.
- **3 are internal contradictions within prose.**
- **1 was reported by `/code-review` in one run and missed in the clean rerun** (s9 vs s9f): run-to-run non-determinism.

`/code-review`'s unique findings, with preliminary labels (see `findings-sheet.md`):
- **Still present in `development`, 10 distinct defects:**
  - `/relay-commit`'s unescaped `commit -m "<PRD title>"` (high; shell quoting or injection).
  - `generate-final-report.mjs` and `relay-implement.md` take the last `review.jsonl` line as the approving verdict without checking `verdict`.
  - `efficiency.mjs` drops entries without `failClasses` although its comment says they count as blocking.
  - The `<basename>` ambiguity in `relay-implement.md` (with or without `.plan.md`).
  - `docs-updater`'s `worktree` mode uses bare `git diff`, which misses staged and untracked changes.
  - `docs-reviewer` has no `diff_source`.
  - `dispatch-graph`'s `NEXT_POINTER_RE` has no lookbehind.
  - `version-parity`'s heading regex silently skips headings with inline markup.
  - `version-parity`'s strict equality against the AGENTS.md §7.5 patch exemption. This one is a contract question for the operator.
- **Later fixed, 4 defects:** the `relay:x` colon in `dispatch-graph` (relay APPROVED that attempt); the unanchored version token; the missing `feature` / `prd_path` inputs; the `path-existence` over-reporting.
- **False positive in this environment, 1:** `native-validate` assumes `claude.cmd` on Windows. This host has a native `claude` executable and the check runs.
- **Open:** the rest. Mostly low severity, often latent (a real mechanism with no reachable trigger yet).

True and false positives are **the operator's call**. The preliminary labels are evidence, not verdicts.

### 3.2 Effort-level sweep

| Level | s2 (code): wall s / findings | s13 (prose): wall s / findings | Covers relay's findings? | Output shape |
|---|---|---|---|---|
| low | 22 / 3 | 19 / 2 | s2: yes (comment mismatch named explicitly); s13: no | text |
| medium | 49 / 3 | 96 / 5 | s2: yes; s13: 1 of 2 | text |
| high | 43 / 2 | 80 / 4 | s2: partial; s13: 1 of 2 | text |
| xhigh | 262 / 15 | 264 / 15 | s2: yes; s13: 2 of 2 | JSON array |
| max | 4395 / 15 | 3892 / 15 | s2: yes; s13: 2 of 2 | JSON array (capped at 15; extra findings cut) |

Across all 15 `high` runs, wall time had a median of about 75 s (range 43–133 s).

**Tokens:**
- **`low` to `xhigh`:** the fork's tokens are not attributed to the dispatching subagent. Its reported total stayed at about 62–69k whatever the level, so the fork's own usage could not be measured.
- **`max`:** it fans out about 10 finder agents and one verifier per candidate. The child agents that could be observed consumed about 2.0M tokens on s2 and at least 2.3M on s13 (verifiers alone), for one review each.
- **relay's reviewer:** no comparable number exists. The verdict logs record no tokens or duration, and 45% of historic timestamps are degraded. Measuring it is a precondition for the PRD's cost gate.

### 3.3 Behaviors that bear on the contract (question 4)

- **No verdict.** No level returns APPROVED / CHANGES_REQUESTED or per-row outcomes. A consumer would have to derive a verdict.
- **Non-determinism.** Findings differ between levels and between repeated runs of the same level. On s9, relay's R-COH finding was reported once and then missed in the clean rerun. This is the "moving target" failure mode the 2026-08 plan-pair analysis blamed for retries.
- **Side effects at `max`**, all outside the target tree; the target itself was never modified:
  - Finder and verifier agents wrote probe scripts and ran `npm install` on copies in the scratchpad.
  - Agents read the session's primary checkout, including files created after the reviewed change ("the later tree", "the Phase 2 plan") and the operator's `.claude/settings.local.json`.
  - One run hit the subagent concurrency limit, and its completion notices never arrived.

  That breaks the spirit of [2026-08-28] (reviewers never mutate) and contaminates any benchmark with hindsight. The `max` results on s13 openly cite what "Phase 2 later" did.
- **`--fix`** was never used and stays excluded ([2026-08-28]).

## 4. The seven questions

1. **What is compared.** The two surfaces are separate decisions.
   - **In-loop (A.3):** improve with a hybrid. `/code-review` supplies candidate findings, and `code-reviewer` adjudicates them into R-SEM rows and still owns the verdict, R-X, arbitration and the jsonl log.
   - **Standalone `/relay-code-review`:** keep unchanged. It is the plan-conformance surface. `/code-review` is already directly available to any user who wants a bug hunt, so wrapping or replacing it adds nothing.
2. **Benchmark.** See section 3. The 10-sample `high` comparison and the 2-sample sweep are the measured basis, and the operator's labels in `findings-sheet.md` finalize TP/FP.
3. **Reachability.** Proven from a `Task`-dispatched `general-purpose` subagent. Not reachable from `code-reviewer` as currently declared. Headless is unproven.
4. **Contract preservation.** The hybrid keeps every loop invariant:
   - `code-reviewer` still emits the machine-readable verdict.
   - R-X stays a script-hash straight fail.
   - No reviewer mutates: no `--fix`, and `max` is excluded because of its side effects.
   - The verdict log keeps its shape. At most it gains an additive `source` field, via the `CONSUMERS` registry, so `efficiency.mjs` and `usage-metrics.mjs` still read it.

   `/code-review` findings enter as **advisory by default** under the [2026-08-06] materiality taxonomy. A finding becomes blocking only when `code-reviewer` confirms it is reachable in the diff under review. Otherwise the extra findings would inflate CHANGES_REQUESTED and bring back moving-target retries.
5. **Versioning and drift.** Pin `build-samples.sh` plus the `MATCH-RELAY` and `STILL-PRESENT` rows of `findings-sheet.md` as a regression set. Re-run it at the chosen level on every Claude Code version change the operator adopts. Recall falling below a threshold the PRD sets disables the hybrid pass, which falls back to today's reviewer and is logged, until the set is re-baselined.
6. **Overlap with entries 96 and 97.**
   - **After 96:** R-S2 and R-L1–R-L3 leave the LLM (deterministic), and R-S1 and R-S3 become hybrid. That leaves R-SEM, R-COH-COMMENT-MISMATCH, R-COH-OTHER-INTERNAL-CONTRADICTION, R-COH-TASK-CONTRADICTION and arbitration as judgment work. Only R-SEM and the two non-plan R-COH rows overlap with `/code-review`. R-COH-TASK-CONTRADICTION and arbitration are plan-anchored and stay relay-only.
   - **After 97:** reuse, simplification and efficiency findings belong to the simplify pass. The `xhigh`/`max` "cleanup" items are therefore not a reason to raise the level, which is another argument for `medium`/`high` in the loop.
7. **`ultra`.** Stays outside the pipeline. At most, an operator-triggered, billed step before `/relay-pr`, which is never invoked by relay. `max` should be treated the same way, given its cost and side effects.

## 5. Limitations

- **The corpus is relay's own repository** and 57 of 75 patches are prose. The memory note on the efficiency initiative already records that relay is not representative. No target-project diffs were available. The PRD must include a target-project dogfood before the hybrid is on by default.
- **Relay's side was not re-run.** Its archived verdicts come from earlier prompt versions of `code-reviewer`, so the comparison is "relay as it reviewed then" vs "`/code-review` today".
- **`/code-review` tokens below `max` were not observable**, and relay's reviewer cost is unrecorded.
- **The sweep covers 2 samples**, and `max`'s s13 result is contaminated by hindsight.

## 6. If the outcome is improve

The next step is `/relay-prd` for the in-loop hybrid pass. The PRD must decide:
- the dispatch mechanism: a command-side `general-purpose` subagent, or `Skill` in `code-reviewer`'s tools;
- the level (`medium` or `high`);
- the explicit worktree path in `args`;
- the advisory-by-default intake into R-SEM;
- the log's additive field;
- the regression-set drift gate;
- an opt-in `methodology.md` key;
- headless reachability;
- a target-project dogfood.

No command, agent or rubric changes until that PRD is approved.
