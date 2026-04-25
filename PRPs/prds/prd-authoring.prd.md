# PRD Authoring (`/relay-prd`)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions; cross-cutting patterns; creation of components; reuse or creation of components; impact on reusable services
- Decisions found:
  - Interactivity boundary: /relay-prd is THE interactive stage; downstream runs autonomously
  - PRD template = fork of prp-core/commands/prp-prd.md + 3 mandatory relay extensions (Decision Gate, Acceptance Criteria, TDD routing note)
  - PRP artifacts under PRPs/ at repo root (never .claude/)
  - Command surface: /relay-prd is the "special" combined writer+reviewer command
  - methodology.md is the single source of truth for TDD routing (tdd: true | false)
  - .claude/settings.json allowlist: narrow patterns; invariant denylist; target projects need their own settings.json
- Applicable anti-patterns:
  - Importing or re-exporting prp-core assets (treat as reference documentation only)
  - Filling PRD sections with plausible filler instead of "TBD - needs validation"
  - Writing pipeline artifacts under .claude/
  - Relying on interactive permission prompts during what should be a deterministic phase boundary
- Applicable architectural rules:
  - Plugin assets are markdown + YAML frontmatter; no compiled code
  - Agents have restricted tool allowlists declared in frontmatter
  - Graceful degradation is mandatory: every component detects its preconditions and self-skips with a reported reason when absent
  - Artifacts live under PRPs/<type>/
  - Hooks reference scripts via ${CLAUDE_PLUGIN_ROOT} (not applicable to this PRD — no hooks introduced)
