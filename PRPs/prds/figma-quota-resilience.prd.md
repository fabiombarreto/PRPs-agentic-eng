# Figma Quota Resilience

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions; cross-cutting patterns; impact on reusable services (two commands, four agents, one rubric, one template surface shared across the Figma tracks)
- Decisions found:
  - [2026-07-22] MCP-access spike — Figma MCP calls stay in the interactive command's own session; baseline retained despite confirmed subagent reachability. Binds the scoped-scan design: the pre-match must run in the command, never in a dispatched agent.
  - [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder inside `/relay-implement` — named rungs, exhaustive outcome mapping, "fail toward the safer rung" default for unrecognized results, rung persisted in the artifact itself. The precedent this PRD's Figma-side ladder clones rather than re-derives.
  - [2026-07-23] Component map is a durable `docs/design/` knowledge-base artifact, not a per-run `PRPs/` pipeline artifact; its supporting evidence bundle IS a per-run artifact under `PRPs/reports/design-map/evidence/`. Binds where the checkpoint may live.
  - [2026-07-23] `docs/context/design-system.md` is command-owned — scaffolded by `/relay-design-map`'s P2 precondition. The cost-preflight reads the same file; it introduces no second config surface.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous. `/relay-design-map` and `/relay-design-spec` already sit outside the autonomous stretch, so the cost-confirmation gate needs no new boundary extension.
  - [2026-04-19] Command surface: one command per stage, writer and reviewer split.
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`.
- Applicable anti-patterns:
  - "Querying the Figma MCP from a dispatched writer/reviewer agent" — the scoped-scan pre-match and the quota preflight must not widen any agent's tool allowlist; both run in the command session.
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — the cost preflight declares and asks; it never auto-refuses, never auto-flips, and never infers consent from silence.
  - "Injecting plugin defaults into the target project's `decisions.md`" — `max_metadata_calls` is a relay-level constant hardcoded in the command, never written into a target project's governance files.
  - "Writing pipeline artifacts under `.claude/`" — the checkpoint relocates out of `evidence_dir` but stays under `PRPs/`.
  - "Weakening or deleting tests to make the auto-correction loop turn green" — the rubric-count tests this PRD rewrites are changed to re-derive rather than to relax; the change must go through the test pair's lifecycle ledger, never the Implementer.
- Applicable architectural rules:
  - `docs/context/architecture.md` — the evidence bundle is "the sole Figma-fact source either agent is permitted to read".
  - `docs/context/architecture.md` — `/relay-design-map` dispatches an MCP-free writer/reviewer pair; `/relay-design-spec` inline-adopts its pair and performs all Figma MCP calls in the main session.
  - `${CLAUDE_PLUGIN_ROOT}` resolves to `plugins/relay/` and plugin install is a verbatim directory copy — the plugin manifest has no `files`/`include`/`exclude` field. Any resource an installed agent must read has to live inside `plugins/relay/`.
- Result: PROCEED
```

## Problem Statement

`/relay-design-map`'s Phase B instructs one `get_metadata` call **per component or component set discovered** in the target Figma library, with no budget. On a real production library (7019 components, 71 component sets) that is 7090 calls against a documented Figma MCP quota of 6 calls/month (View/Collab seat, every plan) or 200–600 calls/day (Dev/Full seat). The step is arithmetically infeasible on every published plan. Because the load-bearing Figma calls also have no failure path, no checkpoint, and no cost declaration, an exhausted run dies opaquely, records nothing about how far it got, and the next invocation restarts from zero — burning quota again. The cost of not solving it: the Figma visual-first track is unusable on any production-scale design library, and the artifacts it does produce assert a completeness the evidence does not support.

## Evidence

- `plugins/relay/commands/relay-design-map.md:222-224` — "For each component (or component set) discovered, call node-scoped `get_metadata`". No budget, no failure path, no cap.
- Exhaustive grep for `rate.?limit|429|Retry-After|quota|backoff|throttle` across all of `plugins/relay/` returns **zero** hits on the Figma surface. The only match is an unrelated HTTP readiness-poll backoff in `plugins/relay/scripts/visual/provision.mjs:101,117`.
- `plugins/relay/commands/relay-design-map.md:218` — `max_library_search_calls = 40` is the only numeric Figma budget in the entire plugin, and it governs the cheap call. It is also calibrated 6.7× above a View seat's entire monthly quota.
- `plugins/relay/commands/relay-design-map.md:225-230` — `get_code_connect_map`, the one explicitly *optional* Figma call, is the **only** one with a fully specified failure path ("A Code Connect failure is never fatal to this command"). Failure handling is inverted relative to importance.
- `plugins/relay/commands/relay-design-map.md:111-131` — P1 tests tool **discoverability** via `ToolSearch` but its message asserts **reachability** ("No Figma MCP server is reachable from this session"). In the observed incident the quota was already at zero, tools were still discoverable, P1 passed, and the command advanced confidently into the one region of the protocol with no failure handling.
- `plugins/relay/agents/design-map-writer.md:121-127` spells out exactly one fallback branch (missing/empty `evidence_dir` → zero evidence). It never instructs reading `library-search.json`'s own `truncated` field and propagating it when the directory is present but partial — the most likely real-world state is the only unhandled one. `plugins/relay/agents/design-map-reviewer.md:204` carries the same uncapped "Read every file under `evidence_dir`" instruction with no missing-evidence branch at all.
- Observed incident (`PRPs/reports/figma-rate-limit-relay.md`): a partial enrichment pass rewrote `library-search.json` non-cumulatively, erasing two prior successful calls from the record and retroactively invalidating an already-APPROVED component map, which then failed R-DM4 and R-DM5.
- Observed incident: the resulting map carried `inventory_truncated: false` with 31 of 48 rows INFERRED purely because enrichment never ran. R-DM5 checks inventory completeness, not enrichment completeness, so the map passed the rubric while every row was unenriched.
- Figma's official MCP rate-limits page (verified 2026-08-03): View/Collab = 6/month on every plan; Dev/Full = 200/day + 10/min (Starter), 200/day + 15/min (Professional), 600/day + 20/min (Organization), unspecified (Enterprise). Exactly three tools are exempt: `whoami`, `add_code_connect_map`, `generate_figma_design`. The page documents **no** reset mechanics and **no** error shape on exhaustion — no 429, no `Retry-After`.
- Ecosystem evidence: `GLips/Figma-Context-MCP`, the most widely used open-source Figma MCP server, documents no scoping, caching, checkpointing or cost-estimation strategy, and carries an unanswered issue (opened 2025-11-23) reporting repeated HTTP 429 on the `/nodes` endpoint. The gap is industry-wide, not relay-specific.
- `plugins/relay/agents/visual-verifier.md:88` — the degradation-ladder idiom relay already owns, applied to subprocess failures but never to MCP failures: "An unrecognized exit code from `provision.mjs` is treated as `DEGRADED_PROVISION_FAILED` — fail toward the safer degraded rung, never toward silently reporting `FULL`."
- The installed plugin cache (`relay/0.25.1`) contains only `README.md`, `agents/`, `commands/`, `scripts/`, `skills/` — **no `docs/` directory**. Every `${CLAUDE_PLUGIN_ROOT}/docs/context/*-template.md` read fails for every installed user; it resolves only when cwd is this repo, which is exactly the dogfooding case. Audited in `PRPs/reports/plugin-root-audit/`.

## Proposed Solution

Invert `/relay-design-map`'s Phase B from *enumerate-then-enrich-everything* to *enumerate → pre-match → enrich only candidates*, and give every load-bearing Figma call the three things it currently lacks: a numeric budget, a named failure path, and a cumulative record of what it already accomplished. The pre-match is a deterministic, recall-oriented name/slug comparison performed by the command itself against the design-system clone it already has in `design_system_config` — no Figma calls, no new agent, no widened tool allowlist, and no change to who owns the authoritative match (the `design-map-writer` still does). On top of that, a `whoami`-based preflight (the documented quota-exempt probe) declares the estimated call cost against the seat's documented ceiling and requires explicit confirmation before spending, a named degradation ladder cloned from `visual-verifier.md` makes partial results visible in the artifact rather than only in the caller, and an additive, checkpointed evidence contract makes an interrupted run's retry cost only the delta. The alternative considered and rejected is an embedded REST fallback: it would introduce a Figma credential surface the plugin does not have today, cover less than half the need (no cheap substitute for `get_design_context`), and contradict the standing prohibition in `plugins/relay/agents/visual-verifier.md:190` against out-of-band Figma access via `Bash`.

## Key Hypothesis

We believe scoping the metadata fan-out to pre-matched candidates, declaring cost before spending, and making evidence cumulative and resumable will make the Figma track usable on production-scale design libraries for Dev/Full seats, and will make View-seat failure cheap and honest instead of destructive.

We'll know we're right when a full `/relay-design-map` on a ~7000-component library completes within a single day's Dev/Full quota, and a quota-interrupted run's retry issues zero redundant Figma calls.

## What We're NOT Building

- **An embedded REST fallback (`FIGMA_TOKEN` + `scripts/figma-rest-*.mjs`)** — introduces a credential surface the plugin does not have today (scopes, rotation, log-leak risk), substitutes well for only `search_design_system` and partially for `get_metadata` while leaving `get_design_context` (the entire reason `/relay-design-spec` exists) with no low-cost equivalent, creates two sources of truth for "what the library is" with a `source:` field to propagate through every downstream artifact and rubric, and directly contradicts `plugins/relay/agents/visual-verifier.md:190`'s standing prohibition on out-of-band Figma access via `Bash`. The hand-written REST scripts remain documented prior art in the consuming project, referenceable from a HALT message, without the plugin owning the credential or the maintenance.
- **Evidence-bundle condensation / an agent-facing library index** — the 7023-file, 15.5 MB handoff against two agents instructed to "Read every file under `evidence_dir`" is a real defect, but it is a **context-budget** problem, not a rate-limit one. Scoping the scan shrinks enrichment calls without shrinking the enumerated inventory, so condensation remains genuinely open. Deferred to its own PRD so this one stays about quota; recorded in Open Questions.
- **A shared, session-wide Figma call budget across commands** — grounding confirmed no aggregate budget mechanism exists; each budget is scoped to one call-type in one command. Introducing cross-command accounting is a larger design than this PRD's problem requires.
- **Automatic quota-exhaustion refusal** — the preflight declares and asks. `whoami` can report the wrong plan for the file in question (it reports on identity, not on the plan governing the file key), so a hard auto-refusal built on a misread plan would block runs that would have succeeded. A false-negative HALT is worse than the false-positive PASS being fixed.
- **Retry/backoff against the Figma MCP** — sleeping is the correct response to a per-minute bucket and useless against a per-day or per-month one. This PRD adds abort-and-record, not a retry loop.
- **Reopening `PRPs/reports/plugin-root-audit/fix-plan.md` as a separate track** — its F2–F6 are absorbed as Phase 1 of this PRD, which becomes the single source of truth for that work. The fix-plan document is retained as historical rationale and must be marked superseded so the two cannot silently diverge.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Figma MCP calls per `/relay-design-map` run on a ~7000-component library | ≤ 200 (fits one Dev/Full day) — down from 7090+ | Cumulative `call_log` in the evidence bundle header |
| Redundant Figma calls on a resumed run | 0 | `call_log` delta between the interrupted run and its resume |
| Runs terminating without a named outcome (rung or HALT code) | 0 | Every run's bundle header records exactly one named rung or HALT code |
| Component maps asserting completeness the evidence does not support | 0 | `R-DM7` outcome in `docs/design/component-map-review.jsonl` |
| Plugin-owned resources unreachable from an installed plugin | 0 of 8 | `ls ~/.claude/plugins/cache/relay-marketplace/relay/<version>/resources/` after publish |

## Acceptance Criteria (test scenarios)

- **AC-1 Scoped enrichment:** Given a Figma library enumerating 7019 components and 71 component sets, and a design-system clone containing a few dozen name/slug matches, when `/relay-design-map` Phase B runs, then the number of `get_metadata` calls issued is bounded by `max_metadata_calls` and is proportional to the pre-matched candidate set rather than to the enumerated library size, and the evidence bundle header records both `candidates_prematched` and `metadata_calls_made`.
- **AC-2 Budget declared in both places:** Given `plugins/relay/commands/relay-design-map.md`, when `max_metadata_calls` is introduced, then it appears both in the command body and in the frontmatter `description`, matching the convention `max_library_search_calls` already follows in that same file; and its exhaustion is non-fatal, recording `enrichment_truncated: true` with a reason.
- **AC-3 Pre-match is recall-oriented and non-authoritative:** Given the command's pre-match selects candidate set C, when `design-map-writer` runs, then the writer may map any component present in the evidence bundle regardless of membership in C, and the command's prose states explicitly that the pre-match over-includes by design and carries no classification authority.
- **AC-4 P1 message states what it tested:** Given no Figma MCP tool can be discovered via `ToolSearch`, when P1 fails, then the message states that no Figma MCP tools are **discoverable in this session** — never that no server is reachable.
- **AC-5 Cost declared before spending:** Given `whoami` returns a response exposing seat and tier, and the scan's estimated call cost exceeds the documented ceiling for that seat, when the command reaches the preflight, then it declares the estimate and the ceiling and requires an explicit affirmative reply before issuing any data call, treating a non-answer or ambiguous reply as do-not-proceed. Given `whoami`'s response does not expose seat/tier, then the preflight proceeds without the declaration and records the degradation in the bundle header rather than halting.
- **AC-6 Quota failure is distinct and honest:** Given a Figma MCP data call fails with a rate-limit error class, when the command halts, then the code is `FAILED_FIGMA_QUOTA_EXHAUSTED`, distinct from `FAILED_FIGMA_MCP_UNAVAILABLE`; the message names the scoped scan as the durable fix; it promises no reset time; and if it mentions a Dev/Full seat at all it carries both halves of the fact — that the upgrade improves quota roughly a thousandfold **and** that no seat makes whole-library enrichment viable.
- **AC-7 No sleeping against day/month buckets:** Given a quota-class Figma error, when the command responds, then it aborts and records; it does not sleep-and-retry. Detection is by error class/string, never by HTTP status, because the MCP documents neither 429 nor `Retry-After`.
- **AC-8 Evidence writes are additive:** Given a complete evidence bundle on disk and a subsequent partial run, when the partial run writes, then the bundle is merged rather than replaced, the call log is cumulative across runs, and no entry is retired unless the writing scan itself reports `inventory_truncated: false`.
- **AC-9 Checkpoint is outside the read surface:** Given the run checkpoint exists, when either `design-map-writer` or `design-map-reviewer` executes its "read the evidence" step, then the checkpoint file is not among the files read, enforced by its path being outside `evidence_dir` rather than by a dotfile naming convention.
- **AC-10 Completeness flags describe the artifact, not the run:** Given a bundle whose component list is complete and whose `metadata/` directory holds zero enriched nodes, when the flags are computed, then `inventory_truncated` is `false` and `enrichment_truncated` is `true`, both derived by scanning what is on disk rather than from the invoking run's intent. Given an empty component-set list, then `enrichment_truncated` is not reported as complete.
- **AC-11 Downgrade is surgical, not wholesale:** Given rung `DEGRADED_NO_ENRICHMENT`, when confidence is assigned, then rows whose `Props/variant mapping` relies only on variant axes recoverable from component names may remain `CONFIRMED`; rows depending on non-variant properties (booleans, TEXT, INSTANCE_SWAP) may not; and rows carrying a human `verified_at` are never downgraded, only flagged for re-verification.
- **AC-12 R-DM7 catches dishonest completeness:** Given a map declaring enrichment completeness inconsistent with its bundle, or a `CONFIRMED` row depending on property data the bundle marks unenriched, when `design-map-reviewer` runs, then `R-DM7` fails and the verdict is `CHANGES_REQUESTED`.
- **AC-13 Rubric counts are re-derived, not hardcoded:** Given the `R-DM` (or `R-DS`) rubric gains or loses an item, when the validation corpus runs, then the rubric-count assertion re-derives the count from a live grep of `### R-DM<n>` / `### R-DS<n>` headings and fails loudly on drift, rather than passing against a hardcoded literal.
- **AC-14 Resume costs only the delta:** Given a run interrupted after partial enrichment, when the command is re-invoked, then it issues zero Figma calls for work already recorded in the checkpoint; a fully-cached re-run issues zero Figma calls in total.
- **AC-15 Design-spec traversal has an exit under refusal:** Given `get_design_context`, `get_variable_defs` or `get_screenshot` is refused mid-traversal, when the `design-spec-writer` agent's own Phase 2 exit gate is evaluated (its traversal phase — not this PRD's Implementation Phase 2), then the writer takes a named partial-evidence branch instead of deadlocking, covering all three losses (`raw/`, `refs/`, `raw/variables.json`); and on the token loss specifically, `R-DS4` reports "tokens not collected" rather than "token does not resolve".
- **AC-16 Re-traversal is instrumented:** Given a `/relay-design-spec` review round that failed because of quota, when the `max_spec_review_retries` exhaustion offer is presented, then the accumulated Figma-call consumption is displayed and the "retry with corrected inputs" outcome is suppressed, because a re-traversal under an exhausted quota is guaranteed to fail.
- **AC-17 Plugin-owned resources reach installed users:** Given the plugin is installed from the marketplace, when `~/.claude/plugins/cache/relay-marketplace/relay/<version>/resources/` is listed, then it contains all 8 plugin-owned resources; and given a resource cannot be read, then the consuming agent takes a named failure path instead of improvising the artifact's shape from memory.
- **AC-18 Non-Figma projects are untouched:** Given `figma_track` is `false` or absent in the target's `docs/context/methodology.md`, when any command in this PRD's scope runs, then its observable behavior is byte-identical to the pre-change behavior — no new prompt, no new preflight, no new message line.

