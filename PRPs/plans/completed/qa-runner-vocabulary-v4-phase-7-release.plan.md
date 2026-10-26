# Feature: Release (Phase 7 of qa-runner-vocabulary-v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); release cut (plugin manifest version lock-step with the changelog, the binding `documentation/AGENTS.md` contract for every `documentation/` edit); registration of a decision entry (`docs/decisions.md` mirrored mechanically into `documentation/governance/decisions.html` by the `decisions-mirror` check); impact on shared contracts (the `/relay-qa-run` command document is read by the `qa-run-contract` check, which runs every marked step example through `validateStep` and compares the reason-code table with `REASON_CATALOGUE`; `version-parity`, `registration-parity`, `decisions-mirror`, `path-existence`, `line-endings`, `auth-secrecy`); a phase whose last clause (the install) cannot be performed by the autonomous loop
- Decisions found:
  - [2026-04-30] "Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html": a minor changelog release bumps `plugins/relay/.claude-plugin/plugin.json` to the same value in the same commit (`documentation/AGENTS.md` section 7.5)
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute` never commits, pushes or opens a PR, so the install (which needs the work committed and merged) is operator-owned
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3, entry 106): the model for the new entry; items 2, 6, 7 and 11 are the boundaries v4 keeps (executed product defects, report-word locators, writes only for dedicated roles, environment signals outside the catalogue)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, a pass is evidence and not approval, the local-only guard is permanent
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons are fixed sentences, never page text or an error message
  - [2026-07-09] every `## Validation Commands` entry and per-task `VALIDATE` carries real exit-code semantics; [2026-07-10] R-X strict: the Implementer authors zero test files and test edits go through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - `PRPs/prds/qa-runner-vocabulary-v4.prd.md` "What We're NOT Building" (no planner selectors, no forced actions, no `uncertain` change, frozen reference reports) and Decisions Log
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the command document and the pages describe causes as closed words and reasons as fixed sentences, and never relax a redaction rule
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": the install is never performed by the loop, so no task here runs it
  - "Weakening or deleting tests to make the auto-correction loop turn green": a test made stale by this phase is routed to the test pair as `EXISTING_TEST_UPDATED`, never edited by the Implementer
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic": the documentation says overlay handlers are declared by the project, never inferred
- Applicable architectural rules:
  - `documentation/AGENTS.md` is binding: no build step, no new CSS or JS file, no inline `style`, no emoji, relative paths only, the canonical page template, the three-file registration rule (not triggered: no page is added), the section 7.5 lock-step, and every `documentation/` change carries a changelog entry
  - Command versus script separation: the command document describes what the script already does; this phase changes script behavior nowhere (one fixed sentence is reworded)
  - Interactivity boundary: no new extension
  - PRP artifact paths: this plan and every artifact path resolve under `PRPs/`
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form with the phase-6 end-state tree object recorded by Task 1, never HEAD-relative and never `<tree>..HEAD`
  - `npm run validate` keeps its 28 checks
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-vocabulary-v4.prd.md` — Implementation Phases row 7: "Release" — Goal: ship v4 as an installable release — Success signal: AC-15, AC-17 and AC-18 hold.

The install clause is operator-owned. PRD AC-18 ends with "and the new version is installed". `/relay-execute` never commits, pushes, opens a PR or installs (`docs/decisions.md` 2026-05-18), and the install needs the work committed and merged, so this plan delivers a release-ready tree and states the install as ordered operator steps in `## Notes`. No acceptance criterion below claims that the install happened.

## Summary

Cut the 0.48.0 release that ships phases 1 to 6 of `qa-runner-vocabulary-v4` and document them where the planner and the reader look. `plugins/relay/commands/relay-qa-run.md` (which today says nothing about v4) gains a literal flat, marker-preceded example for `pattern`, `within.anchor_text`, a role-only presence assertion and `effect: "validation"`, an unmarked declaration example for `overlay_handlers` (the way `channel_sources` is shown, because a seed declaration is not a step), the rules for per-step grounding gaps and interaction truncation, closed `STEP_NOT_PERFORMABLE` causes and the absent-element `fail`, assertion continuation, the validation-submit gates and overlay handlers, and a run-time codes table that documents `STEP_NOT_PERFORMABLE`'s causes, `PLAN_ENTRY_INVALID` as a plan defect and `OVERLAY_HANDLER_INVALID`. Two stale sentences of that document (the one-legal-value `effect` sentence and the plan-time `PLAN_ENTRY_INVALID` sentences for an ungrounded locator) are corrected. The one fixed `ROLE_NOT_DEDICATED` catalogue sentence in `qa-run.mjs` is reworded to cover `effect: "validation"`. The collected phase 1-6 documentation follow-ups are closed (`docs/api-reference.md`, `docs/domain/glossary.md`, `relay-qa-seed.md`), one dated decision entry 107 is added and mirrored, and `plugin.json` goes `0.47.0` to `0.48.0` with the changelog cut, `README.md`, `status.html`, `scripts.html` and `commands.html`. The implementer delivers a tree on which `npm run validate` passes 28 of 28 and the corpus is green; committing, the PR, the merge and the install are the operator's steps.

## User Story

As the AI session that plans `/relay-qa-run` entries and the operator who reads their results
I want the v4 vocabulary, its failure causes and its overlay handlers documented with examples the validator accepts, and the release cut and versioned
So that the phase 8 dogfood runs on a named version and the planner writes steps the script accepts

## Problem Statement

Phases 1 to 6 changed `qa-run.mjs` and its tests, but the command document that the planner reads still describes 0.47.0: it has no example for the four new vocabulary items, no overlay declaration, a sentence that says `effect` has "one legal value", plan-time sentences that call an ungrounded locator `PLAN_ENTRY_INVALID` (it is now a per-step gap), and a reason-code table without the run-time codes. `docs/api-reference.md` lists none of the phase 1 to 6 exports, `docs/domain/glossary.md` says a role-only presence step with none visible "fails with cause `absent`" although the code sets that cause only when none is present, and the manifest and changelog still say 0.47.0. The design decisions of the feature sit only in per-phase manifests.

## Solution Statement

One serial pass, the plugin text first and the release cut last. Task 1 records the phase-6 tree (the diff base for every later fence, because phases 1 to 6 are uncommitted in this worktree). Task 2 rewords the one catalogue sentence. Tasks 3 to 5 edit the command document in three coherent blocks, Task 6 the seed command, Tasks 7 to 10 the reference docs, the decision entry and its mirror, and the pages, Tasks 11 and 12 the changelog cut and the version, Task 13 runs the two gates. Every edit is an anchored `Edit`, never a `Write` of a whole file (very long single-line rows are read by pinned tests). Every marked example is run through the script's own `validateStep` and the overlay declaration through `classifyOverlayHandlers`, so the documentation cannot drift from the script it describes.

## Metadata

| Key | Value |
|-----|-------|
| Type | documentation, release cut, one fixed-sentence reword |
| Complexity | HIGH (one 1178-line command document edited in three places, 13 files, a mirrored decision entry, a changelog cut) |
| Systems Affected | `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/commands/relay-qa-seed.md`; `plugins/relay/scripts/qa-run.mjs` (one line); `plugins/relay/.claude-plugin/plugin.json`; `README.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `docs/decisions.md`; `documentation/governance/decisions.html`; `documentation/roadmap/status.html`; `documentation/reference/scripts.html`; `documentation/reference/commands.html`; `documentation/changelog.html` |
| Dependencies | `Depends` is `1, 2, 3, 4, 5, 6` (all `complete`); Phase 8 (the dogfood) follows and needs the install the operator performs |
| Estimated Tasks | 13 |
| Source PRD line ref | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` lines 87 (AC-15), 89-90 (AC-17, AC-18), 186 (row 7), 221-224 (Phase 7 details), 233-245 (Decisions Log) |
| phase_type | feature |

`phase_type: feature`: the `## Files to Change` table includes one application source file (`qa-run.mjs`, one reworded sentence), so the phase is not docs-only. No test file is touched, which is why the test-pair deferral note in `## Notes` applies.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 239-286, 288-380 | BINDING contract for every `documentation/` edit: invariants, the changelog rules (7.2, 7.3 rename `Unreleased` and start a fresh block), the section 7.5 manifest lock-step, the three-file rule (not triggered: no page is added) |
| P0 | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` | 87, 89-90, 186, 221-224, 233-245 | AC-15, AC-17, AC-18, row 7, the Phase 7 details and the Decisions Log the new entry summarises |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 262-282, 400-483, 620-623, 663-694, 780-796, 904-919, 954-1008 | The sections edited by Tasks 3-5: the locator vocabulary and the `within` example, the run-time locator rules and the grounding rules (two stale sentences at 406-408 and 474-483), the per-step results paragraph, the reason-code table and the run-time halt paragraph, the `effect` paragraph (stale at 787-788), the channel sources paragraph that the overlay declaration follows, and the honesty rules |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1099-1170, 1425-1520, 1625-1650, 1783-1810, 1847-1960, 2144-2220, 2988-2993 | The facts the documentation states: failure causes and their phrases, `RUNTIME_REASON_CATALOGUE`, the `effect` and `pattern` rules, `validateValidationSubmits`, the overlay declaration (`classifyOverlayHandlers`) and its constants, the gap/truncation/continuation records, and the `ROLE_NOT_DEDICATED` sentence |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 133-134, 750-762, 769-806 | Read-only: the marked-example pattern, the loop that runs every example through `validateStep`, and the rules that every `REASON_CATALOGUE` code appears in the command document with a `| \`CODE\` | \`outcome\` | \`class\` |` row that agrees with the runner |
| P0 | `PRPs/reports/qa-runner-vocabulary-v4/phase-6/docs-update.md` | Deferred Questions | Read-only (git-ignored run artifact): the proposed `/relay-qa-run` row sentence for `overlay_handlers` and the other collected follow-ups |
| P0 | `docs/api-reference.md` | 129, 219 | The `/relay-qa-run` row and the single `qa-run.mjs` export row edited by Task 7 |
| P0 | `docs/domain/glossary.md` | 370-386 | The role-only sentence corrected by Task 7 |
| P0 | `documentation/changelog.html` | 31-45, 98-125 | The empty `Unreleased` block, the 0.47.0 section that must stay byte-identical, and the shape of a release |
| P0 | `docs/decisions.md` | 2532-2555, 2557-2566 | The last entry (106) and the commented template; the new entry goes between the closing `---` and the template |
| P1 | `PRPs/plans/completed/qa-runner-vocabulary-v4-phase-1-step-level-validation.plan.md` to `...-phase-6-overlay-handlers.plan.md` | whole | What each phase promised its documentation; read the `## Notes` of each |
| P1 | `C:/repos/PRPs-agentic-eng/PRPs/plans/completed/qa-runner-ai-executable-steps-phase-8-release-cut.plan.md` | whole | The model: the 0.47.0 cut (artifact lives in the main checkout, not in this worktree) |
| P1 | `documentation/governance/decisions.html` | the last `<h3 id>` entry and the index `<ol>` | The HTML shape of one entry and of an index row (Task 9 reads it first) |
| P1 | `documentation/roadmap/status.html`, `documentation/reference/scripts.html`, `documentation/reference/commands.html` | the feature PRD table; the `qa-run.mjs` entry between `<h2 id="qa-run">` and `<h2 id="qa-seed">`; the `/relay-qa-run` entry | Tasks 9 and 10 |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:415-420
A literal `browser` step that scopes a locator to one group with `within`:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_visible", "within": { "role": "region", "name": "Concluídas" }, "role": "listitem", "name": "Comprar leite" }
```
```
Copied by Tasks 3 and 5 (a one-line lead-in "A literal `browser` step that ...:", the marker on its own line, a json fence holding one flat step, then the rules in prose).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:904-919
Channel sources. `channel_sources` is a top-level map in `PRPs/auth/qa-seed.json`, next
to `states` and `query_sources`; it declares where a verification message can be read
in the local environment. ...
```json
{ "channel_sources": { "mail": { "kind": "mailpit", "url": "http://localhost:8025" } } }
```
```
Copied by Task 5 (a seed-file declaration is shown as an UNMARKED json fence after a paragraph that begins with the key's name; the marker is reserved for steps).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:668-669
| Code | Outcome | Class | Use it when |
|------|---------|-------|-------------|
```
Copied by Task 4 (the run-time codes table uses a different header, `| Code | Outcome | Kind | Meaning |`, AND a Kind cell that is plain unbackticked text such as `run-time gap`. The `qa-run-contract` row regex `^\| `CODE` \| `(needs-human|blocked)` \| `(impossible|gap)` \|` does not look at the header, only at the first three cells, so it is the unbackticked Kind cell, not the header, that keeps the run-time rows out of the catalogue comparison).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2988-2992
  ROLE_NOT_DEDICATED: Object.freeze({
    disposition: 'blocked',
    class: 'gap',
    reason: 'a write step names a role the kit does not declare dedicated; nothing was executed; the manual steps are reproduced verbatim',
  }),
