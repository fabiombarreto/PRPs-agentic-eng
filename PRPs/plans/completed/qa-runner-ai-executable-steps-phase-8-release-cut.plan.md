# Feature: Release cut (Phase 8 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); release cut (plugin manifest version lock-step with the changelog, the binding `documentation/AGENTS.md` contract for every `documentation/` edit); registration of a decision entry (`docs/decisions.md` mirrored mechanically into `documentation/governance/decisions.html` by the `decisions-mirror` check); impact on shared contracts (`version-parity`, `registration-parity`, `decisions-mirror`, `path-existence`, `line-endings`, `qa-run-contract`, `auth-secrecy`); a phase whose last clause (the install) cannot be performed by the autonomous loop
- Decisions found:
  - [2026-04-30] "Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html": a minor changelog release bumps `plugins/relay/.claude-plugin/plugin.json` to the same value in the same commit (`documentation/AGENTS.md` section 7.5)
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute` never commits, pushes or opens a PR, so the install (which needs the work committed and merged) is operator-owned
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": closed outcome vocabulary, the local-only guard is permanent, secrets never reach reports, the human gate stays open
  - [2026-10-06] "Provisioning the visual tooling's `node_modules` in every new plugin cache is a registered backlog item (F10)": phase 7 answered its three questions with an actionable halt; the new entry builds on it and does not re-register it
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the model for folding several per-phase candidates into one entry at feature close
  - [2026-07-09] every `## Validation Commands` entry and per-task `VALIDATE` carries real exit-code semantics; [2026-07-10] R-X strict: the Implementer authors zero test files and test edits go through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` "What We're NOT Building" (frozen surfaces, no 29th validate check) and Decisions Log
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the decision entry and the pages describe the redaction rules and never relax them
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": the install is never performed by the loop, so no task here runs it
  - "Weakening or deleting tests to make the auto-correction loop turn green": no known assertion is made stale by this design (see `## Notes`); one the test pair finds that this analysis missed is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer
- Applicable architectural rules:
  - `documentation/AGENTS.md` is binding: no build step, no new CSS or JS file, no inline `style`, no emoji, relative paths only, the canonical page template, the three-file registration rule (not triggered: no page is added), the section 7.5 lock-step, and every `documentation/` change carries a changelog entry
  - Interactivity boundary: no new extension; this phase writes documentation, one decision entry and one manifest field
  - PRP artifact paths: this plan and every artifact path resolve under `PRPs/`
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form with the tree object `c8fdfd008509a2a72f5b2faa4260fcff21bc7ead` (the phase-7 end state), never HEAD-relative and never `<tree>..HEAD`
  - `npm run validate` keeps its 28 checks
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 8: "Release cut" — Goal: ship the work as one minor version — Success signal: the installed version runs `preflight` clean on both target projects (PRD AC-24 and AC-25).

The install clause is operator-owned. PRD AC-25 ends with "and the new version is installed" and the row 8 Success signal names the installed version. `/relay-execute` never commits, pushes, opens a PR or installs (`docs/decisions.md` 2026-05-18), and the install needs the work committed and merged, so this plan delivers a release-ready tree and states the install and its verification as ordered operator steps in `## Notes`. No acceptance criterion below claims that the install happened.

## Summary

Cut the 0.47.0 release that ships phases 1 to 7 of `qa-runner-ai-executable-steps` (vocabulary v3) and close the documentation items the earlier phases routed to the cut. `plugins/relay/.claude-plugin/plugin.json` goes from `0.46.0` to `0.47.0`; `documentation/changelog.html` turns its `Unreleased` block (8 Added and 6 Changed entries) into a dated `0.47.0` release with a fresh `Unreleased` above it, an intro paragraph and the section 7.5 manifest-bump line; `README.md` names the new version. One dated entry in `docs/decisions.md`, mirrored into `documentation/governance/decisions.html` and into the status page's decision count, registers the candidate decisions accumulated in the phase 1 to 7 docs-update manifests. `documentation/reference/scripts.html` gets the two routed fixes (the runner-owned reason codes, and the stale "never a crash" Dependencies sentence) plus the impossible/gap class and counter names the `qa-run.mjs` entry still lacks, and `documentation/roadmap/status.html` gets the feature row. No plugin-owned text, no test, no check, no search-index excerpt and none of the frozen surfaces is touched. The implementer delivers a tree on which `npm run validate` passes 28 of 28 and the corpus is green; committing, the PR, the merge and the install are the operator's steps after this phase.

## User Story

As the operator of relay's human validation gate
I want the vocabulary-v3 runner cut, versioned, documented and its design decisions recorded
So that the phase 9 dogfood runs on a named installed version and the pages and the decision log say what the runner now does

## Problem Statement

Phases 1 to 7 changed `qa-run.mjs`, the `/relay-qa-run` and `/relay-qa-seed` command documents and the kit documentation, but the manifest still says `0.46.0`, the changelog holds the work under `Unreleased`, and the README names `0.46.0`. Two sentences of `documentation/reference/scripts.html` are stale: the Classification row says only `PARTIAL_REMAINDER` is runner-owned although `RUNNER_OWNED_REASON_CODES` holds three codes (`qa-run.mjs:2488`), and the Dependencies row says missing Playwright makes the cases `blocked`, "never a crash", although `run` now also prints the resolved plugin directory and the one provisioning command on stderr and exits 1 (`qa-run.mjs:5136-5138`). The design decisions of the feature (impossible-only `needs-human`, executed product defects, the visibility conjunction, run-time grounding, dedicated-role writes, the pending-then-judged model, local channel sources, the actionable F10 halt, the codes kept outside the catalogue) sit only in per-phase manifests, which the phase 2 manifest asked to register "as a single dated entry at the release cut" (`PRPs/reports/qa-runner-ai-executable-steps/phase-2/docs-update.md:37`).

## Solution Statement

One serial pass: the two `scripts.html` sentences, the decision entry (markdown, then its HTML mirror, then the status count), the status feature row, then the release cut itself as the last edits (README, changelog, manifest) so the changelog entries can list what was done. Every edit is an anchored `Edit` (never a `Write` of a whole page: very long single-line `<dd>` rows are read by pinned tests). The cut follows the shape of the 0.46.0 cut: a fresh `<h2 id="unreleased">` with `<p>Nothing yet.</p>` above the new release, the old `unreleased-*` subsection ids renamed to the release id, the existing entries moved byte-identical and none copied, and the manifest-bump line under `Changed`. A scope fence compares the working tree with the phase-7 tree so no file outside this plan changes.

## Metadata

| Key | Value |
|-----|-------|
| Type | documentation, release cut |
| Complexity | MEDIUM (7 files; the changelog edit moves a 14-entry block; the decision entry is mirrored in 3 places that `decisions-mirror` and the status page read) |
| Systems Affected | `plugins/relay/.claude-plugin/plugin.json`; `README.md`; `documentation/changelog.html`; `documentation/reference/scripts.html`; `documentation/roadmap/status.html`; `docs/decisions.md`; `documentation/governance/decisions.html` |
| Dependencies | `Depends` is `3, 4, 5, 6, 7` (all `complete`); Phase 9 (the dogfood) follows and needs the install the operator performs |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 108-109 (AC-24, AC-25), 212 (row 8), 252-255 (Phase 8 details), 264-277 (Decisions Log) |
| phase_type | docs |