## Open Questions

- [ ] Evidence-bundle condensation (the 7023-file / 15.5 MB agent handoff) is deferred to its own PRD. Does scoping the scan reduce it enough to lower the priority, or does the enumerated inventory keep it just as urgent? Needs a measurement on a real library after Phase 2 ships.
- [ ] Does `search_design_system` consume quota proportionally to the number of calls issued, or does it have its own internal fan-out? `max_library_search_calls = 40` already exceeds a View seat's entire monthly quota by 6.7×, so the budget may need recalibration downward — but the relationship between one `search_design_system` call and one quota unit is not documented.
- [ ] `whoami`'s response schema (seat / tier / plan fields) is observed, not documented. If Figma changes the shape, the cost preflight silently degrades to "could not determine seat". Is a degraded preflight acceptable indefinitely, or should it eventually be pinned to a documented surface?
- [ ] The MCP quota reset window is undocumented (no calendar/UTC/rolling/billing-cycle statement anywhere). Should relay eventually infer it empirically from observed recovery, or permanently refuse to state it?
- [ ] `GET /v1/files/:key/component_sets`'s Tier 3 placement is inferred from category grouping, not stated verbatim in Figma's docs. Only load-bearing if the rejected REST fallback is ever revisited.
- [ ] Should `max_library_search_calls` and `max_metadata_calls` get a `docs/decisions.md` rationale entry the way `max_test_retries = 3` has? Grounding found neither Figma budget has one.