```
Copied by Task 2 (the one line that is reworded; nothing else in the object changes).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:133-134
const STEP_EXAMPLE_PATTERN = /<!-- qa-step-example driver=(\w+) -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g;
const PLAN_ENTRY_EXAMPLE_PATTERN = /<!-- qa-plan-entry-example -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g;
```
Copied by Tasks 3 and 5 and the Levels (the marker shape, and the regex their validations reuse to extract examples).

```
# SOURCE: docs/domain/glossary.md:381-384
`STEP_UNGROUNDED` (the reason never echoes the anchor text). An `expect_visible` with
`within` and a `role` but no name passes when at least one element of that role inside
the scope is visible to a person (none visible fails with cause `absent`); without
`within` it is `PLAN_ENTRY_INVALID`.
```
Copied by Task 7 (the sentence whose parenthesis is corrected).

```
# SOURCE: docs/decisions.md:2532-2555
  [heading, indented here only so that it is not read as a section of this plan] ## [2026-10-22] The QA runner's `needs-human` means only what no AI agent can execute alone: impossible and gap classes, executed product defects, judged steps, local channel sources and an actionable environment halt (vocabulary v3)

  **Context:** ... **Decision:** (numbered list, one bold lead each) ... **Reason:** ... **Out of scope / not promoted:** ... **Areas affected:** ...
```
Copied by Task 8 (the model entry: heading form `## [date] Title`, no number, then the five bold-labelled fields; the list items are `1. **lead.** text`).

```
# SOURCE: documentation/governance/decisions.html:1016-1022 (the shape of entry 105 as recorded by the 0.47.0 cut plan; entry 106 sits directly below it and Task 9 reads the page for the live lines)
      <h3 id="separate-from-upstream">105. Separating relay from the upstream Wirasm repository: registered backlog item</h3>
      <div class="kv">
        <dt>Date</dt><dd>2026-10-09</dd>
        <dt>Context</dt><dd>...</dd>
        <dt>Decision</dt><dd>...</dd>
        <dt>Reason</dt><dd>...</dd>
      </div>
```
Copied by Task 9 (one `<h3 id>` and a `kv` block with Date, Context, Decision, Reason; the Decision `<dd>` of a multi-item entry holds an `<ol>` of `<li><strong>lead</strong> text</li>`; no Areas row on the site).

```
# SOURCE: documentation/changelog.html:31-35
      <h2 id="unreleased">Unreleased</h2>

      <p>Nothing yet.</p>

      <h2 id="v0-47-0">0.47.0 &#8212; 2026-10-22</h2>
```
Copied by Task 11 (the new `<h2 id="v0-48-0">` section is inserted between the `Nothing yet.` paragraph and the 0.47.0 heading; the 0.47.0 section stays byte-identical).

```
# SOURCE: documentation/AGENTS.md:361-366
<li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
  &mdash; version bumped <code>0.X.Y</code> &rarr; <code>0.A.B</code> to
  match this release; users running <code>/plugin</code> after pulling
  this version will get a fresh <code>relay/0.A.B/</code> cache directory
  with all newly-shipped commands and agents registered.</li>
```
Copied by Task 11 (the section 7.5 manifest-bump line, the last `Changed` entry of the release).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt` | CREATE | Records the phase-6 end-state tree object, the diff base of every fence below (phases 1-6 are uncommitted); a git-ignored run artifact, not delivered work |
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | One line: the `ROLE_NOT_DEDICATED` catalogue sentence says "a write step" although it now also covers `effect: "validation"` |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | AC-15: examples for `pattern`, `anchor_text`, role-only presence, `effect: "validation"`; the `overlay_handlers` declaration; the per-step, cause, continuation, validation-submit and overlay rules; the run-time codes table; two stale sentences corrected |
| `plugins/relay/commands/relay-qa-seed.md` | UPDATE | One prose recommendation for `overlay_handlers` (the seed command never writes it) |
| `docs/api-reference.md` | UPDATE | The `qa-run.mjs` export row gains the phase 1-6 exports; the `/relay-qa-run` row gains `overlay_handlers`, the new keys, the step results and `OVERLAY_HANDLER_INVALID` |
| `docs/domain/glossary.md` | UPDATE | "none visible fails with cause `absent`" corrected to "none present"; one sentence for overlay handlers |
| `docs/decisions.md` | UPDATE | One new dated entry registering the v4 design |
| `documentation/governance/decisions.html` | UPDATE | HTML mirror: one `<h3 id>` numbered 107 and one index row (`decisions-mirror` compares both counts) |
| `documentation/roadmap/status.html` | UPDATE | Decision count 106 to 107 and a feature row |
| `documentation/reference/scripts.html` | UPDATE | A new row in the `qa-run.mjs` entry for the v4 behavior (append-only) |
| `documentation/reference/commands.html` | UPDATE | A new sentence in the `/relay-qa-run` entry for the v4 vocabulary (append-only) |
| `documentation/changelog.html` | UPDATE | Cut `0.48.0`: dated release block with intro, Added and Changed entries, the section 7.5 manifest-bump line; the 0.47.0 block untouched |
| `README.md` | UPDATE | The live version prose |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | `version` `0.47.0` to `0.48.0` in the same change as the changelog heading |

## NOT Building (Scope Limits)

- **The install.** No task commits, stages for commit, pushes, opens a PR or runs `claude plugin marketplace update`, `claude plugin update` or a restart. AC-18's last clause ("the new version is installed") is the operator's, in the order given in `## Notes`, because `/relay-execute` never commits (`docs/decisions.md` 2026-05-18) and the install needs the work committed and merged.
- **Any behavior change in `qa-run.mjs`.** The single edit is the wording of one fixed sentence. No new export, no changed validation, no changed result shape.
- **The five frozen surfaces:** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs`.
- **Any test file, any validation check, any change to the check count.** The Implementer authors zero test files (R-X strict). The `qa-run-contract` check is not extended here: its existing loop already runs every marked example through `validateStep`, and this plan's own validations pin the new keys. Extending the check to pin the new keys by name (PRD Phase 7 scope mentions it) is a change to a check and its test file, which belongs to the test pair; the operator can request it as a follow-up. The count stays 28.
- **A new documentation page, a NAV entry, a CSS or JS change, or a search-index change.** The search-index excerpts of `commands.html` and `scripts.html` are pinned by tests and stay as they are; the three-file rule is met by the changelog entry.
- **The dogfood kit fixes (AC-16), the counted runs and any claim that the metrics hold.** Phase 8 owns them; no page says AC-19 is met.
- **A `ground --prefix` change.** The plan-time replay never submits; its `GROUND_PREFIX_FAILED` sentence ("could not be found or acted on") is left as it is: prefix steps are only `goto`, `click` and `fill`, so the sentence stays accurate.
- **Any anti-pattern entry.** `docs/anti-patterns.md` and its mirror are untouched.

## Step-by-Step Tasks

Tasks run in order. Every edit uses the `Edit` tool with anchors quoted from the file as it is now; if an anchor is not unique, lengthen it with neighbouring words, do not widen the edit. HTML entities follow each page's own usage (`&mdash;`, `&rsquo;`, `&rarr;`, `&ndash;`); no emoji, no inline `style`, no absolute path; all files stay LF. Every command below runs from the worktree root in Git Bash with the `core.fsmonitor` environment prefix shown. A VALIDATE that needs the base tree reads it with `export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"`. Node validations use a quoted heredoc (`node --input-type=module <<'EOF'`) so that quotes and backticks in the needles need no shell escaping.

### Task 1: CREATE PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt

- **ACTION**: Infrastructure task (delivers no acceptance criterion; every fence in `## Validation Commands` depends on it). Before any other edit, record the tree object of the current working tree (phases 1 to 6, uncommitted) using a temporary index so that the real index is not touched: create the directory, then `IDX="$(mktemp -u)"; GIT_INDEX_FILE="$IDX" git read-tree HEAD; GIT_INDEX_FILE="$IDX" git add -A; GIT_INDEX_FILE="$IDX" git write-tree > PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt; rm -f "$IDX"`. Guard it with `[ -s <file> ]` so that a re-run after edits never overwrites the baseline. The file holds one 40-hex line.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:133-134` (not copied: this task is infrastructure; the single-argument `git diff <tree>` form is the diff-base contract in `## Validation Commands`)
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
f=PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt
test -s "$f"
b="$(tr -d '\r\n' < "$f")"
printf '%s' "$b" | grep -Eq '^[0-9a-f]{40}$'
test "$(git cat-file -t "$b")" = "tree"
git show "$b:plugins/relay/.claude-plugin/plugin.json" | grep -q '"version": "0.47.0"'
echo "PASS: the phase-6 base tree $b is recorded and still carries manifest 0.47.0"
```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs

- **ACTION**: Delivers AC-A4. In the `ROLE_NOT_DEDICATED` object of `REASON_CATALOGUE` (line 2991), replace the anchor `reason: 'a write step names a role the kit does not declare dedicated; nothing was executed; the manual steps are reproduced verbatim',` with `reason: 'a write or validation step names a role the kit does not declare dedicated; nothing was executed; the manual steps are reproduced verbatim',`. Nothing else in the file changes. Decision recorded here: the sentence is reworded because the dedicated-role gate now also refuses a `click` marked `effect: "validation"` (`firstEffectStep`), and a reason that says "a write step" for a validation click misleads the reader. The tests that read this sentence do so through the exported constant (`R.REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason`), not as a literal, so none goes stale; if Level 3 finds a test that pins the old literal, it is the test pair's (`EXISTING_TEST_UPDATED`), never edited here.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2988-2992`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const spec = m.REASON_CATALOGUE.ROLE_NOT_DEDICATED;
const bad = [];
if (!spec.reason.startsWith("a write or validation step names a role the kit does not declare dedicated;")) bad.push("the ROLE_NOT_DEDICATED sentence does not start with the reworded text");
if (spec.disposition !== "blocked" || spec.class !== "gap") bad.push("the disposition or class of ROLE_NOT_DEDICATED changed");
const d = execFileSync("git", ["diff", "--unified=0", process.env.BASE, "--", "plugins/relay/scripts/qa-run.mjs"], { encoding: "utf8", maxBuffer: 1 << 28 })
  .split("\n").filter((l) => /^[-+]/.test(l) && !/^(\+\+\+|---)/.test(l));
