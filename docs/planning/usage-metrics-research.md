# Per-project usage metrics — pre-PRD research and design proposal

**Status:** research artifact (pre-PRD grounding). Not a decision, not an implementation.
**Gate:** `docs/decisions.md` [2026-08-13] "Per-project plugin-usage metrics artifacts" registers this capability and blocks all implementation until a dedicated PRD is authored via `/relay-prd` and approved. This document is the research input for that PRD session.
**Date:** 2026-08-13.
**Method:** 10-agent research workflow — repo reconnaissance + five parallel web-research angles (Claude Code platform surface, CLI telemetry precedents, engineering-metrics frameworks, AI-agent measurement practice, local storage patterns) + a completeness critic + three targeted verification follow-ups (hook surface against official docs, Nx consent-storage precedent, DORA taxonomy against primary sources). ~741k tokens, 203 tool calls. Claims the critic flagged as unverified are listed in §7 and must not be cited as fact by the PRD without a check.

---

## 1. Constraints (fixed before design)

From the 2026-08-13 decision entry and the operator's directive:

1. **Local files only.** No telemetry, no upload, no network call, ever. Aggregation across projects is a manual, human-initiated act of collecting files.
2. **Near-zero cost** in memory, CPU, and — above all — **LLM tokens**. Deterministic scripts in the collection path, never LLM judgment.
3. **Portable and versioned.** The artifact must be reviewable off its origin machine and interpretable months later across plugin versions.
4. **Purpose:** periodic human review that feeds concrete plugin improvements (rubric rewrites, budget tuning, prompt fixes).