- Result: PROCEED
```

## Problem Statement

`relay` cannot deliver on "one prompt → PR" while the pipeline's entry
point is manual. Today a developer who wants to use the (planned)
orchestrator `/relay-execute` must first hand-author a PRD that conforms
to a multi-section template, emits a Decision Gate evidence block, and
includes observable Acceptance Criteria — the same work that breaks most
teams' PRDs at the planning stage. Without an interactive command that
produces conformant PRDs on demand, every downstream agent (Plan Writer,
TDD Writer, Implementer, Test Runner) is starved of its input, and
Phase 3 of the relay rollout cannot begin.

## Evidence

- Planning document `docs/planning/dev_process_improvement_plan.html`
  lists "muita interação manual — cada etapa exige um comando e
  aprovação separados" as **problem #1**, resolved by "comando único
  de implementação + orquestrador de agentes". The orchestrator has no
  entry point until `/relay-prd` exists.
- `docs/context/architecture.md` §Interactivity boundary explicitly
  locates PRD authoring as the single interactive moment in the
  pipeline; the cost of skipping it is "hours or days of compounded
  rework" (quoted from `docs/decisions.md` 2026-04-19 entry on the
  interactivity boundary).
- The existing hand-authored `PRPs/prds/test-runner.prd.md` (the only
  PRD in the repo today) runs 476 lines and took real time to compose.
  Every feature built with relay will need one; manual authoring is a
  recurring cost.
- Every planned command in `docs/api-reference.md` lists an APPROVED PRD
  or PRD-derived artifact as its input. Without `/relay-prd`, ten of the
  twelve planned commands have no legitimate invocation path.
- The PRD template at `docs/context/prd-template.md` already specifies
  the exact output shape (six-phase Q&A inherited from
  `prp-core/commands/prp-prd.md`, plus three mandatory relay extensions).
  The spec is stable; the gap is implementation.

## Proposed Solution

A single slash command `/relay-prd <description | draft-path>` (argument
optional) that drives an interactive, template-enforcing PRD authoring
session with the user. Under the hood: a PRD Writer agent runs the six
canonical phases (Initiate → Foundation → Grounding → Deep Dive →
Grounding → Decisions → Generate), invoking two relay-specific research
subagents (`research-web`, `research-codebase`) during grounding; a PRD
Reviewer agent then validates template conformance against a structural
rubric and loops with the user until approval, flipping the PRD's
frontmatter from `DRAFT` to `APPROVED`. Graceful degradation: research
subagents that cannot fetch (WebSearch offline, empty codebase) return
empty findings with a `degradation_reason` so the Writer records a gap
in the Research Summary instead of failing. Draft-path input is
detected at Phase 1 and the Writer skips questions already answered in
the draft, asking only the unanswered ones.

## Key Hypothesis

We believe an interactive PRD command, backed by dedicated research
subagents and a structural reviewer, will produce PRDs that downstream
relay agents (Plan Writer, Implementer, Test Runner) can consume
without ambiguity-induced rework. We'll know we're right when ≥80% of
PRDs produced by `/relay-prd` pass `/relay-plan` without a
`CHANGES_REQUESTED` verdict attributed to PRD-level defects
(missing Decision Gate, unobservable AC-N, missing sections, TDD
routing mismatch), measured across the first 20 PRDs authored.

## What We're NOT Building

- **Non-interactive / batch PRD generation** — the interactivity
  boundary (`docs/decisions.md` 2026-04-19) is a deliberate contract;
  batch mode would collapse it.
- **PRD amendment or versioning after APPROVED** — reopening an
  approved PRD, diffing versions, tracking change history. Separate
  PRD if demand emerges; MVP treats APPROVED as terminal.
- **Figma-to-spec preprocessor (`/figma-to-spec`)** — planning doc
  problem #04 is solved by a separate agent that filters Figma's
  excessive context before the PRD phase. Own PRD.
- **Multi-language PRD output** — template is English-first; the
  Writer dialogues with the user in whatever language they use, but
  the artifact file is English (matches `docs/context/prd-template.md`
  which is English-only).
- **Docs Updater / Docs Reviewer** — Pillar 3 (approval cycle),
  planned for Phase 4 of the relay rollout, not Phase 3.
- **Replacing or extending the upstream `prp-core` template** — we
  fork, we do not import. Upstream evolution is tracked in
  `docs/decisions.md` per `docs/context/prd-template.md` §"Keeping
  the fork in sync".

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Downstream acceptance rate | ≥ 80% of PRDs produced pass `/relay-plan` without PRD-defect-driven `CHANGES_REQUESTED` | Count of plan-review verdicts citing PRD defects (missing Decision Gate / unobservable AC / missing mandatory section / TDD routing mismatch) over total PRDs, measured across the first 20 PRDs |
| Decision Gate compliance | 100% of PRDs include the evidence block as the first fenced block below the title | Grep / structural check by the Reviewer rubric (AC-7); any miss is a hard fail, never shipped |
| Template conformance | 100% of PRDs produce an APPROVED status only after passing every Reviewer rubric item | Reviewer rubric pass rate at the moment of `DRAFT → APPROVED` flip |
| User iterations with Reviewer | Median ≤ 2 rounds of CHANGES_REQUESTED before APPROVED | Count of `CHANGES_REQUESTED` verdicts per session, logged to `PRPs/prds/<name>.review.jsonl` |
| End-to-end session time | Median < 20 minutes from `/relay-prd` invocation to APPROVED for a moderate feature | Wall-clock measured from command start to status-flip timestamp |

Baseline (before `/relay-prd`): all PRDs hand-authored; conformance is
ad-hoc; no Decision Gate enforcement; author time ≈ hours; downstream
acceptance unmeasurable because downstream agents do not yet exist.

## Acceptance Criteria (test scenarios)

Mandatory. Each criterion is an observable scenario the feature must
satisfy. `docs/context/methodology.md` currently declares `tdd: false`
for relay; when relay gains a test harness and declares `tdd: true`,
these criteria become B7's input contract. For now they seed the tests
the Implementer writes alongside the command and agents.

- **AC-1 Blank input opens the flow:** Given the user runs `/relay-prd`
  with no argument, when the PRD Writer activates, then it opens Phase 1
  INITIATE with the upstream question ("What do you want to build?"),
  waits for the user's response, and only then proceeds to Phase 2.

- **AC-2 Description input kicks Phase 1 forward:** Given the user runs
  `/relay-prd "add a dark mode toggle"`, when the Writer activates, then
  it restates its understanding of the description, gates on user
  confirmation, and proceeds to Phase 2 without re-asking the INITIATE
  question.

- **AC-3 Draft-path input skips answered questions:** Given the user
  runs `/relay-prd <path-to-draft.md>` where the draft already answers
  the Foundation questions (Who / What / Why-not-today / Why-now /
  Success-looks-like), when the Writer inspects the draft, then it
  skips those five questions, asks only the unanswered ones from
  remaining phases, and records in the generated PRD which fields were
  carried over from the draft vs. produced during dialogue.

- **AC-4 Research agents run at GROUNDING:** Given Phase 3 (GROUNDING)
  is reached, when the Writer invokes `research-web` and
  `research-codebase`, then both return within their declared scope
  caps and the Writer summarizes their findings to the user before
  proceeding to Phase 4. The final PRD's "Research Summary" section
  reflects the two agents' structured output.

- **AC-5 Research graceful degradation — web unavailable:** Given
  WebSearch is unavailable (no API key, offline, or returns zero
  useful hits), when `research-web` runs, then it returns a structured
  result with `findings: []` and a non-empty `degradation_reason`, and
  the PRD's Research Summary ends with "TBD — web research
  unavailable: {reason}" rather than halting the session.

- **AC-6 Research graceful degradation — codebase empty:** Given the
  target project has no code (or no files match the patterns
  `research-codebase` searches), when the agent runs, then it returns
  `findings: []` with `degradation_reason`, and the PRD's Research
  Summary records the gap without halting.

- **AC-7 Decision Gate block mandatory and first:** Given the Writer
  is about to emit the DRAFT file, when it writes to disk, then the
  Decision Gate evidence block appears as the first fenced code block
  below the `# {Title}` line. If any of `docs/decisions.md`,
  `docs/anti-patterns.md`, or `docs/context/architecture.md` cannot be
  read, the Writer halts with a loud error message citing the missing
  file and does NOT write a DRAFT.

- **AC-8 TDD routing note matches methodology.md:** Given the current
  `tdd` value in `docs/context/methodology.md`, when the Writer emits
  the "Technical Approach > TDD routing" subsection, then the text
  reads "TDD track active" (when `tdd: true`) or "TDD track
  inactive — tests written alongside implementation" (when
  `tdd: false`). A mismatch is a Reviewer-blocking defect.

- **AC-9 Acceptance Criteria present and observable:** Every DRAFT
  contains at least 3 AC-N items in the "Acceptance Criteria (test
  scenarios)" section, each written as Given/When/Then (or explicit
  input/output). The Reviewer rejects any PRD that fails this count or
  contains AC-N items lacking the observable shape.

