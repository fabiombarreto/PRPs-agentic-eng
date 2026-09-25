# Code-review evaluation — findings judgment sheet

Companion to `report.md`. One row per finding. Findings from `/code-review high`
are listed for the 10 samples whose reconstruction is clean, together with
relay's findings on the same attempt (from the archived `code-review.jsonl`).

**Preliminary label** is the evaluator's evidence-based call. The **Operator** column
holds the operator's final true-positive / false-positive judgment.

**Operator judgment (2026-09-21):** the operator accepted the preliminary labels as
the TP/FP judgment. Rows labelled `OPEN` stay unjudged. The Operator column is left
blank for rows that follow their preliminary label.

Label vocabulary:
- `MATCH-RELAY`: the same defect relay reported on this attempt.
- `STILL-PRESENT`: the defect is still visible in `development` at `27cae4f`.
- `LATER-FIXED`: the code was later changed in the way the finding asks for.
- `FIXED-IN-LOOP`: relay's own loop fixed it on a later attempt.
- `LATENT`: the mechanism is real but nothing reachable triggers it.
- `ENV-FP`: false in this environment, checked directly.
- `OPEN`: no evidence either way; needs operator judgment.

Severity is the one `/code-review` assigned.

## s1 — validation-suite phase 1 attempt 1 (code). relay: CHANGES_REQUESTED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| R1 | relay | R-L2: a Level-2 validation command's grep matched the file's own JSDoc (mechanical; the plan command was wrong) | — | mechanical, out of scope after entry 96 | |
| C1 | /code-review | `version-parity.mjs`: strict equality breaks the AGENTS.md §7.5 doc-only patch exemption | med | STILL-PRESENT (`version-parity.mjs:119`); contract question | |
| C2 | /code-review | heading regex skips headings with inline markup or attributes before `id`, so the check falls through to an older release | low | STILL-PRESENT, LATENT (`:47`) | |
| C3 | /code-review | version match is unanchored and contradicts the "leading token" comment | low | LATER-FIXED (`:53` now `^\d+…`) | |

## s2 — validation-suite phase 1 attempt 2 (code). relay: CHANGES_REQUESTED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| R1 | relay | R-COH-COMMENT-MISMATCH: JSDoc says "first remaining heading", but the loop keeps scanning | — | same area as C2; the low/medium/xhigh/max runs name it explicitly | |
| C1 | /code-review | same as s1 C1 (patch exemption) | med | STILL-PRESENT | |
| C2 | /code-review | same as s1 C2 (regex skip, then fall-through) | low | STILL-PRESENT, LATENT; partial MATCH-RELAY | |

## s3 — validation-suite phase 2 attempt 1 (code). relay: CHANGES_REQUESTED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| R1 | relay | R-SEM (no reason recorded in the log) | — | unknown | |
| R2 | relay | R-COH-COMMENT-MISMATCH: the `path-existence.mjs` header's blanket claim about `CLAUDE_PLUGIN_ROOT` contradicts its own carve-out | — | not reported by /code-review | |
| R3 | relay | R-COH-TASK-CONTRADICTION: `checkFrontmatterSchema` signature differs from plan Task 3 | — | plan-aware; /code-review structurally cannot find this | |
| C1 | /code-review | `path-existence` flags user-project, runtime, and example paths, so validate fails permanently (166 findings when run) | high | FIXED-IN-LOOP or LATER-FIXED (validate is green today) | |
| C2 | /code-review | `registration-parity` runs the "stale" direction against the changelog history | med | OPEN | |
| C3 | /code-review | `dispatch-graph` `SUBAGENT_TYPE_RE` stops at `:` in `relay:x` | med | LATER-FIXED (`dispatch-graph.mjs:36` now allows `:`) | |
| C4 | /code-review | `NEXT_POINTER_RE` has no lookbehind, so path segments read as commands | low | STILL-PRESENT (`:42`) | |
| C5 | /code-review | `\b` agent match treats `-` as a word boundary (`code-reviewer` inside `code-reviewer-semantic`) | low | OPEN | |
| C6 | /code-review | `native-validate`: on Windows `claude` is `claude.cmd`, so the spawn fails and the check passes silently | low | ENV-FP here: `claude` is a native exe and the check runs (`ok:true` on this host) | |