---

## Users & Context

**Primary User**
- **Who:** The relay operator running `/relay-design-map` (once per project, or on `--refresh`) or `/relay-design-spec` (once per feature) against a real Figma library in a `figma_track: true` project.
- **Current behavior:** Runs the command blind. Discovers the cost only after the quota is gone, with no record of how far the run got and no way to resume.
- **Trigger:** Setting up a new Figma-enabled project, or authoring a Design Spec for a new feature.
- **Success state:** The command either completes within a declared budget, or stops after a single quota-exempt call with a named code and an evidence bundle that makes the next attempt cheap.

**Job to Be Done**
When I point relay at a real Figma library, I want to know what the scan will cost before it spends anything, and to have any interruption cost me only the delta on retry, so I can use the visual-first track on production libraries without burning a monthly quota I cannot get back.

**Non-Users**
Projects with `figma_track: false` or absent — nothing changes for them, byte-for-byte. Users wanting an embedded REST fallback — explicitly rejected above. The `visual-verifier` / `/relay-visual-review` path — MCP-free by its own tool allowlist and unaffected by everything in this PRD.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Plugin-owned resource packaging (`plugins/relay/resources/`) | Every installed agent's mandatory template read fails today. Also blocking: the new completeness and rung fields have no canonical place to be defined until the template is loadable. |
| Must | Scoped scan — enumerate → pre-match → enrich candidates only | The single change that turns an arithmetically infeasible step into a two-minute one. Everything else makes failure survivable; this makes failure rare. |
| Must | `max_metadata_calls` budget, declared in body and frontmatter | Converts an unbounded loop with undefined failure semantics into a bounded loop whose stopping point is recorded. Safety net if the pre-match over-includes. |
| Must | Named degradation ladder + `FAILED_FIGMA_QUOTA_EXHAUSTED` | No code today distinguishes rate-limit exhaustion from a connectivity failure. The rung must be persisted in the artifact, not only reported to the caller. |
| Must | Additive, cumulative, disk-derived evidence contract | A partial run retroactively invalidated an already-APPROVED map. Without this, any re-run can falsify an approved artifact. |
| Must | `R-DM7` — enrichment-completeness rubric item | Without a rubric item, splitting the truncation flag accomplishes nothing: `R-DM5` keeps checking the wrong fact. |
| Must | Cost preflight via `whoami` with explicit confirmation | The only quota-exempt probe available. Declares the ceiling before spending; never auto-refuses. |
| Must | Checkpoint / resume as a first-class concept | Directly carries the second half of the Key Hypothesis ("a quota-interrupted run's retry issues zero redundant Figma calls"), so it cannot be a Should without decoupling the hypothesis from the MVP. Also makes `--refresh` cost the delta and the additive merge trivially implementable. The mental model "Phase B runs whole or not at all" is false under any real quota regime. |
| Should | Design-spec partial-evidence branch + re-traversal consumption counter | `/relay-design-spec` is the surface that repeats per feature, and its writer's traversal-phase exit gate is an outright deadlock under persistent refusal. |
| Must | DERIVED rubric-count tests for `R-DM` and `R-DS` | Carried by AC-13 and scoped inside Phase 4, which is an MVP phase — an acceptance criterion inside an MVP phase cannot be a Should. Adding `R-DM7` breaks a test that matches "all six items pass" by exact regex, so the assertion is rewritten either way; re-deriving from live headings pays the debt instead of re-incurring it. |
| Could | `docs/decisions.md` rationale entries for the two Figma budget numbers | Brings them to parity with `max_test_retries = 3`. Cheap, but not blocking. |
| Won't | Embedded REST fallback | See "What We're NOT Building" — credential surface, partial coverage, direct conflict with a standing anti-pattern. |
| Won't | Evidence-bundle condensation / agent-facing index | Real, but a context-budget problem rather than a quota one. Its own PRD. |
| Won't | Cross-command aggregate Figma budget | Larger design than this problem needs; no existing mechanism to extend. |