One platform fact reinforces constraint 1: Claude Code deliberately strips all `OTEL_*` exporter variables from every hook subprocess — the platform itself firewalls hooks from telemetry pipelines ([hooks reference](https://code.claude.com/docs/en/hooks)).

## 2. What exists today (inventory)

relay already writes a rich per-run audit trail into every target project. Fields verified against the command/agent definitions:

| Artifact | Writer | Measurement-relevant content |
|---|---|---|
| `PRPs/plans/<basename>.review.jsonl` | plan-reviewer | `{timestamp, verdict, rubric[{id, passed, class, reason?, ratchet?, escalated?}], action, user_message}`; `section_hashes`, `plan_sha256` (Phase 2 ratchet) |
| `PRPs/plans/<basename>.code-review.jsonl` | code-reviewer | adds `attempt`, `mode: standard\|arbitration`, `dispute_evidence` |
| `PRPs/plans/<basename>.test-write-review.jsonl` | test-reviewer | fixed 7-row rubric, `passed: null` allowed for degraded rows |
| `PRPs/reports/<feature>/orchestrator-run.json` | /relay-execute | `feature, prd_path, started_at, ended_at, budgets, phases[{phase, stage, outcome}], outcome, phases_completed, worktree_*`; best-effort `merged_at` write-back by /relay-approve |
| `PRPs/reports/<feature>/run.json` + `attempts/<N>/record.json` | /relay-test + test-runner | outcomes (`GREEN`/`FAILED_*`), `time_breakdown`, normalized test-output schema v1 (counts, failures with `category` infra/flaky/legitimate, coverage) — produced by a deterministic no-deps Node script |
| `PRPs/reports/<feature>/test-review.json` | /relay-test-review | `verdict`, `concerns[]`, gate for /relay-pr |
| `phase-<N>/attempts/<i>/diff.patch` | /relay-implement | per-attempt cumulative diff (bytes, files touched) |
| Long tail | various | `halt.json`, `approve-halt.json`, `visual-approval.jsonl`, `fidelity-report.json`, `docs-review.jsonl`, `worktree-bootstrap.log`, `final-report.md` |

Existing consumers: `scripts/efficiency.mjs` (per-stage sessions, runs/session, first-attempt failure rate, per-class fail tallies, degraded-timestamp exclusion, snapshot/compare modes) and the `efficiency-report` skill. Both are **repo-local and run-scoped** — the gap this capability closes.

Existing precedents the design must follow: `test-output-schema.md` (versioning discipline), `redaction-policy.md` (three additive layers), the `methodology.md` frontmatter flag idiom (`tdd`, `test_frameworks`, `figma_track` — heuristics never flip values), and the `CONSUMERS` registry in `scripts/validate/checks/timestamp-contract.mjs`.

**Empirical size envelope (measured 2026-08-13):** this repo's whole verdict corpus after months of heavy use is 368 JSONL lines / ~1.14 MB (~3.1 KB per verbose rubric line, inflated by embedded prose). A lean codes-and-counts event fits in 200–500 bytes → realistic accumulation is ~1 MB/year. Storage cost is a non-issue; the risk is embedded prose, not volume.

## 3. Research summary

### 3.1 Claude Code platform surface (verified by follow-up against official docs)

- **Hooks are the zero-token trigger.** The [official hooks reference](https://code.claude.com/docs/en/hooks) documents 31 events, including `SubagentStart`/`SubagentStop` (matcher on agent type, payload carries `agent_id`, `agent_type`, `last_assistant_message`), `SessionStart`/`SessionEnd`, `PostToolUse`/`PostToolUseFailure`, `WorktreeCreate`/`WorktreeRemove`, `FileChanged`.
- **Five hook handler types exist — only `command` satisfies our constraints.** `prompt` and `agent` invoke a model (tokens); `http` POSTs to a URL (network — must be explicitly forbidden by our design); `mcp_tool` needs a server. `command` is a pure subprocess receiving JSON on stdin.
- **`async: true` command hooks are the officially sanctioned logging mechanism**: available on exactly nine events (incl. `PostToolUse`, `SubagentStop`, `SessionEnd`), fire-and-forget, output/exit code ignored, docs verbatim: "they work well for logging, monitoring, or side effects that don't need to influence the model's decisions." The hooks guide's own showcase example is a `PostToolUse` command hook appending one line per event to a local file with `jq`.
- **Plugins ship hooks** via `hooks/hooks.json` at plugin root; `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_DATA}` are substituted and exported to the subprocess. The per-project artifact must anchor on `${CLAUDE_PROJECT_DIR}` (`CLAUDE_PLUGIN_DATA` is per-user and dies on uninstall). relay ships **no hooks today** (`plugins/relay/README.md` lists `hooks/` as "to be added") — this would be net-new plugin surface.
- **Exit-code discipline matters for tokens:** a metrics hook must exit 0 with no stdout (exit 2 on some events injects stderr into Claude's context = tokens). `async: true` sidesteps this entirely.
- **Session transcripts** (`~/.claude/projects/<encoded-path>/<session-id>.jsonl`) hold per-turn `usage` objects (input/output/cache tokens) — the only local ground truth for token/cost data. [ccusage](https://github.com/ryoppippi/ccusage) (17.9k stars) parses exactly these files offline with zero network.
- **OTel export is vocabulary, not a viable collection path**: Claude Code's 8 official metrics (sessions, LoC, PRs, commits, cost, tokens, tool decisions, active time) and the [OTel GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) inform naming, but export requires a running listener, is machine-scoped, produces no portable in-repo file, and the GenAI conventions are still Development-stability.

### 3.2 CLI telemetry precedents — consent lessons

- **Where data goes is the dominant trust variable.** Homebrew's 2016 backlash targeted the Google Analytics destination, not the fields; resolved only in 2023 by moving to self-hosted EU InfluxDB ([brew.sh](https://brew.sh/2023/02/16/homebrew-4.0.0/)). Next.js's opt-out default has drawn continuous backlash since 2019 ([#8442](https://github.com/vercel/next.js/issues/8442)); Angular's strict opt-in prompt produced essentially none. **relay's local-only constraint eliminates the entire complaint class** — and the guarantee should be stated in the artifact's own header.
- **The strongest consent-storage precedent matches relay's shape (verified by follow-up):** Nx stores telemetry consent as a committed, schema-documented `analytics: boolean` in the workspace's `nx.json` ([nx.dev/docs/reference/telemetry](https://nx.dev/docs/reference/telemetry)); unset = one-time interactive prompt; **in CI it never prompts and runs only if the key is explicitly `true`**. Since Nx's committed key authorizes actual upload and relay's would authorize only local file writes, the identical mechanism carries strictly less consent weight here. One sharp edge: Nx documents no per-user escape hatch — if relay wants one, it must add it deliberately (Vercel's env-var override is the model).
- **Field-design discipline worth copying:** .NET's booleans-not-values rule (CI detection reads env vars but records only a boolean) and per-version enumerated field registry; Homebrew's no-identifier-by-construction and 365-day retention; Turborepo publishing its complete event schema as a versioned in-repo file; Next.js/Gatsby's debug mode that prints exactly what would be recorded.
- **Local-first proofs:** [atuin](https://github.com/atuinsh/atuin) (rich local event store, roll-ups computed at read time, zero controversy because default is local-only); [zoxide](https://github.com/ajeetdsouza/zoxide/wiki/Algorithm) (deterministic decay-and-prune keeps the file bounded forever); ccusage + git-quick-stats (**derive-don't-collect**: deterministic offline roll-up of artifacts the workflow already produces).

### 3.3 Engineering-metrics frameworks — what to measure and how to review

- **DORA's current official model (verified against dora.dev):** five metrics in two factors — *Software Delivery Throughput* (change lead time, deployment frequency, failed deployment recovery time) and *Software Delivery Instability* (change fail rate, **deployment rework rate**, added 2024). Recovery time sits on the throughput side (the most misquoted detail). Rework rate is countable from event logs: unplanned-fix deployments / total. Both instability metrics are kept distinct — do not collapse them ([dora.dev/guides/dora-metrics-four-keys](https://dora.dev/guides/dora-metrics-four-keys/)).
- **DORA usage doctrine endorses this design's posture verbatim:** application/service-scoped (= per-project files), trends against own baseline (no cross-project league tables), compass-never-target citing Goodhart's law.
- **The 2025 DORA report** (AI-assisted development) finds AI adoption raises throughput AND instability — the exact failure mode relay's writer/reviewer pipeline exists to counter. The two-axis lens (throughput up, rework not up) is the right frame for judging whether the plugin helps.
- **SPACE:** measure at least three dimensions, never activity counts alone. **DX Core 4:** few counterbalanced metrics; snapshot-based method — each snapshot evaluates a fixed lookback window and is **frozen** for historical stability ([docs.getdx.com](https://docs.getdx.com/dx-core-4.md)). **GitHub ESSP:** every headline metric ships with 1–2 named companion metrics; leading indicators (fast-moving) alongside lagging outcomes; "balance the cost of measurement with the benefits" is a first-class principle; interventions get a named owner and are compared against the step-1 baseline.
- **Google SWE-book actionability test (GSM):** before measuring, name the decision a negative result would change — "will you act on negative results?" reportedly stops most measurement projects. Fields with no attached decision get cut.
- **Goodhart guard specific to relay:** the agents themselves are gaming vectors — an LLM reviewer aware of a pass-rate target could approve leniently. Metrics must be computed by scripts from artifacts agents already produce *for other reasons*, and **never surfaced to agents as targets**.
- **Review cadence (practitioner consensus, secondary sources):** monthly team check-in with pre-read + quarterly deeper review; DORA's own ritual is lighter (periodic re-baseline inside existing retrospectives). For a solo operator: the monthly read must be a <5-minute act — pre-computed snapshots with deltas.

### 3.4 AI-agent measurement practice

- **Day-grain additive counters with few slice dimensions** is the dominant industry schema ([Copilot metrics API](https://docs.github.com/en/copilot/concepts/copilot-usage-metrics/copilot-metrics)) — a shape that merges trivially across files, which is what manual aggregation needs. Copilot's acceptance-rate fields structurally miss agent-mode work — suggestion-grain acceptance is the wrong primitive for an autonomous pipeline; **measure at task/phase grain** (verdicts, retries, halts).
- **Claude Code's 8 official metrics + event schema** are the closest vetted precedent: attribution dimensions (`model`, `query_source` main/subagent, `agent.name`, `skill.name`), a correlation id per human input (`prompt.id`), counts/durations/sizes with **content redacted by default** and explicit cardinality toggles ([monitoring-usage](https://code.claude.com/docs/en/monitoring-usage)).
- **Outcome attribution happens at merge, not at generation** (Anthropic contribution-metrics matches merged-PR diffs against session output) — relay's /relay-approve step is the natural place for final per-feature outcome stamps.
- **2026 consensus headline KPIs for production agents:** task success rate, **cost per successful task** (failed retries count in the numerator), intervention/autonomy rate. Anthropic's autonomy-research vocabulary: turn duration, auto-approve share, interruption rate, agent-initiated clarification rate (numbers unverified — §7).
- **Community Claude Code dashboards** all keep raw counters and compute thin ratios at read time — validating raw-events + derive-at-review.
- **Genuinely novel territory:** no published schema exists for writer/reviewer-pair pipelines (per-rubric-item failure counts, verdict churn) and no published practice for versioned *local* metrics files. relay's rubric-id vocabulary is ahead of industry here; the artifact design cannot lean on an external standard for it.

### 3.5 Local storage patterns

- **JSONL wins conclusively** for the accumulating log: O(1) append, constant-memory streaming reads, corruption damages one line, merge = concatenation, per-line self-description makes additive schema evolution safe (vs CSV's positional header), and OTel's own file-exporter spec independently chose `.jsonl` (borrow the container, not its heavy envelope). **SQLite** (binary in git, per-clone merge-driver setup), **Parquet** (append = full rewrite, pathological at KB/day), and **git-notes** (refs don't travel with clone/push) are all disqualified.
- **Conflict-freedom by construction beats merge drivers:** git's `merge=union` works locally but **GitHub PR merges ignore `.gitattributes` merge settings** ([community discussion #9288](https://github.com/orgs/community/discussions/9288)). The proven pattern is partitioning writes into files only one writer touches — [asv](https://asv.readthedocs.io/en/stable/using.html) (one JSON per machine+commit, cross-machine aggregation as an explicit human act — almost exactly the decided relay model) and GitLab's changelog evolution.
- **Schema versioning:** [SchemaVer](https://docs.snowplow.io/docs/api-reference/iglu/common-architecture/schemaver/) (MODEL-REVISION-ADDITION) — additive growth never bumps MODEL; readers ignore unknown fields; per-line version stamp keeps mixed-version files interpretable (Confluent additive-only canon).
- **Lifecycle:** monthly sharding with date in filename; writer-enforced retention at append time ([github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark) prunes oldest at write); deterministic compaction of old shards into rollup summaries; zoxide's decay-and-prune for permanent boundedness.

## 4. Design proposal (for the PRD to ratify — nothing here is decided)

### 4.1 Architecture: derive-first, emit-thin

The pivotal question the critic forced: **which desired metrics CANNOT be derived from artifacts relay already writes?** The answer shapes everything:

| Desired metric | Derivable today? | From |
|---|---|---|
| First-attempt failure rate per stage | ✔ | verdict JSONLs (efficiency.mjs already does) |
| Rework rate per stage (re-runs / total) | ✔ | same, session-split |
| Per-rubric-id failure counts, by class | ✔ | same |
| HALT frequency by code | ✔ | orchestrator-run/halt.json, run.json |
| Phase lead time, HALT-to-resume time | ✔ (mostly) | timestamps across artifacts (degraded-timestamp caveat) |
| Test attempts, failure categories, suite duration | ✔ | run.json + record.json |
| Diff size / files touched per attempt | ✔ | diff.patch (byte + file counts) |
| Human-gate events (disputes, visual approvals, AC amendments) | ✔ | arbitration entries, visual-approval.jsonl, `action` fields |
| Merge outcome / time-to-merge | partial | best-effort `merged_at` write-back |
| **Tokens / cost per stage or feature** | ✘ | only `~/.claude` transcripts; no join key to features |
| **Plugin version per run** | ✘ | stamped nowhere |
| **Sessions that crash before writing artifacts** | ✘ | nothing written |
| **Operator interruptions / abandonment** | ✘ | not recorded |

The un-derivable set is small and specific. Therefore: **the primary mechanism is a deterministic reader/rollup script over existing artifacts (zero new emission, zero tokens, zero risk), plus a thin, opt-in, hook-based supplement covering only the un-derivable rows.** This is the ccusage/git-quick-stats pattern, validated by every community Claude Code dashboard.

Explicitly rejected as the emission path: instruction lines added to 15+ command markdowns (nonzero token cost on every invocation, multiplied forever; and agent-side emission degrades — the 45%-midnight-timestamps precedent), and the OTel export pipeline (§3.1).

### 4.2 Files and location

```
PRPs/metrics/
  snapshots/<YYYY-MM-DD>-<label>.json    # frozen rollups (DX Core 4 pattern), derived, regenerable
  events/<YYYY-MM>.jsonl                 # thin supplemental events only (Phase 2, opt-in)
  README.md                              # policy header: local-only pledge, schema pointer, retention rule
```

- Anchored on `${CLAUDE_PROJECT_DIR}`, beside `PRPs/reports/` (consistent with D-2026-04: PRP artifacts under `PRPs/`, never `.claude/`).
- **Committed to the target repo** (recommendation, PRD decides): portability *is* the point, ~1 MB/year is negligible, history survives via git, collection = clone. Mitigations for the committed fork: snapshots are regenerable (low-conflict), events shard monthly, and per-run supplement files are an option if conflicts materialize (asv pattern). The gitignored alternative kills the merge problem but dies with worktree cleanup — worse survivorship.
- Schema documented in a new `plugins/relay/resources/usage-metrics-schema.md` (Turborepo's published-schema pattern; sits beside `test-output-schema.md`).

### 4.3 Schema sketch

Snapshot (codes and counts, no prose — the measured 3.1 KB/line verdict bloat is embedded prose, and prose is also the privacy risk):

```json
{
  "schema_version": "1-0-0",
  "generated_at": "2026-09-01T10:00:00Z",
  "plugin_version": "0.31.0",
  "window": { "from": "2026-08-01", "to": "2026-08-31" },
  "stages": {
    "plan-review": {
      "sessions": 12, "runs": 15, "first_attempt_failure_rate": 0.25,
      "fails_by_class": { "blocking": 3, "advisory": 7 },
      "top_failure_ids": { "R-COH-TASK-CONTRADICTION": 2 }
    }
  },
  "halts": { "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED": 1 },
  "tests": { "runs": 9, "green_first_attempt": 6, "failure_categories": { "infra": 2, "flaky": 1, "legitimate": 4 } },
  "human_gates": { "disputes": 1, "visual_approvals": 2, "ac_amendments": 0 },
  "corpus": { "files": 41, "lines": 88, "excluded_degraded": 2 }
}
```

Supplemental event line (Phase 2):

```json
{"schema_version":"1-0-0","ts":"2026-08-13T14:22:05Z","event":"session_summary","session_id":"…","plugin_version":"0.31.0","tokens":{"input":0,"output":0,"cache_read":0,"cache_creation":0},"cost_usd":0,"duration_ms":0}
```

Rules: SchemaVer semantics; per-line `schema_version`; additive-only growth; readers ignore unknown fields and skip MODEL-incompatible shards with a warning (mirroring the degraded-timestamp exclusion — never rewrite history); **`plugin_version` on every record** (see §4.8 — it is the cross-project before/after mechanism); booleans-not-values for environment signals; lengths/counts/hashes, never content.

### 4.4 Triggers

| Tier | Trigger | Cost | What it produces |
|---|---|---|---|
| 1 (MVP) | **Human-invoked rollup** — a command/skill mirroring `efficiency-report`, run at the monthly review | zero tokens, ms of CPU, on demand only | snapshot JSON + console deltas vs prior snapshot |
| 2 | **`async: true` command hooks** shipped in `plugins/relay/hooks/hooks.json` — `SessionEnd` (parse `transcript_path` usage records → `session_summary` event), optionally `SubagentStop` matched on relay agent names | zero tokens (output ignored), non-blocking, officially sanctioned for logging | the un-derivable rows: tokens/cost, session identity, crash evidence |
| — | ~~Emission instructions inside command markdown~~ | rejected | token cost per invocation × 15+ commands; agent drift |

Collection degrades gracefully to "no data" when hooks are disabled (`disableAllHooks`) — the artifact format must tolerate gaps rather than assume continuous coverage.

### 4.5 Metric set — every field passes the GSM test

DORA-framed (throughput vs instability), each metric named with the plugin-improvement decision it changes:

| Metric | Family | Decision it informs |
|---|---|---|
| Phases completed / period; phase lead time | throughput | is the pipeline getting faster across releases? |
| HALT-to-resume recovery time | throughput (per DORA 2024: recovery loads with throughput) | resume-path UX investment |
| First-attempt failure rate per stage | instability (change-fail analog) | which writer prompt needs work |
| Rework rate per stage (re-run share) | instability (rework analog) | `max_*_retries` defaults; writer/reviewer contract fixes |
| Top failing rubric ids, by class | instability drill-down | rewrite/demote/promote specific rubric rows (the materiality mechanism) |
| HALT frequency by code | instability drill-down | budget tuning (`max_orchestrator_minutes`, etc.) |
| Advisory open rate + advisory→later-failure conversion (sampled, judged) | companion/guard | advisory→blocking promotion decisions (already human-gated per materiality PRD) |
| Test failure category mix (infra/flaky/legitimate) | companion | infra investment vs classifier tuning |
| Human-gate events per feature (disputes, visual approvals, amendments) | autonomy | where the interactivity boundary chafes |
| Tokens / cost per **completed** phase (Phase 2) | cost | model/effort selection, budget ceilings; the headline agent-economics KPI |

Counterweight discipline (DX Core 4): throughput metrics are read only alongside instability ones; no single-number league table; trends against the project's own baseline only.

### 4.6 Privacy and consent

- **Consent:** a committed `usage_metrics:` key in `docs/context/methodology.md` (Nx-verified precedent; matches the `figma_track`/`tdd` idiom — heuristics never flip it). Recommendation: the **rollup command needs no key** (human-invoked, reads only existing artifacts, writes only on request); **hook emission is opt-in** (absent/false = no hooks active). Non-interactive runs never prompt (Nx CI rule). PRD may add a per-user env-var escape hatch (Vercel pattern).
- **Redaction:** codes/counts/ids only — no prose `reason` strings, no file paths, no env values (booleans only, .NET rule). Feature slugs are project-identifying: acceptable in the committed file (it lives in the project), but the **cross-project collection step** applies `redaction-policy.md` L1/L2 + optional slug hashing at copy time, since collected files leave their origin repo.
- **Header pledge:** `PRPs/metrics/README.md` states the local-only guarantee, what is collected, and the retention rule — the file itself is the disclosure (exceeding the Next.js debug-mode bar by construction).

### 4.7 Consumers and field integrity

- The rollup script joins `scripts/efficiency.mjs` in the `CONSUMERS` registry; a new `npm run validate` check enforces producer/consumer parity between `usage-metrics-schema.md` and the script's emitted fields (decision points 6–7).
- Contractual fields (drift in any producer fails validation): `timestamp` discipline (existing contract), `verdict`, `class`, `action`, `attempt`, outcome/HALT codes, `plugin_version`, `schema_version`.

### 4.8 The improvement loop (how metrics become plugin changes)

1. **Monthly (<5 min):** run the rollup → frozen snapshot → console deltas vs prior snapshot. Pre-read, then decide: nothing / open an investigation / make a plugin change.
2. **Every record carries `plugin_version`** → segmentation by version gives automatic before/after comparison across *all* projects for *every* release — the cross-project analog of efficiency.mjs's snapshot markers, with no marker ceremony.
3. **Decisions land where they always land:** a plugin change motivated by metrics gets a `docs/decisions.md` entry citing the numbers (the 2026-08-05 self-check-tightening entry is the existing template). The next monthly read checks whether the change moved the baseline — ESSP's intervene→compare-against-baseline loop.
4. **Quarterly:** manual cross-project aggregation — copy `PRPs/metrics/` directories, `cat` the shards, run the compare mode. Judgment-based sampling (advisory conversion, etc.) stays human, per the materiality PRD's decisions log.
5. **Goodhart guard (hard rule):** metrics are never injected into any agent prompt as a target; scripts read artifacts agents already produce for other reasons.

### 4.9 Cost analysis

| Path | Tokens | CPU/memory | When |
|---|---|---|---|
| Rollup (Tier 1) | 0 | ms — parse ~1 MB JSONL, streaming | only when the human runs it |
| Hooks (Tier 2) | 0 (async, output ignored, exit 0) | ms per event — append one 200–500 B line | per session end / subagent stop |
| Storage | — | ~1 MB/year measured envelope; monthly shards + writer-enforced retention keep it bounded forever | — |

### 4.10 Proposed phase split (input to the PRD's Implementation Phases table)

1. **Derivation MVP:** `usage-metrics-schema.md` resource + deterministic rollup script (no npm deps) + snapshot artifact + command/skill surface. No new emission anywhere.
2. **Opt-in supplement:** `usage_metrics` methodology key + `plugins/relay/hooks/hooks.json` (first hooks the plugin ships) + `session_summary` collector parsing transcript usage records.
3. **Review ritual:** compare mode (deltas vs prior snapshot, per-`plugin_version` segmentation), `PRPs/metrics/README.md` policy header, review-procedure doc.
4. **Cross-project + integrity:** collection/aggregation script with redaction-at-copy, CONSUMERS + validate wiring, docs-site sync.

### Mapping to the seven decision points of the 2026-08-13 entry

| # | Decision point | Proposed answer |
|---|---|---|
| 1 | Schema + versioning | §4.3 — SchemaVer, per-line stamp, additive-only, schema resource file |
| 2 | Emission point + format | §4.1/§4.4 — derive-on-demand primary; async command hooks supplement; JSONL events + JSON snapshots |
| 3 | Location + lifecycle | §4.2 — `PRPs/metrics/`, committed, monthly shards, writer-enforced retention + compaction |
| 4 | Opt-in + privacy | §4.6 — methodology key (hooks opt-in, rollup free), codes-not-prose, redaction at collection |
| 5 | Backward compat | §4.3 — existing JSONLs stay untouched as raw sources; degraded/incompatible shards excluded, never rewritten |
| 6 | Consumer side | §4.7 — new rollup script registered in CONSUMERS; efficiency.mjs untouched |
| 7 | Field integrity | §4.7 — contractual field list + validate check |

## 5. Rejected alternatives

- **OTel export pipeline as collection path** — requires a listener process, machine-scoped, no portable in-repo file; keep only its naming vocabulary.
- **SQLite / Parquet / CSV / git-notes** — §3.5 reasons (binary-in-git, append-rewrite, positional schema, non-traveling refs).
- **`http` / `prompt` / `agent` hook types** — network / tokens, violate constraints by type.
- **Emission instructions in command markdown** — per-invocation token tax across the whole surface + agent-drift degradation risk.
- **LLM anywhere in the collection path** — constraint 2, plus the Goodhart guard.
- **Any automatic upload/telemetry** — fixed by the 2026-08-13 decision; not revisitable without its own decision entry.

## 6. Open questions for the PRD

1. **Committed vs gitignored** — recommended committed (§4.2), but the PR-diff noise and any interaction with code-reviewer's diff-scoped checks need a concrete look.
2. **Worktree lifecycle / survivorship bias** — metrics written in `.worktrees/<feature>/` merge with the feature branch; abandoned/HALTed features lose their worktree → the corpus systematically loses exactly the failure runs the review most needs. Mitigation candidates: rollup scans `.worktrees/*/PRPs/` too; or supplement events target the main checkout.
3. **Dedup keys** — re-runs, resumes (Phase A.2.5), idempotent re-invocations must not double-count: define uniqueness (e.g. `run_id`+`attempt`+`stage`) and make the reader dedup (efficiency.mjs's session-splitting is the in-repo precedent).
4. **Session↔feature correlation** — no join key exists between transcripts and features; time-window + cwd matching is approximate. Is session-grain cost attribution acceptable for the MVP of Phase 2?
5. **Windows concurrent-append semantics** — multiple simultaneous worktree sessions appending to one monthly shard; per-run files sidestep it — decide which.
6. **Minimum Claude Code version** — hook features are version-gated (v2.1.195+ for hyphenated agent matchers, v2.1.196+ for `prompt_id`); pin a floor.
7. **Empirical checks before schema freeze** — whether `tool_response` still exists on PostToolUse stdin; `FileChanged` matcher semantics and self-trigger recursion; transcript usage-record exact schema.
8. **Trend window for small-N projects** — DORA's 6-month/large-N convention doesn't transfer; per-release-marker vs rolling window.
9. **Default for the `usage_metrics` key** — recommendation: hooks default off; PRD confirms against the Nx/Angular consent spectrum.
10. **Does the rollup live in the plugin or the repo?** — `scripts/` (repo-local, like efficiency.mjs) vs `plugins/relay/scripts/` (ships to every install). Shipping it is the point of the capability → recommend plugin, but that changes the validation surface.

## 7. Claims to re-verify before the PRD cites them

- Anthropic autonomy-research figures (turn-duration percentiles, auto-approve shares) and the contribution-metrics 21-day matching window — vocabulary fine, numbers unverified.
- "DORA's fifth metric" vendor framing — the taxonomy itself is verified on dora.dev; avoid the vendor "replaces change-fail-rate" misreading (both instability metrics are current).
- DO_NOT_TRACK adoption status of specific tools; the consoledonottrack.com domain-rot anecdote.
- SessionEnd matcher value list details and exact numeric caps from the platform angle (the 31-event list, 5 hook types, and async-capable set ARE verified against code.claude.com).
- SIEM ~500 B/record rule of thumb (LinkedIn source) — the locally measured corpus numbers are the real evidence; cite those.

## 8. Primary sources

- Claude Code: [hooks](https://code.claude.com/docs/en/hooks), [hooks guide](https://code.claude.com/docs/en/hooks-guide), [plugins reference](https://code.claude.com/docs/en/plugins-reference), [monitoring-usage](https://code.claude.com/docs/en/monitoring-usage)
- DORA: [five metrics guide](https://dora.dev/guides/dora-metrics-four-keys/), [metrics history](https://dora.dev/insights/dora-metrics-history/), [2025 report](https://dora.dev/dora-report-2025/)
- Frameworks: [SPACE](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/), [DX Core 4](https://docs.getdx.com/dx-core-4.md), [GitHub ESSP](https://github.com/resources/insights/engineering-system-success-playbook), [Google SWE-book ch. 7](https://abseil.io/resources/swe-book/html/ch07.html)
- Consent precedents: [Nx telemetry](https://nx.dev/docs/reference/telemetry), [Angular analytics](https://angular.dev/cli/analytics), [Homebrew analytics](https://docs.brew.sh/Analytics), [.NET SDK telemetry](https://learn.microsoft.com/en-us/dotnet/core/tools/telemetry), [Next.js telemetry](https://nextjs.org/telemetry), [Turborepo telemetry](https://turborepo.dev/docs/telemetry), [Astro telemetry](https://astro.build/telemetry/), [Vercel CLI telemetry](https://vercel.com/docs/cli/about-telemetry)
- AI-agent measurement: [Copilot metrics API](https://docs.github.com/en/copilot/concepts/copilot-usage-metrics/copilot-metrics), [Cursor analytics](https://cursor.com/docs/account/teams/analytics), [Anthropic contribution metrics](https://claude.com/blog/contribution-metrics), [OTel GenAI conventions](https://github.com/open-telemetry/semantic-conventions-genai), [Langfuse](https://langfuse.com/docs/observability/overview), [DX AI framework](https://getdx.com/blog/ai-measurement-framework-guide/)
- Storage: [ccusage](https://github.com/ryoppippi/ccusage), [atuin](https://github.com/atuinsh/atuin), [zoxide algorithm](https://github.com/ajeetdsouza/zoxide/wiki/Algorithm), [asv](https://asv.readthedocs.io/en/stable/using.html), [github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark), [SchemaVer](https://docs.snowplow.io/docs/api-reference/iglu/common-architecture/schemaver/), [OTel file exporter](https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/), [gitattributes merge=union](https://git-scm.com/docs/gitattributes) + [GitHub gap #9288](https://github.com/orgs/community/discussions/9288)