`phase_type: docs`: the `## Files to Change` table holds only documentation, one decision log and one JSON manifest, and no application source. Validation is content-and-exit-code oriented; the corpus runs at Level 3 as a regression gate.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 239-286, 288-380 | BINDING contract for every `documentation/` edit: invariants, the changelog rules (7.2, 7.3 rename `Unreleased` and start a fresh block), the section 7.5 manifest lock-step, the three-file registration rule (not triggered here) |
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 108-109, 212, 252-255, 264-277 | AC-24 and AC-25, row 8, the Phase 8 details and the Decisions Log the new entry summarises |
| P0 | `documentation/changelog.html` | 31-111, 113-126, 207-213 | The `Unreleased` block that is cut (8 Added, 6 Changed), the 0.46.0 release head, and the manifest-bump line a release carries |
| P0 | `scripts/validate/checks/qa-run-release-cut.test.mjs` | 65, 90-145, 151-155 | Read-only: what a cut must keep (README version once, first release id and date, one fresh `Unreleased` with `Nothing yet.`, entries moved not copied, the three carried-over 0.46.0 entries occurring once) |
| P0 | `scripts/validate/checks/version-parity.mjs` | 46-62 | The heading regex (`<h2 id>` whose text has no nested tag and starts with `X.Y.Z`) that makes the cut red when manifest and first release heading disagree |
| P0 | `docs/decisions.md` | 2473-2543 | The format of the last entries (`## [date] Title`, `**Context:**`, `**Decision:**`, `**Reason:**`, `**Areas affected:**`), the multi-topic model (2026-09-25 hybrid entry at 2473-2488), the closing `---` and the commented template |
| P0 | `documentation/governance/decisions.html` | 33-43, 1016-1024 | The index `<ol>` (one `<li>` per entry) and the HTML shape of the last entry (`<h3 id>` then a `kv` block with Date, Context, Decision, Reason) |
| P0 | `scripts/validate/checks/decisions-mirror.mjs` | 56-77 | The mirror compares only counts: md lines matching `^## \[\d{4}-\d{2}-\d{2}\]` against `<h3 id="` occurrences and against the first `<ol>`'s `<li>` count |
| P0 | `documentation/reference/scripts.html` | 217-229 | The `qa-run.mjs` rows edited by Task 1 (Classification at 219, Dependencies at 229) |
| P0 | `documentation/roadmap/status.html` | 236-250, 287-288 | The feature PRD table end and the governance counts edited by Task 4 |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 2488, 2730, 2741-2743, 5136-5138 | `RUNNER_OWNED_REASON_CODES`, the path-free reason, the provisioning text and the stderr/exit-1 path the Dependencies row must describe |
| P1 | `plugins/relay/commands/relay-qa-run.md` | 128-131 | The command document's statement of the halt and the one provisioning command |
| P1 | `PRPs/reports/qa-runner-ai-executable-steps/phase-2/docs-update.md` | 21-38 | Read-only (git-ignored run artifact): the candidate decisions of phases 1-2 and the request to register them once at the cut |
| P1 | `PRPs/reports/qa-runner-ai-executable-steps/phase-3/docs-update.md`, `phase-4/`, `phase-5/`, `phase-6/`, `phase-7/` | 14-23 | Read-only: the candidates of phases 3 to 7 (scoped locators and runner-owned codes; dedicated writes; pending-then-judged; channel sources; F10 and the codes outside the catalogue) |
| P1 | `README.md` | 16 | The one live version string no check reads except `qa-run-release-cut.test.mjs` |

## Patterns to Mirror

```
# SOURCE: documentation/changelog.html:113-126
      <h2 id="v0-46-0">0.46.0 &#8212; 2026-10-13</h2>

      <p>Grounding and vocabulary v2. The 0.44.0 and 0.45.0 re-runs drove 1 of 14 reachable cases across
        <code>super-ensino</code> and <code>praesto-sum</code> although authentication was solved. ...
        <code>/relay-auth-scripts --refresh</code>.</p>

      <h3 id="v0-46-0-added">Added</h3>
```
Copied by Task 6 (the new release block has this exact shape: an `<h2 id="vX-Y-Z">` whose text is plain `X.Y.Z &#8212; YYYY-MM-DD` with no nested tag, an intro `<p>`, then the `Added` and `Changed` subsections whose ids carry the release id).

```
# SOURCE: documentation/changelog.html:207-212
        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
          &mdash; version bumped <code>0.45.0</code> &rarr; <code>0.46.0</code> to
          match this release; users running <code>/plugin</code> after pulling
          this version will get a fresh <code>relay/0.46.0/</code> cache directory
          with the grounding, redaction and vocabulary changes of <code>/relay-qa-run</code> registered. The login
          template and its stamp are unchanged, so scripts generated by 0.45.0 stay current.</li>
```
Copied by Task 6 (the section 7.5 manifest-bump line; it is the last `Changed` entry and names the manifest path, both versions and the cache directory).

```
# SOURCE: documentation/changelog.html:31-36
      <h2 id="unreleased">Unreleased</h2>

      <h3 id="unreleased-added">Added</h3>

      <ul>
        <li><strong>Impossible and gap classes for the QA runner&rsquo;s reason codes</strong> &mdash; every code of the
```
Copied by Task 6 (the two anchors the cut rewrites: the `Unreleased` heading plus the `unreleased-added` subsection, and later `<h3 id="unreleased-changed">Changed</h3>` at line 86).

```
# SOURCE: docs/decisions.md:2473-2488
## [2026-09-25] The hybrid /code-review pass affects a verdict only under four named conditions, and a missing drift-gate status re-enables it

**Context:** ... the phase manifests proposed separate candidates and the operator promoted them as one entry ...
**Decision:** ... numbered list of bold-lead conditions ...
**Reason:** ...
**Out of scope / not promoted:** ...
**Areas affected:** ...
```
Copied by Task 2 (the model for folding several per-phase candidates into one dated entry: a Context that says where the candidates came from, a numbered Decision list, a Reason, a not-promoted paragraph, then Areas affected).

```
# SOURCE: documentation/governance/decisions.html:1016-1022
      <h3 id="separate-from-upstream">105. Separating relay from the upstream Wirasm repository: registered backlog item</h3>
      <div class="kv">
        <dt>Date</dt><dd>2026-10-09</dd>
        <dt>Context</dt><dd>...</dd>
        <dt>Decision</dt><dd>...</dd>
        <dt>Reason</dt><dd>...</dd>
      </div>
```
Copied by Task 3 (the HTML mirror of one entry: backticks become `<code>`, apostrophes `&#39;`, dashes `&mdash;`; there is no Areas row on the site; the Decision `<dd>` of the hybrid entry holds an `<ol>` of `<li><strong>...</strong> ...</li>` items).

```
# SOURCE: documentation/roadmap/status.html:242-248
          <tr>
            <td><code>qa-runner-grounding-vocabulary-v2</code></td>
            <td>8</td>
            <td><span class="badge badge--partial">phases 1&ndash;7 shipped, dogfood pending</span></td>
            <td>0.46.0</td>
            <td>Stable grounding, text candidates, ...</td>
          </tr>
```
Copied by Task 4 (the new feature row has these five cells; `badge--partial` is one of the four badge variants `documentation/AGENTS.md` allows).

```
# SOURCE: documentation/reference/scripts.html:219
        <dt>Classification</dt><dd>The plan carries a <code>class</code> per case (...) ... <code>PARTIAL_REMAINDER</code> is runner-owned (<code>RUNNER_OWNED_REASON_CODES</code>) and a plan may not declare it. ...
```
Copied by Task 1 (the `qa-run.mjs` entry uses one-line `<dt>X</dt><dd>...</dd>` rows; only the quoted sentence is replaced).

```
# SOURCE: scripts/validate/checks/version-parity.mjs:46-56
function extractLatestChangelogVersion(changelogHtml) {
  const headingRe = /<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g;
  let match;
  while ((match = headingRe.exec(changelogHtml)) !== null) {
    const id = match[1];
    const text = match[2];
    if (id === 'unreleased') continue;
    const versionMatch = text.trim().match(/^\d+\.\d+\.\d+/);
```
Copied by Task 6 and Task 7 (the release heading must carry no nested tag, start with `X.Y.Z`, and be the first non-`unreleased` `<h2>`; the validation reuses this regex).

```
# SOURCE: README.md:16
`plugins/relay` (version 0.46.0, per its `plugin.json`) contains 23
```
Copied by Task 5 (the live version string; `qa-run-release-cut.test.mjs:90-94` requires exactly one match of `(version X.Y.Z, per its `plugin.json`)` equal to the manifest).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `documentation/reference/scripts.html` | UPDATE | `qa-run.mjs` entry: Classification row names all three runner-owned codes and the impossible/gap classes and counters; Dependencies row replaces "never a crash" with the actual halt behaviour (routed items 3b, 3c, 3d) |
| `docs/decisions.md` | UPDATE | One new dated entry `[2026-10-22]` registering the accumulated candidate decisions (routed item 3a) |
| `documentation/governance/decisions.html` | UPDATE | HTML mirror of the entry: one `<h3 id>` numbered 106 and one index `<li>` (`decisions-mirror` compares both counts) |
| `documentation/roadmap/status.html` | UPDATE | Decision count 105 to 106 and a feature row for `qa-runner-ai-executable-steps` |
| `README.md` | UPDATE | The live version prose |
| `documentation/changelog.html` | UPDATE | Cut `0.47.0`: dated release heading, intro, the 14 existing entries moved byte-identical, new `Changed` entries, the section 7.5 manifest-bump line, a fresh empty `Unreleased` |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | `version` `0.46.0` to `0.47.0` in the same change as the changelog heading |

## NOT Building (Scope Limits)