### MVP Scope

Phases 1–5. Packaging unblocks the artifact fields; the scoped scan removes the infeasibility; the budget bounds what remains; the preflight and the named failure path make an exhausted quota cheap and legible; the evidence contract and `R-DM7` stop the artifact from lying; and resume makes an interrupted run's retry cost only the delta.

Phase 5 is inside the MVP rather than after it because the Key Hypothesis makes two claims, and the second one — "a quota-interrupted run's retry issues zero redundant Figma calls" — is delivered by resume, not by the evidence contract alone. Phase 4 creates the checkpoint; Phase 5 is what consumes it to skip already-completed work. Ending the MVP at Phase 4 would leave half the hypothesis untestable and Success Metric 2 unmeasurable.

Phase 6 (the design-spec quota path) is the only phase outside the MVP. It extends the same discipline to the per-feature command, and no Success Metric depends on it.

### User Flow

Operator runs `/relay-design-map` in a `figma_track: true` project → the command reads `design-system.md`, probes `whoami` (quota-exempt), enumerates the library within `max_library_search_calls` → pre-matches the enumerated components against the local design-system clone with `Glob`/`Grep`, producing a recall-oriented candidate set → declares the estimated `get_metadata` cost against the seat's documented ceiling; if the estimate exceeds it, asks for an explicit affirmative and stops on anything else → enriches only candidates, within `max_metadata_calls`, checkpointing as it goes → merges into the evidence bundle additively, deriving both truncation flags from disk → dispatches the writer/reviewer pair, which now sees an honest bundle and a persisted rung. On quota exhaustion at any point: abort, record the rung and how far it got, halt with `FAILED_FIGMA_QUOTA_EXHAUSTED`, and leave a checkpoint that makes the next invocation cost only the delta.