if (d.length !== 2 || !d[0].startsWith("-") || !d[1].startsWith("+")) bad.push("qa-run.mjs must differ from the phase-6 tree by exactly one removed and one added line, found " + d.length);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the ROLE_NOT_DEDICATED sentence covers validation steps and nothing else in qa-run.mjs changed");
EOF
```

### Task 3: UPDATE plugins/relay/commands/relay-qa-run.md (vocabulary examples and the effect paragraph)

- **ACTION**: Delivers AC-A1 and AC-A4. First read `plugins/relay/scripts/qa-run.mjs` 1425-1520 (`stepRules`), 1783-1810 (`validateValidationSubmits`) and 1625-1650 (`firstEffectStep`, `isDedicatedRole`), and `parseGroundPrefix` (`qa-run.mjs:5830`), to confirm each statement below; where the code differs, state what the code does. Then three `Edit`s.
  1. Insert after the `index` paragraph (the one ending "a re-layout changes the control it picks.") and before the paragraph that begins "Grounding rules." the following block, in this order. Each example sits on its own line pair exactly as the pattern shows (marker line, then a json fence), and each is a single flat object:

     `<!-- qa-step-example driver=browser -->` + json fence + `{ "action": "click", "within": { "anchor_text": "Escolha seu avatar" }, "role": "button", "index": 0 }`
     `<!-- qa-step-example driver=browser -->` + json fence + `{ "action": "expect_visible", "within": { "role": "dialog", "name": "Validar e-mail" }, "role": "alert" }`
     `<!-- qa-step-example driver=browser -->` + json fence + `{ "action": "expect_text", "role": "button", "name_prefix": "Não concluídas", "pattern": "number" }`

     with a lead-in line before each ("A literal `browser` step that scopes a locator to the group that holds a visible text:", "A literal `browser` step that asserts the presence of an element by role alone inside a scope:", "A literal `browser` step that asserts a value is shown without stating it:") and these rules after them, which must contain verbatim (a hard wrap between words is fine) the fragments in the list that follows the rules:
     - `within` may be `{ "anchor_text": "<visible text>" }` alone, for controls with no accessible name under a container that has none either. The runner finds the one visible element whose text is `anchor_text`, walks up to the nearest ancestor that holds at least one element of the step's `role`, and resolves the step inside it. It needs a `role` together with `name`, `name_prefix` or `index`, is not taken by `fill`, `expect_value` or `judge`, and follows the grounding rule of any other word (the text comes from the report's own steps or from a snapshot entry with `matches` exactly `1`). Zero or several anchors end the case `needs-human` `STEP_UNGROUNDED`, and the reason never echoes the anchor text.
     - An `expect_visible` with a `within` scope of role and name and a `role` but no `name`, `name_prefix` or `index` passes when at least one element of that role inside the scope is visible to a person. When none is present it fails with cause `absent`; when some are present and none is visible to a person it fails without a cause. Only `expect_visible` takes this form, and without `within` the entry is `PLAN_ENTRY_INVALID`.
     - An `expect_text` may carry `pattern` instead of `contains`, for a value the report says is shown but does not state (a count). The closed list holds only `number`: the step passes when the visible text of the located element contains a run of digits and fails when it contains none. Any other name is `PLAN_ENTRY_INVALID`, and `pattern` cannot be combined with `contains`.
  2. Replace the sentence `` `effect` has one legal value, `"write"`, and only a `click`, `fill` or `request` step may carry it; any other value, and the key on any other step, is `PLAN_ENTRY_INVALID`. `` (in the paragraph after the `"effect": "write"` example) with: `` `effect` has two legal values, `"write"` and `"validation"`. `"write"` may be carried by a `click`, `fill` or `request` step and `"validation"` by a `click` step only; any other value, and the key on any other step, is `PLAN_ENTRY_INVALID`. ``
  3. Insert after that paragraph (it ends "...plan the marked steps anyway and let the runner report the block.") and before the paragraph that begins "Seed captures worth using." a lead-in "A literal `browser` step that submits a form to read the validation error the report describes:", then `<!-- qa-step-example driver=browser -->` + json fence + `{ "action": "click", "role": "button", "name": "Enviar", "effect": "validation" }`, then the rules, which state: a `click` marked `"effect": "validation"` submits a form with a value the report itself gives as invalid, after a `fill` such as `{ "action": "fill", "role": "textbox", "name": "E-mail", "value": "not-an-email" }`; the entry is `PLAN_ENTRY_INVALID` otherwise, because a validation submit needs an earlier `fill` step in the same case whose value appears verbatim in the case's manual steps; the click passes through the same dedicated-role gate as a write (a role the kit does not declare dedicated ends the case `blocked` with `ROLE_NOT_DEDICATED` before anything is seeded, authenticated or requested); when the click runs, the requests the click issues are recorded in its evidence, and a request to a host the local-only guard does not approve blocks the case `FAILED_NON_LOCAL_TARGET`; never invent a value for a validation submit. Add one sentence on `ground --prefix` only as `parseGroundPrefix` supports it.
  4. Add three bullets at the end of the "Honesty rules" list (before "Every executable entry must carry at least one expectation"): plan a role-only presence step only when the report says an element of a kind appears inside a named scope without naming it; plan `pattern` only for a value the report says is shown without stating it, never for a value it states; plan `effect: "validation"` only with a literal the report gives as invalid. The bullet for the validation submit must begin with the words `Plan `effect: "validation"` only`.
  Required fragments (matched after whitespace is collapsed): ``within` may be `{ "anchor_text": "<visible text>" }` alone``; ``the nearest ancestor that holds at least one element of the step's `role` ``; ``Zero or several anchors end the case `needs-human` `STEP_UNGROUNDED` ``; `passes when at least one element of that role inside the scope is visible to a person`; ``when none is present it fails with cause `absent` ``; `when some are present and none is visible to a person it fails without a cause`; ``without `within` the entry is `PLAN_ENTRY_INVALID` ``; ``The closed list holds only `number` ``; `contains a run of digits`; ``` `pattern` cannot be combined with `contains` ```; ``` `effect` has two legal values, `"write"` and `"validation"` ```; ``a validation submit needs an earlier `fill` step in the same case whose value appears verbatim in the case's manual steps``; `the same dedicated-role gate as a write`; ``the requests the click issues are recorded``; ``Plan `effect: "validation"` only``. The sentence ``` `effect` has one legal value ``` must no longer occur.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:415-420`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const t = fs.readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
const flat = t.replace(/\s+/g, " ");
const bad = [];
const ex = [...t.matchAll(/<!-- qa-step-example driver=(\w+) -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g)].map((x) => ({ d: x[1], s: JSON.parse(x[2]) }));
for (const e of ex) { const r = m.validateStep(e.d, e.s); if (r) bad.push("example does not validate: " + JSON.stringify(e.s) + " -> " + r.reason); }
const has = (f) => ex.some((e) => e.d === "browser" && f(e.s));
if (!has((s) => s.action === "click" && s.within && s.within.anchor_text === "Escolha seu avatar" && s.role === "button" && s.index === 0)) bad.push("no marked anchor_text example");
if (!has((s) => s.action === "expect_visible" && s.within && s.within.role === "dialog" && s.role === "alert" && s.name === undefined && s.name_prefix === undefined && s.index === undefined)) bad.push("no marked role-only presence example");
if (!has((s) => s.action === "expect_text" && s.pattern === "number" && s.contains === undefined)) bad.push("no marked pattern example");
if (!has((s) => s.action === "click" && s.effect === "validation")) bad.push("no marked effect validation example");
if (!has((s) => s.action === "click" && s.effect === "write")) bad.push("the earlier effect write example was lost");
const need = [
  "`within` may be `{ \"anchor_text\": \"<visible text>\" }` alone",
  "the nearest ancestor that holds at least one element of the step's `role`",
  "Zero or several anchors end the case `needs-human` `STEP_UNGROUNDED`",
  "passes when at least one element of that role inside the scope is visible to a person",
  "when none is present it fails with cause `absent`",
  "when some are present and none is visible to a person it fails without a cause",
  "without `within` the entry is `PLAN_ENTRY_INVALID`",
  "The closed list holds only `number`",
  "contains a run of digits",
  "`pattern` cannot be combined with `contains`",
  "`effect` has two legal values, `\"write\"` and `\"validation\"`",
  "a validation submit needs an earlier `fill` step in the same case whose value appears verbatim in the case's manual steps",
  "the same dedicated-role gate as a write",
  "the requests the click issues are recorded",
  "Plan `effect: \"validation\"` only",
];
for (const s of need) if (!flat.includes(s)) bad.push("the command document lacks: " + s);
if (flat.includes("`effect` has one legal value")) bad.push("the stale one-legal-value sentence is still present");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: " + ex.length + " marked examples validate and the vocabulary rules are stated");
EOF
```

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md (per-step rules, failure causes, continuation, run-time codes)

- **ACTION**: Delivers AC-A3 and AC-A4. First read `qa-run.mjs` 1099-1170, 2144-2220 and `precheckGroundedSteps` (2716) to confirm the statements; where the code differs, state what the code does. Then four edits.
  1. Replace the sentence `A locator taken from neither source is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested.` (in "Run-time and scoped locators") with `A locator taken from neither source is a step gap (see "Per-step validation, failure causes and continuation" below), not a refusal of the entry.`
  2. In "Grounding rules", replace the sentences from `A step whose element is neither in the snapshot nor in the report's words is not planned:` through `...because the script refuses such a step as `PLAN_ENTRY_INVALID`.` with text saying: plan the step anyway; a step whose element is neither in the snapshot nor in the report's words is recorded by the runner as a step gap and the rest of the case runs (see the new subsection); decline the whole case with `STEP_UNGROUNDED` only when no step of it can run. Keep the sentences that follow ("The declining entry names no step and carries no free text ...") consistent with that. The sentence ``because the script refuses such a step as `PLAN_ENTRY_INVALID` `` must no longer occur.
  3. Insert a new subsection `### Per-step validation, failure causes and continuation` directly before `### Classify every case and name every decline`. It must contain, verbatim after whitespace collapse: ``A step the runner cannot ground is a step gap, not a refusal of the entry``; ``an ungrounded `expect_*` step is recorded `human` with `STEP_UNGROUNDED` and the steps around it still run``; ``an ungrounded `click`, `fill` or `goto` ends the run of the case there``; `not run after an ungrounded interaction`; ``A malformed entry (an unknown action, a missing required key, an invalid `effect`, an unbound `{{name}}`) is still `PLAN_ENTRY_INVALID` for the whole entry``; ``the case ends `needs-human` with `STEP_UNGROUNDED` only when no executed step failed``; ``a `cause` from a closed list: `covered`, `disabled`, `not_editable`, `absent`, `detached` or `other` ``; `no Playwright error text or page text is ever written`; ``is a `fail` with cause `absent` ``; ``a locator that matches more than one element still ends the case `needs-human` with `STEP_UNGROUNDED` ``; `A failed assertion does not end the case`; `not run after a failed assertion`. Write the subsection in plain prose, three short paragraphs: (a) per-step grounding gaps and the truncation of the rest of the case after an ungrounded interaction, with the fixed reasons the runner records; (b) the closed causes of a `STEP_NOT_PERFORMABLE` block (a click or fill that cannot be performed ends the case `blocked`; the reason names the cause in a fixed sentence) and the rule that an `expect_*` step grounded only by the report's words that matches no element after the wait is a `fail` with cause `absent`; (c) continuation: after a failed assertion the later `expect_*`, `query` and `judge` steps still run and are recorded and the case ends `fail`; the first `goto`, `click`, `fill`, `request` or `read_message` step, or any step that carries an `effect`, and every step after it, is recorded `not-run`.
  4. In the "Per-step results" paragraph, add one sentence: a failed step may carry a `cause` from the same closed list. In the reason-code table, replace the `ROLE_NOT_DEDICATED` row's "Use it when" text `never declared: the runner refuses a write step for a role the kit does not declare dedicated` with `never declared: the runner refuses a write or validation step for a role the kit does not declare dedicated` (the `| `ROLE_NOT_DEDICATED` | `blocked` | `gap` |` prefix of the row is unchanged). After the paragraph that begins "Runtime halt codes" add a short lead-in and this table, whose header is deliberately not the catalogue header:

```
| Code | Outcome | Kind | Meaning |
|------|---------|------|---------|
| `STEP_NOT_PERFORMABLE` | `blocked` | run-time gap | a step's target could not be acted on; the `cause` is one word of the closed list `covered`, `disabled`, `not_editable`, `absent`, `detached` or `other` |
| `PLAN_ENTRY_INVALID` | `needs-human` | plan defect | the plan entry is malformed (a schema error); it is a defect of the plan, not a decline of the case, and it is reported apart from the declined cases |
| `OVERLAY_HANDLER_INVALID` | `blocked` | declaration defect | the `overlay_handlers` declaration of `PRPs/auth/qa-seed.json` is malformed; the case is blocked before any step runs and `ground` halts with the same code |
```

  The Kind cell is deliberately plain, unbackticked text (`run-time gap`, `plan defect`, `declaration defect`) and never `` `gap` `` or `` `impossible` ``: the `qa-run-contract` row regex `^\| `CODE` \| `(needs-human|blocked)` \| `(impossible|gap)` \|` reads only the first three cells and ignores the header, so a backticked class in the third cell would make these rows look like catalogue rows. Do not add any of these three codes to the catalogue table (they are outside `REASON_CATALOGUE`). The prose still calls `STEP_NOT_PERFORMABLE` a gap; only the table cell's form differs.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:668-669`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const t = fs.readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