- **AC-10 Reviewer rubric:** Given a DRAFT, when the Reviewer runs,
  then it validates the seven rubric items below and returns `APPROVED`
  only if all pass; otherwise `CHANGES_REQUESTED` with a bullet list
  naming each failing item:
  1. Decision Gate block present as first fenced block and all six
     fields populated.
  2. Every mandatory section present in the order given by the
     template: Problem Statement, Evidence, Proposed Solution, Key
     Hypothesis, What We're NOT Building, Success Metrics, Acceptance
     Criteria, Open Questions, Users & Context, Solution Detail,
     Technical Approach, Implementation Phases, Decisions Log,
     Research Summary.
  3. No `TBD` or `TBD - needs validation` token in mandatory fields
     (Problem Statement, Proposed Solution, Key Hypothesis, Success
     Metrics rows, AC-N items).
  4. At least 3 AC-N items, each observable (Given/When/Then or
     input/output).
  5. TDD routing subsection present and its statement matches the
     current value in `docs/context/methodology.md`.
  6. Output path is `PRPs/prds/<kebab>.prd.md`; no `.claude/` prefix
     anywhere in the file.
  7. Implementation Phases table has at least one row with a phase
     name, description, and status.

- **AC-11 Approval flips status and stamps date:** Given the user
  explicitly approves during Reviewer dialogue, when the Reviewer
  commits the approval, then (a) the frontmatter-equivalent status at
  the end of the file flips from `DRAFT` to `APPROVED`, (b) the
  `*Approved: <YYYY-MM-DD>*` line is written, and (c) the rubric from
  AC-10 is re-validated one final time before the flip — any regression
  blocks the flip and returns to CHANGES_REQUESTED.

- **AC-12 Output path and filename:** The DRAFT is written to
  `PRPs/prds/<kebab-case-name>.prd.md`. The `PRPs/prds/` directory is
  created if absent. Writes NEVER target `.claude/`. The kebab-case
  name is chosen by the Writer based on Phase 1 content and surfaced
  to the user in the final confirmation message.

- **AC-13 Filename collision handled:** Given a file already exists at
  `PRPs/prds/<chosen-name>.prd.md`, when the Writer is about to write,
  then it appends `-2`, `-3`, … until the path is free, and surfaces
  the final chosen name to the user. A file whose current status is
  `APPROVED` is NEVER overwritten — collision always takes the
  suffix path.

- **AC-14 Research scope caps enforced:** `research-web` caps at
  10 search results fetched and returns ≤ 8 findings in the output.
  `research-codebase` caps at 5 Glob/Grep operations total and
  25 files read, returning ≤ 8 findings. Hitting a cap is not an
  error: the agent appends a `"scope_cap_reached": true` flag to the
  return block so the Writer can note it in Research Summary.

- **AC-15 Research agents produce structured output:** Both research
  agents return a block the Writer can parse into
  `{ findings: [{ title, summary, evidence, source }], gaps: [...],
  degradation_reason?: string, scope_cap_reached?: boolean }`. A return
  that cannot be parsed causes the Writer to emit an inline note in
  the PRD ("Research agent returned unparseable output — treat
  Research Summary as TBD") rather than halting.

- **AC-16 Draft-path pointing at an APPROVED file is refused:** Given
  the user runs `/relay-prd <path>` where the target file's current
  status is `APPROVED`, when the command inspects the file in its
  precondition phase, then it halts before invoking the Writer, prints
  a message instructing the user to manually change the file's status
  back to `DRAFT` (or rename/copy the file) if they want to run a new
  authoring session against it, and exits without touching the file.

## Open Questions

- [x] ~~Should `/relay-prd <path>` ever operate on a file whose current
  status is `APPROVED`?~~ **Resolved 2026-04-22:** No. The command
  refuses the invocation and instructs the user to manually flip the
  file back to `DRAFT` (or copy/rename it) to run a new session.
  Codified as AC-16 and as a precondition check in the command body.
- [ ] Starting caps for `research-web` (10 results / 8 findings) and
  `research-codebase` (5 ops / 25 files / 8 findings) are unvalidated
  guesses. Dogfood should surface whether these bleed signal or
  hallucinate scope-cap hits.
- [ ] Should the Reviewer dialogue user's "small edit" requests be
  applied by the Reviewer inline (proposed MVP), or always route back
  to the Writer for regeneration? Inline edits risk drifting away from
  the Writer's coherent narrative; Writer-only edits cost tokens.
- [x] ~~Approval syntax: free-text vs. explicit token.~~ **Resolved
  2026-04-22:** Free-text affirmation is the accepted syntax. Any
  affirmative reply after the Reviewer's "Aprovar? (sim / pedir
  alterações)" prompt flips the status; the Reviewer interprets the
  reply contextually.

---

## Users & Context

**Primary User**
- **Who:** Developer using `relay` to drive a feature end-to-end in
  Claude Code — typically the same persona as the Test Runner PRD's
  primary user (team member who has installed relay and has a feature
  idea to hand off).
- **Current behavior:** Writes PRDs by hand in free-form markdown, or
  uses `/prp-prd` from upstream prp-core which produces a document that
  omits relay's three mandatory extensions (Decision Gate, AC, TDD
  routing) and therefore is not directly consumable by
  `/relay-execute`.
- **Trigger:** Has a feature idea — a sentence, a paragraph, or a
  rough markdown draft — and wants to hand off to relay's pipeline
  without spending an hour re-writing sections to match the template.
- **Success state:** Types `/relay-prd "<idea>"` (or `/relay-prd`, or
  `/relay-prd <draft>`), dialogues 15–20 minutes, lands an APPROVED
  PRD at `PRPs/prds/<name>.prd.md`, and calls `/relay-execute <path>`
  to kick the autonomous pipeline.

**Job to Be Done**
When I have a feature idea I want to ship through relay, I want to
produce a PRD that downstream agents consume reliably, so I can trust
the pipeline to run without ambiguity-induced rework and spend my
attention on architectural decisions rather than template hygiene.