- **The install.** No task commits, stages, pushes, opens a PR or runs `claude plugin marketplace update`, `claude plugin update` or a restart. AC-25's last clause and the row 8 Success signal name the install; it is the operator's, in the order given in `## Notes`, because `/relay-execute` never commits (`docs/decisions.md` 2026-05-18) and the install needs the work committed and merged. No way to install from the worktree is invented.
- **Any edit to plugin-owned text or code.** `plugins/relay/` other than `.claude-plugin/plugin.json` stays as phase 7 left it, including `commands/relay-qa-run.md`, `relay-qa-seed.md`, `scripts/qa-run.mjs`, the kit templates and the frozen surfaces (`plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`).
- **Any anti-pattern entry.** The anti-pattern candidates of the phase 2 and phase 4 manifests (a viewport-only final capture, an undeclared `dedicated` flag) are open operator decisions; `docs/anti-patterns.md` and `documentation/governance/anti-patterns.html` are untouched.
- **A new page, a NAV entry, a CSS or JS change, or a search-index change.** No page is added, so the three-file rule is met by the changelog entry; the search-index excerpts of `commands.html`, `scripts.html` and `redaction-policy.html` are pinned by `qa-run-release-site.test.mjs` and stay as they are.
- **Any test file, any validation check, any change to the check count.** The Implementer authors zero test files (R-X strict); the count stays 28 and the test pair owns any assertion this release makes stale.
- **Other doc rewrites.** `commands.html`, `docs/api-reference.md`, `validation-checks.html` and the glossary already name the phase 1 to 7 codes and exports; the term sweep found no other sentence the release pins force a fix for. `docs/development.md` ("8 static consistency checks") and `concepts/prp-artifacts.html` are not this feature's.
- **The dogfood or any claim that the metrics hold.** Phase 9 measures AC-26; no page says it is met.

## Step-by-Step Tasks

Tasks run in order. Every edit uses the `Edit` tool with the anchors named below (never a `Write` of a whole page). Each anchor is quoted from the file as it is now; if an anchor is not unique, lengthen it with the neighbouring words, do not widen the edit. HTML entities follow each page's own usage (`&mdash;`, `&rsquo;`, `&rarr;`, `&ndash;`); no emoji, no inline `style`, no absolute path. Every command below runs from the worktree root with `export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false` (Windows Git Bash; node paths relative or `C:/...`).

### Task 1: UPDATE documentation/reference/scripts.html

- **ACTION**: Delivers AC-A4. First read `plugins/relay/scripts/qa-run.mjs` line 2488 (`RUNNER_OWNED_REASON_CODES`) and lines 5136-5138 and 2741-2743, and `plugins/relay/commands/relay-qa-run.md` lines 128-131, to confirm the three codes and the behaviour the new sentences state; if the code differs, state what the code does, not what this plan says. Then two `Edit`s inside the `qa-run.mjs` entry (between `<h2 id="qa-run">` and `<h2 id="qa-seed">`):
  1. In the Classification row (line 219) replace the anchor `<code>PARTIAL_REMAINDER</code> is runner-owned (<code>RUNNER_OWNED_REASON_CODES</code>) and a plan may not declare it. A code or class outside the closed sets makes the entry <code>PLAN_ENTRY_INVALID</code>.` with: `<code>PARTIAL_REMAINDER</code>, <code>JUDGEMENT_UNCERTAIN</code> and <code>ROLE_NOT_DEDICATED</code> are runner-owned (<code>RUNNER_OWNED_REASON_CODES</code>) and a plan may not declare them. A code or class outside the closed sets makes the entry <code>PLAN_ENTRY_INVALID</code>. Every reason code also carries a class: <code>impossible</code> for <code>EXTERNAL_CHANNEL</code>, <code>OUTSIDE_LOCAL_ENVIRONMENT</code> and <code>HUMAN_SIGNOFF</code>, <code>gap</code> for every other code, and <code>results.json</code> reports <code>needs_human_impossible</code> and <code>needs_human_gap</code> step counts beside the unchanged four-key <code>counts</code>.` The rest of the row (`results.json gains a <code>classification</code> block ... are unchanged.`) stays byte-identical.
  2. In the Dependencies row (line 229) replace the anchor `from <code>plugins/relay/scripts/visual/</code>; when it is absent the HTTP and browser cases are <code>blocked</code>, never a crash.</dd>` with: `from <code>plugins/relay/scripts/visual/</code> (the <code>scripts/visual/</code> directory of the plugin cache for an installed plugin). When it is absent, <code>run</code> blocks the HTTP and browser cases with the path-free reason <code>FAILED_PLAYWRIGHT_UNAVAILABLE</code>, prints the resolved plugin directory and the one command that provisions it on stderr, and exits 1; <code>ground</code> and <code>preflight</code> halt with the same code. The runner never installs anything itself.</dd>`