const flat = t.replace(/\s+/g, " ");
const bad = [];
const need = [
  "### Per-step validation, failure causes and continuation",
  "A step the runner cannot ground is a step gap, not a refusal of the entry",
  "an ungrounded `expect_*` step is recorded `human` with `STEP_UNGROUNDED` and the steps around it still run",
  "an ungrounded `click`, `fill` or `goto` ends the run of the case there",
  "not run after an ungrounded interaction",
  "A malformed entry (an unknown action, a missing required key, an invalid `effect`, an unbound `{{name}}`) is still `PLAN_ENTRY_INVALID` for the whole entry",
  "the case ends `needs-human` with `STEP_UNGROUNDED` only when no executed step failed",
  "a `cause` from a closed list: `covered`, `disabled`, `not_editable`, `absent`, `detached` or `other`",
  "no Playwright error text or page text is ever written",
  "is a `fail` with cause `absent`",
  "a locator that matches more than one element still ends the case `needs-human` with `STEP_UNGROUNDED`",
  "A failed assertion does not end the case",
  "not run after a failed assertion",
  "| `STEP_NOT_PERFORMABLE` | `blocked` | run-time gap |",
  "| `PLAN_ENTRY_INVALID` | `needs-human` | plan defect |",
  "| `OVERLAY_HANDLER_INVALID` | `blocked` | declaration defect |",
  "a defect of the plan, not a decline of the case",
  "never declared: the runner refuses a write or validation step for a role the kit does not declare dedicated",
];
for (const s of need) if (!flat.includes(s)) bad.push("the command document lacks: " + s);
for (const s of ["A locator taken from neither source is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested.", "because the script refuses such a step as `PLAN_ENTRY_INVALID`", "never declared: the runner refuses a write step for a role"]) if (flat.includes(s)) bad.push("a stale sentence is still present: " + s);
const rows = [...t.matchAll(/^\| `([A-Z_]+)` \| `(needs-human|blocked)` \| `(impossible|gap)` \|/gm)].map((x) => x[1]);
for (const code of Object.keys(m.REASON_CATALOGUE)) if (!rows.includes(code)) bad.push("the catalogue table has no row for " + code);
for (const code of ["STEP_NOT_PERFORMABLE", "PLAN_ENTRY_INVALID", "OVERLAY_HANDLER_INVALID"]) if (rows.includes(code)) bad.push(code + " must stay out of the catalogue table: its Kind cell must be plain text, not a backticked class");
if (!/^\| Code \| Outcome \| Class \| Use it when \|$/m.test(t)) bad.push("the catalogue table header changed");
for (const c of m.STEP_FAILURE_CAUSES) if (!flat.includes("`" + c + "`")) bad.push("the cause is not documented: " + c);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the per-step, cause and continuation rules and the run-time codes table are documented");
EOF
```

### Task 5: UPDATE plugins/relay/commands/relay-qa-run.md (overlay handlers)

- **ACTION**: Delivers AC-A2. First read `qa-run.mjs` 1847-1960 (the declaration, constants and registration) and the `OVERLAY_DISMISSED` / `OVERLAY_HANDLER_SKIPPED` lines of the `ground` mode (search the file for `OVERLAY_DISMISSED`). Insert, directly after the `channel_sources` json fence (the line `{ "channel_sources": { "mail": ... } }` and its closing fence) and before the lead-in "A literal `browser` step that reads a verification code from a declared source:", a paragraph beginning `Overlay handlers.` then an UNMARKED json fence holding exactly:

```
{ "overlay_handlers": [ { "id": "onboarding-tour", "trigger": { "role": "dialog", "name": "Bem-vindo" }, "dismiss": { "role": "button", "name": "Pular" } } ] }
```

  and then the remaining rules in prose. The text must state, verbatim after whitespace collapse: ``` `overlay_handlers` is a top-level array in `PRPs/auth/qa-seed.json` ```; that each entry is an object with `id`, `trigger`, `dismiss` and an optional `effect` of `"write"`, where `trigger` and `dismiss` name an element by role and name, or by text, and nothing else; `at most 10 entries`; that an `id` is 1 to 40 letters, digits, hyphens or underscores; that the runner registers each handler with `page.addLocatorHandler` (Playwright 1.44 or newer, otherwise the case is blocked `FAILED_PLAYWRIGHT_UNAVAILABLE`) so that the dismissal runs before a `click` or `fill` when the trigger is visible; ``each handler runs at most 25 times per page``; ``the dismissal click is bounded to 3 seconds``; ``These numbers are chosen, not measured``; ``a handler marked `"effect": "write"` is registered only for a role the kit declares dedicated; for any other role it is not registered and the run records why``; ``a dismissal that leaves the guard-approved origin blocks the case `FAILED_NON_LOCAL_TARGET` ``; ``handlers never use a forced click``; ``an overlay with no declared handler is never dismissed, and a click it blocks ends the case `blocked` with `STEP_NOT_PERFORMABLE` and cause `covered` ``; ``a malformed declaration blocks the case `OVERLAY_HANDLER_INVALID` ``; ``each dismissal is listed by handler id, step and result in `evidence/case-<n>.overlay.json` ``; and that `ground` dismisses declared overlays too and prints an `OVERLAY_DISMISSED` line for each. Say that the planner reads which handlers are declared, never writes one and never edits the file. Add one honesty-rule bullet at the end of the "Honesty rules" list: never rely on, name or plan around an overlay handler the file does not declare. Do NOT put a `qa-step-example` marker on the declaration: it is not a step and the marker loop would run it through `validateStep`.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:904-919`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const t = fs.readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
const flat = t.replace(/\s+/g, " ");
const bad = [];
const blocks = [...t.matchAll(/```json\r?\n(\{ "overlay_handlers"[\s\S]*?)\r?\n```/g)];
if (blocks.length !== 1) bad.push("expected exactly one overlay_handlers json example, found " + blocks.length);
else {
  const decl = JSON.parse(blocks[0][1]).overlay_handlers;
  const r = m.classifyOverlayHandlers(decl, false);
  if (!r.ok || r.handlers.length !== 1 || r.handlers[0].id !== "onboarding-tour") bad.push("the overlay_handlers example does not validate against classifyOverlayHandlers: " + JSON.stringify(r));
  const w = m.classifyOverlayHandlers([{ ...decl[0], effect: "write" }], false);
  if (!w.ok || w.handlers.length !== 0 || w.skipped.length !== 1) bad.push("a write-effect handler is not skipped for a non-dedicated role");
  if (new RegExp("<!-- qa-step-example[^>]*-->[ \\t]*\\r?\\n```json\\r?\\n\\{ \"overlay_handlers\"").test(t)) bad.push("the overlay_handlers example must not carry a qa-step-example marker");
}
const need = [
  "`overlay_handlers` is a top-level array in `PRPs/auth/qa-seed.json`",
  "at most " + m.OVERLAY_HANDLERS_MAX + " entries",
  "each handler runs at most " + m.OVERLAY_HANDLER_TIMES + " times per page",
  "the dismissal click is bounded to " + (m.OVERLAY_DISMISS_TIMEOUT_MS / 1000) + " seconds",
  "These numbers are chosen, not measured",
  "`page.addLocatorHandler`",
  "a handler marked `\"effect\": \"write\"` is registered only for a role the kit declares dedicated",
  "a dismissal that leaves the guard-approved origin blocks the case `FAILED_NON_LOCAL_TARGET`",
  "handlers never use a forced click",
  "an overlay with no declared handler is never dismissed, and a click it blocks ends the case `blocked` with `STEP_NOT_PERFORMABLE` and cause `covered`",
  "a malformed declaration blocks the case `OVERLAY_HANDLER_INVALID`",
  "each dismissal is listed by handler id, step and result in `evidence/case-<n>.overlay.json`",
  "`OVERLAY_DISMISSED`",
  "never rely on, name or plan around an overlay handler the file does not declare",
];
for (const s of need) if (!flat.includes(s)) bad.push("the command document lacks: " + s);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the overlay_handlers example validates and its rules and constants are documented");
EOF
```

### Task 6: UPDATE plugins/relay/commands/relay-qa-seed.md

- **ACTION**: Delivers AC-A5. `relay-qa-seed.md` documents only the `states` proposals (it does not document `channel_sources` or `query_sources`), so `overlay_handlers` has no schema slot there. In the final-output prose that ends with the recommendation to declare `captures` (the paragraph that begins "Also recommend, in prose only, that the operator declare `captures`"), add one sentence after it: also recommend, in prose only, that the operator declare `overlay_handlers` in `PRPs/auth/qa-seed.json` for any overlay the report's pages are known to show (a developer-tools panel, an onboarding tour), and that this command never writes that key and `/relay-qa-run` documents its shape. Do not add `"status": "confirmed"`, `subagent_type` or `.claude/PRPs` to the file (the `qa-run-contract` check bans them in this document).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:904-919`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
const t = fs.readFileSync("plugins/relay/commands/relay-qa-seed.md", "utf8");
const flat = t.replace(/\s+/g, " ");
const bad = [];
if (!flat.includes("`overlay_handlers`")) bad.push("relay-qa-seed.md does not mention overlay_handlers");
if (!/overlay_handlers[^.]*in prose only|in prose only[^.]*overlay_handlers/.test(flat)) bad.push("the overlay_handlers recommendation must say it is in prose only");
if (!flat.includes("never writes")) bad.push("the sentence must say the command never writes the key");
for (const banned of ["\"status\": \"confirmed\"", "subagent_type", ".claude/PRPs"]) if (t.includes(banned)) bad.push("a banned token: " + banned);
for (const need of ["qa-seed.mjs", "proposed"]) if (!t.includes(need)) bad.push("lost: " + need);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: relay-qa-seed.md recommends overlay_handlers in prose only");
EOF
```

### Task 7: UPDATE docs/api-reference.md and docs/domain/glossary.md

- **ACTION**: Delivers AC-A5. Anchored `Edit`s, never a `Write`.
  1. `docs/api-reference.md`, the single row that starts `` | `qa-run.mjs` `` (line 219, one very long row; there must stay exactly one such row, tests count it): insert, directly before the anchor `and the `USAGE` text, which lists the modes`, a clause naming every phase 1-6 export by its backticked name, grouped by purpose: per-step gaps and records (`STEP_GAP_REASON`, `STEP_TRUNCATED_REASON`, `overlayGapRecords`, `gapVerdict`); failure causes (`STEP_FAILURE_CAUSES`, `STEP_CAUSE_PHRASES`, `actionFailureReason`, `absentElementReason`, `causeOf`, `isCoveredAtActionPoint`, `probeActionFailure`, `notPerformable`, `attachStepCause`, `RUNTIME_REASON_CATALOGUE`, `runtimeReasonClassOf`); continuation (`STEP_NOT_RUN_AFTER_FAILURE_REASON`, `ASSERTION_CONTINUES_ACTIONS`, `continuesAfterFailure`, `markFailedSteps`, `overlayStoppedRecords`); vocabulary (`TEXT_PATTERN_NAMES`, `textMatchesPattern`, `ANCHOR_ANCESTORS_XPATH`, `resolveAnchorScope`); validation submit (`STEP_EFFECTS`, `firstEffectStep`, `validateValidationSubmits`, `summarizeValidationWindow`); overlay handlers (`OVERLAY_HANDLERS_MAX`, `OVERLAY_HANDLER_ID`, `OVERLAY_WRITE_SKIP_REASON`, `OVERLAY_DISMISS_TIMEOUT_MS`, `OVERLAY_HANDLER_TIMES`, `classifyOverlayHandlers`, `overlayUrlApproved`, `summarizeOverlayWatch`, `registerOverlayHandlers`). Verify each name against `grep "^export" qa-run.mjs` (the Read tool on the file is enough: all of these are exported today).
  2. `docs/api-reference.md`, the row that starts `` | `/relay-qa-run `` (line 129): add one sentence, using the one proposed in `PRPs/reports/qa-runner-vocabulary-v4/phase-6/docs-update.md` (Deferred Questions) as the starting point, that names `overlay_handlers` in `PRPs/auth/qa-seed.json` and `OVERLAY_HANDLER_INVALID`, the keys `pattern` and `anchor_text`, `effect: "validation"` (same dedicated-role gate as a write), and the per-step results `passed`, `failed`, `not-run` and `human` with the `cause` of a failed step. Keep every existing sentence of the row (the twelve codes, the classes, the counters, the phrase "a `classification` block beside the unchanged four-key `counts`").
  3. `docs/domain/glossary.md`: replace `(none visible fails with cause `absent`)` with `(none present fails with cause `absent`; present but none visible to a person fails without a cause)`, and add one sentence to the same paragraph: project-declared overlay handlers (`overlay_handlers` in `PRPs/auth/qa-seed.json`) dismiss known overlays before an action and record each dismissal.
  Decision recorded here for the `GROUND_PREFIX_FAILED` sentence: left as it is (see `## NOT Building`).