## s4 — validation-suite phase 2 attempt 2 (code). relay: APPROVED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| C1 | /code-review | same as s3 C2 (changelog stale direction) | med | OPEN | |
| C2 | /code-review | same as s3 C6 (Windows `claude.cmd`) | med | ENV-FP | |
| C3 | /code-review | same as s3 C3 (colon in `subagent_type`); relay APPROVED this attempt | low | LATER-FIXED: a real defect relay approved | |
| C4 | /code-review | same as s3 C4 (`NEXT_POINTER` lookbehind) | low | STILL-PRESENT | |
| C5 | /code-review | `path-existence` / `artifact-naming` skip missing roots silently, so the check passes vacuously | low | OPEN | |
| C6 | /code-review | static imports of `ajv` / `node-html-parser` crash the runner without `npm install` | low | OPEN (documented setup step) | |
| C7 | /code-review | same as s3 C5 (`\b` boundary) | low | OPEN | |

## s5f — plan-review-materiality phase 4 attempt 1 (code + docs). relay: APPROVED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| C1 | /code-review | `generate-final-report.mjs` `loadOpenPlanReviewAdvisories` reads the last `review.jsonl` line without checking `verdict` | med | STILL-PRESENT (no verdict check in the function) | |
| C2 | /code-review | phase order and plan choice follow `readdirSync` order (`phase-10` before `phase-2`; first match wins) | low | OPEN | |
| C3 | /code-review | `efficiency.mjs`: the comment says entries without `failClasses` count as blocking, but `?? []` drops them | low | STILL-PRESENT (`efficiency.mjs:163`) | |

## s6f — implement-phase-docs-sync phase 2 attempt 1 (prose). relay: CHANGES_REQUESTED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| R1 | relay | R-SEM: the docs-updater dispatch carries no `pr`, `feature`, or `prd_path`; relies on `orchestrator-run.json` | — | MATCH with C1 | |
| R2 | relay | R-COH-COMMENT-MISMATCH: "docs-reviewer derives feature from the same context", but the payload lacks it | — | MATCH with C2 | |
| R3 | relay | R-COH-OTHER-INTERNAL-CONTRADICTION: `prior_feedback` is sent, but docs-updater's inputs do not list it | — | not reported by /code-review | |
| C1 | /code-review | updater dispatch lacks `feature` / `prd_path` | high | MATCH-RELAY; LATER-FIXED (Phase 2 added the inputs) | |
| C2 | /code-review | reviewer cannot derive `feature` without `pr`; the line-393 justification is false | high | MATCH-RELAY | |
| C3 | /code-review | Step C reads "the just-appended" `docs-review.jsonl` line; a guard or crash appends nothing, so a stale APPROVED is read | med | OPEN | |
| C4 | /code-review | `patch_path` is passed relative, but the contract requires an absolute path | low | OPEN | |
| C5 | /code-review | deferred questions are split across jsonl and manifest; the Docs line points to only one | low | OPEN | |

## s9f — plan-review-materiality phase 3 attempt 1 (prose). relay: CHANGES_REQUESTED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| R1 | relay | R-COH-OTHER-INTERNAL-CONTRADICTION: A.0 says `open_advisories` is carried unmodified, but a later paragraph recomputes it each attempt | — | reported by /code-review only in the confounded first run (s9 C4), missed in the clean rerun (non-determinism) | |
| C1 | /code-review | `review_jsonl_path` uses `<basename>`, which Parse arguments defines both with and without `.plan.md`, so the lookup can silently miss | med | STILL-PRESENT ambiguity (`relay-implement.md:73-79` vs `:304`) | |
| C2 | /code-review | the last `review.jsonl` line is taken without checking `verdict == APPROVED` | low | STILL-PRESENT (`relay-implement.md:304`) | |