**Non-Users**
- Teams whose features are too exploratory for PRD-style specification
  (research spikes, prototype-to-learn loops) — for those, the
  template's rigor is overhead. They should reach for a lightweight
  prose doc, not `/relay-prd`.
- Solo developers on throw-away scripts where "ship first, spec later"
  is the correct tradeoff — the interactivity boundary assumes the
  user values catching ambiguity up-front.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `/relay-prd` command file | Entry point for the entire relay pipeline; absence blocks every downstream stage |
| Must | PRD Writer agent (`prd-writer`) | Drives the six-phase Q&A flow; emits Decision Gate + extensions; writes DRAFT |
| Must | PRD Reviewer agent (`prd-reviewer`) | Validates template conformance via rubric; flips DRAFT → APPROVED |
| Must | `research-web` agent | Market grounding at Phase 3; reusable by future relay agents (Plan Writer, etc.) |
| Must | `research-codebase` agent | Codebase grounding at Phase 3; reusable by future relay agents |
| Must | Structured output contract for both research agents | Writer and Reviewer rely on parseable shape; downstream agents will too |
| Must | Decision Gate evidence block at top of every PRD | Mandated by `docs/context/prd-template.md`; non-negotiable |
| Must | Acceptance Criteria section with ≥ 3 observable AC-N items | Template requirement; feeds TDD track |
| Must | TDD routing note correct per `methodology.md` | Template requirement; unambiguous orchestrator hand-off |
| Must | Blank input (opens with "What do you want to build?") | Matches upstream; user decision |
| Must | Description input (single-string idea) | Primary happy-path entry |
| Must | Draft-path input (partial draft seeded) with Q&A skip-on-answered | User decision |
| Must | LLM-chosen kebab-case filename with user-rename-after escape hatch | User decision |
| Must | Filename collision handling via numeric suffix; never overwrite APPROVED | Safety rail |
| Must | Graceful degradation on research unavailability | Architectural rule; `docs/context/architecture.md` mandates it |
| Should | Research scope caps (web: 10 results / 8 findings; codebase: 5 ops / 25 files / 8 findings) | Prevent token runaway; tuneable after dogfood |
| Should | Review iterations logged to `PRPs/prds/<name>.review.jsonl` | Audit trail; measures Success Metric on iteration count |
| Could | Research findings persisted to `PRPs/prds/<name>.research.md` | Audit + downstream reuse if other agents want the raw findings |
| Could | Mid-session partial DRAFT saved to `.relay/prd-drafts/<name>.partial.md` on phase boundaries | Session-resume ergonomics; MVP restarts from scratch on abandonment |
| Won't | Non-interactive / batch PRD authoring | Breaks interactivity boundary |
| Won't | Reopening APPROVED PRDs | Future PRD if demand emerges |
| Won't | Figma-to-spec preprocessor | Separate PRD (planning problem #04) |
| Won't | Multi-language artifact output | Template is English-only |

### MVP Scope

Every **Must** row plus both **Should** rows. Four files created, one
command shipped, one template-enforcing loop closed.

**Could** rows are deferred pending dogfood evidence. Persisted
research and partial-DRAFT resume are both ergonomic wins but neither
is required to close the functional loop.

### User Flow