---

## Technical Approach

**Feasibility:** HIGH for Phases 2–6 (prose-only changes to commands and agents, plus test updates — no new runtime code, no new dependency, no credential). MEDIUM for Phase 1, which is mechanical but wide: a file move plus ~134 reference rewrites plus 55 hardcoded test-path constants, and its only true verification lives outside the repo in the installed plugin cache.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. This repo declares `test_frameworks: ["node:test"]`, so the pair is active in test-after mode.

Note for planning: several ACs here (AC-13 above all) land squarely on existing test files. Per `docs/anti-patterns.md` and the `R-X` strict rule, every test-file edit must be routed through the test pair's lifecycle ledger as an `EXISTING_TEST_UPDATED`, never authored by the Implementer — including the one-line regex changes.

### Architecture Notes

- **The pre-match runs in the command, not in an agent.** The [2026-07-22] MCP-access decision keeps all Figma MCP calls in the interactive command's session, and `docs/anti-patterns.md` structurally forbids widening the dispatched pair's tool allowlist. The command already holds `design_system_config` (including `local_clone_path`) and its frontmatter carries no `tools:` restriction, so `Glob`/`Grep` are available to it without any change. The rejected alternative was a new `design-map-candidate-writer` agent emitting `candidates.json`, which would have required a new agent, a new write-scope grant, and a new Decision Gate entry.
- **The pre-match duplicates part of `design-map-writer`'s Step 2 heuristic, and the two can diverge.** This is the real cost of keeping the architecture unchanged, and it must be named in the prose rather than discovered later: the pre-match is declared recall-oriented (over-includes, never under-includes) and explicitly non-authoritative, and the writer remains free to map anything present in the bundle.
- **The degradation ladder clones `visual-verifier.md:88`'s idiom verbatim in shape.** Named rungs without a domain prefix (`FULL`, `DEGRADED_NO_ENRICHMENT`, `DEGRADED_PARTIAL_INVENTORY`, `DEGRADED_NO_TOKENS`), `FAILED_*` reserved for terminal HALTs, exhaustive outcome mapping, "fail toward the safer rung" for unrecognized responses, and the rung persisted in the artifact so degradation is visible in the map and not just in the caller. Grounding confirms `FAILED_FIGMA_QUOTA_EXHAUSTED` collides with none of the ~30 existing codes, and that unprefixed names are the house convention for non-terminal states.
- **Quota detection is by error class/string, never by status code.** Figma's MCP documentation names no 429 and no `Retry-After`. The observed exhaustion string is `"You've reached the Figma MCP tool call limit for your <seat> seat on the <plan> plan."` Any detection built on HTTP semantics would be inferring REST behavior the MCP has never documented.
- **Retry is deliberately absent.** Backoff is correct against a per-minute bucket and useless against a 200/day or 6/month one. A ladder with a single "try again" rung reproduces the original defect.
- **The checkpoint moves out of `evidence_dir`** (to `PRPs/reports/design-map/.state/`), because both consumers are instructed to read every file under `evidence_dir` and the observed checkpoint was 7.15 MB — larger than the manifest itself. A leading dot in the filename is a convention, not a contract; nothing guarantees an agent's glob skips dotfiles.
- **Retirement detection constrains the additive merge.** Merge-only writes would break the withdrawal detection `design-map-writer.md:142-146` depends on: a component deleted in Figma would never leave the bundle. Each entry therefore carries a `last_seen_scan` generation id, and only a scan reporting `inventory_truncated: false` may retire entries; partial scans merge additively and retire nothing.
- **Phase 1's only real verification is outside the repo.** No in-repo check can prove packaging — the installed cache is the source of truth, and that gap is exactly what kept the defect alive across five releases. The new `plugin-root-resolvable` check (11 → 12 checks) guards the reference form; the cache listing after publish guards the packaging.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pre-match under-includes, silently dropping components the writer would have mapped | M | Prose mandates recall orientation (over-include by default); `max_metadata_calls` exhaustion is non-fatal and recorded; the writer may map anything in the bundle regardless of the candidate set |
| Pre-match and writer Step 2 heuristics drift apart over time | M | Declared non-authoritative in prose at both sites, with the coupling named explicitly rather than left implicit |
| Phase 1's ~134 rewrites plus 55 test constants introduce a regression the suite does not catch | M | `plugin-root-resolvable` check added in the same phase must fail against the pre-move state and pass against the post-move state; full corpus gate at each of F3/F4/F5 |
| `whoami`'s undocumented response schema changes, silently disabling the cost declaration | M | The preflight is conditional by construction — missing seat/tier degrades to a recorded gap, never to a halt or a fabricated ceiling |
| The three degenerate cases in flag derivation (cumulative failure scan; empty set list; run-intent leakage) reappear | M | AC-10 names two of them explicitly; the third (`node_enrichment` reporting run intent) is called out in the source report §4.3 and must be derived from disk like the others |
| Adding `R-DM7` misses one of ~20 encoded "six" sites, leaving the rubric internally inconsistent | M | AC-13's DERIVED test re-derives the count from live headings, converting a silent drift into a loud failure |
| Absorbing `fix-plan.md` F2–F6 lets the two documents diverge | L | The fix-plan is marked superseded as part of Phase 1; this PRD becomes the single source of truth |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Resource packaging | Move the 8 plugin-owned resources into `plugins/relay/resources/`, rewrite every reference, add the `plugin-root-resolvable` check, publish and verify against the installed cache | complete | - | - | PRPs/plans/completed/figma-quota-resilience-phase-1-resource-packaging.plan.md |
| 2 | Scoped scan + metadata budget | Invert Phase B to enumerate → pre-match → enrich candidates; introduce `max_metadata_calls` | complete | - | 1 | PRPs/plans/completed/figma-quota-resilience-phase-2-scoped-scan-metadata-budget.plan.md |
| 3 | Quota preflight + named failure | `whoami` cost declaration with explicit confirmation; corrected P1 message; `FAILED_FIGMA_QUOTA_EXHAUSTED` | complete | - | 2 | PRPs/plans/figma-quota-resilience-phase-3-quota-preflight-named-failure.plan.md |
| 4 | Evidence contract + rungs + R-DM7 | Additive cumulative bundle, relocated checkpoint, disk-derived split flags, persisted rungs, surgical downgrade, `R-DM7`, DERIVED rubric-count tests | complete | - | 1, 3 | PRPs/plans/figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md |
| 5 | Checkpoint / resume | Resume semantics so an interrupted run and `--refresh` cost only the delta | complete | - | 4 | PRPs/plans/figma-quota-resilience-phase-5-checkpoint-resume.plan.md |
| 6 | Design-spec quota path | Partial-evidence branch on the Phase 2 exit gate, `DEGRADED_NO_TOKENS`, consumption counter across re-traversal paths | pending | - | 3 | - |

