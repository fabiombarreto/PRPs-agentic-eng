# Feature: Tighten two plan-writer self-check items (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of a shipped plugin asset consumed by every installed user (`plugins/relay/agents/plan-writer.md`); amendment of two governance records (`docs/decisions.md`, `docs/context/constraints.md`); a change whose wording is mechanically gated by an existing `npm run validate` check
- Decisions found:
  - [2026-07-30] Writer pre-emission self-checks: items state artifact properties and NEVER restate the reviewer's rubric wording, because visible grader text measurably invites literal compliance over real quality; rubric ids are permitted only in the front-running prose. This plan operates strictly inside that rule — it makes item 1 name an ARTIFACT token (`AC-A<i>`, part of the plan's own vocabulary), never a rubric id.
  - [2026-07-12] Validation suite: the relay repo declares `test_frameworks: ["node:test"]` with `tdd: false`; checker unit tests come from the test pair and the Implementer authors ZERO test files (R-X strict).
  - [2026-04-30] Plugin manifest version bumps in lock-step with a dated `changelog.html` entry whenever a patch ships a plugin asset (`documentation/AGENTS.md` §7.5). This change DOES ship one, so the bump is mandatory — unlike the last several changes in this initiative, which lived outside `plugins/relay/`.
- Applicable anti-patterns:
  - Weakening a gate to make a check stop firing (`docs/anti-patterns.md`) — the new wording must satisfy `feedback-chain` on its merits, never by relaxing the check.
  - Treating `plugins/prp-core/` as active relay code — untouched here.
  - Writing pipeline artifacts under `.claude/` — this plan writes only under `PRPs/plans/`, `plugins/relay/`, `docs/`, and `documentation/`.
- Applicable architectural rules:
  - The `feedback-chain` check's `SELF_CHECKS` contract: the Step 4.4.ter block must keep its front-running framing sentence, must sit before Step 4.5, and no ITEM line (one opening with a number-dot or a dash) may contain a rubric identifier matching `/R-[A-Z][A-Z-]+/`.
  - `documentation/AGENTS.md` §2 invariants and §7.4 (every `documentation/` change carries a changelog entry).
  - Interactivity boundary: `plan-writer` runs autonomously; the self-check is a self-detected-defect loop, never a user prompt.