**Happy path — description input (autonomous from Writer's side):**

1. Developer invokes `/relay-prd "intelligent PRD authoring with research"`.
2. Phase 1 INITIATE: Writer restates the understanding; user confirms or adjusts.
3. Phase 2 FOUNDATION: Writer asks the five foundation questions; user answers.
4. Phase 3 GROUNDING: Writer invokes `research-web` + `research-codebase` in parallel; summarizes findings to user.
5. Phase 4 DEEP DIVE: vision / users / non-users; user dialogues.
6. Phase 5 GROUNDING (second pass, conditional — runs only when findings changed direction in Phase 4).
7. Phase 6 DECISIONS: MoSCoW, risks, open questions; user confirms.
8. Phase 7 GENERATE: Writer emits Decision Gate block, fills every mandatory section, writes `PRPs/prds/<chosen-name>.prd.md` with status DRAFT.
9. Writer hands off to Reviewer.
10. Reviewer runs the seven-item rubric (AC-10). If all pass, it asks the user "Aprovar PRD? (sim / pedir alterações)". If any fail, it returns `CHANGES_REQUESTED` with a bullet list.
11. User types approval → Reviewer re-validates, flips status to APPROVED, stamps the date, exits. `/relay-prd` returns the final path.

**Draft-path flow:**

1. Developer invokes `/relay-prd PRPs/prds/draft-auth-sketch.md`.
2. Writer reads the draft. For each phase's questions, it detects whether the draft already carries an answer (heuristic + explicit section-header match).
3. Writer skips answered questions; opens dialogue only at the first unanswered one.
4. From there the flow is identical to the happy path (Phases 3–7, then Reviewer).
5. The generated PRD's "Decisions Log" includes a row citing which fields were carried over from the draft verbatim vs. produced during dialogue.

**Blank-input flow:** identical to description-input except Phase 1 opens with "What do you want to build?" and gates on the user's first response before proceeding.

**Reviewer-iteration flow (inside step 10 above):**

1. Reviewer returns CHANGES_REQUESTED with a bullet list.
2. User replies with edit intentions ("the AC-3 is too vague", "add a row for X in MoSCoW").
3. Reviewer evaluates: **small edits** (single-section wording, adding/reshaping an AC, tuning a table row) are applied inline by the Reviewer itself, which then re-validates and reports back. **Structural regenerations** (rewriting Problem Statement, regenerating Research Summary after new research, etc.) hand back to the Writer for a second pass.
4. Loop until user approves or explicitly aborts.

---

## Technical Approach

**Feasibility: HIGH.** Every component has prior art: the interactive
six-phase flow is proven in upstream `prp-core/commands/prp-prd.md`;
research subagents are the standard Claude Code pattern; structural
review against a rubric is a straightforward Markdown-reading exercise;
the DRAFT/APPROVED lifecycle mirrors `test-runner.md`'s
run.json → test-review.json pattern. The novel part is the relay-specific
extensions (Decision Gate, AC mandate, TDD routing note) and the
structured research output contract — both are additive, not
architectural.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**.

- Relay itself has no test suite — the plugin is markdown + JSON. The
  TDD track (B7/B8) does not activate for this PRD's own
  implementation. Instead, the Acceptance Criteria above seed the
  verification the Implementer performs during Phase 5 dogfood.
- When `/relay-prd` is deployed against a target project, that
  project's own `docs/context/methodology.md` governs the TDD routing
  note the Writer emits — not relay's. The Writer reads the target's
  methodology.md at runtime.

### Architecture Notes

- **All five deliverables are markdown + YAML.** Per
  `docs/context/architecture.md`, relay assets are prompts, not
  compiled code. No scripts under `scripts/` for this PRD (unlike Test
  Runner, which shipped `normalize-test-output.mjs` and
  `generate-final-report.mjs`). Markdown agents, parsed at runtime by
  Claude Code.
- **Tool allowlists in frontmatter.** Each agent declares a minimal
  tool set:
  - `research-web`: `WebSearch`, `WebFetch` only.
  - `research-codebase`: `Glob`, `Grep`, `Read` only.
  - `prd-writer`: `Task` (to invoke research agents), `Read`, `Write`, `Edit`.
  - `prd-reviewer`: `Read`, `Edit` (to flip status and stamp date).
- **Command file location:** `plugins/relay/commands/relay-prd.md`.
- **Agent file locations:** `plugins/relay/agents/prd-writer.md`,
  `plugins/relay/agents/prd-reviewer.md`,
  `plugins/relay/agents/research-web.md`,
  `plugins/relay/agents/research-codebase.md`.
- **Argument parsing in the command:** the command body dispatches on
  the argument: empty → blank flow; looks like a readable file path
  (`.md` suffix + resolves) → draft-path flow; otherwise → description
  flow. No flags in MVP. When a draft-path is detected, an additional
  precondition check reads the file's current status and halts on
  `APPROVED` per AC-16 (before the Writer is ever invoked).
- **Decision Gate consultation:** performed by the Writer at the end
  of Phase 6 (DECISIONS), before Phase 7 GENERATE. The Writer reads
  the three mandatory sources, assembles the evidence block, and
  embeds it as the first fenced block below the title. Halt behavior
  on read failure is specified in AC-7.
- **Structured research output:** agents return a Markdown block the
  Writer consumes via Read + light parsing. No external normalizer
  (unlike Test Runner's normalizer) — the Writer is an LLM and can
  tolerate minor format variance. The shape is documented in the
  agent frontmatter and enforced by the Writer's prompt.
- **Review log:** `PRPs/prds/<name>.review.jsonl` appended by the
  Reviewer on every verdict (APPROVED or CHANGES_REQUESTED). Shape:
  `{ timestamp, verdict, rubric_failures: [...], user_edit_count }`.
  Used for Success Metric #4.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Writer hallucinates content when user is vague rather than emitting "TBD - needs validation" | M | Explicit anti-pattern in Writer prompt; Reviewer rubric item #3 rejects TBD in mandatory fields; prompt test during dogfood |
| Research agents return low-signal or off-topic findings | M | Scope caps (AC-14); structured output contract; prompt tuning driven by dogfood |
| Decision Gate block missing / malformed in the DRAFT | L | Writer emits it last before `Write`; Reviewer rubric item #1 blocks flip on absence; AC-7 is a hard fail |
| Template drifts from upstream `prp-core/commands/prp-prd.md` | M | `docs/context/prd-template.md` §"Keeping the fork in sync" already requires a decision entry on every upstream change; this PRD does not relax that rule |
| User abandons mid-session | L for MVP | MVP restarts from scratch; partial-DRAFT persistence is a Could item for v2 |
| Filename collision overwrites an APPROVED PRD | L | AC-13 numeric suffix; APPROVED-status check before any Write |
| Research agents consume unbounded tokens before caps kick in | M | Caps are upper bounds; prompts are tuned to be minimal; Writer surfaces `scope_cap_reached` to the user as a note |
| "Markdown agent" has no unit-test harness — bugs only appear in usage | H | Dogfood IS the test (Phase 5); AC-1 through AC-15 are the verification protocol; markdown's low friction makes iteration cheap |
| Reviewer inline edits drift from the Writer's voice, creating narrative inconsistency | M | Reviewer prompt constrains inline edits to surgical changes; structural edits route back to Writer; Open Question #3 flags this for dogfood-driven revision |
| Draft-path answer-detection is too loose (false positives skip real questions) or too strict (asks already-answered questions) | M | Detection heuristic is explicit in Writer prompt; dogfood tracks false-positive/negative rate; Open Question implicit in AC-3 validation |

---

## Implementation Phases

Ordered. Each phase produces something inspectable before the next
starts. No big-bang integration at the end.

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Research agents | `research-web.md` + `research-codebase.md` with structured output contract and scope caps | complete | with 2 (contract design only) | - | (no plan — agents shipped 2026-04-25) |
| 2 | PRD Writer agent | `prd-writer.md` implementing the 6-phase Q&A flow, draft-path detection, research-agent orchestration, Decision Gate emission, DRAFT write | complete | after 1 contract | 1 | (no plan — agent shipped 2026-04-25) |
| 3 | PRD Reviewer agent | `prd-reviewer.md` with 7-item rubric, inline-edit vs. Writer-handoff logic, status flip + date stamp, review.jsonl log | complete | - | 2 | (no plan — agent shipped 2026-04-25) |
| 4 | `/relay-prd` command | Command file with argument parsing, precondition checks, Writer → Reviewer orchestration, final path return | complete | - | 3 | (no plan — command shipped 2026-04-25) |
| 5 | Dogfood — self-PRD regeneration | Re-run `/relay-prd` with the feature description for this very PRD; compare output against this hand-written PRD; file dogfood report | complete (substituted target) | - | 4 | (no plan — dogfood ran 2026-04-25; see Phase Details) |
| 6 | Docs + api-reference update | Promote `/relay-prd` and all four agents to `✅ implemented` in `docs/api-reference.md`; update `documentation/roadmap/status.html` Phase 3 row; add changelog entry per `documentation/AGENTS.md` | complete | - | 5 | (no plan — docs landed 2026-04-25) |

### Phase Details

**Phase 1: Research agents**
- **Goal:** Two minimal, composable research subagents with stable,
  parseable output contracts.
- **Scope:**
  - `plugins/relay/agents/research-web.md` — market-context prompt,
    tool allowlist `WebSearch, WebFetch`, caps enforced in prompt
    (10 results, 8 findings), structured return block per AC-15.
  - `plugins/relay/agents/research-codebase.md` — pattern-locator
    prompt, tool allowlist `Glob, Grep, Read`, caps enforced
    (5 ops, 25 files, 8 findings), structured return block.
- **Success signal:** Each agent invoked standalone via
  `Task(subagent_type=...)` against a known prompt returns a parseable
  block matching the contract; empty-result case surfaces
  `degradation_reason` correctly (AC-5, AC-6).
- **Dependency note:** Phase 2 can start drafting in parallel once the
  structured-output contract is frozen (end of Phase 1 design), but
  Phase 2 cannot ship until Phase 1 agents exist.

**Phase 2: PRD Writer**
- **Goal:** An agent that drives the full six-phase flow, emits Decision
  Gate, and writes a conformant DRAFT.
- **Scope:** `plugins/relay/agents/prd-writer.md` with:
  - The 6-phase Q&A loop, inheriting upstream phases but extended
    with relay's three mandatory sections.
  - Argument branching (blank / description / draft-path) inside
    Phase 1 INITIATE.
  - Draft-path answer detection heuristic with explicit decision
    criteria per template section.
  - Research-agent orchestration at Phase 3 (and conditionally
    Phase 5) via `Task(...)` invocations.
  - Decision Gate consultation at the end of Phase 6 (reads the three
    mandatory sources, assembles the block).
  - DRAFT file write to `PRPs/prds/<kebab>.prd.md` with collision
    handling.
- **Success signal:** AC-1, AC-2, AC-3, AC-4, AC-7, AC-8, AC-9, AC-12,
  AC-13 validate during Phase 5 dogfood.

**Phase 3: PRD Reviewer**
- **Goal:** An agent that validates template conformance and drives the
  DRAFT → APPROVED flip.
- **Scope:** `plugins/relay/agents/prd-reviewer.md` with:
  - The seven-item rubric from AC-10 as explicit checks.
  - Inline-edit vs. Writer-handoff decision logic.
  - Status-flip + date-stamp via `Edit` tool (surgical replacement of
    `*Status: DRAFT*` line and `*Approved: ...*` line addition).
  - Final pre-flip re-validation of the rubric (AC-11).
  - Append to `PRPs/prds/<name>.review.jsonl` on every verdict.
- **Success signal:** AC-10, AC-11 validate during Phase 5 dogfood.
  Specifically: a deliberately-defective DRAFT (missing Decision Gate,
  no AC-N, TBD in Problem Statement) produces a CHANGES_REQUESTED
  bullet list naming all three defects.

**Phase 4: `/relay-prd` command**
- **Goal:** The visible entry point. Orchestrates Writer → Reviewer.
  Handles all three input shapes. Surfaces the final path.
- **Scope:** `plugins/relay/commands/relay-prd.md` with:
  - `argument-hint: [description | draft-path]` in frontmatter.
  - Precondition check: `docs/decisions.md`,
    `docs/anti-patterns.md`, `docs/context/architecture.md` readable
    (else halt per AC-7).
  - Argument dispatch: empty / `.md` path / description.
  - When draft-path is detected: read the target file's status line
    and halt with the manual-reopen instruction if it is `APPROVED`
    (AC-16) — the Writer is never invoked in this case.
  - Writer invocation; on DRAFT landing, Reviewer invocation; on
    APPROVED, return path.
  - Graceful degradation if research agents fail (log degradation
    note, continue).
- **Success signal:** End-to-end session from `/relay-prd` to APPROVED
  for one blank, one description, and one draft-path invocation in
  the dogfood.

**Phase 5: Dogfood — self-PRD regeneration** *(completed 2026-04-25 with substituted target)*
- **Goal:** Close the meta loop and prove the agents work end-to-end against a real authoring task.
- **Scope (revised at execution time):** Instead of regenerating this PRD (self-referential dogfood), the session authored a **new** PRD for the next pipeline stage — `/relay-plan` + `/relay-plan-review` — using a description-mode invocation. This produced a useful artifact (the next stage's PRD) while exercising every Phase 1 → Phase 7 → Reviewer loop in the same way.
- **Outcome:** `PRPs/prds/plan-authoring.prd.md` was generated (status `DRAFT`), Reviewer ran the 7-item rubric (all passed), inline-edit dialogue applied a small AC-10 wording fix per user request, rubric re-validated, user approved in free-text dialogue, status flipped to `APPROVED` 2026-04-25.
- **Validated in this session:**
  - AC-2 description input → Phase 1 restate → confirmation gate → flow proceeds
  - AC-4 research agents invoked at GROUNDING — both returned structured findings; web research surfaced 6 real sources with URLs (verified by user); codebase research surfaced 8 entries with valid `path:line` references
  - AC-7 Decision Gate emitted as the first fenced block; consultation cited real 2026-04-19 decisions from `docs/decisions.md`
  - AC-8 TDD routing note matched `docs/context/methodology.md` (`tdd: false` verbatim string)
  - AC-9 ≥3 observable AC-N items (the generated PRD ships 10)
  - AC-10 Reviewer rubric — 7 items run, per-item pass/fail surfaced, structured CHANGES_REQUESTED would have fired on any failure
  - AC-11 approval flip — final pre-flip re-validation passed, status line updated, `*Approved: 2026-04-25*` stamped
  - AC-12 output path under `PRPs/prds/` with kebab-case filename (`plan-authoring.prd.md`)
  - AC-14 scope caps respected (8 web findings, 8 codebase findings — within the cap on both)
  - AC-15 structured output parsed correctly by the Writer
  - Inline-edit-vs-handoff branching: AC-10 wording fix correctly classified as inline edit, applied via `Edit`, and re-validated
- **Deferred** (need separate dogfood scenarios): AC-1 blank-input flow, AC-3 draft-path with skip-on-answered, AC-5 / AC-6 graceful-degradation paths, AC-13 filename collision, AC-16 APPROVED-file refusal. None blocking.

**Phase 6: Docs update** *(completed 2026-04-25)*
- **Goal:** Promote `/relay-prd` and the four agents from "planned" to "implemented" in the public surface.
- **Scope as shipped:**
  - `docs/api-reference.md` — `/relay-prd` flagged ✅ implemented in the writers table with expanded behavior notes; four new rows added to the Agents → Implemented table (`prd-writer`, `prd-reviewer`, `research-web`, `research-codebase`); the Planned narrative updated to remove the four shipped agents and to point at `plan-authoring.prd.md` as the next implementation target.
  - `documentation/reference/commands.html` — `badge--done` "implemented" added to the `/relay-prd` heading; Notes block expanded to cover the three input shapes, kebab-case filename selection, collision handling, the APPROVED-file refusal, and cross-links to the two delegated agents.
  - `documentation/reference/agents.html` — four new "Implemented" sections following the existing `test-runner` / `post-green-reviewer` pattern, including the 7-item rubric breakdown for `prd-reviewer` and the inline-edit-vs-handoff criteria; the two PRD-stage rows removed from the "Planned" table.
  - `documentation/roadmap/status.html` — project-level Phase 3 advanced from `pending` to `partial` with an inline note enumerating the shipped pieces; "What's shipped > Plugin artifacts" updated; "What's next > Phase 3" rewritten to separate Shipped from Pending.
  - `documentation/changelog.html` — new `0.6.0 — 2026-04-25` release entry under the `Changed` and `Added` sections per the AGENTS.md contract.
- **Success signal:** api-reference and the two reference pages show the four agents and the command with their paths and roles; changelog renders the entry; roadmap status updated.
- **Outcome:** All five edits landed clean. No new pages or NAV entries were needed (all changes are content updates to existing pages); search index untouched.

### Parallelism Notes

Phase 1 (research agents) and Phase 2 (Writer) can overlap: the Writer
design can proceed in parallel with Phase 1 implementation as long as
the structured-output contract is frozen first. Phase 3 (Reviewer) is
strictly sequential after Phase 2 — the Reviewer is a critic of the
Writer's output and needs the Writer's real output shape, not a
mock. Phases 4–6 are sequential.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Agent split for `/relay-prd` | Two agents (`prd-writer` + `prd-reviewer`) orchestrated by the command | Single combined agent that both writes and reviews | Parity with the rest of relay's writer/reviewer splits; `prd-reviewer` can be re-run independently in future (e.g., after hand-edit of an APPROVED PRD, though that entry point is not MVP); smaller, more focused agent prompts |
| Research approach | Relay-specific agents (`research-web` + `research-codebase`) | Built-in `general-purpose` agent with inline prompts; skip research in MVP; hybrid opt-in | User decision: future relay agents (Plan Writer, TDD Writer, Implementer, Code Reviewer, Docs Updater) will all want research; a shared pair of agents amortizes the prompt-engineering investment and gives a stable contract other agents consume |
| Blank input support | Supported; opens with "What do you want to build?" | Require description always | User decision; matches upstream `prp-prd.md`; zero marginal cost to support |
| Draft-path semantics | Skip Q&A questions already answered in the draft; ask only the unanswered ones | Full re-ask; Reviewer-only mode ignoring the draft | User decision; respects the user's prior work without over-trusting it |
| Filename derivation | LLM chooses kebab-case from Phase 1 content; user can rename post-hoc | Ask user explicitly | User decision; rename is a trivial `mv` and not worth a dialogue turn |
| Research timing | Automatic at Phase 3 GROUNDING (plus conditional Phase 5 re-ground) | Opt-in per session with a yes/no dialogue turn | Matches the inherited 6-phase contract from upstream; graceful degradation covers the no-research case without a dialogue turn |
| Research scope caps | web: 10 results / 8 findings; codebase: 5 ops / 25 files / 8 findings | Unbounded; per-session CLI flag; much tighter caps (3 / 10) | Prevent token runaway; numbers are starting defaults flagged as tuneable in Open Questions #2 after dogfood |
| Approval mechanic | User types free-text affirmation ("sim" / "aprovar" / "ok" / "yes") after Reviewer's explicit prompt | Explicit token `/approve` or literal `APPROVE` | Free-text matches the conversational nature of the interactive phase; explicit tokens add friction. **Confirmed 2026-04-22.** |
| Draft-path pointing at APPROVED file | Refuse, instruct the user to manually flip to `DRAFT` (or copy/rename) to start a new session | Auto-reopen (flip to DRAFT transparently); run the session anyway and overwrite on approval | Explicit manual step preserves the APPROVED contract as a deliberate artifact state — no agent silently downgrades a completed PRD. Codified as AC-16. **Confirmed 2026-04-22.** |
| CHANGES_REQUESTED handling by Reviewer | Inline surgical edits for single-section fixes; hand back to Writer for structural regeneration | Always hand back to Writer; never hand back (Reviewer does everything) | Minimizes wasted Writer invocations for small fixes; Open Question #3 flags this for dogfood-driven revision if narrative drift is observed |
| Output path | `PRPs/prds/<feature>.prd.md` at repo root | `.claude/PRPs/prds/`; per-user folder | Per existing decision on PRP artifact paths (`docs/decisions.md` 2026-04-19) — `.claude/` triggers permission prompts |
| Filename collision handling | Append `-2`, `-3`, … until free; never overwrite a file whose current status is `APPROVED` | Overwrite; fail loud | User ergonomics plus safety rail against accidental APPROVED clobbering |
| Agent models | All four agents use `sonnet` | `opus` for Writer (better reasoning for dialogue); `haiku` for research (cheaper) | Sonnet is the cost-performant default already used by `test-runner` and `post-green-reviewer`; reasoning upgrade is cheap to apply later if dogfood shows a gap |
| Agent color convention | `prd-writer=blue`, `prd-reviewer=teal`, `research-web=amber`, `research-codebase=purple` | Match existing palette (`test-runner=coral`, `post-green-reviewer=green`) more tightly | Colors are visual-only (shown in `/agents` list); starting with four distinguishable colors; trivial to adjust |
| Review iteration log | Append JSONL to `PRPs/prds/<name>.review.jsonl` | No log; separate `.review.md` per session | Mirrors the `run.json` pattern established by Test Runner; measures Success Metric #4; small file size |
| Tests for markdown agents | Dogfood (Phase 5) is the primary verification | Unit-test prompts; mock conversations | No unit-test framework for Claude Code agent prompts; AC-N scenarios validate via real invocation; markdown's low friction makes iteration cheap |

---

## Research Summary

**Market Context**
Prior art surveyed without fresh web search (the space is
well-understood; the decision to write this PRD is not market-driven):

- **Upstream `prp-core/commands/prp-prd.md`** — the interactive
  six-phase Q&A flow relay inherits. Its separation of research into
  `prp-core:web-researcher` + `prp-core:codebase-explorer` subagents
  is the structural model we follow, adapted as relay-owned agents.
  Architecture.md forbids importing prp-core assets, so we re-author
  rather than re-export.
- **Open-source PRD templates** (Atlassian, Lenny Rachitsky's
  newsletter, Intercom's internal template) — all free-form or
  lightly-structured. None automate authoring, none enforce a
  structural rubric, none couple to a downstream pipeline.
- **AI-assisted spec tools** (GitHub Copilot Workspace, Cursor's
  agent mode, Claude Code itself without relay) — can draft PRDs
  ad-hoc but produce free-form output that a downstream autonomous
  pipeline cannot consume reliably.

Relay's contribution is the **combination** of (a) interactive
template-enforcing authoring, (b) dedicated research subagents with a
stable output contract, (c) Decision Gate evidence as the PRD header,
(d) Acceptance Criteria as the downstream TDD contract, (e) structural
review rubric gating APPROVED, all as a single slash command inside
Claude Code's plugin model.

**Technical Context**
- **Claude Code agent model** (YAML frontmatter + markdown body, tool
  allowlist in frontmatter, `Task(subagent_type=...)` invocation
  pattern) is proven — `plugins/relay/agents/test-runner.md` and
  `plugins/relay/agents/post-green-reviewer.md` already ship in
  production.
- **Tool restriction via frontmatter** is the standard pattern for
  bounded subagents; relay adopts it for both research agents
  (`Glob, Grep, Read` only; `WebSearch, WebFetch` only).
- **Structured JSON-ish return blocks** from subagents are a soft
  contract parsed by the calling LLM — no external normalizer needed
  (unlike Test Runner's JUnit XML → canonical-schema normalizer).
  The PRD Writer parses research blocks via Read + light
  schema-validation in its own prompt.
- **`Edit` tool for surgical status flip** is a clean idempotent
  primitive — the Reviewer replaces exactly the two frontmatter-like
  lines (`*Status: DRAFT*` → `*Status: APPROVED*` and appending
  `*Approved: YYYY-MM-DD*`) without rewriting the file.
- **JSONL append log** pattern for Review iterations mirrors
  `run.json` from Test Runner — small files, easy to audit, trivial
  to parse for metrics.

---

*Generated: 2026-04-22*
*Approved: 2026-04-22*
*Status: APPROVED*