- **MIRROR**: `# SOURCE: docs/domain/glossary.md:381-384`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const api = fs.readFileSync("docs/api-reference.md", "utf8").split(/\r?\n/);
const gl = fs.readFileSync("docs/domain/glossary.md", "utf8").replace(/\s+/g, " ");
const bad = [];
const exportRows = api.filter((l) => l.startsWith("| `qa-run.mjs` "));
if (exportRows.length !== 1) bad.push("expected exactly one qa-run.mjs row, found " + exportRows.length);
const NAMES = ["STEP_GAP_REASON", "STEP_TRUNCATED_REASON", "overlayGapRecords", "gapVerdict", "STEP_FAILURE_CAUSES", "STEP_CAUSE_PHRASES", "actionFailureReason", "absentElementReason", "causeOf", "isCoveredAtActionPoint", "probeActionFailure", "notPerformable", "attachStepCause", "RUNTIME_REASON_CATALOGUE", "runtimeReasonClassOf", "STEP_NOT_RUN_AFTER_FAILURE_REASON", "ASSERTION_CONTINUES_ACTIONS", "continuesAfterFailure", "markFailedSteps", "overlayStoppedRecords", "TEXT_PATTERN_NAMES", "textMatchesPattern", "ANCHOR_ANCESTORS_XPATH", "resolveAnchorScope", "STEP_EFFECTS", "firstEffectStep", "validateValidationSubmits", "summarizeValidationWindow", "OVERLAY_HANDLERS_MAX", "OVERLAY_HANDLER_ID", "OVERLAY_WRITE_SKIP_REASON", "OVERLAY_DISMISS_TIMEOUT_MS", "OVERLAY_HANDLER_TIMES", "classifyOverlayHandlers", "overlayUrlApproved", "summarizeOverlayWatch", "registerOverlayHandlers"];
for (const n of NAMES) {
  if (m[n] === undefined) bad.push("not exported by qa-run.mjs (the list in this plan is stale): " + n);
  if (exportRows[0] && !exportRows[0].includes("`" + n + "`")) bad.push("the qa-run.mjs row does not name " + n);
}
const cmdRows = api.filter((l) => l.startsWith("| `/relay-qa-run "));
if (cmdRows.length !== 1) bad.push("expected exactly one /relay-qa-run row, found " + cmdRows.length);
else for (const s of ["`overlay_handlers`", "`OVERLAY_HANDLER_INVALID`", "`pattern`", "`anchor_text`", "`not-run`", "`validation`", "a `classification` block beside the unchanged four-key `counts`"]) if (!cmdRows[0].includes(s)) bad.push("the /relay-qa-run row lacks " + s);
if (gl.includes("none visible fails with cause `absent`")) bad.push("the glossary still says none visible fails with cause absent");
for (const s of ["none present fails with cause `absent`", "fails without a cause", "`overlay_handlers`"]) if (!gl.includes(s)) bad.push("the glossary lacks: " + s);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: api-reference names " + NAMES.length + " exports and the glossary is corrected");
EOF
```

### Task 8: UPDATE docs/decisions.md

- **ACTION**: Delivers AC-A6. First read entry 106 (lines 2532-2555) and the phase 1-6 `docs-update.md` manifests under `PRPs/reports/qa-runner-vocabulary-v4/`, and check every statement below against `relay-qa-run.md` as edited by Tasks 3-5 and against `qa-run.mjs`; narrow any statement the code does not support. Insert ONE entry after the 2026-10-22 entry and before the closing `---` that precedes the commented template: use `Edit` with `old_string` = `---\n\n<!-- Template for future entries:` (unique) and `new_string` = the entry, then a blank line, then that same text.

  Heading: `## [2026-10-25] The QA runner degrades by step and names every failure: per-step grounding gaps, closed failure causes, assertion continuation, three vocabulary items, validation submits and declared overlay handlers (vocabulary v4)`

  **Context:** the 0.47.0 dogfood executed 31 of the 87 non-impossible objective steps (35.6%) of the two reference reports against a 90% target, and the lost steps were mostly not impossible: one mis-grounded step forfeited a whole case, an error message reachable only after a validation submit, unnamed controls, known overlays and a product defect that stopped a case at its first failing assertion. `PRPs/prds/qa-runner-vocabulary-v4.prd.md` phases 1 to 6 are implemented in the 0.48.0 release and their manifests proposed separate candidates; this entry registers them together, the way entry 106 did. Phase 8, the counted dogfood, measures them.

  **Decision:** a numbered list of eight items, each with one bold lead and the content below:
  1. **Plan validation degrades per step for grounding and stays per entry for schema errors.** An ungrounded assertion is a step gap recorded `human` with `STEP_UNGROUNDED` and the rest runs; an ungrounded `click`, `fill` or `goto` truncates the rest of the case; an unknown action, a missing key, an invalid `effect` or an unbound `{{name}}` is still `PLAN_ENTRY_INVALID` for the entry.
  2. **A failed action reports a closed cause, never an error text.** `STEP_NOT_PERFORMABLE` carries a `cause` of `covered`, `disabled`, `not_editable`, `absent`, `detached` or `other` derived by pre-checks; reasons stay fixed sentences (the redaction policy). `STEP_NOT_PERFORMABLE` and `PLAN_ENTRY_INVALID` sit in `RUNTIME_REASON_CATALOGUE`, outside `REASON_CATALOGUE`: the first is a `gap`, the second a plan defect and not a decline. `OVERLAY_HANDLER_INVALID` is a declaration halt outside both.
  3. **An element the report names that the product lacks is a `fail`.** Cause `absent`; a locator that matches more than one element still ends `needs-human` `STEP_UNGROUNDED`. This extends entry 106 item 2.
  4. **Assertions continue, interactions stop.** After a failed assertion the `expect_*`, `query` and `judge` steps still run; the first `goto`, `click`, `fill`, `request`, `read_message` or any step with an `effect`, and everything after it, is `not-run`.
  5. **Three vocabulary items reach steps the reports describe without literal text.** A role-only `expect_visible` inside a `within` scope, a closed `number` `pattern` for `expect_text`, and a `within.anchor_text` scope. No planner-written selectors and no forced actions.
  6. **A validation submit is a `click` with `effect: "validation"`.** It needs a dedicated role (the same gate as a write) and an earlier `fill` whose value appears verbatim in the case's manual steps; its requests are recorded; `ground --prefix` never submits.
  7. **Overlays are dismissed only by handlers the project declares.** `overlay_handlers` in `PRPs/auth/qa-seed.json` beside `channel_sources`, registered with `page.addLocatorHandler`, role-and-name or text locators only, every dismissal recorded in the case evidence, a handler with `effect: "write"` registered only for a dedicated role, a dismissal that leaves the guard-approved origin blocks the case `FAILED_NON_LOCAL_TARGET`, never a forced click. The constants are chosen, not measured: 25 firings per handler per page, a 3-second dismissal bound and 10 entries; the dogfood recalibrates them.
  8. **v4 ships as 0.48.0 and is measured on the same two byte-identical reports.** Target at least 90% executed per project and over both, with zero false passes; phase 8 reads it against the frozen table.

  **Reason:** each item removes a reason for a person to do what the runner can do, or makes the remainder precise: a grounding miss is local to one step, a schema error means the planner misread the vocabulary; a closed cause turns "could not be performed" into something the planner can fix without leaking page text; reporting an absent element as a result keeps a product defect from reading as a planning gap; declared handlers are Playwright's documented mechanism and keep every dismissal visible and attributable.

  **Out of scope / not promoted:** any change to entries 105 and 106; the dogfood kit fixes (phase 8); the `uncertain` policy; planner-written selectors and forced actions.

  **Areas affected:** `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/commands/relay-qa-seed.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `documentation/` (governance/decisions, reference/scripts, reference/commands, roadmap/status, changelog).
- **MIRROR**: `# SOURCE: docs/decisions.md:2532-2555`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const count = (s) => s.split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
const now = fs.readFileSync("docs/decisions.md", "utf8");
const was = execFileSync("git", ["show", process.env.BASE + ":docs/decisions.md"], { encoding: "utf8", maxBuffer: 1 << 26 });
const bad = [];
if (count(now) !== count(was) + 1) bad.push("expected exactly one new entry: " + count(was) + " before, " + count(now) + " now");
const heads = now.split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l));
const last = heads[heads.length - 1] || "";
if (!last.startsWith("## [2026-10-25] ")) bad.push("the last entry is not the 2026-10-25 entry: " + last.slice(0, 60));
const i = now.indexOf(last);
const entry = i >= 0 ? now.slice(i, now.indexOf("<!-- Template for future entries:", i)) : "";
const flat = entry.replace(/\s+/g, " ");
for (const s of ["**Context:**", "**Decision:**", "**Reason:**", "**Out of scope / not promoted:**", "**Areas affected:**"]) if (!flat.includes(s)) bad.push("entry lacks " + s);
for (const s of ["STEP_NOT_PERFORMABLE", "PLAN_ENTRY_INVALID", "OVERLAY_HANDLER_INVALID", "RUNTIME_REASON_CATALOGUE", "REASON_CATALOGUE", "addLocatorHandler", "overlay_handlers", "anchor_text", "pattern", "effect: \"validation\"", "dedicated", "forced click", "25 firings", "3-second", "10 entries", "chosen, not measured", "31 of the 87", "0.48.0"]) if (!flat.includes(s)) bad.push("entry does not state: " + s);
for (let n = 1; n <= 8; n++) if (!new RegExp("^" + n + "\\. \\*\\*", "m").test(entry)) bad.push("the Decision list lacks item " + n);
if (/^9\. \*\*/m.test(entry)) bad.push("the Decision list must hold exactly eight items");
if (!now.includes("<!-- Template for future entries:") || now.split("\n---\n").length < 2) bad.push("the closing rule or the template comment was lost");
const FORBIDDEN = ".claude" + "/PRPs";
if (entry.includes(FORBIDDEN)) bad.push("a forbidden path reference in the entry");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: one new 2026-10-25 entry with the required fields and topics");
EOF
```

### Task 9: UPDATE documentation/governance/decisions.html and documentation/roadmap/status.html

- **ACTION**: Delivers AC-A6. Read both pages first (the last `<h3 id>` entry and the index `<ol>` of `decisions.html`; the feature PRD table and the governance counts of `status.html`).
  1. `decisions.html`: add one `<li>` to the index `<ol>` after the existing last row, copying that row's exact form: `<li><a href="#qa-runner-vocabulary-v4">The QA runner degrades by step and names every failure (vocabulary v4)</a></li>`.
  2. After the closing `      </div>` of entry 106 and before `      <h2 id="how-to-add">Adding a new decision</h2>` insert, with a blank line before and after: `<h3 id="qa-runner-vocabulary-v4">107. The QA runner degrades by step and names every failure: vocabulary v4</h3>`, then a `<div class="kv">` with `<dt>Date</dt><dd>2026-10-25</dd>`, a `Context` row summarising the markdown Context, a `Decision` row holding an `<ol>` of exactly 8 `<li><strong>lead</strong> text</li>` items mirroring the markdown list (shortened the way entry 106 shortens its own), and a `Reason` row; no Areas row. Backticks become `<code>`, apostrophes `&#39;`, em dashes `&mdash;`. Do NOT add any other `<h3 id=` to the page.
  3. `status.html`: replace `<li><code>decisions.md</code> — 106 recorded decisions` with `<li><code>decisions.md</code> — 107 recorded decisions` (keep the rest of the line and the em dash character byte-identical), and insert, after the closing `</tr>` of the `qa-runner-ai-executable-steps` row of the feature PRD table, a new row with five cells in the existing form: `<td><code>qa-runner-vocabulary-v4</code></td>`, `<td>8</td>`, `<td><span class="badge badge--partial">phases 1&ndash;7 shipped, dogfood pending</span></td>`, `<td>0.48.0</td>`, and a one-sentence description (`Step-level plan validation, closed failure causes, assertion continuation, role-only presence, number pattern, anchor_text scope, validation submits and declared overlay handlers`). Do not touch any other row.