- Result: PROCEED
```

## Source

Tighten two items of the plan-writer pre-emission self-check (Step 4.4.ter in plugins/relay/agents/plan-writer.md) so they front-run the two defect classes that a 370-artifact cross-project measurement shows are now dominant. Repo root for ALL reads and writes is the absolute path C:\repos\PRPs-agentic-eng (NOT any worktree under .claude/worktrees/) — resolve every relative path against that root. MEASUREMENT THAT MOTIVATES THIS, do not re-derive it: a 2026-08-05 aggregation over PRPs/plans/*.jsonl from six repositories (this one plus C:\repos\inplay, C:\repos\assistente-pessoal, C:\repos\super-ensino\spe-cms, C:\repos\super-ensino\spe-services, C:\repos\super-ensino\spe-interaction-services) covering 370 artifacts and 630 review runs found that after wave 2 went live (install flipped to 0.24.0 at 2026-07-31T14:20:37Z) R-COH-TASK-AC-MISSING rose from 16.7% to 36.4% of plan-review artifacts, and R-COH-OTHER-INTERNAL-CONTRADICTION became the single top failure everywhere with 37 recorded occurrences. Neither is adequately front-run by the current four items. DELIVERABLE 1 — item 1 names the token. Today item 1 reads "Tasks and acceptance criteria cover each other both ways — no task satisfying nothing, no criterion nothing delivers." That states the concept but never says how the property is made visible, and the reviewer checks it by grepping each task body for a LITERAL AC-A<i> or AC-<N> token (see plan-reviewer.md's R-COH-TASK-AC-MISSING section around lines 343-352, which parses ### Task <i> headings and greps the body, failing any task with zero AC references and no explicit infrastructure/scaffolding annotation). A plan can satisfy item 1 as written and still fail, which is exactly what happened repeatedly. Reword item 1 so it requires each task body to name, literally, the AC-A<i> item it delivers — or to carry an explicit infrastructure/scaffolding annotation when it genuinely delivers no criterion — while keeping the existing both-ways coverage requirement. DELIVERABLE 2 — item 2 is too narrowly scoped. Today it reads "No two sections contradict — ## Summary, ## Metadata and ## Files to Change must agree with the task list on the file set, the counts, and the approach." The real recorded contradictions are mostly a different shape: prose that DESCRIBES another part of the plan disagreeing with that part. Representative real failures from the corpus, use these to ground the wording: a task ACTION saying counts are out of scope while that same task's own VALIDATE greps for the count; a Level block's own post-block prose claiming the block passes on the unmodified tree while two of its own grep lines cannot; a ## NOT Building entry excluding behavior that a task then implements; ## Notes asserting a file appears in no ### Task while another Notes sentence names the task it appears in; a ## Mandatory Reading row's Why describing content the cited file does not contain; ## Risks and Mitigations stating as verified fact something the tasks contradict; and a ## Source section quoting a source PRD row verbatim where the quote has drifted from the real text. Widen item 2 to cover self-descriptive claims generally — any sentence asserting what another part of this plan says, does, or contains must match that part, and any quotation presented as verbatim must match its source character-for-character — while keeping the existing Summary/Metadata/Files-to-Change agreement requirement rather than replacing it. HARD CONSTRAINT, binding and enforced mechanically: docs/decisions.md [2026-07-30] rules that self-check ITEMS state artifact properties and NEVER restate the reviewer's rubric wording, because visible grader text invites literal compliance over real quality; rubric ids are allowed only in the surrounding front-running prose, never in an item line. This is gated by scripts/validate/checks/feedback-chain.mjs, whose SELF_CHECKS registry slices the Step 4.4.ter block and fails any ITEM_LINE (a line starting with a number-dot or a dash) containing a RUBRIC_TOKEN matching /R-[A-Z][A-Z-]+/. I verified that the string AC-A1 does NOT match that pattern, so naming AC-A<i> in an item line is compliant, but any phrase like R-X strict or R-COH-anything in an item line would break the gate. The block must also keep its front-run framing sentence, and plan-writer's self-check must stay positioned before Step 4.5 — both are separately asserted by that same check. This ships a plugin asset under plugins/relay/, so documentation/AGENTS.md section 7.5 requires bumping plugins/relay/.claude-plugin/plugin.json in lock-step with a dated entry in documentation/changelog.html in the same commit; the plugin is currently at 0.28.0. Any change to scripts/validate/checks/feedback-chain.test.mjs is test-pair work under R-X strict — the Implementer authors zero test files per docs/decisions.md [2026-07-12] and [2026-05-06] — so plan it as test-pair authoring, never as an Implementer task. Finally, record the measurement and the resulting decision in docs/decisions.md, and note in docs/context/constraints.md that the relay repo is not a representative sample for pipeline metrics because a complexity confound was tested and refuted (relay's post-wave-2 plans are smaller by task median 8 to 5 yet need more review runs 1.6 to 2.8, while external plans grew 6 to 8 and need fewer 2.0 to 1.8, with Pearson r between task count and review runs of 0.089 across 46 clean artifacts).

## Summary

Wave 2 gave `plan-writer` a four-item pre-emission self-check. A 370-artifact measurement across six repositories now shows two of those items are worded in a way that lets a plan satisfy them and still be rejected. Item 1 states the coverage concept without saying how the property becomes visible, while the reviewer greps each task body for a literal `AC-A<i>` token — so the check passes on plans that then fail, and that failure class rose from 16.7% to 36.4% of plan-review artifacts after wave 2 shipped. Item 2 scopes contradiction-hunting to three named sections agreeing with the task list, while the 37 recorded contradictions are mostly a different shape: a sentence describing another part of the plan that disagrees with that part.

This plan rewords both items in place, keeping every existing requirement and adding the missing precision. It touches no reviewer file, no rubric, and no budget. The wording is constrained by an already-shipped gate: `feedback-chain` slices this exact block and fails any item line carrying a rubric identifier, so the fix must express artifact properties in the plan's own vocabulary — which `AC-A<i>` is, and which rubric ids are not. Because a plugin asset ships, the manifest and changelog move in lock-step.

## User Story

As a developer whose plans keep getting rejected for a defect the self-check claimed to cover,
I want the two items to name the property precisely enough that satisfying them actually predicts passing review,
So that the pre-emission check stops being advisory prose and starts front-running the two failure classes that measurably dominate rework.

## Problem Statement

`plan-writer`'s self-check exists to catch defects before emission, front-running the reviewer. For two of its four items that promise is not kept.

Item 1 says tasks and acceptance criteria must "cover each other both ways". A plan-writer can read that, satisfy it conceptually — every task genuinely delivers something, every criterion is genuinely delivered — and still be rejected, because the reviewer resolves the same property by grepping each `### Task <i>` body for a literal `AC-A<i>` or `AC-<N>` token and failing any task carrying neither that token nor an explicit infrastructure annotation. The item describes the intent and omits the observable. Post-wave-2 that class rose from 16.7% to 36.4% of plan-review artifacts.