- **MIRROR**: `# SOURCE: documentation/reference/scripts.html:219`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const t = fs.readFileSync("documentation/reference/scripts.html", "utf8");
const run = t.slice(t.indexOf(`<h2 id="qa-run">`), t.indexOf(`<h2 id="qa-seed">`));
const row = (name) => { const i = run.indexOf(`<dt>${name}</dt><dd>`); const j = run.indexOf("</dd>", i); return i < 0 || j < 0 ? "" : run.slice(i, j); };
const cls = row("Classification"), dep = row("Dependencies");
const bad = [];
if (!run) bad.push("the qa-run entry was not found");
if (!cls) bad.push("the Classification row is missing");
if (!dep) bad.push("the Dependencies row is missing");
if (m.RUNNER_OWNED_REASON_CODES.length !== 3) bad.push("RUNNER_OWNED_REASON_CODES is no longer three codes: reword the sentence");
for (const c of m.RUNNER_OWNED_REASON_CODES) if (!cls.includes(`<code>${c}</code>`)) bad.push("runner-owned code not named: " + c);
for (const s of ["are runner-owned (<code>RUNNER_OWNED_REASON_CODES</code>)", "<code>impossible</code> for <code>EXTERNAL_CHANNEL</code>, <code>OUTSIDE_LOCAL_ENVIRONMENT</code> and <code>HUMAN_SIGNOFF</code>", "<code>needs_human_impossible</code> and <code>needs_human_gap</code>", "a <code>classification</code> block", "the four-key <code>counts</code> partition and the outcome vocabulary are unchanged"]) if (!cls.includes(s)) bad.push("Classification row lacks: " + s);
if (cls.includes("<code>PARTIAL_REMAINDER</code> is runner-owned")) bad.push("the stale one-code sentence is still present");
for (const s of ["path-free reason <code>FAILED_PLAYWRIGHT_UNAVAILABLE</code>", "prints the resolved plugin directory and the one command that provisions it on stderr, and exits 1", "The runner never installs anything itself."]) if (!dep.includes(s)) bad.push("Dependencies row lacks: " + s);
if (t.includes("never a crash")) bad.push("the stale never-a-crash sentence is still present");
for (const k of ["FAILED_MINT_UNCONFIRMED", "FAILED_MINT_COMMAND_MISSING", "FAILED_MINT_OUTPUT"]) if (!t.includes(k)) bad.push("pinned halt name removed: " + k);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: scripts.html names the three runner-owned codes, the classes and the real Playwright halt");
'
```

### Task 2: UPDATE docs/decisions.md

- **ACTION**: Delivers AC-A3. First read the cited candidate lines of `PRPs/reports/qa-runner-ai-executable-steps/phase-2/docs-update.md` (21-38) and the manifests of phases 3 to 7 (`phase-<N>/docs-update.md`, lines 14-23) and check every statement below against `plugins/relay/commands/relay-qa-run.md`; narrow any statement the command document does not support rather than asserting it. Then insert ONE entry after the 2026-10-09 entry and before the closing `---` that precedes the commented template: use `Edit` with `old_string` = `---\n\n<!-- Template for future entries:` (unique) and `new_string` = the entry below, then a blank line, then that same `---\n\n<!-- Template for future entries:`.

  Entry (exact heading form `## [2026-10-22] ...`, no number; field labels as the 2026-10-06 and 2026-10-09 entries):

  Heading: `## [2026-10-22] The QA runner's \`needs-human\` means only what no AI agent can execute alone: impossible and gap classes, executed product defects, judged steps, local channel sources and an actionable environment halt (vocabulary v3)`

  **Context:** The 0.46.0 dogfood of `/relay-qa-run` executed 27 of the 74 objective steps of the two reference reports (36.5%) and left 9 of 14 cases `needs-human`, although most of what it declined is not impossible for an AI agent. The operator's directive of 2026-10-20 is that `needs-human` must mean only what no AI agent can execute alone. Phases 1 to 7 of `PRPs/prds/qa-runner-ai-executable-steps.prd.md` are implemented in the 0.47.0 release; their docs-update manifests proposed separate candidate decisions and asked for them to be registered once at the release cut, the way the 2026-09-25 hybrid entry folded its candidates. This entry registers them together. Phase 9, the dogfood, measures them.

  **Decision:** (numbered list, one bold lead each)
  1. **`needs-human` is for impossible-class reasons only, and the count says so.** Every reason code carries a class: `impossible` for `EXTERNAL_CHANNEL` (a real external channel with no declared local source), `OUTSIDE_LOCAL_ENVIRONMENT` (production or a physical device) and `HUMAN_SIGNOFF` (a step the report reserves for a person), `gap` for every other code. `results.json` reports `needs_human_impossible` and `needs_human_gap` beside the unchanged four-key `counts`; the command document defines an objective step to include judgment and channel steps, the metric denominator as every objective step not of impossible class, and requires the pre-run table to be frozen under that convention before a counted run.
  2. **A known product defect is executed.** A case the product does not satisfy ends `fail` with evidence naming the failing step; `PRODUCT_DEFECT` is only for a case that cannot start, and it is class `gap`.
  3. **The class of a reason code is distinct from the class of a case.** The v2 case classes (`automatable`, `needs-a-new-driver`, `human-by-nature`, `blocked-by-product`) keep their meaning; the impossible/gap class belongs to the reason code. `PARTIAL_REMAINDER`, `JUDGEMENT_UNCERTAIN` and `ROLE_NOT_DEDICATED` are set by the runner and a plan cannot declare them.
  4. **Visibility means visible to a person.** A step passes on visibility only when Playwright's check and `Element.checkVisibility({ opacityProperty: true, visibilityProperty: true })` both hold (KD-9); a browser that cannot answer the question blocks the case and never passes it. `expect_text` still reads `textContent` and checks the located element's visibility only.
  5. **Evidence shows the whole page.** The final capture is full-page with the same masks, bounded by `CAPTURE_TIMEOUT_MS` (a chosen, not measured, 30 seconds) with one viewport-only retry. The AC-5 clause for an element capture of a scoped step was delivered with the `judge` step in phase 5, not in phase 2 (the split the phase 2 manifest asked the operator to confirm).
  6. **A locator may come from the report's own words and resolves at run time.** A locator whose words appear verbatim in the case's manual steps, or that a snapshot lists with `matches` 1, is valid; run-time resolution demands exactly one match, else `needs-human` `STEP_UNGROUNDED`. Scope is a chained locator (`within`, `name_prefix`, `label_text`, `index`), never `locator.within()` and never layout selectors or planner-written CSS.
  7. **The planner may choose open inputs, and writes need a dedicated role.** A `chosen_inputs` literal must be a declared capture or appear in a grounding snapshot of the run directory. Writes are declared by the planner with `effect: write` and run only for a role the operator marks `dedicated: true` in `PRPs/auth/login.config.json`; the flag is never generated and the runner does not detect writes after the fact. A write for another role is `blocked` `ROLE_NOT_DEDICATED` before any session, seed or request.
  8. **A judgment is pending, then judged by the command session.** A `judge` step captures evidence and leaves the case without an outcome; the command session records a verdict that cites what it saw through `qa-run.mjs judge`, and the case outcome is computed only when every verdict is in. The script never calls a model, `uncertain` ends the case `needs-human` `JUDGEMENT_UNCERTAIN` (class `gap`, never a pass), and a criterion must appear verbatim in the case's manual steps. The pending state is internal and is never written as a fifth outcome.
  9. **Message sources are local catchers the project declares.** `channel_sources` in `PRPs/auth/qa-seed.json` (a Mailpit origin, or a local file for SMS) is read through the local-only guard; a `read_message` step binds the extracted value to a variable registered for redaction before anything is written. A channel with no declared source stays `EXTERNAL_CHANNEL`, and a non-local source blocks the case `FAILED_NON_LOCAL_TARGET`.
  10. **F10 is answered by an actionable halt, not a lockfile.** This answers the three questions of the 2026-10-06 entry: the loop installs nothing; `FAILED_PLAYWRIGHT_UNAVAILABLE` names the resolved plugin directory and the one provisioning command in every mode (`run`, `ground`, `preflight`); `preflight` verifies it without network access. A stale kit script halts `FAILED_KIT_SCRIPT_STALE` by name before planning and in `ground`.
  11. **Environment and evidence-quality signals stay outside the reason-code catalogue.** `RECORD_STALE` (a warning on a record-resolved case whose cited tests import code changed after the record), `FAILED_KIT_SCRIPT_STALE`, `FAILED_IGNORE_UNPROVEN` and the Playwright and browser halts are not members of `REASON_CATALOGUE`, so they do not enter the impossible/gap counters.

  **Reason:** Each item removes a reason for a person to do what the runner can do, or makes the remainder measurable: the class split turns "human by nature" from a label into a count; executed defects and the visibility conjunction remove false passes and false declines; run-time grounding, chosen inputs and scoped locators recover the steps lost to unlabeled inputs, post-save states and live counts without product changes; a pending-then-judged model keeps judgment with the session that can see the capture and keeps the script deterministic, local and credential-free; declared local sources and dedicated roles keep every outward effect on a stand-in the operator controls. Registering them at the cut records the shape once, before the dogfood measures it.

  **Out of scope / not promoted:** the anti-pattern candidates of the phase 2 and phase 4 manifests (a viewport-only final capture; an operator-set flag treated as generated) and any change to the 2026-09-25 and 2026-10-06 entries, which stay as recorded.

  **Areas affected:** `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/commands/relay-qa-seed.md`; `plugins/relay/commands/relay-auth-scripts.md`; `scripts/validate/checks/qa-run-contract.mjs`; `documentation/` (governance/decisions, reference/scripts, roadmap/status, changelog).
- **MIRROR**: `# SOURCE: docs/decisions.md:2473-2488`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const BASE = "c8fdfd008509a2a72f5b2faa4260fcff21bc7ead";
const count = (s) => s.split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
const now = fs.readFileSync("docs/decisions.md", "utf8");
const was = execFileSync("git", ["show", `${BASE}:docs/decisions.md`], { encoding: "utf8", maxBuffer: 1 << 26 });
const bad = [];
if (count(now) !== count(was) + 1) bad.push(`expected exactly one new entry: ${count(was)} before, ${count(now)} now`);
const heads = now.split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l));
const last = heads[heads.length - 1] || "";
if (!last.startsWith("## [2026-10-22] ")) bad.push("the last entry is not the 2026-10-22 entry: " + last.slice(0, 60));
const i = now.indexOf(last);
const entry = i >= 0 ? now.slice(i, now.indexOf("<!-- Template for future entries:", i)) : "";
const flatEntry = entry.replace(/\s+/g, " ");
for (const s of ["**Context:**", "**Decision:**", "**Reason:**", "**Out of scope / not promoted:**", "**Areas affected:**"]) if (!flatEntry.includes(s)) bad.push("entry lacks " + s);
for (const s of ["needs_human_impossible", "needs_human_gap", "OUTSIDE_LOCAL_ENVIRONMENT", "HUMAN_SIGNOFF", "JUDGEMENT_UNCERTAIN", "ROLE_NOT_DEDICATED", "PRODUCT_DEFECT", "checkVisibility", "CAPTURE_TIMEOUT_MS", "STEP_UNGROUNDED", "chosen_inputs", "dedicated", "qa-run.mjs judge", "channel_sources", "FAILED_PLAYWRIGHT_UNAVAILABLE", "FAILED_KIT_SCRIPT_STALE", "RECORD_STALE", "REASON_CATALOGUE", "2026-10-06"]) if (!flatEntry.includes(s)) bad.push("entry does not state: " + s);
if (!/^1\. \*\*/m.test(entry) || !/^11\. \*\*/m.test(entry)) bad.push("the Decision list must hold items 1 to 11");
if (now.split("\n---\n").length < 2 || !now.includes("<!-- Template for future entries:")) bad.push("the closing rule or the template comment was lost");
if (/\.claude\/PRPs/.test(entry)) bad.push("a forbidden path reference in the entry");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: one new 2026-10-22 entry with the required fields and topics");
'
```

### Task 3: UPDATE documentation/governance/decisions.html

- **ACTION**: Delivers AC-A3. Two `Edit`s that keep `decisions-mirror` green (it compares the md entry count with the count of `<h3 id="` occurrences in the file AND with the `<li>` count of the first `<ol>`).
  1. In the index `<ol>` (lines 33 onward) add one `<li>` after the existing last row, which is the `<li><a href="#separate-from-upstream">...</a></li>` line (read it first and copy its exact form): `<li><a href="#qa-runner-impossible-only-needs-human">The QA runner&#39;s needs-human means only what no AI agent can execute alone (vocabulary v3)</a></li>`.
  2. After the closing `      </div>` of entry 105 (line 1022) and before `      <h2 id="how-to-add">Adding a new decision</h2>` insert, with a blank line before and after, the mirror (heading `<h3 id="qa-runner-impossible-only-needs-human">106. The QA runner&#39;s needs-human means only what no AI agent can execute alone: vocabulary v3</h3>`, then `<div class="kv">` with `<dt>Date</dt><dd>2026-10-22</dd>`, a `Context` row summarising the md Context (27 of 74 steps, the directive of 2026-10-20, the candidates folded from the phase manifests), a `Decision` row holding an `<ol>` of 11 `<li><strong>lead</strong> text</li>` items mirroring the md Decision list (the long forms above shortened the way entry 103 shortens its own), and a `Reason` row; no Areas row; close with `</div>`). Backticks become `<code>`, apostrophes `&#39;`, em dashes `&mdash;`, and the entry-104 cross-reference is `<a href="#...">` to the F10 entry's id (read the page for it) or plain text "the 2026-10-06 entry". Do NOT add any other `<h3 id=` to the page.
