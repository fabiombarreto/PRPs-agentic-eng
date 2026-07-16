# Feature: Docs + site (Phase 4 of implement-phase-docs-sync)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting documentation change (describes a Pillar 2/3 responsibility relocation across relay's own `docs/` knowledge base and the `documentation/` HTML site); impacts reusable-service documentation (docs-updater/docs-reviewer agent-table labels, `/relay-implement`, `/relay-approve` reference pages); `documentation/` site change under the `documentation/AGENTS.md` binding contract (changelog entry + `plugin.json` version-sync required)
- Decisions found:
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute`/`-implement` never commit — implement-time docs edits (described by this phase's prose) stay uncommitted in the worktree during a real pipeline run. This phase's OWN edits to `docs/` and `documentation/` are ordinary direct repo commits (plugin development against `relay`'s own repo, not an autonomous `/relay-implement` run), so the invariant is respected by construction, not by this phase's own commit behavior.
  - [2026-06-19] `/relay-approve` design + interactivity-boundary extension, OQ-b — the post-merge interactivity extension applies ONLY to the approve-time invocation; `docs-updater`/`docs-reviewer` stay scoped to `docs/`, never `documentation/`. Respected here: this phase's `documentation/` edits are hand-authored by the Plan Writer/Implementer per this plan's explicit tasks, never delegated to the `docs-updater`/`docs-reviewer` agent pair.
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` — `docs_sync` is the additive frontmatter key this phase's prose describes; already shipped by Phase 1 of this PRD.
  - PRD's own Decisions Log (two conscious refinements, promoted into `docs/decisions.md` by Task 7 of this plan): (1) the [2026-06-19] interactivity extension applies ONLY to the approve-time invocation — implement-time is non-interactive, deferring questions to the report; (2) primary docs-sync relocates to Pillar 2 (implementation); Pillar 3 is retained as a safety net.
  - `documentation/AGENTS.md` §7.5 (binding) — every minor/major changelog release cut MUST bump `plugins/relay/.claude-plugin/plugin.json` to the same version, in the same commit. This phase's site edits are a minor bump (new descriptive content, no new page, no removed page).
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — not triggered; every edit in this plan resolves under `docs/` or `documentation/` at the target repo root.
  - `documentation/AGENTS.md` §2 core invariants (no build step, no CDN, no new CSS/JS files, no emojis, three-file registration rule) — apply directly to every `documentation/` task in this plan. No new page is created by this phase, so only the changelog leg of the registration rule applies (§6.3), not NAV/search-index registration for a *new* page (§6.1/§6.2) — though Task 13 keeps the *existing* search-index excerpts consistent with the prose this phase changes, per §9's "modifying an existing page" workflow.
- Applicable architectural rules:
  - Three-pillar architecture (`docs/context/architecture.md` "Three-pillar target architecture") — this phase documents the Pillar 2/3 docs-sync relocation without changing the architecture itself.
  - PRP artifact paths table / plan filename convention (`docs/decisions.md` 2026-04-25) — governs this plan document's own path, not the phase's `docs/`/`documentation/` targets.
  - `documentation/AGENTS.md` binding contract — governs every `documentation/` task (§4 template preservation, §5 CSS vocabulary reuse, §6.3 changelog registration, §7.5 plugin-manifest version sync, §9 "modifying an existing page" workflow).