Item 2 says no two sections contradict, then narrows to `## Summary`, `## Metadata` and `## Files to Change` agreeing with the task list on files, counts and approach. The 37 recorded contradictions are mostly outside that frame: a task's own ACTION disagreeing with its own VALIDATE, a Level block's prose claiming a pass its own commands cannot produce, a `## NOT Building` entry excluding what a task implements, a `## Mandatory Reading` Why describing content the cited file lacks, a `## Risks` row asserting as verified fact something the tasks contradict, and a `## Source` quote presented as verbatim that has drifted from its origin. What unites them is not "two sections disagree" but "a self-descriptive claim is false".

## Solution Statement

Reword item 1 to require what the reviewer actually resolves: each task body names, literally, the `AC-A<i>` item it delivers, or carries an explicit infrastructure/scaffolding annotation when it genuinely delivers no criterion — with the existing both-ways coverage requirement preserved rather than replaced.

Reword item 2 to generalize from section-pair agreement to self-descriptive accuracy: any sentence asserting what another part of the plan says, does, or contains must match that part, and any quotation presented as verbatim must match its source character-for-character — again preserving the existing Summary / Metadata / Files-to-Change requirement as a named instance rather than dropping it.

Both rewordings stay inside the [2026-07-30] rule by expressing artifact properties in the plan's own vocabulary. `AC-A<i>` is a token the plan itself emits; it is not a rubric identifier and does not match the gate's `/R-[A-Z][A-Z-]+/` pattern, which was verified directly against the check before this plan was written.

## Metadata

| Field | Value |
|-------|-------|
| Type | Agent prompt refinement, evidence-driven |
| Complexity | Low — two prose items in one block, plus three record updates and a lock-step release bump |
| Systems Affected | `plugins/relay/agents/plan-writer.md` (the only behavioral change), `plugins/relay/.claude-plugin/plugin.json` + `documentation/changelog.html` (lock-step), `docs/decisions.md`, `docs/context/constraints.md` |
| Dependencies | The `feedback-chain` check is shipped and currently passes; `npm run validate` reports 12/12 |
| Estimated Tasks | 5 Implementer tasks; no test-pair work (see `## NOT Building`) |
| Source | Free-text description (description mode — no source PRD) |
| `phase_type` | `feature` |

`phase_type: feature` rather than `docs`: the `## Files to Change` table contains `plugins/relay/agents/plan-writer.md` and `plugins/relay/.claude-plugin/plugin.json`, which are shipped plugin assets, not documentation. `design_source` and `phase_scope` are absent by rule — `docs/context/methodology.md` declares no `figma_track` key, and description mode has no PRD to declare `visual_first`.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/plan-writer.md` | 1150-1170 | The block being edited: the front-running framing sentence at 1152-1157 that must survive, and the four numbered items at 1159-1170 of which items 1 and 2 are rewritten. |
| P0 | `scripts/validate/checks/feedback-chain.mjs` | 153-193 | The gate that constrains the wording: the `SELF_CHECKS` registry that slices this block, and the `RUBRIC_TOKEN` / `ITEM_LINE` constants at 189-193 that decide which lines may not carry a rubric identifier. |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 343-352 | What item 1 must front-run: the reviewer parses `### Task <i>` headings, greps each body for an `AC-A<i>` / `AC-<N>` token, and fails any task with zero references and no infrastructure annotation. |
| P1 | `docs/decisions.md` | 1254-1319 | The [2026-07-30] entry that binds this wording — items state artifact properties, never the reviewer's rubric wording — and that Task 4 extends with the new measurement. |
| P1 | `documentation/AGENTS.md` | 332-381 | §7.5, the binding lock-step rule: a patch shipping a plugin asset bumps `plugin.json` and adds a dated `changelog.html` entry in the same commit. |
| P1 | `docs/context/constraints.md` | 49-60 | The "Known TODOs / open planning items" section Task 5 appends the not-a-representative-sample note to. |

## Patterns to Mirror

```markdown
# SOURCE: plugins/relay/agents/plan-writer.md:1159-1160
1. **Tasks and acceptance criteria cover each other both ways** —
   no task satisfying nothing, no criterion nothing delivers.
```

The item shape being edited: a bolded property name, an em-dash, then the concrete obligation, wrapped to the file's column width. Task 1 preserves this shape and adds the observable the reviewer resolves.

```markdown
# SOURCE: plugins/relay/agents/plan-writer.md:1161-1163
2. **No two sections contradict** — `## Summary`, `## Metadata` and
   `## Files to Change` must agree with the task list on the file
   set, the counts, and the approach.
```

The second item, whose existing named-section requirement Task 2 keeps as an instance while generalizing the property around it.

```javascript
# SOURCE: scripts/validate/checks/feedback-chain.mjs:189-193
/** A rubric identifier such as `R-COH-TASK-AC-MISSING` or `R-SEM`. */
const RUBRIC_TOKEN = /R-[A-Z][A-Z-]+/;

