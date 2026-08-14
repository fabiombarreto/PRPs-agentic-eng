# Per-Project Usage Metrics

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions; cross-cutting patterns; creation of a new artifact type consumed outside the pipeline
- Decisions found: [2026-08-13] Per-project plugin-usage metrics artifacts (registration; seven mandatory decision points; local-only floor) — this PRD answers it point by point; [2026-04-19] Methodology declaration lives in docs/context/methodology.md; [2026-04-19] PRP artifacts under PRPs/, never .claude/; [2026-07-31] Reviewer timestamps are invoker-supplied + degraded artifacts excluded from both sides + CONSUMERS registry; [2026-08-05] Rework is counted per review session, not per jsonl file; [2026-08-06] Materiality classes (blocking/advisory) on every plan-review check; [2026-08-07] Retry convergence ratchet; [2026-08-07] Advisory pass-through; [2026-08-07] Class-aware efficiency measurement
- Applicable anti-patterns: Activating the test pair by heuristic (the non-heuristic gating-key contract this feature inherits); Flipping figma_track or any future opt-in gating key by heuristic; Writing pipeline artifacts under .claude/; Emitting secret values in run reports or logs; Injecting plugin defaults into the target project's decisions.md
- Applicable architectural rules: PRP artifact-path table (all artifacts under PRPs/ at the repo root); interactivity boundary (three human-gated surfaces today — this feature adds none); autonomous stretch must not depend on external availability; one command per stage
- Result: PROCEED
```

## Problem Statement

relay writes a rich per-run audit trail into every project that uses it, but nothing in that trail is designed to be read later. The two instruments that exist — `scripts/efficiency.mjs` and the `efficiency-report` skill — are repo-local and run-scoped: they read one checkout, on demand. Half the trail does not even survive a clone, because `PRPs/reports/*` is gitignored while `PRPs/plans/*.jsonl` is tracked. The cost is that every question about whether relay is getting better is answered by manual reconstruction, and every release ships without a way to tell whether it helped.

## Evidence

- The 2026-08 cross-project measurement over roughly 370 artifacts from 6 repositories, and the 353-verdict / 193-plan / 7-repo audit cited by the [2026-08-06] materiality decision, were both assembled by hand from scattered logs.
- `.gitignore:32` ignores `PRPs/reports/*` with exactly one deliberate carve-out, `!PRPs/reports/efficiency/`. Verified: 206 `PRPs/plans/*.jsonl` files are tracked; `PRPs/reports/<feature>/orchestrator-run.json` is not. HALT codes, budgets, phase outcomes and test-run data therefore die with the machine.
- The [2026-07-31] degraded-timestamp incident is the same gap in another form: the trail was designed for per-run debugging, so its measurement-critical fields were never contractual, and 45% of verdicts carried a placeholder timestamp before the fix.
- `PRPs/prds/plan-review-materiality.prd.md` shipped four phases whose Success Metrics are UNVALIDATED by construction — they require a post-release artifact population to accumulate first, and no mechanism accumulates it.
- Verified across `orchestrator-run.json`, `run.json` and every `*.jsonl` verdict log: **no relay artifact records the plugin version**. The fact is destroyed at write time, not merely omitted at read time.
- Measured: one `.review.jsonl` line is ~570 bytes; the whole corpus is 368 lines / 1.14 MB after months of heavy use. Bytes are dominated by long file paths and free-text prose, not by the short codes.

## Proposed Solution

Ship a dependency-free Node script inside the plugin that reads the artifacts relay already writes and **regenerates** a set of terse, versioned, tab-separated fact tables into a new tracked directory, `PRPs/metrics/`, in the target project. Output is a pure function of input: re-running with no new pipeline activity produces byte-identical files, which dissolves deduplication, append races and mixed-schema shards without a locking or idempotency-key mechanism. Nothing in the pipeline learns to emit anything — no agent prompt, command, or hook gains a byte — so the collection path as shipped costs zero LLM tokens, well inside the ≤1% budget the Success Metrics record. A `scan` relation records, at each materialization, the plugin version observed and the source counts seen, which supplies the per-project version axis that derivation alone cannot recover and simultaneously distinguishes "the collector stopped running" from "nobody ran relay". The records are deliberately terse — bare rubric ids, HALT codes, counts, ISO instants — because the consumer is a human, an AI, or a script that already has the plugin repository's context and resolves codes against a versioned codebook shipped with the plugin, mirroring OpenTelemetry's `schema_url` model.

## Key Hypothesis

We believe **materializing a terse, versioned, per-project usage record** will let a contextualized interpreter identify the weakest stage of the relay pipeline, and tell whether a given release improved it, **without manual corpus reconstruction**.

We'll know we're right when a change to the plugin is made and recorded in `docs/decisions.md` citing numbers read only from these files.

## What We're NOT Building

- **Any telemetry, upload, or network call** — fixed by the [2026-08-13] decision. Cross-project aggregation is a human copying directories. Not revisitable without its own decision entry.
- **Hooks of any type, in this feature's MVP** — a three-lens design review found the worst failure modes concentrated in hook-driven emission: writes landing in the working tree mid-turn (where `/relay-code-review`, `/relay-commit` and `/relay-qa-report` read the tree with an LLM in the loop), a non-async `SessionStart` handler whose stdout is injected into context by design, and a sequence key that races against relay's own parallel subagent dispatch. Registered as Phase 5, gated behind proven idempotency, silence and speed.
- **Token / cost attribution per phase or stage** — the only local ground truth is `~/.claude/projects/**` session transcripts, and no join key exists between a session and a relay feature or phase. Attribution by time ordering would produce a number that gets quoted and is wrong.
- **Exact per-row plugin-version stamping** — would require emission in the hot path. The `scan` relation bounds rows between known versions instead; the approximation is documented in the codebook rather than hidden.
- **Any reading of metrics by a pipeline agent** — structural anti-Goodhart guard. An LLM reviewer aware of a pass-rate target would approve leniently.
- **A human-facing report, dashboard, or rendering layer** — the artifact is raw data. Interpretation is the consumer's job.
- **Individual or per-person measurement** — DORA's own guidance forbids it and relay has no such data anyway.
- **Modifying the schema of `orchestrator-run.json`, `run.json`, or any `*.jsonl` verdict log** — explicitly out of scope per the registration entry.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| LLM tokens in the collection path | **≤1% of one full pipeline run** | Measured against a recorded baseline: a one-time manual measurement of a complete `/relay-execute` phase (parsed from `~/.claude/projects/**` session transcripts) establishes the denominator; any token-costing collection step is measured against it. Phases 1–4 as shipped spend **0**, so the budget is entirely unspent. *(Amended 2026-08-14, human-authorized — the original target was a hard `0`; see `docs/decisions.md` [2026-08-14] "Usage-metrics collection gets a 1% token budget".)* |
| Portable coverage after a clean clone | 100% of contractual fields present | Clone a project that has materialized, run the reader; today's equivalent is ~50% because `PRPs/reports/` is ignored |
| Read cost of one slice | 1 project × 1 month ≤ ~50 KB | `wc -c` on the shard; whole-history projection from the measured corpus is ~60 KB for 368 verdicts |
| Plugin changes grounded in the data | ≥ 1 `docs/decisions.md` entry citing numbers read only from these files, within 90 days of Phase 4 | Manual count of decisions.md entries |

## Acceptance Criteria (test scenarios)

- **AC-1 Deterministic regeneration:** Given a project whose corpus has not changed since the last materialization and whose `PRPs/metrics/` directory is committed, when the materializer runs a second time, then every output file is byte-identical to the first run (verified by hash) and `git status --porcelain PRPs/metrics/` prints nothing.
- **AC-2 Untracked-artifact detection:** Given a freshly materialized `PRPs/metrics/` that the operator has not committed, when `git status --porcelain PRPs/metrics/` runs, then untracked files appear as `??` and AC-1's emptiness assertion fails — the artifact cannot silently be non-durable.
- **AC-3 Mutating-source stability:** Given a feature whose `orchestrator-run.json` is written progressively and later receives `/relay-approve`'s `merged_at` write-back, when the materializer runs after each mutation, then the `run` relation holds exactly one row per `(proj, feat, phase, stage)` — the later write updates the row rather than appending a new one.
- **AC-4 Cross-project attribution survives concatenation:** Given metrics directories copied from two projects into one directory, when their same-relation shards are concatenated, then every row remains attributable to its origin project via the `proj` column, and per-project rates are computable from the concatenated file alone.
- **AC-5 Anti-Goodhart guard is a build invariant:** Given the literal string `PRPs/metrics` planted in any file under `plugins/relay/agents/`, `plugins/relay/commands/`, or `plugins/relay/skills/`, when `npm run validate` runs, then the metrics-isolation check fails and names the offending file.
- **AC-6 Values never enter a working-tree diff:** Given a materialized, committed `PRPs/metrics/` with the scaffolded `.gitattributes`, when `git diff` is taken over a change to a shard, then git reports the file as differing without emitting its contents, so no diff-reading command can ingest metric values.
- **AC-7 Field contract is closed:** Given any row of any relation, when each cell is validated, then every value is one of: a code from the relation's declared enum, a non-negative integer, an ISO-8601 UTC instant, or the single `-` sentinel — and no value contains a tab, a CR, or a newline.
- **AC-8 Degraded rows are excluded, never rewritten:** Given a source verdict carrying `timestamp_degraded: true`, when the materializer runs, then the row is emitted with its `deg` flag set and the reader excludes it from rate computations with a named, counted warning, while the source file is left untouched.

## Open Questions

- [ ] Retention and compaction: at what age (if ever) do closed monthly shards get rolled up or pruned, and by which mode of the same script?
- [ ] Whether the reader ships as a subcommand of the same script or as a separate consumer, and how it relates to `scripts/efficiency.mjs` — extend, coexist, or eventually supersede.
- [ ] Whether the `scan` relation should also record the target project's declared `test_frameworks` / `tdd` / `docs_sync` values, so a cross-project reader can segment by methodology rather than treating all projects as comparable.
- [ ] Whether a future automated trigger (Phase 5) needs a `usage_metrics` key in `docs/context/methodology.md`, and if so whether its default follows the deterministic-`false` idiom of `figma_track` / `docs_sync`.
- [ ] Whether project identity should ever be hashable for shards that leave the organization, given feature slugs are the one project-identifying field that survives the closed-enum contract.
- [ ] Whether relay's own repository should commit its metrics directory, given it is simultaneously the plugin and the first dogfood target.

---

## Users & Context

**Primary User**
- **Who:** the interpreter of the data — a human maintainer, an AI agent, or a script — deciding where to invest improvement effort in relay. Secondarily, a team adopting relay that wants to know whether it is helping in their own repository.
- **Current behavior:** reconstructs a corpus by hand across repositories, or runs `scripts/efficiency.mjs` against a single checkout with no plugin-version axis and no cross-project join key.
- **Trigger:** a new release ships; a regression is suspected; or a periodic review of what is worst.
- **Success state:** answers "which stage is worst, and since when" from the collected files alone, without opening any repository.

**Job to Be Done**
When I need to decide which part of relay to improve, I want to read accumulated usage data from the projects that use it, so I can base the decision on measured evidence rather than intuition or the most recent incident.

**Non-Users**
- **The pipeline's own agents.** No agent ever reads metrics — this is the anti-Goodhart guard, enforced structurally by a `validate` check and by a `.gitattributes` rule that keeps values out of working-tree diffs.
- Anyone wanting a real-time dashboard or streaming telemetry: the local-only, no-network floor is fixed.
- Anyone wanting to measure individual people.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Dependency-free Node script, shipped in the plugin, that regenerates output by full corpus rescan | Output as a pure function of input makes re-runs, resumes and retries converge to identical bytes — dissolving dedup, append races and mixed-schema shards without any locking or idempotency-key machinery |
| Must | Materialization into `PRPs/metrics/`, a new tracked directory, sibling to `plans/` and `reports/` | Converts perishable local state (`PRPs/reports/*` is gitignored) into durable history. Deliberately does NOT imitate the `!PRPs/reports/efficiency/` carve-out: that works only because this repo uses the contents form `PRPs/reports/*`, and a target using the directory form would make the negation a silent no-op — and relay does not own a target project's `.gitignore` |
| Must | `scan` relation: timestamp, observed plugin version, source counts, row counts | Supplies the per-project version axis that derivation cannot recover, and makes a silent collector detectable — "no scan in 94 days" is distinguishable from "no relay activity" |
| Must | Rubric relation retaining **passing** rows, not only failures | Answers "which checks never fire" (pruning) and reconstructs the rubric composition in force at a given version. The corpus already interleaves two plan-review generations (R1–R8 alongside 17 `R-COH-*` ids) across 368 lines |
| Must | Closed field contract: enumerated code, non-negative integer, ISO-8601 UTC instant, or `-` | Privacy by construction — with no free-text field there is nowhere for a secret, a path, or a prose reason to land — and it guarantees the no-tab invariant that makes unquoted TSV safe |
| Must | Scaffolded `.gitattributes` marking the directory `-diff` | Closes the exposure channel no grep can see: without it, metric values reach an LLM through `git diff` in `/relay-code-review`, `/relay-commit` current-branch mode, and `/relay-qa-report` diff mode. Requires no command or agent to name the path |
| Must | `validate` check failing on the artifact path appearing under `agents/`, `commands/`, or `skills/` | Turns the anti-Goodhart promise into a build invariant — the timestamp-contract lesson applied preemptively |
| Must | Versioned codebook at `plugins/relay/resources/usage-metrics-schema.md`, with the schema version in each shard's **filename** | Meaning lives in the plugin repo the consumer already has; version-in-filename makes a bump physically incapable of contaminating older shards and makes concatenation provably homogeneous |
| Should | Backfill from the 205 tracked `PRPs/plans/*.jsonl` files | Buys a real "before" period on day one instead of waiting months. Backfilled rows carry `-` for plugin version, stated in the codebook rather than guessed |
| Should | Reader shipped inside the plugin, not only repo-local | The person whose project holds the data usually does not hold a relay checkout |
| Should | Scaffolded `PRPs/metrics/.gitignore` with an explicit re-include | Defends against target repos carrying a blanket `*.tsv` / `*.csv` ignore — routine in data and ML projects — which would otherwise silently void the tracked-by-default rationale |
| Could | `doctor` subcommand reporting staleness and expected-but-absent signals | The only available defense against a silent collector |
| Won't | Hooks of any handler type | Concentrated failure modes across all three review lenses; deferred to Phase 5 behind proven idempotency, silence and speed |
| Won't | Token / cost attribution per phase | No join key exists between a Claude Code session and a relay feature or phase |
| Won't | Content-addressed row ids over mutating sources | `orchestrator-run.json` is written progressively and receives a post-merge write-back; hashing it mints a new id per mutation and amplifies one run into a dozen rows |

### MVP Scope

The codebook and field contract, the materializer with backfill, the `PRPs/metrics/` layout with its scaffolded `.gitattributes` and `.gitignore`, and the two `validate` checks. Materialization is an explicit human act — `node <plugin-root>/scripts/usage-metrics.mjs materialize` — which is also what makes consent structural in the MVP: nothing writes unless a person asks it to.

### User Flow

Operator runs the materializer (after `/relay-approve` closes a feature, or at a release cut) → commits `PRPs/metrics/` → periodically copies those directories from N projects into one place → the interpreter reads the slices and answers "which stage is worst, and did the last change help".

---

## Technical Approach

**Feasibility:** HIGH

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

`test_frameworks: ["node:test"]` is declared in this repository, so the test pair is active in test-after mode.

### Architecture Notes

- **Layout.** `PRPs/metrics/` holds `verdict-v1-<YYYY-MM>.tsv`, `rubric-v1-<YYYY-MM>.tsv`, `run-v1-<YYYY-MM>.tsv`, a `-undated` shard per relation, and `scan-v1.tsv`. An `undated` destination is mandatory, not polish: verified that `orchestrator-run.json` phase entries carry no timestamp at all, so a month-sharded run relation without it has no computable filename for most of its rows. The idiom is borrowed from `efficiency.mjs`'s existing `undated` partition.
- **Format is a shape-driven hybrid.** Flat, uniform relations are TSV — a measured experiment puts tabular ~62% below pretty JSON in prompt tokens for exactly this shape, because field names are written once in a header instead of once per record. The savings come from removing structural repetition, not from shortening field names, so column names stay readable. Nested or variable-shape data, if any is ever needed, takes compact JSON instead.
- **Keys and idempotency.** Full regeneration, not append-plus-dedup. Natural composite keys — `(proj, stage, art, seq)` for verdicts, `(proj, feat, phase, stage)` for runs — mean a later write-back updates a row instead of minting a new one. Content hashing is restricted to append-only immutable sources and never applied to progressively-written JSON.
- **Denormalization is deliberate.** `proj`, `stage` and the timestamp are repeated into the rubric relation so the most-asked question — top failing ids per stage — needs no join. Rubric ids only look self-describing: `R-COH-OTHER-INTERNAL-CONTRADICTION` appears in both plan-review and code-review, so prefix inference is wrong.
- **Consumer wiring.** The reader registers in the `CONSUMERS` array of `scripts/validate/checks/timestamp-contract.mjs`, inheriting the two-sided producer/consumer contract. Degraded rows carry `deg` and are excluded at read time with a named, counted warning, never rewritten — the [2026-07-31] precedent.
- **Validation placement.** The anti-Goodhart grep is a hard check. Any check that parses shard contents stays **out** of the pre-commit-gated path or is warn-only: `npm run validate` is this repo's pre-commit gate, and a metrics artifact must never be able to block a commit.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The operator never commits `PRPs/metrics/`, so nothing survives a clone and the entire layout rationale is void | M | AC-1/AC-2: `git status --porcelain PRPs/metrics/` must be empty after a second materialization; untracked files print `??` and fail it |
| Target project carries a blanket `*.tsv` / `*.csv` ignore, silently tracking zero bytes | M | Scaffolded `PRPs/metrics/.gitignore` with an explicit re-include |
| A shard-parsing check on the pre-commit path turns metrics corruption into a repo-wide commit blocker | M | Shard parsing is warn-only and outside the gate |
| The version axis is approximate — the `scan` relation bounds rows between known versions rather than stamping each row | H | Accepted and documented in the codebook; exact stamping would require emission in the hot path, which the token constraint forbids |
| Feature and artifact slugs remain project-identifying after the closed-enum contract eliminates every other free value | M | Named as documented-not-redacted (redaction-policy L3); a hashing option is an open question rather than an assumed default |
| Concurrent materialization from two worktrees writing the same shard | L | The writer is human-invoked and regenerates in full; no concurrent automated writer exists in the MVP |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Codebook + field contract | `plugins/relay/resources/usage-metrics-schema.md`: the four relations, every column, every enum domain, the `-` sentinel rule, version-in-filename, the documented version-axis approximation | complete | - | - | PRPs/plans/completed/usage-metrics-phase-1-codebook-field-contract.plan.md |
| 2 | Materializer + backfill | `plugins/relay/scripts/usage-metrics.mjs` (no deps): full-rescan regeneration from `PRPs/plans/*.jsonl` and `PRPs/reports/**`, `--dry-run` printing only row counts and shard paths, backfill of the tracked verdict corpus | complete | - | 1 | PRPs/plans/completed/usage-metrics-phase-2-materializer-backfill.plan.md |
| 3 | Layout scaffolding + reader | `PRPs/metrics/` creation with `.gitattributes` (`-diff`, `text eol=lf`) and `.gitignore` re-include; the read/query subcommand shipped in the same script | complete | - | 2 | PRPs/plans/completed/usage-metrics-phase-3-layout-scaffolding-reader.plan.md |
| 4 | Validation + registry | Metrics-isolation grep check in `scripts/validate/`, reader registered in the `CONSUMERS` array, warn-only shard sanity check outside the pre-commit gate | complete | - | 3 | PRPs/plans/completed/usage-metrics-phase-4-validation-registry.plan.md |
| 5 | Automated emission (deferred) | Only if and when a hook-based supplement is justified: `plugins/relay/hooks/hooks.json` restricted to `type: command` + `async: true`, a consent key in `methodology.md`, and a standing check asserting both | deferred | - | 4 | - |

**Note on row 5's `deferred` status.** `deferred` is not one of the five
canonical lifecycle states (`pending` → `in-progress` → `implemented` →
`tested` → `complete`). It is used here deliberately, as a local value in this
PRD only, and it is safe by the pipeline's own operative rules: a row is
actionable only when its `Status` cell equals `pending` exactly, and a row is
dependency-satisfying only from `implemented` onward — no row depends on row 5,
so nothing is blocked by it. The effect is that `/relay-execute` treats row 5
as out of scope instead of halting on it every run, which is what the
`FAILED_PHASE_SCOPE_UNPLANNABLE` halt (2026-08-14) recommended.

`deferred` reads as "consciously not scheduled", which `pending` cannot
express: `pending` means "no plan yet, actionable now", and this phase is
explicitly gated on evidence that does not exist. To enter the phase later,
hand-edit the cell back to `pending` — the same documented escape hatch that
governs re-running any phase.

### Phase Details

**Phase 1: Codebook + field contract**
- **Goal:** settle every field before a single byte is written into anyone's repository.
- **Scope:** the schema resource file only; no executable code.
- **Success signal:** a reviewer can state, for each column, its domain and the plugin-improvement decision it informs.

**Phase 2: Materializer + backfill**
- **Goal:** produce the tables deterministically from artifacts that already exist.
- **Scope:** one script, no dependencies, `materialize` and `--dry-run` modes.
- **Success signal:** AC-1 and AC-3 pass against this repository's own corpus.

**Phase 3: Layout scaffolding + reader**
- **Goal:** make the artifact durable, portable, and readable by its owner.
- **Scope:** directory scaffolding with its two git control files; the query subcommand.
- **Success signal:** AC-4 and AC-6 pass.

**Phase 4: Validation + registry**
- **Goal:** convert the guarantees from prose into build invariants.
- **Scope:** one hard check, one warn-only check, one registry entry.
- **Success signal:** AC-5 passes; `npm run validate` stays green on a clean tree.

**Phase 5: Automated emission (deferred)**
- **Goal:** capture what derivation cannot — per-agent wall-clock, unterminated sessions.
- **Scope:** deliberately unspecified until Phases 1–4 have run in practice.
- **Success signal:** not yet defined; entering this phase requires evidence that the manual cadence is insufficient.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Collection architecture | Derive-then-materialize by full rescan | Event-log-first via hooks; hybrid | The un-derivable set is small and specific; a three-lens design review scored the derive design 9/8 on constraint compliance and operational survival, and hook-driven emission carried the only fatal constraint breaches |
| Artifact location | New tracked directory `PRPs/metrics/` | `!PRPs/reports/usage-metrics/` mirroring the efficiency carve-out | The carve-out works only with the contents form `PRPs/reports/*`; a target using the directory form makes the negation a silent no-op, and relay does not own a target's `.gitignore` |
| Format | TSV for the flat uniform relations, version in the filename | Single append-only JSONL; SQLite; Parquet | Measured ~62% prompt-token advantage for flat uniform records; SQLite and Parquet are binary in git and append-hostile |
| Field names | Kept readable | Abbreviated to 2–3 characters | The measured savings come from removing structural repetition, not from shortening names; no study isolates short names as a win, and terse names cost the interpreter clarity for nothing |
| Idempotency | Full regeneration; natural composite keys | Content-addressed ids; append + reader-side dedup; Kafka-style producer sequence | `orchestrator-run.json` mutates progressively and receives a post-merge write-back, so content hashing amplifies one run into many rows |
| Version axis | `scan` relation bounding rows between observed versions | Per-row stamping at emission time | Exact stamping requires emission in the hot path, which the zero-token constraint forbids; no existing artifact records a plugin version, so derivation cannot recover it |
| Consent | The human invocation is the consent; no methodology key in the MVP | A `usage_metrics` frontmatter key from day one | Nothing writes unless a person runs the script; the key becomes necessary only when automated emission ships (Phase 5), and adding it earlier would be an unused gate |
| Rubric rows retained | Both passing and failing | Failing only | Only the full set answers "which checks never fire" and reconstructs rubric composition per version; the corpus already interleaves two rubric generations |
| Anti-Goodhart enforcement | `validate` grep over agents, commands and skills, plus `-diff` in `.gitattributes` | Prose rule only | The grep cannot see values reaching an LLM through `git diff`; the two controls cover different channels and neither requires a command to name the path |

---

## Research Summary

**Market Context**

A measured nine-format experiment finds tabular formats about 62% cheaper than pretty JSON in LLM prompt tokens for flat uniform records, with the advantage inverting for nested data; the savings come from writing field names once rather than from abbreviating them (jangwook.net token-cost experiment; TOON format analysis). OpenTelemetry's schema convention keeps payloads terse by carrying only a `schema_url` pointer while definitions live in an externally published immutable file — the precedent for a terse artifact plus a versioned codebook. Kafka's idempotent producer (producer id plus monotonic sequence) and practitioner guidance on idempotency keys frame the dedup options for at-least-once producers; full regeneration sidesteps the category entirely. DORA's current official model is five metrics in two factors, Throughput and Instability, with deployment rework rate added in 2024 and both instability metrics kept distinct — the taxonomy this artifact's relations follow. Claude Code's hook surface was verified against the official reference: 31 events, five handler types, of which only `command` satisfies a zero-token, no-network constraint, and `async: true` fire-and-forget hooks are the documented mechanism for logging. Anthropic's published autonomy metrics (turn duration, auto-approve share, interruption rate) were confirmed against the primary source; a claimed contribution-metrics matching window could not be verified and is deliberately not cited anywhere in this PRD.

**Technical Context**

Verified in this repository: `PRPs/plans/*.jsonl` is tracked (206 files) while `PRPs/reports/*` is gitignored at `.gitignore:32` with the single carve-out `!PRPs/reports/efficiency/` — the asymmetry that makes materialization necessary rather than optional. Pipeline artifacts resolve to the main checkout even when a run happens inside `.worktrees/<feature>/`, and `/relay-execute` states that the worktree and its branch persist on disk even when the pipeline halts, with only `/relay-approve`'s merge path removing them — so a metrics corpus built from the main checkout is not biased against failed runs. No artifact under `PRPs/` records a plugin version. `orchestrator-run.json` phase entries carry no timestamp, mandating an `undated` shard. `scripts/efficiency.mjs` already computes per-stage sessions, runs-per-session, first-attempt failure rate and per-class fail tallies, splitting sessions on any passing verdict and excluding `timestamp_degraded` artifacts from both sides of a comparison. Adding a check to `npm run validate` is one import plus one array entry in `scripts/validate/index.mjs`; `checks/timestamp-contract.mjs` demonstrates the two-sided producer/consumer contract via its `REVIEWERS`, `COMMANDS` and `CONSUMERS` arrays, though no existing check validates a runtime data artifact's shape. Scripts under `plugins/relay/scripts/` ship to every install and are invoked via the plugin-root placeholder, while `scripts/*.mjs` is repo-local and wired through npm scripts. relay ships no hooks today. A real `.review.jsonl` line measures ~570 bytes, dominated by file paths and prose rather than by codes.

---

*Generated: 2026-08-13*
*Approved: 2026-08-13*
*Status: APPROVED*