### Phase Details

**Phase 1: Resource packaging**
- **Goal:** The 8 plugin-owned resources reach installed users, so every agent's mandatory template read resolves outside this repo.
- **Scope:** Absorbs `PRPs/reports/plugin-root-audit/fix-plan.md` F2–F6 (F0/F1 already complete, F1 committed in `9857be0`). Write the four resource-reference rules into `docs/context/conventions.md` first; `git mv` the 8 files to `plugins/relay/resources/` with no stubs; update the 55 hardcoded path constants across 8 test files plus the `docs/`, `README.md` and `documentation/` surfaces (including a `changelog.html` entry per `documentation/AGENTS.md`); rewrite references in severity order (18 `${CLAUDE_PLUGIN_ROOT}/docs/…`, 51 bare, ~25 converted to prose, ~10 deleted/inlined, ~30 line-pin removals); extend `path-existence.mjs` with the `resources/` prefix and delete its "KNOWN DEFERRED GAP" paragraph; add the `plugin-root-resolvable` check (11 → 12) with its own test using `withScanRootLock`; bump `plugin.json` and `changelog.html` in lock-step; verify the cache listing after publish. Give both writers a named failure path for an unreadable resource. Mark the fix-plan superseded. Do **not** rewrite historical artifacts under `PRPs/plans/completed/`, `PRPs/prds/`, `PRPs/reports/` or `docs/decisions.md`.
- **Success signal:** `npm run validate` reports 12/12; the full corpus passes; `ls ~/.claude/plugins/cache/relay-marketplace/relay/<new-version>/resources/` lists all 8 files.

**Phase 2: Scoped scan + metadata budget**
- **Goal:** Phase B stops enumerating-then-enriching everything.
- **Scope:** Insert a pre-match step between library search and metadata enrichment, executed in the command session via `Glob`/`Grep` against `design_system_config.local_clone_path`, producing a recall-oriented candidate set. Issue `get_metadata` only for candidates. Introduce `max_metadata_calls` in the command body **and** the frontmatter `description`; exhaustion is non-fatal and records `enrichment_truncated: true` with a reason. State in prose that the pre-match over-includes by design, carries no classification authority, and does not constrain what `design-map-writer` may map. Record `candidates_prematched` and `metadata_calls_made` in the bundle header.
- **Success signal:** A run on a ~7000-component library issues `get_metadata` proportional to the candidate set, bounded by the budget, with both counts recorded.

**Phase 3: Quota preflight + named failure**
- **Goal:** Declare cost before spending; fail with a named, honest code.
- **Scope:** Rewrite P1's message to claim discoverability rather than reachability. Add a `whoami` probe (documented quota-exempt) reading seat/tier when the response exposes them, degrading to a recorded gap when it does not. When the estimated cost exceeds the seat's documented ceiling, declare both and require an explicit affirmative reply, mirroring the existing confirm-then-flip discipline at `relay-design-map.md:358-363` — never inferred consent, never auto-refusal. Add `FAILED_FIGMA_QUOTA_EXHAUSTED`, detected by error class/string, with a message that names the scoped scan as the fix, promises no reset time, and carries both halves of the seat-upgrade fact. No retry, no backoff. Record seat/tier in the bundle header.
- **Success signal:** An exhausted-quota run halts after one exempt call with the named code, and the bundle records seat/tier and the estimate.