/** An item line inside a self-check block: numbered, or a dash bullet. */
const ITEM_LINE = /^\s*(?:\d+\.|-)\s/;
```

The two constants that bound the wording. Any line the new items add which begins with a number-dot or a dash must not match `RUBRIC_TOKEN`. Consulted by Tasks 1 and 2; both were checked against this pattern before the wording was chosen.

```html
# SOURCE: documentation/changelog.html:37-41
      <h3 id="v0-28-0-changed">Changed</h3>
      <ul>
        <li><strong>Phase-status lifecycle &mdash; five states, one owner each.</strong>
          Rows now move <code>pending</code> &rarr; <code>in-progress</code> &rarr;
          <code>implemented</code> &rarr; <code>tested</code> &rarr; <code>complete</code>.
```

The changelog release-section shape: an `<h3 id="v<version>-<section>">` using keepachangelog vocabulary, then a `<ul>` whose every `<li>` opens with a bolded subject, an `&mdash;` separator, and prose. HTML entities throughout, never literal em-dashes or arrows. Copied by Task 3 for the new `0.28.1` section.

```markdown
# SOURCE: docs/context/constraints.md:83-85
- **Reviewer non-determinism across attempts.** `plan-reviewer` surfaced two
  disjoint defect classes on two consecutive runs of the same rubric against the
  same plan (attempt 1: task↔AC linkage; attempt 2: verification coverage),
```

The shape of an open-item entry in that section: a bolded title, then the evidence in plain prose. Copied by Task 5 for the not-a-representative-sample note.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/plan-writer.md` | UPDATE | The only behavioral change: items 1 and 2 of the Step 4.4.ter self-check are reworded in place. |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | A plugin asset ships, so AGENTS.md §7.5 requires a version bump from `0.28.0`. |
| `documentation/changelog.html` | UPDATE | The lock-step half of §7.5, plus the §7.4 requirement that every `documentation/` change is logged. The `Unreleased` block currently reads "Nothing yet." |
| `docs/decisions.md` | UPDATE | Records the 370-artifact measurement and the decision it drove — including the decision NOT to revert wave 2. |
| `docs/context/constraints.md` | UPDATE | Records that this repo is not a representative sample for pipeline metrics, with the refuted complexity confound as evidence. |

## NOT Building (Scope Limits)

- **No test-pair work, and this is a verified finding rather than an assumption.** `scripts/validate/checks/feedback-chain.test.mjs` exercises the self-check rules against SYNTHETIC fixtures it defines inline; grepping the corpus for the real item text (`cover each other both ways`, `No two sections contradict`) returns zero hits in every `*.test.mjs`. The only test touching the real file is the real-wrapper assertion that `runFeedbackChainCheck()` returns `ok:true` with zero findings, which keeps passing as long as the new wording satisfies the gate — asserted directly by this plan's Level 2. No `*.test.mjs` is created or edited, so R-X strict is respected by construction.
- **No reverting of wave 2.** The measurement does not support it: the ~35% first-attempt threshold is met by neither the relay repo nor the external projects, and it was originally derived from relay-only data now known to be unrepresentative.
- **No change to `plan-reviewer.md`, any rubric item, or any budget.** This plan moves the writer toward the existing reviewer contract; it does not move the contract.
- **No new self-check item.** Both defect classes map onto existing items 1 and 2; a fifth item would add block length without adding a distinct property, and block length is itself a cost in a prompt read on every emission.
- **No fix for the pre-existing corpus failure.** `figma-visual-first-track-phase6.test.mjs` has one failing assertion that predates this plan: commit `09ad56b` (the v0.28.0 five-state lifecycle) rewrote `relay-execute.md`'s dependency rule from "every comma-separated phase number listed has `Status == complete`" to "…is in a dependency-satisfying state", and that test still greps the old phrase. It is a stale test assertion, is test-pair work under R-X strict, and is unrelated to `plan-writer.md`. This plan's Level 2 is scoped so it neither masks nor inherits that failure.
- **No re-derivation of the measurement.** The numbers in `## Source` were produced by a scratchpad aggregator over six repositories and are recorded as inputs, not re-computed here.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/agents/plan-writer.md` — item 1 names the token

**ACTION**: Delivers **AC-A1** and **AC-A5**. Rewrite item 1 of the Step 4.4.ter self-check in place. It must keep the existing both-ways coverage obligation (no task satisfying nothing, no criterion nothing delivers) AND add the observable the reviewer actually resolves: every `### Task <i>` body names, literally, the `AC-A<i>` item it delivers, or carries an explicit infrastructure/scaffolding annotation when it genuinely delivers no criterion. Preserve the bolded-property-then-em-dash item shape and the file's wrap width. Do not renumber items, do not touch items 3 or 4, and do not alter the front-running framing sentence above the list. The literal string `AC-A<i>` is safe in an item line — it does not match the gate's `/R-[A-Z][A-Z-]+/` pattern — but no rubric identifier may appear in any line starting with a number-dot or a dash.

