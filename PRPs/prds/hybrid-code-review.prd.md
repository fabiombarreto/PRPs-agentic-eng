# Hybrid Code Review — `/code-review` as advisory evidence for R-SEM

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting change to a reviewer agent and to the `/relay-implement` loop; new consumer-visible field in a verdict log; new opt-in gating key
- Decisions found: [2026-09-21] "Code-review evaluation outcome: improve" (mandates this PRD and fixes its scope: verdict ownership, advisory intake, level ceiling, drift gate); [2026-08-28] "Review agents never mutate the target working tree" and R-X cleared only by the computed equivalence report; [2026-08-26] an R-SEM finding is not self-executing test-edit authorization; [2026-08-06] BLOCKING/ADVISORY materiality taxonomy plus the advisory pass-through to the implementer; [2026-09-17] entries 96 (mechanical checks move to deterministic scripts) and 97 (a simplification pass before code review); [2026-07-31] the `CONSUMERS` registry for verdict-log readers; [2026-07-09] a `Task`-dispatched subagent never reaches the user
- Applicable anti-patterns: "Mutating a target project's working tree from a review agent"; "Treating an R-SEM finding as self-executing test-edit authorization"; "Clearing an R-X match on anything other than the computed equivalence report"; "Relying on interactive permission prompts in the autonomous loop"; "Flipping `figma_track` (or any future opt-in gating key) by heuristic"; "Writing pipeline artifacts under `.claude/`"
- Applicable architectural rules: the writer/reviewer pair model, where the reviewer owns the verdict and the command owns the D8 mutations; the interactivity boundary (the autonomous stretch never prompts); the diff-base contract for any diff a guard reads; `PRPs/` artifact paths
- Result: PROCEED
```

## Problem Statement

`code-reviewer` approves diffs that carry real correctness defects. In the 2026-09-21 evaluation (`PRPs/reports/code-review-evaluation/`), Claude Code's built-in `/code-review` reported 16 findings on 3 attempts relay had APPROVED, and at least 5 of those are genuine defects — either fixed later or still shipped, such as `/relay-commit`'s unescaped `commit -m "<PRD title>"`. The rubric is plan-anchored by design, so bug-hunting breadth rests on a single row (R-SEM), and defects that a dedicated bug hunt would catch reach the PR instead.

## Evidence

- On the 3 sampled attempts relay APPROVED, `/code-review high` reported 16 findings; at least 5 are real (`PRPs/reports/code-review-evaluation/findings-sheet.md`, samples s4, s5f, s12).
- Still present in `development`: the unescaped `commit -m` in `relay-commit.md:195`, the unchecked `verdict` on the last `review.jsonl` line (`generate-final-report.mjs`, `relay-implement.md:304`), and `efficiency.mjs:163` dropping entries without `failClasses` although its comment says they count as blocking.
- Judgment rows already carry the load: 41 of 47 `CHANGES_REQUESTED` verdicts across 99 logs failed R-SEM or an R-COH-* row, and only 6 failed mechanical rows alone (`report.md` §2).
- Reachability was proven empirically: a `Task`-dispatched subagent invoked `Skill("code-review", "<level> <path>")` with no prompt and found both seeded bugs. Without an explicit path the skill reviews the session's primary working directory (`report.md` §1).
- Industry practice supports advisory-first intake: teams that block on every finding see about 40% of developers bypass the gate within a week ([zylos.ai](https://zylos.ai/research/2026-07-24-adversarial-code-review-cycles-ai-agent-pairs/)), and CodeRabbit measured only 52 of 89 comments as actionable ([deepsource](https://deepsource.com/resources/ai-code-review-tools)).
- `code-reviewer` already merges a bounded external judgment pass into its own rubric: `code-reviewer-semantic` returns strict JSON and degrades to a single `passed: true` row rather than halting (`code-reviewer-semantic.md`).

## Proposed Solution

`code-reviewer` gains the `Skill` tool and, when the target project opts in, runs one `/code-review` pass at `medium` or `high` over the attempt's diff before it judges R-SEM, passing the worktree path explicitly in the skill arguments. The returned findings are **evidence the reviewer adjudicates**, not verdicts: each is classified `advisory` by default and becomes blocking only when the reviewer confirms the finding is reachable in the diff under review. Everything that makes the reviewer load-bearing is untouched — it still emits the single machine-readable verdict, still fails R-X only through the computed equivalence report, still routes test disagreements through `TEST_CONTRACT_DISPUTE`, and still appends one line per verdict to `<basename>.code-review.jsonl`. The alternative of replacing the reviewer was rejected in the evaluation, because `/code-review` has no verdict, no R-X, no arbitration and no log, and varies between runs. Running the pass inside the reviewer (rather than command-side) was chosen so the agent that judges is the agent that collected the evidence, with no intermediate artifact contract to keep in sync.

## Key Hypothesis

We believe that feeding `code-reviewer`'s R-SEM row with `/code-review` findings at `medium` or `high`, admitted as advisory by default and promoted to blocking only on confirmed reachability, will reduce the correctness defects relay approves, for operators running the pipeline against real code.

We'll know we're right when the pinned sample set recovers its known defects, a target-project dogfood surfaces at least one real defect relay alone would have approved, and attempts per phase do not rise materially.

## What We're NOT Building

- **`xhigh`, `max`, and `ultra` levels** — `max` took 65 to 73 minutes and over 2M tokens per review, and its sub-agents wrote probe files, ran `npm install`, and read outside the review target, including later-dated artifacts. `ultra` is billed and user-triggered. All three are refused by name, not merely left unused.
- **`--fix` and `--comment`** — a reviewer never mutates the tree ([2026-08-28]) and never posts outward on its own.
- **Any change to `/relay-code-review`** — its contract is read-only and plan-anchored, and the evaluation kept it unchanged.
- **Any change to R-X, to the arbitration outcomes, or to the dispute channel** — an admitted finding never authorizes a test edit ([2026-08-26]).
- **Headless or CI use** — documented as supported by Claude Code, but unproven here; the gate stays closed until a spike proves it.
- **`class` on rows other than R-SEM** — deferred; adopting it wholesale is a separate decision about the consumer contract.
- **Replacing `code-reviewer-semantic`** — the R-COH-* layer is unaffected.
- **Heuristic activation** — the opt-in key is declared, never inferred.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Recall on the pinned sample set | At least 8 of the 10 distinct `STILL-PRESENT` defects | Re-run `PRPs/reports/code-review-evaluation/build-samples.sh` and count recovered `STILL-PRESENT` + `MATCH-RELAY` defects |
| First-attempt `CHANGES_REQUESTED` rate | At most 39.3% (no more than 5 points above the 34.3% baseline) | `scripts/efficiency.mjs`, comparing markers before and after with day-apart boundaries |
| Attempts per phase | At most 1.60 (baseline 1.49) | `scripts/efficiency.mjs`, same marker comparison |
| Added wall time per review | At most 150 s (twice the 75 s median measured at `high`) | The pass's own recorded duration on the verdict row |
| `/code-review` passes per review | Exactly 1 | Count of pass invocations recorded per verdict in `<basename>.code-review.jsonl` |
| Real defects found in a target-project dogfood | At least 1 that relay alone approved | Operator judgment on the dogfood run |

Every threshold above is derived from the 2026-09-21 measurements and is revisable in Phase 5, which is where the post-change numbers are read. The baseline cost of `code-reviewer` without the pass is a Phase 1 deliverable rather than a success metric, so it is recorded there and not listed here.

## Acceptance Criteria (test scenarios)

- **AC-1 Opt-in gate:** Given a target project whose `docs/context/methodology.md` does not declare the hybrid key, when `code-reviewer` runs in `mode: standard`, then no `/code-review` pass is invoked and the emitted `rubric[]` is shaped exactly as it is today.
- **AC-2 Declared activation, never inferred:** Given the key declared true, when the reviewer runs, then exactly one `/code-review` pass is invoked at the configured level; and given any other file content (a PRD, a plan, a diff) that merely mentions `/code-review`, then the pass is never activated by that mention.
- **AC-3 Explicit path:** Given the reviewer runs against a worktree at `<path>`, when it invokes the skill, then the skill arguments contain `<path>` verbatim, so the review targets that tree and not the session's primary working directory.
- **AC-4 Level ceiling refused by name:** Given a configured level of `xhigh`, `max`, or `ultra`, or a flag of `--fix` or `--comment`, when the reviewer resolves the pass configuration, then the pass is refused with a named reason recorded on the R-SEM row, and the reviewer proceeds without it.
- **AC-5 Advisory by default:** Given the pass returns N findings and the reviewer confirms none of them reachable in the diff under review, when it emits R-SEM, then R-SEM is `passed: true`, the row carries `class: advisory`, and the verdict is unchanged from what it would have been without the pass.
- **AC-6 Promotion on confirmed reachability:** Given the pass returns a finding the reviewer confirms is reachable in the diff under review and high-severity, when it emits R-SEM, then that row is `passed: false` with `class: blocking`, the reason names the confirmed finding, and the verdict is `CHANGES_REQUESTED`.
- **AC-7 Graceful degradation, never a halt:** Given the pass errors, returns unparseable output, or exceeds its own timeout, when the reviewer continues, then it emits R-SEM from its own judgment alone, records a named degraded reason, and never halts and never prompts the operator.
- **AC-8 Log stays machine-readable for its consumers:** Given a verdict written with the pass active, when `usage-metrics.mjs` and `scripts/efficiency.mjs` read the line, then both parse it without error, every new value is a code, a non-negative integer, a timestamp, or `-`, and no free-text column is introduced.
- **AC-9 Contract preserved:** Given a diff that touches a test-glob path, when the reviewer runs with the pass active, then R-X still fails unless cleared by the computed equivalence report; and given an admitted finding that concerns a test, then it does not authorize a test edit and still routes through `TEST_CONTRACT_DISPUTE`.
- **AC-10 Budget isolation:** Given the pass runs, when the loop accounts for time, then the pass's duration counts against `max_implement_minutes` but never consumes `max_implement_retries`, and a pass that would exceed the remaining wall clock is skipped with a recorded reason rather than overrunning it.
- **AC-11 Read-only over the target:** Given the pass runs, when it returns, then `git status --porcelain` on the target tree is byte-identical to its value immediately before the pass.
- **AC-12 Drift gate:** Given the pinned sample set is re-run and recall falls below the configured threshold, when the gate evaluates the result, then the hybrid pass is disabled with a logged reason and the reviewer falls back to today's behavior until the set is re-baselined.

## Open Questions

- [ ] Default level: `medium` or `high`? The sweep showed `medium` reporting more findings than `high` on the prose sample and the same on code, so the choice is not obvious.
- [ ] Does the opt-in key ship defaulting to off for every project, including this one?
- [ ] Cap on how many findings are passed into the adjudication, to bound both tokens and noise.
- [ ] Who runs the drift gate: a `npm run validate` check, a dedicated command, or a manual step at plugin-update time?
- [ ] Reachability of the skill from inside an agent that also holds `Bash` — the spike proved it from `general-purpose`, not from a tools-restricted reviewer.
- [ ] Whether the pass should be skipped on a retry attempt whose diff differs only by the previous round's requested fixes.

---

## Users & Context

**Primary User**
- **Who:** the relay operator running `/relay-execute` or `/relay-implement` against a target project that contains real code, rather than prompts and docs alone.
- **Current behavior:** trusts the reviewer's APPROVED and merges; a bug hunt, if it happens at all, happens after the fact and by hand.
- **Trigger:** every attempt that reaches Phase A.3.
- **Success state:** correctness defects surface inside the loop, before the D8 mutations, without inflating retries.

**Job to Be Done**
When the implementer delivers an attempt, I want the review to cover correctness bugs as well as plan conformance, so I can trust that what reaches the PR carries no defect a dedicated bug hunt would have found.

**Non-Users**
Operators of the standalone `/relay-code-review` (unchanged); headless and CI runs (until reachability is proven); projects that have not opted in; anyone wanting `xhigh` or above, which stays a manual, operator-triggered activity outside the pipeline.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | One `/code-review` pass inside `code-reviewer`, via `Skill`, at `medium` or `high`, with the worktree path passed explicitly | The capability itself; the path is what makes it review the right tree |
| Must | Advisory-by-default intake into R-SEM, with promotion only on confirmed reachability | Keeps noise from inflating rejections; the [2026-08-06] taxonomy already exists |
| Must | `class` on the R-SEM row, plus the additive verdict-log fields the consumers accept | Makes the advisory/blocking split measurable rather than invisible |
| Must | Opt-in key in `methodology.md`, declared and never inferred | Anti-pattern: no heuristic flipping of a gating key |
| Must | Graceful degradation with a named reason on error, unparseable output, or timeout | The loop is autonomous; a review pass must never halt or prompt |
| Must | Refusal by name of `xhigh`, `max`, `ultra`, `--fix`, `--comment` | Cost and side effects measured in the evaluation |
| Must | Target-project dogfood before the pass is on by default | The benchmark corpus is relay's own and mostly prose |
| Should | Baseline measurement of `code-reviewer`'s own tokens and wall time | Today unrecorded, so "added cost" has no denominator |
| Should | The drift gate over the pinned sample set | Guards an unversioned dependency |
| Could | `class` on every code-review rubric row | Consistency with plan-review, but a separate consumer decision |
| Could | Reusing the pass's findings as input to the docs-sync or simplify stages | Speculative |
| Won't | Any use in `/relay-code-review`, headless, or CI | Out of scope per the evaluation and unproven reachability |
| Won't | Changes to R-X, arbitration, or the dispute channel | Contract preservation |
| Won't | `/code-review` owning any verdict | It emits none |

### MVP Scope

Phases 1 through 4 plus the dogfood in Phase 5: the opt-in key and log contract, the pass itself with its timeout and degradation, the adjudication rule in R-SEM, the drift gate, and one dogfood run against a target project with real code. The dogfood is last because it depends on the gate being in place before the pass is recommended as a default.

### User Flow

The operator declares the key in the target's `methodology.md` and runs `/relay-execute` as usual. Phase A.2 returns `IMPLEMENTATION_COMPLETE`; Phase A.3 dispatches `code-reviewer` exactly as it does today; the reviewer runs its own `/code-review` pass over the attempt's diff, adjudicates the findings into R-SEM, and emits one verdict. On `CHANGES_REQUESTED` the loop retries with the reviewer's reasons, including any promoted finding. On `APPROVED` the command performs the D8 mutations unchanged. The operator sees the result in the same summary and log as before, with the advisory count visible.

---

## Technical Approach

**Feasibility:** MEDIUM

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

### Architecture Notes

- **Dispatch via `Skill` inside `code-reviewer`** (operator decision, 2026-09-21). The agent's `tools:` gains `Skill`, which the [2026-09-21] entry explicitly left for this PRD. The judging agent is therefore the collecting agent, and no intermediate artifact contract is needed. The command-side `general-purpose` subagent was the rejected alternative.
- **`code-reviewer-semantic` is the shape to mirror**: a bounded pass whose output is merged into `rubric[]`, whose failure degrades to a documented `passed: true` row, and which never halts the run.
- **The skill runs as a fork and returns prose** at `medium` and `high`. It is therefore treated as evidence for the reviewer to read, never parsed as a structured contract. This is why the level ceiling matters: `xhigh` and above change the output shape and the behavior.
- **First advisory producer outside plan-review.** 0 of 2,184 existing code-review rubric rows carry `class`, and an absent `class` reads as blocking. Introducing it on R-SEM must keep that default intact for every other row.
- **The closed log contract holds**: every consumer column is a code, an integer, a timestamp, or `-`, with no prose column. New fields register with `CONSUMERS`.
- **Pre-flight ordering**: the loop checks time, retry, oscillation, then dispute before each dispatch. The pass sits inside the reviewer's turn, so it must respect the remaining wall clock without consuming a retry.
- **Degradation precedent**: `code-review-registries.md` shows the shape of an opt-in that self-skips silently with a recorded reason when undeclared.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Noise turns into retries (the measured actionable rate elsewhere is about 58%) | M | Advisory by default; promotion only on confirmed reachability; a cap on findings admitted; measure the first-attempt rejection rate against the pre-change baseline |
| Free-text output is misread as a contract | M | Treat the return as prose evidence; any parse failure degrades to a named `passed: true` reason; refuse the levels that change the output shape |
| Added latency inside a 45-minute budget | M | The pass gets its own timeout, never consumes a retry, and is skipped with a recorded reason when the remaining wall clock is short |
| Non-determinism makes the same diff yield different verdicts across attempts | M | Only confirmed-reachable findings can block, which is the same guard that keeps advisory noise out; the drift gate measures the tool's behavior over a fixed set |
| The skill acts outside the target tree | L at `medium`/`high`, observed at `max` | Level ceiling refused by name; AC-11 asserts the target tree is untouched |
| Drift in an unversioned dependency | M | The pinned sample set, re-run on adopted version changes, with a disable-on-regression gate |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Contract and opt-in | The `methodology.md` key, the `class` field on R-SEM plus the additive verdict-log fields and their `CONSUMERS` registration, and a recorded baseline of the reviewer's own cost. No pass is dispatched yet. | pending | - | - | - | - |
| 2 | The pass | `code-reviewer` gains `Skill`, invokes one `/code-review` at the configured level with the explicit path, enforces the level and flag refusals, its own timeout, and the degradation reasons. Findings are recorded but do not yet influence the verdict. | pending | - | - | 1 | - |
| 3 | Adjudication in R-SEM | The advisory-by-default intake, the reachability confirmation that promotes a finding to blocking, the findings cap, and the interaction with R-X and the dispute channel. | pending | - | - | 2 | - |
| 4 | Drift gate | The pinned sample set wired as a repeatable check, with the recall threshold and the disable-on-regression fallback. | pending | - | - | 3 | - |
| 5 | Dogfood and measurement | A run against a target project with real code, plus the before/after reading through `efficiency.mjs` and the usage-metrics corpus, and the decision on the default level and default-on. | pending | - | - | 4 | - |

### Phase Details

**Phase 1: Contract and opt-in**
- **Goal:** make the hybrid expressible and measurable before anything dispatches it.
- **Scope:** the declared key and its template entry; `class` on the R-SEM row with the absent-reads-as-blocking default preserved; the additive verdict-log fields inside the closed contract; `CONSUMERS` registration; the baseline cost measurement.
- **Success signal:** a verdict written with the key off is byte-identical in shape to today's; consumers parse a verdict written with the key on; the baseline number is recorded.

**Phase 2: The pass**
- **Goal:** the reviewer can run `/code-review` over the right tree, safely.
- **Scope:** `Skill` in `tools:`; one invocation per review with the explicit path; refusal by name of `xhigh`, `max`, `ultra`, `--fix`, `--comment`; the pass timeout; the named degradation reasons; findings recorded without verdict influence.
- **Success signal:** with the key on, a review records the pass outcome and the target tree is untouched; with the skill unavailable, the review completes with a degraded reason and no halt.

**Phase 3: Adjudication in R-SEM**
- **Goal:** findings influence the verdict only under the materiality rule.
- **Scope:** advisory-by-default intake; the reachability confirmation and promotion; the findings cap; explicit non-interference with R-X and `TEST_CONTRACT_DISPUTE`.
- **Success signal:** an unreachable finding leaves the verdict unchanged and shows as advisory; a confirmed reachable high-severity finding produces `CHANGES_REQUESTED` naming it.

**Phase 4: Drift gate**
- **Goal:** detect the unversioned skill changing under relay.
- **Scope:** the pinned set as a repeatable run, the recall threshold, the disable-and-log fallback, and the re-baselining procedure.
- **Success signal:** a deliberately degraded expectation set trips the gate and disables the pass with a logged reason.

**Phase 5: Dogfood and measurement**
- **Goal:** decide the defaults on evidence from real code.
- **Scope:** one target-project run; the before/after measurement; resolution of the default level and whether the key ships on.
- **Success signal:** at least one real defect found that relay alone approved, with the cost and retry deltas recorded.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Dispatch mechanism | `Skill` in `code-reviewer`'s `tools:` | A command-side `general-purpose` subagent that hands findings to the reviewer | Operator decision, 2026-09-21. The judging agent collects its own evidence, and no intermediate artifact contract has to be defined or kept in sync |
| `class` field scope | R-SEM row only in the MVP | Every code-review rubric row at once | Operator decision, 2026-09-21. Keeps the first use of the taxonomy outside plan-review as small as possible; 0 of 2,184 existing rows carry it and absent must keep reading as blocking |
| Intake materiality | Advisory by default, promoted only on confirmed reachability | Blocking on any high-severity finding | Measured noise elsewhere is about 42% non-actionable, and blocking-everything drives bypass; the [2026-08-06] taxonomy already models this |
| Level ceiling | `medium` or `high` only, higher levels refused by name | Allowing `xhigh` for depth | `max` cost 65 to 73 minutes and over 2M tokens, wrote files, ran `npm install`, and read outside the target |
| Verdict ownership | `code-reviewer`, unchanged | `/code-review` deriving a verdict | It emits none, varies between runs, and has no R-X, arbitration, or log |
| Standalone surface | `/relay-code-review` untouched | Adding the pass there too | Its contract is read-only and plan-anchored; operators can run `/code-review` directly |
| Success thresholds | Derived from the 2026-09-21 measurements (10 known defects, 34.3% first-attempt rejection rate, 1.49 attempts per phase, 75 s median at `high`), revisable in Phase 5 | Leaving them unquantified until the baseline exists | First proposed as `TBD`; the rubric requires a target and a method on every metric row, and deriving from measured numbers avoids inventing them. The reviewer's own cost baseline moved to Phase 1 as a deliverable rather than a metric |

---

## Research Summary

**Market Context**
Production AI-review setups use severity tiers and block only the top one; teams that block everything see about 40% of developers bypass the gate within a week ([zylos.ai](https://zylos.ai/research/2026-07-24-adversarial-code-review-cycles-ai-agent-pairs/)). AI reviewers are measurably non-deterministic on identical diffs, and a 30-PR test found 52 of 89 CodeRabbit comments actionable, with noise growing on large PRs ([deepsource](https://deepsource.com/resources/ai-code-review-tools)). CodeRabbit votes across several frontier models before promoting a finding to a gating tier ([codacy](https://blog.codacy.com/ai-code-review-tools-compared-2026-why-most-cant-safely-block-a-merge-and-what-code-governance-fixes)). Golden sets for drift must be versioned and refreshed, since 30 to 50% of score movement between refreshes comes from dataset staleness rather than the model ([futureagi](https://futureagi.com/blog/llm-eval-data-drift-detection-2026/)). Claude Code documents skills working in `-p` mode via `/skill-name`, with `--bare` disabling skill discovery and background agents held by a 10-minute idle ceiling ([docs](https://code.claude.com/docs/en/headless)). Gap: no source documents this exact composition — a bug-hunting reviewer feeding a separate plan-anchored reviewer — so the pattern is inferred from ensemble and cascade practice.

**Technical Context**
Phase A.3 dispatches `code-reviewer` with `plan_path, target_root, mode, attempt, diff_target, review_started_at` and branches only on `verdict` (`plugins/relay/commands/relay-implement.md:403-417`). Pre-flight checks run in a fixed order before each dispatch (`relay-implement.md:291-336`). R-SEM fails on any high-severity finding or on accumulated medium findings, and low findings are already advisory (`plugins/relay/agents/code-reviewer.md:362-386`); an R-SEM finding never authorizes a test edit (`:388-398`). `code-reviewer-semantic` is the existing precedent for a bounded external judgment pass merged into `rubric[]` with graceful degradation. The `class`/`escalated` taxonomy today exists only in `plan-reviewer`, and 0 of 2,184 code-review and test-write-review rows carry `class` (`plugins/relay/resources/usage-metrics-schema.md:194-205`), with an absent value reading as blocking. Every consumer column is a code, an integer, a timestamp, or `-`, with no free-text column permitted (`:297-317`). `docs/context/code-review-registries.md:42-49` shows the silent-degradation shape for an undeclared opt-in. Gaps: nothing in the repository references the built-in `/code-review` yet, and the `open_advisories` pass-through mechanics were not read within the research budget and must be verified during planning.

---

*Generated: 2026-09-22*
*Approved: 2026-09-23*
*Status: APPROVED*