- **MIRROR**: `# SOURCE: documentation/governance/decisions.html:1016-1022`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
const md = fs.readFileSync("docs/decisions.md", "utf8");
const html = fs.readFileSync("documentation/governance/decisions.html", "utf8");
const n = md.split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
const h3 = (html.match(/<h3 id="/g) || []).length;
const a = html.indexOf("<ol>"), b = html.indexOf("</ol>", a);
const lis = (html.slice(a, b).match(/<li>/g) || []).length;
const bad = [];
if (h3 !== n) bad.push(`<h3 id> count ${h3} differs from the markdown entry count ${n}`);
if (lis !== n) bad.push(`index <li> count ${lis} differs from the markdown entry count ${n}`);
if (!html.includes(`<h3 id="qa-runner-impossible-only-needs-human">106. `)) bad.push("entry 106 heading is missing");
if (!html.includes(`<li><a href="#qa-runner-impossible-only-needs-human">`)) bad.push("the index row is missing");
const e = html.slice(html.indexOf(`<h3 id="qa-runner-impossible-only-needs-human">`), html.indexOf(`<h2 id="how-to-add">`));
for (const s of ["<dt>Date</dt><dd>2026-10-22</dd>", "<dt>Context</dt>", "<dt>Decision</dt>", "<dt>Reason</dt>", "needs_human_impossible", "JUDGEMENT_UNCERTAIN", "ROLE_NOT_DEDICATED", "FAILED_PLAYWRIGHT_UNAVAILABLE", "RECORD_STALE"]) if (!e.includes(s)) bad.push("entry 106 lacks: " + s);
if (((e.match(/<ol>[\s\S]*?<\/ol>/) || [""])[0].match(/<li>/g) || []).length !== 11) bad.push("the Decision list must hold 11 items");
if (/\sstyle="/.test(e) || /<script[\s>]/.test(e)) bad.push("an inline style or script in the entry");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: the mirror holds ${n} entries in the page and in the index`);
'
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: decisions-mirror and the other 27 checks pass"
```

### Task 4: UPDATE documentation/roadmap/status.html

- **ACTION**: Delivers AC-A4. Two `Edit`s. (1) Replace the anchor `<li><code>decisions.md</code> — 105 recorded decisions` with `<li><code>decisions.md</code> — 106 recorded decisions` (keep the rest of the line byte-identical, including the em dash character as it is in the file). (2) After the feature row of `qa-runner-grounding-vocabulary-v2` (anchor: the line `            <td>Stable grounding, text candidates, redaction floor, run-evidence ignore, reason-code classification and the session-less, input-value, absence, state, prefix and request-count steps</td>` followed by `          </tr>`), insert a new row after that `</tr>`:

```html
          <tr>
            <td><code>qa-runner-ai-executable-steps</code></td>
            <td>9</td>
            <td><span class="badge badge--partial">phases 1&ndash;8 shipped, dogfood pending</span></td>
            <td>0.47.0</td>
            <td>Impossible-only needs-human, run-time and scoped locators, chosen inputs, dedicated-role writes, model judgment, local channel sources and a self-checking environment</td>
          </tr>
```
  Do not touch the manual-QA runner section or any other row; the anti-pattern count (17) is unchanged because no anti-pattern is registered.
- **MIRROR**: `# SOURCE: documentation/roadmap/status.html:242-248`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
const st = fs.readFileSync("documentation/roadmap/status.html", "utf8");
const dec = fs.readFileSync("docs/decisions.md", "utf8").split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
const anti = fs.readFileSync("docs/anti-patterns.md", "utf8").replace(/<!--[\s\S]*?-->/g, "").split("\n").filter((l) => /^## \S/.test(l)).length;
const dm = /<code>decisions\.md<\/code> [^0-9]*(\d+) recorded decisions/.exec(st), am = /<code>anti-patterns\.md<\/code> [^0-9]*(\d+) forbidden patterns/.exec(st);
const bad = [];
if (!dm || Number(dm[1]) !== dec) bad.push(`status.html decision count ${dm && dm[1]} differs from docs/decisions.md (${dec})`);
if (!am || Number(am[1]) !== anti) bad.push(`status.html anti-pattern count ${am && am[1]} differs from docs/anti-patterns.md (${anti})`);
if (st.split("<code>qa-runner-ai-executable-steps</code></td>").length - 1 !== 1) bad.push("the feature row must occur exactly once");
if (st.split("<code>qa-runner-grounding-vocabulary-v2</code></td>").length - 1 !== 1) bad.push("the v2 feature row must stay exactly once");
for (const s of ["<td>9</td>", "phases 1&ndash;8 shipped, dogfood pending", "<td>0.47.0</td>"]) if (!st.includes(s)) bad.push("the new row lacks: " + s);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: status.html counts ${dec} decisions and ${anti} anti-patterns and carries the feature row`);
'
```

### Task 5: UPDATE README.md

- **ACTION**: Delivers AC-A1. Replace the anchor `` `plugins/relay` (version 0.46.0, per its `plugin.json`) `` with `` `plugins/relay` (version 0.47.0, per its `plugin.json`) `` (line 16). Nothing else in the README changes.
- **MIRROR**: `# SOURCE: README.md:16`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node -e '
const fs = require("node:fs");
const t = fs.readFileSync("README.md", "utf8");
const hits = [...t.matchAll(/`plugins\/relay`\s+\(version\s+(\d+\.\d+\.\d+),\s+per\s+its\s+`plugin\.json`\)/g)].map((m) => m[1]);
if (hits.length !== 1 || hits[0] !== "0.47.0") { console.error("FAIL: README.md must state version 0.47.0 exactly once, found: " + JSON.stringify(hits)); process.exit(1); }
console.log("PASS: README.md names 0.47.0 once");
'
```

### Task 6: UPDATE documentation/changelog.html

- **ACTION**: Delivers AC-A2. Use the current UTC date (the plan was written on 2026-10-22) as `<date>`; it must be on or before today's UTC date and on or after 2026-10-13. Three `Edit`s:
  1. Replace the two lines `      <h2 id="unreleased">Unreleased</h2>` + blank + `      <h3 id="unreleased-added">Added</h3>` (line 31 to 33) with:

```html
      <h2 id="unreleased">Unreleased</h2>

      <p>Nothing yet.</p>

      <h2 id="v0-47-0">0.47.0 &#8212; <date></h2>

      <p>Vocabulary v3: the runner executes what an AI agent can. The 0.46.0 dogfood executed 27 of the 74 objective
        steps of the two reference reports and left 9 of 14 cases <code>needs-human</code>, although most of what it
        declined is not impossible for an AI agent. This release ships phases 1&ndash;7 of
        <code>PRPs/prds/qa-runner-ai-executable-steps.prd.md</code> and its release cut. Phase 9, the dogfood on the
        same two byte-identical reports, follows on this release. The four-outcome vocabulary, the local-only guard,
        the review loop, <code>/relay-qa-report</code> and <code>capture.mjs</code> are unchanged, and
        <code>npm run validate</code> still runs 28 checks.</p>

      <h3 id="v0-47-0-added">Added</h3>
```
     The intro must not contain the word `within` (`qa-run-scoped-locators.test.mjs:598-605` takes the first `within` on the whole page and expects the scoped-locator entry around it) and must not claim an installation.
  2. Replace `      <h3 id="unreleased-changed">Changed</h3>` with `      <h3 id="v0-47-0-changed">Changed</h3>`.
  3. Append these entries as the last items of that `Changed` list: replace the anchor `          <code>STEP_UNGROUNDED</code>, when the scope is missing or hidden.</li>\n      </ul>\n\n      <h2 id="v0-46-0">` with itself plus, before `</ul>`:

```html
        <li><strong><code>governance/decisions.html</code></strong> &mdash; entry 106 registers the decisions of the
          vocabulary-v3 runner as one dated entry (impossible-only <code>needs-human</code>, executed product defects,
          the visibility conjunction, run-time grounding, dedicated-role writes, pending-then-judged steps, local channel
          sources, the actionable environment halt and the codes kept outside the catalogue). It builds on the
          2026-10-06 entry and does not re-register it.</li>
        <li><strong><code>reference/scripts.html</code></strong> &mdash; the <code>qa-run.mjs</code> entry names all
          three runner-owned reason codes and the impossible and gap classes with their step counters, and its
          Dependencies row states the real halt for an unresolvable Playwright in place of &ldquo;never a
          crash&rdquo;.</li>
        <li><strong><code>roadmap/status.html</code></strong> &mdash; a row for
          <code>qa-runner-ai-executable-steps</code> in the feature PRD table (9 phases, 0.47.0, dogfood pending); the
          decision count is re-derived from <code>docs/decisions.md</code>.</li>
        <li><strong><code>README.md</code></strong> &mdash; names the released version.</li>
        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
          &mdash; version bumped <code>0.46.0</code> &rarr; <code>0.47.0</code> to
          match this release; users running <code>/plugin</code> after pulling
          this version will get a fresh <code>relay/0.47.0/</code> cache directory
          with the vocabulary-v3 changes of <code>/relay-qa-run</code> registered.</li>
```
  Keep the 14 existing `<li>` entries byte-identical and in order (moved, never copied). Do not repeat the opening text of the three 0.46.0 carried-over entries (`qa-run-release-cut.test.mjs:151-155`), and put no manifest-path `<li>` anywhere else.
- **MIRROR**: `# SOURCE: documentation/changelog.html:31-36`; `# SOURCE: documentation/changelog.html:113-126`; `# SOURCE: documentation/changelog.html:207-212`; `# SOURCE: scripts/validate/checks/version-parity.mjs:46-56`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const BASE = "c8fdfd008509a2a72f5b2faa4260fcff21bc7ead";
const flat = (s) => s.replace(/\s+/g, " ");
const log = fs.readFileSync("documentation/changelog.html", "utf8");
const heads = [...log.matchAll(/<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g)];
const first = heads.find((h) => h[1] !== "unreleased" && /^\d+\.\d+\.\d+/.test(h[2].trim()));
const bad = [];
if (!first || first[1] !== "v0-47-0" || !first[2].trim().startsWith("0.47.0 ")) bad.push("the first released heading is not v0-47-0 / 0.47.0");
const date = first ? (/(\d{4}-\d{2}-\d{2})$/.exec(first[2].trim()) || [])[1] : undefined;
const today = new Date().toISOString().slice(0, 10);
if (!date || date < "2026-10-13" || date > today) bad.push(`the release date ${date} is not between 2026-10-13 and ${today}`);
const un = log.indexOf(`<h2 id="unreleased">Unreleased</h2>`), rs = log.indexOf(`<h2 id="v0-47-0">`), ps = log.indexOf(`<h2 id="v0-46-0">`);
if (log.split(`<h2 id="unreleased">`).length !== 2 || !(un >= 0 && un < rs && rs < ps)) bad.push("the order must be one Unreleased, v0-47-0, v0-46-0");
const unBody = log.slice(un, rs);
if (!unBody.includes("<p>Nothing yet.</p>") || unBody.includes("<li>")) bad.push("the Unreleased block must hold only a Nothing yet paragraph");
const block = flat(log.slice(rs, ps));
for (const s of [`<h3 id="v0-47-0-added">Added</h3>`, `<h3 id="v0-47-0-changed">Changed</h3>`, "<code>0.46.0</code> &rarr; <code>0.47.0</code>", "relay/0.47.0/"]) if (!block.includes(s)) bad.push("the release block lacks: " + s);
if (log.includes('id="unreleased-added"') || log.includes('id="unreleased-changed"')) bad.push("an unreleased-* subsection id survived the cut");
const baseLog = execFileSync("git", ["show", `${BASE}:documentation/changelog.html`], { encoding: "utf8", maxBuffer: 1 << 26 });
const baseUn = baseLog.slice(baseLog.indexOf(`<h2 id="unreleased">`), baseLog.indexOf(`<h2 id="v0-46-0">`));
const items = [...baseUn.matchAll(/<li>[\s\S]*?<\/li>/g)].map((x) => flat(x[0]));
if (items.length < 14) bad.push(`expected at least the 14 phase 1-7 entries at the base, found ${items.length}`);
const flatLog = flat(log);
for (const it of items) { if (!block.includes(it)) bad.push("a moved entry changed or is missing: " + it.slice(0, 70)); if (flatLog.split(it).length !== 2) bad.push("a moved entry occurs more than once: " + it.slice(0, 70)); }
const intro = flat(log.slice(rs, log.indexOf(`<h3 id="v0-47-0-added">`)));
if (/\bwithin\b/i.test(intro)) bad.push("the intro contains the word within (qa-run-scoped-locators pins the first occurrence on the page)");
if (/\binstalled\b/i.test(intro)) bad.push("the 0.47.0 intro claims an installation");
if ((block.match(/<li><strong><code>plugins\/relay\/\.claude-plugin\/plugin\.json<\/code><\/strong>/g) || []).length !== 1) bad.push("exactly one manifest-bump entry is required in the 0.47.0 section");
if (log.split("Kit authoring for the <code>minted</code> mechanism").length !== 2) bad.push("the 0.45.0 marker entry must stay exactly once");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: the 0.47.0 section moved ${items.length} entries and keeps one fresh Unreleased`);
'
```

### Task 7: UPDATE plugins/relay/.claude-plugin/plugin.json

- **ACTION**: Delivers AC-A1. Replace `"version": "0.46.0",` with `"version": "0.47.0",` (line 3). Nothing else in the manifest changes. This is the last edit so `version-parity` is red only between Task 6 and this task.
- **MIRROR**: `# SOURCE: scripts/validate/checks/version-parity.mjs:46-56`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node -e '
const fs = require("node:fs");
const pj = JSON.parse(fs.readFileSync("plugins/relay/.claude-plugin/plugin.json", "utf8"));
if (pj.version !== "0.47.0") { console.error("FAIL: plugin.json version is " + pj.version); process.exit(1); }
console.log("PASS: plugin.json is 0.47.0");
'
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: version-parity and the other checks pass on the cut"
```

### Task 8: VERIFY the release-ready tree (no edit)

- **ACTION**: Delivers AC-A5, AC-A6, AC-A7. Edit nothing. Run `## Validation Commands` Levels 1, 2 and 3 in full on the finished tree. If a level is red, fix the documentation edit that caused it (never a test, never a check, never a plugin file other than the manifest). If a corpus test fails on an assertion about a page, the changelog, the decisions or the manifest, do not edit it: write down the test file, the test name and the line, and stop; the test pair updates it as `EXISTING_TEST_UPDATED` and Level 3 is then re-run with exactly those files named in `ALLOW`.
- **MIRROR**: `# SOURCE: scripts/validate/checks/version-parity.mjs:46-56` (the one check the cut can turn red) and the Level 1 to 3 commands below.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: 28 of 28 checks"
```

## Validation Commands

Every command exits non-zero when its invariant fails (`set -euo pipefail`, an explicit `process.exit(1)`, or the tool's own status). Run them from the worktree root. `BASE` is the phase-7 tree object `c8fdfd008509a2a72f5b2faa4260fcff21bc7ead`; every changed-file derivation is the single-argument `git diff <base>` form plus `git ls-files --others --exclude-standard`, ignoring `PRPs/`.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
BASE=c8fdfd008509a2a72f5b2faa4260fcff21bc7ead
node -e '
const fs = require("node:fs");
for (const f of ["plugins/relay/.claude-plugin/plugin.json", "documentation/assets/data/search-index.json"]) {
  try { JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("FAIL: " + f + " is not valid JSON: " + e.message); process.exit(1); }
}
console.log("PASS: both JSON files parse");
'
git diff --check "$BASE" -- documentation README.md docs/decisions.md plugins/relay/.claude-plugin/plugin.json
echo "PASS: no whitespace error in the changed lines"
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: npm run validate passes all 28 checks"
```

### Level 2 CONTENT_INVARIANTS

Level 2a: the release cut, the frozen surfaces and the scope fence.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const BASE = "c8fdfd008509a2a72f5b2faa4260fcff21bc7ead";
const bad = [];
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const same = (...files) => { try { execFileSync("git", ["diff", "--quiet", BASE, "--", ...files]); return true; } catch { return false; } };
const pj = JSON.parse(fs.readFileSync("plugins/relay/.claude-plugin/plugin.json", "utf8"));
const bj = JSON.parse(git("show", `${BASE}:plugins/relay/.claude-plugin/plugin.json`));
const [bMaj, bMin] = bj.version.split(".").map(Number);
const [nMaj, nMin, nPat] = String(pj.version).split(".").map(Number);
if (!(nMaj === bMaj && nMin === bMin + 1 && nPat === 0)) bad.push(`plugin.json ${pj.version} is not the minor bump of ${bj.version}`);
if (pj.version !== "0.47.0") bad.push(`plugin.json is ${pj.version}, expected 0.47.0`);
const log = fs.readFileSync("documentation/changelog.html", "utf8");
const heads = [...log.matchAll(/<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g)];
const first = heads.find((h) => h[1] !== "unreleased" && /^\d+\.\d+\.\d+/.test(h[2].trim()));
if (!first || first[1] !== "v0-47-0" || !first[2].trim().startsWith(pj.version + " ")) bad.push("the first released changelog heading does not match the manifest");
if (!fs.readFileSync("README.md", "utf8").includes(`(version ${pj.version}, per its \`plugin.json\`)`)) bad.push("README.md does not state the manifest version");
const FROZEN = ["plugins/relay/agents/code-reviewer.md", "plugins/relay/agents/code-reviewer-semantic.md", "plugins/relay/commands/relay-implement.md", "plugins/relay/commands/relay-qa-report.md", "plugins/relay/scripts/visual/capture.mjs"];
if (!same(...FROZEN)) bad.push("a frozen surface differs from the phase-7 tree");
if (!same(".claude-plugin/marketplace.json", "plugins/relay/resources/auth-login.template.mjs", "docs/anti-patterns.md", "documentation/governance/anti-patterns.html", "documentation/assets/js", "documentation/assets/css", "documentation/assets/data/search-index.json", "scripts")) bad.push("the marketplace, the kit template, the anti-pattern mirror, the NAV script, the stylesheet, the search index or scripts/ changed");
const names = new Set([...git("diff", "--name-only", BASE).split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter((n) => n && !n.startsWith("PRPs/")));
const PLANNED = ["README.md", "plugins/relay/.claude-plugin/plugin.json", "docs/decisions.md", "documentation/changelog.html", "documentation/reference/scripts.html", "documentation/roadmap/status.html", "documentation/governance/decisions.html"];
for (const n of names) if (!PLANNED.includes(n) && !n.startsWith("docs/domain/") && !n.startsWith("docs/context/")) bad.push("changed outside the plan scope: " + n);
for (const n of PLANNED) if (!names.has(n)) bad.push("a planned file was not changed: " + n);
for (const n of names) if (/\.test\.mjs$/.test(n)) bad.push("a test file changed (R-X): " + n);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the 0.47.0 cut, the frozen surfaces and the scope fence hold");
'
```

Level 2b: the install clause is not claimed, and the routed items are in.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
const read = (f) => fs.readFileSync(f, "utf8");
const bad = [];
const scr = read("documentation/reference/scripts.html");
const dec = read("docs/decisions.md");
for (const s of ["<code>JUDGEMENT_UNCERTAIN</code> and <code>ROLE_NOT_DEDICATED</code> are runner-owned"]) if (!scr.includes(s)) bad.push("scripts.html lacks: " + s);
if (scr.includes("never a crash")) bad.push("scripts.html still says never a crash");
const i = dec.lastIndexOf("## [2026-10-22]");
if (i < 0) bad.push("the 2026-10-22 decision entry is missing");
const entry = i >= 0 ? dec.slice(i, dec.indexOf("<!-- Template for future entries:", i)) : "";
if (/\bis installed\b|\bwas installed\b|\bhas been installed\b/i.test(entry)) bad.push("the decision entry claims an installation");
const log = read("documentation/changelog.html");
const intro = log.slice(log.indexOf(`<h2 id="v0-47-0">`), log.indexOf(`<h3 id="v0-47-0-added">`));
if (/\binstalled\b/i.test(intro.replace(/<[^>]+>/g, " "))) bad.push("the 0.47.0 intro claims an installation");
for (const f of ["documentation/changelog.html", "documentation/reference/scripts.html", "documentation/roadmap/status.html", "documentation/governance/decisions.html"]) {
  if ((read(f).match(/<h1[\s>]/g) || []).length !== 1) bad.push(f + " must carry exactly one h1");
}
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the routed doc items are in and no page claims the install");
'
```

Level 2c: diff hygiene on the added lines.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const BASE = "c8fdfd008509a2a72f5b2faa4260fcff21bc7ead";
const bad = [];
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const FILES = ["documentation/changelog.html", "documentation/reference/scripts.html", "documentation/roadmap/status.html", "documentation/governance/decisions.html"];
const added = FILES.flatMap((f) => git("diff", "--unified=0", BASE, "--", f).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1)));
const PICT = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2300}-\u{23FF}]/u;
for (const re of [/\sstyle="/, /<style[\s>]/, /<link[\s>]/, /<img[\s>]/, /<script[\s>]/, /(?:href|src)="\/(?!\/)/, PICT]) if (added.some((l) => re.test(l))) bad.push("an added line violates the site invariants: " + re);
if (added.some((l) => l.includes("\r"))) bad.push("a CR was added");
const css = fs.readFileSync("documentation/assets/css/app.css", "utf8");
const known = new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((x) => x[1]));
for (const l of added) for (const cm of l.matchAll(/class="([^"]+)"/g)) for (const c of cm[1].split(/\s+/)) if (c && !known.has(c)) bad.push("a CSS class the stylesheet does not define: " + c);
const FORBIDDEN = ".claude" + "/PRPs";
if (added.filter((l) => l.includes(FORBIDDEN)).some((l) => !l.includes("MUST NOT appear"))) bad.push("a forbidden path reference was introduced outside a quoted prohibition");
for (const f of FILES) {
  const body = fs.readFileSync(f, "utf8");
  for (const l of git("diff", "--unified=0", BASE, "--", f).split("\n").filter((x) => x.startsWith("+") && !x.startsWith("+++"))) {
    for (const im of l.matchAll(/\bid="([^"]+)"/g)) if (body.split(`id="${im[1]}"`).length - 1 !== 1) bad.push(`${f}: id is not unique: ${im[1]}`);
  }
}
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: ${added.length} added documentation lines, no site invariant broken`);
'
```