**MIRROR**: `# SOURCE: plugins/relay/agents/plan-writer.md:1159-1160` — the item shape being edited.

**VALIDATE**:
```bash
set -euo pipefail
block=$(sed -n '/^### Step 4\.4\.ter/,/^### Step 4\.5/p' plugins/relay/agents/plan-writer.md | tr -d '\r')
item1=$(printf '%s' "$block" | sed -n '/^1\./,/^2\./p')
printf '%s' "$item1" | grep -qF 'AC-A<i>' || { echo "FAIL: item 1 does not name the AC-A<i> token literally"; exit 1; }
printf '%s' "$item1" | grep -qiE 'infrastructure|scaffolding' || { echo "FAIL: item 1 drops the no-criterion escape hatch"; exit 1; }
printf '%s' "$item1" | grep -qiE 'both ways|no task|no criterion' || { echo "FAIL: item 1 lost the existing both-ways coverage obligation"; exit 1; }
printf '%s' "$block" | grep -qF 'front-run' || { echo "FAIL: the front-running framing sentence was lost"; exit 1; }
echo "PASS: item 1 names the token, keeps the escape hatch and the coverage obligation"
```

### Task 2: UPDATE `plugins/relay/agents/plan-writer.md` — item 2 covers self-descriptive claims

**ACTION**: Delivers **AC-A2** and **AC-A5**. Rewrite item 2 of the same block in place. It must generalize the property to self-descriptive accuracy — any sentence asserting what another part of this plan says, does, or contains must match that part, and any quotation presented as verbatim must match its source character-for-character — while KEEPING the existing requirement that `## Summary`, `## Metadata` and `## Files to Change` agree with the task list on the file set, the counts and the approach, as a named instance rather than a replacement. Ground the generalization in the recorded shapes: a task's ACTION versus its own VALIDATE, a Level block's prose versus its own commands, `## NOT Building` versus what a task implements, a `## Mandatory Reading` Why versus the cited file, and `## Risks` versus the tasks. Same constraints as Task 1 — no renumbering, no rubric identifier in any item line, framing sentence untouched.

**MIRROR**: `# SOURCE: plugins/relay/agents/plan-writer.md:1161-1163` — the second item, whose named-section requirement is preserved.

**VALIDATE**:
```bash
set -euo pipefail
block=$(sed -n '/^### Step 4\.4\.ter/,/^### Step 4\.5/p' plugins/relay/agents/plan-writer.md | tr -d '\r')
item2=$(printf '%s' "$block" | sed -n '/^2\./,/^3\./p')
printf '%s' "$item2" | grep -qiE 'verbatim' || { echo "FAIL: item 2 does not cover quotations presented as verbatim"; exit 1; }
printf '%s' "$item2" | grep -qiE 'says, does, or contains|describes|asserting what' || { echo "FAIL: item 2 was not generalized to self-descriptive claims"; exit 1; }
printf '%s' "$item2" | grep -qF '## Files to Change' || { echo "FAIL: item 2 dropped the existing named-section requirement"; exit 1; }
n=$(printf '%s' "$block" | grep -cE '^[0-9]+\.')
[ "$n" = "4" ] || { echo "FAIL: the block has $n numbered items, expected 4 (no item was added or renumbered)"; exit 1; }
echo "PASS: item 2 generalized, named sections kept, still 4 items"
```

### Task 3: UPDATE `plugins/relay/.claude-plugin/plugin.json` and `documentation/changelog.html` — lock-step release

**ACTION**: Delivers **AC-A3**. Bump `plugins/relay/.claude-plugin/plugin.json`'s `version` from `0.28.0` to `0.28.1` — a patch, because the change is a wording refinement to one agent prompt with no new command, agent, or capability — and in the SAME commit replace `documentation/changelog.html`'s `Unreleased` placeholder (`<p><em>Nothing yet.</em></p>`) with a dated `0.28.1` release section carrying a `Changed` subsection. The entry must name `plan-writer.md`, state which two items changed and why, and cite the measurement that motivated it. This file uses `&mdash;` / `&#8212;` entities rather than literal em-dashes, and no emojis are permitted.

**MIRROR**: `# SOURCE: documentation/changelog.html:37-41` — the release-section shape this new `0.28.1` section copies.