- **MIRROR**: `# SOURCE: documentation/governance/decisions.html:1016-1022 (the shape of entry 105 as recorded by the 0.47.0 cut plan; entry 106 sits directly below it and Task 9 reads the page for the live lines)`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
const md = fs.readFileSync("docs/decisions.md", "utf8");
const html = fs.readFileSync("documentation/governance/decisions.html", "utf8");
const st = fs.readFileSync("documentation/roadmap/status.html", "utf8");
const n = md.split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
const h3 = (html.match(/<h3 id="/g) || []).length;
const a = html.indexOf("<ol>"), b = html.indexOf("</ol>", a);
const lis = (html.slice(a, b).match(/<li>/g) || []).length;
const bad = [];
if (h3 !== n) bad.push("<h3 id> count " + h3 + " differs from the markdown entry count " + n);
if (lis !== n) bad.push("index <li> count " + lis + " differs from the markdown entry count " + n);
if (!html.includes("<h3 id=\"qa-runner-vocabulary-v4\">107. ")) bad.push("entry 107 heading is missing");
if (!html.includes("<li><a href=\"#qa-runner-vocabulary-v4\">")) bad.push("the index row is missing");
const e = html.slice(html.indexOf("<h3 id=\"qa-runner-vocabulary-v4\">"), html.indexOf("<h2 id=\"how-to-add\">"));
for (const s of ["<dt>Date</dt><dd>2026-10-25</dd>", "<dt>Context</dt>", "<dt>Decision</dt>", "<dt>Reason</dt>", "OVERLAY_HANDLER_INVALID", "RUNTIME_REASON_CATALOGUE", "overlay_handlers"]) if (!e.includes(s)) bad.push("entry 107 lacks: " + s);
if (((e.match(/<ol>[\s\S]*?<\/ol>/) || [""])[0].match(/<li>/g) || []).length !== 8) bad.push("the Decision list must hold 8 items");
if (/\sstyle="/.test(e) || /<script[\s>]/.test(e)) bad.push("an inline style or script in the entry");
const dm = /<code>decisions\.md<\/code> [^0-9]*(\d+) recorded decisions/.exec(st);
if (!dm || Number(dm[1]) !== n) bad.push("status.html decision count " + (dm && dm[1]) + " differs from docs/decisions.md (" + n + ")");
if (st.split("<code>qa-runner-vocabulary-v4</code></td>").length - 1 !== 1) bad.push("the status feature row must occur exactly once");
for (const s of ["phases 1&ndash;7 shipped, dogfood pending", "<td>0.48.0</td>"]) if (!st.includes(s)) bad.push("the new status row lacks: " + s);
if (st.split("<code>qa-runner-ai-executable-steps</code></td>").length - 1 !== 1) bad.push("the earlier feature row must stay exactly once");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the mirror holds " + n + " entries in the page and in the index and status.html counts them");
EOF
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: decisions-mirror and the other 27 checks pass"
```

### Task 10: UPDATE documentation/reference/scripts.html and documentation/reference/commands.html

- **ACTION**: Delivers AC-A5 and AC-A7. Both edits are APPEND-ONLY: every pre-existing line of both pages stays byte-identical (tests pin phrases inside very long single-line rows, including "derived by the runner" on `commands.html`, and the search-index excerpts of both pages are pinned and stay). Read each page's entry first.
  1. `scripts.html`: between `<h2 id="qa-run">` and `<h2 id="qa-seed">`, insert a NEW line directly after the Classification row (a line that starts `        <dt>Classification</dt>`), in the entry's one-line `<dt>X</dt><dd>...</dd>` form, with this content (keep it on one line):

     `        <dt>Step-level resilience</dt><dd>A plan entry degrades by step: a step the runner cannot ground is recorded <code>human</code> with <code>STEP_UNGROUNDED</code> and the rest of the entry runs, an ungrounded <code>click</code>, <code>fill</code> or <code>goto</code> ends the run of the case there, and only a schema error is <code>PLAN_ENTRY_INVALID</code> for the whole entry. A failed action is <code>blocked</code> <code>STEP_NOT_PERFORMABLE</code> with a <code>cause</code> from a closed list (<code>covered</code>, <code>disabled</code>, <code>not_editable</code>, <code>absent</code>, <code>detached</code>, <code>other</code>), and an element the report names that the page lacks is a <code>fail</code> with cause <code>absent</code>. Failed assertions do not consume the case: later <code>expect_*</code>, <code>query</code> and <code>judge</code> steps run, and the first interaction after a failure and every step after it are recorded <code>not-run</code>. The vocabulary gains <code>pattern</code>, <code>anchor_text</code>, a role-only <code>expect_visible</code> and <code>effect: "validation"</code> (dedicated roles only), and <code>PRPs/auth/qa-seed.json</code> may declare <code>overlay_handlers</code> (at most 10 entries, each run at most 25 times per page, a dismissal bounded to 3 seconds; a malformed declaration blocks the case <code>OVERLAY_HANDLER_INVALID</code>).</dd>`
  2. `commands.html`: in the `/relay-qa-run` entry, insert a NEW line (a new `<p>` or `<dd>` row, in the form the entry already uses) after its last existing line, stating in one or two sentences that plan entries degrade by step, that failures carry a closed `cause`, and that the vocabulary gained `pattern`, `anchor_text`, role-only presence, `effect: "validation"` and project-declared `overlay_handlers`, and pointing to the command document `plugins/relay/commands/relay-qa-run.md`. It must contain the tokens `STEP_NOT_PERFORMABLE`, `overlay_handlers`, `anchor_text` and `pattern` inside `<code>` tags.
- **MIRROR**: `# SOURCE: documentation/changelog.html:31-35` (the page conventions: entities, no inline style; the new lines add nothing but text and `<code>`)
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const bad = [];
const removed = (f) => execFileSync("git", ["diff", "--unified=0", process.env.BASE, "--", f], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
for (const f of ["documentation/reference/scripts.html", "documentation/reference/commands.html"]) {
  const r = removed(f);
  if (r.length) bad.push(f + " must be append-only, but " + r.length + " existing line(s) changed");
}
const scr = fs.readFileSync("documentation/reference/scripts.html", "utf8");
const run = scr.slice(scr.indexOf("<h2 id=\"qa-run\">"), scr.indexOf("<h2 id=\"qa-seed\">"));
if (!run.includes("<dt>Step-level resilience</dt><dd>")) bad.push("scripts.html lacks the Step-level resilience row inside the qa-run entry");
for (const s of ["<code>STEP_NOT_PERFORMABLE</code>", "<code>not_editable</code>", "<code>anchor_text</code>", "<code>overlay_handlers</code>", "<code>OVERLAY_HANDLER_INVALID</code>", "<code>not-run</code>"]) if (!run.includes(s)) bad.push("the scripts.html qa-run entry lacks " + s);
const cmd = fs.readFileSync("documentation/reference/commands.html", "utf8");
const i = cmd.indexOf("/relay-qa-run");
const around = i < 0 ? "" : cmd.slice(i);
for (const s of ["<code>STEP_NOT_PERFORMABLE</code>", "<code>overlay_handlers</code>", "<code>anchor_text</code>", "<code>pattern</code>"]) if (!around.includes(s)) bad.push("commands.html lacks " + s + " after the /relay-qa-run entry");
const added = ["documentation/reference/scripts.html", "documentation/reference/commands.html"].flatMap((f) => execFileSync("git", ["diff", "--unified=0", process.env.BASE, "--", f], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")));
if (added.length < 2) bad.push("expected at least two added lines, found " + added.length);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: both reference pages gained the v4 text and lost nothing");
EOF
```

### Task 11: UPDATE documentation/changelog.html

- **ACTION**: Delivers AC-A7. Use the current UTC date as `<date>`; it must be on or after 2026-10-22 and not after today's UTC date. One `Edit`: replace the two lines `      <p>Nothing yet.</p>` + blank line + `      <h2 id="v0-47-0">0.47.0 &#8212; 2026-10-22</h2>` with the same `Nothing yet.` paragraph followed by a new release block and then the unchanged 0.47.0 heading. The new block is, in order:
  - `      <h2 id="v0-48-0">0.48.0 &#8212; <date></h2>`
  - an intro `<p>`: vocabulary v4, step-level resilience; the 0.47.0 dogfood executed 31 of the 87 non-impossible objective steps (35.6%) of the two reference reports against a target of 90%, and most lost steps were not impossible; this release ships phases 1&ndash;7 of `PRPs/prds/qa-runner-vocabulary-v4.prd.md`; phase 8, the counted dogfood on the same two byte-identical reports, follows; the four-outcome vocabulary, the local-only guard, `/relay-qa-report` and `capture.mjs` are unchanged and `npm run validate` still runs 28 checks. The intro must not claim an installation.
  - `      <h3 id="v0-48-0-added">Added</h3>` with a `<ul>` of at least seven `<li><strong>...</strong> &mdash; ...</li>` entries: per-step grounding gaps and interaction truncation; closed failure causes for `STEP_NOT_PERFORMABLE` and an absent report-named element ending `fail`; assertion continuation; role-only presence, the `number` pattern and the `anchor_text` scope; the validation submit; declared overlay handlers (with the three chosen-not-measured numbers); the run-time codes table in the command document.
  - `      <h3 id="v0-48-0-changed">Changed</h3>` with a `<ul>` that records: the command document examples and the corrected `effect` and plan-time grounding sentences; the reworded `ROLE_NOT_DEDICATED` catalogue sentence; `docs/api-reference.md` and the glossary; decision entry 107 in `governance/decisions.html`; `reference/scripts.html`, `reference/commands.html` and `roadmap/status.html`; `README.md`; and, as the LAST item, the section 7.5 manifest-bump line copied from the pattern with `<code>0.47.0</code> &rarr; <code>0.48.0</code>` and `<code>relay/0.48.0/</code>`.
  Hard rules for the new block: it must not contain the word "within" anywhere (a pinned test takes the first "within" on the whole page and expects the 0.47.0 scoped-locator entry around it; write "scope" and name the key `anchor_text` alone), must not contain the word "installed", and must not repeat the opening text of any 0.47.0 or 0.46.0 entry. The 0.47.0 block and everything below it stay byte-identical, and there is exactly one `Unreleased` heading.
- **MIRROR**: `# SOURCE: documentation/changelog.html:31-35`; `# SOURCE: documentation/AGENTS.md:361-366`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const log = fs.readFileSync("documentation/changelog.html", "utf8");
const was = execFileSync("git", ["show", process.env.BASE + ":documentation/changelog.html"], { encoding: "utf8", maxBuffer: 1 << 26 });
const bad = [];
const heads = [...log.matchAll(/<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g)];
const first = heads.find((h) => h[1] !== "unreleased" && /^\d+\.\d+\.\d+/.test(h[2].trim()));
if (!first || first[1] !== "v0-48-0" || !first[2].trim().startsWith("0.48.0 ")) bad.push("the first released heading is not v0-48-0 / 0.48.0");
const date = first ? (/(\d{4}-\d{2}-\d{2})$/.exec(first[2].trim()) || [])[1] : undefined;
const today = new Date().toISOString().slice(0, 10);
if (!date || date < "2026-10-22" || date > today) bad.push("the release date " + date + " is not between 2026-10-22 and " + today);
if ((log.match(/<h2 id="unreleased">/g) || []).length !== 1) bad.push("expected exactly one Unreleased heading");
const unrel = log.slice(log.indexOf("<h2 id=\"unreleased\">"), log.indexOf("<h2 id=\"v0-48-0\">"));
if (!unrel.includes("<p>Nothing yet.</p>")) bad.push("the Unreleased block must hold only Nothing yet.");
const start = log.indexOf("<h2 id=\"v0-48-0\">"), end = log.indexOf("<h2 id=\"v0-47-0\">");
const sec = start >= 0 && end > start ? log.slice(start, end) : "";
if (!sec) bad.push("the 0.48.0 section was not found above the 0.47.0 section");
if (/within/i.test(sec)) bad.push("the 0.48.0 section contains the word within");
if (/\binstalled\b/i.test(sec.replace(/<[^>]+>/g, " "))) bad.push("the 0.48.0 section claims an installation");
for (const s of ["<h3 id=\"v0-48-0-added\">Added</h3>", "<h3 id=\"v0-48-0-changed\">Changed</h3>", "<code>0.47.0</code> &rarr; <code>0.48.0</code>", "<code>relay/0.48.0/</code>", "<code>plugins/relay/.claude-plugin/plugin.json</code>", "anchor_text", "overlay_handlers", "STEP_NOT_PERFORMABLE", "31 of the 87"]) if (!sec.includes(s)) bad.push("the 0.48.0 section lacks: " + s);
const added = sec.slice(sec.indexOf("v0-48-0-added"), sec.indexOf("v0-48-0-changed"));
if ((added.match(/<li>/g) || []).length < 7) bad.push("the Added list must hold at least seven entries");
if ((log.match(/plugins\/relay\/\.claude-plugin\/plugin\.json<\/code><\/strong>\s+&mdash; version bumped <code>0\.47\.0<\/code>/g) || []).length !== 1) bad.push("expected exactly one 0.47.0 to 0.48.0 manifest-bump line");
const oldFrom = was.indexOf("<h2 id=\"v0-47-0\">");
if (oldFrom < 0 || log.slice(log.indexOf("<h2 id=\"v0-47-0\">")) !== was.slice(oldFrom)) bad.push("the 0.47.0 block and everything below it must stay byte-identical");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the 0.48.0 block is cut above an untouched 0.47.0 block");
EOF
```

### Task 12: UPDATE README.md and plugins/relay/.claude-plugin/plugin.json

- **ACTION**: Delivers AC-A7. (1) In `README.md`, replace the anchor `` `plugins/relay` (version 0.47.0, per its `plugin.json`) `` with `` `plugins/relay` (version 0.48.0, per its `plugin.json`) ``; nothing else in the README changes. (2) In `plugins/relay/.claude-plugin/plugin.json`, change the `version` field from `"0.47.0"` to `"0.48.0"`; nothing else changes. Both edits are in the same step as the changelog heading of Task 11, which the `version-parity` check compares with the manifest. `.claude-plugin/marketplace.json` is not edited (the 0.47.0 cut left it unchanged).
- **MIRROR**: `# SOURCE: documentation/AGENTS.md:361-366`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const bad = [];
const pj = JSON.parse(fs.readFileSync("plugins/relay/.claude-plugin/plugin.json", "utf8"));
const bj = JSON.parse(execFileSync("git", ["show", process.env.BASE + ":plugins/relay/.claude-plugin/plugin.json"], { encoding: "utf8" }));
const [bMaj, bMin] = bj.version.split(".").map(Number);
const [nMaj, nMin, nPat] = String(pj.version).split(".").map(Number);
if (!(nMaj === bMaj && nMin === bMin + 1 && nPat === 0)) bad.push("plugin.json " + pj.version + " is not the minor bump of " + bj.version);
if (pj.version !== "0.48.0") bad.push("plugin.json is " + pj.version + ", expected 0.48.0");
const hits = [...fs.readFileSync("README.md", "utf8").matchAll(/`plugins\/relay`\s+\(version\s+(\d+\.\d+\.\d+),\s+per\s+its\s+`plugin\.json`\)/g)].map((m) => m[1]);
if (hits.length !== 1 || hits[0] !== "0.48.0") bad.push("README.md must state version 0.48.0 exactly once, found " + JSON.stringify(hits));
const log = fs.readFileSync("documentation/changelog.html", "utf8");
const heads = [...log.matchAll(/<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g)];
const first = heads.find((h) => h[1] !== "unreleased" && /^\d+\.\d+\.\d+/.test(h[2].trim()));
if (!first || !first[2].trim().startsWith(pj.version + " ")) bad.push("the first released changelog heading does not match the manifest");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: manifest, README and changelog all say 0.48.0");
EOF
```

### Task 13: Final gates (no edit)

- **ACTION**: Delivers AC-A8, AC-A9 and AC-A10. Edits nothing. Runs the `## Validation Commands` Levels 1 to 3 in order against the finished tree and reports each outcome. A corpus failure is not fixed by the Implementer: a failing test that this phase made stale by design (a test that pins the 0.47.0 version, the first released changelog heading, the one-legal-value `effect` wording or the old reason-code prose) is reported by file and name so that the test pair records `EXISTING_TEST_UPDATED` and the Level 3 `ALLOW` list names exactly those files (R-X: the Implementer never edits a test).
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:133-134` (the marked-example regex that Level 2b reuses)
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: npm run validate passes all 28 checks"
```

## Validation Commands

Every command below runs from the worktree root in Git Bash and exits non-zero when its invariant is violated. No reporter output is parsed; every decision is an exit code or an explicit `process.exit(1)`.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import fs from "node:fs";
for (const f of ["plugins/relay/.claude-plugin/plugin.json", "documentation/assets/data/search-index.json"]) {
  try { JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("FAIL: " + f + " is not valid JSON: " + e.message); process.exit(1); }
}
console.log("PASS: both JSON files parse");
EOF
node --check plugins/relay/scripts/qa-run.mjs
git diff --check "$BASE" -- documentation README.md docs plugins/relay
echo "PASS: qa-run.mjs parses and no whitespace error was added"
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: npm run validate passes all 28 checks"
```

### Level 2 CONTENT_INVARIANTS

Level 2a: the scope fence, the frozen surfaces and the version.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import { execFileSync } from "node:child_process";
const BASE = process.env.BASE;
const bad = [];
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const same = (...files) => { try { execFileSync("git", ["diff", "--quiet", BASE, "--", ...files]); return true; } catch { return false; } };
const FROZEN = ["plugins/relay/agents/code-reviewer.md", "plugins/relay/agents/code-reviewer-semantic.md", "plugins/relay/commands/relay-implement.md", "plugins/relay/commands/relay-qa-report.md", "plugins/relay/scripts/visual/capture.mjs"];
if (!same(...FROZEN)) bad.push("a frozen surface differs from the phase-6 tree");
if (!same(".claude-plugin/marketplace.json", "docs/anti-patterns.md", "documentation/governance/anti-patterns.html", "documentation/assets/js", "documentation/assets/css", "documentation/assets/data/search-index.json", "scripts")) bad.push("the marketplace, the anti-pattern mirror, the NAV script, the stylesheet, the search index or scripts/ changed");
const names = new Set([...git("diff", "--name-only", BASE).split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter((n) => n && !n.startsWith("PRPs/")));
const PLANNED = ["plugins/relay/scripts/qa-run.mjs", "plugins/relay/commands/relay-qa-run.md", "plugins/relay/commands/relay-qa-seed.md", "plugins/relay/.claude-plugin/plugin.json", "README.md", "docs/api-reference.md", "docs/domain/glossary.md", "docs/decisions.md", "documentation/governance/decisions.html", "documentation/roadmap/status.html", "documentation/reference/scripts.html", "documentation/reference/commands.html", "documentation/changelog.html"];
for (const n of names) if (!PLANNED.includes(n) && !n.startsWith("docs/context/")) bad.push("changed outside the plan scope: " + n);
for (const n of PLANNED) if (!names.has(n)) bad.push("a planned file was not changed: " + n);
for (const n of names) if (/\.test\.mjs$/.test(n)) bad.push("a test file changed (R-X): " + n);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the frozen surfaces, the scope fence and the no-test-edit rule hold");
EOF
```

Level 2b: every marked example and the overlay declaration validate against the script, and the reason-code table agrees with the runner.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const t = fs.readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8");
const bad = [];
const examples = [...t.matchAll(/<!-- qa-step-example driver=(\w+) -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g)];
if (examples.length < 20) bad.push("expected the earlier examples plus the four new ones, found " + examples.length);
for (const x of examples) {
  const step = JSON.parse(x[2]);
  const r = m.validateStep(x[1], step);
  if (r) bad.push("a marked example does not validate: " + x[2] + " -> " + r.reason);
}
for (const x of t.matchAll(/<!-- qa-plan-entry-example -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g)) {
  const r = m.validatePlanClassification(JSON.parse(x[1]));
  if (r) bad.push("a plan-entry example does not validate: " + r.reason);
}
const rows = new Map([...t.matchAll(/^\| `([A-Z_]+)` \| `(needs-human|blocked)` \| `(impossible|gap)` \|/gm)].map((x) => [x[1], { o: x[2], c: x[3] }]));
for (const [code, spec] of Object.entries(m.REASON_CATALOGUE)) {
  const r = rows.get(code);
  if (!r || r.o !== spec.disposition || r.c !== spec.class) bad.push("the catalogue table disagrees with the runner for " + code);
}
for (const code of Object.keys(m.RUNTIME_REASON_CATALOGUE)) if (!t.includes("`" + code + "`")) bad.push("the run-time code is not documented: " + code);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: " + examples.length + " marked examples validate and the reason-code table agrees with the runner");
EOF
```

Level 2c: the install is not claimed and the pages follow the site invariants on the added lines.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
export BASE="$(tr -d '\r\n' < PRPs/reports/qa-runner-vocabulary-v4/phase-7/base-tree.txt)"
node --input-type=module <<'EOF'
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const BASE = process.env.BASE;
const bad = [];
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const FILES = ["documentation/changelog.html", "documentation/reference/scripts.html", "documentation/reference/commands.html", "documentation/roadmap/status.html", "documentation/governance/decisions.html"];
const addedOf = (f) => git("diff", "--unified=0", BASE, "--", f).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
const added = FILES.flatMap(addedOf);
const PICT = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2300}-\u{23FF}]/u;
for (const re of [/\sstyle="/, /<style[\s>]/, /<link[\s>]/, /<img[\s>]/, /<script[\s>]/, /(?:href|src)="\/(?!\/)/, PICT]) if (added.some((l) => re.test(l))) bad.push("an added line violates the site invariants: " + re);
if (added.some((l) => l.includes("\r"))) bad.push("a CR was added");
const css = fs.readFileSync("documentation/assets/css/app.css", "utf8");
const known = new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((x) => x[1]));
for (const l of added) for (const cm of l.matchAll(/class="([^"]+)"/g)) for (const c of cm[1].split(/\s+/)) if (c && !known.has(c)) bad.push("a CSS class the stylesheet does not define: " + c);
const FORBIDDEN = ".claude" + "/PRPs";
const allAdded = [...added, ...["plugins/relay/commands/relay-qa-run.md", "plugins/relay/commands/relay-qa-seed.md", "docs/decisions.md", "docs/api-reference.md", "docs/domain/glossary.md"].flatMap(addedOf)];
if (allAdded.filter((l) => l.includes(FORBIDDEN)).some((l) => !l.includes("MUST NOT appear"))) bad.push("a forbidden path reference was introduced outside a quoted prohibition");
for (const f of FILES) {
  const body = fs.readFileSync(f, "utf8");
  for (const l of addedOf(f)) for (const im of l.matchAll(/\bid="([^"]+)"/g)) if (body.split("id=\"" + im[1] + "\"").length - 1 !== 1) bad.push(f + ": id is not unique: " + im[1]);
  if ((body.match(/<h1[\s>]/g) || []).length !== 1) bad.push(f + " must carry exactly one h1");
}
const intro = fs.readFileSync("documentation/changelog.html", "utf8");
const sec = intro.slice(intro.indexOf("<h2 id=\"v0-48-0\">"), intro.indexOf("<h2 id=\"v0-47-0\">"));
if (/\binstalled\b/i.test(sec.replace(/<[^>]+>/g, " "))) bad.push("the 0.48.0 changelog block claims an installation");
const dec = fs.readFileSync("docs/decisions.md", "utf8");
const entry = dec.slice(dec.lastIndexOf("## [2026-10-25]"), dec.indexOf("<!-- Template for future entries:"));
if (/\b(is|was|has been) installed\b/i.test(entry)) bad.push("the decision entry claims an installation");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: " + added.length + " added documentation lines, no site invariant broken and no installation claimed");
EOF
```

### Level 3 INTEGRATION

The corpus gate (a gate in this phase, unlike phases 1 to 6). `ALLOW` names the test files the test pair has declared `EXISTING_TEST_UPDATED` for this phase (empty until the pair has run; see `## Notes`); a file in `ALLOW` is still run and may fail. `FLAKE_BUDGET` is 2: a first corpus failure is followed by one re-run of the corpus, and then each failing file is run alone; only a file that fails alone and is not in `ALLOW` fails the gate. Windows Git Bash: the glob is quoted so that Node expands it itself (never `node --test <dir>`, which fails with MODULE_NOT_FOUND).

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module <<'EOF'
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const ALLOW = [];
const FLAKE_BUDGET = 2;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === "node_modules" ? [] : walk(path.join(d, e.name))) : e.name.endsWith(".test.mjs") ? [path.join(d, e.name).replaceAll("\\", "/")] : []);
const files = walk("scripts/validate");
const run = (args) => spawnSync(process.execPath, ["--test", ...args], { stdio: "ignore" }).status === 0;
let ok = false;
for (let attempt = 1; attempt <= FLAKE_BUDGET && !ok; attempt++) {
  ok = spawnSync(process.execPath, ["--test", "scripts/validate/**/*.test.mjs"], { stdio: "inherit" }).status === 0;
  if (!ok) console.error("corpus attempt " + attempt + " failed");
}
if (ok) { console.log("PASS: the corpus is green (" + files.length + " test files)"); process.exit(0); }
const failing = files.filter((f) => !run([f]));
const unexpected = failing.filter((f) => !ALLOW.some((a) => f.endsWith(a)));
if (unexpected.length) { console.error("FAIL: these files fail alone and are not allow-listed:\n" + unexpected.join("\n")); process.exit(1); }
if (failing.length === 0) { console.error("FAIL: the corpus failed in every attempt but every file passes alone: a cross-file defect, report it"); process.exit(1); }
console.log("PASS: only allow-listed files fail: " + failing.join(", "));
EOF
```

## Acceptance Criteria

- **AC-A1 (PRD AC-15):** `plugins/relay/commands/relay-qa-run.md` carries, for `pattern`, `within.anchor_text`, role-only presence (`expect_visible` with `within` and `role`, no name) and `effect: "validation"`, a literal flat example preceded by its `<!-- qa-step-example driver=browser -->` marker, and every marked example validates against the script's `validateStep`. Delivered by Task 3; observed by Task 3's check and Level 2b.
- **AC-A2 (PRD AC-15):** The command document shows the `overlay_handlers` declaration of `PRPs/auth/qa-seed.json` as an unmarked json example (as `channel_sources` is shown) that validates against `classifyOverlayHandlers`, and states its rules and the three chosen-not-measured constants (10 entries, 25 firings per handler per page, a 3-second dismissal). Delivered by Task 5; observed by Task 5's check.
- **AC-A3 (PRD AC-15):** The command document states the per-step grounding gap and interaction-truncation rules, the closed `STEP_NOT_PERFORMABLE` causes and the absent-element `fail`, assertion continuation and the validation-submit gates, and its run-time codes table documents `STEP_NOT_PERFORMABLE`'s causes, `PLAN_ENTRY_INVALID` as a plan defect and `OVERLAY_HANDLER_INVALID`, while the catalogue table still agrees with `REASON_CATALOGUE`. Delivered by Tasks 3 and 4; observed by Task 4's check and Level 2b.
- **AC-A4 (PRD AC-15):** No sentence of the command document or of the `ROLE_NOT_DEDICATED` catalogue text contradicts the script: the one-legal-value `effect` sentence and the plan-time `PLAN_ENTRY_INVALID` sentences for an ungrounded locator are corrected, and the fixed `ROLE_NOT_DEDICATED` sentence covers a validation step. Delivered by Tasks 2, 3 and 4; observed by their checks.
- **AC-A5 (PRD AC-15):** The usage and reference documents match the script: `docs/api-reference.md` names the phase 1 to 6 exports (each verified exported) and the new keys, codes and step results; the glossary says "none present" fails with cause `absent`; `relay-qa-seed.md` recommends `overlay_handlers` in prose only; `scripts.html` and `commands.html` carry the v4 text without changing a pre-existing line. Delivered by Tasks 6, 7 and 10; observed by their checks.
- **AC-A6 (PRD AC-18):** `docs/decisions.md` carries exactly one new `[2026-10-25]` entry (Context, an eight-item Decision list, Reason, not-promoted paragraph, Areas affected) recording the v4 design, and `documentation/governance/decisions.html` mirrors it with one `<h3 id>` numbered 107 and one index row so `decisions-mirror` passes; `status.html` states 107 decisions and carries the feature row. Delivered by Tasks 8 and 9; observed by Task 9's check and Level 1.
- **AC-A7 (PRD AC-18):** `plugin.json` carries the minor bump `0.47.0` to `0.48.0`, `documentation/changelog.html`'s first released heading is `v0-48-0` with a valid date and the section 7.5 manifest-bump line, the 0.47.0 block is byte-identical, and `README.md` names the version once, so `version-parity` passes; the pages follow `documentation/AGENTS.md`. Delivered by Tasks 10, 11 and 12; observed by Task 11's and Task 12's checks, Level 2c and Level 1.
- **AC-A8 (PRD AC-17):** `npm run validate` passes all 28 checks and the corpus `node --test "scripts/validate/**/*.test.mjs"` exits 0 on the finished tree (or fails only in allow-listed test files declared by the test pair). Delivered by Task 13; observed by Level 1 and Level 3.
- **AC-A9 (PRD AC-18):** No page, entry or changelog section written by this phase claims that the new version is installed; the install and its verification are stated as ordered operator steps in `## Notes`. Delivered by Tasks 8, 9 and 11; observed by Level 2c.
- **AC-A10 (PRD AC-17):** The release is limited to the planned files: the five frozen surfaces, the marketplace manifest, the anti-pattern mirror, the NAV script, the stylesheet, the search index and `scripts/` are byte-identical to the phase-6 tree, `qa-run.mjs` differs by exactly the one reworded line, and no test file changed. Delivered by Tasks 2 and 13; observed by Task 2's check and Level 2a.

R8b note: every bullet above names the PRD acceptance criterion it derives from. Task 1 is infrastructure (it records the diff base) and delivers no criterion.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The command document drifts from the script it describes | M | H | Every marked example runs through `validateStep`, the overlay declaration through `classifyOverlayHandlers`, the constants in the text are read from the live module, and the api-reference export names are checked as exported (Tasks 3, 5, 7; Level 2b) |
| A pinned test reads a sentence this phase changes (the old `effect` wording, the reason-code prose, the first released changelog heading, the 0.47.0 manifest version) | M | M | Predicted and routed, not edited: `## Notes` lists them; Level 3 finds any other; the test pair records `EXISTING_TEST_UPDATED` and the `ALLOW` list names exactly those files |
| The new changelog block turns a pinned changelog test red (the first "within" on the page, an entry that must occur once) | M | M | Task 11 forbids the word "within" and any installation claim in the new block and keeps the 0.47.0 block byte-identical; its check asserts each |
| An edit to a very long single-line row (`api-reference.md` rows 129 and 219) moves a phrase a test pins | M | M | Both edits are anchored insertions of one clause or sentence; the retained phrases (the twelve codes, `a classification block beside the unchanged four-key counts`) are asserted present, and there must stay exactly one `qa-run.mjs` row |
| `decisions-mirror` goes red between Task 8 and Task 9 | H | L | Expected and intentional: only Task 9's VALIDATE runs `npm run validate` |
| The phase-6 tree object recorded by Task 1 is garbage collected after the work is committed | M | L | The fences depend on it only while the tree exists; if `git cat-file -e` fails, use the last commit that contains phase 6 as the base and say so in the report |
| The install is not performed by this phase and row 7 may read `complete` before it happens | H | L | The install clause is cited, put in `## NOT Building` and given as ordered operator steps in `## Notes`; AC-A9 checks that no page claims it |
| A statement in the new prose is stronger than the code (for example how `ground --prefix` treats an `effect`) | M | M | Tasks 3-5 and 8 require reading the cited code first and stating what the code does; the pinned fragments are limited to facts verified in `qa-run.mjs` |
| The planner-facing guidance "plan the step anyway; decline only when no step can run" over- or under-states the new behavior | L | M | It follows PRD AC-1 and AC-2 and the `STEP_GAP_REASON` / `STEP_TRUNCATED_REASON` constants; the phase 8 dogfood is where it is exercised |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Predicted stale tests (`EXISTING_TEST_UPDATED`, the test pair's, never the Implementer's):** (1) `scripts/validate/checks/qa-run-release-0-47-0.test.mjs` (its AC-25 assertions around the manifest version, the first released heading and the manifest-bump line may be written against the live manifest or against the literal `0.47.0`; the 0.48.0 cut is what makes a literal one stale); (2) any test that pins the old `effect` wording ("one legal value") or the plan-time prose now corrected in the command document (`qa-run-chosen-inputs.test.mjs:546` reads only the tokens `"effect"`, `"write"`, `"dedicated": true`, `ROLE_NOT_DEDICATED` and `never write it`, which remain); (3) `qa-run-scoped-locators.test.mjs:598-605` takes the first `within` on the whole changelog page and is guarded, not stale, by Task 11's no-"within" rule. Tests read the `ROLE_NOT_DEDICATED` sentence through the exported constant (`qa-run-chosen-inputs.test.mjs:452`, `qa-run-validation-submit.test.mjs:388-390`), so the Task 2 reword does not make them stale. Level 3 will name any other; the `ALLOW` list is then filled with exactly those files.
- **Decisions made in this plan (the orchestrator asked for them):** the `ROLE_NOT_DEDICATED` sentence is reworded (Task 2) because the gate now covers validation steps and the tests read it through the constant; the glossary's "none visible" is corrected to "none present" with the present-but-hidden case stated (Task 7); the `GROUND_PREFIX_FAILED` sentence "could not be found or acted on" is left as it is because prefix steps are only `goto`, `click` and `fill`; `OVERLAY_HANDLER_INVALID`, `STEP_NOT_PERFORMABLE` and `PLAN_ENTRY_INVALID` are documented in a separate run-time table whose Kind cell is plain unbackticked text (`run-time gap`, `plan defect`, `declaration defect`), so the `qa-run-contract` row regex (header-independent: it reads only the first three cells and matches a backticked `impossible` or `gap`) never takes them for catalogue rows; the prose still calls `STEP_NOT_PERFORMABLE` a gap; a seed-file declaration (`overlay_handlers`) is shown unmarked like `channel_sources`, because the marker loop would run it through `validateStep`.
- **`qa-run-contract` is not extended here.** The PRD's Phase 7 scope mentions extending the check. Its existing loop already runs every marked example through `validateStep` and the catalogue table through `REASON_CATALOGUE`, and this plan's Levels pin the new keys. Naming the new keys inside the check is a change to the check and its test file; the operator can request it as a follow-up for the test pair. The count stays 28.
- **How the install clause is handled.** The in-tree part of AC-18 (minor bump, changelog, `documentation/` per `documentation/AGENTS.md`) is delivered; the install is recorded as an operator step after merge and no way to install from the worktree is invented. Operator steps, in order: (1) `/relay:relay-commit qa-runner-vocabulary-v4` commits the worktree locally. (2) `/relay:relay-pr qa-runner-vocabulary-v4` pushes and opens the pull request (`--repo fabiombarreto/PRPs-agentic-eng`, base `development`). (3) Merge with a merge commit, never a rebase or a force-push (`/relay:relay-approve <pr>`). (4) In the main checkout `C:\repos\PRPs-agentic-eng`, have `development` checked out and up to date (the directory marketplace `relay-marketplace` points there). (5) `claude plugin marketplace update relay-marketplace`. (6) `claude plugin update relay@relay-marketplace`, which creates the fresh `relay/0.48.0/` cache directory. (7) Restart Claude Code. (8) Confirm `0.48.0` in the `/plugin` panel or `installed_plugins.json`. (9) Run `node "<cache>/relay/0.48.0/scripts/qa-run.mjs" preflight --root <target>` for each target project; a fresh cache has no Playwright `node_modules`, so the first `preflight` is expected to halt `FAILED_PLAYWRIGHT_UNAVAILABLE` naming the cache directory and the one provisioning command, which the operator runs once (it downloads packages, so the loop never runs it) before re-running `preflight`. Phase 8 starts only after this.
- **Diff base for review.** This phase's full diff is `git diff <tree recorded by Task 1>` filtered to exclude `PRPs/`, plus `git ls-files --others --exclude-standard`; the single-argument form only (never `<tree>..HEAD`, never HEAD-relative: phases 1 to 6 are uncommitted in this worktree). The tree is recorded with a temporary index so the real index is untouched.
- **Docs-sync division.** The implement-time docs-sync pass is scoped to `docs/context/` and `docs/domain/` and must not write `documentation/`; this plan edits `documentation/` explicitly as the Implementer's planned work, and `docs/domain/glossary.md` explicitly in Task 7. The pass is expected to add nothing to the files this plan touches.
- **What no command here can do.** `documentation/AGENTS.md` section 8 step 8 (open the pages in a browser, check the sidebar, the table of contents, the theme toggle and the search) is a human step; the structural gates above stand in for it and do not replace it.
- **Host.** Windows with Git Bash: every git and node command carries the `core.fsmonitor` environment prefix, node paths are relative or `C:/...`, all files are LF, `node_modules` is a junction (never modified, never `npm install`), and `npm run validate` stays at exactly 28 checks.
- **Research.** `research-codebase` and `research-web` were not dispatched by this run: the grounding was done by reading the PRD, the command document, `qa-run-contract.mjs` and the previous release plan directly, and by one read-only exploration of `qa-run.mjs`, the docs and the test pins (its facts are the exports, constants, reason strings and test-pin locations cited above). `research-web` has no value for a repository-local release cut. Recorded as a degradation: `Patterns to Mirror` anchors for `decisions.html` come from the 0.47.0 cut plan, not from a fresh read of that page, and Task 9 reads the live page first.

*Generated: 2026-10-25*
*Approved: 2026-10-25*
*Implemented: 2026-10-25*
*Status: IMPLEMENTED*