**Phase 4: Evidence contract + rungs + R-DM7**
- **Goal:** Evidence is cumulative and honest; degradation is visible in the artifact.
- **Scope:** Cumulative call log held in the checkpoint and projected into the manifest on write. Additive merge with a `last_seen_scan` generation id; only a scan reporting `inventory_truncated: false` may retire entries. Relocate the checkpoint to `PRPs/reports/design-map/.state/` and exclude it from the evidence read contract explicitly. Split `inventory_truncated` / `enrichment_truncated`, both derived by scanning disk, guarding the degenerate cases. Persist the rung in the map. Add the surgical downgrade rule. Instruct `design-map-writer` Step 1 to read `library-search.json`'s own `truncated` flag and propagate it when `evidence_dir` is present but partial; give `design-map-reviewer` Step 1 the missing-evidence branch it lacks. Add `R-DM7` across all ~20 encoded sites. Define the new fields in `component-map-template.md` (now packaged). Rewrite the `R-DM` and `R-DS` rubric-count assertions to re-derive from live headings.
- **Success signal:** A partial run cannot overwrite a more complete bundle; a map with unenriched `CONFIRMED` rows fails `R-DM7`; the DERIVED test fails loudly when a rubric heading is added or removed.

**Phase 5: Checkpoint / resume**
- **Goal:** A re-run costs the delta.
- **Scope:** Resume semantics over the Phase 4 checkpoint — skip work already recorded, make `--refresh` cost only the delta, and make a fully-cached re-run issue zero Figma calls. Explicitly out of scope: the REST script's lazy-credential property, which belongs to a path that holds a credential; the MCP path has none to defer.
- **Success signal:** An interrupted run's resume issues zero redundant calls; a fully-cached re-run issues zero calls in total.

**Phase 6: Design-spec quota path**
- **Goal:** `/relay-design-spec` has a defined outcome under quota exhaustion.
- **Scope:** Replace the unconditional exit gate of the `design-spec-writer` agent's Phase 2 (its traversal phase, `design-spec-writer.md:187-189` — not this PRD's Implementation Phase 2) with a named partial-evidence branch covering all three symmetric losses — `raw/` (nodes), `refs/` (screenshots), `raw/variables.json` (tokens). Add the `DEGRADED_NO_TOKENS` rung and make `R-DS4` report "tokens not collected" rather than "token does not resolve" when `variables.json` is absent. Carry a Figma-call consumption count across the two user-chosen re-traversal paths, display it in the `max_spec_review_retries` exhaustion offer, and suppress its outcome 1 when the previous round failed on quota. Add the quota halt to the command's "If the Writer halts" list, which today enumerates only the two Decision Gate halts.
- **Success signal:** A refused traversal produces a degraded spec with an accurate diagnosis rather than a deadlock, and the exhaustion offer never proposes a re-traversal that is guaranteed to fail.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Scoped-scan architecture | Pre-match in the command via `Glob`/`Grep` against the design-system clone, scoping only which components get `get_metadata` | New `design-map-candidate-writer` agent emitting `candidates.json`; defer the choice to planning | Requires no new agent, no write-scope grant, and no new Decision Gate entry, and respects the [2026-07-22] decision keeping Figma calls in the command session. Accepted cost: duplicates part of the writer's Step 2 heuristic, mitigated by declaring the pre-match recall-oriented and non-authoritative in prose at both sites |
| Resource packaging scope | Absorb `fix-plan.md` F2–F6 as Phase 1 of this PRD; mark the fix-plan superseded | Declare it an external dependency; redesign the new fields to avoid the template entirely | One source of truth and one sequencing surface. Accepted cost: content overlaps a plan that already exists, so the fix-plan must be explicitly superseded rather than left live |
| Rubric-count test strategy | Rewrite `R-DM` / `R-DS` count assertions to re-derive from live `###` headings | Update the hardcoded literal from "six" to "seven"; defer the DERIVED rewrite to a later phase | `R-DM7` breaks the existing exact-regex assertion regardless, and the DERIVED precedent already exists at `plan-reviewer-rubric-arithmetic-derived.test.mjs:166`. Paying the debt now costs marginally more than re-incurring it |
| REST fallback | Rejected outright — not as an automatic degraded path and not as an opt-in script under `scripts/` | Embed as automatic fallback; embed as opt-in script | An opt-in script still pays three of the four costs (credential surface, second source of truth, permanent maintenance against a model Figma reserves the right to change) and conflicts with `visual-verifier.md:190`'s standing prohibition. 90% of the value comes from failing well, not from an alternate path |
| Quota-error detection | By error class / error string | By HTTP 429 status; by a `Retry-After` header | Figma's MCP documentation names neither. Building on HTTP semantics would infer REST behavior the MCP has never documented |
| Response to quota exhaustion | Abort and record | Retry with capped exponential backoff, as the hand-written REST script did | Backoff drains a per-minute bucket and does nothing against a 200/day or 6/month one. The observed script slept through five attempts against a monthly bucket and enriched zero nodes |
| Preflight severity | Declare the ceiling and require explicit confirmation; never auto-refuse | Hard refusal when the estimate exceeds the ceiling | `whoami` reports on identity, not on the plan governing the file key, and can name the wrong plan. A false-negative HALT built on a misread plan is worse than the false-positive PASS being fixed |
| Checkpoint location | Outside `evidence_dir`, at `PRPs/reports/design-map/.state/` | Keep it in `evidence_dir` with a leading-dot filename | Both consumers are instructed to read every file under `evidence_dir`, and the observed checkpoint was 7.15 MB — larger than the manifest. A dotfile convention is not a read-exclusion contract |
| Retirement under additive merge | Entries carry `last_seen_scan`; only a scan with `inventory_truncated: false` may retire | Pure merge-only with no retirement | Merge-only silently breaks the withdrawal detection at `design-map-writer.md:142-146` — a component deleted in Figma would never leave the bundle, and `--refresh` would quietly stop working for deletions |
| Downgrade granularity under `DEGRADED_NO_ENRICHMENT` | Surgical — only rows depending on non-variant properties | Wholesale downgrade of every row | Variant axes survive without node enrichment (they are parseable from the `Prop=Value` component name), which is how 17 rows were legitimately `CONFIRMED` in a zero-enrichment bundle. A wholesale rule would have destroyed them |
| Condensation scope | Deferred to its own PRD | Include as a final phase here | It is a context-budget problem, not a quota one. Keeping it out preserves this PRD's single problem statement; recorded in Open Questions with a measurement trigger |