**VALIDATE**:
```bash
set -euo pipefail
v=$(node -e 'process.stdout.write(require("./plugins/relay/.claude-plugin/plugin.json").version)')
[ "$v" != "0.28.0" ] || { echo "FAIL: plugin.json was not bumped"; exit 1; }
flat=$(tr -d '\r' < documentation/changelog.html | tr '\n' ' ' | tr -s ' ')
printf '%s' "$flat" | grep -qF "<h2 id=\"v$(printf '%s' "$v" | tr '.' '-')\">" || { echo "FAIL: changelog has no heading for $v"; exit 1; }
printf '%s' "$flat" | grep -qF 'plan-writer.md' || { echo "FAIL: changelog entry does not name plan-writer.md"; exit 1; }
if printf '%s' "$flat" | grep -qF 'Nothing yet.'; then echo "FAIL: the Unreleased placeholder survives"; exit 1; fi
node scripts/validate/index.mjs 2>&1 | grep -qE '^\[PASS\] version-parity' || { echo "FAIL: version-parity rejects the manifest/changelog pair"; exit 1; }
echo "PASS: plugin bumped to $v in lock-step with the changelog"
```

### Task 4: UPDATE `docs/decisions.md` — record the measurement and the decision

**ACTION**: Delivers **AC-A4**. Append a dated `[2026-08-05]` entry recording the cross-project measurement and the decision it drove. It must state the corpus size (370 artifacts, 630 runs, six repositories), the boundary used and why (the install flipping to `0.24.0` at `2026-07-31T14:20:37Z`, which is when wave 2 became live for projects that consume the installed plugin), the split result for the relay repo versus external projects, the explicit decision NOT to revert wave 2 with its reason (the threshold is met by neither group and was derived from relay-only data), and the two item rewordings this plan ships as the targeted alternative. Follow the existing entry shape in that file — Context, Decision, Reason, Areas affected.

**MIRROR**: `# SOURCE: docs/context/constraints.md:83-85` — the evidence-then-consequence prose shape shared by both governance records.

**VALIDATE**:
```bash
set -euo pipefail
flat=$(tr -d '\r' < docs/decisions.md | tr '\n' ' ' | tr -s ' ')
printf '%s' "$flat" | grep -qF '370 artifacts' || { echo "FAIL: the corpus size is not recorded"; exit 1; }
printf '%s' "$flat" | grep -qF '2026-07-31T14:20:37' || { echo "FAIL: the measurement boundary is not recorded"; exit 1; }
printf '%s' "$flat" | grep -qiE 'not revert|no revert|against reverting' || { echo "FAIL: the do-not-revert decision is not recorded"; exit 1; }
printf '%s' "$flat" | grep -qF '[2026-08-05]' || { echo "FAIL: the entry is not dated 2026-08-05"; exit 1; }
echo "PASS: measurement and decision recorded"
```

### Task 5: UPDATE `docs/context/constraints.md` — relay is not a representative sample

**ACTION**: Delivers **AC-A6**. Append an entry to the "Known TODOs / open planning items" section recording that this repository is not a representative sample for pipeline metrics, and that the obvious explanation was tested and refuted. State the evidence: relay's post-wave-2 plans are SMALLER by task median (8 to 5) yet need MORE review runs (1.6 to 2.8), while external plans grew (6 to 8) and need fewer (2.0 to 1.8); Pearson r between task count and review runs is 0.089 across 46 clean artifacts. Name the remaining untested hypothesis — relay plans edit the very agents and rubrics that judge them — as a hypothesis, not a finding. Leave the adjacent "Reviewer non-determinism across attempts" item intact and unstruck.

**MIRROR**: `# SOURCE: docs/context/constraints.md:83-85` — the bolded-title-then-evidence shape of an entry in that section.

**VALIDATE**:
```bash
set -euo pipefail
flat=$(tr -d '\r' < docs/context/constraints.md | tr '\n' ' ' | tr -s ' ')
printf '%s' "$flat" | grep -qF '0.089' || { echo "FAIL: the correlation evidence is not recorded"; exit 1; }
printf '%s' "$flat" | grep -qiE 'not a representative sample|unrepresentative' || { echo "FAIL: the not-representative claim is not recorded"; exit 1; }
printf '%s' "$flat" | grep -qF 'Reviewer non-determinism across attempts.' || { echo "FAIL: the adjacent open item was damaged"; exit 1; }
if printf '%s' "$flat" | grep -qE '~~\*\*Reviewer non-determinism'; then echo "FAIL: the adjacent open item was wrongly struck through"; exit 1; fi
echo "PASS: confound recorded, adjacent item intact"
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node -e 'JSON.parse(require("fs").readFileSync("plugins/relay/.claude-plugin/plugin.json","utf8")); console.log("plugin.json parses")'
node -e '
const { readFileSync } = require("fs");
const s = readFileSync("documentation/changelog.html", "utf8");
if (/<style[\s>]/.test(s)) { console.error("FAIL: inline <style> block"); process.exit(1); }
if (/\sstyle="/.test(s)) { console.error("FAIL: inline style attribute"); process.exit(1); }
if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s)) { console.error("FAIL: emoji in changelog"); process.exit(1); }
console.log("AGENTS.md section 2 invariants hold");
'
```

