# Feature: Quota preflight + named failure (Phase 3 of figma-quota-resilience)

```
**Decision Gate**
- Active context: none
- Activated criteria: prose-only modification to an existing standalone command (`/relay-design-map`); no new agent, no new Decision Gate entry; the new `whoami` call and cost-declaration/confirmation gate must stay inside the command's own session, never a dispatched agent; the confirmation gate mirrors the command's existing Phase E confirm-then-flip discipline rather than inventing a new consent mechanism
- Decisions found:
  - [2026-07-22] MCP-access spike — Figma MCP tools are reachable from Task-dispatched subagents, but the baseline architecture is retained: all Figma MCP calls (including this phase's new `whoami` probe) stay in the interactive command's own session, never in a dispatched agent (`docs/decisions.md:741-749`).
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/` — the evidence bundle this phase extends already lives at `PRPs/reports/design-map/evidence/`; nothing in this phase writes anywhere else.
  - [2026-04-19] Command surface: one command per stage, writer and reviewer split — this phase modifies only the command (`relay-design-map.md`); the dispatched `design-map-writer`/`design-map-reviewer` pair is unchanged (zero files of theirs are edited).
- Applicable anti-patterns:
  - "Querying the Figma MCP from a dispatched writer/reviewer agent" (`docs/anti-patterns.md:98-103`) — the new `whoami` call must not widen `design-map-writer`'s or `design-map-reviewer`'s tool allowlist; it runs entirely inside `/relay-design-map`'s own session.
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" (`docs/anti-patterns.md:89-94`) — the new cost-declaration confirmation gate mirrors the SAME non-heuristic, explicit-affirmative discipline Phase E already uses for the `figma_track` flip; it never auto-refuses, never auto-proceeds on silence or ambiguity (also directly stated as a rejected alternative in the source PRD's own "What We're NOT Building": "Automatic quota-exhaustion refusal").
  - "Writing pipeline artifacts under `.claude/`" — the evidence bundle stays at `PRPs/reports/design-map/evidence/`; nothing in this phase writes under `.claude/`.
- Applicable architectural rules:
  - `docs/context/architecture.md` — "`/relay-design-map` dispatches an MCP-free writer/reviewer pair" — unchanged by this phase; the pair's tool allowlists are not touched.
  - `docs/context/architecture.md` — `${CLAUDE_PLUGIN_ROOT}` resolves to `plugins/relay/`, and plugin install is a verbatim directory copy; this phase adds no new resource reference and must not reintroduce the pre-Phase-1 unresolvable path form.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-quota-resilience.prd.md` — Implementation Phases row 3:
  "Quota preflight + named failure" — Goal: Declare cost before
  spending; fail with a named, honest code. — Success signal: An
  exhausted-quota run halts after one exempt call with the named code,
  and the bundle records seat/tier and the estimate.

## Summary

Phase 3 of `figma-quota-resilience` closes the two remaining gaps in
`/relay-design-map`'s failure surface: an inaccurate precondition
message and a missing, honest quota-exhaustion path. It rewrites P1's
HALT message from a reachability claim to the discoverability claim
the `ToolSearch` check actually performs (AC-4); inserts a new
`whoami`-based cost preflight into Phase B that determines the
operator's seat/tier when exposed, estimates the run's `get_metadata`
cost from the already-computed pre-match candidate set, and — only
when the estimate exceeds the seat's documented ceiling — requires an
explicit, quoted affirmative reply before spending, mirroring the
command's own existing Phase E confirm-then-flip discipline (AC-5);
and adds a new, distinct `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT, detected
by error class/string match (never HTTP status, since Figma's MCP
documents neither `429` nor `Retry-After`), whose message names the
scoped scan as the durable fix, promises no reset time, and states
both halves of the seat-upgrade fact — no retry, no backoff (AC-6,
AC-7). This remains a single-file, prose-only change to
`plugins/relay/commands/relay-design-map.md`: no task in this plan
touches a test file, but Task 2's restructuring invalidates six
existing assertions in `figma-quota-resilience-phase2.test.mjs`,
routed to the test pair as `EXISTING_TEST_UPDATED` under R-X strict
rather than authored by the Implementer (see `## Notes`).

## User Story

As the relay operator running `/relay-design-map` against a real
Figma library on a metered seat,
I want the command to tell me what a scan will cost before it spends
any quota, and to fail with an honest, distinct code when the quota
really is exhausted,
So that I never discover the cost only after the quota is already
gone, and I never confuse a quota failure with a broken Figma MCP
connection.

## Problem Statement