- Result: PROCEED — no unresolvable conflict. This phase's scope (pure documentation/prose update describing already-shipped Phase 1–3 behavior) touches no plugin prompt/config source, does not commit "at implement time" in the pipeline sense (this is direct plugin-repo development, not an autonomous `/relay-implement` run), and keeps `documentation/` edits human/Implementer-authored rather than delegated to the docs-updater/docs-reviewer pair — consistent with [2026-06-19] OQ-b.
```

## Source PRD

- `PRPs/prds/implement-phase-docs-sync.prd.md` — Implementation Phases row 4:
  "Docs + site" — Goal: The plugin's own documentation describes the new
  model and the site is registered per contract. — Success signal: Docs +
  site describe docs-sync during implementation with approve as a safety
  net; changelog entry + `plugin.json` bump present;
  `documentation/AGENTS.md` three-file rule satisfied.

## Summary

Phases 1–3 of `implement-phase-docs-sync` (all `complete`) shipped the
actual behavior change: `docs-updater`/`docs-reviewer` now accept
`diff_source`/`non_interactive`/`feature`/`prd_path` inputs (Phase 1),
`/relay-implement` dispatches the pair non-interactively in a new
`Phase A.3.5 — Docs-sync dispatch` sub-phase immediately after code-review
`APPROVED` and before the D8 mutations (Phase 2), and `/relay-approve`'s
existing Phase 3 DOCS CYCLE now self-skips on `docs_sync: false` and is
confirmed idempotent against an already implement-time-synced worktree
(Phase 3). None of that shipped code touched relay's own documentation.
This phase is pure prose: it updates `docs/` (architecture, api-reference,
flows, integrations, KNOWLEDGE_BASE index, a new decisions.md entry) and
the `documentation/` site (pillars, interactivity-boundary,
roadmap/status, commands/agents reference pages, the search index) so
every reader-facing description matches the shipped dual-dispatch model —
docs-sync now happens primarily during implementation (Pillar 2), with
`/relay-approve`'s post-merge cycle (Pillar 3) retained as a low-delta
safety net. It also fixes several PRE-EXISTING stale spots (a "Pillar 3
is planned" callout, a nonexistent `/approve-implementation` command name
in three separate files) that this phase's `research-codebase` grounding
pass surfaced beyond the PRD's own explicit list — opportunistic drift
correction the PRD's Should-item explicitly authorizes. The phase closes
with the mandatory `documentation/changelog.html` entry and a
`plugins/relay/.claude-plugin/plugin.json` version bump (`0.21.0` →
`0.22.0`) in the same change, per `documentation/AGENTS.md` §7.5.

## User Story

As a developer (or future contributor) reading relay's own documentation
I want `docs/` and the `documentation/` site to accurately describe when
and how docs-sync runs
So that I trust the knowledge base to reflect the plugin's actual,
shipped behavior instead of a stale Pillar-3-only mental model

## Problem Statement

(Narrowed from the PRD's Problem Statement to Phase 4's scope.) Phases
1–3 relocated docs-sync's primary trigger point into `/relay-implement`
(Phase A.3.5), retaining `/relay-approve`'s cycle as a safety net — but
relay's own `docs/context/architecture.md`, `docs/api-reference.md`, and
the `documentation/` site still describe the pre-Phase-1-3 world: Docs
Updater/Reviewer as an approve-time-only mechanism, `documentation/concepts/pillars.html`
even asserting "Pillar 3 is planned" despite Pillar 3 having shipped
v0.14.0–v0.17.0. `docs/domain/flows.md` and `docs/context/integrations.md`
separately name a command, `/approve-implementation`, that was never
built — the real command is `/relay-approve <pr>`. If this drift is not
fixed, relay's own documentation compounds the exact problem the PRD
exists to solve (a knowledge base that silently falls behind the shipped
system).

## Solution Statement

(Narrowed from the PRD's Proposed Solution to Phase 4's scope.) Perform
a surgical prose pass across the `docs/` files that describe relay's
pipeline architecture and command surface, and the `documentation/`
pages that mirror them, adding a sentence or clause at each stale
location describing the implement-time dispatch (`Phase A.3.5`,
non-interactive, working-tree/patch diff source, `docs_sync`/`--no-docs`
gated) as primary, and recasting the approve-time cycle as a safety net.
Fix the `/approve-implementation` naming drift wherever `research-codebase`
found it (`docs/domain/flows.md`, `docs/context/integrations.md`). Append
one new `docs/decisions.md` entry recording the PRD's two conscious
refinements. Close with the `documentation/changelog.html` entry +
`plugin.json` version bump `documentation/AGENTS.md` §7.5 requires for
any minor release cut.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation-only edit across relay's own `docs/` knowledge base and the `documentation/` HTML site (no plugin prompt/config/runtime source touched) |
| Complexity | Medium (breadth across 14 files; every individual edit is surgical prose, no new architectural surface) |
| Systems Affected | `docs/context/architecture.md`, `docs/api-reference.md`, `docs/domain/flows.md`, `docs/context/integrations.md`, `docs/KNOWLEDGE_BASE.md`, `docs/decisions.md`, `documentation/concepts/pillars.html`, `documentation/concepts/interactivity-boundary.html`, `documentation/roadmap/status.html`, `documentation/reference/commands.html`, `documentation/reference/agents.html`, `documentation/assets/data/search-index.json`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json` |
| Dependencies | Phase 1 (`implement-phase-docs-sync-phase-1-agent-capability-config-surface.plan.md`, complete), Phase 2 (`implement-phase-docs-sync-phase-2-relay-implement-dispatch.plan.md`, complete), Phase 3 (`implement-phase-docs-sync-phase-3-approve-as-safety-net.plan.md`, complete) — this phase documents already-shipped behavior; introduces no new runtime dependency |
| Estimated Tasks | 15 |
| Source PRD line ref | `PRPs/prds/implement-phase-docs-sync.prd.md:166` (Implementation Phases row 4), `:185-188` (Phase 4 Phase Details), `:204-205` (Decisions Log — the two conscious refinements) |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `docs/context/architecture.md` | 38-58 | "Three-pillar target architecture" — the exact Pillar 2/3 prose this phase rewrites |
| P0 | `docs/api-reference.md` | 17-34, 45, 82, 128-129 | Happy-path prose + `/relay-implement`/`/relay-approve` rows + `docs-updater`/`docs-reviewer` rows — every stale spot this phase corrects |
| P0 | `docs/domain/flows.md` | 28-90 | Implementation flow (gains the docs-sync step) + stale Approval flow section (names the nonexistent `/approve-implementation` command) |
| P0 | `docs/decisions.md` | 692-719 | Entry template + the two most recent real entries — the exact format the new `[2026-07-16]` entry must match |
| P0 | `documentation/AGENTS.md` | 1-480 | Binding site contract — template preservation, CSS vocabulary, three-file registration rule, §7.5 plugin-manifest version sync |
| P1 | `documentation/concepts/pillars.html` | 108-189 | Pillar 2/3 sections + the stale "Pillar 3 is planned" status callout |
| P1 | `documentation/changelog.html` | 1-55 | Release-block structure (summary + Changed/Fixed + plugin-manifest bump `<li>`) this phase's new `0.22.0` entry must match |
| P1 | `plugins/relay/.claude-plugin/plugin.json` | 1-9 | Current version (`0.21.0`) this phase bumps to `0.22.0` |
| P2 | `docs/context/integrations.md` | 33-39 | Stale `/approve-implementation` reference + `(planned — Phase 3/4)` tag on the now-fully-shipped `gh` CLI entry (surfaced by this phase's `research-codebase` grounding pass) |
| P2 | `documentation/concepts/interactivity-boundary.html` | 139-142 | Pillar 3 section frames Docs Updater/Reviewer as living only inside Pillar 3 — omits the new Pillar-2 non-interactive dispatch |
| P2 | `documentation/roadmap/status.html` | 154-209 | Frames Docs Updater/Reviewer as a Phase-4/Approval-only closeout |
| P2 | `documentation/assets/data/search-index.json` | 21-102 | `pillars.html` + `agents.html` search excerpts mirror the same stale framing |
| P2 | `PRPs/prds/implement-phase-docs-sync.prd.md` | 185-188, 192-207 | Phase 4 Phase Details + Decisions Log (the two conscious refinements Task 7 promotes into `docs/decisions.md`) |

## Patterns to Mirror

```
# SOURCE: docs/context/architecture.md:44-58
2. **Implementation (single command)** — a chain of writer/reviewer agent
   pairs: PRD → Plan → (optional TDD) → Implementer → Code Reviewer →
   Test Runner (with auto-correction loop). Terminates with all phases
   complete and uncommitted changes in `.worktrees/<feature>/`. Does NOT
   commit or create a PR — that boundary is permanent (see
   `docs/decisions.md` 2026-05-18).
3. **Approval** — three commands after human validation: `/relay-commit`
   commits locally (no push); `/relay-pr` pushes + opens the PR;
   `/relay-approve` merges the PR, deletes the branch and worktree in
   collision-safe order, then runs Docs Updater and Docs Reviewer to keep
   `docs/context/` and `docs/domain/` in sync with what was actually
   implemented. All three Pillar 3 commands shipped (v0.14.0–v0.17.0).
```
Copied (bullet numbering, "see `docs/decisions.md` <date>" citation style)
by Task 1, which extends bullet 2 with the docs-sync dispatch sentence and
recasts bullet 3's closing clause as a safety-net description, both
citing the new `docs/decisions.md` 2026-07-16 entry Task 7 appends.

```
# SOURCE: docs/api-reference.md:45
| `/relay-implement <plan-path>` ✅ **implemented** | approved plan ending
with `*Status: APPROVED*` whose source PRD's Implementation Phases row N
has `Status: in-progress` | working tree carries the implementation diff
against the base commit; on APPROVED rubric, plan trailing block flipped
to `*Status: IMPLEMENTED*`, ... See `PRPs/prds/implementation-authoring.prd.md`. |
```
Copied (dense single-cell narrative, parenthetical budget/flag callouts,
trailing "See `PRPs/prds/...`" citation) by Task 2's `/relay-implement`
row extension.

```
# SOURCE: docs/api-reference.md:82
| `/relay-approve <pr>` ✅ **implemented** | PR number or URL | merge PR
via `gh pr merge --merge`; ... Supports `--strategy merge|squash|rebase`,
`--admin`, `--force`, `--no-docs`. 8 HALT codes. See
`plugins/relay/commands/relay-approve.md`. |
```
Copied (flag-list sentence style) by Task 3's `/relay-approve` row
extension (adds the `docs_sync` self-skip clause alongside the existing
`--no-docs` mention).

```
# SOURCE: docs/api-reference.md:128-129
| `docs-updater` ✅ | `plugins/relay/agents/docs-updater.md` | `/relay-approve`
command (post-merge, before `docs-reviewer`) | Pillar 3 WRITER. Given a
merged PR, reads `gh pr diff <pr>` ... |
| `docs-reviewer` ✅ | `plugins/relay/agents/docs-reviewer.md` | `/relay-approve`
command (post-merge, immediately after `docs-updater`) | Pillar 3 REVIEWER.
Validates the Docs Updater's `docs-update.md` manifest ... |
```
Copied (four-column agent-table row shape) by Task 3's dual-dispatch
label rewrite — "Invoked by" gains the `/relay-implement` Phase A.3.5
call site; "Responsibility" opening clause changes from "Pillar 3
WRITER."/"Pillar 3 REVIEWER." to a dual-pillar framing.

```
# SOURCE: docs/domain/flows.md:66-78
## 3. Approval flow (Pillar 3 — planned)

Once the PR is ready, the user triggers the approval flow.

1. User runs `/approve-implementation`.
2. The system merges the PR, deletes the feature branch, and cleans up the
   worktree.
3. A Docs Updater agent compares what was implemented against the existing
   `docs/context/` and `docs/domain/` files and updates them accordingly.
4. A Docs Reviewer checks the updated documentation and asks the human
   about any ambiguous rules encountered during the implementation.
5. The project's documentation is now in sync with its new state.
```
Rewritten by Task 4: heading loses "— planned" (Pillar 3 shipped
v0.14.0–v0.17.0), step 1's command name is corrected to `/relay-approve <pr>`,
and steps 3-4 are reworded to frame the cycle as a safety-net pass
(primary sync already happened at the new Implementation-flow step this
same task inserts).

```
# SOURCE: docs/context/integrations.md:33-39
## GitHub CLI (`gh`) (planned — Phase 3/4)
...
PRs during `/approve-implementation`. **Used by:** PR Creator agent,
`/approve-implementation` command.
```
Rewritten by Task 5: drop the stale `(planned — Phase 3/4)` tag (`gh` has
shipped since v0.14.0) and replace both `/approve-implementation`
mentions with `/relay-approve <pr>`.

```
# SOURCE: docs/KNOWLEDGE_BASE.md:24
→ docs/context/architecture.md — plugin layout, phases, relationship to upstream prp-core
```
Copied (`→ <path> — <one-line description>` index-entry format, confirmed
by `research-codebase`) by Task 6, which appends a short clause to this
one line.

```
# SOURCE: docs/decisions.md:710-719 (entry template)
<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
```
Followed exactly (heading + four bolded-label paragraphs, `---` separator
above) by Task 7's new `[2026-07-16]` entry. The immediately preceding
real entry (`docs/decisions.md:692-706`, "`[2026-07-10]` Test pair
universalized...") is the closest structural precedent for a multi-part
decision recorded in one entry with sub-bulleted paragraphs before
**Reason**.

```
# SOURCE: documentation/concepts/pillars.html:80-83 (callout--note block)
<div class="callout callout--note">
  <div class="callout__title">Why two tiers plus details</div>
  <p>Tier 1 (<code>CLAUDE.md</code>) is always loaded ... </p>
</div>
```
Copied (callout block shape, per `documentation/AGENTS.md` §5.1) by
Task 8's rewrite of the stale "Status" callout at `pillars.html:164-167`.

```
# SOURCE: documentation/concepts/pillars.html:122-131 (Pillar 2 agent list)
<ul>
  <li><strong>PRD Writer &amp; PRD Reviewer</strong> — interactive 6-phase Q&amp;A; ...</li>
  ...
  <li><strong>Report + PR Creator</strong> — assembles the final Markdown report and opens the pull request</li>
</ul>
```
Copied (`<li><strong>Name</strong> — description</li>` list-item shape) by
Task 8's new docs-pair `<li>` inserted after "Implementer & Code Reviewer".

```
# SOURCE: documentation/concepts/interactivity-boundary.html:139-142
"Pillar 3 (Approval) is a separate concern with its own boundary: ...
Once triggered, its internal steps (merge, Docs Updater, Docs Reviewer)
run autonomously, but Pillar 3 as a whole is a conscious human act."
```
Rewritten by Task 9 to distinguish the approve-time docs cycle (MAY
dialogue, per [2026-06-19]) from the new implement-time dispatch (always
non-interactive), and to note Docs Updater/Reviewer no longer live only
inside Pillar 3.

```
# SOURCE: documentation/roadmap/status.html:154-209 (evidence excerpt)
"The Docs Updater and Docs Reviewer agents (v0.17.0) close out the
automated knowledge-base sync." / "...runs Docs Updater and Docs Reviewer
agents to keep docs/context/ and docs/domain/ in sync with what was
merged."
```
Rewritten by Task 10 to note the pair now also runs during
`/relay-implement`, with the Phase-4/Approval-roadmap mention recast as
the safety-net leg.

```
# SOURCE: documentation/reference/commands.html:97-100 (verbatim HTML excerpt)
<dt>Output</dt>
<dd>Working tree carries the implementation diff against the base commit.
On APPROVED rubric: plan trailing block flipped to <code>*Status:
IMPLEMENTED*</code>, ...</dd>
```
```
# SOURCE: documentation/reference/commands.html:277-282 (verbatim HTML excerpt)
<dt>Output</dt>
<dd>PR merged via <code>gh pr merge &lt;pr&gt; --merge</code>; branch +
worktree deleted in collision-safe order (...); <code>docs/</code>
knowledge base updated and committed on the base branch
(<code>docs(&lt;feature&gt;): sync knowledge base post-merge</code>)
after the Docs Updater + Docs Reviewer agents approve the manifest.</dd>
```
Extended (append a sentence to each `<dd>`, HTML-escaped) by Task 11 —
mirrors the same prose Task 2/3 add to `docs/api-reference.md`'s Markdown
rows, translated to the site's HTML shape.

```
# SOURCE: documentation/reference/agents.html:430-438, 440-448 (verbatim HTML excerpt)
<h3 id="docs-updater">docs-updater <span class="badge badge--done">shipped</span></h3>
...
<dt>Invoked by</dt><dd><code>/relay-approve</code> command (post-merge, before <code>docs-reviewer</code>)</dd>
<dt>Responsibility</dt><dd>Pillar 3 WRITER. Given a merged PR, reads <code>gh pr diff &lt;pr&gt;</code> ...</dd>
```
Extended by Task 12 (symmetric edit on the `docs-reviewer` block) — adds
the `/relay-implement` call site to "Invoked by" and recasts the
"Pillar 3 WRITER."/"Pillar 3 REVIEWER." opening clause, mirroring Task 3's
`docs/api-reference.md` edit.

```
# SOURCE: documentation/assets/data/search-index.json:21-102 (evidence excerpt)
"Relay's pipeline is organized in three pillars: ... Approval (merge and
docs update)." / "docs-updater (Pillar 3 writer, v0.17.0), docs-reviewer
(Pillar 3 reviewer, v0.17.0)"
```
Rewritten by Task 13 — the two excerpt strings are updated to match
Task 8's `pillars.html` edit and Task 12's `agents.html` edit, per
`documentation/AGENTS.md` §9 ("modifying an existing page" keeps
search-index excerpts consistent).

```
# SOURCE: documentation/changelog.html:33-47 (0.21.0 release block shape)
<h2 id="v0-21-0">0.21.0 &#8212; 2026-07-14</h2>
<p>Ships the repo's first automated-test surface ...</p>
<h3 id="v0-21-0-added">Added</h3>
<ul> ... </ul>
<h3 id="v0-21-0-changed">Changed</h3>
<ul>
  <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
  &mdash; version bumped <code>0.20.0</code> &rarr; <code>0.21.0</code> per
  the 2026-04-30 &sect;7.5 binding contract. ...</li>
  ...
</ul>
```
Copied (heading-id convention `v0-XX-Y`, summary paragraph, `Changed`
list with the exact plugin-manifest-bump `<li>` wording from
`documentation/AGENTS.md` §7.5's own example) by Task 14's new `0.22.0`
release block.

```
# SOURCE: plugins/relay/.claude-plugin/plugin.json:1-9
{
  "name": "relay",
  "version": "0.21.0",
  ...
}
```
Edited (single-field value change, `"version": "0.21.0"` →
`"version": "0.22.0"`) by Task 15.
```

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `docs/context/architecture.md` | UPDATE | Pillar 2/3 descriptions in "Three-pillar target architecture" must describe implement-time docs-sync (Pillar 2, primary) and recast Pillar 3's cycle as a safety net (PRD row 4 item a) |
| `docs/api-reference.md` | UPDATE | Happy-path prose, `/relay-implement` row, `/relay-approve` row, and `docs-updater`/`docs-reviewer` rows all still describe approve-time-only docs-sync (PRD row 4 item b) |
| `docs/domain/flows.md` | UPDATE | Implementation flow gains the docs-sync step; Approval flow section fixes the stale "planned" heading and the nonexistent `/approve-implementation` command name (PRD row 4 item c) |
| `docs/context/integrations.md` | UPDATE | Same `/approve-implementation` naming drift and a stale `(planned — Phase 3/4)` tag on the now-shipped `gh` CLI entry — surfaced by this phase's `research-codebase` grounding pass, in the spirit of the PRD's Should-item "fix pre-existing stale Pillar-3 content" |
| `docs/KNOWLEDGE_BASE.md` | UPDATE | Index descriptor for `docs/context/architecture.md` should flag the Pillar 2/3 docs-sync split now that the underlying file's content changed materially (PRD row 4 item d) |
| `docs/decisions.md` | UPDATE (APPEND only) | New `[2026-07-16]` entry recording the PRD's two conscious refinements, per the file's template; every prior entry PRESERVED ENTIRELY (PRD row 4 item e) |
| `documentation/concepts/pillars.html` | UPDATE | Fixes the stale "Pillar 3 is planned" status callout and adds the docs-pair to Pillar 2's agent list (PRD row 4 item f; explicitly named in the PRD's Should-item) |
| `documentation/concepts/interactivity-boundary.html` | UPDATE | Pillar 3 section currently implies Docs Updater/Reviewer live only inside Pillar 3 — surfaced by `research-codebase` grounding, same staleness family as `pillars.html` |
| `documentation/roadmap/status.html` | UPDATE | Frames Docs Updater/Reviewer as a Phase-4/Approval-only closeout — surfaced by `research-codebase` grounding |
| `documentation/reference/commands.html` | UPDATE | `/relay-implement` and `/relay-approve` sections need the same dual-dispatch mentions as their `docs/api-reference.md` counterparts (PRD row 4 item f) |
| `documentation/reference/agents.html` | UPDATE | `docs-updater`/`docs-reviewer` "Invoked by" + "Responsibility" fields need the dual-dispatch relabel (PRD row 4 item f) |
| `documentation/assets/data/search-index.json` | UPDATE | `pillars.html` and `agents.html` excerpts mirror the same stale framing this phase corrects in the pages themselves — surfaced by `research-codebase` grounding |
| `documentation/changelog.html` | UPDATE | Mandatory changelog entry for this release cut, per `documentation/AGENTS.md` §6.3/§7 (PRD row 4 item f) |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Version bump `0.21.0` → `0.22.0` in the same change as the changelog cut, per `documentation/AGENTS.md` §7.5 binding contract (PRD row 4 item f, PRD AC-7) |

## NOT Building (Scope Limits)

- **Automated sync of the `documentation/` HTML site by the `docs-updater`/`docs-reviewer` agent pair** — unchanged from Phases 1-3; that pair remains forbidden from ever touching `documentation/` ([2026-06-19] OQ-b). This phase's `documentation/` edits are hand-authored per this plan's explicit Step-by-Step Tasks, not delegated to the pair.
- **Making `implementer`/`code-reviewer` docs-aware** — out of scope; unrelated to a pure documentation phase.
- **An interactive docs pass inside `/relay-implement`** — out of scope; this phase only documents the already-shipped non-interactive behavior, it does not change it.
- **A new per-project config surface (`.relay.yaml`)** — out of scope.
- **Committing at implement time** — the Pillar 2 "never commit" invariant this phase documents governs *pipeline* runs; this phase's own edits are ordinary direct-repo commits (plugin development), not a `/relay-implement` invocation.
- **Any code, prompt, or config edit to `plugins/relay/agents/docs-updater.md`, `docs-reviewer.md`, `plugins/relay/commands/relay-implement.md`, or `relay-approve.md`** — those four files were the deliverable of Phases 1-3 (all `complete`) and are read-only Mandatory Reading inputs to this phase, never edit targets.
- **Rewriting `docs/planning/dev_process_improvement_plan.html` or `documentation/roadmap/test-runner-prd.html`** — both are historical/frozen planning artifacts also flagged by this phase's grounding pass as containing the same `/approve-implementation` naming drift, but the PRD's Should-item scopes "pre-existing stale Pillar-3 content" fixes to the live-reference surface (`pillars.html`, `flows.md`, and the further live pages this plan fixes); snapshot-in-time planning docs are explicitly out of scope for this phase (recorded as an open question in Notes, not silently dropped).
- **Adding a NAV entry or a new search-index page object** — no new `documentation/` page is created by this phase; `documentation/AGENTS.md` §6.1/§6.2 (NAV + net-new search-index object) apply only when adding a page. Task 13 updates *existing* search-index excerpt strings, which is a §9 "modifying an existing page" concern, not a §6 registration concern.

## Step-by-Step Tasks

### Task 1: UPDATE docs/context/architecture.md — Pillar 2/3 docs-sync split

- **ACTION**: In the "Three-pillar target architecture" section
  (`docs/context/architecture.md:38-58`), extend bullet 2 (Implementation)
  — after "Terminates with all phases complete and uncommitted changes in
  `.worktrees/<feature>/`." — with a sentence: "Immediately after Code
  Reviewer returns `APPROVED` and before the phase's D8 state-machine
  mutations, the `docs-updater`/`docs-reviewer` pair runs a second time —
  non-interactively, consuming the working-tree diff / captured attempt
  `diff.patch` — to sync `docs/` with the change in the same worktree
  (implement-time docs-sync); gated by `docs_sync` in
  `docs/context/methodology.md` and a per-invocation `--no-docs` flag; any
  operator question defers to the implementation report (see
  `docs/decisions.md` 2026-07-16)." In bullet 3 (Approval), change "then
  runs Docs Updater and Docs Reviewer to keep `docs/context/` and
  `docs/domain/` in sync with what was actually implemented" to "then runs
  Docs Updater and Docs Reviewer as a low-delta safety-net reconciliation
  pass — primary docs-sync now happens at implement time (Pillar 2);
  Pillar 3's pass catches only decisions made after implementation (see
  `docs/decisions.md` 2026-07-16)."
- **MIRROR**: Pattern 1 (`docs/context/architecture.md:44-58`, bullet
  numbering + "see `docs/decisions.md` <date>" citation style).
- **AC**: AC-A1 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  section=$(awk '/^## Three-pillar target architecture/,/^## Interactivity boundary/' docs/context/architecture.md)
  echo "$section" | grep -qi "docs-sync"
  echo "$section" | grep -qi "safety.net"
  echo "PASS: architecture.md Pillar 2/3 section documents implement-time docs-sync and the Pillar 3 safety-net framing"
  ```

### Task 2: UPDATE docs/api-reference.md — Happy-path prose + /relay-implement row

- **ACTION**: In the "Happy path" prose (`docs/api-reference.md:25-34`),
  change "Once the PR merges, `/relay-approve <pr>` (Pillar 3) runs the
  docs-update cycle." to "Docs-sync already ran once during
  `/relay-execute` (inside `/relay-implement`, immediately after
  code-review `APPROVED`); once the PR merges, `/relay-approve <pr>`
  (Pillar 3) runs a low-delta safety-net docs-update cycle." In the
  `/relay-implement` row (line 45), append to the Output cell, before the
  closing "See `PRPs/prds/implementation-authoring.prd.md`." sentence:
  "Immediately after code-review `APPROVED` and before the D8 mutations, a
  `Phase A.3.5 — Docs-sync dispatch` sub-phase runs the
  `docs-updater`/`docs-reviewer` pair non-interactively against the
  current attempt's `diff.patch`, syncing `docs/` in the worktree (own
  `max_docs_review_retries=2` budget; gated by `docs_sync` in
  `docs/context/methodology.md` and a per-invocation `--no-docs` flag;
  deferred operator questions surface via the `Docs:` line in the Final
  output surface). See `PRPs/prds/implement-phase-docs-sync.prd.md`."
- **MIRROR**: Pattern 2 (`docs/api-reference.md:45`, dense single-cell
  narrative + trailing citation style).
- **AC**: AC-A2 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  line=$(grep -n '| `/relay-implement <plan-path>`' docs/api-reference.md | cut -d: -f1)
  if [ -z "$line" ]; then echo "FAIL: /relay-implement row not found"; exit 1; fi
  row=$(sed -n "${line}p" docs/api-reference.md)
  echo "$row" | grep -qi "docs-sync"
  echo "$row" | grep -q -- "--no-docs"
  happy=$(sed -n '25,34p' docs/api-reference.md)
  echo "$happy" | grep -qi "docs-sync"
  echo "PASS: /relay-implement row and Happy-path prose document docs-sync"
  ```

### Task 3: UPDATE docs/api-reference.md — /relay-approve row + docs-updater/docs-reviewer rows

- **ACTION**: In the `/relay-approve` row (line 82), extend "Supports
  `--strategy merge|squash|rebase`, `--admin`, `--force`, `--no-docs`."
  with a clause: "The docs cycle self-skips when `docs_sync: false` in
  `docs/context/methodology.md` (the same master switch shared with the
  implement-time dispatch); when it runs, it is idempotent against a
  worktree already synced at implement time — see
  `docs/context/architecture.md`." In the `docs-updater` row (line 128),
  change the "Invoked by" cell from "`/relay-approve` command (post-merge,
  before `docs-reviewer`)" to "`/relay-implement` command (Phase A.3.5,
  immediately after code-review `APPROVED`, non-interactive, working-tree
  `diff.patch`) AND `/relay-approve` command (post-merge, before
  `docs-reviewer`, safety-net pass)"; change the Responsibility cell's
  opening "Pillar 3 WRITER." to "WRITER — dispatched twice: Pillar 2
  (implement-time, primary) and Pillar 3 (approve-time, safety net)."
  Apply the symmetric edit to the `docs-reviewer` row (line 129).
- **MIRROR**: Pattern 3 (`docs/api-reference.md:82`, flag-list sentence
  style) and Pattern 4 (`docs/api-reference.md:128-129`, four-column
  agent-table row shape).
- **AC**: AC-A2 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  line=$(grep -n 'gh pr merge --merge' docs/api-reference.md | cut -d: -f1)
  if [ -z "$line" ]; then echo "FAIL: /relay-approve row not found"; exit 1; fi
  row=$(sed -n "${line}p" docs/api-reference.md)
  echo "$row" | grep -qi "docs_sync"
  line2=$(grep -n '| `docs-updater` ✅' docs/api-reference.md | cut -d: -f1)
  row2=$(sed -n "${line2}p" docs/api-reference.md)
  echo "$row2" | grep -q "relay-implement"
  echo "$row2" | grep -q "relay-approve"
  line3=$(grep -n '| `docs-reviewer` ✅' docs/api-reference.md | cut -d: -f1)
  row3=$(sed -n "${line3}p" docs/api-reference.md)
  echo "$row3" | grep -q "relay-implement"
  echo "$row3" | grep -q "relay-approve"
  echo "PASS: /relay-approve row documents docs_sync gate; docs-updater/docs-reviewer rows document dual dispatch"
  ```

### Task 4: UPDATE docs/domain/flows.md — implementation flow docs-sync step + stale approval-flow fix

- **ACTION**: In `## 2. Implementation flow` (lines 28-64), insert a new
  bullet immediately after step 7 (Implementer/Code Reviewer), numbered
  `7.5` (mirroring `relay-implement.md`'s own `Phase A.3.5` fractional
  numbering for the identical insertion point, to avoid renumbering
  churn): "7.5. Immediately after the Code Reviewer returns `APPROVED` —
  and before the plan/PRD state advances — a docs pair
  (`docs-updater`/`docs-reviewer`) runs non-interactively to sync `docs/`
  with the change directly in the worktree; any question it would have
  asked a human is deferred to the final report instead of interrupting
  the run." In `## 3. Approval flow (Pillar 3 — planned)` (lines 66-78):
  change the heading to "## 3. Approval flow (Pillar 3 — shipped; docs
  cycle is now a safety net)"; replace step 1 "User runs
  `/approve-implementation`." with "User runs `/relay-approve <pr>`.";
  revise steps 3-4 to state the Docs Updater/Reviewer cycle now runs as a
  low-delta safety-net reconciliation pass, since primary sync already
  happened at the new Implementation-flow step 7.5.
- **MIRROR**: Pattern 5 (`docs/domain/flows.md:66-78`, full stale section
  being rewritten); `docs/domain/flows.md:12` ("Pillar 1 — partially
  implemented" heading-status convention) for the heading-status phrasing.
- **AC**: AC-A3 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -q "approve-implementation" docs/domain/flows.md; then
    echo "FAIL: stale /approve-implementation reference still present in flows.md"; exit 1
  fi
  grep -q "relay-approve" docs/domain/flows.md
  section=$(awk '/^## 2. Implementation flow/,/^## 3. Approval flow/' docs/domain/flows.md)
  echo "$section" | grep -qi "docs pair\|docs-sync"
  echo "PASS: flows.md implementation flow documents docs-sync; stale /approve-implementation reference removed"
  ```

### Task 5: UPDATE docs/context/integrations.md — fix stale gh CLI entry

- **ACTION**: In the `## GitHub CLI (`gh`)` entry (`docs/context/integrations.md:33-39`),
  drop the stale `(planned — Phase 3/4)` heading tag (`gh` has been fully
  implemented since v0.14.0), and replace both occurrences of
  `/approve-implementation` (in the Purpose prose and the "Used by" line)
  with `/relay-approve <pr>`.
- **MIRROR**: Pattern 6 (`docs/context/integrations.md:33-39`).
- **AC**: AC-A3 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -q "approve-implementation" docs/context/integrations.md; then
    echo "FAIL: stale /approve-implementation reference still present in integrations.md"; exit 1
  fi
  section=$(awk '/GitHub CLI/,0' docs/context/integrations.md | head -10)
  if echo "$section" | grep -q "planned — Phase 3/4"; then
    echo "FAIL: gh CLI entry still tagged (planned — Phase 3/4)"; exit 1
  fi
  echo "PASS: integrations.md gh CLI entry corrected"
  ```

### Task 6: UPDATE docs/KNOWLEDGE_BASE.md — architecture.md index descriptor

- **ACTION**: Extend the one-line descriptor for `docs/context/architecture.md`
  (`docs/KNOWLEDGE_BASE.md:24`: "→ docs/context/architecture.md — plugin
  layout, phases, relationship to upstream prp-core") to also flag the
  Pillar 2/3 docs-sync split, e.g. "→ docs/context/architecture.md —
  plugin layout, phases, relationship to upstream prp-core, Pillar 2/3
  docs-sync split (implement-time primary, approve-time safety net)".
- **MIRROR**: Pattern 7 (`docs/KNOWLEDGE_BASE.md:24`, index-entry format).
- **AC**: AC-A5 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  line=$(grep -n 'docs/context/architecture.md' docs/KNOWLEDGE_BASE.md | head -1 | cut -d: -f1)
  row=$(sed -n "${line}p" docs/KNOWLEDGE_BASE.md)
  echo "$row" | grep -qi "docs-sync"
  echo "PASS: KNOWLEDGE_BASE.md architecture.md entry mentions the docs-sync split"
  ```

### Task 7: APPEND docs/decisions.md — new entry recording the two conscious refinements

- **ACTION**: Using `Edit` with `old_string` equal to the exact tail
  boundary after the `[2026-07-10]` entry (`docs/decisions.md:707-710`,
  the `---` line + blank line + `<!-- Template for future entries:`
  line, copied verbatim), insert a new `## [2026-07-16] Docs-sync
  relocates to Pillar 2 (implementation); Pillar 3 retained as a
  safety net; implement-time invocation stays non-interactive` entry
  BEFORE that boundary, following the file's
  Context/Decision/Reason/Areas-affected template exactly. **Context**:
  cite the PRD (`PRPs/prds/implement-phase-docs-sync.prd.md`, APPROVED
  2026-07-15) and that Phases 1-3 already shipped the code (docs-updater/
  docs-reviewer diff_source + non_interactive inputs; `/relay-implement`
  Phase A.3.5 dispatch; `/relay-approve` docs_sync self-skip +
  idempotency). **Decision**: state BOTH refinements as sub-bullets — (1)
  the [2026-06-19] post-merge interactivity extension applies ONLY to the
  approve-time invocation; the new implement-time invocation is
  non-interactive unconditionally, deferring questions to the
  implementation report; (2) primary docs-sync relocates to Pillar 2
  (`/relay-implement` Phase A.3.5, working-tree/patch diff source);
  Pillar 3's approve-time cycle (`/relay-approve` Phase 3) is RETAINED,
  unchanged in mechanics, now serving as a low-delta safety-net
  reconciliation pass. **Reason**: approve is frequently unreached
  (co-locating docs with code is the industry norm — PRD Research
  Summary); the interactivity boundary is defined at PRD approval,
  implement is autonomous, approve is post-merge. **Areas affected**:
  list `plugins/relay/agents/docs-updater.md`, `docs-reviewer.md`
  (Phase 1), `plugins/relay/commands/relay-implement.md` (Phase 2),
  `relay-approve.md` (Phase 3), and every `docs/`/`documentation/` file
  this Phase 4 plan touches. This is a pure APPEND — the `[2026-07-10]`
  entry and every entry above it are PRESERVED ENTIRELY, byte-for-byte.
- **MIRROR**: Pattern 8 (`docs/decisions.md:710-719`, entry template) and
  the `[2026-07-10]` entry's multi-part-decision-in-one-entry structure
  (`docs/decisions.md:692-706`).
- **AC**: AC-A4 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q "^## \[2026-07-16\]" docs/decisions.md
  grep -q "Test pair universalized" docs/decisions.md
  count=$(grep -c "^## \[2026-04-19\] Distribute via Claude Code marketplace" docs/decisions.md)
  if [ "$count" -ne 1 ]; then
    echo "FAIL: first decisions.md entry was duplicated or removed — APPEND-only invariant violated"; exit 1
  fi
  echo "PASS: new 2026-07-16 decisions.md entry appended; prior entries preserved"
  ```

### Task 8: UPDATE documentation/concepts/pillars.html — status callout + Pillar 2 docs-pair bullet

- **ACTION**: In the `<h3 id="the-agents">` bullet list under Pillar 2
  (`documentation/concepts/pillars.html:122-131`), add a new `<li>` after
  the "Implementer &amp; Code Reviewer" item: `<li><strong>Docs pair
  (docs-updater &amp; docs-reviewer)</strong> — dispatched
  non-interactively immediately after Code Reviewer approves and before
  the plan/PRD state advances; syncs <code>docs/</code> in the worktree
  with the change so the knowledge base does not depend on reaching
  approve</li>`. Replace the `callout--note` "Status" block (lines
  164-167, currently "Pillar 3 is planned. As of now, Pillar 1 is
  delivered...") with an accurate statement: Pillar 3 has shipped (all
  three commands, v0.14.0–v0.17.0) and its docs cycle is now a low-delta
  safety net, since primary docs-sync moved to Pillar 2 (implement-time).
- **MIRROR**: Pattern 9 (`documentation/concepts/pillars.html:80-83`,
  `callout--note` block shape per `documentation/AGENTS.md` §5.1) and
  Pattern 10 (`documentation/concepts/pillars.html:122-131`, agent
  `<li>` shape).
- **AC**: AC-A6 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -q "Pillar 3 is planned" documentation/concepts/pillars.html; then
    echo "FAIL: stale 'Pillar 3 is planned' callout still present"; exit 1
  fi
  grep -qi "safety net" documentation/concepts/pillars.html
  grep -qi "before the plan/PRD state advances" documentation/concepts/pillars.html
  echo "PASS: pillars.html status callout fixed; new docs-pair bullet present"
  ```

### Task 9: UPDATE documentation/concepts/interactivity-boundary.html — Pillar 3 section

- **ACTION**: In the section describing Pillar 3's trigger boundary
  (`documentation/concepts/interactivity-boundary.html:139-142`, "Once
  triggered, its internal steps (merge, Docs Updater, Docs Reviewer) run
  autonomously..."), add a clause distinguishing the two docs-pair call
  sites: the approve-time invocation MAY dialogue with the operator (per
  the [2026-06-19] extension), while the new implement-time invocation
  (inside `/relay-implement`, Pillar 2) is always non-interactive, per
  `docs/decisions.md` 2026-07-16.
- **MIRROR**: Pattern 11 (`documentation/concepts/interactivity-boundary.html:139-142`).
- **AC**: AC-A6 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -qi "relay-implement" documentation/concepts/interactivity-boundary.html
  echo "PASS: interactivity-boundary.html distinguishes the implement-time and approve-time docs-pair invocations"
  ```

### Task 10: UPDATE documentation/roadmap/status.html — Docs Updater/Reviewer framing

- **ACTION**: In the roadmap entries describing Docs Updater/Reviewer
  (`documentation/roadmap/status.html:154-209`, currently framed as
  closing out Phase 4/Approval only — e.g. "close out the automated
  knowledge-base sync" and "keep docs/context/ and docs/domain/ in sync
  with what was merged"), add a clause noting the pair now also runs
  during `/relay-implement` (Pillar 2, primary sync), with the
  Phase-4/Approval-roadmap mention recast as the safety-net leg.
- **MIRROR**: Pattern 12 (`documentation/roadmap/status.html:154-209`).
- **AC**: AC-A6 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -qi "relay-implement" documentation/roadmap/status.html
  echo "PASS: roadmap/status.html Docs Updater/Reviewer entries mention the implement-time dispatch"
  ```

### Task 11: UPDATE documentation/reference/commands.html — /relay-implement + /relay-approve sections

- **ACTION**: In the `/relay-implement` Output `<dd>`
  (`documentation/reference/commands.html:97-100`), append a sentence
  describing the `Phase A.3.5` docs-sync dispatch, HTML-escaped, mirroring
  Task 2's `docs/api-reference.md` wording. In the `/relay-approve`
  Output `<dd>` (`documentation/reference/commands.html:277-282`), append
  a clause noting the docs cycle self-skips when `docs_sync: false` in
  `docs/context/methodology.md`, mirroring Task 3's wording.
- **MIRROR**: Pattern 13 (`documentation/reference/commands.html:97-100`)
  and Pattern 14 (`documentation/reference/commands.html:277-282`).
- **AC**: AC-A6 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  line=$(grep -n "Working tree carries the implementation diff against the base commit" documentation/reference/commands.html | cut -d: -f1)
  if [ -z "$line" ]; then echo "FAIL: /relay-implement Output dd not found"; exit 1; fi
  window=$(sed -n "${line},$((line+5))p" documentation/reference/commands.html)
  echo "$window" | grep -qi "docs-sync\|docs pair"
  line2=$(grep -n "sync knowledge base post-merge" documentation/reference/commands.html | cut -d: -f1)
  if [ -z "$line2" ]; then echo "FAIL: /relay-approve Output dd not found"; exit 1; fi
  window2=$(sed -n "${line2},$((line2+6))p" documentation/reference/commands.html)
  echo "$window2" | grep -qi "docs_sync"
  echo "PASS: commands.html /relay-implement and /relay-approve sections document docs-sync"
  ```

### Task 12: UPDATE documentation/reference/agents.html — docs-updater/docs-reviewer labels

- **ACTION**: Change `docs-updater`'s `<dt>Invoked by</dt>`
  (`documentation/reference/agents.html:435`) from "`/relay-approve`
  command (post-merge, before `docs-reviewer`)" to include both call
  sites: "`/relay-implement` command (Phase A.3.5, immediately after
  code-review APPROVED, non-interactive) AND `/relay-approve` command
  (post-merge, before `docs-reviewer`, safety-net pass)". Adjust the
  Responsibility `<dd>` (line 436) opening "Pillar 3 WRITER." to "WRITER,
  dispatched twice — Pillar 2 (implement-time, primary sync) and Pillar 3
  (approve-time, safety net)." Apply the symmetric edits to
  `docs-reviewer` (lines 445-446).
- **MIRROR**: Pattern 15 (`documentation/reference/agents.html:430-438,
  440-448`).
- **AC**: AC-A6 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  line=$(grep -n 'h3 id="docs-updater"' documentation/reference/agents.html | cut -d: -f1)
  window=$(sed -n "${line},$((line+15))p" documentation/reference/agents.html)
  echo "$window" | grep -q "relay-implement"
  line2=$(grep -n 'h3 id="docs-reviewer"' documentation/reference/agents.html | cut -d: -f1)
  window2=$(sed -n "${line2},$((line2+15))p" documentation/reference/agents.html)
  echo "$window2" | grep -q "relay-implement"
  echo "PASS: agents.html docs-updater and docs-reviewer sections document the implement-time dispatch"
  ```

### Task 13: UPDATE documentation/assets/data/search-index.json — pillars.html + agents.html excerpts

- **ACTION**: Update the `pillars.html` entry's `excerpt` field (currently
  including "Approval (merge and docs update)" with no Pillar-2 mention)
  to reflect Task 8's edit. Update the `agents.html` entry's `excerpt`
  field (currently "docs-updater (Pillar 3 writer, v0.17.0), docs-reviewer
  (Pillar 3 reviewer, v0.17.0)") to reflect Task 12's dual-dispatch
  relabel. Keep valid JSON; do not alter `title`, `path`, or `category`
  fields.
- **MIRROR**: Pattern 16 (`documentation/assets/data/search-index.json:21-102`).
- **AC**: AC-A6 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node -e "JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8'))"
  if grep -q "Pillar 3 writer, v0.17.0" documentation/assets/data/search-index.json; then
    echo "FAIL: search-index.json agents.html excerpt still labels docs-updater Pillar-3-only"; exit 1
  fi
  echo "PASS: search-index.json is valid JSON and no longer labels docs-updater Pillar-3-only"
  ```

### Task 14: UPDATE documentation/changelog.html — cut release 0.22.0

- **ACTION**: Rename the current empty `<h2 id="unreleased">Unreleased</h2>`
  block (`documentation/changelog.html:31`) is preserved as-is; instead,
  insert a new `<h2 id="v0-22-0">0.22.0 &#8212; 2026-07-16</h2>` release
  block immediately below it, with: a one-paragraph summary (docs-sync now
  described as occurring during implementation with approve retained as a
  safety net; fixes stale "Pillar 3 is planned" content in `pillars.html`,
  `interactivity-boundary.html`, `roadmap/status.html`, and the nonexistent
  `/approve-implementation` command name in `flows.md` and
  `integrations.md`; plugin manifest bumped `0.21.0` → `0.22.0` per §7.5),
  a `Changed` `<h3>`/`<ul>` block listing every touched `docs/` and
  `documentation/` file, and the mandatory plugin-manifest-bump `<li>`
  using the exact wording from `documentation/AGENTS.md` §7.5's own
  example. A fresh `Unreleased` block is NOT re-added (the existing one at
  line 31 already serves that role going forward — do not duplicate the
  heading).
- **MIRROR**: Pattern 17 (`documentation/changelog.html:33-47`, `0.21.0`
  release-block structure).
- **AC**: AC-A7 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q 'id="v0-22-0"' documentation/changelog.html
  grep -q 'id="unreleased"' documentation/changelog.html
  line=$(grep -n 'id="v0-22-0"' documentation/changelog.html | cut -d: -f1)
  window=$(sed -n "${line},$((line+10))p" documentation/changelog.html)
  echo "$window" | grep -qi "0.22.0"
  echo "PASS: changelog.html 0.22.0 release block present alongside the existing Unreleased block"
  ```

### Task 15: UPDATE plugins/relay/.claude-plugin/plugin.json — version bump

- **ACTION**: Change `"version": "0.21.0"` to `"version": "0.22.0"`, in
  the same change as the changelog cut (Task 14), per
  `documentation/AGENTS.md` §7.5's binding minor-bump rule ("new
  descriptive content" — a materially rewritten Pillar 2/3 story counts
  as a minor doc-content change, not a patch typo fix).
- **MIRROR**: Pattern 18 (`plugins/relay/.claude-plugin/plugin.json:1-9`)
  and `documentation/AGENTS.md:344-347` (§7.5 "Minor bump in changelog →
  bump plugin.json to the same version, same commit. Always.").
- **AC**: AC-A7 (PRD AC-7)
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q '"version": "0.22.0"' plugins/relay/.claude-plugin/plugin.json
  echo "PASS: plugin.json version bumped to 0.22.0"
  ```

## Validation Commands

**Level 1 STATIC_ANALYSIS**
```bash
npm run validate
```
Runs the repo's registered check suite (frontmatter-schema,
dispatch-graph, path-existence, artifact-naming, `plugin.json`/
`changelog.html` version parity — `scripts/validate/index.mjs:36-45`)
against every file this phase touches. The runner sets
`process.exitCode = 1` on any violation and runs all checks with no
short-circuit — real exit-code semantics, no `echo`-masking needed. This
check is especially load-bearing for this phase: it is the repo's own
automated `plugin.json`/`changelog.html` version-parity gate, directly
exercising Tasks 14/15's contract.

**Level 2 CONTENT_INVARIANTS**
```bash
set -euo pipefail
if grep -rq --exclude-dir=planning --exclude=changelog.html "approve-implementation" docs/ documentation/; then
  echo "FAIL: stale /approve-implementation command name still present somewhere under docs/ or documentation/ (excluding docs/planning/'s frozen historical artifacts and documentation/changelog.html's descriptive release-note prose, both scope-excluded by this plan's ## NOT Building section)"
  exit 1
fi
if grep -q "Pillar 3 is planned" documentation/concepts/pillars.html; then
  echo "FAIL: pillars.html still asserts Pillar 3 is planned"
  exit 1
fi
grep -q "^## \[2026-07-16\]" docs/decisions.md
grep -q "docs-sync" docs/context/architecture.md
grep -qi "docs-sync\|docs pair" docs/api-reference.md
node -e "JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8'))"
echo "PASS: no stale /approve-implementation references remain; no stale 'Pillar 3 is planned' callout remains; decisions.md entry present; architecture.md and api-reference.md document docs-sync; search-index.json is valid JSON"
```

**Level 3 INTEGRATION (dry-run cross-file consistency check)**
```bash
set -euo pipefail
pv=$(grep -o '"version": "[0-9.]*"' plugins/relay/.claude-plugin/plugin.json | grep -o '[0-9.]*')
if [ "$pv" != "0.22.0" ]; then
  echo "FAIL: plugin.json version is $pv, expected 0.22.0"
  exit 1
fi
if ! grep -q 'id="v0-22-0"' documentation/changelog.html; then
  echo "FAIL: changelog.html has no 0.22.0 release block matching plugin.json version $pv"
  exit 1
fi
for f in documentation/concepts/pillars.html documentation/reference/commands.html documentation/reference/agents.html documentation/concepts/interactivity-boundary.html documentation/roadmap/status.html; do
  grep -q '<header class="topbar">' "$f"
  grep -q '<aside class="sidebar">' "$f"
  grep -q '<aside class="toc">' "$f"
done
echo "PASS: plugin.json/changelog.html version parity holds; every edited site page retains required template structure"
```
This level proves the two properties Tasks 14/15 exist to guarantee
(version parity) plus a structural regression guard (the AGENTS.md §4
template skeleton — header/sidebar/toc placeholders — was not
accidentally broken by any of the five edited `documentation/` pages).

## Acceptance Criteria

- **AC-A1 (PRD AC-7):** `docs/context/architecture.md`'s "Three-pillar
  target architecture" section describes docs-sync as occurring during
  implementation (Pillar 2, before the D8 mutations, gated by
  `docs_sync`/`--no-docs`), with Pillar 3's docs cycle described as a
  safety-net reconciliation pass.
- **AC-A2 (PRD AC-7):** `docs/api-reference.md`'s `/relay-implement` row,
  `/relay-approve` row, `docs-updater` row, and `docs-reviewer` row all
  describe the dual dispatch (implement-time primary + approve-time
  safety net), and the Happy-path prose no longer implies docs-sync
  happens only at merge.
- **AC-A3 (PRD AC-7):** `docs/domain/flows.md`'s Implementation flow
  includes the docs-sync step and its Approval-flow section no longer
  names the nonexistent `/approve-implementation` command;
  `docs/context/integrations.md`'s `gh` entry is corrected the same way.
- **AC-A4 (PRD AC-7):** `docs/decisions.md` carries a new `[2026-07-16]`
  entry recording both conscious refinements from the PRD's Decisions
  Log, appended without disturbing any prior entry (verified via a
  duplicate/removal count check on the file's first entry).
- **AC-A5 (PRD AC-7):** `docs/KNOWLEDGE_BASE.md`'s
  `docs/context/architecture.md` index entry reflects the docs-sync
  framing.
- **AC-A6 (PRD AC-7):** The `documentation/` site (`pillars.html` status
  callout + agents bullet, `interactivity-boundary.html`,
  `roadmap/status.html`, `commands.html`, `agents.html`, and the
  `search-index.json` excerpts for both edited pages) all describe the
  new dual-dispatch model, with no page still asserting "Pillar 3 is
  planned".
- **AC-A7 (PRD AC-7):** `documentation/changelog.html` carries a new
  release entry (`0.22.0`) documenting this phase's doc/site updates, and
  `plugins/relay/.claude-plugin/plugin.json`'s version is bumped
  `0.21.0` → `0.22.0` in the same change, per `documentation/AGENTS.md`
  §7.5.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Documentation edits describe Phase 1-3's shipped behavior inaccurately (drift between this phase's prose and the actual `relay-implement.md`/`relay-approve.md` code) | M | M | Every prose edit is grounded in direct `Read` of the actual shipped sections (`Phase A.3.5`, `Phase 3: DOCS CYCLE`) confirmed via this plan's Mandatory Reading and the Phase 2/3 completed plans' own Patterns-to-Mirror citations, not invented |
| A `documentation/` site edit violates an `AGENTS.md` invariant (new CSS/JS, inline styles, emojis, broken template skeleton) | L | M | All site edits reuse existing `callout`/`kv`/list components per `AGENTS.md` §5; no new page is created so §6.1/§6.2 registration does not apply; Level 3 VALIDATE re-checks the header/sidebar/toc skeleton on every edited page |
| `plugin.json` version bump forgotten, mismatched with the changelog, or applied without the changelog cut in the same change | L | M | Task 15 is explicitly sequenced after Task 14; Level 3 VALIDATE cross-checks `plugin.json`'s version against `changelog.html`'s `id="v0-22-0"` release heading; `npm run validate` (Level 1) independently re-checks the same parity per the repo's own validation suite |
| Scope creep beyond the PRD's explicit item list (Tasks 5, 9, 10, 13 were added from `research-codebase` grounding, not the PRD's literal enumeration) makes the phase harder to review | L | L | Each addition is traced to a real `path:line` finding from this plan's GROUNDING pass and is explicitly justified in `## Files to Change` as "surfaced by grounding" — consistent with the PRD's own Should-item "Fix pre-existing stale Pillar-3 content ... Opportunistic drift correction surfaced by grounding" |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
when a test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored.

`test_frameworks: ["node:test"]` is declared, so the test pair is active
in test-after mode in general — but this phase's `phase_type: docs`
(explicitly directed for this phase; Phase 1's own completed plan already
noted "Phase 4 is the docs phase" when explaining why Phase 1 itself was
`scaffold`, not `docs`). Every file this phase touches is `docs/`
knowledge-base prose or `documentation/` HTML site content — none of it
is application source under `node:test`. This phase's Step-by-Step Tasks
intentionally create zero `.test.mjs` files; the Implementer authors ZERO
test files here (R-X strict, `docs/decisions.md` [2026-05-06],
[2026-07-10]), and `phase_type: docs` is exempt from
`R-COH-VALIDATE-VALIDATE-FRAMEWORK-MISMATCH` for the same reason Phase 1
was exempt as `scaffold`: the VALIDATE commands are grep/JSON-parse/HTML-structure
probes with real exit-code semantics, not framework test invocations —
the correct idiom for a pure-prose deliverable.

**Scope note (opportunistic additions beyond the orchestrator's literal
item list).** The dispatching orchestrator's Phase 4 scope enumerated
six items (a-f) naming `docs/context/architecture.md`, `docs/api-reference.md`,
`docs/domain/flows.md`, `docs/KNOWLEDGE_BASE.md`, a new `docs/decisions.md`
entry, and "the relevant [documentation/] pages (likely
`concepts/pillars.html`... `reference/commands.html`...
`reference/agents.html`...)" — using "likely" to signal examples, not an
exhaustive list. This plan's mandatory GROUNDING pass (`research-codebase`,
dispatched per protocol) surfaced four additional stale-content locations
in the same family (`docs/context/integrations.md`,
`documentation/concepts/interactivity-boundary.html`,
`documentation/roadmap/status.html`,
`documentation/assets/data/search-index.json`), all citing real
`path:line` evidence. These are included as Tasks 5, 9, 10, 13,
consistent with the PRD's own Should-item: "Fix pre-existing stale
Pillar-3 content (`pillars.html` "planned"; `flows.md` naming a
nonexistent `/approve-implementation`) — Opportunistic drift correction
surfaced by grounding" (PRD Solution Detail, MoSCoW table). Two further
matches (`docs/planning/dev_process_improvement_plan.html`,
`documentation/roadmap/test-runner-prd.html`) were deliberately excluded
as frozen historical/planning snapshots — see `## NOT Building`.