## s10 — figma-quota-resilience phase 6 attempt 1 (prose). relay: CHANGES_REQUESTED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| R1 | relay | OIC: the Phase 5.6 handoff-capture paragraph's anchor contradicts its own flow | — | not reported by /code-review | |
| R2 | relay | OIC: Hard Constraint 10 states the Phase 2 outcome mapping unconditionally | — | MATCH with C3 (the "related contradiction") | |
| C1 | /code-review | rung recorded as FULL after a mid-traversal quota narrowing; the re-traverse option is offered wrongly | high | OPEN | |
| C2 | /code-review | `last_round_quota_degraded` is set from a rung that is not quota-specific | med | OPEN | |
| C3 | /code-review | zero-evidence branch only defined for quota refusals; HC10 contradiction | med | MATCH-RELAY (R2) | |
| C4 | /code-review | stale `raw/` / `refs/` files from an earlier pass defeat the evidence-branch test | med | OPEN | |
| C5 | /code-review | `{figma_call_count}` in the handoff has no counting protocol | med | OPEN | |
| C6 | /code-review | refusal handling does not cover `get_metadata` | low | OPEN | |

## s12 — relay-commit-command phase 2 attempt 1 (prose). relay: APPROVED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| C1 | /code-review | `commit -m "<message>"` with an unescaped PRD title, so backticks or `$` break or inject | high | STILL-PRESENT (`relay-commit.md:195`, `:343`) | |
| C2 | /code-review | `git -C …` calls do not match the `git status*` / `git commit *` allowlist patterns, so every step prompts | med | OPEN (depends on the permission mode) | |
| C3 | /code-review | the fallback note always blames `orchestrator-run.json` | low | OPEN | |
| C4 | /code-review | `architecture.md` "13 implemented" counts unshipped commands | low | OPEN (count at that time) | |
| C5 | /code-review | `commands.html` counts `/relay-pr` twice | low | OPEN | |
| C6 | /code-review | documented output "file count" is not produced | low | OPEN | |

## s13 — implement-phase-docs-sync phase 1 attempt 1 (prose). relay: CHANGES_REQUESTED

| # | Reviewer | Finding | Sev | Preliminary | Operator |
|---|---|---|---|---|---|
| R1 | relay | OIC: `methodology.md` says `docs_sync: false` self-skips in both commands, as present-tense fact | — | MATCH with C4 (also found at medium, xhigh, max) | |
| R2 | relay | OIC: "only a human edit or `*init`/`*update` can flip `docs_sync`", which context-builder cannot do | — | found by /code-review only at xhigh and max; LATER-FIXED (the shipped text reads "only a human edit can") | |
| C1 | /code-review | docs-reviewer got no `diff_source`, so it still runs `gh pr diff` | high | STILL-PRESENT per the max verifier (later tree) | |
| C2 | /code-review | `worktree` mode's `git -C <root> diff` misses staged and untracked changes | med | STILL-PRESENT, LATENT (`docs-updater.md:188`; Phase 2 uses `patch`) | |
| C3 | /code-review | the new modes still depend on `orchestrator-run.json` for `feature` / `prd_path` | med | LATER-FIXED (Phase 2 added the inputs) | |
| C4 | /code-review | `docs_sync: false` is read by nothing | med | MATCH-RELAY (R1) | |

## Excluded samples

- **s5, s6, s9 (first runs):** rebuilt without the earlier phases' uncommitted work, so most "X does not exist" findings are reconstruction artifacts. They were superseded by s5f, s6f, and s9f.
- **s11, s14:** the same confound. The rebuild with prior phases failed to apply, so their findings are not judged.