### Level 3 INTEGRATION

The corpus gate. `ALLOW` names the test files the test pair has declared `EXISTING_TEST_UPDATED` for this phase (none are predicted; see `## Notes`); a file in `ALLOW` is still run and may fail. `FLAKE_BUDGET` is 2: a first corpus failure is followed by one re-run of the corpus, and then each failing file is run alone; only a file that fails alone and is not in `ALLOW` fails the gate. No reporter output is parsed; every decision is an exit code.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
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
  if (!ok) console.error(`corpus attempt ${attempt} failed`);
}
if (ok) { console.log(`PASS: the corpus is green (${files.length} test files)`); process.exit(0); }
const failing = files.filter((f) => !run([f]));
const unexpected = failing.filter((f) => !ALLOW.some((a) => f.endsWith(a)));
if (unexpected.length) { console.error("FAIL: these files fail alone and are not allow-listed:\n" + unexpected.join("\n")); process.exit(1); }
if (failing.length === 0) { console.error("FAIL: the corpus failed in every attempt but every file passes alone: a cross-file defect, report it"); process.exit(1); }
console.log("PASS: only allow-listed files fail: " + failing.join(", "));
'
```

The glob is quoted so Node expands it itself (never `node --test <dir>`, which fails with MODULE_NOT_FOUND). The command exits non-zero when the gate fails.

## Acceptance Criteria

- **AC-A1 (PRD AC-25):** `plugins/relay/.claude-plugin/plugin.json` carries the minor bump of its phase-7 value (`0.46.0` to `0.47.0`, patch 0), `documentation/changelog.html`'s first released heading is the same version with the id `v0-47-0` and a valid ISO date, and `README.md` names it exactly once, so `version-parity` passes. Delivered by Tasks 5, 6 and 7; observed by Level 2a and Level 1.
- **AC-A2 (PRD AC-25):** The changelog keeps exactly one `<h2 id="unreleased">Unreleased</h2>` holding only a "Nothing yet" paragraph above the new release; the release carries an intro, `Added` and `Changed` subsections with the release id, the 14 previously unreleased entries byte-identical and not copied, and the section 7.5 manifest-bump line naming `0.46.0` and `0.47.0`. Delivered by Task 6; observed by Task 6's check and Level 2a.
- **AC-A3 (PRD AC-25):** `docs/decisions.md` carries exactly one new `[2026-10-22]` entry (Context, an 11-item Decision list, Reason, not-promoted paragraph, Areas affected) registering the candidate decisions of the phase 1 to 7 manifests, and `documentation/governance/decisions.html` mirrors it with one `<h3 id>` numbered 106 and one index row so `decisions-mirror` passes. Delivered by Tasks 2 and 3; observed by Task 3's check and Level 1.
- **AC-A4 (PRD AC-25):** `documentation/reference/scripts.html` names all three runner-owned reason codes, the impossible and gap classes with their step counters, and the real Playwright halt in place of "never a crash"; `documentation/roadmap/status.html` states 106 decisions and carries the feature row. The pages follow `documentation/AGENTS.md` (no new page, no inline style, every added link and id resolving, a changelog entry). Delivered by Tasks 1 and 4; observed by Task 1's and Task 4's checks, Level 2b and Level 2c.
- **AC-A5 (PRD AC-24):** `npm run validate` passes all 28 checks and the corpus `node --test "scripts/validate/**/*.test.mjs"` exits 0 on the finished tree (or fails only in allow-listed test files declared by the test pair). Delivered by Task 8; observed by Level 1 and Level 3.
- **AC-A6 (PRD AC-25):** No page, entry or changelog section written by this phase claims that the new version is installed; the install and its verification are stated as ordered operator steps in `## Notes`. Delivered by Tasks 2, 6 and 8; observed by Level 2b.
- **AC-A7 (PRD AC-25):** The cut is limited to the bump, the changelog and the documentation (a constraint from the PRD's "What We're NOT Building", not a separate acceptance criterion): the five frozen surfaces, the kit login template, the marketplace manifest, the anti-pattern mirror, the NAV script, the stylesheet, the search index and `scripts/` are byte-identical to the phase-7 tree, no file outside the seven planned files (and `docs/domain/` and `docs/context/`, which the docs-sync pass owns) changed since phase 7, and no test file changed. Delivered by Task 8; observed by Level 2a.

R8b note: every bullet above names the PRD acceptance criterion it derives from.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The cut turns a corpus test red (position pins on the `Unreleased` block, a marker entry that must occur once, the first `within` on the changelog page) | M | M | The cut follows the 0.46.0 shape; entries are moved byte-identical; the intro avoids the word `within`; the new `Changed` entries avoid the opening text of the carried-over 0.46.0 entries; Level 3 runs the whole corpus and Task 6's check asserts each of these |
| The decision entry states something the command document does not support (the entry summarises 11 candidates from seven manifests) | M | M | Task 2 requires reading the cited manifest lines and `relay-qa-run.md` first and narrowing any unsupported statement; Task 2's check pins the topic tokens, not wording the plugin text may contradict |
| `decisions-mirror` goes red between Task 2 and Task 3 | H | L | Expected and intentional: only Task 3's VALIDATE runs `npm run validate`; Task 2's does not |
| An edit on a very long single-line `<dd>` row (`scripts.html` 219 and 229) moves a sentence a test pins | M | M | Both edits are anchored `Edit`s of one sentence; the retained phrases `a classification block` and `the four-key counts partition and the outcome vocabulary are unchanged` (`qa-run-release-pages.test.mjs:374-375`) are asserted present |
| The decision count in `status.html` or another page is read by a test not found by the inventory | L | M | Task 4's check derives the count from `docs/decisions.md`; Level 3 runs the corpus; a found test is `EXISTING_TEST_UPDATED` via the test pair |
| The install is not performed by this phase and row 8 may read `complete` before it happens | H | L | The install clause is cited, put in `## NOT Building` and given as ordered operator steps in `## Notes`; AC-A6 checks that no page claims it |
| research-web was not dispatched (internal-only release mechanics) | L | L | `research-codebase` ran four times over the changelog shape, version strings, the decision registry, the stale sentences and the readers of all of them; nothing external bears on a repository-local cut |
| The phase-7 tree object is garbage collected after the work is committed | M | L | Level 2a and Level 2c depend on it only while the tree exists; if `git cat-file -e c8fdfd008509a2a72f5b2faa4260fcff21bc7ead` fails, use the last commit that contains phase 7 as the base and say so |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` then `/relay-test-write-review`), not authored by the Implementer; R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task and no `## Files to Change` row targets a test file, so the per-task `**VALIDATE**` commands exercise the change directly and Level 3 runs the existing corpus as a regression gate.
- **Predicted stale tests (`EXISTING_TEST_UPDATED`): none.** Four `research-codebase` passes read the readers of the changelog, the manifest, the README, the decisions registry, `scripts.html` and `status.html`. Findings: `qa-run-release-cut.test.mjs` derives everything from the live manifest and passes once the README, the manifest and the first release heading agree; `qa-run-self-checking-environment.test.mjs:640-644` and `qa-run-local-channel-sources.test.mjs:721` order entries relative to `id="v0-46-0"` and stay true because the 0.47.0 section sits above it; `qa-run-release-site.test.mjs:233-236` checks only the `unreleased` and `v0-46-0*` ids; `qa-run-release-pages.test.mjs:348-375` pins the `commands.html` "derived by the runner" sentence and phrases of the `scripts.html` Classification row that Task 1 keeps; the `figma-*` and plan-review tests accept either `unreleased` or a `v…` section; `decisions-mirror.test.mjs:111-118` needs the md and html in step (Tasks 2 and 3); no test pins `105 recorded decisions`, `never a crash`, or the last decision number. One assertion could be fragile and is guarded, not stale: `qa-run-scoped-locators.test.mjs:598-605` takes the first `within` on the whole changelog page (Task 6 keeps the new intro free of it). Residual uncertainty: a test that reads `scripts.html` or the changelog through a helper without the searched terms may exist; if Level 3 finds one, the Implementer does not edit it. The test pair records `EXISTING_TEST_UPDATED` and `ALLOW` in Level 3 then names exactly those files.
- **How the install clause is handled.** The in-tree part of AC-25 (bump, changelog, `documentation/` per `documentation/AGENTS.md`) is delivered; the install is recorded as an operator step after merge and no way to install from the worktree is invented. Operator steps, in order: (1) `/relay:relay-commit qa-runner-ai-executable-steps` commits the worktree locally. (2) `/relay:relay-pr qa-runner-ai-executable-steps` pushes and opens the pull request (`--repo fabiombarreto/PRPs-agentic-eng`, base `development`). (3) Merge with a merge commit, never a rebase or a force-push (`/relay:relay-approve <pr>`). (4) In the main checkout `C:\repos\PRPs-agentic-eng`, have `development` checked out and up to date (the directory marketplace `relay-marketplace` points there). (5) `claude plugin marketplace update relay-marketplace`. (6) `claude plugin update relay@relay-marketplace`, which creates the fresh `relay/0.47.0/` cache directory. (7) Restart Claude Code. (8) Confirm `0.47.0` in the `/plugin` panel or `installed_plugins.json`. (9) Verification, the F10 follow-up from phase 7: run `node "<cache>/relay/0.47.0/scripts/qa-run.mjs" preflight --root <target>` against the installed cache for each target project (`super-ensino`, `praesto-sum`). A fresh cache has no Playwright `node_modules`, so the first `preflight` is expected to halt `FAILED_PLAYWRIGHT_UNAVAILABLE` naming the cache directory and the one provisioning command; the operator runs that command once (it downloads packages, so it is never run by the loop) and re-runs `preflight`, which must then report Playwright, the Chromium build, every kit script and the session directory ignore as passing and exit 0. That is the row 8 Success signal ("the installed version runs `preflight` clean on both target projects") and it is the operator's to record; Phase 9 starts only after it.
- **Decision entry provenance.** Registering the entry follows the orchestrator's instruction and the phase 2 manifest's deferred question ("register them at the release cut ... as a single dated entry"); phases 8 and 9 add no candidates. The 11 items are the consolidation of: impossible-only `needs-human` and the counting convention; product defects executed; reason class versus case class; the visibility conjunction; full-page capture; the AC-5 split; run-time grounding; `chosen_inputs` and dedicated writes; the pending-then-judged model; local channel sources; the actionable F10 halt; and the codes outside `REASON_CATALOGUE`. The AC-5 split (full page in phase 2, element capture with `judge` in phase 5) is stated so the operator can confirm it at the phase 8 close, as the phase 2 manifest asked.
- **Diff base for review.** This phase's full diff is `git diff c8fdfd008509a2a72f5b2faa4260fcff21bc7ead` filtered to exclude `PRPs/`, plus `git ls-files --others --exclude-standard`; the single-argument form only (never `<tree>..HEAD`, never HEAD-relative, `HEAD` is still `c658a0c`). Phases 1 to 7 are uncommitted in the worktree.
- **What no command here can do.** `documentation/AGENTS.md` section 8 step 8 (open the pages in a browser, check the sidebar highlight, the table of contents, the theme toggle and the search) is a human step; the structural gates above stand in for it and do not replace it.
- **Docs-sync division.** The implement-time docs-sync pass is scoped to `docs/context/` and `docs/domain/` and never touches `documentation/`; this plan therefore edits the documentation files explicitly, and the pass is expected to add nothing to the files this plan touches.
- **Host.** Windows with Git Bash: every git and node command carries the `core.fsmonitor` environment prefix shown in each block, node paths are relative or `C:/...`, all files are LF, `node_modules` is a junction (never modified, never `npm install`), and `npm run validate` stays at exactly 28 checks.
- **Research.** `research-codebase` ran four times (changelog shape, version strings and `version-parity`; the decisions registry and the phase manifests; the stale sentences and the term-coverage sweep; the predicted-stale-test inventory). `research-web` was not dispatched: a repository-local release cut has no external research value (recorded as a degradation in `## Risks and Mitigations`). Two facts were not verified by the researchers and are delegated to the Implementer's reading steps: the exact shape of the last `<li>` of the decisions index (Task 3 copies it) and the exact statements of the phase 3 to 7 manifests (Task 2 reads them first).

*Generated: 2026-10-22*
*Approved: 2026-10-22*
*Implemented: 2026-10-22*
*Status: IMPLEMENTED*