---

## Research Summary

**Market Context**

Figma's official MCP rate-limits page (verified 2026-08-03) documents View/Collab at 6 calls/month on every plan, and Dev/Full at 200/day + 10/min (Starter), 200/day + 15/min (Professional), 600/day + 20/min (Organization), unspecified (Enterprise) — a mapping that corrected the source report, which had shifted the Dev/Full figures one plan-column and stated Dev/Full Starter as 6/month. Exactly three tools are exempt: `whoami`, `add_code_connect_map`, `generate_figma_design`, the page explaining that limits apply only to read operations. The page documents neither the reset mechanics nor any error shape on exhaustion. The REST API, by contrast, has been tier-based (requests/minute) since 2025-11-17 and fully documents its 429 headers (`Retry-After`, `X-Figma-Plan-Tier`, `X-Figma-Rate-Limit-Type`, `X-Figma-Upgrade-Link`), and states verbatim that a file's own plan governs the limit regardless of the requester's seat — the documented mechanism behind the observed seat/plan mismatch. The `depth` parameter is documented purely as tree-traversal control, with no source tying it to quota cost, confirming the source report's own skepticism. Figma's `mcp-server-guide` says MCP limits "follow the same limits as the Tier 1 Figma REST API" — a calibration statement, not evidence of a shared bucket. On prior art, `GLips/Figma-Context-MCP`, the most widely used open-source Figma MCP server, documents no scoping, caching, chunking, checkpointing or cost-estimation strategy, and carries an unanswered issue (2025-11-23) reporting repeated 429s on `/nodes` — the gap this PRD addresses is unsolved across the ecosystem, not specific to relay. The principle that retry suits per-minute buckets while per-day/per-month exhaustion warrants abort-and-record is convergent practitioner framing rather than formal doctrine, and is treated in this PRD as reasoning rather than citation. Sources: developers.figma.com/docs/figma-mcp-server/rate-limits-access/, developers.figma.com/docs/rest-api/rate-limits, github.com/figma/mcp-server-guide, github.com/GLips/Figma-Context-MCP/issues/258. Unverified: `component_sets`' Tier 3 placement is inferred from category grouping rather than stated verbatim; the MCP reset window is undocumented in every source consulted.

**Technical Context**

Budget declaration convention: `relay-design-map.md` and `relay-design-spec.md` are the only two files restating their numeric budgets in the frontmatter `description`; every other budget in the plugin is body-only — so a new budget in `relay-design-map.md` must be declared twice (`relay-design-map.md:2`, `:218`). HALT naming: `relay-qa-report.md:20` names the house idiom explicitly ("the `FAILED_<REASON>:` named-HALT blockquote idiom"); terminal failures use `FAILED_<UPPER_SNAKE>` while deliberate pauses are unprefixed (`AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`, `PARTIAL_D8_FAILURE`), and no existing code collides with `FAILED_FIGMA_QUOTA_EXHAUSTED`. Degradation ladder: `visual-verifier.md:88` is the reference implementation — exhaustive outcome mapping with "fail toward the safer degraded rung, never toward silently reporting `FULL`", the rung persisted per-frame in `fidelity-report.json` and consumed by three commands. Rubric extension cost: `design-map-reviewer.md` encodes its six-count across ~20 sites (frontmatter, opening prose, Hard Constraint 2, rubric heading and intro, six `###` headings, Step 2 walk, both verdict branches, the worked JSONL example, the format spec, two anti-pattern bullets), and `design-spec-reviewer.md` repeats the identical pattern at seven items. Validation blast radius: `figma-track-phase3.test.mjs:322-333` matches the string "all six items pass" by exact regex, so `R-DM7` breaks it; `fix-design-system-config-producer.test.mjs` is the precedent shape for a new-HALT-code test; and `plan-reviewer-rubric-arithmetic-derived.test.mjs:166` is the DERIVED precedent worth adopting ("re-derived here, not hardcoded, so a future heading addition/removal fails loudly instead of silently drifting"), with no equivalent existing for `R-DM` or `R-DS`. Confirm-then-flip prior art: `relay-design-map.md:358-363` already requires "an explicit, quoted confirmation... A non-answer, an ambiguous reply, or any reply that is not affirmative MUST be treated as do-not-flip", preceded by a Phase D best-effort preflight summary — the closest existing shape to "declare an estimated cost, then require explicit confirmation". Gaps found: no aggregate cross-command Figma budget exists; no code today distinguishes a mid-run rate-limit from `FAILED_FIGMA_MCP_UNAVAILABLE`'s connectivity precondition; `design-map-writer.md` Step 1 never states the instruction to propagate `library-search.json`'s own `truncated` flag when `evidence_dir` is present-but-partial; and neither Figma budget has a `docs/decisions.md` rationale entry, unlike `max_test_retries = 3`.

---

*Generated: 2026-08-03*
*Approved: 2026-08-03*
*Status: APPROVED*