### Level 2 — UNIT_TESTS

```bash
set -euo pipefail
node --test scripts/validate/checks/feedback-chain.test.mjs
node --test scripts/validate/checks/rubric-reconciliation.test.mjs
node --test scripts/validate/checks/dispatch-graph.test.mjs
node --test scripts/validate/checks/frontmatter-schema.test.mjs
node --test scripts/validate/checks/registration-parity.test.mjs
```

`node --test` exits non-zero on any failing test, so the tool's own status propagates and `set -e` fails the block. These five suites are named explicitly rather than globbing the corpus for a reason recorded in `## NOT Building`: one assertion in `figma-visual-first-track-phase6.test.mjs` is already red on the unmodified tree, from the v0.28.0 five-state lifecycle change to `relay-execute.md`, and a whole-corpus gate here would inherit that pre-existing failure and report it as this change's. These five are the suites that actually read `plugins/relay/agents/plan-writer.md`, so they are the ones this change can break. The single-file form is deliberate — passing a directory to `node --test` triggers a `MODULE_NOT_FOUND` resolution failure in this repo.

### Level 3 — INTEGRATION

```bash
set -euo pipefail
npm run validate 2>&1 | tee /dev/stderr | grep -qE '^12 passed, 0 failed'
node -e '
import("./scripts/validate/checks/feedback-chain.mjs").then((m) => {
  const r = m.runFeedbackChainCheck();
  if (!r.ok) { console.error("FAIL: the reworded self-check violates its own gate: " + JSON.stringify(r.findings)); process.exit(1); }
  console.log("PASS: feedback-chain accepts the reworded block");
});
'
```

`npm run validate` must report `12 passed, 0 failed`; it exits non-zero on any failing check. The second block then asserts the specific property this change risks — that the reworded items still satisfy the `SELF_CHECKS` contract — with a message naming the findings rather than a bare non-zero exit, because that is the one failure mode a reviewer would need the detail for.

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode — this plan has no source PRD, so no acceptance criterion carries a `(PRD AC-N)` reference.