**Grounding for this plan** was performed via direct `Read` of every
target file's current on-disk content (`docs/context/architecture.md`,
`docs/api-reference.md`, `docs/domain/flows.md`, `docs/KNOWLEDGE_BASE.md`,
`docs/decisions.md`, `documentation/AGENTS.md`,
`documentation/concepts/pillars.html`, `documentation/changelog.html`,
`plugins/relay/.claude-plugin/plugin.json`, and the three completed Phase
1-3 plans for exact shipped-behavior citations), plus a parallel
dispatch of `research-codebase` and `research-web` per the standard
GROUNDING protocol. `research-codebase` independently confirmed the
`docs/decisions.md` entry template and `docs/KNOWLEDGE_BASE.md` index
format, and surfaced the four additional stale-content locations noted
above (with `path:line` evidence) plus two flagged-but-excluded frozen
planning documents. `research-web` found no docs-as-code-specific term of
art for "inline sync becomes primary, post-merge reconciliation becomes a
safety net" (the general cross-domain analogy is "shift left," per
https://contextqa.com/blog/shift-left-or-shift-right-testing/) and no
settled Keep a Changelog convention for internal-only architecture
changes (https://keepachangelog.com/en/1.1.0/;
https://github.com/olivierlacan/keep-a-changelog/issues/30 — an
unadopted "Public"/"Internal" section proposal); both are treated as
directional, not blocking — Task 14 follows relay's own established
`changelog.html` precedent (a `Changed` block) rather than inventing a
new section.

*Generated: 2026-07-16*
*Approved: 2026-07-16*
*Implemented: 2026-07-16*
*Status: IMPLEMENTED*