`/relay-design-map`'s Phase B issues Figma MCP calls with no cost
declared up front and no distinct failure path when quota is genuinely
exhausted: nothing today separates "the MCP is unreachable" from "the
MCP is reachable but this seat's quota for the current window is
spent," so an exhausted run dies opaquely and the operator cannot tell
the two failure classes apart. Compounding this, P1's own HALT message
asserts server reachability ("No Figma MCP server is reachable from
this session") when the check it performs (`ToolSearch`) only tests
tool *discoverability* — in the observed incident, quota was already
at zero, tools were still discoverable, P1 passed, and the command
advanced confidently into the one region of the protocol with no
failure handling at all.

## Solution Statement

Rewrite P1's HALT message to claim discoverability, never reachability
(AC-4). Add a `whoami`-based cost preflight — the one Figma MCP tool
Figma documents as quota-exempt — that reads the operator's seat/tier
when the response exposes them, estimates the run's `get_metadata`
call cost from the already-computed pre-match candidate set, and —
only when the estimate exceeds the seat's documented ceiling —
declares both numbers explicitly and requires an explicit, quoted
affirmative reply before issuing any enrichment call, mirroring the
exact confirm-then-flip discipline Phase E already uses for the
`figma_track` flip (AC-5). Add a new, distinct `FAILED_FIGMA_QUOTA_EXHAUSTED`
HALT, detected by error class/string match against Figma's documented
exhaustion message shape — never by HTTP status, since Figma's MCP
documentation defines neither `429` nor `Retry-After` — whose message
names the scoped scan (already shipped in Phase 2) as the durable fix,
promises no reset time, and states both halves of the seat-upgrade
fact; no retry, no backoff (AC-6, AC-7).

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (command-prose behavioral change) |
| Complexity | Medium — single file, but introduces a genuinely new consent/failure surface (whoami preflight, confirmation gate, new terminal HALT code) requiring a careful 5→7 step restructuring of Phase B with internal cross-reference renumbering, plus precise, testable prose (discoverability framing, both halves of the seat-upgrade fact, error-class detection) |
| Systems Affected | `/relay-design-map` command (originally shipped as Figma Implementation Track Phase 3; this plan is `figma-quota-resilience`'s own, distinct Phase 3, modifying the same file for a different feature); evidence bundle at `PRPs/reports/design-map/evidence/` gains new header fields, read-only-affected downstream by `design-map-writer`/`design-map-reviewer` (neither file is edited this phase) |
| Dependencies | Phase 2 (Scoped scan + metadata budget) — complete; Implementation Phases row 3 `Depends: 2` |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/figma-quota-resilience.prd.md:200` (Implementation Phases row 3); Phase Details `PRPs/prds/figma-quota-resilience.prd.md:217-220` |
| phase_type | feature |

(`design_source` / `phase_scope` rows are not added: this repository's
`docs/context/methodology.md` does not declare `figma_track`, and the
source PRD has no `## Visual-First Mode` section. Both conditional
rows are correctly absent, and no `## Design Source` section follows
this table — same determination as Phase 2's plan.)

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-design-map.md` | 111-131 | Current P1 precondition — the exact reachability-framed prose and HALT message Task 1 rewrites to discoverability framing (AC-4). |
| P0 | `plugins/relay/commands/relay-design-map.md` | 211-273 | Current Phase B (5 numbered steps, post-Phase-2) — the exact block Tasks 2-4 restructure into 7 steps, inserting the whoami preflight probe (new step 1) and the cost-declaration/confirmation gate (new step 4). |
| P0 | `plugins/relay/commands/relay-design-map.md` | 390-395 | Phase E's existing "explicit, quoted confirmation ... non-answer/ambiguous/non-affirmative reply MUST be treated as do-not-flip" discipline — the exact idiom Task 2's cost-declaration confirmation gate mirrors, generalized from "do not flip" to "do not proceed". |
| P0 | `plugins/relay/commands/relay-design-map.md` | 436-443 | "HALT paths" bulleted list — the exact three-item shape Task 3 extends with a fourth `FAILED_FIGMA_QUOTA_EXHAUSTED` bullet. |
| P1 | `plugins/relay/agents/visual-verifier.md` | 88 | Hard constraint 4's "fail toward the safer degraded rung, never toward silently reporting FULL" idiom — the degradation-ladder philosophy the source PRD's Architecture Notes says this failure path clones in principle. Phase 3 introduces only the terminal `FAILED_*` code, not the intermediate rung/persistence mechanism, which is Phase 4's job. |
| P2 | `docs/decisions.md` | 741-749 | `[2026-07-22]` MCP-access spike — binds the new `whoami` call (Task 2) to run in this command's own session, never a dispatched agent (verified present at this exact line range). |

## Patterns to Mirror

# SOURCE: plugins/relay/commands/relay-design-map.md:111-127
```
### P1 — Figma MCP tools discoverable

Attempt to discover Figma MCP tools via `ToolSearch` in this main
session (the harness-level mechanism confirmed reachable by Phase 2's
MCP-access spike, `docs/decisions.md` 2026-07-22). If no Figma MCP
tool (e.g. `search_design_system`, `get_metadata`,
`get_code_connect_map`) can be discovered:

> FAILED_FIGMA_MCP_UNAVAILABLE: No Figma MCP server is reachable from
> this session. `/relay-design-map` requires a configured Figma MCP
> connection to query the target project's design library.
> To connect: add a Figma MCP server to your Claude Code MCP
> configuration (see your Figma MCP server's setup instructions), then
> re-run `/relay-design-map`.
> This command never silently degrades to a Figma-free run — the
> component map's entire purpose is grounding in the real Figma
> library.
```
Used by: Task 1 — the exact block whose HALT-message wording is
rewritten from reachability framing to discoverability framing
(AC-4); the `###` heading + prose + blockquote structure is preserved
unchanged.

# SOURCE: plugins/relay/commands/relay-design-map.md:390-395
```
2. Ask the user for an explicit, quoted confirmation — a literal
   affirmative reply is required (e.g. the user typing "yes",
   "confirm", or an equivalent unambiguous affirmative in their own
   words). A non-answer, an ambiguous reply, or any reply that is not
   affirmative MUST be treated as "do not flip" — never proceed on
   inferred consent, silence, or a generic "continue".
```
Used by: Task 2 — the exact confirm-then-proceed idiom the new
cost-declaration/confirmation step mirrors, with "do not flip"
generalized to "do not proceed [to the metadata-enrichment step]".

# SOURCE: plugins/relay/commands/relay-design-map.md:244-252
```
3. **Node-scoped metadata (candidates only).** For each component (or
   component set) in the step 2 candidate set — never the full step 1
   enumeration — call node-scoped `get_metadata` to retrieve its
   variant/property structure. Budget: `max_metadata_calls = 150` —
   stop issuing further `get_metadata` calls once this budget is
   reached. Exhaustion is never fatal: record
   `enrichment_truncated: true` with a reason (e.g.
   `"max_metadata_calls exhausted at 150/<candidate count>"`) and
   continue to the next step.
```
Used by: Task 2 — the numeric-comparison + non-fatal + record-a-reason
idiom the new cost-declaration step mirrors when comparing the
estimate against the seat's ceiling and when handling a decline.

# SOURCE: plugins/relay/commands/relay-design-map.md:436-440
```
- `FAILED_FIGMA_MCP_UNAVAILABLE` — P1: no Figma MCP tools discoverable.
- `FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE` — P2: `docs/context/design-system.md` absent or incomplete — a starter file was scaffolded; re-run after filling the listed keys.
- `FAILED_MAP_REVIEW_BUDGET_EXCEEDED` — Phase C: `max_map_review_retries` exhausted.
```
Used by: Task 3 — the exact bulleted "HALT paths" list shape the new
`FAILED_FIGMA_QUOTA_EXHAUSTED` bullet joins, using the same
`` `CODE` — <phase label>: <terse reason>. `` shape.

# SOURCE: plugins/relay/agents/visual-verifier.md:88
```
An unrecognized exit code from `provision.mjs` is treated as
`DEGRADED_PROVISION_FAILED` — fail toward the safer degraded rung,
never toward silently reporting `FULL`.
```
Used by: Task 3 — the "name the failure honestly, never silently
report success" principle the new `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT
follows in spirit; Phase 3 does not implement the full rung/ladder
mechanism this idiom belongs to (that is Phase 4's "persisted rung"
work) — only the terminal, honestly-named failure code.

# SOURCE: plugins/relay/commands/relay-design-map.md:259-273
```
5. **Persist evidence.** Write every raw result from steps 1–4 to
   `PRPs/reports/design-map/evidence/` (create the directory if
   absent) as one or more evidence files — at minimum a
   `library-search.json` (step 1 results plus the
   `max_library_search_calls` budget consumption and a
   `truncated: true|false` flag; `candidates_prematched`, the size of
   the step 2 candidate set; `metadata_calls_made`, the count of
   step 3 `get_metadata` calls actually issued this run; and
   `enrichment_truncated: true|false` with its reason when
   applicable), a `metadata/<component-key>.json` per enriched
   candidate (step 3), and a `code-connect.json` (step 4 result or the
   `unavailable(<error class>)` marker).
```
Used by: Task 4 — the exact field-enumeration convention the new
`seat`/`tier`/`metadata_call_estimate`/`metadata_call_ceiling`/`preflight_confirmed`
fields are appended to (applied against the already-renumbered step 7
from Task 2, not this pre-Task-2 step-5 numbering).

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/commands/relay-design-map.md` | UPDATE | P1's HALT message rewritten from reachability to discoverability framing (AC-4); new `whoami` cost preflight + confirmation gate inserted into Phase B (AC-5); new `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT added, distinct from `FAILED_FIGMA_MCP_UNAVAILABLE`, detected by error class/string, no retry/backoff (AC-6, AC-7); evidence bundle header gains seat/tier/estimate fields. This is the sole file the source PRD's Phase 3 Scope names. |

## NOT Building (Scope Limits)

- **Named degradation rungs** (`FULL` / `DEGRADED_NO_ENRICHMENT` / `DEGRADED_PARTIAL_INVENTORY`) **and their persistence in the map** — Phase 4. This phase introduces only the terminal `FAILED_FIGMA_QUOTA_EXHAUSTED` code, not the rung/ladder infrastructure.
- **Cumulative/additive evidence merge, `last_seen_scan` retirement, checkpoint relocation to `PRPs/reports/design-map/.state/`, disk-derived `inventory_truncated`/`enrichment_truncated` splitting with the three degenerate-case guards, the surgical downgrade rule, `R-DM7`, and the DERIVED `R-DM`/`R-DS` rubric-count rewrite** — Phase 4.
- **Checkpoint/resume semantics** (an interrupted run or `--refresh` costing only the delta) — Phase 5.
- **The `design-spec-writer` partial-evidence branch, `DEGRADED_NO_TOKENS`, and the re-traversal consumption counter** — Phase 6.
- **An embedded REST fallback** — rejected outright by the source PRD's "What We're NOT Building".
- **Retry/backoff against the Figma MCP** — explicitly rejected (source PRD "What We're NOT Building"); this phase adds abort-and-record only.
- **Automatic quota-exhaustion refusal** (a hard auto-block issued without asking) — explicitly rejected (source PRD "What We're NOT Building"); the preflight only declares and asks, mirroring Phase E's non-heuristic confirm-then-flip discipline.
- **A `docs/decisions.md` rationale entry for the seat-ceiling values** (6/month View-Collab; 200-600/day Dev-Full) — these are cited as Figma's own documented facts (with their source), not a plugin-invented budget constant like `max_metadata_calls`; no Could-item in the source PRD's MoSCoW table covers them.
- **`design-map-writer.md` / `design-map-reviewer.md`** — untouched; this phase's Scope text names the command only.
- **Any `*.test.mjs` file** — no task in this plan touches a test file, but NOT because no existing test is affected: Task 2's Phase B restructuring invalidates six assertions in `scripts/validate/checks/figma-quota-resilience-phase2.test.mjs` (see `## Notes` for the exact line ranges). Per R-X strict (`docs/decisions.md` [2026-05-06], [2026-07-10]), the Implementer never authors or edits a test file regardless of which existing tests a phase's changes invalidate — those six assertions are routed to the `test-writer`/`test-reviewer` pair's lifecycle ledger as `EXISTING_TEST_UPDATED`, exactly as `PRPs/prds/figma-quota-resilience.prd.md:167` mandates.

## Step-by-Step Tasks

### Task 1: UPDATE relay-design-map.md P1 — discoverability, not reachability

- **ACTION**: In the `### P1 — Figma MCP tools discoverable`
  precondition (lines 111-131), rewrite the HALT message's opening
  claim from `No Figma MCP server is reachable from this session.` to
  `No Figma MCP tools are discoverable in this session.` — the check
  performed (`ToolSearch`) tests discoverability, not connectivity,
  and the message must say so verbatim. Leave the rest of the
  message (connection instructions, the "never silently degrades"
  sentence) and the section heading unchanged — both are already
  accurate. Leave the preceding prose's "(the harness-level mechanism
  confirmed reachable by Phase 2's MCP-access spike, ...)" parenthetical
  unchanged — it describes `ToolSearch` itself (the harness discovery
  mechanism) being reachable, a distinct and still-accurate claim from
  the Figma-server-reachability claim AC-4 targets.
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:111-127`
  (the exact block; heading + prose + blockquote structure preserved,
  only the HALT message's claim rewritten).
- **AC**: AC-A1 (PRD AC-4).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/commands/relay-design-map.md"
  if grep -q "No Figma MCP server is reachable" "$FILE"; then
    echo "FAIL: old reachability-framed HALT message still present"
    exit 1
  fi
  if grep -q "No Figma MCP tools are discoverable in this session" "$FILE"; then
    echo "PASS: P1 HALT message now states discoverability, not reachability"
  else
    echo "FAIL: expected discoverability-framed HALT message not found"
    exit 1
  fi
  ```

### Task 2: UPDATE relay-design-map.md Phase B — whoami preflight + cost-declaration/confirmation gate

- **ACTION**: Restructure Phase B from its current 5 numbered steps to
  7, inserting two new steps and renumbering the rest:
  - **New step 1 — "Quota preflight (`whoami` probe)."** Call the
    quota-exempt `whoami` tool (Figma documents exactly three
    quota-exempt tools: `whoami`, `add_code_connect_map`,
    `generate_figma_design`). When the response exposes a seat (e.g.
    `View`, `Collab`, `Dev`, `Full`) and a tier/plan (e.g. `Starter`,
    `Professional`, `Organization`, `Enterprise`), hold both for the
    new step 4 and for step 7's evidence recording. When the call
    fails for any reason, or the response does not expose one or both
    fields — `whoami`'s response schema is observed, not documented,
    and may change — record the gap (`seat: unavailable` and/or
    `tier: unavailable`) and continue; this step never HALTs
    regardless of what `whoami` returns.
  - Existing step 1 ("Library search") → **new step 2**, content
    unchanged.
  - Existing step 2 ("Pre-match candidates") → **new step 3**, content
    unchanged.
  - **New step 4 — "Cost declaration + confirmation."** Using the
    step 1 `whoami` result and the step 3 candidate-set size, estimate
    the number of `get_metadata` calls step 5 will issue (the step 3
    candidate count, capped at `max_metadata_calls = 150` — this is
    the arithmetically infeasible part the source PRD's Problem
    Statement targets, not the cheaper, independently-budgeted step 2
    search). Compare the estimate against the documented ceiling for
    the detected seat: View/Collab seats are limited to 6 calls **per
    month** on every plan; Dev/Full seats are limited to 200 calls/day
    (Starter, Professional) or 600 calls/day (Organization) — Enterprise's
    ceiling is undocumented. **When `whoami` exposed both seat and
    tier and the estimate exceeds the ceiling:** declare both numbers
    explicitly (e.g. "This run's pre-matched candidate set is `<N>`,
    so at most `<N>` `get_metadata` calls will be issued; your `<seat>`
    seat on the `<tier>` plan is documented to allow `<ceiling>`.")
    and ask the user for an explicit, quoted affirmative reply before
    issuing any `get_metadata` call — mirroring step 2's cited Phase E
    idiom: a non-answer, an ambiguous reply, or any non-affirmative
    reply MUST be treated as do-not-proceed, never inferred consent.
    **On decline or non-affirmative reply:** do NOT proceed to step 5;
    record `metadata_calls_made: 0`, `enrichment_truncated: true`,
    reason `"cost-declaration preflight declined by operator"` (fed
    forward to step 7), then continue to steps 6-7 as normal — this is
    not a HALT, mirroring the non-fatal budget-exhaustion idiom cited
    from step 3's current text; the evidence gathered so far, and any
    prior map, remain valid, and re-running later is safe. **When
    `whoami` did not expose seat and/or tier, or the estimate does not
    exceed the ceiling:** proceed directly to step 5 without the
    confirmation gate; when seat/tier was unavailable, record the
    degradation for step 7 rather than halting.
  - Existing step 3 ("Node-scoped metadata") → **new step 5**, content
    unchanged except internal cross-references renumbered: "in the
    step 2 candidate set — never the full step 1 enumeration" becomes
    "in the step 3 candidate set — never the full step 2 enumeration".
  - Existing step 4 ("Code Connect") → **new step 6**, content
    unchanged.
  - Existing step 5 ("Persist evidence") → **new step 7** (content
    addressed by Task 4); its "raw result from steps 1–4" reference
    becomes "steps 1–6", and its internal step-number citations for
    `candidates_prematched` ("step 2 candidate set") and
    `metadata_calls_made` ("step 3 `get_metadata` calls") are
    renumbered to "step 3 candidate set" and "step 5 `get_metadata`
    calls" respectively.
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:390-395`
  (confirm-then-proceed idiom) and
  `plugins/relay/commands/relay-design-map.md:244-252` (numeric
  comparison + non-fatal + record-a-reason idiom).
- **AC**: AC-A2 (PRD AC-5).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/commands/relay-design-map.md"
  PHASE_B_BLOCK=$(awk '/^## Phase B/{flag=1; next} /^## Phase C/{flag=0} flag' "$FILE")
  STEP_COUNT=$(printf '%s\n' "$PHASE_B_BLOCK" | grep -cE '^[0-9]+\. \*\*')
  if [ "$STEP_COUNT" -ne 7 ]; then
    echo "FAIL: Phase B must enumerate exactly 7 numbered steps (found $STEP_COUNT)"
    exit 1
  fi
  if ! printf '%s\n' "$PHASE_B_BLOCK" | grep -qE '^1\. \*\*Quota preflight'; then
    echo "FAIL: step 1 must be the new Quota preflight (whoami probe) step"
    exit 1
  fi
  if ! printf '%s\n' "$PHASE_B_BLOCK" | grep -qE '^4\. \*\*Cost declaration'; then
    echo "FAIL: step 4 must be the new Cost declaration + confirmation step"
    exit 1
  fi
  if ! printf '%s\n' "$PHASE_B_BLOCK" | grep -qi 'step 3 candidate set'; then
    echo "FAIL: renumbered cross-reference 'step 3 candidate set' not found — pre-match is now step 3"
    exit 1
  fi
  echo "PASS: Phase B restructured to 7 steps with whoami preflight (1) and cost-declaration (4) inserted, and internal cross-references renumbered"
  ```

### Task 3: UPDATE relay-design-map.md — FAILED_FIGMA_QUOTA_EXHAUSTED, detection rule, and HALT-paths entry

- **ACTION**: Immediately after Phase B's existing sentence "All
  Figma MCP calls in this phase execute in THIS session — never
  inside a dispatched agent (Decision Gate result above).", insert a
  new paragraph: any of this phase's two load-bearing Figma MCP data
  calls (`search_design_system`, `get_metadata`) that fails with a
  quota-exhaustion error HALTs immediately with
  `FAILED_FIGMA_QUOTA_EXHAUSTED` — detection is by error class/string
  match, never by HTTP status, since Figma's MCP documentation defines
  neither `429` nor `Retry-After`. No retry, no backoff: sleeping is
  useless against a per-day or per-month bucket. This rule does NOT
  apply to `get_code_connect_map` (step 6): a quota-exhaustion error
  there follows step 6's existing, unchanged non-fatal path — recorded
  as `code_connect: unavailable(quota-exhausted)` and the run
  CONTINUES — because by the time step 6 runs, steps 2/3/5 have
  already succeeded and the evidence bundle is essentially complete;
  HALTing on an opportunistic enrichment call would discard an
  otherwise successful run, the opposite of this PRD's goal of making
  interrupted runs cheap. `PRPs/prds/figma-quota-resilience.prd.md:37`
  cites Code Connect's existing non-fatal path as the model this
  phase's load-bearing HALT emulates, not a defect to remove — failure
  handling was "inverted relative to importance" before this phase;
  this rule fixes the load-bearing side without inverting it back onto
  the opportunistic side. Immediately below that paragraph, add the
  full HALT message as a blockquote (this exact text, each line kept
  unbroken by a wrap where noted):
  ```
  > FAILED_FIGMA_QUOTA_EXHAUSTED: A Figma MCP data call failed with a
  > quota-exhaustion error — distinct from `FAILED_FIGMA_MCP_UNAVAILABLE`:
  > the Figma MCP connection is live; your seat's call quota for the
  > current window is spent.
  > This message promises no reset time. Figma's MCP documentation
  > states no reset mechanics for any seat, so do not assume a fixed
  > wait-and-retry window.
  > The scoped scan this command already performs (enumerate -> pre-match
  > -> enrich only candidates, bounded by `max_metadata_calls`) is the
  > durable fix for this failure class.
  > Upgrading from a View/Collab seat to Dev/Full multiplies your MCP
  > call quota roughly a thousandfold (6/month vs. 200-600/day).
  > But no Figma seat makes whole-library enrichment viable.
  > Detection is by error class/string match, never by HTTP status —
  > Figma's MCP documentation defines neither `429` nor `Retry-After`.
  > No retry, no backoff: sleeping is useless against a per-day or
  > per-month bucket.
  > Re-run `/relay-design-map` (with `--refresh` if a partial map
  > already exists) once your quota has recovered.
  ```
  The lines "This message promises no reset time." and "But no Figma
  seat makes whole-library enrichment viable." MUST each stay on a
  single unbroken blockquote line (do not let a wrapper split either
  clause across two `>` lines). Finally, add a fourth bullet to the
  "### HALT paths (named codes with actionable messages)" list,
  matching the existing bullets' shape: `` `FAILED_FIGMA_QUOTA_EXHAUSTED`
  — Phase B: a Figma MCP data call failed with a quota-exhaustion
  error; no retry, no backoff. ``
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:436-440`
  (existing "HALT paths" bulleted list shape) and
  `plugins/relay/agents/visual-verifier.md:88` (honestly-named,
  never-silently-succeed failure principle).
- **AC**: AC-A3 (PRD AC-6), AC-A4 (PRD AC-7).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/commands/relay-design-map.md"
  if ! grep -q "FAILED_FIGMA_QUOTA_EXHAUSTED" "$FILE"; then
    echo "FAIL: FAILED_FIGMA_QUOTA_EXHAUSTED HALT code not found"
    exit 1
  fi
  COUNT=$(grep -c "FAILED_FIGMA_QUOTA_EXHAUSTED" "$FILE")
  if [ "$COUNT" -lt 2 ]; then
    echo "FAIL: FAILED_FIGMA_QUOTA_EXHAUSTED must appear at least twice (HALT message + HALT-paths list) — found $COUNT"
    exit 1
  fi
  if ! grep -qi "no retry, no backoff" "$FILE"; then
    echo "FAIL: 'No retry, no backoff' rule not stated"
    exit 1
  fi
  if ! grep -qi "thousandfold" "$FILE"; then
    echo "FAIL: seat-upgrade fact (thousandfold multiplier) not stated"
    exit 1
  fi
  if ! grep -qi "no Figma seat makes" "$FILE"; then
    echo "FAIL: 'no seat makes whole-library enrichment viable' half of the seat-upgrade fact not stated"
    exit 1
  fi
  if ! grep -qi "error class/string" "$FILE"; then
    echo "FAIL: quota-exhaustion detection rule (error class/string, never HTTP status) not stated"
    exit 1
  fi
  echo "PASS: FAILED_FIGMA_QUOTA_EXHAUSTED present (message + list), no-retry rule, both halves of the seat-upgrade fact, and error-class/string detection rule all present"
  ```

### Task 4: UPDATE relay-design-map.md — persist-evidence step records seat/tier/estimate

- **ACTION**: Rewrite the persist-evidence step (now step 7, per
  Task 2's renumbering) so, alongside the existing `library-search.json`
  field list, it also records: `seat` (the value read in step 1, or
  `"unavailable"` when `whoami` did not expose it), `tier` (same
  convention), `metadata_call_estimate` (the step 4 estimate),
  `metadata_call_ceiling` (the seat's documented ceiling step 4
  compared against, or `"unavailable"` when seat/tier was
  undetermined), and `preflight_confirmed` (`true` when the user gave
  an explicit affirmative reply, `false` when declined, `null` when
  the confirmation gate was never triggered because the estimate did
  not exceed the ceiling or seat/tier was unavailable).
- **MIRROR**: `plugins/relay/commands/relay-design-map.md:259-273`
  (persist-evidence field-enumeration convention).
- **AC**: AC-A2 (PRD AC-5) — the "record seat/tier ... and the
  estimate" half specifically.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  FILE="plugins/relay/commands/relay-design-map.md"
  STEP7=$(awk '/^7\. \*\*Persist evidence/{flag=1} flag{print} /^## Phase C/{flag=0}' "$FILE")
  if [ -z "$STEP7" ]; then
    echo "FAIL: step 7 (Persist evidence) not found — Phase B renumbering may be incomplete"
    exit 1
  fi
  for field in seat tier metadata_call_estimate metadata_call_ceiling preflight_confirmed; do
    if ! printf '%s' "$STEP7" | grep -q "$field"; then
      echo "FAIL: persist-evidence step missing bundle-header field '$field'"
      exit 1
    fi
  done
  echo "PASS: persist-evidence step (step 7) records seat, tier, metadata_call_estimate, metadata_call_ceiling, and preflight_confirmed"
  ```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
npm run validate
```
Exits non-zero if any of the 12 registered checks fails (real
exit-code semantics via `index.mjs`'s own `process.exitCode = 1` on
any failure). This phase creates, moves, and deletes no files, so
this is a general regression gate (frontmatter still parses, no
dangling path reference introduced), not a proof of this phase's
specific new content — that is Level 2's job.

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
FILE="plugins/relay/commands/relay-design-map.md"

# AC-4: P1 message states discoverability, never reachability
if grep -q "No Figma MCP server is reachable" "$FILE"; then
  echo "FAIL: old reachability-framed P1 HALT message still present"
  exit 1
fi
if ! grep -q "No Figma MCP tools are discoverable in this session" "$FILE"; then
  echo "FAIL: expected discoverability-framed P1 HALT message not found"
  exit 1
fi

# AC-5: whoami preflight + cost-declaration/confirmation gate present
if ! grep -qi "Quota preflight" "$FILE"; then
  echo "FAIL: whoami quota-preflight step not found"
  exit 1
fi
if ! grep -qi "Cost declaration" "$FILE"; then
  echo "FAIL: cost-declaration/confirmation step not found"
  exit 1
fi

# AC-6/AC-7: FAILED_FIGMA_QUOTA_EXHAUSTED HALT, no-retry rule, seat-upgrade fact
if ! grep -q "FAILED_FIGMA_QUOTA_EXHAUSTED" "$FILE"; then
  echo "FAIL: FAILED_FIGMA_QUOTA_EXHAUSTED HALT code not found"
  exit 1
fi
if ! grep -qi "No retry, no backoff" "$FILE"; then
  echo "FAIL: 'No retry, no backoff' rule not stated"
  exit 1
fi
if ! grep -qi "thousandfold" "$FILE"; then
  echo "FAIL: seat-upgrade fact (thousandfold multiplier) not stated"
  exit 1
fi

echo "PASS: Phase 3 content invariants present — discoverability-framed P1, whoami preflight + cost-declaration gate, FAILED_FIGMA_QUOTA_EXHAUSTED with no-retry rule and seat-upgrade fact"
```
Fails on the current unmodified tree (the old reachability message is
present, none of the new steps/codes/phrases exist yet — confirmed by
`research-codebase`: zero hits anywhere in the plugin for "Quota
preflight", "Cost declaration", or `FAILED_FIGMA_QUOTA_EXHAUSTED`);
passes once Tasks 1-3 land.

**Level 3 — INTEGRATION / DRY-RUN END-TO-END**
```bash
set -euo pipefail
FILE="plugins/relay/commands/relay-design-map.md"

# Structural: heading delimiters fix-design-system-config-producer.test.mjs
# uses as sliceBetween anchors must remain byte-identical.
grep -q '^## Phase A — Ensure design-system config is loaded$' "$FILE"
grep -q '## Phase B — Query the Figma library' "$FILE"
grep -q '## Phase C' "$FILE"
grep -q '## Phase E — Explicit human confirmation, then the sanctioned flip' "$FILE"

# Structural: Phase B must now enumerate exactly 7 numbered steps (was 5) —
# whoami preflight (step 1) and cost-declaration/confirmation (step 4) inserted.
PHASE_B_BLOCK=$(awk '/^## Phase B/{flag=1; next} /^## Phase C/{flag=0} flag' "$FILE")
STEP_COUNT=$(printf '%s\n' "$PHASE_B_BLOCK" | grep -cE '^[0-9]+\. \*\*')
if [ "$STEP_COUNT" -ne 7 ]; then
  echo "FAIL: Phase B must enumerate exactly 7 numbered steps after inserting the whoami preflight and cost-declaration steps (found $STEP_COUNT)"
  exit 1
fi
if ! printf '%s\n' "$PHASE_B_BLOCK" | grep -qE '^1\. \*\*Quota preflight'; then
  echo "FAIL: step 1 must be the new Quota preflight (whoami probe) step"
  exit 1
fi
if ! printf '%s\n' "$PHASE_B_BLOCK" | grep -qE '^4\. \*\*Cost declaration'; then
  echo "FAIL: step 4 must be the new Cost declaration + confirmation step"
  exit 1
fi
if ! printf '%s\n' "$PHASE_B_BLOCK" | grep -qE '^7\. \*\*Persist evidence'; then
  echo "FAIL: step 7 must be the renumbered Persist evidence step"
  exit 1
fi
echo "PASS: Phase A/B/C/E heading delimiters intact; Phase B restructured to 7 sequential numbered steps with the whoami preflight and cost-declaration steps in the expected positions"

# Structural: HALT paths list must now enumerate 4 named codes, including the new one.
HALT_LIST=$(awk '/^### HALT paths/{flag=1; next} /^No artifact is written/{flag=0} flag' "$FILE")
HALT_COUNT=$(printf '%s\n' "$HALT_LIST" | grep -cE '^- `FAILED_')
if [ "$HALT_COUNT" -ne 4 ]; then
  echo "FAIL: HALT paths list must enumerate exactly 4 named codes (found $HALT_COUNT)"
  exit 1
fi
if ! printf '%s\n' "$HALT_LIST" | grep -q 'FAILED_FIGMA_QUOTA_EXHAUSTED'; then
  echo "FAIL: FAILED_FIGMA_QUOTA_EXHAUSTED missing from the HALT paths list"
  exit 1
fi
echo "PASS: HALT paths list enumerates 4 named codes including FAILED_FIGMA_QUOTA_EXHAUSTED"
```
Fails on the current unmodified tree at the `STEP_COUNT` check (Phase
B currently has 5 steps, not 7) and at the `HALT_COUNT` check
(currently 3 named codes, not 4); passes once Tasks 1-4 land. This
Level intentionally omits a `node --test` regression check: Task 2's
Phase B restructuring invalidates six existing assertions in
`scripts/validate/checks/figma-quota-resilience-phase2.test.mjs` (see
`## Notes`), and those updates are routed to the `test-writer`/
`test-reviewer` pair as `EXISTING_TEST_UPDATED` — never authored by
the Implementer (R-X strict). Running `node --test` here would either
assert a red state as green or force a false choice against R-X; the
`R-COH-VALIDATE-FRAMEWORK-MISMATCH` condition-based test-pair-deferral
exemption (`docs/decisions.md` `[2026-08-03]`) exists for exactly this
shape, mirroring how Phase 1 of this same PRD kept `node --test` out
of its own Level 1-3 gates for the identical reason.

Levels 4-6 (browser/database/manual) are not part of the fixed agent
contract and are not included — this phase has no UI, no database,
and no step that resists automation.

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** Given no Figma MCP tool can be discovered via
  `ToolSearch`, when P1 fails, then the message states that no Figma
  MCP tools are **discoverable in this session** — never that no
  server is reachable.
- **AC-A2 (PRD AC-5):** Given `whoami` returns a response exposing
  seat and tier, and the scan's estimated `get_metadata` call cost
  exceeds the documented ceiling for that seat, when the command
  reaches the preflight, then it declares the estimate and the
  ceiling and requires an explicit affirmative reply before issuing
  any `get_metadata` call, treating a non-answer or ambiguous reply
  as do-not-proceed. Given `whoami`'s response does not expose
  seat/tier, then the preflight proceeds without the declaration and
  records the degradation in the bundle header rather than halting.
  The bundle records `seat`, `tier`, `metadata_call_estimate`, and
  `metadata_call_ceiling` in every case.
- **AC-A3 (PRD AC-6):** Given a Figma MCP data call fails with a
  rate-limit error class, when the command halts, then the code is
  `FAILED_FIGMA_QUOTA_EXHAUSTED`, distinct from
  `FAILED_FIGMA_MCP_UNAVAILABLE`; the message names the scoped scan
  as the durable fix; it promises no reset time; and it carries both
  halves of the seat-upgrade fact — that the upgrade improves quota
  roughly a thousandfold **and** that no seat makes whole-library
  enrichment viable.
- **AC-A4 (PRD AC-7):** Given a quota-class Figma error, when the
  command responds, then it aborts and records; it does not
  sleep-and-retry. Detection is by error class/string, never by HTTP
  status, because the MCP documents neither `429` nor `Retry-After`.

(PRD AC-18, "non-Figma projects are untouched," is not given a
dedicated plan AC here — see `## Notes` for why it does not apply to
this specific file's own behavior.)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `whoami`'s undocumented response schema changes or never exposed seat/tier as assumed, silently disabling the cost declaration | M | L | The preflight is conditional by construction (Task 2's new step 1/4) — missing seat/tier degrades to a recorded gap, never to a halt or a fabricated ceiling. From the source PRD's own Technical Risks table, directly applicable to this phase. |
| Figma's own documented seat-ceiling values (6/month; 200-600/day) drift or become stale if Figma changes its rate limits | L | M | Ceiling values are cited as documented facts with their source (Figma's rate-limits page, verified 2026-08-03 per the source PRD's Evidence); recalibration is a single-value edit to Task 2's step 4 prose, not a redesign. |
| The `FAILED_FIGMA_QUOTA_EXHAUSTED` error-class/string detection fails to recognize a variant wording of Figma's exhaustion message | M | M | Detection matches the documented message shape from the source PRD's own observed string ("You've reached the Figma MCP tool call limit for your `<seat>` seat on the `<plan>` plan.") as a pattern, not an exact-string match, tolerant of the seat/plan placeholders varying. |
| Completing Task 2 renumbers Phase B and breaks six assertions in `figma-quota-resilience-phase2.test.mjs`, leaving the corpus transiently red between the Implementer's diff and the test pair's `EXISTING_TEST_UPDATED` pass | H | L | The window is bounded and expected in test-after ordering — `/relay-execute` Phase A.4.5 runs `/relay-write-test` → `/relay-test-write-review` immediately after code review, and `/relay-test` confirms green before the phase completes; the Implementer authors zero test files throughout. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. This repo declares
`test_frameworks: ["node:test"]`, so the pair is active in test-after
mode.

**Row-3 selection independently confirmed.** This plan's own Phase 1
parse of the Implementation Phases table agrees with the dispatching
command's pre-check: row 1 ("Resource packaging") and row 2 ("Scoped
scan + metadata budget") are both `complete`; row 3 ("Quota preflight
+ named failure") is `pending` with `Depends: 2` (satisfied) — the
lowest-numbered actionable row. Rows 4-6 all depend (directly or
transitively) on row 3 or a later row and are therefore not yet
actionable.

**Why Task 2 requires test-pair `EXISTING_TEST_UPDATED` routing — the
initial "zero existing coverage" determination in an earlier draft of
this plan was wrong.** `scripts/validate/checks/figma-quota-resilience-phase2.test.mjs` —
authored test-after for Phase 2, currently green in the
465-pass/0-fail baseline — hard-pins the exact Phase B structure
Task 2 restructures from 5 steps to 7:

- `:127-143` — `assert.equal(stepLabels.length, 5, ...)`, asserting
  exactly 5 top-level numbered steps in Phase B.
- `:145-162` — pins the literal string `'in the step 2 candidate set —
  never the full step 1 enumeration — call node-scoped
  \`get_metadata\`'`.
- `:164-182` — locates `phaseB.indexOf('5. **Persist evidence')` and
  pins `` '`candidates_prematched`, the size of the step 2 candidate
  set' `` and `` '`metadata_calls_made`, the count of step 3
  `get_metadata` calls actually issued this run' ``.
- `:247-268`, `:270-289`, `:291-308` — three tests each
  `sliceBetween(phaseB, '2. **Pre-match candidates', '3. **Node-scoped
  metadata')` to isolate step 2's own text.

Task 2's insertion of the new step 1 (whoami preflight) and step 4
(cost declaration) renumbers every one of these references, breaking
all six assertions by construction. Per R-X strict (`docs/decisions.md`
[2026-05-06], [2026-07-10]), the Implementer authors and edits ZERO
test files regardless — these six assertions are updated by the
`test-writer`/`test-reviewer` pair as `EXISTING_TEST_UPDATED` entries
in the suite's lifecycle ledger, exactly as
`PRPs/prds/figma-quota-resilience.prd.md:167` mandates ("every
test-file edit must be routed through the test pair's lifecycle
ledger ... including the one-line regex changes"). This satisfies
condition 1 of `plan-reviewer.md:387-405`'s test-pair-deferral
exemption to `R-COH-VALIDATE-FRAMEWORK-MISMATCH`; condition 2 (no task
in `## Step-by-Step Tasks` touches a test file) already holds — Tasks
1-4 above are exclusively `relay-design-map.md` edits. A new
`figma-quota-resilience-phase3.test.mjs` will presumably also be
authored fresh by the same pair after this phase's Implementer + Code
Review (mirroring `-phase1.test.mjs` and `-phase2.test.mjs`'s own
precedent), covering this phase's own new AC-A1..AC-A4 surface — also
standard test-after `NEW_TEST_REQUIRED` work outside this plan's
Step-by-Step Tasks.

**Why the "estimated call cost" is the `get_metadata` count, not the
library-search count.** AC-5's "before issuing any data call" is read
as "before issuing any [of the estimated] `get_metadata` call" rather
than "before any Figma call whatsoever" — the source PRD's own User
Flow text (`PRPs/prds/figma-quota-resilience.prd.md:155`) explicitly
orders "enumerates the library within `max_library_search_calls` →
pre-matches ... → declares the estimated `get_metadata` cost", placing
library search and pre-match BEFORE the cost declaration. The
Problem Statement's arithmetic-infeasibility claim (7090 calls on a
real library) is driven by the per-component `get_metadata` loop, not
by the already-budgeted, comparatively cheap `search_design_system`
step — the estimate this phase gates is therefore the metadata-
enrichment count specifically.

**AC-18 (non-Figma projects byte-identical) does not get a dedicated
plan AC.** `/relay-design-map` is the standalone, human-triggered
command that itself performs the `figma_track` flip — its own
behavior does not branch on `figma_track`'s current value, so "byte-
identical when `figma_track` is false" is not a meaningful invariant
for this specific file. AC-18 is more directly exercised by commands
that DO branch on `figma_track` (e.g. `/relay-implement`'s visual
gate), none of which this phase touches.

**Clarifying Phase 2's own "~10 calls of headroom" note.** Phase 2's
plan Notes estimated `max_metadata_calls = 150` leaves "~10 calls of
headroom for Phase 3's `whoami` preflight probe and the opportunistic
Code Connect call." Since `whoami` is one of Figma's three documented
quota-exempt tools, it consumes **zero** of that headroom — the ~10
calls of slack are effectively all available for the (single)
opportunistic Code Connect call and general estimation slack. This
does not change any budget value; it is a clarification for future
readers of both plans together.

**`phase_type: feature` — reasoning.** This phase adds new observable
behavior (a whoami-based cost preflight, an explicit-confirmation
gate, and a new terminal HALT code) to an existing command; it does
not match `scaffold` (not a bootstrap/config-only/init phase; its
Validation Commands are content-invariant greps plus a structural
dry-run, not filesystem/OS probes), `docs` (the sole changed file is
the command's own instructional source, not documentation describing
it), `refactor` (adds new capability — a consent gate and a failure
code that did not exist before — rather than restructuring existing
behavior unchanged), or `foundation` (creates no new domain
entity/repository/schema seam a *later* phase's Acceptance Criteria
depend on being tested against; Phase 4 builds its own, independent
rung/checkpoint infrastructure rather than depending on types this
phase introduces). Given `tdd: false` in this repository, the
`foundation` self-skip this classification exists to gate does not
trigger regardless of this call.

---

*Generated: 2026-08-04*
*Approved: 2026-08-04*
*Implemented: 2026-08-04*
*Status: IMPLEMENTED*