- **AC-A1:** Item 1 of the Step 4.4.ter self-check requires each `### Task <i>` body to name the `AC-A<i>` item it delivers literally, or to carry an explicit infrastructure/scaffolding annotation when it delivers no criterion, while still requiring both-ways coverage between tasks and acceptance criteria.
- **AC-A2:** Item 2 requires that any sentence asserting what another part of the plan says, does, or contains match that part, and that any quotation presented as verbatim match its source character-for-character, while still requiring `## Summary`, `## Metadata` and `## Files to Change` to agree with the task list on the file set, the counts and the approach.
- **AC-A3:** `plugins/relay/.claude-plugin/plugin.json` is bumped off `0.28.0` and `documentation/changelog.html` carries a matching dated release section naming `plan-writer.md`, with the `Unreleased` placeholder replaced; the `version-parity` check accepts the pair.
- **AC-A4:** `docs/decisions.md` carries a dated `[2026-08-05]` entry recording the 370-artifact / 630-run six-repository measurement, the `2026-07-31T14:20:37Z` boundary and why it is the right one, the relay-versus-external split, and the explicit decision not to revert wave 2.
- **AC-A5:** The reworded block still satisfies the `feedback-chain` check on its merits: the front-running framing sentence survives, the block still sits before Step 4.5, it still holds exactly four numbered items, and no item line carries a rubric identifier matching `/R-[A-Z][A-Z-]+/`. `npm run validate` reports 12 passed, 0 failed.
- **AC-A6:** `docs/context/constraints.md` records that this repository is not a representative sample for pipeline metrics, with the refuted complexity confound as evidence (task median 8 to 5 against runs 1.6 to 2.8 for relay, 6 to 8 against 2.0 to 1.8 externally, Pearson r 0.089 over 46 artifacts), naming the self-reference hypothesis as untested; the adjacent reviewer-non-determinism item is left intact and unstruck.
- **AC-A7:** No file matching a test glob is created or modified, and the five suites that read `plan-writer.md` stay green. This criterion is delivered by construction rather than by a task — `## Files to Change` contains no test path, so no task can touch one — and is verified by `## Validation Commands` Level 2, which runs exactly those five suites. It is deliberately not attached to a `### Task <i>`; inventing a task to own a negative property would be the AC-task coupling this plan's own item-1 reword exists to make honest, not to game.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The reworded items quote a rubric identifier in an item line, breaking the very gate that guards this block | Medium | High — `npm run validate` goes red and the change cannot ship | Both task ACTIONs state the constraint explicitly; Level 3 asserts `runFeedbackChainCheck()` returns `ok:true` with the findings printed on failure. The pattern was verified against the check before the wording was chosen: `AC-A1` does not match `/R-[A-Z][A-Z-]+/`. |
| A reworded item silently drops an obligation the current wording carries, weakening the check while appearing to strengthen it | Medium | High — a regression disguised as an improvement | Task 1 and Task 2 VALIDATE each assert the PRE-EXISTING clause survives (`both ways` / no-task / no-criterion for item 1; `## Files to Change` for item 2) in addition to the new property. |
| Level 2 inherits the pre-existing `figma-visual-first-track-phase6` failure and reports it as this change's | High if the corpus is globbed | Medium — a false rejection burning a review cycle | Level 2 names the five suites that actually read `plan-writer.md` instead of globbing; the pre-existing failure and its cause (commit `09ad56b`) are documented in `## NOT Building` so the scoping reads as a decision rather than an omission. |
| The item-1 wording invites literal token-stuffing — a task naming an AC it does not really deliver, just to satisfy the grep | Medium | Medium — the metric improves while quality does not | The wording keeps the both-ways coverage obligation as the primary requirement, with the token as how it is made visible rather than as the requirement itself, and preserves the infrastructure annotation as the honest escape hatch for a task that genuinely delivers no criterion. |
| The measurement motivating this change is itself misread — small post-boundary samples per project | Medium | Medium — effort spent on the wrong item | The decision this plan records is deliberately narrow: it does NOT revert wave 2 and does NOT claim the reword will fix the rate. It states the observed rise in one specific, mechanically-checked class and closes a precision gap that is defensible on its own terms. |
| `research-codebase` / `research-web` returned no findings — grounding was done by direct reads | n/a | Low | Documented in `## Notes`; every `# SOURCE:` anchor cites a real, verified `file:line` read in full before citation. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Why this ships no test-pair work, verified rather than assumed.** A framework IS declared, so the test pair would normally follow. It does not here because there is nothing for it to author: the `feedback-chain` suite exercises the self-check rules against synthetic fixtures it defines inline, and grepping every `*.test.mjs` for the real item text (`cover each other both ways`, `No two sections contradict`) returns zero hits. The only test that reads the real file asserts `runFeedbackChainCheck()` is `ok:true` with zero findings, which this plan's Level 3 asserts directly. Adding a test that pinned the new item wording verbatim would couple the corpus to prose that is expected to keep evolving, which is the coupling the synthetic-fixture design deliberately avoids.

**A pre-existing corpus failure this plan does not own.** On the unmodified tree, `node --test scripts/validate/checks/*.test.mjs` reports 522 tests with 1 failing: `figma-visual-first-track-phase6.test.mjs`'s document-order assertion. Commit `09ad56b` (the v0.28.0 five-state lifecycle) rewrote `relay-execute.md`'s dependency rule from "every comma-separated phase number listed has `Status == complete`" to "…is in a dependency-satisfying state", so the test's `indexOf` for the old phrase returns -1 and the ordering check fails. `npm run validate` does not run the `node:test` corpus, which is why a release shipped red. It is stale test-assertion work under R-X strict, unrelated to `plan-writer.md`, and deliberately out of scope — see `## NOT Building`.

**Grounding was performed by direct reads, not research subagents.** Phase 2 GROUNDING dispatched neither `research-codebase` nor `research-web`. The work is entirely internal and has no external-pattern component, so `research-web` would return a `degradation_reason` by construction; the block being edited, the gate constraining it, and the reviewer section it must front-run were each read in full before authoring.

**Every VALIDATE command in this plan was executed against the unmodified tree before the plan was written.** All five task blocks exit non-zero today. The item-1 and item-2 slicers were additionally verified in the positive direction — they match the CURRENT text of their respective items — so neither is an always-fail grep. The gate was verified to pass today (`runFeedbackChainCheck()` returns `ok:true`, zero findings), and a simulated violation — injecting a rubric identifier into item 1's line — was confirmed to make it fail with the expected message, so Level 3 is a real gate in both directions. The tree is CRLF, so every command matching a phrase that spans a line break normalizes with `tr -d '\r'` first.

**Why a patch bump rather than a minor.** AGENTS.md §7.5 requires the bump because a plugin asset ships; the patch level is the honest one because no command, agent, capability, or contract is added — two prose items are made more precise. The four-item count is unchanged, which Task 2's VALIDATE asserts.

*Generated: 2026-08-05*
*Approved: 2026-08-05*
*Status: IMPLEMENTED*
